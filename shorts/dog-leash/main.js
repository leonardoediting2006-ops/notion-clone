import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { loadAvatar } from "../../js/avatar.js";
import { loadProp, useEnvironment, bookshelf, floorLamp, wallArt, shoes } from "../../js/props.js";
import { car } from "../../js/vehicles.js";
import { createDog } from "../../js/dog.js";
import { plushToy } from "../../js/toys.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { createLeash, sag, wrap } from "./leash.js";

// "He slept by the front door holding his leash" — an emotional story short, 60 fps.
// Every cut and action is keyed to a word of voiceover.srt; shots are pure functions of time.
// Sets: the house at night (hallway + outside), the shelter at dusk, the winter flashback
// (desaturated, snowing) and a dark void for what the dog believes about people.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
// index of the nth occurrence of a word (one entry per spoken word)
function idx(word, nth = 1) {
  let n = 0;
  for (let i = 0; i < words.length; i++) if (norm(words[i].text) === norm(word) && ++n === nth) return i;
  throw new Error(`Cue "${word}" #${nth} not found in the voiceover`);
}
const at = (word, nth = 1) => words[idx(word, nth)].start;
const before = (word, nth = 1) => words[idx(word, nth) - 1].start; // the word spoken just before
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 2.0) * FPS) / FPS;

const PHONE_AT = [0.01, -0.085, 0.035]; // phone in the right hand, hand-local metres
const short = createShort({ duration: DURATION, fps: FPS, lights: false, fov: 50 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.02;
camera.far = 1500;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.3);

// ---------- word cues (seconds) ----------
const C = {
  every: at("every"), bringing: at("bringing"), shelter: at("shelter"), my: at("my"), slept: at("slept"),
  front: at("front"), door: at("door"), holding: at("holding"), leash: at("leash"), mouth: at("mouth"),
  I: at("i"), thought: at("thought"), run: at("run"), away: at("away"),
  until: at("until"), shelter2: at("shelter", 2), told: at("told"), story: at("story"),
  his4: at("his", 4), previous: at("previous"), took: at("took"), walk: at("walk"),
  tied: at("tied"), leash2: at("leash", 2), fence: at("fence"), in2: at("in", 2), middle: at("middle"), winter: at("winter"),
  and1: at("and"), never: at("never"), came: at("came"), back: at("back"),
  wasnt: before("wasn't"), holding2: at("holding", 2), leash3: at("leash", 3), because: at("because"), leave: at("leave"),
  hewas: before("was"), holding3: at("holding", 3), because2: at("because", 2), every2: at("every", 2), human: at("human"),
  eventually: at("eventually"), tired: at("tired"),
  and2: at("and", 2), ready: at("ready"), so: at("so"), burden: at("burden"),
  tonight: at("tonight"), sat: at("sat"), floor: at("floor"), beside: at("beside"),
  took2: at("took", 2), leash4: at("leash", 4), from: at("from", 2), mouth2: at("mouth", 2),
  and3: at("and", 3), whispered: at("whispered"), pack: at("pack"), anymore: at("anymore"),
  youre: at("you're"), home2: at("home", 2),
  and4: at("and", 4), first: at("first"), time: at("time"), finally: before("finally"), closed: at("closed"), eyes: at("eyes"),
};
const LINES = [
  "Every night,", "after bringing him", "home from the shelter,", "my dog slept", "by the front door,",
  "holding his leash", "in his mouth.", "I thought he wanted", "to run away,", "until the shelter",
  "told me his story.", "His previous family", "took him for a walk,", "tied his leash", "to a fence",
  "in the middle", "of winter,", "and never came back.", "He wasn't holding", "that leash",
  "because he wanted", "to leave.", "He was holding it", "because he thought", "every human",
  "eventually", "gets tired of him,", "and he wanted", "to be ready", "so he wouldn't", "be a burden.",
  "Tonight, I sat", "on the floor", "beside him,", "took the leash", "from his mouth,", "and whispered,",
  "\"You don't have", "to pack anymore.", "You're home.\"", "And for the", "first time,", "he finally",
  "closed his eyes.",
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
  inOut3: gsap.parseEase("power3.inOut"),
  snap: gsap.parseEase("expo.out"),
};
let seed = 77;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rand() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw, { repeat = null, color = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  t.anisotropy = 8;
  return t;
}
function glowTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  return canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });
}
const GLOW = glowTexture();

// ---------- materials ----------
const tex = (f, repeat, color = true) => short.loadTexture(`../../assets/textures/${f}`, { repeat, color });
const M = {
  hardwood: new THREE.MeshStandardMaterial({
    map: tex("hardwood2_diffuse.jpg", [1 / 3, 1 / 1.5]),
    bumpMap: tex("hardwood2_bump.jpg", [1 / 3, 1 / 1.5], false),
    bumpScale: 1.5,
    roughness: 0.4,
  }),
  grass: new THREE.MeshStandardMaterial({ map: tex("grass.jpg", [1 / 3, 1 / 3]), roughness: 1, color: 0x6f7f6a }),
  wall: T.plaster(0xd9cfbf, [0.5, 0.5]),
  wallDark: T.plaster(0x7d8a8f, [0.5, 0.5]),
  ceiling: T.plaster(0xf2eee6, [0.5, 0.5]),
  trim: T.paintedWood(0xf2efe8),
  door: T.paintedWood(0x2f4a5c),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.25 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb4c8, roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.18, depthWrite: false }),
  runner: T.fabric(0x5b3a36, { repeat: [3, 8], weave: 4, key: "runner" }),
  blanket: T.fabric(0x6d8aa0, { repeat: [3, 3], weave: 3, key: "blanket" }),
  doormat: T.fabric(0x5a4632, { repeat: [4, 3], weave: 3, key: "mat" }),
  siding: T.siding(0x8e9aa3),
  concrete: T.concrete({ tile: 1, repeat: [1, 1] }),
  block: T.concrete({ tile: 0.4, repeat: [1, 1], color: 0xc9c3b6 }),
  asphalt: T.asphalt(),
  shingles: T.shingles(),
  warmWindow: new THREE.MeshBasicMaterial({ color: 0xffc27a }),
  wood: T.paintedWood(0x5a3d28),
  barkPost: T.bark(),
};

