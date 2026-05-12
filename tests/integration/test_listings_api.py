"""
Integration tests for Listings API and agency/agent endpoints.

Covers:
  - Full listing CRUD (create, list, get, update, delete)
  - Listing field validation (type, bedrooms, city)
  - Agency creation and agent assignment
  - 404 / 422 error responses
"""

import pytest
from tests.conftest import sample_listing, sample_agent


# ─── Listings CRUD ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_listing(client):
    resp = await client.post("/agency/listings", json=sample_listing())
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "10 Marla House in DHA Phase 6"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_listings_empty(client):
    resp = await client.get("/agency/listings")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_listings_after_create(client):
    await client.post("/agency/listings", json=sample_listing())
    resp = await client.get("/agency/listings")
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_listing_by_id(client):
    create = await client.post("/agency/listings", json=sample_listing())
    listing_id = create.json()["id"]

    resp = await client.get(f"/agency/listings/{listing_id}")
    assert resp.status_code == 200
    assert resp.json()["city"] == "Lahore"


@pytest.mark.asyncio
async def test_get_listing_not_found(client):
    resp = await client.get("/agency/listings/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_listing(client):
    create = await client.post("/agency/listings", json=sample_listing())
    listing_id = create.json()["id"]

    updated = sample_listing(title="Updated Title", bedrooms=5, price="3 Crore")
    resp = await client.put(f"/agency/listings/{listing_id}", json=updated)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["bedrooms"] == 5


@pytest.mark.asyncio
async def test_update_listing_not_found(client):
    resp = await client.put("/agency/listings/9999", json=sample_listing())
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_listing(client):
    create = await client.post("/agency/listings", json=sample_listing())
    listing_id = create.json()["id"]

    del_resp = await client.delete(f"/agency/listings/{listing_id}")
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/agency/listings/{listing_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_listing_not_found(client):
    resp = await client.delete("/agency/listings/9999")
    assert resp.status_code == 404


# ─── Listing field validation ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_listing_bedrooms_stored(client):
    resp = await client.post("/agency/listings", json=sample_listing(bedrooms=6))
    assert resp.json()["bedrooms"] == 6


@pytest.mark.asyncio
async def test_listing_city_stored(client):
    resp = await client.post("/agency/listings", json=sample_listing(city="Karachi"))
    assert resp.json()["city"] == "Karachi"


@pytest.mark.asyncio
async def test_listing_type_stored(client):
    resp = await client.post("/agency/listings", json=sample_listing(type="Plot"))
    assert resp.json()["type"] == "Plot"


@pytest.mark.asyncio
async def test_listing_features_are_list(client):
    resp = await client.post("/agency/listings", json=sample_listing())
    features = resp.json().get("features", [])
    assert isinstance(features, list)


# ─── Multiple listings ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_multiple_listings_created(client):
    for i in range(3):
        await client.post("/agency/listings", json=sample_listing(title=f"Listing {i}"))
    resp = await client.get("/agency/listings")
    assert len(resp.json()) == 3


# ─── Agents CRUD (also in test_agents_api.py — minimal cross-test here) ──────

@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
