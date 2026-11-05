# 3D Cartoon in Moworks Studio: the film's files

The kit is in `../kit/` exactly as the owner wrote it (read its skills, references, code and examples there; never edit them). The app runs
every command; the kit's own tools (doctor, new-video, stills, render, qc, check, transcribe, npm, uv) are never run.

| File | What |
|---|---|
| `index.html` | Start from `app/index.html`: the root `#main` with `data-kit="cartoon-3d"`, its size, rate (9:16 1080×1920 (Story Shorts) or 16:9 1920×1080 (What-If), 30 fps) and length (the composition's FRAMES / FPS, the ending's fade included) |
| `src/videos/film/Video.tsx` | The composition, written from the kit's own template (`kit/templates/`) as the kit's new-video tool would write it, with the names filled in: it exports the component, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT` (and `SOUND`, kept as the kit writes it: its cues are the film's sound plan) |
| `src/videos/film/*` | The video's other files, as the kit lays out `src/videos/<slug>/`; their relative imports reach the kit's code (`../../kit/…`, `../../stickman/kit.js`…) as shipped. A file of the kit's `src/` that the film needs changed for itself is copied to the same path under the project's `src/` (the project's copy wins); never change the kit |
| `import WORDS from "mw:words"` | The voice's words with their times, `[{ word, start, end }]` seconds, from the app's transcript |
| `compositions/film/film.js` | Written by the app (finalize): the composition with the kit's code, React, the app's stand-in for Remotion and three.js 0.187.0 |
| `boards/<X>/index.html` | A storyboard option: `app/board.html` with its seconds in `data-kit-board` |

Remotion itself is not here: the stand-in has `useCurrentFrame`, `useVideoConfig`, `Sequence`, `Series`, `Loop`, `Freeze`, `interpolate`,
`interpolateColors`, `spring`, `Easing`, `random`, `AbsoluteFill`, `Img`, `staticFile`, `delayRender`, `continueRender`, `getInputProps`.
`staticFile("textures/…")` is the kit's own file; any other `staticFile(p)` is the project's `assets/p`. `<Audio>` draws nothing: the voice,
the music and the sound effects are the app's (Final Mix).
