"""
ElevenLabs TTS Engine with Async Streaming.

Uses ElevenLabs' Multilingual v2 model for high-quality Urdu voice synthesis.
Supports both full synthesis and async chunk-by-chunk streaming for the
real-time voice pipeline.
"""

import os
import io
import asyncio
from typing import Generator, AsyncGenerator, Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

import requests


class ElevenLabsTTS:
    """ElevenLabs TTS engine with async streaming for low-latency voice AI."""

    # Good multilingual voices for Urdu:
    # "EXAVITQu4vr4xnSDxMaL" — Bella (female, warm)
    # "pNInz6obpgDQGcFmaJgB" — Adam (male, clear)
    
    def __init__(
        self,
        voice_id: str = "EXAVITQu4vr4xnSDxMaL",
        api_key: Optional[str] = None,
        model_id: str = "eleven_multilingual_v2",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        output_format: str = "mp3_44100_128",
    ):
        """
        Args:
            voice_id: ElevenLabs voice ID.
            api_key: ElevenLabs API Key. Defaults to env var.
            model_id: TTS model. "eleven_multilingual_v2" for Urdu.
            stability: Voice stability (0-1). Lower = more expressive.
            similarity_boost: Voice clarity (0-1). Higher = closer to original voice.
            output_format: Audio format. "mp3_44100_128" for good quality.
        """
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = voice_id
        self.model_id = model_id
        self.stability = stability
        self.similarity_boost = similarity_boost
        self.output_format = output_format

        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set.")

        self._base_url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        self._headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

    def _build_payload(self, text: str) -> dict:
        return {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": self.stability,
                "similarity_boost": self.similarity_boost,
            },
        }

    def synthesize(self, text: str) -> bytes:
        """Synchronous full synthesis. Returns complete MP3 bytes."""
        response = requests.post(
            self._base_url,
            json=self._build_payload(text),
            headers=self._headers,
        )
        response.raise_for_status()
        return response.content

    def synthesize_stream(self, text: str) -> Generator[bytes, None, None]:
        """Synchronous streaming — yields MP3 chunks as they arrive."""
        url = f"{self._base_url}/stream"
        with requests.post(url, json=self._build_payload(text), headers=self._headers, stream=True) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=4096):
                if chunk:
                    yield chunk

    async def async_synthesize(self, text: str) -> bytes:
        """Async full synthesis. Returns complete MP3 bytes."""
        if not HTTPX_AVAILABLE:
            return await asyncio.to_thread(self.synthesize, text)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self._base_url,
                json=self._build_payload(text),
                headers=self._headers,
            )
            response.raise_for_status()
            return response.content

    async def async_synthesize_stream(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        Async streaming synthesis — yields MP3 audio chunks as they arrive
        from ElevenLabs' streaming endpoint.

        This is the primary method for the real-time voice pipeline.
        Each chunk can be sent to the frontend immediately for playback,
        achieving ultra-low Time-to-First-Audio (TTFA).
        """
        url = f"{self._base_url}/stream"

        if HTTPX_AVAILABLE:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=self._build_payload(text),
                    headers=self._headers,
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        if chunk:
                            yield chunk
        else:
            # Fallback: run sync streaming in thread and pump through queue
            chunk_queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue()

            def _sync_stream():
                try:
                    for chunk in self.synthesize_stream(text):
                        chunk_queue.put_nowait(chunk)
                except Exception as e:
                    print(f"[ElevenLabs] Stream error: {e}")
                finally:
                    chunk_queue.put_nowait(None)

            loop = asyncio.get_event_loop()
            thread = loop.run_in_executor(None, _sync_stream)

            try:
                while True:
                    chunk = await chunk_queue.get()
                    if chunk is None:
                        break
                    yield chunk
            finally:
                try:
                    await asyncio.wait_for(asyncio.wrap_future(thread), timeout=2.0)
                except Exception:
                    pass

    async def _synthesize_async(self, text: str) -> bytes:
        """Legacy async method — kept for backward compatibility with orchestrator."""
        return await self.async_synthesize(text)
