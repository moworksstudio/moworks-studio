// Build bundle/sfx/: the offline sound-effect library the app ships (packages/sfx/library.mjs reads it). Each sound below is cut from a
// CC0 / public-domain pack (tools/sfx-library-packs.json: page, author, licence, every downloaded file's bytes and SHA-256), then:
//   one-shots  silence trimmed at both ends (the attack kept, 4 ms before it), loudness -16 LUFS-I with true peak at most -1.5 dBTP
//              (plain gain, no limiter), mono, 44.1 kHz, Ogg Vorbis q4, at most 4 s (a longer one ends on a fade)
//   loops      a 20 s stretch whose last 1.5 s is cross-faded (equal power) into its start so it repeats without a seam, -28 LUFS-I
//              (a limiter holds a bed's rare loud moment under -2 dBFS), stereo, 44.1 kHz, Ogg Vorbis q3
// and written as bundle/sfx/<family>/<id>.ogg with catalog.json (each sound's tags, duration, onset, loudness, source) and CREDITS.md.
// Usage: node tools/make-sfx-library.mjs <downloads>   (<downloads>/<pack key>/… as downloaded and unpacked; nothing is downloaded here).
// The whole of bundle/sfx is remade; the build stops when the library would pass 25 MB.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { APP_ROOT } from "../packages/version-manager/index.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { FAMILIES } from "../packages/sfx/library.mjs";

const run = promisify(execFile);
const ONE = { lufs: -16, tp: -1.5, q: 4, max: 4 }, LOOP = { lufs: -28, tp: -1.5, q: 3, len: 20, xfade: 1.5 };
const BUDGET = 25 * 1048576, READ = "2026-10-30";

