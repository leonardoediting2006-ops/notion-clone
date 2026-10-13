import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { loadAvatar } from "../../js/avatar.js";
import { createDog, DOG_COLORS } from "../../js/dog.js";
import { loadProp, useEnvironment, bookshelf, floorLamp, wallArt, cushion, coffeeTable, picketFence, hat, shoes, wallClock } from "../../js/props.js";
import { car } from "../../js/vehicles.js";
import { plushToy } from "../../js/toys.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { createLeash, sag } from "../dog-leash/leash.js";

// "This dog took a bullet for a girl he'd met three days earlier." — a hero-dog story short, 60 fps.
// Cold open on the climax (the leap, frozen mid-air), rewind to the shelter, then the three days.
// Every cut and action is keyed to a word of voiceover.srt; shots are pure functions of time.
// Sets (far apart): the family house + back yard (origin), the shelter (x = 200),
// the vet clinic (x = -200). Day scenes are sunny; the two nights are lamp-lit and bright.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
// the script says "…anyone to protect yet." (auto-captions heard "it")
if (/^it\.?$/i.test(words.at(-1).text)) words.at(-1).text = "yet.";
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function idx(word, nth = 1) {
  let n = 0;
  for (let i = 0; i < words.length; i++) if (norm(words[i].text) === norm(word) && ++n === nth) return i;
  throw new Error(`Cue "${word}" #${nth} not found in the voiceover`);
}
const at = (word, nth = 1) => words[idx(word, nth)].start;
const after = (word, nth = 1) => words[idx(word, nth)].end;
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 2.2) * FPS) / FPS;

const short = createShort({ duration: DURATION, fps: FPS, lights: false, fov: 50 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.02;
camera.far = 1500;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.5);

// ---------- word cues (seconds) ----------
const C = {
  this: at("this"), dog: at("dog"), took: at("took"), bullet: at("bullet"), for: at("for"), girl: at("girl"),
  hed: at("he'd"), met: at("met"), three: at("three"), earlier: at("earlier"),
  three2: at("three", 2), days2: at("days", 2), earlier2: at("earlier", 2),
  nobody: at("nobody"), wanted: at("wanted"), hed2: at("he'd", 2), eleven: at("11"), months: at("months"),
  everyone: at("everyone"), walked: at("walked"), past: at("past"), cage: at("cage"),
  then: at("then"), little: at("little"), girl2: at("girl", 2), stopped: at("stopped"), sat: at("sat"), floor: at("floor"),
  and: at("and"), came: at("came"), bars: at("bars"),
  her: at("her"), dad: at("dad"), said2: at("said", 2), stop: at("stop"), no: at("no"), she: at("she"), cried: at("cried"), until: at("until"), yes: at("yes"),
  on2: at("on", 2), second: at("second"), night: at("night"), wouldnt: at("wouldn't"), growling: at("growling"), at: at("at"), window: at("window"),
  they: at("they"), almost: at("almost"), back: at("back"),
  on3: at("on", 3), third: at("third"), night2: at("night", 2), someone: at("someone"), broke: at("broke"), in: at("in"),
  he3: at("he", 4), didnt: at("didn't"), hesitate: at("hesitate"),
  vet: at("the", 6), might: at("might"), make: at("make"),
  she2: at("she", 2), slept: at("slept"), clinic: at("clinic"), holding: at("holding"), paw: at("paw"), all: at("all"), night3: at("night", 3),
  shelter: at("the", 8), called: at("called"), dangerous: at("dangerous"),
  hejust: at("he", 6), hadnt: at("hadn't"), found: at("found"), protect: at("protect"), yet: at("yet"),
};
const LINES = [
  "This dog took", "a bullet", "for a girl", "he'd met three", "days earlier.",
  "Three days", "earlier.", "Nobody", "wanted him.", "He'd been there", "11 months.",
  "Everyone walked", "past his cage.", "Then a little", "girl stopped,", "sat on the floor,",
  "and he came", "to the bars.", "Her dad", "said no.", "She cried", "until he", "said yes.",
  "On the", "second night,", "he wouldn't", "stop growling", "at the window.", "They almost", "took him back.",
  "On the third", "night,", "someone", "broke in.", "He didn't", "hesitate.",
  "The vet said", "he might not", "make it.", "She slept on", "the clinic floor,", "holding his paw", "all night.",
  "The shelter", "called him", "dangerous.", "He just hadn't", "found anyone", "to protect yet.",
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
// the front door (closed)
{
  const d = group((FD.x0 + FD.x1) / 2, 0, FZ, house);
  box(FD.x1 - FD.x0 - 0.04, 2.13, 0.05, T.paintedWood(0x8a3a2e), 0, 1.065, 0, d);
  mesh(new THREE.SphereGeometry(0.032, 16, 12), M.brass, 0.32, 1.0, -0.06, d);
}
// the living room: sofa facing the window, rug, coffee table, lamp, shelves, plants, art, photos
place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.3 }), 0.1, 0, 1.95, Math.PI);
floorPlane(3.2, 2.3, M.rug, 0.1, 0.008, 0.55, house);
place(coffeeTable(), 0.1, 0, 0.55);
place(floorLamp(), -1.35, 0, 2.25);
place(bookshelf({ w: 1.2, h: 1.95, seed: 7 }), RX - 0.2, 0, 0.6, -Math.PI / 2);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.25 }), -2.75, 0, -3.55);
place(loadProp(short, "SheenChair", { height: 0.95 }), -2.35, 0, 1.6, 2.4);
place(loadProp(short, "GlassVaseFlowers", { height: 0.4 }), 0.25, 0.42, 0.5);
place(wallArt({ w: 0.9, h: 0.6, style: "landscape", seed: 2 }), RX - 0.02, 1.65, -0.9, -Math.PI / 2);
place(wallArt({ w: 0.45, h: 0.6, style: "sunset", seed: 5 }), LX + 0.02, 1.55, 0.6, Math.PI / 2);
place(wallArt({ w: 0.5, h: 0.65, style: "abstract", seed: 4 }), LX + 0.02, 1.55, -2.7, Math.PI / 2);
place(wallClock({ hours: 23.2 }), 0.3, 2.0, BZ + 0.08);
for (const [x, c, r] of [[-0.6, 0xd98a4a, 0.15], [0.1, 0x3d6b7a, -0.1], [0.8, 0xe8d8bd, 0.2]]) {
  const cu = place(cushion({ color: c }), x, 0.68, 2.2);
  cu.rotation.set(0.3, Math.PI, r);
}
// framed family photos on a console under the clock
box(1.3, 0.05, 0.38, M.wood, 0.3, 0.8, BZ + 0.3, house);
for (const x of [-0.25, 0.85]) box(0.05, 0.8, 0.34, M.wood, x, 0.4, BZ + 0.3, house);
for (const [x, h] of [[0.0, 0.22], [0.35, 0.28], [0.65, 0.18]]) {
  const f = box(0.17, h, 0.02, mat(0x2a1d14), x, 0.83 + h / 2, BZ + 0.36, house);
  f.rotation.x = -0.12;
}
// ceiling light fixture + a pendant
mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0xfff1dc }), 0, H - 0.02, -0.9, house);
// his new dog bed by the picture window
const DOGBED = V(-2.15, 0, -2.75);
{
  const g = group(DOGBED.x, 0, DOGBED.z, house);
  const rim = mesh(new THREE.TorusGeometry(0.4, 0.11, 14, 36), T.fabric(0x6f93b0, { key: 'dogbed', weave: 4 }), 0, 0.1, 0, g);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.15, 1, 1);
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 36), T.fabric(0xefe6d6, { key: 'dogbedin', weave: 5 }), 0, 0.04, 0, g).scale.set(1.15, 1, 1);
}
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

// ================= THE BACK YARD (z < -4.2): lawn, fence, lane with a streetlamp, trees =================
const yard = group(0, 0, 0, scene);
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
  roofL.rotation.x = 0.5;
  const roofR = box(7.4, 0.15, 4.2, M.shingles, 0, H + 0.95, FZ - 1.6, house);
  roofR.rotation.x = -0.5;
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

