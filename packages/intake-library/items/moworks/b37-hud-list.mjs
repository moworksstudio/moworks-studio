// Game HUD and List & Grid (batch 3.7): coins, health, cooldown, score, stamina, ammo, compass, map, objective, resource, party and buff
// readouts drawn on a 320 x 200 frame, and list and grid entrances as effects on the children of a container; written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, ui } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration = 3, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "rand", "spring", "stage320"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, oc = function (u) { return 1 - Math.pow(1 - u, 3); }, ic = function (u) { return u * u * u; }, iq = function (u) { return u * u; };
var p2io = gsap.parseEase("power2.inOut"), bo = gsap.parseEase("back.out(1.7)"), A = "#8b7bff", hs = function (t, a, d) { var u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
var shake = function (t, a, d, amp, seed) { var u = (t - a) / d; if (u <= 0 || u >= 1) return 0; var r = MW.rand(seed + Math.floor(t * 60)); return (r() * 2 - 1) * amp * (1 - u); };
var fmt = function (n) { return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, "."); };
var bolt = function (x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + 3 * s, y - 9 * s); c.lineTo(x - 6 * s, y + 2 * s); c.lineTo(x, y + 2 * s); c.lineTo(x - 3 * s, y + 9 * s); c.lineTo(x + 6 * s, y - 2 * s); c.lineTo(x, y - 2 * s); c.closePath(); c.fill(); };
var bar = function (x, y, w, h, p, col) { MW.rr(c, x, y, w, h, 4); c.fillStyle = "#262c3a"; c.fill(); if (p > 0) { MW.rr(c, x, y, Math.max(2, w * p), h, 4); c.fillStyle = col; c.fill(); } };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
const ROWS = (cls, n = 4) => `<div class="${cls}">${Array.from({ length: n }, (_, i) => `<div class="rw"><i></i><b style="width:${[62, 48, 70, 54, 66][i % 5]}%"></b></div>`).join("")}</div>`;
const RCSS = (cls) => `${BG}\n${ST} .${cls} { width: 860px; display: flex; flex-direction: column; gap: 30px; } .${cls} .rw { position: relative; height: 120px; border-radius: 26px; background: #1b2130; display: flex; align-items: center; gap: 34px; padding: 0 34px; box-sizing: border-box; opacity: 0; }
.${cls} .rw i { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(150deg, #a693ff, #6a4cf0); flex: none; } .${cls} .rw b { height: 22px; border-radius: 11px; background: #3a4466; }`;
const TILES = (cls, n, cols, color) => `<div class="${cls}" style="grid-template-columns:repeat(${cols},1fr)">${Array.from({ length: n }, (_, i) => `<i style="background:${color ? color(i, cols) : "#2f3a5c"}">${i + 1}</i>`).join("")}</div>`;
const TCSS = (cls, size, gap) => `${BG}\n${ST} .${cls} { display: grid; gap: ${gap}px; } .${cls} i { width: ${size}px; height: ${size}px; border-radius: ${Math.round(size * 0.2)}px; display: grid; place-items: center; font-style: normal; font-size: ${Math.round(size * 0.32)}px; font-weight: 800; color: rgba(255,255,255,0.75); opacity: 0; }`;
const KIDS = `var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), n = it.length, cols = o.cols || n;`;
const mkc = (body) => new Function("el", "tl", "at", "o", KIDS + "\n" + body);

