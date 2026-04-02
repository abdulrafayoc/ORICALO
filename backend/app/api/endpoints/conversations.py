from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.db.session import get_db
from app.db_tables.conversation import Conversation, ConversationTurn
from app.schemas.conversation import ConversationOut, ConversationDetailOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("/", response_model=List[ConversationOut])
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    caller_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation).order_by(Conversation.started_at.desc())
    if caller_id is not None:
        query = query.where(Conversation.caller_id == caller_id)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
async def get_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.turns))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalars().first()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/caller/{caller_id}", response_model=List[ConversationOut])
async def get_caller_conversations(
    caller_id: int,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.caller_id == caller_id)
        .order_by(Conversation.started_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
