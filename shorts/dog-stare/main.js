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

// "Why your dog stares at you" — one room, one camera, 60 fps, built to loop.
// The camera starts as YOUR eyes (the dog is looking into the lens), drifts out to show you and him looking at each
// other, and glides back into your eyes on the last words, so the video repeats with no visible seam.
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
  him: at("him"), treat: at("treat"), scientists: at("scientists"), else: at("else"),
  when: at("when"), eyes: at("eyes"), oxytocin: at("oxytocin"), same: at("same"), baby: at("baby"),
  even: at("even"), wolves: at("wolves"), this: at("this"), so: at("so"), begging: at("begging"),
  hugging: at("hugging"), eyes2: at("eyes", 2), longer: at("longer"), want: at("want"), which: at("which"), now: at("now"),
};
const LINES = [
 "Your dog is looking at you,",
 "and you're looking at him.",
 "You think he wants a treat,",
 "but scientists found something else.",
 "When a dog stares into your eyes,",
 "you both get a boost of oxytocin,",
 "the same hormone that bonds a mother to her baby.",
 "Even wolves raised by humans didn't do this.",
 "So he's not just begging,",
 "he's hugging you with his eyes.",
 "And the longer you look at each other,",
 "the more you both want to.",
 "Which is why, right now..."
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

// ---------- a bag of treats in your lap (the dog ignores it: he is looking at your eyes) ----------
const bag = group(0, 0, 0, scene);
{
  const tex = canvasTex(256, 384, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f08a2c");
    g.addColorStop(1, "#d96a14");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,0.18)";
    x.fillRect(0, 0, w, 46);
    x.fillStyle = "#fff6e2";
    x.font = "bold 60px Arial, sans-serif";
    x.textAlign = "center";
    x.fillText("TREATS", w / 2, 128);
    // a bone
    x.save();
    x.translate(w / 2, 230);
    x.rotate(-0.35);
    x.fillStyle = "#fff6e2";
    x.fillRect(-62, -14, 124, 28);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      x.beginPath();
      x.arc(sx * 66, sy * 17, 21, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
    x.fillStyle = "rgba(0,0,0,0.14)";
    x.fillRect(0, h - 38, w, 38);
  });
  const side = new THREE.MeshStandardMaterial({ color: 0xe0761a, roughness: 0.5 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
  const back = new THREE.MeshStandardMaterial({ color: 0xd96a14, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.06), [side, side, side, side, front, back]);
  bag.add(body);
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.028, 0.07), new THREE.MeshStandardMaterial({ color: 0xf6c27a, roughness: 0.5 }));
  crimp.position.y = 0.164;
  bag.add(crimp);
  bag.traverse((o) => o.isMesh && (o.castShadow = true));
}

// ---------- what the science says, drawn: small hearts travelling between your eyes and his ----------
const heartTex = canvasTex(128, 128, (x) => {
  x.fillStyle = "#ff4f7d";
  x.beginPath();
  x.moveTo(64, 110);
  x.bezierCurveTo(8, 70, 18, 20, 64, 46);
  x.bezierCurveTo(110, 20, 120, 70, 64, 110);
  x.fill();
});
const fxMat = (map, color, opacity) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, fog: false });
const TRAVEL = 6; // small hearts that travel between your eyes and his, three each way
const travel = [];
for (let i = 0; i < TRAVEL; i++) {
  const h = new THREE.Sprite(fxMat(heartTex, 0xffffff, 0));
  scene.add(h);
  travel.push(h);
}
const eyeHalos = [0, 1].map(() => {
  const h = new THREE.Sprite(fxMat(GLOW, 0xff7aa8, 0));
  scene.add(h);
  return h;
});
const HEARTS = 9;
const hearts = [];
for (let i = 0; i < HEARTS; i++) {
  const h = new THREE.Sprite(fxMat(heartTex, 0xffffff, 0));
  scene.add(h);
  hearts.push(h);
}

fridge.visible = false; // the kitchen corner behind the sofa stays out of this one
// the bedroom door on the left wall stays shut, so the pink room behind it is never seen
bedroom.visible = false;
box(0.06, 2.12, GD.z1 - GD.z0 - 0.04, M.door, LX + 0.02, 1.06, (GD.z0 + GD.z1) / 2, house);

// ================= who sits where, and what they do =================
const TAU = Math.PI * 2;
const SEAT = { x: 3.0, z: -0.55 };           // you, on the sofa, facing the room (-x)
const OWNER_RY = -Math.PI / 2;
const DOG_AT = { x: 1.75, z: -0.55 };         // him, on the rug, facing you (+x)
const DOG_RY = Math.PI / 2;
const GAZE = -0.4;                             // his head pitch that puts his eyes on yours
// whole numbers of cycles per loop, so every gentle motion is in the same phase on the first and last frame
const cyc = (t, n) => TAU * n * t / DURATION;
const bump = (t, t0, d) => { const u = Math.abs(t - t0) / d; return u >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u); };
const blink = (t, t0, d = 0.09) => Math.max(0, 1 - Math.abs(t - t0) / d);

