// Magic UI typing-animation (apps/www/registry/magicui/typing-animation.tsx at efe76fc): types a string or a list of words with a cursor;
// with several words it types (typeSpeed = duration, 100 ms a character), waits one more typeSpeed, pauses pauseDelay (1000 ms), deletes
// (deleteSpeed = typeSpeed / 2) one character at a time, waits one more deleteSpeed, then types the next; loop optional. Cursor "|" line,
// "▌" block or "_" underscore, blinking 1.2 s step-end (visible the first half); hidden once the last word is done without loop. Port: the
// same schedule computed from the film's time.
export default {
  id: "typing-animation",
  kind: "motion",
  title: "Typing Animation",
  sub: "Gõ, xoá rồi gõ từ tiếp theo",
  desc: "Types text with a blinking cursor; with several words it types, pauses, deletes and types the next one (100 ms a letter, 50 ms to delete, 1 s pause).",
  category: "Text & titles",
  tags: ["typewriter", "typing", "cursor", "words", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/typing-animation.tsx" },
  notes: "Letters are graphemes (NFC), so a Vietnamese letter with its marks is typed in one step.",
  options: { words: "list (or the element's own text)", typeSpeed: "s a letter (0.1)", deleteSpeed: "s a letter (typeSpeed / 2)", pauseDelay: "s (1)", delay: "s (0)", loop: "false",
    cycles: "words typed when looping (two passes)", showCursor: "true", blinkCursor: "true", cursorStyle: "line | block | underscore (line)" },
  defaults: { words: null, typeSpeed: 0.1, deleteSpeed: null, pauseDelay: 1, delay: 0, loop: false, cycles: 0, showCursor: true, blinkCursor: true, cursorStyle: "line" },
  css: `.mw-typing-animation { letter-spacing: -0.02em; white-space: pre; }
.mw-typing-animation .mw-cursor { display: inline-block; }`,
  markup: `<span class="mw-typing-animation">Xin chào</span>`,
  fn: function (el, tl, at, o) {
    var words = o.words || [el.textContent];
    var seg = new Intl.Segmenter("vi", { granularity: "grapheme" });
    var G = words.map(function (w) { var out = [], it = seg.segment(w.normalize("NFC"))[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; });
    var ts = o.typeSpeed, ds = o.deleteSpeed == null ? ts / 2 : o.deleteSpeed, multi = words.length > 1;
    var count = multi ? (o.loop ? (o.cycles || words.length * 2) : words.length) : 1;
    // the schedule: [start, word, phase] with phase type / pause / delete, as upstream's state machine steps it
    var plan = [], t = o.delay;
    for (var k = 0; k < count; k++) {
      var g = G[k % G.length], last = k === count - 1;
      plan.push({ t: t, k: k, type: true }); t += g.length * ts + ts;
      if (last && !(o.loop && multi)) { plan.push({ t: t, k: k, done: true }); break; }
      if (!multi) break;
      plan.push({ t: t, k: k, pause: true }); t += o.pauseDelay;
      plan.push({ t: t, k: k, del: true }); t += g.length * ds + ds;
      if (o.delay) t += o.delay;
    }
    var end = t;
    var textEl = document.createElement("span"), cur = document.createElement("span");
    cur.className = "mw-cursor"; cur.textContent = o.cursorStyle === "block" ? "▌" : o.cursorStyle === "underscore" ? "_" : "|";
    el.textContent = ""; el.appendChild(textEl); if (o.showCursor) el.appendChild(cur);
    var s = { t: 0 };
    var draw = function () {
      var p = plan[0];
      for (var i = 0; i < plan.length; i++) if (plan[i].t <= s.t) p = plan[i];
      var g = G[p.k % G.length], n = 0, local = s.t - p.t;
      if (s.t < plan[0].t) n = 0;
      else if (p.type) n = Math.min(g.length, Math.floor(local / ts) + 1);
      else if (p.pause || p.done) n = g.length;
      else if (p.del) n = Math.max(0, g.length - Math.floor(local / ds) - 1);
      textEl.textContent = g.slice(0, n).join("");
      var hide = p.done && !o.loop;
      cur.style.opacity = hide ? 0 : !o.blinkCursor ? 1 : ((s.t % 1.2) < 0.6 ? 1 : 0);
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 9,
    html: `<div class="center"><div class="col"><div class="h1"><span class="mw-typing-animation t1">Thiết kế</span></div>
<div class="h2" style="font-family:'JetBrains Mono',monospace;opacity:.7"><span class="mw-typing-animation t2">npx moworks studio</span></div></div></div>`,
    run: `MW.typingAnimation(q(".t1"), tl, 0.3, { words: ["Thiết kế", "Xây dựng", "Ra mắt"], loop: true, cycles: 3, typeSpeed: 0.08, deleteSpeed: 0.05, pauseDelay: 1 });
MW.typingAnimation(q(".t2"), tl, 0.6, { cursorStyle: "block", typeSpeed: 0.06 });`,
  },
};
