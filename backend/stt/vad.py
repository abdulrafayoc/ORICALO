import onnxruntime
import numpy as np
import os
import requests
try:
    from .logger_config import configure_logger
except ImportError:
    import logging
    def configure_logger(name):
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger(name)

logger = configure_logger(__name__)

class OptimizedVAD:
    def __init__(self, threshold=0.5, sample_rate=16000):
        self.threshold = threshold
        self.sample_rate = sample_rate
        
        # Download and load ONNX model
        model_path = self._download_model()
        
        opts = onnxruntime.SessionOptions()
        opts.inter_op_num_threads = 1
        opts.intra_op_num_threads = 1
        # Set log severity to error/fatal (3) to suppress warnings
        opts.log_severity_level = 3
        
        try:
            self.session = onnxruntime.InferenceSession(
                model_path, 
                providers=['CPUExecutionProvider'], 
                sess_options=opts
            )
        except Exception as e:
            logger.error(f"Failed to load ONNX model: {e}")
            raise

        # Stateful hidden states for continuous streaming
        self.reset_states()
        
    def _download_model(self, model_url="https://huggingface.co/onnx-community/silero-vad/resolve/main/onnx/model.onnx"):
        save_path = os.path.expanduser('~/.cache/oricalo/')
        model_filename = os.path.join(save_path, "silero_vad.onnx")

        if os.path.exists(model_filename):
            logger.info(f'VAD Model found at {model_filename}')
            return model_filename
            
        os.makedirs(save_path, exist_ok=True)
        logger.info("Downloading VAD model...")
        try:
            response = requests.get(model_url)
            if response.status_code == 200:
                with open(model_filename, 'wb') as file:
                    file.write(response.content)
                logger.info(f'Model downloaded to {model_filename}')
                return model_filename
            else:
                logger.error(f'Failed to download the model. Status code: {response.status_code}')
                raise Exception("Download failed")
        except Exception as e:
            logger.error(f"Failed to download the model. {e}")
            raise

    def reset_states(self):
        # Silero VAD v5 takes 'state' of shape (2, batch, 128)
        self._state = np.zeros((2, 1, 128), dtype='float32')
        self._context = np.zeros((0), dtype='float32') # Not used in ONNX but good to track if needed
    
    def __call__(self, audio_chunk: np.ndarray) -> float:
        """
        Returns speech probability (0-1).
        State is maintained. 
        Processes audio in 512-sample windows to satisfy model constraints.
        """
        # Ensure float32
        if audio_chunk.dtype != np.float32:
             audio_chunk = audio_chunk.astype(np.float32)
        
        # Flatten to 1D for easier slicing
        flat_audio = audio_chunk.flatten()
        
        # Process in chunks of 512
        window_size = 512
        max_prob = 0.0
        
        # Handle empty input
        if len(flat_audio) == 0:
            return 0.0
            
        # Pad if needed to be at least window_size? 
        # Or just process partials? Silero usually likes 512.
        # If less than 512, pad with zeros.
        if len(flat_audio) < window_size:
            pad_width = window_size - len(flat_audio)
            flat_audio = np.pad(flat_audio, (0, pad_width), 'constant')
            
        num_windows = int(np.ceil(len(flat_audio) / window_size))
        
        for i in range(num_windows):
            start = i * window_size
            end = start + window_size
            
            # Slice and pad if last chunk is small
            window = flat_audio[start:end]
            if len(window) < window_size:
                pad_width = window_size - len(window)
                window = np.pad(window, (0, pad_width), 'constant')
                
            # Prepare input (1, 512)
            input_tensor = window[np.newaxis, :]
            
            ort_inputs = {
                'input': input_tensor,
                'state': self._state,
                'sr': np.array(self.sample_rate, dtype='int64')
            }
            
            if np.random.random() < 0.001: 
                logger.info(f"VAD Step {i} - input: {input_tensor.shape}")

            try:
                out, new_state = self.session.run(None, ort_inputs)
                self._state = new_state
                prob = float(out[0, 0])
                if prob > max_prob:
                    max_prob = prob
            except Exception as e:
                logger.error(f"VAD chunk error: {e}")
                return 0.0
                
        return max_prob
    
    def is_speech(self, audio_chunk: np.ndarray) -> bool:
        return self(audio_chunk) > self.threshold

if __name__ == "__main__":
    # Test script
    print("Initializing OptimizedVAD...")
    vad = OptimizedVAD()
    
    # Generate 1 second of silence
    silence = np.zeros(512, dtype=np.float32) # Silero typically works on 512 sample chunks at 16k
    prob = vad(silence)
    print(f"Silence probability: {prob:.4f}")
    
    # Generate synthetic "noise" (random) - might trigger VAD or not, but tests shape
    noise = np.random.uniform(-0.1, 0.1, 512).astype(np.float32)
    prob_noise = vad(noise)
    print(f"Noise probability: {prob_noise:.4f}")
    
    print("VAD Test Complete.")
