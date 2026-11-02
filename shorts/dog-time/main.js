import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon, toonGradient } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Your dog knows how long you've been gone" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// Eleven shots in three outdoor places (the neighbourhood, a park, a back garden), a different camera move in every shot.
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
  gone1: at("gone", 1), thirty: at("30", 1), happy: at("happy"), two: at("2", 1), wild: at("wild"), study: at("study"), excited: at("excited"),
  clock: at("clock"), know: at("know"), researchers: at("researchers"), smells: at("smells"), time: at("time"), scent: at("scent"),
  gone2: at("gone", 2), welcome: at("welcome"), waited: at("waited"),
};
// shot boundaries: a hair before the first word of each new idea
const CUTS = [at("come", 1), at("come", 2), at("in", 1), at("than"), at("he", 2), at("so", 1), at("some"), at("your", 2), at("so", 2), at("so", 3)].map((t) => t - 0.04);
const [K2, K3, K4, K5, K6, K7, K8, K9, K10, K11] = CUTS;
const shotOf = (t) => (t < K2 ? 1 : t < K3 ? 2 : t < K4 ? 3 : t < K5 ? 4 : t < K6 ? 5 : t < K7 ? 6 : t < K8 ? 7 : t < K9 ? 8 : t < K10 ? 9 : t < K11 ? 10 : 11);
const PLACE = { 1: "n", 2: "n", 3: "p", 4: "b", 5: "b", 6: "n", 7: "n", 8: "n", 9: "n", 10: "n", 11: "n" };

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
  put(g, W.flowerBed(3.0, 0.7, 30), -3.6, 0, 3.0);
  put(g, W.flowerBed(3.0, 0.7, 30), 3.6, 0, 3.0);
  put(g, W.flowerBed(2.2, 0.6, 20), -7.5, 0, 2.2);
  // doormat + a big wall clock over the front door (ticks, no numbers)
  slab(g, 1.0, 0.03, 0.62, toon(0x9a6a3c), 0.88, 0.045, 3.45);
  const clockG = new THREE.Group(); clockG.position.set(0.88, 2.2, 4.0); g.add(clockG);
  { const face = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 28).rotateX(Math.PI / 2), toon(0xfffbf0)); face.castShadow = true; clockG.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 28), toon(0x2b2f3a)); rim.position.z = -0.01; clockG.add(rim);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.03, i % 3 ? 0.05 : 0.09, 0.02), toon(0x2b2f3a)); tk.position.set(Math.sin(a) * 0.29, Math.cos(a) * 0.29, -0.035); tk.rotation.z = -a; clockG.add(tk); }
  }
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
const owner2 = createPuppet({ skin: "#c98c5e", hair: "#241a18", hairStyle: "long", shirt: "#9a86e0", pants: "#3b3f55", shoes: "#ffd04a", seed: 4 });
const scientist = createPuppet({ skin: "#c98c5e", hair: "#241a18", hairStyle: "bun", shirt: "#ffffff", pants: "#3b3f55", shoes: "#ffd04a", outfit: "labcoat", under: "#6bb7e6", glasses: true, sleeves: "long", seed: 5 });
scene.add(owner, owner2, scientist);

const toonDog = (colors, key, scale, extra) => {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d);
  return d;
};
const golden = toonDog(DOG_COLORS.golden, "g", 0.7);
const whiteDog = toonDog({ body: 0xf4f0e6, light: 0xffffff, dark: 0xd6cdbf }, "w", 0.62);

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

