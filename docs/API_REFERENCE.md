# API Reference (Iteration 1)

This document summarizes the most important modules and public APIs in the
Iteration 1 ASR/STT system.

## 1. Python Modules

### 1.1 `backend/stt/base.py`

- `class BaseEar`  
  Abstract base class for all STT implementations.
  - `listen() -> str`: High-level entrypoint to record and transcribe.
  - `interrupt_listen(...) -> str`: Detects mid-utterance interruptions.
  - `transcribe(input_audio: np.ndarray) -> str`: Implement in subclasses.
  - `transcribe_stream(audio_queue, transcription_queue)`: Implement in subclasses.

### 1.2 `backend/stt/stt_hf.py`

- `class Ear_hf(BaseEar)`  
  Whisper-based Urdu ASR implementation using Hugging Face `pipeline`.
  - `__init__(model_id: str = "kingabzpro/whisper-tiny-urdu", device: str = "cpu", ...)`  
    Configure model, device, streaming chunk size, hallucination filtering.
  - `process_iterative(audio_chunk: bytes) -> Optional[str]`  
    Incrementally process audio chunks for streaming use cases.

### 1.3 `backend/stt/vad.py`

- `class VoiceActivityDetection`  
  Thin wrapper around Silero VAD for speech/silence detection.
  - `contains_speech(audio: List[bytes]) -> bool`.

### 1.4 `backend/app/main.py`

- FastAPI application entrypoint.
  - `GET /` – Basic root message.
  - `GET /health` – Health check.

### 1.5 `backend/app/api/endpoints/stt.py`

- `WebSocket /ws/transcribe`  
  Accepts WebSocket connections from the frontend console.
  - Receives base64-encoded audio chunks from the browser.
  - Uses `Ear_hf.process_iterative` to produce transcripts.
  - Sends JSON messages of the form `{ "type": "transcript", "text": "..." }`.

## 2. CLI Demos & Evaluation

### 2.1 `backend/demos/quick_demo.py`

- CLI entrypoint for interactive microphone demos.
- Supports:
  - Single-test mode.
  - Interactive multi-test mode.
  - Device and model selection via CLI flags.

### 2.2 `backend/evaluation/baseline_evaluation.py`

- Command-line tool to compute WER/CER and latency on a test set.
- Accepts either a manifest JSON or an audio directory with `.wav` + `.txt` pairs.

### 2.3 `backend/evaluation/telephony_simulator.py`

- Script to convert clean audio to telephony-style 8 kHz narrowband audio
  with optional noise injection.

---

For deeper architectural details, see `docs/ARCHITECTURE.md`.
