"""
LLM Module for ORICALO Voice Agent.
Provides factory function to create chatbot based on LLM_BACKEND env var.
"""

import os
from typing import Optional, Union
from dotenv import load_dotenv

load_dotenv()

# Default backend
DEFAULT_BACKEND = os.getenv("LLM_BACKEND", "gemini")


def get_chatbot(
    backend: Optional[str] = None,
    **kwargs
) -> Union["GeminiChatbot", "HuggingFaceChatbot"]:
    """
    Factory function to get appropriate chatbot based on backend.
    
    Args:
        backend: 'gemini' or 'huggingface'. Defaults to LLM_BACKEND env var or 'gemini'.
        **kwargs: Additional arguments passed to chatbot constructor.
    
    Returns:
        Chatbot instance.
    
    Example:
        >>> bot = get_chatbot()  # Uses default (gemini)
        >>> bot = get_chatbot(backend="huggingface")
        >>> response = bot.generate_response("mujhe ghar chahiye")
    """
    backend = (backend or DEFAULT_BACKEND).lower().strip()
    
    if backend in ("gemini", "google"):
        from .llm_gemini import GeminiChatbot, create_gemini_chatbot
        return create_gemini_chatbot(**kwargs)
    
    elif backend in ("groq", "api", "llama3"):
        from .llm_groq import GroqChatbot, create_groq_chatbot
        return create_groq_chatbot(**kwargs)
        
    elif backend in ("huggingface", "hf", "local", "llama"):
        from .llm_hf import HuggingFaceChatbot, create_huggingface_chatbot
        return create_huggingface_chatbot(**kwargs)
    
    else:
        raise ValueError(f"Unknown LLM backend: {backend}. Use 'gemini' or 'huggingface'.")


# Convenience imports
try:
    from .llm_hf import HuggingFaceChatbot
except Exception:
    HuggingFaceChatbot = None


__all__ = ["get_chatbot", "GeminiChatbot", "HuggingFaceChatbot"]
