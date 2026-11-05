---
name: explainer-shorts
description: Make a narrated 30–60 s vertical (9:16, 1080×1920, 60 fps) 2D explainer short for YouTube Shorts, Reels or TikTok in the kit's house look — hook first in the second person, one mechanism through one everyday image, one dial of three stops, a gentle button that calls back to the hook, then the title — with text kept inside the platform safe zones and every scene composed for portrait, built with the explainer-video loop. Use when the user asks for "a short", "a 9:16 explainer", "a vertical video", "a Reel", "a TikTok", "a 45-second short about…", "make this for Shorts", or approves a short from an idea list. 16:9 films go to explainer-video (under 2 min) or explainer-longform (2–12 min).
---

# Make a 9:16 explainer short

**Module check.** If `kit.config.json → modules.shorts` is `false`, tell the user in one line that the Shorts module is
switched off and offer to switch it on (kit-setup → "Modules"). Don't build with this skill until they say yes.

**Step 0, always:** the tool check (`node tools/doctor.mjs` must say ready).

## Read first, every time
- `STYLE.md` (its **Author notes** outrank everything, this skill included), especially §6 "9:16 safe zones".
- `SCRIPTING.md` → "Structure: a short" and the words-per-second table.
- `.claude/skills/explainer-video/SKILL.md` and its `references/`: the loop, the storyboard, `story.js`, the checklist.
- The worked example `examples/where-the-needle-stops/`: its 103-word script is already shorts length; it's built in
  16:9, so read it for the beats and the cue tables, and use the layout table below for the shapes.

Precedence: Author notes → this skill (the 9:16 parts) → explainer-video (everything shared).

## The loop
Run explainer-video's loop with these changes:
1. **Brief:** the length (30–60 s; default 45 s) and the voice. A topic only → `script-writer` ideas first.
2. **Scaffold:** `node tools/new-video.mjs <slug> --format tall --title "<Title>" --seconds <length>` (1080×1920,
   `data-resolution="portrait"`).
3. **Script:** the short structure in SCRIPTING.md. **Hook first:** the first sentence is something about to happen to
   "you", and **frame 0 already shows it** (the hero or the object, close). Show it with the beat table and the fact
   sheet; wait for "approve".
4. **Voice, length, storyboard** as in the core loop. If the voice runs past 60 s, cut words and record again; never
   speed it up.
5. **Art:** every module brief says `aspect: "tall"` and asks for portrait compositions: one subject per frame, the
   camera tighter, the subject in the upper two thirds or centre, never under the bottom UI band.
6. **Snapshots:** check every label and the title against the safe zone on full-size frames.
7. **Sound, render, QC, review, deliver** exactly as the core loop.

## 9:16 numbers
| Item | Value |
|---|---|
| Canvas | 1080×1920, 60 fps, `data-resolution="portrait"` |
| Length | 30–60 s; the voice decides |
| Words | 30 s ≈ 62–71 · 40 s ≈ 88–101 · 50 s ≈ 114–131 · 60 s ≈ 140–161 (SCRIPTING.md maths) |
| Text safe zone | **x 60–960, y 250–1450.** Keep the right ~120 px clear (buttons), the top ~13 % and the bottom ~25 % clear (platform UI) |
| Title | uppercase, cap height 87 px, centred at y ≈ 500–700, after the last word |
| Hook | frame 0 shows the subject; the first sentence is the hook |
| Pace | a new element every 1.5–3 s; one subject per frame |
| Ending | the button, a 0.6 s beat, the title, a 0.6 s fade to black |

## Layout: 16:9 → 9:16
| Thing | 16:9 | 9:16 |
|---|---|---|
| Comparison row (fat · muscle · vein) | three pills side by side | a vertical stack inside the safe zone |
| Subjects in a frame | one or two | one; split a two-subject shot into two shots |
| Camera | medium and wide shots | tighter; medium and close shots |
| Hero placement (the demos) | (1300, 1000), height 520 | (540, 1500), height 760 |
| Callouts | anchored to the subject, pill beside it | anchored to the subject; the pill moved inside x 60–960 |
| Not-to-scale tag | top-right, insets 46/41 px | top-right of the safe zone (x ≤ 960, y ≥ 250): `HOUSE.ui.notToScale` puts it there by itself; `HOUSE.ui.safe()` gives the zone |
| Scene modules | `aspect: "wide"` | `aspect: "tall"`: recomposed, not cropped |

**Never** render 16:9 and crop the centre: it keeps 1080 of 1920 px of width and cuts off the edge labels.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Open on a title card or an empty frame | Frame 0 shows the hook's subject; the title comes at the end |
| Put a label in the bottom quarter or by the right edge | Keep text inside x 60–960, y 250–1450 |
| Squeeze a 16:9 row of three pills into the width | Stack them vertically |
| Crop a 16:9 render to 9:16 | Build the film tall from the start; modules take `aspect` |
| Speed the voice up to fit 60 s | Cut words and record again |
| End with "follow for more" or a recap | End on the gentle button, then the title |
