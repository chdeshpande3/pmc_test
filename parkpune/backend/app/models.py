import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean,
    DateTime, ForeignKey, Text, JSON, CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone           = Column(String(15), unique=True, nullable=False)
    name            = Column(String(100))
    whatsapp_number = Column(String(15))
    vehicles        = Column(JSON, default=list)
    otp             = Column(String(6))
    otp_expires_at  = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="user")


class ParkingLot(Base):
    __tablename__ = "parking_lots"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name            = Column(String(200), nullable=False)
    address         = Column(Text)
    geom            = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    total_4w        = Column(Integer, nullable=False, default=0)
    total_2w        = Column(Integer, nullable=False, default=0)
    free_4w         = Column(Integer, nullable=False, default=0)
    free_2w         = Column(Integer, nullable=False, default=0)
    rate_4w         = Column(Numeric(10, 2), nullable=False, default=20.00)
    rate_2w         = Column(Numeric(10, 2), nullable=False, default=4.00)
    operating_hours = Column(String(100), default="06:00-22:00")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), default=datetime.utcnow)

    bookings         = relationship("Booking", back_populates="lot")
    occupancy_events = relationship("OccupancyEvent", back_populates="lot")


class Booking(Base):
    __tablename__ = "bookings"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    lot_id           = Column(UUID(as_uuid=True), ForeignKey("parking_lots.id", ondelete="RESTRICT"))
    vehicle_number   = Column(String(20), nullable=False)
    vehicle_type     = Column(String(5), nullable=False)
    start_time       = Column(DateTime(timezone=True))
    end_time         = Column(DateTime(timezone=True))
    amount_paid      = Column(Numeric(10, 2), default=0)
    status           = Column(String(20), default="reserved")
    qr_code          = Column(Text)
    razorpay_order_id = Column(String(100))
    created_at       = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("vehicle_type IN ('2w','4w')", name="chk_vehicle_type"),
        CheckConstraint(
            "status IN ('reserved','active','completed','cancelled')", name="chk_status"
        ),
    )

    user = relationship("User", back_populates="bookings")
    lot  = relationship("ParkingLot", back_populates="bookings")


class OccupancyEvent(Base):
    __tablename__ = "occupancy_events"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lot_id     = Column(UUID(as_uuid=True), ForeignKey("parking_lots.id", ondelete="CASCADE"))
    slot_type  = Column(String(5), nullable=False)
    event_type = Column(String(10), nullable=False)
    timestamp  = Column(DateTime(timezone=True), default=datetime.utcnow)
    source     = Column(String(20), default="simulated")

    lot = relationship("ParkingLot", back_populates="occupancy_events")
