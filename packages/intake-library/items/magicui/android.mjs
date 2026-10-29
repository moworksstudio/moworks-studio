// Magic UI android (apps/www/registry/magicui/android.tsx at efe76fc): a flat SVG Android phone: body 378 x 830 radius 42 (#E5E5E5, dark
// #404040), bezel 374 x 820 (white, dark #262626), the screen clipped to 360 x 800 at (9, 14) rx 33 ry 25, a punch-hole camera (r 9 +
// r 4 at 189, 28), two buttons on the right; a picture or a looping video on the screen. Static upstream, and its viewBox is the 433 x 882
// props while the art is 380 x 830 (empty margins): fixed here to 0 0 380 830. Port: the same paths; the screen takes the film's picture
// or a HyperFrames video clip; `enter` (this port's option) can bring the phone in.
import { APP_SCREEN } from "../../demo-media.mjs";

export default {
  id: "android",
  kind: "block",
  title: "Android",
  sub: "Khung điện thoại Android phẳng",
  desc: "A flat, generic Android phone frame (rounded body, punch-hole camera, two side buttons) holding a screenshot or a screen recording.",
  category: "UI & mockups",
  tags: ["phone", "android", "device", "mockup", "frame", "magicui"],
  source: { path: "apps/www/registry/magicui/android.tsx" },
  notes: "Generic Android look, not a real model. src: a picture for the screen; for a video put a HyperFrames <video class=\"clip\"> inside .mw-android-screen. enter: null (static, as upstream) | rise | fade.",
  options: { src: "screen picture (none)", dark: "false", enter: "null | rise | fade", enterDuration: "s (0.9)" },
  defaults: { src: null, dark: false, enter: null, enterDuration: 0.9 },
  css: `.mw-android { position: relative; aspect-ratio: 380 / 830; }
.mw-android > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-android > .mw-android-screen { position: absolute; left: calc(9 / 380 * 100%); top: calc(14 / 830 * 100%); width: calc(360 / 380 * 100%); height: calc(800 / 830 * 100%);
  border-radius: calc(33 / 360 * 100%) / calc(25 / 800 * 100%); overflow: hidden; }
.mw-android > .mw-android-screen > img, .mw-android > .mw-android-screen > video { width: 100%; height: 100%; object-fit: cover; display: block; }`,
  markup: `<div class="mw-android" style="width:380px"></div>`,
  fn: function (el, tl, at, o) {
    var body = o.dark ? "#404040" : "#E5E5E5", bezel = o.dark ? "#262626" : "#FFFFFF";
    var screen = el.querySelector(".mw-android-screen");
    el.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 380 830" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M376 153H378C379.105 153 380 153.895 380 155V249C380 250.105 379.105 251 378 251H376V153Z" fill="' + body + '"/>' +
      '<path d="M376 301H378C379.105 301 380 301.895 380 303V351C380 352.105 379.105 353 378 353H376V301Z" fill="' + body + '"/>' +
      '<path d="M0 42C0 18.8041 18.804 0 42 0H336C359.196 0 378 18.804 378 42V788C378 811.196 359.196 830 336 830H42C18.804 830 0 811.196 0 788V42Z" fill="' + body + '"/>' +
      '<path d="M2 43C2 22.0132 19.0132 5 40 5H338C358.987 5 376 22.0132 376 43V787C376 807.987 358.987 825 338 825H40C19.0132 825 2 807.987 2 787V43Z" fill="' + bezel + '"/>' +
      '<path d="M9.25 48C9.25 29.3604 24.3604 14.25 43 14.25H335C353.64 14.25 368.75 29.3604 368.75 48V780C368.75 798.64 353.64 813.75 335 813.75H43C24.3604 813.75 9.25 798.64 9.25 780V48Z" fill="' + body + '" stroke="' + body + '" stroke-width="0.5"/></svg>');
    if (!screen) { screen = document.createElement("div"); screen.className = "mw-android-screen"; el.appendChild(screen); }
    if (o.src && !screen.firstChild) { var img = document.createElement("img"); img.src = o.src; img.alt = ""; screen.appendChild(img); }
    el.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 380 830" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="189" cy="28" r="9" fill="' + bezel + '"/><circle cx="189" cy="28" r="4" fill="' + body + '"/></svg>');
    if (!o.enter) return at;
    var from = o.enter === "rise" ? { y: 120, opacity: 0 } : { opacity: 0 };
    tl.fromTo(el, from, { y: 0, opacity: 1, duration: o.enterDuration, ease: "power3.out", immediateRender: true }, at);
    return at + o.enterDuration;
  },
  assets: [{ path: "screen.svg", data: APP_SCREEN }],
  demo: {
    duration: 4,
    css: `.mw-android { width: 420px; }`,
    html: `<div class="center"><div class="row" style="gap:120px"><div class="mw-android a1"></div><div class="mw-android a2"></div></div></div>`,
    run: `MW.android(q(".a1"), tl, 0.3, { src: "assets/screen.svg", enter: "rise" });
MW.android(q(".a2"), tl, 0.6, { src: "assets/screen.svg", dark: true, enter: "rise" });`,
  },
};
