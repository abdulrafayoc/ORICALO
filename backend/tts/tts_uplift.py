"""
Uplift AI WebSocket TTS Engine — Async Streaming.

Uses Uplift's persistent Socket.io connection for ~300ms first-chunk latency.
Implements the same async_synthesize_stream() interface as ElevenLabsTTS so
the voice orchestrator requires zero changes.

Key Socket.io mapping (JS → python-socketio):
  JS:  io('wss://api.upliftai.org/text-to-speech/multi-stream', {auth: {token}})
         → server = 'wss://api.upliftai.org'
         → namespace = '/text-to-speech/multi-stream'
  Python: sio.connect('https://api.upliftai.org', namespaces=[NAMESPACE])
           All on/emit calls must specify namespace=NAMESPACE explicitly.
"""

import os
import asyncio
import base64
import uuid
import logging
from typing import AsyncGenerator, Optional

log = logging.getLogger(__name__)

try:
    import socketio
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False
    log.warning("[UpliftTTS] python-socketio not installed. Run: pip install 'python-socketio[asyncio_client]'")


# Sentinel — marks end of a per-request audio queue
_QUEUE_DONE = object()

# Socket.io server and namespace (split from the JS URL)
_SERVER   = "https://api.upliftai.org"
_NAMESPACE = "/text-to-speech/multi-stream"


