from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Default to sqlite for local dev if Postgres not set, to avoid breaking if user hasn't set prompt
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
