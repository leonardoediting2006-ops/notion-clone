import { THREE } from "../../js/engine.js";
import { toon, toonGradient, outlineStatic } from "../../js/toon.js";
import * as W from "../../js/toonworld.js";
import { tm, mesh, ext, rbox, cyl, ball, canvasTex, texMat, put, hex, ribbon } from "./build.js";

// The three outdoor places of dog-sneeze. Everything is built in the set's own coordinates (x right, z toward the viewer, y up);
// main.js places each group somewhere far away on the big grass plane of js/outside.js, which also provides the sky and the hills.

const plankTex = canvasTex(256, 256, (x) => {
  const cols = ["#d9a05f", "#cf9552", "#e0aa68", "#c98d4c"];
  for (let i = 0; i < 4; i++) {
    x.fillStyle = cols[i]; x.fillRect(0, i * 64, 256, 64);
    x.strokeStyle = "rgba(110,60,25,0.35)"; x.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(0, i * 64 + 10 + k * 14); x.bezierCurveTo(80, i * 64 + 6 + k * 14, 170, i * 64 + 16 + k * 14, 256, i * 64 + 10 + k * 14); x.stroke(); }
    x.fillStyle = "#6b3f1f"; x.fillRect(0, i * 64 - 1.5, 256, 3);
    x.fillRect(((i * 97) % 200) + 20, i * 64, 3, 64);
  }
});
const lawnTex = canvasTex(256, 256, (x) => {
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#92d65f" : "#7cc84f"; x.fillRect(i * 32, 0, 32, 256); }
  for (let i = 0; i < 900; i++) { const px = (i * 61) % 256, py = (i * 113) % 256; x.strokeStyle = i % 3 ? "rgba(70,140,50,0.35)" : "rgba(190,240,120,0.35)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 1, py - 6); x.stroke(); }
});
const checkTex = canvasTex(128, 128, (x) => { x.fillStyle = "#fff"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#e8423f"; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) x.fillRect(c * 32, r * 32, 32, 32); });
const stripeTex = canvasTex(128, 16, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#ffffff" : "#ff5a4a"; x.fillRect(i * 16, 0, 16, 16); } });
const brickRed = canvasTex(128, 128, (x) => { x.fillStyle = "#b8573a"; x.fillRect(0, 0, 128, 128); x.strokeStyle = "#7a3a26"; x.lineWidth = 3; for (let r = 0; r < 8; r++) { x.beginPath(); x.moveTo(0, r * 16); x.lineTo(128, r * 16); x.stroke(); for (let c = 0; c < 4; c++) { x.beginPath(); x.moveTo(c * 32 + (r % 2) * 16, r * 16); x.lineTo(c * 32 + (r % 2) * 16, r * 16 + 16); x.stroke(); } } });
const shedTex = canvasTex(128, 128, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#b4734a" : "#a9683f"; x.fillRect(i * 16, 0, 16, 128); x.fillStyle = "rgba(60,30,15,0.4)"; x.fillRect(i * 16, 0, 2, 128); } });

const flowerCols = [0xff8fb3, 0xffd34e, 0xffffff, 0xa890e8, 0xff6a5a, 0xff9d3c];

// a flower: stem, five petals, a centre (shared materials so fuseStatic can merge the lot)
function flower(g, x, z, h, c, r = 0.045) {
  cyl(g, 0.008, 0.008, h, tm(W.PAL.leafDark), x, h / 2, z, 5);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; ball(g, r * 0.6, tm(c), x + Math.cos(a) * r * 0.75, h, z + Math.sin(a) * r * 0.75, 1, 0.55, 1); }
  ball(g, r * 0.45, tm(0xffc83a), x, h + 0.01, z);
  ball(g, r * 0.7, tm(W.PAL.leaf2), x + 0.04, h * 0.4, z, 1.6, 0.3, 0.9);
}
function sunflower(g, x, z, h = 1.4) {
  cyl(g, 0.02, 0.028, h, tm(0x5c9a3c), x, h / 2, z, 6);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ball(g, 0.07, tm(0xffc928), x + Math.cos(a) * 0.15, h + Math.sin(a) * 0.15, z + 0.03, 1.5, 0.8, 0.4).rotation.z = a; }
  const d = ball(g, 0.12, tm(0x6b3f1f), x, h, z + 0.05, 1, 1, 0.5); d.userData.ink = true;
  ball(g, 0.1, tm(0x57a63c), x - 0.1, h * 0.55, z, 1.7, 0.3, 1.0);
}
function cabbage(g, x, z) { ball(g, 0.15, tm(0x69b84a), x, 0.19, z, 1, 0.85, 1); ball(g, 0.11, tm(0x8dd464), x, 0.22, z, 1, 0.8, 1); for (let k = 0; k < 4; k++) { const a = k * 1.57; ball(g, 0.12, tm(0x57a63c), x + Math.cos(a) * 0.12, 0.13, z + Math.sin(a) * 0.12, 1.2, 0.4, 0.9); } }
function lettuce(g, x, z) { for (let k = 0; k < 5; k++) { const a = k * 1.26; ball(g, 0.09, tm(k % 2 ? 0x8ddc5c : 0x6ccb48), x + Math.cos(a) * 0.06, 0.1, z + Math.sin(a) * 0.06, 1.3, 0.6, 1); } }
function carrotTop(g, x, z) { for (let k = 0; k < 3; k++) { const a = k * 2.1; cyl(g, 0.004, 0.012, 0.18, tm(0x4fae3f), x + Math.cos(a) * 0.03, 0.2, z + Math.sin(a) * 0.03, 5).rotation.z = Math.cos(a) * 0.3; } ball(g, 0.03, tm(0xff8a1f), x, 0.1, z, 1, 1.6, 1); }
function tomatoCage(g, x, z) {
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; cyl(g, 0.008, 0.008, 0.95, tm(0xb9c1cc), x + Math.cos(a) * 0.16, 0.47, z + Math.sin(a) * 0.16, 5); }
  for (const y of [0.3, 0.6, 0.9]) mesh(g, new THREE.TorusGeometry(0.16, 0.006, 5, 14).rotateX(Math.PI / 2), tm(0xb9c1cc), x, y, z);
  for (let k = 0; k < 6; k++) { const a = k * 1.1, y = 0.25 + k * 0.1; ball(g, 0.1, tm(0x4fae3f), x + Math.cos(a) * 0.07, y, z + Math.sin(a) * 0.07, 1, 0.8, 1); ball(g, 0.045, tm(0xff3a2f), x + Math.cos(a + 0.8) * 0.15, y - 0.03, z + Math.sin(a + 0.8) * 0.15); }
}
function beanTeepee(g, x, z) {
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, c = cyl(g, 0.012, 0.012, 1.5, tm(0xb98a58), x + Math.cos(a) * 0.22, 0.7, z + Math.sin(a) * 0.22, 5); c.rotation.set(-Math.sin(a) * 0.26, 0, Math.cos(a) * 0.26); }
  for (let k = 0; k < 14; k++) { const a = k * 1.4, y = 0.2 + k * 0.09, r = 0.2 * (1 - y / 1.7); ball(g, 0.07, tm(k % 3 ? 0x57b345 : 0x7ac95b), x + Math.cos(a) * r, y, z + Math.sin(a) * r, 1.2, 0.6, 1); if (k % 4 === 0) ball(g, 0.025, tm(0xff6a3d), x + Math.cos(a + 0.5) * r, y, z + Math.sin(a + 0.5) * r); }
}
function raisedBed(g, x, z, w, d, fill) {
  ext(g, x - w / 2, x + w / 2, 0, 0.3, z - d / 2, z + d / 2, tm(0x6b4630));
  for (const [dx, dz, sx, sz] of [[0, -d / 2, w + 0.12, 0.08], [0, d / 2, w + 0.12, 0.08], [-w / 2, 0, 0.08, d], [w / 2, 0, 0.08, d]]) rbox(g, sx, 0.34, sz, texMat(plankTex, sx > 0.2 ? sx : sz, 0.3), x + dx, 0.17, z + dz, 0.01);
  fill && fill(g, x, z, w, d);
}
function pot(g, x, z, r = 0.2, c = 0xe0703a, plant = null) {
  cyl(g, r, r * 0.72, r * 1.5, tm(c), x, r * 0.75, z, 14).userData.ink = true; cyl(g, r * 1.05, r * 1.05, 0.04, tm(c), x, r * 1.5, z, 14);
  mesh(g, new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.02, 12), tm(0x5a3a28), x, r * 1.5 + 0.02, z);
  if (plant) put(g, plant, x, r * 1.5, z);
}
function doghouse(g, x, z, ry = 0) {
  const h = new THREE.Group();
  rbox(h, 1.1, 0.8, 1.2, texMat(brickRed, 1, 1), 0, 0.4, 0, 0.03);
  for (const s of [-1, 1]) { const r = rbox(h, 0.78, 0.06, 1.34, tm(0x3d6fb4), s * 0.36, 0.95, 0, 0.02); r.rotation.z = -s * 0.8; }
  rbox(h, 0.07, 0.07, 1.34, tm(0x2e5a98), 0, 1.13, 0, 0.02);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x24160f })); door.position.set(0, 0.32, 0.606); h.add(door); door.userData.ink = false;
  ext(h, -0.28, 0.28, 0, 0.32, 0.598, 0.61, new THREE.MeshBasicMaterial({ color: 0x24160f }));
  rbox(h, 0.64, 0.04, 0.14, tm(0xffe9b0), 0, 0.02, 0.7, 0.01);
  h.position.set(x, 0, z); h.rotation.y = ry; g.add(h); return h;
}
function umbrellaTable(g, x, z) {
  cyl(g, 0.62, 0.62, 0.05, tm(0xf4efe4), x, 0.78, z, 20).userData.ink = true; cyl(g, 0.05, 0.07, 0.76, tm(0x9aa2ad), x, 0.38, z, 10); cyl(g, 0.3, 0.3, 0.03, tm(0x9aa2ad), x, 0.015, z, 14);
  cyl(g, 0.025, 0.025, 2.35, tm(0xcfd5de), x, 1.2, z, 8);
  const can = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.5, 16, 1, true), new THREE.MeshToonMaterial({ map: (() => { const t = stripeTex.clone(); t.needsUpdate = true; t.repeat.set(2, 1); return t; })(), gradientMap: toonGradient(), side: THREE.DoubleSide }));
  can.position.set(x, 2.28, z); can.castShadow = true; g.add(can); can.userData.ink = false;
  for (const [dx, dz, ry] of [[-0.95, 0.1, Math.PI / 2], [0.9, 0.3, -Math.PI / 2]]) {   // chairs
    const c = new THREE.Group(); rbox(c, 0.46, 0.06, 0.46, tm(0x4f9a8a), 0, 0.45, 0, 0.02); rbox(c, 0.46, 0.5, 0.05, tm(0x4f9a8a), 0, 0.72, -0.22, 0.02);
    for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) cyl(c, 0.02, 0.02, 0.45, tm(0xd8dde4), lx, 0.22, lz, 6);
    put(g, c, x + dx, 0, z + dz, ry);
  }
  // a jug and two glasses on the table
  cyl(g, 0.07, 0.07, 0.2, tm(0xbfe7f7), x + 0.12, 0.9, z + 0.05, 12); for (const o of [-0.25, -0.1]) cyl(g, 0.035, 0.03, 0.1, tm(0xe6f6ff), x + o, 0.85, z - 0.2, 10);
}

