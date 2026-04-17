"""
Unit tests for dialogue helper functions.

Tests intent detection, location extraction, and price estimation fallback.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

MODELS_DIR = Path(__file__).resolve().parents[2] / "backend" / "models"
if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

from app.api.endpoints.dialogue import _detect_intent, _extract_location, _get_price_estimate


# ═══════════════════════════════════════════════════════════════════════════════
# _detect_intent
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectIntent:
    """Intent detection from user transcript."""

    # Search intent
    def test_search_ghar(self):
        result = _detect_intent("mujhe dha mein ghar chahiye")
        assert result["wants_search"] is True

    def test_search_show(self):
        result = _detect_intent("show me properties")
        assert result["wants_search"] is True

    def test_search_dikhao(self):
        result = _detect_intent("lahore mein plot dikhao")
        assert result["wants_search"] is True

    def test_search_flat(self):
        result = _detect_intent("I need a flat in Bahria")
        assert result["wants_search"] is True

    def test_search_listing(self):
        result = _detect_intent("show me listing")
        assert result["wants_search"] is True

    # Price intent
    def test_price_kitni(self):
        result = _detect_intent("10 marla ki price kya hai")
        assert result["wants_price"] is True

    def test_price_cost(self):
        result = _detect_intent("what is the cost of a house")
        assert result["wants_price"] is True

    def test_price_qeemat(self):
        result = _detect_intent("is ghar ki qeemat batao")
        assert result["wants_price"] is True

    def test_price_value(self):
        result = _detect_intent("What's the value of this property?")
        assert result["wants_price"] is True

    def test_price_worth(self):
        result = _detect_intent("How much is it worth?")
        assert result["wants_price"] is True

    # Location intent
    def test_location_dha(self):
        result = _detect_intent("mujhe dha mein ghar chahiye")
        assert result["has_location"] is True

    def test_location_bahria(self):
        result = _detect_intent("bahria town mein plot")
        assert result["has_location"] is True

    def test_location_gulberg(self):
        result = _detect_intent("gulberg mein flat")
        assert result["has_location"] is True

    def test_location_model_town(self):
        result = _detect_intent("model town mein listing dikhao")
        assert result["has_location"] is True

    def test_location_f_sector(self):
        result = _detect_intent("f-6 islamabad mein")
        assert result["has_location"] is True

    # Combined
    def test_search_and_location(self):
        result = _detect_intent("lahore mein plot dikhao dha mein")
        assert result["wants_search"] is True
        assert result["has_location"] is True

    def test_price_and_location(self):
        result = _detect_intent("dha phase 6 ki price kya hai")
        assert result["wants_price"] is True
        assert result["has_location"] is True

    # Negative cases
    def test_greeting_no_intent(self):
        result = _detect_intent("hello")
        assert result["wants_price"] is False
        assert result["wants_search"] is False
        assert result["has_location"] is False

    def test_generic_question(self):
        result = _detect_intent("aap kaise hain")
        assert result["wants_price"] is False
        assert result["wants_search"] is False

    def test_empty_string(self):
        result = _detect_intent("")
        assert result["wants_price"] is False
        assert result["wants_search"] is False
        assert result["has_location"] is False


# ═══════════════════════════════════════════════════════════════════════════════
# _extract_location
# ═══════════════════════════════════════════════════════════════════════════════

class TestExtractLocation:
    """Location extraction from user transcript."""

    def test_dha_phase_6(self):
        result = _extract_location("mujhe dha phase 6 mein ghar chahiye")
        assert result == "Dha Phase 6"

    def test_bahria_town(self):
        result = _extract_location("bahria town mein plot")
        assert result == "Bahria Town"

    def test_johar_town(self):
        result = _extract_location("johar town mein flat")
        assert result == "Johar Town"

    def test_gulberg(self):
        result = _extract_location("gulberg mein kuch dikhao")
        assert result == "Gulberg"

    def test_model_town(self):
        result = _extract_location("model town is nice")
        assert result == "Model Town"

    def test_lahore(self):
        result = _extract_location("lahore mein kuch dikhao")
        assert result == "Lahore"

    def test_karachi(self):
        result = _extract_location("karachi mein ghar")
        assert result == "Karachi"

    def test_islamabad(self):
        result = _extract_location("islamabad mein plot chahiye")
        assert result == "Islamabad"

    def test_no_location(self):
        result = _extract_location("hello how are you")
        assert result is None

    def test_empty_string(self):
        result = _extract_location("")
        assert result is None

    def test_specific_phase_over_generic_dha(self):
        """More specific DHA phase should match before generic 'dha'."""
        result = _extract_location("dha phase 5 mein house")
        assert result == "Dha Phase 5"

    def test_case_insensitive(self):
        result = _extract_location("DHA Phase 6 mein")
        assert result is not None


# ═══════════════════════════════════════════════════════════════════════════════
# _get_price_estimate (fallback path — no ML model)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetPriceEstimateFallback:
    """Price estimation fallback heuristic (no ML model available)."""

    def test_dha_base_price(self):
        result = _get_price_estimate("DHA Phase 6", area_marla=10)
        assert result["currency"] == "PKR"
        # DHA base = 350 lakh/marla → 350 * 10 = 3500 lakh
        assert result["min_price"] == int(3500 * 0.9 * 100000)
        assert result["max_price"] == int(3500 * 1.1 * 100000)

    def test_bahria_base_price(self):
        result = _get_price_estimate("Bahria Town", area_marla=10)
        # Bahria base = 180 lakh/marla → 180 * 10 = 1800 lakh
        assert result["min_price"] == int(1800 * 0.9 * 100000)
        assert result["max_price"] == int(1800 * 1.1 * 100000)

    def test_johar_base_price(self):
        result = _get_price_estimate("Johar Town", area_marla=10)
        assert result["min_price"] == int(1200 * 0.9 * 100000)
        assert result["max_price"] == int(1200 * 1.1 * 100000)

    def test_unknown_location_default(self):
        result = _get_price_estimate("Random Place", area_marla=10)
        # Default base = 100 lakh/marla
        assert result["min_price"] == int(1000 * 0.9 * 100000)
        assert result["max_price"] == int(1000 * 1.1 * 100000)

    def test_confidence_is_fallback(self):
        result = _get_price_estimate("DHA", area_marla=10)
        assert result["confidence"] == 0.75

    def test_different_area(self):
        result = _get_price_estimate("DHA", area_marla=5)
        # 350 * 5 = 1750 lakh
        assert result["min_price"] == int(1750 * 0.9 * 100000)
        assert result["max_price"] == int(1750 * 1.1 * 100000)

    def test_result_has_required_keys(self):
        result = _get_price_estimate("Lahore")
        assert "min_price" in result
        assert "max_price" in result
        assert "confidence" in result
        assert "currency" in result
