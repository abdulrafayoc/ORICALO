from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.db.session import get_db
from app.db_tables.crm_contact import CRMContact
from app.db_tables.crm_call import CRMCall
from app.db_tables.crm_task import CRMTask
from app.schemas.crm import (
    ContactCreate, ContactRead, ContactUpdate,
    CallCreate, CallRead,
    TaskCreate, TaskRead, TaskUpdate
)

router = APIRouter(tags=["crm"])

# ====================================================================
# Contacts
# ====================================================================

@router.get("/contacts", response_model=List[ContactRead])
async def list_contacts(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CRMContact).order_by(CRMContact.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/contacts", response_model=ContactRead)
async def create_contact(contact: ContactCreate, db: AsyncSession = Depends(get_db)):
    # Check if exists by phone
    res = await db.execute(select(CRMContact).filter(CRMContact.phone == contact.phone))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Contact with this phone already exists")
    
    db_contact = CRMContact(**contact.dict())
    db.add(db_contact)
    await db.commit()
    await db.refresh(db_contact)
    return db_contact

@router.get("/contacts/{contact_id}", response_model=ContactRead)
async def get_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CRMContact).filter(CRMContact.id == contact_id))
    contact = res.scalars().first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.patch("/contacts/{contact_id}", response_model=ContactRead)
async def update_contact(contact_id: int, contact_update: ContactUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CRMContact).filter(CRMContact.id == contact_id))
    db_contact = res.scalars().first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contact, key, value)
    
    await db.commit()
    await db.refresh(db_contact)
    return db_contact

@router.get("/contacts/{contact_id}/calls", response_model=List[CallRead])
async def get_contact_calls(contact_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CRMCall).filter(CRMCall.contact_id == contact_id).order_by(CRMCall.created_at.desc()))
    return res.scalars().all()

# ====================================================================
# Calls
# ====================================================================

@router.get("/calls", response_model=List[CallRead])
async def list_calls(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CRMCall).order_by(CRMCall.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/calls/{call_id}", response_model=CallRead)
async def get_call(call_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CRMCall).filter(CRMCall.id == call_id))
    call = res.scalars().first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call

# ====================================================================
# Tasks
# ====================================================================

@router.get("/tasks", response_model=List[TaskRead])
async def list_tasks(completed: Optional[bool] = None, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(CRMTask)
    if completed is not None:
        query = query.filter(CRMTask.completed == completed)
    query = query.order_by(CRMTask.created_at.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.post("/tasks", response_model=TaskRead)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    db_task = CRMTask(**task.dict())
    db.add(db_task)
    await db.commit()
    await db.refresh(db_task)
    return db_task

@router.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(task_id: int, task_update: TaskUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(CRMTask).filter(CRMTask.id == task_id))
    db_task = res.scalars().first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    await db.commit()
    await db.refresh(db_task)
    return db_task

# ====================================================================
# Stats & Pipeline
# ====================================================================

@router.get("/stats")
async def get_crm_stats(db: AsyncSession = Depends(get_db)):
    # Total contacts
    total_contacts = await db.execute(select(func.count(CRMContact.id)))
    # Total calls
    total_calls = await db.execute(select(func.count(CRMCall.id)))
    # Active tasks
    active_tasks = await db.execute(select(func.count(CRMTask.id)).filter(CRMTask.completed == False))
    # Contacts by stage
    stages_res = await db.execute(select(CRMContact.stage, func.count(CRMContact.id)).group_by(CRMContact.stage))
    
    stages = {row[0]: row[1] for row in stages_res.all()}
    
    return {
        "total_contacts": total_contacts.scalar() or 0,
        "total_calls": total_calls.scalar() or 0,
        "active_tasks": active_tasks.scalar() or 0,
        "pipeline_stages": stages
    }

# ====================================================================
# Internal Utility (Called by Analytics)
# ====================================================================

async def sync_call_to_crm(
    db: AsyncSession,
    transcript: List[Dict[str, str]],
    summary: str,
    qualification_data: Dict[str, Any],
    lead_score: int,
    caller_phone: str,
    agent_id: Optional[int] = None
) -> int:
    """
    Called internally at the end of a voice call.
    1. Finds or creates Contact.
    2. Logs the Call.
    3. Auto-generates follow-up tasks if lead score is high.
    4. Auto-advances Pipeline stage.
    Returns the new CRMCall context ID.
    """
    if not caller_phone:
        return None

    # 1. UPSERT CONTACT
    res = await db.execute(select(CRMContact).filter(CRMContact.phone == caller_phone))
    contact = res.scalars().first()
    
    # Determine new stage
    new_stage = "new"
    if lead_score >= 80:
        new_stage = "qualified"
    elif lead_score >= 40:
        new_stage = "contacted"
        
    if contact:
        contact.lead_score = max(contact.lead_score or 0, lead_score)
        # Advance stage but don't regress it
        if contact.stage in ["new", "contacted"] and new_stage == "qualified":
            contact.stage = "qualified"
        elif contact.stage == "new" and new_stage == "contacted":
            contact.stage = "contacted"
        contact.agent_id = agent_id or contact.agent_id
    else:
        # Create new contact
        # Attempt to find name from transcript summary or prompt... for now leave None
        contact = CRMContact(
            phone=caller_phone,
            source="voice_call",
            stage=new_stage,
            lead_score=lead_score,
            agent_id=agent_id
        )
        db.add(contact)
    
    # Flush to get contact.id
    await db.flush()

    # 2. CREATE CALL RECORD
    call = CRMCall(
        contact_id=contact.id,
        agent_id=agent_id,
        transcript=transcript,
        summary=summary,
        lead_score=lead_score,
        qualification_data=qualification_data,
        caller_phone=caller_phone
    )
    db.add(call)
    await db.flush()

    # 3. AUTO-CREATE TASK (if qualified lead)
    if lead_score >= 60:
        task = CRMTask(
            contact_id=contact.id,
            agent_id=agent_id,
            title=f"Follow up with strong lead (Score: {lead_score})",
            priority="high" if lead_score >= 80 else "medium"
        )
        db.add(task)

    await db.commit()
    return call.id

