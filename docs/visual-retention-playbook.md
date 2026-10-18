# Visual retention playbook for the 3D dog Shorts

Research compiled 2026-10-18 for the six scripted Shorts in `shorts/dog-*` (`voiceover.srt`).
It answers one question: **what should the 3D scenes look like, and how should they move, so
people stop scrolling and keep watching to the end?**

The scripts already do the verbal work (hook line, twist, emotional payoff). This document is
the visual companion. It covers:

1. [What YouTube actually measures](#1-what-youtube-actually-measures)
2. [Why people keep watching: the mechanisms](#2-why-people-keep-watching-the-mechanisms)
3. [The retention timeline for a 20–35 s Short](#3-the-retention-timeline-for-a-2035-s-short)
4. [The visual system for this channel](#4-the-visual-system-for-this-channel)
5. [Recipes for this engine (Three.js r170 + GSAP 3.15)](#5-recipes-for-this-engine-threejs-r170--gsap-315)
6. [Shot-by-shot blueprints for the six scripts](#6-shot-by-shot-blueprints-for-the-six-scripts)
7. [Script and caption fixes found during research](#7-script-and-caption-fixes-found-during-research)
8. [Pre-render checklist and measuring after upload](#8-pre-render-checklist-and-measuring-after-upload)
9. [Myths and unverified numbers](#9-myths-and-unverified-numbers)
10. [Sources](#sources)

**Evidence tiers** used throughout:
**O** official platform statement · **S** strong science (replicated / converging studies) ·
**M** moderate (single study, lab-bound) · **T** third-party industry data (sample size given) ·
**P** practitioner opinion · **I** our own inference.
No peer-reviewed study measures Shorts retention directly, and YouTube publishes no
benchmarks. Treat every rule as a hypothesis to confirm against your own analytics (§8).

---

## 0. The short version

1. **Frame 1 is the thumbnail.** The Shorts feed shows no thumbnail, so the first frame must
   already show the dog, the situation, and motion. Use no title card, logo or fade-in. **O/T**
2. **Use one sharp motion onset in the first 0.3 s, ideally moving toward the camera.** Motion
   *onsets* and *looming* capture attention. Steady motion and receding motion do not. **S**
3. **Show the dog's eyes early, big and lit.** Use baby-schema proportions (big eyes, round
   head, short muzzle) and an inner-brow raise. Give the dog catchlights and real blinks. **S/M**
4. **Answer the hook visually within 3 s** (show the conflict or the payoff), then hold back the
   explanation. Open a visual question and close it late. **O/T/M**
5. **Make the first visual change at about 1.9 s. After that, a new shot or camera event every
   2.5–4.5 s.** Fact beats run faster and emotional beats slower, but the camera is never dead
   for more than about 3 s. **T (small sample)/I**
6. **Keep one subject per frame and quiet backgrounds.** Visual complexity hurts attention later
   in the video, and cuts help. Background flicker and motion pull the eye away. **M**
7. **Keep the eyes near the centre and in the same screen position across cuts.** Cut on the
   start of an action, and carry the audio across the cut. Viewers then don't notice the edits. **S/M**
8. **Keep the realism level consistent.** Boxy cartoon dogs next to photoreal humans is the
   textbook "perceptual mismatch" that makes CG feel off. Stylise both, or keep human faces
   out of frame. **M**
9. **Light faces brightly.** Brighter lighting raised the appeal of CG characters. Lower the
   brightness for the sad beat and raise it for the payoff. Always light the eyes. **M**
10. **Lock every sound effect to its visual onset, to the frame.** Synchronised sound measurably
    pulls the eye to the matching object. **S**
11. **Make the emotional peak a sudden act of closeness.** Examples: a paw into a hand, a head
    into a lap, eye contact with the camera. A slow sad hold does not work as well. End warm.
    Sadness alone is the least-shared emotion. **M**
12. **Give the last frame the same composition as the first.** Use no end card or fade. Two of
    the scripts already loop verbally. Loops are a bonus: YouTube's averages exclude
    them. **O/I**

---

## 1. What YouTube actually measures

| Fact | Evidence | Tier |
|---|---|---|
| A **view** counts the moment a Short starts or replays, with no minimum watch time. This applied to Shorts from 31 Mar 2025 and to all formats from 24 Aug 2026. | "views are counted the moment a video starts to play across all formats" [Y1][Y2] | O |
| **Gate 1, "Stayed to watch"** (previously "Viewed vs. swiped away") | "The percentage of times viewers stayed to watch past the initial seconds of a Short." [Y1] YouTube does not say how many seconds count. | O |
| **Gate 2, average percentage viewed (APV)** counts only viewers who passed gate 1. | "Average percentage of a video watched among those who stayed to watch. This is calculated from engaged views…" [Y1] | O |
| **Engaged views** exclude loops. Averages have excluded looping-clip traffic since Dec 2021. | "…not including any loops." [Y1][Y4] | O |
| **The feed tests each Short on a small audience**, then widens or tapers. | Sherman: "Find a set of people that may enjoy your video and depending on how that goes, it may get a lot more traffic or it may kind of taper off." [Y10] | O (secondhand) |
| **Satisfaction counts, not only watch time.** | Surveys help "the system understand satisfaction, not just watch time." [Y6] | O |
| **Loops are not the target.** | Sherman: "It's not like we strictly optimize for two loops." [Y9] | O (transcript) |
| **There is no thumbnail in the feed.** | "Most Shorts are still watched in the feed, where no thumbnail exists." [Y8] | O/T |
| **Original content is favoured** (Oct 2026 update). | YouTube will "further prioritize original content and reduce the reach of content re-uploaded from other creators" [Y7] | O (secondhand) |
| Shorts can be up to 3 min long (Oct 2024). | [Y5] | O |
| **Benchmarks are unofficial.** Galloway (2023; 5,400 Shorts, 33 channels): under 60% "viewed vs swiped" rarely did well, and top performers sat at 70–90%. | [D5] Old, secondhand, and not from YouTube. | T |

**What this means for the visuals**

- There are **two separate design problems.** Gate 1 is decided in the first second or two:
  frame 1, the first motion, the first word. Gate 2 is decided by everything after that.
  A strong body cannot rescue a weak first frame, because swipers never enter APV.
- **Every second is a big share of the video.** In a 30 s Short, 1 s is 3.3% of APV. Jenny
  Hoyos targets about 90% retention [Y11]. Any shot that doesn't add information or emotion
  costs retention directly.
- **The scenes are code-built and original.** Facts with sources ("educational value") and
  consistent original characters are exactly what the 2026 originality push rewards [Y7].
  Mass-produced AI pet "slop" is the saturated, policy-exposed alternative [D16][D19]. Vary
  sets, props and camera across uploads.

---

## 2. Why people keep watching: the mechanisms

Each row is one research finding and the visual rule it leads to. Most of these studies were
run in labs with desktop displays, film clips or text, not 9:16 phone video. The direction of
each effect is the useful part. The exact numbers will not carry over.

### 2.1 Attention capture

| Mechanism | What the research shows | Tier | Rule for our scenes |
|---|---|---|---|
| **Motion onset** | "motion per se does not automatically attract attention… the *onset* of motion does" [R1] | S | Hold, then fire **one** discrete onset where the eye should land: ears flick up, head snaps round, a door swings open. Constant wiggling does not capture attention. |
| **Looming** | "translating and looming stimuli also capture attention… **receding stimuli do not**" [R2] | S | Hooks move *toward* the lens: dog running at the camera, a push-in, a crash zoom. Use receding motion (a car driving away, a pull-out) only when you *want* loss or emptiness. |
| **Flicker and motion steer gaze in video** | "flicker, motion, and their respective contrasts were the most predictive of gaze location" [R3] | M | Keep backgrounds calm. No blinking lights, waving trees or moving crowds behind a face unless they *are* the story. |
| **Centre bias** | Viewers' first response is "to orient to the center of the screen", whatever the image [R4] | S | Put the subject's eyes near the horizontal centre, in the upper-middle third (§4.2). |
| **Attentional synchrony** | Viewers' gaze on edited film is far more coherent than on unedited footage. Up to ~80% of viewers look at the same region [R5]. | S | Design every shot around one gaze target. If two things compete, viewers split and some swipe away. |
| **Visual complexity vs cuts** | "Visual complexity exerts a delayed, negative effect on attentional synchrony, whereas scene cuts… boost attention" (2,520 viewings) [R31] | M | Make cuts generously, but keep each frame simple. A busy set wears attention down a few seconds later. |
| **Edit blindness** | A quarter of same-scene edits went unnoticed, and a third when the cut came with a sudden motion onset [R6]. Continuous audio played "a surprisingly large part" [R7]. | M | **Cut on the start of an action**, keep the subject in the same screen position, and let the sound run across the cut. Fast cutting then feels smooth rather than choppy. |
| **Audio-visual synchrony ("pip and pop")** | "a simple auditory pip drastically decreases search times for a synchronized visual object" [R27] | S | **Frame-lock each SFX to its visual onset** (paw tap, tail thump, door click). The render is frame-exact, so take advantage of it. |
| **Shot length in film is falling** | Hollywood average shot length fell from about 10 s to under 4 s, motion increased, and films got darker (160 films) [R8]. | M (descriptive) | Faster editing is the long-run norm. That is not a reason to cut at random. The "darker" trend suits cinemas, not phones (§2.4). |

### 2.2 Faces, eyes, cuteness

| Mechanism | What the research shows | Tier | Rule |
|---|---|---|---|
| **Eyes get looked at when they make contact** | No general preference to fixate eyes, but eye fixations rose when the face made eye contact with the camera [R9]. | M | Give each Short **one** direct look into the lens, at the emotional peak. |
| **How people read dog faces** | People look at dog eyes, mouth and brow above chance, but "failed to attend to especially relevant dog AUs", such as ear cues [R10]. | M | Put emotion in the **eyes and brow** first, then body posture. Ears alone don't carry an emotion. |
| **Baby schema** | High baby-schema faces were rated cuter and raised caretaking motivation [R11]. The effect holds across species, and puppies were rated above human infants [R12][R13]. Seeing cute images narrows and focuses attention [R14]. | S (ratings) | Big eyes, round head, high forehead, short muzzle, big head relative to the body. Push past a real dog. These are ratings, not retention, but they are the most robust appeal lever available. |
| **Inner-brow raise (AU101)** | Dogs have a muscle that raises the inner eyebrow. The movement "increases paedomorphism and resembles an expression that humans produce when sad" [R32]. | M | The pleading "puppy eyes" pose is a scientifically grounded expression. Use it at moments of need. |
| **Uncanny valley and mismatch** | The uncanny valley "exists only under specific conditions", and perceptual *mismatch* has good support [R15]. Shape drives perceived realism and expression, material drives appeal, and realism alone "is a bad predictor for attractiveness" [R16]. | M | **Don't mix realism levels in one shot.** Stylise shapes for expression and keep materials soft and appealing. Avoid glassy non-blinking eyes and sliding feet. |
| **Empathy is stronger for dogs** | Students felt "more empathy for victims who are human children, puppies, and fully-grown dogs than for victims who are adult humans" [R20]. | M | The dog carries the emotional close-ups. Adults can be hands, legs, silhouettes and voices. |

### 2.3 Emotion, curiosity, endings

| Mechanism | What the research shows | Tier | Rule |
|---|---|---|---|
| **Arousal drives sharing** | "Content that evokes low-arousal, or deactivating, emotions (e.g., sadness) is less viral". Awe, anger and anxiety are more viral [R17]. | M (articles, not video) | Sad stories need **tension or awe** around the sadness. End on warmth or relief, not on sorrow. |
| **Being moved (kama muta)** | "evoked by experiencing or observing a sudden intensification of communal sharing" (3,542 people, 19 countries), with tears, chills and warmth in the chest [R18][R19]. | M | Make the peak a **sudden** step up in closeness: the paw grips back, the head drops into a lap, the leash is taken. The speed of the step matters more than how long you hold it. |
| **Curiosity gap** | Curiosity is "a form of cognitively induced deprivation that arises from the perception of a gap in knowledge" [R21]. High curiosity improved memory, 70.6% vs 54.1% [R22]. | M | Frame 1 shows something unexplained (a dog sleeping with a leash, a dog guarding a toilet). Hold back the visual explanation until the script gives it. |
| **Peak-end** | Remembered experience is dominated by the most intense moment and the final moments [R23][R41]. | M | Put the strongest image near the end, and make the final frame warm and clean. This affects likes, shares and follows, which fall outside retention. |
| **Music and anticipation** | Dopamine release tracks *anticipation* and the emotional peak in music [R40]. | M | Build up (light, music, camera creep) before the peak, and land the peak on the beat. |

### 2.4 Colour, light, text

| Mechanism | What the research shows | Tier | Rule |
|---|---|---|---|
| **Brightness drives valence, saturation drives arousal** | Pleasure ≈ .69·brightness + .22·saturation. Arousal ≈ −.31·brightness + .60·saturation [R24]. Saturated, bright colours raised arousal and skin conductance [R25]. Valence in film clips was "strongly predicted by brightness alone" [R26b]. | M | Use a bright, saturated base look. Desaturate and darken for loss, then raise saturation for joy. |
| **Lighting on CG characters** | "brighter conditions increased appeal across all of our experiments" [R26] | M | Light the face. Moody scenes still need lit eyes and a rim. |
| **"Cinematic dark" is folklore on phones** | Cutting's darkening trend reflects cinema projection, not small screens [R8]. | I | Lift the blacks. The engine's default `#0b0b14` background with ACES tone mapping crushes shadows on phones. |
| **Captions are read whether you want them or not** | "reading subtitles is more or less obligatory". Two-line subtitles take more time than one line [R28]. Viewers only partly process redundant text [R29]. | M | One short line. Never cover the eyes. Thin the text out at the emotional peak so the face carries it. |
| **Sound off reduces immersion** | Eye-tracking with 168 people: immersion 4.73 with sound off vs 5.43 with sound on, more effort, more time on subtitles [R30]. | M | Captions are the sound-off fallback, not the main event. The picture has to tell the story without sound. |

---

## 3. The retention timeline for a 20–35 s Short

The template every blueprint in §6 follows. Times are absolute for a ~30 s Short.

| Window | What the viewer is deciding | Visual job | How |
|---|---|---|---|
| **0.00 s (frame 1)** | "What is this?" | Communicate *dog + situation* in one image | Dog's face or the strange situation already on screen, lit, centred, and caption visible on frame 1. No fade-in, no establishing wide shot, no logo. |
| **0.0–0.3 s** | Gate 1 starts | First motion onset | Eyes snap open, a head turn, a push-in already moving. Prefer looming. |
| **~1.9 s** | Still deciding | First visual change | A cut or punch-in. 1.9 s is the median first cut in 54 high-view Shorts [D1]. |
| **≤3 s** | Gate 1 decided | Show the conflict or payoff *visually* | "Put the payoff in the first three seconds" [D3]. TikTok wants the "proposition" inside 3 s [K1]. |
| **3 s → ~40%** | Commit or drift | Escalate. New shot or camera event every ~2.5–4.5 s. | The median shot in high-view Shorts is 4.7 s and the fastest quartile 2.8 s. Slow moves are not counted as cuts, so add moves between cuts [D1]. |
| **~40–60%** | Mid-video drift (I) | **Re-hook / pattern interrupt** on the script's twist line | Change the colour world, add a dolly zoom or freeze-frame, cut the sound, switch from flashback to the present. Use one per Short. |
| **~75–95%** | Payoff | **Peak**: sudden closeness, eye contact, brightest and warmest frame | Minimal text and the slowest camera of the video. Land it on a music accent. |
| **Last 0.5 s** | Replay or swipe | **Rhyme with frame 1** | Same composition, subject and sound bed. No end card, no fade to black. |

**Cadence by beat type** (I, based on [D1][R31]):

| Beat type | Shot length | Camera between cuts |
|---|---|---|
| Hook | 0.8–2 s | Always moving |
| Fact or explanation | 1.5–3 s | Punch-ins, slides, graphics |
| Story / tension | 2–4 s | Slow push-in, micro-shake |
| Emotional peak | 3–5 s | Very slow push, held eye contact |

Never leave a frame fully static for more than ~3 s. Even a "held" shot gets a 2–5% push-in,
a breathing dog and a blink.

---

## 4. The visual system for this channel

A consistent look is what makes viewers recognise a channel in the feed. These are the house
rules.

### 4.1 Character appeal

**The biggest cross-cutting issue: mixed realism.** Every Short pairs the blocky code-built
dog (`js/dog.js`, `BoxGeometry` parts) with photoreal Rocketbox humans (`js/avatar.js`). The
research consistently points to *mismatch*, not stylisation, as the cause of "off" CG
[R15][R16]. Pick one world.

- **Option A, all stylised (recommended).** Keep the cute dog and make humans stylised too.
  Either build them with `js/human.js` toned down, or keep Rocketbox humans *out of
  close-ups*: show hands, legs, backs, silhouettes and over-the-shoulder shots. The dog is
  the face of every Short anyway (R20).
- **Option B, rounded dog.** Swap the dog's box head and muzzle for rounded geometry
  (`RoundedBoxGeometry` in r170 addons, or spheres), keeping the same rig and `pose()` API.
  That moves the dog toward the "Pixar-adjacent" look that the biggest 3D pet channels
  share: big-eyed, rounded characters, short runtimes, human-style drama [D17][D18][D20].

**The dog spec (both options):**

| Feature | Spec | Why |
|---|---|---|
| Proportions | Head ≥ ⅓ of standing height. High forehead, short muzzle. | Baby schema [R11][R12] |
| Eyes | 35–45% of head width in hero shots (`cute: 1` ≈ ×1.45 today). Iris fills most of the eye. | Baby schema. Eyes are the highest-contrast point [C4]. |
| Catchlights | One large specular on the pupil edge, one small bounce opposite. Not centred. | "give life to the eyes" [C4] |
| Pupils | Not dead-centre in both sockets. Slightly more white on the outside. | [C5b] |
| Brow | Inner-brow raise (`sad`/`cute` already tilt the brows) at every moment of need | AU101 [R32] |
| Blink | ~8 frames total with ~2 frames closed. Blink on every gaze change. Seeded times, never random. | [C5] |
| Eye lead | Eyes move ~3 frames before the head. Blink closes 3–4 frames before an accent. | Ollie Johnston [C3] |
| Life layer | Breathing (chest scale ±1–2% at ~0.25 Hz). Ears and tail lag the head by 3–6 frames. | Follow-through and secondary action [C1] |
| Wag | Slow, broad, whole-body for warmth. Fast and stiff for arousal or alert. | AKC: wag signals arousal, faster means more aroused [C7] |

**Body-language cheat sheet** (RSPCA [C6], AKC [C7]), mapped to `dog.pose()`:

| Emotion | Ears | Eyes / brow | Body / tail | `pose()` sketch |
|---|---|---|---|---|
| Relaxed / content | natural | soft, blinking, half-closed | loose, slow sweep | `wag: 0.4, wagSpeed: 8, closed: 0.3` |
| Joy / reunion | up then back-soft | wide, bright | wiggle, fast wag, bow | `wag: 1, wagSpeed: 22, shiver: 0.5, bow: 1` |
| Alert / guarding | up, forward | fixed stare, no blink | still, tall, tail high | `earUp: 1, pupil: 0.8, wag: 0` |
| Worried / pleading | back | brow up, wide pupils, averted gaze | lowered, tail tucked | `earBack: 1, sad: 1, pupil: 1.3, headPitch: -0.2` |
| Afraid | flat back | whites showing | crouched, shiver | `earBack: 1, shiver: 0.3, lie: 0.5` |
| Curious | one up / tilt | wide | head tilt | `tilt: 0.4, earUp: 0.5` |

### 4.2 Camera grammar (9:16)

**Framing on a 1080×1920 canvas**

- **Safe box for anything that must be seen: x 120–780, y 288–1248.** This is the conservative
  overlap of the YouTube, TikTok and Reels UI overlays [D12]. The repo's `S` overlay marks
  only the bottom 380 px and the right column. The YouTube vertical-ad guide reserves
  288 px top and 672 px bottom [D12].
- **Put the eyes at about y 600–670** (30–35% from the top) in close-ups, horizontally centred
  [C23][R4]. That leaves y ~1000–1240 for the caption *under* the face.
- **Stack vertically.** Two subjects go one above the other (dog low, girl high), not side by
  side. Use vertical split-screens for comparisons (dog vs wolf, 30 min vs 2 h).

**Lenses.** Three.js r170 maps focal length through a 35 mm film height in portrait, so
`fov = 2·atan(17.5 / mm)`. Use `camera.setFocalLength(mm)`:

| Lens | Vertical FOV | Use |
|---|---|---|
| 24 mm | 72° | Energy, dog running at the lens, low dog's-eye world, comedy |
| 35 mm | 53° | Default storytelling, medium shots |
| 50 mm | 38.6° | Hero close-ups (engine default `fov: 50` ≈ 37.5 mm) |
| 85 mm | 23.3° | Tender or lonely beats, compressed shelter corridor, "watching from afar" |

Wide lenses make "motion feel alive", and long lenses "compress space" and add "emotional
distance" [C8]. Dogs read best at their own eye level, because people usually see them from
above [C22].

**The move library.** Each move has a job. Don't use a move just for decoration.

| Move | Job | Rule of use |
|---|---|---|
| Slow push-in (2–5%/s) | Intimacy, building emotion | Default on every emotional line |
| Crash zoom / punch-in (0.15–0.25 s, `expo.out`) | Emphasis on a key word or fact | Lands on the stressed word, with a whoosh |
| Pull-out / receding | Loneliness, abandonment | Use on purpose. It does *not* grab attention [R2]. Follow it with an onset. |
| Dolly zoom | Realisation, "the world shifts" [C9] | **Once per Short**, on the twist line |
| Whip pan | Location or time change | Cover it with a whoosh, cut mid-whip |
| Match cut | Link two beats (eye to eye, dog pose to wolf pose) | Same screen position, same size [R6] |
| Low dog's-eye / POV | Empathy, the dog's world | Humans become legs, hands and doorframes |
| Top-down | Vulnerability (clinic floor, curled-up dog) | Short hold, slow rotate |
| Handheld micro-shake | "Real" moments (memories, danger) | Deterministic noise. Locked-off camera for facts and graphics. Mirrors Pixar's *Win or Lose* split of handheld for the real world vs controlled moves for imagined worlds [C10]. |
| Freeze-frame / speed ramp | Pattern interrupt, the reveal | **Once per Short** |
| Shot-scale progression | Close (hook) → wider (context) → closest (peak) | The tightest shot of the video is the peak |

### 4.3 Light and colour

**The lighting rig** (every scene; [C15][C16]):

- **Key light:** warm, 15–45° off the camera axis and 15–45° above it.
- **Fill light:** cool, opposite the key, at 2:1 to 4:1 under the key.
- **True rim:** a `DirectionalLight` from behind and above the subject, so the silhouette
  separates from the background. The engine's default "rim" is a purple *point* light at
  `(-4, -2, 3)`, which sits front, left and below, so it is not a rim.
- **Eye light:** a tiny light near the camera, or emissive sparkles, so the eyes always
  hold a catchlight.
- **Shadows:** keep fewer lights and real shadows. Roger Deakins pushed *WALL·E* this way
  because the real world is "not as well-lit as your typical animated world" [C13b].
- **Black levels:** lift them for phones.

**The colour script.** Pixar plans colour against emotion before lighting a single shot:

- On *WALL·E*, Act One was "very dull and muted", then "the colors get wildly saturated" as
  the relationship grows [C12].
- *WALL·E* excluded green so the plant would have "a visual punch" [C13].
- *Inside Out 2* drove many lights from **one** "Anxiety Ramp" control [C11].

For each Short, apply the same idea with one `mood(t)` value (recipe in §5.5) that drives key
colour, fill, background, saturation, vignette and grain together.

| Mood | Palette | Light | Grade |
|---|---|---|---|
| Curiosity / fact | Warm amber + teal | Bright, high key | sat 1.1, vignette 0.3 |
| Tension / danger | Night blue + one red accent | Hard rim, low key, eyes still lit | sat 0.9, vignette 0.55, grain up |
| Loss / memory | Desaturated blue-grey + **one** warm accent | Soft, cool, overcast | sat 0.55, gray 0.2, grain 0.05 |
| Reunion / love | Golden-hour pink-orange | Warm key floods in, bloom on sparkles | sat 1.2, brightness 1.08 |

**Reserve one "payoff hue" per Short.** For example, warm amber light appears only when the
dog is safe or loved, as *WALL·E* did with green. The first time that hue appears, viewers
feel the shift before the voiceover names it.

### 4.4 Text on screen

The current house style is one-word-at-a-time typewriter captions in yellow `#ffe93b`, 76 px
with a heavy stroke, at `top: 1060px`. It is legible and inside the safe box. Keep it as the
channel signature, with these rules:

1. **Never over the eyes or muzzle.** With eyes at y 600–670 the caption band is free, but
   close-ups that put the face lower collide with it. Move the face, or move the caption for
   that shot. The caption `top` can be keyed per shot.
2. **One line, 1–3 words at a time.** TikTok's ceiling is 5–10 words per second [K1]. At the
   VO pace (~2.5–3 words/s) the captions already fit.
3. **Highlight the key word** of each sentence ("bullet", "11 months", "2019", "two hours") with a
   colour or scale pop. Leave function words plain.
4. **Thin out at the peak.** On the final emotional line, drop to a smaller caption below
   the face or hold a beat with no text [R28][R29].
5. **Add source chips for facts.** A small chip such as "Kaminski et al. · PNAS 2019" builds
   credibility and adds the "educational value" signal YouTube names [Y7]. Only use chips
   for claims that hold up (§7).
6. **Nothing in the top 288 px or the bottom 672 px** that must be read.

### 4.5 Sound and picture

- **SFX lock:** each SFX starts on the exact frame of its visual onset [R27].
- **Sound across cuts:** let room tone, music or the tail of an SFX run over each cut (J- and
  L-cuts). This hides the edit [R7].
- **Pattern interrupts are partly audio:** drop to silence, use a record scratch or a sub
  drop before the twist line.
- **Speech starts at frame 0.** All six scripts already open with voiceover at 0.0–0.2 s.
  Speech in the first 3 s gave +24.7% 10-second retention over music-only on Facebook Reels
  [D4] (T).
- **Whooshes** go on whip pans and crash zooms. Swell the music *before* the peak and let it
  resolve *on* the peak [R40].

### 4.6 Endings and loops

- **No fade-out, no end card, no "follow for more" frame.**
- The last frame repeats the first frame's composition (camera, subject position, light
  direction). The *mood* changes (cold to warm), so the loop also reads as before and after.
- Two scripts already loop verbally:
  - **dog-welcome:** "So the next time you walk in that door." → "You walk in the door and
    your dog loses his mind."
  - **dog-hero:** "…hadn't found anyone to protect yet." → "This dog took a bullet…"
- The visuals should make these seams invisible (same door, same eyes).
- **Keep expectations modest.** Seamless loops are proven only for clips of 7 s or less
  (+18.7% replays, "less effective for longer videos") [D4]. Engaged views exclude loops
  anyway [Y1]. Treat the loop as a bonus, not the strategy.

---

## 5. Recipes for this engine (Three.js r170 + GSAP 3.15)

Every recipe follows the README rule: all motion goes on the paused master `tl` or in
`onUpdate(t => …)` using only `t`. Nothing uses `Math.random`, `Date.now` or
`requestAnimationFrame`. Frames are captured with `stage.screenshot`, so CSS filters and HTML
overlays on the stage are part of the export.

### 5.1 Camera rig with lenses, cuts, push-ins and shake

```js
// One state object, tweened on tl, applied every frame.
const cam = { x: 0, y: 0.55, z: 2.2, tx: 0, ty: 0.5, tz: 0, mm: 50, shake: 0 };

// Seeded value noise: deterministic and independent of seek order.
const hash = (n) => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
const vn = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (hash(i + s * 1013) * (1 - u) + hash(i + 1 + s * 1013) * u) * 2 - 1; };

onUpdate((t) => {
  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(cam.tx, cam.ty, cam.tz);
  camera.setFocalLength(cam.mm);                 // also updates the projection matrix
  const s = cam.shake * cam.shake;               // "trauma" squared reads more natural
  camera.rotation.z += 0.035 * s * vn(t * 9, 1); // rotation only, never position jitter
  camera.rotation.x += 0.02 * s * vn(t * 9, 2);
});

const cut = (at, props) => tl.set(cam, props, at);                                   // hard cut
const push = (at, dur, props) => tl.to(cam, { ...props, duration: dur, ease: "sine.inOut" }, at);
const punch = (at, mm) => tl.to(cam, { mm, duration: 0.2, ease: "expo.out" }, at);   // crash zoom
const hit = (at, amount = 1) => tl.fromTo(cam, { shake: amount }, { shake: 0, duration: 0.6, ease: "power2.out" }, at);
```

Use a handheld level of `shake: 0.15–0.25` at 1–3 Hz for "real" scenes, and `hit()` at
8–14 Hz for impacts (multiply `t` by a larger factor).

### 5.2 Dolly zoom (once per Short)

Keep `distance / focalLength` constant while the distance changes, so the subject stays the
same size and the background stretches:

```js
const dz = { d: 1.6 }; const d0 = 1.6, mm0 = 50, subjectZ = 0;
tl.to(dz, { d: 4.0, duration: 1.8, ease: "power2.inOut" }, 14.2);
onUpdate((t) => {
  if (t < 14.2 || t > 16.0) return;                  // only while the effect runs
  cam.z = subjectZ + dz.d;
  cam.mm = mm0 * dz.d / d0;                          // d·tan(fov/2) stays constant
});
```

Moving back while zooming in gives dread or realisation. Moving in while zooming out gives
intimacy or vertigo [C9].

### 5.3 Freeze-frame, slow motion and rewind with a story clock

Drive every character `pose({ t: clock.st, … })` from a *story clock* instead of `t`, then
tween the clock:

```js
const clock = { st: 0 };
tl.to(clock, { st: 10, duration: 10, ease: "none" }, 0);           // normal speed
tl.to(clock, { st: 10.4, duration: 1.6, ease: "power3.out" }, 10); // speed ramp into slow-mo
tl.to(clock, { st: 10.4, duration: 0.5 }, 11.6);                   // freeze-frame
tl.to(clock, { st: 2, duration: 0.6, ease: "power2.in" }, 12.1);   // rewind
```

The camera keeps moving in real `t` during a freeze, which is the classic "frozen world,
moving camera" reveal.

### 5.4 Life layer: blink, eye lead, breathing, follow-through

```js
// Authored or seeded blink times. Add one on every gaze change.
const BLINKS = [0.9, 3.4, 6.1, 8.2, 11.7 /* … */];
const blink = (t) => {
  for (const b of BLINKS) { const u = (t - b) / 0.27; if (u >= 0 && u <= 1) return Math.sin(Math.PI * u) ** 0.6; }
  return 0;
};
const breathe = (t, rate = 0.25) => 1 + 0.015 * Math.sin(t * Math.PI * 2 * rate);

onUpdate((t) => {
  dog.pose({ t, closed: Math.max(base.closed, blink(t)), /* … */ });
  dog.scale.y = breathe(t);   // or scale the chest group only
});

// Follow-through: duplicate the head tween onto ears and tail, 3–6 frames later with overshoot.
tl.to(head, { yaw: 0.5, duration: 0.35, ease: "power2.inOut" }, 6.0);
tl.to(ears, { yaw: 0.5, duration: 0.45, ease: "back.out(2.2)" }, 6.0 + 0.13);
```

GSAP's `CustomWiggle` (free since 3.13 [C19]) is **not** deterministic with `type: "random"`,
which calls `Math.random()`. Use `"uniform"`, `"easeOut"` or the seeded noise from §5.1.

### 5.5 One `mood(t)` value for the colour script

```js
const look = { warmth: 0, sat: 1, bright: 1, gray: 0, vignette: 0.35 };
const COLD = new THREE.Color(0x9fb4d9), WARM = new THREE.Color(0xffc68a);

// The colour script as tweens: e.g. loss → reunion
tl.to(look, { warmth: 0, sat: 0.55, gray: 0.2, vignette: 0.55, duration: 0.4 }, 8.7);   // flashback
tl.to(look, { warmth: 1, sat: 1.2, bright: 1.08, gray: 0, vignette: 0.3, duration: 3 }, 22.6); // payoff

onUpdate(() => {
  key.color.lerpColors(COLD, WARM, look.warmth);
  key.intensity = 1.6 + 1.2 * look.warmth;
  renderer.domElement.style.filter =
    `saturate(${look.sat}) brightness(${look.bright}) grayscale(${look.gray})`;
  vignetteEl.style.opacity = look.vignette;
});
```

`shorts/dog-eyes/main.js` already has the CSS tier, so reuse it. It provides a frame-stepped
grain overlay (`grainAt(t)`), a vignette element, and `setEnv()` applying a CSS `filter` grade
to the canvas.

### 5.6 Post-processing (optional, GPU renders only)

r170 ships `EffectComposer` but this repo hasn't vendored it. To add bloom on catchlights and
sparkles, or a single combined grade pass:

- **Files to copy from `three/examples/jsm` r170 [C17]:**
  - `postprocessing/`: `EffectComposer`, `RenderPass`, `Pass`, `ShaderPass`, `MaskPass`,
    `UnrealBloomPass`, `OutputPass`
  - `shaders/`: `CopyShader`, `LuminosityHighPassShader`, `OutputShader`
- Rewrite each `from 'three'` import to `'../../three.module.min.js'`, as the existing
  addons already do.
- **Determinism traps** (checked against the r170 source):
  1. Always call `composer.render(0)`. With no delta, the composer falls back to an internal
     `THREE.Clock`.
  2. `FilmPass` adds `deltaTime` to its own time. Set `uniforms.time.value` from the frame
     index yourself.
  3. The composer's render target has no MSAA. Pass
     `new WebGLRenderTarget(W, H, { type: HalfFloatType, samples: 4 })`.
- **Tone mapping:** keep `renderer.toneMapping` and end the chain with `OutputPass`, which
  does tone mapping and sRGB [C18].
- **Cost** (toy scene, software GL, 2 vCPU, so relative only):

  | Setup | Time per frame |
  |---|---|
  | Direct render | ~0.3 s |
  | Composer | ~1.3 s |
  | Plus bloom | ~2.8 s |
  | Plus `BokehPass` | ~6 s |

  A 30 s Short on CPU with bloom is about 40 minutes of rendering. **Use the CSS tier for
  `--cpu` renders.** Reserve post-processing for GPU or `tools/kaggle` renders, and avoid
  `BokehPass`.

### 5.7 Cheap atmosphere without post-processing

- **God rays:** an open `ConeGeometry` with an additive, `depthWrite: false`, low-opacity
  material along the window light [C21]. Fade its opacity with `look.warmth`.
- **Sky:** a `BackSide` sphere with a vertical gradient instead of a flat colour. The wild
  scenes in dog-bathroom have a flat beige backdrop today.
- **Depth of field:** a blurred backdrop plane behind the subject, or simply darker, less
  saturated, lower-contrast backgrounds. This "aerial perspective" separates the subject at
  no cost.
- **Dust motes:** 30–60 small additive sprites drifting in the light beam, with positions from
  `vn(t·0.1, i)`. This adds "life" without background flicker. Keep them slow ([R3]).

---

## 6. Shot-by-shot blueprints for the six scripts

Timings come from each `voiceover.srt`. Every blueprint follows §3: **frame-1 image → onset ≤0.3 s
→ change ~1.9 s → payoff ≤3 s → one re-hook → sudden-closeness peak → last frame rhymes
with frame 1.** Lenses refer to §4.2, and moods to §4.3.

### 6.0 What the current renders show (CPU contact sheets, 1 frame/s)

Checked visually for dog-bathroom, dog-toy and dog-welcome. dog-hero, dog-leash and dog-eyes were not rendered in this pass.

- **All shorts:** blocky dog next to photoreal Rocketbox humans (§4.1). Captions at `top: 1060px` often sit over the dog's muzzle or body in close-ups (bathroom 3 s and 6 s, toy 7 s).
- **dog-welcome:** frame 1 is a static wide room with a small, distant dog, and nothing moves until ~2 s. One wide, mostly locked-off framing holds for ~26 s, and the first close-up arrives at ~27 s. Multi-word caption lines run off the right edge of the frame (e.g. "you walk in the door an…").
- **dog-toy:** frame 1 is a dark, closed door with no dog. The dog first appears at ~2 s. The EKG panel sits at y ≈ 130, inside the top UI zone. The ending (sofa wide) doesn't match the opening door. Strengths: the anchor visual at 17 s and the energy particles at 19 s.
- **dog-bathroom:** fast cadence (a change roughly every 1 s) and the strong "security" sunglasses gag. Weaknesses: frame 1 shows the human, not the situation, and the wild scenes use a flat beige sky.

### 6.1 dog-hero (29.0 s) — "This dog took a bullet…"

- **Emotional engine:** danger (high arousal) → injustice → devotion (kama muta).
- **Curiosity gap:** a flash-forward cold open ("bullet") explained by the flashback.
- **Risk:** this is the saddest script. Without tension and a warm end it falls into
  low-arousal sadness [R17].
- **Payoff hue:** warm amber, which only appears around the girl.

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–1.2 | "This dog took a bullet…" | **Frame 1:** night hallway, ECU of the dog's eyes snapping open (onset at 0.1 s), ears up. Camera already pushing in, 50 mm. At "bullet": white flash pulse, dog mid-leap *toward* the lens, freeze. | Night blue + red accent. Eye light on. Low growl under the VO, flash-frame "crack", **no gore** (I). |
| 1.2–3.15 | "…for a girl he'd met three days earlier." | Cut on action → over-the-dog's-shoulder: girl in bed, dog silhouetted between her and the door. Vertical stack: dog low, girl high. | Hard rim on the dog's silhouette. |
| 3.18–4.35 | "Three days earlier." | **Rewind**: story clock runs backwards (§5.3) with a whip and a chip reading "3 DAYS EARLIER". | Rewind SFX. Grade snaps to loss mood. |
| 4.38–8.43 | "Nobody wanted him. 11 months. Everyone walked past his cage." | Shelter corridor at 85 mm through bars, dog's-eye level. Legs walk past *fast* (time-lapse) while the dog stays still. Punch-in on "11 months" with a calendar counter graphic. | Desaturated blue-grey, `shelter_dogs` ambience, one cold strip light. |
| 8.43–11.78 | "Then a little girl stopped, sat on the floor, and he came to the bars." | Legs **stop**: the first onset in a shot of motion. Camera drops to floor level. Dog walks *toward* the lens (looming). Match cut eye-to-eye, girl ↔ dog. | **First warm light** (payoff hue) comes in with her. Music enters. |
| 11.78–14.52 | "Her dad said no. She cried until he said yes." | Dad = high-angle shoes and coat from the dog's POV, no face. Girl's tears (back or profile). "Yes" = dad's hand on her head → dog's tail onset. | Cold → warm flip on "yes". |
| 14.55–18.38 | "Second night, growling at the window. They almost took him back." | Night. Dog's silhouette against the curtains, slow push-in on the window (tension). A shadow passes outside, a curiosity seed. Leash and crate by the door on "took him back". | Night blue, handheld 0.2. `growl` frame-locked to the jaw. |
| 18.38–21.08 | "Third night, someone broke in. He didn't hesitate." | **Re-hook:** glass-break hard cut. Shake `hit()`. Dog launches (rhyme with frame 1 completes the loop of the cold open). Cut on the leap, the flash, then **cut away** to black-blue. | `glass`, `bang`, then 0.3 s of silence. |
| 21.08–25.27 | "The vet said he might not make it. She slept on the clinic floor holding his paw all night." | Clinic, top-down slow rotate: girl curled on the floor beside the dog. ECU hand on paw. **Peak:** the paw *squeezes back*, the tail thumps once, the eyes open toward her. | Teal-cool room, warm only on the two of them. `monitor_beep` steadying. Captions shrink. |
| 25.27–26.85 | "The shelter called him dangerous." | Shelter card with a red **DANGEROUS** stamp slams into frame (graphic interrupt). | Stamp SFX. |
| 26.88–28.97 | "He just hadn't found anyone to protect yet." | Stamp crumbles or fades. Dawn floods the room (brightest frame). Dog's head in her lap, **one look into the lens**. Last frame: ECU of the eyes, same framing as frame 1 but gold instead of blue. | Golden. Music resolves. Loops to "This dog…". |

### 6.2 dog-leash (30.8 s) — "…slept by the front door, holding his leash"

- **Emotional engine:** mystery → reinterpretation (twist) → being moved.
- **Curiosity gap:** the frame-1 image itself. Why sleep at the door with a leash?
- **Visual metaphor:** the **cold door** (leaving) vs the **warm house** (staying). The dog
  sleeps on the boundary, and the final shot moves him into the warmth.
- **Payoff hue:** warm lamp light reaching the dog.

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–1.9 | "Every night, after bringing him home from the shelter…" | **Frame 1:** low 35 mm, front door filling the top half, dog curled against it at y ~650 with the leash in his mouth. **Onset:** hall light clicks on, the dog's eyes open and look at the lens. | Moonlight through the door glass (cold) vs warm spill from the living room (frame left). Light-switch click frame-locked. |
| 1.9–3.6 | "…my dog slept by the front door…" | Punch-in: ECU leash in the mouth, jaw tightening. | — |
| 3.6–5.48 | "…holding his leash in his mouth." | Reverse wide from the hallway: tiny dog, big door, 24 mm (isolation). | Clock tick. |
| 5.48–8.67 | "I thought he wanted to run away, until the shelter told me his story." | Owner POV (hands only, phone with the shelter's number). Slow push into the dog's eye → **match cut** into snow. | Room tone carries over the cut. |
| 8.70–14.18 | "…took him for a walk, tied his leash to a fence in the middle of winter, and never came back." | Flashback, handheld 0.2. Picket fence in snow. Leash knot ECU. Car pulls away at 85 mm (**receding on purpose**) while the dog's eyes follow it. Time-lapse: snow piles on his back, the leash stays taut. | Loss mood: sat 0.5, gray 0.2, grain up. `winter_wind`, `snow_step`, `car_away`. |
| 14.22–16.53 | "He wasn't holding that leash because he wanted to leave." | **Re-hook: dolly zoom** on the dog at the door (§5.2). Back in the present. | Music drops out. Sub hit. |
| 16.57–22.53 | "…every human eventually gets tired of him… so he wouldn't be a burden." | Slow push to the eyes: ears back, brow up (AU101), pupils wide. A tiny whimper. Insert: an empty food bowl, a packed-looking corner (his "bag"). | Cold dominates. One warm strip creeps across the floor toward him. |
| 22.57–27.72 | "Tonight, I sat on the floor beside him, took the leash from his mouth, and whispered…" | Camera drops to the floor (two-shot, owner as back and hand only). The hand enters and the leash slides out: a slow, held detail. Warm key gradually takes over. | Warmth tween 0 → 1 over 3 s. Captions smaller. |
| 27.75–30.83 | "'You're home.' And for the first time, he finally closed his eyes." | **Peak:** the dog leans his whole head into the hand (*sudden* closeness), exhales, and the eyes close (held blink). **Last frame:** same composition as frame 1, but the leash hangs on a hook, the dog sleeps in warm light, and the door is now in shadow. | Brightest frame. Loop restarts on the identical framing, cold. |

### 6.3 dog-eyes (21.25 s) — "Your dog evolved a muscle just to manipulate you."

- **Emotional engine:** surprise, a playful accusation, then awe at evolution.
- **Curiosity gap:** "a muscle… to manipulate you" (what muscle?).
- **Risk:** a fact Short has no story momentum, so cadence and graphics carry it. Use the
  fastest cut rhythm of the six.
- **Payoff hue:** a glowing anatomical red-orange for the muscle.

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–1.0 | "Your dog evolved a muscle…" | **Frame 1:** ECU of the dog's eyes, centred at y ~640. **Onset at 0.15 s: the inner brows lift.** The subject performs the hook. Glossy eyes, two catchlights. | Warm amber + teal, bright. |
| 1.0–2.75 | "…just to manipulate you." | Crash zoom onto the brow at "manipulate". A sly side-eye to the lens. | Whoosh + "ding". |
| 2.75–3.58 | "Wolves don't have it." | **Vertical split:** dog top, wolf bottom (`pointyEars`, grey), same framing. The dog's brow lifts and the wolf's doesn't. A red ✗ on the wolf. | Wolf half cooler. |
| 3.58–8.50 | "It's a tiny muscle above the eye that lifts the inner eyebrow… bigger, sad, like a baby." | X-ray reveal: the fur fades to a stylised glowing muscle ribbon over the brow. It contracts in sync with "lifts". On "bigger" the eyes scale up (`cute` 0 → 1); "sad" → `sad: 1`; "like a baby" → baby-proportioned puppy silhouette overlay. | Locked-off camera (fact mode). Bloom on the muscle (GPU) or an emissive material. |
| 8.50–11.88 | "Scientists found it in 2019…" | Lab-diagram look: dog and wolf head outlines side by side, muscle highlighted in only one. **Source chip:** "Kaminski et al. · PNAS 2019". | Clean, bright. |
| 11.92–17.75 | "…thousands of years dogs lived with us… humans couldn't resist." | **Match-cut montage, one shot every ~1.2 s, with the eyes locked to the same screen position:** campfire (`fire`), a medieval-style hearth, a 1950s living room, a modern sofa. Each time the dog makes *the face*, a human hand reaches in to give food or a pat. | Each era has its own warm hue. Giggle on "couldn't resist". |
| 17.75–21.25 | "In shelters, dogs that raised their eyebrows more got adopted faster." | Shelter row: three dogs. The one with the brow raise gets the **ADOPTED** stamp first. Chip: "Waller et al. · PLOS ONE 2013". **Last frame:** the ECU eyes from frame 1, brows lifting again. | `shelter_dogs` → silence + stamp. Loop. |

### 6.4 dog-bathroom (24.3 s) — "…following you into the bathroom"

- **Emotional engine:** recognition ("my dog does this") → comic reframe → protective warmth.
- **Curiosity gap:** "in their mind they aren't being clingy" (then what?).
- **Strength:** the most relatable and funniest premise, so lean into comedy. Pace is fast.
- **Fact risk:** the guarding explanation is folklore (§7). Frame it as a theory.

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–1.9 | "When your dog insists on following you into the bathroom…" | **Frame 1:** inside the bathroom, low angle, door already cracking open, dog's nose pushing through the gap toward the lens (onset + looming). | Bright, warm-neutral tiles. Door creak frame-locked. |
| 1.9–4.0 | "…every single time…" | **Rapid repetition gag:** three 0.6 s cuts of the identical shot at morning, noon and night (light colour and a wall clock change). | Same creak, pitched each time. |
| 4.0–6.45 | "…you probably think they just have separation anxiety." | Dog's pleading face (`sad`, brow up) in a thought-bubble frame, slightly desaturated. | Sad "aww" music sting. |
| 6.48–8.43 | "But in their mind, they aren't being clingy." | **Pattern interrupt:** record-scratch freeze, push in. | Scratch, then silence. |
| 8.47–9.48 | "They're running security." | Hard cut: dog at the door facing *outward*, sunglasses plus earpiece (`glasses`, `earpiece`), security-cam HUD overlay (REC dot, timestamp). | Comic beat. |
| 9.52–15.52 | "In the wild, relieving yourself or drinking water is the exact moment an animal is most vulnerable to an ambush." | Wild waterhole at dusk, 85 mm: a wolf drinking. **Tension:** glowing eyes in the grass (`glowEyes`) and a slow push toward them. | Dusk teal + red eyes. `rustle`, then a hush. Replace the flat beige sky with a gradient dome. |
| 15.57–19.58 | "A dog's instinct is to stand guard whenever a pack member lets their defenses down." | A second wolf rises to stand watch, ears up → **match cut** (same pose, same screen position) to the dog at the bathroom door. | Warm returns. |
| 19.62–24.30 | "They don't follow you because they can't be alone. They follow you because they think you'd be defenseless without them." | Dog looks up at the owner (hands only) with a brow raise, then turns to face the door, alert and proud. **Last frame:** the door-gap composition of frame 1, nose in frame. | Warm, bright. Loop. |

### 6.5 dog-toy (26.9 s) — "…rushes to grab a toy but won't let you take it"

- **Emotional engine:** recognition → "inside the dog's body" spectacle → tenderness.
- **Curiosity gap:** "they aren't asking for a game" (then what?).
- **Big visual opportunity:** *show the invisible*. Visualise the adrenaline as energy
  flowing into the jaw.
- **Fact risk:** "sensory pacifier" and "not to play" are unsupported (§7). Soften the
  wording.

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–1.9 | "When you walk through the door and your dog…" | **Frame 1:** from inside, the front door swings open, light floods in (luminance onset), and the dog sprints *at the lens* (24 mm, looming). | Bright, golden. Door + paw patter frame-locked. |
| 1.9–4.7 | "…rushes to grab a toy but won't actually let you take it…" | Dog skids, grabs the plush (`plushToy`). Owner's hand reaches in and the dog swerves away with the toy. Two quick angles. | Squeak on the grab. |
| 4.7–6.27 | "…you probably think they want to play fetch." | Daydream insert: a ball arcs in slow motion, park-sky gradient. | Light whimsical sting. |
| 6.30–8.18 | "But you see, they aren't asking for a game." | **Pattern interrupt:** freeze the dog mid-wiggle (story clock), desaturate, ball shatters or fades. | Scratch / silence. |
| 8.22–14.07 | "…an adrenaline spike so intense, their body doesn't know how to handle the joy." | "Inside the body" mode: heartbeat-pulsed vignette, a fast wag (`wagSpeed: 26`), `shiver`, hit-shake building. The existing EKG graphic belongs here, inside the safe box. | Red-gold pulses on each heartbeat. Heartbeat SFX accelerating. |
| 14.10–21.78 | "Grabbing that toy is a sensory pacifier… channels all that wild, bursting energy into their jaw…" | X-ray: glowing particle streams flow from chest and legs **into the jaw → toy**. As they arrive, shake decays, saturation settles, wag slows. Visual cause and effect. | Locked-off camera (explanation). Rising tone resolving into calm. |
| 21.82–26.88 | "They aren't teasing you with a toy. They're literally holding onto something so their love for you doesn't overwhelm them." | **Peak:** slow push. The dog leans into the owner's legs with the toy in his mouth, eyes half-close, tail slow-sweeps. **Last frame:** door-and-dog composition of frame 1. | Warmest frame. One soft squeak. Loop. |

### 6.6 dog-welcome (33.6 s) — "…your dog loses his mind"

- **Emotional engine:** joy (high arousal) → curiosity (a real experiment) → tenderness.
- **Curiosity gap:** "some days he goes crazy, some days he barely gets up?"
- **Strength:** it has a real study, a built-in comparison and a verbal loop. Elapsed time is
  the visual hero.
- **Loop:** "So the next time you walk in that door." loops into "You walk in the door…".

| Time | VO | Picture | Look · Sound |
|---|---|---|---|
| 0.00–3.4 | "You walk in the door and your dog loses his mind." | **Frame 1:** the dog already mid-leap toward the lens in slow motion, door light behind (looming + onset). Then snap to real speed: spin, bow, zoomies. | Golden-hour joy. Paws + pant frame-locked. |
| 3.6–5.6 | "Like you've been gone for years." | Comedy: cobwebs and a calendar flipping years in 1 s behind the dog. | Whoosh. |
| 5.8–10.4 | "But have you noticed, some days he goes crazy, and some days he barely gets up?" | **Vertical split:** top shows the crazy dog, bottom shows the same dog on the couch lifting one ear. Hold the split as the visual question. | Top saturated, bottom slightly muted. |
| 10.6–14.4 | "So scientists tested it. They filmed dogs left home alone." | "Experiment" language: a top-down camcorder view of the room with REC dot, timestamp and scanlines. Source chip "Rehn & Keeling 2011". | Cool, neutral. |
| 14.6–19.0 | "First, the owners came back after thirty minutes. The dogs were happy, but calm." | **Time made visible:** a wall clock (`wallClock`) spins 30 min as a sunlight patch slides across the floor. On-screen timer "0:30". The door opens and the dog gets up with a gentle wag. | `clock_tick` sped up. |
| 19.2–24.2 | "Then they stayed away two hours. And when they came back, the dogs went crazy." | The clock spins faster, the light patch crawls up the wall and turns orange, and the timer reads "2:00". The door opens → explosion. | Tick rises to a whoosh, then a hit. |
| 24.4–26.4 | "Jumping. Spinning. Tails going wild." | **Three beat-locked cuts, one per word (~0.65 s each):** jump, spin, tail ECU. The fastest cadence of the video. | Three hits. |
| 26.6–31.0 | "Your dog doesn't just miss you. He feels every minute you're gone." | **The quiet turn:** the dog alone at the window, chin on the sill, light patch moving across him (time passing). Slow push, 85 mm. | Brightness dips, cool. Music thins. |
| 31.2–33.6 | "So the next time you walk in that door." | The door opens and light falls on the dog. Ears up, and *the dog begins the leap*. **Last frame = frame 1**, so the loop is seamless. | Warm floods back. Loops into "You walk in the door…". |

---

## 7. Script and caption fixes found during research

These matter for retention. Comments that call out an error ("that's not true") anchor the
discussion and undercut the trust that source chips build. They also matter for the
"educational value" signal YouTube rewards.

| Short | Verdict | What the evidence says | Suggested change |
|---|---|---|---|
| **dog-eyes** | Core fact **supported**. Two phrases overstated. | Kaminski et al. 2019 (PNAS): the muscle "is uniformly present in dogs but not in wolves". They "hypothesize" the human-preference selection [R32]. Shelter adoption came from 27 dogs, was correlational and exploratory: "these exploratory findings should be taken with caution" [R33]. A 2024 study found the muscle in other canids, including coyotes: "not unique to domesticated dogs" [R35]. | Change "only in dogs" → "and not in wolves". Change "because every time… humans couldn't resist" → "scientists think it's because…". |
| **dog-welcome** | **Partly supported** | Rehn & Keeling 2011 (12 dogs; 0.5 / 2 / 4 h): more activity, tail-wagging and owner contact after 2 h and 4 h than after 30 min [R36]. "Jumping, spinning" was not measured. The authors say they "cannot distinguish" whether dogs perceive the duration. | "He feels every minute you're gone" overclaims. Consider "the longer you're gone, the bigger the welcome". |
| **dog-bathroom** | **Unsupported (folklore)** | Snopes rates the guarding claim "Unproven". Vets and behaviourists cite attachment, curiosity, routine and learned habit [R37][R39]. | Keep the comedy, but frame it as a theory: "One theory: they're running security." |
| **dog-toy** | **Unsupported as stated** | No study supports a "sensory pacifier" or "adrenaline spike". Experts list excitement, play invitation, self-soothing and attention-seeking [R38]. "Not to play" contradicts them. | Use "Vets think it may help them handle the excitement" and drop "not to play". |
| **dog-hero** | **Unverified** | No matching news story was found. The nearest real case (Rex, Des Moines 2018) differs, and that dog survived [R44]. | Label it a story ("Imagine…", or "Based on stories like Rex's"), or use a sourced case. |
| **dog-leash** | **Unverified** | No source was found. The fear-of-abandonment reading is the script's interpretation. | Present it as a story (first-person), not as a documented case. |

**Text bugs** (they appear in the word-by-word captions):

- `dog-hero/voiceover.srt`: the last line reads "He just hadn't found anyone to protect **it**."
  The intended word is "yet", and the line is also the loop seam.
- `dog-toy/voiceover.srt`: "so their **lover you** doesn't overwhelm them" should read "so their
  love for you doesn't overwhelm them".

---

## 8. Pre-render checklist and measuring after upload

**Before rendering** (use the preview: `S` for the safe zone, `←/→` to step frames):

- [ ] **Frame-1 test:** pause at 0.00. Does the still frame show the dog plus a situation,
      lit, with the caption visible, and nothing black, faded or logo'd?
- [ ] **Onset by 0.3 s:** something starts moving, preferably toward the lens.
- [ ] **First change by ~2 s**, and the conflict or payoff visible by 3 s.
- [ ] **No dead stretch over ~3 s:** list the cut and move times and check the gaps.
- [ ] **One gaze target per shot.** Background calm, no flicker behind faces.
- [ ] **Eyes:** catchlights present, blinks present, eyes at y ~600–670 in close-ups.
- [ ] **Realism:** no photoreal human face in the same close-up as the cartoon dog.
- [ ] **Safe box:** eyes and captions inside x 120–780, y 288–1248. Nothing important under
      the right button column or the bottom 672 px.
- [ ] **Captions:** never over the eyes. Key word highlighted. Thinned at the peak.
- [ ] **SFX** start on the visual onset frame. Audio runs across cuts.
- [ ] **One** re-hook, **one** dolly zoom or freeze, **one** direct look into the lens.
- [ ] **Sound-off test:** watch muted. Is the story still clear from picture plus captions?
- [ ] **Last frame vs first frame** side by side: same composition?
- [ ] **Facts:** any line marked in §7 updated, and source chips only on supported claims.

**After uploading** (YouTube Studio → the Short → Analytics):

- **Stayed to watch %** shows whether frame 1 and the first second work. Compare against your
  *own* median. YouTube publishes no benchmark [Y1].
- **Retention graph:** every Short here has an exact shot list with timestamps, so map each
  dip to the shot playing at that moment. A dip at the same *type* of shot across several
  Shorts (for example, every flashback) is a real finding.
- **Change one visual variable per upload** (frame-1 composition, cadence, palette) so you can
  attribute the difference.
- Most views come from the feed, where no thumbnail shows. The custom Shorts thumbnail
  (desktop, YPP, since Jul 2026) matters only for home, channel, search and subscription
  surfaces [Y8].

---

## 9. Myths and unverified numbers

These circulate widely but have no primary source, or misread one [D13][D14]:

- "65% of viewers leave in the first 3 seconds": no citation found.
- "87% decide in 3 seconds": no primary source.
- "47% of value is delivered in 3 seconds" (Facebook IQ 2015) measures something else: the
  share of value from people who watched *under* 3 s.
- "85% of videos are watched without sound" is Facebook-feed era. On Reels, 80% are watched
  **with** sound on [M3].
- "Change the visual every 2–3 seconds" has no primary source. The nearest data are a 1.9 s
  first cut and 2.8–4.7 s shots in high-view Shorts [D1].
- A "7-second rule" from YouTube: not found in any YouTube publication.
- "Keep swipe-away under 30%": not in YouTube Help, and contradicted elsewhere.
- Ideal length: studies conflict [D5][D6][D7][D8]. 20–35 s is defensible, but nothing shows it
  is optimal. Trim any beat that doesn't do work.
- Loop editing raises replays only for ≤7 s clips in the one quantified study [D4][D15].
- No platform data compares animation with live action, and there is no Shorts-specific pet
  benchmark.

---

## Sources

All sources below were opened and read during the research. The "Tier" column in each
section shows how much weight each claim carries.

### Platform (official or official wording)

- **[Y1]** YouTube Help, "Understand your YouTube content performance" (Stayed to watch, APV,
  engaged views; view counting from 24 Aug 2026). https://support.google.com/youtube/answer/12220281
- **[Y2]** YouTube Help, "Get started creating YouTube Shorts" (31 Mar 2025 view-count change).
  https://support.google.com/youtube/answer/10059070
- **[Y3]** YouTube Blog, "What are 'Engaged' Views on YouTube?", 19 Aug 2026.
  https://blog.youtube/inside-youtube/engaged-views-youtube-explained/
- **[Y4]** YouTube Analytics API revision history (looping-clip exclusion; `engagedViews`).
  https://developers.google.com/youtube/analytics/revision_history
- **[Y5]** YouTube Blog, "Tall updates coming to Shorts", 3 Oct 2024.
  https://blog.youtube/news-and-events/tall-updates-coming-to-shorts/
- **[Y6]** YouTube Help, "How YouTube recommendations work". https://support.google.com/youtube/answer/16089387
- **[Y7]** Social Media Today, "YouTube updates Shorts algorithm to put more focus on original
  content", 1 Oct 2026. https://www.socialmediatoday.com/news/youtube-updates-shorts-algorithm-to-put-more-focus-on-original-content/831976/
- **[Y8]** PPC Land, "YouTube ends 2-year wait for Shorts thumbnails…", 26 Jul 2026.
  https://ppc.land/youtube-ends-2-year-wait-for-shorts-thumbnails-but-blocks-a-b-testing/
- **[Y9]** Viddo transcript summary, "A deep conversation about Shorts with Jenny Hoyos and
  Todd Sherman". https://viddo.pro/video-result/a11b3353-ac56-4642-a314-4ce95d05a1ca
- **[Y10]** PPC Land, "YouTube Shorts: Product lead discusses strategy and metrics",
  29 Jan 2025. https://ppc.land/youtube-shorts-product-lead-discusses-strategy-and-metrics/
- **[Y11]** tubetldw notes, "Meet the YouTuber Who Solved Shorts" (Jenny Hoyos).
  https://tubetldw.com/meet-the-youtuber-who-solved-shorts-jenny-hoyos/
- **[K1]** TikTok Ads Help, "Creative best practices for performance ads" (Jun 2025).
  https://ads.tiktok.com/resources/help/article/creative-best-practices
- **[K2]** TikTok for Business, "Creative Codes". https://ads.tiktok.com/business/en-US/blog/creative-best-practices-top-performing-ads
- **[M1]** Meta Ads Guide, Instagram Reels specs (safe-zone percentages).
  https://www.facebook.com/business/ads-guide/update/video/instagram-reels?locale=en_US
- **[M3]** Booyah with Meta's Rohith Bhatia, "Why You Should Use Creative Designed
  Specifically for Reels" (80% sound on). https://www.booyah.com/blog/why-you-should-use-creative-designed-specifically-for-reels/

### Industry data and analysis

- **[D1]** Viibeo, "Viral Shorts Pacing Study" (54 Shorts; median shot 4.7 s, first cut 1.9 s), Oct 2026. https://www.viibeo.com/research/viral-shorts-pacing
- **[D3]** OpusClip, "Anatomy of a viral TikTok 2026". https://www.opus.pro/blog/anatomy-of-a-viral-tiktok-2026
- **[D4]** Emplifi, "Facebook Reels: What Drives Views and Stops the Scroll" (10,110 Reels), Mar 2026. https://emplifi.io/resources/facebook-reels-data/
- **[D5]** Paddy Galloway, 33-channel / 5,400-Short study (2023). https://threadreaderapp.com/thread/1646898356419981315.html
- **[D6]** quso.ai, "Video retention benchmarks", Jun 2026. https://quso.ai/research/video-retention-benchmarks
- **[D7]** Buffer, "Longer TikToks Get More Views", Mar 2025. https://buffer.com/resources/longer-tiktoks-get-more-views-data/
- **[D8]** Socialinsider, "Social Media Video Statistics 2026". https://www.socialinsider.io/social-media-benchmarks/social-media-video-statistics
- **[D12]** Shotcraft, "Vertical video safe zones", Aug 2026. https://shotcraft.video/reference/platform-safe-zones/
- **[D13]** Ethos Engine, "The 3-second hook rule, traced", Oct 2026. https://ethosengine.io/insights/three-second-hook-rule-what-platforms-measure
- **[D14]** Terrads, "Four of the numbers in every ad guide have no source", Sep 2026. https://terrads.com/blog/ad-stats-nobody-can-source
- **[D15]** FrameOS, "How to make a video loop seamlessly", Aug 2026. https://frameos.studio/blog/how-to-make-a-video-loop
- **[D16]** Kapwing, "AI Slop Report", Nov 2025. https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/
- **[D17]** vidIQ, Pouty Frenchie channel stats (3D AI bulldog; 2.456B views), Oct 2026. https://vidiq.com/youtube-stats/channel/@poutyfrenchie/
- **[D18]** BBC Future, "The unstoppable rise of Chubby", Aug 2024. https://www.bbc.com/future/article/20240819-why-these-ai-cat-videos-may-be-the-internets-future
- **[D19]** The Guardian, "Cat soap operas and babies trapped in space", Aug 2025. https://www.theguardian.com/technology/2025/aug/11/cat-soap-operas-and-babies-trapped-in-space-the-ai-slop-taking-over-youtube
- **[D20]** 8days, "AI Pet Dramas Are The Hottest Shows In China", Jun 2025. https://www.8days.sg/entertainment/asian/ai-pet-dramas-hottest-shows-china-gen-z-844231

### Science

- **[R1]** Abrams & Christ (2003). Motion onset captures attention. *Psychol Sci*. doi:10.1111/1467-9280.01458
- **[R2]** Franconeri & Simons (2003). Moving and looming stimuli capture attention. *Percept Psychophys*. doi:10.3758/BF03194829
- **[R3]** Mital et al. (2011). Clustering of gaze during dynamic scene viewing. *Cogn Comput*. doi:10.1007/s12559-010-9074-z
- **[R4]** Tatler (2007). The central fixation bias. *J Vis*. doi:10.1167/7.14.4
- **[R5]** Dorr et al. (2010). Variability of eye movements when viewing dynamic natural scenes. *J Vis*. doi:10.1167/10.10.28
- **[R6]** Smith & Henderson (2008). Edit blindness. *J Eye Mov Res*. doi:10.16910/jemr.2.2.6
- **[R7]** Smith & Martin-Portugues Santacreu (2016). Match-action. *Media Psychol*. doi:10.1080/15213269.2016.1160789
- **[R8]** Cutting, Brunick, DeLong, Iricinschi & Candan (2011). Quicker, faster, darker. *i-Perception*. doi:10.1068/i0441aap
- **[R9]** Võ, Smith, Mital & Henderson (2012). Do the eyes really have it? *J Vis*. doi:10.1167/12.13.3
- **[R10]** Correia-Caeiro et al. (2020). Perception of dog facial expressions by humans. *Anim Cogn*. doi:10.1007/s10071-020-01348-5
- **[R11]** Glocker et al. (2009). Baby schema in infant faces. *Ethology*. doi:10.1111/j.1439-0310.2008.01603.x
- **[R12]** Borgi et al. (2014). Baby schema in human and animal faces. *Front Psychol*. doi:10.3389/fpsyg.2014.00411
- **[R13]** Golle et al. (2013). Sweet puppies and cute babies. *PLOS ONE*. doi:10.1371/journal.pone.0058248
- **[R14]** Nittono et al. (2012). The power of kawaii. *PLOS ONE*. doi:10.1371/journal.pone.0046362
- **[R15]** Kätsyri et al. (2015). A review of empirical evidence on the uncanny valley. *Front Psychol*. doi:10.3389/fpsyg.2015.00390
- **[R16]** Zell et al. (2015). To stylize or not to stylize? *ACM TOG*. doi:10.1145/2816795.2818126
- **[R17]** Berger & Milkman (2012). What makes online content viral? *J Marketing Res*. doi:10.1509/jmr.10.0353
- **[R18]** Zickfeld et al. (2019). Kama muta across 19 countries. *Emotion*. doi:10.1037/emo0000450
- **[R19]** Schubert et al. (2018). Being moved, continuous ratings. *Cogn Emot*. doi:10.1080/02699931.2016.1268998
- **[R20]** Levin, Arluke & Irvine (2017). Are people more disturbed by dog or human suffering? *Soc Anim*. doi:10.1163/15685306-12341440
- **[R21]** Loewenstein (1994). The psychology of curiosity. *Psychol Bull*. doi:10.1037/0033-2909.116.1.75
- **[R22]** Gruber, Gelman & Ranganath (2014). States of curiosity modulate memory. *Neuron*. doi:10.1016/j.neuron.2014.08.060
- **[R23]** Kahneman et al. (1993). When more pain is preferred to less. *Psychol Sci*. doi:10.1111/j.1467-9280.1993.tb00589.x
- **[R24]** Valdez & Mehrabian (1994). Effects of color on emotions. *J Exp Psychol Gen*. doi:10.1037/0096-3445.123.4.394
- **[R25]** Wilms & Oberfeld (2018). Color and emotion: hue, saturation, brightness. *Psychol Res*. doi:10.1007/s00426-017-0880-8
- **[R26]** Wisessing et al. (2020). Enlighten me: lighting and emotion in cartoon characters. *ACM TOG*. doi:10.1145/3383195
- **[R26b]** Tarvainen et al. (2015). Film mood and its quantitative determinants. *Psychol Aesthet Creat Arts*. doi:10.1037/a0039432
- **[R27]** Van der Burg et al. (2008). Pip and pop. *JEP:HPP*. doi:10.1037/0096-1523.34.5.1053
- **[R28]** d'Ydewalle et al. (1991). Watching subtitled television. *Commun Res*. doi:10.1177/009365091018005005
- **[R29]** Kruger & Steyn (2014). Subtitles and eye tracking. *Read Res Q*. doi:10.1002/rrq.59
- **[R30]** Szarkowska et al. (2024). Watching subtitled videos with the sound off. *PLOS ONE*. https://pmc.ncbi.nlm.nih.gov/articles/PMC11458047/
- **[R31]** Wals et al. (2026). Visual complexity and scene cuts on viewer attention. *J Acad Mark Sci*. https://research.utwente.nl/en/publications/the-dynamic-effects-of-visual-complexity-and-scene-cuts-on-viewer/
- **[R32]** Kaminski et al. (2019). Evolution of facial muscle anatomy in dogs. *PNAS*. doi:10.1073/pnas.1820653116
- **[R33]** Waller et al. (2013). Paedomorphic facial expressions give dogs a selective advantage. *PLOS ONE*. doi:10.1371/journal.pone.0082686
- **[R34]** Bremhorst et al. (2021). Evaluating the accuracy of facial expressions as emotion indicators. *Front Psychol*. doi:10.3389/fpsyg.2021.568935
- **[R35]** Sexton et al. (2024). Raising an eye at facial muscle morphology in canids. *Biology*. doi:10.3390/biology13050290
- **[R36]** Rehn & Keeling (2011). The effect of time left alone at home on dog welfare. *Appl Anim Behav Sci*. doi:10.1016/j.applanim.2010.11.015
- **[R37]** Snopes, "Do dogs watch you in the bathroom to protect you?" https://www.snopes.com/fact-check/dogs-watch-bathroom/
- **[R38]** PetMD, "Why do dogs bring you toys when you get home?" https://www.petmd.com/dog/behavior/why-do-dogs-bring-you-toys-when-you-get-home
- **[R39]** Dogs Trust, "Why does my dog follow me?" https://www.dogstrust.org.uk/dog-advice/understanding-your-dog/following
- **[R40]** Salimpoor et al. (2011). Dopamine release during anticipation and experience of peak emotion to music. *Nat Neurosci*. doi:10.1038/nn.2726
- **[R41]** Fredrickson & Kahneman (1993). Duration neglect. *JPSP*. doi:10.1037/0022-3514.65.1.45
- **[R44]** TODAY, "Family dog shot repeatedly by burglars while protecting teen" (Rex, 2018). https://www.today.com/pets/family-dog-shot-repeatedly-burglars-while-protecting-teen-t123935

### Animation, cinematography, rendering

- **[C1]** Thomas & Johnston, *The Illusion of Life* (1981). https://archive.org/stream/TheIllusionOfLifeDisneyAnimation/The%20Illusion%20of%20Life%20Disney%20Animation_djvu.txt
- **[C3]** Johnston's rules of expression for eyes (via Golan Levin). https://www.flong.com/archive/blog/2009/johnstons-rules-of-expressions-for-eyes-and-time-travel/index.html
- **[C4]** Andy Wu, "Eye specular highlights, the Pixar problem". http://www.grinning-tiger.com/posts/2013/03/24/eye-specular-highlights-the-pixar-problem
- **[C5]** Animation Apprentice, "How to animate a blink". https://animationapprentice.blogspot.com/2018/03/why-animators-need-to-blink.html
- **[C5b]** Olivier Ladeuix, "Cartoony eyes – how to". https://olivier-ladeuix.com/blog/2016/10/19/cartoony-eyes-how-to/
- **[C6]** RSPCA, "Understanding your dog's body language". https://www.rspca.org.uk/adviceandwelfare/pets/dogs/behaviour/understanding
- **[C7]** AKC, "How to read dog body language". https://www.akc.org/expert-advice/training/how-to-read-dog-body-language/
- **[C8]** In Depth Cine, "Understanding focal length in cinematography". https://www.indepthcine.com/videos/focal-length
- **[C9]** In Depth Cine, "Why this shot works: dolly zoom". https://www.indepthcine.com/videos/dolly-zoom
- **[C10]** ACM SIGGRAPH Blog, "Creating different worlds in cinematography" (Pixar, *Win or Lose*), Jul 2024. https://blog.siggraph.org/2024/07/creating-different-worlds-in-cinematography.html/
- **[C11]** Foundry, "Inside Out 2 lighting: creating emotion". https://www.foundry.com/insights/film-tv/inside-out-2-lighting-creating-emotion-characters
- **[C12]** Interview with Ralph Eggleston, "Design with a purpose". https://www.animationartconservation.com/design-with-a-purpose%2C-an-interview-with-ralph-eggleston.html
- **[C13]** TED Ideas, "How color helps a movie tell its story". https://ideas.ted.com/how-color-helps-a-movie-tell-its-story/
- **[C13b]** HuffPost, "How Roger Deakins helped blur the line…" (*WALL·E*). https://www.huffpost.com/entry/roger-deakins_b_3268900
- **[C15]** Jeremy Birn, "Three-point lighting". https://www.3drender.com/light/3point.html
- **[C16]** Chris Brejon, "CG cinematography, ch. 8: shot lighting". https://chrisbrejon.com/cg-cinematography/chapter-8-shot-lighting/
- **[C17]** three.js r170 `examples/jsm`. https://github.com/mrdoob/three.js/tree/r170/examples/jsm
- **[C18]** three.js manual (r170), "How to use post-processing". https://github.com/mrdoob/three.js/blob/r170/docs/manual/en/introduction/How-to-use-post-processing.html
- **[C19]** GSAP 3.13 release (all plugins free). https://gsap.com/blog/3-13/
- **[C21]** Three.js demos, volumetric light shafts. https://threejsdemos.com/demos/lighting/godrays
- **[C22]** Expert Photography, "Dog perspective in pet photography". https://expertphotography.com/perspective-in-pet-photography
- **[C23]** ClickyApps, "Vertical framing & safe zones". https://clickyapps.com/creator/video/guides/vertical-framing-safe-zones
