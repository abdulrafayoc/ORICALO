# System Architecture
## Iteration 1: Urdu ASR/STT System

This document describes the technical architecture of the Urdu Speech-to-Text system.

---

## Overview

The system implements a **real-time streaming ASR pipeline** optimized for Urdu language recognition using HuggingFace Whisper models with Voice Activity Detection (VAD).

```
┌─────────────────────────────────────────────────────────────┐
│                    Iteration 1 Architecture                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│ Microphone  │  Audio Input (16kHz mono)
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Audio Capture   │  PyAudio stream (chunked)
│   (utils.py)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Voice Activity  │  Silero VAD
│   Detection      │  - Detect speech start/stop
│    (vad.py)      │  - Filter silence
└──────┬───────────┘
       │
       ├─── Non-streaming ───┐        ├─── Streaming ────┐
       │                     │        │                  │
       ▼                     ▼        ▼                  ▼
┌─────────────┐      ┌──────────────────────────────────┐
│ Record Full │      │   Audio Queue   │ Transcription  │
│   Audio     │      │  (Threading)    │     Queue      │
│  (Buffer)   │      └──────────────────────────────────┘
└──────┬──────┘               │                 ▲
       │                      ▼                 │
       │              ┌──────────────┐          │
       │              │ Chunk Buffer │          │
       │              │ (N chunks)   │          │
       │              └──────┬───────┘          │
       │                     │                  │
       ▼                     ▼                  │
┌───────────────────────────────────────────────┘
│        Whisper Model (HuggingFace)            │
│  - Feature extraction (Mel spectrogram)       │
│  - Encoder-Decoder Transformer                │
│  - Beam search decoding                       │
│  - Hallucination filtering                    │
└──────────────────┬────────────────────────────┘
                   │
                   ▼
              ┌─────────┐
              │  Text   │  Final transcription
              │ Output  │
              └─────────┘
```

---

## Core Components

### 1. Audio Input Layer (`stt/utils.py`)

**Purpose:** Capture audio from microphone in real-time.

**Key Functions:**
- `make_stream()`: Initialize PyAudio stream
- `record_user()`: Record until silence detected (non-streaming)
- `record_user_stream()`: Stream audio chunks to queue (streaming)
- `record_interruption()`: Detect speech interruptions

**Specifications:**
- **Sampling Rate:** 16,000 Hz (telephony: 8,000 Hz)
- **Format:** 16-bit PCM (int16)
- **Channels:** Mono (1 channel)
- **Chunk Size:** 2048 samples (~128ms at 16kHz)

**Data Flow:**
```
Microphone → PyAudio → Byte chunks → Queue/Buffer → NumPy array (float32)
```

---

### 2. Voice Activity Detection (`stt/vad.py`)

**Purpose:** Detect when speech starts and stops to avoid processing silence.

**Model:** Silero VAD (loaded via torch.hub)
- Pre-trained on diverse speech datasets
- Low-latency, CPU-efficient
- High accuracy for speech/silence classification

**Algorithm:**
```python
def contains_speech(audio_chunks):
    # 1. Convert byte chunks to float32 numpy
    audio = normalize(concatenate(audio_chunks))
    
    # 2. Run VAD model
    timestamps = vad_model.get_speech_timestamps(audio)
    
    # 3. Return True if any speech detected
    return len(timestamps) > 0
```

**Parameters:**
- **Window size:** Last 2 seconds of audio
- **Threshold:** Model-internal (optimized for Silero)

---

### 3. Speech Recognition Engine (`stt/stt_hf.py`)

**Purpose:** Convert audio to text using Whisper models.

#### Model Architecture

**Whisper** (Wav2Vec2-style encoder-decoder):

```
Audio (float32) 
    ↓
[Feature Extractor]
    ↓ 
Mel Spectrogram (80 bins)
    ↓
[Encoder] (Transformer blocks)
    ↓
Encoded features
    ↓
[Decoder] (Transformer blocks with cross-attention)
    ↓
Token IDs
    ↓
[Tokenizer]
    ↓
Text output
```

#### Processing Modes

**Non-Streaming (Batch):**
```python
def transcribe(audio: np.ndarray) -> str:
    # Process entire audio at once
    return pipeline(audio, generate_kwargs={...})
```

**Streaming (Real-time):**
```python
def transcribe_stream(audio_queue, transcription_queue):
    while True:
        # Accumulate N chunks
        buffer = []
        for _ in range(chunk_size):
            buffer.append(audio_queue.get())
        
        # Transcribe intermediate result
        partial_text = process_buffer(buffer)
        transcription_queue.put(partial_text)
```

#### Hallucination Filtering

Common Whisper artifacts removed:
- Leading "you" tokens
- Repeated ellipsis
- Empty filler words

---

### 4. Base Class Architecture (`stt/base.py`)

**Purpose:** Abstract interface for all STT implementations.

**Class Hierarchy:**
```
BaseEar (abstract)
    │
    ├── transcribe(audio) → str [abstract]
    ├── transcribe_stream(audio_q, text_q) [abstract]
    │
    ├── listen() → str [public API]
    │   ├── _listen() → non-streaming
    │   └── _listen_stream() → streaming
    │
    └── interrupt_listen() → str
        └── Detect user interruptions

Ear_hf (HuggingFace Whisper)
    └── Implements abstract methods
```

