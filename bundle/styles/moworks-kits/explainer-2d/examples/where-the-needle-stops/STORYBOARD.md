# Storyboard: Where the Needle Stops (40.0 s)

Narration (`audio/vo.wav`), verbatim from `story/script.txt`:
> A needle is about to go into your arm. In a second, it will push ten drops of medicine through
> your skin. You can't just swallow it, because your stomach would digest many medicines, like
> insulin, the same way it digests lunch. So we take a shortcut, and where the needle stops decides
> how fast it works. In the fat under your skin, it seeps into your blood over hours. In muscle,
> packed with tiny blood vessels, it takes minutes, and in a vein, just seconds. Then your heart
> pumps it around your body in about a minute, all from one small sting.

Every cut and event is keyed to a word in `story/words.json` (`EX.cue(word, n)`; n counts occurrences, ignoring case
and punctuation). The seconds below come from the word times that ship with the example (speech 0.91–34.55 s). A new
voice take moves every one of them, and the picture and sound follow by themselves. Hard cuts land 0.05 s before
their word; no dissolves. The title starts **0.6 s after the last word** (35.15 s here). The film ends at
`index.html`'s `data-duration` (40.0 s here) with a 0.6 s fade to black.

| # | Cut (cue) | Time | Shot | Module |
| --- | --- | --- | --- | --- |
| 1 | 0 | 0.00 | **Clinic, medium.** The hero (front view, worried) left of centre in a cosy night clinic; a blue-gloved hand brings a syringe in from the right toward the hero's screen-right shoulder, arriving on "arm". Needle glint on "needle". Slow push-in. | clinic.back, hero, clinic.syringe, clinic.front |
| 2 | in(1) −0.05 | 3.15 | **Arm close-up.** Bare upper arm under a rolled red sleeve. The needle dimples the skin and goes in on "second"; the plunger pushes from "push" to "skin". Ten aqua drops pop in a row, one every 0.1 s from "ten"; callout "0.5 mL" and pill "10 drops". | clinic.armClose, clinic.drop |
| 3 | you(1) −0.05 | 7.44 | **X-ray body.** The hero as a translucent glowing figure with the gut visible. On "swallow" a blob of medicine goes in at the mouth and slides down to the stomach by "stomach"; the camera pushes toward the stomach. | body.xray |
| 4 | stomach(1) −0.05 | 9.38 | **Inside the stomach.** Folded pink walls, a bubbling green acid pool, violet enzymes. Insulin (a golden bead chain) falls in on "insulin", a sandwich on "same"; enzymes snip both apart from "digests" to just before the cut. Callouts "stomach acid", "insulin". | body.stomach |
| 5 | so(1) −0.05 | 14.71 | **X-ray body, wider.** The swallow route fades and a cross draws on over it on "take"; on "shortcut" a bright aqua arrow runs from the upper arm straight into the blood vessels. | body.xray |
| 6 | where(1) −0.05 | 16.45 | **Arm cross-section.** Skin, yellow fat, red muscle, a blue vein. Three needles slide in on "needle" (0, +0.15, +0.30 s) and stop at three depths on "stops". Callouts "fat", "muscle", "vein" from "decides". | tissue.section |
| 7 | in(2) −0.05 | 19.86 | **Fat, close.** Big yellow fat cells, few thin capillaries; a pool of medicine seeps slowly from "seeps". Pill "fat · hours" on "hours". | tissue.fat |
| 8 | in(3) −0.05 | 24.13 | **Muscle, close.** Red fibre bundles wrapped in a dense web of capillaries; the medicine soaks in quickly from "packed". Pill "muscle · minutes" on "minutes". | tissue.muscle |
| 9 | and(2) −0.05 | 27.77 | **Vein, close.** Blood cells stream along a vein; the medicine shoots in and races away from "vein". Pill "vein · seconds" on "seconds". | tissue.vein |
| 10 | then(1) −0.05 | 30.20 | **X-ray body, circulation.** The heart glows and beats from "heart"; the medicine spreads from it through the whole vessel network from "pumps" to "minute". Callout "~1 min" on "body". | body.xray |
| 11 | from(1) −0.05 | 33.14 | **Arm close-up again.** The needle withdraws; a plaster pops on with a sparkle on "sting". | clinic.armClose |
| 12 | last word end +0.6 | 35.15 | **Clinic, wide.** The hero relaxed and smiling. **WHERE THE NEEDLE STOPS** pops word by word (0.2 s apart) from 0.15 s after the cut. Fade to black over the last 0.6 s. | clinic.back, hero, clinic.front, ui.title |

