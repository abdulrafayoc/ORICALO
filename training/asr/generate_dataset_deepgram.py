import os
import csv
import json
import random
import time
import urllib.request
import urllib.error
from pathlib import Path

# Configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
LEXICON_PATH = Path("data/lexicon/lexicon.csv")
OUTPUT_DIR = Path("data/asr/urdu/wavs")
MANIFEST_PATH = Path("data/asr/urdu/train_manifest.json")

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

def generate_audio(text, model, filepath):
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
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    if not LEXICON_PATH.exists():
        print(f"Error: Lexicon not found at {LEXICON_PATH}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    manifest_entries = []
    
    print(f"Reading lexicon from {LEXICON_PATH}...")
    
    with open(LEXICON_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    total_rows = len(rows)
    print(f"Found {total_rows} entries. Starting generation...")
    
    for i, row in enumerate(rows):
        term = row.get('term', '').strip()
        urdu_variants = row.get('urdu', '').strip()
        
        variants = [v.strip() for v in urdu_variants.split(',') if v.strip()]
        if not variants:
            variants = [term]
            
        text_to_speak = variants[0]
        
        safe_filename = "".join([c for c in term if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_').lower()
        filename = f"{safe_filename}_{i}.wav"
        filepath = OUTPUT_DIR / filename
        
        if filepath.exists():
            print(f"[{i+1}/{total_rows}] Skipping {filename} (exists)")
            manifest_entries.append({
                "audio_path": str(filepath.resolve()),
                "text": text_to_speak,
                "duration": 0
            })
            continue

        model = get_random_model()
        
        try:
            print(f"[{i+1}/{total_rows}] Generating '{text_to_speak}' with {model}...")
            success = generate_audio(text_to_speak, model, filepath)
            
            if success:
                manifest_entries.append({
                    "audio_path": str(filepath.resolve()),
                    "text": text_to_speak
                })
            
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Failed to generate {text_to_speak}: {e}")

    print(f"Saving manifest to {MANIFEST_PATH}...")
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest_entries, f, indent=2, ensure_ascii=False)
        
    print("Done!")

if __name__ == "__main__":
    main()
