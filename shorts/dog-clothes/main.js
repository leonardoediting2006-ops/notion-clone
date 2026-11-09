import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon, toonGradient, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { createSheet, drape, settle, commit, pileTop, colliders } from "../../js/cloth.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { buildOutside } from "./outside.js";

// "Why your dog sleeps on your dirty clothes" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// 20 shots in one flat, a slow eased camera move in each, a real cross-dissolve at every cut, no on-screen text (icons only), vivid colour.
// The clothes are real soft cloth (js/cloth.js): every garment is a puffy sheet draped over what is under it (the floor, the clothes below it,
// the basket, the couch, the dog), so cloth and dog meet cleanly and nothing ever pokes through. Every state is a pure function of time.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function idx(word, nth = 1) {
  let n = 0;
  for (let i = 0; i < words.length; i++) if (norm(words[i].text) === norm(word) && ++n === nth) return i;
  throw new Error(`Cue "${word}" #${nth} not found in the voiceover`);
}
const at = (word, nth = 1) => words[idx(word, nth)].start;
const END = words.at(-1).end;
const DURATION = Math.ceil((END + 0.1) * FPS) / FPS; // no tail after the last word: the voice runs on into the first line

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 52, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.05; camera.far = 600; camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = { in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inOut: (u) => u * u * (3 - 2 * u), glide: (u) => lerp(u, u * u * (3 - 2 * u), 0.7) };
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const bump = (u) => Math.sin(Math.PI * clamp01(u));

// ---------- word cues (seconds): 20 shots, each begins a hair before the first word of its idea ----------
const STARTS = [
  0, at("naughty") - 0.1, at("when", 2) - 0.07, at("buried") - 0.3, at("probably") - 0.2, at("see") - 0.16, at("using") - 0.1, at("dog", 2) - 0.2, at("while") - 0.05,
  at("breath") - 0.25, at("close") - 0.3, at("has", 2) - 0.4, at("know") - 0.3, at("nervous") - 0.25, at("So") - 0.03, at("bury") - 0.12, at("flooding") - 0.08,
  at("ruining") - 0.35, at("have") - 0.25, at("which") - 0.07,
];
const NSHOT = STARTS.length;
const shotOf = (t) => { let k = 1; for (let i = 1; i < NSHOT; i++) if (t >= STARTS[i]) k = i + 1; return k; };
const T0 = (k) => STARTS[k - 1];
const T1 = (k) => (k < NSHOT ? STARTS[k] : DURATION);
const C = {
  naughty: at("naughty"), dirty: at("dirty"), clothes1: at("clothes", 1), come: at("come"), find: at("find"), curled: at("curled"), laundry1: at("laundry", 1), basket: at("basket"),
  buried: at("buried"), jacket: at("jacket"), couch: at("couch"), probably: at("probably"), soft: at("soft"), fabric: at("fabric"), blanket: at("blanket"),
  using: at("using"), scent: at("scent"), oxygen: at("oxygen"), mask: at("mask"), million: at("million"), receptors: at("receptors"), nose: at("nose"),
  shirt: at("shirt"), portrait: at("portrait"), breath: at("breath"), skin: at("skin"), safety: at("safety"), close: at("close"), front: at("front"), door1: at("door", 1),
  silent: at("silent"), time: at("time"), minutes: at("minutes"), years: at("years"), nervous: at("nervous"), sensory: at("sensory"), heart: at("heart"), spikes: at("spikes"),
  drag: at("drag"), nest: at("nest"), bury: at("bury"), snout: at("snout"), oxytocin: at("oxytocin"), slow: at("slow"), pulse: at("pulse"), ruining: at("ruining"), holding: at("holding"),
  left: at("left"), until: at("until"), walk: at("walk"), door2: at("door", 2),
};

// ---------- the world: one flat. x -3.2..3.2, z -2..5 (the front door is on the z = 5 wall); everything static is merged and outlined ----------
const places = { r: new THREE.Group() };
scene.add(places.r);
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

// the house objects the cloth and the dog meet (kept as plain numbers so cloth can drape over them exactly)
const NP = V(0.55, 0, 3.1);        // the nest in front of the door
const BP = V(-1.45, 0, 3.0);       // the laundry basket
const BR = 0.4, BH = 0.5;           // basket inner radius and rim height
const COUCH = { x0: -3.2, x1: -2.15, z0: -0.2, z1: 2.2, seat: 0.53, back: 1.0, arm: 0.7 };
const couchTop = (x, z) => { // height of the couch surface at a point (the seat, the back, the arms), else 0
  if (z < COUCH.z0 || z > COUCH.z1 || x > COUCH.x1) return 0;
  if (x < COUCH.x0 + 0.28) return COUCH.back;
  if (z < COUCH.z0 + 0.2 || z > COUCH.z1 - 0.2) return COUCH.arm;
  return COUCH.seat + 0.06;          // seat cushion top
};
const basketFloor = (x, z) => { // inside the basket: its floor; on its rim: the rim; outside: the ground
  const r = Math.hypot(x - BP.x, z - BP.z);
  if (r < BR - 0.04) return 0.1;
  if (r < BR + 0.05) return BH + 0.01;
  return 0;
};

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

// ---------- the laundry basket: a woven toon basket with a rim and two handles ----------
const basket = (() => {
  const g = new THREE.Group();
  const pts = [[0, 0], [0.34, 0], [0.39, 0.1], [0.42, 0.3], [0.43, 0.5], [0.4, 0.5], [0.37, 0.3], [0.34, 0.12], [0, 0.1]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), new THREE.MeshToonMaterial({ map: weaveTex.clone(), gradientMap: toonGradient(), side: THREE.DoubleSide }));
  body.material.map.repeat.set(5, 2); body.material.map.needsUpdate = true;
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.415, 0.032, 10, 40), toon(0xb87430)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; g.add(rim);
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 16, Math.PI), toon(0xb87430)); h.position.set(s * 0.425, 0.4, 0); h.rotation.set(0, Math.PI / 2, s > 0 ? 0 : Math.PI); h.rotation.z = Math.PI / 2 * 0; g.add(h); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  outline(g, { width: 0.012, min: 0.02 });
  g.position.copy(BP); scene.add(g);
  return g;
})();

// ===================== the world outside: garden, street, trees, houses, sky =====================
const outside = buildOutside();
scene.add(outside.group, outside.sky);
scene.fog = new THREE.Fog(0xe9f8ff, 45, 260);
// what the day looks like out there, per shot: a bright summer noon, a time-lapse of days and seasons (13), golden-hour autumn (18, 19)
function outsideState(t, k) {
  const base = { light: 1, warm: 0, sunEl: 0.9, sunAz: 0.3, season: 1, moonEl: -1, moonAz: 0 };
  if (k === 13) {
    const p = clamp01(U(t, 13) / SL(13)), dd = (0.3 + 1.7 * p) % 1, s = Math.sin(2 * Math.PI * (dd - 0.25));
    const f = (dd - 0.25) / 0.5, g2 = (((dd + 0.5) % 1) - 0.25) / 0.5;      // the sun crosses between 0.25 and 0.75, the moon between 0.75 and 1.25
    return { light: clamp01(0.5 + 1.2 * s), warm: clamp01(1 - Math.abs(s) * 3.5), sunEl: f >= 0 && f <= 1 ? 0.06 + 0.2 * Math.sin(Math.PI * f) : -0.5, sunAz: lerp(0.38, -0.38, clamp01(f)), moonEl: g2 >= 0 && g2 <= 1 ? 0.08 + 0.2 * Math.sin(Math.PI * g2) : -0.5, moonAz: lerp(0.38, -0.38, clamp01(g2)), season: 3.99 * p };
  }
  if (k === 18) return { ...base, light: 0.85, warm: 1, sunEl: 0.17, sunAz: -0.42, season: 2 };
  if (k === 19) return { ...base, light: 0.85, warm: 1, sunEl: 0.1, sunAz: Math.PI / 2, season: 2 };
  return base;
}

// ===================== the clothes: soft cloth, draped =====================
const GARMENTS = [ // the nest in front of the door (bottom to top): kind, size, colour, stripe, turn, offset x, offset z
  ["jeans", 1.35, "#2f6fd6", null, 0.35, 0.0, 0.0], ["hoodie", 1.15, "#ff5a36", null, -0.7, -0.14, 0.12], ["tee", 1.0, "#ffd02e", null, 1.1, 0.22, -0.14], ["jacket", 1.1, "#2fbf7a", null, 2.5, -0.05, -0.2],
  ["tee", 0.95, "#3fb0ff", "#ffffff", 2.2, 0.0, 0.16], ["sock", 0.55, "#b25cff", "#ffe14a", 0.4, 0.42, 0.3], ["tee", 0.9, "#ff6aa8", null, -2.0, -0.3, 0.05],
];
const nestSheets = GARMENTS.map(([kind, size, color, stripe, rot, ox, oz], i) => { const s = createSheet({ kind, w: size, d: size, color, stripe, seed: i + 1 }); s.mesh.material.polygonOffset = true; s.mesh.material.polygonOffsetFactor = -i * 0.4; scene.add(s.mesh); s.pl = { x: NP.x + ox, z: NP.z + oz, rot }; return s; });
const BASKET_GARMENTS = [["tee", 0.68, "#3fe0b0", "#ffffff", 0.2, 0.0, 0.0], ["hoodie", 0.72, "#9a5cff", null, 1.9, 0.04, -0.04], ["jeans", 0.82, "#3a6fc4", null, -1.0, -0.04, 0.06]];
const basketSheets = BASKET_GARMENTS.map(([kind, size, color, stripe, rot, ox, oz], i) => { const s = createSheet({ kind, w: size, d: size, color, stripe, seed: 20 + i }); scene.add(s.mesh); s.pl = { x: BP.x + ox, z: BP.z + oz, rot }; return s; });
const spill = createSheet({ kind: "tee", w: 0.72, d: 0.72, color: "#ff5a6a", stripe: "#ffffff", seed: 31 }); scene.add(spill.mesh); spill.pl = { x: BP.x + 0.3, z: BP.z - 0.1, rot: 0.9 };   // hangs over the rim
const oldShirt = createSheet({ kind: "tee", w: 0.95, d: 0.95, color: "#8f96b4", seed: 41 }); oldShirt.mesh.material.polygonOffset = true; oldShirt.mesh.material.polygonOffsetFactor = -3; scene.add(oldShirt.mesh);   // the one he buries his snout in
const jacket = createSheet({ kind: "jacket", w: 1.5, d: 1.5, color: "#2f7ae0", seed: 51 }); scene.add(jacket.mesh);   // the old jacket on the couch
const bundle = (() => { // a scrunched shirt carried in his mouth: a puffy lump with two floppy sleeves
  const g = new THREE.Group(), m = toon(0x8f96b4), m2 = toon(0x767ea0);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), m); b.scale.set(1.2, 0.9, 1); g.add(b);
  const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), m2); b2.position.set(0.05, 0.05, 0.03); g.add(b2);
  for (const s of [-1, 1]) { const sl = new THREE.Group(); sl.position.set(s * 0.08, -0.02, 0); const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.16, 4, 8), m); c.position.y = -0.1; sl.add(c); g.add(sl); g.userData["sl" + (s > 0 ? "R" : "L")] = sl; }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.008, min: 0.01 });
  g.visible = false; scene.add(g); return g;
})();

