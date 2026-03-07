import asyncio
import json
import sys
import os
from pathlib import Path
from sqlalchemy.future import select

# Ensure backend modules are visible
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from app.db.session import AsyncSessionLocal
from app.db_tables.listing import Listing

DATA_FILE = backend_dir / "data" / "rag" / "agency_listings.json"

async def seed_data():
    if not DATA_FILE.exists():
        print(f"❌ Data file not found at {DATA_FILE}")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"📦 Found {len(data)} listings to seed.")

    async with AsyncSessionLocal() as session:
        # Check if DB is empty
        result = await session.execute(select(Listing))
        existing = result.scalars().all()
        
        if existing:
            print(f"⚠️ Database already has {len(existing)} listings. Skipping seed.")
            return

        for item in data:
            listing = Listing(
                title=item.get("title"),
                description=item.get("description"),
                price=item.get("price"),
                location=item.get("location"),
                city=item.get("city"),
                type=item.get("type"),
                bedrooms=item.get("bedrooms"),
                baths=item.get("baths"),
                area=item.get("area"),
                features=item.get("features"), # SQLAlchemy JSON type handles list automatically
                agent_notes=item.get("agent_notes")
            )
            session.add(listing)
        
        await session.commit()
        print("✅ Database seeded successfully!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_data())
