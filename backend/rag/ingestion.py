import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

from sqlalchemy.future import select

# Ensure backend modules are visible
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from rag.vector_store import build_index_from_listings
from app.db.session import AsyncSessionLocal
from app.db_tables.listing import Listing

def get_db_context():
    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def session_scope():
        async with AsyncSessionLocal() as session:
            yield session
    return session_scope

async def fetch_listings_from_db() -> List[Dict[str, Any]]:
    """Fetch all listings from SQLite database."""
    session_factory = get_db_context()
    async with session_factory() as session:
        result = await session.execute(select(Listing))
        listings = result.scalars().all()
        
        # Convert to list of dicts for vector store
        data = []
        for l in listings:
            data.append({
                "id": str(l.id),
                "title": l.title,
                "description": l.description,
                "price": l.price,
                "location": l.location,
                "city": l.city,
                "type": l.type,
                "bedrooms": l.bedrooms,
                "baths": l.baths,
                "area": l.area,
                "features": l.features, # Already JSON/list in model? It's JSON type in alchemy
                "agent_notes": l.agent_notes
            })
        return data

def ingest_data():
    """
    Ingest agency listings from DATABASE into vector store.
    """
    print("🚀 Starting Agency RAG Ingestion (from DB)...")
    
    # Run async fetch in sync wrapper
    try:
        listings = asyncio.run(fetch_listings_from_db())
    except Exception as e:
        print(f"❌ Database fetch failed: {e}")
        return

    print(f"✅ Loaded {len(listings)} listings from database.")

    if not listings:
        print("⚠️ No listings to ingest.")
        return

    # 3. Build/Update Vector Index
    try:
        count, cname = build_index_from_listings(listings)
        print(f"🎉 Successfully indexed {count} items into collection '{cname}'.")
    except Exception as e:
        print(f"❌ Error building index: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    ingest_data()

