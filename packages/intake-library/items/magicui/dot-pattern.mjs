// Magic UI dot-pattern (apps/www/registry/magicui/dot-pattern.tsx at efe76fc): one circle per 16 x 16 cell (cx = cy = 1, r 1,
// neutral-400 at 80 %); glow mode fills them with a radial gradient and each dot breathes opacity 0.4 -> 1 -> 0.4, scale 1 -> 1.5 -> 1
// over a random 2-5 s after a random 0-5 s delay, easeInOut, forever (reverse). Port: the same dots; glow timing seeded per dot and drawn
// from the film's time.
export default {
  id: "dot-pattern",
  kind: "motion",
  title: "Dot Pattern",
  sub: "Nền lưới chấm, có thể lấp lánh",
  desc: "A full-frame grid of small dots, static or softly twinkling (glow), for UI and data backdrops; mask it to fade at the edges.",
  category: "Backgrounds",
  tags: ["dots", "pattern", "background", "grid", "twinkle", "magicui"],
  source: { path: "apps/www/registry/magicui/dot-pattern.tsx" },
  notes: "Static unless glow is on. Thousands of dots: for glow keep the spacing large (24 px or more) on a full HD frame.",
  options: { width: "16", height: "16", x: "0", y: "0", cx: "1", cy: "1", cr: "1", glow: "false", color: "rgba(161,161,161,0.8)", hold: "seconds (10)", seed: "1" },
  defaults: { width: 16, height: 16, x: 0, y: 0, cx: 1, cy: 1, cr: 1, glow: false, color: "rgba(161,161,161,0.8)", hold: 10, seed: 1 },
  uses: ["rand", "bezier"],
  css: `.mw-dot-pattern { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }`,
  markup: `<svg class="mw-dot-pattern" aria-hidden="true"></svg>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", id = "mw-dot-" + (MW.__dp = (MW.__dp || 0) + 1), b = el.getBoundingClientRect();
    var cols = Math.ceil(b.width / o.width), rows = Math.ceil(b.height / o.height), r = MW.rand(o.seed * 1009), dots = [];
    el.style.color = o.color;
    el.innerHTML = '<defs><radialGradient id="' + id + '"><stop offset="0%" stop-color="currentColor" stop-opacity="1"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>';
    for (var i = 0; i < cols * rows; i++) {
      var c = document.createElementNS(NS, "circle"), x = (i % cols) * o.width + o.cx + o.x, y = Math.floor(i / cols) * o.height + o.cy + o.y;
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", o.cr); c.setAttribute("fill", o.glow ? "url(#" + id + ")" : "currentColor");
      el.appendChild(c); dots.push({ c: c, x: x, y: y, delay: r() * 5, dur: r() * 3 + 2 });
    }
    if (!o.glow) return at;
    var ease = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), s = { t: 0 };
    var set = function () {
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], u = s.t - d.delay, op = 0.4, sc = 1;
        if (u > 0) {
          var k = Math.floor(u / d.dur), f = (u - k * d.dur) / d.dur;
          if (k % 2 === 1) f = 1 - f;                                  // repeatType reverse
          var half = f < 0.5, e = ease(half ? f * 2 : f * 2 - 1);
          op = half ? 0.4 + 0.6 * e : 1 - 0.6 * e; sc = half ? 1 + 0.5 * e : 1.5 - 0.5 * e;
        }
        d.c.setAttribute("opacity", op); d.c.setAttribute("r", o.cr * sc);
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 7,
    css: `.holder { position: absolute; inset: 0; -webkit-mask-image: radial-gradient(700px circle at center, white, transparent); mask-image: radial-gradient(700px circle at center, white, transparent); }`,
    html: `<div class="holder"><svg class="mw-dot-pattern" aria-hidden="true"></svg></div><div class="center"><div class="h1">Lưới chấm</div></div>`,
    run: `MW.dotPattern(q(".mw-dot-pattern"), tl, 0, { width: 32, height: 32, cx: 2, cy: 2, cr: 3, glow: true, color: "rgba(196,181,253,0.9)", hold: 7 });`,
  },
};
