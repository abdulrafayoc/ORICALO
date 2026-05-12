"""
Dialogue API endpoints for ORICALO Voice Agent.
Handles LLM-based conversation, RAG retrieval, and price prediction.
"""

import asyncio
import re
import logging
import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db_tables.agent import Agent

logger = logging.getLogger(__name__)

# ============================================================================
# Optional Dependency Imports (graceful degradation)
# ============================================================================

# RAG retriever
try:
    from rag.retriever import query_rag as _query_rag
    logger.info("[Dialogue] RAG retriever loaded.")
except Exception as e:
    logger.warning(f"[Dialogue] RAG retriever not available: {e}")
    _query_rag = None

# LLM factory
try:
    from llm import get_chatbot
    LLM_AVAILABLE = True
    logger.info("[Dialogue] LLM factory loaded.")
except Exception as e:
    logger.warning(f"[Dialogue] LLM factory not available: {e}")
    get_chatbot = None
    LLM_AVAILABLE = False

# Price prediction model
try:
    from app.api.endpoints.valuation import _get_model as get_price_model, _to_sqft
    PRICE_MODEL_AVAILABLE = True
    logger.info("[Dialogue] Price model loaded.")
except Exception as e:
    logger.warning(f"[Dialogue] Price model not available: {e}")
    get_price_model = None
    PRICE_MODEL_AVAILABLE = False


router = APIRouter(tags=["dialogue"])


# ============================================================================
# Request / Response Schemas
# ============================================================================

class DialogueTurn(BaseModel):
    role: str  # "user" or "agent"
    text: str


class DialogueStepRequest(BaseModel):
    history: List[DialogueTurn]
    latest_transcript: str
    metadata: Optional[Dict[str, Any]] = None
    agent_id: Optional[int] = None  # If provided, loads agent's custom system_prompt


class DialogueAction(BaseModel):
    type: str
    payload: Optional[Dict[str, Any]] = None


class DialogueStepResponse(BaseModel):
    reply: str
    actions: List[DialogueAction] = []


class RagQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None


class RagDocument(BaseModel):
    id: str
    score: float
    text: str
    metadata: Optional[Dict[str, Any]] = None


class RagQueryResponse(BaseModel):
    query: str
    results: List[RagDocument]


class PricePredictionRequest(BaseModel):
    location: str
    city: Optional[str] = None
    area_marla: Optional[float] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    baths: Optional[int] = None
    features: Optional[List[str]] = None


class PricePredictionResponse(BaseModel):
    min_price_lakh: float
    max_price_lakh: float
    currency: str = "PKR"
    confidence: float


# ============================================================================
# LLM Singleton (thread-safe lazy init)
# ============================================================================

_llm_instance = None
_llm_lock = asyncio.Lock()


async def _get_llm_async():
    """Get or create LLM instance. Thread-safe via asyncio.Lock."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance
    async with _llm_lock:
        # Double-check after acquiring lock
        if _llm_instance is None and LLM_AVAILABLE:
            try:
                _llm_instance = await asyncio.to_thread(get_chatbot)
                logger.info("[LLM] Instance initialized.")
            except Exception as e:
                logger.error(f"[LLM] Failed to initialize: {e}")
                return None
    return _llm_instance


# ============================================================================
# Intent Detection & NLP Helpers
# ============================================================================

# Keywords covering both English and Urdu script/romanized Urdu
_PRICE_KEYWORDS = {
    "price", "kitni", "kitne", "cost", "value", "worth",
    "qeemat", "قیمت", "rate", "amount", "takmeen"
}
_SEARCH_KEYWORDS = {
    "search", "find", "show", "dikhao", "ghar", "house",
    "flat", "plot", "property", "listing", "available",
    "تلاش", "گھر", "فلیٹ", "پلاٹ", "پراپرٹی"
}
_LOCATION_PREFIXES = {
    "dha", "bahria", "johar", "gulberg", "model town",
    "cantt", "f-", "e-", "i-", "g-", "cavalry", "askari"
}

# Ordered from most specific to least to get best match first
_KNOWN_LOCATIONS = [
    "dha phase 1", "dha phase 2", "dha phase 3", "dha phase 4", "dha phase 5",
    "dha phase 6", "dha phase 7", "dha phase 8", "dha phase 9",
    "bahria town phase 1", "bahria town phase 2", "bahria town phase 7", "bahria town phase 8",
    "bahria town", "johar town", "gulberg 3", "gulberg", "model town",
    "cantt", "cavalry ground", "askari 10", "askari",
    "lahore", "karachi", "islamabad", "rawalpindi", "faisalabad",
]

# Heuristic price per marla (in lakh PKR) by area keyword
_AREA_BASE_PRICES: Dict[str, int] = {
    "dha phase 5": 450,
    "dha phase 6": 420,
    "dha phase 7": 380,
    "dha": 350,
    "gulberg": 300,
    "cantt": 280,
    "model town": 220,
    "bahria town": 180,
    "johar town": 130,
    "askari": 200,
}


def _detect_intent(text: str) -> Dict[str, bool]:
    """Detect user intent from transcript (English + Urdu)."""
    text_lower = text.lower()
    words = set(re.split(r"\s+|،|,", text_lower))
    return {
        "wants_price": bool(words & _PRICE_KEYWORDS),
        "wants_search": bool(words & _SEARCH_KEYWORDS),
        "has_location": any(kw in text_lower for kw in _LOCATION_PREFIXES),
    }


def _extract_location(text: str) -> Optional[str]:
    """Extract best-matching known location from text (most specific first)."""
    text_lower = text.lower()
    for loc in _KNOWN_LOCATIONS:
        if loc in text_lower:
            return loc.title()
    return None


def _extract_area_marla(text: str) -> Optional[float]:
    """Extract area in marla from text, e.g. '5 marla', '10 marla'."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*marla", text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


