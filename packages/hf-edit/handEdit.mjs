// Hand edits in the Editor: the words, colour, size and font of one element, and a shot's length and speed. Every write
// goes through HyperFrames' own source mutation (`patchElementInHtml`, `findTargetElement`, `stampProjectHfIds` of the pinned
// @hyperframes/studio-server, the functions HF Studio itself uses), never through string surgery of the app's own.
// Only words written in the file can change here; words a script makes at run time are not in the file, so the Editor says "ask Claude".
// The first hand edit of an element records what Claude had written (.moworks/hand-edits.json); Reset puts it back. HF's parser writes a whole
// file out in its own way (&nbsp; as &#160;, a bare attribute as attr=""), so the file as it was before its first hand edit is kept too: a file
// whose words come back to what they were goes back to the same bytes, and the film's preview and checks stay valid (T28-12).
// Words animated letter by letter are one line here (hf-preview/splitText.js): written back into the letter spans, so the film's script still
// animates them (T28-8). A line with more or fewer letters than before asks the film to load again.
// HF: https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/packages/studio-server/src/helpers/sourceMutation.ts
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveRuntime } from "../version-manager/index.mjs";
import { readMounts } from "./shots.mjs";
import "../hf-preview/splitText.js";

const split = globalThis.__mwSplitText;

const cache = new Map();
const err = (code, message) => Object.assign(new Error(message), { code });
const STORE = [".moworks", "hand-edits.json"];
export const STYLE_KEYS = ["color", "font-size", "font-family"];
const SKIP_TAGS = new Set(["script", "style", "template", "svg", "defs", "filter", "audio", "video", "img", "source", "canvas", "iframe"]);

/** HF's source-mutation and id helpers from the pinned runtime. */
export async function hfSource(version = null) {
  const rt = resolveRuntime(version);
  if (cache.has(rt.dir)) return cache.get(rt.dir);
  const dir = join(rt.dir, "node_modules", "@hyperframes", "studio-server", "dist", "helpers");
  const mod = {
    sm: await import(pathToFileURL(join(dir, "sourceMutation.js")).href),
    ids: await import(pathToFileURL(join(dir, "hfIdPersist.js")).href),
  };
  cache.set(rt.dir, mod);
  return mod;
}

/** A composition file of the project: .html, inside the project, never under .git / .moworks / node_modules. */
export function safeFile(dir, file) {
  const rel = normalize(String(file ?? "")).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!rel || !/\.html?$/i.test(rel) || rel.split("/").some((p) => p === ".." || p === ".git" || p === ".moworks" || p === "node_modules"))
    throw err("INVALID", "Not a composition file of this project");
  const abs = resolve(dir, rel);
  if (!abs.startsWith(resolve(dir) + sep) || !existsSync(abs)) throw err("NOT_FOUND", `${rel} was not found`);
  return { rel, abs };
}

/** Pin HF's element ids (`data-hf-id`) into every composition: the Editor's picker and these edits address elements by them. HF writes a file
 *  through a temporary one and a rename, and on Windows the rename answers EPERM while another program holds the page open (the preview, HF
 *  Studio, an antivirus): HF tries for 1.3 s, leaves that page as it was, logs the whole error and goes on (Test 30: 42 log lines on one film).
 *  A few such pages are tried once more a moment later (HF's waits hold the server's thread, so many are not); a page still busy gets its ids the
 *  next time the Editor opens, and only one line says so. Returns how many stayed busy. HF's own function runs as shipped and is synchronous, so
 *  its warnings are the only ones caught here. */
