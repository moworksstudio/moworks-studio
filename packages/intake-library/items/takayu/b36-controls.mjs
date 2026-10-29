// TakayuStudio, Selection & Controls (batch 3.6): switches, checks, likes, locks, media and tab indicators, drawn on the reference's
// 320 x 200 frame in the site's own units, with a scripted cursor where the site has one; written here from the site's ideas and
// numbers (no code of the site).
import { T } from "../../takayu/define.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 3, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "spring", "springs", "stage320"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, p2o = gsap.parseEase("power2.out"), p2i = gsap.parseEase("power2.in"), p2io = gsap.parseEase("power2.inOut"), p1i = gsap.parseEase("power1.in"), bo = gsap.parseEase("back.out(1.7)");
var mix = function (a, b, f) { return gsap.utils.interpolate(a, b, Math.max(0, Math.min(1, f))); };
var cursorAt = function (keys, t, downs) { var p = MW.path(keys, t, "power2.inOut"), d = 0; (downs || []).forEach(function (q) { if (t >= q && t < q + 0.1) d = 1; }); MW.cursor(c, p[0], p[1], d ? 0.85 : 1); };
var tabs = function (labels, X, y, col) { labels.forEach(function (l, i) { MW.txt(c, l, X[i], y, 9, typeof col === "function" ? col(i) : col, 800); }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);

export default [
  T("ui/switch-spring-squash", {
    uses: U,
    fn: mk(`var sp = MW.spring(260, 20);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var p = (t > o.onAt ? sp.at(t - o.onAt) : 0) - (t > o.offAt ? sp.at(t - o.offAt) : 0), ex = p > 1 ? (p - 1) * 80 : p < 0 ? -p * 80 : 0, side = p > 1 ? 1 : -1, cl = Math.max(0, Math.min(1, p));
  MW.rr(c, 92, 72, 136, 56, 28); c.fillStyle = mix("#2a3142", o.accent, cl); c.fill();
  var w = 44 - 0.9 * ex, h = 44 + 0.45 * ex, cx = 120 + 80 * Math.max(0, Math.min(1, p)) + (ex ? side * 0.35 * ex : 0); MW.rr(c, cx - w / 2, 100 - h / 2, w, h, Math.min(w, h) / 2); c.fillStyle = "#fff"; c.fill();
  c.strokeStyle = mix("#8f9ab3", o.accent, cl); c.lineWidth = 3; c.lineCap = "round"; c.globalAlpha = 1 - cl; c.beginPath(); c.moveTo(cx - 6, 100); c.lineTo(cx + 6, 100); c.stroke(); c.globalAlpha = cl; c.beginPath(); c.moveTo(cx - 7, 100); c.lineTo(cx - 2, 105); c.lineTo(cx + 8, 94); c.stroke(); c.globalAlpha = 1;
  MW.txt(c, "TẮT", 120, 146, 9, cl < 0.5 ? "#e8ebf3" : "#4a5470", 900); MW.txt(c, "BẬT", 200, 146, 9, cl >= 0.5 ? o.accent : "#4a5470", 900);
});`),
    options: { onAt: "s (0.3)", offAt: "s (1.6)", accent: "", loop: "s (2.8)" }, defaults: { onAt: 0.3, offAt: 1.6, accent: "#8b7bff", loop: 2.8 },
    notes: "Spring k260 c20 (about 8 % over); past either end the knob squashes: width 44 − 0.9 ex, height 44 + 0.45 ex.",
    demo: CV("uiSwitchSpringSquash", 2.8),
  }),

  T("flow/day-night-toggle", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var p = p2io(T(t, o.onAt, o.onAt + o.duration)) - p2io(T(t, o.offAt, o.offAt + o.duration)), cx = 120 + 80 * p, rot = 135 * p * Math.PI / 180;
  MW.rr(c, 52, 34, 216, 132, 18); c.fillStyle = "#151a24"; c.fill(); MW.txt(c, o.label, 72, 56, 10, "#e8ebf3", 800, "left"); MW.txt(c, p > 0.5 ? "Đang bật" : "Đang tắt", 72, 70, 7, "#6c778b", 600, "left");
  c.save(); MW.rr(c, 90, 90, 140, 60, 30); c.clip(); c.fillStyle = "#1a2244"; c.fillRect(90, 90, 140, 60); c.fillStyle = "rgba(79,166,255," + (0.55 * (1 - p)).toFixed(3) + ")"; c.fillRect(90, 90, 140, 60);
  [[150, 124, 0], [182, 112, 0.1]].forEach(function (cl) { var q = T(p, cl[2], cl[2] + 0.6); c.globalAlpha = 1 - q; c.fillStyle = "#fff"; var y = cl[1] + 26 * q; c.beginPath(); c.arc(cl[0], y, 7, 0, 2 * Math.PI); c.arc(cl[0] + 8, y - 3, 8, 0, 2 * Math.PI); c.arc(cl[0] + 17, y, 6, 0, 2 * Math.PI); c.fill(); }); c.globalAlpha = 1;
  for (var i = 0; i < 5; i++) { var s = bo(T(p, 0.35 + 0.1 * i, 0.5 + 0.1 * i)); if (s <= 0) continue; c.fillStyle = "#fff"; c.beginPath(); c.arc(104 + i * 14 + (i % 2) * 3, 102 + (i % 3) * 10, 1.6 * s, 0, 2 * Math.PI); c.fill(); }
  c.save(); c.translate(cx, 120); c.rotate(rot); var ray = 6 * (1 - T(p, 0, 0.5)); c.strokeStyle = "#ffd23d"; c.lineWidth = 2; c.lineCap = "round"; for (var k = 0; k < 8 && ray > 0.2; k++) { var a = k * Math.PI / 4; c.beginPath(); c.moveTo(18 * Math.cos(a), 18 * Math.sin(a)); c.lineTo((18 + ray) * Math.cos(a), (18 + ray) * Math.sin(a)); c.stroke(); }
  var night = T(p, 0.4, 1); c.fillStyle = mix("#ffd23d", "#e8ebf3", night); c.beginPath(); c.arc(0, 0, 15, 0, 2 * Math.PI); c.fill(); if (night > 0) { c.fillStyle = mix("#4fa6ff", "#1a2244", p); c.beginPath(); c.arc(6 + 20 * (1 - night), -4, 13, 0, 2 * Math.PI); c.fill(); } c.restore(); c.restore();
});`),
    options: { onAt: "s (0.3)", offAt: "s (1.7)", duration: "s (0.6, power2.inOut)", label: "", loop: "s (2.8)" }, defaults: { onAt: 0.3, offAt: 1.7, duration: 0.6, label: "Chế độ tối", loop: 2.8 },
    notes: "The knob rolls 80 units turning 135°; the rays shrink in the first half, the crescent slides in from 40 %, clouds sink and five stars pop.",
    demo: CV("flowDayNightToggle", 2.8),
  }),

  T("ui/liquid-stretch-switch", {
    uses: U,
    fn: mk(`var move = function (t, t0, dir) { var u = t - t0, a = 104 * p2o(T(u, 0, 0.26)), b = 104 * p2io(T(u, 0.1, 0.46)); if (u <= 0) return null; var lead = dir > 0 ? a : 104 - a, trail = dir > 0 ? b : 104 - b; return { l: Math.min(lead, trail), r: Math.max(lead, trail) + 44, w: u - 0.46 }; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var m = move(t, o.offAt, -1) || move(t, o.onAt, 1) || { l: 0, r: 44, w: -1 }, x0 = 86, wd = m.r - m.l, st = (wd - 44) / 66, h = 44 - 12 * Math.max(0, st), wob = m.w > 0 ? 0.12 * Math.exp(-9 * m.w) * Math.sin(34 * m.w) : 0, cxk = x0 + (m.l + m.r) / 2;
  MW.rr(c, 80, 72, 160, 56, 28); c.fillStyle = mix("#2a3142", o.accent, (cxk - x0 - 22) / 104); c.fill();
  var W = wd * (1 - 0.6 * wob), Hh = h * (1 + wob); MW.rr(c, cxk - W / 2, 100 - Hh / 2, W, Hh, Hh / 2); c.fillStyle = "#fff"; c.fill();
});`),
    options: { onAt: "s (0.3)", offAt: "s (1.6)", accent: "", loop: "s (2.6)" }, defaults: { onAt: 0.3, offAt: 1.6, accent: "#8b7bff", loop: 2.6 },
    notes: "The leading edge moves in 0.26 s (power2.out), the trailing edge 0.1 s later over 0.36 s, so the knob stretches; a wobble 0.12 e^(−9 t) sin 34 t on arrival.",
    demo: CV("uiLiquidStretchSwitch", 2.6),
  }),

  T("ui/task-check", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var out = T(t, o.outAt, o.outAt + 0.25), live = out < 1 ? 1 : 0, pr = t > 0.38 && t < 0.56 ? 1 - 0.12 * Math.sin(Math.PI * (t - 0.38) / 0.18) : 1, fl = T(t, 0.42, 0.52) * (1 - out);
  MW.rr(c, 60, 70, 200, 60, 12); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke();
  c.save(); c.translate(90, 100); c.scale(pr, pr); MW.rr(c, -16, -16, 32, 32, 8); c.fillStyle = mix("#151a24", o.accent, fl); c.fill(); c.strokeStyle = fl > 0.5 ? o.accent : "#4a5470"; c.lineWidth = 2; c.stroke();
  var a = p1i(T(t, 0.52, 0.62)) * (1 - out), b = p2o(T(t, 0.62, 0.8)) * (1 - out); c.strokeStyle = "#fff"; c.lineWidth = 3.5; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(-8, 0); if (a > 0) c.lineTo(-8 + 5 * a, 5 * a); if (b > 0) c.lineTo(-3 + 12 * b, 5 - 13 * b); if (a > 0) c.stroke(); c.restore();
  var dim = 1 - 0.55 * T(t, 0.8, 0.95) * (1 - out); MW.txt(c, o.title, 118, 92, 10, "#e8ebf3", 800, "left"); c.globalAlpha = dim; MW.txt(c, o.sub, 118, 108, 7, "#8f9ab3", 600, "left"); c.globalAlpha = 1;
  c.font = "800 10px Inter, sans-serif"; var tw = c.measureText(o.title).width + 6, s = tw * p2o(T(t, 0.84, 1.05)) * (1 - out); if (s > 0) { c.fillStyle = o.accent; c.fillRect(115, 91.5, s, 1.5); }
  cursorAt([[0, 300, 190], [0.3, 92, 104], [0.7, 92, 104], [1.2, 290, 170]], t, [0.38]);
});`),
    options: { title: "", sub: "", outAt: "s it resets (2.2)", accent: "", loop: "s (2.6)" }, defaults: { title: "Gửi kịch bản cho khách", sub: "Trước 17:00 hôm nay", outAt: 2.2, accent: "#8b7bff", loop: 2.6 },
    notes: "The box dips to 0.88, fills, the check draws its short stroke (power1.in) then the long one (power2.out), then the title is struck through and the line below dims.",
    demo: CV("uiTaskCheck", 2.6),
  }),

  T("ui/like-burst", {
    uses: U,
    fn: mk(`var heart = function (x, y, s) { c.beginPath(); c.moveTo(x, y + 9 * s); c.bezierCurveTo(x - 16 * s, y - 2 * s, x - 10 * s, y - 14 * s, x, y - 6 * s); c.bezierCurveTo(x + 10 * s, y - 14 * s, x + 16 * s, y - 2 * s, x, y + 9 * s); c.closePath(); };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 80, 30, 160, 140, 16); c.fillStyle = "#151a24"; c.fill(); c.fillStyle = "#2a3350"; MW.rr(c, 96, 46, 128, 64, 10); c.fill(); MW.txt(c, o.caption, 96, 124, 8, "#c9d2ea", 700, "left");
  var hx = 108, hy = 150, a = o.at, ol = 1 - T(t, a - 0.03, a + 0.07); if (ol > 0) { c.globalAlpha = ol; heart(hx, hy, 1); c.strokeStyle = "#8f9ab3"; c.lineWidth = 1.8; c.stroke(); c.globalAlpha = 1; }
  if (t >= a) { var u = t - a, s = u < 0.2 ? 0.65 + 0.49 * p2io(u / 0.2) : 1.14 - 0.14 * p2io(T(u, 0.2, 0.42)); c.globalAlpha = Math.min(1, u / 0.1); heart(hx, hy, s); c.fillStyle = o.color; c.fill(); c.globalAlpha = 1; }
  for (var i = 0; i < 8; i++) { var v = t - a - 0.08; if (v <= 0 || v > 1.46) continue; var an = i / 8 * 2 * Math.PI, R = [56, 65, 74][i % 3] * 0.45, q = p2io(Math.min(1, v / 0.56)), f = T(v, 0.56, 1.46), dx = Math.cos(an) * R * (q + (1.12 - 1) * f), dy = (Math.sin(an) * 37 * 0.45 - 18 * 0.45) * q + Math.sin(an) * 37 * 0.45 * 0.45 * f, sc = 0.3 + 0.7 * Math.min(1, v / 0.11);
    c.save(); c.translate(hx + dx, hy + dy); c.rotate((39 * i * q + 52 * i * f) * Math.PI / 180); c.globalAlpha = 1 - f; c.fillStyle = "hsl(" + (35 + 36 * i) + ",90%,65%)"; MW.rr(c, -2 * sc, -3.5 * sc, 4 * sc, 7 * sc, 1); c.fill(); c.restore(); }
  c.globalAlpha = 1; MW.txt(c, t >= a ? String(o.count + 1) : String(o.count), 124, 150.5, 8, t >= a ? o.color : "#8f9ab3", 800, "left");
  cursorAt([[0, 300, 196], [a - 0.15, hx + 2, hy + 2], [a + 0.4, hx + 2, hy + 2], [a + 1, 290, 180]], t, [a - 0.05]);
});`),
    options: { at: "s the heart fills (0.7)", color: "", count: "likes before", caption: "", loop: "s (2.8)" }, defaults: { at: 0.7, color: "#ff8ca3", count: 128, caption: "Hậu trường buổi quay", loop: 2.8 },
    notes: "The filled heart pops 0.65 → 1.14 → 1; eight particles (hues 35° + 36° each) fly out, rotate and fade by 1.46 s.",
    demo: CV("uiLikeBurst", 2.8),
  }),

  T("ui/lock-unlock", {
    uses: U,
    fn: mk(`var sp = MW.spring(200, 12);
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 70, 30, 180, 140, 16); c.fillStyle = "#151a24"; c.fill();
  var lift = 10 * p2o(T(t, 0.35, 0.55)), ang = t > 0.55 ? -0.5 * sp.at(t - 0.55) : 0; if (t > o.closeAt) { ang = -0.5 * (1 - p2i(T(t, o.closeAt, o.closeAt + 0.2))); lift = 10 * (1 - p1i(T(t, o.closeAt + 0.2, o.closeAt + 0.32))); }
  var lx = 140, ly = 92; c.save(); c.translate(lx, ly - lift); c.rotate(ang); c.strokeStyle = "#c9d2ea"; c.lineWidth = 8; c.lineCap = "butt"; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -16); c.arc(20, -16, 20, Math.PI, 2 * Math.PI); c.lineTo(40, 6); c.stroke(); c.restore();
  MW.rr(c, 124, 88, 72, 56, 10); c.fillStyle = o.accent; c.fill(); c.fillStyle = "#0b0d12"; c.beginPath(); c.arc(160, 110, 6, 0, 2 * Math.PI); c.fill(); c.fillRect(158, 112, 4, 12);
  var lb = Math.max(0, Math.min(1, (-ang) / 0.5)); c.globalAlpha = 1 - lb; MW.txt(c, o.locked, 160, 158, 9, "#8f9ab3", 900); c.globalAlpha = lb; MW.txt(c, o.open, 160, 158, 9, "#3ddc84", 900); c.globalAlpha = 1;
  var k = t - o.closeAt - 0.32; if (k > 0) { var a = Math.exp(-12 * k); c.strokeStyle = "rgba(233,235,243," + a.toFixed(3) + ")"; c.lineWidth = 2; [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(160 + s * 34, 82); c.lineTo(160 + s * 44, 74); c.stroke(); }); }
});`),
    options: { closeAt: "s (1.85)", locked: "", open: "", accent: "", loop: "s (2.6)" }, defaults: { closeAt: 1.85, locked: "ĐÃ KHOÁ", open: "ĐÃ MỞ", accent: "#8b7bff", loop: 2.6 },
    notes: "The shackle lifts 10 units, then swings on its left leg to −0.5 rad on a spring k200 c12; it closes with two click marks.",
    demo: CV("uiLockUnlock", 2.6),
  }),

  T("ui/speaker-mute", {
    uses: U,
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var cx = 140, cy = 96, pr1 = t > o.mute && t < o.mute + 0.18 ? 1 - 0.08 * Math.sin(Math.PI * (t - o.mute) / 0.18) : 1, pr2 = t > o.unmute && t < o.unmute + 0.18 ? 1 - 0.08 * Math.sin(Math.PI * (t - o.unmute) / 0.18) : 1, s = pr1 * pr2;
  c.save(); c.translate(cx, cy); c.scale(s, s); c.fillStyle = "#e8ebf3"; c.beginPath(); c.moveTo(-20, -8); c.lineTo(-10, -8); c.lineTo(2, -18); c.lineTo(2, 18); c.lineTo(-10, 8); c.lineTo(-20, 8); c.closePath(); c.fill();
  [12, 22, 32].forEach(function (r, i) { var off = p2i(T(t, o.mute + 0.1 + (2 - i) * 0.06, o.mute + 0.26 + (2 - i) * 0.06)), on = bo(T(t, o.unmute + 0.15 + i * 0.07, o.unmute + 0.4 + i * 0.07)), v = t < o.unmute ? 1 - off : on; if (v <= 0.01) return;
    c.globalAlpha = Math.min(1, v); c.strokeStyle = o.accent; c.lineWidth = 3.5; c.lineCap = "round"; c.beginPath(); c.arc(6, 0, r * (0.7 + 0.3 * v), -0.75, 0.75); c.stroke(); }); c.globalAlpha = 1;
  var sl = p2o(T(t, o.mute + 0.35, o.mute + 0.55)) * (1 - p2i(T(t, o.unmute + 0.1, o.unmute + 0.25))), pw = 1 + 0.5 * Math.sin(Math.PI * T(t, o.mute + 0.45, o.mute + 0.7));
  if (sl > 0) { var x1 = -24 + 60 * sl, y1 = -24 + 48 * sl; c.lineCap = "round"; c.strokeStyle = "#0b0d12"; c.lineWidth = 9 * pw; c.beginPath(); c.moveTo(-24, -24); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = "#ff5d8f"; c.lineWidth = 4 * pw; c.beginPath(); c.moveTo(-24, -24); c.lineTo(x1, y1); c.stroke(); }
  c.restore(); var muted = t >= o.mute + 0.4 && t < o.unmute + 0.15; MW.txt(c, muted ? o.off : o.on, cx, 146, 9, muted ? "#ff5d8f" : "#8f9ab3", 900);
  cursorAt([[0, 300, 196], [o.mute - 0.15, cx + 4, cy + 6], [o.mute + 0.3, cx + 4, cy + 6], [o.unmute - 0.2, cx + 4, cy + 6], [o.unmute + 0.4, cx + 4, cy + 6], [o.unmute + 0.9, 290, 180]], t, [o.mute - 0.02, o.unmute - 0.02]);
});`),
    options: { mute: "s (0.4)", unmute: "s (1.85)", on: "", off: "", accent: "sound waves", loop: "s (2.9)" }, defaults: { mute: 0.4, unmute: 1.85, on: "CÓ TIẾNG", off: "TẮT TIẾNG", accent: "#8b7bff", loop: 2.9 },
    notes: "Waves vanish outer first, 0.06 s apart; the slash draws over a background-coloured outline; unmuting brings the waves back inner first with back.out.",
    demo: CV("uiSpeakerMute", 2.9),
  }),

  T("shape/play-pause-morph", {
    uses: U,
    fn: mk(`var P = [[[132, 66], [160, 80], [160, 116], [132, 130]], [[160, 80], [188, 98], [188, 98], [160, 116]]], Q = [[[128, 66], [146, 66], [146, 130], [128, 130]], [[158, 66], [176, 66], [176, 130], [158, 130]]];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var p = p2io(T(t, o.at[0], o.at[0] + o.duration)) - p2io(T(t, o.at[1], o.at[1] + o.duration));
  c.fillStyle = "#151a24"; c.beginPath(); c.arc(156, 98, 54, 0, 2 * Math.PI); c.fill(); c.strokeStyle = o.accent; c.lineWidth = 2; c.stroke();
  c.fillStyle = "#e8ebf3"; for (var k = 0; k < 2; k++) { c.beginPath(); for (var i = 0; i < 4; i++) { var x = P[k][i][0] + (Q[k][i][0] - P[k][i][0]) * p, y = P[k][i][1] + (Q[k][i][1] - P[k][i][1]) * p; if (!i) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath(); c.fill(); }
  MW.txt(c, p > 0.5 ? o.pause : o.play, 156, 172, 9, "#8f9ab3", 900);
  cursorAt([[0, 300, 196], [o.at[0] - 0.12, 170, 110], [o.at[0] + 0.4, 170, 110], [o.at[1] - 0.2, 170, 110], [o.at[1] + 0.4, 170, 110], [o.at[1] + 0.9, 290, 180]], t, [o.at[0] - 0.05, o.at[1] - 0.05]);
});`),
    options: { at: "[s to pause, s back to play] ([0.4, 1.75])", duration: "s (0.35, power2.inOut)", play: "", pause: "", accent: "", loop: "s (2.6)" }, defaults: { at: [0.4, 1.75], duration: 0.35, play: "PHÁT", pause: "TẠM DỪNG", accent: "#8b7bff", loop: 2.6 },
    notes: "The triangle is two quads whose vertices each move to a partner on the two bars.",
    demo: CV("shapePlayPauseMorph", 2.6),
  }),

  T("ui/underline-stretch", {
    uses: U,
    fn: mk(`var X = [88, 160, 232], at0 = function (t) { var pos = [X[o.moves[0][1]] - 22, X[o.moves[0][1]] + 22], tgt = null; o.moves.forEach(function (m) { var u = t - m[0]; if (u < 0) return; var a = X[m[1]], b = X[m[2]], dir = b > a ? 1 : -1, lead = p2o(T(u, 0, 0.26)), trail = p2io(T(u, 0.09, 0.43)), L0 = a - 22, R0 = a + 22, L1 = b - 22, R1 = b + 22;
  pos = dir > 0 ? [L0 + (L1 - L0) * trail, R0 + (R1 - R0) * lead] : [L0 + (L1 - L0) * lead, R0 + (R1 - R0) * trail]; if (u < 0.43) tgt = b; }); return { p: pos, tgt: tgt }; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 40, 68, 240, 64, 14); c.fillStyle = "#151a24"; c.fill(); var s = at0(t), mid = (s.p[0] + s.p[1]) / 2;
  if (s.tgt != null) { c.strokeStyle = "rgba(139,123,255,0.25)"; c.lineWidth = 1; MW.rr(c, s.tgt - 30, 82, 60, 30, 8); c.stroke(); }
  tabs(o.labels, X, 97, function (i) { return mix("#6c778b", "#ffffff", 1 - Math.min(1, Math.abs(mid - X[i]) / 50)); }); MW.rr(c, s.p[0], 114, s.p[1] - s.p[0], 3, 1.5); c.fillStyle = o.accent; c.fill();
});`),
    options: { moves: "[[s, from tab, to tab], ...]", labels: "", accent: "", loop: "s (2.8)" }, defaults: { moves: [[0.3, 0, 1], [1.15, 1, 2], [2, 2, 0]], labels: ["Tất cả", "Phim", "Ảnh"], accent: "#8b7bff", loop: 2.8 },
    notes: "The edge on the travel side leads (0.26 s, power2.out); the other follows 0.09 s later (0.34 s, power2.inOut), so the line stretches and settles.",
    demo: CV("uiUnderlineStretch", 2.8),
  }),

  T("ui/pill-tab-indicator", {
    uses: U,
    fn: mk(`var X = [88, 160, 232], P = MW.springTo(240, 24, o.targets.map(function (q) { return [q[0], X[q[1]]]; }));
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 40, 80, 240, 40, 20); c.fillStyle = "#151a24"; c.fill(); var x = P(t); tabs(o.labels, X, 100.5, "#c9d2ea");
  c.save(); MW.rr(c, x - 36, 84, 72, 32, 16); c.fillStyle = o.accent; c.fill(); c.clip(); tabs(o.labels, X, 100.5, "#0b0d12"); c.restore();
});`),
    options: { targets: "[[s, tab], ...] springs k240 c24", labels: "", accent: "", loop: "s (2.8)" }, defaults: { targets: [[0, 0], [0.3, 2], [1.2, 1], [2, 0]], labels: ["Tất cả", "Phim", "Ảnh"], accent: "#8b7bff", loop: 2.8 },
    notes: "The labels never move; drawn twice, they flip colour exactly at the pill's edges.",
    demo: CV("uiPillTabIndicator", 2.8),
  }),

  T("ui/radial-menu", {
    uses: U,
    fn: mk(`var plus = MW.spring(260, 20), bub = MW.spring(240, 16), bx = 160, by = 160, A = [-150, -90, -30], ic = ["#ff8a5c", "#3dd6f5", "#3ddc84"];
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 110, 10, 100, 184, 14); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1.5; c.stroke(); c.fillStyle = "#1b2130"; for (var r = 0; r < 4; r++) { MW.rr(c, 118, 28 + r * 26, 84, 20, 5); c.fill(); }
  var pr = t > o.tap ? plus.at(t - o.tap) : 0; if (t > o.closeAt) pr = 1 - p2i(T(t, o.closeAt, o.closeAt + 0.22));
  for (var i = 0; i < 3; i++) { var st = o.tap + 0.06 * i, p = t > st ? bub.at(t - st) : 0, ci = o.closeAt + 0.05 * (2 - i); if (t > ci) p *= 1 - p2i(T(t, ci, ci + 0.22)); if (p <= 0.01) continue;
    var a = A[i] * Math.PI / 180, x = bx + 72 * p * Math.cos(a) * 0.62, y = by + 72 * p * Math.sin(a) * 0.62, rr = 15 * Math.min(1, 1.3 * p) * 0.62;
    if (p < 0.5) { c.strokeStyle = o.accent; c.lineWidth = rr * (1 - p * 2) * 1.2; c.beginPath(); c.moveTo(bx, by); c.lineTo(x, y); c.stroke(); }
    c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(x, y, rr, 0, 2 * Math.PI); c.fill(); var s = T(p, 0.6, 1); c.fillStyle = ic[i]; c.beginPath(); c.arc(x, y, 4.5 * s, 0, 2 * Math.PI); c.fill(); }
  c.fillStyle = o.accent; c.beginPath(); c.arc(bx, by, 13, 0, 2 * Math.PI); c.fill(); c.save(); c.translate(bx, by); c.rotate(Math.PI / 4 * pr); c.strokeStyle = "#fff"; c.lineWidth = 2.6; c.lineCap = "round"; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.moveTo(0, -5); c.lineTo(0, 5); c.stroke(); c.restore();
  cursorAt([[0, 280, 200], [o.tap - 0.15, bx + 3, by + 4], [o.tap + 0.4, bx + 3, by + 4], [o.closeAt - 0.25, bx + 3, by + 4], [o.closeAt + 0.4, bx + 3, by + 4], [o.closeAt + 0.9, 280, 190]], t, [o.tap - 0.04, o.closeAt - 0.04]);
});`),
    options: { tap: "s (0.38)", closeAt: "s (2.0)", accent: "", loop: "s (2.8)" }, defaults: { tap: 0.38, closeAt: 2, accent: "#8b7bff", loop: 2.8 },
    notes: "Three bubbles fan out to −150, −90, −30° on springs k240 c16, 0.06 s apart, joined to the button by a liquid neck while close; they close in reverse order.",
    demo: CV("uiRadialMenu", 2.8),
  }),

  T("ui/hopping-dot-indicator", {
    uses: U,
    fn: mk(`var X = [88, 160, 232], st = function (t) { var x = X[o.moves[0][1]], y = 0, sx = 1, sy = 1, ghost = null; o.moves.forEach(function (m) { var u = t - m[0]; if (u < 0) return; var a = X[m[1]], b = X[m[2]], tabsN = Math.abs(m[2] - m[1]), ap = 26 + 8 * (tabsN - 1);
  if (u < 0.1) { x = a; sy = 1 - 0.35 * Math.sin(Math.PI * u / 0.1); } else if (u < 0.52) { var v = (u - 0.1) / 0.42; x = a + (b - a) * v; y = -ap * 4 * v * (1 - v); sy = 1 + 0.18 * Math.abs(1 - 2 * v); } else { x = b; var w = u - 0.52, d = 0.35 * Math.exp(-14 * w) * Math.sin(22 * w); sy = 1 - Math.max(0, d); }
  if (u > 0.1 && u < 0.9) ghost = { a: a, b: b, ap: ap, f: u < 0.6 ? 1 : 1 - (u - 0.6) / 0.3 }; }); sx = 1 / sy; return { x: x, y: y, sx: sx, sy: sy, g: ghost }; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 40, 64, 240, 72, 16); c.fillStyle = "#151a24"; c.fill(); var s = st(t); tabs(o.labels, X, 92, function (i) { return Math.abs(s.x - X[i]) < 20 ? "#ffffff" : "#6c778b"; });
  if (s.g) { c.save(); c.setLineDash([2, 3]); c.strokeStyle = "rgba(139,123,255," + (0.6 * s.g.f).toFixed(3) + ")"; c.lineWidth = 1; c.beginPath(); for (var k = 0; k <= 20; k++) { var v = k / 20, x = s.g.a + (s.g.b - s.g.a) * v, y = 118 - s.g.ap * 4 * v * (1 - v); if (!k) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); c.restore(); }
  c.save(); c.translate(s.x, 124 + s.y); c.scale(s.sx, s.sy); c.fillStyle = o.accent; c.beginPath(); c.arc(0, -6, 6, 0, 2 * Math.PI); c.fill(); c.restore();
});`),
    options: { moves: "[[s, from, to], ...]", labels: "", accent: "", loop: "s (2.8)" }, defaults: { moves: [[0.3, 0, 1], [1.15, 1, 2], [2, 2, 0]], labels: ["Tất cả", "Phim", "Ảnh"], accent: "#8b7bff", loop: 2.8 },
    notes: "Take-off squash 0.1 s, a 0.42 s parabolic hop (apex 26 + 8 per extra tab), a damped landing squash, and a dashed arc ghost that fades.",
    demo: CV("uiHoppingDotIndicator", 2.8),
  }),

  T("ui/liquid-tab-blob", {
    uses: U,
    fn: mk(`var X = [88, 160, 232], st = function (t) { var L = X[o.moves[0][1]], R = L, w = -1; o.moves.forEach(function (m) { var u = t - m[0]; if (u < 0) return; var a = X[m[1]], b = X[m[2]]; L = a + (b - a) * p2o(T(u, 0, 0.3)); R = a + (b - a) * p2io(T(u, 0.12, 0.5)); w = u - 0.5; }); return { lead: L, trail: R, w: w }; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); MW.rr(c, 40, 72, 240, 56, 28); c.fillStyle = "#151a24"; c.fill(); var s = st(t), g = Math.abs(s.lead - s.trail) / 72, rl = 22 - 5 * g, rt = 22 - 9 * g, wob = s.w > 0 ? 0.14 * Math.exp(-8 * s.w) * Math.sin(30 * s.w) : 0;
  c.save(); c.fillStyle = o.accent; c.translate(0, 100); c.beginPath(); c.ellipse(s.lead, 0, rl * (1 + wob), rl * (1 - wob), 0, 0, 2 * Math.PI); c.fill(); c.beginPath(); c.arc(s.trail, 0, Math.max(4, rt), 0, 2 * Math.PI); c.fill();
  var nk = Math.max(0, Math.min(rl, rt) * 1.4 - g * 18); if (nk > 1) c.fillRect(Math.min(s.lead, s.trail), -nk / 2, Math.abs(s.lead - s.trail), nk); c.restore();
  tabs(o.labels, X, 100.5, function (i) { return Math.min(Math.abs(X[i] - s.lead), Math.abs(X[i] - s.trail)) < 26 ? "#0b0d12" : "#c9d2ea"; });
});`),
    options: { moves: "[[s, from, to], ...]", labels: "", accent: "", loop: "s (2.8)" }, defaults: { moves: [[0.3, 0, 1], [1.15, 1, 2], [2, 2, 0]], labels: ["Tất cả", "Phim", "Ảnh"], accent: "#8b7bff", loop: 2.8 },
    notes: "The lead drop moves in 0.3 s (power2.out), the trailing drop 0.12 s later in 0.38 s; both shrink with the gap; a wobble 0.14 e^(−8 t) sin 30 t on arrival.",
    demo: CV("uiLiquidTabBlob", 2.8),
  }),

  T("ui/segment-tint", {
    uses: U,
    fn: mk(`var X = [76, 132, 188, 244], H = [[30, 42, 26, 50, 38, 56, 44], [22, 30, 40, 36, 48, 52, 60], [50, 34, 46, 28, 40, 30, 36], [18, 26, 34, 44, 50, 58, 66]];
