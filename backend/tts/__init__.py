"""
TTS Module for ORICALO Voice Agent.
Provides a factory function to switch between Edge-TTS and ElevenLabs API based on the .env toggle.
"""

import os
from typing import Optional, Union

# Default backend
DEFAULT_BACKEND = os.getenv("TTS_BACKEND", "edge")

def get_tts(
    backend: Optional[str] = None,
    **kwargs
):
    """Factory function for Text-to-Speech engines."""
    backend = (backend or DEFAULT_BACKEND).lower().strip()
    
    if backend in ("elevenlabs", "api", "eleven"):
        from .tts_elevenlabs import ElevenLabsTTS
        return ElevenLabsTTS(**kwargs)
    
    elif backend in ("edge", "local", "edge-tts"):
        from .tts_edge import EdgeTTS
        return EdgeTTS(**kwargs)
    
    else:
        raise ValueError(f"Unknown TTS backend: {backend}. Use 'edge' or 'elevenlabs'.")

__all__ = ["get_tts"]
