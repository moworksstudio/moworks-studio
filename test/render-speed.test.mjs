// Render speed: the bridge answers anidoodle's one-pixel read of #film without reading (the canvas stays on the
// GPU), and an older bridge in a built film is replaced before a render; the checks are kept by a hash of what they read (picture,
// sound, bundled files, HF and the checks' code) and reused only for the same film, with the blank-scene stills when asked, never after a
// script check that ran out of time. Light: files only, no browser and no render.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bridgeScript, refreshBridge, withBridge } from "../packages/hf-edit/lemoPage.mjs";
import { FG_WORKERS, gateHash, reusableChecks } from "../packages/server/production.mjs";
import { BG_WORKERS } from "../packages/server/proxy.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-render-speed-"));
after(() => rmSync(T, { recursive: true, force: true }));
const film = (name) => {
  const d = join(T, name);
  mkdirSync(join(d, "compositions", "anidoodle"), { recursive: true }); mkdirSync(join(d, "assets", "3_audio", "music"), { recursive: true });
  mkdirSync(join(d, "assets", "_app", "fonts"), { recursive: true });
  writeFileSync(join(d, "compositions", "anidoodle", "film.js"), "window.FILM = { seek() {} };\n");
  writeFileSync(join(d, "assets", "3_audio", "music", "song.mp3"), "ID3 one");
  writeFileSync(join(d, "assets", "_app", "fonts", "a.woff2"), "font");
  writeFileSync(join(d, "index.html"), `<html><body><div data-composition-id="main" data-duration="2"></div><script src="compositions/anidoodle/film.js"></script>
<script data-mw="lemo">
  // an older bridge
  (function () { window.__lemo = {}; })();
</script>
<audio src="assets/3_audio/music/song.mp3" data-start="0"></audio></body></html>`);
  return d;
};

test("the bridge answers anidoodle's one-pixel read of #film itself, and only that read", () => {
  const b = bridgeScript();
  assert.match(b, /w === 1 && h === 1 && this\.canvas && this\.canvas\.id === "film" && film\(\)\) return new ImageData\(1, 1\)/);
  assert.match(b, /return readPixels\.apply\(this, arguments\)/, "every other read goes to the canvas");
  assert.match(b, /__mwOnePixel/, "patched once even when the page runs the bridge twice");
});

test("a built film's older bridge is replaced before a render, once", () => {
  const d = film("bridge");
  assert.equal(refreshBridge(d), true);
  const html = readFileSync(join(d, "index.html"), "utf8");
  assert.ok(html.includes("__mwOnePixel") && !html.includes("an older bridge"));
  assert.equal((html.match(/data-mw="lemo"/g) ?? []).length, 1);
  assert.equal(refreshBridge(d), false, "already today's bridge: nothing changes (the film's hash stays)");
  assert.equal(withBridge(html), html);
  writeFileSync(join(T, "plain.html"), "<html><body>no bridge</body></html>");
  assert.equal(refreshBridge(T), false, "a page without a bridge is left alone");
});

test("the checks' hash follows the picture, the sound and the bundled files, nothing else", () => {
  const d = film("hash");
  const k0 = gateHash(d, 30);
  assert.equal(gateHash(d, 30), k0, "same film, same hash");
  mkdirSync(join(d, ".moworks"), { recursive: true }); writeFileSync(join(d, ".moworks", "project.json"), "{\"notes\":1}");
  writeFileSync(join(d, "NOTES.md"), "words");
  assert.equal(gateHash(d, 30), k0, "the project's notes and settings are not what the checks read");
  assert.notEqual(gateHash(d, 24), k0, "another frame rate");
  const song = join(d, "assets", "3_audio", "music", "song.mp3");
  writeFileSync(song, "ID3 two, longer");
  const k1 = gateHash(d, 30);
  assert.notEqual(k1, k0, "a sound change checks again");
  writeFileSync(join(d, "compositions", "anidoodle", "film.js"), "window.FILM = { seek() { return 1; } };\n");
  const k2 = gateHash(d, 30);
  assert.notEqual(k2, k1, "a picture change checks again");
  const font = join(d, "assets", "_app", "fonts", "a.woff2");
  utimesSync(font, new Date(), new Date(Date.now() + 5000));
  assert.notEqual(gateHash(d, 30), k2, "a bundled font changed");
});

test("earlier checks stand only for the same film, with the stills when asked, and never after a timed-out script check", () => {
  const d = film("reuse");
  const key = gateHash(d, 30), file = join(d, ".moworks", "cache", "gates", "checked.json");
  mkdirSync(join(file, ".."), { recursive: true });
  const gates = { pass: true, blockingFailures: [], gates: [{ id: "G-HF-SCRIPT", blocking: true, pass: true, findings: [] }] };
  writeFileSync(file, JSON.stringify({ key, blank: false, at: "2026-10-25T00:00:00Z", gates }));
  assert.equal(reusableChecks(d, key, { blank: false }).at, "2026-10-25T00:00:00Z");
  assert.equal(reusableChecks(d, key, { blank: true }), null, "Tech checks' blank-scene stills were not taken");
  assert.equal(reusableChecks(d, "another", { blank: false }), null);
  writeFileSync(file, JSON.stringify({ key, blank: true, at: "x", gates: { ...gates, gates: [{ id: "G-HF-SCRIPT", blocking: false, pass: false, timedOut: true, findings: [] }] } }));
  assert.equal(reusableChecks(d, key, { blank: false }), null, "a script check that ran out of time runs again");
});

