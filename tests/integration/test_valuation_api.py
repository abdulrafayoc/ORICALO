"""
Integration tests for Valuation API.

Tests the fallback path (no ML model loaded) and stats endpoint.
"""

import pytest


@pytest.mark.asyncio
async def test_valuation_predict_fallback(client):
    """When model is not loaded, fallback heuristic should return well-formed response."""
    payload = {
        "city": "Lahore",
        "property_type": "House",
        "bedrooms": 3,
        "baths": 2,
        "area_sqft": 2250.0,
    }
    resp = await client.post("/valuation/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    # Response must contain all required fields
    assert "predicted_price_pkr" in data
    assert "min_price_lakh" in data
    assert "max_price_lakh" in data
    assert "confidence" in data
    assert "is_premium_location" in data
    assert data["currency"] == "PKR"

    # Min < predicted < max
    assert data["min_price_lakh"] < data["max_price_lakh"]
    # Fallback confidence is 0.5
    assert data["confidence"] == 0.5


@pytest.mark.asyncio
async def test_valuation_predict_with_marla(client):
    """Supply area_marla instead of area_sqft."""
    payload = {
        "city": "Lahore",
        "property_type": "House",
        "bedrooms": 3,
        "baths": 2,
        "area_marla": 10.0,
        "neighbourhood": "DHA Phase 6",
    }
    resp = await client.post("/valuation/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_price_pkr"] > 0


@pytest.mark.asyncio
async def test_valuation_predict_no_area(client):
    """Neither area_sqft nor area_marla provided."""
    payload = {
        "city": "Lahore",
        "property_type": "House",
        "bedrooms": 3,
        "baths": 2,
    }
    resp = await client.post("/valuation/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # Fallback uses hardcoded 1 crore when area_sqft = 0
    assert data["predicted_price_pkr"] > 0


@pytest.mark.asyncio
async def test_valuation_predict_missing_required_field(client):
    """Missing city should return 422."""
    payload = {
        "property_type": "House",
        "bedrooms": 3,
        "baths": 2,
    }
    resp = await client.post("/valuation/predict", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_valuation_stats_fallback(client):
    """Stats should return fallback object when model is not loaded."""
    resp = await client.get("/valuation/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_samples" in data or "model_type" in data


@pytest.mark.asyncio
async def test_valuation_predict_response_range_consistency(client):
    """min_price_lakh should be ~90% and max ~110% of predicted (in fallback)."""
    payload = {
        "city": "Lahore",
        "property_type": "House",
        "bedrooms": 3,
        "baths": 2,
        "area_sqft": 2250.0,
    }
    resp = await client.post("/valuation/predict", json=payload)
    data = resp.json()

    predicted_lakh = data["predicted_price_pkr"] / 1e5
    assert abs(data["min_price_lakh"] - predicted_lakh * 0.90) < 1.0
    assert abs(data["max_price_lakh"] - predicted_lakh * 1.10) < 1.0
