"""
WebSocket endpoint: ws://<host>/ws/lots

Clients subscribe and receive JSON lot-occupancy updates every time
the simulation engine publishes to Redis pub/sub channel 'lot_updates'.

Message format:
{
  "type": "lot_update",
  "lot_id": "<uuid>",
  "free_4w": 42,
  "free_2w": 18,
  "total_4w": 100,
  "total_2w": 50,
  "occupancy_pct": 38.7,
  "updated_at": "2024-01-01T10:00:00+00:00"
}
"""
from __future__ import annotations
import asyncio
import json
import logging

import redis.asyncio as aioredis
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

from .config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._active.add(ws)
        logger.info("WS connected — total clients: %d", len(self._active))

    def disconnect(self, ws: WebSocket):
        self._active.discard(ws)
        logger.info("WS disconnected — total clients: %d", len(self._active))

    async def broadcast(self, message: str):
        dead: list[WebSocket] = []
        for ws in self._active:
            try:
                if ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._active.discard(ws)


manager = ConnectionManager()


async def redis_listener():
    """Subscribe to Redis pub/sub and fan out to all WS clients."""
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("lot_updates")
    logger.info("Redis pub/sub listener started on channel 'lot_updates'")
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            payload = json.dumps({"type": "lot_update", **data})
            await manager.broadcast(payload)
    except asyncio.CancelledError:
        pass
    finally:
        await pubsub.unsubscribe("lot_updates")
        await r.aclose()


async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive; client may send pings
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as exc:
        logger.error("WS error: %s", exc)
        manager.disconnect(ws)
