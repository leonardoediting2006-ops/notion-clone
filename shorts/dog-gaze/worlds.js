import { THREE } from "../../js/engine.js";
import { toon, toonGradient, outline, roundedBox } from "../../js/toon.js";
import * as W from "../../js/toonworld.js";
import { makeDome, canvasTex, glowTex, lerp, clamp01 } from "./kit.js";

// The small worlds of the dog-gaze short: space (the Earth and the DNA), the campfire at night, the lab, an empty colourful stage, and the dream-space
// with the two glass heads. Each builder returns { group, ...handles }; the caller moves the group to where the world lives and calls update(t) per frame.

const mk = (g, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
const INK = 0x2b1b16;
const smooth = (u) => u * u * (3 - 2 * u);
const hull = (m, k = 1.03) => { const h = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })); h.scale.setScalar(k); h.userData.ink = false; m.add(h); return h; };

// ===================== space: the Earth, a field of stars, and a double helix =====================
export function buildSpace() {
  const group = new THREE.Group();
  const dome = makeDome(300); group.add(dome.mesh); dome.set("#0a0630", "#2a1a7a", "#6a3ac8");
  const sp = new Float32Array(500 * 3); let sd = 11; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) { const a = r() * Math.PI * 2, e = Math.asin(r() * 2 - 1); sp[i * 3] = 280 * Math.cos(e) * Math.cos(a); sp[i * 3 + 1] = 280 * Math.sin(e); sp[i * 3 + 2] = 280 * Math.cos(e) * Math.sin(a); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false, depthWrite: false })));
  // the Earth: a toon globe with painted continents and clouds, an outline and a soft blue halo
  const earthTex = canvasTex(1024, 512, (x, w, h) => {
    x.fillStyle = "#2f8cff"; x.fillRect(0, 0, w, h);
    let s = 5; const q = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 22; i++) { x.fillStyle = i % 3 ? "#3fc65a" : "#2fa84a"; x.beginPath(); const cx = q() * w, cy = h * (0.2 + 0.6 * q()), rx = 40 + q() * 90, ry = 25 + q() * 55; x.ellipse(cx, cy, rx, ry, q() * 3, 0, 6.3); x.fill(); }
    x.fillStyle = "#f4fbff"; x.fillRect(0, 0, w, 24); x.fillRect(0, h - 24, w, 24);
    x.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 16; i++) { x.beginPath(); x.ellipse(q() * w, q() * h, 50 + q() * 70, 10 + q() * 12, 0, 0, 6.3); x.fill(); }
  });
  const earth = new THREE.Group(); group.add(earth);
  const globe = mk(earth, new THREE.SphereGeometry(1.2, 48, 32), new THREE.MeshToonMaterial({ map: earthTex, gradientMap: toonGradient() })); hull(globe, 1.025);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6ab4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); halo.scale.set(4.4, 4.4, 1); halo.userData.ink = false; group.add(halo);
  // the double helix
  const dna = new THREE.Group(); group.add(dna);
  const N = 30, A = [], B = [], rung = [];
  for (let i = 0; i < N; i++) {
    const a = i * 0.46, y = (i - N / 2) * 0.17, R = 0.55;
    const sa = mk(dna, new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshToonMaterial({ color: 0x8a93a8, gradientMap: toonGradient() }), Math.cos(a) * R, y, Math.sin(a) * R);
    const sb = mk(dna, new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshToonMaterial({ color: 0x8a93a8, gradientMap: toonGradient() }), -Math.cos(a) * R, y, -Math.sin(a) * R);
    const rm = new THREE.MeshToonMaterial({ color: 0xb0b8cc, gradientMap: toonGradient() });
    const rg = mk(dna, new THREE.CylinderGeometry(0.035, 0.035, R * 2, 8).rotateZ(Math.PI / 2), rm, 0, y, 0); rg.rotation.y = -a;
    hull(sa, 1.12); hull(sb, 1.12); A.push(sa); B.push(sb); rung.push(rm);
  }
  const mixC = (a, b, f) => new THREE.Color(a).lerp(new THREE.Color(b), f);
  // sweep 0..1: the strand turns from wolf-grey to dog-gold from bottom to top, as if being rewritten
  function rewrite(sweep) {
    for (let i = 0; i < N; i++) { const f = smooth(clamp01((sweep * (N + 8) - i) / 8)), c = mixC(0x8a93a8, i % 2 ? 0xffc23a : 0xff8a3a, f); A[i].material.color.copy(c); B[i].material.color.copy(mixC(0x8a93a8, i % 2 ? 0xff7ab8 : 0xffc23a, f)); rung[i].color.copy(mixC(0xb0b8cc, 0xfff2b0, f)); }
  }
  rewrite(0);
  return { group, dome, earth, halo, dna, rewrite, N, helixY: (i) => (i - N / 2) * 0.17 };
}

