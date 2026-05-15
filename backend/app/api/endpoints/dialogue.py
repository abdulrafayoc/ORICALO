"""
Dialogue API endpoints for ORICALO Voice Agent.
Handles LLM-based conversation, RAG retrieval, price prediction, and calendar booking.
"""

import asyncio
import re
import logging
import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
import httpx

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
_CALENDAR_KEYWORDS = {
    "book", "schedule", "appointment", "meeting", "visit",
    "mila", "milna", "meeting", "appointment", "schedule",
    "book", "visit", "viewing", "dekhna", "mulk"
}
_MEETING_TYPES = {
    "visit": {"visit", "viewing", "dekhna", "mulk", "ghar dekhna"},
    "call": {"call", "phone", "baat", "call karna"},
    "video": {"video", "zoom", "video call", "online"}
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
        "wants_calendar": bool(words & _CALENDAR_KEYWORDS),
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


def _extract_date(text: str) -> Optional[str]:
    """Extract date from text in various formats (YYYY-MM-DD, DD/MM/YYYY, etc.)."""
    # Try YYYY-MM-DD format
    match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if match:
        return match.group(1)
    
    # Try DD/MM/YYYY or DD-MM-YYYY format
    match = re.search(r"(\d{2}[/\-]\d{2}[/\-]\d{4})", text)
    if match:
        date_str = match.group(1)
        # Convert to YYYY-MM-DD
        parts = re.split(r"[/\-]", date_str)
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
    
    # Try relative dates (tomorrow, next week, etc.)
    text_lower = text.lower()
    if "tomorrow" in text_lower or "کل" in text_lower:
        tomorrow = datetime.date.today() + datetime.timedelta(days=1)
        return tomorrow.strftime("%Y-%m-%d")
    elif "today" in text_lower or "آج" in text_lower:
        return datetime.date.today().strftime("%Y-%m-%d")
    
    return None


def _extract_time(text: str) -> Optional[str]:
    """Extract time from text in HH:MM format (12-hour or 24-hour)."""
    # Try HH:MM format (24-hour)
    match = re.search(r"(\d{1,2}):(\d{2})", text)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"
    
    # Try 12-hour format with AM/PM
    match = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)", text, re.IGNORECASE)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        period = match.group(3).lower()
        if period == "pm" and hour != 12:
            hour += 12
        elif period == "am" and hour == 12:
            hour = 0
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return f"{hour:02d}:{minute:02d}"
    
    return None


def _extract_meeting_type(text: str) -> Optional[str]:
    """Extract meeting type from text (VISIT, CALL, VIDEO)."""
    text_lower = text.lower()
    for meeting_type, keywords in _MEETING_TYPES.items():
        if any(kw in text_lower for kw in keywords):
            return meeting_type.upper()
    return "VISIT"  # Default to visit if not specified


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
# Calendar Booking Helper
# ============================================================================

async def _check_calendar_availability(date: str, lead_id: Optional[int] = None) -> Dict[str, Any]:
    """Check calendar availability for a given date."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {"date": date}
            if lead_id:
                params["lead_id"] = lead_id
            response = await client.get(
                "http://localhost:8000/calendar/availability/" + date,
                params=params
            )
            if response.status_code == 200:
                return response.json()
            return {"error": "Failed to check availability"}
    except Exception as e:
        logger.error(f"[Calendar] Availability check failed: {e}")
        return {"error": str(e)}


async def _book_meeting(
    lead_id: int,
    meeting_type: str,
    date: str,
    time: str,
    title: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Book a meeting via the calendar API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {
                "lead_id": lead_id,
                "meeting_type": meeting_type,
                "scheduled_date": date,
                "scheduled_time": time,
                "duration_minutes": 60,
                "notes": notes
            }
            if title:
                payload["title"] = title
            
            response = await client.post(
                "http://localhost:8000/calendar/book",
                json=payload
            )
            if response.status_code == 200:
                return response.json()
            return {"error": "Failed to book meeting"}
    except Exception as e:
        logger.error(f"[Calendar] Meeting booking failed: {e}")
        return {"error": str(e)}


# ============================================================================
# API Endpoints
# ============================================================================

DEFAULT_SYSTEM_PROMPT = (
    "You are an expert Urdu-speaking real estate agent for Pakistan. "
    "Help callers find properties, discuss prices, and schedule viewings. "
    "Always respond in Urdu unless the caller speaks English. "
    "Be concise, helpful, and professional. "
    "When a user wants to book a meeting or visit, help them find available slots "
    "between 9 AM and 10 PM and confirm the booking."
)


@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(
    payload: DialogueStepRequest,
    db: AsyncSession = Depends(get_db),
) -> DialogueStepResponse:
    """
    Process a single dialogue turn: detect intent, run RAG + price + calendar concurrently,
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

    # --- Run RAG + Price + Calendar concurrently ---
    rag_task = None
    price_task = None
    calendar_task = None

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

    if intent["wants_calendar"]:
        # Extract calendar booking details
        date = _extract_date(transcript)
        time = _extract_time(transcript)
        meeting_type = _extract_meeting_type(transcript)
        
        if date and time:
            # Try to book the meeting directly
            lead_id = payload.metadata.get("lead_id") if payload.metadata else None
            if lead_id:
                calendar_task = asyncio.create_task(
                    _book_meeting(
                        lead_id=lead_id,
                        meeting_type=meeting_type,
                        date=date,
                        time=time,
                        notes=f"Booked via voice agent: {transcript}"
                    )
                )
            else:
                # Just check availability if no lead_id
                calendar_task = asyncio.create_task(
                    _check_calendar_availability(date)
                )
        elif date:
            # Check availability for the date
            calendar_task = asyncio.create_task(
                _check_calendar_availability(date)
            )

    # Await tasks concurrently
    rag_context, rag_results = ("", [])
    if rag_task:
        rag_context, rag_results = await rag_task

    if price_task:
        price_data = await price_task
        actions.append(DialogueAction(type="show_price", payload=price_data))

    if calendar_task:
        calendar_result = await calendar_task
        if "error" not in calendar_result:
            if "id" in calendar_result:
                # Meeting was booked successfully
                actions.append(DialogueAction(
                    type="meeting_booked",
                    payload=calendar_result
                ))
            elif "available_slots" in calendar_result:
                # Availability check returned
                actions.append(DialogueAction(
                    type="calendar_availability",
                    payload=calendar_result
                ))

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
        elif intent["wants_calendar"]:
            reply = "جی ہاں، میں آپ کے لیے میٹنگ بک کر سکتا ہوں۔ براہ کرم تاریخ اور وقت بتائیں۔"
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
