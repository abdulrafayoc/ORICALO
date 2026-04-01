"""
Iteration 1: Speech-to-Text (STT) Module

Core ASR functionality with multiple backends:
- Groq Whisper Large v3 Turbo (fastest, recommended for PoC)
- Deepgram Nova-2 (streaming API)
- HuggingFace Whisper (local, offline)
- Voice Activity Detection (VAD)
- Real-time streaming
"""
import os

# Default backend
DEFAULT_STT_BACKEND = os.getenv("STT_BACKEND", "local")

if DEFAULT_STT_BACKEND.lower() in ("groq", "groq-whisper"):
    from .groq_stt import GroqWhisperSTT
    Ear_hf = GroqWhisperSTT  # Alias for compatibility
elif DEFAULT_STT_BACKEND.lower() in ("deepgram", "api"):
    from .deepgram_stt import DeepgramSTT
    Ear_hf = DeepgramSTT
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

__version__ = "1.1.0"