**Design Pattern:** Template Method
- Base class defines workflow
- Subclasses implement model-specific logic

---

## Data Flow

### Non-Streaming Path

```
1. User speaks
     ↓
2. VAD detects speech start
     ↓
3. Audio buffered until silence detected
     ↓
4. Full audio sent to Whisper
     ↓
5. Single transcription returned
```

**Latency:** Higher (~2-5s after speech ends)  
**Accuracy:** Better (full context available)

### Streaming Path

```
1. User speaks
     ↓
2. VAD detects speech start
     ↓
3. Audio chunks streamed to queue
     ↓
4. Every N chunks → partial transcription
     ↓
5. Final transcription after silence
```

**Latency:** Lower (~0.5-1s intermediate updates)  
**Accuracy:** Good (but partial results may change)

---

## Threading Model

### Streaming Implementation

```python
# Main thread: transcription
# Thread 1: audio capture
# Thread 2: display (optional)

audio_queue = Queue()
transcription_queue = Queue()

# Start threads
audio_thread = Thread(target=record_user_stream, args=(vad, audio_queue))
transcribe_thread = Thread(target=transcribe_stream, args=(audio_queue, transcription_queue))

audio_thread.start()
transcribe_thread.start()

# Consume transcriptions
while True:
    text = transcription_queue.get()
    if text is None: break
    print(text)
```

**Synchronization:**
- Queues are thread-safe (Python `queue.Queue`)
- `None` sentinel signals end-of-stream
- Join threads before exit

---

## Model Optimization

### Inference Optimization

**CPU Optimization:**
- Use `torch.no_grad()` to disable gradients
- Quantization (int8) for smaller models
- Batch size = 1 (real-time constraint)

**GPU Acceleration:**
- Move tensors to CUDA device
- Use FP16 (half precision) on supported GPUs
- Optimize with `torch.compile()` (PyTorch 2.0+)

### Memory Management

**Model Loading:**
```python
# Load once, reuse for all transcriptions
pipe = pipeline("automatic-speech-recognition", model=model_id, device=device)

# Cache components
feature_extractor = pipe.feature_extractor
tokenizer = pipe.tokenizer
model = pipe.model
```

**Audio Buffering:**
- Circular buffer for VAD (avoid unbounded growth)
- Clear buffer after transcription

---

## Telephony Simulation

For evaluating on 8kHz narrowband audio:

```
Original Audio (16kHz)
    ↓
[Downsample] → 8kHz
    ↓
[Bandpass Filter] → 300-3400 Hz
    ↓
[μ-law Codec] → Encode + Decode
    ↓
[Noise Injection] → Add background noise (optional)
    ↓
Telephony-Simulated Audio
```

**Use Case:** Test ASR robustness for phone call scenarios.

---

## Error Handling

### Graceful Degradation

```python
try:
    transcription = ear.listen()
except AudioDeviceError:
    # Microphone not available
    log_error("No audio input device")
    fallback_to_text_input()
    
except ModelLoadError:
    # Model download failed
    log_error("Model not available")
    use_cached_model_or_smaller_model()
    
except OutOfMemoryError:
    # GPU OOM
    log_error("Out of memory")
    switch_to_cpu_or_smaller_model()
```

### Retry Logic

- Audio errors: Retry 3 times
- Model inference: Retry 1 time
- Network errors (model download): Exponential backoff

---

## Performance Metrics

### Latency Breakdown (tiny model, CPU)

| Stage | Time | Notes |
|-------|------|-------|
| Audio capture | Real-time | 0ms overhead |
| VAD detection | ~10ms | Per chunk |
| Feature extraction | ~100ms | Mel spectrogram |
| Model inference | ~500-1000ms | Encoder + Decoder |
| Post-processing | ~5ms | Hallucination filtering |
| **Total** | **~1-2s** | After speech ends |

### Memory Footprint

| Component | Size |
|-----------|------|
| Whisper tiny | 39 MB |
| Whisper small | 244 MB |
| VAD model | 5 MB |
| Audio buffer | ~1 MB (10s @ 16kHz) |

---

## Future Extensions (Iteration 2+)

1. **LLM Integration:** Intent understanding
2. **Dialog Management:** Multi-turn conversations
3. **TTS Output:** Voice responses
4. **RAG:** Real estate knowledge base
5. **Lexicon Biasing:** Boost domain-specific terms

---

## Iteration 2 Backend Surface (Design Preview)

To prepare for Iteration 2, the backend will expose a small set of HTTP
endpoints that sit on top of the existing ASR component:

- `POST /dialogue/step`
  - **Input:** recent dialogue turns, latest ASR transcript, optional metadata.
  - **Output:** agent reply text + structured actions (e.g., `{"type": "book_visit"}`).
- `POST /rag/query`
  - **Input:** query text, optional filters (location, budget, etc.).
  - **Output:** retrieved property snippets with IDs and scores.
- `POST /price/predict`
  - **Input:** property features (location, size, bedrooms, etc.).
  - **Output:** price range and confidence score.

The existing `/ws/transcribe` WebSocket will continue to handle low-latency
audio streaming from the frontend console. Once a final transcript is produced,
the Next.js console can call `/dialogue/step` via `fetch()` and display the
agent's text response alongside the live transcript.

---

## References

- [Whisper Paper](https://arxiv.org/abs/2212.04356)
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers)
