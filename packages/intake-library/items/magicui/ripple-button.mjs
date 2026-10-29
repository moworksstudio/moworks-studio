// Magic UI ripple-button (apps/www/registry/magicui/ripple-button.tsx at efe76fc): each click adds a round ink ripple inside the button
// (size max(w, h), centred on the click point, colour #ffffff; its opacity-30 class is overridden by the keyframe) running keyframe "rippling" (opacity 1 -> 0, transform
// scale(0) -> scale(2)) over 600 ms ease-out; button 2 px border, radius 8, padding 8 x 16, overflow hidden. Since efe76fc (#1020) each
// ripple is its own ButtonRipple with its own timer and is removed `duration` after its own click, so overlapping ripples are cleaned up
// independently (before, a new click cancelled the older ripples' removal). Port: clicks become [t, x, y] (px in the button); each ripple
// is a pair of tweens on the film's timeline and leaves the button at its own end.
export default {
  id: "ripple-button",
  kind: "motion",
  title: "Ripple Button",
  sub: "Gợn mực tròn lan từ điểm bấm",
  desc: "A circular ink ripple spreads from the press point inside a button and fades (0.6 s), for each tap of a scripted cursor or finger.",
  category: "UI & mockups",
  tags: ["button", "ripple", "tap", "press", "click", "material", "magicui"],
  source: { path: "apps/www/registry/magicui/ripple-button.tsx" },
  notes: "clicks: [[t, x, y], ...] in s after `at` and px inside the button (default: its centre at 0 s).",
  options: { rippleColor: "#ffffff", duration: "s (0.6)", clicks: "[[0, x, y], ...]" },
  defaults: { rippleColor: "#ffffff", duration: 0.6, clicks: null },
  uses: ["bezier"],
  css: `.mw-ripple-button { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px; border: 2px solid currentColor; padding: 8px 16px; text-align: center; }
.mw-ripple-button > .mw-rp-label { position: relative; z-index: 10; }
.mw-ripple-button > .mw-rp-ink { pointer-events: none; position: absolute; inset: 0; }
.mw-ripple-button .mw-rp-ink > span { position: absolute; border-radius: 9999px; transform: scale(0); }`,
  markup: `<div class="mw-ripple-button">Bấm thử</div>`,
  fn: function (el, tl, at, o) {
    var label = document.createElement("div"); label.className = "mw-rp-label"; while (el.firstChild) label.appendChild(el.firstChild);
    var ink = document.createElement("span"); ink.className = "mw-rp-ink"; el.appendChild(label); el.appendChild(ink);
    var W = el.offsetWidth, H = el.offsetHeight, size = Math.max(W, H), e = MW.bezier.apply(null, MW.CSS_EASE.easeOut), last = 0;
    (o.clicks || [[0, W / 2, H / 2]]).forEach(function (c) {
      var r = document.createElement("span");
      r.style.width = r.style.height = size + "px"; r.style.left = c[1] - size / 2 + "px"; r.style.top = c[2] - size / 2 + "px"; r.style.backgroundColor = o.rippleColor; r.style.opacity = 0;
      ink.appendChild(r);
      // hidden until its click; the keyframe's 0 % (opacity 1) overrides the span's opacity-30 class, as in the browser
      tl.fromTo(r, { scale: 0, opacity: 1 }, { scale: 2, opacity: 0, duration: o.duration, ease: e, immediateRender: false }, at + c[0]);
      // removed at its own end (its own timer upstream), whatever the other clicks do
      tl.set(r, { display: "none" }, at + c[0] + o.duration);
      last = Math.max(last, c[0] + o.duration);
    });
    return at + last;
  },
  demo: {
    duration: 5,
    css: `.mw-ripple-button { font-size: 52px; font-weight: 600; padding: 28px 70px; border-radius: 18px; color: #fafafa; background: #18181b; }
.tap { position: absolute; width: 56px; height: 56px; border-radius: 50%; border: 4px solid rgba(255,255,255,.8); margin: -28px 0 0 -28px; opacity: 0; }`,
    html: `<div class="center"><div class="mw-ripple-button">Thêm vào giỏ</div></div>`,
    run: `MW.rippleButton(q(".mw-ripple-button"), tl, 0.5, { rippleColor: "#ADD8E6", duration: 0.6, clicks: [[0, 120, 60], [1.2, 420, 80], [2.4, 260, 50]] });`,
  },
};
