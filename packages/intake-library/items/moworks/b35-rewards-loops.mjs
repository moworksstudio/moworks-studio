// Rewards & Loot and Loops & Decoration (batch 3.5): game reward moments drawn on a 320 x 200 frame and looping text decorations on the
// letters themselves; written here.
import { T } from "../../moworks/define.mjs";
import { headline, demo } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const R2 = ["drive", "draw", "plot", "rand", "spring", "stage320"];
// shared drawing for the reward scenes: a five-point star, a four-point sparkle, a burst of seeded dots
const SH = `var star5 = function (c, x, y, r, rot) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } c.closePath(); };
var spark4 = function (c, x, y, r, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2; c.lineTo(r * Math.cos(a), r * Math.sin(a)); c.quadraticCurveTo(0.16 * r * Math.cos(a + Math.PI / 4) * 1.4, 0.16 * r * Math.sin(a + Math.PI / 4) * 1.4, r * Math.cos(a + Math.PI / 2), r * Math.sin(a + Math.PI / 2)); } c.closePath(); c.restore(); };
var burst = function (c, x, y, n, u, r0, r1, seed, cols, size) { if (u <= 0 || u >= 1) return; var rr = MW.rand(seed), e = 1 - Math.pow(1 - u, 3); for (var i = 0; i < n; i++) { var a = i / n * 2 * Math.PI + rr() * 0.5, d = r0 + (r1 - r0) * rr(); c.globalAlpha = 1 - u; c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(x + d * e * Math.cos(a), y + d * e * Math.sin(a), size * (1 - 0.5 * u), 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1; };
var T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, oc = function (u) { return 1 - Math.pow(1 - u, 3); }, ic = function (u) { return u * u * u; };`;
const mk = (body) => new Function("el", "tl", "at", "o", SH + "\n" + body);
const GR = `var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;`;

