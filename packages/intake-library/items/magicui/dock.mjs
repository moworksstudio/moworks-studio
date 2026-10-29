// Magic UI dock (apps/www/registry/magicui/dock.tsx at efe76fc): a macOS-style dock (h 58 px, padding 8, gap 8, radius 16, 1 px border,
// backdrop blur, white 10 %) of round icons (40 px, padding max(6, 20 %)) that grow toward the pointer: each icon's size maps its distance
// to the pointer [-140, 0, 140] -> [40, 60, 40] px (clamped) through a spring (mass 0.1, stiffness 150, damping 12); the row re-flows as
// sizes change. Port: the pointer becomes a path of x positions (or Infinity = away) over time; the springs and the re-flow are stepped at
// 240 Hz from the start, so any frame is exact.
export default {
  id: "dock",
  kind: "block",
  title: "Dock",
  sub: "Thanh dock phóng to biểu tượng",
  desc: "A macOS-style dock whose icons magnify around a pointer gliding along it: the desktop-app and integrations beat.",
  category: "UI & mockups",
  tags: ["dock", "macos", "icons", "magnify", "desktop", "pointer", "magicui"],
  source: { path: "apps/www/registry/magicui/dock.tsx" },
  notes: "el is the dock; its children are the icons. path: [[t, x], ...] (x in px from the dock's left edge at rest, in its own units even when the dock is scaled; null = pointer away), linear. Upstream's demo icons are brand logos (trademarks): plain glyphs here.",
  options: { iconSize: "px (40)", iconMagnification: "px (60)", iconDistance: "px (140)", path: "[[t, x], ...]" },
  defaults: { iconSize: 40, iconMagnification: 60, iconDistance: 140, path: null },
  css: `.mw-dock { display: flex; width: max-content; align-items: center; justify-content: center; gap: 8px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.12); padding: 8px; backdrop-filter: blur(12px); background: rgba(255,255,255,0.1); }
.mw-dock > * { display: flex; aspect-ratio: 1; align-items: center; justify-content: center; border-radius: 9999px; flex: none; }
.mw-dock > * > svg { width: 100%; height: 100%; }`,
  markup: `<div class="mw-dock"><div>…</div><div>…</div></div>`,
  fn: function (el, tl, at, o) {
    var icons = Array.prototype.slice.call(el.children), n = icons.length, S = o.iconSize, M = o.iconMagnification, D = o.iconDistance, pad = Math.max(6, S * 0.2);
    icons.forEach(function (ic) { ic.style.width = ic.style.height = S + "px"; ic.style.padding = pad + "px"; });
    var W0 = el.offsetWidth, cx = W0 / 2, path = o.path || [[0, null], [0.5, -20], [2.5, W0 + 20], [3, null]];       // x in the dock's own px (0 = its left edge at rest)
    var px = function (t) {
      if (t <= path[0][0]) return path[0][1];
      for (var k = 1; k < path.length; k++) if (t <= path[k][0]) { var a = path[k - 1], b = path[k]; if (a[1] == null || b[1] == null) return t - a[0] < b[0] - t ? a[1] : b[1]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
      return path[path.length - 1][1];
    };
    var end = path[path.length - 1][0] + 1, dt = 1 / 240, N = Math.ceil(end / dt) + 1, sizes = new Float32Array(N * n), size = [], vel = [];
    for (var i = 0; i < n; i++) { size.push(S); vel.push(0); }
    for (var f = 0; f < N; f++) {
      var x = px(f * dt), total = 16 + 8 * (n - 1);                // dock padding 8 + 8 and the gaps
      for (var i2 = 0; i2 < n; i2++) total += size[i2];
      var left = cx - total / 2 + 8;                                 // the row is centred on the dock's resting centre
      for (var i3 = 0; i3 < n; i3++) {
        var c = left + size[i3] / 2, d = x == null ? Infinity : x - c, target = !isFinite(d) || Math.abs(d) >= D ? S : S + (M - S) * (1 - Math.abs(d) / D);
        vel[i3] += ((150 * (target - size[i3]) - 12 * vel[i3]) / 0.1) * dt; size[i3] += vel[i3] * dt;
        left += size[i3] + 8; sizes[f * n + i3] = size[i3];
      }
    }
    var s = { t: 0 }, set = function () { var f = Math.max(0, Math.min(N - 1, Math.round(s.t / dt))); for (var i = 0; i < n; i++) icons[i].style.width = icons[i].style.height = sizes[f * n + i] + "px"; };
    set();
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.desk { position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 20%, #4c1d95, #0f172a 70%); }
.wrap { position: absolute; left: 0; right: 0; bottom: 120px; display: flex; justify-content: center; transform: scale(2.4); transform-origin: 50% 100%; }
.mw-dock > div { background: rgba(255,255,255,0.12); }`,
    html: `<div class="desk"></div><div class="wrap"><div class="mw-dock">
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z" fill="#fafafa"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><path d="M12 3v12M6 9l6-6 6 6M5 21h14"/></svg></div>
<div><svg viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg></div>
</div></div>`,
    run: `MW.dock(q(".mw-dock"), tl, 0.2, { path: [[0, null], [0.4, 10], [2.4, 334], [3.6, 150], [4.6, 150], [5, null]] });`,
  },
};
