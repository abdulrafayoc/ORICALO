"""
TTS Module for ORICALO Voice Agent.

Provides a factory function to switch between ElevenLabs, Uplift AI, and Edge-TTS
based on the TTS_BACKEND env var.

Async Streaming Contract:
  All TTS engines support async_synthesize_stream(text) -> AsyncGenerator[bytes].
  Engines may additionally support:
  - async_synthesize(text) -> bytes  (full collection)
  - synthesize(text) -> bytes        (sync fallback)
"""

import os
from typing import Optional, Union

# Default backend
DEFAULT_BACKEND = os.getenv("TTS_BACKEND", "elevenlabs")

def get_tts(
    backend: Optional[str] = None,
    **kwargs
):
    """Factory function for Text-to-Speech engines."""
    backend = (backend or DEFAULT_BACKEND).lower().strip()
    
    if backend in ("elevenlabs", "eleven"):
        from .tts_elevenlabs import ElevenLabsTTS
        return ElevenLabsTTS(**kwargs)
    
    elif backend in ("uplift", "upliftai"):
        from .tts_uplift import UpliftTTS
        return UpliftTTS(**kwargs)
    
    elif backend in ("edge", "local", "edge-tts"):
        from .tts_edge import EdgeTTS
        return EdgeTTS(**kwargs)
    
    else:
        raise ValueError(f"Unknown TTS backend: {backend}. Use 'elevenlabs', 'uplift', or 'edge'.")

__all__ = ["get_tts"]
