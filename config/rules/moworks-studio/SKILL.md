---
name: moworks-studio
description: Moworks Studio's house rules for every film style, read first in every step - the five rules of every film (collisions, readable text, determinism, truth, logos), the guideline or Brand Kit on every piece of text, the client's logo used as given, Vietnamese text, hand-drawn styles under a Brand Kit, character acting, text over a canvas film, and how every film ends. Adds only what HyperFrames and the style leave open.
version: 1.3.0
derived-from: Moworks Motion kit 2.0.4 (Moworks; commit 30b7dcb65808b2a5299ad6a3357280a12773395f) - engine/skill/moworks-motion/SKILL.md step 3 ("Brand") and "Rules in every film" 1-5, workflow/characters.md sections 2, 3 ("Faces", "Hands") and 6 ("Collisions and physics"), brands/other.md; written from the idea for Moworks Studio. HyperFrames (Apache-2.0, 0.8.214 at 4719543) read as shipped where cited. Owner rules 24/10/2026 (#345, #346); the ending, owner 29/10/2026.
source: https://github.com/moworksstudio/moworks-motion-dev/blob/30b7dcb65808b2a5299ad6a3357280a12773395f/engine/skill/moworks-motion/SKILL.md
---

# Moworks Studio: the house rules of every film

Read this first, in every step, in every film style. **What wins:** where HyperFrames already has a rule (how a composition is built,
timing, determinism, captions, design files, its checks), HyperFrames' rule holds as it ships; the film style's own rules decide its look,
its drawing and its motion. This file adds only what they leave open, and the owner's own words in the chat win over it for their film.

## 1. Rules in every film

1. **No collisions:** readable elements (text, UI, photos, the logo) never run into each other on any frame. Exempt: a transition
   carrier, layering the design itself makes, and big type under or over a product picture while every letter still reads. HyperFrames'
   check reports overlap, occlusion, clipping and contrast: fix each before the film is done.
2. **Text stays readable while it is meant to be read:** its entrance and exit are free; while it is read it holds (a groove may pulse it
   by about 3 %), never drifts, slides or spins away; everything around it may keep moving (the moworks-alive rule). Held longer than
   2 s, it rides the camera (moworks-alive rule 4): a slow push of the whole frame with the text in it, or a slow float of the text block;
   that is not drifting away, and "it holds" never excuses a still stretch. It holds at least
   0.5 s + 0.3 s per word; contrast 4.5:1, 3:1 for large text.
3. **Deterministic:** every frame is a function of film time only (HyperFrames' determinism rules): no timers, clock, unseeded random or
   network loads.
4. **Truth:** real content only; anything illustrative is labelled "Example"; no invented numbers, quotes, features or taglines.
5. **Logos:** section 3.

## 2. The design of every piece of text

- The film's design, as the owner chose it in New project or as it comes, governs the design of **every** piece of text in the film (fonts,
  sizes, weights, colours, case, logo use, grid and margins), not only the main layout: a label, a caption, a number, an end card.
  Precedence: the **Brand Kit** (`frame.md`); with no Brand Kit, a guideline in the owner's files takes that
  place; then the design the brief describes; what is still open is yours.
- In motion the design binds only its logo and end-card rules; all other motion is free, text included, while it stays readable.
- **A film style with its author's design** (every style but General Style and HyperFrames' seven film types, whose design the owner
  picks in New project: Explainers, tutorials and "how it works"; Launch, promo and feature films; Music videos and films cut to a
  track; Numbers, charts and data stories; Vertical and social clips (9:16); 3D, simulations and generative pieces; Characters,
  mascots and story shorts): the author's design (colours, fonts, layout and
  drawing technique) is the film's design, and no Brand Kit is applied by itself. Brand colours, fonts or a look other than the author's
  are a conflict (below); once the owner chose, follow it: their colours and fonts in the author's hand (marks, edges, texture and how a
  shape is made stay the author's; never redraw the author's marks as flat vector to fit a brand). In the Editor, apply a Brand Kit to
  such a film only when the owner asks, and say first what it will change. The logo (section 3), Vietnamese text and the one approval
  hold for every style.

### 2b. A conflict or a missing thing: stop, say it, offer the choices, wait

