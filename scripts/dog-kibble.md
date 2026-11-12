# Why Your Dog Carries His Food to You — `shorts/dog-kibble/`

~36.4 s · 1080×1920 (render 2160×3840) · 60 fps · toon style · **one world** (the flat with a kitchen nook) · 8 shots · pixel captions · real SFX · seamless loop
First video built to `VIRAL_FORMULA.md`.

## The voice

The ElevenLabs take (42.9 s) was tightened with `tools/tighten-voice.py`: every pause cut, phrase edges overlapped, 60 ms of soft
lead-in/tail kept so "th-"/"wh-" consonants are never clipped. Result: **36.4 s, no dead air, ≈4 words per second**
(`voiceover.wav`). There was no .srt, so the transcript was recovered from the audio and every word force-aligned
(`words.json`); `voiceover.srt` holds the 94 caption chunks (a fast word is glued to its neighbour, as the formula allows).

Transcript as captioned (reconstructed from the audio, please check the words marked ⚠):

> Your dog isn't actually being messy when they carry food into the living room. When they grab a mouthful of **kibble** from their
> bowl, walk over to where you're sitting and drop it on the **rug next to** your feet, you probably think they're just playing with
> their dinner. You see, in the animal kingdom, eating alone is **terrifying** ⚠. Lowering your snout to a bowl **cuts off** ⚠ your
> peripheral vision and leaves you completely defenseless to an ambush. The dog's instinct tells them that eating in an empty
> kitchen is a risk, so they carry their food to you. Their nervous system only **feels** ⚠ safe enough to lower its guard and
> swallow when the protector is in the room. They don't bring their dinner to your feet to make a mess. They do it because **you're** ⚠
> the only reason they feel safe enough to eat. Which is why…

⚠ = the recogniser could not decide between two readings ("terrifying/terrified", "cuts off/blocks", "feels/feel" and a missing
"will", "you're/you were"). If the script differs, change `words.json` + `voiceover.srt` (same words, same times).
"Which is why" runs straight into "Your dog isn't actually…" when the video loops.

## Shots (all in the same flat: the bowl is in the kitchen nook, the couch is five steps away)

| # | Time | Words | Picture (a real thing happening) | Camera | In-world graphic / acting |
|---|---|---|---|---|---|
| 1 | 0.0–2.05 | Your dog isn't actually being messy | He trots straight at you, cheeks stuffed with kibble, crumbs falling | Hook: dolly back ahead of him at his height | Glossy eyes, ears up, kibble ticking on the floor |
| 2 | 2.05–3.78 | when they carry food into the living room | Side track across the room, a trail of crumbs | Tracking 3/4 front | |
| 3 | 3.78–9.27 | When they grab a mouthful of kibble … drop it on the rug next to your feet | At the bowl he crunches, scoops a mouthful, trots **toward the camera**; the camera becomes **your eyes**: your 3D knees and shoes, he drops the food beside them and sits looking up | Bowl 3/4 → lead camera ahead of him → your POV | Real kibble pieces carried, dropped, bouncing |
| 4 | 9.27–11.38 | you probably think they're just playing with their dinner | Reverse shot: your skeptical face (arms crossed), his tail wagging in the foreground | Slow push-in | The only "thought" is an expression |
| 5 | 11.38–24.69 | You see, in the animal kingdom … so they carry their food to you | **One 13.3 s take in the dim kitchen:** he eats alone; "terrifying": head snaps up, trembling; his **field of view** is a green fan on the floor that **collapses to a slit when his snout goes into the bowl** while the **blind zone turns red**; a **shadow wolf with glowing eyes** prowls in it, a red arrow, the lunge; he snaps up, kibble flying; he scans the empty kitchen; red alarm rings; he takes a mouthful and trots to you | Low front → pull back (alone) → push-in → high 3/4 for the fan → orbit → follow | Colour code: green safe, red danger, amber alert |
| 6 | 24.69–29.71 | Their nervous system only feels safe enough to lower its guard and swallow when the protector is in the room | **One 5 s take, high 3/4 from the room:** he trots in tense (his **nervous system glows red and jittery along his spine**) slowing as he arrives, drops the food beside your shoes, eats; the **glow turns calm teal**, a gulp; you sit up watching over him; **your gaze covers his blind zone in gold** and a **golden dome** closes round you both | Slow push, then a pull-back for the dome | Heartbeat slows; gold = protection |
| 7 | 29.71–35.58 | They don't bring their dinner to your feet to make a mess … they feel safe enough to eat | POV: he chews **with his head up between bites** (his face to the camera), the last piece is gone as he says "a mess" (the rug is clean); then **your 3D hand** pets him, eyes close, tail thumps; **one 3D heart** | POV, slow push toward his face | The only icon of the video |
| 8 | 35.6–36.43 | Which is why | Back to the first frame: he trots at the camera with a full mouth | The hook camera, 0.8 s before frame 1 | Loop |

### Self-check against `VIRAL_FORMULA.md`