// ================= THE SHELTER (sunny day), centred on x = 200 =================
const SX = 200;
const shelter = group(SX, 0, 0, scene);
floorPlane(80, 60, M.asphalt, 0, 0, 10, shelter);
floorPlane(4, 9, M.concrete, 0, 0.01, 4, shelter);
floorPlane(30, 6, M.grass, 0, 0.005, -3.5, shelter);
const shelterSign = canvasTex(1024, 512, (x, w, h) => {
  x.fillStyle = "#1f5a46";
  x.fillRect(0, 0, w, h);
  x.strokeStyle = "#f3ecd2";
  x.lineWidth = 10;
  x.strokeRect(14, 14, w - 28, h - 28);
  x.fillStyle = "#f8f3e0";
  x.textAlign = "center";
  x.font = "bold 150px Georgia, serif";
  x.fillText("ANIMAL", w / 2 + 80, 200);
  x.fillText("SHELTER", w / 2 + 80, 350);
  x.font = "italic 52px Georgia, serif";
  x.fillText("adopt  •  love  •  rescue", w / 2 + 80, 440);
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
{
  box(16, 3.8, 6, M.block, 0, 1.9, -3.2, shelter);
  box(16.4, 0.35, 1.4, mat(0x2f6b55), 0, 3.85, 0.35, shelter); // green canopy
  box(1.9, 2.35, 0.04, new THREE.MeshPhysicalMaterial({ color: 0x2b3d4c, roughness: 0.05, metalness: 0.4 }), 0, 1.18, -0.18, shelter);
  box(1.96, 2.41, 0.06, mat(0x6d7378, { metalness: 0.6, roughness: 0.4 }), 0, 1.2, -0.2, shelter);
  box(2.4, 1.2, 0.1, mat(0x1f5a46), 0, 3.05, -0.1, shelter);
  plane(2.34, 1.15, new THREE.MeshBasicMaterial({ map: shelterSign }), 0, 3.05, -0.045, 0, shelter);
  for (const s of [-1, 1]) {
    box(1.5, 1.1, 0.03, new THREE.MeshPhysicalMaterial({ color: 0x3a5060, roughness: 0.05, metalness: 0.4 }), s * 4, 1.7, -0.18, shelter);
    box(1.6, 1.2, 0.05, mat(0x6d7378), s * 4, 1.7, -0.2, shelter);
  }
  // paw-print banner + planters + a bench
  for (const s of [-1, 1]) {
    box(0.9, 0.5, 0.5, mat(0x8a6a4a), s * 1.6, 0.25, 0.6, shelter);
    const b = createForest(shelter);
    b.bush(SX * 0 + s * 1.6, 0.6, 0.7);
    b.build();
  }
  box(1.6, 0.08, 0.45, M.wood, -6, 0.45, 0.8, shelter);
  for (const x of [-6.7, -5.3]) box(0.08, 0.45, 0.4, mat(0x30343a), x, 0.22, 0.8, shelter);
  // fenced dog run on the side
  const link = canvasTex(256, 256, (x) => {
    x.clearRect(0, 0, 256, 256);
    x.strokeStyle = "rgba(200,205,210,1)";
    x.lineWidth = 5;
    for (let i = -256; i < 512; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke();
      x.beginPath(); x.moveTo(i + 256, 0); x.lineTo(i, 256); x.stroke();
    }
  }, { repeat: [10, 1] });
  const fenceMat = new THREE.MeshStandardMaterial({ map: link, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
  for (const s of [-1, 1]) {
    mesh(new THREE.PlaneGeometry(10, 1.8), fenceMat, s * 13, 0.9, 1.0, shelter);
    for (let i = 0; i <= 5; i++) box(0.05, 1.9, 0.05, mat(0x8a8f94, { metalness: 0.6 }), s * 13 - 5 + i * 2, 0.95, 1.0, shelter);
  }
  const c1 = car("sedan", { color: 0x5a7690 });
  c1.position.set(-5.5, 0, 8.5);
  c1.rotation.y = Math.PI / 2;
  shelter.add(c1);
  const c2 = car("hatchback", { color: 0xc8a23a });
  c2.position.set(5.8, 0, 8.2);
  c2.rotation.y = -Math.PI / 2;
  shelter.add(c2);
  const sf = createForest(shelter);
  for (let i = 0; i < 10; i++) sf.tree(-27 + i * 6 + rr(-1, 1), rr(-11, -8), { height: rr(3, 3.8), scale: rr(1.5, 2) });
  sf.build();
}

// kennel corridor inside (bright tubes + skylights), at (SX, 0, KZ): kennels on the -z side
const KZ = -40;
const kennels = group(SX, 0, KZ, scene);
floorPlane(14, 8, M.kennelFloor, 0, 0.002, -1, kennels);
box(14, 0.08, 8, M.ceiling, 0, 2.85, -1, kennels);
box(14, 2.9, 0.15, M.block, 0, 1.45, 2.5, kennels); // corridor wall opposite the kennels
box(14, 2.9, 0.15, M.block, 0, 1.45, -2.2, kennels); // back wall of the kennels
for (const x of [-7, 7]) box(0.15, 2.9, 4.8, M.block, x, 1.45, 0.15, kennels);
// tube lights + skylights
for (let i = -2; i <= 2; i++) {
  box(1.3, 0.05, 0.18, new THREE.MeshBasicMaterial({ color: 0xffffff }), i * 2.6, 2.8, 1.1, kennels);
  box(1.0, 0.04, 0.7, new THREE.MeshBasicMaterial({ color: 0xe6f2ff }), i * 2.6 + 1.3, 2.82, -1.2, kennels);
}
// kennel walls + bar fronts (each kennel 1.7 wide, 2.2 deep), Max's kennel at local x = 0
const KW = 1.7;
const barMat = mat(0x9aa3ab, { metalness: 0.8, roughness: 0.35 });
const kennelDoor = group(0, 0, 0, kennels);
for (let k = -3; k <= 3; k++) {
  const cx = k * KW;
  box(0.08, 1.3, 2.2, M.block, cx - KW / 2, 0.65, -1.1, kennels); // low divider wall
  for (const s of [-1, 1]) box(0.05, 1.9, 0.05, barMat, cx + s * (KW / 2 - 0.03), 0.95, 0, kennels);
  box(KW, 0.05, 0.05, barMat, cx, 1.9, 0, kennels);
  box(KW, 0.04, 0.04, barMat, cx, 0.05, 0, kennels);
  const g = k === 0 ? kennelDoor : kennels;
  const ox = k === 0 ? -KW / 2 + 0.05 : cx; // the door swings on its left edge
  if (k === 0) kennelDoor.position.set(-KW / 2 + 0.05, 0, 0);
  for (let i = 0; i < 15; i++) {
    const bx = (k === 0 ? 0.05 + i * 0.105 : -KW / 2 + 0.1 + i * 0.105);
    box(0.018, 1.8, 0.018, barMat, k === 0 ? bx : cx + bx, 0.95, 0, g);
  }
  box(KW - 0.1, 0.03, 0.03, barMat, k === 0 ? KW / 2 - 0.05 : cx, 1.05, 0, g);
  // a bowl and a worn blanket in each kennel
  mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.07, 20), M.steel, cx + 0.45, 0.035, -0.4, kennels);
  if (k !== 0) floorPlane(0.9, 0.7, T.fabric([0x8a6f5a, 0x5a7a8a, 0x9a8a6a][(k + 3) % 3], { key: "kb" + k, weave: 3 }), cx - 0.2, 0.01, -1.5, kennels);
}
floorPlane(0.9, 0.7, T.fabric(0x6d6458, { key: "maxblanket", weave: 3 }), -0.3, 0.01, -1.6, kennels);
const kennelOpen = (o) => (kennelDoor.rotation.y = -o * 1.6);
// "adopt me" posters on the corridor wall
for (const [x, s] of [[-3.5, 1], [-0.6, 2], [2.6, 3]]) place(wallArt({ w: 0.6, h: 0.8, style: "abstract", seed: 20 + s }), x, 1.6, 2.42, Math.PI, kennels);
// Max's kennel card, clipped to the bars
function kennelCard(stamp = 1) {
  return canvasTex(512, 700, (x, w, h) => {
    x.fillStyle = "#fbf8ef";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#1f5a46";
    x.fillRect(0, 0, w, 110);
    x.fillStyle = "#fff";
    x.font = "bold 64px Georgia, serif";
    x.textAlign = "center";
    x.fillText("MAX", w / 2, 82);
    x.fillStyle = "#222";
    x.textAlign = "left";
    x.font = "34px Georgia, serif";
    x.fillText("Breed:  Mixed", 36, 170);
    x.fillText("Age:  2 years", 36, 220);
    x.fillText("Here since:", 36, 280);
    x.font = "bold 58px Georgia, serif";
    x.fillStyle = "#b5241c";
    x.fillText("11 MONTHS", 36, 345);
    x.fillStyle = "#222";
    x.font = "30px Georgia, serif";
    x.fillText("Notes: growls at strangers.", 36, 410);
    if (stamp) {
      x.save();
      x.translate(w / 2, 560);
      x.rotate(-0.12);
      x.strokeStyle = "rgba(200,30,25,0.92)";
      x.lineWidth = 10;
      x.strokeRect(-210, -70, 420, 140);
      x.fillStyle = "rgba(200,30,25,0.92)";
      x.font = "bold 66px Arial, sans-serif";
      x.textAlign = "center";
      x.fillText("DANGEROUS", 0, 0);
      x.font = "bold 30px Arial, sans-serif";
      x.fillText("DO NOT ADOPT", 0, 46);
      x.restore();
    }
  });
}
const cardTex = kennelCard(1);
const card = plane(0.21, 0.29, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.7 }), 0.45, 1.25, 0.03, 0, kennelDoor);
box(0.05, 0.03, 0.02, M.steel, 0.45, 1.39, 0.03, kennelDoor);

