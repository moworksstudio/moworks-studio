// The app's own documents of a film live in docs/: Claude's notes, the assets analysis, the credits, the Review (its text and its data),
// the voice-over's words, the cast and the Motion Plan. HyperFrames' own files stay at the root where its skills and tools read them
// (index.html, hyperframes.json, frame.md, BRIEF.md, STORYBOARD.md, SPEC.md, SCRIPT.md, transcript.json), and so does a style source's
// own file (Lemo-Opuscar's FACTS.md).
// Films made before keep these files at the root until they are opened (layout.mjs, LAYOUT_VERSION 3 moves them); a reader finds them
// at either place meanwhile: docs/ first, then the root. A file Claude still writes at the root goes into docs/ after its task.
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DOC_DIR = "docs";
export const DOC_NAMES = ["NOTES.md", "ASSETS.md", "CREDITS.md", "QC-REVIEW.md", "QC-REVIEW.json", "BRAND-CHECK.json", "VOICEOVER.md", "CHARACTERS.json", "MOTION-PLAN.json", "BEATMAP.md", "BEATMAP.json", "RESEARCH.md"];
/** Where a document goes, as a project path ("docs/NOTES.md"); the name unchanged when it is not one of the app's documents. */
export const docRel = (name) => (DOC_NAMES.includes(name) ? `${DOC_DIR}/${name}` : name);

/** The document's file in a project: docs/<name> when it is there, else the root's when a film not moved yet has it there, else
 *  docs/<name> (where a new one is written). */
export function docPath(dir, name) {
  if (!DOC_NAMES.includes(name)) return join(dir, name);
  const d = join(dir, DOC_DIR, name);
  if (existsSync(d)) return d;
  const r = join(dir, name);
  return existsSync(r) ? r : d;
}
/** The same as a project path ("docs/NOTES.md", or "NOTES.md" for a film not moved yet): what Claude is told to read. */
export function docRelIn(dir, name) {
  const p = docPath(dir, name);
  return p === join(dir, name) ? name : docRel(name);
}
/** Write a document where it lives (docs/ for a new one), through a temporary file. Returns the file written. */
export function writeDoc(dir, name, text) {
  const f = docPath(dir, name);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f + ".tmp", text); renameSync(f + ".tmp", f);
  return f;
}
/** The document's text, "" when it has none. */
export function readDoc(dir, name) {
  try { return readFileSync(docPath(dir, name), "utf8"); } catch { return ""; }
}

// Notes and credits are written a line at a time: a copy at the root (Claude wrote there from habit) adds its new lines to docs/'s.
// Any other document is written whole: the newer file is the document, the older is kept beside it as <name>.old.
const MERGED = new Set(["NOTES.md", "CREDITS.md"]);
const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return 0; } };
function mergeLines(base, extra) {
  const have = new Set(base.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const add = extra.split(/\r?\n/).filter((l) => l.trim() && !have.has(l.trim()));
  if (!add.length) return base;
  return `${base.replace(/\s*$/, "")}\n\n${add.join("\n")}\n`;
}

/**
 * Move the app's documents from the project root into docs/: { moved: [[from, to]], failed: [{ path, error }] }. Renamed, never copied
 * and deleted; a file that cannot be moved (open in an editor) stays and is reported, and the next call tries again. Idempotent.
 */
export function moveDocs(dir) {
  const moved = [], failed = [];
  for (const name of DOC_NAMES) {
    const from = join(dir, name);
    if (!existsSync(from)) continue;
    const to = join(dir, DOC_DIR, name);
    try {
      mkdirSync(join(dir, DOC_DIR), { recursive: true });
      if (!existsSync(to)) renameSync(from, to);
      else if (MERGED.has(name)) {
        writeFileSync(to + ".tmp", mergeLines(readFileSync(to, "utf8"), readFileSync(from, "utf8"))); renameSync(to + ".tmp", to);
        renameSync(from, join(dir, DOC_DIR, `${name}.old`));
      } else if (mtime(from) > mtime(to)) { renameSync(to, join(dir, DOC_DIR, `${name}.old`)); renameSync(from, to); }
      else renameSync(from, join(dir, DOC_DIR, `${name}.old`));
      moved.push([name, docRel(name)]);
    } catch (e) { failed.push({ path: name, error: e.code ?? e.message }); }
  }
  return { moved, failed };
}
