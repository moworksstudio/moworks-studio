// Magic UI code-comparison (apps/www/registry/magicui/code-comparison.tsx at efe76fc): two code panes side by side ("before" / "after"),
// each with a file name header (lucide File icon), Shiki-highlighted code (text-xs mono) with notation transformers: highlighted lines
// (background highlightColor #ff3333), diff lines (+ rgba(16,185,129,.16), - rgba(244,63,94,.16)) and focus (other lines dimmed and
// blurred until hover, 300 ms); a round VS badge between them. Port: Shiki is not used; a small built-in colouring (keywords, strings,
// numbers, comments) in GitHub-dark colours; the notations as line marks; the hover (focus reveal) is a time on the film.
export default {
  id: "code-comparison",
  kind: "block",
  title: "Code Comparison",
  sub: "Hai khung code trước / sau",
  desc: "Two code panes side by side, before and after, with a VS badge, highlighted and diff lines, and focus lines that stand out until revealed.",
  category: "Code",
  tags: ["code", "diff", "before after", "compare", "developer", "magicui"],
  source: { path: "apps/www/registry/magicui/code-comparison.tsx" },
  notes: "Lines ending in a comment // [!code ++], [!code --], [!code highlight] or [!code focus] get the mark (Shiki's notation, the comment removed). reveal: time the focus dimming lifts (upstream: on hover).",
  options: { beforeCode: "text", afterCode: "text", filename: "name", highlightColor: "#ff3333", reveal: "s (none)" },
  defaults: { beforeCode: "", afterCode: "", filename: "index.js", highlightColor: "#ff3333", reveal: null },
  uses: ["bezier"],
  css: `.mw-code-comparison { position: relative; display: grid; grid-template-columns: 1fr 1fr; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); overflow: hidden; }
.mw-code-comparison .mw-cc-pane { min-width: 0; } .mw-code-comparison .mw-cc-pane + .mw-cc-pane { border-left: 1px solid rgba(255,255,255,0.12); }
.mw-code-comparison .mw-cc-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.12); background: #0f0f12; }
.mw-code-comparison .mw-cc-head svg { width: 16px; height: 16px; }
.mw-code-comparison pre { margin: 0; padding: 16px 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; background: #0d1117; color: #e6edf3; }
.mw-code-comparison .mw-cc-line { display: block; padding: 0 16px; white-space: pre; }
.mw-code-comparison .mw-cc-vs { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 32px; height: 32px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.15);
  background: #09090b; display: grid; place-items: center; font-size: 12px; font-weight: 600; }`,
  markup: `<div class="mw-code-comparison"></div>`,
  fn: function (el, tl, at, o) {
    var esc = function (s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    var KW = /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|new|class|extends|true|false|null|undefined)\b/g;
    var color = function (line) {                       // order matters: comments and strings first, then the rest of the line
      var m = /(\/\/.*$)/.exec(line), code = m ? line.slice(0, m.index) : line, out = "";
      code.split(/("[^"]*"|'[^']*'|`[^`]*`)/).forEach(function (part, i) {
        if (i % 2) out += '<span style="color:#a5d6ff">' + esc(part) + "</span>";
        else out += esc(part).replace(KW, '<span style="color:#ff7b72">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#79c0ff">$1</span>').replace(/(\w+)(?=\()/g, '<span style="color:#d2a8ff">$1</span>');
      });
      return out + (m ? '<span style="color:#8b949e">' + esc(m[1]) + "</span>" : "");
    };
    var focused = [];
    var pane = function (code, label) {
      var lines = code.replace(/\n$/, "").split("\n").map(function (l) {
        var mark = /\s*\/\/\s*\[!code (\+\+|--|highlight|focus)\]\s*$/.exec(l), cls = "", bg = "";
        if (mark) { l = l.slice(0, mark.index); cls = mark[1]; }
        if (cls === "++") bg = "rgba(16,185,129,.16)"; if (cls === "--") bg = "rgba(244,63,94,.16)"; if (cls === "highlight") bg = o.highlightColor;
        return '<span class="mw-cc-line' + (cls === "focus" ? " focused" : "") + '" style="' + (bg ? "background:" + bg : "") + '">' + (color(l) || " ") + "</span>";
      }).join("");
      return '<div class="mw-cc-pane"><div class="mw-cc-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>' +
        esc(o.filename) + " <span style=\"opacity:.5\">" + label + "</span></div><pre><code>" + lines + "</code></pre></div>";
    };
    el.innerHTML = pane(o.beforeCode, "before") + pane(o.afterCode, "after") + '<div class="mw-cc-vs">VS</div>';
    Array.prototype.forEach.call(el.querySelectorAll("pre"), function (pre) {
      if (!pre.querySelector(".focused")) return;
      Array.prototype.forEach.call(pre.querySelectorAll(".mw-cc-line:not(.focused)"), function (l) { focused.push(l); l.style.opacity = 0.4; l.style.filter = "blur(1.5px)"; });
    });
    if (o.reveal == null || !focused.length) return at;
    var e = MW.bezier(0.4, 0, 0.2, 1);
    tl.fromTo(focused, { opacity: 0.4, filter: "blur(1.5px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.3, ease: e, immediateRender: false }, at + o.reveal);
    return at + o.reveal + 0.3;
  },
  demo: {
    duration: 5,
    css: `.mw-code-comparison { width: 1760px; border-radius: 24px; } .mw-code-comparison pre { font-size: 26px; padding: 30px 0; } .mw-code-comparison .mw-cc-line { padding: 0 30px; }
.mw-code-comparison .mw-cc-head { font-size: 26px; padding: 18px 26px; gap: 14px; } .mw-code-comparison .mw-cc-head svg { width: 28px; height: 28px; } .mw-code-comparison .mw-cc-vs { width: 72px; height: 72px; font-size: 24px; }`,
    html: `<div class="center"><div class="mw-code-comparison"></div></div>`,
    run: `MW.codeComparison(q(".mw-code-comparison"), tl, 0, { filename: "render.js", reveal: 2.6,
  beforeCode: "// Xuất video thủ công\\nconst frames = [];\\nfor (let i = 0; i < 300; i++) {\\n  frames.push(capture(i)); // [!code focus]\\n}\\nawait encode(frames);",
  afterCode: "// Xuất với Moworks Studio\\nimport { render } from \\"moworks\\";\\nawait render({ fps: 30 }); // [!code ++]\\nconsole.log(\\"Xong!\\");" });`,
  },
};
