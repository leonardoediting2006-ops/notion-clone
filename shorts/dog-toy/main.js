import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { loadAvatar } from "../../js/avatar.js";
import {
  loadProp, useEnvironment, captureEnvironment,
  bookshelf, tvUnit, coffeeTable, floorLamp, wallClock, cushion, wallArt, shoes,
} from "../../js/props.js";
import { createDog } from "../../js/dog.js";
import { createToy } from "./toy.js";
import { tennisBall, ropeToy } from "../../js/toys.js";
import { loadSrt, cues, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Why your dog grabs a toy when you come home" — pet-POV short with a voiceover, 60 fps.
// Every cut and action is keyed to a word of voiceover.srt (at("word")); shots are pure
// functions of time, so preview, scrubbing and the render always match.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
const at = cues(words);
const DURATION = Math.ceil((words.at(-1).end + 0.6) * FPS) / FPS;

const short = createShort({ duration: DURATION, fps: FPS, lights: false, fov: 50 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.02;
camera.far = 1500;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.45);

// ---------- word cues (seconds) ----------
const C = {
  door: at("door"), and: at("and"), dog: at("dog"), rushes: at("rushes"), toy: at("toy"),
  but: at("but"), take: at("take"), it: at("it"), play: at("play"), fetch: at("fetch"),
  but2: at("but", 2), see: at("see"), arent: at("aren't"), game: at("game"),
  when2: at("when", 2), arrive: at("arrive"), dog2: at("dog", 2), experiences: at("experiences"),
  adrenaline: at("adrenaline"), spike: at("spike"), intense: at("intense"), their: at("their"),
  handle: at("handle"), joy: at("joy"), grabbing: at("grabbing"), toy2: at("toy", 2),
  is: at("is"), sensory: at("sensory"), pacifier: at("pacifier"), physical: at("physical"), anchor: at("anchor"),
  that2: at("that", 2), wild: at("wild"), bursting: at("bursting"), energy: at("energy"),
  into: at("into"), jaw: at("jaw"), so2: at("so", 2), control: at("control"),
  they4: at("they", 4), teasing: at("teasing"), toy3: at("toy", 3), theyre: at("they're"),
  holding: at("holding"), so3: at("so", 3), love: at("lover"), overwhelm: at("overwhelm"),
};
const LINES = [
  "When you walk", "through the door", "and your dog", "rushes to grab a toy", "but won't actually",
  "let you take it,", "you probably think", "they want to play fetch.", "But you see,", "they aren't asking",
  "for a game.", "When you arrive,", "your dog experiences", "an adrenaline spike", "so intense,",
  "their body doesn't know", "how to handle the joy.", "Grabbing that toy", "is a sensory", "pacifier,",
  "a physical anchor", "that channels", "all that wild,", "bursting energy", "into their jaw",
  "so they don't", "lose control.", "They aren't teasing", "you with a toy.", "They're literally",
  "holding onto something", "so their lover", "you doesn't", "overwhelm them.",
];

// ---------- helpers ----------
const plain = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return plain.get(key);
};
const asMat = (m) => (typeof m === "number" ? mat(m) : m);
function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  const me = new THREE.Mesh(geo, asMat(m));
  me.position.set(x, y, z);
  parent?.add(me);
  return me;
}
function floorPlane(w, d, m, x, y, z, parent) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  const me = new THREE.Mesh(geo, asMat(m));
  me.rotation.x = -Math.PI / 2;
  me.position.set(x, y, z);
  parent?.add(me);
  return me;
}
function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, asMat(m));
  me.position.set(x, y, z);
  parent?.add(me);
  return me;
}
function group(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}
const place = (obj, x, y, z, ry = 0, parent = house) => {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  parent.add(obj);
  return obj;
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = {
  out: gsap.parseEase("power2.out"),
  in: gsap.parseEase("power2.in"),
  inOut: gsap.parseEase("sine.inOut"),
  back: gsap.parseEase("back.out(2.2)"),
  snap: gsap.parseEase("expo.out"),
};
let seed = 21;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rand() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- materials ----------
const tex = (f, repeat, color = true) => short.loadTexture(`../../assets/textures/${f}`, { repeat, color });
const M = {
  hardwood: new THREE.MeshStandardMaterial({
    map: tex("hardwood2_diffuse.jpg", [1 / 3, 1 / 1.5]),
    bumpMap: tex("hardwood2_bump.jpg", [1 / 3, 1 / 1.5], false),
    bumpScale: 1.5,
    roughness: 0.45,
  }),
  grass: new THREE.MeshStandardMaterial({ map: tex("grass.jpg", [1 / 3, 1 / 3]), roughness: 1 }),
  wall: T.plaster(0xe9ddc9, [0.5, 0.5]),
  accent: T.plaster(0x8fa7a0, [0.5, 0.5]),
  ceiling: T.plaster(0xf5f1ea, [0.5, 0.5]),
  trim: T.paintedWood(0xf5f2ec),
  door: T.paintedWood(0x4d7590),
  concrete: T.concrete({ tile: 1, repeat: [1, 1] }),
  rug: T.fabric(0xa65a3c, { repeat: [3, 3], weave: 5, key: "rug" }),
  bed: T.fabric(0x5f7f95, { repeat: [3, 3], weave: 4, key: "bed" }),
  bedInner: T.fabric(0xe9e1d2, { repeat: [3, 3], weave: 5, key: "bedin" }),
  wicker: T.fabric(0xb08a55, { repeat: [6, 3], weave: 8, key: "wicker" }),
  doormat: T.fabric(0x6b5338, { repeat: [4, 3], weave: 3, key: "mat" }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.25 }),
  outdoor: new THREE.MeshBasicMaterial({ map: T.skyTexture("day"), fog: false }),
  window: new THREE.MeshBasicMaterial({ color: 0xf1f6ff }),
  iron: new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.8, roughness: 0.35 }),
};

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 0.8);
scene.add(hemi);
// afternoon sun outside the front door: pours in when it opens
const sun = new THREE.DirectionalLight(0xffe2b5, 4.2);
sun.position.set(6.5, 5.5, 9);
sun.target.position.set(1.4, 0, -2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const ceilingLight = new THREE.SpotLight(0xffe8cc, 30, 10, 1.25, 0.8, 1.4);
ceilingLight.position.set(0, 2.62, -2.8);
ceilingLight.target.position.set(0, 0, -2.8);
ceilingLight.castShadow = true;
ceilingLight.shadow.mapSize.set(1024, 1024);
ceilingLight.shadow.bias = -0.0005;
scene.add(ceilingLight, ceilingLight.target);
const windowLight = new THREE.PointLight(0xdbe8ff, 8, 7, 1.5);
windowLight.position.set(-2.9, 1.6, -3);
scene.add(windowLight);
const fill = new THREE.PointLight(0xfff0e0, 0, 6, 1.5); // per-shot face light
scene.add(fill);

// ================= HOUSE: living room x -3.5..3.5, z -6..0; front door in z = 0 at x ≈ 2.1 ======
const house = group(0, 0, 0, scene);
const H = 2.7;
const W = {};
const DOOR_X = 2.1, DOOR_W = 1.0;
floorPlane(7, 6, M.hardwood, 0, 0.002, -3, house);
box(7.2, 0.06, 6.2, M.ceiling, 0, H + 0.03, -3, house);
W.back = box(7, H, 0.1, M.accent, 0, H / 2, -6.05, house);
W.right = box(0.1, H, 6, M.wall, 3.55, H / 2, -3, house);
W.left = group(0, 0, 0, house);
// left wall with a big window
box(0.1, 0.85, 6, M.wall, -3.55, 0.425, -3, W.left);
box(0.1, 0.5, 6, M.wall, -3.55, 2.45, -3, W.left);
box(0.1, 1.35, 2.0, M.wall, -3.55, 1.525, -5.0, W.left);
box(0.1, 1.35, 2.0, M.wall, -3.55, 1.525, -1.0, W.left);
box(0.02, 1.35, 2.0, M.window, -3.57, 1.525, -3, W.left);
for (const z of [-4, -3, -2]) box(0.07, 1.35, 0.05, M.trim, -3.5, 1.525, z, W.left);
for (const y of [0.85, 2.2]) box(0.14, 0.06, 2.1, M.trim, -3.48, y, -3, W.left);
for (const z of [-4.3, -1.7]) box(0.05, 2.2, 0.55, T.fabric(0xd8cdb8, { key: "drape", weave: 3 }), -3.45, 1.35, z, W.left);
// front wall with the door opening
W.front = group(0, 0, 0, house);
const leftW = DOOR_X - DOOR_W / 2 + 3.5, rightW = 3.5 - (DOOR_X + DOOR_W / 2);
box(leftW, H, 0.12, M.wall, -3.5 + leftW / 2, H / 2, 0.06, W.front);
box(rightW, H, 0.12, M.wall, 3.5 - rightW / 2, H / 2, 0.06, W.front);
box(DOOR_W, H - 2.2, 0.12, M.wall, DOOR_X, 2.2 + (H - 2.2) / 2, 0.06, W.front);
for (const s of [-1, 1]) box(0.09, 2.25, 0.18, M.trim, DOOR_X + s * (DOOR_W / 2 + 0.04), 1.125, 0.0, W.front);
box(DOOR_W + 0.17, 0.09, 0.18, M.trim, DOOR_X, 2.245, 0, W.front);
// skirting
for (const [w, d, x, z] of [[7, 0.03, 0, -5.98], [0.03, 6, 3.48, -3], [0.03, 6, -3.48, -3]]) box(w, 0.12, d, M.trim, x, 0.06, z, house);
// the front door, hinged at its left edge, opens inward (-z)
const door = group(DOOR_X + DOOR_W / 2 - 0.02, 0, -0.02, house);
box(DOOR_W - 0.04, 2.18, 0.05, M.door, -(DOOR_W - 0.04) / 2, 1.09, 0, door);
for (const [y, h] of [[0.55, 0.75], [1.55, 0.85]]) for (const s of [-1, 1]) box(0.7, h, 0.012, M.door, -(DOOR_W - 0.04) / 2, y, s * 0.03, door);
for (const s of [-1, 1]) {
  const knob = mesh(new THREE.SphereGeometry(0.032, 16, 12), M.brass, -(DOOR_W - 0.13), 1.0, s * 0.06, door);
  mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 8).rotateX(Math.PI / 2), M.brass, 0, 0, -s * 0.03, knob);
}
const doorHit = (open) => (door.rotation.y = -open * 1.6);
// outside: porch, garden, sky (bright, it's sunny out there)
const outside = group(0, 0, 0, scene);
floorPlane(3, 2.5, M.concrete, DOOR_X, 0.0, 1.3, outside);
floorPlane(40, 30, M.grass, 0, -0.02, 16, outside);
const skyWall = mesh(new THREE.PlaneGeometry(60, 30), M.outdoor, 0, 10, 24, outside);
skyWall.rotation.y = Math.PI;
const forest = createForest(outside);
for (let i = 0; i < 12; i++) forest.tree(-14 + i * 2.6 + rr(-0.6, 0.6), rr(9, 12), { height: rr(2.6, 3.4), scale: rr(1.2, 1.6) });
for (let i = 0; i < 8; i++) forest.bush(-3 + i * 1.4, 3.2 + rr(0, 0.6), rr(1, 1.5));
forest.build();
// coat hooks, doormat, shoe
box(0.6, 0.08, 0.03, T.paintedWood(0x5a3d28), 3.15, 1.65, -0.02 - 0.03, house);
for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8).rotateX(Math.PI / 2 - 0.4), M.brass, 2.95 + i * 0.2, 1.64, -0.08, house);
box(0.6, 0.85, 0.18, T.fabric(0x8a6a4a, { key: "coat", weave: 3 }), 3.15, 1.2, -0.13, house); // hanging coat
box(0.95, 0.015, 0.6, M.doormat, DOOR_X, 0.008, -0.45, house);

