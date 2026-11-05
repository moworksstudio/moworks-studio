# Staging: camera, framing, bodies and props

Each rule here fixed a real defect in a review. Check every shot against them on full-size stills.

## 1 · The cast reads as drawn
- Keep `flatCast` on (the default): unlit fills, ink-stick limbs, painted faces, no ambient occlusion on characters.
- One expression per beat, chosen for the line (`wince` on the hurt, `alarmed` on the surprise, `smile` on the win).
  Change it on the word.

## 2 · Faces read
- The subject of a line faces the lens within about **50°** (three-quarter). Cheat the body towards the camera rather
  than staging a profile or a back.
- Heads are 0.6 m wide: keep characters **≥ 0.7 m apart**, and stagger depth and height so no head hides a face the
  line is about.
- A face cut by the frame edge, or a face behind another character, is a defect unless the shot is about something
  else.

## 3 · Framing
- The subject of the line is visible and big enough on the word it's named.
- No foreground object or character blocks the action; the camera is never inside geometry.
- Action that would leave the frame gets a **tracking camera** (`cam(T, t)`) that keeps it in frame from the first
  frame.
- Set edges never show at the frame sides: dress side walls, ceilings and the far background, especially in 16:9 wides.
- **Captions:** keep faces and key props out of the caption band (9:16: around y 1300; 16:9: y > 760).
- Frame 0 already shows the scene; the last ≥ 0.5 s is a still.

## 4 · Held props and tools
- A held prop lives in **world space** with `userData.grip` at its handle or outer edge (a mug's handle loop, a pot's
  handle end, a phone's lower half, a syringe's plunger). `poseReach` puts the hand-sphere centre exactly there.
  Never parent a prop at the hand's origin: the hand ends up inside it.
- Hold things by the part a person would hold: a hot pot by its handle, a mug by its handle, never by the hot or wet
  part. If the joke is the wrong grip, make it read as intended.
- A tool touches what it acts on: the needle tip on the arm, the spout over the mug, the pen nib on the writing, the
  hammer on the wheel.
- Mark held props `userData.noCollide = true` so the collision QA doesn't count them as furniture.
- Continuity: a prop stays in the same hand across cuts, and doesn't appear or vanish without a reason.

## 5 · Clean geometry
- **No coplanar faces:** decals, strips and sign plates are separate boxes raised 1–2 cm; otherwise they flicker
  (z-fighting).
- **Thin rings** (glasses, a stethoscope) make scribbly outlines: mark them `userData.noGbuffer = true` (they're ink
  already).
- **Sprites** (stars, bolts, warnings) go on the overlay layer with `depthTest: false`, so geometry and outlines never
  cut them.
- **White signs and props** use unlit `flat()` / `fill()`, or they blow out under the bright looks.
- A railing or edge that passes behind a side-on character can read as going through them: remove or move it.
- Glass panes get `userData.noGbuffer = true` so the outline and the depth of field see what's behind them.

## 6 · 9:16 vs 16:9
| | 9:16 short | 16:9 long-form |
|---|---|---|
| Field of view | `fov` is vertical: vfov 40 is 23° wide | the same vfov is 66° wide (3.16×) |
| Starting vfov (confirm on stills) | 36–58 | `objectClose` 24–34 · a single chest-up `characterClose` (~2–2.6 m away) 22–30 · two-shot 32–40 · group `wideBright` 42–55 · `roomHigh` 48–58 |
| Staging | one subject, stacked vertically; close-ups dominate | side by side: "you" on one third, the reaction on the other; rows of 3–4 for group reactions; over-the-shoulder pairs for dialogue; look-room towards the open side |
| Shot mix | close-ups | more wides and two-shots; every new set opens on an establishing wide, then two-shot → close-up → insert |
| Signature move | push, slight orbit | the truck (sideways along a row) |
| Two people talking | — | keep the camera on one side of the line between them for the whole exchange (180° rule) |
| Porting a shot | — | keep the vfov and distance for the same subject size, then fill the new width (a second character, a reaction, set dressing); never leave bare floor at the sides |
| Outline | the looks' values | wides make characters small: stay ≥ 4 px and check that faces don't clog |
| Depth of field | the looks' values | a shot ported at the same vfov has subjects ≈ 0.56× as tall: start the blur at ≈ 0.56× the look's values |

## 7 · Gotchas that already cost a revision
- The torso texture on a `CapsuleGeometry` puts the front at u = 0.25: torso textures need `offset.x = 0.25` (the kit's
  `torsoDetailTex` handles it).
- Never mirror a face cap with `scale.x = -1`: it flips the face.
- Call `updateMatrixWorld(true)` before reading world positions; if a helper refreshes a matrix, read offsets BEFORE
  moving the object they belong to.
- The runtime applies the look's `sky` after your `applyShot`: override the sky in the returned look, or the windows
  flip between day and dusk.
- Painted skin-coloured shapes over eyes show square edges in close-ups: erase with `destination-out` instead (the
  kit's `calm` face does this).
- The collision QA skips hidden solids, so a table that exists for one shot only must be hidden in the others.
- Rendering several videos at once on one machine slows each one about 3×: render one at a time.
