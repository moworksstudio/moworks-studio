# The kit: the code, and recipes for using it

Everything lives in `src/kit/`. A video is four files in `src/videos/<slug>/` made by `tools/new-video.mjs`:
`world.ts` builds the world once, `shots.ts` poses it for each output frame, `vo.ts` holds the timing and the sound,
`Video.tsx` wires them into a composition. Units are metres, y is up, +z is the front of the set; a character built at
rotation 0 faces +z.

## The files
| File | What it gives you |
|---|---|
| `ToonVideo.tsx` | `ToonVideo` (the runtime: renders the world per frame, captions, the voice and cues in the Studio preview) · `ToonCaptions` · `loadToonFonts` · types `ToonWorld`, `ShotState` |
| `engine.ts` | the renderer and post chain (GTAO → character mask → ink outline → bloom → gather depth of field → overlay → grade) · `OVERLAY_LAYER` · debug switches |
| `lib.ts` | `PAL`, `INK` · materials `toon(color, {map, emissive})`, `flat(color, map?)` (unlit, for screens and white signs), `fill(color)` · shapes placed by their bottom centre `box(w,h,d,color,x,y,z)`, `cyl(rTop,rBot,h,color,seg,x,y,z)`, `sphere(r,color,x,y,z)`, `plane(w,h,mat)`, `limb()` · `shadowed(obj)` · timing `ramp01(f,a,b,ease)`, `easeInOut`, `easeOut`, `easeIn`, `backOut`, `lerp`, `lerpV`, `clamp01`, `v3`, `rng(seed)` |
| `character.ts` | `CAST` (mika, ravi, june, otto) · `buildCharacter(def)` → `{ root, parts: {lHand, rHand, lShin, rShin, head, torso}, setPose, setExpr }` · poses `STAND`, `SIT`, `walkPose(phase, amount)`, `mixPose(a, b, t)` · IK `armIK`, `poseReach(char, basePose, {l, r}, poles)`, `legIK(hipY, {y, z})` · types `CharDef`, `Pose`, `Character` |
| `props.ts` | staging helpers: `show(char, x, z, rotY)`, `place(prop, pos, yaw, tiltX, tiltZ)`, `at(obj, local)`, `grip(prop)`, `yawTo(dir)`, `inTorso`, `inHead`, `elbowOut(char, side)`, `billboard(mesh, cam)`, `holdMug(…)`, `along(route, k)` |
| `looks.ts` | `LOOKS` (STYLE §5) · `applyLook` (the runtime calls it) · `makeRemap(anchors, fps)` · types `Look`, `LookName`, `KitLights` |
| `textures.ts` | canvas textures (all seeded, drawn after the fonts load): `faceTex`, `torsoDetailTex`, `carpetTex`, `ceilingTex`, `tileWallTex`, `cityTex`/`dawnCityTex` (window views), `workScreenTex(seed)`, `machineScreenTex`, `makeCalendar`, `signTex(text)`, `stickyTex(lines, color)`, `whiteboardTex`, `clockFaceTex`, `corkTex`, `woodTex`, `machineLabelTex` · helpers `makeCanvas(w,h)`, `toTex(canvas)`, `rr()` (rounded rect) · fonts `UI_FONT`, `HAND_FONT`, `MARKER_FONT` |
| `collision.tsx` | `CollisionCheck` (the `-Check` composition) · `collisionReport` |
| `sound.tsx` | `Cue`, `Soundtrack`, `SfxTrack`, `windowCues` |
| `sets/office.ts` | a complete open-plan office: four desks, chairs, a coffee corner with a machine, a glass meeting room with a table, a whiteboard and a wall clock (see how `src/examples/what-if-no-pain/world.ts` builds on it) |

