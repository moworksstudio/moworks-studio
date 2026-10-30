// The offline sound-effect library (bundle/sfx, packages/sfx/library.mjs): the cue names Claude writes find a sound of the right kind,
// the catalog is whole (files, ids, families, credits) and the library stays inside its size budget.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.MW_STATE_DIR ??= mkdtempSync(join(tmpdir(), "mw-sfxlib-state-"));
const { FAMILIES, STYLES, findLocal, rankLocal, pickVariant, loadLibrary, fromCatalog, variantsOf, words } = await import("../packages/sfx/library.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");

const DIR = join(APP_ROOT, "bundle", "sfx");
const cat = JSON.parse(readFileSync(join(DIR, "catalog.json"), "utf8"));
const BUDGET = 25 * 1048576;

test("cue names Claude writes find a sound of the right family", () => {
  const want = {
    "keyboard typing": "typing", "bell ding": "bell", "crt power on": "electronic", "water drip": "water", "lamp ting": "bell", "heavy enter key": "typing",
    "dot matrix printer": "mechanical", "boat bell": "bell", "oar paddle": "water", wind: "wind", blizzard: "wind", whoosh: "whoosh", pop: "pop",
    footsteps: "footstep", "soft footsteps on wood": "footstep", "cloth rustle": "cloth", "page turn": "paper", "paper crumple": "paper", "door open": "door",
    "light switch": "switch", "fire crackle": "fire", rain: "rain", thunder: "rain", "magic sparkle": "magic", "dog bark": "animal", "bird chirp": "animal",
    "crowd murmur": "crowd", applause: "crowd", "room tone": "ambience", "street ambience": "ambience", "night insects": "ambience", "forest ambience": "ambience",
    sea: "ambience", "body thud": "impact", "glass clink": "impact", glitch: "electronic", "clock ticking": "click", gears: "mechanical", typewriter: "typing",
    "tiếng mưa": "rain", "gõ phím": "typing", "tiếng chim hót": "animal", "bước chân": "footstep",
  };
  for (const [name, family] of Object.entries(want)) assert.equal(findLocal(name)?.family, family, `${name} -> ${findLocal(name)?.id}`);
  // the exact sounds the names describe
  assert.match(findLocal("heavy enter key").id, /^typing-key-heavy-/);
  assert.match(findLocal("dot matrix printer").id, /^mechanical-printer-/);
  assert.equal(findLocal("boat bell").id, "bell-ring-1");
  assert.match(findLocal("oar paddle").id, /^water-splash-small-/);
  assert.match(findLocal("lamp ting").id, /^bell-ting-/);
  assert.match(findLocal("water drip").id, /^water-drip-/);
  assert.match(findLocal("blizzard").id, /howl/);
  // an action gets a one-shot, a place the loop; "ambience" asks for the loop
  assert.equal(findLocal("whoosh").loop, false);
  assert.equal(findLocal("wind gust").loop, false);
  assert.equal(findLocal("rain").loop, true);
  assert.equal(findLocal("rain ambience").loop, true);
  // nothing of the kind: null, never a random sound
  assert.equal(findLocal("heartbeat"), null);
  assert.equal(findLocal(""), null);
  assert.equal(findLocal("none of these words"), null);
});

test("family, style, exclude and seed steer the choice", () => {
  assert.equal(findLocal("ding").family, "bell");
  assert.equal(findLocal("ding", { family: "typing" }).id, "typing-typewriter-bell-1");      // the family asked for wins over the word's own
  assert.equal(findLocal("whoosh", { style: "paper" }).id, "whoosh-card-1");
  assert.ok(findLocal("pop", { style: "cartoon" }).tags.includes("cartoon"));
  assert.ok(findLocal("whoosh", { style: "cinematic" }).tags.includes("cinematic"));
  const first = findLocal("bell ding");
  assert.notEqual(findLocal("bell ding", { exclude: [first.id] }).id, first.id);
  assert.notEqual(findLocal("bell ding", { exclude: new Set([first.id]) }).id, first.id);
  // the same seed, the same file; several seeds spread over the variants
  assert.equal(findLocal("footstep wood", { seed: "shot-3:footstep" }).id, findLocal("footstep wood", { seed: "shot-3:footstep" }).id);
  const ids = new Set(Array.from({ length: 12 }, (_, i) => findLocal("footstep wood", { seed: i }).id));
  assert.ok(ids.size > 1, [...ids].join(", "));
  for (const id of ids) assert.match(id, /^footstep-wood/);
  // ranking is best first and only matches
  const r = rankLocal("keyboard typing");
  assert.ok(r.length && r.every((x, i) => i === 0 || r[i - 1].score >= x.score));
});

