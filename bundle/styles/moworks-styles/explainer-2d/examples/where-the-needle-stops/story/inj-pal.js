/* inj-pal.js: extra palette for "Where the Needle Stops" (how injections work).
 * Loads after ex/house-pal.js (the house palette) and before every inj-*.js module. Adds the clinic, the syringe, the body and the tissue colours to
 * HOUSE.pal so every module draws in one grade. Never redefine these in a module: read HOUSE.pal.
 *
 * The medicine is the one cool, glowing accent (aqua) so it reads against every warm tissue.
 */
(function () {
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  Object.assign(HOUSE.pal, {
    // clinic room at dusk: the house night palette, moved indoors
    wall: ["#1a0a52", "#24106a", "#2e1580"], // top to bottom
    wallPool: "rgba(120,80,230,0.28)", // soft light pool on the wall
    floor: "#140744",
    floorRim: "#4a2ab0",
    furniture: "#311a86",
    furnitureShade: "#22106a",
    furnitureRim: "#7d5cf0",
    lamp: "#ffb36b", // warm lamp light (the warm key light indoors)
    lampGlow: "#ff7a59",
    screen: "#5fe0ff", // monitor / lightbox glow
    // gloved hand and syringe
    glove: "#4f8cff",
    gloveShade: "#3461d6",
    gloveDeep: "#2443a8",
    gloveLight: "#8fb8ff",
    glass: "#e8e4ff", // barrel; draw it translucent (alpha 0.25-0.45) with bright edges
    glassEdge: "#ffffff",
    tick: "#ffffff",
    plunger: "#cfc6ff",
    plungerShade: "#8f84d6",
    rubber: "#3a2a7a",
    steel: "#e3e0f7",
    steelShade: "#8d87b8",
    // the medicine: one glowing aqua accent everywhere it appears
    med: "#3ff2e0",
    medGlow: "#9ffff2",
    medDeep: "#13b8b0",
    // skin and the layers under it (cross-sections)
    epidermis: "#f0a07f",
    epidermisLight: "#ffc2a1",
    dermis: "#e5787a",
    dermisShade: "#c85a6e",
    fat: "#ffcf5a",
    fatShade: "#e8a93a",
    fatLight: "#ffe79a",
    fatDeep: "#c9862e",
    muscle: "#d8325a",
    muscleShade: "#a81f4c",
    muscleLight: "#ff6a7a",
    muscleDeep: "#7e1240",
    vein: "#4f6bff",
    veinShade: "#3346c4",
    veinLight: "#8ea0ff",
    artery: "#ff3d5a",
    capillary: "#ff5470",
    blood: "#c8183e", // plasma inside vessels
    rbc: "#ff4a5e",
    rbcShade: "#c41e46",
    // digestion
    stomach: "#ff7fa8",
    stomachShade: "#d9578f",
    stomachDeep: "#a8357a",
    acid: "#b6f04a",
    acidShade: "#7fc93a",
    acidGlow: "#e4ff8a",
    enzyme: "#c04dff",
    enzymeShade: "#8a2fd0",
    insulin: "#ffd23f",
    insulinShade: "#e0a21a",
    bread: "#f2b65a",
    breadShade: "#c98a3a",
    lettuce: "#5fd36a",
    tomato: "#ff4f4f",
    cheese: "#ffd84a",
    // x-ray body (translucent figure with glowing systems)
    xray: "#22127a",
    xrayRim: "#7fd8ff",
    gut: "#ff9ec4",
    // finishing touches
    plaster: "#f4c49a",
    plasterPad: "#fff1e0",
    plasterShade: "#d9a27a",
  });
})();