// ---------- night sky, dusk sky, winter sky ----------
const nightSky = canvasTex(2048, 1024, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#03060f");
  g.addColorStop(0.42, "#0b1630");
  g.addColorStop(0.5, "#1c2c4a");
  g.addColorStop(0.53, "#0a0f18");
  g.addColorStop(1, "#05070b");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const sx = rand() * w, sy = rand() * h * 0.5, r = rand() ** 6 * 1.8 + 0.4;
    x.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.75})`;
    x.beginPath();
    x.arc(sx, sy, r, 0, Math.PI * 2);
    x.fill();
  }
});
const skyBall = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.MeshBasicMaterial({ map: nightSky, side: THREE.BackSide, fog: false }));
scene.add(skyBall);
// the moon, low over the house (front left)
const MOON_DIR = V(-0.45, 0.42, 1).normalize();
const moon = group(0, 0, 0, scene);
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({
    fog: false,
    map: canvasTex(256, 256, (x) => {
      x.fillStyle = "#f4f1e6";
      x.beginPath();
      x.arc(128, 128, 126, 0, Math.PI * 2);
      x.fill();
      for (let i = 0; i < 26; i++) {
        x.fillStyle = `rgba(150,150,160,${0.12 + rand() * 0.2})`;
        x.beginPath();
        x.arc(40 + rand() * 176, 40 + rand() * 176, 6 + rand() * 26, 0, Math.PI * 2);
        x.fill();
      }
    }),
  }));
  moon.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x9fb6ff, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(70);
  moon.add(halo);
  moon.position.copy(MOON_DIR).multiplyScalar(300);
  moon.lookAt(0, 0, 0);
}

// ---------- lights (per set, toggled in setEnv) ----------
const hemi = new THREE.HemisphereLight(0x5a6c96, 0x14110e, 0.35);
scene.add(hemi);
// moonlight through the front door's side window
const moonLight = new THREE.DirectionalLight(0xa9c0ff, 4.5);
moonLight.position.copy(MOON_DIR).multiplyScalar(8).add(V(0.2, 0, -1));
moonLight.target.position.set(0.2, 0, -1.0);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 });
moonLight.shadow.bias = -0.0004;
moonLight.shadow.normalBias = 0.02;
scene.add(moonLight, moonLight.target);
// warm light spilling from the living room (left) and the bedroom (end of the hall)
const roomLight = new THREE.PointLight(0xffa860, 9, 7, 1.6);
roomLight.position.set(-2.4, 1.7, -4.1);
roomLight.castShadow = true;
roomLight.shadow.mapSize.set(1024, 1024);
roomLight.shadow.bias = -0.002;
const bedLight = new THREE.PointLight(0xffb070, 7, 7, 1.6);
bedLight.position.set(0.3, 1.9, -8.6);
bedLight.castShadow = true;
bedLight.shadow.mapSize.set(1024, 1024);
bedLight.shadow.bias = -0.002;
scene.add(roomLight, bedLight);
const porchLight = new THREE.PointLight(0xffc78a, 6, 6, 1.6);
porchLight.position.set(1.0, 2.3, 0.5);
scene.add(porchLight);
// soft face light used by some close-ups (positioned per shot)
const fill = new THREE.PointLight(0xffd2a8, 0, 3, 2);
scene.add(fill);
const moonFill = new THREE.PointLight(0x9db6ff, 0, 3, 2);
scene.add(moonFill);

// ================= HOUSE: hallway x -1.1..1.1, z -7..0; front door in z = 0 =================
const house = group(0, 0, 0, scene);
const H = 2.6;
const W = {};
const DOOR_X = 0.2, DOOR_W = 0.95;
const SIDE_X = -0.72, SIDE_W = 0.34; // tall glass panel beside the door
floorPlane(2.2, 7, M.hardwood, 0, 0.002, -3.5, house);
W.ceiling = box(2.4, 0.06, 7.2, M.ceiling, 0, H + 0.03, -3.5, house);
// left wall with the living-room opening (z -4.6..-3.5)
W.left = group(0, 0, 0, house);
box(0.1, H, 2.4, M.wall, -1.15, H / 2, -5.8, W.left);
box(0.1, H, 3.5, M.wall, -1.15, H / 2, -1.75, W.left);
box(0.1, H - 2.15, 1.1, M.wall, -1.15, 2.15 + (H - 2.15) / 2, -4.05, W.left);
W.right = box(0.1, H, 7, M.wall, 1.15, H / 2, -3.5, house);
// end wall with the bedroom door (x -0.25..0.65)
W.end = group(0, 0, 0, house);
box(0.9, H, 0.1, M.wall, -0.7, H / 2, -7.05, W.end);
box(0.5, H, 0.1, M.wall, 0.9, H / 2, -7.05, W.end);
box(0.9, H - 2.1, 0.1, M.wall, 0.2, 2.1 + (H - 2.1) / 2, -7.05, W.end);
// front wall: side window + door openings
W.front = group(0, 0, 0, house);
function frontWall(m, z, d, parent) {
  const l0 = -1.2, l1 = SIDE_X - SIDE_W / 2, r0 = DOOR_X + DOOR_W / 2, r1 = 1.2;
  box(l1 - l0, H, d, m, (l0 + l1) / 2, H / 2, z, parent);
  box(r1 - r0, H, d, m, (r0 + r1) / 2, H / 2, z, parent);
  const mid0 = SIDE_X + SIDE_W / 2, mid1 = DOOR_X - DOOR_W / 2;
  box(mid1 - mid0, H, d, m, (mid0 + mid1) / 2, H / 2, z, parent);
  box(SIDE_W, 0.3, d, m, SIDE_X, 0.15, z, parent); // under the window
  box(SIDE_W, H - 2.15, d, m, SIDE_X, 2.15 + (H - 2.15) / 2, z, parent);
  box(DOOR_W, H - 2.15, d, m, DOOR_X, 2.15 + (H - 2.15) / 2, z, parent);
}
{
  frontWall(M.wall, 0.07, 0.14, W.front);
  // window: glass + muntins + trim
  box(SIDE_W, 1.85, 0.01, M.glass, SIDE_X, 1.225, 0.07, W.front);
  for (const y of [0.75, 1.25, 1.7]) box(SIDE_W, 0.025, 0.04, M.trim, SIDE_X, y, 0.07, W.front);
  for (const s of [-1, 1]) box(0.05, 1.95, 0.16, M.trim, SIDE_X + s * (SIDE_W / 2 + 0.02), 1.225, 0.0, W.front);
  box(SIDE_W + 0.1, 0.05, 0.18, M.trim, SIDE_X, 0.3, -0.02, W.front);
  // door casing
  for (const s of [-1, 1]) box(0.08, 2.2, 0.18, M.trim, DOOR_X + s * (DOOR_W / 2 + 0.035), 1.1, 0.0, W.front);
  box(DOOR_W + 0.15, 0.08, 0.18, M.trim, DOOR_X, 2.19, 0, W.front);
}
// the front door (closed): panels, brass knob, deadbolt, a small glass transom of light
const door = group(DOOR_X, 0, 0.05, house);
box(DOOR_W - 0.02, 2.13, 0.05, M.door, 0, 1.065, 0, door);
for (const [y, h] of [[0.5, 0.65], [1.45, 0.95]]) for (const sx of [-0.2, 0.2]) box(0.32, h, 0.012, M.door, sx, y, -0.03, door);
const KNOB = V(DOOR_X + DOOR_W / 2 - 0.1, 1.0, -0.02);
mesh(new THREE.SphereGeometry(0.032, 16, 12), M.brass, KNOB.x - DOOR_X, 1.0, -0.06, door);
mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 16).rotateX(Math.PI / 2), M.brass, KNOB.x - DOOR_X, 1.0, -0.03, door);
mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16).rotateX(Math.PI / 2), M.brass, KNOB.x - DOOR_X, 1.2, -0.035, door);
// skirting
for (const [w, d, x, z] of [[0.03, 7, 1.09, -3.5], [0.03, 2.3, -1.09, -5.8], [0.03, 3.4, -1.09, -1.75]]) box(w, 0.12, d, M.trim, x, 0.06, z, house);
// runner rug, doormat, the dog's blanket by the door
floorPlane(0.85, 4.6, M.runner, 0.05, 0.006, -3.8, house);
box(0.9, 0.014, 0.55, M.doormat, DOOR_X, 0.008, -0.35, house);
// coat hooks with jackets, shoes, umbrella stand, console table with keys and a framed photo
box(0.7, 0.08, 0.03, M.wood, 0.75, 1.68, -0.02 - 0.02, house).rotation.y = 0;
{
  const hooks = group(1.12, 1.7, -0.75, house);
  hooks.rotation.y = -Math.PI / 2;
  box(0.9, 0.08, 0.03, M.wood, 0, 0, 0, hooks);
  for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8).rotateX(Math.PI / 2 - 0.4), M.brass, -0.33 + i * 0.22, -0.01, 0.04, hooks);
  box(0.42, 0.85, 0.16, T.fabric(0x3c4a3c, { key: "coat1", weave: 3 }), -0.25, -0.45, 0.1, hooks);
  box(0.38, 0.7, 0.14, T.fabric(0x6b4f3a, { key: "coat2", weave: 3 }), 0.2, -0.38, 0.09, hooks);
}
place(shoes(), 0.85, 0, -1.55, -Math.PI / 2 + 0.2);
place(shoes({ color: 0x6e6a64 }), 0.9, 0, -1.95, -Math.PI / 2 - 0.3);
{
  const stand = mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.5, 20, 1, true), mat(0x3a3f44, { roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide }), -0.95, 0.25, -0.35, house);
  for (const [dx, dz, c] of [[0.02, 0.01, 0x1d1d22], [-0.03, -0.02, 0x7a1f24]]) {
    const u = mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.85, 8), mat(c), stand.position.x + dx, 0.48, stand.position.z + dz, house);
    u.rotation.z = dx * 3;
  }
}
// console table on the right wall
{
  const g = group(1.0, 0, -2.9, house);
  g.rotation.y = -Math.PI / 2;
  box(1.0, 0.04, 0.3, M.wood, 0, 0.8, 0, g);
  for (const sx of [-0.46, 0.46]) for (const sz of [-0.12, 0.12]) box(0.04, 0.8, 0.04, M.wood, sx, 0.4, sz, g);
  box(0.9, 0.03, 0.26, M.wood, 0, 0.18, 0, g);
  mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.04, 20), mat(0x8b6b4a, { roughness: 0.5 }), -0.25, 0.84, 0, g); // key bowl
  box(0.06, 0.012, 0.02, M.brass, -0.24, 0.865, 0.01, g);
  // framed photo of the dog (the shelter photo, now in a frame)
  const photo = group(0.2, 0.93, -0.03, g);
  photo.rotation.x = -0.18;
  box(0.2, 0.25, 0.02, mat(0x2a1d14), 0, 0, 0, photo);
  box(0.16, 0.21, 0.005, mat(0xd8c7a8), 0, 0, 0.011, photo);
  place(loadProp(short, "GlassVaseFlowers", { height: 0.36 }), 0.36, 0.82, 0, 0, g);
}
place(wallArt({ w: 0.55, h: 0.7, style: "landscape", seed: 3 }), 1.1, 1.65, -2.9, -Math.PI / 2);
place(wallArt({ w: 0.4, h: 0.5, style: "sunset", seed: 6 }), -1.1, 1.6, -1.5, Math.PI / 2);
place(wallArt({ w: 0.42, h: 0.55, style: "abstract", seed: 8 }), -1.1, 1.6, -5.7, Math.PI / 2);
// wall clock (ticking in the silence)
{
  const clock = group(1.1, 2.0, -4.6, house);
  clock.rotation.y = -Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 32).rotateX(Math.PI / 2), mat(0x2a2a2a), 0, 0, 0.0, clock);
  mesh(new THREE.CircleGeometry(0.135, 32), mat(0xf4efe4), 0, 0, 0.021, clock);
  const hh = box(0.012, 0.07, 0.004, mat(0x111111), 0, 0.03, 0.025, clock);
  hh.rotation.z = -2.6; // ~2 a.m.
  const mh = box(0.008, 0.11, 0.004, mat(0x111111), 0, 0.05, 0.027, clock);
  mh.rotation.z = -0.9;
}
// ceiling light (off) and a radiator
mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), mat(0xf0ece4, { roughness: 0.3 }), 0, H - 0.01, -3.0, house);
{
  const rad = group(-1.07, 0.15, -2.6, house);
  for (let i = 0; i < 9; i++) box(0.06, 0.55, 0.05, mat(0xe8e6e0, { roughness: 0.4 }), 0, 0.3, i * 0.075, rad);
}
// living room glimpsed through the left opening (warm lamp)
{
  const lr = group(0, 0, 0, house);
  floorPlane(3, 3.2, M.hardwood, -2.65, 0.002, -4.1, lr);
  box(3.1, 0.06, 3.3, M.ceiling, -2.65, H + 0.03, -4.1, lr);
  box(0.1, H, 3.3, M.wallDark, -4.2, H / 2, -4.1, lr);
  box(3.1, H, 0.1, M.wallDark, -2.65, H / 2, -5.75, lr);
  box(3.1, H, 0.1, M.wallDark, -2.65, H / 2, -2.45, lr);
  place(bookshelf({ w: 1.1, h: 1.9, seed: 5 }), -2.4, 0, -5.7, 0, lr);
  const lamp = place(floorLamp({ h: 1.55 }), -3.3, 0, -4.6, 0, lr);
  place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.0 }), -3.75, 0, -3.9, Math.PI / 2, lr);
  lamp.light && (lamp.light.intensity = 0);
}
// bedroom at the end of the hall (warm bedside light)
{
  const br = group(0, 0, 0, house);
  floorPlane(3, 3, M.hardwood, 0.2, 0.002, -8.6, br);
  box(3.2, H, 0.1, M.wallDark, 0.2, H / 2, -10.1, br);
  box(0.1, H, 3, M.wallDark, -1.3, H / 2, -8.6, br);
  box(0.1, H, 3, M.wallDark, 1.7, H / 2, -8.6, br);
  box(3.2, 0.06, 3.1, M.ceiling, 0.2, H + 0.03, -8.6, br);
  box(1.5, 0.45, 2.0, T.fabric(0xd8d2c4, { key: "duvet", weave: 3 }), 0.8, 0.25, -8.9, br);
  box(1.6, 1.0, 0.08, M.wood, 0.8, 0.5, -9.95, br);
}
// ---------- outside the front of the house (night) ----------
const outside = group(0, 0, 0, scene);
floorPlane(80, 60, M.grass, 0, -0.02, 30, outside);
floorPlane(1.3, 8, M.concrete, DOOR_X, 0.0, 4.2, outside);
floorPlane(2.6, 1.6, M.concrete, DOOR_X - 0.3, 0.005, 0.85, outside);
{
  // facade: siding, warm windows, gable roof, porch light
  const f = group(0, 0, 0, outside);
  box(4.4, 3.0, 0.1, M.siding, -3.4, 1.5, 0.19, f);
  box(4.4, 3.0, 0.1, M.siding, 3.4, 1.5, 0.19, f);
  box(2.4, 0.4, 0.1, M.siding, 0, 2.8, 0.19, f);
  // the front wall of the hallway, outside face
  frontWall(M.siding, 0.15, 0.02, f);
  box(2.4, 0.4, 0.1, M.siding, 0, 2.8, 0.19, f);
  for (const x of [-3.2, 3.4]) {
    box(1.3, 1.25, 0.02, M.warmWindow, x, 1.45, 0.25, f);
    box(1.45, 0.08, 0.12, M.trim, x, 0.8, 0.27, f);
    box(1.45, 0.08, 0.12, M.trim, x, 2.1, 0.27, f);
    for (const s of [-1, 1]) box(0.08, 1.35, 0.12, M.trim, x + s * 0.7, 1.45, 0.27, f);
    box(0.04, 1.25, 0.06, M.trim, x, 1.45, 0.27, f);
  }
  // roof
  const roofGeo = new THREE.BufferGeometry();
  const rw = 6.2, rh = 2.2, rd = 0.35;
  roofGeo.setAttribute("position", new THREE.Float32BufferAttribute([-rw, 3, rd, rw, 3, rd, 0, 3 + rh, rd], 3));
  roofGeo.computeVertexNormals();
  mesh(roofGeo, M.siding, 0, 0, 0, f);
  for (const s of [-1, 1]) {
    const eave = box(6.6, 0.12, 1.2, M.shingles, s * 3.0, 3 + rh / 2 + 0.05, -0.1, f);
    eave.rotation.z = -s * Math.atan2(rh, rw);
  }
  // porch lamp
  box(0.14, 0.24, 0.1, mat(0x1a1a1a, { metalness: 0.5, roughness: 0.4 }), 0.95, 2.25, 0.3, f);
  box(0.1, 0.16, 0.08, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), 0.95, 2.24, 0.33, f);
  // step
  box(1.6, 0.12, 0.5, M.concrete, DOOR_X, 0.06, 0.45, f);
}
const nightForest = createForest(outside);
for (let i = 0; i < 9; i++) nightForest.tree(-16 + i * 4 + rr(-1, 1), rr(12, 18), { height: rr(2.8, 3.6), scale: rr(1.3, 1.8) });
for (const x of [-5.5, -2.0, 2.4, 5.8]) nightForest.bush(x, 0.9 + rr(0, 0.3), rr(1.0, 1.4));
nightForest.build();

// ================= THE SHELTER (dusk), centred on x = 200 =================
const SX = 200;
const shelter = group(SX, 0, 0, scene);
const duskSky = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), new THREE.MeshBasicMaterial({ map: T.skyTexture("dusk"), fog: false }));
duskSky.position.set(0, 12, 40);
duskSky.rotation.y = Math.PI;
shelter.add(duskSky);
floorPlane(60, 40, M.asphalt, 0, 0, 10, shelter);
floorPlane(3, 8, M.concrete, 0, 0.01, 3.5, shelter);
{
  // low concrete-block building facing +z, glass entrance, lit sign
  box(14, 3.6, 0.3, M.block, 0, 1.8, -0.15, shelter);
  box(14.4, 0.35, 1.2, mat(0x3a3f45), 0, 3.7, 0.3, shelter); // canopy edge
  box(1.8, 2.3, 0.04, new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.4 }), 0, 1.15, 0.02, shelter);
  box(1.86, 2.36, 0.06, mat(0x6d7378, { metalness: 0.6, roughness: 0.4 }), 0, 1.18, 0.0, shelter);
  box(0.02, 2.3, 0.08, mat(0x6d7378, { metalness: 0.6 }), 0, 1.15, 0.04, shelter);
  // warm lobby glow behind the glass
  box(1.7, 2.2, 0.01, new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0.35 }), 0, 1.15, 0.03, shelter);
  const sign = canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = "#1f3a33";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#e9e2c9";
    x.lineWidth = 10;
    x.strokeRect(14, 14, w - 28, h - 28);
    x.fillStyle = "#f3ecd2";
    x.font = "bold 150px Georgia, serif";
    x.textAlign = "center";
    x.fillText("ANIMAL", w / 2 + 80, 200);
    x.fillText("SHELTER", w / 2 + 80, 350);
    x.font = "italic 52px Georgia, serif";
    x.fillText("adopt  •  love  •  rescue", w / 2 + 80, 440);
    // paw print
    x.fillStyle = "#f3ecd2";
    const px = 140, py = 270;
    x.beginPath();
    x.ellipse(px, py + 20, 34, 28, 0, 0, Math.PI * 2);
    x.fill();
    for (const [dx, dy] of [[-38, -22], [-14, -46], [14, -46], [38, -22]]) {
      x.beginPath();
      x.ellipse(px + dx, py + dy, 12, 15, 0, 0, Math.PI * 2);
      x.fill();
    }
  });
  box(2.36, 1.2, 0.1, mat(0x1f3a33), 0, 3.0, 0.9, shelter);
  mesh(new THREE.PlaneGeometry(2.3, 1.15), new THREE.MeshBasicMaterial({ map: sign }), 0, 3.0, 0.951, shelter);
  for (const s of [-1, 1]) {
    box(1.3, 1.0, 0.03, M.warmWindow, s * 3.8, 1.6, 0.02, shelter);
    box(1.4, 1.1, 0.05, mat(0x6d7378), s * 3.8, 1.6, 0.0, shelter);
  }
  // chain-link fence runs to the sides (kennel yard)
  const link = canvasTex(256, 256, (x) => {
    x.clearRect(0, 0, 256, 256);
    x.strokeStyle = "rgba(190,195,200,1)";
    x.lineWidth = 5;
    for (let i = -256; i < 512; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke();
      x.beginPath(); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke();
    }
  }, { repeat: [10, 1] });
  const fenceMat = new THREE.MeshStandardMaterial({ map: link, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const fn = mesh(new THREE.PlaneGeometry(10, 1.8), fenceMat, s * 12, 0.9, 1.5, shelter);
    for (let i = 0; i <= 5; i++) box(0.05, 1.9, 0.05, mat(0x8a8f94, { metalness: 0.6 }), s * 12 - 5 + i * 2, 0.95, 1.5, shelter);
  }
  // parked cars, a tree
  const c1 = car("sedan", { color: 0x5a6670 });
  c1.position.set(-5.5, 0, 9);
  c1.rotation.y = Math.PI / 2;
  shelter.add(c1);
  const c2 = car("hatchback", { color: 0x8a2c22 });
  c2.position.set(6.0, 0, 8.4);
  c2.rotation.y = -Math.PI / 2;
  shelter.add(c2);
  const sf = createForest(shelter);
  for (let i = 0; i < 8; i++) sf.tree(-24 + i * 7 + rr(-1, 1), rr(-8, -5), { height: rr(2.8, 3.4), scale: rr(1.4, 1.9) });
  sf.build();
}
const shelterSun = new THREE.DirectionalLight(0xffb27a, 2.6);
shelterSun.position.set(SX + 8, 6, 14);
shelterSun.target.position.set(SX, 0, 2);
shelterSun.castShadow = true;
shelterSun.shadow.mapSize.set(2048, 2048);
Object.assign(shelterSun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
shelterSun.shadow.bias = -0.0004;
scene.add(shelterSun, shelterSun.target);

// ================= WINTER FLASHBACK, centred on x = -200 =================
const WX = -200;
const winter = group(WX, 0, 0, scene);
const snowTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = "#e9eef2";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const v = 215 + rand() * 40;
    x.fillStyle = `rgba(${v},${v + 4},${v + 10},0.5)`;
    x.fillRect(rand() * w, rand() * h, 2, 2);
  }
}, { repeat: [20, 20] });
const snowBump = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = "#808080";
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    const v = rand() > 0.5 ? 255 : 0;
    x.save();
    x.translate(rand() * w, rand() * h);
    x.scale(4 + rand() * 14, 3 + rand() * 8);
    g.addColorStop(0, `rgba(${v},${v},${v},0.25)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    x.fillStyle = g;
    x.fillRect(-1, -1, 2, 2);
    x.restore();
  }
}, { repeat: [20, 20], color: false });
M.snow = new THREE.MeshStandardMaterial({ map: snowTex, bumpMap: snowBump, bumpScale: 3, roughness: 0.85, color: 0xffffff });
M.snowRoad = new THREE.MeshStandardMaterial({ map: T.asphalt().map, color: 0xb9c0c6, roughness: 0.7 });
floorPlane(400, 300, M.snow, 0, 0, 0, winter);
floorPlane(400, 5.5, M.snowRoad, 0, 0.004, 3.2, winter);
// tyre tracks
for (const z of [2.3, 3.0, 3.6, 4.3]) floorPlane(400, 0.24, mat(0x8e959b, { roughness: 0.6 }), 0, 0.006, z, winter);
// post-and-rail fence along the road (z = 0); the leash gets tied to the post at x = 0
const POST = V(WX, 0, 0);
{
  const postGeo = new THREE.BoxGeometry(0.11, 1.25, 0.11);
  const fenceWood = new THREE.MeshStandardMaterial({ map: T.bark().map, color: 0x6e5a48, roughness: 0.9 });
  for (let x = -60; x <= 60; x += 2.4) {
    const p = mesh(postGeo, fenceWood, x, 0.62, 0, winter);
    p.rotation.y = rr(-0.1, 0.1);
    p.rotation.z = rr(-0.04, 0.04);
    box(0.13, 0.05, 0.13, M.snow, x, 1.27, 0, winter); // snow cap
    mesh(new THREE.SphereGeometry(0.25, 10, 6), M.snow, x + rr(-0.3, 0.3), 0, rr(-0.3, 0.3), winter).scale.set(1.3, 0.35, 1);
  }
  for (const y of [0.45, 0.95]) {
    box(120, 0.07, 0.04, fenceWood, 0, y, -0.07, winter);
    box(120, 0.025, 0.05, M.snow, 0, y + 0.045, -0.07, winter);
  }
}
// bare winter trees in the fog
const winterForest = createForest(winter);
for (let i = 0; i < 26; i++) winterForest.tree(rr(-40, 40), rr(-30, -7), { height: rr(2.6, 3.8), scale: rr(1.2, 1.9) });
for (let i = 0; i < 10; i++) winterForest.tree(rr(-40, 40), rr(14, 30), { height: rr(2.6, 3.8), scale: rr(1.2, 1.9) });
const wf = winterForest.build();
wf.leaves.visible = false;
// the family car, parked a little way down the road
const famCar = car("hatchback", { color: 0x2e3238, lightsOn: true });
winter.add(famCar);
const tail = [];
for (const s of [-1, 1]) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff2a20, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.setScalar(0.9);
  famCar.add(sp);
  sp.position.set(-2.0, 0.85, s * 0.6);
  tail.push(sp);
}
const tailLight = new THREE.PointLight(0xff2a1a, 0, 8, 2);
famCar.add(tailLight);
tailLight.position.set(-2.4, 0.8, 0);
const winterKey = new THREE.DirectionalLight(0xdfe8f2, 1.4);
winterKey.position.set(WX - 6, 10, 8);
winterKey.target.position.set(WX, 0, 0);
winterKey.castShadow = true;
winterKey.shadow.mapSize.set(2048, 2048);
Object.assign(winterKey.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
winterKey.shadow.bias = -0.0004;
winterKey.shadow.radius = 6;
scene.add(winterKey, winterKey.target);

// falling snow (positions are a pure function of t, wrapped around the camera)
const N_SNOW = 7000;
const snowGeo = new THREE.BufferGeometry();
const snowPos = new Float32Array(N_SNOW * 3);
snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
const snowFlakes = new THREE.Points(snowGeo, new THREE.PointsMaterial({
  map: glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"), size: 0.045, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.95,
}));
snowFlakes.frustumCulled = false;
scene.add(snowFlakes);
const snowSeed = Array.from({ length: N_SNOW }, () => [rand(), rand(), rand(), rand()]);
function snow(t, { heavy = 1, wind = 0.8, box: B = 9, size = 0.045 } = {}) {
  snowFlakes.visible = true;
  snowFlakes.material.size = size;
  const c = camera.position;
  const n = Math.round(N_SNOW * heavy);
  const wrapc = (v, center) => center + ((((v - center + B) % (2 * B)) + 2 * B) % (2 * B)) - B;
  for (let i = 0; i < N_SNOW; i++) {
    const [a, b, d, e] = snowSeed[i];
    if (i >= n) {
      snowPos[i * 3 + 1] = -999;
      continue;
    }
    const fall = 0.6 + e * 0.6;
    const y = 12 - ((b * 12 + t * fall) % 12);
    const x = a * 2 * B + t * wind * (0.7 + e * 0.6) + Math.sin(t * (1 + e) + i) * 0.15;
    const z = d * 2 * B + Math.cos(t * (0.8 + a) + i) * 0.15;
    snowPos[i * 3] = wrapc(x, c.x);
    snowPos[i * 3 + 1] = y + Math.max(0, c.y - 4);
    snowPos[i * 3 + 2] = wrapc(z, c.z);
  }
  snowGeo.attributes.position.needsUpdate = true;
}

// ================= THE VOID (what he believes about people), y = 600 =================
const VY = 600;
const voidSet = group(0, VY, 0, scene);
mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.35, metalness: 0.2 }), 0, 0, 0, voidSet);
const voidSpot = new THREE.SpotLight(0xdfe6ff, 60, 14, 0.32, 0.55, 1.2);
voidSpot.position.set(0, VY + 7, 0.3);
voidSpot.target.position.set(0, VY, 0);
voidSpot.castShadow = true;
voidSpot.shadow.mapSize.set(1024, 1024);
scene.add(voidSpot, voidSpot.target);
// visible beam of light
const beam = mesh(new THREE.ConeGeometry(2.3, 7, 48, 1, true), new THREE.MeshBasicMaterial({
  map: canvasTex(64, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0.0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0.0)");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
  }),
  color: 0xc8d4ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
}), 0, 3.5, 0.15, voidSet);
const rim = new THREE.DirectionalLight(0x8fa8ff, 2.2);
rim.position.set(0, VY + 3, -8);
rim.target.position.set(0, VY, 0);
scene.add(rim, rim.target);

