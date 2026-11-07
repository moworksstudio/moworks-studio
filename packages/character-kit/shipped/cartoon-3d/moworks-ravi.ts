// Ravi, one of the four office characters of the owner's 3D Cartoon source skill, as shipped: its own CharDef (src/kit/character.ts CAST.ravi)
// built by its own buildCharacter. The app's wrapper for the Character library (owner #1287-#1293); nothing of the source skill is changed.
import { buildCharacter, CAST, type Character } from "cartoon-3d/kit/character";

export const CHARACTER = {
  id: "moworks-ravi",
  name: "Ravi",
  about: "One of the 3D Cartoon office cast: a mustard top, short black hair and round glasses.",
  heightM: 1.75,
  def: CAST.ravi,
  build: (): Character => buildCharacter(CAST.ravi),
};
