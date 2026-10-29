// Magic UI hero-video-dialog (apps/www/registry/magicui/hero-video-dialog.tsx at efe76fc): a video thumbnail (rounded, shadow) with a
// frosted play button (112 px blurred disc, an 80 px gradient disc, a white play glyph); on click a backdrop (black 50 %, blur) fades in and
// the player springs in (animationStyle: from-center scale 0.5 -> 1 with opacity, or from-bottom / -top / -left / -right, fade, ...; spring
// damping 30, stiffness 300), a close button above it; the player is a YouTube iframe. Port: the click is a time; the hover is an option;
// the player holds the film's own video clip or picture (no iframe, no network).
import { LANDSCAPE } from "../../demo-media.mjs";

export default {
  id: "hero-video-dialog",
  kind: "block",
  title: "Hero Video Dialog",
  sub: "Ảnh video có nút play, bật hộp phát",
  desc: "A video thumbnail with a frosted play button; pressing it opens a player that springs in over a blurred, darkened backdrop.",
  category: "UI & mockups",
  tags: ["video", "play", "modal", "dialog", "thumbnail", "hero", "magicui"],
  source: { path: "apps/www/registry/magicui/hero-video-dialog.tsx" },
  notes: "el is the holder (the scene's frame: the backdrop covers it). thumbnail / media: picture paths; for a real clip put a HyperFrames <video class=\"clip\"> in .mw-hv-player. The play glyph is lucide's Play (ISC).",
  options: { thumbnail: "picture path", media: "player picture (the thumbnail)", animationStyle: "from-center | from-bottom | from-top | from-left | from-right | fade | top-in-bottom-out | left-in-right-out", hover: "s (none)", open: "s (1)", close: "s (none)" },
  defaults: { thumbnail: "assets/picture.svg", media: null, animationStyle: "from-center", hover: null, open: 1, close: null },
  uses: ["spring", "bezier"],
  css: `.mw-hero-video-dialog { position: absolute; inset: 0; display: grid; place-items: center; }
.mw-hv-thumb { position: relative; width: 62%; }
.mw-hv-thumb > img { display: block; width: 100%; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 15px -3px rgba(0,0,0,.3); }
.mw-hv-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.mw-hv-ring { width: 112px; height: 112px; border-radius: 9999px; background: rgba(250,250,250,0.1); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; }
.mw-hv-disc { width: 80px; height: 80px; border-radius: 9999px; background: linear-gradient(to bottom, rgba(250,250,250,0.3), #fafafa); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); }
.mw-hv-disc svg { width: 32px; height: 32px; fill: #fff; color: #fff; }
.mw-hv-back { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px); opacity: 0; }
.mw-hv-player { position: relative; aspect-ratio: 16 / 9; width: 56rem; max-width: 80%; }
.mw-hv-player > .mw-hv-frame { position: relative; isolation: isolate; width: 100%; height: 100%; overflow: hidden; border-radius: 16px; border: 2px solid #fff; }
.mw-hv-player > .mw-hv-frame > img, .mw-hv-player > .mw-hv-frame > video { width: 100%; height: 100%; object-fit: cover; display: block; }
.mw-hv-close { position: absolute; top: -64px; right: 0; border-radius: 9999px; background: rgba(23,23,23,0.5); padding: 8px; color: #fff; box-shadow: 0 0 0 1px rgba(255,255,255,0.4); backdrop-filter: blur(12px); display: flex; }
.mw-hv-close svg { width: 20px; height: 20px; }`,
  markup: `<div class="mw-hero-video-dialog"></div>`,
  fn: function (el, tl, at, o) {
    var esc = function (s) { return String(s).replace(/"/g, "&quot;"); };
    el.innerHTML = '<div class="mw-hv-thumb"><img src="' + esc(o.thumbnail) + '" alt=""><div class="mw-hv-play"><div class="mw-hv-ring"><div class="mw-hv-disc"><svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3l14 9-14 9z"/></svg></div></div></div></div>' +
      '<div class="mw-hv-back"><div class="mw-hv-player"><div class="mw-hv-close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></div>' +
      '<div class="mw-hv-frame"><img src="' + esc(o.media || o.thumbnail) + '" alt=""></div></div></div>';
    var img = el.querySelector(".mw-hv-thumb > img"), play = el.querySelector(".mw-hv-play"), disc = el.querySelector(".mw-hv-disc"), back = el.querySelector(".mw-hv-back"), player = el.querySelector(".mw-hv-player");
    var out = MW.bezier(0, 0, 0.2, 1), fade = MW.bezier(0.25, 0.1, 0.35, 1), sp = MW.spring(300, 30, 1);
    gsap.set(play, { scale: 0.9 });
    if (o.hover != null) {
      tl.to(img, { filter: "brightness(0.8)", duration: 0.2, ease: out }, at + o.hover);
      tl.to(play, { scale: 1, duration: 0.2, ease: out }, at + o.hover);
      tl.to(disc, { scale: 1.2, duration: 0.2, ease: out }, at + o.hover);
    }
    var V = { "from-bottom": [{ y: "100%" }, { y: "100%" }], "from-center": [{ scale: 0.5 }, { scale: 0.5 }], "from-top": [{ y: "-100%" }, { y: "-100%" }], "from-left": [{ x: "-100%" }, { x: "-100%" }],
      "from-right": [{ x: "100%" }, { x: "100%" }], fade: [{}, {}], "top-in-bottom-out": [{ y: "-100%" }, { y: "100%" }], "left-in-right-out": [{ x: "-100%" }, { x: "100%" }] }[o.animationStyle] || [{ scale: 0.5 }, { scale: 0.5 }];
    var t0 = at + o.open, inFrom = Object.assign({ opacity: 0 }, V[0]), inTo = { opacity: 1, x: 0, y: 0, scale: 1, duration: sp.duration, ease: sp.ease, immediateRender: false };
    tl.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: fade, immediateRender: false }, t0);
    tl.fromTo(player, inFrom, inTo, t0);
    var end = t0 + sp.duration;
    if (o.close != null) { var t1 = at + o.close; tl.to(player, Object.assign({ opacity: 0, duration: sp.duration, ease: sp.ease }, V[1]), t1); tl.to(back, { opacity: 0, duration: 0.3, ease: fade }, t1); end = t1 + sp.duration; }
    return end;
  },
  assets: [{ path: "picture.svg", data: LANDSCAPE }],
  demo: {
    duration: 5,
    css: `.mw-hv-player { width: 1300px; }`,
    html: `<div class="mw-hero-video-dialog"></div>`,
    run: `MW.heroVideoDialog(q(".mw-hero-video-dialog"), tl, 0, { hover: 0.6, open: 1.4, close: 4.2 });`,
  },
};
