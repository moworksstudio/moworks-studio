# Sound (Final Mix: after the picture is locked, only when the owner asks)

From the Moworks Motion kit 2.0.4 (`workflow/film.md` "Audio", "The sound pass"). The markup of audio in a composition is HyperFrames'
(`hyperframes/references/sound.md` and `format.md`, `media-use/references/mixing.md`); the levels and the choices below are the studio's.
You cannot hear: measure every step (the app gives you beat maps, levels and cue sheets), never go by feel, never say the sound is good.

## 1. What comes when

- **Early (the owner's starting assets):** a voice-over or music the owner already has. The app places it on the timeline (voice-over and
  music each on their own track, from 0 s) and transcribes the voice / maps the beats; the picture is timed to it.
- **Final Mix (after QC):** change or add music, add sound effects. Nothing here before the picture is locked.

## 2. Music

1. Licensed music only: the owner's track, or free Mixkit tracks (Mixkit Stock Music Free Licence). Never music or sound effects synthesised
   in code.
2. No music given and the owner asks for some: find **3 tracks on mixkit.co** that fit the brief (mood, tempo, length) when the project
   allows the web; give their pages to the app, which downloads all three into `audio/music-options/` so the owner can listen and pick (or
   ask for three others). Your table: A / B / C · title · artist · length · mood · why it fits · its Mixkit page.
3. The pick: the app places it, maps its beats and writes its credit. A track cut to the film's length (sections joined on bar starts) is a
   new file; the original stays.
4. Big moves (cuts, titles landing) on the beat. The animation cannot change (a kept design, an approved film)? Move where the music
   starts instead.

## 3. Sound effects

- A sound on every action (the house rules §7b, owner 30/10): a whoosh for movement, pop for things appearing, click for clicks, typing
  for typing, riser into a reveal, impact on a slam, footsteps, doors, pages; and a quiet ambience bed under every scene with a place. The
  app picks them by what happens on screen, from its own offline library of CC0 sounds first, then Freesound through Openverse (CC0 /
  CC BY) and HyperFrames' bundled set, every one credited; name them in the storyboard frames (`- sfx: whoosh, pop`, `- ambience: rain`).
- **The light comes before the sound:** a sound's attack (the top of a whoosh's swell) lands one frame after its picture. The picture must
  work muted first: social feeds play without sound.
- Nothing plays on or after the end card unless the design says so.

## 4. Levels

- The voice is the loudest thing; the music drops under it (HyperFrames' voiceover carve on the bed when a voice plays over music; a plain
  duck to about 25 % otherwise); with a sound on every action the effects sit under the music and the voice, each kind at its own level
  (an impact over a click), a small move quieter, the ambience lowest (the app sets them).
- The master: **-16 LUFS, true peak at most -1 dBTP** (the app's render masters and measures it); louder (-14 LUFS)
  only when the client asks.
- The app applies these: at the Final Mix it measures the music, the voice and each effect and sets every effect's level (EBU R128); when
  rendering it brings the master to the target with HyperFrames' two-pass `loudnorm` (media-use, "Publish loudness") and measures the
  result. Never set these levels by hand in the HTML.
