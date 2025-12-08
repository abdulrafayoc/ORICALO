# Work Summary & Conclusions

## Work Division by Team Member

### Iteration 1

| Team Member | Responsibilities |
|-------------|------------------|
| Abdul Rafay | ASR baseline evaluation, requirements gathering, synthetic dialog generation |
| Sumeed Jawad | LLM groundwork, WebSocket streaming, frontend console |
| Huzaifa Mahmood | Lexicon list, dataset planning, ethics documentation |

### Iteration 2

| Team Member | Responsibilities |
|-------------|------------------|
| Abdul Rafay | Integration assistance, dialogue flow testing, ASR optimization |
| Sumeed Jawad | LLM/policy integration, prompt scaffolding, streaming API |
| Huzaifa Mahmood | RAG pipeline, price-predictor prototype, dataset ingestion |

---

## Challenges Encountered

| Challenge | Solution |
|-----------|----------|
| LLM Response Latency | Implemented token streaming to display partial responses, reducing perceived wait time significantly |
| Multilingual Embedding Quality | Selected paraphrase-multilingual-MiniLM model after benchmarking multiple options for Urdu-English retrieval |
| Real-time Audio Synchronization | Designed chunked audio pipeline with proper buffering to handle network jitter |
| Property Data Inconsistency | Built robust schema unification layer to normalize data from heterogeneous sources |
| Model Memory Constraints | Implemented 4-bit quantization for local LLM inference to fit within available GPU memory |

---

## Iteration 3 Preview

As per the project timeline (Feb–Mar), the next iteration will focus on:

1. **TTS Integration**: Urdu speech synthesis with prosody control
2. **Turn-taking Logic**: Proper conversation flow management
3. **Diarization**: Speaker identification for multi-party calls
4. **End-to-End Demo**: Full voice agent demo in sandbox environment
5. **Internal Role-play Runs**: Testing with team members

---

## Repository Structure

```
ORICALO/
├── backend/
│   ├── app/api/endpoints/    # FastAPI routes
│   │   ├── dialogue.py       # LLM + RAG dialogue endpoint
│   │   ├── stt.py            # WebSocket ASR endpoint
│   │   └── valuation.py      # Price prediction endpoint
│   ├── llm/                  # LLM backends
│   │   ├── llm_gemini.py     # Gemini Flash
│   │   └── llm_hf.py         # HuggingFace / llama.cpp
│   ├── rag/                  # RAG pipeline
│   │   ├── ingestion.py      # Dataset processing
│   │   └── vector_store.py   # ChromaDB interface
│   ├── stt/                  # Speech-to-Text
│   │   ├── stt_hf.py         # Streaming Whisper
│   │   ├── vad.py            # Voice Activity Detection
│   │   └── utils.py          # Audio utilities
│   └── evaluation/           # Evaluation scripts
│       ├── baseline_evaluation.py
│       └── telephony_simulator.py
├── frontend/
│   ├── app/console/          # Console page
│   └── components/           # UI widgets
├── training/
│   └── asr/                  # Whisper fine-tuning
│       ├── train.py
│       └── generate_dataset_deepgram.py
├── data/
│   ├── rag/                  # Source datasets
│   ├── processed/            # Normalized data
│   └── vector/               # ChromaDB persist
├── docs/                     # Documentation
│   ├── README.md
│   ├── 01-introduction.md
│   ├── 02-system-design.md
│   ├── 03-architecture.md
│   ├── 04-data-design.md
│   ├── 05-frontend.md
│   ├── 06-requirements.md
│   ├── 07-api-reference.md
│   └── 08-conclusions.md
└── deliverables/             # Reports
```

---

## Conclusions

This Iteration 2 report has presented the complete implementation of the LLM-based dialogue management, RAG pipeline for property data grounding, and price prediction agent. Building upon the ASR foundation from Iteration 1, the system now provides an end-to-end voice AI pipeline from audio input through intelligent response generation.

**Key accomplishments:**

- Dual LLM backend supporting both Gemini API and local HuggingFace/llama.cpp inference
- Robust RAG pipeline with ChromaDB vector store and multilingual embeddings
- Price prediction API with Marla-to-sqft normalization for Pakistani real estate
- Intent-driven dialogue manager with action dispatch for interactive UI widgets
- Modern Next.js frontend with real-time PCM streaming and dynamic widget rendering

The project is on track to deliver a complete Urdu-native voice agent for real estate marketing, with Iteration 3 focusing on TTS integration and end-to-end demonstration.
