// Storyboard boards: Claude writes three options as HyperFrames boards (boards/A|B|C/STORYBOARD.md + a posed index.html; a
// HyperFrames or General board poses each frame at its own film seconds as HF's storyboard.md says, a board of the other authors' styles
// one second per frame, as their rules say); the app takes one still per frame at the film's own size with HyperFrames' snapshot, keeps every round
// (boards/rounds/R1, R2…: the stills, HF's contact sheet and a copy of the two files; nothing is deleted), and gathers a round into one PDF
// the user can send to a client. A round is new when any option's files changed since the last one; an option that did not change keeps
// its stills (copied, not taken again).
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapOnceMore, snapshotAtAsync, STILL_IDLE_MS, STILLS_BUSY } from "../hf-qa/cli.mjs";
import { tile } from "../hf-qa/qc.mjs";
import { boardFonts } from "./finalize.mjs";
import { stillsProblem } from "./boardCheck.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { stillSeconds } from "./shots.mjs";

// one option at first, one more each time the user asks (two at a time from "Make two more options"); C stays for projects made with three
export const OPTIONS = ["A", "B", "C", "D", "E", "F", "G", "H"];
// a revision of an option from the user's feedback: the same letter and its number,
// "B2 · revised from B", then "B3 · revised from B2"; every option its own folder boards/<id>/, never written over
export const OPTION_ID = /^([A-H])(\d*)$/;
export const isOption = (x) => /^[A-H]([2-9]|[1-9]\d+)?$/.test(String(x ?? ""));          // A, B2, C13; never "B1" or "B02"
const optionKey = (o) => { const m = OPTION_ID.exec(o); return m ? OPTIONS.indexOf(m[1]) * 1000 + (Number(m[2]) || 1) : 1e9; };
/** The option folders under a boards folder (A, B, B2…), in order: by letter, then revision. */
export function optionIds(folder) {
  let names = []; try { names = readdirSync(folder); } catch { return []; }
  return names.filter((n) => isOption(n) && statSync(join(folder, n)).isDirectory()).sort((a, b) => optionKey(a) - optionKey(b));
}
/** The option's own name from its heading ("# Option A · "Mảnh giấy vàng"" → Mảnh giấy vàng; B and B2 once showed only
 *  "Option B" while the chat called it "Đánh thức"), or "". */
