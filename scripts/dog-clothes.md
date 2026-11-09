# Why your dog sleeps on your dirty clothes

Seamless-loop Short · ~46 s (the recorded voiceover, `Compound_Clip_5.srt`) · ~125 words · 1080×1920, 60 fps · **toon style** (flat 2D people in a 3D cartoon world, a 3D hero dog) · 20 shots, each a slow eased camera move, with a **true cross-dissolve at every cut** · vivid, saturated colour · no on-screen text (only the word-by-word captions).

**What this video is about, in one sentence:** your dog curls up in the laundry basket or on a jacket because your worn clothes smell like you, and that scent calms him while you are away.

## Voiceover (the recorded one, word for word)

> Your dog isn't actually being naughty when they sleep on your dirty clothes. When you come home and find them curled up in your laundry basket, or buried under an old jacket on the couch, you probably think they just like soft fabric. You see, they aren't looking for a blanket, they're using your scent as an oxygen mask. A dog has over 300 million scent receptors in their nose. While you just see an old shirt, your dog smells a biological portrait of you. Your breath, your skin, and your safety. When you close the front door and the house goes dead silent, your dog has no concept of time. They don't know if you've been gone for 8 minutes or 8 years. Their nervous system enters sensory deprivation and their heart rate spikes. So they drag your clothes into a nest and bury their snout deep into the fat, flooding their brain with oxytocin to physically slow their racing pulse. They aren't ruining your laundry, they're holding onto the only piece of you they have left until you walk back through that door. Which is why…

The last line runs into the first on the loop: *"Which is why… **your dog isn't actually being naughty** when they sleep on your dirty clothes."* The closing frame is the opening frame (the golden dog in his nest of clothes, glossy eyes on the lens).

> **Caption bait (on purpose):** the caption at 36.4 s reads "deep into the **fart**," while the voice says it right ("fat" in the original `.srt`). It is one word on line 483 of `voiceover.srt` and is not tied to any animation cue, so it is safe to change or undo: put `fat,` (or `fabric,`) back to remove it. Another safe swap, if you want a second one: `deprivation` → `depravation` (line 411). Do **not** change `receptors`, `mask`, `sensory`, `oxytocin` or other words the animation is timed to (`at("…")` in `main.js`), or the page will lose its cue.

## Shot list (times follow the recorded `.srt`)

| # | Words | Picture · camera |
|---|---|---|
| 1 | Your dog isn't actually | **Hook.** The golden dog lies in a nest of colourful clothes, glossy eyes on the lens. Slow push-in. |
| 2 | being naughty when they sleep on your dirty clothes. | Orbit round the nest; a 😈 pops over him and a ❌ crosses it out; 💨 🦠 🧦 puff up on "dirty". |
| 3 | When you come home and find them curled up in your laundry basket, | The front door opens onto the 3D garden (path, picket fence, trees, houses) and you walk in. **Close on your face** as you gasp: huge eyes, open mouth, a big ❗ and sparkles. Then over to the basket (clothes stay inside it, one tee hangs over the rim) where he wakes. |
| 4 | or buried under an old jacket on the couch, | He is asleep on the couch with a blue jacket draped over his back (the cloth lies on him, no gaps, no poke-through); 💤 rises. |
| 5 | you probably think they just like soft fabric. | Your thought bubble: a 🧸 (soft stuff). |
| 6 | You see, they aren't looking for a blanket, | Back at the nest; a 🛏️ pops over him and a ❌ crosses it out. |
| 7 | they're using your scent as an oxygen mask. | A bold cyan **oxygen mask** pops onto his whole snout (white rim, vented filter, straps), an orange hose runs to the old shirt and pink scent particles flow along it. |
| 8 | A dog has over 300 million scent receptors in their nose. | Close on the twitching nose; a golden swarm of tiny dots fills his nostrils. |
| 9 | While you just see an old shirt, your dog smells a biological portrait of you. | Your bored 😐 thought bubble ("just a shirt"), then a framed painted portrait of you pops over the pile with sparkles. |
| 10 | Your breath, your skin, and your safety. | 💨, 🖐️ and 🛡️ pop one by one over the pile. |
| 11 | When you close the front door and the house goes dead silent, | You leave through the front door into the sunny garden and the door shuts; the mood goes quiet blue; **dead silence** (every sound stops). He sits up, ears wide, wagging slowing to a stop. |
| 12 | your dog has no concept of time. | The wall clock's hands race round and round; three ❓ pop; he stares at the door. |
| 13 | They don't know if you've been gone for 8 minutes or 8 years. | The window is now a real 3D view: a tree, a neighbour's house, hills. Days and seasons fly past (sun and moon cross the sky, stars, the flat darkens at night, spring blossom → summer → red leaves falling → bare branches and snow); a low bell on "years". |
| 14 | Their nervous system enters sensory deprivation and their heart rate spikes. | He trembles, pupils huge; a green heart-rate line speeds up beside him. |
| 15 | So they drag your clothes into a nest | He trots from the basket to the nest with a shirt in his mouth and sets it on the pile (the camera glides alongside him and keeps him framed). |
| 16 | and bury their snout | He turns round on the pile, lies down and pushes his snout into the shirt (the shirt rises into a soft mound round it). |
| 17 | deep into the fat, flooding their brain with oxytocin to physically slow their racing pulse | **New place: inside his head.** A glass dog head floating in a purple dream, a glowing pink brain that pulses, pink oxytocin particles and 💗 pouring in from a shirt, rings that spread with each beat, and a heart line that slows from racing to calm. |
| 18 | They aren't ruining your laundry, they're holding onto the only piece of you | **Golden hour.** Back in the flat, low across the room: he sleeps holding the shirt, the setting sun and red autumn trees glow in the window, a sunbeam and floating dust, a 💛 drifts up. |
| 19 | they have left until you walk back through that door. | **Outside.** Autumn sunset over the street: you run up the garden path toward the camera (picket fence, lamp posts, red and gold trees, neighbour houses, the sun low on the street), the camera swings round to the front of the house, you reach the door and it opens with a warm light. |
| 20 | Which is why… | Inside: he hears you (head up, tail thumping, a whimper), the door shuts behind you and he settles into the opening pose as the camera glides back to the opening frame (the loop). |

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

