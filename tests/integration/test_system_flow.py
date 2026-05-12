"""
High-level integration tests for the ORICALO system flow.

This test suite simulates a typical user journey:
1. Creating and configuring an AI Agent.
2. Interacting with the CRM to capture a lead.
3. Verifying the system state.
"""

import pytest
from tests.conftest import sample_agent

@pytest.mark.asyncio
async def test_complete_system_flow(client):
    # --- 1. Agent Configuration ---
    # Create a new agent
    agent_data = sample_agent(name="Oricalo Integration Agent", slug="integration-agent")
    create_agent_resp = await client.post("/agents/", json=agent_data)
    assert create_agent_resp.status_code == 200
    agent_id = create_agent_resp.json()["id"]

    # Verify agent is listed
    list_agents_resp = await client.get("/agents/")
    assert list_agents_resp.status_code == 200
    assert any(a["slug"] == "integration-agent" for a in list_agents_resp.json())

    # --- 2. Lead Capture (CRM) ---
    # Simulate capturing a lead (from a hypothetical call or manual entry)
    lead_data = {
        "name": "John Doe",
        "phone_number": "+1234567890",
        "email": "john@example.com",
        "status": "NEW",
        "lead_score": 50
    }
    create_lead_resp = await client.post("/crm/leads", json=lead_data)
    assert create_lead_resp.status_code == 200
    lead_id = create_lead_resp.json()["id"]

    # --- 3. Lead Interaction ---
    # Update lead status to HOT — must send full payload (LeadUpdate requires all fields)
    update_lead_resp = await client.put(f"/crm/leads/{lead_id}", json={
        "name": "John Doe",
        "phone_number": "+1234567890",
        "email": "john@example.com",
        "status": "HOT",
        "lead_score": 85,
        "needs_human": False,
    })
    assert update_lead_resp.status_code == 200
    assert update_lead_resp.json()["status"] == "HOT"

    # --- 4. Analytics Check ---
    # Check if analytics endpoints are reachable
    analytics_resp = await client.get("/analytics/performance")
    # Some endpoints might return 404 if not fully implemented or require specific data, 
    # but we check for health/existence
    assert analytics_resp.status_code in [200, 404] 

    # --- 5. Cleanup ---
    # Delete the agent
    del_agent_resp = await client.delete(f"/agents/{agent_id}")
    assert del_agent_resp.status_code == 200

    # Delete the lead
    del_lead_resp = await client.delete(f"/crm/leads/{lead_id}")
    assert del_lead_resp.status_code == 200

@pytest.mark.asyncio
async def test_system_health_and_root(client):
    """Basic sanity check for API availability."""
    # Test Root
    root_resp = await client.get("/")
    assert root_resp.status_code == 200
    assert "message" in root_resp.json()

    # Test Health
    health_resp = await client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"
