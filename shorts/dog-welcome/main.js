import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { createDog, DOG_COLORS } from "../../js/dog.js";
import { mergeGeometries } from "../../lib/jsm/utils/BufferGeometryUtils.js";
import { loadProp, useEnvironment, bookshelf, floorLamp, wallArt, cushion, coffeeTable, wallClock, shoes, picketFence, mailbox, mirror, handbag, hat } from "../../js/props.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { plushToy, tennisBall, ropeToy } from "../../js/toys.js";
import { loadAvatar } from "../../js/avatar.js";
import { createLeash } from "../dog-leash/leash.js";

// "Why your dog goes crazy when you come home" — one continuous house, one camera, 60 fps.
// The camera never jumps to a new place: you walk in, the dog reacts, the study plays out in the
// same room, and the last shot is the closed front door, so the video loops.
// Every cut and action is keyed to a word of voiceover.srt; shots are pure functions of time.

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
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 1.8) * FPS) / FPS;

const short = createShort({ duration: DURATION, fps: FPS, lights: false, fov: 44 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.02;
camera.far = 1500;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.5);

// ---------- word cues (seconds) ----------
const C = {
  walk: at("walk"), door: at("door"), loses: at("loses"), gone: at("gone"), years: at("years"),
  crazy: at("crazy"), barely: at("barely"), tested: at("tested"), filmed: at("filmed"), alone: at("alone"),
  minutes: at("minutes"), happy: at("happy"), stayed: at("stayed"), hours: at("hours"),
  came: at("came"), came2: at("came", 2), crazy2: at("crazy", 2), jumping: at("jumping"), spinning: at("spinning"),
  wild: at("wild"), miss: at("miss"), minute: at("minute"), gone2: at("gone", 2), walk2: at("walk", 2), door2: at("door", 2),
};
const LINES = [
 "You walk in the door and your dog loses his mind.",
 "Like you've been gone for years.",
 "But have you noticed, some days he goes crazy,",
 "and some days he barely gets up?",
 "So scientists tested it.",
 "They filmed dogs left home alone.",
 "First, the owners came back after thirty minutes.",
 "The dogs were happy, but calm.",
 "Then they stayed away two hours.",
 "And when they came back, the dogs went crazy.",
 "Jumping. Spinning. Tails going wild.",
 "Your dog doesn't just miss you.",
 "He feels every minute you're gone.",
 "So the next time you walk in that door."
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
function plane(w, h, m, x, y, z, ry = 0, parent) {
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), asMat(m));
  me.position.set(x, y, z);
  me.rotation.y = ry;
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
  back: gsap.parseEase("back.out(1.6)"),
};
let seed = 91;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rand() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

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
const GLOW = canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
});

// ---------- materials ----------
const tex = (f, repeat, color = true) => short.loadTexture(`../../assets/textures/${f}`, { repeat, color });
const M = {
  hardwood: new THREE.MeshStandardMaterial({
    map: tex("hardwood2_diffuse.jpg", [1 / 3, 1 / 1.5]),
    bumpMap: tex("hardwood2_bump.jpg", [1 / 3, 1 / 1.5], false),
    bumpScale: 1.5,
    roughness: 0.45,
  }),
  grass: new THREE.MeshStandardMaterial({ map: tex("grass.jpg", [1 / 3, 1 / 3]), roughness: 1, color: 0x9ab07e }),
  wall: T.plaster(0xece3d3, [0.5, 0.5]),
  accent: T.plaster(0xa9c2bd, [0.5, 0.5]),
  pink: T.plaster(0xf2c9cf, [0.5, 0.5]),
  ceiling: T.plaster(0xf7f3ec, [0.5, 0.5]),
  trim: T.paintedWood(0xf6f3ee),
  door: T.paintedWood(0xf1ede6),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.25 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xbfd3e4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false }),
  rug: T.fabric(0xb86a4a, { repeat: [3, 3], weave: 5, key: "rug" }),
  siding: T.siding(0xdfe6ea),
  concrete: T.concrete({ tile: 1, repeat: [1, 1], color: 0xc9c4ba }),
  kennelFloor: T.concrete({ tile: 0.5, repeat: [1, 1], color: 0xb9b6ae }),
  block: T.concrete({ tile: 0.4, repeat: [1, 1], color: 0xe4e1d8 }),
  asphalt: T.asphalt(),
  shingles: T.shingles(),
  wood: T.paintedWood(0x6a4a32),
  steel: new THREE.MeshStandardMaterial({ color: 0xb4bac0, metalness: 0.85, roughness: 0.32 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, metalness: 0.7, roughness: 0.35 }),
  vinyl: T.tiles(0xdde3e6, { cols: 6, rows: 6, grout: 0xc4cbd0, offset: 0, repeat: [1, 1], key: "vinyl" }),
  bandage: T.fabric(0xf6f4ef, { repeat: [4, 2], weave: 6, key: "bandage" }),
  blanket: T.fabric(0x7ea3c4, { repeat: [3, 3], weave: 3, key: "blanket" }),
  collar: new THREE.MeshStandardMaterial({ color: 0xc8261e, roughness: 0.55 }),
  warmWindow: new THREE.MeshBasicMaterial({ color: 0xffd39a }),
};
for (const m of [M.vinyl]) {
  m.map && (m.map.repeat.set(1, 1));
}

// ---------- skies ----------
const skyDay = canvasTex(1024, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#4f8fd6");
  g.addColorStop(0.42, "#9cc6ee");
  g.addColorStop(0.5, "#dceaf4");
  g.addColorStop(0.52, "#b9c7a2");
  g.addColorStop(1, "#6d7f55");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    const cx = rand() * w, cy = h * (0.12 + rand() * 0.28), s = 30 + rand() * 70;
    for (let k = 0; k < 7; k++) {
      x.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.3})`;
      x.beginPath();
      x.ellipse(cx + rr(-s, s), cy + rr(-s * 0.2, s * 0.2), s * rr(0.4, 0.8), s * rr(0.15, 0.3), 0, 0, Math.PI * 2);
      x.fill();
    }
  }
});
const skyNight = canvasTex(2048, 1024, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#040915");
  g.addColorStop(0.4, "#0c1a36");
  g.addColorStop(0.5, "#1d3260");
  g.addColorStop(0.53, "#0b111b");
  g.addColorStop(1, "#06090e");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const sx = rand() * w, sy = rand() * h * 0.45, r = rand() ** 6 * 1.6 + 0.4;
    x.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.6})`;
    x.beginPath();
    x.arc(sx, sy, r, 0, Math.PI * 2);
    x.fill();
  }
});
const skyMat = new THREE.MeshBasicMaterial({ map: skyDay, side: THREE.BackSide, fog: false });
const skyBall = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), skyMat);
scene.add(skyBall);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xe8efff, transparent: true, depthWrite: false, fog: false }));
moon.scale.setScalar(26);
scene.add(moon);

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xfff4e6, 0x6b5a48, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c0, 4.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const moonLight = new THREE.DirectionalLight(0xa9c4ff, 1.6);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
moonLight.shadow.bias = -0.0004;
scene.add(moonLight, moonLight.target);
// lamps inside the house (night)
const roomLamp = new THREE.PointLight(0xffc98f, 14, 9, 1.4);
roomLamp.position.set(0, 2.35, -0.9);
roomLamp.castShadow = true;
roomLamp.shadow.mapSize.set(1024, 1024);
roomLamp.shadow.bias = -0.002;
const hallLamp = new THREE.PointLight(0xffd6a8, 6, 6, 1.5);
hallLamp.position.set(-2.6, 2.2, -1.0);
const sofaLamp = new THREE.PointLight(0xffb978, 5, 5, 1.6);
sofaLamp.position.set(-1.35, 1.45, 2.1);
scene.add(roomLamp, hallLamp, sofaLamp);
// a streetlamp in the lane behind the yard (night 2: the figure by the fence)
const streetLamp = new THREE.SpotLight(0xffd59a, 40, 14, 0.75, 0.6, 1.3);
scene.add(streetLamp, streetLamp.target);
// per-shot soft key on faces
const fill = new THREE.PointLight(0xfff0e0, 0, 4, 1.6);
scene.add(fill);
const fill2 = new THREE.PointLight(0xdbe8ff, 0, 4, 1.6);
scene.add(fill2);
// muzzle flash
const flashLight = new THREE.PointLight(0xffc070, 0, 8, 1.5);
scene.add(flashLight);
// shelter + clinic
const tubeLights = new THREE.PointLight(0xf4f8ff, 10, 10, 1.4);
scene.add(tubeLights);
const tubeLights2 = new THREE.PointLight(0xf4f8ff, 6, 10, 1.4);
scene.add(tubeLights2);

// ================= HOUSE: living room x -3.2..3.2, z -4..2.6 =================
// back wall (z = -4.07): picture window (x -2.2..-0.6) and the glass-paned back door (x 1.2..2.1)
// left wall (x = -3.27): the girl's bedroom door (z -1.5..-0.6); front wall (z = 2.67): front door
const house = group(0, 0, 0, scene);
house.name = "house";
const H = 2.6;
const BZ = -4.07, LX = -3.27, RX = 3.27, FZ = 2.67;
const WIN = { x0: -2.2, x1: -0.6, y0: 0.55, y1: 2.15 };
const BD = { x0: 1.2, x1: 2.1, h: 2.15 }; // back door
const GD = { z0: -1.5, z1: -0.6, h: 2.15 }; // girl's door
const FD = { x0: 1.55, x1: 2.45, h: 2.15 }; // front door
floorPlane(6.5, 6.8, M.hardwood, 0, 0.002, -0.7, house);
box(6.7, 0.06, 6.9, M.ceiling, 0, H + 0.03, -0.7, house);
// a wall along x (constant z) with rectangular holes: holes = [[x0, x1, y0, y1], ...]
function wallX(z, x0, x1, holes, m, d = 0.14, parent = house) {
  const g = group(0, 0, 0, parent);
  holes = [...holes].sort((p, q) => p[0] - q[0]); // openings must run left to right
  const xs = [x0, ...holes.flatMap((h) => [h[0], h[1]]), x1];
  for (let i = 0; i < xs.length; i += 2) if (xs[i + 1] > xs[i]) box(xs[i + 1] - xs[i], H, d, m, (xs[i] + xs[i + 1]) / 2, H / 2, z, g);
  for (const [a, b, y0, y1] of holes) {
    if (y0 > 0) box(b - a, y0, d, m, (a + b) / 2, y0 / 2, z, g);
    box(b - a, H - y1, d, m, (a + b) / 2, y1 + (H - y1) / 2, z, g);
  }
  return g;
}
function wallZ(x, z0, z1, holes, m, d = 0.14, parent = house) {
  const g = wallX(0, z0, z1, holes, m, d, parent);
  g.rotation.y = -Math.PI / 2;
  g.position.x = x;
  return g;
}
const W = {};
W.back = wallX(BZ, -3.3, 3.3, [[WIN.x0, WIN.x1, WIN.y0, WIN.y1], [BD.x0, BD.x1, 0, BD.h]], M.accent);
W.backOut = wallX(BZ - 0.09, -3.4, 3.4, [[WIN.x0, WIN.x1, WIN.y0, WIN.y1], [BD.x0, BD.x1, 0, BD.h]], M.siding, 0.04);
W.left = wallZ(LX, -4.1, 2.7, [[GD.z0, GD.z1, 0, GD.h]], M.wall);
W.right = wallZ(RX, -4.1, 2.7, [], M.wall);
W.front = wallX(FZ, -3.3, 3.3, [[FD.x0, FD.x1, 0, FD.h], [-0.8, 0.4, 0.85, 2.05], [-2.6, -1.4, 0.85, 2.05]], M.wall);
// window frames + glass
function windowFrame(x0, x1, y0, y1, z, parent = house, ry = 0) {
  const g = group(0, 0, z, parent);
  g.rotation.y = ry;
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  box(w, h, 0.01, M.glass, cx, cy, 0, g);
  for (const s of [-1, 1]) box(0.06, h + 0.1, 0.18, M.trim, cx + s * (w / 2 + 0.01), cy, 0, g);
  box(w + 0.14, 0.06, 0.24, M.trim, cx, y0 - 0.02, 0.03, g);
  box(w + 0.14, 0.06, 0.18, M.trim, cx, y1 + 0.02, 0, g);
  box(0.04, h, 0.05, M.trim, cx, cy, 0, g);
  box(w, 0.04, 0.05, M.trim, cx, y0 + h * 0.62, 0, g);
  return g;
}
windowFrame(WIN.x0, WIN.x1, WIN.y0, WIN.y1, BZ);
windowFrame(-0.8, 0.4, 0.85, 2.05, FZ);
windowFrame(-2.6, -1.4, 0.85, 2.05, FZ);
// curtains by the picture window
for (const x of [WIN.x0 - 0.18, WIN.x1 + 0.18]) box(0.3, 2.2, 0.06, T.fabric(0xe9dcc6, { key: "drape", weave: 3 }), x, 1.3, BZ + 0.12, house);
box(2.3, 0.03, 0.03, M.brass, (WIN.x0 + WIN.x1) / 2, 2.38, BZ + 0.14, house);
// door casings
for (const [a, b] of [[BD.x0, BD.x1]]) {
  for (const x of [a, b]) box(0.08, 2.2, 0.2, M.trim, x, 1.1, BZ, house);
  box(b - a + 0.16, 0.08, 0.2, M.trim, (a + b) / 2, 2.19, BZ, house);
}
for (const x of [FD.x0, FD.x1]) box(0.08, 2.2, 0.2, M.trim, x, 1.1, FZ, house);
box(FD.x1 - FD.x0 + 0.16, 0.08, 0.2, M.trim, (FD.x0 + FD.x1) / 2, 2.19, FZ, house);
for (const z of [GD.z0, GD.z1]) box(0.2, 2.2, 0.08, M.trim, LX, 1.1, z, house);
box(0.2, 0.08, GD.z1 - GD.z0 + 0.16, M.trim, LX, 2.19, (GD.z0 + GD.z1) / 2, house);
// skirting
for (const [w, d, x, z] of [[6.5, 0.03, 0, BZ + 0.08], [0.03, 6.8, RX - 0.08, -0.7], [0.03, 6.8, LX + 0.08, -0.7], [6.5, 0.03, 0, FZ - 0.08]]) box(w, 0.1, d, M.trim, x, 0.05, z, house);

