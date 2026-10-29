# Motion craft: creative first, the banned list, lessons from real films

From the Moworks Motion kit 2.0.4 (`workflow/film.md` "Creative first", "Composition", "Motion lessons"; `workflow/free-design.md` "Look and
motion"; `workflow/recipes.md` "Craft notes"; `workflow/review.md` "Words for notes"), rewritten for HyperFrames compositions.

## 1. Free by default: validate, don't constrain

In an A/B test the plain-prompt film, with no library and no rules, scored 55 / 70 against a rule-heavy skill's 46 (motion 9, sync 9,
layout 8). Locked are only: the owner's layout in keep design, the film's design as chosen or described (a Brand Kit in `frame.md`, the brief's own design, or with no Brand Kit a guideline) on every piece of text, logos (rule 5), the end
card, the credit line, real content, and what the owner asked for by name. Everything else is free and should be bold: layout,
backgrounds, transitions, stickers, particles, the product's acting, the montage words, big type under the product. The checks run AFTER
you create; they never shape the first idea.

| Part of the film | Who chooses |
|---|---|
| What the owner named, described clearly, or picked from the library | Exactly that |
| Composition, layout and look of every shot | You, designed for this film. A library block is never a whole shot as it ships: restyle it and compose around it |
| Motion: the hero move AND the supporting moves | Written for this film: staging, timing on the music or voice, a different technique in each shot. A library item may be a starting point or a utility |
| Transitions | Designed with the shots (a shape carried across, a wipe under the product, a match cut); a stock one only where a plain cut is right |

Custom motion as DOM / CSS / GSAP keeps the film editable in After Effects (Export to AE); canvas and WebGL reach AE as pictures.

## 2. Composition

Lean the main super and the hero (the product) toward the centre of the frame, as one group where it fits (an A/B film whose super and
product drifted far off-centre scored 5 for layout; the one that kept them near the centre 8). A tendency, not a rule: a frame can sit off
centre when it reads and balances better. Secondary things (stickers, particles, small words) float free. The lead subject fills most of
the frame in feature beats.

## 3. The banned list (name the defaults; "avoid the AI look" alone only swaps one default for another)

Purple or blue gradients, glow orbs, bloom, lens flares, neon on dark by default; floating particles as decoration; everything fading in
at once; fade-and-slide-up on every element; centred-everything layouts; generic spinning turntables; text that moves while it is read; a
made-up tagline; a title alone on a gradient; small labels in the corners and decorative frames; bouncy easing on text; icons with
mismatched stroke weights. Palettes that read "made by AI" (black + yellow, neon lime on black, purple-blue gradients, glassy blobs): take
colours from the client's own material or from a specific idea for this film (a material, a place, a decade). Keep the list alive: after
the first build, name each default the film used anyway, add it to `banned` in the Motion Plan and fix it.

## 4. Motion lessons (learned on real films)

- A "camera" (push, drift, parallax) moves imagery layers; text only pulses with the groove while read.
- `backface-visibility: hidden` is not reliable in renders: fold a card to 90° and hide it, never show its back. A 90° hinge is invisible
  only when the perspective origin sits on the hinge.
- A first GSAP `fromTo` draws its "from" state at once (immediateRender): an element whose start state is visible shows from frame 0. Hide
  it until its time.
- **An out move starts only after the in move on the same property has ended.** Overlapping, the in move finishes after the out move when
  the film plays and its end state stays on screen, while a direct seek looks right, so stills miss it.
- A number always counts in full, from 0 to the designed number, centred while it counts (measure its width on the final string).
- Light only ON an object (a shine inside the strokes of letters, a sweep inside a card); never a light streak, light leak or white flash
  over the whole frame; footage never flashes white; no "cinematic" grade + vignette + grain over footage by default.
- A transition covers the whole frame (nothing shrinks to show black behind).
- A cut-out person whose lower edge sits on the frame edge stays on it (breathing from the feet, a side sway).
- Text scaled up inside `will-change: transform` renders soft: scale the font size or drop will-change.
- At a cut, the next shot enters already moving in the exit's direction; cut at peak speed; exits run about 1.5× faster than entrances.
- Swapping one line for the next inside a shot (HyperFrames' cut catalog at 0.8.163, Apache-2.0, numbers as shipped:
  https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/faceless-explainer/references/cut-catalog.md;
  HF retired that skill in 0.8.185, so the studio keeps them as its own rule): *zoom-through* (out: scale 1 → 1.2, blur 0 → 10 px,
  power3.in, 0.2 s; in: from scale 0.75, blur 10 px, expo.out, 0.5 s; blur 10 px on text, 18-20 px on a full-frame surface) or
  *waterfall* (outgoing words x 0 → -230, power4.in, 0.34 s, 0.022 s apart; incoming from x +230, power4.out, 0.3 s).
- A colour flood (a circle wipe from an object) clears the farthest corner in about 0.3 s. Moving a composed group to make room: a
  slow-fast-slow ease; the new content appears during the fast middle.
- Nothing frozen except the final hold: a micro drift or settle keeps a held frame alive (the logo only breathes: moworks-studio §3). Sharp text through a handoff:
  crossfade only its fill, never scale a blurred copy.
- A calm film: one thing moves at a time. The muted test: someone who watches it without sound can say in one sentence what it showed.
- A product film is a chain: each step produces what the next one uses, on one continuous camera; muted-first, the type carries the message.
- Keep design: a stretch of voice-over with no designed frame gets a proposal in the Motion Plan (the film's own elements); the owner decides.

## 5. Words for notes (the owner's notes in camera words)

| The owner says | It means |
|---|---|
| "slow every zoom to 0.7x" | every zoom's duration / 0.7 |
| "hard cut here" | a hard cut at that time, no transition |
| "push in on the button" | a camera push toward the button (imagery scales up, text only pulses) |
| "hold the text 0.5 s longer" | the text's out moves 0.5 s later (the shot grows if needed) |
| "come in on the beat" | the move starts so it lands on the nearest beat |
| "heavier" / "lighter" | a spring nearer 1.0 damping / a snappier one (or a longer / shorter ease) |
| "bouncier" | a playful spring (0.4-0.6 damping) |
| "more rushed" | more moves per bar, shorter holds, entrances on eighth notes |
| "too tame" | the strong dynamic level: drifts while holding, always-on life, bolder moves (`recipes.md`, "Energy") |
| "jolt with the beat", "bounce on the kick" | a groove (or more elements in it, a bigger pulse) |
| "make it pop" ("chưa đã") | scale 1.0 → 1.08 → 1.0 over 0.25 s, its peak on the beat |
| "more premium" ("sang hơn") | entrances on an ease-out quint, springs at damping 0.8, no overshoot on text |
| "it drags" ("lề mề") | every hold one beat shorter, so every cut stays on the grid |
| "too busy" ("rối") | one hero move at a time; the others 150 ms later at 60 % of its travel; or remove 30 % of the motion |
| "looks like AI" ("nhìn AI") | name the defaults it used (the banned list), ban each, fix |
| "the ending is abrupt" ("kết cụt") | the house ending (house rules §9): the last shot keeps moving (a 2 % push), the picture and the music fade out together over the ending's fade |

A vague note ("make it nicer"): ask ONE question with 2-4 concrete choices. Say the numbers you changed in your reply.
