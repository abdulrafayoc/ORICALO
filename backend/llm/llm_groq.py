"""
LLM Module: Groq Backend with Async Streaming.

High-speed LLM interaction using Groq API with both synchronous
and async streaming capabilities for the real-time voice pipeline.
"""

import os
import asyncio
from typing import List, Dict, Optional, Generator, AsyncGenerator
from groq import Groq

class GroqChatbot:
    """High-speed LLM interaction using Groq API with async streaming."""
    
    def __init__(self, model_name: str = "llama-3.1-8b-instant", api_key: str = None):
        """
        Args:
           model_name: "llama-3.1-8b-instant" or "llama-3.1-70b-versatile"
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set.")
        
        self.client = Groq(api_key=self.api_key)
        self.model_name = model_name
        self.history = []
        
        # Urdu Real Estate Persona Prompt
        self.system_prompt = """You are ORICALO, a professional and helpful real estate AI voice assistant operating in Pakistan.
You must ALWAYS respond in friendly, conversational Urdu (written in Urdu script / Nastaliq). 
Keep your responses short, natural, and friendly, as they will be spoken aloud over a phone call.
Aim for 2-3 sentences maximum per response unless the user asks for detailed information.

CRITICAL SAFETY RULES:
1. You are strictly a real estate assistant for ORICALO. If a user asks about anything other than real estate (e.g., politics, coding, general knowledge, weather), you MUST politely refuse to answer in Urdu and guide them back to real estate. Example refusal: "Main sirf real estate aur properties ke baare mein madad kar sakta hoon. Kya aap kisi property ki maloomat chahte hain?"
2. Never promise financial returns or guarantee investment success.

RAG PROVENANCE:
If you are provided with Property Context (RAG matches), you MUST use that context to answer. 
When mentioning a specific property from the context, you MUST include its ID tag exactly like this: [Listing-123] in your response so the system can display it on the screen."""
        self._set_system_prompt()

    def _set_system_prompt(self):
        self.history = [{"role": "system", "content": self.system_prompt}]

    def _update_history(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        # Keep recent history (system prompt + last N turns) to prevent context overflow
        if len(self.history) > 13: 
            self.history = [self.history[0]] + self.history[-12:]

    def reset_history(self):
        self._set_system_prompt()

    def set_history(self, history: List[Dict[str, str]]):
        """Set conversation history from list of {role, text} dicts."""
        self._set_system_prompt()
        for turn in history:
            role = turn.get("role", "user").lower()
            text = turn.get("text", "")
            if role in ("user",):
                self.history.append({"role": "user", "content": text})
            else:
                self.history.append({"role": "assistant", "content": text})

    def _build_prompt(self, prompt: str, context: Optional[str] = None) -> str:
        """Build the full prompt with optional RAG context."""
        if context:
            return f"Property Context (from database):\n{context}\n\nUser's Question:\n{prompt}"
        return prompt

    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Synchronous full response generation."""
        full_prompt = self._build_prompt(prompt, context)
        self._update_history("user", full_prompt)
        
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=self.history,
            temperature=0.5,
            max_tokens=256,
        )
        
        assistant_reply = response.choices[0].message.content
        self._update_history("assistant", assistant_reply)
        return assistant_reply

    def stream_response(self, prompt: str, context: Optional[str] = None) -> Generator[str, None, None]:
        """Yields chunks of the generated response for real-time streaming."""
        full_prompt = self._build_prompt(prompt, context)
        self._update_history("user", full_prompt)
        
        stream = self.client.chat.completions.create(
            model=self.model_name,
            messages=self.history,
            temperature=0.5,
            max_tokens=256,
            stream=True
        )
        
        full_reply = ""
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                token = chunk.choices[0].delta.content
                full_reply += token
                yield token
                
        self._update_history("assistant", full_reply)

    async def async_stream_response(
        self, prompt: str, context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Async generator that streams LLM tokens for the real-time voice pipeline.
        
        Runs the blocking Groq stream in a thread pool to avoid blocking the
        event loop, and yields tokens via an asyncio Queue for consumption
        by the orchestrator's sentence buffer.
        
        Supports cancellation: if the task is cancelled (e.g. by barge-in),
        the thread will finish its current iteration and stop cleanly.
        """
        token_queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
        full_prompt = self._build_prompt(prompt, context)
        self._update_history("user", full_prompt)

        cancelled = asyncio.Event()

        def _blocking_stream():
            """Runs in a thread — streams tokens into the queue."""
            full_reply = ""
            try:
                stream = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=self.history,
                    temperature=0.5,
                    max_tokens=256,
                    stream=True,
                )
                for chunk in stream:
                    if cancelled.is_set():
                        break
                    if chunk.choices[0].delta.content is not None:
                        token = chunk.choices[0].delta.content
                        full_reply += token
                        token_queue.put_nowait(token)
            except Exception as e:
                print(f"[LLM Stream] Error: {e}")
            finally:
                # Record whatever we generated into history
                if full_reply:
                    self._update_history("assistant", full_reply)
                token_queue.put_nowait(None)  # Sentinel

        # Launch the blocking stream in a thread
        loop = asyncio.get_event_loop()
        thread_future = loop.run_in_executor(None, _blocking_stream)

        try:
            while True:
                token = await token_queue.get()
                if token is None:
                    break
                yield token
        except asyncio.CancelledError:
            cancelled.set()
            raise
        finally:
            # Wait for the thread to finish cleanly
            cancelled.set()
            try:
                await asyncio.wait_for(asyncio.wrap_future(thread_future), timeout=2.0)
            except (asyncio.TimeoutError, Exception):
                pass

    async def async_generate_response(
        self, prompt: str, context: Optional[str] = None
    ) -> str:
        """Async wrapper for generate_response (for backward compatibility)."""
        return await asyncio.to_thread(self.generate_response, prompt, context)

    def truncate_last_response(self, actually_spoken: str):
        """
        After a barge-in, truncate the last assistant message in history
        to only the text that was actually spoken to the user.
        
        This prevents the LLM from hallucinating based on text the user
        never actually heard.
        """
        if len(self.history) >= 2 and self.history[-1]["role"] == "assistant":
            if actually_spoken.strip():
                self.history[-1]["content"] = actually_spoken + "... [interrupted]"
            else:
                # Nothing was spoken — remove the entry entirely
                self.history.pop()


def create_groq_chatbot(**kwargs) -> GroqChatbot:
    return GroqChatbot(**kwargs)