// ===================== the campfire at night =====================
export function buildCamp() {
  const group = new THREE.Group();
  const dome = makeDome(400); group.add(dome.mesh); dome.set("#04061c", "#101a54", "#2a3a8a");
  const sp = new Float32Array(420 * 3); let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 420; i++) { const a = r() * Math.PI * 2, e = 0.1 + r() * 1.4; sp[i * 3] = 380 * Math.cos(e) * Math.cos(a); sp[i * 3 + 1] = 380 * Math.sin(e); sp[i * 3 + 2] = 380 * Math.cos(e) * Math.sin(a); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.8, sizeAttenuation: false, fog: false, depthWrite: false })); group.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(24, 36), new THREE.MeshBasicMaterial({ color: 0xf4f1dc, fog: false })); moon.position.set(-120, 150, -300); moon.lookAt(0, 0, 0); moon.userData.ink = false; group.add(moon);
  const g = new THREE.Group(); group.add(g);
  W.reseed(31);
  const gm = new THREE.Mesh(new THREE.CircleGeometry(60, 40).rotateX(-Math.PI / 2), toon(0x2f4a3a)); gm.receiveShadow = true; gm.userData.ink = false; g.add(gm);
  const dirt = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32).rotateX(-Math.PI / 2), toon(0x5a4630)); dirt.position.y = 0.01; dirt.receiveShadow = true; dirt.userData.ink = false; g.add(dirt);
  for (const [x, z, h, sd2] of [[-8, -6, 7, 1], [9, -7, 7.4, 2], [-12, 3, 6.8, 3], [12, 4, 7, 4], [0, -12, 7.6, 5], [-6, -12, 7, 6], [7, -12, 7.2, 7]]) { const tr = W.leafyTree({ species: "pine", height: h, crown: 1.55, seed: sd2, trunkR: 0.2, leaves: 600, far: true }); tr.position.set(x, 0, z); g.add(tr); }
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, st = mk(g, new THREE.IcosahedronGeometry(0.22 + 0.05 * (i % 3), 1), toon(i % 2 ? 0x8f8aa0 : 0x7f7a92), Math.cos(a) * 0.78, 0.12, Math.sin(a) * 0.78); st.scale.y = 0.7; }
  for (let i = 0; i < 3; i++) { const lg = mk(g, new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10), toon(0x7a5434), 0, 0.22, 0); lg.rotation.z = Math.PI / 2 - 0.35; lg.rotation.y = i * 1.05; lg.position.set(Math.sin(i * 1.05) * 0.1, 0.22 + 0.04 * i, Math.cos(i * 1.05) * 0.1); }
  const flameTex = canvasTex(128, 256, (x, w, h) => {
    const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, "rgba(255,248,200,1)"); gr.addColorStop(0.25, "rgba(255,210,60,1)"); gr.addColorStop(0.6, "rgba(255,120,30,0.95)"); gr.addColorStop(1, "rgba(255,50,20,0)");
    x.fillStyle = gr; x.beginPath(); x.moveTo(w / 2, 4); x.bezierCurveTo(w * 0.92, h * 0.35, w * 0.98, h * 0.72, w / 2, h - 6); x.bezierCurveTo(w * 0.02, h * 0.72, w * 0.08, h * 0.35, w / 2, 4); x.fill();
  }, { repeat: false });
  const fl = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); m.userData.ink = false; m.userData.i = i; g.add(m); fl.push(m); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a40, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); glow.scale.set(5, 5, 1); glow.position.y = 1.0; glow.userData.ink = false; g.add(glow);
  const light = new THREE.PointLight(0xffa050, 6, 14, 1.4); light.position.set(0, 1.0, 0); g.add(light);
  const SN = 60, spg = new THREE.BufferGeometry(); spg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  const sparks = new THREE.Points(spg, new THREE.PointsMaterial({ color: 0xffc060, size: 0.07, map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; sparks.userData.ink = false; g.add(sparks);
  function update(t) {
    fl.forEach((m, i) => { const a = i * 0.9, f = 1 + 0.18 * Math.sin(t * (9 + 3 * i) + i) + 0.08 * Math.sin(t * 23 + i * 2), w = 0.55 - 0.04 * i; m.position.set(Math.cos(a) * 0.18 * (i % 3 ? 1 : 0.4), 0.55 + 0.4 * f * (0.7 + 0.1 * i) * 0.5, Math.sin(a) * 0.18); m.scale.set(w * (1 + 0.1 * Math.sin(t * 11 + i)), 1.3 * f * (1 - 0.06 * i), 1); m.material.rotation = 0.12 * Math.sin(t * 7 + i * 2); });
    light.intensity = 5.5 + 1.5 * Math.sin(t * 13) + 0.8 * Math.sin(t * 31); glow.material.opacity = 0.8 + 0.12 * Math.sin(t * 9);
    const p = spg.attributes.position; for (let i = 0; i < SN; i++) { const f = (t * 0.35 + i / SN) % 1, a = i * 2.4; p.setXYZ(i, Math.cos(a) * 0.35 * (1 + f) + 0.25 * Math.sin(t + i), 0.8 + f * 3.2, Math.sin(a) * 0.35 * (1 + f) + 0.25 * Math.cos(t * 0.8 + i)); } p.needsUpdate = true;
    stars.rotation.y = t * 0.02;
  }
  return { group, dome, update, light, stars };
}

// ===================== the lab: a bench with monitors, an exam table, walls with posters =====================
export function buildLab() {
  const group = new THREE.Group(), g = group;
  const dome = makeDome(200); group.add(dome.mesh); dome.set("#d8ecf8", "#eef8ff", "#ffffff");
  const tile = canvasTex(256, 256, (x) => { x.fillStyle = "#f2f6fa"; x.fillRect(0, 0, 256, 256); x.strokeStyle = "#cfd8e4"; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128); x.strokeRect(128, 128, 128, 128); });
  const tm = tile.clone(); tm.needsUpdate = true; tm.repeat.set(10, 8);
  const floor = mk(g, new THREE.BoxGeometry(8, 0.1, 6.5), new THREE.MeshToonMaterial({ map: tm, gradientMap: toonGradient() }), 0, -0.05, 0.5); floor.userData.ink = false;
  const wallM = toon(0x7fd8e8); mk(g, new THREE.BoxGeometry(8, 3.2, 0.12), wallM, 0, 1.55, -2.7).userData.ink = false;
  mk(g, new THREE.BoxGeometry(0.12, 3.2, 6.5), toon(0xbfe8f0), -4, 1.55, 0.5).userData.ink = false; mk(g, new THREE.BoxGeometry(0.12, 3.2, 6.5), toon(0xbfe8f0), 4, 1.55, 0.5).userData.ink = false;
  const stripe = mk(g, new THREE.BoxGeometry(8, 0.12, 0.14), toon(0xff7a8a), 0, 1.0, -2.62); stripe.userData.ink = false;
  // the bench and three monitors that draw themselves
  const bench = mk(g, roundedBox(4.6, 0.9, 0.7, 0.04), toon(0xe8edf4), -0.3, 0.45, -2.25); bench.userData.ink = true;
  mk(g, roundedBox(4.7, 0.06, 0.8, 0.02), toon(0x5a6a88), -0.3, 0.93, -2.25).userData.ink = true;
  const screens = [];
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("canvas"); c.width = 320; c.height = 200; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const fr = mk(g, roundedBox(1.3, 0.85, 0.08, 0.04), toon(0x2b3140), -1.6 + i * 1.35, 1.5, -2.35); fr.userData.ink = true;
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.73), new THREE.MeshBasicMaterial({ map: tex })); sc.position.set(-1.6 + i * 1.35, 1.5, -2.305); sc.userData.ink = false; g.add(sc);
    mk(g, new THREE.CylinderGeometry(0.05, 0.08, 0.5, 10), toon(0x2b3140), -1.6 + i * 1.35, 1.1, -2.35);
    screens.push({ ctx: c.getContext("2d"), tex, w: 320, h: 200 });
  }
  // posters: a brain and a double helix
  for (const [x, col] of [[1.9, 0xffe08a], [2.7, 0xffc0d8]]) { mk(g, roundedBox(0.7, 0.95, 0.04, 0.02), toon(col), x, 1.9, -2.62).userData.ink = true; }
  // the exam table and a chair
  const table = mk(g, roundedBox(1.5, 0.12, 1.0, 0.04), toon(0xdfe6f0), 0.0, 0.55, 0.9); table.userData.ink = true;
  for (const [x, z] of [[-0.6, 0.45], [0.6, 0.45], [-0.6, 1.35], [0.6, 1.35]]) mk(g, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), toon(0x7a88a8), x, 0.25, z);
  const chair = mk(g, roundedBox(0.6, 0.12, 0.6, 0.04), toon(0x3a5fd9), -2.0, 0.5, 0.9); chair.userData.ink = true; mk(g, roundedBox(0.6, 0.7, 0.1, 0.04), toon(0x3a5fd9), -2.0, 0.9, 0.62).userData.ink = true;
  mk(g, new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), toon(0x7a88a8), -2.0, 0.22, 0.9);
  outline(group, { width: 0.01, min: 0.02 });
  // monitors: heart waves, brain colours
  function update(t, level = 0) {
    screens.forEach((s, i) => {
      const { ctx: x, w, h } = s;
      x.fillStyle = "#08121c"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(90,255,170,0.15)"; x.lineWidth = 1; for (let j = 1; j < 10; j++) { x.beginPath(); x.moveTo(j * 32, 0); x.lineTo(j * 32, h); x.stroke(); } for (let j = 1; j < 6; j++) { x.beginPath(); x.moveTo(0, j * 33); x.lineTo(w, j * 33); x.stroke(); }
      if (i === 1) { // a brain scan: warm blobs that light up
        const cx = w / 2, cy = h / 2;
        x.fillStyle = "#1c2a44"; x.beginPath(); x.ellipse(cx, cy, 90, 70, 0, 0, 6.3); x.fill();
        for (let b = 0; b < 7; b++) { const a = b * 2.1 + t * 0.4, rx = cx + Math.cos(a) * 45, ry = cy + Math.sin(a * 1.3) * 32, rr = 14 + 18 * level * (0.5 + 0.5 * Math.sin(t * 3 + b)); const gr = x.createRadialGradient(rx, ry, 0, rx, ry, rr + 6); gr.addColorStop(0, `rgba(255,${100 + 120 * level},${80},0.95)`); gr.addColorStop(1, "rgba(255,80,60,0)"); x.fillStyle = gr; x.beginPath(); x.arc(rx, ry, rr + 6, 0, 6.3); x.fill(); }
      } else {
        x.strokeStyle = i === 0 ? "#5bffaa" : "#ff7ab8"; x.lineWidth = 4; x.beginPath();
        for (let px = 0; px < w; px += 3) { const ph = (px / w) * 3 + t * (0.8 + 0.6 * level) * (i ? 1.3 : 1); const y = h / 2 + Math.sin(ph * 6.28) * 22 * (0.4 + level) + Math.sin(ph * 25) * 6; px ? x.lineTo(px, y) : x.moveTo(px, y); }
        x.stroke();
      }
      s.tex.needsUpdate = true;
    });
  }
  return { group, dome, update, screens };
}

