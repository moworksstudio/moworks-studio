// Magic UI particles (apps/www/registry/magicui/particles.tsx at efe76fc): `quantity` (100) faint dots (size 0.4 + 0 or 1 px, target
// alpha 0.1-0.7) drifting very slowly (dx, dy +-0.05 px a frame, plus vx / vy), fading in 0.02 a frame and fading out within 20 px of
// an edge, leaning toward the mouse (translate eases by 1 / ease toward mouse / (staticity / magnetism), magnetism 0.1-4.1); a dot that
// leaves the box is replaced by a new one. Port: the same per-frame steps replayed at 60 fps from the start with a seeded generator; the
// mouse becomes an optional scripted pointer path.
export default {
  id: "particles",
  kind: "motion",
  title: "Particles",
  sub: "Bụi chấm trôi rất chậm",
  desc: "Faint dots drifting very slowly across the frame and leaning toward a pointer: a quiet dust layer for dark hero frames.",
  category: "Backgrounds",
  tags: ["particles", "dust", "dots", "ambient", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/particles.tsx" },
  notes: "Without a pointer it is near-static dust, as upstream. `pointer` lists [t, x, y] points (px from the centre of the box), linear between them.",
  options: { quantity: "100", staticity: "50", ease: "50", size: "0.4", color: "#ffffff", vx: "0", vy: "0", pointer: "[[t, x, y], ...] (none)", hold: "seconds (10)", seed: "1" },
  defaults: { quantity: 100, staticity: 50, ease: 50, size: 0.4, color: "#ffffff", vx: 0, vy: 0, pointer: null, hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-particles { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }`,
  markup: `<canvas class="mw-particles"></canvas>`,
  fn: function (el, tl, at, o) {
    var W = el.offsetWidth, H = el.offsetHeight, dpr = window.devicePixelRatio || 1, ctx = el.getContext("2d");
    el.width = W * dpr; el.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var hex = o.color.replace("#", ""), full = hex.length === 3 ? hex.split("").map(function (c) { return c + c; }).join("") : hex, n = parseInt(full, 16);
    var rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    var mouseAt = function (t) {
      var p = o.pointer; if (!p || !p.length) return [0, 0];
      if (t <= p[0][0]) return [p[0][1], p[0][2]];
      for (var k = 1; k < p.length; k++) if (t <= p[k][0]) { var a = p[k - 1], b = p[k], f = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return [p[p.length - 1][1], p[p.length - 1][2]];
    };
    var simulate = function (frames) {
      var r = MW.rand(o.seed * 7703);
      var make = function () { return { x: Math.floor(r() * W), y: Math.floor(r() * H), tx: 0, ty: 0, size: Math.floor(r() * 2) + o.size, alpha: 0, target: parseFloat((r() * 0.6 + 0.1).toFixed(1)), dx: (r() - 0.5) * 0.1, dy: (r() - 0.5) * 0.1, mag: 0.1 + r() * 4 }; };
      var C = []; for (var i = 0; i < o.quantity; i++) C.push(make());
      for (var f = 0; f < frames; f++) {
        var m = mouseAt(f / 60);
        for (var i = 0; i < C.length; i++) {
          var c = C[i], edge = Math.min(c.x + c.tx - c.size, W - c.x - c.tx - c.size, c.y + c.ty - c.size, H - c.y - c.ty - c.size), rem = Math.max(0, parseFloat((edge / 20).toFixed(2)));
          if (rem > 1) { c.alpha += 0.02; if (c.alpha > c.target) c.alpha = c.target; } else c.alpha = c.target * rem;
          c.x += c.dx + o.vx; c.y += c.dy + o.vy;
          c.tx += (m[0] / (o.staticity / c.mag) - c.tx) / o.ease; c.ty += (m[1] / (o.staticity / c.mag) - c.ty) / o.ease;
          if (c.x < -c.size || c.x > W + c.size || c.y < -c.size || c.y > H + c.size) C[i] = make();
        }
      }
      return C;
    };
    var s = { t: 0 }, draw = function () {
      var C = simulate(Math.round(s.t * 60));
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < C.length; i++) { var c = C[i]; ctx.beginPath(); ctx.arc(c.x + c.tx, c.y + c.ty, c.size, 0, 2 * Math.PI); ctx.fillStyle = "rgba(" + rgb.join(", ") + ", " + c.alpha + ")"; ctx.fill(); }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 7,
    html: `<canvas class="mw-particles"></canvas><div class="center"><div class="h1">Bụi sao</div></div>`,
    run: `MW.particles(q(".mw-particles"), tl, 0, { quantity: 300, size: 1.2, vx: 0.25, vy: -0.15, staticity: 30, pointer: [[0, -600, -200], [3.5, 600, 250], [7, -300, 300]], hold: 7 });`,
  },
};
