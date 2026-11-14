# To a dog, humans are immortal giants — `shorts/dog-giants/` (work in progress)

Hero: a low-poly stylised **pug** (`js/pug.js`, same rig and `pose()` as `js/dog.js`; `heroDog(undefined, key, scale, { factory: createPug })`).
The Sketchfab pug the owner linked ("Low poly - Stylized dog - Pug" by Assemblr) is **not downloadable** (author disabled downloads,
Standard license), so the pug is an original model in the same spirit. If the owner gets a licensed `.glb`/`.fbx` of it, it can be swapped in.

## Status

| Done | Not done yet |
|---|---|
| Voiceover cut: 39.2 s → **31.2 s**, no gaps (`voiceover.wav`), Whisper transcript, forced alignment (`words.json`), 78 caption chunks (`voiceover.srt`) | `main.js` (the animation), shot sets, SFX cue sheet + `sfx/`, motion QA, upload kit |
| `js/pug.js` (+ `setGrey(k)`: the muzzle and brows fade to grey), `shorts/pug-test` preview page | Optional: Sketchfab props (see below) |

## Sketchfab assets (optional, CC BY 4.0, all low-poly; account `keatura`, 57 models, every one downloadable)

Downloading needs the owner's API token (Sketchfab → Settings → Password & API). The owner adds it in the environment's settings
(Network secrets, host `api.sketchfab.com`, header `Authorization`, value `Token <token>`). Then, per model:
`GET https://api.sketchfab.com/v3/models/<uid>/download` → JSON with a `gltf.url` (signed, valid a few minutes) → download the zip → load the glb with `js/props.js`/GLTFLoader.
Useful for this short: House `36897453331d49c39c1295cbdab9faf7`, Snowy Pine Tree `363fe3444a5c42dbac9c8fe62a682002`, Snowy Bush `Snowy Bush`,
Bed `7d84c81f23d8404ebe5b9aaf09cb2922`, Mailbox, Autumn Leaf, Acorn, Cumulus Cloud, Sun, Rubber Duck, Straw Hat, River Segment `6a516a5f23b1470499132138570d32f2`,
Mountain River Valley (list: `https://api.sketchfab.com/v3/models?user=keatura`). **Credit line for the description:** `3D models by keatura (sketchfab.com/keatura), CC BY 4.0.`
Without the token the short uses the toon houses/trees/rooms already in the repo (`js/toonworld.js`, `js/outside.js`, `shorts/dog-kibble/room.js`, `shorts/dog-sneeze/*`).

## Draft shot plan (cartoon world, 31.2 s, every cut on a clause start, a camera that never rests, no emoji, one-word captions)

| # | Time | Words | Picture |
|---|---|---|---|
| 1 | 0.00–2.35 | To a dog, humans aren't just caretakers | HOOK: the puppy pug sits tiny in the foreground and looks UP at a human who towers over him (the puppet is scaled ×3); camera at puppy height, slow push |
| 2 | 2.37–4.85 | We are mysterious, immortal giants | The giant strides past: his shoe and a long shadow cross the pug; the roof of the house barely reaches his knee |
| 3 | 4.88–6.27 | Think about life from their eyes | The pug's POV: the lens looks up past his own paws at the giant's face, high above |
| 4 | 6.30–10.35 | A puppy wakes up for the very first time and sees a human already fully grown | In a basket the puppy wakes, stretches, opens huge eyes; the giant's face leans in from above |
| 5 | 10.37–12.55 | Seasons pass, the snow falls and melts | The garden at the same angle: leaves, then snow, then melt (`outside.set` season); the pug is a young adult |
| 6 | 12.58–14.74 | Slowly, the dog's muzzle turns gray | Medium close shot of his face; `pug.setGrey` goes 0 → 1 |
| 7 | 14.76–17.22 | their legs grow stiff, and their energy begins to fade | The old pug walks stiff-legged, slower, then lies down on the porch; camera low tracking |
| 8 | 17.24–19.96 | Yet the human standing beside them never seems to age | Two-shot: the same human, never changing, beside the grey pug; the sky behind runs through day and night |
| 9 | 19.98–23.7 | To a creature whose entire lifetime fits inside a tiny fraction of ours | A long road of fence posts to the horizon: the pug's whole life is the first short golden stretch, the human's is the rest (diegetic, no text) |
| 10 | 23.74–24.84 | we appear to live forever | The giant in silhouette against the sunset, golden rings spreading on the ground |
| 11 | 24.84–27.18 | which is why they follow us through every single room | Quick cuts hallway → kitchen → bedroom: the old pug trots after the giant's legs |
| 12 | 27.18–29.25 | trying to soak up as much time as they can | The old pug leans against his shoe in a sunbeam, eyes closed |
| 13 | 29.25–31.18 | with the giant who never grows old | Back to frame 1 (the puppy looking up at the giant): the loop |

Credit/sounds: real recordings only (reuse the libraries of the earlier shorts: `shorts/dog-sneeze/sfx`, `tools/forge-sneeze-sfx.py`), −14 LUFS.
