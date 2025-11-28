#!/usr/bin/env python3
"""
Real-time Streaming Whisper STT Demo
Shows live transcription as you speak - word by word!
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import time
import threading
import queue
import numpy as np
import torch
import pyaudio
from stt.stt_hf import Ear_hf

class LiveStreamingWhisper:
    def __init__(self, model_id="kingabzpro/whisper-tiny-urdu"):
        """Initialize live streaming STT with microphone input"""

        # Setup device
        if torch.backends.mps.is_available():
            device = "mps"
        elif torch.cuda.is_available():
            device = "cuda"
        else:
            device = "cpu"

        print(f"  Initializing Live Streaming Whisper on {device}...")

        # Initialize the STT model with streaming enabled
        self.ear = Ear_hf(
            device=device,
            model_id=model_id,
        )

        # Audio recording setup
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 16000

        # Queues for streaming communication
        self.audio_queue = queue.Queue()
        self.transcription_queue = queue.Queue()

        # Control flags
        self.is_listening = False
        self.display_thread = None
        self.audio_thread = None

        print("  Live Streaming Whisper ready!")

    def audio_capture_thread(self):
        """Capture audio from microphone and feed to queue"""
        p = pyaudio.PyAudio()
        stream = p.open(
            format=self.FORMAT,
            channels=self.CHANNELS,
            rate=self.RATE,
            input=True,
            frames_per_buffer=self.CHUNK
        )

        print("  Listening to microphone...")

        try:
            while self.is_listening:
                try:
                    data = stream.read(self.CHUNK, exception_on_overflow=False)
                    self.audio_queue.put(data)
                except Exception as e:
                    if self.is_listening:  # Only print if we're still supposed to be listening
                        print(f"   Audio capture warning: {e}")
        except Exception as e:
            print(f"  Audio capture error: {e}")
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()
            self.audio_queue.put(None)  # Signal end of audio

    def display_streaming_text(self):
        """Display streaming text in real-time"""
        current_text = ""
        last_update = time.time()

        print("\n  Speak now! Your words will appear live...")
        print("  Live transcription:")
        print("-" * 60)

        try:
            while self.is_listening:
                try:
                    # Check for new transcription chunks (non-blocking)
                    while not self.transcription_queue.empty():
                        chunk = self.transcription_queue.get_nowait()
                        if chunk is None:  # End signal
                            self.is_listening = False
                            break
                        if chunk.strip():  # Only process non-empty chunks
                            current_text = chunk.strip()
                            self._update_display(current_text)

                    # Update display periodically even if no new chunks
                    if time.time() - last_update > 0.5 and current_text:
                        self._update_display(current_text)

                except queue.Empty:
                    time.sleep(0.01)  # Small delay to prevent busy waiting
                except KeyboardInterrupt:
                    break

        except Exception as e:
            print(f"  Display error: {e}")
        finally:
            # Show final result
            if current_text:
                print(f"\n  Final result: '{current_text}'")

    def _update_display(self, text):
        """Update the console display with current text"""
        # Clear previous lines and show updated text
        sys.stdout.write('\033[2K\033[1A\033[2K\033[1A\033[2K')  # Clear 3 lines
        sys.stdout.write('\r  Live transcription:\n')
        sys.stdout.write('-' * 60 + '\n')
        sys.stdout.write(f'  {text}\n')
        sys.stdout.flush()

    def start_live_streaming(self):
        """Start live streaming transcription"""
        self.is_listening = True

        # Start audio capture thread
        self.audio_thread = threading.Thread(target=self.audio_capture_thread)
        self.audio_thread.start()

        # Start display thread
        self.display_thread = threading.Thread(target=self.display_streaming_text)
        self.display_thread.start()

        # Start streaming transcription (main thread)
        try:
            self.ear.transcribe_stream(self.audio_queue, self.transcription_queue)
        except Exception as e:
            print(f"  Error in streaming transcription: {e}")
        finally:
            self.is_listening = False

            # Wait for threads to finish
            if self.audio_thread and self.audio_thread.is_alive():
                self.audio_thread.join(timeout=2)
            if self.display_thread and self.display_thread.is_alive():
                self.display_thread.join(timeout=2)

def main():
    """Main live streaming test function"""
    print("  Live Streaming Whisper STT Demo")
    print("=" * 60)
    print("  This will transcribe your speech in REAL-TIME!")
    print("  Speak clearly and watch your words appear live")
    print("  Press Ctrl+C to stop")
    print("=" * 60)

    # Initialize live streaming STT
    streamer = LiveStreamingWhisper()

    try:
        # Start live streaming transcription
        streamer.start_live_streaming()

    except KeyboardInterrupt:
        print("\n  Stopped by user")
    except Exception as e:
        print(f"\n  Error: {e}")
    finally:
        print("\n  Live streaming demo completed!")

if __name__ == "__main__":
    main()
