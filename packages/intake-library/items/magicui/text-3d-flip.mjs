// Magic UI text-3d-flip (apps/www/registry/magicui/text-3d-flip.tsx at efe76fc): each letter is a small 3D box with a front face and a
// second face (upstream's exact transforms, faces 0.5lh deep); on hover every box rolls 90° (top rotateX(90deg), right rotateY(90deg),
// bottom rotateX(-90deg), left rotateY(-90deg)) on a spring (stiffness 300, damping 30, mass 1), letter delays = staggerDuration (0.05 s)
// x distance from staggerFrom (first, last, center, an index or random), then snaps back with duration 0. Port: the hover becomes start
// times; the spring is solved in closed form; random takes a seeded index.
export default {
  id: "text-3d-flip",
  kind: "motion",
  title: "Text 3D Flip",
  sub: "Chữ cái lật khối 3D sang mặt mới",
  desc: "Each letter is a little 3D cube that rolls 90° to a second face (up, down, left or right), staggered across the word on a firm spring.",
  category: "Text & titles",
  tags: ["3d", "flip", "roll", "cube", "letters", "stagger", "magicui"],
  source: { path: "apps/www/registry/magicui/text-3d-flip.tsx" },
  notes: "Style the second face with .mw-flip-back (upstream's flipTextClassName). Like upstream, each roll snaps back to the front face when it ends (snapBack false keeps the second face).",
  options: { rotateDirection: "top | right | bottom | left (right)", staggerDuration: "s (0.05)", staggerFrom: "first | last | center | index | random (first)",
    stiffness: "300", damping: "30", starts: "roll times in s after `at` ([0])", snapBack: "true", seed: "1" },
  defaults: { rotateDirection: "right", staggerDuration: 0.05, staggerFrom: "first", stiffness: 300, damping: 30, starts: [0], snapBack: true, seed: 1 },
  uses: ["spring", "rand"],
  css: `.mw-text-3d-flip { display: flex; flex-wrap: wrap; position: relative; }
.mw-text-3d-flip .mw-flip-word { display: inline-flex; }
.mw-text-3d-flip .mw-flip-char { display: inline-block; transform-style: preserve-3d; }
.mw-text-3d-flip .mw-flip-front { position: relative; display: inline-block; height: 1lh; backface-visibility: hidden; }
.mw-text-3d-flip .mw-flip-back { position: absolute; top: 0; left: 0; height: 1lh; backface-visibility: hidden; }`,
  markup: `<p class="mw-text-3d-flip">Lật chữ</p>`,
  fn: function (el, tl, at, o) {
    var ROT = { top: ["rotateX", 90], right: ["rotateY", 90], bottom: ["rotateX", -90], left: ["rotateY", -90] };
    var BACK = { top: "rotateX(-90deg) translateZ(0.5lh)", right: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)",
      bottom: "rotateX(90deg) translateZ(0.5lh)", left: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)" };
    var FRONT = { top: "translateZ(0.5lh)", bottom: "translateZ(0.5lh)", left: "rotateY(90deg) translateX(50%) rotateY(-90deg)", right: "rotateY(-90deg) translateX(50%) rotateY(90deg)" };
    var BOX = { top: "translateZ(-0.5lh)", bottom: "translateZ(-0.5lh)", left: "rotateY(90deg) translateX(50%) rotateY(-90deg)", right: "rotateY(90deg) translateX(50%) rotateY(-90deg)" };
    var dir = o.rotateDirection;
    if (!el.__mwFlip) {
      var text = el.textContent.normalize("NFC"), seg = new Intl.Segmenter("vi", { granularity: "grapheme" }), boxes = [];
      el.textContent = "";
      text.split(" ").forEach(function (word, wi, words) {
        var w = document.createElement("span"); w.className = "mw-flip-word";
        var it = seg.segment(word)[Symbol.iterator](), r;
        while (!(r = it.next()).done) {
          var b = document.createElement("span"); b.className = "mw-flip-char";
          var f = document.createElement("span"); f.className = "mw-flip-front"; f.textContent = r.value.segment; f.style.transform = FRONT[dir];
          var k = document.createElement("span"); k.className = "mw-flip-back"; k.textContent = r.value.segment; k.style.transform = BACK[dir];
          b.appendChild(f); b.appendChild(k); w.appendChild(b); boxes.push(b);
        }
        el.appendChild(w);
        if (wi < words.length - 1) { var sp = document.createElement("span"); sp.style.whiteSpace = "pre"; sp.textContent = " "; el.appendChild(sp); }
      });
      el.__mwFlip = boxes;
    }
    var boxes = el.__mwFlip, n = boxes.length, sp = MW.spring(o.stiffness, o.damping, 1), axis = ROT[dir][0], deg = ROT[dir][1];
    var delayOf = function (i, start) {
      var f = o.staggerFrom, d = o.staggerDuration;
      if (f === "first") return i * d;
      if (f === "last") return (n - 1 - i) * d;
      if (f === "center") return Math.abs(Math.floor(n / 2) - i) * d;
      if (f === "random") return Math.abs(Math.floor(MW.rand(o.seed * 31 + start * 1000)() * n) - i) * d;
      return Math.abs(f - i) * d;
    };
    var s = { t: 0 }, last = 0;
    o.starts.forEach(function (st) { for (var i = 0; i < n; i++) last = Math.max(last, st + delayOf(i, st) + sp.duration); });
    var draw = function () {
      for (var i = 0; i < n; i++) {
        var a = 0;
        for (var k = 0; k < o.starts.length; k++) {
          var t0 = o.starts[k] + delayOf(i, o.starts[k]), u = s.t - t0;
          if (u < 0) continue;
          if (u < sp.duration) a = deg * sp.ease(u / sp.duration);
          else a = o.snapBack ? 0 : deg;
        }
        boxes[i].style.transform = BOX[dir] + " " + axis + "(" + a + "deg)";
      }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: last, duration: last, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + last;
  },
  demo: {
    duration: 5,
    css: `.mw-text-3d-flip { font-family: 'Playfair Display', serif; font-size: 150px; font-weight: 700; line-height: 1.3; perspective: 1200px; }
.mw-text-3d-flip .mw-flip-back { color: #f472b6; }
.f2 .mw-flip-back { color: #38bdf8; }`,
    html: `<div class="center"><div class="col"><p class="mw-text-3d-flip f1" style="margin:0">Lật từng chữ</p><p class="mw-text-3d-flip f2" style="margin:0;font-size:110px">từ giữa ra</p></div></div>`,
    run: `MW.text3dFlip(q(".f1"), tl, 0.5, { starts: [0, 2], snapBack: false });
MW.text3dFlip(q(".f2"), tl, 1.2, { rotateDirection: "top", staggerFrom: "center", staggerDuration: 0.03, stiffness: 160, damping: 25, starts: [0, 2], snapBack: false });`,
  },
};
