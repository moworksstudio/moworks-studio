// The film is bundled again before anything looks at it (the Review's sheets, a chat fix's stills, the checks), only when
// its sources are newer than its bundle; one function for every caller (hf-edit/codeFilm.mjs). Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-fresh-"));
after(() => rmSync(T, { recursive: true, force: true }));
const { freshFilm } = await import("../packages/hf-edit/codeFilm.mjs");
const { anidoodleSource } = await import("../packages/anidoodle-styles/index.mjs");

test("an anidoodle film edited after its bundle is bundled again before a look; unchanged, it is not", async (t) => {
  if (!anidoodleSource()) return t.skip("anidoodle is not pinned here");
  assert.equal(await freshFilm(join(T, "none")), null, "no code film: nothing to do");
  const d = join(T, "film"); mkdirSync(join(d, "anidoodle"), { recursive: true });
  writeFileSync(join(d, "anidoodle", "page.ts"), "export const frame = 1;\nconsole.log(frame);\n");
  const first = await freshFilm(d);
  assert.deepEqual([first.kind, first.built, first.error ?? null], ["anidoodle", true, null]);
  const out = join(d, "compositions", "anidoodle", "film.js"), at = statSync(out).mtimeMs;
  assert.equal((await freshFilm(d)).built, false, "unchanged: the bundle stands");
  writeFileSync(join(d, "anidoodle", "page.ts"), "export const frame = 2;\nconsole.log(frame);\n");
  const later = new Date(Date.now() + 5000); utimesSync(join(d, "anidoodle", "page.ts"), later, later);
  assert.equal((await freshFilm(d)).built, true, "Claude's change mid-task: bundled before the look");
  assert.match(readFileSync(out, "utf8"), /2/); assert.ok(statSync(out).mtimeMs >= at);
  writeFileSync(join(d, "anidoodle", "page.ts"), "export const = ;\n"); utimesSync(join(d, "anidoodle", "page.ts"), new Date(Date.now() + 9000), new Date(Date.now() + 9000));
  assert.ok((await freshFilm(d)).error, "a compile error comes back as words, never a throw");
});

test("the server's looks (a chat fix's stills, Tech checks) use the one shared function", () => {
  for (const f of ["index.mjs", "production.mjs"]) {
    assert.match(readFileSync(new URL(`../packages/server/${f}`, import.meta.url), "utf8"), /import \{ freshFilm \} from "\.\.\/hf-edit\/codeFilm\.mjs";/, f);
  }
});