// ================= cast =================
const MUTT = { body: 0x8a5634, light: 0xeadcc6, dark: 0x3b2417 };
const dog = createDog({ colors: MUTT, key: "mutt" });
dog.scale.setScalar(0.82); // a medium-sized mutt next to the people
scene.add(dog);
const leash = createLeash();
scene.add(leash);
// the dog's few belongings, "packed" by the door: his folded blanket and his toy
const blanket = group(0, 0, 0, house);
{
  const b = box(0.95, 0.05, 0.75, M.blanket, 0, 0.025, 0, blanket);
  b.castShadow = b.receiveShadow = true;
  const fold = box(0.95, 0.04, 0.22, M.blanket, 0, 0.065, 0.24, blanket);
  fold.rotation.x = 0.1;
}
const plush = plushToy({ body: 0x7f9a6a, belly: 0xefe6d2 });
house.add(plush);
const tear = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xdfeaff, emissive: 0x3a4a60, roughness: 0, metalness: 0.1, transparent: true, opacity: 0.85, clearcoat: 1 }));
tear.scale.set(1, 1.35, 0.6);
dog.eyes[0].add(tear);

const owner = loadAvatar(short, "Male_Adult_08");
owner.loadClip("m_walk_neutral_01");
owner.loadClip("m_cell_phone_textmessage");
scene.add(owner);
const formerOwner = loadAvatar(short, "Female_Adult_01");
formerOwner.loadClip("m_walk_neutral_01");
scene.add(formerOwner);
const stranger = loadAvatar(short, "Delivery_Male_01");
stranger.loadClip("m_walk_neutral_01");
scene.add(stranger);
const PEOPLE = [owner, formerOwner, stranger];
// the shelter's message about him, on my phone
function chatScreen(n) {
  return canvasTex(540, 1100, (x, w, h) => {
    x.fillStyle = "#0e1116";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#1b2028";
    x.fillRect(0, 0, w, 170);
    x.fillStyle = "#3f7d5e";
    x.beginPath();
    x.arc(70, 100, 42, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#fff";
    x.font = "bold 40px sans-serif";
    x.fillText("City Animal Shelter", 130, 95);
    x.fillStyle = "#8a93a0";
    x.font = "30px sans-serif";
    x.fillText("online", 130, 138);
    const msgs = [
      ["You asked why he sleeps", "by the door..."],
      ["He was found tied to a", "fence, in the middle of", "winter."],
      ["His family never came", "back for him."],
    ];
    let y = 230;
    msgs.slice(0, n).forEach((lines) => {
      const bh = 30 + lines.length * 48;
      x.fillStyle = "#262c35";
      x.beginPath();
      x.roundRect(30, y, 440, bh, 26);
      x.fill();
      x.fillStyle = "#eef1f5";
      x.font = "36px sans-serif";
      lines.forEach((l, i) => x.fillText(l, 58, y + 58 + i * 48));
      y += bh + 26;
    });
  });
}
const SCREENS = [chatScreen(2), chatScreen(3)];
const screenMat = new THREE.MeshBasicMaterial({ map: SCREENS[0], toneMapped: false });
function makePhone() {
  const g = group(0, 0, 0);
  box(0.075, 0.155, 0.009, mat(0x16181c, { roughness: 0.25, metalness: 0.6 }), 0, 0, 0, g);
  mesh(new THREE.PlaneGeometry(0.068, 0.142), screenMat, 0, 0, 0.0047, g);
  return g;
}
const phone = makePhone();
owner.attach("handR", phone, PHONE_AT);
// the phone up close for the insert shot
const heroPhone = makePhone();
house.add(heroPhone);
// silhouettes for the void: swap every material for black (with the same cut-outs)
const silhouetteCache = new Map();
function silhouette(av, on) {
  av.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData.orig) o.userData.orig = o.material;
    if (!on) {
      o.material = o.userData.orig;
      return;
    }
    const orig = Array.isArray(o.userData.orig) ? o.userData.orig : [o.userData.orig];
    const sil = orig.map((m) => {
      if (!silhouetteCache.has(m)) {
        silhouetteCache.set(m, new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.55, map: m.map, alphaTest: m.alphaTest, side: m.side }));
      }
      return silhouetteCache.get(m);
    });
    o.material = Array.isArray(o.userData.orig) ? sil : sil[0];
  });
}

