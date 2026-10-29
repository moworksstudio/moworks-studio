// Magic UI interactive-grid-pattern (apps/www/registry/magicui/interactive-grid-pattern.tsx at efe76fc): a 24 x 24 grid of 40 px
// cells (stroke gray-400 at 30 %); the cell under the mouse fills gray-300 at 30 % in 0.1 s (ease-in-out) and fades back over 1 s when
// the mouse leaves. Port: the mouse becomes a scripted pointer path; each cell replays the same CSS transitions from the film's time.
export default {
  id: "interactive-grid-pattern",
  kind: "motion",
  title: "Interactive Grid Pattern",
  sub: "Lưới ô sáng theo con trỏ đi qua",
  desc: "A grid of square cells that light up under a moving pointer and fade out behind it, leaving a soft trail.",
  category: "Backgrounds",
  tags: ["grid", "hover", "trail", "pointer", "background", "magicui"],
  source: { path: "apps/www/registry/magicui/interactive-grid-pattern.tsx" },
  notes: "Upstream reacts to the mouse; here `path` lists [t, x, y] points (px in the grid's box) the pointer passes, linear between them.",
  options: { width: "40", height: "40", squares: "[24, 24]", path: "[[t, x, y], ...] (a diagonal sweep)", line: "rgba(156,163,175,0.3)", fill: "rgba(209,213,219,0.3)" },
  defaults: { width: 40, height: 40, squares: [24, 24], path: null, line: "rgba(156,163,175,0.3)", fill: "rgba(209,213,219,0.3)" },
  uses: ["bezier"],
  css: `.mw-interactive-grid-pattern { position: absolute; inset: 0; width: 100%; height: 100%; }`,
  markup: `<svg class="mw-interactive-grid-pattern"></svg>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", H = o.squares[0], V = o.squares[1], w = o.width, h = o.height, cells = [];
    el.setAttribute("width", w * H); el.setAttribute("height", h * V); el.style.border = "1px solid " + o.line;
    for (var i = 0; i < H * V; i++) {
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("x", (i % H) * w); r.setAttribute("y", Math.floor(i / H) * h); r.setAttribute("width", w); r.setAttribute("height", h);
      r.setAttribute("stroke", o.line); r.setAttribute("fill", o.fill); r.setAttribute("fill-opacity", 0); el.appendChild(r); cells.push(r);
    }
    var path = o.path || [[0, -50, h * V * 0.2], [2.5, w * H + 50, h * V * 0.8], [3, w * H + 50, h * V * 0.8], [5.5, -50, h * V * 0.3]];
    var at2 = function (t) {
      if (t <= path[0][0]) return path[0];
      for (var k = 1; k < path.length; k++) if (t <= path[k][0]) { var a = path[k - 1], b = path[k], f = (t - a[0]) / (b[0] - a[0]); return [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return path[path.length - 1];
    };
    var cellAt = function (t) { var p = at2(t), cx = Math.floor(p[1] / w), cy = Math.floor(p[2] / h); return cx < 0 || cy < 0 || cx >= H || cy >= V ? -1 : cy * H + cx; };
    // enter / leave times per cell on a 60 fps grid
    var end = path[path.length - 1][0], visits = {}, prev = -1;
    for (var f = 0; f <= Math.ceil(end * 60) + 1; f++) {
      var c = cellAt(f / 60);
      if (c !== prev) { if (prev >= 0) visits[prev][visits[prev].length - 1][1] = f / 60; if (c >= 0) (visits[c] = visits[c] || []).push([f / 60, Infinity]); prev = c; }
    }
    var e = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), s = { t: 0 };
    var set = function () {
      for (var key in visits) {
        var v = visits[key], val = 0, t = s.t;
        for (var j = 0; j < v.length; j++) {
          var on = v[j][0], off = v[j][1];
          if (t < on) break;
          var start = val;                                    // value when this visit began (after the previous fade)
          if (t < off) { val = start + (1 - start) * e(Math.min(1, (t - on) / 0.1)); continue; }
          var peak = start + (1 - start) * e(Math.min(1, (off - on) / 0.1));
          val = peak * (1 - e(Math.min(1, (t - off) / 1)));
        }
        cells[key].setAttribute("fill-opacity", val);
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: end + 1, duration: end + 1, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end + 1;
  },
  demo: {
    duration: 7,
    css: `.holder { position: absolute; left: 50%; top: 50%; width: 1920px; height: 1080px; transform: translate(-50%, -50%) skewY(8deg); -webkit-mask-image: radial-gradient(800px circle at center, white, transparent); mask-image: radial-gradient(800px circle at center, white, transparent); }`,
    html: `<div class="holder"><svg class="mw-interactive-grid-pattern"></svg></div><div class="center"><div class="h1">Lưới tương tác</div></div>`,
    run: `MW.interactiveGridPattern(q(".mw-interactive-grid-pattern"), tl, 0.2, { width: 80, height: 80, squares: [24, 14], fill: "rgba(196,181,253,0.45)", path: [[0, -60, 300], [2.6, 1980, 820], [3.2, 1980, 820], [5.8, -60, 380]] });`,
  },
};
