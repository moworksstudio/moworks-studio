// G-GLYPH-CODE: Vietnamese letters a code film draws in a face that lacks them. G-GLYPH reads the HTML's text, but a
// What If film's words are SVG <text> built by its bundle (whatif/*.tsx) and an anidoodle film draws on a canvas (anidoodle/*.ts), so
// neither reaches it: Chrome then draws the missing letters in a system face (a mixed face on screen), and anidoodle's hand-drawn
// capitals (drafting.ts G) draw a letter they lack as a dash. A static read, a warning (the Tech checks dialog, the storyboard's and the
// Review's tool replies): each string literal or JSX text with Vietnamese marked letters, the face of the nearest font before it (a
// fontFamily, a canvas font, a component whose own text is set in a face, anidoodle's drawn capitals), and the letters that face's files
// lack. A face the film has no file for yet is not judged. moworks-studio §2b: a font conflict is a stop with choices.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";

// Vietnamese letters with a mark (the plain vowels and đ's base are in every latin face)
const VI_MARKED = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/u;
const marked = (s) => [...new Set([...s.normalize("NFC")].filter((c) => VI_MARKED.test(c)))];
const DRAWN = "anidoodle's drawn capitals";
const DRAWN_CALLS = /\b(writeOn|sentence|caption|letter|logo)\s*\(/g;

const walk = (d, ok) => { const out = []; if (!existsSync(d)) return out; for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) { if (n !== "node_modules") out.push(...walk(f, ok)); } else if (ok(n)) out.push(f); } return out; };
const read = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };
/** Comments blanked (same length, so positions and lines stay), strings kept. */
function blankComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)/g, (m, str) => (str ? m : m.replace(/[^\n]/g, " ")));
}
const lineAt = (s, i) => s.slice(0, i).split("\n").length;

