# Motion vocabulary: names and numbers for the Motion Plan

From Motion Prompt (Shohei Ohtaki, MIT, https://github.com/showheyohtaki/motion-prompt/tree/bd6bf08d8d412cc82c1bbc8f1a81638617a45cfb). This file is generated from the Library's Vocabulary (the app's intake of it, audit 79); do not edit it.

Use the names: a name is the word people in the field use, so put it in a row's `behavior` when it names the move ("dolly in 5.8 m over 2.9 s"), and in the shot's `says`. The numbers are not in this file:
call **library_search** with kind "vocab" and the name ("dolly zoom") to read the author's numbers for it, then write your own numbers for this film. A vocabulary item is words and numbers, never code to paste.

**HyperFrames first.** Where the list says "HF:", HyperFrames' registry already has the move: cite that Library item (source kind "library", its id), and use the vocabulary only for what it lacks.
**The studio's rules win.** A line marked ⚠ names a default the studio bans or limits (motion-craft, motion-spec, moworks-alive); use it only the way its note says. Camera moves are not optional: every shot keeps a `camera` row (moworks-alive), and this is where its names come from.

## Motion graphics moves (#001-024)

**Entrances & text**
- #001 Pop-in: Pops into view with a small bounce. HF: hf:component/spring-pop.
- #002 Stagger: Items appear one after another, slightly offset in time.
- #003 Burst: Lines and dots burst outward as something appears.
- #004 Line draw: A line extends as if it were being drawn.
- #005 Mask reveal: Text rises into view from behind an invisible edge.
- #006 Typewriter: Text appears one character at a time, as if typed. HF: hf:component/typewriter.
- #007 Count-up: A number runs up quickly to its final value. HF: hf:component/count-up.
- #008 Kinetic typography: Words move, scale and turn in time with what is said.

**Motion polish**
- #009 Easing: Motion speeds up and slows down instead of moving at one speed.
- #010 Overshoot: Goes a little past the target, then settles back. ⚠ Overshoot: position and size may overshoot, opacity and colour never (motion-spec §3), and no bouncy easing on text (motion-craft §3).
- #011 Squash & stretch: Squashes and stretches so that it feels elastic.
- #012 Shape morph: One shape turns smoothly into another.
- #013 Liquid motion: Shapes move and merge like liquid.
- #014 Motion trail: A fading trail follows a moving object.
- #015 Particles: Many small pieces fly out and scatter. ⚠ Particles: the studio bans floating particles as decoration (motion-craft §3); a burst at a success moment is fine, never over text.
- #016 Parallax: Near and far layers move at different speeds to show depth.

**Transitions & highlights**
- #017 Mask transition: The next scene appears inside a growing shape.
- #018 Shape transition: Shapes cover the screen and uncover the next scene.
- #019 Liquid transition: Liquid flows in and replaces the scene.
- #020 Zoom through: Zooms into an object and passes through it into the next scene. HF: hf:component/zoom-through-transition.
- #021 Flip: Turns over like a card to show the other side.
- #022 Light sweep: A band of light crosses a surface. ⚠ Light sweep: light only ON an object (inside a card or the strokes of letters), never a streak over the whole frame (motion-craft §4).
- #023 Glitch: The picture breaks up as if it were malfunctioning. HF: hf:block/glitch, hf:component/rgb-glitch-text.
- #024 Impact shake: The whole frame shakes when something lands.

## Motion graphics moves, part 2 (#121-144)

**Motion techniques**
- #121 Anticipation: Pulls back briefly before moving forward.
- #122 Follow-through: Parts keep swinging after the body stops.
- #123 Bounce: Falls and bounces lower until it stops. ⚠ Bounce: position and size only; no bouncy easing on text (motion-craft §3).
- #124 Wiggle: Shakes in small, random, continuous jitters. ⚠ Wiggle: text that moves while it is read is banned (motion-craft §3); use it on shapes, or on text before it must be read.
- #125 Pulse: Its size throbs like a heartbeat.
- #126 Motion path: Moves along a curve that you define.
- #127 Ping-pong loop: Plays forward, then backward, over and over.
- #128 Stop-motion style: Moves in choppy steps, with frames dropped.

**Text & shapes**
- #129 Text scramble: Letters shuffle at random, then settle. ⚠ Text scramble: only while the text is not yet being read; it must settle and hold its reading time (motion-craft §4).
- #130 Wave text: Letters rise and fall in turn, like a wave. ⚠ Wave text: text that moves while it is read is banned (motion-craft §3); only as an entrance or an accent, then still readable.
- #131 Text on a path: Text flows along a line or curve.
- #132 Variable font animation: The weight of the letters changes smoothly.
- #133 Text mask: Letters cut out to show a picture inside.
- #134 Repeater: Duplicates a shape and turns the copies.
- #135 Kaleidoscope: Mirrored patterns spread out symmetrically.
- #136 Line boil: Hand-drawn lines wobble frame to frame.

**Transitions & highlights**
- #137 Push transition: The next scene pushes the current one out.
- #138 Blinds transition: The next scene opens through thin strips.
- #139 Cube transition: Changes scenes like a turning cube.
- #140 Page curl: Peels back like paper to show the next page.
- #141 Pixelate: Turns into coarse blocks, then switches.
- #142 Shatter: Breaks like glass and the shards fly off.
- #143 Exploded view: Parts separate to show the structure inside.
- #144 Split screen: Divides the frame to show scenes side by side.

## Camera moves & transitions (#025-048)

**Camera Movement**
- #025 Pan: Pivot the camera left or right. HF: hf:component/pan-stations.
- #026 Tilt: Pivot the camera up or down.
- #027 Dolly in: Move the camera toward the subject.
- #028 Zoom in: Magnify with the lens (camera stays put).
- #029 Tracking shot: Move along with the subject.
- #030 Orbit (Arc shot): Circle around the subject.
- #031 Crane up: Lift the camera up.
- #032 Dolly zoom (Vertigo): Subject stays, background warps.

**Shooting Style & Time**
- #033 Rack focus: Shift focus between near and far.
- #034 Handheld: A slight shake, as if the camera were held by hand.
- #035 FPV drone shot: Fast, immersive fly-through.
- #036 Dutch angle: Tilt the frame diagonally.
- #037 Slow motion: Play the action slower.
- #038 Speed ramp: Change speed mid-shot.
- #039 Time-lapse: Compress hours into seconds.
- #040 Freeze frame: Pause the action for a beat. ⚠ Freeze frame: nothing is still for more than 2 s and the camera never stops (moworks-alive); hold it with a micro drift, at most about 1 s.

**Transitions**
- #041 Jump cut: Same framing, skip ahead in time.
- #042 Match cut: Cut on a matching shape or motion.
- #043 Whip pan: Fast pan blur into the next shot. HF: hf:block/whip-pan, hf:component/whip-pan-cut.
- #044 Cross dissolve: Blend one shot into the next.
- #045 Wipe: A moving edge replaces the shot.
- #046 Smash cut: Abrupt cut to a contrasting scene.
- #047 J-cut: Next scene's audio starts first.
- #048 L-cut: Previous scene's audio carries over.

Items outside these three packs (UI components, landing-page and web effects, photo looks and lighting) are in the Library too: call library_search with kind "vocab" when a shot needs one. Credit: every item carries its author, link at the commit and licence in the Library; the files copied into the project keep the author's `// Motion Prompt #ID · MIT License` line.