// ===================== an empty colourful stage: a gradient sky, a round floor =====================
export function buildStage() {
  const group = new THREE.Group();
  const dome = makeDome(200); group.add(dome.mesh);
  const floorMat = new THREE.MeshToonMaterial({ color: 0x6a5ae0, gradientMap: toonGradient() });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), floorMat); floor.receiveShadow = true; floor.userData.ink = false; group.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); ring.position.y = 0.01; ring.userData.ink = false; group.add(ring);
  const bokeh = [];
  for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.2 + 0.4 * ((i * 37) % 10) / 10, 24), new THREE.MeshBasicMaterial({ color: [0xffc8e8, 0xc8b0ff, 0xffe0a0, 0xa8e8ff][i % 4], transparent: true, opacity: 0.16 + 0.14 * ((i * 13) % 5) / 5, depthWrite: false })); m.userData.ink = false; m.position.set(-7 + (i * 0.61) % 14, 0.6 + ((i * 53) % 40) / 12, -6 - (i % 5) * 1.4); group.add(m); bokeh.push(m); }
  return { group, dome, floorMat, bokeh, set(top, mid, low, floor) { dome.set(top, mid, low); floorMat.color.set(floor); } };
}

// ===================== a glass head with a glowing brain (the dog's or yours): faces +x =====================
export function glassHead({ tint = 0xffa53a, ear = 0xc26a1e, human = false, hair = 0x5b3a22 } = {}) {
  const head = new THREE.Group(); head.scale.setScalar(0.8);
  const glass = new THREE.MeshToonMaterial({ color: tint, transparent: true, opacity: 0.5, gradientMap: toonGradient(), depthWrite: false });
  const dark = new THREE.MeshToonMaterial({ color: ear, transparent: true, opacity: 0.85, gradientMap: toonGradient(), depthWrite: false });
  const inkM = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const add = (geo, mat, x, y, z, k = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); head.add(m); if (k) { const h = new THREE.Mesh(geo, inkM); h.position.copy(m.position); h.scale.setScalar(k); h.userData.ink = false; head.add(h); } return m; };
  add(roundedBox(human ? 0.95 : 1.15, human ? 1.05 : 0.95, human ? 0.9 : 1.0, 0.2, 3), glass, 0, 0, 0, 1.035);
  if (human) { add(roundedBox(0.12, 0.2, 0.14, 0.04, 1), glass, 0.52, -0.08, 0, 1.08); add(roundedBox(1.0, 0.34, 0.95, 0.15, 2), new THREE.MeshToonMaterial({ color: hair, gradientMap: toonGradient() }), -0.02, 0.5, 0, 1.04); }
  else { add(roundedBox(0.58, 0.4, 0.5, 0.09, 2), glass, 0.86, -0.17, 0, 1.06); add(roundedBox(0.1, 0.08, 0.14, 0.02, 1), toon(INK), 1.17, -0.01, 0); for (const z of [0.56, -0.56]) add(roundedBox(0.26, 0.58, 0.12, 0.05, 2), dark, -0.44, 0.1, z, 1.06); }
  { const eye = add(new THREE.TorusGeometry(0.09, 0.025, 8, 14, Math.PI), toon(INK), human ? 0.4 : 0.52, 0.14, 0.5); eye.rotation.z = Math.PI; }
  const fold = canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#ff6fb0"; x.fillRect(0, 0, w, h); x.strokeStyle = "#c93a86"; x.lineWidth = 5; x.lineCap = "round"; for (let j = 0; j < 9; j++) { x.beginPath(); for (let i = 0; i <= 24; i++) { const px = (i / 24) * w, py = ((j + 0.5) / 9) * h + 7 * Math.sin(i * 1.3 + j * 2.1) + 4 * Math.sin(i * 0.5 + j); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } });
  const bm = new THREE.MeshToonMaterial({ map: fold, gradientMap: toonGradient() }), bm2 = new THREE.MeshToonMaterial({ map: fold, color: 0xffd6ea, gradientMap: toonGradient() });
  const brain = new THREE.Group(); brain.position.set(0.1, 0.12, 0); head.add(brain);
  const lobe = (z, mat) => { const geo = new THREE.SphereGeometry(human ? 0.34 : 0.4, 44, 30), p2 = geo.attributes.position; for (let i = 0; i < p2.count; i++) { const x = p2.getX(i), y = p2.getY(i), zz = p2.getZ(i), f = 1 + 0.07 * Math.sin(x * 12 + y * 5) * Math.cos(zz * 10 + x * 3) + 0.04 * Math.sin(y * 17 + zz * 7); p2.setXYZ(i, x * f, y * f, zz * f); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.scale.set(1.15, 0.85, 0.55); m.position.z = z; return m; };
  brain.add(lobe(0.19, bm), lobe(-0.19, bm2)); outline(brain, { width: 0.012, min: 0.02 });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6fb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(2.3, 2.3, 1); glow.position.copy(brain.position); glow.userData.ink = false; head.add(glow);
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 8, 44), new THREE.MeshBasicMaterial({ color: 0xffc8e8, transparent: true, opacity: 0, depthWrite: false })); r.position.copy(brain.position); r.userData.ink = false; head.add(r); return r; });
  const pulse = (ph, level = 1) => { const th = Math.max(0, 1 - ph * 5); brain.scale.setScalar(1 + 0.07 * th * level); glow.material.opacity = 0.35 + 0.5 * level * (0.5 + 0.5 * th); glow.scale.setScalar(2.0 + 0.6 * th * level); rings.forEach((r, j) => { const f = (ph + j / 3) % 1; r.scale.setScalar(0.6 + 2.2 * f); r.material.opacity = 0.55 * level * (1 - f) * (1 - f); }); };
  return { head, brain, glow, rings, pulse, eyeLocal: new THREE.Vector3(human ? 0.4 : 0.52, 0.14, 0.5), brainLocal: brain.position };
}

