import { createShort, THREE } from "../../js/engine.js";
import { outline, toonify, toon, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import { loadSrt, wordCaptions } from "../../js/voiceover.js";
import { createSfx } from "../../js/sfx.js";
import { buildOutside } from "../../js/outside.js";
import { buildRoom } from "../dog-gaze/room.js";
import { buildStage } from "../dog-gaze/worlds.js";
import { createKit, createDissolve, clamp01, lerp, ease, prog, V, bump, mixv, popK, glowTex } from "../dog-gaze/kit.js";
import { createIcons3D } from "../../js/icons3d.js";
import { buildHand, buildHeroPaw, buildToonArms, buildOffice } from "./props.js";

// "Why your dog paws at you" — toon style: flat 2D people in a 3D cartoon world, the 3D hero dog, and your own 3D hand in the close-ups.
// A fast ~23 s cut (the voice has no silences; the phrases overlap): 17 shots on the couch, in a boss's office, on a stage,
// eased cameras with quick cross-dissolves, icons instead of text, vivid colour, and a seamless loop (the last frame is the first frame).
// Every state is a pure function of time and shot, so any frame can be redrawn.

const FPS = 60;
const words = await loadSrt("voiceover.srt");
if (words.length !== 90) console.warn("voiceover.srt: expected 90 words, got", words.length);
const wt = (i) => words[i].start;          // start of word i (0-based)
const DURATION = 1366 / FPS;               // the length of voiceover.wav (22.76 s): "which is why" runs straight into "Your dog..."

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 50, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.02; camera.far = 700; camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);
const kit = createKit({ scene, camera });
// the icons are 3D toon models (js/icons3d.js), not emoji sprites: sharp at any size
const ic = createIcons3D({ renderer, scene, camera });
const { showIcon, showBubble, inFront, burst } = ic;

// ===================== the shots: each begins a hair before the first word of its idea =====================
const SHOTS = [
  [0, "room", "day"],                 //  1 Your dog isn't actually            — the hook: his eyes on yours, from your seat
  [wt(4) - 0.06, "room", "stern"],    //  2 being demanding                    — low angle, chin up, a paw raised: the little boss
  [wt(6) - 0.06, "room", "day"],      //  3 when they put a paw on your hands  — close-up: the paw lands on your hand
  [wt(14) - 0.06, "room", "day"],     //  4 When you pause petting them        — you on the couch, petting; your hand stops
  [wt(19) - 0.06, "room", "day"],     //  5 and they press their paw against your wrist
  [wt(27) - 0.06, "stage", "boss"],   //  6 you probably think they're bossing you around — the boss in a tie, you running errands
  [wt(34) - 0.06, "room", "warm"],    //  7 You see, they're asking for more   — begging eyes, a hand in a bubble, a plus
  [wt(40) - 0.06, "stage", "warmstage"], // 8 Dogs don't have arms to hug you   — cartoon arms pop out, try to hug, vanish
  [wt(47) - 0.06, "stage", "warmstage"], // 9 and they don't have words to say thank you
  [wt(56) - 0.06, "stage", "stage"],  // 10 Their paw is their only            — the hero paw rises into the light
  [wt(61) - 0.06, "stage", "stage"],  // 11 physical tool of affection         — a toolbox turns into a heart
  [wt(65) - 0.06, "room", "warm"],    // 12 By pressing against your skin      — the paw on your forearm, warm rings
  [wt(70) - 0.06, "room", "warm"],    // 13 they're literally petting you back — the paw strokes your arm
  [wt(75) - 0.06, "room", "day"],     // 14 They aren't saying "keep going,"
  [wt(80) - 0.06, "room", "love"],    // 15 they're telling you                — your hand turns over; the paw rests in your palm
  [wt(83) - 0.06, "room", "love"],    // 16 "I love you too."                  — the hug, a heart
  [wt(87) - 0.06, "room", "day"],     // 17 Which is why                       — back to your seat: the first frame (the loop)
];
const NSHOT = SHOTS.length;
const STARTS = SHOTS.map((s) => s[0]);
const shotOf = (t) => { let k = 1; for (let i = 1; i < NSHOT; i++) if (t >= STARTS[i]) k = i + 1; return k; };
const T0 = (k) => STARTS[k - 1];
const T1 = (k) => (k < NSHOT ? STARTS[k] : DURATION);
const U = (t, k) => Math.max(0, t - T0(k));
const SL = (k) => T1(k) - T0(k);
// quick dissolves for a fast cut; the punchy ones are nearly hard
const HARD = new Set([2, 6, 7, 8, 10, 14]);
const half = (i) => (HARD.has(i + 1) ? 0.05 : 0.12);

// ===================== places =====================
const room = buildRoom(); scene.add(room.group);
const outside = buildOutside(); scene.add(outside.group, outside.sky);
scene.fog = new THREE.Fog(0xe9f8ff, 45, 260);
const STAGE0 = V(6000, 0, 0);
const stage = buildStage(); stage.group.position.copy(STAGE0); scene.add(stage.group);
const ORG = { room: V(0, 0, 0), stage: STAGE0 };
const P = (place, x, y, z) => V(ORG[place].x + x, ORG[place].y + y, ORG[place].z + z);
const office = buildOffice(); office.group.position.copy(STAGE0); scene.add(office.group);
const heroPaw = buildHeroPaw(); scene.add(heroPaw.group);
const hand = buildHand(); scene.add(hand.group);
const toonArms = buildToonArms(); toonArms.forEach((a) => scene.add(a.sh));

// ===================== cast =====================
const DOGS = 0.62;                        // on the couch
function toonDog(colors, key, scale, extra = {}) {
  const d = heroDog(colors, key, scale, extra);
  toonify(d, { override: [[d.materials.body, d.colors.body], [d.materials.light, d.colors.light], [d.materials.dark, d.colors.dark]] });
  outline(d, { width: 0.012, min: 0.1 });
  scene.add(d); d.visible = false;
  for (const e of d.eyes) e.userData.p0 = { pupil: e.pupil.position.clone(), iris: e.iris.position.clone() };
  return d;
}
function dogLook(d, lx = 0, ly = 0) {
  for (const e of d.eyes) { const p0 = e.userData.p0; e.pupil.position.set(p0.pupil.x + lx * 0.016, p0.pupil.y + ly * 0.014, p0.pupil.z); e.iris.position.set(p0.iris.x + lx * 0.014, p0.iris.y + ly * 0.012, p0.iris.z); }
}
const dog = toonDog(DOG_COLORS.golden, "g", DOGS);
// pink toe beans under his front feet (you see them when he lifts a paw)
for (const lg of [dog.legs.fl, dog.legs.fr]) {
  const pm = toon(0xff7a9a), g = new THREE.Group(); g.position.set(0, -0.383, 0.02); lg.add(g);
  const big = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), pm); big.scale.set(1.15, 0.28, 0.85); big.position.z = -0.015; g.add(big);
  for (const x of [-0.048, -0.016, 0.016, 0.048]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 8), pm); b.scale.set(1, 0.4, 1.1); b.position.set(x, 0.002, 0.06 - Math.abs(x) * 0.4); g.add(b); }
}
office.tie.scale.setScalar(1.25); office.tie.position.set(0, -0.06, 0.25); dog.neck.add(office.tie);
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
owner.visible = false; scene.add(owner);