export default [
  T("ui/level-up-burst", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, sp = MW.spring(300, 12), bo = gsap.parseEase("back.out(1.7)"), io = gsap.parseEase("power2.inOut");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop); c.globalAlpha = f; var pk = o.peakAt;
  var fill = io(T(t, 0.3, 0.95)) * (1 - oc(T(t, pk, pk + 0.3))); MW.rr(c, 110, 154, 100, 6, 3); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 110, 154, Math.max(0.1, 100 * fill), 6, 3); c.fillStyle = t < pk ? "#3d9bff" : o.accent; c.fill();
  var roll = bo(T(t, 1, 1.2)), s = t >= pk ? 1 + 0.3 * (1 - sp.at(t - pk)) : 1; c.save(); c.beginPath(); c.rect(130, 56, 60, 56); c.clip(); c.translate(160, 84); c.scale(s, s);
  MW.txt(c, String(o.from), 0, -56 * roll, 50, "#e8ebf3", 900); MW.txt(c, String(o.to), 0, 56 * (1 - roll), 50, t >= pk ? o.accent : "#e8ebf3", 900); c.restore(); MW.txt(c, "CẤP", 160, 48, 8, "#8f9ab3", 800);
  var h = T(t, pk, pk + 0.6); if (h > 0 && h < 1) { c.strokeStyle = o.accent; c.globalAlpha = f * (1 - h); c.lineWidth = 4 - 3 * h; c.beginPath(); c.arc(160, 84, 30 + 66 * oc(h), 0, 2 * Math.PI); c.stroke(); c.globalAlpha = f; }
  burst(c, 160, 84, o.particles, T(t, pk, pk + 0.8), 47, 86, o.seed, [o.accent, "#ffd23d", "#3dd6f5"], 2.6); c.globalAlpha = f;
  var lb = bo(T(t, pk + 0.05, pk + 0.35)); if (lb > 0) { c.save(); c.translate(160, 134); c.scale(lb, lb); MW.txt(c, o.label, 0, 0, 14, "#ffd23d", 900); c.restore(); } c.globalAlpha = 1;
});`),
    options: { from: "level before (7)", to: "level after (8)", peakAt: "s the number locks (1.2)", particles: "(24)", label: "", accent: "", seed: "(5)", loop: "s (2.8)" },
    defaults: { from: 7, to: 8, peakAt: 1.2, particles: 24, label: "LÊN CẤP!", accent: "#8b7bff", seed: 5, loop: 2.8 },
    notes: "The XP bar fills, the digit rolls up (back.out), then at the lock the number springs (k300 c12), a halo ring opens 30 → 96 and dots burst.",
    demo: CV("uiLevelUpBurst", 2.8),
  }),

  T("effect/chest-open-rays", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, sp = MW.spring(160, 12), bo = gsap.parseEase("back.out(1.7)"), cx = 160, by = 150;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop); c.globalAlpha = f; var sh = t > 0.2 && t < 0.5 ? 1.8 * Math.sin(70 * t) * Math.sin(Math.PI * T(t, 0.2, 0.5)) : 0, op = o.openAt;
  var ry = oc(T(t, op + 0.15, op + 0.5)), dim = 1 - 0.5 * T(t, 2, 2.4);
  if (ry > 0) { var g = c.createRadialGradient(cx, 112, 2, cx, 112, 46); g.addColorStop(0, "rgba(255,226,120," + (0.6 * dim).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,226,120,0)"); c.fillStyle = g; c.save(); c.translate(cx, 112); c.scale(1, 0.125); c.beginPath(); c.arc(0, 0, 46, 0, 2 * Math.PI); c.restore(); c.fill();
    for (var i = 0; i < o.rays; i++) { var a = (-132 + 84 * i / (o.rays - 1)) * Math.PI / 180, hw = 5 * Math.PI / 180; [1, 0.68, 0.4].forEach(function (k) { var L = o.length * ry * k; c.fillStyle = "rgba(255,214,90," + (0.22 * dim).toFixed(3) + ")"; c.beginPath(); c.moveTo(cx, 112); c.lineTo(cx + L * Math.cos(a - hw), 112 + L * Math.sin(a - hw)); c.lineTo(cx + L * Math.cos(a + hw), 112 + L * Math.sin(a + hw)); c.closePath(); c.fill(); }); } }
  var rise = t > 1 ? sp.at(t - 1) : 0, bob = t > 1.6 ? 2 * Math.sin(4 * (t - 1.6)) : 0, gy = 118 - o.rise * rise + bob; if (rise > 0) { c.save(); c.beginPath(); c.rect(0, 0, 320, 112); c.clip(); c.fillStyle = "#3dd6f5"; c.beginPath(); c.moveTo(cx, gy - 14); c.lineTo(cx + 12, gy - 3); c.lineTo(cx, gy + 14); c.lineTo(cx - 12, gy - 3); c.closePath(); c.fill(); c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.moveTo(cx, gy - 14); c.lineTo(cx + 4, gy - 3); c.lineTo(cx - 6, gy - 3); c.closePath(); c.fill(); c.restore(); }
  burst(c, cx, 118 - o.rise, 8, T(t, 1.25, 1.75), 16, 34, 9, ["#ffd23d", "#fff"], 2);
  c.save(); c.translate(sh, 0); MW.rr(c, cx - 48, 112, 96, 40, 6); c.fillStyle = "#8a5a2b"; c.fill(); c.fillStyle = "#ffd23d"; c.fillRect(cx - 6, 112, 12, 40); c.strokeStyle = "#5c3a1a"; c.lineWidth = 2; MW.rr(c, cx - 48, 112, 96, 40, 6); c.stroke();
  var la = 1.95 * bo(T(t, op, op + 0.35)), lh = 16 * Math.cos(la); c.fillStyle = lh >= 0 ? "#9c6a35" : "#5c3a1a"; MW.rr(c, cx - 50, Math.min(112 - lh, 112), 100, Math.max(1, Math.abs(lh)), 5); c.fill(); c.restore(); c.globalAlpha = 1;
});`),
    options: { openAt: "s the lid opens (0.5, 0.35 s back.out)", rays: "(5)", length: "units (96)", rise: "units the reward rises (58, spring k160 c12)", loop: "s (2.8)" },
    defaults: { openAt: 0.5, rays: 5, length: 96, rise: 58, loop: 2.8 },
    demo: CV("effectChestOpenRays", 2.8),
  }),

  T("ui/three-star-clear", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, sp = MW.spring(400, 14), X = [110, 160, 210], Y = [100, 88, 100], Rr = [22, 28, 22];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop), shake = 0; c.globalAlpha = f;
  for (var k = 0; k < 3; k++) { var L = o.first + k * o.stagger, d = t - L; if (d > 0 && d < 0.15) shake = 2 * Math.sin(d * 80) * (1 - d / 0.15); }
  c.save(); c.translate(shake, 0);
  for (var i = 0; i < 3; i++) { star5(c, X[i], Y[i], Rr[i], 0); c.fillStyle = "#262c3a"; c.fill(); }
  for (var j = 0; j < 3; j++) { var Ld = o.first + j * o.stagger, a = T(t, Ld - 0.18, Ld), s, r; if (t < Ld - 0.18) continue; if (t < Ld) { var e = ic(a); s = o.from + (1 - o.from) * e; r = o.tilt * (1 - e); } else { s = 0.8 + 0.2 * sp.at(t - Ld); r = 0; }
    c.globalAlpha = f * Math.min(1, (t - Ld + 0.18) / 0.08); star5(c, X[j], Y[j], Rr[j] * s, r * Math.PI / 180); c.fillStyle = "#ffd23d"; c.fill(); c.strokeStyle = "#ffb000"; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = f;
    burst(c, X[j], Y[j], 8, T(t, Ld, Ld + 0.35), Rr[j], Rr[j] + 16, 3 + j, ["#ffd23d", "#fff"], 1.8); c.globalAlpha = f; }
  c.restore(); var lb = T(t, 1.75, 1.95), ly = 8 * (1 - oc(T(t, 1.75, 2))); c.globalAlpha = f * lb; MW.txt(c, o.label, 160, 146 + ly, 15, "#e8ebf3", 900); c.fillStyle = o.accent; c.fillRect(120, 158 + ly, 80, 2.5); c.globalAlpha = 1;
});`),
    options: { first: "s the first star lands (0.35)", stagger: "s (0.42)", from: "start scale (2.2)", tilt: "start degrees (−40)", label: "", accent: "underline", loop: "s (2.8)" },
    defaults: { first: 0.35, stagger: 0.42, from: 2.2, tilt: -40, label: "HOÀN THÀNH", accent: "#8b7bff", loop: 2.8 },
    notes: "Each star comes down in 0.18 s (ease-in cubic), then springs 0.8 → 1 (k400 c14) with a small frame shake and a dot burst.",
    demo: CV("uiThreeStarClear", 2.8),
  }),

  T("effect/gacha-capsule-open", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, bo = gsap.parseEase("back.out(1.7)"), cx = 160, cy = 100, op = o.openAt;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop); c.globalAlpha = f;
  var ry = oc(T(t, op + 0.02, op + 0.35)); if (ry > 0) { c.save(); c.translate(cx, cy); c.rotate(0.4 * (t - op)); for (var i = 0; i < o.rays; i++) { var a = i / o.rays * 2 * Math.PI, L = 40 + 50 * ry; c.fillStyle = "rgba(255,214,90,0.28)"; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * Math.cos(a - 0.09), L * Math.sin(a - 0.09)); c.lineTo(L * Math.cos(a + 0.09), L * Math.sin(a + 0.09)); c.closePath(); c.fill(); } c.restore(); }
  var fl = T(t, op, op + 0.38); if (fl > 0 && fl < 1) { c.fillStyle = "rgba(255,250,220," + (0.9 * (1 - fl)).toFixed(3) + ")"; c.beginPath(); c.arc(cx, cy, 8 + 46 * oc(fl), 0, 2 * Math.PI); c.fill(); }
  var wob = t > 0.2 && t < op ? 0.14 * Math.sin(46 * t) * T(t, 0.2, 0.62) : 0, o1 = bo(T(t, op, op + 0.25)), dr = Math.pow(T(t, 0.95, 1.45), 2), hf = 1 - T(t, 1.15, 1.45);
  if (hf > 0) [[-1, "#ff4f6d", -0.22], [1, "#f1f1f6", 0.14]].forEach(function (h) { c.save(); c.globalAlpha = f * hf; c.translate(cx, cy + h[0] * (30 * o1 + 20 * dr)); c.rotate(wob + h[2] * o1); c.beginPath(); if (h[0] < 0) c.arc(0, 0, 30, Math.PI, 2 * Math.PI); else c.arc(0, 0, 30, 0, Math.PI); c.closePath(); c.fillStyle = h[1]; c.fill(); c.fillStyle = "#2a3142"; c.fillRect(-30, h[0] < 0 ? -3 : 0, 60, 3); c.restore(); });
  c.globalAlpha = f; var ss = bo(T(t, 1.05, 1.35)); if (ss > 0) { c.save(); c.translate(cx, cy - 2); c.scale(0.4 + 0.6 * ss, 0.4 + 0.6 * ss); MW.txt(c, o.rarity, 0, 0, 34, "#ffd23d", 900); c.restore(); }
  for (var k = 0; k < 5; k++) { var u = bo(T(t, 1.3 + k * 0.07, 1.55 + k * 0.07)); if (u > 0) { star5(c, cx - 40 + k * 20, cy + 32, 7 * u, 0); c.fillStyle = "#ffd23d"; c.fill(); } } c.globalAlpha = 1;
});`),
    options: { openAt: "s (0.7)", rays: "(12, turning 0.4 rad/s)", rarity: "", loop: "s (2.8)" }, defaults: { openAt: 0.7, rays: 12, rarity: "SSR", loop: 2.8 },
    notes: "The capsule wobbles harder (±0.14 rad), pops open into two halves (back.out), a flash disc and turning rays open, then the rarity and five stars pop in turn.",
    demo: CV("effectGachaCapsuleOpen", 2.8),
  }),

  T("text/new-record-stamp", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, ex = gsap.parseEase("expo.out"), sa = o.stampAt, fmt = function (n) { return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, "."); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.35, o.loop); c.globalAlpha = f;
  MW.rr(c, 70, 40, 180, 120, 14); c.fillStyle = "#151a24"; c.fill(); MW.txt(c, "ĐIỂM", 160, 60, 8, "#8f9ab3", 800);
  var v = o.score * ex(T(t, 0.3, 1.1)), sh = t > sa && t < sa + 0.12 ? 2.5 * Math.sin(t * 160) : 0; MW.txt(c, fmt(v), 160 + sh, 88, 26, "#e8ebf3", 900);
  var best = t >= sa + 0.05; MW.txt(c, "CAO NHẤT  " + fmt(best ? o.score : o.best), 160, 140, 8, best ? o.accent : "#6c778b", 800);
  var a = T(t, sa - 0.14, sa); if (t >= sa - 0.14) { var s = t < sa ? o.from + (1 - o.from) * ic(a) : 1, q = T(t, sa, sa + 0.16), sq = q > 0 && q < 1 ? Math.sin(Math.PI * q) * 0.12 : 0;
    c.save(); c.globalAlpha = f * Math.min(1, (t - sa + 0.14) / 0.06); c.translate(214, 108); c.rotate(o.tilt * Math.PI / 180); c.scale(s * (1 + sq), s * (1 - sq)); MW.rr(c, -38, -12, 76, 24, 5); c.strokeStyle = o.accent; c.lineWidth = 2.5; c.stroke(); MW.txt(c, o.stamp, 0, 0.5, 9, o.accent, 900); c.restore(); }
  var u = oc(T(t, sa, sa + 0.4)); if (u > 0 && u < 1) { var rr = MW.rand(o.seed); for (var i = 0; i < 8; i++) { var an = rr() * 2 * Math.PI, ax = 17 + 8 * u, ay = 9 + 5 * u; c.globalAlpha = f * (1 - u); c.fillStyle = o.accent; c.beginPath(); c.arc(214 + ax * 1.6 * Math.cos(an), 108 + ay * 1.6 * Math.sin(an), 1.6, 0, 2 * Math.PI); c.fill(); } }
  c.globalAlpha = 1;
});`),
    options: { score: "(9150)", best: "the old best (8420)", stampAt: "s (1.4)", from: "stamp start scale (2.4)", tilt: "degrees (−12)", stamp: "", accent: "", seed: "ink dots", loop: "s (2.6)" },
    defaults: { score: 9150, best: 8420, stampAt: 1.4, from: 2.4, tilt: -12, stamp: "KỶ LỤC MỚI", accent: "#ff5d8f", seed: 7, loop: 2.6 },
    demo: CV("textNewRecordStamp", 2.6),
  }),

  T("line/rarity-border-beam", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, bo = gsap.parseEase("back.out(1.7)"), L = 128, Tp = 52, W = 64, d = o.decideAt;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.35, o.loop); c.globalAlpha = f;
  MW.rr(c, L, Tp, W, W, 12); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 2; c.stroke();
  var da = 1 - T(t, d, d + 0.1); if (da > 0) { c.save(); c.globalAlpha = f * da; c.setLineDash([28, 207]); c.lineDashOffset = -t * 320; c.strokeStyle = "#ffffff"; c.lineWidth = 2; MW.rr(c, L, Tp, W, W, 12); c.stroke(); c.restore(); c.globalAlpha = f; }
  var g = oc(T(t, d, d + 0.25)); if (g > 0) { [[9, 0.09], [6, 0.2], [3, 0.4]].forEach(function (q) { c.strokeStyle = o.color; c.globalAlpha = f * g * q[1]; c.lineWidth = 3; MW.rr(c, L - q[0], Tp - q[0], W + 2 * q[0], W + 2 * q[0], 12 + q[0]); c.stroke(); }); c.globalAlpha = f * g; c.strokeStyle = o.color; c.lineWidth = 3; MW.rr(c, L, Tp, W, W, 12); c.stroke(); c.globalAlpha = f; }
  var b = T(t, d, d + 0.45); if (b > 0 && b < 1) { c.globalAlpha = f * (1 - b); c.strokeStyle = o.color; c.lineWidth = 1.5; var e = 16 * oc(b); MW.rr(c, L - e, Tp - e, W + 2 * e, W + 2 * e, 14 + 8 * b); c.stroke(); c.globalAlpha = f; }
  var q = 1 - T(t, d, d + 0.15); if (q > 0) { c.globalAlpha = f * q; MW.txt(c, "?", 160, Tp + 33, 26, "#6c778b", 900); c.globalAlpha = f; }
  var ic2 = bo(T(t, d + 0.05, d + 0.35)); if (ic2 > 0) { c.save(); c.translate(160, Tp + 32); c.scale(ic2, ic2); c.fillStyle = o.color; c.beginPath(); c.moveTo(0, -18); c.lineTo(15, -4); c.lineTo(0, 18); c.lineTo(-15, -4); c.closePath(); c.fill(); c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.moveTo(0, -18); c.lineTo(6, -4); c.lineTo(-8, -4); c.closePath(); c.fill(); c.restore(); }
  var p = oc(T(t, d + 0.2, d + 0.45)); if (p > 0) { c.globalAlpha = f * p; var y = Tp + W + 18 + 8 * (1 - p); MW.rr(c, 136, y - 8, 48, 16, 8); c.fillStyle = o.color; c.fill(); MW.txt(c, o.label, 160, y + 0.5, 8, "#0b0d12", 900); } c.globalAlpha = 1;
});`),
    options: { decideAt: "s the rarity is decided (1.1)", color: "rarity colour", label: "", loop: "s (2.6)" }, defaults: { decideAt: 1.1, color: "#b26bff", label: "HIẾM", loop: 2.6 },
    notes: "Before the decision a 28-unit light dash orbits the border at 320 units a second; then the rarity colour, three glow rings and an outline burst.",
    demo: CV("lineRarityBorderBeam", 2.6),
  }),

  T("ui/achievement-toast", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, sp = MW.spring(240, 22), bo = gsap.parseEase("back.out(1.7)");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var y = t > o.inAt ? -56 + 74 * sp.at(t - o.inAt) : -56; y -= 80 * ic(T(t, o.exitAt, o.exitAt + 0.25)); var L = 56;
  MW.rr(c, L, y, 208, 48, 10); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.stroke();
  var tp = bo(T(t, 0.45, 0.75)); if (tp > 0) { c.save(); c.translate(L + 24, y + 24); c.scale(tp, tp); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(0, 0, 15, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#8a5a00"; c.beginPath(); c.moveTo(-7, -8); c.lineTo(7, -8); c.lineTo(5, 1); c.quadraticCurveTo(0, 5, -5, 1); c.closePath(); c.fill(); c.fillRect(-1.5, 3, 3, 4); c.fillRect(-5, 7, 10, 2.5); c.restore(); }
  var k1 = T(t, 0.5, 0.7), x1 = 8 * (1 - oc(T(t, 0.5, 0.75))), k2 = T(t, 0.58, 0.78), x2 = 8 * (1 - oc(T(t, 0.58, 0.83)));
  c.globalAlpha = k1; MW.txt(c, o.kicker, L + 48 + x1, y + 17, 7, "#8f9ab3", 800, "left"); c.globalAlpha = k2; MW.txt(c, o.title, L + 48 + x2, y + 31, 10, "#e8ebf3", 900, "left"); c.globalAlpha = 1;
  var rb = 1 - T(t, 0.9, 2.2); c.fillStyle = o.accent; c.fillRect(L + 10, y + 43, 188 * rb, 2);
});`),
    options: { inAt: "s (0.3, spring k240 c22)", exitAt: "s (2.25)", kicker: "", title: "", accent: "the read bar", loop: "s (2.6)" },
    defaults: { inAt: 0.3, exitAt: 2.25, kicker: "MỞ KHOÁ THÀNH TỰU", title: "Chiến thắng đầu tiên", accent: "#8b7bff", loop: 2.6 },
    notes: "A thin bar shrinks while it holds, so there is time to read it.",
    demo: CV("uiAchievementToast", 2.6),
  }),

  T("ui/daily-bonus-claim", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, up = MW.spring(220, 16), dn = MW.spring(220, 22), bo = gsap.parseEase("back.out(1.7)"), x0 = 23;
var check = function (x, y, r, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = "#3ddc84"; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#0b2a18"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-r * 0.45, 0); c.lineTo(-r * 0.1, r * 0.35); c.lineTo(r * 0.5, -r * 0.35); c.stroke(); c.restore(); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.36, o.loop); c.globalAlpha = f;
  for (var i = 0; i < 7; i++) { var x = x0 + i * 40, y = 70, last = i === 6, lift = 0, s = 1, claimed = !last || t >= o.claimAt;
    if (last) { lift = t > 0.35 ? 14 * up.at(t - 0.35) : 0; if (t > o.dropAt) lift = 14 * (1 - dn.at(t - o.dropAt)); if (t > 1.05 && t < 1.15) s = 0.94; else if (t >= 1.15 && t < 1.25) s = 0.94 + 0.06 * T(t, 1.15, 1.25); }
    c.save(); c.translate(x + 17, y + 29 - lift); c.scale(s, s); if (last && lift > 0.5) { c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(0, 33 + lift, 15, 3, 0, 0, 2 * Math.PI); c.fill(); }
    var fill = last ? T(t, o.claimAt, o.claimAt + 0.15) : 0; MW.rr(c, -17, -29, 34, 58, 8); c.fillStyle = fill > 0.5 ? o.accent : "#1b2130"; c.fill(); c.strokeStyle = last ? "#ffd23d" : "#2a3350"; c.lineWidth = 1.2; c.stroke();
    MW.txt(c, "Ngày " + (i + 1), 0, -18, 6, fill > 0.5 ? "#0b0d12" : "#8f9ab3", 800); c.fillStyle = fill > 0.5 ? "#0b0d12" : (last ? "#ffd23d" : "#3dd6f5"); c.beginPath(); c.moveTo(0, -8); c.lineTo(8, 2); c.lineTo(0, 12); c.lineTo(-8, 2); c.closePath(); c.fill();
    if (claimed) check(12, -24, 6, last ? bo(T(t, o.claimAt, o.claimAt + 0.3)) : 1); c.restore();
    if (last) { burst(c, x + 17, y + 29 - lift, 10, T(t, o.claimAt, o.claimAt + 0.45), 6, 30, 4, ["#ffd23d", o.accent, "#fff"], 1.6); c.globalAlpha = f; if (t > o.claimAt) { c.globalAlpha = f * T(t, o.claimAt, o.claimAt + 0.2); MW.txt(c, "đã nhận", x + 17, y + 72, 7, "#ffd23d", 800); c.globalAlpha = f; } } }
  var cp = MW.path([[0, 300, 200], [0.6, 300, 200], [1, x0 + 6 * 40 + 22, 110], [1.3, x0 + 6 * 40 + 22, 110], [1.9, 300, 190]], t, "power3.out"); MW.cursor(c, cp[0], cp[1], t > 1.05 && t < 1.15 ? 0.85 : 1); c.globalAlpha = 1;
});`),
    options: { claimAt: "s (1.15)", dropAt: "s (1.85)", accent: "", loop: "s (2.8)" }, defaults: { claimAt: 1.15, dropAt: 1.85, accent: "#8b7bff", loop: 2.8 },
    notes: "Days one to six never move; only day seven lifts (spring k220 c16), is pressed, fills and drops back (k220 c22).",
    demo: CV("uiDailyBonusClaim", 2.8),
  }),

  T("motion/currency-rain-catch", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), G = []; for (var i = 0; i < o.count; i++) G.push({ x: 40 + r() * 240, t: 0.2 + i * o.stagger + r() * 0.05, dx: (r() * 2 - 1) * 5 });
