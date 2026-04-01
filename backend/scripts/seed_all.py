"""
ORICALO PoC Data Seeder
=======================
Seeds EVERYTHING needed for a working demo in one shot:
  1. SQLite database (agents + listings tables)
  2. ChromaDB RAG vector store (property listings for semantic search)

Usage (from backend/ directory):
  python scripts/seed_all.py
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Ensure backend modules are visible
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.db_tables.agent import Agent
from app.db_tables.listing import Listing
from sqlalchemy.future import select


# ============================================================================
# Sample Data — Agents
# ============================================================================

AGENTS = [
    {
        "name": "Inbound Inquiry Agent",
        "slug": "inbound-inquiry",
        "description": "Handles general property inquiries and questions.",
        "system_prompt": """آپ ایک شائستہ اور ماہر رئیل اسٹیٹ ایجنٹ ہیں جو پاکستان کے شہری علاقوں میں پراپرٹی خریدنے اور بیچنے میں مدد کرتے ہیں۔

آپ کے فرائض:
1. کلائنٹ کی ضروریات سمجھنا (بجٹ، مقام، پراپرٹی کی قسم)
2. مناسب پراپرٹیز تجویز کرنا
3. قیمتوں اور علاقوں کے بارے میں معلومات دینا
4. سوالات کا جواب دینا

قواعد:
- جواب مختصر اور مؤثر اردو میں دیں
- شائستہ لہجہ برقرار رکھیں
- اگر ضرورت ہو تو واضح سوالات پوچھیں
- کبھی غلط معلومات نہ دیں"""
    },
    {
        "name": "Outbound Lead Qualifier",
        "slug": "outbound-lead",
        "description": "Validates leads and qualifies interest.",
        "system_prompt": """آپ ایک پرو ایکٹو رئیل اسٹیٹ سیلز ایجنٹ ہیں۔ آپ کا کام لیڈز کو کال کر کے ان کی دلچسپی اور بجٹ معلوم کرنا ہے۔

طریقہ کار:
1. سلام کریں اور تعارف کروائیں۔
2. پوچھیں کہ کیا وہ ابھی پراپرٹی دیکھ رہے ہیں۔
3. بجٹ اور وقت کا تعین کریں۔
4. اگر وہ سنجیدہ ہوں تو میٹنگ طے کرنے کی کوشش کریں۔

لہجہ:
- پیشہ ورانہ لیکن دوستانہ
- مختصر سوالات
- جب وہ بولیں تو غور سے سنیں"""
    },
    {
        "name": "Price Estimation Expert",
        "slug": "price-expert",
        "description": "Specialized in providing accurate valuations.",
        "system_prompt": """آپ پراپرٹی کی قیمتوں کے ماہر تجزیہ کار ہیں۔ آپ کا واحد کام مارکیٹ کی قیمتوں کا درست تخمینہ لگانا ہے۔

آپ کو درج ذیل معلومات درکار ہیں:
- علاقہ (DHA, Bahria وغیرہ)
- رقبہ (مرلہ، کنال)
- قسم (گھر، پلاٹ)

