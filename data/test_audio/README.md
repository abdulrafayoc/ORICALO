# Test Audio Dataset
## Gold Standard Test Set for ASR Evaluation

This directory contains high-quality test audio recordings with ground truth transcriptions for evaluating the Urdu ASR system.

---

## 📁 Directory Structure

```
test_audio/
├── README.md                    # This file
├── gold_set/                    # Main test set
│   ├── audio_001.wav           # Audio recordings
│   ├── audio_001.txt           # Ground truth transcriptions
│   ├── audio_002.wav
│   ├── audio_002.txt
│   ├── ...
│   └── metadata.json           # Recording metadata
│
├── telephony_8k/               # 8kHz telephony-simulated versions
│   ├── audio_001_8k.wav
│   ├── audio_002_8k.wav
│   └── ...
│
└── recording_prompts.txt       # Suggested prompts for recording
```

---

## 🎯 Test Set Requirements

### Target Specifications

- **Count:** 20-30 recordings minimum (target: 50)
- **Duration:** 5-15 seconds per recording
- **Quality:** 16kHz, mono, WAV format
- **Speakers:** Multiple native Urdu speakers
- **Content:** Real estate domain conversations

### Recording Guidelines

1. **Environment:**
   - Quiet room with minimal background noise
   - Close microphone placement (15-30 cm)
   - Consistent recording conditions

2. **Speaker Requirements:**
   - Native Urdu speakers
   - Mix of male and female voices
   - Variety of ages and accents
   - Clear pronunciation

3. **Content Coverage:**
   - Property inquiries (30%)
   - Price negotiations (20%)
   - Feature descriptions (20%)
   - Location queries (15%)
   - General transactions (15%)

4. **Language Characteristics:**
   - Pure Urdu (40%)
   - Roman Urdu (20%)
   - Code-switching Urdu-English (30%)
   - Mixed usage (10%)

---

## 🎙️ Recording Instructions

### Using the Recording Script

```bash
# Record 30 samples
python scripts/record_gold_set.py --count 30 --output data/test_audio/gold_set/

# With predefined prompts
python scripts/record_gold_set.py \
    --count 30 \
    --prompts-file data/test_audio/recording_prompts.txt \
    --output data/test_audio/gold_set/
```

### Manual Recording

1. **Prepare:**
   - Choose prompt from `recording_prompts.txt`
   - Practice pronunciation
   - Ensure microphone works

2. **Record:**
   - Speak naturally at normal pace
   - Maintain consistent volume
   - Avoid long pauses

3. **Save:**
   - Audio: `audio_XXX.wav` (16kHz, mono, WAV)
   - Text: `audio_XXX.txt` (UTF-8, exact transcription)

4. **Verify:**
   - Listen to recording
   - Check transcription accuracy
   - Re-record if quality is poor

---

## 📝 Transcription Guidelines

### Format

Each `.txt` file should contain:
- Exact transcription of what was said
- Lowercase (except proper nouns)
- No punctuation (except necessary for meaning)
- UTF-8 encoding

**Example:**
```
lahore mein bahria town phase 8 mein 10 marla plot ki qeemat kya hai
```

### Handling Special Cases

**Numbers:**
```
Written form: پچاس لاکھ
Transcription: pachas lakh  (not 50 lakh)
```

**Code-switching:**
```
Spoken: "property available hai Gulberg mein"
Transcription: property available hai gulberg mein
```

**Roman Urdu:**
```
Spoken in Roman: "mujhe ek ghar chahiye"
Transcription: mujhe ek ghar chahiye
```

---

## 🔄 Telephony Simulation

### Creating 8kHz Versions

```bash
# Convert all recordings to 8kHz
python evaluation/telephony_simulator.py \
    --input data/test_audio/gold_set/audio_001.wav \
    --output data/test_audio/telephony_8k/audio_001_8k.wav \
    --target-sr 8000 \
    --add-noise 20
```

### Bulk Conversion

```bash
# Convert entire directory
for file in data/test_audio/gold_set/*.wav; do
    basename=$(basename "$file" .wav)
    python evaluation/telephony_simulator.py \
        --input "$file" \
        --output "data/test_audio/telephony_8k/${basename}_8k.wav" \
        --target-sr 8000
done
```

---

## 📊 Metadata Format

`metadata.json` structure:

```json
{
  "recording_date": "2025-10-30T12:00:00",
  "sample_rate": 16000,
  "format": "WAV",
  "recordings": [
    {
      "id": "audio_001",
      "audio_file": "audio_001.wav",
      "text_file": "audio_001.txt",
      "transcription": "lahore mein plot chahiye",
      "duration": 3.5,
      "speaker": "speaker_1",
      "language": "urdu",
      "code_switching": false,
      "timestamp": "2025-10-30T12:05:00"
    }
  ]
}
```

---

## ✅ Quality Checklist

Before finalizing a recording:

- [ ] Audio is clear and audible
- [ ] No clipping or distortion
- [ ] Minimal background noise
- [ ] Transcription is accurate
- [ ] File naming is correct (audio_XXX.wav/.txt)
- [ ] Metadata is updated
- [ ] Consent form signed (if applicable)

---

## 📈 Coverage Tracking

Track diversity of test set:

| Category | Target | Actual |
|----------|--------|--------|
| Total recordings | 30 | __ |
| Male speakers | 15 | __ |
| Female speakers | 15 | __ |
| Pure Urdu | 12 | __ |
| Roman Urdu | 6 | __ |
| Code-switching | 9 | __ |
| Property queries | 9 | __ |
| Price discussions | 6 | __ |
| Feature descriptions | 6 | __ |

---

## 🔍 Example Recordings

### Sample Transcriptions

**Property Inquiry:**
```
mujhe lahore mein das marla plot chahiye bahria town mein
```

**Price Negotiation:**
```
qeemat kitni hai aur kya kuch kam ho sakti hai
```

**Feature Description:**
```
ghar mein teen kamre do bathroom aur ek lounge hai
```

---

## 🚨 Common Issues & Solutions

### Issue: Low Audio Quality
- **Solution:** Re-record in quieter environment, check microphone

### Issue: Transcription Mismatch
- **Solution:** Listen carefully, update .txt file

### Issue: File Format Error
- **Solution:** Ensure 16kHz, mono, WAV format

---

## 📞 Questions?

Contact the team:
- Abdul Rafay: [email]
- Sumeed Jawad: [email]
- Huzaifa Mahmood: [email]