// ===================== light and mood =====================
const MOODS = {
  day: { hemi: [0xfff6e4, 0xe0c9a0, 2.3], key: [0xfff0d2, 1.5], bg: "#bfe6ff" },
  quiet: { hemi: [0xb4c8ff, 0x9a8cc8, 1.75], key: [0xc8d8ff, 0.85], bg: "#9db4e8" },
  warm: { hemi: [0xfff0d8, 0xe8b890, 2.3], key: [0xffd8a0, 1.45], bg: "#ffe0b0" },
};
const MOOD = ["day", "day", "day", "day", "day", "day", "day", "day", "day", "day", "quiet", "quiet", "quiet", "quiet", "warm", "warm", "warm", "warm", "warm", "warm"];
const hemi = new THREE.HemisphereLight(0xfff6e4, 0xe0c9a0, 2.3);
const key = new THREE.DirectionalLight(0xfff0d2, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
scene.add(hemi, key, key.target);

// ---------- emoji sprites, thought bubbles, bursts ----------
function emojiSprite(ch, size = 100) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.font = `${size}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 64, 72);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8; s.visible = false; scene.add(s); return s;
}
const icons = new Map();
const ico = (ch) => { if (!icons.has(ch)) icons.set(ch, emojiSprite(ch)); return icons.get(ch); };
function bubbleSprite(emoji, fs = 80) {
  const c = document.createElement("canvas"); c.width = 200; c.height = 180;
  const x = c.getContext("2d");
  x.lineWidth = 9; x.strokeStyle = "#2b1b16"; x.fillStyle = "#fff";
  x.beginPath(); x.ellipse(100, 76, 86, 62, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  for (const [cx, cy, r] of [[56, 148, 14], [34, 170, 8]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.stroke(); }
  x.font = `${fs}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(emoji, 100, 82);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8; s.visible = false; scene.add(s); return s;
}
const BUB = { soft: bubbleSprite("🧸", 84), plain: bubbleSprite("😐", 84), dogSees: bubbleSprite("👃", 84) };
const fxList = [];
function burst(t0, center, n, { ch = "✨", dur = 1.3, spread = 0.5, rise = 0.9, size = 0.2, gap = 0.1, spin = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = spread * (0.35 + 0.65 * ((i * 37) % 10) / 10);
    const from = center.clone().add(V(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5));
    fxList.push({ s: emojiSprite(Array.isArray(ch) ? ch[i % ch.length] : ch), t0: t0 + i * gap, dur, from, to: from.clone().add(V(Math.cos(a) * r, rise, Math.sin(a) * r * 0.5)), size, spin: spin ? (i % 2 ? 1 : -1) * spin : 0 });
  }
}
function travel(t0, from, to, ch, { dur = 1.1, size = 0.28, arc = 0.5 } = {}) { fxList.push({ s: emojiSprite(ch), t0, dur, from, to, size, arc }); }
function drawFx(t) {
  for (const f of fxList) {
    const u = (t - f.t0) / f.dur;
    if (u < 0 || u > 1) { f.s.visible = false; continue; }
    f.s.visible = true;
    f.s.position.lerpVectors(f.from, f.to, ease.inOut(u));
    if (f.arc) f.s.position.y += Math.sin(Math.PI * u) * f.arc;
    f.s.scale.setScalar(f.size * (0.7 + 0.3 * ease.out(Math.min(1, u * 3))));
    f.s.material.opacity = Math.min(1, Math.sin(Math.PI * u) * 2.2);
    if (f.spin) f.s.material.rotation = f.spin * u;
  }
}

// ===================== cast =====================
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
scene.add(owner);
const DOGS = 0.74;
const dog = heroDog(DOG_COLORS.golden, "g", DOGS);
toonify(dog, { override: [[dog.materials.body, dog.colors.body], [dog.materials.light, dog.colors.light], [dog.materials.dark, dog.colors.dark]] });
outline(dog, { width: 0.012, min: 0.1 });
scene.add(dog);

// ---------- the oxygen mask: a bold cyan boxy cup over his whole snout, a white rim, a filter with vents, straps back to the ears, and an orange hose to the old shirt ----------
const mask = (() => {
  const g = new THREE.Group(), shell = toon(0x1fc8ff), white = toon(0xffffff), navy = toon(0x1f2f8a), orange = toon(0xff8a1f);
  const body = new THREE.Mesh(roundedBox(0.34, 0.27, 0.34, 0.06, 3), shell); body.position.set(0, -0.005, 0.335); g.add(body);
  const rim = new THREE.Mesh(roundedBox(0.37, 0.3, 0.05, 0.03, 2), white); rim.position.set(0, -0.005, 0.185); g.add(rim);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 22).rotateX(Math.PI / 2), white); cap.position.set(0, 0.0, 0.515); g.add(cap);   // the filter
  for (const [x, y] of [[-0.032, 0.0], [0.032, 0.0], [0, 0.034], [0, -0.034]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.045, 8).rotateX(Math.PI / 2), navy); v.position.set(x, y, 0.52); g.add(v); }
  for (const sd of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.06, 0.26), navy); st.position.set(sd * 0.168, 0.03, 0.06); g.add(st); }   // straps back along the cheeks
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 12), orange); nub.position.set(0, -0.19, 0.42); g.add(nub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.013, 8, 14), white); ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.245, 0.42); g.add(ring);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  outline(g, { width: 0.01, min: 0.014 });
  g.visible = false; dog.head.add(g); return g;
})();
const hoseMat = toon(0xff9a3a);
let hoseMesh = null;
function updateHose(on, a, b, sag) { // from the mask to a point on the shirt, sagging between
  if (hoseMesh) { scene.remove(hoseMesh); hoseMesh.geometry.dispose(); hoseMesh = null; }
  if (!on) return;
  const m1 = a.clone().lerp(b, 0.35).add(V(0, -sag * 0.6, 0)), m2 = a.clone().lerp(b, 0.7).add(V(0, -sag, 0));
  const curve = new THREE.CatmullRomCurve3([a, m1, m2, b]);
  hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.03, 10), hoseMat); hoseMesh.castShadow = true; hoseMesh.userData.ink = false; scene.add(hoseMesh);
  hoseMesh.userData.curve = curve;
}

// ---------- particles that stream along a path: scent into the nose, a swarm of receptors ----------
function makeStream(n, color, size) {
  const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true }));
  pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 6; scene.add(pts);
  return { pts, n, color: new THREE.Color(color) };
}
const hue = (h) => new THREE.Color().setHSL(h % 1, 0.9, 0.58);
const scentStream = makeStream(60, 0xff6aa8, 0.08);
const swarm = makeStream(420, 0xffd24a, 0.045);

// ---------- graphics drawn into small canvases: the heartbeat line, the portrait of you, the sky in the window ----------
function canvasSprite(w, h, scale) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 9; s.visible = false; s.scale.set(scale * (w / h), scale, 1); scene.add(s);
  return { s, ctx: c.getContext("2d"), tex: t, w, h, scale };
}
const ekg = canvasSprite(300, 150, 0.5);
function drawEkg(t, bpm, amp = 1) {
  const { ctx: x, w, h, tex } = ekg;
  x.clearRect(0, 0, w, h);
  x.fillStyle = "rgba(20,24,40,0.88)"; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 18); x.fill();
  x.lineWidth = 6; x.strokeStyle = "#2b1b16"; x.stroke();
  x.strokeStyle = "rgba(90,255,170,0.18)"; x.lineWidth = 1; for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * 30, 8); x.lineTo(i * 30, h - 8); x.stroke(); } for (let j = 1; j < 5; j++) { x.beginPath(); x.moveTo(8, j * 30); x.lineTo(w - 8, j * 30); x.stroke(); }
  x.strokeStyle = "#5bffaa"; x.lineWidth = 5; x.lineJoin = "round"; x.beginPath();
  for (let px = 12; px < w - 12; px += 2) {
    const ph = ((px / (w - 24)) * 2.2 + t * bpm / 60) % 1, y0 = h * 0.58;
    let y = y0;
    if (ph > 0.40 && ph < 0.44) y = y0 - (ph - 0.40) / 0.04 * 8 * amp; else if (ph >= 0.44 && ph < 0.47) y = y0 + (ph - 0.44) / 0.03 * 12 * amp - 8 * amp; else if (ph >= 0.47 && ph < 0.51) y = y0 + 4 * amp - (ph - 0.47) / 0.04 * (4 + 62 * amp); else if (ph >= 0.51 && ph < 0.55) y = y0 - 58 * amp + (ph - 0.51) / 0.04 * (58 + 12) * amp; else if (ph >= 0.55 && ph < 0.58) y = y0 + 12 * amp - (ph - 0.55) / 0.03 * 12 * amp; else if (ph > 0.68 && ph < 0.78) y = y0 - Math.sin(((ph - 0.68) / 0.1) * Math.PI) * 14 * amp;
    px === 12 ? x.moveTo(px, y) : x.lineTo(px, y);
  }
  x.stroke(); tex.needsUpdate = true;
}
const portrait = canvasSprite(260, 320, 0.6);
{
  const x = portrait.ctx;
  const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "#ffe9a8"); g.addColorStop(1, "#ffb3d1");
  x.fillStyle = "#e0a82e"; x.beginPath(); x.roundRect(6, 6, 248, 308, 14); x.fill(); x.strokeStyle = "#2b1b16"; x.lineWidth = 8; x.stroke();
  x.fillStyle = g; x.beginPath(); x.roundRect(26, 26, 208, 268, 8); x.fill(); x.strokeStyle = "#7a4a10"; x.lineWidth = 4; x.stroke();
  for (let i = 0; i < 24; i++) { x.strokeStyle = `hsla(${i * 15},95%,60%,0.75)`; x.lineWidth = 5; x.beginPath(); x.arc(130, 170, 60 + (i % 6) * 10, i * 0.7, i * 0.7 + 1.3); x.stroke(); }
  x.fillStyle = "#3f8fe0"; x.beginPath(); x.ellipse(130, 262, 62, 40, 0, Math.PI, 0); x.fill(); x.lineWidth = 5; x.strokeStyle = "#2b1b16"; x.stroke();
  x.fillStyle = "#f1c7a0"; x.beginPath(); x.arc(130, 170, 46, 0, 6.3); x.fill(); x.stroke();
  x.fillStyle = "#5b3a22"; x.beginPath(); x.arc(130, 160, 48, Math.PI, 0); x.lineTo(176, 160); x.quadraticCurveTo(130, 128, 84, 160); x.fill(); x.stroke();
  x.fillStyle = "#2b1b16"; for (const dx of [-17, 17]) { x.beginPath(); x.arc(130 + dx, 176, 5.5, 0, 6.3); x.fill(); }
  x.strokeStyle = "#2b1b16"; x.lineWidth = 4; x.beginPath(); x.arc(130, 190, 14, 0.2, Math.PI - 0.2); x.stroke();
  portrait.tex.needsUpdate = true;
}

