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
npm run render -- shorts/hello-3d --headed                 # visible window: guarantees the GPU is used
npm run render -- shorts/hello-3d --cpu                    # machines with no GPU (cloud/CI), much slower
```

Rendering uses your graphics card. The first line it prints is `WebGL renderer: …`. If that says
SwiftShader or llvmpipe, it is running on the CPU; add `--headed` to fix it. On a PC with any
graphics card, a 25 s short renders in a few minutes. In a GPU-less cloud container it takes about 30 min.

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
  dog-mailman/        "What your dog thinks the mail carrier is" (pet-POV style)
  dog-bathroom/       "Why your dog follows you into the bathroom" (voiceover-synced, voiceover.srt)
characters/           Character Lab: preview every human preset (?only=dad, &face for a close-up)
js/avatar.js          photorealistic premade people (Rocketbox) with walk/run/sit in code
js/human.js           code-built stylised human template + PRESETS (fallback)
assets/rocketbox/     downloaded Rocketbox avatars + their MIT licence
lib/jsm/              three.js FBX / glTF / Draco loaders
js/props.js           furniture, decor & vehicle loader + code-built mailbox, handbag, hats, fence
assets/props/, assets/vehicles/   downloaded models (see assets/CREDITS.md)
js/textures.js        procedural textures (fur, fabric, denim, plaster, bark, sky…)
js/trees.js           procedural trees and bushes with leaf cards
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

## Human template (`js/human.js`)

Build a person once, reuse them in every short by changing clothes and features:

```js
import { createHuman, PRESETS } from "../../js/human.js";

const carrier = createHuman(PRESETS.mailCarrier);
const neighbour = createHuman({
  ...PRESETS.dad,
  top: { type: "hoodie", color: 0x2f5d8a },
  hair: { style: "buzz", color: 0x1e1612 },
  glasses: { color: 0x111111 },
});
scene.add(carrier, neighbour);

