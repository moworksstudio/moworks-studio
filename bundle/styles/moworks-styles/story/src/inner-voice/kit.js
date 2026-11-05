// kit.js — the "inner-voice short" look in plain JavaScript (Canvas 2D): a dark, quiet animated short told in
// captions. Near-black rooms drawn in thin grey hand-drawn lines, one cream capsule character, a black shadow figure
// with a red glow, Comic Sans captions (white = the narrator, red = the inner voice), a "DAY N" counter, slow fades.
// Spec + palette: .claude/skills/inner-voice-short/references/STYLE.md. World = 1920×1080, floor at y 742,
// letterbox bars 96 px (active picture 1920×888 ≈ 2.16:1). Every function draws on a 2D context `x`.

// ── time + easing helpers ──────────────────────────────────────────────────────────────────────────────────────
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};
/** 0 → 1 between times a and b, eased */
export const ramp = (t, a, b, ease = E.inOut) => ease(clamp((t - a) / (b - a)));
/** keyframes [[time, value, ease?], …] → value at t */
export const track = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(v0, v1, (e ?? E.inOut)((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
};
/** smooth wobble in −1..1 (idle life: breathing, sway) */
export const wob = (t, seed = 0, speed = 1) => Math.sin(t * 1.3 * speed + seed * 12.9) * 0.6 + Math.sin(t * 2.7 * speed + seed * 4.1) * 0.3 + Math.sin(t * 5.3 * speed + seed * 7.7) * 0.1;
/** deterministic random 0..1 for an index (same every frame) */
export const rnd = (i, seed = 1) => {
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const rgba = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** run fn with a saved transform: translate, rotate (deg), scale */
export const at = (x, tx, ty, rot, sx, sy, fn) => {
  x.save();
  x.translate(tx, ty);
  if (rot) x.rotate((rot * Math.PI) / 180);
  if (sx !== 1 || sy !== 1) x.scale(sx, sy ?? sx);
  fn();
  x.restore();
};
/** run fn at a multiplied opacity */
export const alpha = (x, a, fn) => {
  if (a <= 0.001) return;
  x.save();
  x.globalAlpha *= a;
  fn();
  x.restore();
};

// ── constants ──────────────────────────────────────────────────────────────────────────────────────────────────
export const W = 1920;
export const H = 1080;
export const BAR = 96;
export const FLOOR = 742;
/** the caption face: Comic Sans MS, Comic Neue as the free fallback */
export const HAND = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive';
/** palette: one colour per role (STYLE.md → Palette) */
export const P = {
  bar: "#000000", bg: "#0b0b0c", bgEdge: "#040404", floor: "#3a3a3a",
  line: "#64636b", lineDim: "#4f4b4d", ink: "#151411",
  skin: "#d9d8cc", skinShade: "#a7a398", skinEdge: "#121212", bag: "#8f8b80",
  glass: "#12161f", moon: "#bbbec8", shaft: "#9aa0b4",
  couch: "#29252f", couchLine: "#5a5560", blanket: "#282d3d", blanketLine: "#4a5064", wood: "#221e1c",
  clockFace: "#19191b", clockRim: "#727272", hands: "#cfcfcf",
  red: "#ec4836", redGlow: "#a8321f", redHot: "#ff5a40", redEye: "#fc7e74",
  white: "#e6e6e2", day: "#a3a3a3", grey: "#838383",
  phone: "#9cc6fc", phoneGlow: "#4f7fd6", lamp: "#f2c27a", sweat: "#8fc4f0",
  guitar: "#5e4630", guitarTop: "#6c5137", guitarLine: "#8d6d4f", neck: "#3a2c22", neckLine: "#5e4836", string: "#d6d0c2",
};
const RAD = Math.PI / 180;

// ── hand-drawn lines ───────────────────────────────────────────────────────────────────────────────────────────
// Shapes are point lists. `wobble` nudges each point along its normal with slow, fixed noise (seeded, so the line
// is the same every frame: this style's lines are steady, not boiling).
const densify = (pts, closed, step = 7) => {
  const out = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};
export const wobble = (pts, closed, amp = 1.1, seed = 1) => {
  const p = densify(pts, closed);
  const n = p.length;
  let s = 0;
  return p.map((q, i) => {
    if (i) s += Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]);
    const a = closed ? p[(i - 1 + n) % n] : p[Math.max(0, i - 1)];
    const b = closed ? p[(i + 1) % n] : p[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const k = amp * (Math.sin(s * 0.019 + seed * 3.1) * 0.6 + Math.sin(s * 0.053 + seed * 7.3) * 0.4);
    return [q[0] - (dy / L) * k, q[1] + (dx / L) * k];
  });
};
const trace = (x, pts, closed) => {
  x.beginPath();
  pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
  if (closed) x.closePath();
};
/** fill and/or stroke a point list with the hand-drawn wobble */
export const shape = (x, pts, o = {}) => {
  const closed = o.closed ?? true;
  const q = wobble(pts, closed, o.amp ?? 1.1, o.seed ?? 1);
  trace(x, q, closed);
  if (o.fill) {
    x.fillStyle = o.fill;
    x.fill();
  }
  if (o.stroke) {
    x.strokeStyle = o.stroke;
    x.lineWidth = o.width ?? 3.5;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.stroke();
  }
};
/** rounded-rectangle outline as points */
export const rr = (X, Y, w, h, r) => {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const arc = (cx, cy, a0) => {
    for (let k = 0; k <= 6; k++) {
      const a = (a0 + (k / 6) * 90) * RAD;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(X + w - r, Y + r, -90);
  arc(X + w - r, Y + h - r, 0);
  arc(X + r, Y + h - r, 90);
  arc(X + r, Y + r, 180);
  return pts;
};
/** ellipse outline as points */
export const ell = (cx, cy, rx, ry, n = 40) => [...Array(n)].map((_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry]);
export const lineH = (x, x1, y1, x2, y2, color = P.line, width = 3.5, seed = 3) => shape(x, [[x1, y1], [x2, y2]], { closed: false, stroke: color, width, seed });

// ── soft light (quarter-resolution blur: cheap, smooth) ─────────────────────────────────────────────────────────
const quarter = [];
const qcv = (i) => {
  if (!quarter[i]) {
    const cv = document.createElement("canvas");
    cv.width = W / 4;
    cv.height = H / 4;
    quarter[i] = cv;
  }
  return quarter[i];
};
/** draw fn (in world coords) into a quarter-size buffer, blur it, lay it over the picture (screen by default) */
export const softLight = (x, fn, o = {}) => {
  const a = qcv(0);
  const b = qcv(1);
  const ya = a.getContext("2d");
  ya.setTransform(1, 0, 0, 1, 0, 0);
  ya.clearRect(0, 0, a.width, a.height);
  ya.setTransform(0.25, 0, 0, 0.25, 0, 0);
  fn(ya);
  const yb = b.getContext("2d");
  yb.setTransform(1, 0, 0, 1, 0, 0);
  yb.clearRect(0, 0, b.width, b.height);
  yb.filter = `blur(${o.blur ?? 6}px)`;
  yb.drawImage(a, 0, 0);
  yb.filter = "none";
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = o.mode ?? "screen";
  x.globalAlpha = o.op ?? 1;
  x.imageSmoothingQuality = "high";
  x.drawImage(b, 0, 0, W, H);
  x.restore();
};
export const radial = (x, cx, cy, r, color, op = 1) => {
  if (op <= 0.001) return;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, op));
  g.addColorStop(0.4, rgba(color, op * 0.45));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.fill();
};

// ── the room ───────────────────────────────────────────────────────────────────────────────────────────────────
/** near-black wall with a soft centre, the thin floor line */
export const room = (x, o = {}) => {
  x.fillStyle = P.bg;
  x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(o.cx ?? 960, 520, 0, o.cx ?? 960, 520, 1150);
  g.addColorStop(0, "#0e0e0f");
  g.addColorStop(0.55, "#0a0a0b");
  g.addColorStop(1, P.bgEdge);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  if (o.floor !== false) shape(x, [[-20, FLOOR], [W + 20, FLOOR]], { closed: false, stroke: P.floor, width: 2.5, amp: 0.7, seed: 2 });
};
/** the moonlight shaft: the window swept down-left onto the floor (dir = [dx, 1]) */
export const moonShaft = (x, win, o = {}) => {
  const d = o.dir ?? -0.78;
  const end = o.end ?? FLOOR + 140;
  const { x: wx, y: wy, w, h } = win;
  const reach = (px, py) => [px + d * (end - py), end];
  softLight(
    x,
    (y) => {
      const poly = [[wx, wy], [wx + w, wy], [wx + w, wy + h], reach(wx + w, wy + h), reach(wx, wy)];
      const g = y.createLinearGradient(wx + w / 2, wy, wx + w / 2 + d * (end - wy), end);
      g.addColorStop(0, rgba(P.shaft, 0.02));
      g.addColorStop(0.55, rgba(P.shaft, 0.09 * (o.k ?? 1)));
      g.addColorStop(0.8, rgba(P.shaft, 0.13 * (o.k ?? 1)));
      g.addColorStop(0.9, rgba(P.shaft, 0.05 * (o.k ?? 1)));
      g.addColorStop(1, rgba(P.shaft, 0));
      y.fillStyle = g;
      trace(y, poly, true);
      y.fill();
    },
    { blur: 9, op: o.op ?? 1 },
  );
};
/** four-pane window with the moon (moon = [u, v] inside the glass, 0..1) */
export const moonWindow = (x, win, o = {}) => {
  const { x: wx, y: wy, w, h } = win;
  const box = rr(wx, wy, w, h, 26);
  shape(x, box, { fill: P.glass, amp: 0.9, seed: 11 });
  x.save();
  trace(x, box, true);
  x.clip();
  const [u, v] = o.moon ?? [0.68, 0.28];
  const mx = wx + u * w;
  const my = wy + v * h;
  const sky = x.createRadialGradient(mx, my, 0, mx, my, w * 0.9);
  sky.addColorStop(0, rgba("#3a4256", 0.55));
  sky.addColorStop(1, rgba("#3a4256", 0));
  x.fillStyle = sky;
  x.fillRect(wx, wy, w, h);
  radial(x, mx, my, 70, "#c8ccd8", 0.18);
  shape(x, ell(mx, my, 31, 30, 28), { fill: P.moon, amp: 0.8, seed: 5 });
  x.restore();
  lineH(x, wx + w / 2, wy + 2, wx + w / 2, wy + h - 2, P.line, 4, 12);
  lineH(x, wx + 2, wy + h / 2, wx + w - 2, wy + h / 2, P.line, 4, 13);
  shape(x, box, { stroke: P.line, width: 4.5, amp: 0.9, seed: 11 });
};
/** analog wall clock; minutes since midnight */
export const wallClock = (x, cx, cy, r, minutes) => {
  shape(x, ell(cx, cy, r, r, 44), { fill: P.clockFace, stroke: P.clockRim, width: 5, amp: 0.8, seed: 21 });
  const hA = ((minutes / 60) % 12) * 30 * RAD;
  const mA = (minutes % 60) * 6 * RAD;
  x.strokeStyle = P.hands;
  x.lineCap = "round";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx + Math.sin(hA) * r * 0.48, cy - Math.cos(hA) * r * 0.48);
  x.stroke();
  x.lineWidth = 3.6;
  x.beginPath();
  x.moveTo(cx, cy);
  x.lineTo(cx + Math.sin(mA) * r * 0.76, cy - Math.cos(mA) * r * 0.76);
  x.stroke();
  x.fillStyle = P.hands;
  x.beginPath();
  x.arc(cx, cy, 4, 0, Math.PI * 2);
  x.fill();
};
/** red seven-segment digits ("5:00") with a glow, top-left at X, Y; digit height h */
const SEG = { 0: "abcfed", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg" };
export const digits = (x, str, X, Y, h, o = {}) => {
  const w = h * 0.52;
  const t = h * 0.13;
  x.save();
  x.strokeStyle = o.color ?? P.red;
  x.lineWidth = t;
  x.lineCap = "round";
  x.shadowColor = rgba(P.redHot, 0.8);
  x.shadowBlur = h * 0.35;
  let cx = X;
  for (const ch of str) {
    if (ch === ":") {
      x.fillStyle = o.color ?? P.red;
      for (const yy of [0.32, 0.7]) {
        x.beginPath();
        x.arc(cx + t * 0.6, Y + h * yy, t * 0.55, 0, Math.PI * 2);
        x.fill();
      }
      cx += t * 2.4;
      continue;
    }
    const segs = SEG[ch] ?? "";
    const pts = { a: [[0, 0], [w, 0]], b: [[w, 0], [w, h / 2]], c: [[w, h / 2], [w, h]], d: [[0, h], [w, h]], e: [[0, h / 2], [0, h]], f: [[0, 0], [0, h / 2]], g: [[0, h / 2], [w, h / 2]] };
    x.beginPath();
    for (const s of segs) {
      const [a, b] = pts[s];
      x.moveTo(cx + a[0], Y + a[1]);
      x.lineTo(cx + b[0], Y + b[1]);
    }
    x.stroke();
    cx += w + h * 0.22;
  }
  x.restore();
};
/** bedside alarm clock on a nightstand (left edge X) — digits e.g. "5:00", ring = 0..1 shake marks */
export const nightstand = (x, X, o = {}) => {
  shape(x, rr(X, FLOOR - 150, 172, 150, 20), { fill: P.wood, stroke: P.lineDim, width: 3.2, seed: 31 });
  lineH(x, X + 16, FLOOR - 82, X + 156, FLOOR - 82, P.lineDim, 2.6, 32);
  x.fillStyle = P.lineDim;
  x.beginPath();
  x.arc(X + 86, FLOOR - 112, 5, 0, Math.PI * 2);
  x.fill();
  const cy = FLOOR - 212;
  shape(x, rr(X + 22, cy, 128, 58, 24), { fill: "#1b1a1c", stroke: P.line, width: 3.4, seed: 33 });
  digits(x, o.time ?? "5:00", X + 36, cy + 12, 34);
  if (o.ring) alarmMarks(x, X + 86, cy + 26, 92, P.red, o.ring);
};
/** the "\\ //" shake marks either side of something ringing or startled */
export const alarmMarks = (x, cx, cy, spread, color = P.red, op = 1, n = 2) =>
  alpha(x, op, () => {
    x.strokeStyle = color;
    x.lineWidth = 4;
    x.lineCap = "round";
    x.beginPath();
    for (let i = 0; i < n; i++) {
      const dx = spread + i * 13;
      x.moveTo(cx - dx, cy - 18);
      x.lineTo(cx - dx + 9, cy - 4);
      x.moveTo(cx + dx, cy - 18);
      x.lineTo(cx + dx - 9, cy - 4);
    }
    x.stroke();
  });
/** bed (headboard at X, long to the right), blanket over a sleeper whose head sits at the pillow */
export const bed = (x, X, o = {}) => {
  const len = o.len ?? 850;
  shape(x, rr(X, FLOOR - 245, 40, 245, 20), { fill: "#262629", stroke: P.line, width: 3.4, seed: 41 });
  shape(x, rr(X + 10, FLOOR - 58, len, 26, 13), { fill: "#1f1c20", stroke: P.line, width: 3.2, seed: 42 });
  lineH(x, X + 36, FLOOR - 32, X + 36, FLOOR, P.line, 3.2, 43);
  lineH(x, X + len - 16, FLOOR - 32, X + len - 16, FLOOR, P.line, 3.2, 44);
  shape(x, rr(X + 22, FLOOR - 104, len - 30, 48, 22), { fill: "#2a2a2e", stroke: P.lineDim, width: 3, seed: 45 });
  shape(x, ell(X + 110, FLOOR - 118, 72, 18), { fill: "#46474f", seed: 46 });
};
export const blanket = (x, X, o = {}) => {
  const len = o.len ?? 850;
  const pts = [[X + 180, FLOOR - 100], [X + 230, FLOOR - 150], [X + 420, FLOOR - 160], [X + 600, FLOOR - 140], [X + len - 90, FLOOR - 136], [X + len - 30, FLOOR - 100], [X + len - 40, FLOOR - 62], [X + 175, FLOOR - 62]];
  shape(x, pts, { fill: P.blanket, stroke: P.blanketLine, width: 3.4, seed: 47, amp: 1.6 });
  shape(x, [[X + 370, FLOOR - 138], [X + 450, FLOOR - 104], [X + 530, FLOOR - 112]], { closed: false, stroke: P.blanketLine, width: 2.6, seed: 48 });
};
/** front-view armchair centred on cx */
export const armchair = (x, cx) => {
  const f = FLOOR;
  shape(x, rr(cx - 150, f - 275, 300, 205, 34), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 51 });
  shape(x, rr(cx - 150, f - 112, 300, 56, 20), { fill: "#2c2833", stroke: P.couchLine, width: 3.2, seed: 52 });
  shape(x, rr(cx - 184, f - 172, 64, 140, 28), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 53 });
  shape(x, rr(cx + 120, f - 172, 64, 140, 28), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 54 });
  shape(x, rr(cx - 188, f - 64, 376, 38, 18), { fill: "#26222b", stroke: P.couchLine, width: 3.2, seed: 55 });
  lineH(x, cx - 166, f - 28, cx - 166, f, P.couchLine, 3.2, 56);
  lineH(x, cx + 166, f - 28, cx + 166, f, P.couchLine, 3.2, 57);
};
/** front-view couch centred on cx */
export const couch = (x, cx, w = 720) => {
  const f = FLOOR;
  shape(x, rr(cx - w / 2 + 64, f - 252, w - 128, 160, 30), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 61 });
  shape(x, rr(cx - w / 2 + 64, f - 112, w - 128, 56, 18), { fill: "#2c2833", stroke: P.couchLine, width: 3.2, seed: 62 });
  shape(x, rr(cx - w / 2, f - 190, 76, 160, 30), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 63 });
  shape(x, rr(cx + w / 2 - 76, f - 190, 76, 160, 30), { fill: P.couch, stroke: P.couchLine, width: 3.4, seed: 64 });
  shape(x, rr(cx - w / 2, f - 62, w, 36, 16), { fill: "#26222b", stroke: P.couchLine, width: 3.2, seed: 65 });
  lineH(x, cx - w / 2 + 22, f - 28, cx - w / 2 + 22, f, P.couchLine, 3.2, 66);
  lineH(x, cx + w / 2 - 22, f - 28, cx + w / 2 - 22, f, P.couchLine, 3.2, 67);
};
/** a desk with a lamp (warm cone when on = 0..1) */
export const desk = (x, X, w = 640, on = 1) => {
  const top = FLOOR - 140;
  if (on > 0) softLight(x, (y) => radial(y, X + w - 150, top - 10, 360, P.lamp, 0.22 * on), { blur: 8 });
  shape(x, rr(X, top, w, 18, 9), { fill: "#2a2520", stroke: P.line, width: 3.2, seed: 71 });
  lineH(x, X + 22, top + 18, X + 22, FLOOR, P.line, 3.2, 72);
  lineH(x, X + w - 22, top + 18, X + w - 22, FLOOR, P.line, 3.2, 73);
  const lx = X + w - 110;
  lineH(x, lx, top, lx, top - 90, P.line, 3.4, 74);
  lineH(x, lx, top - 90, lx - 60, top - 140, P.line, 3.4, 75);
  at(x, lx - 72, top - 150, -28, 1, 1, () => shape(x, rr(-34, -20, 68, 40, 16), { fill: "#5a5652", stroke: P.line, width: 3, seed: 76 }));
};

