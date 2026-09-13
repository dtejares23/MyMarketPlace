import os
import redis
import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Marketplace API")

@app.on_event("startup")
def startup_event():
    print("\n" + "="*55)
    print("🚀 MARKETPLACE API BACKEND IS RUNNING ON PORT 8000")
    print("📖 API Docs (Swagger UI): http://localhost:8000/docs")
    print("="*55 + "\n")
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

r = redis.Redis(host=os.getenv("REDIS_HOST", "cache"), port=6379, decode_responses=True)

# Pydantic Schemas
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

# Auth Endpoints
@app.post("/auth/register", status_code=201)
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = models.User(
        email=data.email,
        hashed_password=auth.hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/auth/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = auth.create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

# Product & Category CRUD (With Redis Caching)[cite: 4]
@app.get("/products")
def get_products(db: Session = Depends(get_db)):
    cached = r.get("catalog")
    if cached:
        return {"source": "cache", "data": json.loads(cached)}
    
    products = db.query(models.Product).all()
    data = [{"id": p.id, "title": p.title, "description": p.description, "price": p.price, "stock": p.stock, "category_id": p.category_id} for p in products]
    r.setex("catalog", 60, json.dumps(data))
    return {"source": "db", "data": data}

@app.post("/products", dependencies=[Depends(auth.require_admin)])
def create_product(data: ProductSchema, db: Session = Depends(get_db)):
    product = models.Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    r.delete("catalog")
    return product

# Atomic Checkout with Row Locking (Concurrency Defense Target)[cite: 4]
@app.post("/checkout/{product_id}")
def checkout(product_id: int, quantity: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    with db.begin():
        product = db.query(models.Product).filter(models.Product.id == product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        if product.stock < quantity:
            db.rollback()
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        product.stock -= quantity
        order = models.Order(user_id=current_user.id, total_amount=product.price * quantity)
        db.add(order)
        db.commit()
    
    r.delete("catalog")
    return {"status": "Order placed successfully", "remaining_stock": product.stock}

# Order History[cite: 4]
@app.get("/orders")
def get_orders(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        return db.query(models.Order).all()
    return db.query(models.Order).filter(models.Order.user_id == current_user.id).all()