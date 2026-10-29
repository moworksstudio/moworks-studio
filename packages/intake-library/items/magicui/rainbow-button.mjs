// Magic UI rainbow-button (apps/www/registry/magicui/rainbow-button.tsx at efe76fc): a dark button (#121213) whose 0.125rem transparent
// border shows a rainbow (oklch colours 1-5 ordered 1, 5, 3, 4, 2, at 200 %) through a fade layer, with a blurred (0.75rem) rainbow bar
// under it (bottom -20 %, 60 % x 20 %); every layer slides background-position 0 % -> 200 % over 2 s, linear, forever (keyframe
// "rainbow"). Port: the same layers (the ::before becomes a real element); the slide from the film's time (seamless every 2 s).
export default {
  id: "rainbow-button",
  kind: "motion",
  title: "Rainbow Button",
  sub: "Nút viền cầu vồng chạy, quầng dưới",
  desc: "A dark button with a moving rainbow border and a blurred rainbow glow under it, sliding every 2 s: loud, for social and creator films.",
  category: "UI & mockups",
  tags: ["button", "cta", "rainbow", "gradient", "glow", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/rainbow-button.tsx" },
  notes: "variant outline uses a white fill, as upstream's outline variant.",
  options: { speed: "s per slide (2)", variant: "default | outline", hold: "seconds (6)" },
  defaults: { speed: 2, variant: "default", hold: 6 },
  css: `.mw-rainbow-button { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 2px; white-space: nowrap; font-weight: 500;
  --c1: oklch(66.2% 0.225 25.9); --c2: oklch(60.4% 0.26 302); --c3: oklch(69.6% 0.165 251); --c4: oklch(80.2% 0.134 225); --c5: oklch(90.7% 0.231 133);
  border: 0.125rem solid transparent; background-size: 200%; background-clip: padding-box, border-box, border-box; background-origin: border-box; color: #fafafa; }
.mw-rainbow-button > .mw-rb-glow { position: absolute; bottom: -20%; left: 50%; z-index: 0; height: 20%; width: 60%; transform: translateX(-50%); filter: blur(0.75rem);
  background: linear-gradient(90deg, var(--c1), var(--c5), var(--c3), var(--c4), var(--c2)); background-size: 200%; }
.mw-rainbow-button > .mw-rb-label { position: relative; z-index: 1; }`,
  markup: `<div class="mw-rainbow-button">Tải ngay</div>`,
  fn: function (el, tl, at, o) {
    var fill = o.variant === "outline" ? "#ffffff" : "#121213", fade = o.variant === "outline" ? "linear-gradient(#ffffff 50%, rgba(18,18,19,0.6) 80%, rgba(18,18,19,0))" : "linear-gradient(#121213 50%, rgba(18,18,19,0.6) 80%, rgba(18,18,19,0))";
    el.style.backgroundImage = "linear-gradient(" + fill + "," + fill + "), " + fade + ", linear-gradient(90deg, var(--c1), var(--c5), var(--c3), var(--c4), var(--c2))";
    if (o.variant === "outline") el.style.color = "#121213";
    var label = document.createElement("span"); label.className = "mw-rb-label"; while (el.firstChild) label.appendChild(el.firstChild);
    var glow = document.createElement("span"); glow.className = "mw-rb-glow"; el.appendChild(glow); el.appendChild(label);
    var s = { t: 0 }, set = function () { var p = ((s.t % o.speed) / o.speed) * 200 + "%"; el.style.backgroundPosition = p; glow.style.backgroundPosition = p; };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.mw-rainbow-button { font-size: 52px; padding: 26px 64px; border-radius: 14px; }`,
    html: `<div class="center"><div class="col"><div class="h2">Phiên bản mới đã có</div><div class="mw-rainbow-button">Tải ứng dụng</div></div></div>`,
    run: `MW.rainbowButton(q(".mw-rainbow-button"), tl, 0, { hold: 6 });`,
  },
};
