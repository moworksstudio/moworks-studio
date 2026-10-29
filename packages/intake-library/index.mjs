// Library intake: motions and blocks from other authors, each written here as
// a HyperFrames component (build.mjs) and listed under its author in the Motion Library. Authors and how their items are made:
//   Magic UI   magicuidesign/magicui @ efe76fc, MIT: React components ported to GSAP on the film's clock (adapted), numbers kept
//   Codrops    codrops/OnScrollTypographyAnimations @ af28d61 and codrops/ImageExpansionTypography @ 0d61479, MIT: scroll effects ported
//              to the film's clock (adapted), values kept
//   TakayuStudio  motion-reference.takayustudio.jp, read 12/10/2026, no licence: ideas and numbers only, each motion written here from
//              the checked spec (never the site's code)
// The sources (items/<author>/*.mjs) live in the app's git; the store (<work>/library/intake/<dir>) holds the built components, the
// catalog with each item's credit, and the previews rendered here (previews.mjs: the film's own finalize and export checks, then the
// render worker). Credit rule: author, permalink at the commit (or the item's own URL), commit or date read, licence, how
// it was made. No traceable source, no entry: an item without one fails the build.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { buildItem, camel, useLine } from "./build.mjs";
import { helperSource } from "./helpers.mjs";

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const storeRoot = (root = APP_ROOT) => process.env.MW_INTAKE_ROOT ?? join(workRoot(root), "library", "intake");
const ITEMS_DIR = join(import.meta.dirname, "items");
const STORE_DIR = "intake-1";

/** Each author: the name in the Author row, how the credit reads, where the code came from. */
export const AUTHORS = {
  magicui: { name: "Magic UI", author: "Magic UI (magicuidesign)", licence: "MIT", repo: "magicuidesign/magicui", commit: "efe76fc5755eca1142dd4f74c1d6f0ace2887e3c",
    notice: "MIT License, Copyright (c) Magic UI (LICENSE.md)", read: "2026-10-12", made: "adapted" },
  codrops: { name: "Codrops", author: "Codrops", licence: "MIT", notice: "MIT License, Copyright (c) 2009 - 2022 / 2024 Codrops (LICENSE)", read: "2026-10-12", made: "adapted",
    repos: { "codrops/OnScrollTypographyAnimations": "af28d61d1f8d3d117f5d1e9b09d5209e20a1a212", "codrops/ImageExpansionTypography": "0d614791f94198bcab655762b26a3cb85da851f4" } },
  takayu: { name: "TakayuStudio", author: "TakayuStudio (motion-reference)", licence: "No licence stated: idea and numbers only", site: "https://motion-reference.takayustudio.jp/",
    read: "2026-10-12", made: "idea" },
};
export const MADE = { shipped: "as shipped", adapted: "adapted", idea: "written from the idea" };
const MADE_NOTE = { shipped: "the original code, unchanged", adapted: "ported to GSAP on the film's clock; same timings, eases, sizes and colours; the original is linked",
  idea: "written here from the idea and its numbers; none of the source's code" };
const DATE = (d) => d.split("-").reverse().join("/");

/** The credit of one item (throws when it has no traceable source). */
export function creditOf(item) {
  const a = AUTHORS[item.author];
  if (!a) throw new Error(`${item.uid}: unknown author ${item.author}`);
  const made = item.made ?? a.made;
  const s = item.source ?? {};
  let link, commit = null, sourceText;
  if (a.site) {
    if (!s.url || !s.url.startsWith(a.site)) throw new Error(`${item.uid}: no source URL on ${a.site}`);
    link = s.url; sourceText = `${s.url.replace(/^https:\/\//, "")} (read ${DATE(a.read)})`;
  } else {
    const repo = s.repo ?? a.repo, c = a.repos?.[repo] ?? (repo === a.repo ? a.commit : null);
    if (!repo || !c || !s.path) throw new Error(`${item.uid}: no repository, commit or path`);
    commit = c;
    const lines = s.lines ? `#L${s.lines[0]}-L${s.lines[1]}` : "";
    link = `https://github.com/${repo}/blob/${c}/${s.path}${lines}`;
    sourceText = `${repo} at ${c.slice(0, 7)}, ${s.path}${s.lines ? ` lines ${s.lines[0]}-${s.lines[1]}` : ""}`;
  }
  return { author: a.author, collection: a.name, link, commit, read: a.read, licence: a.licence, notice: a.notice ?? null, made: MADE[made] + (a.site ? ` (site read ${DATE(a.read)})` : ""),
    madeNote: MADE_NOTE[made], sourceText, upstream: item.upstream ?? null };
}

