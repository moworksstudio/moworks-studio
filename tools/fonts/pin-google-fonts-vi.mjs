// Dev tool: list the Google Fonts families that draw Vietnamese, from google/fonts at a pinned commit, and write
// config/google-fonts-vi.json. A family is in the list when its METADATA.pb has `subsets: "vietnamese"` (the file Google builds fonts.google.com
// from). Reads text only (the git tree and each METADATA.pb, ~8 MB); no font file is downloaded. Prints what changed against the current list
// (new families, families that gained or lost Vietnamese), so a person can approve before the pin moves.
//   node tools/fonts/pin-google-fonts-vi.mjs <google/fonts commit> [out.json] [--popularity <google-fonts.csv>] [--metadata <folder of METADATA.pb copies>]
// --popularity: the Google Fonts ranking (UI UX Pro Max's google-fonts.csv): adds `pop` (1 = most used). --metadata: a folder holding
// every METADATA.pb as <folder>__<name>__METADATA.pb (a copy made earlier), used instead of the network for those files.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../../packages/version-manager/index.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const popCsv = opt("--popularity"), metaDir = opt("--metadata");
const [commit, outArg] = args;
if (!/^[0-9a-f]{40}$/.test(commit ?? "")) { console.error("usage: node tools/fonts/pin-google-fonts-vi.mjs <40-char google/fonts commit> [out.json] [--popularity csv] [--metadata dir]"); process.exit(2); }
const out = outArg ?? join(APP_ROOT, "config", "google-fonts-vi.json");
const BIG = 5_000_000;          // a family whose files add up to more than this is fetched through Google's CSS, not as pinned files
const LICENCE = { ofl: "OFL-1.1", apache: "Apache-2.0", ufl: "UFL-1.0" };
const CATEGORY = { SANS_SERIF: "sans", SERIF: "serif", DISPLAY: "display", HANDWRITING: "handwriting", MONOSPACE: "mono" };
const UA = { "User-Agent": "moworks-studio" };

/** A protobuf text file as nested { key: [values] } (strings, numbers, blocks). */
function parsePb(text) {
  const toks = text.match(/"(?:[^"\\]|\\.)*"|[{}:]|[^\s{}:]+/g) ?? [];
  const val = (t) => (t.startsWith('"') ? t.slice(1, -1).replace(/\\"/g, '"') : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t);
  const block = (i) => {
    const d = {};
    while (i < toks.length && toks[i] !== "}") {
      const k = toks[i++];
      if (k.startsWith('"') || i >= toks.length) continue;          // a string literal glued to the one before it
      if (toks[i] === ":") { i++; (d[k] ??= []).push(val(toks[i++])); }
      else if (toks[i] === "{") { const [sub, j] = block(i + 1); (d[k] ??= []).push(sub); i = j + 1; }
    }
    return [d, i];
  };
  return block(0)[0];
}

const gh = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r; };
const tree = (await (await gh(`https://api.github.com/repos/google/fonts/git/trees/${commit}?recursive=1`)).json());
if (tree.truncated) throw new Error("the git tree is truncated");
const byPath = new Map(tree.tree.map((x) => [x.path, x]));
const metas = tree.tree.filter((x) => /^(ofl|apache|ufl)\/[^/]+\/METADATA\.pb$/.test(x.path));
console.log(`${metas.length} METADATA.pb at ${commit}`);

const readMeta = async (p) => {
  if (metaDir) { const f = join(metaDir, p.replaceAll("/", "__")); if (existsSync(f)) return readFileSync(f, "utf8"); }
  return (await gh(`https://raw.githubusercontent.com/google/fonts/${commit}/${p}`)).text();
};
const rows = [];
for (let i = 0; i < metas.length; i += 12) {
  rows.push(...await Promise.all(metas.slice(i, i + 12).map(async (m) => ({ path: m.path, pb: parsePb(await readMeta(m.path)) }))));
}

const pop = new Map();
if (popCsv) {
  const lines = readFileSync(popCsv, "utf8").split(/\r?\n/);
  const csvRow = (l) => { const o = []; let cur = "", q = false; for (const c of l) { if (c === '"') q = !q; else if (c === "," && !q) { o.push(cur); cur = ""; } else cur += c; } o.push(cur); return o; };
  const head = csvRow(lines[0]), fi = head.indexOf("Family"), pi = head.indexOf("Popularity Rank");
  for (const l of lines.slice(1)) if (l.trim()) { const c = csvRow(l); if (Number(c[pi])) pop.set(c[fi], Number(c[pi])); }
}

