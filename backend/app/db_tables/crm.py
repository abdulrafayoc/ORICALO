from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, nullable=True)
    
    status = Column(String, default="NEW", index=True) # NEW, COLD, WARM, HOT, CLOSED
    needs_human = Column(Boolean, default=False)
    
    budget = Column(String, nullable=True)
    location_pref = Column(String, nullable=True)
    timeline = Column(String, nullable=True)
    lead_score = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    organization = relationship("Organization", back_populates="leads")

    # Relationships
    sessions = relationship("CallSession", back_populates="lead", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="lead", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="lead", cascade="all, delete-orphan")


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(String, primary_key=True, index=True) # UUID string
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    
    direction = Column(String, default="INBOUND") # INBOUND, OUTBOUND
    transcript = Column(JSON) # Array of {role: text}
    summary = Column(Text, nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    lead = relationship("Lead", back_populates="sessions")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    
    task_type = Column(String) # FOLLOW_UP, HUMAN_CALL, SEND_DOCS
    description = Column(Text, nullable=True)
    status = Column(String, default="PENDING") # PENDING, COMPLETED
    
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lead = relationship("Lead", back_populates="action_items")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    
    meeting_type = Column(String) # VISIT, CALL, VIDEO
    title = Column(String, nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    scheduled_time = Column(String, nullable=False) # HH:MM format
    duration_minutes = Column(Integer, default=60)
    
    status = Column(String, default="SCHEDULED") # SCHEDULED, COMPLETED, CANCELLED, NO_SHOW
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lead = relationship("Lead", back_populates="meetings")
