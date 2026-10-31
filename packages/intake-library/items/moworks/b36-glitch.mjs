// Distortion & Glitch (batch 3.6): colour-split bands, slice jolts, fuzzy rows, turbulence, ASCII, VHS, mosaic and melt, on copies of the
// text or on the text drawn to a canvas (seeded per frame, so every render is the same); written here.
import { T } from "../../moworks/define.mjs";
import { headline, demo } from "../../moworks/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }`;
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
// copies of the element laid over it, and the element's text drawn into a canvas over its box (with a margin)
const CL = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var clone = function () { var g = el.cloneNode(true), br = el.getBoundingClientRect(); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.boxSizing = "border-box";
  g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = (br.width + 0.5) + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el.nextSibling); return g; };
var raster = function (m) { var cs = getComputedStyle(el), W = el.offsetWidth + 2 * m, Hh = el.offsetHeight + 2 * m, cv = document.createElement("canvas"), off = document.createElement("canvas"); cv.width = off.width = W; cv.height = off.height = Hh;
  cv.style.cssText = "position:absolute;pointer-events:none;left:" + (el.offsetLeft - m) + "px;top:" + (el.offsetTop - m) + "px;width:" + W + "px;height:" + Hh + "px;"; host.insertBefore(cv, el.nextSibling);
  var g = off.getContext("2d"); g.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily; g.fillStyle = cs.color; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(el.textContent, W / 2, Hh / 2 + parseFloat(cs.fontSize) * 0.04);
  el.style.visibility = "hidden"; return { cv: cv, c: cv.getContext("2d"), off: off, W: W, H: Hh, fs: parseFloat(cs.fontSize), font: g.font }; };`;
const mk = (body) => new Function("el", "tl", "at", "o", CL + "\n" + body);

export default [
  T("text/rgb-split-glitch", {
    uses: ["drive", "rand"],
    fn: mk(`var R = clone(), C = clone(); [[R, o.colors[0]], [C, o.colors[1]]].forEach(function (q) { q[0].style.color = q[1]; q[0].style.webkitTextFillColor = q[1]; q[0].style.mixBlendMode = "screen"; q[0].style.opacity = "0"; });
var inBurst = function (t) { return o.bursts.some(function (b) { return t >= b[0] && t < b[1]; }); };
return MW.drive(tl, at, o.loop, function (t) {
  var f = Math.floor(t * o.fps), r = MW.rand(o.seed * 991 + f * 7), on = inBurst(t) && r() < 0.7;
  if (!on) { R.style.opacity = C.style.opacity = "0"; gsap.set(el, { x: 0, y: 0 }); return; }
  var h1 = o.band[0] + r() * (o.band[1] - o.band[0]), t1 = r() * (50 - h1), h2 = o.band[0] + r() * (o.band[1] - o.band[0]), t2 = 50 + r() * (50 - h2), d1 = o.shift[0] + r() * (o.shift[1] - o.shift[0]), d2 = o.shift[0] + r() * (o.shift[1] - o.shift[0]);
  R.style.clipPath = "inset(" + t1.toFixed(1) + "% 0 " + (100 - t1 - h1).toFixed(1) + "% 0)"; C.style.clipPath = "inset(" + t2.toFixed(1) + "% 0 " + (100 - t2 - h2).toFixed(1) + "% 0)"; gsap.set(R, { x: -d1 }); gsap.set(C, { x: d2 }); R.style.opacity = C.style.opacity = "1";
  gsap.set(el, { x: (r() * 2 - 1) * o.jitter, y: (r() * 2 - 1) * o.jitter });
});`),
    options: { colors: "[red, cyan]", band: "[min, max] % of the height ([6, 22])", shift: "[min, max] px ([16, 48])", jitter: "± px (8)", bursts: "[[from, to] s, ...] ([[0.35, 1.05], [2.4, 2.78]])", fps: "updates a second (12)", seed: "(3)", loop: "s (3)" },
    defaults: { colors: ["#ff3060", "#00e0ff"], band: [6, 22], shift: [16, 48], jitter: 8, bursts: [[0.35, 1.05], [2.4, 2.78]], fps: 12, seed: 3, loop: 3 },
    notes: "In a burst about 70 % of frames glitch: a red band in the upper half, a cyan band in the lower, shifted opposite ways.",
    demo: H("LỖI TÍN HIỆU", `MW.textRgbSplitGlitch(q(".tk-head"), tl, 0, {});`, 3, { size: 200, weight: 900 }),
  }),

  T("text/slice-glitch", {
    uses: ["drive", "rand"],
    fn: mk(`var n = o.slices, S = []; for (var i = 0; i < n; i++) { var g = clone(); g.style.opacity = "0"; S.push(g); } var col = getComputedStyle(el).color;
