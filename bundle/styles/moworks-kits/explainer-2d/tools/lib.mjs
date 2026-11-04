// lib.mjs: shared helpers for the tools (the kit root, ffmpeg/ffprobe/uv lookup, running commands, the config).
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// fileURLToPath decodes "%20" — folder names may contain spaces
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const IS_WIN = process.platform === "win32";

/** a command on PATH, or in the usual install folders; null when missing */
export const which = (name) => {
  const exe = IS_WIN ? `${name}.exe` : name;
  const dirs = [...(process.env.PATH || "").split(path.delimiter), path.join(os.homedir(), ".local/bin"), path.join(os.homedir(), ".cargo/bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  for (const d of dirs) {
    const p = path.join(d, exe);
    try {
      if (d && fs.statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
};
export const need = (name, hint) => {
  const p = which(name);
  if (!p) {
    console.error(`✗ ${name} not found. ${hint || "Run: node tools/doctor.mjs"}`);
    process.exit(1);
  }
  return p;
};
export const FFMPEG = () => need("ffmpeg", "Install ffmpeg (see .claude/skills/kit-setup/SKILL.md), then retry.");
export const FFPROBE = () => need("ffprobe", "Install ffmpeg (it includes ffprobe), then retry.");
export const UV = () => need("uv", "Install uv (see .claude/skills/kit-setup/SKILL.md), then retry.");

/** run a command, stream its output; exit on failure */
export const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (r.status !== 0) {
    console.error(`✗ failed: ${path.basename(cmd)} ${args.join(" ")}`);
    process.exit(r.status || 1);
  }
};
/** run a command and return its stdout as text */
export const out = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, ...opts }).toString();

/** ffprobe → { width, height, fps, duration, vcodec, pix, hasAudio, rotation } of the first video stream */
export const probe = (file) => {
  const j = JSON.parse(out(FFPROBE(), ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]));
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  const rate = (r) => {
    const [n, d] = String(r || "0/1").split("/").map(Number);
    return d ? n / d : 0;
  };
  const rot = Number(v?.tags?.rotate ?? v?.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? 0);
  return {
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    fps: rate(v?.avg_frame_rate) || rate(v?.r_frame_rate),
    rFps: v?.r_frame_rate,
    duration: Number(j.format?.duration ?? 0),
    vcodec: v?.codec_name,
    pix: v?.pix_fmt,
    hasAudio: !!a,
    sampleRate: Number(a?.sample_rate ?? 48000),
    rotation: rot,
  };
};

/** "my-first-video" → "MyFirstVideo" */
export const pascal = (s) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

/** parse --flag value / --flag pairs; returns { _: [positionals], flag: value|true } */
export const args = (argv, booleans = []) => {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (booleans.includes(k)) o[k] = true;
      else o[k] = argv[++i];
    } else o._.push(a);
  }
  return o;
};

/** kit.config.json (written at setup) — {} when missing */
export const config = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "kit.config.json"), "utf8"));
  } catch {
    return {};
  }
};

/** print an error and stop */
export const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

/** the HyperFrames CLI installed in this folder (never a global or npx download) */
export const HF = () => {
  const bin = path.join(ROOT, "node_modules/.bin", IS_WIN ? "hyperframes.cmd" : "hyperframes");
  if (!fs.existsSync(bin)) fail("HyperFrames is not installed in this folder. Run: npm install   (then node tools/doctor.mjs)");
  return bin;
};
/** HyperFrames' own entry script in this folder. The tools run it with this Node and no shell, so the Windows .cmd
 *  shim and paths with spaces are never a problem. */
export const HF_JS = () => {
  const js = path.join(ROOT, "node_modules/hyperframes/bin/hyperframes.mjs");
  if (!fs.existsSync(js)) fail("HyperFrames is not installed in this folder. Run: npm install   (then node tools/doctor.mjs)");
  return js;
};
/** run the HyperFrames CLI inside a video folder (streams its output; stops on failure) */
export const hf = (videoDir, args, opts = {}) => run(process.execPath, [HF_JS(), ...args], { cwd: videoDir, ...opts });
/** run the HyperFrames CLI inside a video folder and capture it: { status, stdout, stderr } */
export const hfCapture = (videoDir, args, opts = {}) =>
  spawnSync(process.execPath, [HF_JS(), ...args], { cwd: videoDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });

// ---------- video folders ----------

/** a video folder named on the command line: relative to the current folder, else to the kit root. It must hold
 *  index.html. Stops with `usage` when no folder is given. */
