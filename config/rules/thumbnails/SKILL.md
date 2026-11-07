---
name: thumbnails
description: Moworks Studio's Thumbnails page (owner #1312, #1313, #1318) - an upload thumbnail of a finished film at 16:9 (1280 x 720) and 9:16 (1080 x 1920), made from one frame of the film the owner picked, with the film's title very large. The house layer; the look is the film style's own, or the Brand Kit's when the owner chose the Brand Kit way.
---

# Make the film's thumbnails (Moworks Studio)

The owner opened **Thumbnails**, chose a built film, and picked one of three frames the app took from it. You lay that frame out twice, as
two HTML pages the app renders to stills with HyperFrames:

| File | Size | Where it goes |
|---|---|---|
| `thumb-16x9.html` | 1280 x 720 | YouTube and the web (the app keeps the JPG under 2 MB) |
| `thumb-9x16.html` | 1080 x 1920 | Shorts, Reels, TikTok covers |

The app writes `film.md` (the film's title, its opening line, its style, its language) and puts the frame in `media/`. Read the files the
request lists before you design.

## 1. The title: very large, 3 to 6 words

- Take the film's **title**, or its **opening line** when the title is a working name ("Test 43 · Nutmeg Island" is a test number and a
  name: the name is the title). Shorten it to **3 to 6 words** that make someone want to watch: keep the film's own words where you can.
- In the film's language (`film.md`), with every Vietnamese mark. Never invent a claim, a number or a promise the film does not make.
- **Very large**: readable on a phone at the size a feed shows it (a 16:9 thumbnail is often 168 px wide in a list). At 1280 x 720 the
  title's cap height is at least 90 px; at 1080 x 1920 at least 110 px. Two or three lines at most.
- The title is **live text** (Editable first, house rule #1134): one element with `id="thumb-title"` in each page, holding only the words
  (no inner tags; a `<br>` is allowed), the same words in both pages. Give it `data-fit` and a fixed box (width and height): the app shrinks
  its font until it fits, so the owner can type a longer title later and it still holds. The owner may edit it in the app; nothing else on
  the page may depend on its exact words.
- Never set it in a face that lacks its letters: use a face the request lists (its file is in `fonts/`), and for Vietnamese one that has
  every mark.

## 2. The picture

- The frame is the film: never redraw it, recolour it into another style, or put a stock picture over it. You may crop it, scale it (up to
  1.25x), darken or blur a part of it behind the title, or lay a band of the style's colour under the title.
- **16:9**: the frame fills the page (`object-fit: cover`). Keep the subject (a character's face, the product) clear of the title.
- **9:16**: when `media/frame-9x16.png` exists, it is the film's own 9:16 size at the same moment: use it whole. Otherwise crop
  `media/frame-16x9.png` around its subject: look at the frame (Read it) and set `object-position` so the subject sits in the middle third,
  never cut through a face.
- Faces and the subject stay whole and in view in both sizes.
- The app takes the frame without the film's captions layer. A subtitle line drawn by the film's own code may still be in it: crop it out
  or cover it with the title's band; a thumbnail never shows the film's subtitles.

## 3. Safe zones

- 16:9: keep the title and any logo out of the bottom-right 240 x 90 px (YouTube's time stamp) and 48 px in from every edge.
- 9:16: keep the title between 240 px from the top and 420 px from the bottom (the apps' buttons and captions), 64 px from each side.

## 4. The look

- **Automatic way:** the film style's own look: its fonts (in `fonts/`), its colours and its kind of title (the style's files and the
  film's `frame.md` / `design.md` say them). A hand-drawn style keeps its hand-drawn feel, a clean style stays clean.
- **Brand Kit way:** the kit is the rule. Read `kit/FRAME.md` and search the guideline (`kit/GUIDELINE.md` lists its text and page
  sheets) for what it says about thumbnails, covers, YouTube, social posts, key visuals or title cards: layout, fonts, colours, title
  treatment, where the logo goes, safe zones. Follow it exactly and name the pages you followed in `thumb.json` (`kitPages`).
  If the guideline says **nothing** about thumbnails, set `kitRules` to `"none"` and use section 1-3's layout in the kit's fonts and
  colours, with its logo where its general rules put a logo (its clear space and smallest size). Never use a logo the kit does not give
  (`media/logos/`), and never change one.
- No gradient text, no emoji, no fake buttons or play icons, no arrows pointing at nothing, no "subscribe".

## 5. The pages

Each page is one HyperFrames composition, still (nothing moves):

```html
<!doctype html>
<html lang="en"><head><meta charset="UTF-8" />
<link rel="stylesheet" href="fonts/fonts.css" />
<style>html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; } ...</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="1" data-width="1280" data-height="720">
  <img class="bg" src="media/frame-16x9.png" alt="" />
  <h1 id="thumb-title" data-fit>Đảo Nhục Đậu Khấu</h1>
</div></body></html>
```

- Only files in this folder (`media/`, `fonts/`): nothing from the web, no scripts of your own.
- `data-width` / `data-height` and the body's size are exactly the table's sizes.
- Write `thumb.json`: `{ "title": "<the title's words>", "kitRules": "found" | "none" | null, "kitPages": "<pages you followed, or empty>", "notes": "<one line: what you chose>" }`
  (`kitRules` is null in the Automatic way).
- Run `node tools/check-thumbs.mjs` and fix what it says until it says OK. Then reply with one short line. The app renders the two
  pictures and checks the title's letters itself.