return MW.drive(tl, at, o.loop, function (t) {
  var step = Math.floor(t / o.step), grp = Math.floor(step / o.group), rg = MW.rand(o.seed * 31 + grp), burst = o.bursts.some(function (b) { return t >= b[0] && t < b[1]; }) && rg() > o.chance;
  if (!burst) { S.forEach(function (g) { g.style.opacity = "0"; }); el.style.opacity = "1"; return; }
  el.style.opacity = String(o.ghost); var cuts = [0]; for (var k = 1; k < n; k++) cuts.push((k + (rg() * 2 - 1) * 0.35) / n * 100); cuts.push(100);
  var rs = MW.rand(o.seed * 7 + step), sh = S.map(function () { var v = rs(); return v > 0.45 ? (rs() * 2 - 1) * o.offset : 0; });
  var mx = 0; sh.forEach(function (d, i) { if (Math.abs(d) > Math.abs(sh[mx])) mx = i; });
  S.forEach(function (g, i) { g.style.clipPath = "inset(" + cuts[i].toFixed(1) + "% 0 " + (100 - cuts[i + 1]).toFixed(1) + "% 0)"; gsap.set(g, { x: sh[i] }); g.style.opacity = "1"; g.style.color = i === mx && sh[i] ? o.accent : col; g.style.webkitTextFillColor = i === mx && sh[i] ? o.accent : col; });
});`),
    options: { slices: "(7)", offset: "± px (96)", step: "s per update (0.067: 15 a second)", group: "updates per burst decision (4)", chance: "a group bursts above this seed (0.25)", ghost: "opacity of the clean text underneath (0.18)", bursts: "[[from, to] s, ...]", accent: "the most shifted slice", seed: "(5)", loop: "s (3)" },
    defaults: { slices: 7, offset: 96, step: 0.067, group: 4, chance: 0.25, ghost: 0.18, bursts: [[0.3, 1.15], [2.25, 2.75]], accent: "#ff5d8f", seed: 5, loop: 3 },
    demo: H("XÔ LỆCH", `MW.textSliceGlitch(q(".tk-head"), tl, 0, {});`, 3, { size: 240, weight: 900 }),
  }),

  T("text/fuzzy-text", {
    uses: ["drive", "rand"],
    fn: mk(`var Rr = raster(o.range), c = Rr.c, p3 = gsap.parseEase("power3.out"), row = o.row;
return MW.drive(tl, at, o.loop, function (t) {
  var f = Math.floor(t * 60), r = MW.rand(o.seed + f), k = o.rest + (o.hover - o.rest) * (p3(Math.max(0, Math.min(1, (t - o.on[0]) / (o.on[1] - o.on[0])))) - Math.max(0, Math.min(1, (t - o.off[0]) / (o.off[1] - o.off[0])))); c.clearRect(0, 0, Rr.W, Rr.H);
  for (var y = 0; y < Rr.H; y += row) { var dx = (r() - 0.5) * k * o.range; c.drawImage(Rr.off, 0, y, Rr.W, row, dx, y, Rr.W, row); }
});`),
    options: { range: "px at intensity 1 (120)", rest: "intensity at rest (0.18)", hover: "intensity on the beat (0.5)", on: "[from, to] s it ramps up ([0.75, 1.05])", off: "[from, to] s back ([1.95, 2.3])", row: "px per row (2)", seed: "(9)", loop: "s (3.2)" },
    defaults: { range: 120, rest: 0.18, hover: 0.5, on: [0.75, 1.05], off: [1.95, 2.3], row: 2, seed: 9, loop: 3.2 },
    notes: "Every row of pixels is offset by a fresh seeded amount each frame (60 a second).",
    demo: H("404", `MW.textFuzzyText(q(".tk-head"), tl, 0, {});`, 3.2, { size: 380, weight: 900, sub: "Không tìm thấy trang" }),
  }),

  T("text/turbulence-wobble", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      window.__mwTurb = (window.__mwTurb || 0) + 1; var id = "mw-turb-" + window.__mwTurb, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), si = gsap.parseEase("sine.inOut");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute"; svg.innerHTML = '<filter id="' + id + '" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="turbulence" baseFrequency="' + o.freq + '" numOctaves="' + o.octaves + '" seed="0" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>'; document.body.appendChild(svg);
      var tb = svg.querySelector("feTurbulence"), dm = svg.querySelector("feDisplacementMap"); el.style.filter = "url(#" + id + ")";
      return MW.drive(tl, at, o.loop, function (t) { var s = o.scale * (si(Math.max(0, Math.min(1, (t - o.in[0]) / (o.in[1] - o.in[0])))) - si(Math.max(0, Math.min(1, (t - o.out[0]) / (o.out[1] - o.out[0]))))); tb.setAttribute("seed", String(Math.floor(t * o.rate) % 10)); dm.setAttribute("scale", s.toFixed(2)); });
    },
    options: { freq: "turbulence base frequency (0.008 for large type; 0.02 at UI size)", octaves: "(2)", scale: "px of displacement at full (36)", rate: "new poses a second (10)", in: "[from, to] s it ramps up ([0.3, 0.8])", out: "[from, to] s back ([2.4, 2.85])", loop: "s (3)" },
    defaults: { freq: 0.008, octaves: 2, scale: 36, rate: 10, in: [0.3, 0.8], out: [2.4, 2.85], loop: 3 },
    demo: H("Nét vẽ sôi", `MW.textTurbulenceWobble(q(".tk-head"), tl, 0, {});`, 3, { size: 220, weight: 900 }),
  }),

  T("text/ascii-text", {
    uses: ["drive", "rand"],
    fn: mk(`var Rr = raster(20), c = Rr.c, cw = o.cell[0], chh = o.cell[1], cols = Math.ceil(Rr.W / cw), rows = Math.ceil(Rr.H / chh), img = Rr.off.getContext("2d").getImageData(0, 0, Rr.W, Rr.H).data, L = [], cs = o.charset, r0 = MW.rand(o.seed), N = [];
