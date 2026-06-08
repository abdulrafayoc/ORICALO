import pytest
import datetime
from app.api.endpoints.crm_local import update_lead_for_org
from app.api.endpoints.calendar import book_meeting_for_org


@pytest.mark.asyncio
async def test_update_lead_for_org_updates_specified_fields(fake_db):
    db = fake_db["db"]
    org_id = fake_db["org_id"]
    lead_id = fake_db["lead_id"]

    updated = await update_lead_for_org(
        lead_id=lead_id,
        payload={"budget": "1 crore", "timeline": "next month", "lead_score": 65},
        organization_id=org_id,
        db=db,
    )

    assert updated.budget == "1 crore"
    assert updated.timeline == "next month"
    assert updated.lead_score == 65
    # Untouched fields stay
    assert updated.name == "Test Buyer"


@pytest.mark.asyncio
async def test_update_lead_for_org_rejects_cross_org(fake_db):
    db = fake_db["db"]
    lead_id = fake_db["lead_id"]

    with pytest.raises(LookupError):
        await update_lead_for_org(
            lead_id=lead_id,
            payload={"budget": "1 crore"},
            organization_id=99999,  # not the lead's org
            db=db,
        )


@pytest.mark.asyncio
async def test_book_meeting_for_org_creates_meeting(fake_db):
    db = fake_db["db"]
    org_id = fake_db["org_id"]
    lead_id = fake_db["lead_id"]
    agent_id = fake_db["agent_id"]

    meeting = await book_meeting_for_org(
        lead_id=lead_id,
        agent_id=agent_id,
        meeting_type="VISIT",
        scheduled_date="2026-06-15",
        scheduled_time="14:00",
        notes="Booked via voice agent test",
        organization_id=org_id,
        db=db,
    )

    assert meeting.id is not None
    assert meeting.meeting_type == "VISIT"
    # scheduled_date may come back as a date or datetime depending on dialect;
    # normalise before comparing (SQLite returns date, Postgres returns datetime).
    stored = meeting.scheduled_date
    if hasattr(stored, "date"):
        stored = stored.date()
    assert stored == datetime.date(2026, 6, 15)
    # scheduled_time is a String column storing "HH:MM"
    assert meeting.scheduled_time == "14:00"
    assert meeting.lead_id == lead_id
    # title must be auto-populated by the helper (Fix 2)
    assert meeting.title == "VISIT - Test Buyer"


@pytest.mark.asyncio
async def test_book_meeting_rejects_invalid_date(fake_db):
    db = fake_db["db"]
    org_id = fake_db["org_id"]
    lead_id = fake_db["lead_id"]
    agent_id = fake_db["agent_id"]

    with pytest.raises(ValueError):
        await book_meeting_for_org(
            lead_id=lead_id,
            agent_id=agent_id,
            meeting_type="VISIT",
            scheduled_date="not-a-date",
            scheduled_time="14:00",
            notes=None,
            organization_id=org_id,
            db=db,
        )


@pytest.mark.asyncio
async def test_book_meeting_for_org_rejects_cross_org(fake_db):
    db = fake_db["db"]; lead_id = fake_db["lead_id"]; agent_id = fake_db["agent_id"]

    with pytest.raises(LookupError):
        await book_meeting_for_org(
            lead_id=lead_id,
            agent_id=agent_id,
            meeting_type="VISIT",
            scheduled_date="2026-06-15",
            scheduled_time="14:00",
            notes=None,
            organization_id=99999,  # wrong org
            db=db,
        )
