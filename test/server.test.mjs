// Backend: local server security, Style Gallery data, project service (create / open / rename / style / remove / missing).
// Uses a temp work folder (MW_WORK_ROOT) and project list (MW_STATE_DIR); creating a project runs the real HF scaffold.
import { test, before, after } from "node:test";
import { HF_SKILL } from "../packages/hf-edit/hf-scripts.mjs";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-server-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const { startServer } = await import("../packages/server/index.mjs");
const { slugify, starterStoryboard } = await import("../packages/project-service/index.mjs");

let s;
const api = (method, path, body, headers = {}) => fetch(`http://127.0.0.1:${s.port}${path}`, {
  method, headers: { "X-MW-Token": "t0k", ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body && JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

before(async () => { s = await startServer({ token: "t0k" }); });
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });

test("API needs the session token, the server's own Host, and same-origin writes", async () => {
  assert.equal((await api("GET", "/api/health", null, { "X-MW-Token": "wrong" })).status, 401);
  assert.equal((await api("GET", "/api/health")).status, 200);
  assert.equal((await api("POST", "/api/projects/open", { path: "x" }, { Origin: "http://evil.example" })).status, 403);
  const { request } = await import("node:http");
  const status = await new Promise((ok) => request({ host: "127.0.0.1", port: s.port, path: "/api/health", headers: { Host: "evil.example", "X-MW-Token": "t0k" } },
    (r) => { r.resume(); ok(r.statusCode); }).end());
  assert.equal(status, 403);
});

test("Style Gallery: General Style = the Moworks layer over HyperFrames' skills; every style carries the Moworks QC review", async () => {
  const { json } = await api("GET", "/api/styles");
  const general = json.styles.find((x) => x.id === "general");
  assert.equal(general.ruleSource, "Moworks Motion rules");
  assert.equal(general.rules[0].kind, "moworks-rule");
  assert.match(general.rules[0].hash, /^[0-9a-f]{64}$/);
  const hf = general.rules.filter((r) => r.kind === "hf-skill").map((r) => r.name);
  assert.deepEqual(hf, [HF_SKILL, "hyperframes-cli", "hyperframes-registry", "media-use"], "HyperFrames' skills under the Moworks layer");
  assert.deepEqual(general.readFirst, ["general-style"], "only its router first: it names the file each step needs (QC #185)");
  // the retired kit is only on the maintainer's computer: elsewhere its files have no hash (null), never a wrong one
  const kitRoot = (await import("../packages/version-manager/index.mjs")).loadPins().kit?.root, kitHere = !!kitRoot && existsSync(kitRoot);
  assert.ok(general.rules[0].derivedFrom.every((k) => /^[0-9a-f]{64}$/.test(k.hash) || (k.hash === null && !kitHere)), "kit sources recorded");
  for (const s of json.styles) {
    const qc = s.rules.filter((r) => r.role === "qc");
    assert.equal(qc.length, 1, `${s.id}: the QC review`);
    assert.equal(qc[0].name, "moworks-qc");
    // the studio's always-alive rule rides with it on every style
    assert.deepEqual(s.rules.filter((r) => r.role === "alive").map((r) => [r.name, r.available]), [["moworks-alive", true]], `${s.id}: the always-alive rule`);
    // and the house rules, read first in every step
    assert.deepEqual(s.rules.filter((r) => r.role === "studio").map((r) => [r.name, r.available]), [["moworks-studio", true]], `${s.id}: the house rules`);
    // the film kinds every style offers ride along too, read only when the kind is chosen
    assert.ok(s.rules.some((r) => r.role === "kind" && r.kindId === "whatIf" && r.available), `${s.id}: the What If kind`);
    if (s.rules[0].kind === "hf-skill") {
      assert.ok(s.rules.filter((r) => !["qc", "alive", "studio", "kind", "vocab"].includes(r.role)).every((r) => r.kind === "hf-skill" && r.available && r.hash), `${s.id}: HF skills as shipped`);
      assert.ok(s.rules.some((r) => r.name === HF_SKILL), `${s.id}: the composition contract (audit 39 L2)`);
    }
  }
  // HyperFrames' film types: each style built on the hyperframes skill and its type's file, credited at the pinned commit
  const launch = json.styles.find((x) => x.id === "hf-launch");
  assert.deepEqual([launch.rules[0].name, launch.author, launch.credit.licence], [HF_SKILL, "heygen", "Apache-2.0"]);
  assert.match(launch.credit.link, /^https:\/\/github\.com\/heygen-com\/hyperframes\/blob\/[0-9a-f]{40}\/skills\/hyperframes\/references\/types\/launch\.md$/);
  assert.deepEqual(json.styles.filter((x) => x.author === "heygen" && !x.hidden).map((x) => x.id).sort(),
    ["hf-3d", "hf-character", "hf-data", "hf-explainer", "hf-launch", "hf-music", "hf-vertical", "slideshow"]);
  assert.equal((await api("POST", "/api/projects", { title: "x", aspect: "16:9", styleId: "no-such-style" })).status, 400, "no new project in a style the catalog does not have");
  assert.ok(!json.styles.some((x) => /preset/i.test(x.id)), "no Project Presets gallery");
});

test("slug and starter storyboard", () => {
  assert.equal(slugify("Vì sao cầu Rồng phun lửa?"), "vi-sao-cau-rong-phun-lua");
  assert.match(starterStoryboard({ title: "A", aspect: "9:16", durationSec: 45 }), /format: 1080x1920/);
});

let created;
test("create a project: HF film + metadata with the chosen style's sources", { timeout: 120000 }, async () => {
  const bad = await api("POST", "/api/projects", { title: " ", aspect: "16:9", styleId: "general" });
  assert.equal(bad.status, 400);
  const { status, json } = await api("POST", "/api/projects", { title: "Cầu Rồng", brief: "một hai ba", aspect: "9:16", durationSec: 45, styleId: "general", voice: { source: "upload" } });
  assert.equal(status, 200, JSON.stringify(json));
  created = json;
  assert.equal(json.width, 1080); assert.equal(json.height, 1920);
  assert.ok(existsSync(join(json.path, "index.html")) && existsSync(join(json.path, "STORYBOARD.md")));
  assert.equal(json.meta.style.id, "general");
  assert.equal(json.meta.style.source, "Moworks Motion rules");
  assert.equal(json.meta.brief.words, 3);
  assert.equal(json.meta.voice.source, "upload");
  assert.equal(json.stage, "brief");
  const list = await api("GET", "/api/projects");
  assert.equal(list.json.projects.length, 1);
});

test("rename and change style keep the previous style for rollback", async () => {
  const r = await api("PATCH", `/api/projects/${created.id}`, { title: "Cầu Rồng 2", styleId: "hf-explainer" });
  assert.equal(r.status, 200);
  assert.equal(r.json.title, "Cầu Rồng 2");
  assert.equal(r.json.meta.style.id, "hf-explainer");
  assert.equal(r.json.meta.styleHistory.at(-1).id, "general");
});

test("open an existing HF project; a moved folder shows as missing and can be located", async () => {
  const dir = join(T, "elsewhere", "golden");
  cpSync(join(import.meta.dirname, "golden", "hf-native-final"), dir, { recursive: true });
  const before = readFileSync(join(dir, "index.html"), "utf8");
  const o = await api("POST", "/api/projects/open", { path: dir });
  assert.equal(o.status, 200, JSON.stringify(o.json));
  assert.equal(o.json.scenes, 3);
  // an older project is moved into the user's folders when opened: only the paths change in its HF files
  const asNew = before.split("assets/vendor/").join("assets/_app/vendor/").split("assets/fonts/kit/").join("assets/_app/fonts/kit/").split("assets/fonts/").join("assets/1_design/fonts/");
  assert.equal(readFileSync(join(dir, "index.html"), "utf8"), asNew, "the HF files change only in their asset paths");
  assert.equal((await api("POST", "/api/projects/open", { path: join(T, "nope") })).status, 404);
  const moved = dir + "-moved";
  renameSync(dir, moved);
  const g = await api("GET", `/api/projects/${o.json.id}`);
  assert.equal(g.json.missing, true);
  const l = await api("POST", `/api/projects/${o.json.id}/relocate`, { path: moved });
  assert.equal(l.json.missing, false);
});

test("remove from list keeps the folder", async () => {
  const r = await api("DELETE", `/api/projects/${created.id}`);
  assert.equal(r.status, 200);
  assert.ok(existsSync(created.path));
  assert.ok(!(await api("GET", "/api/projects")).json.projects.some((p) => p.id === created.id));
});

test("system checks report every runtime item in plain words", async () => {
  const { json } = await api("GET", "/api/system");
  for (const k of ["hfRuntime", "chromium", "ffmpeg", "node", "python", "fonts", "afterEffects", "storage"]) {
    assert.ok(["ok", "warning", "error"].includes(json.checks[k].status), k);
    assert.ok(json.checks[k].detail, k);
  }
});

test("the system checks run off the server's thread: the app answers other requests while they run", async () => {
  const sys = api("GET", "/api/system");
  const t0 = Date.now();
  const h = await api("GET", "/api/health");
  assert.equal(h.status, 200);
  assert.ok(Date.now() - t0 < 1500, `health took ${Date.now() - t0} ms while the checks ran`);
  assert.equal((await sys).json.checks.node.status, "ok");
});

test("Settings › System lists real folders with one kind of slash, and the Python path is not half forward slashes", async () => {
  const { json } = await api("GET", "/api/system");
  for (const [k, v] of Object.entries(json.storage)) {
    assert.ok(!v.includes("/"), `${k}: ${v}`);
    assert.ok(k === "workRoot" || existsSync(v), `${k} is listed but is not there: ${v}`);
  }
  assert.ok(json.storage.skills, "HyperFrames' skills folder is the pinned clone or the app's copy");
  assert.ok(existsSync(json.storage.skills));
  assert.ok(!/skills$/.test(json.storage.workRoot) && !Object.values(json.storage).some((v) => /[\/]skills$/.test(v) && !existsSync(v)));
  if (json.checks.python.status === "ok") assert.ok(!json.checks.python.detail.includes("/"), json.checks.python.detail);
});

test("the author's rate by default (else 30), 24 · 25 · 30 · 60 but no 60 for Brush; a typed size, even and at most 3840, not for Brush or anidoodle", async () => {
  const { customSize } = await import("../packages/project-service/index.mjs");
  const { styleFormat, styleList } = await import("../packages/style-catalog/index.mjs");
  assert.deepEqual(customSize(2560, 1080), { width: 2560, height: 1080, aspect: "64:27" });
  for (const [w, h] of [[2561, 1080], [4000, 2000], [300, 1000], ["a", 2]]) assert.throws(() => customSize(w, h), /Size/);
  const list = styleList().styles, fmt = (id) => list.find((x) => x.id === id).format;
  assert.deepEqual(fmt("general").fps, { default: 30, choices: [24, 25, 30, 60] });
  assert.equal(fmt("brush-cartoon").fps.default, 24); assert.ok(!fmt("brush-cartoon").fps.choices.includes(60), "#259");
  assert.deepEqual([fmt("brush-cartoon").sizes.custom, fmt("brush-cartoon").sizes.locked, fmt("brush-cartoon").sizes.presets], [false, true, [{ w: 1920, h: 1080, label: "16:9" }]]);
  const own = list.find((x) => x.mg?.size?.[1] > x.mg?.size?.[0]);
  if (own) assert.deepEqual(own.format.sizes.presets[0], { w: own.mg.size[0], h: own.mg.size[1], label: "9:16", own: true }, "the author's own size first");
  const ani = list.find((x) => /^anidoodle-/.test(x.id));
  if (ani) assert.deepEqual([ani.format.sizes.custom, ani.format.fps.slowAt, ani.format.fps.slower], [true, 60, 2.5], "anidoodle draws any size (R&D2 25/10)");
  // each medium at its author's rate (every reference film the author ships, fox.ts included, is 30 fps), not 24
  const fox = list.find((x) => x.id === "anidoodle-fox");
  if (fox) assert.deepEqual([fox.anidoodle.fps, fox.format.fps.default], [30, 30]);
  for (const a of list.filter((x) => /^anidoodle-/.test(x.id))) assert.equal(a.format.fps.default, a.anidoodle.fps ?? 30, a.id);
  const mg = list.find((x) => x.mg?.fps === 24);
  if (mg) assert.equal(mg.format.fps.default, 24, "an MG style's own rate");
  assert.equal(styleFormat({ id: "x", aspects: ["16:9"] }).fps.default, 30);
  // the API: a typed size for General; refused for Brush; 60 fps refused for Brush; an odd size refused
  const c = await api("POST", "/api/projects", { title: "Khổ rộng", brief: "Thử", aspect: "custom", width: 2560, height: 1080, durationSec: 10, styleId: "general" });
  assert.equal(c.status, 200, JSON.stringify(c.json));
  assert.deepEqual([c.json.meta.format.width, c.json.meta.format.height, c.json.meta.format.aspect, c.json.meta.format.custom, c.json.meta.format.fps], [2560, 1080, "64:27", true, 30]);
  assert.match(readFileSync(join(c.json.path, "index.html"), "utf8"), /data-width="2560"[^>]*data-height="1080"|data-height="1080"[^>]*data-width="2560"/);
  assert.equal((await api("POST", "/api/projects", { title: "Lẻ", aspect: "custom", width: 1921, height: 1080, styleId: "general" })).status, 400);
  // the dialog sends width and height with the nearest preset's aspect: a size that is not that preset is a typed one
  const near = await api("POST", "/api/projects", { title: "Gần 16:9", brief: "Thử", aspect: "16:9", width: 2048, height: 1080, durationSec: 10, styleId: "general" });
  assert.deepEqual([near.json.meta.format.width, near.json.meta.format.custom], [2048, true]);
  assert.equal((await api("POST", "/api/projects", { title: "Cọ rộng", aspect: "custom", width: 2560, height: 1080, styleId: "brush-cartoon" })).status, 400);
  // Brush at 60 (an old client): kept to the nearest rate it allows, as before
  assert.equal((await api("POST", "/api/projects", { title: "Cọ 60", brief: "Thử", aspect: "16:9", durationSec: 10, fps: 60, styleId: "brush-cartoon" })).json.meta.format.fps, 30);
  // A style with its author's design takes no Brand Kit from New project
  assert.equal((await api("POST", "/api/projects", { title: "Tác giả", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "slideshow", look: { id: "frame/coral" } })).json.meta.designLocked, true);
  assert.equal(c.json.meta.designLocked, undefined, "General: the owner's design");
  assert.deepEqual(styleList().comingSoon, [], "What If opened (26/10)");
  // New project no longer asks the film's kind: an answer from an old client is not kept (What If is coming soon)
  const k = await api("POST", "/api/projects", { title: "Không loại", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general", answers: { filmKind: "whatIf" } });
  assert.equal(k.json.meta.brief.answers.filmKind, undefined);
});

test("a Lemo style's frame rate is the author's: 24 by default, the rate its demo film was made at when DEMO.md says one", async () => {
  const { styleList } = await import("../packages/style-catalog/index.mjs");
  const lemo = Object.fromEntries(styleList().styles.filter((s) => s.id.startsWith("lemo-")).map((s) => [s.id, s.format.fps.default]));
  if (!Object.keys(lemo).length) return;          // no Lemo clone here
  assert.equal(lemo["lemo-swiss-motion"], 24, "the author's default (DIRECTOR.md)");
  assert.equal(lemo["lemo-watercolor"], 60, "its demo: 1920×1080, 60 fps");
  assert.equal(lemo["lemo-game-show"], 30);
  assert.ok(Object.values(lemo).every((n) => [24, 30, 60].includes(n)));
});

test("before the Build a film says it is not built yet, with its planned length (not the starter's white 3 s)", async () => {
  const c = (await api("POST", "/api/projects", { title: "Chưa dựng", brief: "Thử", aspect: "16:9", durationSec: 20, styleId: "general" })).json;
  const p = (await api("GET", `/api/projects/${c.id}`)).json;
  // the starter's length is the planned one everywhere (the list, the Editor), never its title card's 3 s: the 20 s set and the
  // ending's 2.4 s fade after it (house rules §9)
  assert.deepEqual([p.built, p.plannedDuration, p.duration], [false, 22.4, 22.4]);
  assert.deepEqual(p.length, { content: 20, fade: 2.4, total: 22.4, inside: false, own: false });
});

test("a film not built yet is as long as its storyboard (Claude timed it to the voice: 40 → 47.5 s), not as New project set it", async () => {
  const c = (await api("POST", "/api/projects", { title: "Diều thử", brief: "Thử", aspect: "16:9", durationSec: 40, styleId: "general" })).json;
  writeFileSync(join(c.path, "STORYBOARD.md"), ["---", "format: 1920x1080", "duration: 40s", "---", "",
    "## Frame 1 — Mở", "- duration: 20s", "- scene: Na thả diều", "",
    "## Frame 2 — Kết", "- duration: 27.5s", "- scene: Diều bay cao, chữ kết giữ 2 s", ""].join("\n"));
  const p = (await api("GET", `/api/projects/${c.id}`)).json;
  assert.deepEqual([p.built, p.plannedDuration, p.duration, p.meta.targetDurationSec], [false, 47.5, 47.5, 40]);
});

test("a film's name is one line of at most 120 characters (a storyboard note became the name)", async () => {
  const c = (await api("POST", "/api/projects", { title: "Tên ngắn", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "general" })).json;
  const note = "Một hướng khác hẳn: dùng ảnh quán thật làm nền ngay từ khung 1, chữ hoa cam nổi trên ảnh, bớt nền cam đặc, nhịp nhanh hơn ở đoạn giữa và kết bằng nút đặt bàn.";
  assert.equal((await api("PATCH", `/api/projects/${c.id}`, { title: note })).status, 400);
  assert.equal((await api("PATCH", `/api/projects/${c.id}`, { title: "Hai\ndòng" })).status, 400);
  assert.equal((await api("GET", `/api/projects/${c.id}`)).json.title, "Tên ngắn");
  assert.equal((await api("PATCH", `/api/projects/${c.id}`, { title: "Tên mới" })).json.title, "Tên mới");
});

test("a project whose style id the catalog does not have is answered with no style: no title, no author's design (review 49687a43 #5)", async () => {
  const c = (await api("POST", "/api/projects", { title: "Kiểu đã bỏ", brief: "Thử", aspect: "16:9", durationSec: 10, styleId: "slideshow" })).json;
  assert.equal(c.meta.designLocked, true);
  const f = join(c.path, ".moworks", "project.json"), m = JSON.parse(readFileSync(f, "utf8"));
  writeFileSync(f, JSON.stringify({ ...m, style: { ...m.style, id: "demo-style-not-in-catalog", title: "Demo gone style" } }, null, 2));
  const one = (await api("GET", `/api/projects/${c.id}`)).json;
  assert.equal(one.meta.style, null);
  assert.equal(one.style, null);
  assert.equal(one.meta.designLocked, undefined, "no style: no \"follows the film style\" design");
  const card = (await api("GET", "/api/projects")).json.projects.find((p) => p.id === c.id);
  assert.equal(card.style, null, "the Projects chip shows no style title");
  // a style the catalog has keeps its title
  writeFileSync(f, JSON.stringify(m, null, 2));
  assert.equal((await api("GET", `/api/projects/${c.id}`)).json.meta.style.id, "slideshow");
  assert.equal((await api("GET", "/api/projects")).json.projects.find((p) => p.id === c.id).style.id, "slideshow");
});
