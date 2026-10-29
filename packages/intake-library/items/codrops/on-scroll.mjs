// Codrops On-Scroll Typography Animations (codrops/OnScrollTypographyAnimations at af28d61, MIT, Copyright (c) 2009 - 2022 Codrops):
// 29 text entrances, each a GSAP fromTo on the letters (or words) Splitting.js makes, scrubbed by ScrollTrigger (src/js/index.js fx1-15,
// src/js/index2.js fx16-29). Port: the same GSAP tween with the source's values (from / to, transformOrigin, eases, staggers, perspective
// on the letter's parent), on the film's paused timeline. The scroll range becomes time: a scrubbed tween is scaled so that its whole run
// (each letter's duration plus the stagger) fills `duration` (1.6 s), keeping their ratio; the three time-based ones (fx8, fx10, fx11,
// toggleActions) keep their own durations. gsap.utils.random, Math.random and stagger from "random" become a seeded generator (seed). The
// letters come from MW.split (NFC graphemes, so Vietnamese marks stay on their letter); the overflow-hidden wraps of fx11 / fx12 use
// MW.mask, which leaves room above and below for marks. Splitting.js, Lenis, ScrollTrigger and the demo's Adobe Fonts are not used.
const SRC = (file, a, b) => ({ repo: "codrops/OnScrollTypographyAnimations", path: `src/js/${file}`, lines: [a, b] });

// shared by every effect (written into each item's function)
const CORE = `
var D = o.duration, R = MW.rand(o.seed * 7907 + 1);
var rnd = function (a, b) { return a + (b - a) * R(); };
var sp = MW.split(el, o.split === "words" ? "words" : "chars"), chars = sp.chars, words = sp.words;
var charsOf = function (w) { return Array.prototype.slice.call(w.querySelectorAll(".mw-ch")); };
// a scrubbed tween: the source's fromTo, scaled so its whole run fills d (the scroll range became time)
var scrub = function (targets, from, to, t0, d) { var tw = gsap.fromTo(targets, from, to); tw.timeScale(tw.totalDuration() / (d || D)); tl.add(tw, t0 == null ? at : t0); return tw; };
var timed = function (targets, from, to, t0) { var tw = gsap.fromTo(targets, from, to); tl.add(tw, t0 == null ? at : t0); return tw; };
var randomStagger = function (each, n) { var a = [], i; for (i = 0; i < n; i++) a.push(i); for (i = n - 1; i > 0; i--) { var k = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[k]; a[k] = t; } var pos = []; a.forEach(function (v, j) { pos[v] = j; }); return function (j) { return pos[j] * each; }; };
var factorOf = function (p, n) { return p < Math.ceil(n / 2) ? p : Math.ceil(n / 2) - Math.abs(Math.floor(n / 2) - p) - 1; };
var mapRange = function (a, b, c, d, v) { return c + ((v - a) * (d - c)) / (b - a); };
var perspective = function (list, v) { list.forEach(function (c) { c.parentNode.style.perspective = v + "px"; }); };
`;
const END = "\nreturn at + D;";
const fx = (body, end = END) => new Function("el", "tl", "at", "o", CORE + body + end);

