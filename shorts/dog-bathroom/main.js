import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { loadAvatar } from "../../js/avatar.js";
import {
  loadProp, useEnvironment, captureEnvironment,
  toilet, vanity, mirror, bathtub, handTowel, rubberDuck, toiletPaper, bathMat, towel,
} from "../../js/props.js";
import { createDog, DOG_COLORS } from "../../js/dog.js";
import { loadSrt, cues, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Why your dog follows you into the bathroom" — pet-POV short with a voiceover.
// Every cut and every action is keyed to a word of voiceover.srt (at("word")), so a
// re-timed SRT re-syncs the whole edit. Shots are pure functions of time.

const words = await loadSrt("voiceover.srt");
const at = cues(words);
const DURATION = Math.ceil((words.at(-1).end + 0.6) * 30) / 30;

const short = createShort({ duration: DURATION, lights: false, fov: 50 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.03;
camera.far = 1500;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.45);

// ---------- word cues (seconds) ----------
const C = {
  dog: at("dog"), insists: at("insists"), bathroom: at("bathroom"),
  every: at("every"), single: at("single"), time: at("time"),
  you2: at("you", 2), think: at("think"), separation: at("separation"), anxiety: at("anxiety"),
  but: at("but"), mind: at("mind"), arent: at("aren't"), clingy: at("clingy"),
  theyre: at("they're"), security: at("security"),
  wild: at("in", 2), relieving: at("relieving"), or: at("or"),
  is1: at("is"), is2: at("is", 2), vulnerable: at("vulnerable"), to: at("to"), ambush: at("ambush"),
  a: at("a"), stand: at("stand"), guard: at("guard"), whenever: at("whenever"), pack: at("pack"), defenses: at("defenses"),
  dont: at("they", 3), because: at("because"), alone: at("alone"),
  follow2: at("they", 5), youd: at("you'd"), without: at("without"), them: at("them"),
};
// on-screen caption lines (same words as the SRT, split for reading)
const LINES = [
  "When your dog", "insists on", "following you", "into the bathroom", "every", "single", "time,",
  "you probably think", "they just have", "separation anxiety.",
  "But in their mind,", "they aren't", "being clingy.", "They're running", "security.",
  "In the wild,", "relieving yourself", "or drinking water", "is the exact moment", "an animal is most",
  "vulnerable", "to an ambush.", "A dog's instinct", "is to stand guard", "whenever a", "pack member",
  "lets their", "defenses down.", "They don't", "follow you", "because they", "can't be alone.",
  "They follow you", "because they think", "you'd be", "defenseless", "without them.",
];

// ---------- helpers ----------
const plain = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return plain.get(key);
};
const asMat = (m) => (typeof m === "number" ? mat(m) : m);
// Box with UVs in metres, so tiling textures keep a real-world scale.
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
  back: gsap.parseEase("back.out(2.5)"),
  snap: gsap.parseEase("expo.out"),
  bounce: gsap.parseEase("bounce.out"),
};
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rand() * (b - a);

// ---------- materials ----------
const tex = (f, repeat, color = true) => short.loadTexture(`../../assets/textures/${f}`, { repeat, color });
const M = {
  hardwood: new THREE.MeshStandardMaterial({
    map: tex("hardwood2_diffuse.jpg", [1 / 3, 1 / 1.5]),
    bumpMap: tex("hardwood2_bump.jpg", [1 / 3, 1 / 1.5], false),
    bumpScale: 1.5,
    roughness: 0.5,
  }),
  grass: new THREE.MeshStandardMaterial({ map: tex("grass.jpg", [1 / 3, 1 / 3]), roughness: 1 }),
  wallTile: T.tiles(0xf4f2ed, { cols: 4, rows: 8, repeat: [1 / 0.6, 1 / 0.6] }), // 15 x 7.5 cm subway tiles
  floorTile: T.tiles(0xb9b3aa, { cols: 4, rows: 4, offset: 0, grout: 0x77726a, repeat: [1 / 1.2, 1 / 1.2], key: "floor" }),
  bathPaint: T.plaster(0xbfd3ca, [0.5, 0.5]),
  hallPaint: T.plaster(0xe8dece, [0.5, 0.5]),
  ceiling: T.plaster(0xf4f1ea, [0.5, 0.5]),
  trim: T.paintedWood(0xf4f1ea),
  door: T.paintedWood(0xf3f0e9),
  runner: T.fabric(0x7a3b33, { repeat: [3, 3], weave: 4, key: "runner" }),
  rug: T.fabric(0x5d6f7d, { repeat: [3, 3], weave: 5, key: "rug" }),
  rock: T.rock(),
  water: T.water(),
  mud: mat(0x3a2e22, { roughness: 0.95 }),
  windowGlow: new THREE.MeshBasicMaterial({ color: 0xeaf3ff }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.25 }),
};

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 0.9);
scene.add(hemi);
function spot(color, intensity, x, y, z, { angle = 1.2, distance = 9, shadow = true } = {}) {
  const l = new THREE.SpotLight(color, intensity, distance, angle, 0.75, 1.4);
  l.position.set(x, y, z);
  l.target.position.set(x, 0, z);
  if (shadow) {
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.02;
  }
  scene.add(l, l.target);
  return l;
}
const L = {
  bath: spot(0xfff1dc, 26, 0.2, 2.45, -1.7, { angle: 1.25 }),
  hall: spot(0xffe2b8, 24, 0, 2.45, 2.6),
  living: spot(0xfff0dc, 40, 0, 2.45, 8.4, { angle: 1.3, distance: 14 }),
  hallFill: new THREE.PointLight(0xffe2b8, 5, 7, 1.5),
  window: new THREE.PointLight(0xd6e8ff, 9, 7, 1.5),
  bathWindow: new THREE.PointLight(0xd8ecff, 3, 4, 1.5),
};
L.hallFill.position.set(0, 2.2, 5);
L.window.position.set(2.4, 1.7, 8.6);
L.bathWindow.position.set(-1.2, 1.8, -1.9);
scene.add(L.hallFill, L.window, L.bathWindow);
const HOUSE_LIGHTS = Object.values(L);

