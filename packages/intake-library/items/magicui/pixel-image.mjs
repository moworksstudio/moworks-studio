// Magic UI pixel-image (apps/www/registry/magicui/pixel-image.tsx at efe76fc): rows x cols copies of a picture (grid "6x4": 6 columns,
// 4 rows; presets 8x8, 8x3, 4x6, 3x8, or a custom 1-16), each clipped to its cell (polygon clip-path), fading in over pixelFadeInDuration
// (1000 ms, ease-out cubic-bezier(0, 0, 0.2, 1)) after a random delay up to maxAnimationDelay (1200 ms); then, after colorRevealDelay
// (1300 ms), every copy turns from greyscale to colour over 1000 ms cubic-bezier(0.4, 0, 0.2, 1). Box 288 px (384 md), radius 2.5rem,
// object-fit cover. Port: the same tiles; delays seeded; tweens on the film's timeline.
import { LANDSCAPE } from "../../demo-media.mjs";

export default {
  id: "pixel-image",
  kind: "motion",
  title: "Pixel Image",
  sub: "Ảnh hiện từng ô rồi lên màu",
  desc: "A picture appears tile by tile in random order, then turns from grey to colour (6 x 4 tiles, 1 s fades, colour after 1.3 s).",
  category: "Effects & overlays",
  tags: ["image", "reveal", "tiles", "pixel", "grayscale", "magicui"],
  source: { path: "apps/www/registry/magicui/pixel-image.tsx" },
  notes: "el is the holder (position relative, sized); src is the film's picture. Docs say 8x8 and a 1500 ms colour delay: the code has 6x4 and 1300 ms (the code wins).",
  options: { src: "picture path", grid: "6x4 | 8x8 | 8x3 | 4x6 | 3x8", customGrid: "{ rows, cols } 1-16", grayscaleAnimation: "true", pixelFadeInDuration: "s (1)", maxAnimationDelay: "s (1.2)", colorRevealDelay: "s (1.3)", radius: "px (40)", seed: "1" },
  defaults: { src: "assets/picture.svg", grid: "6x4", customGrid: null, grayscaleAnimation: true, pixelFadeInDuration: 1, maxAnimationDelay: 1.2, colorRevealDelay: 1.3, radius: 40, seed: 1 },
  uses: ["rand", "bezier"],
  css: `.mw-pixel-image { position: relative; user-select: none; }
.mw-pixel-image > div { position: absolute; inset: 0; }
.mw-pixel-image img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }`,
  markup: `<div class="mw-pixel-image" style="width:384px;height:384px"></div>`,
  fn: function (el, tl, at, o) {
    var G = { "6x4": [4, 6], "8x8": [8, 8], "8x3": [3, 8], "4x6": [6, 4], "3x8": [8, 3] }, g = o.customGrid ? [o.customGrid.rows, o.customGrid.cols] : G[o.grid] || G["6x4"];
    var rows = g[0], cols = g[1], r = MW.rand(o.seed * 4027), fade = MW.bezier(0, 0, 0.2, 1), col = MW.bezier(0.4, 0, 0.2, 1), imgs = [];
    for (var i = 0; i < rows * cols; i++) {
      var row = Math.floor(i / cols), c = i % cols, d = document.createElement("div"), img = document.createElement("img");
      d.style.clipPath = "polygon(" + c * (100 / cols) + "% " + row * (100 / rows) + "%, " + (c + 1) * (100 / cols) + "% " + row * (100 / rows) + "%, " + (c + 1) * (100 / cols) + "% " + (row + 1) * (100 / rows) + "%, " + c * (100 / cols) + "% " + (row + 1) * (100 / rows) + "%)";
      img.src = o.src; img.alt = ""; img.style.borderRadius = o.radius + "px"; d.appendChild(img); el.appendChild(d); imgs.push(img);
      tl.fromTo(d, { opacity: 0 }, { opacity: 1, duration: o.pixelFadeInDuration, ease: fade, immediateRender: true }, at + r() * o.maxAnimationDelay);
    }
    if (o.grayscaleAnimation) tl.fromTo(imgs, { filter: "grayscale(1)" }, { filter: "grayscale(0)", duration: 1, ease: col, immediateRender: true }, at + o.colorRevealDelay);
    return at + Math.max(o.maxAnimationDelay + o.pixelFadeInDuration, o.colorRevealDelay + 1);
  },
  assets: [{ path: "picture.svg", data: LANDSCAPE }],
  demo: {
    duration: 5,
    css: `.mw-pixel-image { width: 1040px; height: 650px; }`,
    html: `<div class="center"><div class="mw-pixel-image"></div></div>`,
    run: `MW.pixelImage(q(".mw-pixel-image"), tl, 0.4, { grid: "8x8" });`,
  },
};
