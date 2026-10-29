// Magic UI safari (apps/www/registry/magicui/safari.tsx at efe76fc): a flat SVG browser window (1203 x 753: body and toolbar #E5E5E5 /
// dark #404040, inner chrome white / #262626, three window dots, an address bar at 286-952 with the URL in Arial 12 #A3A3A3) whose content
// area (1, 52, 1200 x 700, rounded bottom 11 px) is punched by a mask for a picture or video. Its toolbar glyphs (lock, shield, chevrons,
// share, plus, tabs) look traced from Apple's SF Symbols, whose terms are unclear for reuse: they are left out here (upstream's "simple"
// mode keeps the frame without most of them). Port: the frame, dots, address bar and URL; `enter` (this port's option) brings it in.
import { WEB_PAGE } from "../../demo-media.mjs";

export default {
  id: "safari",
  kind: "block",
  title: "Safari",
  sub: "Khung cửa sổ trình duyệt Safari",
  desc: "A flat browser window frame (window dots, address bar with the URL) holding a website screenshot or a screen recording.",
  category: "UI & mockups",
  tags: ["browser", "safari", "window", "website", "mockup", "frame", "brand look", "magicui"],
  source: { path: "apps/www/registry/magicui/safari.tsx" },
  notes: "Upstream's SF-Symbol-like toolbar glyphs are not ported (licence unclear). The URL is drawn in the film's font (upstream: Arial). For a video put a HyperFrames <video class=\"clip\"> inside .mw-safari-screen.",
  options: { url: "text in the address bar", src: "screen picture", dark: "false", font: "address-bar font (Inter)", enter: "null | rise | fade", enterDuration: "s (0.9)" },
  defaults: { url: "moworks.studio", src: null, dark: false, font: "Inter, sans-serif", enter: null, enterDuration: 0.9 },
  css: `.mw-safari { position: relative; display: inline-block; line-height: 0; aspect-ratio: 1203 / 753; }
.mw-safari > .mw-safari-screen { position: absolute; z-index: 0; overflow: hidden; left: calc(1 / 1203 * 100%); top: calc(52 / 753 * 100%); width: calc(1200 / 1203 * 100%); height: calc(700 / 753 * 100%); border-radius: 0 0 11px 11px; }
.mw-safari > .mw-safari-screen > img, .mw-safari > .mw-safari-screen > video { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }
.mw-safari > svg { position: absolute; inset: 0; z-index: 10; width: 100%; height: 100%; }`,
  markup: `<div class="mw-safari" style="width:1203px"></div>`,
  fn: function (el, tl, at, o) {
    var body = o.dark ? "#404040" : "#E5E5E5", inner = o.dark ? "#262626" : "#FFFFFF", id = "mw-sf-" + (MW.__sf = (MW.__sf || 0) + 1);
    var screen = el.querySelector(".mw-safari-screen");
    if (!screen) { screen = document.createElement("div"); screen.className = "mw-safari-screen"; el.appendChild(screen); }
    if (o.src && !screen.firstChild) { var img = document.createElement("img"); img.src = o.src; img.alt = ""; screen.appendChild(img); }
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    el.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 1203 753" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform:translateZ(0)"><defs>' +
      '<mask id="' + id + '" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="1203" height="753" fill="white"/><path d="M1 52H1201V741C1201 747.075 1196.08 752 1190 752H12C5.92486 752 1 747.075 1 741V52Z" fill="black"/></mask>' +
      '<clipPath id="' + id + 'c"><rect width="1203" height="753" fill="white"/></clipPath></defs><g clip-path="url(#' + id + 'c)" mask="url(#' + id + ')">' +
      '<path d="M0 52H1202V741C1202 747.627 1196.63 753 1190 753H12C5.37258 753 0 747.627 0 741V52Z" fill="' + body + '"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0H1190C1196.63 0 1202 5.37258 1202 12V52H0L0 12Z" fill="' + body + '"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M1.06738 12C1.06738 5.92487 5.99225 1 12.0674 1H1189.93C1196.01 1 1200.93 5.92487 1200.93 12V51H1.06738V12Z" fill="' + inner + '"/>' +
      '<circle cx="27" cy="25" r="6" fill="' + body + '"/><circle cx="47" cy="25" r="6" fill="' + body + '"/><circle cx="67" cy="25" r="6" fill="' + body + '"/>' +
      '<path d="M286 17C286 13.6863 288.686 11 292 11H946C949.314 11 952 13.6863 952 17V35C952 38.3137 949.314 41 946 41H292C288.686 41 286 38.3137 286 35V17Z" fill="' + body + '"/>' +
      '<text x="619" y="30" text-anchor="middle" fill="#A3A3A3" font-size="12" font-family="' + esc(o.font) + '">' + esc(o.url) + "</text></g></svg>");
    if (!o.enter) return at;
    tl.fromTo(el, o.enter === "rise" ? { y: 120, opacity: 0 } : { opacity: 0 }, { y: 0, opacity: 1, duration: o.enterDuration, ease: "power3.out", immediateRender: true }, at);
    return at + o.enterDuration;
  },
  assets: [{ path: "page.svg", data: WEB_PAGE }],
  demo: {
    duration: 4,
    css: `.mw-safari { width: 1500px; }`,
    html: `<div class="center"><div class="mw-safari"></div></div>`,
    run: `MW.safari(q(".mw-safari"), tl, 0.3, { src: "assets/page.svg", url: "moworks.studio", dark: true, enter: "rise" });`,
  },
};
