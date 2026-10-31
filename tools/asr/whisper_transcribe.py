# Speech to text with faster-whisper (Whisper large-v3 turbo, CTranslate2 format; Turbo only). Called by packages/voice/asr.mjs.
# Prints JSON lines on stdout:
#   {"type": "info", "language": "vi", "probability": 0.98, "duration": 12.3, "device": "cpu"}
#   {"type": "segment", "start": 0.0, "end": 2.4, "text": "...", "words": [{"text": "...", "start": 0.0, "end": 0.4, "p": 0.9}]}
#   {"type": "done", "segments": 12}
# Usage: python -I whisper_transcribe.py <model dir> <audio file> [--language vi|auto] [--device auto|cpu|cuda] [--prompt-file words.txt] [--song]
import argparse
import json
import os
import re
import sys


sys.stdout.reconfigure(encoding="utf-8")   # -I ignores PYTHONIOENCODING; Vietnamese text must not hit the console code page
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
_libs = os.environ.get("MW_PYLIBS")          # the app's own component folder (runtime/python-libs), first on the path (align_lyrics too)
if _libs and os.path.isdir(_libs): sys.path.insert(0, _libs)


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def made_up_tail(words):
    # Whisper repeating its last line over the silent tail: at least half the words take no time at all (Test 28: 20 words, each 0 s long)
    return bool(words) and sum(1 for w in words if w["end"] <= w["start"]) * 2 >= len(words)


def load(model_dir, device):
    # NVIDIA's CUDA libraries the app installed (packages/voice/cuda.mjs): their DLL folders, for CTranslate2 to find cuBLAS and cuDNN
    for d in os.environ.get("MW_CUDA_DLLS", "").split(os.pathsep):
        if d and os.path.isdir(d):
            os.add_dll_directory(d)
    from faster_whisper import WhisperModel
    if device in ("auto", "cuda"):
        try:
            import ctranslate2
            if ctranslate2.get_cuda_device_count() > 0:
                m = WhisperModel(model_dir, device="cuda", compute_type="float16")
                import numpy as np
                list(m.transcribe(np.zeros(16000, dtype=np.float32), language="en")[0])   # CUDA libraries load on first use
                return m, "cuda"
        except Exception as e:  # missing cuBLAS / cuDNN: fall back to the CPU
            if device == "cuda":
                raise
            sys.stderr.write(f"cuda unavailable, using cpu: {e}\n")
    return WhisperModel(model_dir, device="cpu", compute_type="int8"), "cpu"


# Whisper's stock lines on music it cannot hear (YouTube outros it was trained on); a window whose text has one is dropped whole
STOCK = re.compile(r"subscribe|ghiền mì|lalaschool|la la school|la school|bỏ lỡ những video|đăng ký kênh|cảm ơn (các bạn|mọi người|các vị) đã",
                   re.I)


def sung(model, device, audio, language, sr=16000):
    """Sung words over music. Whisper's voice filter (VAD) cuts most singing as "not speech", and one long pass drifts into its stock
    "subscribe…" lines, so: one filtered pass (it also picks the language), then the whole song again in 8 s windows every 4 s with no
    filter and no carry-over between windows (language "auto": each window picks its own, for songs that mix Vietnamese and English); windows with a stock line and words under 25 % sure are dropped, a word heard twice at
    the same time is kept once, and a pause over 1 s starts a new line.
    Adapted from the Moworks Motion kit's engine/audio/align.py (the Moworks kit, lyric film of 07/10/2026)."""
    out = []

    def take(segs, off):
        for s in segs:
            if STOCK.search(s.text):
                continue
            for w in s.words or []:
                t = w.word.strip()
                if t and (w.probability or 0) >= 0.25:
                    out.append({"text": t, "start": round(off + w.start, 3), "end": round(off + w.end, 3), "p": round(w.probability, 3)})

    segs, info = model.transcribe(audio, language=language, word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False)
    take(segs, 0.0)
    emit({"type": "info", "language": info.language, "probability": round(info.language_probability, 3),
          "duration": round(info.duration, 3), "device": device})
    W, H = 8 * sr, 4 * sr
    for a in range(0, max(1, len(audio) - H), H):
        segs, _ = model.transcribe(audio[a:a + W], language=language, word_timestamps=True, vad_filter=False, beam_size=5,
                                   condition_on_previous_text=False)
        take(segs, a / sr)
    key = lambda t: t.lower().strip(".,!?…\"' ")
    out.sort(key=lambda w: w["start"])
    words = []
    for w in out:
        if words and key(words[-1]["text"]) == key(w["text"]) and abs(words[-1]["start"] - w["start"]) < 0.15:
            continue
        words.append(w)
    lines = []
    for w in words:
        if not lines or w["start"] - lines[-1][-1]["end"] > 1.0:
            lines.append([])
        lines[-1].append(w)
    for ws in lines:
        emit({"type": "segment", "start": ws[0]["start"], "end": ws[-1]["end"], "text": " ".join(w["text"] for w in ws), "words": ws})
    emit({"type": "done", "segments": len(lines)})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("audio")
    ap.add_argument("--language", default="auto")
    ap.add_argument("--device", default="auto")
    ap.add_argument("--prompt-file", default=None, help="UTF-8 text with names and words to expect (brand, script); helps spelling")
    ap.add_argument("--song", action="store_true", help="sung words over music: no voice filter, overlapping 8 s windows (see sung())")
    a = ap.parse_args()
    prompt = None
    if a.prompt_file:
        with open(a.prompt_file, encoding="utf-8") as f:
            prompt = f.read().strip()[:600] or None
    model, device = load(a.model, a.device)
    # the app hands over 16 kHz mono 16-bit WAV (FFmpeg); reading it here skips PyAV, whose installed version faster-whisper cannot call
    import wave
    import numpy as np
    with wave.open(a.audio, "rb") as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    if a.song:
        return sung(model, device, audio, None if a.language == "auto" else a.language)
    segments, info = model.transcribe(audio, language=None if a.language == "auto" else a.language,
                                      word_timestamps=True, vad_filter=True, beam_size=5, initial_prompt=prompt,
                                      hallucination_silence_threshold=2.0)
    emit({"type": "info", "language": info.language, "probability": round(info.language_probability, 3),
          "duration": round(info.duration, 3), "device": device})
    n = 0
    for s in segments:
        # the silent tail of a voice-over: Whisper's stock lines and lines timed past the end of the file are made up
        if STOCK.search(s.text) or s.start >= info.duration - 0.05:
            continue
        words = [{"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)}
                 for w in (s.words or []) if w.word.strip()]
        if made_up_tail(words):
            continue
        n += 1
        emit({"type": "segment", "start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "words": words})
    emit({"type": "done", "segments": n})


if __name__ == "__main__":
    main()
