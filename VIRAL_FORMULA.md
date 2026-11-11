# The viral formula — read this before making ANY short

This is the standing production guide for every new video in this studio. It comes from a frame-by-frame study of one
viral 3D animal Short (reference below) plus the owner's direction. **Before you plan, write code or animate: read this file,
write the shot plan in the format of §6, and check it against the rules in §3.** After rendering, run the checks in §9.

Tags used below: **[M]** measured from the reference video (numbers you can re-measure with `tools/analyze-video.py`),
**[O]** observed by eye in the frames, **[I]** inference or adaptation: a reasoned guess, not something the reference proves.
One video is a small sample and I have no retention data for it, so treat every rule as a strong default, not a law of nature.
If the owner asks for something that contradicts a rule, the owner wins.

---

## 0. The idea in one paragraph

The reference video keeps people watching **by never making them work and never letting the picture sit still**: one place,
one continuous camera, the actual *thing being explained* shown at medium range so the viewer sees it happen, with the
explanation drawn **inside the 3D world** (colour-coded arrows, tinted body parts, instruments, props) instead of on top of
it as emojis or text. Cuts and new places are rationed to the first 5 seconds (the hook). After that the camera glides around
**one set** while a new visual beat lands on every clause. What looked like "variety" is camera angle and action, not
teleporting to a new environment. Our earlier shorts did the opposite: 9 places, 40 cuts, and emoji icons doing the explaining.

## 1. The reference (what was studied)

*"Come dimagriscono i gatti in sovrappeso"* (How overweight cats lose weight), `@LowPolyPaws`: 19.5 s, 1080×1920, low-poly
3D Sims-style world, 4 shots, one voice, one-word captions. Don't copy its art, characters, font or handle — copy the structure.

Narration (about 60 words, ≈3 words per second [M]):
> If cat gets too chubby, vets may [put] her in a treadmill full of water. But some cats learn to cheat. You see, water holds
> part of the weight, so legs carry less. The water pushes back on legs, so each step is harder. So some cats step off the
> belt and stand on the side, because the belt doesn't move. That's why vets use pool noodles to keep them walking.

### Timeline (times ±0.1 s)

| Time | Setup | Words | What you see (literal, no icons) | Camera | Graphics / acting |
|---|---|---|---|---|---|
| 0.0–1.8 | **A** kitchen | If cat gets too chubby, vets | A man crouches hugging a huge cat and lowers it onto a scale; a kitten leans on the scale; the needle swings up into the red zone | Medium shot of the hug, a quick tilt-down + push-in (0.5–1.0 s) ending on the dial in close-up | The dial *is* the graphic. Man smiling, kitten as a gag |
| **1.80** hard cut | **B** porch | may [put] her in a treadmill full of water | Same man holds the cat above a clear tank of water on a treadmill and lowers her in | Medium shot, gentle push | The man's smile turns to shock, the cat's eyes go huge. Two kittens watch from the bottom edge |
| **3.80** hard cut | **C** living room | But some cats learn to cheat | A grey cat leans in and whispers to the teary orange one; the orange one's eyes pop wide | Eye-level two-shot, slow push-in | The **only emoji of the video**: a pixel light bulb over the cat, ≈1 s |
| **5.42** hard cut | **D** the tank, **one uncut take until 16.7 s (11.3 s)** | You see, water holds part of the weight, so legs carry less. The water pushes back on legs, so each step is harder. So some cats step off the belt… because the belt doesn't move | Side view of the cat walking in see-through water, kittens in the foreground like an audience | Low wide side view → slowly rises and closes in to a 3/4 view (8–12 s) → pulls back → high, nearly top-down on the belt (14–16.5 s) | **6.3 s** green arrows rise through the water ("holds part of the weight"); **8 s** feet glow green ("carry less"); **9.3 s** red arrows push against the legs ("pushes back"); **11.5 s** feet pink-red ("harder"); **13–15 s** the cat leaves the belt and stands at the back; **15.5 s** the belt is tinted flat pink with white chevrons ("the belt doesn't move") |
| **16.7** swoop (not a cut) | **E** same tank | That's why vets use pool noodles to keep them walking | A 0.2 s pull-back reveals the man carrying a giant striped noodle; he drops it into the tank as a ring around the cat | Fast pull-back, then slow | The noodle is a real prop. At 19.0 s the fat orange cat from the hook leaps in: a callback to frame 1 |