// the back door: hinged at x0, opens inward (+z); upper half is a glass pane that gets broken
const backDoor = group(BD.x0 + 0.02, 0, BZ, house);
const BDW = BD.x1 - BD.x0 - 0.04;
box(BDW, 1.05, 0.05, M.door, BDW / 2, 0.525, 0, backDoor);
box(BDW, 0.12, 0.05, M.door, BDW / 2, 2.07, 0, backDoor);
for (const x of [0.05, BDW - 0.05]) box(0.1, 0.95, 0.05, M.door, x, 1.55, 0, backDoor);
const PANE = { x: BDW / 2, y: 1.55, w: BDW - 0.2, h: 0.95 };
const pane = box(PANE.w, PANE.h, 0.008, M.glass, PANE.x, PANE.y, 0, backDoor);
box(0.025, PANE.h, 0.03, M.door, PANE.x, PANE.y, 0, backDoor);
box(PANE.w, 0.025, 0.03, M.door, PANE.x, PANE.y, 0, backDoor);
const lockKnob = mesh(new THREE.SphereGeometry(0.03, 16, 12), M.brass, BDW - 0.08, 1.0, 0.06, backDoor);
mesh(new THREE.SphereGeometry(0.03, 16, 12), M.brass, BDW - 0.08, 1.0, -0.06, backDoor);
const doorOpen = (o) => (backDoor.rotation.y = -o * 1.45);
// the front door: hinged on its left edge, opens inward (+ angle); a glass pane up top
// so the dog can be seen waiting for you
const frontDoor = group(FD.x1 - 0.02, 0, FZ, house);
{
  const DW = FD.x1 - FD.x0 - 0.04; // the panel extends to -x from the hinge
  const red = T.paintedWood(0xb5443a);
  box(DW, 1.2, 0.05, red, -DW / 2, 0.6, 0, frontDoor);
  box(DW, 0.23, 0.05, red, -DW / 2, 2.015, 0, frontDoor);
  box(0.12, 0.7, 0.05, red, -0.06, 1.55, 0, frontDoor);
  box(0.12, 0.7, 0.05, red, -(DW - 0.06), 1.55, 0, frontDoor);
  box(DW - 0.24, 0.7, 0.012, M.glass, -DW / 2, 1.55, 0, frontDoor);
  mesh(new THREE.SphereGeometry(0.032, 16, 12), M.brass, -(DW - 0.1), 1.0, -0.05, frontDoor);
}
const frontDoorAngle = (o) => (frontDoor.rotation.y = -o * 1.6); // 1 = open, swinging inward
// kitchen side: fridge on the right wall (the adoption card goes on it)
const FRIDGE = V(RX - 0.4, 0, -2.6);
const fridge = group(FRIDGE.x, 0, FRIDGE.z, house);
fridge.rotation.y = -Math.PI / 2;
box(0.8, 1.85, 0.7, mat(0xe9ecee, { roughness: 0.3, metalness: 0.2 }), 0, 0.925, 0, fridge);
box(0.78, 0.01, 0.01, mat(0xb8bec4), 0, 1.25, 0.351, fridge);
for (const y of [1.55, 0.9]) box(0.03, 0.35, 0.04, M.steel, -0.3, y, 0.37, fridge);
box(1.6, 0.9, 0.62, T.paintedWood(0x5d7f8a), -1.25, 0.45, 0.04, fridge); // counter
box(1.64, 0.04, 0.66, mat(0xe8e2d6, { roughness: 0.35 }), -1.25, 0.92, 0.04, fridge);
// the leash hook by the front door
const HOOK = V(2.85, 1.54, FZ - 0.1);
box(0.5, 0.06, 0.03, M.wood, 2.85, 1.55, FZ - 0.04, house);
for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 8).rotateX(Math.PI / 2 + 0.4), M.brass, 2.7 + i * 0.15, 1.54, FZ - 0.09, house);
place(shoes(), 1.2, 0, FZ - 0.3, Math.PI - 0.3);
place(shoes({ color: 0xe46b9a }), 1.4, 0, FZ - 0.35, Math.PI + 0.2); // her pink sneakers

// her bedroom, seen through the door on the left (pink walls, bed, night light, posters)
const bedroom = group(0, 0, 0, house);
floorPlane(2.2, 3.4, M.hardwood, LX - 1.1, 0.002, -1.05, bedroom);
wallZ(LX - 2.2, -2.8, 0.7, [], M.pink, 0.1, bedroom);
wallX(-2.75, LX - 2.3, LX, [], M.pink, 0.1, bedroom);
wallX(0.65, LX - 2.3, LX, [], M.pink, 0.1, bedroom);
box(2.3, 0.05, 3.6, M.ceiling, LX - 1.1, H + 0.03, -1.05, bedroom);
{
  const bed = group(LX - 1.55, 0, -2.0, bedroom);
  box(1.0, 0.35, 1.9, M.wood, 0, 0.18, 0, bed);
  box(0.95, 0.15, 1.85, T.fabric(0xf2f0ea, { key: "sheet", weave: 5 }), 0, 0.42, 0, bed);
  box(0.98, 0.08, 1.2, T.fabric(0xc96a8c, { key: "duvet", weave: 4 }), 0, 0.52, 0.3, bed);
  box(0.5, 0.12, 0.3, T.fabric(0xffffff, { key: "pillow", weave: 6 }), 0, 0.56, -0.7, bed);
  const toy = plushToy({ body: 0xd9a066, belly: 0xf3e6d2 });
  toy.position.set(0.25, 0.6, -0.55);
  toy.scale.setScalar(0.7);
  bed.add(toy);
}
place(wallArt({ w: 0.5, h: 0.6, style: "sunset", seed: 11 }), LX - 2.14, 1.5, -0.4, Math.PI / 2, bedroom);
const nightLight = new THREE.PointLight(0xffa7c8, 3, 4, 1.6);
nightLight.position.set(LX - 0.7, 0.5, -2.4);
house.add(nightLight);

