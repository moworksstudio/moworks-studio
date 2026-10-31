/* Moworks Studio's image sequence player: a pre-rendered sequence (a 3D product turning, as numbered pictures) played by film time. The app copies this file into a
   film (assets/_app/vendor/mw-sequence.js) and loads it for any element with data-mw-sequence (JSON: config/rules/moworks-alive/sequence.md); Claude writes no player.
   Written from the idea of the Moworks Motion kit's motion/image-sequence preset (Moworks, commit 0a4a0a3):
     - one <img>, its src changed: two pictures are never shown together, at any speed (a dissolve read as a double image on Test 30);
     - the picture follows time SNAPPED to the film's frame grid, so a frame is a function of its number;
     - HyperFrames' seek protocol (hf-seek, e.detail.waitUntil, runtimes.md) holds the capture until the picture is decoded; a picture that fails is asked for again, twice;
     - the light sweep is cut to the product's own alpha (canvas source-in, blended with screen), bound to the picture on show, strongest mid-turn and absent when it does not turn;
     - After Effects: the recorder sees one <img> playing a numbered file (ae-export/port/port.py image_sequence), one footage with Time Remap; `source` names the originals.
   The maths also runs in Node, for the app's checks (globalThis.__mwSeqMath, hf-qa/sequence.mjs), so a check reads the picture the player shows. */
