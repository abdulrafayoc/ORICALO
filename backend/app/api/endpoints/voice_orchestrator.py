"""
Voice Orchestrator — Streaming Pipeline with Barge-In Support.

Architecture:
  Audio In → STT (streaming) → Transcript
  Transcript → RAG (parallel) + LLM (streaming tokens)
  LLM tokens → Sentence Buffer → TTS (streaming chunks)
  TTS chunks → WebSocket → Frontend (immediate playback)

  Barge-In: VAD detects INTERIM speech during SPEAKING state →
            Set interrupt_event → pipeline self-cancels → LISTENING

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
import logging

# Append backend root so stt/llm/tts imports resolve
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt import Ear_hf
from llm import get_chatbot
from tts import get_tts

router = APIRouter()
logger = logging.getLogger(__name__)


class AgentState(enum.Enum):
    LISTENING  = "listening"
    PROCESSING = "processing"
    SPEAKING   = "speaking"


# ── Sentence Buffering ────────────────────────────────────────────────────────

# Boundaries in Urdu + English
_SENTENCE_ENDERS = {"۔", ".", "!", "?", "؟", ":", "\n"}

# Minimum chars before we start TTS on the first sentence.
# Keeps the first chunk from being a single comma or very short phrase.
_MIN_SENTENCE_LEN = 8


def extract_sentences(buffer: str) -> tuple[list[str], str]:
    """
    Extract complete sentences from a streaming token buffer.
    Returns (list_of_complete_sentences, remaining_buffer).
    Handles Urdu (۔ ؟) and English punctuation.
    """
    sentences = []
    current = ""
    for char in buffer:
        current += char
        if char in _SENTENCE_ENDERS:
            stripped = current.strip()
            if stripped and len(stripped) > _MIN_SENTENCE_LEN:
                sentences.append(stripped)
            current = ""
    return sentences, current


# ── Main WebSocket Endpoint ───────────────────────────────────────────────────

@router.websocket("/ws/voice_agent")
async def voice_agent_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Voice WebSocket connected")

    # Initialize engines
    stt_engine = Ear_hf()
    llm_engine  = get_chatbot()
    tts_engine  = get_tts()

    # ── State ────────────────────────────────────────────────────────────────
    state = AgentState.LISTENING

    # interrupt_event: SET means "pipeline must stop NOW".
    # Checked inside _tts_sentence on every audio chunk.
    interrupt_event = asyncio.Event()

    # Current pipeline task (only one runs at a time)
    active_pipeline_task: asyncio.Task | None = None

    # Audio queue: WebSocket loop → STT
    audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

    # Sentences actually spoken (for LLM context truncation on barge-in)
    spoken_text_buffer: list[str] = []

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _send_json(data: dict):
        """Fire-and-forget JSON send; swallows closed-connection errors."""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass

    async def _set_state(new_state: AgentState, message: str = ""):
        nonlocal state
        state = new_state
        await _send_json({
            "type":    "status",
            "status":  new_state.value,
            "message": message or new_state.value.capitalize() + "...",
        })

    async def audio_generator():
        """Yields PCM audio chunks from the queue to the STT engine."""
        while True:
            chunk = await audio_queue.get()
            if chunk is None:
                break
            yield chunk

    # ── Core Streaming Pipeline ───────────────────────────────────────────────

    async def run_pipeline(user_text: str):
        """
        Cancellable pipeline task:
          transcript → (dialogue actions) → LLM stream → sentence buffer → TTS → audio out

        CancelledError propagates cleanly because every await inside is
        either a queue.get() (cancellable) or an async generator that
        propagates CancelledError through aclose().
        """
        nonlocal spoken_text_buffer
        spoken_text_buffer = []

        try:
            # 1. Echo user transcript to UI
            await _send_json({
                "type":     "transcript",
                "text":     user_text,
                "is_final": True,
                "speaker":  "user",
            })

            await _set_state(AgentState.PROCESSING, "Thinking...")

            # 2. Fire dialogue/step concurrently for widget actions (RAG listings, price widget).
            #    We do NOT await this before starting the LLM — it runs in the background.
            async def _fetch_actions():
                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=5.0) as _c:
                        r = await _c.post(
                            "http://localhost:8000/dialogue/step",
                            json={"history": [], "latest_transcript": user_text},
                        )
                        if r.status_code == 200:
                            actions = r.json().get("actions", [])
                            if actions:
                                await _send_json({"type": "actions", "actions": actions})
                except Exception as e:
                    logger.debug(f"Dialogue actions fetch skipped: {e}")

            actions_task = asyncio.create_task(_fetch_actions())

            # 3. Transition to SPEAKING immediately — the LLM is already streaming
            await _set_state(AgentState.SPEAKING, "Speaking...")

            full_reply   = ""
            token_buffer = ""
            first_audio_sent = False

            async def _tts_sentence(text: str) -> bool:
                """
                Synthesize one sentence and stream audio chunks to the client.
                Returns True if completed fully, False if interrupted.

                Key barge-in fix: checks interrupt_event BEFORE each await
                so cancellation propagates on the very next event-loop tick,
                not after the next audio chunk arrives from Uplift.
                """
                nonlocal first_audio_sent
                if interrupt_event.is_set():
                    return False

                gen = tts_engine.async_synthesize_stream(text)
                try:
                    async for audio_chunk in gen:
                        # ← check interrupt before sending each chunk
                        if interrupt_event.is_set():
                            return False
                        if not audio_chunk:
                            continue
                        audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
                        await _send_json({
                            "type":     "audio_chunk",
                            "data":     audio_b64,
                            "is_first": not first_audio_sent,
                        })
                        first_audio_sent = True
                    return not interrupt_event.is_set()
                except asyncio.CancelledError:
                    await gen.aclose()
                    raise
                finally:
                    # Always close the Uplift generator — cancels any open socket request
                    await gen.aclose()

            # 4. Stream LLM tokens → buffer → TTS sentences
            async for token in llm_engine.async_stream_response(user_text):
                if interrupt_event.is_set():
                    break

                full_reply   += token
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
                        logger.error(f"TTS error on sentence: {e}")

            # 5. Flush dangling partial sentence after LLM stream ends
            if token_buffer.strip() and not interrupt_event.is_set():
                try:
                    completed = await _tts_sentence(token_buffer.strip())
                    if completed:
                        spoken_text_buffer.append(token_buffer.strip())
                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    logger.error(f"TTS flush error: {e}")

            # 6. Signal audio stream end + send full agent transcript
            if not interrupt_event.is_set():
                await _send_json({"type": "audio_end"})
                await _send_json({
                    "type":     "transcript",
                    "text":     full_reply,
                    "is_final": True,
                    "speaker":  "agent",
                })

            # Cancel actions task if still running (low-priority)
            actions_task.cancel()

        except asyncio.CancelledError:
            logger.info(f"Pipeline cancelled (barge-in). Spoken: {len(spoken_text_buffer)} sentences")
            actually_spoken = " ".join(spoken_text_buffer)
            if hasattr(llm_engine, "truncate_last_response"):
                llm_engine.truncate_last_response(actually_spoken)
            raise

        except Exception as e:
            logger.error(f"Pipeline error: {e}", exc_info=True)
            await _send_json({
                "type":    "error",
                "message": f"Pipeline error: {str(e)[:100]}",
            })

        finally:
            # Always return to LISTENING — even if cancelled or errored
            await _set_state(AgentState.LISTENING, "Listening...")

    # ── Barge-In Handler ─────────────────────────────────────────────────────

    async def handle_interrupt():
        """
        Signal the active pipeline to stop and cancel its task.

        FIX: We set interrupt_event FIRST (synchronously), then cancel the
        task without awaiting gather(). The pipeline's finally-block will
        call _set_state(LISTENING) itself, so we don't need to wait for it.
        This breaks the deadlock where stt_consumer was blocked inside
        gather() while the pipeline was blocked inside q.get().
        """
        nonlocal active_pipeline_task

        # ① Signal interrupt — _tts_sentence will see this on the next chunk
        interrupt_event.set()

        # ② Cancel the task (non-blocking; sends CancelledError to the next await)
        if active_pipeline_task and not active_pipeline_task.done():
            active_pipeline_task.cancel()
            # Await with a short timeout to let it clean up but don't block long
            try:
                await asyncio.wait_for(
                    asyncio.shield(active_pipeline_task), timeout=0.5
                )
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

        active_pipeline_task = None

        # ③ Tell frontend to flush its audio buffer immediately
        await _send_json({
            "type":    "interrupt",
            "message": "User interrupted — clearing audio buffer",
        })

        # ④ Reset event so next pipeline can run normally
        interrupt_event.clear()
        await _set_state(AgentState.LISTENING, "Listening...")
        logger.info("Barge-in handled — back to LISTENING")

    # ── STT Consumer ─────────────────────────────────────────────────────────

    async def stt_consumer():
        """
        Drives the STT engine and orchestrates the pipeline.

        Barge-in strategy:
          • INTERIM transcripts during SPEAKING → trigger interrupt immediately.
            We use interim (not just final) because the user may have already
            said several words by the time a final fires (500ms endpointing delay).
          • Minimum 3-char threshold to avoid false positives from noise.
          • Final transcripts always launch a new pipeline.
        """
        nonlocal active_pipeline_task

        try:
            if not hasattr(stt_engine, "transcribe_stream_async"):
                await _send_json({
                    "type":    "error",
                    "message": "STT engine does not support async streaming.",
                })
                return

            async for msg in stt_engine.transcribe_stream_async(audio_generator()):
                msg_type = msg.get("type", "")

                # ── VAD: speech started ──────────────────────────────────────
                if msg_type == "speech_started":
                    # Deepgram fires this before any text arrives.
                    # If we are SPEAKING, begin interrupt immediately — don't
                    # wait for a final transcript (that adds 500ms+ latency).
                    if state == AgentState.SPEAKING:
                        logger.info("BARGE-IN triggered on SpeechStarted VAD event")
                        await handle_interrupt()
                    continue

                # ── Utterance end ────────────────────────────────────────────
                if msg_type == "utterance_end":
                    continue  # We drive from transcript events

                # ── Transcript event ─────────────────────────────────────────
                text     = msg.get("text", "").strip()
                is_final = msg.get("is_final", False)

                if not text or len(text) < 3:
                    continue

                # Interim during SPEAKING → barge-in
                if state == AgentState.SPEAKING and not is_final:
                    logger.info(f"BARGE-IN on interim: '{text}'")
                    await handle_interrupt()
                    # Don't launch pipeline yet — wait for the final transcript

                if is_final:
                    # If still SPEAKING (e.g. VAD event wasn't fired), interrupt now
                    if state == AgentState.SPEAKING:
                        logger.info(f"BARGE-IN on final: '{text}'")
                        await handle_interrupt()

                    logger.info(f"Launching pipeline for: '{text}'")
                    active_pipeline_task = asyncio.create_task(run_pipeline(text))

                else:
                    # Partial transcript — show in UI only
                    await _send_json({
                        "type":     "transcript",
                        "text":     text,
                        "is_final": False,
                        "speaker":  "user",
                    })

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"STT consumer error: {e}", exc_info=True)
            try:
                await _send_json({"type": "error", "message": str(e)})
            except Exception:
                pass

    # ── Session Start ─────────────────────────────────────────────────────────

    await _set_state(AgentState.LISTENING, "Listening...")
    stt_task = asyncio.create_task(stt_consumer())

    # ── WebSocket Message Loop ────────────────────────────────────────────────

    try:
        while True:
            data    = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "audio" and "data" in message:
                audio_bytes = base64.b64decode(message["data"])
                await audio_queue.put(audio_bytes)

            elif message.get("type") == "close":
                break

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket loop error: {e}", exc_info=True)
    finally:
        # Drain audio queue so STT generator exits cleanly
        await audio_queue.put(None)

        # Cancel all tasks
        stt_task.cancel()
        if active_pipeline_task and not active_pipeline_task.done():
            active_pipeline_task.cancel()

        await asyncio.gather(stt_task, *(
            [active_pipeline_task] if active_pipeline_task else []
        ), return_exceptions=True)

        try:
            await websocket.close()
        except Exception:
            pass

        logger.info("Session cleaned up")

        # ── Post-session: Analytics + CRM Save ───────────────────────────────
        if llm_engine.history and len(llm_engine.history) > 2:
            logger.info("Triggering call analytics and CRM save...")
            try:
                from app.api.endpoints.analytics import process_call, CallTranscript
                clean_history = [
                    {"role": msg["role"], "text": msg["content"]}
                    for msg in llm_engine.history
                    if msg["role"] in ("user", "assistant") and msg.get("content")
                ]
                if clean_history:
                    asyncio.create_task(
                        process_call(CallTranscript(history=clean_history))
                    )
            except Exception as e:
                logger.error(f"Failed to start analytics task: {e}")
