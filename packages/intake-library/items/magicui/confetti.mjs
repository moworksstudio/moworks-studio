// Magic UI confetti (apps/www/registry/magicui/confetti.tsx at efe76fc): a React wrapper around canvas-confetti (Kiril Vatev, ISC) with
// demo recipes. Port: canvas-confetti's particle step (randomPhysics + updateFetti in src/confetti.js 1.9.3: x += cos(angle) x v + drift,
// y += sin(angle) x v + 3 x gravity, v *= decay, wobble, tilt += 0.1, alpha 1 - tick / ticks, squares / circles / stars and text
// shapes) re-written here with a seeded generator; each burst is replayed from its fire time at 60 ticks a second, so any frame is exact.
// Defaults are canvas-confetti's; recipes basic, fireworks, side-cannons, stars, emoji from Magic UI's demos.
export default {
  id: "confetti",
  kind: "motion",
  title: "Confetti",
  sub: "Pháo giấy bắn tung (canvas-confetti)",
  desc: "Bursts of tumbling paper confetti with real physics (gravity, drag, wobble): a basic pop, fireworks, side cannons, stars or emoji, fired at chosen times.",
  category: "Effects & overlays",
  tags: ["confetti", "celebration", "burst", "fireworks", "particles", "canvas", "magicui"],
  source: { path: "apps/www/registry/magicui/confetti.tsx" },
  upstream: "canvas-confetti 1.9.3 (Kiril Vatev, ISC): its particle physics re-written with a seeded generator",
  thirdParty: [{ name: "canvas-confetti 1.9.3", author: "Kiril Vatev", licence: "ISC", link: "https://github.com/catdad/canvas-confetti", npm: "https://www.npmjs.com/package/canvas-confetti/v/1.9.3", made: "adapted (physics re-written, seeded)" }],
  notes: "el is a full-frame <canvas>. bursts: [{ at, recipe | options }] in s after `at`; options are canvas-confetti's (particleCount, angle, spread, startVelocity, decay, gravity, drift, ticks, origin {x, y}, colors, shapes, scalar, flat). canvas-confetti's random size jitter per tick is seeded too.",
  options: { bursts: "[{ at: 0, recipe: 'basic' }]", recipes: "basic | fireworks | side-cannons | stars | emoji", emoji: "for the emoji recipe ('🎉')", seed: "1", hold: "seconds drawn (5)" },
  defaults: { bursts: [{ at: 0, recipe: "basic" }], emoji: "🎉", seed: 1, hold: 5 },
  uses: ["rand"],
  css: `.mw-confetti { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100; }`,
  markup: `<canvas class="mw-confetti"></canvas>`,
  fn: function (el, tl, at, o) {
    var W = el.clientWidth, H = el.clientHeight, ctx = el.getContext("2d");
    el.width = W; el.height = H;
    var DEF = { particleCount: 50, angle: 90, spread: 45, startVelocity: 45, decay: 0.9, gravity: 1, drift: 0, ticks: 200, origin: { x: 0.5, y: 0.5 }, shapes: ["square", "circle"],
      colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"], scalar: 1, flat: false };
    var hex = function (c) { c = String(c).replace(/[^0-9a-f]/gi, ""); if (c.length < 6) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) }; };
    var merge = function (a) { var r = {}, k; for (k in DEF) r[k] = DEF[k]; for (k in a) r[k] = a[k]; return r; };
    // the recipes of Magic UI's confetti demos: one "shot" list each, [time s, options]
    var recipe = function (name) {
      var out = [];
      if (name === "fireworks") {
        for (var t = 0; t < 5; t += 0.25) {
          var left = 5 - t, count = 50 * (left / 5), d = { startVelocity: 30, spread: 360, ticks: 60, particleCount: count };
          out.push([t, merge(Object.assign({}, d, { origin: { x: [0.1, 0.3], y: -0.2 } }))]); out.push([t, merge(Object.assign({}, d, { origin: { x: [0.7, 0.9], y: -0.2 } }))]);
        }
      } else if (name === "side-cannons") {
        var c = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
        for (var f = 0; f < 180; f++) { out.push([f / 60, merge({ particleCount: 2, angle: 60, spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors: c })]); out.push([f / 60, merge({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors: c })]); }
      } else if (name === "stars") {
        var sd = { spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30, colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"] };
        [0, 0.1, 0.2].forEach(function (t) { out.push([t, merge(Object.assign({}, sd, { particleCount: 40, scalar: 1.2, shapes: ["star"] }))]); out.push([t, merge(Object.assign({}, sd, { particleCount: 10, scalar: 0.75, shapes: ["circle"] }))]); });
      } else if (name === "emoji") {
        var ed = { spread: 360, ticks: 60, gravity: 0, decay: 0.96, startVelocity: 20, scalar: 2 };
        [0, 0.1, 0.2].forEach(function (t) { out.push([t, merge(Object.assign({}, ed, { particleCount: 30, shapes: ["text"] }))]); out.push([t, merge(Object.assign({}, ed, { particleCount: 5, scalar: 1, shapes: ["circle"] }))]); out.push([t, merge(Object.assign({}, ed, { particleCount: 15, scalar: 1, shapes: ["circle"] }))]); });
      } else out.push([0, merge({})]);
      return out;
    };
    var shots = [];
    (o.bursts || []).forEach(function (b) { (b.recipe ? recipe(b.recipe) : [[0, merge(b.options || {})]]).forEach(function (s) { shots.push([b.at + s[0], s[1]]); }); });
    // canvas-confetti randomPhysics for every particle of every shot, from a seed per shot
    var parts = [];
    shots.forEach(function (sh, k) {
      var op = sh[1], r = MW.rand(o.seed * 7001 + k * 131), n = Math.floor(op.particleCount);
      var ox = Array.isArray(op.origin.x) ? op.origin.x[0] + r() * (op.origin.x[1] - op.origin.x[0]) : op.origin.x;
      var oy = typeof op.origin.y === "number" && op.origin.y < 0 ? r() + op.origin.y : op.origin.y;          // the fireworks recipe: random() - 0.2
      for (var i = 0; i < n; i++) {
        var a = op.angle * Math.PI / 180, sp = op.spread * Math.PI / 180;
        parts.push({ t0: sh[0], x: W * ox, y: H * oy, wobble: r() * 10, wobbleSpeed: Math.min(0.11, r() * 0.1 + 0.05), velocity: op.startVelocity * 0.5 + r() * op.startVelocity,
          angle2D: -a + (0.5 * sp - r() * sp), tiltAngle: (r() * (0.75 - 0.25) + 0.25) * Math.PI, color: hex(op.colors[i % op.colors.length]), shape: op.shapes[Math.floor(r() * op.shapes.length)],
          ticks: op.ticks, decay: op.decay, drift: op.drift, gravity: op.gravity * 3, scalar: op.scalar, flat: op.flat, jitter: o.seed * 104729 + k * 1009 + i * 17 });
      }
    });
    var drawOne = function (p, ticksDone) {
      // replay the per-tick recurrence from the fire time (at most `ticks` steps)
      var x = p.x, y = p.y, v = p.velocity, wob = p.wobble, tilt = p.tiltAngle, rr = MW.rand(p.jitter), rnd = 2, wx = 0, wy = 0, ts = 0, tc = 0;
      for (var k = 0; k <= ticksDone; k++) {
        x += Math.cos(p.angle2D) * v + p.drift; y += Math.sin(p.angle2D) * v + p.gravity; v *= p.decay;
        if (p.flat) { wob = 0; wx = x + 10 * p.scalar; wy = y + 10 * p.scalar; ts = 0; tc = 0; rnd = 1; }
        else { wob += p.wobbleSpeed; wx = x + 10 * p.scalar * Math.cos(wob); wy = y + 10 * p.scalar * Math.sin(wob); tilt += 0.1; ts = Math.sin(tilt); tc = Math.cos(tilt); rnd = rr() + 2; }
      }
      var progress = ticksDone / p.ticks, x1 = x + rnd * tc, y1 = y + rnd * ts, x2 = wx + rnd * tc, y2 = wy + rnd * ts;
      ctx.fillStyle = "rgba(" + p.color.r + ", " + p.color.g + ", " + p.color.b + ", " + (1 - progress) + ")";
      ctx.beginPath();
      if (p.shape === "circle") ctx.ellipse(x, y, Math.abs(x2 - x1) * 0.6, Math.abs(y2 - y1) * 0.6, Math.PI / 10 * wob, 0, 2 * Math.PI);
      else if (p.shape === "star") { var rot = Math.PI / 2 * 3, inner = 4 * p.scalar, outer = 8 * p.scalar, spikes = 5, step = Math.PI / spikes; while (spikes--) { ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer); rot += step; ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner); rot += step; } }
      else if (p.shape === "text") {
        ctx.save(); ctx.globalAlpha = 1 - progress; ctx.translate(x, y); ctx.rotate(Math.PI / 10 * wob); ctx.scale(Math.max(0.05, Math.abs(x2 - x1) * 0.1), Math.max(0.05, Math.abs(y2 - y1) * 0.1));
        ctx.font = 32 * p.scalar + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.emoji, 0, 0); ctx.restore(); return;
      }
      else { ctx.moveTo(Math.floor(x), Math.floor(y)); ctx.lineTo(Math.floor(wx), Math.floor(y1)); ctx.lineTo(Math.floor(x2), Math.floor(y2)); ctx.lineTo(Math.floor(x1), Math.floor(wy)); }
      ctx.closePath(); ctx.fill();
    };
    var s = { t: 0 }, draw = function () {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) { var p = parts[i], n = Math.floor((s.t - p.t0) * 60); if (n < 0 || n >= p.ticks) continue; drawOne(p, n); }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.mw-confetti { display: block; }`,
    html: `<div class="center"><div class="col"><div class="h1">Chúc mừng! 🎉</div><div class="p">Đơn hàng thứ một triệu</div></div></div><canvas class="mw-confetti"></canvas>`,
    run: `MW.confetti(q(".mw-confetti"), tl, 0, { bursts: [{ at: 0.3, options: { particleCount: 160, spread: 90, startVelocity: 55, origin: { x: 0.5, y: 0.65 }, scalar: 1.6 } }, { at: 2.6, recipe: "stars" }, { at: 4.2, recipe: "side-cannons" }], hold: 8 });`,
  },
};
