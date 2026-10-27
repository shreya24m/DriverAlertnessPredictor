"""Unit tests for user signup, authentication, and JWT authorization."""

import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_user_signup_and_login() -> None:
    """Test user registration and subsequent login returning JWT."""
    email = f"test_{uuid.uuid4().hex[:8]}@driveaware.ai"
    password = "SafePassword123!"

    # 1. Signup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password, "full_name": "Test Driver"},
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert "access_token" in signup_data
    assert signup_data["user"]["email"] == email

    # 2. Duplicate signup should be rejected
    dup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": password},
    )
    assert dup_res.status_code == 400

    # 3. Login with correct password
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 4. Login with incorrect password rejected
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 5. Access /me profile with token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email