// ===================== things that move in the neighbourhood: the clock hands, the scent ribbon =====================
const clockHands = { min: new THREE.Group(), hr: new THREE.Group() };
{
  for (const [k, len, w] of [["hr", 0.19, 0.04], ["min", 0.29, 0.028]]) {
    const grp = clockHands[k];
    grp.position.set(0.88, 2.2, 3.95);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.015), toon(0x2b2f3a));
    m.position.y = len / 2; m.userData.ink = false;
    grp.add(m);
    places.n.add(grp);
  }
}
// your scent: a wavy ribbon from the doormat out to the gate (it fades as time passes)
const ribbonPts = [[0.88, 3.45], [0.7, 2.6], [0.15, 1.8], [-0.3, 0.9], [0.1, 0.0], [0.45, -0.9], [0.0, -1.9], [-0.35, -2.9], [0.1, -3.9], [0.0, -4.7]].map(([x, z]) => V(x, 0.09, z));
const ribbon = (() => {
  const curve = new THREE.CatmullRomCurve3(ribbonPts);
  const N = 90, pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
  const pt = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    curve.getPointAt(u, pt); curve.getTangentAt(u, tg);
    const nx = -tg.z, nz = tg.x, w = 0.12 + 0.03 * Math.sin(u * 30);
    pos.set([pt.x - nx * w, pt.y, pt.z - nz * w, pt.x + nx * w, pt.y, pt.z + nz * w], i * 6);
    uv.set([0, u * 14, 1, u * 14], i * 4);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const x = c.getContext("2d");
  x.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 4; i++) { // swirly scent dashes
    x.strokeStyle = "rgba(255,255,255,0.95)"; x.lineWidth = 12; x.lineCap = "round";
    x.beginPath(); x.moveTo(8, i * 32 + 4); x.quadraticCurveTo(32, i * 32 + 14, 56, i * 32 + 4); x.stroke();
    x.strokeStyle = "rgba(43,27,22,0.75)"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(8, i * 32 + 11); x.quadraticCurveTo(32, i * 32 + 21, 56, i * 32 + 11); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, color: 0xff6fb5, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }));
  m.renderOrder = 6; m.frustumCulled = false; m.userData.ink = false; m.visible = false;
  places.n.add(m);
  return m;
})();
const thinkIcon = emojiSprite("🤔");

// ===================== the story, shot by shot =====================
const P = (pl, x, y, z) => V(OFF[pl] + x, y, z);
const WS = (2 * Math.PI * Math.round((12.2 * DURATION) / (2 * Math.PI))) / DURATION; // loop-safe wag speed (sin = 0 at both ends)
const GATE = { x: 0, z: -4.7 };      // where he waits: just inside the gate, looking out at the street
const MAT = { x: 0.88, z: 3.45 };

// how long you've been away, 0..1: drives the pie timer and the swing of the sun (shadows)
function away(t) {
  if (t < K2) return 0.12 * ease.inOut(prog(t, 0.55, K2));
  if (t < K3) return 0.12;
  if (t < K4) return 0.6 * ease.inOut(prog(t, K3 + 0.1, K3 + 1.5));
  if (t < K9) return 0;
  if (t < K10) return 0.1 + 0.82 * ease.inOut(prog(t, K9, K10 - 0.2));
  if (t < K11) return 0;
  return 0.12 * ease.inOut(prog(t, K11 + 0.2, DURATION - 0.3)) * (1 - prog(t, DURATION - 0.35, DURATION - 0.06));
}
function sunS(t) { // sun position along its arc (0 = low in the east, 1 = low in the west); 0.3 is the normal morning light
  const a = away(t);
  const s = t < K4 ? 0.3 + a * 0.55 : t >= K9 && t < K10 ? 0.28 + 0.62 * prog(t, K9, K10) : 0.3;
  return s;
}
function lightFocus(x, z, s) {
  sun.target.position.set(x, 0, z);
  sun.position.set(x - 7 + 13 * s, 4.2 + 5 * Math.sin(Math.PI * s), z + 4);
}

// ---------- people: states ----------
const OPEN = { armR: { to: [0.64, 1.06], bend: -1 }, armL: { to: [-0.64, 1.06], bend: 1 } };
const WAVE = (t) => ({ armR: { to: [0.38, 1.62 + 0.07 * Math.sin(t * 11)], bend: -1 }, armL: {} });
const walkArms = (ph) => ({ armR: { a: 0.08 + 0.35 * Math.sin(ph) }, armL: { a: -0.08 - 0.35 * Math.sin(ph) } });

