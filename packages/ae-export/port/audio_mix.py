"""Audio of a HyperFrames film for the AE port: <audio> clips, mix + stems at the Moworks loudness target.
Copied from Moworks Motion engine/audio/media.py (kit commit 30b7dcb, MIT, Moworks); bake_music removed (the kit's music builder);
ffmpeg comes from config/pins.json (appenv). See ../PROVENANCE.md.

probe(path)                          -> (seconds, channels)
duration(path)                       -> seconds
load(path, start=0, dur=None)        -> float32 [n, 2] at 48 kHz
clips(index_html)                    -> [{id, src, start, dur, media_start, volume, role, fade_in, fade_out, automation}] read back from the film
role_of(clip)                        -> "voice" | "music" | "sfx"
gain_at(clip, ts)                    -> the clip's gain at its own seconds ts: data-volume, volume lane, edge fades, as HF's mixer plays it
level_keys(clip, master_db)          -> ("set", dB) or ("keys", [[t, dB]...]): the same gain as After Effects' Audio Levels, clip seconds
to_wav(src, dst)                     -> a file After Effects cannot import, as WAV at 48 kHz (its times stay)
master(project, clips, total, out_dir=None)
                                     -> master gain in dB; with out_dir: mix.wav and stems/voice|music|sfx.wav (24-bit 48 kHz, frame 0)"""
import html, json, math, re, subprocess, wave
from functools import lru_cache
from pathlib import Path

import numpy as np

from appenv import ffmpeg

SR = 48000
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)    # Windows: ffmpeg without a console window (0 elsewhere)
TAIL = 1.8
# What After Effects imports as sound, tried in After Effects (Beta) 27.1 on 31/10/2026: it refused .ogg (Vorbis and Opus), .oga, .opus, .flac, .webm, .mka
# with "not a valid file type for import". A file of any other kind goes in as WAV (a sound in a video file too, .wma: Windows only).
AE_TAKES = {".wav", ".aif", ".aiff", ".mp3", ".m4a", ".aac"}
MAX_GAIN = 10 ** (12 / 20)                                # HF's one ceiling for a clip's gain (core audioGain.js MAX_AUDIO_GAIN, +12 dB)
LEVEL_TOL, LEVEL_FLOOR, LEVEL_MIN_GAP = 0.5, -96.0, 0.005  # Audio Levels keys: dB off the true gain at most (where it can be heard), silence, seconds between two
AUDIBLE = -60.0                                           # under this (dB of the clip's own gain) a difference in the keys is not heard


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


def to_wav(src, dst):
    """src, which After Effects cannot import, as a WAV it can: 24-bit 48 kHz, the same channels and every second where it was, so a layer's
    start, media start and levels stay what they are. An error when ffmpeg cannot read the file."""
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-i", str(src), "-map", "0:a:0", "-vn", "-ar", str(SR), "-c:a", "pcm_s24le", str(dst)],
                   capture_output=True, check=True, creationflags=NO_WINDOW)


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
                    "fade_out": float(a.get("data-fade-out", 0) or 0), "automation": a.get("data-automation", "")})
    return out


def role_of(c):
    """voice, music or sfx: as the app reads a clip (hf-edit/tracks.mjs audioKind): its data-timeline-role ("voiceover" for the voice), else its id"""
    role, cid = (c.get("role") or "").lower(), c.get("id") or ""
    if role: return "voice" if role in ("voiceover", "voice") else "music" if role == "music" else "sfx"
    return "voice" if re.match(r"^el-voice(?:-[\w-]+)?$", cid) else "music" if re.match(r"^el-music(?:-[\w-]+)?$", cid) else "sfx"


