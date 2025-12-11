from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db_tables.listing import Listing

router = APIRouter(tags=["agency"])

# --- schemas ---
class ListingBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    type: Optional[str] = None
    bedrooms: Optional[int] = None
    baths: Optional[int] = None
    area: Optional[str] = None
    features: Optional[List[str]] = None
    agent_notes: Optional[str] = None

class ListingCreate(ListingBase):
    pass

class ListingUpdate(ListingBase):
    pass

class ListingOut(ListingBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# --- endpoints ---

@router.get("/agency/listings", response_model=List[ListingOut])
async def get_listings(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Listing).offset(skip).limit(limit))
    listings = result.scalars().all()
    return listings

@router.post("/agency/listings", response_model=ListingOut)
async def create_listing(
    payload: ListingCreate, 
    db: AsyncSession = Depends(get_db)
):
    new_listing = Listing(**payload.dict())
    db.add(new_listing)
    await db.commit()
    await db.refresh(new_listing)
    return new_listing

@router.get("/agency/listings/{id}", response_model=ListingOut)
async def get_listing(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).filter(Listing.id == id))
    listing = result.scalars().first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@router.delete("/agency/listings/{id}")
async def delete_listing(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Listing).filter(Listing.id == id))
    listing = result.scalars().first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    await db.delete(listing)
    await db.commit()
    return {"message": "Listing deleted successfully"}

@router.put("/agency/listings/{id}", response_model=ListingOut)
async def update_listing(
    id: int, 
    payload: ListingUpdate, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Listing).filter(Listing.id == id))
    listing = result.scalars().first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(listing, key, value)
        
    await db.commit()
    await db.refresh(listing)
    return listing
