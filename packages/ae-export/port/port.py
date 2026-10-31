"""Moworks Studio copy of the Moworks Motion kit's engine/ae/port.py (kit commit 30b7dcb, MIT, Moworks): an editable After Effects project
from a HyperFrames film. Changes for HyperFrames-native projects are listed in ../PROVENANCE.md (recorded on HF's own page through
hf_driver.js, scenes = HF sub-compositions, comp fps from the film, root id from the document, audio of sub-compositions, app paths).
Run by packages/ae-export/index.mjs:  python port.py <project> --url <HF page> --fps <n/d> --out <dir> [--run] [--check auto] [--ref-dir d]

Kit documentation (paths and commands below are the kit's):
kit.py ae <project>: an editable After Effects project from a v2 film (plan section 3, path A; G7).

  python engine/kit.py ae <project> [--run] [--check 1.5,4] [--no-save]
  python engine/kit.py ae <project> --estimate          size of a port (layers x samples, MB, minutes) before running it: seconds
  python engine/kit.py ae <project> --rebuild [--check auto]   the AE step again from the saved recording (rec.json.gz), no new recording:
              after a change to the port code (a finished export keeps its recording and footage only with MW_AE_KEEP_WORK=1)
  python engine/kit.py ae <project> --jsx <fix.jsx> [--check auto]   a script on the project open in AE (precomps, names, keys, fonts...):
              saves a copy of the .aep first, renders the check frames before and after, compares them (and with the browser)

  1. record   the film runs in Chromium; engine/ae/record.js finds the layers (text, box, image, raster, clip) and samples each one 120
              times a second plus at every tween start / end: matrix, layout box, origin, opacity, blur, clip-path, text, paint hash
  2. pictures boxes AE can draw (solid colour, uniform radius and border) become shape layers; any other paint (gradients, shadows,
              pseudo-elements, SVG, background-clip text) is shot alone at 2x as a PNG; paint that changes over time becomes a PNG sequence
  3. fit      every channel (position x / y, scale, rotation, opacity, anchor, size, blur, matte rect) becomes sparse AE keys: cubic
              Hermite segments = AE bezier keys with influence 33.3 % and speed = slope, split where the error is above the tolerance
              (0.3 px, 0.2 %, 0.15 deg); steps (sets, steps() eases) become hold keys; changing text becomes Source Text keys
  4. build    ae/port.json + ae/build.jsx (engine/ae/ae_runtime.jsx with the data in front) -> <film>/05_AE/<name>.aep (built in
              %USERPROFILE%\\.aimotionkit\\work\\ae\\<project>, then copied to the film), report 05_AE/AE-PORT.md, mix + stems in 05_AE/Audio
  5. --run    runs build.jsx inside the open After Effects (see "How Claude talks to After Effects" below); --check renders those
              seconds in AE and in the browser -> ae/check/cmp_<t>.png side by side

Comps: one per scene (HyperFrames clip with data-start; its .inner is the comp), placed in the main comp at the clip's start; the inner's
own motion (transitions) is on that precomp layer. Clipping (overflow hidden, clip-path) becomes a shape layer used as a track matte.
Precomps: inside every comp, layers that come from one element and its children
(a film-level layer, a chat bubble and its letters, a group) and runs of 3+ sibling layers named <prefix><number> (the cells of one
transition) become precomps of the same size and length (folder <film>/Precomps), level by level; a matte always moves with its layers;
a precomp holding a blend mode collapses transformations so it still blends with what is below. Image sequences (a film's 3D render and the
kit's own captured sequences) are ONE footage each with Time Remap keys.
Motion blur: the switch is on for every layer that moves, the comp switch is left off (plan: you turn it on with one click).

How Claude talks to After Effects (no MCP, no plug-in, no network):
  engine/ae/run_jsx.ps1 posts the menu command File > Scripts > Run Script File (WM_COMMAND 917505) to the After Effects window and
  types the .jsx path into AE's own Open dialog; the script writes a "done" file that the caller waits for. Needs: AE (or AE Beta) open,
  no dialog showing. Proven with AE Beta 27.0 on Windows 11. "AfterFX.exe -r" is ignored by a running AE Beta, which is why.
  Rules learned the hard way: never call menu commands (app.executeCommand), openInViewer or layer styles inside a build
  script: AE froze for over an hour. engine/ae/ae_windows.ps1 lists AE's open windows (a #32770 = a dialog that blocks scripts)."""
import asyncio, bisect, json, math, os, re, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path: sys.path.insert(0, str(HERE))
import appenv                                                          # noqa: E402
from appenv import WORK, bundled_font, film_dir, film_name, renders, say  # noqa: E402
FPS = 30.0              # the film's frame rate (kit: a fixed 60); set by run(fps=...) before anything uses it

RATE = 120.0            # samples a second = the frame rate HF's page is served at (run(rate=...)): HF snaps every seek to one of its
                        # frames, so samples off that grid recorded a change up to one sample late (a count-up was a step behind in AE)
MARGIN = 600            # px around the frame that pictures still cover (elements partly outside the frame, big blurred blobs)
# AE Drop Shadow softness S gives a Gaussian sigma of 0.189 S (measured: S 10 / 20 / 40 -> sigma 1.9 / 3.8 / 7.5 px); a CSS shadow
# blur radius r is sigma r / 2, so S = 2.65 r. Before, S = r: every shadow and glow ported 2.6 times too sharp (gallery-strip halo vanished).
SOFT = 2.65
TOL = {"pos": 0.3, "scale": 0.2, "rot": 0.15, "op": 0.3, "size": 0.3, "blur": 0.2, "anchor": 0.3}
REC_JS = (HERE / "record.js").read_text(encoding="utf-8")
BOUNDS_JS = "() => window.__aimk.bounds()"      # every HF timeline's tween bounds on the film clock (hf_driver.js)


# ------------------------------------------------------------------ small helpers
def rgba(css):
    """'rgb(1, 2, 3)' / 'rgba(1, 2, 3, 0.5)' / 'color(srgb 0.1 0.2 0.3 / 0.5)' -> ([r, g, b] 0..1, alpha).
    Chromium writes a color-mix() result as color(srgb r g b), channels 0..1: they used to be read as 0..255, so a light grey
    became almost black (light-sweep-pass hero bar)."""
    css = (css or "").strip()
    v = [float(x) for x in re.findall(r"-?[\d.]+(?:e-?\d+)?", css)]
    if css.startswith("color(srgb ") and len(v) >= 3:
        return [round(min(1.0, max(0.0, c)), 4) for c in v[:3]], (v[3] if len(v) > 3 else 1.0)
    if len(v) < 3: return [0, 0, 0], 0.0
    return [round(c / 255, 4) for c in v[:3]], (v[3] if len(v) > 3 else 1.0)


def px(v, ref=0.0):
    v = (v or "").strip()
    if v.endswith("%"): return float(v[:-1]) / 100 * ref
    m = re.match(r"(-?[\d.]+)", v); return float(m.group(1)) if m else 0.0


def _arc(x1, y1, rx, ry, phi, large, sweep, x2, y2):
    """an SVG arc -> cubic segments [(c1x, c1y, c2x, c2y, ex, ey)], at most 90 degrees each (endpoint -> centre parameterisation, SVG spec
    F.6.5 / F.6.6)"""
    if rx == 0 or ry == 0 or (x1 == x2 and y1 == y2): return [(x1, y1, x2, y2, x2, y2)]
    rx, ry, c, s = abs(rx), abs(ry), math.cos(math.radians(phi)), math.sin(math.radians(phi))
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    xp, yp = c * dx + s * dy, -s * dx + c * dy
    lam = xp * xp / (rx * rx) + yp * yp / (ry * ry)
    if lam > 1: rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
    k = math.sqrt(max(0.0, num / (rx * rx * yp * yp + ry * ry * xp * xp))) * (-1 if large == sweep else 1)
    cxp, cyp = k * rx * yp / ry, -k * ry * xp / rx
    cx, cy = c * cxp - s * cyp + (x1 + x2) / 2, s * cxp + c * cyp + (y1 + y2) / 2
    ang = lambda ux, uy, vx, vy: math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry)
    dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry)
    if not sweep and dt > 0: dt -= 2 * math.pi
    elif sweep and dt < 0: dt += 2 * math.pi
    n = max(1, math.ceil(abs(dt) / (math.pi / 2) - 1e-9)); d = dt / n; a = 4 / 3 * math.tan(d / 4); out = []
    pt = lambda t: (cx + rx * math.cos(t) * c - ry * math.sin(t) * s, cy + rx * math.cos(t) * s + ry * math.sin(t) * c)
    dv = lambda t: (-rx * math.sin(t) * c - ry * math.cos(t) * s, -rx * math.sin(t) * s + ry * math.cos(t) * c)
    for j in range(n):
        ta, tb = t1 + j * d, t1 + (j + 1) * d
        (ax, ay), (bx, by), (dax, day), (dbx, dby) = pt(ta), pt(tb), dv(ta), dv(tb)
        out.append((ax + a * dax, ay + a * day, bx - a * dbx, by - a * dby, bx, by))
    return out


def svg_path(d):
    """an SVG path string (M L H V C S Q T A Z, absolute and relative) -> AE shapes [{"v": [[x, y]...], "i": [...], "o": [...], "c": closed}]
    with tangents relative to their vertex, as svgShape / bezShape in ae_runtime.jsx take them; arcs and quadratics become cubics.
    For clip-path: path() (KI-03: it used to fall back to a full rectangle, silently)."""
    toks = re.findall(r"[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", d or "")
    subs, cur, i, cmd = [], None, 0, None
    x = y = sx = sy = 0.0; lc = lq = None                   # last cubic / quadratic control point (S / T reflect it)
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    def start(px_, py_):
        nonlocal cur
        cur = {"v": [[px_, py_]], "i": [[0.0, 0.0]], "o": [[0.0, 0.0]], "c": False}; subs.append(cur)
    def seg(c1x, c1y, c2x, c2y, ex, ey):
        nonlocal x, y
        if cur is None: start(x, y)
        cur["o"][-1] = [c1x - x, c1y - y]; cur["v"].append([ex, ey]); cur["i"].append([c2x - ex, c2y - ey]); cur["o"].append([0.0, 0.0])
        x, y = ex, ey
    while i < len(toks):
        if toks[i].isalpha(): cmd = toks[i]; i += 1
        elif cmd is None: break
        rel, C = cmd.islower(), cmd.upper()
        ox, oy = (x, y) if rel else (0.0, 0.0)
        try:
            if C == "Z":
                if cur and len(cur["v"]) > 1:
                    if abs(cur["v"][-1][0] - cur["v"][0][0]) < 1e-6 and abs(cur["v"][-1][1] - cur["v"][0][1]) < 1e-6:
                        cur["i"][0] = cur["i"].pop(); cur["v"].pop(); cur["o"].pop()
                    cur["c"] = True
                cur = None; x, y = sx, sy; lc = lq = None; cmd = None; continue
            if C == "M":
                x, y = ox + num(), oy + num(); sx, sy = x, y; start(x, y); cmd = "l" if rel else "L"; lc = lq = None; continue
            if C == "L": ex, ey = ox + num(), oy + num(); seg(x, y, ex, ey, ex, ey); lc = lq = None
            elif C == "H": ex = ox + num(); seg(x, y, ex, y, ex, y); lc = lq = None
            elif C == "V": ey = oy + num(); seg(x, y, x, ey, x, ey); lc = lq = None
            elif C == "C":
                c1x, c1y, c2x, c2y, ex, ey = ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()
                seg(c1x, c1y, c2x, c2y, ex, ey); lc = (c2x, c2y); lq = None
            elif C == "S":
                c1x, c1y = (2 * x - lc[0], 2 * y - lc[1]) if lc else (x, y)
                c2x, c2y, ex, ey = ox + num(), oy + num(), ox + num(), oy + num()
                seg(c1x, c1y, c2x, c2y, ex, ey); lc = (c2x, c2y); lq = None
            elif C in "QT":
                if C == "Q": qx, qy = ox + num(), oy + num()
                else: qx, qy = (2 * x - lq[0], 2 * y - lq[1]) if lq else (x, y)
                ex, ey = ox + num(), oy + num()
                seg(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey); lq = (qx, qy); lc = None
            elif C == "A":
                rx, ry, phi, large, sweep = num(), num(), num(), num() != 0, num() != 0
                ex, ey = ox + num(), oy + num()
                for s_ in _arc(x, y, rx, ry, phi, large, sweep, ex, ey): seg(*s_)
                lc = lq = None
            else: break
        except (IndexError, ValueError, TypeError): break
    r3 = lambda P: [[round(a, 3), round(b, 3)] for a, b in P]
    return [{"v": r3(s["v"]), "i": r3(s["i"]), "o": r3(s["o"]), "c": s["c"]} for s in subs if len(s["v"]) > 1]


def clip_shape(cp, w, h, br="0px"):
    """computed clip-path / overflow box -> ("rect", x, y, w, h, radius), ("ellipse", cx, cy, rx, ry), ("poly", [[x, y]...]) or
    ("bez", [AE shapes], fill rule) in the element's layout space"""
    if not cp or cp == "none": return ("rect", 0.0, 0.0, w, h, px(br.split()[0] if br else "0px", min(w, h)))
    m = re.match(r"path\(\s*(?:(nonzero|evenodd)\s*,\s*)?[\"'](.*)[\"']\s*\)\s*$", cp, re.S)
    if m:
        subs = svg_path(m.group(2))
        if subs: return ("bez", subs, m.group(1) or "nonzero")
    m = re.match(r"inset\((.*)\)", cp)
    if m:
        body = m.group(1); rad = 0.0
        if " round " in body: body, r = body.split(" round ", 1); rad = px(r.split()[0], min(w, h))
        p = body.split(); p = p + [p[0]] * (1 - len(p)) if len(p) == 1 else p
        if len(p) == 1: p = p * 4
        elif len(p) == 2: p = [p[0], p[1], p[0], p[1]]
        elif len(p) == 3: p = [p[0], p[1], p[2], p[1]]
        t, r_, b, l = px(p[0], h), px(p[1], w), px(p[2], h), px(p[3], w)
        return ("rect", l, t, max(0.0, w - l - r_), max(0.0, h - t - b), rad)
    m = re.match(r"circle\(\s*([^ ]+)?\s*(?:at\s+([^ ]+)\s+([^ )]+))?\s*\)", cp)
    if m:
        R = px(m.group(1) or "50%", math.hypot(w, h) / math.sqrt(2)); cx = px(m.group(2) or "50%", w); cy = px(m.group(3) or "50%", h)
        return ("ellipse", cx, cy, R, R)
    m = re.match(r"ellipse\(\s*([^ ]+)\s+([^ ]+)\s*(?:at\s+([^ ]+)\s+([^ )]+))?\s*\)", cp)
    if m: return ("ellipse", px(m.group(3) or "50%", w), px(m.group(4) or "50%", h), px(m.group(1), w), px(m.group(2), h))
    m = re.match(r"polygon\((.*)\)", cp)
    if m:                                                  # ("poly", [[x, y], ...]) in the element's layout space
        pts = [q.split() for q in m.group(1).split(",") if q.strip() and q.strip() not in ("nonzero", "evenodd")]
        return ("poly", [[round(px(a, w), 3), round(px(b, h), 3)] for a, b in (q[:2] for q in pts if len(q) >= 2)])
    return ("rect", 0.0, 0.0, w, h, 0.0)


def parse_filters(s):
    """computed CSS filter (blur already removed) -> [(name, [numbers])]; drop-shadow -> [dx, dy, blur, r, g, b, a]"""
    out = []
    for name, arg in re.findall(r"([a-z-]+)\(((?:[^()]|\([^()]*\))*)\)", s or ""):
        if name == "drop-shadow":
            col, a = rgba(re.search(r"rgba?\([^)]*\)", arg).group(0)) if "rgb" in arg else ([0, 0, 0], 1.0)
            nums = [float(x) for x in re.findall(r"(-?[\d.]+)px", arg)] + [0, 0, 0]
            out.append((name, nums[:3] + col + [a]))
        else:
            m = re.match(r"\s*(-?[\d.]+)(%|deg)?", arg); v = float(m.group(1)) if m else 0.0
            if m and m.group(2) == "%": v /= 100
            out.append((name, [v]))
    return out


def counter(tk):
    """Source Text keys that only change one number (same text before / after it) -> {"fmt": (prefix, suffix, decimals, comma), "vals": [(t, v)]}"""
    rx = re.compile(r"^(.*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$", re.S)
    ms = [rx.match(s) for _, s in tk]
    if not all(ms) or len({(m.group(1), m.group(3)) for m in ms}) != 1: return None
    nums = [m.group(2) for m in ms]
    comma = any("," in n for n in nums); dec = max((len(n.split(".")[1]) if "." in n else 0) for n in nums)
    try: vals = [float(n.replace(",", "")) for n in nums]
    except ValueError: return None
    if len(set(vals)) < 3: return None
    return {"fmt": (ms[0].group(1), ms[0].group(3), dec, comma), "vals": [(t, v) for (t, _), v in zip(tk, vals)]}


NEUTRAL = {"brightness": [1], "contrast": [1], "grayscale": [0], "saturate": [1], "hue-rotate": [0], "opacity": [1], "invert": [0], "sepia": [0],
           "drop-shadow": [0, 0, 0, 0, 0, 0, 0]}


