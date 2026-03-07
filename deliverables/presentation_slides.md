---
theme: default
class: lead
paginate: true
backgroundColor: #ffffff
---

# ORICALO
## Urdu-Native Voice Agent for Real Estate

**Iteration 2 Defense & Demo**

**Team:**
Abdul Rafay (22I-8762)
Sumeed Jawad (22I-2651)
Huzaifa Mahmood (22I-2669)

---

# 1. Addressing Mid-Eval Feedback

> **Feedback:** "Significant problem with the fyp. Bare implementation of iteration 1. They need to get serious about their work."

**Our Response & Justification:**
We accepted this feedback constructively and have aggressively accelerated development in Iteration 2.

| **Metric** | **Iteration 1 State** (Mid-Eval) | **Current State** (Iteration 2) |
| :--- | :--- | :--- |
| **Pipeline** | ASR Only (Fragmented) | **End-to-End** (ASR $\to$ LLM $\to$ RAG $\to$ TTS Prep) |
| **Intelligence** | None (Transcription only) | **Full Dialogue Management** & Intent Detection |
| **Knowledge** | None | **RAG Pipeline Live** (150k+ Listings Indexed) |
| **UI** | Basic CLI Scripts | **Interactive Next.js Console** with Real-time Widgets |
| **Status** | "Bare Implementation" | **Feature Complete** for It-2 Goals |

---

# 2. Introduction

**Problem:**
- Pakistan's real estate market relies on **voice/phone** calls (~90%).
- Conversations are in **Urdu / Roman Urdu**.
- English AI agents fail at Urdu grammar, accents, and local context (e.g., "5 Marla plot in DHA").

**Solution: ORICALO**
- An **Urdu-First** Voice Agent.
- Automates lead qualification, price estimation, and property search.
- Hybrid architecture: Cloud LLM (Intelligence) + Local RAG (Privacy/Speed).

---

# 3. Scope of Project

**$\checkmark$ In Scope:**
- **Urdu ASR**: Streaming transcription optimized for Pakistani accents.
- **Dialogue Manager**: LLM-based intent understanding (Buy/Sell/Rent).
- **RAG Engine**: Semantic search over real Zameen.com/Graana data.
- **Price Prediction**: Valuation estimates based on location/area.
- **Console UI**: Real-time agent monitoring dashboard.

**$\times$ Out of Scope:**
- Payment processing.
- Full PSTN/Telephony integration (Simulated via VOIP/WebRTC for FYP).
- Legal property transfer automation.

---

# 4. Iterational Breakdown

| Iteration | Focus Area | Status |
| :--- | :--- | :--- |
| **Iteration 1** | **Foundation**: ASR (Whisper), VAD, Audio Streaming | $\checkmark$ Done |
| **Iteration 2** | **Intelligence**: LLM Integration, RAG Pipeline, Price Prediction | **$\checkmark$ ACTIVE (Represented Today)** |
| **Iteration 3** | **Interaction**: Urdu TTS (Speech Synthesis), Turn-taking logic | *Next Steps* |
| **Final** | **Polish**: Latency optimization, Deployment, User Testing | *Planned* |

---

# 5. Work Division (Iteration 2)

| Student | Responsibilities |
| :--- | :--- |
| **Sumeed Jawad** | **LLM Architecture**: Integrated Gemini & HuggingFace backends, Prompt Engineering (System Personas), WebSocket Streaming Logic. |
| **Huzaifa Mahmood** | **RAG & Data**: Data Ingestion (Cleaning 150k+ rows), ChromaDB Vector Store setup, Price Prediction Heuristics. |
| **Abdul Rafay** | **ASR & Evaluation**: Noise robustness (Telephony simulation), Hallucination filtering, Evaluation Framework (WER/CER). |

---

# 6. Iteration 2 Modules Overview

The system now consists of three new intelligent modules:

1.  **LLM / Policy Module** (The Brain)
2.  **RAG Pipeline** (The Knowledge)
3.  **Price Prediction** (The Calculator)

---

# Module A: LLM Integration

**Architecture:**
- **Dual Backend**:
    - `Cloud`: **Gemini 2.0 Flash** (Low latency, high Urdu fluency).
    - `Local`: **HuggingFace / llama.cpp** (Privacy-focused fallback).
- **Streaming**: Token-by-token NDJSON stream for instant feedback (<500ms TTFT).

**Prompt Engineering:**
- Custom **"System Personas"** in Urdu & English.
- Rules: *Strictly polite, never hallucinate prices, ask clarifying questions.*

---

# Module B: RAG Pipeline

**The Challenge:** LLMs don't know current property rates in Lahore/Islamabad.

**The Solution:**
- **Vector Store**: **ChromaDB** storing 150k+ listings.
- **Embeddings**: `paraphrase-multilingual-MiniLM-L12-v2` (Supports Urdu/English mixing).
- **Retrieval**: Semantic search (e.g., "DHA mein sasta ghar" $\to$ queries price < 2 Crore + Location=DHA).

**Data Source:**
- Ingested & normalized datasets from Zameen/Graana (CSV $\to$ JSONL $\to$ Vectors).

---

# Module C: Price Prediction

**Function:** Real-time property valuation during conversation.

**Features:**
- **Unit Normalization**: Solved the **"Marla Problem"**:
    - *DHA/Bahria*: 1 Marla = **225 sq ft**
    - *Revenue/Local*: 1 Marla = **272.25 sq ft**
    - System detects context and normalizes area automatically.
- **Algorithms**:
    1.  **ML Model**: Random Forest (if trained model present).
    2.  **Heuristic Fallback**: Location-based baselines (e.g., "DHA Phase 5 avg price/sqft * Area").

---

# 7. Demo Scenarios

We will now demonstrate the **Live Console**:

**Scenario 1: Property Search**
> *User:* "Mujhe DHA Lahore mein 10 marla ka ghar chahiye."
> *Agent:* Queries RAG $\to$ Returns top 3 listings $\to$ Summary in Urdu.

**Scenario 2: Price Estimation**
> *User:* "Johar Town mein 5 marla plot ki kya price hai?"
> *Agent:* Detects intent $\to$ Calls Valuation API $\to$ Shows Price Widget.

**Scenario 3: Contextual Chat**
> *User:* "Is budget mein koi aur option hai?"
> *Agent:* Remembers previous price constraints $\to$ Suggets alternatives.

---

# Thank You

**Questions?**
