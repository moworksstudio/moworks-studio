// A lyrics video: are the sung words on screen, each on its sung time, with the count sung? (config/rules/moworks-alive/lyric-video.md §2.) The film marks each word's element with
// data-lyric="<n>" or "<n>-<m>" (n: the word's number in .moworks/lyrics/words.json); the app counts the marks, then looks on HF's own page at each word's time. A word's times are
// a draft (heard, or placed on the song's attacks), so the windows are wide: visible by 0.1 s after the sung onset, not before 0.4 s ahead of it. A warning, never a render stop.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { htmlFiles } from "../hf-edit/finalize.mjs";
import { openFilmPage } from "./filmPage.mjs";

export const SUNG = { lateS: 0.1, earlyS: 0.4, maxMarks: 400 };
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const r2 = (n) => Math.round(n * 100) / 100;

/** The timed words of the film's lyrics (without their backing vocals, unless asked), each with its number; [] with none. */
export function timedWords(dir, { backing = false } = {}) {
  const ws = readJson(join(dir, ".moworks", "lyrics", "words.json"))?.words ?? [];
  return ws.map((w, i) => ({ ...w, n: w.n ?? i + 1 })).filter((w) => backing || w.layer !== "backing");
}
/** Film second = song second - this: where the music track starts in the film and in the song (the music clip's data-start, data-media-start). */
export function songOffset(dir) {
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return 0; }
  const tag = /<audio\b[^>]*\bid="el-music"[^>]*>/i.exec(html)?.[0] ?? /<audio\b[^>]*\bdata-timeline-role="music"[^>]*>/i.exec(html)?.[0] ?? "";
  const num = (name) => Number(new RegExp(`\\b${name}="([\\d.]+)"`).exec(tag)?.[1]) || 0;
  return num("data-media-start") - num("data-start");
}
/** Every data-lyric mark in the film's files: [{ from, to, file }]. */
export function lyricMarks(dir) {
  const out = [];
  for (const file of htmlFiles(dir)) for (const m of readFileSync(join(dir, file), "utf8").matchAll(/\bdata-lyric="(\d+)(?:-(\d+))?"/g)) out.push({ from: Number(m[1]), to: Number(m[2] ?? m[1]), mark: m[0].slice(12, -1), file });
  return out;
}
/** The sung words no mark covers, as runs: [{ from, to, text, count }]. A repeated word collapsed into one element shows here with its missing count. */
export function missingWords(words, marks) {
  const covered = new Set();
  for (const m of marks) for (let n = m.from; n <= m.to; n++) covered.add(n);
  const out = [];
  for (const w of words) {
    if (covered.has(w.n)) continue;
    const last = out.at(-1);
    if (last && last.to === w.n - 1) { last.to = w.n; last.text += ` ${w.text}`; last.count++; } else out.push({ from: w.n, to: w.n, text: w.text, count: 1, at: w.start });
  }
  return out;
}
const visible = (mark) => {
  for (const el of document.querySelectorAll(`[data-lyric="${mark}"]`)) {
    let on = el.getBoundingClientRect().width > 0;
    for (let x = el; on && x && x !== document.documentElement; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === "none" || c.visibility === "hidden" || Number(c.opacity) < 0.05) on = false; }
    if (on) return true;
  }
  return false;
};
/** Looks at each mark on HF's page just after its sung time and well before it: { late: [...], early: [...], looked }. */
export async function measureSung(dir, words, marks, { open = openFilmPage, signal = null } = {}) {
  const byN = new Map(words.map((w) => [w.n, w])), off = songOffset(dir), seen = new Set();
  const list = marks.filter((m) => byN.has(m.from) && !seen.has(m.mark) && seen.add(m.mark)).slice(0, SUNG.maxMarks)
    .map((m) => ({ mark: m.mark, n: m.from, text: byN.get(m.from).text, at: r2(byN.get(m.from).start - off) }));
  if (!list.length) return { looked: 0, late: [], early: [] };
  const page = await open(dir);
  try {
    const asks = list.flatMap((x) => [{ x, kind: "late", t: x.at + SUNG.lateS }, ...(x.at >= SUNG.earlyS ? [{ x, kind: "early", t: x.at - SUNG.earlyS }] : [])]).filter((a) => a.t >= 0 && a.t < page.total).sort((a, b) => a.t - b.t);
    const late = [], early = [], check = `(${visible})`;
    for (const a of asks) {
      if (signal?.aborted) break;
      const on = await page.tab.evaluate(async ({ time, mark, check: fn }) => {
        window.__hf.seek(time);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await window.__mwSeq?.settled();
        return (0, eval)(fn)(mark);
      }, { time: a.t, mark: a.x.mark, check });
      if (a.kind === "late" && !on) late.push(a.x);
      if (a.kind === "early" && on) early.push(a.x);
    }
    return { looked: list.length, late, early };
  } finally { await page.close(); }
}

