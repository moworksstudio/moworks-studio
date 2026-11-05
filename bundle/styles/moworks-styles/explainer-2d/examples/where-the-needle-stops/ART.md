# Where the Needle Stops: art direction and module contract

A 40-second explainer on how injections work, at 1920×1080 and **60 fps**, in the kit's house look: the red-hoodie
hero, the house palette, the house labels and title. The film must look **rich, vibrant and detailed, with smooth
motion**. This file is what each art agent was handed; read it as the model for your own film's `ART.md`.

Script (final, never change it): `story/script.txt`. Shot list with times: `STORYBOARD.md`.

## Where to look

| What | Path |
| --- | --- |
| House palette and light rig (`HOUSE.pal`, `HOUSE.light`) | `engine/house-pal.js` (synced into `ex/`) |
| This film's colours, added to `HOUSE.pal` | `story/inj-pal.js` |
| The drawing style in code: the hero | `engine/house-hero.js` |
| Labels, callouts, the title (`HOUSE.ui`) | `engine/house-ui.js` |
| Engine helpers (easing, springs, hash, noise, colour mixing, word cues) and the module rules | `engine/ex-core.js`, `engine/CONTRACT.md` |
| The finished modules of this film, each with its API at the top | `story/inj-clinic.js`, `story/inj-body.js`, `story/inj-tissue.js` |

## The look

1. **Flat cel shapes, no outlines.** Every form: lit fill, one hard-edged shadow (hue-shifted toward magenta), an
   optional deep-fold tone and a thin rim light. Soft gradients only inside big shapes.
2. **Dark, glowing grounds.** Backgrounds are deep indigo/violet (never black or grey) with soft light pools.
   Diagram scenes sit on dark fields like `HOUSE.pal.gridBg` with gentle light pools.
3. **The medicine is the one cool accent inside the body:** glowing aqua (`HOUSE.pal.med`) with an additive halo, so
   it reads against warm tissue. Blood and muscle are saturated reds and magentas, fat is warm yellow, veins are
   blue-violet.
4. **Detail at three scales:** big readable shapes; medium detail (cell lobes, fibre bundles, vessel branches,
   folds); small detail (speculars, tiny bubbles, sparkles, cell nuclei, drifting particles). Detail never competes
   with the subject.
5. **Ambient life never stops:** bubbles rise, cells wobble (noise, about ±2 %), blood cells stream, particles drift,
   light pools breathe. Slow and organic.
6. No film grain, no global vignette, no image files, and **no text drawn by art modules** (the story draws every
   label with `HOUSE.ui`).

## Motion

- Everything is a pure function of `t` and the progress values passed in. No `Math.random`, `Date.now`, timers,
  CSS animation or state kept between calls. Use `EX.hash`, `EX.rng(seed)` and `EX.noise1(x, seed)`. Pre-render
  static layers in `init()`.
- Progress inputs (`k`, `press`, `plunger`, …) are 0..1 and may jump at a cut. Animate *within* a shot from them
  and from `t`. The story eases them; the module doesn't need to.
- Fast things (blood cells in the vein, racing medicine) are drawn as streaks so they read at 60 fps.

## Module contract

Classic scripts that attach to `window.HOUSE` (no ES modules), loaded after `ex/ex-core.js`, `ex/house-pal.js`
and `story/inj-pal.js`. Files live in `story/`.

- Pure draw functions `draw(ctx, opts)` with `t` (seconds) in `opts`. Full-frame scenes paint the whole 1920×1080
  canvas, background included, unless the spec says otherwise.
- Async setup in `HOUSE.<module>.init()`, returning a Promise.
- Budget: a frame draws in well under 60 ms. Cache static layers in offscreen canvases.
- Every scene takes `cam` = `{ zoom = 1, x = 0, y = 0 }` (zoom about the frame centre, pan in px) so the story can
  drift and push. Keep enough margin that a zoom of 1.08 and a pan of ±40 px never show an edge.
- `…Anchors(opts)` functions return screen points (after `cam`) for the story to hang labels on.
- An API comment at the top of the file. Never change another module's file.

## Testing a module

1. Make its test page: `node tools/new-module-test.mjs examples/where-the-needle-stops inj-clinic --with inj-pal`
   (the same for `inj-body` and `inj-tissue`). Draw the states to check in `tests/<module>/test.js`, one per second.
   Run the command again after every edit of the module; it refreshes the copies and keeps `test.js`.
2. Snapshot it. Headless Chrome can't start inside Claude Code's sandbox, so run this with the sandbox disabled:
   `node tools/snapshot.mjs examples/where-the-needle-stops/tests/inj-clinic --at 0.5,1.5,3`
3. Look at every still. Iterate until it is clearly in the house look: vibrant, detailed, readable at a glance.
   Check motion with a few stills 1/60 s apart where things move.

Never touch `engine/`, `tools/`, another agent's module, `story/inj-pal.js` or `story/story.js`. If a colour isn't
in the palette, define it as a local constant at the top of the module and say so in the report.
