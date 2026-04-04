"""
Deepgram Nova-3 Streaming STT Backend.

Uses Deepgram's WebSocket API directly (via the websockets library) 
for ultra-low-latency speech-to-text with native endpointing, 
partial transcripts, and VAD events.

This bypasses the deepgram-sdk (v5 has breaking API changes) and 
communicates directly with Deepgram's WebSocket endpoint for maximum
control and reliability.

Pipeline:
  Browser Audio (PCM 16kHz) → Deepgram WebSocket → Real-time Transcripts
"""

import os
import json
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional, Callable
from urllib.parse import urlencode, quote

try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False

try:
    from .logger_config import configure_logger
except ImportError:
    import logging
    def configure_logger(name):
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger(name)

logger = configure_logger(__name__)


class DeepgramSTT:
    """High-speed streaming STT using Deepgram Nova-3 WebSocket API (direct)."""

    DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "nova-3",
        language: str = "ur",
        endpointing_ms: int = 500,
    ):
        """
        Args:
            api_key: Deepgram API key. Falls back to DEEPGRAM_API_KEY env var.
            model: Deepgram model. "nova-3" confirmed working with language=ur.
            language: ISO-639-1 language code. "ur" for Urdu.
            endpointing_ms: Silence (ms) before utterance is finalized.
        """
        self.api_key = api_key or os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY environment variable not set.")

        if not WEBSOCKETS_AVAILABLE:
            raise RuntimeError("websockets library required. pip install websockets")

        self.model = model
        self.language = language
        self.endpointing_ms = endpointing_ms

    def _build_ws_url(self) -> str:
        """Build the Deepgram WebSocket URL.
        
        Matches the confirmed working parameter set:
        model=nova-3 & language=ur & encoding=linear16 & sample_rate=16000
        & interim_results=true & endpointing=<ms> & vad_events=true
        """
        params = {
            "model": self.model,
            "language": self.language,
            "encoding": "linear16",
            "channels": "1",
            "sample_rate": "16000",
            "smart_format": "true",
            "punctuate": "true",
            "interim_results": "true",
            "endpointing": str(self.endpointing_ms),
            "vad_events": "true",
        }
        return f"{self.DEEPGRAM_WS_URL}?{urlencode(params)}"

    async def transcribe_stream_async(
        self,
        audio_generator: AsyncGenerator[bytes, None],
        on_interrupt: Optional[Callable] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Consumes an async generator of PCM audio chunks and yields
        real-time transcription events via Deepgram's WebSocket API.

        Yields dicts with:
            {"text": str, "is_final": bool}
            {"type": "speech_started"}
            {"type": "utterance_end"}

        Args:
            audio_generator: Async generator yielding raw PCM bytes.
            on_interrupt: Optional callback when speech detected (for barge-in).
        """
        url = self._build_ws_url()
        headers = {
            "Authorization": f"Token {self.api_key}",
        }

        # Log the URL (mask the API key for security)
        safe_url = url[:80] + "..." if len(url) > 80 else url
        logger.info(f"Connecting to Deepgram {self.model} (lang={self.language}, endpointing={self.endpointing_ms}ms)")
        print(f"[DeepgramSTT] WS URL: {safe_url}")

        # Queue for passing results from the receiver to the consumer
        result_queue: asyncio.Queue[Optional[Dict[str, Any]]] = asyncio.Queue()

        try:
            async with websockets.connect(url, additional_headers=headers) as ws:
                logger.info("Deepgram WebSocket connected")

                # --- Audio Sender Task ---
                async def audio_sender():
                    """Pumps audio chunks into the Deepgram WebSocket."""
                    try:
                        async for chunk in audio_generator:
                            if chunk:
                                await ws.send(chunk)
                        # Signal end of audio
                        await ws.send(json.dumps({"type": "CloseStream"}))
                    except asyncio.CancelledError:
                        try:
                            await ws.send(json.dumps({"type": "CloseStream"}))
                        except Exception:
                            pass
                    except Exception as e:
                        logger.error(f"Audio sender error: {e}")

                # --- Message Receiver Task ---
                async def message_receiver():
                    """Receives JSON messages from Deepgram and pushes to queue."""
                    try:
                        async for raw_msg in ws:
                            try:
                                msg = json.loads(raw_msg)
                            except json.JSONDecodeError:
                                continue

                            msg_type = msg.get("type", "")

                            # --- Transcript Results ---
                            if msg_type == "Results":
                                channel = msg.get("channel", {})
                                alternatives = channel.get("alternatives", [{}])
                                transcript = alternatives[0].get("transcript", "")
                                
                                is_final = msg.get("is_final", False)
                                speech_final = msg.get("speech_final", False)

                                if transcript:
                                    await result_queue.put({
                                        "text": transcript,
                                        "is_final": is_final or speech_final,
                                    })

                            # --- Speech Started (VAD Event) ---
                            elif msg_type == "SpeechStarted":
                                await result_queue.put({"type": "speech_started"})
                                if on_interrupt:
                                    try:
                                        on_interrupt()
                                    except Exception:
                                        pass

                            # --- Utterance End ---
                            elif msg_type == "UtteranceEnd":
                                await result_queue.put({"type": "utterance_end"})

                            # --- Metadata (connection info) ---
                            elif msg_type == "Metadata":
                                logger.info(f"Deepgram session: {msg.get('request_id', 'unknown')}")

                    except websockets.exceptions.ConnectionClosed:
                        logger.info("Deepgram WebSocket closed")
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(f"Message receiver error: {e}")
                    finally:
                        await result_queue.put(None)  # Signal end

                # Launch both tasks
                sender_task = asyncio.create_task(audio_sender())
                receiver_task = asyncio.create_task(message_receiver())

                # Yield results as they arrive
                try:
                    while True:
                        result = await result_queue.get()
                        if result is None:
                            break
                        yield result
                except asyncio.CancelledError:
                    pass
                finally:
                    sender_task.cancel()
                    receiver_task.cancel()
                    try:
                        await asyncio.gather(sender_task, receiver_task, return_exceptions=True)
                    except Exception:
                        pass

        except Exception as e:
            logger.error(f"Deepgram connection error: {e}")
            yield {"text": f"STT connection failed: {str(e)[:100]}", "is_final": True}
