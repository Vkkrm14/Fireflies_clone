from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from database.session import init_db
from database.seed import run_seed
from routes import meetings, transcript, summary, action_items, search, users, extras, media


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and seed data on startup."""
    init_db()
    run_seed()
    yield


app = FastAPI(
    title="Fireflies Clone API",
    description="A Fireflies.ai clone API built with FastAPI and SQLite",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *[o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", os.getenv("FRONTEND_URL", "")).split(",") if o.strip()],
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(meetings.router)
app.include_router(transcript.router)
app.include_router(summary.router)
app.include_router(action_items.router)
app.include_router(search.router)
app.include_router(users.router)
app.include_router(extras.router)
app.include_router(media.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "fireflies-clone-api"}
