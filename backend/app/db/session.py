from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") 
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Database URL for SQLAlchemy - use Supabase pooler for better connectivity
SQLITE_URL = "sqlite+aiosqlite:///./oricalo.db"

# Try different Supabase connection methods
POOLER_URL = "postgresql+asyncpg://postgres:drahmedrazashahid@db.dbnwxwwkfvvlvojwqvzd.supabase.co:6543/postgres?ssl=require"
DIRECT_URL = "postgresql+asyncpg://postgres:drahmedrazashahid@db.dbnwxwwkfvvlvojwqvzd.supabase.co:5432/postgres?ssl=require"

# Use environment variable if set, otherwise try pooler first
DATABASE_URL = os.getenv("DATABASE_URL", POOLER_URL)

# Create async engine for SQLAlchemy with fallback
engine = None
connection_method = "Unknown"
use_supabase_rest = False

# Try pooler connection first
try:
    engine = create_async_engine(
        POOLER_URL, 
        echo=False, 
        pool_pre_ping=True, 
        pool_recycle=300,
        connect_args={
            "server_settings": {
                "application_name": "oricalo_backend"
            }
        }
    )
    connection_method = "Supabase Pooler"
    print("🔗 Attempting Supabase pooler connection...")
except Exception as e:
    print(f"⚠️  Pooler connection failed: {e}")

# If pooler failed and no environment override, try direct connection
if engine is None and not os.getenv("DATABASE_URL"):
    try:
        engine = create_async_engine(
            DIRECT_URL, 
            echo=False, 
            pool_pre_ping=True, 
            pool_recycle=300,
            connect_args={
                "server_settings": {
                    "application_name": "oricalo_backend"
                }
            }
        )
        connection_method = "Supabase Direct"
        print("🔗 Attempting Supabase direct connection...")
    except Exception as e:
        print(f"⚠️  Direct connection failed: {e}")

# If both failed, try Supabase REST API or fall back to SQLite
if engine is None:
    # Try Supabase REST API as alternative
    try:
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            # Test REST API connection
            test_client = httpx.Client()
            response = test_client.get(
                f"{SUPABASE_URL}/rest/v1/",
                headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
            )
            if response.status_code == 200:
                use_supabase_rest = True
                connection_method = "Supabase REST API"
                print("🌐 Using Supabase REST API (PostgreSQL failed)")
                # Use SQLite as local cache
                engine = create_async_engine(SQLITE_URL, echo=False)
            else:
                raise Exception(f"REST API test failed: {response.status_code}")
        else:
            raise Exception("Missing Supabase credentials")
    except Exception as e:
        print(f"⚠️  REST API failed: {e}")
        # Final fallback to SQLite
        engine = create_async_engine(SQLITE_URL, echo=False)
        connection_method = "SQLite (Fallback)"
        print("🗄️  Using SQLite database as fallback")

print(f"✅ Database configured: {connection_method}")

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Supabase client for direct Supabase operations - initialize lazily
supabase: Client = None

def get_supabase() -> Client:
    """Get Supabase client for direct Supabase operations"""
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return supabase

def get_supabase_rest_client():
    """Get Supabase REST API client"""
    if not use_supabase_rest:
        return None
    return httpx.Client(
        base_url=f"{SUPABASE_URL}/rest/v1/",
        headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
    )

async def get_db():
    """Get database session for SQLAlchemy operations"""
    async with AsyncSessionLocal() as session:
        yield session
