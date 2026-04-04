"""
Speech-to-Text (STT) Module for ORICALO Voice Agent.

Backend options (set via STT_BACKEND env var):
- "deepgram"  — Deepgram Nova-3 (streaming WebSocket, lowest latency, RECOMMENDED)
- "groq"      — Groq Whisper Large v3 Turbo (file-upload + local VAD endpointing)
- "local"     — HuggingFace Whisper (local, offline, high latency)

All backends expose `transcribe_stream_async()` for the streaming orchestrator.
"""
import os

# Default backend
DEFAULT_STT_BACKEND = os.getenv("STT_BACKEND", "deepgram")

if DEFAULT_STT_BACKEND.lower() in ("deepgram", "api", "dg"):
    from .deepgram_stt import DeepgramSTT
    Ear_hf = DeepgramSTT  # Alias for compatibility
elif DEFAULT_STT_BACKEND.lower() in ("groq", "groq-whisper"):
    from .groq_stt import GroqWhisperSTT
    Ear_hf = GroqWhisperSTT
else:
    from .stt_hf import Ear_hf

from .vad import OptimizedVAD
from .utils import record_user, record_user_stream, record_interruption

__all__ = [
    "Ear_hf",
    "OptimizedVAD",
    "record_user",
    "record_user_stream",
    "record_interruption",
]

__version__ = "2.0.0"

