import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon, toonGradient } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Why your dog drops a slobbery toy in your lap" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// 24 shots in three outdoor places, a different smooth camera move in every shot, no on-screen text (icons and graphics only).
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
// shot starts: a hair before the first word of each new idea (24 shots, a cut every ~1.5 s, held longer on the emotional beats)
const STARTS = [
  0, 0.70, 1.70, at("when", 1) - 0.04, at("completely") - 0.1, at("and", 1) - 0.04, at("dirty") - 0.04, at("directly") - 0.04, at("probably") - 0.04,
  at("oblivious") - 0.04, at("see") - 0.06, at("dogs") - 0.04, at("heartbreak") - 0.1, at("what", 1) - 0.04, at("chewed") - 0.05, at("ultimate") - 0.04,
  at("in", 2) - 0.04, at("existence") - 0.03, at("single") - 0.03, at("prized") - 0.03, at("when", 2) - 0.04, at("they're", 3) - 0.04, at("desperately") - 0.04, at("which") - 0.04,
];
const CUTS = STARTS.slice(1);
const shotOf = (t) => { let k = 1; for (let i = 1; i < STARTS.length; i++) if (t >= STARTS[i]) k = i + 1; return k; };
const T0 = (k) => STARTS[k - 1]; // start time of shot k
const C = {
  fetch: at("fetch"), crying: at("crying"), overwhelmed: at("overwhelmed"), walk: at("walk"), drop: at("drop", 1), dirty: at("dirty"), slobbery: at("slobbery"), lap: at("lap"),
  oblivious: at("oblivious"), pain: at("pain"), emergency: at("emergency"), care: at("care"), heartbreak: at("heartbreak"), grief: at("grief"), burnout: at("burnout"),
  chewed: at("chewed"), safety: at("safety"), dopamine: at("dopamine"), comfort: at("comfort"), possession: at("possession"), hands: at("hands"), throwit: at("throw"),
  giving: at("giving"), happy: at("happy"), fix: at("fix"), hurting: at("hurting"), why: at("why"),
};
// where each shot happens: p = park, n = neighbourhood, b = back garden
const PLACE = ["p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "n", "p", "b", "p", "p", "p", "p", "p"];
const placeOf = (k) => PLACE[k - 1];

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
  put(g, W.bench({ w: 1.3 }), -2.7, 0, -2.8, 0.25);
  put(g, W.bench({ w: 1.3 }), 2.9, 0, -2.8, -0.25);
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
function burst(t0, center, n, { ch = "💚", dur = 1.3, spread = 0.5, rise = 0.9, size = 0.2, gap = 0.1, spin = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = spread * (0.35 + 0.65 * ((i * 37) % 10) / 10);
    const from = center.clone().add(V(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5));
    fxList.push({ s: emojiSprite(Array.isArray(ch) ? ch[i % ch.length] : ch), t0: t0 + i * gap, dur, from, to: from.clone().add(V(Math.cos(a) * r, rise, Math.sin(a) * r * 0.5)), size, spin: spin ? (i % 2 ? 1 : -1) * spin : 0 });
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
    if (f.spin) f.s.material.rotation = f.spin * u;
  }
}

// ===================== cast =====================
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
scene.add(owner);
const toonDog = (colors, key, scale, extra) => {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d);
  return d;
};
const golden = toonDog(DOG_COLORS.golden, "g", 0.7);

// ---------- the chewed, slobbery, muddy plush bunny (his most prized possession) ----------
function chewedToy() {
  const g = new THREE.Group();
  const sph = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat ?? toon(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  const cap = (r, h, c, x, y, z, rz = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, h, 4, 10), toon(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  sph(0.085, 0xd9b3f0, 0, 0, 0, 1, 1.15, 0.9);                       // body
  sph(0.055, 0xf4e6fb, 0, -0.012, 0.062, 1, 1.1, 0.5);               // belly
  sph(0.078, 0xd9b3f0, 0, 0.128, 0.0);                                // head
  cap(0.024, 0.1, 0xd9b3f0, -0.04, 0.24, 0, 0.12);                    // left ear (fine)
  cap(0.024, 0.05, 0xd9b3f0, 0.075, 0.215, 0, -1.0);                  // right ear: chewed short and bent
  sph(0.03, 0xffffff, 0.1, 0.205, 0, 1.4, 0.8, 1);                    // stuffing puffing out of it
  sph(0.022, 0xffffff, 0.115, 0.22, 0.01);
  sph(0.012, 0x23201f, -0.032, 0.14, 0.07);                           // one button eye...
  for (const rz of [0.8, -0.8]) { const x = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.006, 0.006), toon(0x23201f)); x.position.set(0.034, 0.14, 0.072); x.rotation.z = rz; g.add(x); } // ...and a stitched-on X
  sph(0.012, 0xff9ab5, 0, 0.118, 0.075);                              // nose
  const gash = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.007, 0.006), toon(0x4a2f3a)); gash.position.set(0.02, -0.01, 0.088); gash.rotation.z = -0.5; g.add(gash); // a torn seam
  for (const [x, y, z] of [[0.03, -0.012, 0.09], [0.045, -0.025, 0.085], [0.015, 0.002, 0.092]]) sph(0.014, 0xffffff, x, y, z); // stuffing
  for (const [x, y, z, s] of [[-0.05, -0.02, 0.06, 1], [0.06, 0.04, 0.05, 0.8], [-0.02, -0.07, 0.04, 0.9]]) sph(0.02 * s, 0x8a6a4a, x, y, z, 1, 0.5, 0.4); // mud
  const drool = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.85 });
  for (const [x, y, z, s] of [[-0.02, -0.09, 0.05, 1], [0.03, -0.12, 0.045, 0.8]]) { sph(0.012 * s, 0, x, y, z, 1, 1.4, 1, drool); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05 * s, 5), drool); st.position.set(x, y + 0.03 * s, z); g.add(st); }
  g.traverse((o) => (o.castShadow = true));
  outline(g, { width: 0.005, min: 0.02 });
  return g;
}
const toy = chewedToy();
scene.add(toy);

