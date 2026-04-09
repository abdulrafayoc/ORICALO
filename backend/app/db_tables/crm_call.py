from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class CRMCall(Base):
    __tablename__ = "crm_calls"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("crm_contacts.id"), nullable=True) # Could be nullable if caller hangs up immediately before we know who they are, but generally we create contact first
    agent_id = Column(Integer, nullable=True)
    
    transcript = Column(JSON, nullable=True) # list of {role, text}
    summary = Column(Text, nullable=True)
    lead_score = Column(Integer, default=0)
    qualification_data = Column(JSON, nullable=True) # {budget_lakh, timeline_months, location, property_type, bedrooms}
    
    duration_secs = Column(Integer, nullable=True)
    caller_phone = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
