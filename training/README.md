# Training Scripts Overview

This directory is reserved for training and fine-tuning scripts used in later
iterations of the ORICALO project.

Subdirectories:

- `asr/` – Whisper fine-tuning, data preparation, and experiments.
- `llm/` – Dialogue policy / LLM experiments (e.g., LoRA, prompt evaluation).
- `tts/` – TTS model training or adaptation.

> NOTE: Do not commit large datasets or model checkpoints directly. Use DVC or
> other artifact management for heavy assets.