export async function stampIds(dir, { version = null, tries = 2, waitMs = 250, fewBusy = 3 } = {}) {
  const { ids } = await hfSource(version);
  let busy = 0;
  for (let i = 0; i < tries; i++) {
    busy = 0;
    const warn = console.warn;
    console.warn = (...a) => { if (/stampFileHfIds/.test(String(a[0]))) busy++; else warn(...a); };
    try { ids.stampProjectHfIds(dir); } finally { console.warn = warn; }
    if (!busy) return { busy: 0 };
    if (busy > fewBusy) break;
    if (i < tries - 1) await new Promise((r) => setTimeout(r, waitMs));
  }
  console.log(`[hand-edit] ${busy} page(s) of the film were busy, their element ids come the next time the Editor opens; nothing is lost`);
  return { busy };
}

const readStore = (dir) => { try { return JSON.parse(readFileSync(join(dir, ...STORE), "utf8")); } catch { return {}; } };
const writeStore = (dir, v) => { mkdirSync(join(dir, STORE[0]), { recursive: true }); writeFileSync(join(dir, ...STORE), JSON.stringify(v, null, 2) + "\n"); };

/** The inline value of one CSS property in a style attribute ("" when it is not set there). */
function inlineStyle(el, prop) {
  const raw = el.getAttribute("style") ?? "";
  for (const decl of raw.split(";")) {
    const i = decl.indexOf(":");
    if (i > 0 && decl.slice(0, i).trim().toLowerCase() === prop) return decl.slice(i + 1).trim();
  }
  return "";
}

/** Text that sits directly in an element whose only children are text (what `text-content` can replace without losing markup). */
function ownText(el) {
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return null;
  if (el.children.length > 0) return null;
  const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return t ? t : null;
}

function load(sm, abs) {
  const src = readFileSync(abs, "utf8");
  const { document, wrappedFragment } = sm.parseSourceDocument(src);
  return { src, document, wrappedFragment };
}
/** The page written out as HF's own source mutation writes it. */
const written = (document, wrappedFragment) => (wrappedFragment ? document.body.innerHTML || "" : document.toString());

// The file's bytes before its first hand edit: under the project's cache (never in its history, and gone with no harm: Reset then keeps the words only)
const baseFile = (dir, rel) => join(dir, ".moworks", "cache", "hand-edits", `${createHash("sha1").update(rel).digest("hex").slice(0, 16)}.html`);
const readBase = (dir, rel) => { try { return readFileSync(baseFile(dir, rel), "utf8"); } catch { return null; } };
function keepBase(dir, rel, src) {
  const f = baseFile(dir, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, src);
}
/** Two pages drawn the same: read and written the same way; HF's ids and an empty style left by a removed property do not count. */
const drawn = (sm, html) => { const { document, wrappedFragment } = sm.parseSourceDocument(html); return written(document, wrappedFragment).replace(/\s+data-hf-id="[^"]*"/g, "").replace(/\s+style=""/g, ""); };
/** Write a hand edit's page: when it is what the file was before its first hand edit, the file goes back to those very bytes and no hand edit is
 *  left on it. Returns whether the file changed. */
function put(sm, dir, rel, abs, src, html) {
  const base = readBase(dir, rel);
  const back = base != null && drawn(sm, base) === drawn(sm, html);
  const out = back ? base : html;
  if (out !== src) writeFileSync(abs, out);
  if (back) {
    const store = readStore(dir), mine = Object.keys(store).filter((k) => k.startsWith(`${rel}#`));
    if (mine.length) { for (const k of mine) delete store[k]; writeStore(dir, store); }
    rmSync(baseFile(dir, rel), { force: true });
  }
  return out !== src;
}

/** Every element id in the file, in source order (template contents included). */
const idsIn = (src) => [...src.matchAll(/\bdata-hf-id="([^"]+)"/g)].map((m) => m[1]);

/** The elements of a file that hold words, in source order, each with its text: an element with only text, or a whole line of split letters
 *  (once: its letters are not listed). `inside`: only within this element. A letter asked for by its own id stays that letter. */
function wordsIn(sm, src, document, inside = null) {
  const out = [], lines = [];
  for (const id of idsIn(src)) {
    const x = sm.findTargetElement(document, { hfId: id });
    if (!x || (inside && !(x === inside || inside.contains(x)))) continue;
    if (lines.some((l) => l.contains(x))) continue;
    if (split.isRun(x)) { lines.push(x); out.push({ id, x, text: split.read(x), line: true }); continue; }
    const text = ownText(x);
    if (text != null) out.push({ id, x, text });
  }
  return out;
}

/** The words of one element: itself when it holds only text, else each text-only element inside it (a title split into lines); a line of split
 *  letters is one part. */
export async function partsOf(dir, file, hfId, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) return { file: rel, hfId, found: false, parts: [], style: null };
  const store = readStore(dir);
  const parts = wordsIn(sm, src, document, el).map(({ id, x, text, line }) => ({ hfId: id, tag: x.tagName.toLowerCase(), text, ...(line ? { line: true } : {}), edited: !!store[`${rel}#${id}`] }));
  const style = Object.fromEntries(STYLE_KEYS.map((k) => [k, inlineStyle(el, k)]));
  return { file: rel, hfId, found: true, tag: el.tagName.toLowerCase(), parts, style, edited: !!store[`${rel}#${hfId}`] };
}

