"""
Occupancy simulation engine.

Follows realistic Pune patterns:
  - Peak 09:00–11:00  →  75–90 % full
  - Peak 17:00–20:00  →  80–95 % full
  - Off-peak          →  20–50 % full
  - Night 22:00–06:00 →  5–20  % full

Runs every 60 seconds via APScheduler and publishes updates
via Redis pub/sub so WebSocket clients receive live data.
"""
from __future__ import annotations
import asyncio
import logging
import random
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, text

from .database import AsyncSessionLocal
from .models import ParkingLot, OccupancyEvent
from .redis_client import publish_lot_update, cache_lot

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


def _target_occupancy_pct(hour: int) -> float:
    """Return a target occupancy ratio (0.0–1.0) for the given IST hour."""
    if 9 <= hour < 12:      # morning peak
        return random.uniform(0.70, 0.92)
    elif 17 <= hour < 21:   # evening peak
        return random.uniform(0.75, 0.95)
    elif 22 <= hour or hour < 6:  # night
        return random.uniform(0.04, 0.20)
    else:                   # mid-day
        return random.uniform(0.30, 0.60)


def _nudge(current: int, total: int, target_pct: float, jitter: int = 3) -> int:
    """Move current free-slots one small step toward target."""
    target_occupied = round(total * target_pct)
    target_free = max(0, total - target_occupied)
    diff = target_free - current
    # Move at most `jitter` slots per tick so changes look gradual
    delta = max(-jitter, min(jitter, diff + random.randint(-1, 1)))
    return max(0, min(total, current + delta))


async def _run_simulation_tick():
    ist_hour = datetime.now(timezone.utc).hour + 5  # rough IST offset
    ist_hour = ist_hour % 24

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ParkingLot).where(ParkingLot.is_active == True))
        lots = result.scalars().all()

        events: list[OccupancyEvent] = []

        for lot in lots:
            target = _target_occupancy_pct(ist_hour)

            old_free_4w = lot.free_4w
            old_free_2w = lot.free_2w

            lot.free_4w = _nudge(lot.free_4w, lot.total_4w, target)
            lot.free_2w = _nudge(lot.free_2w, lot.total_2w, target)

            # Record occupancy events for audit
            for slot_type, old, new in [
                ("4w", old_free_4w, lot.free_4w),
                ("2w", old_free_2w, lot.free_2w),
            ]:
                if new < old:
                    events.append(OccupancyEvent(lot_id=lot.id, slot_type=slot_type,
                                                  event_type="entry", source="simulated"))
                elif new > old:
                    events.append(OccupancyEvent(lot_id=lot.id, slot_type=slot_type,
                                                  event_type="exit", source="simulated"))

            # Push to Redis pub/sub → WebSocket clients
            total = lot.total_4w + lot.total_2w
            free  = lot.free_4w + lot.free_2w
            occ_pct = round((1 - free / total) * 100, 1) if total else 0

            payload = {
                "free_4w": lot.free_4w,
                "free_2w": lot.free_2w,
                "total_4w": lot.total_4w,
                "total_2w": lot.total_2w,
                "occupancy_pct": occ_pct,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await publish_lot_update(str(lot.id), payload)
            await cache_lot(str(lot.id), {
                "id": str(lot.id), "name": lot.name, "address": lot.address,
                "lat": 0, "lng": 0,  # populated by raw SQL in routes
                **payload,
                "rate_4w": float(lot.rate_4w),
                "rate_2w": float(lot.rate_2w),
                "operating_hours": lot.operating_hours,
                "is_active": lot.is_active,
                "total_4w": lot.total_4w,
                "total_2w": lot.total_2w,
                "created_at": lot.created_at.isoformat() if lot.created_at else None,
            }, ttl=90)

        db.add_all(events)
        await db.commit()

    logger.debug("Simulation tick complete: %d lots updated", len(lots))


def start_scheduler():
    scheduler.add_job(_run_simulation_tick, "interval", seconds=60, id="sim_tick",
                      replace_existing=True)
    scheduler.start()
    logger.info("Occupancy simulation scheduler started (60s interval)")


def stop_scheduler():
    scheduler.shutdown(wait=False)