// ---------- where things are on the couch (seat cushions top at y = 0.59) ----------
const SEAT = 0.59, X0 = -2.62;
const OWN = V(X0, 0, 0.05);                   // where you sit
const PILLOW_H = 0.085;                       // a little pillow on the seat between you: your hand rests on it
const HAND0 = V(X0 + 0.04, SEAT + PILLOW_H + 0.017, 0.6);   // your wrist; the hand lies on the pillow, fingers toward the dog (+z)
const HAND_YAW = -Math.PI / 2;
const sole = (d) => d.point("L_Hand", [0, -0.05 * d.scale.x, 0.01]);
const PL = 0.32;                              // how high his paw is when it rests on your hand
const dogPose = (o = {}) => ({ t: 0, sit: 1, cute: 1, wag: 0, ...o });
// where the dog sits (he sinks a little into the soft seat) so that his left front paw, at PL, rests on the back of your hand
function solveSeat() {
  hand.set({ pos: HAND0, yaw: HAND_YAW }); const target = hand.top(0.055); hand.hide();
  dog.pose({ ...dogPose({ paw: PL }), x: 0, y: 0, z: 0, ry: Math.PI }); dog.updateMatrixWorld(true);
  const r = sole(dog);
  return V(target.x - r.x, target.y - r.y + 0.006, target.z - r.z);
}
const D = solveSeat();
const DY = D.y;
// the dog's eyes on the couch (measured once)
dog.pose({ ...dogPose(), x: D.x, y: DY, z: D.z, ry: Math.PI }); dog.updateMatrixWorld(true);
const eyeMid = (d) => d.eyes[0].getWorldPosition(V(0, 0, 0)).lerp(d.eyes[1].getWorldPosition(V(0, 0, 0)), 0.5);
const DE = eyeMid(dog);
const DH = V(D.x, DE.y + 0.1, DE.z + 0.08);   // the top of his head (where you pet him)
// where to put your wrist so that a point `dd` metres along your hand / arm (from the wrist; negative = up the forearm) sits under his paw
function handUnderPaw(dd, o = {}) {
  dog.pose({ ...dogPose({ paw: PL }), x: D.x, y: DY, z: D.z, ry: Math.PI }); dog.updateMatrixWorld(true);
  const s = sole(dog);
  hand.set({ pos: HAND0, yaw: HAND_YAW, ...o }); const top = hand.top(dd); hand.hide();
  return HAND0.clone().add(V(s.x - top.x, 0, s.z - top.z));
}
const HAND_WRIST = handUnderPaw(0.0), HAND_ARM = handUnderPaw(-0.12), HAND_PALM = handUnderPaw(0.05, { roll: Math.PI });
const pillow = (() => { const m = new THREE.Mesh(roundedBox(0.34, PILLOW_H, 0.42, 0.035, 3), toon(0xffd24a)); m.castShadow = m.receiveShadow = true; outline(m, { width: 0.006, min: 0.01 }); scene.add(m); return m; })();

// ---------- props: a heart, a glow behind things, pulse rings ----------
const heart3d = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0.15); sh.bezierCurveTo(0, 0.3, -0.25, 0.4, -0.35, 0.2); sh.bezierCurveTo(-0.45, -0.05, -0.15, -0.25, 0, -0.4); sh.bezierCurveTo(0.15, -0.25, 0.45, -0.05, 0.35, 0.2); sh.bezierCurveTo(0.25, 0.4, 0, 0.3, 0, 0.15);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 2, curveSegments: 18 }), toon(0xff4a7a));
  m.geometry.center(); m.castShadow = true; outline(m, { width: 0.012, min: 0.02 }); m.visible = false; scene.add(m); return m;
})();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd24a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); glow.visible = false; glow.userData.ink = false; scene.add(glow);
const ringTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"); x.strokeStyle = "rgba(255,255,255,0.95)"; x.lineWidth = 12; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// flat rings that spread over a surface (the cushion, your skin) from where the paw presses
const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xff7ab8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 6; m.userData.ink = false; scene.add(m); return m; });
function pressRings(t, p, { period = 0.9, size = 0.16, color = 0xff7ab8, on = 1 } = {}) {
  rings.forEach((r, i) => { const f = ((t / period) + i / rings.length) % 1; r.visible = on > 0.01; r.position.copy(p); r.scale.setScalar(size * (0.3 + 1.5 * f)); r.material.color.set(color); r.material.opacity = on * 0.9 * (1 - f) * (1 - f); });
}
const hideRings = () => rings.forEach((r) => (r.visible = false));

