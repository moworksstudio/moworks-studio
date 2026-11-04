---
name: character-builder
description: Design new ORIGINAL characters, costumes, props and reusable sets for the 3D cartoon kit, in the same flat-drawn design language as Mika, Ravi, June and Otto (round head with a painted face, capsule torso, ink-stick limbs, flat fills) — a new cast member, a recurring side character, a costume (a doctor's coat, a headband, a uniform), a prop that acts (a machine with a screen, a glowing device), or a set built once and reused across videos (a kitchen, a classroom, a stairwell, a street corner). Use when the user says "make a new character", "add a villain / a teacher / a dog owner", "give Ravi a chef's outfit", "build a kitchen set we can reuse", "a new prop", or a script needs someone or somewhere the kit doesn't have.
---

# Build characters, props and sets

**Module check.** If `kit.config.json → modules.builder` is `false`, tell the user in one line that the Character &
Set Builder is switched off and offer to switch it on (kit-setup → "Modules"). Without it, a one-off person or prop is
still built inside that video's `world.ts`; this skill is for designing them well and keeping them reusable.

Read `cartoon-video/references/STYLE.md` (the look and the palette) and `KIT.md` first. The live references:
`src/kit/character.ts` (the rig), Dr. Noor in `src/examples/what-if-no-pain/world.ts` (a costume), and
`src/kit/sets/office.ts` (a full set).

## A new character
1. **Design it with the user in one message:** name, role in the story, personality in three words, and a colour
   proposal that reads apart from the cast (top colour, skin, hair) plus a hair style. Show it as a small table.
   - Every character is **original**: never a real person's likeness, never another creator's character, never a
     mascot or a brand.
   - Contrast: a top colour no current character in the same shot wears; skin and hair as varied as real people.
2. **Define it** (in the video's `world.ts`, or in `src/cast.ts` once it's recurring):
   ```ts
   import { buildCharacter, CAST, type CharDef } from "../../kit/character";
   const LENA: CharDef = { name: "Lena", top: "#e8a33d", skin: "#8d5a3b", hair: "#1f1a1c", style: "bun" };
   const lena = buildCharacter(LENA); scene.add(lena.root);
   ```
   Hair styles today: `tuft` (a side-swept fringe), `glasses` (short hair + round glasses), `bun`, `beanie` (its rim is
   green in code). The torso detail follows the style (hoodie, v-neck, cardigan, crew).
3. **A costume:** replace the torso material with a canvas texture drawn like `torsoDetailTex` (fill, ink detail lines,
   `offset.x = 0.25` because the capsule's front is at u = 0.25), and add accessories to `parts.torso` / `parts.head`:
   ```ts
   const body = lena.parts.torso.children[0] as THREE.Mesh;
   body.material = new THREE.MeshBasicMaterial({ map: apronTex() });
   // accessories: flat fills (fill(color)), userData.char = true; thin rings also userData.noGbuffer = true
   ```
4. **A new hair style or headwear** needs code in `buildCharacter` (`src/kit/character.ts`, the hair/headwear block):
   add a `style` value and its shapes (caps from `cap()`, spheres, tori). Changing the shared kit: ask first, then
   re-check the examples' stills.
5. **Prove it:** a test still of the character in three views (front, three-quarter, profile) and two expressions, at
   full size, before using it in a video. Record recurring characters in `projects/CAST.md` (name, CharDef, voice if
   they speak, first video).

## A new prop
- Build it from `box` / `cyl` / `sphere` / `plane` + canvas textures (labels, screens, stamps) in the video's
  `world.ts`. Furniture-like props use `box`/`cyl` so the collision QA sees them; name the important meshes
  (`mesh.name = "counter"`) so QA lines read clearly.
- **Held props** live in world space with `userData.grip` at the handle or outer edge, and `userData.noCollide = true`
  (KIT.md recipe).
- **Props that glow** use emissive / `flat()` colours × 2–5 for the bloom; **white** props use unlit `flat()`.
- **Labels are generic** ("COFFEE", "BANCA", "LAB 3"): never a real brand name or logo.

## A reusable set
1. One module per set: `src/sets/<name>.ts` exporting `build<Name>(scene, origin)` and its **anchors**: seats, walk-lane
   waypoints, door positions, named camera marks (`{ establishing: { pos, look, fov } }`).
2. Place each set at its own origin, **≥ 30 m from the others**, so wides never catch another set; build only the sets
   a video uses.
3. Dress it with the kit's palette logic (light walls, one saturated floor, a few accents), a window with day and dawn
   views if it has one, practical lights in `lights.practicals`.
4. Prove it: an establishing wide, a close-up and a high corner still, plus `COLLISION none` with a character walking
   its lanes. List it in `src/sets/INDEX.md` (name, file, anchors, first video).
5. **New look, same set:** signs, posters, whiteboard text, the sky and the look make the same room read as a new
   scene; reuse sets across videos and chapters.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Model a real person, a celebrity or another creator's character | Design an original in the kit's language; contrast by colour, hair and role |
| Give a character lit, shaded or outlined body materials | Flat fills (`fill()`), drawn details on canvas textures |
| Parent a held prop at the hand | World-space prop + `userData.grip` + `poseReach` |
| Put a real brand on a prop | A generic label in the kit's fonts |
| Change `src/kit/character.ts` silently | Ask first; re-check the examples' stills after the change |
