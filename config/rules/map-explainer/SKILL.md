---
name: map-explainer
description: Moworks Studio's Map Explainer film style - a 30-45 s map story in one continuous camera, from real satellite ground to a vintage paper map and back, red marker on top, physical paper callouts, every move keyed to a word of the voice. Written from the owner's prompt, on the app's shared map engine.
version: 1.0.0
derived-from: The owner's map explainer prompt (SOURCES.md S-MAP, notes/qa/runs/33/brief.txt) and the Test 33 film (Bir Tawil) made from it.
---

# Map Explainer: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins; the house rules
(`moworks-studio`) win over both, and the app's own parts stand: voice-over, transcript, music, sound effects, levels, render. Install nothing and run no tool: the map
engine, its data and its faces come with the app.

## 1. Never write a map engine

The engine is shared. A film supplies only its story, in two kinds of file:

| File | What it holds |
|---|---|
| `lib/film.js` | `MAPFILM.film({...})`: the places as lon/lat, the camera keyed to words, what lies on the ground, what the marker draws |
| `compositions/f1.html`... | One shot each: its paper props in HTML, moved with `MAPFILM.shot` |

Read before you write: `.moworks/library/map-explainer/mapfilm.js` (the API: the `drawing` function for what film.js draws with, `makeShot` for what a shot moves with) and the worked
example `.moworks/library/map-explainer/example/` (`film.js`, `f3.html`, `f12.html`: study them, never copy their places or words). `index.html` starts as an exact copy of
`.moworks/library/map-explainer/scaffold.html`, its `<style id="map-film">` and its script tags untouched: the look lives there. The app places `assets/_app/map/` beside the page,
and writes `assets/_app/map/words.js` from the transcript each time. Never edit those files, and never reference a tile, a map or a picture from the web.

## 2. Every move is keyed to a word

Write times as words, never as seconds: `MAPFILM.W('băng')` is the start of the first "băng", `MAPFILM.W('là', 3)` of the third "là", `MAPFILM.E(word, nth)` its end; in a shot, `s.w(word, nth)` is
the same in the shot's own seconds. Count the occurrences in `transcript.json`. A new voice then re-times the whole film. Seconds are only for a move's length, and for the film's very end.

## 3. The look (the scaffold has it; never restyle it)

- Close views are real satellite ground: Sentinel-2 cloudless 2016 by EOX, land cut out over a drawn navy sea with a teal shallow-water halo. Call the app's `map_imagery` tool with every view of the
  camera ([lon, lat, z]: its start and each key) as soon as the keys are known, and again if they change: it fetches the mosaics into the film and the board, and the engine lays them out. Only this layer:
  the later years are non-commercial, so never fetch another one or a picture from elsewhere.
- Every close shot keeps a `.drawn` corner note (`<div class="drawn" data-layout-ignore>Bản đồ vẽ minh hoạ</div>`). With the real ground the engine writes EOX's required credit into it by itself, legible, in the corner; leave it there.
- **`map_imagery` says it could not fetch (no internet, the service down):** the film goes on with the ground the engine draws, the note stays "drawn", and you say so to the owner in your reply, in plain words: the real pictures need the
  internet, and calling it again brings them in. Never leave this out. Set `ground.biome` for the place all the same, for that case: `desert`, `savanna`, `temperate`, `tropic`, `tundra`, `ice`.
- Wide views are the vintage paper map: pastel countries (neighbours differ by themselves; `colors` may name one), brown coast over soft water-lining, dashed borders, a 10° graticule, labels
  in Cormorant Garamond letter-spaced. The ground fades to paper between Z 9.3 and 7.3.
- Paper texture and 7 % grain over everything, warm vignette. Red marker `#D9291D`, 7-10 px, boiling 8 times a second. Handwriting in Sedgwick Ave Display (Permanent Marker has no Vietnamese).
- Callouts are physical paper: cream tags with a colour bar and tape (Oswald 700 54 px title, typed subtitle in Special Elite VN 28 px), torn strips with a yellow highlighter swipe, tear-off
  calendar pages, a red rubber stamp. A live lat/long readout bottom left on the ground.
