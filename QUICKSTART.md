# 🚀 Quick Start Guide
## Iteration 1: Urdu ASR/STT System

Get started with the Urdu Speech-to-Text system in 5 minutes!

---

## ⚡ 30-Second Setup

```bash
# 1. Clone and navigate to ORICALO root
git clone https://github.com/abdulrafayoc/oricalo.git
cd oricalo

# 2. Create virtual environment
python -m venv venv

# 3. Activate (Windows)
venv\Scripts\activate
# OR Activate (Linux/macOS)
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run demo!
python backend/demos/quick_demo.py
```

---

## 🎤 Your First Transcription

```python
from stt.stt_hf import Ear_hf

# Initialize
ear = Ear_hf(
    model_id="openai/whisper-tiny",
    device="cpu"
)

# Speak and transcribe
print("Speak now...")
text = ear.listen()
print(f"You said: {text}")
```

**Output:**
```
Listening...
* recording
*listening to speech*
* done recording
You said: lahore mein das marla plot ki qeemat kya hai
```

---

## 📋 Common Commands

### Run Demos

```bash
# Basic demo
python backend/demos/quick_demo.py

# Interactive mode
python backend/demos/quick_demo.py --interactive

# Use GPU
python backend/demos/quick_demo.py --device cuda

# Better accuracy
python backend/demos/quick_demo.py --model small
```

### Record Test Data

```bash
# Record 10 samples
python scripts/record_gold_set.py --count 10 --output data/test_audio/gold_set/
```

### Run Evaluation

```bash
# Evaluate on test set
python backend/evaluation/baseline_evaluation.py \
    --model tiny \
    --audio-dir data/test_audio/gold_set/ \
    --output backend/evaluation/results/baseline_tiny.json
```

### Simulate Telephony

```bash
# Convert to 8kHz narrowband
python backend/evaluation/telephony_simulator.py \
    --input audio.wav \
    --output audio_8k.wav \
    --add-noise 20
```

---

## 📚 Next Steps

1. **Read full README:** `README.md`
2. **Installation details:** `docs/INSTALLATION.md`
3. **System architecture:** `docs/ARCHITECTURE.md`
4. **Record test data:** See `data/test_audio/README.md`
5. **Review deliverables:** `deliverables/README.md`
