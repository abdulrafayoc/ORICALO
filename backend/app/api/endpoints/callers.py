from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.db.session import get_db
from app.db_tables.caller import Caller
from app.schemas.caller import CallerCreate, CallerUpdate, CallerOut

router = APIRouter(prefix="/callers", tags=["callers"])


@router.get("/", response_model=List[CallerOut])
async def list_callers(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Caller).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/", response_model=CallerOut)
async def create_caller(caller: CallerCreate, db: AsyncSession = Depends(get_db)):
    # Check if phone already exists
    existing = await db.execute(
        select(Caller).where(Caller.phone_number == caller.phone_number)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    db_caller = Caller(**caller.model_dump())
    db.add(db_caller)
    await db.commit()
    await db.refresh(db_caller)
    return db_caller


@router.get("/phone/{phone_number}", response_model=CallerOut)
async def get_caller_by_phone(phone_number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Caller).where(Caller.phone_number == phone_number)
    )
    caller = result.scalars().first()
    if caller is None:
        raise HTTPException(status_code=404, detail="Caller not found")
    return caller


@router.get("/{caller_id}", response_model=CallerOut)
async def get_caller(caller_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Caller).where(Caller.id == caller_id))
    caller = result.scalars().first()
    if caller is None:
        raise HTTPException(status_code=404, detail="Caller not found")
    return caller


@router.put("/{caller_id}", response_model=CallerOut)
async def update_caller(
    caller_id: int, update: CallerUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Caller).where(Caller.id == caller_id))
    db_caller = result.scalars().first()
    if db_caller is None:
        raise HTTPException(status_code=404, detail="Caller not found")

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(db_caller, key, value)

    await db.commit()
    await db.refresh(db_caller)
    return db_caller


@router.delete("/{caller_id}")
async def delete_caller(caller_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Caller).where(Caller.id == caller_id))
    db_caller = result.scalars().first()
    if db_caller is None:
        raise HTTPException(status_code=404, detail="Caller not found")

    await db.delete(db_caller)
    await db.commit()
    return {"ok": True}
