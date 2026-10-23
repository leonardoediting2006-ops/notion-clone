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

// "Why your dog yawns when you yawn" — one room, one camera, 60 fps, built to loop.
// The camera starts as YOUR eyes (the dog is watching you), you yawn, he yawns back, the numbers appear as simple
// cards, and the camera glides back into your eyes on the last words so the video repeats with no seam.
// Every action is keyed to a word of voiceover.srt; shots are pure functions of time.

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
const DURATION = Math.ceil((END + 0.1) * FPS) / FPS; // no tail after the last word: the voice runs on into the first line

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
  watch: at("watch"), yawn1: at("yawn"), him: at("him"), yawn2: at("yawn", 2), back: at("back"),
  contagious: at("contagious"), dogs1: at("dogs"), scientists: at("scientists"), tested: at("tested"),
  n29: at("29"), person: at("person"), n21: at("21"), yawned2: at("yawned", 2), too: at("too"),
  but: at("but"), opened: at("opened"), mouth: at("mouth"), one: at("one"), did: at("did"),
  another: at("another"), owner: at("owner"), yawned4: at("yawned", 4), stranger: at("stranger"), did2: at("did", 2),
  researchers: at("researchers"), sign: at("sign"), empathy: at("empathy"), so: at("so"), yawn3: at("yawn", 3),
};
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
floorPlane(3.2, 2.4, M.rug, 1.2, 0.008, -0.55, house);
// ---- living area: sofa on the right wall, cushions, a throw, a coffee table, an armchair, lamps
place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.3 }), 2.78, 0, -0.55, -Math.PI / 2);
for (const [z, c, r] of [[-1.4, 0xd98a4a, 0.15], [0.3, 0xe8d8bd, 0.2]]) { // cushions at the two ends: you sit in the middle
  const cu = place(cushion({ color: c }), 3.0, 0.62, z, -Math.PI / 2);
  cu.rotation.set(0.25, -Math.PI / 2, r);
}
place(coffeeTable(), 0.45, 0, -0.55, Math.PI / 2);
place(loadProp(short, "GlassVaseFlowers", { height: 0.34 }), 0.45, 0.42, -0.55);
box(0.28, 0.04, 0.2, mat(0x8a3a2e), 0.4, 0.43, -0.2, house).rotation.y = 0.3;
box(0.26, 0.03, 0.19, mat(0x2f6f6a), 0.4, 0.465, -0.2, house).rotation.y = 0.5;
mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16), mat(0xf2efe6, { roughness: 0.3 }), 0.5, 0.46, -0.85, house);
place(loadProp(short, "SheenChair", { height: 0.95 }), -1.4, 0, -1.0, Math.PI / 2);              // armchair in the far corner
{
  const g = group(0.25, 0, -1.45, house);
  mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 28), wood2, 0, 0.55, 0, g);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.53, 10), wood2, 0, 0.27, 0, g);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), wood2, 0, 0.04, 0, g);
}
tableLamp(0.25, 0.57, -1.45);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.3 }), 3.0, 0, -3.4);
// framed pictures above the sofa, a clock over the door
place(wallArt({ w: 0.7, h: 0.5, style: "landscape", seed: 2 }), RX - 0.02, 1.8, -1.2, -Math.PI / 2);
place(wallArt({ w: 0.45, h: 0.6, style: "sunset", seed: 5 }), RX - 0.02, 1.8, -0.55, -Math.PI / 2);
place(wallArt({ w: 0.5, h: 0.4, style: "abstract", seed: 4 }), RX - 0.02, 1.8, 0.08, -Math.PI / 2);
place(wallClock({ hours: 8.3 }), 2.0, 2.4, FZ - 0.06, Math.PI);
// a pendant lamp over the coffee table, and a ceiling light by the door
{
  const g = group(0.45, 0, -0.55, house);
  box(0.012, 0.6, 0.012, mat(0x222222), 0, H - 0.3, 0, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.3, 0.26, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1dc, side: THREE.DoubleSide }), 0, H - 0.72, 0, g);
  mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9bd }), 0, H - 0.78, 0, g);
}
mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0xfff1dc }), 1.8, H - 0.02, 1.6, house);
box(6.5, 0.08, 0.08, M.trim, 0, H - 0.04, FZ - 0.05, house); // crown moulding on the front wall

// ---- the back wall behind the sofa scene: bookshelf, gallery wall, a console with a lamp and plant
place(bookshelf({ w: 1.15, h: 1.95, seed: 9 }), 0.3, 0, BZ + 0.22, 0);
place(wallArt({ w: 0.5, h: 0.65, style: "sunset", seed: 21 }), -0.95, 1.55, BZ + 0.08, 0);
place(wallArt({ w: 0.7, h: 0.5, style: "landscape", seed: 8 }), -1.7, 1.75, BZ + 0.08, 0);
place(wallArt({ w: 0.4, h: 0.4, style: "abstract", seed: 3 }), -1.7, 1.2, BZ + 0.08, 0);
{
  const cx = 2.62, cz = BZ + 0.25;
  box(0.9, 0.05, 0.34, wood2, cx, 0.74, cz, house);
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.13, 0.13]) box(0.05, 0.72, 0.05, wood2, cx + sx, 0.37, cz + sz, house);
  tableLamp(cx - 0.25, 0.765, cz);
  place(loadProp(short, "GlassVaseFlowers", { height: 0.3 }), cx + 0.22, 0.765, cz);
  for (const [x, h, r] of [[-0.02, 0.2, 0.1], [0.1, 0.16, -0.1]]) box(0.14, h, 0.02, mat(0x2a1d14), cx + x, 0.765 + h / 2, cz - 0.1, house).rotation.y = r;
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


