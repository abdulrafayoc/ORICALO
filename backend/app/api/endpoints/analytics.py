from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import re
from llm import get_chatbot

router = APIRouter()

class CallTranscript(BaseModel):
    history: List[dict] # {role: str, text: str}

class AnalyticsResponse(BaseModel):
    redacted_transcript: List[dict]
    summary: str
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

    # Use LLM to summarize and extract qualification status
    # We instantiate a fresh chatbot to avoid state contamination
    analyzer = get_chatbot()
    prompt = f"""
Analyze the following real estate conversation.
Provide a 2-sentence summary of what the user wants.
Then, state if they are "Qualified Lead" or "Info Seeker".

Conversation:
{full_text_for_llm}

Output Format:
Summary: <your summary>
Status: <status>
"""
    analysis_text = analyzer.generate_response(prompt)
    
    # Quick parse
    summary = "Call processed."
    status = "Info Seeker"
    
    for line in analysis_text.split("\n"):
        if "Summary:" in line:
            summary = line.replace("Summary:", "").strip()
        if "Status:" in line:
            status = line.replace("Status:", "").strip()

    return AnalyticsResponse(
        redacted_transcript=redacted_history,
        summary=summary,
        qualification_status=status
    )
