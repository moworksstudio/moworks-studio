// TakayuStudio, Springs, Pointer and Sound Sync (batch 3.8): spring presets with their response curves, retargeting, split-edge
// tabs, lessons (spring vs tween, overshoot budget), inertia and projectiles; text and cards that react to a scripted pointer (magnet,
// repel, scramble, clone roll, word lift, word trail, outline spotlight, reveal card, bulge lens); and motion locked to sound (sfx
// cues, audio bars, sidechain duck, word-locked pops); written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { CURSOR, headline, demo } from "../../takayu/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CUR = `.ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); }`;
const CV = (name, duration) => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, {});`, duration });
const CP = `var S = MW.stage320(el), c = S.ctx, fr = function (x) { return x - Math.floor(x); }, A = "#8b7bff", pin = function (u) { return Math.max(0, Math.min(1, u)); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
const K = (id, d) => T(id, { uses: ["drive", "draw", "stage320", "eases", "noise"], ...d, demo: CV(id.replace(/[/-]([a-z0-9])/g, (m, ch) => ch.toUpperCase()), d.defaults.loop) });
// text and pointer helpers: split, clamps, the loop's closing fade, a pointer placed by its tip, bounds and centres, a colour tint
const TX = `var split = function (mode) { return MW.split(el, mode)[mode]; }, pin = function (u) { return Math.max(0, Math.min(1, u)); }, fs = parseFloat(getComputedStyle(el).fontSize), ic = function (u) { return u * u * u; };
var fade = function (t, a, d) { return 1 - ic(pin((t - a) / d)); }, base = getComputedStyle(el).color, cursorEl = function (sel) { return sel ? document.querySelector(sel) : null; };
var place = function (cu, x, y, down) { if (!cu) return; var pr = (cu.offsetParent || cu.parentNode).getBoundingClientRect(); gsap.set(cu, { x: x - pr.left - 12, y: y - pr.top - 6, scale: down ? 0.86 : 1, transformOrigin: "12px 6px" }); };
var bounds = function (els) { var l = Infinity, r = -Infinity, tp = Infinity, b = -Infinity; els.forEach(function (n) { var q = n.getBoundingClientRect(); l = Math.min(l, q.left); r = Math.max(r, q.right); tp = Math.min(tp, q.top); b = Math.max(b, q.bottom); }); return { l: l, r: r, t: tp, b: b, w: r - l, h: b - tp, cx: (l + r) / 2, cy: (tp + b) / 2 }; };
var centres = function (els) { return els.map(function (n) { var q = n.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }); };
var mixc = function (accent, u) { return u > 0.005 ? "color-mix(in srgb, " + accent + " " + Math.round(100 * Math.min(1, u)) + "%, " + base + ")" : ""; };`;
const mt = (body) => new Function("el", "tl", "at", "o", TX + "\n" + body);
const TU = ["drive", "split", "eases", "rand", "draw"];
const HC = (text, run, duration, opt = {}, css = "") => { const s = headline(text, opt); return demo({ css: s.css, html: s.html + CURSOR }, run, duration, `${CUR} ${css}`); };

// the spring presets: closed-form step response (as MW.spring), drawn here once for the demo's response graph
const springAt = (k, c, m) => { const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  return (t) => { if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t)); }
    if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t); const q = Math.sqrt(z * z - 1), r1 = -w0 * (z - q), r2 = -w0 * (z + q), a = r2 / (r2 - r1), b = -r1 / (r2 - r1); return 1 - (a * Math.exp(r1 * t) + b * Math.exp(r2 * t)); }; };
const vi = (x, d) => x.toFixed(d).replace(".", ",");
const SPRING = function (el, tl, at, o) {
  var s = MW.spring(o.stiffness, o.damping, o.mass), T0 = s.duration;
  return MW.drive(tl, at, o.back == null ? T0 : o.back + T0, function (t) { var v = s.at(Math.max(0, t)) - (o.back != null && t > o.back ? s.at(t - o.back) : 0), q = {}; q[o.prop] = o.from + (o.to - o.from) * v; gsap.set(el, q); });
};
const SP_OPT = { stiffness: "", damping: "", mass: "", prop: "the property it drives: x | y | scale | rotation (x)", from: "(0)", to: "(560 px)", back: "s after the start to spring back (null)" };
const SPD = (name, k, c, m, settle) => {
  const f = springAt(k, c, m), Tg = Math.max(0.7, settle * 1.5), back = 0.4 + Math.max(1.3, settle + 0.6), dur = back + settle + 0.7;
  let mx = 0; for (let t = 0; t < 6; t += 0.001) mx = Math.max(mx, f(t));
  const pts = Array.from({ length: 101 }, (_, i) => `${(6.4 * i).toFixed(1)},${(270 - 190 * f(Tg * i / 100)).toFixed(1)}`).join(" ");
  return { css: `${BG}\n.sp-tr { position: absolute; left: 300px; width: 760px; top: 348px; height: 4px; background: #262c3a; } .sp-tg { position: absolute; left: 860px; top: 150px; width: 200px; height: 200px; border: 5px dashed #5a6378; border-radius: 36px; box-sizing: border-box; }
.sp-b { position: absolute; left: 300px; top: 150px; width: 200px; height: 200px; border-radius: 36px; background: linear-gradient(150deg, #a693ff, #6a4cf0); } .sp-g { position: absolute; left: 300px; top: 470px; width: 960px; height: 450px; }
.sp-l { position: absolute; left: 1360px; top: 470px; display: flex; flex-direction: column; gap: 10px; font-size: 40px; color: #8f9ab3; } .sp-l b { font-size: 90px; color: #e8ebf3; margin-top: 30px; }`,
    html: `<div class="sp-tr"></div><div class="sp-tg"></div><div class="sp-b"></div><svg class="sp-g" viewBox="0 0 640 300"><line x1="0" y1="80" x2="640" y2="80" stroke="#5a6378" stroke-width="2" stroke-dasharray="8 8"/><line x1="0" y1="270" x2="640" y2="270" stroke="#2a3142" stroke-width="2"/><polyline points="${pts}" fill="none" stroke="#8b7bff" stroke-width="5" stroke-linejoin="round"/><line class="sp-mk" x1="0" y1="0" x2="0" y2="290" stroke="#e8ebf3" stroke-width="2"/></svg>
<div class="sp-l"><b>${mx - 1 > 0.0005 ? vi(100 * (mx - 1), 1) : "0"} %</b><span>vượt đích</span><b>~${vi(settle, 2)} s</b><span>tới đích (trong 1 %)</span><span style="margin-top:30px">k ${k} · c ${c} · m ${m}</span></div>`,
    run: `MW.${name}(q(".sp-b"), tl, 0.4, { back: ${back.toFixed(2)} }); tl.fromTo(q(".sp-mk"), { x: 0 }, { x: 640, duration: ${Tg.toFixed(2)}, ease: "none" }, 0.4);`, duration: +dur.toFixed(2) };
};
const P = (id, k, c, m, settle, notes) => T(id, { uses: ["drive", "spring"], fn: SPRING, options: SP_OPT, defaults: { stiffness: k, damping: c, mass: m, prop: "x", from: 0, to: 560, back: null }, notes,
  demo: SPD(id.replace(/[/-]([a-z0-9])/g, (x, ch) => ch.toUpperCase()), k, c, m, settle) });

