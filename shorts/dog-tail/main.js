import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon, toonGradient } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Which way your dog wags his tail" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// Ten shots in three outdoor places (the neighbourhood, a park, a back garden), a different camera move in every shot.
// Every action is keyed to a word of voiceover.srt; every shot is a pure function of time (so any frame can be rendered).

const FPS = 60;
const words = await loadSrt("voiceover.srt");
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function idx(word, nth = 1) {
  let n = 0;
  for (let i = 0; i < words.length; i++) if (norm(words[i].text) === norm(word) && ++n === nth) return i;
  throw new Error(`Cue "${word}" #${nth} not found in the voiceover`);
}
const at = (word, nth = 1) => words[idx(word, nth)].start;
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 0.1) * FPS) / FPS; // no tail after the last word: the voice runs on into the first line

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 52, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.05;
camera.far = 600;
camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.background = W.skyTexture();

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = { in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inOut: (u) => u * u * (3 - 2 * u), soft: (u) => u * u * u * (u * (6 * u - 15) + 10) };
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- word cues (seconds) ----------
const C = {
  tail1: at("tail", 1), wagging: at("wagging"), leaning: at("leaning"), happy: at("happy", 1), see: at("see"), swings: at("swings"),
  right1: at("right", 1), nervous: at("nervous"), left1: at("left", 1), other: at("other"), difference: at("difference"),
  left2: at("left", 2), faster: at("faster"), heartbeat: at("heartbeat"), right2: at("right", 2), calm: at("calm"),
  message: at("message"), walk: at("walk"), person: at("person"), home2: at("home", 2),
};
// shot boundaries: a hair before the first word of each new idea
const CUTS = [at("it's", 1), at("when", 2), at("when", 3), at("and", 1), at("a", 1), at("a", 4), at("so", 1), at("and", 2), at("so", 2)].map((t) => t - 0.04);
const [K2, K3, K4, K5, K6, K7, K8, K9, K10] = CUTS;
const shotOf = (t) => (t < K2 ? 1 : t < K3 ? 2 : t < K4 ? 3 : t < K5 ? 4 : t < K6 ? 5 : t < K7 ? 6 : t < K8 ? 7 : t < K9 ? 8 : t < K10 ? 9 : 10);
const PLACE = { 1: "n", 2: "n", 3: "p", 4: "p", 5: "b", 6: "b", 7: "b", 8: "n", 9: "n", 10: "n" };

// ---------- the three places, far apart (x offsets) so each has its own light and nothing leaks ----------
const OFF = { n: 0, p: 300, b: -300 };
const places = { n: new THREE.Group(), p: new THREE.Group(), b: new THREE.Group() };
places.p.position.x = OFF.p;
places.b.position.x = OFF.b;
for (const g of Object.values(places)) scene.add(g);
const put = (grp, o, x, y, z, ry = 0, s) => {
  o.position.set(x, y, z); o.rotation.y = ry;
  if (s) o.scale.multiplyScalar(s);
  grp.add(o);
  return o;
};
const mesh = (grp, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
const slab = (grp, w, h, d, mat, x, y, z) => { const m = mesh(grp, new THREE.BoxGeometry(w, h, d), mat, x, y, z); m.userData.ink = false; return m; };

// paving texture (shared)
const payC = document.createElement("canvas");
payC.width = payC.height = 256;
{
  const x = payC.getContext("2d");
  x.fillStyle = "#f4e1bb"; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "#e5c994"; x.lineWidth = 5;
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) x.strokeRect(c * 64 + (r % 2) * 32, r * 64, 64, 64);
  x.fillStyle = "rgba(255,255,255,0.35)";
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) x.fillRect(c * 64 + (r % 2) * 32 + 8, r * 64 + 8, 22, 6);
}
const payT = new THREE.CanvasTexture(payC);
payT.colorSpace = THREE.SRGBColorSpace; payT.wrapS = payT.wrapT = THREE.RepeatWrapping; payT.anisotropy = 8;
const payMat = (rx, rz) => { const t = payT.clone(); t.needsUpdate = true; t.repeat.set(rx, rz); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }); };
const edgeM = toon(W.PAL.sandEdge);
const asphaltM = toon(0x6a707c);
const curbM = toon(0xd9d6cf);
const grassM = (rx, ry) => W.grassMaterial([rx, ry]);

