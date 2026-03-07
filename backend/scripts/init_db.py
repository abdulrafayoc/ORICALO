import asyncio
from app.db.session import engine
from app.db.base import Base
from app.db_tables.agent import Agent  # Ensure models are registered

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_models())
