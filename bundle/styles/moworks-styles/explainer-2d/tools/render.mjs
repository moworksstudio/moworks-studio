#!/usr/bin/env node
// render.mjs: export a video in one command, after the snapshots look right and the sound is mixed.
//   node tools/render.mjs <dir>
// Steps:
//   1 check     hyperframes check (a "canvas content at the edge" layout warning is expected: full-bleed art)
//   2 render    hyperframes render --fps 60 --crf 16 → renders/<slug>_master.mp4 (every frame in headless Chrome)
//   3 encode    the delivery file renders/<slug>.mp4: H.264 crf 18 (slow, tune animation, yuv420p, 60 fps) with
//               audio/mix.wav as AAC 256k, cut to the film's length with -t (never -shortest, which drops the last
//               frame). A film with no sound at all has no <audio id="mix"> line in index.html and no mix.wav:
//               its MP4 is picture only. (A missing mix.wav with the line still there stops the render.)
//   4 qc        node tools/qc.mjs <dir>
// The film's length and frame rate come from index.html's root. Progress prints every 10 %; HyperFrames' full log goes
// to renders/<slug>.render.log. Headless Chrome needs the sandbox disabled (or a normal terminal). Never play the
// result: read the QC table and a contact sheet.
import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { FFMPEG, HF_JS, ROOT, args, fail, filmOf, hfCapture, videoDirOf } from "./lib.mjs";

const USAGE = "usage: node tools/render.mjs <dir>";
const o = args(process.argv.slice(2), ["normalize"]);
const dir = videoDirOf(o._[0], USAGE);
const film = filmOf(dir);
const ff = FFMPEG();
fs.mkdirSync(path.join(dir, "renders"), { recursive: true });
const masterRel = `renders/${film.slug}_master.mp4`;
const outRel = `renders/${film.slug}.mp4`;
const logFile = path.join(dir, "renders", `${film.slug}.render.log`);
const secs = {};
const T0 = Date.now();

/** run a command in the video folder; every output line goes to the log file and to onLine. Resolves with the exit code. */
const stream = (cmd, a, onLine) =>
  new Promise((resolve) => {
    const log = fs.createWriteStream(logFile, { flags: "a" });
    log.write(`\n$ ${path.basename(cmd)} ${a.join(" ")}\n`);
    const p = spawn(cmd, a, { cwd: dir });
    let tail = "";
    const feed = (d) => {
      log.write(d);
      const parts = (tail + d).split(/\r\n|\r|\n/);
      tail = parts.pop();
      for (const l of parts) onLine(l);
    };
    p.stdout.on("data", feed);
    p.stderr.on("data", feed);
    p.on("error", (e) => (console.error(`✗ ${e.message}`), resolve(-1)));
    p.on("close", (code) => {
      if (tail) onLine(tail);
      log.end(() => resolve(code));
    });
  });
/** prints "10% 20% …" once per step */
const progress = () => {
  let shown = 0;
  return (pct) => {
    while (pct >= shown + 10 && shown < 100) {
      shown += 10;
      process.stdout.write(`${shown === 10 ? "  " : " "}${shown}%${shown === 100 ? "\n" : ""}`);
    }
  };
};

