import { THREE } from "../../js/engine.js";
import { toon, toonGradient, roundedBox, outline, outlineStatic } from "../../js/toon.js";
import * as W from "../../js/toonworld.js";

// The flat: one bright room 6.6 x 7.2 m (x -3.3..3.3, z -2..5). The front door is on the z = 5 wall (x 0.35..1.25), a window in the right wall (x = 3.3),
// a couch against the left wall, a rug in the middle, a plant, pictures and a wall clock. Outside both openings is the real 3D world (js/outside.js).
export function buildRoom() {
const places = { r: new THREE.Group() };
const mesh = (grp, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
const ext = (grp, x0, x1, y0, y1, z0, z1, mat, ink = false) => { const m = mesh(grp, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.userData.ink = ink; return m; };
const rbox = (grp, w, h, d, mat, x, y, z, r = 0.04) => { const m = mesh(grp, roundedBox(w, h, d, r), mat, x, y, z); m.userData.ink = true; return m; };
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const texMat = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }); };
const plankTex = canvasTex(512, 512, (x) => {
  const cols = ["#c8803c", "#d68c3a", "#b87232", "#e09a44", "#c47a36", "#d28538"], pw = 512 / 6;
  for (let i = 0; i < 6; i++) {
    const j = (i * 83 + 120) % 512;
    for (const [y0, y1, ci] of [[0, j, i], [j, 512, (i + 3) % 6]]) {
      x.fillStyle = cols[ci]; x.fillRect(i * pw, y0, pw, y1 - y0);
      x.strokeStyle = "rgba(90,50,25,0.30)"; x.lineWidth = 1.6;
      for (let g = 0; g < 7; g++) { const gx = i * pw + 8 + (g * (pw - 16)) / 6 + Math.sin(g + i) * 3; x.beginPath(); x.moveTo(gx, y0); x.bezierCurveTo(gx + 6, y0 + (y1 - y0) * 0.3, gx - 6, y0 + (y1 - y0) * 0.7, gx + 2, y1); x.stroke(); }
      x.fillStyle = "rgba(255,232,196,0.20)"; x.fillRect(i * pw + 6, y0, 11, y1 - y0);
      if ((i * 7 + ci) % 3 === 0) { const ky = (y0 + y1) / 2; x.strokeStyle = "rgba(80,40,20,0.6)"; x.lineWidth = 2.5; for (let r = 3; r < 12; r += 3) { x.beginPath(); x.ellipse(i * pw + pw / 2, ky, r * 0.8, r * 1.5, 0, 0, Math.PI * 2); x.stroke(); } }
    }
    x.fillStyle = "#5a3520"; x.fillRect(i * pw - 1.5, 0, 3, 512); x.fillRect(i * pw, j - 1.5, pw, 3);
  }
});
const paperTeal = canvasTex(256, 256, (x) => { x.fillStyle = "#35c6c0"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,0.16)" : "rgba(0,90,110,0.12)"; x.fillRect(i * 32, 0, 32, 256); } x.fillStyle = "rgba(255,255,255,0.7)"; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.beginPath(); x.arc(32 + c * 64 + (r % 2) * 32, 32 + r * 64, 5, 0, 6.3); x.fill(); } });
const paperSun = canvasTex(256, 256, (x) => { x.fillStyle = "#ffcf5a"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(235,120,40,0.55)"; x.lineWidth = 4; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const cx = c * 64 + 32, cy = r * 64 + 32; x.beginPath(); x.moveTo(cx, cy - 22); x.lineTo(cx + 22, cy); x.lineTo(cx, cy + 22); x.lineTo(cx - 22, cy); x.closePath(); x.stroke(); } });
const rugTex = canvasTex(256, 256, (x) => { x.fillStyle = "#fff2dc"; x.fillRect(0, 0, 256, 256); for (const [r, c] of [[124, "#ff7a8a"], [96, "#fff2dc"], [68, "#3fc9c0"], [40, "#ffd24a"]]) { x.fillStyle = c; x.beginPath(); x.arc(128, 128, r, 0, 6.3); x.fill(); } });
const weaveTex = canvasTex(128, 128, (x) => { x.fillStyle = "#e0a85a"; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 8; r++) { x.fillStyle = r % 2 ? "#c98a3e" : "#f0bd70"; x.fillRect(0, r * 16, 128, 9); } x.strokeStyle = "rgba(100,60,20,0.5)"; x.lineWidth = 2; for (let c = 0; c < 8; c++) { x.beginPath(); x.moveTo(c * 16 + 8, 0); x.lineTo(c * 16 + 8, 128); x.stroke(); } });
const whiteM = toon(0xffffff), woodM = toon(0xa9683f), woodLightM = toon(0xe0a766);
const house = { door: null, outside: null, pane: null, paneCtx: null, paneTex: null, clock: null };
{
  const g = places.r;
  ext(g, -3.3, 3.3, -0.05, 0, -2.1, 5.1, texMat(plankTex, 6.6, 7.2));
  const wall = (x0, x1, y0, y1, z0, z1, tex, rx, ry) => ext(g, x0, x1, y0, y1, z0, z1, texMat(tex, rx, ry));
  wall(-3.3, 3.3, 0, 2.7, -2.1, -2.0, paperTeal, 6.6 / 0.8, 3); wall(-3.3, -3.2, 0, 2.7, -2.0, 5.1, paperSun, 8, 3);
  wall(3.2, 3.3, 0, 0.9, -2.0, 5.1, paperTeal, 8, 1); wall(3.2, 3.3, 2.2, 2.7, -2.0, 5.1, paperTeal, 8, 1); wall(3.2, 3.3, 0.9, 2.2, -2.0, 0.2, paperTeal, 3, 2); wall(3.2, 3.3, 0.9, 2.2, 2.4, 5.1, paperTeal, 4, 2);
  wall(-3.3, 0.35, 0, 2.7, 5.0, 5.1, paperSun, 4.5, 3); wall(1.25, 3.3, 0, 2.7, 5.0, 5.1, paperSun, 2.6, 3); wall(0.35, 1.25, 2.1, 2.7, 5.0, 5.1, paperSun, 1.2, 1);
  for (const [x0, x1, z0, z1] of [[-3.2, -3.12, -2, 5], [3.12, 3.2, -2, 5]]) { ext(g, x0, x1, 0, 0.9, z0, z1, whiteM); ext(g, x0 - 0.01, x1 + 0.01, 0.9, 0.95, z0, z1, whiteM); }
  ext(g, -3.2, 3.2, 0, 0.9, -2, -1.92, whiteM); ext(g, -3.2, 0.35, 0, 0.9, 4.92, 5, whiteM); ext(g, 1.25, 3.2, 0, 0.9, 4.92, 5, whiteM);
  // the front door (hinged on the right) with a frame, a knob and a peephole, and a bright garden behind it for when it opens
  ext(g, 0.29, 0.35, 0, 2.15, 4.95, 5.12, whiteM, true); ext(g, 1.25, 1.31, 0, 2.15, 4.95, 5.12, whiteM, true); ext(g, 0.29, 1.31, 2.1, 2.17, 4.95, 5.12, whiteM, true);
  { const leaf = new THREE.Group(); leaf.position.set(1.25, 0, 5.0); g.add(leaf); const d0 = mesh(leaf, roundedBox(0.9, 2.08, 0.06, 0.02), toon(0xff5a4a), -0.45, 1.04, 0); d0.userData.ink = true; mesh(leaf, new THREE.SphereGeometry(0.045, 12, 8), toon(0xffd24a), -0.8, 1.0, -0.05); mesh(leaf, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12).rotateX(Math.PI / 2), toon(0xffd24a), -0.45, 1.65, -0.04); leaf.traverse((o) => (o.userData.ink = false)); outline(leaf, { width: 0.012, min: 0.02 }); house.door = leaf; }
  // outside the door and the window is the real 3D world (outside.js)
  // the window in the right wall: an open frame onto the garden
  {
    ext(g, 3.1, 3.22, 0.88, 0.94, 0.15, 2.45, whiteM, true); ext(g, 3.1, 3.22, 2.16, 2.22, 0.15, 2.45, whiteM, true); ext(g, 3.1, 3.22, 0.88, 2.22, 0.15, 0.21, whiteM, true); ext(g, 3.1, 3.22, 0.88, 2.22, 2.39, 2.45, whiteM, true); ext(g, 3.1, 3.22, 0.88, 2.22, 1.27, 1.33, whiteM, true); ext(g, 3.1, 3.22, 1.5, 1.56, 0.15, 2.45, whiteM, true);
    rbox(g, 0.1, 1.5, 0.3, toon(0xff6a8a), 3.0, 1.55, 0.0, 0.05); rbox(g, 0.1, 1.5, 0.3, toon(0xff6a8a), 3.0, 1.55, 2.6, 0.05); ext(g, 2.95, 3.1, 2.25, 2.3, -0.1, 2.75, woodM); }
  // couch (left wall): a deep seat, back, arms and three cushions
  { const cm = toon(0xe5566d), cl = toon(0xff8aa0);
    rbox(g, 1.0, 0.3, 2.4, cm, -2.65, 0.3, 1.0, 0.08); rbox(g, 0.28, 0.95, 2.4, cm, -3.05, 0.5, 1.0, 0.1); rbox(g, 0.95, 0.3, 0.2, cm, -2.62, 0.55, -0.1, 0.06); rbox(g, 0.95, 0.3, 0.2, cm, -2.62, 0.55, 2.1, 0.06);
    for (const z of [0.2, 1.0, 1.8]) rbox(g, 0.84, 0.14, 0.7, cl, -2.58, 0.52, z, 0.06);
    rbox(g, 0.12, 0.34, 0.34, toon(0xffd24a), -2.95, 0.88, 0.1, 0.05); rbox(g, 0.12, 0.34, 0.34, toon(0x3fc9c0), -2.95, 0.88, 1.9, 0.05); }
  // side table with a lamp, a round rug, a plant, pictures and the wall clock
  rbox(g, 0.5, 0.55, 0.5, woodLightM, -3.0, 0.275, 2.75, 0.04); { const l = new THREE.Group(); l.position.set(-3.0, 0.55, 2.75); g.add(l); mesh(l, new THREE.CylinderGeometry(0.03, 0.06, 0.28, 10), toon(0xd9b04a), 0, 0.14, 0); mesh(l, new THREE.CylinderGeometry(0.14, 0.2, 0.22, 14, 1, true), toon(0xfff1d0, { side: THREE.DoubleSide }), 0, 0.36, 0); }
  { const r = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: rugTex, gradientMap: toonGradient() })); r.position.set(0.2, 0.012, 1.2); r.receiveShadow = true; r.userData.ink = false; g.add(r); }
  { const p = new THREE.Group(); p.position.set(2.7, 0, -1.3); g.add(p); mesh(p, new THREE.CylinderGeometry(0.22, 0.17, 0.36, 12), toon(0xff7a3d), 0, 0.18, 0); for (let i = 0; i < 8; i++) { const a = i * 0.8; mesh(p, new THREE.SphereGeometry(0.17, 10, 8), toon(i % 2 ? 0x3fbf6a : 0x6fd47a), Math.cos(a) * 0.14, 0.55 + (i % 3) * 0.15, Math.sin(a) * 0.14); } }
  for (const [x, y, c] of [[-1.0, 1.7, 0xffd24a], [0.4, 1.8, 0xff6a8a], [-2.0, 1.6, 0x6fa8ff]]) { ext(g, x - 0.34, x + 0.34, y - 0.4, y + 0.4, -1.99, -1.94, whiteM, true); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.68), new THREE.MeshBasicMaterial({ color: c })); p.position.set(x, y, -1.93); p.userData.ink = false; g.add(p); }
  { const cg = new THREE.Group(); cg.position.set(1.9, 1.95, -1.93); g.add(cg); mesh(cg, new THREE.CylinderGeometry(0.26, 0.26, 0.05, 30).rotateX(Math.PI / 2), toon(0xfffbf0), 0, 0, 0).userData.ink = false; mesh(cg, new THREE.TorusGeometry(0.26, 0.03, 8, 30), toon(0x2b2f3a), 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.02, i % 3 ? 0.03 : 0.055, 0.01), toon(0x2b2f3a)); tk.position.set(Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0.03); tk.rotation.z = -a; cg.add(tk); }
    const mk = (len, w2) => { const h = new THREE.Group(); h.position.z = 0.04; const m = new THREE.Mesh(new THREE.BoxGeometry(w2, len, 0.012), toon(0x2b2f3a)); m.userData.ink = false; m.position.y = len / 2 - 0.02; h.add(m); cg.add(h); return h; };
    house.clock = { min: mk(0.18, 0.016), hour: mk(0.12, 0.022) }; }
  const ceiling = ext(g, -3.3, 3.3, 2.7, 2.76, -2.1, 5.1, toon(0xf3ecde)); ceiling.userData.ink = false; house.ceiling = ceiling;
  outlineStatic(g, { width: 0.012, min: 0.05 });
  console.log("flat fused", JSON.stringify(W.fuseStatic(g, { skip: [house.door, house.clock?.min, house.clock?.hour, ceiling] })));
}
return { group: places.r, house, COUCH: { x0: -3.2, x1: -2.15, z0: -0.2, z1: 2.2, seat: 0.53, back: 1.0, arm: 0.7 } };
}
