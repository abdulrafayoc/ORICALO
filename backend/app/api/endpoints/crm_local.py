from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

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

