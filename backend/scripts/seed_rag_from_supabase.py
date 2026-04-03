"""
Seed RAG vector store from Supabase database listings
"""
import asyncio
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from app.db.session import engine
from rag.vector_store import build_index_from_listings, get_collection_stats

async def seed_rag_from_supabase():
    """Pull all listings from Supabase and seed them into ChromaDB"""
    print("🧠 Seeding RAG Vector Store from Supabase...")
    
    # Check current vector store status
    stats = get_collection_stats()
    if stats.get("count", 0) > 0:
        print(f"  ⏭️  Vector store already has {stats['count']} documents.")
        answer = input("  ❓ Re-seed from Supabase? (y/N): ").strip().lower()
        if answer != 'y':
            print("  Skipping RAG seeding.\n")
            return

    # Pull all listings from Supabase
    all_listings = []
    
    async with engine.begin() as conn:
        # Get all listings including agents and listings tables
        result = await conn.execute(text("""
            SELECT 
                id, title, description, price, location, city, type,
                bedrooms, baths, area, features, agent_notes, created_at
            FROM listings 
            ORDER BY created_at DESC
        """))
        
        rows = result.fetchall()
        
        for row in rows:
            listing = {
                'id': row.id,
                'title': row.title,
                'description': row.description,
                'price': row.price,
                'location': row.location,
                'city': row.city,
                'type': row.type,
                'bedrooms': row.bedrooms,
                'baths': row.baths,
                'area': row.area,
                'features': row.features,
                'agent_notes': row.agent_notes,
                'created_at': row.created_at.isoformat() if row.created_at else None
            }
            all_listings.append(listing)
    
    print(f"  📥 Pulled {len(all_listings)} listings from Supabase")
    
    if not all_listings:
        print("  ❌ No listings found in Supabase database")
        return
    
    # Build the RAG index
    total, collection = build_index_from_listings(all_listings)
    
    print(f"  ✅ Indexed {total} documents into collection '{collection}'.")
    print("✅ RAG Vector Store seeded from Supabase.\n")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_rag_from_supabase())