// ================= furnishing: an entry and a living room with plenty of life in them =================
const wood2 = T.paintedWood(0x7a5538);
const darkWood = T.paintedWood(0x3a281c);
const warmFill = new THREE.PointLight(0xffe2b5, 7, 9, 1.5); // soft indoor warmth, no shadows
warmFill.position.set(1.6, 2.3, 0.4);
scene.add(warmFill);
// a table lamp: ceramic base and a glowing linen shade
function tableLamp(x, y, z, color = 0xf2eadb) {
  const g = group(x, y, z, house);
  mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.2, 20), mat(0x3d6b7a, { roughness: 0.3 }), 0, 0.1, 0, g);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), M.brass, 0, 0.26, 0, g);
  mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.22, 28, 1, true), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), 0, 0.38, 0, g);
  return g;
}
// ---- the entry, left of the door: console table, mirror, lamp, flowers, photos, a basket underneath
const CON = V(0.85, 0, FZ - 0.26);
box(1.15, 0.05, 0.36, wood2, CON.x, 0.8, CON.z, house);
for (const sx of [-0.52, 0.52]) for (const sz of [-0.14, 0.14]) box(0.05, 0.78, 0.05, wood2, CON.x + sx, 0.39, CON.z + sz, house);
box(1.05, 0.03, 0.3, wood2, CON.x, 0.25, CON.z, house);
place(mirror(0.72, 0.95, { frame: 0x3a281c, real: false }), CON.x, 1.5, FZ - 0.045, Math.PI);
tableLamp(CON.x - 0.38, 0.825, CON.z);
place(loadProp(short, "GlassVaseFlowers", { height: 0.38 }), CON.x + 0.36, 0.825, CON.z);
mesh(new THREE.CylinderGeometry(0.075, 0.055, 0.04, 20), mat(0x2f6f6a, { roughness: 0.4 }), CON.x, 0.845, CON.z + 0.03, house);
for (const [x, h, r] of [[-0.12, 0.2, 0.1], [0.06, 0.16, -0.1]]) {
  const f = box(0.14, h, 0.02, mat(0x2a1d14), CON.x + x, 0.825 + h / 2, CON.z - 0.1, house);
  f.rotation.x = -0.12;
  f.rotation.y = r;
}
box(0.4, 0.22, 0.3, T.fabric(0xb08a55, { key: "wicker", weave: 8 }), CON.x - 0.3, 0.11, CON.z, house);
box(0.16, 0.05, 0.22, mat(0x8a3a2e), CON.x + 0.15, 0.285, CON.z, house);
box(0.14, 0.04, 0.2, mat(0x2f6f6a), CON.x + 0.15, 0.33, CON.z, house);
// ---- right of the door: a bench with a bag under the coats, shoes beneath
{
  const bx = 2.92, bz = FZ - 0.3;
  box(0.72, 0.06, 0.4, wood2, bx, 0.46, bz, house);
  for (const sx of [-0.32, 0.32]) for (const sz of [-0.16, 0.16]) box(0.05, 0.44, 0.05, wood2, bx + sx, 0.22, bz + sz, house);
  box(0.66, 0.05, 0.34, T.fabric(0x6d8aa0, { key: "benchpad", weave: 4 }), bx, 0.515, bz, house);
  place(handbag({ color: 0x7a3f2a }), bx - 0.12, 0.54, bz, 0.4);
  place(shoes({ color: 0x2f2a28 }), bx - 0.1, 0, bz + 0.02, Math.PI - 0.2);
  place(shoes({ color: 0xc9a36a }), bx + 0.18, 0, bz + 0.03, Math.PI + 0.15);
  // coats and a cap on the hook rail
  for (const [x, c, w] of [[2.72, 0x5a6b3a, 0.26], [2.86, 0x2b3a56, 0.28], [3.0, 0xb98a2f, 0.26]]) {
    const coat = group(x, 1.55, FZ - 0.13, house);
    box(w, 0.95, 0.09, T.fabric(c, { key: "coat" + c, weave: 3 }), 0, -0.47, 0, coat);
    box(0.09, 0.62, 0.09, T.fabric(c, { key: "coat" + c, weave: 3 }), w / 2 + 0.03, -0.38, 0.02, coat);
    box(0.24, 0.1, 0.1, T.fabric(c, { key: "coat" + c, weave: 3 }), 0, -0.02, 0.01, coat);
  }
  place(hat("cap", { color: 0x2b3a56 }), 3.08, 1.58, FZ - 0.16, 0.3);
}
// his leash hangs from the rail
{
  const leash = createLeash({ color: 0xc8261e });
  house.add(leash);
  leash.set([V(2.64, 1.53, FZ - 0.12), V(2.64, 1.2, FZ - 0.14), V(2.62, 0.95, FZ - 0.15), V(2.65, 0.78, FZ - 0.12)], { loop: true, floor: 0 });
}
// ---- the front window: curtains, a rod, a plant on the sill
for (const x of [-1.0, 0.6]) box(0.34, 2.2, 0.08, T.fabric(0xe9dcc6, { key: "drape", weave: 3 }), x, 1.3, FZ - 0.13, house);
box(1.95, 0.03, 0.03, M.brass, -0.2, 2.42, FZ - 0.12, house);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 0.55 }), -0.2, 0.9, FZ - 0.22);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.5 }), -0.35, 0, FZ - 0.5);
// ---- floor: a runner from the door, a mat, and a big rug under the living area
floorPlane(0.9, 2.1, T.fabric(0x2f4f6b, { key: "runner", weave: 4, repeat: [2, 6] }), 2.0, 0.009, 1.25, house);
box(0.8, 0.015, 0.5, T.fabric(0x5a4632, { key: "mat", weave: 3 }), 2.0, 0.01, FZ - 0.35, house);
floorPlane(3.2, 2.4, M.rug, 1.2, 0.008, -0.55, house);
// ---- living area: sofa on the right wall, cushions, a throw, a coffee table, an armchair, lamps
place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.3 }), 2.78, 0, -0.55, -Math.PI / 2);
for (const [z, c, r] of [[-1.25, 0xd98a4a, 0.15], [-0.55, 0x3d6b7a, -0.1], [0.12, 0xe8d8bd, 0.2]]) {
  const cu = place(cushion({ color: c }), 3.0, 0.62, z, -Math.PI / 2);
  cu.rotation.set(0.25, -Math.PI / 2, r);
}
box(0.45, 0.05, 0.9, T.fabric(0x7ea3c4, { key: "throw", weave: 3 }), 2.98, 0.76, 0.28, house).rotation.z = 0.15;
place(coffeeTable(), 1.75, 0, -0.55, Math.PI / 2);
place(loadProp(short, "GlassVaseFlowers", { height: 0.34 }), 1.75, 0.42, -0.55);
box(0.28, 0.04, 0.2, mat(0x8a3a2e), 1.7, 0.43, -0.2, house).rotation.y = 0.3;
box(0.26, 0.03, 0.19, mat(0x2f6f6a), 1.7, 0.465, -0.2, house).rotation.y = 0.5;
mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16), mat(0xf2efe6, { roughness: 0.3 }), 1.78, 0.46, -0.85, house);
place(loadProp(short, "SheenChair", { height: 0.95 }), -1.4, 0, -1.0, Math.PI / 2);              // armchair in the far corner
place(loadProp(short, "SpecularSilkPouf", { height: 0.4 }), 2.3, 0, -1.45);                       // poufs by the sofa, out of the camera's way
place(loadProp(short, "SpecularSilkPouf", { height: 0.34 }), 2.0, 0, -1.95, 0.8);
{
  const g = group(0.25, 0, -1.45, house);
  mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 28), wood2, 0, 0.55, 0, g);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.53, 10), wood2, 0, 0.27, 0, g);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), wood2, 0, 0.04, 0, g);
}
tableLamp(0.25, 0.57, -1.45);
place(floorLamp(), 3.05, 0, 0.72);
place(bookshelf({ w: 1.2, h: 1.95, seed: 7 }), RX - 0.2, 0, 1.5, -Math.PI / 2);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.3 }), 3.0, 0, -1.95);
// framed pictures above the sofa, a clock over the door
place(wallArt({ w: 0.7, h: 0.5, style: "landscape", seed: 2 }), RX - 0.02, 1.8, -1.2, -Math.PI / 2);
place(wallArt({ w: 0.45, h: 0.6, style: "sunset", seed: 5 }), RX - 0.02, 1.8, -0.55, -Math.PI / 2);
place(wallArt({ w: 0.5, h: 0.4, style: "abstract", seed: 4 }), RX - 0.02, 1.8, 0.08, -Math.PI / 2);
place(wallClock({ hours: 8.3 }), 2.0, 2.4, FZ - 0.06, Math.PI);
// a pendant lamp over the coffee table, and a ceiling light by the door
{
  const g = group(1.7, 0, -0.55, house);
  box(0.012, 0.6, 0.012, mat(0x222222), 0, H - 0.3, 0, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.3, 0.26, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1dc, side: THREE.DoubleSide }), 0, H - 0.72, 0, g);
  mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9bd }), 0, H - 0.78, 0, g);
}
mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0xfff1dc }), 1.8, H - 0.02, 1.6, house);
box(6.5, 0.08, 0.08, M.trim, 0, H - 0.04, FZ - 0.05, house); // crown moulding on the front wall
// ---- his things: bed, blanket, toys, bowls
{
  const g = group(0.4, 0, 1.9, house);
  const rim = mesh(new THREE.TorusGeometry(0.4, 0.11, 14, 36), T.fabric(0xb98a5e, { key: "dogbed", weave: 4 }), 0, 0.1, 0, g);
  rim.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 36), T.fabric(0xf4ead8, { key: "dogbedin", weave: 5 }), 0, 0.04, 0, g);
  box(0.5, 0.03, 0.4, T.fabric(0x8a5a4a, { key: "bedthrow", weave: 3 }), 0.05, 0.08, 0, g).rotation.y = 0.4;
  place(tennisBall(), -0.12, 0.09, 0.08, 0, g);
}
place(tennisBall(), 0.75, 0.034, 0.95);
place(tennisBall(), 1.95, 0.034, 0.2);
place(ropeToy(), 0.9, 0.03, -0.1, 0.8);
for (const [x, c] of [[1.45, 0x3a7bd5], [1.7, 0x8a5a2b]]) {
  const g = group(x, 0, FZ - 0.25, house);
  mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.07, 24), M.steel, 0, 0.035, 0, g);
  mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 24), mat(c, { roughness: 0.3 }), 0, 0.068, 0, g);
}
// ================= THE BACK YARD (z < -4.2): lawn, fence, lane with a streetlamp, trees =================
const yard = group(0, 0, 0, scene);
yard.name = "yard";
floorPlane(40, 30, M.grass, 0, -0.01, -16, yard);
floorPlane(40, 40, M.grass, 0, -0.012, 22, yard); // in front of the house too
floorPlane(1.2, 3.0, M.concrete, (BD.x0 + BD.x1) / 2, 0.0, BZ - 1.6, yard); // path from the back door
{
  const f = picketFence(14, { height: 1.0 });
  f.position.set(-7, 0, -11);
  yard.add(f);
  const f2 = picketFence(7, { height: 1.0 });
  f2.position.set(-7, 0, -11);
  f2.rotation.y = -Math.PI / 2;
  yard.add(f2);
  const f3 = picketFence(7, { height: 1.0 });
  f3.position.set(7, 0, -11);
  f3.rotation.y = -Math.PI / 2;
  yard.add(f3);
}
floorPlane(40, 5, M.asphalt, 0, 0.0, -14, yard); // the lane behind the fence
const lampPost = group(-2.8, 0, -12.3, yard);
box(0.1, 4.2, 0.1, mat(0x30343a, { metalness: 0.6 }), 0, 2.1, 0, lampPost);
box(0.6, 0.06, 0.1, mat(0x30343a, { metalness: 0.6 }), 0.25, 4.15, 0, lampPost);
const lampBulb = mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }), 0.5, 4.08, 0, lampPost);
const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffcf8a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
lampGlow.scale.setScalar(1.4);
lampGlow.position.set(0.5, 4.05, 0);
lampPost.add(lampGlow);
streetLamp.position.set(-2.3, 4.05, -12.3);
streetLamp.target.position.set(-2.3, 0, -11.2);
const yardTrees = createForest(yard);
for (let i = 0; i < 9; i++) yardTrees.tree(-16 + i * 4 + rr(-1, 1), rr(-19, -16), { height: rr(2.8, 3.6), scale: rr(1.4, 1.9) });
yardTrees.tree(4.6, -8.0, { height: 3.2, scale: 1.6 });
for (let i = 0; i < 6; i++) yardTrees.bush(-6 + i * 2.2 + rr(-0.4, 0.4), -10.4, rr(0.9, 1.3));
for (let i = 0; i < 4; i++) yardTrees.bush(-3 + i * 1.6, FZ + 1.2, rr(0.9, 1.2));
yardTrees.build();
// neighbours' houses across the lane (warm windows at night)
for (const [x, c] of [[-9, 0xd8c8b0], [0, 0xc6d3dc], [9, 0xe0d2c2]]) {
  const hh = group(x, 0, -24, yard);
  box(7, 3, 6, T.siding(c), 0, 1.5, 0, hh);
  const roof = box(7.6, 0.2, 4.4, M.shingles, 0, 3.5, 1.5, hh);
  roof.rotation.x = 0.55;
  for (const wx of [-2, 0.5, 2.3]) box(0.9, 0.8, 0.05, M.warmWindow, wx, 1.7, 3.02, hh);
}
// the house from outside: back facade, roof, a swing set and flowers in the yard
{
  const roofL = box(7.4, 0.15, 4.2, M.shingles, 0, H + 0.95, BZ + 1.6, house);
  roofL.rotation.x = -0.5;
  const roofR = box(7.4, 0.15, 4.2, M.shingles, 0, H + 0.95, FZ - 1.6, house);
  roofR.rotation.x = 0.5;
  for (const x of [-3.35, 3.35]) {
    const gable = mesh(new THREE.BufferGeometry().setFromPoints([V(0, H, BZ - 0.1), V(0, H, FZ + 0.1), V(0, H + 1.85, (BZ + FZ) / 2)]), M.siding, x, 0, 0, house);
    gable.geometry.computeVertexNormals();
    gable.material = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, side: THREE.DoubleSide, roughness: 0.8 });
  }
  wallZ(LX - 2.25, -4.1, 2.7, [], M.siding, 0.04, house);
  wallZ(RX + 0.09, -4.1, 2.7, [], M.siding, 0.04, house);
  wallX(FZ + 0.09, -3.4, 3.4, [[FD.x0, FD.x1, 0, FD.h], [-0.8, 0.4, 0.85, 2.05], [-2.6, -1.4, 0.85, 2.05]], M.siding, 0.04);
}
const swing = group(-4.5, 0, -8.2, yard);
for (const s of [-1, 1]) {
  const leg = box(0.08, 2.3, 0.08, M.wood, s * 1.0, 1.1, 0.4, swing);
  leg.rotation.x = 0.18;
  const leg2 = box(0.08, 2.3, 0.08, M.wood, s * 1.0, 1.1, -0.4, swing);
  leg2.rotation.x = -0.18;
}
box(2.2, 0.08, 0.08, M.wood, 0, 2.2, 0, swing);
for (const s of [-0.35, 0.35]) box(0.015, 1.6, 0.015, M.steel, s, 1.4, 0, swing);
box(0.5, 0.04, 0.2, mat(0xd93b3b), 0, 0.6, 0, swing);
const flowers = group(0, 0, BZ - 0.6, yard);
for (let i = 0; i < 40; i++) {
  const x = -3 + rand() * 6;
  if (x > BD.x0 - 0.2 && x < BD.x1 + 0.2) continue;
  const fl = mesh(new THREE.SphereGeometry(0.045, 8, 6), mat([0xe84a6a, 0xf2c94c, 0xffffff, 0xb36ad9][i % 4]), x, 0.28 + rand() * 0.15, rr(-0.3, 0.3), flowers);
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), mat(0x4a7a3a), x, 0.15, fl.position.z, flowers);
}
wallX(-2.85, LX - 2.3, LX - 0.07, [], M.siding, 0.04, house); // bedroom outside wall
{
  const r = box(2.6, 0.15, 3.0, M.shingles, LX - 1.15, H + 0.55, -1.05, house);
  r.rotation.z = -0.3;
}

