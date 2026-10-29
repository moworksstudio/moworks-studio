// Gate tests: every bad fixture is blocked before a render starts; clean films pass. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runGates } from "../packages/hf-qa/gates.mjs";
import { ranOutOfTime, withSeamsFallback } from "../packages/hf-qa/qc.mjs";
import { gatedRender } from "../packages/render-pipeline/index.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const FX = join(APP_ROOT, "test", "fixtures");
const OUT = join(APP_ROOT, "test-output", "gates-test");
const byId = (r) => Object.fromEntries(r.gates.map((g) => [g.id, g]));

for (const [label, dir, expected, detail] of [
  ["remote image + undeclared font", "gates/remote", ["G-HF-LINT", "G-REMOTE", "G-FONT"], (g) => assert.equal(g["G-REMOTE"].findings[0].url, "https://picsum.photos/200")],
  // Geist is set on the h1 ("Phim thử nghiệm"): held against the words it draws, not the 14 px line RFlex draws
  ["Vietnamese letters the declared font lacks", "gates/glyph", ["G-GLYPH"], (g) => assert.match(g["G-GLYPH"].findings[0].missing, /ử/)],
  ["the same letters typed in NFD form (HANDOFF note)", "gates/glyph-nfd", ["G-GLYPH"], (g) => assert.match(g["G-GLYPH"].findings[0].missing, /ử/)],
  ["missing local asset (HF lint)", "err-asset", ["G-HF-LINT"], (g) => assert.equal(g["G-HF-LINT"].findings[0].code, "missing_local_asset")],
  ["script error (HF runtime)", "err-script", ["G-HF-SCRIPT"], (g) => assert.equal(g["G-HF-SCRIPT"].findings[0].code, "page_error")],
  ["HF lint error (left/top tween)", "gates/lint", ["G-HF-LINT"], (g) => assert.equal(g["G-HF-LINT"].findings[0].code, "gsap_non_transform_motion")],
]) {
  test(`blocks before render: ${label}`, { timeout: 180000 }, async () => {
    const out = join(OUT, `${dir.replace("/", "-")}.mp4`);
    rmSync(out, { force: true });
    const r = await gatedRender({ projectDir: join(FX, dir), outputPath: out, fps: { num: 30, den: 1 } }, { blank: false });
    assert.equal(r.type, "blocked");
    assert.deepEqual([...r.blockingFailures].sort(), [...expected].sort());
    assert.equal(existsSync(out), false, "a render ran although gates failed");
    detail(byId(r.gates));
  });
}

test("an HF-aliased system font stack is blocked (HF would fetch it from Google Fonts)", { timeout: 180000 }, async () => {
  const r = await runGates(join(APP_ROOT, "test", "golden", "hf-native"), { blank: false });
  const f = byId(r)["G-FONT"];
  assert.equal(f.pass, false);
  assert.ok(f.findings.some((x) => /HF alias/.test(x.reason) && x.file === "compositions/apple-money-count.html"), JSON.stringify(f.findings));
});

test("blank mounted scene is reported (warning, not blocking)", { timeout: 300000 }, async () => {
  // a scene that draws nothing: since HF 0.8.214 the fixture's orbit card shows at its mount (before, the whole scene came out flat),
  // so its file is replaced by an empty one in a copy of the fixture
  const dir = join(OUT, "blank-src");
  rmSync(dir, { recursive: true, force: true }); cpSync(join(FX, "gates", "blank"), dir, { recursive: true });
  writeFileSync(join(dir, "compositions", "orbit-card", "orbit-card.html"), `<!doctype html><html><head><meta charset="UTF-8" /></head><body>
<div id="oc-root" data-composition-id="orbit-card" data-start="0" data-duration="10" data-width="1920" data-height="1080" style="width:1920px;height:1080px;background:#17181a"></div>
<script>window.__timelines = window.__timelines || {};</script></body></html>
`);
  const r = await runGates(dir, { workDir: join(OUT, "blank") });
  const b = byId(r)["G-BLANK"];
  assert.equal(b.pass, false);
  assert.equal(b.blocking, false);
  assert.equal(b.findings[0].composition, "orbit-card");
});

test("clean films pass every gate and render", { timeout: 400000 }, async () => {
  for (const dir of [join(FX, "minimal"), join(APP_ROOT, "test-output", "edit", "scaffold")]) {
    assert.ok(existsSync(join(dir, "index.html")), `${dir} missing (run the edit tests first)`);
    const out = join(OUT, `clean-${dir.split(/[\\/]/).pop()}.mp4`);
    rmSync(out, { force: true });
    const r = await gatedRender({ projectDir: dir, outputPath: out, fps: { num: 25, den: 1 }, workers: 4 }, { workDir: join(OUT, "clean") });
    assert.equal(r.type, "done", JSON.stringify(r.blockingFailures ?? r));
    assert.ok(r.gates.pass);
    assert.ok(existsSync(out));
  }
});