# ============================================================================
# RAG Helper
# ============================================================================

def _get_rag_context_sync(query: str, top_k: int = 3) -> Tuple[str, list]:
    """
    Synchronous RAG call wrapped for asyncio.to_thread.
    Returns (formatted_context_string, raw_results_list).
    """
    if _query_rag is None:
        return "", []
    try:
        results = _query_rag(query, top_k=top_k)
        if not results:
            return "", []
        context_parts = ["Available Properties:"]
        for i, r in enumerate(results[:top_k], 1):
            text = r.get("text", "")[:200]
            meta = r.get("metadata", {})
            price = meta.get("price", "N/A")
            location = meta.get("location", "")
            context_parts.append(f"{i}. {text} (Price: {price}, Location: {location})")
        return "\n".join(context_parts), results
    except Exception as e:
        logger.error(f"[RAG] Query failed: {e}")
        return "", []


# ============================================================================
# Price Estimation Helper
# ============================================================================

def _get_price_estimate_sync(location: str, area_marla: float = 10) -> Dict[str, Any]:
    """
    Synchronous price estimation. Uses ML model if available, falls back to heuristic.
    Wrapped for asyncio.to_thread.
    """
    # Try ML model
    if PRICE_MODEL_AVAILABLE and get_price_model:
        model = get_price_model()
        if model:
            try:
                area_sqft = _to_sqft(area_marla, location)
                input_data = pd.DataFrame([{
                    "City": "Lahore",
                    "Property Type": "House",
                    "Bedrooms": 3,
                    "Baths": 3,
                    "Area_SqFt": area_sqft
                }])
                prediction = float(model.predict(input_data)[0])
                return {
                    "min_price": int(prediction * 0.9),
                    "max_price": int(prediction * 1.1),
                    "confidence": 0.85,
                    "currency": "PKR",
                }
            except Exception as e:
                logger.warning(f"[Price] ML prediction failed, using heuristic: {e}")

    # Heuristic fallback
    location_lower = location.lower()
    base = 100  # default lakh per marla
    for key, val in _AREA_BASE_PRICES.items():
        if key in location_lower:
            base = val
            break

    total_pkr = base * area_marla * 100_000  # lakh → PKR
    return {
        "min_price": int(total_pkr * 0.9),
        "max_price": int(total_pkr * 1.1),
        "confidence": 0.70,
        "currency": "PKR",
    }


# ============================================================================
# API Endpoints
# ============================================================================

DEFAULT_SYSTEM_PROMPT = (
    "You are an expert Urdu-speaking real estate agent for Pakistan. "
    "Help callers find properties, discuss prices, and schedule viewings. "
    "Always respond in Urdu unless the caller speaks English. "
    "Be concise, helpful, and professional."
)