// ================= THE FRONT: a terrace, a fenced garden, the street and the neighbours =================
const front = group(0, 0, 0, scene);
front.name = "front";
const FY = FZ + 0.09; // the front wall's outer face
const whitePaint = T.paintedWood(0xf6f3ee);
const dummy = new THREE.Object3D();
const FLOWER_COLORS = [0xe84a6a, 0xf2c94c, 0xffffff, 0xb36ad9, 0xff8a3d, 0xf28ab2];
const LEAF_COLORS = [0x3f7a3a, 0x4f8a42, 0x35692f, 0x5a9a48];

// a stone-edged flower bed: leafy mounds with blossoms on top (two instanced meshes)
function flowerBed(x0, x1, z0, z1, n, { border = 0x9a9185, blooms = FLOWER_COLORS } = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  floorPlane(w, d, mat(0x4a3424), cx, 0.05, cz, front);
  for (const [bw, bd, bx, bz] of [[w + 0.16, 0.08, cx, z0 - 0.04], [w + 0.16, 0.08, cx, z1 + 0.04], [0.08, d, x0 - 0.04, cz], [0.08, d, x1 + 0.04, cz]]) box(bw, 0.12, bd, mat(border), bx, 0.06, bz, front);
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff, { roughness: 0.9 }), n);
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffffff, { roughness: 0.6 }), n * 2);
  for (let i = 0; i < n; i++) {
    const x = rr(x0 + 0.08, x1 - 0.08), z = rr(z0 + 0.08, z1 - 0.08), r = rr(0.1, 0.17);
    dummy.position.set(x, 0.1 + r * 0.5, z);
    dummy.scale.set(r, r * 0.8, r);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
    leaves.setColorAt(i, new THREE.Color(LEAF_COLORS[i % 4]));
    for (let k = 0; k < 2; k++) {
      dummy.position.set(x + rr(-0.07, 0.07), 0.2 + r + rr(0, 0.12), z + rr(-0.07, 0.07));
      dummy.scale.setScalar(rr(0.8, 1.3));
      dummy.updateMatrix();
      petals.setMatrixAt(i * 2 + k, dummy.matrix);
      petals.setColorAt(i * 2 + k, new THREE.Color(blooms[(i + k) % blooms.length]));
    }
  }
  front.add(leaves, petals);
}
// a clay pot with a leafy shrub and blossoms
function pot(x, z, { s = 1, color = 0xb5603a } = {}) {
  const g = group(x, 0, z, front);
  mesh(new THREE.CylinderGeometry(0.17 * s, 0.12 * s, 0.3 * s, 18), mat(color, { roughness: 0.7 }), 0, 0.15 * s, 0, g);
  mesh(new THREE.TorusGeometry(0.17 * s, 0.02 * s, 8, 18), mat(color, { roughness: 0.7 }), 0, 0.3 * s, 0, g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) mesh(new THREE.IcosahedronGeometry(0.13 * s, 1), mat(LEAF_COLORS[i % 4]), rr(-0.1, 0.1) * s, (0.4 + rr(0, 0.18)) * s, rr(-0.1, 0.1) * s, g);
  for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.05 * s, 8, 6), mat(FLOWER_COLORS[(i + Math.round(x * 7)) % 6], { roughness: 0.6 }), rr(-0.13, 0.13) * s, (0.55 + rr(0, 0.15)) * s, rr(-0.13, 0.13) * s, g);
  return g;
}
const fence = (x, z, len, ry = 0, height = 0.95) => {
  const f = picketFence(len, { height });
  f.position.set(x, 0, z);
  f.rotation.y = ry;
  front.add(f);
  return f;
};

