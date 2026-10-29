// Codrops Image Expansion Typography (codrops/ImageExpansionTypography at 0d61479, MIT, Copyright (c) 2009 - 2024 Codrops): a picture set
// inside a headline opens from width 0 to its full size (border-radius 4rem, 16:9; "small" 1:1 at 3.25em, "tiny" 25:9 at 2em), pushing the
// words apart, while marked words skew (-20°) or skew and turn (-5° / -10°) and the paragraph below drifts away; GSAP Flip from the closed
// to the open state (.type--open, css/base.css lines 226-325), scrubbed by ScrollTrigger (js/effect-N/expandImageEffect.js). Port: the
// same CSS states; Flip is not used: the picture's width, the gap and the words' transforms are tweened between the two states on the
// film's timeline, so the line reflows the same way and every frame seeks exactly; the paragraph tween runs over the same span with its
// own ease. The demo pictures (Midjourney, terms not stated) and the Coconat font are not taken: a picture drawn here and Playfair Display.
import { LANDSCAPE, PRODUCT, ABSTRACT } from "../../demo-media.mjs";

const SRC = (n) => ({ repo: "codrops/ImageExpansionTypography", path: `js/effect-${n}/expandImageEffect.js` });
const CSS = `.mw-image-expansion { margin: 0; line-height: 1.1; font-weight: normal; }
.mw-image-expansion .type__expand { vertical-align: top; display: inline-grid; grid-template-columns: min-content; }
.mw-image-expansion .type__expand--center, .mw-image-expansion .type__expand--full { display: block; }
.mw-image-expansion .type__expand--mini { vertical-align: middle; padding: 0 0.125em; }
.mw-image-expansion .type__expand--stack { vertical-align: bottom; grid-template-columns: 100%; justify-items: center; }
.mw-image-expansion .type__expand-img { display: block; position: relative; aspect-ratio: 16/9; width: 0%; overflow: hidden; border-radius: 4rem; }
.mw-image-expansion .type__expand-img-inner { display: block; width: 100%; height: 100%; background-size: cover; background-position: center; }
.mw-image-expansion .type__expand-img--small { aspect-ratio: 1; }
.mw-image-expansion .type__expand-img--tiny { aspect-ratio: 25/9; }
.mw-image-expansion .type__expand--reveal .type__expand-img-inner { width: 100vw; aspect-ratio: 16/9; }
.mw-image-expansion .anim { display: inline-block; white-space: nowrap; }`;

// the open state of each part, as base.css's .type--open rules write it
const OPEN = `
var R = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, em = parseFloat(getComputedStyle(el).fontSize);
var parts = [];
Array.prototype.forEach.call(el.querySelectorAll(".type__expand"), function (box) {
  var stack = box.classList.contains("type__expand--stack"), first = stack && box.firstElementChild && box.firstElementChild.classList.contains("type__expand-img");
  parts.push([box, { gap: 0 }, { gap: (stack ? 0.5 : 1.5) * R }]);
  if (stack) parts.push([box, { paddingTop: 0, paddingBottom: 0 }, first ? { paddingTop: R, paddingBottom: 0 } : { paddingTop: 0, paddingBottom: R }]);
});
Array.prototype.forEach.call(el.querySelectorAll(".type__expand-img"), function (img) {
  // open widths: small 3.25em, tiny 2em, a full-line picture 100 %; an inline / centred reveal measured on the source page (1920 px wide,
  // 80 px type: 634 px, 7.9em), since its 100 % resolves against the source's own grid
  var full = img.closest(".type__expand--full");
  var to = img.classList.contains("type__expand-img--small") ? 3.25 * em + "px" : img.classList.contains("type__expand-img--tiny") ? 2 * em + "px" : full ? "100%" : o.openWidth * em + "px";
  parts.push([img, { width: "0%" }, { width: to }]);
});
Array.prototype.forEach.call(el.querySelectorAll(".skewed"), function (w) { parts.push([w, { skewX: 0 }, { skewX: -20 }]); });
Array.prototype.forEach.call(el.querySelectorAll(".rotated"), function (w) { parts.push([w, { skewX: 0, rotation: 0 }, { skewX: -5, rotation: -10 }]); });
var open = function (ease) { parts.forEach(function (p) { tl.fromTo(p[0], p[1], Object.assign({}, p[2], { duration: o.duration, ease: ease, immediateRender: true }), at); }); };
var block = o.block ? MW.el(o.block) : el.nextElementSibling;
`;
const mk = (body) => new Function("el", "tl", "at", "o", OPEN + body + "\nreturn at + o.duration;");

