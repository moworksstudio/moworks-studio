# Output: MP4 (transparent overlay or GIF only on request)

**Always deliver an MP4.** Make a GIF or a transparent overlay **only when the user asks for one**. Don't offer
or suggest a GIF.

```bash
node tools/render.mjs <Comp>                        # the MP4 (the default)
node tools/render.mjs <Comp> --gif                  # a GIF, only when the user asks for one
node tools/render.mjs <Comp> --mp4 --transparent    # MP4 with sound + a transparent .mov overlay
node tools/render.mjs <Comp> --preview --mp4        # half size, fast, for a quick look
```
Everything lands in `out/<Comp>/`, and the tool prints absolute paths plus a contact sheet. **Look at the contact sheet;
never play the files** (you can't hear them, and the user would).

| Output | What it is | Notes |
|---|---|---|
| **MP4** | H.264 with sound (the code-made effects, plus the voice-over if there is one, mixed to −14 LUFS) | for YouTube, social, editors. With **no voice**, the effects stay at "under a voice" level (good for an editor). For a standalone post, add `--sfx-gain 8` |
| **GIF** (only on request) | palette-optimised, loops, **no sound**, default 720 px wide at 20 fps; rendered in its own pass with the print grain held still, so it compresses ~3× better | size grows with length, grain and detail. To shrink it: `--gif-width 540`, `--gif-fps 15`, a shorter piece, or less grain (`<Page grain={0.15}>`). Design the end: a held still, or a loop back to frame 0 |
| **Transparent .mov** | ProRes 4444 **with alpha**, no paper, no grain (big files: ~18 MB per second at 1080) | for Premiere / DaVinci Resolve / Final Cut, over the user's own footage. The effects come as `<Comp>.sfx.wav` beside it |
| **Transparent .webm** (`--webm`) | VP9 with alpha | for the web |

- **Formats**: `square` 1080×1080 (posts), `vertical` 1080×1920 (Reels, Shorts, TikTok), `horizontal`
  1920×1080 (YouTube). They're set when the graphic is created (`new-graphic.mjs --format`). Rebuilding the same
  graphic in another format means a new composition with the layout re-placed, not a crop.
- **Transparent renders**: every scene must be wrapped in `<Page transparent={transparent}>` (the template does this).
  The torn-sheet edges and paper panels stay white; that's part of the look.
- **fps**: 60 is the default (smooth springs). 30 renders twice as fast if the user is in a hurry.
- **Before the final**: show the stills sheet (and optionally a `--preview`), and render the final when the user says
  go, or straight away if they asked for the file outright.