const WX = 300; // the wild set lives far away on +x
const sun = new THREE.DirectionalLight(0xffb07a, 3.2);
sun.position.set(WX - 14, 7, -10);
sun.target.position.set(WX, 0, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const skyMat = new THREE.MeshBasicMaterial({ map: T.skyTexture("dusk"), side: THREE.BackSide, fog: false });
const skyDome = mesh(new THREE.SphereGeometry(400, 48, 24), skyMat, 0, 0, 0, scene);

// ================= HOUSE: bathroom (z -3.2..0), hallway (z 0..6), living room (z 6..11) ======
const house = group(0, 0, 0, scene);
const H = 2.5; // ceiling height
const W = {}; // walls by name, so a shot can hide the one the camera is behind

// tiled lower half + painted upper half, `inner` = which side faces the room
function bathWall(name, len, x, z, alongX) {
  const g = group(x, 0, z, house);
  const [w, d] = alongX ? [len, 0.06] : [0.06, len];
  box(w, 1.25, d, M.wallTile, 0, 0.625, 0, g);
  box(w, H - 1.25, d, M.bathPaint, 0, 1.25 + (H - 1.25) / 2, 0, g);
  // chunky tile cap
  box(alongX ? len : 0.1, 0.04, alongX ? 0.1 : len, M.trim, 0, 1.26, 0, g);
  W[name] = g;
  return g;
}
bathWall("bBack", 3.2, 0, -3.2, true);
bathWall("bLeft", 3.2, -1.63, -1.6, false);
bathWall("bRight", 3.2, 1.63, -1.6, false);
// front wall with the door opening (x -0.45..0.45, 2.1 high); bathroom face + hallway face
W.bFront = group(0, 0, 0, house);
for (const [w, x] of [[1.18, -1.04], [1.18, 1.04]]) {
  box(w, 1.25, 0.06, M.wallTile, x, 0.625, -0.03, W.bFront);
  box(w, H - 1.25, 0.06, M.bathPaint, x, 1.875, -0.03, W.bFront);
  box(w, H, 0.06, M.hallPaint, x, H / 2, 0.03, W.bFront);
}
box(0.9, 0.4, 0.12, M.hallPaint, 0, 2.3, 0, W.bFront);
// door casing (hall side) and the door leaf, hinged at x = -0.43, opening into the bathroom
for (const x of [-0.5, 0.5]) box(0.09, 2.15, 0.16, M.trim, x, 1.075, 0.02, W.bFront);
box(1.09, 0.09, 0.16, M.trim, 0, 2.145, 0.02, W.bFront);
const door = group(-0.43, 0, -0.02, house);
box(0.86, 2.08, 0.04, M.door, 0.43, 1.04, 0, door);
for (const [y, h] of [[0.55, 0.75], [1.5, 0.8]]) {
  box(0.62, h, 0.012, M.door, 0.43, y, 0.024, door);
  box(0.62, h, 0.012, M.door, 0.43, y, -0.024, door);
}
for (const s of [-1, 1]) {
  const knob = mesh(new THREE.SphereGeometry(0.03, 14, 10), M.brass, 0.76, 1.0, s * 0.06, door);
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8).rotateX(Math.PI / 2), M.brass, 0, 0, -s * 0.03, knob);
}

// bathroom floor, ceiling, fixtures
floorPlane(3.2, 3.2, M.floorTile, 0, 0.002, -1.6, house);
box(3.3, 0.06, 3.3, M.ceiling, 0, H + 0.03, -1.6, house);
const sink = place(vanity({ width: 0.9 }), 0.15, 0, -3.17);
const SINK = new THREE.Vector3(0.15, 0, -3.17).add(sink.userData.basin);
place(mirror(0.78, 0.9), 0.15, 1.62, -3.17);
// wall lights either side of the mirror
for (const x of [-0.42, 0.72]) {
  box(0.06, 0.06, 0.08, M.brass, x, 1.65, -3.13, house);
  mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 16), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }), x, 1.72, -3.08, house);
}
place(toilet(), -1.05, 0, -3.17);
place(toiletPaper(), -1.57, 0.72, -2.55, Math.PI / 2);
const tub = place(bathtub({ w: 1.7, d: 0.75 }), 1.215, 0, -2.32, -Math.PI / 2);
place(rubberDuck(0.11), 0.9, 0.55, -1.75, 0.9);
place(bathMat({ color: 0x8fa9ba }), 0.15, 0, -2.3);
place(towel({ color: 0xe9d9c3, w: 0.55, h: 0.5 }), 1.58, 1.35, -0.55, -Math.PI / 2);
// shower curtain bunched at the back of the tub
let curtain;
const rod = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.75, 10), mat(0xdddddd, { metalness: 1, roughness: 0.2 }), 0.85, 2.05, -2.32, house);
rod.rotation.x = Math.PI / 2;
{
  const geo = new THREE.PlaneGeometry(0.45, 1.5, 24, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 70) * 0.035);
  geo.computeVertexNormals();
  curtain = mesh(geo, T.fabric(0xdfe7e4, { repeat: [1, 1], weave: 2, key: "curtain" }), 0.85, 1.3, -2.92, house);
  curtain.material.side = THREE.DoubleSide;
  curtain.rotation.y = Math.PI / 2;
}
// frosted window above the toilet
box(0.02, 0.62, 0.72, M.windowGlow, -1.595, 1.85, -2.35, house);
for (const [w, h, y, z] of [[0.05, 0.05, 2.18, -2.35], [0.05, 0.05, 1.52, -2.35]]) box(w, h, 0.82, M.trim, -1.58, y, z, house);
for (const z of [-2.73, -1.97]) box(0.05, 0.71, 0.05, M.trim, -1.58, 1.85, z, house);
// ceiling light disc
mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xfff6e8 }), 0.2, H - 0.02, -1.7, house);

// hallway
floorPlane(1.7, 6, M.hardwood, 0, 0.002, 3, house);
box(0.75, 0.012, 4.6, M.runner, 0, 0.006, 3.3, house);
W.hL = group(0, 0, 0, house);
W.hR = group(0, 0, 0, house);
box(0.1, H, 6, M.hallPaint, -0.85, H / 2, 3, W.hL);
box(0.1, H, 6, M.hallPaint, 0.85, H / 2, 3, W.hR);
for (const [g, s] of [[W.hL, -1], [W.hR, 1]]) box(0.03, 0.12, 6, M.trim, s * 0.785, 0.06, 3, g);
box(1.8, 0.06, 6, M.ceiling, 0, H + 0.03, 3, house);
mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xfff1dc }), 0, H - 0.02, 2.6, house);
// closed doors to other rooms + framed pictures
function sideDoor(g, s, z) {
  box(0.04, 2.05, 0.82, M.door, s * 0.79, 1.025, z, g);
  for (const [y, h] of [[0.55, 0.75], [1.5, 0.8]]) box(0.012, h, 0.58, M.door, s * 0.765, y, z, g);
  box(0.06, 2.12, 0.07, M.trim, s * 0.78, 1.06, z - 0.45, g);
  box(0.06, 2.12, 0.07, M.trim, s * 0.78, 1.06, z + 0.45, g);
  box(0.06, 0.07, 0.97, M.trim, s * 0.78, 2.12, z, g);
  mesh(new THREE.SphereGeometry(0.028, 12, 8), M.brass, s * 0.74, 1.0, z + 0.3, g);
}
sideDoor(W.hL, -1, 2.1);
sideDoor(W.hR, 1, 4.3);
function picture(g, s, z, y, tone) {
  box(0.03, 0.5, 0.65, T.paintedWood(0x2e2018), s * 0.785, y, z, g);
  box(0.01, 0.42, 0.57, T.leaves(tone), s * 0.768, y, z, g);
}
picture(W.hR, 1, 1.6, 1.55, 1);
picture(W.hL, -1, 4.2, 1.55, 0);

