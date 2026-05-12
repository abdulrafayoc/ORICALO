"""
Database session management for ORICALO backend.

Connection priority:
  1. Supabase Transaction Pooler (correct host + scoped username)
  2. Supabase Direct connection (port 5432)
  3. SQLite fallback (always works, local only)

The actual TCP probe happens inside the FastAPI startup event (async),
NOT at module import time, because asyncpg requires a running event loop.
At import time we only build the engine objects — no connections are made.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx

load_dotenv()

# ── Supabase credentials ──────────────────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY    = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ── Database URL ──────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

# ── Globals written by init_db() ─────────────────────────────────────────────
# Set to None initially. Will be initialized by init_db()
engine = None
connection_method = "None"
use_supabase_rest = False

AsyncSessionLocal = None


# ── Async startup probe ───────────────────────────────────────────────────────

async def init_db():
    """
    Called from FastAPI startup event. Probes the remote Neon DB.
    """
    global engine, connection_method, AsyncSessionLocal

    if DATABASE_URL:
        if await _probe(DATABASE_URL, "Neon Postgres (from .env)"):
            return

    print("ERROR: No remote DB configured or connection failed. Exiting or running without DB.")
    connection_method = "Failed"


async def _probe(url: str, label: str) -> bool:
    """Try to open a connection and run SELECT 1. Returns True on success."""
    global engine, connection_method, AsyncSessionLocal

    masked = _mask(url)
    print(f"[CONN] Probing {label}: {masked}")
    test_engine = create_async_engine(url, pool_pre_ping=True, pool_size=2)
    try:
        async with asyncio.timeout(10.0):
            async with test_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

        # Success — promote the global engine
        old_engine = engine
        engine = test_engine
        connection_method = label
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        print(f"[OK] Connected via {label}")
        if old_engine is not None:
            await old_engine.dispose()
        return True

    except (asyncio.TimeoutError, asyncio.CancelledError):
        print(f"[TIMEOUT] {label} timed out.")
    except Exception as e:
        err = str(e)
        if "@" in err:
            err = "…@" + err.split("@")[-1]
        print(f"[ERROR] {label} failed: {err}")

    await test_engine.dispose()
    return False


def _mask(url: str) -> str:
    try:
        pre, host = url.split("@", 1)
        return pre.rsplit(":", 1)[0] + ":***@" + host
    except Exception:
        return "***"


# ── Session dependency ────────────────────────────────────────────────────────

async def get_db():
    """FastAPI dependency — yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session


# ── Supabase clients ──────────────────────────────────────────────────────────

_supabase_client: Client = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client


def get_supabase_rest_client():
    if not use_supabase_rest:
        return None
    return httpx.Client(
        base_url=f"{SUPABASE_URL}/rest/v1/",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        },
    )
