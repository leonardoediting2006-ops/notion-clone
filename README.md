# Shorts 3D Studio

Code-driven **3D animations for YouTube Shorts**: vertical 1080×1920, 30 fps, rendered to MP4.

Built with [Remotion](https://www.remotion.dev/) (React video rendering) and
[React Three Fiber](https://docs.pmnd.rs/react-three-fiber) / Three.js for the 3D scenes.

## Quick start

```bash
npm install
npm run dev                      # open the Remotion Studio to preview and scrub shorts
npm run render -- HelloShort     # render to out/HelloShort.mp4
npm run still -- HelloShort --frame=60   # render a single frame as a PNG (good for thumbnails)
```

Rendering 3D in headless Chrome needs WebGL. If a render comes out black or fails,
add `--gl=swiftshader` (software rendering) or `--gl=angle`.

## Project layout

```
src/
  index.ts              entry point
  Root.tsx              registers every short as a <Composition>
  config.ts             Shorts format (1080x1920, 30 fps) + seconds() helper
  components/
    Scene3D.tsx         full-frame 3D canvas with a default camera and lights
    Caption.tsx         bold, pop-in Shorts-style caption text
  shorts/
    HelloShort/         example short: spinning torus knot + orbiting cubes
public/                 static assets (audio, textures, .glb models) loaded with staticFile()
out/                    rendered videos (git-ignored)
```

## Making a new short

1. Copy `src/shorts/HelloShort` to `src/shorts/MyShort` and rename the component.
2. Register it in `src/Root.tsx` with a new `<Composition id="MyShort" ... />`.
   Keep `durationInFrames` at or under `seconds(60)`.
3. Preview with `npm run dev`, then `npm run render -- MyShort`.

Rules of thumb:

- Drive every animation from `useCurrentFrame()` (with `spring` / `interpolate`), never from
  `useFrame` or clock time, so every render is identical.
- Keep the important content in the middle of the frame: YouTube's UI covers the bottom
  ~350px and the right edge.
- Put audio, textures and 3D models in `public/` and load them with `staticFile()`.
