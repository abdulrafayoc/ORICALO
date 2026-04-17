from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import os

from twilio.rest import Client
from app.db.session import get_db
from app.db_tables.crm import Lead, CallSession, ActionItem

router = APIRouter()

@router.get("/leads")
async def get_leads(db: AsyncSession = Depends(get_db)):
    """Fetch all leads representing CRM contacts."""
    result = await db.execute(select(Lead).order_by(Lead.updated_at.desc()))
    return result.scalars().all()

@router.get("/leads/{lead_id}")
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch a specific lead with its sessions and action items."""
    result = await db.execute(
        select(Lead)
        .options(selectinload(Lead.sessions), selectinload(Lead.action_items))
        .filter(Lead.id == lead_id)
    )
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@router.get("/sessions")
async def get_call_sessions(db: AsyncSession = Depends(get_db)):
    """Fetch all call sessions."""
    result = await db.execute(select(CallSession).order_by(CallSession.created_at.desc()))
    return result.scalars().all()

@router.get("/action_items")
async def get_action_items(db: AsyncSession = Depends(get_db)):
    """Fetch pending action items for CRM agents."""
    result = await db.execute(
        select(ActionItem)
        .options(selectinload(ActionItem.lead))
        .filter(ActionItem.status == "PENDING")
        .order_by(ActionItem.created_at.desc())
    )
    return result.scalars().all()

@router.post("/action_items/{item_id}/complete")
async def complete_action_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an action item as completed."""
    result = await db.execute(select(ActionItem).filter(ActionItem.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    
    item.status = "COMPLETED"
    
    # If this was a human call request, we also turn off "needs_human" on the lead optionally
    # But for now, just complete the task
    await db.commit()
    return {"status": "success", "message": "Action item completed"}

from pydantic import BaseModel
from typing import Optional

class CallRequest(BaseModel):
    public_url: str  # E.g. "my-ngrok.io"

class LeadBase(BaseModel):
    name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    status: str = "NEW"
    budget: Optional[str] = None
    location_pref: Optional[str] = None
    timeline: Optional[str] = None
    needs_human: bool = False
    lead_score: int = 0

class LeadCreate(LeadBase):
    pass

class LeadUpdate(LeadBase):
    pass

@router.post("/leads")
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Create a new manual lead."""
    new_lead = Lead(**payload.dict())
    db.add(new_lead)
    try:
        await db.commit()
        await db.refresh(new_lead)
        return new_lead
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/leads/{lead_id}")
async def update_lead(lead_id: int, payload: LeadUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing lead's properties."""
    result = await db.execute(select(Lead).filter(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    for key, value in payload.dict().items():
        setattr(lead, key, value)
        
    try:
        await db.commit()
        await db.refresh(lead)
        return lead
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a lead permanently, including its call history via cascade."""
    result = await db.execute(select(Lead).filter(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    try:
        await db.delete(lead)
        await db.commit()
        return {"status": "success", "message": "Lead deleted"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/leads/{lead_id}/outbound")
async def initiate_outbound_call(lead_id: int, payload: CallRequest, db: AsyncSession = Depends(get_db)):
    """Triggers Twilio to make an outbound call to the lead, bridging to our Voice AI."""
    result = await db.execute(select(Lead).filter(Lead.id == lead_id))
    lead = result.scalars().first()
    if not lead or not lead.phone_number:
        raise HTTPException(status_code=400, detail="Lead not found or missing phone number")
        
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_number = os.getenv("TWILIO_PHONE_NUMBER")
    
    if not twilio_number:
         raise HTTPException(status_code=500, detail="TWILIO_PHONE_NUMBER env variable is required.")
         
    try:
        client = Client(account_sid, auth_token)
        
        # Build the TwiML directly to route to the websocket
        twiml = f'''<Response>
    <Say voice="Polly.Aditi">As-salamu alaykum. Oricalo Agent is connecting, please wait.</Say>
    <Connect>
        <Stream url="wss://{payload.public_url}/ws/voice_agent" />
    </Connect>
</Response>'''

        call = client.calls.create(
            to=lead.phone_number,
            from_=twilio_number,
            twiml=twiml
        )
        return {"status": "success", "call_sid": call.sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


