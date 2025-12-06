import onnxruntime as ort
import numpy as np
import os

model_path = os.path.expanduser('~/.cache/oricalo/silero_vad.onnx')
sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

def try_loop(chunk_size):
    print(f"\nTrying loop with chunk_size={chunk_size}")
    x = np.zeros((1, chunk_size), dtype=np.float32)
    state = np.zeros((2, 1, 128), dtype=np.float32)
    sr = np.array(16000, dtype=np.int64)
    
    try:
        for i in range(5):
            inputs = {'input': x, 'state': state, 'sr': sr}
            out, state = sess.run(None, inputs)
            print(f"Iter {i}: success, state shape={state.shape}")
    except Exception as e:
        print(f"FAILED at chunk_size {chunk_size}: {e}")

try_loop(512)
try_loop(2048) # Default in utils.py
try_loop(4096)
