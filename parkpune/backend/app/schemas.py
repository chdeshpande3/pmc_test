from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ─── Lot ─────────────────────────────────────────────────────────────────────

class LotBase(BaseModel):
    name: str
    address: Optional[str] = None
    total_4w: int
    total_2w: int
    rate_4w: Decimal = Decimal("20.00")
    rate_2w: Decimal = Decimal("4.00")
    operating_hours: str = "06:00-22:00"
    is_active: bool = True


class LotOut(LotBase):
    id: UUID
    free_4w: int
    free_2w: int
    lat: float
    lng: float
    occupancy_pct: float          # 0-100, used for colour coding
    created_at: datetime

    model_config = {"from_attributes": True}


class LotDetail(LotOut):
    """Extended detail returned by GET /lots/{id}"""
    pass


# ─── Booking ──────────────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    lot_id: UUID
    vehicle_number: str = Field(..., min_length=4, max_length=20)
    vehicle_type: str   = Field(..., pattern="^(2w|4w)$")
    duration_hours: int = Field(..., ge=1, le=24)
    user_phone: str     = Field(..., min_length=10, max_length=15)


class BookingExtend(BaseModel):
    extra_hours: int = Field(..., ge=1, le=12)


class BookingOut(BaseModel):
    id: UUID
    lot_id: UUID
    vehicle_number: str
    vehicle_type: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    amount_paid: Decimal
    status: str
    qr_code: Optional[str]
    razorpay_order_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── User / Auth ──────────────────────────────────────────────────────────────

class OTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


class OTPVerify(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str   = Field(..., min_length=4, max_length=6)


class UserOut(BaseModel):
    id: UUID
    phone: str
    name: Optional[str]
    whatsapp_number: Optional[str]
    vehicles: List[dict] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── WebSocket payload ───────────────────────────────────────────────────────

class LotOccupancyUpdate(BaseModel):
    lot_id: str
    free_4w: int
    free_2w: int
    total_4w: int
    total_2w: int
    occupancy_pct: float
    updated_at: str
