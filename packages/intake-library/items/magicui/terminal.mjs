// Magic UI terminal (apps/www/registry/magicui/terminal.tsx at efe76fc): a window (rounded-xl, 1 px border, max 32rem wide) with three dots
// (red / yellow / green, 8 px) over a <pre> of lines played in sequence: a TypingAnimation types its line at 60 ms a character, an
// AnimatedSpan appears (opacity 0 -> 1, y -5 -> 0, 0.3 s, motion's default ease); each item starts when the one before it has finished.
// Port: the same sequence computed once and played from the film's time; graphemes (NFC) so Vietnamese letters type in one step.
export default {
  id: "terminal",
  kind: "block",
  title: "Terminal",
  sub: "Cửa sổ terminal gõ lệnh từng dòng",
  desc: "A terminal window whose lines play one after another: commands type out at 60 ms a letter, output lines fade in, like a CLI install running.",
  category: "Code",
  tags: ["terminal", "cli", "code", "typing", "install", "developer", "magicui"],
  source: { path: "apps/www/registry/magicui/terminal.tsx" },
  notes: "el is the terminal; its children are the lines in order: class mw-type types, anything else fades in (upstream's AnimatedSpan).",
  options: { duration: "s a character (0.06)", delay: "s before the first line (0)" },
  defaults: { duration: 0.06, delay: 0 },
  uses: ["bezier"],
  css: `.mw-terminal { position: relative; z-index: 0; width: 100%; max-width: 32rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); background: #09090b; overflow: hidden; }
.mw-terminal > .mw-tm-bar { display: flex; gap: 8px; padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.12); }
.mw-terminal > .mw-tm-bar i { width: 8px; height: 8px; border-radius: 9999px; display: block; }
.mw-terminal > pre { margin: 0; padding: 16px; } .mw-terminal > pre > code { display: grid; row-gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 14px; letter-spacing: -0.025em; white-space: pre-wrap; }`,
  markup: `<div class="mw-terminal"><span class="mw-type">&gt; npx moworks init</span><span style="color:#22c55e">✔ Done.</span></div>`,
  fn: function (el, tl, at, o) {
    var lines = Array.prototype.slice.call(el.children);
    var bar = document.createElement("div"); bar.className = "mw-tm-bar"; bar.innerHTML = '<i style="background:#ef4444"></i><i style="background:#eab308"></i><i style="background:#22c55e"></i>';
    var pre = document.createElement("pre"), code = document.createElement("code"); pre.appendChild(code);
    lines.forEach(function (l) { code.appendChild(l); });
    el.appendChild(bar); el.appendChild(pre);
    var seg = new Intl.Segmenter("vi", { granularity: "grapheme" }), e = MW.bezier(0.25, 0.1, 0.35, 1), t = at + o.delay;
    lines.forEach(function (l) {
      if (l.classList.contains("mw-type")) {
        var full = l.textContent.normalize("NFC"), g = [], it = seg.segment(full)[Symbol.iterator](), r;
        while (!(r = it.next()).done) g.push(r.value.segment);
        l.textContent = "";
        var s = { n: 0 }, t0 = t;
        tl.fromTo(s, { n: 0 }, { n: g.length, duration: g.length * o.duration, ease: "none", immediateRender: false, onUpdate: function () { l.textContent = g.slice(0, Math.floor(s.n + 1e-6)).join(""); } }, t0);
        t += g.length * o.duration;
      } else {
        tl.fromTo(l, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.3, ease: e, immediateRender: true }, t);
        t += 0.3;
      }
    });
    return t;
  },
  demo: {
    duration: 8,
    css: `.mw-terminal { max-width: none; width: 1200px; border-radius: 26px; } .mw-tm-bar { padding: 28px !important; gap: 14px !important; } .mw-tm-bar i { width: 18px !important; height: 18px !important; }
.mw-terminal > pre { padding: 34px; } .mw-terminal > pre > code { font-size: 32px; row-gap: 10px; } .g { color: #22c55e; } .b { color: #3b82f6; } .m { color: #a1a1aa; }`,
    html: `<div class="center"><div class="mw-terminal">
<span class="mw-type">&gt; npx moworks-studio init</span>
<span class="g">✔ Kiểm tra môi trường.</span><span class="g">✔ Tìm thấy HyperFrames 0.8.214.</span><span class="g">✔ Tải font tiếng Việt.</span>
<span class="g">✔ Tạo dự án mẫu.</span><span class="b">ℹ Đã tạo 3 tệp: index.html, storyboard.md, film.json</span>
<span class="mw-type m">Xong! Dự án đã sẵn sàng.</span></div></div>`,
    run: `MW.terminal(q(".mw-terminal"), tl, 0.3, {});`,
  },
};