var bx = 160, by = 150;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.36, o.loop), caught = 0, sq = 0; c.globalAlpha = f;
  G.forEach(function (g) { var u = T(t, g.t, g.t + o.fall); if (u >= 1) { caught++; var q = T(t, g.t + o.fall, g.t + o.fall + 0.22); if (q < 1) sq = Math.max(sq, Math.sin(Math.PI * q) * 0.1); return; } if (u <= 0) return;
    var y = -12 + (by - 22 + 12) * u * u, x = g.x + (bx + g.dx - g.x) * (1 - (1 - u) * (1 - u)); c.globalAlpha = f * Math.min(1, u / 0.1); c.fillStyle = "#3dd6f5"; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 5, y - 1); c.lineTo(x, y + 6); c.lineTo(x - 5, y - 1); c.closePath(); c.fill(); c.globalAlpha = f; });
  c.save(); c.translate(bx, by + 18); c.scale(1 + sq, 1 - sq); c.fillStyle = "#8a5a2b"; c.beginPath(); c.moveTo(-26, -36); c.quadraticCurveTo(-40, 0, -26, 0); c.lineTo(26, 0); c.quadraticCurveTo(40, 0, 26, -36); c.closePath(); c.fill(); c.fillStyle = "#5c3a1a"; c.fillRect(-22, -40, 44, 6); c.restore();
  var last = 0; G.forEach(function (g) { last = Math.max(last, g.t + o.fall); }); var pop = 0; G.forEach(function (g) { var q = T(t, g.t + o.fall, g.t + o.fall + 0.22); if (q > 0 && q < 1) pop = Math.max(pop, Math.sin(Math.PI * q) * 0.15); });
  c.save(); c.translate(250, 34); c.scale(1 + pop, 1 + pop); MW.txt(c, "+" + caught * o.step + " " + o.unit, 0, 0, 14, caught >= o.count ? o.accent : "#e8ebf3", 900); c.restore(); c.globalAlpha = 1;
});`),
    options: { count: "(10)", fall: "s each (0.55)", stagger: "s (0.13, plus up to 0.05 seeded)", step: "per gem (50)", unit: "", accent: "the counter when all are in", seed: "(4)", loop: "s (2.8)" },
    defaults: { count: 10, fall: 0.55, stagger: 0.13, step: 50, unit: "xu", accent: "#ffd23d", seed: 4, loop: 2.8 },
    demo: CV("motionCurrencyRainCatch", 2.8),
  }),

  T("motion/card-flip-reveal", {
    uses: R2,
    fn: mk(`var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.4, o.loop); c.globalAlpha = f;
  var lf = oc(T(t, o.liftAt, o.liftAt + 0.3)) * (1 - 0.6 * io(T(t, 1.2, 1.5))), th = Math.PI * io(T(t, 0.65, 0.65 + o.flip)), cs = Math.cos(th), sx = Math.max(0.02, Math.abs(cs)), s = 1 + 0.06 * lf + 0.04 * Math.sin(th);
  c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.ellipse(160, 154, (36 * sx + 8 * lf + 4), 4, 0, 0, 2 * Math.PI); c.fill();
  c.save(); c.translate(160, 100 - 12 * lf); c.scale(sx * s, s); MW.rr(c, -34, -46, 68, 92, 9);
  if (cs >= 0) { var g = c.createLinearGradient(-34, -46, 34, 46); g.addColorStop(0, "#2a2350"); g.addColorStop(1, "#151a28"); c.fillStyle = g; c.fill(); c.strokeStyle = "#8b7bff"; c.lineWidth = 1.5; c.stroke(); for (var i = -3; i <= 3; i++) { c.strokeStyle = "rgba(139,123,255,0.25)"; c.beginPath(); c.moveTo(-34, i * 14); c.lineTo(34, i * 14 + 20); c.stroke(); } }
  else { var h = c.createLinearGradient(0, -46, 0, 46); h.addColorStop(0, "#ffe9a8"); h.addColorStop(1, "#ffb547"); c.fillStyle = h; c.fill(); star5(c, 0, -6, 18, 0); c.fillStyle = "#fff"; c.fill(); }
  c.restore(); var lb = oc(T(t, 1.3, 1.5)); c.globalAlpha = f * T(t, 1.3, 1.5); MW.txt(c, o.label, 160, 166 + 6 * (1 - lb), 11, "#ffd23d", 900); c.globalAlpha = 1;
});`),
    options: { liftAt: "s (0.3)", flip: "s (0.5, power2.inOut), drawn as scaleX = |cos θ|", label: "", loop: "s (2.8)" }, defaults: { liftAt: 0.3, flip: 0.5, label: "Mảnh sao", loop: 2.8 },
    notes: "The face is swapped at 90°; the floor shadow narrows with the turn and widens with the lift.",
    demo: CV("motionCardFlipReveal", 2.8),
  }),

  T("text/wave-loop", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, fs = parseFloat(getComputedStyle(el).fontSize), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.accent);
      return MW.drive(tl, at, o.loop, function (t) {
        ch.forEach(function (c, i) { var v = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t - o.delay * i) / o.period); gsap.set(c, { y: -o.amp * fs * v }); c.style.color = o.tint && v > 0.6 ? mix((v - 0.6) / 0.4) : ""; });
      });
    },
    options: { amp: "em (0.3)", period: "s (1.2)", delay: "s per letter (0.1)", tint: "letters near the crest take the accent", accent: "", loop: "s, seamless (2.4)" },
    defaults: { amp: 0.3, period: 1.2, delay: 0.1, tint: true, accent: "#a99bff", loop: 2.4 },
    demo: H("Sóng vỗ không ngừng", `MW.textWaveLoop(q(".tk-head"), tl, 0, {});`, 2.4, { size: 150 }),
  }),

  T("text/infinite-marquee", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var rows = Array.prototype.slice.call(el.querySelectorAll(o.rows)).map(function (r, i) { var u = r.firstElementChild, w = u.offsetWidth; for (var k = 0; k < 4; k++) r.appendChild(u.cloneNode(true)); return { r: r, w: w, dir: o.dirs[i % o.dirs.length] }; });
      el.style.webkitMaskImage = el.style.maskImage = "linear-gradient(90deg, transparent 0, #000 " + o.fade + "px, #000 calc(100% - " + o.fade + "px), transparent 100%)";
      return MW.drive(tl, at, o.loop, function (t) { rows.forEach(function (q) { var p = (t / o.loop * o.copies) % 1; gsap.set(q.r, { x: q.dir < 0 ? -q.w * p : -q.w * (1 - p) }); }); });
    },
    options: { rows: "the moving rows (each one's first child is one copy)", dirs: "−1 left, 1 right, per row", copies: "copies each row moves per loop (1)", fade: "px the edges fade (136)", loop: "s (6)" },
    defaults: { rows: ".im-r", dirs: [-1, 1, -1], copies: 1, fade: 136, loop: 6 },
    demo: { css: `${BG}\n.mq { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); } .im-r { display: flex; width: max-content; white-space: nowrap; } .im-r > span { flex: none; padding-right: 0.5em; }
