# The house look: what a good explainer frame is

The taste rules of this kit. Every number here is exact: use it as given. They win over everything else in the kit,
except the **Author notes** right below, which outrank them. The worked example `examples/where-the-needle-stops/`
shows every rule in working code.

## Author notes (the user's notes; newest first; these outrank everything below)
The `style-note` skill adds a row here when the user says "save that", "always…", "never…", or praises a choice. A note
that changes a rule also rewrites that rule further down, marked "(user, <date>)".

| Date | What the user said | The rule it became (where) |
|---|---|---|
| | *(none yet)* | |

## The look in one paragraph
Narrated 2D science explainers drawn entirely in code on one canvas. **Flat cel-shaded shapes with no outlines**: a lit
fill, one hard-edged shadow hue-shifted toward magenta, a thin rim light. **Deep indigo and violet grounds** with soft
light pools and a one-sided horizon glow, never black or grey. **Glow only on things that emit light.** A warm subject
(the red-hoodie hero, a heart, a lamp) carries the frame, and each film adds **one cool glowing accent** for the thing
the film is about. Detail at three scales, ambient life in every shot, springy pops, hard cuts on the word, near-square
coloured label pills with white Figtree type, and an uppercase title that pops in word by word at the end.

## Why the house rules are what they are
What was asked while the kit was being made, and the rule each request became. Read the reason before bending a rule.

| What was asked | The rule it became |
|---|---|
| "Make the colours more saturated, more beautiful … really nice frames … add more details" | Push saturation and detail at three scales (§3). Rich indigo grounds, glowing accents, never flat or grey |
| "More vibrant … more on smooth animations" | 60 fps; ambient life in every shot; springs and eases, never linear pops (§5) |
| A main character "wearing a red hoodie" | The red-hoodie hero is the house character (§2) |
| "Keep the sound effects and the background music … compose them" | Music and effects are composed and synthesized in Python for this kit; never another video's audio |
| "Tell me what I exactly told you … I say approve, go forward" | Restate every big brief and wait for "approve" |
| "Use the same script … you don't need to make anything clearer" | Never paraphrase a script the user gave or approved. Keep it word for word |
| A delivered film said a phrase twice ("hill and hill") | Edit the voice only inside measured silences, then transcribe the final MP4 and diff it against the script. A transcript of the take isn't enough: speech recognition hides repeats |
| "Make the script more continuous" | Continuous, flowing narration even in 40 s pieces (`SCRIPTING.md`) |
| "Make it a general prompt that a normal human being is going to provide" | Anything handed to viewers or buyers is plain language, about 150–200 words, with no specs |
| "Just make the video with no sound effects and no narrator" | Sound is a switch. Respect silent requests |
| "How much time does it take to make a 4-second animation?" | Build in one pass, then one or two snapshot rounds. Keep research and spec phases short |
| "Add proper sound effects … by means of using Python" | Effects are synthesized in Python (numpy/scipy), seeded, with no samples |
| "Use as many agents as you want" | Big films use parallel agents: one per art module plus one for sound, each with its own test page. The lead writes `story.js` |
| Picked topics from a short list, with one marked as the pick | Offer about 5 topics with a recommendation |
| Wanted finished, rendered MP4s, not plans | Deliver the MP4 plus a contact sheet; say what was checked and what wasn't |

## 1 · Palette (`HOUSE.pal`, `HOUSE.light`)
The code is `engine/house-pal.js`. This table mirrors it; if they ever differ, the file is what renders, so fix the
table.

| Role | Values |
|---|---|
| Night sky, top → horizon | `#0a0230` `#14064a` `#1d0a5e` `#2a0d72`; sky pool `rgba(70,40,190,0.35)` |
| One-sided horizon glow, outer → core (left by default) | `#3a0b78` `#6f0d86` `#b3168f` `#ff3d8b` `#ff8a5c`; ridge line `#ff6fa5` |
| Hills, far → near | far `#36157e` (ridge `#c43c9c`), mid `#231066` (rim `#4a2ab0`), near `#190854` (rim `#7d5cf0`), fore `#0d0334`, props `#2c0f6e`, far trees `#2a2a78` |
| Lit windows | `#ffd23f` `#ffe58a` (soft halo) |
| Storm cloud | bottom `#170752`, mid `#272a86`, top `#3b46a8`, warm rim `#ffb79c` / hot `#ffe2c8`, cool rim `#6f7dff`, back `#1f0d5c`, inner glow `#b9a6ff` |
| Rain | far `#6248c0`, near `#9a86f0`, cyan accent `#4fd2ff` |
| Stars and sparkles | `#8c78e0` `#c9b8ff` `#f3ecff`, cyan `#7fe9ff`, pink `#ff7ad9` |
| Electric bolt | core `#ffffff`, rim `#c4b0ff`, glow `#7d63d8`, leader `#e2d6ff`, flash `#f6f3ff` |
| Diagrams and cards | grid background `#1e0452`, grid line `#221a66`, card `#000616`, bracket `#2f3166`, text `#ffffff`, not-to-scale tag `#9a78cc` |
| **Pills** (near-square, radius 2–3 px) | crimson `#c8005a`, magenta `#b0009f`, orange `#ef7f12`, cyan `#1fa6e0`, purple `#3a1490`, green `#1ea85a` |
| Nature and body extras | sun `#fff6c8` `#ffd84a` `#f5b70d` `#e98a1c`, sun glow `#ffd25e`; ocean `#2f86d0` / night `#0d1660`; land `#2fb36f` / warm `#e0b84a`; atmosphere `#9bd2ff`; city light `#ffc86a`; heart `#e8304a` / `#b01e44`; brain `#ff7fb8` / `#d9579a` |
| Light rig `HOUSE.light` | key from the upper left `[-0.6, -0.8]` (cool moonlight), rim `#ff5fa0` (the horizon side), cool top `#8f9dff` |

