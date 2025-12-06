"""
Gemini Flash LLM for ORICALO Urdu Real Estate Voice Agent.
Uses Google's Generative AI SDK for Gemini Flash model.
"""

import os
from typing import Generator, List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None


# System prompt for Urdu real estate agent persona
SYSTEM_PROMPT_URDU = """
آپ ایک شائستہ اور ماہر رئیل اسٹیٹ ایجنٹ ہیں جو پاکستان کے شہری علاقوں میں پراپرٹی خریدنے اور بیچنے میں مدد کرتے ہیں۔

آپ کے فرائض:
1. کلائنٹ کی ضروریات سمجھنا (بجٹ، مقام، پراپرٹی کی قسم)
2. مناسب پراپرٹیز تجویز کرنا
3. قیمتوں اور علاقوں کے بارے میں معلومات دینا
4. سوالات کا جواب دینا

قواعد:
- جواب مختصر اور مؤثر اردو/رومن اردو میں دیں
- شائستہ لہجہ برقرار رکھیں
- اگر ضرورت ہو تو واضح سوالات پوچھیں
- کبھی غلط معلومات نہ دیں
"""

SYSTEM_PROMPT_ENGLISH = """
You are a polite and expert real estate agent helping clients buy and sell property in Pakistani urban areas.

Your duties:
1. Understand client needs (budget, location, property type)
2. Suggest suitable properties
3. Provide information about prices and areas
4. Answer questions helpfully

Rules:
- Respond in concise Urdu/Roman Urdu (mixing some English is acceptable)
- Maintain a polite tone
- Ask clarifying questions if needed
- Never provide incorrect information
- Keep responses brief and suitable for voice conversation
"""


class GeminiChatbot:
    """Gemini Flash chatbot for real estate conversations."""
    
    def __init__(
        self,
        model_name: str = "gemini-2.0-flash-exp",
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: int = 256,
    ):
        if not GENAI_AVAILABLE:
            raise RuntimeError("google-generativeai not installed. Run: pip install google-generativeai")
        
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=self.api_key)
        
        self.model_name = model_name
        self.system_prompt = system_prompt or SYSTEM_PROMPT_ENGLISH
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=self.temperature,
                max_output_tokens=self.max_output_tokens,
            ),
        )
        
        # Conversation history
        self.chat = self.model.start_chat(history=[])
    
    def generate_response(self, user_input: str, context: Optional[str] = None) -> str:
        """Generate a response to user input."""
        prompt = user_input
        if context:
            prompt = f"Context:\n{context}\n\nUser: {user_input}"
        
        try:
            response = self.chat.send_message(prompt)
            return response.text.strip()
        except Exception as e:
            return f"[Error generating response: {str(e)}]"
    
    def generate_response_stream(self, user_input: str, context: Optional[str] = None) -> Generator[str, None, None]:
        """Stream response token by token."""
        prompt = user_input
        if context:
            prompt = f"Context:\n{context}\n\nUser: {user_input}"
        
        try:
            response = self.chat.send_message(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"[Error: {str(e)}]"
    
    def reset_conversation(self):
        """Reset conversation history."""
        self.chat = self.model.start_chat(history=[])
    
    def set_history(self, history: List[Dict[str, str]]):
        """Set conversation history from list of {role, text} dicts."""
        gemini_history = []
        for turn in history:
            role = "user" if turn.get("role", "").lower() == "user" else "model"
            gemini_history.append({
                "role": role,
                "parts": [turn.get("text", "")]
            })
        self.chat = self.model.start_chat(history=gemini_history)


def create_gemini_chatbot(**kwargs) -> GeminiChatbot:
    """Factory function to create a Gemini chatbot."""
    return GeminiChatbot(**kwargs)


if __name__ == "__main__":
    # Quick test
    try:
        bot = GeminiChatbot()
        print("Testing Gemini chatbot...")
        response = bot.generate_response("mujhe DHA Lahore mein 10 marla ghar chahiye")
        print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")
