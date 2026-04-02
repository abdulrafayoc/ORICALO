"""
Short-term session memory for ORICALO voice pipeline.
Accumulates conversation state in-memory during a WebSocket session
and persists to database at session end.
"""

import re
from datetime import datetime, timezone
from collections import defaultdict
from typing import List, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db_tables.conversation import (
    Conversation, ConversationTurn, ConversationEntity, RagRetrieval,
)


# PII redaction patterns (reused from analytics.py)
_PHONE_PATTERN = re.compile(r'(\+92|0|92)[-\s]?3\d{2}[-\s]?\d{7}')
_CNIC_PATTERN = re.compile(r'\d{5}[-\s]?\d{7}[-\s]?\d{1}')


def redact_pii(text: str) -> str:
    """Mask Pakistani phone numbers and CNICs."""
    text = _PHONE_PATTERN.sub('[REDACTED_PHONE]', text)
    text = _CNIC_PATTERN.sub('[REDACTED_CNIC]', text)
    return text


class SessionMemory:
    """In-memory accumulator for a single voice session."""

    def __init__(
        self,
        session_id: str,
        caller_id: Optional[int] = None,
        agent_id: Optional[int] = None,
        channel: str = "web",
    ):
        self.session_id = session_id
        self.caller_id = caller_id
        self.agent_id = agent_id
        self.channel = channel
        self.started_at = datetime.now(timezone.utc)

        self.turns: List[Dict] = []
        # Each: {turn_index, role, text, text_redacted, entities, rag_results, timestamp}

        self.accumulated_entities: Dict[str, set] = defaultdict(set)
        # e.g. {"location": {"DHA Phase 5"}, "budget": {"5 crore"}}

    def add_turn(
        self,
        role: str,
        text: str,
        entities: Optional[List[Dict]] = None,
        rag_results: Optional[List[Dict]] = None,
    ) -> int:
        """Record a conversation turn. Returns turn_index."""
        turn_index = len(self.turns)
        turn = {
            "turn_index": turn_index,
            "role": role,
            "text": text,
            "text_redacted": redact_pii(text),
            "entities": entities or [],
            "rag_results": rag_results or [],
            "timestamp": datetime.now(timezone.utc),
        }
        self.turns.append(turn)

        # Accumulate entities for context enrichment
        for ent in (entities or []):
            self.accumulated_entities[ent["type"]].add(ent["value"])

        return turn_index

    def get_context_summary(self) -> str:
        """Build natural-language summary of accumulated session context.
        Injected into LLM prompt for continuity."""
        parts = []

        if locs := self.accumulated_entities.get("location"):
            parts.append(f"User has asked about: {', '.join(locs)}")
        if budget := self.accumulated_entities.get("budget"):
            parts.append(f"Budget mentioned: {', '.join(budget)}")
        if prop_type := self.accumulated_entities.get("property_type"):
            parts.append(f"Property type interest: {', '.join(prop_type)}")
        if beds := self.accumulated_entities.get("bedrooms"):
            parts.append(f"Bedrooms: {', '.join(beds)}")
        if area := self.accumulated_entities.get("area"):
            parts.append(f"Area: {', '.join(area)}")

        # Track which listings have already been shown
        shown_listings = set()
        for t in self.turns:
            for r in t.get("rag_results", []):
                listing_id = r.get("id", "")
                if listing_id:
                    shown_listings.add(str(listing_id))
        if shown_listings:
            parts.append(f"Properties already shown: {', '.join(list(shown_listings)[:5])}")

        return "\n".join(parts) if parts else ""

    async def persist(self, db: AsyncSession) -> Conversation:
        """Flush entire session to database. Called once at session end."""
        ended_at = datetime.now(timezone.utc)
        duration = int((ended_at - self.started_at).total_seconds())

        conv = Conversation(
            session_id=self.session_id,
            caller_id=self.caller_id,
            agent_id=self.agent_id,
            started_at=self.started_at,
            ended_at=ended_at,
            duration_seconds=duration,
            total_turns=len(self.turns),
            channel=self.channel,
        )
        db.add(conv)
        await db.flush()  # get conv.id

        for t in self.turns:
            turn_obj = ConversationTurn(
                conversation_id=conv.id,
                turn_index=t["turn_index"],
                role=t["role"],
                text=t["text"],
                text_redacted=t["text_redacted"],
                timestamp=t["timestamp"],
            )
            db.add(turn_obj)
            await db.flush()  # get turn_obj.id

            for ent in t["entities"]:
                db.add(ConversationEntity(
                    turn_id=turn_obj.id,
                    entity_type=ent["type"],
                    entity_value=ent["value"],
                    confidence=ent.get("confidence"),
                ))

            for rag in t["rag_results"]:
                db.add(RagRetrieval(
                    turn_id=turn_obj.id,
                    listing_ref=str(rag.get("id", "")),
                    score=rag.get("score"),
                    snippet=str(rag.get("text", ""))[:200],
                ))

        await db.commit()
        return conv
