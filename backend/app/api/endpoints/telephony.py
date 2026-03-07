from fastapi import APIRouter, Request, Response
from twilio.twiml.voice_response import VoiceResponse

router = APIRouter()

@router.post("/twillo/voice")
async def twilio_voice(request: Request):
    """
    Webhook for Twilio Voice to route incoming phone calls
    to our existing websocket using Twilio Media Streams.
    """
    # Assuming ngrok is running on port 8000 and the URL is provided 
    # via an ENV variable or hardcoded for the Sandbox
    # e.g., wss://your-ngrok-url.app/ws/voice_agent
    
    domain = request.headers.get("host", "your-ngrok-url.app")
    ws_url = f"wss://{domain}/ws/voice_agent"

    response = VoiceResponse()
    
    # Greet the user in Urdu
    response.say(
        "Welcome to ORICALO. As-salamu alaykum. Please speak after the beep.", 
        voice="Polly.Aditi" # Fallback voice until ElevenLabs takes over the websocket
    )
    
    # Start bidirectional Media Stream to our WebSocket
    start = response.start()
    start.stream(
        url=ws_url,
        track="both_tracks"
    )
    
    # Keep the call alive
    response.pause(length=120)

    return Response(content=str(response), media_type="application/xml")
