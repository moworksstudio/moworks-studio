#!/usr/bin/env python3
"""mix.py — layer the voiceover, the synth SFX cues and (optionally) a music bed, then loudness-normalise.

    uv run --with numpy --with scipy python tools/sfx/mix.py out/_sound/MyEdit.soundtrack.json --out out/MyEdit
(tools/render.mjs runs this for you.)

Input: a soundtrack.json from tools/sfx/export-cues.mjs (voice = the CUT speech of the edit) —
    { "composition", "voice": "public/…/audio.mp3" | null, "seconds", "sfxDir",
      "cues": [{ "n": "click", "t": 1.99, "g": -14 }, …],          # n = sound, t = start (s), g = gain (dB)
      "music": null | { "src": "…", "keys": [[t, dB], …], "muffle": [[t0, t1], …], "cutoff": 900 } }
Output (48 kHz stereo 24-bit WAV, length = the picture):
    <id>.mix.wav  VO + SFX (+ music) → -14 LUFS integrated, true peak ≤ -1.5 dBTP: ffmpeg loudnorm measures the
                  mix, one static gain brings it to -14 (no pumping — loudnorm's own dynamic mode squashes the
                  voice), and a 4×-oversampled limiter holds the true peak; re-measured and nudged once
    <id>.sfx.wav  the SFX alone at the same level relative to the ORIGINAL voiceover (not normalised) — for an
                  edit where the VO already sits on the timeline at its own level
With "master": true and no voice (a short told in captions), the music + effects are mastered into <id>.mix.wav.
The music follows its volume keyframes (dB, linear between keys) and is muffled (low-passed, 0.3 s ramps) inside
the "muffle" ranges — e.g. under the somber scenes.
"""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = Path(__file__).resolve().parents[2]
FFMPEG = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")  # on PATH (tools/doctor.mjs checks it)
TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.5, 11.0
# true-peak limiter: 4× oversampled, ceiling 0.5 dB under the target for resampling overshoot, delay compensated
LIMIT = f"aresample={SR * 4},alimiter=limit={10 ** ((TARGET_TP - 0.5) / 20):.4f}:attack=0.5:release=40:level=false:latency=true"


def decode(path):
    """any audio file → float32 mono at 48 kHz (via ffmpeg)."""
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def read_sfx(path):
    """a sound file → float stereo (n, 2) at 48 kHz (mono files go to both sides at unity)."""
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=0)
    return x


def add(buf, x, at, gain_db=0.0):
    i = int(round(at * SR))
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i : i + n] += x[:n] * 10 ** (gain_db / 20)


def music_bed(spec, n):
    x = decode(ROOT / spec["src"])
    x = np.tile(x, int(np.ceil(n / len(x))))[:n] if len(x) < n else x[:n]  # mono
    t = np.arange(n) / SR
    keys = np.array(spec.get("keys") or [[0, -24]], dtype=np.float64)
    x = x * 10 ** (np.interp(t, keys[:, 0], keys[:, 1]) / 20)
    ranges = spec.get("muffle") or []
    if ranges:
        dull = signal.sosfiltfilt(signal.butter(4, spec.get("cutoff", 900), fs=SR, output="sos"), x)
        m = np.zeros(n)
        for t0, t1 in ranges:
            m = np.maximum(m, np.clip(np.minimum((t - t0) / 0.3 + 1, (t1 - t) / 0.3 + 1), 0, 1))
        x = (1 - m) * x + m * dull
    return x


def stereo(x):
    """mono → the same signal on both channels at unity (ffmpeg's own mono→stereo upmix drops each side 3 dB)."""
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def write_f32(path, x):
    wavfile.write(path, SR, stereo(x).astype(np.float32))


def to_stereo24(src, dst, extra_filter=None):
    af = (extra_filter + "," if extra_filter else "") + f"aresample={SR}"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(src), "-af", af, "-c:a", "pcm_s24le", str(dst)], check=True)


def loudnorm_json(src, af):
    err = subprocess.run([FFMPEG, "-hide_banner", "-i", str(src), "-af", af, "-f", "null", "-"], capture_output=True, text=True).stderr
    return json.loads(err[err.rindex("{") : err.rindex("}") + 1])


def measure(path):
    """integrated loudness (LUFS) and true peak (dBTP) of a file, via ffmpeg ebur128."""
    err = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True
    ).stderr
    summary = err[err.rindex("Summary:") :]
    i = float(summary.split("I:")[1].split("LUFS")[0])
    tp = float(summary.split("Peak:")[1].split("dBFS")[0])
    return i, tp


def mix(path, out_dir):
    st = json.loads(Path(path).read_text())
    cid = st["composition"]
    n = int(np.ceil(st["seconds"] * SR))
    sfx = np.zeros((n, 2))
    for c in st["cues"]:
        add(sfx, read_sfx(ROOT / st["sfxDir"] / f"{c['n']}.wav"), c["t"], c["g"])
    voice = np.zeros(n)
    if st.get("voice"):
        v = decode(ROOT / st["voice"])
        if len(v) > n + SR // 10:
            print(f"  ! {cid}: voice is {len(v) / SR:.2f} s, picture {st['seconds']:.2f} s — the tail is cut")
        add(voice, v, 0.0)
    music = stereo(music_bed(st["music"], n)) if st.get("music") else np.zeros((n, 2))
    if st.get("fade"):  # [in, out] seconds over everything (a demo window, an ending)
        fi, fo = st["fade"]
        ramp = np.ones(n)
        if fi:
            k = min(n, int(fi * SR))
            ramp[:k] *= np.linspace(0, 1, k)
        if fo:
            k = min(n, int(fo * SR))
            ramp[-k:] *= np.linspace(1, 0, k)
        voice, sfx, music = voice * ramp, sfx * ramp[:, None], music * ramp[:, None]

    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        write_f32(tmp / "sfx.wav", sfx + music)
        to_stereo24(tmp / "sfx.wav", out_dir / f"{cid}.sfx.wav")
        if not st.get("voice") and not st.get("master"):
            print(f"{cid}: no voice — wrote only {cid}.sfx.wav")
            return
        full = stereo(voice) + sfx + music
        k = int(0.015 * SR)
        full[-k:] *= np.linspace(1, 0, k)[:, None]  # the VO may be cut mid-breath at the picture's end — no click
        # (master: true and no voice = a film told without narration: the music + effects ARE the mix, mastered the same way)
        write_f32(tmp / "pre.wav", full)
        m = loudnorm_json(tmp / "pre.wav", f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json")
        gain = TARGET_I - float(m["input_i"])
        dst = out_dir / f"{cid}.mix.wav"
        for _ in range(2):
            to_stereo24(tmp / "pre.wav", dst, f"volume={gain:.3f}dB,{LIMIT}")
            i, tp = measure(dst)
            if abs(i - TARGET_I) < 0.15:
                break
            gain += TARGET_I - i  # the limiter shaved a little loudness — nudge once
    print(f"{cid}: {len(st['cues'])} cues · {float(m['input_i']):.1f} LUFS {gain:+.1f} dB → {i:.1f} LUFS, true peak {tp:.1f} dBTP")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("soundtracks", nargs="+")
    ap.add_argument("--out", default=str(ROOT / "out/_sound"))
    args = ap.parse_args()
    for p in args.soundtracks:
        mix(p, Path(args.out))


if __name__ == "__main__":
    main()
