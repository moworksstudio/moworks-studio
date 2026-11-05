/* film-pal.js: this film's own colours, added to the house palette.
 * Loads after ex/house-pal.js and before ex/house-hero.js, ex/house-ui.js and every art module, so all
 * of them draw in one grade. Modules read HOUSE.pal; never redefine a colour inside a module.
 *
 * Add one block per subject (a room, an organ, a machine …): a lit fill, a cel shade (hue-shifted
 * toward magenta), a deep fold and a light/rim tone for each material. Keep the grounds deep indigo.
 * Give the film ONE cool, glowing hero accent that reads against every warm subject (for example
 * aqua #3ff2e0 with a glow #9ffff2 and a deep #13b8b0), and use it everywhere that thing appears.
 * A new pill colour goes in HOUSE.pal.pill (HOUSE.ui picks it up by name).
 */
(function () {
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  Object.assign(HOUSE.pal, {
    // subject: "#rrggbb", subjectShade: "#rrggbb", subjectDeep: "#rrggbb", subjectLight: "#rrggbb",
    // accent: "#3ff2e0", accentGlow: "#9ffff2", accentDeep: "#13b8b0",
  });
})();