// ================= THE PARK CORNER: two benches in the back yard, flowers, a lamp, a bowl and a ball =================
const PARK = { z: -8.0 };
{
  const darkIron = mat(0x2b2f33, { metalness: 0.5, roughness: 0.5 });
  const slat = T.paintedWood(0x9a6b3f);
  const bench = (x, z) => {
    const g = group(x, 0, z, yard);
    for (let i = 0; i < 5; i++) box(1.7, 0.035, 0.075, slat, 0, 0.45, -0.17 + i * 0.085, g);        // seat
    for (let i = 0; i < 3; i++) { const b = box(1.7, 0.09, 0.03, slat, 0, 0.66 + i * 0.12, -0.22 - i * 0.02, g); b.rotation.x = -0.12; }  // back
    for (const sx of [-0.8, 0.8]) {
      box(0.05, 0.46, 0.5, darkIron, sx, 0.23, 0, g);
      box(0.05, 0.05, 0.44, darkIron, sx, 0.62, 0, g);
      box(0.05, 0.45, 0.05, darkIron, sx, 0.62, -0.24, g);
    }
    return g;
  };
  bench(-1.35, PARK.z - 0.05);
  bench(1.35, PARK.z - 0.05);
  // a gravel patch under the benches and a path
  floorPlane(5.2, 2.6, mat(0xcfc3a8, { roughness: 1 }), 0, 0.006, PARK.z, yard);
  floorPlane(1.0, 4.2, mat(0xcfc3a8, { roughness: 1 }), 0, 0.006, PARK.z + 3.4, yard);
  for (let i = 0; i < 70; i++) mesh(new THREE.IcosahedronGeometry(rr(0.015, 0.03), 0), mat(0xa89a7e), rr(-2.5, 2.5), 0.012, PARK.z + rr(-1.2, 1.2), yard);
  // a water bowl, a ball and a little bag at the bench
  mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.06, 20), M.steel, 0.55, 0.03, PARK.z + 0.45, yard);
  mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 20), new THREE.MeshStandardMaterial({ color: 0x7fb4d4, roughness: 0.05 }), 0.55, 0.055, PARK.z + 0.45, yard);
  place(tennisBall(), -0.62, 0.034, PARK.z + 0.55, 0, yard);
  // lamp post and a bin
  { const g = group(-3.1, 0, PARK.z - 1.2, yard);
    box(0.08, 3.0, 0.08, darkIron, 0, 1.5, 0, g);
    mesh(new THREE.SphereGeometry(0.17, 16, 12), mat(0xfff3d6, { roughness: 0.3, emissive: 0xffe9b0, emissiveIntensity: 0.4 }), 0, 3.1, 0, g);
    box(0.28, 0.05, 0.28, darkIron, 0, 3.25, 0, g);
  }
  { const g = group(3.0, 0, PARK.z - 0.2, yard);
    mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.7, 18), mat(0x3d6b4a, { roughness: 0.6 }), 0, 0.35, 0, g);
    mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 18), darkIron, 0, 0.72, 0, g);
  }
  // flower beds along the fence and some bushes
  const dummy2 = new THREE.Object3D();
  const bloom = [0xe84a6a, 0xf2c94c, 0xffffff, 0xb36ad9, 0xff8a3d];
  for (const [x0, x1] of [[-6.2, -1.2], [1.2, 6.2]]) {
    const w = x1 - x0, cx = (x0 + x1) / 2, z = -10.2;
    floorPlane(w, 0.9, mat(0x4a3424), cx, 0.05, z, yard);
    box(w + 0.1, 0.12, 0.07, mat(0x9a9185), cx, 0.06, z + 0.48, yard);
    const n = 46;
    const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff, { roughness: 0.9 }), n);
    const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffffff, { roughness: 0.6 }), n * 2);
    for (let i = 0; i < n; i++) {
      const px = rr(x0 + 0.1, x1 - 0.1), pz = rr(z - 0.35, z + 0.35), r = rr(0.1, 0.17);
      dummy2.position.set(px, 0.1 + r * 0.5, pz); dummy2.scale.set(r, r * 0.8, r); dummy2.updateMatrix();
      leaves.setMatrixAt(i, dummy2.matrix); leaves.setColorAt(i, new THREE.Color([0x3f7a3a, 0x4f8a42, 0x35692f, 0x5a9a48][i % 4]));
      for (let k = 0; k < 2; k++) {
        dummy2.position.set(px + rr(-0.07, 0.07), 0.2 + r + rr(0, 0.12), pz + rr(-0.07, 0.07)); dummy2.scale.setScalar(rr(0.8, 1.3)); dummy2.updateMatrix();
        petals.setMatrixAt(i * 2 + k, dummy2.matrix); petals.setColorAt(i * 2 + k, new THREE.Color(bloom[(i + k) % 5]));
      }
    }
    yard.add(leaves, petals);
  }
  const parkTrees = createForest(yard);
  for (const [x, z, s] of [[-3.8, -9.6, 1.1], [3.9, -9.7, 1.0], [-5.5, -6.2, 1.2], [5.6, -6.0, 1.1]]) parkTrees.bush(x, z, s);
  parkTrees.build();
}

