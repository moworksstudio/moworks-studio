// The Editor's kickoff ran the Character step a second time. Prepare had been started by the autopilot when the
// film opened, so the kickoff stayed pending; a later Editor took it for "the first step not done". The kickoff starts the film's first
// task only. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-kickoff-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");          // signed out: a kickoff that got through would answer 412
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
// a film's git runs queued off the server's thread (revisions): let it finish before the folder goes, or Windows refuses the rm (EPERM)
after(async () => { await (await import("../packages/revisions/index.mjs")).settled(); rmSync(T, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); });

test("a kickoff after the film's first task (or with none pending) starts nothing", async () => {
  const projects = await import("../packages/project-service/index.mjs");
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json() }; };
    const p = (await call("POST", "/projects", { title: "demo-kickoff", aspect: "16:9", durationSec: 10, styleId: "brush-cartoon", brief: "Nori" })).json;
    // Prepare ran already (the autopilot, on open): the kickoff is still pending in the old way of things
    projects.updateMeta(p.id, (m) => { m.kickoff = { pending: true }; });
    mkdirSync(join(p.path, ".moworks"), { recursive: true });
    writeFileSync(join(p.path, ".moworks", "tasks.json"), JSON.stringify({ tasks: [{ id: "t1", projectId: p.id, step: "brief", status: "done", createdAt: new Date().toISOString(), text: "Read the brief" }] }));
    const r1 = await call("POST", `/projects/${p.id}/pipeline/character/run`, { kickoff: true });
    assert.deepEqual([r1.status, r1.json.alreadyStarted], [200, true], JSON.stringify(r1.json));
    projects.updateMeta(p.id, (m) => { m.kickoff = { pending: false }; });
    const r2 = await call("POST", `/projects/${p.id}/pipeline/brief/run`, { kickoff: true });
    assert.equal(r2.json.alreadyStarted, true, "no kickoff pending: nothing starts");
  } finally { await s.close(); }
});

test("no Recap and no film-notes list on the server (the notes go in the chat message)", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const { existsSync } = await import("node:fs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status }; };
    const p = (await (await fetch(`http://127.0.0.1:${s.port}/api/projects`, { method: "POST", headers: { "x-mw-token": "t", "content-type": "application/json" }, body: JSON.stringify({ title: "demo-no-recap", aspect: "16:9", durationSec: 10, styleId: "general", brief: "Thử" }) })).json());
    for (const [m, path] of [["GET", "recap"], ["POST", "recap/open"], ["GET", "film-notes"], ["PUT", "film-notes"], ["POST", "film-notes/send"]])
      assert.equal((await call(m, `/projects/${p.id}/${path}`, m === "GET" ? undefined : {})).status, 404, `${m} ${path}`);
    assert.ok(!existsSync(join(p.path, "RECAP.md")));
  } finally { await s.close(); }
});

test("the voice being made or transcribed shows as the app at work, so the Editor loads the timeline again when it ends", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json() }; };
    const p = (await call("POST", "/projects", { title: "demo-busy-voice", aspect: "16:9", durationSec: 10, styleId: "general", brief: "Thử" })).json;
    let end; const hold = new Promise((r) => { end = r; });
    s.jobs.start("tts", { projectId: p.id, title: "Voice-over from ElevenLabs" }, () => hold);
    assert.deepEqual((await call("GET", `/projects/${p.id}/pipeline`)).json.appBusy?.key, "Making the voice-over");
    end(); await new Promise((r) => setTimeout(r, 20));
    let end2; const hold2 = new Promise((r) => { end2 = r; });
    s.jobs.start("transcribe", { projectId: p.id, title: "Transcribing" }, () => hold2);
    assert.deepEqual((await call("GET", `/projects/${p.id}/pipeline`)).json.appBusy?.key, "Transcribing the voice-over");
    end2();
  } finally { await s.close(); }
});