// ===================== inside his head (shot 17): a glass head, a glowing brain, hearts flooding in =====================
const BR0 = V(0, 80, -120);   // far above the garden, in its own little dream-space
const glowTex = (() => { const t = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })();
const brainW = (() => {
  const g = new THREE.Group(); g.position.copy(BR0); g.visible = false; scene.add(g);
  const bgTex = canvasTex(4, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3a1a8a"); gr.addColorStop(0.55, "#a14cd8"); gr.addColorStop(1, "#ff9ac8"); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const bg = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide, fog: false })); bg.userData.ink = false; g.add(bg);
  const bokeh = [];
  for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.1 + 0.28 * ((i * 37) % 10) / 10, 24), new THREE.MeshBasicMaterial({ color: [0xffc8e8, 0xc8b0ff, 0xffe0a0, 0xa8e8ff][i % 4], transparent: true, opacity: 0.16 + 0.14 * ((i * 13) % 5) / 5, depthWrite: false })); m.userData.ink = false; m.userData.i = i; g.add(m); bokeh.push(m); }
  const head = new THREE.Group(); head.scale.setScalar(0.8); g.add(head);
  const glass = new THREE.MeshToonMaterial({ color: 0xffa53a, transparent: true, opacity: 0.5, gradientMap: toonGradient(), depthWrite: false });
  const dark = new THREE.MeshToonMaterial({ color: 0xc26a1e, transparent: true, opacity: 0.85, gradientMap: toonGradient(), depthWrite: false });
  const inkM = new THREE.MeshBasicMaterial({ color: 0x2b1b16, side: THREE.BackSide });
  const add = (geo, mat, x, y, z, hull = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); head.add(m); if (hull) { const h = new THREE.Mesh(geo, inkM); h.position.copy(m.position); h.scale.setScalar(hull); h.userData.ink = false; head.add(h); m.userData.hull = h; } return m; };
  add(roundedBox(1.15, 0.95, 1.0, 0.2, 3), glass, 0, 0, 0, 1.035);
  add(roundedBox(0.58, 0.4, 0.5, 0.09, 2), glass, 0.86, -0.17, 0, 1.06);
  add(roundedBox(0.1, 0.08, 0.14, 0.02, 1), toon(0x2b1b16), 1.17, -0.01, 0);
  for (const z of [0.56, -0.56]) add(roundedBox(0.26, 0.58, 0.12, 0.05, 2), dark, -0.44, 0.1, z, 1.06);   // floppy ears at the sides
  { const eye = add(new THREE.TorusGeometry(0.09, 0.025, 8, 14, Math.PI), toon(0x2b1b16), 0.52, 0.14, 0.52); eye.rotation.z = Math.PI; }   // a shut, happy eye
  { const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.075, 18), new THREE.MeshBasicMaterial({ color: 0xff7a9a })); cheek.position.set(0.5, -0.1, 0.515); cheek.userData.ink = false; head.add(cheek); }
  const foldTex = canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#ff6fb0"; x.fillRect(0, 0, w, h); x.strokeStyle = "#c93a86"; x.lineWidth = 5; x.lineCap = "round"; for (let j = 0; j < 9; j++) { x.beginPath(); for (let i = 0; i <= 24; i++) { const px = (i / 24) * w, py = ((j + 0.5) / 9) * h + 7 * Math.sin(i * 1.3 + j * 2.1) + 4 * Math.sin(i * 0.5 + j); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } });
  const bm = new THREE.MeshToonMaterial({ map: foldTex, gradientMap: toonGradient() }), bm2 = new THREE.MeshToonMaterial({ map: foldTex, color: 0xffd6ea, gradientMap: toonGradient() });
  const brain = new THREE.Group(); brain.position.set(0.1, 0.16, 0); head.add(brain);
  const lobe = (z, mat) => { const geo = new THREE.SphereGeometry(0.4, 44, 30), p2 = geo.attributes.position; for (let i = 0; i < p2.count; i++) { const x = p2.getX(i), y = p2.getY(i), zz = p2.getZ(i), f = 1 + 0.07 * Math.sin(x * 12 + y * 5) * Math.cos(zz * 10 + x * 3) + 0.04 * Math.sin(y * 17 + zz * 7); p2.setXYZ(i, x * f, y * f, zz * f); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat); m.scale.set(1.15, 0.85, 0.55); m.position.z = z; return m; };
  brain.add(lobe(0.2, bm), lobe(-0.2, bm2));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff6fb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(2.4, 2.4, 1); glow.position.copy(brain.position); head.add(glow);
  const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 8, 44), new THREE.MeshBasicMaterial({ color: 0xffc8e8, transparent: true, opacity: 0, depthWrite: false })); r.position.copy(brain.position); r.userData.ink = false; head.add(r); return r; });
  g.traverse((o) => { if (o.isMesh && o.material !== bg.material) o.castShadow = false; });
  outline(head, { width: 0.012, min: 0.02 });
  return { g, head, brain, glow, rings, bokeh };
})();
const oxy = makeStream(170, 0xff6fb0, 0.075);   // oxytocin pouring in from the shirt

// ===================== the golden-hour sunbeam and dust (shot 18) =====================
const beam = (() => {
  const near = [[3.15, 0.95, 0.22], [3.15, 0.95, 2.38], [3.15, 2.15, 2.38], [3.15, 2.15, 0.22]], far = [[-0.8, 0.25, -0.3], [-0.8, 0.25, 3.0], [-0.8, 1.5, 3.0], [-0.8, 1.5, -0.3]];
  const pos = [], colr = [];
  for (const v of near) { pos.push(...v); colr.push(0.13, 0.085, 0.025); }
  for (const v of far) { pos.push(...v); colr.push(0, 0, 0); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ink = false; m.visible = false; m.renderOrder = 4; m.frustumCulled = false; scene.add(m);
  const N = 110, dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffd98a, size: 0.035, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); dust.frustumCulled = false; dust.visible = false; dust.userData.ink = false; scene.add(dust);
  return { m, dust, N };
})();

// ===================== the story: where everyone is, shot by shot (pure functions of time and shot) =====================
const U = (t, k) => Math.max(0, t - T0(k));
const SL = (k) => T1(k) - T0(k);
const mixv = (a, b, k) => a.clone().lerp(b, k);
const orb = (c, r, a, h) => V(c.x + r * Math.sin(a), c.y + h, c.z + r * Math.cos(a));
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const DN = { x: 0.55, z: 2.95 };                       // the dog's place in the nest (he lies facing the door, which is also where the camera stands)
const HOOK = { pos: V(0.3, 0.62, 4.8), look: V(0.55, 0.3, 3.15), fov: 46 };
const lying = (t, o = {}) => ({ t, lie: 1, wag: 0, headPitch: 0.02, headYaw: 0, headTilt: 0.1, ears: 0.1, sad: 0.2, cute: 1, closed: 0.9 * blink(t), ...o });
const sitting = (t, o = {}) => ({ t, sit: 1, wag: 0, headPitch: 0, headYaw: 0, headTilt: 0.1, ears: 0.1, sad: 0.2, cute: 1, closed: 0.9 * blink(t), ...o });

// ---------- the dog ----------
function dogState(t, k) {
  const u = U(t, k), L = SL(k);
  const inNest = (pose, ox = 0, oz = 0, ry = 0) => ({ x: DN.x + ox, z: DN.z + oz, ry, rest: "nest", pose });
  switch (k) {
    case 1: return inNest(lying(t, { headPitch: 0.03 + 0.02 * Math.sin(t * 1.3), headTilt: 0.12 }));
    case 2: return inNest(lying(t, { headPitch: 0.05, headTilt: 0.12 - 0.1 * prog(u, 0.5, 1.5), closed: 0.9 * blink(t) + 0.5 * bump(prog(u, 0.9, 1.7)) * 0 }));
    case 3: { // curled in the basket, head on the rim; he wakes when you gasp
      const wake = ease.inOut(prog(u, 1.85, 2.25));
      return { x: BP.x, z: BP.z + 0.04, ry: Math.PI, rest: "basket", pose: lying(t, { headPitch: -0.28, headTilt: 0.2, closed: lerp(0.95, 0.0, wake), ears: lerp(-0.2, 0.5, wake), sad: 0.1 }) };
    }
    case 4: return { x: -2.55, z: 0.48, ry: 0, rest: "couch", pose: lying(t, { headPitch: 0.1, headTilt: 0.15, closed: 0.92, ears: -0.2, sad: 0 }) };
    case 5: return { x: -2.55, z: 0.48, ry: 0, rest: "couch", pose: lying(t, { headPitch: 0.1, headTilt: 0.15, closed: 0.5 * (1 - prog(u, 0.9, 1.4)) + 0.4, ears: 0.1 }) };
    case 6: return inNest(lying(t, { headPitch: 0.1, headTilt: 0.1, ears: 0.2, closed: 0.5 * bump(prog(u, 0.2, 1.4)) }));
    case 7: return inNest(lying(t, { headPitch: 0.32, headTilt: 0.05, ears: 0.0, closed: 0.82, sad: 0 }), 0, 0.05);
    case 8: return inNest(lying(t, { headPitch: 0.12 + 0.05 * Math.sin(t * 9), headTilt: 0.0, closed: 0.0, ears: 0.35, jawOpen: 0.0 }));
    case 9: return inNest(lying(t, { headPitch: 0.34, headTilt: 0.05, closed: 0.55, ears: 0.1 }), 0, 0.05);
    case 10: return inNest(lying(t, { headPitch: 0.08, closed: 0.0, ears: 0.3 }));
    case 11: return { x: DN.x, z: DN.z, ry: 0.2, rest: "nest", pose: sitting(t, { closed: 0, ears: 0.5, wag: 0.9 * (1 - prog(u, 1.4, 2.2)), wagSpeed: 10, headTilt: 0.15, sad: 0.2 * prog(u, 1.4, 2.4) }) };
    case 12: return { x: DN.x, z: DN.z, ry: 0.0, rest: "nest", pose: sitting(t, { closed: 0, ears: 0.2, headTilt: 0.35 * Math.sin(u * 3.2), sad: 0.5, headPitch: -0.05 }) };
    case 13: return { x: DN.x, z: DN.z, ry: 0.0, rest: "nest", pose: sitting(t, { closed: 0, ears: -0.1, headTilt: 0.2, sad: 0.6, headYaw: -0.25 * Math.sin(u * 1.5) }) };
    case 14: return { x: DN.x, z: DN.z, ry: 0.0, rest: "nest", pose: sitting(t, { closed: 0, ears: -0.5, sad: 0.8, shiver: 0.5, headTilt: 0.1, pupil: 1.3 }) };
    case 15: { // from the basket to the nest with a shirt in his mouth; he sets it down on the pile
      const go = ease.inOut(prog(u, 0.45, 1.5)), drop = bump(prog(u, 1.45, 1.95));
      const x = lerp(BP.x + 0.55, DN.x - 0.15, go), z = lerp(BP.z + 0.1, DN.z + 0.5, go);
      return { x, z, ry: Math.atan2(DN.x - 0.15 - (BP.x + 0.55), DN.z + 0.5 - (BP.z + 0.1)), rest: "floor", pose: { t, walk: go > 0.02 && go < 0.98 ? 1 : 0.0, headPitch: 0.05 + 0.4 * drop, ears: 0.1, cute: 1, sad: 0.4, closed: 0, wag: 0 }, carry: u < 1.55 };
    }
    case 16: { // he turns round on the pile, lies down and pushes his snout into the shirt
      const circ = ease.inOut(prog(u, 0.05, 0.75)), lie = ease.inOut(prog(u, 0.7, 1.15)), head = ease.inOut(prog(u, 1.1, 1.55));
      return { x: DN.x + 0.0, z: DN.z + 0.15 * (1 - circ), ry: lerp(-Math.PI * 1.2, 0.0, circ), rest: "nest", pose: lying(t, { lie, walk: (1 - lie) * 0.8, headPitch: lerp(0.1, 0.42, head), headTilt: 0.05, closed: lerp(0, 0.75, head), ears: 0.0, sad: 0.4 }) };
    }
    case 17: return null;   // inside his head: the brain scene
    case 18: return inNest(lying(t, { headPitch: 0.4, closed: 0.97, ears: -0.1, sad: 0, breathe: 1 }));
    case 19: return null;   // outside: you run home up the path
    case 20: return inNest(lying(t, { headPitch: lerp(0.04, 0.03, prog(u, 0.2, 0.7)), headTilt: 0.12, ears: lerp(0.65, 0.1, prog(u, 0.05, 0.7)), sad: lerp(0.1, 0.2, prog(u, 0.2, 0.7)), wag: 0.6 * (1 - prog(u, 0.0, 0.6)), wagSpeed: 11 }));   // he hears you: head up, tail going, then he settles into the opening pose
    default: return null;
  }
}

