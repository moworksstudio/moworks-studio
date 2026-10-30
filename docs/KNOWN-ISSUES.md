# Known issues

What Moworks Studio does not do yet, or does with conditions, with workarounds. Codes `KI-xx` are stable so other documents can refer to
them.

**Status:** **Open** = not fixed yet · **Limitation** = comes from a platform or a design choice, no fix planned.

| Code | Issue | Area | Status |
|---|---|---|---|
| [KI-01](#ki-01-short-hitch-when-playing-in-the-editor) | Short hitch when playing a film in the Editor | Editor | Open |
| [KI-02](#ki-02-windows-only) | Windows only | Platform | Limitation |
| [KI-03](#ki-03-one-mg-styles-15-style-is-not-offered) | One mg-styles-15 style is not offered | Film styles | Limitation |
| [KI-04](#ki-04-two-mg-styles-15-styles-need-cjk-fonts) | Two mg-styles-15 styles need CJK fonts | Film styles | Limitation |
| [KI-05](#ki-05-after-effects-gets-some-styles-as-video) | After Effects gets some styles as video | AE port | Limitation |
| [KI-06](#ki-06-whisper-on-rtx-50-series-cards-not-yet-tried) | Whisper on RTX 50-series cards not yet tried | Voice-over | Open |
| [KI-07](#ki-07-vietnamese-letters-in-the-studios-mono-labels) | Vietnamese letters in The Studio's mono labels | Interface | Limitation |
| [KI-08](#ki-08-mixkit-music-is-for-online-use) | Mixkit music is for online use | Final Mix | Limitation |
| [KI-09](#ki-09-two-tests-need-a-golden-render-first) | Two tests need a golden render first | Tests | Limitation |

---

## KI-01: Short hitch when playing in the Editor

**Open.** Playing a film in the Editor could pause for up to about one second at a cut: the browser's video decoder lost its place at a
scene change and waited for the next keyframe. The Smooth preview copy now has a keyframe at least every second, and in testing the
longest gap dropped to about 0.1 s, but the original hitch did not reproduce reliably, so the fix is not fully proven.
**Workaround:** the render is not affected. If a hitch appears, play the passage again or check the rendered MP4.

## KI-02: Windows only

**Limitation.** The launcher, the key store (Windows DPAPI), the After Effects bridge and the component installers are written for
Windows 10 and 11. macOS and Linux are not supported.

## KI-03: One mg-styles-15 style is not offered

**Limitation.** Style 04 (3D render) of mg-styles-15 is built in Blender, which the app does not run. It stays out of the gallery; the
other 14 styles work.

## KI-04: Two mg-styles-15 styles need CJK fonts

**Limitation.** Styles 03 and 05 of mg-styles-15 use Chinese / Japanese fonts that the source repository does not include. Text in those
fonts falls back to a system font.
**Workaround:** choose a Brand Kit font for the film's text.

## KI-05: After Effects gets some styles as video

**Limitation.** Parts of a film drawn on a canvas or built by code while the film plays (as in Brush cartoon and What If) cannot become
editable layers: the port brings those parts in as video, or the whole film as one video layer beside its audio layers.
Each style's badge (AE editable / AE partly editable / AE video only) says what to expect. Styles not yet measured show "AE video only".

## KI-06: Whisper on RTX 50-series cards not yet tried

**Open.** The optional CUDA download for Whisper has been tested on earlier NVIDIA cards but not yet on RTX 50-series (Blackwell) cards.
**Workaround:** if transcription on the card fails, the app falls back to the CPU on its own; Settings › System can remove the download.

## KI-07: Vietnamese letters in The Studio's mono labels

**Limitation.** DM Mono, The Studio's font for numbers and small capital labels, has no Vietnamese letters. The interface itself is in
English, but your own text shown in a mono label (a Vietnamese project or file name, for example) falls back to Consolas for those
letters. The Desk is not affected.

## KI-08: Mixkit music is for online use

**Limitation.** Tracks offered by Final Mix come from Mixkit under the Mixkit Stock Music Free License: web, social media, YouTube,
podcasts and online ads are allowed; TV / radio broadcast, CD / DVD and games are not. The Final Mix dialog says so, and the film's
`docs/CREDITS.md` records it.
**Workaround:** for broadcast work, use your own licensed music (Final Mix accepts your own file).

## KI-09: Two tests need a golden render first

**Limitation.** `test/edit.test.mjs` and `test/gpu.test.mjs` compare against a golden render in `test-output/golden/G214`, which is not
stored in the repository. On a new computer they fail until it is made.
**Workaround:** run `node tools/golden/run.mjs --label G214 --only hf-native-30` once (it renders in software, no graphics card needed), then `npm test`.