// living room
floorPlane(6, 5, M.hardwood, 0, 0.002, 8.5, house);
box(6.2, 0.06, 5.2, M.ceiling, 0, H + 0.03, 8.5, house);
W.lBack = box(6, H, 0.1, M.hallPaint, 0, H / 2, 11.05, house);
W.lLeft = box(0.1, H, 5, M.hallPaint, -3.05, H / 2, 8.5, house);
W.lRight = group(0, 0, 0, house);
// right wall with a big window (glowing pane = daylight)
box(0.1, 0.8, 5, M.hallPaint, 3.05, 0.4, 8.5, W.lRight);
box(0.1, 0.5, 5, M.hallPaint, 3.05, 2.25, 8.5, W.lRight);
box(0.1, 1.2, 1.6, M.hallPaint, 3.05, 1.4, 6.8, W.lRight);
box(0.1, 1.2, 1.6, M.hallPaint, 3.05, 1.4, 10.2, W.lRight);
box(0.02, 1.2, 1.8, M.windowGlow, 3.07, 1.4, 8.5, W.lRight);
for (const z of [7.6, 8.5, 9.4]) box(0.06, 1.2, 0.05, M.trim, 3.0, 1.4, z, W.lRight);
for (const y of [0.8, 2.0]) box(0.12, 0.06, 1.85, M.trim, 3.0, y, 8.5, W.lRight);
for (const z of [7.4, 9.6]) box(0.04, 2.1, 0.45, T.fabric(0xd8cdb8, { key: "drape", weave: 3 }), 2.95, 1.25, z, W.lRight);
for (const [w, x] of [[2.2, -1.9], [2.2, 1.9]]) box(w, H, 0.1, M.hallPaint, x, H / 2, 5.95, house);
box(1.6, 0.4, 0.1, M.hallPaint, 0, 2.3, 5.95, house);
box(3.4, 0.012, 2.3, M.rug, 0, 0.007, 8.6, house);
const sofa = place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.4 }), 0, 0, 10.55, Math.PI);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.2 }), -2.55, 0, 10.6);
place(loadProp(short, "SpecularSilkPouf", { height: 0.4 }), -1.7, 0, 8.2);
box(0.5, 0.5, 0.42, T.paintedWood(0x5a3d28), 1.75, 0.25, 10.75, house);
place(loadProp(short, "GlassVaseFlowers", { height: 0.42 }), 1.75, 0.5, 10.75);
box(1.4, 0.9, 0.04, T.paintedWood(0x2e2018), 0, 1.75, 11.0, house);
box(1.26, 0.76, 0.01, T.leaves(1), 0, 1.75, 10.975, house);
const SOFA_SEAT_Y = 0.43;

// ================= WILD: dusk pond in a forest clearing (x ≈ WX) =================
const wild = group(WX, 0, 0, scene);
floorPlane(160, 160, M.grass, 0, 0, 0, wild);
const POND_R = 2.6;
const water = mesh(new THREE.CircleGeometry(POND_R, 64), M.water, 0, 0.03, 0, wild);
water.rotation.x = -Math.PI / 2;
const mudRing = mesh(new THREE.RingGeometry(POND_R - 0.1, POND_R + 0.45, 64), M.mud, 0, 0.02, 0, wild);
mudRing.rotation.x = -Math.PI / 2;
function rock(x, z, s, sy = 0.6, parent = wild) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    v.multiplyScalar(1 + Math.sin(v.x * 3.1 + x) * 0.12 + Math.cos(v.z * 2.7 + z) * 0.1);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const r = mesh(geo, M.rock, x, s * sy * 0.35, z, parent);
  r.scale.set(s, s * sy, s * rr(0.8, 1.2));
  r.rotation.y = rr(0, 6);
  return r;
}
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 2 + rr(-0.1, 0.1);
  if (a > 1.2 && a < 1.9) continue; // open bank where the wolf drinks
  const r = POND_R + rr(0.05, 0.4);
  rock(Math.cos(a) * r, Math.sin(a) * r, rr(0.15, 0.35));
}
const LOOKOUT = new THREE.Vector3(-1.9, 0, 4.7);
rock(LOOKOUT.x, LOOKOUT.z, 0.85, 0.75);
// reeds
const reedMat = mat(0x5f6b33, { roughness: 0.9 });
for (let i = 0; i < 70; i++) {
  const a = rr(Math.PI * 1.1, Math.PI * 1.9), r = POND_R + rr(-0.15, 0.2);
  const reed = mesh(new THREE.CylinderGeometry(0.004, 0.01, rr(0.5, 1.0), 4), reedMat, Math.cos(a) * r, 0.35, Math.sin(a) * r, wild);
  reed.rotation.set(rr(-0.2, 0.2), 0, rr(-0.2, 0.2));
}
const forest = createForest(wild);
for (let i = 0; i < 46; i++) {
  const a = rr(0, Math.PI * 2), r = rr(9, 22);
  if (Math.sin(a) > 0.55 && r < 13) continue; // keep the camera side (+z) open
  forest.tree(Math.cos(a) * r, Math.sin(a) * r, { height: rr(2.6, 3.6), scale: rr(1.3, 1.8) });
}
for (let i = 0; i < 30; i++) {
  const a = rr(0, Math.PI * 2), r = rr(5.5, 9);
  forest.bush(Math.cos(a) * r, Math.sin(a) * r, rr(1.2, 2));
}
forest.build();
// bushes that move: where the predator hides, and where a wolf "relieves itself"
const AMBUSH = new THREE.Vector3(1.5, 0, 6.6);
const ambushBush = group(AMBUSH.x, 0, AMBUSH.z, wild);
{
  const f = createForest(ambushBush);
  for (const [x, z, s] of [[0, 0, 2.1], [-0.7, 0.2, 1.7], [0.7, 0.1, 1.8], [0.2, -0.5, 1.9]]) f.bush(x, z, s);
  f.build();
}
const PRIVY = new THREE.Vector3(4.4, 0, 2.6);
const privyBush = group(PRIVY.x, 0, PRIVY.z, wild);
{
  const f = createForest(privyBush);
  for (const [x, z, s] of [[0, 0, 1.4], [-0.5, 0.2, 1.2], [0.5, 0.15, 1.3]]) f.bush(x, z, s);
  f.build();
}
// glowing eyes in the ambush bush
const bushEyes = group(AMBUSH.x - 0.2, 0.62, AMBUSH.z - 1.55, wild);
bushEyes.scale.setScalar(1.4);
for (const s of [-1, 1]) {
  const e = box(0.075, 0.05, 0.01, new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false }), s * 0.09, 0, 0, bushEyes);
  box(0.016, 0.046, 0.012, new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }), 0, 0, -0.004, e);
  e.rotation.z = s * -0.2;
}
// ripples where the wolf laps
const ripples = [0, 1, 2].map(() => {
  const r = mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0, depthWrite: false }), 0, 0.035, 0, wild);
  r.rotation.x = -Math.PI / 2;
  return r;
});

// ================= SPACE: inside the dog's mind =================
const SPACE_Y = 600;
{
  const pos = [];
  for (let i = 0; i < 2500; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = 30 + rand() * 60;
    const sq = Math.sqrt(1 - u * u);
    pos.push(Math.cos(th) * sq * r, SPACE_Y + u * r, Math.sin(th) * sq * r);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18 })));
}
const spaceRim = new THREE.PointLight(0x8fb0ff, 30, 0, 2);
spaceRim.position.set(-2, SPACE_Y + 2, -2);
scene.add(spaceRim);
const SPACE = new THREE.Color(0x000000);

