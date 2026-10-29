// Magic UI animated-grid-pattern (apps/www/registry/magicui/animated-grid-pattern.tsx at efe76fc): the grid-pattern lines (cell 40,
// x = y = -1) with numSquares (50) cells that fade 0 -> maxOpacity (0.5) over `duration` (4 s), wait repeatDelay (0.5 s), fade back
// (repeat 1, reverse), then jump to a new random cell and start again after their index delay (i x 0.1 s); motion's default easeInOut.
// Port: the same cycle per square from the film's time; the random cells come from a seeded generator per square and cycle.
export default {
  id: "animated-grid-pattern",
  kind: "motion",
  title: "Animated Grid Pattern",
  sub: "Lưới kẻ có ô sáng lên tắt dần",
  desc: "A line grid on which random cells softly light up and fade out, each coming back at a new spot: the familiar tech backdrop.",
  category: "Backgrounds",
  tags: ["grid", "pattern", "background", "cells", "tech", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-grid-pattern.tsx" },
  notes: "One square's cycle: delay i x 0.1 s, fade in `duration`, hold repeatDelay, fade out `duration`, then a new cell. Upstream demo: 30 squares, maxOpacity 0.1, duration 3, repeatDelay 1, radial mask, skewY(12deg).",
  options: { width: "40", height: "40", numSquares: "50", maxOpacity: "0.5", duration: "s (4)", repeatDelay: "s (0.5)", color: "rgba(156,163,175,0.3)", hold: "seconds (12)", seed: "1" },
  defaults: { width: 40, height: 40, x: -1, y: -1, numSquares: 50, maxOpacity: 0.5, duration: 4, repeatDelay: 0.5, color: "rgba(156,163,175,0.3)", hold: 12, seed: 1 },
  uses: ["rand", "bezier"],
  css: `.mw-animated-grid-pattern { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }`,
  markup: `<svg class="mw-animated-grid-pattern" aria-hidden="true"></svg>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", id = "mw-agp-" + (MW.__agp = (MW.__agp || 0) + 1), w = o.width, h = o.height;
    var W = el.getBoundingClientRect().width, H = el.getBoundingClientRect().height;
    el.innerHTML = '<defs><pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse" x="' + o.x + '" y="' + o.y + '">' +
      '<path d="M.5 ' + h + "V.5H" + w + '" fill="none" stroke="' + o.color + '"/></pattern></defs><rect width="100%" height="100%" fill="url(#' + id + ')"/>';
    var g = document.createElementNS(NS, "svg"); g.setAttribute("x", o.x); g.setAttribute("y", o.y); g.style.overflow = "visible"; el.appendChild(g);
    var ease = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), sq = [];
    for (var i = 0; i < o.numSquares; i++) {
      var r = document.createElementNS(NS, "rect"); r.setAttribute("width", w - 1); r.setAttribute("height", h - 1); r.setAttribute("fill", o.color); r.setAttribute("stroke-width", "0"); g.appendChild(r);
      sq.push({ r: r, rand: MW.rand(o.seed * 7919 + i * 104729), cells: [] });
    }
    var cellOf = function (q, k) {                                   // the k-th cell of square q (seeded, cached)
      while (q.cells.length <= k) q.cells.push([Math.floor((q.rand() * W) / w), Math.floor((q.rand() * H) / h)]);
      return q.cells[k];
    };
    var s = { t: 0 };
    var set = function () {
      for (var i = 0; i < sq.length; i++) {
        var q = sq[i], P = i * 0.1 + 2 * o.duration + o.repeatDelay, k = Math.floor(s.t / P), u = s.t - k * P - i * 0.1, op = 0;
        if (u >= 0) op = u < o.duration ? o.maxOpacity * ease(u / o.duration) : u < o.duration + o.repeatDelay ? o.maxOpacity : o.maxOpacity * (1 - ease(Math.min(1, (u - o.duration - o.repeatDelay) / o.duration)));
        var c = cellOf(q, k);
        q.r.setAttribute("x", c[0] * w + 1); q.r.setAttribute("y", c[1] * h + 1); q.r.setAttribute("opacity", op);
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.holder { position: absolute; left: 0; right: 0; top: -30%; height: 160%; transform: skewY(12deg); -webkit-mask-image: radial-gradient(900px circle at center, white, transparent); mask-image: radial-gradient(900px circle at center, white, transparent); }`,
    html: `<div class="holder"><svg class="mw-animated-grid-pattern" aria-hidden="true"></svg></div><div class="center"><div class="h1">Hạ tầng cho video</div></div>`,
    run: `MW.animatedGridPattern(q(".mw-animated-grid-pattern"), tl, 0, { width: 64, height: 64, numSquares: 40, maxOpacity: 1, duration: 2, repeatDelay: 0.6, color: "rgba(156,163,175,0.35)", hold: 8 });`,
  },
};
