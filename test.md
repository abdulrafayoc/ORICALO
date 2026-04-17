# ORICALO Testing Guide

This document is the testing playbook for the current ORICALO codebase.

It is intentionally detailed. The goal is not just to "run some tests", but to make the system:

- correct
- measurable
- safe to change
- defensible in front of supervisors, pilots, or buyers

The repository is no longer a single-model demo. It is a multi-stage system with:

- a Next.js frontend
- a FastAPI backend
- WebSocket voice orchestration
- STT, RAG, LLM, and TTS modules
- a relational database
- a vector store
- valuation and analytics endpoints

That means testing must happen at multiple layers. A single "pytest passes" result is not enough.

## 1. Testing Objectives

For ORICALO, testing should answer four different questions:

1. Does the app work?
2. Is the app correct?
3. Is the app fast enough?
4. Is the app safe when things fail?

Those map to four testing families:

- functional testing
- quality/accuracy testing
- performance/latency testing
- resilience/failure testing

## 2. What We Are Testing

The system currently has these major runtime areas:

### Backend HTTP APIs

- `GET /`
- `GET /health`
- `GET /agents/`
- `POST /agents/`
- `GET /agents/{id}`
- `PUT /agents/{id}`
- `DELETE /agents/{id}`
- `GET /agency/listings`
- `POST /agency/listings`
- `GET /agency/listings/{id}`
- `PUT /agency/listings/{id}`
- `DELETE /agency/listings/{id}`
- `POST /valuation/predict`
- `GET /valuation/stats`
- `POST /rag/query`
- `GET /rag/stats`
- `POST /dialogue/step`
- `POST /process_call`

### Backend WebSockets

- `/ws/transcribe`
- `/ws/voice_agent`

### Data Layer

- SQLAlchemy DB session
- `agents` table
- `listings` table
- Chroma vector store

### AI Layer

- STT backends
- RAG retrieval
- LLM backends
- TTS backends

### Frontend

- console page
- agents page
- RAG page
- valuation page
- analytics page

## 3. Testing Philosophy For This Repo

Because ORICALO uses external providers and multi-stage AI pipelines, tests must be split into two categories:

### Deterministic tests

These should run on every change and should not depend on live cloud APIs.

Use them for:

- helper functions
- request/response validation
- CRUD behavior
- routing
- mocked orchestration
- DB interactions
- ingestion logic

### Live integration tests

These should be run less frequently because they depend on:

- network access
- API keys
- third-party provider uptime
- provider latency and cost

Use them for:

- real STT provider verification
- real LLM provider verification
- real TTS generation
- end-to-end live voice smoke tests

Rule:

- CI should rely mainly on deterministic tests
- live tests should be smoke tests or scheduled checks

## 4. Recommended Test Pyramid

For this repository, use this test pyramid:

1. Unit tests
2. Integration tests
3. API/contract tests
4. End-to-end UI/backend tests
5. Accuracy benchmark tests
6. Performance and resilience tests

Each layer catches different kinds of bugs.

## 5. Suggested Test Directory Layout

Recommended structure under `tests/`:

```text
tests/
├── unit/
│   ├── test_dialogue_helpers.py
│   ├── test_valuation_helpers.py
│   ├── test_analytics_redaction.py
│   ├── test_vector_store_transform.py
│   └── test_schemas.py
├── integration/
│   ├── test_agents_api.py
│   ├── test_listings_api.py
│   ├── test_rag_ingestion_and_query.py
│   ├── test_valuation_api.py
│   ├── test_dialogue_api.py
│   └── test_analytics_api.py
├── websocket/
│   ├── test_ws_transcribe_mocked.py
│   └── test_ws_voice_agent_mocked.py
├── benchmarks/
│   ├── stt_manifest.json
│   ├── rag_queries.json
│   └── dialogue_cases.json
├── smoke/
│   ├── test_live_stt.py
│   ├── test_live_llm.py
│   └── test_live_tts.py
└── conftest.py
```

## 6. Environment Strategy For Testing

Create separate test settings instead of reusing production-style `.env` directly.

Recommended testing modes:

### Local deterministic mode

- SQLite test DB
- temporary Chroma directory
- mocked STT/LLM/TTS
- no external calls

### Local live mode

- real API keys
- temporary test database
- temporary vector store
- test-only providers or quotas

## 7. Unit Testing Plan

Unit tests should validate isolated logic with zero external dependencies.

### 7.1 `backend/app/api/endpoints/valuation.py`

Test:

- `_to_sqft()` converts DHA/Bahria/Defence marla using `225`
- `_to_sqft()` converts non-DHA marla using `272.25`
- `valuation_predict()` returns fallback output when no model is present
- response always contains:
  - `predicted_price_pkr`
  - `min_price_lakh`
  - `max_price_lakh`
  - `confidence`

Example cases:

- `10 marla`, `DHA Phase 6` -> `2250 sqft`
- `10 marla`, `Johar Town` -> `2722.5 sqft`
- `area_sqft` explicitly supplied -> used as-is

Why this matters:

- valuation logic is simple enough to test thoroughly
- unit conversion errors will silently distort pricing

### 7.2 `backend/app/api/endpoints/analytics.py`

Test `redact_pii()` for:

- `03001234567`
- `0300-1234567`
- `+923001234567`
- `35202-1234567-1`
- `3520212345671`
- text with both phone and CNIC
- text without PII

Expected behavior:

- phone numbers replaced by `[REDACTED_PHONE]`
- CNIC replaced by `[REDACTED_CNIC]`
- non-PII text unchanged

Why this matters:

- privacy bugs are high-risk and easy to miss manually

### 7.3 `backend/app/api/endpoints/dialogue.py`

Test helper functions:

- `_detect_intent()`
- `_extract_location()`
- `_get_price_estimate()` with model unavailable

Example test cases for `_detect_intent()`:

- `"mujhe dha mein ghar chahiye"` -> search intent true
- `"10 marla ki price kya hai"` -> wants price true
- `"lahore mein plot dikhao"` -> search true and location true
- `"hello"` -> no specific property intent

Example test cases for `_extract_location()`:

- `"mujhe dha phase 6 mein ghar chahiye"` -> `Dha Phase 6`
- `"bahria town mein plot"` -> `Bahria Town`
- `"lahore mein kuch dikhao"` -> `Lahore`

Why this matters:

- dialogue quality depends heavily on intent and location detection
- these functions are currently rule-based and can regress easily

### 7.4 `backend/rag/vector_store.py`

Test:

- `_row_to_text()`
- `_row_to_metadata()`

Sample cases:

- full listing row with title, description, price, location, features
- sparse listing row with missing fields
- legacy-style row
- `features` as list
- metadata values with `None`

Expected outcomes:

- generated text is not empty
- metadata contains expected scalar keys
- metadata does not contain invalid `None` values

Why this matters:

- retrieval quality depends directly on document formatting
- broken metadata can cause filter or indexing failures

### 7.5 Schema validation

Test Pydantic schemas for:

- valid listing payload
- missing required `title`
- invalid bedroom types
- valid agent payload
- invalid agent payload

Why this matters:

- bad validation contracts lead to confusing API behavior

## 8. Integration Testing Plan

Integration tests should verify multiple modules working together inside the backend.

### 8.1 Agents API integration

Test sequence:

1. create agent
2. fetch agents list
3. fetch agent by ID
4. update agent
5. delete agent
6. confirm missing after delete

Assertions:

- correct status codes
- persisted values match
- list endpoint returns created item

### 8.2 Listings API integration

Test sequence:

1. create listing
2. list listings
3. fetch listing by ID
4. update listing fields
5. delete listing
6. verify 404 after delete

Add variants:

- listing with optional fields omitted
- listing with features list
- listing with large description

Why this matters:

- these CRUD paths feed both UI and RAG pipeline

### 8.3 Valuation API integration

Test:

- valid request returns 200
- missing required field returns validation failure
- model-missing path still returns well-formed fallback response
- stats endpoint returns metadata or fallback stats object

### 8.4 Analytics API integration

Mock the LLM adapter so the test is deterministic.

Test:

- redacted transcript contains no raw phone/CNIC
- summary and qualification status parsed correctly
- malformed model output does not crash endpoint

### 8.5 Dialogue API integration

Mock:

- retriever
- LLM
- price estimator if needed

Test cases:

- search query -> returns `show_listings` action
- price query -> returns `show_price` action
- generic conversation -> returns reply with no structured actions
- history included -> forwarded to LLM

### 8.6 RAG ingestion + query integration

This is one of the most important tests in the whole repo.

Test sequence:

1. create temporary test DB
2. insert a small set of listings
3. run `ingest_data()`
4. query vector store
5. verify relevant listing returned

Add sample benchmark listings like:

- DHA house
- Johar Town commercial shop
- Bahria plot

Queries:

- `"10 marla house in dha"`
- `"commercial shop in johar town"`
- `"plot in bahria"`

Assertions:

- top results include expected listing IDs or titles

Why this matters:

- this validates the actual core value of RAG

## 9. WebSocket Testing Plan

The app’s most important live experience is WebSocket-based. Test it directly.

