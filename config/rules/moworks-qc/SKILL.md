---
name: moworks-qc
description: Moworks Studio quality review, for every video style - after the build, look at stills of the film like a strict director, score it on seven criteria, fix until every score is 8 or more, with HyperFrames' check folded in.
version: 1.1.0
derived-from: Moworks Motion kit 2.0.4 (commit 30b7dcb, MIT, Moworks) - engine/skill/moworks-motion/workflow/review.md, rewritten for Moworks Studio. Folds in the layout and contrast findings of HyperFrames' check (Apache-2.0, 0.8.214 at 4719543), read as shipped. Criterion 6 (Brand / design) keeps the checklist of HyperFrames' design adherence at 0.8.163 (Apache-2.0, as shipped: https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/skills/hyperframes-creative/references/design-adherence.md); HF retired that file in 0.8.185, so the studio keeps it as its own rule.
---

# Moworks QC: the review before the owner sees the film

**Only for the QC step** (the app names it in the pipeline) and when the owner asks you to look the film over. In every other step, the
style's own skill decides. This file never changes how a film is designed or built: in a HyperFrames style, the HyperFrames skill still
owns the design and the build; this is the studio's quality bar on top.

## 1. What you get from the app

The app makes the pictures (you cannot run commands): call its **qc_sheets** tool once per round; it answers with the paths of:
- **beats sheet:** one settled still per shot;
- **cuts sheet:** a strip of frames across every shot change;
- **phone sheet:** every shot at 360 px wide (can every word be read on a phone?);
- the result of **HyperFrames' check**: lint, script errors, layout (text overlapping, occluded, clipped, overflowing the frame or its box),
  contrast, motion; plus the app's checks (offline, fonts present, every Vietnamese letter drawn).

Look at the sheets closely, quality first. Read them as sheets (a sheet is one picture), not frame by frame: every extra picture costs the
whole conversation again.

## 2. Score 1-10, each criterion

1. **Hook:** the first 2 s make you watch.
2. **Readable on a phone:** every word at phone size; contrast 4.5:1 (3:1 for large text); each text held its reading time.
3. **Motion:** real acceleration or springs, no dead frames, nothing sliding at constant speed, things alive between the moves at the
   dynamic level the owner chose, scored against `.moworks/rules/moworks-alive/SKILL.md`: stills cannot show it, so
   read MOTION-PLAN.json's hold, loop and idle rows and the app's still-stretch check when it gives one. A still stretch over 2 s other than
   the end logo hold, a held object or character with no idle motion, a camera frozen behind text, a motion word of the brief not done:
   6 at most; a film that reads as a slideshow: 5 at most.
4. **Variety:** something new every 2-4 s.
5. **Composition:** the main super and the hero near the centre (a tendency, never forced), the rest floating free; balance, margins.
6. **Brand / design:** the film's design spec (`frame.md`, a Brand Kit chosen in the project; `design.md`; the design the brief describes; with no Brand Kit, the guideline's rules), held strictly (HyperFrames' design adherence at 0.8.163, kept as the studio's own rule):
   every colour from its palette, its fonts and weights, its corners, spacing and depth, none of its "don'ts"; the owner's frames in keep design (2 px).
7. **Sync:** moves land ON the words / beats they belong to.

## 3. Hunt for these

- Every **layout and contrast finding of HyperFrames' check**: fix each one before you say the film is done (an exception only where the
  design itself layers them, e.g. big type under a product that every letter still reads over; say why in the review file).
- A main super and product pushed far off-centre for no reason; sung words entering on the beat instead of on their sung time; text running
  into text during a change; objects gliding evenly instead of easing; a title alone on a gradient; text that goes soft when it scales;
  a shot where nothing happens; anything still for more than 2 s (moworks-alive); a logo that is not the given file whole and clear
  (redrawn, recoloured, stretched, cropped, given an effect, put in a card or badge, text added around it, or breathing so much it distorts:
  moworks-studio §3); a piece of text off the film's design (moworks-studio §2); a jump at a loop or a cut; a shot that looks like its library demo; an out move that starts before its in
  move ends; anything the owner complained about earlier (in `NOTES.md`).
- In a film drawn on a canvas (moworks-studio §8): a plain text (a title, a caption, a data label or number, a lower third, an end card)
  still drawn on the canvas with no reason in `NOTES.md` → move it to HTML over the canvas, looking the same; a performed text (a pen
  writing, painted letters, ASCII / CRT characters) moved to HTML or redrawn → back to the author's drawing.
