import uuid
from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from config import settings
from database import get_db
from database.crud import create_user, get_user, get_user_by_email, get_user_by_google_id, update_user
from api.dependencies import get_current_user
from models.schemas import (
    UserCreate, UserResponse, UserUpdate, TokenResponse, LoginRequest, GoogleAuthRequest
)
from database.models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, request.email)
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": request.id_token}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
        google_data = resp.json()

    google_id = google_data["sub"]
    email = google_data["email"]
    name = google_data.get("name", email.split("@")[0])
    avatar_url = google_data.get("picture")

    user = await get_user_by_google_id(db, google_id)
    if not user:
        existing = await get_user_by_email(db, email)
        if existing:
            user = await update_user(db, existing.id, google_id=google_id, avatar_url=avatar_url or existing.avatar_url)
        else:
            user = await create_user(db, email=email, name=name, google_id=google_id, avatar_url=avatar_url)

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.post("/register", response_model=TokenResponse)
async def register(request: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    if not request.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required for registration")
    hashed = hash_password(request.password)
    user = await create_user(db, email=request.email, name=request.name, hashed_password=hashed)
    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kwargs = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}
    if not kwargs:
        return UserResponse.model_validate(current_user)
    user = await update_user(db, current_user.id, **kwargs)
    return UserResponse.model_validate(user)
