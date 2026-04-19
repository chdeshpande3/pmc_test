# ParkPune — Architecture Overview

## System diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Angular)                         │
│  Map Screen  ─  Lot Detail  ─  Booking  ─  Nav  ─  My Car       │
│       │               │           │                              │
│  Mapbox GL        REST + WS    Razorpay UPI                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                     FastAPI Backend (Python)                      │
│                                                                   │
│  /lots    /bookings    /users    /ws/lots                         │
│     │          │          │         │                             │
│  SQLAlchemy  SQLAlchemy  JWT     Redis pub/sub                    │
│     │          │          │         │                             │
│  PostGIS   PostGIS     Twilio  Simulation engine (APScheduler)    │
└───────────┬──────────────────────────────────────────────────────┘
            │
┌───────────▼───────────────┐   ┌──────────────────┐
│  PostgreSQL + PostGIS      │   │   Redis           │
│  parking_lots              │   │   lot:{id} cache  │
│  bookings                  │   │   reservations    │
│  users                     │   │   lot_updates ch  │
│  occupancy_events          │   └──────────────────┘
└───────────────────────────┘
```

## Component responsibilities

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Mobile/Web client | Angular 17 + Angular Material | Map UI, booking flow, auth |
| Map rendering | Mapbox GL JS | Interactive Pune map, live markers |
| Backend API | FastAPI (Python 3.12) | REST + WebSocket gateway |
| Database | PostgreSQL 16 + PostGIS | Lot geometry, bookings, users |
| Cache & pub-sub | Redis 7 | Slot state, WS fan-out, 30s cache |
| Simulation | APScheduler (in-process) | Realistic occupancy variation |
| Payments | Razorpay + UPI deep link | INR payments, Android-first |
| Notifications | Twilio WhatsApp Business | OTP, booking confirm, expiry nudge |
| Auth | Phone OTP → JWT | No email required |

## Live data flow

```
Simulation tick (60s)
      │
      ▼
  Update DB (parking_lots.free_4w / free_2w)
      │
      ▼
  Publish to Redis channel "lot_updates"
      │
      ▼
  redis_listener task (async background)
      │
      ▼
  WebSocket ConnectionManager.broadcast()
      │
      ▼
  All connected Angular clients receive JSON → update map markers
```

## PostGIS spatial queries

Nearby lots use `ST_DWithin` with the `geography` type, so distance is in metres:

```sql
SELECT *, ST_Distance(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance_m
FROM parking_lots
WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
ORDER BY distance_m;
```

## Colour coding logic

| Occupancy | Colour | Marker class |
|-----------|--------|-------------|
| < 50 % | Green | `.lot-marker.green` |
| 50–79 % | Amber | `.lot-marker.amber` |
| ≥ 80 % | Red | `.lot-marker.red` |

## India-specific design decisions

- **Phone-only auth**: OTP via WhatsApp (primary) — no email required.
- **INR amounts**: All monetary values stored as `NUMERIC(10,2)`, displayed with `₹` prefix via `InrPipe`.
- **UPI deep link**: `upi://pay?pa=parkpune@upi&...` as fallback if Razorpay SDK unavailable.
- **Android-first**: Web app is mobile-responsive and installable as PWA.
- **Offline mode**: Last-known lot data cached in `localStorage`; markers render even without network; "last updated X min ago" label shown.
