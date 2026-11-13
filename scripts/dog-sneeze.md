# Why Your Dog Fake-Sneezes When You Play — `shorts/dog-sneeze/`

~22.2 s · 1080×1920 (render 2160×3840) · 60 fps · toon style · **14 shots in 10 different places** · pixel captions · real SFX · seamless loop

**Owner override of the formula (R1/R4):** the owner asked for "a lot of scenes in different detailed environments, outside, inside,
different rooms, different parts of the garden or outside the household", so this short does NOT follow "one world / cuts only in the
first 6 s". Everything else of `VIRAL_FORMULA.md` stays: medium shots (55–80 % of the frame), a camera that never rests (every shot
has a fast, clean glide), explanation drawn inside the world with a colour code (green = friendly, red = tension), a beat on every
clause, no emoji (one 3D heart), no text except one-word captions, hard cuts on the first word of a clause, voice without gaps, loop.

## The voice

The ElevenLabs take (27.5 s) was tightened with `tools/tighten-voice.py`: every pause cut, phrase edges overlapped, 60 ms of soft
lead-in/tail kept. Result: **22.18 s, no dead air, 3.65 words/s** (`voiceover.wav`). The transcript was recovered with Whisper
(`small.en`, every word ≥ 0.6 confidence) and every word force-aligned with pocketsphinx on the original audio, then mapped onto the
tightened audio (`words.json`, 81 words); `voiceover.srt` holds the 58 caption chunks (a fast word is glued to its neighbour).
"Improve" was read as *audio* improvement (clean cut + mastering to −14 LUFS); the script text is unchanged.

> Your dog isn't actually sneezing because of dust when you play. When you're wrestling together and they suddenly stop to sneeze
> right in your face, you probably think it's just allergies. You see, that sneeze isn't involuntary. It's a disclaimer. Because
> roughhousing involves bared teeth and snapping jaws, dogs use a fake sneeze to instantly break the tension. They're pausing mid-game
> just to make sure you know, I'm not actually angry. I'm just happy playing with you. Which is why…

"Which is why" runs straight into "Your dog isn't actually…" when the video loops.

## Colour code (in the world, no labels)

green = friendly / safe (the "disclaimer" rings, relaxed dog) · red = tension (bared teeth, snapping jaws) · yellow = pollen / the heart.

## Shot plan (§6)