function ownerState(t) {
  const s = shotOf(t);
  if (s === 1) { // you walk off along the sidewalk, left to right across the frame
    const x = lerp(3.9, -3.9, prog(t, 0.1, 2.0));
    if (x > 3.8) return null;
    return { pose: { t, x, z: -5.95, walk: 1, walkPhase: (3.9 - x) * 4.6, cute: 0.4, mouth: { smile: 0.6 }, look: [0.6, 0.0], ...walkArms((3.9 - x) * 4.6) } };
  }
  if (s === 2) { // 30 minutes later: you come back, wave at the gate
    const x = lerp(-3.9, 0.3, ease.out(prog(t, K2 - 0.1, K2 + 1.15)));
    const walking = t < K2 + 1.2 ? 1 : 0;
    const z = lerp(-5.95, -5.3, ease.inOut(prog(t, K2 + 1.1, K2 + 1.4)));
    return { pose: { t, x, z, walk: walking, walkPhase: (x + 3.9) * 4.6, cute: 0.5, mouth: { open: t > K2 + 1.3 ? 0.35 + 0.25 * Math.sin(t * 9) : 0, smile: 0.7 }, brow: { raise: 0.3 }, look: [0.1, 0.1], ...(t > K2 + 1.3 ? WAVE(t) : walkArms((x + 3.9) * 4.6)) } };
  }
  if (s === 3) { // the park: two hours later you jog back to him, arms open, and he knocks you over
    const u = t - K3;
    const z = lerp(-7.6, -3.3, ease.out(prog(u, 0.05, 1.5)));
    const arrived = u > 1.5;
    const fallK = ease.out(prog(t, K3 + 2.25, K3 + 2.62));
    const open = prog(u, 1.3, 1.55) * (1 - fallK);
    const arms = arrived || open > 0 ? { armR: { to: [lerp(0.22, 0.64, open), lerp(0.7, 1.06, open)], bend: -1 }, armL: { to: [lerp(-0.22, -0.64, open), lerp(0.7, 1.06, open)], bend: 1 } } : walkArms(z * 4.6);
    return { pose: { t, x: OFF.p, z, y: -0.0, fall: fallK * 1.28, walk: arrived ? 0 : 1, walkPhase: -z * 4.6, cute: 0.5, mouth: { open: arrived ? 0.5 : 0.2, smile: 0.7 }, brow: { raise: 0.3 }, ...arms } };
  }
  if (s === 4 || s === 5) return { pose: { t, x: OFF.b + 2.9, z: -3.2, cute: 0.4, mouth: { open: 0.3, smile: 0.7 }, look: [-0.5, 0.2], ...(s === 4 ? WAVE(t * 0.6) : { armR: { a: 0.1 }, armL: { a: -0.1 } }) } };
  if (s === 10) { // you come in at the gate and open your arms
    const u = t - K10;
    const z = lerp(-5.25, -4.0, ease.out(prog(u, 0.05, 0.85)));
    const walking = u < 0.9 ? 1 : 0;
    const open = ease.inOut(prog(u, 0.6, 1.1));
    const arms = open > 0.01 ? { armR: { to: [lerp(0.2, 0.64, open), lerp(0.6, 1.06, open)], bend: -1 }, armL: { to: [lerp(-0.2, -0.64, open), lerp(0.6, 1.06, open)], bend: 1 } } : walkArms(z * 4.6);
    return { pose: { t, x: -0.3, z, walk: walking, walkPhase: -z * 4.6, cute: 0.6, mouth: { open: 0.3 + 0.3 * open, smile: 0.8 }, brow: { raise: 0.3 * open }, look: [0.3, 0.2], ...arms } };
  }
  if (s === 11) { // you walk out of the gate and off along the sidewalk
    const u = t - K11;
    const x = lerp(0.3, -3.9, ease.in(prog(u, 0.25, 1.6)));
    const z = lerp(-5.1, -5.95, ease.inOut(prog(u, 0.0, 0.35)));
    if (x < -2.4) return null;
    const ph = (0.3 - x) * 4.6 + u * 8;
    return { pose: { t, x, z, walk: 1, walkPhase: ph, cute: 0.4, mouth: { smile: 0.6 }, look: [0.5, 0.1], ...walkArms(ph) } };
  }
  return null;
}
const owner2State = (t) => {
  const s = shotOf(t);
  if (s !== 4 && s !== 5) return null;
  return { pose: { t, x: OFF.b - 2.9, z: -3.2, cute: 0.4, mouth: { smile: 0.7 }, look: [0.4, 0.2], armR: { a: 0.1 }, armL: { a: -0.1 } } };
};
function scientistState(t) {
  const s = shotOf(t);
  if (s === 4 || s === 5) {
    const look = s === 4 ? lerp(-0.8, 0.8, prog(t, K4 + 0.3, K5 - 0.3)) : -0.8;
    return { pose: { t, x: OFF.b, z: -1.9, cute: 0.3, look: [look, 0.1], mouth: { smile: 0.4 }, head: { turn: look * 0.5 }, armR: { to: [0.13, 0.98], bend: -1 }, armL: { to: [-0.12, 0.9], bend: 1 } } };
  }
  if (s === 8 && t > C.researchers - 0.2) return { pose: { t, x: -1.7, z: 2.35, cute: 0.3, look: [0.6, -0.1], mouth: { smile: 0.2 }, brow: { raise: 0.3 }, head: { tilt: 0.06, turn: 0.4 }, armR: { to: [0.13, 0.98], bend: -1 }, armL: { to: [-0.12, 0.9], bend: 1 } } };
  return null;
}

