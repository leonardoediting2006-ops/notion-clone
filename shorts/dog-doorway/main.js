import { createShort, THREE } from "../../js/engine.js";
import { outline, outlineStatic, toonify, toon, toonGradient, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import * as W from "../../js/toonworld.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";

// "Why your dog sleeps in your doorway" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog.
// 17 shots, no on-screen text (icons and graphics only), every shot a slow eased camera move, and a real cross-dissolve at every
// cut (the old shot keeps moving while it fades out), so it flows. Two places: the house (day and night) and a wolf den at dusk.
// Every action is keyed to a word of voiceover.srt; every state is a pure function of time (any frame can be rendered alone).

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

const short = createShort({ duration: DURATION, fps: FPS, background: "#0b1030", fov: 52, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.05;
camera.far = 600;
camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = { in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inOut: (u) => u * u * (3 - 2 * u), soft: (u) => u * u * u * (u * (6 * u - 15) + 10), glide: (u) => lerp(u, u * u * (3 - 2 * u), 0.7) };
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const bump = (u) => Math.sin(Math.PI * clamp01(u));

// ---------- word cues (seconds) ----------
// 17 shots; each begins a hair before the first word of its idea
const STARTS = [
  0, at("choosing") - 0.03, at("When", 1) - 0.04, at("but") - 0.04, at("sleeping") - 0.04, at("probably") - 0.12, at("see") - 0.06, at("securing") - 0.1,
  at("pack") - 0.16, at("entrance") - 0.1, at("drafty") - 0.06, at("predator") - 0.2, at("wedging") - 0.15, at("your", 3) - 0.04,
  at("know") - 0.14, at("So") - 0.04, at("guaranteeing") - 0.2,
];
const NSHOT = STARTS.length;
const CUTS = STARTS.slice(1);
const shotOf = (t) => { let k = 1; for (let i = 1; i < NSHOT; i++) if (t >= STARTS[i]) k = i + 1; return k; };
const T0 = (k) => STARTS[k - 1];
const T1 = (k) => (k < NSHOT ? STARTS[k] : DURATION);
const C = {
  actually: at("actually"), choosing: at("choosing"), cold: at("cold"), floor1: at("floor", 1), over: at("over"), bed1: at("bed", 1),
  soft: at("soft"), expensive: at("expensive"), bed2: at("bed", 2), entire: at("entire"), night: at("night"), hard1: at("hard", 1), wood: at("wood"), doorway: at("doorway"),
  stubborn: at("stubborn"), cooler: at("cooler"), choke: at("choke"), point: at("point"), den: at("den"), entrance: at("entrance"), dangerous: at("dangerous"), sleep: at("sleep"),
  drafty: at("drafty"), exposed: at("exposed"), first: at("first"), predator: at("predator"), strikes: at("strikes"),
  wedging: at("wedging"), threshold: at("threshold"), living: at("living"), barricade: at("barricade"),
  asleep: at("asleep"), senses: at("senses"), completely: at("completely"), shut: at("shut"), down: at("down"),
  abandon: at("abandon"), comfort: at("comfort"), hard2: at("hard", 2), floor2: at("floor", 2), anything: at("anything"), coming: at("coming"), dark: at("dark"),
};
// where each shot happens: h = the house, d = the wolf den; and the light
const PLACE = ["h", "h", "h", "h", "h", "h", "h", "h", "d", "d", "d", "d", "h", "h", "h", "h", "h"];
const MOOD = ["night", "night", "day", "night", "night", "day", "night", "night", "dusk", "dusk", "dusk", "dusk", "night", "night", "night", "night", "night"];
const OFF = { h: 0, d: 300 };
const places = { h: new THREE.Group(), d: new THREE.Group() };
places.d.position.x = OFF.d;
for (const g of Object.values(places)) scene.add(g);
const put = (grp, o, x, y, z, ry = 0, s) => { o.position.set(x, y, z); o.rotation.y = ry; if (s) o.scale.multiplyScalar(s); grp.add(o); return o; };
const mesh = (grp, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
// a box from corner to corner (x0..x1, y0..y1, z0..z1)
const ext = (grp, x0, x1, y0, y1, z0, z1, mat, ink = false) => { const m = mesh(grp, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.userData.ink = ink; return m; };
const rbox = (grp, w, h, d, mat, x, y, z, r = 0.04) => mesh(grp, roundedBox(w, h, d, r), mat, x, y, z);
const canvasTex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); return t; };
const texMat = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshToonMaterial({ map: t, gradientMap: toonGradient() }); };

// ---------- textures: hard wood planks (with knots and grain), wallpapers ----------
const plankTex = canvasTex(512, 512, (x) => {
  const cols = ["#b97a4a", "#c58654", "#a96d42", "#cf9059", "#b57547", "#c28350"], pw = 512 / 6;
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
const paperBed = canvasTex(256, 256, (x) => {
  x.fillStyle = "#d4cdf0"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,0.28)" : "rgba(150,130,210,0.16)"; x.fillRect(i * 32, 0, 32, 256); }
  x.fillStyle = "rgba(255,255,255,0.55)"; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.beginPath(); x.arc(32 + c * 64 + (r % 2) * 32, 32 + r * 64, 4, 0, 6.3); x.fill(); }
});
const paperHall = canvasTex(256, 256, (x) => {
  x.fillStyle = "#f1dfb9"; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(205,160,100,0.45)"; x.lineWidth = 3;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const cx = c * 64 + 32, cy = r * 64 + 32; x.beginPath(); x.moveTo(cx, cy - 22); x.lineTo(cx + 22, cy); x.lineTo(cx, cy + 22); x.lineTo(cx - 22, cy); x.closePath(); x.stroke(); }
});
const rugTex = canvasTex(256, 256, (x) => {
  x.fillStyle = "#f6e9d2"; x.fillRect(0, 0, 256, 256);
  for (const [r, c] of [[120, "#e8b9a0"], [92, "#f6e9d2"], [64, "#9fc7c0"], [36, "#f6e9d2"]]) { x.fillStyle = c; x.beginPath(); x.arc(128, 128, r, 0, 6.3); x.fill(); }
});
const woodM = toon(0xa9683f), woodLightM = toon(0xd9a066), whiteM = toon(0xf7f1e6), trimM = toon(0xffffff), creamM = toon(0xfff1d3);

// ===================== place H: the house (a hall, the doorway, the bedroom); day and night =====================
const HW = 2.6;                       // the bedroom is x -2.6 .. 2.6, z -4.2 .. 0
const rooms = { ceiling: null };
const house = { doorLeaf: null, outside: null, hallPane: null, moon: null, moonGlow: null, nightLight: null, bedMat: null };
{
  const g = places.h;
  W.reseed(7);
  ext(g, -2.7, 2.7, -0.05, 0, -4.3, 4.7, texMat(plankTex, 6.8, 4.6));                         // the hard wood floor (planks run along z, towards the doorway)
  const pb = (wx, wy) => texMat(paperBed, wx, wy), ph = (wx, wy) => texMat(paperHall, wx, wy);
  // ---- bedroom walls (back wall has a window) ----
  ext(g, -2.7, 0.5, 0, 2.6, -4.3, -4.2, pb(3, 1.4)); ext(g, 1.7, 2.7, 0, 2.6, -4.3, -4.2, pb(2, 1.4));
  ext(g, 0.5, 1.7, 0, 0.95, -4.3, -4.2, pb(1.2, 0.7)); ext(g, 0.5, 1.7, 1.95, 2.6, -4.3, -4.2, pb(1.2, 0.7));
  ext(g, -2.7, -2.6, 0, 2.6, -4.2, 0, pb(4, 1.4)); ext(g, 2.6, 2.7, 0, 2.6, -4.2, 0, pb(4, 1.4));   // side walls
  // ---- the wall between hall and bedroom, with the doorway (x -0.5 .. 0.5, height 2.05) ----
  for (const [x0, x1] of [[-2.6, -0.5], [0.5, 2.6]]) { ext(g, x0, x1, 0, 2.6, -0.07, 0, pb((x1 - x0) / 0.8, 1.4)); ext(g, x0, x1, 0, 2.6, 0, 0.07, ph((x1 - x0) / 0.8, 1.4)); }
  ext(g, -0.5, 0.5, 2.05, 2.6, -0.07, 0, pb(1.2, 0.7)); ext(g, -0.5, 0.5, 2.05, 2.6, 0, 0.07, ph(1.2, 0.7));
  // ---- hall walls and the front-door wall ----
  ext(g, -1.78, -1.7, 0, 2.6, 0.07, 4.7, ph(5, 1.4)); ext(g, 1.7, 1.78, 0, 2.6, 0.07, 4.7, ph(5, 1.4));
  ext(g, -1.78, 1.78, 0, 2.6, 4.6, 4.7, ph(4, 1.4));                                              // end wall: its door and window are drawn on top of it below
  // white wainscot and skirting (hall + bedroom), a picture rail
  for (const [x0, x1, z0, z1] of [[-1.7, -1.62, 0.07, 4.6], [1.62, 1.7, 0.07, 4.6], [-2.6, -2.52, -4.2, -0.07], [2.52, 2.6, -4.2, -0.07]]) { ext(g, x0, x1, 0, 0.95, z0, z1, whiteM); ext(g, x0 - 0.01, x1 + 0.01, 0.95, 1.0, z0, z1, trimM); }
  ext(g, -1.7, -0.5, 0, 0.95, 0.07, 0.15, whiteM); ext(g, 0.5, 1.7, 0, 0.95, 0.07, 0.15, whiteM); ext(g, -1.7, 1.7, 0, 0.95, 4.52, 4.6, whiteM);
  ext(g, -2.6, -0.5, 0, 0.95, -0.15, -0.07, whiteM); ext(g, 0.5, 2.6, 0, 0.95, -0.15, -0.07, whiteM); ext(g, -2.6, 2.6, 0, 0.95, -4.2, -4.12, whiteM);
  // ---- the doorway: white frame, a lighter wooden threshold, the door swung open against the bedroom wall ----
  ext(g, -0.58, -0.5, 0, 2.1, -0.12, 0.12, trimM, true); ext(g, 0.5, 0.58, 0, 2.1, -0.12, 0.12, trimM, true); ext(g, -0.58, 0.58, 2.05, 2.13, -0.12, 0.12, trimM, true);
  ext(g, -0.5, 0.5, 0, 0.025, -0.1, 0.1, toon(0xe3b27a));
  { const leaf = new THREE.Group(); leaf.position.set(-0.5, 0, -0.1); g.add(leaf); const d = rbox(leaf, 0.92, 2.0, 0.05, toon(0xf2ece0), 0.46, 1.0, 0, 0.02); d.userData.ink = true; rbox(leaf, 0.06, 0.06, 0.07, toon(0xe0b04a), 0.86, 1.0, 0.03, 0.02); leaf.rotation.y = -1.45; }
  // ---- the front door (hall end): a blue door that is closed at night and open by day, with its own window beside it ----
  ext(g, -0.06, 1.06, 0, 2.12, 4.52, 4.6, trimM, true);
  { const leaf = new THREE.Group(); leaf.position.set(1.0, 0, 4.58); g.add(leaf); rbox(leaf, 0.94, 2.0, 0.06, toon(0x4f7ccf), -0.47, 1.0, 0, 0.02).userData.ink = true; rbox(leaf, 0.07, 0.07, 0.08, toon(0xe0b04a), -0.84, 1.0, -0.04, 0.02); house.doorLeaf = leaf; }
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xffffff })); o.position.set(0.47, 1.3, 5.2); o.rotation.y = Math.PI; o.userData.ink = false; g.add(o); house.outside = o; }
  { const o = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), new THREE.MeshBasicMaterial({ color: 0x1b2552 })); o.position.set(-0.95, 1.5, 4.57); o.rotation.y = Math.PI; o.userData.ink = false; g.add(o); house.hallPane = o; ext(g, -1.46, -0.44, 1.0, 1.06, 4.5, 4.62, trimM, true); ext(g, -1.46, -0.44, 1.94, 2.0, 4.5, 4.62, trimM, true); ext(g, -1.46, -1.4, 1.0, 2.0, 4.5, 4.62, trimM, true); ext(g, -0.5, -0.44, 1.0, 2.0, 4.5, 4.62, trimM, true); ext(g, -0.97, -0.93, 1.0, 2.0, 4.5, 4.62, trimM, true); }
  // ---- the bedroom window (a hole in the back wall) with frame, curtains and the moon outside ----
  ext(g, 0.46, 1.74, 0.92, 0.98, -4.32, -4.1, trimM, true); ext(g, 0.46, 1.74, 1.92, 1.98, -4.32, -4.1, trimM, true); ext(g, 0.46, 0.52, 0.92, 1.98, -4.32, -4.1, trimM, true); ext(g, 1.68, 1.74, 0.92, 1.98, -4.32, -4.1, trimM, true);
  ext(g, 1.08, 1.12, 0.95, 1.95, -4.3, -4.12, trimM, true); ext(g, 0.5, 1.7, 1.42, 1.46, -4.3, -4.12, trimM, true);
  rbox(g, 0.3, 1.45, 0.1, toon(0xe58a9a), 0.3, 1.3, -4.08, 0.05).userData.ink = true; rbox(g, 0.3, 1.45, 0.1, toon(0xe58a9a), 1.9, 1.3, -4.08, 0.05).userData.ink = true;
  ext(g, 0.1, 2.1, 2.05, 2.1, -4.12, -4.04, toon(0x8a5a3a));
  { const m = new THREE.Mesh(new THREE.CircleGeometry(0.33, 40), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); m.position.set(1.1, 1.5, -6.2); m.userData.ink = false; g.add(m); house.moon = m;
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.22, depthWrite: false })); gl.position.set(1.1, 1.5, -6.25); gl.userData.ink = false; g.add(gl); house.moonGlow = gl; }
  // ---- the bed (head on the left wall), mattress, a big blue blanket, a pillow, nightstand with a lamp, wardrobe, rug ----
  rbox(g, 2.1, 0.22, 1.42, woodM, -1.55, 0.3, -3.35, 0.05).userData.ink = true;
  for (const [x, z] of [[-2.55, -3.98], [-2.55, -2.72], [-0.58, -3.98], [-0.58, -2.72]]) ext(g, x - 0.05, x + 0.05, 0, 0.26, z - 0.05, z + 0.05, woodM);
  rbox(g, 0.1, 1.0, 1.5, woodM, -2.58, 0.75, -3.35, 0.04).userData.ink = true;
  rbox(g, 2.0, 0.22, 1.32, toon(0xffffff), -1.5, 0.52, -3.35, 0.09).userData.ink = true;
  rbox(g, 0.6, 0.16, 0.9, toon(0xffffff), -2.18, 0.7, -3.35, 0.07).userData.ink = true;
  rbox(g, 1.38, 0.34, 1.42, toon(0x5f8fd8), -1.12, 0.78, -3.3, 0.14).userData.ink = true;
  rbox(g, 0.12, 0.05, 1.46, toon(0xffffff), -1.78, 0.78, -3.3, 0.02);
  rbox(g, 0.5, 0.5, 0.42, woodLightM, -0.16, 0.25, -3.92, 0.04).userData.ink = true;
  { const l = new THREE.Group(); l.position.set(-0.16, 0.5, -3.92); g.add(l); mesh(l, new THREE.CylinderGeometry(0.03, 0.05, 0.22, 10), toon(0xd9b04a), 0, 0.11, 0); mesh(l, new THREE.CylinderGeometry(0.13, 0.19, 0.2, 14, 1, true), toon(0xfff1d0, { side: THREE.DoubleSide }), 0, 0.3, 0); }
  rbox(g, 0.7, 2.0, 0.55, woodLightM, 2.22, 1.0, -3.9, 0.05).userData.ink = true; rbox(g, 0.04, 1.7, 0.02, woodM, 2.22, 1.0, -3.6, 0.01);
  { const r = new THREE.Mesh(new THREE.CircleGeometry(1.0, 36).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: rugTex, gradientMap: toonGradient() })); r.position.set(1.1, 0.012, -1.9); r.receiveShadow = true; r.userData.ink = false; g.add(r); }
  { const p = new THREE.Group(); p.position.set(2.2, 0, -1.2); g.add(p); mesh(p, new THREE.CylinderGeometry(0.2, 0.15, 0.32, 12), toon(0xd9734f), 0, 0.16, 0); for (let i = 0; i < 7; i++) { const a = i * 0.9; mesh(p, new THREE.SphereGeometry(0.16, 10, 8), toon(i % 2 ? 0x58b565 : 0x73c777), Math.cos(a) * 0.12, 0.5 + (i % 3) * 0.14, Math.sin(a) * 0.12); } }
  // ---- hall: a console table with a mirror, coats on hooks, shoes, pictures, a runner ----
  rbox(g, 0.34, 0.06, 1.1, woodLightM, 1.5, 0.8, 1.9, 0.02).userData.ink = true; for (const z of [1.4, 2.4]) ext(g, 1.38, 1.42, 0, 0.78, z - 0.03, z + 0.03, woodM);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.9), new THREE.MeshBasicMaterial({ color: 0xcfe7f2 })); m.position.set(1.68, 1.55, 1.9); m.rotation.y = -Math.PI / 2; m.userData.ink = false; g.add(m); ext(g, 1.66, 1.7, 1.08, 2.02, 1.55, 2.25, trimM, true); }
  for (const z of [3.6, 3.9, 4.2]) { ext(g, 1.66, 1.7, 1.5, 1.56, z - 0.04, z + 0.04, woodM); }
  rbox(g, 0.1, 0.9, 0.3, toon(0xd9534f), 1.6, 1.0, 3.6, 0.04); rbox(g, 0.1, 0.8, 0.28, toon(0x3f8f6a), 1.6, 1.05, 3.9, 0.04);
  rbox(g, 0.3, 0.12, 0.2, toon(0x3f5f8f), 1.35, 0.06, 3.2, 0.04); rbox(g, 0.3, 0.12, 0.2, toon(0xe2a64a), 1.3, 0.06, 3.5, 0.04);
  for (const [z, c] of [[0.9, 0xf2b84a], [2.9, 0x6fc0a6], [3.7, 0xe58a9a]]) { ext(g, -1.7, -1.66, 1.3, 2.0, z - 0.3, z + 0.3, trimM, true); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({ color: c })); p.position.set(-1.655, 1.65, z); p.rotation.y = Math.PI / 2; p.userData.ink = false; g.add(p); }
  // the nightlight (a little glowing plug) low on the hall wall
  { const n = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.09), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); n.position.set(-1.66, 0.38, 1.7); n.userData.ink = false; g.add(n); house.nightLight = n; }
  rooms.ceiling = ext(g, -2.7, 2.7, 2.6, 2.66, -4.3, 4.7, toon(0xf3ecde)); rooms.ceiling.userData.ink = false;
  outlineStatic(g, { width: 0.012, min: 0.05 });
  console.log("house fused", JSON.stringify(W.fuseStatic(g, { skip: [house.doorLeaf, house.outside, house.hallPane, house.moon, house.moonGlow, house.nightLight, rooms.ceiling] })));
}