| Rule | Result |
|---|---|
| R1 one world | **100 %** in the one flat; the kitchen nook and the couch are the same room (no portals needed) |
| R2 medium shots | Dog's face/chest 55–80 % of the frame in the hook, POV and bowl shots; the wide shot only for the dome reveal |
| R3 camera never rests | Yes: every shot has a moving path. Longest uncut take **13.3 s** (reference: 11.3 s). For a 36 s video that is 37 %, not the 50 % the rule says: the act changes in the POV shots are cuts on a clause start (see below) |
| R4 hard cuts on clause starts | 7 cuts: 2.05, 3.78, 9.27, 11.38, 24.69, 29.71, 35.6, each on the first word of a clause; no dissolves. 2 cuts in the first 4 s, average shot 4.6 s (reference 4.9 s) |
| R5 explanation inside the world | Vision fan, blind zone, shadow wolf, threat arrow, alarm rings, glowing nervous system, golden gaze and dome, 3D legs and hand |
| R6 emojis | **0** emoji; **1** 3D heart at 34.4 s |
| R7 faces | His eyes/ears/tremble/blissful closed eyes; your face in the reaction shot and the dome shot |
| R8 hook | Frame 1: the dog, big, mouth full; first word at t = 0 |
| R9 beats | ≈ 28 beats in 36 s (one per 1.3 s) |
| R10 captions | One chunk at a time, ≈ 66 % height, pixel font drawn in code |
| R11 voice | No gaps; mix mastered to −14 LUFS (`mix.lufs`) |
| R12 ending | Last frame = first frame; the hero returns |

## Fact check (kept honest in the description)

Prey-animal vigilance while feeding (head down = narrower field of view, more scanning) is well documented, and dogs do carry food
away and often eat more readily with a person nearby. That *this* is why a particular dog moves his kibble is a hypothesis, and so is
"your presence calms his nervous system": the video is dramatised, and dogs also move food for other reasons (a softer floor, a noisy
metal bowl, hiding it, play, hunger or food guarding). The description says so in one line.

## Upload kit

**Title (pick one)**
1. Why Your Dog Carries His Food to You (It's Not a Mess) 🐶🍽️
2. Your Dog Drops His Dinner at Your Feet. Here's Why 🐶❤️
3. He Doesn't Want to Eat Alone 🐶

**Tags**
```
why does my dog carry food to the living room, dog carries kibble to the carpet, dog drops food at my feet, dog takes food out of his bowl, dog eating habits, dog wants company while eating, dog instincts, dog behavior, dog facts, dog and owner, dog bond, dog loves you, wolf instinct, cute dog, dog shorts, pet facts, animal facts, shorts
```

**Description**
```
Your dog isn't being messy when he carries his dinner to you. 🐶 In the wild, eating alone with your head down is dangerous: you can't see what's coming. So many dogs take their food to the person who makes them feel safe. Next time kibble ends up at your feet, that's a compliment. ❤️
(It can also mean a softer floor, a noisy bowl or just play: watch the whole dog. The video is dramatised: science plus a little poetry.)
#shorts #dogs #dogfacts

Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```

**Pinned comment**
```
Does your dog eat next to you, or does the kibble end up at your feet? Tell me 👇🐶
```

## Motion QA (polish passes)

`node tools/qa-motion.mjs shorts/dog-kibble --step 2` steps through the whole timeline without rendering and measures every moving thing
(camera position and aim, dog origin/head/mouth, wolf, hand, lights, every kibble piece, every graphic's visibility). Passes found and fixed:
a 4–5 m/s camera whip into the chase shot (now one continuous orbit round his smoothed head, handing over to your POV), a too-fast push-in at
"terrifying", look-at weights that stepped (now eased), the camera shaking with his chewing (the look-target is now a low-passed head position),
a wag whose speed changed mid-video (it spun the tail's phase: sin(t·speed) with t ≈ 30 s; now one speed), legs that snapped in and out of the trot
(now they follow his speed), a head that jumped from raised to bowl-height and a 43° head-yaw snap (smooth descent, scan fades out), a 20° yaw snap
when the exit began, kibble that vanished and reappeared (now flies from the bowl into his mouth), the wolf popping in (now grows from nothing),
an alarm light that flickered (now a slow pulse), and the loop shot not matching frame 1's lighting. A low-pass over every pose value
(`dogStateF`) removes whatever small steps remain. Last run: only expected fade-toggles (graphics going from opacity 0), and a one-frame
step at the loop seam, equal to any other frame.

## Build notes

- `main.js`: the whole story as pure functions of time (dog, owner, kibble, wolf, graphics, light, cameras) + the cue sheet (≈ 250 cues).
  `props.js`: bowl, kibble, a bounce function, the wolf's glowing eyes. `room.js`: the flat with a kitchen nook (counter, fridge, bowl mat).
- New formula tools: `js/caption-pixel.js` (pixel-font captions), `js/camera-path.js` (a camera that never stops: waypoints with continuous velocity),
  `js/graphics3d.js` (vision/zone fan, shield dome, floor arrow, alarm rings), `tools/mix.mjs` option `lufs` (mastering), `tools/forge-kibble-sfx.py`.
- His mouth is solved at load time (`mouthRel`, `solvePitch`, `originFor`): the dog's origin is placed so that his mouth lands exactly on the bowl,
  on the pile of kibble, or on each piece he eats.
- The POV shots hide your puppet and show your 3D legs and shoes (and later your hand), so "next to your feet" is literal.
- Render: `npm run render -- shorts/dog-kibble --headed` (2,187 frames, 2160×3840; the tightened voiceover is already in the folder).