// ---------- the golden dog ----------
function goldenState(t) {
  const s = shotOf(t), base = { t, wagSpeed: WS };
  if (s === 1 || s === 11) {
    const o = ownerState(t);
    // he follows you with his eyes (and the first and the last frame match exactly: head straight, owner out of frame)
    const track = o ? Math.atan2(-o.pose.x, 1.3) : 0;
    const k = s === 1 ? prog(t, 0.15, 0.6) : 1 - prog(t, DURATION - 0.55, DURATION);
    const back = s === 11 ? ease.inOut(prog(t, K11, K11 + 0.6)) : 1;
    const x = s === 11 ? lerp(0.25, GATE.x, back) : GATE.x, z = s === 11 ? lerp(-3.9, GATE.z, back) : GATE.z;
    return { pl: "n", x, z, pose: { ry: Math.PI, cute: 1, ...base, sit: s === 11 ? prog(t, K11 + 0.35, K11 + 0.75) : 1, walk: s === 11 ? 1 - prog(t, K11 + 0.4, K11 + 0.7) : 0, beg: s === 11 ? 1 - prog(t, K11, K11 + 0.25) : 0, wag: 0.35, ears: -0.12, sad: 0.2, headTilt: 0.12, headYaw: Math.max(-0.9, Math.min(0.9, track)) * 0.8 * k, headPitch: -0.04 } };
  }
  if (s === 2) {
    const k = ease.inOut(prog(t, K2 + 1.0, K2 + 1.3)); // you wave: he is up and happy
    return { pl: "n", x: GATE.x, z: GATE.z, pose: { ry: Math.PI, cute: 1, ...base, sit: 1 - k, wag: lerp(0.35, 0.8, k), wagSpeed: lerp(WS, 15, k), ears: lerp(-0.12, 0.5, k), sad: 0.2 * (1 - k), headTilt: 0.1, headYaw: 0.3 * k, mouth: 0.2 * k } };
  }
  if (s === 3) {
    const u = t - K3, cx = 0.0, cz = -3.2;
    const waiting = u < 1.45;
    const a = -Math.PI / 2 + 7.8 * Math.max(0, u - 1.5);
    const zoom = u >= 1.5 && u < 2.28;
    const jump = prog(u, 2.2, 2.55);
    let x = 0.4, z = -1.5, ry = Math.PI;
    if (zoom) { const r = 1.5; x = cx + r * Math.cos(a); z = cz + r * Math.sin(a); ry = Math.atan2(-Math.sin(a), Math.cos(a)); }
    else if (u >= 2.28) { x = lerp(cx + 1.5 * Math.cos(-Math.PI / 2 + 7.8 * 0.78), 0.15, jump); z = lerp(cz + 1.5 * Math.sin(-Math.PI / 2 + 7.8 * 0.78), -2.55, jump); ry = Math.PI; }
    return { pl: "p", x, z, pose: { ry, cute: 1, ...base, sit: waiting ? 1 - prog(u, 0.7, 0.95) : 0, run: zoom ? 1 : 0, beg: u >= 2.5 ? prog(u, 2.5, 2.7) : 0, leap: Math.sin(Math.PI * jump) * 0.5, lift: 0.3 * Math.sin(Math.PI * jump), wag: 0.9, wagSpeed: waiting ? 12 : 22, shiver: waiting && u > 0.7 ? 0.5 : 0, ears: 0.5, mouth: zoom ? 0.4 : 0.15, headPitch: -0.05 } };
  }
  if (s === 4) { // the wild dog on the right lawn, running rings round you
    const u = t - K4, a = 8.5 * u, r = 0.95;
    return { pl: "b", x: 2.1 + r * Math.cos(a), z: -3.2 + r * Math.sin(a), pose: { ry: Math.atan2(-Math.sin(a), Math.cos(a)), cute: 1, ...base, run: 1, wag: 0.9, wagSpeed: 22, mouth: 0.4, ears: 0.6, headPitch: -0.05 } };
  }
  if (s === 5) return { pl: "b", x: 2.1 + 0.95 * Math.cos(8.5 * (t - K4)), z: -3.2 + 0.95 * Math.sin(8.5 * (t - K4)), pose: { ry: Math.atan2(-Math.sin(8.5 * (t - K4)), Math.cos(8.5 * (t - K4))), cute: 1, ...base, run: 1, wag: 0.9, wagSpeed: 22, mouth: 0.4, ears: 0.6 } };
  if (s === 6) {
    const tilt = 0.38 * ease.inOut(prog(t, K6 + 0.15, K6 + 0.55));
    return { pl: "n", x: 0.5, z: 2.9, pose: { ry: 0, cute: 1, sit: 1, ...base, wag: 0.15, headPitch: -0.5, headTilt: tilt, ears: 0.55 } };
  }
  if (s === 7) {
    const tilt = -0.36 * ease.inOut(prog(t, K7 + 0.1, K7 + 0.45));
    return { pl: "n", x: 0.5, z: 2.9, pose: { ry: Math.PI, cute: 1, sit: 1, ...base, wag: 0.1, headPitch: -0.12, headTilt: tilt, ears: 0.5 } };
  }
  if (s === 8) return { pl: "n", x: MAT.x - 0.4, z: MAT.z, pose: { ry: Math.PI / 2, cute: 1, sit: 0, ...base, wag: 0.3, wagSpeed: 9, headPitch: 0.95 + 0.07 * Math.sin(t * 15), headYaw: 0, ears: 0.2 } };
  if (s === 9) return { pl: "n", x: 0.4, z: 2.9, pose: { ry: Math.PI, cute: 1, lie: 1, ...base, wag: 0.2, wagSpeed: 6, headPitch: -0.25 - 0.05 * Math.sin(t * 2), ears: 0.1, closed: 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8)) } };
  if (s === 10) {
    const u = t - K10;
    const go = ease.inOut(prog(u, 0.42, 1.55));
    const z = lerp(2.9, -3.35, go);
    return { pl: "n", x: lerp(0.4, 0.2, go), z, pose: { ry: Math.PI, cute: 1, ...base, lie: 1 - prog(u, 0.3, 0.5), sit: 0, run: prog(u, 0.45, 0.6) * (1 - prog(u, 1.4, 1.58)), beg: prog(u, 1.62, 1.85), wag: 0.9, wagSpeed: 20, mouth: 0.25, ears: 0.5, headPitch: -0.12 } };
  }
  return null;
}
function whiteState(t) {
  const s = shotOf(t);
  if (s !== 4 && s !== 5) return null;
  const yawn = s === 5 ? Math.sin(Math.PI * prog(t, K5 + 0.2, K6 - 0.1)) : 0;
  return { pl: "b", x: -1.9, z: -3.2, pose: { ry: 0, cute: 1, sit: 1, t, wag: 0.35, wagSpeed: 7, ears: 0.1, headTilt: 0.15, headPitch: -0.03, mouth: 0.5 * yawn, closed: 0.8 * yawn } };
}