export const videoDirOf = (arg, usage) => {
  if (!arg) fail(usage);
  for (const d of [path.resolve(arg), path.resolve(ROOT, arg)]) if (fs.existsSync(path.join(d, "index.html"))) return d;
  fail(`${arg} has no index.html (make a video with: node tools/new-video.mjs <slug> --format wide --title "<Title>")`);
};

/** the film's size, length and frame rate from index.html's root element, the single source of all four:
 *  { duration, fps, width, height, slug } (slug = the folder name) */
export const filmOf = (dir) => {
  const file = path.join(dir, "index.html");
  const tag = fs.readFileSync(file, "utf8").match(/<[a-zA-Z]+\b[^>]*\bid\s*=\s*["']root["'][^>]*>/)?.[0];
  if (!tag) fail(`${file} has no element with id="root"`);
  const attr = (n) => tag.match(new RegExp(`\\b${n}\\s*=\\s*["']?([^"'\\s>]+)`))?.[1];
  const duration = Number(attr("data-duration"));
  if (!(duration > 0)) fail(`${file}: the root element has no data-duration (set it with: node tools/set-duration.mjs <dir> <seconds>)`);
  return {
    duration,
    fps: Number(attr("data-fps")) || 60,
    width: Number(attr("data-width")) || 1920,
    height: Number(attr("data-height")) || 1080,
    slug: path.basename(dir),
  };
};

/** "2026-11-03_14-05-09": a folder name for this moment */
export const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
};

// ---------- word diff: the script against what a transcript heard ----------

const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
const SCALES = [
  [1e12, "trillion"],
  [1e9, "billion"],
  [1e6, "million"],
  [1e3, "thousand"],
];
const ORD = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
const intWords = (n) => {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + intWords(n % 100) : "");
  for (const [v, w] of SCALES) if (n >= v) return intWords(Math.floor(n / v)) + " " + w + (n % v ? " " + intWords(n % v) : "");
  return String(n);
};
/** "1.3" → "one point three", "109" → "one hundred nine", "3rd" → "third" */
const numWords = (num, ordinal) => {
  const [i, f] = num.split(".");
  let w = i.length > 15 ? i.split("").map((d) => ONES[+d]).join(" ") : intWords(Number(i));
  if (ordinal) {
    const parts = w.split(" ");
    const last = parts.pop();
    parts.push(ORD[last] ?? (last.endsWith("y") ? last.slice(0, -1) + "ieth" : last + "th"));
    w = parts.join(" ");
  }
  return f ? `${w} point ${f.split("").map((d) => ONES[+d]).join(" ")}` : w;
};
const UNIT = Object.fromEntries(ONES.map((w, i) => [w, i]));
const TEN = Object.fromEntries(TENS.map((w, i) => [w, i * 10]).filter(([w]) => w !== "_"));
const SCALE = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const isNumWord = (w) => w in UNIT || w in TEN || w in SCALE || w === "point";

/** text → lower-case words without punctuation; digits become words ("11" → "eleven"), "a hundred" → "one hundred",
 *  and the "and" inside a spoken number is dropped ("a hundred and nine" = "109" = "one hundred nine") */
/** fold British and American spellings together (colour/color, centre/center, organise/organize, travelled/traveled,
 *  grey/gray), applied to both sides of a diff, so a British script matches an American transcript */
const spelling = (w) =>
  w === "grey"
    ? "gray"
    : w.length < 5
    ? w
    : w
        .replace(/^(.{3,})our(s|ed|ing|ite|ites|able|ful)?$/, "$1or$2")
        .replace(/^(.{2,})is(e|es|ed|ing|ation|ations)$/, "$1iz$2")
        .replace(/^(.{2,})ys(e|es|ed|ing)$/, "$1yz$2")
        .replace(/^(.{2,})(t|b)re(s)?$/, "$1$2er$3")
        .replace(/^(.{2,})ogue(s)?$/, "$1og$2")
        .replace(/^(.{2,}[aeiou])ll(ed|ing|er|ers)$/, "$1l$2")
        .replace(/^grey/, "gray")
        .replace(/^programme(s)?$/, "program$1");

export const normWords = (text) => {
  const s = String(text)
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/&/g, " and ")
    .replace(/(\d+(?:\.\d+)?)(st|nd|rd|th)?/g, (m, n, ord) => ` ${numWords(n, !!ord)} `)
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  const w = s.trim().split(/\s+/).filter(Boolean);
  const outW = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i] === "a" && w[i + 1] in SCALE) outW.push("one");
    else if (w[i] === "and" && outW.length && outW[outW.length - 1] in SCALE && isNumWord(w[i + 1] ?? "")) continue;
    else outW.push(spelling(w[i]));
  }
  return outW;
};

