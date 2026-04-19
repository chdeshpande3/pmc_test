# ParkPune — Real-time Parking Finder for Pune

> PMC smart parking app with live occupancy, UPI payments, and WhatsApp notifications.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17 + Angular Material |
| Maps | Mapbox GL JS |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 + PostGIS |
| Cache / pub-sub | Redis 7 |
| Payments | Razorpay + UPI deep links |
| Notifications | Twilio WhatsApp Business API |
| Auth | Phone OTP → JWT |

---

## Repository layout

```
parkpune/
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   ← PostGIS schema
│   └── seed/
│       └── seed_data.sql            ← 8 PMC parking lots
├── backend/
│   ├── main.py                      ← FastAPI app entry
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── app/
│       ├── config.py                ← Settings (pydantic-settings)
│       ├── database.py              ← Async SQLAlchemy engine
│       ├── models.py                ← ORM models
│       ├── schemas.py               ← Pydantic schemas
│       ├── auth.py                  ← JWT + OTP helpers
│       ├── redis_client.py          ← Redis helpers
│       ├── simulation.py            ← Occupancy simulation engine
│       ├── websocket.py             ← WS connection manager + Redis listener
│       ├── notifications.py         ← Twilio WhatsApp wrappers
│       ├── utils/qr.py              ← QR code generator
│       └── routes/
│           ├── lots.py              ← GET /lots, /lots/nearby, /lots/{id}
│           ├── bookings.py          ← POST/PUT /bookings/*
│           └── users.py             ← OTP auth + /users/me
├── mobile/                          ← Angular web app
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── pages/
│       │   │   ├── map/             ← Home map screen
│       │   │   ├── lot-detail/      ← Lot detail + live counter
│       │   │   ├── booking/         ← Booking + Razorpay payment
│       │   │   ├── navigation/      ← Mapbox turn-by-turn
│       │   │   ├── auth/            ← Phone OTP login
│       │   │   └── my-car/          ← Find my car + extend parking
│       │   ├── services/
│       │   │   ├── api.service.ts
│       │   │   ├── websocket.service.ts
│       │   │   ├── auth.service.ts
│       │   │   └── location.service.ts
│       │   └── shared/              ← Lot card, bottom sheet, pipes
│       └── environments/
└── docs/
    ├── architecture.md
    └── api.md
```

---

## Quick start — Backend

### Option A: Docker (recommended)

```bash
cd parkpune/backend

# Copy and edit env
cp .env.example .env

# Start DB + Redis + API
docker compose up -d

# API is at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Option B: Local Python

**Prerequisites:** Python 3.12, PostgreSQL 16 with PostGIS, Redis

```bash
cd parkpune/backend

# Create virtualenv
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Copy and edit env
cp .env.example .env

# Run DB migrations + seed
psql -U postgres -c "CREATE DATABASE parkpune;"
psql -U postgres -d parkpune -f ../database/migrations/001_initial_schema.sql
psql -U postgres -d parkpune -f ../database/seed/seed_data.sql

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Quick start — Angular frontend

**Prerequisites:** Node.js 20+, npm 10+

```bash
cd parkpune/mobile

# Install deps
npm install

# Set your Mapbox token in:
# src/environments/environment.ts  (mapboxToken field)

# Start dev server
npm start
# → http://localhost:4200
```

---

## Environment variables

Edit `backend/.env` before running:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL async connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SECRET_KEY` | Yes | JWT signing key (generate with `openssl rand -hex 32`) |
| `MAPBOX_TOKEN` | Yes | Mapbox public token |
| `RAZORPAY_KEY_ID` | For payments | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | For payments | Razorpay key secret |
| `TWILIO_ACCOUNT_SID` | For WhatsApp | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For WhatsApp | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | For WhatsApp | Twilio sandbox/production number |

> If Twilio/Razorpay credentials are absent, the app runs in mock mode — OTP and notifications are logged to console instead of sent.

---

## Seed data — PMC parking lots

| # | Lot | Coordinates | 4W | 2W |
|---|-----|------------|----|----|
| 1 | FC Road Parking | 18.5195, 73.8397 | 60 | 20 |
| 2 | JM Road Parking | 18.5167, 73.8378 | 40 | 20 |
| 3 | Laxmi Road Parking | 18.5108, 73.8567 | 80 | 40 |
| 4 | Deccan Gymkhana Lot | 18.5162, 73.8414 | 70 | 30 |
| 5 | Shivajinagar Metro Lot | 18.5300, 73.8476 | 100 | 50 |
| 6 | Viman Nagar Lot | 18.5679, 73.9143 | 150 | 50 |
| 7 | Balewadi High Street Lot | 18.5590, 73.7817 | 130 | 50 |
| 8 | Bibvewadi Lot | 18.4848, 73.8595 | 60 | 20 |

PMC rates: ₹20/hr four-wheeler · ₹4/hr two-wheeler

---

## Key API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/lots` | All lots with occupancy |
| GET | `/lots/nearby?lat=&lng=&radius=` | PostGIS proximity search |
| GET | `/lots/{id}` | Single lot (Redis cached 30s) |
| POST | `/bookings` | Create booking + reserve slot |
| PUT | `/bookings/{id}/extend` | Extend duration |
| POST | `/bookings/{id}/complete` | Exit → release slot |
| POST | `/users/request-otp` | Send WhatsApp OTP |
| POST | `/users/verify-otp` | Verify OTP → JWT |
| WS | `/ws/lots` | Live occupancy stream |

Full reference: [docs/api.md](docs/api.md)

---

## Simulation engine

Runs every **60 seconds** inside the FastAPI process (APScheduler).  
Follows realistic Pune traffic patterns:

| Time (IST) | Occupancy |
|------------|-----------|
| 09:00–12:00 | 70–92 % |
| 17:00–21:00 | 75–95 % |
| 22:00–06:00 | 5–20 % |
| Rest | 30–60 % |

Updates are published to Redis → forwarded via WebSocket to all connected clients without page reload.

---

## Offline mode

- All lots are cached to `localStorage` on first load.
- Map markers render from cache when API is unreachable.
- "Last updated X min ago" label shown on each lot card.
- Full sync resumes automatically on reconnect.
