import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { createForest } from "../../js/trees.js";
import { createHuman, PRESETS } from "../../js/human.js";

// "What your dog thinks the mail carrier is" — pet-POV short.
// Every shot is a pure function of time, so scrubbing and rendering are exact.

const DURATION = 20;
const short = createShort({ duration: DURATION, lights: false, fov: 50 });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.05;
camera.far = 2000;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMappingExposure = 1.05;

// ---------- helpers ----------
const plain = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return plain.get(key);
};
const asMat = (m) => (typeof m === "number" ? mat(m) : m);

// Box with UVs in metres, so tiling textures keep a real-world scale.
function worldUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return geo;
}
function box(w, h, d, m, x = 0, y = 0, z = 0, parent, { uv = false } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (uv) worldUV(geo, w, h, d);
  const mesh = new THREE.Mesh(geo, asMat(m));
  mesh.position.set(x, y, z);
  parent?.add(mesh);
  return mesh;
}
function plane(w, h, m, parent) {
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  const mesh = new THREE.Mesh(geo, asMat(m));
  parent?.add(mesh);
  return mesh;
}
function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, asMat(m));
  me.position.set(x, y, z);
  parent?.add(me);
  return me;
}
const sphere = (r, m, x, y, z, parent, seg = 20) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m, x, y, z, parent);
// capsule lying along the given axis ("x" | "y" | "z")
function capsule(r, len, m, x, y, z, parent, axis = "y") {
  const geo = new THREE.CapsuleGeometry(r, len, 6, 14);
  if (axis === "z") geo.rotateX(Math.PI / 2);
  if (axis === "x") geo.rotateZ(Math.PI / 2);
  return mesh(geo, m, x, y, z, parent);
}
function group(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = {
  out: gsap.parseEase("power2.out"),
  inOut: gsap.parseEase("sine.inOut"),
  back: gsap.parseEase("back.out(2.5)"),
  snap: gsap.parseEase("expo.out"),
};
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- materials ----------
const tile = (m) => [1 / m, 1 / m];
const brick = new THREE.MeshStandardMaterial({
  map: short.loadTexture("textures/brick_diffuse.jpg", { repeat: tile(1.6) }),
  bumpMap: short.loadTexture("textures/brick_bump.jpg", { repeat: tile(1.6), color: false }),
  bumpScale: 3,
  roughness: 0.95,
});
const hardwood = new THREE.MeshStandardMaterial({
  map: short.loadTexture("textures/hardwood2_diffuse.jpg", { repeat: [1 / 3, 1 / 1.5] }),
  bumpMap: short.loadTexture("textures/hardwood2_bump.jpg", { repeat: [1 / 3, 1 / 1.5], color: false }),
  bumpScale: 1.5,
  roughness: 0.55,
});
const grass = new THREE.MeshStandardMaterial({
  map: short.loadTexture("textures/grass.jpg", { repeat: tile(3) }),
  roughness: 1,
});
const M = {
  brick,
  hardwood,
  grass,
  plaster: T.plaster(0xe4dac6, tile(2)),
  ceiling: T.plaster(0xf2eee6, tile(2)),
  door: T.paintedWood(0x4f6f91, [1, 1]),
  trim: T.paintedWood(0xf4f1ea, [1, 1]),
  fence: T.paintedWood(0xf0ede6, [1, 1]),
  concrete: T.concrete({ tile: 1, repeat: tile(1.2) }),
  sidewalk: T.concrete({ tile: 1, repeat: tile(1.5), color: 0xb5b0a6 }),
  asphalt: T.asphalt(),
  shingles: T.shingles(),
  bark: T.bark(),
  leaves: T.leaves(0),
  leaves2: T.leaves(1),
  rug: T.fabric(0x7e3434, { repeat: [4, 3], weave: 4 }),
  sofa: T.fabric(0x5a7aa0, { repeat: [3, 2], weave: 3 }),
  paper: T.paper(),
  glass: new THREE.MeshStandardMaterial({ color: 0x5f7f99, roughness: 0.08, metalness: 0.7 }),
  furBody: T.fur(0xc68f55),
  furLight: T.fur(0xeed4ab, { key: "light" }),
  furDark: T.fur(0x74482a, { key: "dark", streak: 0.7 }),
  nose: new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.25 }),
  eye: new THREE.MeshStandardMaterial({ color: 0x2b1a0e, roughness: 0.08 }),
  shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
};
M.asphalt.map.repeat.set(1 / 4, 1 / 4);
M.asphalt.bumpMap.repeat.set(1 / 4, 1 / 4);
M.shingles.map.repeat.set(1 / 2, 1 / 2);

