# A Stickman Explainer character: the contract

One file, `characters/<id>.js`, that a Stickman Explainer film takes as it is (it goes to `characters/house/<id>.js`; the film draws it with the
source skill's own `figure(x, { tone: "hero", ...CHARACTER.opts, … })`). It is a look on the source skill's one stick-figure rig
(`.moworks/library/stickman-explainer/`: `kit.js` and `SKILL.md`, read-only: never edit them): the skill makes "a new look per video" from
`figure()`'s outfit / build / hair / shoes, and side characters on the same rig. Owner #1302.

## The file

```js
export const CHARACTER = {
  id: "lan-runner",                // the file's name
  name: "Lan",
  about: "A quick, sporty stickman in a green hoodie and orange sneakers, always the first to try.",          // one line, 10-300 letters
  heightM: 1.7,                    // the character's real height in metres
  engine: "stickman-explainer",
  opts: {                          // only figure()'s look options, as SKILL.md lists them
    outfit: { hoodie: "#2e9e5b", dark: "#1f6e3f", shade: "#25854c", strings: "#f2f2e6" },          // colours, #rrggbb, any of the four
    hair: "bun",                   // optional: "quiff" or "bun"
    build: "muscular",             // optional
    shoes: "#ff7a2f",              // optional: a colour
  },
};
```

## Required (the checks: `node tools/hh-check.mjs characters/<id>.js`)

| Rule | Why |
|---|---|
| One export, `CHARACTER`; no import, no random numbers, no clock, no words, nothing loaded | A film reads it as data for its own figure() |
| `id` is the file's name (lower-case letters, digits, dashes); a `name`; an `about`; `heightM` 0.5-2.3; `engine: "stickman-explainer"` | The library and the film read them |
| `opts`: only `outfit` (hoodie, dark, shade, strings as `#rrggbb`), `build` ("muscular"), `hair` ("quiff", "bun"), `shoes` (a colour) | figure() draws only these |
| An original: a hoodie colour, a build, hair or shoes of its own (not the shipped Hoodie Hero's look) | Each look reads apart in a film |
| Every cell of the sheet draws, inside its box; the views differ; the faces change; every elbow bends the right way | The sheet is the film's model |

The body is always the skill's black stick figure: never a real person's likeness, a brand or another creator's character. Faces, poses and the
walk are the rig's (figure()'s face and pose); a character does not set them.

## The sheet

`node tools/hh-sheet.mjs characters/<id>.js out/sheet.png` draws MW Character Sheet v1 on the one frame every engine keeps (views, faces, poses,
the walk; hands n/a): look at it with Read. The app draws it again, with the life clip and the poster, when it saves the character.