/** the values a run of number words can mean: standard ("one hundred nine") and paired, as years are read
 *  ("nineteen sixty nine", "twenty twenty six"); empty when the run isn't a number */
const numValues = (words) => {
  if (!words.length || !words.every(isNumWord)) return [];
  const vals = new Set();
  const std = (ws) => {
    let total = 0, cur = 0, frac = "", inFrac = false, seen = false;
    for (const w of ws) {
      if (inFrac) {
        if (!(w in UNIT) || UNIT[w] > 9) return null;
        frac += UNIT[w];
      } else if (w === "point") (inFrac = true), (seen = true);
      else if (w in UNIT) (cur += UNIT[w]), (seen = true);
      else if (w in TEN) (cur += TEN[w]), (seen = true);
      else if (w === "hundred") (cur = (cur || 1) * 100), (seen = true);
      else (total += (cur || 1) * SCALE[w]), (cur = 0), (seen = true);
    }
    if (!seen || (inFrac && !frac)) return null;
    return Number(`${total + cur}${frac ? "." + frac : ""}`);
  };
  const a = std(words);
  if (a !== null) vals.add(a);
  // paired reading: split once, both halves 1–99 (the right half may be "hundred" or "oh five")
  for (let k = 1; k < words.length; k++) {
    const l = std(words.slice(0, k)), r = std(words.slice(k));
    if (l !== null && r !== null && l >= 10 && l < 100 && r < 100 && Number.isInteger(l) && Number.isInteger(r)) vals.add(l * 100 + r);
  }
  return [...vals];
};
const sameNumber = (a, b) => {
  const va = numValues(a), vb = numValues(b);
  return va.some((x) => vb.includes(x));
};

/** word diff of the script against what was heard. Returns a list of differences:
 *  { kind: "missing"|"extra"|"changed", script: "…", heard: "…", at: <index in the script's words>, context: "…" }.
 *  Number spellings that mean the same value and words split or joined differently ("light bulb"/"lightbulb") are
 *  not differences. An empty list means the two match word for word. */
export const wordDiff = (scriptText, heardText) => {
  const a = normWords(scriptText), b = normWords(heardText);
  const n = a.length, m = b.length;
  // longest common subsequence table, filled from the end
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hunks = [];
  let i = 0, j = 0, h = null;
  const flush = () => {
    if (h) hunks.push(h);
    h = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++, j++;
    } else {
      h ??= { at: i, bt: j, a: [], b: [] };
      if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) h.b.push(b[j++]);
      else h.a.push(a[i++]);
    }
  }
  flush();
  // a number spelled two ways differs only in part ("[one thousand nine hundred] sixty nine" vs "[nineteen] sixty
  // nine"): widen the hunk over the matching number words around it before comparing the values
  const sameNum = (x) => {
    const A = [...x.a], B = [...x.b];
    for (let k = 1; x.at - k >= 0 && x.bt - k >= 0 && a[x.at - k] === b[x.bt - k] && isNumWord(a[x.at - k]); k++) A.unshift(a[x.at - k]), B.unshift(b[x.bt - k]);
    for (let k = 0, ia = x.at + x.a.length, ib = x.bt + x.b.length; ia + k < n && ib + k < m && a[ia + k] === b[ib + k] && isNumWord(a[ia + k]); k++) A.push(a[ia + k]), B.push(b[ib + k]);
    return sameNumber(A, B);
  };
  return hunks
    .filter((x) => !((x.a.length && x.b.length && x.a.join("") === x.b.join("")) || sameNum(x)))
    .map((x) => ({
      kind: !x.b.length ? "missing" : !x.a.length ? "extra" : "changed",
      script: x.a.join(" "),
      heard: x.b.join(" "),
      at: x.at,
      context: `${a.slice(Math.max(0, x.at - 4), x.at).join(" ")} [${x.a.join(" ") || "+"}] ${a.slice(x.at + x.a.length, x.at + x.a.length + 4).join(" ")}`.trim(),
    }));
};
/** one readable line per difference */
export const diffLines = (diffs) =>
  diffs.map((d) => (d.kind === "missing" ? `  missing  "${d.script}"   in: …${d.context}…` : d.kind === "extra" ? `  extra    "${d.heard}"   after: …${d.context}…` : `  changed  "${d.script}" → heard "${d.heard}"   in: …${d.context}…`));
