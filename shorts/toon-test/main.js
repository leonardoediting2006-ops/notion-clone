// Style test: a cel-shaded 3D living room with flat 2D "paper puppet" people and the 3D cartoon hero dog.
import { createShort, THREE } from "../../js/engine.js";
import { toon, roundedBox, outline, outlineStatic, toonify, INK, toonGradient } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import { mergeGeometries } from "../../lib/jsm/utils/BufferGeometryUtils.js";

const DURATION = 6;
const short = createShort({ duration: DURATION, fps: 60, background: "#bfe6ff", fov: 50, lights: false });
const { scene, camera, renderer, onUpdate } = short;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (u) => u * u * (3 - 2 * u);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- paint helpers (flat, hand-painted textures) ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}
const toonTex = (map) => new THREE.MeshToonMaterial({ map, gradientMap: toonGradient() });

const floorTex = canvasTex(512, 512, (x, w, h) => {
  const rows = 8, ph = h / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 128;
    for (let c = -1; c < 3; c++) {
      const tone = 0.93 + rnd() * 0.12;
      x.fillStyle = `rgb(${Math.round(236 * tone)},${Math.round(184 * tone)},${Math.round(116 * tone)})`;
      x.fillRect(c * 256 + off, r * ph, 256, ph);
      x.strokeStyle = "rgba(150,92,44,0.8)"; x.lineWidth = 3;
      x.strokeRect(c * 256 + off, r * ph, 256, ph);
      x.strokeStyle = "rgba(255,255,255,0.18)"; x.lineWidth = 2;
      x.beginPath(); x.moveTo(c * 256 + off + 6, r * ph + 8); x.lineTo(c * 256 + off + 150, r * ph + 8); x.stroke();
    }
  }
}, [4, 3.7]);

const wallTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = "#8fd6ca"; x.fillRect(0, 0, w, h);
  x.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 4; i++) x.fillRect(i * 64 + 26, 0, 12, h);
  x.fillStyle = "rgba(255,255,255,0.28)";
  for (let y = 16; y < h; y += 64) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(i * 64 + 32, y + (i % 2) * 32, 4, 0, Math.PI * 2); x.fill(); }
}, [6, 3]);

const rugTex = canvasTex(512, 512, (x, w, h) => {
  const rings = ["#fff1d6", "#f0a27c", "#fff1d6", "#6fb6d8", "#fff1d6", "#f2c14e", "#fff1d6"];
  rings.forEach((c, i) => {
    x.fillStyle = c; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - i * 34, 0, Math.PI * 2); x.fill();
  });
  x.strokeStyle = "#2b1b16"; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2); x.stroke();
});

const skyTex = canvasTex(256, 320, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#5cb8ff"); g.addColorStop(0.7, "#bfe9ff"); g.addColorStop(1, "#e6f7ff");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = "#ffffff";
  for (const [cx, cy, s] of [[70, 80, 1], [190, 130, 0.8], [110, 190, 0.6]]) {
    for (const [dx, dy, r] of [[0, 0, 26], [28, 6, 20], [-26, 8, 18], [8, -14, 18]]) { x.beginPath(); x.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); x.fill(); }
  }
  x.fillStyle = "#6cc573"; // a green hill and a round tree
  x.beginPath(); x.ellipse(120, h + 20, 200, 70, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#8a5a36"; x.fillRect(196, 250, 10, 40);
  x.fillStyle = "#3fa55a"; x.beginPath(); x.arc(201, 238, 28, 0, Math.PI * 2); x.fill();
});

function artTex(a, b, c, kind) {
  return canvasTex(128, 160, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    x.fillStyle = b;
    if (kind === 0) { x.beginPath(); x.arc(64, 70, 38, 0, Math.PI * 2); x.fill(); x.fillStyle = c; x.fillRect(0, 110, w, 50); }
    if (kind === 1) { x.beginPath(); x.moveTo(0, 160); x.lineTo(60, 40); x.lineTo(128, 160); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(96, 36, 18, 0, Math.PI * 2); x.fill(); }
    if (kind === 2) { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : c; x.fillRect(16 + i * 24, 24, 16, 112); } }
  });
}

