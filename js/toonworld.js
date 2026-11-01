// Outdoor toon world builders (parks, gardens, streets): trees, bushes, flowers, benches, houses, ponds, hills, clouds.
// Everything is a toon material + rounded shape; call outlineStatic(group) then fuseStatic(group) once the scene is built.
//
// The palette is deliberately natural and soft (fresh greens, warm sand, cream walls, one terracotta roof) so the flat
// 2D people and the dog are the brightest things in the picture.

import { THREE } from "./engine.js";
import { toon, roundedBox, toonGradient } from "./toon.js";
import { mergeGeometries } from "../lib/jsm/utils/BufferGeometryUtils.js";

export const PAL = {
  skyTop: "#79c4ee", skyLow: "#fff2d8",
  grass: 0x93d46c, grassLight: 0xaee07f, grassDark: 0x7bbf5a,
  sand: 0xf2dcb4, sandEdge: 0xe2c28c,
  trunk: 0x8b5b3c, leaf: 0x58b565, leaf2: 0x73c777, leafDark: 0x429c58, pine: 0x3c9a66, pine2: 0x4fb07a,
  wood: 0xc98552, woodDark: 0x9a6038, metal: 0x3d4452,
  cream: 0xfff1d3, wall2: 0xf6dcc0, wall3: 0xd9ecf2, roof: 0xd9734f, roof2: 0x7d96d8, door: 0x4f7ccf, glass: 0xbfe7f7,
  water: 0x62bfea, waterLight: 0xb4e6f8, pink: 0xff8fb3, yellow: 0xffd34e, white: 0xffffff, purple: 0xa890e8,
  hill1: 0x8fd18a, hill2: 0x7cc57d, hill3: 0xa6dca0,
};

let seed = 11;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const reseed = (s) => (seed = s);

const mesh = (parent, geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
};
const box = (p, w, h, d, c, x, y, z, r = 0.03) => mesh(p, roundedBox(w, h, d, r), toon(c), x, y, z);
const cyl = (p, rt, rb, h, c, x, y, z, seg = 16) => mesh(p, new THREE.CylinderGeometry(rt, rb, h, seg), toon(c), x, y, z);
const ball = (p, r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const m = mesh(p, new THREE.SphereGeometry(r, 18, 13), toon(c), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

// ---------- sky, ground ----------
export function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, PAL.skyTop); g.addColorStop(0.62, "#b9e3f7"); g.addColorStop(1, PAL.skyLow);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function grassMaterial(repeat = [16, 12]) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#" + PAL.grass.toString(16);
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { // big soft two-tone patches
    x.fillStyle = i % 2 ? "#" + PAL.grassLight.toString(16) : "#" + PAL.grassDark.toString(16);
    x.globalAlpha = 0.5;
    x.beginPath(); x.ellipse(rnd() * 512, rnd() * 512, 30 + rnd() * 60, 14 + rnd() * 30, 0, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  x.strokeStyle = "#" + PAL.grassDark.toString(16); x.lineWidth = 4; x.lineCap = "round"; // little grass tufts
  for (let i = 0; i < 260; i++) {
    const px = rnd() * 512, py = rnd() * 512, k = 0.8 + rnd() * 0.9;
    x.strokeStyle = i % 3 ? "#" + PAL.grassDark.toString(16) : "#" + PAL.grassLight.toString(16);
    x.lineWidth = 5 * k;
    x.beginPath(); x.moveTo(px - 12 * k, py); x.quadraticCurveTo(px - 8 * k, py - 14 * k, px - 5 * k, py - 24 * k);
    x.moveTo(px, py); x.quadraticCurveTo(px + 2 * k, py - 18 * k, px, py - 30 * k);
    x.moveTo(px + 12 * k, py); x.quadraticCurveTo(px + 8 * k, py - 14 * k, px + 5 * k, py - 24 * k); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() });
}

// ---------- plants ----------
export function tree({ h = 2.6, r = 1.2, kind = "round", tint = 0 } = {}) {
  const g = new THREE.Group();
  if (kind === "pine") {
    cyl(g, 0.1, 0.14, h * 0.35, PAL.trunk, 0, h * 0.175, 0, 10);
    for (let i = 0; i < 3; i++) {
      const rr = r * (1 - i * 0.26), hh = h * 0.42, y = h * 0.3 + i * h * 0.24;
      mesh(g, new THREE.ConeGeometry(rr, hh, 12), toon(i % 2 ? PAL.pine2 : PAL.pine), 0, y + hh / 2, 0);
    }
    return g;
  }
  const a = [PAL.leaf, PAL.leaf2, PAL.leafDark];
  cyl(g, 0.12, 0.2, h * 0.55, PAL.trunk, 0, h * 0.275, 0, 10);
  const top = h * 0.62;
  ball(g, r, a[(0 + tint) % 3], 0, top + r * 0.55, 0, 1, 0.9, 1);
  ball(g, r * 0.72, a[(1 + tint) % 3], r * 0.7, top + r * 0.3, r * 0.2);
  ball(g, r * 0.68, a[(2 + tint) % 3], -r * 0.66, top + r * 0.25, -r * 0.15);
  ball(g, r * 0.6, a[(1 + tint) % 3], r * 0.1, top + r * 1.15, r * 0.1);
  return g;
}

export function bush(r = 0.5, tint = 0) {
  const g = new THREE.Group();
  const a = [PAL.leaf, PAL.leaf2, PAL.leafDark];
  ball(g, r, a[tint % 3], 0, r * 0.7, 0, 1, 0.8, 1);
  ball(g, r * 0.7, a[(tint + 1) % 3], r * 0.8, r * 0.5, 0.1);
  ball(g, r * 0.65, a[(tint + 2) % 3], -r * 0.75, r * 0.45, -0.05);
  return g;
}

export function flowerBed(w, d, n, colors = [PAL.pink, PAL.yellow, PAL.white, PAL.purple]) {
  const g = new THREE.Group();
  box(g, w, 0.08, d, 0x8a6a4a, 0, 0.04, 0, 0.03); // soil
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * (w - 0.12), z = (rnd() - 0.5) * (d - 0.1);
    const c = colors[i % colors.length];
    cyl(g, 0.012, 0.012, 0.2, PAL.leafDark, x, 0.17, z, 5);
    ball(g, 0.05, c, x, 0.3, z);
    ball(g, 0.022, 0xffe27a, x, 0.32, z + 0.035);
    ball(g, 0.05, PAL.leaf2, x + 0.04, 0.14, z, 1.3, 0.35, 0.8);
  }
  return g;
}