// ================= cast =================
const dog = createDog();
scene.add(dog);
const towelInMouth = handTowel({ color: 0xe9d9c3 });
dog.mouth.add(towelInMouth);
const wolfOpts = { colors: DOG_COLORS.wolf, key: "wolf", pointyEars: true, snout: 1.35, collar: false };
const drinker = createDog(wolfOpts);
const sentinel = createDog(wolfOpts);
const lounger = createDog(wolfOpts);
const predator = createDog({ colors: DOG_COLORS.shadow, key: "shadow", glowEyes: true, pointyEars: true, snout: 1.4, collar: false });
predator.scale.setScalar(1.2);
for (const w of [drinker, sentinel, lounger, predator]) wild.add(w);
lounger.scale.setScalar(0.95);

// you: a realistic premade person (Rocketbox, MIT)
const owner = loadAvatar(short, "Male_Adult_08");
owner.loadClip("m_walk_neutral_01");
house.add(owner);
// face wash foam
const foam = new THREE.Group();
{
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  for (let i = 0; i < 150; i++) {
    const a = rr(-1.1, 1.1), b = rr(-1, 1);
    const s = mesh(new THREE.SphereGeometry(rr(0.008, 0.017), 8, 6), foamMat, Math.sin(a) * 0.075, b * 0.06, Math.cos(a) * 0.08, foam);
    s.castShadow = false;
  }
}
owner.attach("head", foam, [0, 0.075, 0.03]);

// ---------- shadows ----------
scene.traverse((o) => {
  if (!o.isMesh) return;
  const basic = o.material?.isMeshBasicMaterial;
  o.castShadow = !basic && o !== skyDome && o !== water && o !== mudRing;
  o.receiveShadow = !basic;
});

// ---------- overlays ----------
// ---------- sound: footsteps, dog sounds, bushes, ambience ----------
// Keyed to the same word cues and to the animation maths, so every step and lap lands on
// the frame it is seen. The render mixes this under the voiceover.
const sfx = createSfx(short);
// times in [t0, t1) where a periodic event happens: phaseOf(t) grows by 1 per cycle,
// events at the given fractions of the cycle
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
// your footsteps: the walk clip loops every 1.2 s, right heel lands at 0.33 s, left at 0.93 s
const WALK = 1.2, HEELS = [0.33 / 1.2, 0.93 / 1.2];
const STEPS = ["step_1", "step_2", "step_3", "step_4"];
const footsteps = (t0, t1, clipTime, gain = 1) => sfx.steps(events(t0, t1, (t) => clipTime(t) / WALK, HEELS), STEPS, { gain });
// dog paws: the trot swings with sin(lt * speed); each half cycle a diagonal pair lands
function paws(t0, t1, speed, gain = 0.5) {
  const ts = events(t0, t1, (t) => ((t - t0) * speed) / Math.PI, [0.5]);
  sfx.steps(ts, ["paw_1", "paw_2", "paw_3"], { gain });
  sfx.steps(ts.map((t) => t + 0.035), ["paw_2", "paw_3", "paw_1"], { gain: gain * 0.7 });
}
// the drinking wolf laps with max(0, sin(t * 15)) on absolute time
const laps = (t0, t1, gain) => sfx.steps(events(t0, t1, (t) => (t * 15) / (2 * Math.PI), [0.25]), ["lap_1", "lap_2"], { gain });

// ambience beds
const indoors = [[0, C.mind], [C.theyre, C.wild], [C.whenever, DURATION]];
for (const [a, b] of indoors) sfx.loop(a, b, "room_tone", { gain: 0.6, fadeIn: 0.05, fadeOut: 0.1 });
for (const [a, b] of [[C.you2, C.separation], [C.theyre, C.wild], [C.whenever, C.dont], [C.youd, DURATION]]) {
  sfx.loop(a, b, "tap_water", { gain: 0.22, fadeIn: 0.05, fadeOut: 0.08 }); // the tap is running
}
sfx.loop(C.mind, C.theyre, "ambi_drone", { gain: 0.3, fadeIn: 0.1, fadeOut: 0.15 }); // inside the dog's mind
sfx.loop(C.wild, C.whenever, "forest_dusk", { gain: 0.9, fadeIn: 0.15, fadeOut: 0.15 });
sfx.loop(C.is2, C.a, "ambi_haunted_hum", { gain: 0.45, fadeIn: 0.4, fadeOut: 0.3 }); // something is watching

// "When your dog" — you walk past, its tail thumps the floor as its head comes up
footsteps(0, C.insists, (t) => t, 0.4);
sfx.add(C.dog + 0.12, "thump", { gain: 0.35 }).add(C.dog + 0.4, "thump", { gain: 0.3, rate: 1.1 });
// "insists on following you into the bathroom" — steps + claws right behind you
footsteps(C.insists, C.bathroom, (t) => t - C.insists + 1 / 7, 0.8);
paws(C.insists, C.bathroom, 11);
sfx.loop(C.insists, C.every, "pant", { gain: 0.25, fadeIn: 0.1 });
footsteps(C.bathroom, C.every, (t) => t - C.bathroom + 3 / 7, 0.8);
paws(C.bathroom, C.every, 11, 0.6);
// "every / single / time"
sfx.add(C.every + 0.05, "thump", { gain: 0.3 }).add(C.every + 0.2, "thump", { gain: 0.25 });
sfx.add(C.single + 0.02, "whimper", { gain: 0.25, rate: 1.25, dur: 0.35, fadeOut: 0.08 });
sfx.add(C.time + 0.02, "sniff", { gain: 0.45 });
// "you probably think they just have" — sitting behind you, tail going
sfx.add(C.you2 + 0.3, "thump", { gain: 0.25 }).add(C.you2 + 0.75, "thump", { gain: 0.22 });
// "separation anxiety." — a whine at the closed door, then the big sigh
sfx.add(C.separation + 0.08, "whimper", { gain: 0.45 });
sfx.add(C.anxiety - 0.05, "sigh", { gain: 0.6 });
// "They're running security." — a low warning rumble as the shades go on
sfx.add(C.security + 0.08, "growl", { gain: 0.3, rate: 0.9, dur: 0.6, fadeOut: 0.15 });
// the wild
laps(C.wild, C.relieving, 0.15);
for (let t = C.relieving; t < C.or - 0.3; t += 0.42) sfx.add(t, "rustle", { gain: 0.4, rate: 0.9 + (t % 0.3), dur: 0.5, fadeOut: 0.15 });
laps(C.or, C.is1, 0.6);
laps(C.is1, C.is2, 0.7);
laps(C.is2, C.to, 0.35);
sfx.add(C.vulnerable + 0.05, "growl", { gain: 0.25, rate: 0.75 }); // from inside the bush
sfx.add(C.vulnerable + 0.1, "rustle", { gain: 0.2, rate: 0.8 });
laps(C.to, C.ambush - 0.2, 0.35);
sfx.add(C.ambush - 0.25, "rustle", { gain: 0.8, rate: 1.3 }); // it bursts out
sfx.add(C.ambush - 0.15, "snarl", { gain: 0.8 });
sfx.add(C.ambush + 0.1, "whimper", { gain: 0.45, rate: 1.5, dur: 0.3, fadeOut: 0.1 }); // startled yelp
sfx.add(C.a + 0.35, "sniff", { gain: 0.35 }); // the lookout scents the air
laps(C.a, C.stand, 0.15);
sfx.steps(events(C.stand, C.stand + 0.3, (t) => (t - C.stand) * 3.5, [0.5]), ["rustle"], { gain: 0.25 });
sfx.add(C.guard - 0.1, "snarl", { gain: 0.7, rate: 0.85 }).add(C.guard + 0.3, "growl", { gain: 0.45 });
sfx.add(C.guard + 0.25, "rustle", { gain: 0.5, rate: 0.85 }); // the thing in the bush backs off
// "whenever a pack member lets their defenses down." — scrubbing, splashing
sfx.add(C.whenever + 0.15, "splash", { gain: 0.35 }).add(C.defenses + 0.05, "splash", { gain: 0.5 });
sfx.add(C.pack + 0.1, "sniff", { gain: 0.3 });
// "They don't follow you because they can't be alone." — sofa, lazy tail, big yawn
sfx.add(C.dont + 0.35, "sigh", { gain: 0.4, rate: 0.9 });
sfx.steps(events(C.dont, C.follow2, (t) => (t * 6) / (2 * Math.PI), [0.25]), ["thump"], { gain: 0.18 });
sfx.add(C.alone - 0.15, "yawn", { gain: 0.6, rate: 1.15 });
// "They follow you because they think" — slow-motion escort
footsteps(C.follow2, C.youd, (t) => ((t - C.follow2) * 4) / 7, 0.9);
paws(C.follow2, C.youd, 6.5, 0.5);
// "you'd be defenseless without them." — the towel delivery
sfx.add(C.without + 0.05, "paw_1", { gain: 0.5 }).add(C.without + 0.1, "paw_3", { gain: 0.4 });
sfx.add(C.them + 0.2, "pant", { gain: 0.3, dur: 0.75, fadeOut: 0.2 });

