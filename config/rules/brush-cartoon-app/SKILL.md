---
name: brush-cartoon-app
description: How Moworks Studio makes a Brush cartoon film - ClaudeAnimationBase's hand-painted cartoon method (p5.brush, boil, flat 2D, acting), the project's own characters defined as data and approved on model sheets, one renderAt(t) page driven by HyperFrames, sound from the app. Never Clawd.
version: 1.0.0
derived-from: ClaudeAnimationBase by John Heibel, commit 0ac8bf2b31942376cb6b8c4074715595d512acd2, MIT - ANIMATION_GUIDE.md (rules, principles, workflow), src/core.js and src/timeline.js (the engine and page contract), src/clawd.js (faces, emotions, moves), rewritten for Moworks Studio's character layer. https://github.com/JohnHeibel/ClaudeAnimationBase/tree/0ac8bf2b31942376cb6b8c4074715595d512acd2
---

# Brush cartoon: the rules of this project

The project's style is ClaudeAnimationBase's hand-painted cartoon. Its own rule file is `.moworks/rules/brush-cartoon/SKILL.md`: the kit's
`ANIMATION_GUIDE.md` as the author wrote it (the three goals, the rules, the animation principles, the workflow). The kit is staged in
`.moworks/library/character-kit/`: `src/core.js` and `src/timeline.js` (the engine, as shipped), `src/clawd-parts.js` (faces, 31 emotions,
hats, emotes, moves, turns, as shipped), `src/character.js` (the app's character layer) and `examples/definition.json` (the fields of a definition, never a character to draw).
**Moworks Studio runs every command** (stills, checks, render): where the guide says `node render.mjs`, `studio.html` or a sheet, skip it.

## 0. Never Clawd

Clawd is Anthropic's mascot. It is never in this film, in any board, as a cameo, a silhouette, a lookalike or a name. Never call `clawd()`
or `dancer()`, never copy the kit's `clawd.js`. The guide's examples say Clawd: read them as the project's own characters. The app refuses a
film that draws Clawd.

## 1. What wins where

| Layer | Wins on |
|---|---|
| The guide (`brush-cartoon`) | the medium (p5.brush through `paint()` / `inkLine()`, boil, flat 2D, drawn key views, soft palette, `glow()` for light), no text, an event in every shot, timing for the viewer, alive, transitions, one piece; the animation principles |
| The project's characters (`docs/CHARACTERS.json`, approved) | who is on screen: their shapes, colours, faces |
| This file | the files, the Character step, the layer's API, the bridge, what is never used here |
| HyperFrames (the files the app names for the step) | the composition: the root's timing attributes, determinism |

## 2. The order of work (the app's pipeline)

| Step | Here |
|---|---|
| Prepare | BRIEF.md and docs/ASSETS.md as the step says; the brief names who the characters are |
| Character ✋ | §3: `docs/CHARACTERS.json`, the app's `character_sheet` tool, the owner approves the model sheets |
| Storyboard ✋ | one option (another when the owner asks): a short treatment and posed frames painted with the real kit and the approved characters (§4, boards) |
| Motion ✋ | `docs/MOTION-PLAN.json`: per shot the acting (emotion keys, takes, turns, jumps, walks) and camera with numbers; cite the guide's principles and the kit's helpers as source `{"kind": "style", "id": "<principle or helper>"}` |
| Build | §4 |
| QC | the Moworks Review (moworks-qc), plus the guide's self-check workflow (contact sheets of the reads) |
| Sound / Final Mix | **the app's** music and sound effects; `PROJECT.bpm` matches the music the app picks |

## 3. The characters: definitions, model sheets, approval

- A character is **data**, never new drawing code: write `docs/CHARACTERS.json` (the project's docs/ folder), `{ "characters": [ <definition>, … ] }`,
  each definition in the schema of `examples/definition.json` and `src/character.js` (units of u, the body unit; (x, y) is the ground point between
  the feet; negative y is up):
  `id` (lowercase, dashes), `name`, `about`, `colors { col, dk, lt }` (body, shade, light, #RRGGBB), `body { shape: box | round | egg | pill,
  w, h, bottom }`, `face { y, dx, mouth, bx }` (eye line, half the eye spacing, mouth below the eyes in face units, cheeks), `head { top,
  width }` (where hats and over-head emotes sit), `legs { xs: [front-view x of each leg], w, h }`, `arms { x, y, len, th }`; `views` only
  to correct one of the five key views the layer makes from the body.
- From the brief's description and the owner's pictures (docs/ASSETS.md): pick the shape, proportions and colours that read as that character at
  phone size, keep it simple enough to act (big readable face area, a silhouette that reads in every view). Characters the owner chose from
  their library are already in `docs/CHARACTERS.json`: keep them as they are unless the brief asks for a change.
- Then call the app's **`character_sheet`** tool: it draws every character's model sheets (the five views, the moves and hats; all 31
  emotions) through HyperFrames and returns their paths. Read them once; fix a real problem in the definition (a face off the body, a part
  that does not read, colours that do not separate), call it again once.
- Then call the app's **`character_gate`** tool: the Brush gate checks every character automatically (the schema, never Clawd, colours
  that separate and read on a light and a dark ground, the face on the body, legs that stand under it and reach the ground, arms at its
  sides, the key views, the sheets drawn and not blank) and says why a check fails. Fix the definition and call it again until it passes;
  only then stop: the owner approves the sheets in the Character dialog (a new character is approved only after a pass).
- A character the owner chose from the library for this style (`ownStyle` in `docs/CHARACTERS.json`) is done: its sheets came with it; it
  needs no redraw, only the gate.
- Change an approved `docs/CHARACTERS.json` only when the owner asks (the approval is of the file as it was).

## 4. The film: one page painted by the kit, driven by HyperFrames

- Frame: **1920 × 1080** (the kit's engine draws at that size; this style is 16:9).
- `index.html` (the HyperFrames root), exactly this shape:

```html
<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="assets/_app/vendor/lib/p5/2.3.3/lib/p5.min.js"></script>
<script src="assets/_app/vendor/lib/p5.brush/2.2.3/dist/p5.brush.js"></script>
<style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#F3EBDC}#root{position:relative;width:1920px;height:1080px;overflow:hidden}
#out{position:absolute;inset:0;width:1920px;height:1080px;display:block}.p5Canvas{display:none!important}#scrub,#tt{display:none}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="<seconds>" data-width="1920" data-height="1080">
  <canvas id="out" class="clip" width="1920" height="1080" data-start="0" data-duration="<seconds>" data-track-index="1"></canvas>
</div>
<input id="scrub" type="range" /><span id="tt"></span>
<script>const PROJECT = { duration: <seconds>, bpm: <bpm>, offset: 0 };</script>
<script src="compositions/kit/core.js"></script>
<script src="compositions/kit/clawd-parts.js"></script>
<script src="compositions/kit/timeline.js"></script>
<script src="compositions/kit/character.js"></script>
<script src="compositions/kit/cast.js"></script>
<script src="compositions/film.js"></script>
</body></html>
```

- **The app writes `compositions/kit/`** (the engine, the parts, the layer, `cast.js` = `window.CAST` from `docs/CHARACTERS.json`) and the p5
  libraries after your task and before stills: never write or edit them. Write only `index.html` and **`compositions/film.js`**: the shots,
  `shots([[t0, (t, lt, dur) => { … }], …])`, each a pure function of t painting the whole frame (the guide's rules).
- Draw a character with **`character(CAST.<id>, x, y, u, { …charEmotions(CAST.<id>, t, keys), view, flip, …jump(…), …move(…) })`**: the
  options of the kit's `clawd()` (pose, view, face, colour, extras; see `src/clawd-parts.js` and the guide's reference). Moods: `charFeel(def,
  name, t)` and `charEmotions(def, t, keys)` (the kit's `feel()` / `emotions()` coloured as that character); acting: `jump()`, `take()`,
  `stroll()`, `spring()`, `turn()`, `spinView()`, `move()`; the world: `paint()`, `inkLine()`, `glow()`, `brushWipe()`, `iris()`, camera
  `camBegin()` / `camEnd()`, `letter()` (sparingly: the guide's "No text").
- A storyboard board is the same page in `boards/<X>/index.html` with `boards/<X>/board.js` (its posed frames, one per second of the board; the frames are one frame per shot or beat of the film (3-6 for a film under 20 s, at most 12 for a long one: group short shots into one beat), never one per second of the film) in place of
  `compositions/film.js`: its scripts are `kit/core.js`, `kit/clawd-parts.js`, `kit/timeline.js`, `kit/character.js`, `kit/cast.js` (the app
  copies the kit into `boards/<X>/kit/`), `board.js`, and the p5 libraries from `../../assets/_app/vendor/lib/…`.
- The contract (the kit's own): every frame a pure function of t (frames render in parallel and out of order), randomness only from the
  kit's seeded `jit()` / `hash()` / `boilSeed()`, no clock, no `requestAnimationFrame`, no `Math.random()` in your code.
- Words in the film are rare (the guide); when one is needed, `letter()` with a font that has Vietnamese letters for Vietnamese text.

## 5. Never here

- Clawd (§0); the kit's `render.mjs`, `studio.html`, `gpu_probe.mjs`, sheets and demo scene; editing anything under `compositions/kit/`,
  `boards/*/kit/` or `.moworks/library/character-kit/`; a 3D projection (the guide's rule 1).

## 6. Credit

ClaudeAnimationBase, John Heibel, https://github.com/JohnHeibel/ClaudeAnimationBase at 0ac8bf2, MIT; p5.js (LGPL-2.1), p5.brush (MIT).