// ---------- lights + sky ----------
const hemi = new THREE.HemisphereLight(0xdfeaff, 0x7a6a52, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.position.set(9, 13, 16);
sun.target.position.set(0, 0, 4);
scene.add(sun, sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
const roomLight = new THREE.PointLight(0xffe2b8, 26, 16, 1.4);
roomLight.position.set(0.5, 2.7, -3.6);
scene.add(roomLight);

const skyMat = new THREE.MeshBasicMaterial({ map: T.skyTexture("day"), side: THREE.BackSide, fog: false });
const skyDome = mesh(new THREE.SphereGeometry(450, 48, 24), skyMat, 0, 0, 0, scene);
const SPACE = new THREE.Color(0x000000);

// ---------- house: front wall at z=0, outside is +z, inside is -z ----------
const world = group(0, 0, 0, scene);
// front wall: brick outside, plaster inside, around a 1.3 x 2.3 door opening
for (const [w, h, x, y] of [[5.35, 3.2, -3.325, 1.6], [5.35, 3.2, 3.325, 1.6], [1.3, 0.9, 0, 2.75]]) {
  box(w, h, 0.1, M.brick, x, y, 0.05, world, { uv: true });
  box(w, h, 0.1, M.plaster, x, y, -0.05, world, { uv: true });
}
// door with a window (1.0..1.7 high) and a mail slot
const door = group(0, 0, 0, world);
box(1.3, 1.0, 0.08, M.door, 0, 0.5, 0, door);
box(1.3, 0.6, 0.08, M.door, 0, 2.0, 0, door);
box(0.2, 0.7, 0.08, M.door, -0.55, 1.35, 0, door);
box(0.2, 0.7, 0.08, M.door, 0.55, 1.35, 0, door);
for (const [x, y, w, h] of [[0, 0.5, 0.95, 0.7], [0, 2.0, 0.95, 0.4]]) {
  box(w, h, 0.02, M.door, x, y, 0.045, door).scale.set(1, 1, 1); // raised panels
}
const glass = new THREE.Mesh(
  new THREE.PlaneGeometry(0.9, 0.7),
  new THREE.MeshStandardMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.05, metalness: 0.3 })
);
glass.position.set(0, 1.35, 0);
door.add(glass);
box(0.36, 0.05, 0.1, 0x1c1c1c, 0, 0.82, 0, door); // mail slot
box(0.42, 0.11, 0.015, new THREE.MeshStandardMaterial({ color: 0xb08d3a, metalness: 0.9, roughness: 0.3 }), 0, 0.82, 0.05, door);
sphere(0.045, new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.9, roughness: 0.25 }), 0.5, 1.0, 0.07, door, 12);
// trim + outside details
box(1.5, 0.12, 0.26, M.trim, 0, 2.36, 0.02, world);
box(0.1, 2.36, 0.26, M.trim, -0.7, 1.18, 0.02, world);
box(0.1, 2.36, 0.26, M.trim, 0.7, 1.18, 0.02, world);
box(12.4, 0.28, 1.6, M.shingles, 0, 3.32, 0.4, world, { uv: true }); // roof edge
box(12.4, 0.12, 0.08, M.trim, 0, 3.15, 1.2, world); // gutter board
box(2.2, 0.14, 1.4, M.concrete, 0, 0.07, 0.8, world, { uv: true }); // step
for (const x of [-3, 3]) {
  box(1.4, 1.2, 0.04, M.glass, x, 1.6, 0.1, world);
  box(1.6, 0.1, 0.25, M.trim, x, 0.95, 0.15, world);
  box(1.6, 0.1, 0.12, M.trim, x, 2.25, 0.12, world);
  box(0.08, 1.2, 0.14, M.trim, x - 0.74, 1.6, 0.12, world);
  box(0.08, 1.2, 0.14, M.trim, x + 0.74, 1.6, 0.12, world);
  box(0.06, 1.2, 0.1, M.trim, x, 1.6, 0.12, world);
  box(1.4, 1.2, 0.02, T.fabric(0xe8e0d0, { key: "curtain" }), x, 1.6, -0.12, world); // curtain inside
}

