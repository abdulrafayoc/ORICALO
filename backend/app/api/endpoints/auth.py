from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from app.db.session import get_db
from app.db_tables.user import User, RefreshToken
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
import hashlib
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == payload.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _issue_tokens(user, db)

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == payload.email))
    user = result.scalars().first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return await _issue_tokens(user, db)

async def _issue_tokens(user: User, db: AsyncSession) -> TokenResponse:
    data = {"sub": str(user.id), "email": user.email, "role": user.role}
    access = create_access_token(data)
    refresh = create_refresh_token(data)
    
    token_hash = hashlib.sha256(refresh.encode()).hexdigest()
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_token)
    await db.commit()
    
    return TokenResponse(access_token=access, refresh_token=refresh)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    result = await db.execute(select(RefreshToken).filter(RefreshToken.token_hash == token_hash))
    db_token = result.scalars().first()
    
    if not db_token or db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired")
    
    await db.delete(db_token)
    
    user_result = await db.execute(select(User).filter(User.id == int(payload["sub"])))
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return await _issue_tokens(user, db)

@router.post("/logout")
async def logout(refresh_token: str, db: AsyncSession = Depends(get_db)):
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    result = await db.execute(select(RefreshToken).filter(RefreshToken.token_hash == token_hash))
    db_token = result.scalars().first()
    
    if db_token:
        await db.delete(db_token)
        await db.commit()
    
    return {"status": "logged out"}
