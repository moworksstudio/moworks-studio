# __TITLE__: script

> Format: __FORMAT__, 60 fps, about __DUR__ s · hook: (what is about to happen to "you") · dial: (the one scale the
> facts sit on, e.g. hours → minutes → seconds) · narrator: (own recording / voice tool / none) · title: (IN CAPITALS)
> · status: draft, waiting for "approve"

Write the script the way `SCRIPTING.md` says, restate it to the user and wait for "approve". After that it never
changes: copy it word for word into `story/script.txt` (one paragraph, nothing else in the file).

## Narration

(One continuous paragraph, exactly as it will be spoken. Second person, present tense; sentences of about 12–18
words joined with "and", "so", "because", "then"; one everyday image for the mechanism; every number with a
yardstick; a gentle last line that calls back to the hook.)

N words, N sentences. Estimate: N words ÷ 2.8 words per second = about N s of speech, plus a 0.9 s lead-in and a
4–5 s title, so about N s of film (`node tools/set-duration.mjs` once the voice is timed).

## Beats

One row per sentence or clause. Every row must be drawable as one shot.

| Line | Picture | Sound |
| --- | --- | --- |
| (the words, the **cue word** in bold) | (what is on screen: subject, action, label) | (the key effect, or —) |
| after the last word | The title pops in word by word over the last scene. | music resolves, title swell |

## Fact sheet

One line per number or real-world claim, as spoken, with its source. Anything not yet verified is marked
**unverified** and listed in the delivery.

- (claim as spoken) · (the fact behind it) · (source: name, page or link)
