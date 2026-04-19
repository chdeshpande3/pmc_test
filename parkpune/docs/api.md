# ParkPune API Reference

Base URL: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

## Authentication

JWT Bearer token obtained via OTP flow.

```
Authorization: Bearer <token>
```

---

## Lots

### GET /lots
Returns all active parking lots with live occupancy.

**Response** `200`
```json
[
  {
    "id": "uuid",
    "name": "FC Road Parking",
    "address": "Fergusson College Road, Deccan Gymkhana",
    "lat": 18.5195, "lng": 73.8397,
    "total_4w": 60, "total_2w": 20,
    "free_4w": 45,  "free_2w": 15,
    "rate_4w": 20.0, "rate_2w": 4.0,
    "operating_hours": "06:00-23:00",
    "occupancy_pct": 25.0,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### GET /lots/nearby
Returns lots within `radius` metres, sorted by distance.

**Query params**
| Param | Type | Description |
|-------|------|-------------|
| lat | float | User latitude |
| lng | float | User longitude |
| radius | float | Radius in metres (default 1000, max 10000) |

---

### GET /lots/{id}
Single lot detail. Response cached in Redis for 30 s.

---

## Bookings

### POST /bookings *(auth required)*
Create a booking and reserve a slot.

**Body**
```json
{
  "lot_id": "uuid",
  "vehicle_number": "MH12AB1234",
  "vehicle_type": "4w",
  "duration_hours": 2,
  "user_phone": "+919876543210"
}
```

**Response** `201`
```json
{
  "id": "uuid",
  "status": "reserved",
  "qr_code": "data:image/png;base64,...",
  "amount_paid": 40.0,
  "end_time": "2024-01-01T12:00:00Z"
}
```

---

### PUT /bookings/{id}/extend *(auth required)*
Extend parking duration.

**Body** `{ "extra_hours": 1 }`

---

### POST /bookings/{id}/complete
Mark exit — releases slot back to pool.

---

### POST /bookings/{id}/cancel *(auth required)*
Cancel a reserved (not yet active) booking.

---

## Users / Auth

### POST /users/request-otp
Send OTP via WhatsApp.

**Body** `{ "phone": "+919876543210" }`

---

### POST /users/verify-otp
Verify OTP and receive JWT.

**Body** `{ "phone": "+919876543210", "otp": "123456" }`

**Response** `200`
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": "uuid", "phone": "+919876543210", ... }
}
```

---

### GET /users/me *(auth required)*
Current user profile.

---

## WebSocket

### WS /ws/lots
Subscribe to live occupancy updates. No auth required.

**Incoming message format**
```json
{
  "type": "lot_update",
  "lot_id": "uuid",
  "free_4w": 42,
  "free_2w": 18,
  "total_4w": 100,
  "total_2w": 50,
  "occupancy_pct": 38.7,
  "updated_at": "2024-01-01T10:00:00+00:00"
}
```

Client may send `"ping"` to keep connection alive; server responds `"pong"`.

---

## Error format

```json
{ "detail": "Human-readable error message" }
```

Common status codes:
- `400` — Invalid input / expired OTP
- `401` — Not authenticated
- `403` — Forbidden (not your booking)
- `404` — Resource not found
- `409` — Conflict (no free slots / cannot extend completed booking)
