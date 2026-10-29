// Magic UI magic-card (apps/www/registry/magicui/magic-card.tsx at efe76fc): a card whose 1 px border is a radial gradient (200 px circle
// at the pointer, #9E7AFF -> #FE8BBB -> the border colour) and whose face carries a soft radial glow (#262626 at opacity 0.8) under the
// pointer (gradient mode); or a 420 px blurred (60 px) orb, linear-gradient(90deg, #ee4f27, #6b21ef) at 0.9, trailing the pointer on springs
// (x / y stiffness 250, damping 30, mass 0.6; visibility 300 / 35), screen blend on dark (orb mode). The pointer rests at -200, -200.
// Port: the pointer becomes a path [t, x, y]; springs integrated at 240 Hz from the start, so any frame is exact.
export default {
  id: "magic-card",
  kind: "motion",
  title: "Magic Card",
  sub: "Đèn rọi lướt trên thẻ, viền sáng theo",
  desc: "A spotlight glides over a card and lights its border near the light (gradient mode), or a large blurred colour orb trails the pointer (orb mode).",
  category: "Effects & overlays",
  tags: ["spotlight", "card", "border", "glow", "orb", "hover", "magicui"],
  source: { path: "apps/www/registry/magicui/magic-card.tsx" },
  notes: "el is the card (its content stays on top). path: [[t, x, y], ...] px in the card; outside the card or before the path starts the light rests off it (-size). Upstream's inline opacity 0.8 keeps the inner glow always on (kept).",
  options: { mode: "gradient | orb (gradient)", gradientSize: "px (200)", gradientColor: "#262626", gradientOpacity: "0.8", gradientFrom: "#9E7AFF", gradientTo: "#FE8BBB", border: "rgba(255,255,255,0.1)",
    background: "#0a0a0a", glowFrom: "#ee4f27", glowTo: "#6b21ef", glowAngle: "90", glowSize: "420", glowBlur: "60", glowOpacity: "0.9", path: "[[t, x, y], ...]", enter: "s (path start)", leave: "s (path end)" },
  defaults: { mode: "gradient", gradientSize: 200, gradientColor: "#262626", gradientOpacity: 0.8, gradientFrom: "#9E7AFF", gradientTo: "#FE8BBB", border: "rgba(255,255,255,0.1)", background: "#0a0a0a",
    glowFrom: "#ee4f27", glowTo: "#6b21ef", glowAngle: 90, glowSize: 420, glowBlur: 60, glowOpacity: 0.9, path: null, enter: null, leave: null },
  css: `.mw-magic-card { position: relative; isolation: isolate; overflow: hidden; border: 1px solid transparent; }
.mw-magic-card > .mw-mc-face { position: absolute; inset: 1px; z-index: 20; border-radius: inherit; }
.mw-magic-card > .mw-mc-glow { pointer-events: none; position: absolute; inset: 1px; z-index: 30; border-radius: inherit; }
.mw-magic-card > .mw-mc-orb { pointer-events: none; position: absolute; z-index: 30; left: 0; top: 0; border-radius: 9999px; will-change: transform, opacity; }
.mw-magic-card > .mw-mc-body { position: relative; z-index: 40; }`,
  markup: `<div class="mw-magic-card" style="border-radius:20px">…</div>`,
  fn: function (el, tl, at, o) {
    var W = el.clientWidth, H = el.clientHeight, body = document.createElement("div"); body.className = "mw-mc-body";
    while (el.firstChild) body.appendChild(el.firstChild);
    var face = document.createElement("div"); face.className = "mw-mc-face"; face.style.background = o.background; el.appendChild(face);
    var glow = null, orb = null;
    if (o.mode === "orb") { orb = document.createElement("div"); orb.className = "mw-mc-orb"; orb.style.width = orb.style.height = o.glowSize + "px"; orb.style.filter = "blur(" + o.glowBlur + "px)";
      orb.style.background = "linear-gradient(" + o.glowAngle + "deg, " + o.glowFrom + ", " + o.glowTo + ")"; orb.style.mixBlendMode = "screen"; el.appendChild(orb); }
    else { glow = document.createElement("div"); glow.className = "mw-mc-glow"; glow.style.opacity = o.gradientOpacity; el.appendChild(glow); }
    el.appendChild(body);
    var path = o.path || [[0, -o.gradientSize, H * 0.3], [2, W + o.gradientSize, H * 0.7]], enter = o.enter == null ? path[0][0] : o.enter, leave = o.leave == null ? path[path.length - 1][0] : o.leave;
    var ptr = function (t) {
      if (t < enter || t > leave) return null;
      if (t <= path[0][0]) return [path[0][1], path[0][2]];
      for (var k = 1; k < path.length; k++) if (t <= path[k][0]) { var a = path[k - 1], b = path[k], f = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return [path[path.length - 1][1], path[path.length - 1][2]];
    };
    var off = -o.gradientSize, end = leave + 1.5, dt = 1 / 240, N = Math.ceil(end / dt) + 1, SX = new Float64Array(N), SY = new Float64Array(N), SV = new Float64Array(N);
    if (orb) {                                          // orb springs: x / y 250 / 30 / 0.6, visibility 300 / 35 (mass 1)
      var x = off, y = off, vx = 0, vy = 0, v = 0, vv = 0, tx = off, ty = off;
      for (var i = 0; i < N; i++) {
        var p = ptr(i * dt); if (p) { tx = p[0]; ty = p[1]; }
        var tv = p ? o.glowOpacity : 0;
        vx += ((250 * (tx - x) - 30 * vx) / 0.6) * dt; x += vx * dt; vy += ((250 * (ty - y) - 30 * vy) / 0.6) * dt; y += vy * dt;
        vv += (300 * (tv - v) - 35 * vv) * dt; v += vv * dt;
        SX[i] = x; SY[i] = y; SV[i] = v;
      }
    }
    var s = { t: 0 }, set = function () {
      if (orb) { var i = Math.max(0, Math.min(N - 1, Math.round(s.t / dt))); orb.style.transform = "translate(" + SX[i] + "px, " + SY[i] + "px) translate(-50%, -50%)"; orb.style.opacity = Math.max(0, SV[i]); }
      var q = ptr(s.t), mx = q ? q[0] : off, my = q ? q[1] : off, g = o.gradientSize;
      el.style.background = "linear-gradient(" + o.background + " 0 0) padding-box, radial-gradient(" + g + "px circle at " + mx + "px " + my + "px, " + o.gradientFrom + ", " + o.gradientTo + ", " + o.border + " 100%) border-box";
      if (glow) glow.style.background = "radial-gradient(" + g + "px circle at " + mx + "px " + my + "px, " + o.gradientColor + ", transparent 100%)";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.cards { display: flex; gap: 60px; } .mw-magic-card { width: 640px; height: 420px; border-radius: 24px; }
.mw-mc-body { padding: 56px; } .mw-mc-body h3 { margin: 0 0 16px; font-size: 52px; } .mw-mc-body p { margin: 0; font-size: 28px; opacity: .6; line-height: 1.4; }`,
    html: `<div class="center"><div class="cards"><div class="mw-magic-card c1"><h3>Đèn rọi</h3><p>Viền thẻ sáng lên ở nơi ánh đèn đi qua.</p></div>
<div class="mw-magic-card c2"><h3>Quả cầu màu</h3><p>Một quầng màu lớn đi theo con trỏ.</p></div></div></div>`,
    run: `MW.magicCard(q(".c1"), tl, 0.2, { gradientSize: 320, gradientColor: "#3f3f46", path: [[0, -100, 80], [1.8, 560, 300], [3.6, 120, 380], [4.6, 700, 60]] });
MW.magicCard(q(".c2"), tl, 0.2, { mode: "orb", path: [[0.4, 80, 80], [2.2, 560, 340], [4, 200, 200]], leave: 4.2 });`,
  },
};
