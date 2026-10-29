// The user's own Looks: a guideline's files scanned into a FRAME.md in HF's frame-preset format (here by a stand-in
// for the Claude run, which MW_TEST_CLAUDE=1 runs for real), its stills and the Vietnamese check, versions, the one list beside HF's frame
// presets, lookFrame for the project's frame.md, and the routes (create, upload, list).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-looks-"));
process.env.MW_LOOKS_ROOT = join(T, "looks");
Object.assign(process.env, { MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_BACKUP_ROOT: join(T, "backup"), MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1", MW_NO_ASSET_INSTALL: "1" });
after(() => rmSync(T, { recursive: true, force: true }));
const L = await import("../packages/looks-library/custom.mjs");
const { lookFrame, mediaFile, ffmpegExe } = await import("../packages/looks-library/index.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");

/** A ZIP of stored entries (enough for a PPTX the reader must open). */
function zip(entries) {
  const parts = [], dir = [];
  let off = 0;
  for (const [name, data] of Object.entries(entries)) {
    const n = Buffer.from(name), d = Buffer.from(data), h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 6); c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, n, d); dir.push(c, n); off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(dir), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(dir.length / 2, 8); e.writeUInt16LE(dir.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const PPTX = zip({
  "ppt/theme/theme1.xml": `<a:theme><a:themeElements><a:clrScheme name="Dong Xanh"><a:dk1><a:srgbClr val="0B2A1F"/></a:dk1><a:lt1><a:srgbClr val="F4F1E8"/></a:lt1>
    <a:accent1><a:srgbClr val="1F8A4C"/></a:accent1><a:accent2><a:srgbClr val="E8B931"/></a:accent2></a:clrScheme>
    <a:fontScheme><a:majorFont><a:latin typeface="Be Vietnam Pro"/></a:majorFont><a:minorFont><a:latin typeface="Inter"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>`,
  "ppt/slides/slide1.xml": `<p:sld><a:p><a:r><a:rPr><a:latin typeface="Be Vietnam Pro"/><a:solidFill><a:srgbClr val="1F8A4C"/></a:solidFill></a:rPr><a:t>Đồng Xanh &amp; bạn</a:t></a:r></a:p><a:p><a:r><a:t>Logo: chừa khoảng trống bằng chiều cao chữ Đ.</a:t></a:r></a:p></p:sld>`,
  "ppt/slides/slide2.xml": `<p:sld><a:p><a:r><a:t>Màu chính: xanh lá #1F8A4C</a:t></a:r></a:p></p:sld>`,
});
const google = async () => true;
/** The stand-in for Claude: a FRAME.md in HF's format from the hints. */
const fakeWriter = async ({ hints, inputs, look }) => {
  fakeWriter.seen = { hints, inputs };
  return `---\nversion: alpha\nname: ${look.title} — Frame (video / frame layer)\ndescription: >\n  ${look.title}: green fields, warm paper, one gold accent.\nunit: the frame — 1920×1080\n\ncolors:\n  paper: "#F4F1E8"\n  ink: "#0B2A1F"\n  brand: "#1F8A4C"\n  gold: "#E8B931" # inferred\n\ntypography:\n  display: { fontFamily: "Be Vietnam Pro", cqw: 6, weight: 700 }\n  body:    { fontFamily: "Inter", cqw: 0.9, weight: 400 }\n---\n\n# ${look.title}\n\nAtoms: paper ground, ink text, brand green.\n`;
};

test("a Look made from a guideline: Vietnamese name to a folder, only guideline files taken, the PPTX unpacked, the hints, a FRAME.md, its stills and check", { timeout: 120000 }, async () => {
  assert.equal(L.slugify("Thương hiệu Đồng Xanh"), "thuong-hieu-dong-xanh");
  const m = L.createLook({ title: "Thương hiệu Đồng Xanh" });
  assert.deepEqual([m.id, m.status, m.version], ["custom/thuong-hieu-dong-xanh", "draft", 0]);
  assert.equal(L.createLook({ title: "Thương hiệu Đồng Xanh" }).id, "custom/thuong-hieu-dong-xanh-2", "a second Look of the same name");
  assert.throws(() => L.fileTarget(m.id, "brief.docx"), { code: "INVALID" });
  await assert.rejects(L.scanLook(m.id, { writer: fakeWriter, stills: false, google }), { code: "INVALID" }, "no files yet");
  const deck = L.fileTarget(m.id, "Guideline 2026.pptx"); writeFileSync(deck, PPTX); L.fileAdded(m.id, deck);
  const pic = L.fileTarget(m.id, "logo.png");
  execFileSync(ffmpegExe(APP_ROOT), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x1F8A4C:s=64x64", "-frames:v", "1", pic], { windowsHide: true });
  L.fileAdded(m.id, pic);
  const steps = [];
  const done = await L.scanLook(m.id, { writer: fakeWriter, google, onProgress: (p) => steps.push(p.stage) });
  assert.deepEqual(steps, ["Reading the files", "Colours and fonts", "Writing frame.md", "Preview stills", "Vietnamese check"]);
  const { hints, inputs } = fakeWriter.seen;
  assert.ok(inputs.includes("work/pptx-1/slides.md") && inputs.includes("files/logo.png"), inputs.join(", "));
  assert.ok(["#0B2A1F", "#F4F1E8", "#1F8A4C"].every((c) => hints.colours.includes(c)), "the theme's colours");
  assert.deepEqual(hints.fonts.slice(0, 2), ["Be Vietnam Pro", "Inter"]);
  assert.match(readFileSync(join(process.env.MW_LOOKS_ROOT, "custom", m.slug, "work", "pptx-1", "slides.md"), "utf8"), /Đồng Xanh & bạn/);
  assert.equal(done.status, "ready"); assert.equal(done.version, 1);
  assert.deepEqual(done.swatches, ["#F4F1E8", "#0B2A1F", "#1F8A4C", "#E8B931"]);
  assert.deepEqual(done.fonts, ["Be Vietnam Pro", "Inter"]);
  assert.equal(done.vi.status, "ok");
  assert.equal(done.stills.length, 3, done.error ?? "");
  assert.ok(mediaFile(`custom/${m.slug}/${done.stills[0]}`), "a still the media route serves");
  assert.equal(mediaFile(`custom/${m.slug}/../../x.webp`), null);
});

test("versions: an edit and a restore each make the next version; lookFrame gives the project the current one with its version", async () => {
  const id = "custom/thuong-hieu-dong-xanh";
  const v1 = lookFrame(id);
  assert.equal(v1.version, 1); assert.match(v1.text, /^---\nversion: alpha/);
  await assert.rejects(L.patchLook(id, { frame: "no tokens here" }), { code: "INVALID" });
  const e = await L.patchLook(id, { frame: v1.text.replace("#1F8A4C", "#178040"), title: "Đồng Xanh" }, { stills: false, google });
  assert.deepEqual([e.version, e.title], [2, "Đồng Xanh"]);
  assert.match(lookFrame(id).text, /#178040/);
  const r = await L.restoreVersion(id, 1, { stills: false, google });
  assert.equal(r.version, 3); assert.equal(lookFrame(id).text, v1.text);
  assert.deepEqual(r.versions.map((x) => x.by), ["scan", "edit", "restore"]);
  await assert.rejects(L.restoreVersion(id, 9), { code: "NOT_FOUND" });
  assert.equal(lookFrame("custom/none"), null);
});

test("the one list: the user's Looks first, then HF's 13 frame presets (group hf, not editable); one Look in detail; delete", () => {
  const { free, looks } = L.apiLooks();
  assert.deepEqual(free, { id: null, title: "Free (Claude designs)" });
  const yours = looks.filter((l) => l.group === "yours"), hf = looks.filter((l) => l.group === "hf");
  assert.equal(looks.indexOf(yours[0]), 0);
  assert.equal(hf.length, 13);
  assert.ok(hf.every((l) => !l.editable && l.id.startsWith("frame/") && l.swatches.length && l.source.kind === "hf-preset" && l.source.credit.licence === "Apache-2.0"));
  const d = L.apiLook("custom/thuong-hieu-dong-xanh");
  assert.ok(d.frame && d.versions.length === 3 && d.editable && d.source.files.includes("logo.png"));
  assert.ok(L.apiLook(hf[0].id).frame.startsWith("---"));
  assert.ok(L.parseFrame(L.apiLook(hf[0].id).frame).colors.length >= 3, "HF's own format reads back");
  L.deleteLook("custom/thuong-hieu-dong-xanh-2");
  assert.equal(L.getCustom("custom/thuong-hieu-dong-xanh-2"), null);
});

test("the routes: create, upload a guideline file (raw body), list, scan refused without files, a wrong file refused", async () => {
  process.env.MW_NO_LIBRARY_IMPORT = "1";
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t0k" });
  try {
    const H = { "x-mw-token": "t0k", "content-type": "application/json" };
    const call = (path, init = {}) => fetch(`http://127.0.0.1:${s.port}/api${path}`, { ...init, headers: { ...H, ...init.headers } });
    const made = await (await call("/looks", { method: "POST", body: JSON.stringify({ title: "Route Look" }) })).json();
    assert.equal(made.id, "custom/route-look");
    assert.equal((await call(`/looks/${made.id}/scan`, { method: "POST" })).status, 400);
    const up = await call(`/looks/${made.id}/files`, { method: "POST", body: PPTX, headers: { "x-file-name": encodeURIComponent("Bộ nhận diện.pptx"), "content-type": "application/octet-stream" } });
    assert.equal(up.status, 200);
    assert.deepEqual((await up.json()).source.files, ["Bộ nhận diện.pptx"]);
    assert.equal((await call(`/looks/${made.id}/files`, { method: "POST", body: "x", headers: { "x-file-name": "a.exe" } })).status, 400);
    const list = await (await call("/looks")).json();
    assert.ok(list.looks.some((l) => l.id === made.id));
    const one = await call(`/looks/${made.id}`);
    assert.equal(one.status, 200, "one of the owner's Looks in detail");
    assert.deepEqual((await one.json()).files.map((f) => f.name), ["Bộ nhận diện.pptx"]);
    const hf = list.looks.find((l) => l.group === "hf"), hfOne = await call(`/looks/${hf.id}`);
    assert.equal(hfOne.status, 200, "an HF preset in detail");
    assert.match((await hfOne.json()).frame, /^---/);
    assert.equal((await call(`/looks/${made.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await call(`/looks/${made.id}`)).status, 404);
  } finally { await s.close(); }
});

test("a real scan by Claude (MW_TEST_CLAUDE=1; MW_LOOK_GUIDELINE names a guideline file, else the small deck above)", { skip: process.env.MW_TEST_CLAUDE !== "1" && "set MW_TEST_CLAUDE=1 (one short Claude run on the owner's plan)", timeout: 25 * 60 * 1000 }, async () => {
  const src = process.env.MW_LOOK_GUIDELINE;
  const m = L.createLook({ title: "demo Look scan" });
  const f = L.fileTarget(m.id, src ? src.split(/[\\/]/).pop() : "Guideline.pptx");
  writeFileSync(f, src ? readFileSync(src) : PPTX); L.fileAdded(m.id, f);
  const done = await L.scanLook(m.id, { onProgress: ({ stage }) => console.log(`  ${stage}`) });
  const text = lookFrame(m.id).text;
  console.log(text.slice(0, 1500));
  assert.equal(done.status, "ready");
  assert.ok(done.swatches.length >= 2 && done.fonts.length >= 1, JSON.stringify({ swatches: done.swatches, fonts: done.fonts }));
  assert.match(text, /^---\n[\s\S]*colors:[\s\S]*typography:[\s\S]*\n---\n/);
  assert.equal(done.stills.length, 3);
  if (process.env.MW_LOOK_KEEP) writeFileSync(join(APP_ROOT, "test-output", "look-scan-FRAME.md"), text);
  assert.ok(existsSync(join(process.env.MW_LOOKS_ROOT, "custom", m.slug, "v1", "FRAME.md")));
});

test("a Brand Kit's description comes whole (never cut mid-sentence at 160); a long one ends at a sentence with …", () => {
  const d = "Warm paper, ink and one gold accent, with a single deep green for the brand. Titles in Be Vietnam Pro.";
  assert.equal(L.publicLook({ id: "x", title: "X", description: d, files: [] }).description, d);
  const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} says a little more.`).join(" ");
  const w = L.wholeText(long);
  assert.ok(w.length <= 602 && w.endsWith(". …"), w.slice(-40));
  assert.equal(L.wholeText("x".repeat(700)).length, 601, "no sentence, no space: cut and …");
});
