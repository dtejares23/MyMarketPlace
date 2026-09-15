import os
import redis
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import auth

# Initialize DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "="*55)
    print("🚀 MARKETPLACE API BACKEND IS RUNNING ON PORT 8000")
    print("📖 API Docs (Swagger UI): http://localhost:8000/docs")
    print("="*55 + "\n")
    yield

app = FastAPI(title="Marketplace API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis Connection with Fallback
REDIS_HOST = os.getenv("REDIS_HOST", "cache")
try:
    r = redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True, socket_timeout=2)
    r.ping()
except Exception:
    r = None


# --- PYDANTIC SCHEMAS ---

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class ProductSchema(BaseModel):
    title: str
    description: str
    price: float
    stock: int
    category_id: int

class CategorySchema(BaseModel):
    name: str

class OrderStatusSchema(BaseModel):
    status: str


# --- AUTHENTICATION ENDPOINTS ---

# --- AUTHENTICATION ENDPOINTS ---

@app.post("/auth/register", status_code=201)
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    # Normalize email (lowercase + trim whitespace)
    clean_email = data.email.lower().strip()
    
    if db.query(models.User).filter(models.User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = models.User(
        email=clean_email,
        hashed_password=auth.hash_password(data.password.strip()),
        role=data.role
    )
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/auth/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    # Normalize email & password strings
    clean_email = data.email.lower().strip()
    clean_password = data.password.strip()

    user = db.query(models.User).filter(models.User.email == clean_email).first()
    
    # 401 if user doesn't exist OR password verification fails
    if not user or not auth.verify_password(clean_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = auth.create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": token, "token_type": "bearer", "role": user.role}


# --- CATEGORY ENDPOINTS ---

@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.post("/categories", dependencies=[Depends(auth.require_admin)])
def create_category(data: CategorySchema, db: Session = Depends(get_db)):
    cat = models.Category(name=data.name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# --- PRODUCT CRUD (WITH REDIS CACHING) ---

@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    try:
        if r:
            cached = r.get("catalog")
            if cached:
                return {"source": "cache", "data": json.loads(cached)}
    except Exception:
        pass  # Graceful fallback if Redis service is unreachable
    
    products = db.query(models.Product).all()
    data = [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "price": p.price,
            "stock": p.stock,
            "category_id": p.category_id,
        }
        for p in products
    ]
    
    try:
        if r:
            r.set("catalog", json.dumps(data), ex=60)
    except Exception:
        pass

    return {"source": "db", "data": data}

@app.post("/products", dependencies=[Depends(auth.require_admin)])
def create_product(data: ProductSchema, db: Session = Depends(get_db)):
    product = models.Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    try:
        if r:
            r.delete("catalog")
    except Exception:
        pass
    return product

@app.delete("/products/{product_id}", dependencies=[Depends(auth.require_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    try:
        if r:
            r.delete("catalog")
    except Exception:
        pass
    return {"message": "Product deleted successfully"}


# --- ATOMIC CHECKOUT (ROW LOCKING) ---

@app.post("/checkout/{product_id}")
def checkout(
    product_id: int, 
    quantity: int = 1, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # 1. Row locking to handle concurrent race conditions
        product = db.query(models.Product).filter(models.Product.id == product_id).with_for_update().first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        # 2. Mutate stock & log order
        product.stock -= quantity
        order = models.Order(
            user_id=current_user.id, 
            total_amount=product.price * quantity,
            status="Pending"
        )
        db.add(order)
        db.commit()

        # 3. Invalidate Redis catalog cache
        try:
            if r:
                r.delete("catalog")
        except Exception:
            pass

        return {"status": "Order placed successfully", "remaining_stock": product.stock, "order_id": order.id}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Checkout database error: {str(e)}")


# --- ORDER MANAGEMENT ENDPOINTS ---

@app.get("/orders")
def get_orders(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        return db.query(models.Order).all()
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).all()

@app.patch("/orders/{order_id}/status", dependencies=[Depends(auth.require_admin)])
def update_order_status(order_id: int, data: OrderStatusSchema, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = data.status
    db.commit()
    return order


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)