// ---------- the room ----------
const room = new THREE.Group();
scene.add(room);
function block(parent, w, h, d, color, x, y, z, { r = 0.04, ry = 0, rz = 0, rx = 0, shadow = true, mat } = {}) {
  const m = new THREE.Mesh(r > 0 ? roundedBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d), mat ?? toon(color));
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function cyl(parent, rt, rb, h, color, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(color));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(parent, r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), toon(color));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

const RW = 6.4, RZ0 = -3.0, RZ1 = 2.6, RH = 2.8;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RZ1 - RZ0).rotateX(-Math.PI / 2), toonTex(floorTex));
floor.position.set(0, 0, (RZ0 + RZ1) / 2); floor.receiveShadow = true; floor.userData.ink = false;
room.add(floor);
const wallM = toonTex(wallTex);
const back = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), wallM);
back.position.set(0, RH / 2, RZ0); back.receiveShadow = true; back.userData.ink = false;
const left = new THREE.Mesh(new THREE.PlaneGeometry(RZ1 - RZ0, RH).rotateY(Math.PI / 2), wallM);
left.position.set(-RW / 2, RH / 2, (RZ0 + RZ1) / 2); left.receiveShadow = true; left.userData.ink = false;
const right = new THREE.Mesh(new THREE.PlaneGeometry(RZ1 - RZ0, RH).rotateY(-Math.PI / 2), wallM);
right.position.set(RW / 2, RH / 2, (RZ0 + RZ1) / 2); right.receiveShadow = true; right.userData.ink = false;
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RZ1 - RZ0).rotateX(Math.PI / 2), toon(0xfff7e8));
ceil.position.set(0, RH, (RZ0 + RZ1) / 2); ceil.userData.ink = false;
room.add(back, left, right, ceil);

// white wainscot + baseboard + crown on the back wall
block(room, RW, 0.95, 0.05, 0xfff4e2, 0, 0.475, RZ0 + 0.03, { r: 0.01 });
block(room, RW, 0.06, 0.09, 0xffffff, 0, 0.97, RZ0 + 0.05, { r: 0.02 });
block(room, RW, 0.12, 0.08, 0xffffff, 0, 0.06, RZ0 + 0.05, { r: 0.02 });
block(room, RW, 0.1, 0.1, 0xffffff, 0, RH - 0.05, RZ0 + 0.06, { r: 0.02 });
block(room, 0.05, 0.95, RZ1 - RZ0, 0xfff4e2, -RW / 2 + 0.03, 0.475, (RZ0 + RZ1) / 2, { r: 0.01 });
block(room, 0.05, 0.95, RZ1 - RZ0, 0xfff4e2, RW / 2 - 0.03, 0.475, (RZ0 + RZ1) / 2, { r: 0.01 });