onUpdate((t) => carrier.walk(t * 7, 0.5)); // 0.5 walk … 1.0 run
neighbour.sit();
```

Options (all optional):

| option | values |
|---|---|
| `height`, `build` | metres (1.78 default); 0.85 slim … 1.25 heavy |
| `body` | `"male"` \| `"female"` |
| `skin`, `eyes` | hex colours |
| `face` | `{ nose, jaw, chin, lips, brow, cheeks }` multipliers around 1 |
| `hair` | `{ style: "short" \| "buzz" \| "long" \| "ponytail" \| "balding" \| "bald", color }` |
| `beard` | `"none"` \| `"stubble"` \| `"beard"` \| `"mustache"` |
| `top` | `{ type: "tshirt" \| "polo" \| "shirt" \| "hoodie" \| "sweater", color }` |
| `bottom` | `{ type: "jeans" \| "pants" \| "shorts" \| "skirt", color }` |
| `shoes` | `{ type: "sneakers" \| "shoes" \| "boots", color }` |
| `hat` | `{ type: "cap" \| "uniform" \| "beanie", color }` or `null` |
| `glasses` | `{ color }` or `null` |

Joints for custom poses: `pelvis, spine, head, armL/armR, elbowL/R, handL/R, legL/legR, kneeL/R, ankleL/R`.
Helpers: `walk(phase, amount)`, `sit()`, `resetPose()`, `blink(0..1)`, `look(yaw, pitch)`.
Presets: `mailCarrier`, `dad`, `mom`, `teen`, `grandpa`. Preview them at `characters/`.

## Photorealistic people (`js/avatar.js`)

Real artist-made characters from the [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox)
(MIT licence, free for commercial use; licence kept in `assets/rocketbox/LICENSE.md`).

```js
import { loadAvatar } from "../../js/avatar.js";
const carrier = loadAvatar(short, "Delivery_Male_01");
scene.add(carrier);
onUpdate((t) => {
  carrier.walk(t * 7, 0.5);   // or .sit(), .resetPose(), or set carrier.armR.rotation etc.
  carrier.update();           // push the pose onto the skeleton (once per frame)
});
```

Included: `Delivery_Male_01`, `Male_Adult_08`, `Female_Adult_01`. The library has 115 more
(adults, children, business, medical, police, chefs, construction, pilots…). To add one, download
`Assets/Avatars/<Group>/<Name>/Export/<Name>.fbx` plus its `Textures/*_color.tga`, `*_normal.tga`
(and `*_opacity_color.tga` if present) into `assets/rocketbox/<Name>/`, converting the TGAs to
`.jpg` (`.png` for opacity) — e.g. `ffmpeg -i x.tga -vf scale=2048:-1 x.jpg`.
Preview them at `characters/real/?only=<Name>` (`&face`, `&walk`, `&walk=run`, `&sit`).

## Props (`js/props.js`)

```js
import { loadProp, mailbox, handbag, hat, picketFence, CATALOG } from "../../js/props.js";
const sofa = loadProp(short, "SheenWoodLeatherSofa", { width: 2.7 }); // or height / length / scale
const car = loadProp(short, "CarConcept", { length: 4.5, paint: 0x1f3550 }); // any paint colour
const box = mailbox(); box.setFlag(1); box.setDoor(0.5);
scene.add(sofa, car, box, handbag({ color: 0x7a3f2a }), hat("fedora"), picketFence(6));
```

Downloaded: `GlamVelvetSofa`, `SheenWoodLeatherSofa`, `SheenChair`, `ChairDamaskPurplegold`,
`SpecularSilkPouf`, `AnisotropyBarnLamp`, `GlassVaseFlowers`, `DiffuseTransmissionPlant`, `TrafficCone`
and `CarConcept` (realistic car, `paint` option) and `sedan`, `hatchback`, `suv`, `van`, `delivery-truck`, `taxi`, `police-car` (low-poly).
Code-built: `mailbox()`, `handbag()`, `hat("cap" | "fedora" | "uniform" | "beanie")`, `picketFence(len)`,
bathroom: `toilet()`, `vanity()` (sink + tap), `mirror()`, `bathtub()`, `towel()`, `handTowel()`, `bathMat()`,
`toiletPaper()`, `rubberDuck()`.
Preview: `characters/props/?group=furniture | cars | vehicles | small`.
Call `useEnvironment(renderer, scene)` once so metal, car paint and glass get reflections.

Motion capture for avatars: `person.loadClip("m_walk_neutral_01")` before `short.start()`, then
`person.play("m_walk_neutral_01", t)` + `person.update()` every frame. Included clips:
`m_walk_neutral_01, m_run_fast_01, m_idle_neutral_01, m_idle_look_around_01, m_knock_door, m_wave_01,
m_cell_phone_textmessage, f_cell_phone_textmessage, m_sit_chair_idle_neutral_01, f_sit_chair_idle_neutral_01`.
The Rocketbox library has 471 more (dancing, cheering, laughing, sitting down, door opening…).

Credits for CC-BY models: see `assets/CREDITS.md` (copy its block into video descriptions).

## Everyday cars (`js/vehicles.js`)

Generic, unbranded family & utility vehicles built in code with clear-coat paint, tinted glass,
alloy wheels and lights (call `useEnvironment()` once for reflections):

```js
import { car, CAR_TYPES } from "../../js/vehicles.js"; // hatchback, sedan, suv, minivan, pickup
const c = car("suv", { color: 0x23364f, rimColor: 0x9aa0a6, lightsOn: false });
c.position.set(4, 0, 14); c.rotation.y = Math.PI; scene.add(c);
c.spinWheels(distance); // when driving
```
Cars face +x. Preview: `characters/props/?group=family` (`&close` for a close-up).

## The dog (`js/dog.js`)

The studio's blocky fur-textured dog, shared by every short. Preview all poses at `characters/dog/`
(`?only=N` for one).

```js
import { createDog, DOG_COLORS } from "../../js/dog.js";
const dog = createDog();                                   // golden dog
const wolf = createDog({ colors: DOG_COLORS.wolf, key: "wolf", pointyEars: true, snout: 1.35, collar: false });
dog.pose({ t, sit: 1, cute: 1, wag: 1 });                  // call every frame
```

Pose options: `x y z ry`, `sit`, `lie`, `rear` (on hind legs), `trot`, `headYaw headPitch tilt`, `jawOpen`,
`wag`, `cute` (puppy eyes), `sad`, `angry`, `squint`, `closed` (eyelids), `snarl`, `earUp`, `earBack`,
`capeOn`, `glasses` (sunglasses: 0 = on the forehead, 1 = on the eyes), `earpiece`. Carry things with `dog.mouth.add(obj)`.

## Syncing to a voiceover (`js/voiceover.js`)

Export word-level subtitles from your editor (DaVinci Resolve / CapCut auto-captions, one word per cue)
as an `.srt`, drop it in the short's folder, and key every cut to the words:

```js
import { loadSrt, cues, wordCaptions } from "../../js/voiceover.js";
const words = await loadSrt("voiceover.srt");
const at = cues(words);
at("bathroom");      // start time of that word (s)
at("they", 3);       // its 3rd occurrence
const captions = wordCaptions(captionEl, words, { lines: ["When your dog", "insists on", …] });
onUpdate((t) => captions(t));   // each word pops in exactly when it is spoken
```

Re-record the voiceover, export a new `.srt`, and the whole edit re-times itself. Render with the
audio: `npm run render -- shorts/dog-bathroom --audio voiceover.wav`.
