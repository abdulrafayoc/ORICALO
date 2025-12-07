
import os
import argparse
from pathlib import Path
from optimum.onnxruntime import ORTModelForSpeechSeq2Seq
from transformers import AutoProcessor

def export_and_quantize(model_id, output_dir, quantize=True):
    print(f"Loading and exporting model: {model_id}...")
    
    # 1. Export to ONNX
    # ORTModelForSpeechSeq2Seq automatically handles the export to ONNX
    model = ORTModelForSpeechSeq2Seq.from_pretrained(
        model_id,
        export=True,
    )
    
    processor = AutoProcessor.from_pretrained(model_id)
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Saving ONNX model to {output_path}...")
    model.save_pretrained(output_path)
    processor.save_pretrained(output_path)
    
    if quantize:
        print("Applying dynamic quantization...")
        from optimum.onnxruntime.configuration import AutoQuantizationConfig
        from optimum.onnxruntime import ORTQuantizer
        
        # Define quantization config (ARM64 usually good for general CPU too, or use avx2)
        # For general CPU compatibility (x86_64/ARM), we use default dynamic quantization
        qconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=True)
        
        quantizer = ORTQuantizer.from_pretrained(output_path)
        
        # Quantize the encoder and decoder
        # Note: Whisper has multiple ONNX files (encoder, decoder, decoder_with_past)
        
        quantizer.quantize(
            save_dir=output_path,
            quantization_config=qconfig,
        )
        print("Quantization complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_id", type=str, default="openai/whisper-tiny")
    parser.add_argument("--output_dir", type=str, default="models/whisper-tiny-urdu-onnx")
    parser.add_argument("--no-quantize", action="store_true", help="Skip quantization")
    
    args = parser.parse_args()
    
    export_and_quantize(args.model_id, args.output_dir, not args.no_quantize)