// ---------- street furniture ----------
export function bench({ w = 1.4 } = {}) {
  const g = new THREE.Group(); // faces +z
  for (let i = 0; i < 3; i++) box(g, w, 0.045, 0.12, i % 2 ? PAL.wood : 0xd18d58, 0, 0.45, 0.18 - i * 0.14, 0.015);
  for (let i = 0; i < 2; i++) box(g, w, 0.11, 0.04, i ? PAL.wood : 0xd18d58, 0, 0.72 + i * 0.14, -0.2, 0.015).rotation.x = -0.12;
  for (const s of [-1, 1]) {
    box(g, 0.05, 0.5, 0.5, PAL.metal, s * (w / 2 - 0.04), 0.25, 0.0, 0.015);
    box(g, 0.07, 0.05, 0.5, PAL.woodDark, s * (w / 2 - 0.04), 0.62, 0.0, 0.015);
    box(g, 0.05, 0.4, 0.05, PAL.metal, s * (w / 2 - 0.04), 0.62, -0.22, 0.015).rotation.x = -0.12;
  }
  return g;
}

export function lampPost(h = 2.6) {
  const g = new THREE.Group();
  cyl(g, 0.12, 0.16, 0.15, PAL.metal, 0, 0.075, 0, 12);
  cyl(g, 0.04, 0.05, h, PAL.metal, 0, h / 2, 0, 10);
  const lamp = box(g, 0.28, 0.34, 0.28, PAL.cream, 0, h + 0.12, 0, 0.06);
  lamp.material = new THREE.MeshToonMaterial({ color: 0xfff0b0, gradientMap: toonGradient(), emissive: 0xffe08a, emissiveIntensity: 0.5 });
  cyl(g, 0.01, 0.22, 0.14, PAL.metal, 0, h + 0.36, 0, 4).rotation.y = Math.PI / 4;
  return g;
}

export function picketFence(length, { h = 0.8, step = 0.22 } = {}) {
  const g = new THREE.Group(); // runs along x, centred
  const n = Math.round(length / step);
  for (let i = 0; i <= n; i++) {
    const x = -length / 2 + (i * length) / n;
    box(g, 0.11, h, 0.04, PAL.white, x, h / 2, 0, 0.02);
    mesh(g, new THREE.ConeGeometry(0.055, 0.1, 4).rotateY(Math.PI / 4), toon(PAL.white), x, h + 0.04, 0);
  }
  for (const y of [h * 0.3, h * 0.72]) box(g, length + 0.1, 0.07, 0.05, 0xf3ebe0, 0, y, -0.03, 0.02);
  return g;
}