### Numbers [M]

| Measure | Value |
|---|---|
| Length / shots / hard cuts | 19.5 s / 4 shots / 3 cuts, **all in the first 5.4 s** (1.80, 3.80, 5.42) |
| Longest uncut take | 11.3 s of camera glide (14.1 s inside the same set); that set fills **72 %** of the runtime |
| Cut placement | Each cut lands within ~0.1 s of the first word of a new clause or sentence |
| Average shot length | 4.9 s overall, but 1.8 s in the hook and 11–14 s in the explanation |
| Visual beats | ≈14 (scale needle, tank, whisper, bulb, green arrows, green feet, red arrows, pink feet, cat steps off, pink belt, noodle reveal, noodle placed, jump…) = **one every ≈1.4 s** |
| Emojis / text | **1** emoji (1 s) / no text but captions and in-world signs ("TREADMILL 3000") |
| Captions | One word at a time, ≈0.3 s each |
| Motion energy per 0.5 s (analyzer units) | Hook 9–14 → cuts 4–6 → **explanation 1–3 (the calmest part, 1 in the middle)** → payoff 5–8 |
| Audio | One continuous voice, **0 silent slices**, ≈ −11 LUFS integrated (very loud); I cannot separate any music or sound effects from the voice |
| Frame rate | 59.94 fps container, but only ≈92 % distinct frames: the smoothness comes from slow camera moves, not frame rate |

**The energy curve is the skeleton: HOT hook → CALM, readable explanation → HOT payoff.** [M]

---

## 2. Why it works [I]

1. **Nothing to decode.** The viewer sees the cat in water; they don't parse a symbol that stands for water.
2. **One set, so the brain stops re-orienting.** Every new location costs half a second of "where am I?". The reference spends that only in the hook.
3. **The camera is the variety.** Low side → rising 3/4 → top-down gives three looks at the same tank without leaving it.
4. **Every clause pays off visually within ~1.4 s,** so the viewer never waits for the picture to catch up with the voice.
5. **Faces carry feeling.** Man: smile → shock. Cat: tears → wide eyes. Kittens watch like an audience. The viewer reacts with them.
6. **Colour is the language.** Green = easier, red = harder, pink = idle belt. Once learned, no words are needed.
7. **A callback ends it.** The hero cat from frame 1 jumps in at the end, so the viewer feels a loop and often re-watches.

---

## 3. The rules

### R1 — One world
- **At least 70 % of the runtime inside ONE set.** A short may use a different place only in the hook (≤ 2 extra places, the first 6 s), and one more if the story truly needs it.
- Variety comes from **camera angle, zoom, action and props**, never from teleporting.
- Need a faraway or abstract thing (wolves, space, a brain)? Bring it **into the set** [I]: a TV, a window, a storybook, a photo, a snow-globe or a miniature on the table, and push the camera into it. Don't build a new world for it.

### R2 — Medium shots of what is happening
- **When the voice says "you", the camera can BE you** (POV): show your 3D legs, shoes and hand (`dog-kibble` shots 3, 6, 8). "Next to your feet" becomes literal, and the dog looks into the lens.
- The subject fills **55–80 % of the frame height.** Camera at the animal's eye height (or a little above).
- Show the actual action: the dog pawing the hand, the water in the tank. Not a wide establishing shot, not a symbol.
- Close-ups only for payoffs (a dial, a paw on a hand, a face reacting). One wide "reveal" per video, on the swoop.
- Keep faces and key action in the **top 60 % of the frame**; the caption sits at ≈66 %, the bottom 25 % is foreground (kittens, props) [O].

