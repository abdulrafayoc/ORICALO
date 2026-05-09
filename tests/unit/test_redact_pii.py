"""
Unit tests for PII redaction in analytics module.

Tests phone number and CNIC masking for Pakistani formats.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.api.endpoints.analytics import redact_pii


class TestRedactPhone:
    """Pakistani phone number redaction."""

    def test_plain_phone_03xx(self):
        assert redact_pii("Call me at 03001234567") == "Call me at [REDACTED_PHONE]"

    def test_phone_with_dash(self):
        assert redact_pii("Number: 0300-1234567") == "Number: [REDACTED_PHONE]"

    def test_phone_with_plus92(self):
        assert redact_pii("Reach me at +923001234567") == "Reach me at [REDACTED_PHONE]"

    def test_phone_92_prefix(self):
        assert redact_pii("Phone: 923001234567") == "Phone: [REDACTED_PHONE]"

    def test_phone_0321(self):
        assert redact_pii("03211234567") == "[REDACTED_PHONE]"

    def test_phone_0345(self):
        assert redact_pii("0345-9876543") == "[REDACTED_PHONE]"

    def test_multiple_phones(self):
        text = "Call 03001234567 or 03211112222"
        result = redact_pii(text)
        assert "[REDACTED_PHONE]" in result
        assert "03001234567" not in result
        assert "03211112222" not in result


class TestRedactCNIC:
    """Pakistani CNIC redaction."""

    def test_cnic_with_dashes(self):
        assert redact_pii("CNIC: 35202-1234567-1") == "CNIC: [REDACTED_CNIC]"

    def test_cnic_without_dashes(self):
        assert redact_pii("ID 3520212345671") == "ID [REDACTED_CNIC]"

    def test_cnic_in_sentence(self):
        result = redact_pii("Mera CNIC 42101-1234567-3 hai")
        assert "42101" not in result
        assert "[REDACTED_CNIC]" in result


class TestRedactCombined:
    """Mixed PII in same text."""

    def test_phone_and_cnic_together(self):
        text = "Phone 03001234567 and CNIC 35202-1234567-1"
        result = redact_pii(text)
        assert "03001234567" not in result
        assert "35202-1234567-1" not in result
        assert "[REDACTED_PHONE]" in result
        assert "[REDACTED_CNIC]" in result

    def test_no_pii_unchanged(self):
        text = "Mujhe DHA Phase 6 mein ghar chahiye"
        assert redact_pii(text) == text

    def test_empty_string(self):
        assert redact_pii("") == ""

    def test_urdu_text_no_pii(self):
        text = "یہ ایک ٹیسٹ ہے"
        assert redact_pii(text) == text

    def test_partial_number_not_redacted(self):
        # Short numbers should not match phone pattern
        text = "Room 302"
        assert redact_pii(text) == text
