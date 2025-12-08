# ORICALO Documentation

Urdu-Native Voice Agent for Real Estate Marketing in Pakistan

## Overview

ORICALO is an AI-powered voice automation system designed to handle real estate inquiries and lead generation through natural Urdu conversations. The system integrates ASR (Automatic Speech Recognition), LLM-based dialogue management, RAG (Retrieval-Augmented Generation), and price prediction capabilities.

## Documentation Structure

| Document | Description |
|----------|-------------|
| [01-introduction.md](./01-introduction.md) | Problem statement, scope, and objectives |
| [02-system-design.md](./02-system-design.md) | LLM, RAG, and price prediction implementation |
| [03-architecture.md](./03-architecture.md) | System architecture with diagrams |
| [04-data-design.md](./04-data-design.md) | RAG corpus schema and data pipeline |
| [05-frontend.md](./05-frontend.md) | Console UI and audio streaming |
| [06-requirements.md](./06-requirements.md) | Use cases and requirements |
| [07-api-reference.md](./07-api-reference.md) | API endpoints documentation |
| [08-conclusions.md](./08-conclusions.md) | Work summary, challenges, and next steps |

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Backend**: FastAPI, Python 3.10+
- **Frontend**: Next.js 14, TypeScript
- **ASR**: Whisper (fine-tuned for Urdu)
- **LLM**: Gemini Flash / HuggingFace / llama.cpp
- **Vector Store**: ChromaDB
- **Embeddings**: paraphrase-multilingual-MiniLM-L12-v2

## Team

- Abdul Rafay (22I-8762)
- Sumeed Jawad Kanwar (22I-2651)
- Huzaifa Mahmood (22I-2669)

Supervised by: Mr. Ahmed Raza Shahid
