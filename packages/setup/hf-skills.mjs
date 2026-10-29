// HyperFrames' skills and registry for the app: the styles' rules and the Blocks library come from HF's own
// repository at the pinned commit. On the maintainer's computer they sit in the read-only clone (pins hyperframes.skillsRoot / registryRoot);
// on a new computer the app fetches only those two folders (skills/ and registry/, about 120 MB, not the whole 884 MB clone) with git, thin
// (sparse, no history, blobs on demand), into runtime/hf-src. Nothing is ever edited. Integrity: the checkout must be the pinned commit,
// with no file changed, and every skill's fingerprint must equal HF's own skills-manifest.json (the same hash HF computes:
// packages/cli/src/utils/skillsManifest.ts hashSkillBundle, Apache-2.0, ported here). A skill that does not match locks the styles using it.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";

export const hfSrc = (root = APP_ROOT) => join(root, "runtime", "hf-src");
const git = (cwd, args, timeout = 30 * 60 * 1000) => spawnSync("git", ["-c", "core.autocrlf=false", "-c", "core.longpaths=true", ...args], { cwd, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 64 << 20 });

// ---- HF's fingerprint of a skill folder (ported as is) ----
const TEXT_EXT = new Set([".md", ".txt", ".mjs", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json", ".svg", ".csv", ".yml", ".yaml"]);
const RUNTIME_DIRS = new Set(["__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "node_modules"]);
const RUNTIME_FILES = new Set([".DS_Store", "Thumbs.db"]), RUNTIME_SUFFIXES = [".pyc", ".pyo", ".swp", ".swo", "~"];
const isRuntimeFile = (n) => RUNTIME_FILES.has(n) || RUNTIME_SUFFIXES.some((s) => n.endsWith(s)) || /^desktop\.ini$/i.test(n);          // + Windows' desktop.ini
function listFilesSorted(dir) {
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (!RUNTIME_DIRS.has(n)) walk(p); } else if (!isRuntimeFile(n)) out.push(p); } };
  walk(dir);
  return out.sort();
}
/** { hash (16 hex), files } of one skill folder, as HF's skills-manifest.json records it. */
export function hashSkillBundle(skillDir) {
  const files = listFilesSorted(skillDir);
  const h = createHash("sha256");
  for (const f of files) {
    const rel = relative(skillDir, f).split(sep).join("/");
    h.update(rel); h.update("\0");
    const ext = rel.slice(rel.lastIndexOf("."));
    const buf = readFileSync(f);
    if (TEXT_EXT.has(ext)) h.update(buf.toString("utf8").replace(/\r\n/g, "\n"), "utf8"); else h.update(buf);
    h.update("\0");
  }
  return { hash: h.digest("hex").slice(0, 16), files: files.length };
}

/** Where the skills and registry are, and which commit they are pinned to. */
export function hfSources(root = APP_ROOT) {
  const h = loadPins(root).hyperframes;
  const skillsRoot = expandEnv(h.skillsRoot ?? ""), registryRoot = expandEnv(h.registryRoot ?? "");
  return { skillsRoot, registryRoot, repoRoot: dirname(skillsRoot), commit: h.source?.commit ?? null, repo: h.source?.url ?? null, own: skillsRoot.startsWith(hfSrc(root)) };
}

let cache = null;
/** Integrity: { ok, commit, head, changedFiles, skills: { name: { ok, hash, expected, files } }, checkedAt }. Cached until `fresh`. */
export function verifySkills(root = APP_ROOT, { fresh = false } = {}) {
  const s = hfSources(root);
  if (!fresh && cache?.key === s.repoRoot) return cache.value;
  const value = { ok: false, commit: s.commit, head: null, changedFiles: [], skills: {}, checkedAt: new Date().toISOString(), where: s.repoRoot };
  const manifestFile = join(s.repoRoot, "skills-manifest.json");
  if (!existsSync(s.skillsRoot) || !existsSync(manifestFile)) { value.error = "HyperFrames' skills are not on this computer"; cache = { key: s.repoRoot, value }; return value; }
  if (existsSync(join(s.repoRoot, ".git"))) {
    value.head = git(s.repoRoot, ["rev-parse", "HEAD"]).stdout.trim() || null;
    value.changedFiles = git(s.repoRoot, ["status", "--porcelain", "--", "skills", "registry", "skills-manifest.json"]).stdout.split(/\r?\n/).filter((l) => l.trim() && !/desktop\.ini$/i.test(l)).slice(0, 50);
  }
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")).skills ?? {};
  for (const [name, m] of Object.entries(manifest)) {
    const dir = join(s.skillsRoot, name);
    if (!existsSync(dir)) { value.skills[name] = { ok: false, expected: m.hash, error: "missing" }; continue; }
    const got = hashSkillBundle(dir);
    value.skills[name] = { ok: got.hash === m.hash, hash: got.hash, expected: m.hash, files: got.files };
  }
  value.ok = (!s.commit || !value.head || value.head === s.commit) && value.changedFiles.length === 0 && Object.values(value.skills).every((x) => x.ok);
  cache = { key: s.repoRoot, value };
  return value;
}
/** Is this one skill as HF ships it? (true when nothing could be checked: a missing tree is reported by the rule's own availability) */
export const skillIntact = (name, root = APP_ROOT) => { const v = verifySkills(root); return v.skills[name] ? v.skills[name].ok : true; };

/** Fetch skills/ and registry/ at the pinned commit into runtime/hf-src (a download: the user starts it). { dir, commit, ok }. */
export function fetchSkills(root = APP_ROOT, { remote = null, onLine = () => {} } = {}) {
  const h = loadPins(root).hyperframes;
  const commit = h.source?.commit, url = remote ?? h.source?.url;
  if (!commit || !url) throw Object.assign(new Error("No pinned HyperFrames commit in config/pins.json"), { code: "INVALID" });
  const dir = hfSrc(root);
  mkdirSync(dir, { recursive: true });
  const step = (args, what) => { onLine(what); const r = git(dir, args); if (r.status !== 0) throw Object.assign(new Error(`${what} failed: ${(r.stderr || r.stdout).trim().split(/\r?\n/).pop()}`), { code: "GIT_FAILED" }); return r; };
  if (!existsSync(join(dir, ".git"))) { step(["init", "-q"], "git init"); step(["remote", "add", "origin", url], "remote"); }
  step(["sparse-checkout", "set", "--cone", "skills", "registry"], "sparse checkout: skills/ and registry/");
  step(["fetch", "--depth", "1", "--filter=blob:none", "origin", commit], `fetch ${commit.slice(0, 7)}`);
  step(["-c", "advice.detachedHead=false", "checkout", "-q", "--force", "FETCH_HEAD"], "checkout");
  cache = null;
  const head = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  return { dir, commit: head, ok: head === commit };
}