const ITEMS = [
  ["tilt-pop", 1, "Tilt Pop", "Chữ cái bung ra, nghiêng rồi thẳng", "Letters pop up from 60 % size, each tilted at random up to 20° and straightening, one after another.", SRC("index.js", 62, 86),
    `scrub(chars, { opacity: 0, scale: 0.6, rotationZ: function () { return rnd(-20, 20); } }, { ease: "power4", opacity: 1, scale: 1, rotation: 0, stagger: 0.4 });`],
  ["stretch-rise", 2, "Stretch Rise", "Chữ cái kéo giãn trồi lên", "Letters rise from below, stretched tall and thin, and snap to shape with a back ease.", SRC("index.js", 88, 116),
    `scrub(chars, { opacity: 0, yPercent: 120, scaleY: 2.3, scaleX: 0.7, transformOrigin: "50% 0%" }, { duration: 1, ease: "back.inOut(2)", opacity: 1, yPercent: 0, scaleY: 1, scaleX: 1, stagger: 0.03 });`],
  ["unfold-down", 3, "Unfold Down", "Chữ cái mở dọc từ mép trên", "Letters unfold downward from their top edge, one after another, with a little overshoot.", SRC("index.js", 118, 141),
    `scrub(chars, { transformOrigin: "50% 0%", scaleY: 0 }, { ease: "back", opacity: 1, scaleY: 1, yPercent: 0, stagger: 0.03 });`],
  ["converge", 4, "Converge", "Chữ cái hội tụ về giữa", "The letters of each word start spread far apart and slide together into the word.", SRC("index.js", 143, 172),
    `words.forEach(function (w) { scrub(charsOf(w), { x: function (p, _, arr) { return 150 * (p - arr.length / 2); } }, { ease: "power1.inOut", x: 0, stagger: { grid: "auto", from: "center" } }); });`],
  ["scatter", 5, "Scatter", "Chữ cái tán loạn rồi tụ lại", "Letters fly in from random places around the line and settle into the word.", SRC("index.js", 174, 198),
    `scrub(chars, { opacity: 0, xPercent: function () { return rnd(-200, 200); }, yPercent: function () { return rnd(-150, 150); } }, { ease: "power1.inOut", opacity: 1, xPercent: 0, yPercent: 0, stagger: randomStagger(0.05, chars.length) });`],
  ["flip-up", 6, "Flip Up", "Chữ cái lật 3D đứng dậy", "Letters flip up in 3D from lying flat, word by word, in reading order.", SRC("index.js", 200, 235),
    `words.forEach(function (w) { var cs = charsOf(w); perspective(cs, 2000); scrub(cs, { opacity: 0, rotationX: -90, yPercent: 50 }, { ease: "power1.inOut", opacity: 1, rotationX: 0, yPercent: 0, stagger: { each: 0.03, from: 0 } }); });`],
  ["swing-door", 7, "Swing Door", "Chữ cái mở như cánh cửa", "Letters swing open like doors on their right edge, coming from depth, last letter first.", SRC("index.js", 237, 270),
    `words.forEach(function (w) { var cs = charsOf(w); perspective(cs, 2000); scrub(cs, { transformOrigin: "100% 50%", opacity: 0, rotationY: -90, z: -300 }, { ease: "expo", opacity: 1, rotationY: 0, z: 0, stagger: { each: 0.06, from: "end" } }); });`],
  ["flicker", 8, "Flicker", "Chữ cái nhấp nháy ký tự rồi hiện", "Each letter flickers through two random symbols before showing itself, letter by letter (0.18 s apart).", SRC("index.js", 273, 303),
    `var S = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","!","@","#","$","%","^","&","*","-","_","+","=",";",":","<",">",","];
var C = chars.map(function (c, i) { return { el: c, text: c.textContent, t: (i + 1) * 0.18, a: S[Math.floor(R() * S.length)], b: S[Math.floor(R() * S.length)] }; });
var s = { t: 0 }, set = function () {
  for (var i = 0; i < C.length; i++) {
    var c = C[i], u = s.t - c.t, txt = c.text, op = 1;
    if (u < 0) op = 0;                                     // onEnter: hidden until its turn
    else if (u < 0.03) { txt = c.a; op = u / 0.03; } else if (u < 0.06) txt = c.a;      // first symbol (0.03 s), repeatDelay 0.03 s
    else if (u < 0.09) { txt = c.b; op = (u - 0.06) / 0.03; } else if (u < 0.12) txt = c.b;      // second symbol (repeatRefresh), then the letter 0.03 s later
    if (c.el.textContent !== txt) c.el.textContent = txt;
    c.el.style.opacity = op;
  }
};
set();
var end = C.length ? C[C.length - 1].t + 0.12 : 0;
tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);`, "\nreturn at + end;"],
  ["center-stretch", 9, "Center Stretch", "Chữ cái giãn ra từ giữa khung", "Letters start squeezed at the centre of the frame and stretch out to their places.", SRC("index.js", 305, 332),
    `words.forEach(function (w) { scrub(charsOf(w), { scaleX: 0, x: function (_, target) { var r = target.getBoundingClientRect(); return document.documentElement.clientWidth / 2 - r.left - r.width / 2; } }, { ease: "power1.inOut", scaleX: 1, x: 0 }); });`],
  ["blur-random", 10, "Blur Random", "Chữ cái rõ dần từ vùng nhoè", "Letters come into focus from a heavy blur in random order (0.25 s each, 0.05 s apart).", SRC("index.js", 334, 357),
    `timed(chars, { opacity: 0, filter: "blur(20px)" }, { duration: 0.25, ease: "power1.inOut", opacity: 1, filter: "blur(0px)", stagger: randomStagger(0.05, chars.length) });`, "\nreturn at + 0.25 + 0.05 * Math.max(0, chars.length - 1);"],
  ["slide-mask", 11, "Slide Mask", "Chữ cái trượt ngang trong mặt nạ", "Each letter slides in sideways inside its own mask, in quick succession (1 s, expo).", SRC("index.js", 359, 382),
    `MW.mask(chars); timed(chars, { transformOrigin: "0% 50%", xPercent: 105 }, { duration: 1, ease: "expo", xPercent: 0, stagger: 0.042 });`, "\nreturn at + 1 + 0.042 * Math.max(0, chars.length - 1);"],
  ["smear", 12, "Smear", "Chữ cái quệt giãn vào chỗ", "Letters smear in from the left inside their masks, stretched six times wide and tilted, last letter first.", SRC("index.js", 384, 411),
    `MW.mask(chars); scrub(chars, { xPercent: -250, rotationZ: 45, scaleX: 6, transformOrigin: "100% 50%" }, { duration: 1, ease: "power2", xPercent: 0, rotationZ: 0, scaleX: 1, stagger: -0.06 });`],
  ["flip-around", 13, "Flip Around", "Chữ cái lộn mặt trồi lên", "Letters flip around from their back side while rising into place, in a wave from the end.", SRC("index.js", 413, 444),
    `perspective(chars, 2000); scrub(chars, { opacity: 0, rotationY: 180, xPercent: -40, yPercent: 100 }, { ease: "power4.inOut", opacity: 1, rotationY: 0, xPercent: 0, yPercent: 0, stagger: { each: -0.03, from: 0 } });`],
  ["drop-travel", 14, "Drop Travel", "Chữ rơi từ trên cao khi dòng chạy vào", "The line slides in from the right while each letter drops from high above, large, and lands with a back ease.", SRC("index.js", 446, 483),
    `scrub(el, { xPercent: 100 }, { ease: "none", xPercent: 0 });
scrub(chars, { scale: 3, yPercent: -900 }, { ease: "back(2)", scale: 1, yPercent: 0, stagger: 0.05 });`],
  ["cylinder-travel", 15, "Cylinder Travel", "Chữ cuộn như trụ xoay khi dòng chạy vào", "The line slides in from the left while its letters roll over a cylinder behind the text (rotationX 380° about a point 200 px deep).", SRC("index.js", 485, 526),
    `perspective(chars, 2000);
scrub(el, { xPercent: -80 }, { ease: "none", xPercent: 0 }, at, D / 1.4);           // the title's range is +=100 %, the letters' +=140 %
scrub(chars, { transformOrigin: "50% 50% -200px", rotationX: 380, opacity: 0 }, { ease: "expo.inOut", rotationX: 0, z: 0, opacity: 1, stagger: -0.03 });`],
  ["read-tilt", 16, "Read Tilt", "Câu sáng dần theo từ, nghiêng về thẳng", "A sentence straightens from a slight tilt while its words brighten one after another, like reading along.", SRC("index2.js", 51, 83),
    `scrub(el, { transformOrigin: "0% 50%", rotate: 3 }, { ease: "none", rotate: 0 });
scrub(words, { opacity: 0.1 }, { ease: "none", opacity: 1, stagger: 0.05 });`, END, "words"],
  ["random-3d", 17, "Random 3D", "Chữ cái lật 3D ngẫu nhiên", "Letters arrive from random 3D tilts and depths and settle flat, in order.", SRC("index2.js", 85, 111),
    `perspective(chars, 1000); scrub(chars, { opacity: 0, rotateX: function () { return rnd(-120, 120); }, z: function () { return rnd(-200, 200); } }, { ease: "none", opacity: 1, rotateX: 0, z: 0, stagger: 0.02 });`],
  ["fly-z", 18, "Fly From Depth", "Chữ cái bay từ sâu phía sau", "Letters fly forward from deep behind the frame and land with a small overshoot.", SRC("index2.js", 113, 137),
    `perspective(chars, 1000); scrub(chars, { opacity: 0.2, z: -800 }, { ease: "back.out(1.2)", opacity: 1, z: 0, stagger: 0.04 });`],
  ["flip-down", 19, "Flip Down", "Chữ cái lật xuống từ mép trên", "Letters flip down into place from their top edge, coming from slightly behind.", SRC("index2.js", 139, 166),
    `perspective(chars, 1000); scrub(chars, { transformOrigin: "50% 0%", opacity: 0, rotationX: -90, z: -200 }, { ease: "power1", opacity: 1, stagger: 0.05, rotationX: 0, z: 0 });`],
  ["flip-up-random", 20, "Flip Up Random", "Chữ cái lật đứng dậy ngẫu nhiên", "Letters flip up from their baseline in random order, snapping upright.", SRC("index2.js", 168, 196),
    `perspective(chars, 1000); scrub(chars, { transformOrigin: "50% 100%", opacity: 0, rotationX: 90 }, { ease: "power4", opacity: 1, stagger: randomStagger(0.03, chars.length), rotationX: 0 });`],
  ["tumble", 21, "Tumble", "Chữ cái lộn nhào từ xa tới", "Letters tumble forward from far away, spinning on their x axis, the word filling in from its centre.", SRC("index2.js", 198, 235),
    `words.forEach(function (w) { var cs = charsOf(w); perspective(cs, 2000);
  scrub(cs, { opacity: 0, y: function (p, _, arr) { return -40 * Math.abs(p - arr.length / 2); }, z: function () { return rnd(-1500, -600); }, rotationX: function () { return rnd(-500, -200); } },
    { ease: "power1.inOut", opacity: 1, y: 0, z: 0, rotationX: 0, stagger: { each: 0.06, from: "center" } }); });`],
  ["spiral-fan", 22, "Spiral Fan", "Chữ cái xoè quạt rồi xoắn về", "The letters of each word start fanned out in a spiral (spread, raised, turned) and swirl back into the word.", SRC("index2.js", 237, 280),
    `words.forEach(function (w) { var cs = charsOf(w), n = cs.length; perspective(cs, 1000);
  scrub(cs, { x: function (p) { var f = factorOf(p, n); return (n % 2 ? Math.abs(Math.ceil(n / 2) - 1 - f) : Math.abs(Math.ceil(n / 2) - f)) * 200 * (p < n / 2 ? -1 : 1); },
    y: function (p) { return factorOf(p, n) * 60; }, rotationY: -270, rotationZ: function (p) { var f = factorOf(p, n); return p < n / 2 ? Math.abs(f - n / 2) * 8 : -1 * Math.abs(f - n / 2) * 8; } },
    { ease: "power2.inOut", x: 0, y: 0, rotationZ: 0, rotationY: 0, scale: 1 }); });`],
  ["zoom-converge", 23, "Zoom Converge", "Chữ cái phóng to và dồn về", "Letters grow from tiny dots while sliding in, the words coming from alternate sides.", SRC("index2.js", 282, 309),
    `words.forEach(function (w, wp) { scrub(charsOf(w), { scale: 0.01, x: function (p, _, arr) { return wp % 2 ? p * 50 : (arr.length - p - 1) * -50; } }, { ease: "power4", scale: 1, x: 0 }); });`],
  ["elastic-rise", 24, "Elastic Rise", "Chữ cái bật lên đàn hồi từ dưới", "Letters spring up from far below with an elastic bounce, the middle ones first.", SRC("index2.js", 311, 338),
    `var n = chars.length; scrub(chars, { y: function (p) { return (n / 2 - factorOf(p, n) + 6) * 130; } }, { ease: "elastic.out(.4)", y: 0, stagger: { amount: 0.1, from: "center" } });`],
  ["grow-up", 25, "Grow Up", "Chữ cái mọc lên từ chân", "Letters grow up from their baseline one after another, accelerating (power3.in).", SRC("index2.js", 340, 361),
    `scrub(chars, { transformOrigin: "50% 100%", scaleY: 0 }, { ease: "power3.in", opacity: 1, scaleY: 1, stagger: 0.05 });`],
  ["unfold-alt", 26, "Unfold Alternating", "Chữ cái mở dọc xen kẽ trên dưới", "Each word's letters unfold vertically from its centre outward, the first word from the top and the rest from the bottom.", SRC("index2.js", 363, 392),
    `words.forEach(function (w, wp) { scrub(charsOf(w), { transformOrigin: function () { return !wp % 2 ? "50% 0%" : "50% 100%"; }, scaleY: 0 }, { ease: "power1.inOut", scaleY: 1, stagger: { amount: 0.3, from: "center" } }); });`],
  ["words-fly", 27, "Words Fly", "Các từ bay từ phía trước vào", "Words fly in from in front of the camera, tilted and offset at random, and land in the sentence.", SRC("index2.js", 394, 429),
    `perspective(words, 1000);
scrub(words, { z: function () { return rnd(500, 950); }, opacity: 0, xPercent: function () { return rnd(-100, 100); }, yPercent: function () { return rnd(-10, 10); }, rotationX: function () { return rnd(-90, 90); } },
  { ease: "expo", opacity: 1, rotationX: 0, rotationY: 0, xPercent: 0, yPercent: 0, z: 0, stagger: randomStagger(0.006, words.length) });`, END, "words"],
  ["bloom", 28, "Bloom", "Chữ cái nở từ nhoè, to dần ra giữa", "Letters bloom out of a blur: the middle ones start large and low, the outer ones small, all easing into the word.", SRC("index2.js", 431, 477),
    `words.forEach(function (w) { var cs = charsOf(w), n = cs.length, h = Math.ceil(n / 2);
  scrub(cs, { transformOrigin: "50% 100%", scale: function (p) { return mapRange(0, h, 0.5, 2.1, factorOf(p, n)); }, y: function (p) { return mapRange(0, h, 0, 60, factorOf(p, n)); },
    rotation: function (p) { var f = factorOf(p, n); return p < n / 2 ? mapRange(0, h, -4, 0, f) : mapRange(0, h, 0, 4, f); }, filter: "blur(12px) opacity(0)" },
    { ease: "power2.inOut", y: 0, rotation: 0, scale: 1, filter: "blur(0px) opacity(1)", stagger: { amount: 0.15, from: "center" } }); });`],
  ["corner-pop", 29, "Corner Pop", "Chữ cái bật ra từ góc", "Letters pop out from a corner, alternating per word (bottom-left forward, top-right backward).", SRC("index2.js", 479, 508),
    `words.forEach(function (w, p) { scrub(charsOf(w), { transformOrigin: (p % 2 ? 0 : 100) + "% " + (p % 2 ? 100 : 0) + "%", scale: 0 }, { ease: "power4", scale: 1, stagger: { each: 0.03, from: p % 2 ? "end" : "start" } }); });`],
];

