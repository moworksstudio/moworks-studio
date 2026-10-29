// The character layer: ClaudeAnimationBase's kit pinned, its generic parts cut out of clawd.js
// without Clawd's body, characters as definitions (the user's own; Clawd, a demo only; the sample Pip removed), the R-CLAWD guard in finalize, a character
// page driven by HyperFrames (finalize's bridge, a still that draws, frames that follow t), and the API.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-chars-"));
Object.assign(process.env, { MW_CHARACTERS_ROOT: join(T, "characters"), MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_BACKUP_ROOT: join(T, "backup"),
  MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1", MW_NO_ASSET_INSTALL: "1" });
after(() => rmSync(T, { recursive: true, force: true }));
const K = await import("../packages/character-kit/index.mjs");
// the user's library holds the test film's Bao (the app ships no character of its own, only the Clawd demo)
mkdirSync(join(T, "characters", "user"), { recursive: true });
writeFileSync(join(T, "characters", "user", "bao.json"), JSON.stringify(JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "brush-mini", "CHARACTERS.json"), "utf8")).characters[0]));
const { finalize } = await import("../packages/hf-edit/finalize.mjs");
const { snapshotAt } = await import("../packages/hf-qa/cli.mjs");
const { stillStd } = await import("../packages/hf-qa/gates.mjs");
const { status } = await import("../packages/offline-assets/index.mjs");
const SHA = "0ac8bf2b31942376cb6b8c4074715595d512acd2";
const src = K.kitSource();
const skip = !src?.intact && "the ClaudeAnimationBase clone is not at the pinned commit (config/pins.json characterKit)";

