# Why your dog sleeps in your doorway

Seamless-loop Short · ~31.9 s (the recorded voiceover, `Compound_Clip_3.srt`) · ~100 words · 1080×1920, 60 fps · **toon style** (flat 2D people in a 3D cartoon world) · 17 shots, each a slow eased camera move, with a **true cross-dissolve at every cut** (the old shot keeps moving while it fades out) so it flows · vivid, saturated colour · no on-screen text (only the word-by-word captions).

**What this video is about, in one sentence:** your dog skips the expensive bed to lie across your bedroom doorway, and the popular explanation is that he is guarding the one way in while you sleep.

## Voiceover (the recorded one, word for word)

> Your dog isn't actually choosing the cold floor over their bed. When you buy them a soft, expensive dog bed, but they still spend the entire night sleeping on the hard wood right in your doorway, they probably think they're just being stubborn. You see, they aren't looking for a cooler spot, they're securing the choke point. In a pack den, the entrance is the most dangerous place to sleep. It's drafty, exposed, and the first place a predator strikes. By wedging their body directly across the threshold, your dog turns themselves into a living barricade. They know that when humans fall asleep, our senses completely shut down. So, they abandon their own comfort and take the hard floor, guaranteeing that anything coming for you in the dark

The last line runs into the first on the loop: *"…anything coming for you in the dark, **your dog isn't actually choosing the cold floor over their bed.**"* The closing frame is the opening frame.

## Shot list (times follow the recorded `.srt`)

| # | Words | Picture · camera |
|---|---|---|
| 1 | Your dog isn't actually | **Hook.** Night. The dog lies across the doorway on the bare boards, glossy eyes on the lens; the velvet bed sits untouched in the foreground, moonlight in the bedroom window behind him. Slow push-in. |
| 2 | choosing the cold floor over their bed. | Orbit. A frost patch and snowflakes on the floor ("cold floor"), then a 🛏️ pops over the bed; his eyes go to the bed and back to the boards. |
| 3 | When you buy them a soft, expensive dog bed, | **Day.** The front door creaks open and you carry the plush bed in; 💰 and ✨ burst, a till rings on "expensive", you set it down, he sniffs it. |
| 4 | but they still spend the entire night | **Time-lapse.** The moon crosses the window, the hall clock's hands whirl, he sleeps in the doorway. |
| 5 | sleeping on the hard wood right in your doorway, | Low shot gliding along the floorboards (knots, grain), knocks on wood; a golden glow pulses under him on "doorway". |
| 6 | they probably think they're just being stubborn. | **Morning.** You stand over him, hands on hips, a 🐶 thought bubble, one-eyed dog. |
| 7 | You see, they aren't looking for a cooler spot, | Frost on the floor, a 🌡️ pops, a ❌ crosses it out. |
| 8 | they're securing the choke point. | **Top-down.** A pulsing red ring round the doorway, arrows tick in from the hall, a 🛡️ pops. |
| 9 | In a pack den, | **Dusk.** The wolf den: a rock arch, a dark den, pups asleep inside, the moon. The camera glides in. |
| 10 | the entrance is the most dangerous place to sleep. | The big wolf lies across the entrance; a ⚠️ pings twice; 💤. |
| 11 | It's drafty, exposed, and the | Leaves blow into the den; a pale light finds the wolf and two eyes open in the bush. |
| 12 | first place a predator strikes. | The shadow with glowing eyes springs; the wolf rises and bars the way; it yelps and flees. |
| 13 | By wedging their body directly across the threshold, | Back in the house: he walks in from his bed, turns sideways and drops into the doorway; a green width bar shows he fits it exactly. Low to top-down. |
| 14 | your dog turns themselves into a living barricade. | Hero orbit; a 🚧 pops over him with a golden glow, three wood knocks, a long bell. |
| 15 | They know that when humans fall asleep, our senses completely shut down. | One long glide from the doorway, over him, to you asleep; 👁️ 👂 👃 ✋ light up, then go dark one by one with four falling bells. |
| 16 | So, they abandon their own comfort and take the hard floor, | He leaves the soft bed (it springs back) and drops onto the boards with a sigh; a 💛 floats after him. |
| 17 | guaranteeing that anything coming for you in the dark | From behind the doorway: his silhouette in the foreground, a shadow with glowing eyes creeping down the dark hall; it stops, flees; the camera glides over him and out to the opening frame (the loop). |

