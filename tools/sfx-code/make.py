"""Make sound effects by code for one film (packages/sfx/code.mjs runs it at Final Mix): every job is one sound, from

    a recipe of the app's own        "impact", "writing", "door"…      (tools/sfx-code/recipes.py)
    a recipe of the owner's styles   "style:story/build_stickman:pop" (their source skills in bundle/styles/moworks-styles, run as they
                                     ship; Ricks Clip's "style:ricks-clip/audio:thunk", a synth of its worked example's audio.py;
                                     "kit:" is the prefix's name before #1061, read the same)
    a recipe Claude wrote            "user:<file>.py"                 (sandbox.py: only sound, nothing else)

with its parameters and a seed, then pitched (pitch, semitones), brightened or darkened (bright, -1 to 1), DC-blocked, its silence before the
attack trimmed (4 ms kept) and after its tail, levelled by loudness (BS.1770 momentary max, sfxlib) to its target with its peak at most
-1 dBFS, a short fade at its end, written as 16-bit WAV at 48 kHz. The same job always writes the same samples.

    python -I make.py <jobs.json>      jobs.json: { "sources": <bundle/styles/moworks-styles>, "jobs": [{ recipe, params, seed, pitch, bright, target, out }] }

The last line of stdout is the answer: { ok, made: [{ out, seconds, channels, peak_db, mmax, dc, edge }], failed: [{ out, error }] }.
"""
import importlib.util
import json
import os
import sys
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
libs = os.environ.get("MW_PYLIBS")
if libs and os.path.isdir(libs):
    sys.path.insert(0, libs)

MAX_S = 8.0


def setup(sources):
    # the owner's sfxlib, as the Story source skill ships it, is the ingredients of every recipe here
    sys.path.insert(0, str(Path(sources) / "story" / "tools" / "sfx"))
    sys.path.insert(1, str(HERE))
    try:
        import soundfile  # noqa: F401  (the 2D Explainer's audio_common imports it; its generators never use it)
    except Exception:
        import types

        sys.modules["soundfile"] = types.ModuleType("soundfile")


_mods = {}


def source_module(sources, source, mod):
    key = f"{source}/{mod}"
    if key not in _mods:
        folder = Path(sources) / source / "tools" / ("audio" if mod == "sfx" else "sfx")
        if str(folder) not in sys.path:
            sys.path.insert(2, str(folder))
        spec = importlib.util.spec_from_file_location(f"mwstyle_{source.replace('-', '_')}_{mod}", folder / f"{mod}.py")
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        _mods[key] = m
    return _mods[key]


# the 2D Explainer's generators take a cue: its own default length of each kind (tools/make-code-sfx.mjs X2_KINDS)
X2_DUR = {"pop": 0.4, "pop_big": 0.4, "tick": 0.4, "counter_roll": 1.0, "whoosh_pullback": 1.2, "whoosh_dive": 1.1, "impact": 0.4, "reveal": 2.0,
          "light_hit": 0.4, "sparkle": 0.4, "swish": 0.4, "title": 4.0}


# Ricks Clip (the owner's skill cartoon-audio-short): its synths live in its worked example's audio.py, above its cue table (`F = lambda`);
# they are run as shipped, each called as the cue table calls it (tools/make-code-sfx.mjs RC_KINDS), their module rng the take's own
RC_CALLS = {"whoosh": ("whoosh", (0.6,)), "leaves": ("leaves", (2.2,)), "thunk": ("thunk", (85, 0.35)), "rumble": ("rumble", (2.2,)), "crash": ("crash", (1.4,)),
            "cuckoo": ("cuckoo", ()), "snore": ("snore", (1.15,)), "scrape": ("scrape", (0.9,)), "ting": ("ting", ()), "sting": ("sting", ()),
            "creak": ("creak", (0.55, 120)), "creak-low": ("creak", (0.8, 90)), "snap": ("snap", ()), "splash": ("splash", (1.0,)), "water": ("water", (8.0,))}


def ricks_synths(sources):
    if "ricks-clip" not in _mods:
        text = (Path(sources) / "ricks-clip" / "kit" / "example" / "soldier" / "audio.py").read_text(encoding="utf-8")
        cut = text.index("\nF = lambda")
        ns = {"__name__": "mwstyle_ricks_clip_audio"}
        exec(compile(text[:cut], "ricks-clip/kit/example/soldier/audio.py", "exec"), ns)
        _mods["ricks-clip"] = ns
    return _mods["ricks-clip"]


