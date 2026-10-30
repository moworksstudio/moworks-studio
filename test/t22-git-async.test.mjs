// T22-5: on a busy computer every git call of a project's revisions (0.1-0.7 s each, about 40 on the server's requests and jobs: a
// commit before each step, render and check, each hand edit, the pipeline's reads) held the server's thread, and every other request
// waited behind them. The server now uses the async forms: git runs beside the thread, one operation at a time per project (a small queue),
// so two requests never run git in one repository at once and commits keep their order. The sync forms stay for the CLI tools. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-git-async-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_DATA_DIR = join(T, "data");
after(() => rmSync(T, { recursive: true, force: true }));
const rev = await import("../packages/revisions/index.mjs");

const repo = (name) => { const d = join(T, name); mkdirSync(join(d, "compositions"), { recursive: true }); writeFileSync(join(d, "index.html"), "<div>one</div>\n"); return d; };

test("the async forms answer as the sync ones do: commit, changed files, log, a file at a revision, the film's work, revert, restore", async () => {
  const d = repo("same");
  await rev.ensureRepoAsync(d);
  const a = await rev.headAsync(d);
  assert.ok(a, "the first commit");
  assert.equal(rev.head(d), a);
  assert.match(readFileSync(join(d, ".gitignore"), "utf8"), /renders\//);
  assert.equal(await rev.isDirtyAsync(d), false);
  writeFileSync(join(d, "index.html"), "<div>two</div>\n");
  writeFileSync(join(d, "compositions", "s1.html"), "<div>s1</div>\n");
  assert.equal(await rev.isDirtyAsync(d), true);
  const b = await rev.saveAsync(d, "edit");
  assert.notEqual(b, a);
  assert.equal(await rev.commitAllAsync(d, "nothing"), b, "nothing changed: the same revision");
  assert.deepEqual(await rev.changedFilesAsync(d, a, b), rev.changedFiles(d, a, b));
  assert.deepEqual((await rev.changedFilesAsync(d, a, b)).map((x) => [x.status, x.path]), [["A", "compositions/s1.html"], ["M", "index.html"]]);
  assert.deepEqual(await rev.logAsync(d, 5), rev.log(d, 5));
  assert.deepEqual((await rev.logAsync(d, 5)).map((x) => x.message), ["edit", "Project start"]);
  assert.equal(await rev.fileAtAsync(d, a, "index.html"), "<div>one</div>");
  assert.equal(await rev.fileAtAsync(d, a, "no-such-file"), null);
  assert.equal(await rev.lastWorkRevAsync(d), rev.lastWorkRev(d));
  assert.equal(await rev.lastWorkChangeAsync(d, "compositions"), rev.lastWorkChange(d, "compositions"));
  assert.equal(await rev.changedSinceAsync(d, a), true);
  assert.equal(await rev.changedSinceAsync(d, b), false);
  // undo the edit, then open the first state again as a version
  const c = await rev.revertAsync(d, b);
  assert.equal(c, await rev.headAsync(d));
  assert.equal(readFileSync(join(d, "index.html"), "utf8"), "<div>one</div>\n");
  writeFileSync(join(d, "index.html"), "<div>three</div>\n");
  await rev.restoreTreeAsync(d, b, "Opened version: edit");
  assert.equal(readFileSync(join(d, "index.html"), "utf8"), "<div>two</div>\n");
  assert.deepEqual((await rev.logAsync(d, 3)).map((x) => x.message).slice(0, 2), ["Opened version: edit", "Changes before opening a version"]);
  // a merge that cannot be done is said, the repository left clean
  writeFileSync(join(d, "index.html"), "<div>four</div>\n");
  const e = await rev.commitAllAsync(d, "four");
  writeFileSync(join(d, "index.html"), "<div>five</div>\n");
  await rev.commitAllAsync(d, "five");
  await assert.rejects(rev.revertAsync(d, e), { code: "CONFLICT" });
  assert.equal(await rev.isDirtyAsync(d), false);
});

test("one project's git runs one operation at a time, in the order asked: each commit holds exactly its own change", async () => {
  const d = repo("order");
  await rev.ensureRepoAsync(d);
  const asked = [];
  // six requests at once, each writing its file and committing it: without the queue they would share git's index (index.lock)
  for (let i = 0; i < 6; i++) {
    rev.inRepo(d, () => writeFileSync(join(d, `f${i}.txt`), String(i)));
    asked.push(rev.commitAllAsync(d, `c${i}`));
  }
  const revs = await Promise.all(asked);
  assert.equal(new Set(revs).size, 6, "six commits");
  const log = await rev.logAsync(d, 7);
  assert.deepEqual(log.map((x) => x.message), ["c5", "c4", "c3", "c2", "c1", "c0", "Project start"], "in the order they were asked");
  for (let i = 0; i < 6; i++) {
    const from = i ? revs[i - 1] : log.at(-1).rev;
    assert.deepEqual((await rev.changedFilesAsync(d, from, revs[i])).map((x) => x.path), [`f${i}.txt`], `commit ${i} holds its own file only`);
  }
  // a read asked while it waits behind a commit sees that commit; the same read asked twice is answered once
  writeFileSync(join(d, "f6.txt"), "6");
  const commit = rev.commitAllAsync(d, "c6");
  const h1 = rev.headAsync(d), h2 = rev.headAsync(d);
  assert.equal(h1, h2, "one read shared while it waits");
  assert.equal(await h1, await commit);
  // a failing operation does not stop the queue
  await assert.rejects(rev.inRepo(d, async () => { throw new Error("boom"); }), /boom/);
  assert.equal(await rev.headAsync(d), await commit);
});

test("projects run side by side; the server's thread stays free while git works", async () => {
  const ds = ["side-a", "side-b", "side-c"].map(repo);
  await Promise.all(ds.map((d) => rev.ensureRepoAsync(d)));
  for (const d of ds) for (let i = 0; i < 150; i++) writeFileSync(join(d, "compositions", `s${i}.html`), `<div>${d} ${i}</div>\n`);
  let last = performance.now(), longest = 0;
  const iv = setInterval(() => { const now = performance.now(); longest = Math.max(longest, now - last); last = now; }, 20);
  try {
    const out = await Promise.all(ds.flatMap((d) => [rev.commitAllAsync(d, "many"), rev.changedSinceAsync(d, null), rev.logAsync(d, 5)]));
    assert.equal(out.filter((x) => typeof x === "string").length, 3);
  } finally { clearInterval(iv); }
  assert.ok(longest < 400, `the timer waited ${Math.round(longest)} ms while three projects committed 150 files each (at most 400 ms)`);
});

test("the server and Claude's tasks use the async forms only: no sync revisions call on a request or a job", () => {
  const SYNC = /\brev\.(ensureRepo|commitAll|head|isDirty|changedFiles|revert|lastWorkChange|lastWorkRev|changedSince|restoreTree|log|fileAt|save|ignoreLarge)\(/g;
  const files = [...readdirSync(join(import.meta.dirname, "..", "packages", "server")).filter((f) => f.endsWith(".mjs")).map((f) => `packages/server/${f}`), "packages/agent/index.mjs"];
  const bad = [];
  for (const f of files) {
    const src = readFileSync(join(import.meta.dirname, "..", f), "utf8");
    for (const m of src.matchAll(SYNC)) bad.push(`${f}:${src.slice(0, m.index).split("\n").length} ${m[0]}`);
  }
  assert.deepEqual(bad, []);
  const server = readFileSync(join(import.meta.dirname, "..", "packages", "server", "index.mjs"), "utf8");
  assert.doesNotMatch(server, /import \{[^}]*\bmoveGitOut\b[^}]*\} from "\.\.\/revisions\/drive\.mjs"/, "the history moves with moveGitOutAsync");
});
