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

PROJECT_REF = "dbnwxwwkfvvlvojwqvzd"
DB_PASSWORD = "drahmedrazashahid"

# ── Connection URLs ───────────────────────────────────────────────────────────
# Supabase Transaction Pooler — correct host + scoped username (postgres.PROJECT_REF)
# Port 6543, prepared_statement_cache_size=0 required for pgBouncer
POOLER_URLS = [
    f"postgresql+asyncpg://postgres.{PROJECT_REF}:{DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?ssl=require&prepared_statement_cache_size=0",
    f"postgresql+asyncpg://postgres.{PROJECT_REF}:{DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?ssl=require&prepared_statement_cache_size=0",
]

# Direct connection — bypasses pgBouncer, port 5432
DIRECT_URL = f"postgresql+asyncpg://postgres:{DB_PASSWORD}@db.{PROJECT_REF}.supabase.co:5432/postgres?ssl=require"

# Absolute fallback
SQLITE_URL = "sqlite+aiosqlite:///./oricalo.db"

# ── Globals written by init_db() ─────────────────────────────────────────────
# Starts as SQLite — replaced by init_db() once the async event loop is running.
engine            = create_async_engine(SQLITE_URL, echo=False)
connection_method = "SQLite (pre-startup default)"
use_supabase_rest = False

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ── Async startup probe ───────────────────────────────────────────────────────

async def init_db():
    """
    Called from FastAPI startup event. Probes remote DBs with a 3-second
    timeout each and promotes the global engine to the first that responds.
    Falls back to SQLite silently if all remote hosts are unreachable.
    """
    global engine, connection_method, AsyncSessionLocal

    # 1. Try Supabase Transaction Pooler (two regional endpoints)
    for url in POOLER_URLS:
        region = url.split("@")[1].split(".")[1]  # us-east-1 / ap-southeast-1
        label  = f"Supabase Pooler ({region})"
        if await _probe(url, label):
            return

    # 2. Try direct connection
    if await _probe(DIRECT_URL, "Supabase Direct (port 5432)"):
        return

    # 3. Stay on SQLite
    print("⚠️  All remote DB connections failed — using local SQLite.")
    connection_method = "SQLite (Fallback)"


async def _probe(url: str, label: str) -> bool:
    """Try to open a connection and run SELECT 1. Returns True on success."""
    global engine, connection_method, AsyncSessionLocal

    masked = _mask(url)
    print(f"🔗 Probing {label}: {masked}")
    test_engine = create_async_engine(url, pool_pre_ping=True, pool_size=2)
    try:
        async with asyncio.timeout(4.0):
            async with test_engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

        # Success — promote the global engine
        old_engine = engine
        engine = test_engine
        connection_method = label
        AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        print(f"✅ Connected via {label}")
        await old_engine.dispose()
        return True

    except (asyncio.TimeoutError, asyncio.CancelledError):
        print(f"⏱️  {label} timed out.")
    except Exception as e:
        err = str(e)
        if "@" in err:
            err = "…@" + err.split("@")[-1]
        print(f"❌ {label} failed: {err}")

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