// ================= THE LAB: far to the east of the house; the camera only goes there for a few seconds =================
const LAB = { x: 60 };
const lab = group(LAB.x, 0, 0, scene);
lab.name = "lab";
const labLights = [];
{
  const wall = T.plaster(0xf3f4f2, [0.5, 0.5]);
  const teal = mat(0x4f9d99, { roughness: 0.6 });
  const floorM = T.concrete({ tile: 0.6, repeat: [1, 1], color: 0xe0ded8 });
  const white = mat(0xf2f2f0, { roughness: 0.4 });
  const gray = mat(0x3a3f45, { roughness: 0.5, metalness: 0.2 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  // room shell: 10 m wide, 18 m long, 3.4 m high
  floorPlane(10, 18, floorM, 0, 0.004, -4.5, lab);
  box(10.4, 0.1, 18.4, wall, 0, 3.45, -4.5, lab);
  box(10.4, 3.4, 0.2, wall, 0, 1.7, -13.1, lab);
  box(10.4, 3.4, 0.2, wall, 0, 1.7, 4.1, lab);
  for (const sx of [-1, 1]) box(0.2, 3.4, 18.4, wall, sx * 5.1, 1.7, -4.5, lab);
  // a teal stripe along the walls and a skirting
  box(0.04, 0.9, 17.4, teal, -4.98, 0.45, -4.5, lab);
  box(0.04, 0.9, 17.4, teal, 4.98, 0.45, -4.5, lab);
  box(9.9, 0.9, 0.04, teal, 0, 0.45, -12.98, lab);
  // ceiling lights (panels that glow) and a cool fill from above
  for (const z of [-1, -4, -7, -10]) for (const x of [-2.2, 2.2]) box(1.5, 0.04, 0.55, new THREE.MeshBasicMaterial({ color: 0xffffff }), x, 3.38, z, lab);
  for (const z of [-1.5, -6, -10.5]) {
    const l = new THREE.PointLight(0xeaf3ff, 9, 13, 1.4);
    l.position.set(LAB.x, 3.0, z);
    scene.add(l);
    labLights.push(l);
  }
  // the whiteboard at the far end: the result, drawn in marker
  const board = canvasTex(1024, 440, (x, w, h) => {
    x.fillStyle = "#fbfbfa";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#1d2630";
    x.font = "bold 70px Arial, sans-serif";
    x.fillText("YAWN STUDY", 36, 92);
    x.font = "bold 40px Arial, sans-serif";
    x.fillText("29 dogs", 40, 150);
    x.fillStyle = "#2e9d6a";
    x.fillRect(520, 400 - 270 * 21 / 29, 140, 270 * 21 / 29);
    x.fillStyle = "#c9423a";
    x.fillRect(760, 396, 140, 6);
    x.fillStyle = "#1d2630";
    x.fillText("21", 560, 400 - 270 * 21 / 29 - 14);
    x.fillText("0", 812, 380);
    x.font = "bold 28px Arial, sans-serif";
    x.fillText("yawn", 536, 432);
    x.fillText("mouth only", 740, 432);
    x.fillStyle = "#222";
    x.fillRect(480, 130, 6, 280);
    x.fillRect(480, 404, 440, 6);
  });
  box(3.8, 1.7, 0.05, white, 0, 1.85, -12.93, lab);
  plane(3.6, 1.5, new THREE.MeshStandardMaterial({ map: board, roughness: 0.6 }), 0, 1.85, -12.9, 0, lab);
  // windows on both side walls: daylight, trees
  const sky = canvasTex(256, 192, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#9cc8ee");
    g.addColorStop(1, "#e8f3fb");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#5e9a4e";
    for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(30 + i * 44, 168, 34 + (i % 3) * 8, 0, Math.PI * 2); x.fill(); }
  });
  for (const sx of [-1, 1]) for (const z of [-3, -7, -11]) {
    plane(1.7, 1.2, new THREE.MeshBasicMaterial({ map: sky }), sx * 4.97, 1.95, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, lab);
    for (const [w, h, dy, dz] of [[0.05, 1.3, 0, 0.86], [0.05, 1.3, 0, -0.86], [0.05, 0.05, 0.62, 0], [0.05, 0.05, -0.62, 0]]) box(w, h, dz === 0 ? 1.8 : 0.05, white, sx * 4.95, 1.95 + dy, z + dz, lab);
    box(0.05, 1.3, 0.04, white, sx * 4.95, 1.95, z, lab);
  }
  // left wall: lab benches with monitors, beakers, a microscope and a sink
  box(0.75, 0.88, 9, white, -4.55, 0.44, -6.5, lab);
  box(0.82, 0.04, 9.1, gray, -4.55, 0.9, -6.5, lab);
  const screen = canvasTex(256, 160, (x, w, h) => {
    x.fillStyle = "#0b1a24";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#35d29a";
    x.lineWidth = 5;
    x.beginPath();
    for (let i = 0; i <= 24; i++) { const px = 10 + i * 9.7, py = 90 + Math.sin(i * 0.7) * 30 + (i > 14 ? -i * 2 : 0); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
    x.fillStyle = "#35d29a";
    x.fillRect(10, 140, 60, 6);
  });
  for (const z of [-3.4, -5.4, -8.2]) {
    box(0.04, 0.3, 0.04, gray, -4.45, 0.97, z, lab);
    box(0.04, 0.36, 0.56, gray, -4.5, 1.2, z, lab);
    plane(0.5, 0.31, new THREE.MeshBasicMaterial({ map: screen }), -4.47, 1.2, z, Math.PI / 2, lab);
    box(0.34, 0.015, 0.14, gray, -4.3, 0.915, z + 0.02, lab); // keyboard
  }
  for (const [z, c] of [[-4.4, 0xe8445a], [-4.2, 0x3a8fe0], [-6.6, 0x57c27a], [-6.8, 0xf2c94c], [-9.2, 0x9a5be0]]) {
    mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.13, 16), glassM, -4.4, 0.985, z, lab);
    mesh(new THREE.CylinderGeometry(0.04, 0.044, 0.06, 16), mat(c, { roughness: 0.2 }), -4.4, 0.95, z, lab);
  }
  { // microscope
    const mz = -7.4;
    box(0.2, 0.03, 0.26, gray, -4.4, 0.925, mz, lab);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), gray, -4.34, 1.07, mz - 0.07, lab);
    const tube = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), white, -4.4, 1.12, mz, lab);
    tube.rotation.x = 0.4;
  }
  box(0.5, 0.12, 0.6, M.steel, -4.55, 0.86, -10.3, lab); // sink basin
  mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), M.steel, -4.78, 1.08, -10.3, lab);
  // upper shelves with binders and bottles
  for (const y of [1.75, 2.2]) {
    box(0.3, 0.04, 8.6, white, -4.8, y, -6.5, lab);
    for (let i = 0; i < 26; i++) box(0.22, 0.26, 0.07, mat([0xe0453a, 0x3a7be0, 0x2f9d6a, 0xf0b840, 0xeeeeee, 0x8a58c8][i % 6]), -4.8, y + 0.15, -2.4 - i * 0.32, lab);
  }
  // right wall: three tripod cameras filming the dogs, a rolling cart with a laptop and clipboards
  for (const z of [-3.2, -6.7, -10.2]) {
    const g = group(4.0, 0, z, lab);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = mesh(new THREE.CylinderGeometry(0.012, 0.016, 1.35, 8), gray, Math.cos(a) * 0.22, 0.66, Math.sin(a) * 0.22, g);
      leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
    }
    box(0.18, 0.1, 0.3, gray, 0, 1.38, 0, g);
    const lens = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 14), mat(0x111111, { roughness: 0.2 }), -0.12, 1.38, 0, g);
    lens.rotation.z = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0, 1.45, 0.1, g);
  }
  { // cart
    const g = group(4.3, 0, -1.4, lab);
    box(0.7, 0.04, 0.5, white, 0, 0.8, 0, g);
    box(0.7, 0.04, 0.5, white, 0, 0.3, 0, g);
    for (const sx of [-0.32, 0.32]) for (const sz of [-0.22, 0.22]) box(0.03, 0.8, 0.03, M.steel, sx, 0.4, sz, g);
    box(0.34, 0.02, 0.24, gray, 0, 0.83, 0, g);
    const lid = box(0.34, 0.22, 0.015, gray, 0, 0.95, -0.12, g);
    lid.rotation.x = -0.25;
    box(0.2, 0.02, 0.28, mat(0xe7d4a4), 0.22, 0.83, 0.1, g);
  }
  // dog mats in rows, floor tape marking the test area, a stool for the scientist's notes
  for (let i = 0; i < 30; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    box(0.82, 0.025, 0.82, mat(i % 2 ? 0x4f9d99 : 0xf2a65a, { roughness: 0.8 }), (c - 1) * 1.25, 0.014, -1.4 - r * 1.05, lab);
  }
  for (const x of [-2.1, 2.1]) box(0.06, 0.012, 10.8, mat(0xf2c94c), x, 0.012, -6.1, lab);
  box(4.3, 0.012, 0.06, mat(0xf2c94c), 0, 0.012, 0.4, lab);
  // a poster
  const poster = canvasTex(256, 360, (x, w, h) => {
    x.fillStyle = "#f4efe3";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#2f6f6a";
    x.fillRect(0, 0, w, 70);
    x.fillStyle = "#fff";
    x.font = "bold 30px Arial, sans-serif";
    x.fillText("CANINE", 20, 32);
    x.fillText("BEHAVIOUR LAB", 20, 62);
    x.font = "90px 'Noto Color Emoji', sans-serif";
    x.fillText("🐶", 70, 220);
    x.fillStyle = "#333";
    x.font = "bold 24px Arial, sans-serif";
    x.fillText("Be calm. Be kind.", 24, 320);
  });
  plane(0.9, 1.27, new THREE.MeshStandardMaterial({ map: poster, roughness: 0.7 }), 4.97, 1.5, 0.2, -Math.PI / 2, lab);
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

