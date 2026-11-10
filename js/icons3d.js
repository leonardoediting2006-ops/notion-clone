// 3D cartoon icons: custom toon models (cel-shaded, ink outline, a glossy highlight) instead of emoji sprites,
// so they stay sharp at any size and read as part of the 3D world.
//
//   import { createIcons3D } from "../../js/icons3d.js";
//   const ic = createIcons3D({ renderer, scene, camera });
//   ic.showIcon("❤️", pos, 0.2, on, { t, bob: 0.02 });   // same calls as the emoji kit; the emoji is just the model's name
//   ic.showBubble("🖐️", pos, 0.4, on);                  // a puffy 3D thought bubble with a model inside
//   ic.burst(t0, centre, n, { ch: ["💛", "✨"] });  ic.drawFx(t);  ic.hideAll();
//
// The icons live in their own scene, drawn right after the main scene with the depth cleared, so they are never hidden
// behind the characters but still shade themselves correctly. Every model is built once, normalised to a 1-unit size,
// and pooled (the same icon can be shown several times in one frame). Nothing is random: every frame is reproducible.

import { THREE } from "./engine.js";
import { toon, roundedBox, outline } from "./toon.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeIO = (u) => u * u * (3 - 2 * u);
const easeOut = (u) => 1 - (1 - u) * (1 - u);

// ---------------------------------------------------------------- model kit
const C = {
  ink: 0x2b1b16, white: 0xffffff, yellow: 0xffc93a, gold: 0xffc21f, red: 0xff2f4f, pink: 0xff5fa8, orange: 0xff8a1f,
  green: 0x2fd46a, blue: 0x3aa8ff, sky: 0x7fd4ff, skin: 0xffcc55, brown: 0x9a5a2a, dark: 0x3a2418, gray: 0xc8ccd8, teal: 0x2fc6b8,
};
const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
function part(g, geo, color, x = 0, y = 0, z = 0, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, mat = null } = {}) {
  const m = new THREE.Mesh(geo, mat ?? toon(color));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); g.add(m); return m;
}
// a glossy cartoon highlight (unlit, no outline)
function shine(g, x, y, z, sx, sy, rz = 0) { const m = part(g, new THREE.SphereGeometry(1, 14, 10), 0, x, y, z, { sx, sy, sz: 0.01, rz, mat: shineMat }); m.userData.ink = false; return m; }
const sph = (r = 1, w = 24, h = 16) => new THREE.SphereGeometry(r, w, h);
const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