// ===================== place N: the neighbourhood (our garden, the street, neighbours) =====================
{
  const g = places.n;
  W.reseed(21);
  const ground = W.terrainMesh({ x0: -90, x1: 90, z0: -60, z1: 30, step: 3, heightAt: () => 0, material: grassM(40, 16) });
  g.add(ground);
  // road + sidewalks + curbs (along x)
  slab(g, 180, 0.02, 6.0, asphaltM, 0, 0.01, -9.2);
  for (let i = -8; i <= 8; i++) slab(g, 1.4, 0.025, 0.14, toon(0xfff6dc), i * 3.2, 0.02, -9.2); // dashed centre line
  slab(g, 180, 0.05, 1.1, payMat(90, 1), 0, 0.03, -5.95);   // near sidewalk
  slab(g, 180, 0.06, 0.16, curbM, 0, 0.03, -6.55);
  slab(g, 180, 0.05, 1.1, payMat(90, 1), 0, 0.03, -12.45);  // far sidewalk
  slab(g, 180, 0.06, 0.16, curbM, 0, 0.03, -11.8);
  // our garden path: gate -> porch
  slab(g, 1.4, 0.04, 8.6, edgeM, 0, 0.02, -0.9);
  slab(g, 1.15, 0.06, 8.6, payMat(3, 22), 0, 0.03, -0.9);
  // our house (front faces the street = -z) and the neighbours'
  put(g, W.house({ w: 4.4, h: 2.7, d: 3.4, style: "siding", wall: 0xf3dfb0, roof: W.PAL.roof, door: 0x4f7ccf, shutter: 0x5f8f6a }), 0, 0, 5.8, Math.PI);
  put(g, W.house({ w: 3.8, h: 2.5, d: 3.0, style: "brick", wall: 0xc9684a, roof: 0x6f7fb8, door: 0xf2f0e6, shutter: 0x3f5f8f }), -9.5, 0, 5.6, Math.PI);
  put(g, W.house({ w: 4.0, h: 2.5, d: 3.0, style: "stucco", wall: 0xcfe7ee, roof: 0xb4553d, door: 0xd9734f, shutter: 0xf2b84a }), 9.5, 0, 5.6, Math.PI);
  put(g, W.house({ w: 3.8, h: 2.4, d: 3.0, style: "stucco", wall: 0xf5d6c6, roof: W.PAL.roof2, door: 0x5f8f6a, shutter: 0xffffff }), -8, 0, -19, 0.04);
  put(g, W.house({ w: 4.4, h: 2.7, d: 3.4, style: "siding", wall: 0xcfe0f2, roof: W.PAL.roof, door: 0xf2b84a, shutter: 0x3f5f8f }), 0.5, 0, -19.5, -0.03);
  put(g, W.house({ w: 3.9, h: 2.5, d: 3.1, style: "brick", wall: 0xb9674f, roof: 0x7a5a4a, door: 0xf2f0e6, shutter: 0x5f8f6a }), 9, 0, -19, 0.05);
  // picket fences along the sidewalk side of every garden (a gap for our gate at x = 0)
  for (const [x0, x1] of [[-20, -0.7], [0.7, 20]]) put(g, W.picketFence(x1 - x0), (x0 + x1) / 2, 0, -5.3);
  put(g, W.picketFence(40), 0, 0, -13.9);
  // our gate (open, hinged on the right post)
  { const gate = W.picketFence(1.3); gate.position.set(0.7, 0, -5.3); gate.rotation.y = -1.25; g.add(gate); }
  // hedges, trees, bushes, flowers, lamps, mailbox, a parked car
  for (const x of [-4.6, -2.9, 2.9, 4.6]) put(g, W.leafyBush({ r: 0.62, seed: Math.abs(x * 10) | 0, leaves: 260, flowers: x < 0 ? 8 : 0, flowerColor: x < -3 ? W.PAL.pink : W.PAL.yellow }), x, 0, -4.6);
  put(g, W.leafyTree({ species: "oak", height: 4.8, crown: 2.0, seed: 3, leaves: 1400, leafSize: 0.25 }), -4.2, 0, -0.2, 1);
  put(g, W.leafyTree({ species: "maple", height: 4.6, crown: 1.9, seed: 5, leaves: 1400, leafSize: 0.25 }), 4.6, 0, -1.4, 2);
  put(g, W.leafyTree({ species: "birch", height: 4.6, crown: 1.5, seed: 8, leaves: 1200, leafSize: 0.24 }), -12.5, 0, -1.8, 3);
  put(g, W.leafyTree({ species: "oak", height: 5, crown: 2.1, seed: 9, leaves: 1400, leafSize: 0.25 }), 13, 0, -0.8, 4);
  put(g, W.leafyTree({ species: "birch", height: 4.6, crown: 1.5, seed: 12, leaves: 1200, leafSize: 0.24 }), -4.4, 0, -16.2, 5);
  put(g, W.leafyTree({ species: "maple", height: 5, crown: 2, seed: 14, leaves: 1400, leafSize: 0.25 }), 5.2, 0, -16, 6);
  put(g, W.leafyTree({ species: "oak", height: 5, crown: 2, seed: 16, leaves: 1400, leafSize: 0.25 }), -14, 0, -16, 7);
  put(g, W.leafyTree({ species: "pine", height: 6.5, crown: 1.5, seed: 18, leaves: 700, far: true }), 15.5, 0, -16, 8);
  for (const [x, z] of [[-3.2, -5.9], [3.2, -5.9], [-3.2, -12.0], [3.2, -12.0]]) put(g, W.lampPost(2.7), x, 0, z);
  put(g, W.mailbox(), 1.45, 0, -4.9);
  put(g, W.car({ color: 0x4fb6a8 }), 6, 0, -10.4, Math.PI);
  put(g, W.car({ color: 0xf2b84a }), -9.5, 0, -7.9, 0);
  put(g, W.flowerBed(3.0, 0.7, 30), -2.4, 0, 3.0);
  put(g, W.flowerBed(3.0, 0.7, 30), 2.4, 0, 3.0);
  put(g, W.flowerBed(2.2, 0.6, 20), -7.5, 0, 2.2);
  // hills far behind the houses across the street
  put(g, W.hill(40, 9, W.PAL.hill2), -22, 3, -90);
  put(g, W.hill(46, 11, W.PAL.hill1), 28, 4, -98);
  put(g, W.hill(36, 8, W.PAL.hill3), 0, 3, -84);
  for (const [x, y, z, s] of [[-14, 10, -48, 1.8], [8, 12, -58, 2.2], [20, 9, -52, 1.4], [-28, 13, -60, 2.4], [30, 11, -44, 1.6]]) put(g, W.cloud(s), x, y, z);
  const skipN = (x, z) => (z < -5.4 && z > -13.8) || (Math.abs(x) < 1.1 && z > -5.4 && z < 3.2) || (z > 3.2 && z < 7.6 && Math.abs(x) < 3) || (z > 3.4 && Math.abs(x) < 24);
  g.add(W.grassField({ x0: -24, x1: 24, z0: -5.3, z1: 3.4, count: 60000, skip: skipN, seed: 4, height: 0.3 }));
  g.add(W.grassField({ x0: -34, x1: 34, z0: -30, z1: -13.9, count: 50000, skip: skipN, seed: 6, height: 0.55, width: 2.4, spread: 0.3 }));
  g.add(W.meadowFlowers({ x0: -12, x1: 12, z0: -5, z1: 3, count: 160, skip: skipN, seed: 3 }));
  outlineStatic(g, { width: 0.02, min: 0.08 });
  console.log("neighbourhood fused", JSON.stringify(W.fuseStatic(g)));
}