// sitting on a sofa: seat = height of the cushion, hands are placed afterwards with reachTo
function sofaSit(av, { x, z, ry, seat = 0.46, lean = 0.08, head = 0.4, headYaw = 0 }) {
  av.resetPose();
  const k = (av.hipHeight ?? 0.93) / 0.93;
  av.position.set(x, 0, z);
  av.rotation.set(0, ry, 0);
  av.pelvis.position.y = seat + 0.09 * k;
  av.legL.rotation.set(-1.5, 0, 0.1);
  av.legR.rotation.set(-1.5, 0, -0.1);
  av.kneeL.rotation.x = av.kneeR.rotation.x = 1.5;
  av.ankleL.rotation.x = av.ankleR.rotation.x = -0.1;
  av.spine.rotation.x = lean;
  av.head.rotation.set(head, headYaw, 0);
}

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
function setDay({ exposure = 1.05, where = "home" } = {}) {
  for (const l of LIGHTS) l.visible = false;
  hemi.visible = sun.visible = true;
  warmFill.visible = where === "home";
  for (const l of labLights) l.visible = where === "lab";
  renderer.toneMappingExposure = exposure;
  scene.fog = null;
  moon.visible = false;
  skyMat.map = skyDay;
  scene.background = new THREE.Color(0xbcd6ee);
  hemi.color.set(0xfff4e6);
  hemi.groundColor.set(0x6b5a48);
  hemi.intensity = where === "lab" ? 1.5 : 1.9;
  sun.intensity = 4.0;
  // the sun and its shadow follow the action
  const at = where === "lab" ? V(LAB.x, 0, -5.5) : where === "park" ? V(0, 0, PARK.z) : V(0, 0, -1);
  sun.target.position.copy(at);
  sun.position.copy(at).add(V(7, 9, 9));
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

// ---------- you: sitting on the sofa ----------
const owner = loadAvatar(short, "Male_Adult_08");
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

// ---------- the other people: a stranger in the park, two scientists in the lab ----------
const stranger = loadAvatar(short, "Female_Adult_01");
const sci = loadAvatar(short, "Medical_Female_01");
const sci2 = loadAvatar(short, "Medical_Female_01");
scene.add(stranger, sci, sci2);

// ---------- 29 dogs for the lab: three columns of ten, every one a different dog ----------
const LAB_COLORS = [
  ["golden", DOG_COLORS.golden], ["cream", { body: 0xe3c999, light: 0xfff1d6, dark: 0xa98258 }], ["choc", { body: 0x6e4a30, light: 0xc9a37a, dark: 0x3d2616 }],
  ["white", { body: 0xeeeae2, light: 0xffffff, dark: 0xc7c0b2 }], ["wolf", DOG_COLORS.wolf], ["shadow", DOG_COLORS.shadow], ["red", { body: 0xa5532c, light: 0xe8b88c, dark: 0x5e2c16 }],
];
const labDogs = Array.from({ length: 29 }, (_, i) => {
  const [name, colors] = LAB_COLORS[(i * 3 + Math.floor(i / 3)) % LAB_COLORS.length];
  const d = heroDog(colors, "lab-" + name);
  for (const e of d.eyes) for (const k of ["pupil", "iris"]) {
    e[k].material = e[k].material.clone();
    e[k].material.color.setHex(k === "pupil" ? 0x080403 : 0x2a1408);
    e[k].material.roughness = 0.22;
    e[k].material.envMapIntensity = 0.25;
  }
  scene.add(d);
  return d;
});

// ---------- little yawn faces drifting from you to him, hearts for the last beat ----------
const emojiTex = (ch) => canvasTex(128, 128, (x) => {
  x.font = "100px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(ch, 64, 72);
});
const yawnTex = emojiTex("🥱");
const gapeTex = emojiTex("😮");
const heartTex = canvasTex(128, 128, (x) => {
  x.fillStyle = "#ff4f7d";
  x.beginPath();
  x.moveTo(64, 110);
  x.bezierCurveTo(8, 70, 18, 20, 64, 46);
  x.bezierCurveTo(110, 20, 120, 70, 64, 110);
  x.fill();
});
const fxMat = (map, color, opacity) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, fog: false });
const mkSprites = (n, map) => Array.from({ length: n }, () => {
  const s = new THREE.Sprite(fxMat(map, 0xffffff, 0));
  scene.add(s);
  return s;
});
const yawnIcons = mkSprites(9, yawnTex);    // little yawns floating across after each yawn
const travel = mkSprites(6, heartTex);       // hearts travelling between your eyes and his
const risers = mkSprites(7, heartTex);       // hearts floating up on the last beat
const bubble = mkSprites(2, yawnTex);        // a bubble over the scientist's head
bubble[1].material.map = gapeTex;

// the kitchen corner, the bedroom door and the floor mat stay out of this one
fridge.visible = false;
bedroom.visible = false;
box(0.06, 2.12, GD.z1 - GD.z0 - 0.04, M.door, LX + 0.02, 1.06, (GD.z0 + GD.z1) / 2, house);

