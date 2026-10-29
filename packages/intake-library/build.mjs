// Turns one intake item (an object in items/<author>/*.mjs) into a HyperFrames component the way the registry ships its own
// (registry/components/<name>/: registry-item.json, the snippet <name>.html, demo.html), so Claude reads and uses it like HF's components
// and its preview is made like theirs. The motion itself is one function MW.<name>(el, tl, at, options) that adds tweens to the film's
// paused GSAP timeline at time `at`; nothing runs on its own clock. GSAP comes from the film (assets/vendor/gsap.min.js): no CDN, no
// remote URL anywhere in the snippet or the demo (the film's CSP blocks the network and the export check G-REMOTE refuses one).
import { createHash } from "node:crypto";
import { helperSource } from "./helpers.mjs";

export const camel = (id) => id.replace(/[^a-z0-9]+([a-z0-9])/gi, (_, c) => c.toUpperCase()).replace(/^[^a-z]+/i, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const REMOTE = /(?:https?:)?\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}/i;

/** Base styles of every demo: a 1920 x 1080 stage and a few neutral pieces (cards, a headline) demos share. Not part of a motion. */
export const DEMO_BASE = `* { box-sizing: border-box; }
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); }
#demo { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--bg); color: var(--fg); font-family: Inter, sans-serif; }
.center { position: absolute; inset: 0; display: grid; place-items: center; }
.row { display: flex; align-items: center; justify-content: center; gap: 48px; }
.col { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px; }
.h1 { font-size: 132px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.1; text-align: center; }
.h2 { font-size: 84px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.15; text-align: center; }
.p { font-size: 40px; line-height: 1.4; opacity: 0.72; text-align: center; }
.card { position: relative; border-radius: 28px; background: var(--card); border: 2px solid var(--line); overflow: hidden; }
.muted { opacity: 0.6; }`;

const THEMES = { dark: { bg: "#09090b", fg: "#fafafa", card: "#111114", line: "#27272a" }, light: { bg: "#ffffff", fg: "#0a0a0a", card: "#ffffff", line: "#e4e4e7" } };

