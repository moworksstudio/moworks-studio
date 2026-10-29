// Hand edits in the Editor: the words, colour, size and font of one element, and a shot's length and speed. Every write
// goes through HyperFrames' own source mutation (`patchElementInHtml`, `findTargetElement`, `stampProjectHfIds` of the pinned
// @hyperframes/studio-server, the functions HF Studio itself uses), never through string surgery of the app's own.
// Only words written in the file can change here; words a script makes at run time are not in the file, so the Editor says "ask Claude".
// The first hand edit of an element records what Claude had written (.moworks/hand-edits.json); Reset puts it back.
// HF: https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/packages/studio-server/src/helpers/sourceMutation.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveRuntime } from "../version-manager/index.mjs";
import { readMounts } from "./shots.mjs";

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

/** Pin HF's element ids (`data-hf-id`) into every composition: the Editor's picker and these edits address elements by them. */
export async function stampIds(dir, { version = null } = {}) {
  const { ids } = await hfSource(version);
  ids.stampProjectHfIds(dir);
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
  const { document } = sm.parseSourceDocument(src);
  return { src, document };
}

/** Every element id in the file, in source order (template contents included). */
const idsIn = (src) => [...src.matchAll(/\bdata-hf-id="([^"]+)"/g)].map((m) => m[1]);

/** The words of one element: itself when it holds only text, else each text-only element inside it (a title split into lines). */
export async function partsOf(dir, file, hfId, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) return { file: rel, hfId, found: false, parts: [], style: null };
  const store = readStore(dir);
  const parts = [];
  for (const id of idsIn(src)) {
    const x = sm.findTargetElement(document, { hfId: id });
    if (!x || !(x === el || el.contains(x))) continue;
    const text = ownText(x);
    if (text != null) parts.push({ hfId: id, tag: x.tagName.toLowerCase(), text, edited: !!store[`${rel}#${id}`] });
  }
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
  const out = [];
  for (const id of idsIn(src)) {
    const x = sm.findTargetElement(document, { hfId: id });
    const text = x ? ownText(x) : null;
    if (text != null && !onlyMarks(text) && !inCode(x)) out.push({ hfId: id, tag: x.tagName.toLowerCase(), text, edited: !!store[`${rel}#${id}`] });
  }
  return { file: rel, texts: out };
}

/** Record what was there before the first hand edit of this element (Reset puts it back). */
function remember(dir, rel, hfId, el) {
  const store = readStore(dir);
  const key = `${rel}#${hfId}`;
  if (store[key]) return;
  store[key] = { text: ownText(el), style: Object.fromEntries(STYLE_KEYS.map((k) => [k, inlineStyle(el, k)])), at: new Date().toISOString() };
  writeStore(dir, store);
}

function write(sm, abs, src, hfId, ops) {
  const r = sm.patchElementInHtml(src, { hfId }, ops);
  if (!r.matched) throw err("NOT_FOUND", "That element is not in the file any more");
  if (r.html !== src) writeFileSync(abs, r.html);
  return r.html !== src;
}

/** New words for a text-only element. */
export async function setText(dir, file, hfId, text, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const { src, document } = load(sm, abs);
  const el = sm.findTargetElement(document, { hfId });
  if (!el) throw err("NOT_FOUND", "That element is not in the file any more");
  if (ownText(el) == null) throw err("NOT_EDITABLE", "These words are made by a script: ask Claude to change them");
  const value = String(text ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!value) throw err("INVALID", "The text cannot be empty");
  remember(dir, rel, hfId, el);
  return { file: rel, changed: write(sm, abs, src, hfId, [{ type: "text-content", property: "textContent", value }]) };
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
  remember(dir, rel, hfId, el);
  return { file: rel, changed: write(sm, abs, src, hfId, ops) };
}

