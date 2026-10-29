// Magic UI comic-text (apps/www/registry/magicui/comic-text.tsx at efe76fc): a comic sound word, uppercase, skewX(-10deg), yellow
// #FACC15 letters with red #EF4444 halftone dots (8 px tile), a black outline of fontSize x 0.35 px and a black + red hard shadow;
// it pops in (opacity 0 -> 1, scale 0.8 -> 1, rotate -2 -> 0) on a 0.6 s spring (motion's duration spring; its cubic-bezier is ignored).
// Port: the same look; the spring as MW.springDB(0.6, 0.3) on the film's timeline. Upstream's font Bangers has no Vietnamese letters:
// the font is an option, Baloo 2 (bundled, with Vietnamese) in the demo.
export default {
  id: "comic-text",
  kind: "motion",
  title: "Comic Text",
  sub: "Chữ truyện tranh chấm halftone",
  desc: "A comic sound word: skewed yellow letters with red halftone dots, a thick black outline and a black + red hard shadow, popping in on a soft spring.",
  category: "Text & titles",
  tags: ["comic", "halftone", "pop", "sticker", "text", "magicui"],
  source: { path: "apps/www/registry/magicui/comic-text.tsx" },
  notes: "fontSize in rem as upstream (5). Upstream font: 'Bangers', 'Comic Sans MS', 'Impact' (no Vietnamese); pass a font that has Vietnamese letters.",
  options: { fontSize: "rem (5)", font: "family ('Baloo 2')", dot: "#EF4444", fill: "#FACC15" },
  defaults: { fontSize: 5, font: "'Baloo 2', sans-serif", dot: "#EF4444", fill: "#FACC15" },
  uses: ["spring"],
  css: `.mw-comic-text { display: inline-block; text-align: center; font-weight: 900; text-transform: uppercase; line-height: 1.25; padding: 0.1em 0.15em;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }`,
  markup: `<div class="mw-comic-text">Bùm!</div>`,
  fn: function (el, tl, at, o) {
    var fs = o.fontSize * 16;
    el.style.fontSize = o.fontSize + "rem";
    el.style.fontFamily = o.font;
    el.style.webkitTextStroke = (o.fontSize * 0.35) + "px #000000";
    el.style.filter = "drop-shadow(5px 5px 0px #000000) drop-shadow(3px 3px 0px " + o.dot + ")";
    el.style.backgroundColor = o.fill;
    el.style.backgroundImage = "radial-gradient(circle at 1px 1px, " + o.dot + " 1px, transparent 0)";
    el.style.backgroundSize = "8px 8px";
    var sp = MW.springDB(0.6, 0.3);
    gsap.set(el, { skewX: -10, transformOrigin: "50% 50%" });
    tl.fromTo(el, { opacity: 0, scale: 0.8, rotation: -2 }, { opacity: 1, scale: 1, rotation: 0, duration: sp.duration, ease: sp.ease, immediateRender: true }, at);
    void fs;
    return at + sp.duration;
  },
  demo: {
    duration: 4,
    theme: "light",
    colors: { bg: "#fef9c3" },
    html: `<div class="center"><div class="mw-comic-text">Bùm! Siêu sale</div></div>`,
    run: `MW.comicText(q(".mw-comic-text"), tl, 0.5, { fontSize: 11 });`,
  },
};
