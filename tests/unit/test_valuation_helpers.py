"""
Unit tests for valuation helper functions.

Tests marla-to-sqft conversion with premium/non-premium location factors.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

# model_utils must be importable
MODELS_DIR = Path(__file__).resolve().parents[2] / "backend" / "models"
if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

from app.api.endpoints.valuation import _marla_to_sqft, ValuationRequest, ValuationResponse


class TestMarlaToSqft:
    """_marla_to_sqft uses 225 for premium, 272.25 for non-premium."""

    # Premium locations (factor = 225)
    def test_dha_uses_premium_factor(self):
        assert _marla_to_sqft(10, "DHA Phase 6") == 2250.0

    def test_defence_uses_premium_factor(self):
        assert _marla_to_sqft(10, "Defence Housing Authority") == 2250.0

    def test_bahria_uses_premium_factor(self):
        assert _marla_to_sqft(10, "Bahria Town") == 2250.0

    def test_cantt_uses_premium_factor(self):
        assert _marla_to_sqft(5, "Lahore Cantt") == 1125.0

    def test_clifton_uses_premium_factor(self):
        assert _marla_to_sqft(10, "Clifton Block 5") == 2250.0

    def test_gulberg_uses_premium_factor(self):
        assert _marla_to_sqft(10, "Gulberg III") == 2250.0

    # Non-premium locations (factor = 272.25)
    def test_johar_town_uses_standard_factor(self):
        assert _marla_to_sqft(10, "Johar Town") == 2722.5

    def test_model_town_uses_standard_factor(self):
        assert _marla_to_sqft(10, "Model Town") == 2722.5

    def test_generic_location_uses_standard_factor(self):
        assert _marla_to_sqft(10, "Some Random Area") == 2722.5

    def test_empty_location_uses_standard_factor(self):
        assert _marla_to_sqft(10, "") == 2722.5

    # Edge cases
    def test_zero_marla(self):
        assert _marla_to_sqft(0, "DHA") == 0.0

    def test_fractional_marla(self):
        result = _marla_to_sqft(5.5, "DHA")
        assert result == 5.5 * 225.0

    def test_case_insensitive(self):
        # Function lowercases internally
        assert _marla_to_sqft(10, "dha phase 6") == 2250.0
        assert _marla_to_sqft(10, "DHA PHASE 6") == 2250.0

    def test_area_sqft_directly_supplied(self):
        """When area_sqft is supplied to ValuationRequest, marla conversion is skipped."""
        req = ValuationRequest(
            city="Lahore",
            property_type="House",
            bedrooms=3,
            baths=2,
            area_sqft=1500.0,
        )
        assert req.area_sqft == 1500.0


class TestValuationSchemas:
    """Validate request/response Pydantic models."""

    def test_valid_request_minimal(self):
        req = ValuationRequest(
            city="Lahore", property_type="House", bedrooms=3, baths=2
        )
        assert req.area_sqft is None
        assert req.area_marla is None

    def test_valid_request_with_marla(self):
        req = ValuationRequest(
            city="Lahore", property_type="House", bedrooms=3, baths=2,
            area_marla=10.0, neighbourhood="DHA Phase 6"
        )
        assert req.area_marla == 10.0

    def test_response_has_all_fields(self):
        resp = ValuationResponse(
            predicted_price_pkr=10000000.0,
            min_price_lakh=90.0,
            max_price_lakh=110.0,
            confidence=0.78,
            is_premium_location=True,
        )
        assert resp.currency == "PKR"
        assert resp.predicted_price_pkr == 10000000.0
        assert resp.min_price_lakh == 90.0
        assert resp.max_price_lakh == 110.0
        assert resp.confidence == 0.78
        assert resp.is_premium_location is True
