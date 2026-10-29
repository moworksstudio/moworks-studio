// Blocks library: HyperFrames' own registry blocks and components, taken straight from the pinned registry instead of the kit's
// adapted copies. One store per registry version (<work>/library/blocks/hf-<version>-<commit>): catalog.json, the official preview videos
// and posters HyperFrames publishes (downloaded once, SHA-256 recorded), and for items without one a preview rendered here the way HF
// renders its own (previews.mjs; kept across imports while the item is unchanged). Only the store named for the pinned registry is read: a
// store built at another pin is never used (a new pin is a new folder, built by the import or copied from the bundle). Nothing comes from the kit. Each item carries its credit (author, permalink at the
// registry commit, licence) and a Vietnamese font check: every font the item names must have Vietnamese letters (bundled font, a font file
// in the item, or a Google Fonts family with the vietnamese subset; HF's built-in fallbacks are latin-only).
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins, resolveRuntime, sourceHead } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { recodePreview } from "../library/preview-media.mjs";
import { declaredFamilies, familyStacks, fontMap } from "../hf-edit/finalize.mjs";
import { viStatus } from "../hf-edit/googleFontsVi.mjs";

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
/** A short hash of every file of a registry item (paths and bytes): a rendered preview stays valid while it is unchanged. */
export function sourceHash(dir) {
  const h = createHash("sha256");
  const walk = (d, rel) => {
    for (const n of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${n.name}` : n.name;
      if (n.isDirectory()) walk(join(d, n.name), r); else { h.update(r + "\0"); h.update(readFileSync(join(d, n.name))); }
    }
  };
  walk(dir, "");
  return h.digest("hex").slice(0, 16);
}
export const storeRoot = (root = APP_ROOT) => process.env.MW_BLOCKS_ROOT ?? join(workRoot(root), "library", "blocks");
const HF_AUTHOR = "HeyGen (HyperFrames)";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** One category per item, from HyperFrames' own tags (first rule that matches). */
const CATEGORIES = [
  ["Transitions", ["transition", "transitions", "transition-primitive", "transitions-dev-port", "wipe"]],
  ["Captions", ["captions", "caption-style", "subtitles"]],
  ["Text & titles", ["typography", "text", "title-card", "lower-third", "handwritten", "kinetic-type", "title"]],
  ["Data & charts", ["data", "data-viz", "chart", "charts", "graph", "counter", "numbers", "stat", "gauge", "diagram", "flowchart"]],
  ["UI & mockups", ["mock-ui", "ui-props", "cursor", "product-demo", "app", "dashboard", "ui", "ui-flow", "onboarding", "cards"]],
  ["Social & ads", ["social", "ad-template", "marketing", "instagram", "tiktok"]],
  ["Code", ["code", "developer", "terminal"]],
  ["Showcase & media", ["showcase", "gallery", "carousel", "images", "video-primitive", "device", "placeholder", "media"]],
  ["3D, camera & maps", ["map", "maps", "3d", "3d-motion", "globe", "camera", "advanced-motion"]],
  ["Logos", ["logo", "brand"]],
  ["Backgrounds", ["background", "texture", "gradient"]],
  ["Effects & overlays", ["overlay", "effect", "effects", "shader", "webgl", "webgpu", "webgpu-shader", "glitch", "reveal", "motion-primitive"]],
];
export const categoryOf = (tags = []) => { const t = new Set(tags); for (const [c, ks] of CATEGORIES) if (ks.some((k) => t.has(k))) return c; return "Other"; };

function registryInfo(root) {
  const pins = loadPins(root);
  const dir = expandEnv(pins.hyperframes.registryRoot);
  // the commit the files on the disk are at: the clone's own git HEAD, or the PINNED file of the copy bundled with the app (never the git of
  // a folder above it: bundle/hf sits inside the app's repository); else the pinned commit
  const commit = sourceHead(dirname(dir)) ?? pins.hyperframes.source?.commit ?? null;
  return { dir, repo: pins.hyperframes.repo, version: pins.hyperframes.default, commit, ref: commit ?? `v${pins.hyperframes.default}` };
}
/** The folder of the store for the pinned registry: hf-<version>-<commit>. */
export const storeName = (root = APP_ROOT) => { const r = registryInfo(root); return `hf-${r.version}-${r.ref.slice(0, 7)}`; };

/** The store in use, the one built at the pinned registry: { dir, manifest } or null (not built or copied yet). */
export function currentStore(root = APP_ROOT) {
  const dir = join(storeRoot(root), storeName(root));
  if (!existsSync(join(dir, "catalog.json"))) return null;
  return { dir, manifest: readJson(join(dir, "manifest.json"), {}) };
}
/** The store built last, at whatever pin (current.json): only for carrying previews over to a new store, item by item, while the item is
 *  unchanged. */
function lastStore(root) {
  const base = storeRoot(root), cur = readJson(join(base, "current.json"), null);
  return cur?.dir && existsSync(join(base, cur.dir, "catalog.json")) ? { dir: join(base, cur.dir) } : null;
}

/** Registry entries (no network): { id, name, kind, folder, item }. */
export function registryItems(root = APP_ROOT) {
  const { dir } = registryInfo(root);
  const out = [];
  for (const [folder, kind] of [["blocks", "block"], ["components", "component"]]) {
    if (!existsSync(join(dir, folder))) continue;
    for (const name of readdirSync(join(dir, folder))) {
      const item = readJson(join(dir, folder, name, "registry-item.json"), null);
      if (item?.name) out.push({ id: `${kind}/${item.name}`, name: item.name, kind, folder: `${folder}/${name}`, item });
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// ---- Vietnamese font check
const BASES = "aăâeêioôơuưyAĂÂEÊIOÔƠUƯY", TONES = ["", "̀", "́", "̉", "̃", "̣"];
const VI_MARKED = [...new Set([...[...BASES].flatMap((b) => TONES.map((t) => (b + t).normalize("NFC"))), "đ", "Đ"])].filter((c) => !"aeiouyAEIOUY".includes(c));

/** Does Google Fonts serve this family with the vietnamese subset? true / false / null (not on Google Fonts or offline). */
export async function googleHasVietnamese(family, { fetchImpl = fetch } = {}) {
  const known = viStatus(family);          // the pinned list of google/fonts first: no network for the 543 families with Vietnamese and the others the repo has
  if (known !== null) return known;
  const f = encodeURIComponent(family).replace(/%20/g, "+");
  try {
    const r = await fetchImpl(`https://fonts.googleapis.com/css2?family=${f}&display=block`, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const css = await r.text();
    if (!/@font-face/.test(css)) return null;            // Google answers 200 with no face for a family it does not have
    return /\/\*\s*vietnamese\s*\*\//.test(css);
  } catch { return null; }
}
/** Windows fonts that have Vietnamese letters (what a render on this PC falls back to when such a family is named). */
export const WINDOWS_VI = new Set(["arial", "segoe ui", "tahoma", "times new roman", "verdana", "georgia", "calibri", "cambria", "consolas", "courier new", "trebuchet ms", "segoe ui emoji"]);

function fontkitOf(root) {
  try { return createRequire(join(resolveRuntime(null, root).dir, "node_modules", "fontkit", "package.json"))("fontkit"); } catch { return null; }
}

/** { status, families: [{ family, vi, via, fallback? }] } for one registry item. Status: "ok" (every font stack starts with a font that has
 *  Vietnamese), "mixed" (a stack's first font lacks it but a later one in the same stack has it: tone-marked letters show in that other
 *  font), "missing" (no font in a stack has it), "unknown" (a font that is neither bundled, in the item nor on Google Fonts, e.g. a Mac
 *  system font), "no-text" (the item writes no words). */
export async function vietnameseCheck(entry, { root = APP_ROOT, google = googleHasVietnamese, cache = new Map() } = {}) {
  const { dir } = registryInfo(root);
  const itemDir = join(dir, entry.folder);
  const htmls = (entry.item.files ?? []).filter((f) => /\.html?$/i.test(f.path)).map((f) => join(itemDir, f.path)).filter(existsSync);
  if (!htmls.length) for (const n of readdirSync(itemDir)) if (/\.html$/i.test(n) && n !== "demo.html") htmls.push(join(itemDir, n));
  const bundled = new Set(Object.keys(fontMap()).map((k) => k.toLowerCase()));
  const fontkit = fontkitOf(root);
  const fams = new Map();
  let hasText = (entry.item.variables ?? []).some((v) => v.type === "string");
  for (const h of htmls) {
    const html = readFileSync(h, "utf8");
    if (/<(h\d|p|span|div|text|tspan)[^>]*>[^<]*[A-Za-z]{2,}/.test(html)) hasText = true;
    const declared = declaredFamilies(html);
    const faces = new Map([...html.matchAll(/@font-face\s*{([^}]*)}/gi)].map((m) => [/font-family\s*:\s*['"]?([^;'"]+)/i.exec(m[1])?.[1]?.trim().toLowerCase(), /url\(\s*['"]?([^'")]+)['"]?\s*\)/i.exec(m[1])?.[1]]).filter(([k, v]) => k && v));
    const judge = async (fam) => {
      const key = fam.toLowerCase();
      if (bundled.has(key)) return { vi: true, via: "bundled with the app" };
      if (WINDOWS_VI.has(key)) return { vi: true, via: "Windows font" };
      if (declared.has(key) && faces.get(key) && !faces.get(key).startsWith("http") && !faces.get(key).startsWith("data:")) {
        try { const font = fontkit?.openSync(resolve(dirname(h), faces.get(key))); return { vi: font ? VI_MARKED.every((c) => font.hasGlyphForCodePoint(c.codePointAt(0))) : null, via: "font file in the item" }; }
        catch { return { vi: null, via: "font file in the item" }; }
      }
      if (!cache.has(key)) cache.set(key, await google(fam));
      return { vi: cache.get(key), via: cache.get(key) === null ? "not on Google Fonts" : "Google Fonts" };
    };
    for (const stack of familyStacks(html)) {
      const key = stack[0].toLowerCase();
      if (fams.has(key)) continue;
      const first = await judge(stack[0]);
      let fallback = null;
      if (first.vi !== true) for (const f of stack.slice(1)) { const j = await judge(f); if (j.vi === true) { fallback = f; break; } }
      fams.set(key, { family: stack[0], ...first, ...(fallback ? { fallback } : {}) });
    }
  }
  const families = [...fams.values()];
  const status = !hasText ? "no-text" : families.some((f) => f.vi === false && !f.fallback) ? "missing" : families.some((f) => f.vi === null && !f.fallback) ? "unknown"
    : families.some((f) => f.fallback) ? "mixed" : "ok";
  return { status, families };
}

// ---- hosted assets: files a registry item lists with a CDN url instead of shipping them (rules of HF's scripts/catalog-hosted-files.ts:
// the registry's own HTTPS origin only, at most 256 MiB, the path kept inside the item). Kept once per store root in hosted/, by URL.
const ASSET_ORIGIN = "https://static.heygen.ai", MAX_ASSET_BYTES = 256 * 1024 * 1024;
const inside = (root, rel) => { const p = resolve(root, rel); return p.startsWith(resolve(root) + sep) ? p : null; };
export const hostedFilesOf = (item) => (item.files ?? []).filter((f) => typeof f.path === "string" && typeof f.url === "string" && f.url.startsWith(ASSET_ORIGIN + "/"));
const hostedCache = (url, root) => join(storeRoot(root), "hosted",
  createHash("sha1").update(url).digest("hex").slice(0, 20) + (/\.[a-z0-9]{2,5}$/i.exec(new URL(url).pathname)?.[0] ?? ""));

/** Download (once) the hosted files of a registry entry. */
export async function ensureHosted(entry, { root = APP_ROOT, fetchImpl = fetch, signal } = {}) {
  for (const f of hostedFilesOf(entry.item)) {
    const dest = hostedCache(f.url, root);
    if (existsSync(dest)) continue;
    const r = await fetchImpl(f.url, { signal });
    if (!r.ok) throw new Error(`Hosted asset ${f.url}: HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_ASSET_BYTES) throw new Error(`Hosted asset ${f.url} exceeds 256 MiB`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest + ".part", buf);
    renameSync(dest + ".part", dest);
  }
}
/** Copy the cached hosted files into a copy of the item, at their path and (as `hyperframes add` lays them out) their target.
 *  Returns how many were not downloaded yet. */
export function placeHosted(entry, destDir, root = APP_ROOT) {
  let missing = 0;
  for (const f of hostedFilesOf(entry.item)) {
    const src = hostedCache(f.url, root);
    if (!existsSync(src)) { missing++; continue; }
    for (const rel of [f.path, f.target].filter(Boolean)) {
      const to = inside(destDir, rel);
      if (to) { mkdirSync(dirname(to), { recursive: true }); copyFileSync(src, to); }
    }
  }
  return missing;
}

// ---- import
async function download(url, dest, signal, fetchImpl = fetch) {
  const r = await fetchImpl(url, { signal });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
  return { size: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

/** Build the store from the pinned registry: catalog, previews, Vietnamese check. Progress { done, total, stage }. `only` (a list of ids) and
 *  `fetchImpl` are for tests. */
export async function importFromRegistry({ root = APP_ROOT, onProgress = () => {}, signal, google = googleHasVietnamese, only = null, fetchImpl = fetch } = {}) {
  const reg = registryInfo(root);
  const name = storeName(root);
  const base = storeRoot(root), dir = join(base, name), tmp = dir + ".tmp";
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(join(tmp, "previews"), { recursive: true });
  const entries = registryItems(root).filter((e) => !only || only.includes(e.id));
  // previews (HF's published ones and those rendered here, previews.mjs) carry over to the new store while the item's files are unchanged
  const prev = lastStore(root);
  const prevItems = new Map(prev ? readJson(join(prev.dir, "catalog.json"), { items: [] }).items.map((x) => [x.id, x]) : []);
  const cache = new Map(), items = [];
  let done = 0;
  for (const e of entries) {
    if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    const it = e.item, file = (it.files ?? []).find((f) => f.type === "hyperframes:composition")?.path ?? `${e.name}.html`;
    let preview = null;
    const slug = e.id.replace("/", "__");
    const old = prevItems.get(e.id), hash = sourceHash(join(reg.dir, e.folder));
    // HyperFrames' published preview, kept from the last store while its link and the item's files are the same (a version update downloads
    // only what changed: an item whose files changed gets its published preview again)
    if (it.preview?.video && old?.preview?.source === "hf" && old.preview.url === it.preview.video && old.sourceHash === hash && existsSync(join(prev.dir, old.preview.video))) {
      for (const f of [old.preview.video, old.preview.poster].filter(Boolean)) if (existsSync(join(prev.dir, f))) copyFileSync(join(prev.dir, f), join(tmp, f));
      preview = old.preview;
    } else if (it.preview?.video) {
      try {
        const v = await download(it.preview.video, join(tmp, "previews", `${slug}.mp4`), signal, fetchImpl);
        const p = it.preview.poster ? await download(it.preview.poster, join(tmp, "previews", `${slug}${/\.png$/i.test(it.preview.poster) ? ".png" : ".jpg"}`), signal, fetchImpl).catch(() => null) : null;
        preview = { source: "hf", video: `previews/${slug}.mp4`, poster: p ? `previews/${slug}${/\.png$/i.test(it.preview.poster) ? ".png" : ".jpg"}` : null, url: it.preview.video, sha256: v.sha256 };
        // the cards get a 640 px copy (sha256 stays the published file's, the URL says where it came from)
        try { preview = recodePreview(tmp, preview, { root, seconds: it.duration ?? null, keepOriginals: false })?.preview ?? preview; } catch { /* keep the file as published */ }
      } catch { preview = null; }
    }
    if (!preview && old?.preview?.source === "rendered" && old.sourceHash === hash && existsSync(join(prev.dir, old.preview.video))) {
      for (const f of [old.preview.video, old.preview.poster].filter(Boolean)) if (existsSync(join(prev.dir, f))) copyFileSync(join(prev.dir, f), join(tmp, f));
      preview = old.preview;
    }
    const vi = await vietnameseCheck(e, { root, google, cache });
    items.push({ id: e.id, name: e.name, kind: e.kind, folder: e.folder, file, title: it.title ?? e.name, description: it.description ?? "", tags: it.tags ?? [],
      category: categoryOf(it.tags), collection: "HyperFrames", author: it.author ?? HF_AUTHOR, authorUrl: it.authorUrl ?? null,
      licence: it.license ?? "Apache-2.0", dimensions: it.dimensions ?? null, duration: it.duration ?? null,
      variables: (it.variables ?? []).filter((v) => v.role === "content" || v.type === "string").map(({ id, type, label, default: d }) => ({ id, type, label, default: d })),
      stability: it.stability ?? null, preview, vi, sourceHash: hash,
      credit: { author: it.author ?? HF_AUTHOR, link: `https://github.com/${reg.repo}/blob/${reg.ref}/registry/${e.folder}/${file}`, commit: reg.ref, licence: it.license ?? "Apache-2.0",
        made: "as shipped", madeNote: "HyperFrames' registry original, unchanged" } });
    done++;
    onProgress({ done, total: entries.length, stage: "items" });
  }
  rmSync(join(tmp, "previews-original"), { recursive: true, force: true });
  writeFileSync(join(tmp, "catalog.json"), JSON.stringify({ items }));
  writeFileSync(join(tmp, "manifest.json"), JSON.stringify({ source: "HyperFrames registry", repo: reg.repo, version: reg.version, commit: reg.ref, items: items.length,
    previews: { hf: items.filter((x) => x.preview?.source === "hf").length, rendered: items.filter((x) => x.preview?.source === "rendered").length, none: items.filter((x) => !x.preview).length },
    vietnamese: Object.fromEntries(["ok", "mixed", "missing", "unknown", "no-text"].map((s) => [s, items.filter((x) => x.vi.status === s).length])), importedAt: new Date().toISOString() }, null, 2) + "\n");
  rmSync(dir, { recursive: true, force: true });
  renameSync(tmp, dir);
  writeFileSync(join(base, "current.json"), JSON.stringify({ dir: name }) + "\n");
  cacheItems = null;
  return currentStore(root);
}

// ---- reading
let cacheItems = null;
/** Read the catalog again on the next call (after it was rewritten). */
export const reloadItems = () => { cacheItems = null; };
export function items(root = APP_ROOT) {
  const st = currentStore(root);
  if (!st) return [];
  if (cacheItems?.dir === st.dir) return cacheItems.items;
  const list = readJson(join(st.dir, "catalog.json"), { items: [] }).items
    .sort((a, b) => (a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === "block" ? -1 : 1));
  cacheItems = { dir: st.dir, items: list };
  return list;
}

/** Search with paging and facets: collections (whole library) and categories (within the chosen collection). */
export function search({ q = "", collection = "all", category = "all", kind = "all", vi = "all", ids = null, offset = 0, limit = 15 } = {}, root = APP_ROOT) {
  const words = String(q).toLowerCase().normalize("NFC").split(/\s+/).filter(Boolean);
  const all = items(root);
  const inColl = all.filter((it) => collection === "all" || it.collection === collection);
  let list = inColl.filter((it) => (category === "all" || it.category === category) && (kind === "all" || it.kind === kind) && (vi === "all" || it.vi.status === vi)
    && (!ids || ids.includes(it.id)) && words.every((w) => `${it.title} ${it.description} ${it.tags.join(" ")} ${it.id} ${it.author}`.toLowerCase().includes(w)));
  if (ids) list = ids.map((id) => list.find((x) => x.id === id)).filter(Boolean);
  const count = (arr, f) => { const o = {}; for (const x of arr) o[f(x)] = (o[f(x)] ?? 0) + 1; return o; };
  return { total: list.length, offset, items: list.slice(offset, offset + limit), collections: count(all, (x) => x.collection), categories: count(inColl, (x) => x.category) };
}

export const getItem = (id, root = APP_ROOT) => items(root).find((x) => x.id === id) ?? null;

/** What goes into the Claude feedback (or the clipboard). */
export function specText(it) {
  const vars = it.variables.filter((v) => v.type === "string").map((v) => `${v.id} ("${String(v.default ?? "").slice(0, 40)}")`).join(", ");
  return [`HyperFrames ${it.kind}: "${it.title}" (registry ${it.kind}s/${it.name}${it.duration ? `, ${it.duration} s` : ""}${it.dimensions ? `, ${it.dimensions.width}x${it.dimensions.height}` : ""}).`,
    it.description ? `What it does: ${it.description}` : "", vars ? `Text to replace: ${vars}.` : "",
    it.vi.status === "missing" || it.vi.status === "mixed" ? `Vietnamese: ${it.vi.families.filter((f) => f.vi !== true).map((f) => f.family).join(", ")} has no Vietnamese letters; use a font that has them.` : "",
    `Credit: ${it.credit.author}, ${it.credit.licence}, ${it.credit.made}, ${it.credit.link}.`].filter(Boolean).join("\n");
}

/** Copy the registry original into the project (.moworks/library/<kind>s/<name>/hf-original/) for Claude to read. */
export function stageForProject(projectDir, id, root = APP_ROOT) {
  const it = getItem(id, root);
  if (!it) throw Object.assign(new Error("Block not found"), { code: "NOT_FOUND" });
  const src = join(registryInfo(root).dir, it.folder);
  const dest = join(projectDir, ".moworks", "library", `${it.kind}s`, it.name, "hf-original");
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  placeHosted({ item: readJson(join(src, "registry-item.json"), {}) }, dest, root);    // the images it lists by URL, once ensureHosted has them
  return { item: it, files: [`.moworks/library/${it.kind}s/${it.name}/hf-original/${it.file}`] };
}

/** A preview file of the store, contained in it. */
export function mediaFile(rel, root = APP_ROOT) {
  const st = currentStore(root);
  if (!st || !/^previews\/[\w.-]+$/.test(rel)) return null;
  const f = resolve(st.dir, rel);
  return f.startsWith(resolve(st.dir) + sep) && existsSync(f) ? f : null;
}