/** All the words of one composition file ("Words on screen"). */
// the words a viewer reads on screen, not the inside of a code block drawn in the film (its tokens, its line numbers) nor a lone
// punctuation mark
const CODE_CLASS = /(^|\s)(code|codeblock|editor|token|syntax|gutter|ln|line-?nums?|line-?numbers?|hljs|prism)(\s|$)/i;
function inCode(el) {
  for (let x = el; x && x.tagName; x = x.parentElement) {
    const tag = x.tagName.toLowerCase();
    if (tag === "pre" || tag === "code" || CODE_CLASS.test(x.getAttribute?.("class") ?? "")) return true;
  }
  return false;
}
const onlyMarks = (t) => /^[\p{P}\p{S}\s]+$/u.test(t);

export async function textsOf(dir, file, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const store = readStore(dir);
  const out = wordsIn(sm, src, document).filter(({ x, text }) => !onlyMarks(text) && !inCode(x))
    .map(({ id, x, text, line }) => ({ hfId: id, tag: x.tagName.toLowerCase(), text, ...(line ? { line: true } : {}), edited: !!store[`${rel}#${id}`] }));
  return { file: rel, texts: out };
}

/** The caption groups of a captions composition (HF's data-track-kind="captions"), in source order: each element with its own data-start and the words in
 *  it, its seconds local to the file. Words a script builds, or groups with no time of their own, are not listed: Claude changes those. */
export async function captionCues(dir, file, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const words = wordsIn(sm, src, document), groups = [];
  for (const id of idsIn(src)) {
    const x = sm.findTargetElement(document, { hfId: id });
    if (!x?.hasAttribute("data-start") || x.hasAttribute("data-composition-id") || /^(audio|video|img|script|style)$/i.test(x.tagName)) continue;
    if (groups.some((g) => g.x.contains(x))) continue;
    const parts = words.filter((w) => w.x === x || x.contains(w.x)).map((w) => ({ hfId: w.id, text: w.text }));
    if (!parts.length) continue;
    const length = x.getAttribute("data-duration");
    groups.push({ x, start: Number(x.getAttribute("data-start")) || 0, duration: length != null ? Number(length) : null, text: parts.map((p) => p.text).join(" "), parts });
  }
  return groups.map(({ x: _x, ...g }) => g);
}

/** Record what was there before the first hand edit of this element (Reset puts it back), and the file's bytes before its first hand edit. */
function remember(dir, rel, hfId, el, src) {
  const store = readStore(dir);
  const key = `${rel}#${hfId}`;
  if (store[key]) return;
  if (!Object.keys(store).some((k) => k.startsWith(`${rel}#`))) keepBase(dir, rel, src);
  const line = split.isRun(el);
  store[key] = { text: line ? split.read(el) : ownText(el), ...(line ? { inner: el.innerHTML } : {}), style: Object.fromEntries(STYLE_KEYS.map((k) => [k, inlineStyle(el, k)])), at: new Date().toISOString() };
  writeStore(dir, store);
}

