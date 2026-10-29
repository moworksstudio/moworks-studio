---
name: lemo-opuscar
description: How Moworks Studio makes a film in a Lemo-Opuscar style - the style's STYLE.md kept whole, the story the brief's own, the picture drawn in code as one render(t) page inside HyperFrames, sound from the app.
version: 1.0.0
derived-from: Lemo-Opuscar by Lemomo (LemoLab), commit ea34ff9546f675f9fd65a3c84e869a1da7471ad7, MIT - AGENTS.md (Style and story, Workflow), DIRECTOR.md §1-12, TECHNIQUE.md §2, §9-11, core/README.md (the page contract), rewritten for Moworks Studio. https://github.com/lemomo-ai/lemo-opuscar/tree/ea34ff9546f675f9fd65a3c84e869a1da7471ad7
---

# Lemo-Opuscar style: the rules of this project

The project's style is one Lemo-Opuscar style. Its own rule file is `.moworks/rules/lemo-<slug>/SKILL.md`: the style's **STYLE.md**, as
its author wrote it. You are the director: Lemo-Opuscar judges a film by **sound, rhythm, camera, directing**, in that order; good frames
are only the start. **Moworks Studio runs every command** (stills, checks, render) and hands you the results: where a guide tells you to
run `node core/render/…`, `sh tools/…`, `build.sh`, a Python tool or a TTS, skip it; the app does that part or it is not used here.

## 1. What wins where

| Layer | Wins on |
|---|---|
| `STYLE.md` (the style's rule file) | the style's invariants: look, materials and rendering, colour, type, motion quality, camera grammar, sound palette, native moves, pitfalls. **Keep all of it.** |
| This file | how such a film is made in this app: the page, the bridge, the paths, what is never used here |
| HyperFrames (`hyperframes` with its contract and `motion.md`, `hyperframes-cli`, the files the app names for the step) | how the project is a HyperFrames composition: the root's timing attributes, determinism, captions or HTML layers over the canvas |

**Everything else is yours to direct** from the brief: story, structure, characters, settings, shots, timings, how data is charted.
Never bend the topic toward the style's demo film.

## 2. The order of work (the app's pipeline; never a step before the steps it needs)

| Step | Lemo-Opuscar's own step | Here |
|---|---|---|
| Prepare | brief (one round of questions) | BRIEF.md and ASSETS.md as the step says. The style decides look and sound; ask only what the film cannot be made without. A style cut from real material: §3a, before the treatment |
| Storyboard ✋ | treatment, prove the look, storyboard | one option = **the best structure** of a treatment (three candidates in your head, the best on the board; another, a different structure, when the owner asks). It has: logline, setup → turn → ending, a hook in the first 3 s, one **native move** of the style at the emotional peak, an ending that echoes. Frames drawn with real drawing code (§3), never a mock-up. **Do not open the demo yet** |
| Motion ✋ | cue map, shot list | `MOTION-PLAN.json`: per shot the framing, the camera move (at least four different moves across the film, each with a reason), the native move, durations, eases; source `{"kind": "style", "id": "STYLE.md §<n> <move>"}` |
| Build | produce | §3. The demo source is staged into `.moworks/library/lemo/<slug>/` now: read `DEMO.md` and the code **for techniques only** (a brush engine, a rig, a shader, a post pass), never its story, arc, shots, props or timeline |
| QC | self-check, "not the demo again" | the Moworks Review (moworks-qc), plus: compare with `DEMO.md`: structure, opening, signature shot, camera path, score shape, ending; **at least four of the six differ**. The failures Lemo-Opuscar sees most: subject too small or against the edge, too dark, colour on the same colour, subtitles over the subject, a gag too fast, blank frames in transitions, an effect that stops tracking its subject |
| Sound / Final Mix | score, foley, mix | **the app's** music and sound effects only (no Kokoro, no sampler, no Python mix); pick by the style's sound section (instruments, foley materials, the silences) |

## 3a. Styles cut from real material (Edit & Documentary, Evidence Films)

Built in full, as Lemo-Opuscar does them: nothing of the style is left out.
- **The material first**: the owner's own footage, photos, data or scans come first; then the sources the `STYLE.md` names (Wikimedia
  Commons, the Library of Congress, the Internet Archive, NASA, USGS…), found and fetched with the demo's own material tools, staged in
  `.moworks/library/lemo/<slug>/demo/…/tools/` from the first step (copy a tool into the project before you use it; never edit the
  library) or with your web tools when the project's web is on. Before you download, say what you will fetch, from where and under which
  licence (DIRECTOR §1).