var W = function (t) { var w = [0, 0, 0, 0]; w[o.changes[0][1]] = 1; o.changes.forEach(function (m) { var u = p2o(T(t, m[0], m[0] + o.duration)); if (u <= 0) return; w = [0, 0, 0, 0]; w[m[1]] = 1 - u; w[m[2]] = u; }); return w; };
return MW.drive(tl, at, o.loop, function (t) {
  S.clear(); var w = W(t); MW.rr(c, 44, 40, 232, 48, 12); c.fillStyle = "#151a24"; c.fill();
  X.forEach(function (x, i) { var a = w[i]; if (a > 0.01) { c.globalAlpha = a; MW.rr(c, x - 24, 46, 48, 36, 9); c.fillStyle = "rgba(139,123,255,0.22)"; c.fill(); c.strokeStyle = o.accent; c.lineWidth = 1.5; c.stroke(); c.fillStyle = o.accent; c.beginPath(); c.arc(x, 76, 1.5, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1; } MW.txt(c, o.labels[i], x, 63, 8, mix("#8f9ab3", o.accent, a), 800); });
  for (var b = 0; b < 7; b++) { var h = 0; w.forEach(function (a, i) { h += a * H[i][b]; }); MW.rr(c, 72 + b * 26, 166 - h, 16, h, 3); c.fillStyle = b === 6 ? o.accent : "#2f3a5c"; c.fill(); }
});`),
    options: { changes: "[[s, from, to], ...]", duration: "s per change (0.22, power2.out): a crossfade, nothing moves", labels: "", accent: "", loop: "s (2.8)" }, defaults: { changes: [[0.3, 0, 2], [1.15, 2, 1], [2, 1, 0]], duration: 0.22, labels: ["Ngày", "Tuần", "Tháng", "Năm"], accent: "#8b7bff", loop: 2.8 },
    demo: CV("uiSegmentTint", 2.8),
  }),
];
