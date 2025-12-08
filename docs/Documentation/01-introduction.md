# Introduction

This document presents the Iteration 2 deliverables for the Urdu-Native Voice Agent for Real Estate Marketing in Pakistan. Building upon the ASR foundation established in Iteration 1, this iteration focuses on integrating the LLM-based dialogue management, Retrieval-Augmented Generation (RAG) pipeline, and price prediction capabilities.

## Problem Statement

Pakistan's real estate sector depends heavily on phone conversations conducted primarily in Urdu and Roman Urdu. Existing commercial voice AI solutions are predominantly English-centric and perform poorly with Urdu grammar, dialectal variations, and local conversational norms.

**Current limitations:**
- Poor transcription accuracy for Urdu speech
- Unnatural speech synthesis lacking Urdu prosody
- Lack of domain-specific knowledge grounding for real estate
- Inadequate handling of Roman Urdu inputs

These limitations force real estate businesses to rely on human agents for routine inquiries, leading to higher operational costs and limited scalability.

## Scope

The platform integrates six core modules:

1. **Automatic Speech Recognition (ASR)**: Optimized for Urdu and Roman Urdu
2. **LLM-based Dialogue Management**: Contextual response generation
3. **Retrieval-Augmented Generation (RAG)**: Property data access and grounding
4. **Price Prediction Analytics**: ML-based property valuation
5. **Text-to-Speech (TTS)**: Urdu speech synthesis (Iteration 3)
6. **Call Analytics**: Performance monitoring and compliance

**Out of Scope:** Large-scale telephony integrations, regulatory certifications, multilingual expansion beyond minimal English fallback, payment processing, and commercial deployment without institutional approval.

## Iteration 2 Objectives

1. **LLM/Policy Integration**: Integrate a locally-hosted or API-based LLM for generating contextually appropriate Urdu responses
2. **Prompt Scaffolding**: Design system prompts that enforce the real estate agent persona
3. **Basic Dialogue Flows**: Implement intent classification and state tracking
4. **RAG Pipeline**: Create a vector store indexing property listings for semantic retrieval
5. **Property Dataset Indexing**: Ingest and normalize real estate datasets
6. **Price Predictor Prototype**: Develop a baseline price estimation model

## Work Completed

**LLM/Policy Module:** Dual-backend LLM integration supporting both Google Gemini Flash API for cloud inference and HuggingFace/llama.cpp for local deployment. Includes streaming response generation and domain-specific prompt scaffolding.

**RAG Pipeline:** Complete Retrieval-Augmented Generation pipeline with ChromaDB vector store, multilingual embedding support using paraphrase-multilingual-MiniLM, and data ingestion system.

**Price Prediction:** Valuation API endpoint with location-aware area unit normalization (handling Marla variations across Pakistani housing societies).

**Frontend Console:** Next.js console interface with real-time PCM audio streaming via Web Audio API, dynamic widget rendering, and waveform visualization.

## User Classes

| User Class | Description |
|------------|-------------|
| Real Estate Agent | Uses the system to automate lead qualification and client outreach |
| Property Customer | Interacts with the AI agent via telephony to inquire about properties |
| System Supervisor | Monitors system performance and manages escalations |
| Platform Administrator | Manages deployment, data, and model updates |
