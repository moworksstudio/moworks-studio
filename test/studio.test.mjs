// HyperFrames Studio in the Editor, as the pinned CLI ships it (packages/hf-studio). Studio really starts here (about a second):
// it answers on loopback with its usage data off, the selection it publishes reaches the app, it stops with the app and hand edits
// become a revision. R-MOTIONPATH gives the film GSAP's MotionPathPlugin so Studio never asks the CDN the film's CSP blocks.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStudioHost, freePort, selectionContext, PORT_RANGE } from "../packages/hf-studio/index.mjs";
import { ensureMotionPath } from "../packages/hf-edit/finalize.mjs";
import { motionPathFile } from "../packages/offline-assets/index.mjs";
import * as rev from "../packages/revisions/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-studio-"));
const film = (name) => { const d = join(T, name); cpSync(join(import.meta.dirname, "fixtures", "minimal"), d, { recursive: true }); return d; };
after(() => rmSync(T, { recursive: true, force: true }));

const SNAP = { schemaVersion: 1, projectId: "x", compositionPath: "index.html", sourceFile: "compositions/f1.html", currentTime: 1.5,
  target: { hfId: "hf-ab12", selector: "h1" }, label: "Title", tagName: "h1", boundingBox: { x: 160, y: 410, width: 900, height: 110 },
  textContent: "Ra mắt sản phẩm mới", dataAttributes: {}, inlineStyles: {}, computedStyles: { "font-size": "96px", color: "rgb(17, 17, 17)", margin: "0px" },
  textFields: [], capabilities: {}, thumbnailUrl: "" };

test("selectionContext: the file, the element, its text and the styles Claude needs, nothing else", () => {
  const t = selectionContext(SNAP);
  assert.match(t, /^File: compositions\/f1\.html$/m);
  assert.match(t, /^Element: <h1> \[data-hf-id="hf-ab12"\] \("Title"\)$/m);
  assert.match(t, /^Playhead: 1\.50 s$/m);
  assert.match(t, /^Text: Ra mắt sản phẩm mới$/m);
  assert.match(t, /^Styles: font-size: 96px; color: rgb\(17, 17, 17\)$/m);
  assert.equal(selectionContext(null), null);
});

test("Studio starts for the film on loopback, telemetry off, publishes the selection, stops and commits hand edits", { timeout: 90000 }, async () => {
  const dir = film("demo-film");
  rev.ensureRepo(dir);
  const port = await freePort(4380, 0).catch(() => freePort(4390));
  const stopped = [];
  const host = createStudioHost({ port, onStop: (p) => { stopped.push(p.id); rev.commitAll(p.dir, "Hand edits in HyperFrames Studio"); } });
  assert.equal(host.origins.length, PORT_RANGE);
  const s = await host.open({ id: "abc123", dir });
  assert.equal(s.studioUrl, `http://127.0.0.1:${port}/#project/demo-film`);
  assert.equal(s.url, `http://127.0.0.1:${port}/api/projects/demo-film/preview/.moworks/cache/studio-open.html`, "opened through the defaults page");
  assert.ok(host.origins.includes(s.origin));
  const open = await fetch(s.url);
  assert.equal(open.status, 200, "Studio's own server serves the page, same origin as Studio");
  const openHtml = await open.text();
  assert.match(openHtml, /"theme":"dark"/, "dark unless the user chose");
  assert.match(openHtml, /if \(!\(n in p\)\) p\[n\] = d\[n\]/, "a choice the user made is kept");
  assert.match(openHtml, /location\.replace\("\/#project\/demo-film"\)/);
  const page = await (await fetch(s.origin + "/")).text();
  assert.match(page, /window\.__HF_CLI_TELEMETRY_DISABLED=true/, "Studio is told usage data is off");
  assert.equal((await fetch(`${s.origin}/api/projects`).then((r) => r.json())).projects[0].id, "demo-film");

  assert.equal(await host.selection("abc123"), null, "nothing selected yet");
  const put = await fetch(`${s.origin}/api/projects/demo-film/selection`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection: SNAP }) });
  assert.ok(put.ok, `PUT selection ${put.status}`);
  assert.equal((await host.selection("abc123")).target.hfId, "hf-ab12");
  assert.equal(await host.selection("other"), null, "only the film Studio has open");
  assert.equal((await host.open({ id: "abc123", dir })).url, s.url, "the running Studio is reused");

  writeFileSync(join(dir, "index.html"), readFileSync(join(dir, "index.html"), "utf8").replace("color: #111;", "color: #222;"));      // a hand edit
  await host.stop();
  assert.deepEqual(stopped, ["abc123"]);
  await assert.rejects(fetch(s.origin + "/", { signal: AbortSignal.timeout(2000) }), "Studio is gone");
  assert.equal(rev.log(dir)[0].message, "Hand edits in HyperFrames Studio");
  assert.ok(!rev.isDirty(dir));
});

test("a Studio left by an app that did not close normally is stopped when the app starts again", { timeout: 90000 }, async () => {
  const dir = film("crash-film"), pidFile = join(T, "state", "studio.json");
  const port = await freePort(4386, 0).catch(() => freePort(4396));
  const first = createStudioHost({ port, pidFile });
  const s = await first.open({ id: "c1", dir });
  assert.ok(existsSync(pidFile));
  createStudioHost({ port, pidFile });          // the app starts again without having stopped the first Studio
  await assert.rejects(fetch(s.origin + "/", { signal: AbortSignal.timeout(2000) }), "the leftover Studio is gone");
  assert.ok(!existsSync(pidFile));
  await first.stop();
});

test("R-MOTIONPATH: the film loads MotionPathPlugin from assets/_app/vendor right after GSAP, once", { skip: !existsSync(motionPathFile() ?? "") && "MotionPathPlugin not downloaded (Settings > Health)" }, () => {
  const dir = film("mp-film");
  assert.equal(ensureMotionPath(dir), true);
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.match(html, /<script src="assets\/vendor\/gsap\.min\.js"><\/script>\n<script src="assets\/_app\/vendor\/MotionPathPlugin\.min\.js"><\/script>/);
  assert.deepEqual(readFileSync(join(dir, "assets", "_app", "vendor", "MotionPathPlugin.min.js")), readFileSync(motionPathFile()));
  assert.equal(ensureMotionPath(dir), false, "idempotent");
  assert.equal(readFileSync(join(dir, "index.html"), "utf8").match(/MotionPathPlugin/g).length, 1);
});