// ---- the terrace: flagstones flush with the lawn, a doormat, a lantern, a table with a parasol, plants
floorPlane(3.7, 2.15, M.block, 1.95, 0.012, FY + 1.08, front);
box(3.7, 0.04, 0.06, mat(0x9a9185), 1.95, 0.02, FY + 2.17, front);
box(0.8, 0.02, 0.5, T.fabric(0x5a4632, { key: "mat", weave: 3 }), 2.0, 0.02, FY + 0.5, front);
box(0.62, 0.025, 0.32, T.fabric(0xb98a2f, { key: "mat2", weave: 3 }), 2.0, 0.022, FY + 0.5, front);
{
  const lan = group(1.3, 1.75, FY + 0.07, front);
  box(0.12, 0.26, 0.1, mat(0x1b1c1f, { metalness: 0.6 }), 0, 0, 0, lan);
  box(0.08, 0.2, 0.06, new THREE.MeshBasicMaterial({ color: 0xffe6b0 }), 0, 0, 0.02, lan);
  box(0.16, 0.03, 0.14, mat(0x1b1c1f, { metalness: 0.6 }), 0, 0.14, 0, lan);
}
{
  const tb = group(3.0, 0, FY + 1.1, front);
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28), mat(0x2f6f6a, { roughness: 0.4 }), 0, 0.72, 0, tb);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), M.darkSteel, 0, 0.36, 0, tb);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), M.darkSteel, 0, 0.02, 0, tb);
  place(loadProp(short, "GlassVaseFlowers", { height: 0.3 }), 0, 0.74, 0, 0, tb);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 10), M.darkSteel, 0, 1.05, 0, tb); // parasol pole through the table
  const cone = mesh(new THREE.ConeGeometry(1.15, 0.45, 24, 1, true), mat(0xf2c94c, { side: THREE.DoubleSide, roughness: 0.8 }), 0, 2.12, 0, tb);
  mesh(new THREE.ConeGeometry(0.5, 0.46, 24, 1, true), mat(0xe8e4dc, { side: THREE.DoubleSide, roughness: 0.8 }), 0, 2.121, 0, tb);
  for (const a of [0.7, 3.9]) {
    const ch = group(Math.sin(a) * 0.72, 0, Math.cos(a) * 0.72, tb);
    ch.rotation.y = a + Math.PI;
    box(0.42, 0.04, 0.42, M.darkSteel, 0, 0.45, 0, ch);
    box(0.42, 0.4, 0.03, M.darkSteel, 0, 0.66, -0.2, ch);
    for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) box(0.03, 0.44, 0.03, M.darkSteel, sx, 0.22, sz, ch);
    box(0.36, 0.05, 0.36, T.fabric(0xe8a07a, { key: "pad", weave: 4 }), 0, 0.5, 0, ch);
  }
}
// a rocking chair and a bench-side basket on the left of the door
{
  const rc = group(0.8, 0, FY + 0.95, front);
  rc.rotation.y = -0.3;
  box(0.56, 0.05, 0.5, wood2, 0, 0.45, 0, rc);
  box(0.56, 0.7, 0.04, wood2, 0, 0.82, -0.24, rc).rotation.x = -0.12;
  for (const sx of [-0.26, 0.26]) {
    box(0.04, 0.32, 0.04, wood2, sx, 0.62, 0.18, rc);
    const rock = mesh(new THREE.TorusGeometry(0.55, 0.018, 6, 24, 1.0), wood2, sx, 0.62, 0, rc);
    rock.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.5);
    rock.position.set(sx, 0.55, 0);
    box(0.04, 0.4, 0.04, wood2, sx, 0.22, -0.18, rc);
  }
  box(0.5, 0.04, 0.46, T.fabric(0x6d8aa0, { key: "benchpad", weave: 4 }), 0, 0.5, 0, rc);
}
pot(1.3, FY + 0.35, { s: 1.3 });
pot(2.72, FY + 0.35, { s: 1.3, color: 0x9a4a2a });
pot(0.3, FY + 0.3, { s: 1.0 });
pot(3.55, FY + 0.3, { s: 1.0, color: 0xc7774a });
pot(0.25, FY + 1.9, { s: 0.9 });
pot(3.65, FY + 1.95, { s: 0.9, color: 0x9a4a2a });
// hanging baskets from the porch wall
for (const x of [0.5, 3.2]) {
  const hb = group(x, 2.1, FY + 0.18, front);
  box(0.02, 0.2, 0.02, M.darkSteel, 0, 0.1, -0.08, hb);
  mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x6a4a32), 0, 0, 0, hb);
  for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.075, 8, 6), mat(FLOWER_COLORS[i]), rr(-0.1, 0.1), 0.05 + rr(0, 0.04), rr(-0.1, 0.1), hb);
}
// ---- the path, the front beds and the lawn details
for (let i = 0; i < 9; i++) {
  const z = FY + 2.6 + i * 0.75;
  box(1.1, 0.03, 0.55, mat(i % 2 ? 0xb9b2a4 : 0xc9c4ba, { roughness: 0.95 }), 2.0 + 0.05 * Math.sin(i * 1.7), 0.015, z, front);
}
flowerBed(-3.2, -1.3, FY + 0.1, FY + 0.85, 20);
flowerBed(3.9, 4.8, FY + 0.1, FY + 4.5, 26, { blooms: [0xffffff, 0xf2c94c, 0xb36ad9] });
flowerBed(5.6, 7.4, 6.2, 7.7, 30, { border: 0xb9b2a4 });
flowerBed(-3.6, -1.0, 6.0, 7.4, 22, { blooms: [0xe84a6a, 0xf28ab2, 0xffffff] });
// a vegetable patch in a wooden frame: rows of green with a tiny scarecrow-ish stake
{
  const g = group(6.6, 0, 9.2, front);
  box(2.4, 0.2, 0.08, wood2, 0, 0.1, 0.8, g); box(2.4, 0.2, 0.08, wood2, 0, 0.1, -0.8, g);
  box(0.08, 0.2, 1.68, wood2, 1.2, 0.1, 0, g); box(0.08, 0.2, 1.68, wood2, -1.2, 0.1, 0, g);
  floorPlane(2.32, 1.52, mat(0x4a3424), 0, 0.15, 0, g);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) mesh(new THREE.IcosahedronGeometry(0.1, 1), mat(LEAF_COLORS[(r + i) % 4]), -1.0 + i * 0.4, 0.22, -0.55 + r * 0.37, g);
  box(0.03, 0.9, 0.03, wood2, 0.8, 0.5, 0.2, g);
  box(0.5, 0.03, 0.03, wood2, 0.8, 0.78, 0.2, g);
}
// birdbath, a garden gnome, a bench, a watering can, a wheelbarrow, a bike against the house
{
  const bb = group(5.3, 0, 5.2, front);
  mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.12, 20), mat(0xb9b2a4), 0, 0.06, 0, bb);
  mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55, 16), mat(0xc9c4ba), 0, 0.4, 0, bb);
  mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.12, 24), mat(0xc9c4ba), 0, 0.72, 0, bb);
  mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), new THREE.MeshStandardMaterial({ color: 0x7fb4d4, roughness: 0.05, metalness: 0.1 }), 0, 0.775, 0, bb);
  const gn = group(3.45, 0, 5.7, front);
  mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.28, 12), mat(0x2f6fb4), 0, 0.14, 0, gn);
  mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(0xf2c9a0), 0, 0.34, 0, gn);
  mesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0xf4f1ea), 0, 0.27, 0.07, gn);
  mesh(new THREE.ConeGeometry(0.1, 0.24, 12), mat(0xd22b2b), 0, 0.5, 0, gn);
  const bn = group(8.2, 0, 7.5, front);
  bn.rotation.y = -Math.PI / 2;
  box(1.2, 0.05, 0.4, wood2, 0, 0.46, 0, bn);
  box(1.2, 0.4, 0.04, wood2, 0, 0.7, -0.18, bn).rotation.x = -0.15;
  for (const sx of [-0.52, 0.52]) box(0.06, 0.46, 0.4, wood2, sx, 0.23, 0, bn);
  const wc = group(0.2, 0, FY + 1.3, front);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), mat(0x3d8a4a, { metalness: 0.4 }), 0, 0.08, 0, wc);
  const sp = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), mat(0x3d8a4a, { metalness: 0.4 }), 0.14, 0.17, 0, wc);
  sp.rotation.z = -0.9;
  const bk = group(-0.55, 0, FY + 0.5, front);
  bk.rotation.y = 0.3;
  for (const wx of [-0.42, 0.42]) {
    const w = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 24), mat(0x1b1c1f), wx, 0.3, 0, bk);
    w.rotation.y = Math.PI / 2;
  }
  box(0.8, 0.03, 0.03, mat(0xd93b3b), 0, 0.5, 0, bk).rotation.z = 0.18;
  box(0.03, 0.4, 0.03, mat(0xd93b3b), -0.1, 0.5, 0, bk);
  box(0.2, 0.04, 0.06, mat(0x1b1c1f), -0.12, 0.72, 0, bk);
  box(0.03, 0.05, 0.4, mat(0x1b1c1f), 0.38, 0.62, 0, bk);
}
// ---- the garden fence: left and right sides, the street side with a gate and its posts
fence(-5.5, FY, 8.8, -Math.PI / 2);
fence(8.5, FY, 8.8, -Math.PI / 2);
fence(-5.5, 11.5, 6.9, 0);
fence(2.55, 11.5, 5.95, 0);
for (const px of [1.4, 2.6]) {
  box(0.16, 1.3, 0.16, whitePaint, px, 0.65, 11.5, front);
  box(0.2, 0.05, 0.2, whitePaint, px, 1.32, 11.5, front);
  mesh(new THREE.SphereGeometry(0.07, 10, 8), whitePaint, px, 1.4, 11.5, front);
}
{
  const gate = fence(1.48, 11.5, 0.5, 0.0, 0.95); // gate leaf, ajar
  gate.position.set(1.48, 0, 11.5);
  gate.rotation.y = -0.9;
  const gate2 = fence(2.52, 11.5, 0.5, Math.PI, 0.95);
  gate2.rotation.y = Math.PI + 0.55;
}
place(mailbox(), 3.7, 0, 12.1, Math.PI, front);
// ---- the street: sidewalk, road with a dashed line, a verge, lamp posts, two cars
floorPlane(80, 1.2, M.concrete, 0, 0.0, 12.2, front);
floorPlane(80, 5.4, M.asphalt, 0, 0.0, 15.5, front);
floorPlane(80, 1.2, M.concrete, 0, 0.0, 18.8, front);
{
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.01, 0.12), mat(0xf2efe6), 40);
  for (let i = 0; i < 40; i++) {
    dummy.position.set(-39 + i * 2.1, 0.012, 15.5);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  }
  front.add(dashes);
}
for (const x of [-7, 9.5]) {
  const lp = group(x, 0, 12.7, front);
  box(0.09, 4.0, 0.09, mat(0x30343a, { metalness: 0.6 }), 0, 2.0, 0, lp);
  box(0.8, 0.06, 0.09, mat(0x30343a, { metalness: 0.6 }), 0.35, 3.95, 0, lp);
  mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(0xf4efe0, { roughness: 0.3 }), 0.7, 3.9, 0, lp);
}
place(loadProp(short, "sedan", { length: 4.4 }), -3.6, 0, 13.4, Math.PI / 2, front);
place(loadProp(short, "hatchback", { length: 3.9 }), 11.5, 0, 17.4, -Math.PI / 2, front);
place(loadProp(short, "van", { length: 5.0 }), -19, 0, 13.4, Math.PI / 2, front);
// ---- the neighbours: a pastel row on both sides of the street, each with a roof, chimney, windows and a door
function neighbour(x, z, ry, { w = 7.4, d = 6, floors = 1, c = 0xd8c8b0, door = 0x2f5f8a, roof = 0x7a4a3a } = {}) {
  const h = 3 * floors + (floors - 1) * 0.1;
  const g = group(x, 0, z, front);
  g.rotation.y = ry;
  box(w, h, d, T.siding(c), 0, h / 2, 0, g);
  const rise = 1.7, slope = rise / (d / 2), ez = d / 2 + 0.35;
  const eaveY = h - 0.35 * slope, len = Math.hypot(ez, h + rise - eaveY), ang = Math.atan2(h + rise - eaveY, ez);
  for (const s of [1, -1]) {
    const r = box(w + 0.5, 0.16, len, mat(roof, { roughness: 0.85 }), 0, (eaveY + h + rise) / 2 + 0.05, s * ez / 2, g);
    r.rotation.x = s * ang;
  }
  for (const s of [-1, 1]) {
    const tri = mesh(new THREE.BufferGeometry().setFromPoints([V(0, h, -d / 2), V(0, h, d / 2), V(0, h + rise, 0)]), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.85 }), s * w / 2, 0, 0, g);
    tri.geometry.computeVertexNormals();
  }
  box(0.55, 1.6, 0.55, mat(0x9a5a48), w / 2 - 1.3, h + 1.2, -0.9, g);
  box(0.7, 0.08, 0.7, mat(0x6b6b6b), w / 2 - 1.3, h + 2.02, -0.9, g);
  const glass = mat(0x5f86a6, { metalness: 0.3, roughness: 0.1 });
  for (let f = 0; f < floors; f++) for (const wx of f === 0 ? [-2.1, 2.1] : [-2.1, 0, 2.1]) {
    const y = 1.75 + f * 3.1;
    box(1.05, 1.15, 0.07, whitePaint, wx, y, d / 2 + 0.02, g);
    box(0.9, 1.0, 0.04, glass, wx, y, d / 2 + 0.05, g);
    box(0.04, 1.0, 0.05, whitePaint, wx, y, d / 2 + 0.07, g);
    box(0.9, 0.04, 0.05, whitePaint, wx, y, d / 2 + 0.07, g);
    box(1.2, 0.05, 0.16, whitePaint, wx, y - 0.62, d / 2 + 0.09, g);
    box(0.34, 1.1, 0.04, T.fabric(0xe9dcc6, { key: "drape", weave: 3 }), wx + 0.4, y, d / 2 + 0.08, g);
  }
  box(1.2, 2.25, 0.06, whitePaint, 0, 1.12, d / 2 + 0.02, g);
  box(1.0, 2.1, 0.07, mat(door, { roughness: 0.5 }), 0, 1.05, d / 2 + 0.06, g);
  mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass, 0.38, 1.05, d / 2 + 0.11, g);
  box(1.6, 0.12, 0.7, mat(0xc9c4ba), 0, 0.06, d / 2 + 0.38, g);
  for (const bx of [-3.2, -1.7, 1.7, 3.2]) mesh(new THREE.IcosahedronGeometry(0.4, 1), mat(LEAF_COLORS[Math.abs(Math.round(bx * 3)) % 4]), bx, 0.35, d / 2 + 0.55, g);
  return g;
}
neighbour(-14.5, FZ - 3, 0, { c: 0xe0d2c2, door: 0x8a3a2e, roof: 0x5a4a44 });
neighbour(14.5, FZ - 3, 0, { c: 0xc6d3dc, door: 0x2f6f6a, roof: 0x7a4a3a, floors: 2 });
neighbour(-12, 27, Math.PI, { c: 0xd9b8a8, door: 0x2f5f8a, roof: 0x6a5a4a, floors: 2 });
neighbour(-1, 27, Math.PI, { c: 0xb9cdb4, door: 0x8a3a2e, roof: 0x7a4a3a });
neighbour(10.5, 27, Math.PI, { c: 0xe6dcc4, door: 0x4a5a8a, roof: 0x5a4a44 });
neighbour(22, 27, Math.PI, { c: 0xd0d6dc, door: 0xb98a2f, roof: 0x6a5a4a, floors: 2 });
neighbour(-24, FZ - 3, 0, { c: 0xd9b8a8, door: 0x2f5f8a, roof: 0x6a5a4a });
neighbour(26, FZ - 3, 0, { c: 0xe6dcc4, door: 0x8a3a2e, roof: 0x5a4a44 });
// fences and lawns for the neighbours, and a long hedge along the far pavement
fence(-18.5, FY, 8.8, -Math.PI / 2);
fence(-18.5, 11.5, 13, 0);
fence(8.5, 11.5, 14.5, 0);
fence(-26, 22.5, 52, 0);
// trees: street trees, garden trees, a tree line and soft hills far away
// one small forest per tree, so the ones out of shot are skipped entirely (frustum culling) — much cheaper to render
const oneTree = (x, z, h, s) => { const f = createForest(front); f.tree(x, z, { height: h, scale: s }); f.build(); };
const oneBush = (x, z, s) => { const f = createForest(front); f.bush(x, z, s); f.build(); };
for (const [x, z, h, s] of [[7.6, 4.2, 3.4, 1.7], [-4.6, 5.0, 3.0, 1.6], [6.2, 11.0, 3.2, 1.6], [-8.5, 12.6, 3.2, 1.6], [13, 12.6, 3.4, 1.7], [-1.0, 19.6, 3.2, 1.6], [5.0, 19.8, 3.2, 1.6], [17, 19.8, 3.2, 1.6], [-15, 19.8, 3.2, 1.6]]) oneTree(x, z, h, s);
for (let i = 0; i < 5; i++) oneTree(-18 + i * 9 + rr(-1, 1), rr(34, 39), rr(3.0, 3.8), rr(1.5, 2.0)); // a tree line far behind the houses
for (let i = 0; i < 7; i++) oneBush(-5.2 + i * 1.5, 11.1, rr(0.9, 1.2)); // hedge inside the street fence (left of the gate)
for (let i = 0; i < 4; i++) oneBush(9.2 + i * 1.2, FY + 4 + i * 1.5, rr(0.9, 1.2));
for (const [x, y, z, sx, sy, sz, c] of [[-45, -1.5, 72, 55, 9, 20, 0x8aa87a], [30, -2, 78, 70, 12, 22, 0x7f9e72], [90, -1, 60, 40, 7, 18, 0x93b083]]) {
  mesh(new THREE.SphereGeometry(1, 24, 12), mat(c, { roughness: 1 }), x, y, z, front).scale.set(sx, sy, sz);
}
// The hero: the studio's cartoon dog with the big glossy puppy eyes (js/dog.js), driven through
// the same pose options as the shots use (sit, lie, side, leap, crouch, walk, run, wag, mouth...).
const DOG_SCALE = 0.7;
function heroDog(colors, key, scale = DOG_SCALE) {
  const d = createDog({ colors, key, collar: false });
  d.scale.setScalar(scale);
  const toonPose = d.pose;
  d.pose = ({
    t = 0, x = 0, y = 0, z = 0, ry = 0,
    sit = 0, lie = 0, side = 0, leap = 0, crouch = 0, beg = 0, walk = 0, run = 0,
    headPitch = 0, headYaw = 0, headTilt = 0, neck = 0, mouth = 0, ears = 0, tail = 0,
    wag = 0, wagSpeed = 14, pitch = 0, lift = 0, sideFlip = 1, paw = 0, shiver = 0,
    walkPhase, runPhase, eyes, breathe, earFlap, ...expr
  } = {}) => {
    const moving = run > 0 ? 1 : walk;
    toonPose({
      t, x, y, z, ry, sit, lie: Math.max(lie, side), rear: beg * 0.9, bow: crouch * 0.45,
      headPitch: headPitch + neck * 0.6 + crouch * 0.15, headYaw, tilt: headTilt, jawOpen: mouth,
      wag, wagSpeed, trot: run > 0 ? run : walk * 0.55, trotSpeed: run > 0 ? 24 : 9,
      earBack: Math.max(0, -ears), earUp: Math.max(0, ears), shiver, cute: 1, ...expr,
    });
    void moving;
    // leaping: forelegs reaching forward, hind legs stretched back, body level
    if (leap) {
      d.legs.fl.rotation.x = d.legs.fr.rotation.x = lerp(d.legs.fl.rotation.x, -1.25, leap);
      d.legs.bl.rotation.x = d.legs.br.rotation.x = lerp(d.legs.bl.rotation.x, 1.15, leap);
      d.ears.forEach((e, i) => (e.rotation.x = -0.9 * leap));
    }
    if (paw) d.legs.fl.rotation.x -= 1.1 * paw;
    d.tail.rotation.x += tail * 0.55;
    d.pivot.rotation.x += pitch;
    d.position.y += lift * scale;
    // lying on his side: roll over, legs out
    if (side) {
      d.rotation.z = -1.4 * side * sideFlip;
      d.position.y += 0.14 * scale * side;
      for (const k of ["fl", "fr", "bl", "br"]) d.legs[k].rotation.x = lerp(d.legs[k].rotation.x, k[0] === "f" ? -0.5 : 0.4, side);
      d.pivot.position.y = lerp(d.pivot.position.y, 0.08, side);
      d.hips.position.y = lerp(d.hips.position.y, -0.28, side);
    } else d.rotation.z = 0;
  };
  // points on the dog (names kept from the realistic rig; offsets in metres)
  const PTS = {
    Head: ["head", [0, 0.1, 0.12]], Neck2: ["neck", [0, -0.02, 0.0]], Spine1: ["pivot", [0, 0.2, 0.55]],
    Spine2: ["pivot", [0, 0.2, 0.62]], Body: ["pivot", [0, 0.2, 0.3]], Pelvis: ["pivot", [0, 0.25, 0.0]], L_Hand: ["fl", [0, -0.33, 0.05]], R_Hand: ["fr", [0, -0.33, 0.05]],
  };
  d.point = (name, off = [0, 0, 0]) => {
    const [part, base] = PTS[name] ?? ["pivot", [0, 0.2, 0.35]];
    const o = part.length === 2 ? d.legs[part] : d[part];
    d.updateMatrixWorld(true);
    return o.localToWorld(V(base[0] + off[0] / scale, base[1] + off[1] / scale, base[2] + off[2] / scale));
  };
  return d;
}

