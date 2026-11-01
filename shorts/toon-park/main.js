// Style test 2: the same flat 2D people and cartoon dog, now outdoors in a toon park with a natural palette.
import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";

const DURATION = 6;
const CAM = new URLSearchParams(location.search).get("cam");
const TIGHT = CAM === "tight";
const short = createShort({ duration: DURATION, fps: 60, background: "#bfe6ff", fov: 60, lights: false });
const { scene, camera, renderer, onUpdate } = short;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.background = W.skyTexture();

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (u) => u * u * (3 - 2 * u);
const world = new THREE.Group();
scene.add(world);
const put = (o, x, y, z, ry = 0, s) => {
  o.position.set(x, y, z); o.rotation.y = ry;
  if (s) o.scale.multiplyScalar(s);
  world.add(o);
  return o;
};

// ground (flat park that rolls into hills far away), plaza, paths
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const heightAt = (x, z) => {
  const far = smooth(0, 24, -19 - z);
  const side = smooth(14, 30, Math.abs(x)) * 2.2;
  const bumps = 3.4 + 2.2 * Math.sin(x * 0.11 + 1.3) + 1.4 * Math.sin(x * 0.23 + z * 0.07) + 1.0 * Math.sin(z * 0.15);
  return far * Math.max(0, bumps) + side * smooth(-14, -30, z + 6) * 0;
};
world.add(W.terrainMesh({ x0: -70, x1: 70, z0: -22, z1: 25, step: 1.25, heightAt, material: W.grassMaterial([34, 11]) }));
// far hills: the same lawn painted with bigger tufts, so grass strokes still read from a distance
world.add(W.terrainMesh({ x0: -90, x1: 90, z0: -90, z1: -22, step: 1.5, heightAt, material: W.grassMaterial([9, 5]) }));
const payC = document.createElement("canvas"); payC.width = payC.height = 256;
{
  const x = payC.getContext("2d");
  x.fillStyle = "#f4e1bb"; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "#e5c994"; x.lineWidth = 5;
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) { x.strokeRect(c * 64 + (r % 2) * 32, r * 64, 64, 64); }
  x.fillStyle = "rgba(255,255,255,0.35)";
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) x.fillRect(c * 64 + (r % 2) * 32 + 8, r * 64 + 8, 22, 6);
}
const payT = new THREE.CanvasTexture(payC);
payT.colorSpace = THREE.SRGBColorSpace; payT.wrapS = payT.wrapT = THREE.RepeatWrapping; payT.repeat.set(7, 7); payT.anisotropy = 8;
const sandM = new THREE.MeshToonMaterial({ map: payT, gradientMap: toon(0).gradientMap });
const edgeM = toon(W.PAL.sandEdge);
const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.75, 0.02, 48), edgeM);
ring.position.set(0, 0.01, -1.7); ring.receiveShadow = true; ring.userData.ink = false; world.add(ring);
const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.03, 48), sandM);
plaza.position.set(0, 0.02, -1.7); plaza.receiveShadow = true; plaza.userData.ink = false; world.add(plaza);
for (const [z0, z1] of [[-3.0, -40], [3.0, 14]]) {
  const len = Math.abs(z1 - z0);
  const e = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, len), edgeM);
  e.position.set(0, 0.01, (z0 + z1) / 2); e.receiveShadow = true; e.userData.ink = false; world.add(e);
  const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, len), sandM);
  p.position.set(0, 0.02, (z0 + z1) / 2); p.receiveShadow = true; p.userData.ink = false; world.add(p);
}

// benches and lamps
put(W.bench({ w: 1.3 }), -0.95, 0, -2.9);
put(W.bench({ w: 1.3 }), 0.95, 0, -2.9);
put(W.lampPost(2.7), -3.4, 0, -3.4);
put(W.lampPost(2.7), 3.4, 0, -3.4);

