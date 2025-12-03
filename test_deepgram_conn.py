import deepgram
# Hack: Pre-import websockets.sync.client
try:
    import websockets.sync.client
except ImportError:
    pass

try:
    from deepgram import DeepgramClient
except ImportError:
    DeepgramClient = deepgram.DeepgramClient

DEEPGRAM_API_KEY = "31d4efc15f774517a88772b900efddc8d4a5db37"

print("Initializing DeepgramClient...")
try:
    deepgram = DeepgramClient(api_key=DEEPGRAM_API_KEY)
    print("DeepgramClient initialized.")
    print(f"Client type: {type(deepgram)}")
except Exception as e:
    print(f"Failed to init: {e}")
