---
name: sequence
description: The studio's rules for a film with an image sequence (a 3D product render as numbered pictures) - read its poses first, play it with the app's player, at least 1 picture a film frame while it turns, hold only on a rest pose, never blend two pictures, the whole product inside the frame. Read in the Storyboard, the Motion Plan, the Build and the Review of any film with a sequence.
version: 1.1.0
derived-from: Moworks Motion kit (Moworks, commit 0a4a0a3) - engine/qa/poses.py, library/presets/motion/image-sequence/preset.js, engine/qa/buildlint.py (jump, product), engine/skill/moworks-motion/workflow/film.md L162-175, L310; written from the idea for Moworks Studio. Test 30 measured what happens without them: 93 % of the turning frames under 1 picture a film frame, one picture held 37 frames, 18 of 28 shots with the phone cut off, and a hand-written player that dissolved two pictures.
---

# A film with an image sequence

## 1. Read it first

The app reads every numbered sequence at the scan: `.moworks/scan/INDEX.md` names its `POSES.md`, a numbered sheet and a picture of each rest pose. Open them before you plan a
frame. POSES.md gives the **rest poses** (runs of pictures that barely change, and slow points where a turn eases out and back), the **portals** (poses that show the same
picture, so a jump between them is invisible) and the **product's box** in each (the opaque part, as % of the picture). Note for each rest pose you use: open or closed, which face,
and which way up. A pose seen upside down is only passed through, never held.

## 2. Rules

1. **Never blend two pictures.** One picture on screen at a time: no dissolve, no stack of two, no cross-fade between pictures, whatever the speed.
2. **While it turns, at least 1 picture a film frame,** with no ceiling on a fast move (a good turn takes 16 frames for 60 pictures). Between two rests, ease a burst; never let it crawl.
3. **Hold only on a rest pose.** To feel slow, hold on a rest pose and push the camera, or drift the box by position and scale; never slow the pictures. Every hold still moves by position and scale.
4. **The whole product stays inside the frame,** with room to breathe, on every frame, in every pose: place it by its widest pose in that shot (the box in POSES.md). Only a stretch you mark may
   cut it, on purpose: a close-up where a guideline allows, or a product travelling across the frame's edge as a Brand Kit's `## Crop limits` shows (a guideline's own animated visual may do this). At rest and at the packshot it is whole. Mark it (below).
5. **Text beside a turning product** is placed by the product's widest pose of that turn, or moves with it.
6. **The light sweep is a soft reflection, only while it turns,** cut to the product's own shape; the player does it. Never a constant shine, never over the ground.
7. **One product through the film:** one element, in the root composition, for the whole film. A second sequence element only for a real second product.

## 2b. The feel the owner approved

Test 31's product is the bar (owner 31/10: "good, đúng ý"). The turn is a snap, not a travel: about 0.14 s and 24 pictures at 60 fps, 2.7 pictures a film frame at the middle and never under
1.1, landing on the sung word or the hit, and repeated back and forth for a repeated word. Between the turns it holds on a rest pose, usually about 0.3 s and at most about 2.6 s, and the box
keeps moving by position and scale all the while (86 moves in a 50 s film). The whole product stays in the frame. It is the feel to aim for, not numbers to copy: the song sets the moments.

## 3. The player the app ships: never write your own

An element with `data-mw-sequence` is all you write, one JSON attribute; the app loads the player for you (no script tag, no GSAP, no `<img>` of your own). Times are film seconds.

```html
<div id="product" class="clip" data-start="0" data-duration="50" data-track-index="5" style="position:absolute;left:560px;top:90px;width:800px;height:900px"
  data-mw-sequence='{"dir":"assets/2_footage/phone/frame_","digits":4,"ext":".png","first":1,"last":641,
    "keys":[[0,1],[1.2,1],[1.47,61,"io"],[3,61],[3.2,180,"out"]],
    "pos":[[0,0,0,1],[1.2,0,0,1.04,"sin"],[1.47,-120,20,0.92,"io"]],
    "float":[8,3.3],"sway":[1.5,5.1],"sweep":{"peak":0.45,"band":0.22,"angle":-22},
    "closeUps":[[20.5,21.4]]}'></div>
```

| Field | What it is |
|---|---|
| `dir`, `digits`, `ext`, `first`, `last` | The numbered files: `<dir><number with digits><ext>`, from the project's root, written as they are on disk |
| `keys` | `[seconds, picture, ease]`: which picture, by film time. Ease of the stretch that ends at that key: `lin`, `in`, `out`, `io`, `sin`, or `step` (holds the last picture, then shows this one at that second: a jump, for a portal or a cut) |
| `pos` | `[seconds, x, y, scale, ease]`: the box's own move (px from where it sits) |
| `op` | `[seconds, opacity, ease]`: the whole box |
| `float`, `sway` | `[px or degrees, period s]`: gentle life, a function of time |
| `sweep` | `true` or `{peak, band, angle}`: the reflection on every turn longer than 0.15 s; leave it out for none |
| `closeUps` | `[[from, to]]`: the shots that cut the product on purpose |
| `source` | Only when `dir` holds smaller copies: the originals as `folder/name####.png`, for After Effects |

The player snaps the picture to the film's frame grid, shows one `<img>`, holds the capture until that picture is decoded, and asks again for a picture that failed to load. Other moves
go on the element itself or a parent, by GSAP on your own timeline (a camera, a groove): the player moves only its own inner box.

## 4. In each step

- **Storyboard, Motion Plan:** name each shot's rest pose or turn by its picture numbers from POSES.md. A slow idea is a slow camera, never a slow turn.
- **Build:** one `data-mw-sequence` element for the product, in the root composition.
- **Review, Tech checks:** the app checks every sequence: **crawl** (under 1 picture a frame outside a rest pose, or one picture held too long), **jump** (a sudden skip that is no portal or cut) and **product** (the box
  outside the frame, unless in a marked close-up). A crawl keeps Motion at 6 at most (moworks-qc §2b).
