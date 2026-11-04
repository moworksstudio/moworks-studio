# The inner-voice look

## The user's notes (outrank everything below; added by the `style-note` skill)
| Date | The user said | The rule it became |
|---|---|---|
| | | |

## The look in one line
Quiet, dark and readable: few objects, thin lines, one warm-white character, and red only where the inner voice is.
Every number below is exact; use them as given.

## Frame
- **Size:** 1920×1080 with black letterbox bars of **96 px** top and bottom. The active picture is 1920×888, about
  2.16:1. Shoot at **30 fps**.
- **Floor:** a single thin grey line across the frame at **y ≈ 742**. Below it is the same near-black as the wall.
  There is no wall/floor colour change and no skirting.
- **Camera:** static. Scenes change by fading through black (0.4–0.8 s). Only a dramatic beat earns a close-up,
  such as the alarm clock filling the frame. No shake, no whip pans.
- **Finish:** a soft vignette (edges to about #040404) and a whisper of grain, just enough to stop banding in the dark
  gradients.

## Palette
| Role | Hex | Notes |
|---|---|---|
| Letterbox | `#000000` | |
| Wall, centre → edge | `#0e0e0f` → `#0a0a0b` → `#040404` | radial |
| Floor line | `#393939` | about 2.5 px |
| Set lines | `#64636b` (window, clock rim `#727272`), dim `#4f4b4d` | 3–5 px, round caps, slightly wobbly |
| Window glass / moon | `#12161f` / `#babac6` | a soft moon glow inside the glass |
| Moonlight shaft | `#9aa0b4` at 2–13 % | diagonal, down-left from the window to the floor, blurred edges |
| Character skin | `#d8d8cc` | flat, no outline against the dark |
| Back limbs (shade) | `#a6a398` | no outline |
| Front-limb edge | `#121212` | about 4 px ring where a limb crosses the body |
| Face ink | `#151411` | eyebags `#8f8b80` |
| Couch / armchair | fill `#29252f`, line `#5a5560` | |
| Blanket | fill `#282d3d`, line `#454b5d` | |
| Nightstand | fill `#221e1c`, line `#4e4848` | |
| Red (inner voice, digits) | text `#ec4836`, digits glow `#ff5a40` | |
| Shadow body / glow | `#030202` / rim `#963024` → hot `#ff5a40` | |
| Shadow eyes | `#fc7e74` | |
| White narration | `#e6e6e2` | |
| DAY label | `#a3a3a3` | bold |
| Phone screen / glow | `#9cc6fc` / `#4f7fd6` halo | a blue light on the face |
| Desk lamp | warm cone `#f2c27a` at about 22 % | |
| Muted colour objects | books `#787260` / `#606666` / `#5a2a2a`, desk `#5e4f3a`, punching bag `#ea3c2a` | colour is rare and desaturated, except the red |

## Type
- **Comic Sans MS** for every word: regular for captions, bold for the DAY label. On macOS and Windows it's a system
  font; **Comic Neue** (Google Fonts) is the loaded fallback. The kit's `HAND` stack does both.
- **White narration:** about 56–58 px, centred, short past-tense sentences. It fades in as a whole (about 0.6 s),
  holds and fades out.
- **Red inner voice:** about 56 px, lower case, ending with "." or "…". It **types on letter by letter** (about 20
  characters a second) and then fades. It sits by whoever "says" it: above a sleeper, over or beside the shadow. A
  shout can go big (about 120 px) once in a film.
- **DAY counter:** `DAY 1`, top-left at (152, 166) baseline, 42 px bold grey. It fades in with a new scene.

## The character (hero)
- **Shape:** one cream capsule ("bean") is head and body together: about **116 × 262 px**, round top, slightly
  flatter bottom. There is no neck and no clothes, except a red headband in the training scenes.
- **Limbs:** noodle limbs, about **38 px legs** and **32 px arms** with round caps. Feet are small ovals, hands are
  balls slightly wider than the arm. Legs are about 180 px long.
- **Depth:** back limbs are a shade darker (`#a6a398`) with no edge. Front limbs get a dark edge where they cross the
  body.
- **Face:** high on the capsule, made of simple ink marks.

  | Element | Options |
  |---|---|
  | Eyes | dots with a white glint, heavy half-lids with bags (tired, scrolling), closed curves (sleep), `> <` (wince) |
  | Brows | thick straight lines that tilt for worried, angry or sad |
  | Mouth | one short stroke; a small "o" (shock); a wavy line (unease); gritted teeth (effort) |

  A blue sweat drop marks panic. Turning the head is done by sliding the features sideways (`turn`).
- **Acting:** small and slow. A glance, a lid dropping, a slump of a few pixels. Big moves are rare and land on a
  beat: the strum, the wince.

## The shadow figure
- **Shape:** a pure black silhouette, taller than the hero, with a round head, a slab body and thick limbs.
- **Glow:** a **red glow hugging its outline**, a wide soft halo plus a tight hot rim. It breathes a little.
- **Eyes:** two glowing slits that are sly or menacing, and sometimes a thin red smile.
- **Placement:** it stands behind or beside the hero, leans in, sometimes lays a hand on them or on the thing they're
  trying to do.
- **Entrance:** it fades in (about 0.75 s) and never pops.
- **Voice:** it "speaks" only in red typed captions. It can also live inside a mirror or loom huge, such as a giant
  foot over the stairs.

## Sets and props
- **Bedroom:** a bed with a navy blanket, a nightstand with a red seven-segment alarm clock ("5:00", with `\\ //`
  shake marks when it rings), and the four-pane **moon window** top-right with a diagonal shaft of light.
- **Other rooms:** a couch or armchair, a desk with a lamp (a warm cone) and a stack of muted books, an analog wall
  clock (dark face, light hands), a fridge, a mirror.
- **Training:** a night city skyline with warm street lamps and a running road, stairs, a hill at sunset (the warm
  palette only arrives at the climax).
- **Drawing:** everything is drawn as **fills with a slightly lighter outline of the same hue**, in thin wobbly lines,
  with almost no texture.

## Light
- One idea per scene: the moon shaft, the phone's blue halo on the face, the lamp's warm cone, the red rim of the
  shadow. Everything else stays dark.
- Light is soft (blurred), never hard-edged. The kit's `softLight` renders it at quarter resolution with a blur,
  which is cheap and smooth.

## Motion and timing
- Fades through black between scenes (0.4–0.8 s). Captions fade (0.4–0.6 s); red words type on.
- Holds are long. A scene can be still for seconds, kept alive by breathing, a phone's flicker and a slow moon.
- **Time-skip gags:** clock digits or analog hands jumping or spinning (5:00 → 7:06 → 8:47), the moon moving, the
  character's lids getting heavier.

## Don't
- Don't use saturated colour outside the red. No gradients on the character, no outlines on the body, no busy
  backgrounds.
- No camera moves for energy, no whooshes, no pops.
- When the user gives a reference video, take its look, never its captions, exact poses or shot-for-shot staging.