let loaded = null;
/** Every item source, checked: unique ids, a kind, a credit. */
export async function loadItems({ only = null } = {}) {
  if (!loaded) {
    const list = [];
    for (const author of readdirSync(ITEMS_DIR).filter((n) => AUTHORS[n]).sort()) {
      for (const f of readdirSync(join(ITEMS_DIR, author)).filter((n) => n.endsWith(".mjs")).sort()) {
        const mod = await import(pathToFileURL(join(ITEMS_DIR, author, f)).href);
        const arr = Array.isArray(mod.default) ? mod.default : mod.default ? [mod.default] : mod.items ?? [];
        for (const it of arr) list.push({ ...it, author, uid: `in:${author}/${it.id}`, file: `${author}/${f}` });
      }
    }
    // the user's filing (kind and category per item, tools/classify-intake.mjs wrote it; edit a line to move one item); an item not in it keeps its own
    const filing = readJson(join(import.meta.dirname, "classification.json"), {});
    for (const it of list) { const f = filing[it.uid]; if (f) { it.kind = f.kind ?? it.kind; it.category = f.category ?? it.category; } }
    const seen = new Set();
    for (const it of list) {
      if (seen.has(it.uid)) throw new Error(`Duplicate intake item ${it.uid}`);
      seen.add(it.uid);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(it.id)) throw new Error(`${it.uid}: id must be kebab-case`);
      if (!["motion", "block"].includes(it.kind)) throw new Error(`${it.uid}: kind must be motion or block`);
      if (!it.title || !it.desc || !it.category || typeof it.fn !== "function") throw new Error(`${it.uid}: title, desc, category and fn are required`);
      // the film's paused timeline is the only clock (HF lint also refuses a timeline it cannot find in window.__timelines)
      const code = it.fn.toString() + (it.demo?.run ?? "");
      const bad = /\bgsap\.timeline\(|Math\.random|Date\.now|new Date\(|performance\.now|requestAnimationFrame|setTimeout|setInterval/.exec(code);
      if (bad) throw new Error(`${it.uid}: ${bad[0]} is not allowed in a motion (use the film's timeline and MW.rand)`);
      // every option the motion reads has a default (an option left undefined would turn a duration into NaN)
      if (it.author === "takayu") for (const m of it.fn.toString().matchAll(/\bo\.(\w+)/g)) if (!(m[1] in (it.defaults ?? {}))) throw new Error(`${it.uid}: o.${m[1]} has no default`);
      // every MW.<helper> the motion or its demo calls comes with the helpers it names in `uses`
      const have = new Set([...helperSource(it.uses ?? []).matchAll(/MW\.(\w+) = /g)].map((m) => m[1]).concat([...code.matchAll(/MW\.(\w+) = /g)].map((m) => m[1])));
      for (const m of code.matchAll(/MW\.(\w+)\s*\(/g)) if (!have.has(m[1]) && m[1] !== camel(it.id)) throw new Error(`${it.uid}: MW.${m[1]} is used but its helper is not in uses`);
      creditOf(it);
    }
    loaded = list;
  }
  return only ? loaded.filter((x) => only.includes(x.uid)) : loaded;
}

/** The store in use: { dir, manifest } or null. */
export function currentStore(root = APP_ROOT) {
  const base = storeRoot(root), cur = readJson(join(base, "current.json"), null);
  if (!cur?.dir || !existsSync(join(base, cur.dir, "catalog.json"))) return null;
  return { dir: join(base, cur.dir), manifest: readJson(join(base, cur.dir, "manifest.json"), {}) };
}

export const slugOf = (uid) => uid.replace(/^in:/, "").replace("/", "__");

/** Build (or bring up to date) the store: every item's component files and the catalog. Previews made earlier stay while the item's
 *  files are unchanged (their hash). Returns { dir, items, changed }. */
export async function buildStore({ root = APP_ROOT, only = null } = {}) {
  const base = storeRoot(root), dir = join(base, STORE_DIR);
  mkdirSync(join(dir, "items"), { recursive: true });
  mkdirSync(join(dir, "previews"), { recursive: true });
  const gone = new Set(deletedList(root).map((x) => x.uid));      // deleted by the user: never built again (restoreItem brings one back)
  const items = (await loadItems()).filter((x) => !gone.has(x.uid));
  const old = new Map((readJson(join(dir, "catalog.json"), { items: [] }).items ?? []).map((x) => [x.uid, x]));
  const out = [];
  let changed = 0;
  for (const it of items) {
    const prev = old.get(it.uid);
    if (only && !only.includes(it.uid)) { if (prev) out.push(prev); continue; }
    const credit = creditOf(it);
    const { files, hash } = buildItem(it, credit);
    const folder = `items/${it.author}/${it.id}`;
    if (prev?.hash !== hash || !existsSync(join(dir, folder, "demo.html"))) {
      const tmp = join(dir, folder + ".tmp");
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      for (const [n, text] of Object.entries(files)) writeFileSync(join(tmp, n), text);
      for (const a of it.assets ?? []) {        // demo media: written out, or made here with FFmpeg from a recipe (drawn, never downloaded)
        mkdirSync(dirname(join(tmp, "assets", a.path)), { recursive: true });
        if (a.data != null) writeFileSync(join(tmp, "assets", a.path), a.data);
        else execFileSync(join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe"), ["-v", "error", "-y", ...a.ffmpeg, join(tmp, "assets", a.path)], { windowsHide: true, stdio: "ignore" });
      }
      rmSync(join(dir, folder), { recursive: true, force: true });
      renameSync(tmp, join(dir, folder));
      changed++;
    }
    const res = readJson(join(dir, "previews", `${slugOf(it.uid)}.json`), null);
    const fresh = res && res.hash === hash ? res : null;
    out.push({ uid: it.uid, author: it.author, collection: credit.collection, id: it.id, kind: it.kind, title: it.title, sub: it.sub ?? "", desc: it.desc, category: it.category,
      tags: it.tags ?? [], folder, file: `${it.id}.html`, fn: `MW.${camel(it.id)}`, call: useLine(it), options: it.options ?? {}, notes: it.notes ?? "", thirdParty: it.thirdParty ?? [],
      duration: it.demo?.duration ?? it.duration ?? 5, credit, hash, source: it.file,
      preview: fresh?.preview ?? null, check: fresh?.check ?? null, vi: fresh?.vi ?? null, previewError: res && res.hash === hash ? res.error ?? null : null });
  }
  // items no longer in the sources leave the store with their files
  const keep = new Set(out.map((x) => x.folder));
  for (const a of existsSync(join(dir, "items")) ? readdirSync(join(dir, "items")) : []) for (const n of readdirSync(join(dir, "items", a))) {
    if (!keep.has(`items/${a}/${n}`) && !n.endsWith(".tmp")) rmSync(join(dir, "items", a, n), { recursive: true, force: true });
  }
  saveCatalog(dir, out);
  writeFileSync(join(base, "current.json"), JSON.stringify({ dir: STORE_DIR }) + "\n");
  return { dir, items: out.length, changed };
}

/** Write the catalog and the manifest's counts (atomic). */
export function saveCatalog(dir, items) {
  writeFileSync(join(dir, "catalog.json.part"), JSON.stringify({ items }));
  renameSync(join(dir, "catalog.json.part"), join(dir, "catalog.json"));
  const by = (f) => { const o = {}; for (const x of items) o[f(x)] = (o[f(x)] ?? 0) + 1; return o; };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ source: "Library intake (Phase 2F)", items: items.length, authors: by((x) => x.collection), kinds: by((x) => x.kind),
    previews: { rendered: items.filter((x) => x.preview).length, none: items.filter((x) => !x.preview).length, failed: items.filter((x) => x.previewError).length },
    checks: { pass: items.filter((x) => x.check?.pass).length, fail: items.filter((x) => x.check && !x.check.pass).length },
    vietnamese: by((x) => x.vi ?? "unchecked"), builtAt: new Date().toISOString() }, null, 2) + "\n");
  cache = null;
}