// furniture
place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.5 }), 0.4, 0, -5.55);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.3 }), -3.05, 0, -5.55);
place(loadProp(short, "SpecularSilkPouf", { height: 0.42 }), 2.35, 0, -2.25);
place(loadProp(short, "ChairDamaskPurplegold", { height: 0.95 }), -2.6, 0, -1.05, 2.3);
place(bookshelf({ w: 1.15, h: 1.95 }), -1.8, 0, -5.99);
place(floorLamp(), -0.95, 0, -5.65);
place(coffeeTable(), -1.15, 0, -4.45, 0.08);
place(tvUnit(), 3.48, 0, -3.7, -Math.PI / 2);
place(wallArt({ w: 0.95, h: 0.6, style: "landscape", seed: 2 }), 3.5, 1.8, -3.7, -Math.PI / 2);
place(wallArt({ w: 0.5, h: 0.7, style: "abstract", seed: 4 }), -3.5, 1.6, -5.15, Math.PI / 2);
place(wallArt({ w: 0.45, h: 0.6, style: "sunset", seed: 5 }), -3.5, 1.55, -0.85, Math.PI / 2);
place(wallArt({ w: 0.4, h: 0.5, style: "abstract", seed: 9 }), 3.5, 1.5, -1.6, -Math.PI / 2);
place(wallClock({ hours: 17.35 }), -1.4, 2.0, -0.01, Math.PI);
place(shoes(), 2.75, 0, -0.35, Math.PI - 0.3);
place(shoes({ color: 0xd8d2c8 }), 2.95, 0, -0.75, Math.PI + 0.4);
for (const [x, c, r] of [[-0.45, 0xc9783a, 0.15], [0.05, 0x3d6b7a, -0.1], [1.25, 0xe2d5bd, 0.2]]) {
  const cu = place(cushion({ color: c }), x, 0.66, -5.78);
  cu.rotation.set(-0.3, 0, r);
}
box(0.5, 0.52, 0.42, T.paintedWood(0x5a3d28), 2.35, 0.26, -5.65, house);
place(loadProp(short, "GlassVaseFlowers", { height: 0.42 }), 2.35, 0.52, -5.65);
box(1.5, 0.95, 0.04, T.paintedWood(0x2e2018), 0.4, 1.75, -5.99, house);
box(1.36, 0.81, 0.01, T.leaves(1), 0.4, 1.75, -5.965, house);
floorPlane(3.4, 2.3, M.rug, 0, 0.008, -3.0, house);
mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xfff3e0 }), 0, H - 0.02, -2.8, house);

