"""
GET  /lots                           → all active lots with live occupancy
GET  /lots/nearby?lat=&lng=&radius=  → lots within radius (PostGIS ST_DWithin)
GET  /lots/{id}                      → single lot detail
"""
from __future__ import annotations
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..redis_client import get_cached_lot, cache_lot
from ..schemas import LotOut, LotDetail

router = APIRouter(prefix="/lots", tags=["lots"])


# ── helpers ───────────────────────────────────────────────────────────────────

_LOT_COLS = """
    id::text,
    name,
    address,
    total_4w,
    total_2w,
    free_4w,
    free_2w,
    rate_4w,
    rate_2w,
    operating_hours,
    is_active,
    created_at,
    ST_Y(geom::geometry) AS lat,
    ST_X(geom::geometry) AS lng,
    ROUND(
        (1.0 - (free_4w + free_2w)::numeric / NULLIF(total_4w + total_2w, 0)) * 100, 1
    ) AS occupancy_pct
"""


def _row_to_lot(row) -> dict:
    return dict(row._mapping)


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[LotOut])
async def list_lots(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text(f"SELECT {_LOT_COLS} FROM parking_lots WHERE is_active = TRUE ORDER BY name")
    )
    return [_row_to_lot(r) for r in result.fetchall()]


@router.get("/nearby", response_model=List[LotOut])
async def nearby_lots(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(1000, ge=100, le=10000, description="Radius in metres"),
    db: AsyncSession = Depends(get_db),
):
    sql = text(f"""
        SELECT {_LOT_COLS},
               ST_Distance(
                   geom,
                   ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
               ) AS distance_m
        FROM parking_lots
        WHERE is_active = TRUE
          AND ST_DWithin(
                  geom,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  :radius
              )
        ORDER BY distance_m
        LIMIT 20
    """)
    result = await db.execute(sql, {"lat": lat, "lng": lng, "radius": radius})
    return [_row_to_lot(r) for r in result.fetchall()]


@router.get("/{lot_id}", response_model=LotDetail)
async def lot_detail(lot_id: UUID, db: AsyncSession = Depends(get_db)):
    # Try Redis cache first (TTL 30s for live feel)
    cached = await get_cached_lot(str(lot_id))
    if cached:
        return cached

    result = await db.execute(
        text(f"SELECT {_LOT_COLS} FROM parking_lots WHERE id = :id AND is_active = TRUE"),
        {"id": str(lot_id)},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Parking lot not found")
    data = _row_to_lot(row)
    await cache_lot(str(lot_id), data, ttl=30)
    return data
