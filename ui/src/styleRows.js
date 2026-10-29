// The Film Styles order: the app's categories in order, and styles that look alike across authors on
// the same line, so the gallery can list them next to each other. Written from the approved order sheet, by
// title as the catalog names them. Columns: Moworks, HyperFrames, Lemo Opuscar, MG Styles, Anidoodle, Brush Cartoon, What If. A style the
// sheet does not name still shows, last in its category, so a new catalog entry is never lost.
export const ROW_AUTHORS = ["moworks", "heygen", "lemomo", "vincentwei", "alexgreensh", "johnheibel", "freshstack"];

const R = (...cells) => cells.map((c) => (c ? c.split("|") : []));
export const STYLE_ROWS = [
  ["Custom", [R("General Style", "", "", "", "", "", "")]],
  ["Explainer", [R("", "Explainers, tutorials and \"how it works\"", "", "", "", "", ""), R("", "Numbers, charts and data stories", "", "", "", "", "")]],
  ["Motion graphics", [R("", "3D, simulations and generative pieces", "", "Liquid Motion", "", "", ""), R("", "", "", "Shape Morph", "", "", ""), R("", "", "", "Aurora & Glassmorphism", "", "", "")]],
  ["Music / Lyrics", [R("", "Music videos and films cut to a track", "", "", "", "", "")]],
  ["Brand / Product", [R("", "Launch, promo and feature films", "", "", "", "", "")]],
  ["Social", [R("", "Vertical and social clips (9:16)", "", "", "", "", "")]],
  ["Story", [R("", "Characters, mascots and story shorts", "", "", "", "", "")]],
  ["Presentation", [R("", "Slideshow", "", "", "", "", "")]],
  ["Video overlays", [R("", "", "", "Variety Captions", "", "", "")]],
  ["Information & Keynote", [R("", "", "Dark Tech Keynote", "", "", "", ""), R("", "", "Data Storytelling", "", "", "", ""), R("", "", "Isometric Infographic", "", "", "", ""),
    R("", "", "Sci-fi Hologram HUD", "Cyberpunk HUD / FUI", "", "", ""), R("", "", "Living Screencast", "Sticker Explainer", "", "", "")]],
  ["Graphic & Type", [R("", "", "Blueprint", "", "Cyanotype blueprint", "", ""), R("", "", "", "Flat Vector", "Flat vector", "", ""), R("", "", "Swiss Motion Graphics", "Geometric Bauhaus", "", "", ""),
    R("", "", "Art Deco", "Line Art", "", "", ""), R("", "", "ASCII / CRT Terminal", "", "", "", ""), R("", "", "Pictogram Motion", "", "", "", ""), R("", "", "60s Spy Title Sequence", "", "", "", ""),
    R("", "", "Stained Glass", "", "", "", "")]],
  ["Evidence Films", [R("", "", "Archive Light Table", "", "", "", ""), R("", "", "Engineering Briefing Board", "", "", "", ""), R("", "", "Data Physicalization", "", "", "", ""),
    R("", "", "LiDAR Survey", "", "", "", ""), R("", "", "Microscope Story", "", "", "", ""), R("", "", "Satellite Briefing", "", "", "", ""), R("", "", "Exploded Teardown", "", "", "", ""),
    R("", "", "Projection on White Model", "", "", "", "")]],
  ["Edit & Documentary", [R("", "", "Caption News", "", "", "", ""), R("", "", "Broadcast News Package", "", "", "", ""), R("", "", "1920s Newsreel", "", "", "", ""),
    R("", "", "Time-lapse Symphony", "", "", "", ""), R("", "", "Live Countdown Split-screen", "", "", "", ""), R("", "", "Constructivist Montage", "", "", "", ""),
    R("", "", "Sports Telestrator", "", "", "", ""), R("", "", "Visual Investigation", "", "", "", "")]],
  ["Cinema & Eras", [R("", "", "1920s Silent Film", "", "", "", ""), R("", "", "Liminal Found Footage", "", "", "", ""), R("", "", "", "80s Synthwave / VHS", "", "", "")]],
  ["Materials & 3D", [R("", "", "Brick Toy", "", "Toy brick", "", ""), R("", "", "Low-poly Isometric Island", "", "Low-poly", "", ""), R("", "", "", "Isometric 2.5D", "Isometric cutaway", "", ""),
    R("", "", "Paper Pop-up Book", "", "Toy-theatre paper collage", "", ""), R("", "", "Glass Product Render", "", "", "", ""), R("", "", "Tilt-Shift Miniature", "", "", "", ""),
    R("", "", "", "", "Cut-paper collage", "", ""), R("", "", "", "", "Hand embroidery", "", "")]],
  ["Games", [R("", "", "16-bit Pixel RPG", "Pixel Art", "Pixel art", "", ""), R("", "", "HD-2D", "", "", "", ""), R("", "", "Game Show Flat", "", "", "", ""), R("", "", "Microgame Frenzy", "", "", "", "")]],
  ["Cartoon & Anime", [R("", "", "80s Cel Anime", "Frame-by-Frame / Line Boil", "", "Brush cartoon", "What If"), R("", "", "1930s Rubber Hose Cartoon", "", "Rubber hose", "", ""),
    R("", "", "Mid-century Cartoon", "", "", "", ""), R("", "", "Sci-Fi Sitcom Toon", "", "", "", ""), R("", "", "", "", "Marker comic", "", "")]],
  ["Hand-drawn & Painting", [R("", "", "Watercolor Brush", "", "Storybook pencil + watercolour|Pencil & watercolour|Pastel blotch watercolour", "", ""),
    R("", "", "Chinese Ink Wash", "", "Ink & line-wash", "", ""), R("", "", "Crayon Picture Book", "", "Crayon", "", ""), R("", "", "Impasto Oil Painting", "", "Oil on canvas", "", ""),
    R("", "", "Whiteboard Explainer", "", "Chalkboard", "", ""), R("", "", "Urban Sketch · Pen & Wash", "", "Ballpoint sketch", "", ""), R("", "", "One-line Drawing", "", "", "", ""),
    R("", "", "", "", "Coloured pencil", "", ""), R("", "", "", "", "Scratchboard", "", ""), R("", "", "", "", "Charcoal, erased and redrawn", "", ""), R("", "", "", "", "Pen-and-ink stipple", "", ""),
    R("", "", "", "", "Broken colour", "", ""), R("", "", "", "", "Dream glaze", "", ""), R("", "", "", "", "Mid-century gouache", "", ""), R("", "", "", "", "Folk-tale storybook", "", ""),
    R("", "", "", "", "Almond-blossom hand", "", "")]],
  ["Print & Printmaking", [R("", "", "Risograph Print", "", "Risograph", "", ""), R("", "", "Halftone Dossier", "", "Newsprint halftone", "", ""), R("", "", "Copperplate Engraving", "", "Single-line engraving", "", ""),
    R("", "", "Woodcut Print", "", "", "", ""), R("", "", "Silkscreen Travel Poster", "", "", "", ""), R("", "", "", "Collage / Cut-out", "Archival scrapbook|Quiet archival scrapbook", "", "")]],
  ["East Asian Traditions", [R("", "", "Ukiyo-e", "", "Ukiyo-e colour woodblock", "", ""), R("", "", "", "", "Sumi-e ink painting", "", ""), R("", "", "Red Paper-cut", "", "", "", ""),
    R("", "", "Paper-cut Lightbox", "", "", "", ""), R("", "", "Shadow Puppetry", "", "", "", "")]],
];

/** Each style's place for the gallery's order: id → [category line, row within it] (a style the sheet does not name goes last in its
 *  category; a category the sheet does not name goes last). */
export function styleRank(styles) {
  const at = new Map();
  STYLE_ROWS.forEach(([category, lines], ci) => lines.forEach((cells, ri) => cells.forEach((titles, ai) => titles.forEach((title) => at.set(`${ROW_AUTHORS[ai]}|${title}`, [ci, ri])))));
  const cats = STYLE_ROWS.map(([c]) => c);
  return new Map(styles.map((s) => [s.id, at.get(`${s.author}|${s.title}`) ?? [cats.includes(s.category) ? cats.indexOf(s.category) : cats.length, 999]]));
}