// ---------- shadows ----------
scene.traverse((o) => {
  if (!o.isMesh) return;
  const basic = o.material?.isMeshBasicMaterial;
  o.castShadow = !basic;
  o.receiveShadow = !basic;
});
for (const m of [M.glass]) m.needsUpdate = true;
house.traverse((o) => {
  if (o.isMesh && o.material === M.glass) o.castShadow = false;
});
beam.castShadow = false;
tear.castShadow = false;

// ---------- overlays ----------
const captions = wordCaptions(document.getElementById("caption"), words, { lines: LINES });
const flashEl = document.getElementById("flash");
const fadeEl = document.getElementById("fade");
const grainEl = document.getElementById("grain");
const vignetteEl = document.getElementById("vignette");
grainEl.style.backgroundImage = `url(${(() => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const img = x.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(rand() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
})()})`;
function flash(t, start, dur, color = "#fff", peak = 1) {
  const p = (t - start) / dur;
  if (p < 0 || p > 1) return;
  flashEl.style.background = color;
  flashEl.style.opacity = String(peak * (1 - p) ** 2);
}
function fade(o) {
  fadeEl.style.opacity = String(clamp01(o));
}

function look(px, py, pz, tx, ty, tz, fov = 50, roll = 0) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(tx, ty, tz);
}
const face = (d = dog, lx = 0, ly = 0.13, lz = 0.2) => {
  d.updateMatrixWorld(true);
  return d.head.localToWorld(V(lx, ly, lz));
};
function orbit(target, yaw, dist, height, fov, lookY = 0, roll = 0) {
  look(target.x + Math.sin(yaw) * dist, target.y + height, target.z + Math.cos(yaw) * dist, target.x, target.y + lookY, target.z, fov, roll);
}
const handshake = (t, amt) => [Math.sin(t * 1.3) * amt + Math.sin(t * 2.9) * amt * 0.5, Math.cos(t * 1.1) * amt * 0.8];
const hand = (av, side = "R") => {
  av.update(); // apply this frame's pose first
  av.updateMatrixWorld(true);
  return av.bones?.[`Bip01_${side}_Hand`]?.getWorldPosition(V()) ?? av.position.clone().add(V(0, 0.9, 0));
};
const collar = () => {
  dog.updateMatrixWorld(true);
  return dog.neck.localToWorld(V(0, -0.12, 0.08));
};
const mouthPt = (lx = 0) => {
  dog.updateMatrixWorld(true);
  return dog.mouth.localToWorld(V(lx, 0.01, -0.07));
};
const dogLocal = (x, y, z) => {
  dog.updateMatrixWorld(true);
  return dog.localToWorld(V(x, y, z));
};