/** Names a file gives fonts: const X = 'Family' and const X = { key: 'Family', … } → { "X": f, "X.key": f }. */
function fontConsts(src) {
  const out = {};
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*=\s*(['"])([^'"]+)\2/g)) out[m[1]] = m[3];
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_]\w*)\s*(?::[^=]+)?=\s*\{([^{}]*)\}/g))
    for (const k of m[2].matchAll(/([A-Za-z_]\w*)\s*:\s*(?:[^,'"]*\?\s*[^,:]*:\s*)?(['"])([^'"]+)\2/g)) out[`${m[1]}.${k[1]}`] = k[3];
  return out;
}
/** The first family of a CSS font shorthand or a family list ("700 48px \"Kalam\", serif" → Kalam). */
function firstFamily(css) {
  const tail = /\d(?:px|pt|em|rem|%)\s*(?:\/\s*[\d.]+\w*\s*)?(.*)$/.exec(css)?.[1] ?? css;
  return tail.split(",")[0].trim().replace(/^["'`]|["'`]$/g, "").trim() || null;
}
/** A fontFamily value as written (a quoted name, NAME or NAME.key, a {…} expression) → its family, or null. */
function familyOf(expr, consts) {
  const e = expr.replace(/^\{|\}$/g, "").trim();
  const q = /^(['"`])([^'"`]+)\1$/.exec(e);
  if (q) return firstFamily(q[2]);
  return consts[e] ?? null;
}
/** Components and the faces their own text is set in: export const Name … up to the next top-level const. */
function componentFonts(src, consts) {
  const out = {};
  const starts = [...src.matchAll(/^(?:export\s+)?(?:const|function)\s+([A-Z]\w*)/gm)];
  starts.forEach((m, i) => {
    const body = src.slice(m.index, starts[i + 1]?.index ?? src.length);
    const fams = [...body.matchAll(/fontFamily\s*[=:]\s*(\{[^}]*\}|"[^"]*"|'[^']*')/g)].map((x) => familyOf(x[1], consts)).filter(Boolean);
    if (fams.length) out[m[1]] = [...new Set(fams)];
  });
  return out;
}

/** The literals and JSX words with Vietnamese marked letters: { at, text }. */
function viTexts(src) {
  const out = [];
  for (const m of src.matchAll(/"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g)) {
    const t = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
    if (VI_MARKED.test(t)) out.push({ at: m.index, text: t });
  }
  for (const m of src.matchAll(/>([^<>{}"'`]*)</g)) if (VI_MARKED.test(m[1])) out.push({ at: m.index + 1, text: m[1].trim() });
  return out.sort((a, b) => a.at - b.at);
}

/** The face nearest before `at`: { face, faces } or null (none found close enough to judge). */
function faceBefore(src, at, consts, comps, { anidoodle }) {
  const from = Math.max(0, at - 1500), win = src.slice(from, at);
  const cands = [];
  for (const m of win.matchAll(/fontFamily\s*[=:]\s*(\{[^}]*\}|"[^"]*"|'[^']*'|[A-Za-z_][\w.]*)/g)) { const f = familyOf(m[1], consts); if (f) cands.push({ i: m.index, faces: [f] }); }
  for (const m of win.matchAll(/<([A-Z]\w*)\b/g)) if (comps[m[1]]) cands.push({ i: m.index, faces: comps[m[1]], via: m[1] });
  if (anidoodle) {
    for (const m of win.matchAll(/\.font\s*=\s*(`[^`]*`|"[^"]*"|'[^']*')/g)) { const f = firstFamily(m[1].slice(1, -1).replace(/\$\{[^}]*\}/g, "1")); if (f) cands.push({ i: m.index, faces: [f] }); }
    for (const m of win.matchAll(/\bfont\s*:\s*\([^)]*\)\s*=>\s*(`[^`]*`|"[^"]*"|'[^']*')/g)) { const f = firstFamily(m[1].slice(1, -1).replace(/\$\{[^}]*\}/g, "1")); if (f) cands.push({ i: m.index, faces: [f] }); }
    for (const m of win.matchAll(DRAWN_CALLS)) cands.push({ i: m.index, faces: [DRAWN] });
  }
  return cands.sort((a, b) => b.i - a.i)[0] ?? null;
}

/** Every @font-face of the project's pages: family (lower case) → its files (absolute). */
function faceFiles(projectDir) {
  const pages = ["index.html", ...walk(join(projectDir, "boards"), (n) => n === "index.html").map((f) => relative(projectDir, f))];
  const out = new Map();
  for (const rel of pages) {
    const html = read(join(projectDir, rel)), base = dirname(join(projectDir, rel));
    for (const m of html.matchAll(/@font-face\s*{([^}]*)}/gi)) {
      const fam = /font-family\s*:\s*['"]?([^;'"]+)/i.exec(m[1])?.[1]?.trim().toLowerCase();
      const src = /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(m[1])?.[1];
      if (fam && src && !src.startsWith("data:")) out.set(fam, [...new Set([...(out.get(fam) ?? []), resolve(base, src)])]);
    }
  }
  return out;
}

/** anidoodle's drawn capitals: the characters its glyph table has (the staged engine's drafting.ts, else the pinned copy's). */
function drawnLetters(projectDir) {
  const f = [join(projectDir, ".moworks", "library", "anidoodle", "engine", "src", "canvas-core", "drafting.ts")].find(existsSync);
  const s = f ? read(f) : "";
  const i = s.indexOf("export const G");
  if (i < 0) return null;
  const b = s.slice(i, s.indexOf("};", i));
  return new Set([...b.matchAll(/(?:^|[,{\s])(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_]))\s*:\s*\{/g)].map((m) => m[1] ?? m[2] ?? m[3]));
}

let fontkit = null;
function loadFontkit() {
  if (fontkit !== null) return fontkit;
  try { fontkit = createRequire(join(resolveRuntime().dir, "node_modules", "fontkit", "package.json"))("fontkit"); } catch { fontkit = false; }
  return fontkit;
}

/** The film's code read for Vietnamese letters its faces lack: { files, findings: [{ file, line, shot, text, face, missing, why }] }. */
export function codeGlyphs(projectDir, { fontkitImpl = null } = {}) {
  const wi = walk(join(projectDir, "whatif"), (n) => /\.tsx?$/.test(n));
  const ani = walk(join(projectDir, "anidoodle"), (n) => /\.ts$/.test(n) && !/\.d\.ts$/.test(n));
  const files = [...wi.map((f) => ({ f, anidoodle: false })), ...ani.map((f) => ({ f, anidoodle: true }))];
  const findings = [];
  if (!files.length) return { files: 0, findings };
  // the What If engine's own faces and components (FONT.title / ui / hand, TitleCard, HudChip…), read from the staged engine
  const engDir = join(projectDir, ".moworks", "library", "what-if", "engine");
  const engSrc = wi.length ? walk(engDir, (n) => /\.tsx?$/.test(n)).map((f) => blankComments(read(f))) : [];
  const engConsts = Object.assign({}, ...engSrc.map(fontConsts));
  const engComps = Object.assign({}, ...engSrc.map((s) => componentFonts(s, engConsts)));
  const faces = faceFiles(projectDir), fk = fontkitImpl ?? loadFontkit(), opened = new Map();
  const lacks = (path, chars) => {
    if (!opened.has(path)) { try { opened.set(path, fk ? fk.openSync(path) : null); } catch { opened.set(path, null); } }
    const font = opened.get(path);
    return font ? chars.filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0))) : null;
  };
  let drawn;
  for (const { f, anidoodle } of files) {
    const src = blankComments(read(f)), rel = relative(projectDir, f).split(sep).join("/");
    const consts = { ...engConsts, ...fontConsts(src) }, comps = { ...engComps, ...componentFonts(src, consts) };
    const shotStarts = [...src.matchAll(/^export\s+const\s+((?:S|Sh|Shot)\d+\w*)/gm)];
    for (const { at, text } of viTexts(src)) {
      const face = faceBefore(src, at, consts, comps, { anidoodle });
      if (!face) continue;
      const chars = marked(text);
      const shot = shotStarts.filter((m) => m.index < at).at(-1)?.[1] ?? null;
      for (const fam of face.faces) {
        let missing = null, why;
        if (fam === DRAWN) {
          drawn ??= drawnLetters(projectDir);
          if (!drawn) continue;
          missing = chars.filter((c) => !drawn.has(c) && !drawn.has(c.toUpperCase()));
          why = "draws each letter it lacks as a dash";
        } else {
          const paths = faces.get(fam.toLowerCase()) ?? [];
          if (!paths.length) continue;          // no file for it in the film yet: R-FONTS has not installed it, nothing to judge
          let left = chars;
          for (const p of paths) { const l = existsSync(p) ? lacks(p, left) : left; if (l == null) { left = []; break; } left = l; }
          missing = left;
          why = "Chrome draws those letters in another face";
        }
        if (missing.length) findings.push({ file: rel, line: lineAt(src, at), shot, text: text.slice(0, 80), face: fam, ...(face.via ? { via: face.via } : {}), missing: missing.join(""), why });
      }
    }
  }
  return { files: files.length, findings };
}

/** The Tech checks gate: a warning, never a block. */
export function gateCodeGlyphs(projectDir, opts) {
  const r = codeGlyphs(projectDir, opts);
  if (!r.files) return null;
  return { id: "G-GLYPH-CODE", blocking: false, pass: r.findings.length === 0, warnings: r.findings.length,
    findings: r.findings.map((x) => ({ ...x, message: findingLine(x) })) };
}

const findingLine = (x) => `"${x.text}" (${x.file}:${x.line}${x.shot ? `, ${x.shot}` : ""}) is set in ${x.face}${x.via ? ` (${x.via})` : ""}, which has no ${x.missing}: ${x.why}`;

/** Lines for Claude's tool replies (board_stills, qc_sheets), or "" when nothing is found. */
export function glyphText(r) {
  if (!r?.findings?.length) return "";
  return ["Vietnamese letters in a face that lacks them (the app's check of the film's code; a font conflict: moworks-studio §2b, fix it with a face that has them or ask):",
    ...r.findings.slice(0, 12).map((x) => `- ${findingLine(x)}`), ...(r.findings.length > 12 ? [`- and ${r.findings.length - 12} more`] : [])].join("\n");
}
