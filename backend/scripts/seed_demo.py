"""
Demo seed script. Run from backend/ directory:
  python -m scripts.seed_demo
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db_tables.organization import Organization
from app.db_tables.user import User, UserRole
from app.db_tables.agent import Agent
from app.db_tables.crm import Lead, CallSession, ActionItem
from app.db_tables.listing import Listing
from app.core.security import hash_password
import uuid

DATABASE_URL = os.getenv("DATABASE_URL")

async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    from sqlalchemy import select
    async with Session() as db:
        result = await db.execute(select(Organization).where(Organization.slug == "oricalo-demo"))
        existing_org = result.scalar_one_or_none()
        if existing_org:
            print("Demo data already seeded!")
            print("   Login: demo@oricalo.com / demo1234")
            return

        # Org
        org = Organization(name="Oricalo Demo Agency", slug="oricalo-demo", plan="pro")
        db.add(org)
        await db.flush()
        
        # Admin user
        admin = User(
            email="demo@oricalo.com",
            hashed_password=hash_password("demo1234"),
            full_name="Demo Admin",
            role=UserRole.agency_admin,
            organization_id=org.id,
            is_verified=True,
        )
        db.add(admin)
        
        # Agents
        agents_data = [
            {"name": "Fatima - Residential", "slug": "fatima-residential", "description": "Specializes in house and apartment sales in Lahore.", "system_prompt": "You are Fatima, a friendly Urdu-speaking real estate agent specializing in residential properties in Lahore. Help callers find houses, flats, and plots. Always ask about budget and area preference."},
            {"name": "Bilal - Commercial", "slug": "bilal-commercial", "description": "Expert in commercial plazas, shops, and offices.", "system_prompt": "You are Bilal, an expert in commercial real estate in Pakistan. Help callers find offices, shops, and commercial plazas. Ask about location, size, and intended use."},
            {"name": "Sana - Land & Plots", "slug": "sana-land", "description": "Focused on residential and agricultural plots.", "system_prompt": "You are Sana, specializing in plots and land. Help callers find residential or agricultural land. Discuss area in marla or kanal, location, and budget."},
        ]
        for a in agents_data:
            db.add(Agent(**a, organization_id=org.id))
            
        # Leads
        leads_data = [
            {"name": "Ahmed Khan", "phone_number": "03001234567", "status": "HOT", "lead_score": 85, "budget": "1.5 Crore", "location_pref": "DHA Phase 5", "needs_human": True},
            {"name": "Sara Malik", "phone_number": "03211234567", "status": "HOT", "lead_score": 78, "budget": "80 Lakh", "location_pref": "Bahria Town", "needs_human": True},
            {"name": "Usman Ali", "phone_number": "03451234567", "status": "WARM", "lead_score": 55, "budget": "Not specified", "location_pref": "Johar Town"},
            {"name": "Zara Hussain", "phone_number": "03001234568", "status": "WARM", "lead_score": 48, "budget": "50 Lakh", "location_pref": "Gulberg"},
            {"name": "Kamran Iqbal", "phone_number": "03211234568", "status": "COLD", "lead_score": 20, "budget": "Not specified", "location_pref": "Not specified"},
        ]
        lead_objs = []
        for l in leads_data:
            lead = Lead(**l, organization_id=org.id)
            db.add(lead)
            lead_objs.append(lead)
        await db.flush()
        
        # Sessions + Action items for hot leads
        summaries = [
            "Caller is looking for a 5 marla house in DHA Phase 5 with a budget of 1.5 crore. Highly motivated buyer with immediate timeline.",
            "Caller wants a 3 marla flat in Bahria Town Phase 8. Budget is flexible around 80 lakh. Ready to visit this week.",
        ]
        transcripts = [
            [{"role": "user", "text": "DHA Phase 5 mein 5 marla ghar chahiye"}, {"role": "assistant", "text": "Ji zaroor, main aapke liye listings dhundhta hoon"}],
            [{"role": "user", "text": "Bahria Town mein flat chahiye 80 lakh tak"}, {"role": "assistant", "text": "Bilkul, main Bahria Town mein flats dhundhta hoon"}],
        ]
        for i, lead in enumerate(lead_objs[:2]):
            session = CallSession(id=str(uuid.uuid4()), lead_id=lead.id, summary=summaries[i], transcript=transcripts[i], duration_seconds=90 + i*30)
            db.add(session)
            action = ActionItem(lead_id=lead.id, task_type="HUMAN_CALL", description=f"Follow up with {lead.name}. {summaries[i]}")
            db.add(action)
            
        await db.commit()
        print("✅ Demo seed complete!")
        print("   Login: demo@oricalo.com / demo1234")

if __name__ == "__main__":
    asyncio.run(seed())
