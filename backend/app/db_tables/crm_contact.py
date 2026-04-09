from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class CRMContact(Base):
    __tablename__ = "crm_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    source = Column(String, default="voice_call") 
    stage = Column(String, default="new") # "new", "contacted", "qualified", "viewing", "closed_won", "closed_lost"
    lead_score = Column(Integer, default=0)
    agent_id = Column(Integer, nullable=True) # Optional link to which agent handled them
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
