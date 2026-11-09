import { createShort, THREE } from "../../js/engine.js";
import { outline, toonify, toon, toonGradient, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { buildOutside } from "../../js/outside.js";
import { buildRoom } from "./room.js";
import { buildWild } from "./wild.js";
import { buildSpace, buildCamp, buildLab, buildStage, buildBrainWorld, glassHead } from "./worlds.js";
import { createKit, createDissolve, makeDome, clamp01, lerp, ease, prog, V, bump, mixv, popK, canvasTex, glowTex } from "./kit.js";

// "Why your dog stares at you" (it is not a treat) — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// ~77 s, 39 shots in 9 different places, each one a slow eased camera move with a real cross-dissolve at the cut (the dramatic ones cut harder),
// no on-screen text (only icons and the word captions), vivid colour, a seamless loop (the last frame is the first frame).
// Every state is a pure function of time and shot, so any frame can be redrawn.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
// the .srt blocks as written (some hold two words, so the block numbers differ from the word list): wd(n) is the start of block n
const blocks = [...(await (await fetch("voiceover.srt")).text()).matchAll(/(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/g)].map((m) => ({ start: +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, end: +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000 }));
if (blocks.length !== 242) console.warn("voiceover.srt: expected 242 blocks, got", blocks.length);
const wd = (n) => blocks[n - 1].start;
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 0.1) * FPS) / FPS;    // no tail after the last word: the voice runs on into the first line

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 52, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.05; camera.far = 700; camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);
const kit = createKit({ scene, camera });
const { showIcon, showBubble, inFront, burst, travel, makeStream, runStream } = kit;

// ===================== the shots: 39 of them, each begins a hair before the first word of its idea =====================
//  k   words (block numbers of the .srt)                      place
const SHOTS = [
  [0, "room", "day"],              //  1 Your dog isn't actually staring at you  — the hook: his eyes on the lens
  [wd(8) - 0.1, "room", "day"],    //  2 because they want a treat.              — pulls back, a treat crossed out
  [wd(11) - 0.07, "room", "day"],  //  3 When you're sitting on the couch
  [wd(15) - 0.12, "room", "day"],  //  4 and look up to find your dog across the room,
  [wd(22) - 0.1, "room", "day"],   //  5 locking eyes with you
  [wd(26) - 0.05, "room", "day"],  //  6 with that soft, unblinking gaze,
  [wd(31) - 0.12, "room", "dream"],//  7 you probably think they want dinner,
  [wd(35) - 0.05, "room", "dream"],//  8 need a walk,
  [wd(37) - 0.05, "room", "dream"],//  9 or are waiting for instructions.
  [wd(42) - 0.05, "room", "day"],  // 10 You see, they aren't asking for anything.
  [wd(47) - 0.05, "room", "warm"], // 11 They're giving you a hug without using their paws.
  [wd(54) - 0.05, "wild", "wild"], // 12 In the animal kingdom,
  [wd(57) - 0.05, "wild", "war"],  // 13 eye contact is deadly.
  [wd(61) - 0.05, "wild", "dusk"], // 14 For wolves, looking another creature directly in the eyes
  [wd(67) - 0.05, "wild", "war"],  // 15 is a declaration of war,
  [wd(71) - 0.05, "wild", "dusk"], // 16 a challenge for dominance
  [wd(74) - 0.05, "wild", "night"],// 17 or the final signal before an ambush.
  [wd(80) - 0.05, "wild", "wild"], // 18 Wild animals actively look away to survive.
  [wd(87) - 0.05, "space", "space"],// 19 Dogs are the only species on Earth
  [wd(93) - 0.05, "space", "space"],// 20 that rewrote their own biology
  [wd(98) - 0.05, "stage", "stage"],// 21 to do the exact opposite.
  [wd(103) - 0.05, "camp", "camp"],// 22 Over thousands of years beside our campfires,
  [wd(109) - 0.05, "stage", "stage"],// 23 dogs evolved a specialized muscle
  [wd(113) - 0.05, "stage", "stage"],// 24 above their eyes that wild wolves don't even have,
  [wd(122) - 0.05, "stage", "stage"],// 25 developed solely to mimic human expressions
  [wd(128) - 0.05, "stage", "stage"],// 26 and draw your gaze into theirs.
  [wd(134) - 0.05, "lab", "lab"],  // 27 When scientists tracked canine brain chemistry,
  [wd(140) - 0.05, "lab", "lab"],  // 28 they discovered that when a dog looks into their human's eyes,
  [wd(150) - 0.05, "brain", "brain"],// 29 both of your brains release an identical flood
  [wd(156) - 0.05, "brain", "brain"],// 30 of oxytocin, the exact neurological cascade
  [wd(161) - 0.05, "stage", "warmstage"],// 31 that bonds a mother to her newborn child.
  [wd(168) - 0.0, "brain", "brain"],// 32 A dog ... shares that biological loop with us.
  [wd(178) - 0.05, "room", "day"], // 33 To your dog, making eye contact isn't looking.
  [wd(185) - 0.05, "room", "warm"],// 34 It's the sensory equivalent of reaching out and wrapping their body around your heart.
  [wd(199) - 0.05, "room", "rain"],// 35 They know they don't have words to comfort you,
  [wd(208) - 0.05, "room", "rain"],// 36 and they don't have arms to hold you when life gets heavy.
  [wd(219) - 0.05, "room", "rain"],// 37 So instead, they sit in the quiet,
  [wd(223) - 0.05, "room", "sunrise"],// 38 catch your eye, and use the only bridge evolution gave them
  [wd(233) - 0.05, "room", "sunrise"],// 39 to tell you that you are loved and you are never alone.
  [wd(241) - 0.12, "room", "day"], // 40 never alone. — back to the opening frame (the loop)
];
const NSHOT = SHOTS.length;
const STARTS = SHOTS.map((s) => s[0]);
const shotOf = (t) => { let k = 1; for (let i = 1; i < NSHOT; i++) if (t >= STARTS[i]) k = i + 1; return k; };
const T0 = (k) => STARTS[k - 1];
const T1 = (k) => (k < NSHOT ? STARTS[k] : DURATION);
const U = (t, k) => Math.max(0, t - T0(k));
const SL = (k) => T1(k) - T0(k);
// the half-length of the dissolve into shot i+1: most cuts melt (0.4 s); the dramatic ones are nearly hard
const HARD = new Set([13, 15, 17, 18, 23, 35]);
const half = (i) => (HARD.has(i + 1) ? 0.07 : 0.2);

// ===================== places =====================
const places = {};
const room = buildRoom(); places.room = room.group; scene.add(room.group);
const outside = buildOutside(); scene.add(outside.group, outside.sky);
scene.fog = new THREE.Fog(0xe9f8ff, 45, 260);
const house = room.house;
const WILD0 = V(2000, 0, 0);          // the clearing lives far from the flat
const wild = buildWild(); wild.group.position.copy(WILD0); scene.add(wild.group); places.wild = wild.group;
const wl = (x, y, z) => V(WILD0.x + x, y, WILD0.z + z);
const SPACE0 = V(3000, 0, 0), CAMP0 = V(4000, 0, 0), LAB0 = V(5000, 0, 0), STAGE0 = V(6000, 0, 0), BRAIN0 = V(7000, 0, 0);
const space = buildSpace(); space.group.position.copy(SPACE0); scene.add(space.group); places.space = space.group;
const camp = buildCamp(); camp.group.position.copy(CAMP0); scene.add(camp.group); places.camp = camp.group;
const lab = buildLab(); lab.group.position.copy(LAB0); scene.add(lab.group); places.lab = lab.group;
const stage = buildStage(); stage.group.position.copy(STAGE0); scene.add(stage.group); places.stage = stage.group;
const bw = buildBrainWorld(); bw.group.position.copy(BRAIN0); scene.add(bw.group); places.brain = bw.group;
const ghDog = glassHead({ tint: 0xffa53a, ear: 0xc26a1e }), ghMan = glassHead({ tint: 0xf4c9a0, ear: 0xe0a880, human: true });
ghDog.head.position.set(BRAIN0.x - 0.8, BRAIN0.y, BRAIN0.z); ghMan.head.position.set(BRAIN0.x + 0.8, BRAIN0.y, BRAIN0.z); ghMan.head.rotation.y = Math.PI;
scene.add(ghDog.head, ghMan.head);
const ORG = { room: V(0, 0, 0), wild: WILD0, space: SPACE0, camp: CAMP0, lab: LAB0, stage: STAGE0, brain: BRAIN0 };
const P = (place, x, y, z) => V(ORG[place].x + x, ORG[place].y + y, ORG[place].z + z);

// ===================== cast =====================
const DOGS = 0.8;
function toonDog(colors, key, scale, extra = {}) {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d); d.visible = false;
  for (const e of d.eyes) e.userData.p0 = { pupil: e.pupil.position.clone(), iris: e.iris.position.clone() };
  return d;
}
// where the eyes look: lx, ly in -1..1 (the pupil slides inside the eye)
function dogLook(d, lx = 0, ly = 0) {
  for (const e of d.eyes) { const p0 = e.userData.p0; e.pupil.position.set(p0.pupil.x + lx * 0.016, p0.pupil.y + ly * 0.014, p0.pupil.z); e.iris.position.set(p0.iris.x + lx * 0.014, p0.iris.y + ly * 0.012, p0.iris.z); }
}
const dog = toonDog(DOG_COLORS.golden, "g", DOGS);
const wolfOpts = { pointyEars: true, glowEyes: true };
const wolfA = toonDog(DOG_COLORS.wolf, "wa", 0.95, wolfOpts), wolfB = toonDog(DOG_COLORS.wolf, "wb", 0.85, wolfOpts), shade = toonDog(DOG_COLORS.shadow, "sh", 0.9, wolfOpts);
const person = (o) => { const p = createPuppet(o); p.visible = false; scene.add(p); return p; };
const cave1 = person({ skin: "#e0b08a", hair: "#3a2a1a", hairStyle: "long", beard: true, shirt: "#8a5a3a", pants: "#6a4a2a", shoes: "#5a3a22", seed: 2 });
const cave2 = person({ skin: "#e8bc96", hair: "#4a2a14", hairStyle: "long", shirt: "#b07a40", pants: "#7a5a32", shoes: "#5a3a22", seed: 6 });
const sci1 = person({ skin: "#f1c7a0", hair: "#2a2a2a", hairStyle: "short", shirt: "#ffffff", outfit: "labcoat", glasses: true, pants: "#3a4a6a", shoes: "#ffffff", seed: 3 });
const sci2 = person({ skin: "#c98a60", hair: "#1a1a1a", hairStyle: "bun", shirt: "#ffffff", outfit: "labcoat", pants: "#3a4a6a", shoes: "#ffffff", seed: 7 });
const mom = person({ skin: "#f2c29b", hair: "#5a3a22", hairStyle: "long", shirt: "#ff8aa8", pants: "#6a5a9a", shoes: "#f3efe6", seed: 4 });
const baby = person({ skin: "#f8d2b0", hair: "#c8905a", hairStyle: "bald", shirt: "#ffffff", pants: "#ffffff", shoes: "#ffffff", height: 0.5, seed: 5 });
const crowd = { cave1, cave2, sci1, sci2, mom, baby };
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
scene.add(owner);

