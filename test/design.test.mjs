// New project's Style → Look. What the project takes (a style that turns design off takes none), what the app writes (frame.md from
// the Look, as HyperFrames ships it), and the lines Claude reads before the brief: the Brand Kit wins for its parts, the rest follows the
// brief (a project made before with other design fields reads as the Brand Kit alone). Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ASKED_KIT_FILE, designChoice, keepAskedKit, writeDesign } from "../packages/project-service/design.mjs";
import { lookFrame } from "../packages/looks-library/index.mjs";
import { designLines } from "../packages/agent/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-design-"));
after(() => rmSync(T, { recursive: true, force: true }));
const fresh = (n) => { const d = join(T, n); mkdirSync(d, { recursive: true }); return d; };

test("what the project takes from the dialog", () => {
  assert.deepEqual(designChoice({ look: { id: "frame/coral" }, visualStyle: { id: "style/swiss-pulse" }, palette: { id: "palette/tea" } }), { look: { id: "frame/coral" } },
    "the Look alone; other fields are ignored");
  assert.deepEqual(designChoice({ look: { id: "frame/coral" } }, { locked: true }), { look: null }, "a style with its own design takes none");
  assert.equal(designChoice({ design: { id: "frame/coral" } }).look.id, "frame/coral", "the old design field: a frame preset");
  assert.deepEqual(designChoice({}), { look: null });
});

test("the app writes the design: the Look's frame.md as HyperFrames ships it", async () => {
  const fr = lookFrame("frame/coral");
  assert.ok(fr?.text, "HF's frame preset is readable");
  const a = fresh("look");
  const ma = await writeDesign(a, designChoice({ look: { id: "frame/coral" } }));
  const fa = readFileSync(join(a, "frame.md"), "utf8");
  assert.equal(fa, fr.text.replace(/\s*$/, "\n"), "the Look's FRAME.md unchanged");
  assert.ok(!existsSync(join(a, "design.md")));
  assert.equal(ma.look.title, fr.title); assert.match(ma.look.hash, /^[0-9a-f]{16}$/);
  // free: nothing written, the design is Claude's
  const b = fresh("free");
  const mb = await writeDesign(b, designChoice({ look: null }));
  assert.ok(!existsSync(join(b, "frame.md")) && !existsSync(join(b, "design.md")));
  assert.deepEqual(mb, { look: null });
});