// ---------- icon helpers: thought bubbles, rays, a pedestal with a crown, tears, a siren ----------
function bubbleSprite(emoji) {
  const c = document.createElement("canvas");
  c.width = 200; c.height = 180;
  const x = c.getContext("2d");
  x.lineWidth = 9; x.strokeStyle = "#2b1b16"; x.fillStyle = "#fff";
  x.beginPath(); x.ellipse(100, 76, 86, 62, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  for (const [cx, cy, r] of [[56, 148, 14], [34, 170, 8]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.stroke(); }
  x.font = "84px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, 100, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8; s.visible = false;
  scene.add(s);
  return s;
}
const raysSprite = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.translate(128, 128);
  for (let i = 0; i < 14; i++) { x.rotate((Math.PI * 2) / 14); const g = x.createLinearGradient(0, 0, 0, -124); g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(-9, 0); x.lineTo(9, 0); x.lineTo(3, -124); x.lineTo(-3, -124); x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: 0xffd34e, transparent: true, depthWrite: false, depthTest: true, opacity: 0 }));
  s.renderOrder = 4; s.visible = false;
  scene.add(s);
  return s;
})();
const tearTex = (() => {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 96;
  const x = c.getContext("2d");
  x.fillStyle = "#7cc8ff"; x.strokeStyle = "#2b1b16"; x.lineWidth = 6;
  x.beginPath(); x.moveTo(32, 8); x.bezierCurveTo(60, 48, 58, 84, 32, 88); x.bezierCurveTo(6, 84, 4, 48, 32, 8); x.fill(); x.stroke();
  x.fillStyle = "rgba(255,255,255,0.85)"; x.beginPath(); x.ellipse(24, 62, 6, 12, 0.3, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const tears = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tearTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 9; s.visible = false; scene.add(s); return s; });
const pedestal = (() => {
  const g = new THREE.Group();
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 20), toon(0xf4efe6)); col.position.y = 0.275; g.add(col);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 24), toon(0xffd34e)); top.position.y = 0.58; g.add(top);
  const crown = new THREE.Group(); crown.position.y = 0.0;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 18, 1, true), toon(0xffc72c)); ring.material = ring.material.clone(); ring.material.side = THREE.DoubleSide; crown.add(ring);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), toon(0xffc72c)); sp.position.set(Math.sin(a) * 0.1, 0.06, Math.cos(a) * 0.1); crown.add(sp); const jw = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), toon([0xff5c8a, 0x4fb3ff, 0x6fe08a][i % 3])); jw.position.set(Math.sin(a) * 0.1, 0.1, Math.cos(a) * 0.1); crown.add(jw); }
  g.add(crown); g.userData.crown = crown;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1.9; beam.rotation.x = Math.PI; beam.userData.ink = false; g.add(beam);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.visible = false;
  scene.add(g);
  return g;
})();
// a doctor's cap with a red cross and a spinning siren, worn by the dog in "emergency care"
const doctor = (() => {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.06, 18), toon(0xffffff)); cap.position.set(0, 0.32, 0.02); g.add(cap);
  for (const [w, h] of [[0.09, 0.025], [0.025, 0.09]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.01), toon(0xe6303e)); c.position.set(0, 0.325, 0.2); c.rotation.x = -0.3; g.add(c); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.07, 12), new THREE.MeshToonMaterial({ color: 0xff3b4e, gradientMap: toonGradient(), emissive: 0xff1c30, emissiveIntensity: 0.8 })); lamp.position.set(0, 0.4, 0.02); g.add(lamp);
  const beams = new THREE.Group(); beams.position.set(0, 0.4, 0.02);
  for (const [rot, col] of [[0, 0xff3b4e], [Math.PI, 0x3b82ff]]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, 0.9, -0.28, 0.28, false); sh.lineTo(0, 0); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide })); m.rotation.y = rot; beams.add(m); }
  g.add(beams); g.userData = { lamp, beams };
  g.traverse((o) => (o.userData.ink = false));
  g.visible = false;
  golden.head.add(g);
  return g;
})();

// ===================== the story =====================
const SEAT = 0.46;
const BX = -2.7, BZ = -2.5;                       // you, on the park bench (park coordinates)
const OWN = V(OFF.p + BX, 0, BZ);
const LAP = V(OFF.p + BX, 0.6, BZ + 0.15);
const PLAZA_TOY = V(OFF.p - 0.5, 0.07, -1.8);     // where the toy lies in the "ultimate comfort" shots
const WS = (2 * Math.PI * Math.round((12.2 * DURATION) / (2 * Math.PI))) / DURATION; // loop-safe wag speed
const P = (pl, x, y, z) => V(OFF[pl] + x, y, z);
const bump = (u) => Math.sin(Math.PI * clamp01(u));
const DS = { x: BX + 0.95, z: BZ + 0.25, ry: -1.83 };   // where he stands beside you (never between you and the lens)
const OPEN = { dog: { x: -1.0, z: -0.9 }, cam: { pos: P("p", -0.95, 0.62, 1.0), look: P("p", -0.95, 0.5, -0.9), fov: 42 } };

// ---------- the toy: in his mouth, flying, on your lap, in your hands, on the ground ----------
const T = { drop1: T0(2) + 0.55, lap1: T0(2) + 0.85, takeBack: T0(3) + 0.9, drop2: T0(8) + 0.38, hands: T0(21) + 0.7 };
function toyState(t) {
  const k = shotOf(t);
  const mouth = { mode: "mouth" };
  if (t < T.drop1) return mouth;
  if (t < T.lap1) { const u = ease.inOut((t - T.drop1) / (T.lap1 - T.drop1)); return { mode: "world", pos: V(OWN.x + 0.5, 0.5, OWN.z + 0.2).lerp(LAP, u).add(V(0, 0.35 * bump(u), 0)), rot: u * 5, s: 1 }; }
  if (t < T.takeBack) { // on your lap; then lifted as if to throw, and pushed back down
    const u = prog(t, T0(3) + 0.15, T0(3) + 0.5), d = prog(t, T0(3) + 0.55, T.takeBack);
    const up = V(OWN.x + 0.3, 1.25, OWN.z + 0.25);
    return { mode: "world", pos: LAP.clone().lerp(up, ease.inOut(u) * (1 - ease.inOut(d))), rot: 0.4 * u, s: 1 };
  }
  if (k <= 5) return mouth;                                       // he took it back and wandered off
  if (k >= 6 && k <= 7) return mouth;                             // carrying it over to you
  if (k === 8) { if (t < T.drop2) return mouth; const u = ease.inOut(prog(t, T.drop2, T.drop2 + 0.45)); return { mode: "world", pos: V(OWN.x + 0.5, 0.5, OWN.z + 0.2).lerp(LAP, u).add(V(0, 0.4 * bump(u), 0)), rot: u * 6, s: 1 }; }
  if (k >= 9 && k <= 13) return { mode: "world", pos: LAP.clone(), rot: 0, s: 1 };
  if (k === 14 || k === 15) return { mode: "world", pos: k === 14 ? PLAZA_TOY.clone().add(V(0, 0.06, 0)) : PLAZA_TOY.clone().add(V(0, 0.28 + 0.05 * Math.sin(t * 3), 0)), rot: k === 15 ? lerp(0.2, 1.4, ease.inOut(prog(t, T0(15), T0(16)))) + 0.35 * Math.sin(t * 3) : 0, s: k === 15 ? 1.4 : 1.15 };
  if (k === 16) return { mode: "world", pos: PLAZA_TOY.clone().add(V(0.15, 0.1, 0.05)), rot: 0, s: 1 };
  if (k === 17) return { mode: "world", pos: P("n", 0.05, 0.14, 0.05), rot: 0, s: 1 };
  if (k === 18) return mouth;
  if (k === 19) return { mode: "world", pos: P("b", 0.2, 0.1, -2.3), rot: 0, s: 1 };
  if (k === 20) return { mode: "world", pos: P("p", PLAZA_TOY.x - OFF.p, 0.97 + 0.04 * Math.sin(t * 3), PLAZA_TOY.z), rot: t * 0.9, s: 1.25 };
  if (k === 21) { if (t < T.hands) return mouth; const u = ease.inOut(prog(t, T.hands, T.hands + 0.5)); return { mode: "world", pos: V(OWN.x + 0.5, 0.5, OWN.z + 0.2).lerp(LAP.clone().add(V(0, 0.05, 0.1)), u).add(V(0, 0.3 * bump(u), 0)), rot: u * 5, s: 1 }; }
  if (k === 22) return { mode: "world", pos: LAP.clone().add(V(0, 0.05 + 0.03 * Math.sin(t * 4), 0.1)), rot: 0, s: 1 };
  if (k === 23) { const u = ease.inOut(prog(t, T0(23) + 0.9, T0(23) + 1.7)); return { mode: "world", pos: LAP.clone().add(V(0, 0.05, 0.1)).lerp(V(OWN.x, 0.98, OWN.z + 0.2), u), rot: 0, s: 1 + 0.3 * u }; }
  return mouth;
}

