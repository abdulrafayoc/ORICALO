from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json

router = APIRouter()

class CallMetadata(BaseModel):
    phone_number: Optional[str] = None
    call_duration_seconds: Optional[int] = None

class CRMSyncPayload(BaseModel):
    redacted_transcript: List[dict]
    summary: str
    budget: str
    location_preferences: str
    timeline: str
    lead_score: int
    qualification_status: str
    metadata: Optional[CallMetadata] = None

@router.post("/sync_call")
async def sync_call_to_crm(payload: CRMSyncPayload):
    """
    Webhook receiver that mimics sending data to a custom CRM.
    In a real implementation, this would trigger an external REST API (e.g., FollowUpBoss).
    """
    print("="*50)
    print("🚀 [CRM Integration] RECEIVED NEW CALL SYNC")
    print("="*50)
    
    # 1. Identity Resolution (Mock)
    phone = payload.metadata.phone_number if payload.metadata and payload.metadata.phone_number else "Unknown Caller"
    print(f"👤 Identity: {phone}")
    
    # 2. Assign dynamic tags based on the structured metrics
    tags = ["Oricalo Voice AI"]
    if payload.lead_score >= 80:
        tags.append("🔥 Hot Lead")
    elif payload.lead_score >= 40:
        tags.append("🌤️ Warm Lead")
    else:
        tags.append("🧊 Cold / Info Seeker")
        
    print(f"🏷️ Assigned Tags: {tags}")
    print(f"💰 Budget: {payload.budget}")
    print(f"📍 Location: {payload.location_preferences}")
    print(f"⏳ Timeline: {payload.timeline}")
    
    # 3. Create Note payload
    crm_note = {
        "summary": payload.summary,
        "full_transcript_length": len(payload.redacted_transcript)
    }
    
    print("\n📝 Pushing Note to CRM Mock Interface...")
    print(json.dumps(crm_note, indent=2))
    print("="*50)
    
    return {"status": "success", "crm_id": "mock_id_99218", "tags_applied": tags}