// ===================== light and mood =====================
const MOODS = {
  day: { hemi: [0xfff6e4, 0xe0c9a0, 2.3], key: [0xfff0d2, 1.5] },
  stern: { hemi: [0xffd8c0, 0xc08060, 2.1], key: [0xff9a5a, 1.7] },
  warm: { hemi: [0xfff0d8, 0xe8b890, 2.3], key: [0xffd8a0, 1.45] },
  love: { hemi: [0xffe8e0, 0xf0a8a0, 2.3], key: [0xffb880, 1.6] },
  boss: { hemi: [0xffe0d0, 0x8a4040, 2.2], key: [0xffd8a0, 1.5] },
  stage: { hemi: [0xffffff, 0xd8d0e8, 2.3], key: [0xffffff, 1.4] },
  warmstage: { hemi: [0xfff0e8, 0xf0c8c0, 2.3], key: [0xffe8d0, 1.3] },
};
const SKIES = { stage: ["#3a2a8a", "#7a4ac8", "#ff9ad0", "#6a5ae0"], warmstage: ["#ffb8c8", "#ffd8d0", "#fff0e0", "#ffd0d8"], boss: ["#3a0a2a", "#a0204a", "#ffb04a", "#8a2a3a"] };
const hemi = new THREE.HemisphereLight(0xfff6e4, 0xe0c9a0, 2.3);
const key = new THREE.DirectionalLight(0xfff0d2, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 40 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
scene.add(hemi, key, key.target);
const KEYAT = { room: [3, 4.6, 3.6, -2.5, 0.6, 1.0], stage: [3, 5, 6, 0, 0.5, 0] };

// ===================== the story: where everyone is, shot by shot (pure functions of time and shot) =====================
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const sitPose = (t, o = {}) => ({ t, sit: 1, wag: 0, headPitch: 0, headYaw: 0, headTilt: 0.1, ears: 0.15, sad: 0.15, cute: 1, closed: 0, ...o });
const onCouch = (pose, o = {}) => ({ x: D.x, y: DY, z: D.z, ry: Math.PI, pose, ...o });
// the paw lands: up high at u0, down on the hand at u1 (a soft settle after)
const land = (u, u0, u1, from = 0.55) => PL + from * (1 - ease.inOut(prog(u, u0, u1))) + 0.04 * Math.sin(Math.PI * prog(u, u1, u1 + 0.25));

function dogState(t, k) {
  const u = U(t, k), L = SL(k);
  switch (k) {
    case 1: return onCouch(sitPose(t, { headTilt: 0.14, ears: 0.25, wag: 0.5, wagSpeed: 9, paw: 0.5 * ease.inOut(prog(t, wt(3), wt(3) + 0.35)) }), { look: [0, 0.1] });
    case 2: { const s = ease.out(prog(u, 0.05, 0.3)); return onCouch(sitPose(t, { headPitch: -0.12 * s, headTilt: 0.04, ears: 0.5, squint: 0.45 * s, angry: 0.35 * s, sad: 0, paw: 0.95 * s + 0.06 * Math.sin(t * 14) * s, jawOpen: 0.25 * bump(prog(t, wt(5), wt(5) + 0.3)) }), { look: [0, 0.2] }); }
    case 3: return onCouch(sitPose(t, { headPitch: 0.25, headTilt: 0.12, ears: 0.3, paw: land(t, wt(8) - 0.15, wt(10) + 0.05) }), { look: [0, -0.8] });
    case 4: { const stop = prog(t, wt(16) + 0.05, wt(16) + 0.2), up = ease.inOut(prog(t, wt(17), wt(17) + 0.3)); return onCouch(sitPose(t, { headPitch: lerp(0.15, -0.05, up), headTilt: 0.06 + 0.1 * up, closed: 0.6 * (1 - stop), ears: lerp(-0.2, 0.5, up), sad: 0.35 * up, wag: 0.5 * (1 - stop), wagSpeed: 8 }), { look: [0.3, lerp(0, 0.5, up)] }); }
    case 5: { const pr = ease.inOut(prog(t, wt(21) - 0.05, wt(21) + 0.18)); return onCouch(sitPose(t, { headPitch: 0.25, headTilt: 0.1, ears: 0.3, sad: 0.4, paw: PL + 0.5 * (1 - ease.inOut(prog(u, 0.0, 0.25))) - 0.06 * pr, pitch: 0.05 * pr }), { look: [0, -0.6] }); }
    case 6: { const pt = ease.out(prog(t, wt(31) - 0.1, wt(31) + 0.15)); return { x: 0, y: office.SEAT, z: 0.02, ry: 0, scale: 0.72, look: [0.35, -0.05], pose: sitPose(t, { headPitch: -0.1, headYaw: 0.15 * pt, ears: 0.4, squint: 0.4, angry: 0.3, sad: 0, paw: 1.05 * pt, jawOpen: 0.35 * bump(prog(t, wt(32), wt(32) + 0.35)) + 0.3 * bump(prog(t, wt(33), wt(33) + 0.3)) }) }; }
    case 7: { const b = ease.inOut(prog(u, 0.25, 0.6)); return onCouch(sitPose(t, { beg: 0.55 * b, headTilt: 0.22 * Math.sin(t * 2.4) * b + 0.1, ears: 0.6, sad: 0.6, cute: 1, wag: 0.7, wagSpeed: 10, jawOpen: 0.15 * bump(prog(t, wt(39), wt(39) + 0.4)) }), { look: [-0.35, 0.35] }); }
    case 8: { const conf = prog(t, wt(46), wt(46) + 0.3); return { x: 0, y: 0, z: 0, ry: 0, scale: 0.8, look: [0, 0.1], pose: sitPose(t, { headTilt: 0.06 + 0.2 * conf, ears: lerp(0.5, -0.1, conf), sad: 0.45 * conf, wag: 0.8 * (1 - conf), wagSpeed: 10, jawOpen: 0.3 * prog(t, wt(43), wt(43) + 0.2) * (1 - conf) }) }; }
    case 9: { const talk = prog(t, wt(48), wt(53)) > 0 && prog(t, wt(48), wt(53)) < 1 ? Math.abs(Math.sin(t * 13)) : 0, thanks = ease.inOut(prog(t, wt(54), wt(54) + 0.3)); return { x: 0, y: 0, z: 0, ry: 0, scale: 0.8, look: [0.2, 0.1], pose: sitPose(t, { headTilt: 0.15 * thanks + 0.05, ears: 0.3, sad: 0.5 * (1 - thanks), jawOpen: 0.35 * talk, closed: 0.85 * thanks, wag: 0.8 * thanks, wagSpeed: 9 }) }; }
    case 12: return onCouch(sitPose(t, { headPitch: 0.28, headTilt: 0.1, ears: 0.2, sad: 0.2, closed: 0.3, paw: land(u, 0.0, 0.3, 0.4) - 0.05 * ease.inOut(prog(t, wt(66), wt(66) + 0.2)), pitch: 0.04 * ease.inOut(prog(t, wt(66), wt(66) + 0.2)) }), { look: [0, -0.7] });
    case 13: { const ph = Math.max(0, t - wt(71) + 0.1) * 4.6, st = Math.sin(ph); return onCouch(sitPose(t, { headPitch: 0.24, headTilt: 0.12 + 0.04 * st, ears: 0.3, sad: 0, closed: 0.45, wag: 0.6, wagSpeed: 8, paw: PL + 0.07 * Math.max(0, Math.sin(ph + 1.6)) }), { z: D.z + 0.05 * st, look: [0, -0.7] }); }
    case 14: { const tl = ease.inOut(prog(t, wt(78) - 0.1, wt(78) + 0.25)); return onCouch(sitPose(t, { headTilt: 0.1 - 0.22 * tl, ears: 0.4, sad: 0.2, wag: 0.5, wagSpeed: 8 }), { look: [0.35, 0.3] }); }
    case 15: return onCouch(sitPose(t, { headPitch: 0.24, headTilt: 0.12, ears: 0.35, closed: 0.2, wag: 0.7, wagSpeed: 9, paw: land(t, wt(82) - 0.12, wt(82) + 0.15, 0.5) }), { look: [0, -0.7] });
    case 16: { const lean = ease.inOut(prog(u, 0.05, 0.4)); return onCouch(sitPose(t, { headTilt: -0.25 * lean, headPitch: 0.05, ears: 0.1, closed: 0.9 * lean, sad: 0, wag: 0.9, wagSpeed: 10, paw: PL * lean }), { look: [0.3, 0], z: D.z - 0.06 * lean }); }
    case 17: return onCouch(sitPose(t, { headTilt: 0.14, ears: 0.25, wag: 0.5, wagSpeed: 9 }), { look: [0, 0.1] });
    default: return null;
  }
}
// you, on the couch (the 2D puppet: seen in the medium shots only; the close-ups use your 3D hand)
function ownerState(t, k) {
  const u = U(t, k);
  const seat = { x: OWN.x, z: OWN.z, sit: 1, seat: SEAT - 0.07, cute: 0.4 };
  // the arm toward the dog: x in the puppet's plane (screen right is -z here)
  const reach = (y, dz = 0) => ({ to: [-(DH.z - OWN.z) + 0.1 + dz, y], bend: 1 });
  switch (k) {
    case 4: { const stop = ease.out(prog(t, wt(16) + 0.03, wt(16) + 0.18)), stroke = Math.sin(t * 9) * (1 - stop); return { t, ...seat, lean: -0.1, eyes: { open: 1, happy: 0.5 * (1 - stop) }, mouth: { smile: 0.8 - 0.3 * stop, open: 0.1 * stop }, brow: { raise: 0.3 * stop }, look: [-0.8, 0.1], head: { tilt: -0.06 }, armL: { to: [-0.5 + 0.04 * stroke, 1.2 + 0.03 * stroke + 0.1 * stop], bend: 1 }, armR: { to: [0.2, 0.58], bend: 1 } }; }
    case 14: { const puz = ease.inOut(prog(t, wt(77), wt(77) + 0.3)); return { t, ...seat, lean: -0.04, eyes: { open: 1, size: 1 + 0.1 * puz }, mouth: { smile: 0.5 - 0.3 * puz, open: 0.15 * puz }, brow: { raise: 0.4 * puz }, look: [-0.8, 0.2], head: { tilt: 0.12 * puz }, armL: { to: [-0.32, 0.6], bend: 1 }, armR: { to: [0.2, 0.58], bend: 1 } }; }
    case 16: { const hug = ease.inOut(prog(u, 0.05, 0.45)); return { t, ...seat, lean: -0.22 * hug, eyes: { open: 1, happy: 0.9 * hug }, mouth: { open: 0.2 * hug, smile: 1, teeth: true }, brow: { raise: 0.2 }, look: [-0.6, 0.1], head: { tilt: -0.15 * hug }, armL: { to: [lerp(-0.3, -(DH.z - OWN.z) + 0.25, hug), lerp(0.6, 1.0, hug)], bend: 1 }, armR: { to: [lerp(0.2, -0.25, hug), lerp(0.58, 0.95, hug)], bend: 1 } }; }
    default: return null;
  }
}
// your hand in the close-ups
function handState(t, k) {
  const u = U(t, k);
  switch (k) {
    case 3: { const hit = prog(t, wt(10) + 0.03, wt(10) + 0.12) * (1 - prog(t, wt(10) + 0.2, wt(10) + 0.5)); return { pos: HAND0, yaw: HAND_YAW, curl: 0.2 + 0.1 * hit, squish: 0.25 * hit }; }
    case 5: { const pr = ease.inOut(prog(t, wt(21) - 0.05, wt(21) + 0.18)); return { pos: HAND_WRIST, yaw: HAND_YAW, curl: 0.25 + 0.15 * pr, squish: 0.1 * pr }; }
    case 12: { const pr = ease.inOut(prog(t, wt(66), wt(66) + 0.2)); return { pos: HAND_ARM, yaw: HAND_YAW, curl: 0.3, squish: 0.05 * pr }; }
    case 13: return { pos: HAND_ARM, yaw: HAND_YAW, curl: 0.35, spread: 0.2 };
    case 15: { const r = ease.inOut(prog(t, wt(80) + 0.05, wt(81) + 0.15)); return { pos: mixv(HAND_WRIST, HAND_PALM, r), yaw: HAND_YAW, roll: Math.PI * r, curl: lerp(0.25, 0.5, prog(t, wt(82) + 0.1, wt(82) + 0.4)), spread: 0.15 * r }; }
    default: return null;
  }
}

// ===================== cameras (each an eased move) =====================
// the hook: from your seat, just behind your eyes, looking into his
const POV = (dist, up = 0.06, side = 0.03) => V(DE.x + side, DE.y + up, DE.z - dist);
const HOOKLOOK = () => DE.clone().add(V(0, -0.1, 0));
// a camera at distance `dist` from `look`, swung `az` radians from the +x side toward +z, raised `el` radians
const orbit = (look, dist, az, el) => look.clone().add(V(Math.cos(el) * Math.cos(az) * dist, Math.sin(el) * dist, Math.cos(el) * Math.sin(az) * dist));
const HZ = (h) => V(h.x, h.y + 0.03, h.z);
function cameraAt(t, k) {
  const u = U(t, k), L = SL(k), s = clamp01(u / L), e = ease.glide(s);
  const mid = V(X0, 0.98, (HAND0.z + D.z) / 2 + 0.02);
  switch (k) {
    case 1: return { pos: POV(lerp(0.95, 0.8, e)), look: HOOKLOOK(), fov: 40 };
    case 2: { const lk = V(D.x, DE.y - 0.1, DE.z + 0.12); return { pos: orbit(lk, lerp(1.7, 1.4, e), lerp(-1.25, -1.15, e), lerp(-0.3, -0.26, e)), look: lk, fov: 46 }; }
    case 3: { const lk = V(X0 + 0.02, 1.0, HAND0.z + 0.08); return { pos: orbit(lk, lerp(1.25, 1.1, e), lerp(-1.3, -1.15, e), lerp(0.3, 0.26, e)), look: lk, fov: 42 }; }
    case 4: { const lk = V(X0, 0.95, 0.5); return { pos: orbit(lk, lerp(2.25, 2.1, e), lerp(-0.55, -0.45, e), 0.06), look: lk, fov: 46 }; }
    case 5: { const lk = V(X0 + 0.02, 0.95, HAND_WRIST.z + 0.1); return { pos: orbit(lk, lerp(1.22, 1.08, e), lerp(-0.95, -1.08, e), lerp(0.36, 0.3, e)), look: lk, fov: 42 }; }
    case 6: return { pos: P("stage", lerp(-0.1, 0.1, e), lerp(1.6, 1.5, e), lerp(4.4, 4.0, e)), look: P("stage", 0.55, 1.02, 0.5), fov: 44 };
    case 7: { const lk = V(D.x, DE.y - 0.04, DE.z + 0.05); return { pos: orbit(lk, lerp(1.6, 1.4, e), lerp(-1.0, -0.85, e), 0.08), look: lk, fov: 44 }; }
    case 8: return { pos: P("stage", lerp(0.2, 0, e), lerp(0.85, 0.82, e), lerp(2.35, 1.95, e)), look: P("stage", 0, 0.58, 0), fov: 46 };
    case 9: return { pos: P("stage", lerp(0.9, 0.75, e), lerp(0.95, 0.9, e), lerp(2.1, 1.85, e)), look: P("stage", -0.05, 0.78, 0.1), fov: 42 };
    case 10: return { pos: P("stage", lerp(-0.3, 0.3, e), lerp(1.05, 1.15, e), lerp(3.6, 3.2, e)), look: P("stage", 0, 1.0, 0), fov: 42 };
    case 11: return { pos: P("stage", lerp(0.3, 0.12, e), lerp(1.2, 1.12, e), lerp(2.1, 1.8, e)), look: P("stage", 0, 1.1, 0.2), fov: 40 };
    case 12: { const lk = V(X0 + 0.02, 0.95, HAND_ARM.z - 0.02); return { pos: orbit(lk, lerp(1.05, 0.95, e), lerp(-1.5, -1.4, e), lerp(0.2, 0.17, e)), look: lk, fov: 42 }; }
    case 13: { const lk = V(X0 + 0.02, 1.0, HAND_ARM.z + 0.04); return { pos: orbit(lk, lerp(1.2, 1.1, e), lerp(-1.12, -1.25, e), lerp(0.38, 0.33, e)), look: lk, fov: 42 }; }
    case 14: { const lk = V(X0, 0.98, 0.5); return { pos: orbit(lk, lerp(2.0, 2.15, e), lerp(-0.4, -0.5, e), 0.08), look: lk, fov: 46 }; }
    case 15: { const lk = V(X0 + 0.02, 0.98, HAND_PALM.z + 0.08); return { pos: orbit(lk, lerp(1.1, 0.98, e), lerp(-1.38, -1.28, e), lerp(0.36, 0.32, e)), look: lk, fov: 42 }; }
    case 16: { const lk = V(X0, 1.0, 0.48); return { pos: orbit(lk, lerp(1.95, 1.75, e), lerp(-0.42, -0.5, e), lerp(0.1, 0.06, e)), look: lk, fov: 46 }; }
    case 17: return { pos: POV(lerp(1.25, 0.95, ease.out(s)), lerp(0.14, 0.06, ease.out(s))), look: HOOKLOOK(), fov: 40 };   // the last frame is the first frame
    default: return { pos: POV(0.95), look: HOOKLOOK(), fov: 40 };
  }
}

// ===================== one frame of the world, for time t and shot k =====================
const outsideState = (t, k) => (SHOTS[k - 1][2] === "love" ? { light: 1, warm: 0.7, sunEl: 0.25, sunAz: 0.3, season: 1, moonEl: -1, moonAz: 0 } : { light: 1, warm: 0, sunEl: 0.9, sunAz: 0.3, season: 1, moonEl: -1, moonAz: 0 });
function apply(t, k) {
  kit.hideAll(); ic.hideAll(); hideRings();
  const [, place, mood] = SHOTS[k - 1], m = MOODS[mood], org = ORG[place];
  room.group.visible = outside.group.visible = outside.sky.visible = place === "room";
  stage.group.visible = place === "stage";
  hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
  key.color.set(m.key[0]); key.intensity = m.key[1];
  { const kk = KEYAT[place]; key.position.set(org.x + kk[0], org.y + kk[1], org.z + kk[2]); key.target.position.set(org.x + kk[3], org.y + kk[4], org.z + kk[5]); }
  if (place === "room") { outside.set({ ...outsideState(t, k), t }); scene.fog.color.copy(outside.fogColor); scene.fog.near = 45; scene.fog.far = 260; }
  else { scene.fog.near = 1e5; scene.fog.far = 2e5; stage.set(...(SKIES[mood] ?? SKIES.stage)); }
  const c = window.__cam ? { pos: V(...window.__cam.pos), look: V(...window.__cam.look), fov: window.__cam.fov ?? 50 } : cameraAt(t, k);
  camera.position.copy(c.pos); camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  // you
  const os = ownerState(t, k);
  owner.visible = !!os;
  if (os) { owner.pose({ ...os, x: org.x + os.x, z: org.z + os.z }); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  const hs = handState(t, k);
  if (hs) hand.set(hs); else hand.hide();
  pillow.visible = place === "room";
  { const w = hs?.pos ?? HAND0; pillow.position.set(w.x, SEAT + PILLOW_H / 2 - 0.004, w.z - 0.02); }
  // the dog
  const ds = dogState(t, k);
  dog.visible = !!ds;
  if (ds) { dog.scale.setScalar(ds.scale ?? DOGS); dog.pose({ ...ds.pose, closed: Math.max(ds.pose.closed ?? 0, 0.9 * blink(t)), x: org.x + ds.x, z: org.z + ds.z, ry: ds.ry, y: org.y + (ds.y ?? 0) }); dogLook(dog, ...(ds.look ?? [0, 0])); dog.updateMatrixWorld(true); }
  office.group.visible = office.tie.visible = k === 6;
  heroPaw.group.visible = k === 10 || k === 11;
  heart3d.visible = false; glow.visible = false;
  toonArms.forEach((a) => (a.sh.visible = false));
  if (place === "room") roomFx(t, k); else stageFx(t, k);
  ic.drawFx(t);
  renderer.domElement.style.filter = "saturate(1.4) contrast(1.07) brightness(1.02)";
  document.getElementById("vignette").style.opacity = "0.14";
}

// ---------- the couch: icons and effects ----------
function roomFx(t, k) {
  const u = U(t, k), L = SL(k);
  if (k === 1) showIcon("💛", DE.clone().add(V(0.22, 0.18, 0)), 0.18, popK(t, 0.15, 1.0), { bob: 0.02, t });
  if (k === 2) {
    showIcon("😤", V(D.x - 0.12, DE.y + 0.32, D.z - 0.05), 0.3, popK(t, wt(5) - 0.05, T1(2) - wt(5) + 0.1), { bob: 0.02, t });
    showIcon("👑", V(D.x, DE.y + 0.2, D.z + 0.06), 0.26, popK(t, T0(2) + 0.05, SL(2)), { t, bob: 0.01 });
  }
  if (k === 3) {
    const at = hand.top(0.055);
    pressRings(t - wt(10), at.clone().add(V(0, 0.03, 0)), { period: 0.8, size: 0.14, on: prog(t, wt(10), wt(10) + 0.05) * (1 - prog(u, L - 0.3, L)), color: 0xffd24a });
    showIcon("💛", at.clone().add(V(0, 0.22, 0.05)), 0.12, popK(t, wt(10) + 0.02, T1(3) - wt(10)), { t, bob: 0.02 });
  }
  if (k === 4) {
    showIcon("⏸️", V(OWN.x, DH.y + 0.38, (DH.z + OWN.z) / 2 + 0.2), 0.3, popK(t, wt(16) + 0.03, T1(4) - wt(16)), { t });
    showIcon("🥺", V(D.x, DE.y + 0.2, D.z + 0.32), 0.36, popK(t, wt(17) + 0.15, T1(4) - wt(17) - 0.1), { bob: 0.02, t });
  }
  if (k === 5) {
    const at = hand.top(0.0);
    pressRings(t - wt(21), at.clone().add(V(0, 0.03, 0)), { period: 0.7, size: 0.13, on: prog(t, wt(21), wt(21) + 0.05), color: 0xff7ab8 });
    showIcon("👇", at.clone().add(V(0.0, 0.26, -0.02)), 0.12, popK(t, wt(21) - 0.05, T1(5) - wt(21)), { t, bob: 0.01 });
  }
  if (k === 7) {
    showBubble("🖐️", inFront(1.3, -0.08, 0.5), 0.4, popK(t, wt(37) - 0.05, T1(7) - wt(37)));
    showIcon("➕", inFront(1.3, 0.3, 0.62), 0.22, popK(t, wt(39) - 0.05, T1(7) - wt(39)), { t, bob: 0.02 });
      }
  if (k === 12) {
    const at = hand.top(-0.13), on = prog(t, wt(66), wt(66) + 0.1);
    pressRings(t - wt(66), at.clone().add(V(0, 0.03, 0)), { period: 0.8, size: 0.15, on, color: 0xff7ab8 });
    glow.visible = on > 0.01; glow.position.copy(at).add(V(0, 0.04, 0)); glow.scale.set(0.35, 0.35, 1); glow.material.color.set(0xffb0c8); glow.material.opacity = 0.75 * on * (0.8 + 0.2 * Math.sin(t * 8));
    showIcon("✨", at.clone().add(V(0.02, 0.22, 0.05)), 0.12, popK(t, wt(69) - 0.05, T1(12) - wt(69)), { t, bob: 0.02 });
  }
  if (k === 13) {
    const at = hand.top(-0.13), ph = Math.max(0, t - wt(71) + 0.1) * 4.6;
    showIcon("🔁", at.clone().add(V(0.0, 0.3, 0.06)), 0.14, popK(t, wt(72) - 0.05, T1(13) - wt(72)), { t });
    showIcon("🥹", inFront(1.2, 0.15, -0.16), 0.2, popK(t, wt(74) - 0.1, T1(13) - wt(74) + 0.05), { t, bob: 0.02 });
    glow.visible = true; glow.position.copy(at).add(V(0, 0.05, 0)); glow.scale.set(0.3, 0.3, 1); glow.material.color.set(0xffd24a); glow.material.opacity = 0.5 + 0.2 * Math.sin(ph);
  }
  if (k === 14) {
    showBubble("▶️", V(D.x + 0.05, DE.y + 0.35, D.z + 0.1), 0.38, popK(t, wt(78) - 0.08, T1(14) - wt(78) + 0.05));
    showIcon("❌", V(D.x + 0.05, DE.y + 0.37, D.z + 0.1), 0.42, popK(t, wt(79) + 0.05, T1(14) - wt(79) - 0.05), { t });
  }
  if (k === 15) {
    const at = hand.top(0.05), on = prog(t, wt(82) + 0.12, wt(82) + 0.2);
    glow.visible = on > 0.01; glow.position.copy(at).add(V(0, 0.05, 0)); glow.scale.set(0.4, 0.4, 1); glow.material.color.set(0xffc0d8); glow.material.opacity = 0.8 * on;
    showIcon("🤝", at.clone().add(V(0.0, 0.24, 0.06)), 0.13, popK(t, wt(82) + 0.15, T1(15) - wt(82)), { t, bob: 0.01 });
  }
  if (k === 16) {
    const hp = V(D.x + 0.05, DE.y + 0.3, (D.z + OWN.z) / 2 + 0.12), on = ease.out(prog(t, wt(84) - 0.1, wt(84) + 0.15)), beat = Math.max(0, 1 - ((t * 1.6) % 1) * 4);
    heart3d.visible = on > 0.01; heart3d.position.copy(hp); heart3d.scale.setScalar(0.42 * on * (1 + 0.1 * beat)); heart3d.rotation.y = Math.PI / 2 + 0.3 * Math.sin(t * 2);
    glow.visible = true; glow.position.copy(hp); glow.scale.set(1.2, 1.2, 1); glow.material.color.set(0xff8ab8); glow.material.opacity = 0.6 * on;
  }
}
burst(wt(84), V(D.x + 0.05, DE.y + 0.25, (D.z + OWN.z) / 2 + 0.1), 10, { ch: ["💛", "💖", "✨"], spread: 0.6, rise: 0.6, size: 0.14, gap: 0.04, dur: 0.75, spin: 0.4 });
burst(wt(10) + 0.03, V(HAND0.x, HAND0.y + 0.06, HAND0.z + 0.06), 4, { ch: ["✨"], spread: 0.12, rise: 0.12, size: 0.06, gap: 0.03, dur: 0.6 });

// ---------- the stage: the boss's office, the arms, the hero paw ----------
const armRig = (a, d, on, hug) => {
  // shoulders on the dog's chest sides (the dog sits at the stage centre facing +z)
  const sc = d.scale.x, s = a.s;
  a.sh.visible = on > 0.01; a.sh.position.copy(P("stage", s * 0.16 * sc / 0.8, 0.5 * sc / 0.8, 0.26 * sc / 0.8));
  a.sh.scale.setScalar(Math.max(0.001, on) * sc / 0.8);
  a.sh.rotation.set(-1.25 * hug - 0.2, 0, s * lerp(0.55, -0.35, hug));
  a.el.rotation.set(-0.3 - 0.9 * hug, 0, s * -0.4 * hug);
};
function stageFx(t, k) {
  const u = U(t, k), L = SL(k);
  if (k === 6) {
    showIcon("💭", inFront(1.5, -0.32, 0.7), 0.3, popK(t, T0(6) + 0.02, 0.9), { t });
    showIcon("👉", P("stage", 0.38, 1.12, 0.62), 0.22, popK(t, wt(31) + 0.05, T1(6) - wt(31)), { t, bob: 0.02 });
    const ow = bossOwner(t);
    showIcon("📋", P("stage", ow.x - 0.3, 1.15, ow.z + 0.05), 0.26, popK(t, wt(32) - 0.05, T1(6) - wt(32) + 0.05), { t, bob: 0.03 });
    showIcon("☕", P("stage", ow.x + 0.32, 1.1, ow.z + 0.05), 0.26, popK(t, wt(33) - 0.05, T1(6) - wt(33) + 0.05), { t, bob: 0.03 });
    showIcon("💦", P("stage", ow.x + 0.2, 1.75, ow.z + 0.05), 0.16, popK(t, wt(31), T1(6) - wt(31)), { t, bob: 0.04 });
  }
  if (k === 8) {
    const on = ease.out(prog(t, wt(43) - 0.05, wt(43) + 0.18)) * (1 - ease.in(prog(t, wt(46) + 0.05, wt(46) + 0.2))), hug = ease.inOut(prog(t, wt(45) - 0.1, wt(45) + 0.25));
    toonArms.forEach((a) => armRig(a, dog, on, hug));
    showIcon("🤗", P("stage", 0.0, 1.42, 0.2), 0.3, popK(t, wt(45) - 0.05, wt(46) - wt(45) + 0.2), { t, bob: 0.02 });
    showIcon("❌", P("stage", 0.0, 0.62, 0.55), 0.55, popK(t, wt(46) + 0.02, T1(8) - wt(46)), { t });
  }
  if (k === 9) {
    showBubble("💬", P("stage", -0.35, 1.25, 0.3), 0.42, popK(t, wt(50) - 0.05, wt(54) - wt(50) + 0.05));
    showIcon("❌", P("stage", -0.35, 1.28, 0.32), 0.42, popK(t, wt(51) + 0.05, wt(54) - wt(51)), { t });
    showIcon("🙏", P("stage", -0.3, 1.25, 0.3), 0.3, popK(t, wt(54) - 0.02, T1(9) - wt(54) + 0.1), { t, bob: 0.02 });
    showIcon("💛", P("stage", 0.3, 1.2, 0.3), 0.2, popK(t, wt(55), T1(9) - wt(55) + 0.1), { t, bob: 0.03 });
  }
  if (k === 10 || k === 11) {
    const rise = ease.out(prog(t, T0(10), T0(10) + 0.55));
    heroPaw.group.position.copy(P("stage", 0, lerp(-0.6, 0.95, rise), 0));
    heroPaw.group.rotation.set(-0.12, 0.35 * Math.sin(t * 1.3) * (k === 10 ? 1 : 0.3), 0.06 * Math.sin(t * 2.1));
    heroPaw.group.scale.setScalar(0.8);
    const love = ease.inOut(prog(t, wt(64) - 0.05, wt(64) + 0.25));
    heroPaw.padMat.emissive.setRGB(0.55 * love, 0.08 * love, 0.25 * love);
    glow.visible = true; glow.position.copy(P("stage", 0, 1.05, -0.5)); glow.scale.set(3.2, 3.2, 1); glow.material.color.set(love > 0.5 ? 0xff8ab8 : 0xffe08a); glow.material.opacity = 0.75 * rise;
    if (k === 10) showIcon("☝️", P("stage", 0.62, 1.7, 0.2), 0.26, popK(t, wt(60) - 0.05, T1(10) - wt(60) + 0.05), { t, bob: 0.02 });
    if (k === 11) {
      const tool = popK(t, wt(62) - 0.06, wt(64) - wt(62) + 0.08);
      showIcon("🧰", P("stage", 0.38, 1.5, 0.45), 0.22, tool, { t, rot: 0.2 * Math.sin(t * 9) * tool });
      showIcon("❤️", P("stage", 0.38, 1.5, 0.45), 0.26, popK(t, wt(64) - 0.02, T1(11) - wt(64) + 0.05), { t, bob: 0.02 });
    }
  }
}
burst(wt(64), P("stage", 0, 1.15, 0.5), 8, { ch: ["💖", "✨"], spread: 0.5, rise: 0.5, size: 0.14, gap: 0.04, dur: 0.7 });
burst(wt(46) + 0.06, P("stage", 0, 0.6, 0.35), 8, { ch: ["💨", "✨"], spread: 0.35, rise: 0.3, size: 0.14, gap: 0.02, dur: 0.6 });
burst(T0(10) + 0.4, P("stage", 0, 1.3, 0.3), 6, { ch: ["✨"], spread: 0.8, rise: 0.5, size: 0.12, gap: 0.06, dur: 0.9 });

// the boss shot: you, running around with a clipboard and coffee
function bossOwner(t) {
  const k = 6, u = U(t, k), run = Math.sin(u * 3.2);
  return { t, x: 1.12 + 0.14 * run, z: 0.8 + 0.25 * Math.sin(u * 1.6), walk: 1, walkPhase: u * 14, cute: 0.5, eyes: { open: 1.1, size: 1.15 }, mouth: { open: 0.3, smile: -0.3 }, brow: { worry: 0.8 }, look: [-0.6, 0.2], head: { tilt: 0.05 * run }, flip: Math.cos(u * 3.2) > 0 ? 1 : -1, armL: { to: [-0.3, 1.25], bend: -1 }, armR: { to: [0.32, 1.15], bend: 1 } };
}

const dissolve = createDissolve({ renderer, scene, camera });
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  dissolve(t, STARTS, half, (tt, k) => {
    apply(tt, k);
    if (k === 6) { const os = bossOwner(tt); owner.visible = true; owner.pose({ ...os, x: STAGE0.x + os.x, z: STAGE0.z + os.z }); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  }, shotOf);
  captions(t);
});

// ===================== sound: real recordings only (see sfx/CREDITS.md) =====================
// A cosy couch: soft paw taps on your hand, fur strokes, little pops for every icon, a heartbeat when he presses,
// barks and running steps in the boss's office, bells for "affection" and "I love you too". Ducked under the voice.
const sfx = createSfx(short, { mix: { gain: 1.6, duck: { depth: 0.3, attack: 0.012, release: 0.25, threshold: -42 } } });
const wob = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);   // repeatable little pitch / level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
const pip = (t, i, g = 0.35, pan = 0) => snd(t, `pop_${(i % 3) + 1}`, g, { pan });
const twinkles = (t0, n, dt, g, o = {}) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `twinkle_${(i % 3) + 1}`, g * wob(i, 0.2), { pan: Math.sin(i * 1.9) * 0.4, rate: (o.rate ?? 1) * (1 + (o.climb ?? 0) * i) }); };
const beat = (t, g = 0.3) => { snd(t, "heart_1", g); snd(t + 0.2, "heart_2", g * 0.75); };
const hum = (t0, dur, g = 0.22, fi = 0.3, fo = 0.4) => snd(t0, "glow", g, { dur, fadeIn: fi, fadeOut: fo });
// 1-2 · the hook; the little boss (a snap on the cut, the crown, a huff of a bark)
hum(0.02, 1.15, 0.14, 0.2, 0.3); snd(0.25, "whimper_a", 0.12, { rate: 1.25 }); snd(wt(3) + 0.05, "pad_step", 0.18, { rate: 1.3 });
snd(T0(2), "snap_low", 0.4); pip(T0(2) + 0.05, 0, 0.3); pip(wt(5) - 0.05, 1, 0.3); snd(wt(5) + 0.02, "woof_soft", 0.3, { rate: 1.08 });
// 3 · the paw lands on your hand
snd(wt(10) + 0.03, "paw_2", 0.5); snd(wt(10) + 0.04, "thump", 0.22, { rate: 1.5 }); twinkles(wt(10) + 0.06, 2, 0.07, 0.16); pip(wt(10) + 0.05, 2, 0.25);
// 4 · petting (fur strokes), then you pause; his little whine
for (let i = 0; i < 3; i++) snd(T0(4) + 0.02 + i * 0.35, `rustle_${(i % 3) + 1}`, 0.16 * wob(i, 0.2), { rate: 1.2 });
snd(wt(16) + 0.03, "snap", 0.35); pip(wt(16) + 0.05, 0, 0.3); snd(wt(17) + 0.12, "whimper_b", 0.2, { rate: 1.2 }); pip(wt(17) + 0.15, 1, 0.22);
// 5 · he presses your wrist: a soft tap, a heartbeat
snd(wt(21) - 0.02, "paw_3", 0.5); snd(wt(21), "thump", 0.2, { rate: 1.4 }); pip(wt(21) - 0.03, 2, 0.25); beat(wt(23), 0.26);
// 6 · the boss's office: a thought pops, he barks orders, you run (steps), papers and coffee, a nervous gasp
pip(T0(6) + 0.02, 0, 0.3); snd(T0(6) + 0.05, "bell_3", 0.14, { rate: 1.3 });
snd(wt(31) - 0.05, "woof_low", 0.36, { rate: 1.1 }); pip(wt(31) + 0.05, 1, 0.3); snd(wt(33) - 0.02, "woof_soft", 0.3, { rate: 1.15 });
for (let i = 0, tt = T0(6) + 0.1; tt < T1(6) - 0.1; i++, tt += 0.19) snd(tt, "pad_step", 0.2 * wob(i, 0.2), { rate: 1.25 * wob(i, 0.04), pan: 0.3 });
snd(wt(32) - 0.05, "click_1", 0.22); pip(wt(32) - 0.05, 2, 0.25); snd(wt(33) - 0.05, "click_2", 0.2); pip(wt(33) - 0.05, 0, 0.25); snd(wt(31) + 0.05, "gasp", 0.16, { rate: 1.2 });
// 7 · asking for more: a pleading whine, the bubble, the plus
snd(T0(7) + 0.05, "snap_low", 0.3); snd(wt(37) - 0.05, "whimper_c", 0.2, { rate: 1.15 }); pip(wt(37) - 0.05, 1, 0.3); pip(wt(39) - 0.05, 2, 0.35); twinkles(wt(39), 2, 0.08, 0.15);
// 8 · arms pop out, try to hug, vanish
pip(wt(43) - 0.05, 0, 0.35, -0.3); pip(wt(43) + 0.03, 1, 0.35, 0.3); twinkles(wt(45) - 0.1, 3, 0.08, 0.16); pip(wt(45) - 0.05, 2, 0.28);
snd(wt(46) + 0.02, "snap_low", 0.45); pip(wt(46) + 0.08, 0, 0.3); snd(wt(46) + 0.1, "breath_out", 0.14, { rate: 1.4 });
// 9 · no words: he tries to talk (little huffs), a crossed-out bubble, then a soft bell for "thank you"
pip(wt(50) - 0.05, 1, 0.28); snd(wt(49), "sniffle_2", 0.16, { rate: 1.3 }); snd(wt(51) + 0.05, "snap_low", 0.38); snd(wt(54) - 0.02, "bell_2", 0.22); twinkles(wt(54) + 0.05, 3, 0.09, 0.15); snd(wt(55) + 0.05, "whimper_a", 0.12, { rate: 1.3 });
// 10-11 · the hero paw rises into the light; a toolbox becomes a heart
hum(T0(10), 2.4, 0.24, 0.3, 0.5); snd(T0(10) + 0.3, "bell_1", 0.24); twinkles(T0(10) + 0.25, 6, 0.1, 0.15, { climb: 0.03 }); pip(wt(60) - 0.05, 0, 0.3);
pip(wt(62) - 0.06, 1, 0.3); snd(wt(62) + 0.02, "click_3", 0.25); snd(wt(62) + 0.15, "click_1", 0.2);
snd(wt(64) - 0.02, "bell_3", 0.3); beat(wt(64) + 0.02, 0.3); twinkles(wt(64), 5, 0.06, 0.16, { climb: 0.02 });
// 12-13 · pressing against your skin (a warm hum, a slow heartbeat); then he pets you back (soft fur strokes)
snd(wt(66) - 0.02, "paw_4", 0.45); hum(wt(66), 1.3, 0.2, 0.2, 0.4); beat(wt(67), 0.28); pip(wt(69) - 0.05, 2, 0.25); snd(wt(69), "twinkle_2", 0.15);
for (let i = 0; i < 3; i++) snd(wt(71) - 0.1 + 0.25 + i * 0.68, `rustle_${(i % 3) + 1}`, 0.18 * wob(i, 0.2), { rate: 1.1 });
pip(wt(72) - 0.05, 0, 0.28); pip(wt(74) - 0.1, 1, 0.28); snd(wt(74) - 0.05, "breath_out", 0.16, { rate: 1.1 });
// 14 · "keep going" — a play button, crossed out
snd(T0(14), "snap", 0.3); pip(wt(78) - 0.08, 2, 0.3); snd(wt(79) + 0.05, "snap_low", 0.42); snd(T0(14) + 0.3, "creak_1", 0.1);
// 15-16 · your hand turns over; his paw rests in your palm; the hug and a heart: bells, a heartbeat, a happy whine
snd(wt(80) + 0.05, "rustle_2", 0.14, { rate: 1.2 }); snd(wt(82) + 0.14, "paw_1", 0.42); twinkles(wt(82) + 0.16, 3, 0.07, 0.15); pip(wt(82) + 0.15, 0, 0.25);
snd(wt(84) - 0.05, "bell_long", 0.32); snd(wt(84) - 0.03, "bell_1", 0.22); beat(wt(84), 0.32); twinkles(wt(84), 8, 0.06, 0.16, { climb: 0.02 }); snd(wt(85) + 0.1, "whimper_a", 0.14, { rate: 1.25 });
hum(T0(16), 1.4, 0.2, 0.2, 0.5);
// 17 · back to your seat (the loop)
snd(T0(17) + 0.05, "breath_out", 0.12, { rate: 1.3, dur: 0.4, fadeOut: 0.25 }); hum(T0(17) + 0.2, DURATION - T0(17) - 0.2, 0.12, 0.3, 0.05);

// ===================== overlays =====================
const captions = wordCaptions(document.getElementById("caption"), words, { maxChars: 20 });
document.getElementById("grain").style.opacity = "0";
window.__dbg = { scene, camera, dog, owner, hand, STARTS, DURATION, SHOTS, D, DE, PL };
short.start();