// ---------- small props and effects ----------
const BOWL = V(1.3, 0, 3.8);
const bowl = (() => {
  const g = new THREE.Group(), red = toon(0xff4a5a), kib = toon(0x9a5a2a);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.13, 24), red); b.position.y = 0.065; g.add(b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), toon(0xffffff)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.13; g.add(rim);
  for (let i = 0; i < 26; i++) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), kib); const a = i * 2.4, r = 0.15 * Math.sqrt(((i * 37) % 26) / 26); k.position.set(Math.cos(a) * r, 0.15 + 0.03 * ((i * 7) % 3), Math.sin(a) * r); k.scale.y = 0.7; g.add(k); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.008, min: 0.01 });
  g.position.copy(BOWL); g.visible = false; scene.add(g); return g;
})();
const ringTex = canvasTex(256, 256, (x) => { x.strokeStyle = "rgba(255,255,255,0.95)"; x.lineWidth = 12; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.stroke(); }, { repeat: false });
const rings = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.visible = false; sp.renderOrder = 7; sp.userData.ink = false; scene.add(sp); return sp; });
// soft rings spreading from a point toward the lens: attention pulses
function pulseRings(t, p, { period = 1.2, size = 0.45, color = 0xffe9a0, on = 1, toward = 0.25 } = {}) {
  rings.forEach((r, i) => {
    const f = ((t / period) + i / rings.length) % 1;
    r.visible = on > 0.01; r.position.copy(p).lerp(camera.position, toward * f); r.scale.setScalar(size * (0.35 + 1.4 * f)); r.material.color.set(color); r.material.opacity = on * 0.8 * (1 - f) * (1 - f);
  });
}
const hideRings = () => rings.forEach((r) => (r.visible = false));
const goldBeam = makeStream(160, 0xffd24a, 0.07), pinkBeam = makeStream(160, 0xff7ab8, 0.07);
const rainDrops = makeStream(220, 0xcfe0ff, 0.045, { additive: false }), bridge = makeStream(260, 0xffd24a, 0.06);
const heart3d = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0.15); sh.bezierCurveTo(0, 0.3, -0.25, 0.4, -0.35, 0.2); sh.bezierCurveTo(-0.45, -0.05, -0.15, -0.25, 0, -0.4); sh.bezierCurveTo(0.15, -0.25, 0.45, -0.05, 0.35, 0.2); sh.bezierCurveTo(0.25, 0.4, 0, 0.3, 0, 0.15);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2, curveSegments: 18 }), toon(0xff4a7a));
  m.geometry.center(); m.castShadow = true; outline(m, { width: 0.012, min: 0.02 }); m.visible = false; scene.add(m); return m;
})();
const dogHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd24a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); dogHalo.scale.set(2.2, 2.2, 1); dogHalo.visible = false; dogHalo.userData.ink = false; scene.add(dogHalo);
const eyeMid = (d) => d.eyes[0].getWorldPosition(V(0, 0, 0)).lerp(d.eyes[1].getWorldPosition(V(0, 0, 0)), 0.5);
const hue = (h) => new THREE.Color().setHSL(h % 1, 0.9, 0.62);

