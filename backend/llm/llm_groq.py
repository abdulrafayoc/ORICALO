"""
LLM Module: Groq Backend with Async Streaming and Tool Calling.
"""

import os
import json
import asyncio
from typing import List, Dict, Optional, Generator, AsyncGenerator, Callable, Any
from groq import Groq

ORICALO_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_properties",
            "description": "Search the database for property listings based on user query (e.g. 5 marla house in DHA). Returns top matching properties with prices.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query, e.g. '5 marla house DHA Phase 6'"},
                    "max_results": {"type": "integer", "description": "Number of results to return", "default": 3}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_price_estimate",
            "description": "Get an estimated price range for a property in a specific location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location name, e.g. 'DHA Phase 6' or 'Bahria Town'"},
                    "area_marla": {"type": "number", "description": "Size in Marlas, e.g. 5, 10, 20"},
                    "property_type": {"type": "string", "description": "Type: House, Plot, Flat", "default": "House"}
                },
                "required": ["location", "area_marla"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_viewing",
            "description": "Schedule a property viewing for a client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string"},
                    "preferred_date": {"type": "string"},
                    "contact_name": {"type": "string"}
                },
                "required": ["listing_id"]
            }
        }
    }
]

class GroqChatbot:
    """High-speed LLM interaction using Groq API with async streaming."""
    
    def __init__(self, model_name: str = "llama-3.1-8b-instant", api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set.")
        
        self.client = Groq(api_key=self.api_key)
        self.model_name = model_name
        # The tool-use preview model is required for accurate function calling in Groq
        self.tool_model_name = "llama3-groq-8b-8192-tool-use-preview" 
        self.history = []
        
        # Urdu Real Estate Persona Prompt
        self.system_prompt = """You are ORICALO, a professional and helpful real estate AI voice assistant operating in Pakistan.
You must ALWAYS respond in friendly, conversational Urdu (written in Urdu script / Nastaliq). 
Keep your responses short, natural, and friendly, as they will be spoken aloud over a phone call.
Aim for 2-3 sentences maximum per response unless the user asks for detailed information.

CRITICAL SAFETY RULES:
1. You are strictly a real estate assistant for ORICALO. If a user asks about anything other than real estate (e.g., politics, coding, general knowledge, weather), you MUST politely refuse to answer in Urdu and guide them back to real estate. Example refusal: "Main sirf real estate aur properties ke baare mein madad kar sakta hoon. Kya aap kisi property ki maloomat chahte hain?"
2. Never promise financial returns or guarantee investment success.

RAG PROVENANCE & TOOLS:
If you are asked about finding properties or checking prices, use the provided tools first to get accurate data. Then use that returned data to answer the user."""
        self._set_system_prompt()

    def _set_system_prompt(self):
        self.history = [{"role": "system", "content": self.system_prompt}]

    def _update_history(self, role: str, content: str, name: str = None, tool_call_id: str = None, tool_calls=None):
        msg = {"role": role, "content": content}
        if name:
            msg["name"] = name
        if tool_call_id:
            msg["tool_call_id"] = tool_call_id
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self.history.append(msg)
        
        # Keep recent history to prevent context overflow, but ensure system prompt stays
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
                self._update_history("user", text)
            else:
                self._update_history("assistant", text)

    def _build_prompt(self, prompt: str, context: Optional[str] = None) -> str:
        """Build the full prompt with optional context."""
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

    async def async_stream_response(
        self, prompt: str, context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Original streaming without tools."""
        token_queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
        full_prompt = self._build_prompt(prompt, context)
        self._update_history("user", full_prompt)

        cancelled = asyncio.Event()

        def _blocking_stream():
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
                if full_reply:
                    self._update_history("assistant", full_reply)
                token_queue.put_nowait(None)

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
            cancelled.set()
            try:
                await asyncio.wait_for(asyncio.wrap_future(thread_future), timeout=2.0)
            except (asyncio.TimeoutError, Exception):
                pass

    async def async_stream_response_with_tools(
        self, prompt: str, tool_executor: Callable[[str, Dict[str, Any]], str]
    ) -> AsyncGenerator[str, None]:
        """
        Two-pass Tool-Calling Architecture.
        1. Query tool-model to see if tools are needed.
        2. If YES: execute tool -> append result -> stream from standard model.
        3. If NO: standard stream.
        """
        self._update_history("user", prompt)
        
        # Pass 1: Ask tool model (Synchronous execution wrapped in thread for async)
        def _check_tools():
            return self.client.chat.completions.create(
                model=self.tool_model_name,
                messages=self.history,
                tools=ORICALO_TOOLS,
                tool_choice="auto",
                max_tokens=256
            )
            
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _check_tools)
        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
            # The LLM decided to call a tool
            self._update_history(
                role="assistant",
                content=response_message.content or "", # Can be None
                tool_calls=[tc.model_dump() for tc in tool_calls]
            )
            
            for tc in tool_calls:
                func_name = tc.function.name
                func_args = json.loads(tc.function.arguments)
                print(f"[LLM] Tool execution requested: {func_name}({func_args})")
                
                try:
                    tool_result = await tool_executor(func_name, func_args)
                except Exception as e:
                    print(f"[LLM] Tool {func_name} failed: {e}")
                    tool_result = f"Error executing tool: {e}"
                
                # Append tool result
                self._update_history(
                    role="tool",
                    content=str(tool_result),
                    name=func_name,
                    tool_call_id=tc.id
                )
        
        # Pass 2: Stream final response using standard fast model
        token_queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
        cancelled = asyncio.Event()

        def _blocking_final_stream():
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
                print(f"[LLM Final Stream] Error: {e}")
            finally:
                if full_reply:
                    self._update_history("assistant", full_reply)
                token_queue.put_nowait(None)

        thread_future = loop.run_in_executor(None, _blocking_final_stream)

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
            cancelled.set()
            try:
                await asyncio.wait_for(asyncio.wrap_future(thread_future), timeout=2.0)
            except (asyncio.TimeoutError, Exception):
                pass


    async def async_generate_response(
        self, prompt: str, context: Optional[str] = None
    ) -> str:
        """Async wrapper for generate_response."""
        return await asyncio.to_thread(self.generate_response, prompt, context)

    def truncate_last_response(self, actually_spoken: str):
        if len(self.history) >= 2 and self.history[-1]["role"] == "assistant":
            if actually_spoken.strip():
                self.history[-1]["content"] = actually_spoken + "... [interrupted]"
            else:
                self.history.pop()

def create_groq_chatbot(**kwargs) -> GroqChatbot:
    return GroqChatbot(**kwargs)
