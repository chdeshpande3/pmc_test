-- ParkPune Database Schema
-- Requires: PostgreSQL 14+ with PostGIS extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone            VARCHAR(15)  UNIQUE NOT NULL,
    name             VARCHAR(100),
    whatsapp_number  VARCHAR(15),
    vehicles         JSONB        NOT NULL DEFAULT '[]',
    otp              VARCHAR(6),
    otp_expires_at   TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PARKING LOTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_lots (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(200) NOT NULL,
    address          TEXT,
    -- Geography(POINT) enables ST_DWithin distance queries in metres
    geom             GEOGRAPHY(POINT, 4326) NOT NULL,
    total_4w         INTEGER      NOT NULL DEFAULT 0,
    total_2w         INTEGER      NOT NULL DEFAULT 0,
    free_4w          INTEGER      NOT NULL DEFAULT 0,
    free_2w          INTEGER      NOT NULL DEFAULT 0,
    rate_4w          NUMERIC(10,2) NOT NULL DEFAULT 20.00,   -- ₹/hr
    rate_2w          NUMERIC(10,2) NOT NULL DEFAULT 4.00,    -- ₹/hr
    operating_hours  VARCHAR(100) NOT NULL DEFAULT '06:00-22:00',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    lot_id          UUID REFERENCES parking_lots(id) ON DELETE RESTRICT,
    vehicle_number  VARCHAR(20)  NOT NULL,
    vehicle_type    VARCHAR(5)   NOT NULL CHECK (vehicle_type IN ('2w','4w')),
    start_time      TIMESTAMP WITH TIME ZONE,
    end_time        TIMESTAMP WITH TIME ZONE,
    amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)  NOT NULL DEFAULT 'reserved'
                        CHECK (status IN ('reserved','active','completed','cancelled')),
    qr_code         TEXT,
    razorpay_order_id VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- OCCUPANCY EVENTS  (audit trail + simulation feed)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS occupancy_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id      UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
    slot_type   VARCHAR(5)   NOT NULL CHECK (slot_type IN ('2w','4w')),
    event_type  VARCHAR(10)  NOT NULL CHECK (event_type IN ('entry','exit')),
    timestamp   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    source      VARCHAR(20)  NOT NULL DEFAULT 'simulated'
                    CHECK (source IN ('sensor','crowdsource','simulated'))
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_parking_lots_geom     ON parking_lots USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_parking_lots_active   ON parking_lots(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id      ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lot_id       ON bookings(lot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time     ON bookings(end_time);
CREATE INDEX IF NOT EXISTS idx_occ_events_lot_ts     ON occupancy_events(lot_id, timestamp DESC);
