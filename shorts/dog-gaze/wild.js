import { THREE } from "../../js/engine.js";
import { toon, outlineStatic } from "../../js/toon.js";
import * as W from "../../js/toonworld.js";
import { makeDome } from "./kit.js";

// A forest clearing for the wolves: flat grass in the middle, a ring of pines and oaks, rocks, bushes, tall grass, hills and its own sky.
// Built around the origin; the caller moves the group to wherever the place lives. Wolves face off along the x axis.
export function buildWild() {
  const group = new THREE.Group();
  const g = new THREE.Group(); group.add(g);
  W.reseed(77);
  const mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const heightAt = (x, z) => Math.max(0, (Math.hypot(x, z) - 9) * 0.1);
  g.add(W.terrainMesh({ x0: -120, x1: 120, z0: -120, z1: 120, step: 3, heightAt, material: W.grassMaterial([40, 40]) }));
  const rockCol = [0x8f8aa0, 0x9a95aa, 0x7f7a92, 0xa6a1b4];
  function rock(r, x, y, z, sx = 1, sy = 0.8, sz = 1, seed = 1) {
    const geo = new THREE.IcosahedronGeometry(r, 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + 0.16 * Math.sin(p.getX(i) * 3.1 + seed) * Math.cos(p.getZ(i) * 2.7 + seed * 1.7) + 0.08 * Math.sin(p.getY(i) * 4.3 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    geo.computeVertexNormals();
    const m = mesh(geo, toon(rockCol[seed % 4]), x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = seed; return m;
  }
  rock(1.3, -4.6, 0.7, -2.6, 1, 0.9, 1, 1); rock(0.8, -5.4, 0.35, -1.8, 1, 0.8, 1, 2); rock(1.6, 5.0, 0.8, -3.2, 1.2, 0.9, 1, 3); rock(0.9, 4.2, 0.4, -2.2, 1, 0.8, 1, 4); rock(2.2, 0, 1.0, -9.0, 1.4, 0.8, 1, 5); rock(0.7, 2.6, 0.3, 3.4, 1, 0.8, 1, 6);
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); return o; };
  const pines = [[-7, -3, 6.6, 1], [-9, -6.5, 7.4, 2], [-5.4, -8, 6.8, 3], [7.2, -3.4, 6.8, 4], [9.2, -7, 7.2, 5], [5.6, -8.6, 6.6, 6], [-11, 1, 7, 7], [11.5, -1, 7.2, 8], [-9.5, -11, 7.6, 9], [10, -11, 7.4, 10], [0.5, -11, 7.8, 11], [-8, 5, 6.8, 12], [9, 5.5, 6.6, 13], [-3, -13, 7, 14], [4, -14, 7.3, 15]];
  for (const [x, z, h, seed] of pines) put(W.leafyTree({ species: "pine", height: h, crown: 1.55, seed, trunkR: 0.2, leaves: 700, far: true }), x, z, seed);
  for (const [x, z, sp, h, c, seed] of [[-12, 7, "oak", 5, 2.1, 3], [13, 7, "maple", 5, 2.0, 5], [-16, -6, "oak", 5.4, 2.2, 8], [16, -5, "birch", 5, 1.6, 9]]) put(W.leafyTree({ species: sp, height: h, crown: c, seed, leaves: 1100, leafSize: 0.25 }), x, z, seed);
  for (const [x, z, s] of [[4.6, 1.9, 1], [5.8, 2.6, 2], [-4.8, 2.1, 3], [-6.0, 2.7, 4], [6.2, 4.6, 5], [-6.4, 4.8, 6], [3.0, -5.2, 7], [-2.6, -5.6, 8]]) put(W.leafyBush({ r: 0.8 + (s % 3) * 0.1, seed: s + 20, leaves: 300, flowers: 0, tint: s }), x, z, s);
  g.add(W.grassField({ x0: -12, x1: 12, z0: -9, z1: 8, count: 16000, skip: (x, z) => Math.hypot(x / 5.2, z / 3.4) < 1, seed: 12, height: 0.2, width: 1.0, spread: 0.12 }));   // short grass where the wolves stand
  g.add(W.meadowFlowers({ x0: -8, x1: 8, z0: -6, z1: 6, count: 90, seed: 9 }));
  for (const [x, y, z, r, h, c] of [[-40, 3, -70, 40, 13, 0x6a8f7c], [30, 4, -80, 44, 15, 0x5f8a72], [0, 3, -90, 38, 12, 0x6a8f7c], [80, 3, -10, 40, 12, 0x6a8f7c], [-80, 3, 0, 40, 12, 0x5f8a72]]) put(W.hill(r, h, c), x, z).position.y = y;
  outlineStatic(g, { width: 0.02, min: 0.08 });
  W.fuseStatic(g);
  const dome = makeDome(420); group.add(dome.mesh);
  return { group, dome };
}