export function house({ w = 3.2, h = 2.2, d = 2.6, wall = PAL.cream, roof = PAL.roof, door = PAL.door } = {}) {
  const g = new THREE.Group(); // front faces +z
  box(g, w, h, d, wall, 0, h / 2, 0, 0.05);
  const r = mesh(g, new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4), toon(roof), 0, h + 0.55, 0);
  r.scale.set((w / 2) * 1.5, 1.1, (d / 2) * 1.5);
  box(g, 0.3, 0.8, 0.3, 0xb88a6a, w * 0.25, h + 0.7, -d * 0.1, 0.03); // chimney
  box(g, 0.62, 1.15, 0.06, door, -w * 0.18, 0.58, d / 2 + 0.01, 0.03);
  ball(g, 0.04, PAL.yellow, -w * 0.18 + 0.2, 0.58, d / 2 + 0.06);
  for (const s of [0.28, -0.7]) {
    box(g, 0.78, 0.7, 0.06, 0xffffff, w * s * 0.9 + (s > 0 ? 0.1 : 0), h * 0.58, d / 2 + 0.01, 0.03);
    box(g, 0.64, 0.56, 0.07, PAL.glass, w * s * 0.9 + (s > 0 ? 0.1 : 0), h * 0.58, d / 2 + 0.02, 0.02);
  }
  return g;
}

export function cloud(s = 1) {
  const g = new THREE.Group();
  for (const [x, y, r] of [[0, 0, 1], [1.1, -0.15, 0.8], [-1.1, -0.2, 0.75], [0.5, 0.45, 0.75], [-0.4, 0.35, 0.7]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * s, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    b.position.set(x * s, y * s, 0);
    g.add(b);
  }
  g.scale.z = 0.4;
  g.traverse((o) => (o.userData.ink = false));
  return g;
}

export function hill(r, hgt, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14), toon(color));
  m.scale.y = hgt / r;
  m.receiveShadow = true;
  m.userData.ink = false;
  return m;
}

export function pond(radius = 1.4) {
  const g = new THREE.Group();
  cyl(g, radius + 0.18, radius + 0.2, 0.06, PAL.sandEdge, 0, 0.03, 0, 36);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#" + PAL.water.toString(16); x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "#" + PAL.waterLight.toString(16); x.lineWidth = 6; x.lineCap = "round";
  for (const [cx, cy, rr, a] of [[90, 100, 40, 0.2], [170, 150, 52, 3.4], [110, 190, 30, 2]]) { x.beginPath(); x.arc(cx, cy, rr, a, a + 1.2); x.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const water = mesh(g, new THREE.CircleGeometry(radius, 36).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }), 0, 0.065, 0);
  water.castShadow = false;
  for (const [x1, z1, rr] of [[-0.4, 0.2, 0.2], [0.5, -0.3, 0.16]]) {
    cyl(g, rr, rr, 0.012, PAL.leaf2, x1, 0.075, z1, 16);
    ball(g, 0.05, PAL.pink, x1 + 0.03, 0.1, z1 - 0.02);
  }
  return g;
}

export function duck() {
  const g = new THREE.Group();
  ball(g, 0.12, PAL.yellow, 0, 0.12, 0, 1, 0.8, 1.2);
  ball(g, 0.075, PAL.yellow, 0, 0.25, 0.1);
  mesh(g, new THREE.ConeGeometry(0.03, 0.06, 6).rotateX(Math.PI / 2), toon(0xff9a3c), 0, 0.245, 0.18);
  ball(g, 0.012, 0x222222, 0.04, 0.27, 0.15);
  ball(g, 0.012, 0x222222, -0.04, 0.27, 0.15);
  return g;
}

// ---------- merge static meshes that share a material (call after outlineStatic) ----------
export function fuseStatic(root, { skip = [] } = {}) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.isOutline || Array.isArray(o.material)) return;
    for (let p = o; p; p = p.parent) if (skip.includes(p) || p.visible === false) return;
    const g = o.geometry;
    const attrs = Object.keys(g.attributes).sort().join(",");
    const key = [o.material.uuid, o.castShadow, o.receiveShadow, attrs].join("|");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  let before = 0, after = 0;
  for (const list of buckets.values()) {
    before += list.length;
    if (list.length < 2) { after += 1; continue; }
    const geos = list.map((o) => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      return g.applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) { after += list.length; continue; }
    const m = new THREE.Mesh(merged, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.userData.ink = false;
    for (const o of list) o.removeFromParent();
    root.add(m);
    after += 1;
  }
  return { before, after };
}

