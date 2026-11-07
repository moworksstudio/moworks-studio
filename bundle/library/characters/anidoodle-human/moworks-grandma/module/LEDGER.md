# Grandma: ledger

One line per round: what the gate or a look at the sheets found wrong, and what changed.

1. **Gate 77/93, first storybook sheet.** Every cane check NaN: `caneAxis` passed the right-hand *Frame* to `mv` instead of its rotation, so the solver's cost was NaN and never moved. Fixed. The stoop measured 23 mm, so I deepened it (spineBend 18 → 26, neck extended to keep the eyes level). Sheet: reads as an old woman with a cane already; bun invisible from the front; expression cells cut at the chin.
2. **Gate 84–92/93, cane and walk.** Cane tip 3–4 cm short of the floor. Lengthened the shaft, then found three solver problems in turn:
   - Coordinate descent can't lift a tip that hangs under a near-vertical arm (every single joint moves it sideways). Replaced it with a damped-least-squares IK over the 7 arm joints.
   - The joint stops and the shoulder's raise/swing singularity at raise 0 pinned it: active set, plus a cane-user carriage (shoulder forward 78°, raise 15°).
   - Too much damping. Now the planted cane tip sits ≤ 0.2 mm off the floor.
   - Walk heel slip of 4.9 mm at frame 81: the planner's closing step asked for more than 25° of ankle dorsiflexion. She now walks through all 90 frames (5 strikes; the closing step would fall at frame 100).
   - The cane plants 21 cm out and 10 cm ahead, and lifts at 50% of the cycle.
   - The stoop threshold went 40 → 30 mm, because the profile visibly stoops at 36 mm and the upright twin measures 2 mm. That threshold was my guess, not a measured norm.
3. **Gate 93/93, sheets looked at.** Raised the bun so it rises over the crown from the front. Re-framed the expression cells on the collar. Crop render of the hard poses:
   - The neck read as a thin pole: thickened it, and the knit now rises up the back of the neck.
   - The temple puffs read as ear-flaps: shrank them.
   - Moved "aching back" to yaw −70 so the hand on her back is seen.
4. **Walk stills.** Storybook backdrop: the lawn quad projected from behind the lens into a slanted plane, and the wash rounded the bench into a pill. Fixed with screen bands, a flat fill and edge-by-edge pencil. Gave the marker bench legs. Gate 93/93, exit 0 (`out/gate.txt`).
