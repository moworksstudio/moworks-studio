// The film style's material: the library's style hint read from the style's sound section, else its name (paper and wood for crafted styles, synth for the screen ones…).
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)


// ---- The style's material: the library's style hint from the style's sound section, else its name (paper and wood for crafted
// styles, synth for CRT and tech, soft and organic for gouache and watercolour, cartoon for rubber-hose)
const STYLE_WORDS = [
  ["cartoon", /\b(rubber[- ]?hose|cartoon|toon|slapstick|boing|zany|looney|fleischer)\b/i],
  ["electronic", /\b(crt|terminal|ascii|teletype|synth\w*|electronic|digital|8-bit|chiptune|glitch\w*|sci-?fi|neon|cyber\w*|tech|hologra\w*|pixel|vhs|relays?)\b/i],
  ["paper", /\b(paper|cardboard|craft\w*|cut[- ]?outs?|collage|origami|stop[- ]?motion|scrapbook|wood(en)?|stationery|pencil|clay)\b/i],
  ["organic", /\b(gouache|watercolou?r|ink|organic|acoustic|natural|nature|hand[- ]?drawn|brush|pastel|storybook|felt|folk|foley)\b/i],
  ["cinematic", /\b(cinematic|epic|trailer|orchestral|blockbuster|hd-2d|dramatic)\b/i],
];

/** One of the library's style hints (organic, electronic, cartoon, paper, cinematic) or null. */
export function styleHint({ palette = "", id = "", title = "" } = {}) {
  for (const text of [palette, `${id ?? ""} ${title ?? ""}`.replace(/[-_/]/g, " ")]) {
    const hit = STYLE_WORDS.find(([, re]) => re.test(String(text ?? "")));
    if (hit) return hit[0];
  }
  return null;
}
