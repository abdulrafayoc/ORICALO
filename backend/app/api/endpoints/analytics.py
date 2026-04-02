from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
import re
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func as sa_func

from llm import get_chatbot
from app.db.session import get_db
from app.db_tables.conversation import Conversation, ConversationEntity
from app.db_tables.caller import Caller
from app.schemas.memory_analytics import (
    AnalyticsDashboard, AnalyticsKPIs, PopularArea,
    RecentConversation, EntityFrequency, HourlyUsage,
)

router = APIRouter()


# ============================================================================
# Existing models & helpers (kept for backward compatibility)
# ============================================================================

class CallTranscript(BaseModel):
    history: List[dict]  # {role: str, text: str}


class AnalyticsResponse(BaseModel):
    redacted_transcript: List[dict]
    summary: str
    qualification_status: str


def redact_pii(text: str) -> str:
    """Uses Regex to mask Phone Numbers and CNIC inside Urdu/English text."""
    phone_pattern = r'(\+92|0|92)[-\s]?3\d{2}[-\s]?\d{7}'
    text = re.sub(phone_pattern, '[REDACTED_PHONE]', text)
    cnic_pattern = r'\d{5}[-\s]?\d{7}[-\s]?\d{1}'
    text = re.sub(cnic_pattern, '[REDACTED_CNIC]', text)
    return text


# ============================================================================
# Existing endpoint (backward compatible)
# ============================================================================

@router.post("/process_call", response_model=AnalyticsResponse)
async def process_call(transcript: CallTranscript):
    redacted_history = []
    full_text_for_llm = ""

    for turn in transcript.history:
        safe_text = redact_pii(turn["text"])
        redacted_history.append({"role": turn["role"], "text": safe_text})
        full_text_for_llm += f"{turn['role'].upper()}: {safe_text}\n"

    analyzer = get_chatbot()
    prompt = f"""
Analyze the following real estate conversation.
Provide a 2-sentence summary of what the user wants.
Then, state if they are "Qualified Lead" or "Info Seeker".

Conversation:
{full_text_for_llm}

Output Format:
Summary: <your summary>
Status: <status>
"""
    analysis_text = await asyncio.to_thread(analyzer.generate_response, prompt)

    summary = "Call processed."
    status = "Info Seeker"

    for line in analysis_text.split("\n"):
        if "Summary:" in line:
            summary = line.replace("Summary:", "").strip()
        if "Status:" in line:
            status = line.replace("Status:", "").strip()

    return AnalyticsResponse(
        redacted_transcript=redacted_history,
        summary=summary,
        qualification_status=status,
    )


# ============================================================================
# New memory-powered analytics endpoints
# ============================================================================

@router.get("/dashboard", response_model=AnalyticsDashboard)
async def analytics_dashboard(db: AsyncSession = Depends(get_db)):
    """Aggregated analytics dashboard from conversation memory."""

    # KPIs
    total_calls_result = await db.execute(
        select(sa_func.count()).select_from(Conversation)
    )
    total_calls = total_calls_result.scalar() or 0

    qualified_result = await db.execute(
        select(sa_func.count())
        .select_from(Conversation)
        .where(Conversation.lead_status == "Qualified Lead")
    )
    qualified_leads = qualified_result.scalar() or 0

    avg_duration_result = await db.execute(
        select(sa_func.avg(Conversation.duration_seconds)).select_from(Conversation)
    )
    avg_duration = avg_duration_result.scalar() or 0.0

    total_callers_result = await db.execute(
        select(sa_func.count()).select_from(Caller)
    )
    total_callers = total_callers_result.scalar() or 0

    kpis = AnalyticsKPIs(
        total_calls=total_calls,
        qualified_leads=qualified_leads,
        avg_duration_seconds=float(avg_duration),
        total_callers=total_callers,
    )

    # Popular areas (top 10 locations mentioned)
    areas_result = await db.execute(
        select(
            ConversationEntity.entity_value,
            sa_func.count().label("cnt"),
        )
        .where(ConversationEntity.entity_type == "location")
        .group_by(ConversationEntity.entity_value)
        .order_by(sa_func.count().desc())
        .limit(10)
    )
    popular_areas = [
        PopularArea(location=row[0], mention_count=row[1])
        for row in areas_result.all()
    ]

    # Recent conversations (last 20)
    recent_result = await db.execute(
        select(Conversation, Caller.phone_number)
        .outerjoin(Caller, Conversation.caller_id == Caller.id)
        .order_by(Conversation.started_at.desc())
        .limit(20)
    )
    recent_conversations = [
        RecentConversation(
            id=conv.id,
            session_id=conv.session_id,
            caller_phone=phone,
            started_at=conv.started_at,
            duration_seconds=conv.duration_seconds,
            summary=conv.summary,
            lead_status=conv.lead_status,
        )
        for conv, phone in recent_result.all()
    ]

    return AnalyticsDashboard(
        kpis=kpis,
        popular_areas=popular_areas,
        recent_conversations=recent_conversations,
    )


@router.get("/entity-frequency", response_model=List[EntityFrequency])
async def entity_frequency(
    entity_type: str = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Entity/intent frequency for charts."""
    query = select(
        ConversationEntity.entity_type,
        ConversationEntity.entity_value,
        sa_func.count().label("cnt"),
    ).group_by(
        ConversationEntity.entity_type,
        ConversationEntity.entity_value,
    ).order_by(sa_func.count().desc()).limit(limit)

    if entity_type:
        query = query.where(ConversationEntity.entity_type == entity_type)

    result = await db.execute(query)
    return [
        EntityFrequency(entity_type=row[0], entity_value=row[1], count=row[2])
        for row in result.all()
    ]


@router.get("/peak-usage", response_model=List[HourlyUsage])
async def peak_usage(db: AsyncSession = Depends(get_db)):
    """Hourly distribution of calls."""
    # SQLite uses strftime, PostgreSQL uses EXTRACT — handle both
    try:
        # Try PostgreSQL-style first
        from sqlalchemy import extract
        result = await db.execute(
            select(
                extract("hour", Conversation.started_at).label("hr"),
                sa_func.count().label("cnt"),
            )
            .group_by("hr")
            .order_by("hr")
        )
    except Exception:
        # Fallback: return empty for SQLite (strftime not easily portable)
        return []

    return [
        HourlyUsage(hour=int(row[0]), call_count=row[1])
        for row in result.all()
    ]