// ===================== place D: the wolf den at dusk (a rock arch with a dark den behind it, pines, bushes) =====================
const grassMat = (rx, ry) => W.grassMaterial([rx, ry]);
const rockPalette = [0x8f8aa0, 0x9a95aa, 0x7f7a92, 0xa6a1b4];
function rock(grp, r, x, y, z, sx = 1, sy = 0.82, sz = 1, seed = 1) {
  const geo = new THREE.IcosahedronGeometry(r, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.16 * Math.sin(p.getX(i) * 3.1 + seed) * Math.cos(p.getZ(i) * 2.7 + seed * 1.7) + 0.08 * Math.sin(p.getY(i) * 4.3 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = mesh(grp, geo, toon(rockPalette[seed % 4]), x, y, z);
  m.scale.set(sx, sy, sz); m.rotation.y = seed;
  m.userData.ink = true;
  return m;
}
const den = { inside: null };
{
  const g = places.d;
  W.reseed(41);
  const heightAt = (x, z) => Math.max(0, (-z - 7) * 0.12) * (1 + 0.3 * Math.sin(x * 0.2));
  g.add(W.terrainMesh({ x0: -70, x1: 70, z0: -70, z1: 40, step: 2.5, heightAt, material: grassMat(36, 14) }));
  // the arch: two rock piles, a lintel boulder, a big mound behind, the dark inside
  rock(g, 1.3, -2.0, 0.85, -0.6, 1, 0.9, 1, 1); rock(g, 0.9, -2.7, 0.45, 0.7, 1, 0.8, 1, 2); rock(g, 0.85, -1.35, 1.95, -1.0, 1, 0.8, 1, 3);
  rock(g, 1.4, 2.1, 0.95, -0.7, 1, 0.9, 1, 4); rock(g, 0.9, 2.8, 0.45, 0.65, 1, 0.8, 1, 5); rock(g, 0.85, 1.5, 2.0, -1.0, 1, 0.8, 1, 6);
  rock(g, 1.15, 0, 2.35, -1.05, 1.5, 0.5, 0.8, 7);
  rock(g, 3.6, 0, 1.6, -6.2, 1.3, 0.85, 1, 8); rock(g, 1.8, -4.2, 0.8, -3.2, 1, 0.8, 1, 9); rock(g, 1.9, 4.4, 0.9, -3.2, 1, 0.8, 1, 10);
  { const inside = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), new THREE.MeshBasicMaterial({ color: 0x17122c })); inside.position.set(0, 0.55, -1.7); inside.scale.set(1.15, 1.0, 1.45); inside.userData.ink = false; g.add(inside); den.inside = inside; }
  { const f = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28).rotateX(-Math.PI / 2), toon(0x5a4630)); f.position.set(0, 0.03, -1.1); f.receiveShadow = true; f.userData.ink = false; g.add(f); }
  { const f = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28).rotateX(-Math.PI / 2), toon(0x8a6f4a)); f.position.set(0, 0.025, 0.55); f.scale.set(1.1, 1, 0.55); f.receiveShadow = true; f.userData.ink = false; g.add(f); } // worn earth at the entrance
  // trees and bushes: a pine forest round the den, an ambush bush on the right
  const pines = [[-6, -3, 6.6, 1], [-8, -6.5, 7.4, 2], [-4.4, -8, 6.8, 3], [6.2, -3.4, 6.8, 4], [8.2, -7, 7.2, 5], [4.6, -8.6, 6.6, 6], [-11, 0, 7, 7], [11.5, -1, 7.2, 8], [-9.5, -11, 7.6, 9], [10, -11, 7.4, 10], [0, -10, 7.8, 11], [-7, 4, 6.8, 12], [8, 5, 6.6, 13]];
  for (const [x, z, h, seed] of pines) put(g, W.leafyTree({ species: "pine", height: h, crown: 1.55, seed, trunkR: 0.2, leaves: 750, far: true }), x, 0, z, seed);
  for (const [x, z, sp, h, c, seed] of [[-13, 6, "oak", 5, 2.1, 3], [13, 6, "maple", 5, 2.0, 5], [-16, -6, "oak", 5.4, 2.2, 8], [16, -5, "birch", 5, 1.6, 9]]) put(g, W.leafyTree({ species: sp, height: h, crown: c, seed, leaves: 1300, leafSize: 0.25 }), x, 0, z, seed);
  for (const [x, z, s] of [[4.0, 1.7, 1], [5.2, 2.4, 2], [-4.2, 1.9, 3], [-5.4, 2.5, 4], [5.8, 4.4, 5], [-6.0, 4.6, 6]]) put(g, W.leafyBush({ r: 0.8 + (s % 3) * 0.1, seed: s + 20, leaves: 320, flowers: 0, tint: s }), x, 0, z, s);
  { const log = mesh(g, new THREE.CylinderGeometry(0.28, 0.3, 2.4, 12), toon(0x7a5434), -3.6, 0.28, 3.2); log.rotation.z = Math.PI / 2; log.rotation.y = 0.5; log.userData.ink = true; }
  g.add(W.grassField({ x0: -14, x1: 14, z0: -9, z1: 8, count: 26000, skip: (x, z) => Math.hypot(x, z - 0.2) < 2.4 && z > -1.2, seed: 12, height: 0.35, width: 1.2, spread: 0.12 }));
  g.add(W.grassField({ x0: -40, x1: 40, z0: -40, z1: -9, count: 30000, skip: () => false, seed: 14, height: 0.7, width: 2.4, spread: 0.35, heightAt }));
  for (const [x, y, z, h] of [[-25, 0, -60, 13], [22, 0, -66, 15], [0, 0, -74, 12]]) put(g, W.hill(40, h, 0x6a8f7c), x, y + 4, z);
  outlineStatic(g, { width: 0.02, min: 0.08 });
  console.log("den fused", JSON.stringify(W.fuseStatic(g, { skip: [den.inside] })));
}