- Only CC0, public domain (not "no known restrictions"), CC BY or OFL material; another open licence (ODbL, CC BY-SA…) only after naming
  its terms to the owner and the owner agrees (TECHNIQUE §11).
- **Every item traceable**: each fetched file goes into the project's `assets/` with a row in the project's `CREDITS` (what, source URL,
  author, licence); every fact on screen or in the voice-over in `FACTS.md` (claim, source URL, the quoted wording or the measurement).
- Material is fetched while the film is made; the render reads only the project's own files (the app's offline check is unchanged).

## 3. The page: a render(t) film inside HyperFrames

Lemo-Opuscar's page contract, kept:
- `index.html` is the whole film: the root `<div data-composition-id="main" data-start="0" data-duration="<seconds>" data-width data-height>`
  holding one full-frame `<canvas class="clip" data-start="0" data-duration="<seconds>" data-track-index="1">` (and HTML layers over it
  when the style wants crisp type, e.g. an end card).
- `window.render = (t) => { … }` draws the frame at second `t`. **Deterministic**: no `Date.now()`, no `Math.random()` (seeded:
  `mulberry` / `hash` in the style's library), no state carried from the previous frame; any frame alone, in any order.
- `window.READY = true` once fonts and images are loaded (`await document.fonts.load(…)` for every face you draw with).
- `window.DUR`, `window.TEXTS(t)` as Lemo-Opuscar writes them, if you like; the length that counts is the root's `data-duration`.
- Your scripts live in `compositions/lemo/` (`.js` / `.mjs`), loaded from `index.html`; no other `.html` there.
- A storyboard board is the same kind of page: `boards/<X>/index.html` posed one frame per second (still N shows its key moment over
  second N-1..N; the frames are one frame per shot or beat of the film (3-6 for a film under 20 s, at most 12 for a long one: group short shots into one beat), never one per second of the film), its scripts **inside `boards/<X>/`** (a board sees only its own folder; the app reports a file it could not load).
- **Do not register a timeline and do not call `render` from your own timeline**: the app inserts the bridge (`<script data-mw="lemo">`)
  that makes one paused HyperFrames timeline whose time is `t`, waits for `READY`, and calls `render(t)` on every seek. For GSAP tweens of
  an HTML layer, add them to `window.__lemo.tl` (the same timeline) after the bridge has run.
- Layout from the frame you render (`innerWidth` × `innerHeight`), default 1920×1080; animate on twos only where the style says so,
  camera and light smooth every frame; one world → screen function for anything that follows a subject.

Library paths, as Lemo-Opuscar writes them, are made local by the app's finalize (never write `../..`):
- `/core/lib.js`, `/core/three/post.js`, `/core/post/crt.js`, `/core/fonts/…`, `/core/assets/polyhaven/…` (CC0 models and textures in the
  library; **no HDRI pack here**: light 3D with area lights and three.js `RoomEnvironment`).
- three.js: **r170**, what the styles are tuned for. Write `import * as THREE from "three"` and `three/addons/…` (or Lemo-Opuscar's
  `/node_modules/three/…`): in a Lemo-Opuscar film the app points them at three@0.170.0. Never mix in another version.

Fonts: the families `STYLE.md` names come from the app's font store (finalize declares the ones the film's HTML uses): write each family
you draw with on the canvas also in a CSS `font-family` of an element in `index.html` (an invisible probe is fine), so it is declared and
checked. **Vietnamese text needs a font with Vietnamese letters**: when the style's face has none, that is a conflict with the author's
design (moworks-studio §2b): in Prepare, offer two or three faces that have them (checked with font_check, the closest
first), with the other points in one message, and stop for the owner's choice; never swap it on your own. Never link Google Fonts.

## 4. Never here

- Lemo-Opuscar's audio (Kokoro TTS, edge-tts, the sampler and its packs, `pluck.py`, `mix.py`) and its renderers (`core/render/*`).
- The demo's voices, music, characters, logos or names (its archive material is the sources', fetched again and credited like any item). Three demo narrations are excluded from Lemo-Opuscar's licence
  (Game Show Flat, Paper-cut Lightbox, Broadcast News Package): never reuse them.
- Existing works, brands or events the owner has no right to (DIRECTOR §12): draw fictional stand-ins.
- A LemoLab sign-off or the demo's end card. The film is the owner's: no LemoLab credit inside it.

## 5. Credit

Lemo-Opuscar, Lemomo (LemoLab), https://github.com/lemomo-ai/lemo-opuscar at ea34ff9; style prompts, code and docs MIT; demo films and
stills CC BY 4.0 (credit LemoLab). Code copied from the library keeps its MIT notice (the app adds it to the files it copies).
