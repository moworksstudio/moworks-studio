// TakayuStudio, Scale and Blur & Focus (batch 3.4): pops, breaths, elastic and depth scales, and blur-in, rack-focus and focus-frame
// text effects (letters and words split as graphemes), written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { headline, demo, ui } from "../../takayu/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const FLOOR = `.fl { position: absolute; left: 260px; right: 260px; top: 860px; height: 4px; border-radius: 2px; background: #262c3a; }`;
const CARD = `border-radius: 44px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 84px; font-weight: 900; color: #fff; box-shadow: 0 50px 120px rgba(0, 0, 0, 0.45);`;
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const GHOSTS = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var ghost = function () { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.opacity = "0";
  g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = el.offsetWidth + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el); return g; };`;
const mk = (body) => new Function("el", "tl", "at", "o", GHOSTS + "\n" + body);

export default [
  T("motion/pop-scale", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), tp = o.duration * o.peakAt; gsap.set(el, { transformOrigin: o.origin });
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + o.exit, function (t) {
        var s = t < tp ? o.from + (o.peak - o.from) * p2(t / tp) : o.peak + (1 - o.peak) * io(Math.min(1, (t - tp) / (o.duration - tp))), a = Math.min(1, t / o.fade);
        if (o.exitAt != null && t > o.exitAt) { var x = pin(Math.min(1, (t - o.exitAt) / o.exit)); s *= 1 - 0.4 * x; a *= 1 - x; }
        gsap.set(el, { scale: s }); el.style.opacity = String(a);
      });
    },
    options: { from: "start scale (0.05)", peak: "(1.16)", peakAt: "share of the length at the peak (0.72), power2.out up, power2.inOut down", duration: "s (0.52)", fade: "s it takes to appear (0.12)", origin: "transform origin", exitAt: "s after the start to shrink to 0.6 and fade (null)", exit: "s (0.22)" },
    defaults: { from: 0.05, peak: 1.16, peakAt: 0.72, duration: 0.52, fade: 0.12, origin: "50% 50%", exitAt: null, exit: 0.22 },
    demo: { css: `${BG}\n${ST} .ps-w { display: flex; align-items: flex-end; gap: 40px; } .ps-a { width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #b8a9ff, #6a4cf0); flex: none; }
.ps { position: relative; padding: 60px 80px; border-radius: 80px; background: #f1efff; color: #1b1440; font-size: 64px; font-weight: 800; margin-bottom: 120px; opacity: 0; }
.ps::after { content: ""; position: absolute; left: -10px; bottom: -6px; width: 80px; height: 80px; background: #f1efff; clip-path: polygon(0 100%, 100% 0, 100% 70%); }`,
      html: `<div class="st"><div class="ps-w"><div class="ps-a"></div><div class="ps">Chào bạn!</div></div></div>`, run: `MW.motionPopScale(q(".ps"), tl, 0.3, { exitAt: 1.8 });`, duration: 2.5 },
  }),

  T("motion/breathing-scale", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease);
      return MW.drive(tl, at, o.period * o.cycles, function (t) { var p = (t % o.period) / o.period, u = p < 0.5 ? e(p * 2) : 1 - e((p - 0.5) * 2); gsap.set(el, { scale: o.min + (o.max - o.min) * u }); });
    },
    options: { period: "s per breath (1.2)", min: "(0.94)", max: "(1.06)", ease: "each half (cubic-bezier(.45,.05,.2,1))", cycles: "(3)" }, defaults: { period: 1.2, min: 0.94, max: 1.06, ease: "cubic-bezier(.45,.05,.2,1)", cycles: 3 },
    demo: { css: `${BG}\n${ST} .bs-g, .bs { grid-area: 1 / 1; width: 380px; height: 380px; border-radius: 70px; } .bs-g { border: 4px dashed #3a4466; box-sizing: border-box; } .bs { background: linear-gradient(150deg, #a693ff, #6a4cf0); opacity: 0.92; }`,
      html: `<div class="st"><div class="bs-g"></div><div class="bs"></div></div>`, run: `MW.motionBreathingScale(q(".bs"), tl, 0, {});`, duration: 3.6 },
  }),

  T("motion/elastic-scale", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), si = gsap.parseEase("sine.inOut"), pin = gsap.parseEase("power2.in"), K = o.keys, d = K[K.length - 1][0];
      var S = function (t) { if (t <= K[0][0]) return K[0][1]; for (var i = 1; i < K.length; i++) if (t <= K[i][0]) { var u = (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * (i === 1 ? p2(u) : si(u)); } return K[K.length - 1][1]; };
      return MW.drive(tl, at, o.exitAt == null ? d : o.exitAt + o.exit, function (t) {
        var s = S(t), a = Math.min(1, t / 0.08); if (o.exitAt != null && t > o.exitAt) { var x = pin(Math.min(1, (t - o.exitAt) / o.exit)); s *= 1 - 0.5 * x; a *= 1 - x; }
        gsap.set(el, { scale: s }); el.style.opacity = String(a);
      });
    },
    options: { keys: "[[s, scale], ...]: power2.out to the first peak, sine.inOut between the rest", exitAt: "s after the start to shrink to 0.5 and fade (null)", exit: "s (0.25)" },
    defaults: { keys: [[0, 0.1], [0.405, 1.2], [0.612, 0.92], [0.756, 1.06], [0.9, 1]], exitAt: null, exit: 0.25 },
    demo: { css: `${BG}\n${ST} .es { width: 380px; height: 380px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); box-shadow: 0 40px 120px rgba(61, 214, 245, 0.3); opacity: 0; }`,
      html: `<div class="st"><div class="es"></div></div>`, run: `MW.motionElasticScale(q(".es"), tl, 0.3, { exitAt: 1.9 });`, duration: 2.6 },
  }),

  T("motion/speed-stretch", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase("back.inOut(1.7)"), gh = []; for (var i = 0; i < o.ghosts; i++) gh.push(ghost());
var X = function (t) { var a = Math.max(0, Math.min(1, t / o.duration)), b = Math.max(0, Math.min(1, (t - o.duration - o.hold) / o.duration)); return o.x * (e(a) - e(b)); };
var sc = function (t) { var q = Math.min(1, Math.abs(X(t + 0.004) - X(t - 0.004)) / 0.008 / o.peak); return [1 + o.stretch * q, 1 - o.stretch / 2 * q]; };
return MW.drive(tl, at, 2 * o.duration + o.hold, function (t) {
  var s = sc(t); gsap.set(el, { x: X(t), scaleX: s[0], scaleY: s[1] });
  gh.forEach(function (g, i) { var tt = t - o.gap * (i + 1), q = sc(tt); gsap.set(g, { x: X(tt), scaleX: q[0], scaleY: q[1] }); g.style.opacity = tt > 0 && Math.abs(X(tt) - X(t)) > 1 ? String(0.1 - 0.025 * i) : "0"; });
});`),
    options: { x: "px (1000)", duration: "s each way (0.7, back.inOut(1.7))", hold: "s at the far end (0.55)", stretch: "scaleX = 1 + stretch × q, scaleY = 1 − stretch / 2 × q (0.7)", peak: "px a second that counts as full speed (3200)", ghosts: "(4)", gap: "s between ghosts (0.03)" },
    defaults: { x: 1000, duration: 0.7, hold: 0.55, stretch: 0.7, peak: 3200, ghosts: 4, gap: 0.03 },
    demo: { css: `${BG}\n.sx-l { position: absolute; left: 420px; width: 1200px; top: 640px; height: 4px; border-radius: 2px; background: #262c3a; } .sx { position: absolute; left: 380px; top: 440px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe2a8, #ffb547 60%, #d98a00); }`,
      html: `<div class="sx-l"></div><div class="sx"></div>`, run: `MW.motionSpeedStretch(q(".sx"), tl, 0.3, {});`, duration: 2.6 },
  }),

  T("effect/focus-pulse", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var ring = document.createElement("div"), tip = o.tooltip ? host.querySelector(o.tooltip) : null, p2 = gsap.parseEase("power2.out"), cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;box-sizing:border-box;opacity:0;border:" + o.stroke + "px solid " + o.accent + ";"; host.appendChild(ring);
      return MW.drive(tl, at, Math.max(o.duration, o.tipAt + 0.2), function (t) {
        var u = Math.min(1, t / o.duration), r = o.radius * (o.scale[0] + (o.scale[1] - o.scale[0]) * p2(u));
        ring.style.width = ring.style.height = 2 * r + "px"; ring.style.left = cx - r + "px"; ring.style.top = cy - r + "px"; ring.style.opacity = t > 0 && u < 1 ? String(o.opacity * (1 - p2(u))) : "0";
        gsap.set(el, { scale: 1 + 0.06 * Math.sin(Math.PI * Math.min(1, t / 0.24)) });
        if (tip) { var w = p2(Math.max(0, Math.min(1, (t - o.tipAt) / 0.2))); tip.style.opacity = String(w); gsap.set(tip, { y: o.tipRise * (1 - w) }); }
      });
    },
    options: { radius: "px (80)", scale: "[from, to] of the radius ([0.5, 2.4])", opacity: "at the start (0.8)", stroke: "px (8)", duration: "s (0.68, power2.out)", accent: "", tooltip: "a label shown after it", tipAt: "s (0.5)", tipRise: "px (20)" },
    defaults: { radius: 80, scale: [0.5, 2.4], opacity: 0.8, stroke: 8, duration: 0.68, accent: "#8b7bff", tooltip: null, tipAt: 0.5, tipRise: 20 },
    demo: { css: `${BG}\n${ST} .fp { position: relative; display: flex; gap: 50px; padding: 40px 60px; border-radius: 80px; background: #151a24; border: 3px solid #262c3a; } .fp i { width: 100px; height: 100px; border-radius: 30px; background: #2a3142; }
.fp i.on { background: linear-gradient(150deg, #a693ff, #6a4cf0); } .fp-t { position: absolute; left: 345px; top: -110px; width: 160px; margin-left: -30px; padding: 16px 0; border-radius: 22px; background: #ffd23d; color: #1b1440; font-size: 36px; font-weight: 900; text-align: center; opacity: 0; }`,
      html: `<div class="st"><div class="fp"><i></i><i></i><i></i><i class="on"></i><i></i><div class="fp-t">Mới</div></div></div>`, run: `MW.effectFocusPulse(q(".fp i.on"), tl, 0.4, { tooltip: ".fp-t" });`, duration: 2 },
  }),

  T("motion/depth-zoom", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var e = gsap.parseEase(o.ease), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.3, function (t) {
        var p = e(Math.min(1, t / o.duration)), a = (0.2 + 0.8 * p) * Math.min(1, t / 0.25); if (o.exitAt != null && t > o.exitAt) a *= 1 - pin(Math.min(1, (t - o.exitAt) / 0.3));
        gsap.set(el, { scale: o.from + (o.to - o.from) * p }); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px)" : ""; el.style.opacity = String(a);
      });
    },
    options: { from: "(0.15)", to: "ends larger than its layout size (1.35)", blur: "px at the start (24)", duration: "s (0.74)", ease: "(power4.inOut)", exitAt: "s after the start to fade (null)" },
    defaults: { from: 0.15, to: 1.35, blur: 24, duration: 0.74, ease: "power4.inOut", exitAt: null },
    demo: { css: `${BG}\n${ST} .dz { width: 560px; height: 340px; ${CARD} opacity: 0; }`, html: `<div class="st"><div class="dz">Lại gần</div></div>`, run: `MW.motionDepthZoom(q(".dz"), tl, 0.3, { exitAt: 1.8 });`, duration: 2.5 },
  }),

  T("motion/soft-shrink", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, pin = gsap.parseEase(o.ease), p2 = gsap.parseEase("power2.out"), slot = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      slot.style.cssText = "position:absolute;pointer-events:none;box-sizing:border-box;opacity:0;border:4px dashed " + o.slotColor + ";border-radius:" + getComputedStyle(el).borderRadius + ";left:" + el.offsetLeft + "px;top:" + el.offsetTop + "px;width:" + el.offsetWidth + "px;height:" + el.offsetHeight + "px;"; host.insertBefore(slot, el);
      return MW.drive(tl, at, o.returnAt == null ? o.duration : o.returnAt + 0.4, function (t) {
        var p = pin(Math.min(1, t / o.duration)), s = 1 - (1 - o.to) * p, a = 1 - p, sl = p;
        if (o.returnAt != null && t > o.returnAt) { var r = p2(Math.min(1, (t - o.returnAt) / 0.4)); s = 0.9 + 0.1 * r; a = r; sl = 1 - r; }
        gsap.set(el, { scale: s }); el.style.opacity = String(a); slot.style.opacity = String(sl);
      });
    },
    options: { to: "end scale (0.2)", duration: "s (0.6)", ease: "(power2.in)", returnAt: "s after the start to come back from 0.9 (null)", slotColor: "dashed outline of its slot" },
    defaults: { to: 0.2, duration: 0.6, ease: "power2.in", returnAt: null, slotColor: "#3a4466" },
    demo: { css: `${BG}\n${ST} .sk { display: flex; gap: 60px; } .sk > div { width: 360px; height: 460px; border-radius: 40px; background: #1b2130; border: 3px solid #2a3350; } .sk > .x { background: linear-gradient(150deg, #a693ff, #6a4cf0); border-color: transparent; }`,
      html: `<div class="st"><div class="sk"><div></div><div class="x"></div><div></div></div></div>`, run: `MW.motionSoftShrink(q(".sk .x"), tl, 0.4, { returnAt: 1.5 });`, duration: 2.6 },
  }),

  T("motion/impact-squash", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, p1 = gsap.parseEase("power1.in"), bo = gsap.parseEase("back.out(1.7)"), p2 = gsap.parseEase("power2.out"), sh = o.shadow ? host.querySelector(o.shadow) : null, ticks = [], A = [205, 228, -25, -48];
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; gsap.set(el, { transformOrigin: "50% 100%" });
      var bx = el.offsetLeft + el.offsetWidth / 2, by = el.offsetTop + el.offsetHeight - 30, tc = o.duration * o.fall;
      for (var i = 0; i < 4; i++) { var k = document.createElement("div"); k.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;opacity:0;transform-origin:0 50%;width:" + o.tick[0] + "px;height:" + o.tick[1] + "px;border-radius:" + o.tick[1] + "px;background:" + o.accent + ";"; host.appendChild(k); ticks.push(k); }
      return MW.drive(tl, at, Math.max(o.duration, tc + 0.25), function (t) {
        var y = 0, sx = 1, sy = 1;
        if (t < tc) { var u = t / tc; y = -o.drop * (1 - p1(u)); sy = 1 + 0.1 * u * u; sx = 1 / sy; } else { var b = bo(Math.min(1, (t - tc) / (o.duration - tc))); sx = o.squash[0] + (1 - o.squash[0]) * b; sy = o.squash[1] + (1 - o.squash[1]) * b; }
        gsap.set(el, { y: y, scaleX: sx, scaleY: sy });
        if (sh) { var f = 1 + y / o.drop; gsap.set(sh, { scaleX: 0.5 + 0.5 * f }); sh.style.opacity = String(0.25 + 0.75 * f); }
        var v = (t - tc) / 0.25, d = o.reach[0] + (o.reach[1] - o.reach[0]) * p2(Math.max(0, Math.min(1, v)));
        ticks.forEach(function (k, i) { var a = A[i] * Math.PI / 180; k.style.transform = "translate(" + (bx + Math.cos(a) * d) + "px," + (by + Math.sin(a) * d * 0.6 - o.tick[1] / 2) + "px) rotate(" + A[i] + "deg)"; k.style.opacity = v > 0 && v < 1 ? String(1 - v) : "0"; });
      });
    },
    options: { drop: "px (450)", fall: "share of the length falling (0.65, power1.in)", duration: "s (0.62)", squash: "[scaleX, scaleY] at contact ([1.55, 0.55]), then back.out to 1", tick: "[length, thickness] px of the impact ticks ([60, 10])", reach: "[from, to] px out from the centre ([170, 240])", accent: "", shadow: "floor shadow (grows and darkens with the fall)" },
    defaults: { drop: 450, fall: 0.65, duration: 0.62, squash: [1.55, 0.55], tick: [60, 10], reach: [170, 240], accent: "#ffd23d", shadow: null },
    demo: { css: `${BG}\n${FLOOR} .is { position: absolute; left: 860px; top: 660px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff9ab9, #ff5d8f 60%, #c82e62); }
.is-sh { position: absolute; left: 820px; top: 846px; width: 280px; height: 28px; border-radius: 50%; background: rgba(0, 0, 0, 0.6); filter: blur(8px); }`,
      html: `<div class="fl"></div><div class="is-sh"></div><div class="is"></div>`, run: `MW.motionImpactSquash(q(".is"), tl, 0.3, { shadow: ".is-sh" });`, duration: 2 },
  }),

  T("motion/center-punch", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), rays = [], tp = o.duration * o.peakAt;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      for (var i = 0; i < o.rays; i++) { var r = document.createElement("div"); r.style.cssText = "position:absolute;pointer-events:none;opacity:0;transform-origin:0 50%;left:" + cx + "px;top:" + (cy - o.rayWidth / 2) + "px;height:" + o.rayWidth + "px;border-radius:" + o.rayWidth + "px;background:" + o.accent + ";"; host.insertBefore(r, el); rays.push(r); }
      return MW.drive(tl, at, o.exitAt == null ? Math.max(o.duration, o.rayEnd) : o.exitAt + 0.25, function (t) {
        var s = t < tp ? o.from + (o.peak - o.from) * p2(t / tp) : o.peak + (1 - o.peak) * io(Math.min(1, (t - tp) / (o.duration - tp))), a = Math.min(1, t / 0.08);
        if (o.exitAt != null && t > o.exitAt) { var x = pin(Math.min(1, (t - o.exitAt) / 0.25)); s *= 1 - 0.6 * x; a *= 1 - x; }
        gsap.set(el, { scale: s }); el.style.opacity = String(a);
        var u = (t - o.rayStart) / (o.rayEnd - o.rayStart), q = p2(Math.max(0, Math.min(1, u)));
        rays.forEach(function (r, i) { r.style.width = o.rayLen[0] + (o.rayLen[1] - o.rayLen[0]) * q + "px"; r.style.transform = "rotate(" + (i / o.rays * 360 - 90) + "deg) translateX(" + (o.rayR[0] + (o.rayR[1] - o.rayR[0]) * q) + "px)"; r.style.opacity = u > 0 && u < 1 ? String(1 - q) : "0"; });
      });
    },
    options: { from: "(0.18)", peak: "(1.32)", peakAt: "share of the length (0.62)", duration: "s (0.48)", rays: "(10)", rayR: "[from, to] px from the centre ([230, 310])", rayLen: "[from, to] px ([65, 15])", rayWidth: "px (12)", rayStart: "s (0.22)", rayEnd: "s (0.6)", accent: "", exitAt: "s after the start to shrink to 0.4 and fade (null)" },
    defaults: { from: 0.18, peak: 1.32, peakAt: 0.62, duration: 0.48, rays: 10, rayR: [230, 310], rayLen: [65, 15], rayWidth: 12, rayStart: 0.22, rayEnd: 0.6, accent: "#ffd23d", exitAt: null },
    demo: { css: `${BG}\n${ST} .cp { width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #c4b8ff, #8b7bff 60%, #5b46d8); display: grid; place-items: center; color: #fff; opacity: 0; } .cp svg { width: 180px; height: 180px; }`,
      html: `<div class="st"><div class="cp"><svg viewBox="-12 -12 24 24"><path d="M0 -11 L3.2 -3.8 L11 -3.4 L5 1.8 L6.8 9.6 L0 5.4 L-6.8 9.6 L-5 1.8 L-11 -3.4 L-3.2 -3.8 Z" fill="currentColor"/></svg></div></div>`, run: `MW.motionCenterPunch(q(".cp"), tl, 0.3, { exitAt: 1.8 });`, duration: 2.4 },
  }),

  T("motion/width-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bars = o.bars.map(function (s) { return el.querySelector(s); }).filter(Boolean), lb = o.label ? el.querySelector(o.label) : null, p3 = gsap.parseEase("power3.out"), io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), tp = o.duration * o.peakAt;
      bars.forEach(function (b) { gsap.set(b, { transformOrigin: "0% 50%" }); });
      var S = function (t) { if (t <= 0) return o.from; return t < tp ? o.from + (o.peak - o.from) * p3(t / tp) : o.peak + (1 - o.peak) * io(Math.min(1, (t - tp) / (o.duration - tp))); };
      return MW.drive(tl, at, o.exitAt == null ? Math.max(o.duration + o.delay * (bars.length - 1), o.labelAt + 0.2) : o.exitAt + 0.35, function (t) {
        var x = o.exitAt != null && t > o.exitAt ? pin(Math.min(1, (t - o.exitAt) / 0.35)) : 0;
        bars.forEach(function (b, i) { var tt = t - i * o.delay; gsap.set(b, { scaleX: S(tt) * (1 - x) }); b.style.opacity = tt > 0 ? "1" : "0"; });
        if (lb) lb.style.opacity = String(Math.max(0, Math.min(1, (t - o.labelAt) / 0.2)) * (1 - x));
      });
    },
    options: { bars: "the bars, in order", label: "the label over them", from: "(0.04)", peak: "(1.08)", peakAt: "share of the length (0.78), power3.out up, power2.inOut back", duration: "s (0.65)", delay: "s between bars (0.08)", labelAt: "s (0.52, fades in 0.2 s)", exitAt: "s after the start to shrink back (null)" },
    defaults: { bars: [".wr-a", ".wr-b"], label: ".wr-l", from: 0.04, peak: 1.08, peakAt: 0.78, duration: 0.65, delay: 0.08, labelAt: 0.52, exitAt: null },
    demo: { css: `${BG}\n${ST} .wr { position: relative; width: 900px; } .wr-a { height: 170px; border-radius: 12px; background: #8b7bff; opacity: 0; } .wr-b { width: 600px; height: 40px; margin-top: 24px; border-radius: 8px; background: #3dd6f5; opacity: 0; }
.wr-l { position: absolute; left: 56px; top: 0; line-height: 170px; font-size: 96px; font-weight: 900; color: #0b0d12; letter-spacing: 0.04em; opacity: 0; }`,
      html: `<div class="st"><div class="wr"><div class="wr-a"></div><div class="wr-b"></div><div class="wr-l">RA MẮT</div></div></div>`, run: `MW.motionWidthReveal(q(".wr"), tl, 0.3, { exitAt: 1.9 });`, duration: 2.7 },
  }),

  T("motion/depth-pullback", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, e = gsap.parseEase(o.ease), br = [], z = o.bracket, g = o.gap;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
      [[0, 0, "top", "left"], [1, 0, "top", "right"], [0, 1, "bottom", "left"], [1, 1, "bottom", "right"]].forEach(function (c) { var b = document.createElement("div"); b.style.cssText = "position:absolute;pointer-events:none;opacity:0;width:" + z + "px;height:" + z + "px;border-" + c[2] + ":" + o.stroke + "px solid " + o.accent + ";border-" + c[3] + ":" + o.stroke + "px solid " + o.accent + ";left:" + (c[0] ? L + W + g - z : L - g) + "px;top:" + (c[1] ? Tp + Hh + g - z : Tp - g) + "px;"; host.appendChild(b); br.push(b); });
      return MW.drive(tl, at, o.exitAt == null ? o.duration + 0.25 : o.exitAt + 0.3, function (t) {
        var p = e(Math.min(1, t / o.duration)), a = Math.min(1, t / 0.3), x = o.exitAt != null && t > o.exitAt ? Math.min(1, (t - o.exitAt) / 0.3) : 0;
        gsap.set(el, { scale: o.from + (1 - o.from) * p }); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px) brightness(" + (1 + (o.bright - 1) * (1 - p)).toFixed(3) + ")" : ""; el.style.opacity = String(a * (1 - x));
        var bq = Math.max(0, Math.min(1, (t - o.duration) / 0.25)) * (1 - x); br.forEach(function (b) { b.style.opacity = String(bq); });
      });
    },
    options: { from: "start scale (2.2)", blur: "px (28)", bright: "start brightness (1.35)", duration: "s (0.76)", ease: "(power2.inOut)", bracket: "px corner size (60)", gap: "px outside the card (30)", stroke: "px (6)", accent: "", exitAt: "s after the start to fade (null)" },
    defaults: { from: 2.2, blur: 28, bright: 1.35, duration: 0.76, ease: "power2.inOut", bracket: 60, gap: 30, stroke: 6, accent: "#e8ebf3", exitAt: null },
    demo: { css: `${BG}\n${ST} .dp { width: 640px; height: 380px; ${CARD} opacity: 0; }`, html: `<div class="st"><div class="dp">Toàn cảnh</div></div>`, run: `MW.motionDepthPullback(q(".dp"), tl, 0.3, { exitAt: 2.1 });`, duration: 2.8 },
  }),

  T("text/text-generate", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var w = MW.split(el, "words").words, n = w.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = gsap.parseEase(o.ease), dots = o.dots ? Array.prototype.slice.call(el.parentNode.querySelectorAll(o.dots)) : [];
      return MW.drive(tl, at, o.loop, function (t) {
        var x = 1 - Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
        w.forEach(function (c, i) { var u = e(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))); c.style.opacity = String(u * x); c.style.filter = u < 1 ? "blur(" + (o.blur * (1 - u)).toFixed(2) + "px)" : ""; });
        dots.forEach(function (d, i) { gsap.set(d, { y: -o.bob * Math.sin(2 * Math.PI * (t * 2.2 - i * 0.18)) }); d.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.start + 0.1) / 0.15))); });
      });
    },
    options: { duration: "s per word (0.8, power1.out)", stagger: "s (0.2)", cap: "s the whole answer starts within (2)", blur: "px (10)", ease: "", start: "s (0.5)", exitAt: "s (3.7)", loop: "s (4.2)", dots: "typing dots shown before the text (near it)", bob: "px (6)" },
    defaults: { duration: 0.8, stagger: 0.2, cap: 2, blur: 10, ease: "power1.out", start: 0.5, exitAt: 3.7, loop: 4.2, dots: null, bob: 6 },
    demo: { ...ui(`<div class="ui-card tg"><div class="tg-h"><div class="tg-av">AI</div><div class="tg-n">Trợ lý dựng phim</div></div><div class="tg-b"><div class="tg-d"><i></i><i></i><i></i></div><p class="tg-t">Mình gợi ý mở đầu bằng cảnh bình minh, rồi chuyển nhanh sang nhân vật chính đang chuẩn bị đồ nghề.</p></div></div>`,
      `.tg { width: 1180px; box-sizing: border-box; } .tg-h { display: flex; align-items: center; gap: 24px; margin-bottom: 30px; } .tg-av { width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 32px; font-weight: 900; }
.tg-n { font-size: 34px; font-weight: 700; color: #c9d2ea; } .tg-b { position: relative; } .tg-t { margin: 0; font-size: 52px; line-height: 1.4; font-weight: 500; text-align: left; } .tg-d { position: absolute; left: 0; top: 24px; display: flex; gap: 14px; } .tg-d i { width: 22px; height: 22px; border-radius: 50%; background: #8f9ab3; }`),
      run: `MW.textTextGenerate(q(".tg-t"), tl, 0, { dots: ".tg-d i" });`, duration: 4.2 },
  }),

  T("text/blur-in-steps", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var w = MW.split(el, "words").words, n = w.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), p1 = gsap.parseEase("power1.out");
      return MW.drive(tl, at, o.loop, function (t) {
        var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.4));
        w.forEach(function (c, i) {
          var s = (t - o.start - i * st) / o.step, y = o.y[2], b = o.blur[2], a = 1;
          if (s <= 0) { y = o.y[0]; b = o.blur[0]; a = 0; } else if (s < 1) { y = o.y[0] + (o.y[1] - o.y[0]) * p1(s); b = o.blur[0] + (o.blur[1] - o.blur[0]) * s; a = 0.5 * s; } else if (s < 2) { var u = s - 1; y = o.y[1] + (o.y[2] - o.y[1]) * p1(u); b = o.blur[1] + (o.blur[2] - o.blur[1]) * u; a = 0.5 + 0.5 * u; }
          b += o.exitBlur * x; gsap.set(c, { y: y }); c.style.filter = b > 0.01 ? "blur(" + b.toFixed(2) + "px)" : ""; c.style.opacity = String(a * (1 - x));
        });
      });
    },
    options: { step: "s per step (0.35)", y: "px [start, overshoot, rest] ([−100, 10, 0])", blur: "px per step ([16, 8, 0])", stagger: "s per word (0.2)", cap: "s the words start within (1)", start: "s (0.3)", exitAt: "s (2.6)", exitBlur: "px on the way out (8)", loop: "s (3.2)" },
    defaults: { step: 0.35, y: [-100, 10, 0], blur: [16, 8, 0], stagger: 0.2, cap: 1, start: 0.3, exitAt: 2.6, exitBlur: 8, loop: 3.2 },
    demo: H("Mỗi khung hình kể một câu chuyện", `MW.textBlurInSteps(q(".tk-head"), tl, 0, {});`, 3.2, { size: 120 }),
  }),

  T("text/blur-in-chars", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, o.fit / Math.max(1, n - 1)), e = MW.ez(o.ease);
      return MW.drive(tl, at, o.loop, function (t) {
        var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
        ch.forEach(function (c, i) { var u = e(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))); gsap.set(c, { scale: o.scale + (1 - o.scale) * u }); c.style.filter = u < 1 ? "blur(" + (o.blur * (1 - u)).toFixed(2) + "px)" : ""; c.style.opacity = String(u * (1 - x)); });
      });
    },
    options: { duration: "s per letter (0.7)", stagger: "s (0.07; the recipe 0.03–0.07)", fit: "s the letters start within (1.1)", blur: "px (12–20)", scale: "start scale (1.2)", ease: "(cubic-bezier(.33,1,.68,1))", start: "s (0.35)", exitAt: "s (2.3)", loop: "s (2.8)" },
    defaults: { duration: 0.7, stagger: 0.07, fit: 1.1, blur: 16, scale: 1.2, ease: "cubic-bezier(.33,1,.68,1)", start: 0.35, exitAt: 2.3, loop: 2.8 },
    demo: H("Ánh sáng đầu ngày", `MW.textBlurInChars(q(".tk-head"), tl, 0, {});`, 2.8, { size: 150 }),
  }),

  T("text/blur-random-in", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, r = MW.rand(o.seed), ord = ch.map(function (_, i) { return i; }), rank = [], e = gsap.parseEase(o.ease);
      for (var i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = ord[i]; ord[i] = ord[j]; ord[j] = tmp; } ord.forEach(function (c, k) { rank[c] = k; });
      var gap = Math.max(o.gap[0], Math.min(o.gap[1], 1 / Math.max(1, n - 1)));
      return MW.drive(tl, at, o.loop, function (t) {
        var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
        ch.forEach(function (c, i) { var u = e(Math.max(0, Math.min(1, (t - o.start - rank[i] * gap) / o.duration))); c.style.opacity = String(u * (1 - x)); c.style.filter = u < 1 ? "blur(" + (o.blur * (1 - u)).toFixed(2) + "px)" : ""; });
      });
    },
    options: { duration: "s per letter (0.6, power1.inOut)", gap: "[min, max] s between letters, 1 s / (n − 1) clamped ([0.05, 0.14])", blur: "px (20)", ease: "", start: "s (0.3)", exitAt: "s (2.45)", loop: "s (3)", seed: "the order" },
    defaults: { duration: 0.6, gap: [0.05, 0.14], blur: 20, ease: "power1.inOut", start: 0.3, exitAt: 2.45, loop: 3, seed: 4 },
    notes: "Scroll-scrubbed in the source; here it runs on the film's clock.",
    demo: H("Sương tan dần", `MW.textBlurRandomIn(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/tracking-blur-build", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      el.style.whiteSpace = "nowrap"; el.style.maxWidth = "none";
      var ch = MW.split(el, "chars").chars, n = ch.length, e = MW.ez(o.ease), fs = parseFloat(getComputedStyle(el).fontSize), sp = o.tracking, gap = o.spread / Math.max(1, n - 1);
      if (sp === "fill") { var tw = ch.reduce(function (s, c) { return s + c.offsetWidth; }, 0); sp = Math.max(0, Math.min(o.max, ((o.width || window.innerWidth) * 0.92 - tw) / Math.max(1, n - 1) / fs)); }
      return MW.drive(tl, at, o.loop, function (t) {
        var ls = sp * (1 - e(Math.max(0, Math.min(1, (t - o.start) / o.duration)))), x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.4));
        el.style.letterSpacing = ls.toFixed(4) + "em"; el.style.paddingLeft = ls.toFixed(4) + "em";
        ch.forEach(function (c, i) { var s = t - o.start - i * gap, a = Math.max(0, Math.min(1, s / o.fade)), b = Math.max(0, Math.min(1, s / o.unblur)); c.style.opacity = String(a * (1 - x)); c.style.filter = b < 1 ? "blur(" + (o.blur * (1 - e(b))).toFixed(2) + "px)" : ""; });
      });
    },
    options: { tracking: "em of extra spacing at the start (0.5), or 'fill' to spread to the frame width", max: "em at most with 'fill' (0.9)", width: "px to fill (0: the window)", duration: "s the spacing closes over (2.1)", ease: "(cubic-bezier(.33,1,.68,1))", fade: "s per letter (0.6)", unblur: "s per letter (1.7)", spread: "s the letters start within (0.25)", blur: "px (20)", start: "s (0.3)", exitAt: "s (3.4)", loop: "s (4)" },
    defaults: { tracking: 0.5, max: 0.9, width: 0, duration: 2.1, ease: "cubic-bezier(.33,1,.68,1)", fade: 0.6, unblur: 1.7, spread: 0.25, blur: 20, start: 0.3, exitAt: 3.4, loop: 4 },
    demo: H("HÀNH TRÌNH MỚI", `MW.textTrackingBlurBuild(q(".tk-head"), tl, 0, { tracking: "fill" });`, 4, { size: 120, weight: 700 },
      `.tk-head { letter-spacing: 0; } #demo::before, #demo::after { content: ""; position: absolute; left: 0; right: 0; height: 138px; background: #000; z-index: 5; } #demo::before { top: 0; } #demo::after { bottom: 0; }`),
  }),

  T("text/directional-blur-slide", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      window.__mwHBlur = (window.__mwHBlur || 0) + 1; var id = "mw-hblur-" + window.__mwHBlur, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), f = document.createElementNS(ns, "filter"), g = document.createElementNS(ns, "feGaussianBlur");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute"; f.setAttribute("id", id); f.setAttribute("x", "-50%"); f.setAttribute("width", "200%"); f.setAttribute("y", "-10%"); f.setAttribute("height", "120%"); f.setAttribute("color-interpolation-filters", "sRGB");
      g.setAttribute("stdDeviation", "0 0"); f.appendChild(g); svg.appendChild(f); document.body.appendChild(svg);
      var e = gsap.parseEase(o.ease), ei = gsap.parseEase("expo.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + o.exit, function (t) {
        var p = e(Math.min(1, t / o.duration)), x = o.x * (1 - p), b = o.blur * (1 - p), a = Math.min(1, t / 0.08);
        if (o.exitAt != null && t > o.exitAt) { var q = ei(Math.min(1, (t - o.exitAt) / o.exit)); x = -o.x * q; b = o.blur * q; a = 1 - Math.max(0, (q - 0.7) / 0.3); }
        gsap.set(el, { x: x }); g.setAttribute("stdDeviation", b.toFixed(2) + " 0"); el.style.filter = b > 0.05 ? "url(#" + id + ")" : ""; el.style.opacity = String(a);
      });
    },
    options: { x: "px it slides in from (−800)", blur: "horizontal blur at the start, stdDeviation px (60)", duration: "s (0.5)", ease: "(expo.out): the blur follows the move, 0 when it stops", exitAt: "s after the start to slide out the other way (null)", exit: "s (0.4, expo.in)" },
    defaults: { x: -800, blur: 60, duration: 0.5, ease: "expo.out", exitAt: null, exit: 0.4 },
    demo: H("TỐC ĐỘ", `MW.textDirectionalBlurSlide(q(".tk-head"), tl, 0.3, { exitAt: 1.7 });`, 2.6, { size: 240, weight: 900 }),
  }),

  T("text/scale-blur-zoom", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, e = MW.ez(o.ease), br = [], z = o.bracket;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
      for (var i = 0; i < 4; i++) { var b = document.createElement("div"); b.style.cssText = "position:absolute;pointer-events:none;opacity:0;width:" + z + "px;height:" + z + "px;border:0 solid " + o.seeking + ";"; b.style[i < 2 ? "borderTopWidth" : "borderBottomWidth"] = o.stroke + "px"; b.style[i % 2 ? "borderRightWidth" : "borderLeftWidth"] = o.stroke + "px"; host.appendChild(b); br.push(b); }
      return MW.drive(tl, at, o.loop, function (t) {
        var p = e(Math.max(0, Math.min(1, (t - o.start) / o.duration))), x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
        gsap.set(el, { scale: o.scale + (1 - o.scale) * p }); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px)" : ""; el.style.opacity = String(Math.min(1, p * 1.5) * (1 - x));
        var kx = o.box[0] + (1 - o.box[0]) * p, ky = o.box[1] + (1 - o.box[1]) * p, cx = L + W / 2, cy = Tp + Hh / 2, hw = W / 2 * kx + o.pad, hh = Hh / 2 * ky + o.pad, col = p >= 0.999 ? o.locked : o.seeking;
        br.forEach(function (b, i) { var sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1; b.style.left = (cx + sx * hw - (sx > 0 ? z : 0)) + "px"; b.style.top = (cy + sy * hh - (sy > 0 ? z : 0)) + "px"; b.style.borderColor = col; b.style.opacity = String((t > o.start - 0.2 ? 1 : 0) * (1 - x)); });
      });
    },
    options: { scale: "start scale (1.4)", blur: "px (24)", duration: "s (0.7)", ease: "(cubic-bezier(.2,.7,.2,1))", start: "s (0.4)", exitAt: "s (2.3)", loop: "s (2.8)", box: "[x, y] start size of the AF brackets over the text box ([1.15, 1.3])", pad: "px (30)", bracket: "px (54)", stroke: "px (6)", seeking: "bracket colour while focusing", locked: "bracket colour on lock" },
    defaults: { scale: 1.4, blur: 24, duration: 0.7, ease: "cubic-bezier(.2,.7,.2,1)", start: 0.4, exitAt: 2.3, loop: 2.8, box: [1.15, 1.3], pad: 30, bracket: 54, stroke: 6, seeking: "#e8ebf3", locked: "#3ddc84" },
    demo: H("Lấy nét", `MW.textScaleBlurZoom(q(".tk-head"), tl, 0, {});`, 2.8, { size: 200, weight: 900 },
      `.tk-head { opacity: 0; } .vf { position: absolute; width: 120px; height: 120px; border: 0 solid rgba(233,235,243,0.5); } .vf.a { left: 80px; top: 80px; border-top-width: 5px; border-left-width: 5px; } .vf.b { right: 80px; top: 80px; border-top-width: 5px; border-right-width: 5px; }
.vf.c { left: 80px; bottom: 80px; border-bottom-width: 5px; border-left-width: 5px; } .vf.d { right: 80px; bottom: 80px; border-bottom-width: 5px; border-right-width: 5px; }`),
  }),

  T("text/rack-focus", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var A = el.querySelector(o.far), B = el.querySelector(o.near), e = MW.ez(o.ease);
      var set = function (n, s) { n.style.filter = s > 0.01 ? "blur(" + (o.blur * s).toFixed(2) + "px)" : ""; n.style.opacity = String(1 - (1 - o.dim) * s); };
      return MW.drive(tl, at, o.loop, function (t) {
        var v = o.start === "near" ? 1 : 0, prev = v;
        o.pulls.forEach(function (p) { var to = p[1] === "near" ? 1 : 0; v += (to - prev) * e(Math.max(0, Math.min(1, (t - p[0]) / o.duration))); prev = to; });
        set(A, v); set(B, 1 - v);
      });
    },
    options: { far: "the far line", near: "the near line", blur: "px on the line out of focus (16)", dim: "its opacity (0.6)", duration: "s per pull (1.2; 0.8–1.5)", ease: "(cubic-bezier(.65,0,.35,1))", pulls: "[[s, 'near' | 'far'], ...]", start: "the line in focus at the start", loop: "s (5)" },
    defaults: { far: ".rf-a", near: ".rf-b", blur: 16, dim: 0.6, duration: 1.2, ease: "cubic-bezier(.65,0,.35,1)", pulls: [[0.6, "near"], [3.1, "far"]], start: "far", loop: 5 },
    demo: { css: `${BG}\n.rf { position: absolute; inset: 0; } .rf-a { position: absolute; left: 260px; top: 220px; font-size: 130px; font-weight: 800; color: #b9c0d4; } .rf-b { position: absolute; right: 240px; bottom: 220px; font-size: 230px; font-weight: 900; letter-spacing: -0.03em; }`,
      html: `<div class="rf"><div class="rf-a">Hôm qua</div><div class="rf-b">Hôm nay</div></div>`, run: `MW.textRackFocus(q(".rf"), tl, 0, {});`, duration: 5 },
  }),

  T("text/focus-frame", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var w = MW.split(el, "words").words, n = w.length, e = MW.ez(o.ease), fr = document.createElement("div"), fs = parseFloat(getComputedStyle(el).fontSize), z = o.corner * fs, s = o.stroke * fs, cs = [];
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      fr.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;"; el.appendChild(fr);
      for (var i = 0; i < 4; i++) { var c = document.createElement("div"); c.style.cssText = "position:absolute;width:" + z + "px;height:" + z + "px;border:0 solid " + o.accent + ";"; c.style[i < 2 ? "borderTopWidth" : "borderBottomWidth"] = s + "px"; c.style[i % 2 ? "borderRightWidth" : "borderLeftWidth"] = s + "px"; fr.appendChild(c); cs.push(c); }
      var box = function (k) { var b = w[k]; return [b.offsetLeft - o.padX * fs, b.offsetTop - o.padY * fs, b.offsetWidth + 2 * o.padX * fs, b.offsetHeight + 2 * o.padY * fs]; };
      return MW.drive(tl, at, o.per * n * o.cycles, function (t) {
        var k = Math.floor(t / o.per), u = k === 0 ? 1 : e(Math.min(1, (t - k * o.per) / o.move)), cur = k % n, prev = (k - 1 + n) % n, A = box(prev), B = box(cur), r = A.map(function (a, i) { return a + (B[i] - a) * u; });
        cs.forEach(function (c, i) { c.style.left = (i % 2 ? r[0] + r[2] - z : r[0]) + "px"; c.style.top = (i < 2 ? r[1] : r[1] + r[3] - z) + "px"; });
        w.forEach(function (x, i) { var f = i === cur ? u : i === prev ? 1 - u : 0; x.style.filter = f < 0.999 ? "blur(" + (o.blur * (1 - f)).toFixed(2) + "px)" : ""; x.style.opacity = String(o.dim + (1 - o.dim) * f); });
      });
    },
    options: { blur: "px on the other words (10)", dim: "their opacity (0.6)", move: "s the frame takes to the next word (0.5)", per: "s per word, move and hold (1.5)", cycles: "(1)", corner: "em per corner (0.35)", stroke: "em (0.09)", padX: "em (0.27)", padY: "em (0.13)", ease: "(cubic-bezier(.65,0,.35,1))", accent: "" },
    defaults: { blur: 10, dim: 0.6, move: 0.5, per: 1.5, cycles: 1, corner: 0.35, stroke: 0.09, padX: 0.27, padY: 0.13, ease: "cubic-bezier(.65,0,.35,1)", accent: "#8b7bff" },
    demo: H("Nghĩ Quay Dựng", `MW.textFocusFrame(q(".tk-head"), tl, 0, {});`, 4.5, { size: 160 }, ".tk-head { word-spacing: 0.45em; }"),
  }),
];
