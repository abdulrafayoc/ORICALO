"""
Unit tests for Pydantic schemas.

Validates request/response models for agents and listings.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

import pytest
from pydantic import ValidationError
from app.schemas.agent import AgentCreate, AgentRead
from app.schemas.listing import ListingCreate, ListingUpdate, ListingOut


# ═══════════════════════════════════════════════════════════════════════════════
# Agent schemas
# ═══════════════════════════════════════════════════════════════════════════════

class TestAgentSchemas:

    def test_valid_agent_create(self):
        agent = AgentCreate(
            name="Test Agent",
            slug="test-agent",
            system_prompt="You are helpful.",
        )
        assert agent.name == "Test Agent"
        assert agent.is_active is True  # default

    def test_agent_create_all_fields(self):
        agent = AgentCreate(
            name="Full Agent",
            slug="full-agent",
            description="A fully specified agent",
            system_prompt="Be concise.",
            is_active=False,
        )
        assert agent.description == "A fully specified agent"
        assert agent.is_active is False

    def test_agent_create_missing_name_fails(self):
        with pytest.raises(ValidationError):
            AgentCreate(slug="no-name", system_prompt="prompt")

    def test_agent_create_missing_slug_fails(self):
        with pytest.raises(ValidationError):
            AgentCreate(name="No Slug", system_prompt="prompt")

    def test_agent_create_missing_system_prompt_fails(self):
        with pytest.raises(ValidationError):
            AgentCreate(name="No Prompt", slug="no-prompt")

    def test_agent_read_has_id(self):
        agent = AgentRead(
            id=1,
            name="Read Agent",
            slug="read-agent",
            system_prompt="prompt",
        )
        assert agent.id == 1

    def test_agent_read_missing_id_fails(self):
        with pytest.raises(ValidationError):
            AgentRead(name="No ID", slug="no-id", system_prompt="prompt")


# ═══════════════════════════════════════════════════════════════════════════════
# Listing schemas
# ═══════════════════════════════════════════════════════════════════════════════

class TestListingSchemas:

    def test_valid_listing_create_minimal(self):
        listing = ListingCreate(title="Basic Listing")
        assert listing.title == "Basic Listing"
        assert listing.description is None
        assert listing.features is None

    def test_valid_listing_create_full(self):
        listing = ListingCreate(
            title="Luxury Villa",
            description="A beautiful villa",
            price="5 Crore",
            location="DHA Phase 5",
            city="Lahore",
            type="House",
            bedrooms=5,
            baths=4,
            area="20 Marla",
            features=["Pool", "Garden", "Gym"],
            agent_notes="Premium listing",
        )
        assert listing.bedrooms == 5
        assert len(listing.features) == 3

    def test_listing_create_missing_title_fails(self):
        with pytest.raises(ValidationError):
            ListingCreate(description="No title here")

    def test_listing_update_partial(self):
        update = ListingUpdate(title="Updated Title")
        assert update.title == "Updated Title"
        assert update.price is None

    def test_listing_features_as_list(self):
        listing = ListingCreate(
            title="With Features",
            features=["AC", "Heater", "Solar"],
        )
        assert listing.features == ["AC", "Heater", "Solar"]

    def test_listing_features_empty_list(self):
        listing = ListingCreate(title="Empty Features", features=[])
        assert listing.features == []

    def test_invalid_bedroom_type_fails(self):
        with pytest.raises(ValidationError):
            ListingCreate(title="Bad", bedrooms="five")

    def test_listing_out_requires_id(self):
        from datetime import datetime
        listing = ListingOut(
            id=1,
            title="Output Listing",
            created_at=datetime.now(),
        )
        assert listing.id == 1

    def test_listing_out_missing_id_fails(self):
        from datetime import datetime
        with pytest.raises(ValidationError):
            ListingOut(title="No ID", created_at=datetime.now())
