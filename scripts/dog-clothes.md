# Why your dog sleeps on your dirty clothes

Seamless-loop Short · ~46 s (the recorded voiceover, `Compound_Clip_5.srt`) · ~125 words · 1080×1920, 60 fps · **toon style** (flat 2D people in a 3D cartoon world, a 3D hero dog) · 20 shots, each a slow eased camera move, with a **true cross-dissolve at every cut** · vivid, saturated colour · no on-screen text (only the word-by-word captions).

**What this video is about, in one sentence:** your dog curls up in the laundry basket or on a jacket because your worn clothes smell like you, and that scent calms him while you are away.

## Voiceover (the recorded one, word for word)

> Your dog isn't actually being naughty when they sleep on your dirty clothes. When you come home and find them curled up in your laundry basket, or buried under an old jacket on the couch, you probably think they just like soft fabric. You see, they aren't looking for a blanket, they're using your scent as an oxygen mask. A dog has over 300 million scent receptors in their nose. While you just see an old shirt, your dog smells a biological portrait of you. Your breath, your skin, and your safety. When you close the front door and the house goes dead silent, your dog has no concept of time. They don't know if you've been gone for 8 minutes or 8 years. Their nervous system enters sensory deprivation and their heart rate spikes. So they drag your clothes into a nest and bury their snout deep into the fat, flooding their brain with oxytocin to physically slow their racing pulse. They aren't ruining your laundry, they're holding onto the only piece of you they have left until you walk back through that door. Which is why…

The last line runs into the first on the loop: *"Which is why… **your dog isn't actually being naughty** when they sleep on your dirty clothes."* The closing frame is the opening frame (the golden dog in his nest of clothes, glossy eyes on the lens).

> Heads-up: the `.srt` reads "deep into the **fat**," (line 483, 36.4 s). If the recording says "fabric", change that one word in `voiceover.srt` so the caption matches.

## Shot list (times follow the recorded `.srt`)

| # | Words | Picture · camera |
|---|---|---|
| 1 | Your dog isn't actually | **Hook.** The golden dog lies in a nest of colourful clothes, glossy eyes on the lens. Slow push-in. |
| 2 | being naughty when they sleep on your dirty clothes. | Orbit round the nest; a 😈 pops over him and a ❌ crosses it out; 💨 🦠 🧦 puff up on "dirty". |
| 3 | When you come home and find them curled up in your laundry basket, | The front door opens, you come in; he is curled in the laundry basket, head on the rim, and wakes when you gasp. |
| 4 | or buried under an old jacket on the couch, | He is asleep on the couch with a blue jacket draped over his back (the cloth lies on him, no gaps, no poke-through); 💤 rises. |
| 5 | you probably think they just like soft fabric. | Your thought bubble: a 🧸 (soft stuff). |
| 6 | You see, they aren't looking for a blanket, | Back at the nest; a 🛏️ pops over him and a ❌ crosses it out. |
| 7 | they're using your scent as an oxygen mask. | A clear mask and hose on his snout; pink scent particles stream from the old shirt into it. |
| 8 | A dog has over 300 million scent receptors in their nose. | Close on the twitching nose; a golden swarm of tiny dots fills his nostrils. |
| 9 | While you just see an old shirt, your dog smells a biological portrait of you. | Your bored 😐 thought bubble ("just a shirt"), then a framed painted portrait of you pops over the pile with sparkles. |
| 10 | Your breath, your skin, and your safety. | 💨, 🖐️ and 🛡️ pop one by one over the pile. |
| 11 | When you close the front door and the house goes dead silent, | You leave and the door shuts; the mood goes quiet blue; **dead silence** (every sound stops). He sits up, ears wide, wagging slowing to a stop. |
| 12 | your dog has no concept of time. | The wall clock's hands race round and round; three ❓ pop; he stares at the door. |
| 13 | They don't know if you've been gone for 8 minutes or 8 years. | The window time-lapses: sun and moon, then the tree through the four seasons; 📆 and an hourglass; a low bell on "years". |
| 14 | Their nervous system enters sensory deprivation and their heart rate spikes. | He trembles, pupils huge; a green heart-rate line speeds up beside him. |
| 15 | So they drag your clothes into a nest | He trots from the basket to the nest with a shirt in his mouth and sets it on the pile (camera glides alongside). |
| 16 | and bury their snout | He turns round on the pile, lies down and pushes his snout into the shirt (the shirt rises into a soft mound round it). |
| 17 | deep into the fat, flooding their brain with oxytocin | Orbit; 💗 hearts fly in, a 🧠 pops, the heart line slows from racing to calm, a glass hum and a slowing heartbeat. |
| 18 | to physically slow their racing pulse. They aren't ruining your laundry, | Close and quiet: asleep, breathing slowly, a 💛 drifts up. |
| 19 | they're holding onto the only piece of you they have left until you walk back through that door. | Warm light; footsteps, a key click, the door creaks; he lifts his head, ears up, tail thumping. |
| 20 | Which is why… | The camera glides back to the opening frame (the loop). |