test("pickVariant is deterministic and spreads", () => {
  const list = [{ id: "a-1" }, { id: "a-2" }, { id: "a-3" }];
  assert.equal(pickVariant([], 1), null);
  assert.equal(pickVariant(null, 1), null);
  assert.equal(pickVariant(list, "x").id, pickVariant([...list].reverse(), "x").id);       // the order given does not matter
  assert.equal(new Set(Array.from({ length: 30 }, (_, i) => pickVariant(list, `seed-${i}`).id)).size, 3);
  const lib = loadLibrary();
  const v = variantsOf(lib.sounds.find((s) => s.id === "footstep-wood-1"));
  assert.deepEqual(v.map((s) => s.id).sort(), ["footstep-wood-1", "footstep-wood-2"]);
});

test("words: stems, Vietnamese cue words, power on", () => {
  assert.deepEqual(words("Typing"), ["type"]);
  assert.deepEqual(words("dripping water"), ["drip", "water"]);
  assert.deepEqual(words("CRT power on"), ["crt", "power", "on"]);
  assert.deepEqual(words("tiếng nước"), ["water"]);
  // a library given as a catalog (no files) answers the same way
  const lib = fromCatalog({ sounds: [{ id: "x-bell-1", family: "bell", tags: ["bell", "ding"], file: "bell/x-bell-1.ogg", loop: false }] });
  assert.equal(findLocal("bell ding", { library: lib }).id, "x-bell-1");
  assert.equal(findLocal("whoosh", { library: lib }), null);
});

test("the catalog: every file there, ids unique, families valid, credited", () => {
  assert.ok(cat.sounds.length >= 120 && cat.sounds.length <= 260, `${cat.sounds.length} sounds`);
  assert.deepEqual(cat.families, [...FAMILIES]);
  const ids = new Set();
  for (const s of cat.sounds) {
    assert.match(s.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(!ids.has(s.id), `repeated id ${s.id}`);
    ids.add(s.id);
    assert.ok(FAMILIES.includes(s.family), `${s.id}: family ${s.family}`);
    assert.equal(s.file, `${s.family}/${s.id}.ogg`);
    assert.ok(existsSync(join(DIR, ...s.file.split("/"))), `${s.file} missing`);
    assert.ok(s.tags.length >= 3 && s.tags.every((t) => t === t.toLowerCase().trim()), `${s.id}: tags`);
    assert.ok(s.duration > 0 && s.duration <= (s.loop ? 21 : 10.5), `${s.id}: ${s.duration} s`);
    assert.ok(s.onset >= 0 && s.onset <= 1, `${s.id}: onset ${s.onset}`);
    assert.ok(s.peak <= -1, `${s.id}: true peak ${s.peak}`);
    assert.ok(s.loop ? Math.abs(s.lufs + 28) <= 1.5 : s.lufs <= -15 && s.lufs >= -40, `${s.id}: ${s.lufs} LUFS`);
    const src = s.source;
    for (const k of ["name", "url", "author", "licence", "file", "read", "how"]) assert.ok(src?.[k], `${s.id}: source.${k}`);
    assert.match(src.url, /^https:\/\/(kenney\.nl|opengameart\.org|commons\.wikimedia\.org)\//);
    assert.match(src.licence, /^(CC0 1\.0|Public domain)/);
    assert.ok(!/[A-Za-z]:\\/.test(src.file), `${s.id}: a local path in source.file`);
  }
  for (const f of FAMILIES) assert.ok(cat.sounds.some((s) => s.family === f), `no sound in ${f}`);
  assert.ok(cat.sounds.filter((s) => s.loop).length >= 10, "ambience loops");
  // no stray files: the folder holds the catalog's sounds, the catalog and the credits
  const onDisk = readdirSync(DIR, { recursive: true }).map(String).filter((p) => statSync(join(DIR, p)).isFile()).map((p) => p.split("\\").join("/")).sort();
  assert.deepEqual(onDisk, [...cat.sounds.map((s) => s.file), "CREDITS.md", "catalog.json"].sort());
  const credits = readFileSync(join(DIR, "CREDITS.md"), "utf8");
  for (const s of cat.sounds) assert.ok(credits.includes(`\`${s.id}\``), `${s.id} not in CREDITS.md`);
  assert.ok(STYLES.every((st) => cat.sounds.some((s) => s.tags.includes(st))), "every style hint has sounds");
});

test("the library stays inside its budget and the bundle manifest counts it", () => {
  const files = readdirSync(DIR, { recursive: true }).map(String).filter((p) => statSync(join(DIR, p)).isFile());
  const bytes = files.reduce((a, p) => a + statSync(join(DIR, p)).size, 0);
  assert.ok(bytes < BUDGET, `${(bytes / 1048576).toFixed(2)} MB`);
  const part = JSON.parse(readFileSync(join(APP_ROOT, "bundle", "MANIFEST.json"), "utf8")).parts.find((p) => p.name === "sfx");
  assert.ok(part, "no sfx part in bundle/MANIFEST.json");
  assert.equal(part.path, "sfx");
  assert.equal(part.files, files.length);
  assert.equal(part.bytes, bytes);
  assert.match(part.licence, /CC0/);
});
