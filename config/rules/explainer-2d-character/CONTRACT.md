# A 2D Explainer character: the contract

One file, `characters/<id>.js`, that a 2D Explainer film takes as it is (it goes to `characters/house/<id>.js`; the film draws it with the source
skill's own house hero, `HOUSE.hero.draw(ctx, …)`, in the character's palette). The source skill's STYLE.md §2: "A new recurring character is
designed from scratch, with its own silhouette and palette." The app's way gives it its **own palette** on the kit's house hero
(`.moworks/library/explainer-2d/`: `STYLE.md`, `CONTRACT.md`, `house-hero.js`, `house-pal.js`, read-only: never edit them); the silhouette is the
kit's one body (a new silhouette is code the kit does not have). Owner #1302.

## The file

```js
export const CHARACTER = {
  id: "mai-teal",                  // the file's name
  name: "Mai",
  about: "A curious girl in a teal hoodie and mustard trousers who asks how everything works.",          // one line, 10-300 letters
  heightM: 1.5,                    // the character's real height in metres
  engine: "explainer-2d",
  opts: {
    pal: {                         // the house hero's colour keys of HOUSE.pal (STYLE.md §2's table), #rrggbb; any of them
      hoodie: "#18a99a", hoodieShade: "#11807f", hoodieDeep: "#0b5a63", hoodieLight: "#4fe0c8", strings: "#fff3d6",
      jeans: "#d9a227", jeansShade: "#a8771b", shoes: "#2a1d4f", shoesShade: "#1c1238", soles: "#f2eefc",
      skin: "#f0c09a", skinShade: "#d39a7a", skinDeep: "#b47660", hair: "#5a2e1e", hairSheen: "#9a5a38", eye: "#170818", mouth: "#7e2c3a",
    },
  },
};
```

## Required (the checks: `node tools/hh-check.mjs characters/<id>.js`)

| Rule | Why |
|---|---|
| One export, `CHARACTER`; no import, no random numbers, no clock, no words, nothing loaded | A film reads it as data |
| `id` is the file's name (lower-case letters, digits, dashes); a `name`; an `about`; `heightM` 0.5-2.3; `engine: "explainer-2d"` | The library and the film read them |
| `opts`: only `pal`, with the house hero's colour keys (hoodie, hoodieShade, hoodieDeep, hoodieLight, strings, jeans, jeansShade, shoes, shoesShade, soles, skin, skinShade, skinDeep, hair, hairSheen, eye, mouth) as `#rrggbb` | The kit's materials are built from these |
| An original: a hoodie colour of its own (not the house hero's red `#e8323e`) | Each character reads apart in a film |
| Every cell of the sheet draws, inside its box; the views differ; the faces change; every elbow bends the right way | The sheet is the film's model |

STYLE.md's look holds: saturated mids, a shade hue-shifted (toward magenta for a warm colour), a light that glows, colours that sit on the deep
indigo grounds; each shade darker than its base, each light lighter. Never a real person's likeness, a brand or another creator's character.

## The sheet

`node tools/hh-sheet.mjs characters/<id>.js out/sheet.png` draws MW Character Sheet v1 on the one frame every engine keeps (views, faces, poses,
the walk; hands n/a): look at it with Read. The app draws it again, with the life clip and the poster, when it saves the character.