// dog bed (round, padded rim)
const BED = V(1.55, 0, -4.35);
{
  const g = group(BED.x, 0, BED.z, house);
  const rim = mesh(new THREE.TorusGeometry(0.42, 0.13, 16, 40), M.bed, 0, 0.12, 0, g);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1.15, 1);
  const cushion = mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.09, 40), M.bedInner, 0, 0.05, 0, g);
  cushion.scale.z = 1.15;
}
// toy basket (wicker) with toys poking out
const BASKET = V(-2.85, 0, -3.7);
const AT_BASKET = V(-2.32, 0, -2.24); // where the dog stands to reach into the basket (facing it)
const BASKET_RY = Math.atan2(BASKET.x - AT_BASKET.x, BASKET.z - AT_BASKET.z);
{
  const g = group(BASKET.x, 0, BASKET.z, house);
  const b = mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.32, 32, 1, true), M.wicker, 0, 0.16, 0, g);
  b.material.side = THREE.DoubleSide;
  mesh(new THREE.CircleGeometry(0.24, 32).rotateX(-Math.PI / 2), M.wicker, 0, 0.01, 0, g);
  mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 40).rotateX(Math.PI / 2), T.fabric(0x8a6a3a, { key: "wrim", weave: 4 }), 0, 0.32, 0, g);
  const ball = tennisBall();
  ball.position.set(0.1, 0.3, 0.08);
  g.add(ball);
  const rope = ropeToy();
  rope.position.set(-0.05, 0.33, -0.02);
  rope.rotation.set(0.4, 0.6, 0.9);
  g.add(rope);
}
const floorBall = tennisBall();
floorBall.position.set(0.9, 0.033, -2.2);
house.add(floorBall);

// ================= MIND: calm dream space (pacifier / anchor) =================
const SPACE_Y = 600;
{
  const pos = [], col = [];
  const cA = new THREE.Color(0xffc4e6), cB = new THREE.Color(0x9fd0ff), cC = new THREE.Color(0xffffff);
  for (let i = 0; i < 3000; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = 25 + rand() * 60;
    const sq = Math.sqrt(1 - u * u);
    pos.push(Math.cos(th) * sq * r, SPACE_Y + u * r, Math.sin(th) * sq * r);
    const c = [cA, cB, cC][i % 3];
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true })));
}
// soft nebula clouds (big additive sprites)
function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GLOW = glowTexture();
for (const [x, y, z, s, c] of [[-9, 4, -14, 26, 0xff7ac0], [10, -3, -16, 30, 0x5a8cff], [2, 8, -20, 22, 0xb07aff], [-4, -7, -12, 18, 0x4fd3c8]]) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.position.set(x, SPACE_Y + y, z);
  sp.scale.setScalar(s);
  scene.add(sp);
}
const spaceKey = new THREE.PointLight(0xffd6f0, 25, 0, 2);
spaceKey.position.set(2, SPACE_Y + 3, 3);
const spaceRim = new THREE.PointLight(0x8fb0ff, 30, 0, 2);
spaceRim.position.set(-2, SPACE_Y + 2, -2.5);
scene.add(spaceKey, spaceRim);
// a ship's anchor on a chain (the "physical anchor")
const anchor = group(0, SPACE_Y - 3, 0, scene);
{
  const shank = mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.2, 16), M.iron, 0, 0, 0, anchor);
  shank.castShadow = true;
  mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 24), M.iron, 0, 1.25, 0, anchor);
  mesh(new THREE.BoxGeometry(0.9, 0.11, 0.11), M.iron, 0, 0.75, 0, anchor); // stock
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.08, 12, 8), M.iron, s * 0.47, 0.75, 0, anchor);
  const arms = mesh(new THREE.TorusGeometry(0.75, 0.075, 12, 40, Math.PI), M.iron, 0, -0.35, 0, anchor);
  arms.rotation.z = Math.PI;
  for (const s of [-1, 1]) {
    const fluke = mesh(new THREE.ConeGeometry(0.2, 0.42, 4), M.iron, s * 0.75, -0.2, 0, anchor);
    fluke.scale.z = 0.35;
    fluke.rotation.z = s * -0.35;
  }
}
const chain = [];
for (let i = 0; i < 22; i++) {
  const link = mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14), M.iron, 0, 0, 0, scene);
  link.scale.y = 1.6;
  chain.push(link);
}

// ================= cast =================
const dog = createDog();
scene.add(dog);
const toy = createToy(short);
// the toy is held crosswise in the mouth: its middle between the jaws
const toyHome = { parent: null };
function toyIn(where, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  if (where === "mouth") {
    if (toy.parent !== dog.mouth) dog.mouth.add(toy);
    toy.position.set(0, 0.0, -0.07);
    toy.rotation.set(0, Math.PI / 2, 0); // crosswise: plush sticks out to the dog's left/right
  } else {
    if (toy.parent !== where) where.add(toy);
    toy.position.set(x, y, z);
    toy.rotation.set(rx, ry, rz);
  }
}
const owner = loadAvatar(short, "Male_Adult_08");
owner.loadClip("m_walk_neutral_01");
house.add(owner);

// energy particles (wild, bursting energy channelled into the jaw)
const N_SPARK = 600;
const sparkGeo = new THREE.BufferGeometry();
const sparkPos = new Float32Array(N_SPARK * 3);
sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
const sparkMat = new THREE.PointsMaterial({ map: glowTexture("rgba(255,240,170,1)", "rgba(255,140,30,0)"), size: 0.07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc04a });
const sparks = new THREE.Points(sparkGeo, sparkMat);
sparks.frustumCulled = false;
scene.add(sparks);
const sparkSeed = Array.from({ length: N_SPARK }, () => [rand(), rand(), rand(), rand()]);

// ---------- shadows ----------
scene.traverse((o) => {
  if (!o.isMesh) return;
  const basic = o.material?.isMeshBasicMaterial;
  o.castShadow = !basic;
  o.receiveShadow = !basic;
});

