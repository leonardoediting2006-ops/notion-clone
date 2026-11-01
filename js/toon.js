// Toon (cel-shaded) look for the 3D world: stepped lighting, soft rounded blocks and a dark ink outline.
//
//   import { toon, roundedBox, outline, outlineStatic, toonify, INK } from "../../js/toon.js";
//   const sofa = new THREE.Mesh(roundedBox(2, 0.5, 0.9, 0.08), toon(0xe8735a));
//   outline(dog);                 // moving things: an outline mesh rides along with every part
//   outlineStatic(room);          // still things: one merged outline mesh for the whole group
//
// Nothing here uses randomness or the clock, so every frame is reproducible.

import { THREE } from "./engine.js";
import { mergeGeometries } from "../lib/jsm/utils/BufferGeometryUtils.js";

export const INK = 0x2b1b16;

let gradient;
export function toonGradient() {
  if (!gradient) {
    // three light steps: shade, mid, lit
    gradient = new THREE.DataTexture(new Uint8Array([110, 180, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const cache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) cache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts }));
  return cache.get(key);
}

// A box with rounded edges and smooth normals (like three's RoundedBoxGeometry, without the UV work).
export function roundedBox(w, h, d, radius = 0.05, segments = 2) {
  const s = segments * 2 + 1;
  radius = Math.min(w / 2, h / 2, d / 2, radius);
  const g = new THREE.BoxGeometry(1, 1, 1, s, s, s).toNonIndexed();
  const pos = g.attributes.position, nor = g.attributes.normal;
  const hs = 0.5 / s;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const bx = w / 2 - radius, by = h / 2 - radius, bz = d / 2 - radius;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.set(v.x - Math.sign(v.x) * hs, v.y - Math.sign(v.y) * hs, v.z - Math.sign(v.z) * hs).normalize();
    pos.setXYZ(i, bx * Math.sign(v.x) + n.x * radius, by * Math.sign(v.y) + n.y * radius, bz * Math.sign(v.z) + n.z * radius);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return g;
}

// ---- outlines (inverted hull: a slightly bigger copy of each mesh, drawn inside-out in ink) ----
const inkMats = new Map();
const inkMat = (color) => {
  if (!inkMats.has(color)) inkMats.set(color, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  return inkMats.get(color);
};

function eligible(o, min) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.ink === false || o.userData.isOutline) return false;
  const m = o.material;
  if (!m || Array.isArray(m) || m.isMeshBasicMaterial || m.transparent || m.side === THREE.BackSide) return false;
  o.geometry.computeBoundingBox();
  const s = o.geometry.boundingBox.getSize(new THREE.Vector3());
  return Math.max(s.x, s.y, s.z) >= min;
}

// scale + offset that grows a geometry's bounding box by `width` (world units) on every side
function growth(o, width) {
  const bb = o.geometry.boundingBox;
  const size = bb.getSize(new THREE.Vector3());
  const centre = bb.getCenter(new THREE.Vector3());
  const ws = o.getWorldScale(new THREE.Vector3());
  const scale = new THREE.Vector3(
    1 + (2 * width) / (Math.max(size.x, 0.012) * Math.abs(ws.x)),
    1 + (2 * width) / (Math.max(size.y, 0.012) * Math.abs(ws.y)),
    1 + (2 * width) / (Math.max(size.z, 0.012) * Math.abs(ws.z)),
  );
  scale.clampScalar(1, 2.2);
  return { scale, offset: centre.clone().multiply(new THREE.Vector3(1, 1, 1).sub(scale)) };
}

// For things that move (the dog): every part gets an outline child that moves with it.
export function outline(root, { color = INK, width = 0.012, min = 0.04 } = {}) {
  root.updateWorldMatrix(true, true);
  const jobs = [];
  root.traverse((o) => eligible(o, min) && jobs.push(o));
  for (const o of jobs) {
    const { scale, offset } = growth(o, width);
    const hull = new THREE.Mesh(o.geometry, inkMat(color));
    hull.userData.isOutline = true;
    hull.scale.copy(scale);
    hull.position.copy(offset);
    o.add(hull);
  }
  return root;
}

// For things that never move (the room): one merged outline mesh, added to `root`.
export function outlineStatic(root, { color = INK, width = 0.014, min = 0.05 } = {}) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const geos = [];
  root.traverse((o) => {
    if (!eligible(o, min)) return;
    for (let p = o; p; p = p.parent) if (p.visible === false) return;
    const { scale, offset } = growth(o, width);
    const g = o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    g.applyMatrix4(new THREE.Matrix4().compose(offset, new THREE.Quaternion(), scale));
    g.applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    geos.push(g.index ? g.toNonIndexed() : g);
  });
  if (!geos.length) return null;
  const hull = new THREE.Mesh(mergeGeometries(geos, false), inkMat(color));
  hull.userData.isOutline = true;
  root.add(hull);
  return hull;
}

// ---- turn a realistic (standard-material) model into flat toon colours ----
function averageColor(tex) {
  const img = tex?.image;
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}
// `override`: [[originalMaterial, 0xhex], ...] to pick exact colours (e.g. the dog's fur materials) instead of the texture average
export function toonify(root, { override = [] } = {}) {
  const exact = new Map(override);
  root.traverse((o) => {
    const m = o.material;
    if (!o.isMesh || !m || Array.isArray(m) || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return;
    if (exact.has(m)) { o.material = toon(exact.get(m)); return; }
    const c = m.color.clone();
    const avg = averageColor(m.map);
    if (avg) c.multiply(avg);
    o.material = toon(c.getHex());
  });
  return root;
}

// a cheap soft contact shadow for flat figures
export function blobShadow(radiusX = 0.35, radiusZ = 0.14, opacity = 0.28) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(40,20,10,1)");
  g.addColorStop(0.6, "rgba(40,20,10,0.8)");
  g.addColorStop(1, "rgba(40,20,10,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }),
  );
  m.position.y = 0.004;
  m.userData.ink = false;
  return m;
}
