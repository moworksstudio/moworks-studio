// The words of a film drawn by code, edited by hand (what can be edited directly on screen is edited there; the rest
// is left to a pinned note for Claude). A HyperFrames film's words are HTML, edited through HF's own mutation (handEdit.mjs); a code film's are
// literals in its source, read here with Babel's parser (HyperFrames' runtime has it), shot by shot, and written back one at a time:
//   What If    whatif/*.tsx: a text-like prop (text=, label=, live=, title=, caption=…), a title's lines={[…]}, the words between JSX tags,
//              each in its `export const S<N>` (whatif/timeline.json gives its place); words of the film's data outside a shot (a caption
//              list) by their frame. A title's line is the episode's title too (whatif/episode.json), changed with it; an accent word that
//              leaves its line is said.
//   anidoodle  the words its canvas draws (writeOn, caption, setType, letter, fillText, a sentence's words, a text-like key) in
//              anidoodle/**/*.ts, and the HTML layers typed one letter a span (Mira's title), edited as their whole line.
//   lemo, mg   the film's own scripts (compositions/<engine>/*.js): a text-like key, a textContent set to words, an UPPER_CASE line
//              constant, and words with Vietnamese letters; a key beside `a: <seconds>` is placed in the shot of that second.
// What is not found here (a picture, a colour, words the code builds from parts) is pinned as a note for Claude (the Editor's Pin a note).
// Saving replaces the literal in place (its quotes escaped, NFC) once the file still holds the words the user saw; the caller bundles the
// film again (codeFilm.mjs freshFilm: What If 0.6 s, anidoodle 0.1 s; lemo and mg load their scripts as they are).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";

