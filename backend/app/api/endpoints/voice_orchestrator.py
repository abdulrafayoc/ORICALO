"""
Voice Orchestrator — Streaming Pipeline with Barge-In Support.

Architecture:
  Audio In → STT (streaming) → Transcript
  Transcript → RAG (parallel) + LLM (streaming tokens)
  LLM tokens → Sentence Buffer → TTS (streaming chunks)
  TTS chunks → WebSocket → Frontend (immediate playback)

  Barge-In: VAD detects speech during SPEAKING state →
            Cancel LLM + TTS tasks → Flush audio → Resume LISTENING

State Machine:
  LISTENING → PROCESSING → SPEAKING → LISTENING
                                 ↓
                           (barge-in) → LISTENING
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import base64
import sys
import os
import time
import enum
import functools

# Append backend root
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt import Ear_hf
from llm import get_chatbot
from tts import get_tts
from rag.retriever import query_rag

router = APIRouter()


class AgentState(enum.Enum):
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"


# --- Sentence Buffering Utilities ---

# Characters that indicate a sentence boundary in Urdu and English
_SENTENCE_ENDERS = {"۔", ".", "!", "?", "؟", ":", "\n"}


def extract_sentences(buffer: str) -> tuple[list[str], str]:
    """
    Extract complete sentences from a token buffer.
    Returns (list_of_complete_sentences, remaining_buffer).
    
    Handles Urdu full stop (۔), English punctuation, and newlines.
    """
    sentences = []
    current = ""

    for char in buffer:
        current += char
        if char in _SENTENCE_ENDERS:
            stripped = current.strip()
            if stripped and len(stripped) > 3:  # Skip trivially small fragments
                sentences.append(stripped)
            current = ""

    return sentences, current


# --- Main WebSocket Endpoint ---

@router.websocket("/ws/voice_agent")
async def voice_agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Orchestrator] Voice WebSocket connected")

    # Initialize engines
    print("Enhanced Voice WebSocket connected")
    
    # Initialize Engines based on .env toggles
    stt_engine = Ear_hf()
    llm_engine = get_chatbot()
    tts_engine = get_tts()

    # State management
    state = AgentState.LISTENING
    interrupt_event = asyncio.Event()
    active_pipeline_tasks: list[asyncio.Task] = []

    # Audio queue for incoming microphone data
    audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    # Track what was actually spoken for context truncation on barge-in
    spoken_text_buffer: list[str] = []

    async def _send_json(data: dict):
        """Safe JSON send with connection check."""
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

    # --- Audio Generator for STT ---
    
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
        """Yields audio chunks from the queue for the STT engine."""
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

    # --- Pipeline: Transcript → RAG → LLM Stream → TTS Stream → Audio Out ---
    async def run_pipeline(user_text: str):
        """
        The core streaming pipeline. Runs as a cancellable task.
        
        1. Fire RAG query (async, non-blocking)
        2. Stream LLM tokens, buffer into sentences
        3. As each sentence completes, stream TTS audio chunks
        4. Send each audio chunk to frontend immediately
        """
        nonlocal spoken_text_buffer
        spoken_text_buffer = []

        try:
            # --- 1. Send user transcript to UI ---
            await _send_json({
                "type": "transcript",
                "text": user_text,
                "is_final": True,
                "speaker": "user",
            })

            await _set_state(AgentState.PROCESSING, "Thinking...")

            # --- 2. RAG Retrieval (async, non-blocking) ---
            try:
                rag_results = await asyncio.to_thread(query_rag, user_text, top_k=3)
                context_str = "\n".join([
                    f"[Listing-{r['id']}] {r.get('metadata', {}).get('title', r.get('text', '')[:80])}: "
                    f"{r.get('metadata', {}).get('price', 'N/A')} - {r.get('metadata', {}).get('location', '')}"
                    for r in rag_results
                ]) if rag_results else None
            except Exception as e:
                print(f"[Orchestrator] RAG error: {e}")
                context_str = None

            # --- 3. Stream LLM tokens → Sentence Buffer → TTS → Audio Out ---
            await _set_state(AgentState.SPEAKING, "Speaking...")

            full_reply = ""
            token_buffer = ""
            first_audio_sent = False

            async for token in llm_engine.async_stream_response(user_text, context=context_str):
                if interrupt_event.is_set():
                    break

                full_reply += token
                token_buffer += token

                # Check for complete sentences
                sentences, token_buffer = extract_sentences(token_buffer)

                for sentence in sentences:
                    if interrupt_event.is_set():
                        break

                    # Synthesize this sentence and stream audio chunks
                    try:
                        if hasattr(tts_engine, 'async_synthesize_stream'):
                            # ElevenLabs async streaming path
                            audio_chunks = []
                            async for audio_chunk in tts_engine.async_synthesize_stream(sentence):
                                if interrupt_event.is_set():
                                    break

                                audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": audio_b64,
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                                audio_chunks.append(audio_chunk)

                            if not interrupt_event.is_set():
                                spoken_text_buffer.append(sentence)

                        elif hasattr(tts_engine, '_synthesize_async'):
                            # Edge TTS async (full sentence, not chunked)
                            audio_bytes = await tts_engine._synthesize_async(sentence)
                            if not interrupt_event.is_set():
                                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": audio_b64,
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                                spoken_text_buffer.append(sentence)
                        else:
                            # Sync fallback
                            audio_bytes = await asyncio.to_thread(tts_engine.synthesize, sentence)
                            if not interrupt_event.is_set():
                                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                                await _send_json({
                                    "type": "audio_chunk",
                                    "data": audio_b64,
                                    "is_first": not first_audio_sent,
                                })
                                first_audio_sent = True
                                spoken_text_buffer.append(sentence)

                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        print(f"[Orchestrator] TTS error for sentence: {e}")

            # Flush remaining buffer as final sentence
            if token_buffer.strip() and not interrupt_event.is_set():
                remaining = token_buffer.strip()
                try:
                    if hasattr(tts_engine, 'async_synthesize_stream'):
                        async for audio_chunk in tts_engine.async_synthesize_stream(remaining):
                            if interrupt_event.is_set():
                                break
                            audio_b64 = base64.b64encode(audio_chunk).decode('utf-8')
                            await _send_json({
                                "type": "audio_chunk",
                                "data": audio_b64,
                                "is_first": not first_audio_sent,
                            })
                            first_audio_sent = True
                        if not interrupt_event.is_set():
                            spoken_text_buffer.append(remaining)
                    elif hasattr(tts_engine, '_synthesize_async'):
                        audio_bytes = await tts_engine._synthesize_async(remaining)
                        if not interrupt_event.is_set():
                            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                            await _send_json({
                                "type": "audio_chunk",
                                "data": audio_b64,
                                "is_first": not first_audio_sent,
                            })
                            spoken_text_buffer.append(remaining)
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    print(f"[Orchestrator] TTS flush error: {e}")

            # Signal end of audio stream
            if not interrupt_event.is_set():
                await _send_json({"type": "audio_end"})

                # Send complete agent transcript
                await _send_json({
                    "type": "transcript",
                    "text": full_reply,
                    "is_final": True,
                    "speaker": "agent",
                })

        except asyncio.CancelledError:
            print("[Orchestrator] Pipeline cancelled (barge-in)")
            # Truncate LLM history to what was actually spoken
            actually_spoken = " ".join(spoken_text_buffer)
            if hasattr(llm_engine, 'truncate_last_response'):
                llm_engine.truncate_last_response(actually_spoken)
            raise
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
            print(f"[Orchestrator] Pipeline error: {e}")
            await _send_json({
                "type": "error",
                "message": f"Pipeline error: {str(e)[:100]}",
            })

        finally:
            if not interrupt_event.is_set():
                await _set_state(AgentState.LISTENING, "Listening...")

    # --- Barge-In Handler ---
    async def handle_interrupt():
        """Cancel all active pipeline tasks and signal frontend to stop playback."""
        nonlocal active_pipeline_tasks
        interrupt_event.set()

        # Cancel active pipeline tasks
        for task in active_pipeline_tasks:
            if not task.done():
                task.cancel()

        # Wait for cancellations to propagate
        if active_pipeline_tasks:
            await asyncio.gather(*active_pipeline_tasks, return_exceptions=True)
        active_pipeline_tasks = []

        # Tell frontend to flush its audio buffer
        await _send_json({
            "type": "interrupt",
            "message": "User interrupted — clearing audio buffer",
        })

        interrupt_event.clear()
        await _set_state(AgentState.LISTENING, "Listening...")
        print("[Orchestrator] Barge-in handled — back to LISTENING")

    # --- STT Consumer Task ---
    async def stt_consumer():
        """
        Listens to the STT stream and orchestrates the pipeline.
        Handles barge-in when speech is detected during SPEAKING state.
        """
        nonlocal active_pipeline_tasks

        try:
            if hasattr(stt_engine, 'transcribe_stream_async'):
                # Deepgram / Groq async streaming path
                async for msg in stt_engine.transcribe_stream_async(audio_generator()):
                    msg_type = msg.get("type", "")

                    # --- Speech Started Event ---
                    if msg_type == "speech_started":
                        # We ignore Deepgram's raw VAD event because it's too sensitive to background noise.
                        # Instead, we will trigger barge-in only when actual text is transcribed below.
                        continue

                    # --- Utterance End Event ---
                    if msg_type == "utterance_end":
                        continue  # We rely on is_final transcripts instead

                    # --- Transcript Events ---
                    text = msg.get("text", "").strip()
                    is_final = msg.get("is_final", False)

                    if not text:
                        continue

                    # Trigger barge-in if we get actual text while speaking
                    # This prevents background noise from causing false interruptions
                    if state == AgentState.SPEAKING:
                        print(f"[Orchestrator] BARGE-IN detected on text: '{text}'")
                        await handle_interrupt()

                    if is_final:
                        # Launch new pipeline task
                        pipeline_task = asyncio.create_task(run_pipeline(text))
                        active_pipeline_tasks.append(pipeline_task)

                        # Clean up completed tasks
                        active_pipeline_tasks = [
                            t for t in active_pipeline_tasks if not t.done()
                        ]
                    else:
                        # Partial transcript — send to UI for live display
                        await _send_json({
                            "type": "transcript",
                            "text": text,
                            "is_final": False,
                            "speaker": "user",
                        })
            else:
                # Fallback for non-streaming STT
                await _send_json({
                    "type": "error",
                    "message": "STT engine does not support async streaming. Use Deepgram or Groq backend.",
                })

        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[Orchestrator] STT consumer error: {e}")
            try:
                await _send_json({
                    "type": "error",
                    "message": str(e),
                })
            except Exception:
                pass
        finally:
            is_agent_speaking.clear()

    # --- Start Pipeline ---
    await _set_state(AgentState.LISTENING, "Listening...")
    stt_task = asyncio.create_task(stt_consumer())
    # Start background tasks
    orchestrator_task = asyncio.create_task(stt_to_llm_to_tts())
    vad_task = asyncio.create_task(vad_monitor())

    # --- WebSocket Message Loop ---
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
        print("[Orchestrator] Voice WebSocket disconnected")
    except Exception as e:
        print(f"[Orchestrator] WebSocket loop error: {e}")
    finally:
        # Cleanup
        # Cleanup
        await audio_queue.put(None)

        # Cancel all tasks
        stt_task.cancel()
        for task in active_pipeline_tasks:
            if not task.done():
                task.cancel()

        try:
            await asyncio.gather(stt_task, *active_pipeline_tasks, return_exceptions=True)
        except Exception:
            pass

        await vad_queue.put(None)
        orchestrator_task.cancel()
        vad_task.cancel()
        
        try:
            await websocket.close()
        except Exception:
            pass

        print("[Orchestrator] Session cleaned up")