// ===================== light and mood =====================
const MOODS = {
  day: { hemi: [0xfff6e4, 0xe0c9a0, 2.3], key: [0xfff0d2, 1.5], bg: "#bfe6ff" },
  dream: { hemi: [0xffe6f4, 0xe8c0d8, 2.4], key: [0xffe0f0, 1.3], bg: "#ffd6ec" },
  warm: { hemi: [0xfff0d8, 0xe8b890, 2.3], key: [0xffd8a0, 1.45], bg: "#ffe0b0" },
  rain: { hemi: [0x9fb0d8, 0x7c88b0, 1.7], key: [0xaab8e0, 0.7], bg: "#8896b8" },
  sunrise: { hemi: [0xfff0d0, 0xf0c090, 2.3], key: [0xffc880, 1.5], bg: "#ffd8a0" },
  wild: { hemi: [0xfff6e4, 0xd8cfa0, 2.2], key: [0xfff0d2, 1.5], bg: "#bfe6ff" },
  dusk: { hemi: [0xb9a8ff, 0x6a5a78, 1.8], key: [0xffb57a, 1.3], bg: "#7b58a6" },
  war: { hemi: [0xff8a7a, 0x6a2a2a, 1.7], key: [0xff6a4a, 1.3], bg: "#4a1a1a" },
  night: { hemi: [0x7388ff, 0x40306a, 2.0], key: [0xb8d0ff, 1.5], bg: "#0b0f3a" },
  space: { hemi: [0xc8d0ff, 0x6a5aa0, 2.1], key: [0xffffff, 1.3], bg: "#14104a" },
  stage: { hemi: [0xffffff, 0xd8d0e8, 2.3], key: [0xffffff, 1.4], bg: "#3a2a8a" },
  warmstage: { hemi: [0xfff0e8, 0xf0c8c0, 2.3], key: [0xffe8d0, 1.3], bg: "#ffc8d0" },
  camp: { hemi: [0x6a78d8, 0x40306a, 1.5], key: [0xffa860, 1.0], bg: "#0b0f3a" },
  lab: { hemi: [0xf0fbff, 0xc8d8e8, 2.3], key: [0xffffff, 1.3], bg: "#d8ecf8" },
  brain: { hemi: [0xffffff, 0xe8d0f0, 2.1], key: [0xffffff, 1.2], bg: "#8a3fc4" },
};
const hemi = new THREE.HemisphereLight(0xfff6e4, 0xe0c9a0, 2.3);
const key = new THREE.DirectionalLight(0xfff0d2, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 40 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
scene.add(hemi, key, key.target);

// ===================== the story: where everyone is, shot by shot (pure functions of time and shot) =====================
const D1 = V(-0.8, 0, 1.2);          // where he sits in the quiet, sad shots (nearer you)
const D0 = V(-0.2, 0, 1.1);         // where the dog sits, across the room from the couch (he faces the couch: -x)
const DE = V(D0.x - 0.33, 0.89, D0.z);   // his eyes (measured)
const OE = V(-2.54, 1.22, 1.0);          // your eyes on the couch
const OWN = V(-2.55, 0, 1.0);       // where you sit on the couch
const dogSit = (t, o = {}) => ({ t, sit: 1, wag: 0, headPitch: 0, headYaw: 0, headTilt: 0.1, ears: 0.15, sad: 0.2, cute: 1, closed: 0, ...o });
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const lookAtDog = [0.9, -0.15], lookAtLens = [0, 0];

function dogState(t, k) {
  const u = U(t, k), L = SL(k), face = { ry: -Math.PI / 2 };
  switch (k) {
    case 1: return { x: D0.x, z: D0.z, ...face, look: [0, 0], pose: dogSit(t, { headTilt: 0.12, ears: 0.1 }) };
    case 2: return { x: D0.x, z: D0.z, ...face, look: [0, 0], pose: dogSit(t, { headTilt: 0.14 - 0.1 * prog(u, 0.3, 1.0), ears: 0.2 }) };
    case 3: return { x: D0.x, z: D0.z, ...face, look: [-0.5, 0], pose: dogSit(t, { headTilt: 0.1 }) };
    case 4: return { x: D0.x, z: D0.z, ...face, look: [-0.5, 0], pose: dogSit(t, { headTilt: 0.1 }) };
    case 5: return { x: D0.x, z: D0.z, ...face, look: [-0.2, 0.05], pose: dogSit(t, { headTilt: 0.06 }) };
    case 6: return { x: D0.x, z: D0.z, ...face, look: [-0.1, 0.1], pose: dogSit(t, { headTilt: 0.04, ears: 0.1, sad: 0.35 }) };
    case 7: return { x: BOWL.x, z: BOWL.z - 0.7, ry: 0, look: [0, -0.5], pose: dogSit(t, { headTilt: 0.05, headPitch: 0.12, ears: 0.4, wag: 0.9, wagSpeed: 11, jawOpen: 0.25 + 0.2 * Math.sin(t * 9), sad: 0 }) };
    case 8: return { x: 0.8 + 0.12 * Math.sin(u * 3.0), z: lerp(7.3, 9.6, ease.inOut(prog(u, 0.0, 1.0))), ry: 0.0, look: [0, 0], pose: { t, walk: 1, headPitch: 0.05, ears: 0.4, cute: 1, wag: 0.9, wagSpeed: 10, sad: 0, closed: 0, jawOpen: 0.3 } };
    case 9: return { x: D0.x, z: D0.z, ...face, look: [-0.4, 0], pose: dogSit(t, { headTilt: 0.05, ears: 0.6, headPitch: -0.08, sad: 0, wag: 0 }) };
    case 10: return { x: D0.x, z: D0.z, ...face, look: [-0.4, 0], pose: dogSit(t, { headTilt: 0.12, ears: 0.1, sad: 0.2 }) };
    case 11: return { x: D0.x, z: D0.z, ...face, look: [-0.4, 0], pose: dogSit(t, { headTilt: 0.1, ears: 0.15, sad: 0.35 }) };
    case 19: return { x: 0, z: 0, y: 0.84, ry: 0, scale: 0.15, look: [0, 0], pose: dogSit(t, { headTilt: 0.08, wag: 0.8, wagSpeed: 9, ears: 0.3, sad: 0 }) };
    case 21: return { x: 0.55, z: 0, ry: -0.3, look: [0, 0], pose: dogSit(t, { headTilt: 0.1, ears: 0.2, sad: 0.2 }) };
    case 22: return u > 0.5 * L ? { x: -0.9, z: 1.5, ry: 0.9, scale: DOGS * ease.out(prog(u, 0.55 * L, 0.7 * L)), look: [0, 0], pose: dogSit(t, { headTilt: 0.1, ears: 0.3, wag: 0.9, wagSpeed: 8, sad: 0.1 }) } : null;
    case 23: return { x: 0, z: 0, ry: 0, look: [0, 0], pose: dogSit(t, { headTilt: 0.05, ears: 0.2, sad: 0.15 + 0.75 * ease.inOut(prog(u, 0.55, 1.4)) }) };
    case 24: return { x: 0.5, z: 0, ry: 0, look: [0, 0], pose: dogSit(t, { headTilt: 0.05, ears: 0.2, sad: 0.9 }) };
    case 25: { const m = mimic(u - 0.28); return { x: 0.7, z: 0.2, ry: -1.25, look: [-0.6, 0], pose: dogSit(t, { headTilt: 0.08, ears: lerp(0.15, 0.7, m.surprise) - 0.2 * m.sad, sad: 0.1 + 0.9 * m.sad, jawOpen: 0.3 * m.surprise + 0.25 * m.happy, wag: 0.9 * m.happy, wagSpeed: 10 }) }; }
    case 26: return { x: 0, z: 0, ry: 0, look: [0, 0], pose: dogSit(t, { headTilt: 0.05, ears: 0.25, sad: 0.6 }) };
    case 27: case 28: return { x: 0.35, y: 0.61, z: 0.9, ry: -Math.PI / 2, look: [-0.5, 0], pose: dogSit(t, { headTilt: 0.06, ears: 0.2, sad: 0.3 }) };
    case 33: return { x: D0.x, z: D0.z, ...face, look: [-0.3, 0], pose: dogSit(t, { headTilt: 0.08, sad: 0.3 }) };
    case 34: return { x: D1.x, z: D1.z, ...face, look: [-0.5, 0.05], pose: dogSit(t, { headTilt: 0.1, ears: 0.35, sad: 0.4, paw: 0.6 * ease.inOut(prog(u, 0.6, 1.6)) }) };
    case 35: return { x: D1.x, z: D1.z, ...face, look: [-0.6, 0.05], pose: dogSit(t, { headTilt: 0.14, headPitch: 0.1, ears: -0.4, sad: 0.9 }) };
    case 36: return { x: D1.x, z: D1.z, ...face, look: [-0.6, 0.1], pose: dogSit(t, { headTilt: 0.14, headPitch: 0.05, ears: -0.3, sad: 0.9, beg: 0.7 * bump(prog(u, 0.5, 1.9)) }) };
    case 37: { const w = ease.inOut(prog(u, 0.0, 1.0)), sitting = prog(u, 0.95, 1.2); return { x: lerp(D1.x, -1.7, w), z: lerp(D1.z, 1.35, w), ...face, look: [-0.5, 0.3 * sitting], pose: sitting > 0.5 ? dogSit(t, { headTilt: 0.12, headPitch: -0.25 * sitting, ears: 0.2, sad: 0.5 }) : { t, walk: 1, cute: 1, ears: 0.1, sad: 0.5, headPitch: 0.05, closed: 0, wag: 0 } }; }
    case 38: return { x: -1.7, z: 1.35, ...face, look: [-0.4, 0.7], pose: dogSit(t, { headTilt: 0.1, headPitch: -0.35, ears: 0.3, sad: 0.4 }) };
    case 39: return { x: -1.7, z: 1.35, ...face, look: [-0.4, 0.7], pose: dogSit(t, { headTilt: 0.1, headPitch: -0.3, ears: 0.6, sad: 0.2, wag: 0.9 * prog(u, 0.6, 1.2), wagSpeed: 10, jawOpen: 0.2 * prog(u, 0.8, 1.4) }) };
    case 40: return { x: D0.x, z: D0.z, ...face, look: [0, 0], pose: dogSit(t, { headTilt: 0.12, ears: 0.1 }) };
    default: return null;
  }
}
// the three faces you make, one after the other (smooth weights): sad, surprised, happy
function mimic(u) { const w = (a, b) => Math.sin(Math.PI * clamp01((u - a) / (b - a))); return { sad: w(0.1, 0.85), surprise: w(0.85, 1.6), happy: w(1.6, 2.4) }; }
function ownerState(t, k) {
  const u = U(t, k);
  const seat = { x: OWN.x, z: OWN.z, sit: 1, seat: 0.52, cute: 0.3 };
  switch (k) {
    case 3: return { t, ...seat, eyes: { open: 0.9 }, mouth: { open: 0, smile: 0.5 }, brow: {}, look: [0, -0.2], head: { tilt: 0.05 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
    case 4: { const up = ease.inOut(prog(u, 0.25, 0.7)); return { t, ...seat, eyes: { open: 1, size: 1 + 0.2 * up }, mouth: { open: 0.15 * up, smile: 0.2 }, brow: { raise: 0.5 * up }, look: [lerp(0, 0.9, up), lerp(-0.3, 0.0, up)], head: { tilt: 0.05 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } }; }
    case 5: return { t, ...seat, eyes: { open: 1.1, size: 1.2 }, mouth: { open: 0.1, smile: 0.3 }, brow: { raise: 0.4 }, look: lookAtDog, head: { tilt: 0.04 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
    case 6: return { t, ...seat, eyes: { open: 1.1, size: 1.2 }, mouth: { open: 0, smile: 0.5 }, brow: { raise: 0.2 }, look: lookAtDog, head: { tilt: 0.06 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
    case 7: case 8: case 9: return { t, ...seat, eyes: { open: 1 }, mouth: { open: 0, smile: 0.3 }, brow: { worry: 0.1 }, look: lookAtDog, head: { tilt: 0.1 * Math.sin(u * 2) }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.18, 0.95], bend: 1 } };
    case 10: case 11: return { t, ...seat, eyes: { open: 1 }, mouth: { open: 0, smile: 0.6 }, brow: {}, look: lookAtDog, head: { tilt: 0.06 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
    case 34: return { t, ...seat, eyes: { open: 1.1, size: 1.15 }, mouth: { open: 0, smile: 0.6 }, brow: { raise: 0.25 }, look: lookAtDog, head: { tilt: 0.06 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
    case 35: case 36: { const sad = 1; return { t, ...seat, lean: 0.12, eyes: { open: 0.55 }, mouth: { open: 0, smile: -0.9 }, brow: { worry: sad }, look: [0.25, -0.9], head: { tilt: 0.22 }, tear: 1, armL: { to: [-0.2, 0.6], bend: -1 }, armR: { to: [0.18, 0.6], bend: 1 } }; }
    case 37: { const calm = prog(u, 0.2, 1.4); return { t, ...seat, lean: 0.1 * (1 - calm), eyes: { open: lerp(0.55, 0.8, calm) }, mouth: { open: 0, smile: lerp(-0.8, -0.1, calm) }, brow: { worry: lerp(1, 0.5, calm) }, look: [0.4, -0.8 + 0.3 * calm], head: { tilt: 0.15 }, tear: 1 - 0.5 * calm, armL: { to: [-0.2, 0.6], bend: -1 }, armR: { to: [0.18, 0.6], bend: 1 } }; }
    case 38: { const up = prog(u, 0.2, 0.9); return { t, ...seat, eyes: { open: 1.1, size: 1.2 }, mouth: { open: 0, smile: lerp(-0.1, 0.7, up) }, brow: { raise: 0.3 * up, worry: 0.3 * (1 - up) }, look: [0.55, -0.35], head: { tilt: 0.08 }, tear: 0.4 * (1 - up), armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } }; }
    case 39: { const hug = ease.inOut(prog(u, 0.3, 1.0)); return { t, ...seat, lean: 0.14 * hug, eyes: { open: 1, happy: 0.6 * hug }, mouth: { open: 0.3 * hug, smile: 1, teeth: true }, brow: { raise: 0.3 }, look: [0.55, -0.4], head: { tilt: 0.08 }, tear: 0, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [lerp(0.2, 0.5, hug), lerp(0.62, 0.35, hug)], bend: 1 } }; }
    case 25: { const m = mimic(u); return { t, x: -0.6, z: 0, cute: 0.5, eyes: { open: 1, size: 1 + 0.5 * m.surprise, happy: 0.7 * m.happy }, mouth: { open: 0.9 * m.surprise + 0.3 * m.happy, smile: 0.4 - 1.0 * m.sad + 0.8 * m.happy, teeth: m.happy > 0.5 }, brow: { worry: m.sad, raise: 0.9 * m.surprise + 0.3 * m.happy }, look: [0.7, -0.05], head: { tilt: 0.12 * m.sad } }; }
    case 26: return { t, x: -0.85, z: 0.9, cute: 0.5, eyes: { open: 1.1, size: 1.2 }, mouth: { open: 0, smile: 0.3 }, brow: { raise: 0.3 }, look: [0.5, 0], head: { tilt: 0.05 } };
    case 28: return { t, x: -0.75, z: 0.9, sit: 1, seat: 0.45, cute: 0.4, eyes: { open: 1.1, size: 1.2 }, mouth: { open: 0, smile: 0.4 }, brow: { raise: 0.3 }, look: [0.9, -0.1], head: { tilt: 0.05 }, armL: { to: [-0.2, 0.5], bend: -1 }, armR: { to: [0.2, 0.5], bend: 1 } };
    default: return null;
  }
}

// the other people: cavemen at the fire, scientists, a mother and her newborn (local coordinates of their place)
function crowdState(t, k) {
  const u = U(t, k);
  switch (k) {
    case 22: return { cave1: { t, x: -1.15, z: 0.4, sit: 1, seat: 0.32, cute: 0.3, look: [0.8, -0.2], mouth: { smile: 0.5 }, armL: { to: [-0.1, 0.45], bend: -1 }, armR: { to: [0.25, 0.55], bend: 1 } }, cave2: { t, x: 1.15, z: 0.5, sit: 1, seat: 0.32, cute: 0.3, look: [-0.8, -0.2], mouth: { smile: 0.6 }, armL: { to: [-0.25, 0.55], bend: -1 }, armR: { to: [0.1, 0.45], bend: 1 } } };
    case 27: return { sci1: { t, x: -1.0, z: -1.7, look: [0.3, 0.1], mouth: { smile: 0.2 }, armR: { to: [0.28, 0.98 + 0.03 * Math.sin(t * 12)], bend: 1 }, armL: { to: [-0.2, 0.9], bend: -1 } }, sci2: { t, x: 1.4, z: -1.5, look: [-0.4, 0.05], mouth: { smile: 0.3 }, armL: { to: [-0.15, 1.1], bend: -1 }, armR: { to: [0.1, 1.0], bend: 1 } } };
    case 28: return { sci1: { t, x: -1.9, z: -1.7, look: [0.5, 0.0], mouth: { smile: 0.2 } }, sci2: { t, x: 1.9, z: -1.5, look: [-0.5, 0.0], mouth: { smile: 0.3 } } };
    case 31: return { mom: { t, x: 0, z: 0, cute: 0.4, look: [0, -0.55], eyes: { open: 0.9, happy: 0.35 }, mouth: { smile: 0.9 }, head: { tilt: 0.12 }, armL: { to: [-0.12, 1.03], bend: -1 }, armR: { to: [0.16, 1.0], bend: 1 } }, baby: { t, x: 0.02, y: 0.9, z: 0.12, sit: 1, seat: 0.2, cute: 1, look: [0, 0.7], eyes: { open: 1.1, size: 1.4 }, mouth: { smile: 0.8 }, armL: { to: [-0.1, 0.5], bend: -1 }, armR: { to: [0.1, 0.5], bend: 1 } } };
    default: return null;
  }
}

// ===================== cameras (each a slow, eased move) =====================
const HOOK = { pos: V(-1.75, 0.95, 1.1), look: V(DE.x, 0.86, 1.1), fov: 40 };
const bez = (a, b, c, f) => a.clone().multiplyScalar((1 - f) * (1 - f)).addScaledVector(b, 2 * (1 - f) * f).addScaledVector(c, f * f);
function cameraAt(t, k) {
  const u = U(t, k), L = SL(k), s = clamp01(u / L), e = ease.glide(s);
  switch (k) {
    case 1: return { pos: V(lerp(-1.4, -1.75, e), lerp(0.95, 0.95, e), 1.1), look: V(DE.x, lerp(0.88, 0.86, e), 1.1), fov: lerp(36, 40, e) };
    case 2: return { pos: mixv(V(-1.75, 0.95, 1.1), V(-2.0, 1.12, 2.3), e), look: mixv(V(DE.x, 0.86, 1.1), V(-0.25, 0.7, 1.1), e), fov: lerp(40, 48, e) };
    case 3: return { pos: V(lerp(-0.5, -1.0, e), 1.18, lerp(0.3, 0.6, e)), look: V(-2.55, 1.12, 1.0), fov: 44 };
    case 4: { const p = ease.inOut(prog(u, 0.35, 0.95)); return { pos: V(lerp(-0.9, -0.5, e), 1.18, lerp(2.6, 2.9, e)), look: mixv(V(-2.55, 1.15, 1.0), V(DE.x + 0.1, 0.85, 1.1), p), fov: 50 }; }
    case 5: { const p = ease.inOut(prog(u, 0.0, 1.0)); return { pos: bez(V(-1.8, 1.22, 1.0), V(-1.3, 1.05, 4.7), V(-1.75, 0.95, 1.1), p), look: bez(V(-2.55, 1.22, 1.0), V(-1.3, 1.0, 1.05), V(DE.x, 0.88, 1.1), p), fov: lerp(34, 38, p) + 34 * bump(p) }; }
    case 6: return { pos: V(lerp(-1.25, -1.05, e), 0.92, 1.1), look: V(DE.x, 0.88, 1.1), fov: 30 };
    case 7: return { pos: V(lerp(0.0, 0.4, e), lerp(0.85, 0.75, e), lerp(4.85, 4.7, e)), look: V(1.3, 0.5, 3.3), fov: 46 };
    case 8: return { pos: V(lerp(0.2, 0.5, e), 0.8, 11.2), look: V(0.8, 0.5, lerp(8.4, 8.0, e)), fov: 46 };
    case 9: return { pos: V(lerp(-2.0, -1.7, e), 1.0, lerp(3.0, 2.8, e)), look: V(-0.2, 0.7, 1.1), fov: 50 };
    case 10: return { pos: V(lerp(-2.0, -1.7, e), lerp(1.0, 1.1, e), lerp(3.0, 3.3, e)), look: V(-0.4, 0.8, 1.1), fov: 52 };
    case 11: return { pos: V(lerp(-0.9, -1.4, e), 1.2, 4.85), look: V(-1.35, 0.95, 1.05), fov: 72 };
    case 12: return { pos: wl(lerp(0.0, 0.15, e), lerp(0.8, 0.95, e), lerp(5.5, 2.6, e)), look: wl(0, 0.85, -5), fov: 54 };
    case 13: return { pos: wl(lerp(0.9, 0.5, e), 0.98, 0.1), look: wl(-1.42, 0.9, 0), fov: lerp(36, 30, e) };
    case 14: { const a = lerp(-1.2, -0.25, e), r = lerp(3.5, 2.3, e); return { pos: wl(Math.sin(a) * r, lerp(0.7, 0.85, e), Math.cos(a) * r), look: wl(0, 0.75, 0), fov: 48 }; }
    case 15: { const sh = 0.05 * Math.sin(u * 70) * ease.in(prog(u, 0.55, 0.8)) * (1 - prog(u, 0.9, 1.5)); return { pos: wl(sh, 0.9 + sh, 3.2), look: wl(0, 0.7, 0), fov: 46 }; }
    case 16: return { pos: wl(lerp(0.3, -0.4, e), lerp(0.4, 0.55, e), lerp(2.8, 2.3, e)), look: wl(lerp(-0.4, -0.8, e), 0.95, 0), fov: 56 };
    case 17: { const p = ease.inOut(prog(u, 0.55, 1.1)); return { pos: wl(lerp(-4.2, -2.2, e), lerp(0.45, 0.35, e), lerp(4.4, 3.6, e)), look: mixv(wl(-1.8, 0.95, 0), wl(3.2, 0.62, 2.2), p), fov: lerp(46, 30, p) }; }
    case 18: { const e2 = ease.glide(s); return { pos: wl(lerp(-3.6, -2.6, e2), lerp(0.9, 0.8, e2), lerp(2.4, 2.0, e2)), look: wl(lerp(1.4, 1.2, e2), 0.65, 0), fov: lerp(50, 40, e2) }; }
    case 19: return { pos: P("space", lerp(0.7, -0.3, e), lerp(1.2, 0.8, e), lerp(4.8, 4.2, e)), look: P("space", 0, 0.45, 0), fov: 46 };
    case 20: return { pos: P("space", lerp(1.0, -0.4, e), lerp(-0.8, 0.8, e), 4.3), look: P("space", 0, 0, 0), fov: 48 };
    case 21: return { pos: P("stage", 0, 1.0, lerp(3.6, 3.1, e)), look: P("stage", 0, 0.7, 0), fov: 46 };
    case 22: { const a = lerp(0.5, -0.7, e), r = lerp(4.2, 3.4, e); return { pos: P("camp", Math.sin(a) * r, lerp(1.1, 0.9, e), Math.cos(a) * r), look: P("camp", 0, 0.8, 0.5), fov: 62 }; }
    case 23: return { pos: P("stage", lerp(0.25, 0, e), lerp(0.97, 0.92, e), lerp(1.7, 1.4, e)), look: P("stage", 0, 0.9, 0), fov: 28 };
    case 24: return { pos: P("stage", lerp(0.15, 0, e), 0.95, lerp(3.4, 3.1, e)), look: P("stage", 0, 0.85, 0), fov: 38 };
    case 25: return { pos: P("stage", lerp(0.2, 0, e), 1.1, lerp(4.5, 4.1, e)), look: P("stage", 0.05, 0.95, 0.1), fov: 46 };
    case 26: return { pos: P("stage", 0, 0.92, lerp(1.55, 1.2, e)), look: P("stage", 0, 0.9, 0), fov: 28 };
    case 27: return { pos: P("lab", lerp(-0.5, 0.6, e), lerp(1.45, 1.3, e), lerp(4.0, 3.4, e)), look: P("lab", lerp(-0.1, 0.2, e), 1.0, -0.6), fov: 58 };
    case 28: return { pos: P("lab", lerp(-0.3, -0.1, e), 1.55, lerp(3.6, 3.2, e)), look: P("lab", -0.2, 1.25, 0.9), fov: 46 };
    case 29: return { pos: P("brain", 0, 0.15, lerp(6.2, 5.4, e)), look: P("brain", 0, 0.05, 0), fov: 42 };
    case 30: { const a = lerp(-0.55, 0.55, e); return { pos: P("brain", Math.sin(a) * 4.8, 0.4, Math.cos(a) * 4.8), look: P("brain", 0, 0.05, 0), fov: 48 }; }
    case 31: return { pos: P("stage", lerp(-0.45, 0.3, e), 1.25, lerp(3.5, 2.8, e)), look: P("stage", 0, 1.05, 0), fov: 40 };
    case 32: return { pos: P("brain", lerp(-0.7, 0.7, e), lerp(0.35, 0.1, e), 6.0), look: P("brain", 0, 0, 0), fov: 46 };
    case 33: return { pos: V(lerp(-1.45, -1.25, e), 0.92, 1.1), look: V(DE.x, 0.88, 1.1), fov: 34 };
    case 34: return { pos: V(-1.4, 1.2, lerp(4.8, 4.1, e)), look: V(-1.4, 0.95, 1.1), fov: lerp(70, 62, e) };
    case 35: return { pos: V(-1.4, 1.25, lerp(4.7, 4.3, e)), look: V(-1.4, 0.95, 1.1), fov: 68 };
    case 36: return { pos: V(-1.4, lerp(1.2, 1.1, e), lerp(4.3, 3.8, e)), look: V(-1.4, 0.95, 1.1), fov: lerp(66, 58, e) };
    case 37: return { pos: V(-1.5, 1.2, 4.3), look: V(-1.4, 0.85, 1.2), fov: 58 };
    case 38: return { pos: V(lerp(0.2, 0.0, e), lerp(1.15, 1.17, e), 4.5), look: V(-2.0, 0.95, 1.2), fov: 40 };
    case 39: return { pos: V(lerp(0.0, -0.3, e), lerp(1.17, 1.2, e), lerp(4.5, 4.2, e)), look: V(-2.05, 0.98, 1.2), fov: lerp(40, 44, e) };
    case 40: return { pos: V(lerp(-1.1, -1.4, e), 0.95, 1.1), look: V(DE.x, lerp(0.9, 0.88, e), 1.1), fov: lerp(32, 36, e) };   // the last frame is the first frame
    default: return { pos: HOOK.pos.clone(), look: HOOK.look.clone(), fov: HOOK.fov };
  }
}

// ===================== one frame of the world, for time t and shot k =====================
const outsideState = (t, k) => ({ light: 1, warm: 0, sunEl: 0.9, sunAz: 0.3, season: 1, moonEl: -1, moonAz: 0 });
const SKIES = { stage: ["#3a2a8a", "#7a4ac8", "#ff9ad0", "#6a5ae0"], warmstage: ["#ffb8c8", "#ffd8d0", "#fff0e0", "#ffd0d8"] };
const KEYAT = { room: [6, 4.2, 1.6, -0.3, 0.3, 2.4], wild: [5, 5.5, 4, 0, 0.3, 0], space: [4, 4, 5, 0, 0.5, 0], camp: [3, 6, 5, 0, 0.5, 0], lab: [2, 6, 5, 0, 0.5, 0.5], stage: [3, 5, 6, 0, 0.5, 0], brain: [0, 2, 6, 0, 0, 0] };
function apply(t, k) {
  kit.hideAll(); hideRings();
  const [, place, mood] = SHOTS[k - 1], m = MOODS[mood], org = ORG[place];
  room.group.visible = outside.group.visible = outside.sky.visible = place === "room";
  for (const n of ["wild", "space", "camp", "lab", "stage", "brain"]) places[n].visible = place === n;
  ghDog.head.visible = ghMan.head.visible = place === "brain";
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
  key.color.set(m.key[0]); key.intensity = m.key[1];
  { const kk = KEYAT[place]; key.position.set(org.x + kk[0], org.y + kk[1], org.z + kk[2]); key.target.position.set(org.x + kk[3], org.y + kk[4], org.z + kk[5]); }
  if (place === "room") { outside.set({ ...outsideState(t, k), t }); scene.fog.color.copy(outside.fogColor); scene.fog.near = 45; scene.fog.far = 260; }
  else { scene.fog.near = 1e5; scene.fog.far = 2e5; }
  const c = window.__cam ? { pos: V(...window.__cam.pos), look: V(...window.__cam.look), fov: window.__cam.fov ?? 50 } : cameraAt(t, k);
  camera.position.copy(c.pos); camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  // you
  const os = ownerState(t, k);
  owner.visible = !!os;
  if (os) { owner.pose({ ...os, x: org.x + os.x, z: org.z + os.z }); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  // the other people
  const cs = crowdState(t, k) ?? {};
  for (const [name, p] of Object.entries(crowd)) { const st = cs[name]; p.visible = !!st; if (st) { p.pose({ ...st, x: org.x + st.x, z: org.z + st.z }); p.faceCamera(camera); p.updateMatrixWorld(true); } }
  // the dog and the wolves
  const ds = dogState(t, k);
  dog.visible = !!ds;
  if (ds) { dog.scale.setScalar(ds.scale ?? DOGS); dog.pose({ ...ds.pose, closed: ds.pose.closed ?? 0.9 * blink(t), x: org.x + ds.x, z: org.z + ds.z, ry: ds.ry, y: org.y + (ds.y ?? 0) }); dogLook(dog, ...(ds.look ?? [0, 0])); dog.updateMatrixWorld(true); }
  const ws = wolfStates(t, k);
  for (const [d, st, sc] of [[wolfA, ws.A, 0.95], [wolfB, ws.B, 0.85], [shade, ws.S, 0.9]]) { d.visible = !!st; if (st) { d.scale.setScalar(st.scale ?? sc); d.pose({ ...st.pose, x: org.x + st.x, z: org.z + st.z, ry: st.ry, y: org.y + (st.y ?? 0) }); dogLook(d, ...(st.look ?? [0, 0])); d.updateMatrixWorld(true); } }
  eeg.visible = k === 28 && dog.visible;
  const fx = { room: roomFx, wild: wildFx, space: spaceFx, camp: campFx, lab: labFx, stage: stageFx, brain: brainFx }[place];
  if (place === "wild") { const sk = WSKY[mood] ?? WSKY.wild; wild.dome.set(...sk); }
  if (place === "stage") { const sk = SKIES[mood] ?? SKIES.stage; stage.set(...sk); }
  fx(t, k, ds);
  kit.drawFx(t);
  renderer.domElement.style.filter = "saturate(1.4) contrast(1.07) brightness(1.02)";
  document.getElementById("vignette").style.opacity = "0.14";
}

// ---------- the clearing: wolves face to face, shot by shot (local coordinates, the clearing's own origin) ----------
const WSKY = { wild: ["#4aa8ff", "#a9defa", "#e9f8ff"], war: ["#3a0a0a", "#b02a1a", "#ff7a4a"], dusk: ["#2c2f78", "#7b58a6", "#ffb07a"], night: ["#070b30", "#1a2a6c", "#3a4a9a"] };
const wbase = (t, o = {}) => ({ t, walk: 0, wag: 0, cute: 0, closed: 0, ears: 0, angry: 0, snarl: 0, squint: 0, sad: 0, ...o });
function wolfStates(t, k) {
  const u = U(t, k), L = SL(k), out = { A: null, B: null, S: null };
  const A = (x, o = {}, extra = {}) => ({ x, z: 0, ry: Math.PI / 2, pose: wbase(t, o), ...extra }), B = (x, o = {}, extra = {}) => ({ x, z: 0, ry: -Math.PI / 2, pose: wbase(t, o), ...extra });
  switch (k) {
    case 13: out.A = A(-1.7, { angry: 0.9, squint: 0.35, snarl: 0.3 * ease.inOut(prog(u, 0.5, 1.2)), ears: -0.6, headPitch: -0.04 }); break;
    case 14: { const c = ease.inOut(prog(u, 0.1, 1.0)), g = prog(u, 0.2, 1.0); out.A = A(lerp(-2.0, -1.35, c), { angry: 0.3 + 0.5 * g, squint: 0.2 * g, ears: -0.2 - 0.4 * g, headPitch: -0.05, walk: c > 0.02 && c < 0.98 ? 0.35 : 0 }); out.B = B(lerp(2.0, 1.35, c), { angry: 0.3 + 0.5 * g, squint: 0.2 * g, ears: -0.2 - 0.4 * g, headPitch: -0.05, walk: c > 0.02 && c < 0.98 ? 0.35 : 0 }); break; }
    case 15: { const l = ease.inOut(prog(u, 0.3, 0.8)), hit = bump(prog(u, 0.55, 1.0)); out.A = A(lerp(-1.35, -0.45, l), { angry: 1, snarl: 0.9, ears: -0.9, squint: 0.4, leap: 0.7 * bump(prog(u, 0.3, 0.85)), crouch: 0.2 * (1 - l) }, { y: 0.0 }); out.B = B(lerp(1.35, 0.45, l), { angry: 1, snarl: 0.9, ears: -0.9, squint: 0.4, leap: 0.7 * bump(prog(u, 0.3, 0.85)), crouch: 0.2 * (1 - l) }); void hit; break; }
    case 16: { const g = ease.inOut(prog(u, 0.15, 0.8)); out.A = A(-0.9, { angry: 0.35, ears: 0.1, headPitch: -0.14, beg: 0.25 * g, wag: 0 }); out.B = B(1.3, { crouch: 0.9 * g, ears: -0.9, sad: 0.7, headPitch: 0.2, headYaw: -0.7 * g }, { look: [-1, -0.3] }); break; }
    case 17: { const c = ease.inOut(prog(u, 0.0, 1.0)); out.S = { x: lerp(3.9, 3.4, c), z: lerp(2.7, 2.3, c), ry: -2.3, pose: wbase(t, { crouch: 1, ears: -0.6, headPitch: 0.1, squint: 0.3, walk: 0.25 * (c > 0.02 && c < 0.98 ? 1 : 0) }), look: [-0.6, 0] }; break; }
    case 18: { const calm = ease.inOut(prog(u, 0.7, 1.9)), away = ease.inOut(prog(u, 0.15, 0.7)); out.A = A(-1.2, { angry: 0.5 * (1 - calm), ears: lerp(-0.4, 0.5, calm), headPitch: -0.04, headYaw: 0.5 * calm, wag: 0.5 * calm, wagSpeed: 8 }); out.B = B(1.3, { crouch: 0.4 * (1 - calm), ears: lerp(-0.7, 0.2, calm), sad: 0.4, headYaw: -0.8 * away, headPitch: 0.1, wag: 0.4 * calm, wagSpeed: 8 }, { look: [-1 * away, 0.2] }); break; }
    case 21: { const away = ease.inOut(prog(u, 0.15, 0.7)); out.A = { x: -0.55, z: 0, ry: 0.45, scale: DOGS, pose: wbase(t, { sit: 1, angry: 0.15, ears: -0.25, headYaw: -1.1 * away }), look: [-1 * away, 0] }; break; }
    case 22: { const c = ease.inOut(prog(u, 0.0, 0.62)), go = prog(u, 0.0, 0.62); if (u < 0.72 * L) out.B = { x: lerp(5.0, 1.8, c), z: lerp(3.0, 2.3, c), ry: -2.1, scale: 0.85 * (1 - ease.inOut(prog(u, 0.5 * L, 0.72 * L))), pose: wbase(t, { walk: go > 0.02 && go < 0.98 ? 0.7 : 0, ears: -0.1, headPitch: 0.05, sad: 0.1 }) }; break; }
    case 24: out.A = { x: -0.5, z: 0, ry: 0, scale: DOGS, pose: wbase(t, { sit: 1, angry: 0.4, squint: 0.2, ears: -0.2 }), look: [0, 0] }; break;
    default: break;
  }
  return out;
}
// emoji animals that stand in the world (not pulled to the frame): a pop-in, optional mirror, size in metres
function worldIcon(ch, pos, size, on, flip = 1) { if (on <= 0.01) return; const sp = kit.ico(ch); sp.visible = true; sp.position.copy(pos); sp.scale.set(size * on * flip, size * on, 1); sp.material.opacity = 1; }
function wildFx(t, k) {
  const u = U(t, k);
  if (k === 12) {
    [["🦁", -1.0, 0.85, -1.2, 0.0], ["🐻", 1.1, 0.9, -2.8, 0.18], ["🐅", -1.2, 0.8, -4.2, 0.36], ["🦌", 1.3, 0.95, -0.2, 0.52], ["🐊", -0.2, 0.3, 1.4, 0.7]].forEach(([ch, x, y, z, d]) => worldIcon(ch, wl(x, y, z), 1.5, popK(t, T0(12) + d, 1.2), x < 0 ? -1 : 1));
  }
  if (k === 13) {
    showIcon("⚠️", inFront(1.6, 0.35, 0.75), 0.5, popK(t, wd(57) + 0.1, 1.0), { t });
    showIcon("☠️", inFront(1.6, -0.3, 0.85), 0.6, popK(t, wd(60) - 0.1, 1.0), { t, bob: 0.02 });
  }
  if (k === 14) { showIcon("👁️", wl(-1.2, 1.55, 0), 0.4, popK(t, wd(66) - 0.1, 1.2), { t }); showIcon("👁️", wl(1.2, 1.55, 0), 0.4, popK(t, wd(66) - 0.05, 1.2), { t }); }
  if (k === 15) showIcon("⚔️", wl(0, 1.6, 0), 0.6, popK(t, wd(68) - 0.1, 1.3), { t });
  if (k === 16) showIcon("👑", wl(-0.9, 1.65, 0), 0.5, popK(t, wd(73) - 0.2, 1.4), { bob: 0.02, t });
  if (k === 17) {
    const on = 1 - prog(u, 0.9, 1.1);
    worldIcon("🦌", wl(-1.8, 0.75, 0), 1.5, on * popK(t, T0(17), 1.6), 1);
    showIcon("❗", wl(-1.8, 1.8, 0), 0.4, popK(t, wd(78) - 0.3, 0.9), { bob: 0.02, t });
  }
  if (k === 18) {
    const away = prog(t, wd(83) - 0.1, wd(84));
    [["🦌", -3.4, 0.75, -2.2], ["🐇", 3.6, 0.4, -2.4], ["🦊", 2.6, 0.45, 2.6]].forEach(([ch, x, y, z], i) => worldIcon(ch, wl(x, y, z), 1.1, popK(t, T0(18) + 0.1 * i, 2.5), (x < 0 ? 1 : -1) * (away > 0.5 ? -1 : 1)));
    showIcon("🕊️", wl(0, 1.7, 0), 0.5, popK(t, wd(86) - 0.1, 1.4), { bob: 0.02, t });
  }
}

// the EEG cap on his head in the lab, the red muscle above his eyes in the anatomy shots
const eeg = (() => { const g = new THREE.Group(), m = toon(0xffffff), dots = toon(0x3aa8ff); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m); cap.position.set(0, 0.17, 0.02); g.add(cap); for (let i = 0; i < 6; i++) { const a = i * 1.05, d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), dots); d.position.set(Math.cos(a) * 0.15, 0.3 + 0.05 * (i % 2), Math.sin(a) * 0.15); g.add(d); } g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.006, min: 0.01 }); g.visible = false; dog.head.add(g); return g; })();
const muscles = [0, 1].map(() => { const g = new THREE.Group(); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 18, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: 0xff3a5a })); arc.rotation.z = Math.PI * 0.1; g.add(arc); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3a5a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); gl.scale.set(0.26, 0.26, 1); gl.material.opacity = 0.6; g.add(gl); g.visible = false; g.userData.ink = false; arc.userData.ink = false; scene.add(g); return g; });
const hideMuscles = () => muscles.forEach((g) => (g.visible = false));
function showMuscles(d, t, on, side = 1) { const w = V(0, 0, 0); d.eyes.forEach((e, i) => { e.getWorldPosition(w); muscles[i].visible = on > 0.01; muscles[i].position.copy(w).add(V(0, 0.085 * d.scale.x / 0.8, 0.03)); muscles[i].scale.setScalar(on * (1 + 0.12 * Math.sin(t * 8 + i))); }); }
// the heart of the brain shots: both brains beat together; pink oxytocin pours from both to the middle
const oxyD = makeStream(150, 0xff6fb0, 0.07), oxyH = makeStream(150, 0xff9ccb, 0.07), infinity = makeStream(260, 0xffd24a, 0.06), fall = makeStream(200, 0xff8ac4, 0.07);
const lemn = (f, a = 1.7) => { const th = f * Math.PI * 2, d = 1 + Math.sin(th) * Math.sin(th); return V(a * Math.cos(th) / d, a * Math.sin(th) * Math.cos(th) / d * 1.3, 0.25); };

