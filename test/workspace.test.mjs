// Backend: shots from STORYBOARD.md + index.html, storyboard edits and approval, the isolated preview origin, posters (HF
// snapshot), project revisions and undo. A real Claude task runs only with MW_TEST_CLAUDE=1 (it uses the signed-in Claude plan).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-ws-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const { startServer } = await import("../packages/server/index.mjs");
const { scaffold } = await import("../packages/hf-edit/scaffold.mjs");
const rev = await import("../packages/revisions/index.mjs");
const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");

let s, id, dir;
const api = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { method, headers: { "X-MW-Token": "k", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};

before(async () => {
  s = await startServer({ token: "k" });
  dir = join(T, "work", "projects", "demo");
  await scaffold(dir, readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  id = (await api("POST", "/projects/open", { path: dir })).json.id;
});
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });

test("shots: storyboard frames joined with the mounted scenes", async () => {
  const { json } = await api("GET", `/projects/${id}/shots`);
  assert.deepEqual(json.shots.map((x) => [x.number, x.start, x.duration]), [[1, 0, 3], [2, 3, 5], [3, 8, 3]]);
  assert.equal(json.shots[1].block, "apple-money-count");
  assert.equal(json.approval, null);
});

test("storyboard edit through HF's writers, approval, and 'changed since approval'", async () => {
  const e = await api("PATCH", `/projects/${id}/shots/2`, { title: "Con số mới", duration: 6, voiceover: "Doanh thu tăng gấp đôi" });
  assert.equal(e.status, 200, JSON.stringify(e.json));
  assert.equal(e.json.shots[1].title, "Con số mới");
  assert.equal(e.json.shots[1].plannedDuration, 6);
  assert.equal(e.json.shots[1].voiceover, "Doanh thu tăng gấp đôi");
  const a = await api("POST", `/projects/${id}/storyboard/approve`);
  assert.equal(a.json.meta.approvals.storyboard.by, "owner");
  assert.equal((await api("GET", `/projects/${id}/shots`)).json.changedSinceApproval, false);
  await api("PATCH", `/projects/${id}/shots/1`, { scene: "Một cảnh khác" });
  assert.equal((await api("GET", `/projects/${id}/shots`)).json.changedSinceApproval, true);
});

test("preview origin: HF player page, project files, nothing private", async () => {
  const { json } = await api("GET", `/projects/${id}/preview`);
  assert.notEqual(new URL(json.url).port, String(s.port), "a different origin from the UI");
  const page = await fetch(json.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<hyperframes-player/);
  const base = json.url.replace("/__preview", "");
  assert.equal((await fetch(`${base}/index.html`)).status, 200);
  for (const p of [".git/HEAD", ".moworks/project.json", "../../state/projects.json"]) assert.ok([403, 404].includes((await fetch(`${base}/${p}`)).status), p);
  assert.equal((await fetch(json.url.replace(/\/[0-9a-f]{24}\//, "/000000000000000000000000/"))).status, 404, "the preview key is required");
});

test("posters: one HF still per shot, served by the preview origin", { timeout: 180000 }, async () => {
  await api("POST", `/projects/${id}/posters`);
  let r; for (let i = 0; i < 90; i++) { await new Promise((ok) => setTimeout(ok, 1500)); r = (await api("GET", `/projects/${id}/posters`)).json; if (r.status !== "running") break; }
  assert.equal(r.status, "ready", JSON.stringify(r));
  assert.equal(r.posters.length, 3);
  const img = await fetch(r.posters[0].url);
  assert.equal(img.headers.get("content-type"), "image/png");
});

test("revisions: commit, list changed files, revert", () => {
  rev.ensureRepo(dir);
  const a = rev.commitAll(dir, "before");
  writeFileSync(join(dir, "compositions", "f1.html"), readFileSync(join(dir, "compositions", "f1.html"), "utf8").replace("Ra mắt", "Khai trương"));
  const b = rev.commitAll(dir, "edit");
  assert.deepEqual(rev.changedFiles(dir, a, b), [{ status: "M", path: "compositions/f1.html", added: 1, removed: 1 }]);
  rev.revert(dir, b);
  assert.match(readFileSync(join(dir, "compositions", "f1.html"), "utf8"), /Ra mắt/);
  assert.ok(!readFileSync(join(dir, ".gitignore"), "utf8").includes("compositions"), "project files are tracked");
});

test("Claude task: edits one shot, checks, undo", { skip: process.env.MW_TEST_CLAUDE !== "1" ? "set MW_TEST_CLAUDE=1 (uses the owner's Claude plan)" : false, timeout: 400000 }, async () => {
  await api("PATCH", "/agent/settings", { model: "haiku", effort: "low" });
  const shots = (await api("GET", `/projects/${id}/shots`)).json.shots;
  const t = (await api("POST", `/projects/${id}/tasks`, { text: 'Đổi chữ tiêu đề của cảnh này thành "Xin chào". Không đổi gì khác.', scope: { kind: "shot", shot: shots[0] } })).json;
  let x; do { await new Promise((ok) => setTimeout(ok, 1500)); x = (await api("GET", `/tasks/${t.id}`)).json; } while (["running", "cancelling"].includes(x.status));
  assert.equal(x.status, "done", x.error);
  assert.ok(x.changed.some((c) => c.path === shots[0].src), JSON.stringify(x.changed));
  // the checks run after the task ends; their result joins it a little later
  for (let i = 0; i < 200 && !x.qa; i++) { await new Promise((ok) => setTimeout(ok, 1500)); x = (await api("GET", `/tasks/${t.id}`)).json; }
  assert.equal(x.qa.pass, true, JSON.stringify(x.qa));
  const u = await api("POST", `/projects/${id}/tasks/${t.id}/revert`);
  assert.equal(u.status, 200, JSON.stringify(u.json));
  assert.ok(!readFileSync(join(dir, shots[0].src), "utf8").includes(">Xin chào<"));
});

test("Claude task in an 'ask first' project: the web question reaches the user, 'this project' turns the web on, usage is recorded",
  { skip: process.env.MW_TEST_CLAUDE !== "1" ? "set MW_TEST_CLAUDE=1 (uses the owner's Claude plan)" : false, timeout: 400000 }, async () => {
  await api("PATCH", "/agent/settings", { model: "haiku", effort: "low", mode: "auto", web: "ask" });
  const t = (await api("POST", `/projects/${id}/tasks`, { text: "Use WebFetch on https://example.com and write its page heading into NOTES.md. Nothing else.", scope: { kind: "project" } })).json;
  let x, asked = false;
  do {
    await new Promise((ok) => setTimeout(ok, 1500));
    x = (await api("GET", `/tasks/${t.id}`)).json;
    if (x.permission && !asked) {
      assert.equal(x.permission.tool, "WebFetch");
      assert.equal((await api("POST", `/projects/${id}/tasks/${t.id}/permission`, { id: x.permission.id, decision: "project" })).status, 200);
      asked = true;
    }
  } while (["running", "cancelling"].includes(x.status));
  assert.ok(asked, "the owner was asked before the web");
  assert.equal(x.status, "done", x.error);
  assert.match(readFileSync(join(dir, "NOTES.md"), "utf8"), /Example Domain/i);
  const r = (await api("GET", `/projects/${id}/tasks`)).json;
  assert.equal(r.own.web, "on", "allowed for this project from now on");
  assert.ok(r.usage.costUsd > 0 && x.usage.turns > 0, JSON.stringify(x.usage));
});
