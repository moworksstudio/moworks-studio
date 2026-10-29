// Held stretches (packages/hf-qa/stillness.mjs): objects that do not move visibly for more than 2 s are found; a tame
// ±3 px drift and a lone moving spark count as held, film grain does not count as motion; a visible float (±15 px) and a 5° sway are
// motion; the end is the final hold; shots, places and words for the Review and Tech checks. Short synthetic clips (ffmpeg), and the
// showcase film's render when it is on this computer (read only): its panes hold after they land.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { heldRuns, measureVideo, stillGate, stillLines, stillReport } from "../packages/hf-qa/stillness.mjs";
import { qcText } from "../packages/hf-qa/qc.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { workRoot } from "../packages/project-service/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-still-"));
after(() => rmSync(T, { recursive: true, force: true }));
const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true, timeout: 120000 });
const still = join(T, "still.png");
ff(["-f", "lavfi", "-i", "testsrc2=size=2000x1160:rate=1", "-frames:v", "1", still]);
/** A 6 s 1920 x 1080 clip of the picture, its crop at time t from `x` and `y`, plus extra filters. */
const clip = (name, x, y = "40", extra = "") => {
  const out = join(T, name);
  ff(["-loop", "1", "-i", still, "-t", "6", "-r", "25", "-vf", `crop=1920:1080:x='${x}':y='${y}'${extra}`, "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "20", out]);
  return out;
};
const wave = (a) => [`40+${a}*sin(2*PI*t/4)`, `40+${a}*cos(2*PI*t/4)`];

test("a freeze over 2 s is found, with film grain on it too; the end is the final hold", { timeout: 180000 }, async () => {
  const moveFreezeMove = "if(lt(t,1),40*t,if(lt(t,4),40,40+40*(t-4)))";
  for (const grain of ["", ",noise=alls=12:allf=t"]) {
    const r = await measureVideo(clip(`seg${grain ? "-grain" : ""}.mp4`, moveFreezeMove, "40", grain), { total: 6 });
    assert.equal(r.stretches.length, 1, JSON.stringify(r));
    const [s] = r.stretches;
    assert.ok(s.from >= 0.7 && s.from <= 1.3 && s.to >= 3.7 && s.to <= 4.01 && s.held > 0.9, JSON.stringify(s));
    assert.equal(stillGate(r).pass, false);
    assert.match(stillGate(r).findings[0].message, /Held still for \d+(\.\d+)? s \(.*\): the whole picture holds still/);
  }
  const end = await measureVideo(clip("end.mp4", "if(lt(t,2),40*t,80)"), { total: 6 });
  assert.deepEqual(end.stretches, []);
  assert.ok(end.finalHold && end.finalHold.from <= 2.1, "held from 2 s to the end: the final hold, allowed");
});

test("a tame ±3 px drift and a lone spark hold; a ±15 px float and a 5° sway move", { timeout: 180000 }, async () => {
  const held = async (name, x, y, extra) => (await measureVideo(clip(name, x, y, extra), { total: 7 })).stretches.length;
  assert.equal(await held("tame.mp4", ...wave(3)), 1, "±3 px reads as still");
  assert.equal(await held("spark.mp4", "40", "40", ",drawbox=x='100+150*t':y=500:w=16:h=16:color=white:t=fill"), 1, "only a spark moves");
  assert.equal(await held("float.mp4", ...wave(15)), 0, "±15 px is visible motion");
  assert.equal(await held("sway.mp4", "40", "40", ",rotate=a='5*PI/180*sin(2*PI*t/4)'"), 0, "a 5° sway is visible motion");
});

test("the report: stretches by shot and place, the 1-2 s ones for a strong film, the final hold, in words", () => {
  // 4 x 3 blocks: from 1 s the left half holds (6 of 12), the right half moves; at 9.5 s everything holds to the end
  const timeline = [];
  for (let k = 0; k <= 40; k++) {
    const t = k * 0.25, ages = new Float32Array(12);
    for (let n = 0; n < 12; n++) ages[n] = t >= 9.5 ? t - 9.5 : n % 4 < 2 && t >= 1 && t < 5 ? t - 1 : n % 4 < 2 && t >= 6 && t < 7.5 ? t - 6 : 0;
    timeline.push({ t, ages });
  }
  const ages = { bx: 4, by: 3, timeline };
  assert.deepEqual(heldRuns(ages, { minAge: 2 }).map((x) => [x.from, x.to, x.share]), [[1, 4.75, 0.5]]);
  const shots = [{ number: 1, title: "Wish", start: 0, duration: 5 }, { number: 2, title: "Panes", start: 5, duration: 5 }];
  const r = stillReport(ages, { shots, total: 10, dynamic: "strong" });
  assert.deepEqual(r.stretches.map((x) => [x.shot, x.seconds, x.held]), [[1, 3.75, 0.5]]);
  assert.deepEqual(r.stretches[0].where.sort(), ["bottom left", "middle left", "top left"]);
  assert.deepEqual(r.near.map((x) => [x.shot, x.from, x.to]), [[2, 6, 7.25]]);
  assert.equal(r.finalHold, null, "the end holds only 0.5 s: no final hold over 2 s");
  const text = stillLines(r).join("\n");
  assert.match(text, /Over 2 s: shot 1 "Wish": 1–4\.75 s, 3\.75 s held \(50 % of what can move holds still, mostly /);
  assert.match(text, /strong level allows 1 s at most\): shot 2 "Panes": 6–7\.25 s/);
  assert.equal(stillReport(ages, { shots, total: 10, dynamic: "light" }).near.length, 0);
  assert.match(qcText({ round: "R1", dir: ".moworks/qc/R1", sheets: {}, beats: [], cuts: [], failed: [], still: r }), /Held stretches \(the app's measured check, moworks-alive\)/);
  assert.deepEqual([stillGate(null, "the film has no length yet").pass, stillGate(null, "x").blocking], [true, false]);
});

// the app's showcase film, in the work folder's projects (or MW_SHOWCASE_FILM): skipped where it is not
const SHOWCASE = process.env.MW_SHOWCASE_FILM ?? join(workRoot(), "projects", "moworks-studio-tu-y-tuong-thanh-phim", "renders", "moworks-studio-tu-y-tuong-thanh-phim.mp4");
test("the showcase film (read only): its panes hold after they land, about 6-9 s in shot 2; nothing else over 2 s", { skip: existsSync(SHOWCASE) ? false : "not on this computer", timeout: 180000 }, async () => {
  const shots = [{ number: 1, title: "wish", start: 0, duration: 4 }, { number: 2, title: "panes", start: 4, duration: 5 }, { number: 3, title: "film", start: 9, duration: 3.4 },
    { number: 4, title: "line", start: 12.4, duration: 1 }, { number: 5, title: "logo", start: 13.4, duration: 1.6 }];
  const r = await measureVideo(SHOWCASE, { total: 15, shots });
  assert.equal(r.stretches.length, 1, JSON.stringify(r.stretches));
  const [s] = r.stretches;
  assert.ok(s.shot === 2 && s.from >= 5.5 && s.from <= 6.5 && s.to >= 8.5 && s.to <= 9.1, JSON.stringify(s));
});
