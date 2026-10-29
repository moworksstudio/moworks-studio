// Magic UI striped-pattern (apps/www/registry/magicui/striped-pattern.tsx at efe76fc): a 10 x 10 <pattern> of three diagonal lines
// (direction left '/', right '\'), stroke-width 0.5, currentColor. Static upstream. Port: the same pattern; `drift` (px/s, default 0)
// slides it, which makes it usable as a moving hatch.
export default {
  id: "striped-pattern",
  kind: "motion",
  title: "Striped Pattern",
  sub: "Nền sọc chéo mảnh",
  desc: "A background of thin diagonal hatch lines for placeholders, caution or editorial panels; static or sliding slowly.",
  category: "Backgrounds",
  tags: ["stripes", "hatch", "diagonal", "pattern", "background", "magicui"],
  source: { path: "apps/www/registry/magicui/striped-pattern.tsx" },
  notes: "Static upstream; drift is this port's option. The docs say 40 px and an offset: the code has 10 px and none (the code wins).",
  options: { direction: "left | right (left)", width: "10", height: "10", strokeWidth: "0.5", dasharray: "none", color: "currentColor", drift: "[x, y] px/s ([0, 0])", hold: "seconds (10)" },
  defaults: { direction: "left", width: 10, height: 10, strokeWidth: 0.5, dasharray: "", color: "currentColor", drift: [0, 0], hold: 10 },
  css: `.mw-striped-pattern { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }`,
  markup: `<svg class="mw-striped-pattern" aria-hidden="true"></svg>`,
  fn: function (el, tl, at, o) {
    var id = "mw-stripe-" + (MW.__sp = (MW.__sp || 0) + 1), w = o.width, h = o.height, st = ' stroke="' + o.color + '" stroke-width="' + o.strokeWidth + '"' + (o.dasharray ? ' stroke-dasharray="' + o.dasharray + '"' : "");
    var lines = o.direction === "left"
      ? '<line x1="0" y1="' + h + '" x2="' + w + '" y2="0"' + st + '/><line x1="' + -w + '" y1="' + h + '" x2="0" y2="0"' + st + '/><line x1="' + w + '" y1="' + h + '" x2="' + w * 2 + '" y2="0"' + st + "/>"
      : '<line x1="0" y1="0" x2="' + w + '" y2="' + h + '"' + st + '/><line x1="' + -w + '" y1="0" x2="0" y2="' + h + '"' + st + '/><line x1="' + w + '" y1="0" x2="' + w * 2 + '" y2="' + h + '"' + st + "/>";
    el.innerHTML = '<defs><pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse">' + lines + '</pattern></defs><rect width="100%" height="100%" fill="url(#' + id + ')"/>';
    if (!o.drift[0] && !o.drift[1]) return at;
    var pat = el.querySelector("pattern"), s = { t: 0 };
    var set = function () { pat.setAttribute("x", o.drift[0] * s.t); pat.setAttribute("y", o.drift[1] * s.t); };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.holder { position: absolute; inset: 0; color: rgba(250,250,250,.35); -webkit-mask-image: radial-gradient(700px circle at center, white, transparent); mask-image: radial-gradient(700px circle at center, white, transparent); }
.tag { position: relative; z-index: 20; padding: 30px 60px; border-radius: 20px; background: #09090b; border: 2px solid #3f3f46; font-size: 64px; font-weight: 700; }`,
    html: `<div class="holder"><svg class="mw-striped-pattern" aria-hidden="true"></svg></div><div class="center"><div class="tag">Đang thi công</div></div>`,
    run: `MW.stripedPattern(q(".mw-striped-pattern"), tl, 0, { width: 28, height: 28, strokeWidth: 2, drift: [14, 0], hold: 6 });`,
  },
};