const families = {}, noVietnamese = [];
for (const { path, pb } of rows) {
  const folder = path.replace(/\/METADATA\.pb$/, ""), name = pb.name?.[0];
  if (!name) continue;
  if (!(pb.subsets ?? []).includes("vietnamese")) { noVietnamese.push(name); continue; }
  const wght = new Map((pb.axes ?? []).filter((a) => a.tag?.[0] === "wght").map((a) => [a.tag[0], [a.min_value[0], a.max_value[0]]]));
  const files = [];
  for (const f of pb.fonts ?? []) {
    const file = f.filename[0];
    if (files.some((x) => x[0] === file)) continue;
    const blob = byPath.get(`${folder}/${file}`);
    if (!blob) throw new Error(`${name}: ${file} is not in the tree`);
    const w = f.weight?.[0] ?? 400, range = file.includes("[") && wght.has("wght") ? wght.get("wght") : [w, w];
    files.push([file, f.style?.[0] ?? "normal", range[0], range[1], blob.size, blob.sha]);          // [file, style, weight from, weight to, bytes, git blob SHA-1]
  }
  const licFile = ["OFL.txt", "LICENSE.txt", "UFL.txt"].map((n) => byPath.get(`${folder}/${n}`)).find(Boolean);
  const src = pb.source?.[0];
  families[name] = {
    folder, category: CATEGORY[pb.category?.[0]] ?? String(pb.category?.[0] ?? "").toLowerCase(), licence: LICENCE[folder.split("/")[0]], designer: pb.designer?.[0] ?? "",
    added: pb.date_added?.[0] ?? "", ...(pop.has(name) ? { pop: pop.get(name) } : {}), ...(pb.classifications ? { kind: pb.classifications } : {}),
    ...(src?.repository_url ? { upstream: src.repository_url[0] } : {}),
    licenceFile: licFile ? [licFile.path.split("/").pop(), licFile.size, licFile.sha] : null,
    bytes: files.reduce((a, f) => a + f[4], 0), files,
  };
}
noVietnamese.sort((a, b) => a.localeCompare(b));
const sorted = Object.fromEntries(Object.entries(families).sort(([a], [b]) => a.localeCompare(b)));

// what changed against the list now in config/
const before = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
if (before) {
  const had = new Set(Object.keys(before.families));
  const now = new Set(Object.keys(sorted));
  const diff = { new: [...now].filter((x) => !had.has(x)), gone: [...had].filter((x) => !now.has(x)) };
  console.log(`since ${before.source.commit.slice(0, 7)}: ${diff.new.length} new with Vietnamese${diff.new.length ? " (" + diff.new.join(", ") + ")" : ""}, ${diff.gone.length} lost${diff.gone.length ? " (" + diff.gone.join(", ") + ")" : ""}`);
}
const doc = {
  _about: "Google Fonts families that draw Vietnamese (METADATA.pb has subsets: vietnamese), from google/fonts at the pinned commit. Data for the font check, the Brand Kit stop-and-ask and the one-time font install (packages/hf-edit/googleFontsVi.mjs). Built by tools/fonts/pin-google-fonts-vi.mjs (audit 81). files: [file, style, weight from, weight to, bytes, git blob SHA-1]. A family over bigBytes is fetched through Google's CSS, not as pinned files (owner 25/10/2026). noVietnamese: the other families of the repo, so 'no Vietnamese' is known offline.",
  source: { repo: "google/fonts", commit, link: `https://github.com/google/fonts/tree/${commit}`, listed: metas.length },
  bigBytes: BIG,
  families: sorted,
  noVietnamese,
};
// one family per line: a small diff when the pin moves
const lines = Object.entries(sorted).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`);
const text = `{\n"_about":${JSON.stringify(doc._about)},\n"source":${JSON.stringify(doc.source)},\n"bigBytes":${BIG},\n"families":{\n${lines.join(",\n")}\n},\n"noVietnamese":${JSON.stringify(noVietnamese)}\n}\n`;
writeFileSync(out, text);
console.log(`${Object.keys(sorted).length} families with Vietnamese, ${noVietnamese.length} without; ${(text.length / 1024).toFixed(0)} KB -> ${out}`);