test("a Brand Kit chosen for an author's style is kept for Prepare to ask about, never applied (T25)", async () => {
  const fr = lookFrame("frame/coral");
  const d = fresh("asked");
  const kit = await keepAskedKit(d, { id: "frame/coral" }, { now: "2026-10-30T00:00:00.000Z" });
  assert.deepEqual([kit.id, kit.title, kit.file, kit.at], ["frame/coral", fr.title, ASKED_KIT_FILE, "2026-10-30T00:00:00.000Z"]);
  assert.equal(readFileSync(join(d, ...ASKED_KIT_FILE.split("/")), "utf8"), fr.text.replace(/\s*$/, "\n"), "its spec as a reference");
  assert.ok(!existsSync(join(d, "frame.md")), "not the film's design");
  assert.equal(await keepAskedKit(d, null), null);
  const lines = designLines({ designLocked: true, brandKitAsk: kit }, d).join("\n");
  assert.match(lines, /the style's author's own[^\n]*no Brand Kit is applied to it/);
  assert.match(lines, new RegExp(`chose the Brand Kit "${fr.title}"[^\\n]*did not apply it \\(its design spec, a reference only: \\.moworks/brand-kit/FRAME\\.md; never copy it to frame\\.md\\)`));
  assert.match(lines, /In Prepare, ask how to use it, as one numbered point[^\n]*moworks-studio §2b[^\n]*write it in docs\/ASSETS\.md/);
  assert.doesNotMatch(designLines({ designLocked: true }, d).join("\n"), /chose the Brand Kit/, "none chosen: no question");
  assert.doesNotMatch(designLines({ brandKitAsk: kit }, d).join("\n"), /chose the Brand Kit "/, "a style that takes a design: not asked");
});

test("what Claude reads before the brief: the design lines, and the check of the brief against them", async () => {
  const a = fresh("lines");
  const m = await writeDesign(a, designChoice({ look: { id: "frame/coral" } }));
  const withLook = designLines(m, a).join("\n");
  assert.match(withLook, /colours, type and layout\. The app wrote it to frame\.md/);
  assert.match(withLook, /wins for its parts: leave the brief's design words for those parts aside \(a brief that asks otherwise for one of them is a conflict: stop and ask/);
  assert.match(withLook, /The rest \(motion\) comes from the brief/);
  // A Brand Kit font with no Vietnamese letters (or one the app lacks) is a stop with concrete choices, never a swap
  assert.match(withLook, /A Brand Kit value \(a font, a colour\) is never changed by you/);
  assert.match(withLook, /offer 2-3 fonts that draw Vietnamese[^.]*Inter/);
  assert.match(withLook, /"upload the font file" when the app does not have it/);
  assert.doesNotMatch(withLook, /Never ask the owner about it|set those words in the closest font/);
  const checked = designLines(m, a, { families: [{ family: "Brand Serif", available: false, vi: null }, { family: "Inter", available: true, vi: true }, { family: "Old Display", available: true, vi: false }] }).join("\n");
  assert.match(checked, /Brand Serif: the app does not have it[^;]*; Old Display: it has no Vietnamese letters\. Stop in Prepare/);
  assert.doesNotMatch(checked, /Inter: /);
  // a project made before with other design fields (meta.visualStyle, meta.palette): they are ignored
  const b = fresh("lines-free");
  const old = designLines({ ...m, visualStyle: { id: "style/swiss-pulse", title: "Swiss Pulse", part: "motion" }, palette: { id: "palette/tea", title: "Tea" } }, a).join("\n");
  assert.equal(old, withLook);
  assert.match(designLines({ visualStyle: { id: "style/shadow-cut", title: "Shadow Cut", part: "all" }, palette: { id: "palette/tea", title: "Tea" } }, b).join("\n"), /Design: from the brief \(no Brand Kit chosen\)/);
  // An author's style keeps the author's design; brand colours asked for are listed, confirmed, then followed
  const locked = designLines({ designLocked: true }, b).join("\n");
  assert.match(locked, /the style's author's own/);
  assert.match(locked, /differ from the author's are a conflict: stop, list each point with its choices and wait for the owner/);
  assert.match(locked, /apply a Brand Kit only when the owner asks/);
  assert.match(designLines({}, b).join("\n"), /Design: from the brief/);
  for (const m0 of [{}, m, { designLocked: true }]) assert.doesNotMatch(designLines(m0, b).join("\n"), /Art Direction|Colours|numbered line per conflict|keep the Look or follow the brief/);
});

test("the app checks the Brand Kit's fonts: on Google Fonts or bundled, a file in the assets, Vietnamese letters", async () => {
  const { brandKitFonts } = await import("../packages/agent/index.mjs");
  const d = fresh("brand-fonts");
  writeFileSync(join(d, "frame.md"), "---\ntypography:\n  title: { fontFamily: \"Be Vietnam Pro\" }\n  body: { fontFamily: \"Acme Brand Sans\" }\n  label: { fontFamily: \"Old Display\" }\n---\n");
  mkdirSync(join(d, "assets", "1_design", "fonts"), { recursive: true });
  const google = async (fam) => ({ "Old Display": false, "Be Vietnam Pro": true })[fam] ?? null;          // on Google Fonts with Vietnamese, without, or not there
  const none = await brandKitFonts(d, { google });
  assert.deepEqual(none.families.map((f) => [f.family, f.available, f.vi]), [["Be Vietnam Pro", true, true], ["Acme Brand Sans", false, null], ["Old Display", true, false]]);
  writeFileSync(join(d, "assets", "1_design", "fonts", "AcmeBrandSans-Regular.otf"), "x");
  assert.equal((await brandKitFonts(d, { google })).families[1].available, true, "the owner's font file in the assets");
  assert.equal(await brandKitFonts(fresh("no-frame"), { google }), null);
});

test("font_check tells Claude, before it names a font, whether the app can serve it and whether it draws Vietnamese", async () => {
  const { checkFonts, fontCheckText, systemPrompt } = await import("../packages/agent/index.mjs");
  const d = fresh("font-check");
  const google = async (fam) => ({ Montserrat: false, "Be Vietnam Pro": true })[fam] ?? null;
  const text = fontCheckText(await checkFonts(d, ["Montserrat", "Inter", "Made Up Sans", "Be Vietnam Pro"], { google }));
  assert.match(text, /Montserrat: no Vietnamese letters/);
  assert.match(text, /Inter: OK, draws Vietnamese/);
  assert.match(text, /Made Up Sans: the app cannot get it/);
  assert.match(text, /Be Vietnam Pro: OK/);
  assert.match(text, /Vietnamese fonts the app bundles: [^\n]*Roboto Flex/);
  assert.match(systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: d, step: "brief" }), /call the app's font_check with it[^"]*stop and ask \(moworks-studio §2b\)/);
});
