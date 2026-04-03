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
    print("Enhanced Voice WebSocket connected")
    
    # Initialize Engines based on .env toggles
    stt_engine = Ear_hf()
    llm_engine = get_chatbot()
    tts_engine = get_tts()
    
    # State management for interruption
    is_agent_speaking = asyncio.Event()
    should_interrupt = asyncio.Event()
    
    # Tell frontend we are ready
    await websocket.send_text(json.dumps({
        "type": "status",
        "status": "listening",
        "message": "Listening..."
    }))
    
    # Async Queue for Incoming Audio chunks
    audio_queue = asyncio.Queue()
    
    # VAD for interruption detection
    vad_queue = asyncio.Queue()

    async def audio_generator():
        """Yields audio chunks from the queue for STT."""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk
    
    async def vad_monitor():
        """Monitor VAD for user speech during agent playback"""
        try:
            # Create a separate VAD instance for monitoring with lower threshold
            from stt.vad import OptimizedVAD
            vad = OptimizedVAD(threshold=0.3)  # Lower threshold for more sensitivity
            
            print("🎤 VAD monitor started")
            
            while True:
                chunk = await vad_queue.get()
                if chunk is None:
                    break
                
                # Convert PCM bytes to float32 for VAD
                if isinstance(chunk, bytes):
                    import numpy as np
                    try:
                        audio_int16 = np.frombuffer(chunk, dtype=np.int16)
                        audio_float = audio_int16.astype(np.float32) / 32768.0
                        
                        # Check if there's actual audio data (not just silence)
                        if np.abs(audio_float).max() > 0.001:  # Check if there's actual sound
                            prob = vad(audio_float)
                            is_speech = prob > 0.1  # Use lower threshold
                            
                            # Debug logging
                            if len(chunk) > 0:
                                print(f"🎤 VAD: prob={prob:.3f}, speech={is_speech}, agent_speaking={is_agent_speaking.is_set()}")
                            
                            # More aggressive interruption logic with debouncing
                            if is_agent_speaking.is_set():
                                # If agent is speaking, any significant audio should interrupt
                                audio_level = np.abs(audio_float).max()
                                if audio_level > 0.01 or is_speech:  # Either speech or significant audio
                                    if not should_interrupt.is_set():  # Only send interruption once
                                        print(f"🗣️ Audio detected during agent playback - INTERRUPTING! (level={audio_level:.3f})")
                                        should_interrupt.set()
                                        await websocket.send_text(json.dumps({
                                            "type": "status",
                                            "status": "interrupted",
                                            "message": "User detected - stopping..."
                                        }))
                            elif is_speech:
                                print("🎤 User speech detected (agent not speaking)")
                                    
                    except Exception as e:
                        print(f"VAD processing error: {e}")
                        
        except asyncio.CancelledError:
            print("VAD monitor cancelled")
        except Exception as e:
            print(f"VAD monitor error: {e}")

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
                            
                            # Clean RAG context to prevent hallucinations and hide IDs
                            context_str = ""
                            if rag_results:
                                valid_results = []
                                for r in rag_results:
                                    # Only include results with valid metadata
                                    metadata = r.get('metadata', {})
                                    if metadata and isinstance(metadata, dict):
                                        # Clean property description without IDs
                                        property_desc = (
                                            f"Property: {metadata.get('title', r.get('text', '')[:80])}. "
                                            f"Price: {metadata.get('price', 'N/A')}. "
                                            f"Location: {metadata.get('location', '')}. "
                                            f"Type: {metadata.get('type', 'N/A')}. "
                                            f"Bedrooms: {metadata.get('bedrooms', 'N/A')}. "
                                            f"Area: {metadata.get('area', 'N/A')}"
                                        )
                                        valid_results.append(property_desc)
                                
                                if valid_results:
                                    context_str = "\n".join(valid_results)
                                else:
                                    context_str = "No specific properties found in the database matching your query."
                            else:
                                context_str = "No property information available for this query."
                            
                            # 3. LLM Generation (non-blocking)
                            agent_reply = await _async_llm_generate(llm_engine, user_text, context_str)
                            
                            # Validate LLM response to prevent hallucinations
                            if rag_results:
                                # Check if response mentions properties not in context
                                mentioned_properties = []
                                for r in rag_results:
                                    metadata = r.get('metadata', {})
                                    if metadata:
                                        title = metadata.get('title', '').lower()
                                        location = metadata.get('location', '').lower()
                                        price = str(metadata.get('price', '')).lower()
                                        
                                        # Check if agent mentions these details
                                        reply_lower = agent_reply.lower()
                                        if (title and title in reply_lower) or \
                                           (location and location in reply_lower) or \
                                           (price and price in reply_lower):
                                            mentioned_properties.append(r['id'])
                                
                                # Warn about potential hallucinations
                                if mentioned_properties:
                                    print(f"⚠️ Agent mentioned properties: {mentioned_properties}")
                                else:
                                    print("✅ Agent response is contextually accurate")
                            
                            # Check for interruption after LLM generation
                            if should_interrupt.is_set():
                                print("🗣️ LLM generation interrupted!")
                                is_agent_speaking.clear()
                                should_interrupt.clear()  # Reset interruption flag
                                await websocket.send_text(json.dumps({
                                    "type": "audio_stop",
                                    "reason": "user_speech"
                                }))
                                await websocket.send_text(json.dumps({
                                    "type": "status", 
                                    "status": "listening", 
                                    "message": "Listening..."
                                }))
                                continue
                            
                            # Send Agent Text to UI (only once)
                            await websocket.send_text(json.dumps({
                                "type": "transcript",
                                "text": agent_reply,
                                "is_final": True,
                                "speaker": "agent"
                            }))
                            
                            await websocket.send_text(json.dumps({
                                "type": "status", "status": "speaking", "message": "Speaking..."
                            }))

                            # 4. Traditional TTS (no streaming)
                            is_agent_speaking.set()
                            should_interrupt.clear()
                            
                            try:
                                # Generate TTS for complete response
                                audio_bytes = await _async_tts_synthesize(tts_engine, agent_reply)
                                
                                # Check for interruption after TTS synthesis
                                if should_interrupt.is_set():
                                    print("TTS interrupted after synthesis")
                                    is_agent_speaking.clear()
                                    should_interrupt.clear()  # Reset interruption flag
                                    await websocket.send_text(json.dumps({
                                        "type": "audio_stop",
                                        "reason": "user_speech"
                                    }))
                                    await websocket.send_text(json.dumps({
                                        "type": "status", 
                                        "status": "listening", 
                                        "message": "Listening..."
                                    }))
                                    continue
                                
                                # Send complete audio
                                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                                await websocket.send_text(json.dumps({
                                    "type": "audio_out",
                                    "data": audio_b64,
                                    "interruptible": True
                                }))
                                
                                # Monitor for interruption during audio playback
                                try:
                                    await asyncio.wait_for(should_interrupt.wait(), timeout=5.0)
                                    print("🗣️ Audio playback interrupted!")
                                    is_agent_speaking.clear()
                                    should_interrupt.clear()  # Reset interruption flag
                                    await websocket.send_text(json.dumps({
                                        "type": "audio_stop",
                                        "reason": "user_speech"
                                    }))
                                    await websocket.send_text(json.dumps({
                                        "type": "status", 
                                        "status": "listening", 
                                        "message": "Listening..."
                                    }))
                                except asyncio.TimeoutError:
                                    # Normal completion
                                    print("✅ Audio playback completed normally")
                                    
                            except Exception as e:
                                print(f"Error during TTS interaction: {e}")
                                await websocket.send_text(json.dumps({
                                    "type": "error",
                                    "message": f"TTS error: {str(e)[:100]}"
                                }))
                            
                            is_agent_speaking.clear()

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
        finally:
            is_agent_speaking.clear()

    # Start background tasks
    orchestrator_task = asyncio.create_task(stt_to_llm_to_tts())
    vad_task = asyncio.create_task(vad_monitor())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio" and "data" in message:
                audio_bytes = base64.b64decode(message["data"])
                await audio_queue.put(audio_bytes)
                # Also send to VAD monitor for interruption detection
                await vad_queue.put(audio_bytes)
                
            elif message.get("type") == "close":
                break
                
    except WebSocketDisconnect:
        print("Voice WebSocket disconnected")
    except Exception as e:
        print(f"Error in websocket loop: {e}")
    finally:
        # Cleanup
        await audio_queue.put(None)
        await vad_queue.put(None)
        orchestrator_task.cancel()
        vad_task.cancel()
        
        try:
             await websocket.close()
        except Exception:
             pass
