from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    caller_id = Column(Integer, ForeignKey("callers.id"), nullable=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    summary = Column(Text, nullable=True)                   # LLM-generated at session end
    lead_status = Column(String(20), default="Info Seeker")  # Info Seeker, Qualified Lead, Converted, Lost
    total_turns = Column(Integer, default=0)
    channel = Column(String(20), default="web")              # web, telephony

    metadata_ = Column("metadata", JSON, nullable=True)

    # Relationships
    caller = relationship("Caller", back_populates="conversations")
    turns = relationship(
        "ConversationTurn",
        back_populates="conversation",
        order_by="ConversationTurn.turn_index",
    )


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    turn_index = Column(Integer, nullable=False)
    role = Column(String(10), nullable=False)               # "user" or "agent"
    text = Column(Text, nullable=False)
    text_redacted = Column(Text, nullable=True)             # PII-redacted version
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("Conversation", back_populates="turns")
    entities = relationship("ConversationEntity", back_populates="turn")
    rag_retrievals = relationship("RagRetrieval", back_populates="turn")


class ConversationEntity(Base):
    __tablename__ = "conversation_entities"

    id = Column(Integer, primary_key=True, index=True)
    turn_id = Column(Integer, ForeignKey("conversation_turns.id"), nullable=False, index=True)
    entity_type = Column(String(30), nullable=False, index=True)
    # Types: location, budget, property_type, bedrooms, area, intent
    entity_value = Column(String(200), nullable=False)
    confidence = Column(Float, nullable=True)

    turn = relationship("ConversationTurn", back_populates="entities")


class RagRetrieval(Base):
    __tablename__ = "rag_retrievals"

    id = Column(Integer, primary_key=True, index=True)
    turn_id = Column(Integer, ForeignKey("conversation_turns.id"), nullable=False, index=True)
    listing_ref = Column(String(50), nullable=False)        # ChromaDB doc ID
    score = Column(Float, nullable=True)
    snippet = Column(Text, nullable=True)                   # first 200 chars

    turn = relationship("ConversationTurn", back_populates="rag_retrievals")
