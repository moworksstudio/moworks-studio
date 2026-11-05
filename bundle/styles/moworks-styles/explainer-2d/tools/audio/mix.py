#!/usr/bin/env python3
"""Loudness-correct mixer: voice + music bed + effects -> mix.wav (+ mix.m4a, mix.json).

    node tools/py.mjs tools/audio/mix.py --cues <video>/audio/cues.json --out-dir <video>/audio

Reads the voice-over (cues.json "vo", relative to the cues.json folder), <out-dir>/sfx.wav and
<out-dir>/music.wav, then:
  * balances by K-weighted loudness (ITU-R BS.1770): music bed integrated at --music-lu re the
    voice; effects' per-cue momentary peaks (median) at --sfx-lu re the voice (per-kind trims and
    cue gain_db are respected); with no voice, --music-lu-alone and --sfx-lu-alone instead,
  * ducks the bed --duck-music dB and the effects up to --duck-sfx dB under every word (sidechain
    from the voice envelope, 40 ms attack / 300 ms release),
  * fades the start in over 5 ms and the end out over --fade-out s,
  * masters with gain + a 5 ms look-ahead true-peak limiter to --target-lufs (-14) integrated with
    a --ceiling (-2.9 dBTP) ceiling, writes mix.wav (24-bit) and mix.m4a (AAC 256k, the delivery
    codec) and checks the m4a true peak with ffmpeg ebur128 (<= --tp-limit; if the encoder
    overshoots, the ceiling is lowered and the master redone),
  * writes mix.json: the settings, the final ceiling and the stems used (paths relative to the
    mix.json folder), so verify_mix.py can rebuild every stem exactly as it sits in mix.wav.
With no voice the stems are placed against a virtual voice at the target. Without --normalize
the level is then left as it is; with --normalize (silent films) the mix is mastered to the
target as well.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_common as ac  # noqa: E402


# --------------------------------------------------------------------------- sidechain
def duck_curve(vo, sr, attack=0.040, release=0.300, ctrl_rate=1000):
    """0..1 'voice present' control signal at audio rate, with ballistics."""
    n = len(vo)
    x = ac.sos_filter(vo.mean(axis=1), "band", (100.0, 5000.0), sr, 2)
    hop = max(1, sr // ctrl_rate)
    win = int(0.010 * sr)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    centers = np.arange(0, n, hop)
    lo = np.clip(centers - win // 2, 0, n)
    hi = np.clip(centers + win // 2, 0, n)
    ms = (c[hi] - c[lo]) / np.maximum(hi - lo, 1)
    env_db = 10 * np.log10(ms + 1e-20)
    active = env_db[env_db > -80]
    if len(active) < 10:
        return np.zeros(n)
    ref = np.percentile(active, 95)
    key = np.clip((env_db - (ref - 32.0)) / 12.0, 0.0, 1.0)  # full duck within 20 dB of speech peaks
    a_att = np.exp(-1.0 / (attack * ctrl_rate))
    a_rel = np.exp(-1.0 / (release * ctrl_rate))
    d = np.empty_like(key)
    y = 0.0
    for i, k in enumerate(key):
        a = a_att if k > y else a_rel
        y = a * y + (1.0 - a) * k
        d[i] = y
    return np.interp(np.arange(n), centers, d)


# --------------------------------------------------------------------------- limiter
def limiter(x, sr, ceiling_db, lookahead=0.005, release_db_s=30.0):
    """Offline look-ahead true-peak limiter. Gain reduction reaches its target
    before each over (5 ms box-smoothed attack over the look-ahead window) and
    recovers linearly in dB. Returns (y, max_gr_db)."""
    n = len(x)
    L = max(1, int(round(lookahead * sr)))
    tp = ac.true_peak_per_sample(x)
    gr = np.maximum(0.0, ac.lin2db(tp) - ceiling_db)
    if gr.max() <= 0.0:
        return x.copy(), 0.0, np.ones(n)
    m = ac.sliding_max_forward(gr, L)  # need >= gr[k..k+L-1]
    r = release_db_s / sr
    K = int(min(n, np.ceil(m.max() / r) + 2))
    idx = np.arange(n, dtype=np.float64)
    rel = ac.sliding_max_backward(m + idx * r, K) - idx * r
    rel = np.maximum(rel, m)
    c = np.concatenate([[0.0], np.cumsum(rel)])
    ii = np.arange(n)
    lo = np.maximum(ii - L + 1, 0)
    sm = (c[ii + 1] - c[lo]) / (ii + 1 - lo)
    g = ac.db2lin(-sm)
    return x * g[:, None], float(sm.max()), g


def master(pre, sr, target, ceiling, fixed_gain=None):
    """Gain + limiter, iterated until the limited mix hits `target` LUFS
    (or a single pass at `fixed_gain` dB). Returns (y, static_gain_db,
    max_gr_db, gain_curve) with y = pre * gain_curve."""
    G = target - ac.integrated_lufs(pre, sr) if fixed_gain is None else fixed_gain
    for _ in range(6 if fixed_gain is None else 1):
        y, gr, g = limiter(pre * ac.db2lin(G), sr, ceiling)
        if fixed_gain is not None:
            break
        err = target - ac.integrated_lufs(y, sr)
        if abs(err) <= 0.03:
            break
        G += err
    curve = g * ac.db2lin(G)
    tp = ac.true_peak_db(y)
    if tp > ceiling:
        trim = ac.db2lin(ceiling - tp - 0.01)
        y, curve = y * trim, curve * trim
    return y, G, gr, curve


def encode_m4a(wav, m4a, bitrate="256k"):
    subprocess.run([ac.FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", wav,
                    "-c:a", "aac", "-b:a", bitrate, "-movflags", "+faststart", m4a], check=True)


# --------------------------------------------------------------------------- measuring
def per_cue_peaks(sfx, sr, cues):
    """Max momentary (400 ms) loudness of the effects track around each cue."""
    curve = ac.loudness_curve(sfx, sr, 0.4)
    n = len(curve)
    res = []
    for c in cues:
        if c.get("kind") not in ac.SFX_TRIM_LU:
            continue
        t = float(c.get("t", 0))
        a, b = int(max(0, (t - 0.3)) * sr), int(min(n, (t + 0.8) * sr))
        if b - a < 10:
            continue
        pk = float(curve[a:b].max())
        if pk < -70.0:
            continue
        off = ac.SFX_TRIM_LU.get(c.get("kind"), 0.0) + float(c.get("gain_db", 0.0))
        res.append((t, c.get("kind"), pk, off))
    return res


def mean_loudness_where(x, sr, mask):
    curve = ac.loudness_curve(x, sr, 0.4)
    if mask.sum() < sr * 0.4:
        return float("nan")
    return float(10 * np.log10(np.mean(10 ** (curve[mask] / 10)) + 1e-20))


# --------------------------------------------------------------------------- mixdown
SETTING_KEYS = ("target_lufs", "ceiling", "tp_limit", "music_lu", "music_lu_alone", "sfx_lu", "sfx_lu_alone",
                "duck_music", "duck_sfx", "normalize", "fade_out")


def fade_len(cfg, fade_out):
    """End fade in seconds: --fade-out, else cues.json fade_s, else 1.0 s; at most 20 % of the film."""
    f = fade_out if fade_out is not None else float(cfg["raw"].get("fade_s", 1.0))
    return max(0.0, min(f, 0.2 * cfg["duration"]))


def load_stems(cfg, vo_path, mus_path, sfx_path, quiet=False):
    """-> (vo, mus, sfx, has_vo, has_mus, has_sfx), each (n, 2) at the film length."""
    sr, n = cfg["sr"], cfg["n"]

    def load(path, label):
        if path and os.path.exists(path):
            x = ac.read_audio(path, sr)
            if len(x) > n + int(0.05 * sr):
                if not quiet:
                    print(f"  ! {label} is {len(x) / sr:.2f}s, longer than duration {cfg['duration']:.2f}s; truncating")
                x = ac.fit_length(x, n)
                f = int(0.05 * sr)
                x[-f:] *= np.linspace(1, 0, f)[:, None]
            return ac.fit_length(x, n), True
        if not quiet:
            print(f"  ! {label} not found ({path}); using silence")
        return np.zeros((n, 2)), False

    vo, has_vo = load(vo_path, "vo")
    mus, has_mus = load(mus_path, "music")
    sfx, has_sfx = load(sfx_path, "sfx")
    if has_vo and not np.isfinite(ac.integrated_lufs(vo, sr)):
        has_vo = False  # a silent file counts as no voice
    return vo, mus, sfx, has_vo, has_mus, has_sfx


def mixdown(cfg, vo, mus, sfx, has_vo, has_mus, has_sfx, s, ceiling):
    """The whole mix as a pure function of the stems and the settings `s` (a dict of SETTING_KEYS).
    `ceiling` is the limiter ceiling of the final master (s["ceiling"] is the first try).
    Returns a dict: y (the mix), vo_part / mus_part / sfx_part (each stem exactly as it sits in y,
    so vo_part + mus_part + sfx_part = y), and the numbers behind them."""
    sr, n = cfg["sr"], cfg["n"]
    mus, sfx = mus.copy(), sfx.copy()
    L_v = ac.integrated_lufs(vo, sr) if has_vo else s["target_lufs"]
    # with no voice the bed is the main layer: it and the effects sit closer to the (virtual) voice level
    music_lu = s["music_lu"] if has_vo else s.get("music_lu_alone", -10.0)
    sfx_lu = s["sfx_lu"] if has_vo else s.get("sfx_lu_alone", -6.0)

    # --- static balance by loudness; the bed is levelled on the part before the title swell
    bed_end = n
    tt = cfg["title_t"]
    if tt is not None and tt - 0.6 >= 3.0:
        bed_end = int((min(tt, cfg["duration"]) - 1.2) * sr)
    g_m = 0.0
    if has_mus:
        L_m = ac.integrated_lufs(mus[:bed_end], sr)
        g_m = (L_v + music_lu) - L_m if np.isfinite(L_m) else 0.0
    mus *= ac.db2lin(g_m)

    def sfx_ref(x):
        pk = per_cue_peaks(x, sr, cfg["cues"])
        if pk:
            return float(np.median([p_ - off for _, _, p_, off in pk]))
        return ac.max_momentary(x, sr)

    g_s = 0.0
    if has_sfx:
        ref = sfx_ref(sfx)
        g_s = (L_v + sfx_lu) - ref if np.isfinite(ref) else 0.0
    sfx *= ac.db2lin(g_s)

    # --- sidechain duck
    d = duck_curve(vo, sr) if has_vo else np.zeros(n)
    duck_m = ac.db2lin(-s["duck_music"] * d)[:, None]
    duck_s = ac.db2lin(-s["duck_sfx"] * d)[:, None]

    # --- start and end fades (applied to the whole mix before mastering)
    env = np.ones(n)
    fi = min(n, int(0.005 * sr))
    env[:fi] = 0.5 - 0.5 * np.cos(np.pi * np.arange(fi) / fi)
    fo = int(fade_len(cfg, s["fade_out"]) * sr)
    if fo > 0:
        env[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    env = env[:, None]

    fixed = None if (has_vo or s["normalize"]) else 0.0

    # The limiter mostly catches voice peaks, which nudges the voice down a little relative to
    # the stems: re-measure after mastering and correct once.
    mus_d, sfx_d = mus * duck_m, sfx * duck_s
    if has_vo:
        _, _, _, curve = master((vo + mus_d + sfx_d) * env, sr, s["target_lufs"], s["ceiling"])
        gl = curve[:, None] * env
        I_v0 = ac.integrated_lufs(vo * gl, sr)
        if has_mus:
            err = (I_v0 + s["music_lu"]) - ac.integrated_lufs((mus * gl)[:bed_end], sr)
            if np.isfinite(err):
                mus *= ac.db2lin(err)
                g_m += err
        if has_sfx:
            ref = sfx_ref(sfx * gl)
            if np.isfinite(ref):
                err = (I_v0 + s["sfx_lu"]) - ref
                sfx *= ac.db2lin(err)
                g_s += err
        mus_d, sfx_d = mus * duck_m, sfx * duck_s

    pre = (vo + mus_d + sfx_d) * env
    y, G, gr, curve = master(pre, sr, s["target_lufs"], ceiling, fixed)
    gl = curve[:, None] * env
    return {"y": y, "vo_part": vo * gl, "mus_part": mus_d * gl, "sfx_part": sfx_d * gl,
            "mus": mus, "sfx": sfx, "gl": gl, "d": d, "G": G, "gr": gr, "g_m": g_m, "g_s": g_s,
            "bed_end": bed_end, "L_v": L_v, "fixed": fixed}


# --------------------------------------------------------------------------- main
def main(argv=None):
    p = argparse.ArgumentParser(description="Loudness-correct mix of vo + music + sfx -> mix.wav / mix.m4a")
    p.add_argument("--cues", required=True, help="path to cues.json")
    p.add_argument("--out-dir", help="dir holding sfx.wav/music.wav and receiving mix.* (default: <cues dir>/audio)")
    p.add_argument("--vo", help="override voice-over path")
    p.add_argument("--sfx", help="override sfx.wav path")
    p.add_argument("--music", help="override music.wav path")
    p.add_argument("--target-lufs", type=float, default=-14.0)
    p.add_argument("--ceiling", type=float, default=-2.9, help="limiter true-peak ceiling, dBTP")
    p.add_argument("--tp-limit", type=float, default=-2.2, help="max true peak allowed on the m4a, dBTP")
    p.add_argument("--music-lu", type=float, default=-21.0, help="music bed re voice, LU")
    p.add_argument("--music-lu-alone", type=float, default=-10.0,
                   help="music bed re the virtual voice when there is no voice, LU (the bed is then the main layer)")
    p.add_argument("--sfx-lu", type=float, default=-9.0, help="effects peak re voice, LU")
    p.add_argument("--sfx-lu-alone", type=float, default=-6.0,
                   help="effects peak re the virtual voice when there is no voice, LU")
    p.add_argument("--duck-music", type=float, default=7.0, help="bed duck depth, dB")
    p.add_argument("--duck-sfx", type=float, default=4.0, help="effects duck depth, dB")
    p.add_argument("--fade-out", type=float, help="end fade, s (default: cues.json fade_s, else 1.0; 0 = off)")
    p.add_argument("--normalize", action="store_true",
                   help="with no voice, master the music + effects to --target-lufs too (silent films)")
    p.add_argument("--no-m4a", action="store_true")
    a = p.parse_args(argv)
    t0 = time.time()

    cfg = ac.load_cues(a.cues)
    sr, n = cfg["sr"], cfg["n"]
    out_dir = a.out_dir or ac.default_out_dir(cfg)
    vo_path = a.vo or cfg["vo"]
    sfx_path = a.sfx or os.path.join(out_dir, "sfx.wav")
    mus_path = a.music or os.path.join(out_dir, "music.wav")
    vo, mus, sfx, has_vo, has_mus, has_sfx = load_stems(cfg, vo_path, mus_path, sfx_path)
    s = {k: getattr(a, k) for k in SETTING_KEYS}
    if not has_vo:
        if a.normalize:
            print(f"  no voice: stems placed against a virtual voice; the mix is mastered to {a.target_lufs} LUFS")
        else:
            print(f"  ! no voice: stems placed relative to a virtual voice at {a.target_lufs} LUFS;"
                  " integrated target not applied (use --normalize for a silent film)")

    wav_path = os.path.join(out_dir, "mix.wav")
    m4a_path = os.path.join(out_dir, "mix.m4a")
    ceiling = a.ceiling
    m4a = None
    for attempt in range(4):
        r = mixdown(cfg, vo, mus, sfx, has_vo, has_mus, has_sfx, s, ceiling)
        y = r["y"]
        ac.write_wav(wav_path, y, sr)
        if a.no_m4a:
            break
        encode_m4a(wav_path, m4a_path)
        m4a = ac.ffmpeg_ebur128(m4a_path)
        if not (m4a["TP"] > a.tp_limit):
            break
        over = m4a["TP"] - a.tp_limit
        print(f"  ! m4a true peak {m4a['TP']:.2f} dBTP > {a.tp_limit}; lowering ceiling by {over + 0.15:.2f} dB")
        ceiling -= over + 0.15
    wav_ff = ac.ffmpeg_ebur128(wav_path)

    # --- measurements: every stem as it actually sits in mix.wav (master gain + the limiter's
    # gain curve + the fades applied), so the numbers add up to the mix.
    gl, d, bed_end, G, gr = r["gl"], r["d"], r["bed_end"], r["G"], r["gr"]
    mus, sfx, mus_d, sfx_d = r["mus"], r["sfx"], r["mus_part"], r["sfx_part"]
    I_mix = ac.integrated_lufs(y, sr)
    tp_int = ac.true_peak_db(y)
    I_v = ac.integrated_lufs(r["vo_part"], sr) if has_vo else a.target_lufs
    I_bed = ac.integrated_lufs((mus * gl)[:bed_end], sr) if has_mus else float("nan")
    I_m = ac.integrated_lufs(mus * gl, sr) if has_mus else float("nan")
    I_md = ac.integrated_lufs(mus_d, sr) if has_mus else float("nan")
    speaking = d > 0.5
    mus_spk = mean_loudness_where(mus_d, sr, speaking) if has_mus else float("nan")
    vo_spk = mean_loudness_where(r["vo_part"], sr, speaking) if has_vo else float("nan")
    pk_pre = per_cue_peaks(sfx * gl, sr, cfg["cues"]) if has_sfx else []
    pk_post = per_cue_peaks(sfx_d, sr, cfg["cues"]) if has_sfx else []

    here = lambda p: os.path.relpath(os.path.abspath(p), os.path.abspath(out_dir))  # noqa: E731  (folder moves keep working)
    side = {
        "route": "generic", "cues": here(a.cues),
        "vo": here(vo_path) if has_vo else None,
        "music": here(mus_path) if has_mus else None,
        "sfx": here(sfx_path) if has_sfx else None,
        "settings": s, "ceiling_final": ceiling, "has_vo": has_vo,
        "measured": {"mix_I": I_mix, "mix_TP_4x": tp_int, "voice_I": I_v if has_vo else None,
                     "bed_pre_title_re_voice": (I_bed - I_v) if (has_mus and has_vo) else None,
                     "master_gain_db": G, "limiter_max_gr_db": gr,
                     "m4a": m4a, "wav": wav_ff},
    }
    json.dump(side, open(os.path.join(out_dir, "mix.json"), "w"), indent=1)

    print(f"mix.py: {wav_path}" + ("" if a.no_m4a else f" + {m4a_path}") + f"  ({time.time() - t0:.1f}s)")
    print("  stems (final scale, LU re voice):")
    if has_vo:
        print(f"    voice   integrated {I_v:6.1f} LUFS   (0.0)")
    if has_mus and not has_vo:
        print(f"    music   bed (pre-title) {I_bed:6.1f} LUFS; whole track {I_m:6.1f} LUFS")
    if has_mus and has_vo:
        print(f"    music   bed (pre-title) {I_bed:6.1f} LUFS  ({I_bed - I_v:+.1f} LU, target {a.music_lu:+.1f});"
              f" whole track {I_m:6.1f} ({I_m - I_v:+.1f}); after duck {I_md:6.1f} ({I_md - I_v:+.1f})")
        if np.isfinite(mus_spk):
            print(f"            while speaking: music {mus_spk:.1f} vs voice {vo_spk:.1f}  ({mus_spk - vo_spk:+.1f} LU)")
    if pk_pre and not has_vo:
        print(f"    sfx     per-cue momentary peaks {min(p_ for _, _, p_, _ in pk_pre):.1f} .. "
              f"{max(p_ for _, _, p_, _ in pk_pre):.1f} LUFS")
    if pk_pre and has_vo:
        rel = np.array([pk - off - I_v for _, _, pk, off in pk_pre])
        raw = np.array([pk - I_v for _, _, pk, _ in pk_pre])
        rel_post = np.array([pk - I_v for _, _, pk, _ in pk_post])
        print(f"    sfx     per-cue momentary peak, median {np.median(rel):+.1f} LU (trim/gain_db removed,"
              f" target {a.sfx_lu:+.1f}); as heard {np.median(raw):+.1f} [{raw.min():+.1f} .. {raw.max():+.1f}]"
              f"; after duck {np.median(rel_post):+.1f}")
        for (t, kind, pk, off), (_, _, pk2, _) in zip(pk_pre, pk_post):
            print(f"      {t:7.3f}s {kind:16s} {pk - I_v:+6.1f} LU  (trim+gain {off:+.1f}, ducked {pk2 - I_v:+6.1f})")
    print(f"  balance: music {r['g_m']:+.2f} dB, sfx {r['g_s']:+.2f} dB (static, before duck)")
    print(f"  master: gain {G:+.2f} dB, limiter max GR {gr:.2f} dB, ceiling {ceiling:.2f} dBTP")
    print(f"  mix.wav   integrated {I_mix:6.2f} LUFS   true peak {tp_int:6.2f} dBTP (4x)   "
          f"ffmpeg: I {wav_ff['I']:.1f} LUFS, TP {wav_ff['TP']:.2f} dBTP, LRA {wav_ff['LRA']:.1f} LU")
    if m4a is not None:
        ok = "OK" if m4a["TP"] <= a.tp_limit else "OVER"
        print(f"  mix.m4a   ffmpeg: I {m4a['I']:.1f} LUFS, TP {m4a['TP']:.2f} dBTP ({ok}, limit {a.tp_limit}),"
              f" LRA {m4a['LRA']:.1f} LU")


if __name__ == "__main__":
    main()