The three speed pills (fat · hours, muscle · minutes, vein · seconds) build into one row across shots 7–9 and leave
together 0.22 s before the cut to shot 10. Every label leaves 0.22 s before its shot ends.

## Event cues (shared by picture and sound)

`+x` = seconds after the word starts. Times in brackets come from the shipped word times. The bespoke score
(`sound/cues_inj.py`) follows this table row by row; the generic cue sheet (`story/sound.json`) maps it onto the kit's
twelve effect kinds.

| Event | Cue | Picture | Sound |
| --- | --- | --- | --- |
| Open | 0.0 | clinic, hero worried | soft room tone fades in over 0.6 s; music starts |
| Needle glint | needle(1) +0 [0.99] | sparkle on the needle tip | glassy glint |
| Syringe arrives | arm(1) +0 [2.69] | hand stops near the shoulder | soft swish |
| Cut: arm close-up | in(1) −0.05 [3.15] | shot 2 | — |
| Needle in | second(1) +0 [3.62] | skin dimples, needle slides in | tiny pinch / prick |
| Plunger | push(1) +0 → skin(1) +0.3 [4.74 → 7.08] | plunger slides down | soft rubber squeak, liquid push |
| Drops | ten(1) +0, then every 0.1 s ×10 [5.04 → 5.94] | ten drops pop | ten tiny ascending drip ticks |
| Pills | ten(1) +0.1, drops(1) +0.3 | "0.5 mL", "10 drops" | pops |
| Cut: x-ray | you(1) −0.05 [7.44] | shot 3 | soft swish |
| Swallow | swallow(1) +0 → stomach(1) [8.07 → 9.43] | blob slides down | gulp, then a sliding drop |
| Cut: stomach | stomach(1) −0.05 [9.38] | shot 4 | — |
| Acid | stomach(1) +0 | bubbling | low bubbling bed for the shot |
| Insulin in | insulin(1) +0 [11.67] | chain falls in, callout | splash |
| Sandwich in | same(1) +0 [12.80] | sandwich falls in | splash |
| Digest | digests(1) +0 → so(1) −0.1 [13.51 → 14.66] | enzymes snip | 5–6 snips, fizz |
| Cut: x-ray wide | so(1) −0.05 [14.71] | shot 5 | — |
| Cross | take(1) +0 [15.12] | gut route fades, cross | dull thud |
| Shortcut | shortcut(1) +0 [15.68] | aqua arrow into the vessels | bright whoosh |
| Cut: section | where(1) −0.05 [16.45] | shot 6 | — |
| Needles in | needle(2) +0, +0.15, +0.30 [17.00] | three needles slide | three slides |
| Needles stop | stops(1) +0 [17.50] | they stop | three soft ticks |
| Layer callouts | decides(1) +0, +0.12, +0.24 [17.71] | "fat", "muscle", "vein" | pops |
| Cut: fat | in(2) −0.05 [19.86] | shot 7 | — |
| Seep | seeps(1) +0 → in(3) [21.77 → 24.18] | slow seep | slow, soft fizz |
| Hours | hours(1) +0 [23.14] | pill | pop + clock tick |
| Cut: muscle | in(3) −0.05 [24.13] | shot 8 | — |
| Soak | packed(1) +0 [24.80] → minutes(1) +0.6 | fast soak | faster fizz |
| Minutes | minutes(1) +0 [26.86] | pill | pop |
| Cut: vein | and(2) −0.05 [27.77] | shot 9 | — |
| Race | vein(1) +0 [28.37] | medicine shoots off | fast whoosh |
| Seconds | seconds(1) +0 [29.23] | pill | pop |
| Cut: circulation | then(1) −0.05 [30.20] | shot 10 | — |
| Heart | heart(1) +0 [30.65] | heart glows and beats (~75 bpm) until the cut | heartbeat |
| Spread | pumps(1) +0 → minute(1) +0 [30.89 → 32.67] | medicine spreads through the body | rising shimmer |
| ~1 min | body(1) +0 [31.70] | callout | pop |
| Cut: arm close-up | from(1) −0.05 [33.14] | shot 11 | — |
| Withdraw | from(1) +0.1 | needle slides out | soft slide |
| Plaster | sting(1) +0 [34.22] | plaster pops, sparkle | soft pop + sparkle |
| Cut: title | last word end +0.6 [35.15] | shot 12 | — |
| Title words | title +0.15 + 0.2 s × i (4 words) [35.30] | words pop | 4 soft pops, music lifts to a warm resolve |
| End | film end [40.0] | fade to black over the last 0.6 s | room tone and music fade over the last 1.2 s |
