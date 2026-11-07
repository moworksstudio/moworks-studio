// June, one of the four office characters of the owner's 3D Cartoon source skill, as shipped: its own CharDef (src/kit/character.ts CAST.june)
// built by its own buildCharacter. The app's wrapper for the Character library (owner #1287-#1293); nothing of the source skill is changed.
import { buildCharacter, CAST, type Character } from "cartoon-3d/kit/character";

export const CHARACTER = {
  id: "moworks-june",
  name: "June",
  about: "One of the 3D Cartoon office cast: a coral top and a dark bun.",
  heightM: 1.62,
  def: CAST.june,
  build: (): Character => buildCharacter(CAST.june),
};
