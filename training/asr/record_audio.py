import json
import os
import sys
import time
import wave
import sounddevice as sd
import numpy as np
from pathlib import Path
from scipy.io.wavfile import write

# Configuration
PROMPTS_PATH = Path("training/asr/prompts.json")
OUTPUT_DIR = Path("data/asr/urdu/wavs")
MANIFEST_PATH = Path("data/asr/urdu/train_manifest.json")
SAMPLE_RATE = 16000

def record_audio(duration=None):
    print("Recording... Press Ctrl+C to stop if no duration set.")
    try:
        if duration:
            recording = sd.rec(int(duration * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1)
            sd.wait()
            return recording
        else:
            # Infinite recording until keyboard interrupt? 
            # Better to just record fixed duration or enter to stop.
            # Let's do: Press Enter to start, Press Enter to stop.
            pass
    except Exception as e:
        print(f"Error recording: {e}")
        return None

def record_interactive(filename, text):
    print(f"\nPrompt: \"{text}\"")
    input("Press Enter to start recording...")
    print("Recording... (Press Ctrl+C to stop)")
    
    audio_data = []
    
    def callback(indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        audio_data.append(indata.copy())

    try:
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, callback=callback):
            while True:
                time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopped.")
    
    if not audio_data:
        return False
        
    recording = np.concatenate(audio_data, axis=0)
    
    # Save
    filepath = OUTPUT_DIR / filename
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Convert to 16-bit PCM
    recording_int16 = (recording * 32767).astype(np.int16)
    write(str(filepath), SAMPLE_RATE, recording_int16)
    print(f"Saved to {filepath}")
    return str(filepath.resolve())

def main():
    if not PROMPTS_PATH.exists():
        print(f"Prompts file not found: {PROMPTS_PATH}")
        print("Run generate_prompts.py first.")
        return

    with open(PROMPTS_PATH, 'r', encoding='utf-8') as f:
        prompts = json.load(f)
        
    manifest = []
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            
    existing_paths = {m['audio_path'] for m in manifest}
    
    print(f"Loaded {len(prompts)} prompts.")
    print(f"Already recorded: {len(manifest)}")
    
    try:
        for i, p in enumerate(prompts):
            text = p['text']
            safe_id = "".join([c for c in p['id'] if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_').lower()
            filename = f"manual_{safe_id}.wav"
            filepath = OUTPUT_DIR / filename
            
            if str(filepath.resolve()) in existing_paths:
                continue
                
            print(f"\n[{i+1}/{len(prompts)}] {text}")
            skip = input("Press Enter to record, 's' to skip, 'q' to quit: ")
            if skip.lower() == 'q':
                break
            if skip.lower() == 's':
                continue
                
            saved_path = record_interactive(filename, text)
            
            if saved_path:
                manifest.append({
                    "audio_path": saved_path,
                    "text": text,
                    "duration": 0 # Placeholder
                })
                
                # Save manifest incrementally
                with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                    
    except KeyboardInterrupt:
        print("\nExiting...")
        
    print("Done.")

if __name__ == "__main__":
    main()
