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
