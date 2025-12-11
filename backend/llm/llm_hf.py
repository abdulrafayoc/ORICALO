"""
HuggingFace Local LLM for ORICALO Urdu Real Estate Voice Agent.
Uses transformers library or llama-cpp-python for local/quantized models.
"""

import os
from typing import Generator, List, Dict, Optional, Any
import json
import re
from threading import Thread
from dotenv import load_dotenv

load_dotenv()

# Backend availability
try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    torch = None

try:
    from llama_cpp import Llama
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False


# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Determine model type
# Priority: 
# 1. LLM_MODEL_TYPE env var
# 2. Inference from LLM_MODEL_ID (if contains 'gguf' or 'lughaat')
# 3. LLM_BACKEND env var (only if 'llama' or 'transformers')
# 4. Default to 'transformers'

_env_backend = os.getenv("LLM_BACKEND", "").lower()
_env_model_type = os.getenv("LLM_MODEL_TYPE", "").lower()
_env_model_id = os.getenv("LLM_MODEL_ID", "animaRegem/gemma-2b-malayalam-t2-gguf")

if _env_model_type:
    DEFAULT_MODEL_TYPE = _env_model_type
elif "gguf" in _env_model_id.lower() or "lughaat" in _env_model_id.lower() or "gemma" in _env_model_id.lower():
    DEFAULT_MODEL_TYPE = "llama"
elif _env_backend == "llama":
    DEFAULT_MODEL_TYPE = "llama"
else:
    DEFAULT_MODEL_TYPE = "transformers"

DEFAULT_MODEL_ID = _env_model_id
DEFAULT_CHAT_FORMAT = _env_chat_format

# System prompt for Urdu real estate agent persona
SYSTEM_PROMPT = """
آپ ایک شائستہ اور ماہر رئیل اسٹیٹ ایجنٹ ہیں جو پاکستان کے شہری علاقوں میں پراپرٹی خریدنے اور بیچنے میں مدد کرتے ہیں۔

آپ کے فرائض:
1. کلائنٹ کی ضروریات سمجھنا (بجٹ، مقام، پراپرٹی کی قسم)
2. مناسب پراپرٹیز تجویز کرنا
3. قیمتوں اور علاقوں کے بارے میں معلومات دینا
4. سوالات کا جواب دینا

قواعد:
- جواب مختصر اور مؤثر اردو میں دیں
- شائستہ لہجہ برقرار رکھیں
- اگر ضرورت ہو تو واضح سوالات پوچھیں
- کبھی غلط معلومات نہ دیں
"""