const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
const walk = (d, ok) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? (n === "node_modules" || n.startsWith(".") ? [] : walk(f, ok)) : ok(n, f) ? [f] : []; }) : []);
const relOf = (dir, f) => relative(dir, f).split(sep).join("/");
const lineAt = (s, i) => s.slice(0, i).split("\n").length;
const LETTER = /\p{L}/u;
const VI = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu;
const TEXT_KEYS = new Set(["text", "label", "live", "title", "caption", "subtitle", "heading", "line", "lines", "name", "sub", "cap", "word", "words", "runs", "say", "says", "quote", "body", "cta", "button"]);
const NOT_TEXT = new Set(["id", "set", "size", "note", "look", "kind", "font", "fontFamily", "family", "color", "colour", "fill", "stroke", "bg", "ease", "type", "cls", "className", "class", "src", "href", "file", "url", "slug", "voice", "model", "role", "key", "style", "d", "transform", "textAnchor", "anchor", "align", "at", "shot", "rig", "hand", "engine", "import", "check", "accent", "topic", "beat", "science", "source", "sample", "samples"]);
const NOT_CALLS = new Set(["require", "import", "querySelector", "querySelectorAll", "getElementById", "$", "addEventListener", "removeEventListener", "setAttribute", "getAttribute", "add", "remove", "toggle", "contains", "createElement", "createElementNS", "matchMedia", "fetch", "log", "warn", "error", "Error", "loadFont", "normalize", "split", "join", "replace", "includes", "startsWith", "endsWith", "test", "match", "staticFile", "delayRender", "random", "rnd", "rng", "seed", "defineEpisode"]);
const DRAW_CALLS = new Set(["writeOn", "caption", "setType", "letter", "fillText", "strokeText", "sentence"]);
/** Words, not a name or a CSS value: Vietnamese letters, or two words of letters without CSS signs. */
const wordsLike = (t) => LETTER.test(t) && (VI.test(t) || (/\p{L}{2,}[^\S\n]+\p{L}/u.test(t) && !/\d(?:px|%|s|ms|deg|em|rem|vh|vw)\b|[;{}]|:\s|^[.#]|\(|=>/.test(t)));
const shown = (t) => LETTER.test(t) && !/^#[0-9a-f]{3,8}$/i.test(t) && !/\.(?:png|jpe?g|webp|gif|svg|mp3|mp4|wav|m4a|json|m?js|ts|tsx|css|html|woff2?|ttf|otf)$/i.test(t.trim())
  && !/^https?:/.test(t) && !/<\/?[a-z][\w-]*[\s>/]/i.test(t);          // a file, a link, a piece of markup (SVG paths, innerHTML) are not words
const unescape = (q, s) => (q === "jsx" || q === "attr" ? s : s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e) => (e[0] === "u" && e.length > 1 ? String.fromCodePoint(parseInt(e.replace(/[u{}]/g, ""), 16)) : e[0] === "x" && e.length > 1 ? String.fromCharCode(parseInt(e.slice(1), 16)) : { n: "\n", t: "\t" }[e] ?? e)));

let parser = null;
function parse(src, file) {
  parser ??= createRequire(join(resolveRuntime().dir, "node_modules", "@babel", "parser", "package.json"))("@babel/parser");
  return parser.parse(src, { sourceType: "module", errorRecovery: true, allowReturnOutsideFunction: true, plugins: /\.tsx?$/.test(file) ? ["jsx", "typescript"] : ["jsx"] });
}
const nameOf = (n) => (!n ? null : n.type === "Identifier" || n.type === "JSXIdentifier" ? n.name : n.type === "StringLiteral" ? n.value
  : ["MemberExpression", "OptionalMemberExpression", "JSXMemberExpression"].includes(n.type) ? nameOf(n.property) : null);
const numOf = (n) => (n?.type === "NumericLiteral" ? n.value : null);
const SKIP_KEYS = new Set(["loc", "start", "end", "extra", "leadingComments", "trailingComments", "innerComments", "range"]);
const SIZE_ATTRS = ["fontSize", "size"], FONT_ATTRS = ["fontFamily", "font"];
/** A JSX tag and its face and size attributes: { name, intrinsic, nameEnd, attrs: { [name]: { start, end, kind: "num"|"str"|"expr", value, raw } } }
 *  (start/end: the attribute's whole value, `{48}` or `"Roboto Mono"`). */
function tagOf(open, src) {
  const attrs = {};
  for (const a of open.attributes ?? []) {
    if (a.type !== "JSXAttribute" || !a.value) continue;
    const name = nameOf(a.name);
    if (![...SIZE_ATTRS, ...FONT_ATTRS].includes(name)) continue;
    const v = a.value.type === "JSXExpressionContainer" ? a.value.expression : a.value;
    const kind = v.type === "NumericLiteral" ? "num" : v.type === "StringLiteral" ? "str" : "expr";
    attrs[name] = { start: a.value.start, end: a.value.end, kind, value: kind === "num" ? v.value : kind === "str" ? v.value : src.slice(v.start, v.end), raw: src.slice(a.value.start, a.value.end) };
  }
  const name = nameOf(open.name);
  return { name, intrinsic: /^[a-z]/.test(name ?? ""), nameEnd: open.name.end, attrs };
}

/** Every literal of a source with what holds it: { start, end, quote, text, line, ctx } (start/end: the words, without the quotes). */
function literals(src, file) {
  let ast; try { ast = parse(src, file); } catch { return []; }
  const out = [];
  const visit = (node, up) => {
    if (!node || typeof node.type !== "string" || node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") return;
    let hit = null;
    if (node.type === "StringLiteral") hit = { start: node.start + 1, end: node.end - 1, quote: src[node.start] };
    else if (node.type === "TemplateLiteral" && node.expressions.length === 0) hit = { start: node.quasis[0].start, end: node.quasis[0].end, quote: "`" };
    else if (node.type === "JSXText" && /\S/.test(node.value)) hit = { start: node.start + node.value.search(/\S/), end: node.start + node.value.trimEnd().length, quote: "jsx" };
    if (hit) {
      if (node.type === "StringLiteral" && up.at(-1)?.type === "JSXAttribute") hit.quote = "attr";
      const ctx = {};
      for (let i = up.length - 1, child = node; i >= 0; child = up[i], i--) {
        const p = up[i];
        if (p.type === "JSXAttribute" && ctx.attr == null) ctx.attr = nameOf(p.name);
        if (p.type === "ObjectProperty" && p.value === child && ctx.key == null) ctx.key = nameOf(p.key);
        if ((p.type === "CallExpression" || p.type === "OptionalCallExpression") && ctx.call == null && p.callee !== child) { ctx.call = nameOf(p.callee); ctx.arg = p.arguments.indexOf(child); }
        if (p.type === "AssignmentExpression" && p.right === child && ctx.assign == null) ctx.assign = nameOf(p.left);
        if (p.type === "VariableDeclarator" && ctx.decl == null) ctx.decl = nameOf(p.id);
        if (p.type === "ObjectExpression" && ctx.time == null) { const a = p.properties.find((q) => q.type === "ObjectProperty" && nameOf(q.key) === "a"); if (a) ctx.time = numOf(a.value); }
        if (p.type === "ObjectExpression" && ctx.siblings == null) ctx.siblings = p.properties.map((q) => nameOf(q.key)).filter(Boolean);
        if (p.type === "ExportNamedDeclaration" && p.declaration?.type === "VariableDeclaration") ctx.export = nameOf(p.declaration.declarations[0]?.id);
        if (p.type === "JSXElement" && ctx.element == null) ctx.element = nameOf(p.openingElement.name);
        // the tag that draws these words (its own when they are a prop, its parent's when they sit between tags): its face and size
        if (p.type === "JSXOpeningElement" && ctx.open == null) ctx.open = tagOf(p, src);
        if (p.type === "JSXElement" && ctx.open == null) ctx.open = tagOf(p.openingElement, src);
      }
      out.push({ ...hit, text: unescape(hit.quote, src.slice(hit.start, hit.end)).normalize("NFC"), line: lineAt(src, hit.start), ctx });
    }
    up.push(node);
    for (const k of Object.keys(node)) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const c of v) visit(c, up); } else if (v && typeof v.type === "string") visit(v, up);
    }
    up.pop();
  };
  visit(ast.program, []);
  return out;
}

