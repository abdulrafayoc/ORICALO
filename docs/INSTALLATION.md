# Installation Guide
## Iteration 1: Urdu ASR/STT System

This guide covers detailed installation instructions for all supported platforms.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Windows Installation](#windows-installation)
3. [Linux Installation](#linux-installation)
4. [macOS Installation](#macos-installation)
5. [GPU Support](#gpu-support)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum:**
- Python 3.8 or higher
- 4 GB RAM
- 2 GB free disk space
- Microphone for audio input

**Recommended:**
- Python 3.10+
- 8 GB RAM
- 5 GB free disk space
- GPU with 4+ GB VRAM (for faster inference)

### Required Software

- Python 3.8+
- pip (Python package manager)
- Git (for cloning repository)

---

## Windows Installation

### Step 1: Install Python

1. Download Python from [python.org](https://www.python.org/downloads/)
2. Run installer and **check "Add Python to PATH"**
3. Verify installation:
   ```cmd
   python --version
   pip --version
   ```

### Step 2: Install PyAudio

PyAudio requires special handling on Windows:

```cmd
pip install pipwin
pipwin install pyaudio
```

**Alternative (if pipwin fails):**
1. Download wheel from [here](https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio)
2. Install: `pip install PyAudio‑0.2.11‑cp310‑cp310‑win_amd64.whl`

### Step 3: Clone Repository

```cmd
git clone https://github.com/abdulrafayoc/oricalo.git
cd oricalo
```

### Step 4: Create Virtual Environment

```cmd
python -m venv venv
venv\Scripts\activate
```

### Step 5: Install Dependencies

```cmd
pip install -r requirements.txt
```

### Step 6: Install Package (Optional)

```cmd
pip install -e .
```

---

## Linux Installation

### Step 1: Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip python3-venv
sudo apt-get install portaudio19-dev python3-dev
sudo apt-get install git
```

**Fedora/RHEL:**
```bash
sudo dnf install python3 python3-pip python3-virtualenv
sudo dnf install portaudio-devel python3-devel
sudo dnf install git
```

### Step 2: Clone Repository

```bash
git clone https://github.com/abdulrafayoc/oricalo.git
cd oricalo
```

### Step 3: Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 4: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 5: Install Package (Optional)

```bash
pip install -e .
```

---

## macOS Installation

### Step 1: Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Dependencies

```bash
brew install python@3.10
brew install portaudio
brew install git
```

### Step 3: Clone Repository

```bash
git clone https://github.com/abdulrafayoc/oricalo.git
cd oricalo
```

### Step 4: Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 5: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 6: Install Package (Optional)

```bash
pip install -e .
```

---

## GPU Support

### NVIDIA CUDA (for faster inference)

**Prerequisites:**
- NVIDIA GPU with CUDA support
- CUDA Toolkit 11.8 or 12.x

**Installation:**

1. Install CUDA Toolkit from [NVIDIA website](https://developer.nvidia.com/cuda-downloads)

2. Install PyTorch with CUDA:
   ```bash
   # For CUDA 11.8
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   
   # For CUDA 12.1
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

3. Verify GPU support:
   ```python
   import torch
   print(torch.cuda.is_available())  # Should print True
   print(torch.cuda.get_device_name(0))  # Your GPU name
   ```

### Apple Silicon (M1/M2/M3)

PyTorch has native support for Apple Silicon:

```bash
pip install torch torchvision torchaudio
```

Verify MPS support:
```python
import torch
print(torch.backends.mps.is_available())  # Should print True
```

---

## Verification

### Quick Test

Run the simple test to verify installation:

```bash
cd oricalo
python backend/demos/simple_test.py
```

Expected output:
```
Testing Whisper STT...
✓ Import successful
Using device: cpu
✓ Model loaded successfully
✓ All tests passed! Whisper STT is working.
```

### Full Demo Test

Run the main demo:

```bash
cd oricalo
python backend/demos/quick_demo.py
```

Speak when prompted and verify transcription works.

---

## Troubleshooting

### PyAudio Installation Issues

**Windows:**
```cmd
pip install pipwin
pipwin install pyaudio
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install portaudio19-dev python3-dev
pip install pyaudio
```

**macOS:**
```bash
brew install portaudio
pip install pyaudio
```

### CUDA/GPU Issues

**Check CUDA version:**
```bash
nvcc --version
nvidia-smi
```

**Reinstall PyTorch with correct CUDA version:**
```bash
pip uninstall torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Model Download Issues

Models download automatically on first run. If download fails:

1. Check internet connection
2. Manually download:
   ```python
   from transformers import pipeline
   pipeline('automatic-speech-recognition', model='openai/whisper-tiny')
   ```

3. Models are cached in: `~/.cache/huggingface/hub/`

### Permission Errors

**Linux/macOS:**
```bash
sudo chown -R $USER:$USER ~/.cache/huggingface
```

**Windows:**
Run terminal as Administrator

### Import Errors

Ensure virtual environment is activated:

**Windows:**
```cmd
venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

Reinstall dependencies:
```bash
pip install -r requirements.txt --force-reinstall
```

### Microphone Access Issues

**Windows:**
- Settings → Privacy → Microphone → Allow apps

**macOS:**
- System Preferences → Security & Privacy → Microphone

**Linux:**
```bash
# Check audio devices
arecord -l

# Test microphone
arecord -d 5 test.wav
aplay test.wav
```

### Out of Memory Errors

Use smaller model or CPU:
```bash
python demos/quick_demo.py --model tiny --device cpu
```

---

## Additional Resources

- [PyTorch Installation](https://pytorch.org/get-started/locally/)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers/installation)
- [PyAudio Documentation](https://people.csail.mit.edu/hubert/pyaudio/)

---


**Next Steps:** Once installation is complete, see [README.md](../README.md) for usage examples.
