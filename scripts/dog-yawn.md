# Why your dog yawns when you yawn

Seamless-loop Short · ~20.7 s · 74 words · calm pace (~3.6 words/s) · 1080×1920, 60 fps

## Voiceover (record exactly this)

> Watch your dog. Yawn in front of him, and he'll probably yawn right back.
> Yawns can be contagious, even to dogs.
> Scientists tested twenty-nine dogs. When a person yawned, twenty-one dogs yawned too.
> But when the person just opened their mouth, not one did.
> And in another study, dogs yawned more when their owner yawned than when a stranger did.
> Researchers think it may be a sign of empathy.
> So the next time you yawn,

The last line is **deliberately unfinished** and runs into the first line on the loop:
*"So the next time you yawn, **watch your dog.** Yawn in front of him…"*
A first-time viewer gets a short, direct hook ("Watch your dog.") plus a task they can try on their own dog right
away, which gives them a reason to stay and to comment.

## Loop rules (same as `dog-stare`)

- **Audio:** no silence at either end. First word starts ≤ 0.15 s in; the last word ends flush with the video
  (`DURATION = last cue end + 0.1 s`). Keep the delivery on "yawn," open and rising, as if the sentence goes on.
- **Picture:** last frame = first frame: a close-up of the dog's face looking into the lens, mouth closed, camera at
  rest (zero velocity at both ends). No fade, no title card, no "follow" prompt.

## Beat sheet (times are the plan; the real `.srt` re-times everything)

| Time | Line | Picture | Label / sound |
|---|---|---|---|
| 0.15–1.0 | Watch your dog. | Close-up of the golden cartoon dog looking into the lens, ears up. | Soft room bed. |
| 1.0–4.0 | Yawn in front of him, and he'll probably yawn right back. | Camera glides out to the side (the `dog-stare` move). You, on the sofa, stretch and yawn behind your hand; a beat later he opens his jaw wide, eyes shut, then blinks and looks at you. | Label `🥱 YAWN` on your yawn. A soft real yawn/sigh sound for his. |
| 4.0–6.0 | Yawns can be contagious, even to dogs. | Same shot, slow push toward the two of you. | Label `🥱 CONTAGIOUS`. |
| 6.0–9.3 | Scientists tested twenty-nine dogs. When a person yawned, twenty-one dogs yawned too. | A card fills the middle: a grid of 29 small dog faces, 21 lighting up one by one. | Card `21 / 29 YAWNED`. Soft tick per light. |
| 9.3–12.4 | But when the person just opened their mouth, not one did. | The grid resets and stays dark. | Card `MOUTH OPEN ONLY: 0 / 29`. |
| 12.4–16.5 | And in another study, dogs yawned more when their owner yawned than when a stranger did. | Two bars grow: `OWNER` tall, `STRANGER` short. Camera pushes in on his face. | Bars card, no extra label. |
| 16.5–19.0 | Researchers think it may be a sign of empathy. | Close two-shot: he looks at you, soft heart glow between your eyes (the `dog-stare` hearts). | Label `💗 EMPATHY?` (the question mark is intended). |
| 19.0–20.7 | So the next time you yawn, | Camera glides back into the opening close-up, dog still, mouth closed. Loops. | Cut flush. |

Visual rules from the analytics and feedback: one continuous room (no lab or new-scene cut), cute dog in the first
frame, daytime and bright, one soft label or card at a time, nobody is angry with the dog.

## Why this script

| Finding in your analytics | Choice |
|---|---|
| "Why your dog does X when you…" is your best format (27–35K views, 1.6–1.9 subs per 1K views). | Second-person, a behaviour every owner has seen and can test. |
| Winners ran 25–27 s; viewers leave around 11–15 s; Eyes (pure fact) got views but 0.24 subs per 1K. | 20.7 s; the owner-vs-stranger payoff lands at ~16 s and is about *their* dog. |
| Loops lift average % viewed above 100%. | Sentence-wrap loop plus matching first and last frame. |
| The "guilty look" comment: the audience punishes shaky science and angry owners. | Every claim is hedged ("probably", "can be", "may be"); a calm owner. |

## Fact-check (keep claims inside what the studies showed)

- **Joly-Mascheroni, Senju & Shepherd (2008), "Dogs catch human yawns", Biology Letters 4(5):446–448.** 29 dogs
  watched a person yawn or make control mouth movements: **21 dogs yawned to the yawn, none to the control movements.**
- **Romero, Konno & Hasegawa (2013), "Familiarity bias and physiological responses in contagious yawning by dogs
  support link to empathy", PLoS ONE.** 25 dogs watched their owner and a stranger yawn or make control movements:
  they yawned more for the yawn, and **more for the owner than the stranger.** Heart rate did not differ between
  conditions, which argues against yawning as a stress reaction.
- **What is not settled:** a 2009 follow-up (Harr & Gilbert) found much weaker evidence of contagious yawning in dogs,
  and both studies are small. So the script says "probably", "can be" and "may be a sign of empathy". **Do not say**
  "proves empathy" or "all dogs yawn".
- Pinned-comment angle: ask viewers to try it and report back (below). It also invites people to share dogs that did not
  yawn, which fits the "probably".

## Upload kit

**Title options** (pick one)
1. Why Your Dog Yawns When You Yawn 🥱🐶
2. Yawn in Front of Your Dog (Watch What Happens) 🥱
3. Your Dog Catches Your Yawns 🐶 (Scientists Tested It)

**Tags**
`dog yawn, why do dogs yawn, dog yawns when I yawn, contagious yawning, do dogs catch yawns, dog empathy, dog behavior, dog science, dog facts, dog bond, dog and owner, dog psychology, cute dog, dog shorts, pet facts, animal facts, shorts`

**Description**
```
Yawn in front of your dog and watch what he does! 🥱🐶 In one study, 21 of 29 dogs yawned when a person yawned, and in another, dogs yawned more for their owner than for a stranger.
#shorts #dogs #dogfacts

Sources: Joly-Mascheroni et al., Biology Letters (2008), "Dogs catch human yawns"; Romero, Konno & Hasegawa, PLoS ONE (2013), "Familiarity bias and physiological responses in contagious yawning by dogs support link to empathy".
```

**Pinned comment**
> Try it on your dog and tell me: did he yawn back? 🥱🐶 (Not every dog does, and scientists are still working out why.)

## Build notes

- New short folder `shorts/dog-yawn/`, built from the `dog-stare` scene (same room, hero dog, camera engine). New pieces:
  a **yawn** for the dog (jaw open wide via `jawOpen`, eyes closed via `closed`, a slow in-and-out), a stretch-and-yawn for
  you (hand to mouth with `reachTo`, head back, spine arched), and the **dog-grid card** and **bars card** as DOM overlays.
- Frame budget: about 1,250 frames, about the same as `dog-stare` (~1.5 h on the cloud renderer, much less on a GPU PC).
- Real SFX needed: a dog yawn/sigh (the Sonic Pi/ESC-50 libraries have no yawn; the repo's `yawn.wav` and `sigh.wav`
  are code-built stand-ins) and a soft tick. Download a real dog yawn (freesound, CC0) as
  `shorts/dog-yawn/sfx/yawn.wav`.