// ---------- overlays ----------
const captions = wordCaptions(document.getElementById("caption"), words, {
  lines: LINES,
  clean: (s) => s.toLowerCase().replace(/[.,!?;:]/g, "").replace(/^lover$/, "love for"),
});
const flashEl = document.getElementById("flash");
const pulseEl = document.getElementById("pulse");
const ekgEl = document.getElementById("ekg");
const ekgPath = document.getElementById("ekg-line");
const bpmEl = document.getElementById("bpm");
function flash(t, start, dur, color = "#fff", peak = 1) {
  const p = (t - start) / dur;
  if (p < 0 || p > 1) return;
  flashEl.style.background = color;
  flashEl.style.opacity = String(peak * (1 - p) ** 2);
}
// heart monitor: a scrolling trace whose beats get faster and taller, spiking off the chart
function ekg(t, t0) {
  const W = 900, Hh = 260, mid = 150;
  const bpmAt = (u) => 70 + 150 * prog(u, C.adrenaline, C.spike + 0.15) + 40 * prog(u, C.spike, C.spike + 0.4);
  let d = "";
  for (let i = 0; i <= 180; i++) {
    const u = t - (180 - i) * 0.012; // 2.2 s of history across the screen
    const period = 60 / bpmAt(u);
    const ph = ((u - t0) / period) % 1;
    const big = 1 + 2.4 * prog(u, C.spike - 0.05, C.spike + 0.05);
    let y = 0;
    if (ph > 0.1 && ph < 0.14) y = -12;
    else if (ph > 0.18 && ph < 0.2) y = 18;
    else if (ph >= 0.2 && ph < 0.23) y = -105 * big;
    else if (ph >= 0.23 && ph < 0.26) y = 40 * big;
    else if (ph > 0.4 && ph < 0.5) y = -16 * Math.sin(((ph - 0.4) / 0.1) * Math.PI);
    d += `${i ? "L" : "M"}${(i / 180) * W},${Math.max(-140, Math.min(Hh, mid + y))}`;
  }
  ekgPath.setAttribute("d", d);
  bpmEl.textContent = Math.round(bpmAt(t));
}

function look(px, py, pz, tx, ty, tz, fov = 50) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
}
const face = (d = dog, lx = 0, ly = 0.13, lz = 0.2) => {
  d.updateMatrixWorld(true);
  return d.head.localToWorld(V(lx, ly, lz));
};
function orbit(target, yaw, dist, height, fov, lookY = 0) {
  look(target.x + Math.sin(yaw) * dist, target.y + height, target.z + Math.cos(yaw) * dist, target.x, target.y + lookY, target.z, fov);
}
// camera looking at the midpoint of a and b from the side (yaw), far enough to fit both
function frame2(a, b, yaw, dist, height, fov, lookY = 0, w = 0.5) {
  orbit(a.clone().lerp(b, w), yaw, dist, height, fov, lookY);
}
const shake = (t, amt) => [Math.sin(t * 53) * amt + Math.sin(t * 31) * amt * 0.6, Math.cos(t * 47) * amt];

// ---------- environments ----------
const ENV = {};
let mode = "house";
function setEnv(kind, { exposure = 1.0, sunOn = true, warm = 0 } = {}) {
  mode = kind;
  const inHouse = kind === "house";
  renderer.toneMappingExposure = exposure;
  sun.visible = inHouse && sunOn;
  ceilingLight.visible = windowLight.visible = inHouse;
  spaceKey.visible = spaceRim.visible = kind === "space";
  scene.background = kind === "space" ? new THREE.Color(0x05040c) : new THREE.Color(0x101014);
  hemi.color.set(kind === "space" ? 0xd8c8ff : new THREE.Color(0xfff4e6).lerp(new THREE.Color(0xffc890), warm));
  hemi.intensity = kind === "space" ? 1.1 : 0.8 + warm * 0.4;
  fill.intensity = 0;
}
function captureEnvs() {
  ENV.studio = scene.environment;
  hideCast();
  doorHit(1);
  setEnv("house");
  ENV.room = captureEnvironment(renderer, scene, V(0, 1.4, -2.8));
}
function hideCast() {
  dog.pose({ z: -60 });
  owner.position.set(0, 0, -60);
}

// ---------- poses ----------
const walk = (p, phase) => p.play("m_walk_neutral_01", phase / 7);
function ownerWalkIn(z, phase) {
  owner.position.set(DOOR_X, 0, z);
  owner.rotation.set(0, Math.PI, 0);
  walk(owner, phase);
}
// standing just inside the door, facing into the room; reach 0..1 bends down toward the dog
function ownerStand({ x = DOOR_X - 0.2, z = -1.1, ry = Math.PI + 0.35, reach = 0, pat = 0, t = 0, crouch = 0 } = {}) {
  owner.resetPose();
  owner.position.set(x, 0, z);
  owner.rotation.set(0, ry, 0);
  const r = reach;
  owner.spine.rotation.x = 0.55 * r + 0.25 * crouch;
  owner.pelvis.rotation.x = 0.3 * r + 0.45 * crouch;
  owner.pelvis.position.y = 0.93 - 0.32 * crouch;
  owner.legL.rotation.x = owner.legR.rotation.x = -0.3 * r - 1.15 * crouch;
  owner.kneeL.rotation.x = owner.kneeR.rotation.x = 1.9 * crouch;
  owner.ankleL.rotation.x = owner.ankleR.rotation.x = -0.6 * crouch;
  owner.head.rotation.x = 0.35 * r + 0.25 * crouch + 0.2;
  owner.armR.rotation.set(-0.35 - 0.9 * r, 0, 0.1);
  owner.elbowR.rotation.set(-0.25 + 0.15 * r, 0.2, 0);
  owner.armL.rotation.set(-0.1 - 0.3 * r, 0, -0.1);
  owner.elbowL.rotation.set(-0.3, -0.2, 0);
  if (pat > 0) {
    // left hand resting on the dog's head, a gentle stroke
    owner.armL.rotation.set(-0.75 - Math.sin(t * 4) * 0.08 * pat, 0, 0.15);
    owner.elbowL.rotation.set(-0.35, -0.3, 0);
  }
}
// sitting on the sofa, looking down at the dog in front of you
const SEAT = V(0.2, 0, -5.38), SEAT_HIP_Y = 0.56;
function ownerSofa({ pat = 0, reach = 0, t = 0 } = {}) {
  owner.sit();
  owner.position.set(SEAT.x, SEAT_HIP_Y - owner.hipHeight, SEAT.z);
  owner.rotation.set(0, 0, 0);
  owner.spine.rotation.x = 0.12 + 0.15 * reach;
  owner.head.rotation.x = 0.38;
  // hands resting on the thighs
  owner.armL.rotation.set(-0.45, 0, -0.05);
  owner.armR.rotation.set(-0.45, 0, 0.05);
  owner.elbowL.rotation.set(-0.75, -0.2, 0);
  owner.elbowR.rotation.set(-0.75, 0.2, 0);
  if (pat > 0) {
    // left hand on the dog's head, stroking slowly
    owner.armL.rotation.set(-1.0 - Math.sin(t * 3.2) * 0.07 * pat, 0, -0.18);
    owner.elbowL.rotation.set(-0.45 + Math.sin(t * 3.2) * 0.06, -0.35, 0);
  }
  if (reach > 0) {
    // right hand reaching out, palm open, for the toy
    owner.armR.rotation.set(lerp(-0.45, -1.2, reach), 0, lerp(0.05, -0.1, reach));
    owner.elbowR.rotation.set(lerp(-0.75, -0.2, reach), 0.3, 0);
  }
}
const ownerHand = (side = "R") => {
  owner.updateMatrixWorld(true);
  return owner.bones?.[`Bip01_${side}_Hand`].getWorldPosition(V()) ?? V();
};

