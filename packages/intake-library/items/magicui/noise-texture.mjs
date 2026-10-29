// Magic UI noise-texture (apps/www/registry/magicui/noise-texture.tsx at efe76fc): a full-size SVG rect filled through feTurbulence
// (fractalNoise, baseFrequency 0.4, 6 octaves, stitched) -> desaturated -> linear transfer (slope 0.15), at rect opacity 0.6 and layer
// opacity 0.5 (0.75 dark): a static grain. Port: the same filter; `animate` (default false = as upstream) re-seeds the noise every
// 1 / fps s on the film's time, for moving film grain.
export default {
  id: "noise-texture",
  kind: "motion",
  title: "Noise Texture",
  sub: "Lớp nhiễu hạt xám tĩnh",
  desc: "A subtle grey fractal-noise overlay for a grainy surface; static as upstream, or re-seeded at a set rate for moving grain.",
  category: "Effects & overlays",
  tags: ["noise", "grain", "texture", "overlay", "film", "magicui"],
  source: { path: "apps/www/registry/magicui/noise-texture.tsx" },
  notes: "Static upstream; animate / fps are this port's options (each frame a new feTurbulence seed).",
  options: { frequency: "0.4", octaves: "6", slope: "0.15", noiseOpacity: "0.6", layerOpacity: "0.75 (dark), 0.5 (light)", animate: "false", fps: "12", hold: "seconds when animated (10)" },
  defaults: { frequency: 0.4, octaves: 6, slope: 0.15, noiseOpacity: 0.6, layerOpacity: 0.75, animate: false, fps: 12, hold: 10 },
  css: `.mw-noise-texture { pointer-events: none; position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; user-select: none; }`,
  markup: `<svg class="mw-noise-texture"></svg>`,
  fn: function (el, tl, at, o) {
    var id = "mw-noise-" + (MW.__nt = (MW.__nt || 0) + 1);
    el.style.opacity = o.layerOpacity;
    el.innerHTML = '<filter id="' + id + '"><feTurbulence type="fractalNoise" baseFrequency="' + o.frequency + '" numOctaves="' + o.octaves + '" stitchTiles="stitch" seed="0"/>' +
      '<feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="' + o.slope + '"/><feFuncG type="linear" slope="' + o.slope + '"/><feFuncB type="linear" slope="' + o.slope + '"/></feComponentTransfer></filter>' +
      '<rect width="100%" height="100%" filter="url(#' + id + ')" opacity="' + o.noiseOpacity + '"/>';
    if (!o.animate) return at;
    var turb = el.querySelector("feTurbulence"), s = { t: 0 }, set = function () { turb.setAttribute("seed", Math.floor(s.t * o.fps)); };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 5,
    css: `.panel { position: relative; width: 1100px; height: 640px; border-radius: 36px; overflow: hidden; background: linear-gradient(135deg, #7c3aed, #db2777 55%, #f97316); display: grid; place-items: center; }
.panel .h1 { position: relative; z-index: 2; color: #fff; }`,
    html: `<div class="center"><div class="panel"><svg class="mw-noise-texture"></svg><div class="h1">Có hạt nhiễu</div></div></div>`,
    run: `MW.noiseTexture(q(".mw-noise-texture"), tl, 0, { slope: 0.6, noiseOpacity: 0.9, animate: true, hold: 5 });`,
  },
};
