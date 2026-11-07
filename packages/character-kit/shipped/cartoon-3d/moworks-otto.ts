// Otto, one of the four office characters of the owner's 3D Cartoon source skill, as shipped: its own CharDef (src/kit/character.ts CAST.otto)
// built by its own buildCharacter. The app's wrapper for the Character library (owner #1287-#1293); nothing of the source skill is changed.
import { buildCharacter, CAST, type Character } from "cartoon-3d/kit/character";

export const CHARACTER = {
  id: "moworks-otto",
  name: "Otto",
  about: "One of the 3D Cartoon office cast: a lavender top and a green beanie.",
  heightM: 1.78,
  def: CAST.otto,
  build: (): Character => buildCharacter(CAST.otto),
};
