# Recipes: the building blocks and when to use each one

Everything lives in `src/kit/scenes.tsx` (the blocks) and `src/kit/collage.tsx` (the look). Every block takes the
clock `t` (seconds) and the **beat** it lands on: keep a `B` object of beat times at the top of the composition (from
the voice-over's `transcript.md`, or your own rhythm) and use it everywhere. The **Demo** (`src/demo/Demo.tsx`) uses
most of them.

```tsx
const B = { title: 0.2, history: 2.9, science: 3.6, really: 6.0 };
```

---

## The frame of every graphic
```tsx
<SceneStack t={t} scenes={[
  { at: 0, render: () => <Page t={t} transparent={transparent}> …scene 1… </Page> },
  { at: 2.6, enter: "up", render: () => <Page t={t} transparent={transparent}> …scene 2… </Page> },
  { at: 5.0, enter: "left", edge: "#d9d4c8", render: () => <PowerWordScene … /> },
]} />
```
- `Page` = the grid paper + print grain. The `transparent` prop (passed by `render.mjs --transparent`) drops both, for
  overlays.
- `SceneStack`: each scene **tears in** over the last one (0.33 s); the covered one unmounts. Alternate
  `up` / `left`, and give the dark page `edge="#d9d4c8"`. `enter: "blur"` and `"cut"` exist for variety.
- Sound: `tear` −6 dB at each `at − 0.02`.

## Type
### Lockup: the big phrase (every scene's payoff)
```tsx
<Lockup t={t} fps={fps} y={1330} lines={[{ text: "CURIOUS", at: B.curious }, { text: "MIND", at: B.mind, highlight: true }]} />
```
Line 1 is red (the point) and line 2 is ink on the highlighter. Sizes default to the frame; set `size` to tune.
No sound.

### Eyebrow: the lead-in, typed
```tsx
<TypeOn text="IF YOU'VE GOT A…" t={t} at={B.if - 0.05} cps={24} size={46} style={{ left: 92, top: 190, letterSpacing: "0.14em" }} />
```

### Spoken headline (16:9 explainers): serif italic word by word
```tsx
<SerifWords t={t} size={84} style={{ left: 150, top: 40 }} words={[{ w: "America", at: B.america }, { w: "will", at: B.will }, { w: "borrow", at: B.borrow, bold: true, mark: <Highlight t={t} at={B.borrow} /> }]} />
```

### TitleCard: a typed eyebrow + a big red title on a torn card (an opening, a chapter, a name)
```tsx
<TitleCard t={t} fps={fps} eyebrow="CHAPTER ONE" title="THE MAP" titleAt={0.4} x={200} y={700} />
```

### SourceLine: on every scene that shows a fact
```tsx
<SourceLine t={t} at={B.s2 + 0.4} text="Source: U.S. Treasury, 2026" />
```

## Objects
### DropObject: a cut-out lands on its beat
```tsx
<DropObject t={t} fps={fps} src="library/book.png" at={B.collecting} x={540} y={900} w={560} slipsAt={B.stories} />
```
`slipsAt` makes paper slips fly out of it. Sound: `paper-land`.

### Cutout: the raw element (when you animate it yourself)
```tsx
<Cutout src="library/globe.png" x={540} y={900 + (1 - g) * 600} w={480} rot={Math.sin(t * 1.3) * 2.5} lift={1 - g} t={t} seed={9} />
```
With `g = springAt(t, B.world, fps, { damping: 12, stiffness: 130 })`, it rises from below on a spring, and the lift
shadow shrinks as it lands.

### PhotoPrint: the user's photo or screenshot
```tsx
<PhotoPrint t={t} fps={fps} src="graphics/<slug>/photo.jpg" at={B.photo} x={140} y={420} w={800} h={520} caption="PARIS, 1889" />
```
Photos turn black-and-white with print contrast; **screenshots: `mono={false}`** (untouched).

## Scenes
### PanelStack: a list ("history, science, anything")
```tsx
<PanelStack t={t} fps={fps} eyebrow="STORIES FROM…" eyebrowAt={B.from} from={S.at} to={S.end} items={[
  { at: B.history, label: "HISTORY", img: "library/pyramid.png", imgW: 360 },
  { at: B.science, label: "SCIENCE", img: "library/microscope.png", imgW: 170 },
  { at: B.anything, label: "ANYTHING", glyph: "?", color: V.red },
]} />
```
2–4 items. Each panel lands on its word, and the odd one out is red. Sound: `paper-land` on the first panel only.

### PowerWordScene: the hook (max 2 power moments per piece)
```tsx
<PowerWordScene t={t} fps={fps} lead="WAIT…" leadAt={S.at + 0.12} word="REALLY?" wordAt={B.really} />
```
Sound: `stamp` −4 dB + `impact` −11 dB at `wordAt − 0.06`. Keep the word ≤ 8 characters.

### IdeaBurst: ideas burst out of a point (a head, a book, a box)
```tsx
<IdeaBurst t={t} fps={fps} at={B.curious - 0.04} x={545} y={640} />
```
Put it over a bust cut-out's head, then add a Lockup under it. Keep the burst clear of the eyebrow. Sound: `pop`.

### OrbitCards: "the world is full of…"
```tsx
<OrbitCards t={t} fps={fps} id="orbit" cx={540} cy={900} rx={420} ry={150} drawAt={B.interesting - 0.2} at={B.interesting}
  items={[{ img: "library/pyramid.png", w: 120, a0: 3.4 }, { glyph: "?", a0: 4.9 }]}
  centre={<Cutout src="library/globe.png" x={540} y={900} w={480} t={t} seed={9} />} />
```
Sound: `paper-land` on the key word.

### FocusRow: singling one out (the crowd parts)
```tsx
<FocusRow t={t} fps={fps} inAt={B.people} at={B.you} count={7} chosen={3} y={520} size={110} label="YOU" />
```
The others slide aside and dim, the chosen one turns red and lifts, and a circle hugs it. Sound: `circle`.

### LineChart: real data, told like a story
```tsx
<LineChart t={t} fps={fps} data={DEBT /* [{ x: 1990, y: 3.2 }, …] real & sourced */} from={B.chart} dur={2.4}
  box={{ x: 200, y: 260, w: 1500, h: 600 }} yMax={40} yTicks={[10, 20, 30, 40]} yFormat={(v) => `$${v}T`}
  xTicks={[1990, 2000, 2010, 2020]} events={[{ x: 2008, label: "FINANCIAL CRISIS" }, { x: 2020, label: "PANDEMIC" }]} />
<SourceLine t={t} at={B.chart} text="Source: U.S. Treasury" />
```
Keep the data in a JSON next to the composition. Sound: `marker-long` while it draws.

### Counter: a spoken number
```tsx
<MoneyCounter value={lerp(0, 117000, ramp(t, B.hundred - 0.1, B.hundred + 0.6, ease.out))} size={220} color={V.red} style={{ left: 120, top: 380 }} />
```
Only numbers the voice says, ending on the spoken word. Red = the alarm; `V.money` = money as an object.
Sound: `count`.

### Stamp: a verdict
```tsx
<Stamp t={t} fps={fps} at={B.projected} text="PROJECTED" x={1500} y={300} />
```
Sound: `stamp`. Never cover the number it qualifies.

### Strike: a correction
```tsx
<RiseWord text="FUTURE" t={t} at={B.future} fps={fps} size={180} dim={ramp(t, B.past - 0.1, B.past + 0.1)}><Strike t={t} at={B.past - 0.25} /></RiseWord>
```
Then the replacement slams in with a highlight. Sound: `strike`.

### CtaButton: a button being pressed
```tsx
<CtaButton t={t} fps={fps} at={B.subscribe} x={280} y={1170} label="SUBSCRIBE" />
```
Sound: `click` at `at + 0.19` (on the press).

---

## Kit index
| File | Exports |
|---|---|
| `collage.tsx` | `V` colours · `VF` fonts · `GREEN_CUT` · `ramp`, `ease`, `springAt`, `kick`, `clamp01`, `lerp`, `hash`, `boil` · `GridPaper`, `PrintFinish` · `Cutout` · `TornPaper`, `Tag`, `TornSheet` · `TypeOn`, `SerifWords`, **`RiseWord`** · `Highlight`, `Strike`, `Underline`, `MarkerCircle`, `DottedPath`, `Burst`, `MarkerArrow` (rarely, §9 of STYLE) · `MoneyCounter` |
| `scenes.tsx` | `Page`, `SceneStack`, `DarkGrid`, `Centre`, `gone`, `outK`, `REL` · `Lockup`, `TitleCard`, `SourceLine` · `DropObject`, `PhotoPrint`, `CtaButton` · `PanelStack`, `PowerWordScene`, `IdeaBurst` (`IDEAS`), `OrbitCards`, `FocusRow`, `LineChart`, `Stamp` · `Bulb`, `Gear`, `Spark`, `PersonIcon` |
| `sound.tsx` | `Cue`, `Soundtrack`, `SfxTrack`, `KIT` |

## Making a new block
When nothing fits, build it with the same grammar:
- the page
- an eyebrow typed on its words
- ONE hero object that does something on the key beat
- the phrase rising big
- a slow drift (1.00 → 1.03)
- every change on a beat

Make it a local component in the graphic's own file. Once the user approves it, move it into `scenes.tsx` and add a
recipe here.
