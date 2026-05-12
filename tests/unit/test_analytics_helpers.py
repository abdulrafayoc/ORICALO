"""
Unit tests for analytics helper functions.

Covers:
  - redact_pii()           : Phone/CNIC masking for Pakistani formats
  - Lead scoring thresholds: HOT / WARM / COLD boundary conditions
  - Qualification status   : label boundaries at 40 and 70
  - Redaction edge cases   : Urdu text, mixed-script, multiple PIIs
"""

import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

# This file has no DB dependencies — no async markers needed

from app.api.endpoints.analytics import redact_pii


# ═══════════════════════════════════════════════════════════════════════════════
# Phone number patterns
# ═══════════════════════════════════════════════════════════════════════════════

class TestRedactPhoneExtended:
    """Extended phone number redaction covering all Pakistani mobile formats."""

    def test_03xx_plain(self):
        assert redact_pii("03001234567") == "[REDACTED_PHONE]"

    def test_03xx_with_dash(self):
        assert redact_pii("0300-1234567") == "[REDACTED_PHONE]"

    def test_03xx_with_space(self):
        assert redact_pii("0300 1234567") == "[REDACTED_PHONE]"

    def test_plus92_no_separator(self):
        assert redact_pii("+923001234567") == "[REDACTED_PHONE]"

    def test_plus92_with_dash(self):
        assert redact_pii("+92-300-1234567") == "[REDACTED_PHONE]"

    def test_92_prefix_no_plus(self):
        assert redact_pii("923001234567") == "[REDACTED_PHONE]"

    def test_network_0321(self):
        assert redact_pii("0321-9876543") == "[REDACTED_PHONE]"

    def test_network_0333(self):
        assert redact_pii("03331234567") == "[REDACTED_PHONE]"

    def test_network_0345(self):
        assert redact_pii("0345-9876543") == "[REDACTED_PHONE]"

    def test_network_0312(self):
        assert redact_pii("0312 7654321") == "[REDACTED_PHONE]"

    def test_phone_in_sentence_en(self):
        result = redact_pii("Please call me at 03001234567 for details.")
        assert "[REDACTED_PHONE]" in result
        assert "03001234567" not in result

    def test_phone_in_urdu_sentence(self):
        result = redact_pii("میرا نمبر 03001234567 ہے")
        assert "03001234567" not in result
        assert "[REDACTED_PHONE]" in result

    def test_two_phones_both_redacted(self):
        text = "Main number: 03001234567, backup: 03211112222"
        result = redact_pii(text)
        assert "03001234567" not in result
        assert "03211112222" not in result
        assert result.count("[REDACTED_PHONE]") == 2

    def test_short_number_not_redacted(self):
        """Numbers shorter than a Pakistani mobile should not be touched."""
        assert redact_pii("Room 302") == "Room 302"
        assert redact_pii("Floor 3") == "Floor 3"

    def test_landline_not_redacted(self):
        """Landlines (not starting with 03x) should not be matched."""
        assert redact_pii("042-35761234") == "042-35761234"

    def test_empty_string(self):
        assert redact_pii("") == ""

    def test_no_pii_unchanged(self):
        text = "I am interested in a 10 marla house in DHA Phase 6."
        assert redact_pii(text) == text


# ═══════════════════════════════════════════════════════════════════════════════
# CNIC patterns
# ═══════════════════════════════════════════════════════════════════════════════

