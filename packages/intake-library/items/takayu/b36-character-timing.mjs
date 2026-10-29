// TakayuStudio, Character and Timing & Rhythm (batch 3.6): walk, jump, blink, take, head turn, idle and tail motions on a small mascot
// drawn on the reference's 320 x 200 frame, and the timing rules (duration by size and distance, exits, staggers, cadence, snap, beats,
// ramps, overlap, reading holds, energy arcs) as effects on elements or small lessons; written here from the site's ideas and numbers
// (no code of the site).
import { T } from "../../takayu/define.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration = 3, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "rand", "spring", "stage320"];
// the mascot: a rounded body with a face, arms and legs; every part takes its pose from p
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, p2o = gsap.parseEase("power2.out"), p2io = gsap.parseEase("power2.inOut"), A = "#8b7bff";
var mascot = function (x, y, p) { p = p || {}; var sx = p.sx || 1, sy = p.sy || 1, eo = p.eye == null ? 1 : p.eye, es = p.eyeSize || 1; c.save(); c.translate(x + (p.dx || 0), y + (p.dy || 0));
  c.strokeStyle = "#5b46d8"; c.lineWidth = 6; c.lineCap = "round"; [[-1, p.leg || 0], [1, -(p.leg || 0)]].forEach(function (l) { c.save(); c.translate(l[0] * 9 * sx, 0); c.rotate(l[1]); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 18); c.stroke(); c.restore(); });
  c.scale(sx, sy); c.translate(0, -2); MW.rr(c, -22, -48, 44, 50, 18); c.fillStyle = A; c.fill();
  [[-1, p.arm || 0], [1, -(p.arm || 0)]].forEach(function (a) { c.save(); c.translate(a[0] * 22, -26); c.rotate(a[1] + a[0] * 0.25); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 16); c.strokeStyle = "#a693ff"; c.stroke(); c.restore(); });
  c.save(); c.translate(p.head || 0, 0); c.fillStyle = "#fff"; [-8, 8].forEach(function (ex) { c.beginPath(); c.ellipse(ex + (p.look || 0), -30, 4.2 * es, Math.max(0.4, 5.5 * es * eo), 0, 0, 2 * Math.PI); c.fill(); });
  c.fillStyle = "#1b1440"; if (eo > 0.25) [-8, 8].forEach(function (ex) { c.beginPath(); c.arc(ex + (p.look || 0) * 1.4, -29, 2 * es, 0, 2 * Math.PI); c.fill(); });
  if (p.mouth) { c.fillStyle = "#1b1440"; c.beginPath(); c.ellipse(0, -16, 3.5 * p.mouth, 4.5 * p.mouth, 0, 0, 2 * Math.PI); c.fill(); } else { c.strokeStyle = "#1b1440"; c.lineWidth = 1.6; c.beginPath(); c.arc(0, -20, 4, 0.3, Math.PI - 0.3); c.stroke(); } c.restore(); c.restore(); };
var floor = function (y, off) { c.strokeStyle = "#262c3a"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(40, y); c.lineTo(280, y); c.stroke(); if (off != null) { c.fillStyle = "#3a4466"; for (var x = 40 - (off % 20); x < 280; x += 20) if (x > 40) c.fillRect(x, y + 4, 8, 1.5); } };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
// a grid of tiles for the stagger items
const GRID = (cls) => `<div class="st"><div class="${cls}">${Array.from({ length: 32 }, (_, i) => `<i${i === 0 ? ' class="a"' : ""}></i>`).join("")}</div></div>`;
const GCSS = (cls) => `${BG}\n${ST} .${cls} { display: grid; grid-template-columns: repeat(8, 120px); gap: 40px; } .${cls} i { display: block; width: 120px; height: 120px; border-radius: 26px; background: #2f3a5c; transform: scale(0); } .${cls} i.a { background: #8b7bff; }`;
const STAG = function (el, tl, at, o) {
  var it = Array.prototype.slice.call(el.children), n = o.cols, sp = MW.spring(o.k, o.c), r = MW.rand(o.seed), rows = Math.ceil(it.length / n), cx = (n - 1) / 2, cy = (rows - 1) / 2;
  var D = it.map(function (_, i) { var col = i % n, row = Math.floor(i / n); if (o.from === "center") return Math.hypot(col - cx, row - cy) * o.each; if (o.from === "edges") return (cx - Math.abs(col - cx)) * o.each + row * o.rowEach; if (o.from === "random") return r() * o.spread; if (o.from === "diagonal") return (row + col) * o.each; return i * o.each; });
  return MW.drive(tl, at, o.outAt + 0.3, function (t) { var f = 1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.25)); it.forEach(function (x, i) { var u = t - D[i]; gsap.set(x, { scale: u > 0 ? sp.at(u) : 0 }); x.style.opacity = String(f); }); });
};
const SO = { cols: "tiles per row (8)", k: "spring stiffness (260)", c: "damping (20: about 8 % overshoot)", outAt: "s they fade (2.0)" };

