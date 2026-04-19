import json
import redis.asyncio as aioredis
from .config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def cache_lot(lot_id: str, data: dict, ttl: int = 90):
    r = await get_redis()
    await r.setex(f"lot:{lot_id}", ttl, json.dumps(data))


async def get_cached_lot(lot_id: str) -> dict | None:
    r = await get_redis()
    raw = await r.get(f"lot:{lot_id}")
    return json.loads(raw) if raw else None


async def reserve_slot(lot_id: str, vehicle_type: str, booking_id: str, ttl: int = 300):
    """Hold a slot for 5 min while user navigates / pays."""
    r = await get_redis()
    key = f"reservation:{lot_id}:{vehicle_type}:{booking_id}"
    await r.setex(key, ttl, booking_id)


async def release_slot(lot_id: str, vehicle_type: str, booking_id: str):
    r = await get_redis()
    await r.delete(f"reservation:{lot_id}:{vehicle_type}:{booking_id}")


async def publish_lot_update(lot_id: str, payload: dict):
    r = await get_redis()
    await r.publish("lot_updates", json.dumps({"lot_id": lot_id, **payload}))