function heartShape() {
  const s = new THREE.Shape(); s.moveTo(0, 0.15);
  s.bezierCurveTo(0, 0.3, -0.25, 0.4, -0.35, 0.2); s.bezierCurveTo(-0.45, -0.05, -0.15, -0.25, 0, -0.4);
  s.bezierCurveTo(0.15, -0.25, 0.45, -0.05, 0.35, 0.2); s.bezierCurveTo(0.25, 0.4, 0, 0.3, 0, 0.15); return s;
}
function heart(color) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.14, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.07, bevelSegments: 4, curveSegments: 24 }); geo.center();
  part(g, geo, color);
  shine(g, -0.2, 0.17, 0.15, 0.07, 0.045, 0.6); shine(g, -0.1, 0.24, 0.15, 0.025, 0.02);
  return g;
}
function starShape(inner = 0.24) {
  const s = new THREE.Shape(), P = [[0, 0.5], [inner * 0.5, inner * 0.5], [0.5, 0], [inner * 0.5, -inner * 0.5], [0, -0.5], [-inner * 0.5, -inner * 0.5], [-0.5, 0], [-inner * 0.5, inner * 0.5]];
  s.moveTo(...P[0]); for (let i = 1; i <= 8; i++) { const [x, y] = P[i % 8], [px, py] = P[i - 1]; s.quadraticCurveTo((px + x) * 0.5 * 0.6, (py + y) * 0.5 * 0.6, x, y); } return s;
}
function sparkle(color = 0xffd21f) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(starShape(), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 10 }); geo.center();
  part(g, geo, color, 0, 0, 0, { mat: toon(color, { emissive: 0x7a5200 }) });
  const geo2 = geo.clone(); part(g, geo2, color, 0.38, 0.33, 0.02, { sx: 0.36, sy: 0.36, sz: 0.36, mat: toon(color, { emissive: 0x7a5200 }) });
  shine(g, -0.05, 0.12, 0.09, 0.035, 0.05);
  return g;
}
function cross() {
  const g = new THREE.Group();
  for (const r of [Math.PI / 4, -Math.PI / 4]) part(g, roundedBox(1.0, 0.25, 0.22, 0.1, 3), C.red, 0, 0, 0, { rz: r });
  shine(g, -0.24, 0.22, 0.12, 0.08, 0.03, Math.PI / 4);
  return g;
}
function plus(color = C.green) {
  const g = new THREE.Group();
  part(g, roundedBox(0.9, 0.3, 0.26, 0.11, 3), color); part(g, roundedBox(0.3, 0.9, 0.26, 0.11, 3), color);
  shine(g, -0.05, 0.3, 0.14, 0.05, 0.08);
  return g;
}
function crown() {
  const g = new THREE.Group(), gold = C.gold;
  part(g, new THREE.CylinderGeometry(0.45, 0.4, 0.34, 32), gold, 0, -0.15, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    part(g, new THREE.ConeGeometry(0.13, 0.36, 12), gold, Math.cos(a) * 0.38, 0.18, Math.sin(a) * 0.38);
    part(g, sph(0.065), 0xfff2a0, Math.cos(a) * 0.38, 0.39, Math.sin(a) * 0.38);
  }
  for (const [x, c] of [[0, 0xff2f4f], [-0.27, 0x3aa8ff], [0.27, 0x2fd46a]]) part(g, sph(0.075), c, x, -0.14, 0.42 - Math.abs(x) * 0.22, { sz: 0.6 });
  shine(g, -0.36, -0.2, 0.3, 0.035, 0.07, -0.2);
  return g;
}
function button(color, sym) {
  const g = new THREE.Group();
  part(g, roundedBox(1, 1, 0.32, 0.22, 4), color);
  if (sym === "pause") for (const x of [-0.16, 0.16]) part(g, roundedBox(0.17, 0.52, 0.1, 0.06, 2), C.white, x, 0, 0.17);
  if (sym === "play") { const s = new THREE.Shape(); s.moveTo(-0.18, 0.27); s.lineTo(0.28, 0); s.lineTo(-0.18, -0.27); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 }); part(g, geo, C.white, 0, 0, 0.15); }
  if (sym === "repeat") {
    for (const r of [0, Math.PI]) {
      const arc = new THREE.Group(); arc.rotation.z = r; g.add(arc);
      part(arc, new THREE.TorusGeometry(0.26, 0.06, 10, 24, Math.PI * 0.75), C.white, 0, 0, 0.17, { rz: Math.PI * 0.12 });
      part(arc, new THREE.ConeGeometry(0.11, 0.2, 12), C.white, Math.cos(Math.PI * 0.87) * 0.26, Math.sin(Math.PI * 0.87) * 0.26, 0.17, { rz: Math.PI * 0.87 + Math.PI });
    }
  }
  shine(g, -0.3, 0.32, 0.17, 0.1, 0.05, 0.3);
  return g;
}
// emoji-style faces: a glossy yellow ball with a mood
function face(kind) {
  const g = new THREE.Group(), Y = C.yellow, D = C.dark;
  part(g, sph(0.5, 32, 24), Y, 0, 0, 0, { sz: 0.85 });
  const feat = (m) => ((m.userData.ink = false), m);   // the features are drawn flat in ink: no outline of their own
  const eyeBall = (x, y, r = 0.075) => { feat(part(g, sph(r), D, x, y, 0.39, { sz: 0.6, sy: 1.25 })); shine(g, x - r * 0.3, y + r * 0.45, 0.39 + r * 0.6, r * 0.35, r * 0.35); };
  const brow = (x, y, rz) => feat(part(g, roundedBox(0.2, 0.05, 0.05, 0.02, 2), D, x, y, 0.4, { rz }));
  const arc = (x, y, r, rz, tube = 0.026, len = Math.PI) => feat(part(g, new THREE.TorusGeometry(r, tube, 8, 20, len), D, x, y, 0.4, { rz }));
  const blush = (x) => { const m = part(g, sph(0.07), 0xff7a9a, x, -0.08, 0.38, { sz: 0.25, sx: 1.3 }); m.userData.ink = false; };
  if (kind === "huff") {
    feat(part(g, sph(0.06), D, -0.16, 0.07, 0.4, { sy: 0.55, sz: 0.5 })); feat(part(g, sph(0.06), D, 0.16, 0.07, 0.4, { sy: 0.55, sz: 0.5 }));
    brow(-0.16, 0.2, -0.45); brow(0.16, 0.2, 0.45);
    arc(0, -0.25, 0.12, 0, 0.026);
    for (const s of [-1, 1]) { part(g, sph(0.11), C.white, s * 0.46, -0.2, 0.25); part(g, sph(0.08), C.white, s * 0.56, -0.28, 0.2); part(g, sph(0.06), C.white, s * 0.4, -0.31, 0.3); }
  } else if (kind === "plead" || kind === "teary") {
    eyeBall(-0.16, 0.05, 0.1); eyeBall(0.16, 0.05, 0.1);
    brow(-0.17, 0.25, 0.3); brow(0.17, 0.25, -0.3); blush(-0.27); blush(0.27);
    if (kind === "plead") arc(0, -0.25, 0.08, 0, 0.022);
    else {
      arc(0, -0.17, 0.12, Math.PI, 0.026);
      for (const s of [-1, 1]) { const m = part(g, sph(0.07), C.sky, s * 0.16, -0.06, 0.41, { sx: 1.3, sy: 0.55, sz: 0.4 }); m.userData.ink = false; }
      const tear = part(g, sph(0.05), C.sky, 0.27, -0.2, 0.33, { sy: 1.4 }); tear.userData.ink = false;
    }
  } else if (kind === "hug") {
    arc(-0.16, 0.04, 0.07, 0); arc(0.16, 0.04, 0.07, 0);
    feat(part(g, sph(0.14), D, 0, -0.18, 0.37, { sy: 0.65, sz: 0.4 }));
    blush(-0.28); blush(0.28);
    for (const s of [-1, 1]) part(g, sph(0.15), Y, s * 0.3, -0.36, 0.3, { sx: 1.1, sy: 0.85 });
  }
  shine(g, -0.33, 0.22, 0.28, 0.06, 0.035, 0.9);
  return g;
}
// cartoon hands (emoji-yellow), built pointing up: open, point (index up), pray, holding a paw
function handIcon(kind) {
  const g = new THREE.Group(), S = C.skin;
  if (kind === "pray") {
    for (const s of [-1, 1]) {
      const h = new THREE.Group(); h.rotation.z = -s * 0.2; h.position.x = s * 0.12; g.add(h);
      part(h, roundedBox(0.24, 0.62, 0.2, 0.1, 3), S, 0, 0.05, 0);
      part(h, roundedBox(0.28, 0.14, 0.24, 0.06, 2), C.blue, 0, -0.33, 0);
    }
    shine(g, -0.14, 0.2, 0.12, 0.03, 0.08);
    return g;
  }
  part(g, roundedBox(0.5, 0.5, 0.24, 0.12, 3), S, 0, -0.12, 0);
  part(g, roundedBox(0.4, 0.14, 0.26, 0.06, 2), C.blue, 0, -0.42, 0);
  if (kind === "open") {
    [-0.17, -0.06, 0.06, 0.17].forEach((x, i) => part(g, cap(0.058, 0.24 + (i === 1 || i === 2 ? 0.05 : 0)), S, x * 1.05, 0.27 + (i === 1 || i === 2 ? 0.03 : 0), 0, { rz: -x * 0.6 }));
    part(g, cap(0.065, 0.18), S, -0.3, -0.05, 0.02, { rz: 0.9 });
  } else {
    part(g, cap(0.065, 0.32), S, -0.1, 0.33, 0.03);
    [-0.0, 0.11, 0.2].forEach((x) => part(g, sph(0.075), S, x, 0.1, 0.1, { sz: 0.8 }));
    part(g, cap(0.06, 0.15), S, 0.05, -0.02, 0.14, { rz: Math.PI / 2 });
  }
  shine(g, -0.12, 0.0, 0.13, 0.04, 0.09);
  if (kind === "paw") {
    g.rotation.x = 0;
    const p = new THREE.Group(); p.position.set(0.05, 0.05, 0.22); g.add(p);
    part(p, sph(0.2), 0xeed4ab, 0, 0, 0, { sy: 0.85, sz: 0.7 });
    for (const [x, y] of [[-0.14, 0.15], [-0.05, 0.2], [0.05, 0.2], [0.14, 0.15]]) part(p, sph(0.07), 0xeed4ab, x, y, 0.02);
    part(p, sph(0.09), 0xff7a9a, 0, -0.03, 0.13, { sx: 1.2, sz: 0.4 });
    for (const [x, y] of [[-0.14, 0.15], [-0.05, 0.2], [0.05, 0.2], [0.14, 0.15]]) part(p, sph(0.035), 0xff7a9a, x, y, 0.08, { sz: 0.5 });
  }
  return g;
}
function puffCloud(color = C.white, flat = 0.55) {
  const g = new THREE.Group();
  part(g, sph(0.33), color, 0, 0, 0, { sz: flat });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; part(g, sph(0.2 + 0.05 * (i % 2)), color, Math.cos(a) * 0.38, Math.sin(a) * 0.24, 0, { sz: flat }); }
  return g;
}
function thoughtBubble() {
  const g = puffCloud(C.white, 0.5);
  part(g, sph(0.09), C.white, -0.33, -0.42, 0, { sz: 0.6 }); part(g, sph(0.055), C.white, -0.45, -0.56, 0, { sz: 0.6 });
  return g;
}
function speech(dots = true) {
  const g = new THREE.Group();
  part(g, roundedBox(1, 0.7, 0.24, 0.3, 4), C.white);
  part(g, new THREE.ConeGeometry(0.12, 0.28, 12), C.white, -0.25, -0.42, 0, { rz: -0.4, sz: 0.6 });
  if (dots) for (const x of [-0.24, 0, 0.24]) part(g, sph(0.07), C.blue, x, 0.02, 0.13, { sz: 0.6 });
  return g;
}
function clipboard() {
  const g = new THREE.Group();
  part(g, roundedBox(0.72, 0.95, 0.07, 0.06, 2), C.brown);
  part(g, roundedBox(0.58, 0.74, 0.03, 0.02, 1), C.white, 0, -0.05, 0.05);
  for (let i = 0; i < 4; i++) part(g, new THREE.BoxGeometry(0.4 - (i % 2) * 0.1, 0.035, 0.02), 0x9aa8c8, -0.02 - (i % 2) * 0.05, 0.15 - i * 0.14, 0.07).userData.ink = false;
  part(g, roundedBox(0.3, 0.12, 0.1, 0.04, 2), C.gray, 0, 0.45, 0.06);
  return g;
}
function mug() {
  const g = new THREE.Group();
  part(g, new THREE.CylinderGeometry(0.3, 0.27, 0.56, 28), C.teal, 0, -0.12, 0);
  part(g, new THREE.TorusGeometry(0.15, 0.05, 10, 20), C.teal, 0.33, -0.1, 0, { rz: 0 });
  part(g, new THREE.CylinderGeometry(0.26, 0.26, 0.02, 24), 0x6a3a1a, 0, 0.15, 0);
  for (const [x, y] of [[-0.1, 0.32], [0.05, 0.42], [-0.04, 0.52]]) part(g, sph(0.06), 0xf0f4ff, x, y, 0);
  shine(g, -0.17, -0.05, 0.27, 0.04, 0.12);
  return g;
}
function drops() {
  const g = new THREE.Group();
  const drop = (x, y, s) => { part(g, sph(0.16 * s), C.sky, x, y, 0); part(g, new THREE.ConeGeometry(0.15 * s, 0.26 * s, 16), C.sky, x, y + 0.17 * s, 0); shine(g, x - 0.05 * s, y + 0.03 * s, 0.14 * s, 0.03 * s, 0.06 * s); };
  drop(-0.15, -0.05, 1.2); drop(0.25, 0.2, 0.8);
  return g;
}
function toolbox() {
  const g = new THREE.Group();
  part(g, roundedBox(1, 0.55, 0.5, 0.07, 2), 0xe8283a, 0, -0.1, 0);
  part(g, roundedBox(1.04, 0.12, 0.54, 0.04, 2), 0xb81a2a, 0, 0.12, 0);
  part(g, new THREE.TorusGeometry(0.2, 0.05, 8, 20, Math.PI), C.gray, 0, 0.18, 0);
  for (const x of [-0.3, 0.3]) part(g, roundedBox(0.1, 0.12, 0.06, 0.02, 1), C.gray, x, 0.05, 0.27);
  shine(g, -0.32, -0.02, 0.26, 0.1, 0.04);
  return g;
}
function heartSparkle() { const g = heart(C.pink); const s = sparkle(); s.scale.setScalar(0.45); s.position.set(0.35, 0.32, 0.15); g.add(s); return g; }