const LINES = {
  1: "Biết ơn là cách mới<br>để tôi đáp lại<br>những <span class=\"type__expand type__expand--inline type__expand--reveal\"><span class=\"type__expand-img\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/picture.svg)\"></span></span><span class=\"anim skewed\">phán xét.</span></span>",
  2: "Đời là chuyến đi dài;<br>hãy đón những<br><span class=\"type__expand type__expand--reveal type__expand--center\"><span>khúc rẽ </span><span class=\"type__expand-img\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/picture.svg)\"></span></span><span class=\"anim skewed\">và nhảy múa</span></span><br>dưới trời sao.",
  3: "Để từng dặm đường mở ra<br>như những câu chuyện<br><span class=\"type__expand type__expand--full\"><span class=\"type__expand-img\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/picture.svg)\"></span></span></span>mỗi câu một hơi thở.",
  4: "Bay qua <span class=\"type__expand type__expand--stack\"><span class=\"anim rotated\">đỉnh núi</span><span class=\"type__expand-img type__expand-img--small\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/picture.svg)\"></span></span></span> vào <span class=\"type__expand type__expand--stack\"><span class=\"anim rotated\">mây trời,</span><span class=\"type__expand-img type__expand-img--small\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/product.svg)\"></span></span></span><br>nghe gió thì thầm như <span class=\"type__expand type__expand--stack\"><span class=\"type__expand-img type__expand-img--small\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/abstract.svg)\"></span></span><span class=\"anim rotated\">tiếng vọng.</span></span>",
  5: "Giong buồm <span class=\"type__expand type__expand--mini\"><span class=\"type__expand-img type__expand-img--tiny\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/picture.svg)\"></span></span></span> qua biển<br>sao, nơi muôn vì sao <span class=\"type__expand type__expand--mini\"><span class=\"type__expand-img type__expand-img--tiny\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/abstract.svg)\"></span></span></span> viết<br>nên khúc ca <span class=\"type__expand type__expand--mini\"><span class=\"type__expand-img type__expand-img--tiny\"><span class=\"type__expand-img-inner\" style=\"background-image:url(assets/product.svg)\"></span></span></span> vũ trụ.",
};
const PARA = "Mọi thứ đều đổi thay: ngọn núi tưởng như vững chãi cũng chỉ là một khoảnh khắc dừng chân của cát bụi; dòng sông không biết ngày mai, chỉ mải miết tìm về biển lớn.";

