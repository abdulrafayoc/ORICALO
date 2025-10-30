#!/usr/bin/env python3
"""
Urdu Speech-to-Text Demo with Real-Time Streaming
================================================

This demo showcases a local Urdu STT system using HuggingFace Whisper models.

Features:
- Real-time streaming transcription
- Local inference (no API calls)
- Lightweight Whisper model optimized for Urdu
- Voice activity detection for automatic start/stop

Usage:
    python quick_demo.py [--model MODEL_ID] [--device DEVICE]

Examples:
    python quick_demo.py
    python quick_demo.py --device cuda
    python quick_demo.py --model kingabzpro/whisper-tiny-urdu
"""

import argparse
import time
from typing import Optional
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import torch
    from stt.stt_hf import Ear_hf
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install required packages: pip install torch transformers pyaudio")
    sys.exit(1)


class UrduSTTDemo:
    """Professional demo for Urdu speech-to-text with streaming."""
    
    # Recommended Urdu models (lightweight, local inference)
    URDU_MODELS = {
        "tiny": "openai/whisper-tiny",
        "small": "openai/whisper-small",
        "base": "openai/whisper-base",  # Multilingual fallback
    }
    
    def __init__(self, model_id: str, device: str, silence_duration: float = 2.0):
        """Initialize the STT demo.
        
        Args:
            model_id: HuggingFace model identifier
            device: Compute device ('cpu', 'cuda', 'mps')
            silence_duration: Seconds of silence before stopping recording
        """
        self.model_id = model_id
        self.device = device
        self.silence_duration = silence_duration
        self.ear: Optional[Ear_hf] = None
        
    def setup(self) -> bool:
        """Initialize the STT model.
        
        Returns:
            True if setup successful, False otherwise
        """
        try:
            print(f"🔧 Initializing STT System")
            print(f"   Model: {self.model_id}")
            print(f"   Device: {self.device}")
            print(f"   Silence threshold: {self.silence_duration}s")
            print("\n⏳ Loading model... (this may take a moment)")
            
            self.ear = Ear_hf(
                model_id=self.model_id,
                device=self.device,
                silence_seconds=self.silence_duration,
                chunk_size=10,  # Process every 10 audio chunks
            )
            
            print("✅ Model loaded successfully!\n")
            return True
            
        except Exception as e:
            print(f"❌ Setup failed: {e}")
            return False
    
    def run_single_test(self) -> None:
        """Run a single transcription test."""
        if not self.ear:
            print("❌ Model not initialized. Call setup() first.")
            return
            
        print("=" * 60)
        print("🎤 LISTENING FOR SPEECH")
        print("=" * 60)
        print("📢 Speak in Urdu (or English)")
        print("🔇 Stop speaking to complete transcription")
        print("⏱️  Silence detection: automatic after 2 seconds")
        print("-" * 60)
        
        try:
            start_time = time.time()
            
            # Record and transcribe with real-time streaming
            transcription = self.ear.listen()
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Display results
            print("\n" + "=" * 60)
            print("✨ TRANSCRIPTION RESULT")
            print("=" * 60)
            print(f"\n📝 Text: \"{transcription}\"\n")
            print(f"⏱️  Duration: {duration:.2f}s")
            print(f"📊 Length: {len(transcription)} characters")
            print(f"🗣️  Words: {len(transcription.split())} words")
            print("=" * 60 + "\n")
            
        except KeyboardInterrupt:
            print("\n\n⏹️  Recording stopped by user")
        except Exception as e:
            print(f"\n❌ Transcription error: {e}")
    
    def run_interactive_mode(self) -> None:
        """Run interactive mode with multiple transcriptions."""
        if not self.ear:
            print("❌ Model not initialized. Call setup() first.")
            return
            
        print("\n🔄 INTERACTIVE MODE")
        print("Press Enter to start recording, Ctrl+C to exit\n")
        
        test_count = 0
        
        try:
            while True:
                input("▶️  Press Enter to start recording...")
                test_count += 1
                print(f"\n--- Test #{test_count} ---")
                self.run_single_test()
                
        except KeyboardInterrupt:
            print(f"\n\n👋 Exiting after {test_count} test(s)")


def get_optimal_device() -> str:
    """Detect the best available compute device.
    
    Returns:
        Device string: 'cuda', 'mps', or 'cpu'
    """
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


def main():
    """Main entry point for the demo."""
    parser = argparse.ArgumentParser(
        description="Urdu Speech-to-Text Demo with Streaming",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Use default settings
  %(prog)s --device cuda             # Use CUDA GPU
  %(prog)s --model tiny --interactive # Interactive mode with tiny model
        """
    )
    
    parser.add_argument(
        "--model",
        type=str,
        default="tiny",
        choices=list(UrduSTTDemo.URDU_MODELS.keys()) + ["custom"],
        help="Predefined model size or 'custom' (default: tiny)"
    )
    
    parser.add_argument(
        "--model-id",
        type=str,
        help="Custom HuggingFace model ID (when --model=custom)"
    )
    
    parser.add_argument(
        "--device",
        type=str,
        default=None,
        choices=["cpu", "cuda", "mps"],
        help="Compute device (auto-detected if not specified)"
    )
    
    parser.add_argument(
        "--silence",
        type=float,
        default=2.0,
        help="Seconds of silence before stopping (default: 2.0)"
    )
    
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run in interactive mode (multiple tests)"
    )
    
    args = parser.parse_args()
    
    # Determine model ID
    if args.model == "custom":
        if not args.model_id:
            parser.error("--model-id required when using --model=custom")
        model_id = args.model_id
    else:
        model_id = UrduSTTDemo.URDU_MODELS[args.model]
    
    # Determine device
    device = args.device if args.device else get_optimal_device()
    
    # Display banner
    print("\n" + "=" * 60)
    print("  🎙️  URDU SPEECH-TO-TEXT DEMO")
    print("  Real-Time Streaming | Local Inference | Whisper Model")
    print("=" * 60 + "\n")
    
    # Initialize demo
    demo = UrduSTTDemo(
        model_id=model_id,
        device=device,
        silence_duration=args.silence
    )
    
    if not demo.setup():
        sys.exit(1)
    
    # Run demo
    try:
        if args.interactive:
            demo.run_interactive_mode()
        else:
            demo.run_single_test()
            
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