// ===================== place P: the park (plaza, long path between the trees, a gate at the far end) =====================
{
  const g = places.p;
  W.reseed(5);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const heightAt = (x, z) => smooth(0, 24, -19 - z) * Math.max(0, 3.4 + 2.2 * Math.sin(x * 0.11 + 1.3) + 1.4 * Math.sin(x * 0.23 + z * 0.07) + 1.0 * Math.sin(z * 0.15));
  g.add(W.terrainMesh({ x0: -70, x1: 70, z0: -22, z1: 25, step: 1.25, heightAt, material: grassM(34, 11) }));
  g.add(W.terrainMesh({ x0: -90, x1: 90, z0: -90, z1: -22, step: 1.5, heightAt, material: grassM(9, 5) }));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.75, 0.02, 48), edgeM); ring.position.set(0, 0.01, -1.7); ring.receiveShadow = true; ring.userData.ink = false; g.add(ring);
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.03, 48), payMat(7, 7)); plaza.position.set(0, 0.02, -1.7); plaza.receiveShadow = true; plaza.userData.ink = false; g.add(plaza);
  for (const [z0, z1] of [[-3.0, -40], [3.0, 14]]) {
    const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
    const e = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, len), edgeM); e.position.set(0, 0.01, zc); e.receiveShadow = true; e.userData.ink = false; g.add(e);
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, len), payMat(1.6 / 1.0 * 1.2, len / 1.3)); p.position.set(0, 0.02, zc); p.receiveShadow = true; p.userData.ink = false; g.add(p);
  }
  put(g, W.bench({ w: 1.3 }), -2.7, 0, -2.6, 0.25);
  put(g, W.bench({ w: 1.3 }), 2.7, 0, -2.6, -0.25);
  put(g, W.lampPost(2.7), -4.2, 0, -3.4);
  put(g, W.lampPost(2.7), 4.2, 0, -3.4);
  const treeSpots = [
    [-4.3, -4.8, "oak", 4.7, 2.0, 1], [4.5, -5.2, "maple", 4.5, 1.9, 2], [-2.9, -8.6, "birch", 4.6, 1.5, 3], [3.2, -9.0, "oak", 4.9, 2.1, 4],
    [-7.4, -7.2, "oak", 5.0, 2.1, 5], [7.5, -7.6, "birch", 4.8, 1.6, 6], [-4.6, -12.5, "maple", 5.0, 2.0, 7], [4.8, -12.8, "oak", 5.0, 2.1, 9],
    [-9.5, -3, "maple", 4.6, 1.9, 10], [9.8, -3.5, "birch", 4.6, 1.5, 11],
  ];
  for (const [x, z, species, h, crown, seed] of treeSpots) put(g, W.leafyTree({ species, height: h, crown, seed, trunkR: 0.17 + seed * 0.004, leaves: 1400, leafSize: 0.25 }), x, 0, z, seed);
  for (const [x, z, h, seed] of [[-11.5, -9, 6.4, 11], [11.8, -9.6, 6.8, 12], [-8.5, -14, 6.2, 13], [8.8, -14.5, 6.5, 14], [-14.5, -13, 7, 15], [14.5, -14, 7, 16]]) put(g, W.leafyTree({ species: "pine", height: h, crown: 1.5, seed, trunkR: 0.2, leaves: 700, far: true }), x, 0, z, seed);
  for (const [x, z, fl, seed] of [[-6.2, -4.0, 0, 1], [6.3, -3.8, 12, 2], [-3.2, -6.2, 8, 3], [3.4, -6.3, 8, 4], [-1.6, -7.2, 4, 5], [1.7, -7.1, 4, 6], [-1.6, -4.6, 0, 7], [1.7, -4.6, 0, 8]]) put(g, W.leafyBush({ r: 0.62 + (seed % 3) * 0.08, seed, leaves: 300, flowers: fl, flowerColor: seed % 2 ? W.PAL.pink : W.PAL.yellow, tint: seed }), x, 0, z, seed);
  put(g, W.flowerBed(2.3, 0.7, 26), -2.6, 0, -5.4);
  put(g, W.flowerBed(2.3, 0.7, 26), 2.6, 0, -5.4);
  put(g, W.pond(1.5), -6.4, 0, 1.6);
  put(g, W.duck(), -6.2, 0.06, 1.8, 0.6);
  // fence with a gap for the path; houses beyond it
  put(g, W.picketFence(14), -8.2, 0, -10.5);
  put(g, W.picketFence(14), 8.2, 0, -10.5);
  for (const sx of [-1, 1]) { const post = W.picketFence(0.3); post.position.set(sx * 1.2, 0, -10.5); post.scale.y = 1.5; g.add(post); }
  put(g, W.house({ w: 3.6, h: 2.3, d: 2.7, style: "siding", wall: 0xf3dfb0, roof: W.PAL.roof, door: 0x4f7ccf, shutter: 0x5f8f6a }), -6.5, 0, -15.5, 0.08);
  put(g, W.house({ w: 3.2, h: 2.1, d: 2.5, style: "brick", wall: 0xc9684a, roof: 0x6f7fb8, door: 0xf2f0e6, shutter: 0x3f5f8f }), 0.5, 0, -19.5, -0.05);
  put(g, W.house({ w: 3.8, h: 2.4, d: 2.8, style: "stucco", wall: 0xcfe7ee, roof: 0xb4553d, door: 0xd9734f, shutter: 0xf2b84a }), 7.2, 0, -16, -0.1);
  put(g, W.hill(40, 11, W.PAL.hill2), -22, 4, -92);
  put(g, W.hill(46, 13, W.PAL.hill1), 28, 5, -100);
  put(g, W.hill(36, 9, W.PAL.hill3), 0, 4, -88);
  for (const [x, y, z, s] of [[-9, 9, -34, 1.6], [6, 11, -40, 2.0], [16, 8.5, -36, 1.3], [-20, 12, -44, 2.2]]) put(g, W.cloud(s), x, y, z);
  const skipP = (x, z) => {
    if (Math.hypot(x, z + 1.7) < 3.9) return true;
    if (Math.abs(x) < 1.1 && (z < -3 || z > 3)) return true;
    if (Math.hypot(x + 6.4, z - 1.6) < 2.0) return true;
    if (z < -4.6 && z > -6.2 && Math.abs(Math.abs(x) - 2.6) < 1.3) return true;
    return false;
  };
  g.add(W.grassField({ x0: -10, x1: 10, z0: -7, z1: 5, count: 50000, skip: skipP, seed: 2, height: 0.32 }));
  g.add(W.grassField({ x0: -14, x1: 14, z0: -13, z1: -4.6, count: 36000, skip: skipP, seed: 5, height: 0.6, width: 1.9, spread: 0.22 }));
  g.add(W.grassField({ x0: -46, x1: 46, z0: -52, z1: -10.8, count: 80000, skip: skipP, seed: 8, height: 0.55, width: 2.6, spread: 0.4, heightAt }));
  g.add(W.meadowFlowers({ x0: -9, x1: 9, z0: -10, z1: 4, count: 150, skip: skipP, seed: 4 }));
  outlineStatic(g, { width: 0.02, min: 0.08 });
  console.log("park fused", JSON.stringify(W.fuseStatic(g)));
}

// ===================== place B: the back garden (a big screen on the lawn) =====================
const SCREEN = { z: 0.8, w: 3.4, h: 2.0, y: 1.35 };
const screenCanvas = document.createElement("canvas");
screenCanvas.width = 680; screenCanvas.height = 400;
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
{
  const g = places.b;
  W.reseed(31);
  g.add(W.terrainMesh({ x0: -70, x1: 70, z0: -60, z1: 40, step: 3, heightAt: () => 0, material: grassM(40, 16) }));
  slab(g, 10, 0.04, 4.2, payMat(7, 3), 0, 0.02, 7.2); // patio behind the screen
  put(g, W.house({ w: 5.4, h: 2.8, d: 3.6, style: "siding", wall: 0xf6e3b8, roof: W.PAL.roof, door: 0x4f7ccf, shutter: 0x5f8f6a }), 0, 0, 10.6, Math.PI);
  for (const [x, z, sp] of [[-5.5, -4.8, "oak"], [5.8, -5.2, "maple"], [-6.6, 3.6, "birch"], [6.8, 3.4, "oak"], [-2.8, -8.5, "birch"], [2.9, -8.8, "maple"]]) put(g, W.leafyTree({ species: sp, height: 4.8, crown: 1.9, seed: (Math.abs(x * z) | 0) % 17 + 1, leaves: 1400, leafSize: 0.25 }), x, 0, z, x);
  for (const [x, z] of [[-4, -7.3], [-1.5, -7.4], [1.5, -7.4], [4, -7.3], [-7.4, -1], [7.4, -1], [-7.4, 6], [7.4, 6]]) put(g, W.leafyBush({ r: 0.66, seed: (Math.abs(x * z) | 0) % 9 + 1, leaves: 300, flowers: x < 0 ? 8 : 5, flowerColor: x < 0 ? W.PAL.pink : W.PAL.yellow, tint: (Math.abs(x) | 0) % 3 }), x, 0, z);
  put(g, W.picketFence(18), 0, 0, -8.1);
  for (const sx of [-1, 1]) put(g, W.picketFence(16), sx * 8.1, 0, 0, Math.PI / 2);
  put(g, W.flowerBed(3, 0.7, 30), -3.2, 0, 4.6);
  put(g, W.flowerBed(3, 0.7, 30), 3.2, 0, 4.6);
  // picnic table
  { const t = new THREE.Group(); t.position.set(4.6, 0, -1.8); g.add(t);
    const wood = toon(0xc98552);
    const top = mesh(t, new THREE.BoxGeometry(1.7, 0.07, 0.8), wood, 0, 0.74, 0); top.userData.ink = true;
    for (const z of [-0.62, 0.62]) mesh(t, new THREE.BoxGeometry(1.7, 0.06, 0.26), wood, 0, 0.45, z);
    for (const x of [-0.6, 0.6]) { const l = mesh(t, new THREE.BoxGeometry(0.07, 0.75, 1.3), toon(0x9a6038), x, 0.37, 0); l.rotation.x = 0; }
  }
  // the screen: two posts, a white panel and a frame
  { const s = new THREE.Group(); s.position.set(0, 0, SCREEN.z); g.add(s);
    for (const x of [-1.9, 1.9]) mesh(s, new THREE.CylinderGeometry(0.06, 0.06, 2.9, 10), toon(0x3d4452), x, 1.45, 0.1);
    mesh(s, new THREE.BoxGeometry(SCREEN.w + 0.24, SCREEN.h + 0.24, 0.1), toon(0x2b2f3a), 0, SCREEN.y + 0.4, 0.04);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ map: screenTex }));
    pane.rotation.y = Math.PI; pane.position.set(0, SCREEN.y + 0.4, -0.02); pane.userData.ink = false; s.add(pane);
  }
  const skipB = (x, z) => (Math.abs(x) < 4.2 && z > -6.6 && z < 1.4) || (z > 5.1 && Math.abs(x) < 5) || (Math.abs(x) < 1.0 && z > 3 && z < 5.2) || (Math.abs(Math.abs(x) - 3.2) < 1.7 && z > 4.2 && z < 5.0);
  g.add(W.grassField({ x0: -8, x1: 8, z0: -8, z1: 8.6, count: 60000, skip: skipB, seed: 7, height: 0.3 }));
  g.add(W.grassField({ x0: -30, x1: 30, z0: -34, z1: -8.4, count: 30000, skip: () => false, seed: 9, height: 0.6, width: 2.2, spread: 0.3 }));
  g.add(W.meadowFlowers({ x0: -7.5, x1: 7.5, z0: -7.5, z1: 5, count: 140, skip: skipB, seed: 5 }));
  put(g, W.hill(40, 9, W.PAL.hill2), -20, 3, -60);
  put(g, W.hill(44, 11, W.PAL.hill1), 26, 4, -66);
  for (const [x, y, z, s] of [[-12, 10, -44, 1.8], [10, 12, -50, 2.2], [24, 9, -46, 1.4]]) put(g, W.cloud(s), x, y, z);
  outlineStatic(g, { width: 0.02, min: 0.08 });
  console.log("back garden fused", JSON.stringify(W.fuseStatic(g)));
}

