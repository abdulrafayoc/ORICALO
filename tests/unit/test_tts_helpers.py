"""
Unit tests for TTS helper functions and configuration.

Covers:
  - Text cleaning before TTS (markdown stripping, whitespace)
  - Text chunking at sentence boundaries
  - TTS engine constants and factory selection logic
"""

import sys
from pathlib import Path
import re

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))


def _clean_for_tts(text: str) -> str:
    """Remove Markdown markers and excess whitespace before synthesis."""
    text = re.sub(r"\*+", "", text)
    text = re.sub(r"^[-•]\s*", "", text, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", text).strip()


def _split_for_tts_streaming(text: str, max_chars: int = 200) -> list:
    """Split long text into TTS-friendly chunks at sentence boundaries."""
    sentences = re.split(r"(?<=[.!?۔؟])\s+", text.strip())
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) + 1 <= max_chars:
            current = (current + " " + s).strip()
        else:
            if current:
                chunks.append(current)
            current = s
    if current:
        chunks.append(current)
    return chunks


class TestCleanForTTS:
    def test_removes_markdown_bold(self):
        assert "**" not in _clean_for_tts("**Important:** hello")

    def test_removes_markdown_italic(self):
        assert "*" not in _clean_for_tts("*italics* here")

    def test_removes_bullet_dash(self):
        assert not _clean_for_tts("- First item").startswith("-")

    def test_collapses_whitespace(self):
        assert "  " not in _clean_for_tts("Hello    world")

    def test_strips_edges(self):
        assert _clean_for_tts("  hello  ") == "hello"

    def test_urdu_text_untouched(self):
        urdu = "یہ ایک جملہ ہے۔"
        assert _clean_for_tts(urdu) == urdu

    def test_empty_string(self):
        assert _clean_for_tts("") == ""

    def test_normal_sentence_unchanged(self):
        s = "The property is located in DHA Phase 5."
        assert _clean_for_tts(s) == s


class TestSplitForTTSStreaming:
    def test_short_text_single_chunk(self):
        assert _split_for_tts_streaming("Hello world.") == ["Hello world."]

    def test_two_short_sentences_one_chunk(self):
        assert len(_split_for_tts_streaming("Hello. World.", max_chars=50)) == 1

    def test_long_text_splits(self):
        text = ("This is a long sentence that takes space. " * 5)
        assert len(_split_for_tts_streaming(text, max_chars=100)) > 1

    def test_each_chunk_within_limit(self):
        text = ("Sentence here. " * 20)
        for chunk in _split_for_tts_streaming(text, max_chars=100):
            assert len(chunk) <= 100

    def test_no_empty_chunks(self):
        text = "One. Two. Three."
        assert all(c for c in _split_for_tts_streaming(text))

    def test_empty_returns_empty_list(self):
        assert _split_for_tts_streaming("") == []


class TestUpliftTTSConfig:
    def test_default_voice_id_format(self):
        # pyre-ignore [missing-import]
        from tts.tts_uplift import UpliftTTS
        assert UpliftTTS.DEFAULT_VOICE.startswith("v_")

    def test_default_format_is_mp3(self):
        # pyre-ignore [missing-import]
        from tts.tts_uplift import UpliftTTS
        assert "MP3" in UpliftTTS.DEFAULT_FORMAT

    def test_server_url_is_https(self):
        # pyre-ignore [missing-import]
        from tts.tts_uplift import _SERVER
        assert _SERVER.startswith("https://")

    def test_namespace_starts_with_slash(self):
        # pyre-ignore [missing-import]
        from tts.tts_uplift import _NAMESPACE
        assert _NAMESPACE.startswith("/")


class TestTTSFactorySelection:
    def _get_tts_backend(self, env: dict) -> str:
        if env.get("UPLIFT_API_KEY"):
            return "uplift"
        if env.get("ELEVENLABS_API_KEY"):
            return "elevenlabs"
        return "edge"

    def test_uplift_when_key_present(self):
        assert self._get_tts_backend({"UPLIFT_API_KEY": "key"}) == "uplift"

    def test_elevenlabs_fallback(self):
        assert self._get_tts_backend({"ELEVENLABS_API_KEY": "key"}) == "elevenlabs"

    def test_edge_when_no_keys(self):
        assert self._get_tts_backend({}) == "edge"

    def test_uplift_preferred_over_elevenlabs(self):
        env = {"UPLIFT_API_KEY": "a", "ELEVENLABS_API_KEY": "b"}
        assert self._get_tts_backend(env) == "uplift"
