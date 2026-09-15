import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/mymarketplace")

# Retry loop for container startup synchronization
engine = None
for attempt in range(1, 11):
    try:
        engine = create_engine(DATABASE_URL)
        conn = engine.connect()
        conn.close()
        print("Database connected successfully.")
        break
    except Exception as e:
        print(f"Waiting for database socket... (Attempt {attempt}/10)")
        if attempt == 10:
            raise RuntimeError("Could not connect to PostgreSQL after 10 attempts.") from e
        time.sleep(2)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()