const forest = createForest(world);
for (const x of [-1.7, 1.7, -4.4, 4.4]) forest.bush(x, 0.55, 1.2);

// yard, path, fence, gate, street
const ground = plane(80, 60, M.grass, world);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0, 30);
box(1.2, 0.03, 8, M.concrete, 0, 0.012, 4.1, world, { uv: true }); // path
for (let x = -10; x <= 10; x += 0.45) {
  if (Math.abs(x) < 0.7) continue;
  const p = box(0.1, 0.9, 0.05, M.fence, x, 0.45, 8, world);
  const tip = mesh(new THREE.ConeGeometry(0.07, 0.12, 4), M.fence, 0, 0.5, 0, p);
  tip.rotation.y = Math.PI / 4;
}
box(20, 0.07, 0.04, M.fence, 0, 0.7, 7.97, world);
box(20, 0.07, 0.04, M.fence, 0, 0.25, 7.97, world);
const gate = group(-0.65, 0, 8, world);
for (let i = 0; i < 3; i++) box(0.1, 0.9, 0.05, M.fence, 0.2 + i * 0.45, 0.45, 0, gate);
box(1.3, 0.07, 0.04, M.fence, 0.65, 0.65, 0, gate);
box(1.3, 0.07, 0.04, M.fence, 0.65, 0.25, 0, gate);
box(80, 0.06, 2, M.sidewalk, 0, 0.03, 9.2, world, { uv: true });
box(80, 0.03, 5, M.asphalt, 0, 0.012, 12.7, world, { uv: true });
for (let x = -30; x < 30; x += 3) box(1.4, 0.005, 0.12, mat(0xe8cf52, { roughness: 0.6 }), x, 0.03, 12.7, world);
box(80, 0.06, 2, M.sidewalk, 0, 0.03, 16.2, world, { uv: true });
// houses across the street
const houseCols = [0xd8c2a0, 0xa8bfd0, 0xc9a9a6, 0xb7c9a2, 0xe0d6c0];
for (let i = -3; i <= 3; i++) {
  const hx = i * 7 + 1.5;
  box(5, 3, 4, T.siding(houseCols[(i + 3) % houseCols.length]), hx, 1.5, 20, world);
  const roof = mesh(new THREE.ConeGeometry(3.8, 1.8, 4), M.shingles, hx, 3.9, 20, world);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.8;
  box(1, 2, 0.1, T.paintedWood(0x6b4a3a), hx, 1, 17.98, world);
  box(1, 0.8, 0.1, M.glass, hx - 1.6, 1.8, 17.98, world);
  box(1, 0.8, 0.1, M.glass, hx + 1.6, 1.8, 17.98, world);
  forest.bush(hx - 1.8, 17.5, 1);
}
for (let i = 0; i < 14; i++) forest.tree(-24 + i * 3.7 + rand(), 17 + rand() * 1.2, { height: 2.6 + rand() * 0.8, scale: 1.25 });
forest.tree(-3.4, 5.5, { height: 2.9, scale: 1.35 });
forest.tree(4.6, 6.2, { height: 2.6, scale: 1.25 });
forest.build();

// interior (z from -8 to 0)
const floor = plane(12, 8, M.hardwood, world);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0.002, -4);
box(12, 3.2, 0.2, M.plaster, 0, 1.6, -8, world, { uv: true });
box(0.2, 3.2, 8, M.plaster, -6, 1.6, -4, world, { uv: true });
box(0.2, 3.2, 8, M.plaster, 6, 1.6, -4, world, { uv: true });
box(12, 0.1, 8, M.ceiling, 0, 3.2, -4, world, { uv: true });
box(12, 0.12, 0.03, M.trim, 0, 0.06, -7.89, world); // skirting
box(0.03, 0.12, 8, M.trim, -5.89, 0.06, -4, world);
box(0.03, 0.12, 8, M.trim, 5.89, 0.06, -4, world);
box(3.4, 0.012, 2.2, M.rug, 0.5, 0.008, -3.6, world);
// sofa + family on the back wall
const sofa = group(1.5, 0, -6.8, world);
capsule(0.22, 2.9, M.sofa, 0, 0.24, 0.05, sofa, "x").scale.set(1, 1, 2.2);
capsule(0.17, 2.9, M.sofa, 0, 0.72, -0.36, sofa, "x").scale.set(1, 2.2, 1);
capsule(0.15, 0.6, M.sofa, -1.6, 0.4, 0, sofa, "z").scale.set(1, 1.3, 1);
capsule(0.15, 0.6, M.sofa, 1.6, 0.4, 0, sofa, "z").scale.set(1, 1.3, 1);
for (const x of [-1.4, 1.4]) box(0.06, 0.12, 0.06, 0x2a1b10, x, 0.06, 0.3, sofa);
const frame = box(1.6, 1.0, 0.05, T.paintedWood(0x2e2018), -2.6, 1.9, -7.88, world);
box(1.4, 0.82, 0.01, T.leaves(1), 0, 0, 0.03, frame); // painting
const lamp = group(4.4, 0, -6.6, world);
mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), mat(0x2a2a2a, { metalness: 0.8, roughness: 0.3 }), 0, 0.75, 0, lamp);
mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.35, 16, 1, true), mat(0xfff1c9, { emissive: 0x806a40, side: THREE.DoubleSide }), 0, 1.6, 0, lamp);
mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 16), mat(0x2a2a2a), 0, 0.015, 0, lamp);

