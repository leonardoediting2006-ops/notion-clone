// Diegetic graphics: the explanation drawn INSIDE the 3D world (VIRAL_FORMULA.md, rule R5) instead of emojis or text.
//   createFan(scene)        a field-of-view / zone fan lying on the floor (vision cone, danger zone): translucent, soft-edged, with a bright rim
//   createShield(scene)     a glowing protective dome with rings (the protector's safe bubble)
//   createFloorArrow(scene) a bold flat arrow on the floor (a threat's direction, a flow)
//   createPulse(scene)      expanding rings on the floor (an alarm, a heartbeat of danger)
// Colour code (keep it the same inside one video): green = safe / easy, red = danger / hard, amber = warning, gold = protection, blue = calm.
// Every helper is a pure function of its arguments, so any frame can be redrawn.

import { THREE } from "./engine.js";

const SEG = 56;
const lerp = (a, b, k) => a + (b - a) * k;

// ---------------------------------------------------------------- fan: a sector on the floor
// fan.set({ x, z, heading, angle, radius, color, opacity, y, rim })  heading: radians, the direction (sin h, cos h) in x/z; angle: the total opening
export function createFan(scene) {
  const n = SEG;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array((n + 2) * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array((n + 2) * 4), 4));
  const idx = []; for (let i = 0; i < n; i++) idx.push(0, i + 1, i + 2); g.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 5; mesh.frustumCulled = false; mesh.userData.ink = false; mesh.visible = false;
  // the bright rim: a strip along the outer arc and the two edges
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(new Float32Array((n + 1) * 2 * 3 + 4 * 2 * 3), 3));
  const ridx = []; for (let i = 0; i < n; i++) ridx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  rg.setIndex(ridx);
  const rmat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const rim = new THREE.Mesh(rg, rmat); rim.renderOrder = 6; rim.frustumCulled = false; rim.userData.ink = false;
  const root = new THREE.Group(); root.add(mesh, rim); root.visible = false; scene.add(root);
  const c = new THREE.Color();
  return {
    group: root,
    hide() { root.visible = false; },
    set({ x = 0, z = 0, heading = 0, angle = Math.PI, radius = 2, color = 0x40e070, opacity = 0.5, y = 0.025, rim: rimW = 0.035, edge = 0.1 } = {}) {
      if (opacity < 0.01 || radius < 0.02 || angle < 0.01) { root.visible = false; return; }
      root.visible = mesh.visible = true; c.set(color);
      const P = g.attributes.position, C = g.attributes.color;
      P.setXYZ(0, x, y, z); C.setXYZW(0, c.r, c.g, c.b, opacity);
      for (let i = 0; i <= n; i++) {
        const a = heading - angle / 2 + (angle * i) / n;
        P.setXYZ(i + 1, x + Math.sin(a) * radius, y, z + Math.cos(a) * radius); C.setXYZW(i + 1, c.r, c.g, c.b, opacity * edge);
      }
      P.needsUpdate = C.needsUpdate = true;
      rmat.color.copy(c); rmat.opacity = Math.min(1, opacity * 1.7);
      const RP = rg.attributes.position;
      for (let i = 0; i <= n; i++) {
        const a = heading - angle / 2 + (angle * i) / n;
        RP.setXYZ(i * 2, x + Math.sin(a) * (radius - rimW), y + 0.004, z + Math.cos(a) * (radius - rimW));
        RP.setXYZ(i * 2 + 1, x + Math.sin(a) * radius, y + 0.004, z + Math.cos(a) * radius);
      }
      RP.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- shield: a gold dome with rings
export function createShield(scene) {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  dome.renderOrder = 7; dome.userData.ink = false; g.add(dome);
  const edge = new THREE.Mesh(new THREE.SphereGeometry(1.012, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.BackSide }));
  edge.renderOrder = 7; edge.userData.ink = false; g.add(edge);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.8, depthWrite: false }));
    r.rotation.x = Math.PI / 2; r.renderOrder = 8; r.userData.ink = false; g.add(r); rings.push(r);
  }
  g.visible = false; scene.add(g);
  return {
    group: g,
    hide() { g.visible = false; },
    // on 0..1 grows the dome; t drives the shimmer
    set({ x = 0, y = 0, z = 0, radius = 1, on = 1, t = 0 } = {}) {
      if (on < 0.01) { g.visible = false; return; }
      g.visible = true; g.position.set(x, y, z);
      const e = 1 - (1 - on) * (1 - on), s = radius * e;
      dome.scale.set(s, s * 0.82, s); edge.scale.copy(dome.scale);
      dome.material.opacity = 0.2 + 0.05 * Math.sin(t * 3); edge.material.opacity = 0.32 * e;
      rings.forEach((r, i) => {
        const f = (t * 0.45 + i / rings.length) % 1;        // rings rise up the dome and fade
        const h = f * 0.82, rr = Math.sqrt(Math.max(0, 1 - f * f * 0.67));
        r.position.y = h * s; r.scale.setScalar(Math.max(0.01, s * rr)); r.material.opacity = 0.75 * (1 - f) * e;
      });
    },
  };
}

