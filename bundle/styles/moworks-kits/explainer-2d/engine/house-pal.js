/* house-pal.js: the house palette, the light rig and a few small helpers.
 * Classic script; loads right after ex/ex-core.js (and ex/ex-fx.js) and before story/film-pal.js,
 * ex/house-hero.js, ex/house-ui.js and every art module. Attaches to window.HOUSE.
 *
 * Every module reads its colours from HOUSE.pal, so a whole film stays in one grade: deep indigo
 * and violet grounds, a one-sided magenta horizon glow, saturated mids and hot accents, and light
 * that glows instead of sitting flat. A film adds its own colours in story/film-pal.js with
 * Object.assign(HOUSE.pal, { … }); never redefine these in a module.
 */
(function () {
  const HOUSE = (window.HOUSE = window.HOUSE || {});

  HOUSE.pal = {
    // night sky, top to horizon (vertical gradient)
    sky: ["#0a0230", "#14064a", "#1d0a5e", "#2a0d72"],
    skyPool: "rgba(70,40,190,0.35)", // soft blue-violet light pool in the upper sky
    // one-sided horizon glow (radial, left of frame by default), outer to hot core
    glow: ["#3a0b78", "#6f0d86", "#b3168f", "#ff3d8b", "#ff8a5c"],
    ridge: "#ff6fa5", // thin bright ridge line on the far hill
    // landscape silhouettes, far to near
    hillFar: "#36157e",
    hillFarRidge: "#c43c9c",
    hillMid: "#231066",
    hillMidRim: "#4a2ab0",
    hillNear: "#190854",
    hillNearRim: "#7d5cf0",
    fore: "#0d0334",
    props: "#2c0f6e", // fences, pylons, wires
    treeFar: "#2a2a78",
    window: ["#ffd23f", "#ffe58a"], // lit windows (with a soft halo)
    // clouds
    cloudBottom: "#170752", // equals the sky so the base dissolves into it
    cloudMid: "#272a86",
    cloudTop: "#3b46a8",
    cloudRim: "#ffb79c", // warm peach rim on the top-left edges
    cloudRimHot: "#ffe2c8",
    cloudCoolRim: "#6f7dff", // cool rim on the right/under edges
    cloudBack: "#1f0d5c",
    cloudInner: "#b9a6ff", // glow inside a cloud
    // rain
    rainFar: "#6248c0",
    rainNear: "#9a86f0",
    rainCyan: "#4fd2ff",
    // stars and sparkles
    star: ["#8c78e0", "#c9b8ff", "#f3ecff"],
    sparkCyan: "#7fe9ff",
    sparkPink: "#ff7ad9",
    // electric light: sparks, bolts, a bright flash
    boltCore: "#ffffff",
    boltRim: "#c4b0ff",
    boltGlow: "#7d63d8",
    leaderCore: "#e2d6ff",
    flash: "#f6f3ff",
    // the house character (red hoodie)
    hoodie: "#e8323e",
    hoodieShade: "#b51f3e", // cel shadow, hue-shifted toward magenta
    hoodieDeep: "#86123a", // deepest folds
    hoodieLight: "#ff6b5e", // rim / sheen
    strings: "#f7ecf4",
    jeans: "#2f4fb3",
    jeansShade: "#223b8e",
    shoes: "#f2eefc",
    shoesShade: "#b9b0dc",
    soles: "#1a1240",
    skin: "#d8916f",
    skinShade: "#b96a5a",
    skinDeep: "#9d5250",
    hair: "#2a1432",
    hairSheen: "#5c3a8e",
    eye: "#170818",
    mouth: "#7e2c3a",
    // diagrams, labels and cards
    gridBg: "#1e0452",
    gridLine: "#221a66",
    card: "#000616",
    cardBracket: "#2f3166",
    text: "#ffffff",
    notToScale: "#9a78cc",
    pill: {
      crimson: "#c8005a",
      magenta: "#b0009f",
      orange: "#ef7f12",
      cyan: "#1fa6e0",
      purple: "#3a1490",
      green: "#1ea85a",
    },
    // a sun or a warm lamp
    sun: ["#fff6c8", "#ffd84a", "#f5b70d", "#e98a1c"],
    sunGlow: "#ffd25e",
    // a globe seen from space, and two organs
    space: ["#07012a", "#0d0538", "#140848"],
    ocean: "#2f86d0",
    oceanNight: "#0d1660",
    land: "#2fb36f",
    landWarm: "#e0b84a",
    atmo: "#9bd2ff",
    cityLight: "#ffc86a",
    heart: "#e8304a",
    heartShade: "#b01e44",
    brain: "#ff7fb8",
    brainShade: "#d9579a",
  };

  /* The light rig. Key light: cool moonlight from the upper left. Back light: the magenta
   * horizon glow (left by default), which gives every silhouette a warm-pink rim on the side
   * that faces it. A flash (0..1) lifts everything toward HOUSE.pal.flash. */
  HOUSE.light = {
    key: [-0.6, -0.8], // screen-space direction TOWARD the key light
    rim: "#ff5fa0", // horizon rim colour
    cool: "#8f9dff", // cool top light tint
  };

  /* Helpers shared by every module. */
  HOUSE.lerp = (a, b, t) => a + (b - a) * t;
  HOUSE.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  // smoothstep of x between a and b (0..1)
  HOUSE.smooth = (a, b, x) => {
    const t = HOUSE.clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  // GSAP back.out(1.7): the house entrance curve for pills and title words
  HOUSE.backOut = (x, s = 1.7) => {
    x = HOUSE.clamp(x) - 1;
    return x * x * ((s + 1) * x + s) + 1;
  };
  // mix a hex colour toward another (returns [r, g, b]); used for flashes and fades
  HOUSE.mix = (h1, h2, k) => EX.mix(h1, h2, HOUSE.clamp(k));
  HOUSE.rgba = (h, a) => EX.rgba(h, a);
})();
