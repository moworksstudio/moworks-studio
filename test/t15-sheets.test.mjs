// An anidoodle film's animals (a Rubber hose cat and dog, hand rubberHose, no human hand in the medium) are drawn by
// anidoodle's own sheet module, never by the Brush layer's sheet page; a sheet module that exports its film as its default is read; a failed
// drawing is said per character, in the shape the Character dialog reads.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-t15-"));
after(() => rmSync(T, { recursive: true, force: true }));
process.env.MW_APP_ROOT = APP_ROOT;

test("the lab tool reads a sheet module's meta from the film it exports (its default, or any Film export), or from __meta", async () => {
  const { metaOf } = await import("../packages/character-maker/lab-tools/mw.mjs");
  const d = join(T, "meta");
  mkdirSync(join(d, "anidoodle", "films"), { recursive: true });
  const meta = { title: "sheet", W: 1080, H: 1920, fps: 24, durationFrames: 24 };
  writeFileSync(join(d, "anidoodle", "films", "a.ts"), `const sheet = { meta: ${JSON.stringify(meta)}, assets: { images: {} }, shots: [] };\nexport default sheet;\n`);
  writeFileSync(join(d, "anidoodle", "films", "b.ts"), `export const film = { meta: ${JSON.stringify(meta)}, shots: [] };\n`);
  writeFileSync(join(d, "anidoodle", "films", "c.ts"), `export const __meta = ${JSON.stringify(meta)};\n`);
  writeFileSync(join(d, "anidoodle", "films", "d.ts"), "export const nothing = 1;\n");
  for (const f of ["a", "b", "c"]) assert.deepEqual(await metaOf(d, `films/${f}.ts`), meta, f);
  await assert.rejects(metaOf(d, "films/d.ts"), /exports no film: export the Film/);
});

test("character_sheet and Draw again send an anidoodle cast (an animal on anidoodle's engine) to anidoodle's sheets, whatever the medium's hand", async () => {
  const { characterRoutes } = await import("../packages/server/characters.mjs");
  const d = join(T, "film");
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify({ characters: [{ id: "muc", name: "Mực", about: "a rubber-hose cat", kind: "animal", engine: "anidoodle-human", rig: "muc", hand: "rubberHose", import: "./characters/muc", check: "characters/muc/check.ts" }] }));
  const project = { id: "p1", path: d, meta: { style: { id: "anidoodle-rubberHose" } } };
  let job = null;
  const ctx = { root: APP_ROOT, preview: { base: "" }, jobs: { start: (_k, _m, fn) => { job = fn({ update() {} }); return { id: "j1" }; } } };
  const r = (method, path, fn) => ({ method, path, fn });
  const { tools, routes } = characterRoutes(ctx, { r, P: "([^/]+)", mustProject: () => project, HttpError: class extends Error {} });
  // no gate and no sheet module yet: anidoodle's own steps say what to write, never the Brush page's "reading 'top'"
  const text = await tools.character_sheet({ project, args: {} });
  assert.match(text, /write anidoodle\/films\/sheet-muc\.ts/);
  assert.doesNotMatch(text, /five views|31 emotions/);
  const draw = routes.find((x) => x.method === "POST" && String(x.path).endsWith("/characters/sheets"));
  await draw.fn(["p1"], {});
  const res = await job;
  assert.deepEqual(res.problems, []);
  assert.equal(res.characters[0].id, "muc");
  assert.equal(res.characters[0].name, "Mực");
  assert.match(res.characters[0].error, /write anidoodle\/films\/sheet-muc\.ts/, "the dialog says why, per character (T15-2)");
});

test("an anidoodle cast member is \"in your characters\" only when it is in the user's library, never a new one before approval", async () => {
  process.env.MW_CHARACTERS_ROOT = join(T, "lib");
  const kit = await import("../packages/character-kit/index.mjs");
  mkdirSync(join(kit.humanDir(), "mira"), { recursive: true });
  writeFileSync(join(kit.humanDir(), "mira", "character.json"), JSON.stringify({ id: "mira", name: "Mira", credit: {}, hands: ["storybook"] }));
  const { characterRoutes } = await import("../packages/server/characters.mjs");
  const d = join(T, "film4");
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "CHARACTERS.json"), JSON.stringify({ characters: [
    { id: "muc", name: "Mực", kind: "animal", engine: "anidoodle-human", rig: "muc", hand: "rubberHose", import: "./characters/muc", check: "characters/muc/check.ts" },
    { id: "mira", name: "Mira", engine: "anidoodle-human", hand: "storybook", import: "./characters/mira" }] }));
  const project = { id: "p4", path: d, meta: { style: { id: "anidoodle-rubberHose" } } };
  const r = (method, path, fn) => ({ method, path, fn });
  const { routes } = characterRoutes({ root: APP_ROOT, preview: { base: "" }, jobs: {} }, { r, P: "([^/]+)", mustProject: () => project, HttpError: class extends Error {} });
  const v = routes.find((x) => x.method === "GET" && String(x.path).endsWith("/characters")).fn(["p4"]);
  assert.deepEqual(v.characters.map((c) => [c.id, c.saved]), [["muc", false], ["mira", true]]);
});