// the strength of the oxytocin glow between your eyes and his
function glow(t) {
  const rise = ease.inOut(prog(t, C.when + 0.2, C.oxytocin + 0.8));
  const wolves = ease.inOut(prog(t, C.even, C.even + 0.7)) * (1 - ease.inOut(prog(t, C.so, C.so + 0.9)));
  const back = 1 - 0.9 * wolves;
  const fade = 1 - ease.inOut(prog(t, C.want - 0.2, C.which + 0.15));
  const more = 1 + 0.35 * ease.inOut(prog(t, C.longer, C.want));
  return rise * back * fade * more;
}

function dogState(t) {
  const br = Math.sin(cyc(t, 7));
  const hugAt = (C.hugging + C.eyes2) / 2;
  const hug = bump(t, hugAt, 1.1);
  const stare = ease.inOut(prog(t, C.when, C.eyes)) * (1 - ease.inOut(prog(t, C.same, C.same + 1.2)));
  return {
    t, x: DOG_AT.x, y: 0, z: DOG_AT.z, ry: DOG_RY, sit: 1,
    headPitch: GAZE + 0.012 * br,
    headTilt: 0.1 * stare + 0.05 * hug,
    closed: Math.max(blink(t, 3.05), blink(t, 9.5), blink(t, 13.0), 0.9 * bump(t, hugAt + 0.3, 0.3)),
    ears: 0.25 + 0.3 * hug,
    sad: 0.12 + 0.25 * hug,
    wag: 0.22 + 0.5 * hug,
    wagSpeed: TAU * 21 / DURATION,
  };
}

// the treat bag in your lap shakes once, on the word "treat"
const shake = (t) => bump(t, C.treat + 0.25, 0.42);
function applyOwner(t) {
  const br = Math.sin(cyc(t, 7));
  sofaSit(owner, { x: SEAT.x, z: SEAT.z, ry: OWNER_RY, lean: 0.06 + 0.012 * br, head: 0.3 });
  const s = shake(t) * Math.sin(t * 38);
  const c = local(owner, 0, 0.74 + 0.012 * s, 0.3);
  bag.position.copy(c);
  bag.rotation.set(0, 0, 0.07 * s);
  both(owner, local(owner, 0.12, 0.71 + 0.012 * s, 0.3), local(owner, -0.12, 0.71 + 0.012 * s, 0.3));
}

