import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import torch

print("Testing Whisper STT...")

# Test basic imports
try:
    from stt.stt_hf import Ear_hf
    print("✓ Import successful")
except Exception as e:
    print(f"✗ Import failed: {e}")
    exit(1)

# Test model initialization
try:
    device = "cpu"
    print(f"Using device: {device}")

    ear = Ear_hf(
        device=device,
        model_id="kingabzpro/whisper-tiny-urdu",
    )
    print("✓ Model loaded successfully")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    exit(1)

print("✓ All tests passed! Whisper STT is working.")
