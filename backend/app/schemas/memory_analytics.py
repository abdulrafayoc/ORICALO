from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class AnalyticsKPIs(BaseModel):
    total_calls: int
    qualified_leads: int
    avg_duration_seconds: float
    total_callers: int
    pii_redaction_rate: float = 1.0  # always applied


class PopularArea(BaseModel):
    location: str
    mention_count: int


class RecentConversation(BaseModel):
    id: int
    session_id: str
    caller_phone: Optional[str] = None
    started_at: datetime
    duration_seconds: Optional[int] = None
    summary: Optional[str] = None
    lead_status: str


class AnalyticsDashboard(BaseModel):
    kpis: AnalyticsKPIs
    popular_areas: List[PopularArea]
    recent_conversations: List[RecentConversation]


class EntityFrequency(BaseModel):
    entity_type: str
    entity_value: str
    count: int


class HourlyUsage(BaseModel):
    hour: int
    call_count: int