// ---------- reset ----------
function resetWorld() {
  hideCast();
  owner.resetPose();
  dog.pivot.scale.set(1, 1, 1);
  doorHit(0);
  door.visible = true;
  for (const w of Object.values(W)) w.visible = true;
  toyIn(house, { x: BASKET.x + 0.02, y: 0.36, z: BASKET.z + 0.05, rx: 0.2, ry: 0.5, rz: 0.35 });
  toy.squish(0);
  toy.flop(0, 0);
  anchor.visible = false;
  chain.forEach((l) => (l.visible = false));
  sparks.visible = false;
  flashEl.style.opacity = "0";
  pulseEl.style.opacity = "0";
  ekgEl.style.display = "none";
  floorBall.visible = true;
}

// ---------- shots ----------
const SHOTS = [
  // "When you walk through the door" — inside, low: the door swings open, you step into the light
  [0, (lt, t) => {
    setEnv("house", { exposure: 1.0 });
    doorHit(ease.inOut(prog(t, 0.1, 0.75)));
    ownerWalkIn(lerp(1.2, -0.15, prog(t, 0.45, C.and)), t * 7);
    const [sx, sy] = shake(t, 0.003);
    look(0.2 + sx, 0.5 + sy, -3.3, DOOR_X - 0.1, 1.1, 0, 44);
  }],
  // "and your dog" — asleep in its bed; head snaps up, ears perk on "dog"
  [C.and, (lt, t) => {
    setEnv("house");
    doorHit(1);
    const up = ease.back(prog(t, C.dog, C.dog + 0.22));
    dog.pose({ x: BED.x, y: 0.08, z: BED.z, ry: 0.35, lie: 1, headPitch: lerp(0.45, -0.15, up), headYaw: up * 0.25, earUp: up * 0.8, closed: 1 - up, cute: up, pupil: 1 + up * 0.3, t: lt });
    orbit(face(), 0.35 - 0.45, 1.35 - lt * 0.2, 0.1, 40, -0.04);
  }],
  // "rushes to grab a" — full sprint across the room to the toy basket
  [C.rushes, (lt, t) => {
    setEnv("house");
    doorHit(1);
    const p = ease.inOut(prog(t, C.rushes, C.toy - 0.08));
    const from = V(BED.x - 0.5, 0, BED.z + 0.4), to = AT_BASKET.clone();
    const pos = from.clone().lerp(to, p);
    const ry = Math.atan2(to.x - from.x, to.z - from.z);
    dog.pose({ x: pos.x, z: pos.z, ry, trot: 1.35 * (1 - prog(t, C.toy - 0.2, C.toy)), trotSpeed: 19, t: lt, earBack: 0.6, jawOpen: 0.35, wag: 1, wagSpeed: 26, headPitch: -0.1 });
    const [sx, sy] = shake(t, 0.006);
    look(pos.x + 0.6 + sx, 0.5 + sy, pos.z + 2.7, pos.x - 0.35, 0.4, pos.z, 46);
  }],
  // "toy" — the snatch: jaws close on the plush and it comes up out of the basket
  [C.toy, (lt, t) => {
    setEnv("house");
    doorHit(1);
    const grab = ease.snap(prog(t, C.toy, C.toy + 0.12));
    const lift = ease.out(prog(t, C.toy + 0.1, C.but));
    dog.pose({ x: AT_BASKET.x, z: AT_BASKET.z, ry: BASKET_RY, headPitch: 0.75 - lift * 0.9, jawOpen: (1 - grab) * 0.9, wag: 1, wagSpeed: 26, t: lt, earUp: 0.5, pupil: 1.25 });
    if (grab > 0.5) {
      toyIn("mouth");
      toy.squish(0.6);
      toy.flop(Math.sin(lt * 18) * (1 - lift) * 0.8, 0.7);
    }
    orbit(face(), BASKET_RY + 0.45, 1.25, 0.12, 40, -0.12);
  }],
  // "but won't actually let you take it," — keep-away: you reach, the head swings away on "take"
  [C.but, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    const reach = ease.inOut(prog(t, C.but, C.take + 0.1));
    ownerStand({ reach });
    const dodge = ease.snap(prog(t, C.take, C.take + 0.18));
    dog.pose({ x: 1.3, z: -2.45, ry: 0.46, headYaw: dodge * 0.9, headPitch: -0.15, wag: 1, wagSpeed: 22, t: lt, earUp: 0.4, cute: 0.6, jawOpen: 0.05 });
    toyIn("mouth");
    toy.squish(0.5);
    toy.flop(-dodge * 0.9 + Math.sin(lt * 9) * 0.15, 0.7);
    frame2(face(), V(DOOR_X - 0.2, 0.95, -1.1), -1.35, 3.8, 0.1, 44, -0.05, 0.3);
  }],
  // "you probably think they want to play" — play bow, bum in the air, tail going
  [C.it, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    const bow = ease.back(prog(lt, 0.05, 0.35));
    dog.pose({ x: DOOR_X - 0.45, z: -2.1, ry: 0.35, bow, wag: 1, wagSpeed: 24, t: lt, earUp: 0.6, cute: 1, headPitch: -0.2, tilt: 0.2 * Math.sin(lt * 3) });
    toyIn("mouth");
    toy.squish(0.4);
    toy.flop(Math.sin(lt * 7) * 0.25, 0.8);
    orbit(face(), 0.35 - 0.45, 1.5, -0.04, 44, -0.15);
  }],
  // "fetch." — the game you imagine: the toy sailing across the room in slow motion
  [C.fetch, (lt, t) => {
    setEnv("house", { exposure: 1.15, warm: 0.4 });
    doorHit(1);
    const p = prog(t, C.fetch, C.but2);
    toyIn(house, { x: lerp(1.2, -0.6, p), y: 1.2 + Math.sin(p * Math.PI) * 0.35, z: -2.3, rx: p * 2.5, ry: 0.4, rz: p * 4 });
    toy.flop(Math.sin(p * 9) * 0.6, 0.2);
    const tp = toy.getWorldPosition(V());
    look(tp.x + 0.2, tp.y - 0.1, tp.z + 1.1, tp.x, tp.y, tp.z, 40);
    flash(t, C.fetch, 0.3, "#fff6dc", 0.35);
  }],
  // "But you see, they aren't asking for a game." — a slow, firm head shake, toy flapping
  [C.but2, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    const no = prog(t, C.arent, C.arent + 0.7);
    const shakeYaw = Math.sin(no * Math.PI * 4) * 0.4 * (1 - no * 0.4) * (no > 0 && no < 1 ? 1 : 0);
    const wise = ease.out(prog(t, C.game, C.game + 0.25));
    dog.pose({ x: -0.2, z: -2.6, ry: 0.15, sit: 1, headYaw: shakeYaw, squint: wise * 0.4, t: lt, earUp: 0.3, wag: 0.3 });
    toyIn("mouth");
    toy.squish(0.4);
    toy.flop(-shakeYaw * 2.2, 0.8);
    orbit(face(), 0.15, 1.55 - lt * 0.15, 0.02, 40, -0.1);
  }],
  // "When you arrive," — you again, slow motion in the doorway, backlit
  [C.when2, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    doorHit(ease.out(prog(t, C.when2 - 0.1, C.arrive + 0.15)));
    ownerWalkIn(lerp(0.9, 0.2, prog(t, C.when2, C.dog2)), lt * 3);
    look(DOOR_X - 0.7, 0.3, -2.4, DOOR_X, 1.25, 0.2, 42);
  }],
  // "your dog" — the face: pupils go huge
  [C.dog2 - 0.15, (lt, t) => {
    setEnv("house");
    doorHit(1);
    const big = ease.out(prog(t, C.dog2, C.experiences));
    dog.pose({ x: -0.5, z: -2.4, ry: 0.65, earUp: 0.9, pupil: 1 + big * 0.55, cute: 1, t: lt, headPitch: -0.15 });
    orbit(face(), 0.65, 1.45 - big * 0.35, 0.03, 42, -0.06);
  }],
  // "experiences an adrenaline" — into the eye, red pulse, heart monitor speeding up
  [C.experiences, (lt, t) => {
    setEnv("house");
    doorHit(1);
    dog.pose({ x: -0.5, z: -2.4, ry: 0.65, earUp: 0.9, pupil: 1.55 + 0.1 * Math.sin(t * 20), cute: 1, t, shiver: 0.3 * prog(t, C.adrenaline, C.spike) });
    const eye = dog.eyes[1].getWorldPosition(V());
    const p = ease.inOut(prog(t, C.experiences, C.spike));
    const f = face();
    orbit(eye, 0.65 + 0.2, lerp(1.25, 0.75, p), 0.02, lerp(34, 28, p), -0.02);
    ekgEl.style.display = "block";
    ekg(t, C.experiences);
    const beat = 0.5 + 0.5 * Math.sin(t * (6 + 10 * p));
    pulseEl.style.opacity = String((0.25 + 0.35 * p) * beat);
  }],
  // "spike so intense," — the monitor spikes off the chart; the whole dog vibrates
  [C.spike, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    dog.pose({ x: -0.5, z: -2.4, ry: 0.65, earUp: 1, pupil: 1.6, cute: 1, t, shiver: 1, wag: 1, wagSpeed: 40, jawOpen: 0.25 });
    const [sx, sy] = shake(t, 0.02 * (1 - prog(t, C.spike + 0.3, C.their)));
    const zoom = ease.snap(prog(t, C.intense, C.intense + 0.3));
    orbit(face(), 0.65 + 0.4 + sx, 2.1 - zoom * 0.6, 0.35 + sy, 46, 0.1);
    ekgEl.style.display = "block";
    ekg(t, C.experiences);
    flash(t, C.spike, 0.25, "#ff2a2a", 0.45);
    pulseEl.style.opacity = String(0.55 * (0.5 + 0.5 * Math.sin(t * 22)));
  }],
  // "their body doesn't know how to handle the joy." — zoomies round the rug, a leap on "joy"
  [C.their, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    ownerStand({ x: 1.6, z: -0.9, ry: Math.PI + 0.6 });
    const a = lt * 4.4;
    const R = 1.0;
    const cx = 0, cz = -3.0;
    const jump = Math.sin(prog(t, C.joy - 0.05, C.joy + 0.4) * Math.PI);
    dog.pose({ x: cx + Math.cos(a) * R, y: jump * 0.45, z: cz + Math.sin(a) * R, ry: -a, trot: 1.3, trotSpeed: 20, t: lt, earBack: 0.7, jawOpen: 0.4, wag: 1, wagSpeed: 30, rear: jump * 0.3, tilt: -0.15 });
    door.visible = false; // (just out of shot, would block the lens)
    look(2.9, 1.15, -0.8, 0, 0.3, -3.1, 50);
  }],
  // "Grabbing that toy" — skid, snatch from the rug, slow motion
  [C.grabbing, (lt, t) => {
    setEnv("house", { exposure: 1.05 });
    doorHit(1);
    const TOYPOS = V(0.55, 0.06, -2.4);
    const slide = ease.out(prog(t, C.grabbing, C.toy2));
    const grab = ease.snap(prog(t, C.toy2, C.toy2 + 0.1));
    dog.pose({ x: lerp(-0.8, TOYPOS.x - 0.95, slide), z: TOYPOS.z, ry: Math.PI / 2, trot: (1 - slide) * 0.8, trotSpeed: 9, t: lt, headPitch: 0.75 - grab * 0.75, jawOpen: (1 - grab) * 0.95, earBack: 0.4 * (1 - grab), wag: 1, pupil: 1.4 });
    if (grab > 0.4) {
      toyIn("mouth");
      toy.squish(0.85);
      toy.flop(Math.sin(lt * 14) * 0.4, 0.7);
    } else {
      toyIn(house, { x: TOYPOS.x, y: 0.055, z: TOYPOS.z, ry: 0.3, rx: Math.PI / 2 });
      toy.flop(0, 0);
    }
    look(TOYPOS.x + 1.3, 0.3, TOYPOS.z + 1.25, TOYPOS.x - 0.45, 0.3, TOYPOS.z, 40);
  }],
  // "is a sensory pacifier," — inside: calm, floating, eyes heavy, toy held softly
  [C.is, (lt, t) => {
    setEnv("space");
    const calm = ease.inOut(prog(t, C.is, C.pacifier + 0.4));
    dog.pose({ y: SPACE_Y, sit: 1, closed: 0.2 + calm * 0.55, cute: 0.6, t: lt, wag: 0.2, wagSpeed: 5, headPitch: 0.05 - calm * 0.05, tilt: 0.12 * calm });
    dog.position.y += Math.sin(t * 1.6) * 0.04;
    toyIn("mouth");
    toy.squish(0.3);
    toy.flop(Math.sin(t * 1.6) * 0.15, 0.8);
    orbit(face(), 0.4 + lt * 0.18, 2.1, 0.05, 36, -0.35);
    flash(t, C.is, 0.35, "#ffffff", 0.8);
  }],
  // "a physical anchor" — literally: a ship's anchor drops onto its chain beneath the toy
  [C.physical, (lt, t) => {
    setEnv("space");
    dog.pose({ y: SPACE_Y, sit: 1, closed: 0.5, cute: 0.6, t: lt, wag: 0.2, wagSpeed: 5, headPitch: 0.05 });
    toyIn("mouth");
    toy.squish(0.35);
    toy.flop(0, 0.8);
    dog.updateMatrixWorld(true);
    const top = toy.getWorldPosition(V());
    const drop = ease.back(prog(t, C.physical, C.anchor + 0.05));
    const bottom = V(top.x + 0.05, top.y - lerp(0.3, 3.0, drop), top.z + 0.3);
    anchor.visible = true;
    anchor.position.set(bottom.x, bottom.y - 1.35, bottom.z);
    anchor.rotation.set(0, 0.6, Math.sin(t * 2.2) * 0.04 * (1 - prog(t, C.anchor, C.that2)));
    chain.forEach((l, i) => {
      const u = i / (chain.length - 1);
      l.visible = true;
      l.position.lerpVectors(top, bottom, u);
      l.rotation.set(0, (i % 2) * Math.PI / 2, 0);
    });
    const [sx, sy] = shake(t, 0.03 * prog(t, C.anchor, C.anchor + 0.04) * (1 - prog(t, C.anchor + 0.05, C.anchor + 0.35)));
    look(4.2 + sx, SPACE_Y - 1.0 + sy, 5.8, 0.1, SPACE_Y - 1.5, 0, 50);
  }],
  // "that channels all that wild, bursting energy" — energy erupts around the dog
  [C.that2, (lt, t) => {
    setEnv("house", { exposure: 1.0, warm: 0.3 });
    doorHit(1);
    dog.pose({ x: -0.2, z: -2.7, ry: 0.4, sit: 1, t, shiver: 0.6 * prog(t, C.wild, C.bursting), wag: 1, wagSpeed: 30, earUp: 0.7, pupil: 1.3, cute: 0.5 });
    toyIn("mouth");
    toy.squish(0.5);
    toy.flop(Math.sin(t * 13) * 0.2, 0.8);
    energy(t, { burst: prog(t, C.wild - 0.2, C.bursting + 0.3), suck: 0 });
    orbit(face(), 0.4 + 0.35 + lt * 0.15, 2.4, 0.15, 44, -0.35);
  }],
  // "into their jaw" — the energy pours into the jaw; the bite clamps down on "jaw"
  [C.into, (lt, t) => {
    setEnv("house", { exposure: 1.0, warm: 0.3 });
    doorHit(1);
    const clamp = ease.snap(prog(t, C.jaw, C.jaw + 0.1));
    dog.pose({ x: -0.2, z: -2.7, ry: 0.4, sit: 1, t, shiver: 0.4 * (1 - clamp), wag: 1, wagSpeed: 24, earUp: 0.7, pupil: 1.3, squint: clamp * 0.35 });
    toyIn("mouth");
    toy.squish(0.5 + clamp * 0.5);
    toy.flop(Math.sin(t * 13) * 0.2 * (1 - clamp), 0.8);
    energy(t, { burst: 1, suck: prog(t, C.into, C.jaw + 0.15) });
    orbit(face(), 0.4 + 0.75, 1.15, -0.02, 34, -0.1);
    flash(t, C.jaw, 0.25, "#ffd27a", 0.4);
  }],
  // "so they don't lose control." — calm again, sitting by your feet, your hand on its head
  [C.so2, (lt, t) => {
    setEnv("house", { exposure: 1.0, warm: 0.3 });
    doorHit(1);
    const soft = ease.inOut(prog(t, C.control - 0.1, C.control + 0.35));
    ownerSofa({ pat: soft, t });
    dog.pose({ x: SEAT.x + 0.02, z: -4.3, ry: Math.PI - 0.35, sit: 1, t: lt, wag: 0.6, wagSpeed: 10, earUp: 0.3, closed: soft * 0.45, cute: 0.7, headPitch: -0.1 });
    toyIn("mouth");
    toy.squish(0.4);
    toy.flop(0, 0.8);
    energy(t, { burst: 1, suck: 1, fade: prog(t, C.so2, C.so2 + 0.5) });
    frame2(face(), V(SEAT.x, 1.0, SEAT.z), Math.PI / 2 + 0.05, 2.7, 0.05, 44, -0.1, 0.45);
  }],
  // "They aren't teasing you with a toy." — you crouch; it offers the toy but keeps hold
  [C.they4, (lt, t) => {
    setEnv("house", { exposure: 1.05, warm: 0.4 });
    doorHit(1);
    const reach = ease.inOut(prog(t, C.they4, C.teasing + 0.3));
    ownerSofa({ reach });
    const offer = ease.inOut(prog(t, C.teasing, C.toy3));
    dog.pose({ x: SEAT.x - 0.6, z: -3.75 - offer * 0.15, ry: 2.86, t: lt, wag: 1, wagSpeed: 14, earUp: 0.5, cute: 1, headPitch: -0.2 + offer * 0.1, tilt: 0.15 * Math.sin(lt * 2.5) });
    toyIn("mouth");
    toy.squish(0.45);
    toy.flop(Math.sin(lt * 5) * 0.15, 0.6);
    frame2(face(), V(SEAT.x, 0.9, SEAT.z), -Math.PI / 2 - 0.1, 3.0, 0.1, 44, -0.05, 0.12);
  }],
  // "They're literally holding onto something" — lying down, hugging the toy, eyes closed
  [C.theyre, (lt, t) => {
    setEnv("house", { exposure: 1.05, warm: 0.6 });
    doorHit(1);
    const hug = ease.inOut(prog(t, C.holding, C.holding + 0.4));
    ownerSofa({});
    dog.pose({ x: SEAT.x + 0.1, z: -4.15, ry: 0.6, lie: 1, closed: 0.3 + hug * 0.7, cute: 0.8, t: lt, wag: 0.4, wagSpeed: 6, headPitch: 0.25 + hug * 0.15, tilt: hug * 0.15 });
    toyIn("mouth");
    toy.squish(0.4 + hug * 0.3);
    toy.flop(0, 1);
    orbit(face(), 0.6 + 0.5, 1.9 - lt * 0.25, 0.25, 40, -0.15);
  }],
  // "so their love for you doesn't overwhelm them." — leaning on your legs, a hand on its head
  [C.so3, (lt, t) => {
    setEnv("house", { exposure: 1.1, warm: 0.8 });
    doorHit(1);
    ownerSofa({ pat: 1, t });
    const look2 = ease.inOut(prog(t, C.overwhelm + 0.3, C.overwhelm + 0.7));
    dog.pose({ x: SEAT.x + 0.02, z: -4.3, ry: Math.PI - 0.35 - look2 * 0.7, sit: 1, t: lt, wag: 0.8, wagSpeed: 9, closed: 0.6 * (1 - look2), cute: 1, headPitch: 0.15 - look2 * 0.25, tilt: 0.25 * (1 - look2) + 0.1 * look2 });
    toyIn("mouth");
    toy.squish(0.4);
    toy.flop(0, 0.8);
    const pull = ease.inOut(prog(t, C.so3, DURATION));
    frame2(face(), V(SEAT.x, 0.95, SEAT.z), Math.PI / 2 + 0.05 - pull * 0.2, 2.6 + pull * 0.25, 0.1 + pull * 0.25, 44, -0.12, 0.45);
  }],
];

