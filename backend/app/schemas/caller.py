from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class CallerBase(BaseModel):
    phone_number: str
    name: Optional[str] = None
    preferred_locations: Optional[List[str]] = None
    preferred_property_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_bedrooms: Optional[int] = None
    preferred_area_marla: Optional[float] = None


class CallerCreate(CallerBase):
    pass


class CallerUpdate(BaseModel):
    name: Optional[str] = None
    preferred_locations: Optional[List[str]] = None
    preferred_property_type: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    preferred_bedrooms: Optional[int] = None
    preferred_area_marla: Optional[float] = None


class CallerOut(CallerBase):
    id: int
    total_sessions: int
    last_session_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
