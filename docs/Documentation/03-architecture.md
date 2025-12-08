# System Architecture

This document presents the system architecture through various diagrams.

## High-Level Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        Console["Console Page"]
        Widgets["UI Widgets"]
        Waveform["Waveform Visualizer"]
    end

    subgraph Backend["Backend (FastAPI)"]
        Gateway["API Gateway"]
        ASR["ASR Service"]
        DM["Dialogue Manager"]
        RAG["RAG Engine"]
        Val["Valuation Service"]
    end

    subgraph Data["Data Layer"]
        Chroma[("ChromaDB")]
        PG[("PostgreSQL")]
        Models["ML Models"]
    end

    subgraph External["External Services"]
        Gemini["Gemini API"]
    end

    Console -->|WebSocket| ASR
    Console -->|HTTP| DM
    Widgets --> Console
    Waveform --> Console

    Gateway --> ASR
    Gateway --> DM
    Gateway --> RAG
    Gateway --> Val

    DM --> RAG
    DM --> Val
    DM --> Gemini

    RAG --> Chroma
    Val --> Models
    ASR --> Models
```

The system consists of three main layers:

- **Frontend (Next.js)**: Console page for agent interaction, UI widgets for displaying prices and listings, and waveform visualizer for audio feedback
- **Backend (FastAPI)**: API gateway routing to core services including ASR, Dialogue Manager, RAG Engine, and Valuation services
- **Data Layer**: ChromaDB for vector storage, PostgreSQL for structured data, and ML models for ASR and price prediction

---

## Data Flow Diagram - Level 0 (Context)

```mermaid
graph LR
    Customer((Customer))
    Agent((Real Estate Agent))
    Supervisor((Supervisor))

    System[Voice Agent System]

    Customer -->|Audio/Text Input| System
    System -->|Voice Response + Property Info| Customer

    Agent -->|Property Listings| System
    System -->|Qualified Leads + Call Summaries| Agent

    System -->|Analytics + KPIs| Supervisor
```

Three external entities interact with the system:

- **Customer**: Sends audio/text input and receives voice responses with property information
- **Real Estate Agent**: Provides property listings and receives qualified leads with call summaries
- **Supervisor**: Receives analytics and KPIs for performance monitoring

---

## Data Flow Diagram - Level 1

```mermaid
flowchart TB
    Customer((Customer))
    Agent((Agent))
    Supervisor((Supervisor))

    subgraph System
        P1["P1.0<br/>Telephony"]
        P2["P2.0<br/>Speech Recognition"]
        P3["P3.0<br/>Dialogue Management"]
        P4["P4.0<br/>Knowledge Retrieval"]
        P5["P5.0<br/>Speech Synthesis"]
        P6["P6.0<br/>Analytics"]

        D1[(D1 Call Logs)]
        D2[(D2 Transcripts)]
        D3[(D3 Property Store)]
    end

    Customer -->|Audio Stream| P1
    P1 -->|PCM Audio| P2
    P2 -->|Transcript| P3
    P3 -->|Query| P4
    D3 -->|Results| P4
    P4 -->|Context| P3
    P3 -->|Response Text| P5
    P5 -->|Audio| P1
    P1 -->|Audio| Customer

    P2 -->|Store| D2
    P1 -->|Log| D1
    Agent -->|Listings| D3

    P3 -->|Session Data| P6
    P6 -->|Reports| Supervisor
