"""
ParkPune FastAPI backend entry point.

Run locally:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import lots, bookings, users
from app.simulation import start_scheduler, stop_scheduler
from app.websocket import websocket_endpoint, redis_listener
from app.redis_client import close_redis

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger(__name__)

_redis_listener_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _redis_listener_task
    # Startup
    logger.info("Starting ParkPune backend …")
    start_scheduler()
    _redis_listener_task = asyncio.create_task(redis_listener())
    yield
    # Shutdown
    if _redis_listener_task:
        _redis_listener_task.cancel()
    stop_scheduler()
    await close_redis()
    logger.info("ParkPune backend stopped.")


app = FastAPI(
    title="ParkPune API",
    version="1.0.0",
    description="Real-time PMC parking finder for Pune",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST routers ──────────────────────────────────────────────────────────────
app.include_router(lots.router)
app.include_router(bookings.router)
app.include_router(users.router)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/lots")
async def ws_lots(websocket: WebSocket):
    await websocket_endpoint(websocket)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "parkpune-api"}