### One cool hero accent per film
Each film adds **at most one** cool glowing accent against the warm subject, in its own `story/film-pal.js`. It is the
colour of the thing the film is about, so the eye finds it in every shot. The worked example's film palette (its file
is `story/inj-pal.js`):
- the accent, medicine aqua `#3ff2e0`, glow `#9ffff2`, deep `#13b8b0`;
- indoors it reuses the night palette: clinic walls `#1a0a52` `#24106a` `#2e1580`, warm lamp `#ffb36b`;
- tissue: fat `#ffcf5a`, muscle `#d8325a`, vein `#4f6bff`, blood cells `#ff4a5e`;
- stomach `#ff7fa8`, acid `#b6f04a`, enzymes `#c04dff`, insulin `#ffd23f`; glove `#4f8cff`.

A colour the house palette lacks goes into `film-pal.js` (or a local constant at the top of a module, reported to the
lead). Never edit `engine/house-pal.js` for one film.

## 2 · The house hero (`HOUSE.hero`)
A young person in a red hoodie, drawn in code (`engine/house-hero.js`). Use it as the on-screen "you" when the script
speaks to the viewer. It's optional: diagram-only films don't need it.

| Part | Colours |
|---|---|
| Hoodie | `#e8323e`, shade `#b51f3e` (hue-shifted to magenta), deep `#86123a`, light `#ff6b5e`, strings `#f7ecf4` |
| Jeans | `#2f4fb3` / `#223b8e` |
| Shoes | `#f2eefc` / `#b9b0dc`, soles `#1a1240` |
| Skin | `#d8916f` / `#b96a5a` / `#9d5250` |
| Hair | `#2a1432`, sheen `#5c3a8e` |
| Face | eye `#170818`, mouth `#7e2c3a` |

It has front, back and profile views, expressions (looking, worried, mouth shapes, head up and turned), a rim light,
four levels of detail, and anchors (hand, head, shoulder…) for labels and props. The exact options are in
`engine/CONTRACT.md`. Ambient life never stops: it breathes at 0.25 Hz (about 0.6 % scale), blinks on a seeded
schedule every 2.5–5 s (each blink 0.12 s), and its hair and drawstrings sway.

Never draw a real person's likeness, a brand logo or another creator's character. A new recurring character is
designed from scratch, with its own silhouette and palette.

## 3 · Drawing rules (every art module)
1. **Flat cel shapes, no outlines.** Every form has a lit fill and one hard-edged shadow, hue-shifted toward magenta.
   Add an optional deep-fold tone and a thin rim light. Soft gradients only inside big shapes.
2. **Dark glowing grounds.** Deep indigo or violet, never black or grey, with soft light pools. Diagram scenes sit on
   the dark grid background (`#1e0452`) with gentle light pools.
3. **Glow only on emitters** (lamps, screens, medicine, sparks, windows), drawn as additive halos.
4. **Detail at three scales.** Big readable shapes first; then medium detail (lobes, fibres, branches, folds); then
   small detail (speculars, bubbles, sparkles, nuclei, drifting particles). Detail never competes with the subject.
5. **Ambient life never stops.** Noise wobble of about ±2 %, the hero's breathing and blinks, swaying hair and strings,
   drifting particles, breathing light pools. Slow and organic. A frame that doesn't change between two snapshots
   0.5 s apart is a bug.
6. **No film grain, no global vignette, no grade filter, no AI images, no image files.** A 3–4 % static dither is
   allowed only to stop banding in a large gradient.
7. **No text drawn by art modules.** Every label, number and title comes from `story.js` through `HOUSE.ui`, so the
   words stay keyed to the voice and the type stays consistent.
8. **Depth from value steps**, not from detail: each layer a step darker or lighter than its neighbour, separated by a
   thin rim.

## 4 · Type and labels (`HOUSE.ui`)
Sizes below are for the 1080 px short side and scale with `EX.U` (= min(W, H) / 1080, so 1 in both formats).

