---
name: moworks-alive
description: Moworks Studio's motion rule for every film style - the film is never still for more than 2 s, every held object keeps a smooth subtle movement, characters always move, text stays readable while the scene moves, the brief's motion words become real motion; minimum numbers per dynamic level. Read in the Motion Plan, the Build and the Review of every style.
version: 1.2.0
derived-from: Moworks Motion kit 2.0.4 (Moworks; commit 30b7dcb65808b2a5299ad6a3357280a12773395f) - engine/skill/moworks-motion/workflow/film.md L207-211 ("Dynamic level") and L240-241 ("A strong film keeps its always-on layers"), workflow/recipes.md L177 ("Nothing frozen except the final hold"), workflow/review.md L29 (criterion 3, motion); written from the idea for Moworks Studio.
---

# The film is always alive (every film style)

A film is never still for more than 2 s, every object keeps a smooth subtle movement, characters always move; the
film is lively, never a slideshow. This is the studio's rule over every film style. It adds to the style's own rules and never replaces
how the style draws: a style that draws in code (canvas, an engine) does it with its own technique. Where a style's text asks for a
still hold, this rule wins, except for the final logo hold.

## 1. The rules

1. **Nothing on screen holds still for more than 2 s.** Between the moves, every element on screen keeps moving (a drift, a float, a slow
   rotation, a push, parallax), and so do the background and the camera. The one exception is the final hold on the logo or end card;
   the logo may only breathe there (a faint uniform scale or rotation, never a distortion, never in a groove: moworks-studio §3).
2. **Every held object has a smooth, subtle, continuous movement** from its entrance to its exit: a sine or an in-out ease, never a linear
   start and stop, never stopping while it is on screen.
3. **Characters always move:** breathing, a weight shift or sway, blinks every 2-5 s, small head and hand gestures, all the time, not only
   on the script's cues.
4. **Text stays readable while the scene moves:** the text itself holds while it is read (a groove may pulse it by about 3 %:
   moworks-studio rule 2); the objects, the background and the camera around it keep moving. Never freeze the scene or the camera "so
   the labels stay still". **Text held longer than 2 s rides the camera** (three held captions outside the pushed group
   kept a 2.25 s still): push the whole frame, the text included, about 4-6 % over the hold, or float the text block 6-10 px on a slow
   sine (§2). It stays readable under a slow push; it only must not slide away.
5. **The brief's motion words become that motion:** "xoay quanh" / orbit / circle around = an orbit around that subject (at least 90° of
   arc while it is on screen); "xoay" / spin = a rotation; "bay" / float = a float; "rơi" / fall, "nảy" / bounce, "mở ra" / unfold… as
   said. Name the word and its move in the Motion Plan row.
6. **Something new every 1.5-3.5 s:** a new element, a layout change, a camera move or a cut. A small float alone does not read as alive.
7. **A film drawn stroke by stroke** (a picture that draws itself, a drawing being made): the new strokes,
   washes and marks drawn every second count as the motion. A hand may rest at most half a second between passes; a slow camera push
   (2-4 %) runs over the whole drawing; the finished picture may hold at the end as the end card. No float or drift is added to marks
   still being drawn.

8. **Only what is forbidden is off limits (owner 31/10, every film style).** A guideline, a film style or the owner may forbid a move: that move is not done (a kit that forbids glitch and
   split forbids those two, and leaves every other effect in the library). What is not forbidden is allowed: never swap a move for a tamer one to be safe, and never read a rule wider than it
   is written. Fonts, sizes, colours, logos, end tags, legal lines and the product's picture stay as the Brand Kit says; the motion around them is free. Be bold: the owner tones it down at the
   Motion Plan if it is too much, so that is the place to offer more, not less.
