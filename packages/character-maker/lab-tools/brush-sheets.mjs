// node tools/brush-sheets.mjs: the model sheets of the lab's CHARACTERS.json (Brush cartoon, the app's character layer), drawn through
// HyperFrames as the Character step draws them: characters/sheets/<id>-views.png and <id>-emotions.png, then the Brush gate of each
// (PASS / FAIL lines; the app saves a character only when it passes). Light: below-normal priority.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const imp = (p) => import(pathToFileURL(join(APP, p)).href);
const kit = await imp("packages/character-kit/index.mjs");
const { finalize } = await imp("packages/hf-edit/finalize.mjs");
const { snapshotAt } = await imp("packages/hf-qa/cli.mjs");
const { brushGate } = await imp("packages/character-kit/brushgate.mjs");
const { stillStd } = await imp("packages/hf-qa/gates.mjs");
const res = await kit.characterSheets(process.cwd(), { root: APP, finalize, snapshotAt });
if (res.problems.length) { console.error(`CHARACTERS.json cannot be drawn yet:\n- ${res.problems.join("\n- ")}`); process.exit(1); }
for (const c of res.characters) console.log(c.error ? `${c.id}: ${c.error}` : `${c.id}: ${c.views} and ${c.emotions}`);
for (const def of kit.readCast(process.cwd()).characters) {
  const g = brushGate(def, { sheetsDir: join(process.cwd(), "characters", "sheets"), still: stillStd, drawn: true });
  console.log(`\nThe gate of ${def.id}:\n${g.lines.join("\n")}\n${g.passed} passed, ${g.failed} failed`);
}
process.exit(res.characters.some((c) => c.error) ? 1 : 0);
