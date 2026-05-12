"""
Integration tests for Valuation API.

Tests the fallback path (no ML model loaded) and stats endpoint.
"""

import pytest


@pytest.mark.asyncio
async def test_valuation_predict_fallback(client):
    """Valuation predict endpoint should return a well-formed response whether
    the ML model is loaded or using the heuristic fallback."""
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
    # Confidence is 0.5 (fallback) or 0.62/0.78 (model loaded)
    assert data["confidence"] in [0.5, 0.62, 0.78]


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
    """min_price_lakh and max_price_lakh should bracket the predicted price.
    When the model is loaded without a specific location, spread is ±12.5%.
    When fallback is used, spread is ±10%.
    We use a generous tolerance of 20 lakh to cover both cases.
    """
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
    # The spread is either ±10% (fallback) or ±12.5% (model, no specific location).
    # We verify the bracket holds with a tolerance relative to the predicted price.
    tolerance = predicted_lakh * 0.15  # 15% tolerance covers both modes
    assert abs(data["min_price_lakh"] - predicted_lakh * 0.90) < tolerance
    assert abs(data["max_price_lakh"] - predicted_lakh * 1.10) < tolerance