function spaceFx(t, k) {
  const u = U(t, k);
  space.earth.visible = space.halo.visible = k === 19; space.dna.visible = k === 20;
  if (k === 19) {
    space.earth.rotation.y = t * 0.25; space.earth.scale.setScalar(0.7); space.halo.scale.set(3.2, 3.2, 1);
    ["🐱", "🐴", "🐮", "🐷", "🦊", "🐑"].forEach((ch, i) => {
      const ang = t * 0.7 + i * 1.05, p = P("space", Math.cos(ang) * 1.45, 0.3 * Math.sin(ang * 0.7 + i) + 0.1, Math.sin(ang) * 1.3);
      worldIcon(ch, p, 0.6, popK(t, T0(19) + 0.2 + 0.1 * i, 1.9));
      showIcon("❌", p.clone().add(V(0, 0.1, 0.1)), 0.34, popK(t, T0(19) + 0.55 + 0.12 * i, 1.4), { t });
    });
    showIcon("⭐", P("space", 0, 1.3, 0), 0.34, popK(t, wd(89) - 0.05, 1.5), { bob: 0.02, t });
    pulseRings(t, P("space", 0, 1.0, 0), { period: 1.3, size: 0.6, on: popK(t, wd(89) - 0.1, 1.6), toward: 0.0, color: 0xffe08a });
  }
  if (k === 20) {
    space.dna.rotation.y = t * 0.9; const sw = prog(u, 0.05, 0.92); space.rewrite(sw);
    showIcon("✏️", P("space", 0.75 * Math.cos(t * 3), lerp(-2.2, 2.2, sw), 0.75 * Math.sin(t * 3)), 0.34, popK(t, T0(20) + 0.05, SL(20) - 0.05), { t });
    showIcon("🧬", inFront(3.2, -0.55, 1.0), 0.5, popK(t, T0(20) + 0.1, SL(20) - 0.1), { bob: 0.02, t });
  }
}
function campFx(t, k) {
  const u = U(t, k); camp.update(t);
  camp.dome.mesh.rotation.y = u * 0.7; camp.stars.rotation.y = u * 0.7;
  showIcon("⏳", inFront(4.4, 0.0, 1.8), 0.5, popK(t, T0(22) + 0.1, SL(22) - 0.1), { bob: 0.02, t });
  if (k === 22 && u > 0.55 * SL(22)) burst(T0(22) + 0.56 * SL(22), P("camp", -0.9, 0.5, 1.5), 4, { ch: ["💛", "✨"], spread: 0.5, rise: 0.8, size: 0.2, gap: 0.08, dur: 1.0 });
}
function stageFx(t, k) {
  const u = U(t, k);
  hideMuscles();
  if (k === 21) {
    showIcon("❌", P("stage", -0.55, 1.55, 0), 0.5, popK(t, wd(100) - 0.1, 1.2), { t });
    showIcon("❤️", P("stage", 0.55, 1.65, 0), 0.5, popK(t, wd(100) - 0.0, 1.3), { bob: 0.02, t });
    showIcon("↔️", P("stage", 0, 2.1, 0), 0.45, popK(t, wd(101) - 0.1, 1.2), { t });
  }
  if (k === 23) { showMuscles(dog, t, ease.out(prog(u, 0.35, 0.7))); showIcon("🔍", inFront(2.0, 0.45, 0.62), 0.4, popK(t, T0(23) + 0.2, SL(23) - 0.2), { bob: 0.02, t }); }
  if (k === 24) {
    showMuscles(dog, t, 1);
    showIcon("❌", P("stage", -0.5, 1.55, 0), 0.5, popK(t, wd(119) - 0.15, 1.3), { t });
    showIcon("✅", P("stage", 0.5, 1.55, 0), 0.5, popK(t, wd(117) - 0.0, 1.8), { bob: 0.01, t });
  }
  if (k === 25) {
    const m = mimic(u), me = m.sad > m.surprise && m.sad > m.happy ? "😢" : m.surprise > m.happy ? "😮" : "😊", you = mimic(u - 0.28), de = you.sad > you.surprise && you.sad > you.happy ? "🥺" : you.surprise > you.happy ? "😲" : "😄";
    showIcon(me, P("stage", -0.6, 2.0, 0), 0.4, 1, { bob: 0.02, t }); showIcon(de, P("stage", 0.7, 1.65, 0.2), 0.4, 1, { bob: 0.02, t });
    showIcon("🪞", P("stage", 0.05, 1.7, 0), 0.4, popK(t, wd(126) - 0.1, 1.3), { t });
  }
  if (k === 26) {
    const on = prog(u, 0.1, 0.4), ec = dog.eyes[0].getWorldPosition(V(0, 0, 0)).lerp(dog.eyes[1].getWorldPosition(V(0, 0, 0)), 0.5);
    rings.forEach((r, i) => { const f = ((t / 0.9) + i / rings.length) % 1; r.visible = on > 0.01; r.position.copy(ec).lerp(camera.position, 0.15); r.scale.setScalar(0.9 * (1.25 - f)); r.material.color.set(0xffe9a0); r.material.opacity = on * 0.8 * Math.sin(Math.PI * f); });
    runStream(goldBeam, t, (f, i) => { const a = (i * 2.399) % (Math.PI * 2), R = 0.7 * (1 - f); return V(ec.x + Math.cos(a) * R, ec.y + Math.sin(a) * R * 1.3, ec.z + 0.2 * (1 - f)); }, { speed: 0.45, shown: Math.floor(160 * on), spread: 0.01, jitter: 0.2 });
    showIcon("🌀", inFront(1.4, 0.3, 0.55), 0.4, popK(t, T0(26) + 0.1, SL(26) - 0.1), { bob: 0.02, t });
  }
  if (k === 31) {
    const MP = P("stage", 0.0, 1.5, 0), BP = P("stage", 0.02, 1.2, 0.2), on = prog(u, 0.2, 0.7);
    runStream(pinkBeam, t, (f) => { const p = MP.clone().lerp(BP, f); p.y += 0.06 * Math.sin(Math.PI * f); p.z += 0.15; return p; }, { speed: 0.5, shown: Math.floor(160 * on), spread: 0.03 });
    showIcon("💗", P("stage", 0.35, 2.0, 0.3), 0.4, popK(t, T0(31) + 0.3, SL(31) - 0.3), { bob: 0.02, t });
    showIcon("🍼", P("stage", -0.5, 1.2, 0.2), 0.3, popK(t, wd(163) - 0.1, 1.4), { bob: 0.02, t });
  }
}
function labFx(t, k) {
  const u = U(t, k), level = k === 27 ? 0.25 + 0.2 * prog(u, 0.3, 1.0) : 0.3 + 0.7 * prog(u, 0.3, 1.0);
  lab.update(t, level);
  if (k === 27) { showIcon("🔬", inFront(3.0, -0.5, 0.9), 0.45, popK(t, T0(27) + 0.2, SL(27) - 0.2), { bob: 0.02, t }); showIcon("📋", P("lab", 1.5, 1.8, -1.4), 0.34, popK(t, wd(138) - 0.1, 1.4), { t }); }
  if (k === 28) {
    const a = P("lab", -0.75, 1.37, 0.9), b = P("lab", 0.03, 1.02, 0.9), on = prog(u, 0.25, 0.6);
    runStream(pinkBeam, t, (f) => { const p = a.clone().lerp(b, f); p.y += 0.1 * Math.sin(Math.PI * f); return p; }, { speed: 0.6, shown: Math.floor(160 * on), spread: 0.03 });
    showIcon("📈", P("lab", 0.0, 2.3, -2.2), 0.4, popK(t, wd(149) - 0.1, 1.5), { bob: 0.02, t });
  }
}
function brainFx(t, k) {
  const u = U(t, k), ph = (t * (k === 29 ? 1.4 : 1.0)) % 1, level = k === 32 ? 1 : 0.4 + 0.6 * prog(u, 0.1, 0.6);
  ghDog.pulse(ph, level); ghMan.pulse(ph, level);
  ghDog.head.rotation.y = 0.15 * Math.sin(t * 0.6); ghMan.head.rotation.y = Math.PI - 0.15 * Math.sin(t * 0.6 + 1);
  ghDog.head.position.y = BRAIN0.y + 0.04 * Math.sin(t * 1.2); ghMan.head.position.y = BRAIN0.y + 0.04 * Math.sin(t * 1.2 + 1);
  bw.bokeh.forEach((m, i) => { m.position.set(5.5 * Math.sin(i * 1.7 + t * 0.12 * (1 + (i % 3))), 3.0 * Math.cos(i * 2.3 + t * 0.09), -4 - (i % 5) * 0.8); m.scale.setScalar(1 + 0.15 * Math.sin(t * 0.8 + i)); });
  bw.mol.visible = k === 30;
  const bd = P("brain", -0.7, 0.2, 0.1), bh = P("brain", 0.7, 0.2, 0.1), mid = P("brain", 0, 0.45, 0.1);
  if (k === 29) {
    const on = prog(u, 0.05, 0.5);
    runStream(oxyD, t, (f) => { const p = bez(bd, bd.clone().lerp(mid, 0.5).add(V(0, 0.7, 0)), mid, f); return p; }, { speed: 0.5, shown: Math.floor(150 * on), spread: 0.05 });
    runStream(oxyH, t, (f) => { const p = bez(bh, bh.clone().lerp(mid, 0.5).add(V(0, 0.7, 0)), mid, f); return p; }, { speed: 0.5, shown: Math.floor(150 * on), spread: 0.05 });
    showIcon("✨", mid.clone().add(V(0, 0.25, 0.2)), 0.5, popK(t, wd(155) - 0.1, 1.4), { bob: 0.02, t });
  }
  if (k === 30) {
    const sc = ease.out(prog(u, 0.0, 0.5)); bw.mol.position.set(0, 0.2, 0.1); bw.mol.scale.setScalar(0.9 * sc); bw.mol.rotation.set(0.3, t * 0.9, 0.1);
    runStream(fall, t, (f, i) => { const x = (((i * 37) % 100) / 100 - 0.5) * 3.0, z = 0.4 * Math.sin(i * 1.7); return V(BRAIN0.x + x, BRAIN0.y + lerp(2.0, -1.6, f * f * 0.5 + f * 0.5), BRAIN0.z + z); }, { speed: 0.38, shown: Math.floor(200 * prog(u, 0.2, 0.8)), spread: 0.02 });
  }
  if (k === 32) {
    runStream(infinity, t, (f) => lemn(f).add(BRAIN0), { speed: 0.12, shown: 260, spread: 0.03, hueFn: (f) => new THREE.Color().setHSL(0.08 + 0.12 * Math.sin(f * 6.28) * 0.5 + 0.06, 0.95, 0.62) });
    for (let i = 0; i < 5; i++) worldIcon("💗", lemn(((t * 0.12 + i / 5) % 1)).add(BRAIN0), 0.38, 1);
    ["🐱", "🐮", "🐷"].forEach((ch, i) => { const p = P("brain", -2.2 + 2.2 * i, 2.0 - 0.3 * (i % 2), -2); worldIcon(ch, p, 0.9, popK(t, wd(172) - 0.4 + 0.18 * i, 1.5)); showIcon("❌", p.clone().add(V(0, 0, 0.1)), 0.45, popK(t, wd(172) - 0.2 + 0.18 * i, 1.3), { t }); });
  }
}

