// The voice samples play (the page's CSP let only the app and Freesound in);
// a Standard MP4 held to a web ceiling (a grainy film was 26 Mbps, 111 MB for 34 s); a board redrawn in its own film.js, or
// a retake Claude asks for, is taken again (board_stills handed back the old frame 3).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VOICE_SAMPLES, startServer } from "../packages/server/index.mjs";
import { capWebBitrate, smoothCopy, webCeilingMbps } from "../packages/hf-qa/webBitrate.mjs";
import { filmHash, filmParts, proxyRoutes } from "../packages/server/proxy.mjs";
import { currentOptions, takeStills } from "../packages/hf-edit/boards.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { createStudioHost, freePort } from "../packages/hf-studio/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-t19-"));
after(() => rmSync(T, { recursive: true, force: true }));

test("the page lets ElevenLabs' voice samples play, and only those hosts", async () => {
  const ui = join(T, "ui");
  mkdirSync(ui, { recursive: true });
  writeFileSync(join(ui, "index.html"), "<!doctype html><title>x</title>");
  const s = await startServer({ token: "t0k", uiDir: ui });
  try {
    const r = await fetch(`http://127.0.0.1:${s.port}/`);
    const csp = r.headers.get("content-security-policy") ?? "";
    const media = /media-src ([^;]+)/.exec(csp)?.[1].trim().split(/\s+/) ?? [];
    for (const h of ["https://api.us.elevenlabs.io", "https://api.elevenlabs.io", "https://storage.googleapis.com/eleven-public-prod/"]) assert.ok(media.includes(h), `${h} in media-src: ${media.join(" ")}`);
    assert.ok(!media.includes("https:") && !media.includes("*") && !media.includes("https://storage.googleapis.com"), "no wider source than the samples");
    assert.ok(VOICE_SAMPLES.split(" ").every((h) => media.includes(h)));
    assert.match(csp, /connect-src 'self'/, "the page still talks only to the app");
  } finally { await s.close(); }
});

test("a Standard MP4 over the web ceiling is held to it (crf 18 + maxrate), audio kept; a quiet or already held file is left alone", { timeout: 300000 }, async () => {
  assert.equal(webCeilingMbps({ width: 1920, height: 1080, fps: 30 }), 12);
  assert.equal(webCeilingMbps({ width: 1080, height: 1350, fps: 24 }), 6.8, "Test 19's 4:5 film at 24 fps");
  const ff = ffmpegExe();
  // a grainy picture (full-frame noise, as the Silent Film's grain) at crf 18: far over its ceiling
  const noisy = join(T, "noisy.mp4");
  execFileSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x8a7a60:s=1080x1350:r=24:d=6,noise=alls=40:allf=t+u", "-f", "lavfi", "-i", "sine=f=440:d=6",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-bf", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", noisy], { windowsHide: true });
  const before = statSync(noisy).size;
  const r = await capWebBitrate(noisy);
  assert.equal(r.capped, true, JSON.stringify(r));
  assert.ok(r.after < before / 2, `much smaller: ${before} → ${r.after}`);
  // 6 s, not 3: the encoder's one-second buffer starts nearly full and a very short clip spends it on top of the ceiling (3 s: 7.5 for 6.8,
  // up to 8.7 under the suite's load with the old two-second buffer); on a film's length it is a few per cent (6.9 for 6.8)
  assert.ok(r.mbps <= r.ceiling * 1.2, `at the ceiling: ${r.mbps} for ${r.ceiling}`);
  const streams = execFileSync(join(ff, "..", "ffprobe.exe"), ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", noisy], { encoding: "utf8", windowsHide: true }).trim().split(/\s+/);
  assert.deepEqual(streams.sort(), ["audio", "video"]);
  assert.equal((await capWebBitrate(noisy)).capped, false, "held once: never encoded twice (an export that reuses the pre-render)");
  // a flat picture stays as HF made it
  const flat = join(T, "flat.mp4");
  execFileSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=white:s=1080x1350:r=24:d=2", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", flat], { windowsHide: true });
  const fb = statSync(flat).size;
  assert.equal((await capWebBitrate(flat)).capped, false);
  assert.equal(statSync(flat).size, fb);
});

