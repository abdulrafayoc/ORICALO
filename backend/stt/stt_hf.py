"""HuggingFace-based Speech-to-Text implementation with streaming support."""

import asyncio
import time
import re
from typing import Dict, Optional, Any, List
from queue import Queue, Empty
import numpy as np
import torch
from transformers import pipeline

if __name__ == "__main__":
    import sys
    import os
    # Add project root to path
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
    
    from backend.stt.base import BaseEar
    from backend.stt.vad import OptimizedVAD
    from backend.stt.logger_config import configure_logger
else:
    from .base import BaseEar
    from .vad import OptimizedVAD
    from .logger_config import configure_logger

logger = configure_logger(__name__)

class HallucinationFilter:
    # Known Whisper hallucinations (especially for short audio)
    KNOWN_HALLUCINATIONS = {
        "you", "thank you", "thanks for watching", "subscribe",
        "like and subscribe", "bye", "see you", "...", "♪", "🎵",
        "oh", "ah"
    }
    
    # Language-specific hallucinations for Urdu
    URDU_HALLUCINATIONS = {"ملکی", "شکریہ"}
    
    @staticmethod
    def filter(text: str, audio_duration: float = 0.0) -> str:
        text = text.strip()
        
        # Reject very short audio with generic phrases
        if audio_duration > 0 and audio_duration < 1.0:
             if text.lower().strip(".,!?") in HallucinationFilter.KNOWN_HALLUCINATIONS:
                return ""
        
        # Remove leading fillers
        text = re.sub(r'^(um|uh|hmm|you|thank you)\s*,?\s*', '', text, flags=re.IGNORECASE)
        
        # Remove repeated punctuation and specific single/double punctuation hallucinations
        text = re.sub(r'([.,!?])\1+', r'\1', text)
        if text.strip() in [".", ",", "!", "?", "!",]:
            return ""
        
        return text.strip()

