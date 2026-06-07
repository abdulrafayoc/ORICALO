import asyncio
import os
import time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def test_conn():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("FAILED: DATABASE_URL is not set")
        return

    parts = url.split("@", 1)
    if len(parts) == 2:
        masked_url = parts[0].rsplit(":", 1)[0] + ":***@" + parts[1]
    else:
        masked_url = "***"

    print(f"Testing connection to: {masked_url}")
    engine = create_async_engine(url, pool_pre_ping=True, pool_size=2, connect_args={"timeout": 20})
    started_at = time.perf_counter()
    try:
        async with asyncio.timeout(20.0):
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
        elapsed = time.perf_counter() - started_at
        print(f"SUCCESS in {elapsed:.2f}s")
    except Exception as e:
        elapsed = time.perf_counter() - started_at
        print(f"FAILED after {elapsed:.2f}s: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())
