# Building a film: storyboard, story.js, camera, labels, title

The worked example (`examples/where-the-needle-stops/`) does everything below in working code. When this file and the
example disagree on an engine call, `engine/CONTRACT.md` is right.

## 1 · The storyboard (`STORYBOARD.md`)
Write it after the voice is timed, so the times are real. Two tables, one source for picture and sound.

**Header:** the narration verbatim, where the speech starts and ends in `audio/vo.wav`, when the title starts (about
0.6 s after the last word) and the film's length (the root `data-duration`).

**The shot table**

| # | Cut (cue) | Time | Shot | Module |
|---|---|---|---|---|
| 1 | 0 | 0.00 | **Clinic, medium.** The hero, worried, left of centre; a gloved hand brings a syringe in from the right, arriving on "arm". Slow push-in. | clinic.room, hero, clinic.syringe |
| 2 | in(1) −0.05 | 3.15 | **Arm close-up.** The needle dimples the skin and goes in on "second"; ten drops pop in a row from "ten". | clinic.armClose |

- The cue is `word(n)`: the n-th time that word is spoken (case and punctuation ignored), with an offset in seconds.
- A cut lands **0.05 s before** its word. Every sentence gets one shot, two at most.
- The Module column names the module and the scene inside it, so each art agent knows what to draw.

**The event-cue table** (shared by picture and sound)

| Event | Cue | Picture | Sound |
|---|---|---|---|
| Needle glint | needle(1) +0 [0.99] | sparkle on the needle tip | glassy glint |
| Cut: arm close-up | in(1) −0.05 [3.15] | shot 2 | — |
| Drops | ten(1) +0, then every 0.1 s ×10 [5.04 → 5.94] | ten drops pop | ten tiny ascending ticks |

- `+x` = seconds after the word starts. Times in brackets are from the current voice; the cue is what the code uses.
- Cuts are usually silent. Sound goes on events: arrivals, pops, impacts, the title.
- Plan **a new element every 1.5–3 s**: a label, a move, a cut, an event. Count them per shot.

## 2 · `story/story.js`
One classic script (no modules, no bundler) that draws every frame as a pure function of `t`. Its shape, in the
order the example uses:
1. **Cues.** Load the word times and look up every word the storyboard names: one table `C` of cue times, built with
   `EX.setWords(window.STORY_WORDS)` and `EX.cue(word, n = 1, which = "start" | "end")`. A word that isn't found logs
   `[EX] missing cue` and returns 0, so the event fires at the start of the film: fix the spelling or the occurrence.
2. **Cuts.** A `const CUT = {…}` table: each cut is its cue minus 0.05 s; the title time is about 0.6 s after the last
   word. Keep every hard cut in this one table: `qc.mjs` reads it and compares the cuts it detects in the MP4 with it.
3. **Shots.** A list of `[startTime, name]`; a `shotAt(t)` lookup picks the shot for the frame.
4. **Helpers.** Ramps and pulses built from `t` (never from the previous frame), the camera drift (§3), label helpers.
5. **Draw.** For the current shot, call the module's scene with `t`, the progress values the shot needs (0..1, eased
   by you) and `cam`, then the labels through `HOUSE.ui`, then the title and the final fade.
6. **Run.** Hand the draw function, the duration (read from the root) and the module `init()` promises to the
   engine with `EX.run({ id: "main", duration, draw, build, fonts })` (`build` is an async function that awaits
   `HOUSE.ui.init()`, `HOUSE.hero.init()` and the modules' `init()`), so fonts and cached layers are ready before the
   first frame.

Rules:
- Progress values may jump at a cut; animate within a shot from them and from `t`.
- Everything visible is computed from `t`, the cue table and constants. Nothing is stored between frames.
- Read sizes from `EX.W`, `EX.H`, `EX.U`, never from hard-coded 1920/1080. Keep a per-aspect layout table for the few
  positions you place by hand (label rows, the title), and use the modules' anchors for everything that points at a
  subject.
- After every edit: `node tools/check.mjs`.

## 3 · The camera
Every shot drifts. The example's helper:
```js
// slow push plus a little noise sway, per shot
const drift = (t, t0, zoom0, zoom1, t1, seed) => ({
  zoom: lerp(zoom0, zoom1, ioc(ramp(t0, t1, t))),   // ioc = inOutCubic, ramp = clamped 0..1
  x: 10 * EX.noise1(t * 0.12, seed),
  y: 7 * EX.noise1(t * 0.1, seed + 3),
});
```
- Zoom between **1.00 and 1.06** across the shot; close-ups creep `1 + 0.01·u`. Pass the result as `cam` to the scene.
- Modules keep enough margin that zoom 1.08 and pan ±40 px never show an edge.
- Big scale moves (through orders of magnitude) interpolate zoom in log space.

## 4 · Labels and the title (`HOUSE.ui`)
- Pills, callouts, the title and the not-to-scale tag come from `HOUSE.ui`; the timings and sizes are in `STYLE.md` §4
  and already built in. Pass the start time; the helper does the pop.
- A label never starts in the last 0.3 s of a shot, and a callout's exit fires at least 0.21 s before the cut.
- Callouts anchor to a module's anchor point (the hero's hand, a needle tip), never to a hand-placed pixel, so they
  follow the subject through the camera drift.
- A comparison row builds across shots (one pill per stop of the dial) and stays until its section ends. In 9:16 it
  becomes a vertical stack inside the safe zone.
- Numbers exactly as spoken; counters count up, never cut to the value.
- The title: uppercase, 2–4 words, pops word by word 0.2 s apart, starting about 0.6 s after the last word. The last
  0.6 s of the film fades to black.

## 5 · Snapshot plan
- Round 1: one time per event in the event-cue table, plus the middle of every shot, plus 0.05 s after every cut
  (`--at 0.5,1.6,…`). For films over a minute, `--every 1.5` instead.
- Look at each PNG full size, not only the contact sheet. Where something moves fast, add two times 1/60 s apart.
- Snapshots of 25 moments are allowed up to 4 minutes; let them run.
- Use a new `--out` folder each round (`snaps/round-1`, `snaps/round-2`), so old frames never mislead you.
