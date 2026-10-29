// Pre-render gates. HF first: lint and script errors come from `hyperframes check`; Moworks adds only what HF lacks.
//   G-HF-LINT    HF lint errors (incl. missing_local_asset, font_family_without_font_face, placeholder_media_url)   blocking
//   G-HF-SCRIPT  HF runtime errors (page_error) from the same check                                                 blocking
//   G-REMOTE     any remote URL in a composition or stylesheet, or a quoted one in the film's own scripts (HF has no
//                general rule; render would go online; scripts)                                           blocking
//   G-FONT       a font stack nothing local serves, or served only by an HF alias (HF fetches it from Google Fonts
//                with the film's text)                                                                   blocking
//   G-GLYPH      Vietnamese letters in a file that its declared font files lack (HF embedded fonts: latin only)    blocking
//   G-BLANK      a mounted sub-composition whose sampled stills are all flat                         warning
//   G-CONTRACT   an anidoodle film's own modules call what the author's contract forbids (Math.random, Date, ctx.filter, the
//                network: anidoodle's gate.mjs list); only a project with anidoodle/ or boards/ TypeScript      blocking
//   G-POSE       an anidoodle film drawn on every frame: a pose outside its joint limits, an error thrown or logged, a rig point that
//                is not a number (HF's check samples and found Mira's at the very end)                     blocking
//   G-VOICE      under a voice-over, effects or music within 3 dB of the voice on a spoken word        warning
//   G-GLYPH-CODE Vietnamese letters a code film's own code (whatif/*.tsx, anidoodle/*.ts) draws in a face that lacks them
//                (G-GLYPH reads only the HTML; codeGlyphs.mjs)                                                warning
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve, sep } from "node:path";
import { declaredFamilies, familyStacks, fontMap, htmlFiles } from "../hf-edit/finalize.mjs";
import { scriptFiles } from "../hf-edit/vendorLibs.mjs";
import { loadHf } from "../hf-edit/load.mjs";
import { expandEnv, loadPins, resolveRuntime } from "../version-manager/index.mjs";
import { check, snapshot, runHfJson } from "./cli.mjs";
import { checkFindings, checkSamples, withSeamsFallback } from "./qc.mjs";
import { dropDecorationContrast } from "./contrastDecor.mjs";
import { gateContract } from "../anidoodle-styles/contract.mjs";
import { gatePose } from "../anidoodle-styles/posecheck.mjs";
import { gateVoice } from "../sfx/voicecheck.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { gateCodeGlyphs } from "./codeGlyphs.mjs";