const board = (frames) => `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="root" data-composition-id="board-A" data-start="0" data-duration="${frames}" data-width="640" data-height="360" style="position:relative;width:640px;height:360px;overflow:hidden">
${Array.from({ length: frames }, (_, i) => `<div class="clip" data-start="${i}" data-duration="1" data-track-index="1" style="position:absolute;inset:0;background:#a33;color:#fff;font:700 64px sans-serif;display:flex;align-items:center;justify-content:center">A${i + 1}</div>`).join("\n")}
<script>window.__timelines = window.__timelines || {}; window.__timelines["board-A"] = { duration: () => ${frames}, time: () => 0, seek() {}, pause() {}, play() {}, totalDuration: () => ${frames} };</script>
</div></body></html>`;
const md = (frames) => `# Option A: test\n\n- idea: one line\n\n${Array.from({ length: frames }, (_, i) => `## Frame ${i + 1} — Beat ${i + 1}\n- duration: 1s\n- status: outline\n`).join("\n")}`;

test("a board's own film.js is part of what its stills show; an app-made one (bundled from page.ts) is not", () => {
  const d = join(T, "hash");
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), md(2)); writeFileSync(join(d, "boards", "A", "index.html"), board(2));
  writeFileSync(join(d, "boards", "A", "film.js"), "/* frame 3 as first drawn */");
  const h1 = currentOptions(d)[0].hash;
  writeFileSync(join(d, "boards", "A", "film.js"), "/* frame 3 drawn again */");
  assert.notEqual(currentOptions(d)[0].hash, h1, "Claude's film.js changed: the board changed");
  writeFileSync(join(d, "boards", "A", "page.ts"), "export {}");
  const h2 = currentOptions(d)[0].hash;
  writeFileSync(join(d, "boards", "A", "film.js"), "/* bundled again by the app */");
  assert.equal(currentOptions(d)[0].hash, h2, "a bundle the app made from page.ts is not a change");
});

test("the frames Claude asks to see again are taken again even when the hash did not change", { timeout: 300000 }, async () => {
  const d = join(T, "retake");
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), md(2)); writeFileSync(join(d, "boards", "A", "index.html"), board(2));
  const r1 = await takeStills(d);
  assert.equal(r1.round.id, "R1");
  assert.equal((await takeStills(d)).fresh, false, "a plain call with nothing changed: the same round, as before");
  const r2 = await takeStills(d, { retake: { option: "A", frames: [2] }, by: "claude" });
  assert.equal(r2.fresh, true);
  assert.equal(r2.round.id, "R2", "the asked frame was taken in a new round");
  assert.equal(r2.round.options[0].stills.length, 2);
});

test("the Smooth copy has a keyframe at least every second and keeps the sound", { timeout: 300000 }, async () => {
  const ff = ffmpegExe(), src = join(T, "sparse.mp4"), out = join(T, "sparse.smooth.mp4");
  // one keyframe in 6 s, as HF's render between two far-apart scene changes
  execFileSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=640x800:r=24:d=6", "-f", "lavfi", "-i", "sine=f=330:d=6",
    "-c:v", "libx264", "-preset", "ultrafast", "-g", "300", "-sc_threshold", "0", "-bf", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src], { windowsHide: true });
  const keys = (f) => execFileSync(join(ff, "..", "ffprobe.exe"), ["-v", "error", "-select_streams", "v:0", "-skip_frame", "nokey", "-show_entries", "frame=pts_time", "-of", "csv=p=0", f], { encoding: "utf8", windowsHide: true })
    .trim().split(/[\s,]+/).filter(Boolean).map(Number);
  assert.deepEqual(keys(src), [0]);
  const r = await smoothCopy(src, out);
  assert.equal(r.gop, 24);
  const k = [...keys(out), 6];
  assert.ok(k.every((t, i) => i === 0 || t - k[i - 1] <= 1.001), `keyframes ${k.join(", ")}`);
  const streams = execFileSync(join(ff, "..", "ffprobe.exe"), ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", out], { encoding: "utf8", windowsHide: true }).trim().split(/\s+/);
  assert.deepEqual(streams.sort(), ["audio", "video"]);
});

