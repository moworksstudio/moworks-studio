// The Thumbnails lab's check (owner #1312): Claude runs `node tools/check-thumbs.mjs` in the lab until it says OK; the app runs the same
// check (checkThumbs) on what Claude left. Standalone on purpose: it is copied into the lab and imports nothing of the app.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SIZES = { "16x9": [1280, 720], "9x16": [1080, 1920] };
export const TITLE_WORDS = [3, 6];

const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } };
export const countWords = (text) => (String(text ?? "").normalize("NFC").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu) ?? []).length;
/** The words of #thumb-title in a page: its text with <br> as a space, entities read, whitespace folded; null when there is none. */
export function titleOf(html) {
  const m = /<([a-z][a-z0-9]*)\b[^>]*\bid\s*=\s*["']thumb-title["'][^>]*>([\s\S]*?)<\/\1\s*>/i.exec(String(html ?? ""));
  if (!m) return null;
  return decode(m[2].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));

/** What is wrong with the lab's two pages and thumb.json: { ok, problems: [lines], title }. `owner`: the owner's own title (Edit title):
 *  its length is theirs, so only the page's shape is checked. */
export function checkThumbs(dir, { owner = false } = {}) {
  const problems = [];
  let meta = null;
  try { meta = JSON.parse(read(join(dir, "thumb.json")) ?? "null"); } catch { problems.push("thumb.json is not valid JSON"); }
  if (!owner && !meta) problems.push("Write thumb.json: { title, kitRules, kitPages, notes }");
  const titles = [];
  for (const [tag, [w, h]] of Object.entries(SIZES)) {
    const file = `thumb-${tag}.html`, html = read(join(dir, file));
    if (html == null) { problems.push(`${file} is missing`); continue; }
    const root = /<[a-z][a-z0-9]*\b[^>]*data-composition-id\s*=\s*["']main["'][^>]*>/i.exec(html)?.[0];
    if (!root) problems.push(`${file}: no root element with data-composition-id="main"`);
    else {
      const attr = (k) => Number(new RegExp(`\\b${k}\\s*=\\s*["']?(\\d+)`, "i").exec(root)?.[1]);
      if (attr("data-width") !== w || attr("data-height") !== h) problems.push(`${file}: the root must be data-width="${w}" data-height="${h}"`);
    }
    const ids = html.match(/\bid\s*=\s*["']thumb-title["']/gi) ?? [];
    if (ids.length !== 1) problems.push(`${file}: exactly one element with id="thumb-title" (found ${ids.length})`);
    const t = titleOf(html);
    if (ids.length === 1 && t == null) problems.push(`${file}: #thumb-title must be closed in the same page`);
    else if (t != null) {
      titles.push(t);
      if (/<(?!br\b)[a-z]/i.test(/<([a-z][a-z0-9]*)\b[^>]*\bid\s*=\s*["']thumb-title["'][^>]*>([\s\S]*?)<\/\1\s*>/i.exec(html)?.[2] ?? "")) problems.push(`${file}: #thumb-title holds only its words (a <br> is allowed)`);
    }
    if (/<script\b/i.test(html)) problems.push(`${file}: no scripts (the app adds its own)`);
    for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const ref = (m[1] ?? m[2]).trim();
      if (/^(data:|#)/i.test(ref)) continue;
      if (/^[a-z]+:/i.test(ref) || ref.startsWith("//")) { problems.push(`${file}: ${ref.slice(0, 60)} is outside this folder (use media/ and fonts/ only)`); continue; }
      const f = resolve(dir, ref.split(/[?#]/)[0]);
      if (![resolve(dir, "media"), resolve(dir, "fonts")].some((d) => f.startsWith(d + sep))) problems.push(`${file}: ${ref} is not in media/ or fonts/`);
      else if (!existsSync(f)) problems.push(`${file}: ${ref} does not exist`);
    }
  }
  const title = titles[0] ?? null;
  if (titles.length === 2 && titles[0] !== titles[1]) problems.push(`#thumb-title says "${titles[0]}" in 16:9 and "${titles[1]}" in 9:16: the same words in both`);
  if (!owner && meta && title != null && String(meta.title ?? "").replace(/\s+/g, " ").trim() !== title) problems.push(`thumb.json's title must be the words of #thumb-title ("${title}")`);
  if (!owner && title != null) {
    const n = countWords(title);
    if (n < TITLE_WORDS[0] || n > TITLE_WORDS[1]) problems.push(`The title has ${n} words: ${TITLE_WORDS[0]} to ${TITLE_WORDS[1]}`);
  }
  if (!owner && meta && meta.kitRules != null && !["found", "none"].includes(meta.kitRules)) problems.push(`thumb.json's kitRules is "found", "none" or null`);
  return { ok: problems.length === 0, problems, title };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const r = checkThumbs(dir);
  if (r.ok) { console.log(`OK: "${r.title}"`); } else { console.log(r.problems.map((p) => `- ${p}`).join("\n")); process.exitCode = 1; }
}
