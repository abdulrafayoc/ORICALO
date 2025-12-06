import onnxruntime as ort
import os

model_path = os.path.expanduser('~/.cache/oricalo/silero_vad.onnx')
sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])

print("Inputs:")
for i in sess.get_inputs():
    print(f"Name: {i.name}, Shape: {i.shape}, Type: {i.type}")

print("\nOutputs:")
for o in sess.get_outputs():
    print(f"Name: {o.name}, Shape: {o.shape}")
