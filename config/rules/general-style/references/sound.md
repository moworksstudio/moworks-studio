# Sound (placed by the app right after the Build, before Version 1; changed in Final Mix whenever the owner asks)

From the Moworks Motion kit 2.0.4 (`workflow/film.md` "Audio", "The sound pass"). The markup of audio in a composition is HyperFrames'
(`hyperframes/references/sound.md` and `format.md`, `media-use/references/mixing.md`); the levels and the choices below are the studio's.
You cannot hear: measure every step (the app gives you beat maps, levels and cue sheets), never go by feel, never say the sound is good.

## 1. What comes when

- **Early (the owner's starting assets):** a voice-over or music the owner already has. The app places it on the timeline (voice-over and
  music each on their own track, from 0 s) and transcribes the voice / maps the beats; the picture is timed to it.
- **Sound (right after the Build, before Version 1):** the app places the music and a sound on every action, as the house rules §7b say
  (owner #910); Version 1 is the film built with its full sound.
- **Final Mix (any time after):** the owner changes or adds music and sound effects, or asks you to.

## 2. Music

1. Licensed music only: the owner's track, or free Mixkit tracks (Mixkit Stock Music Free Licence). Never music synthesised in code. Sound
   effects are another matter: the app picks them from its library and online, and makes one in code only where neither has it (§3, owner 05/11/2026).
2. No music given and the owner asks for some: find **3 tracks on mixkit.co** that fit the brief (mood, tempo, length) when the project
   allows the web; give their pages to the app, which downloads all three into the project's cache so the owner can listen and pick (or
   ask for three others). Your table: A / B / C · title · artist · length · mood · why it fits · its Mixkit page.
3. The pick: the app places it, maps its beats and writes its credit. A track cut to the film's length (sections joined on bar starts) is a
   new file; the original stays.
4. Big moves (cuts, titles landing) on the beat. The animation cannot change (a kept design, an approved film)? Move where the music
   starts instead.

## 3. Sound effects

- **A film made for its song (a lyrics or music video) has none:** the song is what is heard (owner 31/10; the house rules §7b).
- A sound on every action (the house rules §7b, owner 30/10): a whoosh for movement, pop for things appearing, click for clicks, typing
  for typing, riser into a reveal, impact on a slam, footsteps, doors, pages; and a quiet ambience bed under every scene with a place. The
  app picks them by what happens on screen, in the order the house rules §7b give ("Where the sounds come from": a sound made by code only
  for what none of the others has), every one credited; name them in the storyboard frames by the thing and its action (`- sfx: crayon stroke on paper, door
  knock wood`, `- ambience: rain`).
- **The light comes before the sound:** a sound's attack (the top of a whoosh's swell) lands one frame after its picture. The picture must
  work muted first: social feeds play without sound.
- Nothing plays on or after the end card unless the design says so.

## 4. Levels

- The voice is the loudest thing; the music drops 10 dB under it and holds there through a pause under 2 s, so it never rises and falls at each
  breath, then comes back up over 1 s after a longer one. This holds in every film and the app writes it (owner 31/10, chosen by ear): never a lane of your own for it unless the
  owner asks. With a sound on every action the effects stay under the voice (8 dB under it on a spoken word); between the lines an
  effect's loudest moment sits a little over the music (1.5 dB), each kind at its own level (an impact over a click), a small move quieter,
  the ambience lowest (the app sets them; owner 03/11 by ear).
- The master: **-14 LUFS (Standard), true peak at most -1 dBTP**; Quieter (-16 LUFS) when the owner chooses it in the Render dialog (the
  house rules, #1073). The app's render masters and measures it.
- The app applies these: at Final Mix it measures the music, the voice and each effect and sets every effect's level (EBU R128); when
  rendering it brings the master to the target with HyperFrames' two-pass `loudnorm` (media-use, "Publish loudness") and measures the
  result. Never set these levels by hand in the HTML.