export function optionName(heading) {
  const rest = String(heading ?? "").replace(/^Option\s+[A-Z]\d*\s*/i, "").replace(/[·:—–-]?\s*revised from Option\s+[A-Z]\d*\s*$/i, "")
    .replace(/^[·:—–-]\s*/, "").trim();
  return rest.replace(/^["“'‘](.*)["”'’]$/, "$1").trim();
}
/** What the user reads for an option: "Option B2 · revised from Option B" (the UI words it, and the chat). */
export const optionLabel = (o, from = null) => (from ? `Option ${o} · revised from Option ${from}` : `Option ${o}`);
/** A revision's own record (boards/<id>/REVISION.json): { from, panels (the noted panels, to draw again), general (a note for the whole
 *  board), revised (the panels drawn again, once its stills are taken), pending (copied, not revised yet), at, taskId }, or null. */
export function revisionOf(dir, option) {
  try { return JSON.parse(readFileSync(join(dir, BOARDS, option, "REVISION.json"), "utf8")); } catch { return null; }
}
/** The revision Claude has not drawn yet (copied, then stopped to ask about the notes), or null. */
export const pendingRevision = (dir) => optionIds(join(dir, BOARDS)).find((o) => revisionOf(dir, o)?.pending) ?? null;
/** The newest revision drawn (by when it was made), or null. */
export function newestRevision(dir) {
  return optionIds(join(dir, BOARDS)).map((o) => ({ o, rv: revisionOf(dir, o) })).filter((x) => x.rv && !x.rv.pending).sort((a, b) => String(b.rv.at).localeCompare(String(a.rv.at)))[0] ?? null;
}
/** The round where an option first showed as it is now (its board's hash), oldest first: when it was done, and by which task. */
export const firstRoundOf = (rounds, option, hash) => (hash ? rounds.find((rd) => rd.options.some((x) => x.option === option && x.hash === hash && x.stills?.length)) ?? null : null);
/** The next letter for a new, different option ("Make another option"). */
export function nextLetter(dir) {
  const used = new Set(optionIds(join(dir, BOARDS)).map((o) => o[0]));
  return OPTIONS.find((l) => !used.has(l)) ?? null;
}
/** The next revision of an option: B → B2, B2 → B3 (the highest of its letter + 1). */
export function nextRevision(dir, option) {
  const letter = String(option)[0], ids = optionIds(join(dir, BOARDS)).filter((o) => o[0] === letter);
  return `${letter}${Math.max(1, ...ids.map((o) => Number(o.slice(1)) || 1)) + 1}`;
}
/** The user's feedback on an option: "@Panel_N: note" lines (one panel each; a panel may have several) and the rest, a note for
 *  the whole board. { panels: [{ n, text }], general: "text" }. */
export function parseFeedback(text) {
  const panels = [], general = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = /^\s*@Panel_(\d+)\s*[:：-]?\s*(.*)$/i.exec(line);
    if (m) panels.push({ n: Number(m[1]), text: m[2].trim() });
    else if (line.trim()) general.push(line.trim());
  }
  return { panels, general: general.join("\n") };
}
/** Make the revision of an option from the user's feedback: boards/<from>/ copied whole to boards/<next>/ (every panel without a
 *  note stays as it is: Claude draws only the noted ones), with its REVISION.json. Returns { option, from, panels, general }. */
export function makeRevision(dir, from, feedback, { taskId = null } = {}) {
  if (!isOption(from) || !existsSync(join(dir, BOARDS, from, "STORYBOARD.md"))) throw Object.assign(new Error(`No option ${from} to revise`), { code: "NOT_FOUND" });
  const option = nextRevision(dir, from), fb = parseFeedback(feedback);
  cpSync(join(dir, BOARDS, from), join(dir, BOARDS, option), { recursive: true, filter: (s) => !/[\\/](REVISION\.json|node_modules)$/.test(s) });
  const panels = [...new Set(fb.panels.map((p) => p.n))].sort((a, b) => a - b);
  writeFileSync(join(dir, BOARDS, option, "REVISION.json"), JSON.stringify({ from, panels, general: fb.general || null, notes: fb.panels,
    pending: true, at: new Date().toISOString(), ...(taskId ? { taskId } : {}) }, null, 2));
  return { option, from, panels, general: fb.general };
}
const BOARDS = "boards", ROUNDS = "boards/rounds";
const readText = (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } };
const hashOf = (...xs) => createHash("sha256").update(xs.map((x) => x ?? "").join("\u0000")).digest("hex").slice(0, 16);
const rel = (...p) => p.join("/");