// mail carrier (generic uniform)
const carrier = createHuman(PRESETS.mailCarrier);
const bagM = T.fabric(0x6e4a2a, { key: "bag", weave: 2 });
box(0.11, 0.3, 0.36, bagM, 0.225, 0.98, 0.0, carrier); // satchel
// cross-body strap: a flattened ring from the left shoulder to the right hip
const strapPivot = group(0.04, 1.225, -0.005, carrier);
strapPivot.rotation.z = Math.atan2(0.49, -0.32);
const strap = mesh(new THREE.TorusGeometry(1, 0.035, 6, 40), bagM, 0, 0, 0, strapPivot);
strap.rotation.x = Math.PI / 2;
strap.scale.set(0.3, 0.125, 0.3);
const letters = [];
for (let i = 0; i < 3; i++) letters.push(box(0.24, 0.006, 0.13, M.paper, 0, 0, 0, world));
world.add(carrier);

// family on the sofa
const family = [createHuman(PRESETS.dad), createHuman(PRESETS.mom)];
family.forEach((f, i) => {
  f.sit();
  f.position.set(0.9 + i * 1.2, -0.41, -6.85);
  box(0.075, 0.15, 0.012, mat(0x111111, { roughness: 0.2 }), 0, -0.1, 0.04, f.handR).rotation.x = -0.4; // phone
  f.head.rotation.x = 0.45; // staring at the phone
  world.add(f);
});

