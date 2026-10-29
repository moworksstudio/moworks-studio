// Magic UI floating-3d-particles (apps/www/registry/magicui/floating-3d-particles.tsx at efe76fc): `quantity` (400) soft dots in polar
// coordinates (angle, radius up to max(w, h) x 1.2, y in [-h, h]) slowly turning about a vertical axis (0.0015-0.0025 rad a frame) and
// drifting up `drift` (0.8 px a frame), wrapped at +-h with a new radius; perspective scale fov / (fov + distance + sin(angle) x
// depthRange) from `depth` (0.5: fov 500, distance 450, range 200); painter's sort by scale; colour #8B5CF6, size 5 (+-40 %), opacity 0.3
// (+-0.2). Port: the same maths in closed form per 60 fps frame (wraps counted, each new radius seeded), so any frame seeks exactly.
export default {
  id: "floating-3d-particles",
  kind: "motion",
  title: "Floating 3D Particles",
  sub: "Hạt mềm xoay chậm có chiều sâu",
  desc: "A field of soft dots slowly swirling around a vertical axis and drifting upward, sized and layered by depth: ambient motion behind titles and products.",
  category: "Backgrounds",
  tags: ["particles", "3d", "depth", "ambient", "swirl", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/floating-3d-particles.tsx" },
  notes: "el is a <canvas> filling its box. Upstream's mobile scaling (20 % below 768 px) and pausing are left out; DPR capped at 2 as upstream.",
  options: { quantity: "400", color: "#8B5CF6", size: "px (5)", opacity: "0.3", drift: "px a frame (0.8)", depth: "0..1 (0.5)", hold: "seconds (10)", seed: "1" },
  defaults: { quantity: 400, color: "#8B5CF6", size: 5, opacity: 0.3, drift: 0.8, depth: 0.5, hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-floating-3d-particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }`,
  markup: `<canvas class="mw-floating-3d-particles"></canvas>`,
  fn: function (el, tl, at, o) {
    var rect = el.getBoundingClientRect(), w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height)), dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
    var ctx = el.getContext("2d", { alpha: true }); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var t = Math.max(0, Math.min(1, o.depth)), fov = 800 - t * 600, pd = 100 + t * 700, dr = t * Math.min(400, fov + pd - 1);
    var hex = o.color.replace("#", ""), full = hex.length === 3 ? hex.split("").map(function (c) { return c + c; }).join("") : hex, n = parseInt(full, 16);
    var rgb = /^[0-9a-f]{6}$/i.test(full) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [139, 92, 246];
    var r = MW.rand(o.seed * 5309), P = [];
    for (var i = 0; i < o.quantity; i++) {
      var sv = o.size * 0.4;
      P.push({ a0: r() * Math.PI * 2, r0: r() * Math.max(w, h) * 1.2, y0: (r() - 0.5) * h * 2, size: Math.max(0.5, o.size - sv + r() * sv * 2), w: 0.0015 + r() * 0.001,
        op: Math.min(1, Math.max(0, o.opacity - 0.2 + r() * 0.4)), seed: o.seed * 9001 + i * 31, radii: [] });
    }
    // after frame n: y wrapped at -h back to h; the k-th wrap draws a new radius (seeded per particle)
    var at2 = function (p, frames) {
      var first = Math.floor((p.y0 + h) / o.drift) + 1, y, k = 0;
      if (frames < first) y = p.y0 - o.drift * frames;
      else { var m = Math.floor((2 * h) / o.drift) + 1, d = frames - first; k = Math.floor(d / m) + 1; y = h - o.drift * (d - (k - 1) * m); }
      while (p.radii.length < k) p.radii.push(MW.rand(p.seed + p.radii.length * 7)() * Math.max(w, h) * 1.2);
      return { y: y, radius: k ? p.radii[k - 1] : p.r0, angle: p.a0 + p.w * frames };
    };
    var s = { t: 0 }, draw = function () {
      var frames = Math.round(s.t * 60), cx = w / 2, cy = h / 2, list = [];
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < P.length; i++) {
        var st = at2(P[i], frames), sc = fov / Math.max(1, fov + pd + Math.sin(st.angle) * dr);
        list.push({ x: cx + Math.cos(st.angle) * st.radius * sc, y: cy + st.y * sc, s: sc, p: P[i] });
      }
      list.sort(function (a, b) { return a.s - b.s; });
      for (var j = 0; j < list.length; j++) { var q = list[j], rr = Math.max(0, q.p.size * q.s); if (rr <= 0) continue; ctx.beginPath(); ctx.fillStyle = "rgba(" + rgb.join(",") + "," + q.p.op + ")"; ctx.arc(q.x, q.y, rr, 0, Math.PI * 2); ctx.fill(); }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    html: `<canvas class="mw-floating-3d-particles"></canvas><div class="center"><div class="col"><div class="h1">Không gian sâu</div><div class="p">Hạt trôi chậm, có chiều sâu</div></div></div>`,
    run: `MW.floating3dParticles(q(".mw-floating-3d-particles"), tl, 0, { quantity: 1000, color: "#c4b5fd", depth: 0.8, opacity: 0.55, size: 6, drift: 1.2, hold: 8 });`,
  },
};
