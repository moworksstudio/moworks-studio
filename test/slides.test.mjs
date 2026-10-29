// A Google Slides link the user pastes in the brief is read as its PPTX through Google's public export; a deck not
// shared by link is a missing thing Prepare stops on (moworks-studio §2b). No box of its own: the link goes in the brief.
// Google is faked. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-slides-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; rmSync(T, { recursive: true, force: true }); });
const { fetchSlides, slidesLinks } = await import("../packages/server/slides.mjs");
const A = await import("../packages/agent/index.mjs");

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const PPTX = Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(200, 1)]);
const deck = () => new Response(PPTX, { status: 200, headers: { "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "content-disposition": "attachment; filename=\"deck.pptx\"; filename*=UTF-8''Moworks%20Credentials.pptx" } });
const signIn = () => Object.assign(new Response("<html>Sign in</html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }), {});

test("the links: each Google Slides deck once, whatever the link's tail", () => {
  const text = `Xem deck https://docs.google.com/presentation/d/${ID}/edit?usp=sharing và https://docs.google.com/presentation/u/0/d/${ID}/view, rồi https://example.com/x`;
  assert.deepEqual(slidesLinks(text).map((l) => l.id), [ID]);
  assert.deepEqual(slidesLinks("no link here"), []);
});

test("the export: a shared deck comes back as its PPTX with its own name; a deck not shared, missing, or Google out of reach says why", async () => {
  let asked = null;
  const ok = await fetchSlides(ID, { fetchFn: async (u) => { asked = u; return deck(); } });
  assert.equal(asked, `https://docs.google.com/presentation/d/${ID}/export/pptx`);
  assert.deepEqual([ok.ok, ok.name, ok.bytes.length], [true, "Moworks Credentials.pptx", PPTX.length]);
  assert.deepEqual(await fetchSlides(ID, { fetchFn: async () => signIn() }), { ok: false, reason: "not-shared", status: 200 });
  assert.equal((await fetchSlides(ID, { fetchFn: async () => new Response("", { status: 401 }) })).reason, "not-shared");
  assert.equal((await fetchSlides(ID, { fetchFn: async () => new Response("", { status: 404 }) })).reason, "not-found");
  assert.equal((await fetchSlides(ID, { fetchFn: async () => { throw new Error("ENOTFOUND"); } })).reason, "offline");
  assert.equal((await fetchSlides(ID, { fetchFn: async () => new Response("not a zip", { status: 200, headers: { "content-type": "application/octet-stream" } }) })).reason, "not-shared");
});

test("no box of its own for a Slides link (it goes in the brief); a deck the app could not read is Prepare's to ask about", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => (await realFetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined })).status;
    const p = await (await realFetch(`http://127.0.0.1:${s.port}/api/projects`, { method: "POST", headers: { "x-mw-token": "t", "content-type": "application/json" }, body: JSON.stringify({ title: "demo-slides", aspect: "16:9", durationSec: 10, styleId: "general", brief: "Thử" }) })).json();
    assert.equal(await call("POST", `/projects/${p.id}/assets/link`, { url: `https://docs.google.com/presentation/d/${ID}/edit` }), 404, "the separate link box is gone");
  } finally { await s.close(); }
  const m = { title: "x", links: { "https://docs.google.com/presentation/d/9ZyXwVuTsRqPoNmLkJiHgFeDcBa98765/edit": { ok: false, reason: "not-shared" } } };
  const line = A.linksLine(m);
  assert.match(line, /9ZyXwVuTsRqPoNmLkJiHgFeDcBa98765[^)]*\(not shared by link/);
  assert.match(line, /moworks-studio §2b[^]*Share › Anyone with the link[^]*upload the deck as a PPTX/);
  assert.match(A.systemPrompt({ meta: m, rules: [], shots: [], dir: process.cwd(), step: "brief" }), /Google Slides links in the brief the app could not read/);
  assert.equal(A.linksLine({ links: { x: { ok: true } } }), "", "a deck read: nothing to say");
});

test("Prepare reads the brief's Slides links before it starts (the scan then finds the PPTX)", async () => {
  const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
  const projects = await import("../packages/project-service/index.mjs");
  const dir = join(T, "work", "projects", "demo-slides-brief");
  mkdirSync(dir, { recursive: true });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="30"></div>');
  const id = projects.openProject(dir).id;
  const order = [];
  const ctx = {
    root: T, renders: createRenderQueue(), agent: { running: new Map(), list: () => [], start: async () => { order.push("claude"); return { id: "t" }; } },
    pipelineOf: async () => ({ p: projects.getProject(id), facts: {}, state: [] }),
    slidesFromBrief: async () => { order.push("slides"); }, scanAssets: async () => { order.push("scan"); },
    startQa: () => ({ id: "job" }), mix: { useOption: async () => null, placeSfx: async () => null },
  };
  await createAutopilot(ctx).startStep(id, { id: "brief", action: { kind: "claude", prompt: "Read the brief." } }, { fromAuto: true });
  assert.deepEqual(order, ["slides", "scan", "claude"]);
});
