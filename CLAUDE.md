# ORICALO - Urdu Real Estate Voice AI

## What is this?

ORICALO is an Urdu-language voice AI assistant for Pakistani real estate. It transcribes Urdu speech, retrieves property context via RAG, generates responses with LLMs, and synthesizes Urdu speech output. This is a Final Year Project.

## Tech Stack

- **Backend**: FastAPI (Python 3.10+), Uvicorn, SQLAlchemy (async), SQLite/PostgreSQL, Alembic migrations
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **AI/ML**: Groq Whisper (STT), Silero VAD, Groq Llama 3.1 (LLM), Edge TTS, ChromaDB + Sentence Transformers (RAG)
- **Infra**: Docker Compose, Prometheus metrics

## Running Locally

```bash
# Backend (Terminal 1)
cd backend/
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Terminal 2)
cd frontend/
npm install
npm run dev  # http://localhost:3000
```

Or via Docker: `docker-compose up`

## Project Structure

```
backend/
  app/
    main.py                  # FastAPI entry point
    api/endpoints/           # Route handlers
      stt.py                 # WebSocket /ws/transcribe
      voice_orchestrator.py  # WebSocket /ws/voice_agent (full pipeline)
      dialogue.py            # POST /dialogue/step
      valuation.py           # POST /valuation/predict
      agents.py              # CRUD /agents
    db/                      # SQLAlchemy session & base
    db_tables/               # ORM models (Agent, Listing)
    schemas/                 # Pydantic models
  stt/                       # Speech-to-Text (Groq, Deepgram, HuggingFace)
  llm/                       # LLM chatbots (Groq, Gemini, HuggingFace)
  rag/                       # ChromaDB vector store + retriever
  tts/                       # Text-to-Speech (Edge, ElevenLabs)
  evaluation/                # WER evaluation scripts
  demos/                     # CLI demos (quick_demo.py)
  scripts/                   # DB seeding (seed_db.py, seed_agents.py)
  alembic/                   # DB migrations

frontend/
  app/                       # Next.js App Router pages
    console/page.tsx         # Main voice console UI
    agents/                  # Agent management
    rag/page.tsx             # RAG search & property browser
    avm/page.tsx             # Automated Valuation Model
    analytics/page.tsx       # System analytics
  components/                # Sidebar, WaveformVisualizer, PriceWidget, etc.
  lib/
    api.ts                   # apiFetch() + WS_BASE helpers
    types.ts                 # TypeScript interfaces
```

## Architecture & Patterns

### Voice Pipeline Flow
```
Browser Mic → WebSocket → STT (Groq) → RAG (ChromaDB) → LLM (Llama 3.1) → TTS (Edge) → Audio Response
```

### Key Design Patterns
- **Factory pattern** for all AI backends: `get_chatbot()`, `get_tts()`, STT factory — switched via env vars
- **Event-driven STT**: audio chunks → queue → VAD → Whisper → events (`transcript`, `vad_status`, etc.)
- **Async everywhere**: AsyncSession for DB, `asyncio.to_thread()` wraps blocking AI calls
- **CORS**: configured for localhost:3000 and localhost:8000

### Backend Selection (env vars)
- `STT_BACKEND`: `groq` | `deepgram` | `local`
- `LLM_BACKEND`: `groq` | `gemini` | `huggingface`
- `TTS_BACKEND`: `edge` | `elevenlabs`

## Key Environment Variables

```
GROQ_API_KEY          # STT + LLM (Groq Whisper & Llama)
DEEPGRAM_API_KEY      # Alternative STT
GOOGLE_API_KEY        # Gemini LLM
ELEVENLABS_API_KEY    # Premium TTS
DATABASE_URL          # Default: sqlite+aiosqlite:///./test.db
NEXT_PUBLIC_API_URL   # Frontend → Backend (http://localhost:8000)
NEXT_PUBLIC_WS_URL    # WebSocket base (ws://localhost:8000)
RAG_CHROMA_DIR        # ChromaDB persistence path
RAG_COLLECTION        # Collection name (agency_portfolio)
RAG_EMBEDDING_MODEL   # paraphrase-multilingual-MiniLM-L12-v2
```

## Database

- **ORM**: SQLAlchemy async with `AsyncSession`
- **Tables**: `agents` (AI personas), `listings` (property data)
- **Auto-creates** tables on FastAPI startup
- **Seeding**: `python scripts/seed_db.py`

## WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ws/transcribe` | STT-only: browser audio → transcript text |
| `/ws/voice_agent` | Full pipeline: audio → STT → RAG → LLM → TTS → audio response |

Messages use JSON: `{"type": "audio", "data": "<base64>"}` → `{"type": "transcript", "text": "...", "is_final": true}`

## Frontend Audio Pipeline

Browser `getUserMedia` → Web Audio API → Float32→Int16 PCM → Base64 → WebSocket

## Naming Conventions

- Classes: `CamelCase` (e.g., `GroqChatbot`, `StreamingWhisperTranscriber`)
- Functions/variables: `snake_case`
- Constants: `UPPER_CASE`
- Frontend components: `PascalCase` filenames

## Testing

- Framework: pytest
- Evaluation: `backend/evaluation/baseline_evaluation.py` (WER via jiwer)
- Demo: `python backend/demos/quick_demo.py`