// ---------- people: hands, heads, standing, crouching, kneeling, reaching ----------
const hand = (av, side = "R") => {
  av.update();
  av.updateMatrixWorld(true);
  return av.bones?.[`Bip01_${side}_Hand`]?.getWorldPosition(V()) ?? av.position.clone().add(V(0, 0.9, 0));
};
const headOf = (av, up = 0.08, fwd = 0.08) => {
  av.update();
  av.updateMatrixWorld(true);
  const b = av.bones?.Bip01_Head;
  if (!b) return av.position.clone().add(V(0, 1.5, 0));
  const q = av.getWorldQuaternion(new THREE.Quaternion());
  return b.getWorldPosition(V()).add(V(0, up, fwd).applyQuaternion(q));
};
const local = (av, x, y, z) => {
  av.updateMatrixWorld(true);
  return av.localToWorld(V(x, y, z));
};

const walkClip = (p, time) => p.play("m_walk_neutral_01", time);
const idleClip = (p, time) => p.play("m_idle_neutral_01", time);
function stand(av, { x, z, ry, crouch = 0, head = 0.05, headYaw = 0, lean = 0 }) {
  av.resetPose();
  av.position.set(x, 0, z);
  av.rotation.set(0, ry, 0);
  const k = (av.hipHeight ?? 0.93) / 0.93;
  av.spine.rotation.x = 0.3 * crouch + lean;
  av.pelvis.rotation.x = 0.45 * crouch;
  av.pelvis.position.y = 0.93 - 0.42 * crouch * k;
  av.legL.rotation.x = av.legR.rotation.x = -1.35 * crouch;
  av.kneeL.rotation.x = av.kneeR.rotation.x = 2.2 * crouch;
  av.ankleL.rotation.x = av.ankleR.rotation.x = -0.75 * crouch;
  av.head.rotation.set(head, headYaw, 0);
  av.armR.rotation.set(-0.1, 0, 0.05);
  av.armL.rotation.set(-0.1, 0, -0.05);
  av.elbowR.rotation.set(-0.25, 0.2, 0);
  av.elbowL.rotation.set(-0.25, -0.2, 0);
}
// sitting down on the floor, knees up: s = 0 standing → 0.5 squatting → 1 sitting
function floorSit(av, s, { x, z, ry }) {
  av.resetPose();
  const k = (av.hipHeight ?? 0.93) / 0.93;
  const L1 = 0.45 * k, L2 = 0.43 * k, FOOT = 0.08 * k;
  const a1 = s < 0.5 ? lerp(0, 1.95, ease.inOut(s / 0.5)) : lerp(1.95, 2.25, ease.inOut((s - 0.5) / 0.5));
  const k1 = s < 0.5 ? lerp(0, 2.45, ease.inOut(s / 0.5)) : lerp(2.45, 1.85, ease.inOut((s - 0.5) / 0.5));
  const hip = L1 * Math.cos(a1) + L2 * Math.cos(k1 - a1) + FOOT;
  const sq = Math.min(s, 0.5);
  const aq = lerp(0, 1.95, ease.inOut(sq / 0.5)), kq = lerp(0, 2.45, ease.inOut(sq / 0.5));
  const back = L1 * Math.sin(aq) + L2 * Math.sin(aq - kq);
  av.position.set(x - Math.sin(ry) * back, 0, z - Math.cos(ry) * back);
  av.rotation.set(0, ry, 0);
  av.pelvis.position.y = 0.93 - ((av.hipHeight ?? 0.93) - Math.max(0.16 * k, hip));
  av.legL.rotation.set(-a1, 0, 0.12 * s);
  av.legR.rotation.set(-a1, 0, -0.12 * s);
  av.kneeL.rotation.x = av.kneeR.rotation.x = k1;
  av.ankleL.rotation.x = av.ankleR.rotation.x = -(a1 - k1) * 0.9;
  av.spine.rotation.x = s < 0.5 ? s * 1.1 : lerp(0.55, 0.25, (s - 0.5) / 0.5);
  av.head.rotation.x = 0.2;
  av.armL.rotation.set(-0.5 * s, 0, -0.05);
  av.armR.rotation.set(-0.5 * s, 0, 0.05);
  av.elbowL.rotation.set(-0.3 - 0.9 * s, -0.2, 0);
  av.elbowR.rotation.set(-0.3 - 0.9 * s, 0.2, 0);
}
// kneeling (sitting back on the heels)
function kneel(av, s, { x, z, ry, lean = 0.15 }) {
  av.resetPose();
  const k = (av.hipHeight ?? 0.93) / 0.93;
  av.position.set(x, 0, z);
  av.rotation.set(0, ry, 0);
  av.pelvis.position.y = 0.93 - lerp(0, 0.5, s) * k;
  av.pelvis.rotation.x = lerp(0, -0.15, s);
  av.legL.rotation.set(lerp(0, -0.35, s), 0, 0.06 * s);
  av.legR.rotation.set(lerp(0, -0.35, s), 0, -0.06 * s);
  av.kneeL.rotation.x = av.kneeR.rotation.x = lerp(0, 2.4, s);
  av.ankleL.rotation.x = av.ankleR.rotation.x = lerp(0, 0.6, s);
  av.spine.rotation.x = lean * s;
  av.head.rotation.x = 0.15;
}
// lying on the floor on her right side, knees drawn up, right arm reaching out in front
function lieSide(av, { x, z, ry, reach = 1 }) {
  av.resetPose();
  av.position.set(x, 0.13, z);
  av.rotation.set(0, ry, Math.PI / 2, "YXZ");
  av.legL.rotation.set(-0.9, 0, 0);
  av.legR.rotation.set(-0.7, 0, 0);
  av.kneeL.rotation.x = 1.5;
  av.kneeR.rotation.x = 1.3;
  av.spine.rotation.set(0.25, 0, 0);
  av.head.rotation.set(0.25, 0, 0.2);
  av.armR.rotation.set(-1.4 * reach, 0, 0.1);
  av.elbowR.rotation.set(-0.25, 0.3, 0);
  av.armL.rotation.set(-0.9, 0, -0.3);
  av.elbowL.rotation.set(-1.6, -0.3, 0);
}
// reach: nudge a few joints until the hand touches `target` (coordinate descent, deterministic)
const _hp = new THREE.Vector3();
function reachTo(av, side, target, joints, iters = 28) {
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
const ARM_R = [["armR", "x", -2.6, 0.5], ["armR", "y", -1.3, 1.3], ["armR", "z", -1.5, 1.2], ["elbowR", "x", -2.5, 0]];
const ARM_L = [["armL", "x", -2.6, 0.5], ["armL", "y", -1.3, 1.3], ["armL", "z", -1.2, 1.5], ["elbowL", "x", -2.5, 0]];
const both = (av, l, r) => {
  reachTo(av, "L", l, ARM_L);
  reachTo(av, "R", r, ARM_R);
};
// hands up to her mouth (scared) / to her eyes (crying)

// ---------- the dog ----------
const dog = heroDog(DOG_COLORS.golden, "hero");
scene.add(dog);
// glossy pupils mirror a bright room as white from some angles: keep them dark and wet-looking
for (const e of dog.eyes) for (const k of ["pupil", "iris"]) {
  e[k].material = e[k].material.clone();
  e[k].material.color.setHex(k === "pupil" ? 0x080403 : 0x2a1408);
  e[k].material.roughness = 0.22;
  e[k].material.envMapIntensity = 0.25;
}

// ---------- daylight: sun through the front door and the windows ----------
const LIGHTS = [hemi, sun, moonLight, roomLamp, hallLamp, sofaLamp, streetLamp, fill, fill2, flashLight, nightLight];
function setDay({ exposure = 1.05 } = {}) {
  for (const l of LIGHTS) l.visible = false;
  hemi.visible = sun.visible = warmFill.visible = true;
  renderer.toneMappingExposure = exposure;
  scene.fog = null;
  moon.visible = false;
  skyMat.map = skyDay;
  scene.background = new THREE.Color(0xbcd6ee);
  hemi.color.set(0xfff4e6);
  hemi.groundColor.set(0x6b5a48);
  hemi.intensity = 1.9;
  sun.intensity = 4.0;
  sun.position.set(7, 9, 9);
  sun.target.position.set(0, 0, -1);
  scene.environmentIntensity = 0.6;
  renderer.domElement.style.filter = "saturate(1.08) contrast(1.03)";
}

// ---------- camera helper ----------
const _up = new THREE.Vector3(0, 1, 0);
function cam(pos, target, fov = 44) {
  if (Math.abs(camera.fov - fov) > 1e-6) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.copy(pos);
  camera.up.copy(_up);
  camera.lookAt(target);
}

// ---------- you: the owner who comes home ----------
const owner = loadAvatar(short, "Male_Adult_08");
owner.loadClip("m_walk_neutral_01");
scene.add(owner);

// ---------- on-screen labels: a few, big and calm ----------
const labelsEl = document.getElementById("labels");
const tags = new Map();
let shown = new Set();
// a pill at (x, y) px from time t0 to t1; it fades in softly and out at the end
function tag(id, html, t, t0, t1, x, y, cls = "") {
  if (t < t0 || t > t1) return;
  let el = tags.get(id);
  if (!el) {
    el = document.createElement("div");
    labelsEl.appendChild(el);
    tags.set(id, el);
  }
  if (el.dataset.html !== html) {
    el.innerHTML = html;
    el.dataset.html = html;
  }
  el.className = "tag " + cls;
  shown.add(id);
  const pin = ease.out(prog(t, t0, t0 + 0.35));
  const out = 1 - prog(t, t1 - 0.25, t1);
  el.style.display = "block";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.opacity = String(pin * out);
  el.style.transform = `translate(-50%, -50%) scale(${0.92 + 0.08 * pin})`;
}
function hideUnusedTags() {
  for (const [id, el] of tags) if (!shown.has(id)) el.style.display = "none";
  shown = new Set();
}

// ---------- places ----------
const DOOR_IN = { x: 2.0, z: 3.4 };      // you, outside the front door
const HALL = { x: 2.0, z: 2.4 };         // just inside it
const OWNER_POS = { x: 1.75, z: 1.7 };   // where you stop, crouch and kneel
const HOME = { x: 1.25, z: 1.65 };       // his spot beside you: waiting, greeting, bouncing
const REST = { x: 1.25, z: 0.6 };        // the calm day: lying on the rug, face to the camera
const LIE_RY = -1.6;                       // lying by the door: head toward the camera, sad eyes in view
const RY_WAIT = Math.atan2(2.0 - HOME.x, 2.67 - HOME.z);        // facing the front door
const RY_OWNER = Math.atan2(OWNER_POS.x - HOME.x, OWNER_POS.z - HOME.z); // facing you
const RY_CAM = Math.atan2(-1.2 - HOME.x, -2.4 - HOME.z);        // facing the room camera
const OWN_RY = Math.atan2(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z);   // you, facing him
const mixXZ = (a, b, p) => ({ x: lerp(a.x, b.x, p), z: lerp(a.z, b.z, p) });
const headingTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const spin = (t, t0) => 2 * Math.PI * (t - t0); // one full turn per second

// paths you walk along; heading follows the path, and the walk cycle follows the distance
function makePath(pts) {
  const seg = [];
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x, dz = pts[i + 1].z - pts[i].z, l = Math.hypot(dx, dz);
    seg.push({ a: pts[i], dx, dz, l, s: len });
    len += l;
  }
  const at = (d) => {
    d = Math.max(0, Math.min(len, d));
    const s = seg.find((q) => d <= q.s + q.l) ?? seg.at(-1);
    const u = (d - s.s) / s.l;
    return { x: s.a.x + s.dx * u, z: s.a.z + s.dz * u };
  };
  const heading = (d) => {
    const p = at(d), q = at(d + 0.4);
    if (Math.hypot(q.x - p.x, q.z - p.z) > 1e-3) return Math.atan2(q.x - p.x, q.z - p.z);
    const r = at(d - 0.4);
    return Math.atan2(p.x - r.x, p.z - r.z);
  };
  return { len, at, heading };
}
const IN_PATH = makePath([DOOR_IN, HALL, OWNER_POS]);
const OUT_PATH = makePath([OWNER_POS, HALL, { x: 2.0, z: 4.1 }]);
const AWAY_PATH = makePath([OWNER_POS, { x: 1.2, z: 1.2 }, { x: -1.4, z: 1.2 }]);
const BACK_PATH = makePath([{ x: -0.3, z: 1.2 }, { x: 1.5, z: 1.2 }, { x: 2.0, z: 2.5 }, { x: 2.0, z: 4.1 }]);
function walkPose(path, t0, t, speed, ry0 = null) {
  const d = (t - t0) * speed;
  const p = path.at(d);
  let ry = path.heading(d);
  if (ry0 !== null) {
    const diff = Math.atan2(Math.sin(ry - ry0), Math.cos(ry - ry0));
    ry = ry0 + diff * ease.inOut(prog(t, t0, t0 + 0.5));
  }
  return { show: true, mode: "walk", x: p.x, z: p.z, ry, phase: d / 1.25 };
}
// one visit: in through the door, crouch (or kneel) beside him, pet him, stand, and leave
function visit(t, t0, { spd = 1.3, hold, kneelDown = false, leave = OUT_PATH, outSpd = 1.4, welcomeUntil = 0 }) {
  if (t < t0) return null;
  const ta = t0 + IN_PATH.len / spd, tc = ta + 0.5, ts = hold + 0.5;
  if (t < ta) return walkPose(IN_PATH, t0, t, spd);
  const mode = kneelDown ? "kneel" : "crouch";
  const base = { show: true, mode, x: OWNER_POS.x, z: OWNER_POS.z };
  if (t < tc) {
    const p = ease.inOut(prog(t, ta, tc));
    return { ...base, ry: lerp(Math.PI, OWN_RY + 2 * Math.PI, p), s: p, welcome: false, pet: false };
  }
  if (t < hold) return { ...base, ry: OWN_RY + 2 * Math.PI, s: 1, welcome: t < welcomeUntil, pet: t >= welcomeUntil };
  if (t < ts) return { ...base, ry: OWN_RY + 2 * Math.PI, s: 1 - ease.inOut(prog(t, hold, ts)), welcome: false, pet: false };
  if (t < ts + leave.len / outSpd) return walkPose(leave, ts, t, outSpd, OWN_RY);
  return null;
}
// you, the whole way through: three visits and one walk to the door
function ownerState(t) {
  if (t < 1.2) return { show: true, mode: "stand", x: DOOR_IN.x, z: DOOR_IN.z, ry: Math.PI };
  let v;
  if ((v = visit(t, 1.2, { spd: 1.25, hold: 5.4, leave: AWAY_PATH, outSpd: 1.25 }))) return v;
  if (t >= 10.0 && t < 10.0 + BACK_PATH.len / 1.5) return walkPose(BACK_PATH, 10.0, t, 1.5);
  if ((v = visit(t, 17.0, { spd: 1.4, hold: 19.2 }))) return v;
  if ((v = visit(t, 22.6, { spd: 1.3, hold: 30.0, kneelDown: true, welcomeUntil: 26.4 }))) return v;
  return { show: false };
}

