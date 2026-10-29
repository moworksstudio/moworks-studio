// Magic UI animated-subscribe-button (apps/www/registry/magicui/animated-subscribe-button.tsx at efe76fc): a button (h 40, padding x 24,
// radius 8) with two labels; on click AnimatePresence mode "wait" first plays the exit (the label slips x 0 -> 50 in 0.1 s, the button
// fades out with motion's default 0.3 s tween), then the other button fades in while its label drops from y -50 to 0 (motion's default
// transform spring, stiffness 500, damping 25). Port: clicks become times on the film; each swap is that sequence of tweens.
export default {
  id: "animated-subscribe-button",
  kind: "block",
  title: "Animated Subscribe Button",
  sub: "Nút đăng ký đổi nhãn khi bấm",
  desc: "A button that swaps from its first label to its second when pressed: the old label slips right, the button cross-fades, the new label drops in from above.",
  category: "UI & mockups",
  tags: ["button", "subscribe", "follow", "toggle", "state", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-subscribe-button.tsx" },
  notes: "el holds two <span> labels (first: before, second: after), as upstream requires. clicks: [t, ...] in s after `at`; each click toggles.",
  options: { clicks: "[0]" },
  defaults: { clicks: [0] },
  uses: ["spring", "bezier"],
  css: `.mw-animated-subscribe-button { position: relative; display: inline-flex; }
.mw-animated-subscribe-button > .mw-asb { position: relative; display: flex; height: 40px; width: fit-content; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px; padding: 0 24px; font-weight: 600; }
.mw-animated-subscribe-button > .mw-asb + .mw-asb { position: absolute; left: 0; top: 0; }
.mw-animated-subscribe-button .mw-asb > span { position: relative; display: flex; align-items: center; justify-content: center; }`,
  markup: `<div class="mw-animated-subscribe-button"><span>Đăng ký</span><span>Đã đăng ký ✓</span></div>`,
  fn: function (el, tl, at, o) {
    var spans = el.querySelectorAll(":scope > span"), b = [];
    for (var i = 0; i < 2; i++) { var btn = document.createElement("div"); btn.className = "mw-asb"; btn.appendChild(spans[i]); el.appendChild(btn); b.push(btn); }
    var sp = MW.spring(500, 25, 1), fade = MW.bezier(0.25, 0.1, 0.35, 1);
    gsap.set(b[1], { opacity: 0 });
    var state = 0, t = at;
    o.clicks.forEach(function (c) {
      var from = b[state], to = b[1 - state], t0 = at + c;
      tl.fromTo(from.firstChild, { x: 0 }, { x: 50, duration: 0.1, ease: fade, immediateRender: false }, t0);
      tl.fromTo(from, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: fade, immediateRender: false }, t0);
      tl.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: fade, immediateRender: false }, t0 + 0.3);
      tl.fromTo(to.firstChild, { y: -50, x: 0 }, { y: 0, duration: sp.duration, ease: sp.ease, immediateRender: false }, t0 + 0.3);
      state = 1 - state; t = t0 + 0.3 + sp.duration;
    });
    return t;
  },
  demo: {
    duration: 5,
    css: `.mw-animated-subscribe-button { transform: scale(2.6); } .mw-asb { background: #fafafa; color: #09090b; } .mw-asb + .mw-asb { background: #22c55e; color: #fff; }`,
    html: `<div class="center"><div class="mw-animated-subscribe-button"><span>Đăng ký kênh</span><span>Đã đăng ký ✓</span></div></div>`,
    run: `MW.animatedSubscribeButton(q(".mw-animated-subscribe-button"), tl, 1, { clicks: [0, 2.2] });`,
  },
};
