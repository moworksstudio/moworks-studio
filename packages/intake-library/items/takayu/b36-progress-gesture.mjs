// TakayuStudio, Progression & Quests and Gesture & Mobile (batch 3.6): quest, skill, streak, energy, XP, tier, mission, rank and
// collection moments, and swipe, hold, pull, drag, reorder, sheet and pinch gestures, drawn on the reference's 320 x 200 frame in the
// site's own units with touch rings or a cursor; written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 3, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "rand", "spring", "springs", "eases", "stage320"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, oc = function (u) { return 1 - Math.pow(1 - u, 3); }, ox = function (u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); }, ic = function (u) { return u * u * u; };
var p2o = gsap.parseEase("power2.out"), p2io = gsap.parseEase("power2.inOut"), p1i = gsap.parseEase("power1.in"), bo = gsap.parseEase("back.out(1.7)"), A = "#8b7bff";
var hs = function (t, a, d) { var u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
var tick = function (x, y, s, w, col, u) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(x - 6 * s, y); var a = Math.min(1, u * 2.2), b = Math.max(0, (u - 0.45) / 0.55); c.lineTo(x - 6 * s + 4 * s * a, y + 4 * s * a); if (b > 0) c.lineTo(x - 2 * s + 9 * s * b, y + 4 * s - 10 * s * b); c.stroke(); };
var lock = function (x, y, s, col) { c.strokeStyle = col; c.lineWidth = 2 * s; c.beginPath(); c.arc(x, y - 3 * s, 4 * s, Math.PI, 2 * Math.PI); c.stroke(); c.fillStyle = col; MW.rr(c, x - 6 * s, y - 3 * s, 12 * s, 9 * s, 2 * s); c.fill(); };
var star = function (x, y, R, r) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; c.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); } c.closePath(); };
var roll = function (a, b, x, y, size, col, u, step, w) { c.save(); c.beginPath(); c.rect(x - w / 2, y - step / 2, w, step); c.clip(); MW.txt(c, a, x, y - step * u + 0.5, size, col, 900); MW.txt(c, b, x, y + step * (1 - u) + 0.5, size, u > 0.5 ? A : col, 900); c.restore(); };
var touch = function (x, y, on) { if (!on) return; c.fillStyle = "rgba(255,255,255,0.25)"; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.stroke(); };
var phone = function (x, y, w, h) { MW.rr(c, x, y, w, h, 16); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1.5; c.stroke(); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);