// window with a painted sky, curtains and a sill plant
const WX = -1.55, WY = 1.65;
const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.45), new THREE.MeshBasicMaterial({ map: skyTex }));
glass.position.set(WX, WY, RZ0 + 0.035); glass.userData.ink = false;
room.add(glass);
block(room, 1.5, 0.1, 0.09, 0xffffff, WX, WY + 0.8, RZ0 + 0.06, { r: 0.03 });
block(room, 1.5, 0.1, 0.09, 0xffffff, WX, WY - 0.8, RZ0 + 0.06, { r: 0.03 });
block(room, 0.1, 1.7, 0.09, 0xffffff, WX - 0.7, WY, RZ0 + 0.06, { r: 0.03 });
block(room, 0.1, 1.7, 0.09, 0xffffff, WX + 0.7, WY, RZ0 + 0.06, { r: 0.03 });
block(room, 0.06, 1.5, 0.06, 0xffffff, WX, WY, RZ0 + 0.055, { r: 0.02 });
block(room, 1.4, 0.06, 0.06, 0xffffff, WX, WY, RZ0 + 0.055, { r: 0.02 });
block(room, 1.8, 0.07, 0.24, 0xffffff, WX, WY - 0.88, RZ0 + 0.14, { r: 0.03 });
cyl(room, 0.55, 0.55, 0.05, 0x9b6b43, WX, WY + 1.03, RZ0 + 0.16, 18).rotation.z = Math.PI / 2; // rod
for (const s of [-1, 1]) {
  block(room, 0.42, 1.95, 0.12, 0xf08c72, WX + s * 1.02, WY + 0.0, RZ0 + 0.14, { r: 0.05 });
  block(room, 0.1, 1.95, 0.13, 0xd8725a, WX + s * 0.9, WY + 0.0, RZ0 + 0.15, { r: 0.04 });
}
{ // sill plant
  cyl(room, 0.07, 0.055, 0.12, 0xe8735a, WX + 0.4, WY - 0.81, RZ0 + 0.14);
  for (let i = 0; i < 5; i++) {
    const l = ball(room, 0.07, 0x4fbf6a, WX + 0.4 + (i - 2) * 0.035, WY - 0.67 + (i % 2) * 0.06, RZ0 + 0.14);
    l.scale.set(0.8, 1.5, 0.5); l.rotation.z = (i - 2) * 0.25;
  }
}

// sofa (faces the camera)
const SOFA_X = 1.1, SOFA_Z = -2.1, SEAT = 0.5;
const sofa = new THREE.Group();
sofa.position.set(SOFA_X, 0, SOFA_Z);
room.add(sofa);
const SC = 0xe8664f, SC2 = 0xd8543f;
block(sofa, 2.2, 0.36, 0.95, SC, 0, 0.26, 0, { r: 0.09 });
block(sofa, 2.2, 0.7, 0.26, SC, 0, 0.62, -0.36, { r: 0.1 });
for (const s of [-1, 1]) block(sofa, 0.26, 0.58, 0.95, SC2, s * 1.0, 0.42, 0, { r: 0.1 });
for (const s of [-1, 1]) block(sofa, 1.0, 0.16, 0.74, 0xf27a62, s * 0.5, SEAT - 0.08, 0.06, { r: 0.07 });
for (const s of [-1, 1]) block(sofa, 0.98, 0.52, 0.2, 0xf27a62, s * 0.5, 0.78, -0.2, { r: 0.08, rx: -0.12 });
block(sofa, 0.42, 0.42, 0.13, 0xf5c04a, -0.72, 0.8, 0.0, { r: 0.07, rz: 0.15, rx: -0.1 });
block(sofa, 0.38, 0.38, 0.12, 0x7fd3c3, 0.78, 0.76, 0.0, { r: 0.07, rz: -0.18, rx: -0.1 });
for (const [x, z] of [[-1.0, 0.38], [1.0, 0.38], [-1.0, -0.38], [1.0, -0.38]]) cyl(sofa, 0.05, 0.035, 0.1, 0x6a4128, x, 0.05, z, 12);