// ===================== light =====================
const hemi = new THREE.HemisphereLight(0xeaf6ff, 0xd8cfa0, 2.15);
const sun = new THREE.DirectionalLight(0xfff0d2, 1.35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
sun.shadow.bias = -0.0005;
sun.shadow.radius = 5;
scene.add(hemi, sun, sun.target);
function lightAt(x, z) { // keep the shadow map around whatever the camera is looking at
  sun.target.position.set(x, 0, z);
  sun.position.set(x - 4.5, 7.5, z + 4);
}

// ===================== cast =====================
const tint = { skin: "#f1c7a0", hair: "#5b3a22" };
const owner = createPuppet({ ...tint, hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
const scientist = createPuppet({ skin: "#c98c5e", hair: "#241a18", hairStyle: "bun", shirt: "#ffffff", pants: "#3b3f55", shoes: "#ffd04a", outfit: "labcoat", under: "#6bb7e6", glasses: true, sleeves: "long", seed: 5 });
scene.add(owner, scientist);

const toonDog = (colors, key, scale, extra) => {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d);
  return d;
};
const golden = toonDog(DOG_COLORS.golden, "g", 0.7);
const whiteDog = toonDog({ body: 0xf4f0e6, light: 0xffffff, dark: 0xd6cdbf }, "w", 0.62);
const bigDog = toonDog({ body: 0x45403c, light: 0x6a625b, dark: 0x252120 }, "b", 0.95, { pointyEars: true, snout: 1.15 });

// ---------- the tail "lean" fan: a wedge on the ground showing how far the tail swings to each side ----------
function makeFan(color) {
  const N = 28;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((N + 2) * 3 + (N + 1) * 2 * 3), 3));
  const idx = [];
  for (let i = 0; i < N; i++) idx.push(0, i + 1, i + 2);
  const base = N + 2;
  for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false; m.renderOrder = 6; m.userData.ink = false;
  scene.add(m);
  m.userData.N = N;
  return m;
}
const fan = makeFan(0xffd34e);
const COLORS = { yellow: new THREE.Color(0xffd34e), green: new THREE.Color(0x39d17a), orange: new THREE.Color(0xff9a2e) };
// cx, cz: tail root on the ground; ry: dog heading; th0..th1: tail yaw range (+ = the dog's right)
function setFan(m, on, color, cx, cz, ry, th0, th1, r = 0.62, y = 0.075) {
  m.visible = on > 0.01;
  if (!m.visible) return;
  m.material.color.copy(color);
  m.material.opacity = 0.5 * on;
  const N = m.userData.N, pos = m.geometry.attributes.position.array;
  const back = [-Math.sin(ry), -Math.cos(ry)], right = [-Math.cos(ry), Math.sin(ry)];
  const dir = (th) => [back[0] * Math.cos(th) + right[0] * Math.sin(th), back[1] * Math.cos(th) + right[1] * Math.sin(th)];
  pos.set([cx, y, cz], 0);
  for (let i = 0; i <= N; i++) { const d = dir(th0 + ((th1 - th0) * i) / N); pos.set([cx + d[0] * r, y, cz + d[1] * r], (1 + i) * 3); }
  const base = (N + 2) * 3;
  for (let i = 0; i <= N; i++) {
    const d = dir(th0 + ((th1 - th0) * i) / N);
    pos.set([cx + d[0] * (r - 0.05), y + 0.002, cz + d[1] * (r - 0.05), cx + d[0] * (r + 0.01), y + 0.002, cz + d[1] * (r + 0.01)], base + i * 6);
  }
  m.geometry.attributes.position.needsUpdate = true;
}

// an arrow lying on the ground, riding the edge of the fan and pointing along the swing (instead of any words)
function makeArrow() {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.17); sh.lineTo(0.12, -0.07); sh.lineTo(0.04, -0.035); sh.lineTo(0.04, -0.17); sh.lineTo(-0.04, -0.17); sh.lineTo(-0.04, -0.035); sh.lineTo(-0.12, -0.07); sh.closePath();
  const g = new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2);
  const grp = new THREE.Group();
  const ink = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2b1b16, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  ink.scale.setScalar(1.28); ink.position.y = -0.002; ink.renderOrder = 7;
  const fill = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  fill.renderOrder = 8;
  grp.add(ink, fill);
  grp.userData = { ink, fill };
  grp.visible = false;
  scene.add(grp);
  return grp;
}
const arrowR = makeArrow(), arrowL = makeArrow();
// th: the tail angle the arrow sits at; sign: +1 points the way the angle grows (to the dog's right), -1 the other way
function setArrow(m, on, color, cx, cz, ry, th, sign, r = 0.62, y = 0.09, pulse = 0) {
  m.visible = on > 0.01;
  if (!m.visible) return;
  m.userData.fill.material.color.copy(color);
  m.userData.fill.material.opacity = m.userData.ink.material.opacity = on;
  const back = [-Math.sin(ry), -Math.cos(ry)], right = [-Math.cos(ry), Math.sin(ry)];
  const d = [back[0] * Math.cos(th) + right[0] * Math.sin(th), back[1] * Math.cos(th) + right[1] * Math.sin(th)];
  const tg = [(-back[0] * Math.sin(th) + right[0] * Math.cos(th)) * sign, (-back[1] * Math.sin(th) + right[1] * Math.cos(th)) * sign];
  const rr = r + 0.16 + 0.04 * pulse;
  m.position.set(cx + d[0] * rr, y, cz + d[1] * rr);
  m.rotation.y = Math.atan2(tg[0], tg[1]);
  m.scale.setScalar(0.75 * (1 + 0.12 * pulse));
}
// a bold highlight ring around the tip of the tail (instead of any words)
const glowSprite = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(255,255,255,0.2)"; x.beginPath(); x.arc(80, 80, 56, 0, Math.PI * 2); x.fill();
  x.lineWidth = 24; x.strokeStyle = "rgba(43,27,22,0.9)"; x.beginPath(); x.arc(80, 80, 56, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 14; x.strokeStyle = "#ffffff"; x.beginPath(); x.arc(80, 80, 56, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
  sp.renderOrder = 9; sp.visible = false;
  scene.add(sp);
  return sp;
})();

