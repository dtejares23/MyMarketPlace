import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register_user():
    response = client.post("/auth/register", json={
        "email": "testbuyer@marketplace.com",
        "password": "securepassword123",
        "role": "user"
    })
    # Allows 201 Created or 400 if user already exists from prior runs
    assert response.status_code in [201, 400]

def test_login_user():
    response = client.post("/auth/login", json={
        "email": "testbuyer@marketplace.com",
        "password": "securepassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_get_products_catalog():
    response = client.get("/products")
    assert response.status_code == 200
    json_data = response.json()
    assert "data" in json_data
    assert "source" in json_data