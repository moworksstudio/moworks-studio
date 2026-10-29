// Magic UI blur-fade (apps/www/registry/magicui/blur-fade.tsx at efe76fc): an element appears from blur(6px), opacity 0 and a 6 px
// offset (direction down = from above), over 0.4 s with motion's "easeOut" (cubic-bezier(0, 0, 0.58, 1)) after 0.04 s + delay.
// Port: one fromTo per element on the film's timeline; `each` staggers a list the way the docs' demos step delay by 0.04-0.25 s.
export default {
  id: "blur-fade",
  kind: "motion",
  title: "Blur Fade",
  sub: "Hiện dần từ nhoè, nhích 6 px",
  desc: "Elements fade in from a 6 px blur while sliding 6 px into place (0.4 s, ease-out), one after another.",
  category: "Text & titles",
  tags: ["blur", "fade", "entrance", "stagger", "magicui"],
  source: { path: "apps/www/registry/magicui/blur-fade.tsx" },
  notes: "Works on any element (text, pictures, cards). direction: down / up / left / right as upstream (down starts 6 px above).",
  options: { duration: "s (0.4)", delay: "s (0)", offset: "px (6)", direction: "down | up | left | right (down)", blur: "px (6)", each: "s between elements when given a list (0.04)" },
  defaults: { duration: 0.4, delay: 0, offset: 6, direction: "down", blur: 6, each: 0.04 },
  uses: ["bezier"],
  css: ``,
  markup: `<h2 class="mw-blur-fade">Xin chào 👋</h2>`,
  use: `MW.blurFade(document.querySelectorAll(".mw-blur-fade"), tl, 0.5, { each: 0.04 });`,
  fn: function (el, tl, at, o) {
    var list = el && el.length != null && !el.nodeType ? Array.prototype.slice.call(el) : [el];
    var axis = o.direction === "left" || o.direction === "right" ? "x" : "y";
    var from = o.direction === "right" || o.direction === "down" ? -o.offset : o.offset;
    var ease = MW.bezier.apply(null, MW.CSS_EASE.easeOut);
    list.forEach(function (n, i) {
      var a = { opacity: 0, filter: "blur(" + o.blur + "px)" }, b = { opacity: 1, filter: "blur(0px)", duration: o.duration, ease: ease, immediateRender: true };
      a[axis] = from; b[axis] = 0;
      tl.fromTo(n, a, b, at + 0.04 + o.delay + i * o.each);
    });
    return at + 0.04 + o.delay + (list.length - 1) * o.each + o.duration;
  },
  demo: {
    duration: 4,
    css: `.stack { display: flex; flex-direction: column; align-items: flex-start; gap: 18px; width: 1300px; }
.stack .h1 { text-align: left; } .stack .p { text-align: left; }
.thumbs { display: flex; gap: 24px; margin-top: 24px; } .thumbs i { width: 230px; height: 150px; border-radius: 20px; display: block; }`,
    html: `<div class="center"><div class="stack">
  <div class="h1 mw-blur-fade">Xin chào 👋</div>
  <div class="p mw-blur-fade" style="font-size:52px;opacity:1">Chào mừng đến với Moworks Studio.</div>
  <div class="thumbs">
    <i class="mw-blur-fade" style="background:linear-gradient(135deg,#f97316,#ec4899)"></i><i class="mw-blur-fade" style="background:linear-gradient(135deg,#22d3ee,#6366f1)"></i>
    <i class="mw-blur-fade" style="background:linear-gradient(135deg,#a3e635,#14b8a6)"></i><i class="mw-blur-fade" style="background:linear-gradient(135deg,#facc15,#f43f5e)"></i>
    <i class="mw-blur-fade" style="background:linear-gradient(135deg,#c084fc,#0ea5e9)"></i>
  </div></div></div>`,
    run: `MW.blurFade(qa(".stack > .mw-blur-fade"), tl, 0.4, { each: 0.25, offset: 18, blur: 12 });
MW.blurFade(qa(".thumbs .mw-blur-fade"), tl, 1.0, { each: 0.12, offset: 24, direction: "up", blur: 12 });`,
  },
};
