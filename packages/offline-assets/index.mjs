// Offline assets the films need (nothing from the kit at run time): the bundled fonts (config/fonts.json: google/fonts at a pinned
// commit, OFL), GSAP, three.js and clipper-lib (config/pins.json gsap, three, clipperLib: jsDelivr's npm copy at pinned versions).
// Each file is downloaded once into the app's runtime folder and checked by SHA-256; a file that does not match is removed and reported.
// finalize, scaffold, the AE port and the system check read them from here.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";

const abs = (root, p) => { const e = expandEnv(p); return isAbsolute(e) ? e : join(root, e); };
/** The folder of the bundled fonts (files keep their path from config/fonts.json, e.g. google/Anton/Anton-Regular.ttf). */
export const fontsDir = (root = APP_ROOT) => process.env.MW_FONTS_DIR ?? abs(root, loadPins(root).fonts.dir);
export const gsapFile = (root = APP_ROOT) => process.env.MW_GSAP_FILE ?? abs(root, loadPins(root).gsap.file);
/** GSAP's MotionPathPlugin at the same version (HyperFrames Studio needs it in the film; see config/pins.json). */
export const motionPathFile = (root = APP_ROOT) => { const m = loadPins(root).gsap.motionPath; return m ? process.env.MW_MOTIONPATH_FILE ?? abs(root, m.file) : null; };
/** three.js: <dir>/<version>/<path as in the npm package>, e.g. 0.184.0/build/three.module.min.js. */
export const threeDir = (root = APP_ROOT) => process.env.MW_THREE_DIR ?? abs(root, loadPins(root).three.dir);
/** The pinned three.js versions: { default, versions: { [version]: [paths] } }. */
export function threeVersions(root = APP_ROOT) {
  const t = loadPins(root).three;
  return { default: t.default, versions: Object.fromEntries(Object.entries(t.versions).map(([v, x]) => [v, x.files.map((f) => f.path)])) };
}
/** npm libraries of the code-film styles (config/pins.json codeLibs): <dir>/<name>/<version>/<path>. */
export const codeLibDir = (root = APP_ROOT) => process.env.MW_CODELIB_DIR ?? abs(root, loadPins(root).codeLibs?.dir ?? "runtime/vendor/lib");
export const clipperFile = (root = APP_ROOT) => process.env.MW_CLIPPER_FILE ?? abs(root, loadPins(root).clipperLib.file);
const fontList = (root) => JSON.parse(readFileSync(join(root, "config", "fonts.json"), "utf8"));

/** Every file to have: { kind, name, dest, url, sha256, size }. */
export function wanted(root = APP_ROOT) {
  const dir = fontsDir(root), out = [];
  for (const [family, files] of Object.entries(fontList(root).families)) for (const f of files) {
    const dest = resolve(dir, f.file);
    if (!dest.startsWith(resolve(dir) + sep)) continue;
    out.push({ kind: "font", name: `${family}: ${f.file.split("/").pop()}`, dest, url: f.url, sha256: f.sha256, size: f.size });
  }
  const g = loadPins(root).gsap;
  out.push({ kind: "gsap", name: `GSAP ${g.version}`, dest: gsapFile(root), url: g.url, sha256: g.sha256, size: null });
  if (g.motionPath) out.push({ kind: "gsap", name: `GSAP MotionPathPlugin ${g.version}`, dest: motionPathFile(root), url: g.motionPath.url, sha256: g.motionPath.sha256, size: null });
  const t = loadPins(root).three, tdir = threeDir(root);
  for (const [v, x] of Object.entries(t.versions)) for (const f of x.files) {
    const dest = resolve(tdir, v, f.path);
    if (!dest.startsWith(resolve(tdir) + sep)) continue;
    out.push({ kind: "three", name: `three.js ${v}: ${f.path}`, dest, url: t.url.replace("{version}", v).replace("{path}", f.path), sha256: f.sha256, size: f.size });
  }
  const c = loadPins(root).clipperLib;
  out.push({ kind: "lib", name: `clipper-lib ${c.version}`, dest: clipperFile(root), url: c.url, sha256: c.sha256, size: c.size });
  const libs = loadPins(root).codeLibs, ldir = codeLibDir(root);
  for (const [name, p] of Object.entries(libs?.packages ?? {})) for (const f of p.files) {
    const dest = resolve(ldir, name, p.version, f.path);
    if (!dest.startsWith(resolve(ldir) + sep)) continue;
    out.push({ kind: "lib", name: `${name} ${p.version}: ${f.path}`, dest, url: libs.url.replace("{name}", name).replace("{version}", p.version).replace("{path}", f.path), sha256: f.sha256, size: f.size });
  }
  return out;
}

/** What is there: { ready, total, fonts: { have, total }, gsap, three, missing: [names], bytesMissing }. Sizes only, no hashing (fast). */
export function status(root = APP_ROOT) {
  const all = wanted(root);
  const missing = all.filter((w) => !existsSync(w.dest) || (w.size && statSync(w.dest).size !== w.size));
  const fonts = all.filter((w) => w.kind === "font");
  return { ready: missing.length === 0, total: all.length, fonts: { have: fonts.length - missing.filter((m) => m.kind === "font").length, total: fonts.length },
    gsap: !missing.some((m) => m.kind === "gsap"), three: !missing.some((m) => m.kind === "three"), missing: missing.map((m) => m.name),
    bytesMissing: missing.reduce((a, m) => a + (m.size ?? 75000), 0), dir: fontsDir(root), source: fontList(root).source };
}

/** Download what is missing (or, with `verify`, also re-check what is there). Progress { done, total, name }. */
export async function install({ root = APP_ROOT, fetchImpl = fetch, signal, onProgress = () => {}, verify = false } = {}) {
  const sha = (b) => createHash("sha256").update(b).digest("hex");
  const all = wanted(root);
  const todo = all.filter((w) => !existsSync(w.dest) || (w.size && statSync(w.dest).size !== w.size) || (verify && sha(readFileSync(w.dest)) !== w.sha256));
  const failed = [];
  let done = 0, bundled = 0;
  for (const w of todo) {
    if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    // the copy that came with the app (bundle/ mirrors the app's folders) when it is the pinned file: no download
    const inApp = relative(root, w.dest), fromBundle = !inApp.startsWith("..") && !isAbsolute(inApp) && join(root, "bundle", inApp);
    if (fromBundle && existsSync(fromBundle)) {
      const buf = readFileSync(fromBundle);
      if (sha(buf) === w.sha256) {
        mkdirSync(dirname(w.dest), { recursive: true }); writeFileSync(w.dest, buf); bundled++;
        onProgress({ done: ++done, total: todo.length, name: w.name, bundled: true });
        continue;
      }
    }
    try {
      const r = await fetchImpl(w.url, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (sha(buf) !== w.sha256) throw new Error("SHA-256 does not match the pinned file");
      mkdirSync(dirname(w.dest), { recursive: true });
      writeFileSync(w.dest + ".part", buf);
      renameSync(w.dest + ".part", w.dest);
    } catch (e) {
      if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
      rmSync(w.dest + ".part", { force: true });
      failed.push({ name: w.name, url: w.url, error: String(e.message ?? e) });
    }
    onProgress({ done: ++done, total: todo.length, name: w.name });
  }
  return { downloaded: todo.length - failed.length - bundled, bundled, failed, ...status(root) };
}