# ---- HF's volume lane: one curve, as core audioAutomation.js samples it and engine audioMixer bakes it into the render
def _via_progress(x, vx, vy):
    """audioAutomation.js shapeVia: progress through a segment bent through a via point (one conic arc)"""
    inside = lambda n: min(0.999, max(0.001, n))
    vx, vy = inside(vx), inside(vy)
    if abs(vx - vy) < 1e-6: return x
    dx, dy, edge = vx - 0.5, vy - 0.5, 0.999
    need_x = dx / (edge - vx) if dx > 0 else (-dx / (vx - (1 - edge)) if dx < 0 else 0)
    need_y = dy / (edge - vy) if dy > 0 else (-dy / (vy - (1 - edge)) if dy < 0 else 0)
    w = min(1e6, max(1, need_x, need_y)); cx, cy = vx + dx / w, vy + dy / w
    spread = 2 - 2 * w; a = x * spread - 1 + 2 * w * cx; b = -x * spread - 2 * w * cx; c = x
    if abs(a) < 1e-12: t = c if abs(b) < 1e-12 else -c / b
    else:
        root = math.sqrt(max(0.0, b * b - 4 * a * c)); first, second = (-b + root) / (2 * a), (-b - root) / (2 * a)
        on = lambda u: -1e-9 <= u <= 1 + 1e-9
        t = min(1, max(0, first)) if on(first) else min(1, max(0, second)) if on(second) else c
    rest = 1 - t; den = rest * rest + 2 * w * t * rest + t * t
    return x if not den > 0 else (2 * w * cy * t * rest + t * t) / den


def _progress(x, p):
    """audioAutomation.js shapeProgress: a via point wins, else an exponent (curve -1..1), else straight"""
    if p.get("viaX") is not None and p.get("viaY") is not None: return _via_progress(min(1, max(0, x)), float(p["viaX"]), float(p["viaY"]))
    curve = max(-1.0, min(1.0, float(p.get("curve") or 0)))
    return x ** (2 ** (2 * curve)) if curve else x


def lane_of(c):
    """the clip's volume lane as straight pieces, [(t, v)...] in its own seconds (bent pieces sampled as HF's baker samples them,
    volumeSegmentSampleCount), or None without one. A lane HF would refuse is no lane here either (its render drops the whole track: the port keeps the sound)."""
    return _lane(c.get("automation") or "")


@lru_cache(maxsize=256)
def _lane(raw):
    if not raw: return None
    try: doc = json.loads(raw)
    except ValueError: return None
    if not isinstance(doc, dict) or doc.get("version") != 1: return None
    lane = next((l for l in doc.get("lanes") or [] if isinstance(l, dict) and l.get("target") == "volume"), None)
    pts = {}
    for p in (lane or {}).get("points") or []:
        try: t, v = float(p["t"]), float(p["v"])
        except (KeyError, TypeError, ValueError): continue
        if math.isfinite(t) and math.isfinite(v): pts[max(0.0, t)] = {**p, "t": max(0.0, t), "v": min(MAX_GAIN, max(0.0, v))}      # later wins on a tie
    points = [pts[t] for t in sorted(pts)][:512]
    if not points: return None
    out = []
    for a, b in zip(points, points[1:] + [None]):
        out.append((a["t"], a["v"]))
        if b is None or not (a.get("curve") or (a.get("viaX") is not None and a.get("viaY") is not None)): continue
        span = b["t"] - a["t"]; steps = min(4096, max(2, math.ceil(span * 30)))
        out += [(a["t"] + span * k / steps, a["v"] + (b["v"] - a["v"]) * _progress(k / steps, a)) for k in range(1, steps)]
    return out


def clip_length(c, available=None):
    """seconds the clip plays: data-duration, or to the end of its file when it names none (HF's mixer does the same)"""
    return c["dur"] if c.get("dur", 0) > 0 else (available or 0.0)


def gain_at(c, ts, dur=None):
    """the clip's gain at its own seconds ts, as HF's mixer plays it: data-volume times the lane (held at both ends, capped at HF's ceiling), then the edge
    fades (linear, and scaled down to meet inside a clip they outrun: core audioFade.js)"""
    ts = np.asarray(ts, float)
    d = clip_length(c) if dur is None else dur
    vol = max(0.0, min(MAX_GAIN, float(c.get("volume", 1))))
    lane = lane_of(c)
    g = np.full(ts.shape, vol) if lane is None else np.minimum(vol * np.interp(ts, [p[0] for p in lane], [p[1] for p in lane]), MAX_GAIN)
    fi, fo = max(0.0, c.get("fade_in", 0) or 0), max(0.0, c.get("fade_out", 0) or 0)
    if d > 0 and fi + fo > d: fi, fo = fi * d / (fi + fo), fo * d / (fi + fo)
    if fi > 0: g = g * np.clip(ts / fi, 0, 1)
    if fo > 0 and d > 0: g = g * np.clip((d - ts) / fo, 0, 1)
    return g