export default [
  T("motion/walk-cycle", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.cycle * o.loops, function (t) {
  S.clear(); var ph = 2 * Math.PI * t / o.cycle; floor(150, t * 60); mascot(160, 150 - 18 - o.bob * Math.abs(Math.cos(ph)), { leg: o.leg * Math.sin(ph), arm: o.arm * Math.sin(ph) });
});`),
    options: { cycle: "s for two steps (1)", bob: "units (5): low at contact, high at passing", leg: "radians (0.5)", arm: "radians, opposite phase (0.6)", loops: "(3)" }, defaults: { cycle: 1, bob: 5, leg: 0.5, arm: 0.6, loops: 3 },
    demo: CV("motionWalkCycle", 3),
  }),

  T("motion/jump-squash", {
    uses: U,
    fn: mk(`var oq = function (u) { return 1 - (1 - u) * (1 - u); }, iq = function (u) { return u * u; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); floor(150); var u = t - o.start, y = 0, sy = 1;
  if (u > 0 && u < 0.2) sy = 1 - (1 - o.crouch) * p2o(u / 0.2); else if (u >= 0.2 && u < 0.5) { var a = (u - 0.2) / 0.3; y = -o.height * oq(a); sy = 1 + 0.2 * (1 - a); } else if (u >= 0.5 && u < 0.8) { y = -o.height * (1 - iq((u - 0.5) / 0.3)); sy = 1.05; } else if (u >= 0.8 && u < 0.98) sy = o.land + (1 - o.land) * p2o((u - 0.8) / 0.18);
  c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(160, 151, 22 * (1 + y / o.height * 0.5), 3, 0, 0, 2 * Math.PI); c.fill(); mascot(160, 150 - 18 + y, { sy: sy, sx: 1 / sy, arm: y < -5 ? -0.8 : 0.2 });
});`),
    options: { crouch: "scaleY (0.78, 0.2 s)", height: "units (80)", land: "scaleY on landing (0.65 → 1 in 0.18 s)", start: "s (0.3)", loop: "s (1.6)" }, defaults: { crouch: 0.78, height: 80, land: 0.65, start: 0.3, loop: 1.6 },
    notes: "Rise 0.3 s ease-out quad with an early stretch, fall 0.3 s ease-in quad.",
    demo: CV("motionJumpSquash", 1.6),
  }),

  T("motion/blink", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var e = 1; o.blinks.forEach(function (b) { var u = (t - b) / o.duration; if (u > 0 && u < 1) e = Math.min(e, 1 - Math.sin(Math.PI * u)); });
  c.save(); c.translate(160, 140); c.scale(2.2, 2.2); mascot(0, 0, { eye: e }); c.restore();
});`),
    options: { blinks: "s each blink starts ([0.8, 2.1, 2.35, 3.4]: irregular, one double)", duration: "s per blink (0.2)", loop: "s (4)" }, defaults: { blinks: [0.8, 2.1, 2.35, 3.4], duration: 0.2, loop: 4 },
    notes: "The recipe closes in 0.08 s (ease-in) and opens in 0.17 s (ease-out), 2–6 s apart.",
    demo: CV("motionBlink", 4),
  }),

  T("motion/surprise-take", {
    uses: U,
    fn: mk(`var sp = MW.spring(260, 9);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); floor(160); var u = t - o.at, sy = 1, eye = 1, mouth = 0; if (u > 0 && u < 0.1) sy = 1 - (1 - o.squash) * p2o(u / 0.1); else if (u >= 0.1) { sy = o.squash + (1 - o.squash) * sp.at(u - 0.1); eye = 1.4; mouth = 1; }
  c.save(); c.translate(160, 160 - 18 * 1.6); c.scale(1.6, 1.6); mascot(0, 0, { sy: sy, sx: 2 - sy, eyeSize: u >= 0.1 ? 1.4 : 1, mouth: mouth }); c.restore();
  var l = T(t, o.at + 0.4, o.at + 0.8); if (u > 0.1 && l < 1) { c.globalAlpha = 1 - l; c.strokeStyle = "#ffd23d"; c.lineWidth = 2.5; c.lineCap = "round"; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + (i - 2) * 0.35; c.beginPath(); c.moveTo(160 + 70 * Math.cos(a), 72 + 70 * Math.sin(a)); c.lineTo(160 + 86 * Math.cos(a), 72 + 86 * Math.sin(a)); c.stroke(); } c.globalAlpha = 1; }
});`),
    options: { at: "s (0.6)", squash: "scaleY (0.8, in 0.1 s)", loop: "s (2.4)" }, defaults: { at: 0.6, squash: 0.8, loop: 2.4 },
    notes: "Compress, then a spring (k260 c9) overshoots into a stretch; the eyes open 1.4× and five lines flash above.",
    demo: CV("motionSurpriseTake", 2.4),
  }),

  T("motion/head-turn", {
    uses: U,
    fn: mk(`var oc = function (u) { return 1 - Math.pow(1 - u, 3); }, io = gsap.parseEase("power3.inOut");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); floor(160); var s0 = o.start, b = o.backAt, f = function (a, d, e) { return e(T(t, s0 + a, s0 + a + d)) - e(T(t, b + a, b + a + d)); };
  var eyes = o.eyes * f(0, 0.15, oc), head = o.head * f(0.1, 0.35, io), body = o.body * f(0.2, 0.45, io);
  c.save(); c.translate(160, 160 - 18 * 1.8); c.scale(1.8, 1.8); mascot(body, 0, { look: eyes / 3, head: head / 2 }); c.restore();
});`),
    options: { eyes: "units (14, 0.15 s ease-out)", head: "units (12, 0.35 s)", body: "units (6, 0.45 s)", start: "s (0.4)", backAt: "s (1.9)", loop: "s (3)" }, defaults: { eyes: 14, head: 12, body: 6, start: 0.4, backAt: 1.9, loop: 3 },
    notes: "Eyes first, then the head 0.1 s later, then the body 0.1 s after that: overlapping action; it returns in the same order.",
    demo: CV("motionHeadTurn", 3),
  }),

  T("motion/idle-breathe", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); floor(160); var b = 1 + o.amp * Math.sin(2 * Math.PI * t / o.period), sw = o.sway * Math.sin(2 * Math.PI * t / o.shift);
  c.save(); c.translate(160 + sw, 160 - 18 * 1.8); c.scale(1.8, 1.8); mascot(0, 0, { sy: b, sx: 1 / b, arm: 0.05 * Math.sin(2 * Math.PI * t / o.period) }); c.restore();
});`),
    options: { amp: "± scale (0.03; 0.025 in the recipe)", period: "s (2; 3 in the recipe)", sway: "± units of weight shift (3)", shift: "s (4; 6–10 in the recipe)", loop: "s (4)" }, defaults: { amp: 0.03, period: 2, sway: 3, shift: 4, loop: 4 },
    notes: "Never frozen: a slow breath from the feet and an occasional weight shift.",
    demo: CV("motionIdleBreathe", 4),
  }),

  T("motion/takayu-follow-chain", {
    uses: U,
    fn: mk(`var io = gsap.parseEase("power2.inOut"), X = function (t) { return o.distance * (io(T(t, 0.3, 0.9)) - io(T(t, 1.8, 2.4))); }, dt = 1 / 240, n = o.joints;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); floor(160); var px = [], vx = [], i; for (i = 0; i < n; i++) { px.push(0); vx.push(0); }
  for (var s = 0; s <= t; s += dt) for (i = 0; i < n; i++) { var target = X(s - o.delay * (i + 1)), k = 260, cc = 2 * (0.7 - 0.08 * i) * Math.sqrt(k); vx[i] += (k * (target - px[i]) - cc * vx[i]) * dt; px[i] += vx[i] * dt; }
  var bx = 110 + X(t), by = 160 - 18 - 20; c.lineCap = "round";
  for (i = 0; i < n; i++) { var x0 = i ? 110 + px[i - 1] - 10 * i - 18 : bx - 18, y0 = i ? by + 0.8 * (i) * Math.sin(t * 9 + i) : by, x1 = 110 + px[i] - 10 * (i + 1) - 18, y1 = by + 0.8 * (i + 1) * Math.sin(t * 9 + i + 1) - (i + 1) * 3; c.strokeStyle = "#a693ff"; c.lineWidth = 8 - i; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  mascot(bx, 160 - 18, { leg: 0.3 * Math.sin(t * 12) * (Math.abs(X(t + 0.01) - X(t)) > 0.05 ? 1 : 0) });
});`),
    options: { joints: "(6)", delay: "s per joint (0.045)", distance: "units the body moves (80)", loop: "s (3)" }, defaults: { joints: 6, delay: 0.045, distance: 80, loop: 3 },
    notes: "Each joint repeats the body's move later through a spring whose damping drops toward the tip, so the tip still swings after the body stops.",
    demo: CV("motionTakayuFollowChain", 3),
  }),

  T("motion/duration-by-size", {
    uses: U,
    fn: mk(`var ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), Z = [[60, 28, o.durations[0]], [140, 60, o.durations[1]], [240, 108, o.durations[2]]];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); Z.forEach(function (z) { var s = ex(T(t, o.start, o.start + z[2])) * (1 - pin(T(t, o.outAt, o.outAt + 0.2))); if (s > 0) { c.save(); c.translate(z[0], 96); c.scale(s, s); MW.rr(c, -z[1] / 2, -z[1] / 2, z[1], z[1], z[1] * 0.18); c.fillStyle = A; c.fill(); c.restore(); } MW.txt(c, Math.round(z[2] * 1000) + " ms", z[0], 170, 9, "#c9d2ea", 800); });
});`),
    options: { durations: "s for small / medium / large ([0.15, 0.35, 0.7])", start: "s (0.3)", outAt: "s (2.0)", loop: "s (2.5)" }, defaults: { durations: [0.15, 0.35, 0.7], start: 0.3, outAt: 2, loop: 2.5 },
    notes: "Rule: micro 0.1–0.2 s, panels and modals 0.2–0.4 s, full-screen or hero 0.4–0.8 s; one duration for all makes big things look light.",
    demo: CV("motionDurationBySize", 2.5),
  }),

  T("motion/duration-by-distance", {
    uses: U,
    fn: mk(`var D = [60, 120, 240];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); D.forEach(function (d, i) { var dur = o.base * Math.sqrt(d / o.reference), y = 60 + i * 40, p = p2io(T(t, o.start, o.start + dur)) - p2io(T(t, o.backAt, o.backAt + dur)); c.strokeStyle = "#262c3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(40, y); c.lineTo(40 + d, y); c.stroke();
    c.fillStyle = A; c.beginPath(); c.arc(40 + d * p, y, 7, 0, 2 * Math.PI); c.fill(); MW.txt(c, d + " → " + Math.round(dur * 1000) + " ms", 290, y, 8, "#c9d2ea", 800, "right"); });
});`),
    options: { base: "s for the reference distance (0.3)", reference: "units (60 here; 200 px in a product)", start: "s (0.3)", backAt: "s (1.6)", loop: "s (2.6)" }, defaults: { base: 0.3, reference: 60, start: 0.3, backAt: 1.6, loop: 2.6 },
    notes: "Duration ≈ base × √(distance / reference): four times the distance takes about twice as long.",
    demo: CV("motionDurationByDistance", 2.6),
  }),

  T("motion/exit-faster", {
    uses: U,
    fn: mk(`var ei = gsap.parseEase("expo.in"), eo = gsap.parseEase("expo.out");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var x = -110 + 210 * eo(T(t, o.inAt, o.inAt + o.in)) + 240 * ei(T(t, o.outAt, o.outAt + o.out)); MW.rr(c, 100 + x, 76, 60, 48, 10); c.fillStyle = A; c.fill();
  MW.txt(c, "VÀO " + Math.round(o.in * 1000) + " ms · ease-out", 160, 150, 8, t < o.outAt ? "#e8ebf3" : "#4a5470", 800); MW.txt(c, "RA " + Math.round(o.out * 1000) + " ms · ease-in", 160, 166, 8, t >= o.outAt ? "#e8ebf3" : "#4a5470", 800);
});`),
    options: { in: "s (0.3, expo.out)", out: "s (0.21, expo.in: 65–75 % of the entrance)", inAt: "s (0.3)", outAt: "s (1.5)", loop: "s (2.2)" }, defaults: { in: 0.3, out: 0.21, inAt: 0.3, outAt: 1.5, loop: 2.2 },
    notes: "What leaves should not hold attention.",
    demo: CV("motionExitFaster", 2.2),
  }),

  T("motion/stagger-sequential", { uses: ["drive", "rand", "spring"], fn: STAG, options: { from: "start: reading order", each: "s between tiles (0.03)", ...SO, spread: "", rowEach: "", seed: "" }, defaults: { from: "start", each: 0.03, cols: 8, k: 260, c: 20, outAt: 2, spread: 0, rowEach: 0, seed: 1 },
    notes: "Lists 0.04–0.08 s apart, dense grids 0.02–0.04 s; the whole run within 0.6–0.8 s.", demo: { css: GCSS("sg"), html: GRID("sg"), run: `MW.motionStaggerSequential(q(".sg"), tl, 0.3, {});`, duration: 2.6 } }),
  T("motion/stagger-center", { uses: ["drive", "rand", "spring"], fn: STAG, options: { from: "center", each: "s per tile of distance (0.07; 0.04 in the recipe)", ...SO, spread: "", rowEach: "", seed: "" }, defaults: { from: "center", each: 0.07, cols: 8, k: 260, c: 20, outAt: 2, spread: 0, rowEach: 0, seed: 1 },
    notes: "A ripple from the middle: for hero entrances and spreading reactions.", demo: { css: GCSS("sc"), html: GRID("sc"), run: `MW.motionStaggerCenter(q(".sc"), tl, 0.3, {});`, duration: 2.6 } }),
  T("motion/stagger-edges", { uses: ["drive", "rand", "spring"], fn: STAG, options: { from: "edges", each: "s per column from the nearer side (0.08)", rowEach: "s per row (0.02)", ...SO, spread: "", seed: "" }, defaults: { from: "edges", each: 0.08, rowEach: 0.02, cols: 8, k: 260, c: 20, outAt: 2, spread: 0, seed: 1 },
    notes: "Closing in from both sides: for endings and convergence.", demo: { css: GCSS("se"), html: GRID("se"), run: `MW.motionStaggerEdges(q(".se"), tl, 0.3, {});`, duration: 2.6 } }),
  T("motion/stagger-random", { uses: ["drive", "rand", "spring"], fn: STAG, options: { from: "random", spread: "s the starts are spread over (0.6)", seed: "fixed, so every render matches", ...SO, each: "", rowEach: "" }, defaults: { from: "random", spread: 0.6, seed: 9, cols: 8, k: 260, c: 20, outAt: 2, each: 0, rowEach: 0 },
    notes: "For sparkles and textured appearances.", demo: { css: GCSS("sr"), html: GRID("sr"), run: `MW.motionStaggerRandom(q(".sr"), tl, 0.3, {});`, duration: 2.6 } }),
  T("motion/stagger-diagonal", { uses: ["drive", "rand", "spring"], fn: STAG, options: { from: "diagonal", each: "s per step of row + column (0.05; 0.03 in the recipe)", ...SO, spread: "", rowEach: "", seed: "" }, defaults: { from: "diagonal", each: 0.05, cols: 8, k: 260, c: 20, outAt: 2, spread: 0, rowEach: 0, seed: 1 },
    demo: { css: GCSS("sd"), html: GRID("sd"), run: `MW.motionStaggerDiagonal(q(".sd"), tl, 0.3, {});`, duration: 2.6 } }),

  T("motion/cadence-twos", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.period * 2 * o.loops, function (t) { var q = Math.floor(t * o.fps + 1e-6) / o.fps, u = (q % (2 * o.period)) / o.period, p = u <= 1 ? u : 2 - u; gsap.set(el, { x: o.distance * p }); });
    },
    options: { fps: "drawings a second: 24 ones, 12 twos, 8 threes (12)", distance: "px (1150)", period: "s each way, linear (1)", loops: "(1)" }, defaults: { fps: 12, distance: 1150, period: 1, loops: 1 },
    notes: "The motion keeps its own ease; only its progress is held on the drawing rate.",
    demo: { css: `${BG}\n.cd { position: absolute; inset: 0; } .cd i { position: absolute; left: 330px; width: 110px; height: 110px; margin-top: -55px; border-radius: 50%; background: #8b7bff; } .cd b { position: absolute; left: 120px; font-size: 36px; font-weight: 800; color: #8f9ab3; margin-top: -22px; }`,
      html: `<div class="cd"><b style="top:300px">24 hình</b><i class="c1" style="top:300px"></i><b style="top:540px">12 hình</b><i class="c2" style="top:540px"></i><b style="top:780px">8 hình</b><i class="c3" style="top:780px"></i></div>`,
      run: `MW.motionCadenceTwos(q(".c1"), tl, 0, { fps: 24 }); MW.motionCadenceTwos(q(".c2"), tl, 0, { fps: 12 }); MW.motionCadenceTwos(q(".c3"), tl, 0, { fps: 8 });`, duration: 2 },
  }),

  T("motion/snap-hold", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), p2 = gsap.parseEase("power2.out");
      return MW.drive(tl, at, (it.length - 1) * o.each + o.snap + o.settle + o.hold, function (t) { it.forEach(function (x, i) { var u = t - i * o.each, s = u < 0 ? 0 : u < o.snap ? o.pop : o.pop + (1 - o.pop) * p2(Math.min(1, (u - o.snap) / o.settle)); gsap.set(x, { scale: s }); }); });
    },
    options: { items: "", each: "s apart (0.45)", pop: "scale it appears at, with no in-between frames (1.25)", snap: "s held at the pop (0.06)", settle: "s (0.2, power2.out)", hold: "s held after (0.6)" },
    defaults: { items: "i", each: 0.45, pop: 1.25, snap: 0.06, settle: 0.2, hold: 0.6 },
    notes: "The change itself takes 1–2 frames; only the settle is eased, then it holds still.",
    demo: { css: `${BG}\n${ST} .sh { display: flex; gap: 90px; } .sh i { display: block; width: 220px; height: 220px; transform: scale(0); color: #ffd23d; }`,
      html: `<div class="st"><div class="sh">${'<i><svg viewBox="-12 -12 24 24" width="100%" height="100%"><path d="M0 -11 L3.2 -3.8 L11 -3.4 L5 1.8 L6.8 9.6 L0 5.4 L-6.8 9.6 L-5 1.8 L-11 -3.4 L-3.2 -3.8 Z" fill="currentColor"/></svg></i>'.repeat(4)}</div></div>`,
      run: `MW.motionSnapHold(q(".sh"), tl, 0.3, {});`, duration: 2.6 },
  }),

  T("motion/beat-grid", {
    uses: U,
    fn: mk(`var beat = 60 / o.bpm, bar = beat * o.beats;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var b = Math.floor(t / beat), ph = (t % beat) / beat, k = b % o.beats, down = k === 0;
  if (down) { c.fillStyle = "rgba(139,123,255," + (o.flash * Math.exp(-8 * ph)).toFixed(3) + ")"; c.fillRect(0, 0, 320, 200); }
  for (var i = 0; i < o.beats; i++) { var on = i === k, r = 9 + (on ? 6 * Math.exp(-6 * ph) : 0); c.fillStyle = on ? (i === 0 ? A : "#e8ebf3") : "#2a3142"; c.beginPath(); c.arc(100 + i * 40, 90, r, 0, 2 * Math.PI); c.fill(); }
  var pb = (t % bar) / bar; for (var s = 0; s < 16; s++) { c.fillStyle = s % 4 === 0 ? "#6c778b" : "#3a4466"; c.fillRect(70 + s * 11.6, 140, 2, s % 4 === 0 ? 10 : 6); } c.fillStyle = "#ffd23d"; c.fillRect(70 + 186 * pb, 134, 2, 22);
  MW.txt(c, o.bpm + " BPM", 160, 40, 10, "#c9d2ea", 800);
});`),
    options: { bpm: "(120)", beats: "per bar (4)", flash: "downbeat flash (0.25)", loop: "s (4: two bars)" }, defaults: { bpm: 120, beats: 4, flash: 0.25, loop: 4 },
    notes: "Frames per beat = 60 / BPM × fps (15 at 30 fps): put changes on beats and big events on downbeats.",
    demo: CV("motionBeatGrid", 4),
  }),

  T("motion/speed-ramp", {
    uses: U,
    fn: mk(`var R = function (t) { var a = o.slowAt, b = a + o.window, c2 = b + o.impact; if (t < a) return 1; if (t < b) return 1 - (1 - o.slow) * (t - a) / o.window; if (t < c2) return o.slow; return o.after; };
var X = function (t) { var x = 0, dt = 1 / 240; for (var s = 0; s < t; s += dt) x += R(s) * o.speed * dt; return x; }, hitT = o.slowAt + o.window + o.impact, xw = 30 + X(hitT);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); c.fillStyle = "#3a4466"; c.fillRect(xw + 8, 60, 6, 80); var pos = function (s) { return s <= hitT ? 30 + X(s) : xw - (X(s) - X(hitT)); };
  for (var k = 6; k >= 1; k--) { var s = Math.max(0, t - k * 0.04); c.globalAlpha = 0.12 * (7 - k) / 6; c.fillStyle = A; c.beginPath(); c.arc(pos(s), 100, 8, 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1; c.fillStyle = A; c.beginPath(); c.arc(pos(t), 100, 8, 0, 2 * Math.PI); c.fill();
  if (t >= hitT && t < hitT + 0.15) { c.strokeStyle = "#ffd23d"; c.lineWidth = 2; for (var i = 0; i < 5; i++) { var a = Math.PI + (i - 2) * 0.4; c.beginPath(); c.moveTo(xw + 4 + 10 * Math.cos(a), 100 + 10 * Math.sin(a)); c.lineTo(xw + 4 + 20 * Math.cos(a), 100 + 20 * Math.sin(a)); c.stroke(); } }
  MW.txt(c, Math.round(R(t) * 100) + "%", 160, 160, 10, R(t) < 1 ? "#ffd23d" : "#c9d2ea", 900);
});`),
    options: { speed: "units a second at 100 % (130)", slowAt: "s the ramp starts (0.8)", window: "s of the ramp (0.5)", slow: "rate at the hit (0.25)", impact: "s held slow (0.05)", after: "rate after the hit (1.3)", loop: "s (2.6)" },
    defaults: { speed: 130, slowAt: 0.8, window: 0.5, slow: 0.25, impact: 0.05, after: 1.3, loop: 2.6 },
    notes: "The dot integrates the rate, so a ramp is a time remap: slow into the hit, land it on the downbeat, then fast out.",
    demo: CV("motionSpeedRamp", 2.6),
  }),

  T("motion/overlap-levels", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); o.levels.forEach(function (ov, r) { var y = 56 + r * 44; MW.txt(c, Math.round(ov * 100) + "%", 48, y, 9, "#c9d2ea", 800); for (var i = 0; i < 4; i++) { var st = o.start + i * o.each * (1 - ov), s = p2o(T(t, st, st + o.each)) * (1 - T(t, o.outAt, o.outAt + 0.2)); if (s <= 0) continue; c.save(); c.translate(100 + i * 50, y); c.scale(s, s); MW.rr(c, -14, -14, 28, 28, 6); c.fillStyle = A; c.fill(); c.restore(); } MW.txt(c, ["ngăn nắp", "gọn gàng", "trôi chảy"][r], 300, y, 8, "#6c778b", 700, "right"); });
});`),
    options: { levels: "overlaps per row ([0, 0.25, 0.5])", each: "s per square (0.35, power2.out)", start: "s (0.3)", outAt: "s (2.1)", loop: "s (2.6)" }, defaults: { levels: [0, 0.25, 0.5], each: 0.35, start: 0.3, outAt: 2.1, loop: 2.6 },
    notes: "Kit rule: the next starts when the previous is 30–50 % done.",
    demo: CV("motionOverlapLevels", 2.6),
  }),

  T("motion/reading-hold", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var k = Math.min(o.words.length - 1, Math.floor(t / o.slot)), u = (t - k * o.slot) / o.slot, w = o.words[k], a = Math.min(1, u * o.slot / 0.133, (o.slot - u * o.slot) / 0.133);
  c.globalAlpha = Math.max(0, a); MW.txt(c, w, 160, 92, 30, "#e8ebf3", 900); c.globalAlpha = 1; var need = Math.max(o.min, 0.25 + Array.from(w).length / o.cps) + o.perWord;
  MW.rr(c, 80, 140, 160, 6, 3); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 80, 140, 160 * u, 6, 3); c.fillStyle = u > 0.75 ? A : "#6c778b"; c.fill(); MW.txt(c, "cần giữ ≥ " + need.toFixed(2) + " s", 160, 160, 8, "#8f9ab3", 700);
});`),
    options: { words: "", slot: "s per word (1.33)", min: "s (0.7)", cps: "characters a second (17)", perWord: "s added per word (0.25)", loop: "s (4)" }, defaults: { words: ["Ngắn", "Gọn", "Rõ ràng"], slot: 1.33, min: 0.7, cps: 17, perWord: 0.25, loop: 4 },
    notes: "Hold text at least max(0.7 s, 0.25 s + characters / 17), plus 0.25 s a word; even short phrases over 1 s.",
    demo: CV("motionReadingHold", 4),
  }),

  T("motion/energy-arc", {
    uses: U,
    fn: mk(`var E = function (u) { if (u < 0.25) return 0.18 + 0.04 * Math.sin(u * 20); if (u < 0.6) return 0.2 + 0.5 * p2io((u - 0.25) / 0.35); if (u < 0.75) return 0.7 + 0.25 * Math.sin(Math.PI * (u - 0.6) / 0.15 / 2 + 0) ; return 0.95 - 0.8 * p2io((u - 0.75) / 0.25); }, x0 = 40, w = 240, y0 = 170, h = 120;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var u = (t % o.loop) / o.loop; c.strokeStyle = "#3a4466"; c.lineWidth = 2; c.beginPath(); for (var i = 0; i <= 100; i++) { var v = i / 100; if (!i) c.moveTo(x0 + w * v, y0 - h * E(v)); else c.lineTo(x0 + w * v, y0 - h * E(v)); } c.stroke();
  [0.25, 0.6, 0.75].forEach(function (m) { c.fillStyle = "#262c3a"; c.fillRect(x0 + w * m, 40, 1, 132); }); ["Mở", "Dồn", "Đỉnh", "Lắng"].forEach(function (l, i) { MW.txt(c, l, x0 + w * [0.12, 0.42, 0.67, 0.87][i], 184, 7, "#6c778b", 700); });
  var e = E(u), px = x0 + w * u, py = y0 - h * e; c.fillStyle = A; c.beginPath(); c.arc(px, py, 4, 0, 2 * Math.PI); c.fill();
  var r = MW.rand(o.seed + Math.floor(t * 24)), sh = e > 0.8 ? 2 : 0, s = 0.6 + 0.5 * e; c.save(); c.translate(270 + (r() * 2 - 1) * sh, 48 + (r() * 2 - 1) * sh); c.scale(s, s); c.beginPath(); for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? 6 : 14; c.lineTo(q * Math.cos(a), q * Math.sin(a)); } c.closePath(); c.fillStyle = "#ffd23d"; c.fill(); c.restore();
});`),
    options: { seed: "shake (3)", loop: "s (4)" }, defaults: { seed: 3, loop: 4 },
    notes: "Plan one intensity shape for the whole film: establish (0–25 %), build (25–60 %), climax (60–75 %), resolve.",
    demo: CV("motionEnergyArc", 4),
  }),
];