// ── props ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** acoustic guitar. Local origin = lower-bout centre, neck up (−y). vibrate 0..1 blurs the strings */
export const guitar = (x, gx, gy, rot, s = 1, o = {}) =>
  at(x, gx, gy, rot, s, s, () => {
    // body outline: a smooth max of the two bouts (soft waist)
    const bout = (y, c, r) => (Math.abs(y - c) < r ? Math.sqrt(r * r - (y - c) * (y - c)) : 0);
    const k = 0.09;
    const half = (y) => Math.log(Math.exp(k * bout(y, 0, 72)) + Math.exp(k * bout(y, -96, 56))) / k - Math.log(2) / k * 0.35;
    const right = [];
    for (let y = -152; y <= 72; y += 6) right.push([Math.max(0, half(y)), y]);
    const body = [...right, ...right.slice().reverse().map(([a, b]) => [-a, b])];
    shape(x, body, { fill: P.guitar, stroke: P.guitarLine, width: 3.4 / s, seed: 81 });
    shape(x, body.map(([a, b]) => [a * 0.9, b * 0.95 - 3]), { fill: P.guitarTop, seed: 82, amp: 0.6 });
    // neck, frets, headstock, pegs
    shape(x, rr(-12, -372, 24, 236, 4), { fill: P.neck, stroke: P.neckLine, width: 2.6 / s, seed: 83, amp: 0.5 });
    x.strokeStyle = rgba("#9c8a72", 0.7);
    x.lineWidth = 1.6 / s;
    x.beginPath();
    for (let i = 0; i < 9; i++) {
      const fy = -362 + i * 22 + i * i * 0.6;
      x.moveTo(-11, fy);
      x.lineTo(11, fy);
    }
    x.stroke();
    shape(x, [[-15, -372], [15, -372], [19, -428], [-19, -428]], { fill: P.neck, stroke: P.neckLine, width: 2.6 / s, seed: 84, amp: 0.5 });
    x.fillStyle = "#b9ae9c";
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        x.beginPath();
        x.arc(side * 25, -384 - i * 16, 4.5, 0, Math.PI * 2);
        x.fill();
      }
    }
    // sound hole, bridge
    shape(x, ell(0, -66, 25, 25, 30), { fill: "#17120e", stroke: P.guitarLine, width: 3 / s, seed: 85, amp: 0.5 });
    shape(x, rr(-26, 22, 52, 12, 5), { fill: "#2b2018", seed: 86, amp: 0.4 });
    // strings (bridge → nut), blurred while they ring
    const v = o.vibrate ?? 0;
    const ph = o.phase ?? 0;
    for (let i = 0; i < 4; i++) {
      const sx = -7.5 + i * 5;
      const copies = v > 0.01 ? [-1, 1] : [0];
      for (const c of copies) {
        x.strokeStyle = rgba(P.string, v > 0.01 ? 0.32 : 0.55);
        x.lineWidth = 1.5 / s;
        x.beginPath();
        x.moveTo(sx, 28);
        x.quadraticCurveTo(sx + c * v * 5 * Math.sin(ph + i), -170, sx * 0.8, -372);
        x.stroke();
      }
    }
  });
