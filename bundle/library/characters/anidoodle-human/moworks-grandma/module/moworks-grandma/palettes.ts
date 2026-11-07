// GRANDMA'S PALETTE ROLES, mapped per hand. A role is fixed for the character ("cardigan" is her
// dusty rose); each hand decides how that role is MADE in its medium. The gate (check.ts) holds
// every mapping to the role's hue family, and her hair to grey (low saturation, high value),
// because a hue range alone would pass a blue rinse.
import type { Palette } from "anidoodle/canvas-core/character/render/storybook";

// storybook pencil + watercolour: transparent washes, the shadow cooler and deeper than the lit colour
export const GRANDMA_STORYBOOK: Palette = {
  skin: { base: "#f2cdb4", shade: "#d9a58d" }, nail: { base: "#f5dccd", shade: "#e4bba6" },
  hair: { base: "#d8dbe2", shade: "#a9aebb" }, hairLine: { base: "#8d93a3", shade: "#6c7282" }, brow: { base: "#a3a6ae", shade: "#868a94" },
  iris: { base: "#6d8db0", shade: "#4f6d8f" }, white: { base: "#fffaf3", shade: "#e8e0d4" }, blush: { base: "#ec9a9a", shade: "#d77c7c" },
  mouth: { base: "#8a3a40", shade: "#6b2a30" }, lip: { base: "#d98a8a", shade: "#bf6f72" },
  glasses: { base: "#c9a03c", shade: "#96752a" },
  cardigan: { base: "#c9637f", shade: "#9e4561" }, blouse: { base: "#f6eedc", shade: "#ddd0b4" }, button: { base: "#f3ead6", shade: "#c9b998" },
  skirt: { base: "#7d8aa6", shade: "#5b6680" }, stockings: { base: "#e2bfa5", shade: "#c49a80" },
  shoes: { base: "#7a4a2e", shade: "#55301c" }, shoeDark: { base: "#55301c", shade: "#3b2012" },
  cane: { base: "#8a5530", shade: "#5f361c" }, caneTip: { base: "#3a3431", shade: "#24201e" },
};
// marker comic: saturated cel flats, a hard shadow a clear step darker
export const GRANDMA_MARKER: Palette = {
  skin: { base: "#ffd3b6", shade: "#f0a585" }, nail: { base: "#ffe6d8", shade: "#f2c0a6" },
  hair: { base: "#e3e7ef", shade: "#aab2c4" }, hairLine: { base: "#7c86a0", shade: "#5c6680" }, brow: { base: "#9ba3b5", shade: "#7c8496" },
  iris: { base: "#3f7fc4", shade: "#2a5c96" }, white: { base: "#ffffff", shade: "#dfe6ee" }, blush: { base: "#ff8a9a", shade: "#e2667a" },
  mouth: { base: "#7a1f2a", shade: "#5a1119" }, lip: { base: "#ff7b87", shade: "#d9535f" },
  glasses: { base: "#f2b51c", shade: "#c48a00" },
  cardigan: { base: "#e04f7e", shade: "#a8295a" }, blouse: { base: "#fff6e0", shade: "#e8d7b0" }, button: { base: "#fff2d6", shade: "#d9c08e" },
  skirt: { base: "#5c73b5", shade: "#3b4d86" }, stockings: { base: "#f0c4a4", shade: "#d39c7c" },
  shoes: { base: "#8e4a20", shade: "#5e2e10" }, shoeDark: { base: "#5e2e10", shade: "#3e1c08" },
  cane: { base: "#9a5a2a", shade: "#6a3812" }, caneTip: { base: "#2b2633", shade: "#15122a" },
};
export const baseColours = (p: Palette): Record<string, string> => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.base]));
