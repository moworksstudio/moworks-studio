#!/usr/bin/env python3
"""Verify a video's mix: file format and length, loudness and true peak (wav + AAC 256k), the
voice at lag 0 against vo.wav, every effect landing on its cue, word-by-word clarity (no effect or
music masks a word), and the start and end fades. The voice checks are skipped when the video has
no voice.

    node tools/py.mjs tools/audio/verify_mix.py <video dir> [--events FILE.py] [--scratch DIR]

Reads <video>/audio/cues.json, mix.wav, music.wav, sfx.wav, vo.wav (if any), mix.json (written by
mix.py, or by a film's own mix script) and story/words.json. Prints a table and PASS/FAIL, writes
verify.json to the scratch folder, and exits 1 on a FAIL.

Where the stems come from (mix.json "route"):
  generic  tools/audio/mix.py: music.wav / sfx.wav are the raw stems, so the mix is rebuilt from them
           with the recorded settings (it must match mix.wav), which gives every stem exactly as it
           sits in the mix.
  stems    a film's own mix script: music.wav / sfx.wav are already written as they sit in the mix.
Effects: the generic route renders each cue alone with tools/audio/sfx.py. A film with its own
effects passes --events <its sfx script>; that file must define
  isolated_events(doc, vo, n) -> [{"y": (m, 2) array, "s": start sample, "t": cue time,
                                   "land": "hit" | "peak" | "start", "anchor": s, "id", "kind"}]
with each event at its level before mastering.

Pass rules (mastered films: a voice, --normalize, or a film's own mix):
  integrated -14.0 +-0.1 LUFS (ffmpeg and pyloudnorm); AAC 256k true peak < -1.0 dBTP;
  48 kHz stereo 24-bit with duration x 48000 samples; voice at lag 0 vs vo.wav;
  every effect lands on its cue (hit: onset within 5 ms; tap: onset -15..+5 ms; swell: peak -10..+60 ms;
  peak: within 30 ms; sweep: within 60 ms; start: -30..+300 ms)
  and makes up at least -10 dB of the effects stem around its own peak;
  per word (speech band 300 Hz - 4 kHz, 20 ms frames): SNR median >= +8 dB, clarity index >= 0.6,
  at most 25 % of the word's speech cells masked (warn above 10 %, below +12 dB, or p10 under 0 dB);
  start: < 1e-3 in the first 2 ms; end: last 10 ms under -60 dBFS with a falling fade.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audio_common as ac  # noqa: E402
import mix as tmix  # noqa: E402
import sfx as tsfx  # noqa: E402

SR = 48000
TARGET_I = -14.0
AAC_TP_MAX = -1.0
BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000),
         (4000, 8000), (8000, 16000)]
# third-octave centres for the word-clarity index (speech band, SII-like) and rough band-importance
TOB = [250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]
TOB_W = np.array([0.0617, 0.0671, 0.0781, 0.0783, 0.0811, 0.0812, 0.0815, 0.0861, 0.0915, 0.0828,
                  0.0753, 0.0698, 0.0659, 0.0606, 0.0405])
TOB_W = TOB_W / TOB_W.sum()

# how each effect lands on its cue:
#   hit   = the transient starts on t (onset within 5 ms) and peaks just after it (a film's own effects)
#   tap   = a short transient peaks on t (sfx.py's pops and ticks: onset -15..+5 ms, peak -10..+60 ms)
#   swell = a lead-in swells into a strike on t (only the peak is checked)
#   peak  = a sweep peaks on t (within 30 ms; sweep: sfx.py's noise whooshes, 50 ms envelope, within 60 ms)
#   start = a long layer begins on t (-30..+300 ms, nothing before it)
GENERIC_LAND = {
    "pop": "tap", "tick": "tap", "counter_roll": "tap", "sparkle": "tap",
    "pop_big": "swell", "impact": "swell", "light_hit": "swell", "title": "swell", "reveal": "swell",
    "whoosh_pullback": "sweep", "whoosh_dive": "sweep", "swish": "sweep",
}


def ns(sec):
    return int(round(sec * SR))


def st(x):
    x = np.asarray(x, dtype=np.float64)
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def place(dst, src, start):
    src = st(src)
    n, m = len(dst), len(src)
    s0, s1 = max(0, start), min(n, start + m)
    if s1 > s0:
        dst[s0:s1] += src[s0 - start:s1 - start]


def env_db(y, win):
    p = (st(y) ** 2).sum(axis=1)
    w = max(1, ns(win))
    c = np.concatenate([[0.0], np.cumsum(p)])
    i = np.arange(len(p))
    lo, hi = np.clip(i - w // 2, 0, len(p)), np.clip(i - w // 2 + w, 0, len(p))
    return 10 * np.log10((c[hi] - c[lo]) / w + 1e-12)


_SP = butter(4, [300 / (SR / 2), 4000 / (SR / 2)], "band", output="sos")


def bp_speech(x):
    return sosfilt(_SP, st(x), axis=0)


def rms_db(x, t0, t1):
    s = st(x)[max(0, ns(t0)):max(ns(t0) + 1, ns(t1))]
    return float(10 * np.log10(np.mean(s ** 2) + 1e-20)) if len(s) else -200.0


def integrated(x):
    return ac.integrated_lufs(st(x), SR)


def momentary(x):
    return ac.loudness_curve(st(x), SR, 0.4)


def band_levels(x, mask):
    x = st(x)
    out = []
    for lo, hi in BANDS:
        s = butter(4, [lo / (SR / 2), min(hi, 0.95 * SR / 2) / (SR / 2)], "band", output="sos")
        p = (sosfilt(s, x, axis=0) ** 2).sum(axis=1)
        out.append(float(10 * np.log10(np.mean(p[mask]) + 1e-20)) if mask.any() else float("nan"))
    return out


def tob_frames(x, hop):
    """(frames, bands) energy in dB of mono x in third-octave bands, `hop`-sample frames."""
    m = st(x).mean(axis=1)
    k = len(m) // hop
    out = np.zeros((k, len(TOB)))
    for j, fc in enumerate(TOB):
        s = butter(3, [fc / 2 ** (1 / 6) / (SR / 2), fc * 2 ** (1 / 6) / (SR / 2)], "band", output="sos")
        y = sosfilt(s, m)[: k * hop].reshape(k, hop)
        out[:, j] = 10 * np.log10(np.mean(y ** 2, axis=1) + 1e-20)
    return out


def word_clarity(vo, bg, words):
    """Per word, 20 ms frames over the word's voiced part (frames within 20 dB of the phrase level,
    the 90th percentile of the voice's speech-band frames within +-0.75 s):
      snr_med      median speech-band (300 Hz - 4 kHz) voice/background ratio over voiced frames, dB
      snr_p10      its 10th percentile (the word's most crowded moments)
      index        SII-like audibility: importance-weighted mean of clip((V - B + 15) / 30, 0, 1)
                   over the word's speech cells (1.0 = every cell at least 15 dB clear)
      masked_cells importance-weighted share of speech cells where the background is louder
    When a word's entry holds fewer than 2 voiced frames, the window is widened 0.25 s back."""
    hop = ns(0.02)
    V = tob_frames(vo, hop)
    B = tob_frames(bg, hop)
    sp = [j for j, f in enumerate(TOB) if 300 <= f <= 4000]
    Vs = 10 * np.log10(np.sum(10 ** (V[:, sp] / 10), axis=1) + 1e-20)
    Bs = 10 * np.log10(np.sum(10 ** (B[:, sp] / 10), axis=1) + 1e-20)
    fr = lambda t: int(round(t * SR / hop))  # noqa: E731
    rows = []
    for w in words:
        f0 = min(fr(w["start"]), len(Vs) - 2)
        f1 = min(len(Vs), max(f0 + 2, fr(max(w["end"], w["start"] + 0.06))))
        near = Vs[max(0, fr(w["start"] - 0.75)):fr(w["end"] + 0.75)]
        near = near[near > -90]
        if len(near) == 0:
            continue
        ref = np.percentile(near, 90)
        shifted = False
        if np.sum(Vs[f0:f1] > ref - 20) < 2:
            f0, shifted = max(0, f0 - fr(0.25)), True
        vs = Vs[f0:f1]
        voiced = vs > min(ref - 20, vs.max() - 3)
        snr = (vs - Bs[f0:f1])[voiced]
        Vw, Bw = V[f0:f1][voiced], B[f0:f1][voiced]
        sc = Vw > Vw.max(axis=1, keepdims=True) - 25
        wts = np.broadcast_to(TOB_W, Vw.shape) * sc
        aud = np.clip((Vw - Bw + 15) / 30, 0, 1)
        masked = (Vw - Bw < 0) & sc
        rows.append({"word": w["word"], "t": w["start"], "t0": f0 * hop / SR, "t1": f1 * hop / SR,
                     "shifted": shifted, "level_re_phrase": float(vs.max() - ref),
                     "snr_med": float(np.median(snr)), "snr_p10": float(np.percentile(snr, 10)),
                     "index": float(np.sum(aud * wts) / np.sum(wts)),
                     "masked_cells": float(np.sum(wts * masked) / np.sum(wts))})
    return rows


def load_module(path):
    spec = importlib.util.spec_from_file_location("film_events", path)
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, os.path.dirname(os.path.abspath(path)))
    spec.loader.exec_module(mod)
    return mod