const captions = wordCaptions(document.getElementById("caption"), words, { lines: LINES });
const flashEl = document.getElementById("flash");
const vignetteEl = document.getElementById("vignette");
function flash(t, start, dur, color = "#fff", peak = 1) {
  const p = (t - start) / dur;
  if (p < 0 || p > 1) return;
  flashEl.style.background = color;
  flashEl.style.opacity = String(peak * (1 - p) ** 2);
}

function look(px, py, pz, tx, ty, tz, fov = 50) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
}
// world position of a point on the dog's face (or any object-local point)
const face = (d, lx = 0, ly = 0.13, lz = 0.2) => {
  d.updateMatrixWorld(true);
  return d.head.localToWorld(new THREE.Vector3(lx, ly, lz));
};
// camera on a circle around `target`: yaw (world, 0 = camera on +z side), distance, height above target
function orbit(target, yaw, dist, height, fov, lookY = 0) {
  look(target.x + Math.sin(yaw) * dist, target.y + height, target.z + Math.cos(yaw) * dist, target.x, target.y + lookY, target.z, fov);
}
const shake = (t, amt) => [Math.sin(t * 53) * amt + Math.sin(t * 31) * amt * 0.6, Math.cos(t * 47) * amt];

// ---------- environments / lighting moods ----------
const HOUSE_FOG = null;
const DUSK_FOG = new THREE.Fog(0x6a5a66, 14, 70);
const ENV = {};
let envKind = "house";
function setEnv(kind, { exposure = 1.0, night = false } = {}) {
  envKind = kind;
  const inHouse = kind === "house";
  renderer.toneMappingExposure = exposure;
  for (const l of HOUSE_LIGHTS) l.visible = inHouse;
  sun.visible = kind === "wild";
  spaceRim.visible = kind === "space";
  skyDome.visible = kind === "wild";
  scene.background = kind === "space" ? SPACE : new THREE.Color(0x101014);
  scene.fog = kind === "wild" ? DUSK_FOG : HOUSE_FOG;
  hemi.color.set(kind === "wild" ? 0x8a8fc0 : night ? 0x6f7fb8 : 0xfff4e6);
  hemi.groundColor.set(kind === "wild" ? 0x4a3a2c : 0x6b5a48);
  hemi.intensity = kind === "wild" ? 1.1 : kind === "space" ? 1.2 : night ? 0.35 : 0.9;
  L.bath.intensity = night ? 6 : 26;
  L.hall.intensity = night ? 0 : 24;
  L.bathWindow.color.set(night ? 0x7f9cff : 0xd8ecff);
  L.bathWindow.intensity = night ? 7 : 3;
  M.windowGlow.color.set(night ? 0x5d74b8 : 0xeaf3ff);
  vignetteEl.style.opacity = kind === "wild" ? "1" : "0";
}
function pickEnv() {
  const p = camera.position;
  if (envKind === "space") scene.environment = ENV.studio;
  else if (envKind === "wild") scene.environment = ENV.wild;
  else scene.environment = p.z < 0 ? ENV.bath : p.z < 6 ? ENV.hall : ENV.living;
  scene.environmentIntensity = envKind === "wild" ? 0.3 : 0.5;
  skyDome.position.copy(p);
}
function captureEnvs() {
  ENV.studio = scene.environment;
  hideCast();
  setEnv("house");
  ENV.bath = captureEnvironment(renderer, scene, new THREE.Vector3(0.2, 1.4, -1.6));
  ENV.hall = captureEnvironment(renderer, scene, new THREE.Vector3(0, 1.4, 3));
  ENV.living = captureEnvironment(renderer, scene, new THREE.Vector3(0, 1.4, 8.5));
  ENV.wild = ENV.studio;
}
function hideCast() {
  dog.pose({ z: -50 });
  owner.position.set(0, 0, -50);
}

