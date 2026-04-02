from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    caller_id = Column(Integer, ForeignKey("callers.id"), nullable=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True, index=True)
    listing_ref = Column(String(50), nullable=True)         # ChromaDB doc ID or listing.id

    feedback_type = Column(String(20), nullable=False)      # like, dislike, inquiry, conversion
    notes = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)                   # 1-5 scale

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    caller = relationship("Caller", back_populates="feedback")
