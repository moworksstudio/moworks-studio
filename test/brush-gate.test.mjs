// The Brush character gate: a Brush cartoon character is checked automatically before anyone
// is asked to approve it (each check PASS or FAIL with its reason, negative twins that must fail), the film's cast gate runs it for its
// Brush members, and a library character used in its own style needs only its gate. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-brush-gate-"));
process.env.MW_CHARACTERS_ROOT = join(T, "characters");
after(() => rmSync(T, { recursive: true, force: true }));
const { brushGate, contrast } = await import("../packages/character-kit/brushgate.mjs");
const K = await import("../packages/character-kit/index.mjs");
const maker = await import("../packages/character-maker/index.mjs");
const { stillStd } = await import("../packages/hf-qa/gates.mjs");
const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
const FIX = join(import.meta.dirname, "fixtures", "brush-mini");
const BAO = JSON.parse(readFileSync(join(FIX, "CHARACTERS.json"), "utf8")).characters[0];
const fails = (def, opts) => brushGate(def, opts).lines.filter((l) => l.startsWith("FAIL"));
const png = (file, src) => { mkdirSync(join(file, ".."), { recursive: true }); execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", src, "-frames:v", "1", file], { windowsHide: true }); };

test("a good definition passes every check; the Clawd demo's body and colours fail; contrast is WCAG's", () => {
  const g = brushGate(BAO);
  assert.deepEqual([g.id, g.failed], ["bao", 0], g.lines.join("\n"));
  assert.ok(g.passed >= 6 && g.lines.every((l) => /^(PASS|FAIL) {2}/.test(l)));
  assert.match(fails({ ...K.getCharacter("clawd"), id: "crab", name: "Crab" }).join(), /never Clawd.*Clawd's.*a wide box on four legs/);
  assert.equal(Math.round(contrast("#000000", "#FFFFFF")), 21);
});

test("negative twins: each break fails its own check and says why", () => {
  const twins = [
    [{ ...BAO, colors: { ...BAO.colors, dk: "#FFFFFF" } }, /three colours.*shade #FFFFFF is not darker/],
    [{ ...BAO, colors: { col: "#F3EBDC", dk: "#EFE6D6", lt: "#FFFFFF" } }, /light and on a dark ground.*light page/],
    [{ ...BAO, face: { ...BAO.face, y: -12 } }, /face sits on the body.*eye line y -12 is off the body/],
    [{ ...BAO, face: { ...BAO.face, dx: 6 } }, /eyes at ±6 are outside/],
    [{ ...BAO, legs: { ...BAO.legs, h: 0.4 } }, /legs stand.*they float/],
    [{ ...BAO, legs: { ...BAO.legs, xs: [-9, 1.4] } }, /a leg at x -9 is outside the body/],
    [{ ...BAO, arms: { ...BAO.arms, x: 9 } }, /arms attach.*not at the body's side/],
    [{ ...BAO, views: { front: { L: 3, R: -3, legs: [[0, 0]], face: null } } }, /key views agree.*front: L must be left of R.*1 legs, the body has 2.*no face/],
    [{ ...BAO, id: "clawd" }, /can be drawn.*Anthropic's mascot/],
  ];
  for (const [def, why] of twins) {
    const f = fails(def);
    assert.ok(f.length >= 1 && why.test(f.join(" | ")), `${why}: ${f.join(" | ") || "it passed"}`);
  }
});

test("the sheets: required once drawn, a blank one fails, a drawn one passes", () => {
  const sheets = join(T, "sheets");
  assert.match(fails(BAO, { sheetsDir: sheets, still: stillStd, drawn: true }).join(), /no views sheet: draw the sheets/);
  png(join(sheets, "bao-views.png"), "color=c=0xF3EBDC:s=320x180");
  png(join(sheets, "bao-emotions.png"), "testsrc2=s=320x180");
  assert.match(fails(BAO, { sheetsDir: sheets, still: stillStd, drawn: true }).join(), /the views sheet is blank/);
  png(join(sheets, "bao-views.png"), "testsrc2=s=320x180");
  assert.deepEqual(fails(BAO, { sheetsDir: sheets, still: stillStd, drawn: true }), []);
});

test("the film's cast gate runs the Brush gate for its Brush members (a library character in its own style needs only it)", async () => {
  const film = join(T, "film");
  mkdirSync(film, { recursive: true });
  png(join(film, "characters", "sheets", "bao-views.png"), "testsrc2=s=320x180");
  png(join(film, "characters", "sheets", "bao-emotions.png"), "testsrc2=s=320x180");
  writeFileSync(join(film, "CHARACTERS.json"), JSON.stringify({ characters: [BAO, { ...BAO, id: "bun", name: "Bun", face: { ...BAO.face, y: -20 } }] }));
  const g = await maker.filmGate(film);
  assert.equal(g.pass, false);
  const by = Object.fromEntries(g.characters.map((c) => [c.id, c]));
  assert.deepEqual([by.bao.kind, by.bao.failed, by.bao.ownStyle], ["brush", 0, false]);
  assert.ok(by.bun.lines.some((l) => /FAIL {2}the face sits on the body/.test(l)) && by.bun.lines.some((l) => /no views sheet/.test(l)));
  // saved to the library and used again in a Brush film: ownStyle, only its gate
  K.saveCharacter(film, "bao");
  const again = join(T, "again"); mkdirSync(again, { recursive: true });
  const cast = K.useCharacters(again, ["bao"]).characters;
  assert.deepEqual([cast[0].ownStyle, K.characterNeedsWork(cast[0]), K.characterNeedsWork(BAO)], [true, "gate", "sheet"]);
  const g2 = await maker.filmGate(again);
  assert.deepEqual([g2.pass, g2.characters[0].ownStyle], [true, true], g2.characters[0].lines.join("\n"));
});

test("every listed character says what it is (kind), the author's rigs too; a definition saved before kinds existed is a thing", () => {
  assert.equal(K.getCharacter("clawd").kind, "thing");
  assert.deepEqual(K.AUTHOR_RIGS.map((a) => [a.id, a.kind]), [["bit", "robot"], ["cheetah", "animal"]], "Bit, the author's wind-up robot (coordinator 26/10)");
});
