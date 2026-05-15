import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the parent directory (Oricalo project root)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import all models to register them with Base metadata early
from app.db.base import Base
import app.db_tables.organization # noqa
import app.db_tables.user         # noqa
import app.db_tables.agent        # noqa
import app.db_tables.listing      # noqa
import app.db_tables.crm          # noqa

from app.api.endpoints import auth as auth_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Auto-create database tables on startup ---
    from app.db.session import init_db

    # 1. Probe remote DBs and promote engine (with timeouts + SQLite fallback)
    await init_db()

    # Tables managed by Alembic — run: alembic upgrade head
    
    yield

app = FastAPI(title="ORICALO AI Backend", version="0.1.0", lifespan=lifespan)

# Setup Rate Limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup metrics early
Instrumentator().instrument(app).expose(app)

# CORS origins — supports both local dev and any additional origins from env
EXTRA_ORIGINS = [o.strip() for o in os.getenv("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]
origins = [
    "http://localhost:3000",  # Next.js Frontend
    "http://127.0.0.1:3000",
    "http://localhost:8000",  # FastAPI Backend
    "http://127.0.0.1:8000",
    *EXTRA_ORIGINS,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global exception handler ---
# FastAPI's CORSMiddleware is bypassed when an unhandled exception occurs,
# causing the browser to report a "CORS error" that is actually a backend 500.
# This handler ensures CORS headers are always present on error responses.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in origins or not origin:
        headers["Access-Control-Allow-Origin"] = origin or "*"
        headers["Access-Control-Allow-Credentials"] = "true"

    logger.error(f"Unhandled exception on {request.url.path}: {type(exc).__name__}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )

from app.api.endpoints import stt, dialogue, valuation, agents, agency, voice_orchestrator, analytics, telephony, crm_integration, crm_local, rag
from app.api.endpoints import calendar

app.include_router(auth_router.router)
app.include_router(stt.router)
app.include_router(voice_orchestrator.router)
app.include_router(analytics.router, prefix="/analytics")
app.include_router(telephony.router, prefix="/telephony")
app.include_router(dialogue.router)
app.include_router(valuation.router)
app.include_router(agents.router)
app.include_router(agency.router)
app.include_router(crm_integration.router, prefix="/crm_webhook") # rename old mock to webhook
app.include_router(crm_local.router, prefix="/crm")
app.include_router(rag.router)
app.include_router(calendar.router, prefix="/calendar")


@app.get("/")
async def root():
    return {"message": "ORICALO AI Backend is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

