// HyperFrames' skills checked against HF's own manifest (the same fingerprint HF computes), a changed skill
// reported (its styles locked), the thin fetch of skills/ + registry/ at the pinned commit (opt-in: MW_TEST_HF_FETCH=1, it copies ~195 MB),
// and the Python components' status.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fetchSkills, hashSkillBundle, verifySkills } from "../packages/setup/hf-skills.mjs";
import { COMPONENTS, status } from "../packages/setup/python.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-setup-"));
after(() => rmSync(T, { recursive: true, force: true }));
const APP = join(import.meta.dirname, "..");
const pins = JSON.parse(readFileSync(join(APP, "config", "pins.json"), "utf8"));
/** An app root of its own whose pins point at `skills` (a folder with skills-manifest.json beside it). */
function fakeRoot(name, skillsRoot) {
  const r = join(T, name); mkdirSync(join(r, "config"), { recursive: true });
  writeFileSync(join(r, "config", "pins.json"), JSON.stringify({ ...pins, hyperframes: { ...pins.hyperframes, skillsRoot, registryRoot: join(skillsRoot, "..", "registry") } }));
  return r;
}

test("HF's fingerprint: line endings and runtime files do not count; one changed byte does", () => {
  const d = join(T, "skill"); mkdirSync(join(d, "references"), { recursive: true }); mkdirSync(join(d, "__pycache__"), { recursive: true });
  writeFileSync(join(d, "SKILL.md"), "# a\nb\n"); writeFileSync(join(d, "references", "x.md"), "x\n"); writeFileSync(join(d, "__pycache__", "y.pyc"), "zz");
  const a = hashSkillBundle(d);
  assert.equal(a.files, 2);
  writeFileSync(join(d, "SKILL.md"), "# a\r\nb\r\n"); writeFileSync(join(d, "desktop.ini"), "[x]");
  assert.deepEqual(hashSkillBundle(d), a, "CRLF, desktop.ini and __pycache__ do not change it");
  writeFileSync(join(d, "references", "x.md"), "y\n");
  assert.notEqual(hashSkillBundle(d).hash, a.hash);
});

test("integrity against the manifest: all match; a changed skill is reported and fails the check", () => {
  const repo = join(T, "repo"); mkdirSync(join(repo, "skills", "one"), { recursive: true }); mkdirSync(join(repo, "skills", "two"), { recursive: true });
  writeFileSync(join(repo, "skills", "one", "SKILL.md"), "one\n"); writeFileSync(join(repo, "skills", "two", "SKILL.md"), "two\n");
  writeFileSync(join(repo, "skills-manifest.json"), JSON.stringify({ source: "x", skills: { one: hashSkillBundle(join(repo, "skills", "one")), two: hashSkillBundle(join(repo, "skills", "two")) } }));
  const root = fakeRoot("r1", join(repo, "skills"));
  const v = verifySkills(root, { fresh: true });
  assert.equal(v.ok, true); assert.equal(Object.keys(v.skills).length, 2);
  writeFileSync(join(repo, "skills", "two", "SKILL.md"), "two, edited\n");
  const w = verifySkills(root, { fresh: true });
  assert.equal(w.ok, false); assert.equal(w.skills.one.ok, true); assert.equal(w.skills.two.ok, false);
});

test("the pinned HF checkout on this computer is intact", { skip: !pins.hyperframes.source && "no pinned commit" }, () => {
  const v = verifySkills(APP, { fresh: true });
  assert.equal(v.ok, true, JSON.stringify({ head: v.head, changed: v.changedFiles, bad: Object.entries(v.skills).filter(([, x]) => !x.ok) }));
});

test("the thin fetch: skills/ and registry/ at the pinned commit, intact, and the pins follow it", { timeout: 600000, skip: process.env.MW_TEST_HF_FETCH !== "1" && "opt-in (MW_TEST_HF_FETCH=1): copies about 195 MB" }, async () => {
  const root = fakeRoot("r2", "X:/nowhere/skills");
  const r = await fetchSkills(root, { remote: join(APP, "..", "vendor", basename(pins.hyperframes.source.url, ".git")) });   // the read-only HF clone, named after the repo (skillsRoot is the app's bundle now, no git)
  assert.equal(r.ok, true);
  const { loadPins } = await import("../packages/version-manager/index.mjs");
  assert.match(loadPins(root).hyperframes.skillsRoot, /runtime[\\/]hf-src[\\/]skills$/);
  assert.equal(verifySkills(root, { fresh: true }).ok, true);
});

test("Python components: each pinned with its licence and link, and checked", () => {
  for (const c of COMPONENTS) { assert.match(c.pip, /==\d/); assert.ok(c.licence && /^https:\/\//.test(c.link), c.module); }
  const s = status();
  assert.equal(s.components.length, COMPONENTS.length);
  if (s.python) assert.equal(typeof s.ready, "boolean");
});