// =====================================================================================================
// Organic plants: real branches and individually outlined leaves (stylised, not green clouds)
// =====================================================================================================
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clampN = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export function mulberry(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a tube along a curve whose radius tapers from r0 to r1 (smooth normals, UVs for a bark texture)
export function taperedTube(pts, r0, r1, radial = 6, segs = 8, uvLen = 1, flare = 0) {
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], uv = [], idx = [];
  const P = new THREE.Vector3();
  const len = curve.getLength();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, P);
    const r = (r0 + (r1 - r0) * u) * (1 + flare * Math.exp((-u * len) / 0.16)); // flare: the trunk widens into its roots
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const nx = n.x * c + b.x * s, ny = n.y * c + b.y * s, nz = n.z * c + b.z * s;
      pos.push(P.x + nx * r, P.y + ny * r, P.z + nz * r);
      nor.push(nx, ny, nz);
      uv.push(j / radial, u * len * uvLen);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b2 = a + radial + 1;
    idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // make sure triangles face outwards
  const pa = new THREE.Vector3().fromArray(pos, idx[0] * 3), pb = new THREE.Vector3().fromArray(pos, idx[1] * 3), pc = new THREE.Vector3().fromArray(pos, idx[2] * 3);
  const face = pb.sub(pa).cross(pc.sub(pa));
  if (face.dot(new THREE.Vector3().fromArray(nor, idx[0] * 3)) < 0) {
    for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    g.setIndex(idx);
  }
  return g;
}

function canvasOf(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// leaf cards: white fill (tinted per leaf), dark ink outline and a light midrib + veins
const INK_G = "#1f3a24";
const leafTextures = {};
function leafTexture(shape) {
  if (leafTextures[shape]) return leafTextures[shape];
  leafTextures[shape] = canvasOf(128, 192, (x, w, h) => {
    x.lineJoin = x.lineCap = "round";
    const outline = (p) => { x.beginPath(); p(); x.closePath(); };
    if (shape === "needles") {
      x.strokeStyle = INK_G;
      for (let i = 0; i < 9; i++) {
        const y = h - 26 - i * 17, len = 54 - i * 3;
        for (const s of [-1, 1]) {
          x.lineWidth = 11; x.strokeStyle = INK_G; x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 + s * len, y - 24); x.stroke();
          x.lineWidth = 5; x.strokeStyle = "#fff"; x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 + s * len, y - 24); x.stroke();
        }
      }
      x.lineWidth = 11; x.strokeStyle = INK_G; x.beginPath(); x.moveTo(w / 2, h - 8); x.lineTo(w / 2, 22); x.stroke();
      x.lineWidth = 5; x.strokeStyle = "#fff"; x.beginPath(); x.moveTo(w / 2, h - 8); x.lineTo(w / 2, 22); x.stroke();
      return;
    }
    const wide = shape === "round" ? 0.5 : shape === "broad" ? 0.42 : 0.3;
    const path = () => {
      x.moveTo(w / 2, h - 10);
      x.bezierCurveTo(w / 2 - w * wide * 1.5, h * 0.78, w / 2 - w * wide * 1.15, h * 0.22, w / 2, 8);
      x.bezierCurveTo(w / 2 + w * wide * 1.15, h * 0.22, w / 2 + w * wide * 1.5, h * 0.78, w / 2, h - 10);
    };
    outline(path);
    x.fillStyle = "#ffffff"; x.fill();
    x.save(); x.clip();
    x.fillStyle = "rgba(0,0,0,0.12)"; x.fillRect(w / 2, 0, w, h); // one half a touch darker: reads as a folded leaf
    x.restore();
    outline(path); x.lineWidth = 9; x.strokeStyle = INK_G; x.stroke();
    x.strokeStyle = "rgba(60,60,60,0.55)"; x.lineWidth = 4;
    x.beginPath(); x.moveTo(w / 2, h - 14); x.lineTo(w / 2, h * 0.16); x.stroke();
    x.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const y = h * (0.78 - i * 0.16);
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(w / 2, y); x.lineTo(w / 2 + s * w * wide * (0.9 - i * 0.12), y - h * 0.11); x.stroke(); }
    }
  });
  return leafTextures[shape];
}

