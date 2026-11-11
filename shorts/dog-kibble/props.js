import { THREE } from "../../js/engine.js";
import { toon, outline, roundedBox } from "../../js/toon.js";
import { glowTex } from "../dog-gaze/kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// ---------- a kibble piece: a small toon pebble, a few brown shades ----------
const KCOL = [0x8a4a22, 0xa5612c, 0x7a3e1c, 0xb26e34];
export function kibbleMesh(i, scale = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), toon(KCOL[i % KCOL.length]));
  m.scale.set(1.15 * scale, 0.62 * scale, 1 * scale); m.rotation.y = i * 1.9; m.castShadow = true;
  outline(m, { width: 0.005, min: 0.01 });
  m.visible = false; return m;
}

// A bouncing drop: the height of a piece released at height h0 (vertical speed v0, up is positive) after tau seconds, floor at y = 0, soft bounces.
// A fixed-step simulation, so it is a pure function of its arguments.
export function dropY(h0, tau, v0 = 0, g = 9.8, e = 0.4) {
  let y = h0, v = v0; const dt = 1 / 240, n = Math.min(Math.floor(tau / dt), 1200);
  for (let i = 0; i < n; i++) {
    v -= g * dt; y += v * dt;
    if (y < 0) { y = 0; v = Math.abs(v) * e; if (v < 0.35) v = 0; }
  }
  return y;
}

// ---------- the dog's bowl on a mat, with a heap of kibble ----------
export function buildBowl() {
  const g = new THREE.Group();
  const mat = new THREE.Mesh(roundedBox(0.78, 0.016, 0.5, 0.02, 2), toon(0x3fc9c0)); mat.position.y = 0.008; mat.receiveShadow = true; g.add(mat);
  const stripe = new THREE.Mesh(roundedBox(0.7, 0.018, 0.42, 0.02, 2), toon(0xfff2dc)); stripe.position.y = 0.009; stripe.userData.ink = false; g.add(stripe);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.15, 0.13, 28), toon(0xff4a5a)); bowl.position.y = 0.082; bowl.castShadow = true; g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.02, 8, 28), toon(0xffffff)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.148; g.add(rim);
  const heap = [];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4, r = 0.15 * Math.sqrt(((i * 37) % 18) / 18);
    const k = kibbleMesh(i); k.visible = true; k.position.set(Math.cos(a) * r, 0.165 + 0.035 * ((i * 7) % 3) + 0.02 * (1 - r / 0.15), Math.sin(a) * r); g.add(k); heap.push(k);
  }
  outline(mat, { width: 0.008, min: 0.01 }); outline(bowl, { width: 0.01, min: 0.01 });
  return { group: g, heap, mat };
}

// ---------- the shadow wolf's glowing eyes (two additive glows that ride on the wolf's head) ----------
export function eyeGlows(wolf, color = 0xff3a2a) {
  const out = [];
  for (const e of wolf.eyes) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0 }));
    s.renderOrder = 9; s.scale.set(0.34, 0.34, 1); s.position.set(0, 0, 0.05); s.userData.ink = false; e.add(s); out.push(s);
  }
  return out;
}
export { V, lerp, clamp01 };