// ================= the camera: ONE smooth track; it starts and ends as YOUR eyes =================
const EYES = V(SEAT.x - 0.26, 1.2, SEAT.z);    // where your eyes are (the camera sits just in front of your face)
const HIS = V(DOG_AT.x + 0.1, 0.83, DOG_AT.z); // his face
const MID = V(2.4, 1.0, SEAT.z);               // the line between you
// [time, camera position, look-at point, field of view]
const KEYS = [
  [0.0, [EYES.x, EYES.y, EYES.z], [HIS.x, HIS.y, HIS.z], 56],           // your eyes: he is looking into the lens
  [C.him + 0.6, [2.2, 1.65, 2.45], [2.25, 0.72, SEAT.z], 64],            // out to the side: you and him, face to face
  [C.else, [2.2, 1.6, 2.3], [2.25, 0.74, SEAT.z], 64],
  [C.oxytocin + 0.6, [2.2, 1.55, 2.2], [2.25, 0.76, SEAT.z], 62],
  [C.even, [2.15, 1.7, 2.45], [2.25, 0.72, SEAT.z], 64],
  [C.hugging - 0.4, [2.7, 1.15, 0.2], [HIS.x + 0.08, HIS.y + 0.05, HIS.z], 56],
  [C.longer + 0.3, [2.72, 1.18, -0.05], [HIS.x + 0.08, HIS.y + 0.04, HIS.z], 56],
  [DURATION, [EYES.x, EYES.y, EYES.z], [HIS.x, HIS.y, HIS.z], 56],       // and back into your eyes: the first frame again
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

// ================= labels: four, big and calm =================
function labels(t) {
  tag("science", "🔬 SCIENCE", t, C.scientists, C.else + 0.4, 540, 400, "yellow");
  tag("eyes", "👀 EYE CONTACT", t, C.when + 0.1, C.eyes + 0.7, 540, 400, "yellow");
  tag("oxy", "💗 OXYTOCIN ↑", t, C.oxytocin - 0.45, C.baby + 0.1, 540, 400, "pink");
  tag("wolf", "🐺 WOLVES: NO BOOST", t, C.even, C.this + 0.45, 540, 400, "yellow");
}

// ================= sound: real recordings (see sfx/CREDITS.md) =================
const hasCrinkle = (await fetch("sfx/crinkle.wav", { method: "HEAD" }).catch(() => ({ ok: false }))).ok; // a real crinkle.wav replaces the stand-in
const sfx = createSfx(short);
sfx.loop(0, DURATION, "birds_2", { gain: 0.16, fadeIn: 0.15, fadeOut: 0.15 });
sfx.add(C.treat - 0.12, hasCrinkle ? "crinkle" : "crinkle_standin", { gain: 0.4, dur: 0.9, fadeOut: 0.3 });
sfx.add(1.9, "thump", { gain: 0.45 });                    // his tail on the floor
sfx.add(C.hugging + 0.5, "chime", { gain: 0.3, dur: 2.2, fadeOut: 0.9 });
sfx.add(C.hugging + 0.9, "thump", { gain: 0.4 });
sfx.loop(C.longer - 0.4, DURATION, "pad", { gain: 0.22, fadeIn: 2.6, fadeOut: 0.3 });

// ================= overlays =================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 }) // short lines: 76 px type fits about 21 characters;
const grainEl = document.getElementById("grain");
grainEl.style.opacity = "0";
document.getElementById("vignette").style.opacity = "0.18";

// ================= the glow: hearts travelling between your eyes and his, hearts rising =================
const _a = V(), _b = V(), _q = V();
const nearFade = (sprite) => clamp01((camera.position.distanceTo(sprite.position) - 0.6) / 0.8); // nothing glows on the lens
function drawGlow(t) {
  const g = glow(t);
  dog.updateMatrixWorld(true);
  owner.update();
  owner.updateMatrixWorld(true);
  _a.copy(dog.point("Head", [0, 0.07, 0.1]));
  _b.copy(headOf(owner, 0.05, 0.08));
  const visible = g > 0.002;
  for (let i = 0; i < TRAVEL; i++) {
    const dir = i % 2 ? 1 : -1;
    const u = (((i / TRAVEL) * 2 + dir * 0.16 * t) % 1 + 1) % 1;
    _q.lerpVectors(_a, _b, u);
    _q.y += Math.sin(Math.PI * u) * 0.12;
    const mid = ease.inOut(clamp01((u - 0.2) / 0.25)) * ease.inOut(clamp01((0.8 - u) / 0.25)); // never on top of an eye
    travel[i].position.copy(_q);
    travel[i].scale.setScalar(0.1 + 0.05 * Math.sin(Math.PI * u));
    travel[i].material.opacity = visible ? Math.min(1, g) * 0.95 * mid * nearFade(travel[i]) : 0;
  }
  const pulse = 1 + 0.12 * Math.sin(cyc(t, 21));
  eyeHalos[0].position.copy(_a);
  eyeHalos[1].position.copy(_b);
  for (const h of eyeHalos) {
    h.scale.setScalar(0.4 * pulse);
    h.material.opacity = visible ? Math.min(1, g) * 0.35 * nearFade(h) : 0;
  }
  // hearts: float up from between you while he "hugs you with his eyes" and as the looking goes on
  for (let i = 0; i < HEARTS; i++) {
    const born = i < 3 ? C.hugging + 0.1 + i * 0.5 : C.longer + 0.1 + (i - 3) * 0.38;
    const u = (t - born) / 1.7;
    const h = hearts[i];
    if (u < 0 || u > 1) { h.material.opacity = 0; continue; }
    _q.lerpVectors(_a, _b, 0.5 + 0.18 * Math.sin(i * 2.1));
    h.position.set(_q.x, _q.y + 0.08 + 0.4 * u, _q.z + 0.1 * Math.sin(i * 1.7 + u * 3));
    h.scale.setScalar(0.07 + 0.04 * Math.sin(Math.PI * u));
    h.material.opacity = 0.95 * Math.sin(Math.PI * u) * nearFade(h);
  }
}

// ================= speed: once everything has loaded, fuse the static scenery into a few meshes per material =================
let fused = false;
function fuseStatic(roots, skip) {
  scene.updateMatrixWorld(true);
  const buckets = new Map();
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
    });
  }
  let before = 0, after = 0;
  for (const list of buckets.values()) {
    before += list.length;
    if (list.length < 2) { after += 1; continue; }
    const merged = mergeGeometries(list.map((o) => o.geometry.clone().applyMatrix4(o.matrixWorld)), false);
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
    fuseStatic([house, yard], [frontDoor]);
  }
  owner.traverse((o) => o.isLight && (o.visible = false)); // the character file carries its own ambient light
  setDay({ exposure: 1.1 });
  dog.pose(dogState(t));
  applyOwner(t);
  owner.update();
  drawGlow(t);
  const k = window.__cam ?? track(t); // (a debug override for test shots)
  cam(V(k[0], k[1], k[2]), V(k[3], k[4], k[5]), k[6]);
  labels(t);
  hideUnusedTags();
  captions(t);
});

window.__dbg = { scene, camera, renderer, dog, owner, C, track, KEYS };
short.start();