## How the cloth and the dog touch (the part that has to look right)

- **`js/cloth.js` is a small soft-cloth system**: each garment (tee, hoodie, jacket, jeans, sock) is a painted, alpha-cut sheet laid over a grid. Its height at every point comes from the floor or the sheets underneath, from rays cast down onto the dog's body, a gentle puff for volume and soft wrinkles. The sheet can never go *below* what holds it up, so nothing pokes through.
- **The pile gives way under him** (`settle`): where his belly and legs press, the heap compresses, and he sits at the height the compressed pile actually has, so his body rests *in* the clothes instead of hovering or sinking.
- **The jacket drapes over his back** via the same rays; **the old shirt rises into a soft mound round his snout** on "bury"; the basket's clothes hang over its rim.
- Cloth shadows follow the cut-out shape (custom depth material), and nothing in the frame uses a transparent flat plane that could flicker.

## Fact-check (keep claims inside what is known)

- **"Oxygen mask"** is a metaphor for how much a dog relies on smell; it is not a physical claim.
- **"Over 300 million scent receptors"** is the commonly quoted figure (people ≈ 6 million). Estimates vary by breed (roughly 125–300 million), so "up to about 300 million" is the safest wording in the description.
- **"A biological portrait of you"** is a poetic way of saying a worn shirt carries a lot of your individual scent.
- **"No concept of time"** is the narrator's simplification. Studies suggest dogs do notice how long an owner has been away (they greet more intensely after longer absences) but they do not count minutes; "8 minutes or 8 years" is rhetorical.
- **"Sensory deprivation" and a heart-rate spike** describe the stress some dogs feel when left alone (some show raised heart rate and cortisol). Not every dog reacts this way.
- **"Oxytocin physically slows the pulse"** is the strongest claim here: an owner's scent and calm contact are known to be soothing, and oxytocin is involved in the dog–human bond, but "flooding the brain with oxytocin to slow the pulse" from a worn shirt is *not proven*. Vets do suggest leaving an unwashed worn item with an anxious dog. Say "many people think…" / "it may help…" in the post.
- Dogs also just like soft, warm, enclosed spots and being near *your* things, so "naughty" is the only thing the video is sure is wrong.

## Upload kit

**Title options** (pick one)
1. Why Your Dog Sleeps on Your Dirty Clothes 🐶👕
2. Your Dog Isn't Being Naughty With Your Laundry 🧺🐶
3. The Real Reason Your Dog Steals Your Dirty Clothes 💛

**Tags**
`why does my dog sleep on my dirty clothes, dog sleeps on dirty laundry, dog steals my clothes, dog nest with clothes, dog sleeps in laundry basket, dog loves owner scent, dog separation anxiety, dog smell, dog behavior, dog facts, dog and owner, dog bond, dog loves you, dog separation anxiety signs, cute dog, dog shorts, pet facts, animal facts, shorts`

**Description**
```
Your dog isn't actually being naughty when he sleeps on your dirty clothes. 🐶👕 Many dog people think your worn clothes smell like you, and that scent can calm him while you're away.
(Part science, part poetry: dogs have an amazing sense of smell and many feel stressed when left alone. Whether your scent really "slows his pulse" isn't proven.)
#shorts #dogs #dogfacts

Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```

**Pinned comment**
> Where does YOUR dog nest? L = your laundry, J = a jacket, C = the couch, B = his own bed 👇🐶

## Build notes (toon style)

- `shorts/dog-clothes/` uses the toon toolkit (`js/toon.js`, `js/puppet.js`, `js/toonworld.js`, `js/herodog.js`) plus the new `js/cloth.js`. One room (door, window with a changing sky, couch, rug, plant, wall clock, laundry basket) in three moods: bright day, quiet blue, warm gold.
- **Smoothness:** every shot is a pure function of time and of its shot number, so at a cut the old shot is rendered once more into a render target (it keeps moving past its end) and cross-faded over the new shot for 0.4 s. Camera moves use a gentle ease; the carry shot follows the dog's own motion so he stays framed.
- **No artifacts:** nothing intersects: the dog sits at the compressed pile height, cloth is lifted above whatever supports it, the dog is in front of or inside the pile on purpose; static outlines are only used on things that never move (the door and clock hands are dynamic).
- **Sound: real recordings only** (47 sounds, lossless FLAC, ~280 cues): a real door latch, creak and close, footsteps on wood, soft rustles and swashes as he drags clothes, a ticking clock that races, a glass hum and an accelerating-then-slowing heartbeat, whimpers and sniffles, a long bell on "years", and 1.8 s of dead silence on "goes dead silent". `python3 tools/forge-clothes-sfx.py` makes them (method in `tools/sfxforge.py`); credits in `shorts/dog-clothes/sfx/CREDITS.md`.
- ~2,750 frames at 60 fps: render on a PC with a GPU, with `voiceover.wav` placed in `shorts/dog-clothes/`:
  `git pull`, then `npm run render -- shorts/dog-clothes --headed`.
