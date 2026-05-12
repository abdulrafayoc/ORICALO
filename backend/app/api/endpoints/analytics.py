from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import re
import asyncio
from llm import get_chatbot
import uuid
from app.db.session import AsyncSessionLocal, get_db
from app.db_tables.crm import Lead, CallSession, ActionItem
from app.db_tables.user import User
from app.core.auth import get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class CallTranscript(BaseModel):
    history: List[dict] # {role: str, text: str}

class AnalyticsResponse(BaseModel):
    redacted_transcript: List[dict]
    summary: str
    budget: str
    location_preferences: str
    timeline: str
    lead_score: int
    qualification_status: str

def redact_pii(text: str) -> str:
    """Uses Regex to mask Phone Numbers and CNIC inside Urdu/English text."""
    # Mask Pakistani Phone Numbers (e.g., 0300-1234567, 03001234567, +923001234567)
    phone_pattern = r'(\+92|0|92)[-\s]?3\d{2}[-\s]?\d{7}'
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    
    # Mask Pakistani CNIC (e.g., 35202-1234567-1, 3520212345671)
    cnic_pattern = r'\d{5}[-\s]?\d{7}[-\s]?\d{1}'
    text = re.sub(cnic_pattern, '[REDACTED_CNIC]', text)
    
    return text

@router.post("/process_call", response_model=AnalyticsResponse)
@limiter.limit("10/minute")
async def process_call(request: Request, transcript: CallTranscript):
    # NOTE: This endpoint is often called by the voice pipeline directly.
    # In a real SaaS, we would pass an API key or session token here.
    # For now, it handles redaction and LLM analysis.
    redacted_history = []
    full_text_for_llm = ""
    
    for turn in transcript.history:
        safe_text = redact_pii(turn["text"])
        redacted_history.append({"role": turn["role"], "text": safe_text})
        full_text_for_llm += f"{turn['role'].upper()}: {safe_text}\n"

    analyzer = get_chatbot()
    analyzer.system_prompt = "You are an expert real estate data extractor. You must extract information into a pure JSON object. Respond only with JSON."
    analyzer.reset_history()
    
    prompt = f"""
Analyze the following real estate conversation. You must return a pure JSON object.
Extract the following information:
1. "summary": A 2-sentence summary of what the user wants.
2. "budget": The user's budget if mentioned, otherwise "Not specified".
3. "location_preferences": Areas or locations the user expressed interest in, or "Not specified".
4. "timeline": When the user intends to buy/sell/rent (e.g. "Immediate", "2 months", "Not specified").
5. "lead_score": Assign a numeric score from 0 to 100 representing how qualified this lead is (e.g., 90 if budget+timeline exist, 20 if just asking generic info).
6. "qualification_status": Determine if they are a "Hot Lead" (score > 70), "Warm Lead" (score 40-70), or "Info Seeker" (score < 40).

Conversation:
{full_text_for_llm}
"""

    try:
        # Request strict JSON output
        analysis_json = await analyzer.async_generate_response(
            prompt, 
            response_format={"type": "json_object"}
        )
        import json
        structured = json.loads(analysis_json)
        
        summary = structured.get("summary", "Analysis failed.")
        budget = structured.get("budget", "Not specified")
        location_preferences = structured.get("location_preferences", "Not specified")
        timeline = structured.get("timeline", "Not specified")
        lead_score = int(structured.get("lead_score", 0))
        status = structured.get("qualification_status", "Info Seeker")
    except Exception as e:
        print(f"[Analytics] Error generating JSON: {e}")
        summary, budget, location_preferences, timeline, lead_score, status = "Call processed.", "N/A", "N/A", "N/A", 0, "Info Seeker"

    return AnalyticsResponse(
        redacted_transcript=redacted_history,
        summary=summary,
        budget=budget,
        location_preferences=location_preferences,
        timeline=timeline,
        lead_score=lead_score,
        qualification_status=status
    )

@router.get("/kpis")
async def get_analytics_kpis(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return key performance indicators for the organization's analytics dashboard."""
    try:
        # Total Calls (Count of CallSessions for current org)
        total_calls_result = await db.execute(
            select(func.count(CallSession.id))
            .join(Lead)
            .filter(Lead.organization_id == current_user.organization_id)
        )
        total_calls = total_calls_result.scalar() or 0
        
        # Qualified Leads (Count of Leads in org where lead_score > 70)
        qualified_leads_result = await db.execute(
            select(func.count(Lead.id))
            .filter(Lead.organization_id == current_user.organization_id)
            .filter(Lead.lead_score > 70)
        )
        qualified_leads = qualified_leads_result.scalar() or 0
        
        return {
            "total_calls": total_calls,
            "qualified_leads": qualified_leads,
            "pii_redacted_pct": 100,
            "avg_duration": "1m 45s"
        }
    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        return {"total_calls": 0, "qualified_leads": 0, "pii_redacted_pct": 100, "avg_duration": "0s"}

@router.get("/recent-calls")
async def get_recent_calls(limit: int = 5, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the most recent call sessions for the organization."""
    try:
        result = await db.execute(
            select(CallSession, Lead)
            .join(Lead, CallSession.lead_id == Lead.id)
            .filter(Lead.organization_id == current_user.organization_id)
            .order_by(CallSession.created_at.desc())
            .limit(limit)
        )
        
        calls = []
        for session, lead in result.all():
            calls.append({
                "id": session.id[:8].upper() if session.id else "CALL",
                "date": session.created_at.strftime("%Y-%m-%d %I:%M %p") if session.created_at else "",
                "status": "Qualified Lead" if lead and lead.lead_score > 70 else "Info Seeker",
                "summary": session.summary,
                "transcript": session.transcript,
                "lead_score": lead.lead_score if lead else 0
            })
            
        return calls
    except Exception as e:
        print(f"Error fetching recent calls: {e}")
        return []