/** The frames of a board: its "## Frame N — title" blocks. */
export function boardFrames(md) {
  return [...String(md ?? "").matchAll(/^##\s*Frame\s*(\d+)\s*[—:-]?\s*(.*)$/gim)].map((m) => ({ n: Number(m[1]), title: m[2].trim() }));
}
/** The option's idea line ("- idea: …") and its heading ("# Option A: …"). */
function optionInfo(md) {
  const heading = /^#\s+(.+)$/m.exec(md ?? "")?.[1]?.trim() ?? "";
  // a board made before its heading carried the name names it in its front matter (`option: B "Đánh thức"`) or in the
  // first bold quote of its text (`**"Đánh thức".**`)
  const older = /^option:\s*[A-Z]\d*\s*[·:—-]?\s*["“](.+?)["”]\s*$/m.exec(md ?? "")?.[1] ?? /^\*\*["“](.+?)["”]\.?\*\*/m.exec(md ?? "")?.[1] ?? "";
  return { heading, idea: /^-\s*idea:\s*(.+)$/im.exec(md ?? "")?.[1]?.trim() ?? "", name: optionName(heading) || older.trim() };
}

/** The options Claude has written now: [{ option, frames, hash, ready }]. */
// A board drawn by code: its own scripts (an anidoodle board's page.ts, a code board's .js) and, for an anidoodle board, the film's own
// modules it imports (anidoodle/*.ts) are part of what its stills show (once Claude fixed the sun, the hills and the grass in
// anidoodle/*.ts, the board's hash did not change and board_stills handed back the old stills). What the app makes there is left out.
// film.js is the app's only when the board has a source it is bundled from (page.ts, a .tsx); a code board Claude
// wrote as film.js itself (a 1920s Silent Film board) is its own code: left out, the redrawn frame 3 kept the old still.
const CODE = /\.(ts|tsx|js|mjs|css)$/i, MADE = new Set(["film.js", "kit", "assets", "node_modules"]);
function codeOf(dir, option) {
  const parts = [];
  let top = []; try { top = readdirSync(join(dir, BOARDS, option)); } catch { /* no board */ }
  const bundled = top.some((n) => /\.tsx?$/i.test(n));
  const walk = (d, rel) => {
    let names = []; try { names = readdirSync(d).sort(); } catch { return; }
    for (const n of names) {
      if (n.startsWith(".") || (!rel.includes("/") && MADE.has(n) && (n !== "film.js" || bundled))) continue;
      const p = join(d, n);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, `${rel}${n}/`); else if (CODE.test(n)) parts.push(`${rel}${n}\n${readText(p)}`);
    }
  };
  walk(join(dir, BOARDS, option), "");
  if (existsSync(join(dir, BOARDS, option, "page.ts"))) walk(join(dir, "anidoodle"), "anidoodle/");
  return parts.join("\u0001");
}

export function currentOptions(dir, { pending = false } = {}) {
  return optionIds(join(dir, BOARDS)).filter((o) => pending || !revisionOf(dir, o)?.pending).map((o) => {
    const md = readText(join(dir, BOARDS, o, "STORYBOARD.md")), html = readText(join(dir, BOARDS, o, "index.html"));
    return { option: o, ready: !!(md && html), frames: boardFrames(md), ...optionInfo(md), hash: md && html ? hashOf(md, html.replace(/<style data-mw="fonts">[\s\S]*?<\/style>\s*/g, ""), codeOf(dir, o)) : null };          // the app's font block is not a change
  }).filter((x) => x.ready || x.frames.length);
}

/** Every round the app has taken, newest last: [{ id, at, options: [{ option, heading, idea, frames, stills: [paths], sheet }] }]. */
export function listRounds(dir) {
  const root = join(dir, ROUNDS);
  if (!existsSync(root)) return [];
  const own = (o) => revisionOf(dir, o);          // a round that recorded no revised panels shows the revision's own
  const rounds = readdirSync(root).filter((n) => /^R\d+$/.test(n)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map((id) => {
    let info = {}; try { info = JSON.parse(readFileSync(join(root, id, "round.json"), "utf8")); } catch { /* an old round */ }
    const options = optionIds(join(root, id)).map((o) => {
      const sd = join(root, id, o, "stills");
      const files = existsSync(sd) ? readdirSync(sd) : [];
      const md = readText(join(root, id, o, "STORYBOARD.md"));
      // the app's own sheets, 3 × 3 frames each; older rounds have HyperFrames' contact sheet only
      const sheets = files.filter((n) => /^sheet-\d+\.jpg$/i.test(n)).sort().map((n) => rel(ROUNDS, id, o, "stills", n));
      const rv = info.revisions?.[o] ?? null;
      return { option: o, label: optionLabel(o, rv?.from), ...(rv ? { from: rv.from, revised: (rv.revised?.length ? rv.revised : (own(o)?.revised?.length ? own(o).revised : rv.panels ?? own(o)?.panels ?? [])).filter((k) => k <= boardFrames(md).length) } : {}), ...optionInfo(md), frames: boardFrames(md), hash: info.hashes?.[o] ?? null,
        stills: files.filter((n) => /^frame-.*\.png$/i.test(n)).sort().map((n) => rel(ROUNDS, id, o, "stills", n)),
        sheets, sheet: sheets[0] ?? (files.includes("contact-sheet.jpg") ? rel(ROUNDS, id, o, "stills", "contact-sheet.jpg") : null) };
    });
    return { id, at: info.at ?? statSync(join(root, id)).mtime.toISOString(), picked: info.picked ?? null, by: info.by ?? null, taskId: info.taskId ?? null, options,
      partial: !existsSync(join(root, id, "round.json")) };          // written last: without it the stills may still be being taken
  });
  // every option's name: its heading's, else (a revision) the name of the option it was revised from
  const named = new Map();
  for (const rd of rounds) for (const o of rd.options) { o.name ||= optionName(o.heading); if (o.name) named.set(o.option, o.name); }
  for (const rd of rounds) for (const o of rd.options) if (!o.name && o.from) o.name = named.get(o.from) ?? "";
  // a later round that recorded no revised panels (after "Make another option") shows the last round's that did
  const marks = new Map();
  for (const rd of rounds) {
    let info = {}; try { info = JSON.parse(readFileSync(join(root, rd.id, "round.json"), "utf8")); } catch { /* none */ }
    for (const o of rd.options) {
      if (!o.from) continue;
      // a later take that recorded fewer (R4 [5, 9, 10], R5 [5, 9]) keeps the earlier ones too: the panels drawn again add up
      const all = [...new Set([...(marks.get(o.option) ?? []), ...(info.revisions?.[o.option]?.revised?.length ? o.revised : [])])].sort((a, b) => a - b);
      if (all.length) { marks.set(o.option, all); o.revised = all; }
    }
  }
  return rounds;
}

/** The rounds the user sees. A folder under boards/rounds/ (R1, R2…) is a draft: Claude's own checks, or the dialog's stills of the
 *  same options. The user's rounds are the sets of options as they arrived: the first set is Round 1, each "Make two more options" the next.
 *  An option belongs to the Claude task (or, without one, the draft) where it first appeared. `shown` is the draft whose stills the dialog
 *  shows. Returns [{ no, at, letters }], oldest first. */
export function ownerRounds(all, shown) {
  if (!shown) return [];
  const groups = [];
  for (const o of shown.options) {
    const i = Math.max(0, all.findIndex((x) => x.options.some((y) => y.option === o.option)));
    const first = all[i] ?? shown;
    const key = first.taskId ?? first.id;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push(g = { key, i, at: first.at, letters: [] });
    g.letters.push(o.option);
  }
  return groups.sort((a, b) => a.i - b.i).map((g, n) => ({ no: n + 1, at: g.at, letters: g.letters }));
}
/** The user's round number of an option in a draft (Round 1, 2…), or null. */
export function ownerRoundOf(dir, draftId, letter) {
  const all = listRounds(dir);
  return ownerRounds(all, all.find((x) => x.id === draftId)).find((g) => g.letters.includes(letter))?.no ?? null;
}

const pngSizeOf = (f) => { try { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } catch { return { w: 16, h: 9 }; } };
/** The option's sheets: 3 × 3 frames per sheet, its long edge about 1500 px (a second sheet past 9 frames), in frame order,
 *  left to right, top to bottom. Claude reads these, not the single stills. Returns the sheet paths written. */
export async function writeSheets(stillsDir) {
  for (const n of readdirSync(stillsDir)) if (/^sheet-\d+\.jpg$/i.test(n)) unlinkSync(join(stillsDir, n));
  const files = readdirSync(stillsDir).filter((n) => /^frame-.*\.png$/i.test(n)).sort().map((n) => join(stillsDir, n));
  if (!files.length) return [];
  const { w, h } = pngSizeOf(files[0]);
  const panel = 494;          // 3 panels and the 6 px gaps: about 1500 px on the long edge
  const width = w >= h ? panel : Math.max(2, Math.round((panel * w) / h / 2) * 2);
  const out = [];
  for (let i = 0; i < files.length; i += 9) {
    const chunk = files.slice(i, i + 9);
    const f = join(stillsDir, `sheet-${out.length + 1}.jpg`);
    await tile(chunk, f, { width, cols: Math.min(3, chunk.length) });
    out.push(f);
  }
  return out;
}

/** Take the stills of the options as they are now. Returns { round, fresh, failed: [{ option, message }], notes: [{ option, message }] }; fresh = a new round was made.
 *  The stills stopped twice on a busy computer: the new round is removed and it throws STILLS_BUSY (code "STILLS_BUSY").
 *  retake: { option, frames: [n…] } takes again only those frames of that option (after a fix, only what changed); the option's
 *  other frames and the other options keep the last round's stills. onProgress({ done, total }): the frames taken so far. */
// filmTimes: each still at its frame's own seconds in STORYBOARD.md (HF's storyboard.md); otherwise, or when a frame has no length,
// still k at k - 0.5 s (a board posed one frame per second)
export async function takeStills(dir, { signal = null, force = false, by = "owner", taskId = null, retake = null, onProgress = null, snap = snapshotAtAsync, filmTimes = false } = {}) {
  // Claude's own call ends a revision's "being made": it is the user's to see from now on
  if (by === "claude") for (const o of optionIds(join(dir, BOARDS))) { const rv = revisionOf(dir, o); if (rv?.pending) writeFileSync(join(dir, BOARDS, o, "REVISION.json"), JSON.stringify({ ...rv, pending: false }, null, 2)); }
  const cur = currentOptions(dir).filter((x) => x.ready);
  if (!cur.length) throw Object.assign(new Error("No board yet: boards/A, B and C need a STORYBOARD.md and an index.html"), { code: "INVALID" });
  const rounds = listRounds(dir), last = rounds.at(-1);
  // a retake Claude asked for (the frames it changed) is always taken: its own words are the change, whatever the hash says
  if (!force && !retake && last && cur.every((x) => last.options.some((y) => y.option === x.option && y.hash === x.hash && y.stills.length)) && last.options.length === cur.length) return { round: last, fresh: false, failed: [], notes: [] };
  const id = `R${(rounds.length ? Number(last.id.slice(1)) : 0) + 1}`;
  const failed = [], notes = [];          // notes: said to Claude, not a failure (a few one-colour stills)
  // what each option needs: nothing (unchanged), all its frames, or only the frames asked for again
  const work = cur.map((x) => {
    const same = !force && !(retake && retake.option === x.option) && last?.options.find((y) => y.option === x.option && y.hash === x.hash && y.stills.length);
    const n = Math.max(1, Math.min(40, x.frames.length || 1));
    // only the frames asked for, the rest from the last round (HF names a still by its place in the list: renamed to the frame's own name)
    let prev = last?.options.find((y) => y.option === x.option && y.stills.length);
    // a revision's first take: its source's stills, the panels with a note (or the ones Claude names) shot again
    const rv = revisionOf(dir, x.option);
    const src = !prev && rv?.from ? [...rounds].reverse().map((r) => ({ r, o: r.options.find((y) => y.option === rv.from && y.stills.length) })).find((z) => z.o) : null;
    if (src) prev = { ...src.o, round: src.r.id };
    const asked = retake && retake.option === x.option ? retake.frames : src ? rv.panels : null;
    const only = asked && prev ? [...new Set((asked ?? []).map(Number).filter((k) => k >= 1 && k <= n))] : null;
    return { x, same, n, only, prev, rv, count: same ? 0 : only?.length ?? n };
  });
  const total = work.reduce((s, w) => s + w.count, 0);
  let done = 0;
  onProgress?.({ done, total });
  for (const { x, same, n, only, prev, rv, count } of work) {
    const out = join(dir, ROUNDS, id, x.option);
    mkdirSync(join(out, "stills"), { recursive: true });
    for (const f of ["STORYBOARD.md", "index.html"]) copyFileSync(join(dir, BOARDS, x.option, f), join(out, f));
    if (same) {           // unchanged since the last round: its stills, not new ones
      const from = join(dir, ROUNDS, last.id, x.option, "stills");
      for (const n of readdirSync(from)) copyFileSync(join(from, n), join(out, "stills", n));
      continue;
    }
    try { await boardFonts(dir, `${BOARDS}/${x.option}/index.html`); } catch { /* offline or no font store: the stills show the fallback */ }
    copyFileSync(join(dir, BOARDS, x.option, "index.html"), join(out, "index.html"));
    if (only) { const from = join(dir, ROUNDS, prev.round ?? last.id, prev.round ? rv.from : x.option, "stills"); for (const f of readdirSync(from)) if (/^frame-.*\.png$/i.test(f)) copyFileSync(join(from, f), join(out, "stills", f)); }
    if (only && !only.length) { done += count; continue; }          // a revision with no panel to draw again: its source's stills as they are
    const at = filmTimes ? await stillSeconds(join(dir, BOARDS, x.option, "STORYBOARD.md")).catch(() => null) : null;
    const sec = at?.length === n ? at : Array.from({ length: n }, (_, i) => i + 0.5);
    const times = only?.length ? only.map((k) => sec[k - 1]) : sec;
    const shotDir = only?.length ? join(out, "stills", ".retake") : join(out, "stills");
    mkdirSync(shotDir, { recursive: true });
    // HF's snapshot serves the board's own folder as its web root, so "../../assets/…" would land on boards/X/assets/: for the snapshot
    // only, that path is a junction to the project's assets (removed right after; never followed by a delete)
    const link = join(dir, BOARDS, x.option, "assets");
    let linked = false;
    if (!existsSync(link) && existsSync(join(dir, "assets"))) { try { symlinkSync(join(dir, "assets"), link, "junction"); linked = true; } catch { /* the stills show fallbacks */ } }
    let r;
    // the frames HF has written so far count as taken (the snapshot is one call per option)
    const shot = () => { try { return Math.min(count, readdirSync(shotDir).filter((f) => /\.png$/i.test(f)).length); } catch { return 0; } };
    const tick = onProgress ? setInterval(() => onProgress({ done: done + shot(), total }), 700) : null;
    // a time limit sized to the frames, a run that stalls ends after 2 min with no new still, and a stopped run takes the frames it lacks
    // once more by itself (T25: each call hung about 11.5 min and the round came back empty)
    try { r = await snapOnceMore(snap, join(dir, BOARDS, x.option), times, shotDir, { signal, idleMs: STILL_IDLE_MS }); }
    finally { if (tick) clearInterval(tick); if (linked) unlinkSync(link); }
    // stopped twice: no round of empty pictures (the dialog showed one, and Approve was on); the caller says STILLS_BUSY with a Retry
    if (r.busy) {
      rmSync(join(dir, ROUNDS, id), { recursive: true, force: true });
      throw Object.assign(new Error(STILLS_BUSY), { code: "STILLS_BUSY" });
    }
    done += count;
    onProgress?.({ done, total });
    if (only?.length) {
      for (const f of readdirSync(shotDir)) {
        const t = Number(/-at-([\d.]+)s\.png$/i.exec(f)?.[1]);
        if (!Number.isFinite(t)) continue;
        // the frame whose second it was (HF writes the second, rounded, in the name)
        const k = sec.reduce((b, s, i) => (Math.abs(s - t) < Math.abs(sec[b] - t) ? i : b), 0) + 1;
        for (const old of readdirSync(join(out, "stills"))) if (new RegExp(`^frame-${String(k - 1).padStart(2, "0")}-`).test(old)) unlinkSync(join(out, "stills", old));
        copyFileSync(join(shotDir, f), join(out, "stills", `frame-${String(k - 1).padStart(2, "0")}-at-${t}s.png`));
      }
      rmSync(shotDir, { recursive: true, force: true });
    }
    if (r.exitCode !== 0) failed.push({ option: x.option, message: r.stderrTail.filter(Boolean).join(" ").slice(0, 300) || `snapshot exit ${r.exitCode}` });
    else {          // HF says nothing when a file fails to load: one-colour stills and files the stills could not reach
      const stills = readdirSync(join(out, "stills")).filter((f) => /^frame-.*\.png$/i.test(f)).sort().map((f) => join(out, "stills", f));
      const p = stillsProblem(dir, `${BOARDS}/${x.option}`, stills);
      if (p?.failed) failed.push({ option: x.option, message: p.message });
      else if (p) notes.push({ option: x.option, message: p.message });
    }
  }
  for (const x of cur) { try { await writeSheets(join(dir, ROUNDS, id, x.option, "stills")); } catch (e) { failed.push({ option: x.option, message: `sheets: ${String(e.message).split("\n")[0]}` }); } }
  // the hashes of the boards as they are now, after the app's own edits for the stills (fonts, vendored libraries, the import map,
  // a code film's bridge): taken before them, the next opening of the dialog saw a changed board and took the stills again. The user's pick
  // goes on to the new draft while its option is still there, so a new take never drops the "Approved" mark.
  const after = new Map(currentOptions(dir).map((x) => [x.option, x.hash]));
  const pick = last?.picked && cur.some((x) => x.option === last.picked.option) ? last.picked : null;
  // the panels a revision drew again, from the newest round that recorded them, not only the last one (a round after
  // "Make another option" wrote A2's as [] and the dialog lost its "revised" marks)
  const past = listRounds(dir).filter((rd) => rd.id !== id).reverse();
  const revisedBefore = (o) => past.map((rd) => rd.options.find((x) => x.option === o && x.revised?.length)?.revised).find(Boolean)
    ?? (revisionOf(dir, o)?.revised?.length ? revisionOf(dir, o).revised : revisionOf(dir, o)?.panels) ?? [];
  const revisions = Object.fromEntries(work.filter((w) => w.rv?.from).map((w) => {
    const before = revisedBefore(w.x.option);
    return [w.x.option, { from: w.rv.from, revised: [...new Set([...before, ...(w.only ?? (w.same ? [] : w.rv.panels ?? []))])].sort((a, b) => a - b) }];
  }));
  writeFileSync(join(dir, ROUNDS, id, "round.json"), JSON.stringify({ at: new Date().toISOString(), by, ...(taskId ? { taskId } : {}),
    hashes: Object.fromEntries(cur.map((x) => [x.option, after.get(x.option) ?? x.hash])), ...(pick ? { picked: pick } : {}),
    ...(Object.keys(revisions).length ? { revisions } : {}) }, null, 2));
  // the revision's own record keeps them too, whatever later rounds write
  for (const [o, v] of Object.entries(revisions)) {
    const rv = revisionOf(dir, o);
    if (rv && v.revised.length && String(rv.revised ?? "") !== String(v.revised)) writeFileSync(join(dir, BOARDS, o, "REVISION.json"), JSON.stringify({ ...rv, revised: v.revised }, null, 2));
  }
  return { round: listRounds(dir).find((r) => r.id === id), fresh: true, failed, notes };
}

/** Record the user's pick on its round (the board stays; STORYBOARD.md is Claude's to write from it). */
export function recordPick(dir, roundId, pick) {
  const f = join(dir, ROUNDS, roundId, "round.json");
  if (!existsSync(f)) throw Object.assign(new Error("No such round"), { code: "NOT_FOUND" });
  const info = JSON.parse(readFileSync(f, "utf8"));
  info.picked = { ...pick, at: new Date().toISOString() };
  writeFileSync(f, JSON.stringify(info, null, 2));
  return info.picked;
}

// ---- one PDF of a round (or of one option): every still as a page, as JPEG (DCTDecode), at half the pixel size in points
const pngSize = (f) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const run = promisify(execFile);
/** Write the PDF; resolves its path (project-relative). option: one letter, a list of letters (one round of the user's) or all; no: the
 *  user's round number for the file name. Each still's JPEG is made by FFmpeg off the event loop (a round of 20 stills took seconds of the
 *  server's thread). */
export async function roundPdf(dir, roundId, option = null, { root, no = null } = {}) {
  const round = listRounds(dir).find((r) => r.id === roundId);
  if (!round) throw Object.assign(new Error("No such round"), { code: "NOT_FOUND" });
  const only = option == null ? null : [option].flat().map(String);
  const stills = round.options.filter((o) => !only || only.includes(o.option)).flatMap((o) => o.stills);
  if (!stills.length) throw Object.assign(new Error("This round has no stills"), { code: "INVALID" });
  const tmp = join(dir, ROUNDS, roundId, ".pdf-tmp");
  mkdirSync(tmp, { recursive: true });
  const pages = [];
  for (const [i, s] of stills.entries()) {
    const png = join(dir, ...s.split("/")), jpg = join(tmp, `p${i}.jpg`);
    if (!existsSync(jpg) || statSync(jpg).mtimeMs < statSync(png).mtimeMs) await run(ffmpegExe(root), ["-v", "error", "-y", "-i", png, "-q:v", "3", jpg], { windowsHide: true });
    pages.push({ ...pngSize(png), data: readFileSync(jpg) });
  }
  const name = `storyboard-${only?.length ? `option-${only.join("-")}` : `options-${round.options.map((o) => o.option).join("-")}`}.pdf`;          // no "round" in the file name
  const out = join(dir, ROUNDS, roundId, name);
  writeFileSync(out, pdfOf(pages));
  return rel(ROUNDS, roundId, name);
}

function pdfOf(pages) {
  const parts = [], offsets = [];
  let size = 0;
  const push = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, "latin1"); parts.push(buf); size += buf.length; };
  const obj = (n, body, stream = null) => {
    offsets[n] = size;
    push(`${n} 0 obj\n${body}\n`);
    if (stream) { push("stream\n"); push(stream); push("\nendstream\n"); }
    push("endobj\n");
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const n = 3 + i * 3, W = p.w / 2, H = p.h / 2;
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${n + 1} 0 R >> >> /Contents ${n + 2} 0 R >>`);
    obj(n + 1, `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.data.length} >>`, p.data);
    obj(n + 2, `<< /Length ${content.length} >>`, Buffer.from(content, "latin1"));
  });
  const count = 3 + pages.length * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(parts);
}