// ---------- emoji sprites (hearts, bubbles) ----------
function emojiSprite(ch) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.font = "100px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(ch, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8;
  s.visible = false;
  scene.add(s);
  return s;
}
const fxList = []; // { s, t0, dur, from: Vector3, to: Vector3, rise, size }
function burst(t0, center, n, { ch = "💚", dur = 1.3, spread = 0.5, rise = 0.9, size = 0.2, gap = 0.1 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = spread * (0.35 + 0.65 * ((i * 37) % 10) / 10);
    const from = center.clone().add(V(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5));
    fxList.push({ s: emojiSprite(Array.isArray(ch) ? ch[i % ch.length] : ch), t0: t0 + i * gap, dur, from, to: from.clone().add(V(Math.cos(a) * r, rise, Math.sin(a) * r * 0.5)), size });
  }
}
function travel(t0, from, to, ch, { dur = 1.1, size = 0.28, arc = 0.5 } = {}) {
  fxList.push({ s: emojiSprite(ch), t0, dur, from, to, size, arc });
}
function drawFx(t) {
  for (const f of fxList) {
    const u = (t - f.t0) / f.dur;
    if (u < 0 || u > 1) { f.s.visible = false; continue; }
    f.s.visible = true;
    f.s.position.lerpVectors(f.from, f.to, ease.inOut(u));
    if (f.arc) f.s.position.y += Math.sin(Math.PI * u) * f.arc;
    f.s.scale.setScalar(f.size * (0.7 + 0.3 * ease.out(Math.min(1, u * 3))));
    f.s.material.opacity = Math.min(1, Math.sin(Math.PI * u) * 2.2);
  }
}

// ===================== the story, shot by shot =====================
const P = (pl, x, y, z) => V(OFF[pl] + x, y, z);
// a wag speed that lands on exactly the same phase at the first and the last frame (sin = 0): the loop seam is invisible
const WS = (2 * Math.PI * Math.round((12.2 * DURATION) / (2 * Math.PI))) / DURATION;

// how far the tail leans to the dog's right (+) or left (-), in radians
function leanAt(t) {
  if (t < K2) return 0.1;
  if (t < K3) return lerp(0.1, 0.62, ease.inOut(prog(t, 2.95, C.leaning + 0.55)));
  if (t < K4) return 0.62;
  if (t < K5) return -0.62;
  if (t < K9) return 0.62;
  if (t < K10) return lerp(0.62, 0.5, prog(t, 18.9, 19.4));
  return lerp(0.5, 0.1, ease.inOut(prog(t, K10 + 0.2, K10 + 1.1)));
}
const SIT = { sit: 1, cute: 1, ry: Math.PI };
const K10END = DURATION;
// owner's walk in S9 / S10
const ownerZ9 = (t) => Math.min(-2.35, -5.0 + 1.5 * (t - (K9 + 0.12)));

function goldenState(t) {
  const s = shotOf(t), lean = leanAt(t), base = { t, tailLean: lean, wagSpeed: WS };
  if (s === 1) return { pl: "n", x: 0, z: -1.9, pose: { ...SIT, ...base, wag: 0.6, headYaw: 0.45, headPitch: -0.08, ears: 0.3 } };
  if (s === 2) return { pl: "n", x: 0, z: -1.9 - 1.3 * (t - K2), pose: { ry: Math.PI, cute: 1, ...base, walk: 1, wag: 0.7, wagSpeed: 13, headPitch: -0.04, ears: 0.4 } };
  if (s === 3) {
    const u = t - K3;
    const z = -1.6 - 8.1 * ease.inOut(clamp01(u / 2.3));
    const leap = Math.sin(Math.PI * prog(u, 1.9, 2.55));
    return { pl: "p", x: 0, z, pose: { ry: Math.PI, cute: 1, ...base, wagSpeed: 17, wag: 0.8, run: 1 - prog(u, 2.0, 2.3), beg: prog(u, 2.45, 2.75), leap: leap * 0.7, lift: 0.22 * leap, headPitch: -0.1, ears: 0.5, mouth: 0.25 } };
  }
  if (s === 4) return { pl: "p", x: 0.3, z: -1.2, pose: { ...SIT, ...base, wag: 0.55, wagSpeed: 15, ears: -0.85, sad: 0.85, shiver: 0.3, headPitch: 0.12, headYaw: 0.05 } };
  if (s === 8) return { pl: "n", x: -1.15, z: -1.4, pose: { sit: 1, cute: 1, ry: Math.PI / 2, ...base, wag: 0.85, wagSpeed: 16, headYaw: 0.15, ears: 0.5, mouth: 0.15 } };
  if (s === 9) {
    const u = t - K9;
    const run = prog(u, 0.65, 0.8) * (1 - prog(u, 1.55, 1.75));
    const z = lerp(-0.2, -2.0, ease.inOut(prog(u, 0.65, 1.7)));
    const rear = prog(u, 1.8, 2.1);
    return { pl: "n", x: lerp(0.0, 0.4, prog(u, 0.65, 1.7)), z, pose: { ry: Math.PI, cute: 1, ...base, sit: 1 - prog(u, 0.55, 0.8), run: run * 0.8, beg: rear, wag: 0.85, wagSpeed: 18, ears: 0.5, mouth: 0.2, headPitch: -0.1 - 0.15 * rear } };
  }
  if (s === 10) {
    const u = t - K10;
    const mv = ease.inOut(prog(u, 0, 0.95));
    return { pl: "n", x: lerp(0.4, 0, mv), z: lerp(-2.0, -1.9, mv), pose: { ry: Math.PI, cute: 1, ...base, sit: prog(u, 0.7, 1.0), walk: 1 - prog(u, 0.55, 0.85), beg: 1 - prog(u, 0, 0.3), wag: lerp(0.85, 0.6, prog(u, 0.7, 1.1)), wagSpeed: WS, headYaw: 0.45 * prog(u, 0.8, 1.2), headPitch: -0.08, ears: 0.3 } };
  }
  return null;
}

const whiteState = (t) => {
  const s = shotOf(t);
  if (s === 5) return { pl: "b", x: 0.15, z: -2.6, pose: { ...SIT, ry: 0, t, wag: 0.3, wagSpeed: 9, ears: 0.6, headTilt: 0.18 * ease.inOut(prog(t, K5 + 0.3, K5 + 1.0)), headPitch: -0.02, tailLean: 0 } };
  if (s === 6) {
    const k = prog(t, K6, K6 + 0.7);
    return { pl: "b", x: 0.15, z: -2.6, pose: { ...SIT, ry: 0, t, wag: 0, ears: lerp(0.6, -0.9, k), sad: 0.9 * k, shiver: 0.15 + 0.5 * prog(t, K6, K7), headTilt: 0.12, headPitch: 0.05 } };
  }
  if (s === 7) {
    const k = ease.inOut(prog(t, K7 + 0.1, K7 + 0.95));
    return { pl: "b", x: 0.15, z: -2.6, pose: { sit: 1 - k * 0.2, lie: k, cute: 1, ry: 0, t, wag: 0.25 * k, wagSpeed: 7, ears: lerp(-0.9, -0.2, k), sad: 0.9 * (1 - k), shiver: 0.4 * (1 - k), closed: 0.75 * ease.inOut(prog(t, K7 + 0.7, K7 + 1.3)), headPitch: 0.1 * k, tailLean: 0.4 } };
  }
  if (s === 8) return { pl: "n", x: 1.15, z: -1.4, pose: { sit: 1, cute: 1, ry: -Math.PI / 2, t, wag: 0.5, wagSpeed: 10, ears: 0.55, headYaw: -0.1, headTilt: 0.15, tailLean: 0.3 } };
  return null;
};