test("the Editor plays the Smooth copy of the render it is made from; a render without one makes only the copy, still fresh meanwhile", () => {
  const dir = join(T, "smooth-film");
  mkdirSync(join(dir, "compositions"), { recursive: true }); mkdirSync(join(dir, ".moworks", "cache", "proxy"), { recursive: true });
  writeFileSync(join(dir, "index.html"), "<html>one</html>"); writeFileSync(join(dir, "compositions", "a.js"), "draw()");
  const p = { id: "smooth", path: dir, title: "smooth", meta: { style: { id: "brush-cartoon" }, format: { fps: 24 } } };
  const { picture, sound } = filmParts(dir, 24), hash = filmHash(dir, 24), file = `.moworks/cache/proxy/${hash}.mp4`;
  writeFileSync(join(dir, file), "mp4");
  const state = (extra) => writeFileSync(join(dir, ".moworks", "cache", "proxy", "proxy.json"), JSON.stringify({ hash, picture, sound, file, fps: 24, quality: "high", ...extra }));
  const started = [];
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" },
    jobs: { start: (kind, meta) => { const rec = { id: `j${started.length}`, kind, title: meta.title, status: "running" }; started.push(rec); return rec; }, get: (id) => started.find((j) => j.id === id) ?? null } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  const get = routes.find(([m]) => m === "GET")[2];
  state({});
  let v = get(["smooth"]);
  assert.deepEqual([v.status, v.needsSmooth, v.url.endsWith(`${hash}.mp4`)], ["fresh", true, true], "no copy yet: the render plays");
  const job = ctx.previewProxy("smooth");
  assert.equal(job.title, "Smooth preview");
  v = get(["smooth"]);
  assert.deepEqual([v.status, v.job], ["fresh", null], "only the copy is made: the render stays fresh and plays, nothing to wait for");
  const rel = `.moworks/cache/proxy/${hash}.smooth.mp4`;
  writeFileSync(join(dir, rel), "mp4");
  state({ smooth: { of: hash, file: rel } });
  v = get(["smooth"]);
  assert.deepEqual([v.needsSmooth, v.url], [false, `http://127.0.0.1:1/k/p/smooth/${rel}`], "the Editor plays the copy");
  state({ smooth: { of: "an older render", file: rel } });
  assert.ok(get(["smooth"]).url.endsWith(`${hash}.mp4`), "a copy of another render is never played");
});

test("opening the Editor stamps HF Studio's ids into the film; its render stays current; a real text edit makes it stale", { timeout: 120000 }, async () => {
  const dir = join(T, "demo-stamp");
  cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  mkdirSync(join(dir, ".moworks", "cache", "proxy"), { recursive: true });
  // a sound on the root page as the Final Mix places it: Studio stamps it too (sfx and voice)
  writeFileSync(join(dir, "index.html"), readFileSync(join(dir, "index.html"), "utf8").replace("</div>\n<script>", '  <audio id="el-voice" src="assets/voice.mp3" data-start="0" data-duration="4" data-track-index="10"></audio>\n</div>\n<script>'));
  const p = { id: "stamp", path: dir, title: "stamp", meta: { style: { id: "brush-cartoon" }, format: { fps: 24 } } };
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => { throw new Error("no render in this test"); }, get: () => null } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  const get = routes.find(([m]) => m === "GET")[2];
  const stateFile = join(dir, ".moworks", "cache", "proxy", "proxy.json");
  const record = (parts) => { const hash = filmHash(dir, 24), file = `.moworks/cache/proxy/${hash}.mp4`; writeFileSync(join(dir, file), "mp4");
    writeFileSync(stateFile, JSON.stringify({ hash, picture: parts.picture, sound: parts.sound, file, fps: 24, quality: "high" })); };
  record(filmParts(dir, 24));          // the film rendered before the Editor was opened
  assert.equal(get(["stamp"]).status, "fresh");
  const h0 = filmHash(dir, 24), before = readFileSync(join(dir, "index.html"), "utf8");

  const host = createStudioHost({ port: await freePort(4380, 0).catch(() => freePort(4390)) });
  try { await host.open({ id: "stamp", dir }); } finally { await host.stop(); }
  const stamped = readFileSync(join(dir, "index.html"), "utf8");
  assert.ok(/<audio data-hf-id="[^"]+"/.test(stamped) && /<h1 data-hf-id="[^"]+"/.test(stamped), "Studio, as shipped, stamped its ids on the elements and the sound");
  assert.equal(stamped.replace(/\s+data-hf-id="[^"]*"/g, ""), before, "and nothing else");
  assert.equal(filmHash(dir, 24), h0, "the film's hash reads no Studio id");
  assert.deepEqual([get(["stamp"]).status, get(["stamp"]).soundOnly], ["fresh", false], "the render is still the film: played and reused");

  // a render recorded while the hash still read the ids (made after the Editor opened): recorded again in today's terms, once
  record(filmParts(dir, 24, { stamps: true }));
  assert.equal(get(["stamp"]).status, "fresh");
  assert.equal(JSON.parse(readFileSync(stateFile, "utf8")).picture, filmParts(dir, 24).picture);

  // a real edit of the words still counts, ids or not
  writeFileSync(join(dir, "index.html"), stamped.replace("Xin chào Moworks", "Xin chào Moworks Studio"));
  assert.deepEqual([get(["stamp"]).status, get(["stamp"]).soundOnly], ["stale", false]);
  assert.notEqual(filmHash(dir, 24), h0);
});