// ---------- you ----------
function ownerState(t, k) {
  const u = U(t, k);
  if (k === 3) { // you come home: the door opens, you walk in round the nest, stop and gasp when you see him
    const w = ease.glide(prog(u, 0.45, 1.25)), see = ease.out(prog(u, 1.2, 1.4)), calm = 1 - prog(u, 2.3, 2.8) * 0;
    const s1 = prog(w, 0, 0.45), s2 = prog(w, 0.45, 1);                       // round the nest: door -> (0.0, 4.7) -> (-0.25, 3.9)
    const x = w < 0.45 ? lerp(0.85, 0.0, s1) : lerp(0.0, -0.25, s2), z = w < 0.45 ? lerp(5.15, 4.7, s1) : lerp(4.7, 3.9, s2);
    return { t, x, z, walk: w > 0.01 && w < 0.99 ? 1 : 0, walkPhase: t * 8, y: 0.05 * bump(prog(u, 1.2, 1.55)), cute: 0.5, eyes: { open: 1, size: 1 + 0.55 * see }, mouth: { open: 1.0 * see, smile: lerp(0.6, -0.4, see), width: 1 - 0.25 * see }, brow: { raise: 1.0 * see }, head: { tilt: -0.08 * see }, lean: -0.05 * see };
  }
  if (k === 5) return { t, x: -0.9, z: 1.9, y: 0, cute: 0.3, eyes: { open: 0.9 }, mouth: { open: 0, smile: 0.3 }, brow: { worry: 0.15 }, head: { tilt: 0.1 }, armR: { to: [0.18, 1.08], bend: 1 }, armL: { to: [-0.17, 0.78], bend: -1 }, look: [0.4, -0.4] };
  if (k === 9) return { t, x: -1.25, z: 2.6, y: 0, cute: 0.2, eyes: { open: 0.8 }, mouth: { open: 0, smile: 0 }, brow: {}, look: [0.5, -0.3], armL: { to: [-0.2, 0.8], bend: -1 }, armR: { to: [0.2, 0.8], bend: 1 } };
  if (k === 19) { // you run home up the garden path, reach the door and go in
    const run = ease.inOut(prog(u, 0.08, 1.85)), enter = ease.inOut(prog(u, 2.2, 2.45));
    return { t, x: 0.8, z: lerp(12.6, 6.0, run) - enter * 1.2, walk: run > 0.01 && run < 0.99 ? 1 : 0, walkPhase: t * 13, y: 0.04 * Math.abs(Math.sin(t * 6.5)) * (run > 0.01 && run < 0.99 ? 1 : 0), cute: 0.5, eyes: { open: 1, happy: 0.5 }, mouth: { open: 0.35, smile: 1, teeth: true }, brow: { raise: 0.45 }, head: { tilt: 0.05 }, show: enter < 0.97 };
  }
  if (k === 11) { // you open the front door and leave
    const go = ease.inOut(prog(u, 0.1, 0.5)), out = ease.inOut(prog(u, 0.7, 1.0)), zz = lerp(lerp(4.5, 4.7, go), 5.5, out);
    return { t, x: lerp(-0.8, 0.85, go), z: zz, walk: (go > 0.01 && go < 0.99) || (out > 0.01 && out < 0.99) ? 1 : 0, walkPhase: t * 8, y: 0, cute: 0.3, eyes: { open: 1 }, mouth: { open: 0, smile: 0.5 }, brow: {}, show: zz < 5.34 };
  }
  return null;
}

// ---------- cameras (each a slow, eased move) ----------
function cameraAt(t, k) {
  const u = U(t, k), L = SL(k), e = ease.glide(clamp01(u / L)), s = clamp01(u / L);
  switch (k) {
    case 1: { const m = ease.glide(s); return { pos: mixv(HOOK.pos, V(0.4, 0.52, 4.3), m), look: mixv(HOOK.look, V(0.55, 0.3, 3.15), m), fov: lerp(HOOK.fov, 43, m) }; }
    case 2: { const a = lerp(-0.45, -1.35, e); return { pos: orb(V(0.55, 0.0, 3.0), lerp(1.9, 2.3, e), a, lerp(0.7, 0.95, e)), look: V(0.55, 0.42, 3.0), fov: 50 }; }
    case 3: { // wide on the door as you come in, then in on your face for the gasp, then over to the basket
      const o = ownerState(t, 3), A = { pos: V(lerp(-0.1, -0.3, e), 1.1, lerp(0.7, 0.9, e)), look: V(0.45, 1.0, 4.7), fov: 52 };
      const B = { pos: V(o.x + 0.2, 1.55, o.z - 1.9), look: V(o.x, 1.52, o.z), fov: 44 }, Cc = { pos: V(-0.6, 0.95, 1.3), look: V(-1.5, 0.55, 3.0), fov: 52 };
      const a = ease.inOut(prog(u, 0.85, 1.25)), c2 = ease.inOut(prog(u, 1.8, 2.35));
      const AB = { pos: mixv(A.pos, B.pos, a), look: mixv(A.look, B.look, a), fov: lerp(A.fov, B.fov, a) };
      return { pos: mixv(AB.pos, Cc.pos, c2), look: mixv(AB.look, Cc.look, c2), fov: lerp(AB.fov, Cc.fov, c2) };
    }
    case 4: return { pos: V(lerp(-0.7, -1.0, e), lerp(0.8, 0.75, e), lerp(2.4, 1.9, e)), look: V(-2.7, 0.5, 0.6), fov: 48 };
    case 5: return { pos: V(lerp(0.9, 0.7, e), lerp(1.15, 1.1, e), lerp(3.5, 3.6, e)), look: V(lerp(-1.4, -1.6, e), 0.75, 1.1), fov: 54 };
    case 6: return { pos: V(lerp(0.0, 0.3, e), lerp(0.5, 0.42, e), lerp(4.4, 4.1, e)), look: V(0.55, 0.3, 3.3), fov: 48 };
    case 7: return { pos: V(lerp(1.2, 0.8, e), lerp(0.6, 0.48, e), lerp(4.8, 4.5, e)), look: V(0.5, 0.3, 3.4), fov: 46 };
    case 8: return { pos: V(lerp(1.35, 1.05, e), lerp(0.5, 0.42, e), lerp(4.2, 3.95, e)), look: V(0.5, 0.3, 3.5), fov: lerp(46, 42, e) };
    case 9: return { pos: V(lerp(1.25, 0.85, e), lerp(1.05, 0.85, e), 4.9), look: V(0.55, 0.5, 3.3), fov: 58 };   // wide enough for the pile below and the portrait above
    case 10: return { pos: V(lerp(-0.3, 0.3, e), lerp(0.8, 0.65, e), lerp(4.5, 4.6, e)), look: V(0.55, 0.3, 3.2), fov: 50 };
    case 11: return { pos: V(lerp(-1.0, -0.7, e), 1.05, lerp(1.1, 1.4, e)), look: V(0.65, 0.65, 4.1), fov: 56 };
    case 12: return { pos: V(lerp(1.5, 1.85, e), lerp(1.85, 1.95, e), lerp(0.3, -0.5, e)), look: V(1.9, 1.95, -1.9), fov: lerp(52, 44, e) };
    case 13: return { pos: V(lerp(0.0, 1.3, e), 1.55, lerp(1.1, 1.3, e)), look: V(3.2, 1.55, 1.3), fov: lerp(58, 50, e) };   // the whole window, pushing in on the garden
    case 14: return { pos: V(lerp(0.15, 0.4, e), 0.72, 4.8), look: V(0.55, 0.62, 3.0), fov: lerp(54, 50, e) };
    case 15: { const d = dogState(t, 15); return { pos: V(d.x - 0.2, 0.88, lerp(1.0, 1.3, e)), look: V(d.x + 0.32, 0.36, 3.3), fov: 56 }; }   // glides along beside him as he carries the shirt over
    case 16: { const m = ease.inOut(prog(u, 0.3, 1.5)); return { pos: V(lerp(0.95, 0.4, m), lerp(1.0, 0.55, m), lerp(4.6, 4.75, m)), look: V(0.55, lerp(0.5, 0.3, m), lerp(3.0, 3.1, m)), fov: lerp(55, 48, m) }; }   // wide enough to see him turn round on the pile, then in to the snout
    case 17: { const a = lerp(0.3, -0.35, e), r = lerp(3.9, 3.4, e); return { pos: V(BR0.x + r * Math.sin(a), BR0.y + 0.3, BR0.z + r * Math.cos(a)), look: V(BR0.x + 0.25, BR0.y + 0.0, BR0.z), fov: 46 }; }   // inside his head: a slow orbit round the glass head
    case 18: return { pos: V(lerp(-1.9, -1.5, e), 0.55, lerp(4.4, 4.1, e)), look: V(lerp(1.4, 1.2, e), 0.55, lerp(2.7, 2.9, e)), fov: 52 };   // across the room: him in front, the setting sun in the window behind
    case 19: { const a = ease.inOut(prog(u, 0.9, 1.9)); return { pos: V(lerp(1.9, 2.5, a), lerp(1.1, 1.3, a), lerp(6.6, 8.8, a)), look: V(0.8, 1.25, lerp(11, 5.4, a)), fov: lerp(52, 50, a) }; }   // outside: down the path as you run up it, then round to the door
    case 20: { const m = ease.glide(clamp01(u / 0.7)); return { pos: mixv(V(0.4, 0.46, 4.35), HOOK.pos, m), look: mixv(V(0.55, 0.28, 3.15), HOOK.look, m), fov: lerp(41, HOOK.fov, m) }; }   // back to the opening frame
    default: return { pos: HOOK.pos.clone(), look: HOOK.look.clone(), fov: HOOK.fov };
  }
}