def _db(g):
    return 20 * math.log10(g) if g > 1e-5 else LEVEL_FLOOR


def level_keys(c, master_db=0.0, dur=None):
    """Audio Levels for the clip, the same curve in dB: ("set", dB) when it never changes, else ("keys", [[t, dB]...]) in the clip's seconds, straight in dB between
    keys and within LEVEL_TOL of the true gain wherever it can be heard. A duck written in amplitude bows away from a straight line in dB (2 dB at the middle of 12), a fade in from
    silence all the more; AE's -48 dB start with one straight dB ramp was another curve."""
    d = clip_length(c) if dur is None else dur
    base = lambda t: float(gain_at(c, np.array([t]), d)[0])
    level = lambda t: max(LEVEL_FLOOR, _db(base(t)) + master_db) if base(t) > 1e-5 else LEVEL_FLOOR
    lane = lane_of(c) or []
    fi, fo = max(0.0, c.get("fade_in", 0) or 0), max(0.0, c.get("fade_out", 0) or 0)
    if d > 0 and fi + fo > d: fi, fo = fi * d / (fi + fo), fo * d / (fi + fo)
    stops = sorted({0.0, d, min(d, fi), max(0.0, d - fo)} | {min(d, p[0]) for p in lane})
    keys = []
    def between(a, b, va, vb, depth=0):
        keys.append([a, va])
        m = (a + b) / 2
        if depth >= 8 or b - a < 2 * LEVEL_MIN_GAP: return
        vm = level(m)
        if max(vm, (va + vb) / 2) - master_db > AUDIBLE and abs(vm - (va + vb) / 2) > LEVEL_TOL:
            between(a, m, va, vm, depth + 1); between(m, b, vm, vb, depth + 1)
    for a, b in zip(stops, stops[1:]):
        if b > a: between(a, b, level(a), level(b))
    if stops: keys.append([stops[-1], level(stops[-1])])
    done = []                                              # a key on the straight line between its neighbours says nothing: two neighbours at one level above all
    for k in keys:
        if done and abs(done[-1][0] - k[0]) < 1e-9: continue
        while len(done) >= 2:
            (ta, va), (tb, vb) = done[-2], done[-1]
            if abs(va + (k[1] - va) * (tb - ta) / (k[0] - ta) - vb) > 0.01: break
            done.pop()
        done.append(k)
    if len(done) < 2 or max(k[1] for k in done) - min(k[1] for k in done) < 0.01:
        return ("set", round(done[0][1], 2) if done else round(max(LEVEL_FLOOR, _db(max(0.0, float(c.get("volume", 1)))) + master_db), 2))
    return ("keys", [[round(t, 5), round(v, 3)] for t, v in done])


def stems(project, cl, total, bad=None):
    """{voice, music, sfx}: each role summed on the film's timeline (clip volume, volume lane and fades applied), float32 [N, 2]; a file that cannot be read
    stays out, named in bad ({clip id: why}) when given"""
    N = int(round(total * SR)); out = {k: np.zeros((N, 2), np.float32) for k in ("voice", "music", "sfx")}
    for c in cl:
        try: x = load(Path(project) / c["src"], c["media_start"], c["dur"] or None)
        except (subprocess.CalledProcessError, OSError, SystemExit, ValueError) as e:
            if bad is not None: bad[c.get("id") or c["src"]] = str(e).splitlines()[0][:200] if str(e) else "cannot be read"
            continue
        d = clip_length(c, len(x) / SR)
        x = x * gain_at(c, np.arange(len(x)) / SR, d).astype(np.float32)[:, None]
        _place(out[role_of(c)], x, c["start"])
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


def master(project, cl, total, out_dir=None, bad=None):
    """one gain for the whole mix: the film's LUFS target (default -16) unless that would put a TRUE peak (4x oversampled, ffmpeg's
    loudnorm measure) over the ceiling (default -4 dBTP): then the peaks win and the film is quieter (kit.py loudness says so and names the
    loudest cue). Returns the gain in dB (0 when there is no sound)."""
    if not cl: return 0.0
    st = stems(project, cl, total, bad); mix = st["voice"] + st["music"] + st["sfx"]
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
