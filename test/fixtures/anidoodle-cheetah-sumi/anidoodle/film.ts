// anidoodle-cheetah-sumi (audit 73, QC2): the author's cheetah in the Sumi-e medium. The rig is the character (cheetahRig.ts: gallopRig,
// gallopY, fk give every joint of every frame); the marks are the medium's (sumiEKit.ts: one loaded brush of real hairs). The cheetah's
// own painted look (cheetahBody.ts drawCheetah) is not used: it is another hand. Two seconds of the rotary gallop on the spot, 24 fps.
import type { Film } from "anidoodle/canvas-core/film";
import { Gfx, type Medium, type P } from "anidoodle/canvas-core/core";
import { brush, NONG, ZHONG, DAN, type Brush } from "anidoodle/canvas-core/sumiEKit";
import { fk, gallopRig, gallopY } from "anidoodle/canvas-core/cheetahRig";

const W = 1080, H = 1080, FPS = 24, N = FPS * 2, STRIDE = 12;          // one stride every half second
const SUMI: Medium = { nib: 1, taper: 1, pressure: 1, retrace: false, wobble: 0, rough: 0 };
const K = 0.95, OX = 560, FLOOR = 760;                                  // the animal's units (about 920 nose to tail) to the frame
const at = (p: P): P => [OX + p[0] * K, p[1]];
const stroke = (ctrl: P[], w: number, ink: number, seed: number): Brush => ({ ctrl: ctrl.map(at), w, ink, seed, press: [[0, 0.5], [0.2, 1], [0.8, 0.9], [1, 0.3]], dry: 0.18, split: 0.4 });

const draw = (ctx: CanvasRenderingContext2D, f: number, env: Parameters<Film["shots"][0]["draw"]>[2]) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  ctx.fillStyle = "#f3eee2"; ctx.fillRect(0, 0, W, H);
  const ph = (f % STRIDE) / STRIDE, rig = gallopRig(ph), pose = fk(rig, 0, gallopY(ph, rig) + FLOOR, FLOOR);
  const g = new Gfx(ctx as never, env, f, SUMI);
  brush(g, { ...stroke([[-300, FLOOR + 6], [300, FLOOR + 6]], 6, DAN, 9), press: [[0, 0.3], [0.5, 0.8], [1, 0.2]] });   // the ground, one pale sweep
  [pose.hindF, pose.foreF].forEach((leg, i) => brush(g, stroke(leg, 13, ZHONG, 20 + i)));                                   // the far legs, paler
  brush(g, stroke(pose.tail, 12, NONG, 30));
  brush(g, stroke(pose.spine, 64, NONG, 40));                                                                                 // the body in one loaded stroke
  [pose.hindN, pose.foreN].forEach((leg, i) => brush(g, stroke(leg, 16, NONG, 50 + i)));
  const head = pose.spine[pose.spine.length - 1], a = pose.head;
  brush(g, stroke([head, [head[0] + 34 * Math.cos(a), head[1] + 34 * Math.sin(a)]], 40, NONG, 60));
};

export const cheetahSumi: Film = {
  meta: { title: "anidoodle-cheetah-sumi", W, H, fps: FPS, bpm: 120, durationFrames: N },
  assets: { images: {} },
  shots: [{ id: "gallop", start: 0, end: N, draw: (ctx, local, env) => draw(ctx as unknown as CanvasRenderingContext2D, local, env) }],
};