// ===================== helpers for the frame =====================
const _p = V(0, 0, 0), _q = V(0, 0, 0);
const popK = (t, t0, dur = 0.9) => ease.out(prog(t, t0, t0 + 0.2)) * (1 - prog(t, t0 + dur - 0.2, t0 + dur));
function hideAll() { beam.m.visible = beam.dust.visible = false; oxy.pts.visible = false; for (const s of icons.values()) s.visible = false; for (const b of Object.values(BUB)) b.visible = false; ekg.s.visible = portrait.s.visible = false; scentStream.pts.visible = swarm.pts.visible = false; }
// every icon is kept inside the frame (pulled back in from the edges if its world spot is cropped) and kept big enough to read
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
function showIcon(ch, pos, size, on, { bob = 0, t = 0 } = {}) {
  if (on <= 0.01) return;
  const s = ico(ch), f = frameFit(pos, size);
  s.visible = true; s.position.copy(f.pos); s.position.y += bob * Math.sin(t * 5);
  s.scale.setScalar(f.size * on); s.material.opacity = Math.min(1, on * 1.4);
}
function setBub(s, on, pos, size) { s.visible = on > 0.01; if (!on) return; const f = frameFit(pos, size, { minH: 0.16, maxH: 0.34 }); s.position.copy(f.pos); s.scale.set(f.size * on, f.size * 0.9 * on, 1); s.material.opacity = Math.min(1, on * 1.5); }
function showCanvasSprite(o, pos, on, mul = 1) { if (on <= 0.01) return; o.s.visible = true; o.s.position.copy(pos); o.s.scale.set(o.scale * mul * (o.w / o.h) * on, o.scale * mul * on, 1); o.s.material.opacity = Math.min(1, on * 1.4); }

// bursts and flights tied to words
burst(C.dirty - 0.05, V(0.55, 0.45, 3.4), 5, { ch: ["💨", "🦠", "🧦"], spread: 0.9, rise: 0.8, size: 0.2, gap: 0.05, dur: 0.7 });
burst(C.portrait + 0.05, V(0.7, 0.9, 3.9), 14, { ch: ["✨", "💖", "⭐", "💛"], spread: 1.0, rise: 0.7, size: 0.2, gap: 0.08, dur: 1.2, spin: 0.5 });
burst(T0(3) + 1.2, V(-0.25, 1.85, 3.9), 4, { ch: ["❗", "✨"], spread: 0.4, rise: 0.5, size: 0.22, gap: 0.06, dur: 0.8 });
for (let i = 0; i < 12; i++) travel(C.oxytocin + 0.08 + i * 0.16, V(BR0.x - 0.95 + 0.25 * Math.sin(i * 1.7), BR0.y - 0.7 + 0.3 * Math.cos(i * 2.3), BR0.z + 0.5 * Math.sin(i * 1.3)), V(BR0.x + 0.05, BR0.y + 0.2, BR0.z + 0.35), "💗", { dur: 0.9, size: 0.3, arc: 0.35 });

// ===================== the dissolve between shots =====================
const rt = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType });
const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
veil.renderOrder = 1000; veil.frustumCulled = false; veil.visible = false; veil.userData.ink = false;
camera.add(veil);
const HALF = 0.2;
const doorLamp = new THREE.PointLight(0xffc070, 0, 8, 1.2); doorLamp.position.set(0.8, 1.3, 4.9); scene.add(doorLamp);

// the door: closed, opens inward, closes again (a pure function of time)
function doorAngle(t) {
  const swing = (a, b, from, to) => lerp(from, to, ease.inOut(prog(t, a, b)));
  let ang = 0;
  ang = Math.min(ang, -1.55 * (ease.inOut(prog(t, T0(3) + 0.1, T0(3) + 0.5)) - ease.inOut(prog(t, T0(3) + 2.3, T0(3) + 2.75))));
  ang = Math.min(ang, -1.55 * (ease.inOut(prog(t, T0(11) + 0.4, T0(11) + 0.8)) - ease.inOut(prog(t, T0(11) + 0.98, T0(11) + 1.12))));
  ang = Math.min(ang, -1.55 * (ease.inOut(prog(t, T0(19) + 1.95, T0(19) + 2.3)) - ease.inOut(prog(t, T0(20) + 0.15, T0(20) + 0.45))));
  return ang;
}


// ===================== the cloth: build once, squash where he lies, drape over him where needed =====================
let clothReady = false;
function buildCloth() {
  nestSheets.forEach((s, i) => drape(s, s.pl, { under: nestSheets.slice(0, i), blur: 2, wrinkle: 0.012, puff: 0.05, thick: 0.03 }));
  basketSheets.forEach((s, i) => drape(s, s.pl, { floor: basketFloor, under: basketSheets.slice(0, i), blur: 3, wrinkle: 0.012, puff: 0.05, thick: 0.04 }));
  drape(spill, spill.pl, { floor: basketFloor, under: basketSheets, blur: 3, wrinkle: 0.01, puff: 0.02, thick: 0.03 });
  oldShirt.pl = { x: DN.x + 0.06, z: DN.z + 0.58, rot: 0.3 };
  clothReady = true;
}
const nestTopRaw = (x, z) => { let h = 0; for (const s of nestSheets) { const g = s.sampleAt(x, z, "final"); if (g > h) h = g; } return h; };
const dogPoseComp = (ds) => { // how heavily he presses on the clothes, and where (a capsule round his body)
  if (!ds || ds.rest !== "nest") return null;
  const lie = ds.pose.lie ?? 0, sit = ds.pose.sit ?? 0, str = Math.max(lie, sit * 0.6);
  if (str < 0.01) return null;
  const dx = Math.sin(ds.ry), dz = Math.cos(ds.ry), f0 = lie > 0.5 ? -0.3 : -0.2, f1 = lie > 0.5 ? 0.45 : 0.0;
  const ax = ds.x + dx * f0, az = ds.z + dz * f0, bx = ds.x + dx * f1, bz = ds.z + dz * f1, abx = bx - ax, abz = bz - az, l2 = abx * abx + abz * abz;
  return (x, z) => { const t2 = clamp01(((x - ax) * abx + (z - az) * abz) / l2), d = Math.hypot(x - (ax + abx * t2), z - (az + abz * t2)), kk = 1 - clamp01((d - 0.14) / 0.3); return str * kk * kk * (3 - 2 * kk); };
};
const BASKET_TOP = (x, z) => { let h = 0.1; for (const s of basketSheets) { const g = s.sampleAt(x, z, "final"); if (g > h) h = g; } return h; };

// shot 17: the heartbeat is integrated so the rings and the heart line never jump while it slows from racing to calm
function updateBrain(t) {
  const bpmAt = (x) => lerp(180, 62, prog(x, C.slow - 0.1, C.pulse)), t0 = T0(17), n = 48, dt = (t - t0) / n;
  let B = 0; for (let i = 0; i < n; i++) B += (bpmAt(t0 + (i + 0.5) * dt) / 60) * dt;
  const thump = Math.max(0, 1 - ((B % 1) * 5)), w = brainW;
  w.brain.scale.setScalar(1 + 0.07 * thump); w.glow.material.opacity = 0.5 + 0.4 * thump; w.glow.scale.setScalar(2.2 + 0.5 * thump);
  w.head.rotation.y = 0.12 * Math.sin(t * 0.6); w.head.position.y = 0.04 * Math.sin(t * 1.2);
  w.rings.forEach((r, j) => { const f = (B + j / 3) % 1; r.scale.setScalar(0.6 + 2.2 * f); r.material.opacity = 0.55 * (1 - f) * (1 - f); });
  w.bokeh.forEach((m, i) => { m.position.set(4.5 * Math.sin(i * 1.7 + t * 0.12 * (1 + (i % 3))), 2.6 * Math.cos(i * 2.3 + t * 0.09), -3.5 - (i % 5) * 0.8); m.scale.setScalar(1 + 0.15 * Math.sin(t * 0.8 + i)); });
  // oxytocin pours from the shirt into the brain
  const N = oxy.n, nvis = Math.floor(N * prog(t, t0 + 0.05, C.oxytocin + 0.5)), pos = oxy.pts.geometry.attributes.position, col = oxy.pts.geometry.attributes.color;
  oxy.pts.visible = true;
  for (let i = 0; i < N; i++) {
    if (i >= nvis) { pos.setXYZ(i, 0, -50, 0); continue; }
    const f = (t * 0.45 + i / N) % 1, S = V(BR0.x - 0.95 + 0.2 * Math.sin(i), BR0.y - 0.7 + 0.2 * Math.cos(i * 1.3), BR0.z + 0.2 * Math.sin(i * 2)), E = V(BR0.x + 0.1 + 0.12 * Math.sin(i * 3), BR0.y + 0.13 + 0.1 * Math.cos(i * 2), BR0.z + 0.1 * Math.sin(i)), M = S.clone().lerp(E, 0.5).add(V(0, 0.5 + 0.25 * Math.sin(i), 0.1 * Math.cos(i)));
    const a = 1 - f, p = S.multiplyScalar(a * a).addScaledVector(M, 2 * a * f).addScaledVector(E, f * f);
    pos.setXYZ(i, p.x, p.y, p.z); col.setXYZ(i, 1, 0.45 + 0.45 * f, 0.7 + 0.25 * f);
  }
  pos.needsUpdate = true; col.needsUpdate = true;
  // the shirt it came from, the heart line, the heart
  const fw = V(0, 0, 0); camera.getWorldDirection(fw); const upc = V(0, 1, 0).applyQuaternion(camera.quaternion), rtc = V(1, 0, 0).applyQuaternion(camera.quaternion);
  showIcon("👕", V(BR0.x - 0.95, BR0.y - 0.7, BR0.z + 0.25), 0.4, popK(t, t0 + 0.05, SL(17) - 0.1), { bob: 0.02, t });
  const on = popK(t, t0 + 0.25, SL(17) - 0.25), P = camera.position.clone().addScaledVector(fw, 4.1).addScaledVector(upc, 1.3);
  const bpm = bpmAt(t);
  drawEkg((B * 60) / bpm, bpm, 1.0 - 0.25 * prog(t, C.slow, C.pulse));
  showCanvasSprite(ekg, P, on, 1.25);
  showIcon("❤️", P.clone().addScaledVector(rtc, -0.95), 0.34 * (1 + 0.35 * thump), on, {});
}

