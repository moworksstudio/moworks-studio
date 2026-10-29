// The Review sheet in short: from Claude's QC-REVIEW.md, only the final score, the scores still under the bar of 8 and the problems Claude left as they are, in
// plain words with their time. The file is Claude's own prose (moworks-qc §4), so this reads it loosely: the last "## Round" section, its
// "Scores" line, and a "Worst… / Left… / Still off… / Open…" list that the round did not fix.

// the seven scores in the user's words
export const SCORE_WORDS = { hook: "The opening", phone: "Reading on a phone", motion: "Motion", variety: "Variety", composition: "Framing", brand: "Brand", sync: "Timing to the sound" };
const BAR = 8;

/** Claude's notes made plain: no file names, section marks, pixel sizes or engine names; the first clause only. */
export function plainLine(s) {
  let x = String(s ?? "").replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "");
  x = x.replace(/\s*\((?:[^()]*?(?:§|\.md|\.json|\bpx\b|HyperFrames|\bHF\b|WCAG|data-[\w-]+|board px)[^()]*)\)/gi, "");
  x = x.replace(/\b(?:HyperFrames|HF)(?:'s?)?\s+/gi, "").replace(/\bWCAG\s*(?:AA\s*)?/gi, "");
  const parts = x.split(/\s+[—–]\s+|;\s+/);
  x = parts[0];
  if (parts[1] && /^[\d.,\s–\-s()shot]+$/i.test(x)) x += ": " + parts[1];          // "14.25–16.5 s — the hand holds still": the time and what
  x = x.replace(/\*\*/g, "").replace(/`/g, "").trim();
  if (x.length > 160) x = x.replace(/\s*\([^()]*\)?\s*$/, "").replace(/\s*\([^()]*\)/g, "");          // a long note: its asides go
  return x ? x.charAt(0).toUpperCase() + x.slice(1).replace(/[.:,;]+\s*$/, "") + "." : "";
}

/** { score, scores: [[key, n]], low: [[words, n]], left: [line] } from QC-REVIEW.md, or null without a review. */
export function qcSummary(text) {
  const md = String(text ?? "");
  if (!md.trim()) return null;
  const score = [...md.matchAll(/Final score:\s*\**\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/gi)].at(-1)?.[1];
  const parts = md.split(/^##\s+Round\b.*$/im);
  const last = parts.at(-1);
  // the last Scores line of the last round, with its wrapped lines (up to a blank line)
  const sm = [...last.matchAll(/^Scores\b[^\n]*(?:\n(?!\s*\n)[^\n]*)*/gim)].at(-1)?.[0] ?? [...md.matchAll(/^Scores\b[^\n]*/gim)].at(-1)?.[0] ?? "";
  const scores = [];
  for (const [, name, n] of sm.matchAll(/\b(hook|phone|motion|variety|composition|brand|sync)\b[^\d\n]{0,12}?(\d+(?:[.,]\d+)?)/gi)) {
    const k = name.toLowerCase();
    if (!scores.some(([x]) => x === k)) scores.push([k, Number(n.replace(",", "."))]);
  }
  const low = scores.filter(([, n]) => n < BAR).map(([k, n]) => [SCORE_WORDS[k], n]);
  // a list of what is still off: its heading says so, or the round changed nothing after it
  const lines = last.split(/\r?\n/);
  const unchanged = /changed:\s*nothing|no fix|nothing fixed|no change|scored as seen|final look/i.test(last);
  const left = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^\s*(worst|left|still off|open|not fixed)\b([^:]*):\s*(.*)$/i);
    if (!h) continue;
    const stays = /left|open|still|unchanged|not fixed|remain/i.test(h[1] + h[2]) || unchanged;
    if (!stays) continue;
    if (h[3].trim()) left.push(...h[3].split(/;\s+(?=\d)/).map(plainLine));          // "Worst three (unchanged): 5.25 s …; 7.6 s …"
    for (let j = i + 1; j < lines.length && /^\s*(?:\d+[.)]|[-*•])\s+/.test(lines[j]); j++) left.push(plainLine(lines[j]));
  }
  // notes about the review itself (the checker, the fresh eyes, a placeholder track) are not about the picture
  const aboutFilm = (l) => l && !/\b(lint|fresh eyes|sub-?compositions?|placeholder|bpm)\b/i.test(l);
  return { score: score ?? null, scores, low, left: [...new Set(left.filter(aboutFilm))].slice(0, 6) };
}