| Element | Rule |
|---|---|
| Font | **Figtree 600/700** only, from the video's `ex/fonts/`. If text renders in another font, the font files are missing (kit-setup → Troubleshooting) |
| Pill | near-square, radius 2–3 px, house pill colours, white Figtree 600; `size: 1` is about 68 px tall. Short text, 1–3 words, as spoken ("ten drops", "minutes") |
| Pill entrance | pops in with `back.out(1.7)` over **0.5 s** from its origin (centre, left, right, top or bottom) |
| Pill exit | scales to 0 in **0.125 s**, power-in (exponent 2.3) |
| Callout | a 6 px anchor dot, then a **4 px** white leader drawn diagonally to an elbow and a 44 px horizontal run to the pill. The dot pops at t0, the line draws in **0.1 s**, the pill starts **0.067 s** later |
| Callout exit | **0.21 s**: the pill shrinks, the line reels back, the dot pops. Fire it at least 0.21 s before a cut |
| Title | uppercase Figtree 700, cap height **8.1 % of the short side** (87 px). Words pop one at a time **0.2 s** apart, each `back.out(1.7)` over 0.5 s from its own centre. Soft glow and a faint drop shadow. Starts about **0.6 s** after the last spoken word |
| Title position | 16:9: block centred at y 202 (caps span 95–310). 9:16: y ≈ 500–700 |
| Not-to-scale tag | top-right, insets 46/41 px, `#9a78cc`. Use it whenever sizes are cheated so a scene reads |
| Numbers | exactly as spoken ("ten drops", "about a minute"), and only if the fact sheet has a source for them. Counters count up; they never cut to the final value |
| Punctuation | no full stops on screen |
| Timing | a label never starts in the last 0.3 s of a shot. Labels sit where things are (or were), never on a path something is about to travel |

## 5 · Motion
| Thing | Rule |
|---|---|
| Frame rate | **60 fps**, always (the user prefers it; 30 fps only if they ask) |
| Pops | `EX.spring(dt, damping 0.42–0.5, freq 12–16)`; area-preserving `EX.squash(dt, amount 0.22, damping 0.42, freq 16)`; `back.out(1.7)` for UI |
| Exits | scale or clip out fast and accelerating (power-in), in 4–10 frames (0.07–0.17 s) |
| Camera, every shot | a slow drift: zoom eases `inOutCubic` between **1.00 and 1.06** over the shot; sway x `10·noise1(t·0.12)`, y `7·noise1(t·0.1)`; close-ups creep `1 + 0.01·u` (u = shot progress). The frame never freezes |
| Big scale moves | zooming through orders of magnitude interpolates zoom in log space, with a 0.25 %/s creep on holds |
| Cuts | **hard cuts 0.05 s before their word**. No dissolves, no wipes |
| Pace | **a new element every 1.5–3 s**. One idea per beat |
| Events | fire on the word. Sound transients land on the cue time; swells peak 0.1–0.35 s after the word starts |
| Fast things | blood cells, racing particles, anything crossing the frame in under a second: drawn as streaks so they read at 60 fps |
| Big beats | an impact or a reveal may use `EX.fx.flash` or the shockwave ring `EX.fx.ring`, a few times per film at most |
| The end | the last **0.6 s** fades to black |
| Frame budget | well under 60 ms per frame; static layers are cached in `init()` |

## 6 · Composition
- The subject sits on a third, with generous negative space around it. Most of the frame is deep cool dark; the subject
  is the only saturated warm mass, and the film's cool accent is the only cool glow.
- One idea per beat. Every sentence of the script is one shot (two at most).
- Labels anchor to the thing they name. A row of comparisons (fat · muscle · vein) builds up across shots and stays
  until the cut.
- Full-bleed scenes paint the whole canvas with margin, so the camera drift (zoom up to 1.08, pan ±40 px) never shows
  an edge.

### 9:16 (1080×1920) safe zones and layout
Shorts, Reels and TikTok put buttons and captions over the frame, so:
- **Text stays inside x 60–960 and y 250–1450.** Keep the right ~120 px clear (buttons) and the top ~13 % and bottom
  ~25 % clear (platform UI).
- The title sits at y ≈ 500–700.
- Horizontal rows become vertical stacks (three pills side by side in 16:9 become a column in 9:16).
- One subject per frame, and the camera sits tighter than in 16:9.
- Every art module takes an `aspect` option and composes its scenes for both shapes.

## 7 · Voice and sound character
- **Voice:** calm, warm, unhurried, clear. A close, dry read with no music or room under it. One voice for the whole
  film.
- **Sound:** small, warm and soft. Effects are pitched in the music's key and glued by one short reverb. The music is a
  soft pad bed with no drums, about 21 LU under the voice, that swells into the title and resolves on it. Master at
  −14 LUFS. Details: the `sound-design` skill.
