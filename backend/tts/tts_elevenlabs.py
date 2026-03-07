from typing import Generator
import os
import requests

class ElevenLabsTTS:
    """ElevenLabs TTS engine for ultimate Urdu voice quality."""
    def __init__(self, voice_id: str = "EXAVITQu4vr4xnSDxMaL", api_key: str = None):
        """
        Args:
            voice_id: Bella or equivalent good multilingual voice ID.
            api_key: ElevenLabs API Key. Defaults to env var.
        """
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.voice_id = voice_id
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set.")

    def synthesize(self, text: str) -> bytes:
        """Returns MP3 bytes from text."""
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content

    def synthesize_stream(self, text: str) -> Generator[bytes, None, None]:
        """Yields audio chunks for streaming."""
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/stream"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
        }
        
        with requests.post(url, json=data, headers=headers, stream=True) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=4096):
                if chunk:
                    yield chunk
