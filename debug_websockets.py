import sys
try:
    import websockets
    print(f"websockets version: {websockets.__version__}")
    print(f"websockets file: {websockets.__file__}")
    
    import websockets.sync
    print("websockets.sync imported")
    
    from websockets.sync.client import connect
    print("websockets.sync.client.connect imported")
    
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
