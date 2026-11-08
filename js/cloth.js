// Soft cloth that lies in piles and drapes over whatever is under it, without ever poking through.
//
//   import { createSheet, drape, pileTop } from "../../js/cloth.js";
//   const tee = createSheet({ kind: "tee", w: 0.8, d: 0.8, color: "#ffcf2e" });
//   scene.add(tee.mesh);
//   drape(tee, { x: 0.4, z: 3.8, rot: 0.6 }, { floor: (x, z) => 0, under: [jeans], rays: dogMeshes });
//
// A garment is a flat, subdivided sheet. Its silhouette (a tee, hoodie, jeans, jacket, sock) is painted on a canvas with an ink outline and
// folds, and cut out with alphaTest (the shadow follows the cut-out too). drape() then sets the height of every vertex from what is below it:
// the floor, the garments under it (stacked, each a clear cloth-thickness above the last), and any meshes (a dog) found by casting a ray
// straight down; a max-blur lets the cloth bridge gaps and round off sharp edges the way real cloth does, and it can never end up inside
// what it covers. Pure functions of their inputs: no clock, no randomness, so any frame can be rendered on its own.

import { THREE } from "./engine.js";
import { toonGradient } from "./toon.js";

const INK = "#2b1b16";
const DOWN = new THREE.Vector3(0, -1, 0);
const rc = new THREE.Raycaster();
rc.firstHitOnly = true;
const origin = new THREE.Vector3();

// ---------------------------------------------------------------- the painted garments (top view, 512 x 512, collar at the top)
function shade(hex, k) { // mix towards a cool dark (the cel-shade tone)
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = [40, 24, 90];
  return `rgb(${Math.round(r + (m[0] - r) * k)},${Math.round(g + (m[1] - g) * k)},${Math.round(b + (m[2] - b) * k)})`;
}
const SHAPES = {
  tee: (x) => { x.moveTo(212, 122); x.quadraticCurveTo(256, 196, 300, 122); [[360, 128], [470, 232], [425, 292], [372, 238], [372, 470], [140, 470], [140, 238], [87, 292], [42, 232], [152, 128]].forEach(([a, b]) => x.lineTo(a, b)); x.closePath(); },
  hoodie: (x) => { x.moveTo(206, 120); x.quadraticCurveTo(256, 188, 306, 120); [[362, 128], [452, 230], [472, 430], [410, 440], [380, 300], [372, 480], [140, 480], [132, 300], [102, 440], [40, 430], [60, 230], [150, 128]].forEach(([a, b]) => x.lineTo(a, b)); x.closePath(); },
  jacket: (x) => { x.moveTo(200, 112); x.lineTo(256, 190); x.lineTo(312, 112); [[368, 126], [458, 232], [478, 440], [412, 450], [382, 310], [378, 486], [134, 486], [130, 310], [100, 450], [34, 440], [54, 232], [144, 126]].forEach(([a, b]) => x.lineTo(a, b)); x.closePath(); },
  jeans: (x) => { [[142, 40], [370, 40], [392, 486], [284, 486], [256, 214], [228, 486], [120, 486]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); },
  sock: (x) => { [[196, 40], [316, 40], [322, 330], [438, 372], [458, 452], [360, 488], [196, 440]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); },
};
export function garmentCanvas(kind, { color = "#4aa3e0", stripe = null, accent = "#ffffff", size = 512 } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d");
  x.scale(size / 512, size / 512);
  x.lineJoin = "round"; x.lineCap = "round";
  const path = () => { x.beginPath(); SHAPES[kind](x); };
  path(); x.fillStyle = color; x.fill();
  x.save(); path(); x.clip();
  // the lit side / cel-shade side, a soft highlight and the details of each garment
  x.fillStyle = shade(color, 0.28); x.beginPath(); x.moveTo(330, 0); x.lineTo(512, 0); x.lineTo(512, 512); x.lineTo(250, 512); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,0.20)"; x.beginPath(); x.ellipse(190, 250, 46, 120, 0.15, 0, 7); x.fill();
  if (stripe) { x.fillStyle = stripe; for (const y of kind === "sock" ? [60, 100] : [300, 350, 400]) x.fillRect(0, y, 512, 22); }
  x.strokeStyle = "rgba(40,20,80,0.32)"; x.lineWidth = 7;
  for (const [a, b, c1, d, e, f] of [[190, 250, 215, 300, 250, 330], [330, 270, 312, 330, 318, 410], [210, 400, 240, 420, 300, 424], [120, 240, 110, 275, 140, 300]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(c1, d, e, f); x.stroke(); }
  if (kind === "tee" || kind === "hoodie" || kind === "jacket") { x.strokeStyle = shade(color, 0.5); x.lineWidth = 14; x.beginPath(); x.moveTo(214, 124); x.quadraticCurveTo(256, 190, 298, 124); x.stroke(); }
  if (kind === "hoodie") { x.strokeStyle = shade(color, 0.4); x.lineWidth = 8; x.strokeRect(176, 372, 160, 70); x.strokeStyle = accent; x.lineWidth = 6; for (const dx of [-14, 14]) { x.beginPath(); x.moveTo(256 + dx, 196); x.lineTo(256 + dx * 1.4, 270); x.stroke(); } }
  if (kind === "jacket") { x.strokeStyle = "#e8d9a8"; x.lineWidth = 8; x.setLineDash([14, 10]); x.beginPath(); x.moveTo(256, 192); x.lineTo(256, 486); x.stroke(); x.setLineDash([]); x.strokeStyle = shade(color, 0.45); x.lineWidth = 8; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(256 + s * 80, 390); x.lineTo(256 + s * 120, 330); x.stroke(); } }
  if (kind === "jeans") { x.strokeStyle = "rgba(255,255,255,0.6)"; x.lineWidth = 4; x.setLineDash([10, 8]); for (const p of [[256, 214, 256, 70], [150, 60, 150, 140], [362, 60, 362, 140]]) { x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[2], p[3]); x.stroke(); } x.setLineDash([]); x.strokeStyle = shade(color, 0.45); x.lineWidth = 7; x.beginPath(); x.moveTo(150, 80); x.quadraticCurveTo(200, 130, 250, 90); x.stroke(); x.beginPath(); x.moveTo(362, 80); x.quadraticCurveTo(312, 130, 262, 90); x.stroke(); x.fillStyle = "#e8c24a"; x.fillRect(240, 50, 32, 26); }
  x.restore();
  path(); x.strokeStyle = INK; x.lineWidth = 12; x.stroke();
  return c;
}

