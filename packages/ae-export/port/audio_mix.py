"""Audio of a HyperFrames film for the AE port: <audio> clips, mix + stems at the Moworks loudness target.
Copied from Moworks Motion engine/audio/media.py (kit commit 30b7dcb, MIT, Moworks); bake_music removed (the kit's music builder);
ffmpeg comes from config/pins.json (appenv). See ../PROVENANCE.md.

probe(path)                          -> (seconds, channels)
duration(path)                       -> seconds
load(path, start=0, dur=None)        -> float32 [n, 2] at 48 kHz
clips(index_html)                    -> [{id, src, start, dur, media_start, volume, role, fade_in, fade_out}] read back from the film
master(project, clips, total, out_dir=None)
                                     -> master gain in dB; with out_dir: mix.wav and stems/voice|music|sfx.wav (24-bit 48 kHz, frame 0)"""
import html, json, re, subprocess, wave
from pathlib import Path

import numpy as np

from appenv import ffmpeg

SR = 48000
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)    # Windows: ffmpeg without a console window (0 elsewhere)
TAIL = 1.8


def probe(path):
    """(seconds, channels): WAV header, else ffmpeg's Duration and audio stream lines"""
    p = Path(path)
    if p.suffix.lower() == ".wav":
        try:
            with wave.open(str(p)) as w: return w.getnframes() / float(w.getframerate()), w.getnchannels()
        except wave.Error:
            pass                                           # e.g. float or extensible WAV: ask ffmpeg
    r = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(p)], capture_output=True, text=True, encoding="utf-8", errors="replace",
                       creationflags=NO_WINDOW)
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", r.stderr)
    if not m: raise SystemExit(f"cannot read the length of {p}: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'no output'}")
    ch = 1 if re.search(r"Audio:.*\bmono\b", r.stderr) else 2
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]), ch


def duration(path):
    return probe(path)[0]


def load(path, start=0.0, dur=None):
    mono = probe(path)[1] == 1
    # no -ss at 0: ffmpeg's input seek fails on the shortest MP3s (a 0.37 s click decoded to nothing)
    args = [ffmpeg(), "-v", "quiet"] + (["-ss", f"{start:.4f}"] if start else []) + ["-i", str(path)] + (["-t", f"{dur:.4f}"] if dur else [])
    args += (["-af", "pan=stereo|c0=c0|c1=c0"] if mono else ["-ac", "2"]) + ["-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(args, capture_output=True, check=True, creationflags=NO_WINDOW).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def write(path, x, bits=24):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", f"pcm_s{bits}le", str(path)],
                   input=np.ascontiguousarray(x, np.float32).tobytes(), check=True, creationflags=NO_WINDOW)


def _place(buf, x, t):
    i0 = int(round(t * SR)); lo, hi = max(0, i0), min(len(buf), i0 + len(x))
    if hi > lo: buf[lo:hi] += x[lo - i0:hi - i0]


def clips(index_html):
    """the <audio> clips of a built film (attributes as kit.py build writes them, HyperFrames names)"""
    text = Path(index_html).read_text(encoding="utf-8")
    out = []
    for tag in re.findall(r"<audio\b[^>]*>", text):
        a = {k: html.unescape(v) for k, v in re.findall(r'([\w-]+)="([^"]*)"', tag)}
        if "src" not in a or "data-start" not in a: continue
        out.append({"id": a.get("id", ""), "src": a["src"], "start": float(a["data-start"]), "dur": float(a.get("data-duration", 0) or 0),
                    "media_start": float(a.get("data-media-start", 0) or 0), "volume": float(a.get("data-volume", 1) or 1),
                    "role": a.get("data-aimk-role") or a.get("data-timeline-role", ""), "fade_in": float(a.get("data-fade-in", 0) or 0),
                    "fade_out": float(a.get("data-fade-out", 0) or 0)})
    return out


def stems(project, cl, total):
    """{voice, music, sfx}: each role summed on the film's timeline (clip volume and fades applied), float32 [N, 2]"""
    N = int(round(total * SR)); out = {k: np.zeros((N, 2), np.float32) for k in ("voice", "music", "sfx")}
    for c in cl:
        x = load(Path(project) / c["src"], c["media_start"], c["dur"]) * np.float32(c["volume"]); n = len(x)
        m = min(n, int(c["fade_in"] * SR))
        if m: x[:m] *= np.linspace(0, 1, m, dtype=np.float32)[:, None]
        m = min(n, int(c["fade_out"] * SR))
        if m: x[n - m:] *= np.linspace(1, 0, m, dtype=np.float32)[:, None]
        _place(out[c["role"] if c["role"] in out else "sfx"], x, c["start"])
    return out


LUFS, PEAK = -16.0, -4.0     # the "sound pass" X article: about -16 LUFS with peaks under -4 dBFS, so nothing
                             # clips after AAC compression or on a phone speaker in mono (v1 used -14 LUFS, sample peak -1 dBFS)


def targets(project):
    """(LUFS, true-peak ceiling dBTP) of a film: film.json "loudness": -14 (a louder master the client asks for) or {"lufs": -14, "peak": -2}"""
    try: L = json.loads((Path(project) / "film.json").read_text(encoding="utf-8")).get("loudness")
    except (OSError, ValueError): L = None
    if isinstance(L, (int, float)): return float(L), PEAK
    if isinstance(L, dict): return float(L.get("lufs", LUFS)), float(L.get("peak", PEAK))
    return LUFS, PEAK


def master(project, cl, total, out_dir=None):
    """one gain for the whole mix: the film's LUFS target (default -16) unless that would put a TRUE peak (4x oversampled, ffmpeg's
    loudnorm measure) over the ceiling (default -4 dBTP): then the peaks win and the film is quieter (kit.py loudness says so and names the
    loudest cue). Returns the gain in dB (0 when there is no sound)."""
    if not cl: return 0.0
    st = stems(project, cl, total); mix = st["voice"] + st["music"] + st["sfx"]
    if not np.abs(mix).max() > 1e-6: return 0.0
    tmp = Path(out_dir or Path(project) / "qa") / "_master_raw.wav"; write(tmp, mix)
    I, P = targets(project)
    m = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(tmp), "-af", f"loudnorm=I={I}:TP={P}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=NO_WINDOW).stderr
    tmp.unlink(missing_ok=True)
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
    tp = float(j["input_tp"]) if j.get("input_tp") not in (None, "-inf") else 20 * np.log10(np.abs(mix).max() + 1e-9)
    g = min(10 ** ((I - float(j["input_i"])) / 20), 10 ** ((P - tp) / 20))
    if out_dir:
        d = Path(out_dir); write(d / "mix.wav", mix * g)
        for k, x in st.items():
            if np.abs(x).max() > 1e-6: write(d / "stems" / f"{k}.wav", x * g)
            else: (d / "stems" / f"{k}.wav").unlink(missing_ok=True)
    return round(float(20 * np.log10(g)), 2)