## The contract of a world and a shot
```ts
// world.ts — built ONCE (after the fonts load). Furniture = box()/cyl() so the collision QA sees it.
export type World = { scene; lights: KitLights; setSky; cast: { mika: Character; … }; seats: THREE.Object3D[] };
// shots.ts — called for EVERY output frame; must be a pure function of the frame (no clocks, no Math.random()).
export const applyShot = (w: World, cam: THREE.PerspectiveCamera, out: number): ShotState => { …; return { look, focus } };
```
- `lights.practicals`: every point light that is a lamp or a screen glow; looks scale them per shot.
- `focus`: the point the depth of field keeps sharp (usually the subject's face or the hero prop).
- Return the look you want; to keep a window at dusk in a bright look, return `{ ...LOOKS.wideBright, sky: "dawn" }`
  (the runtime applies `look.sky` after `applyShot`).

## Recipes
**A shot list in voice seconds** (the examples' pattern):
```ts
type Shot = { from: number; to: number; a: V; b: V; look: V; fov: number; style: LookName; hold?: number;
  cam?: (T: number, t: number) => { pos: V; look: V; fov?: number }; act: (w: World, T: number, t: number) => void };
// T = seconds in the video, t = seconds since the shot started. Camera eases a → b over [from, hold ?? to].
```

**A held prop, gripped from the outside:**
```ts
// world.ts: the prop lives in WORLD space (not parented to a hand), with its grip point and no collision
const mug = new THREE.Group(); mug.add(cyl(0.045, 0.04, 0.1, "#e8573f")); /* + a handle loop at +x */
mug.userData.grip = V3(0.09, 0.015, 0); // where the hand-sphere CENTRE goes: through the handle loop
mug.userData.noCollide = true;
// shots.ts: place the prop where the shot needs it, then reach for it
place(mug, inTorso(mika, -0.07, 0.38, 0.3), mika.root.rotation.y + Math.PI);
mika.setPose(poseReach(mika, STAND, { r: grip(mug) }, { r: elbowOut(mika, "r") }));
```
Arms reach about 0.48 m from the shoulder: place the character so the grip is in reach (IK clamps short of it
otherwise). A tool touches what it acts on (a needle tip on the arm, a spout over the mug, a pen nib on the paper).

**Feet on steps:** `legIK(hipY, { y, z })` gives `{ hip, knee }` for one leg in the character's side plane; set
`lHip/lKnee` or `rHip/rKnee` from it so a foot plants on a tread.

**A walk around the furniture:**
```ts
const ROUTE = [V3(-2, 0, 1), V3(-0.5, 0, 1.2), V3(0.4, 0, -0.6)]; // waypoints in the walk lanes
const k = ramp01(T, 1.0, 3.2, (x) => x); const p = along(ROUTE, k);
show(mika, p.pos.x, p.pos.z, p.rotY); mika.setPose(mixPose(STAND, walkPose(T * 1.6), Math.sin(Math.PI * k)));
```
Chairs roll clear when someone stands; run the collision QA after every blocking change.

**A sprite that must stay whole** (impact stars, bolts, warning signs): a plane with a canvas texture,
`depthTest: false`, on the overlay layer, turned to the camera:
```ts
star.layers.set(OVERLAY_LAYER); (star.material as THREE.MeshBasicMaterial).depthTest = false; billboard(star, cam);
```
Place it beside the head, not above it, so the frame keeps it. Steam and smoke are soft billboards (wisp textures).

**A screen or board that changes over time:** draw a canvas texture in `world.ts`, keep its canvas and texture, and
redraw it from `applyShot` with `texture.needsUpdate = true` (see `makeCalendar` in `textures.ts` and the whiteboard
in `src/examples/what-if-no-pain/world.ts`).

**A prop that glows:** an emissive or `flat()` material with its colour × 2–5 (HDR) so the bloom catches it; give the
look's `practical` a value to dim or boost the room's lamps.

**A set built away from the origin:** place each set ≥ 30 m from the others so wides never catch another set; move
`lights.key.target` with it (looks set the key's direction relative to its target).

**Text in the world:** `signTex("FLU SHOT DAY")`, `stickyTex([...], color)`, a whiteboard texture, a screen texture;
put them on planes 1–2 cm off the wall (never coplanar).

## Debug switches (for the render review)
`node tools/stills.mjs <CompId> <dir> <frame> --props '{"dbg":"noOutline,noDof,noMask,gNormal,gDepth"}'` switches
post passes off or shows the normal / depth buffers, to find which pass makes an artefact.

## Changing the kit itself
Build anything one video needs in that video's `world.ts`. Move it into `src/kit/` (or `src/sets/`, see the
character-builder skill) only when it's reusable and the user wants it everywhere; then re-run the stills of the
examples to make sure nothing else changed.