// [id, family, pack, original file (its name inside the pack), tags, { seg: [start, seconds], fade: [in, out], max, loop }]
// Tags: the words a storyboard cue may use, plus a style (organic: recorded; electronic; cartoon; cinematic; paper).
const SPEC = [
  // pops and entrances
  ["pop-pluck-1", "pop", "kenney-interface-sounds", "pluck_001.ogg", "pop, pluck, plink, pop in, appear, entrance, soft, light, cartoon, thread pluck, string pluck, electronic"],
  ["pop-pluck-2", "pop", "kenney-interface-sounds", "pluck_002.ogg", "pop, pluck, plink, pop in, appear, entrance, soft, light, cartoon, thread pluck, string pluck, electronic"],
  ["pop-drop-1", "pop", "kenney-interface-sounds", "drop_001.ogg", "pop, drop, plop, soft pop, appear, entrance, land, ui, electronic"],
  ["pop-drop-2", "pop", "kenney-interface-sounds", "drop_002.ogg", "pop, drop, plop, soft pop, appear, entrance, land, ui, electronic"],
  ["pop-plop-1", "pop", "oga-100-cc0-sfx", "plop_01.ogg", "pop, plop, bloop, cork, mouth pop, appear, entrance, cartoon, needle, poke, pierce, puncture, organic"],
  ["pop-plop-2", "pop", "oga-100-cc0-sfx", "plop_02.ogg", "pop, plop, bloop, cork, mouth pop, appear, entrance, cartoon, needle, poke, pierce, puncture, organic"],
  ["pop-bubble-1", "pop", "oga-40-cc0-water-splash-slime-sfx", "bubble_01.ogg", "pop, bubble, bubble pop, blop, burst, appear, cartoon, organic"],
  ["pop-bubble-2", "pop", "oga-bubble-sound-effects", "bubbles-single1.wav", "pop, bubble, bubble pop, blop, burst, appear, cartoon, organic"],
  ["pop-bubble-3", "pop", "oga-bubble-sound-effects", "bubbles-single3.wav", "pop, bubble, bubble pop, blop, burst, appear, cartoon, organic"],
  ["pop-pep-1", "pop", "kenney-digital-audio", "pepSound1.ogg", "pop, blip, boop, bloop, appear, entrance, game, cartoon, electronic"],
  ["pop-appear-1", "pop", "kenney-interface-sounds", "maximize_001.ogg", "pop, appear, pop up, open, expand, grow, entrance, reveal, ui, electronic"],
  ["pop-appear-2", "pop", "kenney-interface-sounds", "maximize_006.ogg", "pop, appear, pop up, open, expand, grow, entrance, reveal, ui, electronic"],
  ["pop-boing-1", "pop", "oga-100-cc0-sfx", "spring_01.ogg", "boing, spring, bounce, bouncy, jump, cartoon, comic, organic"],
  ["pop-boing-2", "pop", "oga-100-cc0-sfx", "spring_05.ogg", "boing, spring, bounce, bouncy, jump, cartoon, comic, organic"],
  // exits and whooshes
  ["whoosh-swish-light-1", "whoosh", "oga-swishes-sound-pack", "swish-1.wav", "whoosh, swish, swipe, quick, light, short, fast, move, slide in, organic"],
  ["whoosh-swish-heavy-1", "whoosh", "oga-swishes-sound-pack", "swish-7.wav", "whoosh, swish, swing, heavy, strong, fast, whip, organic"],
  ["whoosh-swish-heavy-2", "whoosh", "oga-swishes-sound-pack", "swish-9.wav", "whoosh, swish, swing, heavy, strong, fast, whip, organic"],
  ["whoosh-air-soft-1", "whoosh", "oga-100-cc0-sfx-2", "sfx100v2_air_02.ogg", "whoosh, air, soft whoosh, soft, gentle, breeze, transition, pass by, organic"],
  ["whoosh-air-long-1", "whoosh", "oga-100-cc0-sfx-2", "sfx100v2_air_01.ogg", "whoosh, air, long whoosh, slow, swell, transition, rush, cinematic, organic"],
  ["whoosh-air-short-1", "whoosh", "oga-100-cc0-sfx-2", "sfx100v2_air_03.ogg", "whoosh, air, short whoosh, short, quick, puff, flap, wing flap, flutter, soft, soft whoosh, organic"],
  ["whoosh-blade-1", "whoosh", "oga-80-cc0-rpg-sfx", "blade_01.ogg", "whoosh, blade, swing, sword, slash, cut, swish, fast, organic"],
  ["whoosh-blade-2", "whoosh", "kenney-rpg-audio", "drawKnife1.ogg", "whoosh, unsheathe, draw, blade, knife, metal, swish, organic"],
  ["whoosh-scroll-1", "whoosh", "kenney-interface-sounds", "scroll_001.ogg", "whoosh, scroll, swipe, slide, ui, short, electronic"],
  ["whoosh-exit-1", "whoosh", "kenney-interface-sounds", "minimize_001.ogg", "whoosh, exit, out, close, shrink, disappear, leave, ui, electronic"],
  ["whoosh-phaser-down-1", "whoosh", "kenney-digital-audio", "phaserDown1.ogg", "whoosh, exit, down, drop, sci-fi, zap down, electronic"],
  ["whoosh-forcefield-1", "whoosh", "kenney-sci-fi-sounds", "forceField_000.ogg", "whoosh, energy, swell, rise, sci-fi, power, cinematic, electronic"],
  ["whoosh-thruster-1", "whoosh", "kenney-sci-fi-sounds", "thrusterFire_000.ogg", "whoosh, rush, rocket, jet, thruster, deep, big, sci-fi, cinematic"],
  ["whoosh-card-1", "whoosh", "kenney-casino-audio", "card-fan-1.ogg", "whoosh, card, fan, flick, swish, quick, paper, organic"],
  // impacts
  ["impact-soft-1", "impact", "kenney-impact-sounds", "impactSoft_medium_000.ogg", "impact, soft, soft impact, thud, bump, cushion, pillow, land, organic"],
  ["impact-soft-2", "impact", "kenney-impact-sounds", "impactSoft_medium_002.ogg", "impact, soft, soft impact, thud, bump, cushion, pillow, land, organic"],
  ["impact-thud-heavy-1", "impact", "kenney-impact-sounds", "impactSoft_heavy_000.ogg", "impact, thud, heavy, body, body thud, fall, drop, land, thump, cinematic, organic"],
  ["impact-thud-heavy-2", "impact", "kenney-impact-sounds", "impactSoft_heavy_003.ogg", "impact, thud, heavy, body, body thud, fall, drop, land, thump, cinematic, organic"],
  ["impact-body-1", "impact", "kenney-impact-sounds", "impactPunch_medium_000.ogg", "impact, punch, hit, body, body hit, smack, fight, organic"],
  ["impact-body-2", "impact", "kenney-impact-sounds", "impactPunch_heavy_000.ogg", "impact, punch, heavy, hit, body, smack, fight, cinematic, organic"],
  ["impact-wood-light-1", "impact", "kenney-impact-sounds", "impactWood_light_000.ogg", "impact, wood, knock, door knock, tap, light, wooden, spool, bobbin, rattle, clatter, roll, small wood, organic"],
  ["impact-wood-1", "impact", "kenney-impact-sounds", "impactWood_medium_000.ogg", "impact, wood, wooden, hit, block, thunk, spool, bobbin, rattle, clatter, organic"],
  ["impact-wood-heavy-1", "impact", "kenney-impact-sounds", "impactWood_heavy_000.ogg", "impact, wood, heavy, slam, crate, box, organic"],
  ["impact-metal-light-1", "impact", "kenney-impact-sounds", "impactMetal_light_000.ogg", "impact, metal, clink, tap, light, organic"],
  ["impact-metal-1", "impact", "kenney-impact-sounds", "impactMetal_medium_000.ogg", "impact, metal, clang, hit, pipe, organic"],
  ["impact-metal-heavy-1", "impact", "kenney-impact-sounds", "impactMetal_heavy_000.ogg", "impact, metal, heavy, clang, bang, cinematic, organic"],
  ["impact-glass-light-1", "impact", "kenney-impact-sounds", "impactGlass_light_000.ogg", "impact, glass, clink, tink, light, cup, organic"],
  ["impact-glass-1", "impact", "kenney-impact-sounds", "impactGlass_medium_000.ogg", "impact, glass, clink, bottle, jar, organic"],
  ["impact-plate-1", "impact", "kenney-impact-sounds", "impactPlate_light_000.ogg", "impact, ceramic, plate, dish, clink, kitchen, organic"],
  ["impact-generic-1", "impact", "kenney-impact-sounds", "impactGeneric_light_000.ogg", "impact, tap, knock, light, small, organic"],
  ["impact-stone-1", "impact", "oga-80-cc0-rpg-sfx", "stones_01.ogg", "impact, stone, rock, hit, pebble, organic"],
  ["impact-slam-1", "impact", "oga-100-cc0-sfx", "slam_01.ogg", "impact, slam, heavy, bang, organic"],
  ["impact-explosion-1", "impact", "kenney-sci-fi-sounds", "lowFrequency_explosion_000.ogg", "explosion, boom, blast, big impact, rumble, deep, cinematic"],
  ["impact-explosion-2", "impact", "kenney-sci-fi-sounds", "explosionCrunch_000.ogg", "explosion, blast, crunch, burst, debris, cinematic"],
  // footsteps
  ["footstep-wood-1", "footstep", "kenney-impact-sounds", "footstep_wood_000.ogg", "footstep, step, walk, wood, wooden floor, indoor, floor, organic"],
  ["footstep-wood-2", "footstep", "kenney-impact-sounds", "footstep_wood_003.ogg", "footstep, step, walk, wood, wooden floor, indoor, floor, organic"],
  ["footstep-wood-soft-1", "footstep", "oga-100-cc0-sfx-2", "sfx100v2_footstep_wood_01.ogg", "footstep, step, walk, wood, soft, indoor, quiet, organic"],
  ["footstep-carpet-soft-1", "footstep", "kenney-impact-sounds", "footstep_carpet_000.ogg", "footstep, step, walk, carpet, soft, indoor, quiet, sneak, organic"],
  ["footstep-carpet-soft-2", "footstep", "kenney-impact-sounds", "footstep_carpet_003.ogg", "footstep, step, walk, carpet, soft, indoor, quiet, sneak, organic"],
  ["footstep-concrete-1", "footstep", "kenney-impact-sounds", "footstep_concrete_000.ogg", "footstep, step, walk, concrete, stone, pavement, street, hard, outdoor, organic"],
  ["footstep-concrete-2", "footstep", "kenney-impact-sounds", "footstep_concrete_003.ogg", "footstep, step, walk, concrete, stone, pavement, street, hard, outdoor, organic"],
  ["footstep-grass-1", "footstep", "kenney-impact-sounds", "footstep_grass_000.ogg", "footstep, step, walk, grass, outdoor, nature, field, soft, organic"],
  ["footstep-grass-2", "footstep", "kenney-impact-sounds", "footstep_grass_003.ogg", "footstep, step, walk, grass, outdoor, nature, field, soft, organic"],
  ["footstep-snow-1", "footstep", "kenney-impact-sounds", "footstep_snow_000.ogg", "footstep, step, walk, snow, winter, crunch, outdoor, organic"],
  ["footstep-gravel-1", "footstep", "oga-42-snow-and-gravel-footsteps", "Corsica_S-Walking_on_snow_covered_gravel_01.flac", "footstep, step, walk, gravel, snow, crunch, path, outdoor, organic"],
  ["footstep-wet-1", "footstep", "oga-100-cc0-sfx-2", "sfx100v2_footstep_wet_01.ogg", "footstep, step, walk, wet, puddle, rain, outdoor, splash, organic"],
  ["footstep-indoor-1", "footstep", "kenney-rpg-audio", "footstep00.ogg", "footstep, step, walk, indoor, floor, boot, shoe, organic"],
  // cloth and rustle
  ["cloth-rustle-1", "cloth", "kenney-rpg-audio", "cloth1.ogg", "cloth, rustle, fabric, clothes, move, shuffle, jacket, thread, needle, stitch, sew, sewing, embroider, embroidery, pull, tug, knot, linen, yarn, floss, unspool, unwind, unravel, organic"],
  ["cloth-rustle-2", "cloth", "kenney-rpg-audio", "cloth2.ogg", "cloth, rustle, fabric, clothes, move, shuffle, jacket, thread, needle, stitch, sew, sewing, embroider, embroidery, pull, tug, knot, linen, yarn, floss, unspool, unwind, unravel, organic"],
  ["cloth-belt-1", "cloth", "kenney-rpg-audio", "clothBelt.ogg", "cloth, belt, leather, buckle, organic"],
  ["cloth-leather-1", "cloth", "kenney-rpg-audio", "handleSmallLeather.ogg", "cloth, leather, bag, pouch, grab, thread, needle, stitch, sew, sewing, embroider, embroidery, pull, tug, knot, linen, yarn, floss, organic"],
  ["cloth-drop-1", "cloth", "kenney-rpg-audio", "dropLeather.ogg", "cloth, drop, bag, leather, soft, put down, organic"],
  ["cloth-fabric-1", "cloth", "oga-202-more-sound-effects", "Cloth_01.wav", "cloth, fabric, rustle, shake, sheet, flutter, flap, wing, wing flutter, wing flap, flag, sail, cape, curtain, organic"],
  ["cloth-velcro-1", "cloth", "oga-202-more-sound-effects", "Velcro_01.wav", "cloth, velcro, rip, strap, tear, organic"],
  ["cloth-leaves-1", "cloth", "oga-20-rustles-dry-leaves", "rustle01.flac", "rustle, leaves, leaf, bush, foliage, dry leaves, nature, organic"],
  ["cloth-leaves-2", "cloth", "oga-20-rustles-dry-leaves", "rustle07.flac", "rustle, leaves, leaf, bush, foliage, dry leaves, nature, organic"],
  ["cloth-plastic-1", "cloth", "oga-202-more-sound-effects", "Plastic_01.wav", "crinkle, plastic, wrapper, bag, rustle, organic"],
  // paper
  ["paper-handle-1", "paper", "oga-100-cc0-sfx", "paper_01.ogg", "paper, sheet, handle, rustle, paper rustle, pencil, pen, scribble, write, writing, sketch, organic"],
  ["paper-handle-2", "paper", "oga-100-cc0-sfx", "paper_02.ogg", "paper, sheet, handle, rustle, paper rustle, pencil, pen, scribble, write, writing, sketch, organic"],
  ["paper-flip-1", "paper", "kenney-rpg-audio", "bookFlip1.ogg", "paper, page, flip, page turn, turn, book, organic"],
  ["paper-flip-2", "paper", "kenney-rpg-audio", "bookFlip2.ogg", "paper, page, flip, page turn, turn, book, organic"],
  ["paper-flip-3", "paper", "oga-10-book-page-flips", "book_flip.1.ogg", "paper, page, flip, page turn, turn, book, organic"],
  ["paper-book-open-1", "paper", "kenney-rpg-audio", "bookOpen.ogg", "paper, book, open, book open, cover, box, box open, lid, lid open, small box, cardboard, organic"],
  ["paper-book-close-1", "paper", "kenney-rpg-audio", "bookClose.ogg", "paper, book, close, book close, shut, thump, box, box close, lid, lid close, small box, cardboard, organic"],
  ["paper-book-place-1", "paper", "kenney-rpg-audio", "bookPlace1.ogg", "paper, book, place, put down, set down, box, box drop, drop, cardboard, set box down, organic"],
  ["paper-map-open-1", "paper", "oga-opening-and-closing-a-map-sounds", "snd_use_map.wav", "paper, unfold, map, open, sheet, large paper, organic"],
  ["paper-map-close-1", "paper", "oga-opening-and-closing-a-map-sounds", "snd_close_map.wav", "paper, fold, map, close, organic"],
  ["paper-crumple-1", "paper", "commons-food-wrapper-crumpling", "Food_wrapper_crumpling.ogg", "paper, crumple, crush, crinkle, ball, scrunch, wrapper, foil, organic", { seg: [0.3, 1.45] }],
  ["paper-crumple-2", "paper", "commons-food-wrapper-crumpling", "Food_wrapper_crumpling.ogg", "paper, crumple, crush, crinkle, ball, scrunch, wrapper, foil, organic", { seg: [1.75, 2.2], fade: [0.01, 0.3] }],
  ["paper-slide-1", "paper", "kenney-casino-audio", "card-slide-1.ogg", "paper, slide, paper slide, card, swipe, deal, organic"],
  ["paper-card-place-1", "paper", "kenney-casino-audio", "card-place-1.ogg", "paper, card, place, deal, tap, put down, organic"],
  ["paper-shuffle-1", "paper", "kenney-casino-audio", "card-shuffle.ogg", "paper, cards, shuffle, riffle, deck, organic", { max: 2.5 }],
  ["paper-turn-page-1", "paper", "oga-various-sound-effects", "turn_page.wav", "paper, page, turn, page turn, flip, book, organic"],
  // door, drawer and switch
  ["door-open-1", "door", "kenney-rpg-audio", "doorOpen_1.ogg", "door, open, door open, wood, handle, creak, organic"],
  ["door-open-2", "door", "oga-door-open-door-close-set", "qubodup-DoorOpen01.flac", "door, open, door open, wood, handle, organic"],
  ["door-close-1", "door", "kenney-rpg-audio", "doorClose_1.ogg", "door, close, door close, shut, wood, organic"],
  ["door-close-2", "door", "kenney-rpg-audio", "doorClose_3.ogg", "door, close, door close, shut, wood, organic"],
  ["door-close-heavy-1", "door", "oga-door-open-door-close-set", "qubodup-DoorClose01.flac", "door, close, door close, heavy, slam, shut, organic"],
  ["door-creak-1", "door", "kenney-rpg-audio", "creak1.ogg", "door, creak, squeak, hinge, old, spooky, organic"],
  ["door-creak-2", "door", "oga-various-sound-effects", "door_creak_open.wav", "door, creak, squeak, hinge, old, spooky, open, organic"],
  ["door-drawer-open-1", "door", "oga-various-sound-effects", "drawer_open.wav", "drawer, open, drawer open, slide, desk, cabinet, organic"],
  ["door-drawer-close-1", "door", "oga-various-sound-effects", "drawer_close.wav", "drawer, close, drawer close, shut, slide, desk, cabinet, organic"],
  ["door-lock-1", "door", "oga-various-sound-effects", "lock.wav", "lock, key, unlock, latch, door lock, key turn, organic"],
  ["door-latch-1", "door", "kenney-rpg-audio", "metalLatch.ogg", "latch, gate, metal, door, catch, organic"],
  ["door-scifi-open-1", "door", "kenney-sci-fi-sounds", "doorOpen_000.ogg", "door, open, sci-fi, automatic, sliding door, hiss, electronic"],
  ["door-scifi-close-1", "door", "kenney-sci-fi-sounds", "doorClose_000.ogg", "door, close, sci-fi, automatic, sliding door, hiss, electronic"],
  ["switch-1", "switch", "kenney-interface-sounds", "switch_001.ogg", "switch, toggle, flip, on, off, ui, electronic"],
  ["switch-toggle-1", "switch", "kenney-interface-sounds", "toggle_001.ogg", "toggle, switch, ui, on off, electronic"],
  ["switch-button-1", "switch", "kenney-ui-audio", "switch1.ogg", "switch, button, click, press, ui, electronic"],
  ["switch-light-on-1", "switch", "oga-various-sound-effects", "switch_on.wav", "switch, light switch, switch on, light on, lamp, lamp on, wall switch, organic"],
  ["switch-light-off-1", "switch", "oga-various-sound-effects", "switch_off.wav", "switch, light switch, switch off, light off, lamp, lamp off, organic"],
  ["switch-plug-in-1", "switch", "oga-sfx-plug-in-plug-out", "Plug-in.wav", "plug, plug in, connect, cable, insert, charge, charger, usb, socket, organic"],
  ["switch-plug-out-1", "switch", "oga-sfx-plug-in-plug-out", "Plug-out.wav", "plug, unplug, plug out, disconnect, cable, pull, organic"],
  ["switch-mechanical-1", "switch", "oga-100-cc0-sfx", "switch_01.ogg", "switch, mechanical, lever, click, organic"],
  // water
  ["water-drip-1", "water", "oga-dripping-water-loop", "atmosbasement.mp3_.flac", "water, drip, water drip, drop, droplet, leak, tap drip, plink, organic", { seg: [2.25, 0.6] }],
  ["water-drip-2", "water", "oga-dripping-water-loop", "atmosbasement.mp3_.flac", "water, drip, water drip, drop, droplet, leak, tap drip, plink, organic", { seg: [4.52, 0.55] }],
  ["water-drip-3", "water", "oga-dripping-water-loop", "atmosbasement.mp3_.flac", "water, drip, water drip, drop, droplet, leak, tap drip, plink, organic", { seg: [6.68, 0.65] }],
  ["water-splash-1", "water", "oga-40-cc0-water-splash-slime-sfx", "splash_01.ogg", "water, splash, big splash, jump in, dive, plunge, organic"],
  ["water-splash-2", "water", "oga-40-cc0-water-splash-slime-sfx", "splash_04.ogg", "water, splash, jump in, dive, plunge, organic"],
  ["water-splash-3", "water", "oga-6-short-water-splashes", "water_splash-01.flac", "water, splash, jump in, dive, organic"],
  ["water-splash-small-1", "water", "oga-40-cc0-water-splash-slime-sfx", "splash_09.ogg", "water, small splash, splash, paddle, oar, oar paddle, row, rowing, boat, ripple, fish, koi, swim, fin, fish swim, organic"],
  ["water-splash-small-2", "water", "oga-40-cc0-water-splash-slime-sfx", "splash_10.ogg", "water, small splash, splash, paddle, oar, oar paddle, row, rowing, boat, ripple, fish, koi, swim, fin, fish swim, organic"],
  ["water-pour-1", "water", "commons-pouring-water-in-mug-in-sink", "Pouring_water_in_mug_in_sink.ogg", "water, pour, pouring, mug, cup, glass, fill, tea, drink, organic", { seg: [3.4, 3.6], fade: [0.05, 0.4] }],
  ["water-pour-2", "water", "commons-pouring-water-bottles", "Pouring_water_bottles.ogg", "water, pour, pouring, bottle, glug, organic", { seg: [6.65, 1.2] }],
  ["water-tap-1", "water", "oga-various-sound-effects", "tap_water.wav", "water, tap, faucet, sink, running water, kitchen, organic", { max: 3 }],
  ["water-stream-1", "water", "oga-100-cc0-sfx-2", "sfx100v2_loop_water_01.ogg", "water, stream, flow, flowing, brook, trickle, running water, river, organic", { fade: [0.2, 0.6] }],
  ["water-bubbles-1", "water", "oga-40-cc0-water-splash-slime-sfx", "loop_bubbles_1.ogg", "water, bubbles, bubbling, underwater, gurgle, fish tank, aquarium, stomach, tummy, stomach gurgle, organic", { max: 3.5, fade: [0.1, 0.5] }],
  ["water-boil-1", "water", "oga-boiling-water-loops", "cooking_without_cover_01_0.ogg", "water, boil, boiling, pot, kettle, simmer, cooking, organic", { fade: [0.2, 0.6] }],
  ["water-wave-1", "water", "oga-beach-ocean-waves", "wave_01_cc0-18363__jasinski__alkaibeach.flac", "water, wave, sea, ocean, beach, surf, wave crash, shore, organic"],
  ["water-wave-2", "water", "oga-beach-ocean-waves", "wave_04_cc0-18363__jasinski__alkaibeach.flac", "water, wave, sea, ocean, beach, surf, wave crash, shore, organic"],
  ["water-drink-1", "water", "oga-202-more-sound-effects", "Drink_01.wav", "water, drink, gulp, sip, swallow, organic"],
  // wind and rain
  ["wind-gust-1", "wind", "oga-wind-whoosh-loop", "wind woosh loop.ogg", "wind, gust, gust of wind, whoosh, breeze, blow, cinematic, organic", { seg: [0, 2.6], fade: [0.3, 0.8] }],
  ["wind-gust-2", "wind", "oga-mild-wind-background-noise", "wind background noise 2.wav", "wind, gust, strong wind, blow, organic", { seg: [36, 3.5], fade: [0.5, 1] }],
  ["wind-howl-1", "wind", "commons-howling-wind", "Howling_wind.ogg", "wind, howl, howling wind, gust, storm, blizzard, cinematic, organic", { seg: [70, 4], fade: [0.4, 1] }],
  ["wind-mild-loop-1", "wind", "oga-mild-wind-background-noise", "wind background noise 2.wav", "wind, breeze, mild wind, light wind, outdoor, field, ambience, organic", { loop: true, seg: [6] }],
  ["wind-howling-loop-1", "wind", "commons-howling-wind", "Howling_wind.ogg", "wind, howling wind, howl, storm, blizzard, snowstorm, winter, gale, strong wind, cold, ambience, organic", { loop: true, seg: [20] }],
  ["rain-loop-1", "rain", "oga-rain-loopable", "1.ogg", "rain, rainfall, steady rain, shower, window, ambience, organic", { loop: true, seg: [0] }],
  ["rain-heavy-loop-1", "rain", "oga-amb-rain-loop-1", "amb_rain_loop_1.ogg", "rain, heavy rain, downpour, roof, storm, ambience, organic", { loop: true, seg: [10] }],
  ["rain-thunder-1", "rain", "oga-rain-long-thunder", "rain-thunder.ogg", "thunder, rumble, storm, thunderstorm, lightning, rain, cinematic, organic", { seg: [19, 10], fade: [0.3, 1.5], max: 10 }],
  ["rain-thunder-2", "rain", "oga-100-cc0-sfx-2", "sfx100v2_thunder_01.ogg", "thunder, crack, thunderclap, storm, lightning, cinematic, organic", { max: 6 }],
  // fire
  ["fire-crackle-loop-1", "fire", "oga-fireplace-sound-loop", "fire.wav", "fire, crackle, fireplace, campfire, burning, wood fire, cozy, hearth, ambience, organic", { loop: true, seg: [10] }],
  ["fire-crackle-1", "fire", "oga-fire-crackling", "fire-1.wav", "fire, crackle, pop, ember, burning, organic"],
  ["fire-match-1", "fire", "oga-various-sound-effects", "match.wav", "fire, match, strike, match strike, light, ignite, candle, organic"],
  ["fire-whoosh-1", "fire", "oga-80-cc0-rpg-sfx", "spell_fire_01.ogg", "fire, whoosh, flame, burst, ignite, torch, fireball, cinematic"],
  ["fire-whoosh-2", "fire", "oga-80-cc0-rpg-sfx", "spell_fire_04.ogg", "fire, whoosh, flame, burst, ignite, torch, fireball, cinematic"],
  // bells and chimes
  ["bell-ding-1", "bell", "oga-bell-dingschimes", "bell_ding1.wav", "bell, ding, bell ding, chime, ring, notification, ting, lamp ting, organic"],
  ["bell-ding-2", "bell", "oga-bell-dingschimes", "bell_ding3.wav", "bell, ding, bell ding, chime, ring, notification, ting, lamp ting, organic"],
  ["bell-correct-1", "bell", "oga-correct-bell", "bell.wav", "bell, ding, correct, success, right, positive, reward, chime, organic"],
  ["bell-small-1", "bell", "oga-100-cc0-sfx", "bell_01.ogg", "small bell, bell, ting, ring, ding, tinkle, organic"],
  ["bell-gong-1", "bell", "oga-100-cc0-sfx", "gong_01.ogg", "gong, bell, deep, temple, cinematic, organic"],
  ["bell-heavy-1", "bell", "kenney-impact-sounds", "impactBell_heavy_000.ogg", "heavy bell, bell, clang, toll, big bell, metal, cinematic, organic"],
  ["bell-ring-1", "bell", "commons-bell-ring", "Bell-ring.flac", "ship bell, boat bell, bell, ring, hand bell, ding, organic"],
  ["bell-bicycle-1", "bell", "commons-bicycle-bell-1", "Bicycle-bell-1.wav", "bicycle bell, bike bell, bell, ring ring, ding, organic"],
  ["bell-church-1", "bell", "commons-church-bells-leverkusen-2007", "Church_bells_-_Leverkusen,_2007.oga", "church bell, bell, church, toll, tower, chime, town, organic", { seg: [1, 7], fade: [0.01, 1.2] }],
  ["bell-desk-1", "bell", "oga-various-sound-effects", "bell.wav", "desk bell, service bell, bell, reception, ding, counter, organic"],
  ["bell-ting-1", "bell", "kenney-interface-sounds", "glass_001.ogg", "ting, tink, glass ting, chime, lamp ting, light on, sparkle, bell, electronic"],
  ["bell-ting-2", "bell", "kenney-interface-sounds", "glass_004.ogg", "ting, tink, glass ting, chime, lamp ting, light on, sparkle, bell, electronic"],
  ["bell-bong-1", "bell", "kenney-interface-sounds", "bong_001.ogg", "bong, bell, chime, soft, notification, ui, electronic"],
  // clicks and UI
  ["click-1", "click", "kenney-interface-sounds", "click_001.ogg", "click, tap, button, press, ui, electronic"],
  ["click-2", "click", "kenney-interface-sounds", "click_003.ogg", "click, tap, button, press, ui, electronic"],
  ["click-mouse-1", "click", "kenney-ui-audio", "mouseclick1.ogg", "click, mouse, mouse click, computer, organic"],
  ["click-select-1", "click", "kenney-interface-sounds", "select_001.ogg", "select, choose, highlight, blip, click, ui, electronic"],
  ["click-tick-1", "click", "kenney-interface-sounds", "tick_001.ogg", "tick, tiny click, soft, ui, electronic"],
  ["click-clock-tick-1", "click", "oga-ticking-clock", "ticking clock - tick1.wav", "tick, clock, clock tick, tock, tick tock, second, watch, time, organic"],
  ["click-confirm-1", "click", "kenney-interface-sounds", "confirmation_001.ogg", "confirm, confirmation, success, positive, done, notification, chime, ui, electronic"],
  ["click-confirm-2", "click", "kenney-interface-sounds", "confirmation_002.ogg", "confirm, confirmation, success, positive, done, notification, chime, ui, electronic"],
  ["click-error-1", "click", "kenney-interface-sounds", "error_001.ogg", "error, wrong, fail, negative, buzz, denied, ui, electronic"],
  ["click-error-2", "click", "kenney-interface-sounds", "error_004.ogg", "error, wrong, fail, negative, buzz, denied, ui, electronic"],
  ["click-metal-1", "click", "kenney-rpg-audio", "metalClick.ogg", "click, metal, latch, trigger, mechanism, organic"],
  ["click-camera-1", "click", "oga-202-more-sound-effects", "Camera_01.wav", "click, camera, shutter, photo, snapshot, picture, organic"],
  // typing, keyboard and typewriter
  ["typing-keyboard-1", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "human_vel-003.wav", "typing, keyboard, keyboard typing, keys, type, computer, office, writing, organic", { max: 3 }],
  ["typing-keyboard-2", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "human_vel-006.wav", "typing, keyboard, keyboard typing, keys, type, computer, office, writing, organic", { max: 3 }],
  ["typing-keyboard-3", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "human_vel-009.wav", "typing, keyboard, keyboard typing, keys, type, computer, office, writing, organic", { max: 3 }],
  ["typing-keyboard-fast-1", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "generated-005_fast.wav", "typing, keyboard, fast typing, rapid, keys, type, computer, organic", { max: 3 }],
  ["typing-key-1", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "keypress-001.wav", "key, keypress, keystroke, single key, key tap, keyboard, organic"],
  ["typing-key-2", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "keypress-013.wav", "key, keypress, keystroke, single key, key tap, keyboard, organic"],
  ["typing-key-heavy-1", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "keypress-006.wav", "key, enter, enter key, heavy enter key, return, heavy, space bar, keypress, keyboard, organic"],
  ["typing-key-heavy-2", "typing", "oga-keyboard-soundpack-1-typing-and-single-keystrokes", "keypress-017.wav", "key, enter, enter key, heavy enter key, return, heavy, space bar, keypress, keyboard, organic"],
  ["typing-typewriter-1", "typing", "oga-typewriter-sounds", "typewriter1.wav", "typewriter, typewriter key, strike, clack, old, vintage, retro, mechanical, organic"],
  ["typing-typewriter-2", "typing", "oga-typewriter-sounds", "typewriter3.wav", "typewriter, typewriter key, strike, clack, old, vintage, retro, mechanical, organic"],
  ["typing-typewriter-3", "typing", "oga-typewriter-sounds", "typewriter5.wav", "typewriter, typewriter key, strike, clack, old, vintage, retro, mechanical, organic"],
  ["typing-typewriter-bell-1", "typing", "commons-406243-stubb-typewriter-ding-near-mono", "406243_stubb_typewriter-ding-near-mono.wav", "typewriter, typewriter bell, typewriter ding, ding, carriage return, end of line, organic"],
  // mechanical
  ["mechanical-printer-1", "mechanical", "commons-star-lc-10-printer-01", "Star-LC-10-printer-01.ogg", "printer, dot matrix printer, dot matrix, print, printing, office, computer, retro, buzz, mechanical, organic", { seg: [2, 4], fade: [0.02, 0.3] }],
  ["mechanical-printer-2", "mechanical", "commons-star-lc-10-printer-01", "Star-LC-10-printer-01.ogg", "printer, dot matrix printer, dot matrix, print, printing, office, computer, retro, buzz, mechanical, organic", { seg: [15, 4], fade: [0.02, 0.3] }],
  ["mechanical-machine-1", "mechanical", "oga-30-cc0-sfx-loops", "machine_06.ogg", "machine, motor, engine, hum, running, factory, mechanical, organic", { fade: [0.05, 0.4] }],
  ["mechanical-machine-2", "mechanical", "oga-30-cc0-sfx-loops", "machine_08.ogg", "machine, motor, engine, hum, running, factory, mechanical, organic", { fade: [0.05, 0.4] }],
  ["mechanical-factory-1", "mechanical", "oga-100-cc0-sfx-2", "sfx100v2_loop_machine_02.ogg", "machine, factory, industrial, engine, mechanical, organic", { fade: [0.1, 0.5] }],
  ["mechanical-gears-1", "mechanical", "oga-clock-wind-sounds", "multiwind1.wav", "gears, gear, winding, wind up, clockwork, ratchet, crank, toy, mechanical, organic"],
  ["mechanical-gears-2", "mechanical", "oga-clock-wind-sounds", "multiwind2.wav", "gears, gear, winding, wind up, clockwork, ratchet, crank, toy, mechanical, organic"],
  ["mechanical-ratchet-1", "mechanical", "oga-clock-wind-sounds", "singlewind1.wav", "ratchet, click, crank, gear, mechanical, organic"],
  ["mechanical-clock-1", "mechanical", "oga-clock-wind-sounds", "tickloop-amp.wav", "clock, ticking, clock ticking, clockwork, tick tock, gears, time, mechanical, organic"],
  ["mechanical-tape-open-1", "mechanical", "oga-tape-recorder-opening-and-closing-sound-effects", "tape_recorder_opening.wav", "cassette, tape, tape recorder, deck, open, eject, retro, mechanical, organic"],
  ["mechanical-tape-close-1", "mechanical", "oga-tape-recorder-opening-and-closing-sound-effects", "tape_recorder_closing.wav", "cassette, tape, tape recorder, close, insert, retro, mechanical, organic"],
  ["mechanical-power-down-1", "mechanical", "oga-machine-shutting-down", "MachinePowerOff.ogg", "power down, power off, shut down, machine, wind down, off, mechanical"],
  ["mechanical-hammer-1", "mechanical", "oga-100-cc0-metal-and-wood-sfx", "hammer_01.ogg", "hammer, nail, hit, construction, workshop, organic"],
  ["mechanical-engine-1", "mechanical", "kenney-sci-fi-sounds", "engineCircular_000.ogg", "engine, motor, rotor, spin, hum, sci-fi, mechanical, electronic"],
  ["mechanical-keys-1", "mechanical", "oga-100-cc0-metal-and-wood-sfx", "keys_01.ogg", "keys, key ring, jingle, keychain, metal, chain, chain rattle, rattle, organic"],
  // electronic
  ["electronic-power-on-1", "electronic", "kenney-digital-audio", "powerUp1.ogg", "power on, power up, start, startup, boot, charge, rise, turn on, game, electronic"],
  ["electronic-power-on-2", "electronic", "oga-power-up-sound-effects", "power_up_sound_v1_0.ogg", "power on, power up, start, boot, rise, crt power on, turn on, electronic"],
  ["electronic-power-up-3", "electronic", "oga-50-cc0-retro-synth-sfx", "power_up_01.ogg", "power up, retro, 8-bit, chiptune, game, level up, cartoon, electronic"],
  ["electronic-beep-1", "electronic", "oga-50-cc0-retro-synth-sfx", "synth_beep_01.ogg", "beep, bleep, tone, alarm, computer, electronic"],
  ["electronic-beep-2", "electronic", "kenney-digital-audio", "twoTone1.ogg", "beep, two tone, bleep, notification, electronic"],
  ["electronic-beep-3", "electronic", "kenney-digital-audio", "threeTone1.ogg", "beep, three tone, notification, alert, electronic"],
  ["electronic-up-1", "electronic", "kenney-digital-audio", "highUp.ogg", "rise, up, positive, blip, electronic"],
  ["electronic-down-1", "electronic", "kenney-digital-audio", "lowDown.ogg", "fall, down, negative, blip, electronic"],
  ["electronic-zap-1", "electronic", "kenney-digital-audio", "zap1.ogg", "zap, electric, shock, spark, electricity, electronic"],
  ["electronic-laser-1", "electronic", "kenney-digital-audio", "laser1.ogg", "laser, pew, shoot, sci-fi, blaster, electronic"],
  ["electronic-glitch-1", "electronic", "kenney-interface-sounds", "glitch_001.ogg", "glitch, digital, error, corrupt, stutter, data, distortion, electronic"],
  ["electronic-glitch-2", "electronic", "kenney-interface-sounds", "glitch_002.ogg", "glitch, digital, error, corrupt, stutter, data, distortion, electronic"],
  ["electronic-computer-1", "electronic", "kenney-sci-fi-sounds", "computerNoise_000.ogg", "computer, data, processing, beeps, terminal, sci-fi, hacking, electronic", { max: 3 }],
  ["electronic-static-1", "electronic", "oga-static", "ScatterNoise1.mp3", "static, crt, crt power on, tv, television, tv static, noise, white noise, radio, interference, electronic", { seg: [0, 1.4], fade: [0.005, 0.25] }],
  ["electronic-static-2", "electronic", "oga-static", "ScatterNoise1.mp3", "static, hiss, radio, tuning, tv static, white noise, crt, electronic", { seg: [8, 3.5], fade: [0.2, 0.5] }],
  ["electronic-hdd-1", "electronic", "oga-electronic-device-loop", "qubodup-edev.flac", "hard disk, computer, hum, drive, whir, device, electronic", { fade: [0.05, 0.3] }],
  ["electronic-phaser-up-1", "electronic", "kenney-digital-audio", "phaserUp1.ogg", "rise, sci-fi, charge, swell, phaser, electronic"],
  ["electronic-coin-1", "electronic", "oga-50-cc0-retro-synth-sfx", "retro_coin_01.ogg", "coin, collect, pickup, reward, game, retro, 8-bit, cartoon, electronic"],
  ["electronic-hum-1", "electronic", "kenney-sci-fi-sounds", "spaceEngineLow_000.ogg", "hum, drone, low, engine, sci-fi, electronic", { max: 3, fade: [0.1, 0.5] }],
  // magic, shimmer, sparkle
  ["magic-cure-1", "magic", "oga-cure-magic", "Cure1.wav", "magic, spell, heal, sparkle, shimmer, chime, fantasy, glow, electronic"],
  ["magic-cure-2", "magic", "oga-cure-magic", "Cure3.wav", "magic, spell, heal, sparkle, shimmer, chime, fantasy, glow, electronic"],
  ["magic-cure-3", "magic", "oga-cure-magic", "Cure6.wav", "magic, spell, heal, sparkle, shimmer, chime, fantasy, glow, electronic"],
  ["magic-harp-1", "magic", "oga-magic-words-healing-sound-effect", "health_restore.wav", "magic, harp, harp glissando, heal, dream, fairy, shimmer, flashback, electronic"],
  ["magic-spell-1", "magic", "oga-80-cc0-rpg-sfx", "spell_01.ogg", "magic, spell, cast, energy, fantasy, cinematic"],
  ["magic-spell-2", "magic", "oga-80-cc0-rpg-sfx", "spell_02.ogg", "magic, spell, cast, energy, fantasy, cinematic"],
  ["magic-gem-1", "magic", "oga-80-cc0-rpg-sfx", "item_gem_01.ogg", "sparkle, gem, shine, twinkle, glint, crystal, treasure, shimmer, magic"],
  ["magic-gem-2", "magic", "oga-80-cc0-rpg-sfx", "item_gem_02.ogg", "sparkle, gem, shine, twinkle, glint, crystal, treasure, shimmer, magic"],
  ["magic-power-up-1", "magic", "oga-50-cc0-retro-synth-sfx", "power_up_03.ogg", "magic, power up, sparkle, rise, game, cartoon, electronic"],
  // animals and birds
  ["animal-dog-bark-1", "animal", "oga-80-cc0-creature-sfx", "barking_01.ogg", "dog, bark, woof, puppy, pet, animal, organic"],
  ["animal-dog-bark-2", "animal", "oga-80-cc0-creature-sfx", "barking_02.ogg", "dog, bark, woof, puppy, pet, animal, organic"],
  ["animal-cat-meow-1", "animal", "oga-cat-purr-meow", "cat_mewfood.wav", "cat, meow, mew, kitten, pet, animal, organic"],
  ["animal-cat-meow-2", "animal", "oga-cat-purr-meow", "cat_softmew.wav", "cat, meow, mew, kitten, pet, animal, organic"],
  ["animal-bird-chirp-1", "animal", "oga-forest-bird-sounds", "Forest Birds 1.wav", "bird, chirp, tweet, songbird, birdsong, forest, morning, animal, organic"],
  ["animal-bird-chirp-2", "animal", "oga-forest-bird-sounds", "Forest Birds 3.wav", "bird, chirp, tweet, songbird, birdsong, forest, morning, animal, organic"],
  ["animal-bird-chirp-3", "animal", "oga-forest-bird-sounds", "Forest Birds 6.wav", "bird, chirp, tweet, songbird, birdsong, forest, morning, animal, organic"],
  ["animal-rooster-1", "animal", "commons-medium-rooster-crowing", "Medium_rooster_crowing.ogg", "rooster, crow, cock-a-doodle-doo, morning, farm, chicken, animal, organic", { max: 6 }],
  ["animal-gull-1", "animal", "commons-gull-1", "Gull_1.ogg", "seagull, gull, sea, beach, harbour, harbor, coast, bird, boat, animal, organic", { seg: [0, 3], fade: [0.005, 0.5] }],
  ["animal-cow-1", "animal", "commons-cow-in-antefasy", "Cow_in_Antefasy.wav", "cow, moo, farm, cattle, animal, organic"],
  ["animal-sheep-1", "animal", "oga-sheep-baa", "sheep_baa.flac", "sheep, baa, lamb, farm, animal, organic"],
  ["animal-horse-trot-1", "animal", "oga-horse-trotting", "Trot.ogg", "horse, trot, hooves, clip clop, gallop, ride, animal, organic", { seg: [4.24, 4], fade: [0.005, 0.4] }],
  ["animal-cute-1", "animal", "oga-80-cc0-creature-sfx", "cute_01.ogg", "cute, creature, critter, squeak, chirp, small animal, animal, cartoon, organic"],
  ["animal-bug-1", "animal", "oga-80-cc0-creature-sfx", "bug_01.ogg", "bug, insect, buzz, fly, mosquito, bee, animal, organic"],
  ["animal-howl-1", "animal", "oga-80-cc0-creature-sfx", "howl.ogg", "wolf, howl, night, dog, animal, organic"],
  // crowd
  ["crowd-restaurant-loop-1", "crowd", "commons-restaurant-ambience", "Restaurant_ambience.ogg", "crowd, murmur, crowd murmur, chatter, restaurant, cafe, people, talking, walla, diner, background, ambience, organic", { loop: true, seg: [20] }],
  ["crowd-mall-loop-1", "crowd", "commons-shopping-mall-less-crowded", "Shopping_mall_less_crowded.ogg", "crowd, mall, shopping, indoor, people, murmur, walking, busy, ambience, organic", { loop: true, seg: [2] }],
  ["crowd-classroom-loop-1", "crowd", "commons-ambient-classroom-mono", "Ambient_classroom_mono.ogg", "crowd, classroom, school, kids, chatter, murmur, office, room, ambience, organic", { loop: true, seg: [10] }],
  ["crowd-applause-1", "crowd", "oga-applause-in-a-large-hall-or-church", "applause-clapping-church-crowd-immersive.wav", "crowd, applause, clapping, clap, audience, cheer, ovation, organic", { seg: [3, 6], fade: [0.2, 1.2], max: 6 }],
  ["crowd-shout-1", "crowd", "oga-crowd-shoutingspeaking-ambience", "crowd_shouting_0.ogg", "crowd, shout, shouting, protest, rally, angry crowd, army, organic", { seg: [5, 4], fade: [0.2, 0.8] }],
  // ambience loops
  ["ambience-room-tone-1", "ambience", "oga-100-cc0-sfx-2", "sfx100v2_loop_ambient_01.ogg", "room tone, room, hum, interior, quiet, indoor, air conditioning, ambience, organic", { loop: true, seg: [0] }],
  ["ambience-street-1", "ambience", "commons-sunday-in-the-city-street-noise1", "Sunday_in_the_city_street_noise1.ogg", "street, city, city street, traffic, urban, cars, town, outdoor, ambience, organic", { loop: true, seg: [30] }],
  ["ambience-traffic-1", "ambience", "oga-high-traffic-road-sounds", "gatve Varniu_2.ogg", "traffic, road, busy street, highway, cars, city, ambience, organic", { loop: true, seg: [10] }],
  ["ambience-night-crickets-1", "ambience", "oga-crickets-ambient-noise-loopable", "crickets_1.mp3", "night, crickets, night insects, insects, summer night, evening, nature, ambience, organic", { loop: true, seg: [0] }],
  ["ambience-cicadas-1", "ambience", "oga-cicada-sounds", "082526-cicadasounds_0.ogg", "cicadas, insects, summer, heat, day, tropical, ambience, organic", { loop: true, seg: [5] }],
  ["ambience-night-frogs-1", "ambience", "commons-spring-peeper-frogs-pseudacris-crucifer-", "Spring_Peeper_Frogs_(Pseudacris_crucifer)_singing_on_night_of_April_21_of_2019_in_North_Pittston_PA.ogg", "night, frogs, pond, marsh, swamp, peepers, spring, night insects, ambience, organic", { loop: true, seg: [5] }],
  ["ambience-forest-1", "ambience", "oga-forest-bird-sounds", "Forest 2.wav", "forest, woods, birds, nature, trees, outdoor, ambience, organic", { loop: true, seg: [10] }],
  ["ambience-morning-birds-1", "ambience", "oga-amb-morning-sounds-perfect-loop", "amb_morning_0.ogg", "morning, birds, birdsong, park, garden, dawn, outdoor, ambience, organic", { loop: true, seg: [10] }],
  ["ambience-sea-1", "ambience", "commons-ocean-waves-on-a-tropical-beach", "Ocean_Waves_on_a_Tropical_Beach.ogg", "sea, ocean, waves, beach, shore, surf, coast, tropical, seaside, ambience, organic", { loop: true, seg: [30] }],
  ["ambience-river-1", "ambience", "commons-james-river-rapids-2", "James_River_Rapids_2.ogg", "river, rapids, stream, water, flowing water, creek, brook, ambience, organic", { loop: true, seg: [30] }],
  ["ambience-cave-drip-1", "ambience", "oga-dripping-water-loop", "atmosbasement.mp3_.flac", "cave, drip, dripping, basement, dungeon, underground, water drip, ambience, organic", { loop: true, seg: [0] }],
];

