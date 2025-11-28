"""
Iteration 1: Speech-to-Text (STT) Module

Core ASR functionality for Urdu language recognition with:
- HuggingFace Whisper models
- Voice Activity Detection (VAD)
- Real-time streaming
- Silence detection
- Telephony optimization (8kHz)
"""

from .stt_hf import Ear_hf
from .vad import VoiceActivityDetection
from .utils import record_user, record_user_stream, record_interruption

__all__ = [
    "Ear_hf",
    "VoiceActivityDetection",
    "record_user",
    "record_user_stream",
    "record_interruption",
]

__version__ = "1.0.0"
