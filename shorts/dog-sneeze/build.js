import { THREE } from "../../js/engine.js";
import { toon, toonGradient, roundedBox } from "../../js/toon.js";

// small builders shared by the sets of dog-sneeze (outdoors.js, indoors.js)
const cache = new Map();
export const tm = (c) => { if (!cache.has(c)) cache.set(c, toon(c)); return cache.get(c); };           // one shared toon material per colour (so fuseStatic can merge)
export const mesh = (g, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
export const ext = (g, x0, x1, y0, y1, z0, z1, mat, ink = false) => { const m = mesh(g, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.userData.ink = ink; return m; };
export const rbox = (g, w, h, d, mat, x, y, z, r = 0.04) => { const m = mesh(g, roundedBox(w, h, d, r), mat, x, y, z); m.userData.ink = true; return m; };
export const cyl = (g, rt, rb, h, mat, x, y, z, seg = 14) => mesh(g, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
export const ball = (g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(g, new THREE.SphereGeometry(r, 16, 12), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
export const canvasTex = (w, h, draw) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
export const texMat = (tex, rx = 1, ry = 1) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }); };
export const put = (g, o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };
export const hex = (n) => "#" + n.toString(16).padStart(6, "0");

// a flat ribbon following a curve (paths, streams): points are [x, z]; returns a Mesh lying at height y
export function ribbon(points, width, y, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const N = Math.max(24, points.length * 14), pos = [], uv = [], idx = [];
  const pts = curve.getSpacedPoints(N); let len = 0;
  for (let i = 0; i <= N; i++) {
    const p = pts[i], q = pts[Math.min(N, i + 1)], r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x, dz = q.z - r.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    if (i) len += p.distanceTo(pts[i - 1]);
    pos.push(p.x + nx * width / 2, y, p.z + nz * width / 2, p.x - nx * width / 2, y, p.z - nz * width / 2);
    uv.push(0, len / width, 1, len / width);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }   // wound so the ribbon faces up
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.ink = false; m.userData.curve = curve; return m;
}