@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(
    payload: DialogueStepRequest,
    db: AsyncSession = Depends(get_db),
) -> DialogueStepResponse:
    """
    Process a single dialogue turn: detect intent, run RAG + price concurrently,
    then generate an LLM reply using the agent's custom system prompt.
    """
    transcript = payload.latest_transcript
    intent = _detect_intent(transcript)
    actions: List[DialogueAction] = []

    # --- Resolve agent system prompt from DB ---
    system_prompt = DEFAULT_SYSTEM_PROMPT
    if payload.agent_id:
        try:
            result = await db.execute(select(Agent).filter(Agent.id == payload.agent_id))
            agent = result.scalars().first()
            if agent and agent.system_prompt:
                system_prompt = agent.system_prompt
                logger.info(f"[Dialogue] Using custom prompt for agent '{agent.name}'")
        except Exception as e:
            logger.warning(f"[Dialogue] Could not load agent {payload.agent_id}: {e}")

    # --- Run RAG + Price estimation concurrently ---
    rag_task = None
    price_task = None

    if intent["wants_search"] or intent["has_location"]:
        rag_task = asyncio.create_task(
            asyncio.to_thread(_get_rag_context_sync, transcript)
        )

    if intent["wants_price"]:
        location = _extract_location(transcript) or "Lahore"
        area = _extract_area_marla(transcript) or 10.0
        price_task = asyncio.create_task(
            asyncio.to_thread(_get_price_estimate_sync, location, area)
        )

    # Await tasks concurrently
    rag_context, rag_results = ("", [])
    if rag_task:
        rag_context, rag_results = await rag_task

    if price_task:
        price_data = await price_task
        actions.append(DialogueAction(type="show_price", payload=price_data))

    # Build listings action from RAG results
    if rag_results and intent["wants_search"]:
        listings = [
            {
                "id": r.get("id", ""),
                "title": r.get("text", "")[:100],
                "location": r.get("metadata", {}).get("location", ""),
                "price": str(r.get("metadata", {}).get("price", "N/A")),
                "image": "",
            }
            for r in rag_results[:3]
        ]
        actions.append(DialogueAction(type="show_listings", payload={"listings": listings}))

    # --- Generate LLM reply ---
    llm = await _get_llm_async()
    if llm:
        try:
            # Inject agent system prompt
            if hasattr(llm, "system_prompt"):
                llm.system_prompt = system_prompt

            recent_history = payload.history[-12:]
            history = [{"role": t.role, "text": t.text} for t in recent_history]
            if hasattr(llm, "set_history"):
                llm.set_history(history)

            context = rag_context or None
            reply = await asyncio.to_thread(llm.generate_response, transcript, context=context)
        except Exception as e:
            logger.error(f"[LLM] Generation failed: {e}", exc_info=True)
            reply = f"معذرت، جواب میں مسئلہ آ گیا۔ ({str(e)[:50]})"
    else:
        # Graceful fallback without LLM
        if intent["wants_search"]:
            reply = "جی ہاں، میں آپ کے لیے پراپرٹیز تلاش کر رہا ہوں۔ براہ کرم تھوڑا انتظار کریں۔"
        elif intent["wants_price"]:
            reply = "میں آپ کے لیے قیمت کا تخمینہ لگا رہا ہوں۔"
        else:
            reply = "جی، میں آپ کی مدد کے لیے حاضر ہوں۔ آپ کو کیسی پراپرٹی چاہیے؟"

    return DialogueStepResponse(reply=reply, actions=actions)


@router.post("/rag/query", response_model=RagQueryResponse)
async def rag_query(payload: RagQueryRequest) -> RagQueryResponse:
    """Query the property knowledge base using semantic retrieval."""
    if _query_rag is None:
        return RagQueryResponse(
            query=payload.query,
            results=[RagDocument(
                id="stub-doc-1",
                score=1.0,
                text="RAG retriever not available. Query: " + payload.query,
                metadata={"note": "Retriever not initialized"},
            )],
        )
    try:
        results = await asyncio.to_thread(
            _query_rag, payload.query, payload.top_k, payload.filters or {}
        )
        docs = [
            RagDocument(
                id=str(r.get("id", "")),
                score=float(r.get("score", 0.0)),
                text=str(r.get("text", "")),
                metadata=r.get("metadata") or {},
            )
            for r in results
        ]
        return RagQueryResponse(query=payload.query, results=docs)
    except Exception as e:
        logger.error(f"[RAG] Query endpoint failed: {e}")
        return RagQueryResponse(
            query=payload.query,
            results=[RagDocument(id="error", score=0.0, text=f"Error querying RAG: {e}", metadata={})],
        )


@router.post("/price/predict", response_model=PricePredictionResponse)
async def price_predict(payload: PricePredictionRequest) -> PricePredictionResponse:
    """Predict property price range using ML model or heuristic fallback."""
    location = payload.location or "Lahore"
    area = payload.area_marla or 10.0
    price_data = await asyncio.to_thread(_get_price_estimate_sync, location, area)
    return PricePredictionResponse(
        min_price_lakh=price_data["min_price"] / 100_000,
        max_price_lakh=price_data["max_price"] / 100_000,
        confidence=price_data["confidence"],
    )


@router.get("/rag/stats")
async def rag_stats():
    """Return statistics about the RAG vector store."""
    try:
        from rag import vector_store
        stats = vector_store.get_collection_stats()

        last_updated = "N/A"
        processed_file = Path("data/processed/rag_corpus.jsonl")
        if processed_file.exists():
            ts = processed_file.stat().st_mtime
            last_updated = datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")

        return {
            "total_documents": stats.get("count", 0),
            "dimension": 384,  # paraphrase-multilingual-MiniLM-L12-v2
            "last_updated": last_updated,
            "recent_files": ["zameen-com-dataset.csv", "rag_corpus.jsonl"],
        }
    except Exception as e:
        logger.error(f"[RAG] Stats failed: {e}")
        return {
            "total_documents": 0,
            "dimension": 0,
            "last_updated": "Error",
            "error": str(e),
        }
