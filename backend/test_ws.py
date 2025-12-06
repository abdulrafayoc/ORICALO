import asyncio
import websockets
import sys

async def test_connection():
    uri = "ws://127.0.0.1:8000/ws/transcribe"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            msg = await websocket.recv()
            print(f"Received: {msg}")
            # Wait for status
            while True:
                msg = await websocket.recv()
                print(f"Received: {msg}")
                if "ready" in msg or "error" in msg:
                    break
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(test_connection())
    except ImportError:
        print("websockets library not found. Please install it.")
