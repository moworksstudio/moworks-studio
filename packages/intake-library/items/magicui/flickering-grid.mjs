// Magic UI flickering-grid (apps/www/registry/magicui/flickering-grid.tsx at efe76fc): a canvas grid of squareSize (4) px squares with
// gridGap (6) px between them; each square holds an opacity in [0, maxOpacity (0.3)] and re-rolls it with probability flickerChance (0.3)
// x deltaTime every frame, like a dim LED panel; colour rgb(0, 0, 0). Port: each square becomes a seeded Poisson process of the same rate
// (its flips computed once), so the frame at any time is exact; drawn on the canvas from the film's time.
export default {
  id: "flickering-grid",
  kind: "motion",
  title: "Flickering Grid",
  sub: "Lưới ô vuông nhấp nháy như bảng LED",
  desc: "A grid of tiny squares whose brightness flickers at random, like a dim LED panel: a quiet tech texture under titles and UI.",
  category: "Backgrounds",
  tags: ["flicker", "led", "grid", "pixels", "texture", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/flickering-grid.tsx" },
  notes: "el is a <canvas> sized by its box (device pixels follow window.devicePixelRatio as upstream). Docs say maxOpacity 0.2: the code has 0.3 (the code wins).",
  options: { squareSize: "px (4)", gridGap: "px (6)", flickerChance: "per second (0.3)", color: "rgb(0, 0, 0)", maxOpacity: "0.3", hold: "seconds (10)", seed: "1" },
  defaults: { squareSize: 4, gridGap: 6, flickerChance: 0.3, color: "rgb(0, 0, 0)", maxOpacity: 0.3, hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-flickering-grid { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }`,
  markup: `<canvas class="mw-flickering-grid"></canvas>`,
  fn: function (el, tl, at, o) {
    var W = el.clientWidth, H = el.clientHeight, dpr = window.devicePixelRatio || 1, ctx = el.getContext("2d");
    el.width = W * dpr; el.height = H * dpr;
    var p = document.createElement("canvas").getContext("2d"); p.fillStyle = o.color; p.fillRect(0, 0, 1, 1);
    var px = p.getImageData(0, 0, 1, 1).data, rgba = "rgba(" + px[0] + ", " + px[1] + ", " + px[2] + ",";
    var step = o.squareSize + o.gridGap, cols = Math.ceil(W / step), rows = Math.ceil(H / step), n = cols * rows, r = MW.rand(o.seed * 6007);
    // each square: its start value, then flips at exponential gaps (rate flickerChance), each with a new value
    var times = [], vals = [];
    for (var i = 0; i < n; i++) {
      var ts = [], vs = [r() * o.maxOpacity], t = 0;
      while (true) { t += -Math.log(1 - r()) / o.flickerChance; if (t > o.hold) break; ts.push(t); vs.push(r() * o.maxOpacity); }
      times.push(ts); vals.push(vs);
    }
    var s = { t: 0 };
    var draw = function () {
      ctx.clearRect(0, 0, el.width, el.height);
      for (var c = 0; c < cols; c++) for (var j = 0; j < rows; j++) {
        var k = c * rows + j, ts = times[k], m = 0;
        while (m < ts.length && ts[m] <= s.t) m++;
        ctx.fillStyle = rgba + vals[k][m] + ")";
        ctx.fillRect(c * step * dpr, j * step * dpr, o.squareSize * dpr, o.squareSize * dpr);
      }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.holder { position: absolute; inset: 0; -webkit-mask-image: radial-gradient(760px circle at center, white, transparent); mask-image: radial-gradient(760px circle at center, white, transparent); }
.holder canvas { width: 100%; height: 100%; display: block; }`,
    html: `<div class="holder"><canvas class="mw-flickering-grid"></canvas></div><div class="center"><div class="h1">Bảng đèn LED</div></div>`,
    run: `MW.flickeringGrid(q(".mw-flickering-grid"), tl, 0, { squareSize: 8, gridGap: 8, color: "#60A5FA", maxOpacity: 0.6, flickerChance: 1.2, hold: 6 });`,
  },
};
