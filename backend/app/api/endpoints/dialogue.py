"""
Dialogue API endpoints for ORICALO Voice Agent.
Handles LLM-based conversation, RAG retrieval, and price prediction.
"""

from typing import List, Optional, Dict, Any
import os
import json
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db_tables.agent import Agent

load_dotenv()

# Import RAG retriever
try:
    from rag.retriever import query_rag as _query_rag
except Exception:
    _query_rag = None

# Import LLM factory
try:
    from llm import get_chatbot
    LLM_AVAILABLE = True
except Exception:
    get_chatbot = None
    LLM_AVAILABLE = False

# Import price prediction
try:
    from app.api.endpoints.valuation import _get_model as get_price_model, _to_sqft
    PRICE_MODEL_AVAILABLE = True
except Exception:
    get_price_model = None
    PRICE_MODEL_AVAILABLE = False


router = APIRouter(tags=["iteration2"])


# ============================================================================
# Request/Response Models
# ============================================================================

class DialogueTurn(BaseModel):
    role: str  # "user" or "agent"
    text: str


class DialogueStepRequest(BaseModel):
    history: List[DialogueTurn]
    latest_transcript: str
    metadata: Optional[Dict[str, Any]] = None
    agent_id: Optional[int] = None


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
# LLM Instance (Lazy Loading)
# ============================================================================

_llm_instance = None


def _get_llm():
    """Get or create LLM instance."""
    global _llm_instance
    if _llm_instance is None and LLM_AVAILABLE:
        try:
            _llm_instance = get_chatbot()
        except Exception as e:
            print(f"[LLM] Failed to initialize: {e}")
            return None
    return _llm_instance


# ============================================================================
# Helper Functions
# ============================================================================

def _detect_intent(text: str) -> Dict[str, bool]:
    """Detect user intent from transcript."""
    text_lower = text.lower()
    
    # Keywords for different intents
    price_keywords = ["price", "kitni", "kitne", "cost", "value", "worth", "qeemat", "قیمت"]
    search_keywords = ["search", "find", "show", "dikhao", "ghar", "house", "flat", "plot", "property", "listing"]
    location_keywords = ["dha", "bahria", "johar", "gulberg", "model town", "cantt", "f-", "e-", "i-", "g-"]
    
    return {
        "wants_price": any(kw in text_lower for kw in price_keywords),
        "wants_search": any(kw in text_lower for kw in search_keywords),
        "has_location": any(kw in text_lower for kw in location_keywords),
    }


def _extract_location(text: str) -> Optional[str]:
    """Extract location from text."""
    text_lower = text.lower()
    locations = [
        "dha phase 1", "dha phase 2", "dha phase 3", "dha phase 4", "dha phase 5", 
        "dha phase 6", "dha phase 7", "dha phase 8", "dha", "bahria town",
        "johar town", "gulberg", "model town", "cantt", "lahore", "karachi", "islamabad"
    ]
    for loc in locations:
        if loc in text_lower:
            return loc.title()
    return None


def _get_rag_context(query: str, top_k: int = 3) -> str:
    """Get RAG context for LLM prompt."""
    if _query_rag is None:
        return ""
    
    try:
        results = _query_rag(query, top_k=top_k)
        if not results:
            return ""
        
        context_parts = ["Available Properties:"]
        for i, r in enumerate(results[:top_k], 1):
            text = r.get("text", "")[:500]  # Limit text length
            metadata = r.get("metadata", {})
            price = metadata.get("price", "N/A")
            location = metadata.get("location", "")
            context_parts.append(f"{i}. {text[:200]}... (Price: {price}, Location: {location})")
        
        return "\n".join(context_parts)
    except Exception as e:
        print(f"[RAG] Error: {e}")
        return ""