### 9.1 `/ws/transcribe`

Test with mocked STT:

1. connect websocket
2. send fake `audio` messages
3. simulate queue outputs from mocked transcriber
4. assert outbound JSON event shapes

Validate events:

- transcript event
- status event
- speech_started event
- error event

### 9.2 `/ws/voice_agent`

This is the main end-to-end orchestrator path.

Use mocked components for deterministic testing:

- mock STT yields one final transcript
- mock RAG returns 2 documents
- mock LLM returns one reply
- mock TTS returns byte payload

Test sequence:

1. connect websocket
2. send audio message
3. assert receiving:
   - initial status
   - user transcript
   - thinking status
   - agent transcript
   - speaking status
   - `audio_out`

Also test:

- malformed payload
- disconnect handling
- close message
- exception from mocked STT
- exception from mocked LLM
- exception from mocked TTS

Why this matters:

- this route is where multiple systems meet
- most demo failures will happen here

## 10. Frontend Testing Plan

The current repo does not yet contain frontend test setup, but it should.

Recommended tools:

- React Testing Library
- Jest or Vitest
- Playwright for end-to-end browser tests

### 10.1 Component/UI logic tests

Test:

- `ListingsTable` fetches and renders rows
- `ListingModal` submits create/update payloads correctly
- `PriceWidget` renders expected values
- `RagWidget` renders listings and metadata
- console page updates transcript on incoming websocket events

### 10.2 Browser E2E tests

Use Playwright with mocked backend or a local test backend.

Test flows:

- open homepage and navigate to console
- open agents page and confirm agents render
- open RAG page and search sample query
- create listing in modal and verify it appears
- open AVM page and submit valuation form

For console page:

- do not depend on real microphone in CI
- inject mocked websocket events instead

Why this matters:

- many bugs in this app are integration/UI state bugs, not backend bugs

## 11. Accuracy Testing Plan

This is separate from functional testing.

The app can "work" and still be low-quality.

### 11.1 STT Accuracy

Use a fixed gold dataset with:

- audio path
- reference transcript
- speaker metadata if available
- noise condition
- accent/dialect tag
- scenario type

Metrics:

- WER
- CER
- avg inference time

Use the existing evaluator in:

- `backend/evaluation/baseline_evaluation.py`

Recommended benchmark groups:

- clean Urdu
- noisy Urdu
- Urdu-English code-switching
- real-estate vocabulary heavy
- phone-call quality audio

Important:

- report aggregate WER
- also report WER by subgroup

Why:

- a single average can hide poor performance on the exact business use case

### 11.2 RAG Retrieval Accuracy

Create a benchmark file such as `tests/benchmarks/rag_queries.json`:

```json
[
  {
    "query": "10 marla house in dha phase 6",
    "expected_ids": ["ag-001", "ag-006"]
  },
  {
    "query": "commercial shop in johar town",
    "expected_ids": ["ag-009"]
  }
]
```

Metrics:

- top-1 hit rate
- top-3 hit rate
- mean reciprocal rank if desired

Why:

- retrieval quality must be measured directly
- otherwise you cannot tell whether poor final answers are from RAG or LLM

### 11.3 Grounded Response Quality

Create benchmark dialogue cases with:

- user transcript
- retrieved context
- expected behavior

Rubric:

- does reply stay in real-estate domain
- does reply use retrieved facts
- does reply avoid unsupported promises
- does reply remain concise and suitable for voice
- does reply ask a clarifying question when information is missing

Evaluate:

- manually at first
- later with rubric-based automated checks

### 11.4 TTS Quality

Measure:

- synthesis success rate
- synthesis time
- subjective intelligibility
- Urdu pronunciation quality

Human review rubric:

- understandable
- natural
- acceptable for customer-facing use
- no clipping or corrupted audio

## 12. Latency Testing Plan

Latency should be measured at every stage, not only end-to-end.

### 12.1 Stage-level timing

Add timing logs for:

- websocket connection established
- first audio chunk received
- speech start detected
- speech end detected
- final transcript produced
- RAG retrieval start/end
- LLM start/end
- TTS start/end
- audio sent back to frontend

Track these per session.

### 12.2 Metrics to report

At minimum:

- time to first interim status
- time to final transcript
- retrieval latency
- LLM latency
- TTS latency
- total time from end-of-speech to first agent response text
- total time from end-of-speech to audio playback-ready payload

### 12.3 Test conditions

Measure under:

- local backend with mocks
- live provider mode
- low-noise audio
- noisy audio
- short utterance
- long utterance
- concurrent sessions

Why:

- voice UX breaks down quickly when turn latency is unstable

