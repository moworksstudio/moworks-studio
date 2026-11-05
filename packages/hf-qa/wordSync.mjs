// G-SYNC: does each move of the Motion Plan that names a spoken word ("on": moworks-qc criterion 7, moworks-studio §6.5) land on it? Written from the
// idea of Showhow's cue("word") (Sirio Berati, MIT, https://github.com/sirioberati/showhow/blob/c5ce0e63eb5a08807627a2e30a45f0e03abb86e0/engine/src/engine/timeline.ts):
// a word that is not spoken is said, never passed over. Stills cannot show sync, so this is the number behind that criterion: the plan's seconds against the voice's
// words as the film plays them. A move may start on its word or land on it (its end). A voice made again moves the words, and the rows that named them show here.
// A warning, never a render stop; nothing for a film with no voice-over or with no row that names a word.
import { filmWords } from "../hf-edit/tracks.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { read as readPlan } from "../motion-plan/index.mjs";
import { wordKey } from "../voice/transcript.mjs";

export const SYNC = { nearS: 0.15, shotMarginS: 0.5 };          // about 3 frames at 24-30 fps (moworks-studio §6.5)
const r2 = (n) => Math.round(n * 100) / 100;
const keysOf = (text) => String(text ?? "").normalize("NFC").split(/\s+/).map(wordKey).filter(Boolean);

/** Where a word or phrase starts among the words: film seconds, each time it is said. */
function saidAt(words, phrase) {
  const keys = keysOf(phrase), out = [];
  if (!keys.length) return out;
  for (let i = 0; i + keys.length <= words.length; i++) if (keys.every((k, n) => wordKey(words[i + n].text) === k)) out.push(words[i].start);
  return out;
}

/** The rows that name a word against the words: { named, moves, off: [{ shot, name, on, at, word, by }], unsaid: [{ shot, name, on }] }. moves: the rows that could name one. */
export function movesOnWords(shots, plan, words) {
  const out = { named: 0, moves: 0, off: [], unsaid: [] };
  for (const s of (shots ?? []).filter((x) => x.start != null && x.duration)) {
    const here = (words ?? []).filter((w) => w.end > s.start - SYNC.shotMarginS && w.start < s.start + s.duration + SYNC.shotMarginS);
    for (const m of plan?.shots?.find((x) => x.shot === s.number)?.motions ?? []) {
      if (["entrance", "emphasis", "text"].includes(m.type)) out.moves++;
      if (!m.on) continue;
      out.named++;
      const name = m.name ?? m.target, from = s.start + (m.start ?? 0), to = m.duration ? from + m.duration : from;
      const said = saidAt(here, m.on);
      if (!said.length) { out.unsaid.push({ shot: s.number, name, on: m.on }); continue; }
      const gap = (t) => Math.min(Math.abs(from - t), Math.abs(to - t));
      const word = said.reduce((a, b) => (gap(b) < gap(a) ? b : a));
      if (gap(word) > SYNC.nearS) out.off.push({ shot: s.number, name, on: m.on, at: r2(from), word: r2(word), by: r2(gap(word)) });
    }
  }
  return out;
}

/** Everything the check says of a film: null with no voice-over words or no Motion Plan. */
export async function syncReport(dir) {
  const words = filmWords(dir);
  if (!words?.length) return null;
  const mp = readPlan(dir);
  if (!mp.exists || mp.error || !mp.plan.shots?.length) return null;
  const r = await readShots(dir);
  return movesOnWords(placedShots(r.shots, r.root?.duration), mp.plan, words);
}

const offText = (x) => `Shot ${x.shot}: "${x.name}" moves at ${x.at} s, ${x.by} s away from "${x.on}" (said at ${x.word} s)`;
const unsaidText = (x) => `Shot ${x.shot}: "${x.name}" is planned on "${x.on}", which is not said in this shot`;

/** The Review's block (moworks-qc criterion 7). */
export function syncLines(r) {
  if (!r) return [];
  if (!r.named) return [`Moves on words (the app's measure): no row of docs/MOTION-PLAN.json names its word ("on"), so sync is not measured: ${r.moves} entrance, emphasis and text rows could. Name the word of each row that lands on one.`];
  const lines = [`Moves on words (the app's measure against the voice, within ${SYNC.nearS} s): ${r.named} rows name their word, of ${r.moves} entrance, emphasis and text rows.`];
  for (const x of r.off.slice(0, 20)) lines.push(`- ${offText(x)}. Move it onto the word in the film and in the plan.`);
  for (const x of r.unsaid.slice(0, 20)) lines.push(`- ${unsaidText(x)}. Name a word the voice says here.`);
  if (!r.off.length && !r.unsaid.length) lines.push("- All of them land on their word.");
  return lines;
}

/** The Tech checks entry (a warning); null when no row names a word. */
export async function gateSync(dir) {
  let r;
  try { r = await syncReport(dir); }
  catch (e) { return { id: "G-SYNC", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The check of the moves against the voice could not run: ${String(e.message ?? e).split("\n")[0]}` }] }; }
  if (!r?.named) return null;
  // one warning a kind, each move listed inside it (owner #1098, T39-12: five lines of one kind)
  const all = [...r.off.map(offText), ...r.unsaid.map(unsaidText)];
  if (!all.length) return { id: "G-SYNC", blocking: false, pass: true, warnings: 0, findings: [] };
  const group = (xs, what) => { if (!xs.length) return null; const line = xs.length === 1 ? `${xs[0]}. Ask Claude to move it onto the word.` : `${xs.length} ${what}: ${xs.slice(0, 2).join("; ")}${xs.length > 2 ? "; …" : ""}. Ask Claude to move them onto their words.`; return { severity: "warning", count: xs.length, message: line, plain: line, places: xs }; };
  const findings = [group(r.off.map(offText), "moves are off their words"), group(r.unsaid.map(unsaidText), "moves name a word the voice never says")].filter(Boolean);
  return { id: "G-SYNC", blocking: false, pass: false, warnings: findings.length, findings };
}
