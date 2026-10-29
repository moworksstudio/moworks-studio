// Intake of Motion Prompt: build the Vocabulary store from the pinned clone and write the Motion Plan's names table.
// Usage: node tools/intake-motion-prompt.mjs [--check] [--no-glossary]
//   (default) read the clone named by config/pins.json motionPrompt (a local pin points at D:/Moworks Studio/vendor/motion-prompt), refuse a clone
//             that is not at the pinned commit, replace every item by its number in <work>/library/vocab/mp-<commit>-hf-<HF commit>/ (its HyperFrames-first names cite HF's registry at its pin), write
//             config/rules/motion-vocab/SKILL.md from the store (the film packs only: motion, motion2, camera).
//   --check   read-only: say what a run would change.
// Update path: git fetch in the clone; git diff --stat <pin>..origin/main -- packs api; check out the new commit; set the new commit and date in
// config/pins.json; run this tool; run test/vocab.test.mjs; update the Motion Prompt row of SOURCES.md; re-pin only after review. A new HyperFrames
// pin is a new store too: run this tool after moving HyperFrames, then node tools/make-bundle.mjs --only library-vocab.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ROOT } from "../packages/version-manager/index.mjs";
import * as vocab from "../packages/vocab-library/index.mjs";

const argv = process.argv.slice(2), check = argv.includes("--check"), glossary = !argv.includes("--no-glossary");
const src = vocab.source();
console.log(`source ${src.dir} @ ${src.commit.slice(0, 7)} (${src.repo})`);
if (check) {
  const cat = JSON.parse(readFileSync(join(src.dir, "api", "v1", "catalog.json"), "utf8"));
  const have = new Map(vocab.items().map((x) => [x.id, x]));
  const news = cat.elements.filter((e) => !have.has(e.id)).map((e) => e.id);
  console.log(`catalog ${cat.version}: ${cat.count} items, store has ${have.size}, new ${news.length}${news.length ? ` (${news.slice(0, 8).join(", ")}${news.length > 8 ? "…" : ""})` : ""}`);
  process.exit(0);
}
const r = vocab.buildStore();
console.log(`store ${r.dir}: ${r.items} items, ${r.changed} new or changed`);
if (glossary) {
  const f = join(APP_ROOT, "config", "rules", "motion-vocab", "SKILL.md");
  const text = vocab.glossaryText(vocab.items(), src);
  mkdirSync(dirname(f), { recursive: true });
  if (!existsSync(f) || readFileSync(f, "utf8") !== text) { writeFileSync(f, text); console.log(`wrote ${f} (${text.length} characters, about ${Math.round(text.length / 4)} tokens)`); }
  else console.log("config/rules/motion-vocab/SKILL.md is up to date");
}