const V = [
  [1, "Image Expand: Inline Reveal", "Ảnh mở giữa dòng, chữ nghiêng", "A picture opens inside the headline above a word, pushing the line apart while the word skews; the paragraph below drifts up and fades (power1.inOut).",
    `open("power1.inOut");
if (block) tl.fromTo(block, { yPercent: 0, opacity: 1, skewX: 0 }, { yPercent: -150, opacity: 0.2, skewX: -8, duration: o.duration, ease: "sine.inOut", immediateRender: true }, at);`],
  [2, "Image Expand: Centred Line", "Ảnh mở giữa dòng, chữ dưới lướt ngang", "A picture opens on its own line between words in the middle of the headline; the paragraph below slides across and skews the other way.",
    `open("sine.inOut");
if (block) tl.fromTo(block, { xPercent: 15, skewX: -5, opacity: 1 }, { xPercent: -15, skewX: 5, opacity: 0.2, duration: o.duration, ease: "sine.inOut", immediateRender: true }, at);`],
  [3, "Image Expand: Full Line", "Ảnh mở giữa dòng, chữ dưới giãn dòng", "A wide picture opens across a full line of the headline (sine out); the paragraph below loosens its line height and lifts away.",
    `open("sine");
if (block) tl.fromTo(block, { lineHeight: 1.2, yPercent: 0, skewX: 0, opacity: 1 }, { yPercent: -40, skewX: -2, lineHeight: 2, opacity: 0.2, duration: o.duration, ease: "sine.inOut", immediateRender: true }, at);`],
  [4, "Image Expand: Small Stacks", "Chồng ảnh nhỏ mở giữa chữ xoay", "Small square pictures open above or below words that skew and turn, three of them along the headline.",
    `open("sine.inOut");
if (block) tl.fromTo(block, { yPercent: 0, skewX: 0, rotation: 0, opacity: 1 }, { yPercent: -50, skewX: -4, rotation: 2, opacity: 0.2, duration: o.duration, ease: "sine.inOut", immediateRender: true }, at);`],
  [5, "Image Expand: Tiny Inline", "Ảnh mở toàn khung giữa dòng", "Tiny wide pictures open between the words of a long headline, like images used as words.",
    `open("sine.inOut");
if (block) tl.fromTo(block, { yPercent: 0, opacity: 1 }, { yPercent: -60, opacity: 0.2, duration: o.duration, ease: "sine.inOut", immediateRender: true }, at);`],
];

export default V.map(([n, title, sub, desc, body]) => ({
  id: `image-expand-${n}`, kind: "motion", title, sub, desc: `${desc} (Codrops Image Expansion Typography, effect ${n})`, category: "Text & titles",
  tags: ["text", "image", "headline", "reveal", "expand", "codrops"], source: SRC(n), made: "adapted",
  notes: "el is the headline (.mw-image-expansion) holding .type__expand boxes as in the source; the paragraph that drifts is the next element (or `block`). The headline's pictures are the film's own.",
  options: { duration: "s (2.4)", block: "the paragraph that drifts (the next element)", openWidth: "em an inline picture opens to (7.9)" },
  defaults: { duration: 2.4, block: null, openWidth: 7.9 },
  css: CSS,
  markup: `<h2 class="mw-image-expansion">…<span class="type__expand"><span class="type__expand-img"><span class="type__expand-img-inner" style="background-image:url(assets/picture.svg)"></span></span><span class="anim skewed">từ</span></span></h2><p>…</p>`,
  fn: mk(body),
  use: `MW.imageExpand${n}(document.querySelector(".mw-image-expansion"), tl, 0.5, { duration: 2.4 });`,
  assets: [{ path: "picture.svg", data: LANDSCAPE }, { path: "product.svg", data: PRODUCT }, { path: "abstract.svg", data: ABSTRACT }],
  demo: {
    duration: 4.5,
    css: `.page { position: absolute; inset: 0; padding: 90px 160px; display: flex; flex-direction: column; justify-content: flex-start; gap: 50px; }
.mw-image-expansion { font-family: 'Playfair Display', serif; font-size: ${n === 5 ? 92 : n === 2 ? 80 : 96}px; ${n === 2 ? "text-align: center;" : ""} ${n === 3 ? "max-width: 1000px;" : ""} }
.para { max-width: 760px; font-size: 26px; line-height: 1.5; opacity: .7; ${n === 4 ? "align-self: flex-end;" : ""} }`,
    html: `<div class="page"><h2 class="mw-image-expansion">${LINES[n]}</h2><p class="para">${PARA}</p></div>`,
    run: `MW.imageExpand${n}(q(".mw-image-expansion"), tl, 0.5, { duration: 2.6 });`,
  },
}));
