import sys
import deepgram
from deepgram import DeepgramClient

print(f"Deepgram dir: {dir(deepgram)}")

if hasattr(deepgram, 'speak'):
    print(f"deepgram.speak dir: {dir(deepgram.speak)}")
    
try:
    client = DeepgramClient()
    speak_client = client.speak.v("1")
    print(f"speak client type: {type(speak_client)}")
    print(f"speak client dir: {dir(speak_client)}")
    if hasattr(speak_client, 'save'):
        print(f"save method found: {speak_client.save}")
except Exception as e:
    print(f"Client init error: {e}")