// ---------- people ----------
const OPEN = { armR: { to: [0.64, 1.06], bend: -1 }, armL: { to: [-0.64, 1.06], bend: 1 } };
const WAVE = (t) => ({ armR: { to: [0.38, 1.62 + 0.07 * Math.sin(t * 11)], bend: -1 }, armL: {} });
function ownerState(t) {
  const s = shotOf(t);
  if (s === 1) {
    if (t < 0.25) return null;
    const xw = lerp(5.8, 0.25, ease.inOut(prog(t, 0.25, 1.4)));
    const z = lerp(-6.05, -5.4, ease.inOut(prog(t, 1.3, 1.6)));
    const walking = t < 1.4;
    return { x: xw, z, pose: { t, x: xw, z, walk: walking ? 1 : 0, walkPhase: (5.8 - xw) * 4.6, cute: 0.4, mouth: { open: t > 1.5 ? 0.35 + 0.3 * Math.sin(t * 9) : 0, smile: 0.6 }, brow: { raise: t > 1.5 ? 0.3 : 0 }, look: [-0.3, 0.1], ...(t > 1.5 ? WAVE(t) : {}) } };
  }
  if (s === 2) return { x: 0.25, z: -5.4, pose: { t, x: 0.25, z: -5.4, cute: 0.4, mouth: { open: 0.3 + 0.25 * Math.sin(t * 9), smile: 0.6 }, brow: { raise: 0.25 }, look: [-0.2, 0.2], ...WAVE(t) } };
  if (s === 3) return { x: 300, z: -10.7, pose: { t, x: 300, z: -10.7, cute: 0.5, mouth: { open: 0.5, smile: 0.7 }, brow: { raise: 0.35 }, eyes: { size: 1.05 }, head: { tilt: 0.04 * Math.sin(t * 5) }, ...OPEN } };
  if (s === 9) {
    const u = t - K9;
    const z = ownerZ9(t);
    const moving = z > -2.34 ? 0 : 1;
    const open = ease.inOut(prog(u, 1.4, 1.9));
    const arms = open > 0.01
      ? { armR: { to: [lerp(0.2, 0.64, open), lerp(0.6, 1.06, open)], bend: -1 }, armL: { to: [lerp(-0.2, -0.64, open), lerp(0.6, 1.06, open)], bend: 1 } }
      : { armR: { a: 0.5 * Math.sin((-5.0 - z) * 4.6) * moving + 0.08 }, armL: { a: -0.5 * Math.sin((-5.0 - z) * 4.6) * moving - 0.08 } };
    return { x: -0.25, z, pose: { t, x: -0.25, z, walk: moving, walkPhase: (z + 5.0) * 4.6, cute: 0.5, mouth: { open: 0.3 + 0.25 * open, smile: 0.7 }, brow: { raise: 0.3 * open }, look: [0.5, 0.2], ...arms } };
  }
  if (s === 10) {
    const u = t - K10;
    const x = -0.25 - 4.3 * ease.inOut(prog(u, 0.25, 1.5));
    if (x < -4.2) return null;
    const walking = u > 0.2 && u < 1.55 ? 1 : 0;
    return { x, z: -2.35, pose: { t, x, z: -2.35, walk: walking, walkPhase: (-0.25 - x) * 4.6, cute: 0.5, mouth: { open: 0.1, smile: 0.7 }, look: [0.2, 0.0], armR: { a: 0.08 }, armL: { a: -0.08 } } };
  }
  return null;
}
function scientistState(t) {
  const s = shotOf(t);
  if (s < 5 || s > 7) return null;
  const x = OFF.b + 2.6, z = 0.1;
  const worry = s === 6 ? 1 : 0;
  return { pose: { t, x, z, cute: 0.3, look: [-0.7, 0.1], mouth: { open: 0, smile: s === 7 ? 0.7 : 0.1 }, brow: { raise: 0.2 * worry, worry: 0.5 * worry }, head: { turn: -0.5, tilt: 0.03 }, armR: { to: [0.13, 0.98], bend: -1 }, armL: { to: [-0.12, 0.9], bend: 1 } } };
}
const bigDogState = (t) => {
  if (shotOf(t) !== 4) return null;
  const u = t - K4;
  return { x: 300 - 0.45, z: -8.6 + 1.55 * u, pose: { ry: 0, t, walk: 1, wag: 0, ears: 0, headPitch: 0.02, cute: 0, angry: 0.3 } };
};

// ---------- cameras ----------
const CAM0 = { pos: V(-1.75, 0.8, 0.4), look: V(0.45, 0.36, -3.1), fov: 62 };
const mix3 = (a, b, k) => a.clone().lerp(b, k);
const orb = (c, r, a, h) => V(c.x + r * Math.sin(a), c.y + h, c.z + r * Math.cos(a));
function cameraAt(t) {
  const s = shotOf(t);
  if (s === 1) {
    const e = ease.inOut(prog(t, 0, K2));
    return { pos: mix3(CAM0.pos, V(-1.5, 0.68, -0.1), e), look: mix3(CAM0.look, V(1.0, 0.4, -3.0), e), fov: 62 };
  }
  if (s === 2) {
    const dz = -1.9 - 1.3 * (t - 0.12 - K2); // the camera follows a little behind him
    const e = ease.inOut(prog(t, K2, K3));
    return { pos: V(lerp(-1.0, -0.55, e), lerp(1.05, 1.15, e), dz + 2.8), look: V(0.05, 0.4, dz - 2.0), fov: 62 };
  }
  if (s === 3) {
    const u = t - K3, dz = -1.6 - 8.1 * ease.inOut(clamp01((u - 0.1) / 2.3));
    const e = ease.inOut(prog(t, K3, K4));
    return { pos: P("p", lerp(0.5, -1.2, e), lerp(0.5, 3.0, e), dz + lerp(2.3, 4.2, e)), look: P("p", 0, lerp(0.45, 0.6, e), dz - lerp(2.5, 1.2, e)), fov: lerp(62, 62, e) };
  }
  if (s === 4) {
    const e = ease.inOut(prog(t, K4, K5));
    const c = P("p", 0.3, 0.45, -1.2);
    return { pos: orb(c, 2.7, lerp(-0.1, -0.4, e), lerp(0.18, 0.22, e)), look: P("p", 0.15, 0.5, -3.6), fov: 62 };
  }
  if (s === 5) {
    const e = ease.inOut(prog(t, K5, K6));
    return { pos: P("b", lerp(0.2, 0.05, e), lerp(0.5, 0.45, e), lerp(0.4, -0.85, e)), look: P("b", 0.1, 0.5, -2.6), fov: 56 };
  }
  if (s === 6) {
    const e = ease.inOut(prog(t, K6, K7));
    const c = P("b", 0.15, 0.5, -2.6);
    return { pos: orb(c, 2.3, lerp(0.7, 2.65, e), lerp(0.3, 0.55, e)), look: mix3(c.clone().add(V(0, 0.05, 0)), P("b", 0, 1.25, 0.8), 0.5 * ease.inOut(prog(t, K6 + 0.5, K7))), fov: 62 };
  }
  if (s === 7) {
    const e = ease.inOut(prog(t, K7, K8));
    return { pos: P("b", lerp(0.7, 1.2, e), lerp(0.85, 0.5, e), lerp(-4.7, -5.2, e)), look: P("b", 0.1, lerp(0.9, 0.7, e), -1.0), fov: 58 };
  }
  if (s === 8) {
    const e = ease.inOut(prog(t, K8, K9));
    return { pos: V(lerp(-2.0, 0.2, e), lerp(1.5, 4.6, e), lerp(1.8, 3.1, e)), look: V(0, lerp(0.7, 0.3, e), lerp(-1.9, -2.3, e)), fov: lerp(70, 72, e) };
  }
  if (s === 9) {
    const e = ease.inOut(prog(t, K9, K10));
    const M = V(0.05, 0.62, -2.0);
    return { pos: orb(M, 4.4, lerp(0.0, -0.95, e), lerp(0.75, 0.95, e)), look: V(M.x + 0.25, 0.6, M.z - 0.5), fov: 64 };
  }
  const e = ease.soft(prog(t, K10, K10 + 1.5));
  return { pos: mix3(V(1.5, 1.2, 0.7), CAM0.pos, e), look: mix3(V(0.1, 0.5, -3.3), CAM0.look, e), fov: lerp(60, 62, e) };
}