// ---------------------------------------------------------------------------------------------------------------------------------------
const DL = process.argv[2];
if (!DL || !existsSync(DL)) { console.error("Usage: node tools/make-sfx-library.mjs <downloads folder>"); process.exit(2); }
const OUT = join(APP_ROOT, "bundle", "sfx");
const PACKS = JSON.parse(readFileSync(join(import.meta.dirname, "sfx-library-packs.json"), "utf8")).packs;
const FF = ffmpegExe(), FFPROBE = FF.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
const r3 = (n) => Math.round(n * 1000) / 1000, r1 = (n) => Math.round(n * 10) / 10;

const sounds = SPEC.map(([id, family, pack, file, tags, opts = {}]) => ({ id, family, pack, file, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), ...opts }));
{ // the list itself: ids, families, packs
  const seen = new Set();
  for (const s of sounds) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id) || seen.has(s.id)) throw new Error(`bad or repeated id: ${s.id}`);
    seen.add(s.id);
    if (!FAMILIES.includes(s.family)) throw new Error(`${s.id}: unknown family ${s.family}`);
    if (!PACKS[s.pack]) throw new Error(`${s.id}: no pack ${s.pack} in sfx-library-packs.json`);
  }
}
const filesOf = new Map();
function find(pack, name) {
  if (!filesOf.has(pack)) {
    const out = [];
    (function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "__MACOSX") walk(p); } else out.push(p); } })(join(DL, pack));
    filesOf.set(pack, out);
  }
  const hits = filesOf.get(pack).filter((p) => basename(p) === name);
  if (hits.length !== 1) throw new Error(`${pack}/${name}: ${hits.length} files`);
  return hits[0];
}
const ff = (args) => run(FF, ["-hide_banner", "-nostats", ...args], { windowsHide: true, maxBuffer: 64 << 20 }).then((r) => r.stderr, (e) => { if (e.code && e.code !== 0 && !/Summary:|silence|max_volume/.test(String(e.stderr))) throw new Error(String(e.stderr).slice(-600)); return String(e.stderr ?? ""); });
async function duration(file) {
  const { stdout } = await run(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { windowsHide: true });
  return Number(stdout.trim());
}
/** Integrated loudness and true peak (padded with a second of silence, so a click shorter than one 400 ms block still measures). */
async function loudness(file) {
  const e = await ff(["-i", file, "-af", "apad=pad_dur=1,ebur128=peak=true", "-f", "null", "-"]);
  const sum = e.split("Summary:").pop();
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]) };
}
/** The attack, the way packages/sfx onsetOf measures it: the end of the leading silence below -40 dB (0 when the file starts loud). */
async function onset(file) {
  const e = await ff(["-i", file, "-map", "0:a:0", "-t", "3", "-af", "silencedetect=noise=-40dB:d=0.005", "-f", "null", "-"]);
  const first = /silence_start:\s*(-?[\d.]+)/.exec(e), end = /silence_end:\s*([\d.]+)/.exec(e);
  return first && Number(first[1]) <= 0.001 && end ? Math.min(1, r3(Number(end[1]))) : 0;
}

