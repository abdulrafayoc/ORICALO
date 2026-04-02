"""
Long-term caller memory for ORICALO.
Manages caller profiles, preference learning, and conversation summarization.
"""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db_tables.caller import Caller
from app.services.entity_extractor import parse_budget_to_pkr
from app.services.session_memory import SessionMemory


class CallerMemory:
    """Manages long-term caller profile loading, enrichment, and updates."""

    @staticmethod
    async def get_or_create(db: AsyncSession, phone_number: str) -> Caller:
        """Load caller by phone number, create if first-time."""
        result = await db.execute(
            select(Caller).where(Caller.phone_number == phone_number)
        )
        caller = result.scalars().first()
        if not caller:
            caller = Caller(phone_number=phone_number, total_sessions=0)
            db.add(caller)
            await db.commit()
            await db.refresh(caller)
        return caller

    @staticmethod
    def build_profile_context(caller: Caller) -> str:
        """Build natural-language profile context for LLM system prompt injection."""
        if caller.total_sessions == 0:
            return "This is a new caller with no prior history."

        parts = [f"Returning caller (session #{caller.total_sessions + 1})."]

        if caller.preferred_locations:
            parts.append(
                f"Previously interested in: {', '.join(caller.preferred_locations)}."
            )
        if caller.budget_max:
            # Format large numbers readably
            budget_str = _format_pkr(caller.budget_max)
            parts.append(f"Budget up to: {budget_str}.")
        if caller.preferred_property_type:
            parts.append(f"Prefers: {caller.preferred_property_type}.")
        if caller.preferred_bedrooms:
            parts.append(f"Looking for {caller.preferred_bedrooms}-bedroom properties.")
        if caller.preferred_area_marla:
            parts.append(f"Area preference: {caller.preferred_area_marla} marla.")

        return " ".join(parts)

    @staticmethod
    async def update_preferences(
        db: AsyncSession,
        caller: Caller,
        session_memory: SessionMemory,
    ):
        """Update caller preferences based on accumulated session entities."""
        entities = session_memory.accumulated_entities

        # Merge locations (union with existing)
        if locs := entities.get("location"):
            existing = set(caller.preferred_locations or [])
            caller.preferred_locations = list(existing | locs)

        # Update budget (take the latest mentioned)
        if budgets := entities.get("budget"):
            latest = list(budgets)[-1]
            parsed = parse_budget_to_pkr(latest)
            if parsed > 0:
                caller.budget_max = parsed

        # Update property type (latest wins)
        if ptypes := entities.get("property_type"):
            caller.preferred_property_type = list(ptypes)[-1]

        # Update bedrooms
        if beds := entities.get("bedrooms"):
            try:
                caller.preferred_bedrooms = int(list(beds)[-1])
            except ValueError:
                pass

        # Update area
        if areas := entities.get("area"):
            import re
            latest_area = list(areas)[-1]
            match = re.search(r'(\d+\.?\d*)', latest_area)
            if match:
                caller.preferred_area_marla = float(match.group(1))

        caller.total_sessions += 1
        caller.last_session_at = datetime.now(timezone.utc)
        await db.commit()

    @staticmethod
    async def generate_summary(
        session_memory: SessionMemory,
        llm_engine,
    ) -> str:
        """Generate conversation summary via LLM at session end."""
        if not session_memory.turns:
            return "Empty session."

        transcript = "\n".join(
            f"{t['role'].upper()}: {t['text_redacted']}"
            for t in session_memory.turns
        )

        prompt = (
            "Summarize this real estate conversation in 2-3 sentences in English. "
            "Focus on: what the caller wants, locations mentioned, budget, and outcome.\n\n"
            f"Conversation:\n{transcript}\n\nSummary:"
        )

        try:
            summary = await asyncio.to_thread(llm_engine.generate_response, prompt)
            return summary.strip()
        except Exception as e:
            return f"Summary generation failed: {str(e)[:100]}"


def _format_pkr(amount: float) -> str:
    """Format a PKR amount readably (e.g. 50000000 -> '5 Crore')."""
    if amount >= 10_000_000:
        return f"{amount / 10_000_000:.1f} Crore PKR"
    elif amount >= 100_000:
        return f"{amount / 100_000:.1f} Lakh PKR"
    else:
        return f"{amount:,.0f} PKR"