جواب دینے کا طریقہ:
- صرف وہی بات کریں جو قیمت سے متعلق ہو۔
- ہمیشہ ایک رینج (range) بتائیں (مثلاً 2 کروڑ سے 2.2 کروڑ)۔
- اعتماد کے ساتھ بات کریں لیکن اگر معلومات کم ہوں تو مزید پوچھیں۔"""
    }
]


# ============================================================================
# Sample Data — Property Listings (expanded set for a richer demo)
# ============================================================================

LISTINGS = [
    {
        "id": "ag-001",
        "title": "Modern 1 Kanal Luxury Villa in DHA Phase 6",
        "description": "Exquisite 1 Kanal designer house featuring 5 master bedrooms, imported fittings, Italian kitchen, swimming pool, and lush green lawn. Located in a prime block near the main boulevard.",
        "price": "PKR 8.5 Crore",
        "location": "DHA Phase 6, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 5,
        "baths": 6,
        "area": "1 Kanal",
        "features": ["Swimming Pool", "Servant Quarter", "Double Kitchen", "Corner Plot"],
        "agent_notes": "Owner migrating, urgent sale. Price slightly negotiable."
    },
    {
        "id": "ag-002",
        "title": "Brand New 10 Marla House in Bahria Town Sector C",
        "description": "Solidly constructed 10 Marla double unit house. 4 bedrooms with attached baths. Tiled flooring, solid wood work. Close to mosque and park.",
        "price": "PKR 4.2 Crore",
        "location": "Bahria Town Sector C, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 4,
        "baths": 5,
        "area": "10 Marla",
        "features": ["Double Unit", "Near Park", "Gas Available"],
        "agent_notes": "Best for rental income."
    },
    {
        "id": "ag-003",
        "title": "Prime 2 Kanal Residential Plot in DHA Phase 8",
        "description": "Golden investment opportunity. 2 Kanal possession plot in Park View block. Direct approach from ring road.",
        "price": "PKR 12 Crore",
        "location": "DHA Phase 8, Lahore",
        "city": "Lahore",
        "type": "Plot",
        "bedrooms": 0,
        "baths": 0,
        "area": "2 Kanal",
        "features": ["Possession", "Park View", "Investment Grade"],
        "agent_notes": "Balloted plot, ready for construction."
    },
    {
        "id": "ag-004",
        "title": "Luxury Apartment in Goldcrest Mall",
        "description": "2 Bedroom furnished apartment on 10th floor. Panoramic view of the city. High-end finishes, central air conditioning, and gym access.",
        "price": "PKR 2.8 Crore",
        "location": "DHA Phase 4, Lahore",
        "city": "Lahore",
        "type": "Flat",
        "bedrooms": 2,
        "baths": 2,
        "area": "1200 Sqft",
        "features": ["Furnished", "Gym", "Mall Access", "Security"],
        "agent_notes": "Currently rented at 1.5 Lakh/month."
    },
    {
        "id": "ag-005",
        "title": "Affordable 5 Marla House in Lake City",
        "description": "Beautiful 5 Marla house M-7 sector. 3 bedrooms, modern elevation. Gated community with 24/7 electricity.",
        "price": "PKR 2.1 Crore",
        "location": "Lake City, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 3,
        "baths": 3,
        "area": "5 Marla",
        "features": ["Gated Community", "No Load Shedding"],
        "agent_notes": "Good startup home."
    },
    # ------ Additional listings for a richer PoC demo ------
    {
        "id": "ag-006",
        "title": "10 Marla Plot in DHA Phase 5 Extension",
        "description": "Ideal residential plot in D-block. Nearby park, school, and commercial area. All dues cleared.",
        "price": "PKR 3.5 Crore",
        "location": "DHA Phase 5, Lahore",
        "city": "Lahore",
        "type": "Plot",
        "bedrooms": 0,
        "baths": 0,
        "area": "10 Marla",
        "features": ["Developed", "Near School", "Corner"],
        "agent_notes": "Quick possession available."
    },
    {
        "id": "ag-007",
        "title": "Spacious 1 Kanal House in Model Town",
        "description": "Well-maintained 1 Kanal house in Block L. 6 bedrooms, 3 living rooms, beautiful garden. Classic Lahore architecture with modern amenities.",
        "price": "PKR 11 Crore",
        "location": "Model Town, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 6,
        "baths": 7,
        "area": "1 Kanal",
        "features": ["Garden", "Marble Flooring", "Store Room", "Triple Kitchen"],
        "agent_notes": "Ideal for joint family. Rare availability in Model Town."
    },
    {
        "id": "ag-008",
        "title": "3 Bedroom Apartment in Askari 11",
        "description": "Renovated 10 Marla flat on 3rd floor. 3 bedrooms, drawing room, servant quarter. Army-maintained community with excellent security.",
        "price": "PKR 1.8 Crore",
        "location": "Askari 11, Lahore",
        "city": "Lahore",
        "type": "Flat",
        "bedrooms": 3,
        "baths": 3,
        "area": "10 Marla",
        "features": ["Security", "Community Park", "Near CMH"],
        "agent_notes": "Great for families. Controlled entry/exit."
    },
    {
        "id": "ag-009",
        "title": "Commercial Shop in Johar Town Phase 2",
        "description": "Ground floor shop in G1 Market. 400 sqft covered area. High foot traffic location, ideal for retail or clinic.",
        "price": "PKR 1.2 Crore",
        "location": "Johar Town Phase 2, Lahore",
        "city": "Lahore",
        "type": "Commercial",
        "bedrooms": 0,
        "baths": 1,
        "area": "400 Sqft",
        "features": ["Ground Floor", "Main Road", "Parking"],
        "agent_notes": "Currently vacant, ready for business."
    },
    {
        "id": "ag-010",
        "title": "5 Marla House in Gulberg III",
        "description": "Renovated 5 Marla house on main road. 3 bedrooms, ideal for commercial conversion. Walking distance to MM Alam Road.",
        "price": "PKR 6 Crore",
        "location": "Gulberg III, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 3,
        "baths": 3,
        "area": "5 Marla",
        "features": ["Main Road", "Commercial Potential", "Near MM Alam"],
        "agent_notes": "Premium location. Price reflects commercial value."
    },
    {
        "id": "ag-011",
        "title": "10 Marla House in Bahria Orchard Phase 1",
        "description": "Brand new 10 Marla house in OLC-A block. Modern design, 4 beds with attached baths, solar panels installed. Low maintenance community.",
        "price": "PKR 2.9 Crore",
        "location": "Bahria Orchard Phase 1, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 4,
        "baths": 4,
        "area": "10 Marla",
        "features": ["Solar Panels", "Brand New", "Gated Community"],
        "agent_notes": "Best value in Bahria. Owner-built."
    },
    {
        "id": "ag-012",
        "title": "1 Kanal House in F-7 Islamabad",
        "description": "Prestigious 1 Kanal house in F-7/2. 7 bedrooms, 3 stories, basement. Marble and granite throughout. Walking distance to Faisal Mosque.",
        "price": "PKR 18 Crore",
        "location": "F-7, Islamabad",
        "city": "Islamabad",
        "type": "House",
        "bedrooms": 7,
        "baths": 8,
        "area": "1 Kanal",
        "features": ["Basement", "Marble", "Near Faisal Mosque", "3 Stories"],
        "agent_notes": "Top-tier location. Embassy area."
    },
    {
        "id": "ag-013",
        "title": "500 Sq Yard Bungalow in DHA Phase 6 Karachi",
        "description": "Stunning 500 sq yard bungalow in Khayaban-e-Rahat. 5 bedrooms, swimming pool, home theater. Architectural masterpiece.",
        "price": "PKR 14 Crore",
        "location": "DHA Phase 6, Karachi",
        "city": "Karachi",
        "type": "House",
        "bedrooms": 5,
        "baths": 6,
        "area": "500 Sq Yards",
        "features": ["Swimming Pool", "Home Theater", "Architect Designed"],
        "agent_notes": "Seafacing direction. Can arrange virtual tour."
    },
    {
        "id": "ag-014",
        "title": "3 Marla House in Cantt Lahore",
        "description": "Compact 3 Marla house near Lahore Cantt station. 2 bedrooms, fully renovated. Good rental income area.",
        "price": "PKR 1.4 Crore",
        "location": "Cantt, Lahore",
        "city": "Lahore",
        "type": "House",
        "bedrooms": 2,
        "baths": 2,
        "area": "3 Marla",
        "features": ["Renovated", "Near Station", "Commercial Zone"],
        "agent_notes": "Budget-friendly investment. High demand rental area."
    },
    {
        "id": "ag-015",
        "title": "1 Kanal Farm House in Bedian Road",
        "description": "Scenic 1 Kanal farmhouse with 3 bedrooms, lush gardens, BBQ area, and fish pond. Perfect weekend retreat 20 min from DHA.",
        "price": "PKR 3.5 Crore",
        "location": "Bedian Road, Lahore",
        "city": "Lahore",
        "type": "Farm House",
        "bedrooms": 3,
        "baths": 3,
        "area": "1 Kanal",
        "features": ["Garden", "BBQ Area", "Fish Pond", "Weekend Retreat"],
        "agent_notes": "Great for events. Rent potential for weddings."
    },
]


# ============================================================================
# Seeding Functions
# ============================================================================

async def seed_agents():
    """Seed agent personas into the SQLite database."""
    print("\n📋 Seeding Agents...")
    async with AsyncSessionLocal() as session:
        for agent_data in AGENTS:
            result = await session.execute(select(Agent).filter(Agent.slug == agent_data["slug"]))
            existing = result.scalars().first()
            if not existing:
                agent = Agent(**agent_data)
                session.add(agent)
                print(f"  ✅ Created: {agent_data['name']}")
            else:
                print(f"  ⏭️  Exists:  {agent_data['name']}")
        await session.commit()
    print("✅ Agents seeded.\n")


async def seed_listings():
    """Seed property listings into the SQLite database."""
    print("🏠 Seeding Listings (SQLite)...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Listing))
        existing = result.scalars().all()
        
        if existing:
            print(f"  ⏭️  Database already has {len(existing)} listings. Skipping.")
        else:
            for item in LISTINGS:
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
                    features=item.get("features"),
                    agent_notes=item.get("agent_notes")
                )
                session.add(listing)
            await session.commit()
            print(f"  ✅ Inserted {len(LISTINGS)} listings.")
    print("✅ Listings seeded.\n")


def seed_rag_vector_store():
    """Seed property listings into the ChromaDB vector store for RAG retrieval."""
    print("🧠 Seeding RAG Vector Store (ChromaDB)...")
    
    from rag.vector_store import build_index_from_listings, get_collection_stats
    
    # Check if already seeded
    stats = get_collection_stats()
    if stats.get("count", 0) > 0:
        print(f"  ⏭️  Vector store already has {stats['count']} documents.")
        answer = input("  ❓ Re-seed? (y/N): ").strip().lower()
        if answer != 'y':
            print("  Skipping RAG seeding.\n")
            return

    # Also try to load the larger zameen.com corpus if available
    all_listings = list(LISTINGS)  # Start with our curated listings
    
    zameen_corpus_path = backend_dir / "test_corpus.jsonl"
    if zameen_corpus_path.exists():
        print(f"  📂 Found zameen.com corpus at {zameen_corpus_path.name}")
        count = 0
        with open(zameen_corpus_path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    row = json.loads(line.strip())
                    if row:
                        all_listings.append(row)
                        count += 1
                except (json.JSONDecodeError, Exception):
                    pass
        print(f"     Loaded {count} additional listings from corpus.")
    
    # Build the index
    total, collection = build_index_from_listings(all_listings)
    
    print(f"  ✅ Indexed {total} documents into collection '{collection}'.")
    print("✅ RAG Vector Store seeded.\n")


async def create_tables():
    """Ensure all DB tables exist."""
    print("🗄️  Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  ✅ Tables ready.\n")


# ============================================================================
# Main
# ============================================================================

async def main():
    print("=" * 60)
    print("  ORICALO PoC Data Seeder")
    print("=" * 60)
    
    # 1. Create DB tables
    await create_tables()
    
    # 2. Seed agents
    await seed_agents()
    
    # 3. Seed listings to SQLite
    await seed_listings()
    
    # 4. Seed RAG vector store (sync — ChromaDB is synchronous)
    seed_rag_vector_store()
    
    print("=" * 60)
    print("  🎉 All seeding complete! Your PoC is ready.")
    print("")
    print("  Next steps:")
    print("  1. Add your GROQ_API_KEY to .env")
    print("  2. Run: uvicorn app.main:app --reload")
    print("  3. Run: cd ../frontend && npm run dev")
    print("  4. Open http://localhost:3000/console")
    print("=" * 60)


if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