test("the kit: pinned at its commit; its generic parts cut out of clawd.js unchanged, without Clawd's body", { skip }, () => {
  assert.equal(src.commit, SHA);
  const parts = K.kitParts(), original = readFileSync(join(src.root, "src", "clawd.js"), "utf8").replace(/\r\n/g, "\n");
  for (const name of K.KEEP) assert.match(parts, new RegExp(`^(?:function ${name}\\(|const ${name} =)`, "m"), name);
  assert.ok(!/^function (clawd|lunchbox|dancer)\(|^const VIEWS\b/m.test(parts), "no Clawd body");
  assert.ok(parts.includes(`/blob/${SHA}/src/clawd.js`), "credited at the commit");
  const body = (name) => new RegExp(`^function ${name}\\([\\s\\S]*?\\n}\\n`, "m").exec(original)[0];
  for (const name of ["eye", "mouth", "emotions"]) assert.ok(parts.includes(body(name)), `${name} as shipped`);
});

test("characters: the user's may be used; the app ships only the Clawd demo (never selectable, marked and credited), no sample of its own", () => {
  const list = K.characters(), bao = list.find((c) => c.id === "bao"), clawd = list.find((c) => c.id === "clawd");
  assert.deepEqual([bao.group, bao.demo, bao.selectable], ["yours", false, true]);
  assert.deepEqual(list.map((c) => c.id), ["bao", "clawd"], "no Pip (audit 77 B3)");
  assert.deepEqual([clawd.demo, clawd.selectable], [true, false]);
  assert.equal(clawd.label, "Demo: Anthropic's mascot, not for use in films");
  assert.ok(clawd.credit.link.includes(`ClaudeAnimationBase/blob/${SHA}/`));
  for (const c of list) for (const k of ["colors", "body", "face", "head", "arms"]) assert.ok(c[k], `${c.id}.${k}`);
});

test("R-CLAWD: a film that draws Clawd is found (its own scripts, a Clawd definition, the kit's clawd.js); the kit's engine files are not the film's", () => {
  const f = (rel, text) => ({ rel, text });
  assert.equal(K.clawdIn([f("compositions/scene.js", "clawd(960, 820, 20, feel('happy', t));")]), true);
  assert.equal(K.clawdIn([f("index.html", `const CHARACTER = {"id":"clawd","name":"Clawd"};`)]), true);
  assert.equal(K.clawdIn([f("compositions/kit/clawd.js", "// anything")]), true);
  assert.equal(K.clawdIn([f("compositions/kit/timeline.js", "clawd(960, 820, 20, feel('happy', t));"), f("index.html", `{"id":"bao"}`)]), false);
  assert.equal(K.clawdIn([f("compositions/scene.js", "character(BAO, 960, 820, 20, charFeel(BAO, 'happy', t));")]), false);
});

test("a character page: the pinned engine, the generic parts and the layer, p5.js and p5.brush with their licences; finalize bridges it and refuses Clawd outside the demo", { skip, timeout: 120000 }, async () => {
  const d = join(T, "bao");
  const { files } = K.writePage(d, "bao", { scene: "emotions", duration: 3 });
  for (const rel of ["compositions/kit/core.js", "compositions/kit/clawd-parts.js", "compositions/kit/character.js", "compositions/kit/LICENSE",
    "assets/_app/vendor/lib/p5/2.3.3/license.txt", "assets/_app/vendor/lib/p5.brush/2.2.3/LICENSE.md"]) assert.ok(files.includes(rel) && existsSync(join(d, ...rel.split("/"))), rel);
  assert.ok(!files.includes("compositions/kit/clawd.js"), "never the kit's clawd.js in a page");
  const rep = await finalize(d, { googleFonts: false });
  assert.equal(rep.lemo?.source, "mg", "the bridge: renderAt and __ready");
  assert.equal(readFileSync(join(d, "index.html"), "utf8").match(/data-mw="lemo"/g).length, 1);
  const c = join(T, "clawd");
  K.writePage(c, "clawd", { scene: "views", duration: 3 });
  await assert.rejects(finalize(c, { googleFonts: false }), { code: "CLAWD" });
  const ok = await finalize(c, { googleFonts: false, characterDemo: true });
  assert.ok(ok.lemo);
});

test("a character page driven by HyperFrames: a still that draws, and frames that follow HyperFrames' time", { skip: skip || (!status().ready && "the offline assets are not all downloaded"), timeout: 300000 }, async () => {
  const d = join(T, "reel");
  K.writePage(d, "bao", { scene: "showreel", duration: 6 });
  await finalize(d, { googleFonts: false });
  const s = snapshotAt(d, [0.9, 3.0], join(T, "reel-snap"), { timeout: 60000 });
  assert.equal(s.exitCode, 0, s.stderrTail.join(" "));
  assert.ok(!s.stderrTail.join(" ").includes("did not become render-ready"), s.stderrTail.join(" "));
  const a = join(T, "reel-snap", "frame-00-at-0.9s.png"), b = join(T, "reel-snap", "frame-01-at-3s.png");
  assert.ok(stillStd(a) >= 2 && stillStd(b) >= 2, "the frames draw");
  assert.notDeepEqual(readFileSync(a), readFileSync(b), "the showreel follows t");
});

test("the API: the characters with their credit and whether a project may use them; demo media stay in their store", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t0k" });
  try {
    const r = await fetch(`http://127.0.0.1:${s.port}/api/characters`, { headers: { "x-mw-token": "t0k" } });
    const j = await r.json();
    assert.equal(j.kit.commit, SHA);
    const clawd = j.characters.find((c) => c.id === "clawd");
    assert.deepEqual([clawd.demo, clawd.selectable, clawd.label], [true, false, "Demo: Anthropic's mascot, not for use in films"]);
    assert.equal(j.characters.find((c) => c.id === "bao").selectable, true);
    assert.equal(j.characters.some((c) => c.id === "pip"), false);
    mkdirSync(join(process.env.MW_CHARACTERS_ROOT, "bao"), { recursive: true });
    writeFileSync(join(process.env.MW_CHARACTERS_ROOT, "bao", "views.webp"), "x");
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/characters/bao/views.webp`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/characters/..%2F..%2Fx.webp`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/api/characters/nobody/demo`, { method: "POST", headers: { "x-mw-token": "t0k" } })).status, 404);
  } finally { await s.close(); }
});