const TMP = mkdtempSync(join(tmpdir(), "mw-sfxlib-"));
async function make(s) {
  const src = find(s.pack, s.file), wav = join(TMP, `${s.id}.wav`), out = join(OUT, s.family, `${s.id}.ogg`);
  const P = PACKS[s.pack];
  let how;
  if (s.loop) {
    const len = await duration(src), X = LOOP.xfade, start = s.seg?.[0] ?? 0;
    const D = Math.min(s.seg?.[1] ?? LOOP.len, r3(len - start - X - 0.05));
    if (D < 8) throw new Error(`${s.id}: only ${D} s to loop`);
    await ff(["-i", src, "-filter_complex",
      `[0:a]atrim=start=${start}:end=${r3(start + D + X)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asplit[a][b];` +
      `[a]atrim=end=${D},asetpts=PTS-STARTPTS,afade=t=in:d=${X}:curve=qsin[m];[b]atrim=start=${D},asetpts=PTS-STARTPTS,afade=t=out:d=${X}:curve=qsin[t];` +
      `[m][t]amix=inputs=2:duration=first:normalize=0[o]`, "-map", "[o]", "-c:a", "pcm_f32le", "-y", wav]);
    how = `adapted: a ${r1(D)} s loop from ${r1(start)} s of the original (its next ${X} s cross-faded into the start), ${LOOP.lufs} LUFS, stereo, Ogg Vorbis q${LOOP.q}`;
  } else {
    const cut = s.seg ? [`atrim=start=${s.seg[0]}:end=${r3(s.seg[0] + s.seg[1])}`, "asetpts=PTS-STARTPTS"] : [];
    const base = [...cut, "aresample=44100", "aformat=sample_fmts=fltp:channel_layouts=mono"];
    let chain = base;
    if (!s.fade) {         // silence at both ends below the sound's peak - 35 dB (the attack itself is never cut: 4 ms kept before it)
      const v = await ff(["-i", src, "-af", [...base, "volumedetect"].join(","), "-f", "null", "-"]);
      const peak = Number(/max_volume:\s*(-?[\d.]+) dB/.exec(v)?.[1] ?? -6), thr = Math.max(-60, Math.min(-30, peak - 35));
      chain = [...base, `silenceremove=start_periods=1:start_threshold=${thr}dB:start_silence=0.004:detection=peak`, "areverse",
        `silenceremove=start_periods=1:start_threshold=${thr - 5}dB:start_silence=0.05:detection=peak`, "areverse"];
    }
    await ff(["-i", src, "-af", chain.join(","), "-c:a", "pcm_f32le", "-y", wav]);
    how = `adapted: ${s.seg ? `${r3(s.seg[0])}-${r3(s.seg[0] + s.seg[1])} s of the original, ` : ""}${s.fade ? "faded in and out" : "silence trimmed"}, ${ONE.lufs} LUFS (true peak at most ${ONE.tp} dBTP), mono, Ogg Vorbis q${ONE.q}`;
  }
  const T = s.loop ? LOOP : ONE, m = await loudness(wav);
  if (!Number.isFinite(m.I) || m.I <= -69) throw new Error(`${s.id}: silent after the cut`);
  // one-shots: plain gain, the peak decides when it is near (the attack stays whole); loops: to the target, the rare loud moment of a bed
  // (a near bird, a drip) held under -2 dBFS by a limiter
  let dur = await duration(wav), gain = s.loop ? T.lufs - m.I : Math.min(T.lufs - m.I, T.tp - m.TP);
  const tail = s.loop ? ["alimiter=limit=0.794:attack=5:release=120:level=false"] : [];
  if (s.loop && m.TP + gain > -2) how += ", peaks limited at -2 dBFS";
  if (!s.loop) {
    const max = s.max ?? ONE.max, fadeIn = s.fade?.[0] ?? 0;
    let fadeOut = s.fade?.[1] ?? 0.02;
    if (dur > max) { tail.push(`atrim=end=${max}`); dur = max; fadeOut = Math.max(fadeOut, 0.25); how += `, cut at ${max} s with a fade`; }
    if (fadeIn > 0) tail.push(`afade=t=in:d=${fadeIn}`);
    tail.push(`afade=t=out:st=${r3(Math.max(0, dur - fadeOut))}:d=${fadeOut}`);
  }
  mkdirSync(join(OUT, s.family), { recursive: true });
  let fin;
  for (let i = 0; i < 3; i++) {          // Vorbis can overshoot the peak a little: lower the gain until it is safe
    await ff(["-i", wav, "-af", [`volume=${r3(gain)}dB`, ...tail].join(","), "-ar", "44100", "-c:a", "libvorbis", "-q:a", String(T.q), "-map_metadata", "-1",
      "-metadata", `title=${s.id}`, "-metadata", `artist=${P.author}`, "-metadata", `copyright=${P.licence}`, "-y", out]);
    fin = await loudness(out);
    if (fin.TP <= -1) break;
    gain -= fin.TP + 1.2;
  }
  const rel = relative(join(DL, s.pack), src).split(sep).join("/").replace(/^x\//, "");
  const archive = (Array.isArray(P.files) && P.files.length === 1 && /\.(zip|7z)$/i.test(P.files[0].name)) ? P.files[0].name : null;
  return { id: s.id, file: `${s.family}/${s.id}.ogg`, family: s.family, tags: s.tags, duration: r3(await duration(out)), loop: !!s.loop,
    onset: s.loop ? 0 : await onset(out), lufs: r1(fin.I), peak: r1(fin.TP),
    source: { name: P.name, url: P.page, author: P.author, licence: P.licence, licenceUrl: P.licenceUrl, file: archive ? `${archive} › ${rel}` : basename(src), ...(P.origin ? { origin: P.origin } : {}), read: READ, how } };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const made = new Array(sounds.length);
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < sounds.length) { const i = next++; made[i] = await make(sounds[i]); process.stdout.write("."); } }));
rmSync(TMP, { recursive: true, force: true });
console.log("");