// ================= the story: four places in 21 seconds =================
//   HOME (you yawn, he yawns back) → LAB (29 dogs) → PARK (owner or stranger?) → HOME (empathy, and the loop)
const TAU = Math.PI * 2;
const CUT1 = C.scientists - 0.1, CUT2 = C.another - 0.4, CUT3 = C.researchers - 0.05;
const placeOf = (t) => (t < CUT1 ? "home" : t < CUT2 ? "lab" : t < CUT3 ? "park" : "home");
const cyc = (t, n) => TAU * n * t / DURATION;  // whole cycles per loop: gentle motions match on the first and last frame
const bump = (t, t0, d) => { const u = Math.abs(t - t0) / d; return u >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u); };
const blink = (t, t0, d = 0.09) => Math.max(0, 1 - Math.abs(t - t0) / d);
// a yawn: a slow breath in, a held stretch, a long breath out
const yawnEnv = (t, t0, dur) => {
  const u = (t - t0) / dur;
  if (u <= 0 || u >= 1) return 0;
  return ease.inOut(clamp01(u / 0.4)) * (1 - ease.inOut(clamp01((u - 0.6) / 0.4)));
};

// ---- home: you on the sofa, he on the rug (as in the stare video)
const SEAT = { x: 3.0, z: -0.55 }, OWNER_RY = -Math.PI / 2;
const DOG_AT = { x: 1.75, z: -0.55 }, DOG_RY = Math.PI / 2;
const GAZE = -0.4;
const HOME_YOU = { t0: C.yawn1, dur: 1.9 }, HOME_HE = { t0: C.yawn1 + 1.45, dur: 2.0 };

// ---- park: owner on the left bench, stranger on the right, the dog between them
const BENCH = { l: { x: -1.35, z: PARK.z - 0.17 }, r: { x: 1.35, z: PARK.z - 0.17 } };
const DOG_PARK = { x: 0, z: PARK.z + 0.35 };
const PARK_OWNER = { t0: 14.55, dur: 1.6 }, PARK_DOG = { t0: 15.15, dur: 1.7 }, PARK_STRANGER = { t0: 16.4, dur: 1.6 };
const PARK_DOG_AGAIN = { t0: 16.85, dur: 0.9 };   // a small, short one: dogs yawn less for a stranger

// ---- lab: the scientist yawns, 21 of 29 dogs yawn after her, the other 8 only watch
const SCI = { x: LAB.x, z: 0.3 };
const SCI_YAWN = { t0: C.person - 0.28, dur: 1.7 };
const LAB_NON = new Set([2, 7, 10, 13, 19, 22, 25, 27]);
const labSpot = (i) => ({ x: LAB.x + ((i % 3) - 1) * 1.25, z: -1.4 - Math.floor(i / 3) * 1.05 });
const labYawn = labDogs.map((_, i) => (LAB_NON.has(i) ? null : {
  t0: 8.95 + 0.035 * Math.floor(i / 3) + 0.16 * (((i * 7) % 5) / 4) + 0.1 * (((i * 3) % 3) / 2),
  dur: 1.5 + 0.35 * (((i * 5) % 3) / 2),
}));
const labYawners = labYawn.filter(Boolean);
const labCount = (t) => labYawners.filter((y) => t >= y.t0 + 0.35).length;

// the glow of the empathy beat
const glow = (t) => ease.inOut(prog(t, C.researchers, C.researchers + 0.7)) * (1 - ease.inOut(prog(t, C.empathy + 0.3, C.so + 0.5)));

// ---- the hero dog, wherever he is
function heroState(t) {
  const br = Math.sin(cyc(t, 7));
  const where = placeOf(t);
  if (where === "park") {
    const toOwner = ease.inOut(prog(t, 14.2, 14.8)) * (1 - ease.inOut(prog(t, 16.35, 16.85)));
    const toStranger = ease.inOut(prog(t, 16.35, 16.85));
    const y = Math.max(yawnEnv(t, PARK_DOG.t0, PARK_DOG.dur), 0.35 * yawnEnv(t, PARK_DOG_AGAIN.t0, PARK_DOG_AGAIN.dur));
    return {
      t, x: DOG_PARK.x, y: 0, z: DOG_PARK.z, ry: 0, sit: 1,
      headPitch: -0.05 + 0.012 * br - 0.3 * y, headYaw: -0.8 * toOwner + 0.8 * toStranger,
      headTilt: 0.05 * Math.sin(cyc(t, 3)), jawOpen: 1.35 * y, closed: Math.max(blink(t, 14.0), 0.95 * clamp01(y * 1.7)),
      ears: 0.3 - 0.8 * y, wag: 0.3 * (1 - y), wagSpeed: TAU * 21 / DURATION, sad: 0.1,
    };
  }
  const y = where === "home" && t < CUT1 ? yawnEnv(t, HOME_HE.t0, HOME_HE.dur) : 0;
  const hug = where === "home" && t >= CUT3 ? 1 : 0;
  return {
    t, x: DOG_AT.x, y: 0, z: DOG_AT.z, ry: DOG_RY, sit: 1,
    headPitch: GAZE + 0.012 * br - 0.34 * y,
    headTilt: 0.04 * Math.sin(cyc(t, 3)) + 0.06 * y + 0.05 * hug * bump(t, 18.6, 1.0),
    jawOpen: 1.35 * y + 0.1 * bump(t, HOME_HE.t0 + HOME_HE.dur + 0.1, 0.35),
    closed: Math.max(blink(t, 5.2), blink(t, 19.0), 0.95 * clamp01(y * 1.7)),
    ears: 0.25 - 0.85 * y + 0.2 * hug * glow(t), sad: 0.1 + 0.2 * y, wag: 0.25 * (1 - y) + 0.35 * glow(t), wagSpeed: TAU * 21 / DURATION,
  };
}