// ---------- environments ----------
let mode = "night";
const GRADE = {
  night: "saturate(0.85) contrast(1.06) brightness(1.0)",
  warm: "saturate(1.0) contrast(1.04) brightness(1.03)",
  dusk: "saturate(0.95) contrast(1.05) sepia(0.12)",
  flashback: "saturate(0.22) contrast(1.12) brightness(1.02) sepia(0.12) hue-rotate(185deg) saturate(0.6) hue-rotate(-185deg)",
  void: "saturate(0.6) contrast(1.15)",
};
const LIGHTS = [hemi, moonLight, roomLight, bedLight, porchLight, shelterSun, winterKey, voidSpot, rim, fill, moonFill];
function setEnv(kind, { exposure = 1.0, warmth = 0, grain = 0.05, vignette = 0.6 } = {}) {
  mode = kind;
  for (const l of LIGHTS) l.visible = false;
  renderer.toneMappingExposure = exposure;
  scene.fog = null;
  skyBall.visible = moon.visible = kind === "night" || kind === "outside";
  snowFlakes.visible = false;
  hemi.visible = true;
  if (kind === "night" || kind === "outside") {
    scene.background = new THREE.Color(0x03050b);
    hemi.color.set(0x5a6c96);
    hemi.groundColor.set(0x14110e);
    hemi.intensity = 0.1 + warmth * 0.08;
    moonLight.visible = true;
    roomLight.visible = true;
    bedLight.visible = true;
    roomLight.intensity = 2 + warmth * 6;
    bedLight.intensity = 2.5 + warmth * 1.5;
    porchLight.visible = kind === "outside";
    fill.visible = moonFill.visible = true;
  } else if (kind === "dusk") {
    scene.background = new THREE.Color(0x6a5048);
    hemi.color.set(0xffd0a8);
    hemi.groundColor.set(0x3a3028);
    hemi.intensity = 1.1;
    shelterSun.visible = true;
    fill.visible = true;
  } else if (kind === "flashback") {
    scene.background = new THREE.Color(0xb7c1ca);
    scene.fog = new THREE.FogExp2(0xb7c1ca, 0.055);
    hemi.color.set(0xe6eef6);
    hemi.groundColor.set(0x9aa4ae);
    hemi.intensity = 1.6;
    winterKey.visible = true;
  } else if (kind === "void") {
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 6, 16);
    hemi.color.set(0x222533);
    hemi.groundColor.set(0x000000);
    hemi.intensity = 0.25;
    voidSpot.visible = rim.visible = true;
  }
  fill.intensity = 0;
  moonFill.intensity = 0;
  scene.environmentIntensity = { night: 0.1, outside: 0.1, dusk: 0.5, flashback: 0.55, void: 0.05 }[kind];
  // the moon: behind the house when we look at it from outside, in front of it (shining in) otherwise
  if (kind === "outside") moon.position.set(-60, 140, -260);
  else moon.position.copy(MOON_DIR).multiplyScalar(300);
  moon.lookAt(camera.position);
  renderer.domElement.style.filter = GRADE[kind === "outside" ? "night" : warmth > 0.5 ? "warm" : kind];
  grainEl.style.opacity = String(grain);
  vignetteEl.style.opacity = String(vignette);
}
function grainAt(t) {
  // jump the grain every frame (deterministic from t)
  const f = Math.floor(t * FPS);
  grainEl.style.backgroundPosition = `${(f * 97) % 256}px ${(f * 61) % 256}px`;
}

// ---------- poses ----------
const walk = (p, phase) => p.play("m_walk_neutral_01", phase);
// stand / crouch (c 0..1) with arms that can reach forward (r 0..1)
function stand(av, { x, z, ry, crouch = 0, reach = 0, head = 0.15, headYaw = 0 }) {
  av.resetPose();
  av.position.set(x, 0, z);
  av.rotation.set(0, ry, 0);
  av.spine.rotation.x = 0.45 * reach + 0.3 * crouch;
  av.pelvis.rotation.x = 0.2 * reach + 0.45 * crouch;
  av.pelvis.position.y = 0.93 - 0.42 * crouch;
  av.legL.rotation.x = av.legR.rotation.x = -0.25 * reach - 1.35 * crouch;
  av.kneeL.rotation.x = av.kneeR.rotation.x = 2.2 * crouch;
  av.ankleL.rotation.x = av.ankleR.rotation.x = -0.75 * crouch;
  av.head.rotation.set(head + 0.2 * reach, headYaw, 0);
  av.armR.rotation.set(-0.15 - 0.9 * reach, 0, 0.05);
  av.elbowR.rotation.set(-0.2 - 0.3 * reach, 0.2, 0);
  av.armL.rotation.set(-0.15 - 0.9 * reach, 0, -0.05);
  av.elbowL.rotation.set(-0.2 - 0.3 * reach, -0.2, 0);
}
// sitting down on the floor: s = 0 standing → 0.5 squatting → 1 sitting, knees up
const L1 = 0.45, L2 = 0.43, FOOT = 0.08;
function floorSit(av, s, { x, z, ry }) {
  av.resetPose();
  const a1 = s < 0.5 ? lerp(0, 1.95, ease.inOut(s / 0.5)) : lerp(1.95, 2.25, ease.inOut((s - 0.5) / 0.5));
  const k1 = s < 0.5 ? lerp(0, 2.45, ease.inOut(s / 0.5)) : lerp(2.45, 1.85, ease.inOut((s - 0.5) / 0.5));
  const hip = L1 * Math.cos(a1) + L2 * Math.cos(k1 - a1) + FOOT;
  // keep the feet planted while squatting: move the hips back by how far the feet would move
  const sq = Math.min(s, 0.5);
  const aq = lerp(0, 1.95, ease.inOut(sq / 0.5)), kq = lerp(0, 2.45, ease.inOut(sq / 0.5));
  const back = L1 * Math.sin(aq) + L2 * Math.sin(aq - kq);
  av.position.set(x - Math.sin(ry) * back, 0, z - Math.cos(ry) * back);
  av.rotation.set(0, ry, 0);
  av.pelvis.position.y = Math.max(0.16, hip);
  av.legL.rotation.set(-a1, 0, 0.12 * s);
  av.legR.rotation.set(-a1, 0, -0.12 * s);
  av.kneeL.rotation.x = av.kneeR.rotation.x = k1;
  av.ankleL.rotation.x = av.ankleR.rotation.x = -(a1 - k1) * 0.9;
  const lean = s < 0.5 ? s * 1.1 : lerp(0.55, 0.2, (s - 0.5) / 0.5);
  av.spine.rotation.x = lean;
  av.head.rotation.x = 0.25;
  // forearms resting on the knees
  av.armL.rotation.set(-0.5 * s, 0, -0.05);
  av.armR.rotation.set(-0.5 * s, 0, 0.05);
  av.elbowL.rotation.set(-0.3 - 0.9 * s, -0.2, 0);
  av.elbowR.rotation.set(-0.3 - 0.9 * s, 0.2, 0);
}
// the dog lies on his blanket by the door, facing into the hall
const DOG = { x: 0.15, z: -0.6, ry: Math.PI + 0.32 };
const OWNER_FLOOR = { x: -0.62, z: -0.95, ry: Math.PI - 0.3 }; // sitting on the floor beside his head
function dogByDoor(o = {}) {
  dog.pose({ x: DOG.x, z: DOG.z, ry: DOG.ry, lie: 1, headPitch: 0.3, ...o });
}
function homeProps() {
  blanket.position.set(DOG.x + 0.08, 0, DOG.z + 0.12);
  blanket.rotation.y = DOG.ry;
  plush.position.set(DOG.x + 0.55, 0.06, DOG.z - 0.05);
  plush.rotation.set(0, 2.2, 0);
}
// leash in the mouth: from the collar down to the floor, round in a loose curl, up into the mouth
function leashInMouth({ release = 0, toHand = null } = {}) {
  const c = collar();
  const m = mouthPt(-0.05);
  const pts = [c, dogLocal(0.1, 0.0, 0.62), dogLocal(-0.3, 0.0, 0.85), dogLocal(-0.32, 0.0, 1.1), dogLocal(-0.15, 0.06, 1.12)];
  const a = mouthPt(-0.1), b = mouthPt(0.1);
  if (toHand && release > 0) {
    // pulled out of the mouth toward the hand
    const end = b.clone().lerp(toHand, release);
    pts.push(a.clone().lerp(toHand, release * 0.7), end, end.clone().add(V(0, -0.05, 0)));
  } else {
    pts.push(a, b, b.clone().add(V(0, -0.06, 0)));
  }
  leash.set(pts, { floor: dog.position.y, loopTwist: 0.3 });
}
function leashHeld(av, side = "L", slack = 0.35) {
  const c = collar(), h = hand(av, side);
  leash.set([...sag(c, h, slack, 12)], { floor: 0, loopTwist: 0.5 });
}

// ---------- reset ----------
function hideCast() {
  dog.pose({ z: -80 });
  for (const p of PEOPLE) {
    p.resetPose();
    p.position.set(0, -80, 0);
    silhouette(p, false);
  }
}
function resetWorld(t) {
  hideCast();
  homeProps();
  phone.visible = false;
  heroPhone.visible = false;
  tear.visible = false;
  leash.visible = true;
  for (const w of Object.values(W)) w.visible = true;
  famCar.visible = true;
  for (const s of tail) s.visible = true;
  flashEl.style.opacity = "0";
  fade(0);
  camera.up.set(0, 1, 0);
  grainAt(t);
}

// ---------- shots ----------
// Reach: nudge a few joints until the hand touches `target` (coordinate descent, deterministic).
// joints: [[handle, axis, min, max], ...]; starts from whatever pose the person is in.
const _hp = new THREE.Vector3();
function reachTo(av, side, target, joints, iters = 30) {
  const boneName = `Bip01_${side}_Hand`;
  const dist = () => {
    av.update();
    av.updateMatrixWorld(true);
    return av.bones?.[boneName]?.getWorldPosition(_hp).distanceTo(target) ?? 0;
  };
  if (!av.bones) return 0;
  let best = dist();
  for (let it = 0; it < iters; it++) {
    const step = 0.3 * (1 - it / iters) + 0.01;
    for (const [h, ax, lo, hi] of joints) {
      const r = av[h].rotation;
      const v0 = r[ax];
      for (const d of [step, -step]) {
        r[ax] = Math.min(hi, Math.max(lo, v0 + d));
        const dd = dist();
        if (dd < best) {
          best = dd;
          break;
        }
        r[ax] = v0;
      }
    }
  }
  dist();
  return best;
}
const ARM_R = [["armR", "x", -2.4, 0.4], ["armR", "y", -1.2, 1.2], ["armR", "z", -1.4, 1.0], ["elbowR", "x", -2.4, 0], ["spine", "x", -0.1, 1.0], ["spine", "y", -0.7, 0.7]];
const ARM_R_ONLY = ARM_R.slice(0, 4);

