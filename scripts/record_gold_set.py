#!/usr/bin/env python3
"""
Record Gold Standard Test Set

Interactive script to record high-quality test audio with transcriptions.
Creates audio files and corresponding text files for evaluation.

Usage:
    python record_gold_set.py --count 30 --output data/test_audio/gold_set/
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import numpy as np
    import pyaudio
    from scipy.io import wavfile
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install: pip install pyaudio scipy")
    sys.exit(1)


class GoldSetRecorder:
    """Record gold standard test audio."""
    
    def __init__(self, output_dir: str):
        """Initialize recorder.
        
        Args:
            output_dir: Directory to save recordings
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Audio settings
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 16000
        
        # Metadata
        self.metadata = {
            "recording_date": datetime.now().isoformat(),
            "sample_rate": self.RATE,
            "format": "WAV",
            "recordings": []
        }
        
    def record_audio(self, duration: int = 10) -> np.ndarray:
        """Record audio from microphone.
        
        Args:
            duration: Maximum recording duration in seconds
            
        Returns:
            Recorded audio as numpy array
        """
        p = pyaudio.PyAudio()
        
        stream = p.open(
            format=self.FORMAT,
            channels=self.CHANNELS,
            rate=self.RATE,
            input=True,
            frames_per_buffer=self.CHUNK
        )
        
        print("🎙️  Recording... (press Ctrl+C to stop early)")
        
        frames = []
        try:
            for i in range(0, int(self.RATE / self.CHUNK * duration)):
                data = stream.read(self.CHUNK, exception_on_overflow=False)
                frames.append(data)
                
                # Print progress
                elapsed = i * self.CHUNK / self.RATE
                if int(elapsed) != int((i-1) * self.CHUNK / self.RATE):
                    print(f"   {int(elapsed)}s...", end='\r')
                    
        except KeyboardInterrupt:
            print("\n⏹️  Recording stopped by user")
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()
        
        # Convert to numpy array
        audio_data = np.frombuffer(b''.join(frames), dtype=np.int16)
        
        return audio_data
    
    def save_recording(
        self,
        audio: np.ndarray,
        transcription: str,
        recording_id: str,
        metadata: dict = None
    ):
        """Save recording and transcription.
        
        Args:
            audio: Audio data
            transcription: Ground truth text
            recording_id: Unique ID for recording
            metadata: Additional metadata
        """
        # Save audio
        audio_path = self.output_dir / f"{recording_id}.wav"
        wavfile.write(str(audio_path), self.RATE, audio)
        
        # Save transcription
        text_path = self.output_dir / f"{recording_id}.txt"
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(transcription.strip())
        
        # Update metadata
        recording_meta = {
            "id": recording_id,
            "audio_file": str(audio_path.name),
            "text_file": str(text_path.name),
            "transcription": transcription.strip(),
            "duration": len(audio) / self.RATE,
            "timestamp": datetime.now().isoformat()
        }
        
        if metadata:
            recording_meta.update(metadata)
        
        self.metadata["recordings"].append(recording_meta)
        
        print(f"✅ Saved: {audio_path.name}")
    
    def save_metadata(self):
        """Save metadata JSON file."""
        metadata_path = self.output_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        
        print(f"📝 Metadata saved: {metadata_path}")


def main():
    """Main recording function."""
    parser = argparse.ArgumentParser(
        description="Record gold standard test set with transcriptions"
    )
    
    parser.add_argument(
        "--count",
        type=int,
        default=20,
        help="Number of recordings to create (default: 20)"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default="data/test_audio/gold_set",
        help="Output directory for recordings"
    )
    
    parser.add_argument(
        "--duration",
        type=int,
        default=10,
        help="Maximum recording duration in seconds (default: 10)"
    )
    
    parser.add_argument(
        "--prompts-file",
        type=str,
        help="File with prompts to read (one per line)"
    )
    
    args = parser.parse_args()
    
    # Load prompts if provided
    prompts = []
    if args.prompts_file:
        with open(args.prompts_file, 'r', encoding='utf-8') as f:
            prompts = [line.strip() for line in f if line.strip()]
    
    # Initialize recorder
    recorder = GoldSetRecorder(args.output)
    
    print("\n" + "=" * 60)
    print("🎙️  GOLD STANDARD TEST SET RECORDER")
    print("=" * 60)
    print(f"📁 Output: {recorder.output_dir}")
    print(f"🎯 Target: {args.count} recordings")
    print(f"⏱️  Max duration: {args.duration}s per recording")
    print("=" * 60 + "\n")
    
    # Recording loop
    completed = 0
    
    try:
        for i in range(args.count):
            recording_id = f"audio_{i+1:03d}"
            
            print(f"\n--- Recording {i+1}/{args.count} ---")
            
            # Show prompt if available
            if prompts and i < len(prompts):
                print(f"📋 Prompt: {prompts[i]}")
                print()
            
            # Get transcription from user
            print("Please enter the transcription (what you will say):")
            transcription = input("> ").strip()
            
            if not transcription:
                print("⚠️  Empty transcription, skipping...")
                continue
            
            # Wait for user to be ready
            input("\n▶️  Press Enter when ready to record...")
            
            # Record audio
            audio = recorder.record_audio(duration=args.duration)
            
            # Confirm recording
            print(f"\n✓ Recorded {len(audio)/recorder.RATE:.2f}s of audio")
            print("Keep this recording? (y/n/r to re-record)")
            
            response = input("> ").strip().lower()
            
            if response == 'r':
                print("🔄 Re-recording...")
                i -= 1  # Retry this recording
                continue
            elif response == 'n':
                print("⏭️  Skipping this recording")
                continue
            
            # Save recording
            metadata = {
                "prompt": prompts[i] if prompts and i < len(prompts) else None,
                "speaker": input("Speaker name (optional): ").strip() or "anonymous"
            }
            
            recorder.save_recording(audio, transcription, recording_id, metadata)
            completed += 1
            
        # Save metadata
        recorder.save_metadata()
        
        # Summary
        print("\n" + "=" * 60)
        print("✅ RECORDING SESSION COMPLETE")
        print("=" * 60)
        print(f"📊 Completed: {completed}/{args.count} recordings")
        print(f"📁 Saved to: {recorder.output_dir}")
        print("=" * 60 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Recording session interrupted")
        recorder.save_metadata()
        print(f"📊 Completed: {completed} recordings before interruption")


if __name__ == "__main__":
    main()
