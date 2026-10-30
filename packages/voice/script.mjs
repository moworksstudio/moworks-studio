// The words to read for a voice-over that Claude wrote, for the Voice screen's Script box.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SCRIPT_FILE = "VOICEOVER.md";
export function scriptDraft(dir) {
  const read = (f) => { try { return readFileSync(join(dir, f), "utf8").replace(/^﻿/, ""); } catch { return ""; } };
  const own = read(SCRIPT_FILE).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^#/.test(l)).map((l) => l.replace(/^(\d+[.)]|[-*•])\s+/, ""));
  if (own.length) return { text: own.join("\n"), from: SCRIPT_FILE };
  const lines = read("BRIEF.md").split(/\r?\n/);
  const at = lines.findIndex((l) => /(script to read|words to read|voice-?over script|lời đọc|kịch bản đọc)/i.test(l));
  if (at < 0) return null;
  const out = [];
  let kind = null;          // the list's own marker (numbered or a bullet) and indent: the brief's next point is not a line to read
  for (const l of lines.slice(at + 1)) {
    const m = /^(\s*)(\d+[.)]|[-*•])\s+(.+)$/.exec(l);
    if (!m) { if (out.length) break; continue; }
    const k = `${m[1].length}:${/\d/.test(m[2]) ? "n" : "b"}`;
    if (kind && k !== kind) break;
    kind = k;
    out.push(m[3].trim());
  }
  return out.length ? { text: out.join("\n"), from: "BRIEF.md" } : null;
}

// Test 24: the owner's brief ended on "Kịch bản lời đọc:" and 12 lines; VOICEOVER.md held the first 9 ("the rest is told by typing"),
// BRIEF.md called it "the brief's script verbatim", and nobody was asked. The app reads the script block itself and holds the words to
// read against it.
const SCRIPT_HEAD = /^(?:[-*_#>\s]*)(?:(?:the\s+)?(?:voice-?\s?over|narration|vo)(?:\s+script)?|script(?:\s+to\s+read)?|words\s+to\s+read|kịch\s+bản(?:\s+lời)?(?:\s+đọc)?|lời\s+(?:đọc|bình|dẫn|kể)(?:\s+nguyên\s+văn)?)\s*[*_]*\s*[:：]\s*[*_]*\s*$/i;
const unquote = (l) => l.replace(/^(\d+[.)]|[-*•])\s+/, "").replace(/^["“”'‘’«»]+|["“”'‘’«»]+$/g, "").trim();
/** The voice-over script the owner wrote in the brief: the lines under a heading line of its own ("Kịch bản lời đọc:", "Lời đọc:",
 *  "Voice-over script:", "Narration:"), up to the first blank line after them. [] when the brief has none (a line that goes on after the
 *  colon is an instruction, not the script). */
export function briefScript(text) {
  const lines = String(text ?? "").normalize("NFC").split(/\r?\n/);
  const at = lines.findIndex((l) => l.trim().length <= 48 && SCRIPT_HEAD.test(l.trim()));
  if (at < 0) return [];
  const out = [];
  for (const l of lines.slice(at + 1)) {
    if (!l.trim()) { if (out.length) break; continue; }
    const u = unquote(l.trim());
    if (u) out.push(u);
  }
  return out;
}
/** Words only, for holding two texts against each other: case, marks of punctuation, quotes and spacing aside (never the letters' own
 *  Vietnamese marks). */
const plain = (s) => ` ${String(s ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
/** The owner's script against the words Claude wrote to read (VOICEOVER.md): { total, left: [the script's lines not read as written] },
 *  null when the brief has no script, the film has no words to read yet, or every line is there word for word. A line counts as read when
 *  each of its sentences is in the words to read, in its own words (a line split in two, or punctuation changed, still counts). */
export function scriptGap(dir, briefText) {
  const script = briefScript(briefText);
  if (script.length < 2) return null;
  let vo = "";
  try { vo = readFileSync(join(dir, SCRIPT_FILE), "utf8"); } catch { return null; }
  const words = plain(vo.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join(" "));
  if (!words.trim()) return null;
  const left = script.filter((line) => line.split(/(?<=[.!?…])\s+/).map(plain).filter((s) => s.trim()).some((s) => !words.includes(s)));
  return left.length ? { total: script.length, left } : null;
}

