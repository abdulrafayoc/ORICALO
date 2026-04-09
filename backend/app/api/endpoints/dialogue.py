"""
Dialogue API endpoints for ORICALO Agent.
Replaced static intent triggers with native LLM tool calling.
"""

from typing import List, Optional, Dict, Any
import asyncio
from fastapi import APIRouter
from pydantic import BaseModel

from llm import get_chatbot
from app.api.endpoints.voice_orchestrator import execute_tool

router = APIRouter(tags=["iteration2"])

class DialogueTurn(BaseModel):
    role: str
    text: str

class DialogueStepRequest(BaseModel):
    history: List[DialogueTurn]
    latest_transcript: str
    metadata: Optional[Dict[str, Any]] = None
    agent_id: Optional[int] = None

class DialogueAction(BaseModel):
    type: str
    payload: Optional[Dict[str, Any]] = None

class DialogueStepResponse(BaseModel):
    reply: str
    actions: List[DialogueAction] = []

_llm_instance = None

def _get_llm():
    global _llm_instance
    if _llm_instance is None:
        try:
            _llm_instance = get_chatbot()
        except Exception as e:
            print(f"[LLM] Failed to initialize: {e}")
            return None
    return _llm_instance

@router.post("/dialogue/step", response_model=DialogueStepResponse)
async def dialogue_step(payload: DialogueStepRequest) -> DialogueStepResponse:
    """Process dialogue step with LLM + Tool Calling."""
    transcript = payload.latest_transcript
    actions: List[DialogueAction] = []
    
    llm = _get_llm()
    if llm:
        try:
            recent_history = payload.history[-12:] 
            history = [{"role": t.role, "text": t.text} for t in recent_history]
            llm.set_history(history)
            
            # Use tools
            stream_generator = None
            if hasattr(llm, 'async_stream_response_with_tools'):
                stream_generator = llm.async_stream_response_with_tools(transcript, execute_tool)
            else:
                stream_generator = llm.async_stream_response(transcript)
                
            reply = ""
            async for token in stream_generator:
                reply += token
                
            # If tool was used and it was search_properties, maybe return listings action for frontend (stubbed for now)
            # You could introspect llm.history here to see if search_properties was fired.
            for msg in reversed(llm.history):
                if msg.get("role") == "tool" and msg.get("name") == "search_properties":
                    actions.append(DialogueAction(type="show_listings", payload={"context": "RAG data injected"}))
                    break
                elif msg.get("role") == "tool" and msg.get("name") == "get_price_estimate":
                    actions.append(DialogueAction(type="show_price", payload={"context": "Price estimated"}))
                    break
        except Exception as e:
            reply = f"معذرت، جواب میں مسئلہ آ گیا۔ ({str(e)[:50]})"
    else:
        reply = "جی، میں آپ کی مدد کے لیے حاضر ہوں۔ آپ کو کیسی پراپرٹی چاہیے؟"
    
    return DialogueStepResponse(reply=reply, actions=actions)