// ---------- cameras ----------
const CAM0 = { pos: V(-0.4, 0.5, -7.6), look: V(0.0, 0.4, -4.7), fov: 50 };
const mix3 = (a, b, k) => a.clone().lerp(b, k);
const orb = (c, r, a, h) => V(c.x + r * Math.sin(a), c.y + h, c.z + r * Math.cos(a));
function cameraAt(t) {
  const s = shotOf(t);
  if (s === 1) { const e = ease.inOut(prog(t, 0, K2)); return { pos: mix3(CAM0.pos, V(-0.25, 0.46, -6.5), e), look: mix3(CAM0.look, V(0.0, 0.42, -4.7), e), fov: 50 }; }
  if (s === 2) { const e = ease.inOut(prog(t, K2, K3)); return { pos: V(lerp(-2.4, -1.7, e), lerp(0.55, 0.65, e), lerp(-2.8, -3.5, e)), look: V(lerp(0.2, 0.0, e), 0.6, -5.0), fov: 60 }; }
  if (s === 3) { const e = ease.inOut(prog(t, K3, K4)); return { pos: P("p", lerp(-0.9, -3.4, e), lerp(0.7, 3.4, e), lerp(1.5, 1.3, e)), look: P("p", 0.2, lerp(0.5, 0.45, e), -3.0), fov: 62 }; }
  if (s === 4) { const e = ease.inOut(prog(t, K4, K5)); return { pos: P("b", lerp(-0.3, 0.3, e), lerp(1.1, 1.25, e), lerp(2.6, 2.3, e)), look: P("b", lerp(-2.0, 2.2, e), 0.55, -3.2), fov: 66 }; }
  if (s === 5) { const e = ease.inOut(prog(t, K5, K6)); return { pos: P("b", lerp(-1.1, -1.7, e), lerp(0.55, 0.5, e), lerp(-0.7, -1.2, e)), look: P("b", -1.9, 0.45, -3.2), fov: 54 }; }
  if (s === 6) { const e = ease.inOut(prog(t, K6, K7)); return { pos: V(lerp(-3.3, -2.5, e), lerp(0.8, 0.9, e), lerp(1.6, 2.0, e)), look: V(0.45, lerp(1.05, 0.95, e), 3.4), fov: 64 }; }
  if (s === 7) { const e = ease.inOut(prog(t, K7, K8)); return { pos: V(lerp(0.15, 0.85, e), 0.55, lerp(0.3, 0.8, e)), look: V(0.5, 0.62, 2.9), fov: 52 }; }
  if (s === 8) { const e = ease.inOut(prog(t, K8, K9)); return { pos: V(lerp(-0.25, 0.25, e), lerp(0.5, 0.3, e), lerp(2.2, 2.65, e)), look: V(0.8, 0.2, 3.45), fov: lerp(56, 50, e) }; }
  if (s === 9) { const e = ease.inOut(prog(t, K9, K10)); return { pos: V(lerp(0.9, -0.5, e), lerp(0.55, 2.5, e), lerp(3.9, 0.9, e)), look: V(lerp(0.4, 0.0, e), 0.12, lerp(1.5, -3.2, e)), fov: lerp(60, 64, e) }; }
  if (s === 10) { const e = ease.inOut(prog(t, K10, K11)); const M = V(0.0, 0.62, -3.5); return { pos: orb(M, 4.2, lerp(0.5, -0.8, e), lerp(0.6, 1.0, e)), look: V(M.x + 0.1, 0.6, M.z - 0.3), fov: 64 }; }
  const e = ease.soft(prog(t, K11, DURATION - 0.1));
  return { pos: mix3(V(1.2, 0.9, -7.3), CAM0.pos, e), look: mix3(V(0.1, 0.5, -4.6), CAM0.look, e), fov: lerp(56, 50, e) };
}

