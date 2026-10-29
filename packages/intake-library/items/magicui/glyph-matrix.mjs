// Magic UI glyph-matrix (apps/www/registry/magicui/glyph-matrix.tsx at efe76fc): a canvas grid of faint monospace glyphs
// ('01·•+*/\<>=', cell 14 px, font cellSize - 2 px) at alpha 0.05-0.40; every 90 ms max(1, floor(cells x 0.04)) random cells get a new
// glyph and alpha 0.05-0.50; rows fade toward the bottom (alpha x (1 - row / rows x 0.6)); colour #6B7280. Port: the same ticks, seeded,
// replayed from the start for the frame asked (the state is a function of the film's time).
export default {
  id: "glyph-matrix",
  kind: "motion",
  title: "Glyph Matrix",
  sub: "Lưới ký tự mã đổi liên tục",
  desc: "A grid of faint monospace glyphs that keep mutating and fade toward the bottom: a subtle code / data texture for developer-tool scenes.",
  category: "Backgrounds",
  tags: ["glyphs", "code", "matrix", "ascii", "texture", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/glyph-matrix.tsx" },
  notes: "Upstream's font is ui-monospace / SFMono / Menlo (system fonts): here a monospace family the film ships (JetBrains Mono by default).",
  options: { glyphs: "'01·•+*/\\<>='", cellSize: "px (14)", mutationRate: "share of cells per tick (0.04)", interval: "ms per tick (90)", fadeBottom: "0.6", color: "#6B7280", font: "'JetBrains Mono', monospace", hold: "seconds (10)", seed: "1" },
  defaults: { glyphs: "01·•+*/\\<>=", cellSize: 14, mutationRate: 0.04, interval: 90, fadeBottom: 0.6, color: "#6B7280", font: "'JetBrains Mono', monospace", hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-glyph-matrix { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; font-family: 'JetBrains Mono', monospace; }`,
  markup: `<canvas class="mw-glyph-matrix"></canvas>`,
  fn: function (el, tl, at, o) {
    var w = el.clientWidth, h = el.clientHeight, dpr = window.devicePixelRatio || 1, ctx = el.getContext("2d");
    el.width = w * dpr; el.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var p = document.createElement("canvas").getContext("2d"); p.fillStyle = "#6B7280"; p.fillStyle = o.color; p.fillRect(0, 0, 1, 1);
    var px = p.getImageData(0, 0, 1, 1).data, ca = px[3] / 255;
    var cols = Math.ceil(w / o.cellSize), rows = Math.ceil(h / o.cellSize), total = cols * rows, G = o.glyphs;
    var r = MW.rand(o.seed * 3001), start = [], startA = [];
    for (var i = 0; i < total; i++) { start.push(G[Math.floor(r() * G.length)]); startA.push(0.05 + r() * 0.35); }
    // the mutations of every tick, drawn once from the seed
    var ticks = Math.floor((o.hold * 1000) / o.interval), per = Math.max(1, Math.floor(total * o.mutationRate)), muts = [];
    for (var k = 0; k < ticks; k++) { var m = []; for (var j = 0; j < per; j++) m.push([Math.floor(r() * total), G[Math.floor(r() * G.length)], 0.05 + r() * 0.45]); muts.push(m); }
    var s = { t: 0 }, cells = [], alphas = [];
    var draw = function () {
      cells = start.slice(); alphas = startA.slice();
      var upto = Math.min(ticks, Math.floor((s.t * 1000) / o.interval));
      for (var k = 0; k < upto; k++) for (var j = 0; j < muts[k].length; j++) { var q = muts[k][j]; cells[q[0]] = q[1]; alphas[q[0]] = q[2]; }
      ctx.clearRect(0, 0, w, h);
      ctx.font = o.cellSize - 2 + "px " + o.font; ctx.textBaseline = "top";
      for (var y = 0; y < rows; y++) {
        var fade = o.fadeBottom > 0 ? 1 - (y / rows) * o.fadeBottom : 1;
        for (var x = 0; x < cols; x++) { var i = y * cols + x; ctx.fillStyle = "rgba(" + px[0] + ", " + px[1] + ", " + px[2] + ", " + alphas[i] * fade * ca + ")"; ctx.fillText(cells[i], x * o.cellSize, y * o.cellSize); }
      }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.mw-glyph-matrix { display: block; }`,
    html: `<canvas class="mw-glyph-matrix"></canvas><div class="center"><div class="col"><div class="h1" style="font-family:'JetBrains Mono',monospace;font-size:110px">npx moworks</div><div class="p">Công cụ cho lập trình viên</div></div></div>`,
    run: `MW.glyphMatrix(q(".mw-glyph-matrix"), tl, 0, { cellSize: 28, color: "#a1a1aa", hold: 6 });`,
  },
};
