"""
HuggingFace Local LLM for ORICALO Urdu Real Estate Voice Agent.
Uses transformers library with local/quantized models.
"""

import os
from typing import Generator, List, Dict, Optional
import json
import re
from dotenv import load_dotenv

load_dotenv()

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None


# Default model - compact enough for local inference
DEFAULT_MODEL_ID = os.getenv("LLM_MODEL_ID", "microsoft/Phi-3-mini-4k-instruct")

# System prompt for Urdu real estate agent persona
SYSTEM_PROMPT = """You are a polite and expert real estate agent helping clients in Pakistan.

Your duties:
1. Understand client needs (budget, location, property type)
2. Suggest suitable properties based on context provided
3. Provide information about prices and areas
4. Answer questions helpfully in Urdu/Roman Urdu

Rules:
- Respond in concise Urdu/Roman Urdu (English mixing is acceptable)
- Keep responses brief (2-3 sentences max) for voice conversation
- Maintain a polite, professional tone
- Ask clarifying questions if needed
- Never make up property details - use only provided context
"""


class HuggingFaceChatbot:
    """HuggingFace local model chatbot for real estate conversations."""
    
    def __init__(
        self,
        model_id: str = DEFAULT_MODEL_ID,
        device: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_new_tokens: int = 256,
        load_in_8bit: bool = False,
        load_in_4bit: bool = True,
    ):
        if not TORCH_AVAILABLE:
            raise RuntimeError("torch/transformers not installed. Run: pip install torch transformers accelerate")
        
        self.model_id = model_id
        self.system_prompt = system_prompt or SYSTEM_PROMPT
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        
        # Determine device
        if device:
            self.device = device
        elif torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            trust_remote_code=True,
        )
        
        # Configure quantization
        quantization_config = None
        if self.device == "cuda":
            try:
                from transformers import BitsAndBytesConfig
                if load_in_4bit:
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_use_double_quant=True,
                    )
                elif load_in_8bit:
                    quantization_config = BitsAndBytesConfig(load_in_8bit=True)
            except ImportError:
                quantization_config = None
        
        # Load model
        load_kwargs = {
            "trust_remote_code": True,
            "device_map": "auto" if self.device == "cuda" else None,
        }
        
        if quantization_config:
            load_kwargs["quantization_config"] = quantization_config
        elif self.device == "cuda":
            load_kwargs["torch_dtype"] = torch.float16
        
        self.model = AutoModelForCausalLM.from_pretrained(model_id, **load_kwargs)
        
        if self.device == "cpu":
            self.model = self.model.to(self.device)
        
        # Conversation history
        self.messages: List[Dict[str, str]] = []
    
    def _build_prompt(self, user_input: str, context: Optional[str] = None) -> str:
        """Build prompt with system message and history."""
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.messages)
        
        user_content = user_input
        if context:
            user_content = f"Context:\n{context}\n\nUser: {user_input}"
        
        messages.append({"role": "user", "content": user_content})
        
        # Try to use chat template
        try:
            prompt = self.tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            # Fallback to simple format
            prompt = "\n".join([f"[{m['role']}] {m['content']}" for m in messages])
            prompt += "\n[assistant] "
        
        return prompt
    
    def generate_response(self, user_input: str, context: Optional[str] = None) -> str:
        """Generate a response to user input."""
        prompt = self._build_prompt(user_input, context)
        
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                temperature=self.temperature,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the new generated text
        if prompt in response:
            response = response[len(prompt):].strip()
        
        # Update history
        self.messages.append({"role": "user", "content": user_input})
        self.messages.append({"role": "assistant", "content": response})
        
        return response
    
    def generate_response_stream(self, user_input: str, context: Optional[str] = None) -> Generator[str, None, None]:
        """Stream response (simplified - yields complete response)."""
        # HuggingFace streaming requires TextIteratorStreamer
        # For simplicity, we yield the full response
        response = self.generate_response(user_input, context)
        yield response
    
    def reset_conversation(self):
        """Reset conversation history."""
        self.messages = []
    
    def set_history(self, history: List[Dict[str, str]]):
        """Set conversation history from list of {role, text} dicts."""
        self.messages = []
        for turn in history:
            role = turn.get("role", "user").lower()
            if role == "agent":
                role = "assistant"
            self.messages.append({
                "role": role,
                "content": turn.get("text", "")
            })


def create_huggingface_chatbot(**kwargs) -> HuggingFaceChatbot:
    """Factory function to create a HuggingFace chatbot."""
    return HuggingFaceChatbot(**kwargs)


if __name__ == "__main__":
    # Quick test
    print("Testing HuggingFace chatbot...")
    print(f"Loading model: {DEFAULT_MODEL_ID}")
    try:
        bot = HuggingFaceChatbot()
        response = bot.generate_response("mujhe DHA Lahore mein 10 marla ghar chahiye")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")