(() => {
  const EASE = { lin: (x) => x, in: (x) => x * x * x, out: (x) => 1 - Math.pow(1 - x, 3), io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), sin: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    step: (x) => (x >= 1 ? 1 : 0) };
  /** Keys are [t, value..., ease?]; the ease names the stretch that ends at that key. Values at t. */
  const keyAt = (K, t, n = 1) => {
    const vals = (k) => k.slice(1, 1 + n);
    if (!K?.length) return null;
    if (t <= K[0][0]) return vals(K[0]);
    for (let i = 1; i < K.length; i++) {
      if (t >= K[i][0] && !(i + 1 < K.length && t >= K[i + 1][0]) && K[i][0] === t) return vals(K[i]);
      if (t < K[i][0]) {
        const a = K[i - 1], b = K[i], x = (EASE[b[1 + n]] ?? EASE.lin)(Math.min(1, Math.max(0, (t - a[0]) / Math.max(1e-6, b[0] - a[0]))));
        return vals(a).map((q, j) => q + (b[1 + j] - q) * x);
      }
    }
    return vals(K[K.length - 1]);
  };
  const snap = (t, fps) => Math.round(t * fps + 1e-6) / fps;
  /** The picture number on show at film second t (snapped to the grid). */
  const pictureAt = (o, t, fps) => {
    const v = keyAt(o.keys, snap(t, fps))?.[0] ?? o.first ?? 1;
    return Math.min(o.last ?? Infinity, Math.max(o.first ?? -Infinity, Math.round(v + 1e-6)));
  };
  /** The turns of a sequence: runs of keys that keep changing the picture in one direction, [{ t0, t1, f0, f1 }]; a step key is no turn, nor a drift on a rest pose (under 0.5 pictures a frame). */
  const turnsOf = (keys, fps = 30) => {
    const out = []; let cur = null;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i], d = b[1] - a[1];
      if (!d || b[2] === "step" || Math.abs(d) / (Math.max(1e-6, b[0] - a[0]) * fps) < 0.5) { cur = null; continue; }
      if (cur && Math.sign(cur.f1 - cur.f0) === Math.sign(d) && cur.t1 === a[0]) { cur.t1 = b[0]; cur.f1 = b[1]; }
      else out.push(cur = { t0: a[0], t1: b[0], f0: a[1], f1: b[1] });
    }
    return out.filter((c) => c.t1 - c.t0 >= 0.15);
  };
  /** The sweep at t: { at: 0..1 across the picture, level: 0..1 } or null. Bound to the picture on show, never to the clock; a move under 0.25 pictures a frame shows none. */
  const sweepAt = (o, turns, t, fps) => {
    if (!o.sweep) return null;
    const c = turns.find((x) => t >= x.t0 && t <= x.t1);
    if (!c) return null;
    const v = keyAt(o.keys, t)[0], d = Math.min(1, Math.max(0, (v - c.f0) / (c.f1 - c.f0))), speed = Math.abs(keyAt(o.keys, t + 0.5 / fps)[0] - keyAt(o.keys, t - 0.5 / fps)[0]);
    const level = Math.pow(Math.sin(Math.PI * d), 0.7) * Math.min(1, Math.max(0, (speed - 0.25) / 0.75));
    return level > 0.004 ? { at: c.f1 > c.f0 ? d : 1 - d, level } : null;
  };
  const math = { EASE, keyAt, snap, pictureAt, turnsOf, sweepAt };
  globalThis.__mwSeqMath = math;
  if (typeof window === "undefined" || typeof HTMLImageElement === "undefined" || window.__mwSeq) return;          // HTMLImageElement: a page stubbed for a check (posecheck-run.mjs) has a document of its own

  const filmFps = () => Number(document.querySelector("[data-composition-id][data-fps]")?.getAttribute("data-fps")) || 30;
  const shown = new Map();          // the element -> its state
  let pending = Promise.resolve();
  const setup = (el) => {
    let o; try { o = JSON.parse(el.getAttribute("data-mw-sequence")); } catch { console.error(`data-mw-sequence of #${el.id}: not JSON`); shown.set(el, null); return null; }
    const box = document.createElement("div");
    box.className = "mw-seq-box"; box.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
    const img = document.createElement("img");
    img.alt = ""; img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block";
    box.appendChild(img);
    let cv = null;
    if (o.sweep) {
      cv = document.createElement("canvas"); cv.className = "mw-seq-sweep";
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;pointer-events:none;display:none";
      box.appendChild(cv);
    }
    el.appendChild(box);
    if (o.source) el.setAttribute("data-aimk-source", o.source);          // the AE port takes the originals from the box above the <img>
    const name = (f) => o.dir + String(f).padStart(o.digits ?? 4, "0") + (o.ext ?? ".png");
    const s = { o, el, box, img, cv, name, cur: null, drawn: "", fps: Number(o.fps) || filmFps() };
    s.turns = turnsOf(o.keys ?? [], s.fps);
    shown.set(el, s);
    return s;
  };
  const paint = (s, sw) => {
    const { cv, img } = s;
    if (!cv) return;
    const key = sw ? `${s.cur}|${sw.at.toFixed(3)}|${sw.level.toFixed(3)}` : "";
    if (s.drawn === key) return;
    s.drawn = key;
    if (!sw) { cv.style.display = "none"; return; }
    cv.style.display = "block";
    if (cv.width !== img.naturalWidth) { cv.width = img.naturalWidth || 400; cv.height = img.naturalHeight || 800; }
    const g = cv.getContext("2d"), w = cv.width, h = cv.height, c = s.o.sweep === true ? {} : s.o.sweep;
    const peak = c.peak ?? 0.45, B = (c.band ?? 0.22) * w, th = (c.angle ?? -22) * Math.PI / 180, dx = Math.cos(th), dy = Math.sin(th);
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h); g.globalCompositeOperation = "source-in";
    const cx = -B + sw.at * (w + 2 * B), cy = h / 2, gr = g.createLinearGradient(cx - dx * B, cy - dy * B, cx + dx * B, cy + dy * B), a = peak * sw.level;
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.35, `rgba(255,255,255,${a * 0.55})`); gr.addColorStop(0.5, `rgba(255,255,255,${a})`);
    gr.addColorStop(0.65, `rgba(255,255,255,${a * 0.55})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  };
  const load = (s, want, tries) => (s.img.decode ? s.img.decode() : Promise.resolve()).catch(() => {
    if (tries > 0 && s.img.getAttribute("src") === want) { s.img.removeAttribute("src"); s.img.setAttribute("src", want); return load(s, want, tries - 1); }
    return undefined;
  });
  const draw = (s, t, wait) => {
    const { o } = s, T = snap(t, s.fps), f = pictureAt(o, T, s.fps);
    const [x, y, k] = keyAt(o.pos, T, 3) ?? [0, 0, 1];
    const fy = o.float ? o.float[0] * Math.sin(2 * Math.PI * T / o.float[1]) : 0, rot = o.sway ? o.sway[0] * Math.sin(2 * Math.PI * T / o.sway[1] + 1) : 0;
    s.box.style.transform = `translate(${x.toFixed(2)}px,${(y + fy).toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${k.toFixed(4)})`;
    const op = keyAt(o.op, T)?.[0];
    if (op != null) s.box.style.opacity = op.toFixed(3);
    const sw = sweepAt(o, s.turns, T, s.fps);
    if (f === s.cur) { paint(s, sw); return; }
    s.cur = f; s.drawn = "\0";
    const want = s.name(f);
    s.img.setAttribute("src", want);
    const done = load(s, want, 2).then(() => paint(s, sw));
    pending = Promise.all([pending, done]);
    wait?.(done);
  };
  const all = () => {
    for (const el of document.querySelectorAll("[data-mw-sequence]")) if (!shown.has(el)) setup(el);
    return [...shown.values()].filter(Boolean);
  };
  let last = 0;
  window.addEventListener("hf-seek", (e) => { last = e.detail.time; for (const s of all()) draw(s, last, e.detail.waitUntil); });
  const first = () => { for (const s of all()) draw(s, last, null); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", first); else first();

  /** For the app's checks (hf-qa/sequence.mjs): what is on screen now, after the last picture was decoded. */
  window.__mwSeq = {
    settled: () => pending,
    report: () => all().map((s) => {
      let vis = true;
      for (let x = s.img; x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === "none" || c.visibility === "hidden" || Number(c.opacity) < 0.02) { vis = false; break; } }
      const r = s.img.getBoundingClientRect();
      return { id: s.el.id, frame: s.cur, rect: [r.left, r.top, r.width, r.height], natural: [s.img.naturalWidth, s.img.naturalHeight], visible: vis, closeUps: s.o.closeUps ?? [] };
    }),
  };
})();
