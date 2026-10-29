// Magic UI word-rotate (apps/www/registry/magicui/word-rotate.tsx at efe76fc): one word of a list at a time, every 2.5 s; AnimatePresence
// mode "wait": the old word leaves (opacity 0, y 50) then the new one enters from y -50, each 0.25 s easeOut. Port: the same schedule as
// tweens on the film's timeline; the word is a function of time, so seeking anywhere shows the right one.
export default {
  id: "word-rotate",
  kind: "motion",
  title: "Word Rotate",
  sub: "Từ thay phiên rơi từ trên xuống",
  desc: "One word from a list at a time: every 2.5 s the word drops out downward and the next drops in from above (0.25 s each, ease-out).",
  category: "Text & titles",
  tags: ["rotate", "swap", "words", "headline", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/word-rotate.tsx" },
  notes: "mode 'wait': exit first (0.25 s), then enter (0.25 s). The holder clips (overflow hidden, 8 px padding as upstream's py-2) with room for Vietnamese marks.",
  options: { words: "list", duration: "s per word (2.5)", distance: "px (50)", cycles: "words shown (one loop of the list)" },
  defaults: { words: ["Thiết kế", "Xây dựng", "Ra mắt"], duration: 2.5, distance: 50, cycles: 0 },
  uses: ["bezier"],
  css: `.mw-word-rotate { display: inline-block; overflow: hidden; padding: 0.15em 0; vertical-align: bottom; }
.mw-word-rotate > span { display: inline-block; }`,
  markup: `<span class="mw-word-rotate"><span>Thiết kế</span></span>`,
  fn: function (el, tl, at, o) {
    var w = el.querySelector("span") || el.appendChild(document.createElement("span"));
    var e = MW.bezier.apply(null, MW.CSS_EASE.easeOut), D = o.duration, n = o.cycles || o.words.length, d = o.distance;
    var s = { t: 0 };
    var set = function () {
      var k = Math.max(0, Math.min(n - 1, Math.floor(s.t / D))), local = s.t - k * D;
      var y = 0, op = 1, word = o.words[k % o.words.length];
      if (k > 0 && local < 0.25) { word = o.words[(k - 1) % o.words.length]; var f = e(local / 0.25); y = d * f; op = 1 - f; }       // exit
      else if (k > 0 && local < 0.5) { var g = e((local - 0.25) / 0.25); y = -d * (1 - g); op = g; }                                     // enter
      else if (k === 0 && local < 0.25) { var h = e(local / 0.25); y = -d * (1 - h); op = h; }                                            // first entrance
      if (w.textContent !== word) w.textContent = word;
      w.style.transform = "translateY(" + y + "px)"; w.style.opacity = op;
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: n * D, duration: n * D, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + n * D;
  },
  demo: {
    duration: 8,
    html: `<div class="center"><div class="h1">Chúng tôi <span class="mw-word-rotate" style="color:#a78bfa"><span>thiết kế</span></span></div></div>`,
    run: `MW.wordRotate(q(".mw-word-rotate"), tl, 0.2, { words: ["thiết kế", "xây dựng", "ra mắt"], duration: 2.5, cycles: 3, distance: 90 });`,
  },
};