// art over the sofa, clock and a shelf with books on the right
const artSpecs = [[0xffd36e, 0xf06b5a, 0x6fb6d8, 0], [0x7fd3c3, 0xfff1d6, 0xf5c04a, 1], [0xf4a6b8, 0x8e7cc3, 0xfff1d6, 2]];
artSpecs.forEach(([a, b, c, k], i) => {
  const x = SOFA_X - 0.7 + i * 0.7;
  block(room, 0.5, 0.64, 0.05, 0xffffff, x, 1.72 + (i === 1 ? 0.06 : 0), RZ0 + 0.06, { r: 0.015 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.54), new THREE.MeshBasicMaterial({ map: artTex("#" + a.toString(16).padStart(6, "0"), "#" + b.toString(16).padStart(6, "0"), "#" + c.toString(16).padStart(6, "0"), k) }));
  art.position.set(x, 1.72 + (i === 1 ? 0.06 : 0), RZ0 + 0.09); art.userData.ink = false;
  room.add(art);
});
{ // bookshelf at the back-right
  const bs = new THREE.Group(); bs.position.set(2.65, 0, RZ0 + 0.22); room.add(bs);
  block(bs, 0.9, 1.9, 0.38, 0xb57a4a, 0, 0.95, 0, { r: 0.03 });
  const cols = [0xe8664f, 0x4aa3c9, 0xf5c04a, 0x7fd3c3, 0xf4a6b8, 0x8e7cc3, 0x6fbf6a];
  for (let r = 0; r < 4; r++) {
    block(bs, 0.82, 0.04, 0.4, 0x8a5a36, 0, 0.12 + r * 0.46, 0.0, { r: 0.01 });
    let x = -0.36;
    for (let i = 0; i < 7 && x < 0.34; i++) {
      const w = 0.05 + ((i * 7 + r * 3) % 4) * 0.02, h = 0.26 + ((i * 5 + r) % 3) * 0.05;
      block(bs, w, h, 0.26, cols[(i + r * 2) % cols.length], x + w / 2, 0.14 + r * 0.46 + h / 2, 0.04, { r: 0.012 });
      x += w + 0.012;
    }
  }
}
{ // floor lamp left of the sofa
  const lp = new THREE.Group(); lp.position.set(-0.3, 0, RZ0 + 0.4); room.add(lp);
  cyl(lp, 0.2, 0.22, 0.05, 0x6a4128, 0, 0.025, 0, 20);
  cyl(lp, 0.025, 0.025, 1.45, 0x6a4128, 0, 0.77, 0, 10);
  const shade = cyl(lp, 0.2, 0.3, 0.34, 0xfff0b8, 0, 1.6, 0, 20);
  shade.material = new THREE.MeshToonMaterial({ color: 0xfff0b8, gradientMap: toonGradient(), emissive: 0xffe08a, emissiveIntensity: 0.55 });
}
{ // big plant on the left
  const pl = new THREE.Group(); pl.position.set(-2.75, 0, RZ0 + 0.5); room.add(pl);
  cyl(pl, 0.26, 0.2, 0.4, 0xf4a6b8, 0, 0.2, 0, 20);
  cyl(pl, 0.25, 0.25, 0.04, 0x5a3a22, 0, 0.4, 0, 20);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = 0.12 + (i % 3) * 0.06;
    const l = ball(pl, 0.2, i % 2 ? 0x3fae5e : 0x57c474, Math.cos(a) * d, 0.78 + (i % 3) * 0.2, Math.sin(a) * d);
    l.scale.set(0.45, 1.0, 0.18); l.rotation.set(0.0, -a, Math.cos(a) * 0.5);
  }
}

// rug, low table with a mug, dog bed + bone + ball
const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.012, 48), toonTex(rugTex));
rug.position.set(0.05, 0.008, -0.55); rug.receiveShadow = true; rug.userData.ink = false;
room.add(rug);
block(room, 0.9, 0.05, 0.6, 0xc98a55, -1.15, 0.38, -0.95, { r: 0.025 });
for (const [x, z] of [[-1.5, -1.18], [-0.8, -1.18], [-1.5, -0.72], [-0.8, -0.72]]) cyl(room, 0.03, 0.025, 0.38, 0x8a5a36, x, 0.19, z, 10);
cyl(room, 0.05, 0.045, 0.1, 0xfff1d6, -1.0, 0.45, -0.95, 16);
block(room, 0.3, 0.04, 0.22, 0x4aa3c9, -1.3, 0.425, -0.9, { r: 0.012, ry: 0.4 });
cyl(room, 0.3, 0.32, 0.14, 0xf4a6b8, -2.0, 0.07, -0.2, 28);
cyl(room, 0.22, 0.22, 0.02, 0xfff1d6, -2.0, 0.142, -0.2, 28);
ball(room, 0.07, 0xf5c04a, 0.9, 0.07, 0.0);
block(room, 0.22, 0.06, 0.06, 0xfff1d6, 0.55, 0.05, 0.25, { r: 0.025, ry: 0.5 });