// ===================== light, sky and mood =====================
const skyCanvas = (stops, deco) => { const c = document.createElement("canvas"); c.width = 540; c.height = 960; const x = c.getContext("2d"); const gr = x.createLinearGradient(0, 0, 0, 960); stops.forEach(([p, col]) => gr.addColorStop(p, col)); x.fillStyle = gr; x.fillRect(0, 0, 540, 960); deco?.(x); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const nightSky = skyCanvas([[0, "#0a0e2c"], [0.55, "#1a2a68"], [1, "#4a5fb0"]], (x) => { let s = 9; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 130; i++) { x.fillStyle = `rgba(255,255,255,${0.35 + 0.6 * r()})`; x.beginPath(); x.arc(r() * 540, r() * 700, 0.8 + 1.8 * r(), 0, 6.3); x.fill(); } });
const duskSky = skyCanvas([[0, "#2c2f78"], [0.38, "#7b58a6"], [0.7, "#e98e7e"], [1, "#ffc78a"]], (x) => { x.fillStyle = "rgba(255,248,224,0.95)"; x.beginPath(); x.arc(400, 170, 46, 0, 6.3); x.fill(); x.fillStyle = "rgba(255,248,224,0.18)"; x.beginPath(); x.arc(400, 170, 96, 0, 6.3); x.fill(); let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * r()})`; x.beginPath(); x.arc(r() * 540, r() * 240, 0.8 + 1.4 * r(), 0, 6.3); x.fill(); } });
const daySky = W.skyTexture();
const MOODS = {
  night: { bg: nightSky, hemi: [0x7a90e8, 0x2f2c4a, 2.0], key: [0xc8d8ff, 1.55], lamp: 2.4 },
  day: { bg: daySky, hemi: [0xfff6e4, 0xd8cfa0, 2.3], key: [0xfff0d2, 1.5], lamp: 0 },
  dusk: { bg: duskSky, hemi: [0xb9a8ff, 0x6a5a78, 1.75], key: [0xffb57a, 1.25], lamp: 0 },
};
const hemi = new THREE.HemisphereLight(0x7a90e8, 0x2f2c4a, 2.0);
const key = new THREE.DirectionalLight(0xc8d8ff, 1.55);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 40 });
key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
const lamp = new THREE.PointLight(0xffc880, 2.4, 7, 1.3);
lamp.position.set(-1.35, 0.95, 1.9);
scene.add(hemi, key, key.target, lamp);

// ---------- emoji sprites, thought bubbles ----------
function emojiSprite(ch, size = 100) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.font = `${size}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(ch, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8; s.visible = false;
  scene.add(s);
  return s;
}
const icons = new Map();
const ico = (ch) => { if (!icons.has(ch)) icons.set(ch, emojiSprite(ch)); return icons.get(ch); };
function bubbleSprite(emoji, fs = 84) {
  const c = document.createElement("canvas");
  c.width = 200; c.height = 180;
  const x = c.getContext("2d");
  x.lineWidth = 9; x.strokeStyle = "#2b1b16"; x.fillStyle = "#fff";
  x.beginPath(); x.ellipse(100, 76, 86, 62, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  for (const [cx, cy, r] of [[56, 148, 14], [34, 170, 8]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.stroke(); }
  x.font = `${fs}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(emoji, 100, 82);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }));
  s.renderOrder = 8; s.visible = false;
  scene.add(s);
  return s;
}
const fxList = []; // { s, t0, dur, from, to, size, arc, spin }
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
const toonDog = (colors, key, scale, extra) => {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d);
  return d;
};
const DOGS = 0.74;
const dog = toonDog(DOG_COLORS.golden, "g", DOGS);
const wolf = toonDog(DOG_COLORS.wolf, "w", 0.9, { pointyEars: true });
const mate = toonDog(DOG_COLORS.wolf, "w2", 0.78, { pointyEars: true });
const pups = [toonDog(DOG_COLORS.wolf, "w3", 0.42, { pointyEars: true }), toonDog(DOG_COLORS.wolf, "w4", 0.4, { pointyEars: true })];
const shade = toonDog(DOG_COLORS.shadow, "s", 0.92, { glowEyes: true, pointyEars: true });
for (const d of [dog, wolf, mate, ...pups, shade]) d.visible = false;

// ---------- the soft, expensive dog bed: a velvet bowl with gold piping, a cream cushion and gold buttons ----------
const plush = (() => {
  const g = new THREE.Group();
  const velvet = toon(0x2f8f9f), velvet2 = toon(0x47b0bf), gold = toon(0xf0c040), cream = toon(0xfff0d8);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 40), velvet); base.position.y = 0.07; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.13, 14, 44), velvet2); rim.rotation.x = Math.PI / 2; rim.position.y = 0.17; rim.scale.set(1, 1, 1.1); g.add(rim);
  for (const [R, y] of [[0.56, 0.16], [0.3, 0.2]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 48), gold); t.rotation.x = Math.PI / 2; t.position.y = y + (R < 0.4 ? 0.0 : 0.03); g.add(t); }
  const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.35, 0.12, 36), cream); cush.position.y = 0.16; cush.name = "cushion"; g.add(cush);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), gold); b.position.set(i ? Math.cos(a) * 0.18 : 0, 0.225, i ? Math.sin(a) * 0.18 : 0); g.add(b); }
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.01), toon(0xffffff)); tag.position.set(0.5, 0.2, 0.34); tag.rotation.set(0.15, 0.4, 0.2); g.add(tag);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  outline(g, { width: 0.012, min: 0.02 });
  scene.add(g);
  return g;
})();

// ---------- moon dust floating in the light, a frost patch on the cold floor, the choke-point ring and its arrows ----------
const dust = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const N = 46, pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.55, depthWrite: false, color: 0xdfe8ff, sizeAttenuation: true }));
  pts.frustumCulled = false; scene.add(pts);
  return { pts, N };
})();
function updateDust(t) {
  const p = dust.pts.geometry.attributes.position;
  for (let i = 0; i < dust.N; i++) {
    const a = i * 12.9898, f = (v) => v - Math.floor(v);
    const bx = (f(Math.sin(a) * 4375.5) - 0.5) * 2.2, by = f(Math.sin(a * 1.7) * 2154.2) * 1.9 + 0.1, bz = -0.2 + (f(Math.sin(a * 2.3) * 8123.7) - 0.5) * 3.4;
    p.setXYZ(i, bx + 0.12 * Math.sin(t * 0.7 + i), by + 0.08 * Math.sin(t * 0.9 + i * 2) + 0.03 * t % 0.3, bz + 0.1 * Math.cos(t * 0.6 + i));
  }
  p.needsUpdate = true;
}
const frost = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0, depthWrite: false }));
frost.position.set(0, 0.03, 0.25); frost.renderOrder = 3; scene.add(frost);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.9, 56).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
ring.position.set(0, 0.05, 0.1); ring.renderOrder = 3; scene.add(ring);
const ringFill = new THREE.Mesh(new THREE.CircleGeometry(0.78, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a60, transparent: true, opacity: 0, depthWrite: false })); ringFill.position.set(0, 0.04, 0.1); ringFill.renderOrder = 2; scene.add(ringFill);
const chevrons = [0, 1, 2, 3].map((i) => {
  const sh = new THREE.Shape(); sh.moveTo(-0.22, 0); sh.lineTo(0, 0.22); sh.lineTo(0.22, 0); sh.lineTo(0.22, -0.1); sh.lineTo(0, 0.1); sh.lineTo(-0.22, -0.1); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 3; scene.add(m); return m;
});
const widthBar = (() => { // a green double arrow across the doorway: "exactly door-wide"
  const g = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ color: 0x5be39a, transparent: true, opacity: 0, depthWrite: false });
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.07).rotateX(-Math.PI / 2), mat); g.add(bar);
  for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-0.16 * s, 0.13); sh.lineTo(-0.16 * s, -0.13); sh.closePath(); const a = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), mat); a.position.x = s * 0.5; g.add(a); const cap = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4).rotateX(-Math.PI / 2), mat); cap.position.x = s * 0.5; g.add(cap); }
  g.position.set(0, 0.06, 0.55); g.renderOrder = 3; g.traverse((o) => (o.renderOrder = 3)); scene.add(g); g.userData.mat = mat; return g;
})();
const aura = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0, depthWrite: false })); aura.position.set(0, 0.045, 0.05); aura.renderOrder = 2; scene.add(aura);
const spot = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.2, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); spot.renderOrder = 4; scene.add(spot);
const BUB = { stubborn: bubbleSprite("🐶💢", 62) };

// ===================== the story: where everyone is, shot by shot (pure functions of time and shot) =====================
const PB = V(-0.7, 0, 1.2);                          // the expensive bed, in the hall
const DX = -0.16, DZ = 0.02;                          // the dog, lying across the doorway
const U = (t, k) => Math.max(0, t - T0(k));
const SL = (t, k) => T1(k) - T0(k);
const HOOK = { pos: V(-0.55, 0.78, 3.25), look: V(-0.12, 0.3, 0.4), fov: 42 };
const mixv = (a, b, k) => a.clone().lerp(b, k);
const orb = (c, r, a, h) => V(c.x + r * Math.sin(a), c.y + h, c.z + r * Math.cos(a));
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const lying = (t, o = {}) => ({ t, lie: 1, wag: 0, headPitch: -0.12, headYaw: -1.15, headTilt: 0.12, ears: 0, sad: 0.2, cute: 1, closed: 0.9 * blink(t), ...o });

// the owner lies in bed (a flat person turned on their side), asleep under the blue blanket
const ASLEEP = (t) => ({ t, x: -0.75, y: 0.86, z: -3.3, fall: Math.PI / 2, flip: 1, eyes: { open: 0 }, blink: 0, mouth: { open: 0.05 + 0.05 * Math.sin(t * 2.2), smile: 0 }, brow: {}, head: { lift: 0.0 }, breathe: 1.6, armL: { a: 0.1, e: 0 }, armR: { a: -0.1, e: 0 } });

// ---------- the dog ----------
function dogState(t, k) {
  const u = U(t, k), L = SL(t, k);
  const door = (o = {}) => ({ x: DX, z: DZ, ry: Math.PI / 2, pose: lying(t, o) });
  switch (k) {
    case 1: return door({ headYaw: -1.2 + 0.05 * Math.sin(t * 0.9), headPitch: -0.1, ears: 0.1 });
    case 2: { // his eyes go to the bed, then back to the cold floor
      const toBed = ease.inOut(prog(u, 0.25, 0.55)) * (1 - ease.inOut(prog(u, 1.05, 1.4)));
      const down = ease.inOut(prog(u, 1.25, 1.65));
      return door({ headYaw: lerp(-1.2, -0.45, toBed) + 0.0, headPitch: lerp(-0.1, 0.0, toBed) + 0.35 * down, headTilt: 0.12 + 0.12 * toBed, sad: 0.3 + 0.2 * down });
    }
    case 3: { // day: he sits by where the bed will go, tail going, then sniffs it
      const sniff = bump(prog(u, 1.55, 1.95));
      return { x: 0.6, z: 1.75, ry: lerp(0.3, -0.5, prog(u, 1.3, 1.6)), pose: { t, sit: 1, wag: 0.9, wagSpeed: 13, headPitch: 0.45 * sniff - 0.08, headTilt: 0.15, ears: 0.5, cute: 1, mouth: 0.25 * (1 - sniff) } };
    }
    case 4: return door({ closed: 0.95, headYaw: -1.15, headPitch: 0.0, ears: -0.2, sad: 0 });
    case 5: return door({ closed: 0.95, headYaw: -1.15, headPitch: 0.05, ears: -0.2, sad: 0, shiver: 0 });
    case 6: return door({ closed: 0.55 + 0.1 * Math.sin(t * 2), headYaw: -1.0, headPitch: 0.02, ears: -0.1, sad: 0.3 });
    case 7: return door({ closed: 0.0, headYaw: -1.1 + 0.2 * ease.inOut(prog(u, 0.2, 0.9)), headPitch: -0.08, ears: 0.15, sad: 0.1 });
    case 8: return door({ closed: 0.0, headYaw: -1.0, headPitch: -0.12, ears: 0.35, sad: 0 });
    case 13: { // he comes from his bed and fits himself into the doorway
      const walk = prog(u, 0.0, 0.95), turn = ease.inOut(prog(u, 0.7, 1.15)), drop = ease.inOut(prog(u, 1.05, 1.5));
      const x = lerp(-0.75, DX, ease.inOut(prog(u, 0.0, 1.2))), z = lerp(1.35, DZ, ease.inOut(prog(u, 0.0, 1.45)));
      return { x, z, ry: lerp(0.0 + 0.5 * (1 - walk) , Math.PI / 2, turn) - 0.4 * (1 - turn) * (1 - walk) * 0, pose: lying(t, { lie: drop, walk: (1 - drop) * 0.9, headYaw: lerp(0, -1.15, drop), headPitch: -0.1, ears: 0.2, closed: 0 }) };
    }
    case 14: return door({ headYaw: -1.15 + 0.1 * Math.sin(u * 1.1), headPitch: -0.2, ears: 0.55, sad: 0, closed: 0, cute: 0.7 });
    case 15: return door({ headYaw: -0.15 - 0.2 * ease.inOut(prog(u, 0.3, 1.4)), headPitch: -0.12, ears: 0.4, sad: 0.15, closed: 0.35 * ease.inOut(prog(u, 1.6, 2.8)) });
    case 16: { // he leaves the soft bed (it dents, then springs back) and drops onto the hard floor
      const up = ease.inOut(prog(u, 0.55, 0.95)), go = ease.inOut(prog(u, 0.8, 1.95)), down = ease.inOut(prog(u, 1.95, 2.4));
      const x = lerp(PB.x + 0.02, DX, go), z = lerp(PB.z, DZ + 0.36, go);
      const stand = up * (1 - down);
      return { x, z: lerp(z, DZ, down), ry: lerp(lerp(0.8, -0.9, ease.inOut(prog(u, 0.7, 1.1))), Math.PI / 2, ease.inOut(prog(u, 1.7, 2.3))), pose: lying(t, { lie: 1 - stand, walk: stand * (go > 0.02 && go < 0.98 ? 0.9 : 0.1), headYaw: lerp(-0.2, -1.1, down) , headPitch: lerp(0.15, -0.1, up) * (1 - down) + 0.3 * down, ears: 0.1, closed: 0.85 * (1 - up) * (1 - 0.0) + 0.9 * down, sad: 0.4 + 0.3 * down }) };
    }
    case 17: { // he lifts his head and stares down the dark hall
      const alert = ease.inOut(prog(u, 0.55, 1.0)) * (1 - ease.inOut(prog(u, 1.75, 2.2)));
      return door({ headYaw: -1.1, headPitch: lerp(0.05, -0.2, alert) + 0.1 * (1 - ease.inOut(prog(u, 1.75, 2.2))) * 0, ears: lerp(-0.1, 0.5, alert), closed: lerp(0.85, 0, ease.inOut(prog(u, 0.2, 0.7))) * (1 - ease.inOut(prog(u, 0, 0))), sad: lerp(0.0, 0.2, 1 - alert) });
    }
    default: return null;
  }
}

// ---------- you ----------
function ownerState(t, k) {
  const u = U(t, k);
  if (PLACE[k - 1] !== "h") return null;
  if (k === 3) { // the front door opens; you carry the bed in, drop it on the floor
    const walk = prog(u, 0.05, 1.5), put = ease.inOut(prog(u, 1.5, 1.8));
    const x = lerp(0.45, 0.2, ease.inOut(walk)), z = lerp(4.15, 2.7, ease.inOut(walk));
    return { t, x, z, walk: 1 - put * 0.5, walkPhase: t * 8, y: 0, cute: 0.3, eyes: { open: 1 }, mouth: { open: 0.1, smile: 0.7 }, brow: { raise: 0.15 }, lean: 0.03,
      armL: { to: [-0.2, lerp(0.95, 0.3, put)], bend: -1 }, armR: { to: [0.2, lerp(0.95, 0.3, put)], bend: 1 } };
  }
  if (k === 6) return { t, x: 0.0, z: -0.85, y: 0, walk: 0, cute: 0.2, eyes: { open: 0.55 }, mouth: { open: 0, smile: -0.35 }, brow: { worry: 0.45 }, head: { tilt: 0.05, lift: -0.02 }, armL: { to: [-0.3, 0.92], bend: -1 }, armR: { to: [0.3, 0.92], bend: 1 }, lean: -0.02, look: [0, -0.5] };
  return ASLEEP(t);
}

// the bed prop: carried in, set down, dented while he lies on it
function plushState(t, k) {
  const u = U(t, k);
  if (k === 3) {
    const o = ownerState(t, k);
    const place = ease.inOut(prog(u, 1.5, 1.85));
    const carried = V(o.x, 1.1, o.z + 0.28);
    const p = mixv(carried, PB.clone().add(V(0, 0.0, 0)), place); p.y += 0.12 * bump(prog(u, 1.5, 1.95)) * 0.0;
    return { pos: p, rot: lerp(0.0, 0.3, place), tilt: lerp(1.15, 0, place), squash: 1 - 0.12 * bump(prog(u, 1.85, 2.0)) };
  }
  let dent = 0;
  if (k === 16) dent = (1 - ease.inOut(prog(u, 0.7, 1.0))) * 1;
  return { pos: PB.clone(), rot: 0.3, tilt: 0, squash: 1, dent };
}

// ---------- the wolves, and the shadow ----------
function wolfStates(t, k) {
  const u = U(t, k);
  const out = {};
  if (k < 9 || k > 12) return out;
  const guardStand = k === 12 ? ease.inOut(prog(u, 0.28, 0.5)) : 0;
  out.wolf = { x: -0.15, z: 0.35, ry: Math.PI / 2 + (k === 12 ? -0.9 * guardStand : 0), pose: { t, lie: 1 - guardStand, wag: 0, headYaw: k === 12 ? lerp(-1.1, 0.0, guardStand) : -1.0 + 0.1 * Math.sin(t * 0.8), headPitch: k === 11 ? -0.12 : 0.0, ears: k === 11 ? -0.5 : k === 12 ? 0.6 : 0.1, closed: k <= 10 ? 0.8 : 0.0, sad: 0, cute: 0, snarl: k === 12 ? 0.8 * guardStand : 0, angry: k === 12 ? 0.8 * guardStand : 0 } };
  out.mate = { x: 0.05, z: -1.9, ry: 2.6, pose: { t, lie: 1, closed: 0.95, headPitch: 0.1, ears: 0, cute: 0, sad: 0 } };
  out.pup1 = { x: -0.55, z: -1.35, ry: 0.5, pose: { t, lie: 1, closed: 0.95, headPitch: 0.15, cute: 0, ears: 0 } };
  out.pup2 = { x: 0.55, z: -1.45, ry: -0.9, pose: { t, lie: 1, closed: 0.95, headPitch: 0.1, cute: 0, ears: 0 } };
  // the shadow: hidden in the right-hand bush with glowing eyes, then it springs; the wolf stands, the shadow bounces away
  const lurk = k === 11 && t > C.exposed + 0.2 ? 1 : 0;
  if (k === 11) out.shade = { x: 3.5, z: 1.9, ry: -2.1, pose: { t, crouch: 1, ears: -0.6, walk: 0, wag: 0, cute: 0, closed: 0, headPitch: 0.15, snarl: 0.0 }, show: lurk };
  if (k === 12) {
    const jump = prog(u, 0.05, 0.48), back = ease.inOut(prog(u, 0.5, 0.92));
    const x = lerp(lerp(3.5, 1.15, ease.in(jump)), 3.6, back), z = lerp(lerp(1.9, 0.75, jump), 2.2, back);
    out.shade = { x, z, y: 0.9 * Math.sin(Math.PI * jump) * (1 - back), ry: lerp(-2.1, -2.35, jump) + (back > 0 ? 0.6 * back : 0), pose: { t, leap: jump * (1 - back), crouch: (1 - jump) * 0.3, ears: -0.7, wag: 0, cute: 0, snarl: 0.9 * (1 - back), angry: 0.8, lift: 0.9 * Math.sin(Math.PI * jump) * (1 - back) }, show: 1 };
  }
  return out;
}
function intruderState(t, k) { // the shadow that creeps down the hall in the last shot
  if (k !== 17) return null;
  const u = U(t, k);
  const come = ease.inOut(prog(u, 0.45, 1.35)), flee = ease.inOut(prog(u, 1.45, 1.95));
  const z = lerp(lerp(4.0, 2.05, come), 4.2, flee);
  return { x: lerp(0.95, 0.5, come) + 0.1 * flee, z, ry: flee > 0.02 ? 0.3 : Math.PI + 0.1 * (1 - come), pose: { t, walk: come > 0.01 && come < 0.99 || flee > 0.02 && flee < 0.99 ? 0.8 : 0, crouch: 0.4 * (1 - flee), ears: -0.6, cute: 0, wag: 0, snarl: 0, sad: 0.5 * flee }, show: ease.out(prog(u, 0.35, 0.55)) * (1 - prog(u, 1.95, 2.1)) };
}

// ---------- cameras (each a slow, eased move; positions in house or den coordinates) ----------
function cameraAt(t, k) {
  const u = U(t, k), L = SL(t, k), e = ease.glide(clamp01(u / L)), s = clamp01(u / L);
  switch (k) {
    case 1: { const m = ease.glide(prog(u, 0, L)); return { pos: mixv(HOOK.pos, V(-0.25, 0.55, 2.6), m), look: mixv(HOOK.look, V(0.05, 0.3, 0.0), m), fov: lerp(HOOK.fov, 41, m) }; }
    case 2: { const a = lerp(0.0, 0.85, e); return { pos: orb(V(0.0, 0.0, 0.1), lerp(2.2, 1.7, e), a, lerp(0.45, 0.55, e)), look: V(0.1 - 0.2 * e, 0.3, 0.1 + 0.3 * e), fov: lerp(44, 52, e) }; }
    case 3: return { pos: V(lerp(-0.15, -0.05, e), lerp(1.0, 1.1, e), 0.35), look: V(lerp(0.1, -0.1, e), lerp(0.85, 0.7, e), 3.4), fov: 52 };
    case 4: return { pos: V(lerp(-0.4, 0.15, e), lerp(0.8, 0.7, e), lerp(2.9, 2.5, e)), look: V(lerp(0.0, 0.25, e), 0.55, -1.6), fov: lerp(50, 47, e) };
    case 5: return { pos: V(lerp(-0.1, 0.25, e), lerp(0.1, 0.2, e), lerp(2.3, 1.05, e)), look: V(0.2, 0.22, 0.0), fov: lerp(54, 50, e) };
    case 6: return { pos: V(lerp(0.9, 0.5, e), lerp(0.42, 0.55, e), lerp(1.75, 1.5, e)), look: V(lerp(0.0, 0.0, e), lerp(0.85, 1.05, e), -0.7), fov: lerp(54, 50, e) };
    case 7: return { pos: V(lerp(1.0, 0.6, e), lerp(0.3, 0.34, e), lerp(1.9, 1.5, e)), look: V(lerp(0.0, 0.05, e), 0.18, 0.05), fov: lerp(52, 48, e) };
    case 8: return { pos: mixv(V(0.45, 2.3, 1.7), V(0.0, 4.5, 0.75), e), look: mixv(V(0.0, 0.2, 0.3), V(0.0, 0.0, 0.0), e), fov: lerp(52, 50, e) };
    case 13: { const top = ease.inOut(prog(u, 0.9, L)); return { pos: mixv(V(lerp(1.3, 0.8, ease.glide(prog(u, 0, 1.1))), lerp(0.7, 0.85, s), lerp(2.9, 2.2, s)), V(0.15, 3.1, 1.2), top), look: mixv(V(lerp(-0.4, -0.05, s), 0.3, lerp(0.8, 0.4, s)), V(0.0, 0.0, 0.1), top), fov: 52 }; }
    case 14: { const a = lerp(0.6, -0.5, e); return { pos: orb(V(0.0, 0.0, 0.1), lerp(2.25, 1.85, e), a, lerp(0.9, 0.5, e)), look: V(0.1, 0.32, 0.0), fov: lerp(46, 50, e) }; }
    case 15: { const p = ease.glide(s); return { pos: V(lerp(0.35, -0.3, p), 1.3 - 0.1 * bump(p), lerp(1.7, -1.5, p)), look: mixv(V(0.0, 0.5, 0.0), V(-1.7, 0.95, -3.3), ease.inOut(prog(s, 0.0, 0.8))), fov: lerp(52, 54, s) }; }
    case 16: return { pos: V(lerp(-0.7, 0.9, e), lerp(0.95, 0.7, e), lerp(3.5, 2.8, e)), look: V(lerp(-0.6, 0.0, e), 0.3, lerp(1.0, 0.45, e)), fov: 52 };
    case 17: { const top = V(0.0, 3.5, 1.0), lookTop = V(0.05, 0.0, 1.55); const d = ease.inOut(prog(u, 1.0, L)); return { pos: mixv(top, HOOK.pos, d), look: mixv(lookTop, HOOK.look, d), fov: lerp(55, HOOK.fov, d) }; }
    // the den: local coordinates
    case 9: return { pos: V(lerp(0.9, 0.0, e), lerp(1.9, 1.2, e), lerp(10.5, 6.4, e)), look: V(0.0, 1.0, -0.8), fov: lerp(52, 50, e) };
    case 10: return { pos: V(lerp(-1.2, -0.35, e), lerp(0.75, 0.6, e), lerp(3.6, 2.7, e)), look: V(0.05, 0.42, 0.0), fov: lerp(52, 46, e) };
    case 11: return { pos: V(lerp(3.4, 2.0, e), lerp(0.55, 0.8, e), lerp(2.6, 3.1, e)), look: V(lerp(0.4, 0.8, e), 0.5, lerp(0.4, 0.9, e)), fov: 52 };
    case 12: return { pos: V(lerp(-1.7, -0.9, e), 0.95, 4.3), look: V(lerp(1.0, 0.8, e), 0.55, 0.9), fov: 52 };
    default: return { pos: HOOK.pos.clone(), look: HOOK.look.clone(), fov: HOOK.fov };
  }
}

// ===================== the hall clock (its hands whirl while the night goes by) =====================
const clockHands = (() => {
  const g = new THREE.Group(); g.position.set(1.66, 1.95, 2.8); g.rotation.y = -Math.PI / 2; places.h.add(g);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 30).rotateX(Math.PI / 2), toon(0xfffbf0)); g.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 30), toon(0x2b2f3a)); g.add(rim);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const tk = new THREE.Mesh(new THREE.BoxGeometry(0.02, i % 3 ? 0.03 : 0.055, 0.01), toon(0x2b2f3a)); tk.position.set(Math.sin(a) * 0.19, Math.cos(a) * 0.19, 0.03); tk.rotation.z = -a; g.add(tk); }
  const mk = (len, w, c) => { const h = new THREE.Group(); h.position.z = 0.04; const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.012), toon(c)); m.position.y = len / 2 - 0.02; h.add(m); g.add(h); return h; };
  return { min: mk(0.17, 0.016, 0x2b2f3a), hour: mk(0.11, 0.022, 0x2b2f3a) };
})();

// ===================== helpers for the frame =====================
const _p = V(0, 0, 0), _q = V(0, 0, 0);
const popK = (t, t0, dur = 0.9) => ease.out(prog(t, t0, t0 + 0.2)) * (1 - prog(t, t0 + dur - 0.2, t0 + dur));
function hideAll() { for (const s of icons.values()) s.visible = false; for (const b of Object.values(BUB)) b.visible = false; }
function showIcon(ch, pos, size, on, { bob = 0, t = 0, op = 1 } = {}) {
  const s = ico(ch);
  if (on <= 0.01) return;
  s.visible = true; s.position.copy(pos); s.position.y += bob * Math.sin(t * 5);
  s.scale.setScalar(size * on); s.material.opacity = Math.min(1, on * 1.4) * op;
}
function setBub(s, on, pos, size) { s.visible = on > 0.01; if (!on) return; s.position.copy(pos); s.scale.set(size * on, size * 0.9 * on, 1); s.material.opacity = Math.min(1, on * 1.5); }

// the bursts and flights that belong to certain words
burst(C.expensive - 0.05, V(0.95, 1.35, 2.2), 9, { ch: ["💰", "✨", "💵", "✨"], spread: 0.8, rise: 0.9, size: 0.2, gap: 0.07, dur: 1.1 });
burst(C.cold - 0.02, V(-0.15, 0.1, 1.0), 6, { ch: ["❄️"], spread: 0.7, rise: 0.8, size: 0.2, gap: 0.08, dur: 1.2 });
burst(C.hard1 + 0.05, V(-0.45, 0.12, 1.5), 4, { ch: ["🪵"], spread: 0.5, rise: 0.5, size: 0.22, gap: 0.12, dur: 0.9 });
burst(C.cooler - 0.05, V(0.1, 0.25, 0.8), 5, { ch: ["❄️"], spread: 0.8, rise: 0.9, size: 0.2, gap: 0.05, dur: 0.55 });
for (let i = 0; i < 9; i++) travel(C.drafty + 0.05 + i * 0.12, V(OFF.d + 4.6, 0.5 + 0.12 * (i % 4), 1.0 + 0.35 * (i % 5)), V(OFF.d - 3.8, 0.8 + 0.1 * (i % 3), 0.7 + 0.25 * (i % 4)), i % 3 ? "🍃" : "🍂", { dur: 1.35, size: 0.2, arc: 0.35 });
burst(T0(12) + 0.5, V(OFF.d + 0.95, 0.55, 0.75), 6, { ch: ["💥", "✨"], spread: 0.5, rise: 0.5, size: 0.26, gap: 0.05, dur: 0.7 });
burst(C.barricade - 0.05, V(DX + 0.2, 0.5, 0.2), 7, { ch: ["✨", "🛡️", "⭐"], spread: 1.0, rise: 0.8, size: 0.22, gap: 0.04, dur: 0.5, spin: 0.6 });
burst(C.abandon, PB.clone().add(V(0, 0.35, 0)), 6, { ch: ["✨", "💛"], spread: 0.7, rise: 0.8, size: 0.2, gap: 0.08, dur: 1.2 });
travel(C.comfort - 0.1, PB.clone().add(V(0, 0.6, 0)), V(DX + 0.3, 0.7, 0.25), "💛", { dur: 1.3, size: 0.3, arc: 0.6 });

// ===================== the dissolve between shots =====================
const rt = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType });
const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
veil.renderOrder = 1000; veil.frustumCulled = false; veil.visible = false; veil.userData.ink = false;
camera.add(veil);
const HALF = 0.2;           // the dissolve lasts 0.4 s: the old shot keeps moving, the new one is already in place
const outsideTex = canvasTex(8, 128, (x) => { const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#9fd8f5"); gr.addColorStop(0.55, "#d5eefb"); gr.addColorStop(0.56, "#9ad06a"); gr.addColorStop(1, "#7bbf5a"); x.fillStyle = gr; x.fillRect(0, 0, 8, 128); });
house.outside.material.map = outsideTex; house.outside.material.needsUpdate = true;

// ===================== one frame of the world, for time t and shot k =====================
function apply(t, k) {
  hideAll();
  const pl = PLACE[k - 1], mood = MOOD[k - 1], M = MOODS[mood], day = mood === "day", u = U(t, k);
  places.h.visible = pl === "h"; places.d.visible = pl === "d";
  scene.background = M.bg;
  hemi.color.setHex(M.hemi[0]); hemi.groundColor.setHex(M.hemi[1]); hemi.intensity = M.hemi[2] * (k === 15 ? 1 - 0.18 * ease.inOut(prog(t, C.senses, C.down)) : 1);
  key.color.setHex(M.key[0]); key.intensity = M.key[1] * (k === 14 ? 1 + 0.25 * bump(prog(t, C.living, C.barricade + 1.0)) : 1);
  lamp.intensity = M.lamp;
  // the moon crosses the window during the night (a time-lapse in shot 4)
  const mx = k === 4 ? lerp(1.55, 0.65, ease.inOut(clamp01(u / SL(t, 4)))) : 0.7;
  house.moon.position.set(mx, 1.5 + 0.12 * Math.sin((mx - 0.65) * 3), -6.2); house.moonGlow.position.set(mx, house.moon.position.y, -6.25);
  house.moon.visible = house.moonGlow.visible = !day;
  house.doorLeaf.rotation.y = day ? -1.55 : 0; house.outside.visible = day;
  house.hallPane.material.color.setHex(day ? 0xbfe6ff : 0x1b2552); house.nightLight.visible = !day;
  if (pl === "h") {
    if (day) { key.position.set(2.2, 3.4, 8.5); key.target.position.set(0, 0.2, 1.8); }
    else { const tg = V(0, 0.3, 0.4), mv = V(mx, house.moon.position.y, -6.2).sub(tg).normalize().multiplyScalar(14); key.position.copy(tg).add(mv); key.target.position.copy(tg); }
  } else { key.target.position.set(OFF.d + 0.2, 0.3, 0.6); key.position.set(OFF.d - 6.5, 5.5, 8.5); }
  // camera first (the puppet turns to it)
  const c = cameraAt(t, k), ox = pl === "d" ? OFF.d : 0;
  camera.position.set(c.pos.x + ox, c.pos.y, c.pos.z); camera.lookAt(c.look.x + ox, c.look.y, c.look.z);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  rooms.ceiling.visible = camera.position.y < 2.4;
  // the clock
  clockHands.min.rotation.z = -(0.6 + (k >= 4 ? 14 * Math.PI * 2 * (k === 4 ? ease.inOut(clamp01(u / SL(t, 4))) : 1) : 0));
  clockHands.hour.rotation.z = clockHands.min.rotation.z / 12 - 1.0;
  // you
  const os = ownerState(t, k);
  owner.visible = !!os;
  if (os) { owner.tint(day ? 0xffffff : 0x8e9ccf); owner.pose(os); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  // the dog, the wolves, the shadow, the bed
  const gs = dogState(t, k);
  dog.visible = !!gs;
  if (gs) dog.pose({ ...gs.pose, x: gs.x, z: gs.z, ry: gs.ry, y: 0 });
  const ws = wolfStates(t, k);
  for (const [nm, d] of [["wolf", wolf], ["mate", mate], ["pup1", pups[0]], ["pup2", pups[1]], ["shade", shade]]) {
    const s = ws[nm];
    d.visible = !!s && (s.show === undefined || s.show > 0.5);
    if (s) d.pose({ ...s.pose, x: OFF.d + s.x, z: s.z, ry: s.ry, y: s.y ?? 0 });
  }
  const is = intruderState(t, k);
  if (is) { shade.visible = is.show > 0.5; shade.pose({ ...is.pose, x: is.x, z: is.z, ry: is.ry, y: 0 }); }
  plush.visible = pl === "h";
  if (pl === "h") {
    const ps = plushState(t, k);
    plush.position.copy(ps.pos); plush.rotation.set(-ps.tilt, ps.rot, 0, "YXZ"); plush.scale.set(0.9, 0.9 * ps.squash, 0.9);
    plush.getObjectByName("cushion").scale.y = 1 - 0.6 * (ps.dent ?? 0);
  }
  const nightHouse = pl === "h" && !day;
  dust.pts.visible = nightHouse && k !== 8 && k !== 17 && k !== 13;
  if (dust.pts.visible) updateDust(t);
  // ----- the icons and graphics for each shot -----
  frost.visible = ring.visible = ringFill.visible = widthBar.visible = aura.visible = spot.visible = false; chevrons.forEach((m) => (m.visible = false));
  if (k === 2) {
    frost.visible = true; frost.material.opacity = 0.3 * ease.out(prog(t, C.cold, C.cold + 0.4)) * (1 - prog(t, C.over + 0.2, C.over + 0.7));
    showIcon("🛏️", PB.clone().add(V(0, 0.95, 0)), 0.5, popK(t, C.over - 0.05, T1(2) - C.over + 0.05), { bob: 0.02, t });
  }
  if (k === 3) showIcon("💰", plushState(t, 3).pos.clone().add(V(0.0, 0.62, 0)), 0.5, popK(t, C.expensive, 0.9), { bob: 0.03, t });
  if (k === 4) { showIcon("🌙", V(-0.6, 2.0, 1.5), 0.42, popK(t, T0(4) + 0.1, SL(t, 4) - 0.1), { bob: 0.02, t }); }
  if (k === 5) { aura.visible = true; aura.material.opacity = 0.26 * ease.out(prog(t, C.doorway - 0.1, C.doorway + 0.3)) * (0.85 + 0.15 * Math.sin(t * 8)); aura.position.set(DX + 0.25, 0.045, 0.1); aura.scale.setScalar(1.0); }
  if (k === 6) { owner.parts.headG.localToWorld(_p.set(0.5, 0.75, 0)); setBub(BUB.stubborn, popK(t, C.stubborn - 0.15, 1.1), _p.clone(), 0.9); }
  if (k === 7) {
    frost.visible = true; frost.material.opacity = 0.32 * ease.out(prog(t, C.cooler - 0.3, C.cooler + 0.25)) * (1 - 0.8 * prog(t, C.cooler + 0.6, C.cooler + 0.9));
    showIcon("🌡️", V(0.15, 0.78, 0.55), 0.5, popK(t, C.cooler, T1(7) - C.cooler), { bob: 0.015, t });
    showIcon("❌", V(0.15, 0.78, 0.6), 0.6, popK(t, C.cooler + 0.55, T1(7) - C.cooler - 0.5), { t });
  }
  if (k === 8) {
    const on = ease.out(prog(t, C.choke - 0.15, C.choke + 0.3)), pulse = 1 + 0.07 * Math.sin(t * 9);
    ring.visible = ringFill.visible = true; ring.material.opacity = 0.9 * on; ringFill.material.opacity = 0.22 * on; ring.scale.setScalar(pulse); ring.position.set(DX + 0.3, 0.05, 0.1); ringFill.position.set(DX + 0.3, 0.04, 0.1);
    chevrons.forEach((m, i) => { const a = -Math.PI / 2 + (i - 1.5) * 0.55, fr = ((t * 1.3 + i * 0.25) % 1), r = 1.9 - 1.1 * fr; m.visible = on > 0.05; m.position.set(Math.cos(a) * 0 + (i - 1.5) * 0.55 * (r / 1.9) * 1.6, 0.06, 0.1 + Math.sin(-a) * r); m.rotation.y = Math.atan2(-(m.position.x - (DX + 0.3)), (m.position.z - 0.1)) * 1 + Math.PI; m.scale.setScalar(0.8); m.material.opacity = 0.9 * on * Math.sin(Math.PI * fr); });
    showIcon("🛡️", V(DX + 0.3, 1.0, 0.1), 0.6, popK(t, C.point - 0.05, T1(8) - C.point + 0.05), { bob: 0.02, t });
  }
  if (k === 10) {
    showIcon("⚠️", V(OFF.d - 0.1, 1.15 + 0.03 * Math.sin(t * 9), 0.4), 0.5 * (1 + 0.12 * Math.sin(t * 9)), popK(t, C.dangerous - 0.05, 1.1), { t });
    showIcon("💤", V(OFF.d + 0.45, 0.8 + 0.1 * ((t * 0.9) % 1), 0.45), 0.3, popK(t, C.sleep, T1(10) - C.sleep + 0.05), { t });
  }
  if (k === 11) {
    spot.visible = true; spot.material.opacity = 0.17 * ease.out(prog(t, C.exposed, C.exposed + 0.4)); spot.position.set(OFF.d - 0.1, 2.1, 0.35);
    showIcon("👁️", V(OFF.d + 3.2, 1.3, 1.95), 0.34, popK(t, C.exposed + 0.25, 1.2), { t });
    showIcon("👁️", V(OFF.d + 3.85, 1.3, 1.95), 0.34, popK(t, C.exposed + 0.32, 1.2), { t });
  }
  if (k === 12) { showIcon("❗", V(OFF.d - 0.1, 1.35, 0.45), 0.5, popK(t, T0(12) + 0.15, 0.8), { t }); }
  if (k === 13) { widthBar.visible = true; widthBar.userData.mat.opacity = 0.9 * ease.out(prog(t, C.threshold - 0.1, C.threshold + 0.25)); widthBar.position.set(0, 0.06, 0.62); }
  if (k === 14) {
    aura.visible = true; aura.material.opacity = 0.34 * ease.out(prog(t, C.living - 0.1, C.living + 0.35)) * (0.85 + 0.15 * Math.sin(t * 7)); aura.position.set(DX + 0.25, 0.045, 0.1); aura.scale.setScalar(1.0 + 0.06 * Math.sin(t * 7));
    showIcon("🚧", V(DX + 0.28, 1.15, 0.2), 0.8, popK(t, C.living + 0.05, T1(14) - C.living), { bob: 0.02, t });
  }
  if (k === 15) {
    const base = V(-2.15, 1.85, -3.2), sx = [-0.5, -0.17, 0.17, 0.5];
    ["👁️", "👂", "👃", "✋"].forEach((ch, i) => { const on = popK(t, C.asleep + i * 0.1, 9); const dim = ease.inOut(prog(t, C.shut + i * 0.14, C.shut + i * 0.14 + 0.3)); showIcon(ch, base.clone().add(V(sx[i] * 1.1, 0, 0)), 0.34 * (1 - 0.3 * dim), on * (1 - 0.8 * dim) + 0.0, { bob: 0.01, t }); });
    showIcon("💤", V(-2.4, 1.25 + 0.15 * ((t * 0.8) % 1), -3.1), 0.36, popK(t, C.shut, 9) * (1 - 0.0), { t });
  }
  if (k === 16 || k === 17) showIcon("💤", V(-2.4, 1.25 + 0.15 * ((t * 0.8) % 1), -3.1), 0.3, 1, { t });
  drawFx(t);
}

// ===================== the frame =====================
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  const k = shotOf(t);
  let kOld = 0, alpha = 0;
  for (let i = 1; i < NSHOT; i++) { const c = STARTS[i]; if (t > c - HALF && t < c + HALF) { kOld = i; alpha = 1 - ease.inOut((t - (c - HALF)) / (2 * HALF)); } }
  const kNew = kOld ? kOld + 1 : k;
  veil.visible = false;
  if (kOld && alpha > 0.003) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
    apply(t, kOld);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
  }
  apply(t, kNew);
  if (kOld && alpha > 0.003) {
    veil.visible = true; veil.material.opacity = alpha;
    const h = 2 * 0.12 * Math.tan((camera.fov * Math.PI) / 360);
    veil.position.set(0, 0, -0.12); veil.scale.set(h * camera.aspect, h, 1);
  }
  captions(t);
});

// ===================== sound: real recordings only, placed on the action (cue sheet added below) =====================
const sfx = createSfx(short, { mix: { gain: 1.5, duck: { depth: 0.3, attack: 0.012, release: 0.28, threshold: -42 } } });

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
document.getElementById("vignette").style.opacity = "0.16";

window.__dbg = { scene, camera, dog, owner, places, STARTS, DURATION };
short.start();
