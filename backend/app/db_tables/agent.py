from sqlalchemy import Column, Integer, String, Boolean, Text
from app.db.base import Base

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slug = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    system_prompt = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
