import asyncio
import io
import edge_tts
from typing import Generator

class EdgeTTS:
    """Free, high-quality Microsoft Edge TTS for Urdu."""
    def __init__(self, voice: str = "ur-PK-AsadNeural"):
        """
        Args:
            voice: ur-PK-AsadNeural (Male) or ur-PK-UzmaNeural (Female)
        """
        self.voice = voice

    async def _synthesize_async(self, text: str) -> bytes:
        """Async internal synthesis to MP3."""
        communicate = edge_tts.Communicate(text, self.voice)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        return audio_stream.getvalue()

    def synthesize(self, text: str) -> bytes:
        """Synchronous wrapper for synthesize."""
        return asyncio.run(self._synthesize_async(text))

    async def _stream_async(self, text: str):
        communicate = edge_tts.Communicate(text, self.voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    def synthesize_stream(self, text: str) -> Generator[bytes, None, None]:
        """Synchronous generator wrapper (can block, use with care)."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        gen = self._stream_async(text)
        try:
            while True:
                chunk = loop.run_until_complete(gen.__anext__())
                yield chunk
        except StopAsyncIteration:
            pass
        finally:
            loop.close()