def generic_events(cfg):
    """Every cue rendered alone by sfx.py, at its level in the raw sfx.wav."""
    seed = cfg["seed"]
    out = []
    for i, c in enumerate(cfg["cues"]):
        kind = c.get("kind")
        if kind not in tsfx.GENERATORS:
            continue
        y, anchor = tsfx.render_event(c, SR, seed, i)
        out.append({"y": y.T, "s": ns(float(c["t"])) - anchor, "t": float(c["t"]), "anchor": anchor / SR,
                    "land": GENERIC_LAND.get(kind, "swell"), "id": c.get("id", kind), "kind": kind,
                    "row": c.get("row", ""), "lu": c.get("lu")})
    return out


def check_event(e, sfx_stem, env_stem1, scale, n):
    """Where one isolated effect lands vs its cue, and its share of the effects stem."""
    y, s, t, land = e["y"], e["s"], e["t"], e["land"]
    en1, en20, en50 = env_db(y, 0.001), env_db(y, 0.02), env_db(y, 0.05)
    r = {"t_cue": t, "kind": e["kind"], "id": e["id"], "land": land, "row": e.get("row", "")}
    a_s = int(round(e["anchor"] * SR))
    if land in ("hit", "tap", "swell"):
        early = 0.005 if land == "hit" else 0.010
        lo = max(0, a_s - ns(early))
        pk = lo + int(np.argmax(en1[lo:a_s + ns(0.04)]))
        r["peak"] = (s + pk) / SR
        ok = -early <= r["peak"] - t <= 0.06
        if land in ("hit", "tap"):
            lo2 = max(0, a_s - ns(0.02))
            on = lo2 + int(np.argmax(en1[lo2:] > en1[pk] - 20.0))
            r["onset"] = (s + on) / SR
            r["err_ms"] = (r["onset"] - t) * 1000
            ok = ok and (-5.0 if land == "hit" else -15.0) <= r["err_ms"] <= 5.0
            i0 = ns(t)  # in the final effects stem: a clear rise at t
            before = float(np.mean(env_stem1[max(0, i0 - ns(0.06)):max(1, i0 - ns(0.008))]))
            after = float(np.max(env_stem1[i0:i0 + ns(0.03)])) if i0 < n else before
            r["stem_rise_db"] = after - before
            ok = ok and r["stem_rise_db"] >= 2.0
        else:
            r["onset"] = r["peak"]
            r["err_ms"] = (r["peak"] - t) * 1000
    elif land in ("peak", "sweep"):
        en = en20 if land == "peak" else en50
        pk = int(np.argmax(en))
        r["peak"] = (s + pk) / SR
        r["onset"] = (s + int(np.argmax(en > en[pk] - 20.0))) / SR
        r["err_ms"] = (r["peak"] - t) * 1000
        ok = abs(r["err_ms"]) <= (30.0 if land == "peak" else 60.0)
    else:  # start
        pk = int(np.argmax(en50))
        on = int(np.argmax(en50 > en50[pk] - 25.0))
        r["onset"], r["peak"] = (s + on) / SR, (s + pk) / SR
        r["err_ms"] = (r["onset"] - t) * 1000
        early = en50[: max(0, ns(t) - s - ns(0.03))]
        ok = -30.0 <= r["err_ms"] <= 300.0 and (len(early) == 0 or early.max() < en50[pk] - 40.0)
    own = (s + int(np.argmax(en50))) / SR
    w0, w1 = own - 0.1, own + 0.1
    yy = np.zeros((n, 2))
    place(yy, y, s)
    yy *= scale[:, None] if np.ndim(scale) else scale
    r["own_peak"] = own
    r["stem_share_db"] = rms_db(yy, w0, w1) - rms_db(sfx_stem, w0, w1)
    ok = ok and r["stem_share_db"] > -10.0
    r["ok"] = bool(ok)
    return r


