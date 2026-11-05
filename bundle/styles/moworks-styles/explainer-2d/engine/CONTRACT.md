# The engine: module contract and API

Read this before you write `story.js` or an art module. It is the exact API of the engine, taken from the code.

The engine draws every frame of a film into one `<canvas id="ex-stage">` inside a HyperFrames composition. Every file is
a **classic script** (no ES modules, no bundler) that attaches to one of two globals:
- `window.EX`: the core (`ex-core.js`) and effects (`ex-fx.js`): time, easing, springs, seeded noise, colour, camera,
  word cues and the stage.
- `window.HOUSE`: the house look: palette and light rig (`house-pal.js`), labels and title (`house-ui.js`), the
  red-hoodie character (`house-hero.js`), and every per-film art module (`story/<film>-<name>.js`).

`tools/sync-engine.mjs` copies `engine/` into each video's `ex/` folder. Never edit a video's `ex/`; edit `engine/`
and sync again.

## Hard rules (a render breaks or the look breaks without them)

1. **Every frame is a pure function of time.** HyperFrames renders frames out of order and in parallel. No
   `Math.random`, `Date.now`, `performance.now`, `requestAnimationFrame`, timers, CSS animation, and no state carried
   from one frame to the next (no "previous position", no counters, no particles that update themselves). Randomness
   comes from `EX.rng(seed)`, `EX.hash(i, j, k)` and `EX.noise1(x, seed)`; motion comes from `t` and the progress
   values the story passes in.
2. **Caches only in `init()`.** Expensive static work (offscreen layers, sprite canvases, point lists, measured paths)
   is built once in the module's `init()`, which returns a Promise. The story awaits it inside `EX.run({ build })`.
   A cache never depends on `t`.
3. **No outlines.** Shapes are flat fills: a lit fill, one hard-edged cel shadow (hue-shifted toward magenta), an
   optional deep-fold tone and a thin rim light. A rim is a band of colour inside the shape, never a stroke around it.
   Lines are allowed only where the thing itself is a line (a wire, a stem, a callout leader).
4. **No text inside art modules.** Every word on screen comes from `story.js` through `HOUSE.ui` (pills, callouts,
   title), so labels stay one style and can be timed to the voice.
5. **No image files, no AI images.** Everything is drawn in code. Fonts come from the synced `ex/fonts/`.
6. **Frame budget.** A frame must draw in well under 60 ms on a laptop. Skip work that is off the canvas, cache static
   layers, and measure with the test page (it prints ms per draw).
7. **Both formats.** Read the size from `EX.W` / `EX.H` and never type 1920 or 1080. Every scene has a layout for
   16:9 (`EX.W > EX.H`) and one for 9:16. In 9:16 keep the subject central and tighter; text stays in
   `HOUSE.ui.safe()`.

## Size, units and load order

The film's size, length and frame rate live in one place, the root element of `index.html`:
```html
<div id="root" data-composition-id="main" data-start="0" data-duration="40" data-fps="60" data-width="1920" data-height="1080">
```
At load, `ex-core.js` reads it: `EX.W`, `EX.H` (fallback 1920×1080), `EX.FPS` (fallback 60) and
`EX.U = min(EX.W, EX.H) / 1080`, the type and UI unit (1 in both 16:9 and 9:16). `story.js` reads the length with
`Number(document.getElementById("root").dataset.duration)`. Change the length with
`node tools/set-duration.mjs <dir> <seconds>`, never by hand in two places.

Script order in `index.html` (each file may use only what loads before it):
```
ex/gsap.min.js  ex/ex-core.js  ex/ex-fx.js  story/words.js  ex/house-pal.js  story/film-pal.js
ex/house-hero.js  ex/house-ui.js  story/<film>-<name>.js …  story/story.js
```

## `EX`: core (`ex-core.js`)