// ===================== one frame of the world, for time t and shot k =====================
function apply(t, k) {
  hideAll();
  if (!clothReady) buildCloth();
  const u = U(t, k), mood = MOODS[MOOD[k - 1]];
  // light: the flat dims when the door shuts and the house goes silent
  const q = k === 11 ? prog(t, T0(11) + 0.95, T0(11) + 2.0) : k === 12 || k === 14 ? 1 : 0;
  const base = MOODS.day, quiet = MOODS.quiet;
  const mixCol = (a, b, f) => new THREE.Color(a).lerp(new THREE.Color(b), f);
  const m1 = k >= 15 && k !== 17 ? mood : base;   // (in his head the light stays neutral so the pinks stay pink)
  hemi.color.copy(mixCol(m1.hemi[0], quiet.hemi[0], q)); hemi.groundColor.copy(mixCol(m1.hemi[1], quiet.hemi[1], q)); hemi.intensity = lerp(m1.hemi[2], quiet.hemi[2], q);
  key.color.copy(mixCol(m1.key[0], quiet.key[0], q)); key.intensity = lerp(m1.key[1], quiet.key[1], q);
  key.position.set(6, 4.2, 1.6); key.target.position.set(-0.3, 0.3, 2.4);
  const ost = outsideState(t, k);
  if (k === 13) { // the flat darkens and glows with the days going by outside the window
    hemi.intensity *= lerp(0.28, 1, ost.light); key.intensity *= lerp(0.1, 1, ost.light);
    hemi.color.lerp(new THREE.Color(0x6f80ff), (1 - ost.light) * 0.8).lerp(new THREE.Color(0xffb070), ost.warm * 0.5);
    key.color.lerp(new THREE.Color(0xffa860), ost.warm * 0.7);
  }
  if (k === 19) { key.position.set(-3, 3.4, 10.8); key.target.position.set(0.8, 0.4, 7.4); }   // the setting sun lights the front of the house
  outside.set({ ...ost, t }); scene.fog.color.copy(outside.fogColor);
  const inHead = k === 17;   // shot 17 happens in his head, far from the flat
  places.r.visible = !inHead; outside.group.visible = outside.sky.visible = !inHead; brainW.g.visible = inHead; basket.visible = !inHead;
  scene.fog.near = inHead ? 1e5 : 45; scene.fog.far = inHead ? 2e5 : 260;
  doorLamp.intensity = k === 19 ? 2.4 * ease.inOut(prog(t, T0(19) + 1.95, T0(19) + 2.4)) : k === 20 ? 2.4 * (1 - ease.inOut(prog(t, T0(20), T0(20) + 0.5))) : 0;
  // camera first (the puppet turns to it)
  const c = window.__cam ? { pos: V(...window.__cam.pos), look: V(...window.__cam.look), fov: window.__cam.fov ?? 50 } : cameraAt(t, k);
  camera.position.copy(c.pos); camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  house.ceiling.visible = camera.position.y < 2.5;
  // the door, the window, the clock
  const da = doorAngle(t); house.door.rotation.y = da;
  const spin = k === 12 ? U(t, 12) * 26 : 0;
  house.clock.min.rotation.z = -(0.6 + spin + 0.4 * Math.sin(spin * 0.7)); house.clock.hour.rotation.z = -(1.0 + spin / 7);
  // you
  const os = ownerState(t, k);
  owner.visible = !!os && os.show !== false;
  if (os) { owner.pose(os); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  // ----- the dog and the clothes it meets -----
  const ds = dogState(t, k);
  dog.visible = !!ds;
  const showNest = k !== 4 && k !== 5 && k !== 12 && k !== 13 && k !== 17 && k !== 19;
  const shirtOn = [1, 2, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20].includes(k) || (k === 15 && u > 1.55);
  const comp = ds ? dogPoseComp(ds) : null;
  nestSheets.forEach((sh) => (sh.mesh.visible = showNest));
  if (showNest) { settle(nestSheets, comp); }
  let y = 0;
  if (ds) {
    if (ds.rest === "nest") y = nestTopRaw(ds.x + Math.sin(ds.ry) * 0.12, ds.z + Math.cos(ds.ry) * 0.12) - 0.045 * (ds.pose.lie ?? 0);
    else if (ds.rest === "floor") y = Math.max(0, nestTopRaw(ds.x, ds.z) - 0.03);
    else if (ds.rest === "basket") y = BASKET_TOP(ds.x, ds.z) - 0.035;
    else if (ds.rest === "couch") y = COUCH.seat + 0.05;
    dog.pose({ ...ds.pose, x: ds.x, z: ds.z, ry: ds.ry, y });
    dog.updateMatrixWorld(true);
  }
  // the bundle in his mouth (k 15), the mask and hose (k 7)
  const carrying = !!ds?.carry;
  bundle.visible = carrying;
  if (carrying) { if (bundle.parent !== dog.mouth) dog.mouth.add(bundle); bundle.position.set(0, -0.06, 0.03); bundle.rotation.set(0.4, 0, 0); bundle.scale.setScalar(1.3); bundle.userData.slL.rotation.z = 0.2 * Math.sin(t * 9); bundle.userData.slR.rotation.z = -0.2 * Math.sin(t * 9 + 1); }
  const maskOn = k === 7 ? ease.out(prog(t, C.oxygen - 0.1, C.oxygen + 0.3)) : 0;
  mask.visible = maskOn > 0.01; mask.scale.setScalar(Math.max(0.01, maskOn)); mask.position.set(0, 0, 0); mask.rotation.set(0, 0, 0);
  if (ds) dog.updateMatrixWorld(true);
  // the shirt he buries his snout in: it lies on the pile, and rises into a soft mound round his snout
  oldShirt.mesh.visible = shirtOn && showNest;
  if (oldShirt.mesh.visible) {
    const snoutOn = [16, 17, 18, 19].includes(k) ? (k === 16 ? ease.inOut(prog(u, 1.15, 1.55)) : 1) : 0;
    let snout = null;
    if (ds) { snout = dog.point("Head", [0, -0.05, 0.3]); }
    const floorFn = (x, z) => { let h = nestTopRaw(x, z); if (snout && snoutOn > 0) { const r = Math.hypot(x - snout.x, z - (snout.z + 0.04)); const g = Math.exp(-(r * r) / (2 * 0.13 * 0.13)); h += g * snoutOn * Math.max(0, snout.y + 0.015 - h); } return h; };
    drape(oldShirt, oldShirt.pl, { floor: floorFn, blur: 2, wrinkle: 0.01, puff: 0.03, thick: 0.03 });
    commit(oldShirt);
    const sc = k === 15 ? 0.35 + 0.65 * ease.out(prog(u, 1.55, 2.0)) : 1, cx = oldShirt.pl.x, cz = oldShirt.pl.z, cy = nestTopRaw(cx, cz);
    oldShirt.mesh.scale.setScalar(sc); oldShirt.mesh.position.set(cx * (1 - sc), cy * (1 - sc), cz * (1 - sc));
  }
  if (showNest) nestSheets.forEach(commit);
  // the basket and its clothes (k 3, 15), the old jacket on the couch (k 4, 5)
  const showBasket = k === 3 || k === 15;
  basketSheets.forEach((s) => (s.mesh.visible = showBasket)); spill.mesh.visible = showBasket;
  if (showBasket) {
    const bc = ds && ds.rest === "basket" ? (() => { const dx = Math.sin(ds.ry), dz = Math.cos(ds.ry), ax = ds.x - dx * 0.28, az = ds.z - dz * 0.28, bx = ds.x + dx * 0.3, bz = ds.z + dz * 0.3, abx = bx - ax, abz = bz - az, l2 = abx * abx + abz * abz; return (x, z) => { const t2 = clamp01(((x - ax) * abx + (z - az) * abz) / l2), d = Math.hypot(x - (ax + abx * t2), z - (az + abz * t2)), kk = 1 - clamp01((d - 0.12) / 0.22); return kk * kk * (3 - 2 * kk); }; })() : null;
    settle(basketSheets, bc, basketFloor, 0.5); basketSheets.forEach(commit); settle([spill], null); commit(spill);
  }
  jacket.mesh.visible = k === 4 || k === 5;
  if (jacket.mesh.visible) { drape(jacket, { x: -2.62, z: 0.12, rot: 0.15 }, { floor: couchTop, rays: colliders(dog), blur: 4, wrinkle: 0.014, puff: 0.025, thick: 0.02, rayGap: 0.03 }); commit(jacket); }
  // ----- the icons and graphics for each shot -----
  const above = ds ? dog.point("Head", [0, 0.32, 0.1]) : V(0.55, 0.9, 3.8);
  if (k === 2) {
    showIcon("😈", above.clone().add(V(0.0, 0.2, 0)), 0.32, popK(t, C.naughty - 0.05, 1.6), { bob: 0.01, t });
    showIcon("❌", above.clone().add(V(0.0, 0.2, 0.02)), 0.5, popK(t, C.naughty + 0.25, 1.4), { t });
  }
  if (k === 3) showIcon("❗", V(owner.position.x, 1.95, owner.position.z), 0.5, popK(t, T0(3) + 1.2, 0.85), { bob: 0.02, t });
  if (k === 4) showIcon("💤", V(-2.45, 0.95 + 0.18 * ((t * 0.7) % 1), 1.0), 0.3, popK(t, C.buried, 9), { t });
  if (k === 5) { owner.parts.headG.localToWorld(_p.set(0.42, 0.78, 0)); setBub(BUB.soft, popK(t, C.soft - 0.3, 1.7), _p.clone(), 0.9); }
  if (k === 6) {
    showIcon("🛏️", above.clone().add(V(-0.25, 0.1, 0)), 0.55, popK(t, C.blanket - 0.05, 1.5), { bob: 0.02, t });
    showIcon("❌", above.clone().add(V(-0.25, 0.1, 0.02)), 0.75, popK(t, C.blanket + 0.2, 1.3), { t });
  }
  if (k === 7) {
    const a = mask.visible ? mask.localToWorld(V(0, -0.26, 0.42)) : null, shirtPt = V(oldShirt.pl.x + 0.1, nestTopRaw(oldShirt.pl.x + 0.1, oldShirt.pl.z - 0.15) + 0.02, oldShirt.pl.z - 0.15);
    updateHose(!!a, a ?? V(), shirtPt, 0.08);
    if (a && hoseMesh) { scentStream.pts.visible = true; const pos = scentStream.pts.geometry.attributes.position, col = scentStream.pts.geometry.attributes.color; for (let i = 0; i < scentStream.n; i++) { const f = ((t * 0.9 + i / scentStream.n) % 1), p = hoseMesh.userData.curve.getPoint(1 - f); pos.setXYZ(i, p.x, p.y + 0.03, p.z); const cc = hue(0.9 + i * 0.013); col.setXYZ(i, cc.r, cc.g, cc.b); } pos.needsUpdate = true; col.needsUpdate = true; }
  } else updateHose(false);
  if (k === 8) {
    const nose = dog.point("Head", [0, -0.05, 0.3]), nvis = Math.floor(swarm.n * prog(t, C.million - 0.1, C.nose));
    swarm.pts.visible = true; const pos = swarm.pts.geometry.attributes.position, col = swarm.pts.geometry.attributes.color;
    for (let i = 0; i < swarm.n; i++) {
      if (i >= nvis) { pos.setXYZ(i, 0, -50, 0); continue; }
      const a = i * 2.399, b = ((i * 7919) % 100) / 100, r = 0.5 + 0.7 * ((i * 104729) % 97) / 97, ph = (i * 0.618) % 1, f = ((t * 0.8 + ph) % 1);
      const sx = nose.x + Math.cos(a) * r * 0.7, sy = nose.y + 0.15 + (b - 0.4) * r, sz = nose.z + 0.3 + Math.sin(a) * r * 0.6, e2 = ease.in(f);
      pos.setXYZ(i, lerp(sx, nose.x, e2), lerp(sy, nose.y, e2), lerp(sz, nose.z, e2));
      const cc = hue(i * 0.037); col.setXYZ(i, cc.r, cc.g, cc.b);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }
  if (k === 9) {
    // the portrait floats in the free space above the pile: placed in the camera's own frame so it can never be cropped
    const cm = cameraAt(t, 9), fw = cm.look.clone().sub(cm.pos).normalize(), rt = V(0, 1, 0).cross(fw).negate().normalize(), upv = rt.clone().cross(fw).normalize();
    showCanvasSprite(portrait, cm.pos.clone().addScaledVector(fw, 1.35).addScaledVector(upv, 0.37), popK(t, C.portrait - 0.1, 3.0));
    const nose = dog.point("Head", [0, -0.05, 0.3]); scentStream.pts.visible = t > C.shirt; const pos = scentStream.pts.geometry.attributes.position, col = scentStream.pts.geometry.attributes.color, src = V(oldShirt.pl.x, 0.2, oldShirt.pl.z - 0.1);
    for (let i = 0; i < scentStream.n; i++) { const f = ((t * 0.7 + i / scentStream.n) % 1), p = src.clone().lerp(nose, f); p.y += 0.18 * Math.sin(f * Math.PI) + 0.03 * Math.sin(f * 20 + i); p.x += 0.05 * Math.sin(f * 14 + i * 2); pos.setXYZ(i, p.x, p.y, p.z); const cc = hue(0.0 + i * 0.017 + t * 0.2); col.setXYZ(i, cc.r, cc.g, cc.b); }
    pos.needsUpdate = true; col.needsUpdate = true;
  }
  if (k === 10) {
    const b = V(0.55, 0.0, 3.85);
    showIcon("💨", b.clone().add(V(-0.45, 0.95, 0)), 0.3, popK(t, C.breath, 1.3), { bob: 0.02, t });
    showIcon("🖐️", b.clone().add(V(0.0, 1.1, 0)), 0.32, popK(t, C.skin, 1.0), { bob: 0.02, t });
    showIcon("🛡️", b.clone().add(V(0.45, 0.95, 0)), 0.32, popK(t, C.safety, 0.9), { bob: 0.02, t });
  }
  if (k === 12) for (const [i, [dx, dy]] of [[-0.45, 0.45], [0.0, 0.62], [0.45, 0.42]].entries()) showIcon("❓", V(1.9 + dx, 1.95 + dy, -1.85), 0.34, popK(t, C.time - 0.6 + i * 0.18, 1.1), { bob: 0.02, t });
  if (k === 13) {
    showIcon("⏰", V(2.95, 0.55, 2.7), 0.22, popK(t, C.minutes - 0.4, 2.6), { t });
    showIcon(Math.floor(U(t, 13) * 3) % 2 ? "⏳" : "⌛", V(2.95, 2.45, 2.6), 0.2, popK(t, T0(13) + 0.1, 2.7), { t });
  }
  if (k === 14) {
    const bpm = lerp(75, 190, prog(t, C.heart - 0.2, C.spikes + 0.3)), head = ds ? dog.point("Head", [0, 0.5, 0.0]) : V(0.5, 1.0, 3.8);
    drawEkg(t, bpm, 1.0 + 0.2 * prog(t, C.heart, C.spikes));
    showCanvasSprite(ekg, head.clone().add(V(0.0, 0.1, 0.0)), popK(t, T0(k) + 0.3, SL(k) - 0.3));
    const beat = (t * bpm / 60) % 1;
    showIcon("❤️", head.clone().add(V(-0.45, 0.1, 0)), 0.3 * (1 + 0.35 * Math.max(0, 1 - beat * 4)), popK(t, T0(k) + 0.3, SL(k) - 0.3), {});
  }
  if (k === 17) updateBrain(t);
  if (k === 18) {
    showIcon("💛", above.clone().add(V(0.0, 0.2 + 0.1 * ((t * 0.5) % 1), 0.1)), 0.26, popK(t, T0(18) + 0.4, SL(18) - 0.5), { t });
    const g = beam.dust.geometry.attributes.position, fall = prog(t, T0(18), T0(18) + 0.6);
    for (let i = 0; i < beam.N; i++) { const sx = (i * 0.618) % 1, a2 = (i * 0.37) % 1, b2 = (i * 0.71) % 1, x = lerp(3.0, -0.7, sx), yLo = lerp(0.95, 0.25, sx), yHi = lerp(2.15, 1.5, sx), zLo = lerp(0.22, -0.3, sx), zHi = lerp(2.38, 3.0, sx); g.setXYZ(i, x + 0.1 * Math.sin(t * 0.3 + i), lerp(yLo, yHi, a2) + 0.07 * Math.sin(t * 0.5 + i * 1.3), lerp(zLo, zHi, b2) + 0.07 * Math.cos(t * 0.4 + i * 2)); }
    g.needsUpdate = true; beam.dust.visible = true; beam.m.visible = true; beam.m.material.opacity = fall;
  }
  drawFx(t);
  // the grade: vivid; the world loses its colour and darkens while his senses shut down
  const sens = k === 14 ? ease.inOut(prog(t, C.sensory - 0.3, C.heart)) * (1 - 0.0) : 0;
  renderer.domElement.style.filter = `saturate(${(1.4 - 0.9 * sens).toFixed(3)}) contrast(1.07) brightness(${(1.02 - 0.12 * sens).toFixed(3)})`;
  document.getElementById("vignette").style.opacity = String((0.14 + 0.62 * sens).toFixed(3));
  return ds;
}

// ===================== the frame =====================
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  const k = shotOf(t);
  let kOld = 0, alpha = 0;
  for (let i = 1; i < NSHOT; i++) { const c0 = STARTS[i]; if (t > c0 - HALF && t < c0 + HALF) { kOld = i; alpha = 1 - ease.inOut((t - (c0 - HALF)) / (2 * HALF)); } }
  const kNew = kOld ? kOld + 1 : k;
  veil.visible = false;
  if (kOld && alpha > 0.003) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
    apply(t, kOld);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
  }
  apply(t, kNew);
  if (kOld && alpha > 0.003) {
    veil.visible = true; veil.material.opacity = alpha;
    const h = 2 * 0.12 * Math.tan((camera.fov * Math.PI) / 360);
    veil.position.set(0, 0, -0.12); veil.scale.set(h * camera.aspect, h, 1);
  }
  captions(t);
});

