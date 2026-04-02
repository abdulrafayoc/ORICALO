from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class ConversationTurnOut(BaseModel):
    id: int
    turn_index: int
    role: str
    text_redacted: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    session_id: str
    caller_id: Optional[int] = None
    agent_id: Optional[int] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    summary: Optional[str] = None
    lead_status: str
    total_turns: int
    channel: str

    class Config:
        from_attributes = True


class ConversationDetailOut(ConversationOut):
    turns: List[ConversationTurnOut] = []
