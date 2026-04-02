from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.session import get_db
from app.db_tables.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackOut)
async def create_feedback(fb: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    db_fb = Feedback(**fb.model_dump())
    db.add(db_fb)
    await db.commit()
    await db.refresh(db_fb)
    return db_fb


@router.get("/caller/{caller_id}", response_model=List[FeedbackOut])
async def get_caller_feedback(caller_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.caller_id == caller_id)
        .order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()


@router.get("/conversation/{conversation_id}", response_model=List[FeedbackOut])
async def get_conversation_feedback(
    conversation_id: int, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.conversation_id == conversation_id)
        .order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()