```

The Level 1 DFD reveals six major processes:

1. **P1.0 Telephony Processing**: Handles audio stream capture and playback
2. **P2.0 Speech Recognition**: Converts audio to text transcripts using Whisper ASR
3. **P3.0 Dialogue Management**: Processes transcripts, manages context, and generates responses
4. **P4.0 Knowledge Retrieval**: Searches the property vector store for relevant listings
5. **P5.0 Speech Synthesis**: Converts response text to audio (Iteration 3)
6. **P6.0 Analytics Processing**: Generates reports and KPIs for supervisors

---

## DFD Level 2 - Dialogue Management

```mermaid
flowchart TB
    Input["Transcript Input"]
    Output["Response Output"]

    subgraph P3["P3.0 Dialogue Management"]
        P31["P3.1<br/>Intent Classification"]
        P32["P3.2<br/>Context Management"]
        P33["P3.3<br/>Safety Filtering"]
        P34["P3.4<br/>Response Formulation"]
        P35["P3.5<br/>Action Dispatch"]
    end

    RAG["RAG Results"]
    Price["Price Estimate"]
    History[(Conversation History)]

    Input --> P31
    P31 -->|Intent| P32
    History <--> P32
    P32 -->|Context| P34
    RAG --> P34
    Price --> P34
    P34 -->|Raw Response| P33
    P33 -->|Safe Response| P35
    P35 --> Output
```

The dialogue management process comprises five sub-processes:

1. **P3.1 Intent Classification**: Determines user intent (price query, property search, booking)
2. **P3.2 Context Management**: Maintains conversation history and session state
3. **P3.3 Safety Filtering**: Ensures responses are appropriate and accurate
4. **P3.4 Response Formulation**: Constructs prompts and generates LLM responses
5. **P3.5 Action Dispatch**: Routes responses and triggers appropriate UI widgets

---

## Sequence Diagram - Dialogue Turn

```mermaid
sequenceDiagram
    participant C as Customer
    participant F as Frontend
    participant ASR as ASR Service
    participant DM as Dialogue Manager
    participant RAG as RAG Engine
    participant LLM as LLM

    C->>F: Speaks in Urdu
    F->>ASR: PCM Audio (WebSocket)
    ASR->>ASR: VAD + Whisper
    ASR-->>F: Partial Transcripts
    ASR->>DM: Final Transcript
    DM->>DM: Detect Intent
    DM->>RAG: Query Properties
    RAG-->>DM: Top-K Results
    DM->>LLM: Prompt + Context
    LLM-->>DM: Streaming Tokens
    DM-->>F: NDJSON Stream
    F->>F: Render Widgets
    F-->>C: Display Response
```

The sequence of events in a typical dialogue turn:

1. Customer speaks in Urdu
2. Frontend captures PCM audio and sends via WebSocket
3. ASR Service applies VAD and Whisper transcription
4. Partial transcripts are streamed back to frontend
5. Final transcript is sent to Dialogue Manager
6. Dialogue Manager detects intent and queries RAG Engine
7. RAG Engine returns top-K property results
8. Dialogue Manager constructs prompt with context and sends to LLM
9. LLM streams tokens back through the Dialogue Manager
10. Frontend displays tokens progressively and renders action widgets

---

## State Diagram - Dialogue States

```mermaid
stateDiagram-v2
    [*] --> Greeting
    Greeting --> QualifyingLead: user_speaks

    QualifyingLead --> ProvidingInfo: property_search
    QualifyingLead --> GivingQuote: price_query
    QualifyingLead --> Scheduling: booking_intent

    ProvidingInfo --> QualifyingLead: follow_up
    ProvidingInfo --> GivingQuote: price_query
    ProvidingInfo --> Scheduling: booking_intent

    GivingQuote --> ProvidingInfo: property_search
    GivingQuote --> Scheduling: booking_intent
    GivingQuote --> QualifyingLead: follow_up

    Scheduling --> Confirmation: details_provided
    Confirmation --> Closing: confirmed
    Confirmation --> Scheduling: needs_change

    Closing --> [*]
```

Main dialogue states:

- **Greeting**: Initial state when session starts
- **QualifyingLead**: Main conversation state for understanding customer needs
- **ProvidingInfo**: Sharing property details based on search results
- **GivingQuote**: Presenting price estimates
- **Scheduling**: Booking property visits or appointments
- **Confirmation**: Confirming appointment details
- **Closing**: End of conversation