// ---------- you: crying, slumped, then smiling ----------
const rigX = (oWorld, cam, w) => { const th = Math.atan2(cam.x - oWorld.x, cam.z - oWorld.z); return (w.x - oWorld.x) * Math.cos(th) - (w.z - oWorld.z) * Math.sin(th); }; // world point -> the flat person's own sideways axis
function ownerPose(t) {
  const k = shotOf(t), sob = Math.sin(t * 13);
  const base = { t, x: OWN.x, z: OWN.z, sit: 1, seat: SEAT, cute: 0.3, flip: 1 };
  const sad = { eyes: { open: 0.5 }, brow: { worry: 1 }, mouth: { open: 0.22 + 0.1 * sob, smile: -0.8 }, head: { tilt: 0.04 * sob, lift: -0.03 }, lean: 0.12, tear: 0.5 };
  const lapArms = { armL: { to: [-0.17, SEAT + 0.08], bend: -1 }, armR: { to: [0.17, SEAT + 0.08], bend: 1 } };
  const wipe = { armR: { to: [0.1 + 0.03 * Math.sin(t * 6), 1.36 + 0.03 * Math.sin(t * 6)], bend: 1 }, armL: { to: [-0.17, SEAT + 0.08], bend: -1 } };
  if (k <= 2) return { ...base, ...sad, ...wipe };
  if (k === 3) { // you reach for the toy as if to throw it; he pushes your hand down
    const u = prog(t, T0(3) + 0.15, T0(3) + 0.5), d = prog(t, T0(3) + 0.55, T.takeBack);
    const h = ease.inOut(u) * (1 - ease.inOut(d));
    return { ...base, ...sad, armL: lapArms.armL, armR: { to: [lerp(0.17, 0.4, h), lerp(SEAT + 0.08, 1.42, h)], bend: 1 } };
  }
  if (k === 4) return { ...base, ...sad, mouth: { open: 0.3 + 0.12 * sob, smile: -0.9 }, eyes: { open: 0.4 }, lean: 0.1, ...wipe };
  if (k === 5) { const w = prog(t, T0(5), T0(5) + 0.9); return { ...base, ...sad, lean: 0.12 + 0.12 * w, head: { tilt: 0.04 * sob, lift: -0.03 - 0.05 * w }, ...lapArms }; } // the pile weighs you down
  if (k >= 6 && k <= 8) return { ...base, ...sad, mouth: { open: 0.1 + 0.06 * sob, smile: -0.5 }, ...wipe };
  if (k === 9) return { ...base, cute: 0.2, eyes: { open: 0.65 }, brow: { worry: 0.3 }, mouth: { open: 0, smile: -0.1 }, look: [-0.8, 0.3], head: { turn: -0.4 }, lean: 0.06, ...lapArms };  // a flat, unimpressed look at him
  if (k >= 10 && k <= 13) return { ...base, cute: 0.4, eyes: { open: 0.7 }, brow: { worry: 0.25 }, mouth: { open: 0, smile: -0.05 + 0.1 * (k === 11 ? 3 : 0) }, look: [-0.7, 0.2], head: { turn: -0.3 }, lean: 0.04, ...lapArms };
  if (k >= 14 && k <= 20) return { ...base, ...sad, mouth: { open: 0.06, smile: -0.4 }, lean: 0.08, ...lapArms };
  if (k === 21) { // you cup your hands for the toy, then start to wind up to throw
    const cup = ease.inOut(prog(t, T0(21), T0(21) + 0.5)), wind = ease.inOut(prog(t, at("aren't"), at("aren't") + 0.4)) * (1 - ease.inOut(prog(t, at("throw") + 0.1, at("throw") + 0.4)));
    return { ...base, cute: 0.4, ...sad, mouth: { open: 0.05, smile: -0.3 }, tear: 0.2, armR: { to: [lerp(0.17, 0.12, cup) + 0.25 * wind, lerp(SEAT + 0.08, SEAT + 0.3, cup) + 0.9 * wind], bend: 1 }, armL: { to: [lerp(-0.17, -0.1, cup), lerp(SEAT + 0.08, SEAT + 0.3, cup)], bend: -1 } };
  }
  if (k === 22) return { ...base, ...sad, brow: { worry: 0.6 }, eyes: { open: 0.8 }, mouth: { open: 0.04, smile: 0.0 }, tear: 0.3, lean: 0.05, armR: { to: [0.1, SEAT + 0.3], bend: 1 }, armL: { to: [-0.1, SEAT + 0.3], bend: -1 } };
  const sm = ease.inOut(prog(t, T0(23) + 0.7, T0(23) + 1.6)); // the clouds part and you smile
  return { ...base, cute: 0.6, eyes: { open: lerp(0.8, 1, sm), happy: sm > 0.7 ? 1 : 0 }, brow: { worry: lerp(0.5, 0, sm), raise: 0.2 * sm }, mouth: { open: 0.2 * sm, smile: lerp(-0.1, 0.9, sm) }, lean: 0.04, head: { tilt: 0.05 * sm }, tear: 0.0, armR: { to: [0.1, 0.9 * sm + (SEAT + 0.3) * (1 - sm)], bend: 1 }, armL: { to: [-0.1, 0.9 * sm + (SEAT + 0.3) * (1 - sm)], bend: -1 } };
}

