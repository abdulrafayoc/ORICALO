# ORICALO AI Backend

This is the brain of the ORICALO voice agent. It is built with **FastAPI** and handles:
- Speech-to-Text (STT) via Whisper
- LLM Dialogue Management (Llama/Mistral)
- RAG (Retrieval Augmented Generation)
- Text-to-Speech (TTS)

## Setup

1.  **Create Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: `venv\Scripts\activate`
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run Server**:
    ```bash
    uvicorn app.main:app --reload
    ```

## Directory Structure
- `app/`: FastAPI application code.
- `stt/`: Speech recognition module.
- `llm/`: Language model integration.
- `rag/`: Knowledge base retrieval.
- `tts/`: Voice synthesis.