def filter_fx(T, fls, blurs, shift, notes, label):
    """per-sample filter strings + blur radii -> (AE effects, opacity factor per sample)"""
    fx, opk = [], [1.0] * len(T)
    def ch(vals, tol):
        return channel(T, vals, tol, shift)
    def add(m, name, params):                 # params: {matchName: (values, tol)}
        e = {"m": m, "name": name, "set": {}, "keys": {}}
        for k, (vals, tol) in params.items():
            c = ch(vals, tol); (e["set"] if c[0] == "set" else e["keys"])[k] = c[1]
        fx.append(e)
    if max(blurs) > 0.05:
        # CSS blur(s) = Gaussian sigma s px; AE Gaussian Blur blurriness B gives sigma 0.273 B (measured: 10-90 % edge 28 px at B 40,
        # CSS blur(20px) 50 px) -> B = 3.66 s. Repeat Edge Pixels off, or the blur stops at the layer edge.
        add("ADBE Gaussian Blur 2", "Blur", {"ADBE Gaussian Blur 2-0001": ([b * 3.66 for b in blurs], TOL["blur"]),
                                             "ADBE Gaussian Blur 2-0003": ([0] * len(T), 1)})
    parsed = [parse_filters(f) for f in fls]
    slots = []                                 # (name, occurrence) in order of first appearance
    for p in parsed:
        seen = {}
        for name, _ in p:
            k = (name, seen.get(name, 0)); seen[name] = k[1] + 1
            if k not in slots: slots.append(k)
    for name, occ in slots:
        vals = []
        for p in parsed:
            hits = [v for n, v in p if n == name]
            vals.append(hits[occ] if occ < len(hits) else NEUTRAL.get(name, [0]))
        if name in ("saturate", "hue-rotate") and len({round(v[0], 3) for v in vals}) > 1:
            notes.add(f"{label}: {name}() changes over time: Hue/Saturation master values cannot be keyed by script, the first value is used")
            vals = [vals[0]] * len(vals)
        col = lambda i: [v[i] for v in vals]
        if name == "grayscale": add("ADBE Tint", "Grayscale", {"ADBE Tint-0003": ([v * 100 for v in col(0)], 0.3)})
        elif name == "brightness":
            add("ADBE Pro Levels2", "Brightness", {"ADBE Pro Levels2-0008": ([min(1.0, v) for v in col(0)], 0.002),       # Levels (Individual Controls):
                                                   "ADBE Pro Levels2-0005": ([1 / max(1.0, v) for v in col(0)], 0.002)})      # keyable (Levels is not)
        elif name == "contrast":
            c = col(0)
            add("ADBE Pro Levels2", "Contrast", {"ADBE Pro Levels2-0004": ([0.5 - 0.5 / v if v > 1 else 0 for v in c], 0.002),
                                                 "ADBE Pro Levels2-0005": ([0.5 + 0.5 / v if v > 1 else 1 for v in c], 0.002),
                                                 "ADBE Pro Levels2-0007": ([0.5 - 0.5 * v if v < 1 else 0 for v in c], 0.002),
                                                 "ADBE Pro Levels2-0008": ([0.5 + 0.5 * v if v < 1 else 1 for v in c], 0.002)})
        elif name == "saturate": add("ADBE HUE SATURATION", "Saturate", {"ADBE HUE SATURATION-0005": ([max(-100, min(100, (v - 1) * 100)) for v in col(0)], 0.3)})
        elif name == "hue-rotate": add("ADBE HUE SATURATION", "Hue rotate", {"ADBE HUE SATURATION-0004": (col(0), 0.2)})
        elif name == "opacity": opk = [a * b for a, b in zip(opk, col(0))]
        elif name == "url": pass                                      # an SVG filter: baked into the picture, or a text stroke + shadow (svgFx)
        elif name == "drop-shadow":
            add("ADBE Drop Shadow", "Drop shadow", {                     # opacity 0..255, direction / distance / softness as v1
                "ADBE Drop Shadow-0002": ([255 * v[6] for v in vals], 0.5),
                "ADBE Drop Shadow-0003": ([(math.degrees(math.atan2(v[0], -v[1])) + 360) % 360 if (v[0] or v[1]) else 135 for v in vals], 0.2),
                "ADBE Drop Shadow-0004": ([math.hypot(v[0], v[1]) for v in vals], 0.3), "ADBE Drop Shadow-0005": ([SOFT * b for b in col(2)], 0.3)})
            fx[-1]["set"]["ADBE Drop Shadow-0001"] = vals[0][3:6] + [1]
            if len({tuple(v[3:6]) for v in vals}) > 1: notes.add(f"{label}: drop-shadow colour changes over time: the first colour is used")
        else: notes.add(f"{label}: CSS filter {name}() is not ported")
    return fx, opk


# ------------------------------------------------------------------ fitting (v1 Engine/ae/ae.py fit, adapted to sampled data)
def hermite(v0, v1, m0, m1, dt, u):
    u2, u3 = u * u, u * u * u
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 * dt + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1 * dt


SLOPE_SPAN = 0.002


class Track:
    """a sampled value v(t), linear between samples"""
    def __init__(self, ts, vs):
        self.t, self.v = ts, vs
        import bisect; self.bis = bisect.bisect_right
    def __call__(self, t):
        T, V = self.t, self.v
        if t <= T[0]: return V[0]
        if t >= T[-1]: return V[-1]
        i = self.bis(T, t) - 1; a, b = T[i], T[i + 1]
        return V[i] if b - a < 1e-12 else V[i] + (V[i + 1] - V[i]) * (t - a) / (b - a)
    def d(self, t, side):
        """the slope to one side of t, over SLOPE_SPAN at least. Every tween's start and end has samples 0.4 ms off it (run): GSAP rounds a scale to 4 decimals,
        so one step of 0.01 % across that gap read as 25 %/s while the camera moved 2 %/s"""
        T, V = self.t, self.v; i = self.bis(T, t) - 1
        if side > 0:
            j = max(0, min(i, len(T) - 2)); j = j + 1 if T[j + 1] <= t + 1e-9 and j + 2 < len(T) else j
            k = j + 1
            while T[k] - T[j] < SLOPE_SPAN and k + 1 < len(T): k += 1
        else:
            k = max(0, min(i if T[i] < t - 1e-9 else i - 1, len(T) - 2)) + 1
            j = k - 1
            while T[k] - T[j] < SLOPE_SPAN and j > 0: j -= 1
        a, b = T[j], T[k]
        return 0.0 if b - a < 1e-12 else (V[k] - V[j]) / (b - a)


def windows(ts, vs, tol):
    """spans where the value changes: [(i0, i1, step)], step = a jump between two samples"""
    eps = tol * 0.02; out = []; i = 0; n = len(ts)
    while i < n - 1:
        if abs(vs[i + 1] - vs[i]) <= eps: i += 1; continue
        j = i
        while j < n - 1 and abs(vs[j + 1] - vs[j]) > eps: j += 1
        out.append([i, j])
        i = j
    merged = []
    for a, b in out:                          # glue windows separated by a single still sample inside one tween (slow moments)
        if merged and a - merged[-1][1] <= 1 and ts[a] - ts[merged[-1][1]] < 0.02: merged[-1][1] = b
        else: merged.append([a, b])
    return merged


def eases_hold(ts, vs, stops, tol):
    """keys only at these samples, speed 0 (in AE a hold key ends as a smooth key: ae_runtime.jsx setKeys): do the samples between them stay on that curve?
    A slow move with no jump in it read as "steps" and came out as one ease from end to end, whatever it did between"""
    for p, q in zip(stops, stops[1:]):
        dt = ts[q] - ts[p]
        if dt < 1e-6: continue
        for k in range(p + 1, q):
            if abs(hermite(vs[p], vs[q], 0.0, 0.0, dt, (ts[k] - ts[p]) / dt) - vs[k]) > tol: return False
    return True


def key_curve(keys, t):
    """(value, slope) at t of the curve AE draws through keys [t, v, inSpeed, outSpeed, hold]: Hermite between them (Bezier with influence 33.3 %, speed = slope), held before and after"""
    if t <= keys[0][0]: return keys[0][1], 0.0
    if t >= keys[-1][0]: return keys[-1][1], 0.0
    i = bisect.bisect_right([k[0] for k in keys], t) - 1
    a, b = keys[i], keys[i + 1]
    dt = b[0] - a[0]
    if dt < 1e-9: return b[1], 0.0
    u = (t - a[0]) / dt; u2 = u * u
    m0, m1 = a[3], b[2]
    v = hermite(a[1], b[1], m0, m1, dt, u)
    s = ((6 * u2 - 6 * u) * a[1] + (3 * u2 - 4 * u + 1) * m0 * dt + (-6 * u2 + 6 * u) * b[1] + (3 * u2 - 2 * u) * m1 * dt) / dt
    return v, s