// ---------- the dog (original blocky character, faces +z, fur-textured) ----------
const dog = group(0, 0, 0, scene);
const pivot = group(0, 0.36, -0.35, dog); // hips: rotate X to rear up
box(0.46, 0.42, 0.92, M.furBody, 0, 0.22, 0.35, pivot); // body
box(0.4, 0.06, 0.5, M.furLight, 0, 0.0, 0.45, pivot); // belly
const legs = {};
function leg(name, x, y, z, parent) {
  const g = group(x, y, z, parent);
  box(0.13, 0.36, 0.14, M.furBody, 0, -0.17, 0, g);
  box(0.15, 0.06, 0.18, M.furLight, 0, -0.35, 0.02, g);
  legs[name] = g;
}
leg("fl", -0.14, 0.04, 0.68, pivot);
leg("fr", 0.14, 0.04, 0.68, pivot);
leg("bl", -0.15, 0.36, -0.3, dog);
leg("br", 0.15, 0.36, -0.3, dog);
const neck = group(0, 0.36, 0.78, pivot);
const head = group(0, 0.08, 0.02, neck);
box(0.4, 0.38, 0.4, M.furBody, 0, 0.1, 0.04, head);
box(0.24, 0.17, 0.28, M.furLight, 0, 0.0, 0.32, head);
box(0.08, 0.055, 0.05, M.nose, 0, 0.075, 0.465, head); // nose
const jaw = group(0, -0.08, 0.2, head);
box(0.2, 0.06, 0.24, M.furLight, 0, -0.02, 0.1, jaw);
box(0.14, 0.02, 0.18, mat(0xd9465c, { roughness: 0.4 }), 0, 0.012, 0.1, jaw); // tongue
const eyes = [];
const brows = [];
for (const s of [-1, 1]) {
  const e = group(s * 0.1, 0.17, 0.245, head);
  e.white = box(0.085, 0.085, 0.02, mat(0xf4f1ea, { roughness: 0.3 }), 0, 0, 0, e);
  e.iris = box(0.07, 0.074, 0.02, mat(0x4a2a12, { roughness: 0.05 }), s * -0.006, -0.004, 0.005, e);
  e.pupil = box(0.055, 0.06, 0.02, M.eye, s * -0.01, -0.005, 0.008, e);
  e.shine = box(0.02, 0.02, 0.01, M.shine, s * -0.02, 0.012, 0.02, e);
  e.shine2 = box(0.011, 0.011, 0.01, M.shine, s * 0.012, -0.022, 0.02, e);
  e.blush = box(0.07, 0.03, 0.01, new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55, depthWrite: false }), s * 0.035, -0.085, 0.002, e);
  eyes.push(e);
  brows.push(box(0.12, 0.03, 0.03, M.furDark, s * 0.1, 0.24, 0.25, head));
}
const ears = [];
for (const s of [-1, 1]) {
  const e = group(s * 0.2, 0.27, 0.0, head);
  box(0.06, 0.28, 0.17, M.furDark, s * 0.03, -0.13, 0, e);
  ears.push(e);
}
box(0.44, 0.08, 0.14, mat(0xb3261e, { roughness: 0.5 }), 0, -0.04, -0.02, neck); // collar
box(0.07, 0.08, 0.02, new THREE.MeshStandardMaterial({ color: 0xe0b83c, metalness: 0.9, roughness: 0.25 }), 0, -0.1, 0.06, neck); // tag
const tail = group(0, 0.36, -0.1, pivot);
box(0.07, 0.07, 0.36, M.furBody, 0, 0, -0.17, tail);
const cape = group(0, 0.46, 0.68, pivot);
const capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85, 1, 4), T.fabric(0xc8201f, { key: "cape", weave: 2 }));
capeMesh.material.side = THREE.DoubleSide;
capeMesh.position.set(0, 0, -0.42);
capeMesh.rotation.x = -Math.PI / 2 + 0.15;
cape.add(capeMesh);

function dogPose({
  x = 0, y = 0, z = 0, ry = 0,
  rear = 0, headYaw = 0, headPitch = 0, jawOpen = 0,
  wag = 0, wagSpeed = 18, t = 0, trot = 0,
  squint = 0, angry = 0, earUp = 0, capeOn = false, cute = 0, tilt = 0,
} = {}) {
  dog.position.set(x, y, z);
  dog.rotation.set(0, ry, 0);
  pivot.rotation.x = -rear * 1.0;
  neck.rotation.set(rear * 1.0 + headPitch, headYaw, tilt);
  head.rotation.set(0, 0, 0);
  jaw.rotation.x = jawOpen * 0.55;
  tail.rotation.set(-0.7, Math.sin(t * wagSpeed) * 0.7 * wag, 0);
  const s = Math.sin(t * 11) * 0.7 * trot;
  legs.fl.rotation.x = s - rear * 0.6;
  legs.fr.rotation.x = -s - rear * 0.6;
  legs.bl.rotation.x = -s;
  legs.br.rotation.x = s;
  dog.position.y += Math.abs(Math.sin(t * 11)) * 0.04 * trot;
  for (const e of eyes) {
    // cute = big glossy puppy eyes: iris fills the eye, two sparkles, blush
    const big = 1 + cute * 0.45;
    e.scale.set(big, big * (1 - squint * 0.7), 1);
    e.iris.visible = cute > 0;
    e.pupil.scale.set(1 + cute * 0.15, 1 + cute * 0.15, 1);
    e.shine.scale.setScalar(1 + cute * 0.8);
    e.shine.position.y = 0.012 + cute * 0.008;
    e.shine2.visible = e.blush.visible = cute > 0;
  }
  brows.forEach((b, i) => {
    const side = i === 0 ? -1 : 1;
    b.rotation.z = side * angry * 0.45 - side * cute * 0.35;
    b.position.y = 0.24 - angry * 0.03 + cute * 0.035;
  });
  ears.forEach((e, i) => (e.rotation.z = (i === 0 ? -1 : 1) * earUp * 0.5));
  cape.visible = capeOn;
}