// owner poses used by several shots
// right hand to the leash in his mouth (reach 0..1), then drawing it back toward me (pull 0..1)
function reachPose(reach, pull) {
  owner.spine.rotation.set(0.3, -0.15, 0);
  owner.head.rotation.set(0.45, -0.25 * reach, 0);
  const rest = owner.position.clone().add(V(0.15, 0.55, -0.35));
  const m = mouthPt(0.1);
  const back = owner.position.clone().add(V(0.1, 0.62, -0.25));
  const target = rest.clone().lerp(m, reach).lerp(back, pull * 0.8);
  reachTo(owner, "R", target, ARM_R);
}
// leaning in close to his ear, my hand resting on his head
function whisperPose(lean, t) {
  owner.spine.rotation.set(0.3 + lean * 0.25, -0.3 * lean, 0);
  owner.head.rotation.set(0.45, -0.35 * lean, -0.12 * lean);
  reachTo(owner, "R", face(dog, 0.03, 0.27 + Math.sin(t * 2.4) * 0.01, -0.05 + Math.sin(t * 2.4) * 0.03), ARM_R_ONLY);
}
// slow strokes down his neck and back
function strokePose(t) {
  owner.spine.rotation.set(0.42, -0.3, 0);
  owner.head.rotation.set(0.5, -0.3, 0);
  const k = 0.5 - 0.5 * Math.cos(t * 1.8);
  reachTo(owner, "R", dogLocal(0.02, 0.62 - k * 0.12, 0.62 - k * 0.3), ARM_R_ONLY);
}
// the leash, set down on the floor beside me
function leashDown() {
  leash.set([collar(), dogLocal(0.15, 0, 0.75), V(-0.15, 0, -0.95), V(-0.3, 0, -0.75), V(-0.25, 0, -0.55)], { floor: 0, loopTwist: 1.4 });
}
// the family car on the road (x along the road, local to the winter set); returns its world position
function carAt(x) {
  famCar.position.set(x, 0, 3.2);
  famCar.rotation.y = 0;
  famCar.spinWheels?.(x);
  tailLight.intensity = x > 6.6 ? 3 : 0;
  return famCar.getWorldPosition(V());
}
// where the people stand in the void: behind him, facing him
const VOID_RING = [[-0.85, -1.3], [0.95, -1.55], [0.05, -2.4]];