// deterministic smooth noise for wrinkles
const wr = (x, z, s) => 0.5 + 0.25 * Math.sin(x * 11.3 + s) * Math.cos(z * 9.1 - s * 1.7) + 0.15 * Math.sin((x + z) * 19.7 + s * 2.3) + 0.1 * Math.cos(x * 27.1 - z * 23.3 + s);

// ---------------------------------------------------------------- the sheet
export function createSheet({ kind = "tee", w = 0.8, d = 0.8, seg = 36, color = "#4aa3e0", stripe = null, accent = "#ffffff", seed = 1 } = {}) {
  const canvas = garmentCanvas(kind, { color, stripe, accent });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(w, d, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshToonMaterial({ map: tex, gradientMap: toonGradient(), alphaTest: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.ink = false; mesh.frustumCulled = false;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  const n = seg + 1, pos = geo.attributes.position, lx = new Float32Array(n * n), lz = new Float32Array(n * n);
  for (let v = 0; v < n * n; v++) { lx[v] = pos.getX(v); lz[v] = pos.getZ(v); }
  // which vertices lie on the garment (the alpha under them, grown by one cell so the stack has no holes at the edges)
  const px = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  const on = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const X = Math.round((i / seg) * (canvas.width - 1)), Y = Math.round((j / seg) * (canvas.height - 1)); on[j * n + i] = px[(Y * canvas.width + X) * 4 + 3] > 128 ? 1 : 0; }
  const mask = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let m = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < n && b < n && on[b * n + a]) m = 1; } mask[j * n + i] = m; }
  // distance to the edge (in cells, capped): the garment is pillowy in the middle and thin at the edges
  const dist = new Float32Array(n * n).fill(99);
  for (let v = 0; v < n * n; v++) if (!mask[v]) dist[v] = 0;
  for (let pass = 0; pass < 2; pass++) {
    const rev = pass === 1;
    for (let jj = 0; jj < n; jj++) for (let ii = 0; ii < n; ii++) {
      const j = rev ? n - 1 - jj : jj, i = rev ? n - 1 - ii : ii, v = j * n + i;
      for (const [a, b, w2] of rev ? [[1, 0, 1], [0, 1, 1], [1, 1, 1.41], [-1, 1, 1.41]] : [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.41], [1, -1, 1.41]]) {
        const x2 = i + a, y2 = j + b;
        if (x2 >= 0 && y2 >= 0 && x2 < n && y2 < n) dist[v] = Math.min(dist[v], dist[y2 * n + x2] + w2);
      }
    }
  }
  const cap = Math.max(3, seg * 0.16), puffProfile = new Float32Array(n * n);
  for (let v = 0; v < n * n; v++) { const k = Math.min(1, dist[v] / cap); puffProfile[v] = k * k * (3 - 2 * k); }
  const s = { kind, mesh, seg, w, d, n, lx, lz, mask, seed, puffProfile, raw: new Float32Array(n * n), final: new Float32Array(n * n), place: { x: 0, z: 0, rot: 0 }, wx: new Float32Array(n * n), wz: new Float32Array(n * n) };
  // height of this garment at a world point (-Infinity where there is none); `final` = what is drawn, `raw` = before any squashing
  s.sampleAt = (x, z, which = "final") => {
    const { x: px0, z: pz0, rot } = s.place, c = Math.cos(rot), sn = Math.sin(rot);
    const dx = x - px0, dz = z - pz0;
    const u = ((dx * c - dz * sn + w / 2) / w) * seg, v = ((dx * sn + dz * c + d / 2) / d) * seg;
    if (u < 0 || v < 0 || u > seg || v > seg) return -Infinity;
    const i = Math.min(seg - 1, Math.floor(u)), j = Math.min(seg - 1, Math.floor(v)), fu = u - i, fv = v - j, H = s[which];
    let sum = 0, wsum = 0;
    for (const [a, b, wt] of [[i, j, (1 - fu) * (1 - fv)], [i + 1, j, fu * (1 - fv)], [i, j + 1, (1 - fu) * fv], [i + 1, j + 1, fu * fv]]) if (mask[b * n + a]) { sum += H[b * n + a] * wt; wsum += wt; }
    return wsum > 0.35 ? sum / wsum : -Infinity;
  };
  return s;
}

