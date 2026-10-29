// TakayuStudio, Captions & Subtitles and SVG & Path (batch 3.3): subtitle conventions (pop-on, paint-on, roll-up, word highlights,
// karaoke) and SVG line work (draw, trim, morph, follow, goo), written here from the site's ideas and numbers (no code of the site).
// Caption timings are frame-snapped where the convention asks for it. Sizes: the reference × 4-5.
import { T } from "../../takayu/define.mjs";
import { demo, headline } from "../../takayu/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const FOOT = `#demo { background: #0b0d12; color: #fff; font-family: Inter, sans-serif; } .ft { position: absolute; inset: 0; background: url(assets/shot.svg) center / cover; filter: brightness(0.75); }
.cap { position: absolute; left: 0; right: 0; text-align: center; font-weight: 800; paint-order: stroke fill; }`;
const SHOT = [{ path: "shot.svg", data: LANDSCAPE }];
const SV = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .sv { position: absolute; inset: 0; display: grid; place-items: center; }`;

export default [
  T("motion/echo-ghosts", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, ex = gsap.parseEase("expo.out"), p1 = gsap.parseEase("power1.out"), pi = gsap.parseEase("power2.in"), ghosts = [];
      [[0.07, 0.45], [0.14, 0.25], [0.21, 0.12]].forEach(function (g) { var c = el.cloneNode(true); c.removeAttribute("id"); c.style.position = "absolute"; c.style.left = el.offsetLeft + "px"; c.style.top = el.offsetTop + "px"; c.style.margin = "0"; c.style.pointerEvents = "none"; host.insertBefore(c, el); ghosts.push({ c: c, lag: g[0], a: g[1] }); });
      var X = function (t) { return -o.distance * (1 - ex(Math.max(0, Math.min(1, t / o.duration)))); };
      return MW.drive(tl, at, o.exitAt + 0.35, function (t) {
        var e = pi(Math.max(0, Math.min(1, (t - o.exitAt) / 0.35))), gf = 1 - p1(Math.max(0, Math.min(1, (t - 0.85) / 0.35)));
        gsap.set(el, { x: X(t) + 8 * o.unit * e }); el.style.opacity = String(1 - e);
        ghosts.forEach(function (g) { gsap.set(g.c, { x: X(t - g.lag) }); g.c.style.opacity = t >= g.lag ? String(g.a * gf) : "0"; });
      });
    },
    options: { distance: "px it slides (1100)", duration: "s (0.9), expo.out", exitAt: "s (3.25)", unit: "px per reference unit (5)" }, defaults: { distance: 1100, duration: 0.9, exitAt: 3.25, unit: 5 },
    demo: { css: `${FOOT}\n.eg { position: absolute; left: 50%; top: 760px; width: 1300px; height: 220px; margin-left: -650px; border-radius: 40px; background: rgba(12,14,22,0.88); overflow: hidden; display: flex; align-items: center; padding: 0 70px; box-sizing: border-box; }
.eg span { font-size: 110px; font-weight: 800; color: #a99bff; white-space: nowrap; }`, html: `<div class="ft"></div><div class="eg"><span>Một ngày mới bắt đầu</span></div>`, run: `MW.motionEchoGhosts(q(".eg span"), tl, 0.3, {});`, duration: 4.2 },
    assets: SHOT,
  }),

  T("text/subtitle-pop-on", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cues = Array.prototype.slice.call(el.querySelectorAll(o.cues)), snap = function (s) { return Math.round(s * o.fps) / o.fps; };
      return MW.drive(tl, at, o.loop, function (t) { cues.forEach(function (c, i) { var w = o.times[i]; c.style.visibility = t >= snap(w[0]) && t < snap(w[1]) ? "visible" : "hidden"; }); });
    },
    options: { times: "[[in, out], ...] s per cue, snapped to frames ([[0.35, 1.95], [2.03, 3.6]])", fps: "(24)", cues: "selector of the cues", loop: "s (4.2)" },
    defaults: { times: [[0.35, 1.95], [2.03, 3.6]], fps: 24, cues: ".po", loop: 4.2 },
    notes: "Rules: ≤ 42 characters a line, ≤ 2 lines, ≤ 17-20 characters a second, each cue 20 frames to 7 s, a gap of at least 2 frames; no motion.",
    assets: SHOT,
    demo: { css: `${FOOT}\n.po { bottom: 140px; font-size: 72px; -webkit-text-stroke: 14px #0b0d12; visibility: hidden; line-height: 1.3; }`, html: `<div class="ft"></div><div class="pa"><div class="cap po">Chúng tôi bắt đầu từ một ý tưởng nhỏ</div><div class="cap po">và biến nó thành một bộ phim.</div></div>`, run: `MW.textSubtitlePopOn(q(".pa"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/paint-on-caption", {
    kind: "block",
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), S = MW.split(cap, "chars"), times = [], t0 = 0, caret = document.createElement("span");
      S.words.forEach(function (w, wi) { Array.prototype.forEach.call(w.querySelectorAll(".mw-ch"), function () { times.push(t0); t0 += o.char; }); t0 += o.pause; });
      var scale = Math.min(1, o.max / t0); S.chars.forEach(function (c) { c.style.padding = "0 " + o.pad + "px"; c.style.margin = "0 " + (-o.pad) + "px"; });
      caret.style.cssText = "position:absolute;width:8px;background:" + o.accent + ";pointer-events:none;"; el.appendChild(caret);
      return MW.drive(tl, at, o.cutAt + 0.1, function (t) {
        var next = null, on = t < o.cutAt;
        S.chars.forEach(function (c, i) { var vis = on && t >= o.start + times[i] * scale; c.style.visibility = vis ? "visible" : "hidden"; c.style.background = vis ? o.box : "transparent"; if (!vis && next == null) next = c; });
        if (next && on && t > o.start && Math.floor(t * 3 * 5) % 5 < 3) { var r = next.getBoundingClientRect(), b = el.getBoundingClientRect(); caret.style.left = (r.left - b.left) + "px"; caret.style.top = (r.top - b.top) + "px"; caret.style.height = r.height + "px"; caret.style.opacity = "1"; } else caret.style.opacity = "0";
      });
    },
    options: { char: "s per character (0.12)", pause: "s between words (0.14)", max: "s it may take (2.2)", start: "s (0.35)", cutAt: "s the caption is cut (3.75)", pad: "px each box's side pad (6)", box: "box colour", accent: "caret colour", caption: "the caption" },
    defaults: { char: 0.12, pause: 0.14, max: 2.2, start: 0.35, cutAt: 3.75, pad: 6, box: "rgba(8,9,14,0.88)", accent: "#a99bff", caption: ".pc" },
    assets: SHOT,
    demo: { css: `${FOOT}\n.pc { bottom: 160px; font-size: 76px; line-height: 1.35; }`, html: `<div class="ft"></div><div class="pw"><div class="cap pc">Xin chào, tôi là Minh</div></div>`, run: `MW.textPaintOnCaption(q(".pw"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/roll-up-caption", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var win = el.querySelector(o.window), lines = [], p2 = gsap.parseEase("power2.out"), rowH = parseFloat(getComputedStyle(win).fontSize) * 1.45;
      o.lines.forEach(function (txt) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;line-height:" + rowH + "px;"; var g = Array.from(txt.normalize("NFC")); g.forEach(function (ch) { var s = document.createElement("span"); s.textContent = ch; s.style.cssText = "background:" + o.box + ";padding:0.06em 0;"; d.appendChild(s); }); win.appendChild(d); lines.push(d); });
      var start = function (k) { return o.start + o.every * k; };
      return MW.drive(tl, at, o.loop, function (t) {
        var clr = 1 - Math.max(0, Math.min(1, (t - o.clearAt) / 0.2));
        lines.forEach(function (d, k) {
          if (t < start(k) - 0.27 && k > 0) { d.style.visibility = "hidden"; return; }
          var shift = 0; for (var j = k + 1; j < lines.length; j++) shift += p2(Math.max(0, Math.min(1, (t - start(j) + 0.27) / 0.27)));
          var row = 2 - shift; gsap.set(d, { y: row * rowH }); d.style.visibility = "visible"; d.style.opacity = String(Math.max(0, Math.min(1, row + 1)) * clr);
          var n = d.children.length; Array.prototype.forEach.call(d.children, function (s, i) { s.style.visibility = t >= start(k) + 0.5 * i / n ? "visible" : "hidden"; });
        });
      });
    },
    options: { lines: "the caption lines in order", start: "s (0.4)", every: "s per new line (0.85)", clearAt: "s (4.55)", box: "box colour", window: "the 3-row window", loop: "s (5)" },
    defaults: { lines: ["Chào mừng quý vị", "đến với bản tin sáng nay.", "Hôm nay trời Hà Nội", "có mưa rào nhẹ", "ở nhiều nơi."], start: 0.4, every: 0.85, clearAt: 4.55, box: "rgba(8,9,14,0.88)", window: ".ru", loop: 5 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.ru { position: absolute; left: 300px; bottom: 90px; width: 1320px; height: ${68 * 1.45 * 3}px; overflow: hidden; font-size: 68px; font-weight: 800; }`, html: `<div class="ft"></div><div class="rw"><div class="ru"></div></div>`, run: `MW.textRollUpCaption(q(".rw"), tl, 0, {});`, duration: 5 },
  }),

  T("text/live-caption-block", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var blocks = Array.prototype.slice.call(el.querySelectorAll(o.blocks));
      return MW.drive(tl, at, o.loop, function (t) { blocks.forEach(function (b, i) { var w = o.times[i]; b.style.visibility = t >= w[0] && t < w[1] ? "visible" : "hidden"; }); });
    },
    options: { times: "[[in, out], ...] per block ([[0.3, 2.6], [2.6, 4.9]]); a block's time ≈ its characters ÷ 270 × 60 s", blocks: "selector of the blocks", loop: "s (5.4)" },
    defaults: { times: [[0.3, 2.6], [2.6, 4.9]], blocks: ".lb", loop: 5.4 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.lb { position: absolute; left: 50%; bottom: 80px; width: 1340px; height: 250px; margin-left: -670px; border-radius: 14px; background: #0b0d12; display: grid; place-items: center; text-align: center; font-size: 68px; font-weight: 800; line-height: 1.3; visibility: hidden; }
.live { position: absolute; left: 80px; top: 70px; display: flex; align-items: center; gap: 20px; font: 800 40px Inter, sans-serif; letter-spacing: 0.1em; } .live b { width: 26px; height: 26px; border-radius: 50%; background: #ff3b4a; }`,
      html: `<div class="ft"></div><div class="lw"><div class="live"><b></b>TRỰC TIẾP</div><div class="lb">Đội tuyển đã về tới sân bay<br>trong vòng tay người hâm mộ</div><div class="lb">Hàng nghìn người đã chờ<br>từ sáng sớm để đón đội</div></div>`, run: `MW.textLiveCaptionBlock(q(".lw"), tl, 0, {});`, duration: 5.4 },
  }),

  T("text/active-word-caption", {
    kind: "block",
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), ws = MW.split(cap, "words").words, len = ws.map(function (w) { return w.textContent.length; }), tot = len.reduce(function (a, b) { return a + b; }, 0), p2 = gsap.parseEase("power2.out"), col = getComputedStyle(cap).color, mix = gsap.utils.interpolate(col, o.accent);
      var tt = [], acc = o.from; len.forEach(function (l) { var d = (o.to - o.from) * l / tot; tt.push([acc, acc + d]); acc += d; });
      return MW.drive(tl, at, o.loop, function (t) {
        cap.style.opacity = String(Math.max(0, Math.min(1, (t - 0.15) / 0.15)) * (1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.2))));
        ws.forEach(function (w, i) { var a = tt[i][0], b = tt[i][1], k = t < a ? 0 : t < a + 0.08 ? p2((t - a) / 0.08) : t < b ? 1 : t < b + 0.08 ? 1 - p2((t - b) / 0.08) : 0; gsap.set(w, { scale: 1 + 0.1 * k, y: -o.lift * k }); w.style.color = k > 0.5 ? o.accent : col; void mix; });
      });
    },
    options: { from: "s the first word starts (0.4)", to: "s the last ends (3.4): split by word length, a stand-in for transcript times", lift: "px (8)", accent: "colour of the spoken word", outAt: "s (4.15)", caption: "the caption page" },
    defaults: { from: 0.4, to: 3.4, lift: 8, accent: "#ffd23d", outAt: 4.15, caption: ".aw", loop: 4.6 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.aw { bottom: 170px; font-size: 120px; font-weight: 800; -webkit-text-stroke: 16px #0b0d12; opacity: 0; }`, html: `<div class="ft"></div><div class="awr"><div class="cap aw">Hãy thử ngay hôm nay</div></div>`, run: `MW.textActiveWordCaption(q(".awr"), tl, 0, {});`, duration: 4.6 },
  }),

  T("text/caption-glide-pill", {
    kind: "block",
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), ws = MW.split(cap, "words").words, n = ws.length, pill = document.createElement("div"), p2 = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in"), col = getComputedStyle(cap).color;
      pill.style.cssText = "position:absolute;border-radius:999px;background:" + o.accent + ";pointer-events:none;"; el.insertBefore(pill, el.firstChild); cap.style.position = "relative";
      var box = function (w) { var r = w.getBoundingClientRect(), b = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(w).fontSize); return [r.left - b.left - o.pad * fs, r.top - b.top + r.height / 2 - 0.59 * fs, r.width + 2 * o.pad * fs, 1.18 * fs]; };
      var T0 = function (i) { return o.from + (o.to - o.from) * i / n; };
      return MW.drive(tl, at, o.loop, function (t) {
        var k = Math.max(0, Math.min(n - 1, Math.floor((t - o.from) / ((o.to - o.from) / n)))), cur = box(ws[k]), prev = box(ws[Math.max(0, k - 1)]), u = k ? p2(Math.min(1, (t - T0(k)) / 0.1)) : 1;
        var bx = prev.map(function (v, j) { return v + (cur[j] - v) * u; }), g = p2(Math.max(0, Math.min(1, (t - 0.3) / 0.12))) * (1 - pi(Math.max(0, Math.min(1, (t - o.outAt) / 0.15))));
        pill.style.left = (bx[0] + bx[2] * (1 - g) / 2) + "px"; pill.style.top = (bx[1] + bx[3] * (1 - g) / 2) + "px"; pill.style.width = bx[2] * g + "px"; pill.style.height = bx[3] * g + "px";
        ws.forEach(function (w, i) { w.style.color = i === k && g > 0.5 && t < o.outAt + 0.1 ? o.ink : col; });
      });
    },
    options: { from: "s (0.4)", to: "s (3.4): word times even (a stand-in for transcript times)", pad: "em each side (0.22)", accent: "pill colour", ink: "text colour inside the pill", outAt: "s (3.85)", caption: "the caption" },
    defaults: { from: 0.4, to: 3.4, pad: 0.22, accent: "#ffd23d", ink: "#151a28", outAt: 3.85, caption: ".gp", loop: 4.4 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.gpw { position: absolute; left: 0; right: 0; bottom: 170px; height: 200px; } .gp { position: absolute; left: 0; right: 0; text-align: center; font-size: 130px; font-weight: 800; }`, html: `<div class="ft"></div><div class="gpw"><div class="gp">Đọc tới đâu sáng tới đó</div></div>`, run: `MW.textCaptionGlidePill(q(".gpw"), tl, 0, {});`, duration: 4.4 },
  }),

  T("text/caption-key-pop", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var pages = Array.prototype.slice.call(el.querySelectorAll(o.pages)), p1 = gsap.parseEase("power1.out"), bk = gsap.parseEase("back.out(1.7)");
      return MW.drive(tl, at, o.loop, function (t) {
        var ex = Math.max(0, Math.min(1, (t - o.exitAt) / 0.15));
        pages.forEach(function (p, i) {
          var s0 = o.start + o.every * i, d = t - s0, on = d >= 0 && (i === pages.length - 1 ? t < o.exitAt + 0.15 : d < o.every), key = p.classList.contains("key");
          p.style.visibility = on ? "visible" : "hidden"; if (!on) return;
          var s = d < 0.1 ? 0.8 + 0.3 * p1(d / 0.1) : d < 0.28 ? 1.1 - 0.1 * p1((d - 0.1) / 0.18) : 1; if (ex) s *= 1 - 0.3 * ex;
          gsap.set(p, { scale: s, rotation: key ? -4 * bk(Math.min(1, d / 0.12)) : 0 }); p.style.opacity = String(Math.min(1, d / 0.05) * (1 - ex));
        });
      });
    },
    options: { start: "s (0.25)", every: "s per page (0.62)", exitAt: "s (3.3)", pages: "selector of the pages (the key page has .key)", loop: "s (3.8)" },
    defaults: { start: 0.25, every: 0.62, exitAt: 3.3, pages: ".kp", loop: 3.8 },
    demo: { css: `#demo { background: linear-gradient(180deg, #2a2f45, #141724); font-family: Inter, sans-serif; } .th { position: absolute; left: 50%; bottom: 0; width: 760px; height: 820px; margin-left: -380px; border-radius: 380px 380px 0 0; background: #0e1018; }
.th::before { content: ""; position: absolute; left: 230px; top: -260px; width: 300px; height: 360px; border-radius: 50%; background: #0e1018; }
.kp { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 168px; font-weight: 900; text-transform: uppercase; color: #fff; -webkit-text-stroke: 28px #000; paint-order: stroke fill; text-shadow: 8px 12px 0 #000; visibility: hidden; }
.kp.key { font-size: 208px; color: #ffd23d; }`,
      html: `<div class="th"></div><div class="kw"><div class="kp">Bí quyết</div><div class="kp">là làm</div><div class="kp key">mỗi ngày</div><div class="kp">một chút</div></div>`, run: `MW.textCaptionKeyPop(q(".kw"), tl, 0, {});`, duration: 3.8 },
  }),

  T("text/caption-spring-pop", {
    kind: "block",
    uses: ["split", "drive", "spring"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), ws = MW.split(cap, "words").words, sp = MW.spring(o.k, o.c, 1);
      if (o.accent) ws[ws.length - 1].style.color = o.accent; ws.forEach(function (w) { w.style.transformOrigin = "50% 60%"; });
      return MW.drive(tl, at, o.loop, function (t) {
        var f = 1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.25));
        ws.forEach(function (w, i) { var d = t - o.start - i * o.every, v = d < 0 ? 0 : sp.at(d); gsap.set(w, { scale: 0.6 + 0.4 * v }); w.style.opacity = String(Math.max(0, Math.min(1, v)) * f); });
      });
    },
    options: { k: "spring stiffness (100)", c: "damping (10)", start: "s (0.3)", every: "s per word (0.167: 5 frames at 30 fps)", accent: "last word colour", outAt: "s (3.25)", caption: "the caption" },
    defaults: { k: 100, c: 10, start: 0.3, every: 0.167, accent: "#ffd23d", outAt: 3.25, caption: ".sp", loop: 3.8 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.sp { bottom: 170px; font-size: 120px; -webkit-text-stroke: 14px #0b0d12; }`, html: `<div class="ft"></div><div class="spw"><div class="cap sp">Từng từ bật lên thật vui</div></div>`, run: `MW.textCaptionSpringPop(q(".spw"), tl, 0, {});`, duration: 3.8 },
  }),

  T("text/karaoke-fill", {
    kind: "block",
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), ws = MW.split(cap, "words").words, len = ws.map(function (w) { return w.textContent.length; }), tot = len.reduce(function (a, b) { return a + b; }, 0), parts = [], acc = o.from;
      ws.forEach(function (w, i) { var d = (o.to - o.from) * len[i] / tot; w.style.position = "relative"; var c = document.createElement("span"); c.textContent = w.textContent; c.style.cssText = "position:absolute;left:0;top:0;color:" + o.accent + ";white-space:nowrap;"; var edge = document.createElement("span"); edge.style.cssText = "position:absolute;top:-0.1em;bottom:-0.1em;width:3px;background:" + o.ink + ";"; w.appendChild(c); w.appendChild(edge); parts.push({ w: w, c: c, e: edge, a: acc, b: acc + d }); acc += d; });
      return MW.drive(tl, at, o.loop, function (t) {
        cap.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.3)));
        parts.forEach(function (p) { var u = Math.max(0, Math.min(1, (t - p.a) / (p.b - p.a))), W = p.w.offsetWidth; p.c.style.clipPath = "inset(-0.4em " + (W * (1 - u)) + "px -0.4em -10px)"; p.e.style.left = (W * u) + "px"; p.e.style.opacity = u > 0 && u < 1 ? "1" : "0"; });
      });
    },
    options: { from: "s (0.4)", to: "s (3.6): each word fills over exactly its own time (split by length here; from the transcript in a film)", accent: "fill colour", ink: "edge line colour", outAt: "s (4.2)", caption: "the lyric line" },
    defaults: { from: 0.4, to: 3.6, accent: "#ffd23d", ink: "#ffffff", outAt: 4.2, caption: ".kf", loop: 4.8 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.kf { bottom: 180px; font-size: 120px; -webkit-text-stroke: 16px #0b0d12; }`, html: `<div class="ft"></div><div class="kfw"><div class="cap kf">Hà Nội mùa thu</div></div>`, run: `MW.textKaraokeFill(q(".kfw"), tl, 0, {});`, duration: 4.8 },
  }),

  T("text/subtitle-fade-sync", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sign = o.sign ? MW.el(o.sign) : null, lin = function (a, d, t) { return Math.max(0, Math.min(1, (t - a) / d)); };
      return MW.drive(tl, at, o.loop, function (t) {
        if (sign) sign.style.opacity = String(lin(o.signIn[0], o.signIn[1] - o.signIn[0], t) * (1 - lin(o.signOut[0], o.signOut[1] - o.signOut[0], t)));
        var mi = (o.signIn[0] + o.signIn[1]) / 2, mo = (o.signOut[0] + o.signOut[1]) / 2; el.style.opacity = String(lin(mi - o.fade / 2, o.fade, t) * (1 - lin(mo - o.fade / 2, o.fade, t)));
      });
    },
    options: { fade: "s each fade (0.3), centred on the sign's own fade", sign: "the sign in the shot", signIn: "[from, to] s the sign fades in ([0.4, 1.0])", signOut: "[from, to] s it fades out ([2.8, 3.4])", loop: "s (4.6)" },
    defaults: { fade: 0.3, sign: null, signIn: [0.4, 1.0], signOut: [2.8, 3.4], loop: 4.6 },
    notes: "The subtitle must end at least 2 frames before a shot change.",
    assets: SHOT,
    demo: { css: `${FOOT}\n.sg { position: absolute; left: 610px; top: 200px; width: 700px; height: 300px; border-radius: 20px; background: #1d3a2e; border: 10px solid #e8e2c8; display: grid; place-items: center; font: 800 110px Inter, sans-serif; color: #e8e2c8; opacity: 0; }
.fs { bottom: 120px; font-size: 68px; -webkit-text-stroke: 12px #0b0d12; opacity: 0; }`, html: `<div class="ft"></div><div class="sg">OPEN</div><div class="cap fs">[BIỂN HIỆU] ĐANG MỞ CỬA</div>`, run: `MW.textSubtitleFadeSync(q(".fs"), tl, 0, { sign: ".sg" });`, duration: 4.6 },
  }),

  T("text/rsvp-flash", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var words = o.text.split(/\s+/), seq = [], t0 = o.start, seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
      var gr = function (s) { s = s.normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
      while (t0 < o.cutAt) words.forEach(function (w) { if (t0 >= o.cutAt) return; var d = o.per * (/[.,!?;:]$/.test(w) || gr(w).length > 8 ? 1.5 : 1); seq.push({ w: w, t: t0 }); t0 += d; });
      var L = document.createElement("span"), M = document.createElement("span"), R = document.createElement("span"); el.textContent = ""; el.style.position = "relative"; el.style.width = "100%"; el.style.height = "1.3em";
      L.style.cssText = "position:absolute;right:50%;top:0;white-space:pre;"; M.style.cssText = "position:absolute;left:50%;top:0;transform:translateX(-50%);color:" + o.accent + ";"; R.style.cssText = "position:absolute;top:0;white-space:pre;";
      el.appendChild(L); el.appendChild(M); el.appendChild(R);
      return MW.drive(tl, at, o.loop, function (t) {
        var cur = null; seq.forEach(function (s) { if (t >= s.t) cur = s; }); var on = cur && t < o.cutAt; el.style.visibility = on ? "visible" : "hidden"; if (!on) return;
        var g = gr(cur.w), k = Math.floor(0.35 * g.length); L.textContent = g.slice(0, k).join(""); M.textContent = g[k] || ""; R.textContent = g.slice(k + 1).join("");
        L.style.marginRight = (M.offsetWidth / 2) + "px"; R.style.left = "calc(50% + " + (M.offsetWidth / 2) + "px)";
      });
    },
    options: { text: "the sentence", per: "s per word (0.2: 300 words a minute), × 1.5 after punctuation or for long words", start: "s (0.35)", cutAt: "s (3.85)", accent: "the focus letter", loop: "s (4.2)" },
    defaults: { text: "Đọc nhanh hơn bằng cách nhìn vào một điểm duy nhất.", per: 0.2, start: 0.35, cutAt: 3.85, accent: "#ff5d6c", loop: 4.2 },
    demo: { css: `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; } .rv { position: absolute; left: 0; right: 0; top: 470px; font-size: 150px; font-weight: 700; }
.rvl { position: absolute; left: 400px; right: 400px; height: 4px; background: #2a3350; } .rvt { position: absolute; left: 50%; width: 6px; height: 50px; margin-left: -3px; background: #ff5d6c; }`,
      html: `<div class="rvl" style="top:410px"></div><div class="rvl" style="top:680px"></div><div class="rvt" style="top:410px"></div><div class="rvt" style="top:630px"></div><div class="rv"></div>`, run: `MW.textRsvpFlash(q(".rv"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/phrase-line-break", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cap = el.querySelector(o.caption), txt = cap.textContent.trim().normalize("NFC"), words = txt.split(/\s+/), seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null, ex = gsap.parseEase("expo.out");
      var gr = function (s) { if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
      // the break: the word boundary nearest the middle that does not split a kept compound (and prefers a comma)
      var best = 1, bestD = 1e9, total = txt.length;
      for (var i = 1; i < words.length; i++) { var left = words.slice(0, i).join(" "), pair = (words[i - 1] + " " + words[i]).toLowerCase(), keep = o.keep.some(function (k) { return pair.indexOf(k) >= 0 || k.indexOf(pair) >= 0; }); if (keep) continue; var d = Math.abs(left.length - total / 2) - (/,$/.test(words[i - 1]) ? 6 : 0); if (d < bestD) { bestD = d; best = i; } }
      var lay = function (lines, fs) { var box = document.createElement("div"); box.style.cssText = "position:absolute;left:0;right:0;top:0;visibility:hidden;text-align:center;font-size:" + fs + "px;line-height:1.25;"; el.appendChild(box); var pos = [];
        lines.forEach(function (ln, li) { var d = document.createElement("div"); gr(ln).forEach(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.whiteSpace = "pre"; d.appendChild(s); }); box.appendChild(d); });
        Array.prototype.forEach.call(box.querySelectorAll("span"), function (s) { if (s.textContent !== " ") pos.push([s.offsetLeft, s.offsetTop + s.parentNode.offsetTop]); }); el.removeChild(box); return pos; };
      var A = lay([txt], o.oneSize), B = lay([words.slice(0, best).join(" "), words.slice(best).join(" ")], o.twoSize);
      cap.textContent = ""; var chars = []; gr(txt).forEach(function (g) { if (g === " ") return; var s = document.createElement("span"); s.textContent = g; s.style.cssText = "position:absolute;left:0;top:0;white-space:pre;transform-origin:0 0;font-size:" + o.oneSize + "px;"; cap.appendChild(s); chars.push(s); });
      var n = chars.length;
      return MW.drive(tl, at, o.loop, function (t) {
        chars.forEach(function (s, i) { var st = 0.5 * i / Math.max(1, n - 1), u = ex(Math.max(0, Math.min(1, (t - o.at - st) / 0.55))) * (1 - ex(Math.max(0, Math.min(1, (t - o.backAt - st) / 0.55)))), a = A[i], b = B[i];
          gsap.set(s, { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, scale: 1 + (o.twoSize / o.oneSize - 1) * u }); });
      });
    },
    options: { keep: "compounds never split (Vietnamese multi-syllable words, names)", oneSize: "px of the one-line caption (58)", twoSize: "px of the two-line caption (84)", at: "s (0.45)", backAt: "s it merges back (3.85)", caption: "the caption", loop: "s (4.6)" },
    defaults: { keep: ["thành phố", "hồ chí minh", "hà nội", "việt nam"], oneSize: 58, twoSize: 84, at: 0.45, backAt: 3.85, caption: ".pl", loop: 4.6 },
    assets: SHOT,
    demo: { css: `${FOOT}\n.plw { position: absolute; left: 160px; right: 160px; bottom: 120px; height: 240px; font-weight: 800; color: #fff; -webkit-text-stroke: 10px #0b0d12; paint-order: stroke fill; } .pl { position: absolute; left: 0; right: 0; top: 0; }`,
      html: `<div class="ft"></div><div class="plw"><div class="pl">Sáng nay thành phố Hồ Chí Minh đón cơn mưa đầu mùa</div></div>`, run: `MW.textPhraseLineBreak(q(".plw"), tl, 0, {});`, duration: 4.6 },
  }),

  T("line/stroke-draw", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var paths = el.tagName.toLowerCase() === "path" ? [el] : Array.prototype.slice.call(el.querySelectorAll("path")), ease = gsap.parseEase(o.ease), io = gsap.parseEase("power2.inOut");
      paths.forEach(function (p) { p.setAttribute("pathLength", "1"); p.style.strokeDasharray = "1 1"; });
      return MW.drive(tl, at, o.eraseAt == null ? o.duration : o.eraseAt + 0.5, function (t) {
        var d = ease(Math.max(0, Math.min(1, t / o.duration))), e = o.eraseAt != null ? io(Math.max(0, Math.min(1, (t - o.eraseAt) / 0.5))) : 0;
        paths.forEach(function (p) { p.style.strokeDashoffset = String(e > 0 ? -e : 1 - d); });
      });
    },
    options: { duration: "s (1.1)", ease: "power2.out (the site's card: power2.inOut over 1.4 s)", eraseAt: "s after the start to erase forward in 0.5 s (null: stay drawn)" }, defaults: { duration: 1.1, ease: "power2.out", eraseAt: null },
    demo: { css: SV, html: `<div class="sv"><svg width="1400" height="700" viewBox="0 0 280 140"><path class="sd" d="M20 110 C60 20 100 20 140 70 S220 120 260 30" fill="none" stroke="#a99bff" stroke-width="5" stroke-linecap="round"/></svg></div>`,
      run: `MW.lineStrokeDraw(q(".sd"), tl, 0.2, { duration: 1.4, ease: "power2.inOut", eraseAt: 2.0 });`, duration: 2.8 },
  }),

  T("shape/path-morph", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), nums = function (d) { return d.match(/-?\d*\.?\d+/g).map(Number); }, tpl = o.shapes[0].replace(/-?\d*\.?\d+/g, "#"), S = o.shapes.map(nums);
      var fill = function (v) { var i = 0; return tpl.replace(/#/g, function () { return (Math.round(v[i++] * 100) / 100).toString(); }); };
      return MW.drive(tl, at, o.keys[o.keys.length - 1], function (t) {
        // keys: hold the first shape until keys[0], move to the next by keys[1], hold until keys[2], move by keys[3], hold
        var from = S[0], to = S[0], u = 0;
        for (var j = 0; j + 1 < S.length; j++) { var a = o.keys[2 * j], b = o.keys[2 * j + 1]; if (t >= a) { from = S[j]; to = S[j + 1]; u = io(Math.min(1, (t - a) / (b - a))); } }
        el.setAttribute("d", fill(from.map(function (v, q) { return v + (to[q] - v) * u; })));
      });
    },
    options: { shapes: "path d strings with the same commands (circle, diamond, organic)", keys: "s: [hold A until, B reached, hold B until, C reached, end]" },
    defaults: { shapes: ["M100 30 C138 30 170 62 170 100 C170 138 138 170 100 170 C62 170 30 138 30 100 C30 62 62 30 100 30 Z", "M100 20 C112 60 140 88 180 100 C140 112 112 140 100 180 C88 140 60 112 20 100 C60 88 88 60 100 20 Z", "M96 26 C150 18 184 70 160 110 C140 150 120 176 86 166 C44 156 26 120 40 88 C52 56 64 30 96 26 Z"], keys: [0.26, 0.84, 1.1, 1.45, 2.2] },
    demo: { css: SV, html: `<div class="sv"><svg width="800" height="800" viewBox="0 0 200 200"><path class="pm" fill="#8b7bff" d=""/></svg></div>`, run: `MW.shapePathMorph(q(".pm"), tl, 0, {});`, duration: 2.2 },
  }),

  T("line/trim-window", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), guide = el.cloneNode(true); guide.setAttribute("opacity", o.guide); el.parentNode.insertBefore(guide, el);
      el.setAttribute("pathLength", "1"); el.style.strokeDasharray = o.length + " 2";
      return MW.drive(tl, at, o.duration, function (t) { var p = io(Math.max(0, Math.min(1, t / o.duration))); el.style.strokeDashoffset = String(o.length - (1 + o.length) * p); });
    },
    options: { length: "share of the path lit (0.22)", duration: "s (0.9), in-out", guide: "opacity of the faint full path (0.18)" }, defaults: { length: 0.22, duration: 0.9, guide: 0.18 },
    demo: { css: SV, html: `<div class="sv"><svg width="1400" height="700" viewBox="0 0 280 140"><path class="tw" d="M20 100 C70 10 120 10 150 70 S230 130 260 40" fill="none" stroke="#a99bff" stroke-width="6" stroke-linecap="round"/></svg></div>`,
      run: `MW.lineTrimWindow(q(".tw"), tl, 0.22, { duration: 1.63 });`, duration: 2.2 },
  }),

  T("motion/path-follow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var path = MW.el(o.path), L = path.getTotalLength(), io = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var s = io(Math.max(0, Math.min(1, t / o.duration))) * L, p = path.getPointAtLength(s), q = path.getPointAtLength(Math.min(L, s + 0.5)), r = path.getPointAtLength(Math.max(0, s - 0.5)), a = Math.atan2(q.y - r.y, q.x - r.x) * 180 / Math.PI;
        el.setAttribute("transform", "translate(" + p.x + " " + p.y + ")" + (o.rotate ? " rotate(" + a + ")" : ""));
      });
    },
    options: { path: "the SVG path to follow (same SVG as the moving group)", duration: "s (1.2)", ease: "power2.inOut", rotate: "turn along the path (true)" }, defaults: { path: null, duration: 1.2, ease: "power2.inOut", rotate: true },
    demo: { css: SV, html: `<div class="sv"><svg width="1540" height="840" viewBox="0 0 220 120"><path class="pf-p" d="M18 84 C48 3 69 13 109 60 S176 107 202 24" fill="none" stroke="#4a5478" stroke-width="1.2" stroke-dasharray="3 3"/><circle cx="18" cy="84" r="2.5" fill="#4a5478"/><circle cx="202" cy="24" r="2.5" fill="#4a5478"/>
<g class="pf-a"><path d="M-8 -6 L10 0 L-8 6 L-4 0 Z" fill="#a99bff"/></g></svg></div>`, run: `MW.motionPathFollow(q(".pf-a"), tl, 0.31, { path: ".pf-p", duration: 1.87 });`, duration: 2.6 },
  }),

  T("effect/circle-mask-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ease = gsap.parseEase(o.ease), pin = gsap.parseEase("power2.in"), ring = document.createElement("div"), host = el.parentNode;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      ring.style.cssText = "position:absolute;border-radius:50%;border:3px dashed rgba(233,235,243,0.35);pointer-events:none;"; host.appendChild(ring);
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.35, function (t) {
        var r = o.radius * ease(Math.max(0, Math.min(1, t / o.duration))); if (o.exitAt != null && t > o.exitAt) r = o.radius * (1 - pin(Math.min(1, (t - o.exitAt) / 0.35)));
        var cx = o.x * el.offsetWidth, cy = o.y * el.offsetHeight; el.style.clipPath = "circle(" + r + "px at " + cx + "px " + cy + "px)";
        var R = o.radius; ring.style.left = (el.offsetLeft + cx - R) + "px"; ring.style.top = (el.offsetTop + cy - R) + "px"; ring.style.width = ring.style.height = 2 * R + "px"; ring.style.opacity = o.guide ? "1" : "0";
      });
    },
    options: { x: "centre, 0-1 of the width (0.16)", y: "(0.58)", radius: "px, enough to clear the far corner (950)", duration: "s (0.98)", ease: "power2.out (the site's demo: 1.6 s in-out)", guide: "show the dashed guide ring", exitAt: "s after the start to close in 0.35 s (null)" },
    defaults: { x: 0.16, y: 0.58, radius: 950, duration: 0.98, ease: "power2.out", guide: true, exitAt: null },
    assets: SHOT,
    demo: { css: `${SV}\n.cm { position: relative; width: 1000px; height: 620px; border-radius: 40px; overflow: hidden; background: url(assets/shot.svg) center / cover; display: grid; place-items: end start; } .cm b { margin: 0 0 60px 70px; font-size: 120px; font-weight: 900; color: #fff; text-shadow: 0 6px 30px rgba(0,0,0,0.5); }`,
      html: `<div class="sv"><div class="cm"><b>Hoàng hôn</b></div></div>`, run: `MW.effectCircleMaskReveal(q(".cm"), tl, 0.4, { duration: 1.6, ease: "power2.inOut", exitAt: 2.4 });`, duration: 3.4 },
  }),

  T("line/light-flow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var segs = [], mix = gsap.utils.interpolate(o.tail, o.head); el.setAttribute("pathLength", "1"); el.setAttribute("opacity", "0.25");
      for (var k = 0; k < o.segments; k++) { var p = el.cloneNode(true); p.setAttribute("opacity", "1"); p.setAttribute("stroke", mix(k / (o.segments - 1))); p.setAttribute("stroke-width", o.width); p.style.strokeDasharray = o.length + " 3"; p.setAttribute("stroke-linecap", k === o.segments - 1 ? "round" : "butt"); el.parentNode.appendChild(p); segs.push({ p: p, k: k }); }
      return MW.drive(tl, at, o.duration * o.passes, function (t) {
        var head = ((t / o.duration) % 1) * 1.24;
        segs.forEach(function (s) { var end = head - 0.025 * (o.segments - 1 - s.k); s.p.style.strokeDashoffset = String(o.length - end); });
      });
    },
    options: { segments: "(8)", length: "of the path each (0.045)", duration: "s per pass, linear (2.2)", passes: "(1)", width: "stroke width (6)", tail: "colour at the tail", head: "at the head" },
    defaults: { segments: 8, length: 0.045, duration: 2.2, passes: 1, width: 6, tail: "#172541", head: "#ffffff" },
    demo: { css: SV, html: `<div class="sv"><svg width="1400" height="700" viewBox="0 0 280 140"><path class="lf" d="M20 110 C80 110 80 30 140 30 S200 110 260 110" fill="none" stroke="#3a4466" stroke-width="4"/></svg></div>`, run: `MW.lineLightFlow(q(".lf"), tl, 0, {});`, duration: 2.2 },
  }),

  T("shape/gooey-merge", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cs = el.querySelectorAll("circle"), io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, 0.3 + 1 + 0.9 + 0.9, function (t) {
        var p = io(Math.max(0, Math.min(1, (t - 0.3) / 1))) * (1 - io(Math.max(0, Math.min(1, (t - 2.2) / 0.9)))), d = o.from + (o.to - o.from) * p;
        cs[0].setAttribute("cx", String(o.cx - d)); cs[1].setAttribute("cx", String(o.cx + d));
      });
    },
    options: { from: "half distance at rest (64)", to: "half distance merged (22)", cx: "centre x in the SVG's units (160)" }, defaults: { from: 64, to: 22, cx: 160 },
    notes: "The two circles sit in a group with a goo filter: Gaussian blur 7, then alpha × 22 − 9 (feColorMatrix).",
    demo: { css: SV, html: `<div class="sv"><svg width="1600" height="1000" viewBox="0 0 320 200"><defs><filter id="mwgoo"><feGaussianBlur stdDeviation="7"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs>
<g class="gm-g" filter="url(#mwgoo)" fill="#8b7bff"><circle cx="96" cy="100" r="26"/><circle cx="224" cy="100" r="26"/></g></svg></div>`, run: `MW.shapeGooeyMerge(q(".gm-g"), tl, 0, {});`, duration: 3.1 },
  }),

  T("line/signature-write", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var paths = Array.prototype.slice.call(el.querySelectorAll("path")), pen = el.querySelector(o.pen), io = gsap.parseEase("power2.inOut");
      paths.forEach(function (p) { p.setAttribute("pathLength", "1"); p.style.strokeDasharray = "1 1"; });
      return MW.drive(tl, at, o.fadeAt + 0.35, function (t) {
        var tip = null;
        paths.forEach(function (p, i) { var w = o.windows[i], u = io(Math.max(0, Math.min(1, (t - w[0]) / (w[1] - w[0])))); p.style.strokeDashoffset = String(1 - u); if (u > 0 && u < 1) { var L = p.getTotalLength(), q = p.getPointAtLength(L * u); tip = q; } });
        if (pen) { pen.setAttribute("opacity", tip ? "1" : "0"); if (tip) { pen.setAttribute("cx", tip.x); pen.setAttribute("cy", tip.y); } }
        el.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.35)));
      });
    },
    options: { windows: "[from, to] s per stroke, in writing order", pen: "the pen dot", fadeAt: "s (2.9)" },
    defaults: { windows: [[0.25, 0.9], [0.85, 1.6], [1.55, 2.05]], pen: ".sg-pen", fadeAt: 2.9 },
    demo: { css: `${SV}\n.sgc { width: 1100px; height: 560px; border-radius: 40px; background: #f4f1ea; display: grid; place-items: center; }`,
      html: `<div class="sv"><div class="sgc"><svg class="sgs" width="900" height="420" viewBox="0 0 300 140"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M30 100 C34 70 40 40 46 30 C50 50 54 70 58 84 C64 64 70 44 78 30 C80 56 80 80 82 102" stroke="#2a2a55" stroke-width="4.5"/>
<path d="M82 102 C90 90 96 80 100 76 C100 86 100 94 104 98 C110 86 116 74 120 70 C122 84 124 96 130 96 C136 84 140 76 146 70 C146 84 148 94 156 94 C164 86 170 70 172 50 C172 66 172 82 176 96 C182 86 188 78 196 80 C202 84 202 92 208 96" stroke="#2a2a55" stroke-width="4.5"/>
<path d="M40 118 C100 112 170 112 250 116" stroke="#8b7bff" stroke-width="3"/></g><circle class="sg-pen" r="4" fill="#8b7bff" opacity="0"/></svg></div></div>`,
      run: `MW.lineSignatureWrite(q(".sgs"), tl, 0, {});`, duration: 3.4 },
  }),

  T("shape/radial-repeater", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var pills = Array.prototype.slice.call(el.children), si = gsap.parseEase("sine.inOut");
      return MW.drive(tl, at, o.duration, function (t) {
        var W = el.offsetWidth, Hh = el.offsetHeight, spin = o.spin * t;
        pills.forEach(function (p, i) { var a = i * 360 / pills.length + spin, u = ((t - i * o.offset) / o.period) % 1, k = u < 0 ? 0 : si(u < 0.5 ? u * 2 : 2 - u * 2), r = o.inner + (o.outer - o.inner) * k;
          gsap.set(p, { x: W / 2 + r * Math.cos(a * Math.PI / 180) - p.offsetWidth / 2, y: Hh / 2 + r * Math.sin(a * Math.PI / 180) - p.offsetHeight / 2, rotation: a }); });
      });
    },
    options: { inner: "px (90)", outer: "px (190)", period: "s out and back (1.5)", offset: "s per copy (0.08)", spin: "degrees per second (23)", duration: "s (4)" },
    defaults: { inner: 90, outer: 190, period: 1.5, offset: 0.08, spin: 23, duration: 4 },
    demo: { css: `${SV}\n.rr { position: relative; width: 800px; height: 800px; } .rr i { position: absolute; left: 0; top: 0; width: 170px; height: 50px; border-radius: 25px; background: #4a5478; } .rr i:nth-child(3n+1) { background: #8b7bff; }`,
      html: `<div class="sv"><div class="rr">${"<i></i>".repeat(12)}</div></div>`, run: `MW.shapeRadialRepeater(q(".rr"), tl, 0, {});`, duration: 4 },
  }),

  T("shape/noise-blob", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var r = MW.rand(o.seed), H = [], N = 80; for (var k = 2; k <= 5; k++) H.push({ k: k, a: (0.5 + r()) / k, ph: r() * 6.28, m: 1 + Math.floor(r() * 2) });
      var norm = H.reduce(function (s, h) { return s + h.a; }, 0);
      return MW.drive(tl, at, o.loop * o.loops, function (t) {
        var w = 2 * Math.PI * t / o.loop, pts = [];
        // smooth noise around the circle whose time axis is periodic: every harmonic turns a whole number of times per loop
        for (var i = 0; i < N; i++) { var th = i / N * 2 * Math.PI, n = 0; H.forEach(function (h) { n += h.a * Math.sin(h.k * th + h.ph + h.m * w); }); var R = o.radius + o.amp * n / norm; pts.push([o.cx + R * Math.cos(th), o.cy + R * Math.sin(th)]); }
        var d = "M" + pts.map(function (p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }).join(" L") + " Z"; el.setAttribute("d", d);
      });
    },
    options: { radius: "(52) in the SVG's units", amp: "(20)", loop: "s (4), seamless", loops: "(1)", cx: "(160)", cy: "(100)", seed: "shape" }, defaults: { radius: 52, amp: 20, loop: 4, loops: 1, cx: 160, cy: 100, seed: 5 },
    demo: { css: `${SV}\n.nb { position: relative; } .nb b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 120px; font-weight: 900; color: #fff; }`,
      html: `<div class="sv"><div class="nb"><svg width="1600" height="1000" viewBox="0 0 320 200"><path class="nb-p" fill="#7357f5"/></svg><b>MỀM MẠI</b></div></div>`, run: `MW.shapeNoiseBlob(q(".nb-p"), tl, 0, {});`, duration: 4 },
  }),

  T("shape/burst-lines", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var lines = el.querySelectorAll("line"), out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in");
      return MW.drive(tl, at, (lines.length - 1) * o.stagger + 0.6, function (t) {
        Array.prototype.forEach.call(lines, function (l, i) { var a = i / lines.length * 2 * Math.PI, d = t - i * o.stagger, h = o.r0 + (o.r1 - o.r0) * out(Math.max(0, Math.min(1, d / 0.3))), tt = o.r0 + (o.r1 - o.r0) * inn(Math.max(0, Math.min(1, (d - 0.3) / 0.3)));
          l.setAttribute("x1", o.cx + Math.cos(a) * tt); l.setAttribute("y1", o.cy + Math.sin(a) * tt); l.setAttribute("x2", o.cx + Math.cos(a) * h); l.setAttribute("y2", o.cy + Math.sin(a) * h); l.setAttribute("opacity", d > 0 && h - tt > 0.3 ? "1" : "0"); });
      });
    },
    options: { r0: "start radius (30)", r1: "end radius (80)", stagger: "s per line (0.02)", cx: "(160)", cy: "(100)" }, defaults: { r0: 30, r1: 80, stagger: 0.02, cx: 160, cy: 100 },
    notes: "Call it on the SVG holding the 12 lines (one per 30°), behind a word, a number or '!'.",
    demo: { css: `${SV}\n.bl { position: relative; } .bl b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 300px; font-weight: 900; color: #ffd23d; }`,
      html: `<div class="sv"><div class="bl"><svg class="bl-s" width="1600" height="1000" viewBox="0 0 320 200">${'<line stroke="#ffd23d" stroke-width="4" opacity="0"/>'.repeat(12)}</svg><b>!</b></div></div>`,
      run: `MW.shapeBurstLines(q(".bl-s"), tl, 0.4, {}); MW.shapeBurstLines(q(".bl-s"), tl, 1.6, {});`, duration: 2.6 },
  }),

  T("line/marching-dashes", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var shapes = el.tagName.toLowerCase() === "svg" ? Array.prototype.slice.call(el.querySelectorAll("rect, path, line")) : [el];
      shapes.forEach(function (s) { s.setAttribute("stroke-dasharray", o.dash + " " + o.gap); });
      return MW.drive(tl, at, o.duration, function (t) { shapes.forEach(function (s) { s.setAttribute("stroke-dashoffset", String(-(o.dash + o.gap) * t / o.period)); }); });
    },
    options: { dash: "(10)", gap: "(8)", period: "s per dash period, linear (1)", duration: "s (3)" }, defaults: { dash: 10, gap: 8, period: 1, duration: 3 },
    demo: { css: SV, html: `<div class="sv"><svg class="md" width="1200" height="800" viewBox="0 0 240 160"><rect x="30" y="20" width="180" height="100" rx="12" fill="rgba(139,123,255,0.08)" stroke="#a99bff" stroke-width="3"/><line x1="30" y1="140" x2="210" y2="140" stroke="#6c778b" stroke-width="3"/></svg></div>`,
      run: `MW.lineMarchingDashes(q(".md"), tl, 0, {});`, duration: 3 },
  }),
];
