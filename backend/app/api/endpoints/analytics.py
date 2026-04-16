from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import re
import asyncio
from llm import get_chatbot

router = APIRouter()

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
async def process_call(transcript: CallTranscript):
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

    payload = AnalyticsResponse(
        redacted_transcript=redacted_history,
        summary=summary,
        budget=budget,
        location_preferences=location_preferences,
        timeline=timeline,
        lead_score=lead_score,
        qualification_status=status
    )
    
    # Asynchronously trigger the CRM integration webhook
    async def _post_crm():
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                await client.post("http://127.0.0.1:8000/crm/sync_call", json=payload.dict(), timeout=5.0)
        except Exception as e:
            print(f"[Analytics] CRM Webhook trigger failed: {e}")
            
    asyncio.create_task(_post_crm())

    return payload

