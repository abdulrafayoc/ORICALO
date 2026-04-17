"""
Shared test fixtures for ORICALO backend tests.

Provides:
- In-memory SQLite async engine + tables
- FastAPI TestClient with DB dependency override
- Reusable sample data factories
"""

import sys
import os
from pathlib import Path

# Ensure backend is on the path so `app.*` imports resolve
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Also add models dir for model_utils
MODELS_DIR = BACKEND_DIR / "models"
if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient, ASGITransport

from app.db.base import Base
from app.db.session import get_db

# Import all models so Base.metadata knows about them
import app.db_tables.agent  # noqa
import app.db_tables.listing  # noqa


# ── In-memory SQLite engine for tests ────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite://"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def client():
    """Async HTTPX test client against the FastAPI app with test DB."""
    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Sample data factories ────────────────────────────────────────────────────

def sample_agent(**overrides):
    defaults = {
        "name": "Test Agent",
        "slug": "test-agent",
        "description": "A test agent",
        "system_prompt": "You are a helpful assistant.",
        "is_active": True,
    }
    defaults.update(overrides)
    return defaults


def sample_listing(**overrides):
    defaults = {
        "title": "10 Marla House in DHA Phase 6",
        "description": "Beautiful house with garden",
        "price": "2.5 Crore",
        "location": "DHA Phase 6",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 4,
        "baths": 3,
        "area": "10 Marla",
        "features": ["Garden", "Garage", "Security"],
        "agent_notes": "Hot property",
    }
    defaults.update(overrides)
    return defaults
