// Looks: HyperFrames' own looks, read from its hyperframes skill at the pinned commit (bundle/hf): its frame presets, the look of a whole video (the
// "video style" kind, kept apart from motions and blocks):
//   frame presets  assets/frame-presets/<name>/FRAME.md (+ caption-skin.html, frame-showcase.html): a design spec HF adopts as frame.md
//                  (references/look.md, "The project's design spec" and "Presets")
// The list comes from the skill at run time; a small store (<work>/library/looks/hf-<version>-<commit>) keeps what needs the network
// or a browser once: the Vietnamese font check and the previews (HF's own frame-showcase.html, its 16:9 frames captured with the
// pinned Chromium and joined into a short slideshow). Only the store named for the pinned commit is read: one built at another pin is never
// used (its folders may be gone from the skill), the looks then come straight from the skill until the store is built or copied.
// Each look carries its credit: HeyGen (HyperFrames), the permalink at the pinned commit, Apache-2.0, as shipped.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT, expandEnv, loadPins, resolveRuntime, sourceHead } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { HF_SKILL } from "../hf-edit/hf-scripts.mjs";
import { fontMap } from "../hf-edit/finalize.mjs";
import { googleHasVietnamese, WINDOWS_VI } from "../blocks-library/index.mjs";
import { encodePosterAsync, PREVIEW } from "../library/preview-media.mjs";
import { customMedia, customSlug, frameText, getCustom } from "./custom.mjs";

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const storeRoot = (root = APP_ROOT) => process.env.MW_LOOKS_ROOT ?? join(workRoot(root), "library", "looks");
const HF_AUTHOR = "HeyGen (HyperFrames)";
const CATEGORY = "Brand Kits";          // the user-facing name of HF's frame presets; the kind stays "frame"

function source(root) {
  const pins = loadPins(root), skills = expandEnv(pins.hyperframes.skillsRoot);
  // the clone's own git HEAD or the bundled copy's PINNED file (never the git of a folder above it), else the pin
  const commit = sourceHead(dirname(skills)) ?? pins.hyperframes.source?.commit ?? `v${pins.hyperframes.default}`;
  return { dir: join(skills, HF_SKILL), repo: pins.hyperframes.repo, version: pins.hyperframes.default, commit };
}
/** HF's hyperframes skill folder at the pinned commit (assets/frame-presets, references/look.md). */
export const hfLookDir = (root = APP_ROOT) => source(root).dir;
/** HyperFrames' guide to a design spec, in the skill folder: how a FRAME.md becomes a project's frame.md. */
export const LOOK_GUIDE = "references/look.md";
const link = (src, rel, line) => `https://github.com/${src.repo}/blob/${src.commit}/skills/hyperframes/${rel}${line ? `#L${line}` : ""}`;
const uniq = (a) => [...new Set(a)];
const fontsIn = (text) => uniq([...text.matchAll(/fontFamily:\s*"?([^"\n,}]+?)"?\s*(?:[,}\n])/g)].map((m) => m[1].trim()).filter(Boolean));
/** The font families a Brand Kit's frame.md names (its typography's fontFamily lines). */
export const frameFonts = (text) => fontsIn(String(text ?? ""));
const hexesIn = (text) => uniq([...text.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toUpperCase()));