// ===================== effects, sound =====================
burst(K2 + 1.3, V(0, 0.9, -4.7), 4, { ch: ["💚"], spread: 0.5, rise: 0.8, size: 0.24, gap: 0.12 });
burst(K3 + 2.55, P("p", 0.0, 0.8, -2.9), 9, { ch: ["💗", "💚"], spread: 0.9, rise: 1.1, size: 0.3, gap: 0.06 });
burst(K4 + 1.0, P("b", 2.5, 0.9, -3.2), 6, { ch: ["💗"], spread: 0.8, rise: 0.9, size: 0.26, gap: 0.2 });
for (let i = 0; i < 7; i++) travel(K8 + 0.15 + i * 0.3, V(MAT.x, 0.2, MAT.z), V(MAT.x + 0.1, 1.0, MAT.z + 0.25), "💨", { dur: 0.8, size: 0.3, arc: 0.15 });
burst(K10 + 1.65, V(0.1, 0.9, -3.6), 10, { ch: ["💗", "❤️", "💗"], spread: 1.0, rise: 1.2, size: 0.32, gap: 0.08 });
burst(C.waited - 0.1, V(0.1, 0.9, -3.6), 8, { ch: ["💗", "❤️"], spread: 1.0, rise: 1.2, size: 0.3, gap: 0.1 });