// ===================== effects, labels, sound =====================
const youre = at("you're");
burst(K3 + 2.45, P("p", 0, 0.95, -10.1), 9, { ch: ["💚", "💗"], spread: 0.8, rise: 1.0, size: 0.3, gap: 0.07 });
{ // S8: little messages flying between the two dogs
  const a = V(-1.15, 0.75, -1.4), b = V(1.15, 0.75, -1.4);
  [["❤️", a, b, 0.25], ["😊", b, a, 0.75], ["💚", a, b, 1.2], ["💬", b, a, 1.7]].forEach(([ch, from, to, dt]) => travel(K8 + dt, from, to, ch, { dur: 1.15, size: 0.5, arc: 0.9 }));
}
burst(youre - 0.05, P("n", 0.1, 0.95, -2.1), 10, { ch: ["💗", "❤️", "💗"], spread: 0.9, rise: 1.1, size: 0.3, gap: 0.09 });

// moments that get a soft water-drop "plip" (the highlights, instead of any on-screen words)
const TAGS = [[0.25], [K2 + 0.1], [3.1], [K3 + 0.2], [K4 + 0.1], [K5 + 0.1], [K6 + 0.1], [K7 + 0.05], [K8 + 0.1], [K9 + 0.2], [18.35]];
// heartbeats: faster and faster for the left wag, slower and slower for the right wag
const BEATS = [[], []];
for (let tt = K6 + 0.1; tt < K7 - 0.1;) { BEATS[0].push(tt); tt += lerp(0.62, 0.36, prog(tt, K6, K7)); }
for (let tt = K7 + 0.05; tt < K8 - 0.15;) { BEATS[1].push(tt); tt += lerp(0.42, 0.85, prog(tt, K7, K8)); }
const beatPulse = (t) => { let p = 0; for (const b of BEATS[0].concat(BEATS[1])) if (t >= b) p = Math.max(p, Math.exp(-(t - b) * 8)); return p; };
const heartRed = emojiSprite("❤️"), heartGreen = emojiSprite("💚"), eyesIcon = emojiSprite("👀");

const sfx = createSfx(short);
sfx.loop(0, K3 + 0.1, "birds", { gain: 0.15, fadeIn: 0.15, fadeOut: 0.25 });
sfx.loop(K3 - 0.05, K5 + 0.1, "birds_b", { gain: 0.4, fadeIn: 0.2, fadeOut: 0.25 });
sfx.loop(K5 - 0.05, K8 + 0.1, "wind", { gain: 0.5, fadeIn: 0.2, fadeOut: 0.3 });
sfx.loop(K5 - 0.05, K8 + 0.1, "birds", { gain: 0.07, fadeIn: 0.2, fadeOut: 0.3 });
sfx.loop(K8 - 0.05, DURATION, "birds", { gain: 0.15, fadeIn: 0.25, fadeOut: 0.1 });
const stepTimes = (t0, n, dt) => Array.from({ length: n }, (_, i) => t0 + i * dt);
sfx.steps(stepTimes(0.55, 3, 0.37), ["step_1", "step_2", "step_3"], { gain: 0.5 });          // you walk up to the gate
sfx.steps(stepTimes(K2 + 0.1, 6, 0.3), ["step_2", "step_3", "step_1"], { gain: 0.22 });      // his paws on the path
sfx.steps(stepTimes(K3 + 0.12, 11, 0.19), ["step_3", "step_1", "step_2"], { gain: 0.26, jitter: 0.3 }); // he runs
sfx.steps(stepTimes(K9 + 0.15, 4, 0.4), ["step_1", "step_3", "step_2"], { gain: 0.5 });      // you walk in
sfx.steps(stepTimes(K9 + 0.7, 5, 0.2), ["step_2", "step_1", "step_3"], { gain: 0.22 });
sfx.steps(stepTimes(K10 + 0.3, 4, 0.37), ["step_3", "step_2", "step_1"], { gain: 0.4 });      // you walk off
sfx.add(K9 + 0.02, "gate", { gain: 0.38, rate: 1.05 });
for (const t of [3.1, 3.32, 3.54, 3.74]) sfx.add(t, "thump", { gain: 0.3, rate: 1.05 });                // tail thumps while it starts to lean
TAGS.forEach(([t0], i) => sfx.add(t0, i % 2 ? "drop_2" : "drop_1", { gain: i % 2 ? 0.7 : 0.4, rate: 0.95 + 0.04 * (i % 3) }));
sfx.add(K3 + 2.5, "pluck", { gain: 0.3 });
sfx.add(K3 + 2.55, "chime", { gain: 0.2, dur: 1.4, fadeOut: 0.6 });
sfx.add(K4 + 0.25, "whimper", { gain: 0.17, rate: 0.88, dur: 1.0, fadeOut: 0.4 });
sfx.add(K4 + 0.95, "bark_1", { gain: 0.3, rate: 0.62 });
BEATS[0].forEach((tt) => sfx.add(tt, "heart", { gain: 0.5 + 0.5 * prog(tt, K6, K7) })); // the heartbeat speeds up
BEATS[1].forEach((tt) => sfx.add(tt, "heart", { gain: lerp(0.8, 0.3, prog(tt, K7, K8)) })); // ...and calms down
sfx.add(K7 + 0.3, "breath", { gain: 0.45, dur: 1.4, fadeOut: 0.5 });
[0.25, 0.75, 1.2, 1.7].forEach((dt, i) => sfx.add(K8 + dt, "pluck", { gain: 0.2, rate: 0.9 + 0.12 * i }));
sfx.add(K9 + 1.85, "whimper", { gain: 0.15, rate: 1.15, dur: 1.0, fadeOut: 0.4 });
sfx.add(youre - 0.05, "chime", { gain: 0.25, dur: 1.8, fadeOut: 0.7 });
sfx.add(youre - 0.05, "pluck", { gain: 0.22, rate: 1.1 });

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
document.getElementById("vignette").style.opacity = "0.12";
const flashEl = document.getElementById("flash");
flashEl.style.background = "#fff9ee";
function dip(t) { // a soft cream dip at each cut (0.34 s in all)
  const d = Math.max(...CUTS.map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.17)));
  flashEl.style.opacity = String(ease.inOut(d) * 0.9);
}