// ---------- space set (fantasy cutaways) ----------
const SPACE_Y = 600;
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 2500; i++) {
  const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = 30 + rand() * 60;
  const sq = Math.sqrt(1 - u * u);
  starPos.push(Math.cos(th) * sq * r, SPACE_Y + u * r, Math.sin(th) * sq * r);
}
starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true }));
scene.add(stars);
const spaceRim = new THREE.PointLight(0x8fb0ff, 30, 0, 2);
spaceRim.position.set(-2, SPACE_Y + 2, -2);
scene.add(spaceRim);

// shadows for everything solid
scene.traverse((o) => {
  if (o.isMesh && o !== skyDome && o !== glass && o.material !== M.glass) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
});
ground.castShadow = false;
floor.castShadow = false;

// ---------- overlays ----------
const captionEl = document.getElementById("caption");
const qmarkEl = document.getElementById("qmark");
const boardEl = document.getElementById("scoreboard");
const boardNum = document.getElementById("sb-dog");

const CAPTIONS = [
  [0.0, "every day at noon"], [0.8, "a stranger"],
  [1.6, "walks right up"], [2.3, "to your house"],
  [3.0, "your dog"], [3.7, "sounds the alarm"],
  [4.4, "and the stranger"], [5.0, "leaves"],
  [5.6, "it has no idea"], [6.3, "what mail is"],
  [7.0, "so in its mind"],
  [8.4, "it defeated"], [9.2, "an invader"],
  [10.0, "with one bark"],
  [11.4, "your family"], [12.2, "never thanks it"],
  [13.0, "10 years"], [13.8, "undefeated"],
  [14.6, "but every day"], [15.4, "he comes back"],
  [16.2, "and every day"], [17.1, "it's ready"],
  [18.0, "every day at noon"],
];

const v3 = new THREE.Vector3();
function toScreen(x, y, z) {
  camera.updateMatrixWorld();
  v3.set(x, y, z).project(camera);
  return [(v3.x + 1) / 2 * 1080, (1 - v3.y) / 2 * 1920];
}
function look(px, py, pz, tx, ty, tz, fov = 50) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
}

// ---------- shots ----------
const DAY_FOG = new THREE.Fog(0xc6d3dd, 30, 150);
const RED_FOG = new THREE.Fog(0xb8352a, 22, 80);
const fill = new THREE.DirectionalLight(0xfff4e6, 0);
scene.add(fill, fill.target);
function setEnv(kind, { exposure = 1.05, fillIntensity = 0 } = {}) {
  const space = kind === "space";
  renderer.toneMappingExposure = exposure;
  fill.intensity = fillIntensity;
  skyDome.visible = !space;
  scene.background = space ? SPACE : null;
  skyMat.map = T.skyTexture(kind === "red" ? "red" : "day");
  scene.fog = space ? null : kind === "red" ? RED_FOG : DAY_FOG;
  hemi.color.set(kind === "red" ? 0xffb8a8 : 0xdfeaff);
  hemi.intensity = kind === "red" ? 2.4 : 1.6;
  sun.color.set(kind === "red" ? 0xff9a70 : 0xfff0d8);
}
function resetWorld() {
  carrier.position.set(0, 0, 30);
  carrier.rotation.set(0, Math.PI, 0);
  carrier.resetPose();
  gate.rotation.y = 0;
  letters.forEach((l) => (l.visible = false));
  qmarkEl.style.display = "none";
  boardEl.style.display = "none";
}
const walk = (p, phase, amt = 0.5) => p.walk(phase, amt);

// dog standing on its hind legs at the door window, carrier walking up the path
function windowShot(lt, { start = 9.5, speed = 1.6 } = {}) {
  setEnv("day");
  dogPose({ z: -0.5, rear: 1, wag: 1, t: lt, earUp: 0.3, cute: 1, tilt: 0.12 });
  carrier.position.set(0, 0, start - lt * speed);
  carrier.rotation.y = Math.PI;
  walk(carrier, lt * 7);
}