function boxBlur(h, n, r) {
  if (r <= 0) return h;
  const t = new Float32Array(h.length), o = new Float32Array(h.length);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let sum = 0, c = 0; for (let k = -r; k <= r; k++) { const a = i + k; if (a >= 0 && a < n) { sum += h[j * n + a]; c++; } } t[j * n + i] = sum / c; }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let sum = 0, c = 0; for (let k = -r; k <= r; k++) { const b = j + k; if (b >= 0 && b < n) { sum += t[b * n + i]; c++; } } o[j * n + i] = sum / c; }
  return o;
}

// Drape a sheet. place: { x, z, rot } (rot about the vertical axis). env:
//   floor(x, z)      height of the ground under it (default 0)
//   under: [sheets]  garments below it (uses their `raw` heights, so it can stack on a pile)
//   rays: [meshes]   things to rest on, found by casting a ray straight down (a dog); call updateMatrixWorld first
//   thick, blur, wrinkle, rayGap, puff   cloth thickness, softening radius (cells), wrinkle height, clearance over rays, how pillowy the middle is (m)
export function drape(s, place, env = {}) {
  const { floor = () => 0, under = [], rays = null, thick = 0.02, blur = 2, wrinkle = 0.01, rayGap = 0.022, puff = 0 } = env;
  s.place.x = place.x; s.place.z = place.z; s.place.rot = place.rot ?? 0;
  const { n, lx, lz, wx, wz } = s, c = Math.cos(s.place.rot), sn = Math.sin(s.place.rot), H = new Float32Array(n * n);
  for (let v = 0; v < n * n; v++) {
    const x = s.place.x + lx[v] * c + lz[v] * sn, z = s.place.z - lx[v] * sn + lz[v] * c;
    wx[v] = x; wz[v] = z;
    let t = floor(x, z);
    for (const u of under) { const g = u.sampleAt(x, z, "raw"); if (g > -Infinity) t = Math.max(t, g + thick); }
    if (rays) { origin.set(x, 4, z); rc.set(origin, DOWN); const hit = rc.intersectObjects(rays, false); if (hit.length) t = Math.max(t, hit[0].point.y + rayGap); }
    H[v] = t;
  }
  // soften: blur, but never end up below what is underneath (so it bridges gaps and rounds edges, and cannot sink into anything)
  let B = boxBlur(H, n, blur);
  for (let v = 0; v < n * n; v++) B[v] = Math.max(B[v], H[v]);
  B = boxBlur(B, n, 1);
  for (let v = 0; v < n * n; v++) B[v] = Math.max(B[v], H[v]) + puff * s.puffProfile[v] + wrinkle * wr(wx[v], wz[v], s.seed);
  s.raw.set(B); s.final.set(B);
  return s;
}

// Squash a stack of garments where something heavy lies (comp(x, z) in 0..1 = how much), then write the heights into the meshes
export function settle(sheets, comp, floor = () => 0, maxSquash = 0.55) {
  for (const s of sheets) for (let v = 0; v < s.n * s.n; v++) {
    const f = floor(s.wx[v], s.wz[v]), k = comp ? comp(s.wx[v], s.wz[v]) : 0;
    s.final[v] = f + (s.raw[v] - f) * (1 - maxSquash * k);
  }
}

export function commit(s) {
  const pos = s.mesh.geometry.attributes.position, { n, wx, wz, final } = s;
  for (let v = 0; v < n * n; v++) pos.setXYZ(v, wx[v], final[v], wz[v]);
  pos.needsUpdate = true;
  s.mesh.position.set(0, 0, 0); s.mesh.rotation.set(0, 0, 0);
  s.mesh.geometry.computeVertexNormals();
  s.mesh.geometry.computeBoundingSphere();
}

// the top of a stack of garments at a world point (after squashing), or `floorH` where there is none
export function pileTop(sheets, x, z, floorH = 0) {
  let t = floorH;
  for (const s of sheets) { const g = s.sampleAt(x, z, "final"); if (g > t) t = g; }
  return t;
}

// the meshes of a model that a ray should hit (not the ink outlines)
export function colliders(root) {
  const out = [];
  root.traverseVisible((o) => { if (o.isMesh && !o.userData.isOutline && !(o.material?.transparent)) out.push(o); });
  return out;
}