const BASES = "aăâeêioôơuưyAĂÂEÊIOÔƠUƯY";
const TONES = ["", "̀", "́", "̉", "̃", "̣"];
export const VI = new Set([...[...BASES].flatMap((b) => TONES.map((t) => (b + t).normalize("NFC"))), "đ", "Đ"]);
const ASCII_VI = new Set([..."aeiouyAEIOUY"]);          // plain vowels exist in every font; only marked letters are checked
const REMOTE = /(?:https?:)?\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}[^\s"'()<>]*/gi;
const REMOTE_LITERAL = /(["'`])(https?:\/\/(?!www\.w3\.org)[a-z0-9.-]+\.[a-z]{2,}[^\s"'`]*)\1/gi;

function lineOf(text, index) { return text.slice(0, index).split("\n").length; }

export function gateRemote(projectDir) {
  const findings = [];
  const files = [...htmlFiles(projectDir)];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "node_modules" && !n.startsWith(".")) walk(p); } else if (n.endsWith(".css")) files.push(relative(projectDir, p).split(sep).join("/")); } };
  walk(projectDir);
  for (const f of files) {
    const text = readFileSync(join(projectDir, f), "utf8");
    for (const m of text.matchAll(REMOTE)) {
      if (m[0].startsWith("//") && !/(src|href|url)\s*[=(]\s*["']?$/i.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;   // a JS comment, not a URL
      findings.push({ file: f, line: lineOf(text, m.index), url: m[0].slice(0, 120) });
    }
  }
  // the film's own .js / .mjs (not the app's copies, not minified libraries): a quoted URL, e.g. `import ... from "https://..."`; a link in
  // a comment is not quoted and does not count
  for (const f of scriptFiles(projectDir)) {
    const text = readFileSync(join(projectDir, ...f.split("/")), "utf8");
    for (const m of text.matchAll(REMOTE_LITERAL)) findings.push({ file: f, line: lineOf(text, m.index), url: m[2].slice(0, 120) });
  }
  return { id: "G-REMOTE", blocking: true, pass: findings.length === 0, findings };
}

function fontSrcs(html) {
  const out = new Map();
  for (const m of html.matchAll(/@font-face\s*{([^}]*)}/gi)) {
    const fam = /font-family\s*:\s*['"]?([^;'"]+)/i.exec(m[1])?.[1]?.trim().toLowerCase();
    const src = /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(m[1])?.[1];
    if (fam && src) out.set(fam, [...(out.get(fam) ?? []), src]);
  }
  return out;
}

/** Where each font stack of a page is set and the words it draws there: stack key (families joined, lower case) → { used, text } where
 *  text is the words of the elements its rules and style attributes reach, or null when they cannot be told (a selector the page does
 *  not answer, a rule on the whole page, or elements whose words a script writes); used false when the stack is only an @font-face's. */
export function stackUses(html, document) {
  const out = new Map(), keyOf = (decl) => decl.split(",").map((raw) => raw.replace(/&quot;|&#39;/g, "").trim().replace(/^['"]|['"]$/g, "").replace(/[\s)'"]+$/g, "").trim())
    .filter((f) => f && !["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "unset"].includes(f.toLowerCase()) && !f.startsWith("var(") && !f.startsWith("-") && !/^BlinkMacSystemFont$/i.test(f)).join(",").toLowerCase();
  const add = (key, text, used = true) => {
    if (!key) return;
    const o = out.get(key) ?? { used: false, text: "", unknown: false };
    if (used) { o.used = true; if (text == null) o.unknown = true; else o.text += ` ${text}`; }
    out.set(key, o);
  };
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(), fam = /font-family\s*:\s*([^;}]+)/i.exec(m[2])?.[1];
    if (!fam) continue;
    if (/^@font-face/i.test(sel)) { add(keyOf(fam), null, false); continue; }
    let els = null;
    if (!/(^|,)\s*(html|body|:root|\*)\s*(,|$)/i.test(sel)) { try { els = [...document.querySelectorAll(sel)]; } catch { els = null; } }
    const text = els?.length ? els.map((e) => e.textContent).join(" ") : null;
    add(keyOf(fam), text && text.trim() ? text : null);
  }
  for (const e of document.querySelectorAll("[style]")) {
    const fam = /font-family\s*:\s*([^;]+)/i.exec(e.getAttribute("style") ?? "")?.[1];
    if (fam) add(keyOf(fam), e.textContent?.trim() ? e.textContent : null);
  }
  for (const [k, o] of out) out.set(k, { used: o.used, text: o.unknown ? null : o.text });
  return out;
}

async function gateFonts(projectDir) {
  const hf = await loadHf();
  const kit = new Set(Object.keys(fontMap()).map((k) => k.toLowerCase()));
  const rootHtml = existsSync(join(projectDir, "index.html")) ? readFileSync(join(projectDir, "index.html"), "utf8") : "";
  const rootDeclared = declaredFamilies(rootHtml);
  const fontFindings = [], glyphFindings = [];
  const require = createRequire(join(resolveRuntime().dir, "node_modules", "fontkit", "package.json"));
  const fontkit = require("fontkit");
  const cmapCache = new Map();
  const hasGlyphs = (path, chars) => {
    if (!cmapCache.has(path)) { try { cmapCache.set(path, fontkit.openSync(path)); } catch { cmapCache.set(path, null); } }
    const font = cmapCache.get(path);
    if (!font) return [...chars];
    return [...chars].filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
  };
  for (const f of htmlFiles(projectDir)) {
    const html = readFileSync(join(projectDir, f), "utf8");
    const declared = new Set([...declaredFamilies(html), ...rootDeclared]);
    const srcs = new Map([...fontSrcs(rootHtml), ...fontSrcs(html)]);
    const { document } = hf.linkedom.parseHTML(`<!doctype html><html><body>${html.replace(/<\/?template[^>]*>/gi, "")}</body></html>`);
    // the page's <title> is never drawn (demo-what-if-khong-loi: its Vietnamese title failed against the engine's latin faces)
    for (const s of document.querySelectorAll("script, style, title")) s.remove();
    // NFC first: Vietnamese typed or pasted in NFD (letter + combining mark, e.g. from macOS) would otherwise hide every marked letter
    const viOf = (text) => new Set([...String(text ?? "").normalize("NFC")].filter((c) => VI.has(c) && !ASCII_VI.has(c)));
    const docVi = viOf(document.body.textContent);
    // each face is held against the words it draws (the elements its rules and style attributes set it on), not every
    // Vietnamese line of the file: a script face set on "Tia" alone failed against the whole page and stopped the render
    const uses = stackUses(html, document);
    for (const stack of familyStacks(html)) {
      const use = uses.get(stack.join(",").toLowerCase());
      if (use && !use.used) continue;          // only declared (@font-face): a face no rule sets draws nothing
      const viChars = use?.text != null ? viOf(use.text) : docVi;          // its own words, or the whole page when they cannot be told (a script fills them)
      const first = stack.find((fam) => declared.has(fam.toLowerCase()));
      if (!first) {
        const aliased = stack.find((fam) => hf.fontAliases[fam.toLowerCase()]);
        fontFindings.push({ file: f, stack, reason: aliased ? `only HF alias "${aliased}" -> ${hf.fontAliases[aliased.toLowerCase()]} (fetched from Google Fonts at render)` : "no @font-face and no kit font" });
        if (viChars.size && aliased) glyphFindings.push({ file: f, family: aliased, missing: "HF embedded fonts are latin-only", chars: [...viChars].join("") });
        continue;
      }
      if (!viChars.size) continue;
      // a family may be split into several files by unicode-range (Google subsets): a letter is missing only when no file has it
      const files = (srcs.get(first.toLowerCase()) ?? []).filter((s) => !s.startsWith("data:"));
      if (!files.length) continue;
      let missing = new Set(viChars);
      for (const src of files) {
        const path = resolve(projectDir, src);
        const lacks = new Set(existsSync(path) ? hasGlyphs(path, missing) : [...missing]);
        missing = new Set([...missing].filter((c) => lacks.has(c)));
      }
      if (missing.size) glyphFindings.push({ file: f, family: first, fonts: files, missing: [...missing].join("") });
    }
  }
  void kit;
  return [
    { id: "G-FONT", blocking: true, pass: fontFindings.length === 0, findings: fontFindings },
    { id: "G-GLYPH", blocking: true, pass: glyphFindings.length === 0, findings: glyphFindings },
  ];
}

async function gatesFromHfCheck(projectDir) {
  // HF's 120 s budget at the seams: once more without them; two layout points a second
  const r = withSeamsFallback((args) => runHfJson("check", projectDir, args), { samples: checkSamples(projectDir) });
  const j = r.json;
  if (j) await dropDecorationContrast(j, projectDir);          // contrast measured on a sticker's aria-hidden outline copy is not the words
  if (!j) return [{ id: "G-HF-LINT", blocking: true, pass: false, findings: [{ reason: `hyperframes check gave no JSON (exit ${r.exitCode})`, stderr: r.stderrTail }] }];
  return gatesFromCheckJson(j, projectDir);
}

/** The HF gates from `hyperframes check --json` (pure: tests feed it HF's answers). */
export function gatesFromCheckJson(j, projectDir) {
  const lintErr = j.lint.findings.filter((x) => x.severity === "error").map((x) => ({ code: x.code, file: x.sourceFile ? relative(projectDir, x.sourceFile).split(sep).join("/") : undefined, message: String(x.message).slice(0, 200) }));
  // a check that ran out of its time found no error: a warning, never a block. Real script
  // errors found within the time still block.
  const outOfTime = (x) => x.code === "check_runtime_failure" && /deadline|timed? ?out/i.test(String(x.message ?? ""));
  const rtAll = (j.runtime?.findings ?? []).filter((x) => x.severity === "error");
  const rtErr = rtAll.filter((x) => !outOfTime(x)).map((x) => ({ code: x.code, message: String(x.message).slice(0, 200) }));
  const late = rtAll.some(outOfTime) ? [{ severity: "warning", code: "check_timed_out", message: "Could not finish checking the scripts in time: no script error was found before the check stopped." }] : [];
  // HF skips its browser stages after a lint error, and also when its browser session does not finish (its 120 s deadline) or
  // fails; the app said "after a lint error" every time. The reason now says which, with HF's own words.
  const skippedReason = j.browserSkipped !== true ? undefined : lintErr.length ? "lint" : late.length ? "deadline" : "failed";
  const skipped = skippedReason === "lint" ? `HF skipped its browser stages after a lint error: ${lintErr[0].message}${lintErr[0].file ? ` (${lintErr[0].file})` : ""}`
    : skippedReason === "deadline" ? "HF's browser check ran out of its 120 s before it finished: scripts, layout, contrast and motion were not checked"
    : skippedReason === "failed" ? `HF's browser check did not run: ${String(rtAll[0]?.message ?? "no reason given").slice(0, 200)}` : undefined;
  const notChecked = skippedReason ? [{ severity: "warning", code: "not_checked", message: skipped }] : [];
  return [
    { id: "G-HF-LINT", blocking: true, pass: lintErr.length === 0, findings: lintErr, warnings: j.lint.warningCount },
    rtErr.length || !late.length
      ? { id: "G-HF-SCRIPT", blocking: true, pass: rtErr.length === 0, findings: [...rtErr, ...late], skipped, skippedReason }
      : { id: "G-HF-SCRIPT", blocking: false, pass: false, timedOut: true, findings: late, warnings: 1, skipped, skippedReason },
    ...["layout", "contrast", "motion"].map((sec) => {          // HF's own severities; errors and warnings listed, its info notes counted
      // a section HF never ran is "not checked", never a clean pass (its placeholders are empty)
      if (skippedReason) return { id: `G-HF-${sec.toUpperCase()}`, blocking: false, pass: false, notChecked: true, skippedReason, findings: notChecked, warnings: 1 };
      const xs = checkFindings(j, projectDir)[sec].filter((x) => x.severity !== "info");
      return { id: `G-HF-${sec.toUpperCase()}`, blocking: false, pass: !xs.some((x) => x.severity === "error"), findings: xs, warnings: xs.filter((x) => x.severity === "warning").length };
    }),
  ];
}

export function stillStd(png) {
  const ff = join(expandEnv(loadPins().ffmpeg.dir), "ffmpeg.exe");
  const raw = execFileSync(ff, ["-v", "error", "-i", png, "-vf", "scale=320:-1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 24, windowsHide: true });
  let sum = 0, sq = 0;
  for (const v of raw) { sum += v; sq += v * v; }
  const n = raw.length;
  return Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2));
}

function gateBlank(projectDir, workDir) {
  const root = readFileSync(join(projectDir, "index.html"), "utf8");
  const ids = [...root.matchAll(/data-composition-id="([^"]+)"[^>]*data-composition-src=/g)].map((m) => m[1]);
  const findings = [];
  for (const id of ids) {
    const out = join(workDir, `snap-${id}`);
    rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
    const r = snapshot(projectDir, id, out);
    const pngs = existsSync(out) ? readdirSync(out).filter((n) => n.endsWith(".png")) : [];
    if (r.exitCode !== 0 || !pngs.length) { findings.push({ composition: id, reason: "snapshot failed", stderr: r.stderrTail }); continue; }
    const stds = pngs.map((p) => Math.round(stillStd(join(out, p)) * 10) / 10);
    if (stds.every((s) => s < 2)) findings.push({ composition: id, reason: "every sampled still is flat", std: stds });
  }
  return { id: "G-BLANK", blocking: false, pass: findings.length === 0, findings };
}

/** G-BUILD: a film whose page is bundled from its source (anidoodle: anidoodle/page.ts → compositions/anidoodle/film.js; What If:
 *  whatif/episode.tsx → compositions/whatif/film.js; hf-edit/codeFilm.mjs) is bundled now
 *  when its source is newer; a source that does not compile blocks (e.g. acting.ts did not compile and the older film.js was
 *  rendered without a word). null when the film has no such source. */
export async function gateBuild(projectDir) {
  const r = await freshFilm(projectDir);          // anidoodle or What If
  if (!r) return null;
  return { id: "G-BUILD", blocking: true, pass: !r.error, findings: r.error ? [{ code: "build_error", message: `The film's code does not compile: ${r.error}` }] : [] };
}

/** Run every gate. Returns { pass, blockingFailures, gates }. `blank: false` skips the (slower) blank-scene snapshots. onStep(done, total,
 *  what) before each part, so a render's "quick check" moves (it stood at 3 % for 4 min). */
export async function runGates(projectDir, { workDir, blank = true, onStep = () => {} } = {}) {
  const parts = [
    ["Building the film's code", async () => [await gateBuild(projectDir)]],          // first: the checks below look at the film as its source is now
    ["HyperFrames' check of the film", () => gatesFromHfCheck(projectDir)],
    ["Files and fonts", async () => [gateRemote(projectDir), ...(await gateFonts(projectDir)), gateCodeGlyphs(projectDir)]],
    ["The film's drawing rules", async () => [gateContract(projectDir), await gatePose(projectDir)]],
    ["The voice against the sound", async () => [await gateVoice(projectDir)]],          // a warning; nothing without a voice-over
    ...(blank && workDir ? [["Blank scenes", () => [gateBlank(projectDir, workDir)]]] : []),
  ];
  const gates = [];
  for (const [i, [what, run]] of parts.entries()) { onStep(i, parts.length, what); gates.push(...(await run())); }
  onStep(parts.length, parts.length, null);
  for (let i = gates.length - 1; i >= 0; i--) if (!gates[i]) gates.splice(i, 1);
  const blockingFailures = gates.filter((g) => g.blocking && !g.pass).map((g) => g.id);
  return { pass: blockingFailures.length === 0, blockingFailures, gates };
}