// ============================================================ the back garden
export function buildGarden() {
  W.reseed(77);
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(110, 90).rotateX(-Math.PI / 2), W.grassMaterial([36, 30])); base.position.set(0, -0.03, 0); base.receiveShadow = true; base.userData.ink = false; g.add(base);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(26, 19).rotateX(-Math.PI / 2), texMat(lawnTex, 3.25, 1)); lawn.position.set(0, 0.004, -0.5); lawn.receiveShadow = true; lawn.userData.ink = false; g.add(lawn);
  // the house: back wall with the patio, a red gable roof
  const house = W.house({ w: 9.2, h: 3.3, d: 3.6, style: "siding", wall: 0xf8e2b0, roof: 0xc4502e, door: 0x3f7fd0, shutter: 0x4f9f6a }); house.position.set(0, 0, -10.8); g.add(house);
  // the patio: a wooden deck with steps, a table with a striped umbrella, a barbecue, pots
  rbox(g, 9.0, 0.12, 3.6, texMat(plankTex, 6, 1.6), 0, 0.06, -7.2, 0.02);
  rbox(g, 3.0, 0.07, 0.45, texMat(plankTex, 2, 0.3), 0, 0.035, -5.2, 0.02); rbox(g, 3.0, 0.05, 0.45, texMat(plankTex, 2, 0.3), 0, 0.025, -4.8, 0.02);
  const deck = new THREE.Group(); deck.position.y = 0.12; g.add(deck);
  umbrellaTable(deck, 3.4, -6.7);
  { const bb = new THREE.Group(); ball(bb, 0.32, tm(0x2e3340), 0, 0.82, 0, 1, 0.7, 1).userData.ink = true; cyl(bb, 0.34, 0.34, 0.08, tm(0xff5a4a), 0, 0.75, 0, 16); for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [0, 0.22]]) cyl(bb, 0.02, 0.02, 0.75, tm(0x2e3340), dx, 0.38, dz, 6); cyl(bb, 0.1, 0.1, 0.04, tm(0x2e3340), 0.38, 0.4, 0, 10); put(g, bb, -3.3, 0.12, -6.6); }
  pot(deck, -1.7, -8.6, 0.24, 0xe0703a, W.leafyBush({ r: 0.34, seed: 3, leaves: 140, flowers: 9, flowerColor: W.PAL.pink }));
  pot(deck, 1.7, -8.6, 0.24, 0x5f9ad8, W.leafyBush({ r: 0.34, seed: 4, leaves: 140, flowers: 9, flowerColor: W.PAL.yellow }));
  // the lawn: a doghouse, a paddling pool, balls, a rope toy, a washing line, stepping stones
  doghouse(g, -5.2, 5.0, 0.5);
  { const p = new THREE.Group(); mesh(p, new THREE.TorusGeometry(0.95, 0.14, 10, 28).rotateX(Math.PI / 2), tm(0x3aa8ff), 0, 0.18, 0).userData.ink = true; mesh(p, new THREE.CircleGeometry(0.95, 28).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0x8fdcff, gradientMap: toonGradient() }), 0, 0.17, 0).castShadow = false; put(g, p, 6.2, 0, 3.6); ball(g, 0.1, tm(0xffd23a), 6.0, 0.24, 3.7, 1, 0.5, 1); }
  for (const [x, z, c] of [[-2.4, 2.4, 0xd7f03a], [3.6, -1.2, 0xd7f03a], [1.4, 4.6, 0xff6a5a]]) { ball(g, 0.1, tm(c), x, 0.1, z).userData.ink = true; }
  for (let i = 0; i < 9; i++) cyl(g, 0.22, 0.24, 0.05, tm(0xd9d2c4), Math.sin(i * 0.55) * 0.7, 0.03, -4.3 + i * 1.05, 12);
  for (const x of [-6.5, -1.5]) { cyl(g, 0.03, 0.04, 2.2, tm(0x9aa2ad), x, 1.1, 6.6, 8); }
  mesh(g, new THREE.CylinderGeometry(0.008, 0.008, 5.0, 4).rotateZ(Math.PI / 2), tm(0xeeeeee), -4.0, 2.0, 6.6);
  [[-6.0, 0xff6a8a], [-5.4, 0x6ac8ff], [-4.8, 0xffd34e], [-4.1, 0x8ee06a], [-3.4, 0xffffff], [-2.7, 0xff9d3c]].forEach(([x, c], i) => { const s = rbox(g, 0.4, 0.42 + (i % 2) * 0.12, 0.03, tm(c), x, 1.78 - (i % 2) * 0.05, 6.6, 0.01); s.userData.ink = true; });
  // the fences and hedges
  for (const [x, z, len, ry] of [[-13, -0.5, 19, Math.PI / 2], [13, -0.5, 19, Math.PI / 2], [0, 8.9, 26, 0], [-8.8, -9.0, 8.4, 0], [8.8, -9.0, 8.4, 0]]) put(g, W.picketFence(len, { h: 1.0 }), x, 0, z, ry);
  for (let i = 0; i < 9; i++) put(g, W.leafyBush({ r: 0.7, seed: 20 + i, leaves: 260, flowers: i % 2 ? 7 : 0, flowerColor: i % 4 === 1 ? W.PAL.pink : W.PAL.white, tint: i }), -11.6 + i * 2.9, 0, 8.3);
  // trees
  put(g, W.leafyTree({ species: "oak", height: 6.0, crown: 2.5, seed: 31, leaves: 1500 }), -11.4, 0, 3.0);
  put(g, W.leafyTree({ species: "maple", height: 5.4, crown: 2.1, seed: 32, leaves: 1300 }), 11.4, 0, 4.0);
  put(g, W.leafyTree({ species: "birch", height: 5.2, crown: 1.7, seed: 33, leaves: 1100 }), 11.8, 0, -8.0);
  put(g, W.leafyTree({ species: "oak", height: 5.6, crown: 2.3, seed: 34, leaves: 1300 }), -11.8, 0, -9.6);
  // ---- east: the flowerbed (shot 5) ----
  raisedBed(g, 8.2, -4.6, 5.2, 1.7, (gg, x, z, w, d) => {
    let n = 0; for (let ix = 0; ix < 13; ix++) for (let iz = 0; iz < 4; iz++, n++) flower(gg, x - w / 2 + 0.2 + ix * 0.4 + (iz % 2) * 0.12, z - d / 2 + 0.22 + iz * 0.4, 0.34 + 0.12 * ((ix * 3 + iz) % 3), flowerCols[(ix + iz * 2) % 6], 0.055);
  });
  for (let i = 0; i < 6; i++) sunflower(g, 5.9 + i * 0.95, -6.3 - 0.1 * (i % 2), 1.35 + 0.18 * (i % 3));
  { const b = W.bench({ w: 1.5 }); put(g, b, 10.6, 0, -2.4, Math.PI); }
  { const wc = new THREE.Group(); cyl(wc, 0.11, 0.1, 0.2, tm(0x4fae9a), 0, 0.1, 0, 12).userData.ink = true; cyl(wc, 0.012, 0.012, 0.3, tm(0x4fae9a), 0.17, 0.2, 0, 6).rotation.z = -0.8; mesh(wc, new THREE.TorusGeometry(0.07, 0.01, 5, 12).rotateY(Math.PI / 2), tm(0x4fae9a), -0.08, 0.24, 0); put(g, wc, 10.3, 0, -3.3, 0.6); }
  // ---- west: the vegetable patch and the shed (shot 12) ----
  raisedBed(g, -8.2, -2.0, 3.0, 1.1, (gg, x, z) => { for (let i = 0; i < 5; i++) cabbage(gg, x - 1.1 + i * 0.55, z); });
  raisedBed(g, -8.2, -3.7, 3.0, 1.1, (gg, x, z) => { for (let i = 0; i < 5; i++) { lettuce(gg, x - 1.1 + i * 0.55, z - 0.2); carrotTop(gg, x - 1.1 + i * 0.55 + 0.2, z + 0.25); } });
  raisedBed(g, -8.2, -5.4, 3.0, 1.1, (gg, x, z) => { tomatoCage(gg, x - 1.0, z); tomatoCage(gg, x, z); beanTeepee(gg, x + 1.0, z); });
  { // the shed
    const s = new THREE.Group(); rbox(s, 2.6, 2.1, 2.1, texMat(shedTex, 2, 1.5), 0, 1.05, 0, 0.03);
    for (const k of [-1, 1]) { const r = rbox(s, 1.6, 0.1, 2.5, tm(0x6b4a3a), k * 0.72, 2.35, 0, 0.02); r.rotation.z = -k * 0.5; }
    rbox(s, 0.8, 1.7, 0.06, tm(0x4f9a6a), -0.5, 0.88, 1.07, 0.02); ball(s, 0.04, tm(0xffd23a), -0.2, 0.9, 1.12);
    rbox(s, 0.7, 0.55, 0.05, tm(0xbfe7f7), 0.75, 1.3, 1.07, 0.02); rbox(s, 0.86, 0.06, 0.08, tm(0xffffff), 0.75, 1.0, 1.1, 0.01); rbox(s, 0.86, 0.06, 0.08, tm(0xffffff), 0.75, 1.6, 1.1, 0.01);
    put(g, s, -11.0, 0, -6.2, 0.3); }
  { // a scarecrow
    const s = new THREE.Group(); cyl(s, 0.03, 0.03, 1.7, tm(0x9a6a3c), 0, 0.85, 0, 6); cyl(s, 0.02, 0.02, 1.3, tm(0x9a6a3c), 0, 1.25, 0, 6).rotation.z = Math.PI / 2;
    rbox(s, 0.42, 0.5, 0.2, tm(0xe05a4a), 0, 1.15, 0, 0.05); ball(s, 0.17, tm(0xf1c27d), 0, 1.6, 0).userData.ink = true; cyl(s, 0.2, 0.2, 0.03, tm(0xd9a84a), 0, 1.72, 0, 14); cyl(s, 0.12, 0.13, 0.16, tm(0xd9a84a), 0, 1.8, 0, 14);
    for (const x of [-0.06, 0.06]) ball(s, 0.016, tm(0x2b1b16), x, 1.63, 0.16); for (let k = 0; k < 5; k++) ball(s, 0.012, tm(0x2b1b16), -0.06 + k * 0.03, 1.54 + Math.abs(k - 2) * 0.01, 0.16);
    for (const x of [-0.62, 0.62]) cyl(s, 0.03, 0.04, 0.2, tm(0xe8c35a), x, 1.25, 0, 6);
    put(g, s, -5.2, 0, -4.8, 0.6); }
  { const bar = new THREE.Group(); cyl(bar, 0.32, 0.36, 0.85, tm(0x9a6a3c), 0, 0.42, 0, 16).userData.ink = true; for (const y of [0.2, 0.62]) mesh(bar, new THREE.TorusGeometry(0.35, 0.015, 5, 18).rotateX(Math.PI / 2), tm(0x5d6670), 0, y, 0); cyl(bar, 0.3, 0.3, 0.02, tm(0x62bfea), 0, 0.84, 0, 16); put(g, bar, -9.6, 0, -8.0); }
  { const wb = new THREE.Group(); rbox(wb, 0.9, 0.28, 0.55, tm(0x3d6fb4), 0, 0.5, 0, 0.05).rotation.z = 0.0; cyl(wb, 0.2, 0.2, 0.06, tm(0x2e3340), 0.5, 0.2, 0, 14).rotation.x = Math.PI / 2; for (const z of [-0.2, 0.2]) cyl(wb, 0.02, 0.02, 0.9, tm(0xb98a58), -0.5, 0.58, z, 5).rotation.z = Math.PI / 2 - 0.2; put(g, wb, -9.6, 0, 1.6, 0.9); }
  outlineStatic(g, { width: 0.016, min: 0.06 });
  W.fuseStatic(g, {});
  return { group: g };
}