const SHOTS = [
  // "Every night, after" — the house at night under the moon, slow push toward the front door
  [0, (lt, t) => {
    setEnv("outside", { exposure: 1.1 });
    dogByDoor({ closed: 0.7, t });
    leashInMouth();
    const p = ease.inOut(prog(t, 0, C.bringing));
    look(lerp(3.2, 2.4, p), lerp(1.1, 1.25, p), lerp(10.5, 8.0, p), -0.4, 2.3, 0, 48);
    fade(1 - prog(t, 0, 0.45));
  }],
  // "bringing him home from the shelter," — leaving the shelter at dusk on a new leash:
  // tail tucked, ears back, looking back at the kennels
  [C.bringing, (lt, t) => {
    setEnv("dusk", { exposure: 1.0, vignette: 0.55 });
    const zO = lerp(1.2, 3.0, prog(t, C.bringing, C.my));
    owner.position.set(SX - 0.3, 0, zO);
    owner.rotation.set(0, 0, 0);
    walk(owner, (t - C.bringing) * 1.0 + 0.2);
    const back = ease.inOut(prog(t, C.shelter - 0.1, C.shelter + 0.3));
    dog.pose({ x: SX + 0.35, z: zO + 0.1, ry: -0.05, trot: 0.8, trotSpeed: 10, t: lt, earBack: 0.7, sad: 1, headYaw: back * 1.1, headPitch: 0.2 });
    dog.tail.rotation.x = 0.35; // tucked
    leashHeld(owner, "L", 0.3);
    const [sx, sy] = handshake(t, 0.03);
    look(SX + 1.6 + sx, 1.1 + sy, zO + 6.0, SX + 0.1, 1.55, zO - 1.0, 44);
    fill.position.set(SX + 1, 1.5, zO + 2);
    fill.intensity = 2;
  }],
  // "my dog slept by the front door," — the long dark hall from the bedroom doorway; him, small, in the moonlight
  [C.my, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    dogByDoor({ closed: 0.75, t, headPitch: 0.35 });
    leashInMouth();
    const p = ease.inOut(prog(t, C.my, C.holding));
    look(0.22, 1.5 - p * 0.15, lerp(-8.4, -7.6, p), 0.05, 0.45, -0.6, 48);
  }],
  // "holding his leash in his mouth." — closer: the leash clenched in his teeth, eyes half open
  [C.holding, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    const open = ease.inOut(prog(t, C.leash, C.mouth));
    dogByDoor({ closed: 0.85 - open * 0.45, sad: 0.8, t, headPitch: 0.32 });
    leashInMouth();
    const f = face();
    orbit(f, DOG.ry + 0.4 + lt * 0.08, 1.45 - lt * 0.15, 0.08, 38, -0.12);
    moonFill.position.copy(f).add(V(-0.4, 0.5, 0.3));
    moonFill.intensity = 0.6;
  }],
  // "I thought he wanted to run" — me in the bedroom doorway at the far end, watching him
  [C.I, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    dogByDoor({ closed: 0.5, t });
    leashInMouth();
    stand(owner, { x: 0.3, z: -7.0, ry: -0.06, head: 0.25, headYaw: -0.05 });
    owner.armL.rotation.set(-0.35, 0, 0.75); // hand on the door frame
    owner.elbowL.rotation.set(-0.7, 0, 0);
    const p = ease.inOut(prog(t, C.I, C.away));
    look(lerp(-0.1, -0.05, p), 1.72, lerp(-9.7, -9.3, p), 0.12, 0.75, -2.0, 40);
  }],
  // "away," — his head comes up; eyes on the door behind him
  [C.away, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    const up = ease.out(prog(t, C.away, C.away + 0.3));
    dogByDoor({ headPitch: lerp(0.3, -0.4, up), headYaw: up * 0.25, earUp: up * 0.6, t, pupil: 1.2 });
    leashInMouth();
    const f = face();
    look(f.x - 0.3, 0.32, f.z - 2.0, f.x + 0.05, 0.78, f.z + 0.5, 44);
    moonFill.position.copy(f).add(V(-0.3, 0.4, -0.5));
    moonFill.intensity = 0.7;
  }],
  // "until the shelter" — a message from the shelter lights up my face in the dark hall
  [C.until, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    dogByDoor({ closed: 0.4, sad: 0.7, t });
    leashInMouth();
    owner.position.set(0.3, 0, -3.1);
    owner.rotation.set(0, 0.2, 0);
    owner.play("m_cell_phone_textmessage", 2.0 + lt);
    phone.visible = true;
    const push = ease.inOut(prog(t, C.until, C.told));
    const fp = owner.position.clone().add(V(0, 1.55, 0));
    look(lerp(-0.2, -0.1, push), 1.45, lerp(-1.6, -2.0, push), fp.x, fp.y - 0.12, fp.z, lerp(40, 34, push));
    fill.position.set(0.25, 1.3, -2.75);
    fill.color.set(0x9fbaff);
    fill.intensity = 1.0;
  }],
  // "told me his story." — over my shoulder: what they wrote, and him by the door beyond
  [C.told, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    dogByDoor({ closed: 0.4, sad: 0.7, t });
    leashInMouth();
    const cam = V(0.32, 1.42, -3.15);
    look(cam.x, cam.y, cam.z, DOG.x - 0.05, 0.5, DOG.z, 40);
    // the phone just below the line of sight, as if held in my hands
    heroPhone.visible = true;
    const fwd = V(DOG.x - 0.05, 0.5, DOG.z).sub(cam).normalize();
    heroPhone.position.copy(cam).addScaledVector(fwd, 0.45).add(V(-0.03, 0.035 + ease.out(prog(t, C.told, C.told + 0.3)) * 0.015, 0));
    heroPhone.lookAt(cam.clone().add(V(0, 0.08, 0)));
    screenMat.map = t >= C.story ? SCREENS[1] : SCREENS[0];
    flashEl.style.background = "#fff";
    flashEl.style.opacity = String(ease.in(prog(t, C.story + 0.15, C.his4)) * 0.9);
  }],
  // "His previous family took him for a walk," — winter, years ago; snow falling
  [C.his4, (lt, t) => {
    setEnv("flashback", { exposure: 1.0, grain: 0.14, vignette: 0.8 });
    const p = prog(t, C.his4, C.tied);
    const x = WX + lerp(-4.5, -1.4, p);
    formerOwner.position.set(x, 0, 0.9);
    formerOwner.rotation.set(0, Math.PI / 2, 0);
    walk(formerOwner, (t - C.his4) * 1.0);
    dog.pose({ x: x + 0.15, z: 0.4, ry: Math.PI / 2 + 0.05, trot: 0.9, trotSpeed: 10, t: lt, wag: 1, wagSpeed: 12, headPitch: -0.25, headYaw: 0.4, earUp: 0.3, cute: 0.4 });
    leashHeld(formerOwner, "R", 0.15);
    carAt(6.5);
    look(x + 1.3, 0.95, 5.2, x + 0.6, 0.85, 0.6, 42);
    snow(t, { heavy: 0.8 });
    flash(t, C.his4, 0.5, "#ffffff", 0.9);
  }],
  // "tied his leash to a fence" — her hands wrap the leash round the post; he wags, trusting
  [C.tied, (lt, t) => {
    setEnv("flashback", { exposure: 1.0, grain: 0.14, vignette: 0.8 });
    stand(formerOwner, { x: POST.x + 0.05, z: POST.z + 0.62, ry: Math.PI, crouch: 0.75, reach: 0.7, head: 0.35 });
    dog.pose({ x: POST.x + 0.75, z: POST.z + 0.45, ry: -Math.PI / 2 - 0.25, sit: 1, t: lt, wag: 1, wagSpeed: 9, headPitch: -0.35, headYaw: 0.2, cute: 0.6, earUp: 0.2 });
    const turns = lerp(0.3, 2.2, ease.inOut(prog(t, C.tied, C.fence + 0.2)));
    const ang = 0.2 + turns * Math.PI * 2;
    reachTo(formerOwner, "R", V(POST.x + Math.cos(ang) * 0.14, 0.64, POST.z + 0.08 + Math.max(0, Math.sin(ang)) * 0.12), ARM_R_ONLY);
    const c = collar();
    leash.set([...sag(c, V(POST.x + 0.06, 0.62, POST.z + 0.02), 0.1, 6), ...wrap(V(POST.x, 0, POST.z), 0.62, turns, 0.065, 0.2)], { floor: 0, loopTwist: 0 });
    carAt(6.5);
    const pull = ease.out(prog(t, C.fence, C.fence + 0.15)) * 0.03;
    look(POST.x - 1.25, 0.95 + pull, POST.z + 1.65, POST.x + 0.2, 0.62, POST.z + 0.25, 40);
    snow(t, { heavy: 0.6, box: 5, size: 0.035 });
  }],
  // "in the middle of winter," — high and wide: a small dog at a fence in a white nowhere
  [C.in2, (lt, t) => {
    setEnv("flashback", { exposure: 1.0, grain: 0.14, vignette: 0.85 });
    const p = prog(t, C.in2, C.and1);
    formerOwner.position.set(lerp(POST.x + 1.5, POST.x + 4.6, p), 0, lerp(1.6, 2.6, p));
    formerOwner.rotation.set(0, Math.PI / 2 - 0.3, 0);
    walk(formerOwner, (t - C.in2) * 1.0);
    dog.pose({ x: POST.x + 0.5, z: POST.z + 0.5, ry: Math.PI / 2 - 0.3, t: lt, headPitch: -0.2, headYaw: 0.2, wag: 0.3, wagSpeed: 6 });
    leash.set([...sag(collar(), V(POST.x + 0.06, 0.62, POST.z + 0.02), 0.15, 6), ...wrap(V(POST.x, 0, POST.z), 0.62, 2.2, 0.065, 0.2)], { floor: 0 });
    carAt(6.5);
    const up = ease.inOut(p);
    look(POST.x - 3.5 - up, 5.5 + up * 2.5, POST.z + 9 + up * 2, POST.x + 1.5, 0, POST.z + 1.2, 50);
    snow(t, { heavy: 1, box: 14, size: 0.08, wind: 1.2 });
  }],
  // "and never" — dog's-eye view: the car pulls away into the snow, the leash goes taut
  [C.and1, (lt, t) => {
    setEnv("flashback", { exposure: 1.0, grain: 0.14, vignette: 0.85 });
    const go = prog(t, C.never - 0.15, C.came + 0.25);
    const carX = carAt(6.5 + ease.in(go) * 24);
    tailLight.intensity = 3;
    const tug = ease.out(prog(t, C.never, C.never + 0.3));
    const D = V(POST.x + 0.75 + tug * 0.12, 0, POST.z + 0.8);
    const toCar = carX.clone().sub(D).setY(0).normalize();
    dog.pose({ x: D.x, z: D.z, ry: Math.atan2(toCar.x, toCar.z), t: lt, headPitch: -0.1, earUp: 0.4 + tug * 0.4, rear: tug * 0.1 });
    leash.set([...sag(collar(), V(POST.x + 0.06, 0.62, POST.z + 0.02), 0.02, 6), ...wrap(V(POST.x, 0, POST.z), 0.62, 2.2, 0.065, 0.2)], { floor: 0 });
    const f = face();
    const side = V(toCar.z, 0, -toCar.x); // to his right
    const cam = f.clone().addScaledVector(toCar, -1.4).addScaledVector(side, -0.3);
    look(cam.x, 0.9, cam.z, f.x + toCar.x * 5, 0.55, f.z + toCar.z * 5, 44);
    snow(t, { heavy: 0.9, box: 9 });
  }],
  // "came back." — close on him: snow on his fur, staring down the empty road
  [C.came, (lt, t) => {
    setEnv("flashback", { exposure: 1.0, grain: 0.14, vignette: 0.9 });
    famCar.visible = false;
    dog.pose({ x: POST.x + 0.75, z: POST.z + 0.8, ry: Math.PI / 2 - 0.25, sit: ease.inOut(prog(t, C.came, C.back + 0.2)), t, headPitch: -0.1, sad: 1, earBack: 0.3, shiver: 0.35, closed: 0.15 });
    leash.set([...sag(collar(), V(POST.x + 0.06, 0.62, POST.z + 0.02), 0.2, 6), ...wrap(V(POST.x, 0, POST.z), 0.62, 2.2, 0.065, 0.2)], { floor: 0 });
    const f = face();
    orbit(f, Math.PI / 2 - 0.25 + 0.6, 1.45 - lt * 0.15, 0.05, 36, -0.06);
    snow(t, { heavy: 0.7, box: 3, size: 0.025 });
  }],
  // "He wasn't holding that leash because he wanted to leave." — back home: the same face, by the door
  [C.wasnt, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    const toDoor = ease.inOut(prog(t, C.leave - 0.3, C.leave + 0.4));
    dogByDoor({ closed: 0.35, sad: 1, t, headPitch: 0.3 });
    leashInMouth();
    const f = face();
    orbit(f, DOG.ry + 0.25 - toDoor * 0.2, lerp(1.45, 2.3, toDoor), lerp(0.05, 0.45, toDoor), lerp(36, 44, toDoor), lerp(-0.06, 0.45, toDoor));
    moonFill.position.copy(f).add(V(-0.3, 0.5, 0.4));
    moonFill.intensity = 0.6;
    flash(t, C.wasnt, 0.35, "#ffffff", 0.6);
  }],
  // "He was holding it" — close on the mouth: teeth tighten on the strap
  [C.hewas, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    const grip = ease.out(prog(t, C.holding3, C.holding3 + 0.3));
    dogByDoor({ closed: 0.3, sad: 1, squint: grip * 0.25, t, headPitch: 0.3 });
    leashInMouth();
    const m = mouthPt();
    orbit(m, DOG.ry - 0.35, 1.1 - grip * 0.1, 0.08, 30, 0.02);
    moonFill.position.copy(m).add(V(0.1, 0.4, -0.3));
    moonFill.intensity = 0.6;
  }],
  // "because he thought every human" — in his head: a small dog in a spotlight, people standing behind him
  [C.because2, (lt, t) => {
    setEnv("void", { exposure: 1.1, vignette: 0.85 });
    dog.pose({ x: 0, y: VY, z: 0, ry: 0, sit: 1, t: lt, sad: 0.8, headPitch: -0.1, headYaw: Math.sin(lt * 1.4) * 0.3 });
    leashInMouth();
    VOID_RING.forEach(([x, z], i) => {
      const p = PEOPLE[i];
      p.resetPose();
      p.position.set(x, VY, z);
      p.rotation.set(0, Math.atan2(-x, -z), 0);
      p.head.rotation.x = 0.4;
      silhouette(p, true);
    });
    const p = ease.inOut(prog(t, C.because2, C.eventually));
    look(lerp(0.35, 0.5, p), VY + lerp(1.0, 1.25, p), lerp(3.4, 4.0, p), 0, VY + 0.95, -0.9, 46);
  }],
  // "eventually gets tired of him," — one by one they turn their backs and walk into the dark
  [C.eventually, (lt, t) => {
    setEnv("void", { exposure: 1.1, vignette: 0.9 });
    const turnAt = [C.eventually + 0.05, C.eventually + 0.4, C.tired - 0.05];
    let watch = 0;
    VOID_RING.forEach(([x0, z0], i) => {
      const p = PEOPLE[i];
      const away = Math.atan2(x0 * 0.6, z0);
      const k = prog(t, turnAt[i], turnAt[i] + 0.35);
      const d = Math.max(0, t - turnAt[i] - 0.25) * 1.25;
      p.position.set(x0 + Math.sin(away) * d, VY, z0 + Math.cos(away) * d);
      p.rotation.set(0, lerp(Math.atan2(-x0, -z0), away, ease.inOut(k)), 0);
      if (k > 0.3) walk(p, (t - turnAt[i]) * 1.0);
      else {
        p.resetPose();
        p.head.rotation.x = 0.4;
      }
      silhouette(p, true);
      if (k > 0 && k < 1.5) watch = x0;
    });
    const slump = ease.inOut(prog(t, C.tired + 0.1, C.and2));
    dog.pose({ x: 0, y: VY, z: 0, ry: 0, sit: 1, t: lt, sad: 1, headPitch: -0.1 + slump * 0.5, headYaw: -watch * 0.5 * (1 - slump), earBack: 0.3 + slump * 0.5 });
    leashInMouth();
    voidSpot.angle = lerp(0.32, 0.18, slump);
    beam.scale.set(lerp(1, 0.6, slump), 1, lerp(1, 0.6, slump));
    const p = ease.inOut(prog(t, C.eventually, C.and2));
    look(lerp(0.5, 0.3, p), VY + lerp(1.25, 4.5, p), lerp(4.0, 4.6, p), 0, VY + lerp(0.95, 0.2, p), lerp(-0.9, -0.6, p), 46);
  }],
  // "and he wanted to be ready" — awake, head up, the leash ready in his mouth
  [C.and2, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    voidSpot.angle = 0.32;
    beam.scale.set(1, 1, 1);
    const up = ease.out(prog(t, C.and2, C.ready));
    dogByDoor({ headPitch: lerp(0.3, -0.3, up), headYaw: up * 0.2, earUp: up * 0.5, t, sad: 0.6 });
    leashInMouth();
    const f = face();
    orbit(f, DOG.ry - 0.1, 2.1 - lt * 0.2, 0.0, 40, 0.18);
    moonFill.position.copy(f).add(V(-0.3, 0.4, -0.5));
    moonFill.intensity = 0.7;
  }],
  // "so he wouldn't be a burden." — high above: how small he is next to that door
  [C.so, (lt, t) => {
    setEnv("night", { exposure: 1.0 });
    const down = ease.inOut(prog(t, C.burden - 0.3, C.burden + 0.4));
    dogByDoor({ headPitch: lerp(-0.2, 0.45, down), closed: down * 0.4, sad: 1, earBack: 0.3 * down, t });
    leashInMouth();
    const p = ease.inOut(prog(t, C.so, C.tonight));
    look(-0.15, lerp(2.4, 2.5, p), lerp(-2.6, -3.0, p), DOG.x, 0.1, DOG.z - 0.1, 54);
    W.ceiling.visible = false;
  }],
  // "Tonight, I sat on the floor beside him," — I walk up and sit down next to him
  [C.tonight, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 0.5 });
    const arrive = prog(t, C.tonight, C.sat);
    const s = ease.inOut(prog(t, C.sat - 0.05, C.beside + 0.25));
    const o = OWNER_FLOOR;
    if (arrive < 1) {
      owner.resetPose();
      owner.position.set(lerp(-0.25, o.x, arrive), 0, lerp(-2.0, o.z - 0.25, arrive));
      owner.rotation.set(0, 0.15, 0);
      walk(owner, (t - C.tonight) * 1.0);
    } else {
      floorSit(owner, s, { x: o.x, z: o.z - 0.25 * (1 - s), ry: lerp(0.15, o.ry, ease.inOut(prog(t, C.sat, C.sat + 0.35))) });
    }
    dogByDoor({ closed: 0.2, headPitch: lerp(0.3, 0.1, s), headYaw: s * 0.4, sad: 0.8, earBack: 0.2, t });
    leashInMouth();
    look(0.95, 1.05, -3.7, -0.2, 0.6, -0.55, 44);
  }],
  // "took the leash from his mouth," — my hand, gently, takes it; his jaw lets go
  [C.took2, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 0.6 });
    const reach = ease.inOut(prog(t, C.took2, C.leash4 + 0.15));
    const pull = ease.inOut(prog(t, C.from, C.mouth2 + 0.3));
    dogByDoor({ closed: 0.1, headPitch: 0.15, headYaw: 0.3, jawOpen: pull * 0.3, sad: 0.6, t });
    floorSit(owner, 1, OWNER_FLOOR);
    reachPose(reach, pull);
    leashInMouth({ release: pull, toHand: hand(owner, "R") });
    const m = mouthPt();
    orbit(m, DOG.ry - 0.55, 1.3, 0.3, 38, 0.05);
    fill.position.copy(m).add(V(0.4, 0.5, -0.5));
    fill.color.set(0xffc898);
    fill.intensity = 0.8;
  }],
  // "and whispered, 'You don't have to pack anymore." — I lean down to him, my hand on his head
  [C.and3, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 0.8 });
    const lean = ease.inOut(prog(t, C.and3, C.whispered + 0.3));
    const up = ease.inOut(prog(t, C.pack - 0.2, C.anymore + 0.2));
    dogByDoor({ closed: 0.05, headPitch: lerp(0.15, -0.1, up), headYaw: 0.3 + up * 0.25, earBack: 0.1, sad: 0.5, cute: up * 0.5, t });
    floorSit(owner, 1, OWNER_FLOOR);
    whisperPose(lean, t);
    leashDown();
    const f = face();
    const mid = f.clone().lerp(owner.position.clone().add(V(0, 0.95, 0)), 0.45);
    look(0.4 - lt * 0.05, 0.95, -3.35 + lt * 0.1, mid.x + 0.05, mid.y - 0.1, mid.z, 36);
    fill.position.copy(mid).add(V(0.6, 0.6, -0.8));
    fill.color.set(0xffc898);
    fill.intensity = 1.2;
  }],
  // "You're home." — his eyes fill; a tear rolls, and his tail starts to move
  [C.youre, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 0.9 });
    dogByDoor({ headPitch: -0.15, headYaw: 0.35, cute: 1, sad: 0.6, t, wag: 0.4, wagSpeed: 5, closed: 0.08 });
    floorSit(owner, 1, OWNER_FLOOR);
    whisperPose(1, t);
    leashDown();
    tear.visible = true;
    const run = ease.in(prog(t, C.youre + 0.1, C.and4 + 0.15));
    tear.position.set(0.0, -0.05 - run * 0.1, 0.02);
    const f = face();
    orbit(f, DOG.ry + 0.3, 1.5 - lt * 0.12, 0.06, 32, -0.03);
    fill.position.copy(f).add(V(0.3, 0.4, -0.6));
    fill.color.set(0xffc898);
    fill.intensity = 1.0;
  }],
  // "And for the first time," — he lays his head down against my leg; my hand on his back
  [C.and4, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 1 });
    const lay = ease.inOut(prog(t, C.and4, C.time + 0.2));
    dogByDoor({ headPitch: lerp(0.0, 0.45, lay), headYaw: lerp(0.45, 0.4, lay), tilt: lay * 0.1, sad: 0.3, cute: 0.6, t, wag: 0.5, wagSpeed: 4, closed: 0.15 + lay * 0.25 });
    floorSit(owner, 1, OWNER_FLOOR);
    strokePose(t);
    leashDown();
    const f = face();
    orbit(f, DOG.ry + 0.2, lerp(1.8, 1.5, lay), 0.25, 38, -0.08);
    fill.position.copy(f).lerp(camera.position, 0.5).add(V(0, 0.35, 0));
    fill.color.set(0xffc898);
    fill.intensity = 1.6;
  }],
  // "he finally closed his eyes." — his eyes close; we drift back up the hall and fade out
  [C.finally, (lt, t) => {
    setEnv("night", { exposure: 1.0, warmth: 1 });
    const close = ease.inOut(prog(t, C.closed - 0.05, C.eyes + 0.35));
    const breathe = Math.sin(t * 2.0) * 0.02;
    dogByDoor({ headPitch: 0.45 + breathe, headYaw: 0.4, tilt: 0.1, sad: 0.3 * (1 - close), cute: 0.6 * (1 - close), t, closed: 0.4 + close * 0.6 });
    floorSit(owner, 1, OWNER_FLOOR);
    strokePose(t * 0.7);
    leashDown();
    const f = face();
    const back = ease.inOut(prog(t, C.eyes + 0.2, DURATION));
    const target = f.clone().lerp(V(-0.2, 0.5, -0.6), back);
    orbit(target, DOG.ry + 0.2 - back * 0.45, lerp(1.35, 4.2, back), lerp(0.12, 1.5, back), lerp(34, 46, back), lerp(-0.05, -0.25, back));
    fill.position.copy(f).lerp(camera.position, 0.5).add(V(0, 0.35, 0));
    fill.color.set(0xffc898);
    fill.intensity = 1.6 * (1 - back * 0.6);
    fade(prog(t, DURATION - 1.1, DURATION - 0.1));
  }],
];

