# ASR Baseline Report (Iteration 1)

> TEMPLATE – Fill this with your actual experimental results.

## 1. Executive Summary

- Brief description of the ASR system (Whisper-based Urdu STT for real estate).
- Key findings (WER/CER, latency, strengths/weaknesses).

## 2. Model Architecture and Configuration

- Whisper model variants evaluated (tiny/small/base/custom).
- Device/hardware (CPU/GPU specs).
- Important inference parameters (beam size, language hints, etc.).

## 3. Test Dataset Description

- Gold set size (number of utterances).
- Telephony simulation details (8 kHz, μ-law, noise levels).
- Distribution of intents and utterance types.

## 4. Quantitative Results

Summarize metrics across models:

| Model | WER | CER | Avg Inference Time (s) | Notes |
|-------|-----|-----|------------------------|-------|
| tiny  |     |     |                        |       |
| small |     |     |                        |       |
| base  |     |     |                        |       |

## 5. Error Analysis

- Substitution / Insertion / Deletion rates.
- Common error patterns (OOV terms, code-switching).
- Examples of typical mistakes and their impact.

## 6. Discussion

- How close the system is to your target (e.g., WER < 15%).
- Trade-offs between speed and accuracy.
- Limitations due to hardware or data.

## 7. Recommendations for Iteration 2

- Data: lexicon expansion, more dialogs, more diverse accents.
- Modeling: potential fine-tuning of Whisper, lexicon biasing.
- Integration: streaming optimizations, better VAD thresholds.

## 8. Appendix

- Exact commands used to run evaluations.
- Pointers to raw JSON results in `backend/evaluation/results/`.
