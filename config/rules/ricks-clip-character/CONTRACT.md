# Ricks Clip: what a character file is (the contract)

Owner 05/11/2026 (#1070, #1076; audit/102 §8c, §9). Ricks Clip's characters are flat bean-head cards in its 3D world, drawn by the kit's own
code: `toon.ts` (the Pen library, Mr omi, MIT) and `roman.js` (the owner's cast), with the app's cast layer `ricks-cast.js` on top. All three
share one module scope (the kit's `setup.sh` builds `toon.js` that way); a character file is appended after them, so it calls their functions
by name and imports nothing.

## 1. The file

`characters/<id>.js`, one call:

```js
defineCast({
  id: "<id>",                 // the file's name: lowercase letters, digits, dashes
  name: "<Name>",             // as the owner gave it
  about: "<Name>, ...",       // one sentence: who, and the features a child would remember
  heightM: 1.7,               // real height in metres to the top of the head (0.3-2.6)
  seed: 5,                    // the head's shape (headBlob): any integer, kept once chosen
  outfit: { ... },            // §2
  extra: { front(p, g, o) {}, back(p, g, o) {}, profile(p, g, o) {} },   // §3, optional
});
```

## 2. The outfit (roman.js's fields, every colour `#rrggbb`)

| Field | What |
|---|---|
| `tunic` | the body's garment (also the arms and, darkened, the legs) |
| `skin` | the skin; `SKIN` and `SKINS` (toon.ts) are the kit's |
| `cape` | a cape behind (over the back from behind) |
| `toga` | a sash across the chest |
| `dress` | a long dress over the legs |
| `apron` | an apron in front |
| `hair` | hair colour (no helmet) |
| `cap` | a cap colour |
| `beard`, `moustache`, `brows` | facial hair, the brows' colour |
| `stout` | a rounder build |
| `helmet` (`true` or `"old"`), `armor`, `spear`, `shield` | the legionary's gear |

The kit's own outfits are in `OUTFITS` (legion, old, toga, civA, civB, civC, workA, workB): start from one with `{ ...OUTFITS.civA, ... }`.

## 3. Its own parts (`extra`)

A hat, glasses, a bag, a tie, a tool: anything the outfit fields do not draw is drawn by the character's own `extra.<view>(p, g, o)`, after
the body, **in the kit's hand**: flat fills shaded with `shadedFill` / `gradFill`, the plum outline `inkRing(pts, g.ow, g.thick)` thicker away
from the light, `INK` for lines and dots, no gradients beyond the kit's, no text. `g` is the body's measures in the 600 x 1000 design space
(soles at y = 975): `cx`, `hc` (the head's centre), `H` (the head blob: `H.a`, `H.b`), `W`, `HH`, `u` (1 % of the head's width), `chin`,
`torsoBot`, `hipY`, `light`, `thick`, `ow`; in the profile also `hx` (the head's centre x) and `lean`. `o` is the pose (§4).

- **front**: what faces the camera. **back**: the same part from behind; never eyes, a mouth or a nose. **profile**: facing screen right.
- A part on the head moves with the head only roughly (the body's tilt is small): keep head parts compact.

## 4. The pose layer (the film calls `castDraw(p, "<id>", opts)`)

| Option | Values |
|---|---|
| `view` | `front`, `back`, `profile` (a film mirrors the card to face left) |
| `expr` | every face of toon.ts and roman.js: `EXPRESSIONS` (neutral, stern, grin, laugh, whistle, nervous, shock, relief, relief_open, dazed, pained, smile, smile_closed, lick, snore, stubborn, squint) |
| `L`, `R` | the arm poses of roman.js: `ARM_POSES` (hang, spear, point, up, wave, hip, belly, temple, lift, reach, cheek, shield, cross, thumb); in the profile, `point` or `reach` pushes forward |
| `walk`, `phase` | walking, 0..1 along the step |
| `tilt`, `headTilt`, `bob`, `blink`, `look`, `light` | as romanFront |

The back and the profile are the app's layer; a character never redraws its body, only adds its own parts.

## 5. The rules

- **The kit's look:** bean head, plum outline, ink-dot hands, stick limbs, flat colours with one painted shade. Never a real person's
  likeness, a brand or a logo, another creator's character, or anything of the films the kit's look was measured from.
- **No text** on the character (`fillText`, fonts): the film writes its own words.
- **Deterministic:** no `Math.random`, no clock. Same options, same drawing.
- **The checks** (`node tools/rc-check.mjs characters/<id>.js`): one `defineCast`, its id the file's name, a name, an about, a height, every
  colour `#rrggbb`; each view drawn, the same every time, inside its card and standing on its ground (a spear may reach the top); the three
  views different; every face changing the front, none changing the back; every arm pose moving an arm; a walk.