function write(sm, dir, rel, abs, src, hfId, ops) {
  const r = sm.patchElementInHtml(src, { hfId }, ops);
  if (!r.matched) throw err("NOT_FOUND", "That element is not in the file any more");
  return put(sm, dir, rel, abs, src, r.html);
}

/** New words for a text-only element. */
export async function setText(dir, file, hfId, text, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document, wrappedFragment } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) throw err("NOT_FOUND", "That element is not in the file any more");
  const line = split.isRun(el);
  if (!line && ownText(el) == null) throw err("NOT_EDITABLE", "These words are made by a script: ask Claude to change them");
  const value = split.tidy(text);
  if (!value) throw err("INVALID", "The text cannot be empty");
  if (line) return setLine(sm, dir, rel, abs, src, document, wrappedFragment, el, hfId, value);
  remember(dir, rel, hfId, el, src);
  return { file: rel, changed: write(sm, dir, rel, abs, src, hfId, [{ type: "text-content", property: "textContent", value }]) };
}

/** A new line written into its letter spans, on HF's own parsed document and written out as HF writes it (its text-content would put the whole line
 *  into one element and take the letters away from the film's script). HF stamps the ids of letters added. A letter its script names by its own
 *  id cannot be added here: a copy would not move, or would not show. */
function setLine(sm, dir, rel, abs, src, document, wrappedFragment, el, hfId, value) {
  const before = split.read(el), count = split.countOf(el);
  if (value === before) return { file: rel, changed: false };
  const named = Array.from(el.querySelectorAll("*")).some((x) => x.getAttribute("id"));
  if (named && split.graphemes(value).length > split.graphemes(before).length) throw err("NOT_EDITABLE", "This line's script moves each letter by its own name, so it cannot take more letters here: pin a note for Claude");
  remember(dir, rel, hfId, el, src);
  split.write(el, value);
  const again = sm.parseSourceDocument(written(document, wrappedFragment));          // read again: HF stamps the new letters with their ids
  return { file: rel, changed: put(sm, dir, rel, abs, src, written(again.document, again.wrappedFragment)), reload: split.countOf(el) !== count };
}

/** Colour, size and font of an element, as inline style (an empty value removes the property). */
export async function setStyle(dir, file, hfId, style, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) throw err("NOT_FOUND", "That element is not in the file any more");
  const ops = [];
  for (const k of STYLE_KEYS) {
    if (!(k in (style ?? {}))) continue;
    const v = String(style[k] ?? "").trim();
    if (/[;{}<>]/.test(v)) throw err("INVALID", `Not a valid ${k}`);
    ops.push({ type: "inline-style", property: k, value: v || null });
  }
  if (!ops.length) return { file: rel, changed: false };
  remember(dir, rel, hfId, el, src);
  return { file: rel, changed: write(sm, dir, rel, abs, src, hfId, ops) };
}

/** Put back what Claude had written before the hand edits of this element (its words and inline style); the file's very bytes once nothing else
 *  was edited in it. Says what came back (`text`, `style`) for the film on screen, and `reload` when a line of letters has another count again. */
