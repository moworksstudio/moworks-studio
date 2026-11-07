// BƠ'S PALETTE ROLES, mapped for the MARKER COMIC hand (flat cels, a hard shadow one clear step
// darker, one heavy ink line). A role is fixed for the character ("shirt" is her coral red); the
// hand decides how that role is made. The gate (check.ts) holds every mapping to the role's hue
// family, and the blacks, whites and cream to a lightness band.
import type { Palette } from "anidoodle/canvas-core/character/render/storybook";

export const BO_MARKER: Palette = {
  skin: { base: "#f9cfa5", shade: "#e3a276" }, nail: { base: "#fde4d0", shade: "#f2c3a3" },
  // flat black hair needs a lit black and a deeper black, or the ink line vanishes into it
  hair: { base: "#2b2733", shade: "#141219" }, brow: { base: "#3a2620", shade: "#24160f" }, freckle: { base: "#b9724a", shade: "#94532f" },
  shirt: { base: "#ff6a55", shade: "#dc4433" }, shirtRib: { base: "#ec5442", shade: "#c43626" },
  shorts: { base: "#24376f", shade: "#152147" },
  boots: { base: "#8cc63f", shade: "#5f9a21" }, bootDark: { base: "#4c8418", shade: "#3a6812" }, bootIn: { base: "#2f5410", shade: "#24410c" },
  bag: { base: "#f4e7c6", shade: "#d9c59b" }, bagDark: { base: "#eadab0", shade: "#d3bf92" }, button: { base: "#a8683a", shade: "#7d4a24" },
  lunchbox: { base: "#5cbce6", shade: "#3592bd" },
  clip: { base: "#ec1f2b", shade: "#ae111b" },
  pupil: { base: "#1b1622", shade: "#1b1622" }, white: { base: "#ffffff", shade: "#e4e9ef" },
  blush: { base: "#ff8f8a", shade: "#ef6c69" }, mouth: { base: "#7a1f2a", shade: "#5a1119" }, lip: { base: "#ff7b87", shade: "#d9535f" },
};
