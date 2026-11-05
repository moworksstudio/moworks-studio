# The look: what a good 3D cartoon frame is

The taste rules of this kit. They win over everything else, except the user's own notes right below, which outrank
them. Every number here is exact: use it as given. The live reference is the two worked examples
(`src/examples/what-if-no-pain/`, `src/examples/cheese-bank-vault/`).

## The user's notes (newest first; these outrank everything below; the style-note skill adds rows)
| Date | What the user said | The rule it became |
|---|---|---|
| | *(none yet)* | |

## The look in one paragraph
A bright, friendly **3D cartoon that reads like a drawing**. The cast is **flat-drawn**: unlit colour fills, big round
heads with faces painted on, ink-stick arms and legs, a soft blob shadow. The sets are simple shapes (boxes,
cylinders, spheres) with **toon shading** in a few soft bands, a fresnel rim light and painted canvas textures. A
**thick ink outline** traces every silhouette and crease. Glowing things (screens, lamps, buttons) **bloom**. A
**cinematic depth of field** melts the background in close-ups. A **grade** gives warm highlights, cool shadows and a
vignette. Text lives **in the world** (whiteboards, signs, screens), and one word-by-word **caption** carries the
voice. The camera moves like a real one: slow, eased, physical.

## The author's review notes (the reasons behind the rules)
| What the reviewer said | The rule it became |
|---|---|
| The characters looked "more 3D" and less good than flat 2D cartoon characters | The flat-drawn cast: unlit fills, ink-stick limbs, drawn faces, no ambient occlusion on characters (STAGING §1) |
| Work cards went "through the table"; "run checks for any abnormality" | The collision QA on every video: `COLLISION none` before every export; walks follow routes around furniture |
| A stray extra word at the end of a generated voice | `vo-words.mjs` compares the voice with the script and suggests a trim; build only on `ISSUES none` |
| "Match the voice-over to the subtitles" | Captions come from measured word times, one word at a time |
| "The character is holding the scorching part" | Held props are gripped from the OUTSIDE at a handle or edge (STAGING §4) |
| "Have another agent look at the frames, for every finished video" | The render review by a fresh-eyes agent before delivery (render-review skill) |
| "Why is this taking so long? Re-render only those frames" | The fast fix loop: patch-render the changed shots, re-review only those |
| Scripts | Always one continuous paragraph |
| Exact frame copies of a reference | Declined: a reference teaches patterns only; every character, story and frame is original |

## 1 · Frame
| | 9:16 short | 16:9 long-form |
|---|---|---|
| Size | 1080×1920 | 1920×1080 |
| Frame rate | 30 fps | 30 fps |
| Supersampling | 2× (rendered at 2× and scaled down: clean outlines) | same |
| Caption top | y ≈ 1300 | y ≈ 820 (keep faces and key props out of y > 760 while captions run) |
| Field of view | `fov` is VERTICAL: vfov 40 is 23° wide in 9:16 | the same vfov is 3.16× wider in 16:9 (STAGING §6) |

## 2 · Palette
**The cast** (`CAST` in `src/kit/character.ts`):

| Character | Top | Skin | Hair | Style |
|---|---|---|---|---|
| Mika (the default on-screen "you") | `#2bb3a3` teal | `#f2cfb5` | `#3b2a24` | side-swept tuft, hoodie |
| Ravi | `#f2b632` mustard | `#c98e6a` | `#1d1d24` | round glasses, v-neck |
| June | `#ff7a6b` coral | `#f6dcc8` | `#2b2b38` | bun, cardigan |
| Otto | `#9b8cf2` lilac | `#e2b08a` | `#3fae6a` (green beanie) | beanie, crew neck |

Ink: `INK = "#0e1120"` (cast lines and the outline colour), `PAL.ink = "#141827"` (texture ink).

**The sets** (`PAL` in `src/kit/lib.ts`): carpet `#2346d6` · wall `#f6f8fb` · wall stripe `#5fc4b8` · ceiling
`#fbfcfe` · desk top `#dfe6f2` · desk side `#aebbd3` · chair `#5d6f9a` / dark `#3d4a6e` · cabinet `#f07a3c` · wood
`#c98a52` / dark `#9c6236` · meeting wall `#93d29d` · steel `#c9d0db` · charcoal `#373c48` · screen bezel `#262a35` ·
glass `#bfe3ff`. New sets keep this logic: light walls, one saturated floor, a few saturated accents, no greys that
read as dirt.

## 3 · The cast, drawn flat
- **Proportions:** head r 0.30 m with a painted face cap; torso capsule r 0.21 × 0.30; arms 0.24 + 0.24 m; thigh
  0.30, shin to shoe 0.37. Ink-stick limbs r 0.017. Heads are 0.6 m wide.
- **Fills** are unlit (`MeshBasicMaterial`); the engine masks ambient occlusion off the characters; a soft blob shadow
  sits under each one.
- **Faces** (`setExpr`): `neutral` · `calm` (heavy lids) · `blink` · `smile` · `eager` · `wince` (squeezed `> <`,
  gritted teeth) · `alarmed` (white-ringed eyes, open "o") · `talk` (open mouth). Pick the face the line needs.
