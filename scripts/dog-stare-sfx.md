# SFX research for "Why your dog stares at you"

Status: candidates found for the chime, the tail thump and the pad. **The treat-bag crinkle is still open.**
Nothing here has been auditioned by ear on my side: I can analyse and cut audio but not hear it, so every pick
below is a shortlist for you to listen to (`sfx-audition.mp3`, index at the bottom).

## What the script needs

| Beat | Sound | Existing |
|---|---|---|
| 3.2 s | treat-bag rustle (a bag on the table, dog ignores it) | none |
| 0–3 s | one tail thump (dog's tail on the sofa) | code-built `thump` (synthetic, don't use) |
| 15.2 s | soft chime on "hugging you with his eyes" | none |
| 18–23 s | gentle rising pad under "the longer you look…" | `ambi_drone` (real, CC0) |
| bed | daylight birds + room | `birds_2` (real, ESC-50, CC0) |

## Where real, free sounds can be reached from this machine

| Source | Reachable | Notes |
|---|---|---|
| ESC-50 (GitHub, freesound clips) | yes | 2,000 five-second clips, 50 classes. No bag, paper or tail class. |
| Sonic Pi samples (GitHub, freesound clips) | yes | 200 samples, all CC0, source links in its README. Bells, pads, impacts. |
| Kenney interface sounds (GitHub mirror) | yes | CC0, but **designed** UI sounds, not field recordings. |
| freesound.org, pixabay, mixkit, opengameart, archive.org, zenodo, huggingface, kenney.nl, wikimedia | **blocked** | The environment's network policy denies them, so a real crinkle can't be downloaded here. |

Web searches found bag-crinkle clips only on paid or AI-generated libraries (ElevenLabs, BudgetPixel, Artlist,
Soundstripe) and non-CC0 packs. No verified CC0 crinkle or tail-wag recording turned up.

## Shortlist

**Soft chime** (all CC0)
- `perc_bell` and `perc_bell2` (Sonic Pi): real recorded bells, freesound users AlaskaRobotics #221515 and hullum #415559. Best fit for "real".
- Kenney `glass_004`, `confirmation_002`: shorter and cleaner but designed, not recorded.

**Tail thump** (a soft, low thud on a sofa)
- Three wooden-door knocks from ESC-50 (`2-118625-A-30`, `4-182039-A-30`, `3-180147-A-30`), cut to one hit and low-passed at 450 Hz.
- Sonic Pi `perc_door` (hullum #415579) and `perc_impact2` (hullum #415581), low-passed at 500 Hz.
- Honest limit: none is a tail. They are real low thuds that should read as one on screen. If they sound wrong, a real tail-wag clip must come from your PC.

**Pad under the last beat**: Sonic Pi `ambi_sauna` (hullum #415551), `tbd_pad_2`, or the `ambi_drone` already used in `dog-hero`.

**Treat-bag crinkle: not found.** Stand-ins are three crackling-fire windows from ESC-50 (high-passed at 700 Hz), because
fire crackle and bag crinkle are both dense random clicks. It may pass under a quiet mix but it is not a bag.
Best fix, 2 minutes on your PC: on freesound.org search `plastic bag crinkle`, filter **License: Creative Commons 0**,
or on Pixabay search `plastic bag crinkle` (no credit needed). Save the clip as `shorts/dog-stare/sfx/crinkle.wav`;
the engine picks it up by name with no code change. Keep it under ~1.5 s or tell me the start and end time to cut.

## Plan for the sound set

1. Add a `dog-stare` set to `tools/fetch-sfx.mjs`: `birds_2` + the three knock thumps (ESC-50), then a small step that
   copies the chosen Sonic Pi samples (CC0) into `shorts/dog-stare/sfx/` with a `CREDITS.md`.
2. Mix targets: bed at 0.18, thump 0.5, crinkle 0.4 (one pass), chime 0.35, pad rising 0 → 0.25 over the last 4 s,
   all cut flush at the end so the loop seam stays silent-free.
3. Credits: everything listed is CC0, so no credit line is needed; the CREDITS file still lists the sources.

## Audition reel (`sfx-audition.mp3`, 77 s, each sound plays twice)

| Start | Sound |
|---|---|
| 0:00 | C1 chime: Sonic Pi perc_bell |
| 0:07 | C2 chime: Sonic Pi perc_bell2 |
| 0:15 | C3 chime: Kenney glass_004 |
| 0:18 | C4 chime: Kenney confirmation_002 |
| 0:21 | T1 thump: knock 2-118625-A-30 |
| 0:24 | T2 thump: knock 4-182039-A-30 |
| 0:26 | T3 thump: knock 3-180147-A-30 |
| 0:29 | T4 thump: Sonic Pi perc_door |
| 0:32 | T5 thump: Sonic Pi perc_impact2 |
| 0:36 | R1 crinkle stand-in: fire 1-46272-A-12 |
| 0:40 | R2 crinkle stand-in: fire 1-17742-A-12 |
| 0:45 | R3 crinkle stand-in: fire 4-181563-A-12 |
| 0:49 | P1 pad: ambi_sauna |
| 0:59 | P2 pad: tbd_pad_2 |
| 1:07 | P3 pad: ambi_drone |