// ================= THE VET CLINIC (morning), centred on x = -200 =================
const VX = -200;
const clinic = group(VX, 0, 0, scene);
floorPlane(6, 6, M.vinyl, 0, 0.002, 0, clinic);
box(6, 0.06, 6, M.ceiling, 0, 2.75, 0, clinic);
wallX(-3, -3, 3, [[-1.6, 0.2, 0.9, 2.2]], T.plaster(0xdfe9ec, [0.5, 0.5]), 0.12, clinic); // back wall, window
wallZ(-3, -3, 3, [], T.plaster(0xdfe9ec, [0.5, 0.5]), 0.12, clinic);
wallZ(3, -3, 3, [[-1.0, 0.0, 0, 2.15]], T.plaster(0xdfe9ec, [0.5, 0.5]), 0.12, clinic);
wallX(3, -3, 3, [], T.plaster(0xdfe9ec, [0.5, 0.5]), 0.12, clinic);
// window with half-open blinds (morning light comes through in stripes)
const blinds = group(-0.7, 0, -2.95, clinic);
for (let i = 0; i < 16; i++) {
  const s = box(1.8, 0.012, 0.07, mat(0xf4f4f0), 0, 0.95 + i * 0.08, 0, blinds);
  s.rotation.x = 0.9;
}
plane(1.8, 1.3, new THREE.MeshBasicMaterial({ color: 0xfff1d8 }), -0.7, 1.55, -3.1, 0, clinic);
// exam table
const TABLE = V(0, 0.86, -0.6);
{
  box(1.3, 0.05, 0.7, M.steel, TABLE.x, TABLE.y - 0.025, TABLE.z, clinic);
  box(0.12, 0.8, 0.12, M.steel, TABLE.x, 0.42, TABLE.z, clinic);
  box(0.7, 0.06, 0.5, M.steel, TABLE.x, 0.05, TABLE.z, clinic);
  floorPlane(1.0, 0.55, M.blanket, TABLE.x, TABLE.y + 0.003, TABLE.z, clinic);
}
// cabinets, sink, jars, a poster
box(2.4, 0.9, 0.6, mat(0xf0f2f3, { roughness: 0.5 }), 1.6, 0.45, -2.65, clinic);
box(2.44, 0.04, 0.64, mat(0x9aa6ad, { roughness: 0.3 }), 1.6, 0.92, -2.65, clinic);
box(2.4, 0.7, 0.35, mat(0xf0f2f3, { roughness: 0.5 }), 1.6, 1.9, -2.8, clinic);
for (const [x, c] of [[1.0, 0x9fd0e8], [1.25, 0xf2d48a], [1.5, 0xe89a9a]]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 16), mat(c, { transparent: true, opacity: 0.85, roughness: 0.1 }), x, 1.03, -2.6, clinic);
place(wallArt({ w: 0.6, h: 0.8, style: "abstract", seed: 31 }), -2.92, 1.6, 0.4, Math.PI / 2, clinic);
// heart monitor on a stand (screen redrawn every frame)
const ecgCanvas = document.createElement("canvas");
ecgCanvas.width = 512;
ecgCanvas.height = 320;
const ecgTex = new THREE.CanvasTexture(ecgCanvas);
ecgTex.colorSpace = THREE.SRGBColorSpace;
const monitor = group(0.95, 0, -1.1, clinic);
box(0.04, 1.3, 0.04, M.steel, 0, 0.65, 0, monitor);
box(0.45, 0.05, 0.45, M.steel, 0, 0.03, 0, monitor);
box(0.42, 0.3, 0.12, mat(0x2a2e33), 0, 1.42, 0, monitor);
plane(0.38, 0.24, new THREE.MeshBasicMaterial({ map: ecgTex, toneMapped: false }), 0, 1.42, 0.061, 0, monitor);
monitor.rotation.y = -0.6;
function drawEcg(t, bpm = 96, weak = 0) {
  const x = ecgCanvas.getContext("2d"), w = 512, h = 320;
  x.fillStyle = "#06120c";
  x.fillRect(0, 0, w, h);
  x.strokeStyle = "rgba(60,120,80,0.35)";
  x.lineWidth = 1;
  for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  for (let j = 0; j < h; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
  x.strokeStyle = "#5cff8a";
  x.lineWidth = 4;
  x.beginPath();
  const beat = 60 / bpm, span = 3.0;
  for (let i = 0; i <= w; i += 2) {
    const tt = t - span + (i / w) * span;
    const ph = ((tt % beat) + beat) % beat / beat;
    let y = 0;
    const amp = 1 - weak * 0.5;
    if (ph > 0.1 && ph < 0.14) y = 0.12 * Math.sin((ph - 0.1) / 0.04 * Math.PI);
    if (ph > 0.2 && ph < 0.22) y = -0.15 * amp;
    if (ph > 0.22 && ph < 0.25) y = 1.0 * amp;
    if (ph > 0.25 && ph < 0.28) y = -0.3 * amp;
    if (ph > 0.4 && ph < 0.5) y = 0.2 * Math.sin((ph - 0.4) / 0.1 * Math.PI) * amp;
    const py = h * 0.55 - y * h * 0.35;
    if (i === 0) x.moveTo(i, py);
    else x.lineTo(i, py);
  }
  x.stroke();
  x.fillStyle = "#5cff8a";
  x.font = "bold 54px monospace";
  x.fillText(String(Math.round(bpm)), w - 120, 60);
  x.font = "26px monospace";
  x.fillText("HR", w - 170, 60);
  ecgTex.needsUpdate = true;
}
// recovery corner: his blanket on the floor where she slept
const RECOV = V(-1.2, 0, 1.0);
floorPlane(1.3, 0.9, M.blanket, RECOV.x, 0.008, RECOV.z, clinic);
mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), M.steel, RECOV.x + 1.2, 0.9, RECOV.z - 0.6, clinic); // IV pole
box(0.12, 0.2, 0.04, mat(0xdfeef5, { transparent: true, opacity: 0.8 }), RECOV.x + 1.2, 1.7, RECOV.z - 0.6, clinic);
const dawnLight = new THREE.DirectionalLight(0xffd8a0, 0);
dawnLight.castShadow = true;
dawnLight.shadow.mapSize.set(2048, 2048);
Object.assign(dawnLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
dawnLight.shadow.bias = -0.0004;
dawnLight.position.set(VX - 2.5, 4.5, -7);
dawnLight.target.position.set(VX - 0.6, 0, 0.5);
scene.add(dawnLight, dawnLight.target);

// ================= cast =================
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
const dog = heroDog(DOG_COLORS.golden, "hero");
scene.add(dog);
// other dogs at the shelter
const dogB = heroDog(DOG_COLORS.wolf, "wolf", 0.78);
const dogC = heroDog({ body: 0x2b2420, light: 0xd9cfc2, dark: 0x16110e }, "black", 0.62);
scene.add(dogB, dogC);
const DOGS = [dog, dogB, dogC];
// his new red collar (from the day he's adopted) and, after that night, a bandage round his chest
const collar = group(0, 0, 0, dog.neck);
box(0.44, 0.08, 0.14, M.collar, 0, -0.04, -0.02, collar);
box(0.07, 0.08, 0.02, M.brass, 0, -0.1, 0.06, collar);
const bandage = group(0, 0.22, 0.52, dog.pivot);
{
  const wrap = mesh(new THREE.CylinderGeometry(1, 1, 0.2, 4, 1, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), M.bandage, 0, 0, 0, bandage);
  wrap.scale.set(0.335, 0.305, 1);
  wrap.material.side = THREE.DoubleSide;
  const pad = box(0.02, 0.16, 0.16, M.bandage, 0.24, 0.02, 0.02, bandage);
  pad.rotation.z = 0.05;
}

const girl = loadAvatar(short, "Female_Child_01");
girl.loadClip("m_walk_neutral_01");
const dad = loadAvatar(short, "Male_Adult_08");
dad.loadClip("m_walk_neutral_01");
dad.loadClip("m_idle_neutral_01");
const vet = loadAvatar(short, "Medical_Female_01");
vet.loadClip("m_idle_neutral_01");
const thief = loadAvatar(short, "Delivery_Male_01");
thief.loadClip("m_walk_neutral_01");
const visitor = loadAvatar(short, "Female_Adult_01");
visitor.loadClip("m_walk_neutral_01");
const visitorKid = loadAvatar(short, "Female_Child_02");
visitorKid.loadClip("m_walk_neutral_01");
const PEOPLE = [girl, dad, vet, thief, visitor, visitorKid];
scene.add(...PEOPLE);
// the intruder: dark clothes, black beanie and gloves
short.track(new Promise((ok) => {
  const wait = () => {
    if (!thief.ready) return setTimeout(wait, 50);
    thief.traverse((o) => {
      if (!o.isMesh) return;
      [].concat(o.material).forEach((m) => {
        if (/head/i.test(m.name) || /head/i.test(m.map?.image?.src ?? "")) m.color.setHex(0xd9cfc6);
        else m.color.setHex(0x2c2e33);
      });
    });
    ok();
  };
  wait();
}));
thief.attach("head", hat("beanie", { color: 0x16171a }), [0, 0.07, -0.01]);
// his pistol (right hand). In the hand's rest frame the barrel points down (the arm hangs).
const gun = group(0, 0, 0);
{
  box(0.032, 0.17, 0.036, M.darkSteel, 0, -0.06, 0, gun); // slide/barrel along -y
  const grip = box(0.03, 0.1, 0.04, M.darkSteel, 0, 0.0, -0.045, gun);
  grip.rotation.x = 0.25;
  box(0.008, 0.03, 0.025, M.darkSteel, 0, -0.03, -0.03, gun);
}
const MUZZLE = [0, -0.155, 0]; // gun-local
thief.attach("handR", gun, [0.0, -0.06, 0.03]);
gun.rotation.set(0, 0, 0);
const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(muzzle);
// the adoption folder in dad's hand and the leash
const folder = box(0.24, 0.32, 0.015, mat(0x2f6b55), 0, 0, 0);
dad.attach("handL", folder, [0.02, -0.12, 0.05]);
const leash = createLeash({ color: 0xc8261e });
scene.add(leash);
// broken glass: shards that fly in from the pane (pure function of time)
const shards = [];
{
  const sm = new THREE.MeshPhysicalMaterial({ color: 0xdfeefa, roughness: 0.05, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, metalness: 0.2 });
  for (let i = 0; i < 46; i++) {
    const s = rr(0.02, 0.07);
    const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(s, rr(-s, s) * 0.4, 0), V(rr(0, s), s * rr(0.6, 1.3), 0)]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, sm);
    m.userData = { p: V(rr(-0.4, 0.4), rr(-0.4, 0.4), 0), v: V(rr(-0.6, 0.6), rr(-0.2, 1.2), rr(0.6, 2.4)), w: V(rr(-14, 14), rr(-14, 14), rr(-14, 14)) };
    scene.add(m);
    shards.push(m);
  }
}
function shardsAt(dt) {
  const show = dt >= 0;
  const origin = backDoor.localToWorld(V(PANE.x, PANE.y, 0));
  for (const s of shards) {
    s.visible = show;
    if (!show) continue;
    const { p, v, w } = s.userData;
    const pos = origin.clone().add(V(p.x * PANE.w, p.y * PANE.h, 0.02)).addScaledVector(v, dt);
    pos.y -= 4.9 * dt * dt;
    const floorY = 0.005;
    if (pos.y < floorY) pos.y = floorY;
    s.position.copy(pos);
    const spin = pos.y > floorY + 0.001 ? dt : Math.sqrt(Math.max(0, (origin.y + p.y * PANE.h) / 4.9));
    s.rotation.set(w.x * spin, w.y * spin, w.z * spin);
  }
}
// the girl's crayon drawing for the fridge: "MY HERO"
const drawingTex = canvasTex(512, 640, (x, w, h) => {
  x.fillStyle = "#fffdf7";
  x.fillRect(0, 0, w, h);
  x.lineCap = "round";
  x.lineJoin = "round";
  const crayon = (c, wdt) => { x.strokeStyle = c; x.lineWidth = wdt; };
  // sun
  crayon("#f2b51c", 10);
  x.beginPath(); x.arc(420, 90, 45, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; x.beginPath(); x.moveTo(420 + Math.cos(a) * 60, 90 + Math.sin(a) * 60); x.lineTo(420 + Math.cos(a) * 85, 90 + Math.sin(a) * 85); x.stroke(); }
  // dog: brown/white beagle with a red cape
  crayon("#d0261e", 12);
  x.beginPath(); x.moveTo(170, 300); x.lineTo(90, 420); x.lineTo(210, 380); x.closePath(); x.stroke();
  x.fillStyle = "rgba(208,38,30,0.6)"; x.fill();
  crayon("#8a4f24", 12);
  x.beginPath(); x.ellipse(250, 360, 110, 60, 0, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(360, 290, 50, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.ellipse(325, 300, 18, 40, 0.3, 0, Math.PI * 2); x.stroke();
  for (const lx of [180, 220, 290, 330]) { x.beginPath(); x.moveTo(lx, 410); x.lineTo(lx, 470); x.stroke(); }
  x.beginPath(); x.moveTo(140, 340); x.lineTo(100, 290); x.stroke();
  crayon("#222", 8);
  x.beginPath(); x.arc(372, 280, 5, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(405, 300, 7, 0, Math.PI * 2); x.stroke();
  // bandage
  crayon("#9fa4a8", 10);
  x.beginPath(); x.moveTo(230, 305); x.lineTo(230, 415); x.stroke();
  // girl
  crayon("#e0479a", 12);
  x.beginPath(); x.moveTo(90, 470); x.lineTo(60, 600); x.lineTo(130, 600); x.closePath(); x.stroke();
  crayon("#e8b48a", 10);
  x.beginPath(); x.arc(95, 440, 30, 0, Math.PI * 2); x.stroke();
  crayon("#e2c04a", 10);
  x.beginPath(); x.moveTo(70, 425); x.lineTo(55, 470); x.stroke();
  // heart + text
  crayon("#e8455a", 10);
  x.beginPath(); x.moveTo(250, 250); x.bezierCurveTo(250, 215, 200, 215, 200, 245); x.bezierCurveTo(200, 270, 250, 290, 250, 300); x.bezierCurveTo(250, 290, 300, 270, 300, 245); x.bezierCurveTo(300, 215, 250, 215, 250, 250); x.stroke();
  x.fillStyle = "#2a62c9";
  x.font = "bold 76px 'Comic Sans MS', 'Comic Neue', cursive";
  x.save(); x.translate(40, 170); x.rotate(-0.05); x.fillText("MY HERO", 0, 0); x.restore();
  x.font = "bold 40px 'Comic Sans MS', 'Comic Neue', cursive";
  x.fillStyle = "#8a4f24";
  x.fillText("MAX", 300, 560);
});
const drawing = plane(0.3, 0.375, new THREE.MeshStandardMaterial({ map: drawingTex, roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0, 0, scene);
const fridgeCard = plane(0.21, 0.29, new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.7 }), 0, 0, 0, 0, fridge);
fridgeCard.position.set(0.12, 1.42, 0.356);
fridgeCard.rotation.z = 0.06;
for (const [x, y, c] of [[0.12, 1.57, 0xe84a3a], [-0.2, 1.2, 0x3a8ae8], [0.25, 1.05, 0xf2c94c], [-0.15, 1.62, 0x5ac46a]]) {
  mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 16).rotateX(Math.PI / 2), mat(c, { roughness: 0.4 }), x, y, 0.36, fridge);
}
const school = plane(0.2, 0.26, new THREE.MeshStandardMaterial({ map: canvasTex(256, 330, (x, w, h) => {
  x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#2a62c9"; x.font = "bold 30px sans-serif"; x.fillText("SCHOOL", 40, 50);
  x.fillStyle = "#888"; for (let i = 0; i < 9; i++) x.fillRect(30, 80 + i * 26, 160 + (i * 37) % 40, 6);
}), roughness: 0.9 }), -0.18, 1.12, 0.357, 0, fridge);
school.rotation.z = -0.08;

// ---------- shadows ----------
scene.traverse((o) => {
  if (!o.isMesh) return;
  const basic = o.material?.isMeshBasicMaterial;
  o.castShadow = !basic;
  o.receiveShadow = !basic;
});
house.traverse((o) => {
  if (o.isMesh && o.material === M.glass) o.castShadow = false;
});
for (const s of shards) s.castShadow = false;

// ---------- overlays ----------
const captions = wordCaptions(document.getElementById("caption"), words, { lines: LINES });
const flashEl = document.getElementById("flash");
const fadeEl = document.getElementById("fade");
const grainEl = document.getElementById("grain");
const vignetteEl = document.getElementById("vignette");
const titleEl = document.getElementById("title");
const rewindEl = document.getElementById("rewind");
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
const fade = (o, color = "#000") => {
  fadeEl.style.background = color;
  fadeEl.style.opacity = String(clamp01(o));
};
function title(text, o) {
  titleEl.textContent = text;
  titleEl.style.opacity = String(clamp01(o));
}

// ---------- camera ----------
function look(px, py, pz, tx, ty, tz, fov = 50, roll = 0) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(tx, ty, tz);
}
const lookAt = (p, tgt, fov = 50, roll = 0) => look(p.x, p.y, p.z, tgt.x, tgt.y, tgt.z, fov, roll);
function orbit(target, yaw, dist, height, fov, lookY = 0, roll = 0) {
  look(target.x + Math.sin(yaw) * dist, target.y + height, target.z + Math.cos(yaw) * dist, target.x, target.y + lookY, target.z, fov, roll);
}
const handshake = (t, amt) => [Math.sin(t * 1.3) * amt + Math.sin(t * 2.9) * amt * 0.5, Math.cos(t * 1.1) * amt * 0.8];
const jolt = (t, t0, amt) => {
  const p = t - t0;
  if (p < 0 || p > 0.5) return [0, 0];
  const k = amt * Math.exp(-p * 9);
  return [Math.sin(p * 70) * k, Math.cos(p * 63) * k];
};
// points on the dog (dog-space metres relative to a bone)
const dogHead = (d = dog, off = [0, 0.0, 0.06]) => d.point("Head", off);
const dogEyes = (d = dog) => d.point("Head", [0, 0.0, 0.09]);
const dogNose = (d = dog) => d.point("Head", [0, -0.04, 0.17]);
const dogChest = (d = dog) => d.point("Spine2", [0, -0.06, 0.02]);
const pawL = (d = dog) => d.point("L_Hand", [0, -0.04, 0.02]);
const pawR = (d = dog) => d.point("R_Hand", [0, -0.04, 0.02]);
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

