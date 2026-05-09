"""
Integration tests for Agents CRUD API.

Full lifecycle: create → list → get → update → delete → confirm gone.
"""

import pytest
from tests.conftest import sample_agent


@pytest.mark.asyncio
async def test_create_agent(client):
    resp = await client.post("/agents/", json=sample_agent())
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Agent"
    assert data["slug"] == "test-agent"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_agents_empty(client):
    resp = await client.get("/agents/")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_agents_after_create(client):
    await client.post("/agents/", json=sample_agent())
    resp = await client.get("/agents/")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 1
    assert agents[0]["slug"] == "test-agent"


@pytest.mark.asyncio
async def test_get_agent_by_id(client):
    create_resp = await client.post("/agents/", json=sample_agent())
    agent_id = create_resp.json()["id"]

    resp = await client.get(f"/agents/{agent_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Agent"


@pytest.mark.asyncio
async def test_get_agent_not_found(client):
    resp = await client.get("/agents/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_agent(client):
    create_resp = await client.post("/agents/", json=sample_agent())
    agent_id = create_resp.json()["id"]

    updated = sample_agent(name="Updated Agent", slug="updated-agent")
    resp = await client.put(f"/agents/{agent_id}", json=updated)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Agent"
    assert resp.json()["slug"] == "updated-agent"


@pytest.mark.asyncio
async def test_update_agent_not_found(client):
    resp = await client.put("/agents/9999", json=sample_agent())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_agent(client):
    create_resp = await client.post("/agents/", json=sample_agent())
    agent_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/agents/{agent_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["ok"] is True

    # Confirm gone
    get_resp = await client.get(f"/agents/{agent_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_agent_not_found(client):
    resp = await client.delete("/agents/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_full_agent_lifecycle(client):
    """Create → list → get → update → delete → confirm missing."""
    # Create
    create_resp = await client.post("/agents/", json=sample_agent(slug="lifecycle-agent"))
    assert create_resp.status_code == 200
    agent_id = create_resp.json()["id"]

    # List
    list_resp = await client.get("/agents/")
    assert any(a["id"] == agent_id for a in list_resp.json())

    # Get
    get_resp = await client.get(f"/agents/{agent_id}")
    assert get_resp.json()["slug"] == "lifecycle-agent"

    # Update
    upd = sample_agent(name="Lifecycle Updated", slug="lifecycle-updated")
    upd_resp = await client.put(f"/agents/{agent_id}", json=upd)
    assert upd_resp.json()["name"] == "Lifecycle Updated"

    # Delete
    del_resp = await client.delete(f"/agents/{agent_id}")
    assert del_resp.status_code == 200

    # Confirm missing
    missing_resp = await client.get(f"/agents/{agent_id}")
    assert missing_resp.status_code == 404
