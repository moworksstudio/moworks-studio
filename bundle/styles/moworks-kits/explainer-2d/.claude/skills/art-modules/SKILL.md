---
name: art-modules
description: Write a film's scene modules — the code that draws its places and things (a clinic, a body in x-ray, a tissue cross-section, a volcano, a cell) on the canvas in the house look — as pure functions of time attached to window.HOUSE, with init() caching static layers, anchors for labels, an aspect option for 16:9 and 9:16, and detail at three scales; test each one alone with tools/new-module-test.mjs; and brief one parallel agent per module for big films. Use when a storyboard needs scenes drawn, when the user says "draw the scene", "add more detail", "make it more vibrant", "the stomach looks flat", "use as many agents as you want", or when a module needs fixing.
---

# Art modules: drawing a film's scenes in code

A film's look lives in its **scene modules**: one file per family of scenes (the example has three: the clinic, the
body, the tissue). The house pieces (`HOUSE.pal`, `HOUSE.ui`, `HOUSE.hero`) are shared; scene modules are written fresh
for every film. They are the biggest job in a film: the example's modules are 116–131 KB of canvas code each.

**Read first:** `STYLE.md` §1–§3 and §6 (palette, hero, drawing rules, composition), `engine/CONTRACT.md` (the exact
API), the film's `STORYBOARD.md` (what each scene must show) and `ART.md`. Look at one of the example's modules
(`examples/where-the-needle-stops/story/inj-*.js`) for the drawing style in working code.

## Who writes it
| Film | Do |
|---|---|
| ≤ 20 s, or one simple module | write it yourself |
| > 20 s, or 2+ modules | one agent per module, in parallel, each with its own test page (brief below). You write `story.js` meanwhile |
| A fix to one module | the agent that wrote it (continue it), or you |

## How a module is written
A classic script (no ES modules, no bundler) in `<dir>/story/<prefix>-<name>.js`, where `<prefix>` is a short film
prefix (the example uses `inj-`). It loads after the engine, `house-pal.js`, `film-pal.js`, `house-hero.js` and
`house-ui.js`, and attaches **one object to `window.HOUSE`** under the part of the file name after the first dash
(`inj-clinic.js` → `HOUSE.clinic`).

1. **An API comment at the top**: every scene function, its options, its anchors.
2. **Pure draw functions**: `scene(ctx, opts)` with `t` (seconds) in `opts`, plus the progress values the story passes
   (0..1, already eased by the story) and `cam = { zoom = 1, x = 0, y = 0 }`. Same inputs, same picture: no
   `Math.random`, `Date.now`, timers, CSS animation or state between calls. Use the engine's seeded helpers (hash, rng,
   noise).
3. **`init()` returns a Promise** and pre-renders everything static (backgrounds, textures, repeated shapes) into
   offscreen canvases. A frame should draw in well under 60 ms.
4. **Full-bleed scenes paint the whole canvas**, background included, sized from `EX.W` × `EX.H`, with margin so a
   zoom of 1.08 and a pan of ±40 px never show an edge.
5. **Anchors**: a function per scene that returns the screen points the story labels or attaches things to (a needle
   tip, the stomach, the hero's hand), after the camera. Labels follow these, never hand-placed pixels.
6. **An `aspect` option** (`"wide"` or `"tall"`) for every scene: in 9:16, one subject per frame, recomposed tighter,
   rows turned into columns. Write both from the start; it's cheaper than retrofitting.
7. **The look** (`STYLE.md` §3): flat cel shapes with **no outlines**, one hard shadow hue-shifted toward magenta, a
   thin rim; deep indigo grounds; glow only on emitters; **detail at three scales** (big shapes, then lobes, fibres and
   folds, then speculars, bubbles and particles); ambient life that never stops; fast things as streaks.
8. **No text, ever.** Labels, numbers and titles come from `story.js` through `HOUSE.ui`.
9. **Colours** from `HOUSE.pal` and `film-pal.js`. A colour that's missing goes in a local constant at the top of the
   module, reported to the lead. Never edit `engine/` or another module's file.

## Test it alone
```bash
node tools/new-module-test.mjs <dir> <module> [--format wide|tall] [--with <other story scripts>]
node tools/snapshot.mjs <dir>/tests/<module> --at 0.5,1.5,2.5 --out snaps/round-1   # sandbox off
```
- `<module>` is the file name without `.js` (`inj-clinic`). The test page gets the engine, copies of `film-pal.js` and
  the module, and a `test.js` that draws one state per second: edit `test.js` to show every scene and state you need.
- **Run `new-module-test.mjs` again after every edit of the module**: it refreshes the copies and keeps your
  `test.js`. `--key <name>` sets the `HOUSE` name if it isn't the part after the first dash; `--reset` rebuilds the
  page from the harness.
- Look at every PNG full size. Iterate until it is clearly in the house family: vibrant, detailed, readable at a
  glance. Where things move, add two times 1/60 s apart.
- Snapshot both aspects if the film might go to both (`--format wide` and `--format tall`).
- `node tools/check.mjs` must pass.

## Briefing an agent
Fill in `references/BRIEF.md` and send it as the agent's whole prompt. Start every module agent in the same message,
in the background, and keep working. The roster goes in `ART.md` → "Agents". When an agent reports back: read its
report, snapshot its module inside the film (not only on its test page), and send fixes back to the same agent.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Draw outlines or strokes around shapes | A hard cel shadow and a thin rim light define the form |
| Draw a label or a number inside the scene | Return an anchor; the story draws the label |
| Keep state between frames (particles that "move on") | Compute each particle's position from `t` and its seed |
| Hard-code 1920×1080 | Read `EX.W`, `EX.H`; compose per `aspect` |
| Paint only what the camera sees at zoom 1 | Paint with margin for zoom 1.08 and pan ±40 px |
| Use an image file or an AI image | Draw it with canvas paths and gradients |
| Edit `engine/`, `HOUSE.pal` or another agent's module | Local constants in your module; report them to the lead |
| Fill the frame with equal detail everywhere | Detail at three scales, strongest on the subject |
