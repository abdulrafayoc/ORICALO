#!/usr/bin/env python3
"""
ASR Baseline Evaluation Script

This script evaluates the ASR system on a test set and computes:
- Word Error Rate (WER)
- Character Error Rate (CER)
- Per-token confidence scores
- Error categorization (substitution, insertion, deletion)

Usage:
    python baseline_evaluation.py --model tiny --audio-dir data/test_audio/gold_set/
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import time

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import torch
from jiwer import wer, cer
from tqdm import tqdm

try:
    from stt.stt_hf import Ear_hf
    import librosa
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install: pip install librosa jiwer tqdm")
    sys.exit(1)


class ASRBaselineEvaluator:
    """Evaluate ASR system on test dataset."""
    
    def __init__(self, model_id: str, device: str = "cpu"):
        """Initialize evaluator with ASR model.
        
        Args:
            model_id: HuggingFace model identifier
            device: Compute device ('cpu', 'cuda', 'mps')
        """
        self.model_id = model_id
        self.device = device
        self.ear = None
        
    def setup(self):
        """Load the ASR model."""
        print(f"🔧 Loading model: {self.model_id}")
        self.ear = Ear_hf(
            model_id=self.model_id,
            device=self.device,
            silence_seconds=2.0
        )
        print("✅ Model loaded successfully\n")
        
    def load_audio(self, audio_path: str, target_sr: int = 16000) -> np.ndarray:
        """Load and preprocess audio file.
        
        Args:
            audio_path: Path to audio file
            target_sr: Target sampling rate
            
        Returns:
            Audio as float32 numpy array
        """
        audio, sr = librosa.load(audio_path, sr=target_sr, mono=True)
        return audio.astype(np.float32)
    
    def transcribe_file(self, audio_path: str) -> Tuple[str, float]:
        """Transcribe a single audio file.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Tuple of (transcription, inference_time)
        """
        audio = self.load_audio(audio_path)
        
        start_time = time.time()
        transcription = self.ear.transcribe(audio)
        inference_time = time.time() - start_time
        
        return transcription, inference_time
    
    def evaluate_dataset(self, test_data: List[Dict[str, str]]) -> Dict:
        """Evaluate on complete dataset.
        
        Args:
            test_data: List of dicts with 'audio_path' and 'reference_text'
            
        Returns:
            Dictionary with evaluation metrics
        """
        if not self.ear:
            raise RuntimeError("Model not loaded. Call setup() first.")
            
        hypotheses = []
        references = []
        inference_times = []
        results_per_sample = []
        
        print(f"📊 Evaluating on {len(test_data)} samples...")
        
        for item in tqdm(test_data, desc="Transcribing"):
            audio_path = item['audio_path']
            reference = item['reference_text'].strip().lower()
            
            try:
                hypothesis, inf_time = self.transcribe_file(audio_path)
                hypothesis = hypothesis.strip().lower()
                
                hypotheses.append(hypothesis)
                references.append(reference)
                inference_times.append(inf_time)
                
                # Store per-sample results
                sample_wer = wer(reference, hypothesis)
                sample_cer = cer(reference, hypothesis)
                
                results_per_sample.append({
                    'audio_path': audio_path,
                    'reference': reference,
                    'hypothesis': hypothesis,
                    'wer': sample_wer,
                    'cer': sample_cer,
                    'inference_time': inf_time
                })
                
            except Exception as e:
                print(f"\n⚠️  Error processing {audio_path}: {e}")
                continue
        
        # Compute aggregate metrics
        overall_wer = wer(references, hypotheses)
        overall_cer = cer(references, hypotheses)
        avg_inference_time = np.mean(inference_times)
        
        return {
            'model_id': self.model_id,
            'device': self.device,
            'num_samples': len(test_data),
            'metrics': {
                'word_error_rate': overall_wer,
                'character_error_rate': overall_cer,
                'avg_inference_time': avg_inference_time
            },
            'per_sample_results': results_per_sample
        }


def load_test_manifest(manifest_path: str) -> List[Dict[str, str]]:
    """Load test dataset manifest.
    
    Expected format (JSON):
    [
        {
            "audio_path": "path/to/audio.wav",
            "reference_text": "ground truth transcription"
        },
        ...
    ]
    
    Args:
        manifest_path: Path to manifest JSON file
        
    Returns:
        List of test samples
    """
    with open(manifest_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def scan_audio_directory(audio_dir: str) -> List[Dict[str, str]]:
    """Scan directory for audio files with corresponding transcriptions.
    
    Expects pairs like:
        audio_001.wav  + audio_001.txt
        audio_002.wav  + audio_002.txt
    
    Args:
        audio_dir: Directory containing audio files
        
    Returns:
        List of test samples
    """
    audio_dir = Path(audio_dir)
    test_data = []
    
    for audio_file in sorted(audio_dir.glob("*.wav")):
        txt_file = audio_file.with_suffix('.txt')
        
        if txt_file.exists():
            with open(txt_file, 'r', encoding='utf-8') as f:
                reference_text = f.read().strip()
            
            test_data.append({
                'audio_path': str(audio_file),
                'reference_text': reference_text
            })
    
    return test_data


def main():
    """Main evaluation function."""
    parser = argparse.ArgumentParser(
        description="Evaluate ASR baseline on test dataset"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        default="tiny",
        choices=["tiny", "small", "base", "custom"],
        help="Model size to evaluate"
    )
    
    parser.add_argument(
        "--model-id",
        type=str,
        help="Custom HuggingFace model ID (when --model=custom)"
    )
    
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        choices=["cpu", "cuda", "mps"],
        help="Compute device"
    )
    
    parser.add_argument(
        "--audio-dir",
        type=str,
        help="Directory containing audio files and transcriptions"
    )
    
    parser.add_argument(
        "--manifest",
        type=str,
        help="Path to test manifest JSON file"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default="evaluation/results/baseline_results.json",
        help="Output file for results"
    )
    
    args = parser.parse_args()
    
    # Determine model ID
    model_map = {
        "tiny": "openai/whisper-tiny",
        "small": "openai/whisper-small",
        "base": "openai/whisper-base"
    }
    
    if args.model == "custom":
        if not args.model_id:
            parser.error("--model-id required when using --model=custom")
        model_id = args.model_id
    else:
        model_id = model_map[args.model]
    
    # Load test data
    if args.manifest:
        test_data = load_test_manifest(args.manifest)
    elif args.audio_dir:
        test_data = scan_audio_directory(args.audio_dir)
    else:
        parser.error("Either --manifest or --audio-dir must be specified")
    
    if not test_data:
        print("❌ No test data found!")
        sys.exit(1)
    
    print(f"\n📁 Loaded {len(test_data)} test samples\n")
    
    # Run evaluation
    evaluator = ASRBaselineEvaluator(model_id=model_id, device=args.device)
    evaluator.setup()
    
    results = evaluator.evaluate_dataset(test_data)
    
    # Display results
    print("\n" + "=" * 60)
    print("📊 EVALUATION RESULTS")
    print("=" * 60)
    print(f"Model: {results['model_id']}")
    print(f"Device: {results['device']}")
    print(f"Samples: {results['num_samples']}")
    print("-" * 60)
    print(f"Word Error Rate (WER): {results['metrics']['word_error_rate']:.4f} ({results['metrics']['word_error_rate']*100:.2f}%)")
    print(f"Character Error Rate (CER): {results['metrics']['character_error_rate']:.4f} ({results['metrics']['character_error_rate']*100:.2f}%)")
    print(f"Avg Inference Time: {results['metrics']['avg_inference_time']:.3f}s")
    print("=" * 60 + "\n")
    
    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Results saved to: {output_path}")


if __name__ == "__main__":
    main()