// ---- people
function seated(av, p, ry, lookYaw, y, mouthSide = "L") {
  const br = Math.sin(cyc(0, 1)) * 0;
  sofaSit(av, { x: p.x, z: p.z, ry, lean: 0.04 - 0.12 * y, head: 0.12 - 0.5 * y, headYaw: lookYaw * (1 - y) });
  const lap = local(av, 0.12, 0.7, 0.3), lapR = local(av, -0.12, 0.7, 0.3);
  const mouth = headOf(av, 0.02, 0.11);
  const [l, r] = mouthSide === "L" ? [lap.lerp(mouth, y), lapR] : [lap, lapR.lerp(mouth, y)];
  both(av, l, r);
}
function applyHome(t) {
  const y = yawnEnv(t, HOME_YOU.t0, HOME_YOU.dur);
  const calm = t >= CUT3 ? 0.3 + 0.1 * Math.sin(cyc(t, 3)) : 0.3;
  sofaSit(owner, { x: SEAT.x, z: SEAT.z, ry: OWNER_RY, lean: 0.05 + 0.012 * Math.sin(cyc(t, 7)) - 0.12 * y, head: calm - 0.5 * y - 0.0, headYaw: -0.3 * y });
  const lap = local(owner, 0.12, 0.7, 0.3), lapR = local(owner, -0.12, 0.7, 0.3);
  both(owner, lap.lerp(headOf(owner, 0.02, 0.11), y), lapR);
}
function applyPark(t) {
  const yo = yawnEnv(t, PARK_OWNER.t0, PARK_OWNER.dur), ys = yawnEnv(t, PARK_STRANGER.t0, PARK_STRANGER.dur);
  // both glance at the dog now and then, and cover their mouths for the yawn
  seated(owner, BENCH.l, 0, 0.5, yo, "L");
  seated(stranger, BENCH.r, 0, -0.5, ys, "R");
}
function applyLab(t) {
  const y = yawnEnv(t, SCI_YAWN.t0, SCI_YAWN.dur);
  const gape = bump(t, 12.0, 0.9);               // mouth open, no yawn
  stand(sci, { x: SCI.x, z: SCI.z, ry: Math.PI, head: 0.05 - 0.45 * y - 0.25 * gape, lean: -0.05 * y });
  const mouth = headOf(sci, 0.02, 0.11);
  both(sci, local(sci, 0.2, 0.95, 0.12).lerp(mouth, y), local(sci, -0.2, 0.95, 0.12));
  stand(sci2, { x: LAB.x + 2.45, z: -4.4, ry: -Math.PI / 2, head: 0.12 });
  both(sci2, local(sci2, 0.14, 1.12, 0.3), local(sci2, -0.14, 1.12, 0.3));
}
function labDogState(i, t) {
  const p = labSpot(i), br = Math.sin(cyc(t, 7) + i);
  const yw = labYawn[i];
  const y = yw ? yawnEnv(t, yw.t0, yw.dur) : 0;
  const tb = 6.3 + ((i * 37) % 23) / 10;
  return {
    t, x: p.x, y: 0, z: p.z, ry: 0, sit: 1,
    headPitch: -0.12 + 0.012 * br - 0.34 * y,
    headTilt: 0.12 * Math.sin(i * 1.7 + t * 0.9) * (yw ? 0.4 : 1),
    headYaw: 0.1 * Math.sin(i * 2.3),
    jawOpen: 1.35 * y, closed: Math.max(blink(t, tb), blink(t, tb + 4.3), 0.95 * clamp01(y * 1.7)),
    ears: 0.3 - 0.8 * y, wag: 0.3 * (1 - y), wagSpeed: 3 + (i % 5) * 0.7, sad: 0.1,
  };
}

// ================= the camera: one smooth track per place; it starts and ends as YOUR eyes =================
const EYES = V(SEAT.x - 0.26, 1.2, SEAT.z);    // where your eyes are (the camera sits just in front of your face)
const HIS = V(DOG_AT.x + 0.1, 0.83, DOG_AT.z); // his face
const lx = LAB.x;
// [time, camera position, look-at point, field of view]
const TRACKS = [
  { from: 0, to: CUT1, vs: 0, ve: 1, keys: [
    [0.0, [EYES.x, EYES.y, EYES.z], [HIS.x, HIS.y, HIS.z], 56],               // your eyes: he is watching you
    [1.95, [2.15, 1.55, 2.4], [2.25, 0.78, SEAT.z], 64],                        // out to the side: you yawn
    [3.55, [1.95, 1.1, 1.45], [HIS.x + 0.12, 0.8, HIS.z], 46],                  // in on his yawn
    [5.45, [2.2, 1.5, 2.3], [2.25, 0.8, SEAT.z], 62],                           // back out: yawns are contagious
    [CUT1, [2.1, 1.5, 2.15], [2.25, 0.82, SEAT.z], 60],
  ] },
  { from: CUT1, to: CUT2, vs: 1, ve: 1, keys: [
    [CUT1, [lx + 0.5, 2.3, 3.4], [lx, 1.0, -6.0], 64],                          // the lab: a lane of dogs
    [7.9, [lx + 0.25, 1.9, 2.9], [lx, 0.9, -5.5], 60],                          // "29 dogs": a slow push
    [8.65, [lx - 1.9, 1.55, 1.3], [lx + 0.2, 1.1, -1.8], 56],                   // beside the scientist: she yawns
    [10.3, [lx - 1.5, 1.2, -0.4], [lx + 0.5, 0.8, -5.0], 56],                   // along the front row: the wave
    [11.5, [lx + 0.05, 1.85, 2.0], [lx, 1.0, -5.0], 62],                        // behind her: mouth open, nobody yawns
    [CUT2, [lx + 0.05, 1.8, 2.1], [lx, 1.0, -5.0], 62],
  ] },
  { from: CUT2, to: CUT3, vs: 1, ve: 1, keys: [
    [CUT2, [0.0, 1.05, PARK.z + 4.3], [0.0, 1.5, PARK.z], 70],                 // the park: two benches
    [14.9, [-0.2, 1.05, PARK.z + 3.9], [-0.25, 1.5, PARK.z], 70],              // drifting toward the owner...
    [16.3, [0.2, 1.05, PARK.z + 3.9], [0.25, 1.5, PARK.z], 70],                // ...and across to the stranger
    [CUT3, [0.3, 1.08, PARK.z + 3.8], [0.3, 1.5, PARK.z], 70],
  ] },
  { from: CUT3, to: DURATION, vs: 1, ve: 0, keys: [
    [CUT3, [2.62, 1.18, 0.45], [HIS.x + 0.08, HIS.y + 0.05, HIS.z], 56],        // home again, close on him: empathy
    [19.9, [2.72, 1.18, -0.05], [HIS.x + 0.08, HIS.y + 0.04, HIS.z], 56],
    [DURATION, [EYES.x, EYES.y, EYES.z], [HIS.x, HIS.y, HIS.z], 56],           // and back into your eyes: the first frame again
  ] },
];
// a smooth Hermite path through the keys; vs/ve = 1 keeps some speed at the start/end of the place (so a cut never lands on a stop)
function makeTrack({ keys, vs, ve }) {
  const kt = keys.map((k) => k[0]);
  const kv = keys.map((k) => [...k[1], ...k[2], k[3]]);
  const n = keys.length;
  const tang = (i, a, b) => (kv[b].map((v, j) => (v - kv[a][j]) / (kt[b] - kt[a])));
  const m = keys.map((_, i) => (i === 0 ? (vs ? tang(i, 0, 1) : kv[0].map(() => 0)) : i === n - 1 ? (ve ? tang(i, n - 2, n - 1) : kv[0].map(() => 0)) : tang(i, i - 1, i + 1)));
  return (t) => {
    let i = kt.findIndex((x) => t < x);
    i = i < 0 ? n - 1 : Math.max(1, i);
    const t0 = kt[i - 1], t1 = kt[i], dt = t1 - t0, s = clamp01((t - t0) / dt);
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    return kv[i].map((_, j) => h00 * kv[i - 1][j] + h10 * dt * m[i - 1][j] + h01 * kv[i][j] + h11 * dt * m[i][j]);
  };
}
const trackFns = TRACKS.map((tr) => ({ ...tr, fn: makeTrack(tr) }));
const track = (t) => (trackFns.find((tr) => t < tr.to) ?? trackFns.at(-1)).fn(t);