// ---------------------------------------------------------------- a bold flat arrow on the floor
export function createFloorArrow(scene, { color = 0xff2f3f, ink = 0x2b1b16 } = {}) {
  const shape = (w, hw, shaft) => {
    const s = new THREE.Shape(); s.moveTo(0, -w); s.lineTo(shaft, -w); s.lineTo(shaft, -hw); s.lineTo(1, 0); s.lineTo(shaft, hw); s.lineTo(shaft, w); s.lineTo(0, w); s.closePath(); return s;
  };
  const geo = new THREE.ExtrudeGeometry(shape(0.07, 0.17, 0.6), { depth: 0.035, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
  const geoOut = new THREE.ExtrudeGeometry(shape(0.1, 0.215, 0.58), { depth: 0.02, bevelEnabled: false }); geoOut.rotateX(-Math.PI / 2);
  const body = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false })); body.position.y = 0.03; body.renderOrder = 6;
  const out = new THREE.Mesh(geoOut, new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.9, depthWrite: false })); out.position.set(-0.012, 0.022, 0); out.renderOrder = 5;
  for (const m of [body, out]) m.userData.ink = false;
  const g = new THREE.Group(); g.add(out, body); g.visible = false; scene.add(g);
  const cc = new THREE.Color();
  return {
    group: g,
    hide() { g.visible = false; },
    // from -> to on the floor (y ignored); length shrinks/grows with `on` (0..1); pulse gently along the direction
    set({ from, to, on = 1, width = 1, color: col = null, t = 0, pulse = 0.06 } = {}) {
      if (on < 0.01) { g.visible = false; return; }
      g.visible = true;
      const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1e-3, L = len * (1 - (1 - on) * (1 - on));
      g.position.set(from.x, 0, from.z); g.rotation.y = Math.atan2(-dz, dx);
      g.scale.set(L * (1 + pulse * Math.sin(t * 9)), 1, width);
      if (col !== null) body.material.color.copy(cc.set(col));
      body.material.opacity = 0.92 * Math.min(1, on * 3);
    },
  };
}

// ---------------------------------------------------------------- expanding rings on the floor (an alarm)
export function createPulse(scene, { n = 3 } = {}) {
  const tex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.strokeStyle = "#fff"; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 110, 0, Math.PI * 2); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const rings = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: 0xff3a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.renderOrder = 6; m.userData.ink = false; m.visible = false; scene.add(m); return m;
  });
  return {
    hide() { rings.forEach((r) => (r.visible = false)); },
    set({ x = 0, z = 0, size = 1, color = 0xff3a3a, on = 1, t = 0, period = 0.9, y = 0.03 } = {}) {
      rings.forEach((r, i) => {
        const f = ((t / period) + i / rings.length) % 1;
        r.visible = on > 0.01; r.position.set(x, y, z); r.scale.setScalar(size * (0.25 + 1.5 * f)); r.material.color.set(color); r.material.opacity = on * 0.9 * (1 - f) * (1 - f);
      });
    },
  };
}

export { lerp };