| Name | Signature → result | Notes |
| --- | --- | --- |
| `EX.W`, `EX.H`, `EX.FPS`, `EX.U` | numbers | from the root (above) |
| `EX.TAU` | `2π` | |
| `EX.clamp` | `(x, a = 0, b = 1) → number` | |
| `EX.lerp` | `(a, b, t) → number` | |
| `EX.invLerp` | `(a, b, x) → 0..1` | clamped |
| `EX.ease` | `{ linear, inQuad, outQuad, inCubic, outCubic, inOutCubic, outQuint, inOutQuint, inOutSine, outExpo, inExpo, outBack }` | each `(t 0..1) → 0..1` (`outBack` overshoots) |
| `EX.prog` | `(t, t0, dur, ease = EX.ease.linear) → 0..1` | eased progress through `[t0, t0 + dur]` |
| `EX.spring` | `(dt, damping = 0.45, freq = 14) → 0..1+` | damped step response, overshoots; `dt` = seconds since the trigger (0 before it). Pops: damping 0.42–0.5, freq 12–16 |
| `EX.springTo` | `(dt, a, b, damping, freq) → number` | `a + (b − a) · spring` |
| `EX.wobble` | `(dt, damping = 0.42, freq = 16) → −1..1` | decaying jolt, 0 at rest |
| `EX.squash` | `(dt, amount = 0.22, damping = 0.42, freq = 16) → [sx, sy]` | area-preserving squash and stretch |
| `EX.rng` | `(seed) → () → [0, 1)` | seeded generator (mulberry32). Use in `init()` to build layouts |
| `EX.hash` | `(i, j = 0, k = 0) → [0, 1)` | stateless; use per item and per frame |
| `EX.noise1` | `(x, seed = 0) → −1..1` | smooth 1D value noise; `EX.noise1(t * 0.2, seed)` = slow drift |
| `EX.hex` | `("#rrggbb") → [r, g, b]` | |
| `EX.rgba` | `(hex or [r, g, b], a = 1) → "rgba(…)"` | |
| `EX.mix` | `(colour1, colour2, t) → [r, g, b]` | colours as hex or arrays; `t` not clamped |
| `EX.cameraAt` | `(t, start {x, y, zoom}, moves [{t0, t1, x?, y?, zoom?, ease?}], opts {drift = 1, creep = 0.0025}) → {x, y, zoom}` | world camera; zoom moves in log space; `drift` = seeded float, `creep` = zoom growth per second |
| `EX.shake` | `(t, triggers [t0…], amp = 14, decay = 7) → [sx, sy]` | screen px, decaying after each trigger |
| `EX.toScreen` | `(cam, wx, wy) → [x, y]` | world → screen around the frame centre; adds `cam.sx` / `cam.sy` if set |
| `EX.storyTime` | `(t, segs [{t0, t1, s0, s1, ease?}]) → number` | remaps time (e.g. a rewind) while ambient `t` keeps running |
| `EX.integrateSpin` | `(t, w0, changes [{t, w, ramp = 0.18}]) → angle` | angle of something whose spin speed changes, without jumps |
| `EX.setWords` | `(words [{word, start, end}])` | call once with `window.STORY_WORDS` |
| `EX.cue` | `(word, n = 1, which = "start") → seconds` | the n-th occurrence of `word` (case and punctuation ignored); `which` `"start"` or `"end"`. A missing word returns **0** and logs `[EX] missing cue` |
| `EX.run` | `({ id = "main", duration, draw(ctx, t), build?: async () => {}, fonts?: ["600 38px \"Figtree\"", …] })` | sizes `#ex-stage` to `EX.W × EX.H`, awaits the fonts and `build`, then registers a paused GSAP timeline whose time drives `draw`. Before each draw it resets the transform, alpha and composite mode. Sets `EX.ctx` and `window.seek(t)` (debugging) |

## `EX.fx`: effects (`ex-fx.js`)

The house look uses none of the finishing effects (no grain, no global vignette). The event effects are for moments
the storyboard asks for.