// ---------- environments ----------
const LIGHTS = [hemi, sun, moonLight, roomLamp, hallLamp, sofaLamp, streetLamp, fill, fill2, flashLight, tubeLights, tubeLights2, nightLight, dawnLight];
let grade = "";
function setEnv(kind, { exposure = 1.0, grain = 0.03, vignette = 0.45, gray = 0, warm = 0 } = {}) {
  for (const l of LIGHTS) l.visible = false;
  renderer.toneMappingExposure = exposure;
  scene.fog = null;
  hemi.visible = true;
  moon.visible = false;
  lampGlow.visible = lampBulb.visible = false;
  skyMat.map = skyDay;
  let env = 0.5;
  if (kind === "night") {
    // the house at night: every lamp on, bright and warm; deep blue outside
    skyMat.map = skyNight;
    moon.visible = true;
    moon.position.set(-60, 120, -260);
    hemi.color.set(0x8a9cc8);
    hemi.groundColor.set(0x1a1612);
    hemi.intensity = 0.28;
    roomLamp.visible = hallLamp.visible = sofaLamp.visible = nightLight.visible = true;
    roomLamp.intensity = 26;
    hallLamp.intensity = 9;
    sofaLamp.intensity = 7;
    moonLight.visible = true;
    moonLight.intensity = 0.5;
    moonLight.position.set(-6, 9, -16);
    moonLight.target.position.set(-1, 0, -3);
    streetLamp.visible = true;
    lampGlow.visible = lampBulb.visible = true;
    scene.background = new THREE.Color(0x0d1626);
    env = 0.3;
    grade = "saturate(1.05) contrast(1.05)";
  } else if (kind === "yardNight") {
    skyMat.map = skyNight;
    moon.visible = true;
    moon.position.set(40, 110, 260);
    hemi.color.set(0x6f86b8);
    hemi.groundColor.set(0x10141c);
    hemi.intensity = 0.45;
    moonLight.visible = true;
    moonLight.intensity = 1.3;
    roomLamp.intensity = 26;
    hallLamp.intensity = 9;
    sofaLamp.intensity = 7;
    moonLight.position.set(5, 10, 6);
    moonLight.target.position.set(0, 0, -6);
    roomLamp.visible = hallLamp.visible = sofaLamp.visible = true;
    streetLamp.visible = true;
    lampGlow.visible = lampBulb.visible = true;
    scene.background = new THREE.Color(0x0d1626);
    env = 0.25;
    grade = "saturate(1.0) contrast(1.06)";
  } else if (kind === "day") {
    hemi.color.set(0xfff6e8);
    hemi.groundColor.set(0x7a6a55);
    hemi.intensity = 1.3;
    sun.visible = true;
    sun.intensity = 4.2;
    sun.position.set(7, 9, 9);
    sun.target.position.set(0, 0, -1);
    scene.background = new THREE.Color(0xbcd6ee);
    env = 0.6;
    grade = "saturate(1.08) contrast(1.03) brightness(1.02)";
  } else if (kind === "yardDay") {
    hemi.color.set(0xfff2dc);
    hemi.groundColor.set(0x6f7a50);
    hemi.intensity = 1.4;
    sun.visible = true;
    sun.intensity = 4.4;
    sun.position.set(-6, 7, -14);
    sun.target.position.set(0.5, 0, -6);
    scene.background = new THREE.Color(0xbcd6ee);
    env = 0.6;
    grade = "saturate(1.12) contrast(1.03) sepia(0.06)";
  } else if (kind === "shelter") {
    hemi.color.set(0xfff6e8);
    hemi.groundColor.set(0x7a6a55);
    hemi.intensity = 1.3;
    sun.visible = true;
    sun.intensity = 4.4;
    sun.position.set(SX + 9, 10, 12);
    sun.target.position.set(SX, 0, 1);
    scene.background = new THREE.Color(0xbcd6ee);
    env = 0.6;
    grade = "saturate(1.08) contrast(1.03)";
  } else if (kind === "kennel") {
    hemi.color.set(0xf4f8ff);
    hemi.groundColor.set(0x8a8478);
    hemi.intensity = 1.25;
    tubeLights.visible = tubeLights2.visible = true;
    tubeLights.position.set(SX, 2.6, KZ + 1.0);
    tubeLights2.position.set(SX + 3, 2.6, KZ + 0.6);
    scene.background = new THREE.Color(0xdde3e8);
    env = 0.5;
    grade = "saturate(0.95) contrast(1.04)";
  } else if (kind === "clinic") {
    hemi.color.set(0xf2f6ff);
    hemi.groundColor.set(0x8a8478);
    hemi.intensity = 1.2;
    tubeLights.visible = true;
    tubeLights.position.set(VX, 2.55, 0);
    dawnLight.visible = true;
    dawnLight.intensity = 3.5;
    scene.background = new THREE.Color(0xdde3e8);
    env = 0.5;
    grade = "saturate(0.98) contrast(1.03)";
  }
  scene.environmentIntensity = env;
  if (gray) grade += ` grayscale(${gray})`;
  if (warm) grade += ` sepia(${warm * 0.25}) saturate(${1 + warm * 0.15})`;
  renderer.domElement.style.filter = grade;
  grainEl.style.opacity = String(grain);
  vignetteEl.style.opacity = String(vignette);
  fill.intensity = fill2.intensity = 0;
}
function grainAt(t) {
  const f = Math.floor(t * FPS);
  grainEl.style.backgroundPosition = `${(f * 97) % 256}px ${(f * 61) % 256}px`;
}

// ---------- people poses ----------
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
function handsToFace(av, { up = 0, fwd = 0.1, spread = 0.05 } = {}) {
  const hq = headOf(av, -0.05 + up, fwd);
  const side = V(1, 0, 0).applyQuaternion(av.getWorldQuaternion(new THREE.Quaternion()));
  both(av, hq.clone().addScaledVector(side, spread), hq.clone().addScaledVector(side, -spread));
}
// dad: arms folded across his chest
function armsCrossed(av) {
  av.armL.rotation.set(-0.6, 0, -0.2);
  av.armR.rotation.set(-0.6, 0, 0.2);
  av.elbowL.rotation.set(-2.0, -0.6, 0);
  av.elbowR.rotation.set(-2.0, 0.6, 0);
  both(av, local(av, -0.13, 1.18, 0.15), local(av, 0.13, 1.15, 0.17));
}
// the intruder aiming his pistol at a point
function aim(av, target) {
  const sh = local(av, -0.18, 1.42, 0.0);
  const dir = target.clone().sub(sh).normalize();
  reachTo(av, "R", sh.clone().addScaledVector(dir, 0.62), ARM_R);
  reachTo(av, "L", sh.clone().addScaledVector(dir, 0.5).add(V(0, -0.04, 0)), ARM_L, 16);
}

// ---------- the leap ----------
// The cold open and "He didn't hesitate" are the same moment: he leaps from P0 toward the gun.
const GIRL_AT = { x: -2.55, z: -1.05 };
const THIEF_AT = { x: 1.05, z: -2.85 };
const P0 = V(-1.75, 0, -1.3), P1 = V(-0.15, 0, -2.3);
const LEAP_RY = yawTo(P0, P1);
const GIRL_RY = yawTo(V(GIRL_AT.x, 0, GIRL_AT.z), V(THIEF_AT.x, 0, THIEF_AT.z));
const THIEF_RY = yawTo(V(THIEF_AT.x, 0, THIEF_AT.z), V(GIRL_AT.x, 0, GIRL_AT.z));
// u: 0 take-off .. 1 landing
function leapAt(u, t) {
  const p = P0.clone().lerp(P1, u);
  const yy = 4 * 0.78 * u * (1 - u);
  const takeoff = clamp01(u / 0.12);
  dog.pose({
    t, x: p.x, y: yy, z: p.z, ry: LEAP_RY,
    leap: takeoff, crouch: 1 - takeoff,
    pitch: lerp(-0.35, 0.3, u) * takeoff, mouth: 0.55, ears: -0.6, angry: 0.5, tail: 0.6, headPitch: -0.1, breathe: 0,
  });
  return p.setY(yy);
}
const GIRL_CHEST = () => V(GIRL_AT.x + 0.05, 1.0, GIRL_AT.z);
function hookPeople(t, { gunUp = 1, scared = 1 } = {}) {
  // she stands in her doorway, frozen; he has come in through the back door
  stand(girl, { x: GIRL_AT.x, z: GIRL_AT.z, ry: GIRL_RY, lean: -0.08 * scared, head: 0.05 });
  if (scared) handsToFace(girl, { up: -0.1, fwd: 0.12, spread: 0.06 });
  stand(thief, { x: THIEF_AT.x, z: THIEF_AT.z, ry: THIEF_RY, head: 0.05 });
  if (gunUp) aim(thief, lerp(0, 1, gunUp) > 0.5 ? GIRL_CHEST() : GIRL_CHEST().add(V(0, -0.8, 0)));
  gun.visible = true;
  backDoor.rotation.y = -1.2;
  pane.visible = false;
}
function muzzleAt(t, t0, dur = 0.1) {
  const p = t - t0;
  if (p < 0 || p > dur) return;
  thief.updateMatrixWorld(true);
  const m = gun.localToWorld(V(...MUZZLE));
  const k = 1 - p / dur;
  muzzle.visible = true;
  muzzle.position.copy(m);
  muzzle.scale.setScalar(0.5 * k + 0.15);
  muzzle.material.opacity = k;
  flashLight.visible = true;
  flashLight.position.copy(m);
  flashLight.intensity = 60 * k;
}

