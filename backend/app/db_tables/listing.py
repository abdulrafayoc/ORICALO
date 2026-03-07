from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.db.base import Base

class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(String, nullable=True)  # Keeping flexible e.g. "2.5 Crore"
    location = Column(String, index=True, nullable=True)
    city = Column(String, index=True, nullable=True)
    type = Column(String, index=True, nullable=True) # House, Plot, Flat
    
    # Optional quantitative fields
    bedrooms = Column(Integer, nullable=True)
    baths = Column(Integer, nullable=True)
    area = Column(String, nullable=True) # e.g. "10 Marla"
    
    features = Column(JSON, nullable=True) # Store list of features as JSON
    agent_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
