import { THREE } from "./engine.js";
import { toon, toonGradient, outlineStatic } from "./toon.js";
import * as W from "./toonworld.js";

// The world outside the flat: our front garden and path, a street with neighbour houses, real 3D trees, bushes and flowers,
// hills, clouds, a sky dome with a sun, a moon and stars, and seasons you can fly through. Everything is in the flat's own
// coordinates (the front door is on the z = 5 wall, its centre at x = 0.8; the window is in the right wall, x = 3.3).
// outside.set({ light, warm, sunEl, sunAz, season, t }) is a pure function of its arguments, so every frame can be redrawn.

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (u) => u * u * (3 - 2 * u);
const col = (h) => new THREE.Color(h);
const mixC = (a, b, k) => col(a).lerp(col(b), k);

const mesh = (grp, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
const slab = (grp, w, h, d, mat, x, y, z) => { const m = mesh(grp, new THREE.BoxGeometry(w, h, d), mat, x, y, z); m.userData.ink = false; return m; };
const put = (grp, o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; grp.add(o); return o; };

const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
};
const toonMap = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }); };

export function buildOutside() {
  const group = new THREE.Group();
  group.position.y = -0.06; // the grass sits just under the flat's floor
  const g = group;
  W.reseed(21);

  // ---------- materials ----------
  const sidingTex = canvasTex(256, 256, (x) => {
    x.fillStyle = "#f6dfa8"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { x.fillStyle = "rgba(160,110,50,0.22)"; x.fillRect(0, i * 32 + 28, 256, 4); x.fillStyle = "rgba(255,255,255,0.28)"; x.fillRect(0, i * 32, 256, 5); }
  });
  const payTex = canvasTex(256, 256, (x) => {
    x.fillStyle = "#f4e1bb"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "#e5c994"; x.lineWidth = 5;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) x.strokeRect(c * 64 + (r % 2) * 32, r * 64, 64, 64);
  });
  const sidingM = toonMap(sidingTex, 8, 3), payM = (rx, rz) => toonMap(payTex, rx, rz);
  const asphaltM = toon(0x6a707c), curbM = toon(0xd9d6cf), edgeM = toon(W.PAL.sandEdge), whiteM = toon(0xffffff);
  const roofM = toon(0xc4502e);

  // ---------- ground, street, path ----------
  const groundMat = W.grassMaterial([60, 24]);
  const ground = W.terrainMesh({ x0: -260, x1: 260, z0: -200, z1: 260, step: 40, heightAt: () => 0, material: groundMat });
  g.add(ground);
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(520, 460).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ color: 0xf4fbff, gradientMap: toonGradient(), transparent: true, opacity: 0, depthWrite: false }));
  snow.position.set(0, 0.012, 30); snow.receiveShadow = true; snow.userData.ink = false; snow.visible = false; g.add(snow);
  const ZR = 18.4; // the street's centre line
  slab(g, 180, 0.02, 6.0, asphaltM, 0, 0.01, ZR);
  for (let i = -8; i <= 8; i++) slab(g, 1.4, 0.025, 0.14, toon(0xfff6dc), i * 3.2 + 0.8, 0.02, ZR);
  slab(g, 180, 0.05, 1.1, payM(90, 1), 0, 0.03, 15.15); slab(g, 180, 0.06, 0.16, curbM, 0, 0.03, 15.75);
  slab(g, 180, 0.05, 1.1, payM(90, 1), 0, 0.03, 21.65); slab(g, 180, 0.06, 0.16, curbM, 0, 0.03, 21.05);
  slab(g, 1.4, 0.04, 9.6, edgeM, 0.8, 0.02, 9.8); slab(g, 1.15, 0.06, 9.6, payM(3, 22), 0.8, 0.03, 9.8);   // the garden path, gate to porch
  slab(g, 1.5, 0.12, 1.0, payM(1, 1), 0.8, 0.06, 5.6);                                                      // the porch step, flush with the floor
  slab(g, 1.0, 0.03, 0.62, toon(0x9a6a3c), 0.8, 0.135, 5.85);                                                // doormat

  // ---------- our house seen from outside: siding, roof, fake windows, side walls ----------
  const clad = (x0, x1, y0, y1, z0, z1) => slab(g, x1 - x0, y1 - y0, z1 - z0, sidingM, (x0 + x1) / 2, (y0 + y1) / 2 + 0.06, (z0 + z1) / 2);   // +0.06: the group sits 0.06 low
  clad(-3.45, 0.29, 0, 2.76, 5.1, 5.2); clad(1.31, 3.45, 0, 2.76, 5.1, 5.2); clad(0.29, 1.31, 2.1, 2.76, 5.1, 5.2);
  clad(-3.45, -3.3, 0, 2.76, -2.2, 5.2); clad(-3.45, 3.45, 0, 2.76, -2.3, -2.1);
  clad(3.3, 3.45, 0, 0.9, -2.2, 5.2); clad(3.3, 3.45, 2.2, 2.76, -2.2, 5.2); clad(3.3, 3.45, 0.9, 2.2, -2.2, 0.2); clad(3.3, 3.45, 0.9, 2.2, 2.4, 5.2);
  for (const [x0, x1] of [[-2.7, -1.1], [2.3, 3.0]]) { // two painted windows on the front
    const cx = (x0 + x1) / 2;
    const fr = slab(g, x1 - x0 + 0.16, 1.16, 0.06, whiteM, cx, 1.55 + 0.06, 5.22); fr.userData.ink = true;
    slab(g, x1 - x0, 1.0, 0.07, toon(0x9fd8ff), cx, 1.55 + 0.06, 5.23).userData.ink = false;
    slab(g, 0.05, 1.0, 0.075, whiteM, cx, 1.55 + 0.06, 5.235); slab(g, x1 - x0, 0.05, 0.075, whiteM, cx, 1.55 + 0.06, 5.235);
  }
  for (const [x0, x1, y0, y1, z0, z1] of [[0.25, 1.35, 0, 0.0, 5.1, 5.25]]) void [x0, x1, y0, y1, z0, z1];
  { // the door frame seen from outside and a lamp above it
    slab(g, 0.08, 2.16, 0.12, whiteM, 0.27, 1.08 + 0.06, 5.23).userData.ink = true; slab(g, 0.08, 2.16, 0.12, whiteM, 1.33, 1.08 + 0.06, 5.23).userData.ink = true; slab(g, 1.14, 0.08, 0.12, whiteM, 0.8, 2.17 + 0.06, 5.23).userData.ink = true;
    const lamp = mesh(g, new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 1.6, 2.2, 5.3); lamp.userData.ink = false;
  }
  { // a gable roof with a small overhang, and siding on the two gable ends
    const half = 3.75, rise = 1.4, ang = Math.atan2(rise, half), len = Math.hypot(half, rise) + 0.35, z0 = -2.45, z1 = 5.55;
    for (const s of [-1, 1]) {
      const r = mesh(g, new THREE.BoxGeometry(len, 0.14, z1 - z0), roofM, s * (half / 2 + 0.04), 2.76 + rise / 2 + 0.07 + 0.06, (z0 + z1) / 2);
      r.rotation.z = -s * ang;
    }
    const tri = new THREE.Shape(); tri.moveTo(-3.55, 0); tri.lineTo(3.55, 0); tri.lineTo(0, 1.38); tri.closePath();
    for (const z of [5.19, -2.29]) { const t = new THREE.Mesh(new THREE.ShapeGeometry(tri), sidingM); t.position.set(0, 2.76 + 0.06, z); t.castShadow = false; t.userData.ink = false; g.add(t); if (z < 0) t.rotation.y = Math.PI; }
    slab(g, 0.5, 1.4, 0.5, toon(0xb86a4a), -2.2, 3.5 + 0.06, 0.4);   // a chimney
  }

  // ---------- neighbours, hedges, fences, lamps, mailbox, parked cars ----------
  const house = (o, x, z, ry) => put(g, W.house(o), x, 0, z, ry);
  house({ w: 4.2, h: 2.6, d: 3.2, style: "brick", wall: 0xc9684a, roof: 0x6f7fb8, door: 0xf2f0e6, shutter: 0x3f5f8f }, -8.6, 3.6, 0);
  house({ w: 4.4, h: 2.7, d: 3.4, style: "stucco", wall: 0xcfe7ee, roof: 0xb4553d, door: 0xd9734f, shutter: 0xf2b84a }, 10.6, 3.2, 0);
  house({ w: 4.0, h: 2.5, d: 3.0, style: "siding", wall: 0xf5d6c6, roof: W.PAL.roof2, door: 0x5f8f6a, shutter: 0xffffff }, 20.2, 4.2, 0.05);
  house({ w: 3.8, h: 2.4, d: 3.0, style: "stucco", wall: 0xf5d6c6, roof: W.PAL.roof2, door: 0x5f8f6a, shutter: 0xffffff }, -7.2, 28.2, Math.PI - 0.04);
  house({ w: 4.4, h: 2.7, d: 3.4, style: "siding", wall: 0xcfe0f2, roof: W.PAL.roof, door: 0xf2b84a, shutter: 0x3f5f8f }, 1.3, 28.7, Math.PI + 0.03);
  house({ w: 3.9, h: 2.5, d: 3.1, style: "brick", wall: 0xb9674f, roof: 0x7a5a4a, door: 0xf2f0e6, shutter: 0x5f8f6a }, 9.8, 28.2, Math.PI - 0.05);
  for (const [x0, x1] of [[-20, 0.1], [1.5, 20]]) put(g, W.picketFence(x1 - x0), (x0 + x1) / 2, 0, 14.5);
  { const gate = W.picketFence(1.3); gate.position.set(1.5, 0, 14.5); gate.rotation.y = 1.25; g.add(gate); }
  for (const x of [-3.8, -2.1, 3.7, 5.4]) put(g, W.leafyBush({ r: 0.62, seed: Math.abs(x * 10) | 0, leaves: 260, flowers: x < 0 ? 8 : 0, flowerColor: x < -3 ? W.PAL.pink : W.PAL.yellow }), x, 0, 13.8);
  for (const [x, z] of [[-2.4, 15.0], [4.0, 15.0], [-2.4, 21.2], [4.0, 21.2]]) put(g, W.lampPost(2.7), x, 0, z);
  put(g, W.mailbox(), 2.25, 0, 14.1);
  put(g, W.car({ color: 0x4fb6a8 }), 6.8, 0, 19.6, Math.PI);
  put(g, W.car({ color: 0xf2b84a }), -8.7, 0, 17.1, 0);
  put(g, W.flowerBed(3.0, 0.7, 30), -2.8, 0, 6.3); put(g, W.flowerBed(3.0, 0.7, 30), 4.4, 0, 6.3); put(g, W.flowerBed(2.2, 0.6, 20), -6.7, 0, 5.4);
  for (const x of [-0.25, 1.85]) put(g, W.leafyBush({ r: 0.3, seed: 70 + x * 3, leaves: 120, flowers: 7, flowerColor: W.PAL.pink }), x, 0.0, 5.75);

  // ---------- trees: real leaves that can change with the seasons ----------
  const trees = [];
  const addTree = (o, x, z) => {
    const t = W.leafyTree(o); put(g, t, x, 0, z, (x * 7 + z) % 6);
    if (o.species === "pine") return t;
    t.traverse((m) => { if (m.isInstancedMesh && m.instanceColor) { const base = m.instanceColor.array.slice(); trees.push({ inst: m, base, n: m.count, rnd: Float32Array.from({ length: m.count }, (_, i) => ((i * 2654435761) % 1000) / 1000) }); } });
    return t;
  };
  // the side garden seen through the window, the front garden and the street
  addTree({ species: "oak", height: 5.2, crown: 2.2, seed: 3, leaves: 1500, leafSize: 0.26 }, 6.6, 0.4);
  addTree({ species: "maple", height: 4.8, crown: 1.9, seed: 5, leaves: 1400, leafSize: 0.25 }, 7.4, 6.8);
  addTree({ species: "birch", height: 4.8, crown: 1.5, seed: 8, leaves: 1200, leafSize: 0.24 }, 5.2, -3.6);
  addTree({ species: "oak", height: 5.2, crown: 2.1, seed: 9, leaves: 1400, leafSize: 0.25 }, 15.2, 1.2);
  addTree({ species: "pine", height: 6.8, crown: 1.5, seed: 18, leaves: 700, far: true }, 13.8, 9.2);
  addTree({ species: "oak", height: 5.0, crown: 2.0, seed: 4, leaves: 1400, leafSize: 0.25 }, -5.2, 10.0);
  addTree({ species: "maple", height: 4.8, crown: 1.9, seed: 6, leaves: 1400, leafSize: 0.25 }, 4.4, 12.0);
  addTree({ species: "birch", height: 4.6, crown: 1.5, seed: 12, leaves: 1200, leafSize: 0.24 }, -3.4, 16.4);
  addTree({ species: "maple", height: 5.0, crown: 2.0, seed: 14, leaves: 1400, leafSize: 0.25 }, 5.2, 16.6);
  addTree({ species: "oak", height: 5.2, crown: 2.0, seed: 16, leaves: 1400, leafSize: 0.25 }, -12.0, 12.0);
  addTree({ species: "birch", height: 4.6, crown: 1.5, seed: 20, leaves: 1200, leafSize: 0.24 }, 13.4, 16.8);
  addTree({ species: "oak", height: 5.4, crown: 2.2, seed: 24, leaves: 1400, leafSize: 0.25 }, -2.4, 24.6);
  addTree({ species: "pine", height: 6.5, crown: 1.5, seed: 26, leaves: 700, far: true }, 16.6, 26.0);
  addTree({ species: "pine", height: 7.0, crown: 1.6, seed: 28, leaves: 700, far: true }, -16.0, 6.0);

  // ---------- hills, clouds, grass, wild flowers ----------
  const hills = [];
  for (const [x, y, z, r, h, c] of [[-40, 3, 120, 46, 11, W.PAL.hill1], [30, 4, 126, 50, 13, W.PAL.hill2], [0, 3, 108, 38, 8, W.PAL.hill3], [120, 3, 40, 46, 12, W.PAL.hill2], [126, 3, -20, 40, 10, W.PAL.hill1], [112, 3, 90, 40, 9, W.PAL.hill3], [-120, 3, 20, 44, 11, W.PAL.hill2], [20, 3, -90, 46, 12, W.PAL.hill1]]) hills.push(put(g, W.hill(r, h, c), x, y, z));
  const clouds = [];
  for (const [x, y, z, s] of [[60, 16, 20, 2.4], [70, 20, -8, 3.0], [80, 14, 46, 2.0], [-30, 22, 90, 2.8], [26, 18, 100, 2.2], [48, 24, 60, 3.2]]) clouds.push(put(g, W.cloud(s), x, y, z));
  const skip = (x, z) => (z > 14.2 && z < 22.2) || (Math.abs(x - 0.8) < 0.8 && z > 4.6 && z < 14.6) || (x > -3.6 && x < 3.6 && z < 5.4) || (z > 5.2 && z < 7.0 && ((x > -4.4 && x < -1.2) || (x > 2.9 && x < 5.9)));
  g.add(W.grassField({ x0: -26, x1: 26, z0: -10, z1: 14.4, count: 38000, skip, seed: 4, height: 0.3 }));
  g.add(W.grassField({ x0: -40, x1: 40, z0: 22, z1: 60, count: 22000, skip: () => false, seed: 6, height: 0.55, width: 2.4, spread: 0.3 }));
  g.add(W.meadowFlowers({ x0: -14, x1: 14, z0: 7, z1: 14, count: 170, skip, seed: 3 }));
  g.add(W.meadowFlowers({ x0: 4, x1: 14, z0: -6, z1: 8, count: 120, skip, seed: 8 }));
  outlineStatic(g, { width: 0.02, min: 0.08 });
  W.fuseStatic(g, { skip: [snow, ground, ...clouds, ...hills] });

  // ---------- the sky: a dome, a sun, a moon, stars ----------
  const skyC = document.createElement("canvas"); skyC.width = 4; skyC.height = 256;
  const skyCtx = skyC.getContext("2d"), skyTex = new THREE.CanvasTexture(skyC); skyTex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -20; dome.frustumCulled = false; dome.userData.ink = false;
  const disc = (r, c, op = 1) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 36), new THREE.MeshBasicMaterial({ color: c, fog: false, depthWrite: false, transparent: true, opacity: op })); m.renderOrder = -10; m.userData.ink = false; m.frustumCulled = false; return m; };
  const sun = disc(26, 0xffe45a), sunGlow = disc(60, 0xffd24a, 0.28), moon = disc(18, 0xf4f1dc), moonGlow = disc(40, 0xdfe6ff, 0.2);
  const stars = (() => { const n = 180, p = new Float32Array(n * 3); let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.2; p[i * 3] = 400 * Math.cos(e) * Math.cos(a); p[i * 3 + 1] = 400 * Math.sin(e); p[i * 3 + 2] = 400 * Math.cos(e) * Math.sin(a); } const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false })); m.frustumCulled = false; m.renderOrder = -15; return m; })();
  const sky = new THREE.Group(); sky.add(dome, sun, sunGlow, moon, moonGlow, stars);

  // falling leaves and snow (positions are a pure function of time)
  const FN = 220, flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
  flakes.frustumCulled = false; flakes.userData.ink = false; flakes.renderOrder = 7; g.add(flakes);

  const dayTop = 0x45a6ff, dayMid = 0xa9defa, dayLow = 0xe9f8ff, nightTop = 0x070b30, nightMid = 0x1a2a6c, nightLow = 0x3a4a9a, warmTop = 0x5876c8, warmMid = 0xff9a5c, warmLow = 0xffdca0;
  let lastLeaf = "";
  const out = {
    group, sky, hills, clouds, fogColor: new THREE.Color(),     // hills and clouds are exposed so a short can hide them (dog-sneeze paints its own backdrop)
    // light 0..1 (night..day), warm 0..1 (sunset), sunEl/sunAz radians (azimuth from +x towards +z), season 0 spring .. 3 winter, t seconds
    set({ light = 1, warm = 0, sunEl = 0.5, sunAz = 0.4, season = 1, t = 0, moonEl = -1, moonAz = 0 } = {}) {
      const top = mixC(nightTop, dayTop, light).lerp(col(warmTop), warm), mid = mixC(nightMid, dayMid, light).lerp(col(warmMid), warm), low = mixC(nightLow, dayLow, light).lerp(col(warmLow), warm);
      const gr = skyCtx.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.36, "#" + mid.getHexString()); gr.addColorStop(0.5, "#" + low.getHexString()); gr.addColorStop(1, "#" + low.getHexString());
      skyCtx.fillStyle = gr; skyCtx.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
      out.fogColor.copy(low);
      const place = (m, el, az, d) => { m.position.set(d * Math.cos(el) * Math.cos(az), d * Math.sin(el), d * Math.cos(el) * Math.sin(az)); m.lookAt(0, 0, 0); };
      place(sun, sunEl, sunAz, 370); place(sunGlow, sunEl, sunAz, 372); place(moon, moonEl, moonAz, 370); place(moonGlow, moonEl, moonAz, 372);
      sun.material.color.set(warm > 0.4 ? 0xffb347 : 0xffe45a); sun.visible = sunGlow.visible = sunEl > -0.2; moon.visible = moonGlow.visible = moonEl > -0.2;
      stars.material.opacity = clamp01((0.45 - light) * 2.2);
      // ground and roof by season (3 = snow)
      const autumn = clamp01(1 - Math.abs(season - 2) * 1.2), winter = smooth(clamp01((season - 2.3) / 0.7)), spring = clamp01(1 - Math.abs(season - 0) * 1.5);
      groundMat.color.setRGB(1 + 0.1 * spring, lerp(1, 0.86, autumn), lerp(1, 0.55, autumn));
      snow.visible = winter > 0.01; snow.material.opacity = winter * 0.95;
      roofM.color.set(0xc4502e).lerp(col(0xf0f6ff), winter);
      // leaves: green / blossom / red-gold, thinning out into winter
      const key = [Math.round(season * 80), Math.round(light * 30)].join();
      if (key !== lastLeaf) {
        lastLeaf = key;
        const c = new THREE.Color(), s = ((season % 4) + 4) % 4, i0 = Math.floor(s), f = smooth(s - i0), shade = lerp(0.35, 1, light);
        for (const tr of trees) {
          const { inst, base, n, rnd } = tr; const arr = inst.instanceColor.array;
          for (let i = 0; i < n; i++) {
            const r0 = base[i * 3], g0 = base[i * 3 + 1], b0 = base[i * 3 + 2], lum = (r0 + g0 + b0) / 3, rr = rnd[i];
            const sp = rr < 0.14 ? c.setHSL(0.93 + 0.04 * rr, 0.85, 0.82) : c.setHSL(0.24 + 0.03 * rr, 0.78, 0.5 + lum * 0.5);
            const spr = [sp.r, sp.g, sp.b];
            const sm = [r0, g0, b0];
            const au = c.setHSL(0.015 + 0.1 * rr, 0.92, 0.42 + 0.3 * lum); const aut = [au.r, au.g, au.b];
            const pal = [spr, sm, aut, aut];
            const A = pal[i0 % 4], B = pal[(i0 + 1) % 4];
            arr[i * 3] = lerp(A[0], B[0], f) * shade; arr[i * 3 + 1] = lerp(A[1], B[1], f) * shade; arr[i * 3 + 2] = lerp(A[2], B[2], f) * shade;
          }
          inst.instanceColor.needsUpdate = true;
          const thin = 1 - smooth(clamp01((season - 2.25) / 0.7)); inst.count = Math.max(0, Math.round(n * thin)); inst.visible = inst.count > 0;
        }
      }
      for (const cl of clouds) cl.position.x += 0;
      // falling leaves (autumn) and snow (winter)
      const kind = winter > 0.05 ? 1 : autumn > 0.35 && season > 1.5 ? 2 : 0, fp = flakeGeo.attributes.position.array;
      flakes.visible = kind > 0; flakes.material.opacity = kind === 1 ? 0.95 * winter : kind === 2 ? 0.9 * autumn : 0;
      flakes.material.color.set(kind === 1 ? 0xffffff : 0xff9a2a); flakes.material.size = kind === 1 ? 0.07 : 0.1;
      if (kind > 0) for (let i = 0; i < FN; i++) {
        const rx = ((i * 97) % 100) / 100, rz = ((i * 57) % 100) / 100, ph = ((i * 31) % 100) / 100, sp = 0.5 + ((i * 13) % 10) / 20;
        fp[i * 3] = 3.6 + rx * 8 + Math.sin(t * 1.3 + i) * 0.25; fp[i * 3 + 1] = 5.2 - (((t * sp * 0.9 + ph * 5.2) % 5.2)); fp[i * 3 + 2] = -3 + rz * 9 + Math.cos(t * 1.1 + i * 2) * 0.25;
      }
      flakeGeo.attributes.position.needsUpdate = true;
    },
  };
  return out;
}
