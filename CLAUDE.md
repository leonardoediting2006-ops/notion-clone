# Shorts 3D Studio: instructions for Claude

This repo makes vertical 3D YouTube Shorts (Three.js + GSAP, `createShort` in `js/engine.js`, one folder per video in `shorts/<name>/`,
per-video docs in `scripts/<name>.md`, tools in `tools/`). See `README.md` for the engine and render commands.

## MANDATORY: the viral formula
**Before planning, coding or animating any new short (or reworking one), read `VIRAL_FORMULA.md` and follow it.**
Write the shot plan (its §6 table) first, check it against its rules (§3), and run its QA (§9, `tools/analyze-video.py`) on the render.
The short version:

1. **One world.** ≥ 70 % of the runtime in ONE set; variety comes from the camera, not from new places. Far-away things appear through a TV / window / book (portal).
2. **Medium shots of the action** (subject 55–80 % of frame height, animal eye height); show what is happening, don't symbolise it.
3. **The camera never rests and is slow.** ≥ 50 % of the runtime is one uncut glide; hard cuts only in the first ≈ 6 s, each on the first word of a clause; no dissolves except for time jumps.
4. **Explain inside the world:** instruments, flat 3D arrows, tinted body parts, see-through volumes, real props; one colour code (green easy, red hard, pink idle). No ❌.
5. **Emojis ≈ none** (≤ 1 per 20 s, thought beats only, as 3D toon models). No text except one-word captions at ≈ 66 % height.
6. **A visual beat on every clause (≈ one per 1.4 s)**, a face reaction on every beat, a small audience in the foreground.
7. **Hook in frame 1** (the hero doing something funny, first word at t = 0); energy curve HOT → CALM → HOT; end with a callback to frame 1 and loop.
8. **Voice without gaps** (`tools/tighten-voice.py`), mix ≈ −14 LUFS, peak ≤ −1 dBFS.

If a request contradicts the formula, the owner's request wins: say so in one line and do what they asked.

## Standing preferences (the owner's)
- Style: **toon**: flat 2D people in a 3D cartoon world, a cute glossy-eyed 3D hero dog in frame 1; vivid saturated colours; custom 3D toon icons (`js/icons3d.js`), never emoji sprites.
- Format: 1080×1920 at 60 fps, rendered at 2× by default (`npm run render -- shorts/<name> --headed`; `--scale 1` for a quick pass). Animation keyed to a recorded word-level `.srt`; don't alter the owner's script text unless asked.
- Sound: **real recorded SFX only** (CC0 / CC BY), clean and crisp, no wind, no synthesised sounds, no whooshes/booms; put the CC BY credit line in the description (`shorts/<name>/sfx/CREDITS.md`).
- Seamless loop (last frame = first frame) when the story allows it.
- Every video ships with title options, tags, description and a pinned comment in `scripts/<name>.md`.
- Cloud renders are too slow: here, check **stills** (full resolution) and an audio-only mix; the owner renders the final on their own PC.
- Commit messages and PRs: follow the attribution lines given in the session. Don't open a PR unless asked.