// the things that happen around the dog and you in the room, shot by shot
function roomFx(t, k, ds) {
  heart3d.visible = k === 34; dogHalo.visible = false;
  if (k >= 33) roomFx2(t, k, ds);
  roomFx1(t, k, ds);
}
function roomFx2(t, k, ds) {
  const u = U(t, k), L = SL(k);
  const OC = V(-2.35, 1.0, 1.12);
  if (k === 33) {
    pulseRings(t, eyeMid(dog), { period: 1.2, size: 0.28, on: popK(t, T0(33) + 0.1, SL(33) - 0.1), toward: 0.3 });
    showIcon("👁️", inFront(1.3, 0.2, 0.42), 0.3, popK(t, T0(33) + 0.15, 1.9), { bob: 0.01, t });
    showIcon("❌", inFront(1.3, 0.2, 0.42), 0.45, popK(t, wd(184) - 0.1, 1.2), { t });
  }
  if (k === 34) {
    const beat = (t * 1.4) % 1, thump = Math.max(0, 1 - beat * 4), on = prog(u, 0.2, 0.8);
    heart3d.position.copy(OC).add(V(0.0, 0.0, 0.16)); heart3d.scale.setScalar((0.85 + 0.14 * thump) * ease.out(prog(u, 0.1, 0.5))); heart3d.rotation.y = 0.3 * Math.sin(t * 1.4);
    const DEm = eyeMid(dog);
    const wrap = (sign) => (f) => {
      if (f < 0.5) { const q = f / 0.5; return bez(DEm, DEm.clone().lerp(OC, 0.5).add(V(0, 0.45, sign * 0.2)), OC.clone().add(V(0.5, 0.05, sign * 0.15)), q); }
      const g = (f - 0.5) / 0.5, ang = sign * (0.3 + g * Math.PI * 2.4);
      return V(OC.x + Math.cos(ang) * 0.5, OC.y + 0.05 + 0.1 * Math.sin(g * 8), OC.z + 0.16 + Math.sin(ang) * 0.4);
    };
    runStream(goldBeam, t, wrap(1), { speed: 0.3, shown: Math.floor(160 * on), spread: 0.03 });
    runStream(pinkBeam, t, wrap(-1), { speed: 0.3, shown: Math.floor(160 * on), spread: 0.03 });
    dogHalo.visible = true; dogHalo.position.copy(V(D1.x, 0.55, D1.z)); dogHalo.material.opacity = 0.7 * on * (0.7 + 0.3 * thump);
  }
  if (k >= 35 && k <= 37) {
    const rainOn = k === 37 ? 1 - prog(u, 0.2, 1.4) : 1;
    runStream(rainDrops, t, (f, i) => inFront(1.6, (((i * 37) % 100) / 100 - 0.5) * 1.5, lerp(0.95, -0.95, (f * 1.6 + ((i * 13) % 10) / 10) % 1)), { speed: 1.0, shown: Math.floor(220 * rainOn), spread: 0.0 });
  }
  if (k === 35) showBubble("🤐", V(D1.x - 0.25, 1.5, D1.z), 0.6, popK(t, T0(35) + 0.2, SL(35) - 0.25));
  if (k === 36) {
    showIcon("🫂", V(D1.x - 0.2, 1.55, D1.z + 0.2), 0.5, popK(t, wd(210) - 0.2, 1.1), { bob: 0.01, t });
    showIcon("❌", V(D1.x - 0.2, 1.55, D1.z + 0.2), 0.7, popK(t, wd(211) - 0.1, 1.0), { t });
    showIcon("☁️", V(OWN.x + 0.1, 2.05, OWN.z), 0.7, popK(t, wd(216) - 0.3, 1.6), { bob: 0.02, t });
    showIcon("💧", V(OWN.x + 0.15, 1.75, OWN.z + 0.1), 0.3, popK(t, wd(217) - 0.1, 1.2), { bob: 0.04, t });
  }
  if (k === 37) showIcon("🤫", V(-1.2, 1.55, 1.4), 0.4, popK(t, wd(222) - 0.15, 1.3), { bob: 0.02, t });
  if (k === 38 || k === 39) {
    const DEm = eyeMid(dog), OEm = V(OE.x + 0.03, OE.y, OE.z + 0.05), on = k === 38 ? prog(u, 0.7, 1.7) : 1;
    runStream(bridge, t, (f) => { const p = DEm.clone().lerp(OEm, f); p.y += 0.28 * Math.sin(Math.PI * f); p.z += 0.12 * Math.sin(Math.PI * f); return p; }, { speed: 0.4, shown: Math.floor(260 * on), spread: 0.03, hueFn: (f, i) => new THREE.Color().setHSL(((f * 0.8 + i * 0.013) % 1), 0.95, 0.62) });
    pulseRings(t, DEm.clone().lerp(OEm, 0.5).add(V(0.0, 0.14, 0.12)), { period: 1.6, size: 0.35, on: on * 0.8, toward: 0.0, color: 0xffe9a0 });
  }
  if (k === 39) {
    showIcon("💛", V(OWN.x + 0.3, 1.9 + 0.12 * ((t * 0.5) % 1), OWN.z + 0.3), 0.36, popK(t, T0(39) + 0.4, 1.9), { t });
    showIcon("💞", V(-1.9, 1.7, 1.3), 0.4, popK(t, wd(238) - 0.3, 1.6), { bob: 0.02, t });
  }
}
function roomFx1(t, k, ds) {
  const u = U(t, k), L = SL(k), dogHead = ds ? V(DE.x, 0.95, DE.z) : V(DE.x, 0.95, DE.z);
  bowl.visible = k === 7;
  if (k === 2) {
    showIcon("🍖", V(DE.x + 0.05, 1.45, DE.z), 0.5, popK(t, wd(10) - 0.07, 1.1), { bob: 0.02, t });
    showIcon("❌", V(DE.x + 0.05, 1.45, DE.z + 0.02), 0.7, popK(t, wd(10) + 0.18, 0.9), { t });
  }
  if (k === 5) { // the look travels across the room as a glowing thread
    const on = prog(u, 0.2, 0.55) * (1 - prog(u, 0.92, 1.0));
    const a = OE.clone(), b = DE.clone();
    runStream(goldBeam, t, (f) => { const p = a.clone().lerp(b, f); p.y += 0.12 * Math.sin(Math.PI * f); return p; }, { speed: 0.7, shown: Math.floor(160 * on), spread: 0.04 });
  }
  if (k === 6) pulseRings(t, DE.clone().add(V(-0.15, 0, 0)), { period: 1.3, size: 0.3, on: popK(t, T0(6) + 0.1, SL(6) - 0.1), toward: 0.3 });
  if (k === 7) {
    showBubble("🍽️", inFront(2.2, -0.55, 0.95), 0.75, popK(t, T0(7) + 0.1, SL(7) - 0.1));
    showIcon("🍖", V(BOWL.x, 0.75, BOWL.z - 0.1), 0.45, popK(t, T0(7) + 0.3, SL(7) - 0.4), { bob: 0.03, t });
  }
  if (k === 8) showBubble("🦮", inFront(2.2, -0.55, 0.95), 0.75, popK(t, T0(8) + 0.05, SL(8) - 0.1));
  if (k === 9) {
    showBubble("✋", inFront(2.2, -0.55, 0.95), 0.75, popK(t, T0(9) + 0.05, SL(9) - 0.1));
    showIcon("❓", V(DE.x, 1.4, DE.z), 0.4, popK(t, wd(41) - 0.1, 0.9), { bob: 0.02, t });
  }
  if (k === 10) { // three guesses, each crossed out
    const heads = [["🍖", 0, wd(44) - 0.05], ["🦮", 1, wd(45) + 0.1], ["✋", 2, wd(46) + 0.05]];
    for (const [ch, i, t0] of heads) {
      const p = V(DE.x - 0.05, 1.55 + 0.0, DE.z + (i - 1) * 0.5);
      showIcon(ch, p, 0.42, popK(t, t0 - 0.1, 1.7), { bob: 0.01, t });
      showIcon("❌", p.clone().add(V(0, 0, 0.0)), 0.58, popK(t, t0 + 0.2, 1.4), { t });
    }
  }
  if (k === 11) { // the hug: two ribbons of light leave his eyes and wrap round you
    const on = prog(u, 0.15, 0.7), OC = V(-2.45, 0.98, 1.0);
    const wrap = (sign) => (f) => {
      const a = DE.clone().add(V(0, 0, sign * 0.05)), b = OC.clone().add(V(0.55, 0.15, sign * 0.4));
      if (f < 0.55) { const q = f / 0.55, p = bez(a, a.clone().lerp(b, 0.5).add(V(0, 0.5, sign * 0.3)), b, q); return p; }
      const g = (f - 0.55) / 0.45, ang = sign * (Math.PI * 0.25 + g * Math.PI * 2.1);
      return V(OC.x + Math.cos(ang) * 0.48, OC.y + 0.18 - g * 0.1 + 0.05 * Math.sin(g * 9), OC.z + Math.sin(ang) * 0.48);
    };
    runStream(goldBeam, t, wrap(1), { speed: 0.35, shown: Math.floor(160 * on), spread: 0.035 });
    runStream(pinkBeam, t, wrap(-1), { speed: 0.35, shown: Math.floor(160 * on), spread: 0.035 });
    showIcon("🤗", V(OC.x + 0.1, 1.95, OC.z), 0.5, popK(t, wd(48) - 0.05, 1.4), { bob: 0.02, t });
    showIcon("🐾", V(D0.x - 0.4, 0.3, D0.z + 0.2), 0.4, popK(t, wd(52) - 0.1, 1.2), { t });
    showIcon("❌", V(D0.x - 0.4, 0.3, D0.z + 0.22), 0.6, popK(t, wd(52) + 0.1, 1.0), { t });
  }
}

