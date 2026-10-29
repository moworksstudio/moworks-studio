// Magic UI spinning-text (apps/www/registry/magicui/spinning-text.tsx at efe76fc): a string plus one trailing space laid around a circle
// (each letter translate(-50%, -50%) rotate(360 / total x i deg) translateY(-radius ch)), the whole ring rotating 360° per 10 s, linear,
// forever (reverse: -360°). Port: the same layout; the rotation is one linear tween over `hold` on the film's timeline.
export default {
  id: "spinning-text",
  kind: "motion",
  title: "Spinning Text",
  sub: "Chữ xếp vòng tròn xoay đều",
  desc: "Text laid out around a circle that turns continuously (one turn every 10 s), like a badge around a logo or a button.",
  category: "Text & titles",
  tags: ["circle", "badge", "rotate", "seal", "text", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/spinning-text.tsx" },
  notes: "Radius in ch as upstream (5). Letters stay live text; graphemes (NFC) so Vietnamese marks stay on their letter.",
  options: { duration: "s per turn (10)", reverse: "false", radius: "ch (5)", hold: "seconds (10)" },
  defaults: { duration: 10, reverse: false, radius: 5, hold: 10 },
  uses: ["split"],
  css: `.mw-spinning-text { position: relative; display: inline-block; width: 0; height: 0; }
.mw-spinning-text .mw-w { display: contents !important; }
.mw-spinning-text .mw-ch, .mw-spinning-text .mw-sp { position: absolute; left: 50%; top: 50%; transform-origin: center; white-space: pre; }`,
  markup: `<div class="mw-spinning-text">learn more • earn more • grow more •</div>`,
  fn: function (el, tl, at, o) {
    if (!el.__mwRing) {
      var text = el.textContent.normalize("NFC");
      el.textContent = "";
      var seg = new Intl.Segmenter("vi", { granularity: "grapheme" }), letters = [];
      var it = seg.segment(text + " ")[Symbol.iterator](), r;
      while (!(r = it.next()).done) letters.push(r.value.segment);
      el.__mwRing = letters.map(function (ch, i) {
        var s = document.createElement("span"); s.className = "mw-ch"; s.textContent = ch;
        s.style.transform = "translate(-50%, -50%) rotate(" + (360 / letters.length) * i + "deg) translateY(" + (-o.radius) + "ch)";
        el.appendChild(s); return s;
      });
    }
    var turns = o.hold / o.duration * 360 * (o.reverse ? -1 : 1);
    tl.fromTo(el, { rotation: 0 }, { rotation: turns, duration: o.hold, ease: "none", immediateRender: true }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.badge { position: relative; width: 640px; height: 640px; display: grid; place-items: center; }
.logo { position: absolute; width: 220px; height: 220px; border-radius: 50%; background: linear-gradient(135deg,#a78bfa,#f472b6); display: grid; place-items: center; font-size: 110px; font-weight: 800; color: #09090b; }
.mw-spinning-text { font-size: 62px; font-weight: 600; letter-spacing: 0.02em; }`,
    html: `<div class="center"><div class="badge"><div class="logo">M</div><div class="mw-spinning-text">học nhanh • làm đẹp • ra mắt sớm •</div></div></div>`,
    run: `MW.spinningText(q(".mw-spinning-text"), tl, 0, { radius: 4.6, duration: 10, hold: 6 });`,
  },
};
