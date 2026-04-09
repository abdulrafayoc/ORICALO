from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.sql import func
from app.db.base import Base

class CRMTask(Base):
    __tablename__ = "crm_tasks"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("crm_contacts.id"), nullable=False)
    agent_id = Column(Integer, nullable=True)
    
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=True)
    completed = Column(Boolean, default=False)
    priority = Column(String, default="medium") # "high", "medium", "low"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