class StreamingWhisperTranscriber(BaseEar):
    """Event-driven Whisper ASR with stateful VAD and interim results."""
    
    def __init__(
        self,
        model_id: str = "kingabzpro/whisper-tiny-urdu",
        device: str = "cpu",
        silence_seconds: float = 2.0, # Used for endpointing
        generate_kwargs: Optional[Dict[str, Any]] = None,
        listener: Optional[Any] = None,
        listen_interruptions: bool = True,
        logger: Optional[Any] = None,
        chunk_size: int = 10, # Kept for compatibility but less relevant in new arch
        endpointing_ms: int = 800,
    ):
        super().__init__(
            silence_seconds=silence_seconds,
            listener=listener,
            listen_interruptions=listen_interruptions,
            logger=logger,
            stream=True,
        )
        
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=model_id,
            device=device
        )
        self.device = device
        self.generate_kwargs = generate_kwargs or {}
        
        # Initialize VAD
        self.vad = OptimizedVAD(threshold=0.5)
        
        # Streaming state
        self.current_turn_audio = []
        self.speech_started = False
        self.last_speech_time = None
        self.endpointing_ms = endpointing_ms
        self.audio_without_speech_count = 0 
        
        # Cache model components
        self.tokenizer = self.pipe.tokenizer
        self.model = self.pipe.model

    def transcribe_stream(self, audio_queue: Queue, transcription_queue: Queue) -> None:
        """
        Event-driven transcription loop.
        Consumes from audio_queue (chunks), uses VAD, and emits events to transcription_queue.
        """
        logger.info("Starting ASR stream...")
        try:
            self.current_turn_audio = []
            self.speech_started = False
            self.vad.reset_states()
            
            while True:
                try:
                    # Non-blocking get with timeout to allow checking for signals if needed
                    audio_chunk = audio_queue.get(timeout=0.1)
                except Empty:
                    continue
                    
                if audio_chunk is None:
                    break
                
                # Check VAD
                # Convert bytes to numpy for VAD check
                # User ecosystem uses Int16 (pcm) by default (see utils.py)
                if isinstance(audio_chunk, bytes):
                    # Robust decoding: Assume Int16, normalize to Float32
                    audio_chunk_int16 = np.frombuffer(audio_chunk, dtype=np.int16)
                    audio_chunk_np = audio_chunk_int16.astype(np.float32) / 32768.0
                else:
                    audio_chunk_np = audio_chunk
                
                # Ensure 1D or 2D
                if audio_chunk_np.ndim > 2:
                    audio_chunk_np = audio_chunk_np.flatten()
                    
                is_speech = self.vad.is_speech(audio_chunk_np)
                current_time = time.time()
                
                if is_speech:
                    self.audio_without_speech_count = 0
                    if not self.speech_started:
                        self.speech_started = True
                        transcription_queue.put({"type": "speech_started"})
                        transcription_queue.put({"type": "vad_status", "status": "speech"}) # Feedback
                        logger.debug("Speech started event emitted")
                    
                    self.current_turn_audio.append(audio_chunk)
                    self.last_speech_time = current_time
                    
                    # Periodic interim results
                    if len(self.current_turn_audio) % 15 == 0:
                        interim_text = self._transcribe_buffer(self.current_turn_audio)
                        if interim_text:
                            transcription_queue.put({
                                "type": "interim_transcript_received", 
                                "content": interim_text
                            })
                            
                else:
                    # Silence detected
                    if self.speech_started and self.last_speech_time:
                        silence_duration_ms = (current_time - self.last_speech_time) * 1000
                        
                        # Add some silence context
                        if self.audio_without_speech_count < 10: 
                           self.current_turn_audio.append(audio_chunk)
                           self.audio_without_speech_count += 1
                        
                        if silence_duration_ms > self.endpointing_ms:
                            # Endpoint reached
                            logger.info(f"Endpointing triggered after {silence_duration_ms:.0f}ms silence")
                            final_text = self._transcribe_buffer(self.current_turn_audio)
                            
                            # Apply hallucination filter
                            duration_s = len(self.current_turn_audio) * 512 / 16000 # Approx configuration
                            final_text = HallucinationFilter.filter(final_text, duration_s)
                            
                            if final_text:
                                transcription_queue.put({
                                    "type": "transcript", 
                                    "content": final_text
                                })
                            
                            transcription_queue.put({"type": "vad_status", "status": "silence"}) # Feedback
                            self._reset_turn()
            
            # Final cleanup
            if self.speech_started and self.current_turn_audio:
                 final_text = self._transcribe_buffer(self.current_turn_audio)
                 # Filter checks
                 duration_s = len(self.current_turn_audio) * 512 / 16000
                 final_text = HallucinationFilter.filter(final_text, duration_s)
                 
                 if final_text:
                     transcription_queue.put({"type": "transcript", "content": final_text})
                 transcription_queue.put({"type": "vad_status", "status": "silence"})

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            transcription_queue.put({"type": "error", "content": str(e)})

    def _reset_turn(self):
        self.speech_started = False
        self.current_turn_audio = []
        self.last_speech_time = None
        self.vad.reset_states()
        self.audio_without_speech_count = 0

    def _transcribe_buffer(self, audio_buffer: list) -> str:
        """Process accumulated audio buffer into transcription."""
        if not audio_buffer:
            return ""
            
        try:
            # Combine and normalize audio
            audio_data = b"".join(audio_buffer)
            # CRITICAL FIX: Buffer is Int16 bytes, not Float32 bytes
            audio_int16 = np.frombuffer(audio_data, dtype=np.int16)
            audio_np = audio_int16.astype(np.float32) / 32768.0
            
            # Feature extraction
            inputs = self.pipe.feature_extractor(
                audio_np,
                sampling_rate=16000,
                return_tensors="pt"
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Generate
            with torch.no_grad():
                generated_ids = self.model.generate(
                    inputs["input_features"],
                    max_length=448,
                    num_beams=1,
                )

            # Decode
            transcription = self.tokenizer.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            return transcription
            
        except Exception as e:
            logger.error(f"Buffer processing error: {e}")
            return ""

# Compatibility alias
Ear_hf = StreamingWhisperTranscriber

if __name__ == "__main__":
    # Test block
    print("Initializing StreamingWhisperTranscriber...")
    
    # Mock queues
    audio_q = Queue()
    trans_q = Queue()
    
    ear = StreamingWhisperTranscriber(device="cpu") # Force CPU for test
    
    # Create a dummy thread to feed audio/silence
    import threading
    def feed_dummy_audio():
        print("Feeding audio...")
        # 1. 2 seconds of silence
        silence_chunk = np.zeros(512, dtype=np.float32).tobytes()
        for _ in range(60): # ~2s
            audio_q.put(silence_chunk)
            time.sleep(0.01)
            
        # 2. 2 seconds of noise (simulated speech energy) - VAD should trigger
        # We need actual values that trigger VAD. Random uniform -1 to 1 should be loud enough
        speech_chunk = np.random.uniform(-0.5, 0.5, 512).astype(np.float32).tobytes()
        for _ in range(60):
            audio_q.put(speech_chunk)
            time.sleep(0.01)
            
        # 3. 2 seconds of silence (trigger endpoint)
        for _ in range(60):
            audio_q.put(silence_chunk)
            time.sleep(0.01)
            
        audio_q.put(None)
        print("Feeding done.")

    t = threading.Thread(target=feed_dummy_audio)
    t.start()
    
    print("Starting transcription loop...")
    ear.transcribe_stream(audio_q, trans_q)
    
    print("Results:")
    while not trans_q.empty():
        print(trans_q.get())