| # | Time | Words | Place | The picture (a real thing happening) | Shot + camera | In-world graphic |
|---|---|---|---|---|---|---|
| 1 | 0.00–1.80 | Your dog isn't actually sneezing | **Back garden, lawn** (morning) | He gallops at you in a play-bow run, tongue out; at "sneezing" he skids, ears flapping, and SNEEZES — a puff of spray | Medium, low: fast dolly back ahead of him, rise | spray droplets |
| 2 | 1.80–3.12 | because of dust when you play | **Living room** (sunbeam) | You thump a cushion: a cloud of dust floats in the sunbeam; he zooms through it with a toy and doesn't sneeze | Medium, fast sideways track | sunbeam + dust motes |
| 3 | 3.12–4.84 | When you're wrestling together and they suddenly | **Bedroom** | You sit on the bed, he pounces, you tip back laughing, he tugs your sock | Medium two-shot, fast 70° orbit | — |
| 4 | 4.84–6.70 | stop to sneeze right in your face | Bedroom, **your POV** (lying back) | He freezes over you (chest-up, looking down the lens), ah-CHOO into the lens: spray on the glass | Medium, push-in then the splat | spray on the lens |
| 5 | 6.70–8.32 | you probably think it's just allergies | **Garden, flowerbed + patio** | You rub your nose in a drift of yellow pollen, shrug; he sits next to you, innocent | Medium, orbit + push | pollen motes (yellow) |
| 6 | 8.32–10.40 | You see, that sneeze isn't involuntary | **Kitchen** | He looks up at you, performs a neat little sneeze, and peeks to see if you saw | Medium, slow push-in | gaze line |
| 7 | 10.40–11.17 | It's a disclaimer | **Hallway / front door** | He play-bows toward the lens, tail going; soft green rings spread over the floor | Medium, fast push | green rings |
| 8 | 11.17–13.12 | Because roughhousing involves bared teeth | **Park** (lawn by the pond) | He and a friend tumble, mouths open, teeth showing | Medium, fast orbit | red ring starts |
| 9 | 13.12–14.19 | and snapping jaws | Park, **by the bench** | Jaws snap at each other, a red glow at the mouths | Medium, low arc | red glow on the jaws |
| 10 | 14.19–16.74 | dogs use a fake sneeze to instantly break the tension | Park, **path** | Mid-wrestle he stops, sneezes; the red ring turns green and bursts outward; both dogs relax, ears down, tails going | Medium, long glide | red → green ring |
| 11 | 16.74–18.95 | They're pausing mid-game just to make sure you know | **Front yard + street** | The game freezes mid-leap (slow-motion hang, ball in the air); the camera circles the frozen dog; he glances at you | Medium, bullet-time orbit | — |
| 12 | 18.95–20.14 | I'm not actually angry | **Vegetable patch + shed** | Soft eyes, ears back, a slow tail sweep; you water the beans behind him | Medium, slow push-in | gentle green ring |
| 13 | 20.14–21.27 | I'm just happy playing with you | **Sunset meadow** | You and he run and leap together; **one 3D heart** | Medium, fast arc | the only icon |
| 14 | 21.27–22.18 | Which is why | Back garden, **frame 1** | He gallops at the lens: the first frame follows | the hook camera, 0.9 s before frame 1 | loop |

Energy curve: HOT (1–2) → HOT/medium (3–7) → CALM-ish push-ins on the explanation (6, 7, 12) → HOT (8–11, 13) → loop.
Budget check: places 10 (owner override) · cuts 13, each on a clause start · emojis 0 · icons 1 (3D heart) · beats ≈ one per 1.3 s.

### Self-check against `VIRAL_FORMULA.md`

