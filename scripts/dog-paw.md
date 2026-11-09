# Why Your Dog Paws at You — `shorts/dog-paw/`

~23 s · 1080×1920 · 60 fps · toon style (flat 2D you, 3D hero dog, your 3D hand in the close-ups) · 17 shots · real SFX · seamless loop

## The voice

The ElevenLabs take (28.9 s) was tightened with `tools/tighten-voice.py`: every pause is cut, and each phrase starts
while the previous one's tail is still fading (75 ms at sentence breaks, 40 ms elsewhere). A phrase never starts before the last
word's body has ended, so no syllable is masked. The result is 22.8 s, with no dead air. `voiceover.wav` is the tightened take, and
`voiceover.srt` has one word per block, aligned to it.

Transcript (as captioned):

> Your dog isn't actually being demanding when they put a paw on your hands. When you pause petting them and they press their
> paw against your wrist, you probably think they're bossing you around. You see, they're asking for more. Dogs don't have arms to
> hug you, and they don't have words to say thank you. Their paw is their only physical tool of affection. By pressing against
> your skin, they're literally petting you back. They aren't saying "keep going," they're telling you "I love you too." Which is why…

"Which is why" runs straight into "Your dog isn't actually…" when the video loops.

## Shots

| # | Words | Picture |
|---|---|---|
| 1 | Your dog isn't actually | From your seat: his glossy eyes on yours, a paw starting to lift |
| 2 | being demanding | Low angle, chin up, paw raised: a crown and a huffy face (hard cut) |
| 3 | when they put a paw on your hands | Over your shoulder: his paw lands on your hand on the pillow (sparkles, a heart) |
| 4 | When you pause petting them | You on the couch petting him; your hand stops (pause icon); his pleading face |
| 5 | and they press their paw against your wrist | He presses your wrist: pink pulse rings, a pointing hand |
| 6 | you probably think they're bossing you around | Fantasy: the boss dog in a tie and a leather chair points; you run around with a clipboard and coffee, sweating |
| 7 | You see, they're asking for more | Begging pose, big eyes; a bubble with a hand, then a plus |
| 8 | Dogs don't have arms to hug you | Cartoon arms pop out of him, try a hug, get crossed out and vanish in a puff |
| 9 | and they don't have words to say thank you | He tries to talk; a crossed-out speech bubble; praying hands and a heart for "thank you" |
| 10 | Their paw is their only | The hero paw (pink toe beans) rises into the spotlight; "only one" finger |
| 11 | physical tool of affection | Close on the beans: a toolbox turns into a heart, the beans glow pink |
| 12 | By pressing against your skin | His paw on your forearm: warm glow and rings |
| 13 | they're literally petting you back | He strokes your arm; repeat arrows; your teary smile |
| 14 | They aren't saying "keep going," | Both on the couch: a play-button bubble, crossed out |
| 15 | they're telling you | Your hand turns palm up; his paw rests in it (handshake) |
| 16 | "I love you too." | The hug: a beating 3D heart, a burst of hearts, sunset light |
| 17 | Which is why | Back to your seat: the last frame is the first frame |

## Why it keeps people watching

- No dead air: the voice never pauses, and every phrase has a new picture or a new icon on its key word.
- A cut or a beat every ~1.3 s, across three worlds: the couch, the boss's office, the stage.
- A hook in frame 1 (the dog looking straight at you) and a "you" camera: over your shoulder, your own hand.
- Comedy (the boss in a tie, the arms that pop out and vanish), then the payoff (the paw in your palm, the heart).
- A seamless loop: "Which is why" leads into "Your dog isn't actually…", so many viewers watch it twice.

## Fact check

Pawing is a well-known attention and contact-seeking behaviour, and gentle touch raises oxytocin in both dogs and people. But
"their *only* physical tool of affection" and "literally petting you back" are poetic: dogs also lean, nuzzle and lick. Context
matters too: pawing can mean "more food" or "I'm anxious". The description keeps that honest.

## Upload kit

**Title (pick one)**
1. Why Your Dog Paws at You (It's Not What You Think) 🐾
2. Your Dog Isn't Bossy. He's Petting You Back 🐶❤️
3. When Your Dog Puts His Paw on You, This Is What It Means 🐾

**Tags**
```
why does my dog paw at me, dog paw on hand, dog pawing meaning, dog puts paw on me, dog paw meaning, dog affection, dog love, dog behavior, dog body language, dog facts, dog and owner, dog bond, dog loves you, cute dog, puppy paws, toe beans, dog shorts, pet facts, animal facts, shorts
```

**Description**
```
Your dog isn't being bossy when he puts his paw on you. 🐾 Dogs don't have arms to hug you or words to say thank you, so a gentle paw is how they reach out and touch you back. Next time you stop petting and the paw comes out, that's "I love you too." ❤️
(Pawing can also mean "more food" or "I'm worried": watch the whole dog. The rest is science plus a little poetry.)
#shorts #dogs #dogfacts

Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```

**Pinned comment**
```
Stop petting your dog for 5 seconds and see if the paw comes out 👀🐾 Tell me what happened 👇
```

## Build notes

- `main.js`: shots, cameras (an `orbit` helper), dog/owner/hand states, icons, cue sheet. `props.js`: your 3D hand and forearm,
  the hero paw, the cartoon arms, the office and the tie. It reuses `dog-gaze`'s room, stage and kit.
- The dog's seat on the couch is solved at load time so that his left front paw, at rest height `PL`, lands exactly on the back
  of your hand. The hand positions for the wrist, forearm and palm shots are solved the same way, so paw and hand always touch.
- Pink toe beans are added under his front feet. You see them whenever he lifts a paw.
- Sound: 124 cues from 36 real recordings (`sfx/CREDITS.md`). Mix at −19 LUFS integrated, peak −1 dBFS.
- Render: `npm run render -- shorts/dog-paw --headed` (1,366 frames; the voiceover is already in the folder).
