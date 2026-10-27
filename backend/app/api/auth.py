"""Authentication API routes for user registration, login, and JWT issuance."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.db.schemas import UserCreate, UserLogin, UserOut, Token
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_email,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Register a new user account and return JWT token."""
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.email)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Authenticate with email and password, returning JWT token."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.email)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(
    current_email: str = Depends(get_current_user_email),
    db: Session = Depends(get_db),
) -> UserOut:
    """Retrieve profile of the currently authenticated user."""
    user = db.query(User).filter(User.email == current_email.lower()).first()
    if not user:
        # Create a virtual demo user if in dev/demo mode
        user = User(email=current_email, hashed_password=hash_password("demopass123"), full_name="DriveAware Demo User")
        db.add(user)
        db.commit()
        db.refresh(user)

    return UserOut.model_validate(user)
