// The film's docs/CREDITS.md, one writer (audit/112a B6: the sound effects, the music and the pictures each wrote it their own way, and the
// Pictures were made again only when the sounds were credited). Each part is a marked section (<!-- mw:<id>-credits -->) its owner writes
// whole; every write also makes the Pictures again from the credit tables the film keeps beside its pictures.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { docPath } from "./docs.mjs";

/** One section of the credits written whole (id: "sfx", "music"; text: its heading and lines), the Pictures made again. */
export function writeCreditSection(dir, id, text) {
  const f = docPath(dir, "CREDITS.md");
  const section = `<!-- mw:${id}-credits -->\n${text}\n<!-- /mw:${id}-credits -->`;
  const re = new RegExp(`<!-- mw:${id}-credits -->[\\s\\S]*?<!-- \\/mw:${id}-credits -->`);
  const old = existsSync(f) ? readFileSync(f, "utf8") : "# Credits\n";
  const next = withPictureCredits(dir, re.test(old) ? old.replace(re, () => section) : `${old.trimEnd()}\n\n${section}\n`);
  mkdirSync(dirname(f), { recursive: true });          // docs/ in a film that has none yet
  writeFileSync(f, next);
}

/** The Pictures made again on their own, after the film's pictures may have changed (every Claude task's end): no sound or music has to be
 *  credited first (112a B6). Writes only a change; a film with no credits and no picture table gets no file. */
export function pictureCreditsAgain(dir) {
  const f = docPath(dir, "CREDITS.md");
  const old = existsSync(f) ? readFileSync(f, "utf8") : null;
  const next = withPictureCredits(dir, old ?? "# Credits\n");
  if (next === (old ?? "# Credits\n")) return false;
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, next);
  return true;
}

/** The film's pictures in its credits: the credit tables a film keeps beside its pictures (assets/…/IMAGE-CREDITS.md, CREDITS.md,
 *  image-credits.md: their table rows) under "Pictures" (T43-8: Test 43's eight Wikimedia pictures were credited only beside them, and
 *  the film's docs/CREDITS.md, as its ASSETS.md said, never got them). The section goes when no such file is left. */
export function withPictureCredits(dir, text) {
  const found = [];
  const walk = (d, rel) => { let es = []; try { es = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) { if (e.isDirectory()) { if (e.name !== "_app") walk(join(d, e.name), `${rel}/${e.name}`); } else if (/^(image-credits|images?-credits|credits)\.md$/i.test(e.name)) found.push(join(d, e.name)); } };
  walk(join(dir, "assets"), "assets");
  const rows = [];
  for (const file of found) {
    let src = ""; try { src = readFileSync(file, "utf8"); } catch { continue; }
    const table = src.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
    if (table.length >= 3) rows.push(...(rows.length ? table.slice(2) : table));          // one header, the rows of every file after it
  }
  const re = /<!-- mw:picture-credits -->[\s\S]*?<!-- \/mw:picture-credits -->\n?/;
  if (!rows.length) return text.replace(re, "");
  const section = `<!-- mw:picture-credits -->\n## Pictures\n\n${rows.join("\n")}\n<!-- /mw:picture-credits -->\n`;
  return re.test(text) ? text.replace(re, () => section) : `${text.trimEnd()}\n\n${section}`;
}