// ---------- reset ----------
function hideCast() {
  for (const d of DOGS) d.pose({ z: -80, y: -50 });
  for (const p of PEOPLE) {
    p.resetPose();
    p.position.set(0, -80, 0);
    p.rotation.set(0, 0, 0);
  }
}
function resetWorld(t) {
  hideCast();
  collar.visible = true;
  bandage.visible = false;
  gun.visible = false;
  folder.visible = false;
  leash.visible = false;
  muzzle.visible = false;
  drawing.visible = false;
  pane.visible = true;
  doorOpen(0);
  kennelOpen(0);
  shardsAt(-1);
  flashEl.style.opacity = "0";
  fade(0);
  title("", 0);
  rewindEl.style.opacity = "0";
  camera.up.set(0, 1, 0);
  grainAt(t);
}

// ---------- shots ----------
const K = (x, y, z) => V(SX + x, y, KZ + z); // kennel-corridor coordinates
const MAXBED = { x: -0.3, z: -1.55 };
function maxInKennel(t, o = {}) {
  dog.pose({ t, x: SX + MAXBED.x, z: KZ + MAXBED.z, ry: 0.15, lie: 1, headPitch: 0.42, ears: -0.15, tail: 1.3, sad: 1, ...o });
}
function otherDogs(t) {
  dogB.pose({ t, x: SX - KW + 0.1, z: KZ - 0.9, ry: 0.4, sit: 1, headPitch: -0.1, headYaw: -0.3, wag: 0.4, wagSpeed: 10, tail: -0.2 });
  dogC.pose({ t, x: SX + KW - 0.2, z: KZ - 1.2, ry: -0.6, lie: 1, headPitch: 0.25, tail: 1.2 });
}
const GIRL_K = { x: 0.12, z: 0.36, ry: Math.PI }; // where her feet are when she sits, facing the bars
const DAD_K = { x: 0.78, z: 1.55 };
const DAD_K_RY = yawTo(V(DAD_K.x, 0, DAD_K.z), V(0.2, 0, 0));

