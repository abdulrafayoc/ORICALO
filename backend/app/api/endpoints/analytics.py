from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
import asyncio
import json

from llm import get_chatbot
from app.db.session import get_db
from app.api.endpoints.crm_integration import sync_call_to_crm
from app.schemas.crm import QualificationData

router = APIRouter()

class CallTranscript(BaseModel):
    history: List[Dict[str, str]] # {role: str, text: str}
    caller_phone: Optional[str] = None
    agent_id: Optional[int] = None
    duration_secs: Optional[int] = None

class AnalyticsResponse(BaseModel):
    redacted_transcript: List[dict]
    summary: str
    qualification_status: str
    lead_score: int
    qualification_data: QualificationData
    crm_call_id: Optional[int] = None

def redact_pii(text: str) -> str:
    """Uses Regex to mask Phone Numbers and CNIC inside Urdu/English text."""
    # Mask Pakistani Phone Numbers
    phone_pattern = r'(\+92|0|92)[-\s]?3\d{2}[-\s]?\d{7}'
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    
    # Mask Pakistani CNIC
    cnic_pattern = r'\d{5}[-\s]?\d{7}[-\s]?\d{1}'
    text = re.sub(cnic_pattern, '[REDACTED_CNIC]', text)
    
    return text

def compute_lead_score(history: List[dict], q_data: QualificationData) -> int:
    score = 0
    
    if q_data.budget_lakh: score += 25
    
    if q_data.timeline_months is not None:
        if q_data.timeline_months <= 3: score += 20
        elif q_data.timeline_months <= 6: score += 10
        
    if q_data.location_preference: score += 15
    if q_data.property_type: score += 10
    
    if len(history) >= 4: score += 10
    
    if q_data.intent_strength == "high": score += 20
    elif q_data.intent_strength == "medium": score += 10
    
    return min(100, score)

@router.post("/process_call", response_model=AnalyticsResponse)
async def process_call(transcript: CallTranscript, db: AsyncSession = Depends(get_db)):
    redacted_history = []
    full_text_for_llm = ""
    
    for turn in transcript.history:
        safe_text = redact_pii(turn.get("text", ""))
        redacted_history.append({"role": turn.get("role", "system"), "text": safe_text})
        full_text_for_llm += f"{turn.get('role', '').upper()}: {safe_text}\n"

    # Use LLM to summarize and extract qualification data in JSON
    analyzer = get_chatbot()
    prompt = f"""
Analyze the following real estate conversation.
Output ONLY a raw, syntactically perfect JSON object with NO markdown wrapping, code blocks, or extra text.

Schema:
{{
    "summary": "2-3 sentence summary of the call",
    "qualification_status": "Qualified Lead" or "Info Seeker",
    "budget_lakh": number or null if not mentioned,
    "timeline_months": number or null if not mentioned,
    "location_preference": "location name or null",
    "property_type": "House, Plot, Flat, or null",
    "bedrooms": number or null,
    "intent_strength": "high", "medium", or "low"
}}

Conversation:
{full_text_for_llm}
"""

    analysis_text = await asyncio.to_thread(analyzer.generate_response, prompt)
    
    # Parse JSON
    try:
        # Strip possible markdown blockers if model disobeys
        clean_json = analysis_text.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:-3].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:-3].strip()
            
        data = json.loads(clean_json)
        
        q_data = QualificationData(
            budget_lakh=data.get("budget_lakh"),
            timeline_months=data.get("timeline_months"),
            location_preference=data.get("location_preference"),
            property_type=data.get("property_type"),
            bedrooms=data.get("bedrooms"),
            intent_strength=data.get("intent_strength")
        )
        summary = data.get("summary", "No summary.")
        status = data.get("qualification_status", "Info Seeker")
    except Exception as e:
        print(f"[Analytics] JSON parse failed: {e}. Raw text: {analysis_text}")
        q_data = QualificationData()
        summary = "Failed to parse LLM analysis."
        status = "Unknown"

    lead_score = compute_lead_score(redacted_history, q_data)
    
    # Trigger CRM Sync if phone provided
    crm_call_id = None
    if transcript.caller_phone:
        try:
            crm_call_id = await sync_call_to_crm(
                db=db,
                transcript=redacted_history,
                summary=summary,
                qualification_data=q_data.dict(exclude_unset=True),
                lead_score=lead_score,
                caller_phone=transcript.caller_phone,
                agent_id=transcript.agent_id
            )
        except Exception as e:
            print(f"[Analytics] CRM Sync failed: {e}")

    return AnalyticsResponse(
        redacted_transcript=redacted_history,
        summary=summary,
        qualification_status=status,
        lead_score=lead_score,
        qualification_data=q_data,
        crm_call_id=crm_call_id
    )
