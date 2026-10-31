// Effects & Transitions and Web Interaction (batch 3.5): blur, split, glitch, tile, slice, ink and wave reveals on the element itself
// (copies of it clipped into bands or tiles where the effect needs them), and pointer-driven interactions with a scripted cursor on the
// film's clock; written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, headline, demo, ui } from "../../moworks/stages.mjs";
import { LANDSCAPE, ABSTRACT, PRODUCT } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const BOX = (inner, run, duration, css = "") => ({ css: `${BG}\n${ST} .bx { position: relative; width: 1000px; height: 580px; border-radius: 40px; overflow: hidden; background: url(assets/pic.svg) center / cover; box-shadow: 0 50px 120px rgba(0,0,0,0.45); }\n${css}`, html: `<div class="st">${inner}</div>`, run, duration });
// copies of the element laid over its box in its parent (the parent becomes positioned if it was not)
const CL = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var clone = function () { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.boxSizing = "border-box";
  g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; var br = el.getBoundingClientRect(); g.style.width = (br.width + 0.5) + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el.nextSibling); return g; };`;
const mkc = (body) => new Function("el", "tl", "at", "o", CL + "\n" + body);
// a scripted cursor: cursorPlan([[s, x share, y share, hold s, node?, hover?], ...]) once, cursorAt(t) on every frame
const PRE = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, curKeys = null;
var cursorPlan = function (clicks) { if (!cur) return; var base = (cur.offsetParent || host).getBoundingClientRect(), k = [];
  clicks.forEach(function (c, i) { var r = (c[4] || el).getBoundingClientRect(), x = r.left - base.left + r.width * c[1], y = r.top - base.top + r.height * c[2];
    if (!i) k.push([0, x + o.approach[0], y + o.approach[1]]); k.push([Math.max(0.01, c[0] - o.lead), x, y]); k.push([c[0] + (c[3] || 0.12) + (c[5] ? 0 : 0.3), x, y]); });
  var z = k[k.length - 1]; k.push([z[0] + 0.5, z[1] + o.approach[0] * 0.6, z[2] + o.approach[1] * 0.6]); curKeys = { k: k, c: clicks }; };
var cursorAt = function (t) { if (!cur || !curKeys) return; var p = MW.path(curKeys.k, t, "power2.inOut"), dn = 0; curKeys.c.forEach(function (c) { var u = t - c[0]; if (!c[5] && u >= 0 && u < (c[3] || 0.12)) dn = 1; });
  gsap.set(cur, { x: p[0] - 12, y: p[1] - 6, scale: dn ? 0.86 : 1, transformOrigin: "20% 10%" }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", PRE + "\n" + body);
const CD = { cursor: null, approach: [260, 200], lead: 0.12 };
const CO = { cursor: "an optional cursor", approach: "[x, y] px the cursor comes from", lead: "s it arrives before a click" };
const BCSS = `.bw { position: relative; width: 1400px; height: 760px; display: grid; place-items: center; }
.b { position: relative; display: inline-grid; place-items: center; box-sizing: border-box; height: 184px; padding: 0 110px; border-radius: 56px; font-size: 60px; font-weight: 800; white-space: nowrap; }
.b-acc { background: linear-gradient(180deg, #9c88ff, #7357f5); color: #fff; box-shadow: 0 24px 50px rgba(115, 87, 245, 0.35); } .b-out { background: #10131d; border: 6px solid #8b7bff; color: #a99bff; }`;
const BTN = (inner, css = "", cursor = true) => ui(`<div class="bw">${inner}${cursor ? CURSOR : ""}</div>`, `${BCSS}\n${css}`);
const U = ["drive", "draw"];

export default [
  T("effect/blur-zoom-in", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), pin = gsap.parseEase("power3.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + o.exit, function (t) {
        var p = e(Math.min(1, t / o.duration)); if (o.exitAt != null && t > o.exitAt) p = 1 - pin(Math.min(1, (t - o.exitAt) / o.exit));
        gsap.set(el, { scale: o.from + (1 - o.from) * p }); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px)" : ""; el.style.opacity = String(p);
      });
    },
    options: { duration: "s (0.72)", from: "start scale (0.65)", blur: "px (14)", ease: "(cubic-bezier(.25,1,.5,1): ease-out quart)", exitAt: "s after the start to reverse (null)", exit: "s (0.25, ease-in cubic)" },
    defaults: { duration: 0.72, from: 0.65, blur: 14, ease: "cubic-bezier(.25,1,.5,1)", exitAt: null, exit: 0.25 },
    notes: "Scale, blur and opacity end on the same frame; no translate.",
    demo: H("Rõ nét từ xa", `MW.effectBlurZoomIn(q(".tk-head"), tl, 0.3, { exitAt: 1.55 });`, 2.2, { size: 170 }, ".tk-head { opacity: 0; }"),
  }),

  T("effect/chromatic-split", {
    uses: ["drive"],
    fn: mkc(`var cy = clone(), rd = clone(), io = gsap.parseEase("power2.inOut"); [cy, rd].forEach(function (g, i) { g.style.color = o.colors[i]; g.style.webkitTextFillColor = o.colors[i]; g.style.mixBlendMode = "screen"; });
var K = function (keys, u) { for (var i = 1; i < keys.length; i++) if (u <= keys[i][0]) { var a = keys[i - 1], b = keys[i], f = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } return keys[keys.length - 1][1]; };
var SP = [[0, 1], [0.42, 30 / 34], [0.68, 12 / 34], [0.9, 0], [1, 0]], SA = [[0, 1], [0.42, 1], [0.68, 0.95], [0.9, 0], [1, 0]], CS = [[0, 0.82], [0.2, 1.08], [0.38, 0.98], [0.56, 1.02], [1, 1]], CX = [[0, 0], [0.2, 1], [0.38, -0.75], [0.56, 0.25], [1, 0]];
return MW.drive(tl, at, o.duration, function (t) {
  var u = io(Math.max(0, Math.min(1, t / o.duration))), s = K(CS, u), f = Math.min(1, u / 0.2), on = t > 0;
  gsap.set(el, { scale: s, x: o.shake * K(CX, u) }); el.style.opacity = String(on ? 0.35 + 0.65 * f : 0); el.style.filter = f < 1 ? "blur(" + (2 * (1 - f)).toFixed(2) + "px)" : "";
  var d = o.offset * K(SP, u), a = on ? K(SA, u) : 0; gsap.set(cy, { x: -d, scale: s }); gsap.set(rd, { x: d, scale: s }); cy.style.opacity = rd.style.opacity = String(a);
});`),
    options: { duration: "s (0.9, ease-in-out cubic over the keys)", offset: "px each way (60)", colors: "[cyan, red], blended with screen", shake: "px of the core's jolt (8)" },
    defaults: { duration: 0.9, offset: 60, colors: ["#00e0ff", "#ff3060"], shake: 8 },
    demo: H("TÁCH MÀU", `MW.effectChromaticSplit(q(".tk-head"), tl, 0.3, {});`, 1.8, { size: 200, weight: 900 }, ".tk-head { color: #fff; }"),
  }),

  T("effect/glitch-in", {
    uses: ["drive", "rand"],
    fn: mkc(`var sl = [], n = o.slices, gh = clone(), bars = [];
for (var i = 0; i < n; i++) { var g = clone(); g.style.clipPath = "inset(" + (100 * i / n).toFixed(3) + "% 0 " + (100 - 100 * (i + 1) / n).toFixed(3) + "% 0)"; g.style.opacity = "0"; sl.push(g); }
gh.style.mixBlendMode = "lighter"; gh.style.color = o.accent2; gh.style.webkitTextFillColor = o.accent2; gh.style.opacity = "0";
for (var b = 0; b < 3; b++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;height:6px;pointer-events:none;opacity:0;background:" + o.accent2 + ";"; host.appendChild(d); bars.push(d); }
var L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
var mess = function (t, a) { var f = Math.floor(t * 30), r = MW.rand(o.seed * 977 + f * 13); el.style.opacity = "0";
  sl.forEach(function (g) { var hide = r() < 0.2; gsap.set(g, { x: (r() * 2 - 1) * o.amp, skewX: (r() * 2 - 1) * o.skew }); g.style.opacity = hide ? "0" : String(a); });
  gsap.set(gh, { x: -12 + (r() * 2 - 1) * 6 }); gh.style.opacity = String(0.7 * a); bars.forEach(function (d) { d.style.left = L + r() * W * 0.6 + "px"; d.style.top = Tp + r() * Hh + "px"; d.style.width = W * (0.15 + r() * 0.35) + "px"; d.style.opacity = String(a); }); };
var clean = function (show) { sl.forEach(function (g) { g.style.opacity = "0"; }); gh.style.opacity = "0"; bars.forEach(function (d) { d.style.opacity = "0"; }); el.style.opacity = show ? "1" : "0"; };
return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.1, function (t) {
  var u = t / o.duration; if (t <= 0) { clean(false); return; }
  if (o.exitAt != null && t >= o.exitAt) { if (t < o.exitAt + 0.1) mess(t, 1); else clean(false); gsap.set(el, { x: 0 }); return; }
  if (u < 0.45) { mess(t, 0.25 + 0.75 * u / 0.45); gsap.set(el, { x: 0 }); } else if (u < 0.65) { clean(true); gsap.set(el, { x: -2 }); } else { clean(true); gsap.set(el, { x: 0 }); }
});`),
    options: { duration: "s (0.65, linear)", slices: "(8)", amp: "± px (40)", skew: "± degrees (5)", seed: "(3)", accent2: "ghost and bar colour", exitAt: "s after the start for a 0.1 s glitch out (null)" },
    defaults: { duration: 0.65, slices: 8, amp: 40, skew: 5, seed: 3, accent2: "#3dd6f5", exitAt: null },
    notes: "Slices re-randomise 30 times a second (seeded); about one in five is hidden on each frame.",
    demo: H("TÍN HIỆU", `MW.effectGlitchIn(q(".tk-head"), tl, 0.3, { exitAt: 1.6 });`, 2.2, { size: 210, weight: 900 }),
  }),

  T("effect/pixel-tiles-in", {
    uses: ["drive", "rand"],
    fn: mkc(`var N = o.grid, tiles = [], r = MW.rand(o.seed), ord = [], ord2 = [], p3 = gsap.parseEase("power3.out"), pi = gsap.parseEase("power3.in");
for (var i = 0; i < N * N; i++) { ord.push(i); ord2.push(i); }
var shuf = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } }; shuf(ord); shuf(ord2);
var rank = [], rank2 = []; ord.forEach(function (c, k) { rank[c] = k; }); ord2.forEach(function (c, k) { rank2[c] = k; });
for (var j = 0; j < N * N; j++) { var g = clone(), rr = Math.floor(j / N), cc = j % N; g.style.clipPath = "inset(" + (100 * rr / N) + "% " + (100 - 100 * (cc + 1) / N) + "% " + (100 - 100 * (rr + 1) / N) + "% " + (100 * cc / N) + "%)"; g.style.transformOrigin = (100 * (cc + 0.5) / N) + "% " + (100 * (rr + 0.5) / N) + "%"; g.style.opacity = "0"; tiles.push(g); }
var inEnd = (N * N - 1) * o.stagger + o.duration;
return MW.drive(tl, at, o.exitAt == null ? inEnd : o.exitAt + (N * N - 1) * 0.012 + 0.2, function (t) {
  var out = o.exitAt != null && t >= o.exitAt, whole = t >= inEnd && !out;
  el.style.opacity = whole ? "1" : "0";
  tiles.forEach(function (g, i) { var s; if (out) s = 1 - pi(Math.max(0, Math.min(1, (t - o.exitAt - rank2[i] * 0.012) / 0.2))); else s = p3(Math.max(0, Math.min(1, (t - rank[i] * o.stagger) / o.duration)));
    gsap.set(g, { scale: s }); g.style.opacity = whole ? "0" : String(s); });
});`),
    options: { grid: "tiles per side (4)", stagger: "s (0.028), in a seeded order", duration: "s per tile (0.45, ease-out cubic)", seed: "(7)", exitAt: "s after the start to break up again (null): 0.2 s a tile, 0.012 s apart" },
    defaults: { grid: 4, stagger: 0.028, duration: 0.45, seed: 7, exitAt: null },
    notes: "At the end the tiles are swapped for the whole element, so no seams show.",
    assets: [{ path: "pic.svg", data: PRODUCT }],
    demo: BOX(`<div class="bx pt" style="width:620px;height:620px;opacity:0"></div>`, `MW.effectPixelTilesIn(q(".pt"), tl, 0.3, { exitAt: 1.9 });`, 2.6),
  }),

  T("shape/particle-burst", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, e = gsap.parseEase("power3.out"), dots = []; if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      for (var i = 0; i < o.count; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:2;width:" + o.size + "px;height:" + o.size + "px;margin:-" + o.size / 2 + "px 0 0 -" + o.size / 2 + "px;background:" + o.color + ";"; host.appendChild(d); dots.push(d); }
      var K = function (keys, u) { for (var i = 1; i < keys.length; i++) if (u <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); } return keys[keys.length - 1][1]; };
      return MW.drive(tl, at, o.duration, function (t) {
        var u = e(Math.max(0, Math.min(1, t / o.duration))); gsap.set(el, { scale: K([[0, 0.72], [0.42, 1.12], [1, 1]], u) }); el.style.opacity = String(t > 0 ? 0.5 + 0.5 * Math.min(1, u / 0.42) : 0);
        var v = e(Math.max(0, Math.min(1, (t - 0.07) / (o.duration - 0.07))));
        dots.forEach(function (d, i) { var a = i / o.count * 2 * Math.PI, f = v < 0.62 ? v / 0.62 : 1 + 0.12 * (v - 0.62) / 0.38, s = v < 0.62 ? 0.3 + 0.7 * v / 0.62 : 1 - 0.8 * (v - 0.62) / 0.38, op = v <= 0 ? 0 : v < 0.62 ? 0.85 * v / 0.62 : 0.85 * (1 - (v - 0.62) / 0.38);
          d.style.left = cx + o.radius[0] * f * Math.cos(a) + "px"; d.style.top = cy + o.radius[1] * f * Math.sin(a) + "px"; d.style.transform = "scale(" + s.toFixed(3) + ")"; d.style.opacity = String(Math.max(0, op)); });
      });
    },
    options: { duration: "s (0.82, ease-out quart)", radius: "[x, y] px of the ellipse ([232, 184])", count: "(8)", size: "px (28)", color: "" },
    defaults: { duration: 0.82, radius: [232, 184], count: 8, size: 28, color: "#8b7bff" },
    demo: { css: `${BG}\n${ST} .pb { width: 260px; height: 260px; border-radius: 70px; background: #151a24; border: 4px solid #262c3a; display: grid; place-items: center; opacity: 0; } .pb svg { width: 140px; height: 140px; }`,
      html: `<div class="st"><div class="pb"><svg viewBox="0 0 24 24"><path d="M12 21 C5 15.5 2 12.3 2 8.6 C2 5.6 4.3 3.5 7 3.5 C9 3.5 10.9 4.6 12 6.4 C13.1 4.6 15 3.5 17 3.5 C19.7 3.5 22 5.6 22 8.6 C22 12.3 19 15.5 12 21 Z" fill="#ff5d8f"/></svg></div></div>`,
      run: `MW.shapeParticleBurst(q(".pb"), tl, 0.3, {});`, duration: 1.6 },
  }),

  T("effect/ripple-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, p3 = gsap.parseEase("power3.out"), W = el.offsetWidth, Hh = el.offsetHeight, x = W * o.point[0], y = Hh * o.point[1], far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, Hh - y), Math.hypot(W - x, Hh - y)), R1 = o.radius || far / 1.05, rings = [], dot = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; var hx = el.offsetLeft + x, hy = el.offsetTop + y;
      [[o.stroke[0], 0.9], [o.stroke[1], 0.5]].forEach(function (s) { var r = document.createElement("div"); r.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:3;box-sizing:border-box;border:" + s[0] + "px solid " + o.accent + ";"; r.__a = s[1]; host.appendChild(r); rings.push(r); });
      dot.style.cssText = "position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:#fff;pointer-events:none;opacity:0;z-index:3;left:" + hx + "px;top:" + hy + "px;"; host.appendChild(dot);
      return MW.drive(tl, at, o.duration, function (t) {
        rings.forEach(function (r, i) { var st = i ? o.delay2 : 0, u = Math.max(0, Math.min(1, (t - st) / (o.duration - st))), rad = o.start + (R1 - o.start) * p3(u); r.style.width = r.style.height = 2 * rad + "px"; r.style.left = hx - rad + "px"; r.style.top = hy - rad + "px"; r.style.opacity = t > st && u < 1 ? String(r.__a * (1 - u)) : "0"; });
        var c1 = (o.start + (R1 - o.start) * p3(Math.max(0, Math.min(1, t / o.duration)))) * 1.05; el.style.clipPath = t > 0 ? "circle(" + c1.toFixed(1) + "px at " + x.toFixed(1) + "px " + y.toFixed(1) + "px)" : "circle(0px at 50% 50%)";
        el.style.opacity = String(p3(Math.max(0, Math.min(1, (t - 0.08) / 0.62)))); dot.style.opacity = t > 0 && t < 0.14 ? "1" : "0";
      });
    },
    options: { duration: "s (0.95, ease-out cubic)", point: "[x, y] share of the element", start: "px ring radius at the start (40)", radius: "px of the first ring at the end (null: to the farthest corner)", delay2: "s the second ring starts (0.11)", stroke: "[ring 1, ring 2] px ([10, 6])", accent: "" },
    defaults: { duration: 0.95, point: [0.5, 0.5], start: 40, radius: null, delay2: 0.11, stroke: [10, 6], accent: "#a99bff" },
    assets: [{ path: "pic.svg", data: LANDSCAPE }],
    demo: BOX(`<div class="bx rp" style="opacity:0"></div>`, `MW.effectRippleReveal(q(".rp"), tl, 0.4, { point: [0.42, 0.55] });`, 1.8),
  }),

  T("motion/slice-reveal", {
    uses: ["drive"],
    fn: mkc(`var n = o.slices, S = [], io = gsap.parseEase("power2.inOut"), pi = gsap.parseEase("power3.in");
for (var i = 0; i < n; i++) { var g = clone(); g.style.clipPath = "inset(" + (100 * i / n).toFixed(3) + "% 0 " + (100 - 100 * (i + 1) / n).toFixed(3) + "% 0)"; g.style.opacity = "0"; S.push(g); }
return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.2, function (t) {
  var out = o.exitAt != null && t > o.exitAt, x = out ? pi(Math.min(1, (t - o.exitAt) / 0.2)) : 0, done = t >= o.duration && !out;
  el.style.opacity = done ? "1" : "0";
  S.forEach(function (g, i) { var st = i * o.stagger, p = out ? 1 - x : io(Math.max(0, Math.min(1, (t - st) / (o.duration - st)))), side = i % 2 ? 1 : -1; gsap.set(g, { x: side * o.distance * (1 - p) }); g.style.opacity = done ? "0" : String(p); });
});`),
    options: { slices: "(4)", distance: "px (120): odd strips from the left, even from the right", stagger: "s (0.036); all land together", duration: "s (0.84, ease-in-out cubic)", exitAt: "s after the start to slide apart again (null, 0.2 s)" },
    defaults: { slices: 4, distance: 120, stagger: 0.036, duration: 0.84, exitAt: null },
    demo: { css: `${BG}\n${ST} .sr { width: 900px; height: 420px; border-radius: 40px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 150px; font-weight: 900; color: #fff; opacity: 0; }`,
      html: `<div class="st"><div class="sr">GHÉP LẠI</div></div>`, run: `MW.motionSliceReveal(q(".sr"), tl, 0.3, { exitAt: 1.7 });`, duration: 2.4 },
  }),

  T("effect/noise-resolve", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, si = gsap.parseEase("sine.out"), pi = gsap.parseEase("power3.in"), cv = document.createElement("canvas"); if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var m = o.margin, W = el.offsetWidth + 2 * m, Hh = el.offsetHeight + 2 * m; cv.width = W; cv.height = Hh; cv.style.cssText = "position:absolute;pointer-events:none;left:" + (el.offsetLeft - m) + "px;top:" + (el.offsetTop - m) + "px;width:" + W + "px;height:" + Hh + "px;"; host.appendChild(cv);
      var c = cv.getContext("2d"), R = Math.max(W, Hh) / 2;
      return MW.drive(tl, at, o.exitAt == null ? 0.25 + o.duration : o.exitAt + 0.25, function (t) {
        var f = Math.floor(t * 24), r = MW.rand(o.seed * 101 + f), fin = Math.min(1, t / 0.25), p = si(Math.max(0, Math.min(1, (t - 0.25) / o.duration))), x = o.exitAt != null && t > o.exitAt ? pi(Math.min(1, (t - o.exitAt) / 0.25)) : 0;
        c.clearRect(0, 0, W, Hh); var n = Math.round(o.count * (1 - p)), a = o.amount * fin * (1 - p);
        if (t > 0 && a > 0.005) for (var i = 0; i < n; i++) { var ang = r() * 2 * Math.PI, d = Math.sqrt(r()) * R; c.globalAlpha = a; c.fillStyle = r() < 0.667 ? o.ink : o.accent; c.fillRect(W / 2 + d * Math.cos(ang), Hh / 2 + d * Math.sin(ang), o.speck, o.speck); }
        c.globalAlpha = 1; var vis = t > 0 ? (0.2 + 0.8 * p) * (1 - x) : 0; el.style.opacity = String(vis); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px)" : ""; gsap.set(el, { scale: 0.96 + 0.04 * p });
      });
    },
    options: { duration: "s (1, ease-out sine)", amount: "grain opacity at the start (0.85)", count: "grains (420)", speck: "px (6)", margin: "px of grain field around the element (140)", blur: "px (24)", ink: "", accent: "every third grain", seed: "(4)", exitAt: "s after the start to fade (null)" },
    defaults: { duration: 1, amount: 0.85, count: 420, speck: 6, margin: 140, blur: 24, ink: "#e8ebf3", accent: "#8b7bff", seed: 4, exitAt: null },
    notes: "The grains are re-seeded 24 times a second.",
    demo: { css: `${BG}\n${ST} .nr { width: 360px; height: 360px; border-radius: 90px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 170px; font-weight: 900; color: #fff; opacity: 0; }`,
      html: `<div class="st"><div class="nr">M</div></div>`, run: `MW.effectNoiseResolve(q(".nr"), tl, 0.2, { exitAt: 2 });`, duration: 2.6 },
  }),

  T("shape/liquid-blob", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), K = o.keys, d = K[K.length - 1][0], per = d + o.gap;
      return MW.drive(tl, at, per * o.cycles, function (t) {
        var u = Math.min(d, t % per), i = 1; while (i < K.length - 1 && u > K[i][0]) i++; var a = K[i - 1], b = K[i], f = io(Math.max(0, Math.min(1, (u - a[0]) / (b[0] - a[0]))));
        el.style.borderRadius = a[1].map(function (v, j) { return (v + (b[1][j] - v) * f).toFixed(2) + "%"; }).join(" "); gsap.set(el, { scaleX: a[2] + (b[2] - a[2]) * f, scaleY: a[3] + (b[3] - a[3]) * f });
      });
    },
    options: { keys: "[[s, [TL, TR, BR, BL] % radii, scaleX, scaleY], ...], each leg ease-in-out cubic", cycles: "(2)", gap: "s between cycles (0.5)" },
    defaults: { keys: [[0, [50, 50, 50, 50], 1, 1], [0.36, [62, 38, 55, 45], 1.12, 0.9], [0.74, [34, 66, 42, 58], 0.9, 1.1], [1.1, [50, 50, 50, 50], 1, 1]], cycles: 2, gap: 0.5 },
    notes: "It ends exactly on the start shape.",
    demo: { css: `${BG}\n${ST} .lb { width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #c4b8ff, #8b7bff 55%, #5b46d8); box-shadow: 0 40px 120px rgba(139,123,255,0.35); }`,
      html: `<div class="st"><div class="lb"></div></div>`, run: `MW.shapeLiquidBlob(q(".lb"), tl, 0.2, {});`, duration: 3.5 },
  }),

  T("effect/ink-reveal", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var p3 = gsap.parseEase("power3.out"), pi = gsap.parseEase("power3.in"), r = MW.rand(o.seed), W = el.offsetWidth, Hh = el.offsetHeight, ph = o.points.map(function () { return [r() * 6.28, r() * 6.28, 2 + Math.floor(r() * 3)]; });
      var end = Math.max.apply(null, o.starts) + o.duration;
      return MW.drive(tl, at, o.exitAt == null ? end : o.exitAt + 0.3, function (t) {
        var d = "", all = t >= end;
        o.points.forEach(function (pt, i) { var u = p3(Math.max(0, Math.min(1, (t - o.starts[i]) / o.duration))), R = o.size * W * u; if (R < 0.5) return; var cx = W * pt[0], cy = Hh * pt[1], w = o.wobble * (1 - u);
          for (var k = 0; k <= 48; k++) { var a = k / 48 * 2 * Math.PI, rr = R * (1 + w * (0.6 * Math.sin(ph[i][2] * a + ph[i][0]) + 0.4 * Math.sin((ph[i][2] + 3) * a + ph[i][1]))); d += (k ? " L" : " M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1); } d += " Z"; });
        el.style.clipPath = all ? "none" : d ? "path('" + d + "')" : "inset(50%)"; el.style.opacity = String(o.exitAt != null && t > o.exitAt ? 1 - pi(Math.min(1, (t - o.exitAt) / 0.3)) : t > 0 ? 1 : 0);
      });
    },
    options: { duration: "s per blot (1.2, ease-out cubic)", starts: "s each blot starts", points: "[[x, y] shares]", size: "end radius as a share of the width (0.55)", wobble: "± share of the radius, fading as it grows (0.14)", seed: "(2)", exitAt: "s after the start to fade (null)" },
    defaults: { duration: 1.2, starts: [0, 0.25, 0.15, 0.5], points: [[0.24, 0.6], [0.55, 0.29], [0.78, 0.6], [0.44, 0.83]], size: 0.55, wobble: 0.14, seed: 2, exitAt: null },
    assets: [{ path: "pic.svg", data: LANDSCAPE }],
    demo: BOX(`<div class="bx ir" style="opacity:0"></div>`, `MW.effectInkReveal(q(".ir"), tl, 0.3, { exitAt: 2.2 });`, 2.9),
  }),

  T("effect/mosaic-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var N = o.grid, W = el.offsetWidth, Hh = el.offsetHeight, tw = W / N, th = Hh / N, io = gsap.parseEase("power2.inOut"), T = [];
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      for (var i = 0; i < N * N; i++) { var rr = Math.floor(i / N), cc = i % N, d = document.createElement("div"), fa = document.createElement("div"), fb = document.createElement("div");
        d.style.cssText = "position:absolute;left:" + cc * tw + "px;top:" + rr * th + "px;width:" + (tw + 0.5) + "px;height:" + (th + 0.5) + "px;";
        [[fa, o.a], [fb, o.b]].forEach(function (q) { q[0].style.cssText = "position:absolute;inset:0;background:" + q[1] + ";background-size:" + W + "px " + Hh + "px;background-position:" + (-cc * tw) + "px " + (-rr * th) + "px;"; d.appendChild(q[0]); }); el.appendChild(d); T.push({ d: d, a: fa, b: fb, w: rr + cc, k: i }); }
      var out = (2 * N - 2) * o.stagger + o.duration;
      return MW.drive(tl, at, o.backAt == null ? out : o.backAt + (N * N - 1) * 0.04 + 0.35, function (t) {
        T.forEach(function (q) { var A = 180 * io(Math.max(0, Math.min(1, (t - q.w * o.stagger) / o.duration))); if (o.backAt != null && t > o.backAt) A = 180 * (1 - io(Math.max(0, Math.min(1, (t - o.backAt - (N * N - 1 - q.k) * 0.04) / 0.35))));
          var face = A > 90; gsap.set(q.d, { rotationY: face ? A - 180 : A, scaleY: 1 + 0.08 * Math.sin(A * Math.PI / 180), transformPerspective: o.perspective }); q.a.style.visibility = face ? "hidden" : "visible"; q.b.style.visibility = face ? "visible" : "hidden"; });
      });
    },
    options: { grid: "(4)", stagger: "s per diagonal step (0.114)", duration: "s per tile (0.45, ease-in-out cubic)", perspective: "px (1600)", a: "background of the first picture", b: "background of the next", backAt: "s after the start for the return wave (null)" },
    defaults: { grid: 4, stagger: 0.114, duration: 0.45, perspective: 1600, a: "url(assets/pic.svg)", b: "url(assets/pic2.svg)", backAt: null },
    notes: "Faces swap at 90°, so no back face shows; the wave runs from the top left to the bottom right.",
    assets: [{ path: "pic.svg", data: LANDSCAPE }, { path: "pic2.svg", data: ABSTRACT }],
    demo: { css: `${BG}\n${ST} .mf { position: relative; width: 1000px; height: 620px; }`, html: `<div class="st"><div class="mf"></div></div>`, run: `MW.effectMosaicFlip(q(".mf"), tl, 0.3, { backAt: 1.9 });`, duration: 3.2 },
  }),

  T("effect/displace-wave", {
    uses: ["drive"],
    fn: mkc(`var n = o.bands, B = []; for (var i = 0; i < n; i++) { var g = clone(); g.style.clipPath = "inset(" + (100 * i / n).toFixed(3) + "% 0 " + (100 - 100 * (i + 1) / n).toFixed(3) + "% 0)"; g.style.opacity = "0"; B.push(g); }
return MW.drive(tl, at, o.duration, function (t) {
  var tau = Math.max(0, Math.min(1, t / o.duration)), on = tau > 0 && tau < 1, env = Math.pow(Math.sin(Math.PI * tau), 2);
  el.style.opacity = on ? "0" : "1"; B.forEach(function (g, i) { gsap.set(g, { x: o.amp * Math.sin(0.16 * i - 4 * Math.PI * tau) * env }); g.style.opacity = on ? "1" : "0"; });
});`),
    options: { bands: "(26)", amp: "px (48)", duration: "s (2.2, linear): the crest crosses twice" },
    defaults: { bands: 26, amp: 48, duration: 2.2 },
    notes: "x = amp × sin(0.16 i − 4π τ) × sin²(π τ): clean at the start and at the end.",
    demo: H("Sóng chạy qua chữ", `MW.effectDisplaceWave(q(".tk-head"), tl, 0.3, {});`, 2.8, { size: 170 }),
  }),

  T("ui/hover-lift", {
    uses: U,
    fn: mk(`var p2 = gsap.parseEase(o.ease), sh = gsap.utils.interpolate(o.shadow[0], o.shadow[1]);
cursorPlan(o.hovers.map(function (h) { return [h[0], 0.5, 0.5, h[1] - h[0], el, true]; }));
return MW.drive(tl, at, o.hovers[o.hovers.length - 1][1] + o.duration + 0.5, function (t) {
  var k = 0; o.hovers.forEach(function (h) { if (t > h[0]) k = t < h[1] ? p2(Math.min(1, (t - h[0]) / o.duration)) : 1 - p2(Math.min(1, (t - h[1]) / o.duration)); });
  gsap.set(el, { y: -o.lift * k, scale: 1 + (o.scale - 1) * k }); el.style.boxShadow = sh(k); cursorAt(t);
});`),
    options: { lift: "px (28)", scale: "(1.02)", duration: "s (0.18, power2.out)", ease: "", shadow: "[rest, lifted] shadows", hovers: "[[s in, s out], ...]", ...CO },
    defaults: { lift: 28, scale: 1.02, duration: 0.18, ease: "power2.out", shadow: ["0 32px 72px rgba(0,0,0,0.28)", "0 80px 136px rgba(0,0,0,0.46)"], hovers: [[0.35, 1.15], [1.95, 2.75]], ...CD, approach: [232, 160] },
    demo: { ...BTN(`<div class="ui-card hl" style="width:720px"><p class="ui-h">Bộ sưu tập mùa thu</p><p class="ui-p">12 phim ngắn · cập nhật hôm nay</p></div>`), run: `MW.uiHoverLift(q(".hl"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3.3 },
  }),

  T("cursor/magnetic-button", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), cx = 160, cy = 100, dt = 1 / 240;
      var C = function (t) { return MW.path(o.path, t, io); }, Tg = function (t) { var p = C(t), dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy); if (d > o.radius) return [0, 0]; var tx = dx * o.pull, ty = dy * o.pull, m = Math.hypot(tx, ty); if (m > o.max) { tx *= o.max / m; ty *= o.max / m; } return [tx, ty]; };
      return MW.drive(tl, at, o.path[o.path.length - 1][0], function (t) {
        var x = 0, y = 0, vx = 0, vy = 0; for (var s = 0; s < t; s += dt) { var g = Tg(s); vx += (o.k * (g[0] - x) - o.c * vx) * dt; vy += (o.k * (g[1] - y) - o.c * vy) * dt; x += vx * dt; y += vy * dt; }
        S.clear(); c.save(); c.setLineDash([3, 4]); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, o.radius, 0, 2 * Math.PI); c.stroke(); c.restore();
        MW.rr(c, cx + x - 60, cy + y - 22, 120, 44, 22); c.fillStyle = o.accent; c.fill(); MW.txt(c, o.label, cx + x * 1.5, cy + y * 1.5 + 0.5, 12, "#fff", 800);
        var p = C(t); MW.cursor(c, p[0], p[1], 1);
      });
    },
    options: { radius: "units of the pull zone (74)", pull: "share of the cursor's offset (0.18)", max: "units (12)", k: "spring stiffness (240)", c: "damping (22)", path: "[[s, x, y], ...] cursor keys in the 320 frame", label: "", accent: "" },
    defaults: { radius: 74, pull: 0.18, max: 12, k: 240, c: 22, path: [[0, 292, 172], [0.3, 292, 172], [0.9, 214, 74], [1.5, 186, 124], [2.1, 126, 78], [2.6, 36, 44], [3.05, 70, 184], [3.6, 292, 172]], label: "Liên hệ", accent: "#8b7bff" },
    notes: "The label moves an extra half of the button's offset; the spring is integrated from the start, so each frame is a function of time.",
    demo: CV("cursorMagneticButton", 3.6),
  }),

  T("ui/pointer-tilt", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, io = gsap.parseEase(o.ease), tt = o.title ? el.querySelector(o.title) : null, per = o.period;
      if (tt) { el.style.transformStyle = "preserve-3d"; gsap.set(tt, { z: o.depth }); }
      var K = [[0, 0, 0], [0.1, 0, 0], [0.32, -o.tilt, -o.tilt], [0.44, -o.tilt, -o.tilt], [0.66, o.tilt, o.tilt], [0.78, o.tilt, o.tilt], [0.92, 0, 0], [1, 0, 0]], P = [[0, -58, -18], [0.1, -58, -18], [0.32, 0, -45], [0.44, 0, -45], [0.66, -114, 11], [0.78, -114, 11], [0.92, -58, -18], [1, -58, -18]];
      var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      return MW.drive(tl, at, per * o.cycles, function (t) {
        var u = (t % per) / per, r = MW.path(K, u, io), q = MW.path(P, u, io); gsap.set(el, { rotationX: r[0], rotationY: r[1], transformPerspective: o.perspective });
        if (cur) gsap.set(cur, { x: cx + q[0] * o.unit - 12, y: cy + q[1] * o.unit - 6 });
      });
    },
    options: { tilt: "degrees on both axes (6)", perspective: "px (2100)", period: "s per loop (1.8)", cycles: "(2)", ease: "(power2.inOut)", title: "a part lifted forward", depth: "px it sits forward (120)", unit: "px per reference unit for the cursor (5)", cursor: "an optional cursor" },
    defaults: { tilt: 6, perspective: 2100, period: 1.8, cycles: 2, ease: "power2.inOut", title: ".ui-h", depth: 120, unit: 5, cursor: null },
    demo: { ...ui(`<div class="pt-w"><div class="ui-card pt" style="width:760px;height:440px;box-sizing:border-box"><p class="ui-h" style="font-size:64px">Nghiêng theo tay</p><p class="ui-p">Thẻ đổi góc theo vị trí con trỏ</p></div>${CURSOR}</div>`, `.pt-w { position: relative; width: 1200px; height: 760px; display: grid; place-items: center; }`),
      run: `MW.uiPointerTilt(q(".pt"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3.6 },
  }),

  T("cursor/follow-trail", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), keys = [[0, o.points[o.points.length - 1][0], o.points[o.points.length - 1][1]]];
      o.points.forEach(function (p, i) { keys.push([i * o.every + o.move, p[0], p[1]]); keys.push([(i + 1) * o.every, p[0], p[1]]); });
      var C = function (t) { return MW.path(keys, Math.max(0, t), io); };
      return MW.drive(tl, at, o.points.length * o.every, function (t) {
        S.clear(); var F = t * 60, f0 = Math.max(0, Math.floor(F) - 150);
        o.lerps.forEach(function (l, k) { var p = C(f0 / 60).slice(); for (var f = f0 + 1; f <= Math.floor(F); f++) { var q = C(f / 60); p[0] += (q[0] - p[0]) * l; p[1] += (q[1] - p[1]) * l; } var fr = F - Math.floor(F), qq = C(t); p[0] += (qq[0] - p[0]) * l * fr; p[1] += (qq[1] - p[1]) * l * fr;
          c.globalAlpha = o.alphas[k]; c.fillStyle = o.accent; c.beginPath(); c.arc(p[0], p[1], o.radii[k], 0, 2 * Math.PI); c.fill(); });
        c.globalAlpha = 1; var m = C(t); MW.cursor(c, m[0], m[1], 1);
      });
    },
    options: { lerps: "share of the gap each dot closes per 60 fps frame", radii: "units", alphas: "", points: "cursor stops in the 320 frame", move: "s per move (0.5, power2.inOut)", every: "s per stop (0.75)", accent: "" },
    defaults: { lerps: [0.32, 0.22, 0.14, 0.09], radii: [10, 8, 6.4, 5], alphas: [1, 0.78, 0.58, 0.42], points: [[70, 62], [252, 70], [216, 146], [90, 138]], move: 0.5, every: 0.75, accent: "#8b7bff" },
    notes: "Each frame iterates the chase from 150 frames back, so it stays a function of time.",
    demo: CV("cursorFollowTrail", 3),
  }),

  T("motion/drag-inertia", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, pin = gsap.parseEase("power2.in"), k = o.decay, ticks = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      for (var i = 0; i < 4; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;height:6px;border-radius:3px;background:" + o.accent + ";opacity:0;pointer-events:none;"; (cur && cur.offsetParent ? cur.offsetParent : host).appendChild(d); ticks.push(d); }
      var G = function (tau, T) { return (1 - Math.exp(-k * tau)) / (1 - Math.exp(-k * T)); };
      var X = function (t) { if (t < o.dragAt) return 0; if (t < o.dragAt + o.drag) return o.pull * pin((t - o.dragAt) / o.drag); var r = o.dragAt + o.drag; if (t < o.backAt) return o.pull + o.glide * G(Math.min(t - r, o.backAt - r), o.backAt - r);
        var e = o.pull + o.glide, b0 = o.backAt + 0.1; if (t < b0) return e; if (t < b0 + o.drag) return e - o.pull * pin((t - b0) / o.drag); var r2 = b0 + o.drag; return e - o.pull - o.glide * G(Math.min(t - r2, o.end - r2), o.end - r2); };
      var cb = cur ? (cur.offsetParent || host).getBoundingClientRect() : host.getBoundingClientRect(), er = el.getBoundingClientRect(), bx = er.left - cb.left + er.width / 2, by = er.top - cb.top + er.height / 2;
      return MW.drive(tl, at, o.end + 0.3, function (t) {
        var x = X(t), v = (X(t + 0.005) - X(t - 0.005)) / 0.01, held = (t > o.grab && t < o.dragAt + o.drag) || (t > o.backAt && t < o.backAt + 0.1 + o.drag), sx = 1 + Math.min(0.14, Math.abs(v) / o.speedFull);
        gsap.set(el, { x: x, scaleX: sx * (held ? 1.06 : 1), scaleY: (held ? 1.06 : 1) / sx });
        ticks.forEach(function (d, i) { var len = Math.min(120, Math.abs(v) * 0.05) * (1 - i * 0.2); d.style.width = len + "px"; d.style.left = bx + x - Math.sign(v) * (60 + i * 30) - (v > 0 ? len : 0) + "px"; d.style.top = by + el.offsetHeight * 0.75 + i * 12 + "px"; d.style.opacity = Math.abs(v) > 40 ? String(0.6 - i * 0.12) : "0"; });
        if (cur) { var cxp = held ? bx + x : t < o.grab ? bx + 260 * (1 - Math.min(1, t / o.grab)) : bx + X(Math.min(t, o.dragAt + o.drag)) * (t < o.backAt ? 1 : 0) + (t >= o.backAt ? X(o.backAt) - (t > o.backAt + 0.1 ? o.pull * pin(Math.min(1, (t - o.backAt - 0.1) / o.drag)) : 0) : 0); gsap.set(cur, { x: cxp - 12, y: by - 6 + (t < o.grab ? 200 * (1 - t / o.grab) : 0), scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { grab: "s (0.35)", dragAt: "s (0.45)", drag: "s (0.2, power2.in)", pull: "px dragged (240)", glide: "px it glides on (468)", decay: "per second (7.67: speed × 0.88 per 60 fps frame)", backAt: "s the mirror throw starts (1.85)", end: "s it lands back on the start (3.3)", speedFull: "px a second for the full stretch (24000)", accent: "speed ticks", cursor: "an optional cursor" },
    defaults: { grab: 0.35, dragAt: 0.45, drag: 0.2, pull: 240, glide: 468, decay: 7.67, backAt: 1.85, end: 3.3, speedFull: 24000, accent: "#8b7bff", cursor: null },
    demo: { ...ui(`<div class="di-w"><div class="di-t"><div class="di"></div></div>${CURSOR}</div>`, `.di-w { position: relative; width: 1400px; height: 600px; display: grid; place-items: center; } .di-t { position: relative; width: 1056px; height: 208px; border-radius: 104px; background: #151a24; border: 3px solid #262c3a; box-sizing: border-box; }
.di { position: absolute; left: 30px; top: 30px; width: 144px; height: 144px; border-radius: 32px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`),
      run: `MW.motionDragInertia(q(".di"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3.6 },
  }),

  T("ui/ink-ripple", {
    uses: U,
    fn: mk(`var p2 = gsap.parseEase("power2.out"), R = [], dot = document.createElement("div"), x = el.offsetLeft + el.offsetWidth * o.point[0], y = el.offsetTop + el.offsetHeight * o.point[1];
for (var i = 0; i < 2; i++) { var r = document.createElement("div"); r.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:4;box-sizing:border-box;width:" + o.ring + "px;height:" + o.ring + "px;margin:-" + o.ring / 2 + "px 0 0 -" + o.ring / 2 + "px;left:" + x + "px;top:" + y + "px;border:" + o.stroke + "px solid " + o.accent + ";"; host.appendChild(r); R.push(r); }
dot.style.cssText = "position:absolute;border-radius:50%;background:#fff;pointer-events:none;opacity:0;z-index:5;width:" + o.dot + "px;height:" + o.dot + "px;margin:-" + o.dot / 2 + "px 0 0 -" + o.dot / 2 + "px;left:" + x + "px;top:" + y + "px;"; host.appendChild(dot);
cursorPlan([[o.press, o.point[0], o.point[1], 0.12]]);
return MW.drive(tl, at, o.press + 0.11 + o.duration + 0.5, function (t) {
  R.forEach(function (r, i) { var u = (t - o.press - i * 0.11) / o.duration, p = p2(Math.max(0, Math.min(1, u))); r.style.transform = "scale(" + (0.1 + 3 * p).toFixed(3) + ")"; r.style.opacity = u > 0 && u < 1 ? String(0.72 * (1 - p)) : "0"; });
  var d = (t - o.press) / 0.25, s = d < 0.28 ? 0.8 + 0.3 * d / 0.28 : 1.1 - 0.1 * Math.min(1, (d - 0.28) / 0.72), fade = 1 - Math.max(0, Math.min(1, (t - o.press - o.duration) / 0.2));
  dot.style.transform = "scale(" + s.toFixed(3) + ")"; dot.style.opacity = d > 0 ? String((0.5 + 0.5 * Math.min(1, d)) * fade) : "0"; cursorAt(t);
});`),
    options: { press: "s (0.5)", point: "[x, y] share of the button ([0.82, 0.5])", ring: "px (120)", stroke: "px (8)", dot: "px (60)", duration: "s (0.65, power2.out): scale 0.1 → 3.1", accent: "", ...CO },
    defaults: { press: 0.5, point: [0.82, 0.5], ring: 120, stroke: 8, dot: 60, duration: 0.65, accent: "#a99bff", ...CD },
    demo: { ...BTN(`<div class="b b-acc ik" style="padding:0 130px;border-radius:40px">Gửi đi</div>`), run: `MW.uiInkRipple(q(".ik"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2 },
  }),

  T("ui/toggle-morph", {
    uses: ["drive", "draw", "spring"],
    fn: mk(`var kn = el.querySelector(o.knob), ck = kn.querySelector("path"), on = el.querySelector(o.onLabel), off = el.querySelector(o.offLabel), s1 = MW.spring(300, 20), s2 = MW.spring(420, 40), mix = gsap.utils.interpolate(o.offColor, o.onColor), CL = ck ? ck.getTotalLength() : 0;
if (ck) ck.style.strokeDasharray = String(CL); cursorPlan([[o.onAt - 0.03, 0.5, 0.5, 0.12], [o.offAt - 0.03, 0.5, 0.5, 0.12]]);
var P = function (t) { if (t <= o.onAt) return 0; if (t <= o.offAt) return s1.at(t - o.onAt); var p0 = s1.at(o.offAt - o.onAt); return p0 * (1 - s2.at(t - o.offAt)); };
return MW.drive(tl, at, o.offAt + s2.duration + 0.9, function (t) {
  var p = P(t), v = (P(t + 0.005) - P(t - 0.005)) / 0.01 * o.travel, sx = 1 + Math.min(0.16, Math.abs(v) * o.squash);
  gsap.set(kn, { x: o.travel * p, scaleX: sx, scaleY: 1 / sx }); el.style.background = mix(Math.max(0, Math.min(1, p)));
  if (ck) ck.style.strokeDashoffset = String(CL * (1 - Math.max(0, Math.min(1, (p - 0.35) / 0.65)))); if (on) on.style.opacity = String(Math.max(0, Math.min(1, p))); if (off) off.style.opacity = String(1 - Math.max(0, Math.min(1, p)));
  cursorAt(t);
});`),
    options: { knob: "", onLabel: "", offLabel: "", travel: "px (224)", onAt: "s (0.5): spring k300 c20, about 10 % over", offAt: "s (1.9): spring k420 c40", squash: "scaleX per px a second (0.0005), at most 0.16", onColor: "", offColor: "", ...CO },
    defaults: { knob: ".tm-k", onLabel: ".tm-on", offLabel: ".tm-off", travel: 224, onAt: 0.5, offAt: 1.9, squash: 0.0005, onColor: "#8b7bff", offColor: "#2a3142", ...CD },
    demo: { ...BTN(`<div class="tm"><span class="tm-off">TẮT</span><span class="tm-on">BẬT</span><div class="tm-k"><svg viewBox="0 0 100 100"><path d="M28 52 L44 67 L73 36" fill="none" stroke="#8b7bff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>`,
      `.tm { position: relative; width: 480px; height: 224px; border-radius: 112px; background: #2a3142; } .tm-k { position: absolute; left: 24px; top: 24px; width: 176px; height: 176px; border-radius: 50%; background: #fff; box-shadow: 0 10px 24px rgba(0,0,0,0.35); } .tm-k svg { width: 100%; height: 100%; }
.tm span { position: absolute; top: 0; line-height: 224px; font-size: 48px; font-weight: 900; letter-spacing: 0.06em; } .tm-off { right: 52px; color: #8f9ab3; } .tm-on { left: 52px; color: #fff; opacity: 0; }`),
      run: `MW.uiToggleMorph(q(".tm"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3 },
  }),

  T("ui/accordion-open", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var body = el.querySelector(o.body), inner = body.firstElementChild, io = gsap.parseEase(o.ease), Hh = inner ? inner.offsetHeight : body.scrollHeight; body.style.overflow = "hidden";
      return MW.drive(tl, at, o.period * o.cycles, function (t) {
        var u = (t % o.period) / o.period, p = io(Math.max(0, Math.min(1, (u - o.open[0]) / (o.open[1] - o.open[0])))) * (1 - io(Math.max(0, Math.min(1, (u - o.close[0]) / (o.close[1] - o.close[0])))));
        body.style.height = (Hh * p).toFixed(1) + "px"; body.style.opacity = String(p);
      });
    },
    options: { body: "the part that opens (its first child is measured)", open: "[from, to] share of the loop ([0.08, 0.47])", close: "[from, to] ([0.86, 1])", period: "s per loop (1.6)", cycles: "(2)", ease: "(power2.inOut)" },
    defaults: { body: ".ac-b", open: [0.08, 0.47], close: [0.86, 1], period: 1.6, cycles: 2, ease: "power2.inOut" },
    notes: "Real height, not a stretch: the text keeps its shape and the next section is pushed down.",
    demo: { ...ui(`<div class="ui-card ac"><div class="ac-h">Cách đặt lịch quay<span>+</span></div><div class="ac-b"><div><p>Chọn ngày trống trong lịch của đội.</p><p>Gửi kịch bản trước hai ngày.</p><p>Xác nhận địa điểm với khách.</p></div></div><div class="ac-h ac-n">Câu hỏi tiếp theo<span>+</span></div></div>`,
      `.ac { width: 900px; box-sizing: border-box; padding: 30px 50px; } .ac-h { display: flex; justify-content: space-between; font-size: 46px; font-weight: 800; padding: 26px 0; } .ac-h span { color: #8b7bff; } .ac-n { border-top: 3px solid #262c3a; color: #9aa3b8; }
.ac-b { height: 0; opacity: 0; } .ac-b p { margin: 0 0 18px; font-size: 34px; color: #c9d2ea; } .ac-b > div { padding-bottom: 20px; }`),
      run: `MW.uiAccordionOpen(q(".ac"), tl, 0, {});`, duration: 3.2 },
  }),

  T("ui/hover-fill", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), io = gsap.parseEase("power2.inOut"), lb = el.querySelector(o.label);
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      var lay = document.createElement("div"); lay.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;background:" + o.accent + ";color:" + o.ink + ";"; lay.appendChild(lb.cloneNode(true)); el.appendChild(lay);
      var bx = el.offsetLeft + el.offsetWidth / 2, by = el.offsetTop + el.offsetHeight / 2, M = function (p) { return [bx + (p[1] - 160) * o.unit, by + (p[2] - 100) * o.unit]; };
      var keys = o.path.map(function (p) { var m = M(p); return [p[0], m[0], m[1]]; }), loc = function (t) { var p = MW.path(keys, t, io); return [p[0] - el.offsetLeft, p[1] - el.offsetTop]; }, ein = loc(o.enter), eout = loc(o.leave);
      return MW.drive(tl, at, keys[keys.length - 1][0], function (t) {
        var r, c; if (t < o.leave) { r = o.radius * p2(Math.max(0, Math.min(1, (t - o.enter - 0.02) / o.grow))); c = ein; } else { r = o.radius * (1 - pin(Math.min(1, (t - o.leave) / o.shrink))); c = eout; }
        lay.style.clipPath = "circle(" + Math.max(0, r).toFixed(1) + "px at " + c[0].toFixed(1) + "px " + c[1].toFixed(1) + "px)";
        if (cur) { var q = MW.path(keys, t, io); gsap.set(cur, { x: q[0] - 12, y: q[1] - 6 }); }
      });
    },
    options: { radius: "px (680)", grow: "s (0.62, power2.out)", shrink: "s (0.44, power2.in)", enter: "s the cursor enters (0.56)", leave: "s it leaves (1.86)", path: "[[s, x, y], ...] cursor keys in the 320 frame, the button at its centre", unit: "px per reference unit (4)", label: "", accent: "", ink: "label colour inside the fill", cursor: "an optional cursor" },
    defaults: { radius: 680, grow: 0.62, shrink: 0.44, enter: 0.56, leave: 1.86, path: [[0, 100, 186], [0.2, 100, 186], [0.6, 122, 120], [0.9, 146, 106], [1.7, 150, 104], [2.05, 252, 60], [2.3, 266, 176], [2.6, 100, 186]], unit: 4, label: "span", accent: "#8b7bff", ink: "#0b0d12", cursor: null },
    demo: { ...BTN(`<div class="b b-out hf" style="width:560px;height:192px;border-radius:96px;border-width:6px;padding:0"><span>Xem ngay</span></div>`), run: `MW.uiHoverFill(q(".hf"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("ui/menu-to-close", {
    uses: U,
    fn: mk(`var bars = Array.prototype.slice.call(el.querySelectorAll(o.bars)), io = gsap.parseEase(o.ease); cursorPlan(o.clicks.map(function (c) { return [c, 0.5, 0.5, 0.12]; }));
return MW.drive(tl, at, o.clicks[1] + 0.05 + o.duration + 0.6, function (t) {
  var a = io(Math.max(0, Math.min(1, (t - o.clicks[0] - 0.05) / o.duration))), b = io(Math.max(0, Math.min(1, (t - o.clicks[1] - 0.05) / o.duration))), p = a - b;
  var mid = 1 - Math.min(1, p / 0.4), move = Math.min(1, p / 0.5), rot = Math.max(0, (p - 0.5) / 0.5);
  gsap.set(bars[1], { scaleX: mid }); bars[1].style.opacity = String(mid); gsap.set(bars[0], { y: -o.gap * (1 - move), rotation: o.angle * rot }); gsap.set(bars[2], { y: o.gap * (1 - move), rotation: -o.angle * rot });
  cursorAt(t);
});`),
    options: { bars: "the three bars, top to bottom", gap: "px between bars (42)", angle: "degrees (45)", duration: "s (0.56, power2.inOut)", ease: "", clicks: "[s open, s close]", ...CO },
    defaults: { bars: ".mc i", gap: 42, angle: 45, duration: 0.56, ease: "power2.inOut", clicks: [0.45, 1.55], ...CD },
    notes: "The middle bar shrinks away in the first 40 %; the outer bars meet in the first half and turn ±45° in the second.",
    demo: { ...BTN(`<div class="mc"><i></i><i></i><i></i></div>`, `.mc { position: relative; width: 264px; height: 264px; border-radius: 50%; background: #151a24; border: 4px solid #2a3350; box-sizing: border-box; } .mc i { position: absolute; left: 50%; top: 50%; width: 132px; height: 15px; margin: -7.5px 0 0 -66px; border-radius: 8px; background: #e8ebf3; }`),
      run: `MW.uiMenuToClose(q(".mc"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.8 },
  }),

  T("card/cursor-spotlight", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, si = gsap.parseEase("sine.inOut"), L = 70, Tp = 34, W = 180, H = 132, dt = 1 / 120, C = function (t) { return MW.path(o.path, t, si); };
      return MW.drive(tl, at, o.path[o.path.length - 1][0], function (t) {
        var g = C(0).slice(), a = 0, k = 1 - Math.exp(-dt / o.lag); for (var s = 0; s < t; s += dt) { var p = C(s), inside = p[0] > L && p[0] < L + W && p[1] > Tp && p[1] < Tp + H; g[0] += (p[0] - g[0]) * k; g[1] += (p[1] - g[1]) * k; a += ((inside ? o.opacity : 0) - a) * k; }
        S.clear(); c.save(); MW.rr(c, L, Tp, W, H, 14); c.fillStyle = "#121722"; c.fill(); c.clip();
        if (a > 0.005) { var rg = c.createRadialGradient(g[0], g[1], 0, g[0], g[1], o.radius); rg.addColorStop(0, "rgba(139,123,255," + a.toFixed(3) + ")"); rg.addColorStop(1, "rgba(139,123,255,0)"); c.fillStyle = rg; c.fillRect(L, Tp, W, H); }
        MW.txt(c, o.title, L + 16, Tp + 24, 11, "#e8ebf3", 800, "left"); c.fillStyle = "#2a3350"; [140, 120, 150, 90].forEach(function (w, i) { MW.rr(c, L + 16, Tp + 44 + i * 14, w, 5, 2.5); c.fill(); }); c.restore();
        c.strokeStyle = "#262c3a"; c.lineWidth = 1; MW.rr(c, L, Tp, W, H, 14); c.stroke(); var m = C(t); MW.cursor(c, m[0], m[1], 1);
      });
    },
    options: { radius: "units (92)", opacity: "while the cursor is over the card (0.55)", lag: "s of smoothing (0.09)", path: "[[s, x, y], ...] cursor keys, sine.inOut legs", title: "" },
    defaults: { radius: 92, opacity: 0.55, lag: 0.09, path: [[0, 296, 184], [0.3, 296, 184], [0.8, 214, 128], [1.4, 108, 70], [2, 196, 140], [2.5, 140, 90], [3, 30, 180], [3.4, 296, 184]], title: "Gói Doanh nghiệp" },
    demo: CV("cardCursorSpotlight", 3.4),
  }),

  T("motion/drag-snap", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, io = gsap.parseEase("power2.inOut"), cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      var K = [[0, o.from[0], o.from[1], o.from[2]], [o.duration * 0.68, o.over[0], o.over[1], o.over[2]], [o.duration, o.to[0], o.to[1], o.to[2]]];
      var P = function (t) { if (t <= 0) return K[0].slice(1); for (var i = 1; i < K.length; i++) if (t <= K[i][0]) { var a = K[i - 1], b = K[i], f = io((t - a[0]) / (b[0] - a[0])); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; } return K[K.length - 1].slice(1); };
      return MW.drive(tl, at, o.backAt == null ? o.duration + 0.5 : o.backAt + 0.6, function (t) {
        var p = P(t); if (o.backAt != null && t > o.backAt) { var b = io(Math.min(1, (t - o.backAt) / 0.6)); p = [o.to[0] + (o.from[0] - o.to[0]) * b, o.to[1] + (o.from[1] - o.to[1]) * b, o.to[2] + (o.from[2] - o.to[2]) * b]; }
        gsap.set(el, { x: p[0], y: p[1], rotation: p[2] });
        if (cur) { var held = t > -0.05 && t < o.duration, q = held || t >= o.duration ? p : P(0), off = t < 0 ? 0 : 0, lift = t >= o.duration ? Math.min(1, (t - o.duration) / 0.4) : 0; gsap.set(cur, { x: cx + q[0] - 12 + 160 * lift, y: cy + q[1] - 6 + 120 * lift + off, scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { from: "[x, y, degrees] at the start slot ([−360, 150, −8])", over: "[x, y, degrees] past the end slot at 68 % ([290, −125, 5])", to: "[x, y, degrees] in the end slot ([255, −100, 0])", duration: "s (0.82), each leg ease-in-out", backAt: "s after the start to return (null)", cursor: "an optional cursor that carries it" },
    defaults: { from: [-360, 150, -8], over: [290, -125, 5], to: [255, -100, 0], duration: 0.82, backAt: null, cursor: null },
    demo: { ...ui(`<div class="ds-w"><div class="ds-s" style="left:240px;top:470px"></div><div class="ds-s" style="left:855px;top:220px"></div><svg class="ds-a" viewBox="0 0 1200 760"><path d="M470 470 Q640 300 820 300" fill="none" stroke="#3a4466" stroke-width="6" stroke-dasharray="16 14"/></svg><div class="ds">KÉO THẢ</div>${CURSOR}</div>`,
      `.ds-w { position: relative; width: 1200px; height: 760px; } .ds-s { position: absolute; width: 290px; height: 140px; border-radius: 30px; border: 5px dashed #3a4466; box-sizing: border-box; } .ds-a { position: absolute; inset: 0; }
.ds { position: absolute; left: 455px; top: 310px; width: 290px; height: 140px; border-radius: 30px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 48px; font-weight: 900; color: #fff; box-shadow: 0 30px 60px rgba(0,0,0,0.4); }`),
      run: `MW.motionDragSnap(q(".ds"), tl, 0.4, { backAt: 1.7, cursor: ".ui-cursor" });`, duration: 2.9 },
  }),

  T("motion/card-fan", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var cards = Array.prototype.slice.call(el.querySelectorAll(o.cards)), n = cards.length, soft = MW.spring(o.k, o.c[0]), top = MW.spring(o.k, o.c[1]), io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.closeAt + o.close + 0.2, function (t) {
        var cl = io(Math.max(0, Math.min(1, (t - o.closeAt) / o.close)));
        cards.forEach(function (cd, k) { var side = (n - 1) / 2 - k, st = o.start + k * o.each, sp = k === n - 1 ? top : soft, v = t > st ? sp.at(t - st) : 0; v *= 1 - cl; gsap.set(cd, { x: side * o.spread * v, rotation: side * o.angle * v }); });
      });
    },
    options: { cards: "cards from the bottom of the stack to the top", spread: "px (280)", angle: "degrees (18)", start: "s (0.3)", each: "s between cards (0.06; the top card last)", k: "spring stiffness (220)", c: "[others, top card] damping ([22, 12]: only the top card overshoots)", closeAt: "s (2.3)", close: "s (0.4, power2.inOut)" },
    defaults: { cards: ".cf-c", spread: 280, angle: 18, start: 0.3, each: 0.06, k: 220, c: [22, 12], closeAt: 2.3, close: 0.4 },
    demo: { css: `${BG}\n${ST} .cf { position: relative; width: 320px; height: 440px; } .cf-c { position: absolute; inset: 0; border-radius: 40px; box-shadow: 0 30px 70px rgba(0,0,0,0.45); display: grid; place-items: end start; padding: 34px; box-sizing: border-box; font-size: 40px; font-weight: 800; }
.cf-c:nth-child(1) { background: #e8ebf3; color: #1b1440; } .cf-c:nth-child(2) { background: #3d9bff; color: #fff; } .cf-c:nth-child(3) { background: linear-gradient(150deg, #a693ff, #6a4cf0); color: #fff; }`,
      html: `<div class="st"><div class="cf"><div class="cf-c">Ba lô</div><div class="cf-c">Giày</div><div class="cf-c">Mũ</div></div></div>`, run: `MW.motionCardFan(q(".cf"), tl, 0, {});`, duration: 3 },
  }),

  T("ui/tooltip-pop", {
    uses: U,
    fn: mk(`var icon = o.icon ? host.querySelector(o.icon) : null, p2 = gsap.parseEase("power2.out"); gsap.set(el, { transformOrigin: o.origin });
cursorPlan([[o.showAt - 0.05, 0.5, 0.5, o.hideAt - o.showAt, icon || el, true]]);
return MW.drive(tl, at, o.hideAt + o.hide + 0.6, function (t) {
  var a = p2(Math.max(0, Math.min(1, (t - o.showAt) / o.show))), h = Math.max(0, Math.min(1, (t - o.hideAt) / o.hide)); gsap.set(el, { scale: 0.9 + 0.1 * a }); el.style.opacity = String(a * (1 - h)); cursorAt(t);
});`),
    options: { showAt: "s (0.6)", show: "s (0.2, power2.out)", hideAt: "s (1.8)", hide: "s (0.12)", origin: "transform origin: the arrow tip", icon: "the icon it points at", ...CO },
    defaults: { showAt: 0.6, show: 0.2, hideAt: 1.8, hide: 0.12, origin: "50% 100%", icon: ".tp-i", ...CD },
    demo: { ...BTN(`<div class="tp-f"><div class="ui-field" style="width:600px">Mã giới thiệu</div><div class="tp-i">?</div><div class="tp">Mã do bạn bè gửi cho bạn</div></div>`,
      `.tp-f { position: relative; display: flex; align-items: center; gap: 30px; } .tp-i { width: 112px; height: 112px; border-radius: 50%; border: 5px solid #8b7bff; box-sizing: border-box; display: grid; place-items: center; font-size: 56px; font-weight: 900; color: #a99bff; }
.tp { position: absolute; right: -170px; bottom: 150px; width: 560px; padding: 30px 0; border-radius: 28px; background: #e8ebf3; color: #1b1440; font-size: 34px; font-weight: 700; text-align: center; opacity: 0; } .tp::after { content: ""; position: absolute; left: 50%; bottom: -18px; margin-left: -18px; border: 18px solid transparent; border-bottom: 0; border-top-color: #e8ebf3; }`),
      run: `MW.uiTooltipPop(q(".tp"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("ui/cursor-path", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var items = Array.prototype.slice.call(el.querySelectorAll(o.items)), cur = o.cursor ? (el.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, base = el.getBoundingClientRect();
      var pts = items.map(function (it) { var r = it.getBoundingClientRect(); return [r.left - base.left + r.width / 2, r.top - base.top + r.height / 2]; }), start = [pts[0][0] + 520, pts[0][1] + 360], sm = function (x) { return x * x * (3 - 2 * x); };
      return MW.drive(tl, at, items.length * o.cycle + 0.3, function (t) {
        var k = Math.min(items.length - 1, Math.floor(t / o.cycle)), u = t - k * o.cycle, a = k ? pts[k - 1] : start, b = pts[k], q = sm(Math.min(1, u / o.move)), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * q) * o.arc * L;
        var x = a[0] + dx * q - dy / L * off, y = a[1] + dy * q + dx / L * off, pr = u > o.move + o.pause && u < o.move + o.pause + o.press;
        items.forEach(function (it, i) { var done = t >= i * o.cycle + o.move + o.pause; it.style.background = done ? o.accent : ""; it.style.color = done ? "#fff" : ""; });
        if (cur) gsap.set(cur, { x: x - 12, y: y - 6, scale: pr ? 0.85 : 1, transformOrigin: "20% 10%" });
      });
    },
    options: { items: "the targets in order", cycle: "s per target (1)", move: "s (0.7, smoothstep)", arc: "sideways bow as a share of the move (0.12)", pause: "s before the press (0.05)", press: "s (0.1)", accent: "fill of a pressed target", cursor: "the cursor" },
    defaults: { items: ".cp-t", cycle: 1, move: 0.7, arc: 0.12, pause: 0.05, press: 0.1, accent: "#8b7bff", cursor: ".ui-cursor" },
    notes: "The recipe: 0.9 s moves (power2.inOut) on an arc of 0.06 × the distance, a 0.1 s pause, then the click.",
    demo: { ...ui(`<div class="cp">${[[300, 300], [1250, 400], [600, 750]].map(([x, y], i) => `<div class="cp-t" style="left:${x - 130}px;top:${y - 70}px">Mục ${i + 1}</div>`).join("")}${CURSOR}</div>`,
      `.cp { position: absolute; inset: 0; } .cp-t { position: absolute; width: 260px; height: 140px; border-radius: 32px; background: #1b2130; border: 4px solid #2a3350; box-sizing: border-box; display: grid; place-items: center; font-size: 40px; font-weight: 800; color: #c9d2ea; }`),
      run: `MW.uiCursorPath(q(".cp"), tl, 0, {});`, duration: 3.3 },
  }),
];