// catalog and credits
const order = (s) => FAMILIES.indexOf(s.family);
made.sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id, "en", { numeric: true }));
const used = [...new Set(sounds.map((s) => s.pack))];
writeFileSync(join(OUT, "catalog.json"), JSON.stringify({
  about: "Moworks Studio's offline sound-effect library: CC0 and public-domain sounds, trimmed, loudness-normalised (one-shots -16 LUFS mono, loops -28 LUFS stereo, true peak at most -1 dBTP) and re-encoded as Ogg Vorbis by tools/make-sfx-library.mjs. onset: seconds from the file's start to the attack (silence below -40 dB, as packages/sfx onsetOf). Each sound's source names its pack, author, page, licence and original file; CREDITS.md lists them by pack.",
  made: new Date().toISOString(), families: FAMILIES, sounds: made }, null, 1) + "\n");
const L = ["# Sound effects bundled with Moworks Studio", "",
  `${made.length} sounds in \`bundle/sfx/<family>/<id>.ogg\`, made by \`tools/make-sfx-library.mjs\` on ${READ} from ${used.length} packs. Every pack is CC0 1.0 or`,
  "public domain, so no credit is required; the app credits every sound anyway (author, page, licence, original file, how it was made), here and in",
  "`catalog.json`. Each sound was adapted: cut, silence trimmed, loudness-normalised and re-encoded as Ogg Vorbis (catalog `source.how`).", "",
  "Licences: CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/ . Public domain (pdsounds.org): the author dedicated the recording to the",
  "public domain on pdsounds.org; Wikimedia Commons keeps the record (https://commons.wikimedia.org/wiki/Template:PD-pdsounds.org).", ""];
