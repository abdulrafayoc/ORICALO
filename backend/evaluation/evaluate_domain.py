
import json
import csv
import argparse
import sys
from pathlib import Path
from jiwer import wer, cer
from typing import List, Set

# Add parent dir to path to import backend modules if needed
sys.path.append(str(Path(__file__).parent.parent.parent))

try:
    from backend.stt.stt_hf import Ear_hf
except ImportError:
    print("Warning: Could not import Ear_hf. Evaluation will only run if hypothesis provided in manifest or if manual.")

class DomainEvaluator:
    def __init__(self, lexicon_path: str):
        self.lexicon_terms = self._load_lexicon(lexicon_path)
        print(f"Loaded {len(self.lexicon_terms)} domain terms from lexicon.")

    def _load_lexicon(self, path: str) -> Set[str]:
        terms = set()
        if not Path(path).exists():
            print(f"Lexicon not found at {path}")
            return terms
            
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Add main term
                term = row.get('term', '').lower()
                if term:
                    terms.add(term)
                
                # Add Urdu variants
                urdu_variants = row.get('urdu', '').split(',')
                for v in urdu_variants:
                    v_clean = v.strip()
                    if v_clean:
                        terms.add(v_clean)
        return terms

    def term_accuracy_rate(self, reference: str, hypothesis: str) -> float:
        """
        Calculate proportion of domain terms in reference that are present in hypothesis.
        """
        ref_words = set(reference.split())
        
        # Identify domain terms present in reference
        domain_terms_in_ref = ref_words.intersection(self.lexicon_terms)
        
        if not domain_terms_in_ref:
            return 1.0 # No domain terms to miss
            
        # Check presence in hypothesis (simple containment)
        # Note: This is a simple bag-of-words check. 
        # For more strict alignment, we'd need alignment.
        
        matched_count = 0
        for term in domain_terms_in_ref:
            if term in hypothesis:
                matched_count += 1
                
        return matched_count / len(domain_terms_in_ref)

    def evaluate(self, dataset: List[dict], model=None):
        total_wer = 0
        total_cer = 0
        total_tar = 0
        count = 0
        
        print("\nStarting Evaluation...")
        print(f"{'Reference':<50} | {'Hypothesis':<50} | {'WER':<5} | {'TAR':<5}")
        print("-" * 120)

        for item in dataset:
            reference = item.get('text', '') or item.get('reference_text', '')
            audio_path = item.get('audio_path', '')
            
            if not reference:
                continue

            hypothesis = ""
            if 'hypothesis' in item:
                hypothesis = item['hypothesis']
            elif model:
                # Load audio and transcribe
                import librosa
                import numpy as np
                try:
                    # Fix path if relative
                    if not Path(audio_path).exists() and not Path(audio_path).is_absolute():
                         # Try relative to project root
                         audio_path = str(Path(__file__).parent.parent.parent / audio_path)
                    
                    audio, _ = librosa.load(audio_path, sr=16000)
                    hypothesis = model.transcribe(audio)
                except Exception as e:
                    print(f"Error transcribing {audio_path}: {e}")
                    continue
            
            # Normalize
            ref_norm = reference.lower().strip()
            hyp_norm = hypothesis.lower().strip()
            
            # Calculate metrics
            curr_wer = wer(ref_norm, hyp_norm)
            curr_cer = cer(ref_norm, hyp_norm)
            curr_tar = self.term_accuracy_rate(ref_norm, hyp_norm)
            
            total_wer += curr_wer
            total_cer += curr_cer
            total_tar += curr_tar
            count += 1
            
            print(f"{ref_norm[:48]:<50} | {hyp_norm[:48]:<50} | {curr_wer:.2f} | {curr_tar:.2f}")

        if count == 0:
            return {}

        avg_wer = total_wer / count
        avg_cer = total_cer / count
        avg_tar = total_tar / count
        
        return {
            "wer": avg_wer,
            "cer": avg_cer,
            "tar": avg_tar,
            "samples": count
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lexicon", default="data/asr/urdu/lexicon.csv")
    parser.add_argument("--manifest", default="data/asr/urdu/train_manifest.json")
    parser.add_argument("--model_id", default=None, help="HuggingFace model ID to use for inference")
    parser.add_argument("--device", default="cpu")
    
    args = parser.parse_args()
    
    # Filter manifest for 'manual_' files only (Validation set)
    with open(args.manifest, 'r', encoding='utf-8') as f:
        all_data = json.load(f)
        
    validation_set = [d for d in all_data if "manual_" in d.get("audio_path", "")]
    
    if not validation_set:
        print("No manual recordings found in manifest. Using full dataset (first 20)...")
        validation_set = all_data[:20]
        
    print(f"Evaluating on {len(validation_set)} samples.")
    
    model = None
    if args.model_id:
        print(f"Loading model {args.model_id}...")
        model = Ear_hf(model_id=args.model_id, device=args.device)
        
    evaluator = DomainEvaluator(args.lexicon)
    results = evaluator.evaluate(validation_set, model)
    
    print("\nSummary Results:")
    print(json.dumps(results, indent=2))