const BUILD = {
  "💛": () => heart(0xffd21f), "❤️": () => heart(C.red), "💖": heartSparkle, "💗": () => heart(C.pink), "💞": () => heart(C.pink),
  "✨": () => sparkle(), "⭐": () => sparkle(), "❌": cross, "➕": () => plus(), "👑": crown,
  "⏸️": () => button(C.orange, "pause"), "▶️": () => button(0xff4a3a, "play"), "🔁": () => button(C.orange, "repeat"),
  "😤": () => face("huff"), "🥺": () => face("plead"), "🥹": () => face("teary"), "🤗": () => face("hug"),
  "🖐️": () => handIcon("open"), "☝️": () => handIcon("point"), "🙏": () => handIcon("pray"), "🤝": () => handIcon("paw"),
  "👇": () => { const g = new THREE.Group(); const h = handIcon("point"); h.rotation.z = Math.PI; g.add(h); return g; },
  "👉": () => { const g = new THREE.Group(); const h = handIcon("point"); h.rotation.z = -Math.PI / 2; g.add(h); return g; },
  "💭": thoughtBubble, "💬": () => speech(true), "📋": clipboard, "☕": mug, "💦": drops, "🧰": toolbox, "💨": () => puffCloud(0xf4f6ff, 0.8),
};

