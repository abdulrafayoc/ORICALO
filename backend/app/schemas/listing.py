"""
Pydantic schemas for Agency Listing CRUD operations.
Mirrors the pattern used in schemas/agent.py.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class ListingBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    type: Optional[str] = None
    bedrooms: Optional[int] = None
    baths: Optional[int] = None
    area: Optional[str] = None
    features: Optional[List[str]] = None
    agent_notes: Optional[str] = None


class ListingCreate(ListingBase):
    pass


class ListingUpdate(ListingBase):
    pass


class ListingOut(ListingBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