console.log(`${film.slug}: ${film.width}×${film.height} · ${film.duration} s · ${film.fps} fps`);
// HyperFrames' check fails on an <audio> clip whose file is missing, so say what to do before it runs
const mix = fs.existsSync(path.join(dir, "audio/mix.wav"));
if (!mix && /<audio\b[^>]*\bsrc\s*=\s*["']audio\/mix\.wav["']/.test(fs.readFileSync(path.join(dir, "index.html"), "utf8")))
  fail(`audio/mix.wav is missing. Make the sound first: node tools/sound.mjs ${o._[0]}
  For a picture-only film (no sound at all), delete the <audio id="mix" …> line from index.html, then render again.`);
fs.writeFileSync(logFile, `render ${film.slug} ${new Date().toISOString()}\n`);

// ---------- 1 check ----------
console.log("\n1 check");
let t = Date.now();
const chk = hfCapture(dir, ["check", "--timeout", "60s"]);
const chkText = `${chk.stdout}\n${chk.stderr}`;
fs.appendFileSync(logFile, `\n$ hyperframes check\n${chkText}`);
console.log(
  chkText
    .split("\n")
    .filter((l) => l.trim() && !/^\[hyperframes\] check: /.test(l) && !/^\s*(Report|Revision): /.test(l))
    .map((l) => `  ${l.trim()}`)
    .join("\n")
);
if (/edge/i.test(chkText)) console.log("  (a canvas-content-at-the-edge warning is expected: the art is full-bleed on purpose. It's harmless.)");
if (/StaticGuard.*__timelines/.test(chkText)) console.log("  (\"Missing window.__timelines\" is expected: the engine registers its timeline once the fonts have loaded.)");
if (chk.status !== 0) fail(`hyperframes check found errors (full report in ${logFile}): fix them, then render again`);
secs.check = (Date.now() - t) / 1000;

// ---------- 2 render ----------
console.log(`\n2 render → ${masterRel}`);
t = Date.now();
const renderPct = progress();
const keep = (l) => l.trim() && !/^\s*\[/.test(l) && !/^@hf-progress/.test(l) && !/[█░]/.test(l) && !/Keep editing|studio\/download/.test(l);
const code = await stream(process.execPath, [HF_JS(), "render", "--fps", String(film.fps), "--crf", "16", "-o", masterRel], (l) => {
  const m = l.match(/^@hf-progress (\{.*\})/);
  if (m) {
    try {
      const j = JSON.parse(m[1]);
      if (j.code === "capture" && j.total) renderPct(Math.floor((100 * j.done) / j.total));
    } catch {}
  } else if (keep(l) || /\b(error|failed|warn)/i.test(l.replace(/^\[INFO\].*/, ""))) console.log(`  ${l.trim()}`);
});
renderPct(100);
if (code !== 0 || !fs.existsSync(path.join(dir, masterRel))) fail(`hyperframes render failed (full log: ${logFile})`);
secs.render = (Date.now() - t) / 1000;

// ---------- 3 encode ----------
console.log(`\n3 encode → ${outRel}${mix ? " (with audio/mix.wav)" : " (picture only: there is no audio/mix.wav)"}`);
t = Date.now();
const pic = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-tune", "animation", "-pix_fmt", "yuv420p", "-r", String(film.fps)];
const enc = mix
  ? ["-y", "-i", masterRel, "-i", "audio/mix.wav", "-map", "0:v", "-map", "1:a", ...pic, "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", String(film.duration), outRel]
  : ["-y", "-i", masterRel, "-map", "0:v", ...pic, "-an", "-movflags", "+faststart", "-t", String(film.duration), outRel];
const encPct = progress();
let encErr = "";
const encCode = await stream(ff, ["-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1", ...enc], (l) => {
  const m = l.match(/^out_time_us=(\d+)/);
  if (m) encPct(Math.floor(Number(m[1]) / 1e4 / film.duration));
  else if (!/^[a-z_]+=/.test(l) && l.trim()) encErr += l + "\n";
});
encPct(100);
if (encCode !== 0) fail(`the delivery encode failed:\n${encErr}`);
secs.encode = (Date.now() - t) / 1000;

// ---------- 4 qc ----------
console.log("\n4 qc");
t = Date.now();
const qc = spawnSync(process.execPath, [path.join(ROOT, "tools/qc.mjs"), dir], { stdio: "inherit" });
secs.qc = (Date.now() - t) / 1000;

const mb = (rel) => (fs.statSync(path.join(dir, rel)).size / 1e6).toFixed(1);
console.log(`\n${qc.status === 0 ? "✓" : "✗"} ${film.slug} in ${((Date.now() - T0) / 1000).toFixed(0)} s   (check ${secs.check.toFixed(0)} s · render ${secs.render.toFixed(0)} s · encode ${secs.encode.toFixed(0)} s · qc ${secs.qc.toFixed(0)} s)
  delivery  ${path.join(dir, outRel)}   (${mb(outRel)} MB${mix ? "" : ", picture only"})
  master    ${path.join(dir, masterRel)}   (${mb(masterRel)} MB)
  qc        ${path.join(dir, "renders", `${film.slug}.qc.json`)}
  log       ${logFile}
${qc.status === 0 ? "  next: a contact sheet (node tools/snapshot.mjs <dir> --every 2) and, with the review module, a fresh-eyes review" : "  ✗ QC failed: fix what the table shows before delivering"}`);
process.exit(qc.status ?? 1);