class UpliftTTS:
    """Uplift AI TTS engine with persistent Socket.io WebSocket streaming."""

    DEFAULT_VOICE  = "v_meklc281"     # Urdu female
    DEFAULT_FORMAT = "MP3_22050_32"   # Good balance of quality / bandwidth

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        output_format: Optional[str] = None,
    ):
        if not SOCKETIO_AVAILABLE:
            raise RuntimeError(
                "python-socketio is required. "
                "Run: pip install 'python-socketio[asyncio_client]'"
            )

        self.api_key = api_key or os.getenv("UPLIFT_API_KEY")
        if not self.api_key:
            raise ValueError("UPLIFT_API_KEY is not set in environment.")

        self.voice_id      = voice_id or os.getenv("UPLIFT_VOICE_ID", self.DEFAULT_VOICE)
        self.output_format = output_format or os.getenv("UPLIFT_FORMAT", self.DEFAULT_FORMAT)

        self._sio: Optional[socketio.AsyncClient] = None
        self._connect_lock  = asyncio.Lock()
        self._ready_event   = asyncio.Event()
        self._connected     = False

        # request_id → asyncio.Queue[bytes | _QUEUE_DONE | Exception]
        self._queues: dict[str, asyncio.Queue] = {}

    # ── Connection ──────────────────────────────────────────────────────────

    async def _ensure_connected(self):
        """Lazy-connect: create and connect the Socket.io client once, then reuse."""
        if self._connected and self._sio and self._sio.connected:
            return

        async with self._connect_lock:
            # Double-checked locking
            if self._connected and self._sio and self._sio.connected:
                return

            self._ready_event.clear()
            self._sio = socketio.AsyncClient(
                reconnection=True,
                reconnection_attempts=5,
                reconnection_delay=1,
                reconnection_delay_max=10,
                logger=False,
                engineio_logger=False,
            )

            # ── Namespace-scoped event handlers ────────────────────────
            @self._sio.on("connect", namespace=_NAMESPACE)
            async def _on_connect():
                log.info("[UpliftTTS] Namespace connected: %s", _NAMESPACE)

            @self._sio.on("disconnect", namespace=_NAMESPACE)
            async def _on_disconnect():
                log.warning("[UpliftTTS] Disconnected from namespace")
                self._connected = False
                self._ready_event.clear()

            @self._sio.on("message", namespace=_NAMESPACE)
            async def _on_message(data: dict):
                msg_type = data.get("type")
                req_id   = data.get("requestId")

                if msg_type == "ready":
                    log.info("[UpliftTTS] Session ready — sessionId=%s", data.get("sessionId"))
                    self._connected = True
                    self._ready_event.set()

                elif msg_type == "audio":
                    q = self._queues.get(req_id)
                    if q:
                        audio_bytes = base64.b64decode(data["audio"])
                        await q.put(audio_bytes)

                elif msg_type == "audio_end":
                    q = self._queues.get(req_id)
                    if q:
                        await q.put(_QUEUE_DONE)

                elif msg_type == "error":
                    code = data.get("code", "unknown")
                    msg  = data.get("message", "TTS error")
                    log.error("[UpliftTTS] Error req=%s [%s] %s", req_id, code, msg)
                    q = self._queues.get(req_id)
                    if q:
                        await q.put(Exception(f"Uplift [{code}]: {msg}"))

            # ── Connect to correct server + namespace ──────────────────
            log.info("[UpliftTTS] Connecting to %s (ns=%s)...", _SERVER, _NAMESPACE)
            await self._sio.connect(
                _SERVER,
                namespaces=[_NAMESPACE],
                auth={"token": self.api_key},
                transports=["websocket"],
                wait_timeout=10,
            )

            # Wait for Uplift's 'ready' confirmation (up to 10 s)
            try:
                await asyncio.wait_for(self._ready_event.wait(), timeout=10.0)
                log.info("[UpliftTTS] Ready to synthesise.")
            except asyncio.TimeoutError:
                await self._sio.disconnect()
                raise RuntimeError(
                    "[UpliftTTS] Timed out waiting for 'ready'. "
                    "Check your UPLIFT_API_KEY and network connectivity."
                )

    # ── Public TTS Interface ────────────────────────────────────────────────

    async def async_synthesize_stream(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        Primary method for the voice pipeline.
        Yields decoded MP3 bytes as they stream from Uplift.
        Exactly matches ElevenLabsTTS.async_synthesize_stream() — zero orchestrator changes needed.
        """
        await self._ensure_connected()

        request_id: str = str(uuid.uuid4())
        q: asyncio.Queue = asyncio.Queue()
        self._queues[request_id] = q

        try:
            await self._sio.emit(
                "synthesize",
                {
                    "type":         "synthesize",
                    "requestId":    request_id,
                    "text":         text,
                    "voiceId":      self.voice_id,
                    "outputFormat": self.output_format,
                },
                namespace=_NAMESPACE,
            )
            log.debug("[UpliftTTS] Synthesis request sent — req=%s text='%s...'",
                      request_id[:8], text[:40])

            while True:
                try:
                    item = await asyncio.wait_for(q.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    log.error("[UpliftTTS] Timed out receiving audio for req=%s", request_id[:8])
                    break

                if item is _QUEUE_DONE:
                    log.debug("[UpliftTTS] Stream complete — req=%s", request_id[:8])
                    break
                elif isinstance(item, Exception):
                    raise item
                else:
                    yield item

        except asyncio.CancelledError:
            # Barge-in: tell the server to stop
            await self._cancel(request_id)
            raise
        finally:
            self._queues.pop(request_id, None)

    async def _cancel(self, request_id: str):
        """Emit a 'cancel' message for the given request."""
        if self._sio and self._sio.connected:
            try:
                await self._sio.emit(
                    "cancel",
                    {"type": "cancel", "requestId": request_id},
                    namespace=_NAMESPACE,
                )
                log.debug("[UpliftTTS] Cancel sent — req=%s", request_id[:8])
            except Exception as exc:
                log.warning("[UpliftTTS] Cancel failed: %s", exc)

    async def async_synthesize(self, text: str) -> bytes:
        """Collect all chunks and return complete audio bytes."""
        chunks = []
        async for chunk in self.async_synthesize_stream(text):
            chunks.append(chunk)
        return b"".join(chunks)

    def synthesize(self, text: str) -> bytes:
        """Sync fallback — runs the async path in a dedicated event loop."""
        return asyncio.run(self.async_synthesize(text))

    async def disconnect(self):
        """Gracefully close the Socket.io connection on server shutdown."""
        if self._sio and self._sio.connected:
            await self._sio.disconnect()
            self._connected = False
            log.info("[UpliftTTS] Disconnected.")


def create_uplift_tts(**kwargs) -> UpliftTTS:
    return UpliftTTS(**kwargs)