/** Frame presets: FRAME.md front matter (name, description, colors, the font families named in typography). */
function framePresets(src) {
  const base = join(src.dir, "assets", "frame-presets");
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((n) => existsSync(join(base, n, "FRAME.md"))).map((n) => {
    const md = readFileSync(join(base, n, "FRAME.md"), "utf8");
    const front = /^---\n([\s\S]*?)\n---/.exec(md.replace(/\r\n/g, "\n"))?.[1] ?? md;
    const title = (/^name:\s*(.+)$/m.exec(front)?.[1] ?? n).split(/\s+—\s+/)[0].trim();
    const desc = (/^description:\s*>?\s*\n((?:[ \t]+.+\n?)+)/m.exec(front)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const colorsBlock = /^colors:\s*\n((?:[ \t]+.+\n?)+)/m.exec(front)?.[1] ?? "";
    return { id: `frame/${n}`, kind: "frame", name: n, title, description: desc, colors: hexesIn(colorsBlock), fonts: fontsIn(front),
      folder: `assets/frame-presets/${n}`, file: `assets/frame-presets/${n}/FRAME.md`, credit: { author: HF_AUTHOR, link: link(src, `assets/frame-presets/${n}/FRAME.md`), commit: src.commit,
        licence: "Apache-2.0", made: "as shipped", madeNote: "HyperFrames' frame preset, unchanged" } };
  });
}
/** Every look in HF's skill at the pinned commit (no network). */
export function registryLooks(root = APP_ROOT) {
  return framePresets(source(root));
}

// ---- the store: Vietnamese check and previews, once per HF version
/** The folder of the store for the pinned commit: hf-<version>-<commit>. */
export const storeName = (root = APP_ROOT) => { const s = source(root); return `hf-${s.version}-${s.commit.slice(0, 7)}`; };
/** The store built at the pinned commit: { dir, manifest } or null. */
export function currentStore(root = APP_ROOT) {
  const dir = join(storeRoot(root), storeName(root));
  if (!existsSync(join(dir, "catalog.json"))) return null;
  return { dir, manifest: readJson(join(dir, "manifest.json"), {}) };
}

/** Does every font of a look have Vietnamese letters? { status: ok | missing | unknown | null (no fonts), families }. */
export async function vietnameseCheck(fonts, { google = googleHasVietnamese, cache = new Map() } = {}) {
  if (!fonts.length) return { status: null, families: [] };
  const bundled = new Set(Object.keys(fontMap()).map((k) => k.toLowerCase()));
  const families = [];
  for (const fam of fonts) {
    const key = fam.toLowerCase();
    if (bundled.has(key)) { families.push({ family: fam, vi: true, via: "bundled with the app" }); continue; }
    if (WINDOWS_VI.has(key)) { families.push({ family: fam, vi: true, via: "Windows font" }); continue; }
    if (!cache.has(key)) cache.set(key, await google(fam));
    families.push({ family: fam, vi: cache.get(key), via: cache.get(key) === null ? "not on Google Fonts" : "Google Fonts" });
  }
  const status = families.some((f) => f.vi === false) ? "missing" : families.some((f) => f.vi === null) ? "unknown" : "ok";
  return { status, families };
}

export function ffmpegExe(root) { return join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe"); }
export function puppeteerOf(root) { return createRequire(join(resolveRuntime(null, root).dir, "node_modules", "puppeteer-core", "package.json"))("puppeteer-core"); }

/** Previews: the first six 16:9 frames of HF's frame-showcase.html (poster + a 7 s slideshow). */
async function makePreviews(looks, dir, src, root, onProgress) {
  const puppeteer = puppeteerOf(root);
  const browser = await puppeteer.launch({ executablePath: resolveRuntime(null, root).chromium, headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });
  const out = {};
  try {
    let done = 0;
    for (const look of looks) {
      const slug = look.id.replace("/", "__");
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(join(src.dir, look.folder, "frame-showcase.html")).href, { waitUntil: "networkidle0", timeout: 45000 }).catch(() => {});
        await page.evaluate(() => document.fonts?.ready);
        const frames = (await page.$$(".frame")).slice(0, 6);
        const tmp = join(dir, "previews", `${slug}.parts`); mkdirSync(tmp, { recursive: true });
        let n = 0;
        for (const el of frames) { await el.scrollIntoView(); await el.screenshot({ path: join(tmp, `f${++n}.png`) }); }
        if (!n) throw new Error("no .frame in frame-showcase.html");
        // preview sizes (../library/preview-media.mjs): a 640 px WebP poster, a 640 × 360 slideshow at 24 fps, CRF 30; encoded off the
        // event loop (the import is a job of the app's server)
        await encodePosterAsync(join(tmp, "f1.png"), join(dir, "previews", `${slug}.webp`), { root });
        const W = PREVIEW.width, Hh = Math.round(W * 9 / 16);
        await promisify(execFile)(ffmpegExe(root), ["-v", "error", "-y", "-framerate", "1/1.2", "-i", join(tmp, "f%d.png"), "-vf", `scale=${W}:${Hh}:force_original_aspect_ratio=decrease,pad=${W}:${Hh}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
          "-r", String(PREVIEW.fps), "-c:v", "libx264", "-crf", String(PREVIEW.crf), "-movflags", "+faststart", join(dir, "previews", `${slug}.mp4`)], { windowsHide: true });
        rmSync(tmp, { recursive: true, force: true });
        out[look.id] = { poster: `previews/${slug}.webp`, video: `previews/${slug}.mp4`, frames: n, method: "screenshots of HyperFrames' frame-showcase.html, joined here", encode: PREVIEW.label };
      } catch (e) { out[look.id] = { poster: null, video: null, error: String(e.message ?? e).slice(0, 200) }; }
      finally { await page.close().catch(() => {}); }
      onProgress({ done: ++done, total: looks.length, id: look.id });
    }
  } finally { await browser.close().catch(() => {}); }
  return out;
}

/** Build the store: Vietnamese check (Google Fonts asked once per family) and previews. */
export async function importLooks({ root = APP_ROOT, google = googleHasVietnamese, onProgress = () => {}, previews = true, only = null } = {}) {
  const src = source(root), looks = registryLooks(root).filter((l) => !only || only.includes(l.id));     // only: for tests
  const name = storeName(root);
  const base = storeRoot(root), dir = join(base, name), tmp = dir + ".tmp";
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(join(tmp, "previews"), { recursive: true });
  const cache = new Map(), vi = {};
  for (const l of looks) vi[l.id] = await vietnameseCheck(l.fonts, { google, cache });
  const pv = previews ? await makePreviews(looks, tmp, src, root, onProgress) : {};
  const items = looks.map((l) => ({ ...l, vi: vi[l.id], preview: pv[l.id] ?? null }));
  writeFileSync(join(tmp, "catalog.json"), JSON.stringify({ items }));
  writeFileSync(join(tmp, "manifest.json"), JSON.stringify({ source: "HyperFrames skill hyperframes (assets/frame-presets)", repo: src.repo, version: src.version, commit: src.commit,
    items: items.length, kinds: { frame: items.filter((x) => x.kind === "frame").length },
    previews: items.filter((x) => x.preview?.poster).length, importedAt: new Date().toISOString() }, null, 2) + "\n");
  rmSync(dir, { recursive: true, force: true }); renameSync(tmp, dir);
  writeFileSync(join(base, "current.json"), JSON.stringify({ dir: name }) + "\n");
  cacheItems = null;
  return currentStore(root);
}

// ---- reading
let cacheItems = null;
/** The looks with their check and previews; straight from the skill (no previews, no check) when the store is not built yet. */
export function items(root = APP_ROOT) {
  const st = currentStore(root);
  const key = st?.dir ?? "clone";
  if (cacheItems?.key === key) return cacheItems.items;
  const list = st ? readJson(join(st.dir, "catalog.json"), { items: [] }).items : registryLooks(root).map((l) => ({ ...l, vi: null, preview: null }));
  for (const l of list) l.category = CATEGORY;
  cacheItems = { key, items: list };
  return list;
}
export const getItem = (id, root = APP_ROOT) => items(root).find((x) => x.id === id) ?? null;

/** What goes into the Claude feedback (or the clipboard). */
export function specText(l) {
  const vi = l.vi?.status === "missing" ? `Vietnamese: ${l.vi.families.filter((f) => f.vi === false).map((f) => f.family).join(", ")} has no Vietnamese letters; use a font that has them for Vietnamese text.` : "";
  const head = `HyperFrames look (frame preset): "${l.title}". Adopt it the HyperFrames way: its FRAME.md becomes the project's frame.md (HyperFrames' references/look.md, "The project's design spec"); keep the film's content, timing and narration.`;
  return [head, l.description ? `What it is: ${l.description.slice(0, 400)}` : "", l.colors.length ? `Colours: ${l.colors.slice(0, 12).join(" ")}.` : "",
    l.fonts.length ? `Fonts: ${l.fonts.join(", ")}.` : "", vi, `Credit: ${l.credit.author}, ${l.credit.licence}, ${l.credit.made}, ${l.credit.link}.`].filter(Boolean).join("\n");
}

/** A Look's design as the project's frame.md: a frame preset's FRAME.md as HyperFrames ships it, or the current version of
 *  one of the user's Looks ("custom/<slug>", with its version). { title, text, version? } or null (not found). The
 *  app writes it when the project is made; Claude reads it, never writes it. */
export function lookFrame(id, root = APP_ROOT) {
  if (customSlug(id)) { const m = getCustom(id, root), text = frameText(m, root); return text ? { title: m.title, text, version: m.version } : null; }
  const l = getItem(id, root);
  if (!l) return null;
  try { return { title: l.title, text: readFileSync(join(source(root).dir, l.folder, "FRAME.md"), "utf8") }; } catch { return null; }
}

/** Copy the look's own files into the project (.moworks/library/looks/<kind>/<name>/hf-original/) for Claude to read, with HF's guide. */
export function stageForProject(projectDir, id, root = APP_ROOT) {
  const l = getItem(id, root);
  if (!l) throw Object.assign(new Error("Brand Kit not found"), { code: "NOT_FOUND" });
  const src = source(root);
  const dest = join(projectDir, ".moworks", "library", "looks", l.kind, l.name, "hf-original");
  rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
  const rel = (f) => `.moworks/library/looks/${l.kind}/${l.name}/hf-original/${f}`;
  cpSync(join(src.dir, l.folder), dest, { recursive: true });
  const files = [rel("FRAME.md")];
  const guide = join(src.dir, ...LOOK_GUIDE.split("/"));
  if (existsSync(guide)) { cpSync(guide, join(dest, "look.md")); files.push(rel("look.md")); }
  return { item: l, files };
}

/** A preview file of the store, contained in it. */
export function mediaFile(rel, root = APP_ROOT) {
  if (rel.startsWith("custom/")) return customMedia(rel, root);
  const st = currentStore(root);
  if (!st || !/^previews\/[\w.-]+$/.test(rel)) return null;
  const f = resolve(st.dir, rel);
  return f.startsWith(resolve(st.dir) + sep) && existsSync(f) ? f : null;
}