/** A-frame guitar stand; the guitar rests on it with its lower bout on the cradle */
export const guitarStand = (x, cx) => {
  const c = FLOOR - 92;
  lineH(x, cx - 48, FLOOR, cx, c + 14, P.lineDim, 3.4, 91);
  lineH(x, cx + 48, FLOOR, cx, c + 14, P.lineDim, 3.4, 92);
  shape(x, [[cx - 56, c - 12], [cx - 50, c + 4], [cx + 50, c + 4], [cx + 56, c - 12]], { closed: false, stroke: P.lineDim, width: 3.4, seed: 93 });
  lineH(x, cx, c + 14, cx + 6, c - 268, P.lineDim, 3.2, 94);
  shape(x, [[cx - 6, c - 280], [cx + 6, c - 268], [cx + 20, c - 282]], { closed: false, stroke: P.lineDim, width: 3.2, seed: 95 });
};
/** phone in a hand: a small blue screen with a dark edge */
export const phone = (x, px, py, rot = -18, s = 1, lit = 1) =>
  at(x, px, py, rot, s, s, () => {
    shape(x, rr(-13, -23, 26, 46, 6), { fill: "#101010", amp: 0.3, seed: 101 });
    shape(x, rr(-10, -20, 20, 40, 4), { fill: rgba(P.phone, 0.55 + 0.45 * lit), amp: 0.3, seed: 102 });
  });