function fnSource(item) {
  // a function expression, or one made with new Function("el", "tl", "at", "o", body) by an item file that shares code between items
  const src = item.fn.toString().replace(/^function anonymous\(/, "function (");
  if (!/^function\s*\(/.test(src)) throw new Error(`${item.uid}: fn must be written as function (el, tl, at, o) { ... }`);
  return src;
}

/** The script both files share: helpers, then MW.<name> with the item's defaults merged into the options. */
export function motionScript(item) {
  const name = camel(item.id);
  return `(function () {
  "use strict";
  var MW = (window.MW = window.MW || {});
${helperSource(item.uses ?? [])}
  var defaults = ${JSON.stringify(item.defaults ?? {})};
  var run = ${fnSource(item).replace(/\n/g, "\n  ")};
  MW.${name} = function (el, tl, at, options) {
    var o = {}, k;
    for (k in defaults) o[k] = defaults[k];
    for (k in options || {}) o[k] = options[k];
    return run(MW.el(el), tl, at || 0, o);
  };
})();`;
}

/** The call line shown in the snippet: the item's own, else the first MW.<name>(...) of its demo. */
export function useLine(item) {
  if (item.use) return item.use;
  const name = camel(item.id);
  const m = new RegExp(`MW\\.${name}\\([^;]*\\);`).exec(item.demo?.run ?? "");
  return m ? m[0] : `MW.${name}(document.querySelector(".mw-${item.id}"), tl, 0.5, {});`;
}

/** The snippet a composition pastes (HF's hyperframes:snippet): an example element, the CSS, the script, how to call it. */
export function snippetHtml(item, credit) {
  const opts = Object.entries(item.options ?? {}).map(([k, v]) => `      - ${k}: ${v}`).join("\n");
  return `<!--
  ${item.title} (${credit.author}, ${credit.licence}, ${credit.made}).
  Source: ${credit.sourceText}.
  ${item.desc}

  Paste the markup, CSS and script into a composition. The motion adds its tweens to the composition's paused GSAP timeline
  (window.__timelines[...]), so seeking, rendering and HyperFrames Studio stay exact. GSAP is the film's own (assets/vendor).${(item.scripts ?? []).length ? `
  Copy this item's ${item.scripts.map((f) => `assets/${f}`).join(", ")} into the film's assets folder (same path); it ships with the item.` : ""}

    ${useLine(item)}
${item.async ? `\n  Asynchronous: the motion puts a promise in MW.pending (${item.async}). Register the composition's timeline only after\n  Promise.all(MW.pending) settles, as HyperFrames asks of builds that finish later.\n` : ""}${opts ? `\n  Options (defaults in brackets):\n${opts}\n` : ""}${item.notes ? `\n  Notes: ${item.notes}\n` : ""}-->

${(item.markup ?? item.demo?.html ?? "").trim()}

<style>
${(item.css ?? "").trim()}
</style>

${(item.scripts ?? []).map((f) => `<script src="assets/${f}"></script>
`).join("")}<script>
${motionScript(item)}
</script>
`;
}

/** Text a demo writes from its script (string literals with letters beyond ASCII, e.g. Vietnamese words typed or swapped in): kept in a
 *  hidden block so the export check G-GLYPH, which reads the page's text, checks the fonts against those letters too. */
export function scriptText(run = "") {
  const out = [];
  for (const m of run.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    const s = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\\n/g, " ").replace(/\\(.)/g, "$1");
    if (/[^\x00-\x7f]/.test(s) && /\p{L}/u.test(s)) out.push(s);
  }
  return [...new Set(out)];
}

/** A standalone composition that shows the motion (HF's demo.html): what the preview renders. */
export function demoHtml(item) {
  const d = item.demo ?? {};
  const extra = scriptText(d.run);
  const theme = { ...THEMES[d.theme ?? "dark"], ...(d.colors ?? {}) };
  const duration = d.duration ?? item.duration ?? 5;
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${esc(item.title)} - Demo</title>
    <script src="assets/vendor/gsap.min.js"></script>${(item.scripts ?? []).map((f) => `
    <script src="assets/${f}"></script>`).join("")}
    <style>
:root { --bg: ${theme.bg}; --fg: ${theme.fg}; --card: ${theme.card}; --line: ${theme.line}; }
${DEMO_BASE}
${(item.css ?? "").trim()}
${(d.css ?? "").trim()}
    </style>
  </head>
  <body>
    <div id="demo" data-composition-id="mw-demo" data-start="0" data-width="1920" data-height="1080" data-duration="${duration}">
${(d.html ?? item.markup ?? "").trim()}${extra.length ? `\n<div hidden aria-hidden="true" data-mw-script-text>${esc(extra.join(" · "))}</div>` : ""}
      <script>
${motionScript(item)}
      </script>
      <script>
        (function () {
          var tl = gsap.timeline({ paused: true });
          var q = function (s) { return document.querySelector(s); }, qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
          ${(d.run ?? "").trim().replace(/\n/g, "\n          ")}
          tl.set({}, {}, ${duration});
          // register only when every motion is ready (MW.pending: e.g. a WebGL texture still decoding), as HyperFrames asks of async builds
          var go = function () { window.__timelines = window.__timelines || {}; window.__timelines["mw-demo"] = tl; };
          if (window.MW && MW.pending && MW.pending.length) Promise.all(MW.pending).then(go, go); else go();
        })();
      </script>
    </div>
  </body>
</html>
`;
}

/** registry-item.json in HF's schema, with the Moworks credit block (author, permalink, commit or date read, licence, how it was made). */
export function registryItem(item, credit) {
  return {
    $schema: "https://hyperframes.heygen.com/schema/registry-item.json",
    name: item.id,
    type: item.kind === "block" ? "hyperframes:block" : "hyperframes:component",
    title: item.title,
    description: item.desc,
    tags: item.tags ?? [],
    files: [{ path: `${item.id}.html`, target: `compositions/components/${item.id}.html`, type: "hyperframes:snippet" }],
    variables: item.vars ?? [],
    duration: item.demo?.duration ?? item.duration ?? 5,
    dimensions: { width: 1920, height: 1080 },
    moworks: { uid: item.uid, author: item.author, call: useLine(item), function: `MW.${camel(item.id)}`, options: item.options ?? {}, credit,
      thirdParty: item.thirdParty ?? [], notes: item.notes ?? "", titleVi: item.sub ?? "" },
  };
}

/** Every file of the built component, with a short hash of all of them (a rendered preview stays valid while it is unchanged). */
export function buildItem(item, credit) {
  const files = {
    "registry-item.json": JSON.stringify(registryItem(item, credit), null, 2) + "\n",
    [`${item.id}.html`]: snippetHtml(item, credit),
    "demo.html": demoHtml(item),
  };
  for (const [n, text] of Object.entries(files)) if (n.endsWith(".html") && REMOTE.test(text.replace(/http:\/\/www\.w3\.org\/[\w/.]+/g, ""))) throw new Error(`${item.uid}: ${n} names a remote URL`);
  // the hash says whether the film changed; the kind (the registry type) is how the user files the item, so it stays out of it and a
  // reclassification keeps the rendered previews
  const h = createHash("sha256");
  for (const n of Object.keys(files).sort()) { h.update(n + "\0"); h.update(n === "registry-item.json" ? files[n].replace(/^ {2}"type": .*\n/m, "") : files[n]); }
  for (const a of item.assets ?? []) { h.update(a.path + "\0"); h.update(a.data ?? JSON.stringify(a.ffmpeg)); }
  return { files, hash: h.digest("hex").slice(0, 16) };
}