// ---------- the video on the lawn: a dog from behind whose tail swings left or right ----------
const sctx = screenCanvas.getContext("2d");
function drawScreen(t) {
  const W_ = screenCanvas.width, H_ = screenCanvas.height;
  sctx.fillStyle = "#f7f6f0"; sctx.fillRect(0, 0, W_, H_);
  const grad = sctx.createLinearGradient(0, H_ * 0.7, 0, H_); grad.addColorStop(0, "rgba(120,200,120,0)"); grad.addColorStop(1, "rgba(120,200,120,0.55)");
  sctx.fillStyle = grad; sctx.fillRect(0, H_ * 0.7, W_, H_ * 0.3);
  const lean = t < K6 ? 0 : t < K7 ? -0.66 : 0.66;
  const th = lean + (lean === 0 ? 0.55 : 0.42) * Math.sin(t * 12);
  const cx = W_ / 2;
  sctx.fillStyle = "#23201f"; sctx.strokeStyle = "#23201f"; sctx.lineCap = "round";
  // body, head, ears (a dog seen from behind)
  sctx.beginPath(); sctx.moveTo(cx - 70, 190); sctx.quadraticCurveTo(cx - 118, 300, cx - 128, 372); sctx.lineTo(cx + 128, 372); sctx.quadraticCurveTo(cx + 118, 300, cx + 70, 190); sctx.closePath(); sctx.fill();
  sctx.beginPath(); sctx.arc(cx, 150, 58, 0, Math.PI * 2); sctx.fill();
  for (const sgn of [-1, 1]) { sctx.beginPath(); sctx.moveTo(cx + sgn * 30, 112); sctx.lineTo(cx + sgn * 74, 70); sctx.lineTo(cx + sgn * 78, 138); sctx.closePath(); sctx.fill(); }
  // the tail, swinging about its base
  const bx = cx, by = 330, L = 150;
  const tx = bx + L * Math.sin(th), ty = by - L * Math.cos(th);
  sctx.lineWidth = 30;
  sctx.beginPath(); sctx.moveTo(bx, by); sctx.quadraticCurveTo(bx + (tx - bx) * 0.35 + 18 * Math.sign(th || 1), by - (by - ty) * 0.6, tx, ty); sctx.stroke();
  // a big arrow (no words): grey ↔ while it just wags, orange ◀ for a left wag, green ▶ for a right wag
  const col = lean === 0 ? "#9a9a9a" : lean < 0 ? "#ff9a2e" : "#39d17a";
  sctx.fillStyle = col; sctx.strokeStyle = "#23201f"; sctx.lineWidth = 8; sctx.lineJoin = "round";
  const arrow = (x0, dir) => { sctx.beginPath(); sctx.moveTo(x0 + dir * 70, 62); sctx.lineTo(x0 + dir * 8, 22); sctx.lineTo(x0 + dir * 8, 46); sctx.lineTo(x0 - dir * 70, 46); sctx.lineTo(x0 - dir * 70, 78); sctx.lineTo(x0 + dir * 8, 78); sctx.lineTo(x0 + dir * 8, 102); sctx.closePath(); sctx.stroke(); sctx.fill(); };
  if (lean === 0) { arrow(cx - 100, -1); arrow(cx + 100, 1); } else arrow(cx, lean < 0 ? -1 : 1);
  screenTex.needsUpdate = true;
}
drawScreen(0);

// ===================== frame =====================
const _v = V(0, 0, 0), _t = V(0, 0, 0);
const focusOf = { n: [0, -2], p: [OFF.p, -4], b: [OFF.b, -2] };
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  const s = shotOf(t), pl = PLACE[s];
  for (const k of Object.keys(places)) places[k].visible = k === pl;
  lightAt(...focusOf[pl]);
  // the golden dog
  const g = goldenState(t);
  golden.visible = !!g;
  fan.visible = arrowR.visible = arrowL.visible = glowSprite.visible = false;
  if (g) {
    golden.pose({ ...g.pose, x: OFF[g.pl] + g.x, y: g.pose.lift ?? 0, z: g.z });
    golden.updateMatrixWorld(true);
    golden.tail.getWorldPosition(_v);
    const lean = g.pose.tailLean, wag = g.pose.wag ?? 0, ry = g.pose.ry;
    const moving = g.pose.sit || g.pose.walk || g.pose.run || g.pose.beg ? 1 : 0.5;
    // what to highlight: the tail itself (yellow glow), then the lean (fan + arrow: green = right, orange = left)
    const fanOn = (s === 2 ? prog(t, K2 + 0.15, K2 + 0.6) : s === 3 || s === 4 || s === 8 ? 1 : s === 9 ? 1 - prog(t, 18.9, 19.4) : 0) * moving;
    const k = clamp01((lean - 0.1) / 0.52);
    const color = lean < 0 ? COLORS.orange : COLORS.yellow.clone().lerp(COLORS.green, ease.inOut(k));
    setFan(fan, fanOn, color, _v.x, _v.z, ry, lean - 0.7 * wag, lean + 0.7 * wag);
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    const arrowsOn = fanOn;
    if (lean < 0) setArrow(arrowL, arrowsOn, color, _v.x, _v.z, ry, lean - 0.7 * wag, -1, 0.62, 0.09, pulse);
    else {
      setArrow(arrowR, arrowsOn, color, _v.x, _v.z, ry, lean + 0.7 * wag, 1, 0.62, 0.09, pulse);
      if (s === 2) setArrow(arrowL, arrowsOn * (1 - k), color, _v.x, _v.z, ry, lean - 0.7 * wag, -1, 0.62, 0.09, pulse); // before it leans: both ways
    }
    // the glow sits on the tip of the tail: yellow on "watch his tail", then the colour of the lean
    golden.tail.localToWorld(_t.set(0, 0, -0.38));
    const glowOn = s === 1 ? ease.inOut(prog(t, 0.2, 0.6)) * (1 - prog(t, K2 - 0.3, K2)) : s === 2 ? 0.6 * (1 - prog(t, 3.0, 3.4)) : (s === 3 || s === 4 || s === 8 || s === 9) ? 0.7 : 0;
    glowSprite.visible = glowOn > 0.01;
    glowSprite.position.copy(_t);
    glowSprite.material.color.copy(s === 1 || s === 2 ? COLORS.yellow : color);
    glowSprite.material.opacity = Math.min(1, glowOn * (0.85 + 0.15 * pulse));
    glowSprite.scale.setScalar(0.46 + 0.1 * pulse);
  }
  const w = whiteState(t);
  whiteDog.visible = !!w;
  if (w) whiteDog.pose({ ...w.pose, x: OFF[w.pl] + w.x, z: w.z });
  const bd = bigDogState(t);
  bigDog.visible = !!bd;
  if (bd) bigDog.pose({ ...bd.pose, x: bd.x, z: bd.z });
  const o = ownerState(t);
  owner.visible = !!o;
  if (o) owner.pose(o.pose);
  const sc = scientistState(t);
  scientist.visible = !!sc;
  if (sc) scientist.pose(sc.pose);
  // the camera
  const c = cameraAt(t);
  camera.position.copy(c.pos);
  camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  owner.faceCamera(camera);
  scientist.faceCamera(camera);
  if (s >= 5 && s <= 7) drawScreen(t);
  // heart-rate: a heart above the white dog that beats with the sound (red and fast, then green and slow)
  const pulseB = beatPulse(t);
  const hp = whiteDog.visible ? whiteDog.position : null;
  heartRed.visible = !!hp && s === 6;
  heartGreen.visible = !!hp && s === 7;
  eyesIcon.visible = !!hp && s === 5;
  if (hp) {
    for (const [sp, on] of [[heartRed, s === 6], [heartGreen, s === 7]]) {
      sp.position.set(hp.x + 0.1, 1.05, hp.z);
      sp.scale.setScalar(0.5 * (1 + 0.45 * pulseB));
      sp.material.opacity = on ? Math.min(1, prog(t, s === 6 ? K6 : K7, (s === 6 ? K6 : K7) + 0.2)) : 0;
    }
    eyesIcon.position.set(hp.x + 0.05, 0.95, hp.z);
    eyesIcon.scale.setScalar(0.34 * (1 + 0.08 * Math.sin(t * 9)));
    eyesIcon.material.opacity = Math.min(1, prog(t, K5 + 0.1, K5 + 0.4)) * (1 - prog(t, K6 - 0.2, K6));
  }
  drawFx(t);
  captions(t);
  dip(t);
});

window.__dbg = { scene, camera, golden, whiteDog, bigDog, owner, scientist, places, CUTS, DURATION };
short.start();
