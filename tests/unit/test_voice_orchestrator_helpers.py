"""
Unit tests for voice orchestrator helper functions.

Tests sentence extraction/buffering used in the streaming pipeline.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from app.api.endpoints.voice_orchestrator import extract_sentences


class TestExtractSentences:
    """Sentence extraction from streaming token buffer."""

    def test_single_english_sentence(self):
        sentences, remainder = extract_sentences("Hello world.")
        assert sentences == ["Hello world."]
        assert remainder == ""

    def test_multiple_english_sentences(self):
        sentences, remainder = extract_sentences("First sentence. Second sentence.")
        assert len(sentences) == 2
        assert sentences[0] == "First sentence."
        assert sentences[1] == "Second sentence."

    def test_urdu_full_stop(self):
        sentences, remainder = extract_sentences("یہ ایک جملہ ہے۔")
        assert len(sentences) == 1
        assert "۔" in sentences[0]

    def test_incomplete_sentence_remains(self):
        sentences, remainder = extract_sentences("Complete sentence. Incomplete")
        assert sentences == ["Complete sentence."]
        assert remainder.strip() == "Incomplete"

    def test_question_mark_splits(self):
        sentences, remainder = extract_sentences("How are you? I am fine.")
        assert len(sentences) == 2

    def test_exclamation_splits(self):
        sentences, remainder = extract_sentences("Hello! Welcome here.")
        assert len(sentences) == 2

    def test_urdu_question_mark(self):
        sentences, remainder = extract_sentences("آپ کیسے ہیں؟ میں ٹھیک ہوں۔")
        assert len(sentences) == 2

    def test_empty_string(self):
        sentences, remainder = extract_sentences("")
        assert sentences == []
        assert remainder == ""

    def test_no_sentence_enders(self):
        sentences, remainder = extract_sentences("just some tokens")
        assert sentences == []
        assert remainder == "just some tokens"

    def test_trivially_small_fragments_skipped(self):
        """Fragments with <= 3 chars are dropped."""
        sentences, remainder = extract_sentences("Hi. This is real.")
        # "Hi." is only 3 chars, should be skipped
        assert "Hi." not in sentences
        assert "This is real." in sentences

    def test_newline_splits(self):
        sentences, remainder = extract_sentences("Line one\nLine two\n")
        assert len(sentences) == 2

    def test_colon_splits(self):
        sentences, remainder = extract_sentences("Title: The content goes here.")
        # "Title:" is 6 chars, should be kept
        assert len(sentences) >= 1

    def test_mixed_urdu_english(self):
        text = "Hello how are you. Mujhe ghar chahiye DHA mein۔"
        sentences, remainder = extract_sentences(text)
        assert len(sentences) == 2

    def test_streaming_simulation(self):
        """Simulate tokens arriving one at a time."""
        buffer = ""
        all_sentences = []

        tokens = ["Hel", "lo ", "wor", "ld.", " Ho", "w a", "re ", "you", "?"]
        for token in tokens:
            buffer += token
            sentences, buffer = extract_sentences(buffer)
            all_sentences.extend(sentences)

        assert len(all_sentences) == 2
        assert all_sentences[0] == "Hello world."
        assert "How are you?" in all_sentences[1]