.mq .a { font-size: 104px; font-weight: 800; margin: 30px 0; } .mq .b { font-size: 120px; font-weight: 900; color: #0b0d12; background: #8b7bff; line-height: 1.64; } .mq .c { font-size: 104px; font-weight: 800; color: transparent; -webkit-text-stroke: 5px #e8ebf3; margin: 30px 0; }`,
      html: `<div class="mq"><div class="im-r a"><span>LÀM PHIM NHANH • ĐẸP • ĐÚNG HẸN •</span></div><div class="im-r b"><span>LÀM PHIM NHANH • ĐẸP • ĐÚNG HẸN •</span></div><div class="im-r c"><span>LÀM PHIM NHANH • ĐẸP • ĐÚNG HẸN •</span></div></div>`,
      run: `MW.textInfiniteMarquee(q(".mq"), tl, 0, {});`, duration: 6 },
  }),

  T("text/scale-breathe", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, r = MW.rand(o.seed), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.accent), P = ch.map(function () { return [r() < 0.5 ? o.freqs[0] : o.freqs[1], r() * 2 * Math.PI]; });
      el.style.letterSpacing = o.spacing + "em"; ch.forEach(function (c) { gsap.set(c, { transformOrigin: "50% 65%" }); });
      return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var s = 1 + o.amp * Math.sin(2 * Math.PI * P[i][0] * t + P[i][1]); gsap.set(c, { scale: s }); c.style.color = s > 1.07 ? mix(Math.min(0.8, (s - 1.07) / 0.05 * 0.8)) : ""; }); });
    },
    options: { amp: "± scale (0.12)", freqs: "[Hz, Hz] each letter takes one ([0.5, 0.75])", spacing: "em (0.08)", accent: "tint above 1.07", seed: "(3)", loop: "s, seamless (4)" },
    defaults: { amp: 0.12, freqs: [0.5, 0.75], spacing: 0.08, accent: "#a99bff", seed: 3, loop: 4 },
    demo: H("Thở đều nào", `MW.textScaleBreathe(q(".tk-head"), tl, 0, {});`, 4, { size: 170 }),
  }),

  T("text/sparkles", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, fs = parseFloat(getComputedStyle(el).fontSize), S = []; if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var L = el.offsetLeft - o.pad, Tp = el.offsetTop - o.pad, W = el.offsetWidth + 2 * o.pad, Hh = el.offsetHeight + o.pad + o.below, base = MW.rand(o.seed);
      for (var i = 0; i < o.count; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;opacity:0;color:" + o.colors[i % o.colors.length] + ";"; d.innerHTML = '<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10 Z" fill="currentColor"/></svg>'; host.appendChild(d); S.push({ d: d, per: o.periods[Math.floor(base() * o.periods.length)], off: base() * 2 }); }
      return MW.drive(tl, at, o.loop, function (t) {
        S.forEach(function (q, i) { var k = Math.floor((t + q.off) / q.per), u = ((t + q.off) % q.per) / o.life, n = Math.round(o.loop / q.per), rr = MW.rand(o.seed * 31 + i * 101 + ((k % n) + n) % n), x = L + rr() * W, y = Tp + rr() * Hh, R = (o.size[0] + rr() * (o.size[1] - o.size[0])) * fs;
          if (u >= 1) { q.d.style.opacity = "0"; return; } var a = Math.sin(Math.PI * u), z = 2 * R * a; q.d.style.width = q.d.style.height = z + "px"; gsap.set(q.d, { x: x - z / 2, y: y - z / 2, rotation: 75 + 75 * u }); q.d.style.opacity = String(a); });
      });
    },
    options: { count: "(10)", life: "s per sparkle (0.8)", periods: "s, each star takes one ([1, 1.333, 2])", size: "[min, max] radius in em ([0.12, 0.26])", pad: "px around the text (56)", below: "px below it (40)", colors: "", seed: "(5)", loop: "s, seamless (4)" },
    defaults: { count: 10, life: 0.8, periods: [1, 4 / 3, 2], size: [0.12, 0.26], pad: 56, below: 40, colors: ["#a99bff", "#ffd23d", "#e8ebf3"], seed: 5, loop: 4 },
    demo: H("Lấp lánh đêm hội", `MW.textSparkles(q(".tk-head"), tl, 0, {});`, 4, { size: 150 }),
  }),

  T("text/hop-sequence", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.each, o.cap / Math.max(1, n - 1)), fs = parseFloat(getComputedStyle(el).fontSize), col = getComputedStyle(el).color, p1o = gsap.parseEase("power1.out"), p1i = gsap.parseEase("power1.in"), sh = [];
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      ch.forEach(function (c) { gsap.set(c, { transformOrigin: "50% 100%" }); var s = document.createElement("i"); s.style.cssText = "position:absolute;height:0.07em;border-radius:50%;background:rgba(0,0,0,0.5);pointer-events:none;"; el.appendChild(s); sh.push(s); });
      return MW.drive(tl, at, o.cycle, function (t) {
        ch.forEach(function (c, i) { var h0 = o.start + i * st, u = t - h0, y = 0, sx = 1, sy = 1, hop = false;
          if (u > -0.1 && u < 0) { var k = Math.sin(Math.PI * (u + 0.1) / 0.1); sx = 1 + 0.05 * k; sy = 1 - 0.07 * k; }
          else if (u >= 0 && u < o.hop) { var v = u / o.hop; y = -o.height * fs * (v < 0.5 ? p1o(v / 0.5) : 1 - p1i((v - 0.5) / 0.5)); hop = true; }
          else if (u >= o.hop && u < o.hop + 0.12) { var w = Math.sin(Math.PI * (u - o.hop) / 0.12); sx = 1 + 0.1 * w; sy = 1 - 0.14 * w; }
          gsap.set(c, { y: y, scaleX: sx, scaleY: sy }); c.style.color = hop ? o.accent : col;
          var f = 1 + y / (o.height * fs), s = sh[i]; s.style.left = c.offsetLeft + c.offsetWidth * (0.5 - 0.35 * f) + "px"; s.style.width = c.offsetWidth * 0.7 * f + "px"; s.style.top = c.offsetTop + c.offsetHeight * 0.9 + "px"; s.style.opacity = String(0.2 + 0.8 * f); });
      });
    },
    options: { height: "em (0.4)", hop: "s (0.4)", each: "s between letters (0.1)", cap: "s all hops start within (1.5)", start: "s (0.2)", accent: "the hopping letter", cycle: "s (2.4)" },
    defaults: { height: 0.4, hop: 0.4, each: 0.1, cap: 1.5, start: 0.2, accent: "#ffd23d", cycle: 2.4 },
    demo: H("Nhảy lên nào", `MW.textHopSequence(q(".tk-head"), tl, 0, {});`, 2.4, { size: 170 }),
  }),

  T("text/y-spin-stagger", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = gsap.parseEase(o.ease), col = getComputedStyle(el).color;
      return MW.drive(tl, at, o.cycle, function (t) {
        ch.forEach(function (c, i) { var th = 2 * Math.PI * e(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))), cs = Math.cos(th); gsap.set(c, { scaleX: Math.abs(cs) < 0.02 ? 0.02 * Math.sign(cs || 1) : cs, scaleY: 1 + 0.05 * Math.abs(Math.sin(th)) }); c.style.color = cs < 0 ? o.accent : col; });
      });
    },
    options: { duration: "s per letter (0.8)", stagger: "s (0.08)", cap: "s all start within (1)", ease: "(power1.inOut)", start: "s (0.3)", accent: "the back side", cycle: "s (3.2)" },
    defaults: { duration: 0.8, stagger: 0.08, cap: 1, ease: "power1.inOut", start: 0.3, accent: "#a99bff", cycle: 3.2 },
    notes: "Drawn flat as scaleX = cos θ (no perspective); the back side shows the accent.",
    demo: H("Xoay một vòng", `MW.textYSpinStagger(q(".tk-head"), tl, 0, {});`, 3.2, { size: 170 }),
  }),

  T("text/loading-dots", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      el.textContent = el.textContent.replace(/[.…]+\s*$/, ""); var D = [], fs = parseFloat(getComputedStyle(el).fontSize);
      for (var i = 0; i < 3; i++) { var d = document.createElement("span"); d.style.cssText = "display:inline-block;border-radius:50%;vertical-align:baseline;width:" + 2 * o.radius + "em;height:" + 2 * o.radius + "em;margin-left:" + (i ? o.gap - 2 * o.radius : o.gap * 0.7) + "em;background:" + (i === 1 ? o.accent : "currentColor") + ";"; el.appendChild(d); D.push(d); }
      return MW.drive(tl, at, o.loop, function (t) { D.forEach(function (d, k) { var ph = (((t - o.delay * k) % o.cycle) + o.cycle) % o.cycle, v = ph < 0.6 * o.cycle ? Math.sin(Math.PI * ph / (0.6 * o.cycle)) : 0; d.style.opacity = String(0.2 + 0.8 * v); gsap.set(d, { y: -o.lift * fs * v }); }); });
    },
    options: { radius: "em (0.09)", gap: "em between dots (0.3)", cycle: "s (1.2)", delay: "s between dots (0.2)", lift: "em (0.22)", accent: "the middle dot", loop: "s, seamless (2.4)" },
    defaults: { radius: 0.09, gap: 0.3, cycle: 1.2, delay: 0.2, lift: 0.22, accent: "#a99bff", loop: 2.4 },
    demo: H("Đang tải...", `MW.textLoadingDots(q(".tk-head"), tl, 0, {});`, 2.4, { size: 150 }),
  }),

  T("text/hanging-sign", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var si = gsap.parseEase("sine.inOut"); gsap.set(el, { transformOrigin: "50% " + (el.offsetHeight / 2 - o.pin) + "px" });
      return MW.drive(tl, at, o.half * 2 * o.cycles, function (t) { var k = Math.floor(t / o.half), u = (t - k * o.half) / o.half, p = k % 2 ? 1 - si(u) : si(u); gsap.set(el, { rotation: -o.angle + 2 * o.angle * p }); });
    },
    options: { angle: "± degrees (4)", half: "s each way (2.4)", cycles: "(1)", pin: "px from the card's centre up to the pin (336)" },
    defaults: { angle: 4, half: 2.4, cycles: 1, pin: 336 },
    demo: { css: `${BG}\n.hs-pin { position: absolute; left: 50%; top: 210px; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: #c9d2ea; z-index: 2; } .hs { position: absolute; left: 50%; top: 546px; transform: translate(-50%, -50%); padding: 44px 60px; border-radius: 24px; border: 8px solid #8b7bff; background: #151a24; font-size: 120px; font-weight: 900; white-space: nowrap; }
.hs svg { position: absolute; left: 0; bottom: 100%; width: 100%; height: 252px; overflow: visible; }`,
      html: `<div class="hs-pin"></div><div class="hs"><svg viewBox="0 0 100 252" preserveAspectRatio="none"><path d="M50 32 L14 252 M50 32 L86 252" stroke="#6c778b" stroke-width="4" fill="none" vector-effect="non-scaling-stroke"/></svg>TIỆM CÀ PHÊ</div>`,
      run: `MW.textHangingSign(q(".hs"), tl, 0, {});`, duration: 4.8 },
  }),
];
