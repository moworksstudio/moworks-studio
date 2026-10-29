# Brand files

Made from the studio's logo artwork `Moworks Logo.ai` (large lockup variant) by `tools/brand/build_logo.py`: the badge as vector paths.
The top bar's name MOWORKS is a mask in `ui/src/brand/`.

| File | Used for | Look |
|---|---|---|
| `logo-mark.svg` | Top bar and sign-in screen, 28 x 28 CSS px (42 px on a 150% screen) | the black badge on a light grey rounded tile |
| `favicon.svg` | Window title bar and taskbar, 16 to 32 px | the same tile, the badge a little larger |
| `app.ico`, `app-256.png`, `icon-32…192.png` | The app window's taskbar button and title bar (set by the launcher), shortcuts, the browser's favicon sizes | each size rendered from favicon.svg, alpha kept |

To change: replace a file (same name), then rebuild the UI (`npm run build` in `ui/`). To rebuild from the .ai:
`python tools/brand/build_logo.py <folder with pymupdf> "<path to Moworks Logo.ai>" ui/public/brand 1.3` (needs PyMuPDF and fontTools).
