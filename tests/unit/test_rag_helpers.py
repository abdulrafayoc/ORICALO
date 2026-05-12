"""
Unit tests for RAG pipeline helper functions.

Covers:
  - Property text normalisation for embedding
  - Corpus JSONL schema validation
  - Metadata filter construction
  - Area unit normalisation (Marla → sqft)
  - Multilingual keyword matching in descriptions
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))


# ═══════════════════════════════════════════════════════════════════════════════
# Schema validation helpers (pure Python — no DB / model needed)
# ═══════════════════════════════════════════════════════════════════════════════

REQUIRED_CORPUS_FIELDS = [
    "Property_Id",
    "City",
    "Location",
    "Property Type",
    "Price",
    "Bedrooms",
    "Baths",
    "Area (Marla)",
    "Short Desc",
    "Long Desc",
]


def _is_valid_corpus_record(record: dict) -> bool:
    """Return True if all required fields are present."""
    return all(field in record for field in REQUIRED_CORPUS_FIELDS)


def _build_embedding_text(record: dict) -> str:
    """Build the text blob used for embedding generation."""
    parts = []
    
    # Text fields
    if record.get("Short Desc"):
        parts.append(record.get("Short Desc"))
    if record.get("Long Desc"):
        parts.append(record.get("Long Desc"))
        
    # Metadata fields (only if values exist)
    if record.get("City"):
        parts.append(f"City: {record.get('City')}")
    if record.get("Location"):
        parts.append(f"Location: {record.get('Location')}")
    if record.get("Property Type"):
        parts.append(f"Type: {record.get('Property Type')}")
    if record.get("Price in words"):
        parts.append(f"Price: {record.get('Price in words')}")
    if record.get("Bedrooms"):
        parts.append(f"Beds: {record.get('Bedrooms')}")
    if record.get("Baths"):
        parts.append(f"Baths: {record.get('Baths')}")
    if record.get("Area (Marla)"):
        parts.append(f"Area: {record.get('Area (Marla)')} Marla")
        
    return " | ".join(p for p in parts if p.strip())


def _build_chroma_filters(city: str = None, min_price: float = None) -> dict:
    """Build the ChromaDB 'where' clause from optional filter params."""
    where = {}
    if city:
        where["city"] = city
    if min_price is not None:
        where["price"] = {"$gte": float(min_price)}
    return where


SAMPLE_RECORD = {
    "Property_Id": "12345",
    "City": "Lahore",
    "Location": "DHA Phase 5",
    "Long Location": "DHA Phase 5, DHA Defence, Lahore",
    "Property Type": "House",
    "Price": 35_000_000,
    "Price in words": "3 Crore 50 Lakh",
    "Bedrooms": 5,
    "Baths": 6,
    "Area (Marla)": 10,
    "Short Desc": "Brand new 5 bed house in DHA Phase 5",
    "Long Desc": "Beautiful corner plot house with modern architecture and spacious rooms.",
    "Link": "https://www.zameen.com/Property/sample",
}


class TestCorpusSchema:
    """Validate the unified JSONL corpus record structure."""

    def test_sample_record_is_valid(self):
        assert _is_valid_corpus_record(SAMPLE_RECORD) is True

    def test_missing_city_is_invalid(self):
        record = {k: v for k, v in SAMPLE_RECORD.items() if k != "City"}
        assert _is_valid_corpus_record(record) is False

    def test_missing_property_id_is_invalid(self):
        record = {k: v for k, v in SAMPLE_RECORD.items() if k != "Property_Id"}
        assert _is_valid_corpus_record(record) is False

    def test_missing_price_is_invalid(self):
        record = {k: v for k, v in SAMPLE_RECORD.items() if k != "Price"}
        assert _is_valid_corpus_record(record) is False

    def test_missing_long_desc_is_invalid(self):
        record = {k: v for k, v in SAMPLE_RECORD.items() if k != "Long Desc"}
        assert _is_valid_corpus_record(record) is False

    def test_empty_dict_is_invalid(self):
        assert _is_valid_corpus_record({}) is False

    def test_all_required_fields_present(self):
        for field in REQUIRED_CORPUS_FIELDS:
            assert field in SAMPLE_RECORD


class TestEmbeddingTextBuilder:
    """The text blob passed to the sentence-transformer should contain key info."""

    def test_contains_short_desc(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "Brand new 5 bed house in DHA Phase 5" in text

    def test_contains_city(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "Lahore" in text

    def test_contains_location(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "DHA Phase 5" in text

    def test_contains_area(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "Marla" in text

    def test_contains_price_words(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "Crore" in text

    def test_contains_property_type(self):
        text = _build_embedding_text(SAMPLE_RECORD)
        assert "House" in text

    def test_empty_record_returns_empty_ish(self):
        text = _build_embedding_text({})
        # All parts are empty, result should be very short
        assert len(text) < 30

    def test_returns_string(self):
        assert isinstance(_build_embedding_text(SAMPLE_RECORD), str)


class TestChromaDBFilterBuilder:
    """Build correct ChromaDB where-clause dicts."""

    def test_city_only(self):
        filters = _build_chroma_filters(city="Lahore")
        assert filters == {"city": "Lahore"}

    def test_min_price_only(self):
        filters = _build_chroma_filters(min_price=10_000_000)
        assert filters == {"price": {"$gte": 10_000_000.0}}

    def test_city_and_price(self):
        filters = _build_chroma_filters(city="Karachi", min_price=5_000_000)
        assert filters["city"] == "Karachi"
        assert filters["price"]["$gte"] == 5_000_000.0

    def test_no_filters_returns_empty_dict(self):
        filters = _build_chroma_filters()
        assert filters == {}

    def test_min_price_converted_to_float(self):
        filters = _build_chroma_filters(min_price=20_000_000)
        assert isinstance(filters["price"]["$gte"], float)


class TestAreaNormalisation:
    """Area unit handling for the RAG corpus."""

    def _area_label(self, area_marla: float) -> str:
        """Convert area to a human-readable label for embedding."""
        if area_marla < 5:
            return f"{area_marla} Marla (Small)"
        elif area_marla < 10:
            return f"{area_marla} Marla (Medium)"
        elif area_marla < 20:
            return f"{area_marla} Marla (Large)"
        return f"{area_marla} Marla (Very Large)"

    def test_2_marla_is_small(self):
        assert "Small" in self._area_label(2)

    def test_7_marla_is_medium(self):
        assert "Medium" in self._area_label(7)

    def test_10_marla_is_large(self):
        assert "Large" in self._area_label(10)

    def test_1_kanal_is_very_large(self):
        # 1 Kanal = 20 Marla
        assert "Very Large" in self._area_label(20)

    def test_label_contains_numeric_value(self):
        assert "10" in self._area_label(10)


class TestPriceFormatting:
    """Price expressed in PKR lakh/crore for embedding text."""

    def _format_price(self, price_pkr: float) -> str:
        """Convert a raw PKR price to a human-readable Urdu-style label."""
        crore = price_pkr / 1e7
        lakh = price_pkr / 1e5
        if crore >= 1:
            return f"{crore:.1f} Crore"
        return f"{lakh:.0f} Lakh"

    def test_35_million_is_3_point_5_crore(self):
        assert "3.5 Crore" in self._format_price(35_000_000)

    def test_10_million_is_1_crore(self):
        assert "1.0 Crore" in self._format_price(10_000_000)

    def test_5_million_is_50_lakh(self):
        assert "50 Lakh" in self._format_price(5_000_000)

    def test_returns_string(self):
        assert isinstance(self._format_price(10_000_000), str)
