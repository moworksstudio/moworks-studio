// Magic UI hyper-text (apps/www/registry/magicui/hyper-text.tsx at efe76fc): uppercase monospace text that scrambles through random
// A-Z letters and settles left to right over 800 ms (letter i is final once progress x length >= i; spaces stay), started after `delay`
// (and again on hover). Port: the same rule on the film clock; the random letter is seeded per letter and per 60 fps frame, so every
// render is identical. Hover becomes extra start times (`replays`).
export default {
  id: "hyper-text",
  kind: "motion",
  title: "Hyper Text",
  sub: "Chữ hoa nhiễu ký tự rồi chốt",
  desc: "Uppercase monospace text scrambles through random letters and settles from left to right in 0.8 s, like a decoder.",
  category: "Text & titles",
  tags: ["scramble", "decode", "glitch", "mono", "text", "magicui"],
  source: { path: "apps/www/registry/magicui/hyper-text.tsx" },
  notes: "Upstream re-randomises each unsettled letter every animation frame (Math.random): here per 1/60 s from a seed. Vietnamese letters settle into their own glyphs; the scramble set stays A-Z like upstream.",
  options: { duration: "s (0.8)", characterSet: "letters to scramble with (A-Z)", seed: "1", replays: "extra start times in s after `at` (none)" },
  defaults: { duration: 0.8, characterSet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", seed: 1, replays: [] },
  uses: ["split", "rand"],
  css: `.mw-hyper-text { font-family: 'JetBrains Mono', monospace; font-weight: 700; text-transform: uppercase; overflow: hidden; padding: 0.1em 0; }
.mw-hyper-text .mw-ch { text-align: center; }`,
  markup: `<div class="mw-hyper-text">Hyper Text</div>`,
  fn: function (el, tl, at, o) {
    var parts = MW.split(el, "chars").chars;
    var final = parts.map(function (c) { return c.textContent; });
    // fixed cell widths so the line does not jump while letters change (monospace: one cell each)
    parts.forEach(function (c) { c.style.minWidth = c.getBoundingClientRect().width + "px"; });
    var set = o.characterSet, n = final.length;
    var starts = [0].concat(o.replays || []);
    var s = { t: -1 };
    var draw = function () {
      var t = s.t;
      var local = -1;
      for (var k = 0; k < starts.length; k++) if (t >= starts[k]) local = t - starts[k];
      for (var i = 0; i < n; i++) {
        if (local < 0 || local >= o.duration || final[i] === " ") { parts[i].textContent = final[i]; continue; }
        var iter = (local / o.duration) * n;
        if (i <= iter) parts[i].textContent = final[i];
        else { var r = MW.rand(o.seed * 7919 + i * 131 + Math.floor(local * 60) * 977)(); parts[i].textContent = set.charAt(Math.floor(r * set.length)); }
      }
    };
    draw();
    var end = Math.max.apply(null, starts) + o.duration;
    tl.fromTo(s, { t: 0 }, { t: end + 0.01, duration: end + 0.01, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 4,
    html: `<div class="center"><div class="col"><div class="mw-hyper-text h1" style="font-size:150px">Moworks</div><div class="mw-hyper-text p hx">Chuyển động có chủ đích</div></div></div>`,
    run: `MW.hyperText(q(".h1"), tl, 0.3, { replays: [2.2] });
MW.hyperText(q(".hx"), tl, 0.9, { duration: 1.2, seed: 7 });`,
  },
};