def recipe_of(job, sources):
    """(fn(rng, p) -> array, the recipe's own seed or None, its own loudness target or None)"""
    r = job["recipe"]
    if r.startswith("kit:"):
        r = "style:" + r[4:]  # a recipe named before #1061
    if r.startswith("style:ricks-clip/"):
        name = r.split(":", 2)[2]
        ns, (fn, args) = ricks_synths(sources), RC_CALLS[name]

        def run(rng, p, ns=ns, fn=fn, args=args):
            import numpy as np

            ns["rng"] = rng
            return np.asarray(ns[fn](*args), dtype=np.float64)

        return run, None, None
    if r.startswith("style:"):
        source_mod, name = r[6:].split(":", 1)
        source, mod = source_mod.split("/", 1)
        m = source_module(sources, source, mod)
        if mod == "sfx":
            import numpy as np

            gen = m.GENERATORS[name]

            def run(rng, p, gen=gen, name=name, m=m):
                y, _ = gen(rng, 48000, {"t": 0.0, "kind": name, "dur": p.get("dur") or X2_DUR.get(name, 0.5)})
                if y.ndim == 1:
                    y = m.widen(y, rng, 48000, m.WIDTH.get(name, 0.2))
                return np.asarray(y).T

            return run, None, None
        row = m.SOUNDS[name]
        fn = row[0]
        seed = row[2] if len(row) > 3 and isinstance(row[2], int) else None
        if mod == "build_sounds":  # 3D Cartoon: its seeds are crc32 of the name
            seed = zlib.crc32(name.encode())
        return (lambda rng, p, fn=fn: fn(rng)), seed, row[1]
    if r.startswith("user:"):
        import sandbox

        make, _ = sandbox.load(r[5:])
        return make, None, None
    import recipes

    return recipes.RECIPES[r], None, None


def finish(x, target, pitch=0.0, bright=0.0):
    import numpy as np
    from scipy import signal

    import sfxlib as K

    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 2 and x.shape[0] == 2 and x.shape[1] > 2:
        x = x.T
    if not np.all(np.isfinite(x)) or x.size == 0 or np.max(np.abs(x)) <= 0:
        raise ValueError("the recipe made no sound")
    if pitch:
        n = max(16, int(round(x.shape[0] * 2 ** (-pitch / 12))))
        x = signal.resample(x, n, axis=0)
    if bright:
        if bright > 0:
            x = x + bright * (K.hp(x, 3000) if x.ndim == 1 else np.stack([K.hp(x[:, c], 3000) for c in range(x.shape[1])], 1))
        else:
            lo = K.lp(x, 2500) if x.ndim == 1 else np.stack([K.lp(x[:, c], 2500) for c in range(x.shape[1])], 1)
            x = (1 + bright) * x - bright * lo
    x = x[: int(MAX_S * K.SR)]
    st = x if x.ndim == 2 else x[:, None]
    st = np.stack([K.hp(st[:, c], 25) for c in range(st.shape[1])], 1)  # DC block
    env = np.max(np.abs(st), axis=1)
    loud = np.nonzero(env > 10 ** (-50 / 20) * env.max())[0]
    start = max(0, loud[0] - int(0.004 * K.SR)) if len(loud) else 0
    keep = np.nonzero(env > 10 ** (-70 / 20) * env.max())[0]
    end = keep[-1] + 1 if len(keep) else len(st)
    st = st[start:end]
    if start == 0:  # the attack is the first sample: 2 ms of silence before it, so it never starts on a click
        st = np.concatenate([np.zeros((int(0.002 * K.SR), st.shape[1])), st])
    n_in = int(0.001 * K.SR)
    st[:n_in] *= np.linspace(0, 1, n_in)[:, None]
    st = np.stack([K.tail(st[:, c], min(0.03, len(st) / K.SR / 8)) for c in range(st.shape[1])], 1)
    st = st * 10 ** ((target - K.momentary_max(st)) / 20)
    st = st * min(1.0, 10 ** (K.PEAK_CAP_DB / 20) / np.max(np.abs(st)))
    return st[:, 0] if st.shape[1] == 1 else st


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    sources = jobs.get("sources") or jobs.get("kits")  # "kits": the key's name before #1061
    setup(sources)
    import numpy as np

    import sfxlib as K

    made, failed = [], []
    for job in jobs["jobs"]:
        try:
            fn, own_seed, own_target = recipe_of(job, sources)
            seed = own_seed if (job.get("ownSeed") or job.get("kitSeed")) and own_seed is not None else int(job.get("seed", 1)) & 0xFFFFFFFF
            # a source skill's recipe was written for its own fixed seed: with a new one it can fail now and then (Stickman's chatter places a tick
            # before the start); the next seeds are tried, so the same job still always makes the same sound
            for k in range(4):
                try:
                    x = fn(np.random.default_rng(seed + k), dict(job.get("params") or {}))
                    break
                except Exception:
                    if k == 3 or job["recipe"].startswith("user:"):
                        raise
            target = float(job.get("target") or own_target or -20)
            y = finish(x, target, float(job.get("pitch") or 0), float(job.get("bright") or 0))
            out = Path(job["out"])
            K.write_wav(out, y)
            st = y if y.ndim == 2 else y[:, None]
            made.append({"out": str(out), "seconds": round(len(st) / K.SR, 3), "channels": st.shape[1], "peak_db": round(20 * np.log10(np.max(np.abs(st)) + 1e-12), 2),
                         "mmax": round(float(K.momentary_max(st)), 2), "dc": round(float(np.max(np.abs(np.mean(st, axis=0)))), 6),
                         "edge": round(float(max(np.max(np.abs(st[0])), np.max(np.abs(st[-1])))), 5)})
        except Exception as e:  # one recipe that fails never stops the others
            failed.append({"out": job.get("out"), "recipe": job.get("recipe"), "error": f"{type(e).__name__}: {str(e)[:300]}"})
    print(json.dumps({"ok": True, "made": made, "failed": failed}))


if __name__ == "__main__":
    main()