### R3 — The camera never rests, and it's slow
- Always moving: slow push-ins, slow orbits, tilt-ups, rises. Never a locked frame, never a shake, never a snap zoom.
- **Uncut takes carry the explanation.** ≈ 20 s video: one take of ≥ 50 % of the runtime (the reference: 11.3 s = 58 %). Longer videos: every act is one take of **11–14 s** (dog-kibble: a 13.3 s take, 37 % of 36 s) and the takes together are ≥ 50 %. Plan each as a path with 3–5 waypoints that changes the view (low side → 3/4 → high) while the idea advances (`js/camera-path.js`).
- Speed targets (analyzer units per frame): explanation **1–3**, hook **8–14**, payoff **5–8**. A fast move (≤ 0.25 s) is allowed only as a *swoop* that replaces a cut (pull-back reveal) or in the first second.
- Keep the camera **outside** things and use see-through materials to look in (see R5).

### R4 — Cuts: few, hard, on the beat
- **Hard cut** (no dissolve) at the **first word of a new clause** (within 0.1 s). [M]
- Cuts live in the **first 5–6 s only** (the reference: 3). After that, change view with a camera move or a swoop, not a cut.
- Cut to a **different subject or angle of the same idea**, never the same framing twice.
- A dissolve is allowed only for a jump in **time or place** (dawn, a flashback). Cross-dissolves everywhere are *not* the formula. *(This replaces our earlier "dissolve at every cut" habit; the owner can reverse it.)*

### R5 — Show it in the world. No labels.
Explain with things that exist inside the 3D scene. In order of preference:

| To say… | Use… |
|---|---|
| a state ("too fat", "tired") | an **instrument** showing it: the scale's needle, a gauge, a meter |
| an invisible force (buoyancy, pressure, smell, attention) | **flat 3D arrows** (translucent, glowing, animated along the flow) in the scene |
| a body part matters ("legs") | **tint that part** (green/red/pink glow or a flat colour shell) |
| an object that does nothing | **tint it flat + chevrons** that don't move |
| something hidden or underwater | a **see-through volume** (clear tank) with the subject visible inside |
| a cause or solution | the **real prop**, carried in and used on screen (the pool noodle) |
| a feeling | **the face and body** (eyes, brows, ears, tail), plus a reacting audience |
| a thought or an idea | one **in-style icon**, once (see R6) |

Never use ❌/✅ or a crossed-out picture. Show *no* by the thing being refused: the dog turns away, the arm pulls back, the object shakes off.
- **Colour code (keep it constant inside one video):** green = easy / good / less, red = hard / force / danger, pink or grey = inactive, yellow/gold = affection or idea, blue = water or calm.
- Arrows and tints appear **on the keyword** and fade when the clause ends.