This is the one rule for every conflict and every gap, in every step and every style; nothing else decides one by itself and goes on.
- **What counts:** the brief against the film style's own design (colours, fonts, look: an author's style) or its limits (what the style
  cannot draw, a size or rate it does not make); the brief against a New project field (format, rate, length, the Brand Kit chosen
  there); a brand guideline in the files against the chosen Brand Kit; the brief or the chat against the
  guideline; a file, link, logo, voice or text the film needs and nobody gave; a voice-over longer than the film's length set in New
  project (a 45.6 s voice made a 40 s film 47.5 s, said only after): offer a longer film (the voice plus the end hold), a shorter
  script with the voice made again, a faster voice (the Voice screen's speed), and tighter pauses only when they add up to the difference;
  never lengthen the film, drop the end hold or cut the voice on your own; and any change to a Brand Kit value: a colour, or a font that cannot draw Vietnamese or
  that the app does not have (offer 2-3 Vietnamese fonts the app can use, nearest first with a short reason, "upload the font file" when
  it is missing, "keep it, accept the missing accents" only when the font exists); the same for the film style's own font (the author's
  face) when it cannot draw the Vietnamese letters the film writes: never swap it for a near one on your own; and a note
  (in the chat or the Storyboard dialog) that asks to take out or change a mark the style's author made part of the medium, the marks its
  reference names (film grain, a print's sprocket scratches, line boil, halftone dots, the paper's tooth, the author's palette): say it is
  the author's mark and what it gives the film, and offer keep it · keep it lighter · take it out only in the frames the note names · take it
  out everywhere; never take it out on your own, and never in frames the note did not name (a rubber-hose film's sprocket
  scratches, named rightly, were taken out of every scene for a note on four frames). The Build and the Review keep every such mark in
  every frame unless the owner chose otherwise among these choices; a removal written in frame.md, NOTES.md or the code without the owner's
  choice (an earlier step's own reading of a note) is not a choice: ask with these choices before you build, and keep the mark until the
  owner answers.
- **What to do:** write nothing that depends on it. In one message, list every point (what each side says, in plain words), and for each
  offer two or three choices with your suggestion first (e.g. "1. giữ màu đỏ của tác giả · 2. dùng xanh ngọc #00A6A6 của brand · 3. đỏ cho
  nền, xanh ngọc cho chữ"); for something missing, say what it is and the ways on (add it with the Assets button, a stand-in, go on
  without it). Group every question of the step in that one message, then stop: the app shows "Waiting for you" and a card. Never pick
  for the owner, never "follow X and say so in one line".
- **After the answer:** follow what the owner chose for each point (write it in ASSETS.md or NOTES.md so later steps keep it), then go
  on. No answer yet: nothing moves; New project's fields stand only until they choose.

## 3. The client's logo

- **The given file only**, as it is: never redrawn, retraced, recoloured, stretched, cropped, outlined, shadowed or given an effect (glitch,
  blur, split, glow). A light or dark version only when the owner's files hold it.
- **Never put inside a card, badge, pill, frame or box, and no text added around it.** A tagline or a name line only when the brief asks
  for it in so many words, and then as its own text line, apart from the logo, in the design's type.
- It enters and leaves **as a whole** (fade, slide, uniform scale), unless the guideline gives its own logo animation.
- **It may breathe** (HyperFrames 0.8.163, Apache-2.0: the `cta-morph-press` blueprint of hyperframes-animation, "faint rotation-only
  resting breath (logo scope only)",
  https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/hyperframes-animation/blueprints/cta-morph-press.md;
  hyperframes-creative's `motion-principles.md`, logo breathing on the scene's timeline,
  https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/hyperframes-creative/references/motion-principles.md;
  HF retired both in 0.8.185, so the studio keeps this as its own rule): a faint uniform scale (at most 2-3 %) or rotation (at most
  about 1°), slow, on the shot's timeline. Never a distortion (no skew, no squash, no scale on one axis), never so much it reads less
  well, never in a groove.
- The Review checks it on every film: the logo is the given file, whole, undistorted, clear, with nothing added around it.

## 4. Vietnamese text

- Every diacritic visible on every frame: leave room above and below in masks, clips and line-heights; a font that draws every
  Vietnamese letter (the app checks the glyphs).
- On-screen text and voice in the brief's language; the chat in the owner's.

## 5. Characters: acting (any character engine: anidoodle's human engine, the Brush cartoon kit, drawn HTML people)

- **List the gestures before animating:** from the storyboard, for each character, every pose AND every gesture (two palms rising one
  after the other, a knee bending on a landing, a head turning to the speaker), with its time. The character's sheet shows those
  gestures, not only rest poses; a gesture the engine cannot make is named to the owner before the build.
- **Faces are never frozen:** every character on screen longer than a second has an expression that fits the beat, blinks (a lid for
  about 0.1 s, every 2-5 s) and a talking mouth while it speaks.
- **Hands act:** open, relaxed, pointing, gripping, as the gesture needs; a hand that holds something grips it.
- **Weight and contact:** feet on the ground (no sliding, no floating; a step plants the foot), weight shifts before a move, anticipation
  before a big action. Anything that lands squashes and settles, and what it hits reacts. Nothing floats unless the story makes it float.
- **Always alive** between the gestures (the moworks-alive rule): breathing, sway, blinks.
- Each engine's own tools do it: anidoodle's poses inside its joint limits, `toScene`, `planWalk` / `walkAt`; the Brush kit's
  `character()`, emotions, takes and turns. Never the old kit's runtime (`AIMK_RIG`, `AIMK_ART`): it does not exist here.

## 6. The storyboard and the cut, checked in every style

Written from the storyboard self-check and the motion check of What If animation (FreshStack, MIT,
https://github.com/kelano86/what-if-animation/tree/3725a22d2d101320cae5b7d761af8d75120c4987, `references/look.md`), keeping only what
holds in every style; what holds only for a lit-room, stick-figure look stays in `.moworks/rules/what-if/references/look.md` and is never
applied to motion graphics, line art, ink or paper styles. With the board stills (Storyboard) and the QC sheets (Review), check each shot:

1. **One read in a second:** at phone size the subject and the action are clear without the voice; if it needs the voice, reframe it.
2. **The size or the angle changes at every cut:** no two neighbouring shots share both (wide, medium, close, an insert, over the
   shoulder, high, low); in a one-shot film, the camera's distance or angle changes between beats instead.
3. **The face reads:** a character's face is the clearest, sharpest thing in its area, and its expression and pose say the line
   without the voice (§5).
4. **Continuity:** the same costume, the same layout and the same props in the same places across the shots of one place.
5. **On the word:** an action that illustrates a word lands within about 3 frames of it; a realisation holds about 2 frames before the
   reaction; a landing overshoots and settles (§5); nothing jumps between two frames unless it is meant to (a cut, a flash, a "paste").

The Review scores these under its own criteria (moworks-qc: Composition, Motion, Sync); moworks-alive keeps the still-stretch numbers.

The approved storyboard is the owner's: once STORYBOARD.md is approved, the Motion Plan, the Build, the Review and the sound
never edit its frames (their times, words or scenes). A timing the voice or the build needs goes in MOTION-PLAN.json or the film's own
code; a change of what a frame says or shows is the owner's to approve (§2b). The app puts the frames back as approved after such a
step; only the owner's own requests in the chat change them.

## 7. Sound under a voice-over

Only when the film has a voice-over with its reviewed transcript (transcript.json, word timings). Written from What If animation's
`references/sound.md` (FreshStack, MIT):

- **An effect that illustrates a word goes in the pause just after it, never on it** (the word stays clear and the sound answers it);
  write its `- sfx:` cue at the word's end (`name@<seconds into the shot>`). The app also moves an effect that would fall inside a spoken
  word to just after it.
- **Effects line up by their attack:** the app places each one so the moment it starts sounding, not the file's start, lands on its cue.
- **The music plays to the film's end and fades out there** (the app sets the fade on the music track: the ending's fade, §9). Stop it early
  only when the owner or the brief asks for it: call the app's `music_stop` tool with that second (in a pause of the voice), or the
  owner sets it in the Final Mix ("Stop the music at"). A film kind or a style may have its own rule for this (What If: its own
  `SKILL.md`); never stop the music at a twist on your own.
- **The voice stays on top:** the app's voice check lists every spoken word where the effects or the music come within 3 dB of the voice
  (a warning, never a block); fix each by moving the effect into the pause after the word or lowering it. The whole mix stays at -16 LUFS.

## 8. Text over a canvas film (owner 27/10)

Only when the film draws on a canvas: its film style's After Effects badge is "video" (measured on the style's demo), or the film's own
code draws its picture on a canvas (a 2D or WebGL canvas, three.js, an engine's page). The app says so in the step's message. Such a film
reaches After Effects as one rendered picture, so its text splits in two kinds:

1. **Plain text goes in HTML over the canvas**, so After Effects gets it as editable text layers: titles, subtitles and captions, data
   labels and numbers, lower thirds, end cards.
   - The style's own font, size, colour, place, timing and motion: the frame looks the same as before. The element sits over the canvas
     in the same composition, placed in the frame's pixels (the canvas's own size mapped to the frame), moved by the same film time
     (the composition's timeline, never requestAnimationFrame or a clock), and the canvas no longer draws that text (never both).
   - A grain, paper, light or any texture the style lays over the whole frame goes over that text too: a CSS overlay on top of it
     (the same texture, blend and strength), so the text does not sit clean on a textured picture.
   - Text that cannot be made to look the same in HTML stays on the canvas; write why in `NOTES.md` (one dated line).
2. **Performed text stays on the canvas exactly as the author ships it**: text whose look or reveal is the style's own drawing (the
   Whiteboard pen writing each stroke on the board, Brush's painted letters, ASCII or CRT characters). That is the author's touch
   (sources as shipped): never move it to HTML, redraw it or change it.

Never edit HyperFrames' skills or a style author's sources for this: the film's own files only.

## 9. The ending: no film stops dead (owner 29/10)

In every style, every film. HyperFrames' own rules on the end hold as they ship (`hyperframes/references/story.md`: the end card is built,
not a still, its mark and call to action land and hold 2-3 s; `motion.md`: the film's last line holds at least 2 s; `sound.md`: the music
ends with a short fade under the end card); this adds the fade:

- **No end card or logo:** the last shot holds and keeps moving gently (nothing still for more than 2 s, moworks-alive), and **the picture
  fades out while the music fades down, together**, over the ending's fade: the picture's opacity to the film's background over the last
  seconds, on the root or the stage that holds every layer, in the film's own timeline (deterministic).
- **An end card or a logo:** it is part of the content; it lands and holds as HyperFrames says, then a **shorter** fade of the picture
  and the music after it.
- **The fade comes after the length the owner set, never out of it** (owner 29/10: a fade inside would squeeze the film). The length set
  in New project is the content; the fade is added after it: 60 s is a 65 s file, 1:45 is 1:50, 10 s is 11.5 s. The whole film (the
  root's `data-duration`, the storyboard's frames, the Motion Plan's shots, the music and its beats, the render, Tech checks) is the
  content plus the fade; the last shot carries the fade at its end. The app tells each step the three numbers.
- **Only when the brief or the owner asks for exactly or at most that length** ("exactly 60 s", "no longer than 60 s", a platform's
  limit) is the fade inside the set length: the Motion Plan's `ending.inside` is `true` (`false` otherwise, the default), and the whole
  film is the set length.
- **A style whose author gives its own ending** (Lemo's end cards, What If's last beat, a drawing that holds as its own end card): keep
  that ending as shipped and add nothing after it; the app fades the music within that ending.
- **The fade's length** (the app's one rule, `hf-edit/ending.mjs`), from the content: 12 % of it, at least 1.5 s, and 3-5 s for 30 s or
  more (10 s: 1.5 s, 20 s: 2.4 s, 30 s: 3.6 s, 60 s and longer: 5 s); after an end card half of that, at least 1 s.
- The Motion Plan says it: its `ending` (`fade`, `endCard` or `author`, the fade's seconds, `inside`) and the last shot's fade row. The app
  fits the music to the whole length, sets its fade to the same seconds, and Tech checks flag a film whose last half second is a hard cut
  (the picture still full on its last frame), except in a style with its author's own ending.
