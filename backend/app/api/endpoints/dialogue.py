from typing import List, Optional, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(tags=["iteration2"])


class DialogueTurn(BaseModel):
    role: str  # "user" or "agent"
    text: str


class DialogueStepRequest(BaseModel):
    history: List[DialogueTurn]
    latest_transcript: str
    metadata: Optional[Dict[str, Any]] = None


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


@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(payload: DialogueStepRequest) -> DialogueStepResponse:
    """Iteration 2 stub endpoint.

    For now this returns a placeholder reply echoing the latest transcript.
    In future iterations this will call an LLM + policy module.
    """
    reply_text = (
        "[STUB] Agent reply based on transcript: " f"{payload.latest_transcript!r}"
    )
    return DialogueStepResponse(reply=reply_text, actions=[])


@router.post("/rag/query", response_model=RagQueryResponse)
async def rag_query(payload: RagQueryRequest) -> RagQueryResponse:
    """Iteration 2 stub endpoint for RAG.

    Returns a single dummy document. Later this will query a FAISS index
    built over a real estate knowledge base.
    """
    dummy_doc = RagDocument(
        id="stub-doc-1",
        score=1.0,
        text="This is a placeholder document for query: " + payload.query,
        metadata={"note": "Replace with real RAG results in Iteration 2"},
    )
    return RagQueryResponse(query=payload.query, results=[dummy_doc])


@router.post("/price/predict", response_model=PricePredictionResponse)
async def price_predict(payload: PricePredictionRequest) -> PricePredictionResponse:
    """Iteration 2 stub endpoint for price prediction.

    Returns a hard-coded price range with medium confidence. Later this will
    call a trained regression model over structured property data.
    """
    # Simple heuristic stub: fixed range in lakh
    return PricePredictionResponse(
        min_price_lakh=50.0,
        max_price_lakh=150.0,
        confidence=0.5,
    )