test("a new sound mixed onto a rendered picture with HyperFrames' own mix: the picture copied bit for bit, the sound the film's length, its true peak under -1 dBFS", { timeout: 120000 }, async () => {
  const { remixAudio } = await import("../packages/hf-render-worker/client.mjs");
  const { ffmpegExe } = await import("../packages/library/preview-media.mjs");
  const { execFileSync } = await import("node:child_process");
  const d = join(T, "remix"), ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true });
  mkdirSync(join(d, "assets"), { recursive: true });
  ff(["-f", "lavfi", "-i", "testsrc2=size=320x240:rate=30:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(d, "picture.mp4")]);
  ff(["-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-af", "volume=24dB", join(d, "assets", "tone.wav")]);          // loud: the peak must be lowered
  writeFileSync(join(d, "index.html"), `<html><body><div id="main" data-composition-id="main" data-start="0" data-duration="2" data-width="320" data-height="240">
<audio id="a1" src="assets/tone.wav" data-start="0.5" data-duration="3" data-track-index="1" data-volume="1"></audio></div></body></html>`);
  const out = join(d, "out.mp4");
  const r = await remixAudio({ projectDir: d, picture: join(d, "picture.mp4"), outputPath: out, fps: 30, duration: 2, workDir: join(d, "work") }, { ffmpeg: ffmpegExe() });
  assert.equal(r.type, "done", JSON.stringify(r));
  assert.equal(r.tracks, 1);
  const md5 = (f, map) => execFileSync(ffmpegExe(), ["-v", "error", "-i", f, "-map", map, "-c", "copy", "-f", "md5", "-"], { windowsHide: true, encoding: "utf8" }).trim();
  assert.equal(md5(out, "0:v"), md5(join(d, "picture.mp4"), "0:v"), "the picture is not re-encoded");
  const info = execFileSync(join(ffmpegExe(), "..", "ffprobe.exe"), ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", out], { windowsHide: true, encoding: "utf8" });
  const a = JSON.parse(info).streams.find((s) => s.codec_type === "audio");
  assert.ok(a && Math.abs(Number(a.duration) - 2) < 0.05, info);
  const { spawnSync } = await import("node:child_process");
  const peak = spawnSync(ffmpegExe(), ["-hide_banner", "-i", out, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }).stderr;
  const tp = Number([...peak.matchAll(/Peak:\s*([-\d.]+) dBFS/g)].at(-1)?.[1]);
  assert.ok(tp <= -1, `true peak ${tp} dBFS`);
  assert.ok(r.loweredDb > 0, "a clipped tone: lowered by that many dB, as HF does");
});

test("checks run from their dialog carry the pipeline on when they pass at its checks stage (a timed-out script warning only)", async () => {
  const { checksCarryOn } = await import("../packages/server/production.mjs");
  const d = film("carry"), rev = "abc";
  mkdirSync(join(d, ".moworks", "cache", "qa"), { recursive: true });
  // a report where one gate failed, the script check, only because it ran out of time
  writeFileSync(join(d, ".moworks", "cache", "qa", "last.json"), JSON.stringify({ revision: rev, checks: [{ id: "G-HF-SCRIPT", blocking: true, pass: false,
    findings: [{ code: "check_runtime_failure", message: "Check did not finish within its deadline." }] }] }));
  const p = (pipeline, lastQa = { pass: false, blocking: 1, revision: rev }) => ({ path: d, meta: { lastQa, pipeline } });
  assert.equal(checksCarryOn(p({ ran: { checks: { at: "x" } }, finished: null })), true, "run 07: passed, at its checks: the film is done and its render starts");
  assert.equal(checksCarryOn(p({ marks: { sound: { at: "x" } } }, { pass: true, blocking: 0 })), true);
  assert.equal(checksCarryOn(p({ ran: { build: { at: "x" } } }, { pass: true, blocking: 0 })), false, "checks during the making never finish the film");
  assert.equal(checksCarryOn(p({ ran: { checks: { at: "x" } } }, { pass: false, blocking: 2, revision: "other" })), false, "a real failure stays with the owner");
});

test("workers: 4 for a Render the user waits for, 2 in the background", () => {
  assert.equal(FG_WORKERS, 4);
  assert.equal(BG_WORKERS, Number(process.env.MW_BG_WORKERS ?? 2));
});

test("the checks' own code counts as this app run read it: an edit to it while the app runs does not make Render check again", () => {
  const d = film("code-once");
  const root = join(T, "app-root"); mkdirSync(join(root, "packages", "hf-qa"), { recursive: true });
  writeFileSync(join(root, "packages", "hf-qa", "gates.mjs"), "// v1");
  const k0 = gateHash(d, 30, root);
  writeFileSync(join(root, "packages", "hf-qa", "gates.mjs"), "// v2, another session's edit");
  assert.equal(gateHash(d, 30, root), k0);
});