## Fact-check (keep claims inside what is known)

- "Securing the choke point" is a **popular interpretation**, not a proven finding. Common, better-supported reasons dogs sleep in a doorway are: being close to you, a view of the whole home, and cooler floors. Say "many people think…", not "science shows…".
- Wolves and wild canids do rest at or near den entrances, and the entrance is the most exposed place; that part is a fair general statement, but this video does not claim any specific study.
- "When humans fall asleep, our senses completely shut down" is a simplification: we still hear, and wake to meaningful sounds, but we are much less aware. Keep it as the narrator's line, hedge it in the description.

## Upload kit

**Title options** (pick one)
1. Why Your Dog Sleeps in Your Doorway 🐶🚪
2. Your Dog Isn't Choosing the Cold Floor Over His Bed 🐶
3. The Real Reason Your Dog Blocks the Door at Night 🛡️🐶

**Tags**
`why does my dog sleep in the doorway, dog sleeps by the door, dog guarding the bedroom door, dog sleeping on the floor instead of bed, dog protecting owner at night, dog behavior, dog facts, dog and owner, dog bond, dog loves you, wolf pack den, dog instincts, cute dog, dog shorts, pet facts, animal facts, shorts`

**Description**
```
Your dog isn't actually choosing the cold floor over his bed. 🐶🚪 Many dog people think he lies across your doorway because it's the one way in: a living barricade while you sleep.
(That's a popular explanation, not a proven fact. Dogs may also just want to be close to you, see the whole home, or lie somewhere cool.)
#shorts #dogs #dogfacts

Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```

**Pinned comment**
> Where does YOUR dog sleep at night? D = the doorway, B = his bed, F = at the foot of yours 👇🐶

## Build notes (toon style)

- `shorts/dog-doorway/` (the toon toolkit: `js/toon.js`, `js/puppet.js`, `js/toonworld.js`, `js/herodog.js`). Two places: the house (a hall, the doorway, the bedroom; day and night) and a wolf den at dusk.
- **Smoothness:** every shot is a pure function of time and of its shot number, so at a cut the old shot is rendered once more into a render target (it keeps moving past its end) and cross-faded over the new shot for 0.4 s. Camera moves use a gentle ease (mostly linear speed, soft start and stop).
- **Colour:** vivid by design: saturated indigo night, orange hard-wood floors, bright blue blankets, a CSS saturation/contrast grade on the 3D canvas (the yellow captions are untouched).
- **New pieces:** the house interior (planks with knots and grain, wallpapers, a window with the moon, a front door, a wall clock with spinning hands, furniture), the velvet-and-gold dog bed, the wolf den (rocks, pines, a dark den), a wolf pack and a shadow with glowing eyes, a sleeping person (the flat puppet turned on its side under a blanket), moon dust, a frost patch, the choke-point ring and arrows, a green width bar, thought bubbles and emoji icons.
- **Sound: real recordings only** (51 sounds, lossless FLAC, ~180 cues): a ticking hall clock, creaking boards and door, your footsteps on wood, a till for "expensive", wood knocks that build the barricade, bells that rise or fall with each icon, a heartbeat at the choke point, leaves, a growl and a yelp, snores and sighs. `python3 tools/forge-doorway-sfx.py` makes them (method in `tools/sfxforge.py`); credits in `shorts/dog-doorway/sfx/CREDITS.md`.
- ~1,910 frames at 60 fps: render on a PC with a GPU, with `voiceover.wav` placed in `shorts/dog-doorway/`.