/** Merge the per-item preview results (written by the preview lanes) into the catalog. */
export function mergePreviews(root = APP_ROOT) {
  const st = currentStore(root);
  if (!st) return null;
  const items = readJson(join(st.dir, "catalog.json"), { items: [] }).items;
  for (const it of items) {
    const res = readJson(join(st.dir, "previews", `${slugOf(it.uid)}.json`), null);
    if (!res || res.hash !== it.hash) continue;
    it.preview = res.preview ?? it.preview ?? null; it.check = res.check ?? null; it.vi = res.vi ?? null; it.previewError = res.error ?? null;
  }
  saveCatalog(st.dir, items);
  return st;
}

// ---- reading
let cache = null;
export const reloadItems = () => { cache = null; };
export function items(root = APP_ROOT) {
  const st = currentStore(root);
  if (!st) return [];
  if (cache?.dir === st.dir) return cache.items;
  // every item of a source, as shipped (owner: never hide an item; one the user deletes leaves the store itself)
  const list = readJson(join(st.dir, "catalog.json"), { items: [] }).items;
  cache = { dir: st.dir, items: list };
  return list;
}
export const getItem = (uid, root = APP_ROOT) => items(root).find((x) => x.uid === uid) ?? null;

/** What goes into the Claude feedback (or the clipboard). */
export function specText(it) {
  return [`${it.collection} ${it.kind === "block" ? "block" : "motion"}: "${it.title}"${it.sub ? ` (${it.sub})` : ""}, library id ${it.uid}.`,
    `What it does: ${it.desc}`,
    `How to use it: paste the snippet's markup, CSS and script into the shot's composition, then on the shot's timeline ${it.call}`,
    Object.keys(it.options ?? {}).length ? `Options: ${Object.entries(it.options).map(([k, v]) => `${k} (${v})`).join("; ")}.` : "",
    it.vi === "missing" ? "Vietnamese: the demo's font lacks Vietnamese letters; use a font that has them." : "",
    `Credit: ${it.credit.author}, ${it.credit.licence}, ${it.credit.made}, ${it.credit.link}.`].filter(Boolean).join("\n");
}

