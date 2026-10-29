// Magic UI progressive-blur (apps/www/registry/magicui/progressive-blur.tsx at efe76fc): eight stacked layers at the bottom (or top, or
// both) of a container, each a backdrop-filter blur (0.5, 1, 2, 4, 8, 16, 32, 64 px) masked to a 12.5 % band that overlaps its
// neighbours, so the blur grows toward the edge (iOS-style); height 30 %. Static upstream. Port: the same layers; `reveal` (s, default 0)
// can grow the blur in from 0 on the film's timeline.
import { LANDSCAPE } from "../../demo-media.mjs";

export default {
  id: "progressive-blur",
  kind: "motion",
  title: "Progressive Blur",
  sub: "Nhoè tăng dần ở mép khung",
  desc: "A graded blur at the bottom (or top, or both) edge of a container, stronger toward the edge, like an iOS scroll fade over a feed or captions.",
  category: "Effects & overlays",
  tags: ["blur", "fade", "edge", "glass", "feed", "magicui"],
  source: { path: "apps/www/registry/magicui/progressive-blur.tsx" },
  notes: "el is the layer (inside a position: relative container, over the content). Static upstream; reveal is this port's option (blur levels scale 0 -> 1).",
  options: { height: "% (30)", position: "top | bottom | both (bottom)", blurLevels: "[0.5, 1, 2, 4, 8, 16, 32, 64]", reveal: "s to grow in (0)" },
  defaults: { height: "30%", position: "bottom", blurLevels: [0.5, 1, 2, 4, 8, 16, 32, 64], reveal: 0 },
  css: `.mw-progressive-blur { pointer-events: none; position: absolute; left: 0; right: 0; z-index: 10; }
.mw-progressive-blur > div { position: absolute; inset: 0; }`,
  markup: `<div class="mw-progressive-blur"></div>`,
  fn: function (el, tl, at, o) {
    var P = o.position, L = o.blurLevels, n = L.length;
    if (P === "top") el.style.top = 0; else if (P === "bottom") el.style.bottom = 0; else { el.style.top = 0; el.style.bottom = 0; }
    el.style.height = P === "both" ? "100%" : o.height;
    var dir = P === "bottom" ? "to bottom, " : P === "top" ? "to top, " : "", both = "linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)";
    var masks = [P === "both" ? both : "linear-gradient(" + dir + "rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 37.5%)"];
    for (var i = 1; i < n - 1; i++) masks.push(P === "both" ? both : "linear-gradient(" + dir + "rgba(0,0,0,0) " + i * 12.5 + "%, rgba(0,0,0,1) " + (i + 1) * 12.5 + "%, rgba(0,0,0,1) " + (i + 2) * 12.5 + "%, rgba(0,0,0,0) " + ((i + 2) * 12.5 + 12.5) + "%)");
    masks.push(P === "both" ? both : "linear-gradient(" + dir + "rgba(0,0,0,0) 87.5%, rgba(0,0,0,1) 100%)");
    var layers = masks.map(function (m, i) { var d = document.createElement("div"); d.style.zIndex = i + 1; d.style.webkitMaskImage = d.style.maskImage = m; el.appendChild(d); return d; });
    var set = function (k) { layers.forEach(function (d, i) { d.style.backdropFilter = d.style.webkitBackdropFilter = "blur(" + L[i] * k + "px)"; }); };
    if (!o.reveal) { set(1); return at; }
    var s = { k: 0 }; set(0);
    tl.fromTo(s, { k: 0 }, { k: 1, duration: o.reveal, ease: "power2.out", onUpdate: function () { set(s.k); }, immediateRender: false }, at);
    return at + o.reveal;
  },
  assets: [{ path: "picture.svg", data: LANDSCAPE }],
  demo: {
    duration: 5,
    css: `.feed { position: relative; width: 760px; height: 900px; border-radius: 40px; overflow: hidden; border: 2px solid #27272a; background: #0b0b0e; }
.feed .list { position: absolute; left: 0; right: 0; top: 0; padding: 30px; display: flex; flex-direction: column; gap: 26px; }
.feed img { width: 100%; height: 300px; object-fit: cover; border-radius: 26px; display: block; } .feed .row { font-size: 32px; font-weight: 600; } .feed .row small { display: block; font-size: 24px; font-weight: 400; opacity: .55; }`,
    html: `<div class="center"><div class="feed"><div class="list"><img src="assets/picture.svg" alt=""><div class="row">Hoàng hôn trên hồ<small>Bộ sưu tập mùa thu</small></div>
<img src="assets/picture.svg" alt="" style="filter:hue-rotate(140deg)"><div class="row">Đồi tím buổi chiều<small>Phong cảnh</small></div><img src="assets/picture.svg" alt="" style="filter:hue-rotate(260deg)"></div>
<div class="mw-progressive-blur"></div></div></div>`,
    run: `MW.progressiveBlur(q(".mw-progressive-blur"), tl, 0, { height: "40%" });
tl.fromTo(q(".feed .list"), { y: 0 }, { y: -560, duration: 4.5, ease: "power1.inOut" }, 0.3);`,
  },
};
