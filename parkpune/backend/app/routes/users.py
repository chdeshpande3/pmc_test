"""
POST /users/request-otp  → send OTP to phone via WhatsApp
POST /users/verify-otp   → verify OTP, return JWT
GET  /users/me           → current user profile
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas import OTPRequest, OTPVerify, TokenOut, UserOut
from ..auth import generate_otp, create_access_token, get_current_user
from ..notifications import send_otp

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/request-otp")
async def request_otp(body: OTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    if not user:
        user = User(phone=body.phone, whatsapp_number=body.phone)
        db.add(user)

    user.otp = otp
    user.otp_expires_at = expires
    await db.commit()

    send_otp(body.phone, otp)
    return {"message": "OTP sent via WhatsApp", "phone": body.phone}


@router.post("/verify-otp", response_model=TokenOut)
async def verify_otp(body: OTPVerify, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user or user.otp != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if not user.otp_expires_at or user.otp_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    user.otp = None
    user.otp_expires_at = None
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
