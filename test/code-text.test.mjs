// The words of a film drawn by code, found shot by shot in its source and written back by hand, for every engine;
// what is not words (a font's name, a class name, a file, markup, a cue's note) is never offered.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codeTexts, setCodeStyle, setCodeText } from "../packages/hf-edit/codeText.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";
import { reactDirs, stageEngine, whatIfSource } from "../packages/what-if-styles/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-code-text-"));
after(() => rmSync(T, { recursive: true, force: true }));
const put = (d, rel, text) => { const f = join(d, ...rel.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
const texts = (d, o) => codeTexts(d, o).items.map((x) => [x.shot, x.text]);

test("What If: each shot's words (a prop, a title's lines, JSX words), placed by the timeline; fonts, classes and helpers never", () => {
  const d = join(T, "wi");
  put(d, "whatif/episode.tsx", "export default 1;\n");
  put(d, "whatif/episode.json", JSON.stringify({ id: "Moon", title: ["NẾU TRĂNG", "BIẾN MẤT?"] }));
  put(d, "whatif/timeline.json", JSON.stringify({ fps: 30, shots: [{ id: "S2", first: 0, len: 30, key: 10 }, { id: "S1", first: 30, len: 60, key: 20 }] }));
  put(d, "whatif/shots.tsx", `import { loadFont } from '@remotion/google-fonts/RobotoMono';
const MONO = 'Roboto Mono';
const Pill = ({ text }) => <text fontFamily={MONO} className="pill big">{text}</text>;
// "Ghi chú" in a comment is never drawn
export const S1 = ({ t }) => (
  <g>
    <Pill text="NGUỒN: NASA" />
    <text fontFamily="Roboto Mono" fill="#F6EFE3">km/h</text>
    <Img src="moon.png" />
  </g>
);
export const S2 = ({ t }) => <VTitle t={t} lines={['NẾU TRĂNG', 'BIẾN MẤT?']} accent={['BIẾN', 'MẤT?']} />;
`);
  assert.deepEqual(texts(d), [[2, "NGUỒN: NASA"], [2, "km/h"], [1, "NẾU TRĂNG"], [1, "BIẾN MẤT?"]], "S1 is the timeline's second shot");
  const items = codeTexts(d).items;
  assert.equal(items[0].time, 1.667, "the shot's key frame, to show it");
  // a word into a prop, a quote in it (an attribute cannot hold one: it becomes {'…'})
  const r = setCodeText(d, items[0].id, 'NGUỒN: "NOAA"', { was: "NGUỒN: NASA" });
  assert.equal(r.changed, true);
  assert.match(readFileSync(join(d, "whatif/shots.tsx"), "utf8"), /<Pill text=\{'NGUỒN: "NOAA"'\} \/>/);
  // a title's line: the episode's title too, and the accent word that left it is said
  const line = codeTexts(d).items.find((x) => x.text === "BIẾN MẤT?");
  const w = setCodeText(d, line.id, "TẮT PHỤT?");
  assert.match(readFileSync(join(d, "whatif/shots.tsx"), "utf8"), /lines=\{\['NẾU TRĂNG', 'TẮT PHỤT\?'\]\}/);
  assert.deepEqual(JSON.parse(readFileSync(join(d, "whatif/episode.json"), "utf8")).title, ["NẾU TRĂNG", "TẮT PHỤT?"]);
  assert.match(w.warnings.join(" "), /"BIẾN", "MẤT\?" were highlighted/);
  // the file changed under the user: refused, nothing written
  const km = codeTexts(d).items.find((x) => x.text === "km/h");
  assert.throws(() => setCodeText(d, km.id, "dặm/giờ", { was: "km per hour" }), { code: "STALE" });
  assert.throws(() => setCodeText(d, km.id, "  "), { code: "INVALID" });
  setCodeText(d, km.id, "dặm/giờ <nhanh>");
  assert.match(readFileSync(join(d, "whatif/shots.tsx"), "utf8"), /\{'dặm\/giờ <nhanh>'\}<\/text>/, "JSX words with a sign JSX cannot hold");
});

test("lemo: a text-like key, a line constant, a textContent, placed by its second; markup, classes and ids never", () => {
  const d = join(T, "lemo");
  put(d, "compositions/lemo/main.js", `const DLINE = "Mỗi dự án xứng đáng một ý tưởng riêng.".normalize("NFC");
const ui = { dtext: $("dtext") }; el.className = "layer flash"; el.innerHTML = '<svg><path d="M0 0"/></svg>';
function plateAt(ft) {
  if (ft < 9) return { a: 7.47, b: 9.7, cap: "đạo diễn ở Việt Nam", num: 19 };
  return { a: 9.85, b: 14.3, cap: ft > 12 ? "đạo diễn" : "đạo diễn · 11 nước" };
}
ui.dtext.textContent = "Chương I";
document.querySelector(".Title").classList.add("On Air");
`);
  const shots = [{ number: 1, start: 0, duration: 9.8 }, { number: 2, start: 9.8, duration: 5 }];
  assert.deepEqual(texts(d, { shots }), [[null, "Mỗi dự án xứng đáng một ý tưởng riêng."], [1, "đạo diễn ở Việt Nam"], [2, "đạo diễn"], [2, "đạo diễn · 11 nước"], [null, "Chương I"]]);
  const it = codeTexts(d, { shots }).items.find((x) => x.text === "đạo diễn ở Việt Nam");
  setCodeText(d, it.id, 'đạo diễn "trẻ" ở Việt Nam', { shots });
  assert.match(readFileSync(join(d, "compositions/lemo/main.js"), "utf8"), /cap: "đạo diễn \\"trẻ\\" ở Việt Nam"/, "the quote escaped");
});

test("mg-styles: words handed to the film's helpers; class names, file names and the fonts' sample words never", () => {
  const d = join(T, "mg");
  put(d, "compositions/mg/film.js", `const fontLoads = ["Đặt bàn ngay"];
const sub = mk("div", "sub", c, "Từ trend tới bàn ăn");
const g = img("Hotpot story.png"); const fl = mk("div", "layer flash");
aside(c, 290, 1140, "(bảng hashtag TikTok)");
const card = { l1: "DÁM", l2: "KHÔNG?!", lb: "King BBQ" };
`);
  assert.deepEqual(texts(d).map((x) => x[1]), ["Từ trend tới bàn ăn", "(bảng hashtag TikTok)", "DÁM", "KHÔNG?!", "King BBQ"]);
});

test("anidoodle: the canvas's words and a line typed one letter a span; its characters, sheets and checks never", () => {
  const d = join(T, "ani");
  put(d, "anidoodle/page.ts", `export const draw = (ctx, env, f) => {
  writeOn(ctx, env, "TRĂNG", 100, 200, 60, 1, "ink");
  ctx.fillText("Đêm nay", 10, 10);
  push("the film is not 720 frames");
};
export const FILM = { title: "Mira và cỗ máy", fps: 30, durationFrames: 600 };
`);
  put(d, "anidoodle/characters/mira/index.ts", `export const spec = { description: "Nine-year-old inventor" };`);
  put(d, "anidoodle/films/sheet-mira.ts", `caption(ctx, env, "THREE-QUARTER", 0, 0, 20, 1, "plain");`);
  put(d, "index.html", `<html><body><div data-hf-id="hf-1" class="tl"><span data-hf-id="hf-2" class="ch">M</span><span data-hf-id="hf-3" class="ch">i</span><span data-hf-id="hf-4" class="ch">&nbsp;</span><span data-hf-id="hf-5" class="ch">ỗ</span></div></body></html>`);
  assert.deepEqual(texts(d).map((x) => x[1]), ["TRĂNG", "Đêm nay", "Mi ỗ"]);
  const line = codeTexts(d).items.find((x) => x.prop === "letters");
  setCodeText(d, line.id, "Mưa");
  assert.match(readFileSync(join(d, "index.html"), "utf8"), /<div data-hf-id="hf-1" class="tl"><span class="ch">M<\/span><span class="ch">ư<\/span><span class="ch">a<\/span><\/div>/, "one span a letter, HF gives them ids when the Editor opens");
});

const wi = whatIfSource(), ready = wi?.intact && reactDirs();
test("What If, built: a word changed by hand is in the film's bundle at once", { skip: ready ? false : "the What If copy or its React is not installed", timeout: 120000 }, async () => {
  const d = join(APP_ROOT, "test-output", `code-text-${process.pid}`);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(join(d, "whatif"), { recursive: true });
  try {
    stageEngine(d);
    const src = join(d, ".moworks", "library", "what-if", "episodes", "rewind");
    cpSync(join(src, "timeline.json"), join(d, "whatif", "timeline.json"));
    writeFileSync(join(d, "whatif", "shots.tsx"), readFileSync(join(src, "shots.tsx"), "utf8").replace(/from ['"]\.\.\/\.\.\/engine['"]/g, 'from "what-if"'));
    writeFileSync(join(d, "whatif", "episode.tsx"), readFileSync(join(src, "index.tsx"), "utf8").replace(/from ['"]\.\.\/\.\.\/engine['"]/g, 'from "what-if"').replace(/export const rewind = /, "export default "));
    const { freshFilm } = await import("../packages/hf-edit/codeFilm.mjs");
    await freshFilm(d);
    const it = codeTexts(d).items[0];
    assert.ok(it, "the worked episode has words");
    setCodeText(d, it.id, "LỜI MỚI");
    const r = await freshFilm(d);
    assert.equal(r.error, undefined);
    assert.ok(r.built);
    // esbuild writes letters beyond ASCII as \uXXXX escapes
    const js = readFileSync(join(d, "compositions", "whatif", "film.js"), "utf8").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    assert.ok(js.includes("LỜI MỚI"));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("What If: a word's font and size are read from its own tag, written there (an SVG text's attribute added, a piece's size prop), a family imported; a piece that sets its own font says so", () => {
  const d = join(T, "wi-style");
  put(d, "whatif/episode.tsx", "export default 1;\n");
  put(d, "whatif/shots.tsx", `const MONO = 'Roboto Mono';
const VPill = ({ text, size = 40 }) => <text fontFamily={MONO} fontSize={size}>{text}</text>;
export const S1 = ({ t }) => (
  <g>
    <VPill text="NGUỒN: NASA" size={40} />
    <text fontFamily={MONO} fontSize={56}>km/h</text>
    <text>Đêm</text>
  </g>
);
`);
  const of = (text) => codeTexts(d).items.find((x) => x.text === text);
  assert.deepEqual(of("km/h").style, { size: { value: 56, editable: true }, font: { value: "Roboto Mono", editable: true } });
  assert.deepEqual(of("NGUỒN: NASA").style.font, { value: "Roboto Mono", editable: false, why: "This piece sets its own font: pin a note for Claude" }, "VPill sets its own face");
  assert.equal(of("NGUỒN: NASA").style.size.value, 40);
  const pill = of("NGUỒN: NASA").id, night = of("Đêm").id;
  setCodeStyle(d, of("km/h").id, { size: 80, font: "Be Vietnam Pro" });
  assert.equal(of("NGUỒN: NASA").id, pill, "an import added above does not change another word's id");
  setCodeStyle(d, pill, { size: 52 });
  setCodeStyle(d, night, { size: 30, font: "Be Vietnam Pro" });
  const src = readFileSync(join(d, "whatif/shots.tsx"), "utf8");
  assert.equal(src.split("\n")[0], 'import "@remotion/google-fonts/BeVietnamPro";', "imported once");
  assert.equal(src.match(/google-fonts\/BeVietnamPro/g).length, 1);
  assert.match(src, /<text fontFamily="Be Vietnam Pro" fontSize=\{80\}>km\/h<\/text>/);
  assert.match(src, /<VPill text="NGUỒN: NASA" size=\{52\} \/>/);
  assert.match(src, /<text fontFamily="Be Vietnam Pro" fontSize=\{30\}>Đêm<\/text>/, "an SVG text without them gets both");
  assert.throws(() => setCodeStyle(d, pill, { font: "Inter" }), { code: "NOT_EDITABLE" });
  assert.throws(() => setCodeStyle(d, pill, { size: 2 }), { code: "INVALID" });
});

test("lemo, mg, anidoodle: no face or size by hand (set in the film's code): the words only", () => {
  assert.ok(codeTexts(join(T, "lemo")).items.every((x) => x.style === null));
});