// ---------- the golden dog ----------
function goldenState(t) {
  const k = shotOf(t), u = t - T0(k), base = { t, wagSpeed: WS, cute: 1, tailLean: 0 };
  switch (k) {
    case 1: { // frame 1: he holds the toy out to the lens, then spins and bolts to you
      const turn = ease.inOut(prog(u, 0.08, 0.28)), go = ease.inOut(prog(u, 0.22, 0.66));
      return { pl: "p", x: lerp(OPEN.dog.x, DS.x, go), z: lerp(OPEN.dog.z, DS.z, go), pose: { ...base, ry: lerp(0, -2.63, turn), run: prog(u, 0.22, 0.32) * (1 - prog(u, 0.58, 0.68)), wag: 0.8, headPitch: -0.05, headTilt: 0.14 * (1 - turn), ears: 0.4, sad: 0.15 } };
    }
    case 2: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: lerp(-2.63, DS.ry, ease.inOut(prog(u, 0, 0.3))), walk: 1 - prog(u, 0.15, 0.3), wag: 0.7, headPitch: 0.5 * bump(prog(u, 0.38, 0.62)), ears: 0.3, sad: 0.3 } };
    case 3: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, wag: 0.7, headPitch: 0.1 + 0.25 * bump(prog(u, 0.5, 0.85)), paw: bump(prog(u, 0.4, 0.75)), ears: 0.3, sad: 0.3 } };
    case 4: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, sit: 1, wag: 0.3, headTilt: 0.2, ears: 0.1, sad: 0.5 } };
    case 5: return { pl: "p", x: lerp(DS.x, -0.6, ease.inOut(u / 1.35)), z: lerp(DS.z, -5.5, ease.inOut(u / 1.35)), pose: { ...base, ry: -2.9, walk: 1, wag: 0.3, headPitch: 0.1, ears: 0.1 } };
    case 6: { const e = ease.inOut(u / (T0(7) - T0(6))); return { pl: "p", x: lerp(-1.0, DS.x, e), z: lerp(-5.4, DS.z, e), pose: { ...base, ry: -0.3, run: 0.55 * (1 - prog(u, 0.9, 1.2)), wag: 0.6, headPitch: 0.08, ears: 0.2, sad: 0.2 } }; }
    case 7: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, wag: 0.5, headPitch: 0.1 + 0.07 * Math.sin(u * 6), ears: 0.2, sad: 0.2, mouth: 0.1 } };
    case 8: { const dip = bump(prog(u, 0.15, 0.5)); return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, wag: 0.5, headPitch: 0.45 * dip, ears: 0.2, sad: 0.3, sit: prog(u, 0.7, 1.1) * 0.8 } }; }
    case 9: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, sit: 1, wag: 0.5, headTilt: 0.2, mouth: 0.2, ears: 0.5 } };
    case 10: return { pl: "p", x: DS.x, z: DS.z + 0.05, pose: { ...base, ry: 0.35, sit: 1, wag: 0.9, wagSpeed: 11, headTilt: 0.32 * Math.sin(u * 2.2 + 1), mouth: 0.4, ears: 0.6, headPitch: -0.05 } };
    case 11: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: 0.2, wag: 0.9, wagSpeed: 13, headPitch: -0.1, mouth: 0.25, ears: 0.55 } };
    case 12: return { pl: "p", x: -1.3, z: -1.3, pose: { ...base, ry: -0.2, sit: 1, wag: 0.15, headTilt: 0.4 * Math.sin(u * 2.4) * ease.out(prog(u, 0, 0.5)), headPitch: -0.05, ears: 0.55, mouth: 0 } };
    case 13: return { pl: "p", x: -1.3, z: -1.3, pose: { ...base, ry: -0.2, sit: 1, wag: 0.15, headTilt: 0.4 * (Math.floor(u / 0.55) % 2 ? -1 : 1) * bump(prog((u % 0.55), 0, 0.55)) + 0.1, headPitch: -0.05, ears: 0.5 } };
    case 16: { const roll = ease.inOut(prog(u, 0.25, 0.9)); return { pl: "p", x: PLAZA_TOY.x - OFF.p, z: PLAZA_TOY.z + 0.1, pose: { ...base, ry: 0.5, side: roll, sideFlip: 1, wag: 0.8, wagSpeed: 14, closed: 0.9 * roll, mouth: 0.3, ears: 0.3, headPitch: 0.1 } }; }
    case 17: return { pl: "n", x: 0.0, z: 0.1, pose: { ...base, ry: 1.2, lie: 1, wag: 0.1, wagSpeed: 5, headPitch: 0.5, closed: 0.9, ears: 0.1 } };
    case 18: { const e = u / (T0(19) - T0(18)); return { pl: "p", x: 0.2, z: lerp(-7.0, -2.0, e), pose: { ...base, ry: 0, run: 1, wag: 0.9, wagSpeed: 20, ears: 0.6, mouth: 0.1 } }; }
    case 19: return { pl: "b", x: 0.2, z: -2.7, pose: { ...base, ry: 0, wag: 0.1, snarl: 0.35, angry: 0.5, ears: -0.7, headPitch: 0.25, cute: 0.6, shiver: 0.15 } };
    case 20: return { pl: "p", x: PLAZA_TOY.x - OFF.p + 0.9, z: PLAZA_TOY.z + 0.3, pose: { ...base, ry: -1.9, sit: 1, wag: 0.7, headPitch: -0.5, headTilt: 0.15, ears: 0.5, closed: 0 } };
    case 21: { const dip = bump(prog(u, 0.5, 0.95)); return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, wag: 0.5, headPitch: 0.45 * dip + 0.15 * bump(prog(t, at("aren't") + 0.2, at("aren't") + 0.7)), paw: bump(prog(t, at("throw") - 0.2, at("throw") + 0.3)), sad: 0.3, ears: 0.3 } }; }
    case 22: return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, sit: 1, wag: 0.5, headTilt: 0.12, ears: 0.4, closed: 0.1, mouth: 0.1, sad: 0.2 } };
    case 23: { const sm = prog(u, 0.7, 1.6); return { pl: "p", x: DS.x, z: DS.z, pose: { ...base, ry: DS.ry, sit: 1, wag: lerp(0.4, 0.95, sm), wagSpeed: lerp(WS, 16, sm), mouth: 0.3 * sm, ears: 0.5, headPitch: -0.1 } }; }
    case 24: return { pl: "p", x: OPEN.dog.x, z: OPEN.dog.z, pose: { ...base, ry: 0, wag: 0.8, headPitch: -0.05, headTilt: 0.14, ears: 0.4, sad: 0.15 } };
    default: return null; // 14, 15: just the toy
  }
}

