# Why your dog stares at you (it's not for food)

Seamless-loop Short · ~23.5 s · 84 words · calm pace (~3.6 words/s) · 1080×1920, 60 fps

## Voiceover (record exactly this)

> Your dog is looking at you. And you're looking at him.
> You think he wants a treat. But scientists found something else.
> When a dog stares into your eyes, you both get a boost of oxytocin.
> The same hormone that bonds a mother to her baby.
> Even wolves raised by humans didn't do this.
> So he's not just begging. He's hugging you with his eyes.
> And the longer you look at each other, the more you both want to.
> Which is why, right now,

The last line is **deliberately unfinished**. On the loop it runs straight into the first line:
*"Which is why, right now, **your dog is looking at you.** And you're looking at him."*
A first-time viewer hears a complete, punchy opener; a replay hears one endless sentence about the loop of looking,
which is exactly what the science says: look → oxytocin → look more.

## Loop rules (so the seam is invisible)

- **Audio:** no silence at either end. First word starts ≤ 0.15 s in; the last word ends flush with the video
  (`DURATION = last cue end + 0.1 s`, not the usual +1.8 s). Cut the breath after "now," and keep the delivery
  rising/open, as if the sentence goes on. Ambience bed loops; no SFX tail across the seam.
- **Picture:** last frame = first frame. Open on a close-up of the dog looking into the lens; pull back through the
  story; push back in during the last 4 s and land on the identical framing with the camera at rest (zero velocity
  at both ends, as in `dog-welcome`). The dog's eyes never leave the lens at the seam.
- **No fade, no title card, no "follow for more" at the end.**

## Beat sheet (times are the plan; the real `.srt` re-times everything)

| Time | Line | Picture | Label / sound |
|---|---|---|---|
| 0.15–3.2 | Your dog is looking at you. And you're looking at him. | Daytime living room. Close-up of the golden cartoon dog (big glossy eyes) staring into the lens, slow pull-back begins. | Soft ambient bed, one tail-thump. No label. |
| 3.2–6.3 | You think he wants a treat. But scientists found something else. | Wide: you on the sofa, dog sitting in front of you. A treat bag sits on the coffee table, **in plain view**. The dog ignores it and keeps looking at your eyes. | Treat-bag rustle (real SFX). |
| 6.3–12.9 | When a dog stares into your eyes, you both get a boost of oxytocin. The same hormone that bonds a mother to her baby. | Same room, same shot, slow push toward the two faces. A soft glow ring pulses between the dog's eyes and yours. Never a scene cut. | Label `OXYTOCIN ↑` over both heads, one at a time, soft fade. |
| 12.9–15.2 | Even wolves raised by humans didn't do this. | Same room. A small wolf plush on the shelf gets a quiet spotlight, no glow ring on it. | Label `HAND-RAISED WOLVES: NO BOOST` for ~2 s. |
| 15.2–18.2 | So he's not just begging. He's hugging you with his eyes. | Back on the dog, soft eyes, one slow blink; a small heart-shaped glow leaves the ring. | Soft chime (real SFX). |
| 18.2–22.1 | And the longer you look at each other, the more you both want to. | Glow ring brightens a little each time the gaze "bounces" between you. Camera pushes toward the dog's face. | Gentle rising pad. |
| 22.1–23.5 | Which is why, right now, | Arrives on the opening close-up, dog staring into the lens, camera at rest. Loops. | Cut flush. |

Visual rules from the analytics and feedback: one continuous room (no lab or "new video" scene change), cute dog
visible in the first frame, daytime and bright, at most one soft label at a time, nobody is angry with the dog.

## Why this script (what the numbers said)

| Finding | Design choice |
|---|---|
| "Why your dog does X when you…" got 27–35K views, 1.6–1.9 subs/1K. Pure-fact "Eyes" got 28.7K views but 0.24 subs/1K. | Second-person, relatable behaviour every owner has seen. |
| Winners ran 25–27 s; the story shorts (31 s, 27 s) flopped and viewers leave around 11–15 s. | 23.5 s, payoff ("hugging you with his eyes") lands at ~18 s. |
| Retention hits when the hook is relatable and the story is continuous. | "You think… But…" structure, one explanation, one twist. |
| Loops lift average % viewed above 100%. | Sentence-wrap loop plus matching first/last frame. |
| "Guilty look" comment: viewers punish framing that makes owners look aggressive. | Warm, calm owner; the dog is never scolded. |

## Fact-check (keep claims inside what the study showed)

Source: Nagasawa et al., *Oxytocin-gaze positive loop and the coevolution of human-dog bonds*, Science 348(6232),
333–336 (2015). Azabu University, Japan.

- In a 30-minute owner–dog interaction, dogs that gazed at their owners longer were associated with **higher urinary
  oxytocin in the owners**, and the dogs' own oxytocin rose too. A second experiment gave dogs oxytocin and found the
  same loop. "You both get a boost of oxytocin" is accurate; they measured **urine**, not brain release.
- Hand-raised wolves in the same set-up did not show the gaze→oxytocin effect. Keep it in the past tense ("didn't").
  Later commentary argues the dog and wolf groups differed in other ways, so **don't say** "only dogs can do this".
- Don't claim the stare always means love: a soft, relaxed look is what the study is about; a stiff, hard stare can mean
  stress. Pin a comment saying so (below) before someone else does.
- The mother-and-baby comparison comes from the paper's own framing of the bond.

## Upload kit

**Title options** (pick one)
1. Why Your Dog Stares at You (It's Not for Food) 🐶
2. Your Dog Is Looking at You Right Now 🥹
3. Scientists Found Why Your Dog Stares at You 🐶

**Tags**
`dog staring, why does my dog stare at me, dog eye contact, dog oxytocin, dog love, dog behavior, dog science, dog facts, dog bond, dog and owner, dog psychology, dogs look at you, dog gaze, dog emotions, cute dog, dog shorts, pet facts, animal facts, shorts`

**Description**
Why does your dog stare at you? Japanese researchers found that when dogs gaze at their owners, oxytocin rises in both of them. #shorts #dogs #dogfacts
Source: Nagasawa et al., Science (2015), "Oxytocin-gaze positive loop and the coevolution of human-dog bonds".
Sounds: see credits in the video description block (CC-BY clips only).

**Pinned comment**
> A soft, relaxed look is what the research is about. A stiff, hard stare can mean stress, so always read the body language too. 🐶

## Build notes

- New short folder: `shorts/dog-stare/`, hero dog `heroDog(DOG_COLORS.golden)` with `darkEyes`, the `dog-welcome` house and
  camera-track engine. Re-use word cues `at(word, nth)`; set `DURATION = END + 0.1`.
- Frame budget: 1,416 frames at ~4 s/frame on the cloud renderer is about 1.6 h, a third cheaper than `dog-welcome`.
- Real SFX needed: treat-bag rustle, soft chime, tail thump. `tools/fetch-sfx.mjs` has none of these yet; source from
  the same CC0/CC-BY ESC-50 pool or Freesound and add them to a `dog-stare` set.