function barkTexture(kind) {
  const key = "bark" + kind;
  if (leafTextures[key]) return leafTextures[key];
  leafTextures[key] = canvasOf(128, 128, (x, w, h) => {
    const base = { oak: "#8d6040", birch: "#f3f0e6", pine: "#9a6a48" }[kind];
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    x.lineCap = "round";
    if (kind === "birch") {
      x.fillStyle = "#3a332e";
      for (let i = 0; i < 9; i++) { const y = (i * 17 + 5) % h, xx = (i * 41) % w; x.beginPath(); x.ellipse(xx, y, 14 + (i % 3) * 6, 3.5, 0, 0, Math.PI * 2); x.fill(); }
    } else {
      x.strokeStyle = kind === "oak" ? "#5f3d27" : "#6f4630"; x.lineWidth = 5;
      for (let i = 0; i < 7; i++) { const xx = i * 20 + 6; x.beginPath(); x.moveTo(xx, 0); x.quadraticCurveTo(xx + 8, 60, xx - 2, h); x.stroke(); }
      x.strokeStyle = kind === "oak" ? "#a77a54" : "#b98562"; x.lineWidth = 3;
      for (let i = 0; i < 7; i++) { const xx = i * 20 + 14; x.beginPath(); x.moveTo(xx, 0); x.quadraticCurveTo(xx + 6, 70, xx, h); x.stroke(); }
    }
  });
  leafTextures[key].wrapS = leafTextures[key].wrapT = THREE.RepeatWrapping;
  return leafTextures[key];
}

const leafGeos = {};
function leafGeo(bend = 0.18) {
  const k = "g" + bend;
  if (!leafGeos[k]) {
    const g = new THREE.PlaneGeometry(0.62, 1, 2, 5);
    g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, bend * y * y - Math.abs(p.getX(i)) * 0.25); } // arched along the length, cupped across
    g.computeVertexNormals();
    leafGeos[k] = g;
  }
  return leafGeos[k];
}
const leafMats = {};
function leafMat(shape) {
  if (!leafMats[shape]) {
    leafMats[shape] = new THREE.MeshToonMaterial({ map: leafTexture(shape), alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide, gradientMap: toonGradient() });
  }
  return leafMats[shape];
}

const SPECIES = {
  oak: { trunkFrac: 0.42, limbs: 6, elevMin: 0.55, elevMax: 1.1, droop: 0.12, shape: "broad", bark: "oak", depth: 3, cols: [0x2f8f4a, 0x4aa653, 0x64bb5a, 0x8fd35f] },
  birch: { trunkFrac: 0.55, limbs: 7, elevMin: 0.35, elevMax: 0.8, droop: 0.2, shape: "round", bark: "birch", depth: 3, cols: [0x58b04f, 0x78c457, 0x9ad765, 0xc0e56b] },
  maple: { trunkFrac: 0.4, limbs: 6, elevMin: 0.6, elevMax: 1.15, droop: 0.1, shape: "broad", bark: "oak", depth: 3, cols: [0x3d9a4e, 0x6cb856, 0x9acb55, 0xe0c24a] },
  pine: { trunkFrac: 1.0, limbs: 0, elevMin: 0, elevMax: 0, droop: 0, shape: "needles", bark: "pine", depth: 1, cols: [0x1f6f49, 0x2b8556, 0x3a9a64, 0x58b479] },
};

function hullOf(geo, width, color = INK_G_HEX) {
  const g = geo.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * width, p.getY(i) + n.getY(i) * width, p.getZ(i) + n.getZ(i) * width);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  m.userData.isOutline = true; m.userData.ink = false;
  return m;
}
const INK_G_HEX = 0x2a1d16;

