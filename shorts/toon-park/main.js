// Style test 2: the same flat 2D people and cartoon dog, now outdoors in a toon park with a natural palette.
import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";

const DURATION = 6;
const TIGHT = new URLSearchParams(location.search).get("cam") === "tight";
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

// ground, plaza, paths
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 100).rotateX(-Math.PI / 2), W.grassMaterial([30, 20]));
ground.position.set(0, 0, -25); ground.receiveShadow = true; ground.userData.ink = false;
world.add(ground);
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

// trees, bushes, flowers (back and sides)
W.reseed(5);
const treeSpots = [[-4.6, -4.8, 3.2, 1.35, 0], [-7.2, -7.5, 3.6, 1.5, 1], [-3.2, -9.2, 3.0, 1.2, 2], [4.9, -5.2, 3.3, 1.4, 1], [7.4, -7.0, 3.8, 1.6, 2], [3.4, -9.6, 3.0, 1.2, 0], [-10, -11, 3.4, 1.5, 0], [10, -11.5, 3.6, 1.6, 1], [-1.2, -14, 3.3, 1.4, 2], [1.8, -15, 3.4, 1.5, 0]];
for (const [x, z, h, r, tint] of treeSpots) put(W.tree({ h, r, tint }), x, 0, z);
for (const [x, z] of [[-6.4, -4.2], [6.5, -3.8], [-2.9, -6.3], [3.0, -6.4]]) put(W.bush(0.55, Math.abs(x) | 0), x, 0, z);
for (const [x, z, h, r] of [[-12.5, -8, 5, 1.5], [12.8, -8, 5.2, 1.6], [-8.5, -13, 4.6, 1.4], [8.8, -13.5, 4.8, 1.5]]) put(W.tree({ kind: "pine", h, r }), x, 0, z);
put(W.flowerBed(2.3, 0.7, 26), -2.2, 0, -5.4);
put(W.flowerBed(2.3, 0.7, 26), 2.2, 0, -5.4);
put(W.flowerBed(1.4, 0.6, 14), -5.2, 0, -1.8);
put(W.flowerBed(1.4, 0.6, 14), 5.2, 0, -1.2);
const pondG = put(W.pond(1.5), -6.4, 0, 1.6);
put(W.duck(), -6.2, 0.06, 1.8, 0.6);

// the neighbourhood far behind: fence, houses, hills, clouds
put(W.picketFence(30), 0, 0, -10.5);
put(W.house({ w: 3.4, h: 2.3, d: 2.6, wall: W.PAL.cream, roof: W.PAL.roof }), -6.5, 0, -14.5, 0.08);
put(W.house({ w: 3.0, h: 2.0, d: 2.4, wall: W.PAL.wall2, roof: W.PAL.roof2, door: 0xd9734f }), 0.5, 0, -17.5, -0.05);
put(W.house({ w: 3.6, h: 2.4, d: 2.8, wall: W.PAL.wall3, roof: W.PAL.roof }), 7.2, 0, -15, -0.1);
put(W.hill(34, 7, W.PAL.hill2), -16, -1.5, -42);
put(W.hill(40, 9, W.PAL.hill1), 22, -2, -48);
put(W.hill(30, 5, W.PAL.hill3), 0, -1, -38);
const clouds = [[-9, 9, -34, 1.6], [6, 11, -40, 2.0], [16, 8.5, -36, 1.3], [-20, 12, -44, 2.2]];
clouds.forEach(([x, y, z, s]) => put(W.cloud(s), x, y, z));

outlineStatic(world, { width: 0.02, min: 0.08 });
console.log("fused", JSON.stringify(W.fuseStatic(world)));

// lights
scene.add(new THREE.HemisphereLight(0xeaf6ff, 0xd8cfa0, 1.85));
const sun = new THREE.DirectionalLight(0xfff0d2, 1.7);
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
    t, x: -0.95, z: -2.7, sit: 1, seat: SEAT, cute: 0.4,
    look: [0.7 * (1 - eo), 0.1 * (1 - eo)],
    eyes: { open: 1 - eo * 0.97 }, brow: { raise: eo * 0.7, worry: eo * 0.2 },
    mouth: { open: eo, width: 1 - eo * 0.25, smile: lerp(0.35, 0, eo) },
    head: { tilt: -eo * 0.08, lift: eo * 0.025, turn: 0.4 * (1 - eo) },
    lean: eo * 0.04,
    armR: { to: [lerp(0.17, m[0] + 0.03, eo), lerp(SEAT + 0.01, m[1] - 0.1, eo)], bend: 1 },
    armL: { to: [-0.17, SEAT + 0.01], bend: -1 },
  });
  const ms = stranger.mouthPoint();
  stranger.pose({
    t, x: 0.95, z: -2.7, sit: 1, seat: SEAT, cute: 0.3,
    look: [-0.6 * (1 - es), 0.1 * (1 - es)],
    eyes: { open: 1 - es * 0.97 }, brow: { raise: es * 0.7, worry: es * 0.2 },
    mouth: { open: es, width: 1 - es * 0.25, smile: lerp(0.3, 0, es) },
    head: { tilt: es * 0.08, lift: es * 0.025, turn: -0.4 * (1 - es) },
    lean: -es * 0.04,
    armR: { to: [lerp(0.17, ms[0] + 0.03, es), lerp(SEAT + 0.01, ms[1] - 0.1, es)], bend: 1 },
    armL: { to: [-0.17, SEAT + 0.01], bend: -1 },
  });
  dog.pose({
    t, x: TIGHT ? -0.15 : 0.0, z: -1.5, sit: 1, wag: 0.7 * (1 - ed), wagSpeed: 9, cute: 1,
    headYaw: lerp(-0.55, 0.45, ease(Math.min(1, Math.max(0, (t - 3.6) / 0.8)))) * (1 - ed * 0.5),
    headPitch: -0.12 - ed * 0.3, headTilt: 0.1 * (1 - ed),
    mouth: ed, closed: Math.min(1, ed * 1.4), ears: -ed * 0.7,
  });
  const u = t / DURATION;
  if (TIGHT) {
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
