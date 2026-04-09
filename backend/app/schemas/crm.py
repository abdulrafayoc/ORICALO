from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# --- Contact Schemas ---
class ContactBase(BaseModel):
    name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    source: str = "voice_call"
    stage: str = "new"
    lead_score: int = 0
    agent_id: Optional[int] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    stage: Optional[str] = None
    lead_score: Optional[int] = None

class ContactRead(ContactBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Call Schemas ---
class QualificationData(BaseModel):
    budget_lakh: Optional[float] = None
    timeline_months: Optional[int] = None
    location_preference: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    intent_strength: Optional[str] = None # "high", "medium", "low"

class CallBase(BaseModel):
    contact_id: Optional[int] = None
    agent_id: Optional[int] = None
    transcript: Optional[List[Dict[str, str]]] = None # list of {role, text}
    summary: Optional[str] = None
    lead_score: int = 0
    qualification_data: Optional[Dict[str, Any]] = None
    duration_secs: Optional[int] = None
    caller_phone: Optional[str] = None

class CallCreate(CallBase):
    pass

class CallRead(CallBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    contact_id: int
    agent_id: Optional[int] = None
    title: str
    due_date: Optional[date] = None
    completed: bool = False
    priority: str = "medium"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None

class TaskRead(TaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
