from typing import List, Optional, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel
import os
import json
import re
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


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


_LLM_MODEL_ID = os.getenv("LLM_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.2")
_LLM_MAX_NEW_TOKENS = int(os.getenv("LLM_MAX_NEW_TOKENS", "256"))
_LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.3"))
_llm_model = None
_llm_tokenizer = None


def _get_llm():
    global _llm_model, _llm_tokenizer
    if _llm_model is None or _llm_tokenizer is None:
        _llm_tokenizer = AutoTokenizer.from_pretrained(_LLM_MODEL_ID)
        _llm_model = AutoModelForCausalLM.from_pretrained(
            _LLM_MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )
    return _llm_model, _llm_tokenizer


def _build_messages(payload: "DialogueStepRequest") -> List[Dict[str, str]]:
    system_prompt = (
        "آپ ایک شائستہ اور ماہر رئیل اسٹیٹ ایجنٹ ہیں جو پاکستان کے شہری سیاق میں بات کرتے ہیں. "
        "آپ کا مقصد ہے: کلائنٹ کی ضرورت سمجھنا، واضح سوالات کرنا، اور مناسب رہنمائی دینا. "
        "جواب مختصر، مؤثر، اور شائستہ اردو/رومن اردو میں دیں۔\n\n"
        "ہمیشہ درج ذیل JSON اسکیمہ کے مطابق آؤٹ پٹ دیں:\n"
        "{\n  \"reply\": \"<agent message in Urdu/Roman Urdu>\",\n  \"actions\": [\n    { \"type\": \"<action_type>\", \"payload\": { ... } }\n  ]\n}\n"
        "اگر کوئی ایکشن درکار نہیں تو actions خالی لسٹ رکھیں۔"
    )

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

    for turn in payload.history:
        role = "user" if turn.role.lower() == "user" else "assistant"
        messages.append({"role": role, "content": turn.text})

    user_prefix = "تازہ ٹرانسکرپٹ:\n" + payload.latest_transcript
    if payload.metadata:
        try:
            meta_str = json.dumps(payload.metadata, ensure_ascii=False)
        except Exception:
            meta_str = str(payload.metadata)
        user_prefix += "\n\nمیٹا ڈیٹا:" + "\n" + meta_str
    messages.append({"role": "user", "content": user_prefix})
    return messages


def _generate_response(messages: List[Dict[str, str]]) -> str:
    model, tokenizer = _get_llm()
    try:
        template = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(template, return_tensors="pt").to(model.device)
    except Exception:
        history_text = "\n".join([f"[{m['role']}] {m['content']}" for m in messages])
        inputs = tokenizer(history_text + "\nassistant:", return_tensors="pt").to(model.device)

    with torch.no_grad():
        gen = model.generate(
            **inputs,
            max_new_tokens=_LLM_MAX_NEW_TOKENS,
            temperature=_LLM_TEMPERATURE,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    out = tokenizer.decode(gen[0], skip_special_tokens=True)
    return out


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    snippet = match.group(0)
    try:
        return json.loads(snippet)
    except Exception:
        return None


@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(payload: DialogueStepRequest) -> DialogueStepResponse:
    """Iteration 2 stub endpoint.

    For now this returns a placeholder reply echoing the latest transcript.
    In future iterations this will call an LLM + policy module.
    """
    messages = _build_messages(payload)
    raw = _generate_response(messages)

    parsed = _extract_json(raw)
    if parsed and isinstance(parsed, dict):
        reply = str(parsed.get("reply", ""))
        actions_payload = parsed.get("actions", [])
        actions: List[DialogueAction] = []
        if isinstance(actions_payload, list):
            for a in actions_payload:
                if isinstance(a, dict) and "type" in a:
                    actions.append(DialogueAction(type=str(a.get("type")), payload=a.get("payload")))
        if not reply:
            reply = payload.latest_transcript
        return DialogueStepResponse(reply=reply, actions=actions)

    cleaned = raw.strip()
    if not cleaned:
        cleaned = payload.latest_transcript
    return DialogueStepResponse(reply=cleaned, actions=[])


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
