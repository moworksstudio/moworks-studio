// sound.mjs: build a video's sound: the cue sheet → effects → music → mix (−14 LUFS) → verify.
//   node tools/sound.mjs <video dir> [--music generic|off] [--sfx generic|off] [--bespoke]
// Generic route (the kit's sound): story/sound.json + story/words.json → audio/cues.json (build_cues.py) →
//   audio/sfx.wav (sfx.py) → audio/music.wav (music.py) → audio/mix.wav (mix.py) → verify_mix.py.
//   The film length comes from index.html's root and is written into story/sound.json and audio/cues.json.
//   With no audio/vo.wav (a film without a narrator) the cues use absolute times ("t") and the music and effects
//   are mastered to −14 LUFS on their own (mix.py --normalize).
// --music / --sfx: "generic" or "off" (default: kit.config.json → sound, else generic).
// --bespoke: run the video's own sound/build.mjs instead (a film-specific score; see the worked example).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, FFMPEG, UV, args, config, fail, filmOf, videoDirOf } from "./lib.mjs";

const USAGE = "usage: node tools/sound.mjs <video dir> [--music generic|off] [--sfx generic|off] [--bespoke]";
const a = args(process.argv.slice(2), ["bespoke"]);
const dir = videoDirOf(a._[0], USAGE);
const rel = (p) => {
  const r = path.relative(ROOT, p);
  return r.startsWith("..") || path.isAbsolute(r) ? p : r || ".";
};
const film = filmOf(dir);
const env = { ...process.env, FFMPEG: FFMPEG(), KIT_ROOT: ROOT };

// ---------- the video's own sound
if (a.bespoke) {
  const build = path.join(dir, "sound/build.mjs");
  if (!fs.existsSync(build)) fail(`${rel(build)} is missing: this video has no film-specific sound (drop --bespoke for the generic kit)`);
  const r = spawnSync(process.execPath, [build], { cwd: dir, env, stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const cfg = config().sound || {};
const pick = (name) => {
  const v = a[name] ?? cfg[name] ?? "generic";
  if (!["generic", "off"].includes(v)) fail(`--${name} must be generic or off (got ${v})`);
  return v;
};
const music = pick("music");
const sfx = pick("sfx");

/** a kit Python tool through uv, with the pinned packages (the same call as tools/py.mjs); returns the exit code */
const py = (script, pyArgs, { allowFail = false } = {}) => {
  const r = spawnSync(
    UV(),
    ["run", "--quiet", "--no-project", "--python", "3.12", "--with-requirements", path.join(ROOT, "tools/audio/requirements.txt"), "python", path.join(ROOT, script), ...pyArgs],
    { cwd: ROOT, env, stdio: "inherit" },
  );
  if (r.status !== 0 && !allowFail) fail(`${path.basename(script)} failed (exit ${r.status}); see the lines above`);
  return r.status;
};

const audio = path.join(dir, "audio");
fs.mkdirSync(audio, { recursive: true });
const vo = path.join(audio, "vo.wav");
const hasVo = fs.existsSync(vo);
const sheet = path.join(dir, "story/sound.json");
const cues = path.join(audio, "cues.json");
console.log(`sound: ${rel(dir)}  ${film.duration} s · voice ${hasVo ? "audio/vo.wav" : "none"} · music ${music} · effects ${sfx}`);
if (!hasVo && music === "off" && sfx === "off") {
  // no voice, no music, no effects: a silent track, so the film still checks and renders
  const r = spawnSync(env.FFMPEG, ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", String(film.duration), "-c:a", "pcm_s24le", path.join(audio, "mix.wav")]);
  if (r.status !== 0) fail("ffmpeg could not write the silent audio/mix.wav");
  for (const f of ["sfx.wav", "music.wav", "mix.json"]) fs.rmSync(path.join(audio, f), { force: true });
  console.log(`✓ ${rel(path.join(audio, "mix.wav"))}: silent (no voice, music and effects off)`);
  process.exit(0);
}

// ---------- 1. the cue sheet, with the film's length
if (!fs.existsSync(sheet)) {
  if (sfx === "generic") fail(`${rel(sheet)} is missing: write the cue sheet (word-keyed sound cues; see tools/audio/AUDIO.md), or use --sfx off`);
  fs.writeFileSync(sheet, JSON.stringify({ duration: film.duration, vo: "vo.wav", cues: [] }, null, 1) + "\n");
  console.log(`  wrote an empty cue sheet ${rel(sheet)}`);
}
let spec;
try {
  spec = JSON.parse(fs.readFileSync(sheet, "utf8"));
} catch (e) {
  fail(`${rel(sheet)} is not valid JSON: ${e.message}`);
}
if (spec.duration !== film.duration) {
  // change only the number, so the sheet keeps its layout
  const text = fs.readFileSync(sheet, "utf8");
  const swapped = text.replace(/("duration"\s*:\s*)-?[\d.eE+-]+/, `$1${film.duration}`);
  spec.duration = film.duration;
  fs.writeFileSync(sheet, swapped !== text && JSON.parse(swapped).duration === film.duration ? swapped : JSON.stringify(spec, null, 1) + "\n");
  console.log(`  ${rel(sheet)}: duration set to ${film.duration} s (from index.html)`);
}
if (!hasVo && !fs.existsSync(path.join(dir, "story/words.json")) && (spec.cues || []).some((c) => "word" in c))
  fail("the cue sheet keys cues to words, but there is no voice and no story/words.json: use absolute times (\"t\") for a film without a narrator, or time the voice first (node tools/time-voice.mjs)");
py("tools/audio/build_cues.py", [dir, "--duration", String(film.duration)]);

// ---------- 2. effects and music (a switched-off stem is removed, so no stale file is mixed)
const step = (on, script, wav) => {
  if (on) py(script, ["--cues", cues, "--out-dir", audio]);
  else fs.rmSync(path.join(audio, wav), { force: true });
};
step(sfx === "generic", "tools/audio/sfx.py", "sfx.wav");
step(music === "generic", "tools/audio/music.py", "music.wav");

// ---------- 3. the mix: bed about −21 LU under the voice with a 3 dB duck, effects around −13 LU, master −14 LUFS.
// With no voice the bed and the effects carry the film (mix.py's --music-lu-alone / --sfx-lu-alone) and the mix is
// mastered to −14 LUFS on its own, with a ceiling that keeps the AAC true peak under −1 dBTP.
const mixArgs = ["--cues", cues, "--out-dir", audio, "--music-lu", "-21", "--duck-music", "3", "--sfx-lu", "-13", "--duck-sfx", "0"];
if (!hasVo) mixArgs.push("--normalize", "--ceiling", "-1.8", "--tp-limit", "-1.2");
py("tools/audio/mix.py", mixArgs);

// ---------- 4. verify
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sound-verify-"));
const code = py("tools/audio/verify_mix.py", [dir, "--scratch", scratch], { allowFail: true });
if (code !== 0)
  fail(
    "the mix did not pass verify_mix (the FAIL lines above say what). Usual fixes: an effect masking a word → lower its gain_db\n" +
      "  or move it off the word in story/sound.json; loudness → re-run this command; then run it again.",
  );
console.log(`✓ ${rel(path.join(audio, "mix.wav"))} (measured; nobody listened). Next: node tools/snapshot.mjs ${rel(dir)} … or node tools/render.mjs ${rel(dir)}`);