class HuggingFaceChatbot:
    """Unified local model chatbot supporting Transformers and Llama.cpp."""
    
    def __init__(
        self,
        model_id: str = DEFAULT_MODEL_ID,
        model_type: str = DEFAULT_MODEL_TYPE,
        device: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_new_tokens: int = 256,
        chat_format: Optional[str] = DEFAULT_CHAT_FORMAT,
        # Transformers specific
        load_in_8bit: bool = False,
        load_in_4bit: bool = True,
        # Llama specific
        n_ctx: int = 2048,
        n_gpu_layers: int = -1, # -1 for all layers on GPU
    ):
        self.model_id = model_id
        self.model_type = model_type.lower()
        self.system_prompt = system_prompt or SYSTEM_PROMPT
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        self.device = device
        self.chat_format = chat_format
        
        # Conversation history
        self.messages: List[Dict[str, str]] = []
        
        # Backend implementations
        self.transformers_model = None
        self.transformers_tokenizer = None
        self.llama_model = None
        
        if self.model_type == "transformers":
            self._init_transformers(load_in_8bit, load_in_4bit)
        elif self.model_type == "llama":
            self._init_llama(n_ctx, n_gpu_layers)
        else:
            raise ValueError(f"Unknown model_type: {model_type}")

    def _init_transformers(self, load_in_8bit, load_in_4bit):
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError("transformers not installed. Run: pip install transformers torch accelerate")
        
        print(f"[LLM] Loading Transformers model: {self.model_id}")
        
        device_map = "auto"
        if not self.device and torch.cuda.is_available():
             self.device = "cuda"
        elif not self.device:
             self.device = "cpu"
             device_map = None

        # Tweak for quantization
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
                print("[LLM] bitsandbytes not found, quantization disabled.")
        
        load_kwargs = {
            "trust_remote_code": True,
            "device_map": device_map,
        }
        if quantization_config:
            load_kwargs["quantization_config"] = quantization_config
        elif self.device == "cuda":
            load_kwargs["torch_dtype"] = torch.float16

        self.transformers_tokenizer = AutoTokenizer.from_pretrained(self.model_id, trust_remote_code=True)
        self.transformers_model = AutoModelForCausalLM.from_pretrained(self.model_id, **load_kwargs)
        
        if self.device == "cpu":
            self.transformers_model = self.transformers_model.to("cpu")
            
        print("[LLM] Transformers model loaded.")

    def _init_llama(self, n_ctx, n_gpu_layers):
        if not LLAMA_CPP_AVAILABLE:
            raise RuntimeError("llama-cpp-python not installed. Run: pip install llama-cpp-python")
        
        print(f"[LLM] Loading Llama.cpp model: {self.model_id}")
        print(f"[LLM] Chat format: {self.chat_format}")
        
        # If model_id looks like a repo ID (contains '/'), use from_pretrained
        if "/" in self.model_id and not os.path.exists(self.model_id):
            repo_id = self.model_id
            # Allow user to specify filename via env var, or fallback
            specified_filename = os.getenv("LLM_MODEL_FILENAME")
            
            filenames_to_try = [specified_filename] if specified_filename else [
                "gemma-2b-malayalam-t2-gguf-unsloth.Q5_K_M.gguf",
                "*Q5_K_M.gguf",
                "*Q4_K_M.gguf", 
                "*Q8_0.gguf",
                "*.gguf"
            ]
            
            model_loaded = False
            last_error = None
            
            for fname in filenames_to_try:
                try:
                    print(f"[LLM] Attempting to load '{fname}' from '{repo_id}'...")
                    self.llama_model = Llama.from_pretrained(
                        repo_id=repo_id,
                        filename=fname,
                        n_ctx=n_ctx,
                        n_gpu_layers=n_gpu_layers,
                        # chat_format="llama-3", # Removed for auto-detection
                        verbose=True
                    )
                    model_loaded = True
                    print(f"[LLM] Successfully loaded '{fname}'")
                    break
                except Exception as e:
                    print(f"[LLM] Failed option '{fname}': {e}")
                    last_error = e
            
            if not model_loaded:
                raise RuntimeError(
                    f"Could not load Llama model from repo '{repo_id}'. "
                    f"Last error: {last_error}. "
                    "Check if the Repo ID is correct and contains GGUF files."
                )

        else:
            # Local file path
            if not os.path.exists(self.model_id):
                raise FileNotFoundError(f"GGUF file not found: {self.model_id}")
            
            self.llama_model = Llama(
                model_path=self.model_id,
                n_ctx=n_ctx,
                n_gpu_layers=n_gpu_layers,
                # chat_format="llama-3", # Removed for auto-detection
                verbose=True
            )
            
        print(f"[LLM] Llama model loaded. Layers on GPU: {n_gpu_layers} ( -1 means all).")
    
    def _build_messages(self, user_input: str, context: Optional[str] = None, system_prompt: Optional[str] = None) -> List[Dict[str, str]]:
        messages = [{"role": "system", "content": system_prompt or self.system_prompt}]
        for m in self.messages:
            role = "user" if m["role"] == "user" else "assistant" # map 'agent' to 'assistant'
            messages.append({"role": role, "content": m["content"]})
        
        user_content = user_input
        if context:
            user_content = f"Context:\n{context}\n\nUser: {user_input}"
        
        messages.append({"role": "user", "content": user_content})
        return messages

    def generate_response(self, user_input: str, context: Optional[str] = None, system_prompt: Optional[str] = None) -> str:
        """Blocking generation."""
        # Accumulate stream
        chunks = []
        for chunk in self.generate_response_stream(user_input, context, system_prompt):
            chunks.append(chunk)
        return "".join(chunks).strip()

    def generate_response_stream(self, user_input: str, context: Optional[str] = None, system_prompt: Optional[str] = None) -> Generator[str, None, None]:
        if self.model_type == "transformers":
            yield from self._stream_transformers(user_input, context, system_prompt)
        elif self.model_type == "llama":
            yield from self._stream_llama(user_input, context, system_prompt)
            
    def _stream_transformers(self, user_input: str, context: Optional[str] = None, system_prompt: Optional[str] = None):
        messages = self._build_messages(user_input, context, system_prompt)
        
        # Apply template
        try:
             # Check for chat template availability
            if self.transformers_tokenizer.chat_template:
                 prompt = self.transformers_tokenizer.apply_chat_template(
                    messages, tokenize=False, add_generation_prompt=True
                )
            else:
                 raise ValueError("No chat template")
        except:
             # Fallback
            prompt = ""
            for m in messages:
                prompt += f"<{m['role']}>\n{m['content']}\n"
            prompt += "<assistant>\n"

        inputs = self.transformers_tokenizer(prompt, return_tensors="pt").to(self.transformers_model.device)
        
        streamer = TextIteratorStreamer(
            self.transformers_tokenizer, 
            skip_prompt=True, 
            skip_special_tokens=True,
            timeout=10.0
        )
        
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=self.max_new_tokens,
            temperature=self.temperature,
            do_sample=True,
            pad_token_id=self.transformers_tokenizer.eos_token_id,
        )
        
        thread = Thread(target=self.transformers_model.generate, kwargs=generation_kwargs)
        thread.start()
        
        accumulated_text = ""
        for new_text in streamer:
            accumulated_text += new_text
            yield new_text
            
        self._update_history(user_input, accumulated_text)

    def _stream_llama(self, user_input: str, context: Optional[str] = None, system_prompt: Optional[str] = None):
        messages = self._build_messages(user_input, context, system_prompt)
        
        # Llama-cpp-python handles chat templates internally usually, or we can use the messages API
        # It has a create_chat_completion method compatible with OpenAI API
        
        print(f"[LLM] Generating with params: temp={self.temperature}, max_tokens={self.max_new_tokens}")
        
        # Common stop sequences to prevent hallucination of new turns
        stop_sequences = ["</s>", "<s>", "[/INST]", "[INST]", "User:", "Agent:", "<|endoftext|>", "<end_of_turn>"]
        
        response_iter = self.llama_model.create_chat_completion(
            messages=messages,
            max_tokens=self.max_new_tokens,
            temperature=self.temperature,
            top_p=0.9,
            frequency_penalty=1.1,  # Penalize repetition
            presence_penalty=1.1,
            stream=True,
            stop=stop_sequences
        )
        
        accumulated_text = ""
        for chunk in response_iter:
            delta = chunk["choices"][0]["delta"]
            if "content" in delta:
                text_chunk = delta["content"]
                
                # Basic output cleaning to prevent tag leakage
                if any(tag in text_chunk for tag in ["<s>", "[INST]", "</s>"]):
                    continue
                    
                accumulated_text += text_chunk
                yield text_chunk
                
        self._update_history(user_input, accumulated_text)

    def _update_history(self, user_input: str, response: str):
        self.messages.append({"role": "user", "content": user_input})
        self.messages.append({"role": "assistant", "content": response.strip()})

    def reset_conversation(self):
        self.messages = []
    
    def set_history(self, history: List[Dict[str, str]]):
        self.messages = []
        for turn in history:
            role = turn.get("role", "user").lower()
            if role == "agent": role = "assistant"
            self.messages.append({"role": role, "content": turn.get("text", "")})

    def close(self):
        """Explicitly release resources."""
        if self.llama_model:
            print("[LLM] Closing Llama model...")
            # llama-cpp-python objects usually clean up on GC, but explicit cleanup can help
            # Note: The 'Llama' class object handles __del__, but we can try to force it or clear it.
            # There isn't a documented .close() in all versions, but deleting it is the standard way.
            del self.llama_model
            self.llama_model = None
        if self.transformers_model:
            del self.transformers_model
            self.transformers_model = None
            if torch and torch.cuda.is_available():
                torch.cuda.empty_cache()


def create_huggingface_chatbot(**kwargs) -> HuggingFaceChatbot:
    """Factory function."""
    return HuggingFaceChatbot(**kwargs)


if __name__ == "__main__":
    # Test block
    print("Testing HuggingFace chatbot...")
    bot = None
    try:
        # Default loads whatever is configured in DEFAULT_MODEL_TYPE/ID
        bot = HuggingFaceChatbot() 
        print(f"Loaded backend: {bot.model_type}")
        
        print("Streamed response:")
        full_resp = ""
        for chunk in bot.generate_response_stream("کیا آپ کو مری آواز آ رہی ہے؟"):
            print(chunk, end="", flush=True)
            full_resp += chunk
        print("\nDone.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if bot:
            print("Cleaning up...")
            bot.close()
