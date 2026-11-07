# A What If character: the contract

One file, `characters/<id>.ts`, that a What If film takes as it is (it goes to `whatif/cast/<id>.ts`; the episode draws it). It is a costume on
FreshStack's What If rig (`.moworks/library/what-if/`, MIT, read-only: never edit it): the rig's own body and animation, its own colours and one
extra piece. Owner #1287-#1293.

## The file

```ts
import type { Look } from "what-if";

export const CHARACTER = {
  id: "rosa",                      // the file's name
  name: "Rosa",
  about: "A night-bus driver who knows every stop by heart.",          // one line, 10-300 letters
  heightM: 1.62,                   // the person's real height in metres
  scale: 0.8,                      // its size on the rig: the cast is 0.68 (a child) to 0.84
  look: {                          // every colour of the rig's Look, #rrggbb
    skin: "#C98E68", skinShade: "#B07A58", hand: "#C98E68", jacket: "#2F5D8A", jacketShade: "#244A6E", accent: "#F2B33D",
    limb: "#3A3446", line: "#14121C", shoe: "#D9534F", face: "#1D2033", hair: "#2A1C18",
    extra: "bob",                  // optional: hood, curls, bunches, bob or suit (the pieces the rig draws)
  } as Look,
};
```

## Required (the checks: `node tools/wi-check.mjs characters/<id>.ts`)

| Rule | Why |
|---|---|
| Imports only `what-if` (its types, its `LOOKS`); one export, `CHARACTER` | A film bundles it with the engine |
| `id` is the file's name; a `name`; an `about`; `heightM`; `scale` 0.5-1.2 | The library and the film read them |
| `look`: every colour of the rig's Look as `#rrggbb`; `extra` one the rig draws or none | The rig draws only these |
| An original: not one of the rig's own looks; a jacket and piece none of the cast wears together | The author's rule: original characters, read apart |
| No words (`<text>`), no random numbers, no clock, nothing loaded | Deterministic, never a brand |

Never a real person's likeness, a brand or another creator's character. The rig is not changed: what it cannot draw is the app's layer
(`mw:wi-cast`: the back view, the laugh, angry and talk faces).

## The sheet

`node tools/wi-sheet.mjs characters/<id>.ts out/sheet.png` draws it with the rig and the app's layer: its views (front, three-quarter, profile,
back), its faces, its poses and its walk, one row each. Look at it with Read.