// ---------- poses ----------
const walk = (p, phase) => p.play("m_walk_neutral_01", phase / 7);
// you, walking down the hall toward the bathroom (-z)
function ownerWalk(z, phase, x = 0.12) {
  owner.position.set(x, 0, z);
  owner.rotation.set(0, Math.PI, 0);
  walk(owner, phase);
}
// you, bent over the sink washing your face (scrub 0..1), or groping for a towel (grope 0..1)
function ownerSink(t, { scrub = 1, grope = 0, lookDown = 0 } = {}) {
  owner.resetPose();
  owner.position.set(SINK.x, 0, -2.5);
  owner.rotation.set(0, Math.PI, 0);
  const bend = 1 - grope * 0.7;
  owner.spine.rotation.x = 0.45 * bend;
  owner.pelvis.rotation.x = 0.25 * bend;
  owner.legL.rotation.x = owner.legR.rotation.x = -0.25 * bend;
  owner.head.rotation.set(0.25 * bend + lookDown * 0.5, -lookDown * 0.5, 0);
  const sc = Math.sin(t * 16) * 0.12 * scrub;
  // both hands at the face
  owner.armL.rotation.set(-1.25 + sc, 0, -0.15);
  owner.elbowL.rotation.set(-1.95, -0.7, 0);
  owner.armR.rotation.set(-1.25 - sc, 0, 0.15);
  owner.elbowR.rotation.set(-1.95, 0.7, 0);
  if (grope > 0) {
    // right hand reaching out blindly to the side, patting the air
    const pat = Math.sin(t * 9) * 0.25;
    owner.armR.rotation.set(lerp(-1.25, -0.9 + pat * 0.4, grope), 0, lerp(0.15, -0.55 + pat, grope));
    owner.elbowR.rotation.set(lerp(-1.95, -0.35, grope), lerp(0.7, 0.2, grope), 0);
    owner.head.rotation.y = Math.sin(t * 5) * 0.25 * grope;
  }
  if (lookDown > 0) {
    // hands resting on the counter
    owner.armL.rotation.set(-0.55, 0, -0.1);
    owner.armR.rotation.set(-0.55, 0, 0.1);
    owner.elbowL.rotation.set(-0.3, -0.3, 0);
    owner.elbowR.rotation.set(-0.3, 0.3, 0);
  }
}
const lapping = (t) => Math.max(0, Math.sin(t * 15));

// ---------- reset ----------
function resetWorld() {
  hideCast();
  owner.resetPose();
  dog.pivot.scale.y = 1;
  foam.visible = false;
  door.rotation.y = 1.45;
  for (const w of Object.values(W)) w.visible = true;
  door.visible = true;
  curtain.visible = true;
  drinker.pose({ x: 0.1, z: POND_R + 1.05, ry: Math.PI, headPitch: 0.95, closed: 0 });
  sentinel.pose({ x: LOOKOUT.x, y: 0.42, z: LOOKOUT.z, ry: 2.6, earUp: 1 });
  lounger.pose({ x: -4.6, z: 3.6, ry: 1.2, lie: 1, headPitch: 0.25 });
  predator.pose({ y: -20 });
  bushEyes.visible = false;
  bushEyes.scale.set(1.4, 1.4, 1.4);
  ambushBush.rotation.set(0, 0, 0);
  privyBush.rotation.set(0, 0, 0);
  ripples.forEach((r) => (r.material.opacity = 0));
  towelInMouth.visible = false;
  flashEl.style.opacity = "0";
}
function rippleAt(t, x, z) {
  ripples.forEach((r, i) => {
    const p = ((t * 1.3 + i / 3) % 1);
    r.position.set(x, 0.035, z);
    r.scale.setScalar(0.05 + p * 0.5);
    r.material.opacity = 0.35 * (1 - p);
  });
}
// the drinking wolf: muzzle in the water
const DRINK = { x: 0.1, z: POND_R + 1.05 };
function drink(t, { closed = 0.9 } = {}) {
  const lap = lapping(t);
  drinker.pose({ x: DRINK.x, z: DRINK.z, ry: Math.PI, headPitch: 0.95 + lap * 0.08, jawOpen: lap * 0.4, closed, wag: 0.15, t, earBack: 0.15 });
  rippleAt(t, DRINK.x, POND_R - 0.15);
}