// ---------- cameras ----------
const mix3 = (a, b, k) => a.clone().lerp(b, k);
const orb = (c, r, a, h) => V(c.x + r * Math.sin(a), c.y + h, c.z + r * Math.cos(a));
function cameraAt(t) {
  const k = shotOf(t), u = t - T0(k), len = T0(k + 1 <= 24 ? k + 1 : 24) - T0(k) || 1, e = ease.inOut(clamp01(u / len));
  const bench = P("p", BX, 0.9, BZ);
  switch (k) {
    case 1: return { pos: mix3(OPEN.cam.pos, P("p", -0.3, 1.0, 1.4), ease.inOut(prog(u, 0.05, 0.7))), look: mix3(OPEN.cam.look, P("p", -1.7, 0.55, -1.8), ease.inOut(prog(u, 0.05, 0.7))), fov: lerp(42, 58, ease.inOut(prog(u, 0.05, 0.7))) };
    case 2: return { pos: P("p", lerp(-2.7, -2.1, e), lerp(0.7, 0.9, e), 0.6), look: P("p", -2.3, 0.75, -2.3), fov: 52 };
    case 3: return { pos: orb(P("p", -2.3, 0.85, -2.3), 3.0, lerp(-0.75, -0.3, e), 0.3), look: P("p", -2.3, 0.85, -2.3), fov: 52 };
    case 4: return { pos: P("p", lerp(-3.5, -3.1, e), 1.15, lerp(-0.5, -0.9, e)), look: P("p", BX, 1.2, BZ), fov: lerp(44, 38, e) };
    case 5: return { pos: P("p", lerp(-3.1, -2.3, e), lerp(1.3, 3.0, e), lerp(-0.4, 1.3, e)), look: P("p", BX, lerp(1.0, 0.7, e), BZ), fov: lerp(46, 58, e) };
    case 6: return { pos: P("p", lerp(-1.7, -0.2, e), lerp(0.55, 0.75, e), lerp(-3.1, -0.8, e)), look: P("p", lerp(-1.0, -2.0, e), 0.5, lerp(-4.8, -2.4, e)), fov: 56 };
    case 7: return { pos: orb(P("p", -2.3, 0.35, -2.35), lerp(1.8, 1.0, e), lerp(-0.1, -0.8, e), lerp(0.2, 0.08, e)), look: P("p", -2.3, 0.33, -2.4), fov: lerp(56, 44, e) };
    case 8: return { pos: P("p", lerp(-2.6, -2.1, e), lerp(0.6, 0.75, e), lerp(0.5, 0.3, e)), look: P("p", -2.3, 0.7, -2.3), fov: lerp(52, 46, e) };
    case 9: return { pos: P("p", lerp(-1.9, -2.0, e), 1.0, lerp(0.9, 0.5, e)), look: P("p", -2.05, 0.85, -2.3), fov: lerp(48, 42, e) };
    case 10: return { pos: P("p", lerp(-1.2, -1.6, e), 0.55, lerp(0.3, -0.1, e)), look: P("p", -1.8, 0.5, -2.2), fov: lerp(46, 38, e) };
    case 11: { const sw = ease.out(prog(u, 0, 0.4)); return { pos: orb(P("p", -1.8, 0.55, -2.25), lerp(2.7, 1.8, e), lerp(1.1, -0.6, ease.inOut(prog(u, 0, 1))), lerp(0.4, 0.5, e)), look: P("p", -1.85, 0.55, -2.25), fov: lerp(66, 46, sw) }; }
    case 12: return { pos: orb(P("p", -1.3, 0.38, -1.3), lerp(2.6, 2.0, e), lerp(0.15, -0.1, e), 0.35), look: P("p", -1.3, 0.42, -1.3), fov: 44 };
    case 13: { const q = Math.floor(u / 0.57), a = [0.35, -0.4, 0.05][q % 3]; return { pos: orb(P("p", -1.3, 0.45, -1.3), 2.7 - 0.15 * (q % 3), a, 0.4), look: P("p", -1.3, 0.72, -1.3), fov: 44 + 4 * bump(prog(u - q * 0.57, 0, 0.5)) }; }
    case 14: return { pos: P("p", lerp(-0.2, -0.5, e), lerp(0.9, 0.35, e), lerp(1.6, 0.1, e)), look: P("p", -0.5, 0.2, -1.8), fov: lerp(58, 48, e) };
    case 15: return { pos: orb(P("p", -0.5, 0.3, -1.8), lerp(2.5, 2.0, e), lerp(0.2, 1.4, e), lerp(0.6, 0.35, e)), look: P("p", -0.5, 0.36, -1.8), fov: 46 };
    case 16: return { pos: orb(P("p", -0.5, 0.3, -1.8), lerp(3.4, 2.8, e), lerp(0.0, 0.7, e), lerp(1.0, 0.7, e)), look: P("p", -0.4, 0.25, -1.8), fov: 54 };
    case 17: return { pos: P("n", lerp(-2.4, -1.8, e), lerp(0.7, 0.55, e), lerp(2.3, 1.9, e)), look: P("n", 0.0, 0.2, 0.1), fov: 44 };
    case 18: return { pos: P("p", lerp(-0.7, -0.2, e), 0.4, lerp(-0.2, 0.5, e)), look: P("p", 0.2, 0.4, lerp(-6.0, -2.0, e)), fov: 52 };
    case 19: return { pos: orb(P("b", 0.2, 0.4, -2.5), 1.6, lerp(0.6, -0.6, e), 0.2), look: P("b", 0.2, 0.3, -2.5), fov: 48 };
    case 20: return { pos: orb(P("p", -0.5, 0.75, -1.8), lerp(3.4, 2.4, e), lerp(0.6, -0.3, e), lerp(0.0, 0.1, e)), look: P("p", -0.5, 0.85, -1.8), fov: 48 };
    case 21: return { pos: P("p", lerp(-2.0, -2.5, e), lerp(0.7, 1.0, e), lerp(0.6, 0.1, e)), look: P("p", -2.25, 0.8, -2.3), fov: lerp(50, 42, e) };
    case 22: return { pos: orb(P("p", -2.3, 0.8, -2.3), lerp(3.1, 2.5, e), lerp(-0.45, -0.1, e), 0.25), look: P("p", -2.3, 0.8, -2.3), fov: 48 };
    case 23: return { pos: P("p", lerp(-2.4, -0.6, e), lerp(1.0, 3.4, e), lerp(0.6, 3.0, e)), look: P("p", -2.3, lerp(1.0, 1.5, e), -2.4), fov: lerp(46, 58, e) };
    default: { const q = ease.soft(prog(u, 0, 0.7)); return { pos: mix3(P("p", -0.5, 0.9, 0.8), OPEN.cam.pos, q), look: mix3(P("p", -1.8, 0.5, -1.5), OPEN.cam.look, q), fov: lerp(52, 44, q) }; }
  }
}

// ===================== effects =====================
const heartIcon = (ch) => emojiSprite(ch);
const cloudIcon = emojiSprite("🌧️"), sunIcon = emojiSprite("☀️"), rainbowIcon = emojiSprite("🌈"), bandage = emojiSprite("🩹"), crossIcon = emojiSprite("🚑"), noThrow = emojiSprite("❌"), ballIcon = emojiSprite("🎾");
const zzz = emojiSprite("💤"), butterfly = emojiSprite("🦋"), questionIcon = emojiSprite("❓");
const BUB = { heart: bubbleSprite("💔"), grief: bubbleSprite("🥀"), burn: bubbleSprite("🔥"), clueless: bubbleSprite("🐶"), safety: bubbleSprite("🛡️"), joy: bubbleSprite("🤩"), cozy: bubbleSprite("🤗") };
// paper, bills and parcels pile onto you ("completely overwhelmed")
burst(T0(5) + 0.05, V(OWN.x, 2.9, OWN.z + 0.1), 16, { ch: ["📄", "✉️", "🧾", "📦", "📚"], spread: 0.5, rise: -2.0, size: 0.3, gap: 0.075, dur: 0.85, spin: 4 });
for (const [tt, n] of [[T.lap1 - 0.02, 4], [T.drop2 + 0.4, 5]]) burst(tt, V(LAP.x, LAP.y + 0.05, LAP.z), n, { ch: ["💧"], spread: 0.25, rise: 0.3, size: 0.12, gap: 0.04, dur: 0.5 }); // slobber splat
for (let i = 0; i < 6; i++) travel(T0(6) + 0.15 + i * 0.18, V(-1.0 + OFF.p, 0.55, -3.4), V(-1.1 + OFF.p, 0.95, -3.0), "💨", { dur: 0.6, size: 0.22, arc: 0.1 }); // the smell of it
burst(T0(23) + 0.9, V(OWN.x + 0.2, 1.6, OWN.z + 0.3), 12, { ch: ["💗", "❤️", "💛", "✨"], spread: 1.1, rise: 1.0, size: 0.28, gap: 0.09, spin: 0.6 });
burst(T0(16) + 0.4, PLAZA_TOY.clone().add(V(0, 0.3, 0)), 8, { ch: ["✨", "💖"], spread: 0.8, rise: 0.9, size: 0.24, gap: 0.1 });
burst(T0(15) + 0.1, PLAZA_TOY.clone().add(V(0, 0.4, 0)), 10, { ch: ["✨"], spread: 0.7, rise: 0.5, size: 0.22, gap: 0.1 });
burst(T0(22) + 0.2, V(OWN.x + 0.9, 0.9, OWN.z + 0.6), 10, { ch: ["💛", "✨"], spread: 0.5, rise: 0.7, size: 0.2, gap: 0.2 }); // the happiness he is giving away
burst(T0(20) + 0.3, V(OFF.p + PLAZA_TOY.x - OFF.p, 1.2, PLAZA_TOY.z), 8, { ch: ["💎", "✨"], spread: 0.7, rise: 0.4, size: 0.2, gap: 0.08 });

// ===================== sound design: real recordings only (see sfx/CREDITS.md), no beds of noise, no wind =====================
// Every sound is a clean, de-noised cut of a real recording (tools/forge-comfort-sfx.py). They are placed one by one on the action:
// paws on the paving, the squeaky bunny, the wet drop in your lap, tears, a shaky breath, a real bell for every icon that pops,
// the dog's own voice (a whimper, a woof, a snore). The only sustained sound is a song thrush, one phrase at a time, so the
// park never sounds empty and never sounds noisy. The soundtrack ducks a little under the voice (see tools/mix.mjs).
const sfx = createSfx(short, { mix: { gain: 1.5, duck: { depth: 0.3, attack: 0.012, release: 0.28, threshold: -42 } } });
const OWNp = -0.22, DOGp = 0.26;                                   // you sit on the left of the frame, he stands on the right
const wob = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);  // repeatable little pitch/level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
const paws = (t0, n, dt, g0, g1 = g0, pan = DOGp) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `paw_${(i % 4) + 1}`, lerp(g0, g1, n > 1 ? i / (n - 1) : 0) * wob(i, 0.18), { pan, rate: wob(i, 0.04) }); };
const drip = (t, g = 0.4, i = 0, pan = OWNp) => snd(t, `drip_${(i % 3) + 1}`, g, { pan, rate: wob(i, 0.06) });
const pops = (t, i, g = 0.5, pan = 0) => snd(t, `pop_${(i % 3) + 1}`, g, { pan });

