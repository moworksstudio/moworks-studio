# The Stickman Explainer look

## The user's notes (outrank everything below; added by the `style-note` skill)
| Date | The user said | The rule it became |
|---|---|---|
| | | |

## The look in one line
Clean, cinematic and fast: flat vector figures on simple sets, one light idea per location, a cut on every sentence,
numbers that land exactly as spoken, and a gold title card. Every number below is exact; use them as given.

## Frame
- **Size:** 1920×1080 at **24 fps**, with a **2:1 letterbox**. Black bars of 62 px top and bottom leave a
  1920×956 picture (`BAR` in the kit).
- **Finish:** on every shot, `finish(x, frame, 0.55, 0.035)`. That's a soft vignette, fine moving grain and no other
  texture.
- **Depth of field:** the background layer is blurred 7–10 px (`layer({ blur })`). Foreground subjects stay sharp.

## Palette (`C` in the kit)
| Role | Hex |
|---|---|
| figure body, heads | `#0a080c` |
| crowd | `#2f293a` (dusky plum, faceless) |
| default hero hoodie | `#2f6fe0` (darker `#2459bd`, shade `#1f4ea6`) |
| the example hero's hoodie (`outfit`) | `#d23b45` (dark `#a52733`, shade `#86202b`, strings `#f7e6e6`) |
| warm rim light · cool rim light | `#f2b878` / `#ffd9a6` · `#e8eef8` |
| eyes, mouths | `#f4ecd8` |
| data void | `#121828` centre → `#05080d` edges (`voidBg`) |
| numbers, gold UI | `#f4b748` / `#ffd88a`, glow `#ff9a3c` |
| ruler · labels | `#dfd0a1` · `#f9edd4` |
| desk wood | `#8c6945` → `#5a432d` |
| label pills | background `#0d1118` at 72 %, text `#f6efe2`, an accent bar per meaning (teal `#2f9c94`, red, gold) |

**One light idea per location:** a warm desk lamp, a cool fluorescent garage, a dawn window, a sunny kitchen, or a
navy void with a single pool of light. Use colour for meaning, not decoration.

## Type
- **Open Sans ExtraBold (800)** for everything on screen: phone UI, signs (italic for "LEVEL −3"-style signage),
  pills, numbers, titles.
- **Small caps labels:** weight 700 with +0.04–0.09 em tracking.
- **The title card** is two lines:
  - "WHAT IF YOU COULD" in cream (`#fdf2e3`), 84 px, tracked +0.085, with a warm glow.
  - The payoff word below it, about 230 px: gold gradient (`#ffe3a1` → `#f3b552`), a dark brown outline (`#3e2410`,
    8 px) and an orange bloom. Its letters rise in one by one and then hover.
- A message typed on screen at the end (a hook) can use a typewriter face.

## Characters (`figure()`)
- **Proportions:** round heads (r = 64 on a 650-tall figure) and thick rounded limbs. **No hand or foot shapes**:
  limbs end in round caps. The exception is sneakers on the hero, if `shoes` is set.
- **The hero:** a black body in a hoodie (sleeves, hood, pocket, drawstrings).
  - **Eyes:** `dot`, `wide`, `smug` (a flat-topped knowing look), `happy` ∩∩, `closed`.
  - **Mouths:** `smile`, `smirk`, `grin`, `flat`, `o`, `chatter`.
  - **Brows:** optional (`brows: true` or `"worried"`).
  - **A new look per video** comes from `outfit` (colours), `build: "muscular"` (broad shoulders with deltoid caps, a
    V taper, fuller arms, a slightly smaller head), `hair: "quiff" | "bun"` and `shoes`.
- **Side characters** (coworker, family): the same rig, a different hoodie colour and hair. One or two lines each.
- **The crowd:** plum and faceless, always with a one-sided rim light, often holding glowing phones.
- **Rim light** (`rim`): the silhouette grown and shifted toward the light, drawn first. Warm indoors, cool in
  fluorescent light or the sky.
- **Turning:** a turned figure (`face.look` → ±1) narrows its shoulders and pushes the hood back.
- **Motion is code:**
  - `walk(phase)` cycles
  - `armIK(dx, dy)` puts a hand exactly where it needs to be (a mug to the mouth)
  - `wob()` adds idle sway
  - `rot` turns the body about the hips (90 = flying head-first)
  - `flutter` flaps cloth in the wind
- **Close-ups of the hero's hands** are **robot hands** (`robotHand`, `holdHand`): plum-black capsule segments with
  a purple edge, a warm inner glow and one highlight stroke each, plus a silver `watch`.

## Camera and editing
- **Cut on every spoken sentence.** Shots run about 1–2.5 s in the cold open; one line, one picture.
- **Camera moves** are slow pushes (1–3 % per shot) and gentle pans that follow a walk.
- **One big move per act**, keyed with `track()`. Zooms interpolate in log scale. Choose from:
  - **snap zoom-out:** from a close-up, done in about 0.42 s and fastest in the middle
  - **pull-back:** from a field of people out to a bell curve
  - **whip-pan / whip-up:** along an axis with speed streaks, decelerating onto the subject in a pool of light (the
    altitude climb in the example)
- **Transitions** are hard cuts. Save the dips to black or navy for the title card. Data scenes may crossfade.
- **Label pills** pop in with a small spring (scale 0.85 → 1) on the word they echo, and land on a **marimba tag**
  (`tag-d` / `tag-fs` / `tag-a`), never a cartoon pop.

## Data scenes
- **People bell:** the population is drawn as columns of person icons whose heights follow a normal curve. A glowing
  cream curve then draws over them left to right, in about 1 s, linear.
- **Labels:** value labels pop above the curve, and a ruler snaps where the scale ends.
- **Numbers** drop in digit by digit, in screen space, while the camera zooms toward the subject.
- **Altitude / distance rulers:** a vertical ruler with labelled stages (2.45 m → 4 km → 11 km). The camera
  whips between stages with streaks.
- **Maps:** a flat city grid. The slow route draws as a dashed line, the fast route as a bright arc, with pins and
  a timer.

## Don't
- No outlines on figures, no gradients on bodies, no busy textures, no stock photos.
- No numbers on screen that differ from the narration. No unsourced statistics.
- No whooshes unless the user asks (the whip-ups use streaks and wind instead).
