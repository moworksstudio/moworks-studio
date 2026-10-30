// A film's folder kept tidy (audit/85, 30/10/2026): the app's documents in docs/, the music to listen to in the cache, the QC rounds'
// raw stills of every round but the newest gone, the history packed, the style's
// rules and the engines linked from one shared stage instead of copied into every film; and the app's own leftovers on this PC
// cleaned at start. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-storage-"));
process.env.MW_STAGE_DIR = join(T, "stage");
after(() => rmSync(T, { recursive: true, force: true }));
const docs = await import("../packages/project-service/docs.mjs");
const layout = await import("../packages/project-service/layout.mjs");
const stage = await import("../packages/project-service/shared-stage.mjs");
const put = (d, rel, text) => { mkdirSync(join(d, ...rel.split("/").slice(0, -1)), { recursive: true }); writeFileSync(join(d, ...rel.split("/")), text); };

test("the app's documents: docs/ first, then the root of a film not moved yet; moved once, never lost", () => {
  const d = mkdtempSync(join(T, "docs-"));
  assert.equal(docs.docPath(d, "NOTES.md"), join(d, "docs", "NOTES.md"), "a new one is written in docs/");
  assert.equal(docs.docPath(d, "BRIEF.md"), join(d, "BRIEF.md"), "HyperFrames' own files stay at the root");
  put(d, "NOTES.md", "- 29/10 old note\n"); put(d, "QC-REVIEW.json", "{\"final\":7}"); put(d, "CHARACTERS.json", "{\"characters\":[]}"); put(d, "BRIEF.md", "brief");
  assert.equal(docs.docPath(d, "NOTES.md"), join(d, "NOTES.md"), "a film not moved yet: read at the root");
  assert.equal(docs.docRelIn(d, "NOTES.md"), "NOTES.md");
  const r = docs.moveDocs(d);
  assert.deepEqual(r.moved.map(([f]) => f).sort(), ["CHARACTERS.json", "NOTES.md", "QC-REVIEW.json"]);
  assert.deepEqual(r.failed, []);
  assert.ok(existsSync(join(d, "BRIEF.md")) && !existsSync(join(d, "NOTES.md")));
  assert.equal(docs.readDoc(d, "NOTES.md"), "- 29/10 old note\n");
  assert.equal(docs.docRelIn(d, "NOTES.md"), "docs/NOTES.md");
  // Claude wrote a root copy from habit: notes add their new lines, another document's newer copy wins and the older is kept beside it
  put(d, "NOTES.md", "- 29/10 old note\n- 30/10 new note\n");
  put(d, "QC-REVIEW.json", "{\"final\":9}");
  const t = new Date(Date.now() - 60000); utimesSync(join(d, "docs", "QC-REVIEW.json"), t, t);
  docs.moveDocs(d);
  assert.equal(docs.readDoc(d, "NOTES.md").match(/old note/g).length, 1);
  assert.match(docs.readDoc(d, "NOTES.md"), /30\/10 new note/);
  assert.equal(docs.readDoc(d, "QC-REVIEW.json"), "{\"final\":9}");
  assert.equal(readFileSync(join(d, "docs", "QC-REVIEW.json.old"), "utf8"), "{\"final\":7}");
  assert.deepEqual(docs.moveDocs(d), { moved: [], failed: [] }, "idempotent");
  docs.writeDoc(d, "VOICEOVER.md", "1. Một.\n");
  assert.ok(existsSync(join(d, "docs", "VOICEOVER.md")));
});

