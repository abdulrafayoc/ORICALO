# Slide 1 – Iteration 1 Progress Overview
- **Project:** ORICALO – Urdu ASR/STT for Pakistani real estate domain.@README.md#1-28
- **Team:** Abdul Rafay, Sumeed Jawad, Huzaifa Mahmood.@README.md#7-11
- **Goal for presentation:** Demonstrate Iteration 1 progress toward production-ready Urdu speech recognition.@README.md#17-28

---

## Slide 2 – Evaluation Criteria Alignment
- **Development Planning:** Iteration roadmap spans September–October with defined weekly milestones and deliverables.@README.md#12-28@README.md#207-224
- **Execution Evidence:** Core STT system, streaming pipeline, and supporting documentation completed or in progress as per success criteria.@README.md#207-247
- **Presentation & Demo Readiness:** Baseline demos and reporting scripts prepared to showcase functionality and findings.@README.md#80-99@README.md#175-199

---

## Slide 3 – Proposal Feedback & Iteration Timeline
- **Decision:** Proposal re-defense approved with minor modifications; supervisor requests month-wise iteration tracking (September onward). *(Per committee feedback)*
- **Iteration Phases:** Setup & verification, data collection, evaluation, and presentation prep mapped over Weeks 1–6.@PROJECT_SUMMARY.md#229-277
- **Action:** Highlight iteration milestones during presentation to reflect feedback compliance.

---

## Slide 4 – Modules, Features & Requirements Status
- **Modules:** Core STT engine (`stt/`), demos, evaluation suite, data assets, documentation, and deliverables packaged for Iteration 1.@README.md#65-131
- **Feature Highlights:** Streaming ASR, VAD, telephony simulation, hallucination filtering, and evaluation tooling implemented.@README.md#135-160
- **Requirement Coverage:** Technical, data, and documentation success criteria defined with tracked completion state.@README.md#227-247

---

## Slide 5 – Architecture Representation
- **Pipeline:** Microphone input → PyAudio capture → Silero VAD → Buffering (streaming & non-streaming) → Whisper inference → Text output.@docs/ARCHITECTURE.md#8-205
- **Design Pattern:** `BaseEar` template with HuggingFace Whisper implementation (`Ear_hf`) handling batch and streaming logic.@docs/ARCHITECTURE.md#179-205
- **Performance Considerations:** Latency ~1–2s post-speech, optimized buffering, and CPU/GPU deployment options.@docs/ARCHITECTURE.md#245-395

---

## Slide 6 – Data Representation & Assets
- **Lexicon:** Domain-specific CSV targeting ≥500 terms with Roman Urdu mappings; seed set already curated.@README.md#94-113@deliverables/README.md#23-36
- **Synthetic Dialogs:** JSONL bank aiming for 200+ conversations covering inbound/outbound flows and entity annotations.@README.md#100-107@deliverables/README.md#33-42
- **Gold Set & Compliance:** Audio corpus (20–30 samples) plus consent scripts and ethics checklist for responsible data use.@deliverables/README.md#43-142

---

## Slide 7 – Current Progress & Live Demo Plan
- **Implemented:** Functional ASR baseline with streaming, VAD, telephony support, and hallucination mitigation.@PROJECT_SUMMARY.md#305-373
- **Pending Metrics:** WER/latency measurements scheduled once gold test set completes; baseline report template ready.@PROJECT_SUMMARY.md#280-304
- **Demo Flow:** Quick demo script, evaluation runners, and backup assets prepared for supervisor-facing live walkthrough.@README.md#50-61@deliverables/README.md#166-184
