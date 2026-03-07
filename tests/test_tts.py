import pytest
from tts import get_tts
from tts.tts_edge import EdgeTTS
from tts.tts_elevenlabs import ElevenLabsTTS

def test_edge_tts_buffer():
    # Instantiate explicitly for the test
    tts = EdgeTTS()
    urdu_text = "Yeh ek test hai."
    audio_bytes = tts.synthesize(urdu_text)
    
    assert isinstance(audio_bytes, bytes), "TTS output must be bytes"
    assert len(audio_bytes) > 0, "TTS audio buffer should not be empty"
    print(f"Edge TTS returned {len(audio_bytes)} bytes.")

# Skipping the API test by default unless the developer sets the KEY in their env,
# to prevent CI/CD failures on unconfigured machines.
@pytest.mark.skipif("not __import__('os').getenv('ELEVENLABS_API_KEY')")
def test_elevenlabs_tts_buffer():
    tts = ElevenLabsTTS()
    urdu_text = "Yeh ek test hai."
    audio_bytes = tts.synthesize(urdu_text)
    
    assert isinstance(audio_bytes, bytes), "TTS output must be bytes"
    assert len(audio_bytes) > 0, "TTS audio buffer should not be empty"
    print(f"ElevenLabs TTS returned {len(audio_bytes)} bytes.")