// A tree you could count the leaves of: trunk with root flare, forking limbs and twigs, hundreds of outlined leaves.
export function leafyTree({ height = 4.2, crown = 1.7, trunkR = 0.17, seed = 1, species = "oak", leaves = 900, leafSize = 0.26, far = false } = {}) {
  const sp = SPECIES[species];
  const R = mulberry(seed * 7919 + 17);
  const rr = (a, b) => a + (b - a) * R();
  const unit = () => V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
  const g = new THREE.Group();
  const geos = [];
  const tips = [];
  const radial = far ? 5 : 7;
  const trunkH = height * sp.trunkFrac;
  const lean = V3(rr(-0.1, 0.1), 0, rr(-0.1, 0.1));
  const tAt = (t) => V3(lean.x * t, trunkH * t, lean.z * t);
  geos.push(taperedTube([tAt(0).setY(-0.08), tAt(0.33), tAt(0.66), tAt(1)], trunkR, trunkR * (species === "pine" ? 0.25 : 0.55), radial + 1, far ? 8 : 14, 0.9, 0.7));

  const maxDepth = sp.depth;
  function grow(start, dir, len, rad, depth) {
    const end = start.clone().addScaledVector(dir, len);
    end.y -= len * sp.droop * (depth * 0.5);
    const mid = start.clone().lerp(end, 0.5).addScaledVector(unit(), len * 0.12);
    geos.push(taperedTube([start, mid, end], rad, rad * 0.55, depth < 2 ? radial - 1 : 4, far ? 3 : 5, 1.4));
    if (depth < maxDepth) {
      const kids = depth === 1 ? 3 : 2;
      for (let k = 0; k < kids; k++) {
        const t = rr(0.35, 0.95);
        const origin = start.clone().lerp(mid, t < 0.5 ? t * 2 : 1).lerp(end, t < 0.5 ? 0 : (t - 0.5) * 2);
        const d2 = dir.clone().multiplyScalar(0.7).addScaledVector(unit(), 0.85).add(V3(0, 0.18, 0)).normalize();
        grow(origin, d2, len * rr(0.5, 0.68), rad * 0.55, depth + 1);
      }
      tips.push({ p: end.clone().lerp(mid, 0.3), d: dir, w: 0.4 }); // a few leaves on the limb itself
    } else {
      tips.push({ p: end, d: dir, w: 1 });
      tips.push({ p: mid, d: dir, w: 0.6 });
    }
  }
  const top = tAt(1);
  if (species === "pine") {
    // whorls of drooping branches up the trunk, shorter towards the top
    const whorls = far ? 7 : 10;
    for (let w = 0; w < whorls; w++) {
      const t = 0.22 + (w / (whorls - 1)) * 0.76;
      const base = tAt(t);
      const reach = crown * (1.05 - t * 0.9);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + w * 1.1 + rr(-0.3, 0.3);
        const dir = V3(Math.cos(a), -0.28 + t * 0.12, Math.sin(a)).normalize();
        const end = base.clone().addScaledVector(dir, reach);
        end.y -= reach * 0.18;
        const mid = base.clone().lerp(end, 0.5).add(V3(0, reach * 0.08, 0));
        geos.push(taperedTube([base, mid, end], trunkR * 0.2, trunkR * 0.07, 4, 4, 1.4));
        for (let s = 0; s < 4; s++) tips.push({ p: base.clone().lerp(end, 0.35 + s * 0.22), d: dir, w: 1 });
      }
    }
    tips.push({ p: top.clone().add(V3(0, 0.15, 0)), d: V3(0, 1, 0), w: 2 });
  } else {
    for (let i = 0; i < sp.limbs; i++) {
      const a = (i / sp.limbs) * Math.PI * 2 + rr(-0.45, 0.45);
      const t = rr(0.6, 1.0);
      const elev = rr(sp.elevMin, sp.elevMax);
      const dir = V3(Math.sin(elev) * Math.cos(a), Math.cos(elev), Math.sin(elev) * Math.sin(a));
      grow(tAt(t), dir, crown * rr(0.8, 1.08) * (1.12 - t * 0.3), trunkR * 0.44, 1);
    }
    grow(top, V3(rr(-0.2, 0.2), 1, rr(-0.2, 0.2)).normalize(), crown * 0.62, trunkR * 0.4, 1);
  }

  // branches: one merged mesh + one outline hull
  const wood = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshToonMaterial({ map: barkTexture(sp.bark), gradientMap: toonGradient() }));
  wood.castShadow = true; wood.receiveShadow = true; wood.userData.ink = false;
  g.add(wood, hullOf(wood.geometry, far ? 0.02 : 0.016));

  // leaves: instanced cards around the twig tips, plus darker ones inside to fill the gaps
  const cols = sp.cols.map((c) => new THREE.Color(c));
  const centre = V3(0, trunkH + crown * 0.45, 0);
  const total = Math.round(leaves * (far ? 0.55 : 1));
  const inst = new THREE.InstancedMesh(leafGeo(species === "pine" ? 0.05 : 0.2), leafMat(sp.shape), total);
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const Y = V3(0, 1, 0);
  const wsum = tips.reduce((a, t) => a + t.w, 0);
  let n = 0;
  for (const tip of tips) {
    const count = Math.max(1, Math.round((total * 0.8 * tip.w) / wsum));
    for (let k = 0; k < count && n < total; k++, n++) {
      const spread = species === "pine" ? 0.16 : 0.26;
      const p = tip.p.clone().addScaledVector(unit(), spread * (0.3 + R()));
      const out = p.clone().sub(centre).normalize();
      const d = tip.d.clone().multiplyScalar(0.35).addScaledVector(out, 0.9).addScaledVector(unit(), 0.8).normalize();
      if (species === "pine") d.lerp(V3(tip.d.x, -0.2, tip.d.z).normalize(), 0.55).normalize();
      q.setFromUnitVectors(Y, d);
      q2.setFromAxisAngle(d, R() * Math.PI * 2);
      q.premultiply(q2);
      const s = leafSize * rr(0.8, 1.25) * (species === "pine" ? 1.6 : 1);
      m4.compose(p, q, V3(s, s, s));
      inst.setMatrixAt(n, m4);
      const f = clampN(0.45 + (p.y - centre.y) / (crown * 1.6) + (R() - 0.5) * 0.7, 0, 1);
      const ci = Math.min(cols.length - 1, Math.floor(f * cols.length));
      inst.setColorAt(n, col.copy(cols[ci]).offsetHSL(0, 0, (R() - 0.5) * 0.04));
    }
  }
  while (n < total) { // darker leaves tucked in along the branches (they fill gaps without floating in the air)
    const tip = tips[Math.floor(R() * tips.length)];
    const p = tip.p.clone().addScaledVector(unit(), 0.14 * (0.3 + R()));
    const d = unit();
    q.setFromUnitVectors(Y, d);
    m4.compose(p, q, V3(leafSize * 1.05, leafSize * 1.05, leafSize * 1.05));
    inst.setMatrixAt(n, m4);
    inst.setColorAt(n, cols[0]);
    n++;
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = false; inst.receiveShadow = true; inst.userData.ink = false;
  g.add(inst);

  // an invisible crown that still throws a soft shadow on the ground
  const core = new THREE.Mesh(new THREE.SphereGeometry(crown * 0.9, 10, 8), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  core.position.copy(centre); core.scale.y = 0.8; core.castShadow = true; core.userData.ink = false;
  if (species !== "pine") g.add(core);
  return g;
}

// a bush with visible stems and plenty of leaves (optionally flowers or berries)
export function leafyBush({ r = 0.6, seed = 1, leaves = 260, leafSize = 0.15, flowers = 0, flowerColor = PAL.pink, tint = 0 } = {}) {
  const R = mulberry(seed * 4001 + 3);
  const rr = (a, b) => a + (b - a) * R();
  const unit = () => V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
  const g = new THREE.Group();
  const geos = [];
  const tips = [];
  const stems = 9;
  for (let i = 0; i < stems; i++) {
    const a = (i / stems) * Math.PI * 2 + rr(-0.3, 0.3);
    const lean = rr(0.45, 0.95), len = r * rr(0.85, 1.25);
    const dir = V3(Math.cos(a) * Math.sin(lean), Math.cos(lean), Math.sin(a) * Math.sin(lean));
    const start = V3(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04);
    const end = start.clone().addScaledVector(dir, len);
    const mid = start.clone().lerp(end, 0.5).addScaledVector(unit(), len * 0.1);
    geos.push(taperedTube([start, mid, end], 0.022, 0.008, 4, 4, 1));
    for (let s = 0; s < 4; s++) tips.push({ p: start.clone().lerp(end, 0.4 + s * 0.2), d: dir });
    // a side twig
    const t2 = end.clone().addScaledVector(unit(), len * 0.35);
    geos.push(taperedTube([mid, mid.clone().lerp(t2, 0.5), t2], 0.011, 0.005, 3, 3, 1));
    tips.push({ p: t2, d: dir });
  }
  const wood = new THREE.Mesh(mergeGeometries(geos, false), new THREE.MeshToonMaterial({ map: barkTexture("oak"), gradientMap: toonGradient() }));
  wood.castShadow = true; wood.userData.ink = false;
  g.add(wood, hullOf(wood.geometry, 0.008));
  const cols = [[0x2f8f4a, 0x4aa653, 0x64bb5a, 0x8fd35f], [0x3a9b52, 0x56b25a, 0x7acb62, 0xa6db66], [0x2c8a58, 0x3fa564, 0x5cbf78, 0x86d58a]][tint % 3].map((c) => new THREE.Color(c));
  const inst = new THREE.InstancedMesh(leafGeo(0.2), leafMat("broad"), leaves);
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const Y = V3(0, 1, 0);
  const centre = V3(0, r * 0.55, 0);
  for (let i = 0; i < leaves; i++) {
    const tip = tips[i % tips.length];
    const p = tip.p.clone().addScaledVector(unit(), r * 0.3 * (0.2 + R()));
    const out = p.clone().sub(centre).normalize();
    const d = out.multiplyScalar(0.9).addScaledVector(unit(), 0.8).normalize();
    q.setFromUnitVectors(Y, d);
    q2.setFromAxisAngle(d, R() * Math.PI * 2);
    q.premultiply(q2);
    const s = leafSize * rr(0.8, 1.25);
    m4.compose(p, q, V3(s, s, s));
    inst.setMatrixAt(i, m4);
    const f = clampN(0.4 + (p.y - centre.y) / (r * 1.6) + (R() - 0.5) * 0.7, 0, 1);
    inst.setColorAt(i, col.copy(cols[Math.min(3, Math.floor(f * 4))]));
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = false; inst.receiveShadow = true; inst.userData.ink = false;
  g.add(inst);
  if (flowers) {
    const fl = new THREE.Group();
    for (let i = 0; i < flowers; i++) {
      const tip = tips[(i * 3) % tips.length];
      const p = tip.p.clone().addScaledVector(unit(), r * 0.25).add(V3(0, 0.05, 0));
      const petal = toon(flowerColor);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const pm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), petal);
        pm.position.set(p.x + Math.cos(a) * 0.035, p.y, p.z + Math.sin(a) * 0.035);
        fl.add(pm);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), toon(0xffe27a));
      c.position.copy(p).add(V3(0, 0.012, 0));
      fl.add(c);
    }
    fl.traverse((o) => (o.userData.ink = false));
    g.add(fl);
  }
  return g;
}

