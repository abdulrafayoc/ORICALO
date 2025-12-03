# Iteration 1: Urdu ASR/STT System for Real Estate Voice AI

## 📋 Project Overview

This is the **first iteration** of our Final Year Project - a production-ready Automatic Speech Recognition (ASR) / Speech-to-Text (STT) system optimized for **Urdu language** in the Pakistani real estate domain.

### Team Members
- **Abdul Rafay** - ASR baseline evaluation & model optimization
- **Sumeed Jawad** - Requirements, synthetic dialogs & annotation
- **Huzaifa Mahmood** - Lexicon development, dataset planning & ethics

### Project Timeline
**September - October 2025** (4-6 weeks)

---

## 🎯 Iteration 1 Goals

This iteration focuses on building the **"ears"** of our voice AI system:

1. ✅ **ASR Baseline Evaluation** - Measure WER on telephony-simulated audio (8 kHz)
2. ✅ **Real-time Streaming** - Live transcription with VAD and silence detection
3. ✅ **Urdu Language Support** - Pre-trained Whisper models fine-tuned for Urdu
4. 📊 **Domain Lexicon** - 500+ real estate terms (locations, property types, developers)
5. 💬 **Synthetic Dialog Bank** - 200+ role-play conversations for testing
6. 📝 **Ethics & Consent** - IRB approval and consent scripts
7. 📈 **Baseline Report** - WER, confidence scores, error analysis

---

## 🚀 Quick Start

### Installation

```bash
# Clone repository and navigate to ORICALO root
git clone https://github.com/abdulrafayoc/oricalo.git
cd oricalo

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# For CUDA GPU support (optional, faster inference)
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### Run Your First Test

```bash
# Basic demo (CPU, tiny model) from repo root
python backend/demos/quick_demo.py

# GPU-accelerated with better accuracy
python backend/demos/quick_demo.py --device cuda --model small

# Interactive mode (multiple recordings)
python backend/demos/quick_demo.py --interactive
```

---

## 📁 Project Structure

```
oricalo/
├── README.md                          # This file
├── QUICKSTART.md                      # 5-minute setup guide
├── PROJECT_SUMMARY.md                 # Iteration 1 summary
├── requirements.txt                   # Core ASR/STT dependencies
├── backend/                           # 🧠 Python AI Server
│   ├── app/                           # FastAPI Application (entry: app/main.py)
│   ├── stt/                           # 🎙️ Speech-to-Text Module
│   ├── llm/                           # 🤖 LLM & Policy (future iterations)
│   ├── rag/                           # 📚 RAG System (future iterations)
│   ├── tts/                           # 🗣️ Text-to-Speech (future iterations)
│   ├── demos/                         # CLI demos
│   └── evaluation/                    # Evaluation Scripts & results/
│
├── frontend/                          # 💻 Next.js Application
│   ├── app/                           # App Router (includes /console UI)
│   └── package.json                   # Frontend dependencies
│
├── data/                              # 📂 Datasets & Artifacts
│   ├── lexicon/                       # Domain lexicon
│   ├── synthetic_dialogs/             # Seed + full dialog bank
│   ├── test_audio/                    # Gold set + telephony_8k (local only)
│   └── consent/                       # Consent scripts & ethics checklist
│
├── docs/                              # 📚 Documentation
├── training/                          # 🏋️ Model Training Scripts (asr/llm/tts)
└── models/                            # Local model artifacts (ignored by Git)
```

---

## 🎓 Key Features

### 1. **Real-Time Streaming ASR**
- Live transcription as you speak
- Voice Activity Detection (VAD) for automatic start/stop
- Chunked processing for low-latency feedback
- Optimized for both CPU and GPU

### 2. **Urdu Language Optimization**
- Pre-trained Whisper models (tiny, small, base)
- Support for code-switching (Urdu + English)
- Domain-specific lexicon biasing

### 3. **Telephony Simulation**
- 8 kHz narrowband audio processing
- Codec simulation (μ-law, A-law)
- Realistic call quality degradation
- Background noise injection

### 4. **Comprehensive Evaluation**
- Word Error Rate (WER) calculation
- Per-token confidence scores
- Error categorization (substitution, insertion, deletion)
- OOV (Out-of-Vocabulary) analysis

---

## 📊 Available Models

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| `tiny` | 39MB | Fast | Good | Demos, CPU inference, rapid prototyping |
| `small` | 244MB | Medium | Better | Production CPU, balanced accuracy |
| `base` | 142MB | Medium | Good | Multilingual fallback |

**Recommended for Iteration 1**: Start with `tiny` for development, use `small` for evaluation.

---

## 🧪 Running Evaluations

### 1. Record Gold Standard Test Set

```bash
# Record 20-30 utterances with consent
python scripts/record_gold_set.py --count 30 --output data/test_audio/gold_set/
```

### 2. Run Baseline Evaluation

```bash
# Evaluate on 8kHz telephony-simulated audio
python backend/evaluation/baseline_evaluation.py \
    --model tiny \
    --audio-dir data/test_audio/gold_set/ \
    --output backend/evaluation/results/baseline_tiny.json
