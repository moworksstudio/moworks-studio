# __TITLE__: art direction and module contract

A __DUR__-second explainer at __FORMAT__ and **60 fps**, in the house look. The script is final: see
`story/script.txt`. The shots and their exact times are in `STORYBOARD.md`. The film must look **rich, vibrant and
detailed, with smooth motion**.

This file is the brief for the art modules. Each module is written by one agent (or by you, for a small film); the
lead writes `story/story.js`. Fill in the module table below before briefing anyone.

## Modules for this film

| Module (file) | `HOUSE.<name>` | Scenes / functions | Anchors it returns | Agent |
| --- | --- | --- | --- | --- |
| `story/<film>-<name>.js` | `<name>` | e.g. `back(ctx, o)`, `scene(ctx, o)` | e.g. `sceneAnchors(o) → { tip, heart }` | |

## Where to look

| What | Path |
| --- | --- |
| Engine API: EX (time, easing, noise, cues), HOUSE.pal, HOUSE.ui, HOUSE.hero, the rules | `engine/CONTRACT.md` |
| The house palette and light rig | `ex/house-pal.js` (`HOUSE.pal`, `HOUSE.light`) |
| This film's colours | `story/film-pal.js` |
| The drawing style in code (cel shading, rims, levels of detail) | `ex/house-hero.js` |
| Shot list and event cues | `STORYBOARD.md` |

## The look

1. **Flat cel shapes, no outlines.** Every form: a lit fill, one hard-edged shadow (hue-shifted toward magenta), an
   optional deep-fold tone and a thin rim light. Soft gradients only inside big shapes.
2. **Dark, glowing grounds.** Backgrounds are deep indigo/violet (never black or grey) with soft light pools.
   Diagram scenes sit on `HOUSE.pal.gridBg`-like dark fields.
3. **One cool hero accent** per film (in `film-pal.js`), glowing with an additive halo so it reads against every
   warm subject. Glow only on things that emit light.
4. **Detail at three scales:** big readable shapes; medium detail (lobes, fibres, branches, folds); small detail
   (speculars, bubbles, sparkles, nuclei, drifting particles). Detail never competes with the subject.
5. **Ambient life never stops:** things wobble (noise, about ±2 %), particles drift, light pools breathe. Slow and
   organic. The hero breathes and blinks by itself.
6. No film grain, no global vignette, no image files, **no text drawn by art modules** (labels are drawn by the story
   with `HOUSE.ui`).

## Motion

- Everything is a pure function of `t` and the progress values passed in. No `Math.random`, `Date.now`,
  `performance.now`, timers, CSS animation or state between calls. Use `EX.hash`, `EX.rng(seed)`,
  `EX.noise1(x, seed)`. Pre-render static layers in `init()`.
- Progress inputs (`k`, `press`, `fill` …) are 0..1 and may jump at a cut; animate *within* a shot from them and from
  `t`. The story eases them; the module doesn't need to.
- Fast things are drawn as streaks so they read at 60 fps.

## Module contract

- A classic script in `story/` that attaches to `window.HOUSE` (no ES modules), loading after `ex/ex-core.js`,
  `ex/house-pal.js` and `story/film-pal.js`. Add its `<script>` line to `index.html` before `story/story.js`.
- Pure draw functions `fn(ctx, opts)` with `t` (seconds) in `opts`. Full-frame scenes paint the whole
  `EX.W × EX.H` canvas (background included) unless the storyboard says otherwise.
- **Both formats from the start:** read `EX.W` / `EX.H` (never type 1920 or 1080). Each scene has a layout for 16:9
  and one for 9:16 (`EX.W > EX.H`); in 9:16 keep the subject in the middle and tighter.
- Every scene takes `cam = { zoom = 1, x = 0, y = 0 }` (zoom about the frame centre, pan in px), so the story can
  drift and push. Keep enough margin that zoom 1.08 and a pan of ±40 px never show an edge.
- Return the points the story labels from: `<scene>Anchors(opts) → { name: [x, y] }` in screen px, with the same
  `cam` applied.
- Async setup in `HOUSE.<name>.init()` returning a Promise. Budget: well under 60 ms per frame.
- An API comment at the top of the file. Don't change other modules' files, `ex/`, `film-pal.js` or `story.js`. A
  colour that isn't in the palette goes in a local constant at the top of your module; say so in your report.

## Testing a module

1. `node tools/new-module-test.mjs videos/<slug> <module>` makes `tests/<module>/` (add `--format tall` for the
   other aspect). Edit its `test.js` STATES: each scene at its start and end, a camera push, `k` past 1.
2. Snapshot it (sandbox disabled): `node tools/snapshot.mjs videos/<slug>/tests/<module> --every 1`.
3. Look at every PNG at full size. Iterate until it is clearly in the house look: vibrant, detailed, readable at a
   glance. Check motion with two snapshots a few frames apart (1/60 s = 0.0167 s).
4. After every edit, re-run step 1 (it refreshes the copies and keeps your `test.js`), then snapshot again.
