# UI fonts (bundled; nothing is fetched at run time)

All from Google Fonts' repository at one commit, `google/fonts@c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1`, downloaded 17/10/2026. Each licence file sits next to its font. "Subset" means the font was cut to Latin + Vietnamese (Agdasima: ASCII, it has no
Vietnamese) with fontTools, outlines unchanged, and saved as WOFF2.

| File | Font, used for | Author | Source (at the commit read) | Licence | How made |
|---|---|---|---|---|---|
| `BeVietnamPro-Light.woff2`, `-Regular`, `-Medium`, `-SemiBold`, `-Bold` | Be Vietnam Pro 300-700: body text in both themes | Lâm Bảo, Tony Le, Việt Anh Nguyễn (The Be Vietnam Pro Project Authors) | https://github.com/google/fonts/tree/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1/ofl/bevietnampro (upstream https://github.com/bettergui/BeVietnamPro) | SIL OFL 1.1 (`BeVietnamPro-OFL.txt`) | 400-700: the TTFs re-wrapped as WOFF2 (no glyph changes); 300: subset |
| `MPLUS1Code-wght.woff2` | M PLUS 1 Code, variable 100-700: The Desk labels; code in both themes | Coji Morishita (The M+ FONTS Project Authors, https://github.com/coz-m/MPLUS_FONTS) | https://github.com/google/fonts/blob/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1/ofl/mplus1code/MPLUS1Code%5Bwght%5D.ttf | SIL OFL 1.1 (`MPLUS1Code-OFL.txt`) | subset (3.9 MB with Japanese, 22 KB shipped) |
| `SairaCondensed-Light.woff2`, `-Regular` | Saira Condensed 300 / 400: The Desk titles | Omnibus-Type (The Saira Project Authors) | https://github.com/google/fonts/tree/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1/ofl/sairacondensed | SIL OFL 1.1, reserved font name "Saira" (`SairaCondensed-OFL.txt`) | subset |
| `Agdasima-Regular.woff2` | Agdasima: The Desk numerals (time codes, counts) | The DocRepair Project, Patric King (https://github.com/docrepair-fonts/agdasima-fonts) | https://github.com/google/fonts/tree/c13390277dfb1fcc7415d84ef7ef9cfc1e52f8c1/ofl/agdasima | SIL OFL 1.1 (`Agdasima-OFL.txt`) | subset (ASCII) |

Download sizes (bytes): M PLUS 1 Code 3,926,772; Saira Condensed Light 95,044 and Regular 95,068; Agdasima 23,152;
Be Vietnam Pro Light 136,772. Shipped: 6-23 KB each (Be Vietnam Pro 400-700: 38-41 KB, not subset).

