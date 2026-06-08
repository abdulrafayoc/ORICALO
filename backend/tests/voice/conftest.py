"""Shared fixtures for voice-package tests. In-memory SQLite, no external services."""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.base import Base
from app.db_tables.organization import Organization
from app.db_tables.user import User
from app.db_tables.agent import Agent
from app.db_tables.crm import Lead, Meeting
from app.db_tables.listing import Listing


@pytest_asyncio.fixture
async def fake_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        # Minimal seed: one org, one agent, one lead, one listing
        org = Organization(name="TestOrg", slug="testorg")
        session.add(org)
        await session.flush()

        agent = Agent(
            name="Aisha",
            slug="aisha",
            system_prompt="You are Aisha, a real estate assistant.",
            organization_id=org.id,
        )
        session.add(agent)
        await session.flush()

        lead = Lead(
            name="Test Buyer",
            phone_number="+923001234567",
            status="NEW",
            organization_id=org.id,
            lead_score=0,
        )
        session.add(lead)
        await session.flush()

        listing = Listing(
            title="5 marla house DHA Phase 5",
            location="Lahore, DHA Phase 5",
            price="2.5 crore",
            organization_id=org.id,
        )
        session.add(listing)
        await session.commit()

        yield {
            "db": session,
            "org_id": org.id,
            "agent_id": agent.id,
            "lead_id": lead.id,
            "listing_id": listing.id,
        }

    await engine.dispose()
