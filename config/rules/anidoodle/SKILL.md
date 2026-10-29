---
name: anidoodle
description: How Moworks Studio makes a film in an anidoodle medium - the medium's marks, edge and order kept, the story the brief's own, the film written as the author's TypeScript film module on the pinned engine, bundled and driven inside HyperFrames, sound from the app.
version: 1.2.0
derived-from: anidoodle by Alex Greenshpun (10x Company), commit f746cbd8a7032463bd0bc88ee8ff852599193b8c, Apache-2.0 with NOTICE - skills/anidoodle/SKILL.md (the seven laws, the workflows), references/determinism-and-contract.md, engine/src/canvas-core/film.ts and hosts/page.ts (the film and page contract), rewritten for Moworks Studio; the engine's moves, the film kinds, the worked example, the house styles, Bit and the cheetah and the contract check (references/motion-deck.json, camera.md, motion-grammar.md, workflows/drawing-process.md, launch-video.md, launch-video-kit.md, facts.md; engine/tools/gate.mjs FORBIDDEN). https://github.com/alexgreensh/anidoodle/tree/f746cbd8a7032463bd0bc88ee8ff852599193b8c
---

# anidoodle medium: the rules of this project

The project's style is one anidoodle medium. Its own rule file is `.moworks/rules/anidoodle-<id>/SKILL.md`: the medium's reference
(medium, marks, edge, order, palette, paper, what it is not, its motion grammar), as the author wrote it; for one of the author's three
house styles (adaptAlmond, adaptAquarelle, adaptScrapbook) its recipe as shipped and its plate. The author's skill is staged in
`.moworks/library/anidoodle/`: `SKILL.md` (the seven laws and the workflows), `references/`, the engine's source `engine/src/`, the worked
example `example/` (Mechanical Lepidoptera and its spec, `example/butterfly-film-spec.md`: what a good spec looks like; study it, never
copy it), the house styles `styles/house/` and the launch kit's example facts `engine/facts/`. The author's tools (`engine/tools/`) are not
staged. **Moworks Studio runs every command** (stills, checks, render): where the author's guides say `node tools/…`, `npm`,
`render.mjs`, `music.mjs` or a gate, skip it; the app does that part or it is not used here.

## 1. What wins where

| Layer | Wins on |
|---|---|
| The medium's reference | the medium: how the marks are made, their edge and their order, the palette and paper. **Keep all of it**: a medium is a way of making marks, never a palette swap (law 3) |
| The author's `SKILL.md` and `references/` | the craft: one point per piece (law 1), stated realism (law 2), prove the look on one still first (law 4), the contract (law 5); the workflow for what is being made (story film, explainer, drawing that draws itself, loop, launch) |
| This file | how such a film is made in this app: the files, the bundle, the bridge, what is never used here |
| HyperFrames (`hyperframes` with its contract, `hyperframes-cli`, the files the app names for the step) | how the project is a HyperFrames composition: the root's timing attributes, determinism, HTML layers over the canvas |

## 2. The order of work (the app's pipeline)

| Step | The author's own | Here |
|---|---|---|
| Prepare | start-here intake | BRIEF.md and ASSETS.md as the step says; the author's intake questions only where the brief leaves them open |
| Storyboard ✋ | prove the look on one still, then the story | one option (another when the owner asks): a short treatment and frames drawn with the real engine in the medium (§3, boards) |
| Motion ✋ | motion grammar, camera | `MOTION-PLAN.json`: per shot the moves with numbers; cite the medium's motion grammar and the author's camera / motion references as source `{"kind": "style", "id": "<reference or move>"}` |
| Build | build end to end | §3 |
| QC | review (a fresh critic, a fix ledger) | the Moworks Review (moworks-qc), plus the author's `references/workflows/review.md` |
| Sound / Final Mix | the score in code | **the app's** music and sound effects only (no `music.mjs`, no sound pack); pick by the medium's mood |

## 3. The film: the author's film module, bundled and driven by HyperFrames