// trees, bushes, grass (real branches and leaves)
const treeSpots = [
  [-4.3, -4.8, "oak", 4.7, 2.0, 1], [4.5, -5.2, "maple", 4.5, 1.9, 2], [-2.3, -8.6, "birch", 4.6, 1.5, 3], [2.9, -9.0, "oak", 4.9, 2.1, 4],
  [-7.4, -7.2, "oak", 5.0, 2.1, 5], [7.5, -7.6, "birch", 4.8, 1.6, 6], [-0.4, -13.5, "maple", 5.2, 2.2, 7],
];
for (const [x, z, species, h, crown, seed] of treeSpots) put(W.leafyTree({ species, height: h, crown, seed, trunkR: 0.17 + seed * 0.004, leaves: 1500, leafSize: 0.25 }), x, 0, z, seed);
for (const [x, z, h, seed] of [[-11.5, -9, 6.4, 11], [11.8, -9.6, 6.8, 12], [-8.5, -14, 6.2, 13], [8.8, -14.5, 6.5, 14], [-14.5, -13, 7, 15], [14.5, -14, 7, 16]]) {
  put(W.leafyTree({ species: "pine", height: h, crown: 1.5, seed, trunkR: 0.2, leaves: 700, far: true }), x, 0, z, seed);
}
const bushSpots = [[-6.2, -4.0, 0, 1], [6.3, -3.8, 12, 2], [-3.0, -6.2, 8, 3], [3.2, -6.3, 8, 4], [-1.1, -6.5, 4, 5], [1.2, -6.4, 4, 6]];
for (const [x, z, fl, seed] of bushSpots) put(W.leafyBush({ r: 0.62 + (seed % 3) * 0.08, seed, leaves: 300, flowers: fl, flowerColor: seed % 2 ? W.PAL.pink : W.PAL.yellow, tint: seed }), x, 0, z, seed);
const lawnSkip = (x, z) => {
  if (Math.hypot(x, z + 1.7) < 3.9) return true; // plaza
  if (Math.abs(x) < 1.1 && (z < -3 || z > 3)) return true; // paths
  if (Math.hypot(x + 6.4, z - 1.6) < 2.0) return true; // pond
  if (z < -4.6 && z > -6.2 && Math.abs(Math.abs(x) - 2.2) < 1.3) return true; // flower beds
  return false;
};
world.add(W.grassField({ x0: -10, x1: 10, z0: -7, z1: 5, count: 50000, skip: lawnSkip, seed: 2, height: 0.32 }));
world.add(W.grassField({ x0: -14, x1: 14, z0: -13, z1: -4.6, count: 36000, skip: lawnSkip, seed: 5, height: 0.6, width: 1.9, spread: 0.22 }));
world.add(W.grassField({ x0: -46, x1: 46, z0: -52, z1: -10.8, count: 110000, skip: lawnSkip, seed: 8, height: 0.55, width: 2.6, spread: 0.4, heightAt }));
world.add(W.meadowFlowers({ x0: -9, x1: 9, z0: -10, z1: 4, count: 150, skip: lawnSkip, seed: 4 }));
put(W.flowerBed(2.3, 0.7, 26), -2.2, 0, -5.4);
put(W.flowerBed(2.3, 0.7, 26), 2.2, 0, -5.4);
put(W.flowerBed(1.4, 0.6, 14), -5.2, 0, -1.8);
put(W.flowerBed(1.4, 0.6, 14), 5.2, 0, -1.2);
const pondG = put(W.pond(1.5), -6.4, 0, 1.6);
put(W.duck(), -6.2, 0.06, 1.8, 0.6);

// the neighbourhood far behind: fence, houses, hills, clouds
put(W.picketFence(30), 0, 0, -10.5);
put(W.house({ w: 3.6, h: 2.3, d: 2.7, style: "siding", wall: 0xf3dfb0, roof: W.PAL.roof, door: 0x4f7ccf, shutter: 0x5f8f6a }), -6.5, 0, -14.5, 0.08);
put(W.house({ w: 3.2, h: 2.1, d: 2.5, style: "brick", wall: 0xc9684a, roof: 0x6f7fb8, door: 0xf2f0e6, shutter: 0x3f5f8f }), 0.5, 0, -17.5, -0.05);
put(W.house({ w: 3.8, h: 2.4, d: 2.8, style: "stucco", wall: 0xcfe7ee, roof: 0xb4553d, door: 0xd9734f, shutter: 0xf2b84a }), 7.2, 0, -15, -0.1);
put(W.hill(40, 11, W.PAL.hill2), -22, 4, -92);
put(W.hill(46, 13, W.PAL.hill1), 28, 5, -100);
put(W.hill(36, 9, W.PAL.hill3), 0, 4, -88);
const clouds = [[-9, 9, -34, 1.6], [6, 11, -40, 2.0], [16, 8.5, -36, 1.3], [-20, 12, -44, 2.2]];
clouds.forEach(([x, y, z, s]) => put(W.cloud(s), x, y, z));

outlineStatic(world, { width: 0.02, min: 0.08 });
console.log("fused", JSON.stringify(W.fuseStatic(world)));

// lights
scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xd8cfa0, 2.15));
const sun = new THREE.DirectionalLight(0xfff0d2, 1.35);
sun.position.set(-4.5, 7.5, 4);
sun.target.position.set(0, 0, -2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 24 });
sun.shadow.bias = -0.0005; sun.shadow.radius = 5;
scene.add(sun, sun.target);

