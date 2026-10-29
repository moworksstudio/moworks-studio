// Magic UI animated-shiny-text (apps/www/registry/magicui/animated-shiny-text.tsx at efe76fc): muted text with a narrow light band
// (shimmerWidth 100 px) that pans across, holds, pans back on an 8 s loop (registry keyframe "shiny-text": 0 / 90 / 100 % off the left,
// 30-60 % off the right; CSS default ease per segment). Port: the same layers; the keyframe becomes GSAP keyframes with CSS "ease".
export default {
  id: "animated-shiny-text",
  kind: "motion",
  title: "Animated Shiny Text",
  sub: "Ánh sáng lướt qua chữ xám, lặp",
  desc: "Muted grey text with a narrow light glint (100 px) that sweeps across, waits, sweeps back, on an 8 s loop.",
  category: "Text & titles",
  tags: ["shimmer", "shine", "glint", "text", "loop", "badge", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-shiny-text.tsx" },
  notes: "Registry keyframe shiny-text: 0%, 90%, 100% background-position calc(-100% - width) 0; 30%, 60% calc(100% + width) 0; 8 s infinite (CSS ease per segment). Text colour neutral-400/70 on dark, neutral-600/70 on light.",
  options: { shimmerWidth: "px (100)", period: "seconds per loop (8)", color: "text colour (rgba(163,163,163,.7))", shine: "band colour (rgba(255,255,255,.8))", hold: "seconds (8)" },
  defaults: { shimmerWidth: 100, period: 8, color: "rgba(163,163,163,0.7)", shine: "rgba(255,255,255,0.8)", hold: 8 },
  uses: ["bezier"],
  css: `.mw-animated-shiny-text { display: inline-block; padding: 0.12em 0; margin: -0.12em 0; color: var(--mw-st-color);
  background-image: linear-gradient(to right, transparent, var(--mw-st-shine) 50%, transparent); background-size: var(--mw-st-w, 100px) 100%;
  background-repeat: no-repeat; background-position: calc(-100% - var(--mw-st-w, 100px)) 0; -webkit-background-clip: text; background-clip: text; }`,
  markup: `<span class="mw-animated-shiny-text">✨ Giới thiệu Magic UI</span>`,
  fn: function (el, tl, at, o) {
    el.style.setProperty("--mw-st-w", o.shimmerWidth + "px");
    el.style.setProperty("--mw-st-color", o.color);
    el.style.setProperty("--mw-st-shine", o.shine);
    // background-position in px: off the left (-width) to off the right (box width + width); percentages of a no-repeat layer scale with
    // (box - layer), so px keep upstream's travel exact
    var W = el.offsetWidth, w = o.shimmerWidth, off = -w - (W - w), on = (W - w) * 2 + w;
    var css = MW.bezier.apply(null, MW.CSS_EASE.ease), P = o.period;
    // the keyframe as a function of time: 0-30 % out, 30-60 % hold, 60-90 % back, 90-100 % hold
    var s = { t: 0 };
    var set = function () {
      var f = (s.t % P) / P, v;
      if (f < 0.3) v = off + (on - off) * css(f / 0.3);
      else if (f < 0.6) v = on;
      else if (f < 0.9) v = on + (off - on) * css((f - 0.6) / 0.3);
      else v = off;
      el.style.backgroundPosition = v + "px 0";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.pill { padding: 28px 64px; border-radius: 999px; border: 2px solid rgba(255,255,255,.08); background: #18181b; font-size: 76px; font-weight: 500; }`,
    html: `<div class="center"><div class="pill"><span class="mw-animated-shiny-text">✨ Giới thiệu Moworks Studio →</span></div></div>`,
    run: `MW.animatedShinyText(q(".mw-animated-shiny-text"), tl, 0, { shimmerWidth: 220, hold: 8 });`,
  },
};
