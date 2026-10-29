# ae-export: provenance

The After Effects export is the Moworks Motion kit's After Effects port, copied into the app and adapted to HyperFrames-native projects.
The kit itself is not modified.

- Source: Moworks Motion 2.0.4, `engine/` at kit commit `30b7dcb` (https://github.com/moworksstudio/moworks-motion), MIT licence,
  © 2026 Moworks.
- Copied on 2026-10-16 into `port/`:

| App file | Kit file | Changes |
|---|---|---|
| `port/port.py` | `engine/ae/port.py` | see below |
| `port/record.js` | `engine/ae/record.js` | a scene is also a mounted HF sub-composition (a top-level host with `data-composition-id`; its comp root is HF's `[data-hf-inner-root]`; its length `data-hf-authored-duration`); `<audio>` is never a scene |
| `port/ae_runtime.jsx` | `engine/ae/ae_runtime.jsx` | none (it already takes the comp rate from `DATA.fps`) |
| `port/run_jsx.ps1`, `port/ae_windows.ps1` | `engine/ae/` same names | none |
| `port/audio_mix.py` | `engine/audio/media.py` | `bake_music` removed (kit music builder); FFmpeg from the app's pins |
| `port/appenv.py` | (new) | replaces the kit's `common.py`, `render/browser.py`, `audio/loudness.ffmpeg`: pinned Chromium, pinned FFmpeg, app work folder, output folder |
| `port/hf_driver.js` | replaces `engine/runtime/driver.js` | new: the kit's `window.__aimk` interface on HF's own page; every seek is HF's `window.__hf.seek`; tween bounds of every HF timeline and `<audio>` of sub-compositions on the film clock |

`port.py` changes:

1. Recorded on HF's own page (`packages/hf-page`: HF's `bundleToSingleHtml` + HF's render file server) through `hf_driver.js`, instead of
   the kit's server + driver, which could not run HF's runtime for mounted sub-compositions (registry blocks came out blank).
2. Comp frame rate from the film (`--fps`, any rate incl. 29.97) instead of the kit's fixed 60.
3. Sample rate (`--rate`) = the rate HF's page is served at, a multiple of the film rate near 120/s: HF snaps every seek to a frame, so
   samples off that grid recorded changes one sample late (a count-up was a step behind in AE).
4. The film length from the recording, not the kit's root id `"root"` (`port.py:1433` crashed on HF's `main`).
5. Fonts: `@font-face` of every `compositions/**.html` too; a missing font names its file (or the kit font) to install.
6. Audio layers from the page (sub-composition `<audio>` included, on the film clock) instead of `index.html` only.
7. Check frames compared with HF's own stills (`hyperframes snapshot --at`, made by `index.mjs`), not the recorder's browser; check times on
   a frame of the film rate.
8. App paths: work folder `runtime/work/ae/<film>`, output folder from the caller (`<out>/<film>.aep`, `footage/`, `Audio/`).
9. Films drawn on canvases (such as a Whiteboard film): the size check names the film's kind (`canvas`, `mostly-canvas`,
   `empty`, `layers`; `dynamic`: more elements show later than there are layers at 0 s, the layers record.js reads, as a What If film made
   by React as it plays) and counts HF's own seek time per sample in its minutes; a `canvas` or `dynamic` film is not recorded, its main comp holds the
   rendered film (`--film`, the app's render of the film as it is now) as one video layer with its sound off, beside the audio layers.
   `record.js`: a top-level clip that is itself a picture (`<canvas class="clip" data-start>`) is a raster layer of the main comp, not an
   empty scene. `ae_runtime.jsx`: a footage layer's `audioOff`.

Not taken: the kit's `engine/render/serve.py` (copied first as `port/serve.py`, later removed because nothing used it; the export uses
HF's file server).

Known kit behaviours kept as they are: one-line text tracking is fitted to the first text of a layer (a count-up from "$0" is a little
wider in AE); fonts AE does not have are substituted and listed in `AE-PORT.md`; the build clears AE's caches and Undo history.
