// Magic UI line-shadow-text (apps/www/registry/magicui/line-shadow-text.tsx at efe76fc): text with an offset copy (0.04 em) behind it,
// filled with 45° stripes (transparent 45 %, colour 45-55 %) on a 0.06 em tile, the stripes crawling (background-position 0 0 -> 100%
// -100%) over 15 s linear forever. Port: the ::after copy becomes a real span (so the film can seek it); one linear tween per 15 s.
export default {
  id: "line-shadow-text",
  kind: "motion",
  title: "Line Shadow Text",
  sub: "Bóng chữ sọc chéo bò chậm",
  desc: "A headline with a hatched drop shadow: an offset copy filled with fine diagonal stripes that crawl slowly (15 s per tile pass).",
  category: "Text & titles",
  tags: ["shadow", "stripes", "hatch", "retro", "text", "magicui"],
  source: { path: "apps/www/registry/magicui/line-shadow-text.tsx" },
  notes: "Registry keyframe line-shadow: background-position 0 0 -> 100% -100%, 15 s linear infinite. Demo style as upstream (italic, semibold, tight tracking), with a wider offset and tile so the hatch reads in a small preview.",
  options: { shadowColor: "stripe colour (black; white on dark)", offset: "shadow offset in em (0.04)", tile: "stripe tile in em (0.06)", hold: "seconds (15)" },
  defaults: { shadowColor: "black", offset: 0.04, tile: 0.06, hold: 15 },
  css: `.mw-line-shadow-text { position: relative; z-index: 0; display: inline-flex; }
.mw-line-shadow-text > .mw-ls-copy { position: absolute; top: var(--mw-ls-off, 0.04em); left: var(--mw-ls-off, 0.04em); z-index: -10; color: transparent; white-space: nowrap;
  background-image: linear-gradient(45deg, transparent 45%, var(--mw-ls-color) 45%, var(--mw-ls-color) 55%, transparent 0); background-size: var(--mw-ls-tile, 0.06em) var(--mw-ls-tile, 0.06em);
  -webkit-background-clip: text; background-clip: text; pointer-events: none; }`,
  markup: `<span class="mw-line-shadow-text">Sọc</span>`,
  fn: function (el, tl, at, o) {
    var copy = el.querySelector(".mw-ls-copy");
    if (!copy) { copy = document.createElement("span"); copy.className = "mw-ls-copy"; copy.setAttribute("aria-hidden", "true"); copy.textContent = el.textContent; el.appendChild(copy); }
    el.style.setProperty("--mw-ls-color", o.shadowColor);
    el.style.setProperty("--mw-ls-off", o.offset + "em");
    el.style.setProperty("--mw-ls-tile", o.tile + "em");
    var n = Math.max(1, Math.ceil(o.hold / 15));
    tl.fromTo(copy, { backgroundPosition: "0% 0%" }, { backgroundPosition: "100% -100%", duration: 15, ease: "none", repeat: n - 1 }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    html: `<div class="center"><div class="h1" style="font-size:190px;font-style:italic;font-weight:600;letter-spacing:-0.05em;line-height:1">Nhanh <span class="mw-line-shadow-text">gấp đôi</span></div></div>`,
    run: `MW.lineShadowText(q(".mw-line-shadow-text"), tl, 0, { shadowColor: "white", offset: 0.06, tile: 0.09, hold: 6 });`,
  },
};