// HF's check has a fixed 120 s budget; running out of it at the transition seams is not a script error in the film.
const deadline = { ok: false, runtime: { findings: [{ severity: "error", code: "check_runtime_failure", message: "Check did not finish within its deadline." }] }, layout: { findings: [] } };
const clean = { ok: true, runtime: { findings: [] }, layout: { findings: [{ severity: "warning", code: "text_box_overflow", message: "x" }] } };
test("check out of HF's time at the seams: run again without them, a layout note instead of a blocking error", async () => {
  for (const wrap of [(x) => x, (x) => Promise.resolve(x)]) {          // the QA job runs it sync, the QC round async
    const calls = [];
    const r = await withSeamsFallback((args) => { calls.push(args); return wrap({ json: structuredClone(calls.length === 1 ? deadline : clean), exitCode: calls.length === 1 ? 1 : 0 }); });
    assert.deepEqual(calls, [["--at-transitions", "--frame-check"], ["--frame-check"]]);
    assert.equal(r.seamsSkipped, true);
    assert.equal(ranOutOfTime(r.json), false);
    assert.deepEqual(r.json.layout.findings.map((x) => x.code), ["text_box_overflow", "transition_seams_not_sampled"]);
    assert.equal(r.json.layout.findings.at(-1).severity, "warning");
  }
  const calls = [];
  const r = withSeamsFallback((args) => { calls.push(args); return { json: structuredClone(clean), exitCode: 0 }; });
  assert.equal(calls.length, 1, "a check that fits in the budget runs once");
  assert.equal(r.seamsSkipped, false);
  const script = { runtime: { findings: [{ severity: "error", code: "page_error", message: "boom" }] } };
  assert.equal(ranOutOfTime(script), false, "a real script error is not the tool's deadline");
});

test("the checks say each part as it starts, so a render's quick check moves", { timeout: 300000 }, async () => {
  const steps = [];
  const r = await runGates(join(FX, "minimal"), { blank: false, onStep: (done, total, what) => steps.push([done, total, what]) });
  assert.ok(r.gates.length > 0);
  const total = steps.at(-1)[1];
  assert.deepEqual(steps.map((s) => s[0]), Array.from({ length: total + 1 }, (_, i) => i), "every part said once, in order, then the end");
  assert.equal(steps[1][2], "HyperFrames' check of the film");
  assert.ok(steps.some((s) => s[2] === "The voice against the sound"), "the voice check is a part of its own (audit 74 Q5)");
  assert.equal(steps.at(-1)[2], null, "the end");
});

// HF's browser stages are skipped after a lint error AND when its session runs out of its 120 s; the app said "after a lint
// error" every time, and the sections HF never ran read as clean passes
test("a skipped browser check says why (lint, out of time, failed); the sections it never ran are not clean passes", async () => {
  const { gatesFromCheckJson } = await import("../packages/hf-qa/gates.mjs");
  const empty = { ok: true, errorCount: 0, warningCount: 0, infoCount: 0, findings: [] };
  const base = { lint: { ...empty, findings: [] }, runtime: { ...empty }, layout: { ...empty }, contrast: { ...empty }, motion: { ...empty } };
  const by = (gs) => Object.fromEntries(gs.map((g) => [g.id, g]));
  // out of time: no lint error, HF's own deadline finding
  const late = by(gatesFromCheckJson({ ...base, browserSkipped: true, runtime: { ...empty, ok: false, errorCount: 1, findings: [{ code: "check_runtime_failure", severity: "error", message: "Check did not finish within its deadline." }] } }, APP_ROOT));
  assert.equal(late["G-HF-LINT"].pass, true);
  assert.deepEqual([late["G-HF-SCRIPT"].blocking, late["G-HF-SCRIPT"].timedOut, late["G-HF-SCRIPT"].skippedReason], [false, true, "deadline"]);
  assert.match(late["G-HF-SCRIPT"].skipped, /ran out of its 120 s/);
  assert.doesNotMatch(late["G-HF-SCRIPT"].skipped, /lint/);
  for (const id of ["G-HF-LAYOUT", "G-HF-CONTRAST", "G-HF-MOTION"]) assert.deepEqual([late[id].pass, late[id].notChecked, late[id].findings[0].code], [false, true, "not_checked"], id);
  // a lint error: its own words in the reason
  const lint = by(gatesFromCheckJson({ ...base, browserSkipped: true, lint: { ...empty, ok: false, errorCount: 1, findings: [{ code: "missing_local_asset", severity: "error", message: "assets/logo.svg is not in the project" }] } }, APP_ROOT));
  assert.equal(lint["G-HF-LINT"].pass, false);
  assert.equal(lint["G-HF-SCRIPT"].skippedReason, "lint");
  assert.match(lint["G-HF-SCRIPT"].skipped, /after a lint error: assets\/logo\.svg is not in the project/);
  // a check that ran: nothing skipped, the sections as HF found them
  const ok = by(gatesFromCheckJson({ ...base, browserSkipped: false }, APP_ROOT));
  assert.deepEqual([ok["G-HF-SCRIPT"].pass, ok["G-HF-SCRIPT"].skippedReason, ok["G-HF-LAYOUT"].pass, ok["G-HF-LAYOUT"].notChecked], [true, undefined, true, undefined]);
});