/** Is this literal words a viewer reads? */
function isWords(x, { drawCalls = false, fonts = new Set() } = {}) {
  const c = x.ctx, t = x.text;
  if (!shown(t) || fonts.has(t.trim().toLowerCase())) return false;          // a font's name is not words
  if ([c.decl, c.key, c.assign].some((n) => n && /font|face|family/i.test(n))) return false;
  if (c.siblings?.some((k) => /^(fps|durationFrames|duration|width|height)$/.test(k)) && !c.call) return false;          // a film's meta, never drawn
  // words of the code itself, never shown: all lower case with no Vietnamese letter, outside JSX (class names mk("div", "layer flash"), a
  // cue's note "the skid", a check's message "the film is not 720 frames")
  if (x.quote !== "jsx" && !c.attr && !VI.test(t) && !/\p{Lu}/u.test(t)) return false;
  if (c.call && NOT_CALLS.has(c.call)) return false;
  if (c.key && NOT_TEXT.has(c.key)) return false;
  if (x.quote === "jsx") return true;
  if (c.attr) return TEXT_KEYS.has(c.attr);
  if (c.key && TEXT_KEYS.has(c.key)) return true;
  if (c.assign === "textContent" || c.assign === "innerText") return true;
  if (c.decl && /^[A-Z][A-Z0-9_]*(?:LINE|TEXT|TITLE|CAP|LABEL|WORDS?)[A-Z0-9_]*$/.test(c.decl)) return true;
  if (drawCalls && c.call && DRAW_CALLS.has(c.call)) return true;
  return wordsLike(t);
}

// ---- What If ----
function whatIfItems(dir) {
  let tl = {}; try { tl = JSON.parse(read(join(dir, "whatif", "timeline.json"))); } catch { /* no timeline yet */ }
  const order = tl.shots ?? [], fps = tl.fps ?? 30, out = [];
  const files = walk(join(dir, "whatif"), (n) => /\.tsx?$/.test(n) && n !== "episode.tsx"), fonts = fontNames(dir, files);
  for (const f of files) {
    const src = read(f), rel = relOf(dir, f), lits = literals(src, f);
    for (const x of lits) {
      const shotId = /^(?:S|Sh|Shot)\d+\w*$/.test(x.ctx.export ?? "") ? x.ctx.export : null;
      if (x.ctx.attr === "accent" || !isWords(x, { fonts })) continue;
      // a shot's words; outside a shot, words of the film's data (a caption list), placed by their frame
      if (!shotId && (x.quote === "jsx" || !(x.ctx.time != null || wordsLike(x.text)))) continue;
      let shot = null, time = null;
      if (shotId) { const k = order.findIndex((o) => o.id === shotId); if (k >= 0) { shot = k + 1; time = Math.round(((order[k].first + Math.min(order[k].key ?? 0, Math.max(0, (order[k].len ?? 1) - 1))) / fps) * 1000) / 1000; } }
      else if (x.ctx.time != null) time = Math.round((x.ctx.time / fps) * 1000) / 1000;
      const item = { ...x, file: rel, prop: x.ctx.attr ?? x.ctx.key ?? (x.quote === "jsx" ? "words" : "data"), shotId, shot, time, at: shot ? null : time };
      if (x.ctx.attr === "lines") {          // a title's line: its place among the lines and the accent words beside it
        const near = (y, attr) => y.ctx.attr === attr && y.ctx.export === x.ctx.export && Math.abs(y.start - x.start) < 400;
        item.lineOf = lits.filter((y) => near(y, "lines")).findIndex((y) => y.start === x.start);
        item.accent = lits.filter((y) => near(y, "accent")).map((y) => y.text);
      }
      out.push(item);
    }
  }
  return out;
}

