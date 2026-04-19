"""
POST /bookings              → create booking + reserve slot
GET  /bookings/{id}         → booking detail
PUT  /bookings/{id}/extend  → extend duration
POST /bookings/{id}/complete → mark exit, release slot
POST /bookings/{id}/cancel  → cancel + release slot
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Booking, ParkingLot, User
from ..schemas import BookingCreate, BookingExtend, BookingOut
from ..auth import get_current_user
from ..redis_client import reserve_slot, release_slot, publish_lot_update
from ..notifications import send_booking_confirmation
from ..utils.qr import generate_qr_base64

router = APIRouter(prefix="/bookings", tags=["bookings"])


async def _get_lot_or_404(lot_id, db: AsyncSession) -> ParkingLot:
    result = await db.execute(
        select(ParkingLot).where(ParkingLot.id == lot_id, ParkingLot.is_active == True)
    )
    lot = result.scalar_one_or_none()
    if not lot:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    return lot


async def _get_booking_or_404(booking_id, db: AsyncSession) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


def _compute_amount(vehicle_type: str, hours: int, lot: ParkingLot) -> Decimal:
    rate = lot.rate_2w if vehicle_type == "2w" else lot.rate_4w
    return Decimal(str(rate)) * hours


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    body: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lot = await _get_lot_or_404(body.lot_id, db)

    # Check availability
    free_field = "free_2w" if body.vehicle_type == "2w" else "free_4w"
    if getattr(lot, free_field) <= 0:
        raise HTTPException(status_code=409, detail="No free slots available")

    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=body.duration_hours)
    amount = _compute_amount(body.vehicle_type, body.duration_hours, lot)

    booking = Booking(
        id=uuid.uuid4(),
        user_id=current_user.id,
        lot_id=lot.id,
        vehicle_number=body.vehicle_number,
        vehicle_type=body.vehicle_type,
        start_time=now,
        end_time=end,
        amount_paid=amount,
        status="reserved",
    )

    # Generate QR code payload
    qr_data = f"PARKPUNE:{booking.id}:{lot.id}:{body.vehicle_number}"
    booking.qr_code = generate_qr_base64(qr_data)

    # Decrement free slots
    if body.vehicle_type == "2w":
        lot.free_2w = max(0, lot.free_2w - 1)
    else:
        lot.free_4w = max(0, lot.free_4w - 1)

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Redis: hold slot for 5 min
    await reserve_slot(str(lot.id), body.vehicle_type, str(booking.id), ttl=300)

    # Publish live update
    total = lot.total_4w + lot.total_2w
    free  = lot.free_4w + lot.free_2w
    await publish_lot_update(str(lot.id), {
        "free_4w": lot.free_4w,
        "free_2w": lot.free_2w,
        "total_4w": lot.total_4w,
        "total_2w": lot.total_2w,
        "occupancy_pct": round((1 - free / total) * 100, 1) if total else 0,
    })

    # WhatsApp confirmation
    send_booking_confirmation(
        phone=current_user.whatsapp_number or current_user.phone,
        lot_name=lot.name,
        vehicle=body.vehicle_number,
        end_time=end.strftime("%d %b %Y, %I:%M %p IST"),
        amount=str(amount),
    )

    return BookingOut.model_validate(booking)


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    booking = await _get_booking_or_404(booking_id, db)
    return BookingOut.model_validate(booking)


@router.put("/{booking_id}/extend", response_model=BookingOut)
async def extend_booking(
    booking_id: uuid.UUID,
    body: BookingExtend,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = await _get_booking_or_404(booking_id, db)
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking.status not in ("reserved", "active"):
        raise HTTPException(status_code=409, detail="Cannot extend a completed/cancelled booking")

    lot = await _get_lot_or_404(booking.lot_id, db)
    extra_amount = _compute_amount(booking.vehicle_type, body.extra_hours, lot)

    booking.end_time = booking.end_time + timedelta(hours=body.extra_hours)
    booking.amount_paid = booking.amount_paid + extra_amount
    await db.commit()
    await db.refresh(booking)
    return BookingOut.model_validate(booking)


@router.post("/{booking_id}/complete", response_model=BookingOut)
async def complete_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    booking = await _get_booking_or_404(booking_id, db)
    lot = await _get_lot_or_404(booking.lot_id, db)

    booking.status = "completed"
    if booking.vehicle_type == "2w":
        lot.free_2w = min(lot.total_2w, lot.free_2w + 1)
    else:
        lot.free_4w = min(lot.total_4w, lot.free_4w + 1)

    await db.commit()
    await db.refresh(booking)
    await release_slot(str(lot.id), booking.vehicle_type, str(booking.id))
    return BookingOut.model_validate(booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = await _get_booking_or_404(booking_id, db)
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking.status not in ("reserved",):
        raise HTTPException(status_code=409, detail="Only reserved bookings can be cancelled")

    lot = await _get_lot_or_404(booking.lot_id, db)
    booking.status = "cancelled"
    if booking.vehicle_type == "2w":
        lot.free_2w = min(lot.total_2w, lot.free_2w + 1)
    else:
        lot.free_4w = min(lot.total_4w, lot.free_4w + 1)

    await db.commit()
    await db.refresh(booking)
    await release_slot(str(lot.id), booking.vehicle_type, str(booking.id))
    return BookingOut.model_validate(booking)
