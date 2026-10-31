// 3D, Loading & Data and Variable Fonts (batch 3.7): a spinning cube, a cover flow and a fly-through in CSS 3D; a skeleton shimmer, a
// count-up, a chart line and staggered bars as effects on the page's own elements, and spinners, rings, dots, toasts, a check, a donut and
// an optimistic row drawn on a 320 x 200 frame; and weight, width and slant animations on a variable font (the demos use Roboto Flex,
// bundled from google/fonts); written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, headline, demo } from "../../moworks/stages.mjs";
import { ABSTRACT, LANDSCAPE, PRODUCT } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration) => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, {});`, duration });
const U = ["drive", "draw", "rand", "spring", "springs", "stage320", "eases"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
var p2io = gsap.parseEase("power2.inOut"), po = gsap.parseEase("power2.out"), pi2 = gsap.parseEase("power2.in"), A = "#8b7bff", G = "#3ddc84";
var hs = function (t, a, d) { var u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }, fr = function (x) { return x - Math.floor(x); };
var mix = function (a, b, u) { u = Math.max(0, Math.min(1, u)); var out = []; for (var i = 0; i < 3; i++) { var x = parseInt(a.substr(1 + 2 * i, 2), 16), y = parseInt(b.substr(1 + 2 * i, 2), 16); out.push(Math.round(x + (y - x) * u)); } return "rgb(" + out.join(",") + ")"; };
var sp = function (k, d) { var s = MW.spring(k, d); return function (t) { return t <= 0 ? 0 : s.at(t); }; };
var card = function (x, y, w, h, r) { MW.rr(c, x, y, w, h, r || 12); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke(); };
var line = function (pts, u, col, w) { if (u <= 0) return; var L = 0, sg = []; for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sg.push(l); L += l; } var left = L * Math.min(1, u); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) { if (left >= sg[i - 1]) { c.lineTo(pts[i][0], pts[i][1]); left -= sg[i - 1]; } else { var q = left / sg[i - 1]; c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * q, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * q); break; } } c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); };
var tickAt = function (x, y, s, u, col, w) { line([[x - 6 * s, y], [x - 2 * s, y + 4 * s], [x + 6 * s, y - 5 * s]], u, col, w || 2.5 * s); };
var cur = function (keys, t, presses) { var p = MW.path(keys, t, "power2.inOut"), d = false; presses.forEach(function (q) { if (t >= q && t < q + 0.1) d = true; }); MW.cursor(c, p[0], p[1], d ? 0.86 : 1); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
const K = (id, d) => T(id, { uses: U, ...d, demo: CV(id.replace(/[/-]([a-z0-9])/g, (m, ch) => ch.toUpperCase()), d.defaults.loop) });
// variable-font helpers: colour mix and the variation string
const VP = `var mix = function (a, b, u) { u = Math.max(0, Math.min(1, u)); var out = []; for (var i = 0; i < 3; i++) { var x = parseInt(a.substr(1 + 2 * i, 2), 16), y = parseInt(b.substr(1 + 2 * i, 2), 16); out.push(Math.round(x + (y - x) * u)); } return "rgb(" + out.join(",") + ")"; };
var fv = function (n, axes) { var s = []; for (var k in axes) s.push('"' + k + '" ' + (+axes[k]).toFixed(2)); n.style.fontVariationSettings = s.join(", "); }, pin = function (u) { return Math.max(0, Math.min(1, u)); };`;
const mv = (body) => new Function("el", "tl", "at", "o", VP + "\n" + body);
const VU = ["drive", "split", "eases", "draw"];
const RF = { font: "Roboto Flex", weight: 400 };
const H = (text, run, duration, opt = {}, css = "") => demo(headline(text, { ...RF, ...opt }), run, duration, `.tk-head { letter-spacing: 0; } ${css}`);
const HC = (text, run, duration, opt = {}, css = "") => { const s = headline(text, { ...RF, ...opt }); return demo({ css: s.css, html: s.html + CURSOR }, run, duration, `.tk-head { letter-spacing: 0; } .ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); } ${css}`); };
const BREATHE = (() => { const d = H("Hít vào thở ra", `MW.textWeightBreathe(q(".tk-head"), tl, 0, { ring: ".br" });`, 6, { size: 190 }, `.br { position: absolute; left: 50%; top: 50%; width: 900px; height: 900px; margin: -450px 0 0 -450px; border-radius: 50%; background: radial-gradient(circle, rgba(139,123,255,0.35), rgba(139,123,255,0) 70%); } .tk-stage > div { position: relative; z-index: 1; }`); return { ...d, html: `<div class="br"></div>${d.html}` }; })();
const PICS = [{ path: "a.svg", data: LANDSCAPE }, { path: "b.svg", data: PRODUCT }, { path: "c.svg", data: ABSTRACT }];
const GRAD = ["linear-gradient(150deg, #a693ff, #6a4cf0)", "linear-gradient(150deg, #3dd6f5, #1580b8)", "linear-gradient(150deg, #ffb18f, #ff6f91)", "linear-gradient(150deg, #75e4d2, #2a8f7f)", "linear-gradient(150deg, #ffd23d, #ff8a3d)"];

export default [
  T("card/cube", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var F = Array.prototype.slice.call(el.querySelectorAll(o.faces)), s = el.offsetWidth, R = [[0, 0], [0, 90], [0, 180], [0, 270], [90, 0], [-90, 0]], host = el.parentNode;
      el.style.transformStyle = "preserve-3d"; host.style.perspective = o.perspective * host.clientWidth + "px";
      F.forEach(function (f, i) { var r = R[i % 6]; f.style.position = "absolute"; f.style.inset = "0"; f.style.backfaceVisibility = "hidden"; f.style.transform = "rotateX(" + r[0] + "deg) rotateY(" + r[1] + "deg) translateZ(" + s / 2 + "px)"; });
      return MW.drive(tl, at, o.duration, function (t) { el.style.transform = "rotateX(" + -o.tilt + "deg) rotateY(" + (360 * t / o.period).toFixed(3) + "deg)"; });
    },
    options: { faces: "the six faces: front, right, back, left, top, bottom", period: "s a turn (4), linear", tilt: "degrees toward the viewer (20; the small demo about 29)", perspective: "× the parent's width (1.1)", duration: "s (8)" },
    defaults: { faces: ".face", period: 4, tilt: 20, perspective: 1.1, duration: 8 },
    assets: PICS,
    demo: { css: `${BG}\n${ST} .cb { position: relative; width: 420px; height: 420px; } .cb .face { border-radius: 26px; background-size: cover; background-position: center; display: grid; place-items: center; font-size: 64px; font-weight: 900; color: #fff; box-shadow: inset 0 0 0 4px rgba(255,255,255,0.18); }`,
      html: `<div class="st"><div class="cb"><div class="face" style="background-image:url(assets/a.svg)"></div><div class="face" style="background:${GRAD[0]}">Ý tưởng</div><div class="face" style="background-image:url(assets/b.svg)"></div><div class="face" style="background:${GRAD[1]}">Dựng</div><div class="face" style="background-image:url(assets/c.svg)"></div><div class="face" style="background:${GRAD[2]}">Xuất</div></div></div>`,
      run: `MW.cardCube(q(".cb"), tl, 0, {});`, duration: 8 },
  }),

  T("motion/cover-flow", {
    uses: ["drive", "springs"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), W = it[0].offsetWidth, Hh = it[0].offsetHeight, sel = MW.springTo(o.stiffness, o.damping, o.keys), cl = function (x) { return Math.max(-1, Math.min(1, x)); };
      el.style.perspective = o.perspective + "px"; el.style.transformStyle = "preserve-3d";
      it.forEach(function (c) { c.style.position = "absolute"; c.style.left = "50%"; c.style.top = "50%"; c.style.margin = -Hh / 2 + "px 0 0 " + -W / 2 + "px"; });
      return MW.drive(tl, at, o.duration, function (t) { var s = sel(t); it.forEach(function (c, i) { var d = i - s, a = Math.abs(d), z = -(o.depth[0] * Math.min(1, a) + (o.depth[1] - o.depth[0]) * Math.max(0, Math.min(1, a - 1)));
        gsap.set(c, { x: d * o.step + cl(d) * o.gap, z: z, rotationY: -cl(d) * o.angle }); c.style.zIndex = String(100 - Math.round(a * 10)); c.style.opacity = String(1 - Math.min(0.6, 0.3 * a)); }); });
    },
    options: { items: "", keys: "[[s, selected index], ...] joined by springs", stiffness: "(200)", damping: "(22)", angle: "degrees, facing the centre (60)", depth: "px back at 1 and 2 steps ([400, 600])", step: "px per card (320)", gap: "px extra beside the centre (110)", perspective: "px (1800)", duration: "s (4.4)" },
    defaults: { items: ".cd", keys: [[0, 1], [0.8, 2], [1.8, 3], [2.8, 2], [3.6, 1]], stiffness: 200, damping: 22, angle: 60, depth: [400, 600], step: 320, gap: 110, perspective: 1800, duration: 4.4 },
    notes: "Opacity 1 − min(0.6, 0.3 |offset|). The small demo moves the selection 0 → 1 → 2 → 1 → 0; here it starts on the second of five cards so both sides show.",
    demo: { css: `${BG}\n.cf { position: absolute; inset: 0; } .cf .cd { width: 340px; height: 460px; border-radius: 30px; box-sizing: border-box; padding: 34px; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 30px 60px rgba(0,0,0,0.45); } .cf .cd b { font-size: 44px; font-weight: 900; color: #fff; } .cf .cd i { font-style: normal; font-size: 28px; color: rgba(255,255,255,0.75); margin-top: 8px; }`,
      html: `<div class="cf">${["Nhịp đêm", "Biển xanh", "Mùa hạ", "Phố cũ", "Bình minh"].map((n, i) => `<div class="cd" style="background:${GRAD[i]}"><b>${n}</b><i>Moworks · ${2022 + i}</i></div>`).join("")}</div>`,
      run: `MW.motionCoverFlow(q(".cf"), tl, 0, {});`, duration: 4.4 },
  }),

  T("card/depth-flythrough", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), XS = [-1, 1], YS = [-1, 0, 1];
      it.forEach(function (c) { c.style.position = "absolute"; c.style.left = "50%"; c.style.top = "50%"; }); var W = it[0].offsetWidth, Hh = it[0].offsetHeight; it.forEach(function (c) { c.style.marginLeft = -W / 2 + "px"; c.style.marginTop = -Hh / 2 + "px"; });
      return MW.drive(tl, at, o.duration, function (t) { var cam = o.speed * t; it.forEach(function (c, i) { var d = ((i * o.spacing - cam) % o.wrap + o.wrap) % o.wrap; if (d < 1) d += o.wrap; var s = o.focal / d;
        gsap.set(c, { x: XS[i % 2] * o.x * s, y: YS[i % 3] * o.y * s, scale: s }); c.style.zIndex = String(Math.round(10000 - d)); c.style.opacity = String(Math.max(0, Math.min(1, (d - o.near[0]) / (o.near[1] - o.near[0]))) * Math.max(0, Math.min(1, (o.wrap - d) / o.far))); }); });
    },
    options: { items: "", spacing: "px between cards in depth (360)", wrap: "px of depth before a card comes round again (2880)", speed: "px a second of the camera (600), linear", focal: "px: depth at scale 1 (2160)", x: "± px (360)", y: "px for rows −1 / 0 / +1 (180)", near: "px depth the card fades out over ([240, 700])", far: "px depth it fades in over (600)", duration: "s (4.8: one wrap)" },
    defaults: { items: ".pc", spacing: 360, wrap: 2880, speed: 600, focal: 2160, x: 360, y: 180, near: [240, 700], far: 600, duration: 4.8 },
    notes: "Each card is projected by focal / depth; x alternates ±, y cycles −1 / 0 / +1, so cards grow and slide past both sides.",
    assets: PICS,
    demo: { css: `${BG}\n.df { position: absolute; inset: 0; overflow: hidden; } .df .pc { width: 360px; height: 240px; border-radius: 22px; background-size: cover; background-position: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }`,
      html: `<div class="df">${Array.from({ length: 8 }, (_, i) => `<div class="pc" style="background:${i % 2 ? GRAD[i % 5] : `url(assets/${"abc"[(i / 2) % 3]}.svg) center / cover`}"></div>`).join("")}</div>`,
      run: `MW.cardDepthFlythrough(q(".df"), tl, 0, {});`, duration: 4.8 },
  }),

  T("ui/skeleton-shimmer", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      var b = document.createElement("div"), W = el.offsetWidth * o.band; b.style.cssText = "position:absolute;top:-10%;bottom:-10%;left:0;width:" + W + "px;pointer-events:none;filter:blur(" + o.blur + "px);background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255," + o.light + "), rgba(255,255,255,0));"; el.appendChild(b);
      return MW.drive(tl, at, o.duration, function (t) { var p = (t / o.period) % 1; gsap.set(b, { x: W * (-1.6 + 4.1 * p), skewX: o.skew }); b.style.opacity = String(o.peak * (p < 0.45 ? p / 0.45 : (1 - p) / 0.55)); });
    },
    options: { band: "share of the card's width (0.24)", skew: "degrees (−18)", period: "s a pass (1.2), linear", peak: "opacity at 45 % of the pass (0.75)", light: "white at the band's centre (0.36)", blur: "px (2)", duration: "s (3.6)" },
    defaults: { band: 0.24, skew: -18, period: 1.2, peak: 0.75, light: 0.36, blur: 2, duration: 3.6 },
    notes: "The band runs from −160 % to +250 % of its own width, clipped by the card.",
    demo: { css: `${BG}\n${ST} .sk { width: 960px; height: 540px; border-radius: 40px; background: #303b50; padding: 60px; box-sizing: border-box; display: grid; grid-template-columns: 27% 1fr; gap: 60px; align-items: start; } .sk .im { height: 52%; border-radius: 24px; background: #3d4a63; aspect-ratio: 1 / 1.1; }
.sk .tx { display: flex; flex-direction: column; gap: 34px; padding-top: 24px; } .sk .tx i { height: 36px; border-radius: 18px; background: #3d4a63; }`,
      html: `<div class="st"><div class="sk"><div class="im"></div><div class="tx"><i></i><i style="width:62%"></i></div></div></div>`, run: `MW.uiSkeletonShimmer(q(".sk"), tl, 0, {});`, duration: 3.6 },
  }),

  K("ui/spinner-arc", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(110, 46, 100, 108, 20); var a = 2 * Math.PI * t / o.period - Math.PI / 2, r = o.size / 2;
  c.lineWidth = o.stroke; c.lineCap = "butt"; c.strokeStyle = "#455166"; c.beginPath(); c.arc(160, 90, r, 0, 2 * Math.PI); c.stroke(); c.strokeStyle = A; c.beginPath(); c.arc(160, 90, r, a, a + Math.PI); c.stroke(); MW.txt(c, o.label, 160, 134, 7, "#8f9ab3", 800); });`),
    options: { size: "px (42)", stroke: "px (5)", period: "s a turn (0.9), linear", label: "", loop: "s (1.8)" }, defaults: { size: 42, stroke: 5, period: 0.9, label: "ĐANG TẢI", loop: 1.8 },
  }),

  K("data/progress-fill", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(56, 58, 208, 84, 14); var p = T(t, o.start, o.start + o.duration);
  MW.txt(c, o.label, 72, 80, 7, "#8f9ab3", 800, "left"); MW.txt(c, Math.floor(p * 100 + 1e-6) + "%", 248, 82, 19, "#e8ebf3", 900, "right");
  MW.rr(c, 72, 106, 176, 9, 4.5); c.fillStyle = "#263247"; c.fill(); if (p > 0) { c.save(); c.clip(); var g = c.createLinearGradient(72, 0, 72 + 176 * p, 0); g.addColorStop(0, "#3da18f"); g.addColorStop(1, "#a9ffee"); c.fillStyle = g; c.fillRect(72, 106, 176 * p, 9); c.restore(); } });`),
    options: { start: "s (0.26)", duration: "s (1.28), linear; the number shows floor(progress × 100)", label: "", loop: "s (2.2)" }, defaults: { start: 0.26, duration: 1.28, label: "ĐANG TẢI LÊN", loop: 2.2 },
  }),

  K("data/circular-progress", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(105, 45, 110, 110, 22); var p = T(t, o.start, o.start + o.duration);
  c.lineWidth = o.stroke; c.lineCap = "butt"; c.strokeStyle = "#28374b"; c.beginPath(); c.arc(160, 100, o.radius, 0, 2 * Math.PI); c.stroke(); if (p > 0) { c.strokeStyle = o.color; c.beginPath(); c.arc(160, 100, o.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * o.value / 100 * p); c.stroke(); }
  MW.txt(c, Math.floor(p * o.value + 1e-6) + "%", 160, 101, 22, "#e8ebf3", 900); });`),
    options: { value: "% (75)", start: "s (0.26)", duration: "s (1.28), linear", radius: "px (37)", stroke: "px (7)", color: "(#75e4d2)", loop: "s (2.2)" }, defaults: { value: 75, start: 0.26, duration: 1.28, radius: 37, stroke: 7, color: "#75e4d2", loop: 2.2 },
  }),

  K("ui/loading-dots", {
    fn: mk(`var e = gsap.parseEase("sine.inOut"); return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(100, 58, 120, 84, 16);
  for (var k = 0; k < 3; k++) { var p = fr((t - k * o.each) / o.period), u = p < 0.5 ? e(p / 0.5) : e((1 - p) / 0.5); c.globalAlpha = 0.35 + 0.65 * u; c.fillStyle = A; c.beginPath(); c.arc(160 + (k - 1) * (o.size + o.gap), 98 - o.bob * u, o.size / 2, 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1; MW.txt(c, o.label, 160, 124, 7, "#8f9ab3", 800); });`),
    options: { size: "px (10)", gap: "px (12)", bob: "px (10)", each: "s later per dot (0.09)", period: "s (0.9, sine.inOut up and down)", label: "", loop: "s (1.8)" }, defaults: { size: 10, gap: 12, bob: 10, each: 0.09, period: 0.9, label: "VUI LÒNG CHỜ", loop: 1.8 },
  }),

  T("data/count-up-percent", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      el.style.fontVariantNumeric = "tabular-nums";
      return MW.drive(tl, at, o.start + o.duration, function (t) { var p = Math.max(0, Math.min(1, (t - o.start) / o.duration)); el.textContent = Math.floor(o.from + (o.to - o.from) * p + 1e-6) + o.suffix; });
    },
    options: { from: "(0)", to: "(100)", start: "s (0.26)", duration: "s (1.28), linear through every integer", suffix: "(%)" }, defaults: { from: 0, to: 100, start: 0.26, duration: 1.28, suffix: "%" },
    notes: "Tabular digits, so the number does not shift sideways; right-align it in a fixed box.",
    demo: { css: `${BG}\n${ST} .cu { width: 1200px; text-align: right; font-size: 340px; font-weight: 850; letter-spacing: -0.03em; line-height: 1; }`, html: `<div class="st"><div class="cu">0%</div></div>`, run: `MW.dataCountUpPercent(q(".cu"), tl, 0, {});`, duration: 2.2 },
  }),

  T("line/chart-line-draw", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var L = el.getTotalLength(), e = gsap.parseEase(o.ease); el.style.strokeDasharray = L + " " + L;
      return MW.drive(tl, at, o.duration, function (t) { var p = e(Math.min(1, t / o.duration)); el.style.strokeDashoffset = String(L * (1 - p)); el.style.opacity = String(p); });
    },
    options: { duration: "s (1.2)", ease: "(power2.out)" }, defaults: { duration: 1.2, ease: "power2.out" },
    notes: "Apply to an SVG path; it draws left → right while it fades in, on the same eased clock.",
    demo: { css: `${BG}\n${ST} .ch { padding: 60px; border-radius: 40px; background: #151a24; border: 3px solid #262c3a; }`,
      html: `<div class="st"><div class="ch"><svg viewBox="0 0 160 70" width="1280" height="560"><g stroke="#2a3142" stroke-width="0.4"><line x1="0" y1="14" x2="160" y2="14"/><line x1="0" y1="36" x2="160" y2="36"/><line x1="0" y1="58" x2="160" y2="58"/></g><path class="cl" d="M8 57 C32 55 35 29 58 36 S92 52 111 20 S137 27 152 10" fill="none" stroke="#8b7bff" stroke-width="1.6" stroke-linecap="round"/></svg></div></div>`,
      run: `MW.lineChartLineDraw(q(".cl"), tl, 0.3, {});`, duration: 2.2 },
  }),

  K("ui/toast-stack", {
    fn: mk(`var s1 = sp(o.stiffness, o.damping), Tm = o.times, n = Tm.length;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); MW.rr(c, 30, 20, 260, 160, 12); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke(); MW.rr(c, 30, 20, 260, 18, 12); c.fillStyle = "#1b2130"; c.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach(function (col, i) { c.fillStyle = col; c.beginPath(); c.arc(42 + i * 9, 29, 2.6, 0, 2 * Math.PI); c.fill(); }); for (var j = 0; j < 3; j++) { MW.rr(c, 44, 52 + j * 18, j === 0 ? 120 : 160 - j * 30, 8, 4); c.fillStyle = "#1b2130"; c.fill(); }
  for (var i = n - 1; i >= 0; i--) { if (t < Tm[i]) continue; var e = s1(t - Tm[i]), up = 0; for (var k = i + 1; k < n; k++) up += o.step * s1(t - Tm[k]); var d0 = o.exitAt + (n - 1 - i) * 0.06, ex = pi2(T(t, d0, d0 + 0.28)), x = 160 + o.slide * (1 - e) + o.slide * ex, y = 122 - up;
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, 1.4 * e)) * (1 - ex); MW.rr(c, x, y, 120, 24, 6); c.fillStyle = "#e8ebf3"; c.fill(); c.fillStyle = G; c.beginPath(); c.arc(x + 12, y + 12, 6, 0, 2 * Math.PI); c.fill(); tickAt(x + 12, y + 12, 0.45, 1, "#0b0d12", 1.6);
    MW.txt(c, o.labels[i % o.labels.length], x + 23, y + 12.5, 7, "#0b0d12", 800, "left"); MW.txt(c, "#" + (i + 1), x + 112, y + 12.5, 6, "#5a6378", 800, "right"); c.restore(); } });`),
    options: { times: "s each toast enters ([0.3, 0.95, 1.6])", step: "px older toasts move up (30)", stiffness: "(260)", damping: "(24)", slide: "px (40)", exitAt: "s, newest first 0.06 s apart (2.5)", labels: "", loop: "s (3.2)" },
    defaults: { times: [0.3, 0.95, 1.6], step: 30, stiffness: 260, damping: 24, slide: 40, exitAt: 2.5, labels: ["Đã lưu bản nháp", "Đã xuất video", "Đã gửi đường dẫn"], loop: 3.2 },
  }),

  K("ui/success-check-draw", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.outAt, o.outAt + 0.25), s = 1 + (o.pop - 1) * hs(t, 1.28, 0.27); c.save(); c.translate(160, 88); c.scale(s, s);
  c.globalAlpha = f * T(t, 0, 0.25); c.strokeStyle = "#262c3a"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, o.radius, 0, 2 * Math.PI); c.stroke(); c.globalAlpha = f;
  var u = p2io(T(t, 0.25, 0.95)); if (u > 0) { c.strokeStyle = A; c.lineWidth = o.stroke; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, o.radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * u); c.stroke(); }
  line([[-15, 1], [-5, 11], [16, -12]], po(T(t, 0.9, 1.3)), A, o.stroke); c.restore(); var l = T(t, 1.2, 1.5); c.globalAlpha = f * l; MW.txt(c, o.label, 160, 146 + 6 * (1 - l), 10, "#e8ebf3", 800); c.globalAlpha = 1; });`),
    options: { radius: "px (34)", stroke: "px (5)", pop: "scale (1.06)", label: "", outAt: "s (2.3)", loop: "s (2.7)" }, defaults: { radius: 34, stroke: 5, pop: 1.06, label: "Đã lưu thành công", outAt: 2.3, loop: 2.7 },
    notes: "The ring draws from 12 o'clock (0.25–0.95 s power2.inOut), then the check (0.9–1.3 s power2.out); a half-sine pop and the label rising 6 px follow.",
  }),

  T("data/bar-stagger", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), e = gsap.parseEase(o.ease); it.forEach(function (b) { gsap.set(b, { transformOrigin: "50% 100%" }); });
      return MW.drive(tl, at, o.duration, function (t) { it.forEach(function (b, k) { var st = k * o.each, p = e(Math.max(0, Math.min(1, (t - st) / (o.duration - st)))); gsap.set(b, { scaleY: o.from + (1 - o.from) * p }); b.style.opacity = String(0.35 + 0.65 * p); }); });
    },
    options: { items: "", each: "s later per bar (0.075)", duration: "s: every bar finishes then (1.1)", from: "scaleY (0.04)", ease: "(power2.out)" }, defaults: { items: "i", each: 0.075, duration: 1.1, from: 0.04, ease: "power2.out" },
    notes: "Later bars start later but all land together, so they move faster.",
    demo: { css: `${BG}\n${ST} .bs { position: relative; width: 1000px; height: 600px; display: flex; align-items: flex-end; justify-content: space-around; border-bottom: 3px solid #3a4466; padding: 0 60px; box-sizing: border-box; } .bs i { width: 90px; border-radius: 14px 14px 0 0; }`,
      html: `<div class="st"><div class="bs">${[30, 44, 58, 72, 86].map((h, i) => `<i style="height:${h}%;background:${["#5a47c9", "#6e5ae0", "#8b7bff", "#a99bff", "#c9bfff"][i]}"></i>`).join("")}</div></div>`, run: `MW.dataBarStagger(q(".bs"), tl, 0.3, {});`, duration: 2 },
  }),

  K("data/donut-segments", {
    fn: mk(`var e = MW.ez("cubic-bezier(.65,0,.35,1)"), V = o.values, CL = o.colors, tot = 0; V.forEach(function (v) { tot += v; });
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(100, 40, 120, 120, 22); c.lineWidth = o.width; c.lineCap = "butt"; c.strokeStyle = "#1b2130"; c.beginPath(); c.arc(160, 100, o.radius, 0, 2 * Math.PI); c.stroke(); var acc = 0;
  V.forEach(function (v, i) { var st = o.start + i * o.each, u = e(T(t, st, st + o.segment)), a0 = -Math.PI / 2 + 2 * Math.PI * acc / tot; if (u > 0) { c.strokeStyle = CL[i % CL.length]; c.beginPath(); c.arc(160, 100, o.radius, a0, a0 + 2 * Math.PI * (v - o.gap) / tot * u); c.stroke(); } acc += v; });
  MW.txt(c, String(tot), 160, 96, 18, "#e8ebf3", 900); MW.txt(c, o.label, 160, 113, 6, "#8f9ab3", 800); });`),
    options: { values: "([40, 30, 20, 10])", colors: "", radius: "px (37)", width: "px (10)", start: "s (0.22)", each: "s between segments (0.31)", segment: "s each grows (0.44, cubic-bezier(.65,0,.35,1))", gap: "units of the total left between segments (1)", label: "", loop: "s (2.2)" },
    defaults: { values: [40, 30, 20, 10], colors: ["#75e4d2", "#91a4ff", "#f5c87e", "#ed93bf"], radius: 37, width: 10, start: 0.22, each: 0.31, segment: 0.44, gap: 1, label: "TỔNG", loop: 2.2 },
  }),

  K("ui/optimistic-update", {
    fn: mk(`var X = 40, Y = 52;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(24, 30, 272, 150, 16); var f = 1 - T(t, o.resetAt, o.resetAt + 0.25), on = t >= o.tapAt ? f : 0, conf = T(t, o.confirmAt, o.confirmAt + 0.25) * f, tint = (t >= o.tapAt ? 1 : 0) * (1 - T(t, o.confirmAt, o.confirmAt + 0.5)) * f;
  MW.rr(c, X, Y, 240, 40, 10); c.fillStyle = "#1b2130"; c.fill(); if (tint > 0) { c.save(); c.globalAlpha = 0.14 * tint; c.fillStyle = A; c.fill(); c.restore(); }
  var b = 1 + (o.bump - 1) * hs(t, o.tapAt, 0.2); c.save(); c.translate(X + 20, Y + 20); c.scale(b, b); MW.rr(c, -8, -8, 16, 16, 4); c.fillStyle = mix("#1b2130", A, on); c.fill(); c.strokeStyle = on > 0.5 ? A : "#536277"; c.lineWidth = 1.5; c.stroke(); if (on > 0) { c.globalAlpha = on; tickAt(0, 0, 0.6, 1, "#fff", 2); } c.restore();
  MW.txt(c, o.task, X + 36, Y + 20.5, 9, "#e8ebf3", 700, "left");
  var pend = t >= o.tapAt ? f * (1 - T(t, o.confirmAt, o.confirmAt + 0.15)) : 0; if (pend > 0) { c.save(); c.globalAlpha = pend; c.translate(X + 160, Y + 20); c.rotate(o.spin * t); c.strokeStyle = "#a99bff"; c.lineWidth = 1.6; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, 5, 0, 4 * Math.PI / 3); c.stroke(); c.restore(); c.globalAlpha = pend; MW.txt(c, o.labels[0], X + 170, Y + 20.5, 7, "#a99bff", 900, "left"); c.globalAlpha = 1; }
  if (conf > 0) { c.globalAlpha = conf; tickAt(X + 160, Y + 20, 0.5, 1, G, 1.8); MW.txt(c, o.labels[1], X + 170, Y + 20.5, 7, G, 900, "left"); c.globalAlpha = 1; }
  var lx = X + 64, lw = 170, tx = function (s) { return lx + lw * s / o.loop; }; MW.txt(c, o.lanes[0], X, 116, 7, "#8f9ab3", 800, "left"); MW.txt(c, o.lanes[1], X, 144, 7, "#8f9ab3", 800, "left"); c.fillStyle = "#262c3a"; c.fillRect(lx, 115, lw, 2); c.fillRect(lx, 143, lw, 2);
  c.globalAlpha = f; if (t >= o.tapAt) { c.fillStyle = A; c.beginPath(); c.arc(tx(o.tapAt), 116, 3.5, 0, 2 * Math.PI); c.fill(); var w = tx(Math.min(t, o.confirmAt)) - tx(o.tapAt); if (w > 0.5) { c.fillStyle = "rgba(169,155,255,0.5)"; MW.rr(c, tx(o.tapAt), 140, w, 6, 3); c.fill(); } if (t >= o.confirmAt) { c.fillStyle = G; c.beginPath(); c.arc(tx(o.confirmAt), 143, 3.5, 0, 2 * Math.PI); c.fill(); } }
  c.globalAlpha = 1; c.fillStyle = "#e8ebf3"; c.fillRect(tx(t), 108, 1, 42); cur([[0, 250, 186], [o.tapAt - 0.2, X + 22, Y + 24], [o.tapAt + 0.3, X + 22, Y + 24], [o.tapAt + 0.9, 250, 186]], t, [o.tapAt - 0.05]); });`),
    options: { tapAt: "s (0.35)", confirmAt: "s the server answers (1.95)", bump: "scale (1.12, 0.2 s)", spin: "rad a second (9)", resetAt: "s (2.85)", task: "", labels: "[pending, confirmed]", lanes: "[interface, server] timeline lanes", loop: "s (3.2)" },
    defaults: { tapAt: 0.35, confirmAt: 1.95, bump: 1.12, spin: 9, resetAt: 2.85, task: "Gửi bản dựng cho khách", labels: ["ĐANG CHỜ", "ĐÃ XÁC NHẬN"], lanes: ["GIAO DIỆN", "MÁY CHỦ"], loop: 3.2 },
    notes: "The row changes at once on the tap (accent tint 14 %, checkbox bump), shows a pending spinner, then turns confirmed when the server lane catches up.",
  }),

  T("text/weight-pulse", {
    uses: VU,
    fn: mv(`var e = MW.ez(o.ease), fs = parseFloat(getComputedStyle(el).fontSize), n = Math.max(1, Array.from(el.textContent).length), rg = document.createRange(), N = 8, Wd = [];
var set = function (w, ls) { fv(el, { wght: w }); el.style.letterSpacing = ls.toFixed(3) + "px"; }; rg.selectNodeContents(el);
for (var i = 0; i <= N; i++) { set(o.from + (o.to - o.from) * i / N, 0); Wd.push(rg.getBoundingClientRect().width); }
var target = Wd[N] + n * o.tight * fs, W = function (w) { var x = (w - o.from) / (o.to - o.from) * N, i = Math.max(0, Math.min(N - 1, Math.floor(x))), u = x - i; return Wd[i] + (Wd[i + 1] - Wd[i]) * u; };
return MW.drive(tl, at, o.loop, function (t) { var u = e(pin((t - o.start) / o.duration)) * (1 - e(pin((t - o.start - o.duration - o.hold) / o.duration))), w = o.from + (o.to - o.from) * u; set(w, o.keepWidth ? (target - W(w)) / n : 0); });`),
    options: { from: "wght (200)", to: "wght (900)", start: "s (0.3)", duration: "s each way (1.2)", hold: "s at the peak (0.8)", tight: "em of tracking at the peak (0.02)", keepWidth: "loosen the tracking as the strokes thin, so the word keeps its width", ease: "(cubic-bezier(.65,0,.35,1))", loop: "s (4.2)" },
    defaults: { from: 200, to: 900, start: 0.3, duration: 1.2, hold: 0.8, tight: 0.02, keepWidth: true, ease: "cubic-bezier(.65,0,.35,1)", loop: 4.2 },
    notes: "Needs a variable font with a wght axis. The word's width is measured at nine weights first, and the tracking at each frame makes up the difference.",
    demo: H("Đậm nhạt", `MW.textWeightPulse(q(".tk-head"), tl, 0, {});`, 4.2, { size: 260 }),
  }),

  T("text/weight-wave-loop", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars;
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var k = Math.pow((1 - Math.cos(2 * Math.PI * (t - i * o.stagger) / o.period)) / 2, o.sharp); fv(c, { wght: o.from + (o.to - o.from) * k }); c.style.color = mix(o.base, o.accent, o.tint * k); }); });`),
    options: { from: "wght (200)", to: "wght (900)", period: "s a wave (1.6)", stagger: "s per letter (0.08)", sharp: "power that narrows the crest (5; 1 = a plain cosine)", tint: "accent at the crest (0.85)", base: "", accent: "", loop: "s (3.2)" },
    defaults: { from: 200, to: 900, period: 1.6, stagger: 0.08, sharp: 5, tint: 0.85, base: "#e8ebf3", accent: "#8b7bff", loop: 3.2 },
    demo: H("Sóng chữ chạy", `MW.textWeightWaveLoop(q(".tk-head"), tl, 0, {});`, 3.2, { size: 200 }),
  }),

  T("text/width-stretch", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars, mid = (o.from + o.to) / 2, amp = (o.to - o.from) / 2, B = o.beats ? Array.prototype.slice.call(document.querySelectorAll(o.beats)) : [];
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { fv(c, { wdth: mid - amp * Math.cos(Math.PI * (t - i * o.stagger) / o.half) }); });
  var b = Math.floor(t / o.half + 1e-6), d = t - b * o.half; B.forEach(function (x, j) { var on = B.length && b % B.length === j; gsap.set(x, { scale: on ? 1 + 0.6 * Math.exp(-8 * d) : 1 }); x.style.opacity = on ? "1" : "0.35"; }); });`),
    options: { from: "wdth (75)", to: "wdth (125)", half: "s each way (0.6, a cosine swing)", stagger: "s per letter (0.04)", beats: "dots that light on each beat (optional)", loop: "s (2.4)" },
    defaults: { from: 75, to: 125, half: 0.6, stagger: 0.04, beats: null, loop: 2.4 },
    notes: "Needs a wdth axis; the letters reflow, so the line breathes.",
    demo: demo({ css: headline("", RF).css, html: `<div class="tk-stage"><div><h1 class="tk-head">Co giãn theo nhạc</h1><div class="bt"><i></i><i></i><i></i><i></i></div></div></div>` }, `MW.textWidthStretch(q(".tk-head"), tl, 0, { beats: ".bt i" });`, 2.4,
      `.tk-head { font-family: 'Roboto Flex', sans-serif; font-size: 180px; font-weight: 600; } .bt { display: flex; justify-content: center; gap: 40px; margin-top: 60px; } .bt i { width: 30px; height: 30px; border-radius: 50%; background: #8b7bff; }`),
  }),

  T("text/weight-breathe", {
    uses: VU,
    fn: mv(`var ring = o.ring ? document.querySelector(o.ring) : null;
return MW.drive(tl, at, o.loop, function (t) { var u = (1 - Math.cos(Math.PI * t / o.half)) / 2; fv(el, { wght: o.from + (o.to - o.from) * u }); if (ring) { gsap.set(ring, { scale: 0.85 + 0.3 * u }); ring.style.opacity = String(0.25 + 0.35 * u); } });`),
    options: { from: "wght (100)", to: "wght (900)", half: "s each way (3, a cosine: sine.inOut)", ring: "an element that breathes with it (optional)", loop: "s (6)" },
    defaults: { from: 100, to: 900, half: 3, ring: null, loop: 6 },
    demo: BREATHE,
  }),

  T("text/thin-to-bold-in", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = MW.ez(o.ease);
ch.forEach(function (c) { fv(c, { wght: o.to }); }); var Wd = ch.map(function (c) { return c.getBoundingClientRect().width; }); ch.forEach(function (c, i) { c.style.display = "inline-block"; c.style.width = Wd[i] + "px"; c.style.textAlign = "center"; });
return MW.drive(tl, at, o.loop, function (t) { var out = 1 - pin((t - o.outAt) / 0.3); ch.forEach(function (c, i) { var d = t - o.start - i * st; fv(c, { wght: o.from + (o.to - o.from) * e(pin(d / o.duration)) }); c.style.opacity = String(pin(d / 0.2) * out); }); });`),
    options: { from: "wght (100)", to: "wght (800)", duration: "s per letter (0.9)", stagger: "s (0.05)", cap: "s (0.9)", start: "s (0.3)", outAt: "s (2.9)", ease: "(cubic-bezier(.215,.61,.355,1))", loop: "s (3.4)" },
    defaults: { from: 100, to: 800, duration: 0.9, stagger: 0.05, cap: 0.9, start: 0.3, outAt: 2.9, ease: "cubic-bezier(.215,.61,.355,1)", loop: 3.4 },
    notes: "Each letter's box is fixed at its final width first, so the glyphs grow in place and nothing reflows.",
    demo: H("Từ mảnh tới đậm", `MW.textThinToBoldIn(q(".tk-head"), tl, 0, {});`, 3.4, { size: 190 }),
  }),

  T("text/slant-swing", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars;
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { fv(c, { slnt: o.slant * (1 - Math.cos(2 * Math.PI * (t - i * o.stagger) / o.period)) / 2 }); }); });`),
    options: { slant: "slnt at the lean (−10)", period: "s a swing (2)", stagger: "s per letter (0.08)", loop: "s (2)" }, defaults: { slant: -10, period: 2, stagger: 0.08, loop: 2 },
    notes: "Needs a slnt axis (the glyphs lean about the baseline); without one, a skewX(slnt deg) about 50 % 100 % gives the same look.",
    demo: H("Đung đưa trong gió", `MW.textSlantSwing(q(".tk-head"), tl, 0, {});`, 2, { size: 180, weight: 700 }),
  }),

  T("text/speed-width-slant", {
    uses: VU,
    fn: mv(`var e = MW.ez(o.ease), dt = 1 / 240, X = function (t) { return o.distance * e(pin((t - o.start) / o.duration)); }, vmax = 1e-6;
for (var s = 0; s <= o.duration; s += 0.01) vmax = Math.max(vmax, Math.abs(X(o.start + s + 0.005) - X(o.start + s - 0.005)) / 0.01);
return MW.drive(tl, at, o.loop, function (t) { var v = 0, dv = 0; for (var s = 0; s < t; s += dt) { var g = Math.abs(X(s + dt / 2) - X(s - dt / 2)) / dt / vmax; dv += (o.stiffness * (g - v) - o.damping * dv) * dt; v += dv * dt; }
  gsap.set(el, { x: X(t) - o.distance / 2 }); fv(el, { wdth: Math.max(25, o.rest + (o.fast - o.rest) * v), slnt: Math.max(-10, Math.min(0, o.slant * v)) }); });`),
    options: { distance: "px the text travels (900)", start: "s (0.3)", duration: "s (1.5)", ease: "(cubic-bezier(.3,0,.7,1))", stiffness: "of the spring that smooths the speed (200)", damping: "(16)", rest: "wdth at rest (75)", fast: "wdth at full speed (125)", slant: "slnt at full speed (−12, clamped to the font's −10)", loop: "s (3.2)" },
    defaults: { distance: 900, start: 0.3, duration: 1.5, ease: "cubic-bezier(.3,0,.7,1)", stiffness: 200, damping: 16, rest: 75, fast: 125, slant: -12, loop: 3.2 },
    notes: "The speed is normalised to 0–1 and smoothed by a spring stepped on the film clock, so the letters widen and lean while the text moves fast and spring back when it stops.",
    demo: H("Lướt thật nhanh", `MW.textSpeedWidthSlant(q(".tk-head"), tl, 0, {});`, 3.2, { size: 150, weight: 700 }, `.tk-stage { overflow: hidden; } .tk-stage::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: repeating-linear-gradient(90deg, #2a3142 0 60px, transparent 60px 120px); transform: translateY(150px); }`),
  }),

  T("text/text-pressure", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars, cur = o.cursor ? document.querySelector(o.cursor) : null, sm = function (x) { x = pin(x); return x * x * (3 - 2 * x); };
ch.forEach(function (c) { c.style.display = "inline-block"; c.style.textAlign = "center"; c.style.whiteSpace = "nowrap"; }); var R = ch.map(function (c) { return c.getBoundingClientRect(); }), W0 = R.map(function (r) { return r.width; }), tot = W0.reduce(function (a, b) { return a + b; }, 0);
var L = Math.min.apply(null, R.map(function (r) { return r.left; })), Rr = Math.max.apply(null, R.map(function (r) { return r.right; })), lw = Rr - L, cx = (L + Rr) / 2, cy = R[0].top + R[0].height / 2, md = Math.max(o.reach[0], o.reach[1] * lw), C0 = R.map(function (r) { return r.left + r.width / 2; });
ch.forEach(function (c, i) { c.style.width = W0[i] + "px"; });
return MW.drive(tl, at, o.loop, function (t) { var px = cx - (lw / 2 + o.over) * Math.cos(2 * Math.PI * t / o.period), py = cy + 0.12 * R[0].height * Math.sin(4 * Math.PI * t / o.period);
  var F = C0.map(function (x0) { return sm(1 - Math.abs(px - x0) / md); }), raw = F.map(function (f, i) { return W0[i] * (o.squeeze[0] + o.squeeze[1] * f); }), sum = raw.reduce(function (a, b) { return a + b; }, 0), k = tot / sum;
  ch.forEach(function (c, i) { var w = raw[i] * k; c.style.width = w.toFixed(2) + "px"; fv(c, { wght: o.weight[0] + (o.weight[1] - o.weight[0]) * F[i], wdth: Math.max(25, Math.min(151, 100 * w / W0[i])) }); });
  if (cur) { var pr = (cur.offsetParent || cur.parentNode).getBoundingClientRect(); gsap.set(cur, { x: px - pr.left - 12, y: py - pr.top - 6 }); } });`),
    options: { period: "s a sweep left → right → left (4), a cosine", over: "px past each end (70)", reach: "[min px, share of the line] of the falloff ([350, 0.45])", weight: "wght [far, near] ([100, 900])", squeeze: "[base, gain] of each letter's width (0.55 + 1.05 f)", cursor: "a pointer drawn on the path (optional)", loop: "s (4)" },
    defaults: { period: 4, over: 70, reach: [350, 0.45], weight: [100, 900], squeeze: [0.55, 1.05], cursor: ".ui-cursor", loop: 4 },
    notes: "f = smoothstep(1 − |dx| / reach) per letter; widths are then rescaled so the line keeps its rest width (far letters condense), and wdth follows each letter's share.",
    demo: HC("Áp lực chữ", `MW.textTextPressure(q(".tk-head"), tl, 0, {});`, 4, { size: 220 }),
  }),

  T("text/variable-proximity", {
    uses: VU,
    fn: mv(`var ch = MW.split(el, "chars").chars, cur = o.cursor ? document.querySelector(o.cursor) : null, e = MW.ez(o.ease);
ch.forEach(function (c) { fv(c, { wght: o.to }); }); var R = ch.map(function (c) { return c.getBoundingClientRect(); }); ch.forEach(function (c, i) { c.style.display = "inline-block"; c.style.width = R[i].width + "px"; c.style.textAlign = "center"; fv(c, { wght: o.from }); });
var L = Math.min.apply(null, R.map(function (r) { return r.left; })), Rr = Math.max.apply(null, R.map(function (r) { return r.right; })), top = Math.min.apply(null, R.map(function (r) { return r.top; })), bot = Math.max.apply(null, R.map(function (r) { return r.bottom; })), cy = (top + bot) / 2, lw = Rr - L;
var x1 = L + 0.25 * lw, x2 = L + 0.75 * lw, below = bot + 520, K = [[0, x1, below], [1, x1, cy], [1.5, x1, cy], [2.3, x2, cy], [2.9, x2, cy], [3.6, x2 + 140, below]], C = R.map(function (r) { return [r.left + r.width / 2, r.top + r.height / 2]; });
return MW.drive(tl, at, o.loop, function (t) { var p = MW.path(K, t, e); ch.forEach(function (c, i) { var d2 = Math.pow(p[0] - C[i][0], 2) + Math.pow(p[1] - C[i][1], 2), k = Math.exp(-2.5 * d2 / (o.radius * o.radius)); fv(c, { wght: o.from + (o.to - o.from) * k }); c.style.color = mix(o.base, o.accent, o.tint * k); });
  if (cur) { var pr = (cur.offsetParent || cur.parentNode).getBoundingClientRect(); gsap.set(cur, { x: p[0] - pr.left - 12, y: p[1] - pr.top - 6 }); } });`),
    options: { radius: "px of the falloff (360)", from: "wght far (400)", to: "wght at the pointer (900)", tint: "accent at the pointer (0.5)", base: "", accent: "", ease: "of the pointer's glides (cubic-bezier(.4,0,.2,1))", cursor: "a pointer (optional)", loop: "s (4)" },
    defaults: { radius: 360, from: 400, to: 900, tint: 0.5, base: "#e8ebf3", accent: "#8b7bff", ease: "cubic-bezier(.4,0,.2,1)", cursor: ".ui-cursor", loop: 4 },
    notes: "k = exp(−2.5 d² / radius²) per letter; boxes are fixed at the heaviest width, so letters never move. The pointer comes up to a quarter of the word, holds, glides to three quarters, holds and leaves.",
    demo: HC("Lại gần đây", `MW.textVariableProximity(q(".tk-head"), tl, 0, {});`, 4, { size: 220 }),
  }),
];