/** Copy the built component into the project (.moworks/library/intake/<author>/<id>/) for Claude to read. */
export function stageForProject(projectDir, uid, root = APP_ROOT) {
  const it = getItem(uid, root), st = currentStore(root);
  if (!it || !st) throw Object.assign(new Error("Library item not found"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "intake", it.author, it.id);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(st.dir, it.folder), dest, { recursive: true });
  const rel = `.moworks/library/intake/${it.author}/${it.id}`;
  return { item: it, files: [`${rel}/${it.file}`, `${rel}/demo.html`, `${rel}/registry-item.json`] };
}

/** The items the user deleted for good (kept outside the store's folder, so a rebuild into a new folder keeps them out too). */
export function deletedList(root = APP_ROOT) { return readJson(join(storeRoot(root), "deleted.json"), { items: [] }).items ?? []; }
function saveDeleted(root, list) {
  mkdirSync(storeRoot(root), { recursive: true });
  writeFileSync(join(storeRoot(root), "deleted.json"), JSON.stringify({ items: list }, null, 2) + "\n");
}

/** Delete an item for good (what is not good enough): its component, its preview and its catalog entry
 *  leave the store, and the build skips it from now on. Films that already copied it keep their copy. Its source stays in the app's git,
 *  so restoreItem can bring it back. */
export function deleteItem(uid, root = APP_ROOT) {
  const st = currentStore(root);
  if (!st) throw Object.assign(new Error("The intake store is not built yet"), { code: "NO_STORE" });
  const all = readJson(join(st.dir, "catalog.json"), { items: [] }).items;
  const it = all.find((x) => x.uid === uid);
  if (!it) throw Object.assign(new Error("Library item not found"), { code: "NOT_FOUND" });
  const list = deletedList(root).filter((x) => x.uid !== uid);
  list.push({ uid, title: it.title, author: it.collection, at: new Date().toISOString() });
  saveDeleted(root, list);
  rmSync(join(st.dir, it.folder), { recursive: true, force: true });
  for (const ext of ["mp4", "webp", "jpg", "png", "json"]) rmSync(join(st.dir, "previews", `${slugOf(uid)}.${ext}`), { force: true });
  saveCatalog(st.dir, all.filter((x) => x.uid !== uid));
  return { uid, deleted: true, title: it.title, total: list.length };
}

/** Take an item off the deleted list; the next build writes it again and its preview is rendered again. */
export function restoreItem(uid, root = APP_ROOT) {
  const list = deletedList(root);
  if (!list.some((x) => x.uid === uid)) throw Object.assign(new Error("Not a deleted item"), { code: "NOT_FOUND" });
  saveDeleted(root, list.filter((x) => x.uid !== uid));
  return { uid, restored: true };
}

/** A preview file of the store, contained in it. */
export function mediaFile(rel, root = APP_ROOT) {
  const st = currentStore(root);
  if (!st || !/^previews\/[\w.-]+\.(mp4|webp|png|jpg)$/.test(rel)) return null;
  const f = resolve(st.dir, rel);
  return f.startsWith(resolve(st.dir) + sep) && existsSync(f) ? f : null;
}