export async function reset(dir, file, hfId, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const store = readStore(dir);
  const key = `${rel}#${hfId}`;
  const was = store[key];
  if (!was) return { file: rel, changed: false };
  const { src, document, wrappedFragment } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) throw err("NOT_FOUND", "That element is not in the file any more");
  let html = src, reload = false;
  if (was.inner != null) {
    const count = split.countOf(el);
    el.innerHTML = was.inner;
    reload = split.countOf(el) !== count;
    html = written(document, wrappedFragment);
  }
  const ops = STYLE_KEYS.map((k) => ({ type: "inline-style", property: k, value: was.style?.[k] || null }));
  if (was.text && was.inner == null) ops.unshift({ type: "text-content", property: "textContent", value: was.text });
  const r = sm.patchElementInHtml(html, { hfId }, ops);
  if (!r.matched) throw err("NOT_FOUND", "That element is not in the file any more");
  delete store[key];
  writeStore(dir, store);
  const changed = put(sm, dir, rel, abs, src, r.html);
  if (!Object.keys(readStore(dir)).some((k) => k.startsWith(`${rel}#`))) rmSync(baseFile(dir, rel), { force: true });          // nothing left to come back to
  return { file: rel, changed, text: was.text ?? null, style: Object.fromEntries(STYLE_KEYS.map((k) => [k, was.style?.[k] ?? ""])), reload };
}

const r3 = (n) => Math.round(n * 1000) / 1000;

/** A shot's length (seconds) and speed (HF's data-playback-rate) in index.html. A new length moves every later shot by the difference,
 *  and the film's length with it. Returns { delta, mounts, movedFrom } (the new starts; the second from which the sound effects moved by delta). */
export async function setShotTiming(dir, mountId, { duration = null, rate = null } = {}, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const abs = join(dir, "index.html");
  const { root, mounts } = readMounts(dir);
  const m = mounts.find((x) => x.id === mountId);
  if (!m) throw err("NOT_FOUND", "That shot is not on the timeline");
  let src = readFileSync(abs, "utf8");
  const patch = (target, ops) => { const r = sm.patchElementInHtml(src, target, ops); if (!r.matched) throw err("NOT_FOUND", "The timeline changed: reload"); src = r.html; };
  // readMounts gives the HF id as the id when it comes first in the tag: try it as HF's id, then as an id, then by the scene's source
  const at = (x) => ({ hfId: /^hf-/.test(x.id ?? "") ? x.id : undefined, id: x.id,
    selector: x.src ? `[data-composition-src="${x.src}"]` : `[data-composition-id="${x.compositionId}"]` });
  let delta = 0, movedFrom = null;
  if (duration != null) {
    const d = Number(duration);
    if (!(d >= 0.2 && d <= 600)) throw err("INVALID", "A shot is 0.2 to 600 seconds long");
    const oldEnd = m.start + (m.duration ?? 0);
    delta = r3(d - (m.duration ?? 0));
    patch(at(m), [{ type: "attribute", property: "data-duration", value: String(r3(d)) }]);
    if (delta) {
      // every later shot moves by the same amount, also one that starts inside this shot's transition (shortening once left a black gap
      // because a shot overlapping the old end was not moved, while lengthening moved it)
      const later = mounts.filter((x) => x.id !== mountId && x.start > m.start + 1e-3);
      for (const x of later) patch(at(x), [{ type: "attribute", property: "data-start", value: String(r3(x.start + delta)) }]);
      // sound effects on the later shots move with them (from the first later shot's start); the voice-over stays where it is
      const from = later.length ? Math.min(...later.map((x) => x.start)) : oldEnd;
      for (const tag of src.match(/<audio\b[^>]*>/g) ?? []) {
        if (/data-timeline-role="(voiceover|music)"/.test(tag)) continue;          // a sound effect moved to its lane by hand (role "sfx") still moves
        const id = /(?<![\w-])id="([^"]+)"/.exec(tag)?.[1], hfId = /\bdata-hf-id="([^"]+)"/.exec(tag)?.[1], start = Number(/\bdata-start="([^"]+)"/.exec(tag)?.[1]);
        const srcAttr = /(?<![\w-])src="([^"]+)"/.exec(tag)?.[1], app = Number(/\bdata-mw-at="([^"]+)"/.exec(tag)?.[1]);
        if (!(start >= from - 1e-3)) continue;
        const target = id || hfId ? { hfId, id } : srcAttr ? { selector: `audio[src="${srcAttr}"][data-start="${/\bdata-start="([^"]+)"/.exec(tag)[1]}"]` } : null;
        // the place the app gave a cue moves with its shot too: that is no move of the user's (sfx/index.mjs handMoves)
        if (target) patch(target, [{ type: "attribute", property: "data-start", value: String(r3(start + delta)) }, ...(Number.isFinite(app) ? [{ type: "attribute", property: "data-mw-at", value: String(r3(app + delta)) }] : [])]);
      }
      movedFrom = from;
      if (root.duration != null && root.id) {
        const filmEnd = r3(root.duration + delta);
        patch({ selector: `[data-composition-id="${root.id}"]` }, [{ type: "attribute", property: "data-duration", value: String(filmEnd) }]);
        // the music ends with the film when the film got shorter than it
        for (const tag of src.match(/<audio\b[^>]*data-timeline-role="music"[^>]*>/g) ?? []) {
          const id = /(?<![\w-])id="([^"]+)"/.exec(tag)?.[1], s0 = Number(/\bdata-start="([^"]+)"/.exec(tag)?.[1] ?? 0), d0 = Number(/\bdata-duration="([^"]+)"/.exec(tag)?.[1]);
          if (id && d0 && s0 + d0 > filmEnd + 1e-3) patch({ id }, [{ type: "attribute", property: "data-duration", value: String(r3(Math.max(0.1, filmEnd - s0))) }]);
        }
      }
    }
  }
  if (rate != null) {
    const v = Number(rate);
    if (!(v >= 0.25 && v <= 4)) throw err("INVALID", "Speed is 0.25× to 4×");
    patch(at(m), [{ type: "attribute", property: "data-playback-rate", value: v === 1 ? null : String(v) }]);
  }
  writeFileSync(abs, src);
  return { delta, mounts: readMounts(dir).mounts, movedFrom };
}

