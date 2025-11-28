from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import base64
import sys
import os

# Add backend directory to path to import stt
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../"))
from stt.stt_hf import Ear_hf

router = APIRouter()

@router.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connected")
    
    # Instantiate STT for this session (Isolation)
    # TODO: In production, load model globally and pass to session
    ear = Ear_hf(model_id="kingabzpro/whisper-tiny-urdu", device="cpu")
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio":
                # Decode base64 audio
                audio_bytes = base64.b64decode(message["data"])
                
                # Process chunk
                # Run blocking inference in thread pool to not block async loop
                transcription = await asyncio.to_thread(ear.process_iterative, audio_bytes)
                
                if transcription:
                    response = {
                        "type": "transcript",
                        "text": transcription,
                        "is_final": False
                    }
                    await websocket.send_text(json.dumps(response))
                    
            elif message.get("type") == "reset":
                ear.reset_stream()
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