// ---------- the dog's whole performance: one timeline, keyed to the words ----------
const CIRC_END = Math.atan2(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z) + 2 * Math.PI + Math.PI / 2; // heading when the first circle ends
function dogState(t) {
  const s = { t, x: HOME.x, y: 0, z: HOME.z, ry: RY_WAIT, cute: 1, wag: 0.5, wagSpeed: 12, ears: 0.2, sad: 0.2 };
  // zoomies: running circles round you; the circle starts wherever he is and ends beside you
  const circle = (a0, a1, r0, r1, p) => {
    const a = lerp(a0, a1, ease.inOut(p)), r = lerp(r0, r1, ease.out(Math.min(1, p * 2)));
    return { x: OWNER_POS.x + r * Math.sin(a), z: OWNER_POS.z + r * Math.cos(a), ry: a + Math.PI / 2 };
  };
  const LOOK = 0.9;                                                                               // he glances back toward the camera while he waits
  if (t < 1.0) return { ...s, sit: 1, headYaw: LOOK * (1 - ease.inOut(prog(t, 0.55, 1.0))), headTilt: 0.12 * (1 - prog(t, 0.55, 1.0)) }; // waiting for the key
  if (t < 1.5) return { ...s, sit: 1 - ease.out(prog(t, 1.0, 1.3)), ears: 0.8, wag: 1, wagSpeed: 16 }; // the door opens
  if (t < 2.6) {                                                                                  // bursts toward the doorway
    const p = ease.out(prog(t, 1.5, 2.6));
    return { ...s, ...mixXZ(HOME, { x: 1.55, z: 2.1 }, p), ry: lerp(RY_WAIT, 0.5, p), run: 1, wag: 1, wagSpeed: 24, ears: 0.6 };
  }
  if (t < 4.2) {                                                                                  // zoomies round you
    const a0 = Math.atan2(1.55 - OWNER_POS.x, 2.1 - OWNER_POS.z), a1 = Math.atan2(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z) + 2 * Math.PI;
    const c = circle(a0, a1, Math.hypot(1.55 - OWNER_POS.x, 2.1 - OWNER_POS.z), Math.hypot(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z), prog(t, 2.6, 4.2));
    return { ...s, ...c, ry: lerp(0.5, c.ry, ease.out(prog(t, 2.6, 3.0))), run: 1, wag: 1, wagSpeed: 26, ears: 0.3 };
  }
  if (t < 5.9) return { ...s, ry: lerp(CIRC_END, RY_OWNER + 2 * Math.PI, ease.inOut(prog(t, 4.2, 4.8))), sit: 1, wag: 1, wagSpeed: 18, headPitch: -0.35, headTilt: 0.12 * Math.sin(t * 5), ears: 0.5 }; // beside you, being petted
  if (t < 8.0) {                                                                                  // "some days he goes crazy": bouncing and spinning
    const hop = Math.abs(Math.sin((t - 5.9) * Math.PI * 2.4));
    return { ...s, ry: RY_OWNER + 4 * Math.PI * ease.inOut(prog(t, 5.9, 8.0)), leap: 0.7 * hop, y: 0.1 * hop, run: 0.4, wag: 1, wagSpeed: 28, ears: 0.7 };
  }
  if (t < 9.0) {                                                                                  // "and some days he barely gets up": a slow walk to the rug
    const p = ease.inOut(prog(t, 8.0, 9.0));
    return { ...s, ...mixXZ(HOME, REST, p), ry: lerp(RY_OWNER + 2 * Math.PI, headingTo(HOME, REST) + 2 * Math.PI, ease.inOut(prog(t, 8.0, 8.4))), walk: 0.6, wag: 0.3, ears: 0 };
  }
  if (t < 10.4) {                                                                                 // lies down, lifts his head once, one slow tail wag
    const up = ease.inOut(prog(t, 9.8, 10.2));
    return { ...s, ...REST, ry: headingTo(HOME, REST) + 2 * Math.PI, lie: ease.inOut(prog(t, 9.0, 9.4)), headPitch: lerp(0.4, -0.15, up), tail: 0.4, wag: 0.5 * prog(t, 9.9, 10.1) * (1 - prog(t, 10.2, 10.4)), wagSpeed: 8, ears: -0.1 };
  }
  if (t < 11.9) {                                                                                 // gets up and goes to sit near the door
    const p = ease.inOut(prog(t, 10.6, 11.9));
    return { ...s, ...mixXZ(REST, HOME, p), ry: lerp(headingTo(HOME, REST) + 2 * Math.PI, RY_WAIT + 2 * Math.PI, p), lie: 1 - ease.out(prog(t, 10.4, 10.7)), walk: 0.6 * prog(t, 10.6, 10.8) * (1 - prog(t, 11.6, 11.9)), wag: 0.3, ears: 0.3 };
  }
  if (t < 14.6) return { ...s, sit: 1, headPitch: -0.1 - 0.05 * prog(t, 13.4, 13.8), sad: 0.4, wag: 0.25, wagSpeed: 8, ears: 0.6 }; // watching the closed door
  if (t < 16.9) return { ...s, ry: lerp(RY_WAIT, LIE_RY, ease.inOut(prog(t, 14.6, 15.5))), lie: ease.inOut(prog(t, 14.6, 15.0)), headPitch: 0.4, sad: 0.6, wag: 0.1, ears: -0.2 };       // 30 minutes: lying by the door
  if (t < 19.2) {                                                                                  // the door opens: up, happy but calm; turns to you
    const turn = ease.inOut(prog(t, 17.3, 18.3));
    return { ...s, ry: lerp(LIE_RY, RY_OWNER, ease.inOut(prog(t, 16.9, 18.3))), lie: 1 - ease.out(prog(t, 16.9, 17.2)), sit: ease.out(prog(t, 17.2, 17.5)), wag: 0.4 + 0.6 * prog(t, 16.9, 17.2) * (1 - prog(t, 17.4, 17.8)), wagSpeed: 12, ears: 0.4, headPitch: -0.1 };
  }
  if (t < 20.9) return { ...s, sit: 1, ry: lerp(RY_OWNER, RY_WAIT, ease.inOut(prog(t, 19.5, 20.2))), wag: 0.3, wagSpeed: 8, ears: 0.4, sad: 0.4 }; // watches you leave
  if (t < 22.3) return { ...s, ry: lerp(RY_WAIT, LIE_RY, ease.inOut(prog(t, 20.9, 21.7))), lie: ease.inOut(prog(t, 20.9, 21.4)), headPitch: 0.4, sad: 0.6, wag: 0.05, ears: -0.2 };       // 2 hours: lying by the door
  if (t < 22.6) return { ...s, ry: lerp(LIE_RY, RY_WAIT, ease.inOut(prog(t, 22.3, 22.6))), lie: 1 - ease.out(prog(t, 22.3, 22.5)), ears: 0.9, headPitch: -0.1, wag: 0.6, wagSpeed: 14 };   // he hears the key
  if (t < 24.4) {                                                                                  // the reunion: two full circles round you
    const a0 = Math.atan2(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z);
    const r = Math.hypot(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z);
    const c = circle(a0, a0 + 4 * Math.PI, r, r, prog(t, 22.6, 24.4));
    return { ...s, ...c, ry: lerp(RY_WAIT, c.ry, ease.out(prog(t, 22.6, 22.9))), run: 1, wag: 1, wagSpeed: 28, ears: 0.2 };
  }
  if (t < 26.4) {                                                                                  // "Jumping. Spinning. Tails going wild."
    const hop = Math.abs(Math.sin((t - 24.4) * Math.PI / 0.6));
    const base = Math.atan2(HOME.x - OWNER_POS.x, HOME.z - OWNER_POS.z) + Math.PI / 2 + 4 * Math.PI; // where the circle ended
    const delta = Math.atan2(Math.sin(RY_CAM - base), Math.cos(RY_CAM - base)) + 4 * Math.PI;
    return { ...s, ry: base + delta * ease.inOut(prog(t, 24.4, 26.4)), leap: 0.7 * hop, y: 0.2 * hop, run: 0.3, wag: 1, wagSpeed: 32, ears: -0.4 };
  }
  if (t < 31.8) return { ...s, ry: RY_CAM, sit: 1, sad: 0.7 + 0.2 * prog(t, 28.8, 29.5), headTilt: 0.15 * prog(t, 28.8, 29.5), headPitch: -0.05, wag: 0.4, wagSpeed: 6, ears: 0.2 }; // sits and looks up
  if (t < 33.0) return { ...s, sit: 1, ry: lerp(RY_CAM, RY_WAIT, ease.inOut(prog(t, 31.8, 33.0))), wag: 0.4, wagSpeed: 8, ears: 0.4 };                // watches you go
  return { ...s, sit: 1, headYaw: LOOK * ease.inOut(prog(t, 33.4, 34.6)), headTilt: 0.12 * prog(t, 33.4, 34.6) };   // waiting again, so the video loops
}