// ===================== sound: real recordings only (see sfx/CREDITS.md), placed one by one on the action =====================
// The flat has a quiet clock; cloth rustles and soft paws on the pile; sniffs; a real door, real footsteps on the boards. When the door shuts the house
// goes dead silent (nothing but a faint tick), then a racing clock and a heartbeat; the heartbeat slows as the oxytocin floods in.
const sfx = createSfx(short, { mix: { gain: 1.5, duck: { depth: 0.3, attack: 0.012, release: 0.28, threshold: -42 } } });
const wob = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);   // repeatable little pitch / level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
const paws = (t0, n, dt, g0, g1 = g0, pan = 0) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `paw_${(i % 4) + 1}`, lerp(g0, g1, n > 1 ? i / (n - 1) : 0) * wob(i, 0.18), { pan, rate: wob(i, 0.04) }); };
const pip = (t, i, g = 0.45, pan = 0) => snd(t, `pop_${(i % 3) + 1}`, g, { pan });
const steps = (t0, n, dt, g0, g1) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `step_wood_${(i % 4) + 1}`, lerp(g0, g1, n > 1 ? i / (n - 1) : 0), { rate: wob(i, 0.04) }); };
const beats = (t0, t1, dt0, dt1, g0, g1) => { for (let tt = t0, i = 0; tt < t1; i++) { const f = (tt - t0) / (t1 - t0), g = lerp(g0, g1, f); snd(tt, "heart_1", g); snd(tt + 0.2 * Math.min(1, dt0 * 1.3), "heart_2", g * 0.75); tt += lerp(dt0, dt1, f); } };

