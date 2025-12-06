from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import base64
import sys
import os
from queue import Queue, Empty
import threading

# Add backend directory to path to import stt
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt.stt_hf import Ear_hf

router = APIRouter()

@router.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")
    
    # Instantiate STT for this session
    # Ear_hf is now StreamingWhisperTranscriber
    ear = Ear_hf(model_id="kingabzpro/whisper-tiny-urdu", device="cpu")
    
    # Queues for communicating with the STT thread
    audio_queue = Queue()
    transcription_queue = Queue()
    
    # Start STT in a separate thread (it's blocking)
    stt_thread = threading.Thread(
        target=ear.transcribe_stream,
        args=(audio_queue, transcription_queue),
        daemon=True
    )
    stt_thread.start()
    
    async def send_transcriptions():
        """Consumes transcription queue and sends to websocket"""
        try:
            while True:
                # Non-blocking check + sleep to yield to event loop
                try:
                    event = transcription_queue.get_nowait()
                    if event:
                        # Event is already a dict {"type": ..., "content": ...}
                        # We might need to adapt it to frontend expectation
                        # Frontend expectation (from previous stt.py):
                        # {"type": "transcript", "text": "...", "is_final": ...}
                        
                        response = {}
                        if event["type"] == "speech_started":
                            response = {"type": "speech_started"}
                        elif event["type"] == "interim_transcript_received":
                            response = {
                                "type": "transcript", 
                                "text": event["content"],
                                "is_final": False
                            }
                        elif event["type"] == "vad_status":
                            response = {
                                "type": "status",
                                "status": "ready" if event["status"] == "silence" else "connected",
                                "message": "VAD: Speech Detected" if event["status"] == "speech" else "VAD: Listening..."
                            }
                        elif event["type"] == "transcript":
                            response = {
                                "type": "transcript",
                                "text": event["content"],
                                "is_final": True
                            }
                        elif event["type"] == "error":
                            response = {"type": "error", "message": event["content"]}
                            
                        if response:
                            await websocket.send_text(json.dumps(response))
                            
                except Empty:
                    await asyncio.sleep(0.01)
                    continue
                except Exception as e:
                    print(f"Error sending transcription: {e}")
                    break
        except asyncio.CancelledError:
            pass

    # Start sender task
    sender_task = asyncio.create_task(send_transcriptions())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio":
                # Decode base64 audio
                if "data" in message:
                    audio_bytes = base64.b64decode(message["data"])
                    audio_queue.put(audio_bytes)
                
            elif message.get("type") == "reset":
                # Signal reset? 
                # Currently StreamingWhisperTranscriber doesn't handle external reset via queue easily
                # But we can perhaps re-instantiate or just ignore if it auto-resets on silence
                pass
            
            elif message.get("type") == "close":
                break
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error in websocket loop: {e}")
    finally:
        # Cleanup
        audio_queue.put(None) # Signal STT thread to stop
        sender_task.cancel()
        
        # safely close check
        try:
             await websocket.close()
        except RuntimeError:
             # Already closed
             pass
        except Exception:
             pass
             
        # Optional: wait for thread, but don't block too long
        stt_thread.join(timeout=1.0)