| Name | Signature | Notes |
| --- | --- | --- |
| `EX.fx.init` | `()` | builds the grain tiles and the vignette; call in `build` before `grain` / `vignette` |
| `EX.fx.vignette` | `(ctx, strength = 1)` | radial darkening of the corners |
| `EX.fx.grain` | `(ctx, tAmb, amount = 0.06, fps = 24)` | seeded film grain |
| `EX.fx.flash` | `(ctx, dt, strength = 0.85, color = "255,255,255", decay = 5)` | full-frame flash, `dt` = seconds since it fired |
| `EX.fx.ring` | `(ctx, x, y, dt, { dur = 1.1, r0 = 40, r1 = 900, alpha = 0.7, color = "255,255,255", width = 18 })` | expanding shockwave ring |
| `EX.fx.streaks` | `(ctx, tAmb, k, dir = [1, 0], { count = 46, color = "200,235,255" })` | speed streaks across the frame, `k` = intensity 0..1 |
| `EX.fx.lightFlood` | `(ctx, x, y, r, a, color = "255,190,110")` | additive light spilling from a point |

## `HOUSE`: palette, light and helpers (`house-pal.js`)

`HOUSE.pal` holds every house colour by role. Read colours from it; add a film's own in `story/film-pal.js` with
`Object.assign(HOUSE.pal, { … })`.

| Role | Keys |
| --- | --- |
| Night sky (top → horizon) | `sky` (4 stops), `skyPool` (soft light pool, rgba) |
| One-sided horizon glow (outer → hot core) | `glow` (5 stops), `ridge` (bright far ridge line) |
| Landscape, far → near | `hillFar`, `hillFarRidge`, `hillMid`, `hillMidRim`, `hillNear`, `hillNearRim`, `fore`, `props` (fences, pylons, wires), `treeFar`, `window` (2: lit windows) |
| Clouds | `cloudBottom`, `cloudMid`, `cloudTop`, `cloudRim`, `cloudRimHot`, `cloudCoolRim`, `cloudBack`, `cloudInner` |
| Rain | `rainFar`, `rainNear`, `rainCyan` |
| Stars and sparkles | `star` (3), `sparkCyan`, `sparkPink` |
| Electric light | `boltCore`, `boltRim`, `boltGlow`, `leaderCore`, `flash` |
| The character | `hoodie`, `hoodieShade`, `hoodieDeep`, `hoodieLight`, `strings`, `jeans`, `jeansShade`, `shoes`, `shoesShade`, `soles`, `skin`, `skinShade`, `skinDeep`, `hair`, `hairSheen`, `eye`, `mouth` |
| Diagrams, labels, cards | `gridBg`, `gridLine`, `card`, `cardBracket`, `text`, `notToScale`, `pill` {`crimson`, `magenta`, `orange`, `cyan`, `purple`, `green`} |
| Sun or lamp | `sun` (4), `sunGlow` |
| Globe and organs | `space` (3), `ocean`, `oceanNight`, `land`, `landWarm`, `atmo`, `cityLight`, `heart`, `heartShade`, `brain`, `brainShade` |

`HOUSE.light = { key: [-0.6, -0.8], rim: "#ff5fa0", cool: "#8f9dff" }`: `key` is the screen direction toward the key
light (cool moonlight from the upper left; cel shadows fall the other way), `rim` the warm rim from the horizon glow,
`cool` the top light tint.

