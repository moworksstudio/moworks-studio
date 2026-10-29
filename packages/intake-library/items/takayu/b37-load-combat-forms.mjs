// TakayuStudio, Loading & Progress, Combat & Hit FX and Forms & State (batch 3.7): loaders, spinners, progress and skeletons; damage
// numbers, combos, criticals, reticles, guard breaks, dodges, parries and ailments; floating labels, checkboxes, switches, validation,
// button and upload states and password strength, all drawn on the reference's 320 x 200 frame in the site's units; written here from
// the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration) => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, {});`, duration });
const U = ["drive", "draw", "rand", "spring", "springs", "stage320", "eases"];
const CP = `var S = MW.stage320(el), c = S.ctx, T = function (t, a, b) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, oc = function (u) { return 1 - Math.pow(1 - u, 3); }, iq = function (u) { return u * u; };
var p2io = gsap.parseEase("power2.inOut"), po = gsap.parseEase("power2.out"), pi2 = gsap.parseEase("power2.in"), bo = gsap.parseEase("back.out(1.7)"), A = "#8b7bff", G = "#3ddc84";
var hs = function (t, a, d) { var u = (t - a) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }, fr = function (x) { return x - Math.floor(x); };
var shake = function (t, a, d, amp, seed) { var u = (t - a) / d; if (u <= 0 || u >= 1) return 0; var r = MW.rand(seed + Math.floor(t * 60)); return (r() * 2 - 1) * amp * (1 - u); };
var mix = function (a, b, u) { u = Math.max(0, Math.min(1, u)); var out = []; for (var i = 0; i < 3; i++) { var x = parseInt(a.substr(1 + 2 * i, 2), 16), y = parseInt(b.substr(1 + 2 * i, 2), 16); out.push(Math.round(x + (y - x) * u)); } return "rgb(" + out.join(",") + ")"; };
var sp = function (k, d) { var s = MW.spring(k, d); return function (t) { return t <= 0 ? 0 : s.at(t); }; };
var card = function (x, y, w, h, r) { MW.rr(c, x, y, w, h, r || 12); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke(); };
var bar = function (x, y, w, h, p, col) { MW.rr(c, x, y, w, h, h / 2); c.fillStyle = "#262c3a"; c.fill(); if (p > 0) { MW.rr(c, x, y, Math.max(h, w * Math.min(1, p)), h, h / 2); c.fillStyle = col; c.fill(); } };
var line = function (pts, u, col, w) { if (u <= 0) return; var L = 0, sg = []; for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sg.push(l); L += l; } var left = L * Math.min(1, u); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) { if (left >= sg[i - 1]) { c.lineTo(pts[i][0], pts[i][1]); left -= sg[i - 1]; } else { var q = left / sg[i - 1]; c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * q, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * q); break; } } c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(); };
var tickAt = function (x, y, s, u, col, w) { line([[x - 6 * s, y], [x - 2 * s, y + 4 * s], [x + 6 * s, y - 5 * s]], u, col, w || 2.5 * s); };
var burst = function (x, y, n, R, u, col) { if (u <= 0 || u >= 1) return; c.save(); c.globalAlpha *= 1 - u * u; c.fillStyle = col; for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n + 0.4, d = R * oc(u); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * (1 - 0.5 * u), 0, 2 * Math.PI); c.fill(); } c.restore(); };
var num = function (s, x, y, size, col, sc, a) { if (a <= 0) return; c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(sc, sc); c.font = "900 " + size + "px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineWidth = size * 0.2; c.strokeStyle = "#0b0d12"; c.strokeText(s, 0, 0); c.fillStyle = col; c.fillText(s, 0, 0); c.restore(); };
var dummy = function (x, y, w, h, col, flash, sx, sy) { c.save(); c.translate(x, y + h / 2); c.scale(sx || 1, sy || 1); MW.rr(c, -w / 2, -h, w, h, 7); c.fillStyle = col; c.fill(); if (flash > 0) { c.save(); c.globalAlpha *= flash; c.fillStyle = "#f4f6ff"; c.fill(); c.restore(); }
  c.fillStyle = "#0b0d12"; c.beginPath(); c.arc(-w * 0.18, -h * 0.62, 2.2, 0, 2 * Math.PI); c.fill(); c.beginPath(); c.arc(w * 0.18, -h * 0.62, 2.2, 0, 2 * Math.PI); c.fill(); c.restore(); };
var cur = function (keys, t, presses) { var p = MW.path(keys, t, "power2.inOut"), d = false; presses.forEach(function (q) { if (t >= q && t < q + 0.1) d = true; }); MW.cursor(c, p[0], p[1], d ? 0.86 : 1); };
var skel = function (B, t, period, band, light, a) { if (a <= 0) return; var bx = B.x0 - band + (B.x1 - B.x0 + 2 * band) * fr(t / period); B.list.forEach(function (b) { c.save(); c.globalAlpha *= a; c.beginPath(); if (b[0] === "c") c.arc(b[1], b[2], b[3], 0, 2 * Math.PI); else MW.rr(c, b[1], b[2], b[3], b[4], b[5] || 3);
  c.fillStyle = "#262c3a"; c.fill(); c.clip(); var g = c.createLinearGradient(bx - band / 2, 0, bx + band / 2, 20); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255," + light + ")"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(B.x0 - band, 0, B.x1 - B.x0 + 2 * band, 200); c.restore(); }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
// an item drawn on the 320 x 200 frame; its demo calls it with the defaults over one loop
const K = (id, d) => T(id, { uses: U, ...d, demo: CV(id.replace(/[/-]([a-z0-9])/g, (m, ch) => ch.toUpperCase()), d.defaults.loop) });

export default [
  K("ui/bouncing-dots", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(70, 46, 180, 114, 16); MW.txt(c, o.label, 160, 68, 9, "#c9d2ea", 700);
  for (var i = 0; i < 3; i++) { var x = 160 + (i - 1) * o.gap, g = 140, p = fr((t - i * o.each) / o.cycle), h = 0, sy = 1;
    if (p < 0.5) { var u = p / 0.5; h = o.apex * 4 * u * (1 - u); sy = 1 + (u < 0.5 ? 0.14 * (1 - 2 * u) : 0.08 * (2 * u - 1)); } else if (p < 0.62) sy = 1 + o.squash * Math.sin(Math.PI * (p - 0.5) / 0.12);
    var sh = Math.max(0.15, 1 - h / 80); c.save(); c.globalAlpha = 0.45 * sh; c.fillStyle = "#05060a"; c.beginPath(); c.ellipse(x, g + 1.5, o.r * 1.1 * sh, 2.4 * sh, 0, 0, 2 * Math.PI); c.fill(); c.restore();
    c.save(); c.translate(x, g - h); c.scale(1 / sy, sy); c.fillStyle = i === 1 ? "#a99bff" : A; c.beginPath(); c.arc(0, -o.r, o.r, 0, 2 * Math.PI); c.fill(); c.restore(); } });`),
    options: { cycle: "s (0.7)", each: "s later per dot (0.12)", apex: "px (34)", squash: "on landing (−0.28)", r: "px (9)", gap: "px (36)", label: "", loop: "s (2.8)" },
    defaults: { cycle: 0.7, each: 0.12, apex: 34, squash: -0.28, r: 9, gap: 36, label: "Đang chuẩn bị bản dựng", loop: 2.8 },
    notes: "A parabolic hop in the first half of the cycle with a small stretch, a squash on landing and a ground shadow that shrinks with height.",
  }),

  K("ui/comet-spinner", {
    fn: mk(`var R = o.radius; return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(100, 40, 120, 120, 22); c.strokeStyle = "#262c3a"; c.lineWidth = o.stroke; c.beginPath(); c.arc(160, 100, R, 0, 2 * Math.PI); c.stroke();
  var h = -Math.PI / 2 + 2 * Math.PI * t / o.period, L = o.arc * Math.PI / 180, N = 64; c.lineCap = "butt"; c.strokeStyle = A;
  for (var i = 0; i < N; i++) { c.globalAlpha = Math.pow(1 - i / N, 1.6); c.beginPath(); c.arc(160, 100, R, h - L * (i + 1) / N, h - L * i / N + 0.004); c.stroke(); }
  c.globalAlpha = 1; c.fillStyle = "#d9d2ff"; c.beginPath(); c.arc(160 + R * Math.cos(h), 100 + R * Math.sin(h), 3.5, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.label, 160, 100.5, 7, "#8f9ab3", 800); });`),
    options: { period: "s a turn (1.4), linear", arc: "degrees (288)", radius: "px (40)", stroke: "px (7)", label: "", loop: "s (2.8)" }, defaults: { period: 1.4, arc: 288, radius: 40, stroke: 7, label: "ĐANG TẢI", loop: 2.8 },
    notes: "The tail's opacity falls from the head as (1 − s)^1.6.",
  }),

  K("ui/progress-to-success", {
    fn: mk(`var Kp = o.steps.map(function (s) { return [s[0], s[1], 0]; });
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - pi2(T(t, o.outAt, o.outAt + 0.25)); c.globalAlpha = f; card(40, 40, 240, 124, 14); MW.txt(c, o.title, 60, 62, 9, "#e8ebf3", 800, "left");
  var v = MW.path(Kp, t, "power2.inOut")[0], g = T(t, 1.65, 1.8), x0 = 60, w = 200; bar(x0, 95, w, 10, v / 100, mix(A, G, g));
  var hx = Math.max(x0 + 12, Math.min(x0 + w - 12, x0 + w * v / 100)); MW.txt(c, Math.round(v) + "%", hx, 84, 8, mix("#c9d2ea", G, g), 900);
  var pp = bo(T(t, 1.8, 2.05)); if (pp > 0) { c.save(); c.translate(160, 136); c.scale(pp, pp); c.fillStyle = G; c.beginPath(); c.arc(0, 0, 15, 0, 2 * Math.PI); c.fill(); c.restore(); tickAt(160, 136, 1.2, po(T(t, 1.92, 2.15)), "#0b0d12", 3); } c.globalAlpha = 1; });`),
    options: { steps: "[[s, %], ...] power2.inOut per leg", title: "", outAt: "s (2.45, 0.25 s power2.in)", loop: "s (2.9)" },
    defaults: { steps: [[0, 0], [0.2, 0], [0.6, 34], [0.85, 42], [1.3, 82], [1.6, 100]], title: "Đang tải lên ảnh bìa", outAt: 2.45, loop: 2.9 },
    notes: "The number rides the bar's head; at 100 % bar and number turn green, a disc pops (back.out) and a tick draws.",
  }),

  K("ui/skeleton-shimmer-resolve", {
    fn: mk(`var X = 70, Y = 34, B = { x0: X, x1: X + 180, list: [["c", X + 26, Y + 26, 14], ["r", X + 48, Y + 18, 90, 8], ["r", X + 48, Y + 32, 56, 6], ["r", X + 14, Y + 52, 152, 44, 6], ["r", X + 14, Y + 104, 140, 6], ["r", X + 14, Y + 116, 96, 6]] };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(X, Y, 180, 132); var u = po(T(t, o.resolveAt, o.resolveAt + 0.25)) * (1 - T(t, o.backAt, o.backAt + 0.2));
  skel(B, t, o.period, o.band, 0.16, 1 - u); if (u <= 0) return; c.save(); c.globalAlpha = u;
  c.fillStyle = A; c.beginPath(); c.arc(X + 26, Y + 26, 14, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.name.charAt(0), X + 26, Y + 26.5, 12, "#fff", 900);
  MW.txt(c, o.name, X + 48, Y + 21, 9, "#e8ebf3", 800, "left"); MW.txt(c, o.time, X + 48, Y + 35, 7, "#8f9ab3", 600, "left");
  var g = c.createLinearGradient(0, Y + 52, 0, Y + 96); g.addColorStop(0, "#ffb18f"); g.addColorStop(1, "#6a4cf0"); MW.rr(c, X + 14, Y + 52, 152, 44, 6); c.fillStyle = g; c.fill(); c.fillStyle = "#fff3c4"; c.beginPath(); c.arc(X + 132, Y + 66, 7, 0, 2 * Math.PI); c.fill();
  MW.txt(c, o.lines[0], X + 14, Y + 107, 7, "#c9d2ea", 600, "left"); MW.txt(c, o.lines[1], X + 14, Y + 119, 7, "#8f9ab3", 600, "left"); c.restore(); });`),
    options: { period: "s a shimmer pass (0.9, linear)", band: "px (80)", resolveAt: "s the content fades in (1.85, 0.25 s)", backAt: "s back to skeleton (2.55)", name: "", time: "", lines: "two text lines", loop: "s (2.9)" },
    defaults: { period: 0.9, band: 80, resolveAt: 1.85, backAt: 2.55, name: "Minh Anh", time: "3 phút trước", lines: ["Bộ ảnh mới đã sẵn sàng.", "Xem ngay trong thư viện."], loop: 2.9 },
    notes: "One shared highlight band clipped to every skeleton box.",
  }),

  K("ui/typing-dots-glow", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); MW.rr(c, 100, 8, 120, 184, 18); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#2a3142"; c.lineWidth = 2; c.stroke();
  c.font = "600 7px Inter, sans-serif"; var w = c.measureText(o.sent).width + 16; MW.rr(c, 208 - w, 34, w, 20, 10); c.fillStyle = A; c.fill(); MW.txt(c, o.sent, 208 - w / 2, 44.5, 7, "#fff", 600);
  MW.rr(c, 112, 70, 82, 40, 18); c.fillStyle = "#262c3a"; c.fill(); c.beginPath(); c.arc(112, 112, 4, 0, 2 * Math.PI); c.fill();
  for (var i = 0; i < 3; i++) { var p = fr((t - i * o.offset * o.cycle) / o.cycle), k = p < 0.55 ? Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * p / 0.55), 1.5) : 0; c.fillStyle = mix("#5a6378", "#e8ebf3", k); c.beginPath(); c.arc(153 + (i - 1) * 19, 90 - o.lift * k, 5, 0, 2 * Math.PI); c.fill(); }
  MW.rr(c, 110, 164, 100, 18, 9); c.fillStyle = "#1b2130"; c.fill(); MW.txt(c, o.input, 120, 173.5, 6, "#5a6378", 600, "left"); });`),
    options: { cycle: "s (1.4)", offset: "of a cycle per dot (0.15)", lift: "px (2)", sent: "the outgoing message", input: "placeholder", loop: "s (2.8)" },
    defaults: { cycle: 1.4, offset: 0.15, lift: 2, sent: "Tối nay đi không?", input: "Nhắn tin…", loop: 2.8 },
    notes: "Each dot glows and lifts for the first 55 % of its cycle with k = (0.5 − 0.5 cos(2π p / 0.55))^1.5.",
  }),

  K("data/equalizer-bars", {
    fn: mk(`var Hh = function (i, t) { var L = o.loop, a = 0.5 + 0.5 * Math.sin(2 * Math.PI * (2 + i % 3) * t / L + 1.7 * i), b = 0.5 + 0.5 * Math.sin(2 * Math.PI * (1 + (2 * i) % 4) * t / L + 0.9 * i); return 8 + 72 * (0.6 * a + 0.4 * b) * (0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / 7)); };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(80, 22, 160, 156, 16); MW.txt(c, o.title, 96, 40, 7, "#8f9ab3", 700, "left"); MW.txt(c, o.song, 96, 52, 9, "#e8ebf3", 800, "left");
  for (var i = 0; i < 7; i++) { var x = 160 + (i - 3) * 18 - 5, h = Hh(i, t), pk = 0; for (var d = 0; d <= 0.6; d += 1 / 60) pk = Math.max(pk, Hh(i, t - d) - o.fall * d * d);
    MW.rr(c, x, 162 - h, 10, h, 3); c.fillStyle = A; c.fill(); c.fillStyle = "#e8ebf3"; c.fillRect(x, 162 - pk - 6, 10, 2); } });`),
    options: { fall: "px a second² the peak caps fall (260)", title: "", song: "", loop: "s (2.8): the bar waves repeat over it" }, defaults: { fall: 260, title: "ĐANG PHÁT", song: "Nhịp đêm · Moworks", loop: 2.8 },
    notes: "Bar i: 8 + 72 (0.6 a + 0.4 b)(0.55 + 0.45 sin(π (i + 0.5) / 7)) with two sines of whole cycles per loop, so it loops seamlessly; the cap is the max of h(t − d) − 260 d² over the last 0.6 s.",
  }),

  K("ui/orbit-dots-spinner", {
    fn: mk(`var OP = [1, 0.72, 0.5, 0.34, 0.2, 0.12], RD = [6.5, 5.6, 4.9, 4.3, 3.7, 3.2];
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(100, 40, 120, 120, 22); c.strokeStyle = "#2a3142"; c.lineWidth = 1.5; c.beginPath(); c.arc(160, 100, o.radius, 0, 2 * Math.PI); c.stroke();
  var h = -Math.PI / 2 + 2 * Math.PI * t / o.period; c.fillStyle = A; for (var j = 5; j >= 0; j--) { var a = h - j * o.gap * Math.PI / 180; c.globalAlpha = OP[j]; c.beginPath(); c.arc(160 + o.radius * Math.cos(a), 100 + o.radius * Math.sin(a), RD[j], 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1; });`),
    options: { period: "s a turn (1.4), linear, clockwise from 12 o'clock", gap: "degrees between dots (20)", radius: "px (42)", loop: "s (2.8)" }, defaults: { period: 1.4, gap: 20, radius: 42, loop: 2.8 },
  }),

  K("ui/indeterminate-bar", {
    fn: mk(`var x0 = 50, w = 220; return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(36, 64, 248, 72, 14); MW.txt(c, o.title, x0, 88, 9, "#e8ebf3", 800, "left"); MW.txt(c, o.sub, x0 + w, 88, 7, "#8f9ab3", 600, "right");
  var p = fr(t / o.period), hd = p2io(Math.min(1, 1.4 * p)), tb = p2io(Math.max(0, Math.min(1, 1.4 * p - o.lag))); c.save(); MW.rr(c, x0, 108, w, 8, 4); c.fillStyle = "#262c3a"; c.fill(); c.clip();
  var a = x0 + w * tb, b = x0 + w * hd + 6; if (b - a > 0.5) { MW.rr(c, a, 108, b - a, 8, 4); c.fillStyle = A; c.fill(); } c.restore(); });`),
    options: { period: "s (1.8)", lag: "of the cycle the tail trails (0.4)", title: "", sub: "", loop: "s (3.6)" }, defaults: { period: 1.8, lag: 0.4, title: "Đang đồng bộ thư viện", sub: "Vui lòng chờ", loop: 3.6 },
    notes: "head = power2.inOut(clamp(1.4 p)), tail = power2.inOut(clamp(1.4 p − 0.4)); the bar spans tail → head, so it stretches and shrinks.",
  }),

  K("ui/pulse-rings", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); c.strokeStyle = o.color; c.lineWidth = 3; for (var j = 0; j < 2; j++) { var p = fr(t / o.period + j / 2); c.globalAlpha = 1 - p; c.beginPath(); c.arc(160, 88, o.from + (o.to - o.from) * p, 0, 2 * Math.PI); c.stroke(); } c.globalAlpha = 1;
  c.fillStyle = o.color; c.beginPath(); c.arc(160, 88, 16, 0, 2 * Math.PI); c.fill(); c.font = "900 9px Inter, sans-serif"; var w = c.measureText(o.label).width + 28; MW.rr(c, 160 - w / 2, 158, w, 22, 11); c.fillStyle = "#1b2130"; c.fill();
  c.fillStyle = o.color; c.beginPath(); c.arc(160 - w / 2 + 11, 169, 3.5, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.label, 160 + 6, 169.5, 9, "#e8ebf3", 900); });`),
    options: { period: "s (1.6), two rings half a cycle apart", from: "px (18)", to: "px (58)", color: "", label: "", loop: "s (3.2)" }, defaults: { period: 1.6, from: 18, to: 58, color: "#8b7bff", label: "TRỰC TIẾP", loop: 3.2 },
  }),

  K("ui/squares-loader", {
    fn: mk(`var P = [[146, 86], [174, 86], [174, 114], [146, 114]], C = [A, "#3a4466", "#5a6378"];
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(110, 50, 100, 100, 22); var s = Math.floor(t / o.step + 1e-6), u = p2io(T(t - s * o.step, 0, o.move));
  for (var j = 0; j < 3; j++) { var a = P[(j + s) % 4], b = P[(j + s + 1) % 4]; MW.rr(c, a[0] + (b[0] - a[0]) * u - 11, a[1] + (b[1] - a[1]) * u - 11, 22, 22, 4); c.fillStyle = C[j]; c.fill(); } });`),
    options: { step: "s (0.6)", move: "s of each step spent moving (0.42, power2.inOut)", loop: "s (2.4: 4 steps)" }, defaults: { step: 0.6, move: 0.42, loop: 2.4 },
    notes: "All three squares move one slot clockwise at once, so the empty slot travels too.",
  }),

  K("text/damage-number-pop", {
    fn: mk(`var X = 222, Y = 118, Hs = [o.hitAt, o.hitAt + o.gap];
return MW.drive(tl, at, o.loop, function (t) { S.clear(); c.fillStyle = "#262c3a"; c.fillRect(30, 140, 260, 2); dummy(56, 122, 28, 36, A, 0);
  var kx = 0, fl = 0; Hs.forEach(function (h) { var d = t - h; if (d < 0) return; kx += d < 0.06 ? o.knock * Math.sin(Math.PI / 2 * d / 0.06) : o.knock * (1 - oc(Math.min(1, (d - 0.06) / 0.39))); fl = Math.max(fl, 0.8 * (1 - T(d, 0, 0.12))); });
  dummy(X + kx, Y, 44, 44, "#5a6275", fl);
  Hs.forEach(function (h, i) { var u = T(t, h - 0.32, h); if (u > 0 && u < 1) { var px = 74 + (X - 22 - 74) * u; c.fillStyle = "rgba(255,210,61,0.35)"; MW.rr(c, px - 18, Y - 2.5, 18, 5, 2.5); c.fill(); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(px, Y, 4, 0, 2 * Math.PI); c.fill(); }
    burst(X - 22, Y, 7, 16, T(t, h, h + 0.3), "#ffd23d"); var d = t - h; if (d < 0 || d > o.life) return;
    var s = d < 0.16 ? 0.3 + (o.peak - 0.3) * oc(d / 0.16) : o.peak - (o.peak - 1) * oc(Math.min(1, (d - 0.16) / 0.16));
    num(o.values[i % o.values.length], X - 6 + 24 * i, Y - 40 - o.rise * oc(Math.min(1, d / 1.0)), 18, "#ffd23d", s, 1 - T(d, 0.7, o.life)); }); });`),
    options: { hitAt: "s (0.62)", gap: "s to the second hit (0.8)", rise: "px (26)", peak: "scale (1.35)", life: "s (1.05)", knock: "px (7)", values: "the numbers shown", loop: "s (2.6)" },
    defaults: { hitAt: 0.62, gap: 0.8, rise: 26, peak: 1.35, life: 1.05, knock: 7, values: ["−248", "−196"], loop: 2.6 },
    notes: "Scale 0.3 → 1.35 → 1 (160 ms each, ease-out cubic), rises 26 px over 1 s, fades 0.7–1.05 s; the target knocks back and flashes, and a projectile flies 320 ms before each hit.",
  }),

  K("ui/combo-counter", {
    fn: mk(`var H = o.hits, lvl = function (t) { var last = -1; for (var i = 0; i < H.length; i++) if (t >= H[i]) last = i; if (last < 0) return 0; var h = H[last], d = t - h, pre = last > 0 ? Math.max(0, 1 - Math.max(0, h - H[last - 1] - 0.06) / o.grace) : 0; return d < 0.06 ? pre + (1 - pre) * oc(d / 0.06) : Math.max(0, 1 - (d - 0.06) / o.grace); };
var brk = H[H.length - 1] + 0.06 + o.grace;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.loop - 0.25, o.loop); c.globalAlpha = f; c.fillStyle = "#262c3a"; c.fillRect(44, 147, 110, 2);
  var n = 0, last = 0, fl = 0, sq = 0; H.forEach(function (h, i) { if (t >= h) { n = i + 1; last = h; fl = Math.max(fl, 1 - T(t, h, h + 0.12)); } sq = Math.max(sq, hs(t, h, 0.25)); });
  dummy(92, 129, 34, 36, A, fl * 0.8, 1 + 0.12 * sq, 1 - 0.12 * sq); H.forEach(function (h) { burst(114, 126, 7, 18, T(t, h, h + 0.3), "#e8ebf3"); });
  var b = T(t, brk, brk + 0.34), d = t - last; MW.txt(c, o.label, 222, 60, 8, "#8f9ab3", 900);
  if (n > 0) { var s = (1 + (o.pop - 1) * (1 - oc(Math.min(1, d / 0.25)))) * (1 - 0.15 * b); c.save(); c.globalAlpha = f * (1 - b); c.translate(222, 96 + 10 * b); c.scale(s, s); MW.txt(c, String(n), 0, 0, 46, mix(A, "#5a6378", b), 900); c.restore(); }
  var lv = lvl(t); MW.rr(c, 182, 128, 80, 6, 3); c.fillStyle = "#262c3a"; c.fill(); if (lv > 0) { MW.rr(c, 182, 128, Math.max(6, 80 * lv), 6, 3); c.fillStyle = n > 0 && d < 0.1 ? "#e8ebf3" : A; c.fill(); }
  if (b > 0) { c.globalAlpha = f * b; MW.txt(c, o.broken, 222, 152 - 4 * (1 - b), 9, "#ff4f6d", 900); } c.globalAlpha = 1; });`),
    options: { hits: "s of each hit ([0.35, 0.7, 1.05, 1.4])", grace: "s the gauge drains (0.9)", pop: "scale (1.4)", label: "", broken: "", loop: "s (3)" },
    defaults: { hits: [0.35, 0.7, 1.05, 1.4], grace: 0.9, pop: 1.4, label: "COMBO", broken: "ĐỨT CHUỖI", loop: 3 },
    notes: "The 80 × 6 gauge refills in 60 ms on each hit and drains linearly; when it empties the combo greys, drops 10 px, shrinks 15 % and fades over 340 ms.",
  }),

  K("effect/critical-hit-flash", {
    fn: mk(`var r = MW.rand(o.seed), D = []; for (var i = 0; i < o.dots; i++) D.push([r() * 2 * Math.PI, 30 + r() * (o.burst - 30), 1.6 + r() * 1.6]);
var spr = sp(420, 18), h = o.hitAt;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.loop - 0.26, o.loop); c.globalAlpha = f; c.fillStyle = "#262c3a"; c.fillRect(60, 151, 200, 2);
  var sx = shake(t, h, 0.25, 4, 3), fl = t >= h ? 1 - oc(T(t, h, h + 0.22)) : 0; dummy(160 + sx, 129, 44, 44, "#5a6275", t >= h ? 0.8 * (1 - T(t, h, h + 0.12)) : 0);
  if (fl > 0) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = f * o.flash * fl; c.fillStyle = "#ffd23d"; c.fillRect(0, 0, S.w, S.h); c.restore();
    var R = 10 + 34 * oc(T(t, h, h + 0.1)); c.save(); c.translate(160, 118); c.rotate(2 * (t - h)); c.globalAlpha = f * fl; c.shadowColor = A; c.shadowBlur = 14 * S.k; c.fillStyle = "#fff3c4"; c.beginPath(); for (var k = 0; k < 16; k++) { var a = Math.PI * k / 8, rr = k % 2 ? 6 : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore(); }
  var u = T(t, h, h + 0.45); if (u > 0 && u < 1) { c.save(); c.globalAlpha = f * (1 - u * u); c.fillStyle = "#ffd23d"; D.forEach(function (q) { var dd = q[1] * oc(u); c.beginPath(); c.arc(160 + Math.cos(q[0]) * dd, 118 + Math.sin(q[0]) * dd, q[2], 0, 2 * Math.PI); c.fill(); }); c.restore(); }
  if (t >= h) { var a0 = T(t, h, h + 0.05); num(o.value, 160, 70, 26, "#fff3c4", 2 - spr(t - h), a0); c.globalAlpha = f * a0; MW.txt(c, o.label, 160, 44, 8, "#ffd23d", 900); } c.globalAlpha = 1; });`),
    options: { hitAt: "s (0.55)", flash: "full-frame opacity (0.2, 220 ms)", dots: "(14)", burst: "px of the farthest dot (54)", value: "", label: "", seed: "(6)", loop: "s (2.7)" },
    defaults: { hitAt: 0.55, flash: 0.2, dots: 14, burst: 54, value: "2.480", label: "CHÍ MẠNG", seed: 6, loop: 2.7 },
    notes: "An eight-point star (inner r 6) grows 10 → 44 px in 100 ms with an accent glow and spins; the number's scale goes 2 → 1 on a spring k420 d18.",
  }),

  K("ui/hit-confirm-reticle", {
    fn: mk(`var spr = sp(700, 34), C = [160, 100], KS = 1.5;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); c.fillStyle = "#262c3a"; c.fillRect(80, 131, 160, 2);
  var hh = spr(t - o.hitAt) * (1 - oc(T(t, o.releaseAt, o.releaseAt + 0.3))), sx = shake(t, o.hitAt, 0.2, 2, 5); dummy(160 + sx, 110, 40, 40, "#5a6275", t >= o.hitAt ? 0.7 * (1 - T(t, o.hitAt, o.hitAt + 0.15)) : 0);
  var r = (o.from + (o.to - o.from) * hh) * KS, L = Math.max(0, 9 * (1 - hh)) * KS, dl = 8 * Math.max(0, hh) * KS, q = r / Math.SQRT2;
  c.save(); c.globalAlpha = Math.max(0, Math.min(1, 0.8 * hh)); c.setLineDash([3, 3]); c.strokeStyle = A; c.lineWidth = 1.5; c.beginPath(); c.arc(C[0], C[1], 26.5 * KS, 0, 2 * Math.PI); c.stroke(); c.restore();
  c.strokeStyle = hh > 0.5 ? A : "#e8ebf3"; c.lineWidth = 2.5; c.lineCap = "round"; c.lineJoin = "round"; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) { var vx = C[0] + s[0] * q, vy = C[1] + s[1] * q; c.beginPath();
    if (L > 0.2) { c.moveTo(vx - s[0] * L, vy); c.lineTo(vx, vy); c.lineTo(vx, vy - s[1] * L); } if (dl > 0.2) { c.moveTo(vx, vy); c.lineTo(vx - s[0] * dl / Math.SQRT2, vy - s[1] * dl / Math.SQRT2); } c.stroke(); });
  var la = T(t, o.hitAt, o.hitAt + 0.08) * (1 - T(t, o.releaseAt, o.releaseAt + 0.3)); if (la > 0) { c.globalAlpha = la; MW.txt(c, o.label, 160, 158, 9, A, 900); c.globalAlpha = 1; } });`),
    options: { hitAt: "s (0.75)", from: "px of the corners (26)", to: "px (13)", releaseAt: "s (1.5, 0.3 s ease-out cubic)", label: "", loop: "s (2.2)" }, defaults: { hitAt: 0.75, from: 26, to: 13, releaseAt: 1.5, label: "TRÚNG", loop: 2.2 },
    notes: "On a spring k700 d34 the four 45° corners close in, their legs shrink and diagonal strokes grow inward into an X that turns accent past halfway; drawn × 1.5.",
  }),

  K("effect/guard-break-split", {
    fn: mk(`var SH = function () { c.beginPath(); c.moveTo(-34, -43); c.lineTo(34, -43); c.lineTo(34, 5); c.quadraticCurveTo(34, 30, 0, 43); c.quadraticCurveTo(-34, 30, -34, 5); c.closePath(); }, CR = [[-2, -43], [6, -26], [-6, -10], [5, 6], [-4, 22], [1, 43]];
var shield = function () { SH(); var g = c.createLinearGradient(0, -43, 0, 43); g.addColorStop(0, "#a693ff"); g.addColorStop(1, "#5a3fd6"); c.fillStyle = g; c.fill(); c.strokeStyle = "#c9bfff"; c.lineWidth = 2; c.stroke(); c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 26); c.moveTo(-20, -8); c.lineTo(20, -8); c.stroke(); };
var r = MW.rand(o.seed), SD = []; for (var i = 0; i < o.shards; i++) { var p = CR[1 + i % 4]; SD.push([p[0], p[1], (i % 2 ? 1 : -1) * (20 + r() * 40), -40 - r() * 60, r() * 6]); }
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.loop - 0.3, o.loop); c.globalAlpha = f; c.fillStyle = "#262c3a"; c.fillRect(50, 186, 220, 2);
  var X = 160, Y = 100, d = t - o.splitAt;
  if (d < 0) { var sx = shake(t, o.impactAt, o.splitAt - o.impactAt, 4, 2); c.save(); c.translate(X + sx, Y); shield(); line(CR, oc(T(t, o.impactAt, o.impactAt + 0.25)), "#1a1036", 2.5); c.restore(); }
  else { [-1, 1].forEach(function (s) { var dx = s * o.spread * oc(T(d, 0, 0.6)), dy = o.fall * iq(T(d, 0, 0.55)) - 5 * hs(d, 0.55, 0.2), rot = s * 0.55 * oc(T(d, 0, 0.6));
      c.save(); c.translate(X + dx + s * 17, Y + dy); c.rotate(rot); c.translate(-s * 17, 0); c.beginPath(); c.moveTo(s * 60, -60); c.lineTo(CR[0][0], -60); CR.forEach(function (p) { c.lineTo(p[0], p[1]); }); c.lineTo(CR[5][0], 60); c.lineTo(s * 60, 60); c.closePath(); c.clip(); shield(); c.restore(); });
    SD.forEach(function (q) { var a = 1 - T(d, 0.4, 0.7); if (a <= 0) return; c.save(); c.globalAlpha = f * a; c.translate(X + q[0] + q[2] * d, Y + q[1] + q[3] * d + 160 * d * d); c.rotate(q[4] + 8 * d); c.fillStyle = "#c9bfff"; c.beginPath(); c.moveTo(-4, -3); c.lineTo(5, -1); c.lineTo(-1, 4); c.closePath(); c.fill(); c.restore(); }); }
  var fx = T(t, o.impactAt, o.impactAt + 0.2); if (fx > 0 && fx < 1) { c.save(); c.globalAlpha = f * (1 - fx); c.strokeStyle = "#fff3c4"; c.lineWidth = 3; c.beginPath(); c.arc(X, Y - 36, 6 + 22 * oc(fx), 0, 2 * Math.PI); c.stroke(); c.restore(); }
  var pp = T(t, o.splitAt + 0.05, o.splitAt + 0.35); if (pp > 0) num(o.label, X, 34, 22, "#ffd23d", bo(pp), f); c.globalAlpha = 1; });`),
    options: { impactAt: "s (0.45)", splitAt: "s (1.0)", spread: "± px (46, 600 ms ease-out cubic)", fall: "px (40, 550 ms ease-in quad)", shards: "(6)", label: "", seed: "(8)", loop: "s (2.6)" },
    defaults: { impactAt: 0.45, splitAt: 1, spread: 46, fall: 40, shards: 6, label: "VỠ!", seed: 8, loop: 2.6 },
    notes: "The shield shakes ±4 px while a six-point zigzag crack draws top → bottom in 250 ms; then the halves split along it, turn ±0.55 rad, fall, bounce 5 px, and shards fly with gravity 320 px/s².",
  }),

  K("motion/perfect-dodge", {
    fn: mk(`var eo = gsap.parseEase("expo.out"), GA = [0.45, 0.33, 0.21], g = 150, X = 96;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); c.fillStyle = "#262c3a"; c.fillRect(30, g, 260, 2); var d = t - o.dodgeAt, y = 0;
  if (d >= 0) y = -o.hop * eo(Math.min(1, d / 0.18)); if (t >= o.landAt - 0.25) y = -o.hop * (1 - iq(T(t, o.landAt - 0.25, o.landAt)));
  var st = 0.15 * hs(t, o.dodgeAt, 0.16), sq = 0.18 * hs(t, o.landAt, 0.18), sy = (1 + st) * (1 - sq);
  if (d >= 0) GA.forEach(function (a, i) { var al = a * (1 - T(d, 0.1, 1.0)); if (al <= 0) return; c.save(); c.globalAlpha = al; c.translate(X - 3 * (i + 1), g - 4 * (i + 1) * Math.min(1, d / 0.1)); MW.rr(c, -12, -40, 24, 40, 6); c.fillStyle = "#c9bfff"; c.fill(); c.restore(); });
  c.save(); c.translate(X, g + y); c.scale(1 / sy, sy); MW.rr(c, -12, -40, 24, 40, 6); c.fillStyle = A; c.fill(); c.fillStyle = "#0b0d12"; c.beginPath(); c.arc(-4, -28, 1.8, 0, 2 * Math.PI); c.fill(); c.beginPath(); c.arc(4, -28, 1.8, 0, 2 * Math.PI); c.fill(); c.restore();
  var b0 = o.dodgeAt - 0.47; if (t >= b0 && t <= b0 + 1.25) { var b = MW.path([[b0, 330, 0], [b0 + 0.55, 150, 0], [b0 + 0.95, 96, 0], [b0 + 1.25, -20, 0]], t, "none")[0]; c.fillStyle = "rgba(255,210,61,0.3)"; MW.rr(c, b, g - 23, 22, 4, 2); c.fill(); c.fillStyle = "#ffd23d"; MW.rr(c, b - 4, g - 24, 9, 6, 3); c.fill(); }
  var pp = T(t, o.dodgeAt + 0.15, o.dodgeAt + 0.45), out = T(t, o.outAt, o.outAt + 0.25); if (pp > 0) num(o.label, 214, 66, 14, "#e8ebf3", bo(pp) * (1 - 0.2 * out), 1 - out); });`),
    options: { dodgeAt: "s (0.72)", hop: "px (62, 180 ms expo.out)", landAt: "s (1.6)", outAt: "s the label leaves (2.2)", label: "", loop: "s (2.6)" }, defaults: { dodgeAt: 0.72, hop: 62, landAt: 1.6, outAt: 2.2, label: "NÉ HOÀN HẢO", loop: 2.6 },
    notes: "Three ghosts (45 / 33 / 21 %) stay at the start spot while the bullet slows through them (330 → 150 → 96 → −20 px); the body lands with an 18 % squash.",
  }),

  K("effect/parry-timing-ring", {
    fn: mk(`var X = 120, Y = 112;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.loop - 0.3, o.loop); c.globalAlpha = f; c.fillStyle = "#262c3a"; c.fillRect(50, 141, 230, 2);
  var h = o.hitAt, w0 = h - o.window, push = -o.push * hs(t, h, 0.25); dummy(X - 24 + push * 0.5, Y + 8, 20, 42, "#5a6275", 0);
  c.save(); c.translate(X + push, Y); MW.rr(c, -11, -15, 22, 30, 7); c.fillStyle = A; c.fill(); c.strokeStyle = "#c9bfff"; c.lineWidth = 1.5; c.stroke(); c.restore();
  c.save(); c.setLineDash([3, 3]); c.strokeStyle = "rgba(201,191,255,0.7)"; c.lineWidth = 1.5; c.beginPath(); c.arc(X, Y, o.to, 0, 2 * Math.PI); c.stroke(); c.restore();
  var u = T(t, w0, h); if (t >= w0 && t < h) { c.save(); c.globalAlpha = f * (0.3 + 0.7 * u); c.strokeStyle = A; c.lineWidth = 2; c.beginPath(); c.arc(X, Y, o.from + (o.to - o.from) * u, 0, 2 * Math.PI); c.stroke(); c.restore(); }
  var q = T(t, h, h + 0.35); if (q > 0 && q < 1) { c.save(); c.globalAlpha = f * (1 - q); c.strokeStyle = "#fff3c4"; c.lineWidth = 3; c.beginPath(); c.arc(X, Y, o.to + 24 * oc(q), 0, 2 * Math.PI); c.stroke(); c.restore(); }
  burst(X + 12, Y, 9, 20, T(t, h, h + 0.3), "#ffd23d");
  var px, py = Y, pa = 1, back = t >= h; if (!back) px = X + 14 + 269 * (h - t); else { var d = t - h; px = X + 14 + 420 * d; py = Y - 90 * d; pa = 1 - T(d, 0.4, 0.6); }
  if (pa > 0 && px < 340) { c.save(); c.globalAlpha = f * pa; c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(px, py, 4, 0, 2 * Math.PI); c.fill(); c.globalAlpha = f * pa * 0.35; c.beginPath(); c.arc(px + (back ? -10 : 10), py + (back ? 2 : 0), 3, 0, 2 * Math.PI); c.fill(); c.restore(); }
  var pp = T(t, h, h + 0.3); if (pp > 0) num(o.label, X, 58, 18, "#ffd23d", bo(pp), f); c.globalAlpha = 1; });`),
    options: { from: "px of the timing ring (54)", to: "px of the target ring (16)", window: "s it shrinks, linear (0.7)", hitAt: "s (1.0)", push: "px (6)", label: "", loop: "s (2.4)" }, defaults: { from: 54, to: 16, window: 0.7, hitAt: 1, push: 6, label: "ĐỠ!", loop: 2.4 },
    notes: "The projectile comes in at 269 px/s and is sent back at 420 px/s, 90 px/s up (the site's label says × 2.4; its numbers give about × 1.6).",
  }),

  K("ui/status-ailment-tick", {
    fn: mk(`var X = 200, Y = 118, icon = function (x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = o.tint; c.beginPath(); c.arc(0, 0, 11, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#0b0d12"; c.beginPath(); c.moveTo(0, -7); c.bezierCurveTo(5, -1, 6, 6, 0, 6); c.bezierCurveTo(-6, 6, -5, -1, 0, -7); c.fill(); c.restore(); };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); var f = 1 - T(t, o.loop - 0.3, o.loop); c.globalAlpha = f; c.fillStyle = "#262c3a"; c.fillRect(120, 141, 160, 2);
  var ap = o.applyAt, sx = shake(t, ap, 0.25, 3, 4), n = 0, sq = 0, hp = 1; for (var k = 0; k < o.ticks; k++) { var tk = ap + o.tick * (k + 1); if (t >= tk) n = k + 1; sq = Math.max(sq, hs(t, tk, 0.2)); hp -= o.drop * oc(T(t, tk, tk + 0.15)); }
  var tint = 0.45 * T(t, ap, ap + 0.25), fl = t >= ap ? 0.8 * (1 - T(t, ap, ap + 0.12)) : 0;
  c.save(); c.translate(X + sx, Y + 22); c.scale(1 + 0.06 * sq, 1 - 0.06 * sq); MW.rr(c, -22, -44, 44, 44, 7); c.fillStyle = "#5a6275"; c.fill(); if (tint > 0) { c.globalAlpha = f * tint; c.fillStyle = o.tint; c.fill(); } if (fl > 0) { c.globalAlpha = f * fl; c.fillStyle = "#f4f6ff"; c.fill(); }
  c.globalAlpha = f; c.fillStyle = "#0b0d12"; c.beginPath(); c.arc(-8, -27, 2.2, 0, 2 * Math.PI); c.fill(); c.beginPath(); c.arc(8, -27, 2.2, 0, 2 * Math.PI); c.fill(); c.restore();
  bar(X - 22, 82, 44, 5, hp, "#3ddc84"); for (var k = 0; k < o.ticks; k++) { c.fillStyle = k < n ? o.tint : "#262c3a"; c.beginPath(); c.arc(X - 13.5 + k * 9, 74, 2, 0, 2 * Math.PI); c.fill(); }
  if (t < ap) { var u = iq(T(t, ap - 0.3, ap)), w = 1 - u; c.save(); c.globalAlpha = f * T(t, 0.05, 0.2); icon(w * w * 44 + 2 * w * u * 100 + u * u * (X + 22), w * w * 34 + 2 * w * u * 10 + u * u * (Y - 22), 0.6 + 0.4 * u); c.restore(); }
  else icon(X + 22, Y - 22, 1.5 - 0.5 * bo(T(t, ap, ap + 0.25)));
  for (var k = 0; k < o.ticks; k++) { var d = t - ap - o.tick * (k + 1); if (d < 0 || d > 0.6) continue; num(o.amount, X - 40 + (k % 2) * 6, Y - 6 - 18 * oc(d / 0.6), 13, o.tint, 1, 1 - T(d, 0.35, 0.6)); } c.globalAlpha = 1; });`),
    options: { applyAt: "s the icon sticks (0.6, after a 300 ms ease-in quad arc)", tick: "s between ticks (0.35)", ticks: "(4)", drop: "of the health bar per tick (0.12)", amount: "", tint: "", loop: "s (2.8)" },
    defaults: { applyAt: 0.6, tick: 0.35, ticks: 4, drop: 0.12, amount: "−6", tint: "#3ddc84", loop: 2.8 },
  }),

  K("flow/floating-label-field", {
    fn: mk(`var FX = 70, FY = 84, FW = 180, FH = 52;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(40, 36, 240, 128, 16); MW.txt(c, o.title, 60, 58, 11, "#e8ebf3", 800, "left");
  MW.rr(c, FX, FY, FW, FH, 10); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke();
  var ring = T(t, 0.5, 0.62) * (1 - T(t, 2.85, 3.05)); if (ring > 0) { c.save(); c.globalAlpha = ring; c.strokeStyle = A; c.lineWidth = 2; c.stroke(); c.restore(); }
  var u = po(T(t, 0.55, 0.55 + o.duration)) * (1 - p2io(T(t, 2.95, 3.25))), s = 1 - (1 - o.scale) * u; c.save(); c.translate(FX + 16, FY + FH / 2 - o.lift * u); c.scale(s, s); MW.txt(c, o.label, 0, 0, 14, mix("#8f9ab3", A, u), 600, "left"); c.restore();
  var t0 = 0.95, n = t < t0 ? 0 : Math.min(o.value.length, Math.floor((t - t0) / o.type) + 1), va = 1 - T(t, 2.8, 2.95), v = o.value.slice(0, n), ty = FY + FH / 2 + 7;
  c.font = "600 12px Inter, sans-serif"; var w = c.measureText(v).width; if (n > 0 && va > 0) { c.save(); c.globalAlpha = va; MW.txt(c, v, FX + 16, ty, 12, "#e8ebf3", 600, "left"); c.restore(); }
  var typing = t >= t0 && t < t0 + o.value.length * o.type; if (ring > 0.5 && t > 0.85 && va > 0 && (typing || fr(t / 0.5) < 0.5)) { c.fillStyle = A; c.fillRect(FX + 17 + w, ty - 7, 1.5, 14); }
  cur([[0, 250, 186], [0.4, 196, 118], [0.9, 196, 118], [1.4, 276, 180]], t, [0.45]); });`),
    options: { lift: "px (13)", scale: "(0.72), from the label's left edge", duration: "s (0.3, power2.out)", type: "s a character (0.055)", label: "", value: "", title: "", loop: "s (3.4)" },
    defaults: { lift: 13, scale: 0.72, duration: 0.3, type: 0.055, label: "Email", value: "ten@example.com", title: "Đăng nhập", loop: 3.4 },
  }),

  K("ui/checkbox-draw", {
    fn: mk(`var e = MW.ez("cubic-bezier(.65,0,.35,1)"), BX = 85, BY = 82;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(64, 56, 192, 88, 16); var u = e(T(t, 0.26, 0.66)), k = e(T(t, 0.62, 1.17));
  MW.rr(c, BX, BY, 36, 36, 8); c.fillStyle = mix("#182231", o.color, u); c.fill(); c.strokeStyle = mix("#536277", o.color, u); c.lineWidth = 2; c.stroke();
  line([[BX + 5, BY + 20], [BX + 14, BY + 29], [BX + 32, BY + 8]], k, "#0b0d12", 4); MW.txt(c, o.label, BX + 52, BY + 13, 11, "#e8ebf3", 800, "left"); MW.txt(c, o.sub, BX + 52, BY + 27, 7, "#8f9ab3", 600, "left"); });`),
    options: { color: "(#75e4d2)", label: "", sub: "", loop: "s (2.2)" }, defaults: { color: "#75e4d2", label: "Lưu tuỳ chọn", sub: "Nhớ cài đặt cho lần sau", loop: 2.2 },
    notes: "The box fills first (0.26–0.66 s), then the tick draws short arm first (0.62–1.17 s), both cubic-bezier(.65,0,.35,1); it holds checked.",
  }),

  K("ui/switch-squash", {
    fn: mk(`var s = sp(o.stiffness, o.damping), TX = 116, TY = 78;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(76, 40, 168, 120, 16); MW.txt(c, o.label, 160, 62, 10, "#c9d2ea", 700);
  var p = s(t - o.onAt) - s(t - o.offAt), q = Math.max(hs(t, o.onAt, 0.2), hs(t, o.offAt, 0.2)), X0 = TX + 22, X1 = X0 + o.travel;
  MW.rr(c, TX, TY, 88, 44, 22); c.fillStyle = mix("#3a4466", A, p); c.fill();
  c.save(); c.translate(X0 + o.travel * p, TY + 22); c.scale(1 - 0.24 * q, 1 + 0.1 * q); c.shadowColor = "rgba(0,0,0,0.4)"; c.shadowBlur = 4 * S.k; c.shadowOffsetY = S.k; c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, 17, 0, 2 * Math.PI); c.fill(); c.restore();
  cur([[0, 232, 178], [o.onAt - 0.2, X0 + 2, TY + 26], [o.onAt + 0.15, X0 + 2, TY + 26], [o.offAt - 0.25, X1 + 2, TY + 26], [o.offAt + 0.15, X1 + 2, TY + 26], [o.offAt + 0.6, 240, 182]], t, [o.onAt - 0.03, o.offAt - 0.03]); });`),
    options: { travel: "px (40)", stiffness: "(380)", damping: "(20)", onAt: "s (0.4)", offAt: "s (1.5)", label: "", loop: "s (2.6)" }, defaults: { travel: 40, stiffness: 380, damping: 20, onAt: 0.4, offAt: 1.5, label: "Thông báo", loop: 2.6 },
    notes: "During the first 0.2 s of each move the knob squashes to scaleX 0.76, scaleY 1.1 (half sine); the track crossfades with the knob's progress.",
  }),

  K("flow/inline-validation", {
    fn: mk(`var FX = 70, FW = 180;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(50, 22, 220, 160, 14);
  var op = po(T(t, 0.5, 1.12)) * (1 - pi2(T(t, 2.3, 2.6))), wE = T(t, 0.5, 0.6) * (1 - T(t, 2.3, 2.45)), rE = Math.min(1, 1 - T(t, 0.5, 0.6) + T(t, 2.45, 2.6)), fP = T(t, 0.5, 0.62) * (1 - T(t, 2.3, 2.45)), H = o.height * op;
  MW.txt(c, o.labels[0], FX, 38, 7, "#8f9ab3", 700, "left"); MW.rr(c, FX, 44, FW, 36, 8); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = mix("#3a4466", "#ffd23d", wE); c.lineWidth = 1 + wE; c.stroke();
  if (rE > 0) { c.save(); c.globalAlpha = rE; c.strokeStyle = A; c.lineWidth = 2; c.stroke(); c.restore(); }
  MW.txt(c, o.value, FX + 12, 62.5, 9, "#e8ebf3", 600, "left"); if (rE > 0.5 && fr(t / 0.5) < 0.5) { c.font = "600 9px Inter, sans-serif"; c.fillStyle = A; c.fillRect(FX + 13 + c.measureText(o.value).width, 56, 1.2, 12); }
  if (H > 0.3) { c.save(); c.beginPath(); c.rect(FX - 4, 82, FW + 8, H); c.clip(); c.globalAlpha = op; var my = 96 - 4 * (1 - op); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(FX + 6, my, 6, 0, 2 * Math.PI); c.fill(); MW.txt(c, "!", FX + 6, my + 0.5, 8, "#0b0d12", 900); MW.txt(c, o.message, FX + 17, my, 8, "#ffd23d", 700, "left"); c.restore(); }
  var PY = 102 + H; MW.txt(c, o.labels[1], FX, PY - 6, 7, "#8f9ab3", 700, "left"); MW.rr(c, FX, PY, FW, 36, 8); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke();
  if (fP > 0) { c.save(); c.globalAlpha = fP; c.strokeStyle = A; c.lineWidth = 2; c.stroke(); c.restore(); if (fP > 0.5 && fr(t / 0.5) < 0.5) { c.fillStyle = A; c.fillRect(FX + 12, PY + 12, 1.2, 12); } }
  cur([[0, 250, 186], [0.42, 200, 120], [0.9, 200, 120], [1.5, 282, 184]], t, [0.47]); });`),
    options: { height: "px of the message row (28)", value: "", message: "", labels: "the two fields' labels", loop: "s (2.9)" },
    defaults: { height: 28, value: "ten@example", message: "Email chưa đúng định dạng", labels: ["Email", "Mật khẩu"], loop: 2.9 },
    notes: "Leaving the field turns its border to the warning colour and opens the message row (0.62 s power2.out), pushing the next field down; reversed at 2.3 s with power2.in.",
  }),

  K("ui/button-morph", {
    fn: mk(`var W = MW.springTo(o.stiffness, o.damping, [[0, o.widths[0]], [o.times[0], o.widths[1]], [o.times[1], o.widths[2]], [o.resetAt, o.widths[0]]]), BY = 136;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(40, 24, 240, 152, 16); c.fillStyle = "#10131d"; MW.rr(c, 60, 44, 200, 24, 8); c.fill(); MW.txt(c, o.fields[0], 70, 56.5, 8, "#8f9ab3", 600, "left"); c.fillStyle = "#10131d"; MW.rr(c, 60, 76, 200, 24, 8); c.fill(); MW.txt(c, o.fields[1], 70, 88.5, 8, "#8f9ab3", 600, "left");
  var a1 = T(t, o.times[0], o.times[0] + 0.2), a2 = T(t, o.times[1], o.times[1] + 0.15), a3 = T(t, o.resetAt, o.resetAt + 0.2), wS = Math.min(1, 1 - a1 + a3), wG = a1 * (1 - a2), wD = a2 * (1 - a3), w = W(t), ps = 1 - 0.04 * hs(t, o.times[0] - 0.1, 0.15);
  c.save(); c.translate(160, BY); c.scale(ps, ps); MW.rr(c, -w / 2, -22, w, 44, 22); if (wG > 0) { c.globalAlpha = wG; c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = A; c.lineWidth = 2; c.stroke(); }
  if (wS > 0) { c.globalAlpha = wS; c.fillStyle = A; c.fill(); } if (wD > 0) { c.globalAlpha = wD; c.fillStyle = G; c.fill(); }
  if (wS > 0) { c.globalAlpha = wS; MW.txt(c, o.labels[0], 0, 4 * (t > o.resetAt ? 1 - a3 : 0) + 0.5, 11, "#fff", 900); }
  if (wG > 0) { c.globalAlpha = wG; var gy = 4 * (1 - a1); c.font = "900 9px Inter, sans-serif"; var lw = c.measureText(o.labels[1]).width; c.save(); c.translate(-lw / 2 - 6, gy); c.rotate(8 * t); c.strokeStyle = A; c.lineWidth = 2; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, 4, 0, 4 * Math.PI / 3); c.stroke(); c.restore(); MW.txt(c, o.labels[1], 6, gy + 0.5, 9, "#c9bfff", 900); }
  if (wD > 0) { c.globalAlpha = wD; var dy = 4 * (1 - a2); c.font = "900 10px Inter, sans-serif"; var dw = c.measureText(o.labels[2]).width; tickAt(-dw / 2 - 4, dy, 0.8, T(t, o.times[1] + 0.1, o.times[1] + 0.4), "#0b0d12", 2.2); MW.txt(c, o.labels[2], 7, dy + 0.5, 10, "#0b0d12", 900); }
  c.restore(); cur([[0, 250, 190], [o.times[0] - 0.22, 178, 140], [o.times[0] + 0.3, 178, 140], [o.times[0] + 0.9, 278, 188]], t, [o.times[0] - 0.1]); });`),
    options: { widths: "px [send, sending, sent] ([128, 176, 140])", stiffness: "(260)", damping: "(24)", times: "s [sending, sent] ([0.55, 1.9])", resetAt: "s (2.95)", labels: "", fields: "", loop: "s (3.4)" },
    defaults: { widths: [128, 176, 140], stiffness: 260, damping: 24, times: [0.55, 1.9], resetAt: 2.95, labels: ["GỬI", "ĐANG GỬI…", "ĐÃ GỬI"], fields: ["Họ và tên", "Email"], loop: 3.4 },
    notes: "The width is a sum of springs between the states; each new label rises 4 px as it fades in; the spinner is a 240° arc at 8 rad/s.",
  }),

  K("ui/upload-progress", {
    fn: mk(`var V = MW.springTo(o.stiffness, o.damping, o.steps), CX = 44, CY = 62;
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(CX, CY, 232, 76, 12); MW.rr(c, CX + 14, CY + 18, 30, 40, 6); c.fillStyle = "#2f3a5c"; c.fill(); MW.txt(c, o.ext, CX + 29, CY + 38.5, 7, "#c9d2ea", 900);
  MW.txt(c, o.file, CX + 56, CY + 22, 9, "#e8ebf3", 800, "left"); MW.txt(c, o.size, CX + 56, CY + 34, 7, "#8f9ab3", 600, "left");
  var live = t < o.resetAt, v = live ? Math.max(0, Math.min(100, V(t))) : 0, fl = T(t, o.doneAt - 0.15, o.doneAt + 0.05), r = T(t, o.resetAt, o.resetAt + 0.25), ba = live ? 1 - fl : r, gone = live ? 1 : 1 - r;
  if (ba > 0) { c.save(); c.globalAlpha = ba; c.translate(0, CY + 47); c.scale(1, live ? 1 - 0.6 * fl : 1); MW.rr(c, CX + 56, -3, 160, 6, 3); c.fillStyle = "#262c3a"; c.fill(); if (v > 0) { MW.rr(c, CX + 56, -3, Math.max(6, 1.6 * v), 6, 3); c.fillStyle = A; c.fill(); } c.restore();
    c.save(); c.globalAlpha = ba; MW.txt(c, o.labels[0], CX + 56, CY + 62, 6, "#8f9ab3", 800, "left"); MW.txt(c, Math.round(v) + "%", CX + 216, CY + 62, 8, "#e8ebf3", 900, "right"); c.restore(); }
  var bs = bo(T(t, o.doneAt, o.doneAt + 0.35)) * gone, la = T(t, o.doneAt + 0.15, o.doneAt + 0.35) * gone;
  if (bs > 0) { c.save(); c.translate(CX + 210, CY + 26); c.scale(bs, bs); c.fillStyle = G; c.beginPath(); c.arc(0, 0, 13, 0, 2 * Math.PI); c.fill(); c.restore(); c.save(); c.globalAlpha = gone; tickAt(CX + 210, CY + 26, 1, T(t, o.doneAt + 0.1, o.doneAt + 0.35), "#0b0d12", 2.6); c.restore(); }
  if (la > 0) { c.save(); c.globalAlpha = la; MW.txt(c, o.labels[1], CX + 56, CY + 54, 7, G, 900, "left"); c.restore(); } });`),
    options: { steps: "[[s, %], ...] joined by springs", stiffness: "(160)", damping: "(26)", doneAt: "s the badge pops (2.45)", resetAt: "s (3.3)", file: "", size: "", ext: "", labels: "[uploading, uploaded]", loop: "s (3.6)" },
    defaults: { steps: [[0, 0], [0.4, 20], [0.75, 46], [1.15, 52], [1.5, 84], [1.9, 100]], stiffness: 160, damping: 26, doneAt: 2.45, resetAt: 3.3, file: "motion-demo.mp4", size: "48,2 MB", ext: "MP4", labels: ["ĐANG TẢI LÊN", "ĐÃ TẢI LÊN"], loop: 3.6 },
    notes: "At the end the bar flattens (scaleY 1 → 0.4) and fades, then a green badge pops (back.out) and its tick draws.",
  }),

  K("flow/password-strength", {
    fn: mk(`var spr = sp(420, 16), E = o.events, CL = ["#ff4f6d", "#ffb13d", "#a99bff", G];
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(14, 28, 292, 132, 14); var f = 1 - T(t, o.resetAt, o.resetAt + 0.25), green = T(t, E[3], E[3] + 0.15);
  MW.txt(c, o.field, 26, 46, 7, "#8f9ab3", 700, "left"); MW.rr(c, 26, 54, 176, 36, 8); c.fillStyle = "#10131d"; c.fill(); c.strokeStyle = A; c.lineWidth = 2; c.stroke();
  var nd = t < 0.3 ? 0 : Math.min(13, Math.floor((t - 0.3) / 0.16) + 1); c.save(); c.globalAlpha = f; c.fillStyle = "#e8ebf3"; for (var i = 0; i < nd; i++) { c.beginPath(); c.arc(38 + i * 9, 72, 2.6, 0, 2 * Math.PI); c.fill(); } c.restore();
  if (fr(t / 0.5) < 0.5 || (t > 0.3 && t < 0.3 + 13 * 0.16)) { c.fillStyle = A; c.fillRect(34 + nd * 9 * f, 65, 1.2, 14); }
  for (var j = 0; j < 4; j++) { var x = 26 + j * 44; MW.rr(c, x, 104, 40, 8, 4); c.fillStyle = "#262c3a"; c.fill(); if (t >= E[j] && f > 0) { var s = spr(t - E[j]); c.save(); c.globalAlpha = f; c.translate(x + 20, 108); c.scale(0.6 + 0.4 * Math.min(1, s), s); MW.rr(c, -20, -4, 40, 8, 4); c.fillStyle = mix(A, G, green); c.fill(); c.restore(); } }
  for (var j = 0; j < 4; j++) { var ai = T(t, E[j] + 0.07, E[j] + 0.17), ao = j < 3 ? 1 - T(t, E[j + 1], E[j + 1] + 0.07) : 1, a = ai * ao * f; if (a <= 0) continue; c.save(); c.globalAlpha = a; MW.txt(c, o.labels[j], 26, 132 + 5 * (1 - ai), 9, CL[j], 900, "left"); c.restore(); }
  for (var j = 0; j < 4; j++) { var y = 62 + j * 20, x = 222, on = t >= E[j] && f > 0; c.strokeStyle = "#3a4466"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 5.5, 0, 2 * Math.PI); c.stroke();
    if (on) { var s = spr(t - E[j]); c.save(); c.globalAlpha = f; c.translate(x, y); c.scale(s, s); c.fillStyle = G; c.beginPath(); c.arc(0, 0, 5.5, 0, 2 * Math.PI); c.fill(); c.restore(); c.save(); c.globalAlpha = f; tickAt(x, y - 0.5, 0.42, 1, "#0b0d12", 1.6); c.restore(); }
    MW.txt(c, o.rules[j], x + 10, y + 0.5, 7, on ? "#e8ebf3" : "#8f9ab3", 600, "left"); } });`),
    options: { events: "s each rule is met ([0.5, 1.1, 1.7, 2.3])", resetAt: "s (3.25)", field: "", labels: "four strength words", rules: "four rules", loop: "s (3.6)" },
    defaults: { events: [0.5, 1.1, 1.7, 2.3], resetAt: 3.25, field: "Mật khẩu", labels: ["YẾU", "TRUNG BÌNH", "KHÁ", "MẠNH"], rules: ["Ít nhất 8 ký tự", "Có chữ hoa", "Có chữ số", "Có ký hiệu"], loop: 3.6 },
    notes: "Each segment and rule check pops on a spring k420 c16; all segments turn green at four of four.",
  }),

  K("ui/skeleton-resolve", {
    fn: mk(`var X = 60, Y = 34, B = { x0: X, x1: X + 200, list: [["c", X + 28, Y + 28, 16], ["r", X + 52, Y + 18, 90, 9], ["r", X + 52, Y + 33, 54, 7], ["r", X + 16, Y + 54, 168, 34, 6], ["r", X + 16, Y + 100, 150, 7], ["r", X + 16, Y + 114, 108, 7]] };
return MW.drive(tl, at, o.loop, function (t) { S.clear(); card(X, Y, 200, 132); var u = po(T(t, o.resolveAt, o.resolveAt + o.duration)) * (1 - pi2(T(t, o.backAt, o.backAt + 0.25)));
  skel(B, t, o.period, 48, 0.12, 1 - u); if (u <= 0) return; c.save(); c.globalAlpha = u; c.translate(0, o.rise * (1 - u));
  c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(X + 28, Y + 28, 16, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.name.charAt(0), X + 28, Y + 28.5, 13, "#0b0d12", 900);
  MW.txt(c, o.name, X + 52, Y + 22.5, 9, "#e8ebf3", 800, "left"); MW.txt(c, o.time, X + 52, Y + 36.5, 7, "#8f9ab3", 600, "left");
  var g = c.createLinearGradient(X + 16, 0, X + 184, 0); g.addColorStop(0, "#3dd6f5"); g.addColorStop(1, "#6a4cf0"); MW.rr(c, X + 16, Y + 54, 168, 34, 6); c.fillStyle = g; c.fill();
  MW.txt(c, o.lines[0], X + 16, Y + 103.5, 7, "#c9d2ea", 600, "left"); MW.txt(c, o.lines[1], X + 16, Y + 117.5, 7, "#8f9ab3", 600, "left"); c.restore(); });`),
    options: { period: "s a shimmer pass (1.0)", resolveAt: "s (0.9)", duration: "s (0.86, power2.out)", rise: "px (6)", backAt: "s (2.6, 0.25 s power2.in)", name: "", time: "", lines: "", loop: "s (3.2)" },
    defaults: { period: 1, resolveAt: 0.9, duration: 0.86, rise: 6, backAt: 2.6, name: "Lan Phương", time: "3 phút trước", lines: ["Ảnh mới từ buổi chụp hôm nay,", "xem trong thư mục Dự án."], loop: 3.2 },
  }),
];