/** Everything the check says of a lyrics video with timed words: null for a film with none. */
export async function sungReport(dir, opts = {}) {
  if (!existsSync(join(dir, ".moworks", "lyrics", "words.json"))) return null;
  const words = timedWords(dir), marks = lyricMarks(dir);
  if (!words.length) return null;
  const missing = missingWords(words, marks);
  let looked = { looked: 0, late: [], early: [] }, failed = null;
  if (marks.length) { try { looked = await measureSung(dir, words, marks, opts); } catch (e) { failed = String(e.message).split("\n")[0]; } }
  return { words: words.length, marks: marks.length, missing, ...looked, ...(failed ? { failed } : {}) };
}
const each = (xs, f) => [...xs.slice(0, 12).map(f), ...(xs.length > 12 ? [`  - … ${xs.length - 12} more`] : [])];
/** The Review's block (moworks-qc §2b). */
export function sungLines(r) {
  if (!r) return [];
  const lines = [`Sung words (the app's look, lyric-video.md §2; text off its sung time keeps Sync at 6 at most): ${r.words} sung words, ${r.marks} elements marked data-lyric, ${r.looked ?? 0} looked at. The times are a draft, so only clear misses are named.`];
  if (!r.marks) lines.push("- No element is marked data-lyric: the app cannot compare the words with the song. Mark them.");
  lines.push(...each(r.missing, (m) => `  - Not on screen: "${m.text}" (word${m.count > 1 ? `s ${m.from}-${m.to}` : ` ${m.from}`}${m.count > 1 ? `, ${m.count} sung` : ""}, at about ${r2(m.at)} s of the song). A repeated word keeps its count.`));
  lines.push(...each(r.late, (x) => `  - Late: "${x.text}" (word ${x.n}) does not show by ${r2(x.at + SUNG.lateS)} s, sung at ${x.at} s.`));
  lines.push(...each(r.early, (x) => `  - Early: "${x.text}" (word ${x.n}) already shows ${SUNG.earlyS} s before it is sung, at ${r2(x.at - SUNG.earlyS)} s.`));
  if (r.failed) lines.push(`- Not looked at: ${r.failed}`);
  return lines;
}
/** The Tech checks entry (a warning). */
export function sungGate(r) {
  if (!r) return null;
  const findings = [
    ...(r.marks ? [] : [{ message: "The film's sung words are not marked, so the app could not compare them with the song. Ask Claude to mark them." }]),
    ...r.missing.map((m) => ({ message: `"${m.text}" is sung but not on screen${m.count > 1 ? ` (${m.count} words)` : ""}, at about ${r2(m.at)} s of the song.` })),
    ...r.late.map((x) => ({ message: `"${x.text}" shows late: it is sung at ${x.at} s and is not on screen just after.` })),
    ...r.early.map((x) => ({ message: `"${x.text}" shows early: it is on screen ${SUNG.earlyS} s before it is sung at ${x.at} s.` })),
  ].map((f) => ({ ...f, plain: f.message }));
  return { id: "G-LYRIC", blocking: false, pass: findings.length === 0, warnings: findings.length, findings, ...(r.failed ? { skipped: `Not looked at: ${r.failed}` } : {}) };
}
/** Tech checks: the sung words, or nothing for a film without timed lyrics. */
export const gateSung = async (dir, opts = {}) => sungGate(await sungReport(dir, opts));
