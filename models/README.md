# Models Directory

This directory is intended to store local model artifacts for ORICALO, such as:

- Fine-tuned Whisper checkpoints (ASR).
- LLM weights or adapters (e.g., LoRA).
- TTS models or vocoder checkpoints.

> IMPORTANT: Do **not** commit large binary model files to Git.
> Use DVC or another artifact management system to track versions, and
> configure `.gitignore` to exclude heavy files.