test("layout 3: the music options into the cache, the records following; the QC rounds' raw stills of all but the newest round go", () => {
  const d = mkdtempSync(join(T, "layout-"));
  put(d, "index.html", "<html></html>");
  put(d, "audio/music-options/R1/1-tea.mp3", "mp3");
  put(d, ".moworks/music-options.json", JSON.stringify({ rounds: [{ id: "R1", tracks: [{ file: "audio/music-options/R1/1-tea.mp3" }] }] }));
  put(d, ".moworks/project.json", JSON.stringify({ music: { option: "audio/music-options/R1/1-tea.mp3", file: "assets/3_audio/music/1-tea.mp3" } }));
  for (const r of ["R1", "R2", "R10"]) { put(d, `.moworks/qc/${r}/beats.jpg`, "jpg"); put(d, `.moworks/qc/${r}/raw/frame-00-at-1s.png`, "png"); }
  put(d, "ASSETS.md", "- assets/logo.png");
  assert.equal(layout.LAYOUT_VERSION, 3);
  const r = layout.migrateLayout(d, { classify: () => ({ folder: "1_design/images" }) });
  assert.deepEqual(r.docs, [["ASSETS.md", "docs/ASSETS.md"]]);
  assert.ok(existsSync(join(d, ".moworks", "cache", "music-options", "R1", "1-tea.mp3")) && !existsSync(join(d, "audio")), "audio/ gone with nothing left in it");
  assert.match(readFileSync(join(d, ".moworks", "music-options.json"), "utf8"), /"\.moworks\/cache\/music-options\/R1\/1-tea\.mp3"/);
  assert.equal(JSON.parse(readFileSync(join(d, ".moworks", "project.json"), "utf8")).music.option, ".moworks/cache/music-options/R1/1-tea.mp3");
  assert.deepEqual(["R1", "R2", "R10"].map((x) => existsSync(join(d, ".moworks", "qc", x, "raw"))), [false, false, true], "R10 is the newest, not R2");
  assert.ok(existsSync(join(d, ".moworks", "qc", "R1", "beats.jpg")), "the sheets stay");
  assert.deepEqual(layout.pruneQcRaw(d, { keep: 0 }), ["R10"]);
});

test("the film's history: packed past PACK_AT loose objects, with no sample hooks", async () => {
  const rev = await import("../packages/revisions/index.mjs");
  const d = mkdtempSync(join(T, "git-"));
  put(d, "index.html", "<html></html>");
  rev.save(d, "start");
  assert.ok(!existsSync(join(d, ".git", "hooks")) || !readdirSync(join(d, ".git", "hooks")).some((n) => n.endsWith(".sample")), "no template hooks");
  for (let i = 0; i < rev.PACK_AT + 20; i++) put(d, `compositions/c${i}.html`, `<div>${i}</div>`);
  rev.save(d, "many files");
  const count = execFileSync("git", ["count-objects", "-v"], { cwd: d, encoding: "utf8", windowsHide: true });
  assert.match(count, /^count: 0$/m, count);
  assert.match(count, /^packs: [1-9]/m);
  assert.equal(rev.log(d).length, 2, "nothing lost");
});

test("the shared stage: made once, linked into each film; removing the link never touches the stage", () => {
  let made = 0;
  const shared = stage.ensureShared(stage.sharedDir(T, "library", "engine@abc"), (to) => { made++; put(to, "src/a.ts", "export const a = 1;"); });
  stage.ensureShared(shared, () => { made++; });
  assert.equal(made, 1);
  const f1 = mkdtempSync(join(T, "film-")), f2 = mkdtempSync(join(T, "film-"));
  const d1 = join(f1, ".moworks", "library", "engine"), d2 = join(f2, ".moworks", "library", "engine");
  assert.equal(stage.linkOrCopy(d1, shared), process.platform === "win32" ? "linked" : stage.linkOrCopy(d1, shared));
  assert.equal(stage.linkOrCopy(d1, shared), "same");
  // a film staged before the shared stage: its own copy of the same engine is replaced by the link
  put(f2, ".moworks/library/engine/src/a.ts", "export const a = 1;"); put(f2, ".moworks/library/engine/PINNED", "abc");
  assert.equal(stage.upToDate(d2, shared), false);
  assert.equal(stage.linkOrCopy(d2, shared), process.platform === "win32" ? "linked" : stage.linkOrCopy(d2, shared));
  assert.ok(stage.upToDate(d2, shared));
  assert.equal(readFileSync(join(d2, "src", "a.ts"), "utf8"), "export const a = 1;");
  assert.ok(lstatSync(d1).isSymbolicLink());
  rmSync(f1, { recursive: true, force: true });
  assert.ok(existsSync(join(shared, "src", "a.ts")), "a film removed: the stage stays");
  assert.ok(existsSync(join(d2, "src", "a.ts")));
  assert.equal(stage.rulePath(String.raw`D:\Moworks Studio\app\runtime\stage`), "//d/Moworks Studio/app/runtime/stage");
  const old = Date.now() + 40 * 864e5;
  assert.deepEqual(stage.pruneStage(T, { now: old }), ["library/engine@abc"]);
});