// energy particles around the dog: burst 0..1 erupts them, suck 0..1 pulls them into the jaw
function energy(t, { burst = 0, suck = 0, fade = 0 }) {
  sparks.visible = burst > 0 && fade < 1;
  if (!sparks.visible) return;
  dog.updateMatrixWorld(true);
  const centre = dog.pivot.localToWorld(V(0, 0.25, 0.35));
  const mouth = dog.mouth.getWorldPosition(V());
  for (let i = 0; i < N_SPARK; i++) {
    const [a, b, c, d] = sparkSeed[i];
    const ang = a * Math.PI * 2 + t * (1.5 + d * 2.5);
    const rad = (0.25 + b * 0.55) * (0.4 + burst * 0.8);
    const y = (c - 0.3) * 1.0 * burst + Math.sin(t * 3 + d * 9) * 0.08;
    const swirl = V(centre.x + Math.cos(ang) * rad, centre.y + y, centre.z + Math.sin(ang) * rad);
    // each particle gets sucked in at its own moment, so they stream in as a ribbon
    const s = clamp01(suck * 1.6 - d * 0.6);
    const k = ease.in(s);
    swirl.lerp(mouth, k);
    sparkPos[i * 3] = swirl.x;
    sparkPos[i * 3 + 1] = swirl.y;
    sparkPos[i * 3 + 2] = swirl.z;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkMat.opacity = (1 - fade) * Math.min(1, burst * 2);
  sparkMat.size = 0.05 + 0.04 * burst;
}

// ---------- sound: footsteps, dog sounds, ambience ----------
const sfx = createSfx(short);
function events(t0, t1, phaseOf, at = [0]) {
  const out = [];
  let prev = phaseOf(t0);
  for (let t = t0 + 1 / 240; t < t1; t += 1 / 240) {
    const ph = phaseOf(t);
    for (const f of at) if (Math.floor(prev - f) !== Math.floor(ph - f)) out.push(t);
    prev = ph;
  }
  return out;
}
const WALK = 1.2, HEELS = [0.33 / 1.2, 0.93 / 1.2];
const STEPS = ["step_1", "step_2", "step_3", "step_4"];
const footsteps = (t0, t1, clipTime, gain = 1) => sfx.steps(events(t0, t1, (t) => clipTime(t) / WALK, HEELS), STEPS, { gain });
function paws(t0, t1, speed, gain = 0.5) {
  const ts = events(t0, t1, (t) => ((t - t0) * speed) / Math.PI, [0.5]);
  sfx.steps(ts, ["paw_1", "paw_2", "paw_3"], { gain });
  sfx.steps(ts.map((t) => t + 0.03), ["paw_2", "paw_3", "paw_1"], { gain: gain * 0.7 });
}
sfx.loop(0, C.is, "room_tone", { gain: 0.6, fadeIn: 0.05, fadeOut: 0.1 });
sfx.loop(C.is, C.that2, "ambi_drone", { gain: 0.25, fadeIn: 0.15, fadeOut: 0.15 });
sfx.loop(C.that2, DURATION, "room_tone", { gain: 0.6, fadeIn: 0.05, fadeOut: 0.4 });
// you come in (twice)
footsteps(0.45, C.and, (t) => t, 0.7);
footsteps(C.when2, C.dog2 - 0.15, (t) => ((t - C.when2) * 3) / 7, 0.8);
// the dog
sfx.add(C.dog + 0.05, "thump", { gain: 0.3 }).add(C.dog + 0.25, "thump", { gain: 0.3 });
paws(C.rushes, C.toy - 0.1, 19, 0.55);
sfx.add(C.toy + 0.02, "thump", { gain: 0.25, rate: 1.4 });
sfx.loop(C.but, C.fetch, "pant", { gain: 0.25, fadeIn: 0.1 });
sfx.add(C.take + 0.02, "paw_2", { gain: 0.4 });
sfx.steps(events(C.it, C.fetch, (t) => (t * 24) / (2 * Math.PI), [0.25]), ["thump"], { gain: 0.08 });
sfx.add(C.arent + 0.05, "sniff", { gain: 0.3, rate: 0.8 });
sfx.add(C.dog2 + 0.05, "whimper", { gain: 0.35, rate: 1.25, dur: 0.4, fadeOut: 0.1 }); // excited squeal
sfx.loop(C.adrenaline, C.their, "pant", { gain: 0.35, rate: 1.4, fadeIn: 0.2 });
paws(C.their, C.grabbing - 0.1, 20, 0.5);
sfx.add(C.joy + 0.35, "thump", { gain: 0.35 });
paws(C.grabbing, C.toy2 - 0.05, 9, 0.4);
sfx.add(C.physical, "flop", { gain: 0.3, rate: 0.6 });
// the rubber duck squeaks whenever it gets squeezed
for (const [t, g, r] of [[C.toy + 0.08, 0.7, 1], [C.take + 0.05, 0.5, 1.1], [C.arent + 0.25, 0.35, 0.95],
  [C.toy2 + 0.04, 0.8, 1.05], [C.jaw + 0.02, 0.9, 0.9], [C.holding + 0.2, 0.25, 0.85], [C.teasing + 0.1, 0.35, 1.15]]) {
  sfx.add(t, "squeak", { gain: g, rate: r });
}
sfx.add(C.control + 0.05, "sigh", { gain: 0.55 });
sfx.steps(events(C.they4, C.theyre, (t) => (t * 14) / (2 * Math.PI), [0.25]), ["thump"], { gain: 0.1 });
sfx.add(C.holding, "sigh", { gain: 0.35, rate: 1.1 });
sfx.add(C.so3 + 0.3, "flop", { gain: 0.2 });

// ---------- frame ----------
const shotStarts = SHOTS.map((s) => s[0]);
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  if (!ENV.room) captureEnvs();
  let i = SHOTS.length - 1;
  while (i > 0 && t < shotStarts[i]) i--;
  resetWorld();
  SHOTS[i][1](t - SHOTS[i][0], t);
  scene.environment = mode === "space" ? ENV.studio : ENV.room;
  scene.environmentIntensity = mode === "space" ? 0.6 : 0.55;
  owner.update();
  captions(t);
});

window.__dbg = { scene, camera, renderer, C, SHOTS, owner, dog, toy };
short.start();