// people and dog
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
const stranger = createPuppet({ skin: "#c98c5e", hair: "#241a18", hairStyle: "long", shirt: "#9a86e0", pants: "#3b3f55", shoes: "#ffd04a", outfit: "tee", seed: 4 });
scene.add(owner, stranger);
const dog = heroDog(DOG_COLORS.golden, "park");
toonify(dog, { override: [[dog.materials.body, dog.colors.body], [dog.materials.light, dog.colors.light], [dog.materials.dark, dog.colors.dark]] });
outline(dog, { width: 0.012, min: 0.1 });
scene.add(dog);

function env(t, t0, dur) {
  const u = (t - t0) / dur;
  if (u <= 0 || u >= 1) return 0;
  return u < 0.32 ? ease(u / 0.32) : u < 0.68 ? 1 : ease((1 - u) / 0.32);
}
const SEAT = 0.46;
onUpdate((t) => {
  const eo = env(t, 1.0, 1.8), ed = env(t, 2.4, 1.9), es = env(t, 4.2, 1.7);
  // pose() takes t for blinking/breathing: set after position
  owner.userData.t = t; stranger.userData.t = t;
  const m = owner.mouthPoint();
  owner.pose({
    t, x: -0.95, z: -2.6, sit: 1, seat: SEAT, cute: 0.4,
    look: [0.7 * (1 - eo), 0.1 * (1 - eo)],
    eyes: { open: 1 - eo * 0.97 }, brow: { raise: eo * 0.7, worry: eo * 0.2 },
    mouth: { open: eo, width: 1 - eo * 0.25, smile: lerp(0.35, 0, eo) },
    head: { tilt: -eo * 0.08, lift: eo * 0.025, turn: 0.4 * (1 - eo) },
    lean: eo * 0.04,
    armR: { to: [lerp(0.17, m[0] + 0.03, eo), lerp(SEAT + 0.08, m[1] - 0.1, eo)], bend: 1 },
    armL: { to: [-0.17, SEAT + 0.08], bend: -1 },
  });
  const ms = stranger.mouthPoint();
  stranger.pose({
    t, x: 0.95, z: -2.6, sit: 1, seat: SEAT, cute: 0.3,
    look: [-0.6 * (1 - es), 0.1 * (1 - es)],
    eyes: { open: 1 - es * 0.97 }, brow: { raise: es * 0.7, worry: es * 0.2 },
    mouth: { open: es, width: 1 - es * 0.25, smile: lerp(0.3, 0, es) },
    head: { tilt: es * 0.08, lift: es * 0.025, turn: -0.4 * (1 - es) },
    lean: -es * 0.04,
    armR: { to: [lerp(0.17, ms[0] + 0.03, es), lerp(SEAT + 0.08, ms[1] - 0.1, es)], bend: 1 },
    armL: { to: [-0.17, SEAT + 0.08], bend: -1 },
  });
  dog.pose({
    t, x: TIGHT ? -0.15 : 0.0, z: -1.5, sit: 1, wag: 0.7 * (1 - ed), wagSpeed: 9, cute: 1,
    headYaw: lerp(-0.55, 0.45, ease(Math.min(1, Math.max(0, (t - 3.6) / 0.8)))) * (1 - ed * 0.5),
    headPitch: -0.12 - ed * 0.3, headTilt: 0.1 * (1 - ed),
    mouth: ed, closed: Math.min(1, ed * 1.4), ears: -ed * 0.7,
  });
  const u = t / DURATION;
  if (CAM === "house") {
    camera.position.set(-4.0, 1.5, -8.5);
    camera.lookAt(-6.5, 1.5, -14.5);
    camera.fov = 50; camera.updateProjectionMatrix();
  } else if (CAM === "hill") {
    camera.position.set(3.2, 1.2, -9);
    camera.lookAt(-4, 2.6, -40);
  } else if (CAM === "top") {
    camera.position.set(0, 26, -4);
    camera.lookAt(0, 0, -6);
    camera.fov = 50; camera.updateProjectionMatrix();
  } else if (CAM === "lawn") {
    camera.position.set(-3.5, 0.7, -3.2);
    camera.lookAt(-3.2, 0.2, -7.5);
  } else if (TIGHT) {
    camera.fov = 52; camera.updateProjectionMatrix();
    camera.position.set(-0.35 + 0.1 * Math.sin(u * Math.PI), 0.95, 1.5 - 0.15 * u);
    camera.lookAt(-0.55, 0.78, -2.3);
  } else {
    camera.position.set(0.15 * Math.sin(u * Math.PI), 1.25, 2.6 - 0.2 * u);
    camera.lookAt(0, 1.0, -2.3);
  }
  camera.updateMatrixWorld(true);
  owner.faceCamera(camera);
  stranger.faceCamera(camera);
});

window.__dbg = { scene, camera, owner, stranger, dog };
short.start();
