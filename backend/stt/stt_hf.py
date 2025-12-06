"""HuggingFace-based Speech-to-Text implementation with streaming support."""

from typing import Dict, Optional, Any, List
from queue import Queue
import numpy as np
import torch
import re
from transformers import pipeline

if __name__ == "__main__":
    from base import BaseEar
else:
    from .base import BaseEar


class Ear_hf(BaseEar):
    """HuggingFace Whisper-based speech recognition with real-time streaming.
    
    Optimized for Urdu language recognition using local lightweight models.
    Supports both batch and streaming transcription modes.
    
    Args:
        model_id: HuggingFace model identifier (default: Urdu Whisper model)
        device: Device to run inference on ('cpu', 'cuda', 'mps')
        silence_seconds: Duration of silence to detect end of speech
        generate_kwargs: Additional generation parameters for model
        listener: Custom audio listener instance
        listen_interruptions: Whether to detect speech interruptions
        logger: Logger instance for debugging
        chunk_size: Number of audio chunks to process at once (streaming)
    """
    
    # Common Whisper hallucinations to filter out
    HALLUCINATION_PATTERNS = [
        r"^you\s+",  # "you " at start
        r"^thank you\s+",  # "thank you " at start
        r"^\s*\.\.+\s*",  # Just ellipsis
        r"^\s*you\s*\.\s*",  # Just "you."
        r"^\s*ملکی\s*",  # Just "ملکی"
    ]
    
    def __init__(
        self,
        model_id: str = "kingabzpro/whisper-tiny-urdu",
        device: str = "cpu",
        silence_seconds: float = 2.0,
        generate_kwargs: Optional[Dict[str, Any]] = None,
        listener: Optional[Any] = None,
        listen_interruptions: bool = True,
        logger: Optional[Any] = None,
        chunk_size: int = 10,
        remove_hallucinations: bool = True,
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
        self.chunk_size = chunk_size
        self.remove_hallucinations = remove_hallucinations
        
        # Cache model components for streaming
        self.tokenizer = self.pipe.tokenizer
        self.model = self.pipe.model
        
        # Internal state for iterative processing
        self._audio_buffer = []
        self._chunk_count = 0
        self._last_transcription = ""

    def process_iterative(self, audio_chunk: bytes) -> Optional[str]:
        """
        Process a single chunk of audio and return transcription if ready.
        Maintains internal state (buffer).
        
        Args:
            audio_chunk: Raw audio bytes (int16).
            
        Returns:
            Transcription string if a new update is available, else None.
        """
        self._audio_buffer.append(audio_chunk)
        self._chunk_count += 1
        
        # Process every N chunks
        if self._chunk_count % self.chunk_size == 0:
            transcription = self._process_audio_buffer(self._audio_buffer)
            
            if transcription and transcription != self._last_transcription:
                self._last_transcription = transcription
                return transcription
                
        return None
        
    def reset_stream(self):
        """Reset the internal stream state."""
        self._audio_buffer = []
        self._chunk_count = 0
        self._last_transcription = ""

    def transcribe(self, audio: np.ndarray) -> str:
        """Transcribe a complete audio array.
        
        Args:
            audio: Audio data as float32 numpy array (normalized to [-1, 1])
            
        Returns:
            Transcribed text string
        """
        with torch.no_grad():
            transcription = self.pipe(audio, generate_kwargs=self.generate_kwargs)
        
        text = transcription["text"].strip()
        
        # Clean up hallucinations
        if self.remove_hallucinations:
            text = self._clean_hallucinations(text)
            
        return text

    def transcribe_stream(self, audio_queue: Queue, transcription_queue: Queue) -> None:
        """Real-time streaming transcription.
        
        Processes audio chunks from queue and provides live transcriptions.
        Optimized for low-latency feedback during speech.
        
        Args:
            audio_queue: Queue containing raw audio chunks (int16 bytes)
            transcription_queue: Queue to output transcription strings
        """
        try:
            audio_buffer = []
            chunk_count = 0
            last_transcription = ""

            while True:
                audio_chunk = audio_queue.get()
                if audio_chunk is None:
                    break

                chunk_count += 1
                audio_buffer.append(audio_chunk)

                # Process every N chunks for real-time feedback
                if chunk_count % self.chunk_size == 0 and audio_buffer:
                    transcription = self._process_audio_buffer(audio_buffer)
                    
                    # Only send new/different transcriptions
                    if transcription and transcription != last_transcription:
                        transcription_queue.put(transcription)
                        last_transcription = transcription

            # Final complete transcription
            if audio_buffer:
                final_text = self._process_audio_buffer(audio_buffer)
                if final_text and final_text != last_transcription:
                    transcription_queue.put(final_text)

        except Exception as e:
            self._log_event("streaming_error", "STT", str(e))
        finally:
            transcription_queue.put(None)
    
    def _process_audio_buffer(self, audio_buffer: list) -> str:
        """Process accumulated audio buffer into transcription.
        
        Args:
            audio_buffer: List of audio byte chunks
            
        Returns:
            Transcribed text string
        """
        try:
            # Combine and normalize audio
            audio_data = b"".join(audio_buffer)
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(
                np.float32
            ) / (1 << 15)
            
            # Extract features
            inputs = self.feature_extractor(
                audio_np,
                sampling_rate=16000,
                return_tensors="pt"
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Generate transcription
            with torch.no_grad():
                generated_ids = self.model.generate(
                    inputs["input_features"],
                    max_length=448,
                    num_beams=1,
                )

            # Decode tokens
            transcription = self.tokenizer.batch_decode(
                generated_ids,
                skip_special_tokens=True
            )[0].strip()
            
            # Clean up hallucinations
            if self.remove_hallucinations:
                transcription = self._clean_hallucinations(transcription)
            
            return transcription
            
        except Exception as e:
            self._log_event("buffer_processing_error", "STT", str(e))
            return ""
    
    def _clean_hallucinations(self, text: str) -> str:
        """Remove common Whisper hallucinations from transcription.
        
        Args:
            text: Raw transcription text
            
        Returns:
            Cleaned transcription text
        """
        if not text:
            return text
            
        # Apply regex patterns to remove common hallucinations
        cleaned = text
        for pattern in self.HALLUCINATION_PATTERNS:
            cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        
        # Remove leading filler words that are likely hallucinations
        # (only at the very beginning)
        filler_words = ["you", "thank you", "um", "uh"]
        words = cleaned.split()
        
        # Remove leading filler words (max 2)
        removed_count = 0
        while words and removed_count < 2:
            if words[0].lower().strip(".,!?") in filler_words:
                words.pop(0)
                removed_count += 1
            else:
                break
        
        cleaned = " ".join(words).strip()
        
        # Clean up extra spaces
        cleaned = re.sub(r"\s+", " ", cleaned)
        
        return cleaned


if __name__ == "__main__":
    # Simple test when run directly
    device = (
        "cuda" if torch.cuda.is_available()
        else "mps" if torch.backends.mps.is_available()
        else "cpu"
    )
    
    print(f"Using device: {device}")
    ear = Ear_hf(device=device)
    
    print("Listening... Speak now!")
    text = ear.listen()
    print(f"Transcription: {text}")
