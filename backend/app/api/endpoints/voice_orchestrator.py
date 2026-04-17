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
    async def audio_generator():
        """Yields audio chunks from the queue for the STT engine."""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

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

            # --- 2. LLM Tool Calling Stream → Sentence Buffer → TTS → Audio Out ---
            await _set_state(AgentState.SPEAKING, "Speaking...")

            full_reply = ""
            token_buffer = ""
            first_audio_sent = False

            async def _tts_sentence(text: str) -> bool:
                """
                Synthesize one sentence. Returns False if interrupted mid-stream.
                Properly closes the TTS generator on cancellation / interrupt
                so no orphaned Uplift socket requests are left open.
                """
                nonlocal first_audio_sent
                gen = tts_engine.async_synthesize_stream(text)
                try:
                    async for audio_chunk in gen:
                        if interrupt_event.is_set():
                            return False
                        if not audio_chunk:
                            continue
                        audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
                        await _send_json({
                            "type": "audio_chunk",
                            "data": audio_b64,
                            "is_first": not first_audio_sent,
                        })
                        first_audio_sent = True
                    return not interrupt_event.is_set()
                except asyncio.CancelledError:
                    await gen.aclose()   # tell Uplift to cancel the socket request
                    raise
                finally:
                    await gen.aclose()   # idempotent; closes if not already closed

            async for token in llm_engine.async_stream_response(user_text):
                if interrupt_event.is_set():
                    break

                full_reply += token
                token_buffer += token

                sentences, token_buffer = extract_sentences(token_buffer)

                for sentence in sentences:
                    if interrupt_event.is_set():
                        break
                    try:
                        completed = await _tts_sentence(sentence)
                        if completed:
                            spoken_text_buffer.append(sentence)
                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        print(f"[Orchestrator] TTS error: {e}")

            # Flush remaining buffer (dangling partial sentence after LLM stream ends)
            if token_buffer.strip() and not interrupt_event.is_set():
                remaining = token_buffer.strip()
                try:
                    completed = await _tts_sentence(remaining)
                    if completed:
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
            actually_spoken = " ".join(spoken_text_buffer)
            if hasattr(llm_engine, 'truncate_last_response'):
                llm_engine.truncate_last_response(actually_spoken)
            raise

        except Exception as e:
            print(f"[Orchestrator] Pipeline error: {e}")
            await _send_json({
                "type": "error",
                "message": f"Pipeline error: {str(e)[:100]}",
            })

        finally:
            # ALWAYS reset to LISTENING — regardless of interrupt or cancellation.
            # handle_interrupt() also sets this, but we must not rely on it exclusively
            # to avoid a state machine freeze if the two paths race.
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

                    # Trigger barge-in ONLY on final transcripts with actual content.
                    # Interim fragments are too noisy — they would cancel the agent
                    # mid-sentence on every partial word recognition.
                    if state == AgentState.SPEAKING and is_final:
                        print(f"[Orchestrator] BARGE-IN detected on text: '{text}'")
                        await handle_interrupt()

                    if is_final:
                        # Launch new pipeline task (barge-in already cleared old tasks above)
                        pipeline_task = asyncio.create_task(run_pipeline(text))
                        active_pipeline_tasks.append(pipeline_task)

                        # Prune completed tasks from the list
                        active_pipeline_tasks = [
                            t for t in active_pipeline_tasks if not t.done()
                        ]
                    else:
                        # Partial transcript — send to UI for live display only
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

    # --- Start Pipeline ---
    await _set_state(AgentState.LISTENING, "Listening...")
    stt_task = asyncio.create_task(stt_consumer())

    # --- WebSocket Message Loop ---
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
        print("[Orchestrator] Voice WebSocket disconnected")
    except Exception as e:
        print(f"[Orchestrator] WebSocket loop error: {e}")
    finally:
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

        try:
            await websocket.close()
        except Exception:
            pass

        print("[Orchestrator] Session cleaned up")
