#!/usr/bin/env node
// unpack.mjs — writes every file embedded in the kit's single setup file into this folder.
//   node tools/unpack.mjs <STORY-ANIMATION-KIT.md> [--force]
// An embedded file is a line  <!-- FILE: path/to/file -->  followed by a fenced block; the block's own fence length
// (3+ backticks) closes it, so files that contain ``` fences themselves are safe. Existing files are kept unless
// --force (so an update never overwrites the user's own videos; src/videos/ and kit.config.json are never shipped).
import fs from "fs";
import path from "path";
const [src, flag] = process.argv.slice(2);
if (!src) {
  console.error("usage: node tools/unpack.mjs <kit file.md> [--force]");
  process.exit(1);
}
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);
let n = 0, kept = 0;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^<!-- FILE: (.+?) -->$/);
  if (!m) continue;
  const fence = lines[i + 1].match(/^(`{3,})/)[1];
  let j = i + 2;
  while (j < lines.length && lines[j] !== fence) j++;
  const rel = m[1].trim();
  if (rel.includes("..") || path.isAbsolute(rel)) throw new Error(`refusing path ${rel}`);
  const dst = path.join(process.cwd(), rel);
  if (fs.existsSync(dst) && flag !== "--force") kept++;
  else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, lines.slice(i + 2, j).join("\n") + "\n");
    n++;
  }
  i = j;
}
console.log(`✓ wrote ${n} file(s)${kept ? `, kept ${kept} existing (use --force to overwrite)` : ""}`);
