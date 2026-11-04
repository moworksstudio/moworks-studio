# Images: where the cut-outs come from

The look's objects are **black-and-white halftone engravings with a thin white paper edge** on a transparent
background. There are four sources; pick per object, in this order of preference:

| Source | Use it for |
|---|---|
| **1 · Code** | icons, glyphs, people figures, bars, charts, stamps, bulbs, gears, sparks, buttons, arrows: anything simple (`src/kit/scenes.tsx` has `PersonIcon`, `Bulb`, `Gear`, `Spark`, `Stamp`, `LineChart`…) |
| **2 · The library** | `public/library/` (see its `INDEX.md`): cut-outs made for earlier graphics. Reuse them |
| **3 · The user's images** | their own photos, objects, products, screenshots and logos, from the **inbox folder** or the **chat** (§2) |
| **4 · Generated** | objects code can't draw well (buildings, busts, globes, machines, animals, food, historic things), made with the connected **image MCP** (§3) |

---

## 1 · The user's images
- **Inbox folder** (if the user chose it at setup; `kit.config.json → images.inbox`, usually `images/`): check it at
  the start of every graphic and ask which files are meant for this one if it isn't obvious.
- **In the chat**: if a file arrives as a path (dragged in), use it. If it arrives only as a pasted picture with no
  file on disk, you can see it but not render it, so ask the user to drag the file in or drop it into the inbox.
- Copy what you use into `public/graphics/<slug>/`, or into `public/library/` if it's reusable. **Never modify the
  originals.**
- How to show each kind:
  - **An object on a transparent PNG** → `tools/halftone.py` turns it into a halftone cut-out with a paper edge, used
    with `Cutout` / `DropObject`.
  - **A photo** → `PhotoPrint` (a torn white print, black-and-white with print contrast).
  - **A screenshot** → `PhotoPrint mono={false}`: shown **untouched**, framed, never edited or faked.
  - **A logo** → used as is, small, on paper. Only official files from the user. If a logo is needed and missing, ask
    for the file. Never draw, generate or download one.

## 2 · The image-generation MCP

### Find out what's connected (once, at setup; record it in `kit.config.json → imageGeneration`)
1. Look through your tools for image generation: *generate_image, text_to_image, image, imagen, flux, recraft,
   ideogram, dall-e, gpt-image…* Read the description and the full input schema. If the MCP has a **model explorer**
   or **docs** tool, use it to see the models and their parameters.
2. Pick the model that can do **illustration / engraving** well and ideally a **transparent background**
   (a `background: transparent` style parameter). Check the cost if there's a preflight, and ask before spending.
3. Generate **one test cut-out** with the prompt below (e.g. "an antique globe on a stand"), download it, clean it
   (§3), and look at it on the paper (one still). Show it to the user.
4. Save the provider, tool, model, the parameters that worked, and whether transparency works in `kit.config.json`.
   Add the test cut-out to the library.

### Higgsfield MCP (known-good settings)
- Tool `generate_image`, `model: "gpt_image_2_5"`, `quality: "high"`, `resolution: "2k"`,
  **`background: "transparent"`**, `aspect_ratio` to suit the object (`1:1`, `4:3`, `3:4`…). Use
  `models_explore` (action `get`) to confirm the parameters; they can change.
- `get_cost: true` preflights the credits. Keep at most **4 requests in flight**. Each result is a job: wait for it,
  then download the image URL into `projects/<slug>/img-originals/`.
- To keep a series consistent, pass an earlier cut-out as an image reference (upload it first with the MCP's media
  upload tool).

### Any other image MCP
- **It supports a transparent background**: use it.
- **It doesn't**: ask for the object "on a flat, solid pure green (#00B140) background, nothing else", then key it
  out with `tools/cutout.py --key green`. Don't use a white background: the white paper border would vanish with it.
- **No image MCP at all**: draw it in code, use the library, or ask the user for images (they can generate them in
  ChatGPT or Midjourney with the prompt below and drop them in the inbox).

### The prompt (fill in the object; keep the rest)
> Collage cut-out: **<the object, its angle or pose, and what must NOT be in it>**. Rendered as a vintage engraving
> converted to coarse black-and-white halftone print, high contrast, newsprint grain. Cut out with a thin, crisp,
> slightly uneven white paper border, no glow. No text. Isolated on a fully transparent background.

(For the green-screen route, swap the last sentence for "Isolated on a flat, solid pure green (#00B140) background".)
Generate one object per image. Plan which elements must **move separately** (an arm, a lid, a needle) and generate
them as separate cut-outs.

## 3 · Clean every cut-out
```bash
uv run --with numpy --with pillow python tools/cutout.py projects/<slug>/img-originals/globe.png public/library/globe.png --max 900
uv run --with numpy --with pillow python tools/halftone.py input.png public/graphics/<slug>/thing.png    # the user's object → the look
```
- `cutout.py` makes a crisp alpha edge (it kills the soft glow halo image models leave), trims, and limits the size.
  `--key auto` detects transparent, green or white.
- `halftone.py` converts any transparent PNG into the halftone look with a white paper edge.
- Look at the result on the grid paper in a still before using it. Add reusable ones to `public/library/INDEX.md`
  (file, what it is, where it came from, date).

## 4 · Never
- a **real person's face** (no celebrities, politicians or real people as generated images; no banknote portraits)
- **brand logos** or national insignia, unless it's an official file from the user
- documents, receipts, screenshots or social posts that look **genuine** but aren't (use skeleton lines)
- coloured cut-outs: the colour lives in the type and the marks. The exception is **money**: `filter: GREEN_CUT`
- images downloaded from the web
