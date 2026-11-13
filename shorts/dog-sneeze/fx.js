import { THREE } from "../../js/engine.js";
import { glowTex, canvasTex } from "../dog-gaze/kit.js";

// Effects of dog-sneeze. Every one is a pure function of time (no clock, no randomness: a seed per particle), so any frame can be redrawn.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

const dropTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.55, "rgba(235,248,255,0.95)"); g.addColorStop(0.8, "rgba(200,230,255,0.6)"); g.addColorStop(1, "rgba(200,230,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, { repeat: false });
const puffTex = canvasTex(128, 128, (x) => { for (let i = 0; i < 7; i++) { const cx = 64 + (hash(i, 1) - 0.5) * 40, cy = 64 + (hash(i, 2) - 0.5) * 40, r = 30 + hash(i, 3) * 22; const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }, { repeat: false });

// ---- a burst of droplets from a point: spray(t, t0, origin, dir) ----
export function createSpray(scene, { n = 46, size = 0.028 } = {}) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ size, map: dropTex, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true, color: 0xeaf6ff });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 7; pts.userData.ink = false; scene.add(pts);
  return {
    pts,
    hide() { pts.visible = false; },
    set(t, t0, origin, dir, { speed = 2.2, spread = 0.55, life = 0.9, gravity = 3.2 } = {}) {
      const u = t - t0; if (u < 0 || u > life) { pts.visible = false; return; }
      pts.visible = true; const P = geo.attributes.position;
      const f = V(dir.x, dir.y, dir.z).normalize(), a = Math.abs(f.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), r = V().crossVectors(f, a).normalize(), up = V().crossVectors(r, f);
      for (let i = 0; i < n; i++) {
        const s = speed * (0.35 + 0.65 * hash(i, 1)), ca = (hash(i, 2) - 0.5) * 2 * spread, cb = (hash(i, 3) - 0.5) * 2 * spread, tau = u * (0.85 + 0.3 * hash(i, 4));
        const drag = 1 - Math.exp(-tau * 6.0), reach = s * drag / 6.0 * 1.0 + s * 0.12 * tau;
        const d = V().copy(f).addScaledVector(r, ca).addScaledVector(up, cb).normalize();
        P.setXYZ(i, origin.x + d.x * reach, origin.y + d.y * reach - 0.5 * gravity * tau * tau * 0.25, origin.z + d.z * reach);
      }
      P.needsUpdate = true; mat.opacity = 0.95 * (1 - clamp01((u - life * 0.55) / (life * 0.45)));
      mat.size = size * (1 + 0.5 * hash(1, 5));
    },
  };
}

// ---- drifting motes (dust in a sunbeam, pollen over flowers): positions are a slow loop around a base point inside a box ----
export function createMotes(scene, { n = 120, color = 0xfff2c0, size = 0.03, additive = true } = {}) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTex, color, transparent: true, depthWrite: false, opacity: 0.9, sizeAttenuation: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 6; pts.userData.ink = false; scene.add(pts);
  return {
    pts, hide() { pts.visible = false; },
    // box: { c: centre, s: size, drift: velocity }, on 0..1
    set(t, box, on = 1, { twinkle = 0.5 } = {}) {
      if (on < 0.01) { pts.visible = false; return; }
      pts.visible = true; const P = geo.attributes.position;
      for (let i = 0; i < n; i++) {
        const ph = hash(i, 1) * 6.28, sp = 0.2 + hash(i, 2) * 0.5;
        const x = (hash(i, 3) - 0.5) + 0.12 * Math.sin(t * sp + ph), y = (hash(i, 4) - 0.5) + 0.14 * Math.sin(t * sp * 0.8 + ph * 1.7), z = (hash(i, 5) - 0.5) + 0.12 * Math.cos(t * sp + ph * 0.6);
        const dr = (t * (box.drift ?? 0.05) + hash(i, 6)) % 1;
        P.setXYZ(i, box.c.x + x * box.s.x + (box.v?.x ?? 0) * dr, box.c.y + y * box.s.y + (box.v?.y ?? 0) * dr, box.c.z + z * box.s.z + (box.v?.z ?? 0) * dr);
      }
      P.needsUpdate = true; mat.opacity = 0.9 * on * (1 - twinkle * 0.3 + twinkle * 0.3 * Math.sin(t * 2.3));
    },
  };
}