// ================= labels (small, one at a time) =================
function labels(t) {
  tag("you", "🥱 YOU YAWN", t, C.yawn1 + 0.3, C.him + 0.9, 540, 330, "yellow");
  tag("he", "🥱 HE YAWNS BACK", t, C.yawn2 - 0.1, C.back + 0.9, 540, 330, "yellow");
  tag("contagious", "🥱 CONTAGIOUS", t, C.contagious - 0.15, CUT1 - 0.05, 540, 330, "pink");
  tag("n29", "🐶 29 DOGS", t, CUT1 + 0.3, C.person - 0.2, 540, 330, "yellow");
  tag("count", `🥱 ${labCount(t)} / 29`, t, 8.9, C.but + 0.0, 540, 330, "pink");
  tag("mouth", "😮 MOUTH ONLY: 0 / 29", t, C.but + 0.6, CUT2 - 0.05, 540, 330, "yellow");
  tag("another", "📋 ANOTHER STUDY", t, CUT2 + 0.35, 14.55, 540, 330, "yellow");
  tag("owner", "💗 OWNER → HE YAWNS", t, 15.2, 16.4, 540, 330, "pink");
  tag("stranger", "👤 STRANGER → LESS", t, C.stranger - 0.05, CUT3 - 0.05, 540, 330, "yellow");
  tag("empathy", "💗 EMPATHY?", t, C.sign - 0.15, C.so + 0.1, 540, 330, "pink");
}

// ================= sound: real recordings (see sfx/CREDITS.md) =================
const sfx = createSfx(short);
sfx.loop(0, CUT1 + 0.2, "birds_2", { gain: 0.16, fadeIn: 0.15, fadeOut: 0.25 });                // home
sfx.loop(CUT1 + 0.1, CUT2 + 0.2, "clock", { gain: 0.28, fadeIn: 0.25, fadeOut: 0.25 });         // the lab
sfx.loop(CUT2 + 0.1, CUT3 + 0.2, "birds_2", { gain: 0.3, fadeIn: 0.25, fadeOut: 0.25 });        // the park
sfx.loop(CUT3 + 0.1, DURATION, "birds_2", { gain: 0.16, fadeIn: 0.25, fadeOut: 0.15 });         // home again
for (const t0 of [HOME_YOU.t0, SCI_YAWN.t0, PARK_OWNER.t0, PARK_STRANGER.t0]) sfx.add(t0 + 0.05, "breath", { gain: 0.5, dur: 1.5, fadeOut: 0.5 }); // a breath in
for (const t0 of [HOME_HE.t0 + 0.55, PARK_DOG.t0 + 0.55]) sfx.add(t0, "whimper", { gain: 0.22, dur: 1.1, fadeOut: 0.4 });                    // his yawn
for (const k of [0, 5, 9, 14]) sfx.add(labYawners[k].t0 + 0.5, "whimper", { gain: 0.1, dur: 0.9, fadeOut: 0.4, rate: 0.95 + 0.04 * k });       // a few in the lab
labYawners.slice().sort((a, b) => a.t0 - b.t0).forEach((y, k) => sfx.add(y.t0 + 0.35, "tick", { gain: 0.14, rate: 0.9 + 0.012 * k }));         // the counter
sfx.add(15.2, "pluck", { gain: 0.26 });
sfx.add(C.stranger - 0.05, "pluck", { gain: 0.22, rate: 0.84 });
sfx.add(C.empathy - 0.1, "chime", { gain: 0.26, dur: 2.0, fadeOut: 0.8 });

// ================= overlays =================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 }); // short lines: 76 px type fits about 21 characters
document.getElementById("grain").style.opacity = "0";
document.getElementById("vignette").style.opacity = "0.18";
const flashEl = document.getElementById("flash");
flashEl.style.background = "#fff9ee";
// a soft dip to a warm white at each change of place (0.4 s in total, so it stays calm)
function dip(t) {
  const d = Math.max(...[CUT1, CUT2, CUT3].map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.2)));
  flashEl.style.opacity = String(ease.inOut(d));
}

