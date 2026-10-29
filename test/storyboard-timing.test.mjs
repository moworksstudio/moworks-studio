// a storyboard frame whose length was words ("(the same shot goes on)") became shot 2 "? s" in the Motion Plan, with
// 11 frames for 10 cuts. Every frame is one shot with its own seconds; board_stills names the frames that have none. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stillSeconds, untimedFrames } from "../packages/hf-edit/shots.mjs";
import { styleTraits } from "../packages/style-catalog/traits.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-sbtime-"));
after(() => rmSync(T, { recursive: true, force: true }));

test("untimedFrames names the frames with no length in seconds, as HF's parser reads them", async () => {
  const file = join(T, "STORYBOARD.md");
  writeFileSync(file, [
    "# Option B", "",
    "## Frame 1 — Night is pasted on", "", "- duration: 3.785s", "- scene: the night sheet goes down", "",
    "## Frame 2 — Cáo asleep under the moon", "", "- duration: (the same shot goes on)", "- scene: the landscape whole", "",
    "## Frame 3 — The scrap falls", "", "- duration: 1.765s", "- scene: insert, low angle", "",
  ].join("\n"));
  const list = await untimedFrames(file);
  assert.equal(list.length, 1);
  assert.equal(list[0].number, 2);
  assert.match(list[0].duration, /same shot/);
  assert.deepEqual(await untimedFrames(join(T, "none.md")), []);
});

test("board stills of HyperFrames' styles and General are taken at each frame's own seconds (HF storyboard.md); the other authors' boards one a second", async () => {
  const file = join(T, "TIMED.md");
  writeFileSync(file, `# Option A

## Frame 1 — A
- duration: 1.8s
- poster: 1.0

## Frame 2 — B
- duration: 1.8s
- poster: 2.9

## Frame 3 — C
- duration: 2.4s
- poster: 0.4

## Frame 4 — D
- duration: 2s
`);
  assert.deepEqual(await stillSeconds(file), [1, 2.9, 4, 7], "poster in film seconds, poster from the frame's start, the middle of its span");
  writeFileSync(file, `# Option A

## Frame 1 — A
- duration: 2s

## Frame 2 — B
- duration: (the same shot goes on)
`);
  assert.equal(await stillSeconds(file), null, "a frame with no seconds: the one-second rule");
  assert.equal(await stillSeconds(join(T, "none.md")), null);
  for (const id of ["general", "hf-launch", "hf-explainer", "slideshow"]) assert.equal(styleTraits(id).filmBoards, true, id);
  for (const id of ["lemo-opuscar-brick-toy", "what-if", null, "no-such-style"]) assert.equal(styleTraits(id).filmBoards, false, String(id));
  const rules = readFileSync(new URL("../config/rules/general-style/references/storyboard.md", import.meta.url), "utf8");
  assert.doesNotMatch(rules, /one second each/);
});

test("the storyboard rules and every engine's storyboard step ask for one shot per frame with its own seconds", () => {
  const rules = readFileSync(new URL("../config/rules/general-style/references/storyboard.md", import.meta.url), "utf8");
  assert.match(rules, /Every frame is one shot with its own length in seconds/);
  for (const e of ["anidoodle", "brush", "lemo", "mg"]) {
    const pipe = JSON.parse(readFileSync(new URL(`../config/${e}-pipeline.json`, import.meta.url), "utf8"));
    assert.ok(JSON.stringify(pipe).includes("every frame one shot with its own seconds"), e);
  }
});