// ---- anidoodle: the words its canvas draws ----
function anidoodleItems(dir) {
  const out = [];
  // the film's own modules: not its characters, their gates or their model sheets (anidoodle/films/sheet-<id>.ts draws a sheet, not the film)
  const files = walk(join(dir, "anidoodle"), (n, p) => /\.ts$/.test(n) && !/\.d\.ts$/.test(n) && !/[\\/]characters[\\/]/.test(p) && !/^(check|sheet)/.test(n)), fonts = fontNames(dir, files);
  for (const f of files) {
    const src = read(f), rel = relOf(dir, f);
    for (const x of literals(src, f)) if (isWords(x, { drawCalls: true, fonts })) out.push({ ...x, file: rel, prop: x.ctx.call ?? x.ctx.key ?? "words", shot: null, time: null, at: null });
  }
  return out;
}
/** HTML layers typed one letter a span (<div …><span class="ch">M</span>…</div>): each line one item, its whole words. */
function letterLines(dir) {
  const out = [];
  for (const f of ["index.html", ...walk(join(dir, "compositions"), (n) => n.endsWith(".html")).map((x) => relOf(dir, x))]) {
    const html = read(join(dir, ...f.split("/")));
    for (const m of html.matchAll(/(<(div|p|h[1-6]|span)\b[^>]*>)((?:\s*<span\b[^>]*>(?:[^<]|&[#\w]+;)<\/span>){2,})\s*(<\/\2>)/g)) {
      const inner = m[3], start = m.index + m[1].length, end = start + inner.length;
      const chars = [...inner.matchAll(/<span\b[^>]*>([^<]|&[#\w]+;)<\/span>/g)].map((x) => (x[1] === "&nbsp;" || x[1] === "&#160;" ? " " : x[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")));
      const text = chars.join("").normalize("NFC");
      if (LETTER.test(text)) out.push({ start, end, quote: "letters", text, line: lineAt(html, start), file: f, prop: "letters", shot: null, time: null, at: null, spanTag: /<span\b[^>]*>/.exec(inner)[0] });
    }
  }
  return out;
}

// ---- lemo, mg-styles: the film's own scripts, loaded as they are ----
function scriptItems(dir) {
  const out = [];
  const files = walk(join(dir, "compositions"), (n, p) => /\.m?js$/.test(n) && !/\.min\.js$/.test(n) && !/[\\/]compositions[\\/](whatif|anidoodle)[\\/]film\.js$/.test(p)), fonts = fontNames(dir, files);
  for (const f of files) {
    const src = read(f), rel = relOf(dir, f);
    for (const x of literals(src, f)) if (isWords(x, { fonts })) out.push({ ...x, file: rel, prop: x.ctx.key ?? x.ctx.assign ?? x.ctx.decl ?? "words", shot: null, time: x.ctx.time ?? null, at: x.ctx.time ?? null });
  }
  return out;
}
/** The families a film names (its Google font imports, its pages' font stacks, the fontFamily values of its code): never its words. */
function fontNames(dir, files) {
  const out = new Set();
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(/@remotion\/google-fonts\/([A-Za-z0-9]+)/g)) out.add(m[1].replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase());
    for (const m of s.matchAll(/font-?family\s*[:=]\s*\{?\s*["'`]([^"'`,;]+)/gi)) out.add(m[1].trim().toLowerCase());
  }
  for (const m of read(join(dir, "index.html")).matchAll(/font-family\s*:\s*["']?([^;"',}]+)/gi)) out.add(m[1].trim().toLowerCase());
  return out;
}
const engineOf = (dir) => (existsSync(join(dir, "whatif", "episode.tsx")) ? "what-if" : existsSync(join(dir, "anidoodle")) ? "anidoodle"
  : existsSync(join(dir, "compositions", "lemo")) ? "lemo" : existsSync(join(dir, "compositions", "mg")) ? "mg" : null);
// an item's id: its file, its kind and its words, and which of the same words of that file it is (not its line: an edit elsewhere in the
// file, an import added, must not change it)
const rawItems = (dir) => {
  const e = engineOf(dir), list = e === "what-if" ? whatIfItems(dir) : e === "anidoodle" ? [...anidoodleItems(dir), ...letterLines(dir)] : e ? [...scriptItems(dir), ...letterLines(dir)] : [];
  const seen = new Map();
  for (const x of list) { const k = `${x.file}\0${x.prop}\0${x.text}`; x.nth = seen.get(k) ?? 0; seen.set(k, x.nth + 1); }
  return list;
};
const idOf = (x) => createHash("sha1").update(`${x.file}\0${x.prop}\0${x.text}\0${x.nth ?? 0}`).digest("hex").slice(0, 12);

/** The film's code words: { engine, items: [{ id, file, line, shot, time, text, prop, shotId?, accent? }] } (shot: the storyboard frame
 *  number, or null when the words are the whole film's). `shots` (placed shots) places words that carry a second (`a:`) in their shot. */
export function codeTexts(dir, { shots = [] } = {}) {
  const shotOf = (t) => (t == null ? null : shots.find((s) => t >= s.start - 1e-3 && t < s.start + (s.duration ?? 0) - 1e-3)?.number ?? null);
  const engine = engineOf(dir), srcs = new Map();
  const srcOf = (rel) => { if (!srcs.has(rel)) srcs.set(rel, read(join(dir, ...rel.split("/")))); return srcs.get(rel); };
  return { engine, items: rawItems(dir).map((x) => ({ id: idOf(x), file: x.file, line: x.line, shot: x.shot ?? shotOf(x.at), time: x.time ?? null, text: x.text, prop: x.prop,
    ...(x.shotId ? { shotId: x.shotId } : {}), ...(x.accent?.length ? { accent: x.accent } : {}),
    style: engine === "what-if" && x.ctx?.open ? styleOf(x.ctx.open, srcOf(x.file), dir) : null })) };
}

// ---- a What If word's face and size (the edit card of a code film's words changes the font and the size too) ----
const NOT_HERE = { size: "This piece sets its own size: pin a note for Claude", font: "This piece sets its own font: pin a note for Claude" };
/** The family a fontFamily value names: a string, a const ('Roboto Mono'), an object's key (VI.ui), the engine's FONT.ui; or null. */
function familyOfExpr(raw, src, dir) {
  const s = /^["'`]([^"'`]+)["'`]$/.exec(raw.trim()) ?? null;
  if (s) return s[1].split(",")[0].trim();
  const [obj, key] = raw.trim().split(".");
  const engine = read(join(dir, ".moworks", "library", "what-if", "engine", "fonts.ts"));
  for (const text of [src, engine]) {
    if (key) { const o = new RegExp(`const\\s+${obj}\\b[^=]*=\\s*\\{([^}]*)\\}`).exec(text)?.[1]; const v = o && new RegExp(`\\b${key}\\s*:\\s*(?:[^,'"]*\\?[^,:]*:\\s*)?["']([^"']+)["']`).exec(o)?.[1]; if (v) return v; }
    else { const v = new RegExp(`const\\s+${obj}\\s*(?::[^=]+)?=\\s*["']([^"']+)["']`).exec(text)?.[1]; if (v) return v; }
  }
  return null;
}
/** Does this file's component take a prop (VPill's `size`)? */
const takesProp = (src, comp, prop) => new RegExp(`(?:const|function)\\s+${comp}\\b[^=(]*(?:=\\s*)?\\(\\s*\\{[^}]*\\b${prop}\\b`).test(src);
/** The font a piece of the film sets inside itself (VPill's fontFamily={MONO}), named; null when it sets none or several. */
function pieceFont(src, comp, dir) {
  const start = new RegExp(`(?:const|function)\\s+${comp}\\b`).exec(src);
  if (!start) return null;
  const next = /\n(?:export\s+)?(?:const|function)\s+[A-Z]/g; next.lastIndex = start.index + 1;
  const body = src.slice(start.index, next.exec(src)?.index ?? src.length);
  const fams = [...new Set([...body.matchAll(/fontFamily=\{?\s*([^}\s]+|"[^"]*"|'[^']*')\s*\}?/g)].map((m) => familyOfExpr(m[1], src, dir)).filter(Boolean))];
  return fams.length === 1 ? fams[0] : null;
}
function styleOf(open, src, dir) {
  const a = open.attrs, sizeAttr = SIZE_ATTRS.map((k) => a[k] && { k, ...a[k] }).find(Boolean), fontAttr = FONT_ATTRS.map((k) => a[k] && { k, ...a[k] }).find(Boolean);
  const sizeName = sizeAttr?.k ?? (open.intrinsic ? "fontSize" : takesProp(src, open.name, "size") ? "size" : takesProp(src, open.name, "fontSize") ? "fontSize" : null);
  const fontName = fontAttr?.k ?? (open.intrinsic ? "fontFamily" : takesProp(src, open.name, "fontFamily") ? "fontFamily" : takesProp(src, open.name, "font") ? "font" : null);
  return {
    size: sizeName ? { value: sizeAttr?.kind === "num" ? sizeAttr.value : null, editable: true, ...(sizeAttr && sizeAttr.kind !== "num" ? { note: "worked out in the code: a number here replaces it for these words only" } : {}) }
      : { value: null, editable: false, why: NOT_HERE.size },
    font: fontName ? { value: fontAttr ? familyOfExpr(fontAttr.kind === "str" ? JSON.stringify(fontAttr.value) : fontAttr.value, src, dir) : null, editable: true }
      : { value: pieceFont(src, open.name, dir), editable: false, why: NOT_HERE.font },
  };
}

/** Write a What If word's size (px) and/or font family on its own tag (an attribute replaced, or added to an SVG text or a piece that
 *  takes it); the family is imported as a Google Fonts module so the app installs its faces (R-WHATIF, R-FONTS). { changed, file, item }.
 *  The caller checks the family first (Vietnamese letters, whether the app can serve it). */
export function setCodeStyle(dir, id, { size = null, font = null } = {}, { shots = [] } = {}) {
  const it = codeTexts(dir, { shots }).items.find((x) => x.id === id);
  if (!it) throw Object.assign(new Error("These words are no longer in the film (it changed): look again"), { code: "NOT_FOUND" });
  if (!it.style) throw Object.assign(new Error("The font and size of these words are set in the film's code: pin a note for Claude"), { code: "NOT_EDITABLE" });
  const x = rawItems(dir).find((y) => idOf(y) === id), open = x.ctx.open;
  const path = join(dir, ...x.file.split("/"));
  let src = readFileSync(path, "utf8");
  const edits = [];          // [start, end, text], applied from the end so offsets hold
  const put = (names, attrName, value, editable) => {
    if (!editable) throw Object.assign(new Error(NOT_HERE[attrName === "size" || attrName === "fontSize" ? "size" : "font"]), { code: "NOT_EDITABLE" });
    const have = names.map((k) => open.attrs[k] && { k, ...open.attrs[k] }).find(Boolean);
    if (have) edits.push([have.start, have.end, value]);
    else edits.push([open.nameEnd, open.nameEnd, ` ${attrName}=${value}`]);
  };
  if (size != null) {
    const n = Math.round(Number(size));
    if (!(n >= 6 && n <= 600)) throw Object.assign(new Error("A text size is a number from 6 to 600"), { code: "INVALID" });
    const name = SIZE_ATTRS.find((k) => open.attrs[k]) ?? (open.intrinsic ? "fontSize" : takesProp(src, open.name, "size") ? "size" : "fontSize");
    put(SIZE_ATTRS, name, `{${n}}`, it.style.size.editable);
  }
  if (font != null) {
    const fam = String(font).replace(/["'`{}<>\\]/g, "").trim();
    if (!fam) throw Object.assign(new Error("Choose a font"), { code: "INVALID" });
    const name = FONT_ATTRS.find((k) => open.attrs[k]) ?? (open.intrinsic ? "fontFamily" : takesProp(src, open.name, "fontFamily") ? "fontFamily" : "font");
    put(FONT_ATTRS, name, `"${fam}"`, it.style.font.editable);
  }
  for (const [a, b, t] of edits.sort((p, q) => q[0] - p[0])) src = src.slice(0, a) + t + src.slice(b);
  // the family as a Google Fonts module of the film, once (the stand-in answers its name; the app installs its faces offline)
  if (font != null) {
    const fam = String(font).replace(/["'`{}<>\\]/g, "").trim(), mod = `@remotion/google-fonts/${fam.replace(/[^A-Za-z0-9]/g, "")}`;
    if (!src.includes(mod)) src = `import "${mod}";\n` + src;
  }
  writeFileSync(path, src);
  return { changed: true, file: x.file, item: codeTexts(dir, { shots }).items.find((y) => y.text === it.text && y.file === it.file) ?? it };
}

/** The new words written for a literal of this quote. JSX words and attributes cannot hold every sign: they become {'…'} then. */
function encode(quote, text) {
  const t = text.replace(/\r?\n/g, " ");
  const js = (q) => t.replace(/\\/g, "\\\\").split(q).join(`\\${q}`);
  if (quote === "'" || quote === '"') return { body: js(quote) };
  if (quote === "`") return { body: t.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") };
  if (quote === "attr") return /["{}]/.test(t) ? { wrap: `{'${js("'")}'}` } : { body: t };
  if (quote === "jsx") return /[{}<>]/.test(t) ? { wrap: `{'${js("'")}'}` } : { body: t };
  return { body: t };
}

/** Write one item's new words: { changed, item, file, warnings }. Throws NOT_FOUND (gone), STALE (the file no longer holds what was
 *  seen), INVALID (empty words). */
export function setCodeText(dir, id, text, { was = null, shots = [] } = {}) {
  const words = String(text ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!words) throw Object.assign(new Error("The words are empty: to take them out, pin a note for Claude"), { code: "INVALID" });
  const it = codeTexts(dir, { shots }).items.find((x) => x.id === id);
  if (!it) throw Object.assign(new Error("These words are no longer in the film (it changed): look again"), { code: "NOT_FOUND" });
  if (was != null && String(was).normalize("NFC").replace(/\s+/g, " ").trim() !== it.text.replace(/\s+/g, " ").trim()) throw Object.assign(new Error("The film changed since you opened these words: look again"), { code: "STALE" });
  if (words === it.text) return { changed: false, item: it, file: it.file, warnings: [] };
  const x = rawItems(dir).find((y) => idOf(y) === id);
  const path = join(dir, ...x.file.split("/")), src = readFileSync(path, "utf8");
  let next;
  if (x.quote === "letters") {
    const tag = x.spanTag.replace(/\s+data-hf-id="[^"]*"/, "");
    const esc = (c) => (c === " " ? "&nbsp;" : c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    next = src.slice(0, x.start) + [...words].map((c) => `${tag}${esc(c)}</span>`).join("") + src.slice(x.end);
  } else {
    const e = encode(x.quote, words), q = x.quote === "attr" || x.quote === "'" || x.quote === '"' || x.quote === "`" ? 1 : 0;
    next = e.wrap ? src.slice(0, x.start - q) + e.wrap + src.slice(x.end + q) : src.slice(0, x.start) + e.body + src.slice(x.end);
  }
  writeFileSync(path, next);
  const warnings = [];
  if (x.ctx?.attr === "lines") {
    // What If: a title's line is the episode's title too; an accent word that left it is no longer highlighted
    const ef = join(dir, "whatif", "episode.json");
    try { const ep = JSON.parse(read(ef)); if (Array.isArray(ep.title) && ep.title[x.lineOf] === x.text) { ep.title[x.lineOf] = words; writeFileSync(ef, JSON.stringify(ep, null, 1) + "\n"); } } catch { /* no episode file */ }
    const gone = (x.accent ?? []).filter((w) => x.text.split(/\s+/).includes(w) && !words.split(/\s+/).includes(w));
    if (gone.length) warnings.push(`${gone.map((w) => `"${w}"`).join(", ")} ${gone.length > 1 ? "were" : "was"} highlighted and ${gone.length > 1 ? "are" : "is"} no longer in this line: pin a note for Claude to highlight another word`);
  }
  if (words.length > it.text.length * 1.4 + 4) warnings.push("These words are much longer than before: check that they still fit the frame");
  return { changed: true, item: { ...it, text: words }, file: x.file, warnings };
}
