import os
import json
import sys
from pathlib import Path
from typing import List, Dict, Any, Union
from dataclasses import dataclass

import torch
import numpy as np
import evaluate
from datasets import Dataset, DatasetDict, Audio
from transformers import (
    WhisperForConditionalGeneration,
    WhisperProcessor,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer
)

# 1. Configuration
# Adjust these paths to match your local setup
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = (SCRIPT_DIR / ".." / "..").resolve()
DATA_DIR = PROJECT_ROOT / "data" / "asr" / "urdu"
MODELS_DIR = PROJECT_ROOT / "models"

TRAIN_MANIFEST = DATA_DIR / "train_manifest.json"
# Use train manifest as eval if eval doesn't exist, or split it
EVAL_MANIFEST = DATA_DIR / "eval_manifest.json" 

# Base Whisper checkpoint
BASE_MODEL_ID = "openai/whisper-tiny"
LANGUAGE = "Urdu"
TASK = "transcribe"

# Output directory
OUTPUT_DIR = MODELS_DIR / "whisper-tiny-urdu-finetuned"

# Hyperparameters
BATCH_SIZE = 4 # Reduced for safety, increase if GPU allows
GRADIENT_ACCUMULATION_STEPS = 2
NUM_TRAIN_EPOCHS = 3
LEARNING_RATE = 1e-5
WARMUP_STEPS = 50
LOGGING_STEPS = 10
EVAL_STEPS = 100
SAVE_STEPS = 100
MAX_DURATION_SECONDS = 30.0

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {DEVICE}")

# 2. Data Loading
def load_manifest_to_dataset(manifest_path: Path) -> Dataset:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        records = json.load(f)
        
    # Normalize
    for rec in records:
        if "text" not in rec and "sentence" in rec:
            rec["text"] = rec["sentence"]
        if "audio" not in rec:
            rec["audio"] = str(rec.get("audio_path"))

    ds = Dataset.from_list(records)
    ds = ds.cast_column("audio", Audio(sampling_rate=16000))
    return ds

def main():
    print("Loading datasets...")
    if not TRAIN_MANIFEST.exists():
        print(f"Train manifest not found at {TRAIN_MANIFEST}")
        return

    full_dataset = load_manifest_to_dataset(TRAIN_MANIFEST)
    
    # Split train/eval if eval manifest doesn't exist
    if not EVAL_MANIFEST.exists():
        print("Eval manifest not found, splitting train dataset...")
        split = full_dataset.train_test_split(test_size=0.1)
        train_dataset = split["train"]
        eval_dataset = split["test"]
    else:
        train_dataset = full_dataset
        eval_dataset = load_manifest_to_dataset(EVAL_MANIFEST)

    print(f"Train size: {len(train_dataset)}")
    print(f"Eval size: {len(eval_dataset)}")

    # 3. Model & Processor
    print(f"Loading model: {BASE_MODEL_ID}")
    processor = WhisperProcessor.from_pretrained(BASE_MODEL_ID, language=LANGUAGE, task=TASK)
    model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL_ID)
    
    model.config.use_cache = False
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []
    model.to(DEVICE)

    # 4. Preprocessing
    def prepare_dataset(batch):
        audio = batch["audio"]
        batch["input_features"] = processor.feature_extractor(
            audio["array"], sampling_rate=audio["sampling_rate"]
        ).input_features[0]
        
        batch["labels"] = processor.tokenizer(batch["text"]).input_ids
        return batch

    print("Preprocessing datasets...")
    train_dataset = train_dataset.map(prepare_dataset, remove_columns=train_dataset.column_names)
    eval_dataset = eval_dataset.map(prepare_dataset, remove_columns=eval_dataset.column_names)

    # 5. Data Collator
    @dataclass
    class DataCollatorSpeechSeq2SeqWithPadding:
        processor: Any
        def __call__(self, features):
            input_features = [{"input_features": f["input_features"]} for f in features]
            batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")
            
            label_features = [{"input_ids": f["labels"]} for f in features]
            labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")
            
            labels = labels_batch["input_ids"].masked_fill(labels_batch["attention_mask"].ne(1), -100)
            batch["labels"] = labels
            return batch

    data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)

    # 6. Metrics
    wer_metric = evaluate.load("wer")
    cer_metric = evaluate.load("cer")

    def compute_metrics(pred):
        pred_ids = pred.predictions
        label_ids = pred.label_ids
        label_ids[label_ids == -100] = processor.tokenizer.pad_token_id
        pred_str = processor.batch_decode(pred_ids, skip_special_tokens=True)
        label_str = processor.batch_decode(label_ids, skip_special_tokens=True)
        wer = wer_metric.compute(predictions=pred_str, references=label_str)
        cer = cer_metric.compute(predictions=pred_str, references=label_str)
        return {"wer": wer, "cer": cer}

    # 7. Training
    training_args = Seq2SeqTrainingArguments(
        output_dir=str(OUTPUT_DIR),
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        warmup_steps=WARMUP_STEPS,
        num_train_epochs=NUM_TRAIN_EPOCHS,
        evaluation_strategy="steps",
        eval_steps=EVAL_STEPS,
        save_steps=SAVE_STEPS,
        logging_steps=LOGGING_STEPS,
        fp16=torch.cuda.is_available(),
        predict_with_generate=True,
        generation_max_length=225,
        report_to=["tensorboard"],
    )

    trainer = Seq2SeqTrainer(
        args=training_args,
        model=model,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
        tokenizer=processor.feature_extractor,
    )

    print("Starting training...")
    trainer.train()
    
    print("Saving model...")
    trainer.save_model(str(OUTPUT_DIR))
    processor.save_pretrained(str(OUTPUT_DIR))
    print(f"Model saved to {OUTPUT_DIR}")

    # 8. Export to ONNX & Quantize
    try:
        # Import dynamically or assume it's in the same directory/path
        import sys
        sys.path.append(str(SCRIPT_DIR))
        from export_onnx import export_and_quantize
        
        print("Starting ONNX export and quantization...")
        onnx_output_dir = MODELS_DIR / "whisper-tiny-urdu-onnx"
        export_and_quantize(
            model_id=str(OUTPUT_DIR),
            output_dir=str(onnx_output_dir),
            quantize=True
        )
        print(f"ONNX model saved to {onnx_output_dir}")
    except Exception as e:
        print(f"Failed to export ONNX: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
