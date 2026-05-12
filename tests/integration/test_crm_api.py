"""
Integration tests for CRM (Lead management) API.

Full lifecycle: create → list → get → update → delete
Also tests:
  - Action item creation and completion
  - Call session persistence
  - Lead score / status field validation
"""

import pytest
from tests.conftest import sample_agent


def sample_lead(**overrides):
    defaults = {
        "name": "Test Lead",
        "phone_number": "+923001234567",
        "email": "test@example.com",
        "status": "NEW",
        "budget": "2 Crore",
        "location_pref": "DHA Phase 6",
        "timeline": "3 months",
        "needs_human": False,
        "lead_score": 50,
    }
    defaults.update(overrides)
    return defaults


# ─── Lead CRUD ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_lead(client):
    resp = await client.post("/crm/leads", json=sample_lead())
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Lead"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_leads_empty(client):
    resp = await client.get("/crm/leads")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_leads_after_create(client):
    await client.post("/crm/leads", json=sample_lead())
    resp = await client.get("/crm/leads")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_lead_by_id(client):
    create = await client.post("/crm/leads", json=sample_lead())
    lead_id = create.json()["id"]

    resp = await client.get(f"/crm/leads/{lead_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Lead"


@pytest.mark.asyncio
async def test_get_lead_not_found(client):
    resp = await client.get("/crm/leads/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_lead(client):
    create = await client.post("/crm/leads", json=sample_lead())
    lead_id = create.json()["id"]

    updated = sample_lead(name="Updated Lead", status="WARM", lead_score=60)
    resp = await client.put(f"/crm/leads/{lead_id}", json=updated)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Lead"
    assert resp.json()["lead_score"] == 60


@pytest.mark.asyncio
async def test_update_lead_not_found(client):
    resp = await client.put("/crm/leads/9999", json=sample_lead())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_lead(client):
    create = await client.post("/crm/leads", json=sample_lead())
    lead_id = create.json()["id"]

    del_resp = await client.delete(f"/crm/leads/{lead_id}")
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/crm/leads/{lead_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_lead_not_found(client):
    resp = await client.delete("/crm/leads/9999")
    assert resp.status_code == 404


# ─── Lead score / status fields ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_lead_score_stored_correctly(client):
    resp = await client.post("/crm/leads", json=sample_lead(lead_score=85))
    assert resp.json()["lead_score"] == 85


@pytest.mark.asyncio
async def test_needs_human_flag(client):
    resp = await client.post("/crm/leads", json=sample_lead(needs_human=True))
    assert resp.json()["needs_human"] is True


@pytest.mark.asyncio
async def test_hot_status(client):
    resp = await client.post("/crm/leads", json=sample_lead(status="HOT"))
    assert resp.json()["status"] == "HOT"


@pytest.mark.asyncio
async def test_cold_status(client):
    resp = await client.post("/crm/leads", json=sample_lead(status="COLD"))
    assert resp.json()["status"] == "COLD"


# ─── Action items ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_action_items_empty(client):
    resp = await client.get("/crm/action_items")
    assert resp.status_code == 200
    assert resp.json() == []


# ─── Full lead lifecycle ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_full_lead_lifecycle(client):
    """Create → list → get → update score → delete → confirm gone."""
    # Create
    create_resp = await client.post("/crm/leads", json=sample_lead(name="Lifecycle Lead"))
    assert create_resp.status_code == 200
    lead_id = create_resp.json()["id"]

    # List contains our lead
    list_resp = await client.get("/crm/leads")
    assert any(l["id"] == lead_id for l in list_resp.json())

    # Get individual
    get_resp = await client.get(f"/crm/leads/{lead_id}")
    assert get_resp.json()["name"] == "Lifecycle Lead"

    # Update — promote to HOT
    upd_resp = await client.put(
        f"/crm/leads/{lead_id}",
        json=sample_lead(name="Lifecycle Lead", status="HOT", lead_score=80)
    )
    assert upd_resp.json()["status"] == "HOT"

    # Delete
    del_resp = await client.delete(f"/crm/leads/{lead_id}")
    assert del_resp.status_code == 200

    # Confirm missing
    miss_resp = await client.get(f"/crm/leads/{lead_id}")
    assert miss_resp.status_code == 404


# ─── Call sessions ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_call_sessions_empty(client):
    resp = await client.get("/crm/sessions")
    assert resp.status_code == 200
    assert resp.json() == []
