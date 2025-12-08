# API Reference

This document provides the API reference for the main backend endpoints.

## Dialogue Step Endpoint

**POST** `/dialogue/step`

Processes a dialogue turn with LLM and RAG integration, returning a streaming response.

### Request

```json
{
  "history": [
    {"role": "user", "text": "Lahore mein plot chahiye"},
    {"role": "assistant", "text": "Ji, kitne marla ka plot chahiye?"}
  ],
  "latest_transcript": "10 marla, DHA phase 5",
  "metadata": {
    "asr_latency_ms": 450
  }
}
```

### Response (Streaming NDJSON)

```json
{"type": "token", "content": "DHA"}
{"type": "token", "content": " Phase"}
{"type": "token", "content": " 5"}
{"type": "token", "content": " mein"}
{"type": "action", "data": {"type": "show_listings", "payload": [...]}}
```

---

## RAG Query Endpoint

**POST** `/rag/query`

Performs semantic search over the property vector store.

### Request

```json
{
  "query": "3 bedroom house in Bahria Town Lahore",
  "top_k": 5,
  "filters": {
    "city": "Lahore",
    "min_price": 10000000
  }
}
```

### Response

```json
{
  "query": "3 bedroom house in Bahria Town Lahore",
  "results": [
    {
      "id": "prop_12345",
      "score": 0.89,
      "text": "Beautiful 3 bedroom house in Bahria Town...",
      "metadata": {
        "city": "Lahore",
        "location": "Bahria Town",
        "property_type": "House",
        "bedrooms": 3,
        "price": 15000000,
        "link": "https://zameen.com/..."
      }
    }
  ]
}
```

---

## Valuation Endpoint

**POST** `/valuation/predict`

Provides price range estimation for a property based on features.

### Request

```json
{
  "city": "Lahore",
  "property_type": "House",
  "bedrooms": 3,
  "baths": 2,
  "area_marla": 10,
  "location": "DHA Phase 5"
}
```

### Response

```json
{
  "predicted_price_pkr": 25000000,
  "min_price_lakh": 200,
  "max_price_lakh": 300,
  "currency": "PKR",
  "confidence": 0.75
}
```

---

## WebSocket: Transcription

**WebSocket** `/ws/transcribe`

Real-time audio streaming for ASR transcription.

### Client → Server

```json
{
  "type": "audio",
  "data": "<base64-encoded-pcm>",
  "format": "pcm_s16le",
  "sampleRate": 16000
}
```

### Server → Client

**Status Messages:**

```json
{"type": "status", "status": "loading", "message": "Loading ASR model..."}
{"type": "status", "status": "ready", "message": "ASR ready"}
```

**Transcript Messages:**

```json
{"type": "transcript", "text": "Lahore mein", "is_final": false}
{"type": "transcript", "text": "Lahore mein plot chahiye", "is_final": true}
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: city"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request or missing fields |
| `NOT_FOUND` | 404 | Resource not found |
| `MODEL_ERROR` | 500 | LLM or ASR model failure |
| `RAG_ERROR` | 500 | Vector store query failure |
