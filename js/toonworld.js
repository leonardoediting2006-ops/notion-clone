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
  for (let i = 0; i < 70; i++) {
    const px = rnd() * 512, py = rnd() * 512;
    x.beginPath(); x.moveTo(px - 8, py); x.lineTo(px - 3, py - 12); x.moveTo(px, py); x.lineTo(px, py - 15); x.moveTo(px + 8, py); x.lineTo(px + 3, py - 12); x.stroke();
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