// ---- sound on the root timeline, after HF Studio's model at 490ecaf: a timed clip is an element with
// data-start / data-duration on its track; a drag patches data-start (and the track), a delete removes the element
// (packages/studio/src/player/components/timelineClipDragCommit.ts; studio-server/src/helpers/sourceMutation.ts patchElementInHtml,
// removeElementFromHtml). The app's lanes are its data-timeline-role: voiceover, music, sfx (old sound effects carry none).
export const AUDIO_ROLE = { voice: "voiceover", music: "music", sfx: "sfx" };
const AUDIO_ELEMENT = /<audio\b[^>]*>(?:\s*<\/audio>)?/gi;
const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
/** A sound effect, not a track: the app's own clips (a placed cue, one from the Sounds drawer or the SFX lane, an ambience bed), or a file of the sfx folder
 *  still on the SFX lane. A file of that folder the user dropped on the voice's or the music's lane from Assets is that track (el-voice, el-music). */
export const isEffectClip = (a) => /^el-(sfx|clip|amb)-/.test(a?.id ?? "") || ((a?.["data-timeline-role"] ?? "sfx") === "sfx" && /(^|\/)sfx\//.test(a?.src ?? ""));
/** The <audio> a request names, as HF's findTargetElement finds an element (its HF id; else its id, unless that element's own HF id says it is another one;
 *  else its file and its start): { index, text, a }, or null. text: its open tag, with an empty close tag right after it. */
function audioIn(html, { hfId = null, id = null, src = null, start = null } = {}) {
  if (!hfId && !id && !(src && start != null)) throw err("INVALID", "Which sound? Give its HF id, id, or src and start");
  const all = [...html.matchAll(AUDIO_ELEMENT)].map((m) => ({ index: m.index, text: m[0], a: attrsOf(m[0]) }));
  const byHf = hfId ? all.find((x) => x.a["data-hf-id"] === hfId) : null;
  if (byHf) return byHf;
  if (id) { const x = all.find((y) => y.a.id === id); return x && !(hfId && x.a["data-hf-id"]) ? x : null; }
  if (hfId) return null;
  return all.find((x) => x.a.src === String(src) && Number(x.a["data-start"]) === Number(start)) ?? null;
}
/** HF's own mutation of one <audio> (patchElementInHtml, the operations Studio's drag commits) on that tag alone, written back into the page. On the whole page
 *  HF writes all of it out in its own way (`<!doctype html>` as `<!DOCTYPE html>`, `<meta … />` as `<meta …>`, a bare attribute as attr=""), and a sound moved
 *  read as a new picture: a whole render for what a remix does in seconds (T29-6, the family of T28-12). Every other byte of the page stays. */
function patchedAudio(sm, html, x, ops) {
  const r = sm.patchElementInHtml(x.text, { selector: "audio" }, ops);
  if (!r.matched) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  let tag = r.html.trim();
  if (x.a["data-hf-id"] == null) tag = tag.replace(/\s+data-hf-id="[^"]*"/, "");          // the Editor pins the ids as it opens: a move adds none
  if (!/<\/audio>$/i.test(x.text)) tag = tag.replace(/\s*<\/audio>$/i, "");
  return html.slice(0, x.index) + tag + html.slice(x.index + x.text.length);
}
/** Change one sound's data attributes ([{ property, value }]; value null takes one off), nothing else of the page. Returns whether it changed. */
export async function patchAudio(dir, target, attrs, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const abs = join(dir, "index.html"), html = readFileSync(abs, "utf8"), x = audioIn(html, target);
  if (!x) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  const out = attrs.length ? patchedAudio(sm, html, x, attrs.map((o) => ({ type: "attribute", ...o }))) : html;
  if (out !== html) writeFileSync(abs, out);
  return out !== html;
}
/** Move a sound along the timeline (start, seconds) and/or to another lane (voice | music | sfx). A start is inside the film (T29-4); a sound effect stays on the
 *  SFX lane, or it would count as the film's voice or its music (T29-5). Returns { changed, was, now }: the tag's attributes before and after. */
export async function setAudio(dir, target, { start = null, lane = null } = {}, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const abs = join(dir, "index.html");
  const src = readFileSync(abs, "utf8");
  const x = audioIn(src, target);
  const ops = [];
  if (start != null) {
    const s = Number(start), { root } = readMounts(dir), film = root.starter ? null : Number(root.duration) || null;
    if (!(s >= 0 && s <= 36000)) throw err("INVALID", "A start is 0 to 36000 seconds");
    if (film != null && s >= film) throw err("INVALID", `The film ends at ${r3(film)} s: a sound starts before that`);
    ops.push({ type: "attribute", property: "data-start", value: String(r3(s)) });
  }
  if (lane != null) {
    if (!(lane in AUDIO_ROLE)) throw err("INVALID", "A lane is voice, music or sfx");
    if (x && lane !== "sfx" && isEffectClip(x.a)) throw err("NOT_EDITABLE", "A sound effect stays on the SFX lane. To use its file as the voice or the music, drop it on that lane from Assets.");
    ops.push({ type: "attribute", property: "data-timeline-role", value: AUDIO_ROLE[lane] });
  }
  if (!ops.length) return { changed: false };
  if (!x) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  const html = patchedAudio(sm, src, x, ops);
  if (html !== src) writeFileSync(abs, html);
  return { changed: html !== src, was: x.a, now: attrsOf(html.slice(x.index, html.indexOf(">", x.index) + 1)) };
}
/** Take a sound off the timeline; its file stays in the project (Assets). Only its tag leaves the page, so the picture reads the same. */
export async function removeAudio(dir, target) {
  const abs = join(dir, "index.html");
  const src = readFileSync(abs, "utf8");
  const x = audioIn(src, target);
  if (!x) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  writeFileSync(abs, src.slice(0, x.index) + src.slice(x.index + x.text.length));
  return { changed: true, was: x.a };
}