const SHOTS = [
  // ===== COLD OPEN =====
  // "This dog" — close on his face: he has put himself between her and the man, growling
  [0, (lt, t) => {
    setEnv("night", { exposure: 1.15, vignette: 0.5 });
    hookPeople(t, { gunUp: 0.3 });
    const coil = ease.in(prog(t, 0.35, C.took));
    dog.pose({ t, x: P0.x, z: P0.z, ry: LEAP_RY, crouch: 1, lift: -0.03 * coil, mouth: 0.22 + 0.06 * Math.sin(t * 30), ears: -0.35, angry: 0.7, snarl: 0.7, tail: 0.2, headPitch: 0.05 - 0.15 * coil, eyes: [0, 0.05] });
    const f = dogHead(dog, [0, 0.0, 0.1]);
    const side = V(Math.cos(LEAP_RY), 0, -Math.sin(LEAP_RY));
    const push = ease.inOut(prog(t, 0, C.took));
    const cam = f.clone().add(V(Math.sin(LEAP_RY), 0, Math.cos(LEAP_RY)).multiplyScalar(lerp(1.3, 1.1, push))).addScaledVector(side, 0.38).add(V(0, 0.05, 0));
    lookAt(cam, f.clone().add(V(0, -0.02, 0)), 34);
    fill.visible = true;
    fill.position.copy(cam).add(V(0.1, 0.4, 0));
    fill.intensity = 1.6;
    fade(1 - prog(t, 0, 0.12));
  }],
  // "took a bullet" — over her shoulder: he launches at the man as the gun comes up; the shot
  [C.took, (lt, t) => {
    setEnv("night", { exposure: 1.15, vignette: 0.5 });
    hookPeople(t, { gunUp: 1 });
    const u = lerp(0.02, 0.42, ease.out(prog(t, C.took, C.for)));
    leapAt(u, t);
    muzzleAt(t, C.bullet + 0.02, 0.12);
    flash(t, C.bullet + 0.02, 0.25, "#fff2d8", 0.55);
    const [jx, jy] = jolt(t, C.bullet + 0.02, 0.025);
    // side profile, travelling with him: the man and his gun ahead of him in the frame
    const c = dog.point("Body");
    const fwd = V(Math.sin(LEAP_RY), 0, Math.cos(LEAP_RY)), side = V(Math.cos(LEAP_RY), 0, -Math.sin(LEAP_RY)).negate();
    const cam = c.clone().addScaledVector(side, 3.0).addScaledVector(fwd, 0.15).add(V(jx, 0.05 + jy, 0));
    lookAt(cam, c.clone().addScaledVector(fwd, 0.2), 46);
  }],
  // "for a girl" — the reverse, from behind his gun: the dog in mid-air, the girl behind him
  [C.for, (lt, t) => {
    setEnv("night", { exposure: 1.15, vignette: 0.5 });
    hookPeople(t, { gunUp: 1 });
    const u = lerp(0.42, 0.5, prog(t, C.for, C.hed));
    leapAt(u, t);
    const cam = local(thief, -0.35, 1.5, -0.45);
    const tg = V(GIRL_AT.x, 1.05, GIRL_AT.z);
    const p = ease.inOut(prog(t, C.for, C.hed));
    look(cam.x, cam.y - 0.05 * p, cam.z, tg.x, tg.y - 0.1, tg.z, 30 - 3 * p);
    fill.visible = true;
    fill.position.set(GIRL_AT.x + 1.0, 1.6, GIRL_AT.z + 0.3);
    fill.intensity = 2;
  }],
  // "he'd met three days earlier." — time stops: bullet-time around him, frozen mid-air
  [C.hed, (lt, t) => {
    const g = prog(t, C.hed, C.earlier);
    setEnv("night", { exposure: 1.15, vignette: 0.6, gray: 0.75 * g, grain: 0.06 * g });
    hookPeople(t, { gunUp: 1 });
    leapAt(0.5, C.hed);
    const tgt = dog.point("Body");
    const a = ease.inOut(g);
    orbit(tgt, LEAP_RY - 1.55 + a * 0.6, lerp(2.9, 2.4, a), lerp(0.05, 0.2, a), 40, 0.0);
    fill.visible = true;
    fill.position.copy(camera.position).add(V(0, 0.6, 0));
    fill.intensity = 2.5;
  }],
  // "earlier." — rewind: he flies back to where he started; tape lines; white
  [C.earlier, (lt, t) => {
    const r = prog(t, C.earlier, C.three2);
    setEnv("night", { exposure: 1.15 + r * 0.4, vignette: 0.6, gray: 0.75, grain: 0.1 });
    hookPeople(t, { gunUp: 1 - r });
    const u = lerp(0.5, 0.0, ease.inOut(r));
    leapAt(u, t);
    const tgt = dog.point("Body");
    orbit(tgt, LEAP_RY - 0.95 - r * 0.5, 2.4 + r * 0.8, 0.25, 40, -0.05);
    rewindEl.style.opacity = "1";
    rewindEl.style.backgroundPosition = `0 ${Math.floor(t * 3000) % 1920}px`;
    fade(prog(t, C.three2 - 0.12, C.three2), "#fff");
  }],
  // ===== THREE DAYS EARLIER =====
  // "Three days earlier." — the shelter on a sunny morning; she and her dad walk up to it
  [C.three2, (lt, t) => {
    setEnv("shelter", { exposure: 1.05 });
    const z = lerp(6.6, 4.9, prog(t, C.three2, C.nobody));
    girl.position.set(SX + 0.35, 0, z);
    girl.rotation.set(0, Math.PI, 0);
    walkClip(girl, lt * 1.05 + 0.3);
    dad.position.set(SX - 0.3, 0, z + 0.35);
    dad.rotation.set(0, Math.PI, 0);
    walkClip(dad, lt * 0.95);
    const p = ease.inOut(prog(t, C.three2, C.nobody));
    look(SX + 1.1, lerp(1.25, 1.45, p), lerp(9.6, 9.0, p), SX + 0.1, 2.0, 0, 42);
    fade(1 - prog(t, C.three2, C.three2 + 0.35), "#fff");
    title("3 DAYS EARLIER", prog(t, C.three2 + 0.1, C.three2 + 0.3) * (1 - prog(t, C.nobody - 0.25, C.nobody)));
  }],
  // "Nobody wanted him." — inside: Max alone at the back of his kennel, chin on his paws
  [C.nobody, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    maxInKennel(t);
    otherDogs(t);
    const p = ease.inOut(prog(t, C.nobody, C.hed2));
    lookAt(K(0.15, lerp(0.62, 0.5, p), lerp(1.55, 1.15, p)), K(MAXBED.x + 0.05, 0.25, MAXBED.z + 0.1), 40);
  }],
  // "He'd been there 11 months." — his card on the bars: 11 MONTHS, and a red stamp
  [C.hed2, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    maxInKennel(t);
    otherDogs(t);
    card.updateMatrixWorld(true);
    const c = card.getWorldPosition(V());
    const p = ease.inOut(prog(t, C.hed2, C.everyone));
    const focus = c.clone().add(V(0, lerp(0.03, -0.01, p), 0));
    lookAt(c.clone().add(V(0.06, 0.02, lerp(0.62, 0.45, p))), focus, 32);
    fill.visible = true;
    fill.position.copy(c).add(V(0.2, 0.3, 0.6));
    fill.intensity = 1.2;
  }],
  // "Everyone walked past his cage." — from inside his kennel: legs hurrying past the bars
  [C.everyone, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    maxInKennel(t, { headPitch: 0.3, eyes: [0.1, -0.1] });
    otherDogs(t);
    const x1 = lerp(1.9, -1.6, prog(t, C.everyone, C.then));
    visitor.position.copy(K(x1, 0, 1.25));
    visitor.rotation.set(0, -Math.PI / 2, 0);
    walkClip(visitor, lt * 1.1);
    visitorKid.position.copy(K(x1 + 0.75, 0, 1.0));
    visitorKid.rotation.set(0, -Math.PI / 2, 0);
    walkClip(visitorKid, lt * 1.25 + 0.4);
    lookAt(K(0.05, 0.32, -2.05), K(0.15, 0.55, 1.2), 50);
  }],
  // "Then a little girl stopped," — she walks along the kennels... stops, and looks in
  [C.then, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    const stopP = prog(t, C.then, C.stopped);
    const lift = ease.inOut(prog(t, C.stopped - 0.1, C.stopped + 0.3));
    maxInKennel(t, { headPitch: 0.42 - 0.45 * lift, eyes: [0.1, -0.1 * (1 - lift)], ears: -0.15 + 0.3 * lift });
    otherDogs(t);
    const x = lerp(1.25, GIRL_K.x, ease.out(stopP));
    const turn = ease.inOut(prog(t, C.stopped, C.sat));
    girl.position.copy(K(x, 0, GIRL_K.z));
    girl.rotation.set(0, lerp(-Math.PI / 2, -Math.PI, turn), 0);
    if (stopP < 1) walkClip(girl, lt * 1.1);
    else {
      stand(girl, { x: girl.position.x, z: girl.position.z, ry: girl.rotation.y, head: 0.25 * turn, headYaw: 0 });
    }
    dad.position.copy(K(lerp(1.9, 0.95, ease.out(prog(t, C.then, C.stopped + 0.2))), 0, DAD_K.z));
    dad.rotation.set(0, -Math.PI / 2, 0);
    if (t < C.stopped + 0.2) walkClip(dad, lt * 1.0);
    else stand(dad, { x: dad.position.x, z: dad.position.z, ry: -Math.PI / 2 - 0.4, head: 0.1 });
    lookAt(K(-0.15, 0.42, -1.25), K(0.55, 0.85, 1.0), 50);
  }],
  // "sat on the floor," — she sits down on the concrete in front of his bars
  [C.sat, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    maxInKennel(t, { headPitch: -0.05, eyes: [0.1, 0], ears: 0.1 });
    otherDogs(t);
    const s = ease.inOut(prog(t, C.sat, C.and - 0.1));
    const gp = K(GIRL_K.x, 0, GIRL_K.z);
    floorSit(girl, s, { x: gp.x, z: gp.z, ry: GIRL_K.ry });
    stand(dad, { x: SX + DAD_K.x, z: KZ + DAD_K.z, ry: DAD_K_RY, head: 0.2 });
    const p = ease.inOut(prog(t, C.sat, C.and));
    lookAt(K(1.75, lerp(0.85, 0.72, p), lerp(1.35, 1.2, p)), K(0.05, 0.45, 0.35), 46);
  }],
  // "and he came to the bars." — he gets up, comes slowly to her hand through the bars
  [C.and, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    otherDogs(t);
    const up = ease.inOut(prog(t, C.and, C.came + 0.05));
    const go = ease.inOut(prog(t, C.came, C.bars));
    const p = K(MAXBED.x, 0, MAXBED.z).lerp(K(0.1, 0, -0.42), go);
    dog.pose({
      t, x: p.x, z: p.z, ry: lerp(0.15, 0.05, go), lie: 1 - up, walk: up * (1 - prog(t, C.bars - 0.05, C.bars + 0.1)), walkPhase: (t - C.came) * 1.5,
      headPitch: lerp(0.0, 0.32, prog(t, C.bars - 0.1, C.bars + 0.2)), headTilt: 0.18 * prog(t, C.bars, C.her), tail: lerp(1.0, 0.6, go), wag: 0.25 * prog(t, C.bars, C.her), wagSpeed: 9, ears: -0.2, eyes: [0, -0.1],
    });
    const gp = K(GIRL_K.x, 0, GIRL_K.z);
    floorSit(girl, 1, { x: gp.x, z: gp.z, ry: GIRL_K.ry });
    girl.spine.rotation.x = 0.4;
    reachTo(girl, "R", K(0.14, 0.33, -0.06).lerp(K(0.16, 0.36, 0.08), 1 - ease.inOut(prog(t, C.and, C.came))), ARM_R);
    stand(dad, { x: SX + DAD_K.x, z: KZ + DAD_K.z, ry: DAD_K_RY, head: 0.25 });
    lookAt(K(-0.8, 0.9, 1.8), K(0.05, 0.35, -0.45), 44);
  }],
  // "Her dad said no." — looking up at him through the bars: arms folded, shaking his head
  [C.her, (lt, t) => {
    setEnv("kennel", { exposure: 1.05 });
    otherDogs(t);
    dog.pose({ t, x: SX + 0.1, z: KZ - 0.42, ry: 0.05, sit: 1, headPitch: -0.25, headTilt: 0.25, ears: -0.3, tail: 0.6, sad: 1 });
    const gp = K(GIRL_K.x, 0, GIRL_K.z);
    floorSit(girl, 1, { x: gp.x, z: gp.z, ry: GIRL_K.ry });
    girl.head.rotation.set(-0.35, -0.5, 0);
    stand(dad, { x: SX + DAD_K.x, z: KZ + DAD_K.z, ry: DAD_K_RY, head: 0.3 });
    armsCrossed(dad);
    dad.head.rotation.y = Math.sin((t - C.no) * 11) * 0.28 * prog(t, C.no - 0.1, C.no + 0.05) * (1 - prog(t, C.no + 0.4, C.she));
    lookAt(K(-0.6, 0.42, -0.65), K(0.6, 1.45, 1.55), 48);
  }],
  // "She cried" — close on her: face in her hand, her other hand still through the bars; he licks it
  [C.she, (lt, t) => {
    setEnv("kennel", { exposure: 1.05, warm: 0.2 });
    otherDogs(t);
    const lick = Math.max(0, Math.sin(t * 9));
    dog.pose({ t, x: SX + 0.12, z: KZ - 0.38, ry: 0.0, sit: 1, headPitch: 0.45 + lick * 0.08, mouth: 0.35 * lick, ears: -0.25, tail: 0.5, wag: 0.3, wagSpeed: 8, sad: 0.6 });
    const gp = K(GIRL_K.x, 0, GIRL_K.z);
    floorSit(girl, 1, { x: gp.x, z: gp.z, ry: GIRL_K.ry });
    girl.spine.rotation.x = 0.55 + Math.sin(t * 13) * 0.025;
    girl.head.rotation.set(0.5, 0, 0);
    const face = headOf(girl, -0.06, 0.1);
    reachTo(girl, "L", face, ARM_L);
    reachTo(girl, "R", K(0.14, 0.3, -0.12), ARM_R);
    stand(dad, { x: SX + DAD_K.x, z: KZ + DAD_K.z, ry: DAD_K_RY, head: 0.35 });
    armsCrossed(dad);
    const p = ease.inOut(prog(t, C.she, C.until + 0.27));
    lookAt(K(lerp(0.62, 0.55, p), 0.5, lerp(-0.62, -0.55, p)), K(0.1, 0.55, 0.55), 40);
  }],
  // "until he said yes." — her dad crouches beside her, a hand on her head... and nods
  [C.until + 0.27, (lt, t) => {
    setEnv("kennel", { exposure: 1.05, warm: 0.3 });
    otherDogs(t);
    dog.pose({ t, x: SX + 0.12, z: KZ - 0.38, ry: 0.0, sit: 1, headPitch: 0.15, ears: 0.1, tail: 0.2, wag: 0.6, wagSpeed: 11 });
    const gp = K(GIRL_K.x, 0, GIRL_K.z);
    floorSit(girl, 1, { x: gp.x, z: gp.z, ry: GIRL_K.ry });
    girl.spine.rotation.x = 0.45;
    girl.head.rotation.set(-0.2, -0.6 * prog(t, C.said2, C.yes), 0);
    const c = ease.inOut(prog(t, C.until + 0.27, C.yes - 0.05));
    stand(dad, { x: SX + DAD_K.x - 0.15 * c, z: KZ + DAD_K.z - 0.45 * c, ry: DAD_K_RY - 0.4 * c, crouch: 0.85 * c, head: 0.3 });
    if (c > 0.3) reachTo(dad, "R", headOf(girl, 0.04, -0.02), ARM_R);
    dad.head.rotation.x = 0.3 + 0.15 * Math.max(0, Math.sin((t - C.yes) * 12)) * prog(t, C.yes - 0.1, C.yes);
    lookAt(K(-0.62, 0.6, -1.05), K(0.4, 0.75, 0.95), 50);
  }],
  // "yes." — the gate swings open and he runs straight into her arms
  [C.yes, (lt, t) => {
    setEnv("kennel", { exposure: 1.1, warm: 0.4 });
    otherDogs(t);
    kennelOpen(1);
    const gp = K(GIRL_K.x + 0.05, 0, GIRL_K.z + 0.42);
    kneel(girl, 1, { x: gp.x, z: gp.z, ry: Math.PI - 0.15, lean: 0.35 });
    const hug = ease.out(prog(t, C.yes, C.yes + 0.25));
    dog.pose({ t, x: SX + 0.16, z: KZ + lerp(-0.05, 0.16, hug), ry: 0.1, beg: 0.6 * hug, sit: 0.4 * hug, headPitch: -0.3, headTilt: 0.2, mouth: 0.3, ears: 0.3, tail: -0.3, wag: 1, wagSpeed: 16 });
    const n = dog.point("Neck2", [0, 0.0, 0.0]);
    both(girl, n.clone().add(V(-0.12, -0.02, -0.05)), n.clone().add(V(0.12, -0.02, -0.05)));
    stand(dad, { x: SX + DAD_K.x + 0.2, z: KZ + DAD_K.z, ry: DAD_K_RY - 0.3, head: 0.3 });
    lookAt(K(1.95, 1.0, 1.55), K(0.12, 0.5, 0.35), 42);
    collar.visible = false;
  }],
  // ===== HOME =====
  // "On the second night," — the living room at night, lamps on; he's in his new bed by the window
  [C.on2, (lt, t) => {
    setEnv("night", { exposure: 1.2 });
    const lift = ease.inOut(prog(t, C.night + 0.05, C.wouldnt));
    dog.pose({ t, x: DOGBED.x, z: DOGBED.z + 0.05, ry: Math.PI + 0.5, lie: 1, lift: 0.05, headPitch: lerp(0.4, -0.15, lift), headYaw: lerp(0, -0.35, lift), ears: lerp(-0.1, 0.35, lift), tail: 1.2 });
    const p = ease.inOut(prog(t, C.on2, C.wouldnt));
    look(lerp(0.9, 0.65, p), lerp(1.35, 1.2, p), lerp(0.9, 0.55, p), DOGBED.x - 0.2, 0.55, DOGBED.z - 0.3, 46);
  }],
  // "he wouldn't stop growling" — at the window, hackles up, a low steady growl
  [C.wouldnt, (lt, t) => {
    setEnv("night", { exposure: 1.2 });
    const go = ease.inOut(prog(t, C.wouldnt, C.stop + 0.1));
    const p = V(DOGBED.x, 0, DOGBED.z).lerp(V(-1.35, 0, -3.15), go);
    const g = Math.sin(t * 34) * 0.04;
    dog.pose({ t, x: p.x, z: p.z, ry: Math.PI + 0.12, crouch: go, walk: go < 1 ? 0.6 : 0, walkPhase: t * 1.6, headPitch: 0.12, mouth: 0.18 + g * go, ears: -0.45 * go, tail: -0.4, shiver: 0.4 * go, angry: 0.8 * go, snarl: 0.8 * go });
    const f = dogHead(dog, [0, 0, 0.05]);
    // behind him, low: his stiff, growling silhouette against the dark window
    const cam = V(lerp(0.0, -0.2, go), lerp(0.95, 0.8, go), lerp(-0.7, -1.0, go));
    lookAt(cam, V(-1.5, 0.55, -3.7), 38);
    fill.visible = true;
    fill.position.set(-0.4, 1.0, -2.8);
    fill.color.set(0xffc898);
    fill.intensity = 1.8;
  }],
  // "at the window." — what he sees: a man by the fence under the streetlamp, watching the house
  [C.at, (lt, t) => {
    setEnv("night", { exposure: 1.25 });
    dog.pose({ t, x: -1.35, z: -3.15, ry: Math.PI + 0.12, crouch: 1, headPitch: 0.12, mouth: 0.2 + Math.sin(t * 34) * 0.04, ears: -0.45, tail: -0.4, angry: 0.8, snarl: 0.8 });
    const back = ease.in(prog(t, C.at + 0.35, C.they));
    thief.position.set(-2.25, 0, -11.55 - back * 0.9);
    thief.rotation.set(0, back > 0 ? Math.PI * back : 0, 0);
    stand(thief, { x: thief.position.x, z: thief.position.z, ry: Math.PI * back * 0.6, head: 0.05 });
    const p = ease.inOut(prog(t, C.at, C.they));
    look(-1.0, 1.0, -3.95, -2.2, lerp(1.25, 1.2, p), -11.4, lerp(30, 26, p));
  }],
  // "They almost took him back." — the next morning: dad by the door with the leash and the papers;
  // she holds on to her dog... and he hangs the leash back on its hook
  [C.they, (lt, t) => {
    setEnv("day", { exposure: 1.05 });
    const DADP = { x: 2.0, z: 1.85 };
    const hang = ease.inOut(prog(t, C.back - 0.05, C.on3));
    stand(dad, { x: DADP.x, z: DADP.z, ry: Math.PI - 0.35 + hang * 0.9, head: 0.35 + hang * 0.1 });
    folder.visible = true;
    dad.armL.rotation.set(-0.35, 0, -0.1);
    dad.elbowL.rotation.set(-1.0, -0.3, 0);
    const hr = local(dad, -0.22, 0.95, 0.35).lerp(HOOK.clone().add(V(0, -0.02, -0.05)), hang);
    reachTo(dad, "R", hr, ARM_R);
    const gp = { x: 1.3, z: 0.95 };
    kneel(girl, 1, { x: gp.x, z: gp.z, ry: yawTo(V(gp.x, 0, gp.z), V(DADP.x, 0, DADP.z)) - 0.4, lean: 0.2 });
    girl.head.rotation.set(-0.3, 0.3 + Math.sin(t * 8) * 0.25 * (1 - hang), 0);
    dog.pose({ t, x: 1.45, z: 1.3, ry: Math.PI + 0.6, sit: 1, headPitch: 0.1, headYaw: 0.3, eyes: [0, -0.15], ears: -0.2, tail: 0.4 });
    const n = dog.point("Neck2", [0, -0.02, 0.0]);
    reachTo(girl, "L", n.clone().add(V(0.0, 0.0, 0.12)), ARM_L);
    reachTo(girl, "R", n.clone().add(V(0.12, -0.05, -0.05)), ARM_R);
    leash.visible = true;
    const h = hand(dad, "R");
    leash.set([h.clone().add(V(0, -0.02, 0)), h.clone().add(V(0.02, -0.25, 0.02)), h.clone().add(V(0.03, -0.55 + hang * 0.2, 0.03)), h.clone().add(V(0.02, -0.75 + hang * 0.3, 0.0))], { loop: true, floor: 0 });
    const p = ease.inOut(prog(t, C.they, C.on3));
    look(lerp(0.05, 0.2, p), 1.15, lerp(-0.85, -0.6, p), 1.75, 0.95, 1.55, 42);
  }],
  // "On the third night," — the house from the yard; a dark figure crosses the lawn to the back door
  [C.on3, (lt, t) => {
    setEnv("yardNight", { exposure: 1.3 });
    const p = prog(t, C.on3, C.someone);
    thief.position.set(lerp(-2.6, 0.6, p), 0, lerp(-6.8, -5.2, p));
    thief.rotation.set(0, yawTo(V(-2.6, 0, -6.8), V(0.6, 0, -5.2)), 0);
    walkClip(thief, lt * 0.8);
    const e = ease.inOut(p);
    look(lerp(2.4, 2.0, e), lerp(1.45, 1.35, e), lerp(-12.6, -11.8, e), 0.0, 1.4, -4.6, 46);
  }],
  // "someone broke in." — inside: his fist through the glass, a hand on the lock, the door swings open
  [C.someone, (lt, t) => {
    setEnv("night", { exposure: 1.2 });
    const broke = C.broke + 0.05;
    pane.visible = t < broke;
    shardsAt(t - broke);
    const open = ease.inOut(prog(t, C.in, C.he3 + 0.15));
    doorOpen(open * 0.9);
    const step = ease.inOut(prog(t, C.in + 0.1, C.he3 + 0.3));
    stand(thief, { x: 1.62 - step * 0.2, z: lerp(-4.55, -3.75, step), ry: -0.1, head: 0.1 });
    backDoor.updateMatrixWorld(true);
    const glass = backDoor.localToWorld(V(PANE.x, PANE.y - 0.1, 0));
    const punch = prog(t, broke - 0.12, broke);
    const reachIn = ease.inOut(prog(t, broke + 0.08, C.in));
    const tgt = glass.clone().add(V(0, 0, lerp(-0.35, 0.05, punch)));
    if (reachIn > 0) tgt.lerp(backDoor.localToWorld(V(BDW - 0.1, 1.02, 0.1)), reachIn);
    if (open < 0.2) reachTo(thief, "L", tgt, ARM_L);
    const [jx, jy] = jolt(t, broke, 0.02);
    look(0.75 + jx, 1.28 + jy, -2.05, 1.62, 1.35, -4.07, 44);
  }],
  // "He didn't hesitate." — out of her room he comes, flat out, and leaps at the gun
  [C.he3, (lt, t) => {
    setEnv("night", { exposure: 1.2, vignette: 0.55 });
    doorOpen(0.9);
    pane.visible = false;
    shardsAt(10);
    const aimUp = ease.out(prog(t, C.he3 + 0.15, C.hesitate + 0.1));
    stand(thief, { x: THIEF_AT.x, z: THIEF_AT.z, ry: THIEF_RY, head: 0.05 });
    gun.visible = true;
    const leapT = C.hesitate + 0.08;
    const fire = C.vet - 0.12;
    if (aimUp > 0) aim(thief, GIRL_CHEST().add(V(0, -0.9 * (1 - aimUp), 0)));
    // the girl comes to her doorway
    const gin = ease.out(prog(t, C.he3 + 0.15, C.hesitate + 0.2));
    stand(girl, { x: lerp(GIRL_AT.x - 0.7, GIRL_AT.x, gin), z: GIRL_AT.z, ry: GIRL_RY, lean: -0.08 * gin });
    if (gin > 0.6) handsToFace(girl, { up: -0.1, fwd: 0.12, spread: 0.06 });
    if (t < leapT - 0.1) {
      const r = prog(t, C.he3, leapT - 0.1);
      const p = V(-3.2, 0, -1.1).lerp(P0, ease.out(r));
      dog.pose({ t, x: p.x, z: p.z, ry: yawTo(V(-3.2, 0, -1.1), P0), run: 1 - r * 0.6, runPhase: t * 3.2, mouth: 0.3, ears: -0.6, tail: 0.5 });
    } else if (t < leapT) {
      dog.pose({ t, x: P0.x, z: P0.z, ry: LEAP_RY, crouch: 1, mouth: 0.3, ears: -0.5, tail: 0.3 });
    } else {
      leapAt(ease.out(prog(t, leapT, fire + 0.08)) * 0.5, t);
    }
    muzzleAt(t, fire, 0.12);
    const cam = local(thief, -0.38, 1.45, -0.55);
    look(cam.x, cam.y, cam.z, -2.2, 0.75, -1.2, 40);
    flash(t, fire, 0.3, "#fff", 1);
    fade(prog(t, fire + 0.02, C.vet), "#fff");
  }],
  // "The vet said he might not make it." — the next morning: he lies still on the table, bandaged
  [C.vet, (lt, t) => {
    setEnv("clinic", { exposure: 1.1 });
    drawEcg(t, 92, 0.6);
    dog.pose({ t, x: VX + TABLE.x - 0.08, y: TABLE.y, z: TABLE.z + 0.05, ry: Math.PI / 2, side: 1, headPitch: 0.25, breathe: 0.6, tail: 0.6, ears: -0.2, closed: 1 });
    stand(vet, { x: VX + 0.05, z: -1.45, ry: 0.15, head: 0.25 });
    vet.head.rotation.y = Math.sin((t - C.might) * 6) * 0.2 * prog(t, C.might - 0.1, C.might + 0.1) * (1 - prog(t, C.make + 0.3, C.she2));
    vet.armL.rotation.set(-0.7, 0, -0.1);
    vet.elbowL.rotation.set(-1.2, -0.3, 0);
    stand(dad, { x: VX + 1.05, z: 0.35, ry: yawTo(V(VX + 1.05, 0, 0.35), V(VX, 0, -1.4)), head: 0.15 });
    stand(girl, { x: VX + 0.45, z: 0.25, ry: yawTo(V(VX + 0.45, 0, 0.25), V(VX, 0, -0.6)), head: 0.35 });
    reachTo(girl, "R", hand(dad, "L"), ARM_R);
    const p = ease.inOut(prog(t, C.vet, C.she2));
    look(VX + lerp(-1.55, -1.25, p), lerp(1.45, 1.35, p), lerp(1.9, 1.55, p), VX + 0.15, 0.95, -0.7, 42);
    fade(1 - prog(t, C.vet, C.vet + 0.35), "#fff");
  }],
  // "She slept on the clinic floor," — that night: curled up on the floor next to him
  [C.she2, (lt, t) => {
    setEnv("clinic", { exposure: 1.15 });
    tubeLights.intensity = 4;
    dawnLight.intensity = 0.4;
    dawnLight.color.set(0x9db6ff);
    hemi.color.set(0xc8d6ff);
    hemi.intensity = 0.9;
    drawEcg(t, 84, 0.5);
    dog.pose({ t, x: VX + RECOV.x + 0.15, z: RECOV.z - 0.1, ry: 0, side: 1, headPitch: 0.2, breathe: 0.7, tail: 0.6, ears: -0.2, closed: 1 });
    lieSide(girl, { x: VX + RECOV.x - 0.55, z: RECOV.z - 0.95, ry: Math.PI / 2 });
    reachTo(girl, "R", pawR(dog), ARM_R);
    const p = ease.inOut(prog(t, C.she2, C.holding));
    look(VX + lerp(0.4, 0.2, p), lerp(2.35, 2.1, p), lerp(2.9, 2.6, p), VX + RECOV.x - 0.15, 0.15, RECOV.z - 0.1, 44);
  }],
  // "holding his paw all night." — her hand on his paw; dawn comes in through the blinds; he lifts his head
  [C.holding, (lt, t) => {
    const dawn = ease.inOut(prog(t, C.all - 0.1, C.shelter));
    setEnv("clinic", { exposure: 1.15, warm: dawn * 0.6 });
    tubeLights.intensity = lerp(4, 6, dawn);
    dawnLight.intensity = lerp(0.4, 4.5, dawn);
    dawnLight.color.set(new THREE.Color(0x9db6ff).lerp(new THREE.Color(0xffc98a), dawn));
    hemi.color.set(new THREE.Color(0xc8d6ff).lerp(new THREE.Color(0xfff0dc), dawn));
    hemi.intensity = lerp(0.9, 1.2, dawn);
    drawEcg(t, lerp(84, 104, dawn), 0.5 - dawn * 0.5);
    const wake = ease.inOut(prog(t, C.all + 0.1, C.shelter));
    dog.pose({ t, x: VX + RECOV.x + 0.15, z: RECOV.z - 0.1, ry: 0, side: 1, headPitch: 0.2 - 0.35 * wake, headYaw: -0.25 * wake, neck: -0.2 * wake, breathe: 0.8, tail: 0.6, wag: 0.25 * wake, wagSpeed: 7, ears: -0.2 + 0.2 * wake, closed: 1 - ease.inOut(prog(t, C.all, C.night3 + 0.2)) });
    lieSide(girl, { x: VX + RECOV.x - 0.55, z: RECOV.z - 0.95, ry: Math.PI / 2 });
    const pw = pawR(dog);
    reachTo(girl, "R", pw.clone().add(V(-0.02, 0.03, 0)), ARM_R);
    const p = ease.inOut(prog(t, C.holding, C.shelter));
    const fc = dogHead(dog, [0, 0, 0.05]);
    const mid = pw.clone().lerp(fc, 0.45);
    lookAt(mid.clone().add(V(lerp(-1.35, -1.15, p), lerp(0.65, 0.55, p), lerp(0.9, 0.75, p))), mid, 42);
  }],
  // "The shelter called him dangerous." — his old kennel card, now on the fridge at home...
  // and she covers it with her drawing: MY HERO
  [C.shelter, (lt, t) => {
    setEnv("day", { exposure: 1.05 });
    fridge.updateMatrixWorld(true);
    const c = fridgeCard.getWorldPosition(V());
    const cover = ease.out(prog(t, C.dangerous + 0.25, C.hejust - 0.15));
    drawing.visible = cover > 0;
    const dz = lerp(-0.55, 0.0, cover);
    drawing.position.copy(c).add(V(-0.012, 0.0, dz + 0.01));
    drawing.rotation.set(0, -Math.PI / 2, -0.04 + (1 - cover) * 0.15);
    const punch = ease.out(prog(t, C.dangerous, C.dangerous + 0.25));
    const p = ease.inOut(prog(t, C.shelter, C.hejust));
    lookAt(c.clone().add(V(lerp(-1.1, -0.95, p) + punch * 0.06, 0.03, 0.0)), c.clone().add(V(0, lerp(0.0, -0.03, punch), 0)), 36);
    fill.visible = true;
    fill.position.copy(c).add(V(-0.8, 0.4, 0.3));
    fill.intensity = 1.2;
  }],
  // "He just hadn't found anyone to protect yet." — the back yard, sunshine: her arms round her hero
  [C.hejust, (lt, t) => {
    setEnv("yardDay", { exposure: 1.05, warm: 0.4 });
    doorOpen(0.85);
    const GP = { x: 0.62, z: -6.05 };
    floorSit(girl, 1, { x: GP.x, z: GP.z, ry: Math.PI });
    girl.spine.rotation.set(0.35, 0.25, 0.12);
    const lick = Math.max(0, Math.sin((t - C.found) * 8)) * prog(t, C.found, C.found + 0.2) * (1 - prog(t, C.protect + 0.4, C.protect + 0.6));
    dog.pose({ t, x: GP.x - 0.4, z: GP.z - 0.3, ry: Math.PI + 0.35, sit: 1, headYaw: -0.45 * prog(t, C.hadnt, C.found), headPitch: 0.05, headTilt: 0.2, mouth: 0.15 + 0.35 * lick, ears: 0.2, wag: 1, wagSpeed: 13, tail: -0.4, eyes: [-0.15, -0.1] });
    const n = dog.point("Neck2", [0, 0.0, 0.0]);
    reachTo(girl, "L", n.clone().add(V(0.05, 0.04, -0.12)), ARM_L);
    reachTo(girl, "R", n.clone().add(V(0.1, -0.02, 0.1)), ARM_R);
    girl.head.rotation.set(0.25, 0.45, 0.25);
    stand(dad, { x: 1.62, z: -4.35, ry: Math.PI + 0.15, head: 0.3 });
    armsCrossed(dad);
    const rise = ease.inOut(prog(t, C.protect - 0.2, DURATION));
    const tg = V(GP.x - 0.2, lerp(0.55, 0.9, rise), GP.z - 0.1);
    look(lerp(0.1, -0.6, rise), lerp(0.85, 2.6, rise), lerp(-8.5, -10.2, rise), tg.x, tg.y, tg.z, lerp(40, 46, rise));
    fade(prog(t, DURATION - 1.0, DURATION - 0.05));
  }],
];

