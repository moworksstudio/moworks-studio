// Magic UI text-reveal (apps/www/registry/magicui/text-reveal.tsx at efe76fc): a paragraph in faint grey (opacity 0.3 under each word)
// whose words turn solid one after another as the page scrolls: word i of n maps scroll progress [i / n, (i + 1) / n] to opacity 0 -> 1
// (linear useTransform). Port: the scroll progress becomes the film's time over `duration`, so the read-along can follow a voice-over.
export default {
  id: "text-reveal",
  kind: "motion",
  title: "Text Reveal",
  sub: "Câu xám đậm dần từng từ",
  desc: "A sentence in faint grey whose words turn solid one after another, like a read-along, over the time you give it.",
  category: "Text & titles",
  tags: ["read along", "words", "reveal", "karaoke", "paragraph", "magicui"],
  source: { path: "apps/www/registry/magicui/text-reveal.tsx" },
  notes: "Each word keeps a ghost copy at opacity 0.3 under it, as upstream. Scroll progress -> film time: word i fills between at + duration x i / n and at + duration x (i + 1) / n.",
  options: { duration: "s for the whole sentence (4)", ghost: "opacity of the grey copy (0.3)" },
  defaults: { duration: 4, ghost: 0.3 },
  uses: ["split"],
  css: `.mw-text-reveal .mw-w { position: relative; }
.mw-text-reveal .mw-tr-ghost { position: absolute; left: 0; top: 0; opacity: var(--mw-tr-ghost, 0.3); }
.mw-text-reveal .mw-tr-word { position: relative; }`,
  markup: `<p class="mw-text-reveal">Moworks Studio sẽ thay đổi cách bạn làm video.</p>`,
  fn: function (el, tl, at, o) {
    var words = MW.split(el, "words").words, n = words.length;
    el.style.setProperty("--mw-tr-ghost", o.ghost);
    words.forEach(function (w, i) {
      var t = w.textContent; w.textContent = "";
      var g = document.createElement("span"); g.className = "mw-tr-ghost"; g.textContent = t;
      var v = document.createElement("span"); v.className = "mw-tr-word"; v.textContent = t;
      w.appendChild(g); w.appendChild(v);
      tl.fromTo(v, { opacity: 0 }, { opacity: 1, duration: o.duration / n, ease: "none", immediateRender: true }, at + (o.duration * i) / n);
    });
    return at + o.duration;
  },
  demo: {
    duration: 6,
    html: `<div class="center"><p class="mw-text-reveal h2" style="width:1500px;font-size:88px;line-height:1.25;margin:0;text-align:left;color:#fafafa">Moworks Studio sẽ thay đổi cách bạn làm video quảng cáo và giải thích.</p></div>`,
    run: `MW.textReveal(q(".mw-text-reveal"), tl, 0.5, { duration: 4.5, ghost: 0.2 });`,
  },
};