// -- the thrush: single phrases, sparse and quiet while you are sad, fuller when the clouds part
for (const [tt, nm, g, pan] of [[0.06, "thrush_c", 0.2, 0.4], [3.9, "thrush_a", 0.1, -0.5], [8.4, "thrush_d", 0.1, 0.5], [12.6, "thrush_a", 0.1, -0.4], [17.5, "thrush_b", 0.16, 0.45],
  [21.4, "thrush_d", 0.14, -0.4], [T0(17) + 0.12, "thrush_a", 0.14, 0.3], [T0(19) + 0.1, "thrush_d", 0.14, -0.3], [T0(21) + 1.2, "thrush_a", 0.1, 0.4], [T0(22) + 1.5, "thrush_d", 0.1, -0.4],
  [T0(23) + 1.0, "thrush_b", 0.3, 0.45], [T0(23) + 2.0, "thrush_c", 0.26, -0.5], [T0(23) + 2.35, "thrush_a", 0.24, 0.5], [T0(24) + 0.05, "thrush_d", 0.2, 0.3]]) snd(tt, nm, g, { pan });

// -- 1 · the hook: the bunny squeaks as he holds it out to the lens, then he bolts
snd(0.02, "squeak_1", 0.5);
paws(0.2, 8, 0.065, 0.3, 0.5);
// -- 2/3 · he drops it in your lap (wet plop, squeak, drips) and you cannot throw it: he pushes your hand down
paws(T0(2) + 0.12, 3, 0.1, 0.3, 0.16);
snd(T0(2) + 0.25, "gasp", 0.3, { pan: OWNp });
snd(T.drop1 + 0.28, "thump", 0.65, { pan: -0.05 });
snd(T.drop1 + 0.28, "splat_1", 0.55, { pan: -0.05 });
snd(T.drop1 + 0.3, "squeak_2", 0.45, { pan: -0.05 });
[0.3, 0.6, 0.85].forEach((d, i) => drip(T.lap1 + d, 0.4, i, -0.05));
snd(T.lap1 + 0.1, "sniffle_1", 0.4, { pan: OWNp });
snd(T0(3) + 0.36, "snap", 0.55); pops(T0(3) + 0.36, 1, 0.35);
snd(T0(3) + 0.62, "thump", 0.3, { pan: 0.1, rate: 1.2 });
snd(T0(3) + 0.72, "whimper_a", 0.4, { pan: DOGp });
// -- 4/5 · crying, then the pile of papers and parcels
for (let tt = T0(4) + 0.08, i = 0; tt < T0(6) - 0.1; tt += 0.46 + 0.14 * Math.sin(i * 1.9), i++) drip(tt, 0.32 + 0.1 * wob(i, 0.5), i);
snd(T0(4) + 0.3, "sniffle_2", 0.4, { pan: OWNp });
snd(T0(4) + 0.65, "gasp", 0.35, { pan: OWNp });
snd(T0(5) + 0.1, "paper_pile", 0.5);
[0.55, 0.7, 0.88, 1.0, 1.12, 1.28].forEach((d, i) => snd(T0(5) + d, i % 2 ? "pad_step" : "thump", 0.3 + 0.07 * (i % 3), { pan: OWNp * 0.4, rate: 0.95 + 0.05 * (i % 3) }));
snd(T0(5) + 1.0, "breath_out", 0.5, { pan: OWNp });
paws(T0(5) + 0.3, 4, 0.3, 0.2, 0.12);
snd(T0(5) + 0.5, "whimper_c", 0.32, { pan: DOGp });
// -- 6 · he trots back with the toy, squeaking at every few steps
paws(T0(6), 8, 0.15, 0.25, 0.55);
[0.3, 0.75, 1.05].forEach((d, i) => snd(T0(6) + d, `squeak_${(i % 3) + 1}`, 0.3 + 0.05 * i, { pan: 0.05 * i }));
// -- 7/8 · the dirty, slobbery toy, close up, then dropped "directly into your lap"
drip(C.dirty + 0.15, 0.4, 0, DOGp * 0.4); drip(C.dirty + 0.55, 0.36, 1, DOGp * 0.4);
snd(C.slobbery + 0.05, "splat_2", 0.5, { pan: 0 });
snd(C.slobbery + 0.5, "squeak_1", 0.3, { pan: 0 });
drip(C.slobbery + 0.95, 0.3, 2, DOGp * 0.4);
snd(T.drop2 + 0.4, "thump", 0.65, { pan: -0.05 });
snd(T.drop2 + 0.38, "splat_3", 0.5, { pan: -0.05 });
snd(T.drop2 + 0.4, "squeak_3", 0.45, { pan: -0.05 });
[0.75, 1.0].forEach((d, i) => drip(T.drop2 + d, 0.36, i + 1, -0.05));
snd(T0(8) + 0.95, "sniffle_3", 0.36, { pan: OWNp });
// -- 9/10 · "you think he is oblivious": a thought bubble, then a happy, wagging dog who has no idea
pops(T0(9) + 0.05, 0, 0.55); snd(T0(9) + 0.07, "bell_1", 0.22, { rate: 1.12 });
snd(T0(10) + 0.32, "woof_soft", 0.5, { pan: DOGp });
paws(T0(10) + 0.62, 2, 0.14, 0.22, 0.18);
snd(T0(10) + 0.9, "sniffle_4", 0.3, { pan: OWNp });
// -- 11 · "emergency care": a siren, a bandage and an ambulance pop, a serious woof
snd(T0(11) + 0.08, "siren", 0.42, { dur: 2.3, fadeOut: 0.45 });
snd(T0(11) + 0.28, "snap", 0.5); snd(T0(11) + 0.3, "bell_2", 0.34);
snd(T0(11) + 0.42, "snap_low", 0.5, { pan: OWNp }); pops(T0(11) + 0.42, 2, 0.35, OWNp);
snd(T0(11) + 1.0, "woof_soft", 0.45, { pan: DOGp, rate: 1.05 });
// -- 12 · puzzled: a question mark pops and he whines, head tilted
pops(T0(12) + 0.12, 2, 0.55); snd(T0(12) + 0.12, "bell_3", 0.2, { rate: 1.1 });
snd(T0(12) + 0.35, "whimper_b", 0.42, { pan: DOGp });
snd(T0(12) + 0.95, "sniffle_3", 0.22, { pan: DOGp, rate: 1.22 });     // he sniffs the air, head tilted
snd(T0(12) + 1.15, "thrush_a", 0.1, { pan: -0.4 });
// -- 13 · three sad thought bubbles; each pop is a bell pitched lower than the last
[[C.heartbreak, 0.84], [C.grief, 0.75], [C.burnout, 0.64]].forEach(([tt, r], i) => { pops(tt - 0.05, i, 0.5); snd(tt - 0.05, "bell_1", 0.34, { rate: r }); });
// -- 14/15 · the toy alone, then the hero reveal: glass shimmer, a long bell, a few sparkles
snd(T0(14) + 0.45, "glow", 0.55, { dur: 3.0, fadeIn: 0.8, fadeOut: 1.0 });
snd(T0(14) + 1.0, "twinkle_1", 0.3, { pan: -0.2 });
snd(T0(15) + 0.05, "bell_long", 0.5);
[0.12, 0.38, 0.68].forEach((d, i) => snd(T0(15) + d, `twinkle_${i + 1}`, 0.28, { pan: [-0.35, 0.3, 0][i] }));
// -- 16 · safety, dopamine, comfort: three bells that rise (the same real bell, a third and a fifth higher), with a pop each
[[C.safety, "bell_1", 0], [C.dopamine, "bell_2", 1], [C.comfort, "bell_3", 2]].forEach(([tt, b, i]) => { pops(tt - 0.05, i, 0.45); snd(tt - 0.05, b, 0.42, { pan: [-0.25, 0, 0.25][i] }); });
snd(T0(16) + 0.4, "twinkle_2", 0.3);
snd(T0(16) + 0.2, "woof_soft", 0.38, { pan: DOGp, rate: 1.12 });
// -- 17 · asleep with it
snd(T0(17) + 0.04, "snore", 0.55); pops(T0(17) + 0.1, 2, 0.28, 0.2);
// -- 18 · runs to you with it (squeaking), 19 · guards it
paws(T0(18) + 0.02, 8, 0.115, 0.3, 0.55, 0);
snd(T0(18) + 0.22, "squeak_2", 0.28); snd(T0(18) + 0.62, "squeak_3", 0.3);
snd(T0(19) + 0.12, "woof_low", 0.36, { pan: 0.05 });
// -- 20 · the trophy: a bell, a crown of gems, polite applause
snd(T0(20) + 0.08, "bell_long", 0.5);
snd(T0(20) + 0.3, "twinkle_3", 0.3);
snd(T0(20) + 0.34, "applause", 0.34, { dur: 1.0, fadeIn: 0.15, fadeOut: 0.5 });
// -- 21 · "when they drop it in your hands, they aren't asking you to throw it"
snd(T.hands + 0.4, "thump", 0.6, { pan: -0.05 });
snd(T.hands + 0.38, "squeak_2", 0.4, { pan: -0.05 });
snd(T.hands + 0.4, "splat_2", 0.32, { pan: -0.05 });
snd(C.throwit - 0.2, "snap", 0.5); pops(C.throwit - 0.2, 1, 0.3);
snd(at("aren't") + 0.55, "whimper_a", 0.3, { pan: DOGp, rate: 0.9 });
snd(C.throwit + 0.05, "thump", 0.26, { pan: 0.1, rate: 1.2 });
// -- 22/23 · "giving away the only thing they own": a heartbeat; then the clouds part, you breathe out, the sun and the rainbow
snd(T0(22) + 0.2, "twinkle_1", 0.2, { pan: 0.2 }); snd(T0(22) + 0.9, "twinkle_2", 0.2, { pan: -0.2 }); snd(T0(22) + 1.6, "twinkle_3", 0.2, { pan: 0.1 });
for (let tt = T0(22) + 0.1, i = 0; tt < T0(23) + 0.25; tt += 0.78, i++) { snd(tt, "heart_1", 0.55 + 0.06 * Math.min(i, 3)); snd(tt + 0.2, "heart_2", 0.4 + 0.05 * Math.min(i, 3)); }
snd(T0(23) + 0.7, "breath_out", 0.5, { pan: OWNp });
snd(T0(23) + 0.7, "glow", 0.4, { dur: 2.4, fadeIn: 0.6, fadeOut: 0.9 });
snd(T0(23) + 0.92, "bell_long", 0.5);
[0.95, 1.1, 1.3].forEach((d, i) => snd(T0(23) + d, `twinkle_${i + 1}`, 0.3, { pan: [-0.3, 0.3, 0][i] }));
snd(T0(23) + 1.05, "whimper_b", 0.2, { pan: DOGp, rate: 1.1 });

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
document.getElementById("vignette").style.opacity = "0.12";
const flashEl = document.getElementById("flash");
function dip(t) { // a soft cream dip at each cut (0.3 s in all); a red/blue pulse for the siren
  const d = Math.max(...CUTS.map((c) => Math.max(0, 1 - Math.abs(t - c) / 0.15)));
  const siren = t > T0(11) + 0.2 && t < T0(12) - 0.1 ? 0.5 + 0.5 * Math.sin(t * 22) : 0;
  flashEl.style.background = siren > 0 ? (Math.sin(t * 11) > 0 ? "#ff3b4e" : "#3b82ff") : "#fff9ee";
  flashEl.style.opacity = String(siren > 0 ? 0.16 * siren : ease.inOut(d) * 0.85);
}

