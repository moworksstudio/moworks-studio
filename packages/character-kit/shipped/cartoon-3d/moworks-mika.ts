// Mika, one of the four office characters of the owner's 3D Cartoon source skill, as shipped: its own CharDef (src/kit/character.ts CAST.mika)
// built by its own buildCharacter. The app's wrapper for the Character library (owner #1287-#1293); nothing of the source skill is changed.
import { buildCharacter, CAST, type Character } from "cartoon-3d/kit/character";

export const CHARACTER = {
  id: "moworks-mika",
  name: "Mika",
  about: "One of the 3D Cartoon office cast: a teal hoodie and a side-swept tuft of brown hair.",
  heightM: 1.68,
  def: CAST.mika,
  build: (): Character => buildCharacter(CAST.mika),
};