export default [
  T("lower/quest-ribbon-banner", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var w = 240 * ox(T(t, 0.3, 0.8)), h = 48 * (1 - ic(T(t, o.closeAt, o.closeAt + 0.2))), cx = 160, cy = 86, tl2 = 22 * bo(T(t, 0.55, 0.85));
  if (h < 0.5 || w < 0.5) return;
  [-1, 1].forEach(function (s) { c.fillStyle = "#5b46d8"; c.beginPath(); var ex = cx + s * w / 2; c.moveTo(ex - s * 4, cy - h / 2 + 8); c.lineTo(ex + s * tl2, cy - h / 2 + 8); c.lineTo(ex + s * (tl2 - 8), cy + 4); c.lineTo(ex + s * tl2, cy + h / 2 + 8); c.lineTo(ex - s * 4, cy + h / 2 + 8); c.closePath(); c.fill(); });
  c.save(); c.beginPath(); c.rect(cx - w / 2, cy - h / 2, w, h); c.clip(); c.fillStyle = A; c.fillRect(cx - 120, cy - 24, 240, 48); MW.txt(c, o.kicker, cx, cy - 12, 7, "rgba(255,255,255,0.8)", 900);
  var a = oc(T(t, 0.45, 0.9)); c.globalAlpha = a; MW.txt(c, o.title, cx, cy + 6 + 6 * (1 - a), 15, "#fff", 900); c.restore(); c.globalAlpha = 1;
  var u = 112 * ox(T(t, 0.62, 1.05)); if (u > 0) { c.fillStyle = "#ffd23d"; c.fillRect(cx - u, 124, 2 * u, 2); [-1, 1].forEach(function (s) { c.save(); c.translate(cx + s * u, 125); c.rotate(Math.PI / 4); c.fillRect(-3, -3, 6, 6); c.restore(); }); }
  var ob = oc(T(t, 0.95, 1.3)); c.globalAlpha = ob * (h / 48); MW.txt(c, o.goal, cx, 140 + 6 * (1 - ob), 8, "#c9d2ea", 700); c.globalAlpha = 1;
});`),
    options: { kicker: "", title: "", goal: "the objective line", closeAt: "s (2.3)", loop: "s (2.7)" }, defaults: { kicker: "NHIỆM VỤ MỚI", title: "Tới vùng đất lạ", goal: "Mục tiêu: tìm 3 mảnh bản đồ", closeAt: 2.3, loop: 2.7 },
    notes: "The band opens from the centre in 0.5 s (expo.out); tails slide out behind its ends (back.out), the underline grows with diamond ends.",
    demo: CV("lowerQuestRibbonBanner", 2.7),
  }),

  T("ui/skill-node-unlock", {
    uses: U,
    fn: mk(`var sp = MW.spring(320, 14), X = [70, 160, 250], y = 96;
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = p2io(T(t, o.resetAt, o.resetAt + 0.3)), p = p2io(T(t, 0.35, 0.35 + o.travel)) * (1 - rs), on = t >= o.arriveAt && rs < 1;
  c.lineWidth = 4; c.strokeStyle = "#2a3142"; c.beginPath(); c.moveTo(X[0], y); c.lineTo(X[2], y); c.stroke(); c.strokeStyle = A; c.beginPath(); c.moveTo(X[0], y); c.lineTo(X[0] + (X[1] - X[0]) * p, y); c.stroke();
  c.fillStyle = A; c.beginPath(); c.arc(X[0], y, 20, 0, 2 * Math.PI); c.fill(); star(X[0], y, 8, 3.5); c.fillStyle = "#fff"; c.fill();
  var k = on ? sp.at(t - o.arriveAt) * (1 - rs) : 0; c.fillStyle = "#1b2130"; c.beginPath(); c.arc(X[1], y, 20, 0, 2 * Math.PI); c.fill(); if (k > 0) { c.save(); c.translate(X[1], y); c.scale(k, k); c.fillStyle = A; c.beginPath(); c.arc(0, 0, 20, 0, 2 * Math.PI); c.fill(); star(0, 0, 8, 3.5); c.fillStyle = "#fff"; c.fill(); c.restore(); }
  var lk = 1 - T(t, o.arriveAt, o.arriveAt + 0.08); if (lk > 0 && !on) { var sw = 1 + 0.2 * T(t, o.arriveAt - 0.15, o.arriveAt); c.globalAlpha = lk; lock(X[1], y, sw, "#6c778b"); c.globalAlpha = 1; }
  c.fillStyle = "#1b2130"; c.beginPath(); c.arc(X[2], y, 20, 0, 2 * Math.PI); c.fill(); lock(X[2], y, 1, "#4a5470");
  if (p > 0 && p < 1) { c.fillStyle = "rgba(255,210,61,0.35)"; c.beginPath(); c.arc(X[0] + (X[1] - X[0]) * p, y, 7, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(X[0] + (X[1] - X[0]) * p, y, 3.5, 0, 2 * Math.PI); c.fill(); }
  var r = T(t, o.arriveAt, o.arriveAt + 0.6); if (r > 0 && r < 1) { c.strokeStyle = "rgba(139,123,255," + (1 - r).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(X[1], y, 20 + 22 * oc(r), 0, 2 * Math.PI); c.stroke(); }
  c.globalAlpha = T(t, o.arriveAt + 0.2, o.arriveAt + 0.45) * (1 - rs); MW.txt(c, o.label, X[1], 140, 9, "#c9c0ff", 900); c.globalAlpha = 1;
});`),
    options: { travel: "s (0.65)", arriveAt: "s (1.0, spring k320 c14)", label: "", resetAt: "s (2.4)", loop: "s (2.8)" }, defaults: { travel: 0.65, arriveAt: 1, label: "MỞ KHOÁ NHÁNH", resetAt: 2.4, loop: 2.8 },
    demo: CV("uiSkillNodeUnlock", 2.8),
  }),

  T("ui/streak-day-light", {
    uses: U,
    fn: mk(`var sp = MW.spring(320, 14);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = ic(T(t, o.resetAt, o.resetAt + 0.25)), L = o.lightAt, y = 140; MW.txt(c, o.label, 160, 40, 8, "#8f9ab3", 800);
  var cn = oc(T(t, L - 0.18, L)) * (1 - rs); c.strokeStyle = "#2a3142"; c.lineWidth = 3; c.beginPath(); c.moveTo(64, y); c.lineTo(256, y); c.stroke(); c.strokeStyle = A; c.beginPath(); c.moveTo(64, y); c.lineTo(224 + 32 * cn, y); c.stroke();
  for (var i = 0; i < 7; i++) { var x = 64 + 32 * i, k = i < 6 ? 1 : (t > L ? sp.at(t - L) : 0) * (1 - rs); c.fillStyle = "#1b2130"; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.fill(); if (k > 0) { c.save(); c.translate(x, y); c.scale(k, k); c.fillStyle = A; c.beginPath(); c.arc(0, 0, 9, 0, 2 * Math.PI); c.fill(); c.restore(); } MW.txt(c, String(i + 1), x, y + 18, 6, i === 6 && k > 0.5 ? A : "#6c778b", 800); }
  var r = T(t, L, L + 0.5); if (r > 0 && r < 1 && rs < 1) { c.strokeStyle = "rgba(139,123,255," + (1 - r).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(256, y, 9 + 14 * oc(r), 0, 2 * Math.PI); c.stroke(); }
  var u = ox(T(t, L, L + 0.25)) * (1 - rs), bump = 1 + 0.12 * hs(t, L + 0.05, 0.25); c.save(); c.translate(160, 84); c.scale(bump, bump); roll(String(o.from), String(o.to), 0, 0, 46, "#e8ebf3", u, 60, 70); c.restore();
});`),
    options: { from: "(6)", to: "(7)", lightAt: "s (1.0)", label: "", resetAt: "s (2.45)", loop: "s (2.8)" }, defaults: { from: 6, to: 7, lightAt: 1, label: "Đăng nhập liên tiếp (ngày)", resetAt: 2.45, loop: 2.8 },
    demo: CV("uiStreakDayLight", 2.8),
  }),

  T("ui/battery-refill", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var p = o.from + (o.to - o.from) * p2io(T(t, 0.45, 0.45 + o.charge)); p -= (p - o.from) * ic(T(t, o.drainAt, o.drainAt + 0.22)); var full = p >= 99.5, pop = full ? 1 + 0.05 * hs(t, 0.45 + o.charge, 0.2) : 1;
  c.save(); c.translate(160, 100); c.scale(pop, pop); MW.rr(c, -85, -26, 170, 52, 9); c.strokeStyle = "#c9d2ea"; c.lineWidth = 2; c.stroke(); c.fillStyle = "#c9d2ea"; MW.rr(c, 87, -10, 6, 20, 2); c.fill();
  var fw = 162 * p / 100, pulse = full ? 1 : 1 - 0.4 * (0.5 - 0.5 * Math.cos(2 * Math.PI * o.pulse * t)); c.globalAlpha = pulse; MW.rr(c, -81, -22, Math.max(1, fw), 44, 6); c.fillStyle = full ? "#3ddc84" : A; c.fill(); c.globalAlpha = 1;
  c.fillStyle = "#0b0d12"; for (var i = 1; i < 5; i++) c.fillRect(-81 + 162 * i / 5 - 1, -22, 2, 44);
  c.fillStyle = p > 52 ? "#0b0d12" : "#6c778b"; c.beginPath(); c.moveTo(4, -16); c.lineTo(-8, 3); c.lineTo(0, 3); c.lineTo(-4, 16); c.lineTo(8, -3); c.lineTo(0, -3); c.closePath(); c.fill(); c.restore();
  MW.txt(c, Math.round(p) + "%", 160, 148, 12, full ? "#3ddc84" : "#e8ebf3", 900); var f = bo(T(t, 1.95, 2.15)) * (1 - T(t, o.drainAt, o.drainAt + 0.1)); if (f > 0) { c.save(); c.translate(160, 54); c.scale(f, f); MW.txt(c, o.label, 0, 0, 13, "#3ddc84", 900); c.restore(); }
});`),
    options: { from: "% (15)", to: "% (100)", charge: "s (1.45, ease-in-out)", pulse: "Hz while charging (2.5)", drainAt: "s (2.5)", label: "", loop: "s (2.9)" }, defaults: { from: 15, to: 100, charge: 1.45, pulse: 2.5, drainAt: 2.5, label: "ĐẦY", loop: 2.9 },
    demo: CV("uiBatteryRefill", 2.9),
  }),

  T("ui/xp-overflow-bar", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var x0 = 50, y = 110, w = 220, p;
  if (t < 1.05) p = o.from + (100 - o.from) * oc(T(t, 0.3, 0.8)); else p = o.carry * oc(T(t, 1.2, 1.6)); if (t > 2.4) p = o.carry + (o.from - o.carry) * p2io(T(t, 2.4, 2.65));
  MW.rr(c, x0, y, w, 14, 7); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, x0, y, Math.max(2, w * p / 100), 14, 7); c.fillStyle = A; c.fill();
  var fl = 0.7 * (1 - T(t, 0.8, 1.2)) * (t >= 0.8 ? 1 : 0); if (fl > 0) { c.fillStyle = "rgba(233,235,243," + fl.toFixed(3) + ")"; MW.rr(c, x0, y, w, 14, 7); c.fill(); }
  var g = oc(T(t, 0.2, 0.45)) * (1 - T(t, 0.7, 0.9)); c.globalAlpha = g; MW.txt(c, o.gain, x0 + w - 4, y - 14 + 6 * (1 - g), 9, "#ffd23d", 900, "right"); c.globalAlpha = 1;
  MW.txt(c, "CẤP", 160, 50, 7, "#8f9ab3", 800); var bump = 1 + 0.15 * hs(t, 0.9, 0.3); c.save(); c.translate(160, 74); c.scale(bump, bump); roll(o.level[0], o.level[1], 0, 0, 24, "#e8ebf3", bo(T(t, 0.85, 1.1)), 36, 50); c.restore();
  var br = T(t, 1.5, 1.7) * (t < 2.4 ? 1 : 0); if (br > 0) { c.globalAlpha = br; c.strokeStyle = "#ffd23d"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y + 20); c.lineTo(x0, y + 24); c.lineTo(x0 + w * o.carry / 100, y + 24); c.lineTo(x0 + w * o.carry / 100, y + 20); c.stroke(); MW.txt(c, "+" + o.carry, x0 + w * o.carry / 200, y + 32, 8, "#ffd23d", 900); c.globalAlpha = 1; }
  o.chips.forEach(function (ch, i) { var on = t >= [0.8, 1, 1.4][i] && t < 2.4, x = 96 + i * 64; MW.rr(c, x - 28, 160, 56, 16, 8); c.fillStyle = on ? A : "#1b2130"; c.fill(); MW.txt(c, ch, x, 168.5, 7, on ? "#0b0d12" : "#6c778b", 800); });
});`),
    options: { from: "% at the start (80)", carry: "% carried over (25)", level: "[before, after]", gain: "", chips: "three status chips", loop: "s (2.8)" }, defaults: { from: 80, carry: 25, level: ["07", "08"], gain: "+45 KN", chips: ["Đầy", "Lên cấp", "Dư"], loop: 2.8 },
    demo: CV("uiXpOverflowBar", 2.8),
  }),

  T("ui/tier-track-unlock", {
    uses: U,
    fn: mk(`var N = [60, 127, 193, 260];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = T(t, o.resetAt, o.resetAt + 0.27), p = p2io(T(t, 0.4, 0.4 + o.fill)) * (1 - rs), reach = t >= o.reachAt && rs < 0.5;
  c.fillStyle = "#262c3a"; c.fillRect(40, 140, 240, 4); c.fillStyle = A; c.fillRect(40, 140, N[1] - 40 + (N[2] - N[1]) * p, 4);
  N.forEach(function (x, i) { var done = i < 2 || (i === 2 && reach), bump = i === 2 ? 1 + 0.14 * hs(t, o.reachAt, 0.3) : 1, f = i === 2 ? T(t, o.reachAt, o.reachAt + 0.2) * (1 - rs) : (i < 2 ? 1 : 0);
    c.save(); c.translate(x, 106); c.scale(bump, bump); MW.rr(c, -22, -20, 44, 40, 7); c.fillStyle = i === 3 ? "#151a24" : "#1b2130"; c.fill(); if (f > 0) { c.globalAlpha = f; MW.rr(c, -22, -20, 44, 40, 7); c.fillStyle = A; c.fill(); c.globalAlpha = 1; }
    c.fillStyle = f > 0.5 ? "#fff" : i === 3 ? "#3a4466" : "#6c778b"; c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -2); c.lineTo(0, 10); c.lineTo(-8, -2); c.closePath(); c.fill(); if (i === 3) { lock(14, -12, 0.8, "#6c778b"); MW.txt(c, "TIẾP", 0, 28, 6, "#4a5470", 800); } c.restore();
    c.fillStyle = done ? A : "#3a4466"; c.beginPath(); c.arc(x, 142, 5, 0, 2 * Math.PI); c.fill(); MW.txt(c, String(o.base + i), x, 156, 6, "#8f9ab3", 800); });
  var r = T(t, o.reachAt, o.reachAt + 0.5); if (r > 0 && r < 1 && rs < 1) { c.strokeStyle = "rgba(139,123,255," + (1 - r).toFixed(3) + ")"; c.lineWidth = 1.5; var e = 10 * oc(r); MW.rr(c, N[2] - 22 - e, 86 - e, 44 + 2 * e, 40 + 2 * e, 7 + e); c.stroke(); }
  c.globalAlpha = T(t, o.reachAt + 0.15, o.reachAt + 0.4) * (1 - rs); MW.txt(c, o.label, 160, 52, 12, "#c9c0ff", 900); c.globalAlpha = 1;
});`),
    options: { fill: "s (0.8, ease-in-out)", reachAt: "s (1.2)", base: "the first tier's number (6)", label: "", resetAt: "s (2.45)", loop: "s (2.8)" }, defaults: { fill: 0.8, reachAt: 1.2, base: 6, label: "MỞ BẬC 8", resetAt: 2.45, loop: 2.8 },
    demo: CV("uiTierTrackUnlock", 2.8),
  }),

  T("ui/mission-step-check", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = p2io(T(t, o.resetAt, o.resetAt + 0.25)), y = 96, X = [56, 108, 160, 212, 264], cA = o.checkAt, s = o.step - 1;
  for (var i = 0; i < 4; i++) { c.strokeStyle = "#2a3142"; c.lineWidth = 3; c.beginPath(); c.moveTo(X[i] + 15, y); c.lineTo(X[i + 1] - 15, y); c.stroke(); var fill = i < s - 1 ? 1 : i === s - 1 ? p2io(T(t, 0.55, 0.8)) * (1 - rs) : 0; if (fill > 0) { c.strokeStyle = A; c.beginPath(); c.moveTo(X[i] + 15, y); c.lineTo(X[i] + 15 + (X[i + 1] - X[i] - 30) * fill, y); c.stroke(); } }
  X.forEach(function (x, i) { var done = i < s, now = i === s, f = now ? bo(T(t, 0.75, 0.95)) * (1 - rs) : done ? 1 : 0; c.fillStyle = "#1b2130"; c.beginPath(); c.arc(x, y, 15, 0, 2 * Math.PI); c.fill(); c.strokeStyle = i === s + 1 && T(t, 1.15, 1.35) * (1 - rs) > 0.5 ? A : "#3a4466"; c.lineWidth = 1.5; c.stroke();
    if (f > 0) { c.save(); c.translate(x, y); c.scale(f, f); c.fillStyle = A; c.beginPath(); c.arc(0, 0, 15, 0, 2 * Math.PI); c.fill(); c.restore(); }
    if (done) tick(x, y, 1, 2.5, "#fff", 1); else if (now) { var sh = 1 - T(t, 0.7, 0.8); if (sh > 0 && rs < 0.5) MW.txt(c, String(i + 1), x, y + 0.5, 11 * sh, "#8f9ab3", 900); if (t > cA && rs < 0.5) tick(x, y, 1, 2.5, "#fff", oc(T(t, cA, cA + 0.25))); else if (rs >= 0.5) MW.txt(c, String(i + 1), x, y + 0.5, 11, "#8f9ab3", 900); } else MW.txt(c, String(i + 1), x, y + 0.5, 11, "#6c778b", 900); });
  MW.txt(c, "Bước", 140, 52, 9, "#8f9ab3", 800); roll(s + " / 5", (s + 1) + " / 5", 186, 52, 13, "#e8ebf3", ox(T(t, cA, cA + 0.25)) * (1 - rs), 36, 60);
  var tb = (s * 20) + 20 * p2io(T(t, cA, cA + 0.4)) * (1 - rs); MW.rr(c, 120, 140, 80, 6, 3); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 120, 140, 80 * tb / 100, 6, 3); c.fillStyle = A; c.fill();
});`),
    options: { step: "the step just done (3)", checkAt: "s (0.85)", resetAt: "s (2.4)", loop: "s (2.8)" }, defaults: { step: 3, checkAt: 0.85, resetAt: 2.4, loop: 2.8 },
    demo: CV("uiMissionStepCheck", 2.8),
  }),

  T("ui/rank-up-badge", {
    uses: U,
    fn: mk(`var sp = MW.spring(300, 11), shield = function () { c.beginPath(); c.moveTo(0, -36); c.lineTo(30, -26); c.lineTo(28, 10); c.quadraticCurveTo(22, 30, 0, 40); c.quadraticCurveTo(-22, 30, -28, 10); c.lineTo(-30, -26); c.closePath(); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = T(t, o.resetAt, o.resetAt + 0.25), P = o.popAt, s = t < 0.7 ? 1 : t < P ? 1 - 0.08 * p2io(T(t, 0.7, 0.98)) : 0.92 + 0.08 * sp.at(t - P), fill = oc(T(t, P, P + 0.22)) * (1 - rs);
  c.save(); c.translate(160, 92); c.scale(s * 1.25, s * 1.25); shield(); c.fillStyle = "#2a3142"; c.fill(); if (fill > 0) { c.save(); shield(); c.clip(); c.fillStyle = A; c.fillRect(-32, 40 - 78 * fill, 64, 78 * fill); c.restore(); } shield(); c.strokeStyle = "#c9d2ea"; c.lineWidth = 2; c.stroke();
  [0, 1].forEach(function (k) { c.strokeStyle = k === 0 || fill > 0.5 ? "#ffd23d" : "#4a5470"; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 18 + k * 7); c.lineTo(0, 24 + k * 7); c.lineTo(10, 18 + k * 7); c.stroke(); });
  c.save(); c.beginPath(); c.rect(-20, -26, 40, 40); c.clip(); var u = oc(T(t, P, P + 0.22)) * (1 - rs); MW.txt(c, o.from, 0, -6 - 40 * u, 26, "#e8ebf3", 900); MW.txt(c, o.to, 0, -6 + 40 * (1 - u), 26, "#fff", 900); c.restore(); c.restore();
  for (var i = 0; i < 14; i++) { var q = T(t, P, P + 0.7); if (q <= 0 || q >= 1 || rs > 0) continue; var a = i / 14 * 2 * Math.PI, d = 30 + (40 + 30 * ((i * 7) % 5) / 4) * oc(q), z = 5.5 - 4.5 * q; c.globalAlpha = 1 - q; c.fillStyle = i % 3 === 2 ? "#ffd23d" : A; c.save(); c.translate(160 + d * Math.cos(a), 92 + d * Math.sin(a)); c.rotate(Math.PI / 4); c.fillRect(-z / 2, -z / 2, z, z); c.restore(); } c.globalAlpha = 1;
  c.globalAlpha = T(t, 1.2, 1.45) * (1 - rs); MW.txt(c, o.label, 160, 160, 12, "#c9c0ff", 900); c.globalAlpha = 1;
});`),
    options: { from: "", to: "", popAt: "s (1.0, spring k300 c11 after a 0.92 wind-up)", label: "", resetAt: "s (2.5)", loop: "s (2.8)" }, defaults: { from: "B", to: "A", popAt: 1, label: "THĂNG HẠNG", resetAt: 2.5, loop: 2.8 },
    demo: CV("uiRankUpBadge", 2.8),
  }),

  T("motion/collection-last-slot", {
    uses: U,
    fn: mk(`var cells = []; for (var r = 0; r < 2; r++) for (var k = 0; k < 3; k++) cells.push([110 + k * 50, 64 + r * 50]); var cols = ["#ff8a5c", "#3dd6f5", "#7af0b0", "#ffd23d", "#ff8fab", "#a693ff"], L = o.landAt;
var icon = function (x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.beginPath(); c.moveTo(0, -12); c.lineTo(11, -2); c.lineTo(0, 12); c.lineTo(-11, -2); c.closePath(); c.fill(); c.restore(); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, o.loop - 0.35, o.loop); c.globalAlpha = f;
  cells.forEach(function (p, i) { var w = 1 + 0.08 * hs(t, 1.15 + i * 0.05, 0.25), last = i === 5; c.save(); c.translate(p[0], p[1]); c.scale(w, w); MW.rr(c, -20, -20, 40, 40, 8); c.fillStyle = "#1b2130"; c.fill();
    if (last && t < L) { c.setLineDash([3, 3]); c.strokeStyle = "#4a5470"; c.lineWidth = 1.2; MW.rr(c, -20, -20, 40, 40, 8); c.stroke(); c.setLineDash([]); MW.txt(c, "?", 0, 0.5, 14, "#4a5470", 900); } else { c.strokeStyle = t > 1.15 + i * 0.05 ? A : "#2a3350"; c.lineWidth = 1.2; MW.rr(c, -20, -20, 40, 40, 8); c.stroke(); if (!last) icon(0, 0, 1, cols[i]); } c.restore(); });
  var u = T(t, 0.4, L), q = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, P0 = [290, 186], C = [300, 40], P1 = cells[5];
  if (t >= 0.4) { var x = (1 - q) * (1 - q) * P0[0] + 2 * (1 - q) * q * C[0] + q * q * P1[0], y = (1 - q) * (1 - q) * P0[1] + 2 * (1 - q) * q * C[1] + q * q * P1[1], lt = t - L, sx = lt > 0 ? 1 + 0.25 * Math.exp(-14 * lt) * Math.cos(30 * lt) : 1;
    c.save(); c.translate(x, y); c.rotate(2 * Math.PI * q); c.scale((1.3 - 0.3 * q) * sx, (1.3 - 0.3 * q) / sx); icon(0, 0, 1, cols[5]); c.restore(); }
  var rr = T(t, L, L + 0.45); if (rr > 0 && rr < 1) { c.strokeStyle = "rgba(139,123,255," + (1 - rr).toFixed(3) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(P1[0], P1[1], 14 + 18 * oc(rr), 0, 2 * Math.PI); c.stroke(); }
  MW.txt(c, (t >= L ? 6 : 5) + " / 6", 160, 34, 10, t >= L ? A : "#8f9ab3", 900); var lb = bo(T(t, 1.35, 1.6)); if (lb > 0) { c.save(); c.translate(160, 152); c.scale(0.8 + 0.2 * lb, 0.8 + 0.2 * lb); c.globalAlpha = f * Math.min(1, lb); MW.txt(c, o.label, 0, 0, 11, "#ffd23d", 900); c.restore(); } c.globalAlpha = 1;
});`),
    options: { landAt: "s (1.0)", label: "", loop: "s (2.8)" }, defaults: { landAt: 1, label: "BỘ SƯU TẬP 100%", loop: 2.8 },
    notes: "The last item flies a quadratic curve into the dashed slot (0.6 s, ease-in-out quad) turning once; lands with a damped squash; the cells pulse in a wave.",
    demo: CV("motionCollectionLastSlot", 2.8),
  }),

  T("motion/swipe-dismiss", {
    uses: U,
    fn: mk(`var acc = MW.ez("cubic-bezier(.55,0,1,.45)");
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var u = T(t, o.start, o.start + o.duration), x = 0, r = 0, a = 1;
  if (u < 0.1) {} else if (u < 0.55) { var v = p2io((u - 0.1) / 0.45); x = o.drag * v; r = 4 * v; a = 1 - 0.15 * v; } else if (u < 0.82) { var w = acc((u - 0.55) / 0.27); x = o.drag + (o.exit - o.drag) * w; r = 4 + 6 * w; a = 0.85 * (1 - w); } else { x = o.exit; r = 10; a = 0; }
  var back = T(t, o.backAt, o.backAt + 0.3); if (back > 0) { x = 0; r = 0; a = back; }
  MW.rr(c, 32, 70, 256, 60, 12); c.fillStyle = "#c8243f"; c.fill(); MW.txt(c, o.zone, 262, 100.5, 9, "#fff", 900, "right");
  c.save(); c.globalAlpha = a; c.translate(160 + x, 100); c.rotate(r * Math.PI / 180); MW.rr(c, -128, -30, 256, 60, 12); c.fillStyle = "#e8ebf3"; c.fill(); c.fillStyle = A; c.beginPath(); c.arc(-104, 0, 10, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.title, -86, -6, 9, "#0b0d12", 900, "left"); MW.txt(c, o.sub, -86, 8, 7, "#4a5470", 600, "left"); c.restore(); c.globalAlpha = 1;
  touch(200 + x, 108, u > 0.08 && u < 0.6);
});`),
    options: { drag: "units of finger drag (60)", exit: "units it flies to (190)", duration: "s of the pass (0.7)", start: "s (0.4)", backAt: "s it comes back for the loop (1.9)", zone: "", title: "", sub: "", loop: "s (2.4)" },
    defaults: { drag: 60, exit: 190, duration: 0.7, start: 0.4, backAt: 1.9, zone: "XOÁ", title: "Lịch họp lúc 15:00", sub: "Phòng dựng số 2", loop: 2.4 },
    notes: "Released past 35 % of the width it flies out (cubic-bezier(.55,0,1,.45)), tilting 4° → 10°; otherwise it would spring back.",
    demo: CV("motionSwipeDismiss", 2.4),
  }),

  T("ui/swipe-actions-row", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); phone(96, 8, 128, 184); var x = -70 * p1i(T(t, 0.35, 0.85)); if (t > 0.85) x = -70 + (-o.snap + 70) * p2o(T(t, 0.85, 1.49)); if (t > 2.1) x = -o.snap * (1 - p2io(T(t, 2.1, 2.55)));
  [0, 1, 2].forEach(function (i) { var y = 60 + i * 48, L = 104; c.save(); MW.rr(c, L, y, 112, 40, 10); c.clip(); if (i === 1) { var v = 0.3 + 0.7 * Math.min(1, -x / o.snap); c.globalAlpha = v; c.fillStyle = "#3d9bff"; c.fillRect(L + 112 - 96, y, 48, 40); c.fillStyle = "#ffd23d"; c.fillRect(L + 112 - 48, y, 48, 40); c.globalAlpha = 1; MW.txt(c, "Ghim", L + 112 - 72, y + 20.5, 7, "#fff", 900); MW.txt(c, "Lưu", L + 112 - 24, y + 20.5, 7, "#3a2400", 900); }
    var dx = i === 1 ? x : 0; MW.rr(c, L + dx, y, 112, 40, 10); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = ["#ff8a5c", A, "#3ddc84"][i]; c.beginPath(); c.arc(L + dx + 18, y + 20, 8, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#3a4466"; MW.rr(c, L + dx + 32, y + 13, 56, 5, 2.5); c.fill(); MW.rr(c, L + dx + 32, y + 23, 36, 4, 2); c.fill(); c.restore(); });
  touch(196 + Math.max(x, -70), 92, t > 0.3 && t < 0.88); touch(160, 168, t > 2.02 && t < 2.2);
});`),
    options: { snap: "units the row snaps to (96)", loop: "s (2.8)" }, defaults: { snap: 96, loop: 2.8 },
    notes: "Dragged 70 units (power1.in), released, it snaps to −96 in 0.64 s (power2.out); the action cells behind it brighten with the drag.",
    demo: CV("uiSwipeActionsRow", 2.8),
  }),

  T("ui/fill-confirm", {
    uses: U,
    fn: mk(`var F = function (t) { var f = 0; o.presses.forEach(function (p) { if (t < p[0]) return; var v = Math.min(1, (Math.min(t, p[1]) - p[0]) / o.hold); f = v >= 1 || t <= p[1] ? v : v * (1 - p2o(Math.min(1, (t - p[1]) / 0.12))); }); return f; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var rs = T(t, o.resetAt, o.resetAt + 0.35), f = F(t) * (1 - rs), held = o.presses.some(function (p) { return t >= p[0] && t <= p[1]; }), done = f >= 0.999;
  c.strokeStyle = "#262c3a"; c.lineWidth = 6; c.beginPath(); c.arc(160, 100, 44, 0, 2 * Math.PI); c.stroke(); if (f > 0) { c.strokeStyle = A; c.lineCap = "round"; c.beginPath(); c.arc(160, 100, 44, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * f); c.stroke(); }
  var s = held ? 0.95 : 1; c.save(); c.translate(160, 100); c.scale(s, s); c.fillStyle = "#1b2130"; c.beginPath(); c.arc(0, 0, 32, 0, 2 * Math.PI); c.fill();
  var end = o.presses[1][0] + o.hold, g = done ? bo(T(t, end, end + 0.3)) : 0; if (g > 0) { c.fillStyle = "#22c06e"; c.beginPath(); c.arc(0, 0, 32 * g, 0, 2 * Math.PI); c.fill(); tick(0, 2, 2.2, 4, "#fff", oc(T(t, end + 0.1, end + 0.4))); } else MW.txt(c, o.label, 0, 0.5, 9, "#c9d2ea", 900); c.restore();
  var cp = MW.path([[0, 290, 196], [o.presses[0][0] - 0.1, 168, 110], [o.presses[1][1] + 0.2, 168, 110], [o.presses[1][1] + 0.8, 290, 180]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], held ? 0.85 : 1);
});`),
    options: { hold: "s for a full ring (1.2)", presses: "[[s down, s up], ...]", label: "", resetAt: "s (3.6)", loop: "s (4)" }, defaults: { hold: 1.2, presses: [[0.4, 0.9], [1.4, 2.7]], label: "GIỮ", resetAt: 3.6, loop: 4 },
    demo: CV("uiFillConfirm", 4),
  }),

  T("ui/pull-refresh-spinner", {
    uses: U,
    fn: mk(`var K = function (keys, u) { for (var i = 1; i < keys.length; i++) if (u <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * p2io((u - a[0]) / (b[0] - a[0])); } return keys[keys.length - 1][1]; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); phone(104, 8, 112, 184); var u = T(t, o.start, o.start + o.duration), y = K([[0, -70], [0.5, -20], [0.86, -20], [1, -70]], u), r = K([[0, 0], [0.5, 220], [0.62, 360], [0.86, 720], [1, 760]], u), a = K([[0, 0], [0.5, 1], [0.86, 1], [1, 0]], u), d = K([[0, 0], [0.5, 18], [0.86, 18], [1, 0]], u);
  c.save(); MW.rr(c, 104, 8, 112, 184, 16); c.clip(); for (var i = 0; i < 6; i++) { MW.rr(c, 120, 40 + d + i * 24, 80, 16, 5); c.fillStyle = "#1b2130"; c.fill(); }
  if (u > 0 && u < 1) { c.globalAlpha = a; c.save(); c.translate(160, 92 + y * 0.6); c.rotate(r * Math.PI / 180); c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(0, 0, 17 * 0.6, 0, 2 * Math.PI); c.fill(); c.strokeStyle = A; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 6, 0.3, 2 * Math.PI - 0.6); c.stroke(); c.restore(); c.globalAlpha = 1; } c.restore();
  touch(160, 70 + d * 2, u > 0 && u < 0.5);
});`),
    options: { duration: "s per pass (0.92; slower in the demo)", start: "s (0.3)", loop: "s (2.4)" }, defaults: { duration: 0.92, start: 0.3, loop: 2.4 },
    notes: "The icon drops while turning to 220°, spins to 360° and 720° while loading, then flies back up at 760°; the list moves down 18 units and back.",
    demo: CV("uiPullRefreshSpinner", 2.4, "{ duration: 1.6 }"),
  }),

  T("motion/drag-lift", {
    uses: U,
    fn: mk(`var sp = MW.spring(420, 30), tiles = []; for (var r = 0; r < 2; r++) for (var k = 0; k < 3; k++) tiles.push([86 + k * 74, 70 + r * 62]);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 40, 30, 240, 140, 16); c.fillStyle = "#151a24"; c.fill(); var L = t > o.grab ? sp.at(t - o.grab) : 0; if (t > o.release) L *= 1 - p2o(T(t, o.release, o.release + 0.18));
  var dx = 26 * (p2io(T(t, 0.6, 1.05)) - p2io(T(t, 1.05, 1.55))), dy = -10 * (p2io(T(t, 0.6, 1.05)) - p2io(T(t, 1.05, 1.55)));
  tiles.forEach(function (p, i) { if (i === o.tile) { c.setLineDash([3, 3]); c.strokeStyle = "#4a5470"; c.lineWidth = 1; MW.rr(c, p[0] - 30, p[1] - 24, 60, 48, 10); c.stroke(); c.setLineDash([]); return; } MW.rr(c, p[0] - 30, p[1] - 24, 60, 48, 10); c.fillStyle = "#1b2130"; c.fill(); });
  var p = tiles[o.tile], s = 1 + 0.045 * L; c.save(); c.shadowColor = "rgba(0,0,0," + (0.55 + 0.15 * L).toFixed(3) + ")"; c.shadowBlur = (8 + 20 * L) * S.k; c.shadowOffsetY = (2 + 10 * L) * S.k; c.translate(p[0] + dx, p[1] + dy); c.scale(s, s); MW.rr(c, -30, -24, 60, 48, 10); c.fillStyle = A; c.fill(); c.restore();
  var cp = MW.path([[0, 290, 196], [o.grab - 0.1, p[0] + 6, p[1] + 6], [0.6, p[0] + 6, p[1] + 6]], t, "power2.inOut"); var cx = t < 0.6 ? cp[0] : p[0] + 6 + dx, cy = t < 0.6 ? cp[1] : p[1] + 6 + dy; if (t > o.release) { var q = T(t, o.release, o.release + 0.5); cx += 100 * q; cy += 70 * q; } MW.cursor(c, cx, cy, t > o.grab && t < o.release ? 0.85 : 1);
});`),
    options: { tile: "index of the tile picked up (1)", grab: "s (0.5, spring k420 c30)", release: "s (1.8, 0.18 s power2.out)", loop: "s (2.6)" }, defaults: { tile: 1, grab: 0.5, release: 1.8, loop: 2.6 },
    notes: "Lifted: scale 1 + 0.045 L, shadow blur 8 → 28, offset 2 → 12; a dashed ghost keeps its slot.",
    demo: CV("motionDragLift", 2.6),
  }),

  T("ui/reorder-list-drag", {
    uses: U,
    fn: mk(`var lift = MW.spring(400, 30), sh = MW.spring(320, 26), drop = MW.spring(300, 24), names = ["01  Âm thanh", "02  Phụ đề", "03  Màu sắc", "04  Xuất bản"];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var f = 1 - T(t, 2.9, 3.4); c.globalAlpha = f; MW.rr(c, 60, 24, 200, 160, 14); c.fillStyle = "#151a24"; c.fill(); var y0 = 52;
  var L = t > 0.4 ? lift.at(t - 0.4) : 0; if (t > 1.7) L *= 1 - p2o(T(t, 1.7, 1.9)); var d = 76 * p2io(T(t, 0.6, 1.6)); if (t > 1.7) d = 76 + (72 - 76) * drop.at(t - 1.7);
  var pass = function (th) { var tt = null; for (var s = 0.6; s <= Math.min(t, 1.6); s += 0.01) if (76 * p2io(T(s, 0.6, 1.6)) >= th) { tt = s; break; } return tt; };
  [2, 3].forEach(function (i) { var tp = pass(i === 2 ? 18 : 54), off = tp != null ? -36 * sh.at(t - tp) : 0; MW.rr(c, 70, y0 + 36 * i + off, 180, 30, 8); c.fillStyle = "#1b2130"; c.fill(); MW.txt(c, names[i], 82, y0 + 36 * i + off + 15.5, 8, "#c9d2ea", 700, "left"); });
  MW.rr(c, 70, y0, 180, 30, 8); c.fillStyle = "#1b2130"; c.fill(); MW.txt(c, names[0], 82, y0 + 15.5, 8, "#c9d2ea", 700, "left");
  if (t > 0.6 && t < 1.9) { var slot = d < 18 ? 1 : d < 54 ? 2 : 3; c.setLineDash([3, 3]); c.strokeStyle = "#4a5470"; MW.rr(c, 70, y0 + 36 * slot, 180, 30, 8); c.stroke(); c.setLineDash([]); }
  c.save(); c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = (4 + 14 * L) * S.k; c.translate(160, y0 + 36 + 15 + d); c.scale(1 + 0.035 * L, 1 + 0.035 * L); MW.rr(c, -90, -15, 180, 30, 8); c.fillStyle = L > 0.1 ? "#2a2350" : "#1b2130"; c.fill(); c.restore(); MW.txt(c, names[1], 82, y0 + 36 + 15.5 + d, 8, "#fff", 800, "left");
  c.globalAlpha = 1; var cx = 236, cy = y0 + 36 + 18 + d; if (t < 0.4) { var q = T(t, 0, 0.35); cx = 290 - 54 * q; cy = 196 - (196 - cy) * q; } MW.cursor(c, cx, cy, t > 0.4 && t < 1.7 ? 0.85 : 1);
});`),
    options: { loop: "s (3.5)" }, defaults: { loop: 3.5 },
    notes: "Rows 03 and 04 move up on springs (k320 c26) the moment the dragged row passes their middles; the dropped row springs into the last slot (k300 c24).",
    demo: CV("uiReorderListDrag", 3.5),
  }),

  T("ui/bottom-sheet-detents", {
    uses: U,
    fn: mk(`var Y = 8, Hh = 184, D = o.detents;
