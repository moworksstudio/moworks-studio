// Magic UI backlight (apps/www/registry/magicui/backlight.tsx at efe76fc): an ambilight glow behind a picture, video or SVG made from the
// content itself: an SVG filter (region -50 % / 200 %) blurs the source (stdDeviation 20), saturates it x 4 and composites the source over
// it. No motion upstream: a moving child (a video, the film's footage) makes it move. Port: the same filter; `fadeIn` (s, default 0)
// can bring the glow up on the film's timeline.
import { LANDSCAPE } from "../../demo-media.mjs";

export default {
  id: "backlight",
  kind: "motion",
  title: "Backlight",
  sub: "Quầng sáng lấy màu từ chính ảnh",
  desc: "An ambilight glow behind a picture or video, made from a blurred, over-saturated copy of the content itself, so the glow takes the picture's colours.",
  category: "Effects & overlays",
  tags: ["glow", "ambilight", "halo", "image", "video", "magicui"],
  source: { path: "apps/www/registry/magicui/backlight.tsx" },
  notes: "Static upstream; the glow follows whatever plays inside (a HyperFrames video clip works). fadeIn is this port's option. Upstream demos: blur 5 (logos), 20 (photo), 40 (video).",
  options: { blur: "stdDeviation (20)", saturate: "4", fadeIn: "s to bring the glow up (0: always on)" },
  defaults: { blur: 20, saturate: 4, fadeIn: 0 },
  css: `.mw-backlight { position: relative; }`,
  markup: `<div class="mw-backlight"><img src="assets/picture.svg" alt=""></div>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", id = "mw-backlight-" + (MW.__bl = (MW.__bl || 0) + 1);
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.style.position = "absolute";
    svg.innerHTML = '<filter id="' + id + '" y="-50%" x="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="' + o.blur + '" result="blurred"></feGaussianBlur>' +
      '<feColorMatrix type="saturate" in="blurred" values="' + o.saturate + '"></feColorMatrix><feComposite in="SourceGraphic" operator="over"></feComposite></filter>';
    el.insertBefore(svg, el.firstChild);
    var inner = document.createElement("div");
    while (svg.nextSibling) inner.appendChild(svg.nextSibling);
    el.appendChild(inner);
    inner.style.filter = "url(#" + id + ")";
    if (!o.fadeIn) return at;
    var blur = svg.querySelector("feGaussianBlur"), s = { v: 0 };
    var set = function () { blur.setAttribute("stdDeviation", o.blur * s.v); svg.querySelector("feColorMatrix").setAttribute("values", 1 + (o.saturate - 1) * s.v); };
    set();
    tl.fromTo(s, { v: 0 }, { v: 1, duration: o.fadeIn, ease: "power2.out", onUpdate: set, immediateRender: false }, at);
    return at + o.fadeIn;
  },
  assets: [{ path: "picture.svg", data: LANDSCAPE }],
  demo: {
    duration: 5,
    css: `.mw-backlight img { display: block; width: 960px; height: 600px; border-radius: 32px; }`,
    html: `<div class="center"><div class="mw-backlight"><img src="assets/picture.svg" alt=""></div></div>`,
    run: `MW.backlight(q(".mw-backlight"), tl, 0.3, { blur: 40, fadeIn: 1.5 });`,
  },
};