// thousands of grass blades as one instanced mesh; `skip(x, z)` keeps paths, benches and ponds clear
export function grassField({ x0, x1, z0, z1, count = 7000, seed = 3, skip = () => false, height = 0.2, width = 1, spread = 0.09, heightAt = () => 0 } = {}) {
  const R = mulberry(seed * 131 + 7);
  const bg = new THREE.BufferGeometry();
  const pos = [], nor = [], idx = [];
  const segs = 3;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = 0.036 * width * (1 - t * 0.92), y = t, bend = t * t * 0.3;
    pos.push(-w, y, bend, w, y, bend);
    nor.push(0, 0.3, 1, 0, 0.3, 1);
  }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  bg.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  bg.setIndex(idx);
  const cols = [0x5fb04a, 0x78c356, 0x8fd061, 0x4f9f48, 0xa6dc6d].map((c) => new THREE.Color(c));
  const inst = new THREE.InstancedMesh(bg, new THREE.MeshToonMaterial({ gradientMap: toonGradient(), side: THREE.DoubleSide }), count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 6) {
    const cx = x0 + R() * (x1 - x0), cz = z0 + R() * (z1 - z0);
    if (skip(cx, cz)) continue;
    const clump = 3 + Math.floor(R() * 3);
    for (let k = 0; k < clump && n < count; k++, n++) {
      const x = cx + (R() - 0.5) * spread, z = cz + (R() - 0.5) * spread;
      const h = height * (0.6 + R() * 0.9);
      e.set((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.4);
      q.setFromEuler(e);
      m4.compose(V3(x, heightAt(x, z) - 0.02, z), q, V3(1, h, 1));
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, cols[Math.floor(R() * cols.length)]);
    }
  }
  inst.count = n;
  inst.instanceMatrix.needsUpdate = true;
  inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = false; inst.receiveShadow = true; inst.userData.ink = false;
  return inst;
}

