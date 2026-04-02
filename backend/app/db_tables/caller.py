from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Caller(Base):
    __tablename__ = "callers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)

    # Learned preferences (updated after each session)
    preferred_locations = Column(JSON, nullable=True)       # ["DHA Phase 5", "Bahria Town"]
    preferred_property_type = Column(String(50), nullable=True)  # House, Plot, Flat
    budget_min = Column(Float, nullable=True)                # in PKR
    budget_max = Column(Float, nullable=True)
    preferred_bedrooms = Column(Integer, nullable=True)
    preferred_area_marla = Column(Float, nullable=True)
    custom_preferences = Column(JSON, nullable=True)         # freeform dict

    total_sessions = Column(Integer, default=0)
    last_session_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    conversations = relationship("Conversation", back_populates="caller")
    feedback = relationship("Feedback", back_populates="caller")
