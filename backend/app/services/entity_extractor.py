"""
Entity extraction from user text for memory system.
Extends the regex-based intent detection from dialogue.py into structured entities.
"""

import re
from typing import List, Dict


# Location patterns (Pakistani real estate areas)
LOCATIONS = [
    "dha phase 1", "dha phase 2", "dha phase 3", "dha phase 4",
    "dha phase 5", "dha phase 6", "dha phase 7", "dha phase 8",
    "dha", "bahria town", "johar town", "gulberg", "model town",
    "cantt", "lahore", "karachi", "islamabad", "rawalpindi",
    "faisalabad", "multan", "peshawar",
]

# Property type mappings
PROPERTY_TYPES = {
    "house": "House", "ghar": "House", "makan": "House", "makaan": "House",
    "flat": "Flat", "apartment": "Flat",
    "plot": "Plot", "zameen": "Plot",
    "commercial": "Commercial", "shop": "Commercial", "dukaan": "Commercial",
    "office": "Commercial",
}

# Intent keywords (aligned with dialogue.py _detect_intent)
PRICE_KEYWORDS = [
    "price", "kitni", "kitne", "cost", "value", "worth",
    "qeemat", "قیمت", "kharcha", "rate",
]
SEARCH_KEYWORDS = [
    "search", "find", "show", "dikhao", "chahiye",
    "property", "listing", "available",
]


def extract_entities(text: str) -> List[Dict]:
    """Extract structured entities from user text.

    Returns list of {"type": str, "value": str, "confidence": float}.
    Entity types: location, budget, property_type, bedrooms, area, intent
    """
    entities = []
    text_lower = text.lower()

    # Location extraction
    for loc in LOCATIONS:
        if loc in text_lower:
            entities.append({
                "type": "location",
                "value": loc.title(),
                "confidence": 0.9,
            })
            break  # take the most specific match (longer patterns are first)

    # Budget extraction: "5 crore", "50 lakh", "1.5 karor"
    budget_match = re.search(
        r'(\d+\.?\d*)\s*(crore|karor|کروڑ|lakh|lac|لاکھ)',
        text_lower,
    )
    if budget_match:
        entities.append({
            "type": "budget",
            "value": budget_match.group(0).strip(),
            "confidence": 0.85,
        })

    # Bedroom extraction: "3 bed", "5 bedroom", "3 kamre"
    bed_match = re.search(r'(\d+)\s*(?:bed|bedroom|kamr|kamre|کمر)', text_lower)
    if bed_match:
        entities.append({
            "type": "bedrooms",
            "value": bed_match.group(1),
            "confidence": 0.9,
        })

    # Area extraction: "10 marla", "1 kanal", "5 marle"
    area_match = re.search(r'(\d+\.?\d*)\s*(marla|marle|kanal|مرلہ|کنال)', text_lower)
    if area_match:
        entities.append({
            "type": "area",
            "value": area_match.group(0).strip(),
            "confidence": 0.85,
        })

    # Property type
    for keyword, ptype in PROPERTY_TYPES.items():
        if keyword in text_lower:
            entities.append({
                "type": "property_type",
                "value": ptype,
                "confidence": 0.85,
            })
            break

    # Intent classification
    if any(kw in text_lower for kw in PRICE_KEYWORDS):
        entities.append({
            "type": "intent",
            "value": "wants_price",
            "confidence": 0.8,
        })
    if any(kw in text_lower for kw in SEARCH_KEYWORDS):
        entities.append({
            "type": "intent",
            "value": "wants_search",
            "confidence": 0.8,
        })

    return entities


def parse_budget_to_pkr(budget_str: str) -> float:
    """Convert budget string like '5 crore' or '50 lakh' to PKR float."""
    budget_lower = budget_str.lower().strip()
    match = re.search(r'(\d+\.?\d*)\s*(crore|karor|کروڑ|lakh|lac|لاکھ)', budget_lower)
    if not match:
        return 0.0

    amount = float(match.group(1))
    unit = match.group(2)

    if unit in ("crore", "karor", "کروڑ"):
        return amount * 10_000_000
    elif unit in ("lakh", "lac", "لاکھ"):
        return amount * 100_000
    return 0.0