burst(T0(39) + 0.9, V(-1.7, 1.75, 1.4), 10, { ch: ["💛", "💖", "✨"], spread: 0.9, rise: 0.9, size: 0.22, gap: 0.12, dur: 1.4, spin: 0.4 });
const dissolve = createDissolve({ renderer, scene, camera });
onUpdate((t) => { t = Math.min(t, DURATION - 1e-6); dissolve(t, STARTS, half, apply, shotOf); captions(t); });

// ===================== sound: real recordings only (see sfx/CREDITS.md), placed one by one on the picture =====================
// A quiet room with a clock; soft paws and sniffs; real animals for the animal kingdom; a campfire, rain and crickets;
// heartbeats that follow the story (racing in the wild, calm in the lab, strong when the dog wraps your heart); and a long hush before the sunrise.
const sfx = createSfx(short, { mix: { gain: 1.75, duck: { depth: 0.3, attack: 0.012, release: 0.28, threshold: -42 } } });
const wob = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);   // repeatable little pitch / level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
const paws = (t0, n, dt, g0, g1 = g0, pan = 0) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `paw_${(i % 4) + 1}`, lerp(g0, g1, n > 1 ? i / (n - 1) : 0) * wob(i, 0.18), { pan, rate: wob(i, 0.04) }); };
const pads = (t0, n, dt, g) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, "pad_step", g * wob(i, 0.2), { rate: wob(i, 0.05), pan: -0.2 }); };
const pip = (t, i, g = 0.4, pan = 0) => snd(t, `pop_${(i % 3) + 1}`, g, { pan });
const twinkles = (t0, n, dt, g, o = {}) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `twinkle_${(i % 3) + 1}`, g * wob(i, 0.2), { pan: Math.sin(i * 1.9) * 0.4, rate: (o.rate ?? 1) * (1 + (o.climb ?? 0) * i) }); };
const beats = (t0, t1, dt0, dt1, g0, g1) => { for (let tt = t0, i = 0; tt < t1; i++) { const f = (tt - t0) / (t1 - t0), g = lerp(g0, g1, f); snd(tt, "heart_1", g); snd(tt + 0.2 * Math.min(1, dt0 * 1.3), "heart_2", g * 0.75); tt += lerp(dt0, dt1, f); } };
const hum = (t0, dur, g = 0.25, fi = 0.6, fo = 0.7) => snd(t0, "glow", g, { dur, fadeIn: fi, fadeOut: fo });
const clockOn = (k) => SHOTS[k - 1][1] === "room";