// ---------- sound: real recordings (see sfx/CREDITS.md) ----------
const sfx = createSfx(short);
const beats = (t0, t1, bpm, phase = 0.23) => {
  const out = [], b = 60 / bpm;
  for (let k = Math.ceil(t0 / b - phase); (k + phase) * b < t1; k++) if ((k + phase) * b >= t0) out.push((k + phase) * b);
  return out;
};
// cold open: the house at night, his growl, a bark as he jumps, the shot
sfx.loop(0, C.three2, "clock", { gain: 0.3, fadeIn: 0.05, fadeOut: 0.2 });
sfx.loop(0, C.took + 0.05, "growl", { gain: 0.85, fadeIn: 0.02, fadeOut: 0.05 });
sfx.add(C.took - 0.08, "bark_1", { gain: 0.9 });
sfx.add(C.bullet + 0.02, "bang", { gain: 1.0 });
// the shelter: birds outside; inside, the kennels full of barking dogs
sfx.loop(C.three2, C.nobody + 0.2, "birds", { gain: 0.7, fadeIn: 0.25, fadeOut: 0.25 });
sfx.loop(C.nobody - 0.1, C.on2, "shelter_dogs", { gain: 0.42, fadeIn: 0.3, fadeOut: 0.3 });
sfx.add(C.wanted + 0.1, "whimper", { gain: 0.35, dur: 1.0, fadeOut: 0.3 });
sfx.loop(C.everyone, C.then, "steps_concrete", { gain: 0.75, fadeIn: 0.1, fadeOut: 0.2 });
sfx.loop(C.then, C.stopped + 0.1, "steps_concrete", { gain: 0.5, rate: 1.1, fadeIn: 0.1, fadeOut: 0.15 });
sfx.add(C.came, "whimper", { gain: 0.25, rate: 1.1, dur: 0.8, fadeOut: 0.3 });
sfx.add(C.yes, "gate", { gain: 0.9 });
sfx.add(C.yes + 0.12, "giggle", { gain: 0.55, dur: 1.6, fadeOut: 0.5 });
sfx.add(C.yes + 0.25, "bark_3", { gain: 0.45, rate: 1.15 });
// home, the second night: the clock, crickets outside... and that growl
sfx.loop(C.on2, C.they, "clock", { gain: 0.35, fadeIn: 0.3, fadeOut: 0.1 });
sfx.loop(C.on2, C.they, "crickets", { gain: 0.3, fadeIn: 0.3, fadeOut: 0.1 });
sfx.loop(C.wouldnt + 0.15, C.they, "growl", { gain: 0.9, fadeIn: 0.15, fadeOut: 0.1 });
sfx.add(C.window + 0.25, "bark_2", { gain: 0.6 });
// the next morning
sfx.loop(C.they, C.on3, "birds_2", { gain: 0.45, fadeIn: 0.1, fadeOut: 0.15 });
// the third night: crickets, the glass, the back door
sfx.loop(C.on3, C.he3 + 0.5, "crickets", { gain: 0.55, fadeIn: 0.15, fadeOut: 0.3 });
sfx.loop(C.someone, C.vet, "clock", { gain: 0.3, fadeIn: 0.1, fadeOut: 0.05 });
sfx.add(C.broke + 0.05, "glass", { gain: 1.0 });
sfx.add(C.in, "door_creak", { gain: 0.7 });
// "He didn't hesitate": a bark down the hall, the growl, the shot, then sirens in the white
sfx.add(C.he3 + 0.02, "bark_1", { gain: 0.85, rate: 0.95 });
sfx.add(C.didnt + 0.1, "bark_2", { gain: 0.8 });
sfx.loop(C.hesitate - 0.05, C.vet - 0.12, "growl", { gain: 0.9, fadeIn: 0.05, fadeOut: 0.03 });
sfx.add(C.vet - 0.12, "bang", { gain: 1.0 });
sfx.add(C.vet + 0.05, "siren", { gain: 0.35, dur: 1.6, fadeOut: 0.9 });
// the clinic: the heart monitor (slow, weak), dawn birds, a soft whimper as he wakes
for (const b of beats(C.vet + 0.3, C.she2, 92)) sfx.add(b, "monitor_beep", { gain: 0.5 });
for (const b of beats(C.she2, C.shelter, 84)) sfx.add(b, "monitor_beep", { gain: 0.3 });
sfx.loop(C.all - 0.2, C.shelter, "birds", { gain: 0.35, fadeIn: 0.6, fadeOut: 0.2 });
sfx.add(C.all + 0.15, "whimper", { gain: 0.35, rate: 1.05, dur: 1.0, fadeOut: 0.4 });
// home: the fridge... and the back yard in the sun
sfx.loop(C.shelter, C.hejust, "birds_2", { gain: 0.25, fadeIn: 0.2, fadeOut: 0.1 });
sfx.loop(C.hejust, DURATION, "birds", { gain: 0.6, fadeIn: 0.2, fadeOut: 1.0 });
sfx.add(C.found + 0.05, "giggle", { gain: 0.5 });
sfx.add(C.yet + 0.55, "bark_3", { gain: 0.4, rate: 1.1 });

// ---------- frame ----------
const shotStarts = SHOTS.map((s) => s[0]);
shotStarts.forEach((v, i) => {
  if (!(v >= 0) || (i && v < shotStarts[i - 1])) throw new Error(`shot ${i} starts at ${v}`);
});
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  // the character FBX files carry their own ambient lights; our scenes light them instead
  for (const p of PEOPLE) p.traverse((o) => o.isLight && (o.visible = false));
  let i = SHOTS.length - 1;
  while (i > 0 && t < shotStarts[i]) i--;
  resetWorld(t);
  collar.visible = t >= C.on2; // his new collar from the day he comes home
  bandage.visible = t >= C.vet && t < C.shelter || t >= C.hejust;
  SHOTS[i][1](t - SHOTS[i][0], t);
  for (const p of PEOPLE) p.update();
  captions(t);
});

window.__dbg = { scene, camera, renderer, C, SHOTS, dog, girl, dad, vet, thief, visitor, visitorKid, gun, leash, hand };
short.start();
