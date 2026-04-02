from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    caller_id: Optional[int] = None
    conversation_id: Optional[int] = None
    listing_ref: Optional[str] = None
    feedback_type: str  # like, dislike, inquiry, conversion
    notes: Optional[str] = None
    rating: Optional[float] = None


class FeedbackOut(FeedbackCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
