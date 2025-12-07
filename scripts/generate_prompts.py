
import csv
import json
from pathlib import Path

# Paths relative to project root usually
LEXICON_PATH = Path("data/asr/urdu/lexicon.csv")
PROMPTS_PATH = Path("training/asr/prompts.json")

def main():
    if not LEXICON_PATH.exists():
        print(f"Lexicon not found: {LEXICON_PATH}")
        return

    prompts = []
    
    with open(LEXICON_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            urdu_text = row.get('urdu', '').split(',')[0].strip()
            term = row.get('term', '')
            category = row.get('category', '')
            
            prompts.append({
                "id": term,
                "text": urdu_text,
                "category": category
            })
            
    PROMPTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PROMPTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=2, ensure_ascii=False)
        
    print(f"Generated {len(prompts)} prompts to {PROMPTS_PATH}")

if __name__ == "__main__":
    main()
