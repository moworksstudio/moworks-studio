// G-GLYPH-CODE, Vietnamese letters a code film draws in a face that lacks them (What If's SVG text, anidoodle's canvas), read from
// the film's code. Fonts here are stand-ins: each file name says which letters it has.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codeGlyphs, gateCodeGlyphs, glyphText } from "../packages/hf-qa/codeGlyphs.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-code-glyphs-"));
after(() => rmSync(T, { recursive: true, force: true }));
const put = (d, rel, text) => { const f = join(d, ...rel.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
// a font file "latin.ttf" has no marked letter; "vi.ttf" has every letter
const fontkitImpl = { openSync: (p) => ({ hasGlyphForCodePoint: (cp) => /vi\.ttf$/.test(p) || cp < 0x80 }) };
const page = (faces) => `<!doctype html><html><head><style data-mw="fonts">${faces.map(([fam, file]) => `@font-face { font-family: "${fam}"; src: url("assets/_app/fonts/${file}"); }`).join("\n")}</style></head><body></body></html>`;

function whatIf(name, shots) {
  const d = join(T, name);
  put(d, ".moworks/library/what-if/engine/fonts.ts", "export const FONT = {\n  title: STUDIO.titleFont ? STUDIO.titleFont.family : 'Bricolage Grotesque',\n  ui: 'Fragment Mono',\n  hand: 'Kalam',\n};\n");
  put(d, ".moworks/library/what-if/engine/ui.tsx", "import { FONT } from './fonts';\nexport const TitleCard = ({ lines }) => (\n  <g><text fontFamily={FONT.title}>{lines[0]}</text></g>\n);\nexport const HudChip = ({ label }) => <text fontFamily={FONT.ui}>{label}</text>;\n");
  put(d, "whatif/shots.tsx", shots);
  put(d, "index.html", page([["Bricolage Grotesque", "bricolage-vi.ttf"], ["Fragment Mono", "fragment-latin.ttf"], ["Roboto Mono", "roboto-vi.ttf"]]));
  for (const f of ["bricolage-vi.ttf", "fragment-latin.ttf", "roboto-vi.ttf"]) put(d, `assets/_app/fonts/${f}`, "x");
  return d;
}

test("What If: Vietnamese in the engine's mono face is found, with its shot, line and face; the same words in a face with them are not", () => {
  const d = whatIf("wi", `import { FONT, HudChip, TitleCard } from "what-if";
// "Trăng" in a comment is never drawn
const VI = { title: 'Bricolage Grotesque', ui: 'Roboto Mono' };
export const S1 = ({ t }) => (
  <g>
    <text fontFamily={FONT.ui} fontSize={40}>Trăng tắt</text>
  </g>
);
export const S2 = ({ t }) => <text fontFamily={VI.ui}>{'Trăng tắt phụt.'}</text>;
export const S3 = ({ t }) => <HudChip label="ĐÊM" />;
export const S4 = ({ t }) => <TitleCard lines={['NẾU MẶT TRĂNG']} />;
`);
  const r = codeGlyphs(d, { fontkitImpl });
  assert.deepEqual(r.findings.map((x) => [x.shot, x.face, x.missing, x.via ?? null]), [
    ["S1", "Fragment Mono", "ăắ", null],
    ["S3", "Fragment Mono", "ĐÊ", "HudChip"],
  ], "S2 is in Roboto Mono (has them), S4's TitleCard in Bricolage (has them)");
  assert.equal(r.findings[0].file, "whatif/shots.tsx");
  assert.equal(r.findings[0].line, 6);
  const g = gateCodeGlyphs(d, { fontkitImpl });
  assert.deepEqual([g.id, g.blocking, g.pass, g.warnings], ["G-GLYPH-CODE", false, false, 2], "a warning, never a block");
  assert.match(glyphText(r), /^Vietnamese letters in a face that lacks them[^\n]*§2b[\s\S]*"Trăng tắt" \(whatif\/shots\.tsx:6, S1\) is set in Fragment Mono, which has no ăắ/);
});

test("a face the film has no file for yet is not judged; a film with no code has no gate", () => {
  const d = whatIf("nofile", `export const S1 = () => <text fontFamily="Patrick Hand">Đêm</text>;\n`);
  assert.deepEqual(codeGlyphs(d, { fontkitImpl }).findings, []);
  const plain = join(T, "plain"); put(plain, "index.html", "<html></html>");
  assert.equal(gateCodeGlyphs(plain, { fontkitImpl }), null);
});

test("anidoodle: the drawn capitals draw a letter they lack as a dash; a canvas font is read from ctx.font", () => {
  const d = join(T, "ani");
  put(d, ".moworks/library/anidoodle/engine/src/canvas-core/drafting.ts", "export const G: Record<string, Glyph> = {\n  A: { l: [] }, B: { l: [] }, N: { l: [] }, G: { l: [] }, T: { l: [] }, R: { l: [] }, '.': { l: [] },\n};\n");
  put(d, "anidoodle/page.ts", `export const draw = (ctx, env, f) => {
  writeOn(ctx, env, "TRĂNG", 100, 200, 60, 1, "ink");
  ctx.font = \`700 \${48}px "Kalam", serif\`;
  ctx.fillText("Đêm nay", 10, 10);
  ctx.font = "400 32px Roboto Mono";
  ctx.fillText("Đêm nay", 10, 60);
};
`);
  put(d, "index.html", page([["Kalam", "kalam-latin.ttf"], ["Roboto Mono", "roboto-vi.ttf"]]));
  for (const f of ["kalam-latin.ttf", "roboto-vi.ttf"]) put(d, `assets/_app/fonts/${f}`, "x");
  const r = codeGlyphs(d, { fontkitImpl });
  assert.deepEqual(r.findings.map((x) => [x.line, x.face, x.missing]), [[2, "anidoodle's drawn capitals", "Ă"], [4, "Kalam", "Đê"]]);
  assert.match(r.findings[0].why, /dash/);
});