// ============================================================ the park
export function buildPark() {
  W.reseed(88);
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(140, 110).rotateX(-Math.PI / 2), W.grassMaterial([46, 36])); base.position.set(0, -0.03, 0); base.receiveShadow = true; base.userData.ink = false; g.add(base);
  const sand = canvasTex(64, 64, (x) => { x.fillStyle = "#f0d9a8"; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 80; i++) { x.fillStyle = i % 2 ? "rgba(196,160,100,0.5)" : "rgba(255,244,214,0.6)"; x.fillRect((i * 37) % 64, (i * 53) % 64, 2, 2); } });
  const PATH = [[-22, 8], [-12, 7], [-4, 4.5], [4, 4.8], [11, 3], [17, 0], [24, -3]];
  const edge = ribbon(PATH, 2.3, 0.012, tm(0xd6b97e)); g.add(edge);
  const path = ribbon(PATH, 1.9, 0.02, texMat(sand, 1, 1)); g.add(path);
  const pp = path.userData.curve.getSpacedPoints(90), nearPath = (x, z) => pp.some((p) => Math.hypot(p.x - x, p.z - z) < 1.4);
  const keepOut = (x, z) => Math.hypot((x - 8) / 4.6, (z + 4.2) / 4.0) < 1 || nearPath(x, z) || Math.hypot(x + 8, z + 2) < 1.5 || (z > -2.4 && z < 0 && x > 11 && x < 14) || (x > 10.5 && z < -3 && z > -8);
  // the pond with ducks, lily pads and reeds
  put(g, W.pond(3.4), 8.0, 0, -4.2).scale.set(1.15, 1, 0.9);
  for (const [x, z] of [[6.6, -3.2], [9.4, -5.0], [8.0, -4.2]]) put(g, W.duck(), x, 0.07, z, x * 1.3);
  for (let i = 0; i < 16; i++) { const a = 3.4 + i * 0.2, x = 8.0 + Math.cos(a) * 4.0 * 1.15, z = -4.2 + Math.sin(a) * 3.55 * 0.9 + 0.2 * Math.sin(i * 3); cyl(g, 0.012, 0.012, 0.8 + 0.2 * (i % 3), tm(0x5c8a3c), x, 0.4, z, 5); cyl(g, 0.045, 0.045, 0.22, tm(0x7a4a2a), x, 0.85 + 0.2 * (i % 3), z, 8); }
  // a stream and a wooden footbridge
  const stream = ribbon([[11.4, -4.6], [15, -6], [20, -5.5], [28, -7]], 1.7, 0.03, new THREE.MeshToonMaterial({ color: 0x62bfea, gradientMap: toonGradient() })); g.add(stream);
  { const b = new THREE.Group(); for (let i = 0; i < 9; i++) { const u = i / 8, y = 0.12 + 0.38 * Math.sin(u * Math.PI); rbox(b, 0.34, 0.07, 1.5, tm(i % 2 ? 0xd18d58 : 0xc98552), -1.4 + u * 2.8, y, 0, 0.015).rotation.z = Math.cos(u * Math.PI) * -0.5; }
    for (const z of [-0.78, 0.78]) { for (let i = 0; i < 5; i++) { const u = i / 4; rbox(b, 0.06, 0.55, 0.06, tm(0x9a6038), -1.3 + u * 2.6, 0.45 + 0.38 * Math.sin(u * Math.PI), z, 0.01); } mesh(b, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => new THREE.Vector3(-1.3 + (i / 8) * 2.6, 0.78 + 0.38 * Math.sin((i / 8) * Math.PI), z))), 18, 0.03, 6), tm(0x9a6038)); }
    put(g, b, 17.6, 0, -5.9, Math.PI / 2 + 0.28); }
  // benches, lamps, bins, a picnic
  put(g, W.bench({ w: 1.7 }), -3.2, 0, -5.4, 0.1); put(g, W.bench({ w: 1.7 }), 2.8, 0, 7.4, Math.PI - 0.2);
  for (const [x, z] of [[-10, 5.4], [-1, 2.8], [8.5, 1.6]]) put(g, W.lampPost(2.8), x, 0, z);
  { const bin = new THREE.Group(); cyl(bin, 0.22, 0.18, 0.7, tm(0x3d8f6a), 0, 0.35, 0, 12).userData.ink = true; cyl(bin, 0.24, 0.24, 0.05, tm(0x2e6b50), 0, 0.72, 0, 12); put(g, bin, -4.9, 0, -5.4); }
  { const bl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5).rotateX(-Math.PI / 2), texMat(checkTex, 1.3, 1)); bl.position.set(-8, 0.02, -2); bl.rotation.y = 0.3; bl.userData.ink = false; bl.receiveShadow = true; g.add(bl);
    const bk = new THREE.Group(); rbox(bk, 0.5, 0.3, 0.34, tm(0xc98552), 0, 0.15, 0, 0.04); mesh(bk, new THREE.TorusGeometry(0.2, 0.02, 5, 14, Math.PI).rotateZ(0), tm(0x9a6038), 0, 0.3, 0); for (const [x, z, c] of [[0.4, 0.2, 0xff3a3a], [0.55, -0.1, 0x6fd47a], [0.3, -0.3, 0xffd24a]]) ball(bk, 0.07, tm(c), x, 0.07, z); put(g, bk, -8.2, 0.02, -2.2, 0.3); }
  // flower borders and bushes
  for (const [x, z, w] of [[-3.2, -7.2, 3.4], [3.0, 9.4, 3.0], [-12.5, 2.5, 2.6]]) { raisedBed(g, x, z, w, 0.9, (gg, bx, bz, bw, bd) => { for (let i = 0; i < Math.floor(bw / 0.3); i++) for (let k = 0; k < 2; k++) flower(gg, bx - bw / 2 + 0.2 + i * 0.3, bz - 0.2 + k * 0.4, 0.32 + 0.1 * ((i + k) % 3), flowerCols[(i + k * 3) % 6], 0.055); }); }
  const R = [[-14, -9, "oak", 6.2], [-6, -13, "maple", 5.6], [3, -14, "birch", 5.4], [16, -12, "oak", 6.0], [-18, 2, "maple", 5.8], [21, 4, "oak", 6.4], [-9, 13, "birch", 5.2], [8, 14, "maple", 5.6], [26, -3, "pine", 7.0], [-24, -6, "pine", 7.2]];
  R.forEach(([x, z, sp, h], i) => put(g, W.leafyTree({ species: sp, height: h, crown: sp === "pine" ? 1.6 : 2.3, seed: 40 + i, leaves: sp === "pine" ? 700 : 1300, far: sp === "pine" }), x, 0, z, i * 1.7));
  for (let i = 0; i < 10; i++) { const x = -16 + i * 4.3, z = 11.5 + Math.sin(i) * 1.5; put(g, W.leafyBush({ r: 0.7, seed: 60 + i, leaves: 240, flowers: i % 3 === 0 ? 8 : 0, flowerColor: W.PAL.pink, tint: i }), x, 0, z); }
  g.add(W.grassField({ x0: -34, x1: 34, z0: -28, z1: 24, count: 30000, seed: 12, height: 0.17, spread: 0.12, skip: keepOut }));
  g.add(W.meadowFlowers({ x0: -30, x1: 30, z0: -16, z1: 14, count: 260, seed: 5, skip: keepOut }));
  outlineStatic(g, { width: 0.016, min: 0.06 });
  W.fuseStatic(g, { skip: [edge, path, stream] });
  return { group: g, PATH };
}