for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { var s = 0, k = 0; for (var yy = y * chh; yy < Math.min(Rr.H, (y + 1) * chh); yy += 2) for (var xx = x * cw; xx < Math.min(Rr.W, (x + 1) * cw); xx += 2) { s += img[(yy * Rr.W + xx) * 4 + 3]; k++; } L.push(Math.round((s / Math.max(1, k)) / 255 * (cs.length - 1))); N.push(r0()); }
var g = c.createLinearGradient(0, 0, Rr.W, 0); g.addColorStop(0, o.colors[0]); g.addColorStop(1, o.colors[1]);
return MW.drive(tl, at, o.loop, function (t) {
  c.clearRect(0, 0, Rr.W, Rr.H); c.font = "700 " + Math.round(chh * 1.05) + "px 'JetBrains Mono', monospace"; c.fillStyle = g; c.textBaseline = "top"; var fr = Math.floor(t * o.fps), rf = MW.rand(o.seed * 17 + fr), ph = 2 * Math.PI * 2 * t / o.loop;
  for (var y = 0; y < rows; y++) { var dx = o.wave * Math.sin(0.45 * y + ph); for (var x = 0; x < cols; x++) { var i = y * cols + x, lv = L[i]; if (lv <= 0) continue; var rev = (t - 0.3) / 0.9 - (x / cols * 0.8 + N[i] * 0.2), dis = (t - 2.6) / 0.5 - (N[i] * 0.8 + 0.2 * x / cols); if (rev < 0 || dis > 0) continue; if (rf() < 0.1) lv = Math.min(cs.length - 1, lv + 1); c.fillText(cs[lv], x * cw + dx, y * chh); } }
});`),
    options: { cell: "[w, h] px per character ([12, 17])", charset: "light to dense (' .:-=+*#%@')", wave: "± px of row ripple (8)", fps: "refresh a second (12)", colors: "[left, right] of the fill gradient", seed: "(4)", loop: "s (3.4)" },
    defaults: { cell: [12, 17], charset: " .:-=+*#%@", wave: 8, fps: 12, colors: ["#3dd6f5", "#a693ff"], seed: 4, loop: 3.4 },
    notes: "Cells switch on left to right with seeded noise over 0.3–1.2 s and dissolve 2.6–3.1 s; about one in ten flickers a level up each refresh.",
    demo: H("MÃ HOÁ", `MW.textAsciiText(q(".tk-head"), tl, 0, {});`, 3.4, { size: 300, weight: 900 }),
  }),

  T("effect/vhs-tracking", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var pic = o.picture ? el.querySelector(o.picture) : null, title = o.title ? el.querySelector(o.title) : null, sc = document.createElement("div"), cv = document.createElement("canvas"), bar = document.createElement("div"), W = el.clientWidth, Hh = el.clientHeight;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      sc.style.cssText = "position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg, rgba(0,0,0," + o.scan + ") 0 2px, transparent 2px 4px);z-index:5;"; el.appendChild(sc);
      cv.width = W; cv.height = Hh; cv.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;"; el.appendChild(cv); var c = cv.getContext("2d");
      bar.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:0;background:#000;z-index:7;"; el.appendChild(bar);
      var J = [-28, 16, -8, 4];
      return MW.drive(tl, at, o.loop, function (t) {
        sc.style.backgroundPosition = "0 " + (Math.floor(t * 30) % 2 ? 2 : 0) + "px";
        var jf = Math.floor((t - o.jumpAt) * 24), jy = jf >= 0 && jf < 4 ? J[jf] : 0; if (pic) gsap.set(pic, { y: jy }); bar.style.height = jy ? Math.abs(jy) + 12 + "px" : "0";
        if (title) { var ch = jy ? 16 : 8; title.style.textShadow = (-ch) + "px 0 0 rgba(255,40,80,0.75), " + ch + "px 0 0 rgba(0,224,255,0.75)"; }
        c.clearRect(0, 0, W, Hh); var bh = o.band * Hh, by = ((t % o.roll) / o.roll) * (Hh + bh) - bh, f = Math.floor(t * 24), r = MW.rand(o.seed + f);
        for (var k = 0; k < 4; k++) { var y = by + k * bh / 4, dx = (r() * 2 - 1) * 28; c.fillStyle = "rgba(255,255,255," + (0.06 + 0.06 * r()).toFixed(3) + ")"; c.fillRect(dx, y, W, bh / 4); for (var d = 0; d < 14; d++) { c.fillStyle = "rgba(255,255,255," + (0.4 + 0.5 * r()).toFixed(3) + ")"; c.fillRect(r() * W, y + r() * bh / 4, 20 + r() * 60, 2); } }
      });
    },
    options: { picture: "the picture that jumps", title: "text that gets the colour bleed", scan: "scanline darkness (0.38)", band: "noise band as a share of the height (0.09)", roll: "s per pass (3)", jumpAt: "s the frame jumps (1.6)", seed: "(7)", loop: "s (3)" },
    defaults: { picture: ".vh-p", title: ".vh-t", scan: 0.38, band: 0.09, roll: 3, jumpAt: 1.6, seed: 7, loop: 3 },
    assets: [{ path: "shot.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.vh { position: absolute; inset: 0; overflow: hidden; } .vh-p { position: absolute; inset: -20px 0; background: url(assets/shot.svg) center / cover; filter: saturate(0.8) contrast(1.05); }
.vh-t { position: absolute; left: 0; right: 0; top: 380px; text-align: center; font-size: 150px; font-weight: 900; color: #fff; } .vh-c { position: absolute; left: 80px; top: 70px; font-family: 'JetBrains Mono', monospace; font-size: 54px; font-weight: 700; color: #fff; text-shadow: 3px 3px 0 #000; }
.vh-c i { display: inline-block; width: 0; height: 0; border-left: 36px solid #fff; border-top: 22px solid transparent; border-bottom: 22px solid transparent; margin-right: 24px; vertical-align: -6px; }`,
      html: `<div class="vh"><div class="vh-p"></div><div class="vh-t">Kỷ niệm 1998</div><div class="vh-c"><i></i>PLAY  00:12:34</div></div>`, run: `MW.effectVhsTracking(q(".vh"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/pixel-mosaic", {
    uses: ["drive"],
    fn: mk(`var Rr = raster(10), c = Rr.c, sm = document.createElement("canvas"), g = sm.getContext("2d");