def _get_price_estimate(location: str, area_marla: float = 10) -> Dict[str, Any]:
    """Get price estimate for location."""
    # Simple heuristic if model not available
    base_prices = {
        "dha": 350,  # lakh per marla
        "bahria": 180,
        "johar": 120,
        "gulberg": 280,
        "model town": 200,
        "cantt": 250,
    }
    
    location_lower = location.lower()
    base = 100  # default
    for key, val in base_prices.items():
        if key in location_lower:
            base = val
            break
    
    total = base * area_marla
    return {
        "min_price": int(total * 0.9 * 100000),
        "max_price": int(total * 1.1 * 100000),
        "confidence": 0.75,
        "currency": "PKR"
    }


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(payload: DialogueStepRequest, db: AsyncSession = Depends(get_db)) -> DialogueStepResponse:
    """
    Process dialogue step with LLM + RAG.
    
    1. Detect user intent from transcript
    2. If property-related, fetch RAG context
    3. Generate LLM response with context
    4. Add actions for price/listing widgets
    """
    transcript = payload.latest_transcript
    intent = _detect_intent(transcript)
    actions: List[DialogueAction] = []
    
    # Get RAG context if property-related query
    rag_context = ""
    if intent["wants_search"] or intent["has_location"]:
        rag_context = _get_rag_context(transcript)
        
        # Add listings action for frontend widget
        if _query_rag and intent["wants_search"]:
            results = _query_rag(transcript, top_k=3)
            if results:
                listings = []
                for r in results[:3]:
                    meta = r.get("metadata", {})
                    listings.append({
                        "id": r.get("id", ""),
                        "title": r.get("text", "")[:100],
                        "location": meta.get("location", ""),
                        "price": str(meta.get("price", "N/A")),
                        "image": ""
                    })
                actions.append(DialogueAction(type="show_listings", payload={"listings": listings}))
    
    # Add price action if price query detected
    if intent["wants_price"]:
        location = _extract_location(transcript) or "Lahore"
        price_data = _get_price_estimate(location)
        actions.append(DialogueAction(type="show_price", payload=price_data))
    
    # Generate LLM response
    llm = _get_llm()
    if llm:
        try:
            # Set conversation history
            # User requested short term memory of at least 6 turns.
            recent_history = payload.history[-12:] 
            history = [{"role": t.role, "text": t.text} for t in recent_history]
            llm.set_history(history)
            
            # Build context for LLM
            context = rag_context if rag_context else None
            
            # Fetch agent system prompt if agent_id provided
            system_prompt = None
            if payload.agent_id:
                result = await db.execute(select(Agent).filter(Agent.id == payload.agent_id))
                agent = result.scalars().first()
                if agent:
                    system_prompt = agent.system_prompt
            
            reply = llm.generate_response(transcript, context=context, system_prompt=system_prompt)
        except Exception as e:
            reply = f"معذرت، جواب میں مسئلہ آ گیا۔ ({str(e)[:50]})"
    else:
        # Fallback if LLM not available
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
        # Fallback stub
        dummy_doc = RagDocument(
            id="stub-doc-1",
            score=1.0,
            text="RAG retriever not available. Query: " + payload.query,
            metadata={"note": "Retriever not initialized"},
        )
        return RagQueryResponse(query=payload.query, results=[dummy_doc])
    
    try:
        results = _query_rag(payload.query, top_k=payload.top_k, filters=payload.filters or {})
        docs: List[RagDocument] = []
        for r in results:
            docs.append(
                RagDocument(
                    id=str(r.get("id", "")),
                    score=float(r.get("score", 0.0)),
                    text=str(r.get("text", "")),
                    metadata=r.get("metadata") or {},
                )
            )
        return RagQueryResponse(query=payload.query, results=docs)
    except Exception as e:
        error_doc = RagDocument(
            id="error",
            score=0.0,
            text=f"Error querying RAG: {str(e)}",
            metadata={},
        )
        return RagQueryResponse(query=payload.query, results=[error_doc])


@router.post("/price/predict", response_model=PricePredictionResponse)
async def price_predict(payload: PricePredictionRequest) -> PricePredictionResponse:
    """Predict property price range."""
    location = payload.location or "Lahore"
    area = payload.area_marla or 10.0
    
    price_data = _get_price_estimate(location, area)
    
    return PricePredictionResponse(
        min_price_lakh=price_data["min_price"] / 100000,
        max_price_lakh=price_data["max_price"] / 100000,
        confidence=price_data["confidence"],
    )


@router.get("/rag/stats")
async def rag_stats():
    """Return statistics about the RAG vector store."""
    try:
        from rag import vector_store
        stats = vector_store.get_collection_stats()
        
        # Get file stats if possible
        full_doc_count = 0
        last_updated = "N/A"
        processed_file = Path("data/processed/rag_corpus.jsonl")
        
        if processed_file.exists():
            import datetime
            ts = processed_file.stat().st_mtime
            last_updated = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
            
            # Simple line count for jsonl
            # full_doc_count = sum(1 for _ in open(processed_file, 'r', encoding='utf-8'))
    except Exception as e:
        return {
            "total_documents": 0,
            "dimension": 0,
            "last_updated": "Error",
            "error": str(e)
        }

    return {
        "total_documents": stats.get("count", 0),
        "dimension": 384, # Default for paraphrase-multilingual-MiniLM-L12-v2
        "last_updated": last_updated,
        "recent_files": [
            "zameen-com-dataset.csv", # Assuming this is the source
            "rag_corpus.jsonl"
        ]
    }