// ---------- the HUD graphics (no words): a pie timer for "how long you were away", and two bars ----------
const labelsEl = document.getElementById("labels");
const hud = document.createElement("div");
hud.style.cssText = "position:absolute;left:0;top:0;width:1080px;height:1920px;pointer-events:none";
labelsEl.appendChild(hud);
const SVGNS = "http://www.w3.org/2000/svg";
const pie = document.createElementNS(SVGNS, "svg");
pie.setAttribute("viewBox", "-100 -100 200 200");
pie.style.cssText = "position:absolute;left:440px;top:196px;width:200px;height:200px;opacity:0;filter:drop-shadow(0 9px 0 #111)";
const pieBg = document.createElementNS(SVGNS, "circle");
pieBg.setAttribute("r", "84"); pieBg.setAttribute("fill", "#fff"); pieBg.setAttribute("stroke", "#111"); pieBg.setAttribute("stroke-width", "10");
const pieWedge = document.createElementNS(SVGNS, "path");
pieWedge.setAttribute("stroke", "#111"); pieWedge.setAttribute("stroke-width", "6"); pieWedge.setAttribute("stroke-linejoin", "round");
const pieTicks = document.createElementNS(SVGNS, "path");
pieTicks.setAttribute("d", Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `M${Math.sin(a) * 70},${-Math.cos(a) * 70}L${Math.sin(a) * 80},${-Math.cos(a) * 80}`; }).join(""));
pieTicks.setAttribute("stroke", "#111"); pieTicks.setAttribute("stroke-width", "5"); pieTicks.setAttribute("stroke-linecap", "round");
pie.append(pieBg, pieWedge, pieTicks);
hud.appendChild(pie);
function setPie(f, opacity) {
  pie.style.opacity = String(opacity);
  if (opacity <= 0.01) return;
  const a = Math.min(0.9999, f) * Math.PI * 2;
  const x = Math.sin(a) * 74, y = -Math.cos(a) * 74;
  pieWedge.setAttribute("d", f <= 0.002 ? "" : `M0,0L0,-74A74,74 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)},${y.toFixed(2)}Z`);
  pieWedge.setAttribute("fill", f < 0.25 ? "#39d17a" : f < 0.55 ? "#ffd34e" : "#ff9a2e");
}
const barBox = document.createElement("div");
barBox.style.cssText = "position:absolute;left:340px;top:176px;width:400px;height:250px;background:#fff;border:9px solid #111;border-radius:36px;box-shadow:0 9px 0 #111;opacity:0;display:flex;align-items:flex-end;justify-content:center;gap:60px;padding:18px 0";
const barL = document.createElement("div"), barR = document.createElement("div");
for (const [b, c] of [[barL, "#39d17a"], [barR, "#ff9a2e"]]) b.style.cssText = `width:110px;height:0px;background:${c};border:7px solid #111;border-radius:22px 22px 8px 8px;transform-origin:50% 100%`;
barBox.append(barL, barR);
hud.appendChild(barBox);
function setBars(t) {
  const on = (t >= K4 + 0.15 && t < K6 - 0.05) ? Math.min(1, prog(t, K4 + 0.15, K4 + 0.45)) * (1 - prog(t, K6 - 0.25, K6 - 0.05)) : 0;
  barBox.style.opacity = String(on);
  if (!on) return;
  const grow = ease.out(prog(t, K4 + 0.5, K4 + 2.5));
  const pulse = t >= K5 ? 1 + 0.07 * Math.sin((t - K5) * 12) : 1;
  barL.style.height = `${Math.round(lerp(0, 52, ease.out(prog(t, K4 + 0.4, K4 + 0.9))))}px`;
  barR.style.height = `${Math.round(lerp(0, 168, grow))}px`;
  barL.style.transform = `scaleX(${t >= K5 ? pulse : 1})`;
}

const sfx = createSfx(short);
sfx.loop(0, K3 + 0.1, "birds", { gain: 0.15, fadeIn: 0.15, fadeOut: 0.25 });
sfx.loop(K3 - 0.05, K4 + 0.1, "birds_b", { gain: 0.4, fadeIn: 0.2, fadeOut: 0.25 });
sfx.loop(K4 - 0.05, K6 + 0.1, "wind", { gain: 0.45, fadeIn: 0.2, fadeOut: 0.3 });
sfx.loop(K4 - 0.05, K6 + 0.1, "birds", { gain: 0.08, fadeIn: 0.2, fadeOut: 0.3 });
sfx.loop(K6 - 0.05, K9 + 0.1, "birds", { gain: 0.14, fadeIn: 0.2, fadeOut: 0.3 });
sfx.loop(K6 - 0.05, K8 + 0.1, "clock", { gain: 0.3, fadeIn: 0.1, fadeOut: 0.25 });
sfx.loop(K9 - 0.05, K10 + 0.1, "pad", { gain: 0.25, fadeIn: 0.4, fadeOut: 0.4 });
sfx.loop(K10 - 0.05, DURATION, "birds", { gain: 0.15, fadeIn: 0.25, fadeOut: 0.1 });
const stepTimes = (t0, n, dt) => Array.from({ length: n }, (_, i) => t0 + i * dt);
sfx.steps(stepTimes(0.35, 5, 0.34), ["step_1", "step_2", "step_3"], { gain: 0.45, pan: 0.2 });   // you walk off
sfx.steps(stepTimes(K2 + 0.1, 4, 0.34), ["step_3", "step_1", "step_2"], { gain: 0.4 });           // you come back (30 min)
sfx.steps(stepTimes(K3 + 0.1, 5, 0.28), ["step_2", "step_3", "step_1"], { gain: 0.42 });          // you jog back (2 hours)
sfx.steps(stepTimes(K3 + 1.5, 12, 0.13), ["step_1", "step_3", "step_2"], { gain: 0.24, jitter: 0.3 }); // zoomies
sfx.steps(stepTimes(K10 + 0.05, 3, 0.3), ["step_1", "step_2", "step_3"], { gain: 0.4 });
sfx.steps(stepTimes(K10 + 0.45, 7, 0.16), ["step_3", "step_1", "step_2"], { gain: 0.26, jitter: 0.3 }); // he runs to you
sfx.steps(stepTimes(K11 + 0.1, 5, 0.3), ["step_2", "step_3", "step_1"], { gain: 0.38, pan: -0.2 });   // you leave
sfx.add(K10 + 0.02, "gate", { gain: 0.36, rate: 1.05 });
sfx.add(K3 + 2.58, "thump", { gain: 0.6, rate: 0.8 });
sfx.add(K3 + 2.62, "pluck", { gain: 0.3, rate: 0.8 });
sfx.add(K3 + 2.7, "chime", { gain: 0.22, dur: 1.4, fadeOut: 0.6 });
sfx.add(K2 + 1.35, "whimper", { gain: 0.14, rate: 1.15, dur: 1.0, fadeOut: 0.4 });
for (const t0 of [0.62, K2 + 0.1, K3 + 0.12, K4 + 0.2, K5 + 0.1, K6 + 0.1, K7 + 0.1, K8 + 0.1, K9 + 0.1, K10 + 0.2, C.waited]) sfx.add(t0, "drop_1", { gain: 0.35, rate: 0.95 + 0.03 * (t0 % 3) });
sfx.add(K4 + 1.9, "chime", { gain: 0.22, dur: 1.2, fadeOut: 0.5 });
sfx.add(K7 + 0.1, "pluck", { gain: 0.25, rate: 0.9 });
stepTimes(K8 + 0.05, 5, 0.36).forEach((tt, i) => sfx.add(tt, "sniff", { gain: 0.7, rate: 0.95 + 0.05 * (i % 2) }));
for (let tt = K9 + 0.1, i = 0; tt < K10 - 0.2; i++) { sfx.add(tt, "heart", { gain: lerp(0.35, 0.22, prog(tt, K9, K10)) }); tt += lerp(0.6, 0.95, prog(tt, K9, K10)); }
sfx.add(K10 + 1.65, "whimper", { gain: 0.18, rate: 1.1, dur: 1.0, fadeOut: 0.4 });
sfx.add(C.waited - 0.1, "chime", { gain: 0.25, dur: 1.8, fadeOut: 0.7 });
sfx.add(C.waited - 0.1, "pluck", { gain: 0.22, rate: 1.1 });

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