- The storyboard and cut checks of moworks-studio §6 (one read in a second, size or angle changes at every cut, the face reads,
  continuity, on the word) and, with a voice-over, the app's voice check (moworks-studio §7).

| What you see | Likely cause → fix |
|---|---|
| Stutter when played, fine when seeking | an out move starting before its in move ends; a CSS transition or timer → film time only |
| Text goes soft on a zoom | `will-change: transform` on a scaled layer → scale the font size or drop will-change |
| A loop that jumps | the end meets the start in position but not in speed |
| Cheap, bouncy | bounce easing on text → a heavier spring; overshoot only on UI |
| Looks like every AI film | no named style; a title on a gradient; generic particles → a bolder idea, the banned list |
| Moves feel late on the music | the move starts on the beat instead of landing on it → start it earlier |
| An invented feature or number | no source → the client's facts; illustrative numbers labelled "Example" |

## 4. The loop

Write the 3 worst problems with their seconds, fix them, and call qc_sheets again for the next round. Open only the code of the shots
the sheets and the check flag (their seconds name the shot), once each: Grep for the part to change and Edit it; never read every shot
again.
**1 to 3 rounds: stop as soon as every score is 8 or more**. After 3 rounds with a score still under 8, stop and tell the owner which and why.
**A broken studio rule is never left for the owner** (the Review stopped at 6/10 with a 2.25 s still, then asked the
owner how to fix it): a still stretch over 2 s other than the end logo hold, a character or held object with no idle motion, a logo that
is not the given file whole, text that cannot be read on a phone. Fix each in the round you find it, with the smallest change that meets the
rule (for a still: a drift, a push or a new element in that stretch, as moworks-alive §2 says), even after the third round, and look again.
Move what the still-stretch check names: its "mostly <places>" are where the held blocks are (once the push moved a strip group while
the three held captions sat outside it). Held text is no exception: it rides the camera (moworks-alive rule 4).
Only a matter of taste or one only the owner can decide may end the Review under 8 with a question.
**Score only what you have seen after your last change** (three fixes of the last round were never looked at): when a
round ends with a fix, call qc_sheets once more before you write the final score, fix nothing in that look, and score it; a fix you could
not see again is named in the review as unchecked, never counted as done. Seconds the sheets or the check did not reach (the check ran
out of time, a sheet is missing): look at the beats sheet for them yourself, and name the ones you still could not see. Sync before the
music is placed: score it on the voice-over and the cuts the film has, and say the music comes after; never leave it unscored for that.
A score you cannot raise without the owner (sync when you cannot hear the song, a colour only they can approve): ask them right away, with
the seconds to check, instead of stopping quietly.
**Never promise a later check** ("the 31.5 s cut may fall into 'Hôm', check by ear in the Final Mix", and no step did): no later
step reads your doubts again. Check it now with what you have (a cut or a music stop against the voice: transcript.json's word times
against the music's data-mw-stop or the cut's second; voice_check for the levels), fix it in this round (the music_stop tool moves a stop
into the nearest pause by itself), or name it in the review as unchecked, with its seconds, for the owner. Never "I will check it later",
"listen again in the Final Mix" or "the next step will".

Write every round to `QC-REVIEW.md`: round · the seven scores · the three worst problems (seconds) · what you changed. End the file with
one line `Final score: N/10`, N the lowest of the last seven scores (the app reads it: 8 or more passes the step). Write the same rounds
to `QC-REVIEW.json` for the app's score card, every round kept:
`{"final": N, "rounds": [{"round": 1, "scores": {"hook": 7, "phone": 8, "motion": 7, "variety": 8, "composition": 8, "brand": 9, "sync": 7},
"worst": [{"at": 3.2, "text": "…"}], "changed": "…"}]}` (`at` in seconds, the seven keys in this order: hook, phone, motion, variety,
composition, brand, sync). The app shows the scores as a card, so your reply ends with one short line (the final score and what you
fixed), not a table.

## 5. Fresh eyes

With the first round, qc_sheets hands the beats and cuts sheets to a second, read-only look that knows nothing else about the film and
adds its answer: one sentence on what the film tells and the 3 worst problems it sees. If its sentence is not the film's promise, the story does
not read yet: fix that first. Its 3 problems join your first round.
