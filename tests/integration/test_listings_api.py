"""
Integration tests for Listings CRUD API.

Full lifecycle: create → list → get → update → delete → confirm gone.
"""

import pytest
from tests.conftest import sample_listing


@pytest.mark.asyncio
async def test_create_listing(client):
    resp = await client.post("/agency/listings", json=sample_listing())
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "10 Marla House in DHA Phase 6"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_listing_minimal(client):
    """Only required field is title."""
    resp = await client.post("/agency/listings", json={"title": "Bare Listing"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Bare Listing"
    assert resp.json()["description"] is None


@pytest.mark.asyncio
async def test_create_listing_with_features(client):
    listing = sample_listing(features=["Pool", "Garden", "Gym", "Solar Panels"])
    resp = await client.post("/agency/listings", json=listing)
    assert resp.status_code == 200
    assert resp.json()["features"] == ["Pool", "Garden", "Gym", "Solar Panels"]


@pytest.mark.asyncio
async def test_list_listings_empty(client):
    resp = await client.get("/agency/listings")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_listings_after_create(client):
    await client.post("/agency/listings", json=sample_listing())
    resp = await client.get("/agency/listings")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_listing_by_id(client):
    create_resp = await client.post("/agency/listings", json=sample_listing())
    lid = create_resp.json()["id"]

    resp = await client.get(f"/agency/listings/{lid}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "10 Marla House in DHA Phase 6"


@pytest.mark.asyncio
async def test_get_listing_not_found(client):
    resp = await client.get("/agency/listings/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_listing(client):
    create_resp = await client.post("/agency/listings", json=sample_listing())
    lid = create_resp.json()["id"]

    update_payload = {"title": "Updated House", "price": "3 Crore"}
    resp = await client.put(f"/agency/listings/{lid}", json=update_payload)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated House"
    assert resp.json()["price"] == "3 Crore"


@pytest.mark.asyncio
async def test_update_listing_not_found(client):
    resp = await client.put("/agency/listings/9999", json={"title": "Ghost"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_listing(client):
    create_resp = await client.post("/agency/listings", json=sample_listing())
    lid = create_resp.json()["id"]

    del_resp = await client.delete(f"/agency/listings/{lid}")
    assert del_resp.status_code == 200

    # Confirm gone
    get_resp = await client.get(f"/agency/listings/{lid}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_listing_not_found(client):
    resp = await client.delete("/agency/listings/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_listing_large_description(client):
    """Listing with a very large description."""
    big_desc = "This is a detailed description. " * 200
    listing = sample_listing(description=big_desc)
    resp = await client.post("/agency/listings", json=listing)
    assert resp.status_code == 200
    assert len(resp.json()["description"]) > 1000


@pytest.mark.asyncio
async def test_full_listing_lifecycle(client):
    """Create → list → get → update → delete → confirm missing."""
    # Create
    create_resp = await client.post("/agency/listings", json=sample_listing())
    lid = create_resp.json()["id"]
    assert create_resp.status_code == 200

    # List
    list_resp = await client.get("/agency/listings")
    assert any(l["id"] == lid for l in list_resp.json())

    # Get
    get_resp = await client.get(f"/agency/listings/{lid}")
    assert get_resp.json()["id"] == lid

    # Update
    upd_resp = await client.put(f"/agency/listings/{lid}", json={"title": "Updated"})
    assert upd_resp.json()["title"] == "Updated"

    # Delete
    del_resp = await client.delete(f"/agency/listings/{lid}")
    assert del_resp.status_code == 200

    # Confirm missing
    missing_resp = await client.get(f"/agency/listings/{lid}")
    assert missing_resp.status_code == 404