// ===================== the dream-space: purple gradient, floating bokeh, a ball-and-stick oxytocin molecule =====================
export function buildBrainWorld() {
  const group = new THREE.Group();
  const bgTex = canvasTex(4, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3a1a8a"); gr.addColorStop(0.55, "#a14cd8"); gr.addColorStop(1, "#ff9ac8"); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide, fog: false })); bg.userData.ink = false; group.add(bg);
  const bokeh = [];
  for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + 0.28 * ((i * 37) % 10) / 10, 24), new THREE.MeshBasicMaterial({ color: [0xffc8e8, 0xc8b0ff, 0xffe0a0, 0xa8e8ff][i % 4], transparent: true, opacity: 0.16 + 0.14 * ((i * 13) % 5) / 5, depthWrite: false })); m.userData.ink = false; group.add(m); bokeh.push(m); }
  // oxytocin, stylised: a ring of atoms with a tail (grey carbon, blue nitrogen, red oxygen, yellow sulphur)
  const mol = new THREE.Group(); group.add(mol);
  const atoms = [[0, 0, 0, 0x8a8f9a], [0.5, 0.2, 0.1, 0x8a8f9a], [1.0, 0.0, -0.1, 0x4a7aff], [1.45, 0.35, 0.1, 0x8a8f9a], [1.0, -0.5, 0.35, 0xff4a4a], [-0.45, 0.45, 0.2, 0x4a7aff], [-0.9, 0.2, -0.15, 0x8a8f9a], [-0.4, -0.5, -0.3, 0xffd24a], [0.45, -0.55, -0.2, 0x8a8f9a], [1.9, 0.1, -0.1, 0xff4a4a], [-1.4, 0.55, 0.15, 0x4a7aff], [0.0, 1.0, -0.1, 0xff4a4a], [0.55, 0.85, 0.3, 0x8a8f9a]];
  const bonds = [[0, 1], [1, 2], [2, 3], [2, 4], [0, 5], [5, 6], [0, 7], [7, 8], [8, 1], [3, 9], [6, 10], [1, 12], [12, 11]];
  const sph = atoms.map(([x, y, z, c]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient() })); m.position.set(x - 0.25, y - 0.2, z); mol.add(m); return m; });
  for (const [a, b] of bonds) { const pa = sph[a].position, pb = sph[b].position, d = pb.clone().sub(pa), len = d.length(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8), new THREE.MeshToonMaterial({ color: 0xf0f0f6, gradientMap: toonGradient() })); st.position.copy(pa).addScaledVector(d, 0.5); st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); mol.add(st); }
  outline(mol, { width: 0.012, min: 0.02 });
  const mglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6fb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); mglow.scale.set(4.2, 4.2, 1); mglow.userData.ink = false; mol.add(mglow);
  mol.visible = false;
  return { group, bokeh, mol };
}
