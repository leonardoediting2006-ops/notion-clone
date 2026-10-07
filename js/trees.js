// Procedural trees: a tapered trunk that splits into branches and twigs,
// covered in thousands of alpha-cut leaf cards (one InstancedMesh for all
// trees, so it stays cheap to render).

import { THREE } from "./engine.js";
import * as T from "./textures.js";

let s = 424242;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rnd() * (b - a);

// Leaf-cluster card: a few leaves with stems and veins on a transparent canvas.
function leafCardTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const greens = ["#3f6e2b", "#4f8034", "#365f24", "#5f8f3a", "#2c5420", "#6b9a42"];
  for (let i = 0; i < 9; i++) {
    const ang = rr(0, Math.PI * 2);
    const dist = rr(10, 70);
    const cx = 128 + Math.cos(ang) * dist, cy = 128 + Math.sin(ang) * dist;
    const len = rr(48, 70), wid = len * rr(0.38, 0.5);
    x.save();
    x.translate(cx, cy);
    x.rotate(ang + rr(-0.5, 0.5));
    // stem
    x.strokeStyle = "#4a3a22";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(-len * 0.75, 0);
    x.lineTo(-len * 0.45, 0);
    x.stroke();
    // blade
    const g = x.createLinearGradient(0, -wid / 2, 0, wid / 2);
    const col = greens[(rnd() * greens.length) | 0];
    g.addColorStop(0, col);
    g.addColorStop(0.5, "#7aa64f");
    g.addColorStop(1, col);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(-len * 0.45, 0);
    x.quadraticCurveTo(0, -wid, len * 0.5, 0);
    x.quadraticCurveTo(0, wid, -len * 0.45, 0);
    x.fill();
    // veins
    x.strokeStyle = "rgba(200,230,150,0.45)";
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(-len * 0.4, 0);
    x.lineTo(len * 0.45, 0);
    for (let v = -0.25; v < 0.4; v += 0.13) {
      x.moveTo(len * v, 0);
      x.lineTo(len * (v + 0.12), -wid * 0.32);
      x.moveTo(len * v, 0);
      x.lineTo(len * (v + 0.12), wid * 0.32);
    }
    x.stroke();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Concatenate non-indexed geometries (position, normal, uv) into one.
function merge(geos) {
  const parts = geos.map((g) => g.toNonIndexed());
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const size = parts[0].attributes[name].itemSize;
    const total = parts.reduce((n, g) => n + g.attributes[name].array.length, 0);
    const arr = new Float32Array(total);
    let off = 0;
    for (const g of parts) {
      arr.set(g.attributes[name].array, off);
      off += g.attributes[name].array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

const UP = new THREE.Vector3(0, 1, 0);

export function createForest(parent) {
  const branchGeos = [];
  const leaves = []; // { pos, scale }

  function branch(start, dir, len, radius, depth, tree) {
    const end = start.clone().addScaledVector(dir, len);
    const geo = new THREE.CylinderGeometry(radius * 0.62, radius, len, depth > 1 ? 9 : 5, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const m = new THREE.Matrix4().compose(start.clone().addScaledVector(dir, len / 2), q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    branchGeos.push(geo);

    if (depth === 0) {
      // leaf clusters around and along the twig
      const n = tree.leavesPerTwig;
      for (let i = 0; i < n; i++) {
        const along = rr(0.3, 1.15);
        const p = start.clone().addScaledVector(dir, len * along);
        p.x += rr(-1, 1) * tree.spread;
        p.y += rr(-0.6, 1) * tree.spread;
        p.z += rr(-1, 1) * tree.spread;
        leaves.push({ pos: p, scale: rr(0.7, 1.15) * tree.leafSize });
      }
      return;
    }
    const kids = depth >= 3 ? 3 : rnd() < 0.5 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const az = (k / kids) * Math.PI * 2 + rr(-0.6, 0.6);
      const tilt = rr(0.45, 0.85);
      const side = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
      const nd = dir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(side, Math.sin(tilt));
      nd.y += 0.25; // reach for the light
      nd.normalize();
      const from = start.clone().addScaledVector(dir, len * rr(0.7, 1));
      branch(from, nd, len * rr(0.6, 0.75), radius * 0.62, depth - 1, tree);
    }
    // a few side twigs off bigger limbs
    if (depth >= 2) {
      for (let k = 0; k < 2; k++) {
        const side = new THREE.Vector3(rr(-1, 1), rr(-0.1, 0.5), rr(-1, 1)).normalize();
        const from = start.clone().addScaledVector(dir, len * rr(0.35, 0.7));
        branch(from, side, len * 0.4, radius * 0.35, 0, tree);
      }
    }
  }

  function tree(x, z, { height = 2.2, scale = 1, depth = 4 } = {}) {
    const t = { spread: 0.38 * scale, leafSize: 0.55 * scale, leavesPerTwig: 13 };
    const lean = new THREE.Vector3(rr(-0.08, 0.08), 1, rr(-0.08, 0.08)).normalize();
    branch(new THREE.Vector3(x, 0, z), lean, height * scale * 0.55, 0.17 * scale, depth, t);
  }

  function bush(x, z, scale = 1) {
    const t = { spread: 0.28 * scale, leafSize: 0.3 * scale, leavesPerTwig: 9 };
    for (let k = 0; k < 5; k++) {
      const d = new THREE.Vector3(rr(-0.7, 0.7), 1, rr(-0.7, 0.7)).normalize();
      branch(new THREE.Vector3(x + rr(-0.15, 0.15), 0, z + rr(-0.15, 0.15)), d, 0.35 * scale, 0.025 * scale, 0, t);
    }
  }

  function build() {
    const wood = new THREE.Mesh(merge(branchGeos), T.bark());
    wood.castShadow = wood.receiveShadow = true;
    parent.add(wood);

    const tex = leafCardTexture();
    const leafMat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.75,
    });
    const card = new THREE.PlaneGeometry(1, 1);
    const inst = new THREE.InstancedMesh(card, leafMat, leaves.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    leaves.forEach((l, i) => {
      e.set(rr(0, Math.PI), rr(0, Math.PI * 2), rr(0, Math.PI));
      q.setFromEuler(e);
      sc.setScalar(l.scale);
      m.compose(l.pos, q, sc);
      inst.setMatrixAt(i, m);
      // slight per-cluster colour variation (sunlit / shaded)
      const v = rr(0.75, 1.15);
      inst.setColorAt(i, col.setRGB(v * rr(0.92, 1.05), v, v * rr(0.85, 1)));
    });
    inst.instanceColor.needsUpdate = true;
    inst.castShadow = inst.receiveShadow = true;
    inst.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
    parent.add(inst);
    return { wood, leaves: inst };
  }

  return { tree, bush, build };
}
