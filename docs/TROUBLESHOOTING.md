# Troubleshooting Guide

This document centralizes common issues and fixes for the ORICALO Iteration 1
ASR/STT system. Many of these are elaborated in `docs/INSTALLATION.md`.

## 1. PyAudio Installation Fails

- **Windows**
  - `pip install pipwin`
  - `pipwin install pyaudio`
- **Linux (Ubuntu/Debian)**
  - `sudo apt-get install portaudio19-dev python3-dev`
  - `pip install pyaudio`
- **macOS**
  - `brew install portaudio`
  - `pip install pyaudio`

## 2. CUDA / GPU Issues

- Check CUDA and driver versions:
  - `nvcc --version`
  - `nvidia-smi`
- Reinstall PyTorch with a matching CUDA build (see official PyTorch instructions).

## 3. Model Download Problems

- Ensure internet connectivity.
- Try a minimal script to force model download:

```python
from transformers import pipeline
pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
```

- Check the Hugging Face cache directory (e.g. `~/.cache/huggingface/hub`).

## 4. Microphone Not Detected

- **Windows**: Check Settings → Privacy → Microphone.
- **macOS**: Check System Settings → Security & Privacy → Microphone.
- **Linux**:
  - `arecord -l` to list devices.
  - `arecord -d 5 test.wav && aplay test.wav` to test.

## 5. Out of Memory (GPU/CPU)

- Use a smaller model (`tiny`) and/or CPU:

```bash
python backend/demos/quick_demo.py --model tiny --device cpu
```

- Close other GPU-intensive applications.

## 6. Poor Transcription Quality

- Reduce background noise, use a better microphone.
- Try the `small` model for improved accuracy.
- Ensure telephony evaluation uses 8 kHz simulated audio.

## 7. WebSocket / Frontend Issues

- Backend must be running (FastAPI via `uvicorn app.main:app --reload` in `backend/`).
- Confirm the frontend console is pointing to the correct WebSocket URL
  (default `ws://localhost:8000/ws/transcribe`).
- Check browser dev tools console for errors.

---

If issues persist, capture logs and environment details (OS, Python version,
GPU/CPU) and include them in your report or GitHub issue.
