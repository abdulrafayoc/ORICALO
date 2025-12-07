import os
import csv
import json
import random
import time
import urllib.request
import urllib.error
from pathlib import Path
import torch
import torchaudio
import torchaudio.functional as F

# Configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
LEXICON_PATH = Path("data/asr/urdu/lexicon.csv") # Updated path to match
OUTPUT_DIR = Path("data/asr/urdu/wavs")
MANIFEST_PATH = Path("data/asr/urdu/train_manifest.json")

# Augmentation Settings
SPEED_FACTORS = [0.8, 0.9, 1.0, 1.1, 1.2]
SAMPLE_RATE = 16000

# Models (Aura 2)
MODELS = [
    "aura-2-amalthea-en", # Filipino (Primary)
    "aura-2-thalia-en",   # American
    "aura-2-odysseus-en", # American
    "aura-2-delia-en",    # American
    "aura-2-draco-en",    # British
    "aura-2-electra-en",  # American
    "aura-2-hera-en",     # American
    "aura-2-hermes-en",   # American
    "aura-2-hyperion-en", # Australian
    "aura-2-iris-en",     # American
    "aura-2-janus-en",    # American
    "aura-2-orion-en",    # American
    "aura-2-orpheus-en",  # American
    "aura-2-pandora-en",  # British
    "aura-2-selene-en",   # American
    "aura-2-theia-en",    # Australian
    "aura-2-vesta-en",    # American
    "aura-2-zeus-en",     # American
]

def get_random_model():
    if random.random() < 0.85:
        return "aura-2-amalthea-en"
    return random.choice(MODELS)

def generate_audio_deepgram(text, model, filepath):
    """Generate audio using Deepgram API."""
    url = f"https://api.deepgram.com/v1/speak?model={model}"
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}",
        "Content-Type": "application/json"
    }
    data = json.dumps({"text": text}).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.read())
                return True
            else:
                print(f"Error: {response.status}")
                return False
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        try:
            print(e.read().decode('utf-8'))
        except:
            pass
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def apply_speed_perturbation(filepath, speed_factors):
    """Generate speed variants of the audio file."""
    generated_files = []
    
    try:
        waveform, sr = torchaudio.load(filepath)
        
        # Ensure 16k
        if sr != SAMPLE_RATE:
            resampler = torchaudio.transforms.Resample(sr, SAMPLE_RATE)
            waveform = resampler(waveform)
            sr = SAMPLE_RATE

        stem = filepath.stem
        parent = filepath.parent

        for speed in speed_factors:
            if speed == 1.0:
                generated_files.append((str(filepath.resolve()), speed))
                continue
                
            # Speed perturbation logic:
            # Resample to target_sr = orig_sr / speed
            # Then treat as orig_sr
            
            target_sr = int(sr / speed)
            
            # Resample the waveform
            # Note: We resample FROM sr TO target_sr, 
            # effectively changing the number of samples.
            # When we save it with 'sr', it plays at a different speed.
            
            # torchaudio.transforms.Resample(orig, new)
            resampler = torchaudio.transforms.Resample(sr, target_sr)
            new_waveform = resampler(waveform)
            
            variant_filename = f"{stem}_speed_{speed}x.wav"
            variant_path = parent / variant_filename
            
            torchaudio.save(variant_path, new_waveform, sr)
            generated_files.append((str(variant_path.resolve()), speed))
            
    except Exception as e:
        print(f"Augmentation failed for {filepath}: {e}")
        # Return at least the original if augmentation fails
        if not generated_files:
             generated_files.append((str(filepath.resolve()), 1.0))

    return generated_files

def main():
    if not LEXICON_PATH.exists():
        print(f"Error: Lexicon not found at {LEXICON_PATH}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    manifest_entries = []
    
    # Load existing manifest to avoid duplicates
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            manifest_entries.extend(existing_data)
            
    existing_paths = {entry['audio_path'] for entry in manifest_entries}
    
    print(f"Reading lexicon from {LEXICON_PATH}...")
    
    with open(LEXICON_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    total_rows = len(rows)
    print(f"Found {total_rows} lexicon entries.")
    
    for i, row in enumerate(rows):
        term = row.get('term', '').strip()
        urdu_variants = row.get('urdu', '').strip()
        
        # New lexicon format handling
        variants = [v.strip() for v in urdu_variants.split(',') if v.strip()]
        if not variants:
            variants = [term]
            
        # We only generate audio for the first/main variant for now
        # Expand this loop if you want ALL variants
        text_to_speak = variants[0]
        
        safe_term = "".join([c for c in term if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_').lower()
        base_filename = f"{safe_term}_{i}.wav"
        base_filepath = OUTPUT_DIR / base_filename
        
        # Check if original exists
        if str(base_filepath.resolve()) in existing_paths or base_filepath.exists():
            print(f"[{i+1}/{total_rows}] Skipping generation for {term} (exists)")
            # Still might want to ensure augmentations exist? 
            # For now, simplistic check.
            continue
            
        model = get_random_model()
        
        print(f"[{i+1}/{total_rows}] Generating '{text_to_speak}'...")
        success = generate_audio_deepgram(text_to_speak, model, base_filepath)
        
        if success:
            # Augment
            variants_list = apply_speed_perturbation(base_filepath, SPEED_FACTORS)
            
            for path, speed in variants_list:
                manifest_entries.append({
                    "audio_path": path,
                    "text": text_to_speak,
                    "duration": 0, # Duration calculated during training load or we can do it here
                    "meta": {
                        "speed": speed,
                        "term": term,
                        "category": row.get('category', 'unknown')
                    }
                })
                
            time.sleep(0.5) # Rate limit
            
    print(f"Saving manifest with {len(manifest_entries)} entries to {MANIFEST_PATH}...")
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest_entries, f, indent=2, ensure_ascii=False)
        
    print("Done!")

if __name__ == "__main__":
    main()