// -- the flat's clock: a faint tick-tock all the way, except while the house is dead silent (shot 11 after the door) and while it races
for (let tt = 0.5, i = 0; tt < DURATION - 0.3; tt += 1.0, i++) { if (tt > T0(11) + 1.1 && tt < T0(14)) continue; snd(tt, i % 2 ? "tock" : "tick", 0.06, { pan: 0.5 }); }
// -- 1 · he sighs on the pile
snd(0.12, "breath_out", 0.25, { rate: 1.3 }); snd(0.35, "rustle_1", 0.14);
// -- 2 · "naughty": a pip and a snap; "dirty clothes": a sniff and a rustle
pip(C.naughty - 0.05, 1, 0.5); snd(C.naughty - 0.03, "snap", 0.45); snd(C.naughty + 0.25, "snap_low", 0.5);
snd(C.dirty - 0.05, "rustle_2", 0.2); snd(C.dirty + 0.1, "sniffle_2", 0.22, { rate: 1.25, pan: 0.1 });
// -- 3 · you come home: latch, door, steps on the boards, a gasp, he wakes in the basket, the door shuts
snd(T0(3) + 0.03, "snap", 0.35); snd(T0(3) + 0.1, "door_creak", 0.5); snd(T0(3) + 0.2, "thrush_c", 0.22, { pan: 0.4 });
steps(T0(3) + 0.55, 4, 0.19, 0.3, 0.55);
snd(C.find, "gasp", 0.36); snd(T0(3) + 1.25, "breath_out", 0.25, { rate: 1.2, pan: 0.3 }); snd(T0(3) + 1.5, "sniffle_1", 0.22, { rate: 1.2, pan: 0.3 }); snd(T0(3) + 1.3, "rustle_1", 0.2, { pan: 0.3 }); snd(T0(3) + 1.95, "rustle_3", 0.2, { pan: -0.3 }); snd(T0(3) + 2.05, "sniffle_2", 0.2, { rate: 1.2, pan: -0.3 });
snd(T0(3) + 2.45, "door_close", 0.55);
// -- 4/5 · under the jacket: a snore, a rustle; you think "soft fabric"
snd(T0(4) + 0.2, "snore", 0.3); snd(C.jacket - 0.1, "rustle_2", 0.2); pip(C.buried, 2, 0.3); snd(T0(4) + 1.3, "snore", 0.25);
pip(C.soft - 0.3, 0, 0.45); snd(C.soft - 0.3, "bell_3", 0.2, { rate: 1.1 }); snd(T0(5) + 0.3, "breath_out", 0.3, { rate: 0.9 }); snd(T0(5) + 1.3, "snore", 0.2);
// -- 6 · not a blanket
pip(C.blanket - 0.05, 1, 0.45); snd(C.blanket + 0.2, "snap", 0.5); snd(T0(6) + 0.3, "sniffle_1", 0.2, { rate: 1.2 }); snd(T0(6) + 1.0, "sniffle_3", 0.2, { rate: 1.25 });
// -- 7 · the oxygen mask: a pip, a bell, a click; he breathes through it; sniffs of your scent
pip(C.oxygen - 0.1, 0, 0.5); snd(C.oxygen - 0.08, "bell_2", 0.34); snd(C.oxygen + 0.2, "snap_low", 0.5); snd(C.oxygen + 0.25, "rustle_3", 0.2);
snd(C.mask + 0.1, "breath_out", 0.3, { rate: 1.3 }); snd(C.mask + 0.9, "breath_out", 0.28, { rate: 1.3 });
[0, 0.35, 0.7].forEach((d, i) => snd(C.scent + d, `sniffle_${(i % 3) + 1}`, 0.22, { rate: 1.25 }));
// -- 8 · over 300 million receptors: sniffs, then a glittering swarm of twinkles that thickens, ending on a long bell
for (let i = 0; i < 6; i++) snd(T0(8) + 0.3 + i * 0.55, `sniffle_${(i % 4) + 1}`, 0.2, { rate: 1.25, pan: 0.2 });
for (let i = 0, tt = C.million - 0.1; tt < C.nose; i++) { snd(tt, `twinkle_${(i % 3) + 1}`, 0.14 + 0.1 * prog(tt, C.million, C.nose), { pan: Math.sin(i * 2.1) * 0.5 }); tt += lerp(0.34, 0.08, prog(tt, C.million, C.nose)); }
snd(C.nose - 0.05, "bell_long", 0.35);
// -- 9 · "an old shirt" (a flat look), then the portrait: a long bell, a shower of twinkles
pip(C.shirt - 0.3, 2, 0.35); snd(C.shirt, "rustle_1", 0.22); snd(C.shirt + 0.4, "sniffle_2", 0.22, { rate: 1.25 }); snd(C.shirt + 1.4, "sniffle_4", 0.2, { rate: 1.25 });
snd(C.portrait - 0.12, "bell_long", 0.5); [0, 0.1, 0.22].forEach((d, i) => snd(C.portrait + d, `twinkle_${i + 1}`, 0.28, { pan: [-0.3, 0.3, 0][i] }));
// -- 10 · breath, skin, safety: three rising bells
[[C.breath, 1.0], [C.skin, 1.26], [C.safety, 1.5]].forEach(([tt, r], i) => { pip(tt - 0.03, i, 0.4); snd(tt - 0.03, `bell_${i + 1}`, 0.4, { pan: [-0.25, 0, 0.25][i] }); });
// -- 11 · you cross the boards, the door creaks, you go, the door shuts; then the house is dead silent
steps(T0(11) + 0.15, 5, 0.12, 0.3, 0.3); snd(T0(11) + 0.4, "snap", 0.35); snd(T0(11) + 0.42, "door_creak", 0.45);
steps(T0(11) + 0.78, 3, 0.15, 0.3, 0.22);
snd(T0(11) + 1.02, "door_close", 0.75);
snd(T0(11) + 1.75, "whimper_c", 0.12, { rate: 0.9 });
// -- 12 · no concept of time: the clock races
for (let i = 0, tt = T0(12) + 0.15; tt < T1(12) - 0.1; i++) { snd(tt, i % 2 ? "tock" : "tick", 0.24, { pan: 0.4, rate: lerp(1.2, 2.6, prog(tt, T0(12), T1(12))) }); tt += lerp(0.2, 0.06, prog(tt, T0(12), T1(12))); }
[0, 1, 2].forEach((i) => pip(C.time - 0.6 + i * 0.18, i, 0.3, [-0.3, 0, 0.3][i])); snd(C.time, "whimper_b", 0.25);
// -- 13 · minutes or years: days and seasons fly by (ticks, birds sped up), a deep bell on "years"
for (let i = 0, tt = T0(13) + 0.1; tt < T1(13) - 0.1; i++) { snd(tt, i % 2 ? "tock" : "tick", 0.2, { pan: 0.3, rate: lerp(1.8, 3.0, prog(tt, T0(13), T1(13))) }); tt += 0.07; }
[0.2, 0.7, 1.2, 1.7, 2.2].forEach((d, i) => snd(T0(13) + d, i % 2 ? "thrush_b" : "thrush_c", 0.16, { rate: 2.0 + 0.1 * i, pan: i % 2 ? 0.4 : -0.4 }));
snd(C.years - 0.1, "bell_long", 0.4, { rate: 0.7 });
// -- 14 · sensory deprivation: a low glassy hum, a heartbeat that races
snd(T0(14) + 0.1, "glow", 0.3, { dur: 3.2, fadeIn: 0.8, fadeOut: 1.0 });
beats(T0(14) + 0.3, T1(14) - 0.05, 0.85, 0.3, 0.4, 0.62);
// -- 15 · he grabs the shirt from the basket and trots to the nest with it
snd(T0(15) + 0.12, "rustle_2", 0.3); snd(T0(15) + 0.15, "swash_1", 0.3);
paws(T0(15) + 0.5, 8, 0.13, 0.3, 0.3);
snd(T0(15) + 1.5, "rustle_3", 0.3); snd(T0(15) + 1.55, "thump", 0.32); snd(T0(15) + 1.58, "swash_2", 0.3);
// -- 16 · he turns round on the clothes, lies down with a sigh and pushes his snout in
for (let i = 0; i < 6; i++) snd(T0(16) + 0.1 + i * 0.13, "pad_step", 0.2, { rate: 0.9 + 0.04 * i });
snd(T0(16) + 0.45, "swash_1", 0.25); snd(T0(16) + 0.95, "thump", 0.5); snd(T0(16) + 1.0, "swash_2", 0.3);
snd(T0(16) + 1.05, "breath_out", 0.35, { rate: 1.3 }); snd(C.snout, "rustle_1", 0.3); snd(T0(16) + 1.3, "sniffle_3", 0.22, { rate: 1.3 });
// -- 17 · oxytocin: a dreamy glass hum, a bell, hearts that twinkle, and a heartbeat that slows
snd(T0(17) + 0.05, "glow", 0.28, { dur: 2.6, fadeIn: 0.6, fadeOut: 0.8 });
snd(C.oxytocin - 0.1, "bell_2", 0.35);
for (let i = 0; i < 12; i++) snd(C.oxytocin + 0.55 + i * 0.16, `twinkle_${(i % 3) + 1}`, 0.2, { pan: Math.sin(i * 1.9) * 0.4 });
beats(T0(17) + 0.1, T1(17) - 0.05, 0.4, 0.95, 0.55, 0.4);
snd(C.slow, "breath_out", 0.3, { rate: 1.3 }); snd(C.pulse + 0.1, "breath_out", 0.28, { rate: 1.3 });
// -- 18 · he holds on to the shirt and sleeps in the last of the sun
snd(T0(18) + 0.3, "thrush_a", 0.14, { pan: 0.5 });
for (let tt = T0(18) + 0.3; tt < T1(18) - 0.2; tt += 1.0) { snd(tt, "heart_1", 0.3); snd(tt + 0.2, "heart_2", 0.22); }
snd(T0(18) + 0.9, "snore", 0.28); snd(T0(18) + 2.1, "snore", 0.22); snd(C.holding, "rustle_1", 0.2);
// -- 19 · you run up the garden path: a bird, quick footsteps, the latch, the door, the warm light
snd(T0(19) + 0.1, "thrush_b", 0.16, { pan: 0.4 });
steps(T0(19) + 0.2, 9, 0.19, 0.1, 0.34);
snd(T0(19) + 1.88, "snap", 0.4); snd(T0(19) + 1.95, "door_creak", 0.5);
snd(T0(19) + 1.95, "glow", 0.3, { dur: 1.2, fadeIn: 0.4, fadeOut: 0.5 });
// -- 20 · he hears you: a whimper and a thumping tail, the door shuts behind you, and he settles into the opening pose (the loop begins again with a sigh)
snd(T0(20) + 0.02, "whimper_a", 0.2, { rate: 1.1, dur: 0.5, fadeOut: 0.15 });
for (let i = 0; i < 3; i++) snd(T0(20) + 0.05 + i * 0.16, "thump", 0.12, { rate: 1.5 });
snd(T0(20) + 0.12, "door_close", 0.45, { dur: 0.6, fadeOut: 0.1 });
snd(T0(20) + 0.3, "breath_out", 0.2, { rate: 1.3, dur: 0.4, fadeOut: 0.25 });

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
window.__dbg = { scene, camera, dog, owner, STARTS, DURATION, house, doorAngle };
short.start();