var open = function (t) { var v = D[0] + 44 / Hh * p1i(T(t, 0.4, 1.0)); if (t > 1.0) v = (D[0] + 44 / Hh) + (D[1] - D[0] - 44 / Hh) * p2o(T(t, 1, 1.76)); if (t > 2.3) v = D[1] - 28 / Hh * p1i(T(t, 2.3, 2.7)); if (t > 2.7) v = (D[1] - 28 / Hh) + (D[0] - D[1] + 28 / Hh) * p2o(T(t, 2.7, 3.46)); return v; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); phone(104, Y, 112, Hh); var v = open(t), top = Y + Hh * (1 - v); c.save(); MW.rr(c, 104, Y, 112, Hh, 16); c.clip();
  for (var i = 0; i < 5; i++) { MW.rr(c, 114, 24 + i * 26, 92, 18, 5); c.fillStyle = "#1b2130"; c.fill(); } c.fillStyle = "rgba(0,0,0," + (0.6 * Math.max(0, Math.min(1, (v - 0.25) / 0.75))).toFixed(3) + ")"; c.fillRect(104, Y, 112, Hh);
  MW.rr(c, 104, top, 112, Hh, 14); c.fillStyle = "#1e2436"; c.fill(); c.fillStyle = "#4a5470"; MW.rr(c, 150, top + 6, 20, 3, 1.5); c.fill(); MW.txt(c, o.title, 114, top + 22, 9, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; [70, 56, 76].forEach(function (w, j) { MW.rr(c, 114, top + 34 + j * 11, w, 5, 2.5); c.fill(); }); c.restore();
  D.forEach(function (d) { var y = Y + Hh * (1 - d); c.fillStyle = Math.abs(v - d) < 0.02 ? A : "#3a4466"; c.fillRect(222, y - 1, 8, 2); MW.txt(c, Math.round(d * 100) + "%", 234, y, 6, "#6c778b", 700, "left"); });
  touch(160, top + 12, (t > 0.4 && t < 1.0) || (t > 2.3 && t < 2.7));
});`),
    options: { detents: "shares of the screen ([0.25, 0.6, 1])", title: "", loop: "s (3.6)" }, defaults: { detents: [0.25, 0.6, 1], title: "Bộ lọc", loop: 3.6 },
    notes: "Released after the drag it snaps to the nearest detent in 0.76 s (power2.out); the backdrop is 0.6 × (openness − 0.25) / 0.75.",
    demo: CV("uiBottomSheetDetents", 3.6),
  }),

  T("cursor/pinch-zoom", {
    uses: U,
    fn: mk(`var K = function (keys, u) { for (var i = 1; i < keys.length; i++) if (u <= keys[i][0]) { var a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * p2io((u - a[0]) / (b[0] - a[0])); } return keys[keys.length - 1][1]; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); phone(104, 8, 112, 184); var rs = T(t, o.resetAt, o.resetAt + 0.3), u = T(t, o.start, o.start + o.duration) * (1 - rs), s = K([[0, 0.72], [0.72, 1.32], [1, 1.18]], u), r = K([[0, -3], [0.72, 2], [1, 0]], u), g = K([[0, 0], [0.72, 45], [1, 34.5]], u) * 0.5;
  c.save(); MW.rr(c, 104, 8, 112, 184, 16); c.clip(); c.translate(160, 100); c.rotate(r * Math.PI / 180); c.scale(s, s); var gr = c.createLinearGradient(-35, -53, 35, 53); gr.addColorStop(0, "#ff8a5c"); gr.addColorStop(1, "#6a4cf0"); MW.rr(c, -35, -53, 70, 106, 10); c.fillStyle = gr; c.fill();
  c.fillStyle = "rgba(255,255,255,0.85)"; c.beginPath(); c.arc(14, -22, 10, 0, 2 * Math.PI); c.fill(); c.fillStyle = "rgba(20,10,40,0.55)"; c.beginPath(); c.moveTo(-35, 53); c.lineTo(-8, 10); c.lineTo(12, 34); c.lineTo(35, 18); c.lineTo(35, 53); c.closePath(); c.fill(); c.restore();
  var on = u > 0 && u < 1 && rs === 0; touch(160 - 30 - g, 100 + 8, on || (t > o.start && rs === 0 && t < o.start + o.duration + 0.15)); touch(160 + 30 + g, 100 - 8, on || (t > o.start && rs === 0 && t < o.start + o.duration + 0.15));
});`),
    options: { start: "s (0.4)", duration: "s (0.82)", resetAt: "s (2.2)", loop: "s (2.8)" }, defaults: { start: 0.4, duration: 0.82, resetAt: 2.2, loop: 2.8 },
    notes: "Scale 0.72 → 1.32 at 72 % → 1.18 and a small turn; the fingers move apart ±45 then ease back (in a product: scale = current gap / start gap).",
    demo: CV("cursorPinchZoom", 2.8),
  }),
];
