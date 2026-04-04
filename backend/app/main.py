import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the parent directory (Oricalo project root)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="ORICALO AI Backend", version="0.1.0")

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

    print(f"[ERROR] Unhandled exception on {request.url.path}: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )

from app.api.endpoints import stt, dialogue, valuation, agents, agency, voice_orchestrator, analytics, telephony

app.include_router(stt.router)
app.include_router(voice_orchestrator.router)
app.include_router(analytics.router, prefix="/analytics")
app.include_router(telephony.router, prefix="/telephony")
app.include_router(dialogue.router)
app.include_router(valuation.router)
app.include_router(agents.router)
app.include_router(agency.router)
app.include_router(rag_simple.router)

# --- Auto-create database tables on startup ---
@app.on_event("startup")
async def startup():
    from app.db.session import engine
    from app.db.base import Base
    # Import all models so Base.metadata knows about them
    import app.db_tables.agent  # noqa
    import app.db_tables.listing  # noqa
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("🔄 Continuing without database - some features may be limited")

@app.get("/")
async def root():
    return {"message": "ORICALO AI Backend is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