// ===================== frame =====================
const focusOf = { n: [0, -1], p: [OFF.p, -3], b: [OFF.b, -2.5] };
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  const s = shotOf(t), pl = PLACE[s];
  for (const k of Object.keys(places)) places[k].visible = k === pl;
  lightFocus(...focusOf[pl], sunS(t));
  clockHands.min.rotation.z = -(t * 20);
  clockHands.hr.rotation.z = -(t * 1.7);
  // dogs
  const g = goldenState(t);
  golden.visible = !!g;
  if (g) golden.pose({ ...g.pose, x: OFF[g.pl] + g.x, y: g.pose.lift ?? 0, z: g.z });
  const w = whiteState(t);
  whiteDog.visible = !!w;
  if (w) whiteDog.pose({ ...w.pose, x: OFF[w.pl] + w.x, z: w.z });
  // people
  for (const [p, st] of [[owner, ownerState(t)], [owner2, owner2State(t)], [scientist, scientistState(t)]]) {
    p.visible = !!st;
    if (st) p.pose(st.pose);
  }
  // the scent ribbon: bold while he sniffs, then it fades as time goes by
  const rb = s === 8 ? 0.95 * prog(t, K8 + 0.1, K8 + 0.5) : s === 9 ? lerp(0.95, 0.1, ease.inOut(prog(t, K9 + 0.2, K10 - 0.3))) : 0;
  ribbon.visible = rb > 0.01;
  ribbon.material.opacity = rb;
  ribbon.material.map.offset.y = -t * 0.9;
  // a thought icon over his head
  thinkIcon.visible = s === 7;
  if (s === 7) { thinkIcon.position.set(0.5, 1.05 + 0.04 * Math.sin(t * 6), 2.9); thinkIcon.scale.setScalar(0.38 * ease.out(prog(t, K7 + 0.1, K7 + 0.35))); thinkIcon.material.opacity = ease.out(prog(t, K7 + 0.1, K7 + 0.35)) * (1 - prog(t, K8 - 0.1, K8)); }
  // the camera
  const c = cameraAt(t);
  camera.position.copy(c.pos);
  camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  for (const p of [owner, owner2, scientist]) p.faceCamera(camera);
  // HUD
  const f = away(t);
  setPie(f, f > 0.004 ? 1 : 0);
  setBars(t);
  drawFx(t);
  captions(t);
  dip(t);
});

window.__dbg = { scene, camera, golden, whiteDog, owner, owner2, scientist, places, CUTS, DURATION };
short.start();