- **Costume:** swap the torso texture (`torsoDetailTex(color, style)`: hoodie, vneck, cardigan, crew) or the whole
  torso material; add props to `parts.torso` / `parts.head` (a stethoscope, a headband).

## 4 · Sets and light
- Toon materials (`toon()`) use a 5-step light ramp (178/196/216/238/255), so turned-away faces fall to about 55 % in
  soft bands. A shared rim light (fresnel) is set per shot by the look.
- **Glow:** lamps, screens and buttons are emissive (colour × 2–5) so the bloom catches them. **White signs and
  props** use unlit `flat()` / `fill()` (≤ 1.0, under the bloom threshold), or they blow out.
- **Windows** have a day and a dawn view (`setSky`); looks switch them.
- Everything is drawn in code: canvas textures for floors, screens, signs, calendars, whiteboards, faces. No image
  files, no 3D model files.

## 5 · Looks (one per shot; never mix two inside a shot)
| Look | Use for | hemi | key | outline | bloom str/rad/thr | blur coc/max | grade vig/sat/con/warm/lift |
|---|---|---|---|---|---|---|---|
| `propGlow` | a glowing thing in close-up (screen, lamp, button) | 1.0 | 1.7 `#ffc890` | 7 | 0.85/0.5/1.2 | 18/26 | .45/1.3/1.12/.8/0 |
| `characterClose` | a face, chest-up | 1.0 | 1.3 `#ffd2a0` | 7 | 0.6/0.55/1.2 | 22/28 | .42/1.25/1.1/.8/0 |
| `wideBright` | establishing, walking, groups | 2.8 | 1.9 `#fff6e8` | 5.5 | 0.22/0.4/1.3 | 6/10 | .16/.9/1.0/.3/.05 |
| `roomHigh` | a room from a high corner | 2.9 | 1.7 | 5.5 | 0.22/0.4/1.6 | 7/12 | .2/.95/.88/.25/.04 |
| `objectClose` | one object filling the frame | 2.5 | 1.4 | 4.5 | 0.25/0.5/1.3 | 22/26 | .28/1.3/.78/.3/.05 |
| `screenClose` | UI / a screen in a bright room | 2.2 | 1.6 `#fff3df` | 5 | 0.3/0.5/1.3 | 16/22 | .25/1.1/1.0/.3/.02 |

- **The cool variant** for the "consequences" half of a story: the same look with grade `warm −0.7, saturation 1.1`
  (see `cool()` in `src/examples/what-if-no-pain/shots.ts`). The warm-to-cool turn tells the viewer the mood changed.
- Outline and blur values are in OUTPUT pixels. A 16:9 wide makes characters smaller on screen: keep the outline ≥ 4 px
  and scale the blur (STAGING §6).

## 6 · Type
- **Captions** (`ToonCaptions`): one word at a time, scaling in from 0.86 to 1.0 over 4 frames; Outfit 800, white;
  92 px (9:16) / 84 px (16:9); ink stroke `#0d0f17` at size ÷ 5.75 painted under the fill; shadow `0 6px 0
  rgba(0,0,0,0.35)`; letter-spacing −1.
- **In-world text** carries titles, numbers and labels: Outfit 800 for UI and signs, Patrick Hand for handwriting
  (sticky notes), Caveat Brush for marker (whiteboards). All three are OFL fonts loaded from Google Fonts.
- A title question is written **in the set** (a whiteboard, a sign, a screen), not floated over the picture.
- Numbers on screen are exactly as spoken.

## 7 · Camera and motion
- **Moves:** a dolly, a truck (sideways along a row: the 16:9 signature), a slight crane (0.1–0.3 m), a slow push;
  each shot eases A→B (`easeInOut`). A tracking camera (`cam(T, t)`) follows action that would leave the frame.
- **fov** about 30–43 for most shots (STAGING has the per-shot starting values).
- **Cuts:** hard cuts between shots, each shot starting about 0.07 s before its phrase. No whip pans, crash zooms or
  shake unless the user asks for them.
- **Acting:** springs and eased moves for anything that lands; walks follow routes; reactions are small and on the
  word. Nothing static for longer than the format allows (3 s in shorts, 4 s in 30–50 s pieces).
- **Frame 0 is never empty**, and the last ≥ 0.5 s is a finished still.

## 8 · Never → do instead
| Never | Do instead |
|---|---|
| A real person's likeness, a celebrity, a brand logo, another creator's character | The cast or a new original (character-builder skill); a generic label on props ("COFFEE", "BANCA") |
| Lit, shaded, ambient-occluded characters | The flat-drawn cast (the default `flatCast`) |
| A hand inside the prop it holds | A world-space prop gripped at `userData.grip` with `poseReach` (STAGING §4) |
| A face turned away when the line is about that person | Cheat the body three-quarter to the lens (≤ 50° off) |
| A bright white sign that blows out | `flat()` / `fill()` unlit materials |
| Text floating over the picture as a title card | Text in the world; the caption carries the voice |
| A whip pan, crash zoom or shake | A dolly, truck, crane or slow push |
| Two looks mixed in one shot | One look per shot; change the look on a cut |
