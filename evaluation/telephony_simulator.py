#!/usr/bin/env python3
"""
Telephony Audio Simulator

Simulates telephony conditions for testing ASR on narrowband audio:
- Downsampling to 8 kHz
- μ-law and A-law encoding/decoding
- Background noise injection
- Frequency filtering (300-3400 Hz passband)

Usage:
    python telephony_simulator.py --input audio.wav --output audio_8k.wav
"""

import argparse
import numpy as np
from pathlib import Path
from typing import Optional
import scipy.signal as signal
from scipy.io import wavfile
import librosa


class TelephonySimulator:
    """Simulate telephony conditions on audio."""
    
    # Telephony characteristics
    TELEPHONY_SR = 8000  # 8 kHz narrowband
    LOWCUT = 300  # Hz
    HIGHCUT = 3400  # Hz
    
    def __init__(self, target_sr: int = 8000):
        """Initialize telephony simulator.
        
        Args:
            target_sr: Target sampling rate (default: 8000 Hz)
        """
        self.target_sr = target_sr
        
    def downsample(self, audio: np.ndarray, orig_sr: int) -> np.ndarray:
        """Downsample audio to telephony rate.
        
        Args:
            audio: Input audio
            orig_sr: Original sampling rate
            
        Returns:
            Downsampled audio
        """
        if orig_sr == self.target_sr:
            return audio
            
        return librosa.resample(
            audio,
            orig_sr=orig_sr,
            target_sr=self.target_sr
        )
    
    def bandpass_filter(self, audio: np.ndarray) -> np.ndarray:
        """Apply telephony bandpass filter (300-3400 Hz).
        
        Args:
            audio: Input audio at telephony sampling rate
            
        Returns:
            Filtered audio
        """
        nyquist = self.target_sr / 2
        low = self.LOWCUT / nyquist
        high = self.HIGHCUT / nyquist
        
        # Design Butterworth bandpass filter
        sos = signal.butter(
            N=4,
            Wn=[low, high],
            btype='band',
            output='sos'
        )
        
        # Apply filter
        filtered = signal.sosfilt(sos, audio)
        return filtered.astype(np.float32)
    
    def add_noise(
        self,
        audio: np.ndarray,
        snr_db: float = 20.0
    ) -> np.ndarray:
        """Add background noise to audio.
        
        Args:
            audio: Input audio
            snr_db: Signal-to-noise ratio in dB
            
        Returns:
            Noisy audio
        """
        # Calculate signal power
        signal_power = np.mean(audio ** 2)
        
        # Calculate noise power for desired SNR
        noise_power = signal_power / (10 ** (snr_db / 10))
        
        # Generate white noise
        noise = np.random.normal(0, np.sqrt(noise_power), audio.shape)
        
        # Add noise to signal
        noisy = audio + noise
        
        # Normalize to prevent clipping
        max_val = np.max(np.abs(noisy))
        if max_val > 1.0:
            noisy = noisy / max_val
        
        return noisy.astype(np.float32)
    
    def mu_law_encode(self, audio: np.ndarray, mu: int = 255) -> np.ndarray:
        """Apply μ-law encoding (used in North America).
        
        Args:
            audio: Input audio (normalized to [-1, 1])
            mu: μ-law parameter (default: 255)
            
        Returns:
            μ-law encoded audio
        """
        # Ensure audio is in [-1, 1]
        audio = np.clip(audio, -1.0, 1.0)
        
        # Apply μ-law compression
        sign = np.sign(audio)
        magnitude = np.abs(audio)
        
        encoded = sign * np.log1p(mu * magnitude) / np.log1p(mu)
        
        return encoded.astype(np.float32)
    
    def mu_law_decode(self, encoded: np.ndarray, mu: int = 255) -> np.ndarray:
        """Decode μ-law encoded audio.
        
        Args:
            encoded: μ-law encoded audio
            mu: μ-law parameter
            
        Returns:
            Decoded audio
        """
        sign = np.sign(encoded)
        magnitude = np.abs(encoded)
        
        decoded = sign * (1.0 / mu) * ((1 + mu) ** magnitude - 1)
        
        return decoded.astype(np.float32)
    
    def simulate(
        self,
        audio: np.ndarray,
        orig_sr: int,
        apply_filter: bool = True,
        apply_codec: bool = True,
        add_noise_snr: Optional[float] = None
    ) -> np.ndarray:
        """Apply full telephony simulation.
        
        Args:
            audio: Input audio
            orig_sr: Original sampling rate
            apply_filter: Apply bandpass filter
            apply_codec: Apply μ-law codec
            add_noise_snr: SNR for noise (None = no noise)
            
        Returns:
            Telephony-simulated audio
        """
        # 1. Downsample to 8 kHz
        audio = self.downsample(audio, orig_sr)
        
        # 2. Apply bandpass filter (300-3400 Hz)
        if apply_filter:
            audio = self.bandpass_filter(audio)
        
        # 3. Apply μ-law codec
        if apply_codec:
            audio = self.mu_law_encode(audio)
            audio = self.mu_law_decode(audio)
        
        # 4. Add background noise
        if add_noise_snr is not None:
            audio = self.add_noise(audio, add_noise_snr)
        
        return audio


def main():
    """Main function for telephony simulation."""
    parser = argparse.ArgumentParser(
        description="Simulate telephony conditions on audio files"
    )
    
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Input audio file"
    )
    
    parser.add_argument(
        "--output",
        type=str,
        required=True,
        help="Output audio file"
    )
    
    parser.add_argument(
        "--target-sr",
        type=int,
        default=8000,
        help="Target sampling rate (default: 8000 Hz)"
    )
    
    parser.add_argument(
        "--no-filter",
        action="store_true",
        help="Skip bandpass filtering"
    )
    
    parser.add_argument(
        "--no-codec",
        action="store_true",
        help="Skip codec simulation"
    )
    
    parser.add_argument(
        "--add-noise",
        type=float,
        default=None,
        help="Add noise with specified SNR in dB (e.g., 20)"
    )
    
    args = parser.parse_args()
    
    # Load audio
    print(f"📂 Loading: {args.input}")
    audio, sr = librosa.load(args.input, sr=None, mono=True)
    print(f"   Original SR: {sr} Hz, Duration: {len(audio)/sr:.2f}s")
    
    # Simulate telephony
    print(f"🔧 Simulating telephony conditions...")
    simulator = TelephonySimulator(target_sr=args.target_sr)
    
    telephony_audio = simulator.simulate(
        audio,
        sr,
        apply_filter=not args.no_filter,
        apply_codec=not args.no_codec,
        add_noise_snr=args.add_noise
    )
    
    # Save output
    print(f"💾 Saving: {args.output}")
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Convert to int16 for WAV file
    telephony_audio_int16 = (telephony_audio * 32767).astype(np.int16)
    wavfile.write(str(output_path), args.target_sr, telephony_audio_int16)
    
    print(f"✅ Done! Telephony-simulated audio saved.")
    print(f"   Target SR: {args.target_sr} Hz")
    print(f"   Filter: {'Yes' if not args.no_filter else 'No'}")
    print(f"   Codec: {'Yes' if not args.no_codec else 'No'}")
    print(f"   Noise: {args.add_noise if args.add_noise else 'No'} dB SNR")


if __name__ == "__main__":
    main()