9. **Look for the livelier move in the Motion Library, every shot, in every film style (owner 31/10).** A style with its own moves uses them first and goes past them with the library, redrawn in its hand; a style's own bans hold. Lively means what suits the film: dread in a horror film, not a bounce. The library holds hundreds of effects; the search is how the film gets past the first idea. For each shot ask
   it twice: what the shot needs, and what would make it more fun and more alive (kinetic type, a surprising transition, depth and parallax, particles, a playful bounce, 3D or Three.js where
   a shot earns it). Compare what comes back and take the one that serves this film best, in the film style's own hand. The film draws on many items: about one new item a shot, and no item the hero of more than two shots
   (Test 31 searched 100 times and used 14 items, one of them 29 times: the film felt flat).
10. **Living details made for this film (owner 31/10).** Every film carries small things that make it fun, drawn in its own look and colours: stickers, an icon for each feature, chat bubbles,
   rings and bursts on the hits, particles, little words that play with the subject. Think of them in the Storyboard, from what is funny or charming in the subject and its words; a brief that asks for a sober film keeps them quiet, not absent.
   Text you add holds to moworks-studio §2c: nothing invented is presented as a fact.

## 2. The minimum numbers, by dynamic level

At 1920 px across; scale them to the frame. The hero's move stays the biggest of its shot; the always-on motion is smaller than the
hero's, never smaller than this.

| | light | strong (the studio's default) |
|---|---|---|
| The shot's hero move | clear at a glance | big and felt: it travels 25 % of the frame or more, or scales by 30 % or more, or turns 30° or more, with a snap or an overshoot; never only a fade or a small slide (a logo stays as moworks-studio §3) |
| A held object | drifts 6-10 px or more over its hold, or rotates 2-3° | drifts 15-20 px or more (up to about 60), or rotates 5-8° |
| A slow push on a hold (scale) | 2 % | 4-8 % |
| Background, always-on layers | a slow drift or zoom, 2 % or more over the shot | always moving and covering the frame: a drifting pattern or gradient, 30-60 particles, parallax 1.0 / 0.5 / 0.2 |
| Camera (2D or 3D) | a slow push or drift on every hold | moving on every hold: a push of 5 % or more, an orbit of 10° or more per shot, a dolly |
| A character's idle | breathing 2 % of body scale, sway 2°, a blink every 2-5 s | breathing 3 %, sway 3-4°, a gesture every 2-3 s, blinks |
| Something new | every 3.5 s at most | every 1.5-3.5 s |
| The longest still stretch | 2 s | none (1 s at most) |

Floats and drifts take 2.5-6 s per cycle (slower reads calm, faster nervous), each element with its own period and phase so the frame
never pulses as one; a loop that repeats visibly inside one shot is a fault.

## 3. In each step

- **Storyboard:** the frames name the living details and the lively moves they will use (rules 9 and 10).
- **Motion Plan:** the searches of rule 9 come first. Each shot has a `loop` (or `camera`) row for every element held on screen, for the background and for the camera,
  with its numbers (amplitude in px, ° or %, and period), and an idle row for every character. A hold longer than 2 s without such rows
  is not finished. The shot's plain words (`says`) say how alive it is ("kính trôi rõ và xoay chậm quanh bà; máy quay lượn 15°").
- **Build:** build every hold row; the always-on motion runs from the element's entrance to its exit on the shot's own timeline, as a
  function of time (deterministic: no random numbers at play time). Scrub the shot: in any 2 s window something on screen moves.
- **Review** (moworks-qc criterion 3, Motion): score it against the dynamic level and these numbers, from docs/MOTION-PLAN.json's hold rows,
  the sheets and the app's still-stretch check when the app gives it. A still stretch over 2 s other than the end logo hold, a held object
  or a character with no idle motion, a camera frozen behind text, or a motion word of the brief not done: Motion 6 at most; a film that
  reads as a slideshow: 5 at most. Fix it in the round.

## 4. Two more files in this folder

- **A lyrics video** (the app says when a film is one): `lyric-video.md`, stricter than the numbers above: a new world every 3 s, nothing still over 0.5 s, every montage word
  its own, one product through the film, every sung word on its sung time.
- **A film with an image sequence:** `sequence.md`: read its poses, play it with the app's player, never blend two pictures.
