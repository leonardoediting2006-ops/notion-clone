# Shorts 3D Studio

3D animations for **YouTube Shorts** (1080×1920, 9:16), made with plain
**HTML, CSS and JavaScript**, using [Three.js](https://threejs.org/) for 3D and
[GSAP](https://gsap.com/) for animation. No framework and no build step.
Three.js and GSAP are included in `lib/`, so everything works offline.

## Preview

```bash
npm run dev          # → http://localhost:5173
```

(ES modules need a web server, so double-clicking the HTML file won't work. Any static server is fine,
e.g. `python3 -m http.server`.)

Preview controls: **Space** play/pause · **←/→** step one frame · **S** show the YouTube UI
safe zone · **L** toggle loop · drag the scrubber to jump anywhere.

## Export to MP4

One-time setup: install [ffmpeg](https://ffmpeg.org/), then

```bash
npm install
npx playwright install chromium
```

Render:

```bash
npm run render -- shorts/hello-3d                          # → out/hello-3d.mp4
npm run render -- shorts/hello-3d --audio music.mp3        # with a soundtrack
npm run render -- shorts/hello-3d --frame 90               # one PNG frame (thumbnail)
npm run render -- shorts/hello-3d --out out/v2.mp4 --crf 16
```

The renderer opens the short in headless Chrome, seeks the GSAP timeline to every frame,
screenshots it (3D canvas *and* HTML/CSS captions) and pipes the frames into ffmpeg (H.264).
It is frame-perfect: a slow machine just renders slower, it never drops frames.

## Project layout

```
index.html            gallery of all shorts
css/stage.css         shared styles: 1080x1920 stage, captions, safe zone, controls
js/engine.js          createShort(): renderer, scene, camera, lights, GSAP timeline, preview UI
lib/                  three.module.min.js (r170), gsap.min.js (3.15)
shorts/
  _template/          copy this to start a new short
  hello-3d/           example: spinning knot, orbiting cubes, star field, word-pop captions
tools/
  server.mjs          tiny static dev server
  render.mjs          headless frame-by-frame MP4 / PNG exporter
```

## Making a new short

1. `cp -r shorts/_template shorts/my-short`
2. Edit `shorts/my-short/main.js` (3D + animation), `index.html` (captions) and `style.css`.
3. Add a link to it in the root `index.html`.
4. Preview with `npm run dev`, export with `npm run render -- shorts/my-short`.

### The one rule: animate only through the timeline

So the exported MP4 matches the preview exactly, every bit of motion must come from:

- **GSAP tweens on `tl`**, which work on 3D objects (`camera.position`, `mesh.scale`,
  `material.color`, ...) and HTML elements alike, e.g.
  `tl.to(mesh.rotation, { y: Math.PI, duration: 1 }, 2.5)`, which starts at 2.5s; or
- **`onUpdate((t) => ...)`** callbacks for continuous motion, using only the timeline time `t`.

Don't use `requestAnimationFrame`, `Date.now()`, `Math.random()` per frame, or free
`gsap.to()` calls outside `tl`. For randomness, generate values once at startup.

### Tips for Shorts

- Keep the duration ≤ 60s (`createShort({ duration })`).
- Press **S** in the preview: the bottom ~380px and the right edge are covered by YouTube's UI.
- Hook in the first second, and loop-friendly endings get replays.
- Put textures, `.glb` models and audio next to the short (e.g. `shorts/my-short/assets/`).