// ============================================================ the sunset meadow
export function buildMeadow() {
  W.reseed(99);
  const g = new THREE.Group();
  const hgt = (x, z) => 2.6 * Math.exp(-((x * x + (z + 14) * (z + 14)) / 380)) + 0.35 * Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.max(0, -z - 32) * 0.08;
  const ground = W.terrainMesh({ x0: -90, x1: 90, z0: -70, z1: 60, step: 2, heightAt: hgt, material: W.grassMaterial([36, 26]) }); g.add(ground);
  g.add(W.grassField({ x0: -34, x1: 34, z0: -40, z1: 24, count: 36000, seed: 15, height: 0.34, spread: 0.14, heightAt: hgt }));
  g.add(W.meadowFlowers({ x0: -30, x1: 30, z0: -36, z1: 22, count: 700, seed: 7, colors: [0xffffff, 0xffd34e, 0xff8fb3, 0xa890e8, 0xff7a4a] }));
  for (const [x, z, h] of [[6.0, -13.5, 6.4], [-14, -26, 5.4], [22, -22, 5.8], [-26, -8, 5.0]]) put(g, W.leafyTree({ species: "oak", height: h, crown: 2.6, seed: 70 + (x | 0), leaves: 1500 }), x, hgt(x, z), z, x);
  for (let i = 0; i < 12; i++) { const x = -22 + i * 4.2, z = -2 + Math.sin(i * 1.4) * 5; put(g, W.leafyBush({ r: 0.6, seed: 80 + i, leaves: 220, flowers: 7, flowerColor: flowerCols[i % 6] }), x, hgt(x, z), z); }
  { // a rustic fence along the crest and a tiny bench
    for (let i = 0; i < 14; i++) { const x = -12 + i * 1.9, z = -13 + Math.sin(i * 0.5) * 1.2, y = hgt(x, z); rbox(g, 0.09, 0.95, 0.09, tm(0x9a6a3c), x, y + 0.47, z, 0.02); if (i < 13) { const x2 = x + 1.9, z2 = -13 + Math.sin((i + 1) * 0.5) * 1.2, y2 = hgt(x2, z2); for (const dy of [0.45, 0.75]) { const m = rbox(g, 1.95, 0.07, 0.05, tm(0xb98a58), (x + x2) / 2, (y + y2) / 2 + dy, (z + z2) / 2, 0.01); m.rotation.y = -Math.atan2(z2 - z, x2 - x); m.rotation.z = Math.atan2(y2 - y, 1.9); } } }
    put(g, W.bench({ w: 1.4 }), 3.0, hgt(3, -12), -12, Math.PI + 0.2); }
  outlineStatic(g, { width: 0.016, min: 0.06 });
  W.fuseStatic(g, { skip: [ground] });
  return { group: g, hgt };
}