// the front door: closed; opened for you; closed; opened; closed; opened for the reunion; closed at the end
function doorAt(t) {
  const ramp = (a, b) => ease.inOut(prog(t, a, b));
  if (t < 1.0) return 0;
  if (t < 12.9) return ramp(1.0, 1.5);
  if (t < 13.3) return 1 - ramp(12.9, 13.3);
  if (t < 16.9) return 0;
  if (t < 20.7) return ramp(16.9, 17.3);
  if (t < 21.1) return 1 - ramp(20.7, 21.1);
  if (t < 22.5) return 0;
  if (t < 31.5) return ramp(22.5, 22.9);
  if (t < 31.9) return 1 - ramp(31.5, 31.9);
  return 0;
}

// ---------- you: apply the owner's pose for this frame ----------
function applyOwner(t) {
  const o = ownerState(t);
  if (!o.show) {
    owner.resetPose();
    owner.position.set(0, -80, 0);
    return;
  }
  if (o.mode === "walk") {
    owner.resetPose(); // clear the head/limb handles left by the last standing pose, so a frame never depends on the one before
    owner.position.set(o.x, 0, o.z);
    owner.rotation.set(0, o.ry, 0);
    walkClip(owner, o.phase);
  } else if (o.mode === "stand") {
    stand(owner, { x: o.x, z: o.z, ry: o.ry, head: 0.05 });
  } else {
    if (o.mode === "kneel") kneel(owner, o.s, { x: o.x, z: o.z, ry: o.ry, lean: 0.3 });
    else stand(owner, { x: o.x, z: o.z, ry: o.ry, crouch: 0.8 * o.s, head: 0.3 });
    if (o.pet) {
      const head = dog.point("Head", [0, 0.1, 0]);
      reachTo(owner, "R", head.add(V(0, 0.03 + 0.02 * Math.sin(t * 6), 0)), ARM_R);
    } else if (o.welcome) {
      both(owner, local(owner, 0.34, 0.5, 0.5), local(owner, -0.34, 0.5, 0.5)); // arms open: come here!
    }
  }
}

// ---------- the camera: ONE smooth track through timed keys (velocity is continuous, nothing jerks) ----------
// a close-up in front of his face, at his eye level: he faces the room camera, so the camera is on his line of sight
function closeCam(dist) {
  const F = V(Math.sin(RY_CAM), 0, Math.cos(RY_CAM));
  return { p: [HOME.x + F.x * dist, 0.74, HOME.z + F.z * dist], l: [HOME.x + F.x * 0.3, 0.56, HOME.z + F.z * 0.3] };
}
const near1 = closeCam(1.65), near2 = closeCam(1.45);
// [time, camera position, look-at point, field of view]
const KEYS = [
  [0.0, [-1.1, 1.8, -1.9], [1.7, 0.95, 1.7], 56],    // wide: the whole entry, the door in the middle
  [6.0, [-0.9, 1.75, -1.6], [1.6, 0.8, 1.5], 56],      // a slow push-in while you greet him
  [10.6, [-0.6, 1.7, -1.3], [1.4, 0.65, 1.3], 56],
  [24.0, [-0.2, 1.65, -0.9], [1.5, 0.6, 1.5], 54],     // the study: a long, slow drift
  [26.6, [0.3, 1.3, 0.0], [1.2, 0.55, 1.55], 50],    // glide down toward him...
  [28.2, [...near1.p], [...near1.l], 44],             // ...into a close-up at eye level
  [31.0, [...near2.p], [...near2.l], 44],
  [33.2, [0.0, 1.4, -0.7], [1.4, 0.7, 1.5], 52],      // and back out again
  [35.4, [-1.1, 1.8, -1.9], [1.7, 0.95, 1.7], 56],    // the first frame again, so it loops
];
const KV = KEYS.map((k) => [...k[1], ...k[2], k[3]]);
function track(t) {
  let i = KEYS.findIndex((k) => t < k[0]);
  i = i < 0 ? KEYS.length - 1 : Math.max(1, i);
  const t0 = KEYS[i - 1][0], t1 = KEYS[i][0], dt = t1 - t0;
  const s = clamp01((t - t0) / dt);
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
  return KV[i].map((_, j) => {
    const m0 = i > 1 ? (KV[i][j] - KV[i - 2][j]) / (t1 - KEYS[i - 2][0]) : 0;
    const m1 = i < KEYS.length - 1 ? (KV[i + 1][j] - KV[i - 1][j]) / (KEYS[i + 1][0] - t0) : 0;
    return h00 * KV[i - 1][j] + h10 * dt * m0 + h01 * KV[i][j] + h11 * dt * m1;
  });
}

// ---------- labels: only a few, big and calm ----------
function labels(t) {
  tag("crazy", "😜 CRAZY DAY", t, 5.9, 8.0, 540, 400, "yellow");
  tag("calm", "😴 CALM DAY", t, 8.1, 10.4, 540, 400, "yellow");
  tag("rec", '<span class="dot"></span>REC', t, 10.8, 26.4, 170, 230, "red");
  tag("t30", "⏱ 30 MIN", t, 16.1, 19.3, 540, 400, "yellow");
  tag("t2h", "⏱ 2 HOURS", t, 20.6, 25.5, 540, 400, "yellow");
}

// ---------- sound: real recordings (see sfx/CREDITS.md) ----------
const sfx = createSfx(short);
sfx.loop(0, DURATION, "birds_2", { gain: 0.2, fadeIn: 0.2, fadeOut: 0.6 });
for (const t of [1.0, 16.9, 22.5]) sfx.add(t, "gate", { gain: 0.8 });           // the door opens
for (const t of [12.9, 20.7, 31.5]) sfx.add(t, "gate", { gain: 0.6, rate: 1.05 }); // and closes
// your footsteps on the wood
for (const [a, b] of [[1.2, 2.6], [5.9, 8.6], [10.0, 12.7], [17.0, 18.25], [19.7, 21.4], [22.6, 23.95], [30.5, 32.2]]) {
  sfx.loop(a, b, "steps_wood", { gain: 0.5, fadeIn: 0.05, fadeOut: 0.1 });
}
// his paws: the burst, the zoomies, the hops, the slow walk, the reunion
for (const [a, b, g] of [[1.5, 2.6, 0.45], [2.6, 4.2, 0.5], [5.9, 8.0, 0.25], [8.0, 9.0, 0.2], [10.6, 11.9, 0.2], [22.6, 24.4, 0.55], [24.4, 26.4, 0.4]]) {
  sfx.loop(a, b, "steps_wood", { gain: g, rate: 1.25, fadeIn: 0.02, fadeOut: 0.05 });
}
// barks: the excited ones at each reunion
sfx.add(1.5, "bark_1", { gain: 0.85 });
sfx.add(3.0, "bark_2", { gain: 0.6 });
sfx.add(6.3, "bark_2", { gain: 0.5, rate: 1.1 });
sfx.add(22.7, "bark_3", { gain: 0.8 });
sfx.add(23.5, "bark_2", { gain: 0.8 });
sfx.add(24.6, "bark_3", { gain: 0.7, rate: 1.1 });
sfx.add(25.5, "bark_2", { gain: 0.5, rate: 1.15 });
// the wait: a clock ticking, two whimpers; and your laugh when he goes wild
sfx.loop(12.9, 22.5, "clock", { gain: 0.25, fadeIn: 0.3, fadeOut: 0.3 });
sfx.add(13.6, "whimper", { gain: 0.35, dur: 1.2, fadeOut: 0.5 });
sfx.add(21.7, "whimper", { gain: 0.4, dur: 1.4, fadeOut: 0.5 });
sfx.add(24.6, "giggle", { gain: 0.3, dur: 1.6, fadeOut: 0.5 });

// ---------- overlays: a soft film grain and a light vignette, nothing flashy ----------
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 }) // short lines: 76 px type fits about 21 characters;
const grainEl = document.getElementById("grain");
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
grainEl.style.opacity = "0.03";
document.getElementById("vignette").style.opacity = "0.3";

// ---------- speed: once everything has loaded, fuse the static scenery into a few meshes per material ----------
// (the house, the garden and the street are hundreds of tiny meshes; one draw call each is what makes a frame slow)
let fused = false;
function fuseStatic(roots, skip) {
  scene.updateMatrixWorld(true);
  const buckets = new Map(), meshes = [];
  for (const root of roots) {
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      for (let p = o; p; p = p.parent) if (skip.includes(p) || p.visible === false) return;
      const g = o.geometry;
      if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
      const attrs = Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}${g.attributes[k].normalized ? "n" : ""}`).join(",");
      const key = [o.material.uuid, o.castShadow, o.receiveShadow, g.index ? "i" : "n", attrs].join("|");
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
      meshes.push(o);
    });
  }
  let before = 0, after = 0;
  for (const list of buckets.values()) {
    before += list.length;
    if (list.length < 2) { after += 1; continue; }
    const geos = list.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld));
    const merged = mergeGeometries(geos, false);
    if (!merged) { after += list.length; continue; }
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow;
    m.receiveShadow = list[0].receiveShadow;
    scene.add(m);
    for (const o of list) o.removeFromParent();
    after += 1;
  }
  console.log(`fused ${before} meshes into ${after}`);
}

// ---------- frame ----------
onUpdate((t) => {
  if (!fused) {
    fused = true;
    // real glass (transmission) re-renders the whole scene for every frame: swap it for a plain translucent look
    scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.transmission > 0) Object.assign(m, { transmission: 0, transparent: true, opacity: 0.3, depthWrite: false, needsUpdate: true });
      }
    });
    // image-based lighting is the priciest part of every pixel: keep it for the shiny metals only, and let the
    // hemisphere light (a little stronger, see setDay) fill in everywhere else
    const ENV = scene.environment;
    scene.environment = null;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.metalness > 0.4 && !m.envMap) Object.assign(m, { envMap: ENV, envMapIntensity: 0.6, needsUpdate: true });
      }
    });
    fuseStatic([house, yard, front], [frontDoor]);
  }
  t = Math.min(t, DURATION - 1e-6);
  owner.traverse((o) => o.isLight && (o.visible = false)); // the character file carries its own ambient light
  setDay({ exposure: 1.1 });
  frontDoorAngle(doorAt(t));
  dog.pose(dogState(t));
  applyOwner(t);
  owner.update();
  const k = window.__cam ?? track(t); // (a debug override for test shots)
  cam(V(k[0], k[1], k[2]), V(k[3], k[4], k[5]), k[6]);
  labels(t);
  hideUnusedTags();
  captions(t);
});

window.__dbg = { scene, camera, renderer, dog, owner, frontDoor, C, track };
short.start();