- The film is TypeScript, the author's way (`engine/src/canvas-core/film.ts`): `export const <name>: Film = { meta: { title, W, H, fps, bpm,
  durationFrames, … }, assets: { images }, shots: [{ id, start, end, draw(ctx, local, env) }] }`. Frames are the unit; shots tile
  `[0, durationFrames)`; `bpm` at `fps` gives a whole-frame beat. Draw with the medium's own module and kit (read their code in
  `.moworks/library/anidoodle/engine/src/canvas-core/`), and the engine's helpers (`core.ts`: seeded `rng`, paper, marks).
  `meta.W` / `meta.H` are the project's Format size (the system prompt's "Format W×H", any size the owner typed, e.g. 2160×1080), the
  same as the root's `data-width` / `data-height`; so is every board page's meta. Lay out from W and H, never from 1920 × 1080 (the engine draws any size).
- Files: the film and its own modules in `anidoodle/` (e.g. `anidoodle/film.ts`), and the host entry **`anidoodle/page.ts`**:
  `import { mountFilm } from "anidoodle/hosts/page"; mountFilm(<name>);`. Import the engine as **`anidoodle/…`** (for example
  `anidoodle/canvas-core/woodcut`), never by a relative path into `.moworks/`.
- `index.html` is the HyperFrames root: `<div data-composition-id="main" data-start="0" data-duration="<durationFrames / fps>" data-width
  data-height>` holding **`<canvas id="film" class="clip" data-start="0" data-duration="…" data-track-index="1">`**, and after the root
  `<script src="compositions/anidoodle/film.js"></script>`. The app's finalize bundles `anidoodle/page.ts` with the pinned engine into
  that file (esbuild, as the author's own page builder does) and inserts the bridge: HyperFrames' time `t` becomes `FILM.seek(round(t ×
  fps))`. Never write `film.js` by hand and never register a timeline.
- A storyboard board is the same: `boards/<X>/page.ts` (the board's film: its frame N posed during its second N, the stills read one a
  second; the frames are one frame per shot or beat of the film (3-6 for a film under 20 s, at most 12 for a long one: group short shots into one beat), never one per second of the film) bundled into
  `boards/<X>/film.js`, loaded by `boards/<X>/index.html` beside its `<canvas id="film">`.
- **The contract is absolute** (law 5): pure in `(frame, env)`, `rng(seed)` only, no clock, no `ctx.filter`, no generated images; the
  owner's images may be embedded (`assets.images`, files in the project's `assets/`).
- Words drawn in the film need fonts with Vietnamese letters when the text is Vietnamese; prefer HTML text layers over the canvas for
  titles and captions (crisp, and they reach After Effects as layers).

## 3b. Characters (a medium whose hand draws people: storybook, marker comic, coloured pencil, sumi-e, woodcut, scratchboard, risograph, pixel art, toy brick)

- The film's cast is `CHARACTERS.json`: each member with `engine: "anidoodle-human"` is a character of the author's human engine, kept as a
  module. The owner's are copied into the film's own modules, `anidoodle/characters/<id>/` (import them from `anidoodle/film.ts` as
  `"./characters/<id>"`); Mira and Theo are the author's, in the engine (`"anidoodle/canvas-core/characters/<id>"`). Its `check` is its gate.
- **Never redraw a character.** Every frame of it is `<character>.toScene(pose, camera)` drawn by this medium's hand
  (`anidoodle/canvas-core/character/render/<hand>`) with the character's palette for that hand, the way `miraTile.ts` and `miraWalk.ts` do. When
  `needsPalette` is true, add the palette for this film's hand in the film's copy of the character (its `palettes.ts`), following Mira's palette
  for that hand and keeping every role in its hue family.
- **Motion, the author's way** (`references/workflows/character-consistency.md`, `references/anatomy.md`): a walk from footsteps (`planWalk` /
  `walkAt`, as `miraWalk.ts`; planted feet never slide), poses from the character's library or new ones checked against the joint limits
  (`checkPose`), expressions from the head's `EXPRESSIONS` keys (a blink rides a head turn), hands from `HAND_POSES`, props in a hand as the
  author does them (Mira's gear, Theo's mug), the camera from `camera.ts`. One cue table holds every frame number.
- A new pose, palette or prop is a change to the film's copy of the character: then call the app's `character_gate` tool; it must pass. The app
  runs it again before Build: a failing gate stops the Build.
- A character from another engine (a Brush cartoon mascot) comes as a reference (`assets/_app/characters/<id>/CHARACTER.md`): draw it in this
  medium, keeping its shape and colours.

## 3c. The engine's own moves: use them, never hand-roll them

All in `anidoodle/canvas-core/` (pure functions of the frame, the contract holds):

| Want | Use |
|---|---|
| A camera move: pan, push, parallax, lens zoom, dolly zoom, follow with lag, a shake on a real impact | `camera.ts` (`references/camera.md`) |
| Slow motion, a speed ramp, a freeze frame | `timeRemap.ts`: draw the scene at `remap.at(f)` |
| A cut where the motion carries across | `seams.ts` (the numbers go into each scene's own camera) |
| A brush wipe, an iris, a flash on a cut | `transitions.ts` (a gentle move stays the default seam) |
| One object carried across a seam, a shape that becomes the next scene | `morph.ts` (`handoff`, `coverShape`), `motif.ts` (`checkRelay`, 2 px) |
| A label that names a thing and follows it | `callout.ts` (anchor it to the world with `camera.ts`) |
| A product's own screens from data, before and after | `productUI.ts` |
| A machine that works, comes apart and folds back | `mechanismKit.ts` (`references/workflows/machines.md`) |
| A picture that draws itself, mark by mark | the medium's draw-film module, `drawingScore.ts`, `drawingMarks.ts` |

- **Name a move by the deck.** `references/motion-deck.json` holds the author's 46 moves (open, seam, camera, reveal, type, acting,
  emphasis, close), each with its build, its numbers and when not to use it, and the 6 moves the author refuses (glitch, a fake light
  sweep…) with what to build instead. In the Motion Plan, cite a move by its id (`{"kind": "style", "id": "cam-whip-to-rest"}`) and keep
  its numbers unless the brief says otherwise; never plan a refused one.
- **Words.** The author's drawn lettering (`lettering.ts`, `drafting.ts`, `kinetic.ts`, `typeOptions.ts`) has no Vietnamese letters (an
  unknown letter becomes a dash): Vietnamese words are HTML text layers over the canvas. Latin-only display words may use it.

## 3d. The film's kind

The brief says the film's kind (New project no longer asks it; its two sample briefs are these kinds). A story
film is the default. When the brief asks for a picture that draws itself (one picture made mark by mark): read
`references/workflows/drawing-process.md` at every step, `meta.kind: "drawing"`. When it asks for a product launch film: read
`references/workflows/launch-video.md` and `launch-video-kit.md`, build on `launchTemplate.ts`, every claim in `facts.json`
(`references/workflows/facts.md`), `meta.kind: "launch"`. An older film whose New project named the kind: the system prompt still says it.
The app's five stages stay the same for every kind.

## 3e. Bit and the cheetah (the author's own, from the owner's library)

When `CHARACTERS.json` lists Bit (`rig: "bit"`) or the cheetah (`rig: "cheetah"`), they are the author's characters as shipped, each with
its own rig, not the human engine. They can come into a film in any anidoodle medium.

- **The cheetah: the rig is the character, the marks are the medium's.** `cheetahRig.ts` is a skeleton of angles that never stretches:
  `fk(rig, x, y, ground)` gives every joint of the frame (`spine` 10 points, `tail` 6, `foreN`/`foreF`/`hindN`/`hindF` 5 each, `head` the
  head's angle), from `STAND`, `BOW`, `CROUCH`, `SKID`, `mixRig` between them, `settle` onto the ground, and the rotary gallop
  (`gallopRig(phase)`, `gallopY`); `cheetahRun.ts` shows the run, the stop and the turn. Pose her only through the rig and keep its numbers
  (bone lengths, joint ranges, the build widths in `cheetahBody.ts`). Then draw her with **this medium's** kit along those points (a Sumi-e
  film: `sumiEKit.ts` `brush` strokes along the spine, legs and tail; a woodcut: its blocks; a scratchboard: knife lines…): her shape and
  motion stay hers, the marks are the film's. Her own painted look (`cheetahBody.ts` `drawCheetah(pose)`: ochre tufts and solid spots,
  `cheetahDusk.ts`'s hand) is used as it is only when the owner asks for it. Keep the features that make her a cheetah in every medium: the
  small domed head held level, the tear line, the spots, the long ringed white-tipped tail, the deep chest and tucked waist.
- **Bit: his look is baked into his rig.** `bitRig.ts` cuts the storybook plate's robot into parts drawn once by that plate's own code
  (pencil and watercolour) and moves them (`BitPose`, `restPose`, `drawBit2`, `idle`, `attend`, `cheer`; `storybook.ts`, `mascotHero.ts`
  show him). He is drawn as he is in any film; in a medium far from storybook, say in one line that he keeps his own hand.
- **His or her model sheet** (a medium with a Character step): write `anidoodle/films/sheet-<id>.ts`, a one-frame film of the rig's key poses
  side by side in this film's hand (the cheetah: STAND, BOW, CROUCH, SKID and two gallop phases), then call `character_sheet`. A rig has
  no gate of its own: `character_gate` passes it.

## 3e3. A character that is not a person (an animal, a thing)

The human engine is for people. A turtle, a dog or a talking kettle made for the film gets a rig of its own, the way the author built the
cheetah (`cheetahRig.ts`: bones of fixed lengths, angles, `fk`, a few named poses and a gait; `cheetahBody.ts` draws it from the pose):

- In `CHARACTERS.json`: `"rig": "<id>"` (its own), `"kind": "animal"` or `"thing"`, `"import": "./characters/<id>"`, and its gate
  `"check": "characters/<id>/check.ts"` (a path under `anidoodle/`). Never borrow the human canon, `checkPose` or `LIMITS` for it.
- Its gate checks **its own** rules: every named pose keeps the bone lengths, every joint stays in the range its rig declares, planted
  feet never slide in its gait, the features the brief names show. Export `run()` returning `[{ section, results: [{ id, ok, detail }] }]`
  (or the results alone); `detail` says what was measured, so a FAIL reads on its own. Call `character_gate`: it passes only when its
  own checks pass, and a gate that cannot build or run says why.
- Only the author's Bit and cheetah, as shipped, have no gate of their own.

## 3e4. A gait travels, and every character reads at the film's size

In one earlier film the cheetah galloped on the spot for two seconds over a ground that barely moved, and at the end she and the
turtle were so small that the Review took the turtle for a second cheetah. The author's rules already forbid both:

- **A walk, a run, a gallop is travel, never a cycle on the spot** (`craft-bar.md`: "a loop playing in place and called alive" fails;
  `workflows/start-here.md` "Alive means real motion": the subject travels through a world that changes as it moves, and the camera
  follows; the koi in `koiWorld.ts`, the cheetah in `cheetahRun.ts`). Either the character crosses the frame, or the camera follows it
  through a world placed in world units (`camera.ts`) that goes by under it:
  - the ground goes by at the speed the feet push it: per frame, the stride's length over the stride's frames; a planted foot never
    slides against the ground (`workflows/review.md`: "the ground travels 22 px a frame while her stride covers 60" is a finding);
  - every depth plane goes by at its own speed through the one camera (`camera.md`, depth planes): the far hills barely, the near grass
    fast, and now and then something crosses the lens in front (`cam-parallax-travel`);
  - the run changes over the shot: it speeds up or slows, passes things in the world, the camera lags and catches up
    (`cam-follow-with-lag`); the head rides level while the body works (`act-head-stays`).
  In the Motion Plan, give each gait its numbers: stride length and frames, ground speed (px a frame), the depth planes' speeds, how the
  camera follows. A still sheet can catch a stride at the same phase every time (a half-second stride sampled every half second looks
  frozen): judge travel by where the world is, not by the pose.
- **Every character the story needs reads at the film's size, on a phone.** On the frame (Moworks' numbers, 1080 px, scale to the film):
  the hero of a shot at least a quarter of the frame's short side, a supporting character at least an eighth, a small one (the turtle
  by the cheetah) big enough that its own features show (shell, head, the flower on its back). When the world makes a character small,
  go closer (a medium or a close shot of it, a push in, `cam-slow-push`) or give it its own shot; never keep a pair as specks for a wide
  that lasts. A picture that does not read is fixed in the picture, never with a caption (`workflows/review.md`).
- **The Review names every character in every still** (and what it is doing). One it cannot name, or names wrong, is a fault to fix
  in the picture; a gait whose world does not move is one too.

## 3e2. Every joint inside its limits, on every frame

A pose outside a joint's limits is an error on the frame it happens: the human engine's `build` throws (`checkPose`), and a film that
catches it and logs it (`console.error`) still fails, because HyperFrames counts a logged error as a script error and stops the render. So:

- Keep every joint inside its limits on every frame, between the keys too: clamp each joint value to its range
  (`character/human/skeleton.ts` `LIMITS`, `limitViolations`) where poses are mixed, eased, swung (walk and run cycles, `armSwing`, a bag's
  swing) or offset; retime the move when a clamp would show. Bit and the cheetah: keep their rig's numbers (Bit's arm lift 0..`ARM_MAX`,
  the cheetah's poses and `mixRig` between them).
- Never catch a limit error to log it, and never leave a `console.error` / `console.warn` in the film.
- After the Build and after a pose fix, call the app's `pose_check` tool: it draws every frame and names each pose outside its limits
  with its times. The Review's `qc_sheets` includes it every round: fix what it lists before anything else. The render stops on it (G-POSE).

## 3f. The contract check

The app's Tech checks scan the film's own modules (`anidoodle/`, `boards/`) with the author's list of forbidden calls (`engine/tools/gate.mjs`):
`Math.random`, `new Date`, `Date.now`, `performance.now`, `ctx.filter` or any `.filter =`, `new Image`, `new OffscreenCanvas`, `fetch()`,
`XMLHttpRequest`, `importScripts`, `localStorage`, `crypto.*`, a React, Remotion or `pencil.tsx` import. One of them blocks the render: use
`rng(seed)`, the frame number and `Film.assets` instead.

## 4. Never here

- The author's renderers, gates and tools (`engine/tools/*`), Remotion, the sound pack, `music.mjs` and the score in code (the app's music); the interactive web pieces and the self-running HTML file.
- Editing anything under `.moworks/library/anidoodle/` (the pinned engine): a change to a medium goes in the project's own modules.

## 5. Credit

anidoodle, Alex Greenshpun (10x Company), https://github.com/alexgreensh/anidoodle at f746cbd, Apache-2.0 with NOTICE (kept with the
staged engine and named in the bundle's banner).