const SHOTS = [
  // 1 — behind the dog, looking through the door window at the stranger
  [0.0, (lt) => {
    windowShot(lt);
    look(0.62, 1.6, -2.9 + lt * 0.15, 0.12, 1.3, 1);
  }],
  // 2 — outside: dog's face squashed against the glass
  [1.6, (lt) => {
    windowShot(lt + 1.6);
    carrier.position.z = 30;
    dogPose({ z: -0.42, rear: 1, wag: 1, t: lt, earUp: 0.6, cute: 1, tilt: 0.22 * Math.sin(Math.min(lt, 1.2) * 1.4), jawOpen: 0.25 + Math.sin(lt * 14) * 0.08 });
    look(0.75, 0.95, 3.0 - lt * 0.12, 0, 1.3, 0);
  }],
  // 3 — profile: barking at the door
  [3.0, (lt) => {
    setEnv("day");
    const bark = Math.pow(Math.abs(Math.sin(lt * 9)), 2);
    dogPose({ z: -0.5, rear: 1, jawOpen: bark, headPitch: -bark * 0.15, wag: 1, wagSpeed: 25, t: lt, earUp: 0.8, angry: 0.6 });
    const shake = Math.sin(lt * 53) * 0.015 + Math.sin(lt * 37) * 0.01;
    look(-2.5 + shake, 1.2 + shake, -0.9, 0, 1.05, -0.3);
  }],
  // 4 — over the carrier's shoulder: letters go through the slot, he leaves
  [4.4, (lt) => {
    setEnv("day", { exposure: 1.3, fillIntensity: 1.6 });
    const bark = Math.pow(Math.abs(Math.sin(lt * 9)), 2);
    dogPose({ z: -0.5, rear: 1, jawOpen: bark, t: lt, earUp: 0.8, angry: 0.6 });
    const reach = ease.out(prog(lt, 0, 0.3));
    const turn = ease.inOut(prog(lt, 0.55, 0.85));
    carrier.position.set(0.15, 0, 0.6 + Math.max(0, lt - 0.8) * 1.4);
    carrier.rotation.y = Math.PI - turn * Math.PI;
    carrier.armR.rotation.x = -0.75 * reach * (1 - turn);
    carrier.elbowR.rotation.x = -0.15 - 0.5 * reach * (1 - turn);
    if (lt > 0.8) walk(carrier, (lt - 0.8) * 7);
    letters.forEach((l, i) => {
      const p = prog(lt, 0.25 + i * 0.06, 0.5 + i * 0.06);
      l.visible = p < 1;
      l.position.set(0.05 + i * 0.02, 1.0 - p * 0.18 + i * 0.015, 0.3 - p * 0.3);
      l.rotation.set(0, 0, 0);
    });
    look(1.35, 2.05, 3.4, -0.05, 1.05, 0);
    fill.position.set(2.5, 2.5, 4);
    fill.target.position.set(0, 1, 0.5);
  }],
  // 5 — top-down: dog sniffs the letters, red "?"
  [5.6, (lt) => {
    setEnv("day");
    const spots = [[-0.1, -0.45, 0.4], [0.18, -0.55, -0.5], [0.0, -0.72, 1.2]];
    letters.forEach((l, i) => {
      l.visible = true;
      l.position.set(spots[i][0], 0.01 + i * 0.004, spots[i][1]);
      l.rotation.set(0, spots[i][2], 0);
    });
    const sniff = Math.sin(lt * 14) * 0.06;
    dogPose({ x: 0.75, z: -1.45, ry: -0.62, headPitch: 0.55 + sniff, headYaw: Math.sin(lt * 3) * 0.2, wag: 0.5, t: lt, cute: 1 });
    look(0.3, 2.3, -0.25, 0.15, 0.1, -0.85);
    const pop = ease.back(prog(lt, 0.55, 0.85));
    if (lt > 0.55) {
      const [sx, sy] = toScreen(0.05, 0.15, -0.6);
      qmarkEl.style.display = "block";
      qmarkEl.style.left = `${sx}px`;
      qmarkEl.style.top = `${sy - 40}px`;
      qmarkEl.style.transform = `translate(-50%, -100%) scale(${pop}) rotate(${Math.sin(lt * 6) * 6}deg)`;
    }
  }],
  // 6 — extreme close-up: suspicious squint
  [7.0, (lt) => {
    setEnv("day");
    const sq = ease.out(prog(lt, 0.15, 0.6));
    dogPose({ x: 0, z: -3, squint: sq * 0.75, angry: sq, t: lt, earUp: 0.2 });
    look(0, 1.2, -0.3 - lt * 0.25, 0, 0.95, -2.4, 20);
  }],
  // 7 — fantasy: proud hero dog in space, cape flapping, slow orbit
  [8.4, (lt) => {
    setEnv("space");
    dogPose({ y: SPACE_Y, ry: 0.35, headPitch: 0.05, wag: 0.6, t: lt, earUp: 0.5, capeOn: true, cute: 0.7 });
    capeMesh.rotation.x = -Math.PI / 2 + 0.25 + Math.sin(lt * 9) * 0.18;
    const a = 0.25 + lt * 0.35;
    look(Math.sin(a) * 4.2, SPACE_Y + 0.45, Math.cos(a) * 4.2, 0, SPACE_Y + 0.6, 0, 32);
  }],
  // 8 — red sky: the "invader" fleeing down the street in slow motion
  [10.0, (lt) => {
    setEnv("red", { exposure: 1.45, fillIntensity: 1.4 });
    fill.position.set(-4, 3, 6);
    fill.target.position.set(1, 1, 12);
    dogPose({ z: -30 });
    carrier.position.set(-0.5 + lt * 1.6, 0, 12.3);
    carrier.rotation.y = Math.PI / 2;
    walk(carrier, lt * 4.5, 1.0);
    carrier.head.rotation.y = -0.9; // glancing back in terror
    look(-3.2, 1.25, 8.6, 1.2, 1.0, 12.5);
  }],
  // 9 — floor-level tracking: dog trots past the family, nobody looks up
  [11.4, (lt) => {
    setEnv("day");
    carrier.head.rotation.y = 0;
    const x = -2.2 + lt * 2.2;
    dogPose({ x, z: -4.6, ry: Math.PI / 2, trot: 1, wag: 1, t: lt, headPitch: -0.2, earUp: 0.4, cute: 1, jawOpen: 0.3 });
    look(x - 1.2, 0.5, -1.7, x + 0.3, 0.8, -5.8);
  }],
  // 10 — fantasy scoreboard: 10 years undefeated
  [13.0, (lt) => {
    setEnv("space");
    dogPose({ y: SPACE_Y, ry: 0, headPitch: -0.35, wag: 0.8, t: lt, earUp: 0.5, capeOn: true, cute: 0.7 });
    capeMesh.rotation.x = -Math.PI / 2 + 0.25 + Math.sin(lt * 9) * 0.18;
    look(0, SPACE_Y + 1.9, 3.6 - lt * 0.25, 0, SPACE_Y + 1.25, 0);
    boardEl.style.display = "block";
    const s = ease.back(prog(lt, 0, 0.35));
    boardEl.style.transform = `scale(${s * (1 + lt * 0.04)})`;
    boardNum.textContent = Math.round(3650 * ease.out(prog(lt, 0.1, 0.9))).toLocaleString("en-US");
  }],
  // 11 — next day: gate squeaks, head snaps toward the door
  [14.6, (lt) => {
    setEnv("day");
    const snap = ease.snap(prog(lt, 0.55, 0.75));
    dogPose({ z: -1.3, headYaw: lerp(1.3, 0, snap), headPitch: lerp(0.35, -0.1, snap), earUp: snap, t: lt, wag: 0.2, cute: 1 - snap });
    carrier.position.set(0.05, 0, 8.4);
    carrier.rotation.y = Math.PI;
    gate.rotation.y = -ease.inOut(prog(lt, 0.2, 1.2)) * 1.1;
    look(0.45, 1.25, -3.3, 0.05, 1.05, 2);
  }],
  // 12 — close-up: dead serious, one ear twitch
  [16.2, (lt) => {
    setEnv("day");
    const twitch = Math.max(0, Math.sin(prog(lt, 0.9, 1.15) * Math.PI));
    dogPose({ x: 0, z: -3, angry: 0.35, squint: 0.2, t: lt, earUp: 0.3 });
    ears[1].rotation.z = 0.15 + twitch * 0.9;
    look(0.1, 1.2, -0.1 - lt * 0.15, 0, 0.92, -2.4, 24);
  }],
  // 13 — loop: back to the opening shot
  [18.0, (lt) => {
    windowShot(lt);
    look(0.62, 1.6, -2.9 + lt * 0.15, 0.12, 1.3, 1);
  }],
];

let lastCaption = null;
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i][0]) i--;
  resetWorld();
  SHOTS[i][1](t - SHOTS[i][0]);

  let c = "";
  for (const [ct, text] of CAPTIONS) if (t >= ct) c = text;
  if (c !== lastCaption) captionEl.textContent = lastCaption = c;
});

window.__dbg = { scene, camera, renderer }; // used by preview screenshots
short.start();
