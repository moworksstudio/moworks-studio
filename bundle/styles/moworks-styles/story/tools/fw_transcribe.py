#!/usr/bin/env python3
"""fw_transcribe.py — speech → words with timestamps using faster-whisper (Windows, Linux, Intel Macs; CPU or NVIDIA GPU).
Called by tools/transcribe.mjs; writes the same JSON shape as mlx-whisper ({ segments: [{ words: [...] }] }).

    uv run --with faster-whisper python tools/fw_transcribe.py <audio.wav> <out.json> [--model large-v3-turbo] [--language en]

The first run downloads the model (large-v3-turbo ≈ 1.6 GB) into the Hugging Face cache; later runs are offline.
The audio is decoded with ffmpeg and handed over as samples (faster-whisper's own decoder breaks with some PyAV
releases).
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

FFMPEG = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")


def load(path):
    """any audio/video file → 16 kHz mono float32 (what Whisper expects)."""
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out")
    ap.add_argument("--model", default="large-v3-turbo")
    ap.add_argument("--language", default=None)
    a = ap.parse_args()
    model = WhisperModel(a.model, device="auto", compute_type="auto")
    segments, info = model.transcribe(load(a.audio), word_timestamps=True, language=a.language, vad_filter=False)
    out = {
        "language": info.language,
        "segments": [
            {
                "start": s.start,
                "end": s.end,
                "text": s.text,
                "words": [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in (s.words or [])],
            }
            for s in segments
        ],
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"{sum(len(s['words']) for s in out['segments'])} words · language {info.language}")


if __name__ == "__main__":
    main()