def main(argv=None):
    ap = argparse.ArgumentParser(description="Verify a video's audio/mix.wav")
    ap.add_argument("video", help="the video folder")
    ap.add_argument("--events", help="a film's own effects script defining isolated_events(doc, vo, n)")
    ap.add_argument("--scratch", help="folder for the AAC test file and verify.json (default: a temp folder)")
    a = ap.parse_args(argv)
    audio = os.path.join(a.video, "audio")
    scratch = a.scratch or tempfile.mkdtemp(prefix="verify_mix_")
    os.makedirs(scratch, exist_ok=True)
    cues_p = os.path.join(audio, "cues.json")
    if not os.path.exists(cues_p):
        sys.exit(f"✗ {cues_p} is missing (run node tools/sound.mjs first)")
    cfg = ac.load_cues(cues_p)
    doc = cfg["raw"]
    n, dur = cfg["n"], cfg["duration"]
    side_p = os.path.join(audio, "mix.json")
    side = json.load(open(side_p)) if os.path.exists(side_p) else {"route": "stems", "settings": {}}
    sset = side.get("settings", {})
    fails, warns = [], []
    res = {"files": {}, "route": side.get("route")}

    # --- format
    paths = {k: os.path.join(audio, f"{k}.wav") for k in ("mix", "music", "sfx")}
    if not os.path.exists(paths["mix"]):
        sys.exit(f"✗ {paths['mix']} is missing (run node tools/sound.mjs first)")
    for k, pth in paths.items():
        if not os.path.exists(pth):
            continue
        i = sf.info(pth)
        res["files"][k] = {"sr": i.samplerate, "ch": i.channels, "subtype": i.subtype, "frames": i.frames}
        if (i.samplerate, i.channels, i.subtype, i.frames) != (SR, 2, "PCM_24", n):
            fails.append(f"{k}.wav is {i.samplerate} Hz {i.channels} ch {i.subtype} {i.frames} samples;"
                         f" want 48000 Hz 2 ch PCM_24 {n} samples ({dur} s)")
    mix = ac.fit_length(ac.read_audio(paths["mix"], SR), n)
    at = lambda p: os.path.normpath(os.path.join(audio, p)) if p else None  # noqa: E731  (mix.json paths are relative)
    vo_path = at(side.get("vo")) or cfg["vo"]
    has_vo = bool(vo_path and os.path.exists(vo_path))
    vo_raw = ac.fit_length(ac.read_audio(vo_path, SR), n) if has_vo else np.zeros((n, 2))
    if has_vo and not np.isfinite(integrated(vo_raw)):
        has_vo = False
    res["has_voice"] = has_vo
    mastered = has_vo or side.get("route") == "stems" or bool(sset.get("normalize"))

    # --- stems as they sit in the mix
    fx_scale = None
    if side.get("route") == "generic":
        vo_s, mus_s, sfx_s, hv, hm, hs = tmix.load_stems(cfg, at(side.get("vo")), at(side.get("music")),
                                                         at(side.get("sfx")), quiet=True)
        r = tmix.mixdown(cfg, vo_s, mus_s, sfx_s, hv, hm, hs, sset, side["ceiling_final"])
        diff = float(np.abs(r["y"] - mix).max())
        res["rebuild_max_abs_diff"] = diff
        if diff > 1e-4:
            fails.append(f"mix.wav does not match the current stems and settings (max diff {diff:.2e});"
                         " re-run the mix")
        music, sfx = r["mus_part"], r["sfx_part"]
        bed_stem = r["mus"] * r["gl"]  # the bed before the duck: what mix.py levels
        duck_s = ac.db2lin(-sset.get("duck_sfx", 0.0) * r["d"])
        fx_scale = ac.db2lin(r["g_s"]) * duck_s * r["gl"][:, 0]
    else:
        music = ac.fit_length(ac.read_audio(paths["music"], SR), n) if os.path.exists(paths["music"]) else np.zeros((n, 2))
        bed_stem = music  # a film's own mix levels the bed as heard
        sfx = ac.fit_length(ac.read_audio(paths["sfx"], SR), n) if os.path.exists(paths["sfx"]) else np.zeros((n, 2))

    # --- loudness / peaks
    m4a = os.path.join(scratch, "verify_aac256.m4a")
    subprocess.run([ac.FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", paths["mix"],
                    "-c:a", "aac", "-b:a", "256k", m4a], check=True)
    res["wav"] = ac.ffmpeg_ebur128(paths["mix"])
    res["aac256"] = ac.ffmpeg_ebur128(m4a)
    res["wav_I_pyln"] = integrated(mix)
    res["wav_TP_4x"] = ac.true_peak_db(mix)
    if mastered:
        if abs(res["wav"]["I"] - TARGET_I) > 0.1 or abs(res["wav_I_pyln"] - TARGET_I) > 0.1:
            fails.append(f"integrated {res['wav']['I']:.1f} / {res['wav_I_pyln']:.2f} LUFS, want {TARGET_I}")
        if abs(res["aac256"]["I"] - TARGET_I) > 0.2:
            warns.append(f"AAC integrated {res['aac256']['I']:.1f} LUFS")
    else:
        warns.append(f"no voice and not normalised: the mix sits at {res['wav']['I']:.1f} LUFS"
                     " (run mix.py with --normalize for -14 LUFS)")
    if not res["aac256"]["TP"] < AAC_TP_MAX:
        fails.append(f"AAC 256k true peak {res['aac256']['TP']:.2f} dBTP >= {AAC_TP_MAX}")

    words = []
    wp = os.path.join(a.video, "story", "words.json")
    if os.path.exists(wp):
        words = json.load(open(wp, encoding="utf-8"))

    # --- the voice: alignment with vo.wav, level of the bed
    vo = mix - music - sfx
    if has_vo:
        I_v = integrated(vo)
        res["voice_I"] = I_v
        end = min(dur - 0.05, (words[-1]["end"] + 0.5) if words else dur)
        seg = slice(ns(0.5), max(ns(0.5) + ns(1.0), ns(end)))
        xa, xb = vo[seg].mean(axis=1), vo_raw[seg].mean(axis=1)
        lags = np.arange(-48, 49)
        cc = [float(np.dot(xa[48:-48], np.roll(xb, k)[48:-48])) for k in lags]
        res["vo_alignment_lag_samples"] = int(lags[int(np.argmax(cc))])
        g = float(np.dot(xa, xb) / (np.dot(xb, xb) + 1e-20))
        res["vo_gain_db"] = float(20 * np.log10(abs(g) + 1e-20))
        res["vo_residual_db"] = float(10 * np.log10(np.mean((xa - g * xb) ** 2) / (np.mean(xa ** 2) + 1e-20) + 1e-20))
        if res["vo_alignment_lag_samples"] != 0:
            fails.append(f"the voice is offset by {res['vo_alignment_lag_samples']} samples from vo.wav")
        tt = cfg["title_t"]
        bed_end = ns(tt - 1.2) if (tt is not None and tt - 0.6 >= 3.0) else n
        res["bed_pre_title_re_voice"] = integrated(bed_stem[:bed_end]) - I_v
        want = sset.get("music_lu")
        if want is not None and abs(res["bed_pre_title_re_voice"] - want) > 1.5:
            warns.append(f"bed {res['bed_pre_title_re_voice']:+.1f} LU re voice (set {want:+.1f})")

    # --- every effect: where it lands vs its cue, and that it shows in the effects stem
    if a.events:
        mod = load_module(a.events)
        placed = mod.isolated_events(doc, vo_raw if has_vo else None, n)
        if fx_scale is None:
            if side.get("master_gain_db") is not None:
                fx_scale = float(ac.db2lin(side["master_gain_db"]))
            else:
                fx_scale = 1.0
    elif side.get("route") == "generic" and os.path.exists(paths["sfx"]):
        placed = generic_events(cfg)
    else:
        placed = []
        if cfg["cues"]:
            warns.append("effects not checked (no events script for this film's own effects)")
    if fx_scale is None:
        fx_scale = 1.0
    env_stem1 = env_db(sfx, 0.001)
    rows = [check_event(e, sfx, env_stem1, fx_scale, n) for e in placed]
    for r in rows:
        if not r["ok"]:
            fails.append(f"effect '{r['id']}' at {r['t_cue']:.3f}: lands {r['err_ms']:+.1f} ms,"
                         f" share {r['stem_share_db']:+.1f} dB"
                         + (f", rise {r['stem_rise_db']:+.1f} dB" if "stem_rise_db" in r else ""))
    res["effects"] = rows

    # --- clarity: background (music + effects) vs the voice, word by word
    wc = []
    if has_vo and words:
        bg = music + sfx
        wc = word_clarity(vo, bg, words)
        Mv, Mb = momentary(vo), momentary(bg)
        vo_sp = bp_speech(vo)
        sp = []
        for e in placed:
            yy = e["y"] * (np.mean(fx_scale) if np.ndim(fx_scale) else fx_scale)
            sp.append((e, bp_speech(yy)))
        for r in wc:
            s0, s1 = ns(r["t0"]), ns(max(r["t1"], r["t0"] + 0.08))
            r["momentary_med"] = float(np.median(Mv[s0:s1] - Mb[s0:s1]))
            best, who = -200.0, ""
            for e, ysp in sp:
                a0, a1 = max(s0, e["s"]), min(s1, e["s"] + len(ysp))
                if a1 - a0 > ns(0.005):
                    seg = ysp[a0 - e["s"]:a1 - e["s"]]
                    lv = float(10 * np.log10(np.sum(seg ** 2) / (2 * (s1 - s0)) + 1e-20))
                    if lv > best:
                        best, who = lv, e["id"]
            r["loudest_fx"] = who
            r["loudest_fx_re_voice_db"] = best - rms_db(vo_sp, r["t0"], s1 / SR) if who else None
        for r in wc:
            if r["masked_cells"] > 0.25 or r["index"] < 0.6 or r["snr_med"] < 8.0:
                fails.append(f"word '{r['word']}' at {r['t']:.2f}: clarity index {r['index']:.2f}, masked cells"
                             f" {100 * r['masked_cells']:.0f}%, speech-band SNR median {r['snr_med']:+.1f} dB"
                             f" (loudest effect: {r['loudest_fx'] or '-'})")
            elif r["masked_cells"] > 0.10 or r["snr_p10"] < 0.0 or r["snr_med"] < 12.0:
                warns.append(f"word '{r['word']}' at {r['t']:.2f}: SNR median {r['snr_med']:+.1f}, p10"
                             f" {r['snr_p10']:+.1f} dB, masked cells {100 * r['masked_cells']:.0f}%"
                             f" ({r['loudest_fx'] or '-'})")
        spk = np.zeros(n, bool)
        for w in words:
            spk[ns(w["start"]):ns(max(w["end"], w["start"] + 0.05))] = True
        res["bg_re_voice_speaking_LU"] = (float(10 * np.log10(np.mean(10 ** (Mb[spk] / 10)) + 1e-20))
                                          - float(10 * np.log10(np.mean(10 ** (Mv[spk] / 10)) + 1e-20)))
        res["bands"] = {"edges": BANDS, "bg_speech": band_levels(bg, spk), "bg_gaps": band_levels(bg, ~spk),
                        "voice_speech": band_levels(vo, spk)}
    elif has_vo:
        warns.append("story/words.json is missing: word clarity not checked")
    res["words"] = wc

    # --- start / end fades
    fade = tmix.fade_len(cfg, sset.get("fade_out")) if side.get("route") == "generic" \
        else float(sset.get("fade_out", doc.get("fade_s", 1.2)))
    fade = max(fade, 0.2)
    fd = {"max_abs_first_2ms": float(np.abs(mix[:ns(0.002)]).max()),
          "mix_before_fade": rms_db(mix, dur - fade - 0.3, dur - fade),
          "mix_fade_mid": rms_db(mix, dur - fade / 2 - 0.1, dur - fade / 2 + 0.1),
          "mix_last_100ms": rms_db(mix, dur - 0.1, dur),
          "mix_last_10ms_peak_db": float(ac.lin2db(np.abs(mix[-ns(0.01):]).max())),
          "fade_s": fade}
    res["fades"] = fd
    if fd["max_abs_first_2ms"] > 1e-3:
        fails.append(f"start not faded: {fd['max_abs_first_2ms']:.4f} in the first 2 ms")
    if fd["mix_last_10ms_peak_db"] > -60.0:
        fails.append(f"end not faded: last 10 ms peak {fd['mix_last_10ms_peak_db']:.1f} dBFS")
    elif not (fd["mix_before_fade"] > fd["mix_fade_mid"] > fd["mix_last_100ms"]):
        warns.append("the end fade is not falling smoothly")
    json.dump(res, open(os.path.join(scratch, "verify.json"), "w"), indent=1, default=float)

    # --- print
    fi = res["files"]["mix"]
    print(f"mix.wav {fi['frames']} samples = {fi['frames'] / SR:.3f} s @ {fi['sr']} Hz, {fi['ch']} ch, {fi['subtype']}"
          f"  (route: {side.get('route')}, voice: {'yes' if has_vo else 'no'})")
    if "rebuild_max_abs_diff" in res:
        print(f"  rebuilt from the stems: max difference {res['rebuild_max_abs_diff']:.1e}")
    print(f"  wav : I {res['wav']['I']:.1f} LUFS (pyloudnorm {res['wav_I_pyln']:.2f}), TP {res['wav']['TP']:.2f} dBTP"
          f" (4x {res['wav_TP_4x']:.2f}), LRA {res['wav']['LRA']:.1f}")
    print(f"  AAC 256k: I {res['aac256']['I']:.1f} LUFS, TP {res['aac256']['TP']:.2f} dBTP (must be < {AAC_TP_MAX})")
    if has_vo:
        print(f"  voice {res['voice_I']:.1f} LUFS at lag {res['vo_alignment_lag_samples']} samples"
              f" (gain {res['vo_gain_db']:+.2f} dB, residual {res['vo_residual_db']:.1f} dB);"
              f" bed pre-title {res['bed_pre_title_re_voice']:+.1f} LU"
              + (f"; background while speaking {res['bg_re_voice_speaking_LU']:+.1f} LU" if wc else ""))
    if rows:
        print("   cue t   kind            land   onset    peak    err ms  share  rise   id")
        for r in rows:
            rise = f"{r['stem_rise_db']:+5.1f}" if "stem_rise_db" in r else "     "
            print(f"  {r['t_cue']:7.3f} {r['kind']:15s} {r['land']:5s} {r['onset']:7.3f} {r['peak']:7.3f}"
                  f" {r['err_ms']:+7.1f} {r['stem_share_db']:+6.1f} {rise}   {r['id']}{'' if r['ok'] else '  <-- FAIL'}")
    if wc:
        worst = sorted(wc, key=lambda r: r["index"])
        print(f"  word clarity: min index {worst[0]['index']:.2f}, max masked cells"
              f" {100 * max(r['masked_cells'] for r in wc):.0f}%, min speech-band SNR median"
              f" {min(r['snr_med'] for r in wc):+.1f} dB, median {float(np.median([r['snr_med'] for r in wc])):+.1f} dB")
        print("  5 most crowded words (index, masked, SNR median / p10, loudest effect):")
        for r in worst[:5]:
            fx = f"{r['loudest_fx']} {r['loudest_fx_re_voice_db']:+.1f} dB" if r["loudest_fx"] else "-"
            print(f"    {r['word']:12s} {r['t']:6.2f}  {r['index']:.2f}  {100 * r['masked_cells']:3.0f}%"
                  f"  {r['snr_med']:+5.1f} / {r['snr_p10']:+5.1f}   {fx}")
    print(f"  start: max |x| in the first 2 ms {fd['max_abs_first_2ms']:.1e};  end: {fd['mix_before_fade']:.1f} dBFS"
          f" before the {fade:.1f} s fade, {fd['mix_fade_mid']:.1f} mid-fade, {fd['mix_last_100ms']:.1f} last 100 ms,"
          f" last 10 ms peak {fd['mix_last_10ms_peak_db']:.1f} dBFS")
    for w in warns:
        print(f"  warn: {w}")
    for f in fails:
        print(f"  FAIL: {f}")
    print(f"  report: {os.path.join(scratch, 'verify.json')}")
    print("VERIFY: " + ("PASS" if not fails else f"FAIL ({len(fails)})") + (f", {len(warns)} warnings" if warns else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
