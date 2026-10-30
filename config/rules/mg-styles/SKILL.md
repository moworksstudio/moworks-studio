---
name: mg-styles
description: How Moworks Studio makes a film in an mg-styles-15 style - the style prompt's signature features kept, the story the brief's own, the picture drawn in code as one renderAt(t) page inside HyperFrames, sound from the app.
version: 1.0.0
derived-from: mg-styles-15 by Vincentwei1021, commit 49052d80bfaf9fa8412cc9710530e5e95a3b8d8c, MIT - README.md (Make a film from a prompt, Run the source), prompts/*.md (How to work, Rules, Craft checklist), harness/render.mjs (the page contract), rubric.md, rewritten for Moworks Studio. https://github.com/Vincentwei1021/mg-styles-15/tree/49052d80bfaf9fa8412cc9710530e5e95a3b8d8c
---

# mg-styles-15 style: the rules of this project

The project's style is one mg-styles-15 style. Its own rule file is `.moworks/rules/mg-<id>/SKILL.md`: the author's **prompt**, as
written (output, suggested technical route, creative seed, signature features, how to work, rules, craft checklist). **Moworks Studio
runs every command** (stills, checks, render) and hands you the results: where the prompt says to run a renderer, `audio.py`, ffmpeg
or Blender, skip it; the app does that part or it is not used here.

## 1. What wins where

| Layer | Wins on |
|---|---|
| The prompt's **Signature features and key techniques** | what makes the style recognisable at a glance: **keep all of it** |
| The brief and this app's pipeline | the story, copy, brand, length and frame size (the prompt's 10 s and its Output are the author's defaults; the prompt itself says to replace the Creative seed's story, brand, copy and colours with the user's) |
| This file | how such a film is made in this app: the page, the bridge, the paths, what is never used here |
| HyperFrames (`hyperframes` with its contract and `motion.md`, `hyperframes-cli`, the files the app names for the step) | how the project is a HyperFrames composition: the root's timing attributes, determinism, HTML layers over the canvas |

The **Creative seed** is one example story: never copy it. Its brand names are invented; invent the client's or use the client's own.

## 2. The order of work (the app's pipeline)

| Step | The prompt's own step | Here |
|---|---|---|
| Prepare | (the brief) | BRIEF.md and docs/ASSETS.md as the step says |
| Storyboard ✋ | Treatment, key frames before motion | one option = one treatment (another when the owner asks), with the prompt's shape: a hook in the first 0.5 s, an escalation, one unmistakable hero moment at ~60–75 % of the runtime, a composed end frame held ~1 s; every signature feature mapped to a moment. Frames drawn with real code (§3) and checked as poster-worthy stills |
| Motion ✋ | Motion | `docs/MOTION-PLAN.json`: per shot the moves with numbers; cite the signature techniques as source `{"kind": "style", "id": "<signature feature>"}` |
| Build | Motion, Final | §3. The demo source is staged into `.moworks/library/mg/<id>/` now: read it for techniques only (a brush renderer, a boil cycle, a shader, a morph), never its story, brand, copy or timeline |
| QC | self-critique, rubric | the Moworks Review (moworks-qc), plus the author's `rubric.md` (staged with the demo) and the prompt's Craft checklist |
| Sound / Final Mix | Sound | **the app's** music and sound effects only (no `audio.py`, no instrument samples); pick by the prompt's Sound line |

## 3. The page: a renderAt(t) film inside HyperFrames

The author's page contract (harness/render.mjs), kept:
- `index.html` is the whole film: the root `<div data-composition-id="main" data-start="0" data-duration="<seconds>" data-width data-height>`
  holding the drawing surface (an SVG, a canvas, a WebGL or three.js canvas) as a full-frame `class="clip"` element with the same
  start and duration.
- `window.renderAt = async (t) => { … }` draws the frame at second `t`, a **pure function of t**: seeded randomness only, no clocks, no
  state carried between frames, no state-triggered CSS transitions.
- `window.__ready = true` once fonts, images and models are loaded. `window.DEMO` may say width, height, fps and duration; the root's
  `data-duration` is the one that counts.
- Your scripts live in `compositions/mg/` (`.js` / `.mjs`), loaded from `index.html`; no other `.html` there. A storyboard board is the
  same kind of page in `boards/<X>/index.html`, its scripts inside `boards/<X>/` (a board sees only its own folder); posed one frame per
  second of the board, the frames are one frame per shot or beat of the film (3-6 for a film under 20 s, at most 12 for a long one: group short shots into one beat), never one per second of the film.
- **Do not register a timeline and do not drive renderAt yourself**: the app inserts the bridge (`<script data-mw="lemo">`): one paused
  HyperFrames timeline whose time is `t`; every seek calls `renderAt(t)` and waits for it. GSAP tweens of an HTML layer go on
  `window.__lemo.tl` after the bridge has run.

Library paths, as the author writes them, are made local by the app's finalize (never write `../..`):
- `/assets/textures/…`, `/assets/hdri/…`: the author's shared textures and HDRI (copied from the pinned clone).
- `/node_modules/three/…`, `"three"`, `"three/addons/…"`: three.js **0.186.1**, the author's version. Never mix in another version.
- `/node_modules/opentype.js/…`, `/node_modules/d3/…`, `/node_modules/simplex-noise/…`, `/node_modules/topojson-client/…`: the pinned
  versions the author used.
- `/assets/fonts/fonts.css` goes: the fonts come from the app's font store. Write every family you draw with also in a CSS `font-family`
  of an element in `index.html` (an invisible probe is fine), so it is declared and checked. The author's font files are not in the
  library: to draw glyph outlines with opentype.js, load a font from `assets/_app/fonts/kit/`. **Vietnamese text needs a font with
  Vietnamese letters**: when the style's face has none, it is a stop in Prepare with choices (moworks-studio §2b, #458), never a swap.

## 4. Never here

- The author's audio (`audio.py`, `lib/audio`, instrument samples) and renderers (`harness/*`, Blender).
- Real brand trademarks (the author's own rule): invent names, or use the client's. A style named after a real creator's look keeps the
  grammar only, never the creator's name, characters or brand.
- Assets other than CC0, public domain, OFL, Apache or free-for-commercial-use; each one in the project's `CREDITS` with its source.

## 5. Credit

mg-styles-15, Vincentwei1021, https://github.com/Vincentwei1021/mg-styles-15 at 49052d8, MIT. Code copied from it keeps its MIT notice.
