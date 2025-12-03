import csv
import json
from pathlib import Path

LEXICON_PATH = Path("data/lexicon/lexicon.csv")
PROMPTS_PATH = Path("training/asr/prompts.json")

def main():
    if not LEXICON_PATH.exists():
        print(f"Error: Lexicon not found at {LEXICON_PATH}")
        return

    prompts = []
    print(f"Reading lexicon from {LEXICON_PATH}...")
    
    with open(LEXICON_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            term = row.get('term', '').strip()
            urdu_variants = row.get('urdu', '').strip()
            category = row.get('category', '').strip()
            
            variants = [v.strip() for v in urdu_variants.split(',') if v.strip()]
            if not variants:
                variants = [term]
            
            # Use the first variant as the prompt text
            text = variants[0]
            
            prompts.append({
                "id": term,
                "text": text,
                "category": category
            })
            
    print(f"Generated {len(prompts)} prompts.")
    
    PROMPTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PROMPTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=2, ensure_ascii=False)
        
    print(f"Saved prompts to {PROMPTS_PATH}")

if __name__ == "__main__":
    main()