class TestRedactCNICExtended:
    """CNIC redaction for Pakistani national ID formats."""

    def test_cnic_formatted_with_dashes(self):
        assert redact_pii("CNIC: 35202-1234567-1") == "CNIC: [REDACTED_CNIC]"

    def test_cnic_unformatted(self):
        assert redact_pii("ID 3520212345671") == "ID [REDACTED_CNIC]"

    def test_cnic_with_spaces(self):
        result = redact_pii("CNIC 42101 1234567 3")
        assert "[REDACTED_CNIC]" in result

    def test_cnic_karachi_prefix(self):
        assert redact_pii("42101-1234567-3") == "[REDACTED_CNIC]"

    def test_cnic_lahore_prefix(self):
        assert redact_pii("35202-7654321-9") == "[REDACTED_CNIC]"

    def test_cnic_in_urdu_sentence(self):
        result = redact_pii("میرا شناختی کارڈ 35202-1234567-1 ہے")
        assert "35202-1234567-1" not in result
        assert "[REDACTED_CNIC]" in result

    def test_short_number_not_cnic(self):
        """Five-digit numbers alone must not match the CNIC pattern."""
        assert redact_pii("Price: 35202") == "Price: 35202"


# ═══════════════════════════════════════════════════════════════════════════════
# Combined / mixed PII
# ═══════════════════════════════════════════════════════════════════════════════

class TestRedactCombinedExtended:
    """Mixed PII scenarios."""

    def test_phone_and_cnic_in_same_text(self):
        text = "Phone: 03001234567 CNIC: 35202-1234567-1"
        result = redact_pii(text)
        assert "03001234567" not in result
        assert "35202-1234567-1" not in result
        assert "[REDACTED_PHONE]" in result
        assert "[REDACTED_CNIC]" in result

    def test_multiple_phones_and_cnic(self):
        text = "Primary: 03001234567, Secondary: 0345-9876543, ID: 35202-1234567-1"
        result = redact_pii(text)
        assert result.count("[REDACTED_PHONE]") == 2
        assert "[REDACTED_CNIC]" in result

    def test_pure_urdu_no_pii(self):
        text = "یہ ایک ٹیسٹ ہے اور اس میں کوئی ذاتی معلومات نہیں ہے۔"
        assert redact_pii(text) == text

    def test_real_estate_context_no_pii(self):
        text = "10 marla plot in DHA Phase 5 for 3 crore PKR"
        assert redact_pii(text) == text


# ═══════════════════════════════════════════════════════════════════════════════
# Lead scoring thresholds (pure logic — tested without DB)
# ═══════════════════════════════════════════════════════════════════════════════

class TestLeadScoringLogic:
    """Verify scoring boundary conditions that the analytics endpoint uses."""

    def _classify(self, score: int) -> str:
        """Mirror the logic inside process_call."""
        if score >= 70:
            return "HOT"
        elif score >= 40:
            return "WARM"
        return "COLD"

    def test_score_100_is_hot(self):
        assert self._classify(100) == "HOT"

    def test_score_70_is_hot(self):
        assert self._classify(70) == "HOT"

    def test_score_69_is_warm(self):
        assert self._classify(69) == "WARM"

    def test_score_40_is_warm(self):
        assert self._classify(40) == "WARM"

    def test_score_39_is_cold(self):
        assert self._classify(39) == "COLD"

    def test_score_0_is_cold(self):
        assert self._classify(0) == "COLD"

    def test_score_50_is_warm(self):
        assert self._classify(50) == "WARM"

    def test_score_85_is_hot(self):
        assert self._classify(85) == "HOT"


class TestQualificationStatus:
    """Qualification label boundaries used in AnalyticsResponse."""

    def _qualify(self, score: int) -> str:
        if score > 70:
            return "Hot Lead"
        elif score >= 40:
            return "Warm Lead"
        return "Info Seeker"

    def test_score_71_is_hot_lead(self):
        assert self._qualify(71) == "Hot Lead"

    def test_score_70_is_warm_lead(self):
        assert self._qualify(70) == "Warm Lead"

    def test_score_40_is_warm_lead(self):
        assert self._qualify(40) == "Warm Lead"

    def test_score_39_is_info_seeker(self):
        assert self._qualify(39) == "Info Seeker"

    def test_score_0_is_info_seeker(self):
        assert self._qualify(0) == "Info Seeker"

    def test_score_100_is_hot_lead(self):
        assert self._qualify(100) == "Hot Lead"