export default [
  T("motion/coin-collect", {
    uses: U,
    fn: mk(`var r = MW.rand(o.seed), C = []; for (var i = 0; i < o.count; i++) C.push([60 + r() * 120, 60 + r() * 90]); var W = [250, 150];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop - 0.05), got = 0, sq = 0, pop = 0; c.globalAlpha = f;
  C.forEach(function (p, i) { var arr = o.first + i * o.stagger, st = arr - o.flight, u = T(t, st, arr); if (t >= arr) { got++; sq = Math.max(sq, hs(t, arr, 0.28)); pop = Math.max(pop, hs(t, arr, 0.25)); var g = T(t, arr, arr + 0.4); if (g < 1) { c.globalAlpha = f * (g < 0.4 ? 1 : 1 - (g - 0.4) / 0.45); MW.txt(c, "+" + o.step, W[0], W[1] - 30 - 18 * oc(g), 9, "#ffd23d", 900); c.globalAlpha = f; } return; }
    var hop = -4 * hs(t, st - 0.16, 0.14), q = iq(u), hy = Math.min(p[1], W[1]) - 58, cx = (p[0] + W[0]) / 2 - 24, x = (1 - q) * (1 - q) * p[0] + 2 * (1 - q) * q * cx + q * q * W[0], y = (1 - q) * (1 - q) * p[1] + 2 * (1 - q) * q * hy + q * q * W[1] + hop, s = 1 - 0.35 * q, sx = u > 0 ? Math.max(0.1, Math.abs(Math.cos(9 * u))) : 1;
    c.save(); c.translate(x, y); c.scale(s * sx, s); c.fillStyle = "#ffc633"; c.beginPath(); c.arc(0, 0, 9, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#d99400"; c.lineWidth = 1.5; c.stroke(); c.restore(); });
  c.save(); c.translate(W[0], W[1] + 14); c.scale(1 + 0.12 * sq, 1 - 0.12 * sq); MW.rr(c, -26, -32, 52, 32, 8); c.fillStyle = "#8a5a2b"; c.fill(); c.fillStyle = "#5c3a1a"; MW.rr(c, 6, -24, 22, 14, 5); c.fill(); c.restore();
  c.save(); c.translate(250, 40); c.scale(1 + 0.22 * pop, 1 + 0.22 * pop); MW.txt(c, o.from + got * o.step + " " + o.unit, 0, 0, 12, pop > 0 ? A : "#e8ebf3", 900); c.restore(); c.globalAlpha = 1;
});`),
    options: { count: "(5)", first: "s the first coin lands (0.9)", stagger: "s (0.26)", flight: "s (0.5, ease-in quad on a quadratic arc)", step: "per coin (5)", from: "(100)", unit: "", seed: "(4)", loop: "s (3.3)" },
    defaults: { count: 5, first: 0.9, stagger: 0.26, flight: 0.5, step: 5, from: 100, unit: "XU", seed: 4, loop: 3.3 },
    demo: CV("motionCoinCollect", 3.3),
  }),

  T("ui/hp-ghost-bar", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var h = o.hitAt, heal = p2io(T(t, o.healAt, o.healAt + 0.4)), now = (t < h ? o.from : o.to) + (o.from - o.to) * heal, gh = t < h ? o.from : o.from - (o.from - o.to) * p2io(T(t, h + o.lag, h + o.lag + o.trail)); gh += (o.from - gh) * heal;
  var dx = shake(t, h, 0.2, 3, 7), x0 = 50 + dx; MW.txt(c, o.label, 50, 84, 8, "#8f9ab3", 800, "left"); MW.txt(c, Math.round(now) + " / " + o.from, 270, 84, 9, t >= h && heal < 1 ? A : "#c9d2ea", 900, "right");
  MW.rr(c, x0, 96, 220, 14, 4); c.fillStyle = "#262c3a"; c.fill(); c.globalAlpha = t >= h && t < h + 0.1 ? 1 : 0.7; MW.rr(c, x0, 96, 220 * gh / 100, 14, 4); c.fillStyle = "#e8ebf3"; c.fill(); c.globalAlpha = 1; MW.rr(c, x0, 96, 220 * now / 100, 14, 4); c.fillStyle = "#ff4f6d"; c.fill();
  if (gh - now > 3) MW.txt(c, "−" + Math.round(gh - now), x0 + 220 * (now + gh) / 200, 124, 8, "#ffd23d", 900);
});`),
    options: { from: "(100)", to: "(58)", hitAt: "s (0.6)", lag: "s the ghost waits (0.4)", trail: "s it shrinks (0.5)", healAt: "s (2.3)", label: "", loop: "s (2.8)" }, defaults: { from: 100, to: 58, hitAt: 0.6, lag: 0.4, trail: 0.5, healAt: 2.3, label: "MÁU", loop: 2.8 },
    notes: "The fill drops at once; a light ghost behind it waits, then shrinks, so the loss stays readable.",
    demo: CV("uiHpGhostBar", 2.8),
  }),

  T("ui/cooldown-ring", {
    uses: U,
    fn: mk(`var sp = MW.spring(380, 14);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var cx = 160, cy = 96, st = o.start, rd = st + o.cooldown, p = T(t, st, rd), ready = t >= rd, pr = t > 0.3 && t < 0.5 ? 1 - 0.08 * hs(t, 0.3, 0.2) : 1, s = ready ? 0.8 + 0.2 * sp.at(t - rd) : pr;
  c.strokeStyle = "#262c3a"; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 41, 0, 2 * Math.PI); c.stroke(); if (p > 0) { c.strokeStyle = A; c.lineCap = "round"; c.beginPath(); c.arc(cx, cy, 41, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p); c.stroke(); }
  c.save(); c.translate(cx, cy); c.scale(s, s); c.fillStyle = ready ? A : "#3a4466"; c.beginPath(); c.arc(0, 0, 30, 0, 2 * Math.PI); c.fill(); bolt(0, 0, 1.4, ready ? "#fff" : "#8f9ab3");
  if (t >= st && !ready) { c.fillStyle = "rgba(11,13,18," + o.shade + ")"; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 30, -Math.PI / 2 + 2 * Math.PI * p, 1.5 * Math.PI); c.closePath(); c.fill(); MW.txt(c, (o.cooldown * (1 - p)).toFixed(1), 0, 0.5, 14, "#fff", 900); } c.restore();
  var fr = T(t, rd, rd + 0.5); if (fr > 0 && fr < 1) { c.strokeStyle = "rgba(139,123,255," + (1 - fr).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, 41 + 20 * oc(fr), 0, 2 * Math.PI); c.stroke(); }
  var cp = MW.path([[0, 290, 196], [0.22, cx + 8, cy + 10], [0.6, cx + 8, cy + 10], [1.1, 290, 180]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], t > 0.3 && t < 0.36 ? 0.85 : 1);
});`),
    options: { cooldown: "s (2.0)", start: "s (0.45)", shade: "darkness of what is left (0.62)", loop: "s (3.2)" }, defaults: { cooldown: 2, start: 0.45, shade: 0.62, loop: 3.2 },
    notes: "Ready: the icon fills and springs 0.8 → 1 (k380 c14) with a flash ring.",
    demo: CV("uiCooldownRing", 3.2),
  }),

  T("data/score-rollup", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var out = T(t, 2.4, 2.6), back = T(t, 2.6, 2.8), a = t < 2.6 ? 1 - iq(out) : 1 - Math.pow(1 - back, 2), v = t < 2.6 ? o.from + (o.to - o.from) * oc(T(t, 0.55, 1.6)) : o.from, arrived = t >= 1.6 && t < 2.6;
  c.globalAlpha = a; MW.txt(c, o.label, 160, 64, 8, "#8f9ab3", 800); var b = 1 + 0.07 * hs(t, 1.6, 0.25); c.save(); c.translate(160, 100); c.scale(b, b); c.font = "800 34px 'JetBrains Mono', monospace"; c.fillStyle = arrived ? A : "#e8ebf3"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(fmt(v), 0, 0); c.restore();
  var pl = bo(T(t, 0.2, 0.5)) * (t < 2.6 ? 1 : 0); if (pl > 0) { c.save(); c.translate(160, 138); c.scale(pl, pl); MW.rr(c, -40, -12, 80, 24, 12); c.strokeStyle = A; c.lineWidth = 1.5; c.stroke(); MW.txt(c, "+" + fmt(o.to - o.from), 0, 0.5, 10, A, 900); c.restore(); } c.globalAlpha = 1;
});`),
    options: { from: "(1200)", to: "(2400)", label: "", loop: "s (2.8)" }, defaults: { from: 1200, to: 2400, label: "ĐIỂM", loop: 2.8 },
    notes: "The increment pops first; the total rolls 1.05 s (ease-out cubic), lands with a small bump and holds 0.8 s to be read.",
    demo: CV("dataScoreRollup", 2.8),
  }),

  T("ui/stamina-low-pulse", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var v = 80 - 28 * oc(T(t, 0.3, 0.42)) - 30 * oc(T(t, 0.75, 0.87)) + 58 * oc(T(t, o.recoverAt, o.recoverAt + 0.5)), low = v < o.threshold, env = T(t, 0.9, 1.1) * (1 - T(t, o.recoverAt + 0.02, o.recoverAt + 0.2)), k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / o.period);
  MW.txt(c, o.label, 50, 84, 8, "#8f9ab3", 800, "left"); MW.txt(c, Math.round(v) + "%", 270, 84, 9, low ? A : "#c9d2ea", 900, "right");
  MW.rr(c, 50, 96, 220, 14, 4); c.fillStyle = "#262c3a"; c.fill(); c.globalAlpha = 1 - 0.5 * k * env; MW.rr(c, 50, 96, 220 * v / 100, 14, 4); c.fillStyle = low ? A : "#3ddc84"; c.fill(); c.globalAlpha = 1;
  if (env > 0) { c.strokeStyle = "rgba(139,123,255," + (0.8 * k * env).toFixed(3) + ")"; c.lineWidth = 1.5; MW.rr(c, 47, 93, 220 * v / 100 + 6, 20, 6); c.stroke(); }
  c.save(); c.setLineDash([2, 2]); c.strokeStyle = "#ffd23d"; c.beginPath(); c.moveTo(50 + 220 * o.threshold / 100, 90); c.lineTo(50 + 220 * o.threshold / 100, 116); c.stroke(); c.restore();
  [[0.3, 28, 52], [0.75, 30, 22]].forEach(function (d) { var u = T(t, d[0], d[0] + 0.7); if (u <= 0 || u >= 1) return; c.globalAlpha = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5; MW.txt(c, "−" + d[1], 50 + 220 * d[2] / 100, 130 - 14 * oc(u), 8, "#ff4f6d", 900); c.globalAlpha = 1; });
});`),
    options: { threshold: "% warning line (30)", period: "s of the pulse (0.8)", recoverAt: "s (2.1)", label: "", loop: "s (2.8)" }, defaults: { threshold: 30, period: 0.8, recoverAt: 2.1, label: "THỂ LỰC", loop: 2.8 },
    demo: CV("uiStaminaLowPulse", 2.8),
  }),

  T("ui/ammo-reload", {
    uses: U,
    fn: mk(`var X = function (i) { return 72 + i * 16; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var n = o.from; for (var i = 0; i < o.slots; i++) { c.strokeStyle = "#3a4466"; c.lineWidth = 1; MW.rr(c, X(i) - 5, 92, 10, 26, 3); c.stroke(); }
  for (var j = 0; j < o.slots; j++) { var y = 92, a = 1; if (j >= o.from) { var st = o.start + (j - o.from) * o.stagger, u = T(t, st, st + 0.16); if (t < st) continue; if (t >= st + 0.1) n = Math.max(n, j + 1); y = 92 - 34 * (1 - bo(u)); a = Math.min(1, (t - st) / 0.05); var ex = o.exitAt + (o.slots - 1 - j) * 0.035, e = oc(T(t, ex, ex + 0.14)); if (t >= ex) { y -= 16 * e; a *= 1 - e; if (e >= 1) continue; } }
    c.globalAlpha = a; MW.rr(c, X(j) - 4, y + 1, 8, 24, 3); c.fillStyle = "#ffd23d"; c.fill(); c.globalAlpha = 1; }
  if (t >= o.exitAt + 0.3) n = o.from; var kick = 0; for (var k = o.from; k < o.slots; k++) kick = Math.max(kick, hs(t, o.start + (k - o.from) * o.stagger + 0.1, 0.2));
  c.save(); c.translate(140, 60); c.scale(1 + 0.2 * kick, 1 + 0.2 * kick); c.font = "800 22px 'JetBrains Mono', monospace"; c.textAlign = "right"; c.textBaseline = "middle"; c.fillStyle = n <= 3 ? "#ffd23d" : "#e8ebf3"; c.fillText(String(n), 0, 0); c.restore(); MW.txt(c, "/ " + o.slots, 146, 61, 10, "#8f9ab3", 800, "left");
  if (t > 0.35 && t < 1.45) MW.txt(c, o.label, 160, 142, 9, A, 900);
});`),
    options: { slots: "(12)", from: "rounds before (3)", start: "s the first drops (0.55)", stagger: "s (0.085)", exitAt: "s (2.15)", label: "", loop: "s (2.8)" }, defaults: { slots: 12, from: 3, start: 0.55, stagger: 0.085, exitAt: 2.15, label: "NẠP ĐẠN", loop: 2.8 },
    demo: CV("uiAmmoReload", 2.8),
  }),

  T("ui/compass-lock", {
    uses: U,
    fn: mk(`var sp = MW.spring(520, 20), names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var hd = o.from + (o.to - 4 - o.from) * oc(T(t, 0.3, 1.4)) + (t > 1.4 ? 4 * sp.at(t - 1.4) : 0); hd += (o.from - hd) * p2io(T(t, o.backAt, o.backAt + 0.4)); var lk = t >= o.lockAt && t < o.backAt;
  MW.txt(c, o.label, 160, 52, 8, "#8f9ab3", 800); MW.rr(c, 50, 74, 220, 40, 8); c.fillStyle = "#151a24"; c.fill(); c.save(); MW.rr(c, 50, 74, 220, 40, 8); c.clip();
  for (var d = Math.floor((hd - 60) / 5) * 5; d <= hd + 60; d += 5) { var x = 160 + (d - hd) * 2, f = Math.max(0, 1 - Math.pow((x - 160) / 112, 2)); c.globalAlpha = f; c.fillStyle = "#6c778b"; c.fillRect(x - 0.5, 104 - (d % 15 === 0 ? 10 : 5), 1, d % 15 === 0 ? 10 : 5);
    if (((d % 45) + 45) % 45 === 0) { var nm = names[(((d / 45) % 8) + 8) % 8], isN = nm === "N"; MW.txt(c, nm, x, 86, isN && lk ? 10 : 8.5, isN && lk ? A : "#c9d2ea", 900); } } c.restore(); c.globalAlpha = 1;
  c.fillStyle = "#ffd23d"; c.beginPath(); c.moveTo(160, 74); c.lineTo(155, 68); c.lineTo(165, 68); c.closePath(); c.fill();
  var br = 42 - 22 * bo(T(t, o.lockAt, o.lockAt + 0.25)) * (lk ? 1 : 0); c.strokeStyle = lk ? A : "#3a4466"; c.lineWidth = 2; [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(160 + s * br + s * 4, 76); c.lineTo(160 + s * br, 76); c.lineTo(160 + s * br, 112); c.lineTo(160 + s * br + s * 4, 112); c.stroke(); });
  c.font = "800 12px 'JetBrains Mono', monospace"; c.fillStyle = "#e8ebf3"; c.textAlign = "center"; c.fillText(("00" + (Math.round(hd) % 360 || 360)).slice(-3) + "°", 160, 132);
  var lp = bo(T(t, o.lockAt, o.lockAt + 0.25)) * (lk ? 1 : 0); if (lp > 0) { c.save(); c.translate(160, 152); c.scale(lp, lp); MW.rr(c, -22, -8, 44, 16, 8); c.fillStyle = A; c.fill(); MW.txt(c, "KHOÁ", 0, 0.5, 7, "#0b0d12", 900); c.restore(); }
});`),
    options: { from: "degrees (250)", to: "degrees (360: north)", lockAt: "s (1.45)", backAt: "s (2.35)", label: "", loop: "s (3)" }, defaults: { from: 250, to: 360, lockAt: 1.45, backAt: 2.35, label: "HƯỚNG", loop: 3 },
    notes: "Turns 1.1 s (ease-out cubic), the last 4° on a stiff spring (k520 c20); 2 units per degree, the tape's edges fade.",
    demo: CV("uiCompassLock", 3),
  }),

  T("ui/minimap-ping", {
    uses: U,
    fn: mk(`var px = 186, py = 92;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); c.save(); MW.rr(c, 86, 26, 148, 148, 14); c.clip(); c.fillStyle = "#15202b"; c.fillRect(86, 26, 148, 148); c.fillStyle = "#1e3a4a"; c.beginPath(); c.ellipse(120, 140, 40, 22, 0.3, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = "#2a3a50"; c.lineWidth = 1; for (var g = 0; g < 148; g += 18.5) { c.beginPath(); c.moveTo(86 + g, 26); c.lineTo(86 + g, 174); c.moveTo(86, 26 + g); c.lineTo(234, 26 + g); c.stroke(); } c.strokeStyle = "#3a4a62"; c.lineWidth = 4; c.beginPath(); c.moveTo(86, 70); c.quadraticCurveTo(160, 100, 234, 60); c.moveTo(150, 26); c.lineTo(170, 174); c.stroke();
  c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(130, 120, 4, 0, 2 * Math.PI); c.fill(); var out = ic(T(t, o.outAt, o.outAt + 0.2));
  o.rings.forEach(function (s) { var u = T(t, s, s + 1); if (u <= 0 || u >= 1) return; c.strokeStyle = "rgba(139,123,255," + (1 - u).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 4 + 30 * oc(u), 0, 2 * Math.PI); c.stroke(); });
  var pin = bo(T(t, 0.42, 0.72)) * (1 - out); if (pin > 0) { c.save(); c.translate(px, py); c.scale(pin, pin); c.fillStyle = A; c.beginPath(); c.arc(0, -10, 7, Math.PI, 0); c.lineTo(0, 0); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -10, 2.5, 0, 2 * Math.PI); c.fill(); c.restore(); }
  c.globalAlpha = T(t, 0.5, 0.7) * (1 - out); MW.rr(c, px + 8, py - 30, 34, 14, 7); c.fillStyle = "#e8ebf3"; c.fill(); MW.txt(c, o.label, px + 25, py - 22.5, 7, "#0b0d12", 900); c.globalAlpha = 1; c.restore();
  var cp = MW.path([[0, 290, 196], [0.27, px + 2, py + 2], [0.6, px + 2, py + 2], [1.1, 290, 180]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], t > 0.35 && t < 0.42 ? 0.85 : 1);
});`),
    options: { rings: "s each ring starts ([0.45, 0.73, 1.4, 1.68])", label: "", outAt: "s (2.35)", loop: "s (2.8)" }, defaults: { rings: [0.45, 0.73, 1.4, 1.68], label: "64 m", outAt: 2.35, loop: 2.8 },
    notes: "The map never moves; rings 4 → 34 units in 1 s (ease-out cubic), in pairs.",
    demo: CV("uiMinimapPing", 2.8),
  }),

  T("ui/objective-marker", {
    uses: U,
    fn: mk(`var sp = MW.spring(150, 15);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); c.fillStyle = "#262c3a"; c.fillRect(60, 152, 200, 1.5); var gx = 160, gy = 150, my = -24 + (98 + 24) * (t > 0.3 ? sp.at(t - 0.3) : 0), bob = 2 * Math.sin(5 * t) * T(t, 1.3, 1.6), ex = ic(T(t, o.exitAt, o.exitAt + 0.35)); my += bob - 140 * ex;
  var near = Math.max(0, Math.min(1, (my + 24) / 122)); c.fillStyle = "rgba(0,0,0," + (0.25 + 0.35 * near).toFixed(3) + ")"; c.beginPath(); c.ellipse(gx, gy, 6 + 10 * near, 2 + 3 * near, 0, 0, 2 * Math.PI); c.fill();
  [0.58, 0.74].forEach(function (s) { var u = T(t, s, s + 0.7); if (u <= 0 || u >= 1) return; var R = 6 + 26 * oc(u); c.strokeStyle = "rgba(139,123,255," + (1 - u).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.ellipse(gx, gy, R, R * 0.32, 0, 0, 2 * Math.PI); c.stroke(); });
  var g = T(t, 0.6, 0.8) * (1 - ex); c.globalAlpha = g; c.strokeStyle = A; c.lineWidth = 1.2; c.beginPath(); c.ellipse(gx, gy, 15, 5, 0, 0, 2 * Math.PI); c.stroke(); c.setLineDash([3, 3]); c.beginPath(); c.moveTo(gx, my + 15); c.lineTo(gx, gy - 4); c.stroke(); c.setLineDash([]); MW.txt(c, o.label, gx + 26, my, 8, "#e8ebf3", 900, "left"); c.globalAlpha = 1;
  c.fillStyle = "#ffd23d"; c.beginPath(); c.moveTo(gx, my - 15); c.lineTo(gx + 11, my); c.lineTo(gx, my + 15); c.lineTo(gx - 11, my); c.closePath(); c.fill(); c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.moveTo(gx, my - 15); c.lineTo(gx + 4, my); c.lineTo(gx - 6, my); c.closePath(); c.fill();
});`),
    options: { label: "", exitAt: "s (2.35)", loop: "s (2.8)" }, defaults: { label: "120 m", exitAt: 2.35, loop: 2.8 },
    notes: "Drops on a spring (k150 c15), then bobs; the shadow grows as it nears the ground and two flat rings spread there.",
    demo: CV("uiObjectiveMarker", 2.8),
  }),

  T("ui/resource-cap-bar", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = p2io(T(t, o.resetAt, o.resetAt + 0.4)), v = (o.from + (100 - o.from) * T(t, 0.3, 1.3)) * (1 - rs) + o.from * rs, full = v >= 99.9;
  MW.txt(c, o.label, 50, 82, 8, "#8f9ab3", 800, "left"); MW.txt(c, Math.round(o.cap * v / 100) + " / " + o.cap, 270, 82, 9, full ? A : "#c9d2ea", 900, "right");
  MW.rr(c, 50, 96, 220, 16, 4); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 50, 96, 220 * v / 100, 16, 4); c.fillStyle = full ? A : "#3dd6f5"; c.fill(); c.fillStyle = "#e8ebf3"; c.fillRect(269, 92, 2, 24); MW.txt(c, "MAX", 270, 124, 6, "#6c778b", 800);
  for (var k = 0; k < 7; k++) { var s = 0.3 + 0.25 * k, u = t - s; if (u < 0 || u > 0.6 || t > o.resetAt) continue; var ok = s < 1.3, x = ok ? 50 + 220 * (o.from + (100 - o.from) * T(s + 0.2, 0.3, 1.3)) / 100 : 262, y, a;
    if (ok) { y = 70 + 14 * iq(Math.min(1, u / 0.2)); a = u < 0.18 ? 1 : 1 - Math.min(1, (u - 0.18) / 0.08); } else { y = 70 + 6 * iq(Math.min(1, u / 0.15)) - 7 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.15) / 0.3))); a = u < 0.3 ? 1 : 1 - Math.min(1, (u - 0.3) / 0.25); }
    if (a <= 0) continue; c.globalAlpha = a; MW.txt(c, o.chip, x, y, 8, ok ? "#ffd23d" : "#6c778b", 900); if (!ok) { c.fillStyle = "#6c778b"; c.fillRect(x - 10, y, 20, 1); } c.globalAlpha = 1; }
  if (full && t < o.resetAt) { var u2 = t - 1.3, sc = 0.9 + 0.1 * Math.min(1, u2 / 0.12), bl = t < 1.78 ? 0.5 + 0.5 * Math.cos(2 * Math.PI * u2 / 0.24) : 1; c.save(); c.globalAlpha = bl; c.translate(160, 144); c.scale(sc, sc); MW.rr(c, -22, -9, 44, 18, 9); c.fillStyle = A; c.fill(); MW.txt(c, o.full, 0, 0.5, 8, "#0b0d12", 900); c.restore(); c.globalAlpha = 1; }
});`),
    options: { from: "% (35)", cap: "(1000)", chip: "", full: "", label: "", resetAt: "s (2.3)", loop: "s (2.8)" }, defaults: { from: 35, cap: 1000, chip: "+50", full: "ĐẦY", label: "TÀI NGUYÊN", resetAt: 2.3, loop: 2.8 },
    notes: "Chips that arrive after the cap bounce off, turn grey, are struck through and fade.",
    demo: CV("uiResourceCapBar", 2.8),
  }),

  T("ui/party-row-alert", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var out = T(t, o.outAt, o.outAt + 0.2); MW.rr(c, 70, 25, 180, 150, 12); c.fillStyle = "#151a24"; c.fill();
  o.names.forEach(function (nm, i) { var y = 44 + i * 34, hit = i === o.row - 1, dx = hit ? shake(t, o.hitAt, 0.25, 3, 11) : 0, fl = hit && t >= o.hitAt ? (0.42 - 0.3 * T(t, o.hitAt, o.hitAt + 0.35)) * (1 - out) : 0;
    if (fl > 0) { c.fillStyle = "rgba(255,79,109," + fl.toFixed(3) + ")"; MW.rr(c, 76 + dx, y - 14, 168, 30, 8); c.fill(); }
    c.fillStyle = hit && fl > 0 ? "#c96a8a" : ["#a693ff", "#3dd6f5", "#ffb547", "#7af0b0"][i]; c.beginPath(); c.arc(92 + dx, y, 10, 0, 2 * Math.PI); c.fill(); MW.txt(c, nm, 108 + dx, y - 5, 8, "#e8ebf3", 800, "left");
    MW.rr(c, 108 + dx, y + 4, 90, 5, 2.5); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 108 + dx, y + 4, 90 * [0.9, 0.7, hit && t >= o.hitAt ? 0.35 : 0.8, 0.6][i], 5, 2.5); c.fillStyle = "#3ddc84"; c.fill();
    if (hit) { var b = bo(T(t, o.hitAt + 0.08, o.hitAt + 0.38)) * (1 - out); if (b > 0) { c.save(); c.translate(228 + dx, y); c.scale(b, b); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(0, 0, 9, 0, 2 * Math.PI); c.fill(); bolt(0, 0, 0.7, "#3a2400"); c.restore(); }
      var u = T(t, o.hitAt + 0.08, o.hitAt + 0.45); if (u > 0 && u < 1) for (var k = 0; k < 8; k++) { var a = k / 8 * 2 * Math.PI; c.globalAlpha = 1 - u; c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(228 + 18 * oc(u) * Math.cos(a), y + 18 * oc(u) * Math.sin(a), 1.5, 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1; } });
});`),
    options: { row: "the row that reacts (3)", hitAt: "s (0.6)", names: "", outAt: "s (2.45)", loop: "s (2.8)" }, defaults: { row: 3, hitAt: 0.6, names: ["Minh", "Lan", "Tuấn", "Hà"], outAt: 2.45, loop: 2.8 },
    notes: "Only that row reacts: a short shake, a flash that settles to a light tint, a bolt icon with a small burst. The others never move.",
    demo: CV("uiPartyRowAlert", 2.8),
  }),

  T("ui/buff-timer-ring", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var cx = 130, cy = 96, st = o.start, en = st + o.duration, p = T(t, st, en), ended = t >= en, rem = o.duration * (1 - p), pop = bo(T(t, 0.3, 0.6)), sh = 1 - ic(T(t, en, en + 0.18)), bl = t > en - 0.6 && !ended ? 0.55 + 0.45 * Math.cos(2 * Math.PI * (t - en + 0.6) / 0.2) : 1;
  c.strokeStyle = "#262c3a"; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 34, 0, 2 * Math.PI); c.stroke(); if (!ended && t >= st) { c.strokeStyle = rem / o.duration < 0.28 ? "#ff4f6d" : A; c.beginPath(); c.arc(cx, cy, 34, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - p)); c.stroke(); }
  if (ended) { c.setLineDash([3, 3]); c.strokeStyle = "#4a5470"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 26, 0, 2 * Math.PI); c.stroke(); c.setLineDash([]); }
  if (sh > 0 && pop > 0) { c.save(); c.globalAlpha = bl; c.translate(cx, cy); c.scale(pop * sh, pop * sh); c.fillStyle = "#ff8a5c"; c.beginPath(); c.arc(0, 0, 26, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(0, -12); c.lineTo(9, 2); c.lineTo(3, 2); c.lineTo(3, 12); c.lineTo(-3, 12); c.lineTo(-3, 2); c.lineTo(-9, 2); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; }
  if (t >= 0.42 && !ended) MW.txt(c, (t < st ? o.duration : rem).toFixed(1) + "s", cx, cy + 50, 9, rem / o.duration < 0.28 ? "#ff4f6d" : "#c9d2ea", 900); if (ended) { c.globalAlpha = T(t, en, en + 0.2); MW.txt(c, o.ended, cx, cy + 50, 8, "#8f9ab3", 800); c.globalAlpha = 1; }
  MW.txt(c, o.stat, 230, 96, 12, ended ? "#4a5470" : "#e8ebf3", 900); if (ended) { c.fillStyle = "#8f9ab3"; c.fillRect(201, 96, 58 * oc(T(t, en, en + 0.2)), 1.5); }
});`),
    options: { duration: "s (2.2)", start: "s (0.6)", stat: "", ended: "", loop: "s (3.4)" }, defaults: { duration: 2.2, start: 0.6, stat: "CÔNG +20%", ended: "hết hiệu lực", loop: 3.4 },
    notes: "The last 0.6 s the icon blinks; at zero it shrinks out, a dashed slot remains and the stat is struck through.",
    demo: CV("uiBuffTimerRing", 3.4),
  }),

  T("motion/list-stagger", {
    uses: ["drive"],
    fn: mkc(`var p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
return MW.drive(tl, at, o.exitAt == null ? (n - 1) * o.stagger + o.duration : o.exitAt + 0.2, function (t) { var x = o.exitAt != null ? pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.2))) : 0; it.forEach(function (r, i) { var u = p2(Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration))); gsap.set(r, { x: o.from * (1 - u) }); r.style.opacity = String(u * (1 - x)); }); });`),
    options: { items: "", from: "px (−96)", duration: "s per row (0.55, power2.out)", stagger: "s (0.07)", exitAt: "s after the start to fade all (null)", cols: "" }, defaults: { items: ".rw", from: -96, duration: 0.55, stagger: 0.07, exitAt: null, cols: 0 },
    demo: { css: RCSS("ls"), html: `<div class="st">${ROWS("ls")}</div>`, run: `MW.motionListStagger(q(".ls"), tl, 0.3, { exitAt: 1.7 });`, duration: 2.3 },
  }),

  T("motion/list-cascade", {
    uses: ["drive"],
    fn: mkc(`var p3 = gsap.parseEase("power3.out"), io = gsap.parseEase("power2.inOut"), p2 = gsap.parseEase("power2.out");
return MW.drive(tl, at, (n - 1) * o.stagger + 0.64, function (t) { it.forEach(function (r, i) { var u = t - i * o.stagger, y = u <= 0 ? o.from : u < 0.384 ? o.from + (o.dip - o.from) * p3(u / 0.384) : o.dip * (1 - io(Math.min(1, (u - 0.384) / 0.256))); gsap.set(r, { y: y }); r.style.opacity = String(p2(Math.max(0, Math.min(1, u / 0.4)))); }); });`),
    options: { items: "", from: "px (−80)", dip: "px it dips past (12)", stagger: "s (0.06)", cols: "" }, defaults: { items: ".rw", from: -80, dip: 12, stagger: 0.06, cols: 0 },
    notes: "0.384 s power3.out past the slot, then 0.256 s power2.inOut back: 0.64 s each.",
    demo: { css: RCSS("lc"), html: `<div class="st">${ROWS("lc")}</div>`, run: `MW.motionListCascade(q(".lc"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/list-alternate", {
    uses: ["drive"],
    fn: mkc(`var p2 = gsap.parseEase("power2.out");
return MW.drive(tl, at, (n - 1) * o.stagger + o.duration, function (t) { it.forEach(function (r, i) { var u = p2(Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration))), side = (i % 2 ? -1 : 1) * o.first; gsap.set(r, { x: side * o.dist * (1 - u) }); r.style.opacity = String(u); }); });`),
    options: { items: "", dist: "px (112)", first: "−1 the first row from the left, 1 from the right", duration: "s (0.615, power2.out)", stagger: "s (0.055)", cols: "" }, defaults: { items: ".rw", dist: 112, first: -1, duration: 0.615, stagger: 0.055, cols: 0 },
    demo: { css: RCSS("la") + `\n.la { position: relative; } .la::before { content: ""; position: absolute; left: 50%; top: -40px; bottom: -40px; border-left: 3px dashed #2a3350; }`, html: `<div class="st">${ROWS("la")}</div>`, run: `MW.motionListAlternate(q(".la"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/row-expand", {
    uses: ["drive", "eases"],
    fn: mkc(`var e = MW.ez(o.ease); it.forEach(function (r) { gsap.set(r, { transformOrigin: "50% 0%" }); r.style.overflow = "hidden"; });
return MW.drive(tl, at, (n - 1) * o.stagger + o.duration, function (t) { it.forEach(function (r, i) { var u = Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration)); gsap.set(r, { scaleY: o.from + (1 - o.from) * e(u) }); r.style.opacity = String(Math.min(1, u * 3)); Array.prototype.forEach.call(r.children, function (k) { k.style.opacity = String(Math.max(0, Math.min(1, (u - 0.5) / 0.5))); }); }); });`),
    options: { items: "", from: "start height scale (0.08)", duration: "s (0.525)", stagger: "s (0.065)", ease: "(cubic-bezier(.34,1.56,.64,1): back.out)", cols: "" }, defaults: { items: ".rw", from: 0.08, duration: 0.525, stagger: 0.065, ease: "cubic-bezier(.34,1.56,.64,1)", cols: 0 },
    demo: { css: RCSS("re"), html: `<div class="st">${ROWS("re")}</div>`, run: `MW.motionRowExpand(q(".re"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/grid-wave", {
    uses: ["drive"],
    fn: mkc(`var p2 = gsap.parseEase("power2.out");
return MW.drive(tl, at, (2 * cols - 2) * o.step + o.duration, function (t) { it.forEach(function (x, i) { var d = (Math.floor(i / cols) + i % cols) * o.step, u = Math.max(0, Math.min(1, (t - d) / o.duration)), e = p2(u); gsap.set(x, { y: o.y * (1 - e), scale: o.from + (1 - o.from) * e }); x.style.opacity = String(Math.min(1, u / 0.55)); }); });`),
    options: { items: "", cols: "(3)", y: "px (72)", from: "start scale (0.78)", step: "s per diagonal step (0.055)", duration: "s (0.68, power2.out)" }, defaults: { items: "i", cols: 3, y: 72, from: 0.78, step: 0.055, duration: 0.68 },
    demo: { css: TCSS("gw", 200, 36), html: `<div class="st">${TILES("gw", 9, 3)}</div>`, run: `MW.motionGridWave(q(".gw"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/grid-center-out", {
    uses: ["drive", "eases"],
    fn: mkc(`var e = MW.ez(o.ease), rows = Math.ceil(n / cols), cx = (cols - 1) / 2, cy = (rows - 1) / 2;
return MW.drive(tl, at, 2 * o.ring + o.duration, function (t) { it.forEach(function (x, i) { var dx = i % cols - cx, dy = Math.floor(i / cols) - cy, L = Math.hypot(dx, dy) || 1, d = (Math.abs(dx) + Math.abs(dy)) * o.ring, u = Math.max(0, Math.min(1, (t - d) / o.duration)), k = e(u);
  gsap.set(x, { x: -dx / L * o.pull * (1 - k), y: -dy / L * o.pull * (1 - k), scale: o.from + (1 - o.from) * k }); x.style.opacity = String(Math.min(1, u / 0.4)); }); });`),
    options: { items: "", cols: "(3)", pull: "px toward the centre at the start (88)", from: "start scale (0.3)", ring: "s per ring (0.07)", duration: "s (0.72)", ease: "(cubic-bezier(.34,1.56,.64,1))" }, defaults: { items: "i", cols: 3, pull: 88, from: 0.3, ring: 0.07, duration: 0.72, ease: "cubic-bezier(.34,1.56,.64,1)" },
    demo: { css: TCSS("gc", 200, 36), html: `<div class="st">${TILES("gc", 9, 3, (i) => (i === 4 ? "#8b7bff" : "#2f3a5c"))}</div>`, run: `MW.motionGridCenterOut(q(".gc"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/grid-row-sweep", {
    uses: ["drive"],
    fn: mkc(`var io = gsap.parseEase("power2.inOut"), rows = Math.ceil(n / cols);
return MW.drive(tl, at, (rows - 1) * o.row + (cols - 1) * o.col + o.duration, function (t) { it.forEach(function (x, i) { var d = Math.floor(i / cols) * o.row + (i % cols) * o.col, u = io(Math.max(0, Math.min(1, (t - d) / o.duration))); gsap.set(x, { x: o.from * (1 - u) }); x.style.opacity = String(u); }); });`),
    options: { items: "", cols: "(4)", from: "px (−136)", row: "s per row (0.09)", col: "s per column (0.02)", duration: "s (0.56, power2.inOut)" }, defaults: { items: "i", cols: 4, from: -136, row: 0.09, col: 0.02, duration: 0.56 },
    demo: { css: TCSS("gr", 170, 34), html: `<div class="st">${TILES("gr", 12, 4)}</div>`, run: `MW.motionGridRowSweep(q(".gr"), tl, 0.3, {});`, duration: 1.7 },
  }),

  T("motion/shuffle-to-grid", {
    uses: ["drive", "rand"],
    fn: mkc(`var bi = gsap.parseEase("back.inOut(1.7)"), io = gsap.parseEase("power2.inOut"), r = MW.rand(o.seed), S = it.map(function () { return [(r() * 2 - 1) * o.scatter, (r() * 2 - 1) * o.scatter, (r() * 2 - 1) * o.rot]; });
return MW.drive(tl, at, o.backAt == null ? (n - 1) * o.stagger + o.duration : o.backAt + 0.4, function (t) { var b = o.backAt != null ? io(Math.max(0, Math.min(1, (t - o.backAt) / 0.4))) : 0;
  it.forEach(function (x, i) { var u = bi(Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration))) * (1 - b), s = S[i]; gsap.set(x, { x: s[0] * (1 - u), y: s[1] * (1 - u), rotation: s[2] * (1 - u), scale: o.from + (1 - o.from) * u }); x.style.opacity = "1"; }); });`),
    options: { items: "", scatter: "± px (96)", rot: "± degrees (18)", from: "start scale (0.72)", stagger: "s in reading order (0.035)", duration: "s (0.72, back.inOut)", backAt: "s after the start to scatter again (null)", seed: "(23)", cols: "" },
    defaults: { items: "i", scatter: 96, rot: 18, from: 0.72, stagger: 0.035, duration: 0.72, backAt: null, seed: 23, cols: 0 },
    demo: { css: TCSS("sg", 190, 50) + `\n.sg { position: relative; } .sg i { position: relative; z-index: 1; } .sg::before { content: ""; position: absolute; inset: -6px; background: repeating-linear-gradient(90deg, transparent 0 0); }`, html: `<div class="st">${TILES("sg", 9, 3, (i) => ["#a693ff", "#3dd6f5", "#ffb547"][i % 3])}</div>`, run: `MW.motionShuffleToGrid(q(".sg"), tl, 0.3, { backAt: 1.9 });`, duration: 2.6 },
  }),

  T("motion/list-slide-stack", {
    uses: ["drive"],
    fn: mkc(`var p2 = gsap.parseEase("power2.out");
return MW.drive(tl, at, (n - 1) * o.stagger + o.duration, function (t) { it.forEach(function (r, i) { var u = Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration)); gsap.set(r, { y: o.y * (1 - p2(u)) }); r.style.opacity = String(Math.min(1, u * 2)); }); });`),
    options: { items: "", y: "px (192)", stagger: "s (0.082)", duration: "s (0.654, power2.out)", cols: "" }, defaults: { items: ".rw", y: 192, stagger: 0.082, duration: 0.654, cols: 0 },
    notes: "The rows rise into their slots inside one mask (the container clips them).",
    demo: { css: RCSS("ss") + `\n.ss { overflow: hidden; padding: 20px; background: repeating-linear-gradient(180deg, transparent 0 20px, transparent 20px 170px); } .ss { outline: 3px dashed #2a3350; outline-offset: 0; border-radius: 30px; }`, html: `<div class="st">${ROWS("ss")}</div>`, run: `MW.motionListSlideStack(q(".ss"), tl, 0.3, {});`, duration: 1.9 },
  }),

  T("motion/list-trim-collapse", {
    uses: ["drive", "draw", "spring"],
    fn: mkc(`var del = it[o.row - 1], pin = gsap.parseEase("power2.in"), p2 = gsap.parseEase("power2.out"), sp = MW.spring(260, 22), toast = o.toast ? document.querySelector(o.toast) : null, cur = o.cursor ? document.querySelector(o.cursor) : null, pitch = it.length > 1 ? it[1].offsetTop - it[0].offsetTop : 0;
var x = del.querySelector(o.close), base = cur ? (cur.offsetParent || el).getBoundingClientRect() : null, xr = x ? x.getBoundingClientRect() : null, tx = xr && base ? xr.left - base.left + xr.width / 2 : 0, ty = xr && base ? xr.top - base.top + xr.height / 2 : 0;
return MW.drive(tl, at, o.clickAt + 1.6, function (t) { var u = pin(Math.max(0, Math.min(1, (t - o.clickAt) / 0.25))), m = p2(Math.max(0, Math.min(1, (t - o.clickAt - 0.1) / 0.35)));
  gsap.set(del, { scaleY: 1 - u }); del.style.opacity = String(1 - u); it.forEach(function (r, i) { if (i >= o.row) gsap.set(r, { y: -pitch * m }); }); if (toast) { var k = t > o.clickAt + 0.5 ? sp.at(t - o.clickAt - 0.5) : 0; gsap.set(toast, { y: 240 * (1 - k) }); toast.style.opacity = String(Math.min(1, k * 3)); }
  if (cur) { var p = MW.path([[0, tx + 260, ty + 220], [o.clickAt - 0.12, tx, ty], [o.clickAt + 0.3, tx, ty], [o.clickAt + 0.9, tx + 200, ty + 160]], t, "power2.inOut"); gsap.set(cur, { x: p[0] - 12, y: p[1] - 6, scale: t > o.clickAt && t < o.clickAt + 0.1 ? 0.86 : 1, transformOrigin: "20% 10%" }); } });`),
    options: { items: "", row: "the row deleted (2)", clickAt: "s (0.5)", close: "the delete button inside a row", toast: "a toast that springs up (k260 c22)", cursor: "", cols: "" }, defaults: { items: ".rw", row: 2, clickAt: 0.5, close: "u", toast: ".tc-t", cursor: ".ui-cursor", cols: 0 },
    demo: { ...ui(`<div class="tc">${Array.from({ length: 4 }, (_, i) => `<div class="rw"><i></i><b style="width:${[60, 46, 66, 52][i]}%"></b><u>×</u></div>`).join("")}</div><div class="tc-t">Đã xoá · <b>Hoàn tác</b></div>${CURSOR}`,
      `.tc { width: 860px; display: flex; flex-direction: column; gap: 30px; } .tc .rw { position: relative; height: 120px; border-radius: 26px; background: #1b2130; display: flex; align-items: center; gap: 34px; padding: 0 34px; box-sizing: border-box; } .tc .rw i { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(150deg, #a693ff, #6a4cf0); flex: none; }
.tc .rw b { height: 22px; border-radius: 11px; background: #3a4466; } .tc u { position: absolute; right: 34px; text-decoration: none; font-size: 54px; color: #8f9ab3; } .tc-t { position: absolute; left: 50%; bottom: 80px; transform: translateX(-50%); padding: 28px 50px; border-radius: 24px; background: #e8ebf3; color: #0b0d12; font-size: 38px; font-weight: 700; opacity: 0; } .tc-t b { color: #6a4cf0; }`),
      run: `MW.motionListTrimCollapse(q(".tc"), tl, 0, {});`, duration: 2.4 },
  }),

  T("motion/grid-spiral", {
    uses: ["drive"],
    fn: mkc(`var bo = gsap.parseEase("back.out(1.7)");
return MW.drive(tl, at, (o.order.length - 1) * o.step + o.duration, function (t) { o.order.forEach(function (idx, k) { var x = it[idx]; if (!x) return; var u = Math.max(0, Math.min(1, (t - k * o.step) / o.duration)); gsap.set(x, { scale: bo(u) }); x.style.opacity = u > 0 ? "1" : "0"; }); });`),
    options: { items: "", order: "tile indices in turn (a clockwise spiral from the centre)", step: "s (0.128)", duration: "s (0.32, back.out)", cols: "" }, defaults: { items: "i", order: [4, 5, 8, 7, 6, 3, 0, 1, 2], step: 0.128, duration: 0.32, cols: 0 },
    demo: { css: TCSS("gs", 200, 36), html: `<div class="st">${TILES("gs", 9, 3, (i) => (i === 4 ? "#8b7bff" : "#2f3a5c"))}</div>`, run: `MW.motionGridSpiral(q(".gs"), tl, 0.3, {});`, duration: 2 },
  }),

  T("motion/grid-diagonal", {
    uses: ["drive"],
    fn: mkc(`var p3 = gsap.parseEase("power3.out");
return MW.drive(tl, at, (2 * cols - 2) * o.step + o.duration, function (t) { it.forEach(function (x, i) { var d = (Math.floor(i / cols) + i % cols) * o.step, u = Math.max(0, Math.min(1, (t - d) / o.duration)), e = p3(u); gsap.set(x, { x: o.offset[0] * (1 - e), y: o.offset[1] * (1 - e) }); x.style.opacity = String(Math.min(1, u * 2)); }); });`),
    options: { items: "", cols: "(4)", offset: "[x, y] px it comes from ([−72, 72]): from the lower left", step: "s per diagonal (0.078)", duration: "s (0.472, power3.out)" }, defaults: { items: "i", cols: 4, offset: [-72, 72], step: 0.078, duration: 0.472 },
    notes: "Tiles on one diagonal arrive together.",
    demo: { css: TCSS("gd", 150, 30), html: `<div class="st">${TILES("gd", 16, 4, (i, c) => ((Math.floor(i / c) + (i % c)) % 2 ? "#3dd6f5" : "#8b7bff"))}</div>`, run: `MW.motionGridDiagonal(q(".gd"), tl, 0.3, {});`, duration: 1.8 },
  }),
];