var B = function (t) { var steps = o.blocks, n = steps.length; if (o.exitAt != null && t >= o.exitAt) { var k = Math.floor((t - o.exitAt) / o.exitStep); return steps[Math.max(0, n - 1 - Math.min(n - 1, k))]; } if (t < o.start) return steps[0]; var j = Math.floor((t - o.start) / o.step) + 1; return steps[Math.min(n - 1, j)]; };
return MW.drive(tl, at, o.loop, function (t) {
  var b = B(t); c.clearRect(0, 0, Rr.W, Rr.H); if (b <= 1) { c.imageSmoothingEnabled = true; c.drawImage(Rr.off, 0, 0); return; }
  var w = Math.max(1, Math.ceil(Rr.W / b)), h = Math.max(1, Math.ceil(Rr.H / b)); sm.width = w; sm.height = h; g.imageSmoothingEnabled = true; g.clearRect(0, 0, w, h); g.drawImage(Rr.off, 0, 0, w, h); c.imageSmoothingEnabled = false; c.drawImage(sm, 0, 0, w, h, 0, 0, w * b, h * b);
});`),
    options: { blocks: "block sizes in px, coarse to sharp ([96, 48, 24, 12, 6, 1])", start: "s it starts resolving (0.3)", step: "s per step (0.12), hard cuts", exitAt: "s it breaks up again (2.4)", exitStep: "s per step on the way out (0.08)", loop: "s (3.2)" },
    defaults: { blocks: [96, 48, 24, 12, 6, 1], start: 0.3, step: 0.12, exitAt: 2.4, exitStep: 0.08, loop: 3.2 },
    notes: "The small demo's steps are 32 → 1 px on a small frame; here the blocks are scaled to large type. Letters read only in the last two steps.",
    demo: H("RÕ DẦN", `MW.effectPixelMosaic(q(".tk-head"), tl, 0, {});`, 3.2, { size: 260, weight: 900 }),
  }),

  T("text/melt-drip", {
    uses: ["drive", "rand", "noise"],
    fn: mk(`var Rr = raster(0), cs = getComputedStyle(el), fs = Rr.fs, pad = o.drip[1] + 260, cv = Rr.cv; cv.height = Rr.H + pad; cv.style.height = Rr.H + pad + "px"; var c = cv.getContext("2d"), nz = MW.noise(o.seed), r = MW.rand(o.seed + 5), p1 = gsap.parseEase("power1.in");
