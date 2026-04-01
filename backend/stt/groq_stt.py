"""
Groq Whisper Large v3 Turbo STT Backend.

Uses Groq's ultra-fast inference API with OpenAI Whisper Large v3 Turbo
for near-real-time speech-to-text. Combines local VAD (Silero) for
speech boundary detection with Groq API for transcription.

Pipeline:
  Browser Audio (PCM 16kHz) → VAD (local) → Groq Whisper API → Text
"""

import os
import io
import struct
import time
import asyncio
import numpy as np
from typing import AsyncGenerator, Dict, Any, Optional

from groq import Groq

try:
    from .vad import OptimizedVAD
except ImportError:
    from vad import OptimizedVAD


class GroqWhisperSTT:
    """High-speed STT using Groq's Whisper Large v3 Turbo API with local VAD."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "whisper-large-v3-turbo",
        language: str = "ur",
        endpointing_ms: int = 800,
        vad_threshold: float = 0.5,
    ):
        """
        Args:
            api_key: Groq API key. Falls back to GROQ_API_KEY env var.
            model: Whisper model to use on Groq.
            language: ISO-639-1 language code. "ur" for Urdu.
            endpointing_ms: Silence duration (ms) after speech to trigger transcription.
            vad_threshold: VAD speech detection threshold (0-1).
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY environment variable not set.")

        self.client = Groq(api_key=self.api_key)
        self.model = model
        self.language = language
        self.endpointing_ms = endpointing_ms

        # Local VAD for speech boundary detection
        self.vad = OptimizedVAD(threshold=vad_threshold)

    def _pcm_to_wav(self, pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1, sample_width: int = 2) -> bytes:
        """Convert raw PCM S16LE bytes to a WAV file in memory."""
        data_size = len(pcm_bytes)
        wav_buf = io.BytesIO()

        # WAV header (44 bytes)
        wav_buf.write(b"RIFF")
        wav_buf.write(struct.pack("<I", 36 + data_size))  # File size - 8
        wav_buf.write(b"WAVE")
        wav_buf.write(b"fmt ")
        wav_buf.write(struct.pack("<I", 16))  # Subchunk1 size
        wav_buf.write(struct.pack("<H", 1))   # PCM format
        wav_buf.write(struct.pack("<H", channels))
        wav_buf.write(struct.pack("<I", sample_rate))
        wav_buf.write(struct.pack("<I", sample_rate * channels * sample_width))  # Byte rate
        wav_buf.write(struct.pack("<H", channels * sample_width))  # Block align
        wav_buf.write(struct.pack("<H", sample_width * 8))  # Bits per sample
        wav_buf.write(b"data")
        wav_buf.write(struct.pack("<I", data_size))
        wav_buf.write(pcm_bytes)

        return wav_buf.getvalue()

    def _transcribe_audio(self, audio_bytes: bytes) -> str:
        """Send WAV audio to Groq Whisper API and return transcription."""
        try:
            transcription = self.client.audio.transcriptions.create(
                file=("audio.wav", audio_bytes),
                model=self.model,
                language=self.language,
                response_format="text",
                prompt="Real estate conversation in Urdu. Property, plot, house, ghar, makan, DHA, Bahria.",
            )
            # response_format="text" returns a plain string
            return str(transcription).strip()
        except Exception as e:
            print(f"[GroqSTT] Transcription error: {e}")
            return ""

    async def transcribe_stream_async(
        self, audio_generator: AsyncGenerator[bytes, None]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Consumes an async generator of PCM audio chunks, uses VAD to detect
        speech boundaries, then sends complete utterances to Groq Whisper API.
        """
        audio_buffer: list[bytes] = []
        speech_started = False
        last_speech_time: Optional[float] = None
        silence_chunks_after_speech = 0
        chunk_count = 0

        with open("vad_log.txt", "a") as f:
            f.write(f"\n[GroqSTT] Starting audio stream loop for {self.model}\n")

        async for chunk in audio_generator:
            chunk_count += 1
            if chunk_count % 50 == 0:
                with open("vad_log.txt", "a") as f:
                    f.write(f"[GroqSTT] Processed {chunk_count} audio chunks. Last chunk length: {len(chunk)}\n")

            # Convert PCM bytes to float32 for VAD
            if isinstance(chunk, bytes):
                audio_int16 = np.frombuffer(chunk, dtype=np.int16)
                audio_float = audio_int16.astype(np.float32) / 32768.0
            else:
                audio_float = chunk

            # Lower threshold for testing to ensure it catches quiet speakers
            prob = self.vad(audio_float)
            is_speech = prob > 0.3  # using explicit 0.3 threshold instead of self.vad.threshold for robustness
            current_time = time.time()

            if chunk_count % 50 == 0:
                with open("vad_log.txt", "a") as f:
                    f.write(f"[GroqSTT] Chunk VAD probability: {prob:.3f} | Speech? {is_speech}\n")

            if is_speech:
                silence_chunks_after_speech = 0

                if not speech_started:
                    speech_started = True
                    audio_buffer = []
                    with open("vad_log.txt", "a") as f:
                        f.write(f"[GroqSTT] Speech started (prob: {prob:.3f})\n")

                audio_buffer.append(chunk)
                last_speech_time = current_time

                # Emit interim "listening" feedback every ~1 second of speech
                buffer_duration_s = len(audio_buffer) * len(chunk) / (2 * 16000)
                if len(audio_buffer) % 30 == 0 and buffer_duration_s > 0.5:
                    with open("vad_log.txt", "a") as f:
                        f.write(f"Yielding listening interim...\n")
                    yield {
                        "text": "🎙️ Listening...",
                        "is_final": False,
                    }

            else:
                # Silence
                if speech_started and last_speech_time:
                    silence_duration_ms = (current_time - last_speech_time) * 1000

                    # Keep appending a few silence chunks for trailing audio
                    if silence_chunks_after_speech < 10:
                        audio_buffer.append(chunk)
                        silence_chunks_after_speech += 1

                    if silence_duration_ms > self.endpointing_ms:
                        # --- Endpoint reached: transcribe the utterance ---
                        with open("vad_log.txt", "a") as f:
                            f.write(f"Endpointing after {silence_duration_ms:.0f}ms silence, buffer: {len(audio_buffer)} chunks\n")

                        if audio_buffer:
                            # Combine PCM chunks and convert to WAV
                            pcm_data = b"".join(audio_buffer)
                            wav_data = self._pcm_to_wav(pcm_data)

                            # Send to Groq (run in thread to not block event loop)
                            with open("vad_log.txt", "a") as f:
                                f.write("Sending to Groq API...\n")
                            text = await asyncio.to_thread(self._transcribe_audio, wav_data)
                            with open("vad_log.txt", "a", encoding="utf-8") as f:
                                f.write(f"Got transription: '{text}'\n")

                            if text and text.strip() and text.strip() not in (".", ",", "!", "?"):
                                yield {
                                    "text": text,
                                    "is_final": True,
                                }

                        # Reset state
                        speech_started = False
                        audio_buffer = []
                        last_speech_time = None
                        silence_chunks_after_speech = 0
                        self.vad.reset_states()

        # --- Stream ended: flush remaining audio ---
        if speech_started and audio_buffer:
            print(f"[GroqSTT] Stream ended, flushing {len(audio_buffer)} remaining chunks")
            pcm_data = b"".join(audio_buffer)
            wav_data = self._pcm_to_wav(pcm_data)
            text = await asyncio.to_thread(self._transcribe_audio, wav_data)

            if text and text.strip() and text.strip() not in (".", ",", "!", "?"):
                yield {
                    "text": text,
                    "is_final": True,
                }