/** floating "z z" of sleep */
export const zzz = (x, cx, cy, t, op = 1) =>
  alpha(x, op, () => {
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.5 + i * 0.5) % 1;
      caption(x, "z", cx + i * 26 + p * 14, cy - p * 60 - i * 34, { size: 34 - i * 4, color: P.grey, op: Math.sin(p * Math.PI) });
    }
  });
/** a sweat drop beside the head */
export const sweat = (x, cx, cy, s = 1, op = 1) =>
  alpha(x, op, () =>
    at(x, cx, cy, 0, s, s, () => {
      x.fillStyle = P.sweat;
      x.beginPath();
      x.moveTo(0, -11);
      x.quadraticCurveTo(7, 0, 0, 7);
      x.quadraticCurveTo(-7, 0, 0, -11);
      x.fill();
    }),
  );

// ── the character ──────────────────────────────────────────────────────────────────────────────────────────────
// One cream capsule ("bean") is head and body together; noodle limbs with round ends. Origin = the bottom of the
// capsule (the hip point). Back limbs are a shade darker with no edge; front limbs get a dark edge where they cross
// the body. Limb targets are in hip-local coordinates (+x right, +y down), elbows/knees by two-bone IK.
export const BODY = { w: 116, h: 262, thigh: 90, shin: 90, upper: 72, fore: 72, leg: 38, arm: 32, hand: 17 };
const ik = (a, b, l1, l2, bend) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1e-3;
  const dd = Math.min(d, l1 + l2 - 0.5);
  const base = Math.atan2(dy, dx);
  const t = Math.acos(clamp((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1));
  const a1 = base - bend * t;
  const mid = [a[0] + Math.cos(a1) * l1, a[1] + Math.sin(a1) * l1];
  const end = d > l1 + l2 - 0.5 ? [a[0] + (dx / d) * dd, a[1] + (dy / d) * dd] : b;
  return [mid, end];
};
const limb = (x, pts, width, color, edge) => {
  x.lineCap = "round";
  x.lineJoin = "round";
  if (edge) {
    x.strokeStyle = P.skinEdge;
    x.lineWidth = width + 8;
    trace(x, pts, false);
    x.stroke();
  }
  x.strokeStyle = color;
  x.lineWidth = width;
  trace(x, pts, false);
  x.stroke();
};
const foot = (x, p, dir, color, edge) => {
  x.save();
  x.translate(p[0] + dir * 8, p[1] - 3);
  if (edge) {
    x.fillStyle = P.skinEdge;
    x.beginPath();
    x.ellipse(0, 0, 30, 21, 0, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = color;
  x.beginPath();
  x.ellipse(0, 0, 26, 17, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
};
const handBall = (x, p, color, edge) => {
  if (edge) {
    x.fillStyle = P.skinEdge;
    x.beginPath();
    x.arc(p[0], p[1], BODY.hand + 4, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = color;
  x.beginPath();
  x.arc(p[0], p[1], BODY.hand, 0, Math.PI * 2);
  x.fill();
};

/** the face, drawn in body space; f = { eyes, brows, mouth, look:[dx,dy], turn, lid, bags, sweat, blink } */
export const face = (x, cx, cy, f = {}) => {
  const ink = P.ink;
  const [lx, ly] = f.look ?? [0, 0];
  const turn = f.turn ?? 0;
  const ex = 19;
  const eyes = [cx - ex + turn * 4, cx + ex + turn * 8];
  x.lineCap = "round";
  x.lineJoin = "round";
  x.strokeStyle = ink;
  x.fillStyle = ink;
  const blink = f.blink ?? 0;
  const kind = blink > 0.5 ? "sleep" : f.eyes ?? "dot";
  eyes.forEach((e, i) => {
    const side = i ? 1 : -1;
    if (kind === "dot" || kind === "wide") {
      const r = kind === "wide" ? 8.5 : 7;
      x.beginPath();
      x.arc(e + lx, cy + ly, r, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#f4f4ee";
      x.beginPath();
      x.arc(e + lx - 2.4, cy + ly - 2.6, 2.1, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = ink;
    } else if (kind === "half") {
      const lid = f.lid ?? 0.55;
      const top = cy - 7 + 12 * lid;
      x.save();
      x.beginPath();
      x.rect(e - 16, top, 32, 30);
      x.clip();
      x.beginPath();
      x.arc(e + lx, cy + ly * 0.4 + 1, 7.2, 0, Math.PI * 2);
      x.fill();
      x.restore();
      x.lineWidth = 4.2;
      x.beginPath();
      x.moveTo(e - 13, top);
      x.lineTo(e + 13, top);
      x.stroke();
    } else if (kind === "sleep") {
      x.lineWidth = 3.8;
      x.beginPath();
      x.moveTo(e - 12, cy + 1);
      x.quadraticCurveTo(e, cy + 7, e + 12, cy + 1);
      x.stroke();
    } else if (kind === "squeeze") {
      x.lineWidth = 4.2;
      x.beginPath();
      x.moveTo(e - side * 9, cy - 9);
      x.lineTo(e + side * 7, cy);
      x.lineTo(e - side * 9, cy + 9);
      x.stroke();
    }
    if ((f.bags ?? 0) > 0.01) {
      x.save();
      x.strokeStyle = rgba(P.bag, f.bags);
      x.lineWidth = 2.6;
      x.beginPath();
      x.moveTo(e - 10, cy + 13);
      x.quadraticCurveTo(e, cy + 18, e + 10, cy + 13);
      x.stroke();
      x.restore();
    }
    // brows
    const b = f.brows ?? "none";
    if (b !== "none") {
      x.lineWidth = 5;
      const by = cy - 19 - (f.browUp ?? 0);
      // the inner end (toward the nose) carries the expression: up = worried, down = angry
      const lift = { flat: 0, worried: -7, angry: 7, sad: -4 }[b] ?? 0;
      x.beginPath();
      x.moveTo(e + side * 14, by);
      x.lineTo(e - side * 14, by + lift);
      x.stroke();
    }
  });
  // mouth
  const mx = cx + turn * 10 + 4;
  const my = cy + 36;
  x.lineWidth = 3.6;
  const m = f.mouth ?? "line";
  x.beginPath();
  if (m === "line") {
    x.moveTo(mx - 8, my);
    x.lineTo(mx + 8, my);
    x.stroke();
  } else if (m === "smile") {
    x.moveTo(mx - 11, my - 3);
    x.quadraticCurveTo(mx, my + 7, mx + 11, my - 3);
    x.stroke();
  } else if (m === "frown") {
    x.moveTo(mx - 10, my + 4);
    x.quadraticCurveTo(mx, my - 5, mx + 10, my + 4);
    x.stroke();
  } else if (m === "o") {
    x.ellipse(mx, my, 6, 7.5, 0, 0, Math.PI * 2);
    x.fill();
  } else if (m === "wavy") {
    x.moveTo(mx - 12, my);
    x.quadraticCurveTo(mx - 6, my - 5, mx, my);
    x.quadraticCurveTo(mx + 6, my + 5, mx + 12, my);
    x.stroke();
  } else if (m === "grit") {
    x.fillStyle = ink;
    x.roundRect(mx - 15, my - 8, 30, 16, 6);
    x.fill();
    x.strokeStyle = "#e8e6dc";
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(mx - 11, my);
    x.lineTo(mx + 11, my);
    for (const k of [-5, 0, 5]) {
      x.moveTo(mx + k, my - 6);
      x.lineTo(mx + k, my + 6);
    }
    x.stroke();
  }
  if ((f.sweat ?? 0) > 0.01) sweat(x, cx + 50 + turn * 6, cy - 22, 1, f.sweat);
};

/**
 * hero(x, o) — the cream capsule character.
 *  o.x, o.y   world position of the hip point (capsule bottom)
 *  o.s        scale · o.lean degrees (+ = top leans right) · o.breathe 0..1 (tiny squash, pass t)
 *  o.legs     [{ knee:[x,y], foot:[x,y], toe:±1 }, …] back first, then front (hip-local)
 *  o.arms     [{ hand:[x,y], bend:±1, front:bool }, …]
 *  o.face     see face()
 *  o.behind(x) / o.prop(x) draw callbacks in hip-local space: behind the body / between body and front arms
 */
export const hero = (x, o) =>
  at(x, o.x, o.y, 0, o.s ?? 1, o.s ?? 1, () => {
    const B = BODY;
    const lean = (o.lean ?? 0) * RAD;
    const rot = (p) => [p[0] * Math.cos(lean) - p[1] * Math.sin(lean), p[0] * Math.sin(lean) + p[1] * Math.cos(lean)];
    const sq = 1 + 0.012 * Math.sin((o.breathe ?? 0) * 2.2);
    const legs = o.legs ?? [{ knee: [-16, 90], foot: [-18, 178], toe: -1 }, { knee: [16, 90], foot: [20, 178], toe: 1 }];
    const arms = o.arms ?? [{ hand: [-60, -40], bend: -1 }, { hand: [60, -40], bend: 1, front: true }];
    const hipRoots = [rot([-22, -24]), rot([22, -24])];
    const shoulder = (i) => rot([i ? 34 : -34, -148 * sq]);
    // back leg, back arm (shade, no edge)
    const legPts = legs.map((l, i) => {
      const [knee, ft] = l.knee ? [l.knee, l.foot] : ik(hipRoots[i], l.foot, B.thigh, B.shin, l.bend ?? 1);
      return [hipRoots[i], knee, ft];
    });
    const armPts = arms.map((a, i) => {
      const sh = shoulder(i);
      const [el, hd] = ik(sh, a.hand, B.upper, B.fore, a.bend ?? 1);
      return [sh, el, hd];
    });
    if (o.behind) o.behind(x);
    limb(x, legPts[0], B.leg, P.skinShade, false);
    foot(x, legPts[0][2], legs[0].toe ?? -1, P.skinShade, false);
    arms.forEach((a, i) => {
      if (!a.front) {
        limb(x, armPts[i], B.arm, P.skinShade, false);
        handBall(x, armPts[i][2], P.skinShade, false);
      }
    });
    // body + face
    x.save();
    x.rotate(lean);
    x.scale(1 / Math.sqrt(sq), sq);
    x.fillStyle = P.skin;
    x.beginPath();
    x.roundRect(-B.w / 2, -B.h, B.w, B.h, [B.w / 2, B.w / 2, 50, 50]);
    x.fill();
    if (o.glow) {
      // screen light falling on the face (phone, lamp)
      const [gx, gy, gr, gc, gop] = o.glow;
      const g = x.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, rgba(gc, gop));
      g.addColorStop(1, rgba(gc, 0));
      x.save();
      x.clip();
      x.fillStyle = g;
      x.fillRect(-B.w, -B.h - 20, B.w * 2, B.h + 40);
      x.restore();
    }
    face(x, (o.face?.turn ?? 0) * 22, -B.h + 64, o.face ?? {});
    x.restore();
    // front leg
    limb(x, legPts[1], B.leg, P.skin, true);
    foot(x, legPts[1][2], legs[1].toe ?? 1, P.skin, true);
    if (o.prop) o.prop(x, armPts.map((a) => a[2]));
    arms.forEach((a, i) => {
      if (a.front) {
        limb(x, armPts[i], B.arm, P.skin, true);
        handBall(x, armPts[i][2], P.skin, true);
      }
    });
    if (o.front) o.front(x, armPts.map((a) => a[2]));
  });

// ── the shadow figure ──────────────────────────────────────────────────────────────────────────────────────────
// A black silhouette (round head, slab body, thick limbs) with a red glow hugging its edge. The silhouette is drawn
// once into its own buffer so the glow wraps the whole figure (no halo between the arm and the body).
let sbuf = null;
export const shadowFigure = (x, o) => {
  const op = o.op ?? 1;
  if (op <= 0.001) return;
  const s = o.s ?? 1;
  const BW = 900;
  const BH = 1100;
  if (!sbuf) {
    sbuf = document.createElement("canvas");
    sbuf.width = BW;
    sbuf.height = BH;
  }
  const y = sbuf.getContext("2d");
  y.setTransform(1, 0, 0, 1, 0, 0);
  y.clearRect(0, 0, BW, BH);
  y.setTransform(s, 0, 0, s, BW / 2, BH - 40);
  const lean = (o.lean ?? 0) * RAD;
  const rot = (p) => [p[0] * Math.cos(lean) - p[1] * Math.sin(lean), p[0] * Math.sin(lean) + p[1] * Math.cos(lean) - 0];
  const hipY = -196;
  const torso = (p) => {
    const r = rot([p[0], p[1] - hipY]);
    return [r[0], r[1] + hipY];
  };
  const ink = "#030202";
  y.fillStyle = ink;
  y.strokeStyle = ink;
  y.lineCap = "round";
  y.lineJoin = "round";
  // legs
  const feet = o.feet ?? [[-34, 0], [30, 0]];
  [[-26, hipY], [26, hipY]].forEach((h, i) => {
    const [k, f] = ik(h, [feet[i][0], feet[i][1] - 10], 100, 100, i ? 1 : -1);
    y.lineWidth = 44;
    trace(y, [h, k, f], false);
    y.stroke();
    y.beginPath();
    y.ellipse(f[0] + (i ? 10 : -10), f[1] + 4, 30, 18, 0, 0, Math.PI * 2);
    y.fill();
  });
  // torso (rotates about the hip)
  y.save();
  y.translate(0, hipY);
  y.rotate(lean);
  y.beginPath();
  y.roundRect(-64, -232, 128, 250, [56, 56, 44, 44]);
  y.fill();
  y.restore();
  // head
  const head = torso([o.headX ?? 0, -478]);
  y.beginPath();
  y.arc(head[0], head[1], 70, 0, Math.PI * 2);
  y.fill();
  // arms
  const arms = o.arms ?? [{ hand: [-70, -200], bend: -1 }, { hand: [70, -200], bend: 1 }];
  arms.forEach((a, i) => {
    const sh = torso([i ? 52 : -52, -386]);
    const [el, hd] = ik(sh, a.hand, 92, 92, a.bend ?? 1);
    y.lineWidth = 40;
    trace(y, [sh, el, hd], false);
    y.stroke();
    y.beginPath();
    y.arc(hd[0], hd[1], 24, 0, Math.PI * 2);
    y.fill();
  });
  // composite: wide glow, tight glow, the crisp silhouette
  const k = (o.glow ?? 1) * (0.88 + 0.12 * Math.sin((o.t ?? 0) * 3.1));
  x.save();
  x.globalAlpha = op;
  const dx = o.x - BW / 2;
  const dy = o.y - (BH - 40);
  x.shadowColor = rgba(P.redGlow, 0.85 * k);
  x.shadowBlur = 54;
  x.drawImage(sbuf, dx, dy);
  x.shadowColor = rgba(P.redHot, 0.9 * k);
  x.shadowBlur = 16;
  x.drawImage(sbuf, dx, dy);
  x.shadowColor = "transparent";
  x.shadowBlur = 0;
  x.drawImage(sbuf, dx, dy);
  // eyes: two glowing slits, a thin smile
  const eo = o.eyes ?? 1;
  if (eo > 0.01) {
    const hx = o.x + head[0] * s + (o.look ?? 0) * 14 * s;
    const hy = o.y + head[1] * s;
    x.globalAlpha = op * eo;
    x.strokeStyle = P.redEye;
    x.lineWidth = 5.5 * s;
    x.lineCap = "round";
    x.shadowColor = rgba(P.redHot, 0.95);
    x.shadowBlur = 14;
    x.beginPath();
    for (const side of [-1, 1]) {
      const ex = hx + side * 24 * s;
      // smug = 1: arcs bowed up (a sly squint); slant tips the inner ends down (menace)
      const sl = (o.slant ?? 0) * 6 * s;
      x.moveTo(ex - 15 * s, hy - 4 * s + (side === 1 ? sl : 0));
      x.quadraticCurveTo(ex, hy - 4 * s - 7 * s * (o.smug ?? 1), ex + 15 * s, hy - 4 * s + (side === -1 ? sl : 0));
    }
    x.stroke();
    if ((o.smile ?? 0) > 0.01) {
      x.globalAlpha = op * eo * o.smile;
      x.lineWidth = 3.4 * s;
      x.strokeStyle = "#d4503c";
      x.beginPath();
      x.moveTo(hx - 22 * s, hy + 26 * s);
      x.quadraticCurveTo(hx, hy + 40 * s, hx + 22 * s, hy + 26 * s);
      x.stroke();
    }
  }
  x.restore();
};

// ── words ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * caption(x, str, X, Y, o) — Comic Sans line. White = the narrator (fades in whole), red = the inner voice (types
 * on: reveal 0..1). Alignment uses the FULL line's width, so typed text never slides.
 */
export const caption = (x, str, X, Y, o = {}) => {
  const op = o.op ?? 1;
  if (op <= 0.001) return;
  const size = o.size ?? 56;
  x.save();
  x.globalAlpha *= op;
  x.font = `${o.weight ?? 400} ${size}px ${HAND}`;
  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  const full = x.measureText(str).width;
  const left = (o.align ?? "center") === "center" ? X - full / 2 : o.align === "right" ? X - full : X;
  const n = Math.round(str.length * clamp(o.reveal ?? 1));
  const shown = str.slice(0, n);
  if (o.glow) {
    x.shadowColor = rgba(o.glowColor ?? P.redHot, o.glow);
    x.shadowBlur = size * 0.35;
  }
  x.fillStyle = o.color ?? P.white;
  x.fillText(shown, left, Y);
  x.restore();
};
/** typed-on reveal for a line that starts at t0 at cps characters per second */
export const typed = (t, t0, str, cps = 20) => clamp((t - t0) / (str.length / cps));
/** fade in over fin seconds from t0, hold, fade out over fout ending at t1 */
export const life = (t, t0, t1, fin = 0.5, fout = 0.4) => Math.min(ramp(t, t0, t0 + fin, E.sine), 1 - ramp(t, t1 - fout, t1, E.sine));
/** the "DAY N" counter, top-left */
export const dayLabel = (x, label, op = 1) => caption(x, label, 152, 166, { size: 42, weight: 700, color: P.day, align: "left", op });

// ── finish ─────────────────────────────────────────────────────────────────────────────────────────────────────
let grains = null;
const makeGrains = () => {
  grains = [...Array(4)].map((_, k) => {
    const cv = document.createElement("canvas");
    cv.width = W / 2;
    cv.height = H / 2;
    const y = cv.getContext("2d");
    const im = y.createImageData(cv.width, cv.height);
    let sd = 777 + k * 4111;
    for (let i = 0; i < im.data.length; i += 4) {
      sd = (sd * 1103515245 + 12345) & 0x7fffffff;
      const v = (sd >> 8) & 255;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    y.putImageData(im, 0, 0);
    return cv;
  });
};
/** vignette, a whisper of grain (keeps the dark gradients from banding), the fade to black, the letterbox */
export const finish = (x, frame, o = {}) => {
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  const g = x.createRadialGradient(960, 540, 0, 960, 540, 1120);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${o.vignette ?? 0.6})`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  if (!grains) makeGrains();
  x.globalAlpha = o.grain ?? 0.018;
  x.drawImage(grains[frame % grains.length], 0, 0, W, H);
  x.globalAlpha = 1;
  if ((o.black ?? 0) > 0.001) {
    x.fillStyle = `rgba(0,0,0,${clamp(o.black)})`;
    x.fillRect(0, 0, W, H);
  }
  x.fillStyle = P.bar;
  x.fillRect(0, 0, W, BAR);
  x.fillRect(0, H - BAR, W, BAR);
  x.restore();
};
