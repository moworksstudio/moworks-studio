// TakayuStudio, Feedback & Reactions and Texture & Look (batch 3.6): like, rating, clap, reaction, counter, confetti, toast and island
// moments drawn on the reference's 320 x 200 frame, and texture overlays (grain, subframe blur, riso, halftone, watercolour, brush,
// paper cut, pixelate, vignette, CRT) on the element itself; written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { LANDSCAPE, PRODUCT } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration = 3, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "rand", "noise", "spring", "springs", "stage320"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, p2o = gsap.parseEase("power2.out"), p2i = gsap.parseEase("power2.in"), p2io = gsap.parseEase("power2.inOut"), bo = gsap.parseEase("back.out(1.7)");
var cursorAt = function (keys, t, downs) { var p = MW.path(keys, t, "power2.inOut"), d = 0; (downs || []).forEach(function (q) { if (t >= q && t < q + 0.1) d = 1; }); MW.cursor(c, p[0], p[1], d ? 0.85 : 1); };
var heart = function (x, y, s) { c.beginPath(); c.moveTo(x, y + 9 * s); c.bezierCurveTo(x - 16 * s, y - 2 * s, x - 10 * s, y - 14 * s, x, y - 6 * s); c.bezierCurveTo(x + 10 * s, y - 14 * s, x + 16 * s, y - 2 * s, x, y + 9 * s); c.closePath(); };
var star = function (x, y, R, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; c.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); } c.closePath(); };
var card = function (x, y, w, h) { MW.rr(c, x, y, w, h, 14); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke(); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
const PIC = `.pic { position: relative; width: 1200px; height: 750px; border-radius: 30px; overflow: hidden; background: url(assets/pic.svg) center / cover; box-shadow: 0 50px 120px rgba(0,0,0,0.5); }`;

export default [
  T("ui/heart-burst", {
    uses: U,
    fn: mk(`var sp = MW.spring(300, 12);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); card(90, 30, 140, 140); c.fillStyle = "#2a3350"; MW.rr(c, 104, 44, 112, 50, 10); c.fill(); MW.txt(c, o.caption, 104, 106, 8, "#c9d2ea", 700, "left");
  var hx = 132, hy = 146, s = t < o.press ? 1 : t < o.press + 0.1 ? 1 - 0.15 * p2o((t - o.press) / 0.1) : 0.85 + 0.15 * sp.at(t - o.press - 0.1), filled = t >= o.press + 0.1;
  heart(hx, hy, s * 0.95); if (filled) { c.fillStyle = o.accent; c.fill(); } else { c.strokeStyle = "#8f9ab3"; c.lineWidth = 1.8; c.stroke(); }
  for (var i = 0; i < 6; i++) { var st = o.press + 0.12 + 0.045 * i, p = T(t, st, st + o.life); if (p <= 0 || p >= 1) continue; var a = (-145 + 22 * i) * Math.PI / 180, d = 28 * 0.5 + (58 + 14 * (i % 2)) * 0.5 * p2o(p), x = hx + d * Math.cos(a) + 4 * Math.sin(p * 9 + i), y = hy - 6 + d * Math.sin(a) - 10 * p, z = Math.min(1, 5 * p) * (0.9 - 0.3 * p);
    c.globalAlpha = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1; heart(x, y, z * 0.45); c.fillStyle = i % 2 ? "#ffd23d" : o.accent; c.fill(); c.globalAlpha = 1; }
  MW.txt(c, String(filled ? o.count + 1 : o.count), hx + 18, hy + 0.5, 9, filled ? o.accent : "#8f9ab3", 800, "left");
  cursorAt([[0, 300, 196], [o.press - 0.12, hx + 2, hy + 3], [o.press + 0.4, hx + 2, hy + 3], [o.press + 1, 290, 180]], t, [o.press]);
});`),
    options: { press: "s (0.35)", life: "s per small heart (0.95)", count: "", caption: "", accent: "", loop: "s (2.6)" }, defaults: { press: 0.35, life: 0.95, count: 128, caption: "Ảnh hậu trường", accent: "#ff5d8f", loop: 2.6 },
    notes: "Pressed to 0.85, then filled and sprung back (k300 c12); six small hearts fan out around straight up (±55°), 0.045 s apart.",
    demo: CV("uiHeartBurst", 2.6),
  }),

  T("ui/star-rating-tap", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); card(56, 46, 208, 108); MW.txt(c, o.title, 72, 68, 10, "#e8ebf3", 800, "left"); var out = T(t, o.outAt, o.outAt + 0.2), lit = 0;
  for (var i = 0; i < 5; i++) { var x = 80 + 40 * i, y = 104, st = o.click + 0.1 + 0.08 * i, u = T(t, st, st + 0.28), on = i < o.rating && u > 0 && out < 1; if (on) lit = i + 1;
    star(x, y, 16, 7); c.fillStyle = "#2a3142"; c.fill(); if (on) { var s = (0.3 + 0.7 * bo(u)) + 0.25 * Math.sin(Math.PI * u) * (1 - u * 0.0); c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = 1 - out; star(0, 0, 16, 7); c.fillStyle = o.accent; c.fill(); c.restore(); c.globalAlpha = 1; } }
  MW.txt(c, lit + " / 5", 240, 138, 9, lit ? o.accent : "#6c778b", 800, "right");
  cursorAt([[0, 300, 196], [o.click - 0.1, 202, 110], [o.click + 0.4, 202, 110], [o.click + 1, 290, 180]], t, [o.click]);
});`),
    options: { rating: "(4)", click: "s (0.68)", outAt: "s (2.3)", title: "", accent: "", loop: "s (2.6)" }, defaults: { rating: 4, click: 0.68, outAt: 2.3, title: "Bạn thấy video thế nào?", accent: "#ffd23d", loop: 2.6 },
    notes: "The stars light in turn, 0.08 s apart: 0.3 → 1 (back.out) plus a half-sine bump to about 1.25.",
    demo: CV("uiStarRatingTap", 2.6),
  }),

  T("ui/clap-counter", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); card(70, 50, 180, 100); var reset = t >= o.resetAt, n = 0, cl = 0; o.taps.forEach(function (tp) { if (t >= tp && !reset) n++; var u = t - tp; if (u >= 0 && u < 0.18) cl = Math.max(cl, Math.sin(Math.PI * u / 0.18)); });
  var cx = 124, cy = 100, s = 1 - 0.08 * cl; c.fillStyle = "#1b2130"; c.beginPath(); c.arc(cx, cy, 32, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#8b7bff"; c.lineWidth = 1.5; c.stroke();
  [-1, 1].forEach(function (k) { c.save(); c.translate(cx + k * 6 * s, cy + 4); c.rotate(k * (0.38 - 0.28 * cl)); c.scale(s, s); MW.rr(c, -6, -20, 12, 26, 6); c.fillStyle = "#ffd27a"; c.fill(); c.restore(); });
  if (cl > 0.2) { c.strokeStyle = "#ffd23d"; c.lineWidth = 2; [-0.6, 0, 0.6].forEach(function (a) { c.beginPath(); c.moveTo(cx + 26 * Math.sin(a), cy - 26 * Math.cos(a)); c.lineTo(cx + 34 * Math.sin(a), cy - 34 * Math.cos(a)); c.stroke(); }); }
  MW.rr(c, 170, 78, 66, 44, 10); c.fillStyle = "#10131d"; c.fill(); c.save(); MW.rr(c, 170, 78, 66, 44, 10); c.clip(); var last = -1; o.taps.forEach(function (tp, i) { if (t >= tp) last = i; }); var roll = last >= 0 && !reset ? p2o(T(t, o.taps[last], o.taps[last] + 0.2)) : 1;
  var v0 = o.from + (reset ? 0 : Math.max(0, n - 1)), v1 = o.from + (reset ? 0 : n); if (n === 0 || reset) MW.txt(c, String(o.from), 203, 100.5, 18, "#e8ebf3", 900); else { MW.txt(c, String(v0), 203, 100.5 - 40 * roll, 18, "#e8ebf3", 900); MW.txt(c, String(v1), 203, 140.5 - 40 * roll, 18, "#e8ebf3", 900); } c.restore();
  o.taps.forEach(function (tp) { var u = T(t, tp, tp + 0.53); if (u > 0 && u < 1 && !reset) { c.globalAlpha = 1 - u; MW.txt(c, "+1", 203, 68 - 16 * p2o(u), 10, "#ffd23d", 900); c.globalAlpha = 1; } });
  cursorAt([[0, 300, 196], [o.taps[0] - 0.12, cx + 3, cy + 6], [o.taps[2] + 0.3, cx + 3, cy + 6], [o.taps[2] + 0.9, 290, 180]], t, o.taps);
});`),
    options: { taps: "s of each clap", from: "the count before (24)", resetAt: "s (2.5)", loop: "s (2.8)" }, defaults: { taps: [0.45, 1, 1.55], from: 24, resetAt: 2.5, loop: 2.8 },
    demo: CV("uiClapCounter", 2.8),
  }),

  T("ui/reaction-bar", {
    uses: U,
    fn: mk(`var X = [74, 117, 160, 203, 246], keys = [[0, -1]].concat(o.picks), L = [0, 1, 2, 3, 4].map(function (i) { return MW.springTo(320, 22, keys.map(function (k) { return [k[0], k[1] === i ? 1 : 0]; })); }), CX = MW.springTo(120, 20, keys.map(function (k) { return [k[0], k[1] < 0 ? 300 : X[k[1]]]; }));
var face = function (i, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); if (i === 0) { heart(0, 1, 0.9); c.fillStyle = "#ff4f6d"; c.fill(); } else { c.fillStyle = i === 4 ? "#ff7a45" : "#ffd23d"; c.beginPath(); c.arc(0, 0, 13, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#3a2400"; c.beginPath(); c.arc(-4.5, -3, 1.8, 0, 2 * Math.PI); c.arc(4.5, -3, 1.8, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = "#3a2400"; c.lineWidth = 1.8; c.beginPath(); if (i === 1) { c.arc(0, 2, 6, 0.1, Math.PI - 0.1); } else if (i === 2) { c.arc(0, 5, 3.2, 0, 2 * Math.PI); } else if (i === 3) { c.arc(0, 8, 5, Math.PI + 0.4, 2 * Math.PI - 0.4); } else { c.moveTo(-5, 6); c.lineTo(5, 6); } c.stroke(); if (i === 3) { c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(7, 2, 2, 0, 2 * Math.PI); c.fill(); } } c.restore(); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); card(60, 40, 200, 60); c.fillStyle = "#2a3350"; MW.rr(c, 74, 52, 110, 6, 3); c.fill(); MW.rr(c, 74, 64, 80, 6, 3); c.fill();
  MW.rr(c, 50, 120, 220, 44, 22); c.fillStyle = "#1b2130"; c.fill(); var any = 0; L.forEach(function (f) { any = Math.max(any, f(t)); });
  X.forEach(function (x, i) { var l = Math.max(0, L[i](t)); c.globalAlpha = 1 - (1 - 0.45) * Math.max(0, Math.min(1, any - l)); face(i, x, 142 - 16 * l, 1 + 0.4 * l); c.globalAlpha = 1;
    if (l > 0.3) { c.globalAlpha = Math.min(1, (l - 0.3) / 0.5); MW.rr(c, x - 22, 100 - 16 * l, 44, 18, 9); c.fillStyle = "#e8ebf3"; c.fill(); MW.txt(c, o.labels[i], x, 109.5 - 16 * l, 7, "#0b0d12", 800); c.globalAlpha = 1; } });
  MW.cursor(c, CX(t), 152, 1);
});`),
    options: { picks: "[[s, icon or −1], ...]", labels: "", loop: "s (2.8)" }, defaults: { picks: [[0.55, 1], [1.4, 3], [2.25, -1]], labels: ["Thích", "Haha", "Wow", "Buồn", "Giận"], loop: 2.8 },
    notes: "The picked icon rises 16 units and grows 1.4× on springs k320 c22; the others dim to 0.45; the cursor follows on a softer spring (k120 c20).",
    demo: CV("uiReactionBar", 2.8),
  }),

  T("data/digit-roll-ticker", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); card(90, 40, 140, 120); var f = 1 - T(t, o.resetAt, o.resetAt + 0.27); c.globalAlpha = 1; var ds = String(o.from).split(""), dt = String(o.to).split(""), steps = Number(dt[2]) - Number(ds[2]), p = p2o(T(t, 0.3, 1.5)) * steps;
  for (var i = 0; i < 3; i++) { var x = 124 + 36 * i, y = 90; MW.rr(c, x - 17, y - 25, 34, 50, 8); c.fillStyle = "#10131d"; c.fill(); c.save(); MW.rr(c, x - 17, y - 25, 34, 50, 8); c.clip();
    if (i < 2) MW.txt(c, ds[i], x, y + 0.5, 30, "#e8ebf3", 900); else { var base = Number(ds[2]); for (var k = 0; k <= steps; k++) { var yy = y + 40 * (k - p); if (Math.abs(yy - y) < 50) MW.txt(c, String(base + k), x, yy + 0.5, 30, k === steps && p >= steps - 0.01 ? o.accent : "#e8ebf3", 900); } } c.restore(); }
  MW.txt(c, o.label, 160, 134, 8, "#8f9ab3", 800); var b = bo(T(t, 1.45, 1.7)) * f; if (b > 0) { c.save(); c.translate(214, 58); c.scale(b, b); MW.rr(c, -15, -9, 30, 18, 9); c.fillStyle = "#3ddc84"; c.fill(); MW.txt(c, "+" + (o.to - o.from), 0, 0.5, 9, "#0b2a18", 900); c.restore(); }
  c.globalAlpha = 1 - f; if (f < 1) { c.fillStyle = "rgba(11,13,18," + (1 - f).toFixed(3) + ")"; c.fillRect(0, 0, 320, 200); } c.globalAlpha = 1;
});`),
    options: { from: "(120)", to: "(128): only the ones digit rolls", label: "", accent: "the final digit", resetAt: "s (2.35)", loop: "s (2.7)" }, defaults: { from: 120, to: 128, label: "NGƯỜI THEO DÕI", accent: "#a99bff", resetAt: 2.35, loop: 2.7 },
    demo: CV("dataDigitRollTicker", 2.7),
  }),

  T("effect/confetti-rain", {
    uses: U,
    fn: mk(`var r = MW.rand(o.seed), cols = o.colors, P = []; for (var i = 0; i < o.pieces; i++) { var col = i % 12; P.push({ x: 20 + col * 25.5 + (r() * 2 - 1) * 7, per: r() < 0.5 ? o.loop : o.loop / 2, ph: r(), sw: 1 + Math.floor(r() * 3), fl: 2 + Math.floor(r() * 4), tilt: (r() * 2 - 1) * 0.8, c: cols[i % cols.length], sp: r() * 6.28 }); }
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); P.forEach(function (q) { var y = ((q.ph + t / q.per) % 1) * 230 - 15, x = q.x + 9 * Math.sin(2 * Math.PI * q.sw * t / o.loop + q.sp), f = Math.cos(2 * Math.PI * q.fl * t / o.loop + q.sp), sx = Math.max(0.15, Math.abs(f));
    c.save(); c.translate(x, y); c.rotate(q.tilt * Math.sin(2 * Math.PI * t / o.loop + q.sp)); c.scale(sx, 1); c.globalAlpha = f < 0 ? 0.55 : 1; MW.rr(c, -4, -2.5, 8, 5, 1); c.fillStyle = q.c; c.fill(); c.restore(); }); c.globalAlpha = 1;
  card(90, 60, 140, 80); MW.txt(c, o.title, 160, 92, 16, "#e8ebf3", 900); MW.txt(c, o.sub, 160, 114, 7, "#8f9ab3", 600);
});`),
    options: { pieces: "(40)", colors: "", title: "", sub: "", seed: "(8)", loop: "s, seamless (2.8)" }, defaults: { pieces: 40, colors: ["#ff5d8f", "#ffd23d", "#3dd6f5", "#3ddc84", "#a693ff"], title: "CẢM ƠN!", sub: "Đơn hàng của bạn đã được ghi nhận", seed: 8, loop: 2.8 },
    notes: "Pieces fall at two speeds (one or two passes per loop), sway, flip (scaleX = |cos|, back side at 55 %) and tilt; every motion is a whole number of cycles per loop.",
    demo: CV("effectConfettiRain", 2.8),
  }),

  T("ui/toast-spring", {
    uses: U,
    fn: mk(`var sp = MW.spring(o.k, o.c);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 100, 10, 120, 184, 16); c.fillStyle = "#10131d"; c.fill(); c.fillStyle = "#1b2130"; for (var i = 0; i < 5; i++) { MW.rr(c, 110, 28 + i * 26, 100, 20, 5); c.fill(); }
  var y = 220 + (136 - 220) * (t > o.inAt ? sp.at(t - o.inAt) : 0); y += (220 - 136) * p2i(T(t, o.outAt, o.outAt + 0.25)); c.save(); MW.rr(c, 100, 10, 120, 184, 16); c.clip();
  MW.rr(c, 70 + 0, y, 180, 40, 10); c.restore(); c.save(); c.beginPath(); c.rect(0, 0, 320, 194); c.clip(); MW.rr(c, 70, y, 180, 40, 10); c.fillStyle = "#e8ebf3"; c.fill(); c.fillStyle = "#3ddc84"; c.beginPath(); c.arc(88, y + 20, 5, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.label, 100, y + 20.5, 9, "#0b0d12", 800, "left"); c.restore();
});`),
    options: { k: "spring stiffness (260)", c: "damping (22)", inAt: "s (0.3)", outAt: "s (2.6, 0.25 s power2.in)", label: "", loop: "s (3)" }, defaults: { k: 260, c: 22, inAt: 0.3, outAt: 2.6, label: "Đã lưu bản nháp", loop: 3 },
    notes: "In a product hold it 3–5 s; several toasts stack upward.",
    demo: CV("uiToastSpring", 3),
  }),

  T("ui/dynamic-island", {
    uses: U,
    fn: mk(`var a = MW.spring(260, 22), b = MW.spring(260, 26);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 90, 6, 140, 188, 26); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 2; c.stroke(); c.fillStyle = "#10131d"; MW.rr(c, 96, 12, 128, 176, 22); c.fill();
  var k = (t > o.openAt ? a.at(t - o.openAt) : 0) - (t > o.closeAt ? b.at(t - o.closeAt) : 0), w = 80 + (240 - 80) * k * 0.5, h = 26 + (60 - 26) * k * 0.5, x = 160 - w / 2, y = 18;
  MW.rr(c, x, y, w, h, h / 2); c.fillStyle = "#000"; c.fill(); var f = Math.max(0, Math.min(1, (k - 0.6) / 0.4));
  if (f > 0) { c.globalAlpha = f; c.fillStyle = o.accent; c.beginPath(); c.arc(x + h / 2, y + h / 2, 7, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.text, x + h + 4, y + h / 2 - 3, 8, "#fff", 800, "left"); c.fillStyle = "#3a4466"; MW.rr(c, x + h + 4, y + h / 2 + 4, 40, 3, 1.5); c.fill(); MW.txt(c, o.time, x + w - 10, y + h / 2 + 0.5, 9, o.accent, 900, "right"); c.globalAlpha = 1; }
});`),
    options: { openAt: "s (0.3, spring k260 c22)", closeAt: "s (2.1, spring k260 c26)", text: "", time: "", accent: "", loop: "s (2.9)" }, defaults: { openAt: 0.3, closeAt: 2.1, text: "Đang quay", time: "12:45", accent: "#ff5d8f", loop: 2.9 },
    notes: "Width 80 → 240 and height 26 → 60 (shown at half size on the 320 frame), the radius always half the height; content fades in as the spring passes 0.6.",
    demo: CV("uiDynamicIsland", 2.9),
  }),

  T("effect/film-grain-flicker", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; var cv = document.createElement("canvas"), W = el.clientWidth, Hh = el.clientHeight; cv.width = W; cv.height = Hh; cv.style.cssText = "position:absolute;inset:0;pointer-events:none;"; el.appendChild(cv);
      var c = cv.getContext("2d"), n = Math.min(o.max, Math.round(o.count * W * Hh / 64000));
      return MW.drive(tl, at, o.loop, function (t) { var r = MW.rand(o.seed + Math.floor(t * o.fps)); c.clearRect(0, 0, W, Hh); c.globalAlpha = o.opacity; for (var i = 0; i < n; i++) { c.fillStyle = i % 2 ? "#fff" : "#000"; c.fillRect(r() * W, r() * Hh, o.size, o.size); } c.globalAlpha = 1; });
    },
    options: { opacity: "(0.25 in the demo; 0.05–0.1 in a film)", count: "specks per 320 × 200 (900)", max: "specks at most (20000)", size: "px (4)", fps: "new grain a second (24)", seed: "(3)", loop: "s (3)" },
    defaults: { opacity: 0.25, count: 900, max: 20000, size: 4, fps: 24, seed: 3, loop: 3 },
    assets: [{ path: "pic.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n${ST} ${PIC}`, html: `<div class="st"><div class="pic"></div></div>`, run: `MW.effectFilmGrainFlicker(q(".pic"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/subframe-motion-blur", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var A = el.querySelector(o.plain), B = el.querySelector(o.blurred), io = gsap.parseEase("power2.inOut"), G = [];
      for (var i = 0; i < o.samples; i++) { var g = B.cloneNode(true); g.style.opacity = String(o.weight); B.parentNode.insertBefore(g, B); G.push(g); } B.style.visibility = "hidden";
      var X = function (t) { var u = (t % (2 * o.time)) / o.time; return o.distance * (u <= 1 ? io(u) : 1 - io(u - 1)); };
      return MW.drive(tl, at, o.loop, function (t) { gsap.set(A, { x: X(t) }); G.forEach(function (g, i) { gsap.set(g, { x: X(Math.max(0, t - o.gap * i)) }); }); });
    },
    options: { samples: "copies averaged (8)", gap: "s between them (0.012: a 270° shutter over 8 subframes at 24 fps is about this)", weight: "opacity each (0.2)", distance: "px (1200)", time: "s each way (0.8, ease-in-out)", plain: "the box without blur", blurred: "the box with blur", loop: "s (3.2)" },
    defaults: { samples: 8, gap: 0.012, weight: 0.2, distance: 1200, time: 0.8, plain: ".mb-a", blurred: ".mb-b", loop: 3.2 },
    notes: "A real render averages 4–8 subframes between t − 0.75 frame and t; here copies at earlier times stand in for them.",
    demo: { css: `${BG}\n.mb { position: absolute; inset: 0; } .mb > div { position: absolute; left: 200px; width: 240px; height: 240px; border-radius: 40px; background: linear-gradient(150deg, #a693ff, #6a4cf0); } .mb-a { top: 200px; } .mb-b { top: 600px; }
.mb span { position: absolute; left: 200px; font-size: 34px; font-weight: 700; color: #8f9ab3; }`,
      html: `<div class="mb"><span style="top:140px">Không nhoè</span><span style="top:540px">Nhoè 8 khung con</span><div class="mb-a"></div><div class="mb-b"></div></div>`, run: `MW.effectSubframeMotionBlur(q(".mb"), tl, 0, {});`, duration: 3.2 },
  }),

  T("effect/riso-misregister", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var L = o.layers.map(function (s) { return el.querySelector(s); });
      return MW.drive(tl, at, o.loop, function (t) { var k = Math.floor(t * o.fps) % o.steps.length, d = o.steps[k]; if (L[0]) gsap.set(L[0], { x: -d, y: -d / 2 }); if (L[1]) gsap.set(L[1], { x: d, y: d / 2 }); });
    },
    options: { layers: "[cyan layer, pink layer], each a copy of the art", steps: "px offsets per frame ([16, 12, 8, 4, 8, 12])", fps: "(12)", loop: "s (3)" },
    defaults: { layers: [".rz-c", ".rz-p"], steps: [16, 12, 8, 4, 8, 12], fps: 12, loop: 3 },
    notes: "The two inks (cyan #2ec4e8, pink #ff4fa3) are blended multiply on paper white.",
    demo: { css: `#demo { background: #f6f1e6; font-family: Inter, sans-serif; } .rz { position: absolute; inset: 0; } .rz > div { position: absolute; inset: 0; mix-blend-mode: multiply; } .rz i { position: absolute; left: 1320px; top: 280px; width: 520px; height: 520px; border-radius: 50%; background: currentColor; }
.rz b { position: absolute; left: 150px; top: 380px; font-size: 240px; font-weight: 900; letter-spacing: -0.02em; } .rz-c { color: #2ec4e8; } .rz-p { color: #ff4fa3; }`,
      html: `<div class="rz"><div class="rz-c"><i></i><b>IN RISO</b></div><div class="rz-p"><i style="left:1240px;top:380px;width:360px;height:360px"></i><b>IN RISO</b></div></div>`, run: `MW.effectRisoMisregister(q(".rz"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/halftone-pulse", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var sx = 160 + o.swing * Math.sin(2 * Math.PI * t / o.period), sy = 100;
  c.fillStyle = o.color; for (var y = o.pitch / 2; y < 200; y += o.pitch) for (var x = o.pitch / 2; x < 320; x += o.pitch) { var d = Math.hypot(x - sx, y - sy), r = o.max * Math.max(0, Math.min(1, 1 - d / o.reach)); if (r > 0.2) { c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); } }
  MW.rr(c, 104, 82, 112, 36, 10); c.fillStyle = "rgba(11,13,18,0.85)"; c.fill(); MW.txt(c, o.title, 160, 100.5, 20, "#ffffff", 900);
});`),
    options: { pitch: "units (10)", max: "dot radius (5)", reach: "units the bright spot reaches (110)", swing: "± units (60)", period: "s (3)", color: "", title: "", loop: "s (3)" },
    defaults: { pitch: 10, max: 5, reach: 110, swing: 60, period: 3, color: "#ffd23d", title: "BÁO IN", loop: 3 },
    demo: CV("effectHalftonePulse", 3),
  }),

  T("hand/watercolor-wash", {
    uses: U,
    fn: mk(`var nz = MW.noise(o.seed), oc = function (u) { return 1 - Math.pow(1 - u, 3); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); c.fillStyle = "#f6f1e6"; c.fillRect(0, 0, 320, 200); var f = 1 - T(t, o.loop - 0.4, o.loop);
  for (var k = 0; k < o.layers; k++) { var u = oc(T(t, 0.2 + 0.25 * k, 0.2 + 0.25 * k + 1.8)), R = (30 + 6 * k) * u * 1.8; if (R < 0.5) continue; var cx = 160 + (k - 2) * 14, cy = 100 + ((k % 2) * 2 - 1) * 8;
    c.beginPath(); for (var i = 0; i <= 50; i++) { var a = i / 50 * 2 * Math.PI, rr = R * (1 + 0.35 * nz(a * 1.7 + k * 13)); c.lineTo(cx + 1.4 * rr * Math.cos(a), cy + rr * Math.sin(a)); } c.closePath(); var col = o.colors[k % o.colors.length];
    c.globalAlpha = 0.16 * f; c.fillStyle = col; c.fill(); c.globalAlpha = 0.5 * f; c.strokeStyle = col; c.lineWidth = 2; c.stroke(); } c.globalAlpha = f; MW.txt(c, o.title, 160, 100, 24, "#2a2350", 900); c.globalAlpha = 1;
});`),
    options: { layers: "(5)", colors: "", title: "", seed: "(5)", loop: "s (3.4)" }, defaults: { layers: 5, colors: ["#5aa9e6", "#ff8fab", "#7fc8a9", "#ffd166", "#b39ddb"], title: "Mùa xuân", seed: 5, loop: 3.4 },
    notes: "Each layer spreads over 1.8 s (ease-out cubic), 0.25 s after the last, at 16 % with a stroke of the same colour so the edges read darker.",
    demo: CV("handWatercolorWash", 3.4),
  }),

  T("hand/brush-write-on", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var P = Array.prototype.slice.call(el.querySelectorAll("path, polyline, line")), io = gsap.parseEase("power2.inOut"), L = P.map(function (p) { var l = p.getTotalLength(); p.style.strokeDasharray = l + " " + l; p.style.strokeDashoffset = String(l); return l; });
      return MW.drive(tl, at, o.start + P.length * (o.duration + o.gap) + 0.3, function (t) { P.forEach(function (p, i) { var u = io(Math.max(0, Math.min(1, (t - o.start - i * (o.duration + o.gap)) / o.duration))); p.style.strokeDashoffset = String(L[i] * (1 - u)); }); });
    },
    options: { duration: "s per stroke (0.4)", gap: "s between strokes (0.06)", start: "s (0.2)" }, defaults: { duration: 0.4, gap: 0.06, start: 0.2 },
    notes: "Strokes are drawn in document order, so put them in writing order.",
    demo: { css: `${BG}\n${ST} .bw svg { width: 1400px; height: 875px; overflow: visible; }`,
      html: `<div class="st"><div class="bw"><svg viewBox="0 0 320 200"><g fill="none" stroke="#ffd23d" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M60 60 L92 142 L124 60"/><path d="M146 92 L146 124 Q146 142 162 142 Q178 142 180 124 L180 92 L180 142"/><path d="M206 98 L206 142"/><path d="M206 70 L206 72"/></g></svg></div></div>`,
      run: `MW.handBrushWriteOn(q(".bw"), tl, 0, {});`, duration: 2.6 },
  }),

  T("hand/paper-cut-layers", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), bk = gsap.parseEase("back.out(" + o.back + ")"); Ls.forEach(function (l) { l.style.boxShadow = o.shadow[0] + "px " + o.shadow[1] + "px 0 rgba(0,0,0,0.25)"; });
      return MW.drive(tl, at, o.loop, function (t) { var q = Math.floor(t * o.fps) / o.fps, r = MW.rand(o.seed + Math.floor(t * o.fps)); Ls.forEach(function (l, i) { var u = bk(Math.max(0, Math.min(1, (q - o.start - i * o.stagger) / o.duration))); gsap.set(l, { y: o.rise * (1 - u), x: (r() * 2 - 1) * o.jitter }); l.style.opacity = q >= o.start + i * o.stagger ? "1" : "0"; }); });
    },
    options: { layers: "", fps: "time stepped to (12: on twos)", duration: "s per layer (0.3)", stagger: "s (0.3)", back: "back.out strength (2.2)", rise: "px (160)", jitter: "± px per step (4)", shadow: "[x, y] px hard shadow ([16, 24])", start: "s (0.2)", seed: "(2)", loop: "s (2.4)" },
    defaults: { layers: ".pc > div", fps: 12, duration: 0.3, stagger: 0.3, back: 2.2, rise: 160, jitter: 4, shadow: [16, 24], start: 0.2, seed: 2, loop: 2.4 },
    demo: { css: `#demo { background: #f2e3c6; font-family: Inter, sans-serif; } ${ST} .pc { display: flex; flex-direction: column; gap: 40px; align-items: center; } .pc > div { width: 880px; height: 160px; border-radius: 56px; opacity: 0; display: grid; place-items: center; font-size: 64px; font-weight: 900; color: #fff; }`,
      html: `<div class="st"><div class="pc"><div style="background:#e76f51">Cắt giấy</div><div style="background:#2a9d8f">Dán từng lớp</div><div style="background:#264653">Quay từng khung</div></div></div>`, run: `MW.handPaperCutLayers(q(".pc"), tl, 0, {});`, duration: 2.4 },
  }),

  T("effect/pixelate", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      window.__mwPix = (window.__mwPix || 0) + 1; var id = "mw-pix-" + window.__mwPix, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), W = el.clientWidth;
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute"; svg.innerHTML = '<filter id="' + id + '" x="0" y="0" width="100%" height="100%"><feFlood x="0" y="0" width="1" height="1"/><feComposite width="10" height="10"/><feTile result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/><feMorphology operator="dilate" radius="5"/></filter>'; document.body.appendChild(svg);
      var fl = svg.querySelector("feFlood"), cp = svg.querySelector("feComposite"), mo = svg.querySelector("feMorphology");
      return MW.drive(tl, at, o.loop, function (t) { var n = Math.round(o.max - (o.max - o.min) * Math.abs(Math.sin(Math.PI * t / o.period))), b = Math.max(2, Math.round(W / n)), h = Math.floor(b / 2);
        fl.setAttribute("x", String(h)); fl.setAttribute("y", String(h)); cp.setAttribute("width", String(b)); cp.setAttribute("height", String(b)); mo.setAttribute("radius", String(h)); el.style.filter = "url(#" + id + ")"; });
    },
    options: { max: "pixels across at the coarsest (32)", min: "pixels across at the finest (4)", period: "s for a there-and-back (3), stepping through whole numbers", loop: "s (3)" },
    defaults: { max: 32, min: 4, period: 3, loop: 3 },
    notes: "An SVG filter samples one pixel per block and dilates it, so the picture is pixelated without smoothing; the site's steps are 32 → 16 → 8 → 4 → 1 px at 0.12 s each.",
    assets: [{ path: "pic.svg", data: PRODUCT }],
    demo: { css: `${BG}\n${ST} .px { width: 760px; height: 760px; border-radius: 30px; background: url(assets/pic.svg) center / cover; }`, html: `<div class="st"><div class="px"></div></div>`, run: `MW.effectPixelate(q(".px"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/vignette-breathe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; var v = document.createElement("div"), W = el.clientWidth, k = W / 320; v.style.cssText = "position:absolute;inset:0;pointer-events:none;"; el.appendChild(v);
      return MW.drive(tl, at, o.loop, function (t) { var a = o.edge[0] + (o.edge[1] - o.edge[0]) * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / o.period)); v.style.background = "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) " + (o.inner * k).toFixed(0) + "px, rgba(0,0,0," + a.toFixed(3) + ") " + (o.outer * k).toFixed(0) + "px)"; });
    },
    options: { edge: "[min, max] edge darkness ([0.25, 0.45])", inner: "clear radius in the 320 frame (60)", outer: "full at (200)", period: "s (3)", loop: "s (3)" },
    defaults: { edge: [0.25, 0.45], inner: 60, outer: 200, period: 3, loop: 3 },
    notes: "House rule: no grade and vignette over footage by default.",
    assets: [{ path: "pic.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.vg { position: absolute; inset: 0; background: url(assets/pic.svg) center / cover; }`, html: `<div class="vg"></div>`, run: `MW.effectVignetteBreathe(q(".vg"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/crt-scanlines", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; var s = document.createElement("div"), b = document.createElement("div"), Hh = el.clientHeight;
      s.style.cssText = "position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg, rgba(0,0,0," + o.opacity + ") 0 " + o.line + "px, transparent " + o.line + "px " + o.pitch + "px);"; b.style.cssText = "position:absolute;left:0;right:0;pointer-events:none;height:" + o.band + "px;background:linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255," + o.glow + "), rgba(255,255,255,0));"; el.appendChild(s); el.appendChild(b);
      return MW.drive(tl, at, o.loop, function (t) { gsap.set(b, { y: ((t % o.roll) / o.roll) * (Hh + o.band) - o.band }); });
    },
    options: { pitch: "px between lines (6)", line: "px of dark line (2)", opacity: "(0.18)", band: "px of the rolling glow (150)", glow: "(0.12)", roll: "s per pass (3), linear", loop: "s (3)" },
    defaults: { pitch: 6, line: 2, opacity: 0.18, band: 150, glow: 0.12, roll: 3, loop: 3 },
    assets: [{ path: "pic.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.crt { position: absolute; inset: 0; background: url(assets/pic.svg) center / cover; } .crt b { position: absolute; left: 0; right: 0; top: 420px; text-align: center; font-size: 140px; font-weight: 900; color: #fff; }`, html: `<div class="crt"><b>KÊNH 7</b></div>`, run: `MW.effectCrtScanlines(q(".crt"), tl, 0, {});`, duration: 3 },
  }),
];