for (const key of used) {
  const P = PACKS[key], mine = made.filter((m) => sounds.find((s) => s.id === m.id).pack === key);
  L.push(`## ${P.name}`, "", `- Author: ${P.author}`, `- Page: ${P.page}`, `- Licence: ${P.licence} (${P.licenceUrl}); as found: ${P.licenceSeen}`);
  if (P.origin) L.push(`- First published at: ${P.origin}`);
  L.push(`- Downloaded ${READ}: ${P.files.map((f) => `\`${f.name}\` (${f.bytes} bytes, SHA-256 \`${f.sha256}\`)`).join("; ")}`);
  L.push(`- Sounds (${mine.length}): ${mine.map((m) => `\`${m.id}\` ← ${m.source.file}`).join("; ")}`, "");
}
writeFileSync(join(OUT, "CREDITS.md"), L.join("\n"));

// size against the budget, by family
const bytesOf = (rel) => statSync(join(OUT, ...rel.split("/"))).size;
const fam = {};
for (const m of made) { const f = (fam[m.family] ??= { files: 0, bytes: 0, loops: 0 }); f.files++; f.bytes += bytesOf(m.file); if (m.loop) f.loops++; }
const total = made.reduce((a, m) => a + bytesOf(m.file), 0) + bytesOf("catalog.json") + bytesOf("CREDITS.md");
for (const f of FAMILIES) console.log(`${f.padEnd(11)} ${String(fam[f]?.files ?? 0).padStart(3)} files${fam[f]?.loops ? ` (${fam[f].loops} loops)` : ""}  ${((fam[f]?.bytes ?? 0) / 1024).toFixed(0).padStart(5)} KB`);
console.log(`sfx library: ${made.length} sounds, ${made.filter((m) => m.loop).length} loops, ${(total / 1048576).toFixed(2)} MB (budget ${BUDGET / 1048576} MB)`);
if (total > BUDGET) { console.error("over budget"); process.exit(1); }
