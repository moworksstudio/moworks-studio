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