// ---- soft dust clouds: puffs(t, t0, centre, { n, radius, rise }) ----
export function createPuffs(scene, n = 16) {
  const list = Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xf3e2c4, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; s.renderOrder = 6; s.userData.ink = false; scene.add(s); return s; });
  return {
    list, hide() { list.forEach((s) => (s.visible = false)); },
    set(t, t0, c, { count = n, radius = 0.35, rise = 0.5, size = 0.7, life = 1.6 } = {}) {
      const u = t - t0;
      list.forEach((s, i) => {
        if (i >= count || u < 0 || u > life) { s.visible = false; return; }
        const a = hash(i, 1) * 6.28, r = radius * (0.3 + 0.7 * hash(i, 2)), k = clamp01(u / life), e = 1 - (1 - Math.min(1, u * 2.5)) ** 2;
        s.visible = true; s.position.set(c.x + Math.cos(a) * r * e, c.y + rise * e * (0.5 + hash(i, 3)) * 0.6 + 0.1 * u * (0.4 + hash(i, 4)), c.z + Math.sin(a) * r * e);
        s.scale.setScalar(size * (0.35 + 0.65 * e) * (0.7 + 0.6 * hash(i, 5))); s.material.opacity = 0.55 * Math.min(1, u * 8) * (1 - k * k); s.material.rotation = a + u * (hash(i, 6) - 0.5);
      });
    },
  };
}

// ---- a sunbeam from a window: a soft translucent slab with a bright core ----
export function createBeam(scene) {
  const mk = (op, grow) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(4 * 3), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(4 * 4), 4)); geo.setIndex([0, 1, 2, 1, 3, 2]);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); m.frustumCulled = false; m.renderOrder = 5; m.userData.ink = false; m.visible = false; scene.add(m); return { m, geo, op, grow };
  };
  const layers = [mk(0.34, 0), mk(0.18, 0.2)];
  return {
    layers, hide() { layers.forEach((l) => (l.m.visible = false)); },
    // the window's two top corners (w0, w1) and the floor patch's two far corners (f0, f1): a slab of light from the window to the floor
    set({ w0, w1, f0, f1, color = 0xffe9a8, on = 1 }) {
      const c = new THREE.Color(color), mid = V((w0.x + w1.x + f0.x + f1.x) / 4, (w0.y + w1.y + f0.y + f1.y) / 4, (w0.z + w1.z + f0.z + f1.z) / 4);
      layers.forEach((l) => {
        l.m.visible = on > 0.01; const P = l.geo.attributes.position, C = l.geo.attributes.color;
        [w0, w1, f0, f1].forEach((p, i) => { P.setXYZ(i, p.x + (p.x - mid.x) * l.grow, p.y + (p.y - mid.y) * l.grow, p.z + (p.z - mid.z) * l.grow); C.setXYZW(i, c.r, c.g, c.b, (i < 2 ? l.op * 1.4 : l.op * 0.55) * on); });
        P.needsUpdate = C.needsUpdate = true;
      });
    },
  };
}

// ---- a thin glowing line between two points (a gaze) ----
export function createSightline(scene, color = 0xffd24a) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  m.renderOrder = 9; m.visible = false; m.userData.ink = false; scene.add(m);
  const up = V(0, 1, 0), d = V(0, 0, 0);
  return {
    mesh: m, hide() { m.visible = false; },
    set(a, b, on, t = 0) { if (on < 0.01) { m.visible = false; return; } m.visible = true; d.subVectors(b, a); const L = d.length() || 1e-3; m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1 + 0.4 * Math.sin(t * 12), L, 1 + 0.4 * Math.sin(t * 12)); m.quaternion.setFromUnitVectors(up, d.normalize()); m.material.opacity = 0.9 * on; },
  };
}

// ---- sneeze spray on the camera lens (a DOM overlay: blobs that appear on the impact and slowly run down) ----
export function createLens(root) {
  const el = document.createElement("div");
  Object.assign(el.style, { position: "absolute", inset: "0", pointerEvents: "none", opacity: "0", overflow: "hidden" });
  const blobs = Array.from({ length: 16 }, (_, i) => {
    const b = document.createElement("div"), s = 40 + hash(i, 1) * 150;
    Object.assign(b.style, { position: "absolute", left: `${12 + hash(i, 2) * 76}%`, top: `${14 + hash(i, 3) * 52}%`, width: `${s}px`, height: `${s * (0.85 + hash(i, 4) * 0.4)}px`, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.95) 0%, rgba(232,246,255,0.7) 35%, rgba(190,225,250,0.28) 70%, rgba(190,225,250,0) 100%)", boxShadow: "0 0 18px rgba(255,255,255,0.35)", willChange: "transform" });
    el.appendChild(b); return { b, s };
  });
  root.appendChild(el);
  return {
    el,
    set(t, t0, dur = 1.1) {
      const u = t - t0;
      if (u < 0 || u > dur) { el.style.opacity = "0"; return; }
      const k = u / dur, a = Math.min(1, u * 28) * (1 - Math.max(0, (k - 0.55) / 0.45));
      el.style.opacity = String(a);
      blobs.forEach((o, i) => { const run = u * (30 + hash(i, 6) * 120), sc = 0.5 + 0.5 * Math.min(1, u * 14) ; o.b.style.transform = `translateY(${run}px) scale(${sc})`; });
    },
  };
}