// ---------- sound: footsteps, dog, ambience ----------
const sfx = createSfx(short);
const WALKC = 1.2, HEELS = [0.33 / 1.2, 0.93 / 1.2];
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
const footsteps = (t0, t1, clipTime, names, gain = 1) => sfx.steps(events(t0, t1, (t) => clipTime(t) / WALKC, HEELS), names, { gain });
const STEPS = ["step_1", "step_2", "step_3", "step_4"];
const SNOW = ["snow_step_1", "snow_step_2", "snow_step_3"];
// night: quiet room tone and the hall clock
sfx.loop(0, C.his4, "room_tone", { gain: 0.45, fadeIn: 0.4 });
sfx.loop(0, C.bringing, "forest_dusk", { gain: 0.35, fadeIn: 0.4, fadeOut: 0.1 });
sfx.loop(C.bringing, C.my, "forest_dusk", { gain: 0.25, fadeIn: 0.05, fadeOut: 0.1 });
sfx.loop(C.my, C.his4 - 0.3, "clock_tick", { gain: 0.35, fadeIn: 0.2 });
footsteps(C.bringing, C.my, (t) => (t - C.bringing) + 0.2, STEPS, 0.55);
sfx.add(C.slept + 0.2, "sigh", { gain: 0.35, rate: 0.9 });
sfx.add(C.away + 0.05, "rustle", { gain: 0.15, rate: 1.6, dur: 0.3 });
// the flashback: winter wind, snow underfoot, the car
sfx.loop(C.his4 - 0.15, C.wasnt + 0.1, "winter_wind", { gain: 0.75, fadeIn: 0.3, fadeOut: 0.3 });
sfx.loop(C.his4, C.never, "engine_idle", { gain: 0.15, fadeIn: 0.3 });
footsteps(C.his4, C.tied, (t) => t - C.his4, SNOW, 0.6);
sfx.add(C.tied + 0.3, "rustle", { gain: 0.25, rate: 1.4, dur: 0.6 });
sfx.add(C.fence + 0.05, "rustle", { gain: 0.3, rate: 1.8, dur: 0.25 });
footsteps(C.in2, C.and1, (t) => t - C.in2, SNOW, 0.35);
sfx.add(C.and1 - 0.05, "car_door", { gain: 0.5 });
sfx.add(C.never - 0.1, "car_away", { gain: 0.55 });
sfx.add(C.never + 0.3, "whimper", { gain: 0.45, rate: 1.05 });
sfx.add(C.came + 0.25, "whine", { gain: 0.5 });
// home again
sfx.loop(C.wasnt, DURATION, "room_tone", { gain: 0.45, fadeIn: 0.3, fadeOut: 1.0 });
sfx.loop(C.wasnt, C.because2, "clock_tick", { gain: 0.35, fadeIn: 0.2 });
sfx.loop(C.because2, C.and2, "ambi_drone", { gain: 0.3, fadeIn: 0.3, fadeOut: 0.3 });
// the people walking away (hard, echoing steps in the void)
for (const [i, t0] of [[0, C.eventually + 0.05], [1, C.eventually + 0.35], [2, C.tired - 0.1]]) {
  footsteps(t0 + 0.35, C.and2, (t) => t - t0, STEPS, 0.35 - i * 0.05);
}
sfx.loop(C.and2, C.tonight, "clock_tick", { gain: 0.35, fadeIn: 0.1 });
sfx.add(C.burden + 0.2, "sigh", { gain: 0.45 });
footsteps(C.tonight, C.sat, (t) => t - C.tonight, STEPS, 0.45);
sfx.add(C.sat + 0.05, "cloth", { gain: 0.55 });
sfx.add(C.leash4, "rustle", { gain: 0.18, rate: 1.7, dur: 0.35 });
sfx.add(C.pack - 0.1, "rustle", { gain: 0.12, rate: 1.9, dur: 0.25 });
sfx.add(C.youre + 0.35, "whimper", { gain: 0.25, rate: 0.85 });
sfx.steps(events(C.youre + 0.2, C.and4 + 0.6, (t) => (t * 5) / (2 * Math.PI), [0.25]), ["thump"], { gain: 0.12 });
sfx.add(C.time, "flop", { gain: 0.25 });
sfx.add(C.eyes + 0.1, "sigh", { gain: 0.55, rate: 0.9 });

// ---------- frame ----------
const shotStarts = SHOTS.map((s) => s[0]);
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  // the character FBX files carry their own ambient lights, which would flood the night scenes
  for (const p of PEOPLE) p.traverse((o) => o.isLight && (o.visible = false));
  let i = SHOTS.length - 1;
  while (i > 0 && t < shotStarts[i]) i--;
  resetWorld(t);
  SHOTS[i][1](t - SHOTS[i][0], t);
  for (const p of PEOPLE) p.update();
  captions(t);
});

window.__dbg = { scene, camera, renderer, C, SHOTS, owner, dog, leash, formerOwner, stranger, hand, mouthPt, face, phone };
short.start();
