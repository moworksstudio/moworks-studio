// Magic UI icon-cloud (apps/www/registry/magicui/icon-cloud.tsx at efe76fc): icons on a Fibonacci sphere (radius 100 in a 400 px canvas;
// y = i x 2/n - 1 + 1/n, phi = i x pi(3 - sqrt 5)), turning every frame by (dy / H, dx / W) x speed with speed = 0.003 + distance share x
// 0.01 from the pointer (at the corner (0, 0) when idle, so it always turns); each icon projected with scale (z + 200) / 300 and opacity
// max(0.2, min(1, (z + 150) / 200)); a click eases the sphere to bring an icon to the front (easeOutCubic, 800-2000 ms). Port: the same
// maths per 60 fps frame from the film's time; the icons are DOM elements (so any SVG or picture works without waiting for images);
// the pointer is fixed or keyed; `focus` brings an icon to the front at a time. Upstream's demo uses brand icons (not taken).
export default {
  id: "icon-cloud",
  kind: "block",
  title: "Icon Cloud",
  sub: "Quả cầu biểu tượng xoay 3D",
  desc: "A sphere of icons or round pictures turning in 3D, nearer ones larger and brighter, and turning to bring one icon to the front on cue.",
  category: "Showcase & media",
  tags: ["icons", "sphere", "3d", "integrations", "cloud", "rotate", "magicui"],
  source: { path: "apps/www/registry/magicui/icon-cloud.tsx" },
  notes: "el holds the icons (any elements, about 40 px). pointer: [x, y] px in the 400 px canvas (default the corner (0, 0), upstream's idle pointer). focus: [[t, index], ...].",
  options: { size: "px (400)", pointer: "[0, 0]", focus: "[[t, index], ...] (none)", focusDuration: "s (1.2)" },
  defaults: { size: 400, pointer: [0, 0], focus: [], focusDuration: 1.2 },
  css: `.mw-icon-cloud { position: relative; }
.mw-icon-cloud > * { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; will-change: transform, opacity; }`,
  markup: `<div class="mw-icon-cloud" style="width:400px;height:400px"></div>`,
  fn: function (el, tl, at, o) {
    var icons = Array.prototype.slice.call(el.children), n = icons.length || 20, k = o.size / 400, P = [], inc = Math.PI * (3 - Math.sqrt(5)), off = 2 / n;
    el.style.width = el.style.height = o.size + "px";
    for (var i = 0; i < n; i++) { var y = i * off - 1 + off / 2, r = Math.sqrt(1 - y * y), ph = i * inc; P.push([Math.cos(ph) * r * 100, y * 100, Math.sin(ph) * r * 100]); }
    var cx = 200, cy = 200, maxD = Math.sqrt(cx * cx + cy * cy), dx = o.pointer[0] - cx, dy = o.pointer[1] - cy, speed = 0.003 + (Math.sqrt(dx * dx + dy * dy) / maxD) * 0.01;
    var rate = [(dy / 400) * speed, (dx / 400) * speed];          // radians a frame
    var cubic = function (t) { return 1 - Math.pow(1 - t, 3); };
    var rotAt = function (t) {
      var rx = 0, ry = 0, last = 0;
      for (var q = 0; q < o.focus.length; q++) {
        var f = o.focus[q], tf = f[0];
        if (t < tf) break;
        rx += rate[0] * (tf - last) * 60; ry += rate[1] * (tf - last) * 60;
        var p = P[f[1] % n], tx = -Math.atan2(p[1], Math.sqrt(p[0] * p[0] + p[2] * p[2])), ty = Math.atan2(p[0], p[2]);
        var u = Math.min(1, (t - tf) / o.focusDuration), e = cubic(u);
        var ex = rx + (tx - rx) * e, ey = ry + (ty - ry) * e;
        if (u < 1) return [ex, ey];
        rx = tx; ry = ty; last = tf + o.focusDuration;
      }
      return [rx + rate[0] * (t - last) * 60, ry + rate[1] * (t - last) * 60];
    };
    var s = { t: 0 }, set = function () {
      var R = rotAt(s.t), cX = Math.cos(R[0]), sX = Math.sin(R[0]), cY = Math.cos(R[1]), sY = Math.sin(R[1]);
      for (var i = 0; i < icons.length; i++) {
        var p = P[i], x = p[0] * cY - p[2] * sY, z = p[0] * sY + p[2] * cY, yy = p[1] * cX + z * sX, sc = (z + 200) / 300, op = Math.max(0.2, Math.min(1, (z + 150) / 200));
        icons[i].style.transform = "translate(" + x * k + "px, " + yy * k + "px) scale(" + sc * k + ")"; icons[i].style.opacity = op; icons[i].style.zIndex = Math.round(z + 200);
      }
    };
    set();
    var end = Math.max(8, o.focus.length ? o.focus[o.focus.length - 1][0] + o.focusDuration + 2 : 8);
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 8,
    css: `.mw-icon-cloud > i { border-radius: 12px; display: grid; place-items: center; font-style: normal; font-weight: 800; font-size: 20px; color: #fff; }`,
    html: `<div class="center"><div class="mw-icon-cloud">${["#f97316", "#0ea5e9", "#22c55e", "#eab308", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#06b6d4", "#f43f5e", "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#d946ef", "#64748b", "#fb7185", "#22d3ee", "#4ade80", "#facc15", "#c084fc", "#2dd4bf"].map((c, i) => `<i style="background:${c}">${"MOWRKSTUDIA"[i % 11]}</i>`).join("")}</div></div>`,
    run: `MW.iconCloud(q(".mw-icon-cloud"), tl, 0, { size: 900, focus: [[3.5, 7]] });`,
  },
};
