// Small helpers the intake motions share (Moworks, written for the library intake, 17/10/2026). Each one is plain ES5-style JavaScript,
// copied into an item's snippet only when the item names it in `uses`, so a snippet pasted into a film stays self-contained. Everything is
// deterministic: no Math.random, no clock, no requestAnimationFrame; the film's paused GSAP timeline is the only clock.
//   MW.el(x)            an element or the first match of a selector
//   MW.rand(seed)       a seeded generator (mulberry32) returning [0, 1); seed a number or a string
//   MW.hash(s)          FNV-1a 32-bit hash of a string
//   MW.split(el, mode)  the element's text as spans: "chars" (grapheme clusters, NFC first, so Vietnamese letters with their marks stay one
//                       glyph even when the text was typed in NFD), "words", or "lines"; chars stay grouped by word so lines never break
//                       inside a word. Returns { chars, words, lines }. Idempotent.
//   MW.mask(nodes, pad) wraps each node in an overflow-hidden box with room above and below for Vietnamese marks (pad in em, default 0.2)
//   MW.noise(seed)      smooth 1-D value noise n(t) in [-1, 1]
//   MW.bezier(x1,y1,x2,y2)  a CSS cubic-bezier as an ease function (GSAP takes functions as eases); MW.CSS_EASE has CSS's named ones
//   MW.spring(k, c, m)  a spring released from rest (stiffness, damping, mass, as motion/react writes them): { duration (settled to
//                       0.1 %), ease } so a tween of that duration with that ease follows the spring exactly; MW.springDB(duration, bounce)
//                       for motion's duration-based springs (damping ratio 1 - bounce, settled at `duration`)
//   MW.lerp, MW.clamp, MW.ease(name)  maths; ease returns GSAP's parsed ease function for use inside onUpdate drawing
export const HELPERS = {
  el: `MW.el = MW.el || function (x) { return typeof x === "string" ? document.querySelector(x) : x; };`,
  rand: `MW.rand = MW.rand || function (seed) {
    var a = typeof seed === "string" ? MW.hash(seed) : (seed >>> 0) || 1;
    return function () { a = (a + 0x6d2b79f5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };`,
  hash: `MW.hash = MW.hash || function (s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };`,
  split: `MW.split = MW.split || function (el, mode) {
    el = MW.el(el);
    if (el.__mwSplit) return el.__mwSplit;
    var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
    var graphemes = function (s) { if (seg) { var out = []; var it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; } return Array.from(s); };
    var res = { chars: [], words: [], lines: [] };
    var walk = function (node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var k = 0; k < kids.length; k++) {
        var n = kids[k];
        if (n.nodeType === 1) { if (n.tagName === "BR") continue; walk(n); continue; }
        if (n.nodeType !== 3) continue;
        var text = n.nodeValue.normalize("NFC"), frag = document.createDocumentFragment();
        var parts = text.split(/(\\s+)/);
        for (var p = 0; p < parts.length; p++) {
          var part = parts[p];
          if (!part) continue;
          if (/^\\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          var w = document.createElement("span");
          w.className = "mw-w"; w.style.display = "inline-block"; w.style.whiteSpace = "nowrap";
          if (mode === "words") w.textContent = part;
          else { var gs = graphemes(part); for (var g = 0; g < gs.length; g++) { var c = document.createElement("span"); c.className = "mw-ch"; c.style.display = "inline-block"; c.textContent = gs[g]; w.appendChild(c); res.chars.push(c); } }
          res.words.push(w); frag.appendChild(w);
        }
        node.replaceChild(frag, n);
      }
    };
    walk(el);
    var top = null, line = null;
    for (var i = 0; i < res.words.length; i++) { var y = res.words[i].offsetTop; if (top === null || Math.abs(y - top) > 2) { top = y; line = []; res.lines.push(line); } line.push(res.words[i]); }
    el.__mwSplit = res;
    return res;
  };`,
  mask: `MW.mask = MW.mask || function (nodes, pad) {
    pad = pad == null ? 0.2 : pad;
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], box = document.createElement("span");
      box.className = "mw-mask"; box.style.display = "inline-block"; box.style.overflow = "hidden"; box.style.verticalAlign = "top";
      box.style.padding = pad + "em 0.04em"; box.style.margin = (-pad) + "em -0.04em";
      n.parentNode.insertBefore(box, n); box.appendChild(n); out.push(box);
    }
    return out;
  };`,
  noise: `MW.noise = MW.noise || function (seed) {
    var r = MW.rand(seed), v = []; for (var i = 0; i < 512; i++) v.push(r() * 2 - 1);
    return function (t) { var i = Math.floor(t), f = t - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512], s = f * f * (3 - 2 * f); return a + (b - a) * s; };
  };`,
  bezier: `MW.bezier = MW.bezier || function (x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    var X = function (t) { return ((ax * t + bx) * t + cx) * t; }, Y = function (t) { return ((ay * t + by) * t + cy) * t; }, dX = function (t) { return (3 * ax * t + 2 * bx) * t + cx; };
    return function (p) {
      if (p <= 0) return 0; if (p >= 1) return 1;
      var t = p, i, d;
      for (i = 0; i < 8; i++) { d = X(t) - p; if (Math.abs(d) < 1e-6) return Y(t); var s = dX(t); if (Math.abs(s) < 1e-6) break; t -= d / s; }
      var lo = 0, hi = 1; t = p;
      for (i = 0; i < 40; i++) { d = X(t); if (Math.abs(d - p) < 1e-6) break; if (d < p) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  };
  MW.CSS_EASE = { ease: [0.25, 0.1, 0.25, 1], easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1] };`,
  spring: `MW.spring = MW.spring || function (stiffness, damping, mass, from, to) {
    var k = stiffness || 100, c = damping == null ? 10 : damping, m = mass || 1, w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
    var x = function (t) {
      if (z < 1) { var wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
      if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      var q = Math.sqrt(z * z - 1), r1 = -w0 * (z - q), r2 = -w0 * (z + q), A = r2 / (r2 - r1), B = -r1 / (r2 - r1);
      return 1 - (A * Math.exp(r1 * t) + B * Math.exp(r2 * t));
    };
    var T = 0, dt = 1 / 240; for (var t = 0; t < 30; t += dt) if (Math.abs(1 - x(t)) > 0.001) T = t;
    T = Math.max(dt, T + dt);
    return { duration: T, ease: function (p) { return p >= 1 ? 1 : x(p * T); }, at: x };
  };
  MW.springDB = MW.springDB || function (duration, bounce) {
    var z = 1 - (bounce == null ? 0.25 : bounce), w = Math.log(1000) / (Math.max(0.05, z) * (duration || 0.8));
    return MW.spring(w * w, 2 * z * w, 1);
  };`,
  math: `MW.lerp = MW.lerp || function (a, b, t) { return a + (b - a) * t; };
  MW.clamp = MW.clamp || function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  MW.ease = MW.ease || function (name) { return gsap.parseEase(name); };`,
  // step(t, fps): time held on a lower frame rate ("on twos", 12 fps); smooth(a, b, x): smoothstep; tri / sinp: 0 -> 1 -> 0 envelopes
  steps: `MW.step = MW.step || function (t, fps) { return Math.floor(t * fps + 1e-6) / fps; };
  MW.smooth = MW.smooth || function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  MW.sinp = MW.sinp || function (p) { return Math.sin(Math.PI * Math.min(1, Math.max(0, p))); };`,
  // named eases beyond GSAP's (Material 3, CSS, and a few motion-design names), as cubic béziers; MW.ez(name) returns an ease usable in a
  // tween or in drawing code (GSAP's own names pass through)
  eases: `MW.EASES = MW.EASES || { "css-ease": [0.25, 0.1, 0.25, 1], "css-in": [0.42, 0, 1, 1], "css-out": [0, 0, 0.58, 1], "css-in-out": [0.42, 0, 0.58, 1],
    md3: [0.2, 0, 0, 1], "md3-emph": [0.05, 0.7, 0.1, 1], "md3-acc": [0.3, 0, 1, 1], "md3-dec": [0, 0, 0, 1], whip: [0.9, 0, 0.1, 1], glide: [0.4, 0, 0.2, 1],
    house: [0.83, 0, 0.17, 1], "in-out": [0.65, 0, 0.35, 1] };
  MW.ez = MW.ez || function (name) {
    if (typeof name === "function") return name;
    var b = MW.EASES[name]; if (b) return MW.bezier(b[0], b[1], b[2], b[3]);
    var m = /^cubic-bezier\\(([^)]+)\\)$/.exec(name || ""); if (m) { var v = m[1].split(",").map(Number); return MW.bezier(v[0], v[1], v[2], v[3]); }
    return gsap.parseEase(name || "none");
  };`,
  // drive(tl, at, dur, fn): fn(t) with t the seconds since at (0 before, dur after), on every frame of that span, through a tween of a
  // plain object on the film's timeline (so seeking and rendering call it with the frame's time; nothing runs on its own)
  drive: `MW.drive = MW.drive || function (tl, at, dur, fn) {
    var s = { t: 0 }; fn(0);
    tl.fromTo(s, { t: 0 }, { t: dur, duration: dur, ease: "none", immediateRender: false, onUpdate: function () { fn(s.t); } }, at);
    return at + dur;
  };`,
  // keys(tl, target, at, { prop: [[t, v], ...] }, ease): keyframes in seconds from `at`, eased between keys (sine.inOut by default), set on
  // every frame through drive (numbers only; GSAP's transform names); returns the end time
  keys: `MW.keys = MW.keys || function (tl, target, at, track, ease) {
    var e = MW.ez(ease || "sine.inOut"), end = 0, p;
    for (p in track) end = Math.max(end, track[p][track[p].length - 1][0]);
    var val = function (k, t) { if (t <= k[0][0]) return k[0][1]; for (var i = 1; i < k.length; i++) if (t <= k[i][0]) { var a = k[i - 1], b = k[i], u = (t - a[0]) / ((b[0] - a[0]) || 1); return a[1] + (b[1] - a[1]) * e(u); } return k[k.length - 1][1]; };
    return MW.drive(tl, at, end, function (t) { var s = {}; for (var q in track) s[q] = val(track[q], t); gsap.set(target, s); });
  };`,
  // lines(el, mode): the text split ("chars" or "words") and its lines wrapped in block boxes .mw-line (in order); { lines, chars, words }
  lines: `MW.lines = MW.lines || function (el, mode) {
    el = MW.el(el);
    if (el.__mwLines) return el.__mwLines;
    var s = MW.split(el, mode || "words"), out = [];
    s.lines.forEach(function (ws) {
      var d = document.createElement("span"); d.className = "mw-line"; d.style.display = "block";
      ws[0].parentNode.insertBefore(d, ws[0]);
      ws.forEach(function (w, i) { d.appendChild(w); if (i < ws.length - 1) d.appendChild(document.createTextNode(" ")); });
      out.push(d);
    });
    Array.prototype.slice.call(el.childNodes).forEach(function (n) { if ((n.nodeType === 3 && !n.nodeValue.trim()) || n.nodeName === "BR") el.removeChild(n); });
    el.__mwLines = { lines: out, chars: s.chars, words: s.words };
    return el.__mwLines;
  };`,
  // canvas(host): a canvas covering the host element at its CSS size (drawing in CSS pixels); returns { cv, ctx, w, h }
  canvas: `MW.canvas = MW.canvas || function (host, w, h) {
    host = MW.el(host);
    var cv = document.createElement("canvas"); w = w || host.clientWidth || 1920; h = h || host.clientHeight || 1080;
    cv.width = w; cv.height = h; cv.style.position = "absolute"; cv.style.left = "0"; cv.style.top = "0"; cv.style.width = w + "px"; cv.style.height = h + "px"; cv.style.pointerEvents = "none";
    host.appendChild(cv);
    return { cv: cv, ctx: cv.getContext("2d"), w: w, h: h };
  };`,
  // springTo(k, c, keys): a value moved by springs: keys [[t, v], ...] (v at the first key, each later key starts a spring to its v at its
  // time; the moves add up, as a sum of springs); returns f(t)
  springs: `MW.springTo = MW.springTo || function (k, c, keys) {
    var sp = MW.spring(k, c);
    return function (t) { var v = keys[0][1]; for (var i = 1; i < keys.length; i++) if (t >= keys[i][0]) v += (keys[i][1] - keys[i - 1][1]) * sp.at(t - keys[i][0]); return v; };
  };`,
  // drawing on a 2D canvas: rr (rounded rectangle path), txt (Inter text, centred), arrow cursor, path(keys, t, ease): a point moving
  // through [[t, x, y], ...], eased on each leg and held between legs
  draw: `MW.rr = MW.rr || function (c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  MW.txt = MW.txt || function (c, s, x, y, size, color, weight, align) { c.font = (weight || 700) + " " + size + "px Inter, sans-serif"; c.fillStyle = color || "#e8ebf3"; c.textAlign = align || "center"; c.textBaseline = "middle"; c.fillText(s, x, y); };
  MW.cursor = MW.cursor || function (c, x, y, s) { s = s || 1; c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 16); c.lineTo(4, 12.5); c.lineTo(6.5, 18); c.lineTo(9, 17); c.lineTo(6.5, 11.5); c.lineTo(11.5, 11.5); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.lineWidth = 1; c.strokeStyle = "#111"; c.stroke(); c.restore(); };
  MW.path = MW.path || function (keys, t, ease) {
    var e = typeof ease === "function" ? ease : gsap.parseEase(ease || "power2.inOut");
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (var i = 1; i < keys.length; i++) if (t <= keys[i][0]) { var a = keys[i - 1], b = keys[i], u = e((t - a[0]) / ((b[0] - a[0]) || 1)); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
    var z = keys[keys.length - 1]; return [z[1], z[2]];
  };`,
  // charts: span(t, a, b) (0 → 1 between a and b), polyToX(c, pts, x) (a path along the polyline up to x; returns the head [x, y]),
  // yAt(pts, x) (the polyline's y at x)
  plot: `MW.span = MW.span || function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
  MW.yAt = MW.yAt || function (pts, x) { if (x <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var u = (x - pts[i - 1][0]) / ((pts[i][0] - pts[i - 1][0]) || 1); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u; } return pts[pts.length - 1][1]; };
  MW.polyToX = MW.polyToX || function (c, pts, x) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { if (pts[i][0] <= x) c.lineTo(pts[i][0], pts[i][1]); else { c.lineTo(x, MW.yAt(pts, x)); break; } } return [Math.min(x, pts[pts.length - 1][0]), MW.yAt(pts, Math.min(x, pts[pts.length - 1][0]))]; };`,
  // stage320(host): a canvas over the host whose drawing units are the reference's 320 x 200 frame, scaled to fit and centred: { ctx, k,
  // ox, oy, w, h, clear(), put(el, x, y) } (clear() resets and keeps the scale; put() centres a DOM element on a point of the frame)
  stage320: `MW.stage320 = MW.stage320 || function (host) {
    host = MW.el(host); if (getComputedStyle(host).position === "static") host.style.position = "relative";
    var c = MW.canvas(host), k = Math.min(c.w / 320, c.h / 200), ox = (c.w - 320 * k) / 2, oy = (c.h - 200 * k) / 2;
    return { ctx: c.ctx, cv: c.cv, k: k, ox: ox, oy: oy, w: c.w, h: c.h,
      clear: function () { c.ctx.setTransform(1, 0, 0, 1, 0, 0); c.ctx.clearRect(0, 0, c.w, c.h); c.ctx.setTransform(k, 0, 0, k, ox, oy); },
      put: function (el, x, y) { el.style.position = "absolute"; el.style.left = (ox + x * k) + "px"; el.style.top = (oy + y * k) + "px"; gsap.set(el, { xPercent: -50, yPercent: -50 }); } };
  };`,
};

/** Dependencies between helpers, so naming one brings what it calls. */
const NEEDS = { rand: ["hash"], split: ["el"], noise: ["rand"], mask: [], eases: ["bezier"], canvas: ["el"], keys: ["drive", "eases"], lines: ["split"], stage320: ["canvas"], springs: ["spring"] };

/** The helper source for a list of names (with their dependencies, in a stable order). */
export function helperSource(uses = []) {
  const want = new Set();
  const add = (n) => { if (want.has(n)) return; if (!HELPERS[n]) throw new Error(`Unknown helper "${n}"`); for (const d of NEEDS[n] ?? []) add(d); want.add(n); };
  for (const u of ["el", ...uses]) add(u);
  return Object.keys(HELPERS).filter((n) => want.has(n)).map((n) => "  " + HELPERS[n]).join("\n");
}