test("Claude reads the stage and never edits it", async () => {
  const { claudeArgs } = await import("../packages/agent/index.mjs");
  const st = String.raw`D:\Moworks Studio\app\runtime\stage`;
  const args = claudeArgs({ settings: { mode: "auto", web: "ask" }, systemPromptFile: "sp.md", sessionArgs: [], stage: st });
  assert.equal(args[args.indexOf("--add-dir") + 1], st);
  const settings = JSON.parse(args[args.indexOf("--settings") + 1]);
  assert.deepEqual(settings.permissions, { ask: ["WebFetch", "WebSearch"], deny: ["Edit(//d/Moworks Studio/app/runtime/stage/**)", "Edit(.moworks/rules/**)", "Edit(.moworks/library/**)"] });
  const by = claudeArgs({ settings: { mode: "bypassPermissions", web: "on" }, systemPromptFile: "sp.md", sessionArgs: [], stage: st });
  assert.ok(!by.includes("--add-dir"), "Bypass reads everywhere");
  assert.equal(JSON.parse(by[by.indexOf("--settings") + 1]).permissions.deny.length, 3, "and still never edits the stage");
});

test("housekeeping: the newest run logs kept, old work folders and unused HyperFrames versions removed, never the current or the previous", async () => {
  const h = await import("../packages/server/housekeeping.mjs");
  const root = mkdtempSync(join(T, "root-"));
  const logs = join(root, "runtime", "logs");
  for (let i = 0; i < 5; i++) put(root, `runtime/logs/render-${1000 + i}.log`, "x");
  put(root, "runtime/logs/app.log", "x");
  assert.equal(h.pruneLogs(logs, { keep: 2 }), 3);
  assert.deepEqual(readdirSync(logs).sort(), ["app.log", "render-1003.log", "render-1004.log"]);
  put(root, "runtime/work/ae/old-film/port.log", "x"); put(root, "runtime/work/ae/new-film/port.log", "x");
  const t = new Date(Date.now() - 10 * 864e5); utimesSync(join(root, "runtime", "work", "ae", "old-film"), t, t);
  assert.equal(h.pruneWork(join(root, "runtime", "work")).length, 1);
  assert.ok(existsSync(join(root, "runtime", "work", "ae", "new-film")));
  for (const v of ["0.8.162", "0.8.163", "0.8.214"]) put(root, `runtime/hf/${v}/node_modules/@hyperframes/producer/package.json`, "{}");
  put(root, "runtime/hf/state.json", JSON.stringify({ current: "0.8.214", previous: "0.8.163", history: [] }));
  assert.deepEqual(await h.pruneHf(root), ["0.8.162"]);
  assert.ok(existsSync(join(root, "runtime", "hf", "0.8.163")) && existsSync(join(root, "runtime", "hf", "0.8.214")) && !existsSync(join(root, "runtime", "hf", "0.8.162")));
});

test("restoring a version from before the move: the version's own documents, at its place", async () => {
  const rev = await import("../packages/revisions/index.mjs");
  const d = mkdtempSync(join(T, "restore-"));
  put(d, "index.html", "<html></html>"); put(d, "NOTES.md", "- v1\n");
  const v1 = rev.save(d, "v1");
  docs.moveDocs(d);
  put(d, "docs/NOTES.md", "- v1\n- v2\n");
  rev.save(d, "v2");
  rev.restoreTree(d, v1, "Opened version: v1");
  assert.ok(!existsSync(join(d, "docs", "NOTES.md")), "the moved copy is not kept in front of the restored one");
  assert.equal(docs.readDoc(d, "NOTES.md"), "- v1\n");
});