// -- the flat's clock: a faint tick-tock in the room shots (a touch louder in the quiet, nothing under the rain)
for (let tt = 0.5, i = 0; tt < DURATION - 0.3; tt += 1.0, i++) { const k = shotOf(tt); if (!clockOn(k) || k === 35 || k === 36) continue; snd(tt, i % 2 ? "tock" : "tick", k === 37 ? 0.11 : 0.05, { pan: 0.5 }); }
// -- 1-2 · the hook: his eyes lock on; a treat pops up and is crossed out
hum(0.05, 2.2, 0.16, 0.5, 0.5); snd(0.45, "breath_out", 0.16, { rate: 1.3 }); snd(0.95, "heart_1", 0.2); snd(1.15, "heart_2", 0.15);
pip(wd(10) - 0.07, 0, 0.4); snd(wd(10) + 0.18, "snap_low", 0.5);
// -- 3-4 · you on the couch; you look up
snd(T0(3) + 0.2, "rustle_1", 0.18); snd(T0(3) + 0.5, "creak_1", 0.12); snd(T0(4) + 0.4, "creak_2", 0.1); pip(T0(4) + 0.55, 1, 0.2);
// -- 5-6 · eyes meet: a thread of twinkles; a slow heartbeat; soft attention pulses
twinkles(T0(5) + 0.25, 5, 0.14, 0.17); hum(T0(6) + 0.05, 2.1, 0.2, 0.4, 0.6);
snd(T0(6) + 0.25, "heart_1", 0.3); snd(T0(6) + 0.45, "heart_2", 0.22); snd(T0(6) + 1.35, "heart_1", 0.3); snd(T0(6) + 1.55, "heart_2", 0.22);
for (const d of [0.1, 1.4]) snd(T0(6) + d, "pop_2", 0.1, { rate: 0.7 });
// -- 7-9 · what you think: dinner (an eager woof and paws), a walk (birds and a trot), instructions (a snap, a sit)
pip(T0(7) + 0.1, 1, 0.28); pip(T0(7) + 0.3, 2, 0.3); snd(T0(7) + 0.5, "woof_soft", 0.28); paws(T0(7) + 0.75, 5, 0.14, 0.18); snd(T0(7) + 1.25, "sniffle_2", 0.18, { rate: 1.2 });
pip(T0(8) + 0.05, 0, 0.28); snd(T0(8) + 0.1, "thrush_b", 0.2, { pan: 0.4 }); paws(T0(8) + 0.1, 7, 0.17, 0.24, 0.3);
pip(T0(9) + 0.05, 1, 0.28); snd(T0(9) + 0.3, "snap", 0.4); snd(T0(9) + 0.75, "thump", 0.25); pip(wd(41) - 0.1, 2, 0.25);
// -- 10 · three guesses crossed out
for (const [t0, i] of [[wd(44) - 0.1, 0], [wd(45) + 0.05, 1], [wd(46), 2]]) { pip(t0, i, 0.3); snd(t0 + 0.3, "snap_low", 0.4); }
// -- 11 · the hug of eyes: ribbons of twinkles, a swell, a bell on "hug"
hum(T0(11) + 0.2, 2.0, 0.26, 0.6, 0.6); twinkles(T0(11) + 0.3, 8, 0.2, 0.17); snd(wd(49) - 0.1, "bell_2", 0.25); pip(wd(48) - 0.05, 0, 0.3); pip(wd(52) - 0.1, 1, 0.25); snd(wd(52) + 0.1, "snap", 0.3);
// -- 12-13 · the animal kingdom: leaves, pops, a growl and a low bark; then eye contact is deadly (hard cut, a low bell, a racing heart)
snd(T0(12) + 0.02, "leaves", 0.2); [0, 0.18, 0.36, 0.52, 0.7].forEach((d, i) => pip(T0(12) + d, i, 0.32, i % 2 ? 0.4 : -0.4)); snd(T0(12) + 0.05, "growl", 0.25, { rate: 0.9, pan: -0.4 }); snd(T0(12) + 0.22, "woof_low", 0.28, { rate: 0.6, pan: 0.4 });
snd(T0(13) + 0.02, "bell_long", 0.35, { rate: 0.6 }); beats(T0(13) + 0.15, T1(13) - 0.05, 0.42, 0.32, 0.4, 0.5); snd(wd(57) + 0.1, "snap_low", 0.5); snd(wd(60) - 0.15, "growl", 0.4);
// -- 14-16 · wolves face to face: a heart that speeds up, low growls; war: growl, barks and the clash; dominance: a low bell and a crown
snd(T0(14) + 0.1, "leaves", 0.18); beats(T0(14) + 0.2, T1(14) - 0.05, 0.75, 0.5, 0.3, 0.5); snd(T0(14) + 1.0, "growl", 0.25, { pan: -0.3 }); snd(T0(14) + 1.9, "growl", 0.3, { pan: 0.3 }); pip(wd(66) - 0.1, 0, 0.25);
snd(T0(15), "growl", 0.45); snd(T0(15) + 0.35, "woof_low", 0.4, { pan: -0.3 }); snd(T0(15) + 0.45, "woof_low", 0.4, { rate: 0.85, pan: 0.3 }); pip(wd(68) - 0.1, 1, 0.35);
snd(T0(15) + 0.8, "snap_low", 0.6); snd(T0(15) + 0.8, "thump", 0.5); snd(T0(15) + 0.85, "rustle_2", 0.3); beats(T0(15) + 0.1, T1(15), 0.3, 0.3, 0.35, 0.5);
snd(T0(16) + 0.1, "bell_long", 0.3, { rate: 0.7 }); snd(T0(16) + 0.2, "growl", 0.2, { rate: 0.9 }); twinkles(wd(73) - 0.2, 3, 0.1, 0.2); snd(wd(73) - 0.1, "bell_3", 0.2, { rate: 1.1 });
// -- 17-18 · the ambush at night: crickets, a slow heart, a gasp; then wild animals look away: relief, a song thrush, a dove
snd(T0(17) + 0.02, "crickets", 0.35, { dur: 1.9, fadeIn: 0.3, fadeOut: 0.4 }); beats(T0(17) + 0.15, T1(17) - 0.05, 0.9, 0.6, 0.3, 0.45); snd(T0(17) + 0.8, "leaves", 0.14); snd(wd(78) - 0.3, "gasp", 0.2, { rate: 1.2 }); pip(wd(78) - 0.3, 0, 0.3); snd(T0(17) + 1.1, "growl", 0.25, { rate: 0.7 });
snd(T0(18) + 0.1, "breath_out", 0.3); snd(T0(18) + 0.3, "thrush_a", 0.2, { pan: 0.4 }); snd(T0(18) + 0.7, "whimper_a", 0.14, { rate: 1.2, pan: 0.3 }); twinkles(wd(86) - 0.1, 3, 0.12, 0.2); snd(wd(86), "bell_1", 0.25); pip(wd(86) - 0.1, 1, 0.3);
// -- 19-21 · Earth: real animals (a cat, a cow, a pig, a sheep), each crossed out; then the DNA is rewritten (twinkles climb); the opposites
twinkles(T0(19) + 0.05, 4, 0.12, 0.14); snd(T0(19) + 0.25, "meow", 0.3, { pan: -0.3 }); snd(T0(19) + 0.5, "moo_a", 0.22, { pan: 0.3 }); snd(T0(19) + 0.7, "oink", 0.24, { pan: -0.2 }); snd(T0(19) + 0.9, "baa", 0.24, { pan: 0.3 });
for (let i = 0; i < 6; i++) snd(T0(19) + 0.55 + 0.12 * i, "snap", 0.2, { pan: Math.sin(i * 2) * 0.4 }); snd(wd(89) - 0.05, "bell_3", 0.3);
hum(T0(20) + 0.05, 1.6, 0.26, 0.3, 0.5); twinkles(T0(20) + 0.15, 12, 0.11, 0.18, { climb: 0.03 }); pip(T0(20) + 0.1, 0, 0.3);
snd(T0(21) + 0.2, "growl", 0.15, { rate: 1.2 }); snd(T0(21) + 0.7, "woof_soft", 0.2); pip(wd(100) - 0.1, 0, 0.3); pip(wd(100), 1, 0.3); pip(wd(101) - 0.1, 2, 0.3); snd(wd(100) - 0.05, "snap_low", 0.35);
// -- 22 · beside our campfires: a real fire and crickets, the wolf's soft steps, a time-lapse of ticks, then the dog (tail thumps, a happy whimper)
snd(T0(22), "fire", 0.5, { dur: 2.4, fadeIn: 0.2, fadeOut: 0.3 }); snd(T0(22), "crickets", 0.22, { dur: 2.4, fadeIn: 0.3, fadeOut: 0.4 });
pads(T0(22) + 0.15, 7, 0.19, 0.2); for (let i = 0, tt = T0(22) + 0.1; i < 14; i++) { snd(tt, i % 2 ? "tock" : "tick", 0.08); tt += lerp(0.28, 0.1, i / 13); }
twinkles(T0(22) + 0.56 * SL(22), 3, 0.1, 0.2); snd(T0(22) + 0.58 * SL(22), "whimper_c", 0.16, { rate: 1.1 }); for (let i = 0; i < 3; i++) snd(T0(22) + 0.64 * SL(22) + i * 0.15, "thump", 0.12, { rate: 1.5 });
// -- 23-26 · the muscle (a heartbeat, a thump as it appears), wolf vs dog, mimicry, the gaze pulled in
hum(T0(23) + 0.1, 1.8, 0.22, 0.4, 0.5); snd(T0(23) + 0.2, "heart_1", 0.3); snd(T0(23) + 0.4, "heart_2", 0.22); snd(T0(23) + 0.35, "thump", 0.3, { rate: 1.3 }); pip(T0(23) + 0.2, 0, 0.3);
snd(T0(24) + 0.3, "growl", 0.15, { rate: 1.1 }); snd(wd(119) - 0.15, "snap_low", 0.4); pip(wd(119) - 0.15, 1, 0.25); pip(wd(117), 2, 0.3); twinkles(wd(117) + 0.05, 3, 0.1, 0.2); snd(T0(24) + 1.4, "whimper_b", 0.14, { rate: 1.2 });
pip(T0(25) + 0.1, 0, 0.25); snd(T0(25) + 0.35, "sniffle_2", 0.18, { rate: 1.1 }); pip(T0(25) + 0.9, 1, 0.25); snd(T0(25) + 1.1, "gasp", 0.24, { rate: 1.1 }); pip(T0(25) + 1.65, 2, 0.25); snd(T0(25) + 1.75, "woof_soft", 0.25);
hum(T0(26) + 0.1, 1.6, 0.22, 0.3, 0.5); twinkles(T0(26) + 0.1, 8, 0.12, 0.16, { climb: 0.02 }); pip(T0(26) + 0.15, 0, 0.3);
// -- 27-28 · the lab: typing and clicks, slow monitor heartbeats that grow as he looks at you
snd(T0(27) + 0.1, "typing", 0.3, { dur: 1.8, fadeOut: 0.2 }); snd(T0(27) + 0.3, "click_1", 0.2); snd(T0(27) + 1.0, "click_2", 0.2); snd(T0(27) + 1.7, "click_3", 0.2); pip(T0(27) + 0.2, 0, 0.25); beats(T0(27) + 0.3, T1(27) - 0.1, 1.0, 0.9, 0.18, 0.25);
beats(T0(28) + 0.2, T1(28) - 0.1, 1.0, 0.6, 0.25, 0.5); hum(T0(28) + 0.4, 2.2, 0.22, 0.8, 0.6); snd(T0(28) + 0.9, "click_2", 0.15); pip(wd(149) - 0.1, 1, 0.25);
// -- 29-32 · both brains beat as one; the molecule and the cascade; mother and newborn; the loop of hearts
hum(T0(29) + 0.1, 2.2, 0.25, 0.5, 0.6); beats(T0(29) + 0.1, T1(29) - 0.1, 0.7, 0.7, 0.35, 0.4); twinkles(T0(29) + 0.3, 8, 0.2, 0.16); snd(wd(155) - 0.1, "bell_2", 0.3);
snd(T0(30) + 0.05, "bell_1", 0.3); snd(T0(30) + 0.5, "bell_3", 0.22); twinkles(T0(30) + 0.4, 16, 0.11, 0.15); beats(T0(30) + 0.2, T1(30) - 0.1, 0.8, 0.9, 0.25, 0.2);
hum(T0(31) + 0.1, 2.4, 0.22, 0.6, 0.7); snd(T0(31) + 0.3, "bell_1", 0.28); twinkles(T0(31) + 0.5, 6, 0.28, 0.15); snd(T0(31) + 0.7, "breath_out", 0.12, { rate: 1.3 }); beats(T0(31) + 0.3, T1(31) - 0.2, 0.9, 0.9, 0.22, 0.22);
hum(T0(32) + 0.05, 2.6, 0.24, 0.5, 0.7); twinkles(T0(32) + 0.2, 10, 0.18, 0.15); [["meow", 0.28], ["moo_b", 0.2], ["oink", 0.22]].forEach(([n, g], i) => { snd(wd(172) - 0.4 + 0.18 * i, n, g, { pan: -0.4 + 0.4 * i }); snd(wd(172) - 0.2 + 0.18 * i, "snap", 0.25); });
// -- 33-34 · eye contact isn't looking (a swell, a heartbeat); the sensory hug: a strong heart, ribbons, a long bell on "heart"
hum(T0(33) + 0.1, 2.2, 0.22, 0.5, 0.6); snd(T0(33) + 0.3, "heart_1", 0.3); snd(T0(33) + 0.5, "heart_2", 0.22); snd(T0(33) + 1.5, "heart_1", 0.3); snd(T0(33) + 1.7, "heart_2", 0.22); snd(wd(184) - 0.1, "snap_low", 0.4);
hum(T0(34) + 0.1, 3.7, 0.28, 1.2, 0.7); beats(T0(34) + 0.2, T1(34) - 0.1, 0.71, 0.6, 0.35, 0.5); twinkles(T0(34) + 0.6, 10, 0.3, 0.16); snd(wd(198) - 0.05, "bell_long", 0.35);
// -- 35-37 · no words, no arms: rain on the window, a whimper, a sniffle; then the quiet: the rain fades and only the clock and his soft steps remain
snd(T0(35), "rain", 0.5, { dur: 4.2, fadeIn: 0.5, fadeOut: 0.6 }); snd(T0(35) + 3.6, "rain", 0.45, { dur: 2.2, fadeIn: 0.6, fadeOut: 1.4 });
snd(T0(35) + 0.3, "sniffle_1", 0.2, { pan: -0.4 }); snd(T0(35) + 0.8, "whimper_b", 0.18, { rate: 0.9, pan: 0.3 }); pip(T0(35) + 0.2, 0, 0.2);
snd(wd(211) - 0.1, "snap_low", 0.35); snd(T0(36) + 0.5, "sniffle_3", 0.2, { pan: -0.4 }); snd(wd(216) - 0.3, "thump", 0.3, { rate: 0.6 }); snd(wd(216), "breath_out", 0.22, { rate: 0.9 }); paws(T0(36) + 0.8, 3, 0.2, 0.14);
pads(T0(37) + 0.1, 6, 0.17, 0.22); snd(T0(37) + 1.1, "thump", 0.18, { rate: 0.8 }); pip(wd(222) - 0.15, 2, 0.14); snd(T0(37) + 1.3, "breath_out", 0.12, { rate: 1.2 });
// -- 38-40 · sunrise: a rooster, birds, a swell; the bridge of twinkles; bells on "loved"; his tail; the last sigh into the first frame
snd(T0(38) + 0.1, "rooster", 0.22, { pan: 0.5 }); snd(T0(38) + 0.35, "thrush_a", 0.2, { pan: 0.3 }); snd(T0(38) + 0.9, "thrush_b", 0.18, { pan: -0.3 }); snd(T0(38) + 1.5, "thrush_c", 0.18, { pan: 0.2 });
hum(T0(38) + 0.1, 2.7, 0.28, 1.2, 0.5); snd(wd(225) - 0.05, "bell_1", 0.25); twinkles(T0(38) + 1.2, 12, 0.14, 0.16, { climb: 0.015 });
twinkles(T0(39) + 0.1, 6, 0.2, 0.15); snd(wd(238) - 0.1, "bell_2", 0.35); snd(wd(238) + 0.05, "bell_1", 0.3); snd(wd(238) + 0.2, "bell_3", 0.25); twinkles(T0(39) + 0.9, 6, 0.14, 0.16);
for (let i = 0; i < 4; i++) snd(T0(39) + 1.3 + i * 0.17, "thump", 0.12, { rate: 1.5 }); snd(wd(240) - 0.1, "whimper_a", 0.14, { rate: 1.2 }); beats(T0(39) + 0.2, T1(39) - 0.1, 0.85, 0.85, 0.22, 0.25);
snd(T0(40) + 0.1, "breath_out", 0.2, { rate: 1.3, dur: 0.4, fadeOut: 0.25 });

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
window.__dbg = { scene, camera, dog, owner, STARTS, DURATION, SHOTS };
short.start();
