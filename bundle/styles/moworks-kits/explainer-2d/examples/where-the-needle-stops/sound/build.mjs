// build.mjs: this film's own sound (a score and effects written for it), from cues to a verified mix.
//   node tools/sound.mjs examples/where-the-needle-stops --bespoke      (from the kit folder)
// cues_inj.py → sfx_inj.py → music_inj.py → mix_inj.py → tools/audio/verify_mix.py. Writes audio/cues.json,
// audio/mix.wav, audio/music.wav, audio/sfx.wav and audio/mix.json; logs and raw stems go to a temp folder (printed).
// Works with or without audio/vo.wav: with no narrator, the music and effects are mastered to −14 LUFS on their own.
// Exits non-zero when a step fails or verify finds a FAIL.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.dirname(HERE);
const KIT = process.env.KIT_ROOT || path.resolve(VIDEO, "../..");
if (!fs.existsSync(path.join(KIT, "tools/lib.mjs"))) {
  console.error(`✗ the kit is not at ${KIT}: run node tools/sound.mjs <video> --bespoke from the kit folder`);
  process.exit(1);
}
const { FFMPEG, UV, fail } = await import(pathToFileURL(path.join(KIT, "tools/lib.mjs")).href);
const env = { ...process.env, FFMPEG: FFMPEG(), KIT_ROOT: KIT };
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "needle-sound-"));

/** a Python script through uv with the kit's pinned packages (the same call as tools/py.mjs) */
const py = (script, args, log) => {
  const r = spawnSync(
    UV(),
    ["run", "--quiet", "--no-project", "--python", "3.12", "--with-requirements", path.join(KIT, "tools/audio/requirements.txt"), "python", script, ...args],
    { cwd: VIDEO, env, encoding: "utf8", stdio: log ? ["ignore", "pipe", "inherit"] : "inherit", maxBuffer: 64 * 1024 * 1024 },
  );
  if (log) fs.writeFileSync(path.join(scratch, log), r.stdout || "");
  return r.status;
};
const step = (name, args, log) => {
  console.log(`· ${name}`);
  if (py(path.join(HERE, name), args, log) !== 0) fail(`${name} failed${log ? ` (log: ${path.join(scratch, log)})` : ""}`);
};

console.log(`sound (bespoke): ${VIDEO}\n  voice: ${fs.existsSync(path.join(VIDEO, "audio/vo.wav")) ? "audio/vo.wav" : "none (music and effects only)"}`);
step("cues_inj.py", [], "cues.log");
step("sfx_inj.py", ["--scratch", scratch], "sfx.log");
step("music_inj.py", ["--scratch", scratch], "music.log");
step("mix_inj.py", ["--scratch", scratch]);
console.log("· verify_mix.py");
const code = py(path.join(KIT, "tools/audio/verify_mix.py"), [VIDEO, "--events", path.join(HERE, "sfx_inj.py"), "--scratch", scratch]);
console.log(`  logs and raw stems: ${scratch}`);
if (code !== 0) fail("the mix did not pass verify_mix (see the FAIL lines above)");
console.log(`✓ ${path.join(VIDEO, "audio/mix.wav")} (measured; nobody listened)`);