### R6 — Emojis and icons: almost none
- Default **zero**. At most **one per 20 s**, only as a *thought beat* (the light bulb), ≈1 s, and in the world's art style (our 3D toon models from `js/icons3d.js`, never the system emoji sprites).
- Never use an icon to explain, to cross something out, or to stand for an object that can simply be shown.
- No text labels anywhere except the captions (the owner's standing rule). In-world signs (a clock, a sign, a "TREADMILL 3000" plate) are fine.

### R7 — Acting: every beat has a face
- Every beat has a reaction from a character: a double-take, tears, wide eyes, a sigh, a happy wiggle. Eyes are big and glossy.
- Put a small **audience** in the bottom foreground (puppies, kittens, a bird) that watches and reacts. It adds depth, life and humour while the explanation is calm. [O]
- Gags are physical and tiny: the kitten pushing the scale needle, the whisper, the dog sliding off the couch.

### R8 — The hook (0–2 s)
- **Frame 1 already shows the funny or absurd subject doing something**, big in frame (the huge cat hugged by a man). No title, no logo, no black, no establishing shot.
- **The first word is spoken at t = 0** and its caption is on frame 1.
- Highest motion of the video: a tilt/push in the first second, a cut at ≈1.8 s.
- The hook sets up the question the rest of the video answers, and shows its **hero** (the callback target).

### R9 — Pace: a beat per clause, ≈1.4 s
- Break the script into clauses (R-procedure §6). **Each clause gets its own visual beat** that lands on the keyword, not before it, never later than 0.2 s after.
- Between beats the camera and the characters keep moving (idle acting, tails, breathing, kittens).
- No beat may last more than ≈2.5 s without something new happening.

### R10 — Captions
- **One word at a time**, centred, ≈66 % of the frame height, always the same size, chunky bitmap/pixel-style font, yellow fill, dark red outline, thin cool glow. [O]
- Switch on the word's onset. Never more than one line, never two words together (except a glued pair like "pool noodles" if a word is under 0.15 s).
- A small semi-transparent handle/watermark just under the caption, optional.

### R11 — Voice and sound
- The voice runs **without pauses** (cut every silence, overlap phrase edges: `tools/tighten-voice.py`), ≈3 words/s [M].
- Master loud and clean: aim ≈ **−14 LUFS integrated, true peak ≤ −1 dBFS**. The reference is ≈ −11 LUFS; our recent mixes are −19 to −25 LUFS, which is too quiet on a phone. [M]
- Sound effects stay **real recordings** (owner's rule), tied to the beats (the scale, the splash, the paw tap), ducked under the voice. They are optional: the reference's voice dominates.

### R12 — The ending
- Land the payoff with the loudest action of the last 3 s (the noodle ring, the leap).
- **Callback to frame 1** (the hero returns) so it reads as a loop. Keep the owner's standing preference: the **last frame = the first frame** whenever the story allows it.

---

## 4. Anti-patterns (what the earlier shorts did wrong)

| Anti-pattern | Example from our shorts | Do instead |
|---|---|---|
| Too many places | `dog-gaze`: 40 shots in 9 places (room, wolves, space, campfire, lab, stage, brain…) in 78 s | One home set + diegetic portals (TV, window, book) |
| Too many cuts | `dog-gaze`: average shot 1.9 s; `dog-paw`: 1.3 s | Cuts only in the hook; long glides afterwards |
| Emoji as explanation | ❌ over a bubble, 🧰→❤️, 🔁, ⏸️ | Show the thing: a refused treat, a paw that lifts, a wagging tail |
| Cross-dissolve everywhere | every cut dissolved | Hard cut on a clause start; swoop; dissolve only for time |
| Wide or tiny subjects | dog small under a bokeh stage | 55–80 % frame height |
| Pretty but abstract scenes | glass brains, DNA helix | A cause you could film: a hand, a paw, a dish |
| Quiet mix | −19 to −25 LUFS | ≈ −14 LUFS |

---

## 5. Our engine vs the formula (what exists, what to build)

**Exists:** hero dog with expressive pose params; flat 2D people with big expressive faces; toon rooms and worlds; eased camera
functions; 3D toon icons (`js/icons3d.js`); word captions (`js/voiceover.js`); real-SFX pipeline; 2× / 4K render; seamless-loop helpers;
the `?scale` renderer; `tools/analyze-video.py` (this guide's measuring stick).

**To build when a short needs it (do not skip: these are what make R5 possible):**

| # | Tool | Purpose |
|---|---|---|
| ✅ | **Built for dog-kibble:** `js/graphics3d.js` (floor fans, shield dome, floor arrow, alarm rings), `js/camera-path.js` (B3), `js/caption-pixel.js` (B5), `tools/mix.mjs` `lufs` option (B8), hard cuts (no dissolve: B4) | R3, R5, R10, R11 |
| B1 | `js/graphics3d.js` — flow **arrows** (path-following, translucent, glowing, colour-coded), **tint shells** for body parts/objects, **chevron strips**, ring pulses | the diegetic graphics of R5 |
| B2 | **See-through volumes** (a clear tank, a glass of water, a window) with the submerged subject still visible and a surface line | R5: show what is hidden |
| B3 | `longTake(waypoints)` — Catmull-Rom camera path with eased speed, plus `swoop()` (a 0.2 s pull-back) | R3 |
| B4 | **Hard cut** as the default in `createDissolve` (half-length 0), and a "dissolve" only on request | R4 |
| B5 | **Caption preset**: one word, bitmap font, yellow/red, ≈66 % height (`wordCaptions` option `wordsAtATime: 1`) | R10 |
| B6 | **Audience** cast: small animals in the bottom foreground with idle + reaction animations | R7 |
| B7 | **Diegetic portal**: a TV/window/book that shows another scene through a render target | R1 |
| B8 | `tools/mix.mjs` option to master to a target LUFS (−14) with a limiter | R11 |

---

## 6. From script to shot plan (do this every time)

1. **Read the script aloud with the timing.** Split it into clauses. A clause = one idea, ≈1–2.5 s of speech.
2. **Pick the world.** One set where the whole subject can be filmed (living room, kitchen, garden, vet table). Pick the **hero object/place** that carries the idea (the tank, the couch, the bowl). Anything far away becomes a portal (R1).
3. **Pick the hook** (frame 1): the hero doing the funniest, clearest thing, large in frame.
4. **Write the plan as a table** and show it to the owner before building if the script is new:

| Clause (words) | t0–t1 | The picture (a literal thing happening) | Shot size + camera move | In-world graphic (R5) | Reaction (R7) | Cut? |
|---|---|---|---|---|---|---|

5. **Mark the energy curve** (HOT/CALM/HOT) and the **uncut take** (≥ 50 % of the runtime, start it at ≈5 s).
6. **Check the budget:** places ≤ 3 (≥ 70 % in one); cuts only in the first 6 s; emojis ≤ 1; beats ≈ one per 1.4 s; hero returns at the end; loop.
7. Only then build: world → cast → camera path → graphics → captions → sound.

### Bad plan → good plan (example from `dog-paw`)
- Bad: "their paw is their only tool of affection" → stage with a giant paw, a toolbox emoji that turns into a heart.
- Good: the dog's paw rests on the owner's hand; the camera pushes in; his toe beans glow pink where they touch, the owner's hand curls around it. (A real action, a tint, a reaction.)

## 7. Adapting the length [I]

| Length | Shape |
|---|---|
| ≈ 20 s | the reference exactly: 3 hook cuts + one long take + a swoop + a callback |
| 30–45 s | hook (5 s, ≤ 3 cuts) → **act 1** long take (12–18 s) → one hard cut at a sentence start → **act 2** long take (≈12 s) → swoop/payoff + callback. ≤ 2 sets |
| 60–80 s | hook → 3–4 acts of 12–18 s, each ONE long take on the home set (act changes are hard cuts on a sentence start; at most one second set, entered through a portal or a door). Escalate the camera across acts (low → high → top-down → wide), and re-use the hero prop |

## 8. Keep from our earlier work (owner's standing preferences)

- Our own look: **toon style, flat 2D people in a 3D cartoon world, 3D hero dog.** Don't copy the reference's art.
- Word captions only, **no other text**; **real recorded SFX only** (CC0/CC BY, clean, crisp, no wind, no synthesised sounds, no whooshes/booms); a **CC BY credit line** in every description that needs one.
- 1080×1920 at 60 fps, rendered at **2× (2160×3840)** for a sharp upload; vivid saturated colours; a glossy-eyed, cute hero dog in frame 1; emoji replaced by 3D models.
- Every video comes with **title, tags, description and pinned comment** (`scripts/<name>.md`).
- Seamless loop (last frame = first frame) when it fits; word timing from a **recorded `.srt`**; don't change the owner's script text except where they ask (deliberate typos on request).

## 9. QA before you say "done"

Run `python tools/analyze-video.py out/<name>.mp4` (it works on our renders and on reference videos; needs ffmpeg + numpy), then check:

- [ ] Frame 1 shows the hero, big, doing something; the first word is at t = 0 with its caption.
- [ ] ≥ 70 % of the runtime in one set; ≤ 3 sets total.
- [ ] Hard cuts only in the first ≈6 s, each on a clause start; none during the explanation.
- [ ] Longest uncut take ≥ 50 % of the runtime; motion energy in the explanation ≈ 1–3.
- [ ] A visual beat on every clause (≈ one per 1.4 s), nothing static for > 2.5 s.
- [ ] Emojis ≤ 1 per 20 s; **no icon explains anything an object could show**; no ❌.
- [ ] Every explanation graphic is **in the world** and colour-coded consistently.
- [ ] Characters' faces react on every beat; the audience reacts.
- [ ] Captions: one word, ≈66 % height, readable on a phone.
- [ ] Voice without gaps (`analyze-video.py` says "no dead air"), ≈ −14 LUFS, peak ≤ −1 dBFS.
- [ ] The hero returns at the end; last frame = first frame.
- [ ] Looked at stills at **full resolution** for the hook, every beat, and the loop frame.