outlineStatic(room, { width: 0.016 });

// ---------- lights ----------
scene.add(new THREE.HemisphereLight(0xfff6e6, 0xe9c9a2, 1.9));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.6);
sun.position.set(-3.5, 5.5, 3.5);
sun.target.position.set(0.5, 0, -1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
sun.shadow.bias = -0.0005;
sun.shadow.radius = 5;
scene.add(sun, sun.target);

// ---------- people and the dog ----------
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#4aa3c9", pants: "#3b4a6b", shoes: "#f3efe6", outfit: "tee", sleeves: "short", seed: 1 });
scene.add(owner);

const dog = heroDog(DOG_COLORS.golden, "toon");
toonify(dog, { override: [[dog.materials.body, dog.colors.body], [dog.materials.light, dog.colors.light], [dog.materials.dark, dog.colors.dark]] });
outline(dog, { width: 0.012, min: 0.1 });
scene.add(dog);

// ---------- the story of the test ----------
function yawnEnv(t, t0, dur) {
  const u = (t - t0) / dur;
  if (u <= 0 || u >= 1) return 0;
  return u < 0.32 ? ease(u / 0.32) : u < 0.68 ? 1 : ease((1 - u) / 0.32);
}

onUpdate((t) => {
  const yo = yawnEnv(t, 1.0, 1.8); // you yawn
  const yd = yawnEnv(t, 2.5, 1.9); // he yawns back
  const hip = SEAT + 0.0;
  const mouth = owner.mouthPoint();
  const restR = [0.17, hip + 0.01];
  const toMouth = [mouth[0] + 0.03, mouth[1] - 0.1];
  owner.pose({
    t, x: SOFA_X, z: SOFA_Z + 0.5, sit: 1, seat: hip, flip: 1, cute: 0.4,
    look: [-0.7 * (1 - yo), -0.2 * (1 - yo)], // looks down-left at the dog
    eyes: { open: 1 - yo * 0.97 },
    brow: { raise: yo * 0.7, worry: yo * 0.2 },
    mouth: { open: yo, width: 1 - yo * 0.25, smile: lerp(0.35, 0.0, yo) },
    head: { tilt: -yo * 0.08 + 0.04 * (1 - yo), lift: yo * 0.025, turn: -0.5 * (1 - yo) },
    lean: yo * 0.04,
    armR: { to: [lerp(restR[0], toMouth[0], yo), lerp(restR[1], toMouth[1], yo)], bend: 1 },
    armL: { to: [-0.17, hip + 0.01], bend: -1 },
  });

  const dogYawn = yd;
  dog.pose({
    t, x: 0.3, z: -0.75, ry: 0.0, sit: 1, wag: 0.6 * (1 - dogYawn), wagSpeed: 9, cute: 1,
    headYaw: 0.55 * (1 - dogYawn * 0.6), headPitch: -0.28 - dogYawn * 0.25, headTilt: 0.12 * (1 - dogYawn),
    mouth: dogYawn, closed: Math.min(1, dogYawn * 1.4), ears: -dogYawn * 0.7,
  });

  // camera: a slow glide
  const u = t / DURATION;
  camera.position.set(0.7 + 0.2 * Math.sin(u * Math.PI), 1.15, 2.45 - 0.3 * u);
  camera.lookAt(0.6, 0.78, -1.2);
  camera.updateMatrixWorld(true);
  owner.faceCamera(camera);
});

window.__dbg = { scene, camera, owner, dog, renderer };
short.start();
