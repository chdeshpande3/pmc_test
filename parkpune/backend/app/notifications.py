"""WhatsApp notifications via Twilio."""
from __future__ import annotations
import logging
from twilio.rest import Client
from .config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def _get_client() -> Client | None:
    global _client
    if not settings.TWILIO_ACCOUNT_SID:
        return None
    if _client is None:
        _client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    return _client


def _send(to_phone: str, body: str):
    client = _get_client()
    if not client:
        logger.info("[WhatsApp MOCK] to=%s  body=%s", to_phone, body)
        return
    try:
        msg = client.messages.create(
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=f"whatsapp:{to_phone}",
            body=body,
        )
        logger.info("WhatsApp sent sid=%s", msg.sid)
    except Exception as exc:
        logger.error("WhatsApp send failed: %s", exc)


# ── Public helpers ────────────────────────────────────────────────────────────

def send_booking_confirmation(phone: str, lot_name: str, vehicle: str, end_time: str, amount: str):
    body = (
        f"✅ *ParkPune Booking Confirmed!*\n\n"
        f"📍 Lot: {lot_name}\n"
        f"🚗 Vehicle: {vehicle}\n"
        f"⏰ Valid till: {end_time}\n"
        f"💰 Paid: ₹{amount}\n\n"
        f"Show QR code at gate. Reply *EXTEND* to add more time."
    )
    _send(phone, body)


def send_expiry_nudge(phone: str, lot_name: str, minutes_left: int):
    body = (
        f"⚠️ *ParkPune Reminder*\n\n"
        f"Your parking at *{lot_name}* expires in {minutes_left} minutes.\n"
        f"Reply *EXTEND 30*, *EXTEND 60*, or *EXTEND 120* to add time."
    )
    _send(phone, body)


def send_otp(phone: str, otp: str):
    body = f"Your ParkPune OTP is *{otp}*. Valid for 5 minutes. Do not share."
    _send(phone, body)