// ===================== frame =====================
const _p = V(0, 0, 0), _q = V(0, 0, 0), _d = V(0, 0, 0);
const placeMood = { dogWorld: { hemi: 0xffd6ec, sun: 0xffc9e4 }, normal: { hemi: 0xeaf6ff, sun: 0xfff0d2 } };
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  const k = shotOf(t), pl = placeOf(k);
  for (const key of Object.keys(places)) places[key].visible = key === pl;
  const mood = k === 11 ? placeMood.dogWorld : placeMood.normal;
  hemi.color.setHex(mood.hemi); sun.color.setHex(mood.sun);
  const focus = pl === "n" ? [0, 0] : pl === "p" ? [OFF.p - 1.4, -2] : [OFF.b, -2.5];
  lightAt(...focus);
  // the dog
  const g = goldenState(t);
  golden.visible = !!g;
  if (g) golden.pose({ ...g.pose, x: OFF[g.pl] + g.x, y: g.pose.lift ?? 0, z: g.z });
  // the toy follows his mouth, or flies, or lies on the ground
  const ts = toyState(t);
  const inMouth = ts.mode === "mouth" && !!g;
  toy.visible = ts.mode === "world" || inMouth;
  if (inMouth) { if (toy.parent !== golden.mouth) golden.mouth.add(toy); toy.position.set(0, -0.06, 0.02); toy.rotation.set(0.3, 0, 0); toy.scale.setScalar(1.15); }
  else if (ts.mode === "world") { if (toy.parent !== scene) scene.add(toy); toy.position.copy(ts.pos); toy.rotation.set(0.2, ts.rot, 0.1 * Math.sin(t * 3)); toy.scale.setScalar(ts.s); }
  // you
  const showOwner = pl === "p";
  owner.visible = showOwner;
  if (showOwner) owner.pose(ownerPose(t));
  // the camera
  const c = cameraAt(t);
  camera.position.copy(c.pos);
  camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  owner.faceCamera(camera);
  owner.updateMatrixWorld(true);
  // tears from both eyes
  const crying = showOwner && ((k >= 1 && k <= 9) || (k >= 12 && k <= 22)) && k !== 9 ? 1 : 0;
  tears.forEach((s, i) => {
    const eye = i % 2 ? 1 : -1, ph = ((t * 1.9 + i * 0.37) % 1);
    s.visible = !!crying;
    if (!crying) return;
    owner.parts.headG.localToWorld(_p.set(eye * 0.095, 0.25, 0.04));
    s.position.set(_p.x, _p.y - 0.28 * ph * ph, _p.z);
    s.scale.set(0.05 * (1 - 0.3 * ph), 0.075 * (1 - 0.3 * ph), 1);
    s.material.opacity = Math.sin(Math.PI * Math.min(1, ph * 1.05)) * 0.95 * (k === 5 ? 1 : 0.9);
  });
  // the cloud over your head: rain while you are sad, parting at the end
  const sadK = k >= 23 ? 1 - prog(t, T0(23) + 0.5, T0(23) + 1.3) : 1;
  owner.parts.headG.localToWorld(_q.set(0, 1.25, 0));
  cloudIcon.visible = showOwner && sadK > 0.02;
  cloudIcon.position.set(_q.x, _q.y + 0.1 * Math.sin(t * 2.4), _q.z);
  cloudIcon.scale.setScalar(1.15 * sadK * (1 + 0.04 * Math.sin(t * 9)));
  cloudIcon.material.opacity = sadK;
  const sunK = k === 23 ? ease.out(prog(t, T0(23) + 1.0, T0(23) + 1.5)) : k === 24 ? 0 : 0;
  sunIcon.visible = showOwner && sunK > 0.02;
  sunIcon.position.set(_q.x, _q.y + 0.15, _q.z); sunIcon.scale.setScalar(1.0 * sunK); sunIcon.material.opacity = sunK; sunIcon.material.rotation = t * 0.8;
  const rbK = k === 23 ? ease.out(prog(t, T0(23) + 1.4, T0(23) + 2.0)) * (1 - prog(t, T0(24) - 0.25, T0(24))) : 0;
  rainbowIcon.visible = showOwner && rbK > 0.02;
  rainbowIcon.position.set(OWN.x + 1.6, 2.4, OWN.z - 0.6); rainbowIcon.scale.setScalar(2.6 * rbK); rainbowIcon.material.opacity = rbK * 0.95;
  // "emergency care": a bandage on your head, a red cross over the dog, a cap and a siren on him
  const em = k === 11;
  doctor.visible = em && !!g;
  if (em) { doctor.userData.beams.rotation.y = t * 9; const sw = Math.sin(t * 11) > 0; doctor.userData.lamp.material.emissive.setHex(sw ? 0xff1c30 : 0x1c5cff); }
  bandage.visible = showOwner && em;
  if (em) { owner.parts.headG.localToWorld(_p.set(0.13, 0.52, 0.05)); bandage.position.copy(_p); bandage.scale.setScalar(0.25 * ease.out(prog(t, T0(11) + 0.3, T0(11) + 0.55))); bandage.material.opacity = 1; }
  crossIcon.visible = em && !!g;
  if (em && g) { crossIcon.position.set(OFF.p + g.x, 1.15 + 0.05 * Math.sin(t * 8), g.z); crossIcon.scale.setScalar(0.38 * (1 + 0.15 * Math.sin(t * 12)) * ease.out(prog(t, T0(11) + 0.25, T0(11) + 0.5))); crossIcon.material.opacity = 1; }
  // thought bubbles: you think he is oblivious; he cannot read human problems; the toy means safety, joy and comfort
  const setBub = (s, on, pos, size) => { s.visible = on > 0.01; if (!on) return; s.position.copy(pos); s.scale.set(size * on, size * 0.9 * on, 1); s.material.opacity = Math.min(1, on * 1.5); };
  const popK = (t0, dur = 0.9) => ease.out(prog(t, t0, t0 + 0.18)) * (1 - prog(t, t0 + dur - 0.15, t0 + dur));
  owner.parts.headG.localToWorld(_p.set(-0.42, 0.78, 0));
  setBub(BUB.clueless, k === 9 ? popK(T0(9) + 0.02, 0.98) : 0, _p.clone(), 0.85);
  const dogHead = V(OFF.p - 1.3, 0.95, -1.3);
  setBub(BUB.heart, k === 13 ? popK(C.heartbreak - 0.05, 0.75) : 0, dogHead.clone().add(V(-0.45, 0.35, 0)), 0.7);
  setBub(BUB.grief, k === 13 ? popK(C.grief - 0.05, 0.75) : 0, dogHead.clone().add(V(0.0, 0.55, 0)), 0.7);
  setBub(BUB.burn, k === 13 ? popK(C.burnout - 0.05, 0.85) : 0, dogHead.clone().add(V(0.45, 0.35, 0)), 0.7);
  const tp = PLAZA_TOY;
  setBub(BUB.safety, k === 16 ? popK(C.safety - 0.05, 0.9) : 0, tp.clone().add(V(-0.7, 0.9, 0)), 0.7);
  setBub(BUB.joy, k === 16 ? popK(C.dopamine - 0.05, 0.75) : 0, tp.clone().add(V(0.0, 1.15, 0)), 0.7);
  setBub(BUB.cozy, k === 16 ? popK(C.comfort - 0.05, 0.85) : 0, tp.clone().add(V(0.7, 0.9, 0)), 0.7);
  // a question mark over his head while he is puzzled
  questionIcon.visible = k === 12 || (k === 13 && t < C.heartbreak - 0.1);
  questionIcon.position.copy(dogHead).add(V(0.15, 0.3 + 0.05 * Math.sin(t * 6), 0)); questionIcon.scale.setScalar(0.34 * ease.out(prog(t, T0(12) + 0.1, T0(12) + 0.35))); questionIcon.material.opacity = 1;
  // the hero shots: rays and a spotlight on the toy; the pedestal and crown
  const rays = k === 14 ? ease.inOut(prog(t, T0(14) + 0.5, T0(14) + 1.4)) : k === 15 || k === 16 ? 1 - 0.4 * (k === 16) : 0;
  raysSprite.visible = rays > 0.01;
  raysSprite.position.copy(ts.mode === "world" ? ts.pos : PLAZA_TOY).add(V(0, 0.05, 0)).addScaledVector(_d.copy(raysSprite.position).sub(camera.position).normalize(), 0.5); raysSprite.scale.setScalar(2.6); raysSprite.material.opacity = 0.5 * rays; raysSprite.material.rotation = t * 0.35;
  pedestal.visible = k === 20;
  if (k === 20) { pedestal.position.set(PLAZA_TOY.x, 0, PLAZA_TOY.z); pedestal.userData.crown.position.y = 1.22 + 0.04 * Math.sin(t * 3); pedestal.userData.crown.rotation.y = t * 1.5; }
  zzz.visible = k === 17; zzz.position.set(OFF.n - 0.15, 0.65 + 0.12 * ((t * 0.8) % 1), 0.1); zzz.scale.setScalar(0.3 * (0.7 + 0.3 * ((t * 0.8) % 1))); zzz.material.opacity = 1 - ((t * 0.8) % 1) * 0.6;
  butterfly.visible = k === 19; butterfly.position.set(OFF.b + 0.7 + 0.3 * Math.sin(t * 5), 0.75 + 0.12 * Math.sin(t * 9), -2.4 + 0.2 * Math.cos(t * 4)); butterfly.scale.setScalar(0.26); butterfly.material.opacity = 1;
  // the throw is not what he wants: a crossed-out ball
  const nt = (k === 3 ? popK(T0(3) + 0.35, 0.85) : 0) + (k === 21 ? popK(C.throwit - 0.2, 1.0) : 0);
  ballIcon.visible = nt > 0.01; noThrow.visible = nt > 0.01;
  if (nt > 0.01) { _p.set(OWN.x + 0.5, 1.65, OWN.z + 0.4); ballIcon.position.copy(_p); noThrow.position.copy(_p).add(V(0, 0, 0.01)); ballIcon.scale.setScalar(0.4 * nt); noThrow.scale.setScalar(0.5 * nt); ballIcon.material.opacity = noThrow.material.opacity = Math.min(1, nt * 1.4); }
  drawFx(t);
  captions(t);
  dip(t);
});

window.__dbg = { scene, camera, golden, owner, toy, places, STARTS, DURATION };
short.start();