Helpers (they sit beside `EX`'s; nothing shares a name inside one namespace):

| Name | Signature | Differs from `EX` |
| --- | --- | --- |
| `HOUSE.lerp`, `HOUSE.clamp` | same as `EX.lerp`, `EX.clamp` | no |
| `HOUSE.smooth` | `(a, b, x) → 0..1` | smoothstep of `x` between `a` and `b` (no `EX` twin) |
| `HOUSE.backOut` | `(x, s = 1.7) → number` | GSAP `back.out(1.7)` on `x` 0..1 (clamped); the house entrance curve |
| `HOUSE.mix` | `(colour1, colour2, k) → [r, g, b]` | like `EX.mix` but `k` is clamped to 0..1 |
| `HOUSE.rgba` | `(colour, a) → "rgba(…)"` | same as `EX.rgba` |

## `HOUSE.ui`: labels and title (`house-ui.js`)

Times are seconds. `now` is the current time `t`; `t0` is when the element starts; `out` is when it leaves (omit to
keep it). Built-in sizes are for the 1080 px short side and are multiplied by `EX.U`; coordinates and px options you
pass are canvas px, used as given; `size` is a multiplier. Await `HOUSE.ui.init()` in `build`.

| Name | Signature | What it draws |
| --- | --- | --- |
| `init` | `() → Promise<boolean>` | waits for Figtree 600/700, measures cap heights; resolves `true` when Figtree loaded |
| `safe` | `() → { x0, y0, x1, y1, cx, cy }` | where text may sit. 16:9: the whole frame. 9:16: x 60–960, y 250–1450 (at 1080×1920; `W − 120·U` and `H − 470·U` in general) |
| `pill` | `(ctx, { text, x, y, color = "magenta", t0, now, out, origin = "center", icon, size = 1, alpha = 1, flash = 0, scale = 1, textColor }) → { x, y, w, h, s } \| null` | near-square label, Figtree 600, 68 px tall at size 1. `color`: a key of `HOUSE.ui.colors` (the `HOUSE.pal.pill` keys plus `violet`) or a hex. `origin`: `center` (x, y = centre), `left` / `right` (x, y = middle of that edge), `top` / `bottom`. `icon: "clock"` adds a clock whose hand sweeps once. Enters with back.out(1.7) over 0.5 s, leaves in 0.125 s |
| `pillSize` | `(ctx, { text, icon, size }) → { w, h }` | layout without drawing |
| `callout` | `(ctx, { from: [x, y], to: [x, y], text, color, t0, now, out, icon, size = 1, elbow = 44, side, lineColor = "#ffffff", lineDur = 0.1, pillDelay = 0.067, flash })` | dot at `from`, a 4 px leader diagonal to an elbow then a short horizontal run to `to`, where the pill attaches by its near edge. Dot pops at `t0`, line draws in 0.1 s, pill 0.067 s later. Exit takes 0.21 s (pill shrinks, line reels back, dot pops): fire `out` at least 0.21 s before a cut. `side` (`"left"` / `"right"`) forces the direction |
| `notToScale` | `(ctx, { text = "not to scale", alpha, t0, now, color })` | small tag at the top right (16:9: 46 / 41 px insets; 9:16: the safe zone's top-right corner) |
| `title` | `(ctx, { lines, t0 = 0, now, y, x, size, capH, pitch, tracking = 0.022, wordGap = 0.06, stagger = 0.2, dur = 0.5, out, flash, color = "#ffffff", fit = true })` | the film title: uppercase Figtree 700, cap height 8.1 % of `min(W, H)` (87 px). `lines` = `[["WHERE", "THE"], ["NEEDLE", "STOPS"]]` or strings. Words pop one at a time `stagger` apart from their own centres, with a soft glow and a faint drop shadow. `y` = centre of the block: default 202 px in 16:9 and about 600 px in 9:16 (`202·U + 0.475·(H − min(W, H))`). `x` = centre: default the safe zone's middle. `fit` shrinks the type when a line would leave the safe zone. Starts about 0.6 s after the last spoken word |
| `panel` | `(ctx, { x, y, w, h, t0, now, out, draw(ctx, inner), rim = 11, bg }) → inner \| null` | white-rimmed frame (x, y = outer top-left) popping from its centre; `draw` paints inside the clipped inner rect `{ x, y, w, h, s }` |
| `timebar` | `(ctx, { x, y, w, h = 125, t, k, t0, now, label, sub, rightLabel, rightK, labelSize = 44, subSize = 36, labelGap = 116, subGap = 48 })` | glowing bar between two ticks (x = left tick, y = band centre, w = tick to tick); `k` 0..1 builds it (or pass `t0` / `now`); sparkles stream right with `t`; labels rise under the ends |
| `lens` | `(ctx, { x, y, r, t0, now, out, draw(ctx, { x, y, r, s }), rim = 9, bg, bgHi }) → { x, y, r, s } \| null` | white-rimmed magnifier circle; `draw` paints inside a circular clip |
| `dotted` | `(ctx, { from, to, k = 1, k0 = 0, t, spacing = 26.5, r = 4.6, color = "#ece2ff", flow = 22, head = true })` | dotted signal line: `k` = head progress, `k0` = tail progress; a bright spark leads it while `k < 1` |
| `divider` | `(ctx, { x, k = 1, w = 9, y0 = 0, y1 = EX.H, from = "top", ease = true, color })` | vertical split-screen divider wiping in (`from`: `top`, `bottom`, or `center`) |
| `popScale` | `(now, t0, out, inDur = 0.5, outDur = 0.125) → scale` | the shared entrance / exit curve, for your own elements |
| `colors`, `FONT`, `IN_DUR`, `OUT_DUR`, `fontOK` | values | pill colours, the font stack, 0.5, 0.125, whether Figtree loaded |

Label timing rules: a label never starts in the last 0.3 s of a shot; one new element every 1.5–3 s; labels sit
beside their subject (from the module's anchors), never on it.

## `HOUSE.hero`: the red-hoodie character (`house-hero.js`)

| Name | Signature | Notes |
| --- | --- | --- |
| `init` | `() → Promise` | builds the colour sets; await it in `build` |
| `draw` | `(ctx, { t, x, y, h, view = "front", look = [0, 0], headUp = 0, headTurn = 0, worry = 0, mouth = 0, flash = 0, flashSide = -1, rimSide = -1, wet = 0, alpha = 1, seed = 0, blink, breathe = 1, wind = 1 })` | `x, y` = feet centre on screen, `h` = standing height in px (60 in a wide shot to 3000+ in a close-up; a close-up just puts the feet below the frame). `view`: `front`, `back`, `profile` (faces left). `look` = eye direction −1..1 (negative y looks up). `headUp` 0..1 tilts the head back; `headTurn` −1..1 turns it (+ = toward screen right). `worry` 0..1 and `mouth` −1..1 (frown → smile) set the face. `rimSide` = the side of the horizon glow (warm rim on that side). `flash` 0..1 lights one side (`flashSide`). `wet` 0..1 adds rain drops and sheen. Breathing (0.25 Hz), seeded blinks (every 2.5–5 s), a small head roll and hair sway run by themselves from `t`; `seed` shifts them, `blink` overrides the lid 0..1, `breathe` / `wind` scale the motion. Levels of detail switch by size; parts off the canvas are skipped |
| `anchors` | `(sameOpts) → { head, headR, eye, eyeL, eyeR, brain, neck, chest, shoulderL, shoulderR, handL, handR, top, feet }` | screen px for the same options; `L` / `R` are screen-left / right. Place labels and props from these, never from fixed px |
| `blink` | `(t, seed) → 0..1` | the eyelid closure `draw` uses, to time something to a blink |

Recolour the character for a film in `film-pal.js` (`hoodie`, `jeans` …); `HOUSE.light.key` sets its cel shadows.
If the hero is drawn inside a camera transform, its anchors come back in the transform's coordinates: either draw it
with screen coordinates (`x, y, h` already scaled by the camera, as the template's `heroIn()` does) or map the
anchors yourself.

## Writing a per-film art module

A film's scenes are drawn by one to three modules, `story/<film>-<name>.js` (for example `inj-clinic.js`), each on
`window.HOUSE.<name>`. For a big film, brief one agent per module with `ART.md` and this file; the lead writes
`story.js`. The skeleton:

```js
/* <film>-<name>.js: <what it draws>. Attaches HOUSE.<name>.
 * API
 *   await HOUSE.<name>.init()
 *   HOUSE.<name>.scene(ctx, { t, cam = { zoom: 1, x: 0, y: 0 }, k = 0 })   full frame; k 0..1 = <what k does>
 *   HOUSE.<name>.sceneAnchors(opts) -> { tip: [x, y], … }                   screen px, same cam applied
 */
(function () {
  const HOUSE = window.HOUSE;
  const P = HOUSE.pal;
  let layer = null; // a static layer, built once

  // the layout for each format, in canvas px (EX.W > EX.H: 16:9; else 9:16)
  const layout = () => (EX.W > EX.H ? { subject: [EX.W * 0.55, EX.H * 0.52], r: 300 } : { subject: [EX.W * 0.5, EX.H * 0.45], r: 340 });

  function init() {
    layer = document.createElement("canvas");
    layer.width = EX.W;
    layer.height = EX.H;
    // paint the parts that never move into `layer` here (seeded with EX.rng)
    return Promise.resolve();
  }

  // the camera: zoom about the frame centre, then pan in px
  function withCam(ctx, cam, fn) {
    const c = cam || { zoom: 1, x: 0, y: 0 };
    ctx.save();
    ctx.translate(EX.W / 2 + (c.x || 0), EX.H / 2 + (c.y || 0));
    ctx.scale(c.zoom || 1, c.zoom || 1);
    ctx.translate(-EX.W / 2, -EX.H / 2);
    fn();
    ctx.restore();
  }

  function scene(ctx, o) {
    const L = layout();
    const k = EX.clamp(o.k || 0);
    withCam(ctx, o.cam, () => {
      ctx.drawImage(layer, 0, 0); // background, with margin for zoom 1.08 and ±40 px pan
      // big shapes, then medium detail, then small detail; ambient life from o.t (EX.noise1, EX.hash)
    });
  }

  function sceneAnchors(o) {
    const L = layout();
    const c = o.cam || { zoom: 1, x: 0, y: 0 };
    const s = (p) => [EX.W / 2 + (p[0] - EX.W / 2) * c.zoom + c.x, EX.H / 2 + (p[1] - EX.H / 2) * c.zoom + c.y];
    return { subject: s(L.subject) };
  }

  HOUSE.<name> = { init, scene, sceneAnchors };
})();
```

Rules for every module:
- A comment at the top lists the API (functions, options, ranges, anchors).
- Full-frame scenes paint the whole `EX.W × EX.H` canvas, background included, with enough margin that zoom 1.08
  and a ±40 px pan never show an edge.
- Progress inputs (`k`, `fill`, `press` …) are 0..1 and may jump at a cut; animate within a shot from them and `t`.
  The story eases them.
- Ambient life never stops: noise wobble about ±2 %, drifting particles, breathing light pools. Fast things are drawn
  as streaks so they read at 60 fps.
- Detail at three scales: big readable shapes, medium detail (lobes, fibres, branches, folds), small detail
  (speculars, bubbles, sparkles, particles). Detail never competes with the subject.
- Glow only on things that emit light (additive halos, `globalCompositeOperation = "lighter"`). Grounds are deep
  indigo / violet, never black or grey. One cool hero accent per film, from `film-pal.js`.
- Colours come from `HOUSE.pal`. A colour that isn't there goes in a named local constant at the top of the module,
  and the agent says so in its report.
- Don't touch other modules, `ex/`, `film-pal.js` or `story.js`.

## Testing a module

1. Make the test page: `node tools/new-module-test.mjs videos/<slug> <module>` (add `--format tall` for 9:16). It
   writes `videos/<slug>/tests/<module>/` from `engine/harness/`: `index.html` at the video's size, `ex/` (synced),
   `story/` (copies of `film-pal.js` and the module) and `test.js`.
2. Edit `test.js`: `STATES` lists `[functionName, options]`, one per second (an empty list draws each function once).
   Test each scene at the start and end of its progress, `k` past 1, and a camera push
   (`cam: { zoom: 1.08, x: 40, y: -40 }`). Set `data-duration` in `index.html` to at least the number of states.
3. Snapshot it with the sandbox disabled: `node tools/snapshot.mjs videos/<slug>/tests/<module> --every 1`. The strip
   at the bottom shows the state, its options and the ms per draw; anchors show as white dots; in 9:16 a dashed frame
   marks the text safe zone.
4. Look at every PNG at full size. Check motion with two snapshots 1/60 s apart, and determinism by snapshotting the
   same time twice (the pictures must match).
5. After every edit of the module, run step 1 again (it refreshes the copies and keeps your `test.js`).

## `story.js` in short

`templates/video/story/story.js` is the skeleton; follow its order. Read the length from the root; build the cue
table `C` with `EX.cue` from `STORYBOARD.md`'s event-cue table (the same cues `story/sound.json` uses); put every cut in
`const CUT = { … }` (a hard cut lands 0.05 s before its word; `tools/qc.mjs` counts cuts from this table); keep one
layout table per aspect; give each shot a camera drift between zoom 1.00 and 1.06; draw labels with `HOUSE.ui` from the
modules' anchors; start the title about 0.6 s after the last word; fade the last 0.6 s to black.
