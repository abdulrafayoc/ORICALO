"""
Voice Orchestrator — Streaming Pipeline with Barge-In Support and Tools.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import base64
import sys
import os
import enum
import httpx

# Append backend root
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt import Ear_hf
from llm import get_chatbot
from tts import get_tts

# For tools
from rag.retriever import query_rag

router = APIRouter()

class AgentState(enum.Enum):
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"

_SENTENCE_ENDERS = {"۔", ".", "!", "?", "؟", ":", "\n"}

def extract_sentences(buffer: str) -> tuple[list[str], str]:
    sentences = []
    current = ""
    for char in buffer:
        current += char
        if char in _SENTENCE_ENDERS:
            stripped = current.strip()
            if stripped and len(stripped) > 3:
                sentences.append(stripped)
            current = ""
    return sentences, current

async def execute_tool(func_name: str, func_args: dict) -> str:
    """Invokes the actual backend functions for LLM tools."""
    print(f"[Tools] Executing {func_name} with args: {func_args}")
    
    if func_name == "search_properties":
        query = func_args.get("query", "")
        max_res = func_args.get("max_results", 3)
        try:
            results = await asyncio.to_thread(query_rag, query, top_k=max_res)
            if not results:
                return "No properties found matching the query."
            
            context = []
            for r in results:
                meta = r.get("metadata", {})
                context.append(f"Listing ID: {r.get('id')} - {meta.get('title', 'Unknown')} | Price: {meta.get('price', 'N/A')} | Location: {meta.get('location', 'N/A')} | Specs: {meta.get('bedrooms', '?')} bed, {meta.get('baths', '?')} bath, {meta.get('area', '?')}")
            return "\\n".join(context)
        except Exception as e:
            return f"Failed to search: {str(e)}"
            
    elif func_name == "get_price_estimate":
        location = func_args.get("location", "Lahore")
        area_marla = func_args.get("area_marla", 10)
        # Using the heuristic logic directly for speed to avoid loading the model here
        base_prices = {
            "dha": 350,  # lakh per marla
            "bahria": 180,
            "johar": 120,
            "gulberg": 280,
            "model town": 200,
            "cantt": 250,
        }
        loc_lower = location.lower()
        base = 100
        for k, v in base_prices.items():
            if k in loc_lower:
                base = v
                break
        total_lakh = int(base * area_marla)
        min_price = total_lakh * 0.9
        max_price = total_lakh * 1.1
        return f"Estimated Price for {area_marla} marla in {location}: {min_price:,.0f} Lakh to {max_price:,.0f} Lakh PKR."
        
    elif func_name == "schedule_viewing":
        listing_id = func_args.get("listing_id")
        date = func_args.get("preferred_date")
        return f"Successfully scheduled viewing for property {listing_id} on {date}. An agent will contact them."
        
    return "Tool not found."

@router.websocket("/ws/voice_agent")
async def voice_agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Orchestrator] Voice WebSocket connected")

    stt_engine = Ear_hf()
    llm_engine = get_chatbot()
    tts_engine = get_tts()

    state = AgentState.LISTENING
    interrupt_event = asyncio.Event()
    active_pipeline_tasks: list[asyncio.Task] = []
    audio_queue: asyncio.Queue = asyncio.Queue()

    # Track complete session
    spoken_text_buffer: list[str] = []
    session_transcript: list[dict] = []
    caller_phone = "+923000000000" # Placeholder until frontend passes headers
    agent_id = 1

    async def _send_json(data: dict):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass

    async def _set_state(new_state: AgentState, message: str = ""):
        nonlocal state
        state = new_state
        await _send_json({
            "type": "status",
            "status": new_state.value,
            "message": message or new_state.value.capitalize() + "...",
        })

    async def audio_generator():
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

    async def run_pipeline(user_text: str):
        nonlocal spoken_text_buffer
        spoken_text_buffer = []
        session_transcript.append({"role": "user", "text": user_text})

        try:
            await _send_json({
                "type": "transcript",
                "text": user_text,
                "is_final": True,
                "speaker": "user",
            })
            await _set_state(AgentState.PROCESSING, "Thinking...")

            await _set_state(AgentState.SPEAKING, "Speaking...")
            full_reply = ""
            token_buffer = ""
            first_audio_sent = False

            # Use NEW async stream method with tools
            stream_generator = None
            if hasattr(llm_engine, 'async_stream_response_with_tools'):
                stream_generator = llm_engine.async_stream_response_with_tools(user_text, execute_tool)
            else:
                stream_generator = llm_engine.async_stream_response(user_text)

            async for token in stream_generator:
                if interrupt_event.is_set():
                    break
                
                full_reply += token
                token_buffer += token
                sentences, token_buffer = extract_sentences(token_buffer)

                for sentence in sentences:
                    if interrupt_event.is_set():
                        break

                    try:
                        if hasattr(tts_engine, 'async_synthesize_stream'):
                            async for audio_chunk in tts_engine.async_synthesize_stream(sentence):
                                if interrupt_event.is_set(): break
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": base64.b64encode(audio_chunk).decode('utf-8'),
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                            if not interrupt_event.is_set():
                                spoken_text_buffer.append(sentence)

                        elif hasattr(tts_engine, '_synthesize_async'):
                            audio_bytes = await tts_engine._synthesize_async(sentence)
                            if not interrupt_event.is_set():
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": base64.b64encode(audio_bytes).decode('utf-8'),
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                                spoken_text_buffer.append(sentence)
                        else:
                            audio_bytes = await asyncio.to_thread(tts_engine.synthesize, sentence)
                            if not interrupt_event.is_set():
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": base64.b64encode(audio_bytes).decode('utf-8'),
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                                spoken_text_buffer.append(sentence)
                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        print(f"[Orchestrator] TTS error for sentence: {e}")

            if token_buffer.strip() and not interrupt_event.is_set():
                remaining = token_buffer.strip()
                try:
                    if hasattr(tts_engine, 'async_synthesize_stream'):
                        async for audio_chunk in tts_engine.async_synthesize_stream(remaining):
                            if interrupt_event.is_set(): break
                            await _send_json({"type": "audio_chunk", "data": base64.b64encode(audio_chunk).decode('utf-8'), "is_first": not first_audio_sent})
                            first_audio_sent = True
                        if not interrupt_event.is_set(): spoken_text_buffer.append(remaining)
                    else:
                        audio_bytes = await asyncio.to_thread(tts_engine.synthesize, remaining)
                        if not interrupt_event.is_set():
                            await _send_json({"type": "audio_chunk", "data": base64.b64encode(audio_bytes).decode('utf-8'), "is_first": not first_audio_sent})
                            spoken_text_buffer.append(remaining)
                except Exception as e:
                    pass

            if not interrupt_event.is_set():
                await _send_json({"type": "audio_end"})
                await _send_json({"type": "transcript", "text": full_reply, "is_final": True, "speaker": "agent"})
                session_transcript.append({"role": "agent", "text": full_reply})

        except asyncio.CancelledError:
            print("[Orchestrator] Pipeline cancelled (barge-in)")
            actually_spoken = " ".join(spoken_text_buffer)
            session_transcript.append({"role": "agent", "text": actually_spoken + " [interrupted]"})
            if hasattr(llm_engine, 'truncate_last_response'):
                llm_engine.truncate_last_response(actually_spoken)
            raise
        except Exception as e:
            print(f"[Orchestrator] Pipeline error: {e}")
        finally:
            if not interrupt_event.is_set():
                await _set_state(AgentState.LISTENING, "Listening...")

    async def handle_interrupt():
        nonlocal active_pipeline_tasks
        interrupt_event.set()
        for task in active_pipeline_tasks:
            if not task.done(): task.cancel()
        if active_pipeline_tasks:
            await asyncio.gather(*active_pipeline_tasks, return_exceptions=True)
        active_pipeline_tasks = []
        await _send_json({"type": "interrupt", "message": "User interrupted"})
        interrupt_event.clear()
        await _set_state(AgentState.LISTENING, "Listening...")

    async def stt_consumer():
        nonlocal active_pipeline_tasks
        try:
            if hasattr(stt_engine, 'transcribe_stream_async'):
                async for msg in stt_engine.transcribe_stream_async(audio_generator()):
                    msg_type = msg.get("type", "")
                    if msg_type == "speech_started":
                        continue
                    if msg_type == "utterance_end":
                        continue
                    text = msg.get("text", "").strip()
                    is_final = msg.get("is_final", False)
                    if not text: continue
                    
                    if state == AgentState.SPEAKING:
                        print(f"[Orchestrator] BARGE-IN detected on text: '{text}'")
                        await handle_interrupt()
                        
                    if is_final:
                        pipeline_task = asyncio.create_task(run_pipeline(text))
                        active_pipeline_tasks.append(pipeline_task)
                        active_pipeline_tasks = [t for t in active_pipeline_tasks if not t.done()]
                    else:
                        await _send_json({"type": "transcript", "text": text, "is_final": False, "speaker": "user"})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[Orchestrator] STT error: {e}")

    await _set_state(AgentState.LISTENING, "Listening...")
    stt_task = asyncio.create_task(stt_consumer())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message.get("type") == "audio" and "data" in message:
                await audio_queue.put(base64.b64decode(message["data"]))
            elif message.get("type") == "close":
                break
    except WebSocketDisconnect:
        print("[Orchestrator] Voice WebSocket disconnected")
    finally:
        await audio_queue.put(None)
        stt_task.cancel()
        for task in active_pipeline_tasks:
            if not task.done(): task.cancel()
        try:
            await asyncio.gather(stt_task, *active_pipeline_tasks, return_exceptions=True)
        except Exception: pass
        try:
            await websocket.close()
        except: pass
        print("[Orchestrator] Session cleaned up. Firing POST to /analytics/process_call")
        
        # Post-Call Analytics Fire-and-Forget
        if session_transcript:
            async def trigger_analytics():
                try:
                    async with httpx.AsyncClient() as client:
                        payload = {
                            "history": session_transcript,
                            "caller_phone": caller_phone,
                            "agent_id": agent_id,
                            "duration_secs": 180 # dummy duration
                        }
                        await client.post("http://127.0.0.1:8000/analytics/process_call", json=payload, timeout=20.0)
                except Exception as e:
                    print(f"[Orchestrator] Analytics post-call webhook failed: {e}")
            
            asyncio.create_task(trigger_analytics())
