# A 3D Cartoon character: the contract

One file, `characters/<id>.ts`, that a 3D Cartoon film takes as it is (it goes to `src/videos/film/cast/<id>.ts` and the film's `world.ts` builds
it). It is made on the owner's 3D Cartoon source skill (`.moworks/library/cartoon-3d/skill/`, read-only: never edit it). Owner #1267, audit/111 B6.

## The file

```ts
import * as THREE from "three";
import { buildCharacter, type CharDef, type Character } from "cartoon-3d/kit/character";
import { fill, INK } from "cartoon-3d/kit/lib";          // any other file of the kit: "cartoon-3d/kit/<name>"

const DEF: CharDef = { name: "Lena", top: "#4f7fd8", skin: "#8d5a3b", hair: "#1f1a1c", style: "bun" };

export const CHARACTER = {
  id: "lena",                    // the file's name
  name: "Lena",
  about: "A night-shift baker who hums while the dough rises.",          // one line, 10-300 letters
  heightM: 1.64,                 // the person's real height in metres (the world's size is the source skill's)
  def: DEF,
  build: (): Character => {
    const c = buildCharacter(DEF);
    // a costume: the torso's material replaced by a canvas texture drawn like torsoDetailTex (a fill, ink detail lines, offset.x = 0.25)
    // accessories: flat fills (fill(color)) added to c.parts.torso / c.parts.head, each with userData.char = true
    return c;
  },
};
```

## Required (the checks: `node tools/c3-check.mjs characters/<id>.ts`)

| Rule | Why |
|---|---|
| Imports only `three` and `cartoon-3d/kit/…`; one export, `CHARACTER` | A film bundles it with the source skill's own code |
| `id` is the file's name; a `name`; an `about`; `heightM` | The library and the film read them |
| `def` is the source skill's `CharDef`: `top`, `skin`, `hair` as `#rrggbb`, `style` one of `tuft`, `glasses`, `bun`, `beanie` | `buildCharacter` draws only these |
| An original, not one of Mika, Ravi, June or Otto; a top colour none of them wears | STYLE.md and `character-builder`: contrast by colour, hair and role |
| `build()` returns the source skill's `Character` (made by `buildCharacter`), the same every time | Films pose it with `setPose`, `setExpr`, `poseReach`, `walkPose`, `legIK` |
| Every mesh `userData.char = true`; no lit or shaded material (no Standard, Physical, Phong, Lambert) | The cast is flat-drawn; the collision check sees only `userData.char` |
| Both hand spheres kept | Held props are gripped at `userData.grip` by them |
| Stands on the floor as the cast does; about the cast's size; nothing out past 1.6 m | It must fit the sets and the shots |
| Every face (`neutral`, `calm`, `blink`, `smile`, `eager`, `wince`, `alarmed`, `talk`) and pose (stand, sit, walk, a reach) works | A film uses all of them |
| No words on it (`fillText`), no random numbers, no clock, nothing loaded | Deterministic, never a brand |

The source skill's `buildCharacter` is not changed: a new hair style or headwear is the character's own accessory, built in `build()` from
the kit's shapes (caps, spheres, tori) in flat fills. Never a real person's likeness, a brand or another creator's character.

## The sheet

`node tools/c3-sheet.mjs characters/<id>.ts out/sheet.png` draws it with the source skill's own renderer: its views (front, three-quarter,
profile, back), its faces and its poses, one row each. Look at it with Read.
