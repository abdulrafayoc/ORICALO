#!/usr/bin/env python3
"""
Setup script for Iteration 1: Urdu ASR/STT System

Install the package in development mode:
    pip install -e .

Or install directly:
    pip install .
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_file = Path(__file__).parent / "README.md"
long_description = readme_file.read_text(encoding="utf-8") if readme_file.exists() else ""

# Read requirements
requirements_file = Path(__file__).parent / "requirements.txt"
requirements = []
if requirements_file.exists():
    with open(requirements_file, 'r', encoding='utf-8') as f:
        requirements = [
            line.strip() 
            for line in f 
            if line.strip() and not line.startswith('#')
        ]

setup(
    name="ORICALO - Real Estate Voice Agent",
    version="1.0.0",
    description="ORICALO: Urdu Realtime System for Real Estate Voice AI",
    long_description=long_description,
    long_description_content_type="text/markdown",
    
    author="FYP Team - FAST NUCES",
    author_email="your-email@example.com",
    
    url="https://github.com/abdulrafayoc/oricalo",
    
    packages=find_packages(include=['stt', 'stt.*']),
    
    install_requires=requirements,
    
    python_requires=">=3.8",
    
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Multimedia :: Sound/Audio :: Speech",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    
    keywords=[
        "speech-to-text",
        "urdu",
        "asr",
        "whisper",
        "voice-recognition",
        "real-estate",
        "pakistan"
    ],
    
    entry_points={
        'console_scripts': [
            'urdu-stt-demo=demos.quick_demo:main',
            'urdu-stt-eval=evaluation.baseline_evaluation:main',
        ],
    },
    
    include_package_data=True,
    
    package_data={
        'stt': ['*.py'],
    },
    
    zip_safe=False,
)