test("the code-film bridge draws an anidoodle film at half size only under HyperFrames' check", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(join(APP_ROOT, "packages", "hf-edit", "lemoPage.mjs"), "utf8");
  assert.match(src, /var checking = typeof window\.__hfScriptState === "function";/);
  assert.match(src, /return v >= 0\.25 && v <= 1 \? v : checking \? 0\.5 : 1;/, "an explicit preview quality wins; a render (no marker) draws full size");
});

test("G-GLYPH reads only what is drawn: Vietnamese in the page's <title> is no finding (What If demo)", { timeout: 180000 }, async () => {
  const { cpSync, mkdtempSync, readFileSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "mw-glyph-title-"));
  cpSync(join(FX, "gates", "glyph"), d, { recursive: true });
  const f = join(d, "index.html");
  writeFileSync(f, readFileSync(f, "utf8").replace("<head>", "<head>\n<title>NẾU MỘT ĐÊM MẶT TRĂNG BIẾN MẤT?</title>")
    .replace("Xin chào Moworks", "Hello Moworks").replace(/Chữ nhỏ[^<]*/, "Small text").replace("Phim thử nghiệm", "Test film"));
  const g = byId(await runGates(d, { blank: false }));
  assert.equal(g["G-GLYPH"].pass, true, JSON.stringify(g["G-GLYPH"].findings));
  rmSync(d, { recursive: true, force: true });
});

// "THÁP ĐÀI CŨ" pushed 25 px out of the frame's left edge by shot 8's dolly (36.75-37.25 s) stayed HF's info note (its
// canvas warning starts at 5 % of the short edge) between two of its 9 default samples; the Review never saw it
test("words cut at the frame edge are a warning; two layout points a second", async () => {
  const { checkFindings, checkSamples, textCutAtEdge } = await import("../packages/hf-qa/qc.mjs");
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const canvas = { left: 0, top: 0, right: 1080, bottom: 1080, width: 1080, height: 1080 };
  const cut = { code: "canvas_overflow", severity: "info", time: 36.75, selector: "#f8-l2 > span", message: "Text extends outside the composition canvas.", text: "THÁP ĐÀI CŨ",
    rect: { left: -24.69, top: 455, right: 600, bottom: 660 }, containerRect: canvas, overflow: { left: 24.69 }, firstSeen: 36.75, lastSeen: 37.25, heldMs: 500 };
  assert.equal(textCutAtEdge(cut), 25);
  assert.equal(textCutAtEdge({ ...cut, heldMs: 0 }), 0, "one sample: HF's entrance/exit transient");
  assert.equal(textCutAtEdge({ ...cut, rect: { left: -700, top: 455, right: -80, bottom: 660 } }), 0, "fully outside: parked off the frame");
  assert.equal(textCutAtEdge({ ...cut, overflow: { left: 5 } }), 0, "a few px of a glyph's side bearing");
  assert.equal(textCutAtEdge({ ...cut, text: "" }), 0, "not text");
  const [x] = checkFindings({ layout: { findings: [cut] } }, APP_ROOT).layout;
  assert.equal(x.severity, "warning");
  assert.match(x.message, /Words cut at the frame's left edge: "THÁP ĐÀI CŨ" 25 px out, 36\.75-37\.25 s/);
  const d = mkdtempSync(join(tmpdir(), "mw-samples-"));
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="50" data-width="1080" data-height="1080"></div>');
  assert.equal(checkSamples(d), 100);
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="600"></div>');
  assert.equal(checkSamples(d), 120, "capped inside HF's 120 s budget");
  rmSync(d, { recursive: true, force: true });
  const calls = [];
  withSeamsFallback((args) => { calls.push(args); return { json: structuredClone(calls.length === 1 ? deadline : clean), exitCode: 0 }; }, { samples: 100 });
  assert.deepEqual(calls, [["--at-transitions", "--frame-check", "--samples", "100"], ["--frame-check", "--samples", "100"]]);
});