// little meadow flowers and clover to break up the lawn
export function meadowFlowers({ x0, x1, z0, z1, count = 120, seed = 9, skip = () => false, colors = [PAL.white, PAL.yellow, PAL.pink, PAL.purple] } = {}) {
  const R = mulberry(seed * 311 + 5);
  const g = new THREE.Group();
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 8) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    if (skip(x, z)) continue;
    const c = colors[n % colors.length], h = 0.12 + R() * 0.1;
    cyl(g, 0.006, 0.006, h, PAL.leafDark, x, h / 2, z, 4);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ball(g, 0.022, c, x + Math.cos(a) * 0.026, h, z + Math.sin(a) * 0.026, 1, 0.5, 1);
    }
    ball(g, 0.014, 0xffd34e, x, h + 0.008, z);
    n++;
  }
  g.traverse((o) => { o.userData.ink = false; o.castShadow = false; });
  return g;
}

// rolling ground: a grid mesh whose height comes from heightAt(x, z) (flat near the action, hills far away)
export function terrainMesh({ x0, x1, z0, z1, step = 1, heightAt, material }) {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (i / nx) * (x1 - x0), z = z0 + (j / nz) * (z1 - z0);
    pos.push(x, heightAt(x, z), z);
    uv.push(i / nx, 1 - j / nz);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  m.userData.ink = false;
  return m;
}
