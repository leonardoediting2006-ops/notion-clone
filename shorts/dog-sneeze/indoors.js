import { THREE } from "../../js/engine.js";
import { toon, toonGradient, outlineStatic } from "../../js/toon.js";
import * as W from "../../js/toonworld.js";
import { tm, mesh, ext, rbox, cyl, ball, canvasTex, texMat, put } from "./build.js";

// The two rooms of dog-sneeze that the flat of dog-kibble does not have: a bedroom and a hallway with the front door.
// Open at the top (no ceiling) so the key light of main.js reaches every corner; the cameras stay inside the walls.

const floorTex = canvasTex(256, 256, (x) => {
  const cols = ["#d9a05f", "#cf9552", "#e2ad6c", "#c98d4c", "#d6a05e", "#cc9250"], pw = 256 / 6;
  for (let i = 0; i < 6; i++) { const j = (i * 83 + 60) % 256; for (const [y0, y1, ci] of [[0, j, i], [j, 256, (i + 3) % 6]]) { x.fillStyle = cols[ci]; x.fillRect(i * pw, y0, pw, y1 - y0); x.fillStyle = "rgba(255,232,196,0.18)"; x.fillRect(i * pw + 4, y0, 8, y1 - y0); } x.fillStyle = "#5a3520"; x.fillRect(i * pw - 1, 0, 2, 256); x.fillRect(i * pw, j - 1, pw, 2); }
});
const dotsBlue = canvasTex(128, 128, (x) => { x.fillStyle = "#a9dcf2"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) { x.fillStyle = "rgba(255,255,255,0.35)"; x.fillRect(i * 32 + 10, 0, 12, 128); x.fillStyle = "rgba(120,185,220,0.35)"; x.fillRect(i * 32 + 28, 0, 3, 128); } x.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 4; i++) for (const [dy, dx] of [[20, 0], [84, 16]]) { x.beginPath(); x.arc(i * 32 + 16 + dx - 8, dy, 2.4, 0, 7); x.fill(); } });
const quiltTex = canvasTex(128, 128, (x) => { const cs = ["#ff7a8a", "#ffd24a", "#3fc9c0", "#fff2dc", "#8a7ae8", "#ff9d3c"]; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = cs[(r * 2 + c * 3) % 6]; x.fillRect(c * 32, r * 32, 32, 32); x.strokeStyle = "rgba(255,255,255,0.55)"; x.setLineDash([4, 4]); x.lineWidth = 2; x.strokeRect(c * 32 + 3, r * 32 + 3, 26, 26); } });
const rugRound = canvasTex(256, 256, (x) => { x.fillStyle = "#fff2dc"; x.fillRect(0, 0, 256, 256); for (const [r, c] of [[124, "#ffb86a"], [96, "#fff2dc"], [68, "#ff8aa0"], [40, "#fff2dc"], [16, "#7fd8c8"]]) { x.fillStyle = c; x.beginPath(); x.arc(128, 128, r, 0, 7); x.fill(); } });
const tileTex = canvasTex(128, 128, (x) => { x.fillStyle = "#2f3340"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#f3ead8"; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64); x.strokeStyle = "rgba(0,0,0,0.15)"; x.lineWidth = 2; x.strokeRect(1, 1, 126, 126); });
const stripePaper = canvasTex(128, 128, (x) => { x.fillStyle = "#f6e6c4"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#efd6a2"; for (let i = 0; i < 4; i++) x.fillRect(i * 32 + 10, 0, 12, 128); x.fillStyle = "rgba(255,255,255,0.5)"; for (let i = 0; i < 4; i++) x.fillRect(i * 32 + 4, 0, 3, 128); });
const sky = canvasTex(64, 128, (x) => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#5fb7f0"); g.addColorStop(1, "#d8f1ff"); x.fillStyle = g; x.fillRect(0, 0, 64, 128); x.fillStyle = "rgba(255,255,255,0.9)"; for (const [a, b, r] of [[16, 90, 14], [30, 84, 18], [44, 92, 13]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); } });
const bookCols = [0xe5566d, 0x3fc9c0, 0xffd24a, 0x6a8fe8, 0xff9d3c, 0x7fd47a, 0xb06ae8];

function books(g, x, y, z, n, ry = 0, along = "z") {
  for (let i = 0; i < n; i++) { const h = 0.2 + 0.06 * ((i * 5) % 3), w = 0.04 + 0.01 * (i % 3); const m = rbox(g, along === "z" ? 0.16 : w, h, along === "z" ? w : 0.16, tm(bookCols[i % 7]), along === "z" ? x : x + i * (w + 0.005), y + h / 2, along === "z" ? z + i * (w + 0.005) : z, 0.008); m.rotation.y = ry; }
}
function plush(g, x, y, z, c, s = 1) { ball(g, 0.09 * s, tm(c), x, y + 0.09 * s, z, 1, 1.05, 0.9); ball(g, 0.07 * s, tm(c), x, y + 0.22 * s, z + 0.01); for (const k of [-1, 1]) ball(g, 0.03 * s, tm(c), x + k * 0.05 * s, y + 0.29 * s, z, 1, 1.3, 0.8); for (const k of [-1, 1]) ball(g, 0.012 * s, tm(0x2b1b16), x + k * 0.025 * s, y + 0.23 * s, z + 0.065 * s); }
function frame(g, x, y, z, w, h, c, ry = 0) { const f = new THREE.Group(); rbox(f, w + 0.08, h + 0.08, 0.04, tm(0xfff2dc), 0, 0, 0, 0.01); rbox(f, w, h, 0.045, tm(c), 0, 0, 0.005, 0.005); ball(f, Math.min(w, h) * 0.22, tm(0xffffff), -w * 0.12, h * 0.1, 0.03, 1, 1, 0.1); put(g, f, x, y, z, ry); }

// ============================================================ the bedroom (x -2.5..2.5, z -2.2..2.2, 2.6 m high)
export function buildBedroom() {
  const g = new THREE.Group();
  ext(g, -2.6, 2.6, -0.08, 0, -2.3, 2.3, texMat(floorTex, 2.4, 2.1));
  const wallM = texMat(dotsBlue, 3.2, 2.2);
  ext(g, -2.6, 2.6, 0, 2.6, -2.3, -2.2, wallM); ext(g, -2.6, -2.5, 0, 2.6, -2.3, 2.3, wallM); ext(g, -2.6, 2.6, 0, 2.6, 2.2, 2.3, wallM);
  // the east wall has a window opening
  ext(g, 2.5, 2.6, 0, 0.95, -2.3, 2.3, wallM); ext(g, 2.5, 2.6, 2.1, 2.6, -2.3, 2.3, wallM); ext(g, 2.5, 2.6, 0.95, 2.1, -2.3, -1.0, wallM); ext(g, 2.5, 2.6, 0.95, 2.1, 1.0, 2.3, wallM);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.15), new THREE.MeshBasicMaterial({ map: sky, fog: false })); pane.rotation.y = -Math.PI / 2; pane.position.set(2.52, 1.52, 0); pane.userData.ink = false; g.add(pane);
  for (const [y0, y1, z0, z1] of [[0.93, 0.99, -1.05, 1.05], [2.06, 2.12, -1.05, 1.05], [0.93, 2.12, -1.05, -1.0], [0.93, 2.12, 1.0, 1.05], [0.93, 2.12, -0.02, 0.02]]) ext(g, 2.4, 2.56, y0, y1, z0, z1, tm(0xffffff), true);
  ext(g, 2.3, 2.62, 0.9, 0.95, -1.2, 1.2, tm(0xffffff), true);                                  // sill
  pot(g, 2.3, 0.4, tm(0xe0703a), 0.93);
  for (const z of [-1.3, 1.3]) { rbox(g, 0.1, 1.5, 0.45, tm(0xffd24a), 2.35, 1.5, z, 0.04); }   // curtains
  cyl(g, 0.015, 0.015, 3.0, tm(0xb98a58), 2.34, 2.3, 0, 8).rotation.x = Math.PI / 2;
  for (const [y0, y1] of [[0, 0.12]]) { ext(g, -2.5, 2.5, y0, y1, -2.2, -2.15, tm(0xffffff)); ext(g, -2.5, -2.45, y0, y1, -2.2, 2.2, tm(0xffffff)); ext(g, -2.5, 2.5, y0, y1, 2.15, 2.2, tm(0xffffff)); }
  // the bed: headboard on the north wall
  { const b = new THREE.Group(); rbox(b, 1.62, 0.28, 2.1, tm(0xb98a58), 0, 0.25, 0, 0.04); rbox(b, 1.5, 0.22, 1.98, tm(0xfdfaf2), 0, 0.5, 0, 0.08);
    const q = rbox(b, 1.52, 0.1, 1.3, texMat(quiltTex, 2, 2.6), 0, 0.63, 0.35, 0.05); q.userData.ink = true;
    for (const x of [-0.4, 0.4]) rbox(b, 0.6, 0.16, 0.38, tm(0xffffff), x, 0.68, -0.72, 0.07);
    rbox(b, 1.7, 1.1, 0.1, tm(0xa87848), 0, 0.82, -1.1, 0.03); rbox(b, 1.7, 0.45, 0.1, tm(0xa87848), 0, 0.38, 1.04, 0.03);
    for (const x of [-0.8, 0.8]) ball(b, 0.06, tm(0xffd23a), x, 1.4, -1.1);
    plush(b, 0.45, 0.68, -0.4, 0xff9fb8, 1.1);
    put(g, b, -0.9, 0, -1.15); }
  // bedside table with a lamp and a clock
  rbox(g, 0.5, 0.5, 0.42, tm(0xe0a766), 0.18, 0.25, -1.95, 0.03); rbox(g, 0.44, 0.04, 0.36, tm(0xffe9b0), 0.18, 0.5, -1.95, 0.01);
  cyl(g, 0.025, 0.04, 0.32, tm(0xd9b04a), 0.12, 0.68, -1.95, 8); const shade = cyl(g, 0.1, 0.16, 0.2, new THREE.MeshToonMaterial({ color: 0xfff0b0, emissive: 0xffd878, emissiveIntensity: 0.6, gradientMap: toonGradient() }), 0.12, 0.92, -1.95, 14); shade.userData.ink = true;
  rbox(g, 0.12, 0.09, 0.05, tm(0xe5566d), 0.34, 0.56, -1.9, 0.015); books(g, 0.28, 0.52, -2.05, 3, 0.2, "x");
  // wardrobe, toy box, dog bed, shelf, pictures, rug, slippers, a sock
  { const w = new THREE.Group(); rbox(w, 0.62, 2.05, 1.3, tm(0xfbf3e4), 0, 1.02, 0, 0.04); for (const z of [-0.32, 0.32]) { rbox(w, 0.04, 1.8, 0.6, tm(0xf0e2c8), 0.32, 1.0, z, 0.02); ball(w, 0.025, tm(0xffd23a), 0.35, 1.0, z + (z < 0 ? 0.2 : -0.2)); } for (const y of [0.18]) rbox(w, 0.04, 0.2, 1.2, tm(0xf0e2c8), 0.32, y, 0, 0.02); put(g, w, -2.2, 0, 1.3); }
  { const tb = new THREE.Group(); rbox(tb, 0.7, 0.42, 0.45, tm(0x3d8fe0), 0, 0.21, 0, 0.05); rbox(tb, 0.74, 0.06, 0.5, tm(0xffd24a), 0, 0.45, 0, 0.02); plush(tb, -0.12, 0.42, 0, 0xffc24a, 1); ball(tb, 0.08, tm(0xff5a4a), 0.18, 0.54, 0.02).userData.ink = true; put(g, tb, 1.9, 0, -1.6, -0.2); }
  { const db = new THREE.Group(); cyl(db, 0.5, 0.52, 0.16, tm(0xff8aa0), 0, 0.08, 0, 24).userData.ink = true; cyl(db, 0.38, 0.38, 0.1, tm(0xfff2dc), 0, 0.14, 0, 24); put(g, db, 1.7, 0, 1.45); }
  rbox(g, 0.1, 0.05, 1.1, tm(0xe0a766), -2.42, 1.35, -0.2, 0.01); books(g, -2.42, 1.38, -0.65, 6, 0, "z"); plush(g, -2.4, 1.38, 0.15, 0x7fd8c8, 0.9);
  frame(g, -0.9, 1.75, -2.17, 0.5, 0.38, 0xffb86a); frame(g, -0.2, 1.7, -2.17, 0.32, 0.4, 0xff8aa0); frame(g, 0.7, 1.8, -2.17, 0.55, 0.38, 0x7fd8c8); frame(g, -2.43, 1.8, 1.0, 0.5, 0.38, 0x8a7ae8, Math.PI / 2);
  { const r = new THREE.Mesh(new THREE.CircleGeometry(1.15, 40).rotateX(-Math.PI / 2), texMat(rugRound, 1, 1)); r.position.set(0.35, 0.012, 0.5); r.receiveShadow = true; r.userData.ink = false; g.add(r); }
  for (const dz of [-0.09, 0.09]) rbox(g, 0.2, 0.07, 0.09, tm(0xff6a8a), 0.95 + dz * 0.3, 0.04, -0.45 + dz, 0.03);
  rbox(g, 0.18, 0.025, 0.07, tm(0xffffff), -0.15, 0.02, 0.5, 0.012).rotation.y = 0.5;
  outlineStatic(g, { width: 0.012, min: 0.05 });
  W.fuseStatic(g, { skip: [pane] });
  return { group: g };
}
function pot(g, x, z, c, y0) { cyl(g, 0.1, 0.075, 0.14, c, x, y0 + 0.07, z, 12); for (let i = 0; i < 6; i++) ball(g, 0.06, tm(i % 2 ? 0x57b345 : 0x7ac95b), x + Math.cos(i * 1.05) * 0.06, y0 + 0.2 + (i % 3) * 0.04, z + Math.sin(i * 1.05) * 0.06, 1, 1.5, 1); }

// ============================================================ the hallway (x -1.25..1.25, z -3.2..2.8) with the front door at the north end
export function buildHallway() {
  const g = new THREE.Group();
  ext(g, -1.35, 1.35, -0.08, 0, -3.3, 2.9, texMat(tileTex, 5.4, 12.2));
  const paper = texMat(stripePaper, 2.4, 2.4);
  ext(g, -1.35, -1.25, 0, 2.7, -3.3, 2.9, paper); ext(g, 1.25, 1.35, 0, 2.7, -3.3, 2.9, paper); ext(g, -1.35, 1.35, 0, 2.7, 2.8, 2.9, paper);
  for (const x of [-1.25, 1.25]) { const s = x < 0 ? 1 : -1; ext(g, x - 0.01 * s, x + 0.06 * s, 0, 0.95, -3.2, 2.8, tm(0xffffff)); ext(g, x - 0.02 * s, x + 0.08 * s, 0.93, 0.99, -3.2, 2.8, tm(0xffffff)); for (let i = 0; i < 8; i++) ext(g, x + 0.06 * s, x + 0.075 * s, 0.1, 0.85, -3.0 + i * 0.7, -2.5 + i * 0.7, tm(0xf1ece0)); }
  // the front door: frame, a red leaf with a glass pane that glows with daylight, mat, a bright garden behind
  ext(g, -1.25, 1.25, 0, 2.7, -3.3, -3.2, tm(0xf6e6c4));
  rbox(g, 1.1, 2.2, 0.08, tm(0xff5a4a), 0, 1.1, -3.19, 0.03); ext(g, -0.62, -0.57, 0, 2.28, -3.22, -3.16, tm(0xffffff), true); ext(g, 0.57, 0.62, 0, 2.28, -3.22, -3.16, tm(0xffffff), true); ext(g, -0.62, 0.62, 2.23, 2.3, -3.22, -3.16, tm(0xffffff), true);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false })); glow.position.set(0, 1.55, -3.135); glow.userData.ink = false; g.add(glow);
  rbox(g, 0.62, 0.08, 0.04, tm(0xffffff), 0, 1.1, -3.13, 0.01);
  ball(g, 0.045, tm(0xffd23a), 0.4, 1.05, -3.12);
  rbox(g, 0.9, 0.03, 0.55, tm(0x9a6a3c), 0, 0.02, -2.85, 0.01);
  rbox(g, 0.9, 0.012, 4.6, tm(0xe5566d), 0, 0.014, -0.35, 0.004);             // the runner
  rbox(g, 0.78, 0.014, 4.5, tm(0xff8aa0), 0, 0.02, -0.35, 0.004);
  // west wall: coat hooks with jackets and the dog's leash, a shoe rack, an umbrella stand
  rbox(g, 0.05, 0.14, 1.6, tm(0xa87848), -1.2, 1.7, -1.4, 0.015);
  for (const [z, c] of [[-2.0, 0x3f8fe0], [-1.55, 0xffd24a], [-1.1, 0x7fd47a], [-0.65, 0xe5566d]]) { cyl(g, 0.012, 0.012, 0.1, tm(0xd9b04a), -1.15, 1.7, z, 5).rotation.z = Math.PI / 2; if (c !== 0xe5566d) rbox(g, 0.13, 0.86, 0.34, tm(c), -1.08, 1.2, z, 0.05); }
  mesh(g, new THREE.TorusGeometry(0.17, 0.014, 6, 20, Math.PI * 1.5), tm(0xe5566d), -1.1, 1.52, -0.65).rotation.y = Math.PI / 2;     // the leash
  rbox(g, 0.05, 0.1, 0.06, tm(0xc8ccd8), -1.12, 1.72, -0.65, 0.01);
  rbox(g, 0.34, 0.5, 0.9, tm(0xfbf3e4), -1.05, 0.25, -2.2, 0.03); rbox(g, 0.34, 0.03, 0.9, tm(0xe0a766), -1.05, 0.28, -2.2, 0.01); for (const [z, c] of [[-2.45, 0x3f8fe0], [-2.2, 0xffd24a], [-1.95, 0xe5566d]]) rbox(g, 0.28, 0.09, 0.11, tm(c), -1.05, 0.34, z, 0.03);
  cyl(g, 0.12, 0.1, 0.5, tm(0x3d8fe0), -1.02, 0.25, 0.1, 12).userData.ink = true; for (const k of [0, 1]) cyl(g, 0.012, 0.012, 0.55, tm(k ? 0xff5a4a : 0xffd24a), -1.02 + k * 0.04, 0.7, 0.1 + k * 0.03, 5);
  // east wall: a console with a mirror, a vase of flowers, a bowl, framed pictures and a wall clock
  rbox(g, 0.36, 0.06, 1.25, tm(0xe0a766), 1.05, 0.78, -1.4, 0.015); for (const z of [-1.95, -0.85]) { rbox(g, 0.05, 0.76, 0.05, tm(0xa87848), 1.0, 0.38, z, 0.01); }
  rbox(g, 0.04, 0.8, 0.6, tm(0xfff2dc), 1.22, 1.55, -1.4, 0.02); { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.74), new THREE.MeshBasicMaterial({ color: 0xcfe6f6 })); m.rotation.y = -Math.PI / 2; m.position.set(1.195, 1.55, -1.4); m.userData.ink = false; g.add(m); }
  cyl(g, 0.07, 0.05, 0.22, tm(0x6ac8ff), 1.05, 0.9, -1.65, 12).userData.ink = true; for (let i = 0; i < 7; i++) { const a = i * 0.9; cyl(g, 0.006, 0.006, 0.3, tm(0x57b345), 1.05 + Math.cos(a) * 0.03, 1.1, -1.65 + Math.sin(a) * 0.04, 4).rotation.z = Math.cos(a) * 0.35; ball(g, 0.05, tm([0xff8fb3, 0xffd34e, 0xffffff][i % 3]), 1.05 + Math.cos(a) * 0.1, 1.27, -1.65 + Math.sin(a) * 0.1); }
  cyl(g, 0.11, 0.07, 0.07, tm(0xffd24a), 1.05, 0.84, -1.15, 14); for (const [dx, dz] of [[0.02, 0.02], [-0.03, -0.01]]) ball(g, 0.015, tm(0xc8ccd8), 1.05 + dx, 0.89, -1.15 + dz);
  frame(g, 1.2, 1.6, -0.4, 0.42, 0.34, 0xffb86a, -Math.PI / 2); frame(g, 1.2, 1.55, 0.35, 0.34, 0.42, 0x7fd8c8, -Math.PI / 2); frame(g, 1.2, 1.7, 1.1, 0.5, 0.36, 0xff8aa0, -Math.PI / 2);
  // a dog bed and bowl by the door, a basket of toys
  { const db = new THREE.Group(); cyl(db, 0.42, 0.44, 0.14, tm(0x3d8fe0), 0, 0.07, 0, 24).userData.ink = true; cyl(db, 0.32, 0.32, 0.09, tm(0xfff2dc), 0, 0.12, 0, 24); put(g, db, 0.7, 0, -2.45); }
  { const bw = new THREE.Group(); cyl(bw, 0.1, 0.07, 0.07, tm(0xff5a4a), 0, 0.035, 0, 14).userData.ink = true; cyl(bw, 0.085, 0.085, 0.01, tm(0x62bfea), 0, 0.07, 0, 14); put(g, bw, -0.55, 0, -2.7); }
  // a hanging lamp
  cyl(g, 0.005, 0.005, 0.5, tm(0x2e3340), 0, 2.45, -0.8, 4); ball(g, 0.16, new THREE.MeshToonMaterial({ color: 0xfff0b0, emissive: 0xffd878, emissiveIntensity: 0.7, gradientMap: toonGradient() }), 0, 2.15, -0.8).userData.ink = true;
  outlineStatic(g, { width: 0.012, min: 0.05 });
  W.fuseStatic(g, { skip: [glow] });
  return { group: g };
}