def fit(ts, vs, tol):
    """-> AE keys [t, v, inSpeed, outSpeed, hold] or None (static); first value always defined"""
    W = windows(ts, vs, tol)
    if not W: return None
    tr = Track(ts, vs); keys = {}
    def add(t, v, ins=0.0, outs=0.0, hold=False):
        k = keys.setdefault(round(t, 5), [t, v, ins, outs, hold]); k[1] = v
        if ins: k[2] = ins
        if outs: k[3] = outs
        if hold: k[4] = True
    for i0, i1 in W:
        a, b = ts[i0], ts[i1]
        diffs = [abs(vs[k + 1] - vs[k]) for k in range(i0, i1)]
        big = [k for k in range(i0, i1) if abs(vs[k + 1] - vs[k]) > max(tol * 4, 0.25 * max(diffs))]
        if b - a < 0.0105 or (len(big) <= max(1, (i1 - i0) // 6) and all(abs(vs[k + 1] - vs[k]) <= tol * 0.3 for k in range(i0, i1) if k not in big)
                              and len(big) * 3 < (i1 - i0) and eases_hold(ts, vs, [i0] + [k + 1 for k in big] + [i1], tol)):
            # steps: hold keys at each jump
            add(a, vs[i0], hold=True)
            for k in big: add(ts[k + 1], vs[k + 1], hold=True)
            add(b, vs[i1])
            continue
        knots = [a, b]
        for _ in range(60):
            worst = None
            for q in range(len(knots) - 1):
                t0, t1 = knots[q], knots[q + 1]; dt = t1 - t0
                if dt < 1e-6: continue
                v0, v1 = tr(t0), tr(t1)
                m0 = tr.d(t0, +1) if q == 0 else (tr.d(t0, -1) + tr.d(t0, +1)) / 2
                m1 = tr.d(t1, -1) if q == len(knots) - 2 else (tr.d(t1, -1) + tr.d(t1, +1)) / 2
                for k in range(i0, i1 + 1):
                    if t0 < ts[k] < t1:
                        e = abs(hermite(v0, v1, m0, m1, dt, (ts[k] - t0) / dt) - vs[k])
                        if e > tol and (worst is None or e > worst[0]): worst = (e, ts[k])
            if worst is None: break
            knots.append(worst[1]); knots.sort()
        for q, t in enumerate(knots):
            first, last = q == 0, q == len(knots) - 1
            add(t, tr(t), ins=0.0 if first else (tr.d(t, -1) + tr.d(t, +1)) / 2 if not last else tr.d(t, -1),
                outs=0.0 if last else (tr.d(t, -1) + tr.d(t, +1)) / 2 if not first else tr.d(t, +1))
    ks = sorted(keys.values(), key=lambda k: k[0])
    return [[round(k[0], 5), round(k[1], 4), round(k[2], 4), round(k[3], 4), k[4]] for k in ks]


def channel(ts, vs, tol, shift=0.0):
    """-> ("set", value) or ("keys", [...]) with times minus shift"""
    k = fit(ts, vs, tol)
    if not k: return ("set", round(vs[0], 4))
    for x in k: x[0] = round(x[0] - shift, 5)
    return ("keys", k)


# ------------------------------------------------------------------ fonts
_FONTS = None
def installed_fonts():
    global _FONTS
    if _FONTS is not None: return _FONTS
    _FONTS = []
    try: from fontTools.ttLib import TTFont
    except ImportError: return _FONTS
    for d in (Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts", Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts"):
        if not d.exists(): continue
        for f in d.iterdir():
            if f.suffix.lower() not in (".ttf", ".otf", ".ttc"): continue
            try:
                t = TTFont(str(f), lazy=True, fontNumber=0); nm = t["name"]
                ps, fam, sub = (nm.getDebugName(i) or "" for i in (6, 1, 2))
                tf, ts_ = nm.getDebugName(16) or fam, nm.getDebugName(17) or sub
                w = t["OS/2"].usWeightClass if "OS/2" in t else 400; t.close()
            except Exception: continue
            _FONTS.append({"ps": ps, "fam": tf.lower(), "sub": ts_.lower(), "w": w, "italic": "italic" in ts_.lower() or "oblique" in ts_.lower()})
    return _FONTS


WEBFONTS = {}          # CSS family of an @font-face in the film -> {"family": real family name, "file": font file, "inst": [(weight, subfamily)]}


def webfonts(film_dir):
    """@font-face rules of the film: which real font each CSS family name is (v2 films call Roboto Flex "RFlex")"""
    WEBFONTS.clear()
    try: from fontTools.ttLib import TTFont
    except ImportError: return
    # Moworks Studio: index.html and every sub-composition (compositions/**.html) with the stylesheets each links; urls relative to the file
    comp = film_dir / "compositions"
    htmls = [film_dir / "index.html"] + (sorted(comp.rglob("*.html")) if comp.is_dir() else [])
    sheets, seen = [], set()
    for hf in htmls:
        html_ = hf.read_text(encoding="utf-8", errors="replace"); sheets.append((html_, hf.parent))
        for href in re.findall(r"""<link\b[^>]*\bhref=["']([^"']+\.css)(?:\?[^"']*)?["']""", html_):
            f = (hf.parent / href).resolve()
            if f.is_file() and f not in seen: seen.add(f); sheets.append((f.read_text(encoding="utf-8", errors="replace"), f.parent))
    for block, base in [(b, d) for txt, d in sheets for b in re.findall(r"@font-face\s*\{([^}]*)\}", txt)]:
        fam = re.search(r"""font-family:\s*["']?([^;"']+)""", block); src = re.search(r"""src:\s*url\(["']?([^)"']+)""", block)
        if not fam or not src: continue
        p = base / src.group(1)
        if not p.exists(): p = film_dir / src.group(1)
        if not p.exists(): continue
        italic = bool(re.search(r"font-style:\s*(italic|oblique)", block))
        try:
            t = TTFont(str(p)); nm = t["name"]; real = nm.getDebugName(16) or nm.getDebugName(1)
            inst = [(int(i.coordinates.get("wght", 400)), nm.getDebugName(i.subfamilyNameID)) for i in t["fvar"].instances] if "fvar" in t else []
            WEBFONTS[(fam.group(1).strip().lower(), italic)] = {"family": real, "file": p, "inst": inst}   # one entry per family and style
        except Exception: continue


def ae_font(family_css, weight, style, notes, size=None):
    """CSS font-family list + weight -> PostScript name of the closest installed face. Roboto Flex: the face at the optical size nearest the
    text's px size when the kit's opsz fonts are installed (KI-02: AE drew every size with the opsz-14 shapes, large text heavier)"""
    fams = [f.strip().strip('"\'') for f in family_css.split(",")]
    F = installed_fonts(); w = int(float(weight or 400)); it = style in ("italic", "oblique")
    for fam in fams:
        wf = WEBFONTS.get((fam.lower(), it)) or WEBFONTS.get((fam.lower(), False))
        if wf and not wf["inst"]:                     # a static web font (one file per weight, e.g. a brand pack's corporate font): the installed
            names = [fam, wf["family"]]               # face of that family nearest the weight, by the CSS name or the font's own name
            cand = [f for f in F if f["fam"].replace(" ", "") in {x.lower().replace(" ", "") for x in names}]
            if cand: return min(cand, key=lambda f: (abs(f["w"] - w), f["italic"] != it))["ps"]
            notes.add(f"font \"{wf['family']}\" (the film's \"{fam}\") is not installed in Windows: AE substitutes it. Install its files "
                      f"({wf['file'].parent}), then run the port again.")
            continue
        if wf:                                        # a variable web font of the film: the same font must be installed in Windows for AE
            real = wf["family"]; ps_base = real.replace(" ", "")
            sub = min(wf["inst"], key=lambda x: abs(x[0] - w))[1].replace(" ", "") if wf["inst"] else "Regular"
            if not any(f["fam"] == real.lower() for f in F):
                kit_ttf = bundled_font(wf["file"].stem)
                where = f"{kit_ttf} (right-click > Install)" if kit_ttf else f"{wf['file']} (right-click > Install)"
                notes.add(f"font \"{real}\" (the film's \"{fam}\") is not installed in Windows: AE substitutes it. Install {where}, then run the port again.")
            if wf["inst"] and min(abs(x[0] - w) for x in wf["inst"]) > 0:
                notes.add(f"font weight {w} of \"{real}\" becomes the nearest named weight {sub} in AE (AE text uses named weights)")
            if real.lower() == "roboto flex" and size:
                ops = sorted({int(f["fam"].rsplit("opsz", 1)[-1]) for f in F if f["fam"].startswith("roboto flex opsz") and f["fam"].rsplit("opsz", 1)[-1].isdigit()})
                if ops:
                    n = min(ops + [14], key=lambda o: abs(math.log(max(1.0, size) / o)))   # 14: the source font's own named weights
                    if n != 14: return f"RobotoFlexOpsz{n}-{sub}"
                else: notes.add("the Roboto Flex optical sizes (RobotoFlexOpsz<n>) are not installed in Windows, so AE uses the regular Roboto Flex: large text is a little heavier in AE")
            return f"{ps_base}-{sub}"
        # the CSS name may lack the spaces of the font's own family name: a brand pack's brand.css calls "Brand SS Head" "BrandSS Head"
        # (no match, so every text in the pack's font fell back to Arial and AE-PORT.md said "not installed" although it was)
        key = fam.lower().replace(" ", "")
        cand = [f for f in F if f["fam"].replace(" ", "") == key]
        if cand:
            best = min(cand, key=lambda f: (abs(f["w"] - w), f["italic"] != it))
            return best["ps"]
        if fam.lower() in ("sans-serif", "system-ui", "serif", "monospace"): continue
        notes.add(f"font \"{fam}\" (weight {w}) is not installed in Windows: AE substitutes it. Install the font, then run the port again.")
    alias = {"sans-serif": "ArialMT", "system-ui": "SegoeUI", "serif": "TimesNewRomanPSMT", "monospace": "ConsolasRegular"}
    for fam in fams:
        if fam.lower() in alias: return alias[fam.lower()]
    return "ArialMT"


# ------------------------------------------------------------------ record (browser)
# The film's visible canvases at 0 s, and how much of the frame they cover (0..1)
CANVAS_JS = """(sel) => { const st = document.querySelector(sel) || document.body, r0 = st.getBoundingClientRect(), A = (r0.width * r0.height) || 1;
  let count = 0, a = 0;
  for (const c of st.querySelectorAll("canvas")) {
    const r = c.getBoundingClientRect(); if (getComputedStyle(c).display === "none" || r.width * r.height < 1) continue; count++;
    a += Math.max(0, Math.min(r.right, r0.right) - Math.max(r.left, r0.left)) * Math.max(0, Math.min(r.bottom, r0.bottom) - Math.max(r.top, r0.top)); }
  return { count, area: Math.min(1, a / A) }; }"""
# Milliseconds of HF's own seek at a few times of the film (a Whiteboard film redraws its canvas on every seek: 0.35 to 0.7 s each)
# At the same points, the elements that show then and were not in the page at 0 s (the styles' AE badges: a What If film,
# React drawing each scene as it plays, had 3 layers at 0 s; record.js reads the layers at 0 s only, so AE would get those 3 and nothing else)
SEEK_JS = """async ([sel, ts]) => { const st = document.querySelector(sel) || document.body, seen = new Set(st.querySelectorAll("*")), out = [];
  const shows = (e) => { if (/^(SCRIPT|STYLE|AUDIO|TEMPLATE|LINK|META)$/.test(e.tagName)) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width * r.height >= 4 && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0; };
  let later = 0;
  for (const t of ts) { const a = performance.now(); await window.__aimk.seek(t); out.push(performance.now() - a);
    let n = 0; for (const e of st.querySelectorAll("*")) if (!seen.has(e) && shows(e)) n++; later = Math.max(later, n); }
  await window.__aimk.seek(0); return { ms: out, later }; }"""


def film_kind(st, canvas, later=0):
    """What After Effects can get of the film. "canvas": its picture is drawn on canvases only (every layer that paints is a canvas,
    or none paints and a canvas shows): one video layer, the rendered film, and no recording; "dynamic": most of its picture is made as it
    plays (more elements show later than there are layers at 0 s): one video layer too; "mostly-canvas": canvases cover half the frame or
    more beside other layers (the drawing comes as picture sequences, the rest as layers); "empty": nothing to record; "layers"."""
    paint = [nd for nd in st["nodes"] if nd["kind"] != "clip"]
    cv = sum(1 for nd in paint if nd.get("tag") == "canvas")
    if canvas["count"] and cv == len(paint): return "canvas"
    if later and later >= max(1, len(paint)): return "dynamic"
    if not paint: return "empty"
    return "mostly-canvas" if cv and canvas["area"] >= 0.5 else "layers"


def export_minutes(costs, layers, samples):
    """The whole export in minutes, from what the size check measured (measure_costs). (T28-24: a 3D film was promised 4 min and had not finished after 78.)
    Opening the film (twice when pictures are made: their page is a second one), a real sample at every sample time (the recording's Python
    reads each too: 0.13 ms a layer a sample, at least), every picture, a minute for the keyframes and AE's build (not measured), and about 5 s a shot for
    its check frame in HF and in AE (costs["checks"], one a shot)."""
    record = samples * max(costs["sample"], layers * 1.27e-4) / 60
    pics = (costs["frames"] + costs["stills"]) * costs["frame"] / 60
    if costs["frames"] or costs["stills"]: pics += costs["open"] / 60
    return {"minutes": round(costs["open"] / 60 + record + pics + 1 + costs.get("checks", 3) * 5 / 60, 1), "record": round(record, 1), "pictures": round(pics, 1)}


def estimate(st, times, say=say, canvas=None, seek=0.0, later=0, costs=None):
    """how big a port is before it records (a 50 s film with 792 layers ran 13 minutes, then failed): layers x
    samples, MB of samples (about 100 bytes a layer a sample), and which elements bring the most layers (the
    cells of a pixel transition: 144 each). kind: film_kind; a "canvas" or "dynamic" film is not recorded (about a minute: the film
    copied, AE builds); later: the most elements that show at a later time and were not in the page at 0 s (AE gets none of them).
    Minutes and the pictures' size only from what was measured on this film (costs: the size check's measure_costs, export_minutes);
    a size check without them (a style's AE badge reads the layers only, on the GPU), and the export itself, say neither"""
    n, k = len(st["nodes"]), len(times)
    canvas = canvas or {"count": 0, "area": 0.0}
    kind = film_kind(st, canvas, later)
    mb, mins = n * k * 100 / 1e6, (n * k * 1.27e-4 + k * seek) / 60
    if kind in ("canvas", "dynamic", "empty"): mb, mins, costs = 0, 1.0, None
    spent = export_minutes(costs, n, k) if costs else None
    # what stays on disk: the pictures as weighed and the sound (the samples are a Python object: nothing of them is kept)
    if spent: mins, mb = spent["minutes"], costs.get("picturesMb", costs["frames"] * costs["frameMb"]) + costs.get("soundMb", 0.0) + 5
    pictures = sum(1 for nd in st["nodes"] if nd["kind"] == "raster")       # svg / canvas / video: shapes where AE can, else pictures
    els = st.get("els") or []
    def who(nd):
        a = list(nd.get("anc") or []) + [nd["e"]]
        top = els[a[0]] if a and a[0] < len(els) else {}
        nm = nd.get("id") or ""
        pre = re.sub(r"[_\-]?\d+$", "", nm) if re.search(r"\d$", nm) else ""
        return (top.get("id") or top.get("cls") or top.get("tag") or "?") + (f" / {pre}*" if pre else "")
    cnt = {}
    for nd in st["nodes"]: cnt[who(nd)] = cnt.get(who(nd), 0) + 1
    big = sorted(cnt.items(), key=lambda x: -x[1])[:4]
    said = f"about {mb:,.0f} MB, about {max(1, round(mins))} min in all ({spent['record']} to record, {spent['pictures']} for {costs['frames'] + costs['stills']} pictures, {costs['sample'] * 1000:.0f} ms a sample)" if spent else f"about {mb:,.0f} MB of samples"
    say(f"  port size: {n} layers in {len(st['groups'])} comps x {k} samples = {said}. Most layers: " + ", ".join(f"{a} {b}" for a, b in big) + f"; film: {kind}, "
        f"{canvas['count']} canvas(es) over {canvas['area']:.0%} of the frame, {later} element(s) only later, {seek * 1000:.0f} ms a seek")
    return {"layers": n, "comps": len(st["groups"]), "samples": k, "mb": round(mb), "minutes": round(mins, 1), "most": big,
            "kind": kind, "canvas": {"count": canvas["count"], "area": round(canvas["area"], 3)}, "later": later, "pictures": pictures, "seekMs": round(seek * 1000),
            **({"high": round(spent["minutes"] * 1.5, 1), "frames": costs["frames"] + costs["stills"], "sampleMs": round(costs["sample"] * 1000), "frameMs": round(costs["frame"] * 1000),
                "recordMinutes": spent["record"], "pictureMinutes": spent["pictures"]} if spent else {})}


def left_words(spent, done, total):
    """", about 20 min left": what is left at the pace so far ("" before there is a pace)."""
    if done <= 0 or spent < 5 or total <= done: return ""
    m = spent / done * (total - done) / 60
    return f", about {m:.0f} min left" if m >= 1 else ", under a minute left"


SAMPLE_JS = "async ([t, o]) => JSON.stringify(await window.__aimkRec.sample(t, o))"
PICTURE_LINE_S = 10.0                                            # a progress line while pictures are made, at most this often
# How the size check measures a port on this film (T28-24). Timing HF's seek alone said 12 ms where a sample took 127: a seek returns before a
# WebGL film has drawn, and that work is paid when the recording next reads the canvas. So: real samples in a row at a few places, as
# the recording takes them; a grid over the film for what changes and how long it shows; a few real pictures of a layer that changes.
PROBE_PLACES, PROBE_RUN, PROBE_GRID, PROBE_BUDGET = (0.1, 0.3, 0.5, 0.7, 0.9), 13, 40, 30.0     # samples in a row (sigEvery 4 reads the canvases on the first and the last), grid points, s
PROBE_FRAMES = (0.2, 0.3, 0.5, 0.7)                              # pictures taken per layer (at most 2 layers), where in its span: the first only sets the page up, and is not counted
PROBE_WEIGH = 40                                                 # layers weighed for the size, at most (spread over the film)


def seq_frames(ops, grid, D, fps):
    """How many PNGs a layer that changes takes (the pictures' own count at the export: its visible span in frames, port.record), from the grid:
    it shows from about half a step before its first visible point to half a step after its last."""
    vis = [i for i, o in enumerate(ops) if o > 0.001]
    if not vis: return 0
    half = D / max(1, len(grid) - 1) / 2
    return int(math.ceil(min(D, grid[vis[-1]] + half) * fps)) - int(math.floor(max(0.0, grid[vis[0]] - half) * fps)) + 1


async def measure_costs(pg, info, st, times, work, opened, say=say):
    """{ sample, frame (s), frameMb, frames, stills, open (s) } of THIS film. Only the size check runs it, on the page it opened and closes
    after: the export's own recording is not touched."""
    from appenv import PAINT
    D, t0, spent, took = info["duration"], time.time(), 0.0, 0
    async def take(ts, o): return json.loads(await pg.evaluate(SAMPLE_JS, [ts, o]) or "null")
    for f in PROBE_PLACES:
        i = bisect.bisect_left(times, D * f); run = times[i:i + PROBE_RUN]
        if not run: continue
        a = time.time(); await take(run, {"sigEvery": 4}); spent += time.time() - a; took += len(run)
        if time.time() - t0 > PROBE_BUDGET: break
    sample = spent / took if took else 0.0
    points = max(8, min(PROBE_GRID, int(PROBE_BUDGET / max(sample, 1e-3))))
    grid = sorted({round(D * j / points, 5) for j in range(points + 1)})
    smp = await take(grid, {"sigEvery": 1})
    sty = await pg.evaluate("window.__aimkRec.styles()")
    need = plan_pictures({"structure": st, "styles": sty, "samples": smp})
    seqs = {n: seq_frames([s[0][12] for s in smp["nodes"][n]], grid, D, FPS) for n, h in need.items() if h["mode"] in ("seq", "seqT")}
    still_ids = [n for n, h in need.items() if h["mode"] == "still"]; stills = len(still_ids)
    frame, frame_mb, size_mb = 0.25, 0.0, 0.0                    # no layer to time: a still is about a quarter of a second
    if seqs or stills:
        VW, VH = int(info["w"]) + 2 * MARGIN, int(info["h"]) + 2 * MARGIN
        f = work / "_probe.png"; dur, size, n_timed = 0.0, 0, 0
        await pg.set_viewport_size({"width": VW, "height": VH})
        async def shot(n, t):
            how = need[n]
            await pg.evaluate(f"window.__aimk.seek({t})")
            await pg.evaluate(f"window.__aimkRec.isolate({n}, {how['pad']}, {MARGIN}, {'true' if how['mode'] == 'seqT' else 'false'})")
            await pg.evaluate(PAINT); await pg.screenshot(path=str(f), clip={"x": 0, "y": 0, "width": VW, "height": VH}, omit_background=True)
            await pg.evaluate(f"window.__aimkRec.restore({n})")
            return f.stat().st_size / 1e6
        visible = lambda n: [i for i, o in enumerate(s[0][12] for s in smp["nodes"][n]) if o > 0.001]
        try:
            for n in (list(seqs) or still_ids)[:2]:
                vis = visible(n)
                if not vis: continue
                for j, where in enumerate(PROBE_FRAMES):
                    a = time.time()
                    mb = await shot(n, grid[vis[int(where * (len(vis) - 1))]])
                    if j: dur += time.time() - a; size += mb * 1e6; n_timed += 1
            if n_timed: frame, frame_mb = dur / n_timed, size / n_timed / 1e6
            # what the pictures weigh: one picture of each layer that changes, every one if there is time. Two layers said 0.24 MB a frame for a film whose
            # frames came to 0.5 (~750 MB for 1.6 GB, T29-23): the first shots are not the busy ones. Stills are at 2x in the export: about 3 times the bytes
            weigh = lambda ids: [ids[int(i * len(ids) / min(len(ids), PROBE_WEIGH))] for i in range(min(len(ids), PROBE_WEIGH))] if ids else []
            until = time.time() + PROBE_BUDGET
            per = {}
            for n in weigh(list(seqs)):
                vis = visible(n)
                if vis and time.time() < until: per[n] = await shot(n, grid[vis[len(vis) // 2]])
            still_mb = []
            for n in weigh(still_ids)[:6]:
                vis = visible(n)
                if vis and time.time() < until: still_mb.append(await shot(n, grid[vis[len(vis) // 2]]))
            mean = sum(per[n] * seqs[n] for n in per) / max(1, sum(seqs[n] for n in per)) if per else frame_mb
            size_mb = sum(seqs[n] * per.get(n, mean) for n in seqs) + stills * (sum(still_mb) / len(still_mb) * 3 if still_mb else frame_mb)
        finally:
            f.unlink(missing_ok=True)
    return {"sample": sample, "frame": frame, "frameMb": frame_mb, "frames": sum(seqs.values()), "stills": stills, "open": opened, "picturesMb": size_mb}


def sound_mb(cl, p, total):
    """what the sound weighs in the export: each file on the timeline once, as it is or as WAV when After Effects cannot import it (24-bit, 48 kHz), and the
    mix and its three stems, the film's length each at 24-bit, 48 kHz, stereo"""
    from audio_mix import AE_TAKES, probe
    if not cl or not p: return 0.0
    mb = 4 * total * 288000 / 1e6
    for src in {re.sub(r"^(?:https?://[^/]+)?/+", "", c["src"]) for c in cl if c.get("src")}:
        f = Path(p) / src
        try:
            if f.suffix.lower() in AE_TAKES: mb += f.stat().st_size / 1e6
            else:
                d, ch = probe(f); mb += d * 144000 * ch / 1e6
        except (OSError, SystemExit): pass
    return mb


async def record(url, work, say=say, film_dir=None, estimate_only=False):
    from playwright.async_api import async_playwright
    from appenv import DRIVER, PAINT, launch, page_timeouts
    shots = work / "footage"; shots.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        br = await launch(pw)
        async def open_page(scale):
            pg = page_timeouts(await br.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=scale))
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.add_init_script(f"window.__mwAeFps = {FPS};"); await pg.add_init_script(DRIVER); await pg.goto(url)
            info = await pg.evaluate("window.__aimk.ready")
            if not info or info.get("error"): raise SystemExit(f"film not ready: {(info or {}).get('error')} {errs[:2]}")
            await pg.set_viewport_size({"width": int(info["w"]), "height": int(info["h"])})
            await pg.evaluate(REC_JS); await pg.evaluate("window.__aimk.seek(0)")
            st = await pg.evaluate(f"window.__aimkRec.structure({json.dumps(info['stage'])}, {info['duration']})")
            return pg, info, st, errs
        t_open = time.time()
        pg, info, st, errs = await open_page(1)
        t_open = time.time() - t_open
        D = info["duration"]
        bounds = [b for b in await pg.evaluate(BOUNDS_JS) if 0 <= b <= D]
        times = sorted({round(i / RATE, 5) for i in range(int(D * RATE) + 1)} | {round(D, 5)} | set(bounds)
                       | {round(b - 0.0004, 5) for b in bounds if b > 0.001} | {round(b + 0.0004, 5) for b in bounds if b < D - 0.001})
        canvas = await pg.evaluate(CANVAS_JS, info["stage"])
        seek, later = 0.0, 0
        if film_kind(st, canvas) != "canvas":           # HF's seek, timed at 5 points of the film (a few seconds), for the minutes
            sk = await pg.evaluate(SEEK_JS, [info["stage"], [round(D * f, 3) for f in (0.1, 0.3, 0.5, 0.7, 0.9)]])
            seek = sum(sk["ms"]) / len(sk["ms"]) / 1000 if sk["ms"] else 0.0
            later = int(sk["later"])
        costs = None
        if estimate_only and os.environ.get("MW_AE_GPU") != "1" and film_kind(st, canvas, later) not in ("canvas", "dynamic", "empty"):
            try:
                costs = await measure_costs(pg, info, st, times, work, t_open, say)
                costs["soundMb"] = sound_mb(await pg.evaluate("window.__aimk.audio()"), film_dir, D)
                costs["checks"] = max(3, len(info.get("markers") or []))
            except Exception as e: say(f"  the size check could not time this film: {str(e).splitlines()[0][:200]}")
        est = estimate(st, times, say, canvas=canvas, seek=seek, later=later, costs=costs)
        if estimate_only: await br.close(); return {"estimate": est}
        if est["kind"] in ("canvas", "dynamic", "empty"):          # nothing to record; the rendered film goes in as one video layer (run)
            audio = await pg.evaluate("window.__aimk.audio()")
            await br.close()
            say(f"  {est['kind']} film: no recording (After Effects gets the rendered film as one video layer)")
            return {"canvasOnly": True, "kind": est["kind"], "info": info, "audio": audio, "pictures": {}, "page_errors": errs[:5]}
        t0 = time.time()
        # sampled in chunks of CHUNK times (a 50 s lyric film: 792 layers x 9406 times = ~739 MB of JSON in one
        # page.evaluate came back with "nodes": null and the port died in plan_pictures). Every chunk restarts record.js's on-change
        # memory (text lines, text colour) and its "sig every 4" counter, so it re-records the same values at its first time: no new keys.
        # Each chunk comes back as ONE JSON string parsed by json.loads: Playwright's own value serialisation of ~80 MB took about 3 min
        # of Python CPU and 4 GB per chunk on that film.
        CHUNK = 1000                                              # a multiple of sigEvery
        smp = None
        for i in range(0, len(times), CHUNK):
            part = json.loads(await pg.evaluate(SAMPLE_JS, [times[i:i + CHUNK], {"sigEvery": 4}]) or "null")
            if not part or part.get("nodes") is None or part.get("groups") is None:
                raise SystemExit(f"AE port: sampling times {times[i]:.3f}-{times[min(i + CHUNK, len(times)) - 1]:.3f} s came back empty "
                                 f"({len(st['nodes'])} layers): the page returned no data")
            if smp is None: smp = part
            else:
                smp["t"] += part["t"]
                for a, b in zip(smp["nodes"], part["nodes"]): a.extend(b)
                for a, b in zip(smp["groups"], part["groups"]): a.extend(b)
            if len(times) > CHUNK:
                got = min(i + CHUNK, len(times))
                say(f"  sampled {got}/{len(times)} times ({time.time() - t0:.0f} s{left_words(time.time() - t0, got, len(times))})")
        await pg.evaluate("window.__aimk.seek(0)")
        sty = await pg.evaluate("window.__aimkRec.styles()")
        say(f"  recorded {len(st['nodes'])} layers in {len(st['groups'])} comps, {len(times)} samples ({time.time() - t0:.1f} s)")
        audio = await pg.evaluate("window.__aimk.audio()")            # Moworks Studio: <audio> of sub-compositions too, on the film clock
        rec = {"info": info, "structure": st, "styles": sty, "samples": smp, "bounds": bounds, "audio": audio, "page_errors": errs[:5]}
        # which nodes need pictures
        need = plan_pictures(rec)
        rec["pictures"] = {}; SEQ_CACHE.clear()
        els = st.get("els") or []
        def source_of(n):                                  # motion/image-sequence "source": on the box above the <img>
            nd = st["nodes"][n]
            for e in [nd["e"]] + list(reversed(nd.get("anc") or [])):
                if e < len(els) and els[e].get("source"): return els[e]["source"]
            return None
        if need:
            # progress counted in pictures, not layers, and said while one is made: 54 animated pictures = 8398 frames took 24 min with no line,
            # and a 3D film's "pictures 2/5" stood at 40 % for 42 min over its 3751 PNGs (T28-24)
            nseq = sum(1 for h in need.values() if h["mode"] in ("seq", "seqT"))
            def frames_of(n):
                vis = [k for k, s in enumerate(smp["nodes"][n]) if s[0][12] > 0.001]
                return int(math.ceil(times[vis[-1]] * FPS)) - int(math.floor(times[vis[0]] * FPS)) + 1
            work_total = sum(frames_of(n) if h["mode"] in ("seq", "seqT") else 1 for n, h in need.items())
            work_done, said_at = 0, time.time()
            say(f"  pictures to make: {len(need) - nseq} still, {nseq} animated (a PNG per frame of each, the slow part)")
            say(f"  pictures 0/{work_total}: opening the film for them")
            tp = time.time()
            def tick(k, what, force=False):
                nonlocal said_at
                if not force and time.time() - said_at < PICTURE_LINE_S: return
                said_at = time.time()
                say(f"  pictures {work_done}/{work_total}: layer {k} of {len(need)}, {what} ({time.time() - tp:.0f} s{left_words(time.time() - tp, work_done, work_total)})")
            pg2, _, st2, _ = await open_page(2)
            assert len(st2["nodes"]) == len(st["nodes"]), "structure differs between pages"
            VW, VH = int(info["w"]) + 2 * MARGIN, int(info["h"]) + 2 * MARGIN
            await pg2.set_viewport_size({"width": VW, "height": VH})
            def clamp(r):
                b, pgb = r["box"], r["page"]
                x0, y0 = max(0, pgb[0]), max(0, pgb[1]); x1, y1 = min(VW, pgb[0] + pgb[2]), min(VH, pgb[1] + pgb[3])
                return [b[0] + x0 - pgb[0], b[1] + y0 - pgb[1], x1 - x0, y1 - y0], {"x": x0, "y": y0, "width": max(1, x1 - x0), "height": max(1, y1 - y0)}
            for k, (n, how) in enumerate(need.items(), 1):
                seq = smp["nodes"][n]; ops = [s[0][12] for s in seq]
                if how["mode"] == "remap":                              # the film's own sequence files, not screenshots
                    pic = sequence_footage(film_dir, shots, n, how["seq"], seq, say, source_of(n))
                    work_done += 1
                    if pic: rec["pictures"][n] = pic; continue
                    say(f"  layer {k} of {len(need)}: the files of its image sequence were not found next to the film: a still picture instead")
                    how = {"mode": "still", "pad": 0}
                if how["mode"] == "still":
                    # the middle of the longest stretch at its fullest opacity (the first such sample was often the scene's first frame,
                    # before the element had moved in or been drawn)
                    top = max(ops); runs_, cur = [], []
                    for k2, o in enumerate(ops):
                        if o >= top - 1e-3: cur.append(k2)
                        elif cur: runs_.append(cur); cur = []
                    if cur: runs_.append(cur)
                    best = max(runs_, key=len); i = best[len(best) // 2]; t = times[i]
                    await pg2.evaluate(f"window.__aimk.seek({t})")
                    box, clip = clamp(await pg2.evaluate(f"window.__aimkRec.isolate({n}, {how['pad']}, {MARGIN}, false, {'true' if how.get('hideText') else 'false'})"))
                    f = shots / f"n{n:03d}.png"
                    await pg2.evaluate(PAINT); await pg2.screenshot(path=str(f), clip=clip, omit_background=True)
                    await pg2.evaluate(f"window.__aimkRec.restore({n})")
                    rec["pictures"][n] = {"mode": "still", "file": f.name, "box": box, "scale": 2, "t": t}
                    work_done += 1
                    tick(k, "still", force=True)
                else:                                                   # paint changes over time: a PNG sequence over the visible span
                    vis = [k for k, o in enumerate(ops) if o > 0.001]
                    a, b = times[vis[0]], times[vis[-1]]
                    d = shots / f"n{n:03d}_seq"; d.mkdir(exist_ok=True)
                    f0, f1 = int(math.floor(a * FPS)), int(math.ceil(b * FPS))
                    tick(k, f"animated, {f1 - f0 + 1} frames", force=True)
                    # the whole frame plus the margin: the element may grow, move or change its layout
                    box = [-MARGIN, -MARGIN, VW, VH]
                    await pg.set_viewport_size({"width": VW, "height": VH})
                    keepT = "true" if how["mode"] == "seqT" else "false"
                    for fr in range(f0, f1 + 1):
                        await pg.evaluate(f"window.__aimk.seek({fr / FPS})")
                        await pg.evaluate(f"window.__aimkRec.isolate({n}, {how['pad']}, {MARGIN}, {keepT})")
                        await pg.evaluate(PAINT); await pg.screenshot(path=str(d / f"f_{fr - f0:05d}.png"), clip={"x": 0, "y": 0, "width": VW, "height": VH}, omit_background=True)
                        await pg.evaluate(f"window.__aimkRec.restore({n})")
                        work_done += 1
                        tick(k, f"animated, frame {fr - f0 + 1} of {f1 - f0 + 1}")
                    await pg.set_viewport_size({"width": int(info["w"]), "height": int(info["h"])})
                    rec["pictures"][n] = {"mode": how["mode"], "dir": d.name, "box": box, "scale": 1, "t0": f0 / FPS, "frames": f1 - f0 + 1,
                                          "withText": how.get("withText")}
            say(f"  pictures: {sum(1 for p in rec['pictures'].values() if p['mode'] == 'still')} still, "
                f"{sum(1 for p in rec['pictures'].values() if p['mode'] in ('seq', 'seqT'))} sequence(s), "
                f"{sum(1 for p in rec['pictures'].values() if p['mode'] == 'remap')} image sequence(s) with Time Remap")
        await br.close()
    return rec


def shadow_pad(s):
    nums = [abs(float(x)) for x in re.findall(r"(-?[\d.]+)px", (s.get("shadow") or "") + " " + (s.get("filter") or "").replace("blur", "x"))]
    return int(min(240, math.ceil(sum(nums) + (s.get("svgPad") or 0))))        # svgPad: an SVG filter baked into the picture (record.js)


def simple_box(s):
    """a box AE can draw as a shape layer: one solid colour, uniform radius, optional uniform solid border, no shadow / gradient / pseudo"""
    rad = s["radius"].split()
    return (s["bgi"] == "none" and s["shadow"] == "none" and not s["pseudo"] and len(set(rad)) <= 1 and "%" not in s["radius"] and "/" not in s["radius"]
            and (float(re.findall(r"[\d.]+", s["bw"])[0] if re.findall(r"[\d.]+", s["bw"]) else 0) == 0 or (s["uniformBorder"] and s["bs"] == "solid"))
            )                                                      # filters are effects, so they do not matter here


# ------------------------------------------------------------------ image sequences -> AE image-sequence footage + Time Remap
SEQ_RE = re.compile(r"^(.*?)(\d+)(\.[A-Za-z0-9]+)$")
AE_STILLS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".psd", ".tga", ".bmp", ".exr"}    # what AE imports as a sequence; anything else -> PNG


def image_sequence(srcs):
    """the files an <img> showed over time: {"prefix", "digits", "ext"} when they are one numbered sequence (f0001.webp, f0002.webp...)"""
    u = {s.split("?")[0] for s in srcs if s}
    if len(u) < 2: return None
    ms = [SEQ_RE.match(s) for s in u]
    if not all(ms) or len({(m.group(1), len(m.group(2)), m.group(3).lower()) for m in ms}) != 1: return None
    return {"prefix": ms[0].group(1), "digits": len(ms[0].group(2)), "ext": ms[0].group(3)}


SEQ_CACHE = {}         # one footage per sequence, however many layers play it (cleared for every recording)


def sequence_footage(film_dir, shots, n, sq, recs, say=say, source=None):
    """every file of the sequence (first..last found on disk) -> footage/n<NNN>_imgseq/f_00000.png ... (copied; WebP and other formats AE
    cannot import are converted to PNG with alpha); plus the sequence frame number shown at each sample time.
    source: the client's original files ("<folder>/product_render.####.png", same numbering): imported where they are, at full size, when
    they are all there in a format AE reads (the 1600x1920 originals, not the film's 1200 px WebP)."""
    from PIL import Image
    fr, cur = [], None                                    # the frame number at every sample (record.js records the src when it changes)
    for r in recs:
        if len(r) > 1 and "src" in r[1]:
            m = SEQ_RE.match(r[1]["src"].split("?")[0]); cur = int(m.group(2)) if m else cur
        fr.append(cur)
    key = (sq["prefix"], sq["digits"], sq["ext"].lower(), source or "")
    if key in SEQ_CACHE: return dict(SEQ_CACHE[key], frames=fr)          # a second layer of the same sequence: the same footage
    if source:
        m = re.match(r"^(.*?)(#+)(\.[A-Za-z0-9]+)$", source.replace("\\", "/"))
        if m:
            spre, dig, ext = Path(m.group(1)), len(m.group(2)), m.group(3)
            files = sorted(spre.parent.glob(spre.name + "[0-9]" * dig + ext)) if spre.parent.exists() else []
            nums = [int(f.name[len(spre.name):len(spre.name) + dig]) for f in files]
            if nums and ext.lower() in AE_STILLS and nums == list(range(nums[0], nums[-1] + 1)):
                with Image.open(files[0]) as im: nat = im.size
                pic = {"mode": "remap", "abs": files[0].as_posix(), "first": nums[0], "count": len(nums), "natural": list(nat)}
                say(f"  image sequence n{n:03d}: the originals {spre.name}{'#' * dig}{ext} ({len(nums)} files, {nat[0]}x{nat[1]}) imported where they are")
                SEQ_CACHE[key] = pic; return dict(pic, frames=fr)
            say(f"  image sequence n{n:03d}: its source {source} is missing, has gaps or is not a format AE reads: the film's own files instead")
    pre = (Path(film_dir) / sq["prefix"]) if film_dir else None
    if not pre or not pre.parent.exists(): return None
    files = sorted(pre.parent.glob(pre.name + "[0-9]" * sq["digits"] + sq["ext"]))
    nums = sorted(int(f.name[len(pre.name):len(pre.name) + sq["digits"]]) for f in files)
    if not nums: return None
    first, last = nums[0], nums[-1]
    conv = sq["ext"].lower() not in AE_STILLS
    d = shots / f"n{n:03d}_imgseq"; d.mkdir(exist_ok=True)
    t0, prev = time.time(), None
    for k in range(first, last + 1):
        src = pre.parent / f"{pre.name}{k:0{sq['digits']}d}{sq['ext']}"
        dst = d / f"f_{k - first:05d}{'.png' if conv else sq['ext'].lower()}"
        if not src.exists(): src = prev                   # a gap in the numbering: hold the previous picture, so frame k stays frame k
        prev = src
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime: continue
        if conv:
            with Image.open(src) as im: im.convert("RGBA").save(dst, compress_level=3)
        else: shutil.copy2(src, dst)
    with Image.open(next(iter(sorted(d.iterdir())))) as im: nat = im.size
    say(f"  image sequence n{n:03d}: {last - first + 1} files of {pre.name}*{sq['ext']}{' (converted to PNG)' if conv else ''} -> footage/{d.name} "
        f"({time.time() - t0:.1f} s)")
    pic = {"mode": "remap", "dir": d.name, "first": first, "count": last - first + 1, "natural": list(nat)}
    SEQ_CACHE[key] = pic
    return dict(pic, frames=fr)


def remap_keys(ts, vals, shift, tol=None):
    tol = 0.5 / FPS if tol is None else tol
    """Time Remap values (seconds into the footage) over time -> sparse LINEAR keys: a key wherever the straight line from the last key
    stops fitting every sample within half a footage frame (even playback = one segment, holds = equal keys, cuts = two keys one frame apart).
    Only samples on the comp's frame grid count: AE shows frames only there, and the film snaps its picture to that grid (the 120 Hz
    half-frame samples hold the previous picture, which made a staircase of keys)."""
    on = [i for i, t in enumerate(ts) if abs(t * FPS - round(t * FPS)) < 1e-3]
    if len(on) >= 2: ts, vals = [ts[i] for i in on], [vals[i] for i in on]
    if not ts: return []
    keys, a = [[round(ts[0] - shift, 5), round(vals[0], 5)]], 0
    j = a + 1
    while j < len(ts):
        def fits(b):
            for i in range(a + 1, b):
                f = (ts[i] - ts[a]) / (ts[b] - ts[a]) if ts[b] > ts[a] else 0
                if abs(vals[a] + (vals[b] - vals[a]) * f - vals[i]) > tol: return False
            return True
        if fits(j): j += 1; continue
        a = j - 1; keys.append([round(ts[a] - shift, 5), round(vals[a], 5)]); j = a + 1
    if keys[-1][0] != round(ts[-1] - shift, 5): keys.append([round(ts[-1] - shift, 5), round(vals[-1], 5)])
    return keys


def plan_pictures(rec):
    st, sty, smp = rec["structure"], rec["styles"], rec["samples"]
    need = {}
    for nd in st["nodes"]:
        n, k, s = nd["n"], nd["kind"], sty[nd["n"]]
        seq = smp["nodes"][n]
        if max(x[0][12] for x in seq) <= 0.001: continue                  # never visible
        sigs = {x[1]["sig"] for x in seq if len(x) > 1 and "sig" in x[1]}
        sizes = {(round(x[0][8], 1), round(x[0][9], 1)) for x in seq}
        bgs = {x[1]["bg"] for x in seq if len(x) > 1 and "bg" in x[1]}
        changes = len(sigs) > 1 or (k == "box" and len(bgs) > 1 and not simple_box(s))   # a shape layer keys its fill; a picture cannot
        # a skewed element is no longer a PNG sequence (mode "seqT", still read from older recordings): its skew goes into AE's Transform
        # effect (Builder.transform), so it stays a native, editable layer (54 such sequences took 24 min)
        if k == "box":
            if simple_box(s) and not changes and not s.get("svgPad"): continue   # a box in a stroked group: a picture, stroke baked in (KI-01)
            need[n] = {"mode": "seq" if changes or len(sizes) > 1 and not simple_box(s) else "still", "pad": shadow_pad(s)}
        elif k == "raster":
            if nd.get("vec") and not changes and len(sizes) == 1 and not s.get("svgPad"): continue   # a plain vector SVG: a shape layer (svg_layer)
            need[n] = {"mode": "seq" if changes else "still", "pad": shadow_pad(s)}
        elif k == "image":
            # an <img> that plays a numbered file sequence (motion/image-sequence): ONE AE image-sequence footage of every file + Time
            # Remap keys (the right way on a job, for
            # every image sequence). Before, it became a still: the 3D product froze on one picture.
            sq = image_sequence([x[1]["src"] for x in seq if len(x) > 1 and "src" in x[1]])
            need[n] = {"mode": "remap", "pad": 0, "seq": sq} if sq else {"mode": "still", "pad": shadow_pad(s)}
    # a pictured box whose element also holds its own text (a gradient card with its label): the picture used to catch the
    # text too and the text layer drew it a second time, a little off (house/gallery-strip). A still picture now hides the element's own
    # text (the text layer stays, editable); a sequence keeps the text inside its frames and the text layer is dropped, because the text
    # follows the picture's changing layout / skew exactly that way.
    text_of = {nd["e"]: nd["n"] for nd in st["nodes"] if nd["kind"] == "text"}
    for nd in st["nodes"]:
        n = nd["n"]
        if nd["kind"] != "box" or n not in need or nd["e"] not in text_of: continue
        if need[n]["mode"] == "still": need[n]["hideText"] = True
        else: need[n]["withText"] = text_of[nd["e"]]
    return need


# ------------------------------------------------------------------ build the AE data
PATH = {"anchor": ["ADBE Transform Group", "ADBE Anchor Point"], "x": ["ADBE Transform Group", "ADBE Position_0"], "y": ["ADBE Transform Group", "ADBE Position_1"],
        "scale": ["ADBE Transform Group", "ADBE Scale"], "rot": ["ADBE Transform Group", "ADBE Rotate Z"], "op": ["ADBE Transform Group", "ADBE Opacity"],
        "text": ["ADBE Text Properties", "ADBE Text Document"],
        "rsize": ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", 1, "ADBE Vector Rect Size"],
        "rpos": ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", 1, "ADBE Vector Rect Position"],
        "esize": ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", 1, "ADBE Vector Ellipse Size"],
        "epos": ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", 1, "ADBE Vector Ellipse Position"]}


def multi(ts, cols, tol, shift):
    """several scalars of one AE property (scale x/y, anchor x/y, size w/h): keys at the union of their knots. Each scalar keeps the curve fit() checked
    against its samples: its own speeds at its own keys; a key it only shares is a point on that curve with the curve's slope there, which leaves the curve as it was.
    (Speeds read off the samples instead gave a camera's slow zoom, 100 to 105 % over 3.4 s, 25 %/s out of a key 2.7 s long: 107.09 % at 1 s where the film had 101 %.)"""
    fits = [fit(ts, c, tol) for c in cols]
    if not any(fits): return ("set", [round(c[0], 4) for c in cols])
    knots = sorted({k[0] for f in fits if f for k in f})
    holds = {k[0] for f in fits if f for k in f if k[4]}
    own = [{k[0]: k for k in f} if f else {} for f in fits]
    out = []
    for t in knots:
        v, ins, outs = [], [], []
        for f, o, c in zip(fits, own, cols):
            if not f: v.append(round(c[0], 4)); ins.append(0.0); outs.append(0.0)
            elif t in o: v.append(o[t][1]); ins.append(o[t][2]); outs.append(o[t][3])
            else:
                x, s = key_curve(f, t); s = round(s, 4)
                v.append(round(x, 4)); ins.append(s); outs.append(s)
        out.append([round(t - shift, 5), v, ins, outs, t in holds])
    return ("keys", out)


# AE's Transform effect, measured in AE (Beta) on a picture with coloured corners: Skew s with Skew Axis 0 is a VERTICAL shear
# [[1, 0], [tan s, 1]]; with Skew Axis 90 it is [[1, -tan s], [0, 1]], CSS skewX(-s); Scale Width / Height apply before the skew (Sh . S).
# So skewX(k) = axis 90, Skew -k.
SKEW_AXIS, SKEW_SIGN = 90.0, -1.0


def shear_parts(rec):
    """the 2D matrix as rotation . skewX . scale: M = R(rot) [[1, sh], [0, 1]] diag(sx, sy) -> (sx, sy, rot in degrees, sh = tan(skew))"""
    a, b, c, d = rec[:4]
    sx = math.hypot(a, b); rot = math.degrees(math.atan2(b, a))
    if sx < 1e-9: return 0.0, 0.0, 0.0, 0.0
    sy = (a * d - b * c) / sx; m = (a * c + b * d) / sx
    return sx, sy, rot, (m / sy if abs(sy) > 1e-9 else 0.0)


def shear_parts_post(rec):
    """the 2D matrix as skewX . scale . rotation (for effects drawn after the layer's transform): M = [[1, sh], [0, 1]] diag(sx, sy) R(rot)
    -> (sx, sy, rot in degrees, sh)"""
    a, b, c, d = rec[:4]
    th = math.atan2(b, d); co, si = math.cos(th), math.sin(th)          # (M R^T)[1][0] = 0
    sx = a * co - c * si; sy = b * si + d * co; m = a * si + c * co
    return sx, sy, math.degrees(th), (m / sy if abs(sy) > 1e-9 else 0.0)


def unwrap(vals):
    out = [vals[0]]
    for v in vals[1:]:
        p = out[-1]; v = v + 360 * round((p - v) / 360); out.append(v)
    return out


class Builder:
    def __init__(self, rec, name, work):
        self.rec, self.name, self.work = rec, name, work
        self.st, self.sty, self.smp = rec["structure"], rec["styles"], rec["samples"]
        self.T = self.smp["t"]; self.notes = set(); self.stats = {"keys": 0, "layers": 0, "precomps": 0}
        self.W, self.H, self.D = rec["info"]["w"], rec["info"]["h"], rec["info"]["duration"]
        self.names = set()

    def uname(self, base):
        base = re.sub(r"\s+", " ", base).strip()[:48] or "layer"; n, i = base, 2
        while n in self.names: n = f"{base} {i}"; i += 1
        self.names.add(n); return n

    def put(self, L, key, ch):
        if ch[0] == "set": L.setdefault("set", {})[key] = ch[1]
        else: L.setdefault("keys", {})[key] = ch[1]; self.stats["keys"] += len(ch[1])

    def span(self, ops, shift, T):
        """first / last visible moment (ops and T: the same sample list), in layer time"""
        vis = [i for i, o in enumerate(ops) if o > 0.001]
        if not vis: return None
        a = T[vis[0] - 1] if vis[0] > 0 else T[0]
        b = T[vis[-1] + 1] if vis[-1] + 1 < len(T) else T[-1] + 1 / FPS
        return max(0.0, a - shift), b - shift

    def transform(self, L, recs, local_origin, shift, idx):
        """recs: per sample record; local_origin(i) -> (ax, ay) anchor in layer space and the layout point that it is (px, py)"""
        T = [self.T[i] for i in idx]
        xs, ys, sxs, sys_, rots, axs, ays, sks, mats, ks = [], [], [], [], [], [], [], [], [], []
        for i in idx:
            r = recs[i][0]; a, b, c, d, e, f = r[:6]
            (ax, ay), (lx, ly), k = local_origin(i)
            xs.append(a * lx + c * ly + e); ys.append(b * lx + d * ly + f)
            sx, sy, rot, sh = shear_parts(r)
            sxs.append(sx * 100 * k); sys_.append(sy * 100 * k); rots.append(rot); axs.append(ax); ays.append(ay)
            sks.append(math.degrees(math.atan(sh))); mats.append(r); ks.append(k)
        skewed = max(abs(s) for s in sks) > 0.3
        # a shape layer (and a precomp that collapses) is continuously rasterized: AE draws its effects AFTER its transform, in comp axes,
        # about comp points. Its skew is split the other way round, M = skewX . scale . R (shear_parts_post), the rotation on the layer
        # (measured in AE: the 19_skew card turned 8.5 deg instead of 12 with the layer-first split)
        post = skewed and (L.get("type") == "shape" or bool(L.get("collapse")))
        if post:
            for j, (r, k) in enumerate(zip(mats, ks)):
                sx, sy, rot, sh = shear_parts_post(r)
                sxs[j], sys_[j], rots[j], sks[j] = sx * 100 * k, sy * 100 * k, rot, math.degrees(math.atan(sh))
        nfx = 1
        if skewed:
            # a part squashed flat (a flip through 0, or its two axes almost parallel: past 84.5 deg, a matte sweeping through 90)
            # has a meaningless skew: such samples keep the nearest sound one. AE's Skew takes -70..70 deg (the
            # INTERVIEW letters lying on the table need 77 deg): shears on one axis add up, so a steeper one is split over 2-4 stacked
            # Transform effects (tan k = n . tan(k / n parts))
            ok = [j for j in range(len(sks)) if abs(sys_[j]) > 2 and abs(sks[j]) <= 84.5]
            if ok and len(ok) < len(sks):
                good = list(sks)
                oks = set(ok)
                for j in range(len(sks)):
                    if j in oks: continue
                    q = bisect.bisect_left(ok, j)
                    near = [ok[q2] for q2 in (q - 1, q) if 0 <= q2 < len(ok)]
                    sks[j] = good[min(near, key=lambda o: abs(o - j))]
            tk = [math.tan(math.radians(max(-84.5, min(84.5, s)))) for s in sks]
            nfx = min(4, max(1, math.ceil(max(abs(v) for v in tk) / math.tan(math.radians(69.5)))))
            sks = [math.degrees(math.atan(v / nfx)) for v in tk]
        rots = unwrap(rots)
        self.put(L, "x", channel(T, xs, TOL["pos"], shift)); self.put(L, "y", channel(T, ys, TOL["pos"], shift))
        self.put(L, "rot", channel(T, rots, TOL["rot"], shift))
        anc = multi(T, [axs, ays], TOL["anchor"], shift)
        self.put(L, "anchor", anc)
        if skewed:
            # a skewed element: scale and skew in AE's Transform effect, keyed like the rest; the layer itself keeps position, rotation and
            # 100 % scale (54 skewed parts became PNG sequences, 24 min, not editable). The effect draws skew after
            # scale. It turns about the layer's anchor: in the layer's own pixels for footage and text (= the anchor), in the comp for a shape
            # layer (= its position, keyed with it: measured with a square off the comp's centre)
            self.put(L, "scale", ("set", [100.0, 100.0]))
            ea = multi(T, [xs, ys], TOL["pos"], shift) if post else anc
            first = "Skew (kit)" + (" 1" if nfx > 1 else "")
            fx = {"m": "ADBE Geometry2", "name": first, "set": {"ADBE Geometry2-0011": 0, "ADBE Geometry2-0006": SKEW_AXIS}, "keys": {}}
            for key, ch in (("ADBE Geometry2-0001", ea), ("ADBE Geometry2-0002", ea), ("ADBE Geometry2-0003", channel(T, sys_, TOL["scale"], shift)),
                            ("ADBE Geometry2-0004", channel(T, sxs, TOL["scale"], shift)),
                            ("ADBE Geometry2-0005", channel(T, [SKEW_SIGN * s for s in sks], TOL["rot"], shift))):
                if ch[0] == "set": fx["set"][key] = ch[1]
                else: fx["keys"][key] = ch[1]; self.stats["keys"] += len(ch[1])
            L.setdefault("fx", []).insert(0, fx)
            for part in range(1, nfx):                                # the others add the same skew about the same point: linked to the first
                link = lambda m: f'effect("{first}")("{m}")'
                L["fx"].insert(part, {"m": "ADBE Geometry2", "name": f"Skew (kit) {part + 1}", "keys": {},
                                      "set": {"ADBE Geometry2-0011": 0, "ADBE Geometry2-0006": SKEW_AXIS},
                                      "expr": {m: link(m) for m in ("ADBE Geometry2-0001", "ADBE Geometry2-0002", "ADBE Geometry2-0005")}})
        else:
            self.put(L, "scale", multi(T, [sxs, sys_], TOL["scale"], shift))
        L["sep"] = True
        moving = any(k in L.get("keys", {}) for k in ("x", "y", "scale", "rot"))
        if moving: L["motionBlur"] = True
        return T

    def common(self, L, nd, recs, shift, idx, T):
        fls = [recs[i][1].get("fl", "") if len(recs[i]) > 1 else "" for i in idx]
        if L.get("type") == "footage":                    # a picture already holds its SVG filter (record.js isolate): no effect, no note
            fls = [re.sub(r"url\([^)]*\)", "", f).strip() for f in fls]
        fx, opk = filter_fx(T, fls, [recs[i][0][13] for i in idx], shift, self.notes, L["name"])
        if fx: L["fx"] = L.get("fx", []) + fx                         # after the skew effect transform() may have put there
        ops = [recs[i][0][12] * 100 * k for i, k in zip(idx, opk)]
        self.put(L, "op", channel(T, ops, TOL["op"], shift))
        bl = self.sty[nd["n"]]["blend"]
        if bl and bl != "normal": L["blend"] = bl
        sp = self.span([recs[i][0][12] for i in idx], shift, T)
        if sp: L["inPoint"], L["outPoint"] = round(sp[0], 5), round(sp[1], 5)

    def layer_for(self, nd, shift, gidx):
        n, k = nd["n"], nd["kind"]; recs = self.smp["nodes"][n]; s = self.sty[n]
        idx = gidx
        if max(recs[i][0][12] for i in idx) <= 0.001: return None
        label = nd.get("id") or (nd.get("cls") or nd.get("tag") or k).split(" ")[0]
        pic = self.rec["pictures"].get(str(n)) or self.rec["pictures"].get(n)
        if k == "text" and n in {p.get("withText") for p in self.rec["pictures"].values()}:
            return None                                       # this text is drawn inside its box's picture sequence (plan_pictures)
        if k == "text" and not pic:
            txt0 = next((r[1] for r in recs if len(r) > 1 and "ln" in r[1]), None)
            L = {"type": "text", "name": self.uname(f"{label} \"{(recs[idx[0]][1].get('tx') or '').strip()[:24]}\"")}
            # baseline and line layout, per text change
            lay = {}; cur = txt0
            for i, r in enumerate(recs):
                if len(r) > 1 and "ln" in r[1]: cur = r[1]["ln"]
                lay[i] = cur
            just = {"center": "center", "right": "right", "end": "right"}.get(s["align"], "left")
            def bpoint(i):
                ln = lay[i]
                if not ln or not ln["lines"]: return 0.0, 0.0
                l0 = ln["lines"][0]
                bx = l0["x0"] if just == "left" else (l0["x0"] + l0["x1"]) / 2 if just == "center" else l0["x1"]
                return bx, ln["base"] if ln["base"] is not None else s["size"] * 0.8
            def lo(i):
                r = recs[i][0]; bx, by = bpoint(i)
                return (r[10] - bx, r[11] - by), (r[6] + r[10], r[7] + r[11]), 1.0
            T = self.transform(L, recs, lo, shift, idx)
            ln0 = lay[idx[0]] or {"lines": [{"s": recs[idx[0]][1].get("tx", ""), "top": 0}], "base": None}
            lines = ln0["lines"]; lead = (lines[1]["top"] - lines[0]["top"]) if len(lines) > 1 else None
            tr = s["transform"]
            def fmt(ln):
                t = "\r".join(l["s"] for l in ln["lines"]) if ln and ln["lines"] else ""
                return t.upper() if tr == "uppercase" else t.lower() if tr == "lowercase" else t
            fill, fa = rgba(s["color"])
            ls = px(s["ls"]) if s["ls"] not in ("normal", "") else 0.0
            # the Roboto Flex optical-size faces bring letters close to the browser in AE, but AE draws their digits wider (measured,
            # "12,367" at 220 px: browser 584 px at every optical size, AE 619 with the regular face, 648 with Opsz144): numbers keep the regular face
            # every text the layer shows (a typewriter starts empty: "" matched, so typed words lost their face, AE case text__typewriter)
            shown = [t for t in [fmt(ln0)] + [r[1]["tx"] for r in recs if len(r) > 1 and r[1].get("tx")] if t and t.strip()]
            numeric = bool(shown) and all(re.fullmatch(r"[\d\s.,:;%+\-–—$€£¥₫/()×x]*", t) and re.search(r"\d", t) for t in shown)
            L["text"] = {"s": fmt(ln0), "font": ae_font(s["font"], s["weight"], s["style"], self.notes, None if numeric else s["size"]), "size": round(s["size"], 2), "fill": fill,
                         "tracking": int(round(ls / s["size"] * 1000)) if s["size"] else 0, "just": just, "leading": round(lead, 2) if lead else None}
            # letters styled apart (a <span> with its own size / weight / colour, record.js lines "r"): runs on the joined text, set per letter
            runs, at = [], 0
            for l in lines:
                for a, b, size, weight, style, family, color in l.get("r") or []:
                    st = {}
                    if abs(size - s["size"]) > 0.01: st["size"] = round(size, 2)
                    if (family, weight, style, size) != (s["font"], s["weight"], s["style"], s["size"]):
                        st["font"] = ae_font(family, weight, style, self.notes, size)
                    if color != s["color"]: st["fill"] = rgba(color)[0]
                    if st: runs.append([at + a, at + b, st])
                at += len(l["s"]) + 1
            if runs:
                L["text"]["runs"] = runs
                if len({r[1].get("tx") for r in recs if len(r) > 1 and "tx" in r[1]}) > 1:
                    self.notes.add(f"{L['name']}: the text changes and has letters styled apart: the later texts take the first letter's style")
            elif len(lines) == 1 and lines[0].get("ink") and len(lines[0]["s"].strip()) > 1:   # one line: AE fits its tracking to the browser's ink width
                L["text"]["fitW"] = lines[0]["ink"]
            if fa < 0.999: self.notes.add(f"{L['name']}: text colour alpha {fa} is folded into nothing (AE text fill has no alpha)")
            if s.get("shadowT") not in (None, "none"):            # text-shadow -> Drop Shadow effects (same mapping as filter drop-shadow)
                # each shadow of a list ("rgb(...) 0px 0px 18px, rgba(...) ..."): the space after a comma no longer splits inside rgba(...)
                # (HF caption pages: a two-shadow glow stopped the port)
                for sh in re.findall(r"\s*(?:rgba?\([^)]*\)[^,]*|[^,]+)", s["shadowT"]):
                    mc = re.search(r"rgba?\([^)]*\)", sh)
                    col, a = rgba(mc.group(0)) if mc else ([0, 0, 0], 1.0)
                    dx, dy, bl = ([float(x) for x in re.findall(r"(-?[\d.]+)px", sh)] + [0, 0, 0])[:3]
                    L.setdefault("fx", []).append({"m": "ADBE Drop Shadow", "name": "Text shadow", "keys": {}, "set": {
                        "ADBE Drop Shadow-0001": col + [1], "ADBE Drop Shadow-0002": 255 * a,
                        "ADBE Drop Shadow-0003": (math.degrees(math.atan2(dx, -dy)) + 360) % 360 if (dx or dy) else 135,
                        "ADBE Drop Shadow-0004": math.hypot(dx, dy), "ADBE Drop Shadow-0005": SOFT * bl}})
            # SVG filters of the text or its group (record.js svgFx; KI-01: a stroked PSD group's text came out plain): the outer
            # stroke -> AE text stroke 2r wide under the fill, the shadows -> Drop Shadow effects (stdDeviation sd = a CSS blur of 2 sd)
            fxs = s.get("svgFx")
            if fxs and fxs.get("ok"):
                if fxs.get("s"):
                    r_, c_, op_ = fxs["s"]; col, a = rgba(c_)
                    L["text"]["stroke"] = {"c": col, "w": round(2 * r_, 2)}
                    if a * op_ < 0.999: self.notes.add(f"{L['name']}: stroke opacity {round(a * op_, 2)} is drawn opaque (AE text stroke has no opacity)")
                for dx, dy, sd, c_, op_ in fxs.get("sh") or []:
                    col, a = rgba(c_)
                    L.setdefault("fx", []).append({"m": "ADBE Drop Shadow", "name": "Group shadow", "keys": {}, "set": {
                        "ADBE Drop Shadow-0001": col + [1], "ADBE Drop Shadow-0002": 255 * a * op_,
                        "ADBE Drop Shadow-0003": (math.degrees(math.atan2(dx, -dy)) + 360) % 360 if (dx or dy) else 135,
                        "ADBE Drop Shadow-0004": math.hypot(dx, dy), "ADBE Drop Shadow-0005": SOFT * 2 * sd}})
            elif fxs:
                self.notes.add(f"{L['name']}: the SVG filter on this text or its group is more than a stroke / drop shadow: not ported (plain text in AE)")
            # -webkit-text-stroke (captions: 7 px black, paint-order stroke fill, came out plain white): AE's text stroke is
            # centred on the outline like the browser's; over the fill unless paint-order puts the stroke first
            sw = px(s.get("stroke") or "")
            if sw > 0 and not L["text"].get("stroke"):
                if s.get("strokeC"):
                    col, a = rgba(s["strokeC"])
                    if a > 0: L["text"]["stroke"] = {"c": col, "w": round(sw, 2), "over": not (s.get("po") or "").startswith("stroke")}
                else: self.notes.add(f"{L['name']}: text stroke {sw} px not ported (recorded before 11/10/2026: port again without --rebuild)")
            # text that changes: Source Text keys at each change (layout of the new text measured in the browser)
            tk = []; last = None
            for i in idx:
                r = recs[i]
                if len(r) > 1 and "tx" in r[1]:
                    v = fmt(lay[i]) if lay[i] else r[1]["tx"]
                    if v != last: tk.append([round(self.T[i] - shift, 5), v]); last = v
            # text colour that switches (text/captions accent, tl.set colour): Source Text keys carry the fill too (record.js "col", on change)
            cols, cur = [], s["color"]
            for r in recs:
                if len(r) > 1 and "col" in r[1]: cur = r[1]["col"]
                cols.append(cur)
            if len({cols[i] for i in idx}) > 1:
                tkc, lastc = [], None
                for i in idx:
                    r = recs[i]; v = (fmt(lay[i]) if lay[i] else r[1]["tx"]) if len(r) > 1 and "tx" in r[1] else (lastc[0] if lastc else L["text"]["s"])
                    if (v, cols[i]) != lastc: tkc.append([round(self.T[i] - shift, 5), v, rgba(cols[i])[0]]); lastc = (v, cols[i])
                L["text"]["fill"] = rgba(cols[idx[0]])[0]; L["textKeys"] = tkc
            elif len(tk) > 1:
                cnt = counter(tk)
                if cnt:                       # a number that counts: Slider (keyed, real ease) + Source Text expression (editable)
                    pre, suf, dec, comma = cnt["fmt"]
                    # the shown number is a staircase (rounded); a smooth line through the moments it changes gives sparse eased keys
                    pts = cnt["vals"]
                    if len(pts) > 1: pts = [pts[0], (pts[1][0] - 1 / RATE, pts[0][1])] + pts[1:]      # the start value holds until the first change
                    tr_ = Track([t + shift for t, _ in pts], [v for _, v in pts])
                    vals = [tr_(t) for t in T]
                    ch_ = channel(T, vals, 0.6 * 10 ** -dec, shift)
                    L["fx"] = L.get("fx", []) + [{"m": "ADBE Slider Control", "name": "Count",
                                                  "set": {"ADBE Slider Control-0001": ch_[1]} if ch_[0] == "set" else {}, "keys": {"ADBE Slider Control-0001": ch_[1]} if ch_[0] == "keys" else {}}]
                    L["expr"] = {"text": ('var v = effect("Count")("Slider").value; var s = (Math.round(v * %d) / %d).toFixed(%d);' % (10 ** dec, 10 ** dec, dec)
                                          + (' var p = s.split("."); p[0] = p[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ","); s = p.join(".");' if comma else "")
                                          + " %s + s + %s" % (json.dumps(pre, ensure_ascii=False), json.dumps(suf, ensure_ascii=False)))}
                else: L["textKeys"] = tk
            self.common(L, nd, recs, shift, idx, T)
            return L
        if pic and pic["mode"] == "remap":    # the film's image sequence as ONE footage; the shown frame is a Time Remap key
            r0 = recs[idx[0]][0]; w0, h0 = r0[8], r0[9]
            nw, nh = pic["natural"]
            # motion/image-sequence draws the picture object-fit: contain in its box: scaled by the smaller ratio and centred (a
            # 362 x 380 talking-head sequence in a 1080 x 1080 box came out stretched to the box's width; the same aspect: as before)
            fit = min(w0 / nw, h0 / nh) if w0 and h0 else 1.0
            ox, oy = (w0 - nw * fit) / 2 if w0 else 0.0, (h0 - nh * fit) / 2 if h0 else 0.0
            L = {"type": "footage", "src": "footage/" + pic.get("dir", ""), "seq": True, "name": self.uname(label + " (image sequence, Time Remap)")}
            if pic.get("abs"): L["src"] = L["seqFirst"] = pic["abs"]          # the client's originals, imported where they are
            def lo(i):                        # layer space = footage px; the box's transform origin mapped into the contained picture
                r = recs[i][0]; kx = r[8] / w0 if w0 else 1.0
                return (((r[10] / kx) - ox) / fit, ((r[11] / kx) - oy) / fit), (r[6] + r[10], r[7] + r[11]), kx * fit
            T = self.transform(L, recs, lo, shift, idx)
            fr = pic["frames"]; f0 = pic["first"]
            # seconds into the footage (conformed to FPS), at the MIDDLE of the frame: a value rounded to 5 decimals at a frame's start
            # (311 / 60 = 5.18333 -> 310.9998 frames) showed the frame before it
            vals = [((fr[i] if fr[i] is not None else f0) - f0 + 0.5) / FPS for i in idx]
            L["remap"] = remap_keys([self.T[i] for i in idx], vals, shift)
            self.common(L, nd, recs, shift, idx, T)
            return L
        if k == "raster" and nd.get("vec") and not pic:
            return self.svg_layer(nd, recs, shift, idx, label)
        if pic:
            box = pic["box"]; sc = pic["scale"]
            if pic["mode"] == "still": L = {"type": "footage", "src": "footage/" + pic["file"], "name": self.uname(label)}
            else: L = {"type": "footage", "src": "footage/" + pic["dir"], "seq": True, "seqStart": round(pic["t0"] - shift, 5), "name": self.uname(label + " (sequence)")}
            if pic["mode"] in ("seq", "seqT") and pic.get("frames", 0) >= 2:
                # the kit's own captured sequence (one picture per frame from t0): one footage + Time Remap keys like every image sequence
                # value = the frame's middle, as for remap
                a0 = round(pic["t0"] - shift, 5); N = pic["frames"]
                L["remap"] = [[a0, round(0.5 / FPS, 5)], [round(a0 + (N - 1) / FPS, 5), round((N - 0.5) / FPS, 5)]]
            if pic["mode"] == "seqT":         # the pictures already hold the element's transforms: the layer just sits on the frame
                L["name"] = self.uname(label + " (sequence, skew)")
                L["sep"] = True; L["set"] = {"anchor": [-box[0], -box[1]], "x": 0.0, "y": 0.0, "scale": [100.0, 100.0], "rot": 0.0}
                T = [self.T[i] for i in idx]
                self.common(L, nd, recs, shift, idx, T)
                self.notes.add(f"{L['name']}: skewed, so it is a PNG sequence (AE layers cannot skew); opacity and effects stay editable")
                return L
            # the picture's box is where the element was laid out WHEN it was shot: measure its padding against that sample's layout, not
            # the comp's first one (a card that moves by its layout, house/gallery-strip, landed off once stills were shot mid-span)
            ts_ = pic.get("t")
            ishot = min(range(len(self.T)), key=lambda j: abs(self.T[j] - ts_)) if ts_ is not None else idx[0]
            r0 = recs[ishot][0]; w0, h0 = r0[8], r0[9]
            seq = pic["mode"] == "seq"
            def lo(i):
                r = recs[i][0]
                if seq:                       # a full-frame picture of the element at its layout place: layer space = layout space
                    return (r[6] + r[10] - box[0], r[7] + r[11] - box[1]), (r[6] + r[10], r[7] + r[11]), 1.0
                kx = r[8] / w0 if w0 else 1.0
                pad_x = r0[6] - box[0]; pad_y = r0[7] - box[1]
                return ((pad_x + r[10] / kx) * sc, (pad_y + r[11] / kx) * sc), (r[6] + r[10], r[7] + r[11]), kx / sc
            T = self.transform(L, recs, lo, shift, idx)
            self.common(L, nd, recs, shift, idx, T)
            return L
        if k == "box":
            fill, fa = rgba(s["bg"]); bw = px(s["bw"]); bc, ba = rgba(s["bc"])
            L = {"type": "shape", "name": self.uname(label)}
            def lo(i):
                r = recs[i][0]; return (r[10], r[11]), (r[6] + r[10], r[7] + r[11]), 1.0
            T = self.transform(L, recs, lo, shift, idx)
            ws = [recs[i][0][8] for i in idx]; hs = [recs[i][0][9] for i in idx]
            bgs = [rgba(recs[i][1].get("bg", s["bg"]) if len(recs[i]) > 1 else s["bg"]) for i in idx]
            moving_fill = len({(tuple(c), a) for c, a in bgs}) > 1
            fill, fa = bgs[0]
            L["shape"] = {"kind": "rect", "radius": px(s["radius"].split()[0]) if s["radius"] else 0,
                          "fill": fill + [fa] if (fa > 0 or moving_fill) else None,
                          "stroke": {"color": bc, "width": bw} if bw > 0 and s["bs"] != "none" else None}
            if moving_fill:                   # background-color tweens -> Fill Color / Fill Opacity keys (fill sits after the stroke, if any)
                fi = 3 if L["shape"]["stroke"] else 2
                base_ = ["ADBE Root Vectors Group", 1, "ADBE Vectors Group", fi]
                L["paths"] = {"fillc": base_ + ["ADBE Vector Fill Color"], "fillo": base_ + ["ADBE Vector Fill Opacity"]}
                self.put(L, "fillc", multi(T, [[c[0] for c, _ in bgs], [c[1] for c, _ in bgs], [c[2] for c, _ in bgs], [1.0] * len(bgs)], 0.002, shift))
                self.put(L, "fillo", channel(T, [a * 100 for _, a in bgs], TOL["op"], shift))
            self.put(L, "rsize", multi(T, [ws, hs], TOL["size"], shift))
            self.put(L, "rpos", multi(T, [[w / 2 for w in ws], [h / 2 for h in hs]], TOL["size"], shift))
            self.common(L, nd, recs, shift, idx, T)
            return L
        return None

    def svg_layer(self, nd, recs, shift, idx, label):
        """a plain vector SVG (record.js vecOf: paths and basic shapes, flat colours) -> ONE native shape layer: a shape group per drawn
        element (its paths with their Bezier tangents, fill with its fill rule, stroke), placed exactly like the element's picture would
        be (layer space = the SVG's own box). Groups whose opacity changes (a character's expression, hand or blink variants: hold-frame
        swaps) get hold keys on the group's opacity."""
        V = nd["vec"]; items = V["items"]
        L = {"type": "shape", "name": self.uname(label + " (vector)")}
        def lo(i):
            r = recs[i][0]; return (r[10], r[11]), (r[6] + r[10], r[7] + r[11]), 1.0
        T = self.transform(L, recs, lo, shift, idx)
        co, cur = [], [1.0] * V.get("nCar", 0)                  # carrier opacities per sample (record.js "vo", written when they change)
        for r in recs:
            if len(r) > 1 and "vo" in r[1]: cur = r[1]["vo"]
            co.append(cur)
        n = len(items); paths, keys = {}, {}
        shape_items = []
        for j, it in enumerate(items):
            ops = []
            for i in idx:
                v = it["so"]
                for c in it["car"]: v *= co[i][c] if c < len(co[i]) else 1.0
                ops.append(round(v, 4))
            item = {"name": it["name"][:40], "paths": it["p"], "fill": it["f"], "rule": it["r"], "stroke": it["s"], "under": it["u"]}
            if it.get("clip"): item["clip"] = it["clip"]         # cut by an SVG clipPath: Merge Paths (Intersect) in AE (KI-12)
            if len(set(ops)) == 1: item["op"] = ops[0]
            else:                                            # hold keys where the opacity changes (the film sets it: tl.set)
                ks, last = [], None
                for t, v in zip(T, ops):
                    if v != last: ks.append([round(t - shift, 5), round(v * 100, 3), 0, 0, True, True]); last = v   # k[5]: a real HOLD in AE
                key = f"go{j}"; keys[key] = ks
                paths[key] = ["ADBE Root Vectors Group", n - j, "ADBE Vector Transform Group", "ADBE Vector Group Opacity"]
            shape_items.append(item)
        L["shape"] = {"kind": "svg", "items": shape_items}
        if keys:
            L["paths"] = paths
            for k_, ks in keys.items(): L.setdefault("keys", {})[k_] = ks; self.stats["keys"] += len(ks)
        self.stats["vector"] = self.stats.get("vector", 0) + 1
        self.common(L, nd, recs, shift, idx, T)
        return L

    def clip_geom(self, L, shp, T, shift, idx):
        """clip shapes over time (clip_shape results) -> the matte's rect / ellipse / polygon / Bezier path and its keys"""
        if any(s[0] == "bez" for s in shp):               # clip-path: path(): the first path at the times without one; keys where it changes
            first = next(s for s in shp if s[0] == "bez")
            shp = [s if s[0] == "bez" else first for s in shp]
            L["shape"] = {"kind": "bez", "paths": shp[0][1], "rule": shp[0][2], "fill": [1, 1, 1, 1]}
            sig = lambda s: [len(P["v"]) for P in s[1]]
            if all(sig(s) == sig(shp[0]) for s in shp):
                keys, last = [], None
                for i, s in zip(idx, shp):
                    if s[1] != last: keys.append([round(self.T[i] - shift, 5), s[1]]); last = s[1]
                if len(keys) > 1: L["bezKeys"] = keys
            else: self.notes.add(f"{L['name']}: the clip-path path() changes its number of points: only its first shape is ported")
            return
        if any(s[0] == "poly" for s in shp):              # a polygon at some times (e.g. no clip before a wipe starts): polygons throughout
            n = next(len(s[1]) for s in shp if s[0] == "poly")
            box = lambda s: ("poly", [[s[1], s[2]], [s[1] + s[3], s[2]], [s[1] + s[3], s[2] + s[4]], [s[1], s[2] + s[4]]]) if s[0] == "rect" and n == 4 else None
            shp = [s if s[0] == "poly" else box(s) for s in shp]
            for j in range(1, len(shp)):                  # gaps take the nearest polygon: the one before, else the one after
                if shp[j] is None: shp[j] = shp[j - 1]
            for j in range(len(shp) - 2, -1, -1):
                if shp[j] is None: shp[j] = shp[j + 1]
        if shp[0][0] == "poly" and all(s[0] == "poly" and len(s[1]) == len(shp[0][1]) for s in shp):
            L["shape"] = {"kind": "path", "verts": shp[0][1], "fill": [1, 1, 1, 1]}
            keys, last = [], None                         # a key where the polygon changes, linear in between (dropped when a straight line fits)
            for i, s in zip(idx, shp):
                if s[1] != last: keys.append([round(self.T[i] - shift, 5), s[1]]); last = s[1]
            def lerp(a, b, t0, t1, t): f = (t - t0) / (t1 - t0) if t1 > t0 else 0; return [[x + (y - x) * f for x, y in zip(p, q)] for p, q in zip(a, b)]
            k = 1
            while 0 < k < len(keys) - 1:
                g = lerp(keys[k - 1][1], keys[k + 1][1], keys[k - 1][0], keys[k + 1][0], keys[k][0])
                if max(abs(a - b) for p, q in zip(g, keys[k][1]) for a, b in zip(p, q)) < TOL["size"]: keys.pop(k)
                else: k += 1
            if len(keys) > 1: L["pathKeys"] = keys
        elif shp[0][0] == "poly":
            L["shape"] = {"kind": "path", "verts": shp[0][1], "fill": [1, 1, 1, 1]}
            self.notes.add(f"{L['name']}: the clip-path polygon changes its number of points: only its first shape is ported")
        elif shp[0][0] == "ellipse":
            L["shape"] = {"kind": "ellipse", "fill": [1, 1, 1, 1]}
            self.put(L, "esize", multi(T, [[2 * s[3] for s in shp], [2 * s[4] for s in shp]], TOL["size"], shift))
            self.put(L, "epos", multi(T, [[s[1] for s in shp], [s[2] for s in shp]], TOL["size"], shift))
        else:
            L["shape"] = {"kind": "rect", "radius": shp[0][5], "fill": [1, 1, 1, 1]}
            self.put(L, "rsize", multi(T, [[s[3] for s in shp], [s[4] for s in shp]], TOL["size"], shift))
            self.put(L, "rpos", multi(T, [[s[1] + s[3] / 2 for s in shp], [s[2] + s[4] / 2 for s in shp]], TOL["size"], shift))

    def matte_for(self, nd, shift, idx):
        """a clip node -> a hidden shape layer (rect or ellipse) that follows the clipping element"""
        n = nd["n"]; recs = self.smp["nodes"][n]
        label = "matte " + (nd.get("id") or nd.get("how", "clip"))
        L = {"type": "shape", "name": self.uname(label), "isMatte": True}
        def lo(i):
            r = recs[i][0]; return (r[10], r[11]), (r[6] + r[10], r[7] + r[11]), 1.0
        T = self.transform(L, recs, lo, shift, idx)
        L.pop("motionBlur", None)
        shp = [clip_shape(recs[i][1].get("cp") if len(recs[i]) > 1 else "none", recs[i][0][8], recs[i][0][9], recs[i][1].get("br", "0px") if len(recs[i]) > 1 else "0px") for i in idx]
        if nd.get("textMask"):                              # a ctx.mask text-rise mask only cuts vertically: widen it, because AE draws text a little
            def wide(s):                                    # wider (named weight, e.g. 760 -> ExtraBold 800) and cut the last letter
                if s[0] != "rect": return s
                m = max(0.25 * s[4], 0.08 * s[3]); return ("rect", s[1] - m, s[2], s[3] + 2 * m, s[4], s[5])
            shp = [wide(s) for s in shp]
        self.clip_geom(L, shp, T, shift, idx)
        L["_parent"] = nd.get("clip", -1)                  # an outer clip: chained in comp() (inner matte cut by the outer matte)
        return L

    def comp(self, g):
        G = self.st["groups"][g]
        shift = G["start"] if G["kind"] == "scene" else 0.0
        a, b = (G["start"], G["start"] + G["dur"]) if G["kind"] == "scene" else (0, self.D)
        idx = [i for i, t in enumerate(self.T) if a - 1e-6 <= t <= b + 1e-6]
        layers, mattes = [], {}
        # paint order: by the recorder's stacking key (z-index inside each stacking context, then page order); recordings made before
        # stacking keys existed have no key and keep page order
        for nd in sorted((x for x in self.st["nodes"] if x["g"] == g), key=lambda x: (x.get("zk", []), x["n"]) if "zk" in x else ([], x["n"])):
            self._done = getattr(self, "_done", 0) + 1                # progress, a line every 10 s (it used to be minutes with no line)
            if time.time() - getattr(self, "_said", 0) > 10 and getattr(self, "say", None):
                self._said = time.time(); self.say(f"  keyframes {self._done}/{len(self.st['nodes'])} elements")
            if nd["kind"] == "clip":
                M = self.matte_for(nd, shift, idx); M["_n"] = nd["n"]; mattes[nd["n"]] = M; continue
            L = self.layer_for(nd, shift, idx)
            if not L: continue
            L["_n"] = nd["n"]; L["_zk"] = nd.get("zk")
            if nd["clip"] >= 0:
                L["matte"] = nd["clip"]
            layers.append(L)
        out = []
        # every layer keeps its paint order; a matte goes right above the first layer it cuts (AE renders it hidden). A track matte
        # (setTrackMatte, AE 2023+) may sit anywhere in the comp, so the later layers it cuts stay where they paint (gathered
        # under their matte's first layer, the logo and the AVAILABLE tags went below the theatre set and the spotlight that cover them)
        for L in layers:
            M = mattes.get(L["matte"]) if "matte" in L else None
            if "matte" in L and M is None: L.pop("matte")          # its clip is not in this comp: the layer uncut (it was dropped before)
            out.append(L)
            if M is not None:
                if not M.get("_placed"): out.append(M); M["_placed"] = True
                L["matte"] = M["name"]
        for M in mattes.values(): M.pop("_placed", None)
        # a clip inside another clip: the inner matte is itself cut by the outer matte (track matte on a matte layer; AE 2023+ track mattes
        # may be any layer), so the layers inside get the intersection of both (before, only the inner clip was ported)
        for M in [x for x in out if x.get("isMatte")]:
            P = mattes.get(M.get("_parent", -1))
            if P is None: continue
            if P not in out: out.insert(out.index(M) + 1, P)
            M["matte"] = P["name"]
        for M in mattes.values(): M.pop("_parent", None)
        self.stats["layers"] += len(out)
        return {"name": f"{self.name} - {G['name']}" if G["kind"] == "scene" else self.name, "w": self.W, "h": self.H,
                "dur": round(G["dur"] if G["kind"] == "scene" else self.D, 5), "folder": self.name + "/Scenes" if G["kind"] == "scene" else self.name,
                "layers": out}

    def scene_layer(self, g, comp):
        """the scene precomp inside the main comp, with the inner's own motion (transitions)"""
        G = self.st["groups"][g]; recs = [[r] for r in self.smp["groups"][g]]
        idx = [i for i, t in enumerate(self.T) if G["start"] - 1e-6 <= t <= G["start"] + G["dur"] + 1e-6]
        L = {"type": "comp", "src": comp["name"], "name": self.uname(G["name"]), "start": G["start"]}
        def lo(i):
            r = recs[i][0]; return (r[10], r[11]), (r[6] + r[10], r[7] + r[11]), 1.0
        T = self.transform(L, recs, lo, 0.0, idx)
        fx, opk = filter_fx(T, [recs[i][0][16] if len(recs[i][0]) > 16 else "" for i in idx], [recs[i][0][13] for i in idx], 0.0, self.notes, L["name"])
        if fx: L["fx"] = fx
        ops = [recs[i][0][12] * 100 * k for i, k in zip(idx, opk)]; self.put(L, "op", channel(T, ops, TOL["op"], 0.0))
        L["inPoint"], L["outPoint"] = G["start"], round(G["start"] + G["dur"], 5)
        out = [L]
        cps = {r[0][14] for r in recs}
        if cps != {"none"}:
            M = {"type": "shape", "name": self.uname("matte " + G["name"]), "isMatte": True, "inPoint": L["inPoint"], "outPoint": L["outPoint"]}
            self.transform(M, recs, lo, 0.0, idx); M.pop("motionBlur", None)
            shp = [clip_shape(recs[i][0][14], recs[i][0][8], recs[i][0][9], recs[i][0][15]) for i in idx]
            self.clip_geom(M, shp, T, 0.0, idx)
            L["matte"] = M["name"]; out.append(M)
        return out

    def build(self):
        comps = []; main = None
        scene_layers = {}
        for G in self.st["groups"]:
            if G["kind"] == "scene":
                c = self.comp(G["g"]); comps.append(c); scene_layers[G["g"]] = self.scene_layer(G["g"], c)
        main = self.comp(0)
        # main comp order = DOM order of the stage: a scene precomp sits where its clip is (G.at = first node walked after it),
        # so the background goes below, and the clip's own overlays (transition panels) above it
        merged = []
        if all("zk" in G for G in self.st["groups"] if G["kind"] == "scene"):     # stacking keys (older recordings have none)
            todo = sorted((G["zk"], G["g"]) for G in self.st["groups"] if G["kind"] == "scene")
            for L in main["layers"]:
                while todo and not L.get("isMatte") and L.get("_zk") is not None and L["_zk"] > todo[0][0]: merged += scene_layers[todo.pop(0)[1]]
                merged.append(L)
        else:
            todo = sorted((G["at"], G["g"]) for G in self.st["groups"] if G["kind"] == "scene")
            for L in main["layers"]:
                while todo and L.get("_n", 10 ** 9) >= todo[0][0]: merged += scene_layers[todo.pop(0)[1]]
                merged.append(L)
        for _, g in todo: merged += scene_layers[g]
        main["layers"] = merged
        main["motionBlur"] = False
        comps.append(main)
        return self.precomps(comps)

    # ---------------------------------------------------------- precomps
    PRE_RE = re.compile(r"^(.*?)[_\-]?\d+$")

    def _path(self, L):
        """the element chain of a layer inside its comp (outermost first, the layer's own element last); None: not from one element"""
        n = L.get("_n")
        if n is None or L.get("type") == "comp": return None
        nd = self.st["nodes"][n]
        return list(nd.get("anc") or []) + [nd["e"]]

    def _elname(self, e):
        els = self.st.get("els") or []
        m = els[e] if 0 <= e < len(els) else {}
        return m.get("id") or m.get("cls") or m.get("tag") or "group"

    def _closed(self, run, layers):
        """a run can move into a precomp only with every matte it uses, and no layer left outside may use a matte inside"""
        names, ids = {L["name"] for L in run}, {id(L) for L in run}
        if any(L.get("matte") and L["matte"] not in names for L in run): return False
        return not any(L.get("matte") in names for L in layers if id(L) not in ids)

    def _make(self, c, run, label):
        quoted = lambda n: (re.search(r'"(.*)"', n) or re.search(r"()", n)).group(1)     # a text layer is named <id> "<its first words>"
        txt = next((quoted(L["name"]) for L in run if L.get("type") == "text" and quoted(L["name"]).strip()), "")
        nm = self.uname(label + (f" · {txt.strip()[:20]}" if txt.strip() else ""))
        # the number that makes a name unique goes AFTER the cut: cutting the whole name at 120 cut the number off too, the name never
        # changed and the loop never ended (nested precomp names over 120 characters, "Port to AE" ran for ever)
        base = f"{c['name']} · {nm}"
        cn, i = base[:120], 2
        while cn in self.cnames: s = f" {i}"; cn = base[:120 - len(s)] + s; i += 1
        self.cnames.add(cn)
        P = {"name": cn, "w": c["w"], "h": c["h"], "dur": c["dur"], "folder": self.name + "/Precomps", "layers": run}
        PL = {"type": "comp", "src": cn, "name": nm, "start": 0.0, "_pre": True}
        ins, outs = [L.get("inPoint") for L in run], [L.get("outPoint") for L in run]
        if all(v is not None for v in ins): PL["inPoint"] = min(ins)
        if all(v is not None for v in outs): PL["outPoint"] = max(outs)
        if any(L.get("blend") for L in run): PL["collapse"] = True          # still blends with the layers below it
        if any(L.get("motionBlur") for L in run): PL["motionBlur"] = True
        self.stats["precomps"] += 1
        return P, PL

    def _group(self, c, d=0):
        """precompose c's layers that share the element at depth d of their chains (contiguous runs of 2+), then one level deeper inside
        each new precomp; what is left: runs of 3+ siblings named <prefix><number>. Returns the new comps, inner ones first."""
        made, layers = [], c["layers"]
        if d > 6 or len(layers) < 3: return made
        keys = [(lambda q: q[d] if q and len(q) > d else None)(self._path(L)) for L in layers]
        if keys[0] is not None and all(k == keys[0] for k in keys):       # everything under one element: look one level deeper here
            return self._group(c, d + 1)
        out, i = [], 0
        while i < len(layers):
            k, j = keys[i], i + 1
            while k is not None and j < len(layers) and keys[j] == k: j += 1
            run = layers[i:j]
            if k is not None and len(run) >= 2 and self._closed(run, layers):
                P, PL = self._make(c, run, self._elname(k))
                made += self._group(P, d + 1); made.append(P); out.append(PL)
            else: out += run
            i = j
        c["layers"] = out
        return made + self._prefix(c)

    def _prefix(self, c):
        made, layers, out, i = [], c["layers"], [], 0
        def pre(L):
            if L.get("_pre") or L.get("type") == "comp" or L.get("_n") is None: return None
            m = self.PRE_RE.match(self.st["nodes"][L["_n"]].get("id") or "")
            return m.group(1) if m and m.group(1) else None
        keys = [pre(L) for L in layers]
        while i < len(layers):
            k, j = keys[i], i + 1
            while k is not None and j < len(layers) and keys[j] == k: j += 1
            run = layers[i:j]
            if k is not None and len(run) >= 3 and len(layers) - len(run) >= 2 and self._closed(run, layers):   # not a precomp of nearly all
                P, PL = self._make(c, run, f"{k} ×{len(run)}"); made.append(P); out.append(PL)
            else: out += run
            i = j
        c["layers"] = out
        return made

    def precomps(self, comps):
        self.cnames = {c["name"] for c in comps}
        out = []
        for c in comps:
            out += self._group(c); out.append(c)
        for c in out:
            for L in c["layers"]: L.pop("_pre", None)
        return out


def level_layer_keys(c, start, mg, dur):
    """Audio Levels of a clip as the runtime takes them: {"set": [dB, dB]} or {"keys": [[film s, [dB, dB], inSpeed, outSpeed, hold]...]}, straight between
    keys: each key's speed is the slope of the piece it ends and of the piece it starts"""
    from audio_mix import level_keys
    kind, v = level_keys(c, mg, dur)
    if kind == "set": return {"set": [v, v]}
    out = []
    for i, (t, db) in enumerate(v):
        slope = lambda a, b: (b[1] - a[1]) / (b[0] - a[0])
        out.append([round(start + t, 5), [db, db], round(slope(v[i - 1], v[i]), 3) if i else 0.0, round(slope(v[i], v[i + 1]), 3) if i < len(v) - 1 else 0.0, 0])
    return {"keys": out}


def audio_layers(p, film, work, cl=None, total=0.0):
    """the film's <audio> clips as AE audio layers: each file once in footage/audio/ (travels with the .aep), one AE cannot import as WAV (audio_mix AE_TAKES),
    layer start = clip start - media start, in / out = the clip, Audio Levels = the clip's whole gain: volume, HF's volume lane, fades (audio_mix level_keys).
    -> (layers, {"clips", "converted": [names], "lost": [{name, file, why}], "plain": [names]}): "lost" a clip with no layer and why, "plain" a clip whose speed, loop or
    effects stay behind (neither its layer nor the stems have them)"""
    from audio_mix import AE_TAKES, duration, master, to_wav
    out, used, files = [], set(), {}
    cl = [c for c in (cl or []) if c.get("src")]
    info = {"clips": len(cl), "converted": [], "lost": [], "plain": []}
    for c in cl:                                          # HF's bundle writes paths from the project root (a page URL path too)
        c["src"] = re.sub(r"^(?:https?://[^/]+)?/+", "", c["src"])
    # the same master gain as mix.wav, so AE's mix is at the film's loudness too; mix.wav + stems (voice / music / sfx) written beside the project
    # (the stems come with Port to AE; the MOV / MP4 are finished films and carry their sound inside)
    bad = {}
    mg = master(p, [c for c in cl if (p / c["src"]).is_file()], total, work / "audio", bad) if cl else 0.0
    dst = work / "footage" / "audio"

    def footage_of(src):
        """the file in footage/audio/ for a source: copied, or as WAV; a file on the timeline many times is one footage item in AE"""
        key = str(src)
        if key in files: return files[key]
        convert = src.suffix.lower() not in AE_TAKES
        stem, ext = src.stem, ".wav" if convert else src.suffix
        fn = stem + ext
        while fn.lower() in used: fn = "_" + fn
        dst.mkdir(parents=True, exist_ok=True)
        # the same file from a port whose AE still holds it: not copied again; a changed file that AE holds goes in under a new name
        same = lambda x: x.exists() and x.stat().st_size == src.stat().st_size and x.read_bytes() == src.read_bytes()
        k = 2
        while True:
            used.add(fn.lower()); d = dst / fn
            try:
                if convert: to_wav(src, d)
                elif not same(d): shutil.copy2(src, d)
                break
            except PermissionError:
                fn = f"{stem}_{k}{ext}"; k += 1
            except subprocess.CalledProcessError:              # ffmpeg holds no lock message of its own: a held file and a bad file look alike, so one try under a new name
                if d.exists() and k == 2: fn = f"{stem}_{k}{ext}"; k += 1; continue
                raise
        if convert: info["converted"].append(src.name)
        files[key] = fn
        return fn

    for c in cl:
        src = p / c["src"]; name = "♪ " + (c["id"] or src.name)
        if not src.is_file():
            info["lost"].append({"name": name, "file": src.name, "why": "the file is not in the film's folder"}); continue
        if (c["id"] or c["src"]) in bad:
            info["lost"].append({"name": name, "file": src.name, "why": "the file cannot be read as sound"}); continue
        try: fn = footage_of(src)
        except (subprocess.CalledProcessError, OSError) as e:
            info["lost"].append({"name": name, "file": src.name, "why": f"it could not be made into a WAV ({type(e).__name__})"}); continue
        try: d = c["dur"] if c["dur"] > 0 else max(0.05, duration(src) - c["media_start"])
        except (SystemExit, OSError):
            info["lost"].append({"name": name, "file": src.name, "why": "the file cannot be read as sound"}); continue
        a, b = c["start"], c["start"] + d
        L = {"type": "footage", "src": "footage/audio/" + fn, "name": name, "start": round(a - c["media_start"], 4),
             "inPoint": round(a, 4), "outPoint": round(b, 4), "paths": {"audio": ["ADBE Audio Group", "ADBE Audio Levels"]}}
        L.update({k: {"audio": v} for k, v in level_layer_keys(c, a, mg, d).items()})
        if c.get("rate", 1) != 1 or c.get("loop") or c.get("fx"): info["plain"].append(c["id"] or src.name)
        out.append(L)
    return out, info


def port_report(p, film_title, comps, B, pictures, rec, audio, sound, lost=(), made=None, checks=None):
    """AE-PORT.md. Before AE runs it says what was sent; lost / made: what After Effects built, so the file says what the project holds"""
    n = sum(len(c["layers"]) for c in comps)
    sound_made = len(audio) - sum(1 for x in lost if x["sound"]) if made else len(audio)
    lines = [f"# AE port: {film_title}", "", f"- built {time.strftime('%Y-%m-%d %H:%M')}, {len(comps)} comps ({B.stats['precomps']} of them precomps of "
             "grouped layers, folder Precomps), " + (f"{n - len(lost)} of {n} layers made, " if made and lost else f"{n} layers, ") + f"{B.stats['keys']} keys",
             f"- pictures: {pictures} (still PNG at 2x or PNG sequence, in footage/)", "- motion blur: switch on for moving layers, comp switch off (turn it on in the comp)"]
    if sound["clips"]:
        conv = f"; {len(sound['converted'])} file(s) After Effects cannot import went in as WAV ({', '.join(sorted(set(Path(x).suffix.lower() for x in sound['converted'])))})" if sound["converted"] else ""
        lines.append(f"- audio: {sound_made} of {sound['clips']} sound layer(s) in the main comp (files in footage/audio/{conv}; volume, volume lane and fades as Audio Levels keys); "
                     "the whole mix and its stems: Audio/mix.wav + voice.wav, music.wav, sfx.wav next to it, the film's loudness target")
    gone = [x for x in sound["lost"]] + [x for x in lost]
    if gone:
        lines += ["", "## Not in the project", ""] + [f"- {x['name']}{' (' + x['file'] + ')' if x.get('file') else ''}: {x['why']}" for x in gone]
    if sound["plain"]:
        lines += ["", "## Sound that plays differently in the film", "", f"- at another speed, in a loop or with effects in the film; as a plain clip here and in the stems: {', '.join(sound['plain'])}"]
    if checks:
        off = [c for c in checks if c.get("diff") is None or c["diff"] > 0.02]
        lines += ["", "## Frame checks (After Effects against the film)", "", f"- {len(checks)} frame(s), {len(off)} off by more than 2 % of pixels"]
        lines += [f"- {c['t']} s: " + ("no reference frame" if c.get("diff") is None else f"{c['diff']:.2%} of pixels differ") for c in off]
    lines.append("")
    if rec["page_errors"]: lines.append(f"- page errors while recording: {rec['page_errors']}")
    if B.notes: lines += ["## Not ported / check", ""] + [f"- {x}" for x in sorted(B.notes)]
    return "\n".join(lines) + "\n"


def ae_failures(work):
    """the layers After Effects did not build, from the runtime's build.log.failed: [{comp, name, file, why, sound}]"""
    f = work / "build.log.failed"
    if not f.exists(): return []
    out = []
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        cols = line.split("\t")
        if len(cols) < 4: continue
        why = re.sub(r"^Error:\s*", "", cols[3]); why = re.sub(r"^After Effects(?: \(Beta\))? error:\s*", "", why); why = re.sub(r"\s*\(line \d+\)\s*$", "", why)
        out.append({"comp": cols[0], "name": cols[1], "file": Path(cols[2]).name if cols[2] else "", "why": why, "sound": cols[1].startswith("♪")})
    return out


CLOSE_JSX = r"""(function () {
  var out = [], P = app.project;
  try {
    // only the project the port built: nothing of the user's
    if (P.file !== null && P.file.fsName.replace(/\\/g, "/").toLowerCase().indexOf(K.work.toLowerCase()) === 0) { P.close(CloseOptions.DO_NOT_SAVE_CHANGES); out.push("closed"); }
    else out.push("left open");
  } catch (e) { out.push("ERROR " + e.toString() + " (line " + e.line + ")"); }
  var d = new File(K.done); d.encoding = "UTF-8"; d.open("w"); d.write(out.join("\n")); d.close();
})();
"""


def small_jsx(work, name, code, K, timeout=300, say=say):
    done = work / f"{name}.done"
    (work / f"{name}.jsx").write_text("var K = " + json.dumps({**K, "done": str(done).replace("\\", "/")}, ensure_ascii=False) + ";\n" + code, encoding="utf-8")
    return run_jsx(work / f"{name}.jsx", done, timeout=timeout, say=say)


def close_work_project(work, say=say):
    small_jsx(work, "close", CLOSE_JSX, {"work": str(work).replace("\\", "/") + "/"}, timeout=120, say=say)


REOPEN_JSX = r"""(function () {
  var out = [], P, i, it, miss = 0;
  try {
    app.beginSuppressDialogs();
    P = app.open(new File(K.aep));
    for (i = 1; i <= P.numItems; i++) { it = P.item(i); if (it instanceof FootageItem && it.footageMissing) { miss++; if (miss <= 5) out.push("MISSING " + it.name); } }
    out.push("missing " + miss);
  } catch (e) { out.push("ERROR " + e.toString() + " (line " + e.line + ")"); }
  try { app.endSuppressDialogs(false); } catch (e2) {}
  var d = new File(K.done); d.encoding = "UTF-8"; d.open("w"); d.write(out.join("\n")); d.close();
})();
"""


# AE has found its footage beside it, which marks the project changed, and the next export stops on "unsaved changes". A save in the script that opened it says "Access is denied"
# (After Effects (Beta) 27.1): AE still holds the file. It takes a script of its own.
RESAVE_JSX = r"""(function () {
  var out = [], P = app.project, errs = [];
  try {
    if (P.file !== null && P.file.fsName.replace(/\\/g, "/").toLowerCase() === K.aep.toLowerCase() && P.dirty) {
      app.beginSuppressDialogs();
      app.onError = function (m) { errs.push(m); };
      P.save();
      app.onError = null;
      app.endSuppressDialogs(false);
    }
    out.push("dirty " + P.dirty + (errs.length ? " " + errs.join(" ") : ""));
  } catch (e) { out.push("ERROR " + e.toString() + " (line " + e.line + ")"); }
  var d = new File(K.done); d.encoding = "UTF-8"; d.open("w"); d.write(out.join("\n")); d.close();
})();
"""


def open_copy(aep, work, say=say):
    """the project in the film's folder opened in After Effects: the one the user keeps, and no more reason to hold the work folder. -> "" or what went wrong"""
    K = {"aep": str(aep).replace("\\", "/")}
    res = small_jsx(work, "open", REOPEN_JSX, K, timeout=300, say=say)
    if "ERROR" in res: return res.strip().splitlines()[-1][:200]
    m = re.search(r"missing (\d+)", res)
    if m and m[1] != "0": return f"{m[1]} footage item(s) not found"
    res = small_jsx(work, "resave", RESAVE_JSX, K, timeout=120, say=say)
    # a folder path past Windows' limit ("cannot find the path"): the project works; the next export says to save or close it
    m = re.search(r"dirty true\s*(.*)", res)
    if m: say(f"  note: After Effects could not save the finished project where it is ({re.sub(r'^.*warning:[ ]*', '', m[1]).strip() or 'no reason given'}). Save it from After Effects, or close it before the next export.")
    return ""


KEEP_WORK = ("port.json", "build.log", "build.out", "build.log.failed", "open.out")


def clean_work(work, say=say):
    """the work folder holds nothing the finished project needs: footage, sound and the .aep went to the film's folder (a 60 s film left 1.7 GB behind).
    MW_AE_KEEP_WORK=1 keeps it for --rebuild."""
    if os.environ.get("MW_AE_KEEP_WORK") == "1": return
    for f in sorted(work.iterdir()):
        if f.name in KEEP_WORK: continue
        if f.is_dir(): shutil.rmtree(f, ignore_errors=True)
        else:
            try: f.unlink()
            except OSError: pass


def lost_note(sound_lost, sound_total, ae_lost, layers_total):
    """the dialog's line when a layer did not make it, in plain words: how many of how many, which files. The whole list is in AE-PORT.md"""
    gone = [x for x in sound_lost] + [x for x in ae_lost if x["sound"]]
    pics = [x for x in ae_lost if not x["sound"]]
    out = []
    if gone:
        files = sorted({x["file"] or x["name"] for x in gone})
        out.append(f"{len(gone)} of {sound_total} sound layers are not in the project ({', '.join(files[:6])}{'…' if len(files) > 6 else ''}). Audio/mix.wav holds every sound that could be read")
    if pics:
        names = [x["name"] for x in pics]
        out.append(f"{len(pics)} of {layers_total} layers are not in the project ({', '.join(names[:6])}{'…' if len(names) > 6 else ''})")
    return "  note: " + ". ".join(out) + ". Why each one: AE-PORT.md."


def carry(src, dst):
    """a folder to the film's folder: moved when both sit on one disk (a second copy of 1.6 GB took as long as AE's build, and the disk held both), else copied"""
    if not src.exists(): return
    if not dst.exists():
        try: os.replace(src, dst); return
        except OSError: pass
    shutil.copytree(src, dst, dirs_exist_ok=True)


def _where(project):
    p = film_dir(Path(project).resolve())
    film = p / "index.html"
    if not film.exists(): raise SystemExit(f"no index.html in {p}")
    name = re.sub(r"[^\w\-]+", "_", film_name(p)).strip("_") or "film"
    return p, film, name, WORK / name


class CanvasFilm:
    """A film drawn on canvases only (Lemo / anidoodle Canvas 2D styles, Whiteboard: one <canvas>) has no layers to record. Its main
    comp holds the rendered film (film_file: the app's render of the film as it is now) as ONE video layer, its sound off: the sound is
    the audio layers, as in every port. Not recorded: about a minute instead of an hour of samples that held nothing."""
    def __init__(self, rec, name, work, film_file, say=say):
        if not film_file or not Path(film_file).is_file():
            say("NEEDS_FILM: After Effects gets this film as its rendered video: render the film, then export again")
            raise SystemExit(4)
        self.rec, self.name, self.work, self.film = rec, name, work, Path(film_file)
        self.stats = {"precomps": 0, "layers": 1, "keys": 0}
        why = {"dynamic": "makes its picture as it plays", "empty": "draws outside its layers"}.get(rec.get("kind"), "is drawn on a canvas")
        self.notes = {f"The film {why}: After Effects gets it as one video layer (the rendered film), not as layers you can edit. "
                      "Its sound is in the audio layers."}

    def build(self):
        dst = self.work / "footage"; dst.mkdir(parents=True, exist_ok=True)
        fn = "film" + (self.film.suffix or ".mp4")
        shutil.copy2(self.film, dst / fn)
        info = self.rec["info"]
        L = {"type": "footage", "src": "footage/" + fn, "name": "Film (rendered)", "start": 0, "audioOff": True}
        return [{"name": self.name, "w": int(info["w"]), "h": int(info["h"]), "dur": round(info["duration"], 5), "folder": self.name,
                 "layers": [L], "motionBlur": False}]


def run(project, run_ae=False, check="", save=True, say=say, estimate_only=False, rebuild=False, url=None, fps=30.0, out=None, ref_dir=None, rate=120.0,
        film_file=None):
    import gzip
    global FPS, RATE
    FPS, RATE = float(fps), float(rate)
    appenv.OUT["dir"] = out
    p, film, name, work = _where(project)
    t0 = time.time()
    webfonts(p)
    if rebuild:                                           # the AE step again from the saved recording: no new recording
        f = work / "rec.json.gz"
        if not f.exists(): raise SystemExit(f"no saved recording in {work} (a finished export empties its work folder unless MW_AE_KEEP_WORK=1): run the port again")
        with gzip.open(f, "rt", encoding="utf-8") as fh: rec = json.load(fh)
        say(f"AE port of {film_name(p)}: rebuilt from the recording of {time.strftime('%d/%m %H:%M', time.localtime(f.stat().st_mtime))} (no new recording)")
    else:
        if not estimate_only:
            if work.exists(): shutil.rmtree(work, ignore_errors=True)
            work.mkdir(parents=True, exist_ok=True)
        if not url: raise SystemExit("no page URL: the app serves the film on HF's own page (packages/hf-page) and passes --url")
        say(f"AE port of {film_name(p)} at {FPS:g} fps" + (" (size only)" if estimate_only else ""))
        rec = asyncio.run(record(url, work, say, film_dir=p, estimate_only=estimate_only))
        if estimate_only: return rec["estimate"]
        with gzip.open(work / "rec.json.gz", "wt", encoding="utf-8", compresslevel=1) as fh: json.dump(rec, fh)   # for --rebuild
    rec["pictures"] = {int(k): v for k, v in rec["pictures"].items()}
    if rec.get("canvasOnly"):
        B = CanvasFilm(rec, name, work, film_file, say)
    else:
        B = Builder(rec, name, work); B.say = say; B._said = time.time()
        say(f"  keyframes: {len(rec['structure']['nodes'])} elements, every key fitted (a minute or more on a long film)")
    comps = B.build()
    audio, sound = audio_layers(p, film, work, rec.get("audio"), rec["info"]["duration"])
    comps[-1]["layers"] += audio                          # the main comp; audio on top (no picture)
    aep = work / f"{name}.aep"
    data = {"root": name, "fps": FPS, "paths": PATH, "comps": comps, "base": str(work).replace("\\", "/") + "/",
            "log": str(work / "build.log").replace("\\", "/"), "done": str(work / "build.done").replace("\\", "/"),
            "save": str(aep).replace("\\", "/") if save else None, "renders": [], "timing": bool(os.environ.get("AIMK_AE_TIMING")),
            "workRoot": str(WORK).replace("\\", "/") + "/"}
    if check:
        (work / "check").mkdir(exist_ok=True)
        D = rec["info"]["duration"]
        ts = [round(D * k, 2) for k in (0.25, 0.5, 0.85)] if check == "auto" else [float(x) for x in check.split(",") if x.strip()]
        for t in ts:
            data["renders"].append({"comp": name, "t": t, "file": str(work / "check" / f"ae_{t:07.3f}.png").replace("\\", "/")})
    (work / "port.json").write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
    rt = (HERE / "ae_runtime.jsx").read_text(encoding="utf-8")
    (work / "build.jsx").write_text("var DATA = " + json.dumps(data, ensure_ascii=False) + ";\n" + rt, encoding="utf-8")
    report = lambda **kw: port_report(p, film_name(p), comps, B, len(rec["pictures"]), rec, audio, sound, **kw)
    (work / "AE-PORT.md").write_text(report(), encoding="utf-8")
    say(f"  data: {len(comps)} comps ({B.stats['precomps']} precomps), {B.stats['layers']} layers, {B.stats['keys']} keys ({time.time() - t0:.1f} s) -> {work / 'build.jsx'}")
    for x in sorted(B.notes): say("  note: " + x)
    if sound["converted"]:
        kinds = sorted({Path(x).suffix.lower() for x in sound["converted"]})
        say(f"  audio: {len(sound['converted'])} file(s) went in as WAV, After Effects does not import {', '.join(kinds)}")
    if sound["plain"]: say(f"  note: {len(sound['plain'])} sound(s) play at another speed, in a loop or with effects in the film; After Effects and the stems have them plain: {', '.join(sound['plain'][:6])}")
    if not run_ae:
        if sound["lost"]: say(lost_note(sound["lost"], sound["clips"], [], len(comps)))
        return work
    res = run_jsx(work / "build.jsx", work / "build.done", say=say)
    if "ERROR" in res:
        return res
    lost = ae_failures(work)
    n_layers = sum(len(c["layers"]) for c in comps)
    # the true counts, on the dialog (index.mjs: result.layers) and in AE-PORT.md
    gone_sound = len(sound["lost"]) + sum(1 for x in lost if x["sound"])
    say("AE-LAYERS " + json.dumps({"layers": n_layers - len(lost), "of": n_layers, "sound": sound["clips"] - gone_sound, "soundOf": sound["clips"], "converted": len(sound["converted"]),
                                   "lost": [{k: x.get(k, "") for k in ("name", "file", "why")} for x in sound["lost"] + lost][:40]}, ensure_ascii=False))
    if sound["lost"] or lost: say(lost_note(sound["lost"], sound["clips"], lost, n_layers))
    checks = compare(p, work, data["renders"], say, ref_dir) if check else None
    (work / "AE-PORT.md").write_text(report(lost=lost, made=True, checks=checks), encoding="utf-8")
    if save and aep.exists():
        dst = renders(p, "ae")                                    # <film>/05_AE (older films: renders/ae)
        for f in [aep, work / "AE-PORT.md"]: shutil.copy2(f, dst / f.name)
        # AE lets go of the project in the work folder before its footage moves: AE then opens the copy it hands over, the one its title bar should say (it said
        # runtime/work), and finds the footage beside it: nothing in the work folder is linked any more
        close_work_project(work, say)
        carry(work / "footage", dst / "footage")
        if (work / "audio").exists():                             # Moworks Studio: <out>/Audio (mix.wav + stems)
            (dst / "Audio").mkdir(exist_ok=True)
            new = {f.name: f for f in (work / "audio").rglob("*.wav")}
            for fn, f in sorted(new.items()): shutil.copy2(f, dst / "Audio" / fn)
            say(f"  audio: {dst / 'Audio'} (mix.wav + " + ", ".join(f.name for f in sorted((work / 'audio' / 'stems').glob('*.wav'))) + ")")
        # the check frames of a shot that is off, side by side, for whoever looks at it
        off = [c for c in checks or [] if c.get("diff") is not None and c["diff"] > 0.02 and c.get("file") and Path(c["file"]).exists()]
        if off:
            (dst / "check").mkdir(exist_ok=True)
            for c in off: shutil.copy2(c["file"], dst / "check" / Path(c["file"]).name)
        say(f"  copied to {dst}")
        why = open_copy(dst / aep.name, work, say)
        if why: say(f"  note: After Effects did not open the finished project by itself ({why}). Show in folder has it.")
        clean_work(work, say)
    return res


FIX_JSX = r"""(function () {
  var out = [], i, comp = null, P = app.project;
  function log(s) { out.push(s); }
  try {
    if (!P || !P.file) throw new Error("no saved After Effects project is open (open the port's .aep first)");
    P.save(); P.file.copy(K.backup); log("copy before the fix: " + K.backup);
    for (i = 1; i <= P.numItems; i++) { var it = P.item(i); if (it instanceof CompItem && it.name === K.comp) { comp = it; break; } }
    if (!comp) log("no comp named " + K.comp + ": no check frames");
    if (comp) for (i = 0; i < K.times.length; i++) comp.saveFrameToPng(K.times[i], new File(K.before[i]));
    app.beginUndoGroup("Moworks Motion fix: " + K.name);
    $.evalFile(new File(K.script));
    app.endUndoGroup();
    if (comp) for (i = 0; i < K.times.length; i++) comp.saveFrameToPng(K.times[i], new File(K.after[i]));
    P.save(); log("saved " + P.file.fsName); log("PROJECT " + P.file.fsName.replace(/\\/g, "/"));
  } catch (e) { log("ERROR " + e.toString() + " (line " + e.line + ")"); }
  var d = new File(K.done); d.encoding = "UTF-8"; d.open("w"); d.write(out.join("\n")); d.close();
})();
"""


def fix(project, script, check="auto", say=say):
    """kit.py ae <project> --jsx <file>: a script on the project open in AE (precomps and quick fixes in AE, no new port).
    A copy of the .aep is kept first; the check frames are rendered before and after (what changed) and compared with the browser."""
    from PIL import Image
    import numpy as np
    p, film, name, work = _where(project)
    script = Path(script).resolve()
    if not script.is_file(): raise SystemExit(f"no script {script}")
    stamp = time.strftime("%Y%m%d-%H%M%S"); fx = work / "fix" / stamp; fx.mkdir(parents=True, exist_ok=True)
    D = float(re.search(r'data-duration="([\d.]+)"', film.read_text(encoding="utf-8")).group(1))
    ts = [round(D * k, 2) for k in (0.25, 0.5, 0.85)] if check in ("", "auto") else [float(x) for x in check.split(",") if x.strip()]
    K = {"name": script.name, "comp": name, "times": ts, "script": script.as_posix(), "backup": (fx / f"{name}.before.aep").as_posix(),
         "before": [(fx / f"before_{t:06.2f}.png").as_posix() for t in ts], "after": [(fx / f"ae_{t:06.2f}.png").as_posix() for t in ts],
         "done": (fx / "fix.done").as_posix()}
    (fx / "fix.jsx").write_text("var K = " + json.dumps(K, ensure_ascii=False) + ";\n" + FIX_JSX, encoding="utf-8")
    say(f"AE fix of {film_name(p)}: {script.name} on the open project")
    res = run_jsx(fx / "fix.jsx", fx / "fix.done", say=say)
    if "ERROR" in res: return res
    for t, a, b in zip(ts, K["before"], K["after"]):
        if not (Path(a).exists() and Path(b).exists()): continue
        A, B = (np.asarray(Image.open(x).convert("RGB")).astype(int) for x in (a, b))
        say(f"  {t} s: {(np.abs(A - B).max(axis=2) > 40).mean():.2%} of pixels changed by the fix")
    compare(p, fx, [{"t": t, "file": f} for t, f in zip(ts, K["after"])], say)
    m = re.search(r"PROJECT (.+)", res)
    if m:                                                 # the kit's work copy was fixed: the user's copy in renders/ae follows
        proj = Path(m.group(1).strip()); dst = renders(p, "ae")
        if str(proj).lower().startswith(str(work).lower()) and proj.exists():
            dst.mkdir(parents=True, exist_ok=True); shutil.copy2(proj, dst / proj.name); say(f"  copied to {dst / proj.name}")
    say(f"  the project before the fix: {K['backup']}")
    return res


def run_jsx(jsx, done, timeout=3600, say=say):
    """the script inside the open After Effects; while AE builds, the lines of its progress file (build.log.progress: every comp, every
    20 layers) are shown as "  AE build: ..." (the port looked frozen; and 15 min was too short for 287 layers)"""
    ps = HERE / "run_jsx.ps1"
    prog = Path(done).with_name("build.log.progress"); prog.unlink(missing_ok=True)
    # PowerShell's output goes to a FILE: through a pipe that nobody reads while it runs, the done log (7 KB in one test) filled
    # the pipe's 4 KB, PowerShell waited to write and Python waited for it to end, for ever
    res = Path(done).with_name(Path(done).stem + ".out"); res.unlink(missing_ok=True)
    with open(res, "w", encoding="utf-8") as fh:
        pr = subprocess.Popen(["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps), str(jsx), str(done), str(timeout)], stdout=fh,
                              stderr=subprocess.STDOUT, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))   # no console window
        seen = 0
        while pr.poll() is None:
            time.sleep(2)
            try: lines = prog.read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError: continue
            for line in lines[seen:]:
                if line.strip(): say("  AE build: " + line.strip())
            seen = len(lines)
    out = res.read_text(encoding="utf-8", errors="replace")
    say("  AE: " + out.strip().replace("\n", "\n      "))
    return out


def settled(f, tries=60):
    """the frame AE wrote, read whole: AE writes its check frames after its script has ended, so one that exists may still be half written (with a frame a shot: "image file is
    truncated" on the 13th). None when it stays unreadable."""
    from PIL import Image
    for _ in range(tries):
        try:
            with Image.open(f) as im: return im.convert("RGB")
        except (OSError, SyntaxError): time.sleep(0.5)
    return None


def compare(p, work, renders, say=say, ref_dir=None):
    """HF's frame (hyperframes snapshot --at: ref_dir/frame-NN-at-<t>s.png, made by the app) vs AE's frame, side by side.
    Moworks Studio: the reference is HF's own still, not the recorder's browser (kit: its own driver, which drew HF blocks blank).
    -> [{t, diff, file}], diff None for a frame that could not be compared"""
    from PIL import Image
    import numpy as np
    # a frame a shot now: AE writes them after its script ends, so the wait runs from the last one written, not from the start
    seen, since = -1, time.time()
    while time.time() - since < 60:
        got = sum(1 for r in renders if Path(r["file"]).exists())
        if got == len(renders): break
        if got != seen: seen, since = got, time.time()
        time.sleep(0.5)
    refs = {}
    for f in (Path(ref_dir).glob("frame-*-at-*s.png") if ref_dir else []):
        m = re.search(r"-at-([\d.]+)s\.png$", f.name)
        if m: refs[float(m.group(1))] = f
    out = []
    for r in renders:
        # the nearest HF still within 5 ms: HF names it with 3 decimals (5.505) while the check time has 4 (5.5055 at 29.97 fps), and
        # rounding both to 2 decimals split them (5.50 vs 5.51: "missing frame")
        near = min(refs, key=lambda t: abs(t - r["t"]), default=None)
        a = refs[near] if near is not None and abs(near - r["t"]) < 0.005 else None; b = Path(r["file"])
        Bm = settled(b) if a and a.exists() and b.exists() else None
        if Bm is None:
            say(f"  check {r['t']}: missing frame"); out.append({"t": r["t"], "diff": None}); continue
        A = Image.open(a).convert("RGB"); Bm = Bm.resize(A.size)
        sbs = Image.new("RGB", (A.width * 2 + 10, A.height), "white"); sbs.paste(A, (0, 0)); sbs.paste(Bm, (A.width + 10, 0))
        sbs.thumbnail((1920, 1080)); f = work / "check" / f"cmp_{r['t']:07.3f}.png"; sbs.save(f)
        d = float((np.abs(np.asarray(A).astype(int) - np.asarray(Bm).astype(int)).max(axis=2) > 40).mean())
        say(f"  check {r['t']} s: {d:.2%} of pixels differ by more than 40/255 -> {f}")
        out.append({"t": r["t"], "diff": round(d, 5), "file": str(f)})
    (work / "check" / "result.json").write_text(json.dumps(out), encoding="utf-8")
    return out


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="AE port of a HyperFrames project (Moworks Studio)")
    ap.add_argument("project"); ap.add_argument("--url"); ap.add_argument("--fps", default="30"); ap.add_argument("--rate", default="120")
    ap.add_argument("--out"); ap.add_argument("--run", action="store_true"); ap.add_argument("--check", default="")
    ap.add_argument("--ref-dir"); ap.add_argument("--estimate", action="store_true"); ap.add_argument("--rebuild", action="store_true")
    ap.add_argument("--no-save", action="store_true"); ap.add_argument("--film")         # the rendered film, for a canvas film
    a = ap.parse_args(argv)
    n, _, d = a.fps.partition("/"); rn, _, rd = a.rate.partition("/")
    res = run(a.project, run_ae=a.run, check=a.check, save=not a.no_save, estimate_only=a.estimate, rebuild=a.rebuild, url=a.url,
              fps=float(n) / float(d or 1), out=a.out, ref_dir=a.ref_dir, rate=float(rn) / float(rd or 1), film_file=a.film)
    if isinstance(res, dict): say("ESTIMATE " + json.dumps(res))
    if isinstance(res, str) and "ERROR" in res: sys.exit(3)


if __name__ == "__main__":
    main()
