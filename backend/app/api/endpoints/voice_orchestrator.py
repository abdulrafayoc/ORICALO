from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import base64
import sys
import os
import functools

# Append backend root
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt import Ear_hf, record_user, record_user_stream
from llm import get_chatbot
from tts import get_tts
from rag.retriever import query_rag

router = APIRouter()


# ---------------------------------------------------------------------------
# Async wrappers for blocking calls — prevents event-loop freeze
# ---------------------------------------------------------------------------

async def _async_rag_query(query: str, top_k: int = 2):
    """Run RAG retrieval in a thread so it doesn't block the event loop."""
    return await asyncio.to_thread(query_rag, query, top_k)


async def _async_llm_generate(llm_engine, user_text: str, context: str):
    """Run LLM generation in a thread so it doesn't block the event loop."""
    return await asyncio.to_thread(llm_engine.generate_response, user_text, context=context)


async def _async_tts_synthesize(tts_engine, text: str) -> bytes:
    """Run TTS synthesis in a thread so it doesn't block the event loop.
    If the engine has a native async method, prefer that."""
    if hasattr(tts_engine, '_synthesize_async'):
        # EdgeTTS has a native async method — use it directly
        return await tts_engine._synthesize_async(text)
    else:
        return await asyncio.to_thread(tts_engine.synthesize, text)


@router.websocket("/ws/voice_agent")
async def voice_agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Full-Duplex Voice WebSocket connected")
    
    # Initialize Engines based on .env toggles
    stt_engine = Ear_hf()
    llm_engine = get_chatbot()
    tts_engine = get_tts()
    
    # Tell frontend we are ready
    await websocket.send_text(json.dumps({
        "type": "status",
        "status": "listening",
        "message": "Listening..."
    }))
    
    # Async Queue for Incoming Audio chunks
    audio_queue = asyncio.Queue()

    async def audio_generator():
        """Yields audio chunks from the queue for STT."""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

    async def stt_to_llm_to_tts():
        """
        Background task orchestrating the flow:
        STT Stream -> Final Transcript -> RAG -> LLM -> TTS -> WebSocket (Audio bytes)
        """
        try:
            # Check if STT engine is async (like deepgram_stt.py) or sync (like stt_hf.py)
            if hasattr(stt_engine, 'transcribe_stream_async'):
                # API Backend flow
                async for msg in stt_engine.transcribe_stream_async(audio_generator()):
                    if msg.get("is_final"):
                        user_text = msg["text"]
                        
                        # 1. Send Transcript to UI
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "text": user_text,
                            "is_final": True,
                            "speaker": "user"
                        }))
                        
                        try:
                            # Tell UI we are processing
                            await websocket.send_text(json.dumps({
                                "type": "status", "status": "processing", "message": "Thinking..."
                            }))

                            # 2. RAG Retrieval (non-blocking)
                            rag_results = await _async_rag_query(user_text, top_k=2)
                            context_str = "\n".join([
                                f"[Listing-{r['id']}] {r.get('metadata', {}).get('title', r.get('text', '')[:80])}: "
                                f"{r.get('metadata', {}).get('price', 'N/A')} - {r.get('metadata', {}).get('location', '')}"
                                for r in rag_results
                            ])
                            
                            # 3. LLM Generation (non-blocking)
                            agent_reply = await _async_llm_generate(llm_engine, user_text, context_str)
                            
                            # Send Agent Text to UI
                            await websocket.send_text(json.dumps({
                                "type": "transcript",
                                "text": agent_reply,
                                "is_final": True,
                                "speaker": "agent"
                            }))
                            
                            await websocket.send_text(json.dumps({
                                "type": "status", "status": "speaking", "message": "Speaking..."
                            }))

                            # 4. Text-to-Speech Generation (non-blocking)
                            audio_bytes = await _async_tts_synthesize(tts_engine, agent_reply)
                            
                            # 5. Send Audio back to Frontend
                            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                            await websocket.send_text(json.dumps({
                                "type": "audio_out",
                                "data": audio_b64
                            }))

                        except Exception as e:
                            print(f"Error during LLM/TTS interaction: {e}")
                            await websocket.send_text(json.dumps({
                                "type": "error",
                                "message": f"Pipeline error: {str(e)[:100]}"
                            }))
                            
                        finally:
                            # Always reset back to listening
                            await websocket.send_text(json.dumps({
                                "type": "status", "status": "listening", "message": "Listening..."
                            }))

                    else:
                        # Partial transcripts
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "text": msg["text"],
                            "is_final": False,
                            "speaker": "user"
                        }))
            else:
                # Local Backend Flow (stt_hf.py block-threading implementation)
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Local STT flow requires threading (stt_hf), please use API mode for the PoC Demo."
                }))
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Orchestrator pipeline error: {e}")
            try:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))
            except Exception:
                pass

    orchestrator_task = asyncio.create_task(stt_to_llm_to_tts())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio" and "data" in message:
                audio_bytes = base64.b64decode(message["data"])
                await audio_queue.put(audio_bytes)
                
            elif message.get("type") == "close":
                break
                
    except WebSocketDisconnect:
        print("Voice WebSocket disconnected")
    except Exception as e:
        print(f"Error in websocket loop: {e}")
    finally:
        await audio_queue.put(None)
        orchestrator_task.cancel()
        try:
             await websocket.close()
        except Exception:
             pass
