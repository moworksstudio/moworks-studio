---
name: adaptation
description: Moworks Studio's Adaptation step, for every film style - after the Review, the master film is laid out again for another size (9:16, 4:5, 1:1, or 16:9 from a vertical master) on the same timeline and sound, recomposed shot by shot, never cropped or squeezed; then a look at stills of the new size. Read only in the Adaptation step.
version: 0.1.0
derived-from: Written from the idea for Moworks Studio (owner 06/11/2026, #1228, #1232-#1235; audit/105 §8.3, rules v0). Follows HyperFrames 0.8.214 (Apache-2.0, commit 4719543e972548a261b8354f0a8dada479ae5d93), as shipped - https://github.com/heygen-com/hyperframes/blob/4719543e972548a261b8354f0a8dada479ae5d93/skills/hyperframes/references/types/vertical.md (the vertical layout, the 168-1330 px band, type x1.35, 28 px floor, 5 words a line), https://github.com/heygen-com/hyperframes/blob/4719543e972548a261b8354f0a8dada479ae5d93/skills/hyperframes/references/captions.md (portrait captions 600-700 px from the bottom, max width 900), https://github.com/heygen-com/hyperframes/blob/4719543e972548a261b8354f0a8dada479ae5d93/skills/hyperframes/references/overlays.md. The 9:16 channel zone is from third-party safe-zone guides (audit/105 §3.1), to be checked on a phone.
---

# Adaptation: one film, another size

The owner approved the master film (its own size, `meta.format`) in the Review. This step lays the same film out again for one more
size. The task names the size, its root page and its pixels. Everything you hear and every second stays the master's; only the
picture is composed again for the new frame.

**Order of authority** (the earlier one wins): the film style's source skill (its own staging, format or size rules: a 3D Cartoon's
STAGING.md and STYLE.md, Ricks Clip's narrow-vertical-frame rule, anidoodle's formats.md) → HyperFrames (`types/vertical.md`,
`captions.md`, `overlays.md`, `SKILL.md`) → the platform's safe zones (rule 5) → these rules. The studio's house rules and
moworks-alive hold as in every step.

## The rules (v0)

1. **Shared and untouched:** the script, the voice, the music, the sound effects, the mix, the film's length, and the time of every
   line and every shot. Never edit an `<audio>` tag or a sound lane; never move a shot's start or end. The app puts the master's own
   mix on every size at the render.
2. **Re-compose, never crop or squeeze** (HF vertical.md): for each shot, set the camera, the positions and the sizes again for the
   new frame. Placing the whole master picture inside the frame is the last resort, only when nothing else works (a wide data table),
   and you say so to the owner in your reply, with the shot.
3. **Extra picture cuts are allowed, the sound kept:** a wide shot with two subjects becomes two vertical cuts one after the other
   inside the same line; side-by-side items stack top to bottom. Nothing the line says is dropped from the picture.
4. **Type:** a vertical size sets type at ×1.35 of the master (HF vertical.md), 4:5 and 1:1 at ×1.2; at most about 5 English words
   (6-7 Vietnamese) a line; nothing meant to be read under 28 px. Cut words or wrap the line, never shrink it.
5. **Safe zones.** 9:16 (1080×1920): nothing in the top 168 px; every word and the product inside y 168-1330; no text under the right
   button rail (x > 940). The channel zone, where words and faces sit best: x 65-890, y 270-1250. 4:5 and 1:1: an 8 % margin on each
   side. 16:9 from a vertical master: HyperFrames' 90 % action-safe and 80 % title-safe boxes.
6. **Captions:** the source skill's own (3D Cartoon: STYLE.md), else HF captions.md (portrait: about 600-700 px from the bottom, at
   most 900 px wide), always inside rule 5.
7. **Code:** one root page per size at the film's root, `index.<w>x<h>.html` as the task names it (e.g. `index.9x16.html`), with
   `data-width` / `data-height` of the new size on its root element. It shares `compositions/`, `assets/` and `src/` with the master.
   The size is read from the root page's `data-width` / `data-height`, never written as a number in shared code. The timing table is
   the master's; only the layout table differs. A file that is this size's alone carries the size in its name before its extension
   (`compositions/shot-03.9x16.html`, `src/layout.9x16.js`): files named so are not part of the master's picture. A shared file may
   change only so it reads the size from the root page; the master must draw exactly as before.
8. **Always alive and the author's pace** (moworks-alive, #1198) as in the master. A vertical size feels faster through the added cuts
   of rule 3, never through faster motion.
9. **Look at it:** when the root page is written, call the app's `qc_sheets` tool with `size` (the task's size, e.g. "9:16"): it takes
   stills of every shot at the new size. Look once, as the Review does, for text outside the safe zone, cut faces, the set's edges
   showing and type that is too small; fix what you find and call it once more. Then stop with one short line. The app marks the size
   Ready and runs its Tech checks on that root page.

## Never

- Never change the master: its `index.html`, its shots, its look, its timing. A wish to change the film itself is the owner's, in the
  chat, on the master.
- Never touch another size's root page or files.
- Never add, move or remove a sound; never change the film's length.