- Sedgwick's digit 0 has a slash and reads as a crossed-out number: in handwriting write a capital O for zero, and say so in `docs/NOTES.md`. Its small c has a bar and reads as G ("cut off" reads "gut off"): in handwriting write a capital C.
- A line of the world (the date line with its jogs, the equator, the tropics) comes from `M.lines(name)`; never draw it by hand.
- The map already has its lakes (Natural Earth, on the paper and the drawn ground; `atlas: '10m'` for the small ones): never draw a lake by hand.
- 16:9, 1920 × 1080, 30 fps by default.

**Banned:** AI video or image generation, stock footage, word-by-word captions, hard cuts, any frame where nothing moves, icon packs, glossy gradients or glass UI.

## 4. The story: eight beats, one camera

30-45 s by default, about 10 short lines of voice per 30 s. **The brief has no story yet:** at Prepare pitch three, each one line with its hook and one surprising fact, facts checked on Wikipedia, and
stop for the owner's pick; the length comes with it. Every fact on screen and in the voice is traced in `BRIEF.md`; a thing the source does not say goes (a route with no source says "minh hoạ" on screen).

| Beat | On screen, in one continuous move |
|---|---|
| 1 Hook | Tight on the ground, the hook line ("From this ___, you can ___"); a marker ring on the key word, a handwritten word beside it |
| 2 Names | A paper tag slaps on each place on its name; its subtitle types in on the next word |
| 3 Number | A dashed red measuring line or route draws in; a black tag counts up to the number |
| 4 Context | Pull out to the paper map in about 1.3 s; the big line or border draws in red with a handwritten label; dive straight back |
| 5 Consequence | Two props (calendar pages, clocks, price tags, flags) pop in on their words; one flips |
| 6 Twist | Torn paper strips with yellow highlighter |
| 7 Story | A red stamp slams the year with a shake (`camera.shakes`), the frame splits into two tinted sides (`M.split`), a tracker card, a dotted path whose moving marker crosses the line on the right word (`M.route`) |
| 8 Ending | Pull all the way back to the big map, both sides tinted, a red ring on the subject; a paper end card whose number is scribbled out (`s.scribble`) and replaced in marker by the real punchline, held 1.5 s after the last word, then the end card's shorter fade |

No cut anywhere: a shot's change is the camera moving, and a prop that crosses a shot has a copy in the next one.

## 5. Each step

| Step | What this style adds |
|---|---|
| Prepare | The story as in §4. Name the places' lon/lat in `docs/ASSETS.md`. Set `center` for a story near the date line, so its region never meets the map's cut. `atlas: '10m'` for small islands, else `'50m'` |
| Voice | The app's Voice screen makes it, from your script. Before the voice, spell each place name so the chosen voice says it right and say which you respelled |
| Storyboard | The board is the real engine: `boards/A/film.js` and `boards/A/index.html` from the scaffold, with `base` left as it is, one posed clip per frame at its own seconds. Call `map_imagery` before `board_stills`. So the stills show the film's real ground and map, not a sketch of them. The frames name the living details this story earns: small paper things from what is funny in the place and its words, not only the eight beats' props. Name sound cues the app has: `paper`, `whoosh`, `impact`, `typewriter`, `tape`; never "squeak" |
| Motion Plan | Rows name the engine's own moves (`pop`, `write`, `type`, `count`, `M.ring`, `M.mark`, the camera's keys) with their words and numbers. They come first and the film goes past them: moworks-alive rules 8-10 hold in this style too, so each shot still calls `library_search` twice, and what it takes is redrawn on paper, in this hand, on a word. Only §3's bans and §4's no cut are off limits |
| Build | `lib/film.js` starts from the approved board's `film.js`; call `map_imagery` again if the camera changed; write the shots, wire `window.__timelines` as the example does |
| Review | Look at the shots' words first: tags, typed lines and every Vietnamese mark. The typed lines are small by design; they must still read on the phone sheet |