**Pinned comment** (pick one)
> Where does YOUR dog nest? L = your laundry, J = a jacket, C = the couch, B = his own bed 👇🐶

> There's a typo in this video 👀 Find it and tell me what the word should be 👇 (and tell me where your dog sleeps while you're at it 🐶)

**Bait tips:** don't mention the typo in the title or first line of the description (it should feel like a real slip); don't correct it for the first few hours; when people comment, reply with one short line ("what typo? 👀") to keep the thread going. Keep it mild: a vulgar word in the captions can limit ads or get a Short age-restricted, and the words must never be a slur or about a real person.

## Build notes (toon style)

- `shorts/dog-clothes/` uses the toon toolkit (`js/toon.js`, `js/puppet.js`, `js/toonworld.js`, `js/herodog.js`) plus the new `js/cloth.js`. One room (door, window, couch, rug, plant, wall clock, laundry basket) in three moods: bright day, quiet blue, warm gold.
- **The world outside** (`shorts/dog-clothes/outside.js`) is real 3D: our house seen from outside (siding, gable roof, chimney, fake windows), the front garden with a path, flower beds, hedges, a picket fence, a mailbox, two parked cars, a street with lamp posts and neighbour houses, 14 leafy trees (instanced, outlined leaves), grass blades, wild flowers, hills and clouds, and a sky dome with a sun, a moon and stars. `outside.set({ light, warm, sunEl, sunAz, season })` is a pure function, so every frame can be redrawn: leaves recolour (blossom, green, red and gold) and fall off, snow covers the ground and roof, and the flat's light follows the day. Seen through the door (shots 3, 11), the window (13) and from the garden (19).
- **Visibility:** every icon and thought bubble is kept inside the frame (it is pulled back in from the edges and kept big enough to read), the cameras for the shots with reactions are wide enough, and the gasp in shot 3 is a face close-up.
- **Smoothness:** every shot is a pure function of time and of its shot number, so at a cut the old shot is rendered once more into a render target (it keeps moving past its end) and cross-faded over the new shot for 0.4 s. Camera moves use a gentle ease; the carry shot follows the dog's own motion so he stays framed.
- **Variety in the last part:** inside his head (17), golden hour (18), outside (19) and back in the nest (20), instead of one room with the camera moving.
- **No artifacts:** nothing intersects: the dog sits at the compressed pile height, cloth is lifted above whatever supports it, the dog is in front of or inside the pile on purpose; static outlines are only used on things that never move (the door and clock hands are dynamic).
- **Sound: real recordings only** (47 sounds, lossless FLAC, ~280 cues): a real door latch, creak and close, footsteps on wood, soft rustles and swashes as he drags clothes, a ticking clock that races, a glass hum and an accelerating-then-slowing heartbeat, whimpers and sniffles, a long bell on "years", and 1.8 s of dead silence on "goes dead silent". `python3 tools/forge-clothes-sfx.py` makes them (method in `tools/sfxforge.py`); credits in `shorts/dog-clothes/sfx/CREDITS.md`.
- ~2,750 frames at 60 fps: render on a PC with a GPU, with `voiceover.wav` placed in `shorts/dog-clothes/`:
  `git pull`, then `npm run render -- shorts/dog-clothes --headed`.