// ---------- shots (start time, (localTime, t) => …) ----------
const SHOTS = [
  // "When your dog" — lying in the living room; head pops up as you walk by
  [0, (lt, t) => {
    setEnv("house");
    const up = ease.back(prog(t, C.dog, C.dog + 0.3));
    dog.pose({ x: -0.3, z: 7.2, ry: Math.PI * 0.92, lie: 1, headPitch: lerp(0.35, -0.15, up), earUp: up * 0.6, cute: 1, closed: lerp(0.5, 0, up), t });
    ownerWalk(9.3 - lt * 1.3, lt * 7, 0.9);
    owner.rotation.y = Math.PI * 1.08;
    orbit(face(dog), Math.PI * 0.92 + 0.45, 1.55, 0.12, 40, 0.05);
  }],
  // "insists on following you into the" — low tracking shot, glued to your heels
  [C.insists, (lt) => {
    setEnv("house");
    const z = 4.7 - lt * 1.3;
    ownerWalk(z, lt * 7 + 1);
    dog.pose({ x: -0.28, z: z + 0.45, ry: Math.PI, trot: 1, t: lt, wag: 1, headPitch: -0.35, earUp: 0.4, cute: 1, jawOpen: 0.25 });
    look(0.45, 0.7, z - 2.7, -0.05, 0.8, z + 0.3, 50);
  }],
  // "bathroom" — from inside: you step in, the dog squeezes in right behind you
  [C.bathroom, (lt) => {
    setEnv("house");
    W.bLeft.visible = false;
    const z = 0.55 - lt * 1.3;
    ownerWalk(z, lt * 7 + 3, -0.1);
    dog.pose({ x: 0.25, z: z + 0.45, ry: Math.PI, trot: 1, t: lt, wag: 1, headPitch: -0.3, earUp: 0.4, cute: 1 });
    look(-0.9, 1.15, -2.6, 0, 0.85, 0.2, 48);
  }],
  // "every" — morning: sitting on the bath mat, staring up at you
  [C.every, (lt) => {
    setEnv("house", { exposure: 1.2 });
    dog.pose({ x: 0.55, z: -1.05, ry: Math.PI * 0.82, sit: 1, cute: 1, headPitch: -0.45, tilt: 0.2, wag: 0.6, t: lt });
    orbit(face(dog), Math.PI * 0.82, 1.35 - lt * 0.4, 0.75, 42, -0.1);
  }],
  // "single" — night: same stare, by the tub, lit by the moon
  [C.single, (lt) => {
    setEnv("house", { exposure: 1.15, night: true });
    dog.pose({ x: 0.45, z: -1.35, ry: -Math.PI * 0.82, sit: 1, cute: 1, headPitch: -0.35, tilt: -0.18, t: lt });
    orbit(face(dog), -Math.PI * 0.82, 1.6 - lt * 0.4, 0.7, 42, -0.15);
  }],
  // "time," — door pushed open a crack: head pokes in
  [C.time, (lt) => {
    setEnv("house");
    door.rotation.y = 0.85 + ease.out(prog(lt, 0, 0.25)) * 0.15;
    const peek = ease.back(prog(lt, 0, 0.3));
    dog.pose({ x: 0.22, z: 1.3 - peek * 0.35, ry: Math.PI, cute: 1, headPitch: -0.15, tilt: 0.25, earUp: 0.3, t: lt });
    orbit(face(dog), Math.PI + 0.15, 1.15, 0.12, 44, -0.02);
  }],
  // "you probably think they just have" — you at the sink, the dog parked behind you, staring
  [C.you2, (lt, t) => {
    setEnv("house");
    W.bRight.visible = false;
    ownerSink(t, { scrub: 0, lookDown: ease.inOut(prog(t, C.think, C.think + 0.5)) });
    dog.pose({ x: 0.1, z: -0.75, ry: Math.PI, sit: 1, cute: 1, headPitch: -0.6, tilt: 0.14 * Math.sin(lt * 2), wag: 0.4, t: lt });
    const f = face(dog);
    look(-0.25, 1.62, -2.35 + lt * 0.08, f.x, f.y - 0.15, f.z, 44);
  }],
  // "separation anxiety." — lying against the closed door, sad puppy eyes, a big sigh
  [C.separation, (lt, t) => {
    setEnv("house");
    door.rotation.y = 0;
    const sigh = Math.sin(prog(t, C.anxiety, C.anxiety + 0.5) * Math.PI);
    dog.pose({ x: 0, z: 0.78, ry: 0, lie: 1, sad: 1, earBack: 0.7, cute: 1, headPitch: 0.45 - sigh * 0.12, headYaw: 0.15, closed: sigh * 0.5, t: lt });
    dog.pivot.scale.y = 1 + sigh * 0.05;
    orbit(face(dog), 0.3, 1.25 - lt * 0.1, 0.06, 40, -0.02);
  }],
  // "But in their mind," — rush into the dog's eye
  [C.but, (lt, t) => {
    setEnv("house");
    door.rotation.y = 0;
    dog.pose({ x: 0, z: 0.78, ry: 0, lie: 1, sad: 1, earBack: 0.7, cute: 1, headPitch: 0.45, headYaw: 0.15, t: lt });
    dog.updateMatrixWorld(true);
    const eye = dog.eyes[1].getWorldPosition(new THREE.Vector3());
    const p = ease.in(prog(t, C.but, C.mind));
    const f = face(dog);
    const from = new THREE.Vector3(f.x + Math.sin(0.3) * 1.13, f.y + 0.06, f.z + Math.cos(0.3) * 1.13);
    const cam = from.lerp(eye, p * 0.93);
    look(cam.x, cam.y, cam.z, eye.x, eye.y, eye.z, lerp(40, 25, p));
    if (t > C.mind - 0.1) {
      flashEl.style.background = "#fff";
      flashEl.style.opacity = String(prog(t, C.mind - 0.1, C.mind));
    }
  }],
  // "they aren't being clingy." — inside the mind: shades on the forehead, a firm "no"
  [C.mind, (lt, t) => {
    setEnv("space");
    flash(t, C.mind, 0.25);
    const no = prog(t, C.arent, C.arent + 0.55);
    const smug = ease.out(prog(t, C.clingy, C.clingy + 0.25));
    dog.pose({
      y: SPACE_Y, ry: 0.3, sit: 1, glasses: 0, earpiece: true, t: lt, wag: 0.4,
      headYaw: Math.sin(no * Math.PI * 3) * 0.45 * (1 - no * 0.3), squint: smug * 0.45, angry: smug * 0.5, earUp: 0.5,
    });
    orbit(face(dog), 0.55 + lt * 0.2, 2.4, -0.05, 34, -0.3);
  }],
  // "They're running security." — bouncer in the bathroom doorway; shades drop on "security"
  [C.theyre, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    ownerSink(t, { scrub: 0.5 });
    foam.visible = true;
    const drop = ease.bounce(prog(t, C.security, C.security + 0.3));
    dog.pose({ x: 0.0, z: -0.6, ry: 0, glasses: drop, earpiece: true, earUp: 0.6, headPitch: -0.12, angry: 0.3 * drop, t: lt, headYaw: Math.sin(lt * 2.5) * 0.25 * (1 - drop) });
    look(0.12, 0.35, 2.4 - lt * 0.45, 0, 0.75, 0.2, 42);
  }],
  // "In the wild," — dusk over the pond
  [C.wild, (lt, t) => {
    setEnv("wild", { exposure: 1.15 });
    drink(t, { closed: 0 });
    const a = -0.35 + lt * 0.12;
    look(WX + Math.sin(a) * 9, 3.6 - lt * 0.6, Math.cos(a) * 9 + 4, WX, 0.4, 1.5, 45);
  }],
  // "relieving yourself" — a wolf behind a bush, very much hoping nobody looks
  [C.relieving, (lt) => {
    setEnv("wild", { exposure: 1.2 });
    lounger.pose({ x: PRIVY.x + 0.15, z: PRIVY.z - 0.9, ry: 0.15, sit: 1, headYaw: Math.sin(lt * 3.2) * 0.6, earBack: 0.4, t: lt, squint: 0.3 });
    privyBush.rotation.z = Math.sin(lt * 23) * 0.025;
    look(WX + PRIVY.x - 0.2, 1.25, PRIVY.z + 3.4, WX + PRIVY.x, 0.85, PRIVY.z - 0.3, 40);
  }],
  // "or drinking water" — lapping at the pond, ripples
  [C.or, (lt, t) => {
    setEnv("wild", { exposure: 1.2 });
    drink(t, { closed: 0.3 });
    orbit(face(drinker), Math.PI / 2 + 0.3, 2.7, 0.25, 38, -0.12);
  }],
  // "is the exact moment an animal" — eyes shut, completely unaware
  [C.is1, (lt, t) => {
    setEnv("wild", { exposure: 1.2 });
    drink(t);
    const d = 2.4 - lt * 0.35;
    look(WX + 0.35, 0.32, DRINK.z - 1.35 - d, WX + 0.1, 0.4, DRINK.z - 0.9, 30);
  }],
  // "is most vulnerable" — something in the bush behind it opens its eyes
  [C.is2, (lt, t) => {
    setEnv("wild", { exposure: 1.15 });
    drink(t);
    bushEyes.visible = true;
    bushEyes.scale.y = 1.4 * Math.max(0.02, ease.out(prog(t, C.vulnerable, C.vulnerable + 0.18)));
    const eyes = bushEyes.getWorldPosition(new THREE.Vector3());
    look(WX + 1.9, 0.7, 3.1 + lt * 0.35, eyes.x, eyes.y, eyes.z, 36);
  }],
  // "to an ambush." — it pounces
  [C.to, (lt, t) => {
    setEnv("wild", { exposure: 1.2 });
    const jump = prog(t, C.ambush - 0.15, C.ambush + 0.35);
    drink(t, { closed: jump > 0 ? 0 : 0.9 });
    if (jump > 0) drinker.pose({ x: DRINK.x, z: DRINK.z, ry: Math.PI, headPitch: -0.3, headYaw: 0.8, earBack: 1, t: lt });
    const from = new THREE.Vector3(AMBUSH.x, 0, AMBUSH.z - 0.2), to = new THREE.Vector3(DRINK.x + 0.4, 0, DRINK.z + 0.9);
    const p = from.lerp(to, ease.out(jump));
    predator.pose({
      x: p.x, y: Math.sin(jump * Math.PI) * 0.9 + (jump === 0 ? -0.15 : 0), z: p.z, ry: Math.atan2(DRINK.x - AMBUSH.x, DRINK.z - AMBUSH.z),
      rear: jump > 0 ? 0.45 * Math.sin(jump * Math.PI) : 0, snarl: 1, angry: 1, jawOpen: jump > 0 ? 0.9 : 0.2, earBack: 0.6, t: lt,
    });
    bushEyes.visible = jump === 0;
    ambushBush.rotation.x = Math.sin(lt * 30) * 0.06 * (1 - prog(t, C.ambush, C.ambush + 0.4));
    const [sx, sy] = shake(t, 0.06 * prog(t, C.ambush, C.ambush + 0.05) * (1 - prog(t, C.ambush + 0.1, C.ambush + 0.5)));
    look(WX + 3.3 + sx, 1.0 + sy, 2.5, WX + 0.7, 0.6, 5.0, 48);
    flash(t, C.ambush, 0.35, "#d1121a", 0.75);
  }],
  // "A dog's instinct is to" — a lookout on the rock, scanning
  [C.a, (lt, t) => {
    setEnv("wild", { exposure: 1.2 });
    drink(t);
    sentinel.pose({ x: LOOKOUT.x, y: 0.42, z: LOOKOUT.z, ry: 2.6 + Math.sin(lt * 1.6) * 0.35, headYaw: Math.sin(lt * 2.2) * 0.3, earUp: 1, t: lt });
    orbit(face(sentinel), 2.6 + 0.7, 2.1 - lt * 0.15, -0.45, 40, 0.05);
  }],
  // "stand guard" — it plants itself between the drinker and the bush; the eyes back off
  [C.stand, (lt, t) => {
    setEnv("wild", { exposure: 1.2 });
    drink(t);
    const step = ease.out(prog(t, C.stand, C.stand + 0.3));
    const pos = new THREE.Vector3(LOOKOUT.x, 0.42, LOOKOUT.z).lerp(new THREE.Vector3(0.75, 0, DRINK.z + 1.1), step);
    sentinel.pose({ x: pos.x, y: pos.y, z: pos.z, ry: lerp(2.6, 0.35, step), snarl: prog(t, C.guard - 0.1, C.guard + 0.1), angry: 1, earBack: 0.3, headPitch: -0.1, t: lt, trot: step < 1 ? 1 : 0 });
    bushEyes.visible = true;
    const back = prog(t, C.guard + 0.05, C.guard + 0.3);
    bushEyes.scale.y = 1.4 * Math.max(0.02, 1 - back);
    look(WX + 3.4, 0.9, 2.6, WX + 0.8, 0.55, 5.4, 52);
  }],
  // "whenever a pack member lets their defenses down." — your face full of soap; the dog on duty
  [C.whenever, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    W.bFront.visible = false;
    door.visible = false;
    const splash = prog(t, C.defenses, C.defenses + 0.6);
    ownerSink(t * (1 + splash), { scrub: 1 });
    foam.visible = true;
    dog.pose({ x: -0.38, z: -1.85, ry: -0.2, glasses: 1, earpiece: true, earUp: 0.6, headYaw: Math.sin(lt * 1.7) * 0.5, angry: 0.3, t: lt });
    look(0.5 - lt * 0.08, 0.95, 0.9 - lt * 0.2, -0.05, 0.85, -2.0, 46);
  }],
  // "They don't follow you" — alone on the sofa and loving it
  [C.dont, (lt) => {
    setEnv("house", { exposure: 1.1 });
    dog.pose({ x: -0.2, y: SOFA_SEAT_Y, z: 10.15, ry: -Math.PI / 2 - 0.35, lie: 1, closed: 0.55, headPitch: 0.2, tilt: 0.25, wag: 0.3, wagSpeed: 6, t: lt });
    orbit(face(dog), -Math.PI / 2 - 0.35 - 0.5, 2.3 - lt * 0.15, 0.45, 44, -0.2);
  }],
  // "because they can't be alone." — big lazy yawn on "alone"
  [C.because, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    const y = Math.sin(prog(t, C.alone - 0.15, C.alone + 0.55) * Math.PI);
    dog.pose({ x: -0.2, y: SOFA_SEAT_Y, z: 10.15, ry: -Math.PI / 2 - 0.35, lie: 1, closed: lerp(0.55, 1, y), headPitch: 0.2 - y * 0.5, jawOpen: y * 1.4, tilt: 0.25, t: lt });
    orbit(face(dog), -Math.PI / 2 - 0.35 - 0.25, 1.3, 0.12, 38, -0.02);
  }],
  // "They follow you because they think" — bodyguard escort, slow motion
  [C.follow2, (lt) => {
    setEnv("house");
    const z = 4.9 - lt * 0.75;
    ownerWalk(z, lt * 4);
    dog.pose({ x: -0.28, z: z + 0.5, ry: Math.PI, trot: 1, trotSpeed: 6.5, t: lt, glasses: 1, earpiece: true, earUp: 0.5, headYaw: Math.sin(lt * 1.8) * 0.45, angry: 0.25 });
    look(-0.15, 0.4, z - 2.1, -0.1, 0.95, z + 0.4, 48);
  }],
  // "you'd be defenseless" — soap in your eyes, groping for a towel
  [C.youd, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    curtain.visible = false;
    ownerSink(t, { scrub: 0, grope: ease.out(prog(lt, 0, 0.35)) });
    foam.visible = true;
    dog.pose({ x: 0.45, z: -1.35, ry: Math.PI + 0.25, sit: 1, glasses: 1, earpiece: true, earUp: 0.6, headPitch: -0.45, headYaw: Math.sin(lt * 9) * 0.15, t: lt });
    owner.update();
    owner.updateMatrixWorld(true);
    const hd = owner.bones?.Bip01_Head.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0.15, 1.55, -2.6);
    look(1.45, 1.5, -3.1, hd.x + 0.25, hd.y - 0.2, hd.z, 46);
  }],
  // "without them." — the bodyguard delivers the towel
  [C.without, (lt, t) => {
    setEnv("house", { exposure: 1.1 });
    curtain.visible = false;
    ownerSink(t, { scrub: 0, grope: 1 - ease.inOut(prog(t, C.them, C.them + 0.4)) * 0.3 });
    foam.visible = true;
    const up = ease.back(prog(lt, 0, 0.3));
    const toCam = ease.inOut(prog(t, C.them, C.them + 0.3));
    dog.pose({
      x: 0.5, z: -1.3, ry: Math.PI, rear: up * 0.75, glasses: 1, earpiece: true, earUp: 0.5,
      headPitch: -0.15 - toCam * 0.1, headYaw: -toCam * 0.55, wag: 1, t: lt, cute: toCam,
    });
    towelInMouth.visible = true;
    orbit(face(dog), Math.PI * 0.72, 1.35 - lt * 0.25, 0.1, 46, -0.12);
  }],
];

// ---------- frame ----------
const shotStarts = SHOTS.map((s) => s[0]);
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  if (!ENV.bath) captureEnvs();
  let i = SHOTS.length - 1;
  while (i > 0 && t < shotStarts[i]) i--;
  resetWorld();
  SHOTS[i][1](t - SHOTS[i][0], t);
  pickEnv();
  owner.update();
  water.material.bumpMap.offset.set(t * 0.02, t * 0.015);
  captions(t);
});

window.__dbg = { scene, camera, renderer, C, SHOTS, owner };
short.start();