export default [
  P("motion/spring-snap", 180, 13, 0.6, 0.37, "Damping ratio 0.63: about 8 % past, within 1 % by ~0.37 s. For presses and small accents."),
  P("motion/spring-bounce", 150, 9, 0.8, 0.82, "Damping ratio 0.41: about 24 % past, two clear bounces, settled by ~0.82 s. Only for play, mascots and hero moments."),
  P("motion/spring-smooth", 120, 26, 1, 0.83, "Over-damped (ratio 1.19): no overshoot, in by ~0.83 s, like a damped door; fine near body text."),
  P("motion/spring-heavy", 80, 16, 1.6, 0.93, "Ratio 0.71: about 4 % past and a slow landing (~0.93 s), for large cards and full-screen objects."),
  P("motion/spring-default", 170, 26, 1, 0.51, "react-spring's default (tension 170, friction 26): critically damped in practice, no overshoot, ~0.51 s. The reference when unsure."),
  P("motion/spring-wobbly", 180, 12, 1, 0.65, "react-spring's wobbly (180 / 12): about 21 % past, settled by ~0.65 s; characters and stickers."),
  P("motion/spring-molasses", 280, 120, 1, 1.94, "react-spring's molasses (280 / 120): heavily over-damped, no overshoot, nearly 2 s to arrive."),
  P("motion/spring-framer-bouncy", 400, 17, 1, 0.55, "A strong, fast spring (400 / 17, ratio 0.43): about 23 % past with a clear rebound, ~0.55 s."),
  P("motion/spring-modal", 280, 28, 1, 0.26, "The modal-presentation spring (280 / 28): barely past (0.8 %), settled by ~0.26 s."),
  P("motion/spring-critical", 300, 34.64, 1, 0.38, "Damping 2√k: the fastest stop without overshoot, ~0.38 s."),

  T("motion/spring-retarget", {
    uses: ["drive", "springs"],
    fn: function (el, tl, at, o) {
      var X = MW.springTo(o.stiffness, o.damping, o.keys), M = o.markers ? Array.prototype.slice.call(document.querySelectorAll(o.markers)) : [];
      return MW.drive(tl, at, o.duration, function (t) { gsap.set(el, { x: X(t) }); M.forEach(function (m, i) { var k = o.keys[i + 1], on = k && t >= k[0]; m.style.opacity = on ? "1" : "0.35"; gsap.set(m, { scale: on ? 1 + 0.25 * Math.exp(-8 * (t - k[0])) : 1 }); }); });
    },
    options: { keys: "[[s, px], ...]: each change adds a spring, so it never restarts", stiffness: "(170)", damping: "(20)", markers: "elements that light as each target activates", duration: "s (3)" },
    defaults: { keys: [[0, 0], [0.3, 1100], [0.75, 385], [1.3, 935], [2.2, 0]], stiffness: 170, damping: 20, markers: null, duration: 3 },
    notes: "x(t) = x0 + Σ Δx · spring(t − ti), so any time can be computed directly.",
    demo: { css: `${BG}\n.rt-l { position: absolute; left: 300px; width: 1300px; top: 618px; height: 4px; background: #262c3a; } .rt-m { position: absolute; top: 650px; width: 40px; height: 40px; margin-left: -20px; border-radius: 50%; background: #ffd23d; opacity: 0.35; } .rt { position: absolute; left: 300px; top: 460px; width: 160px; height: 160px; border-radius: 30px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="rt-l"></div>${[1100, 385, 935, 0].map((x) => `<div class="rt-m" style="left:${380 + x}px"></div>`).join("")}<div class="rt"></div>`, run: `MW.motionSpringRetarget(q(".rt"), tl, 0, { markers: ".rt-m" });`, duration: 3 },
  }),

  T("motion/spring-split-edge", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var tabs = Array.prototype.slice.call(document.querySelectorAll(o.tabs)), pr = el.parentNode, pb = pr.getBoundingClientRect(), E = tabs.map(function (b) { var r = b.getBoundingClientRect(); return [r.left - pb.left, r.right - pb.left]; });
      var lead = MW.spring(o.lead[0], o.lead[1]), trail = MW.spring(o.trail[0], o.trail[1]), K = o.keys, sp = function (s, t) { return t <= 0 ? 0 : s.at(t); };
      el.style.position = "absolute"; el.style.left = "0px";
      return MW.drive(tl, at, o.duration, function (t) { var L = E[K[0][1]][0], R = E[K[0][1]][1];
        for (var j = 1; j < K.length; j++) { var a = E[K[j - 1][1]], b = E[K[j][1]], dL = b[0] - a[0], dR = b[1] - a[1], right = dL + dR > 0, d = t - K[j][0]; L += dL * sp(right ? trail : lead, d); R += dR * sp(right ? lead : trail, d); }
        gsap.set(el, { x: L }); el.style.width = Math.max(4, R - L) + "px"; var cx = (L + R) / 2; tabs.forEach(function (b, i) { var c = (E[i][0] + E[i][1]) / 2; b.style.color = Math.abs(cx - c) < (E[i][1] - E[i][0]) / 2 ? o.activeColor : ""; }); });
    },
    options: { tabs: "", keys: "[[s, tab index], ...]", lead: "[k, c] of the edge in front (320, 30: ~240 ms)", trail: "[k, c] of the edge behind (140, 22: ~470 ms)", activeColor: "label colour under the pill", duration: "s (3.2)" },
    defaults: { tabs: ".tb", keys: [[0, 0], [0.4, 1], [1.1, 3], [1.8, 2], [2.5, 0]], lead: [320, 30], trail: [140, 22], activeColor: "#0b0d12", duration: 3.2 },
    notes: "The edge in the direction of travel follows a stiff spring and the other a soft one, both summed per change, so the pill stretches toward the new tab, then catches up.",
    demo: { css: `${BG}\n${ST} .tbar { position: relative; display: flex; gap: 0; padding: 18px; border-radius: 80px; background: #151a24; border: 3px solid #262c3a; } .tbar .tb { position: relative; z-index: 1; width: 300px; height: 120px; display: grid; place-items: center; font-size: 48px; font-weight: 800; color: #8f9ab3; } .tbar .pl { top: 18px; bottom: 18px; border-radius: 60px; background: #a99bff; }`,
      html: `<div class="st"><div class="tbar"><div class="pl"></div>${["Tất cả", "Video", "Ảnh", "Âm thanh"].map((n) => `<div class="tb">${n}</div>`).join("")}</div></div>`, run: `MW.motionSpringSplitEdge(q(".pl"), tl, 0, {});`, duration: 3.2 },
  }),

  T("motion/spring-vs-tween", {
    uses: ["drive", "spring", "eases"],
    fn: function (el, tl, at, o) {
      var a = el.querySelector(o.tween), b = el.querySelector(o.spring), e = MW.ez(o.ease), s = MW.spring(o.stiffness, o.damping);
      return MW.drive(tl, at, o.back + Math.max(o.duration, s.duration), function (t) { var u = e(Math.max(0, Math.min(1, t / o.duration))), v = s.at(Math.max(0, t)); if (t > o.back) { u -= e(Math.min(1, (t - o.back) / o.duration)); v -= s.at(t - o.back); } gsap.set(a, { x: o.distance * u }); gsap.set(b, { x: o.distance * v }); });
    },
    options: { tween: "the timed element", spring: "the spring element", distance: "px (1100)", duration: "s of the tween (0.5)", ease: "(expo.out)", stiffness: "(200)", damping: "(14): about 17 % past, ~0.62 s", back: "s both return (1.6)" },
    defaults: { tween: ".vt", spring: ".vs", distance: 1100, duration: 0.5, ease: "cubic-bezier(.16,1,.3,1)", stiffness: 200, damping: 14, back: 1.6 },
    notes: "The lesson: springs for objects with mass, timed Béziers for text and cameras (no overshoot on text).",
    demo: { css: `${BG}\n.sv { position: absolute; inset: 0; } .sv-r { position: absolute; left: 300px; width: 1300px; height: 4px; background: #262c3a; } .sv-g { position: absolute; left: 1400px; width: 160px; height: 160px; border: 5px dashed #5a6378; border-radius: 30px; box-sizing: border-box; } .sv i { position: absolute; left: 300px; width: 160px; height: 160px; border-radius: 30px; }
.sv b { position: absolute; left: 300px; font-size: 40px; font-weight: 800; color: #8f9ab3; }`,
      html: `<div class="sv"><b style="top:250px">tween · 0,5 s expo.out</b><div class="sv-r" style="top:476px"></div><div class="sv-g" style="top:320px"></div><i class="vt" style="top:320px;background:#3dd6f5"></i><b style="top:600px">lò xo · k 200 · c 14</b><div class="sv-r" style="top:826px"></div><div class="sv-g" style="top:670px"></div><i class="vs" style="top:670px;background:#a99bff"></i></div>`,
      run: `MW.motionSpringVsTween(q(".sv"), tl, 0.3, {});`, duration: 3 },
  }),

  T("motion/overshoot-budget", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), S = o.springs.map(function (q) { return MW.spring(q[0], q[1]); }); it.forEach(function (b) { gsap.set(b, { transformOrigin: "50% 100%" }); });
      return MW.drive(tl, at, o.duration, function (t) { it.forEach(function (b, i) { var v = t <= 0 ? 0 : S[i % S.length].at(t), d = Math.max(0, Math.min(1, (t - o.dropAt) / 0.35)); gsap.set(b, { scaleY: Math.max(0, v) * (1 - d * d) }); }); });
    },
    options: { items: "", springs: "[[k, c], ...] per bar", dropAt: "s the bars drop again (1.9)", duration: "s (2.4)" },
    defaults: { items: ".ob-b", springs: [[300, 34.6], [260, 22], [220, 15], [180, 9]], dropAt: 1.9, duration: 2.4 },
    notes: "The budget: errors and premium 0 %, feedback 2–5 %, success 5–10 %, celebration 15–25 %; above 25 % reads as broken. The site labels these springs 0 / 3 / 8 / 20 %; they actually give 0 / 5.3 / 15.9 / 32.7 %.",
    demo: { css: `${BG}\n.ob { position: absolute; left: 360px; right: 360px; top: 160px; height: 700px; display: flex; justify-content: space-around; align-items: flex-end; border-bottom: 4px solid #3a4466; } .ob::before { content: ""; position: absolute; left: 0; right: 0; bottom: 500px; border-top: 4px dashed #5a6378; }
.ob-b { width: 150px; height: 500px; border-radius: 22px 22px 0 0; } .ob-t { position: absolute; left: 360px; right: 360px; top: 880px; display: flex; justify-content: space-around; text-align: center; font-size: 38px; color: #8f9ab3; } .ob-t b { display: block; font-size: 56px; color: #e8ebf3; }`,
      html: `<div class="ob">${["#75e4d2", "#91a4ff", "#ffd23d", "#ff6f91"].map((c) => `<div class="ob-b" style="background:${c}"></div>`).join("")}</div><div class="ob-t"><span><b>0 %</b>lỗi · cao cấp</span><span><b>3 %</b>phản hồi</span><span><b>8 %</b>thành công</span><span><b>20 %</b>ăn mừng</span></div>`,
      run: `MW.motionOvershootBudget(q(".ob"), tl, 0.2, {});`, duration: 2.6 },
  }),

  T("motion/inertia-glide", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var cu = o.cursor ? document.querySelector(o.cursor) : null, rel = o.start + o.dragTime, x1 = o.drag, end = Math.round((x1 + o.throw) / o.snap) * o.snap, D = end - x1, G = 6 * o.tau, io = gsap.parseEase("power2.inOut");
      var r = el.getBoundingClientRect(), pr = cu ? (cu.offsetParent || cu.parentNode).getBoundingClientRect() : r, cx = r.left + r.width / 2 - pr.left, cy = r.top + r.height / 2 - pr.top;
      var X = function (t) { if (t < o.start) return 0; if (t < rel) return o.drag * (t - o.start) / o.dragTime; var g = Math.min(G, t - rel), x = x1 + D * (1 - Math.exp(-g / o.tau)) / (1 - Math.exp(-G / o.tau)); return t > o.backAt ? end * (1 - io(Math.min(1, (t - o.backAt) / 0.6))) : x; };
      return MW.drive(tl, at, o.backAt + 0.6, function (t) { gsap.set(el, { x: X(t) }); if (!cu) return; var px, py, down = t >= o.start && t < rel;
        if (t < o.start) { var u = io(Math.min(1, t / Math.max(0.01, o.start - 0.08))); px = cx + 260 * (1 - u); py = cy + 320 * (1 - u); } else if (t < rel) { px = cx + X(t); py = cy; } else { var g = t - rel; px = cx + x1 + 90 * (1 - Math.exp(-g / 0.2)); py = cy + 60 * (1 - Math.exp(-g / 0.3)); }
        gsap.set(cu, { x: px - 12, y: py - 6, scale: down ? 0.86 : 1, transformOrigin: "12px 6px" }); });
    },
    options: { start: "s the drag starts (0.5)", drag: "px dragged (250)", dragTime: "s (0.4), linear", tau: "s time constant of the glide (0.3)", throw: "px of the natural glide (700)", snap: "px slot it lands on (240)", backAt: "s it returns (2.6)", cursor: "" },
    defaults: { start: 0.5, drag: 250, dragTime: 0.4, tau: 0.3, throw: 700, snap: 240, backAt: 2.6, cursor: ".ui-cursor" },
    notes: "After release x = release + D (1 − e^(−t/τ)), normalised over 6 τ so it stops exactly on the slot (D chosen so the end lands on the grid).",
    demo: { css: `${BG}\n${CUR} .ig-r { position: absolute; left: 300px; width: 1340px; top: 700px; height: 4px; background: #262c3a; } .ig-t { position: absolute; top: 680px; width: 4px; height: 44px; margin-left: -2px; background: #5a6378; } .ig { position: absolute; left: 300px; top: 520px; width: 240px; height: 160px; margin-left: -120px; border-radius: 30px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="ig-r"></div>${[0, 1, 2, 3, 4, 5].map((k) => `<div class="ig-t" style="left:${300 + 240 * k}px"></div>`).join("")}<div class="ig"></div>${CURSOR}`, run: `MW.motionInertiaGlide(q(".ig"), tl, 0, {});`, duration: 3.4 },
  }),

  T("motion/projectile-arc", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items));
      return MW.drive(tl, at, o.duration, function (t) { it.forEach(function (b, i) { var d = t - o.start - i * o.gap, a = o.angles[i % o.angles.length] * Math.PI / 180, y = o.v * Math.sin(a) * d - 0.5 * o.g * d * d;
        if (d <= 0) { gsap.set(b, { x: 0, y: 0 }); b.style.opacity = "1"; return; } gsap.set(b, { x: o.v * Math.cos(a) * d * o.xScale, y: -Math.max(0, y) }); b.style.opacity = y < 0 ? "0" : "1"; }); });
    },
    options: { items: "", angles: "degrees per item ([60, 67, 74, 81, 88])", v: "px/s (1045)", g: "px/s² (1650)", xScale: "(0.9)", gap: "s between launches (0.08)", start: "s (0.3)", duration: "s (2)" },
    defaults: { items: "i", angles: [60, 67, 74, 81, 88], v: 1045, g: 1650, xScale: 0.9, gap: 0.08, start: 0.3, duration: 2 },
    notes: "x = v cos θ t, y = v sin θ t − ½ g t²: a pure function of time; each item hides once it reaches the floor. For confetti and thrown objects.",
    demo: { css: `${BG}\n.pa-f { position: absolute; left: 200px; right: 200px; top: 862px; height: 4px; background: #262c3a; } .pa i { position: absolute; left: 400px; top: 802px; width: 60px; height: 60px; border-radius: 50%; }`,
      html: `<div class="pa-f"></div><div class="pa">${["#75e4d2", "#91a4ff", "#ffd23d", "#ff6f91", "#a99bff"].map((c) => `<i style="background:${c}"></i>`).join("")}</div>`, run: `MW.motionProjectileArc(q(".pa"), tl, 0, {});`, duration: 2 },
  }),

  T("text/magnetic-letters", {
    uses: TU,
    fn: mt(`var ch = split("chars"), cu = cursorEl(o.cursor), e = MW.ez(o.ease), po2 = gsap.parseEase("power2.out"), B = bounds(ch), C = centres(ch), R = o.radius * fs, k = o.keys;
var off = [B.l - 2 * fs, B.b + 5 * fs], PK = [[0, off[0], off[1]], [k[0], off[0], off[1]], [k[1], B.l + 0.18 * B.w, B.cy + 0.6 * fs], [k[2], B.r - 0.22 * B.w, B.cy - 0.37 * fs], [k[3], B.r - 0.08 * B.w, B.cy + 0.29 * fs], [k[4], B.r + 2 * fs, B.t - 5 * fs]];
var P = function (t) { return MW.path(PK, t, e); }, tgt = function (i, t) { var p = P(t), dx = p[0] - C[i][0], dy = p[1] - C[i][1], d = Math.hypot(dx, dy); if (d >= R) return [0, 0]; var f = o.strength * (1 - d / R); return [dx * f, dy * f]; };
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var s0 = Math.max(0, t - o.window), v = tgt(i, s0), prev = v.slice(); for (var s = s0 + 1 / 60; s <= t + 1e-9; s += 1 / 60) { var q = tgt(i, s), w = po2(pin((t - s) / o.follow)); v[0] += (q[0] - prev[0]) * w; v[1] += (q[1] - prev[1]) * w; prev = q; }
  gsap.set(c, { x: v[0], y: v[1] }); c.style.color = mixc(o.accent, Math.hypot(v[0], v[1]) / (o.tintAt * fs)); }); var p = P(t); place(cu, p[0], p[1], false); });`),
    options: { radius: "em of the pull (2.1)", strength: "share of the gap pulled at the centre (0.4)", follow: "s each change takes, power2.out (0.4)", window: "s of history summed (0.6)", tintAt: "em of pull at full accent (0.33)", accent: "", keys: "s the pointer arrives at each point ([0.35, 1.1, 2.0, 2.6, 3.35])", ease: "(cubic-bezier(.65,0,.35,1))", cursor: "", loop: "s (4.2)" },
    defaults: { radius: 2.1, strength: 0.4, follow: 0.4, window: 0.6, tintAt: 0.33, accent: "#8b7bff", keys: [0.35, 1.1, 2.0, 2.6, 3.35], ease: "cubic-bezier(.65,0,.35,1)", cursor: ".ui-cursor", loop: 4.2 },
    notes: "Each letter's target is (pointer − letter) × 0.4 × (1 − d / radius); the shown offset sums the target's changes, each eased in over 0.4 s.",
    demo: HC("Hút về con trỏ", `MW.textMagneticLetters(q(".tk-head"), tl, 0, {});`, 4.2, { size: 170 }),
  }),

  T("text/proximity-repel", {
    uses: TU,
    fn: mt(`var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative"; var gh = el.cloneNode(true); gh.removeAttribute("id"); gh.style.cssText += ";position:absolute;margin:0;pointer-events:none;opacity:0;left:" + el.offsetLeft + "px;top:" + el.offsetTop + "px;width:" + el.offsetWidth + "px;"; host.insertBefore(gh, el);
var ch = split("chars"), cu = cursorEl(o.cursor), io = gsap.parseEase("power2.inOut"), B = bounds(ch), C = centres(ch), R = o.radius * fs, M = o.push * fs, off0 = [B.l - 2 * fs, B.b + 5 * fs], off1 = [B.r + 2 * fs, B.b + 5 * fs];
var pos = function (t) { if (t <= 0.4) return off0; if (t < 0.9) { var u = io((t - 0.4) / 0.5); return [off0[0] + (B.l - 0.4 * fs - off0[0]) * u, off0[1] + (B.cy - off0[1]) * u]; } if (t < 2.3) { var u = (t - 0.9) / 1.4; return [B.l - 0.4 * fs + (B.w + 0.8 * fs) * u, B.cy]; } var u = io(pin((t - 2.3) / 0.55)); return [B.r + 0.4 * fs + (off1[0] - B.r - 0.4 * fs) * u, B.cy + (off1[1] - B.cy) * u]; };
var tgt = function (i, p) { var dx = C[i][0] - p[0], dy = C[i][1] - p[1], d = Math.hypot(dx, dy); if (d >= R || d < 1e-3) return [0, 0]; var f = M * (1 - d / R) / d; return [dx * f, dy * f]; };
return MW.drive(tl, at, o.loop, function (t) { var V = ch.map(function () { return [0, 0]; }); for (var s = 0; s <= t + 1e-9; s += 1 / 60) { var p = pos(s); for (var i = 0; i < ch.length; i++) { var q = tgt(i, p); V[i][0] += o.follow * (q[0] - V[i][0]); V[i][1] += o.follow * (q[1] - V[i][1]); } }
  var mx = 0; ch.forEach(function (c, i) { var v = V[i], m = Math.hypot(v[0], v[1]); mx = Math.max(mx, m); gsap.set(c, { x: v[0], y: v[1], rotation: o.tilt * v[0] / fs }); c.style.color = mixc(o.accent, m / (o.tintAt * fs)); });
  gh.style.opacity = String(o.ghost * pin(mx / (0.2 * fs))); var p = pos(t); place(cu, p[0], p[1], false); });`),
    options: { radius: "em (1.3)", push: "em at most (0.5)", follow: "share of the gap closed each 1/60 s (0.15)", tilt: "degrees per em of sideways push (18)", tintAt: "em at full accent (0.3)", accent: "", ghost: "opacity of the resting copy while displaced (0.15)", cursor: "", loop: "s (4)" },
    defaults: { radius: 1.3, push: 0.5, follow: 0.15, tilt: 18, tintAt: 0.3, accent: "#8b7bff", ghost: 0.15, cursor: ".ui-cursor", loop: 4 },
    notes: "The pointer comes in from the lower left, crosses the line at a steady speed and leaves to the lower right; the smoothing is stepped on the film clock.",
    demo: HC("Dạt ra hai bên", `MW.textProximityRepel(q(".tk-head"), tl, 0, {});`, 4, { size: 170 }),
  }),

  T("text/proximity-scramble", {
    uses: TU,
    fn: mt(`var ch = split("chars"), cu = cursorEl(o.cursor), io = gsap.parseEase("power2.inOut"), B = bounds(ch), C = centres(ch), R = o.radius * fs, y0 = B.cy + 0.45 * fs, off0 = [B.l - 2 * fs, B.b + 5 * fs], off1 = [B.r + 2 * fs, B.t - 5 * fs];
var pos = function (t) { if (t <= 0.4) return off0; if (t < 0.9) { var u = io((t - 0.4) / 0.5); return [off0[0] + (B.l - off0[0]) * u, off0[1] + (y0 - off0[1]) * u]; } if (t < 2.5) return [B.l + B.w * (t - 0.9) / 1.6, y0]; var u = io(pin((t - 2.5) / 0.5)); return [B.r + (off1[0] - B.r) * u, y0 + (off1[1] - y0) * u]; };
var W = ch.map(function () { return []; }); for (var s = 0; s <= o.loop; s += 1 / 30) { var p = pos(s); C.forEach(function (q, i) { var d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < R) W[i].push([s, s + o.hold * (1 - d / R)]); }); }
var OV = ch.map(function (c) { c.style.position = "relative"; var v = document.createElement("span"), b = document.createElement("i"); v.style.cssText = "position:absolute;left:0;right:0;top:0;bottom:0;display:none;align-items:center;justify-content:center;font-family:ui-monospace,Consolas,monospace;font-weight:700;color:" + o.accent + ";";
  b.style.cssText = "position:absolute;left:10%;bottom:-0.04em;height:0.06em;border-radius:0.03em;background:" + o.accent + ";display:none;"; c.appendChild(v); c.appendChild(b); return [v, b]; });
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var left = 0; W[i].forEach(function (w) { if (w[0] <= t && t < w[1]) left = Math.max(left, w[1] - t); }); var v = OV[i][0], b = OV[i][1];
  if (left > 0) { var r = MW.rand(o.seed + 31 * i + Math.floor(t / o.swap)); v.textContent = o.chars.charAt(Math.floor(r() * o.chars.length)); v.style.display = "flex"; b.style.display = "block"; b.style.width = 80 * Math.min(1, left / o.hold) + "%"; c.style.color = "color-mix(in srgb, " + base + " 55%, transparent)"; }
  else { v.style.display = "none"; b.style.display = "none"; c.style.color = ""; } }); place(cu, pos(t)[0], pos(t)[1], false); });`),
    options: { radius: "em (1.1)", hold: "s a letter stays scrambled after the closest pass (1.2 × (1 − d / radius))", swap: "s between symbols (0.08)", chars: "symbols used (.:)", seed: "(5)", accent: "", cursor: "", loop: "s (4.4)" },
    defaults: { radius: 1.1, hold: 1.2, swap: 0.08, chars: ".:", seed: 5, accent: "#8b7bff", cursor: ".ui-cursor", loop: 4.4 },
    notes: "The pointer is sampled at 30 fps; each scrambled letter shows a seeded symbol over a 55 % ghost of itself, with a bar under it that shrinks with the time left.",
    demo: HC("Chữ hoá ký hiệu", `MW.textProximityScramble(q(".tk-head"), tl, 0, {});`, 4.4, { size: 170 }),
  }),

  T("text/clone-roll-hover", {
    uses: TU,
    fn: mt(`var btn = o.button ? el.closest(o.button) || document.querySelector(o.button) : null, ch = split("chars"), cu = cursorEl(o.cursor), po2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), CL = [];
MW.split(el, "chars").words.forEach(function (w) { w.style.overflow = "hidden"; w.style.padding = "0.25em 0"; w.style.margin = "-0.25em 0"; w.style.verticalAlign = "top"; });
ch.forEach(function (c) { c.style.position = "relative"; var k = document.createElement("span"); k.textContent = c.textContent; k.style.cssText = "position:absolute;left:0;top:0;color:" + o.accent + ";"; c.appendChild(k); CL.push(k); });
var R = (btn || el).getBoundingClientRect(), mute = btn ? getComputedStyle(btn).borderColor : "";
var PK = [[0, R.right + 0.6 * R.width, R.bottom + 1.6 * R.height], [o.enter - 0.45, R.right + 0.15 * R.width, R.bottom + 0.4 * R.height], [o.enter, R.left + 0.72 * R.width, R.top + 0.62 * R.height], [o.leave - 0.15, R.left + 0.45 * R.width, R.top + 0.55 * R.height], [o.leave + 0.4, R.right + 0.5 * R.width, R.bottom + 1.4 * R.height]];
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var s = po2(pin((t - o.enter - i * o.stagger) / o.duration)) - po2(pin((t - o.leave - i * o.stagger) / o.duration)); gsap.set(c, { y: -o.roll * fs * s }); gsap.set(CL[i], { y: o.roll * fs }); });
  if (btn) { var b = pin((t - o.enter) / 0.2) - pin((t - o.leave) / 0.25); btn.style.borderColor = b > 0.005 ? "color-mix(in srgb, " + o.accent + " " + Math.round(100 * b) + "%, " + mute + ")" : ""; }
  var p = MW.path(PK, t, io); place(cu, p[0], p[1], false); });`),
    options: { button: "the button around the label", enter: "s the pointer enters (0.5)", leave: "s it leaves (2.5)", duration: "s per letter (0.4, power2.out)", stagger: "s (0.02)", roll: "em per line (1.5)", accent: "", cursor: "", loop: "s (3.6)" },
    defaults: { button: ".cr-b", enter: 0.5, leave: 2.5, duration: 0.4, stagger: 0.02, roll: 1.5, accent: "#8b7bff", cursor: ".ui-cursor", loop: 3.6 },
    notes: "Each letter rolls up out of its line clip while an accent copy rolls up from below into its place; leaving reverses it with the same timing; the border tints to the accent.",
    demo: { css: `${BG}\n${ST} ${CUR} .cr-b { display: inline-flex; padding: 60px 130px; border-radius: 200px; border: 7px solid #3a4466; background: #151a24; } .cr-t { font-size: 110px; font-weight: 800; line-height: 1.2; }`,
      html: `<div class="st"><div class="cr-b"><span class="cr-t">Xem dự án</span></div></div>${CURSOR}`, run: `MW.textCloneRollHover(q(".cr-t"), tl, 0, {});`, duration: 3.6 },
  }),

  T("text/hover-word-lift", {
    uses: [...TU, "spring"],
    fn: mt(`var w = split("words"), n = w.length, cu = cursorEl(o.cursor), io = gsap.parseEase("power2.inOut"), s = MW.spring(o.stiffness, o.damping), sp = function (d) { return d <= 0 ? 0 : s.at(d); }, C = centres(w), B = bounds(w), r = Math.min(0.18, 1.3 / n), U = [];
w.forEach(function (x) { x.style.position = "relative"; var u = document.createElement("i"); u.style.cssText = "position:absolute;left:0;right:0;bottom:-0.06em;height:0.05em;border-radius:0.025em;opacity:0;background:" + o.accent + ";"; x.appendChild(u); U.push(u); });
var TT = w.map(function (_, i) { return o.from + (o.to - o.from) * (n > 1 ? i / (n - 1) : 0); }), PK = [[0, B.l - 1.5 * fs, B.b + 4 * fs], [Math.max(0.05, TT[0] - r - 0.4), B.l - 0.5 * fs, B.b + 1.5 * fs]];
TT.forEach(function (tt, i) { PK.push([tt - r, C[i][0], C[i][1] + 0.15 * fs]); PK.push([tt + r, C[i][0] + 0.1 * fs, C[i][1] + 0.15 * fs]); }); PK.push([o.to + 0.5, B.r + 1.5 * fs, B.b + 4 * fs]);
return MW.drive(tl, at, o.loop, function (t) { w.forEach(function (x, i) { var k = sp(t - TT[i] + r) - sp(t - TT[i] - r); gsap.set(x, { y: -o.lift * fs * k }); var q = Math.max(0, Math.min(1, k)); x.style.color = mixc(o.accent, q); U[i].style.opacity = String(q); }); var p = MW.path(PK, t, io); place(cu, p[0], p[1], false); });`),
    options: { lift: "em (0.2)", stiffness: "(400)", damping: "(26): ζ ≈ 0.65, ~0.3 s", from: "s the first word is visited (0.9)", to: "s the last (3.5)", accent: "", cursor: "", loop: "s (4.6)" },
    defaults: { lift: 0.2, stiffness: 400, damping: 26, from: 0.9, to: 3.5, accent: "#8b7bff", cursor: ".ui-cursor", loop: 4.6 },
    notes: "The pointer rests ± min(0.18, 1.3 / n) s on each word in turn; the hovered word lifts on the spring, tints and gets a fading underline.",
    demo: HC("Mỗi từ nhấc lên khi con trỏ ghé qua", `MW.textHoverWordLift(q(".tk-head"), tl, 0, {});`, 4.6, { size: 110 }),
  }),

  K("cursor/word-trail", {
    fn: mk(`var e = MW.ez("cubic-bezier(.65,0,.35,1)"), bo = gsap.parseEase("back.out(1.7)"), p1 = gsap.parseEase("power1.out"), W = o.words, tw = 0;
var path = function (t) { var u = e(pin((t - o.start) / (o.end - o.start))); return [26 + 268 * u, 100 + 42 * Math.sin(2 * Math.PI * 1.15 * u + 0.4) * (1 - 0.25 * u)]; };
c.font = "800 9px Inter, sans-serif"; W.forEach(function (x) { tw = Math.max(tw, c.measureText(x).width); }); var gap = Math.max(34, Math.min(80, tw + 10)), Sx = [], acc = 0, prev = path(0);
for (var t = o.start; t <= o.end; t += 1 / 240) { var p = path(t), d = Math.hypot(p[0] - prev[0], p[1] - prev[1]); acc += d; if (acc >= gap) { Sx.push({ t: t, x: p[0], y: p[1], a: Math.atan2(p[1] - prev[1], p[0] - prev[0]), w: Sx.length % W.length }); acc = 0; } prev = p; }
Sx.forEach(function (s, i) { s.out = i + o.max < Sx.length ? Sx[i + o.max].t : o.stopAt + 0.03 * (i - Math.max(0, Sx.length - o.max)); });
return MW.drive(tl, at, o.loop, function (t) { S.clear(); Sx.forEach(function (s, i) { if (t < s.t) return; var d = t - s.t, q = p1(pin((t - s.out) / 0.5)), sc = (0.5 + 0.5 * bo(pin(d / 0.25))) * (1 - 0.5 * q); if (q >= 1) return;
    c.save(); c.globalAlpha = 1 - q; c.translate(s.x, s.y - 4 * d + 3 * Math.sin(2 * Math.PI * d / 1.6 + i)); c.rotate(0.8 * s.a); c.scale(sc, sc); MW.txt(c, W[s.w], 0, 0, 9, s.w === 0 ? "#a99bff" : "#e8ebf3", 800); c.restore(); });
  var p = path(t); MW.cursor(c, p[0], p[1], 1); });`),
    options: { words: "stamped in turn", start: "s (0.3)", end: "s the path ends (2.9)", max: "words on screen (7)", stopAt: "s they start to leave, 30 ms apart (3.45)", loop: "s (4.2)" },
    defaults: { words: ["chuyển động", "nhịp", "ý tưởng", "màu", "âm thanh", "khung hình", "kể chuyện", "dựng"], start: 0.3, end: 2.9, max: 7, stopAt: 3.45, loop: 4.2 },
    notes: "Every (widest word + 10 px) of travel a word is stamped, tilted 0.8 × the travel angle; the eighth evicts the oldest (0.5 s power1.out to 0, scale × 0.5).",
  }),

  T("text/outline-spotlight", {
    uses: ["drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var svg = el.ownerSVGElement, ns = "http://www.w3.org/2000/svg", bb = el.getBBox(), id = "mw-spot-" + (window.__mwSpot = (window.__mwSpot || 0) + 1), e = MW.ez(o.ease), cu = o.cursor ? document.querySelector(o.cursor) : null, C = o.colors;
      var defs = document.createElementNS(ns, "defs"); defs.innerHTML = '<linearGradient id="' + id + 'g" gradientUnits="userSpaceOnUse" x1="' + bb.x + '" y1="' + bb.y + '" x2="' + (bb.x + bb.width) + '" y2="' + (bb.y + bb.height) + '"><stop offset="0" stop-color="' + C[0] + '"/><stop offset="0.5" stop-color="' + C[1] + '"/><stop offset="1" stop-color="' + C[2] + '"/></linearGradient>'
        + '<radialGradient id="' + id + 'r"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
        + '<mask id="' + id + 'm" maskUnits="userSpaceOnUse" x="' + (bb.x - 4000) + '" y="' + (bb.y - 4000) + '" width="' + (bb.width + 8000) + '" height="' + (bb.height + 8000) + '"><circle r="' + o.radius + '" fill="url(#' + id + 'r)"/></mask>'
        + '<filter id="' + id + 'f" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="' + o.glow / 2 + '" result="b"/><feFlood flood-color="' + C[1] + '"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
      svg.insertBefore(defs, svg.firstChild); var spot = el.cloneNode(true); spot.removeAttribute("class"); spot.setAttribute("stroke", "url(#" + id + "g)"); spot.setAttribute("stroke-width", o.width[1]); spot.setAttribute("mask", "url(#" + id + "m)"); spot.setAttribute("filter", "url(#" + id + "f)"); el.parentNode.insertBefore(spot, el.nextSibling);
      el.setAttribute("stroke-width", o.width[0]); var circ = defs.querySelector("circle"), vb = svg.viewBox.baseVal; [el, spot].forEach(function (n) { n.style.strokeDasharray = o.dash + " " + o.dash; });
      var cl = function (u) { return Math.max(0, Math.min(1, u)); }, PK = [[0, bb.x - 0.25 * bb.width, bb.y + 1.8 * bb.height], [o.spotIn[0], bb.x - 0.08 * bb.width, bb.y + 0.6 * bb.height], [o.cross[0], bb.x + 0.03 * bb.width, bb.y + 0.5 * bb.height], [o.cross[1], bb.x + 0.97 * bb.width, bb.y + 0.5 * bb.height], [o.cross[2], bb.x + 1.2 * bb.width, bb.y + 1.8 * bb.height]];
      return MW.drive(tl, at, o.loop, function (t) { var d = o.dash * (1 - e(cl((t - o.draw[0]) / (o.draw[1] - o.draw[0])))), f = 1 - cl((t - o.outAt) / 0.45), sa = cl((t - o.spotIn[0]) / (o.spotIn[1] - o.spotIn[0])) * (1 - cl((t - o.spotOut[0]) / (o.spotOut[1] - o.spotOut[0])));
        el.style.strokeDashoffset = spot.style.strokeDashoffset = String(d); el.style.opacity = String(f); spot.style.opacity = String(sa * f); var p = MW.path(PK, t, e); circ.setAttribute("cx", p[0]); circ.setAttribute("cy", p[1]);
        if (cu) { var br = svg.getBoundingClientRect(), sx = br.width / vb.width, sy = br.height / vb.height, pr = (cu.offsetParent || cu.parentNode).getBoundingClientRect(); gsap.set(cu, { x: br.left + (p[0] - vb.x) * sx - pr.left - 12, y: br.top + (p[1] - vb.y) * sy - pr.top - 6 }); cu.style.opacity = String(f); } });
    },
    options: { dash: "user units of the drawing dash (1300)", draw: "s [from, to] the outline draws ([0.2, 2.4])", width: "[outline, spot] stroke widths ([5, 10])", radius: "user units of the spot (300)", glow: "user units of the glow (40)", colors: "spot gradient [start, middle, end]", spotIn: "s ([1.6, 2.0])", spotOut: "s ([3.9, 4.3])", cross: "s the pointer reaches the left edge, the right edge, and leaves ([2.0, 3.8, 4.3])", outAt: "s (4.45)", ease: "(cubic-bezier(.65,0,.35,1))", cursor: "", loop: "s (5)" },
    defaults: { dash: 1300, draw: [0.2, 2.4], width: [5, 10], radius: 300, glow: 40, colors: ["#ffd23d", "#8b7bff", "#3dd6f5"], spotIn: [1.6, 2], spotOut: [3.9, 4.3], cross: [2, 3.8, 4.3], outAt: 4.45, ease: "cubic-bezier(.65,0,.35,1)", cursor: ".ui-cursor", loop: 5 },
    notes: "Apply to an SVG text drawn as an outline (fill none). A glowing gradient copy of the outline shows only inside a soft round mask that follows the pointer.",
    demo: { css: `${BG}\n${CUR} .os { position: absolute; inset: 0; }`, html: `<svg class="os" viewBox="0 0 1920 1080"><text class="os-t" x="960" y="700" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="470" fill="none" stroke="#5a6378">SÁNG</text></svg>${CURSOR}`,
      run: `MW.textOutlineSpotlight(q(".os-t"), tl, 0, {});`, duration: 5 },
  }),

  T("compare/text-reveal-card", {
    uses: ["drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var fr = el.querySelector(o.front), bk = el.querySelector(o.back), cu = o.cursor ? document.querySelector(o.cursor) : null, W = el.offsetWidth, e = MW.ez(o.ease), po2 = gsap.parseEase("power2.out"), dv = document.createElement("div"), hd = document.createElement("i"), sl = document.createElement("div");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      sl.style.cssText = "position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(180deg, " + o.accent + " 0 2px, transparent 2px " + o.scan + "px);opacity:0.06;"; el.insertBefore(sl, bk.nextSibling);
      dv.style.cssText = "position:absolute;top:0;bottom:0;left:0;width:" + o.line + "px;margin-left:-" + o.line / 2 + "px;background:" + o.accent + ";pointer-events:none;"; hd.style.cssText = "position:absolute;left:50%;top:50%;width:" + o.handle[0] + "px;height:" + o.handle[1] + "px;margin:-" + o.handle[1] / 2 + "px 0 0 -" + o.handle[0] / 2 + "px;border-radius:" + o.handle[0] / 2 + "px;background:" + o.accent + ";"; dv.appendChild(hd); el.appendChild(dv);
      var R = el.getBoundingClientRect(), cy = R.top + R.height * 0.62, PK = [[0, R.left - 0.15 * R.width, R.bottom + 0.6 * R.height], [0.85, R.left + 0.03 * R.width, cy], [2.1, R.right - 0.03 * R.width, cy], [2.6, R.right - 0.03 * R.width, cy], [3.0, R.left + 0.7 * R.width, cy], [3.35, R.right + 0.3 * R.width, R.bottom + 0.6 * R.height]];
      var P = function (t) { return MW.path(PK, t, e); }, tgt = function (t) { var p = P(t); return p[0] > R.left && p[0] < R.right && p[1] > R.top && p[1] < R.bottom ? p[0] - R.left : 0; };
      return MW.drive(tl, at, o.loop, function (t) { var s0 = Math.max(0, t - 0.6), x = tgt(s0), prev = x; for (var s = s0 + 1 / 60; s <= t + 1e-9; s += 1 / 60) { var q = tgt(s); x += (q - prev) * po2(Math.max(0, Math.min(1, (t - s) / o.follow))); prev = q; }
        bk.style.clipPath = sl.style.clipPath = "inset(0 " + (W - x).toFixed(1) + "px 0 0)"; fr.style.clipPath = "inset(0 0 0 " + x.toFixed(1) + "px)"; dv.style.transform = "translateX(" + x.toFixed(1) + "px)"; dv.style.opacity = x > 1 ? "1" : "0";
        if (cu) { var p = P(t), pr = (cu.offsetParent || cu.parentNode).getBoundingClientRect(); gsap.set(cu, { x: p[0] - pr.left - 12, y: p[1] - pr.top - 6 }); } });
    },
    options: { front: "the front layer", back: "the back layer (same size, on top of the front)", follow: "s the divider takes to follow (0.4, power2.out)", line: "px (7)", handle: "[w, h] px ([30, 100])", scan: "px between scanlines on the back (30)", accent: "", ease: "of the pointer (cubic-bezier(.65,0,.35,1))", cursor: "", loop: "s (4.4)" },
    defaults: { front: ".fr", back: ".bk", follow: 0.4, line: 7, handle: [30, 100], scan: 30, accent: "#8b7bff", ease: "cubic-bezier(.65,0,.35,1)", cursor: ".ui-cursor", loop: 4.4 },
    notes: "Left of the divider shows the back text with faint accent scanlines, right of it the front; outside the card the divider returns to the left edge.",
    demo: { css: `${BG}\n${ST} ${CUR} .rc { width: 1380px; height: 590px; border-radius: 50px; background: #151a24; border: 3px solid #262c3a; } .rc .fr, .rc .bk { position: absolute; inset: 0; display: grid; place-items: center; font-size: 170px; font-weight: 900; letter-spacing: -0.03em; } .rc .bk { color: #a99bff; }`,
      html: `<div class="st"><div class="rc"><div class="fr">Ý tưởng thô</div><div class="bk">Thành phim</div></div></div>${CURSOR}`, run: `MW.compareTextRevealCard(q(".rc"), tl, 0, {});`, duration: 4.4 },
  }),

  K("effect/lens-bulge", {
    fn: mk(`var off = document.createElement("canvas"); off.width = S.w; off.height = S.h; var g = off.getContext("2d"); g.setTransform(S.k, 0, 0, S.k, S.ox, S.oy); g.fillStyle = "#2a3142"; for (var x = 5; x < 320; x += 10) for (var y = 5; y < 200; y += 10) { g.beginPath(); g.arc(x, y, 0.9, 0, 2 * Math.PI); g.fill(); }
g.font = "900 " + o.size + "px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#e8ebf3"; g.fillText(o.text, 160, 100); var tw = g.measureText(o.text).width, x0 = 160 - tw / 2, x1 = 160 + tw / 2;
var e = MW.ez("cubic-bezier(.65,0,.35,1)"), eio = gsap.parseEase("power3.inOut"), p2 = gsap.parseEase("power2.inOut"), PK = [[0, x0 - 30, 250], [0.35, x0 - 30, 250], [1.0, x0 + 0.15 * tw, 102], [2.6, x1 - 0.15 * tw, 98], [3.3, x1 + 30, 250]];
var amt = function (t) { return o.amount * p2(pin((t - 0.35) / o.pop)) * (1 - p2(pin((t - 2.6) / o.pop))); }, img = function () { c.drawImage(off, -S.ox / S.k, -S.oy / S.k, S.w / S.k, S.h / S.k); };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); img(); var p = MW.path(PK, t, e), a = amt(t), R = o.radius;
  if (a > 0.002) { c.save(); c.filter = "blur(" + (6 * S.k).toFixed(1) + "px)"; c.globalAlpha = 0.5 * a / o.amount; c.fillStyle = "#000"; c.beginPath(); c.arc(p[0] + 5, p[1] + 7, R, 0, 2 * Math.PI); c.fill(); c.restore();
    for (var j = 0; j < o.rings; j++) { var r = R * (1 - j / o.rings), m = 1 + a * eio(1 - r / R); c.save(); c.beginPath(); c.arc(p[0], p[1], r, 0, 2 * Math.PI); c.clip(); c.fillStyle = "#10131d"; c.fill(); c.translate(p[0], p[1]); c.scale(m, m); c.translate(-p[0], -p[1]); img(); c.restore(); }
    var hg = c.createRadialGradient(p[0] - R / 3, p[1] - R / 3, 0, p[0] - R / 3, p[1] - R / 3, R); hg.addColorStop(0, "rgba(255,255,255," + (0.12 * a / o.amount).toFixed(3) + ")"); hg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = hg; c.beginPath(); c.arc(p[0], p[1], R, 0, 2 * Math.PI); c.fill();
    c.globalAlpha = 0.45 * a / o.amount; c.strokeStyle = A; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1; }
  MW.cursor(c, p[0], p[1], 1); });`),
    options: { text: "", size: "px on the 320-wide frame (56)", radius: "px (50)", amount: "extra magnification at the centre (0.9)", pop: "s the lens swells or settles (0.35, power2.inOut)", rings: "(40)", loop: "s (3.6)" },
    defaults: { text: "Kính lúp", size: 56, radius: 50, amount: 0.9, pop: 0.35, rings: 40, loop: 3.6 },
    notes: "2D: forty rings inside the lens, each drawing the scene magnified 1 + a × ease-in-out cubic(1 − r / radius), with a soft shadow, a highlight and a thin accent rim.",
  }),

  K("motion/sfx-cues", {
    fn: mk(`var eo = gsap.parseEase("expo.out"), CL = { click: "#75e4d2", pop: "#ffd23d", thump: "#ff6f91", whoosh: "#a99bff" };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var x0 = 30, w = 260, y = 130, X = function (s) { return x0 + w * s / o.loop; }; c.fillStyle = "#262c3a"; c.fillRect(x0, y - 1, w, 2);
  for (var b = 0; b <= Math.round(o.loop / o.beat); b++) { var bx = X(b * o.beat), major = b % 4 === 0; c.fillStyle = "#3a4466"; c.fillRect(bx - 0.5, y - (major ? 9 : 4), 1, major ? 18 : 8); if (major) MW.txt(c, String(Math.round(b * o.beat)) + " s", bx, y + 18, 6, "#5a6378", 700); }
  var big = 0, bc = A; o.cues.forEach(function (q, i) { var qx = X(q[0]), d = t - q[0], on = d >= 0, col = CL[q[1]] || A; c.fillStyle = on ? col : "#3a4466"; c.beginPath(); c.arc(qx, y, 3.5, 0, 2 * Math.PI); c.fill(); MW.txt(c, q[1], qx, y - 20 - (i % 2) * 11, 7, on ? col : "#5a6378", 800);
    if (on && d < 0.8) { var r = 8 + 20 * eo(Math.min(1, d / 0.12)), a = Math.exp(-8 * d); c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(qx, y, r, 0, 2 * Math.PI); c.stroke(); c.restore(); if (a > big) { big = a; bc = col; } } });
  c.save(); c.globalAlpha = 0.25 + 0.75 * big; c.fillStyle = bc; c.beginPath(); c.arc(160, 56, 14 + 10 * big, 0, 2 * Math.PI); c.fill(); c.restore(); c.fillStyle = "#e8ebf3"; c.fillRect(X(t) - 0.5, y - 30, 1, 44); });`),
    options: { cues: "[[s, sound], ...] (click, pop, thump, whoosh)", beat: "s between ruler ticks (0.25)", loop: "s (4)" },
    defaults: { cues: [[0.5, "click"], [1, "pop"], [2, "thump"], [2.75, "whoosh"], [3.5, "pop"]], beat: 0.25, loop: 4 },
    notes: "Each motion's peak frame is the sound's onset (within ±1 frame). In a Moworks film, write these as the app's sfx cues; this block only shows where they land.",
  }),

  K("data/audio-bars", {
    fn: mk(`var nz = MW.noise(o.seed); return MW.drive(tl, at, o.loop, function (t) { S.clear(); var ph = (t % o.beat) / o.beat, w = o.bars * o.pitch, x0 = 160 - w / 2, base = 162;
  for (var i = 0; i < o.bars; i++) { var f = i / (o.bars - 1), v = (1 - f) * 0.7 * Math.exp(-5 * ph) + (0.5 + 0.5 * nz(t * (3 + 10 * f) + i * 7.3)) * 0.4 * (0.3 + f), h = Math.max(3, o.max * Math.min(1, v)); MW.rr(c, x0 + i * o.pitch + (o.pitch - o.width) / 2, base - h, o.width, h, 2); c.fillStyle = i < o.low ? A : "#5a6378"; c.fill(); }
  c.fillStyle = "#262c3a"; c.fillRect(x0, base + 3, w, 1.5); });`),
    options: { bars: "(24)", width: "px (7)", pitch: "px (11)", max: "px (120)", beat: "s (0.5)", low: "bass bars in the accent (6)", seed: "(2)", loop: "s (4)" },
    defaults: { bars: 24, width: 7, pitch: 11, max: 120, beat: 0.5, low: 6, seed: 2, loop: 4 },
    notes: "v = (1 − f) 0.7 e^(−5 · beat phase) + noise(t (3 + 10 f)) 0.4 (0.3 + f): bass big and slow on the beat, treble small and fast.",
  }),

  T("motion/sidechain-duck", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sub = o.subject ? document.querySelector(o.subject) : null, duck = function (t) { if (t < o.start) return 0; var d = (t - o.start) % o.beat; return d < o.attack ? d / o.attack : Math.exp(-o.release * (d - o.attack)); };
      return MW.drive(tl, at, o.duration, function (t) { var k = duck(t); gsap.set(el, { scale: 1 - o.amount * k }); if (sub) gsap.set(sub, { scale: 1 + o.grow * k }); });
    },
    options: { beat: "s between kicks (0.5)", attack: "s (0.025, linear)", release: "decay rate (12: e^(−12 t))", amount: "the background dips (0.08)", grow: "the subject grows (0.5)", start: "s (0)", subject: "the foreground element (optional)", duration: "s (4)" },
    defaults: { beat: 0.5, attack: 0.025, release: 12, amount: 0.08, grow: 0.5, start: 0, subject: null, duration: 4 },
    notes: "Like a sidechain compressor: on each kick the ambient motion dips fast and recovers slowly.",
    assets: [{ path: "bg.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.sd-bg { position: absolute; inset: -4%; background: url(assets/bg.svg) center / cover; } .sd-d { position: absolute; left: 50%; top: 50%; width: 200px; height: 200px; margin: -100px 0 0 -100px; border-radius: 50%; background: #fff3c4; box-shadow: 0 0 80px rgba(255,243,196,0.6); }`,
      html: `<div class="sd-bg"></div><div class="sd-d"></div>`, run: `MW.motionSidechainDuck(q(".sd-bg"), tl, 0, { subject: ".sd-d" });`, duration: 4 },
  }),

  T("text/word-locked-pop", {
    uses: TU,
    fn: mt(`var w = split("words"), b = gsap.parseEase("back.out(1.7)"), WV = o.wave ? Array.prototype.slice.call(document.querySelectorAll(o.wave)) : []; w.forEach(function (x) { gsap.set(x, { transformOrigin: "50% 70%" }); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); w.forEach(function (x, i) { var s0 = o.times[Math.min(i, o.times.length - 1)] - o.lead, p = b(pin((t - s0) / o.duration)); gsap.set(x, { scale: Math.max(0, p) }); x.style.opacity = String((t >= s0 ? 1 : 0) * f); });
  WV.forEach(function (bar, j) { var tj = (j + 0.5) / WV.length * o.loop, said = o.times.some(function (s) { return tj >= s && tj < s + o.spoken; }); bar.style.background = t >= tj ? (said ? o.accent : "#5a6378") : "#262c3a"; }); });`),
    options: { times: "s each word is spoken (word timestamps)", lead: "s the pop comes before the word (0.3; 0.2–0.6)", duration: "s (0.25, back.out)", spoken: "s a word lasts on the waveform (0.55)", wave: "waveform bars that light as words are heard (optional)", accent: "", outAt: "s (3.6)", loop: "s (4)" },
    defaults: { times: [0.6, 1.4, 2.3, 3.2], lead: 0.3, duration: 0.25, spoken: 0.55, wave: null, accent: "#8b7bff", outAt: 3.6, loop: 4 },
    notes: "Take the times from the voice clip's word timestamps.",
    demo: demo({ css: headline("").css, html: `<div class="tk-stage"><div><h1 class="tk-head">Mỗi từ đúng nhịp</h1><div class="wv">${Array.from({ length: 64 }, (_, j) => `<i style="height:${Math.round(20 + 70 * Math.abs(Math.sin(j * 0.7) * Math.cos(j * 0.23)))}px"></i>`).join("")}</div></div></div>` },
      `MW.textWordLockedPop(q(".tk-head"), tl, 0, { wave: ".wv i" });`, 4, `.tk-head { font-size: 170px; } .tk-head .mw-w:nth-child(3) { color: #a99bff; } .wv { display: flex; align-items: center; justify-content: center; gap: 8px; height: 120px; margin-top: 70px; } .wv i { width: 12px; border-radius: 6px; background: #262c3a; }`),
  }),
];
