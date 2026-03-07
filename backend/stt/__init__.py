"""
Iteration 1: Speech-to-Text (STT) Module

Core ASR functionality for Urdu language recognition with:
- HuggingFace Whisper models
- Voice Activity Detection (VAD)
- Real-time streaming
- Silence detection
- Telephony optimization (8kHz)
"""
import os

# Default backend
DEFAULT_STT_BACKEND = os.getenv("STT_BACKEND", "local")

if DEFAULT_STT_BACKEND.lower() in ("deepgram", "api"):
    from .deepgram_stt import DeepgramSTT
    Ear_hf = DeepgramSTT  # Fallback naming for compatibility
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

__version__ = "1.0.0"