| Rule | Result |
|---|---|
| R1 one world | **Broken on purpose** (owner's request): 10 places, each built in detail (back garden lawn, living room with a sunbeam, bedroom, flowerbed + patio, kitchen, hallway with the front door, park with pond/stream/bridge, front yard + street, vegetable patch + shed, sunset meadow). The garden is visited four times (hook, flowerbed, vegetable patch, loop), each time at a different corner |
| R2 medium shots | Dog (or dog + you) 40–75 % of the frame height; cameras at his eye height; one POV (your eyes on the bed) |
| R3 camera never rests | Yes: every shot is a glide/orbit/track; arcs peak at ≈ 3–4 m/s (the hook's dolly runs at his speed, 2.6 m/s) |
| R4 cuts | 13 hard cuts, each on the first word of a clause (−0.03 s); no dissolves. Average shot 1.6 s (owner override of "cuts only in the first 6 s") |
| R5 explanation in the world | sunbeam + dust (not the cause), pollen, a gaze line (he checks you), green rings (friendly), red ring + red glow on the jaws (tension) that turns green and bursts at "break the tension", a frozen leap (pausing mid-game), one heart |
| R6 emojis | **0** emoji; **1** 3D heart at 20.5 s |
| R7 faces | His glossy eyes, squeezed eyes in the sneeze, soft eyes in shot 12; your laugh, your pinched nose, your surprise |
| R8 hook | Frame 1: he gallops at the lens on the lawn; first word at t = 0 |
| R9 beats | 14 shots, ≈ 30 beats in 22 s |
| R10 captions | One chunk at a time, ≈ 66 % height, pixel font drawn in code. No other text |
| R11 voice | No gaps (22.18 s, 3.65 words/s); mix mastered to −14.2 LUFS, true peak −1.0 dBFS; 137 effects |
| R12 ending | "Which is why…" = the hook's path run for its last 0.9 s: the last frame is the first frame |

## Fact check (kept honest in the description)

Dogs do sneeze in short bursts during play, often together with a play bow or a head shake, and trainers and behaviourists read these
"play sneezes" as a signal that the rough stuff is meant in fun. It is a plausible, widely reported interpretation, not a settled finding,
and a sneeze can also be dust, pollen, excitement or a real irritation. The description says so in one line; a dog that sneezes a lot
outside of play, or with discharge, should see a vet.

## Upload kit

**Title (pick one)**
1. Why Your Dog Fake-Sneezes When You Play 🐶
2. That Sneeze During Play Isn't Allergies 🤧🐶
3. "I'm Not Angry, I'm Just Playing" — What Your Dog's Sneeze Means 🐶

**Tags**
```
why does my dog sneeze when we play, dog play sneeze, dog fake sneeze, dog sneezing while playing, dog sneezes in my face, dog play signals, dog body language, dog calming signals, dog play bow, dog play fighting, dog roughhousing, dog wrestling, dog behavior, dog facts, dog and owner, dog bond, cute dog, dog shorts, pet facts, animal facts, shorts
```

**Description**
```
Your dog isn't sneezing because of dust. 🐶 When he stops mid-game and sneezes at you, many dogs are saying: "I'm not angry, I'm just playing." Rough play looks like teeth and snapping jaws, so a quick sneeze breaks the tension. Next time it happens, you were just told you're a great playmate. ❤️
(Dogs also sneeze from dust, pollen or excitement: watch the whole dog. The video is dramatised: science plus a little poetry.)
#shorts #dogs #dogfacts

Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```

**Pinned comment**
```
Does your dog sneeze at you when you play? Tell me 👇🐶
```

## Build notes

- `main.js`: the whole story as pure functions of time (14 shot functions returning camera, dogs, owner and effects) + the cue sheet (137 effects).
  `outdoors.js`: back garden, park, meadow. `indoors.js`: bedroom, hallway. `build.js`: small builders. `fx.js`: sneeze spray, drifting dust/pollen,
  dust puffs, sunbeam, gaze line, lens splat. The flat (dog-kibble `room.js`) and `js/outside.js` are reused; every new place sits far away on the
  same big grass plane (garden z = −40, park x = +70, meadow x = −70, bedroom and hallway at z = −90 / −110) and only the shot's place is visible.
- Backgrounds: `js/outside.js` also draws big flat green hill domes, 3D cloud blobs and a large sun disc; they read as odd "circles" behind the
  action, so this short hides them (`outside.hills`, `outside.clouds`, sun below the horizon) and paints its own backdrop instead
  (`backdrop.js`: an 8192 x 1024 cartoon panorama per kind: suburb, park, sunset — snow-capped mountains, hills, a forest edge of outlined trees,
  neighbouring houses and a church, fluffy outlined clouds, a sunset glow with birds — plus a fog-coloured skirt where it meets the lawn). In front of it
  the sets add real 3D neighbour houses, rings of trees, a gazebo, a barn, a silo and a windmill. The bedroom wallpaper is now soft stripes (the big
  white dots read as circles too).
- Sneeze: head back, snap forward, a decaying head shake (`sneeze()` in `main.js`); the real sneeze recordings are placed so each burst lands on the snap.
- Voice: `tools/tighten-voice.py` on the original, Whisper (`small.en`) transcript, pocketsphinx forced alignment, mapped onto the tightened audio.
- Sounds: `tools/forge-sneeze-sfx.py` (new sneezes, laughs and bird-song from CC0 recordings; the rest copied from earlier shorts). The sneezes are
  human recordings played higher for a small dog: no CC0 recording of a dog's play-sneeze exists in the datasets used.
- Cloud check: stills at full resolution + `node tools/qa-motion.mjs shorts/dog-sneeze --step 2` + the audio-only mix. The final render is on your PC:
  `npm run render -- shorts/dog-sneeze --headed` (1,331 frames, 2160×3840).