// ================= little yawns drifting from the yawner to the dog; a bubble over the scientist; hearts =================
const _a = V(), _b = V(), _q = V();
const nearFade = (sprite) => clamp01((camera.position.distanceTo(sprite.position) - 0.6) / 0.8); // nothing floats on the lens
function icon(h, u, from, to, k) {
  if (u < 0 || u > 1) { h.material.opacity = 0; return; }
  _q.lerpVectors(from, to, 0.15 + 0.7 * ease.inOut(u));
  _q.y += 0.12 + 0.1 * Math.sin(Math.PI * u);
  _q.z += 0.1 * (k - 1);
  h.position.copy(_q);
  h.scale.setScalar(0.13);
  h.material.opacity = Math.sin(Math.PI * u) * nearFade(h);
}
function drawFx(t, where) {
  owner.updateMatrixWorld(true);
  dog.updateMatrixWorld(true);
  yawnIcons.forEach((h) => (h.material.opacity = 0));
  bubble.forEach((h) => (h.material.opacity = 0));
  if (where === "home" || where === "park") {
    _a.copy(dog.point("Head", [0, 0.07, 0.1]));
    _b.copy(headOf(owner, 0.0, 0.1));
  }
  if (where === "home" && t < CUT1) {
    for (let k = 0; k < 3; k++) {
      icon(yawnIcons[k], (t - (C.yawn1 + 0.9 + k * 0.32)) / 1.0, _b, _a, k);
      icon(yawnIcons[3 + k], (t - (C.contagious - 0.1 + k * 0.32)) / 1.0, _b, _a, k);
    }
  }
  if (where === "park") {
    for (let k = 0; k < 2; k++) icon(yawnIcons[6 + k], (t - (PARK_OWNER.t0 + 0.55 + k * 0.35)) / 1.0, _b, _a, k);
    stranger.updateMatrixWorld(true);
    _b.copy(headOf(stranger, 0.0, 0.1));
    icon(yawnIcons[8], (t - (PARK_STRANGER.t0 + 0.7)) / 0.9, _b, _a, 1);
  }
  if (where === "lab") {
    sci.updateMatrixWorld(true);
    const hp = headOf(sci, 0.2, 0.0);
    for (const [h, t0, t1] of [[bubble[0], SCI_YAWN.t0 + 0.35, SCI_YAWN.t0 + 1.55], [bubble[1], 11.3, 12.9]]) {
      const u = (t - t0) / (t1 - t0);
      if (u < 0 || u > 1) continue;
      h.position.set(hp.x + 0.12, hp.y + 0.2 + 0.05 * Math.sin(Math.PI * u), hp.z);
      h.scale.setScalar(0.3 * (0.8 + 0.2 * ease.out(Math.min(1, u * 4))));
      h.material.opacity = Math.min(1, Math.sin(Math.PI * u) * 3);
    }
  }
  // hearts between your eyes and his, and rising (home again)
  const g = where === "home" && t >= CUT3 ? glow(t) : 0;
  for (let i = 0; i < travel.length; i++) {
    const dir = i % 2 ? 1 : -1;
    const u = (((i / travel.length) * 2 + dir * 0.16 * t) % 1 + 1) % 1;
    _q.lerpVectors(_a, _b, u);
    _q.y += Math.sin(Math.PI * u) * 0.12;
    const mid = ease.inOut(clamp01((u - 0.2) / 0.25)) * ease.inOut(clamp01((0.8 - u) / 0.25));
    travel[i].position.copy(_q);
    travel[i].scale.setScalar(0.1 + 0.05 * Math.sin(Math.PI * u));
    travel[i].material.opacity = g > 0.002 ? Math.min(1, g) * 0.95 * mid * nearFade(travel[i]) : 0;
  }
  for (let i = 0; i < risers.length; i++) {
    const u = (t - (C.researchers + 0.5 + i * 0.3)) / 1.7;
    const h = risers[i];
    if (where !== "home" || u < 0 || u > 1) { h.material.opacity = 0; continue; }
    _q.lerpVectors(_a, _b, 0.5 + 0.18 * Math.sin(i * 2.1));
    h.position.set(_q.x, _q.y + 0.08 + 0.4 * u, _q.z + 0.1 * Math.sin(i * 1.7 + u * 3));
    h.scale.setScalar(0.07 + 0.04 * Math.sin(Math.PI * u));
    h.material.opacity = 0.95 * Math.sin(Math.PI * u) * nearFade(h);
  }
}

// ================= speed: once everything has loaded, fuse each place's static scenery into a few meshes per material =================
let fused = false;
function fuseStatic(roots, skip) {
  scene.updateMatrixWorld(true);
  let before = 0, after = 0;
  for (const root of roots) {
    const inv = root.matrixWorld.clone().invert();
    const buckets = new Map();
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      for (let p = o; p; p = p.parent) if (skip.includes(p) || p.visible === false) return;
      const g = o.geometry;
      if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
      const attrs = Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}${g.attributes[k].normalized ? "n" : ""}`).join(",");
      const key = [o.material.uuid, o.castShadow, o.receiveShadow, g.index ? "i" : "n", attrs].join("|");
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(o);
    });
    for (const list of buckets.values()) {
      before += list.length;
      if (list.length < 2) { after += 1; continue; }
      const merged = mergeGeometries(list.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv)), false);
      if (!merged) { after += list.length; continue; }
      const m = new THREE.Mesh(merged, list[0].material);
      m.castShadow = list[0].castShadow;
      m.receiveShadow = list[0].receiveShadow;
      for (const o of list) o.removeFromParent();
      root.add(m);
      after += 1;
    }
  }
  console.log(`fused ${before} meshes into ${after}`);
}

// ================= frame =================
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  if (!fused) {
    fused = true;
    // real glass (transmission) re-renders the whole scene every frame: swap it for plain translucency
    scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.transmission > 0) Object.assign(m, { transmission: 0, transparent: true, opacity: 0.3, depthWrite: false, needsUpdate: true });
      }
    });
    // image-based lighting only for shiny metals; the hemisphere light fills in everywhere else
    const ENV = scene.environment;
    scene.environment = null;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.metalness > 0.4 && !m.envMap) Object.assign(m, { envMap: ENV, envMapIntensity: 0.6, needsUpdate: true });
      }
    });
    fuseStatic([house, yard, lab], [frontDoor]);
  }
  const where = placeOf(t);
  // only the place on screen is drawn
  house.visible = where === "home";
  yard.visible = where !== "lab";
  lab.visible = where === "lab";
  dog.visible = owner.visible = where !== "lab";
  stranger.visible = where === "park";
  sci.visible = sci2.visible = where === "lab";
  labDogs.forEach((d) => (d.visible = where === "lab"));
  for (const av of [owner, stranger, sci, sci2]) av.traverse((o) => o.isLight && (o.visible = false)); // the character files carry their own ambient light
  setDay({ exposure: 1.1, where });
  if (where === "lab") {
    labDogs.forEach((d, i) => d.pose(labDogState(i, t)));
    applyLab(t);
    sci.update();
    sci2.update();
  } else {
    dog.pose(heroState(t));
    if (where === "home") applyHome(t);
    else { applyPark(t); stranger.update(); }
    owner.update();
  }
  drawFx(t, where);
  const k = window.__cam ?? track(t); // (a debug override for test shots)
  cam(V(k[0], k[1], k[2]), V(k[3], k[4], k[5]), k[6]);
  labels(t);
  dip(t);
  hideUnusedTags();
  captions(t);
});

window.__dbg = { scene, camera, renderer, dog, owner, stranger, sci, sci2, labDogs, C, track, TRACKS, CUT1, CUT2, CUT3 };
short.start();