```

### 3. Generate Evaluation Report

```bash
# Create detailed report with WER, confidence, errors
python evaluation/error_analysis.py \
    --results evaluation/results/baseline_tiny.json \
    --output deliverables/asr_baseline_report.pdf
```

---

## 📝 Deliverables Checklist

### Week 1-2
- [x] Core STT system functional
- [ ] 200+ lexicon terms collected
- [ ] 50+ synthetic dialogs created
- [ ] Gold test set recording started

### Week 3-4
- [ ] Full lexicon (500+ terms)
- [ ] 200+ synthetic dialogs completed
- [ ] Baseline evaluation complete
- [ ] WER measured and documented

### Week 5-6
- [ ] Ethics consent finalized
- [ ] ASR baseline report written
- [ ] Presentation prepared
- [ ] Demo ready for supervisor

---

## 🎯 Success Criteria

✅ **Technical**
- Baseline ASR running and reproducible
- WER measured on gold test set
- Error breakdown documented
- System deployable on CPU

✅ **Data**
- ≥500 domain terms in lexicon
- ≥200 synthetic dialogs with annotations
- 20-30 gold utterances recorded

✅ **Documentation**
- ASR baseline report (PDF)
- Reproducible evaluation scripts
- Clear next-step recommendations
- Ethics approval obtained

---

## 👥 Module Ownership (Iteration 1)

| Module / Folder                     | Lead Person       | Focus                                      |
|-------------------------------------|-------------------|--------------------------------------------|
| `backend/stt/`, `backend/demos/`    | Abdul Rafay       | ASR baseline, streaming, evaluation       |
| `data/synthetic_dialogs/`           | Sumeed Jawad      | Synthetic dialogs, annotation, requirements |
| `data/lexicon/`, `data/consent/`    | Huzaifa Mahmood   | Lexicon, ethics, dataset planning          |
| `frontend/app/console`              | Shared            | Live console for ASR demo                  |

## 🔧 API Usage Example

```python
from stt.stt_hf import Ear_hf

# Initialize Urdu STT
ear = Ear_hf(
    model_id="kingabzpro/whisper-tiny-urdu",
    device="cpu",
    silence_seconds=2.0
)

# Record and transcribe
print("Speak now...")
text = ear.listen()
print(f"You said: {text}")
```

---

## 📖 Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- **[API Reference](docs/API_REFERENCE.md)** - Key modules and public APIs
- **[Installation Guide](docs/INSTALLATION.md)** - Step-by-step setup
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues

---

## 🐛 Troubleshooting

### PyAudio Installation Issues
```bash
# Windows
pip install pipwin
pipwin install pyaudio

# Linux
sudo apt-get install portaudio19-dev
pip install pyaudio
```

### CUDA Out of Memory
```bash
# Use CPU or smaller model
python backend/demos/quick_demo.py --device cpu --model tiny
```

### Poor Transcription Quality
- Reduce background noise
- Use `small` model for better accuracy
- Speak clearly at moderate pace
- Ensure 8kHz simulation for telephony testing

---

## 📚 References

### Models
- **Whisper**: OpenAI's multilingual ASR
- **Urdu Models**: [kingabzpro/whisper-tiny-urdu](https://huggingface.co/kingabzpro)
- **VAD**: Silero Voice Activity Detection

### Frameworks
- HuggingFace Transformers
- PyTorch
- PyAudio

---

## 📞 Contact & Support

- **Supervisor**: [Name]
- **Team Discord**: [Link]
- **GitHub Issues**: [Link]

---

## 📄 License

See LICENSE file in parent repository.

---

## 🎉 Next Steps (Iteration 2)

After completing Iteration 1:
1. LLM integration for intent understanding
2. TTS (Text-to-Speech) for voice responses
3. Dialog management and policy learning
4. RAG for real estate knowledge base
5. Production deployment

**Focus for now**: Get a rock-solid ASR baseline! 🎯
