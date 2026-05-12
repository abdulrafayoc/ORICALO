from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class PlanTier(str, enum.Enum):
    starter = "starter"
    pro = "pro"
    enterprise = "enterprise"

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=False, index=True)
    plan = Column(SAEnum(PlanTier), default=PlanTier.starter, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    members = relationship("User", back_populates="organization")
    agents = relationship("Agent", back_populates="organization")
    leads = relationship("Lead", back_populates="organization")
    listings = relationship("Listing", back_populates="organization")