/** Put back what Claude had written before the hand edits of this element (its words and inline style). */
export async function reset(dir, file, hfId, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const { abs, rel } = safeFile(dir, file);
  const store = readStore(dir);
  const key = `${rel}#${hfId}`;
  const was = store[key];
  if (!was) return { file: rel, changed: false };
  const src = readFileSync(abs, "utf8");
  const ops = STYLE_KEYS.map((k) => ({ type: "inline-style", property: k, value: was.style?.[k] || null }));
  if (was.text) ops.unshift({ type: "text-content", property: "textContent", value: was.text });
  const changed = write(sm, abs, src, hfId, ops);
  delete store[key];
  writeStore(dir, store);
  return { file: rel, changed };
}

const r3 = (n) => Math.round(n * 1000) / 1000;

/** A shot's length (seconds) and speed (HF's data-playback-rate) in index.html. A new length moves every later shot by the difference,
 *  and the film's length with it. Returns { delta, mounts } (the new starts). */
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
  let delta = 0;
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
        const srcAttr = /\bsrc="([^"]+)"/.exec(tag)?.[1];
        if (!(start >= from - 1e-3)) continue;
        const target = id || hfId ? { hfId, id } : srcAttr ? { selector: `audio[src="${srcAttr}"][data-start="${/\bdata-start="([^"]+)"/.exec(tag)[1]}"]` } : null;
        if (target) patch(target, [{ type: "attribute", property: "data-start", value: String(r3(start + delta)) }]);
      }
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
  return { delta, mounts: readMounts(dir).mounts };
}

// ---- sound on the root timeline, after HF Studio's model at 490ecaf: a timed clip is an element with
// data-start / data-duration on its track; a drag patches data-start (and the track), a delete removes the element
// (packages/studio/src/player/components/timelineClipDragCommit.ts; studio-server/src/helpers/sourceMutation.ts patchElementInHtml,
// removeElementFromHtml). The app's lanes are its data-timeline-role: voiceover, music, sfx (old sound effects carry none).
export const AUDIO_ROLE = { voice: "voiceover", music: "music", sfx: "sfx" };
function audioTarget({ hfId = null, id = null, src = null, start = null } = {}) {
  if (hfId || id) return { hfId: hfId || undefined, id: id || undefined };
  if (src && start != null) return { selector: `audio[src="${String(src).replace(/"/g, "")}"][data-start="${Number(start)}"]` };
  throw err("INVALID", "Which sound? Give its HF id, id, or src and start");
}
/** Move a sound along the timeline (start, seconds) and/or to another lane (voice | music | sfx). */
export async function setAudio(dir, target, { start = null, lane = null } = {}, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const abs = join(dir, "index.html");
  const src = readFileSync(abs, "utf8");
  const ops = [];
  if (start != null) {
    const s = Number(start);
    if (!(s >= 0 && s <= 36000)) throw err("INVALID", "A start is 0 to 36000 seconds");
    ops.push({ type: "attribute", property: "data-start", value: String(r3(s)) });
  }
  if (lane != null) {
    if (!(lane in AUDIO_ROLE)) throw err("INVALID", "A lane is voice, music or sfx");
    ops.push({ type: "attribute", property: "data-timeline-role", value: AUDIO_ROLE[lane] });
  }
  if (!ops.length) return { changed: false };
  const r = sm.patchElementInHtml(src, audioTarget(target), ops);
  if (!r.matched) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  if (r.html !== src) writeFileSync(abs, r.html);
  return { changed: r.html !== src };
}
/** Take a sound off the timeline; its file stays in the project (Assets). */
export async function removeAudio(dir, target, { version = null } = {}) {
  const { sm } = await hfSource(version);
  const abs = join(dir, "index.html");
  const src = readFileSync(abs, "utf8");
  const html = sm.removeElementFromHtml(src, audioTarget(target));
  if (html === src) throw err("NOT_FOUND", "That sound is not on the timeline any more");
  writeFileSync(abs, html);
  return { changed: true };
}