const TEXT = { "read-tilt": "Mỗi khung hình là một câu chuyện, kể bằng chuyển động.", "words-fly": "Từng từ bay vào đúng chỗ của mình", "flicker": "Giải mã ký tự" };

export default ITEMS.map(([id, n, title, sub, desc, source, body, end, split]) => ({
  id, kind: "motion", title, sub, desc: `${desc} (Codrops fx${n})`, category: "Text & titles",
  tags: ["text", "letters", "entrance", "codrops", "on-scroll", split === "words" ? "words" : "per letter"],
  source, made: "adapted",
  notes: `Codrops fx${n}: the source's GSAP values; ${[8, 10, 11].includes(n) ? "time-based in the source, so it keeps its own timing" : "the scroll range is now `duration`"}.`,
  options: { duration: "s the whole entrance takes (1.6)", seed: "for the random parts (1)", split: split === "words" ? "words" : "chars" },
  defaults: { duration: 1.6, seed: 1, split: split ?? "chars" },
  uses: ["split", "rand", "mask"],
  css: `.mw-${id} { display: inline-block; }`,
  markup: `<h1 class="mw-${id}">Chuyển động</h1>`,
  fn: fx(body, end),
  use: `MW.${id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())}(document.querySelector(".mw-${id}"), tl, 0.5, { duration: 1.6 });`,
  demo: {
    duration: 4,
    css: `.headline { font-family: Archivo, sans-serif; font-weight: 800; font-size: ${split === "words" ? 96 : 170}px; letter-spacing: -0.03em; line-height: 1.25; text-align: center; max-width: 1600px; }`,
    html: `<div class="center"><div class="headline mw-${id}">${TEXT[id] ?? "Chuyển động đẹp"}</div></div>`,
    run: `MW.${id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())}(q(".mw-${id}"), tl, 0.4, { duration: 2 });`,
  },
}));