var g = Rr.off.getContext("2d"); g.font = Rr.font; var txt = el.textContent, x0 = Rr.W / 2 - g.measureText(txt).width / 2, chars = [], acc = 0; Array.from(txt.normalize("NFC")).forEach(function (ch) { var w = g.measureText(ch).width; chars.push({ a: x0 + acc, b: x0 + acc + w, st: 0 }); acc += w; });
var ord = chars.map(function (_, i) { return i; }).sort(function () { return r() - 0.5; }); ord.forEach(function (ci, k) { chars[ci].st = o.start + o.spread * k / Math.max(1, chars.length - 1); });
var mid = Rr.H / 2, cut = mid + fs * 0.05, bot = mid + fs * 0.42, D = function (x) { return o.drip[0] + (o.drip[1] - o.drip[0]) * Math.pow((nz(x * 0.11 / 4) + 1) / 2, 1.8); };
chars.forEach(function (q) { var best = 0, bx = q.a; for (var x = q.a; x < q.b; x += 2) { var d = D(x); if (d > best) { best = d; bx = x; } } q.dx = bx; q.dmax = best; });
return MW.drive(tl, at, o.loop, function (t) {
  c.clearRect(0, 0, cv.width, cv.height); var reset = Math.max(0, Math.min(1, (t - o.resetAt) / 0.5)); c.globalAlpha = 1 - Math.sin(Math.PI * reset) * 0.9;
  c.drawImage(Rr.off, 0, 0, Rr.W, cut, 0, 0, Rr.W, cut); var ci = 0;
  for (var x = 0; x < Rr.W; x += 2) { while (ci < chars.length - 1 && x >= chars[ci].b) ci++; var q = chars[ci], m = reset > 0.5 ? 0 : p1(Math.max(0, Math.min(1, (t - q.st) / o.duration))), ext = m * D(x); c.drawImage(Rr.off, x, cut, 2, bot - cut, x, cut, 2, bot - cut + ext); }
  if (reset < 0.5) chars.forEach(function (q) { var u = t - q.st - o.duration * 0.7; if (u <= 0) return; var sw = Math.min(1, u / 0.25), y = bot + q.dmax + (u > 0.25 ? 880 * Math.pow(u - 0.25, 2) : 0); if (y > cv.height) return; c.fillStyle = o.accent; c.beginPath(); c.arc(q.dx + 1, y, 10 * sw, 0, 2 * Math.PI); c.fill(); });
  c.globalAlpha = 1;
});`),
    options: { drip: "[min, max] px of the drips ([32, 264])", duration: "s per letter (1.6, ease-in quad)", spread: "s the letters start within, in a seeded order (0.5)", start: "s (0.3)", resetAt: "s (3.0)", accent: "the falling drops", seed: "(6)", loop: "s (3.8)" },
    defaults: { drip: [32, 264], duration: 1.6, spread: 0.5, start: 0.3, resetAt: 3, accent: "#ff5d8f", seed: 6, loop: 3.8 },
    notes: "The tops stay pinned; only the lower part of each column stretches down by melt × the drip length.",
    demo: H("TAN CHẢY", `MW.textMeltDrip(q(".tk-head"), tl, 0, {});`, 3.8, { size: 230, weight: 900 }, ".tk-head { margin-top: -200px; }"),
  }),
];