// build, ink and normalise a model so its largest side is 1 (centred on the origin)
function buildModel(name) {
  const make = BUILD[name];
  if (!make) { console.warn("icons3d: no model for", name); return null; }
  const inner = make();
  const box = new THREE.Box3().setFromObject(inner), size = box.getSize(V(0, 0, 0)), c = box.getCenter(V(0, 0, 0));
  const k = 1 / Math.max(size.x, size.y);
  inner.position.sub(c.multiplyScalar(1));
  const wrap = new THREE.Group(); wrap.add(inner); wrap.scale.setScalar(k); wrap.updateMatrixWorld(true);
  outline(inner, { width: 0.028, min: 0.0 });
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  const root = new THREE.Group(); root.add(wrap); root.visible = false;
  return root;
}

// ---------------------------------------------------------------- the manager
export function createIcons3D({ renderer, scene, camera }) {
  const iconScene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc8b8d8, 2.3), dir = new THREE.DirectionalLight(0xffffff, 1.7);
  iconScene.add(hemi, dir, dir.target);
  const pools = new Map(), used = new Map();
  let anyShown = false;
  function take(name) {
    if (!pools.has(name)) pools.set(name, []);
    const pool = pools.get(name), i = used.get(name) ?? 0;
    if (!pool[i]) { const m = buildModel(name); if (!m) return null; iconScene.add(m); pool[i] = m; }
    used.set(name, i + 1); anyShown = true; return pool[i];
  }
  function hideAll() { for (const pool of pools.values()) for (const m of pool) m.visible = false; used.clear(); anyShown = false; for (const f of fxList) f.m.visible = false; }

  // draw the icons over the main scene (depth cleared) every time the main scene is drawn, into the screen or a render target
  const render = renderer.render.bind(renderer);
  const fw = V(0, 0, 0), up = V(0, 0, 0), rt = V(0, 0, 0);
  renderer.render = (s, c) => {
    render(s, c);
    if (s !== scene || !(anyShown || fxList.some((f) => f.m.visible))) return;
    c.getWorldDirection(fw); up.set(0, 1, 0).applyQuaternion(c.quaternion); rt.set(1, 0, 0).applyQuaternion(c.quaternion);
    dir.position.copy(c.position).addScaledVector(up, 2).addScaledVector(rt, -1.2).addScaledVector(fw, -1); dir.target.position.copy(c.position).addScaledVector(fw, 3);
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); render(iconScene, c); renderer.autoClear = ac;
  };

  // keep every icon inside the frame (pulled back in from the edges) and big enough to read
  const _fp = V(0, 0, 0), _fw = V(0, 0, 0), _fd = V(0, 0, 0);
  function frameFit(p, size, { minH = 0.1, maxH = 0.3, top = 0.82, bottom = -0.45 } = {}) {
    const dist = Math.max(0.2, camera.position.distanceTo(p)), half = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const sz = Math.min(maxH * 2 * half, Math.max(minH * 2 * half, size));
    _fp.copy(p).project(camera);
    const hy = sz / (2 * half), hx = (sz / 2) / (half * camera.aspect);
    _fp.x = Math.min(0.94 - hx, Math.max(-0.94 + hx, _fp.x)); _fp.y = Math.min(top - hy, Math.max(bottom + hy, _fp.y));
    _fp.z = 0.5; _fp.unproject(camera);
    camera.getWorldDirection(_fw); _fd.copy(_fp).sub(camera.position).normalize();
    const depth = p.clone().sub(camera.position).dot(_fw);
    return { pos: camera.position.clone().addScaledVector(_fd, depth / Math.max(0.2, _fd.dot(_fw))), size: sz };
  }
  // face the camera, with a gentle turn so the model reads as 3D; a springy pop as it appears
  function place(m, pos, size, on, { t = 0, bob = 0, rot = 0, turn = 0.32, seed = 0 } = {}) {
    m.visible = true; m.position.copy(pos); m.position.y += bob * Math.sin(t * 5 + seed);
    m.quaternion.copy(camera.quaternion);
    m.rotateY(turn * Math.sin(t * 1.9 + seed * 1.7)); m.rotateZ(rot + 0.06 * Math.sin(t * 2.3 + seed));
    const pop = on < 1 ? on * (1 + 0.35 * Math.sin(Math.PI * on)) : 1;
    m.scale.setScalar(Math.max(1e-4, size * pop));
  }
  function showIcon(ch, pos, size, on, { bob = 0, t = 0, fit = {}, rot = 0 } = {}) {
    if (on <= 0.01) return;
    const m = take(ch); if (!m) return;
    const f = frameFit(pos, size, fit);
    place(m, f.pos, f.size, on, { t, bob, rot, seed: ch.codePointAt(0) % 7 });
  }
  // a puffy thought bubble with a model inside
  function showBubble(ch, pos, size, on) {
    if (on <= 0.01) return;
    const f = frameFit(pos, size, { minH: 0.16, maxH: 0.34 });
    const b = take("💭"); place(b, f.pos, f.size, on, { turn: 0.12, t: 0 });
    const m = take(ch); if (!m) return;
    const toCam = camera.position.clone().sub(f.pos).normalize();
    place(m, f.pos.clone().addScaledVector(toCam, f.size * 0.3).add(V(0, f.size * 0.02, 0)), f.size * 0.5, on, { turn: 0.25, seed: 3 });
  }
  function inFront(d, right = 0, upAmt = 0) {
    const f = V(0, 0, 0); camera.getWorldDirection(f);
    const u = V(0, 1, 0).applyQuaternion(camera.quaternion), r = V(1, 0, 0).applyQuaternion(camera.quaternion);
    return camera.position.clone().addScaledVector(f, d).addScaledVector(r, right).addScaledVector(u, upAmt);
  }
  // bursts tied to times: each piece flies out, spins and shrinks away
  const fxList = [];
  function burst(t0, center, n, { ch = "✨", dur = 1.3, spread = 0.5, rise = 0.9, size = 0.2, gap = 0.1, spin = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = spread * (0.35 + 0.65 * ((i * 37) % 10) / 10);
      const from = center.clone().add(V(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5));
      const m = buildModel(Array.isArray(ch) ? ch[i % ch.length] : ch); if (!m) continue; iconScene.add(m);
      fxList.push({ m, t0: t0 + i * gap, dur, from, to: from.clone().add(V(Math.cos(a) * r, rise, Math.sin(a) * r * 0.5)), size: size * 0.85, spin: (i % 2 ? 1 : -1) * (spin || 0.6), seed: i });
    }
  }
  function drawFx(t) {
    for (const f of fxList) {
      const u = (t - f.t0) / f.dur;
      if (u < 0 || u > 1) { f.m.visible = false; continue; }
      const p = f.from.clone().lerp(f.to, easeIO(u));
      const grow = easeOut(clamp01(u * 4)), fade = 1 - clamp01((u - 0.7) / 0.3);
      place(f.m, p, f.size * grow * fade, 1, { t, rot: f.spin * u * 3, turn: 0.5, seed: f.seed });
    }
  }
  return { iconScene, hideAll, showIcon, showBubble, inFront, burst, drawFx, frameFit, has: (ch) => !!BUILD[ch] };
}