## 13. Failure and Resilience Testing Plan

You must test negative paths deliberately.

### 13.1 External provider failures

Simulate:

- invalid Groq API key
- invalid Deepgram API key
- TTS provider timeout
- LLM provider exception
- network unavailable

Verify:

- request does not crash the server
- user gets clear error or fallback
- logs identify failing stage

### 13.2 Data failures

Simulate:

- DB unavailable
- Chroma directory missing
- empty vector collection
- corrupted metadata row
- missing model file for valuation

Verify:

- service responds predictably
- fallback path works where designed

### 13.3 WebSocket failures

Simulate:

- client disconnect mid-stream
- malformed JSON
- invalid base64 payload
- missing `type`
- close event before transcript finalization

Verify:

- session cleanup happens
- queues do not hang
- no zombie tasks remain

## 14. Load and Concurrency Testing Plan

Even before enterprise scale, test moderate concurrency.

### 14.1 What to test

- multiple simultaneous `/rag/query` requests
- multiple simultaneous `/valuation/predict` requests
- multiple simultaneous `/ws/voice_agent` sessions

### 14.2 What to measure

- median latency
- p95 latency
- error rate
- timeouts
- memory growth
- CPU utilization

### 14.3 Suggested scenarios

- 5 concurrent voice sessions
- 10 concurrent voice sessions
- 20 rapid-fire RAG queries
- mixed traffic: voice + CRUD + valuation

This does not need to be perfect now, but you should at least know where the current architecture starts to degrade.

## 15. Manual QA Checklist

Before demos or pilot sessions, run a manual checklist.

### Backend smoke checklist

- backend starts without import errors
- `/health` returns healthy
- agents list loads
- listings CRUD works
- valuation endpoint responds
- RAG query returns results
- voice websocket connects

### Voice flow checklist

- microphone permission works in browser
- transcript appears
- status changes from listening -> thinking -> speaking
- agent reply displayed
- audio playback succeeds

### Data freshness checklist

- create a listing
- verify it appears in CRUD UI
- re-run ingestion
- verify RAG can retrieve it

### Analytics checklist

- phone/CNIC redaction works
- summary returned
- malformed transcript handled safely

## 16. Release Gates

Before considering a release or demo candidate ready, require:

### Minimum gate

- lint passes
- unit tests pass
- integration tests pass
- mocked websocket tests pass
- health endpoint verified

### Stronger gate

- benchmark suite run
- latency within target range
- no stale known-broken routes
- live provider smoke tests pass
- manual voice session check completed

### Pilot gate

- structured logging enabled
- stage timing enabled
- provider failure tested
- data freshness workflow tested
- transcripts and errors observable

## 17. Highest Priority Tests For This Repo Right Now

If engineering time is limited, implement these first.

### Priority 1

- unit tests for `redact_pii`
- unit tests for `_to_sqft`
- unit tests for `_detect_intent` and `_extract_location`
- integration tests for agents CRUD
- integration tests for listings CRUD

### Priority 2

- integration test for RAG ingestion and retrieval
- integration test for valuation fallback path
- integration test for dialogue step with mocked LLM/retriever
- websocket test for `/ws/voice_agent` with mocked STT/LLM/TTS

### Priority 3

- frontend tests for listings table and modal
- benchmark suite for STT WER and retrieval hit rate
- latency instrumentation
- live provider smoke tests

## 18. Suggested Tooling

Recommended additions:

- `pytest`
- `pytest-asyncio`
- `httpx` test client
- `pytest-mock`
- `respx` for mocking HTTP APIs where useful
- `Playwright` for browser E2E
- optional `locust` or `k6` for load testing

The root `requirements.txt` already includes `pytest`, but backend-focused async testing will benefit from `pytest-asyncio` if it is not already installed in your environment.

## 19. How To Measure Progress

Testing maturity should improve in stages:

### Stage 1: Prototype confidence

- core unit tests exist
- CRUD integration tests exist
- mocked websocket tests exist

### Stage 2: Product confidence

- RAG benchmark exists
- STT benchmark exists
- latency logs exist
- provider smoke tests exist

### Stage 3: Pilot confidence

- load tests exist
- failure injection exists
- freshness synchronization tested
- release gates enforced

## 20. Final Guidance

For ORICALO, "accurate testing" does not mean only running pytest.

It means being able to prove:

- the APIs behave correctly
- the voice pipeline behaves consistently
- the retrieval is relevant
- the answers are grounded
- the app is fast enough for conversation
- the system does not collapse when external providers fail

That is the difference between a demo that works once and a product that can be trusted repeatedly.
