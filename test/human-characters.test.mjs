// anidoodle's human characters in the character library: kept in <store>/anidoodle-human/<id>/, listed
// by GET /api/characters in their own group with their engine and media, selectable for films, never mixed into the Brush kit's list.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-humans-"));
process.env.MW_CHARACTERS_ROOT = T;
after(() => rmSync(T, { recursive: true, force: true }));
const kit = await import("../packages/character-kit/index.mjs");

test("a stored anidoodle human is listed apart, with its engine and media, and is not a Brush character", () => {
  const d = join(kit.humanDir(), "grandma");
  mkdirSync(join(d, "module"), { recursive: true });
  writeFileSync(join(d, "character.json"), JSON.stringify({ id: "grandma", name: "Grandma", about: "a small elderly woman", credit: { made: "written from the idea" }, hands: ["marker", "storybook"] }));
  writeFileSync(join(d, "sheet-marker.webp"), "x"); writeFileSync(join(d, "walk-marker.mp4"), "x");
  mkdirSync(join(kit.humanDir(), "broken"), { recursive: true });          // no character.json: not listed
  const api = kit.apiCharacters().characters, g = api.find((c) => c.id === "grandma");
  assert.deepEqual([g.engine, g.group, g.selectable], ["anidoodle-human", "anidoodle", true]);
  assert.equal(g.media.sheetMarker, "/media/characters/anidoodle-human/grandma/sheet-marker.webp");
  assert.equal(g.media.sheetStorybook, null);
  assert.equal(api.some((c) => c.id === "broken"), false);
  assert.ok(api.filter((c) => c.engine === "brush-kit").every((c) => c.group !== "anidoodle"));
  assert.equal(kit.getCharacter("grandma"), null);          // the Brush pipeline never picks it up
  assert.equal(kit.mediaFile("anidoodle-human/grandma/walk-marker.mp4"), join(d, "walk-marker.mp4"));
  assert.equal(kit.mediaFile("anidoodle-human/../../x.mp4"), null);
});

test("each character says what it is (kind: human | animal | thing | robot) and its real height, with where the height comes from (The Studio's height chart)", () => {
  const put = (id, rec, files = {}) => {
    const d = join(kit.humanDir(), id);
    mkdirSync(join(d, "module", id), { recursive: true });
    writeFileSync(join(d, "character.json"), JSON.stringify({ id, name: id, credit: {}, hands: ["storybook"], ...rec }));
    for (const [f, text] of Object.entries(files)) writeFileSync(join(d, "module", id, f), text);
  };
  put("kid", { about: "a child", heightM: 1.1, heightBy: "inferred" }, { "spec.ts": "export const KID_SPEC = {\n  canon: CANON.storybookChild, height: 1.3, body: CHILD_BODY,\n};\n" });
  put("baker", { about: "Baker in his forties, 7.5 heads, 1.78 m" });
  put("pup", { kind: "animal", about: "a dog, 0.6 m at the shoulder" });
  put("lamp", { kind: "thing", about: "a desk lamp", heightM: 0.5, heightBy: "inferred", heightNote: "a desk lamp" });
  put("bit", { rig: "bit", about: "the author's wind-up robot", credit: { made: "as shipped" } });
  put("nobody", { about: "a person with no height anywhere" });
  const api = kit.apiCharacters().characters, of = (id) => { const c = api.find((x) => x.id === id); return [c.kind, c.heightM, c.heightBy]; };
  assert.deepEqual(of("kid"), ["human", 1.3, "spec"], "a person's spec wins: the height its rig and gates use");
  assert.deepEqual(of("baker"), ["human", 1.78, "description"]);
  assert.deepEqual(of("pup"), ["animal", 0.6, "description"]);
  assert.deepEqual(of("lamp"), ["thing", 0.5, "inferred"], "the record's own, marked as it was given");
  assert.deepEqual(of("bit"), ["robot", 0.3, "inferred"], "the author's Bit is a robot; its rig has no real size, so its height is inferred and says so");
  assert.match(api.find((x) => x.id === "bit").heightNote, /no real size/);
  assert.deepEqual(of("nobody"), ["human", null, null]);
  const clawd = api.find((c) => c.id === "clawd");
  assert.deepEqual([clawd.kind, clawd.heightM, clawd.heightBy], ["thing", 0.4, "inferred"]);
  assert.ok(api.every((c) => kit.KINDS.includes(c.kind) && "heightM" in c && "heightBy" in c && "heightNote" in c), "every character has the fields");
});
