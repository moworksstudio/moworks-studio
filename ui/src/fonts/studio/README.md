# The Studio's fonts (bundled; nothing is fetched at run time)

The four fonts of The Studio theme, added on 26/10/2026.
Used only under `[data-theme="studio"]` (`ui/src/studio-shell.css`); The Desk never loads them. Each licence file sits next to its font
and matches the git blob of the family's `OFL.txt` in google/fonts at the app's pin `e7db6ca603fd4862010383ff17ffd6cc4ffac1c0`.

| Files | Font, used for | Author | Source (at the commit read) | Licence | How made |
|---|---|---|---|---|---|
| `Fraunces-{latin,latin-ext,vietnamese}.woff2`, `Fraunces-Italic-…` | Fraunces, variable 100-900, roman and italic: The Studio's titles | Undercase Type, Phaedra Charles, Flavia Zimbardi (upstream https://github.com/undercasetype/Fraunces) | https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/fraunces | SIL OFL 1.1 (`Fraunces-OFL.txt`) | as shipped: Google Fonts' own WOFF2 per subset (fonts.googleapis.com CSS2, fetched 18/10/2026 into `runtime/fonts/google/fraunces`), renamed only |
| `BricolageGrotesque-{latin,latin-ext,vietnamese}.woff2` | Bricolage Grotesque, variable 200-800: The Studio's interface text | Mathieu Triay (upstream https://github.com/ateliertriay/bricolage) | https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/bricolagegrotesque | SIL OFL 1.1 (`BricolageGrotesque-OFL.txt`) | as shipped (Google Fonts WOFF2, `runtime/fonts/google/bricolage-grotesque`), renamed only |
| `DMMono-{400,500}-{latin,latin-ext}.woff2` | DM Mono 400 / 500: The Studio's numbers, time codes and caps labels (no Vietnamese letters: Vietnamese falls back to the system mono) | Colophon Foundry (upstream https://github.com/googlefonts/dm-mono) | https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/dmmono | SIL OFL 1.1 (`DMMono-OFL.txt`) | as shipped (Google Fonts WOFF2, fetched 19/10/2026, `runtime/fonts/google/dm-mono`), renamed only |
| `PatrickHand.woff2` | Patrick Hand 400: The Studio's handwritten notes (pencil, tracing paper) | Patrick Wagesreiter | https://github.com/google/fonts/tree/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl/patrickhand (the app's bundled TTF came from google/fonts `47d54ca1ebb14fd864695f1d39dc734f39017c33`) | SIL OFL 1.1 (`PatrickHand-OFL.txt`) | subset to Latin + Vietnamese with fontTools, outlines unchanged, WOFF2 (made for The Studio's design concept, copied unchanged) |

Shipped: 356 KB in all (the design concept's own files, byte for byte).
