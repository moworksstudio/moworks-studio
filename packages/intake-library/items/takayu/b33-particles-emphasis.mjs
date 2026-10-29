// TakayuStudio, Particles and Emphasis (batch 3.3): seeded particle layers (confetti, embers, snow, fireworks, swarms, flow fields) and
// ways to stress one word (punch, marker, underline, scribble, strike, wiggle), written here from the site's ideas and numbers (no code of
// the site). Particles draw on a canvas in the reference's 320 x 200 units; every particle is a function of time and its seed.
import { T } from "../../takayu/define.mjs";
import { headline, demo, CURSOR } from "../../takayu/stages.mjs";
import { PRODUCT, LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}", html = "", css = "") => ({ css: `${BG}\n${css}`, html: `<div class="gm">${html}</div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const P = ["drive", "rand", "stage320"];

export default [
  T("effect/takayu-confetti-burst", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), cols = o.colors, pc = [];
      for (var i = 0; i < o.count; i++) pc.push({ vx: (r() * 2 - 1) * 80, vy: -140 - 120 * r(), sp: 4 + 6 * r(), ph: r() * 6.28, col: cols[i % cols.length] });
      return MW.drive(tl, at, o.duration, function (t) {
        S.clear(); var fade = t > o.duration - 0.4 ? (o.duration - t) / 0.4 : 1;
        pc.forEach(function (p) { var x = o.x + p.vx * t + 8 * Math.sin(6 * t + p.ph), y = o.y + p.vy * t + 0.5 * o.gravity * t * t, a = p.sp * t + p.ph;
          c.save(); c.translate(x, y); c.rotate(a * 0.5); c.scale(Math.cos(a), 1); c.globalAlpha = Math.max(0, fade); c.fillStyle = p.col; c.fillRect(-4, -2.5, 8, 5); c.restore(); });
      });
    },
    options: { count: "(40)", gravity: "units/s² (320)", x: "launch point, of 320 (160)", y: "of 200 (196)", duration: "s (2)", colors: "the 4 colours", seed: "pieces" },
    defaults: { count: 40, gravity: 320, x: 160, y: 196, duration: 2, colors: ["#8b7bff", "#3dd6f5", "#ffd23d", "#ff5d8f"], seed: 4 },
    demo: CV("effectTakayuConfettiBurst", 2.6, "{}", `<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:150px;font-weight:900">Chúc mừng!</div>`),
  }),

  T("shape/twinkle-sparkles", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), sp = [];
      for (var i = 0; i < o.count; i++) sp.push({ x: 60 + 200 * r(), y: 30 + 140 * r(), ph: r(), big: r(), col: i % 3 === 2 ? "#a99bff" : "#ffd23d" });
      var star = function (x, y, R, a) { c.beginPath(); for (var k = 0; k < 8; k++) { var rr = k % 2 ? R * 0.28 : R, aa = a + k * Math.PI / 4; c.lineTo(x + rr * Math.cos(aa), y + rr * Math.sin(aa)); } c.closePath(); c.fill(); };
      return MW.drive(tl, at, o.duration, function (t) {
        S.clear(); sp.forEach(function (s) { var u = ((t / o.period + s.ph) % 1) / 0.35; if (u > 1) return; c.fillStyle = s.col; c.globalAlpha = Math.sin(Math.PI * u); star(s.x, s.y, (4 + 10 * s.big) * Math.sin(Math.PI * u) / 2 + 1, 0.5 * t); }); c.globalAlpha = 1;
      });
    },
    options: { count: "(12)", period: "s each sparkle repeats (1.5); it glows in the first 35 %", duration: "s (4.5)", seed: "spots and phases" }, defaults: { count: 12, period: 1.5, duration: 4.5, seed: 9 },
    assets: [{ path: "product.svg", data: PRODUCT }],
    demo: CV("shapeTwinkleSparkles", 4.5, "{}", `<div style="position:absolute;left:50%;top:50%;width:620px;height:620px;margin:-310px;border-radius:60px;background:url(assets/product.svg) center / cover"></div>`),
  }),

  T("background/embers", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), E = [];
      for (var i = 0; i < o.count; i++) E.push({ x: 64 + 192 * r(), ph: r(), i: i });
      return MW.drive(tl, at, o.life * o.loops, function (t) {
        S.clear(); E.forEach(function (e) { var p = ((t / o.life + e.ph) % 1), y = 200 - 200 * p, x = e.x + 10 * Math.sin(9 * p + e.i), R = 4.5 - 4 * p;
          c.globalAlpha = 1 - p; c.fillStyle = p < 0.4 ? "#ffd23d" : "#ff5d3c"; c.shadowColor = c.fillStyle; c.shadowBlur = 6 * S.k; c.beginPath(); c.arc(x, y, R, 0, 2 * Math.PI); c.fill(); }); c.shadowBlur = 0; c.globalAlpha = 1;
      });
    },
    options: { count: "(36)", life: "s each ember lives (3), a seamless loop", loops: "(1)", seed: "spots and phases" }, defaults: { count: 36, life: 3, loops: 1, seed: 5 },
    demo: CV("backgroundEmbers", 3, "{}", "", "#demo { background: radial-gradient(80% 60% at 50% 100%, #3a1a10, #0b0a10); }"),
  }),

  T("background/snow-layers", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), F = [];
      // whole frame heights per loop, so the fall wraps seamlessly
      for (var i = 0; i < o.count; i++) { var d = 0.4 + 0.6 * r(), turns = Math.max(1, Math.round(55 * d * o.loop / 220)); F.push({ x: r() * 320, y0: r() * 220, d: d, v: turns * 220 / o.loop, i: i }); }
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); F.forEach(function (f) { var y = (f.y0 + f.v * t) % 220 - 10, x = f.x + 10 * f.d * Math.sin(1.5 * t + f.i); c.fillStyle = f.d > 0.8 ? "#a99bff" : "#c9d2ea"; c.globalAlpha = 0.5 + 0.5 * f.d; c.beginPath(); c.arc(x, y, 1 + 3 * f.d, 0, 2 * Math.PI); c.fill(); }); c.globalAlpha = 1;
      });
    },
    options: { count: "(50)", loop: "s (4), seamless", seed: "flakes" }, defaults: { count: 50, loop: 4, seed: 7 },
    demo: CV("backgroundSnowLayers", 4, "{}", "", "#demo { background: linear-gradient(180deg, #141a33, #2a2f4a); }"),
  }),

  T("effect/fireworks", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, p1 = gsap.parseEase("power1.out"), top = [o.x, o.y - o.rise];
      var pos = function (i, d) { var a = i / o.count * 2 * Math.PI, R = o.radius * (1 - Math.exp(-2.5 * d)); return [top[0] + R * Math.cos(a), top[1] + R * Math.sin(a) + 20 * d * d]; };
      return MW.drive(tl, at, 0.7 + 2.2, function (t) {
        S.clear();
        if (t < 0.7) { var u = p1(Math.max(0, (t - 0.1) / 0.6)); c.fillStyle = "#ffe2a8"; c.beginPath(); c.arc(o.x, o.y - o.rise * u, 2.5, 0, 2 * Math.PI); c.fill(); return; }
        var d = t - 0.7, fade = d < 1 ? 1 : Math.max(0, 1 - (d - 1));
        for (var i = 0; i < o.count; i++) for (var k = 5; k >= 0; k--) { var dd = d - 0.04 * k; if (dd < 0) continue; var q = pos(i, dd); c.globalAlpha = fade * (1 - k / 5.5); c.fillStyle = i % 2 ? o.colors[1] : o.colors[0]; c.beginPath(); c.arc(q[0], q[1], 2.2 * (1 - k / 7), 0, 2 * Math.PI); c.fill(); }
        c.globalAlpha = 1;
      });
    },
    options: { count: "particles (24)", radius: "units (70)", rise: "units the rocket climbs (120)", x: "(160)", y: "(190)", colors: "two colours" }, defaults: { count: 24, radius: 70, rise: 120, x: 160, y: 190, colors: ["#ffd23d", "#ff5d8f"] },
    demo: CV("effectFireworks", 3, "{}", "", "#demo { background: linear-gradient(180deg, #05060f, #161a33); }"),
  }),

  T("background/swarm", {
    kind: "block", uses: P.concat(["noise"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), D = [], nz = MW.noise(o.seed + 1);
      for (var i = 0; i < o.count; i++) D.push({ w: 0.6 + 0.8 * r(), i: i, n: r() * 100 });
      return MW.drive(tl, at, o.duration, function (t) {
        S.clear(); var cx = 160 + 50 * Math.sin(2 * Math.PI * t / 6), cy = 100 + 20 * Math.sin(2 * Math.PI * t / 3);
        D.forEach(function (d) { var a = t * d.w + d.i, R = 20 + 50 * (nz(d.n + t * 0.4) + 1) / 2; c.fillStyle = d.i % 5 === 0 ? "#a99bff" : "#e8ebf3"; c.globalAlpha = 0.85; c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(1.3 * a) * 0.6 * R, 2.5, 0, 2 * Math.PI); c.fill(); }); c.globalAlpha = 1;
      });
    },
    options: { count: "(40)", duration: "s (6)", seed: "speeds and radii" }, defaults: { count: 40, duration: 6, seed: 3 },
    demo: CV("backgroundSwarm", 6),
  }),

  T("background/flow-field-lines", {
    kind: "block", uses: P,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), L = [];
      for (var i = 0; i < o.count; i++) L.push([r() * 320, r() * 200]);
      // smooth 2-D value noise (seeded lattice, smoothstep between)
      var hsh = function (x, y) { var h = Math.imul(x * 374761393 + y * 668265263 + o.seed * 1013, 1274126177); h = (h ^ (h >>> 13)) >>> 0; return (h % 10000) / 10000; };
      var n2 = function (x, y) { var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = hsh(xi, yi), b = hsh(xi + 1, yi), cc = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1); return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + d) * sx * sy; };
      return MW.drive(tl, at, o.duration, function (t) {
        S.clear(); c.lineWidth = 1.4; c.lineCap = "round";
        L.forEach(function (s, i) { var x = s[0], y = s[1]; c.strokeStyle = i % 7 === 0 ? "#a99bff" : "rgba(201,210,234,0.6)"; c.beginPath(); c.moveTo(x, y); for (var k = 0; k < 14; k++) { var a = n2(x * 0.012, y * 0.012 + t * 0.15) * 2 * Math.PI * 1.5; x += 4 * Math.cos(a); y += 4 * Math.sin(a); c.lineTo(x, y); } c.stroke(); });
      });
    },
    options: { count: "streamlines (70)", duration: "s (5)", seed: "start points and field" }, defaults: { count: 70, duration: 5, seed: 11 },
    demo: CV("backgroundFlowFieldLines", 5),
  }),

  T("effect/particles-coalesce", {
    kind: "block", uses: P.concat(["spring"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), sp = MW.spring(o.k, o.c), pin = gsap.parseEase("power2.in"), pts = [];
      for (var i = 0; i < o.count; i++) { var a = i / o.count * 2 * Math.PI, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push({ tx: 160 + hx * 3.6, ty: 98 + hy * 3.6, sx: r() * 320, sy: r() * 200, t0: 0.3 * r() }); }
      return MW.drive(tl, at, o.exitAt + 0.5, function (t) {
        S.clear(); var ex = pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.5)));
        pts.forEach(function (p) { var v = t < p.t0 ? 0 : sp.at(t - p.t0), q = v * (1 - ex); c.fillStyle = "#a99bff"; c.beginPath(); c.arc(p.sx + (p.tx - p.sx) * q, p.sy + (p.ty - p.sy) * q, 3, 0, 2 * Math.PI); c.fill(); });
      });
    },
    options: { count: "(60)", k: "spring stiffness (60)", c: "damping (10)", exitAt: "s they scatter back (2.6)", seed: "start spots" }, defaults: { count: 60, k: 60, c: 10, exitAt: 2.6, seed: 2 },
    notes: "The target here is a heart outline; in a film, sample the client logo's outline into points.",
    demo: CV("effectParticlesCoalesce", 3.3),
  }),

  T("text/focus-word-burst", {
    kind: "block",
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var main = el.querySelector(o.main), sats = Array.prototype.slice.call(el.querySelectorAll(o.satellites)), bk = MW.ez("cubic-bezier(.34,1.56,.64,1)"), ex = gsap.parseEase("expo.out"), io = MW.ez("in-out");
      var pos = sats.map(function (s, i) { var a = (i / sats.length * 360 + 11.5) * Math.PI / 180, rx = (i % 2 ? 88 : 74) * o.unit, ry = (i % 2 ? 52 : 44) * o.unit; return [rx * Math.cos(a), ry * Math.sin(a)]; });
      return MW.drive(tl, at, o.loop, function (t) {
        var back = io(Math.max(0, Math.min(1, (t - o.returnAt) / 0.6))), m = bk(Math.max(0, Math.min(1, (t - o.at) / 0.55))) * (1 - back);
        gsap.set(main, { xPercent: -50, yPercent: -50, scale: 1 + (o.scale - 1) * m });
        sats.forEach(function (s, i) { var st = o.at + [0, 0.03, 0.06][i % 3], u = ex(Math.max(0, Math.min(1, (t - st) / (1.3 - (st - o.at))))) * (1 - back), f = 1 + (o.spread - 1) * u; gsap.set(s, { xPercent: -50, yPercent: -50, x: pos[i][0] * f, y: pos[i][1] * f }); s.style.opacity = String(1 - u); });
      });
    },
    options: { scale: "the main word's scale (2.4)", spread: "the satellites fly to × their distance (2.4)", at: "s (0.7)", returnAt: "s (3.3)", unit: "px per reference unit (5)", main: "the main word", satellites: "the 8 small words", loop: "s (4.2)" },
    defaults: { scale: 2.4, spread: 2.4, at: 0.7, returnAt: 3.3, unit: 5, main: ".fb-m", satellites: ".fb-s", loop: 4.2 },
    demo: { css: `${BG}\n.fb { position: absolute; left: 50%; top: 50%; } .fb > div { position: absolute; left: 0; top: 0; white-space: nowrap; } .fb-m { font-size: 100px; font-weight: 900; color: #a99bff; } .fb-s { font-size: 46px; font-weight: 600; color: #9aa3b8; font-family: ui-monospace, Menlo, Consolas, monospace; }`,
      html: `<div class="fb"><div class="fb-m">SÁNG TẠO</div>${["ý tưởng", "màu sắc", "nhịp điệu", "âm thanh", "khung hình", "câu chữ", "ánh sáng", "chuyển động"].map((w) => `<div class="fb-s">${w}</div>`).join("")}</div>`,
      run: `MW.textFocusWordBurst(q(".fb"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/emphasis-slam", {
    uses: ["drive", "spring", "rand"],
    fn: function (el, tl, at, o) {
      var sp = MW.spring(o.k, o.c, o.m), land = 0; for (var s = 0; s < 2; s += 1 / 240) if (sp.at(s) >= 1) { land = s; break; }
      var host = o.stage ? MW.el(o.stage) : el.parentNode;
      return MW.drive(tl, at, o.duration, function (t) {
        var v = sp.at(t), sc = o.from + (1 - o.from) * v, d = t - land, sq = d >= 0 && d < 0.15 ? 1 : 0, f = Math.floor(d * 24), r = MW.rand(o.seed + f);
        gsap.set(el, { scale: sc, scaleX: sc * (sq ? 1.22 : 1), scaleY: sc * (sq ? 0.82 : 1), transformOrigin: "50% 100%" }); el.style.opacity = String(Math.min(1, t / 0.05));
        gsap.set(host, { x: d >= 0 && f < o.shakeFrames ? (r() * 2 - 1) * o.shake : 0 });
      });
    },
    options: { from: "start scale (3)", k: "spring stiffness (80)", c: "damping (16)", m: "mass (1.6): a heavy spring", shake: "px (16)", shakeFrames: "frames at 24 fps (3)", duration: "s (1.6)", stage: "what shakes", seed: "shake" },
    defaults: { from: 3, k: 80, c: 16, m: 1.6, shake: 16, shakeFrames: 3, duration: 1.6, stage: null, seed: 5 },
    demo: H("BÙM", `MW.textEmphasisSlam(q(".tk-head"), tl, 0.3, {});`, 2.4, { size: 260, weight: 900 }),
  }),

  T("text/elastic-stretch", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, mid = null;
      ch.forEach(function (c) { c.style.transformOrigin = "50% 92%"; });
      return MW.drive(tl, at, o.duration + 0.2, function (t) {
        if (mid == null) mid = ch.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
        var cx = (mid[0] + mid[n - 1]) / 2, d = t, v = d > 0 && d < o.duration ? Math.sin(Math.PI * d / o.duration) * (1 + 0.3 * Math.sin(9 * d) * Math.exp(-d)) : 0;
        ch.forEach(function (c, i) { gsap.set(c, { x: (mid[i] - cx) * o.spread * v, scaleX: 1 - o.thin * v, scaleY: 1 + o.tall * v }); });
      });
    },
    options: { duration: "s of the stretch and spring back (1.4)", spread: "letter spread at the peak (0.5)", thin: "glyph scaleX loss (0.35)", tall: "scaleY gain (0.25)" }, defaults: { duration: 1.4, spread: 0.5, thin: 0.35, tall: 0.25 },
    demo: H("CO GIÃN", `MW.textElasticStretch(q(".tk-head"), tl, 0.3, {});`, 2.4, { size: 200, weight: 900 }),
  }),

  T("text/bump-wave", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, io = MW.ez("in-out"), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.accent), fs = parseFloat(getComputedStyle(el).fontSize), base = null;
      ch.forEach(function (c) { c.style.transformOrigin = "50% 92%"; });
      return MW.drive(tl, at, o.sweep + 0.6, function (t) {
        if (!base) base = ch.map(function (c) { return [c.offsetLeft, c.offsetWidth]; });
        var L0 = base[0][0], L1 = base[n - 1][0] + base[n - 1][1], W = L1 - L0, X = -0.35 + 1.7 * Math.max(0, Math.min(1, t / o.sweep)), push = 0, B = [], tot = 0;
        ch.forEach(function (c, i) { var cx = (base[i][0] + base[i][1] / 2 - L0) / W, b = io(Math.max(0, 1 - Math.abs(cx - X) / o.width)); B.push(b); tot += 0.8 * b * base[i][1]; });
        ch.forEach(function (c, i) { var b = B[i], own = 0.8 * b * base[i][1]; gsap.set(c, { x: push + own / 2 - tot / 2, y: -0.12 * fs * b, scale: 1 + b * (o.scale - 1) }); c.style.color = mix(b); push += own; });
      });
    },
    options: { sweep: "s the bump crosses the line (1.9)", width: "half-width, share of the line (0.25)", scale: "peak (2)", accent: "colour at the peak" }, defaults: { sweep: 1.9, width: 0.25, scale: 2, accent: "#a99bff" },
    demo: H("Sóng phồng chạy qua", `MW.textBumpWave(q(".tk-head"), tl, 0.3, {});`, 2.8, { size: 130, weight: 900 }),
  }),

  T("text/jelly-letters", {
    uses: ["split", "keys"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 0.5 / Math.max(1, n - 1)), d = o.duration, col = getComputedStyle(el).color;
      var K = [[0, 1, 1], [0.3, 1.25, 0.75], [0.4, 0.75, 1.25], [0.5, 1.15, 0.85], [0.65, 0.95, 1.05], [0.75, 1.05, 0.95], [1, 1, 1]];
      ch.forEach(function (c, i) {
        c.style.transformOrigin = "50% 92%";
        MW.keys(tl, c, at + i * st, { scaleX: K.map(function (k) { return [k[0] * d, k[1]]; }), scaleY: K.map(function (k) { return [k[0] * d, k[2]]; }) });
        tl.set(c, { color: o.accent }, at + i * st + 0.3 * d); tl.set(c, { color: col }, at + i * st + 0.5 * d);
      });
      return at + d + (n - 1) * st;
    },
    options: { duration: "s per letter (0.9)", stagger: "s (0.06, ≤ 0.5 s)", accent: "flash colour while squashed" }, defaults: { duration: 0.9, stagger: 0.06, accent: "#a99bff" },
    demo: { ...H("Thạch rung rinh", `MW.textJellyLetters(q(".tk-head"), tl, 0.4, {}); var c = q(".ui-cursor"); tl.fromTo(c, { x: 1500, y: 900 }, { x: 980, y: 580, duration: 0.36, ease: "power2.out", immediateRender: true }, 0.02); tl.to(c, { x: 1500, y: 900, duration: 0.45, ease: "power2.in" }, 2.15);`, 2.8, { size: 170, weight: 900 }, ".ui-cursor { position: absolute; left: 0; top: 0; z-index: 30; }"), html: headline("Thạch rung rinh", { size: 170, weight: 900 }).html + CURSOR },
  }),

  T("text/keyword-punch", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, key = ws.filter(function (w) { return w.textContent.toLowerCase() === o.word.toLowerCase(); })[0] || ws[ws.length - 1], others = ws.filter(function (w) { return w !== key; }), p2o = gsap.parseEase("power2.out"), p2io = gsap.parseEase("power2.inOut"), col = getComputedStyle(el).color;
      el.style.position = "relative"; var ticks = []; for (var i = 0; i < 8; i++) { var d = document.createElement("span"); d.style.cssText = "position:absolute;width:" + o.tick[0] + "px;height:" + o.tick[1] + "px;border-radius:2px;background:" + o.accent + ";pointer-events:none;opacity:0;"; el.appendChild(d); ticks.push(d); }
      return MW.drive(tl, at, o.restAt + 0.3, function (t) {
        var rest = Math.max(0, Math.min(1, (t - o.restAt) / 0.3)), s = (t < 0.12 ? 1 + 0.3 * p2o(Math.max(0, t) / 0.12) : t < 0.24 ? 1.3 - 0.2 * p2io((t - 0.12) / 0.12) : 1.1), sc = 1 + (s - 1) * (1 - rest), grow = (sc - 1) * key.offsetWidth / 2;
        gsap.set(key, { scale: sc }); key.style.color = t > 0 && rest < 1 ? gsap.utils.interpolate(col, o.accent, Math.min(1, t / 0.08) * (1 - rest)) : col;
        var kx = key.offsetLeft + key.offsetWidth / 2; others.forEach(function (w) { var right = w.offsetLeft > key.offsetLeft, same = Math.abs(w.offsetTop - key.offsetTop) < 4; gsap.set(w, { x: same ? (right ? grow : -grow) : 0 }); w.style.opacity = String(1 - (1 - o.dim) * (t > 0 ? 1 - rest : 0)); });
        var u = Math.max(0, Math.min(1, t / 0.38)), e = p2o(u), R = key.offsetWidth * sc / 2 + 10 + 48 * e;
        ticks.forEach(function (d, i) { var a = i / 8 * 2 * Math.PI, ky = key.offsetTop + key.offsetHeight / 2; d.style.left = (kx + Math.cos(a) * R * 1.1 - o.tick[0] / 2) + "px"; d.style.top = (ky + Math.sin(a) * R * 0.7 - o.tick[1] / 2) + "px"; d.style.transform = "rotate(" + a + "rad)"; d.style.opacity = t > 0 && u < 1 ? String(1 - u) : "0"; });
      });
    },
    options: { word: "the keyword (matched by its text; default: the last word)", dim: "other words' opacity (0.5)", accent: "colour", tick: "[w, h] px of the ticks ([36, 8])", restAt: "s after the punch it settles back (1.8)" },
    defaults: { word: "", dim: 0.5, accent: "#ffd23d", tick: [36, 8], restAt: 1.8 },
    demo: H("Chất lượng là trên hết", `MW.textKeywordPunch(q(".tk-head"), tl, 0.5, { word: "hết" });`, 2.8, { size: 130, weight: 900 }),
  }),

  T("text/wiggly-jitter", {
    uses: ["split", "drive", "noise"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, N = ch.map(function (_, i) { return [MW.noise(o.seed + i * 3), MW.noise(o.seed + i * 3 + 1), MW.noise(o.seed + i * 3 + 2)]; }), shared = [MW.noise(o.seed + 900), MW.noise(o.seed + 901), MW.noise(o.seed + 902)];
      var q2o = gsap.parseEase("power1.out"), q2i = gsap.parseEase("power1.in");
      return MW.drive(tl, at, o.duration, function (t) {
        var a = t < 0.3 ? q2o(t / 0.3) : t > o.duration - 0.3 ? 1 - q2i((t - o.duration + 0.3) / 0.3) : 1, k = t * o.rate;
        ch.forEach(function (c, i) { var n = N[i], s = shared, cr = o.correlation, nx = n[0](k) * (1 - cr) + s[0](k) * cr, ny = n[1](k) * (1 - cr) + s[1](k) * cr, nr = n[2](k) * (1 - cr) + s[2](k) * cr; gsap.set(c, { x: a * o.amp * nx, y: a * o.amp * ny, rotation: a * o.turn * nr }); });
      });
    },
    options: { amp: "px (24)", turn: "degrees (5)", rate: "changes a second (8)", correlation: "0: each letter its own, 1: the word shakes as one", duration: "s (2.5)", seed: "noise" },
    defaults: { amp: 24, turn: 5, rate: 8, correlation: 0, duration: 2.5, seed: 4 },
    demo: { css: `${BG}\n.wj { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 100px; } .wj h1 { margin: 0; font-size: 160px; font-weight: 900; text-align: center; } .wj h1.b { color: #8f9ab3; font-size: 90px; }`,
      html: `<div class="wj"><h1 class="a">Hồi hộp quá</h1><h1 class="b">Hồi hộp quá</h1></div>`, run: `MW.textWigglyJitter(q(".wj .a"), tl, 0.3, {}); MW.textWigglyJitter(q(".wj .b"), tl, 0.3, { correlation: 1, amp: 14 });`, duration: 3 },
  }),

  T("text/marker-sweep", {
    uses: ["lines", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, io = MW.ez("in-out"), bands = [], tot = 0;
      L.forEach(function (l) { var s = document.createElement("span"); s.style.display = "inline-block"; while (l.firstChild) s.appendChild(l.firstChild); l.appendChild(s); s.style.position = "relative"; s.style.zIndex = "1";
        var b = document.createElement("span"); b.style.cssText = "position:absolute;left:-0.08em;bottom:0.12em;height:" + o.band + "em;width:0;background:" + o.color + ";z-index:0;border-radius:0.06em;transform:skewX(-8deg);"; s.insertBefore(b, s.firstChild); bands.push({ b: b, s: s }); });
      return MW.drive(tl, at, o.delay + o.duration + 0.1 + (o.fadeAt == null ? 0 : o.fadeAt - o.delay - o.duration + 0.3), function (t) {
        var widths = bands.map(function (x) { return x.s.offsetWidth + 0.16 * parseFloat(getComputedStyle(x.s).fontSize); }), total = widths.reduce(function (a, b) { return a + b; }, 0), len = total * io(Math.max(0, Math.min(1, (t - o.delay) / o.duration))), f = o.fadeAt == null ? 1 : 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.3));
        bands.forEach(function (x, i) { var w = Math.max(0, Math.min(widths[i], len)); len -= widths[i]; x.b.style.width = w + "px"; x.b.style.opacity = String(f); });
      });
    },
    options: { duration: "s (1.2), in-out, all lines as one stroke", delay: "s (0.5)", band: "em the band covers (0.42: the lower 40 %)", color: "marker colour (#ffe46b; the demo an accent at 55 %)", fadeAt: "s the band fades (null: stay)" },
    defaults: { duration: 1.2, delay: 0.5, band: 0.42, color: "rgba(139,123,255,0.55)", fadeAt: null },
    demo: H("Ghi nhớ điều quan trọng nhất<br>bằng một nét bút dạ", `MW.textMarkerSweep(q(".tk-head"), tl, 0, { fadeAt: 2.55 });`, 3, { size: 104, weight: 800 }),
  }),

  T("text/underline-draw", {
    uses: ["lines", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, io = MW.ez("in-out"), lines = [];
      L.forEach(function (l) { var s = document.createElement("span"); s.style.cssText = "display:inline-block;position:relative;"; while (l.firstChild) s.appendChild(l.firstChild); l.appendChild(s);
        var u = document.createElement("span"); u.style.cssText = "position:absolute;left:0;right:0;height:max(2px," + o.thickness + "em);bottom:-" + (o.offset - 0.04) + "em;border-radius:999px;background:" + o.color + ";transform:scaleX(0);"; s.appendChild(u); lines.push(u); });
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.35, function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))), e = o.exitAt == null ? 0 : io(Math.max(0, Math.min(1, (t - o.exitAt) / 0.35)));
        lines.forEach(function (u) { u.style.transformOrigin = e > 0 ? "100% 50%" : "0% 50%"; u.style.transform = "scaleX(" + (e > 0 ? 1 - e : p) + ")"; });
      });
    },
    options: { duration: "s (0.4), in-out", thickness: "em (0.08)", offset: "em below the baseline (0.16)", color: "line colour", exitAt: "s after the start: it shrinks toward its right end in 0.35 s (null: stay)" },
    defaults: { duration: 0.4, thickness: 0.08, offset: 0.16, color: "#a99bff", exitAt: null },
    demo: H("Điều đáng nhớ", `MW.textUnderlineDraw(q(".tk-head"), tl, 0.5, { exitAt: 1.6 });`, 2.8, { size: 150, weight: 800 }),
  }),

  T("text/scribble-circle", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"), path = document.createElementNS(NS, "path"), dot = document.createElementNS(NS, "circle"), r = MW.rand(o.seed), out = gsap.parseEase("power2.out");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; svg.setAttribute("width", host.offsetWidth); svg.setAttribute("height", host.offsetHeight);
      path.setAttribute("fill", "none"); path.setAttribute("stroke", o.color); path.setAttribute("stroke-width", o.stroke); path.setAttribute("stroke-linecap", "round"); dot.setAttribute("r", o.stroke * 1.25); dot.setAttribute("fill", o.color);
      svg.appendChild(path); svg.appendChild(dot); host.appendChild(svg);
      var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2, rx = el.offsetWidth / 2 + o.padX, ry = el.offsetHeight / 2 + o.padY, N = 120, pts = [], tilt = o.tilt * Math.PI / 180, wob = []; for (var j = 0; j < 9; j++) wob.push((r() * 2 - 1) * 0.06);
      for (var i = 0; i <= N; i++) { var u = i / N, th = (-149 * Math.PI / 180) + u * o.turns * 2 * Math.PI, k = Math.floor(u * 7), f = u * 7 - k, w = wob[k] + (wob[k + 1] - wob[k]) * f, s = 1 + w + 0.05 * Math.sin(2 * th + 1) + 0.09 * u, x = rx * s * Math.cos(th), y = ry * s * Math.sin(th); pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]); }
      path.setAttribute("d", "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L")); path.setAttribute("pathLength", "1"); path.style.strokeDasharray = "1 1";
      return MW.drive(tl, at, o.fadeAt == null ? o.duration : o.fadeAt + 0.35, function (t) {
        var p = out(Math.max(0, Math.min(1, t / o.duration))), q = pts[Math.round(p * N)]; path.style.strokeDashoffset = String(1 - p); dot.setAttribute("cx", q[0]); dot.setAttribute("cy", q[1]); dot.setAttribute("opacity", p > 0 && p < 1 ? "1" : "0");
        svg.style.opacity = String(o.fadeAt == null ? 1 : 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.35)));
      });
    },
    options: { duration: "s (0.8), ease-out", turns: "(1.1)", padX: "px (88)", padY: "px (48)", tilt: "degrees (−3.4)", stroke: "px (10)", color: "pen colour", fadeAt: "s (null: stay)", seed: "the wobble" },
    defaults: { duration: 0.8, turns: 1.1, padX: 88, padY: 48, tilt: -3.4, stroke: 10, color: "#ff5d8f", fadeAt: null, seed: 6 },
    demo: H("Khuyến mãi", `MW.textScribbleCircle(q(".tk-head"), tl, 0.4, { fadeAt: 2.1 });`, 3, { size: 150, weight: 900 }),
  }),

  T("text/strike-correct", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var old = el.querySelector(o.old), neu = el.querySelector(o["new"]), io = MW.ez("in-out"), bk = gsap.parseEase("back.out(2)"), line = document.createElement("span"), mark = document.createElement("span");
      old.style.position = "relative"; line.style.cssText = "position:absolute;left:-0.06em;right:-0.06em;top:52%;height:0.07em;background:" + o.color + ";transform-origin:0 50%;transform:scaleX(0);"; old.appendChild(line);
      mark.textContent = "^"; mark.style.cssText = "position:absolute;left:50%;bottom:-0.1em;transform:translateX(-50%);color:" + o.color + ";font-size:0.6em;"; old.appendChild(mark);
      return MW.drive(tl, at, o.resetAt + 0.3, function (t) {
        var rs = 1 - Math.max(0, Math.min(1, (t - o.resetAt) / 0.3)), s = io(Math.max(0, Math.min(1, t / 0.3))), dim = Math.max(0, Math.min(1, (t - 0.3) / 0.2)), p = Math.max(0, Math.min(1, (t - 0.5) / 0.5));
        line.style.transform = "scaleX(" + s * rs + ")"; old.style.opacity = String(1 - (1 - o.dim) * dim * rs);
        gsap.set(neu, { scale: (0.6 + 0.4 * bk(p)), rotation: -2 }); neu.style.opacity = String(Math.min(1, p / 0.4) * rs); mark.style.opacity = String(Math.min(1, p / 0.4) * rs);
      });
    },
    options: { old: "the wrong word", new: "the correction (shown above it)", dim: "old word's opacity (0.4)", color: "pen colour", resetAt: "s after the start (2.5)" },
    defaults: { old: ".sc-old", new: ".sc-new", dim: 0.4, color: "#ff5d6c", resetAt: 2.5 },
    demo: { css: `${BG}\n.sc { position: absolute; inset: 0; display: grid; place-items: center; } .sc-l { font-size: 120px; font-weight: 800; position: relative; } .sc-old { display: inline-block; } .sc-new { position: absolute; right: 0; top: -0.75em; font-size: 0.8em; color: #ff5d6c; opacity: 0; transform-origin: 50% 100%; }`,
      html: `<div class="sc"><div class="sc-l">Giá chỉ <span class="sc-old">980.000₫</span><span class="sc-new">780.000₫</span></div></div>`, run: `MW.textStrikeCorrect(q(".sc-l"), tl, 0.4, {});`, duration: 3.4 },
  }),

  T("text/attention-bounce", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sh = o.shadow ? MW.el(o.shadow) : null, out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in");
      el.style.transformOrigin = "50% 100%";
      return MW.drive(tl, at, (0.8 + o.rest) * o.cycles, function (tt) {
        var t = tt % (0.8 + o.rest), H = el.offsetHeight, y = 0, sx = 1, sy = 1;
        if (t < 0.06) { var s = Math.sin(Math.PI * t / 0.06); sx = 1 + 0.03 * s; sy = 1 - 0.05 * s; }
        else if (t < 0.3) y = -0.3 * H * out((t - 0.06) / 0.24); else if (t < 0.5) y = -0.3 * H * (1 - inn((t - 0.3) / 0.2));
        else if (t < 0.6) { sx = 1.06; sy = 0.9; } else if (t < 0.76) y = -0.12 * H * out((t - 0.6) / 0.16); else if (t < 0.88) y = -0.12 * H * (1 - inn((t - 0.76) / 0.12)); else if (t < 0.96) { sx = 1.04; sy = 0.94; }
        gsap.set(el, { y: y, scaleX: sx, scaleY: sy }); if (sh) gsap.set(sh, { scaleX: 1 + y / H * 0.8, opacity: 0.5 + y / H });
      });
    },
    options: { rest: "s between bounces (2)", cycles: "(1)", shadow: "the floor shadow" }, defaults: { rest: 2, cycles: 1, shadow: null },
    demo: { css: `${BG}\n.ab { position: absolute; inset: 0; display: grid; place-items: center; } .ab-b { padding: 30px 80px; border-radius: 60px; background: #ff5d6c; font-size: 120px; font-weight: 900; color: #fff; }
.ab-s { position: absolute; left: 50%; top: 640px; width: 360px; height: 40px; margin-left: -180px; border-radius: 50%; background: rgba(0,0,0,0.55); }`,
      html: `<div class="ab"><div class="ab-s"></div><div class="ab-b">MỚI</div></div>`, run: `MW.textAttentionBounce(q(".ab-b"), tl, 0.3, { shadow: ".ab-s" });`, duration: 2.8 },
  }),

  T("text/pointer-box", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, box = document.createElement("div"), cur = o.cursor ? MW.el(o.cursor) : null, io = MW.ez("in-out"), out = gsap.parseEase("power2.out"), fs = parseFloat(getComputedStyle(el).fontSize);
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      box.style.cssText = "position:absolute;pointer-events:none;box-sizing:border-box;border:" + o.border + "px solid " + o.color + ";border-radius:10px;background:rgba(139,123,255,0.1);"; host.insertBefore(box, el);
      return MW.drive(tl, at, o.fadeAt + 0.3, function (t) {
        var x0 = el.offsetLeft - o.padX * fs, y0 = el.offsetTop - o.padY * fs, W = el.offsetWidth + 2 * o.padX * fs, H = el.offsetHeight + 2 * o.padY * fs, p = io(Math.max(0, Math.min(1, (t - 0.4) / o.duration))), f = 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.3));
        box.style.left = x0 + "px"; box.style.top = y0 + "px"; box.style.width = W * p + "px"; box.style.height = H * p + "px"; box.style.opacity = String(p > 0 ? f : 0);
        if (cur) { var c = out(Math.max(0, Math.min(1, t / 0.4))), tx = x0 + W * p, ty = y0 + H * p, sx = host.offsetWidth + 100, sy = host.offsetHeight + 100; cur.style.left = (sx + (tx - sx) * c) + "px"; cur.style.top = (sy + (ty - sy) * c) + "px"; cur.style.opacity = String(f); }
      });
    },
    options: { duration: "s (1), in-out, from the top-left corner", padX: "em (0.3)", padY: "em (0.06)", border: "px (5)", color: "colour", cursor: "the pointer riding the corner", fadeAt: "s (2.3)" },
    defaults: { duration: 1, padX: 0.3, padY: 0.06, border: 5, color: "#8b7bff", cursor: null, fadeAt: 2.3 },
    demo: { css: `${BG}\n.pb { position: absolute; inset: 0; display: grid; place-items: center; } .pb-l { position: relative; font-size: 120px; font-weight: 800; } .pb-w { display: inline-block; position: relative; z-index: 1; } .ui-cursor { position: absolute; z-index: 30; }`,
      html: `<div class="pb"><div class="pb-l">Chỉ cần <span class="pb-w">một cú nhấp</span>${CURSOR}</div></div>`, run: `MW.textPointerBox(q(".pb-w"), tl, 0.05, { cursor: ".ui-cursor" });`, duration: 3.2 },
  }),

  T("text/comic-pop", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var bk = MW.ez("cubic-bezier(.34,1.56,.64,1)"), burst = o.burst ? MW.el(o.burst) : null;
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var p = Math.max(0, Math.min(1, t / o.duration)), b = bk(p), e = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
        gsap.set(el, { scale: (0.8 + 0.2 * b) * (1 - 0.15 * e), rotation: -2 * (1 - b) }); el.style.opacity = String(Math.min(1, p * 4) * (1 - e));
        if (burst) { gsap.set(burst, { rotation: -6 * (1 - b), scale: (0.8 + 0.2 * b) * (1 - 0.15 * e) }); burst.style.opacity = String(Math.min(1, p * 4) * (1 - e)); }
      });
    },
    options: { duration: "s (0.6), back.out", burst: "the star burst behind", exitAt: "s after the start (1.85)" }, defaults: { duration: 0.6, burst: null, exitAt: 1.85 },
    notes: "The look is CSS: weight-900 text, a thick dark outline and hard shadow (a copy behind), a yellow fill with accent halftone dots (background-clip: text).",
    demo: { css: `${BG}\n.cp { position: absolute; inset: 0; display: grid; place-items: center; } .cp-burst { position: absolute; width: 900px; height: 900px; background: #2a3350; clip-path: polygon(${Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * 2 * Math.PI, r = i % 2 ? 40 : 50; return `${50 + r * Math.cos(a)}% ${50 + r * Math.sin(a)}%`; }).join(",")}); opacity: 0; }
.cp-w { position: relative; font-size: 320px; font-weight: 900; line-height: 1; opacity: 0; } .cp-w span { display: block; } .cp-w .sh { position: absolute; left: 14px; top: 16px; color: #111; -webkit-text-stroke: 26px #111; }
.cp-w .ol { position: absolute; left: 0; top: 0; color: transparent; -webkit-text-stroke: 26px #111; } .cp-w .fi { position: relative; color: transparent; background-color: #f2c84b; background-image: radial-gradient(circle, #ff5d8f 0 6px, transparent 7px); background-size: 24px 24px; -webkit-background-clip: text; background-clip: text; padding-top: 0.2em; margin-top: -0.2em; }`,
      html: `<div class="cp"><div class="cp-burst"></div><div class="cp-w"><span class="sh">BÙM!</span><span class="ol">BÙM!</span><span class="fi">BÙM!</span></div></div>`, run: `MW.textComicPop(q(".cp-w"), tl, 0.5, { burst: ".cp-burst" });`, duration: 2.8 },
  }),
];
