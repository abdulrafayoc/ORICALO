import os
from typing import List, Dict, Optional, Any, Generator
from groq import Groq

class GroqChatbot:
    """High-speed LLM interaction using Groq API."""
    
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

CRITICAL SAFETY RULES:
1. You are strictly a real estate assistant for ORICALO. If a user asks about anything other than real estate (e.g., politics, coding, general knowledge, weather), you MUST politely refuse to answer in Urdu and guide them back to real estate. Example refusal: "Main sirf real estate aur properties ke baare mein madad kar sakta hoon. Kya aap kisi property ki maloomat chahte hain?"
2. Never promise financial returns or guarantee investment success.

RAG PROVENANCE:
If you are provided with Property Context (RAG matches), you MUST use that context to answer."""
        self._set_system_prompt()

    def _set_system_prompt(self):
        self.history = [{"role": "system", "content": self.system_prompt}]

    def _update_history(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        # Keep recent history (system prompt + last N turns) to prevent context overflow
        if len(self.history) > 11: 
            self.history = [self.history[0]] + self.history[-10:]

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

    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Synchronous full response generation."""
        if context:
            full_prompt = f"Context Information:\n{context}\n\nUser Question:\n{prompt}"
        else:
            full_prompt = prompt

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
        if context:
            full_prompt = f"Context Information:\n{context}\n\nUser Question:\n{prompt}"
        else:
            full_prompt = prompt

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

def create_groq_chatbot(**kwargs) -> GroqChatbot:
    return GroqChatbot(**kwargs)
