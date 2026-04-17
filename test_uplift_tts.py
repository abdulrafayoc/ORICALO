"""Quick smoke test: connect to Uplift AI and synthesize one short sentence."""
import asyncio, sys, os
from pathlib import Path
from dotenv import load_dotenv

# Load root .env (one level up from backend/)
load_dotenv(Path(__file__).parent / ".env")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from tts.tts_uplift import UpliftTTS

async def main():
    tts = UpliftTTS()
    print(f"Using voice: {tts.voice_id}, format: {tts.output_format}")
    print("Connecting...")
    chunks = []
    async for chunk in tts.async_synthesize_stream("ٹیسٹ کامیاب ہوگیا"):
        chunks.append(chunk)
        print(f"  Got chunk: {len(chunk)} bytes")
    total = sum(len(c) for c in chunks)
    print(f"Done — total audio bytes: {total}")
    await tts.disconnect()

asyncio.run(main())
