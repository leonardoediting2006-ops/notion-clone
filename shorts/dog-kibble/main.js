import { createShort, THREE } from "../../js/engine.js";
import { outline, toonify, toon, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import { createSfx } from "../../js/sfx.js";
import { buildOutside } from "../../js/outside.js";
import { createIcons3D } from "../../js/icons3d.js";
import { pixelCaptions } from "../../js/caption-pixel.js";
import { cameraPath } from "../../js/camera-path.js";
import { createFan, createShield, createFloorArrow, createPulse } from "../../js/graphics3d.js";
import { createKit, clamp01, lerp, ease, prog, V, bump, mixv } from "../dog-gaze/kit.js";
import { buildRoom } from "./room.js";
import { buildBowl, kibbleMesh, dropY, eyeGlows } from "./props.js";
import { buildHand } from "../dog-paw/props.js";

// "Why your dog carries his food to you" — built to VIRAL_FORMULA.md:
//  * ONE world: the flat with a kitchen nook (the bowl) a few steps from the couch; every shot is a different view of it.
//  * Medium shots of what is happening; the camera never stops (hard cuts only in the 3.8 s hook and at the act changes, on a clause start).
//  * The explanation is drawn inside the world (a vision fan on the floor that collapses when he lowers his head, a red blind zone,
//    a shadow wolf in it, a glowing nervous system, the owner's golden gaze and shield dome): no emojis, one 3D heart at the very end.
//  * One-word pixel captions; a voice with no pauses; the hero returns at the end and the last frame is the first frame.
// Every state is a pure function of time, so any frame can be redrawn.

const FPS = 60;
const words = await (await fetch("words.json")).json();                    // [text, start, end] per spoken word (tightened voiceover)
const at = (i) => words[i][1];
const chunks = [...(await (await fetch("voiceover.srt")).text()).replace(/\r/g, "").split(/\n\s*\n/)].map((b) => {
  const l = b.trim().split("\n"); if (l.length < 3) return null;
  const m = l[1].match(/(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/);
  return { start: +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, end: +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000, text: l.slice(2).join(" ") };
}).filter(Boolean);
const DURATION = Math.ceil(36.435 * FPS) / FPS;

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 46, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.03; camera.far = 700; camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);
const kit = createKit({ scene, camera });
const ic = createIcons3D({ renderer, scene, camera });

// ===================== the shots (a hard cut only where the idea changes) =====================
const CUT = [0, at(6) - 0.03, at(14) - 0.03, at(40), at(49), at(99), at(105) - 0.02, at(119) - 0.02, at(145) - 0.02];   // hook 1, hook 2, you (POV), reaction, kitchen, arrival (POV), calm nerves + dome (3/4 from the room), clean rug + your hand pets him (POV), the loop
const shotOf = (t) => { let k = 1; for (let i = 1; i < CUT.length; i++) if (t >= CUT[i]) k = i + 1; return k; };
const seg = (t, a, b) => ease.inOut(prog(t, a, b));
const wob = (x) => Math.sin(x);

// ===================== the world: one flat with a kitchen nook =====================
const room = buildRoom(); scene.add(room.group);
const outside = buildOutside(); scene.add(outside.group, outside.sky);
scene.fog = new THREE.Fog(0xe9f8ff, 45, 260);
room.house.ceiling.visible = false;

const BOWL = V(0.35, 0, 0.0);               // the bowl on its mat, in front of the kitchen counter
const bowl = buildBowl(); bowl.group.position.copy(BOWL); scene.add(bowl.group);
bowl.heap.forEach((m) => { m.userData.hx = m.position.x; m.userData.hy = m.position.y; m.userData.hz = m.position.z; });   // where each piece lies in the heap
const OWN = V(-2.35, 0, 1.0);               // where you sit on the couch
const DROPM = V(-1.5, 0, 1.3);             // where his mouth is when he drops the food next to your feet

// ===================== cast =====================
const DOGS = 0.8;
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
const wolf = toonDog(DOG_COLORS.shadow, "sh", 1.0, { pointyEars: true, glowEyes: true });
const wolfEyes = eyeGlows(wolf);
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
owner.visible = false; scene.add(owner);

// your legs and shoes, for the shots where the camera is your eyes ("next to your feet")
const legs3d = (() => {
  const g = new THREE.Group(), pants = toon(0x4a5a7a), shoe = toon(0xf3efe6), sole = toon(0x2b2f3a);
  for (const dz of [-0.27, -0.07]) {
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.42, 14).rotateZ(Math.PI / 2), pants); th.position.set(OWN.x + 0.22, 0.5, OWN.z + dz); g.add(th);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), pants); knee.position.set(OWN.x + 0.43, 0.5, OWN.z + dz); g.add(knee);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 14), pants); sh.position.set(OWN.x + 0.43, 0.27, OWN.z + dz); g.add(sh);
    const ft = new THREE.Mesh(roundedBox(0.3, 0.1, 0.13, 0.04, 2), shoe); ft.position.set(OWN.x + 0.53, 0.06, OWN.z + dz); g.add(ft);
    const so = new THREE.Mesh(roundedBox(0.31, 0.03, 0.135, 0.01, 1), sole); so.position.set(OWN.x + 0.53, 0.015, OWN.z + dz); g.add(so);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.008, min: 0.02 }); g.visible = false; scene.add(g); return g;
})();

const hand = buildHand(); scene.add(hand.group);                                  // your hand, for petting him in the POV shots

// ---------- kibble: the heap in the bowl, pieces in his mouth, pieces on the floor ----------
const piece = (i) => { const m = kibbleMesh(i); scene.add(m); return m; };
const C1 = Array.from({ length: 6 }, (_, i) => piece(i)), C2 = Array.from({ length: 6 }, (_, i) => piece(i + 2));
const HKC = Array.from({ length: 5 }, (_, i) => piece(i + 1)), HKX = Array.from({ length: 8 }, (_, i) => piece(i + 3));
const slot = (i) => V(((i % 3) - 1) * 0.05, 0.07 + 0.012 * (i % 2), 0.0 + 0.035 * Math.floor(i / 2));     // where a carried piece sits in the mouth (mouth-local)
const RINGPOS = (c, i, r) => V(c.x + r * Math.cos(i * 2.2 + 0.4), 0.02, c.z + r * 0.8 * Math.sin(i * 2.2 + 0.4));
const REST = Array.from({ length: 6 }, (_, i) => RINGPOS(DROPM, i, 0.05 + 0.04 * (i % 3)));    // the little pile on the rug
REST.forEach((p) => (p.y = 0.032));

// ---------- the graphics that live in the world ----------
const fan = createFan(scene), blind = createFan(scene), ownerFan = createFan(scene), shield = createShield(scene), arrow = createFloorArrow(scene), pulse = createPulse(scene);
const nerve = kit.makeStream(170, 0xff5a3a, 0.06); nerve.pts.material.depthTest = false; nerve.pts.renderOrder = 9;   // an x-ray overlay on his spine

// ===================== calibration: where his mouth is for a given pose =====================
const mouthV = new THREE.Vector3();
function mouthRel(pose) {
  dog.scale.setScalar(DOGS); dog.pose({ ...pose, x: 0, y: 0, z: 0, ry: 0 }); dog.updateMatrixWorld(true);
  return dog.mouth.getWorldPosition(mouthV).clone();
}
function solvePitch(targetY, base) { let lo = 0, hi = 1.7; for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (mouthRel({ ...base, headPitch: m }).y > targetY) lo = m; else hi = m; } return lo; }
const EATBASE = { t: 0, cute: 1, crouch: 0.2, walk: 0 }, FLOORBASE = { t: 0, cute: 1, crouch: 0.3, walk: 0 }, DROPBASE = { t: 0, cute: 1, crouch: 0.1, walk: 0 };
const P_BOWL = solvePitch(0.205, EATBASE), P_FLOOR = solvePitch(0.06, FLOORBASE), P_DROP = solvePitch(0.34, DROPBASE);   // snout in the bowl / on the rug / a drop from a hand's height
// place the origin so that the mouth (at ry) lands on target (x, z)
function originFor(target, ry, pose) {
  const r = mouthRel(pose), c = Math.cos(ry), s = Math.sin(ry);
  return { x: target.x - (r.x * c + r.z * s), z: target.z - (-r.x * s + r.z * c) };
}

// ===================== the story =====================
const RY_E = -0.305;                                          // he stands at the bowl facing the room (a little toward the couch)
const O_E = originFor(V(BOWL.x, 0, BOWL.z), RY_E, { ...EATBASE, headPitch: P_BOWL });    // origin of the dog while he eats at the bowl
const RY_D = -1.5;                                            // facing the couch when he drops the food
const O_D = originFor(V(DROPM.x, 0, DROPM.z), RY_D, { ...DROPBASE, headPitch: P_DROP });
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const chew = (t, a = 11) => 0.2 + 0.2 * Math.abs(Math.sin(t * a));                // jaw chewing

// the hook path (also the last 0.8 s, which leads into the first frame): he trots toward the camera, his cheeks stuffed
const HD = V(-0.22, 0, 0.975).normalize(), H_SPEED = 1.25, H0 = V(0.75, 0, 0.0);
const hookPos = (u) => H0.clone().addScaledVector(HD, H_SPEED * u);
const HRY = Math.atan2(HD.x, HD.z);
// the side-track of shot 2
const S2 = { x0: 1.55, z: 0.72, v: 1.75 };

const base = (t, o = {}) => ({ t, cute: 1, walk: 0, wag: 0.3, wagSpeed: 8, ears: 0.15, sad: 0, closed: 0, ...o });
const TROT = { walk: 1, trot: 0.62, trotSpeed: 13 };

// pick-up / drop / eat times
const PICK1 = at(18) + 0.28, T3 = CUT[4], T4 = CUT[5];
const DROP1 = [7.72, 7.85, 7.98, 8.1, 8.22, 8.34];
const PICK2 = at(93) + 0.28;
const DROP2 = [25.5, 25.62, 25.74, 25.86, 25.98, 26.1];
const EAT2 = [26.85, 27.35, 27.85, 30.0, 30.7, 31.4];                  // the last piece is gone as he says "a mess"
const AMBUSH = at(77);

// the shadow wolf: prowls in from the left while he eats (the blind zone), lunges, and is gone when his head snaps up
function wolfState(t) {
  if (t < at(72) - 0.4 || t > AMBUSH + 0.75) return null;
  const a = seg(t, at(72) - 0.4, AMBUSH), lunge = seg(t, AMBUSH, AMBUSH + 0.2), fade = 1 - seg(t, AMBUSH + 0.35, AMBUSH + 0.75);
  const x = lerp(-1.8, -0.55, a) + 0.7 * lunge, scale = (0.5 + 0.5 * seg(t, at(72) - 0.4, at(72) + 0.3)) * fade;
  return { x, z: -0.55, ry: Math.PI / 2, scale: Math.max(0.01, scale), pose: { t, crouch: 1 - 0.8 * lunge, walk: a < 0.98 ? 0.3 : 0, headPitch: 0.1, ears: -0.9, angry: 1, snarl: lunge * 0.8, squint: 0.4, leap: 0.7 * lunge, cute: 0 }, glow: Math.min(1, a * 3) * fade };
}

// ---------- the dog, shot by shot ----------
function dogState(t) {
  const k = shotOf(t);
  if (k === 1 || k === 9) {                                              // the hook: trots toward the camera with a full mouth
    const u = k === 1 ? t : t - DURATION, tp = u;
    const p = hookPos(u);
    return { x: p.x, z: p.z, ry: HRY, look: [0, 0.15], pose: base(tp, { ...TROT, headPitch: 0.04, ears: 0.4, jawOpen: 0.2 + 0.1 * Math.sin(tp * 11), wag: 0.6, wagSpeed: 10 }), carry: 5, u };
  }
  if (k === 2) {                                                          // side-track across the living room
    const u = t - CUT[1]; return { x: S2.x0 - S2.v * u, z: S2.z, ry: -Math.PI / 2, look: [-0.5, 0.1], pose: base(t, { ...TROT, headPitch: 0.04, ears: 0.4, jawOpen: 0.2 + 0.1 * Math.sin(t * 11), wag: 0.6, wagSpeed: 10 }), carry: 5, u };
  }
  if (k === 3 || k === 4) {
    const jTrot0 = at(24) - 0.1, jTrot1 = DROP1[0] - 0.25;
    if (t < PICK1 - 0.25) {                                               // chewing at the bowl, then the scoop
      return { eat: { target: BOWL, key: "bowl" }, ry: RY_E, look: [0, -0.7], pose: base(t, { crouch: 0.2, headPitch: P_BOWL - 0.06 * wob(t * 9), jawOpen: chew(t, 12), ears: 0.2, wag: 0.4 }) };
    }
    if (t < jTrot0) {                                                     // lifts his head with a mouthful and looks for you
      const up = seg(t, PICK1 - 0.25, PICK1 + 0.45), turn = seg(t, PICK1 + 0.3, jTrot0);
      return { eat: up < 0.98 ? { target: BOWL, key: "bowl", lift: up } : null, x: O_E.x, z: O_E.z, ry: lerp(RY_E, -0.62, turn), look: [lerp(0, -0.5, turn), 0.1], pose: base(t, { crouch: 0.2 * (1 - up), headPitch: lerp(P_BOWL, 0.1, up), jawOpen: 0.16 * up, ears: lerp(0.2, 0.5, up), wag: 0.6 }), carry: 6 };
    }
    if (t < jTrot1) {                                                     // the trot to the couch
      const f = seg(t, jTrot0, jTrot1), turn = seg(t, jTrot1 - 0.7, jTrot1);
      return { x: lerp(O_E.x, O_D.x, f), z: lerp(O_E.z, O_D.z, f), ry: lerp(-0.62, RY_D, turn), look: [-0.4, 0.1], pose: base(t, { ...TROT, trotSpeed: 14, headPitch: 0.06, jawOpen: 0.2, ears: 0.45, wag: 0.7, wagSpeed: 10 }), carry: 6 };
    }
    const down = seg(t, jTrot1, DROP1[0] - 0.05), L = DROP1.at(-1);
    if (t < L + 0.1) return { eat: { target: DROPM, key: "drop", lift: 1 - down }, x: O_D.x, z: O_D.z, ry: RY_D, look: [-0.2, -0.5], pose: base(t, { crouch: 0.1 * down, headPitch: lerp(0.1, P_DROP, down), jawOpen: 0.2 + 0.3 * seg(t, DROP1[0] - 0.12, DROP1[0] + 0.05), ears: 0.4, wag: 0.5 }), carry: t < DROP1[0] ? 6 : 0 };
    const up = seg(t, L + 0.1, L + 0.55), sitK = seg(t, L + 0.45, L + 1.05), wait = prog(t, at(40), at(48));   // lifts his head, sits and waits for you
    return { x: O_D.x, z: O_D.z, ry: RY_D, look: [-0.35, 0.5 * sitK - 0.4 * (1 - up)], pose: base(t, { sit: sitK, crouch: 0.1 * (1 - up), headPitch: lerp(P_DROP, 0.0, up) - 0.22 * sitK, headTilt: 0.14 * sitK + 0.05 * wob(t * 2), ears: 0.55, wag: 0.8 * sitK, wagSpeed: 10, sad: 0.3 * wait }) };
  }
  if (k === 5) return dogAct2(t);
  if (k >= 6 && k <= 8) return dogAct3(t);
  return null;
}

// act 2: the kitchen, alone
function dogAct2(t) {
  const ea = at(55), tf = at(58) - 0.08, bowlDn = at(63) - 0.15, amb = AMBUSH + 0.1, sc1 = amb + 0.45;
  let pose, look = [0, 0], eat = null, ry = RY_E, carry = 0, x = O_E.x, z = O_E.z;
  if (t < ea - 0.05) pose = base(t, { headPitch: 0.05, ears: 0.2, wag: 0.3, headYaw: 0.15 * wob(t * 1.3) });                        // calm, head up
  else if (t < tf) { eat = { target: BOWL, key: "bowl" }; pose = base(t, { crouch: 0.2, headPitch: P_BOWL - 0.05 * wob(t * 9), jawOpen: chew(t, 12), ears: 0.15, wag: 0.25 }); look = [0, -0.7]; }  // "eating alone"
  else if (t < bowlDn) {                                                                                                      // "terrifying": head snaps up, he scans, trembling
    const a = seg(t, tf, tf + 0.18);
    pose = base(t, { headPitch: lerp(P_BOWL, -0.05, a), crouch: 0.2 * (1 - a), ears: -0.8, shiver: 0.7, headYaw: 0.55 * wob((t - tf) * 2.6), squint: 0, pupil: 1.25, wag: 0, sad: 0.6 });
    look = [0.6 * wob((t - tf) * 2.6), 0];
  } else if (t < amb) {                                                                                                       // lowers his snout into the bowl and keeps eating, blind to the sides
    const d = seg(t, bowlDn, bowlDn + 0.22);
    eat = d > 0.02 ? { target: BOWL, key: "bowl", lift: 1 - d } : null;
    pose = base(t, { crouch: 0.2 * d, headPitch: lerp(-0.05, P_BOWL, d) + (d > 0.9 ? -0.04 * wob(t * 10) : 0), jawOpen: d > 0.8 ? chew(t, 12) : 0, ears: -0.6, shiver: 0.35, wag: 0, sad: 0.4, headYaw: lerp(0.55 * wob((bowlDn - tf) * 2.6), 0, d) }); look = [0, -0.6];
  } else if (t < PICK2 - 0.3) {                                                                                               // snaps up at the ambush, then scans the empty kitchen
    const a = seg(t, amb, amb + 0.14), s = t - sc1;
    pose = base(t, { headPitch: lerp(P_BOWL, 0.0, a), crouch: 0.2 * (1 - a), ears: -0.9, shiver: 0.8, headYaw: s > 0 ? 0.75 * wob(s * 2.1) : -0.6 * a, wag: 0, sad: 0.7, squint: 0, pupil: 1.3, jawOpen: 0 });
    look = [s > 0 ? 0.7 * wob(s * 2.1) : -0.6, 0];
  } else if (t < at(94)) {                                                                                                    // takes a mouthful
    const d = seg(t, PICK2 - 0.3, PICK2), up = seg(t, PICK2 + 0.05, PICK2 + 0.5);
    eat = d > 0.02 && up < 0.98 ? { target: BOWL, key: "bowl", lift: up > 0 ? up : 1 - d } : null;
    pose = base(t, { crouch: 0.2 * d * (1 - up), headPitch: lerp(lerp(0.0, P_BOWL, d), 0.1, up), jawOpen: chew(t, 12) * (1 - up) + 0.16 * up, ears: lerp(-0.5, 0.45, up), shiver: 0.3 * (1 - up), sad: 0.5 * (1 - up), wag: 0.6 * up });
    carry = up > 0.4 ? 6 : 0;
  } else {                                                                                                                   // off to you
    const f = prog(t, at(94) - 0.15, T4 + 0.25), turn = seg(t, at(94) - 0.15, at(94) + 0.35);
    x = lerp(O_E.x, O_E.x - 2.2, ease.in(f)); z = lerp(O_E.z, O_E.z + 2.3, ease.in(f));
    ry = lerp(RY_E, -0.62, turn); look = [-0.4, 0.1]; carry = 6;
    pose = base(t, { ...TROT, trotSpeed: 14, headPitch: 0.06, jawOpen: 0.2, ears: 0.5, wag: 0.8, wagSpeed: 10 });
  }
  return { eat, x, z, ry, look, pose, carry };
}

// act 3: at your feet, safe
function dogAct3(t) {
  const u = t - T4, arrive = DROP2[0] - 0.4;
  const A0 = { x: 0.55, z: 1.62 };
  if (t < arrive) {                                                         // trots in toward your feet, tense
    const f = seg(t, T4 - 0.1, arrive);
    return { x: lerp(A0.x, O_D.x, f), z: lerp(A0.z, O_D.z, f), ry: lerp(-1.1, RY_D, f), look: [-0.4, 0.1], pose: base(t, { ...TROT, trotSpeed: 14, headPitch: 0.06, jawOpen: 0.2, ears: 0.1, wag: 0, shiver: 0.4, sad: 0.4 }), carry: 6 };
  }
  // the pieces he eats, in order; the mouth visits each one
  const order = EAT2.map((te, i) => ({ te, p: REST[i] }));
  const gone = EAT2.filter((te) => t > te + 0.1).length;
  let target = DROPM.clone(), eatK = 0;
  for (let i = 0; i < order.length; i++) { const a = order[i].te - 0.22, b = order[i].te; if (t >= a - 0.05) { const f = seg(t, a, b); target = i ? mixv(order[i - 1].p, order[i].p, f) : mixv(DROPM, order[0].p, f); target = target.clone(); } }
  const relax = seg(t, at(106) - 0.1, at(109) + 0.3);                      // "feels safe enough to lower its guard": the body softens
  const bite = EAT2.reduce((m, te) => Math.max(m, bump(prog(t, te - 0.25, te + 0.45))), 0);
  const lookUp = seg(t, at(104), at(104) + 0.4) * (1 - seg(t, at(106), at(106) + 0.35));
  const eating = t >= DROP2.at(-1) + 0.05;
  const petting = seg(t, at(135) - 0.1, at(135) + 0.5), bliss = seg(t, at(135) + 0.2, at(135) + 1.0);
  const lick = bump(prog(t, EAT2.at(-1) + 0.25, EAT2.at(-1) + 0.75)) * (1 - petting);
  const finish = seg(t, EAT2.at(-1) + 0.75, EAT2.at(-1) + 1.3);                   // done: he looks up at you
  const dip = EAT2.slice(3).reduce((m, te) => Math.max(m, bump(prog(t, te - 0.2, te + 0.2))), 0);
  const chewUp = seg(t, at(119) - 0.2, at(119) + 0.2) * (1 - dip);                      // second feeding: he chews with his head up between bites, so you see his face
  const dn = seg(t, DROP2[0] - 0.4, DROP2[0] - 0.05);
  const settle = seg(t, DROP2.at(-1) + 0.05, DROP2.at(-1) + 0.45);                 // after the drop he lowers his snout to the pieces
  const swallow = bump(prog(t, at(111) + 0.05, at(111) + 0.6));
  const pitchBase = eating ? lerp(P_DROP, P_FLOOR, settle) : lerp(0.06, P_DROP, dn);
  return {
    eat: eating ? { target, key: "floor", lift: Math.max(petting, finish, 0.85 * chewUp) } : { target: DROPM, key: "drop", lift: 1 - dn },
    x: O_D.x, z: O_D.z, ry: RY_D, look: [-0.25, lerp(-0.5, 0.4, Math.max(lookUp, petting, finish, chewUp))],
    pose: base(t, { crouch: eating ? 0.25 * settle * (1 - Math.max(petting * 0.8, finish, chewUp)) : 0.1 * dn, headPitch: eating ? lerp(pitchBase, -0.02, Math.max(lookUp, petting * 0.8, finish, chewUp)) + 0.07 * swallow : pitchBase, jawOpen: eating ? Math.max(bite * chew(t, 13), chewUp * 0.32 * Math.abs(Math.sin(t * 10)), lick * 0.35 * Math.abs(Math.sin(t * 9))) : 0.22 * (1 - seg(t, DROP2[0] + 0.05, DROP2[0] + 0.2)), ears: lerp(0.1, -0.05, relax) * (1 - 0.4 * petting), sad: lerp(0.4, 0.15, relax), shiver: 0.4 * (1 - relax), wag: lerp(0, 0.5, relax) + 0.4 * petting, wagSpeed: lerp(7, 10, petting), closed: 0.85 * bliss, headTilt: 0.12 * petting, tilt: 0.1 * petting }),
    carry: t < DROP2[0] ? 6 : 0, gone, bite, swallow, relax, petting,
  };
}

// ===================== you =====================
const camRight = new THREE.Vector3(), tmpV = new THREE.Vector3();
function ownerState(t) {
  const k = shotOf(t), seat = { x: OWN.x, z: OWN.z, sit: 1, seat: 0.52, cute: 0.35 };
  const sit = { t, ...seat };
  if (k === 2 && t > at(11) - 0.3) return { ...sit, eyes: { open: 0.9 }, mouth: { smile: 0.45 }, look: [0, -0.4], head: { tilt: 0.05 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.2, 0.62], bend: 1 } };
  if (k === 4) {
    const glance = seg(t, at(28) - 0.1, at(28) + 0.25), down = seg(t, DROP1[0] - 0.1, DROP1[0] + 0.3), skept = seg(t, at(40), at(42) + 0.2);
    return { ...sit, lean: 0.12 * down, eyes: { open: 1 + 0.15 * glance, size: 1 + 0.15 * glance }, mouth: { smile: lerp(0.5, 0.1, down) - 0.45 * skept, open: 0.12 * down * (1 - skept) }, brow: { raise: 0.5 * down * (1 - skept), worry: 0.3 * skept },
      look: ownerLookAt(headWorld()), head: { tilt: 0.1 * skept + 0.05 * wob(t * 1.4) }, armL: skept > 0.1 ? { to: [lerp(-0.2, 0.18, skept), lerp(0.62, 0.78, skept)], bend: -1 } : { to: [-0.2, 0.62], bend: -1 }, armR: skept > 0.1 ? { to: [lerp(0.2, -0.18, skept), lerp(0.62, 0.8, skept)], bend: 1 } : { to: [0.2, 0.62], bend: 1 } };
  }
  if (k === 7) {                                                                       // the wide shot of the dome: you sit up, watching over him
    const protect = seg(t, at(114) - 0.3, at(114) + 0.3), l = ownerLookAt(headWorld()), swallowBeat = bump(prog(t, at(111), at(111) + 0.7));
    const warm = seg(t, at(119), at(124));
    return { ...sit, lean: 0.06 * protect, eyes: { open: 1, size: 1.12, happy: 0.5 * warm }, mouth: { smile: 0.55 + 0.2 * protect + 0.25 * warm }, brow: { raise: 0.2 * protect }, look: l, head: { tilt: 0.06 }, armL: { to: [-0.2, 0.62], bend: -1 }, armR: { to: [0.3, 0.55], bend: 1 } };
  }
  return null;
}
const ownerLook = (down, skept) => [lerp(0.3, 0.1, down), lerp(0.0, -0.8, down) + 0.5 * skept];
const ownerLookAt = (p) => [Math.max(-1, Math.min(1, reachX(p) / 0.7)), Math.max(-1, Math.min(1, (1.2 - p.y) / 0.8))];   // the puppet's look: +x right, +y DOWN
function headWorld() { return dog.eyes[0].getWorldPosition(tmpV).clone().lerp(dog.eyes[1].getWorldPosition(new THREE.Vector3()), 0.5); }
function reachX(p) {                                                    // the dog's head in the owner's screen space (x to the camera's right)
  const yaw = Math.atan2(camera.position.x - OWN.x, camera.position.z - OWN.z);
  return (p.x - OWN.x) * Math.cos(yaw) - (p.z - OWN.z) * Math.sin(yaw);
}

// ===================== cameras =====================
// hook 1: ahead of him, at his height, backing away as he trots; hook 2: a track along the room; the rest are slow, continuous paths
function hookCam(u) {
  const p = hookPos(u), sway = 0.1 * Math.sin(0.8 * u + 0.6);
  const rt = V(HD.z, 0, -HD.x);
  return { pos: p.clone().addScaledVector(HD, 1.95).addScaledVector(rt, sway).add(V(0, 0.55 + 0.05 * u, 0)), look: p.clone().addScaledVector(HD, 0.75).add(V(0, 0.4, 0)), fov: 44 + 1.5 * u };
}
const JDIR = V(O_D.x - O_E.x, 0, O_D.z - O_E.z).normalize();                    // the way to the couch
const leadKey = (t, d = 2.15) => { const f = seg(t, at(24) - 0.1, DROP1[0] - 0.25), x = lerp(O_E.x, O_D.x, f), z = lerp(O_E.z, O_D.z, f); return { t, pos: [x + JDIR.x * d, 0.5, z + JDIR.z * d], look: [x + JDIR.x * 0.7, 0.36, z + JDIR.z * 0.7], fov: 44 }; };
const POV = [-2.72, 1.3, 1.16];                                                   // your eyes on the couch
const cam3 = cameraPath([
  { t: CUT[2], pos: [1.9, 0.42, 1.15], look: [0.3, 0.3, 0.05], fov: 44 },
  { t: 4.9, pos: [1.7, 0.46, 0.95], look: [0.3, 0.32, 0.0], fov: 42 },
  { t: 5.55, pos: [1.2, 0.5, 1.5], look: [0.2, 0.35, -0.1], fov: 44 },
  leadKey(5.95), leadKey(6.45),
  { t: 7.1, pos: POV, look: [-1.1, 0.3, 1.25], fov: 60 },
  { t: 7.9, pos: [-2.71, 1.29, 1.15], look: [-1.45, 0.2, 1.3], fov: 60 },
  { t: 8.7, pos: [-2.7, 1.28, 1.14], look: [-1.0, 0.55, 1.25], fov: 56 },
  { t: CUT[3], pos: [-2.69, 1.27, 1.13], look: [-0.95, 0.65, 1.25], fov: 54 },
]);
// the reaction: your skeptical face, with him sitting at your feet (a profile-to-front two-shot from the kitchen side)
const cam3b = cameraPath([
  { t: CUT[3], pos: [0.05, 1.0, 2.75], look: [-1.9, 0.95, 1.05], fov: 52 },
  { t: 10.3, pos: [-0.05, 1.02, 2.65], look: [-1.95, 0.98, 1.05], fov: 50 },
  { t: CUT[4], pos: [-0.15, 1.04, 2.55], look: [-2.0, 1.0, 1.05], fov: 48 },
]);
const cam4 = cameraPath([
  { t: CUT[3], pos: [1.8, 0.42, 1.45], look: [0.35, 0.3, 0.1], fov: 44 },
  { t: 12.6, pos: [1.65, 0.5, 1.3], look: [0.35, 0.32, 0.05], fov: 42 },
  { t: 13.6, pos: [2.6, 1.0, 2.9], look: [0.2, 0.3, -0.3], fov: 52 },
  { t: 14.0, pos: [1.5, 0.6, 1.55], look: [0.45, 0.4, -0.05], fov: 42 },
  { t: 15.2, pos: [1.6, 1.5, 1.7], look: [0.35, 0.1, -0.15], fov: 46 },
  { t: 17.0, pos: [0.9, 2.0, 1.2], look: [0.1, 0.0, -0.4], fov: 50 },
  { t: 18.4, pos: [-0.5, 1.5, 2.0], look: [-0.2, 0.15, -0.35], fov: 50 },
  { t: 19.45, pos: [1.0, 0.7, 1.4], look: [0.1, 0.25, -0.5], fov: 44 },
  { t: 20.2, pos: [1.4, 0.45, 1.25], look: [0.45, 0.4, -0.2], fov: 40 },
  { t: 22.0, pos: [0.4, 0.8, 1.9], look: [0.5, 0.35, -0.6], fov: 48 },
  { t: 23.4, pos: [1.35, 0.55, 1.55], look: [0.4, 0.3, -0.1], fov: 46 },
  { t: T4, pos: [1.6, 0.6, 1.75], look: [0.3, 0.25, -0.2], fov: 48 },
]);
// act 3: your eyes, looking down at him at your feet; one wide shot for the golden dome; your eyes again, with your hand petting him
const cam6 = cameraPath([
  { t: CUT[5], pos: [-2.6, 1.32, 1.18], look: [-1.0, 0.3, 1.5], fov: 62 },
  { t: CUT[6], pos: [-2.5, 1.18, 1.15], look: [-1.5, 0.2, 1.3], fov: 60 },
]);
const cam7 = cameraPath([
  { t: CUT[6], pos: [-0.15, 1.05, 2.75], look: [-1.8, 0.5, 1.15], fov: 56 },
  { t: 28.2, pos: [0.0, 1.2, 2.95], look: [-1.8, 0.5, 1.15], fov: 56 },
  { t: CUT[7], pos: [0.25, 1.45, 3.2], look: [-1.8, 0.45, 1.15], fov: 58 },
]);
const cam8 = cameraPath([
  { t: CUT[7], pos: [-2.72, 1.12, 1.15], look: [-1.5, 0.3, 1.28], fov: 54 },
  { t: 32.0, pos: [-2.68, 1.08, 1.15], look: [-1.5, 0.35, 1.28], fov: 54 },
  { t: 33.0, pos: [-2.6, 1.02, 1.14], look: [-1.45, 0.35, 1.27], fov: 52 },
  { t: CUT[8], pos: [-2.5, 1.06, 1.14], look: [-1.3, 0.42, 1.25], fov: 48 },
]);
const headFollow = (t) => { const k = shotOf(t); return k === 3 ? (t < DROP1[0] - 0.3 ? 0.7 : 0.55) : k === 4 ? 0.3 : k === 5 ? (t < PICK2 - 0.3 ? 0.5 : 0.1) : k === 6 ? 0.6 : k === 7 ? 0.15 : k === 8 ? 0.6 : 0; };
function cameraAt(t) {
  const k = shotOf(t);
  if (k === 1) return hookCam(t);
  if (k === 9) return hookCam(t - DURATION);
  if (k === 2) { const u = t - CUT[1], hx = S2.x0 - S2.v * u - 0.85; return { pos: V(Math.max(hx - 0.8, -1.55), 0.6 + 0.05 * u, S2.z + 1.45), look: V(Math.max(hx + 0.1, -1.55), 0.42, S2.z), fov: 46 }; }
  if (k === 3) return cam3(t);
  if (k === 4) return cam3b(t);
  if (k === 5) return cam4(t);
  if (k === 6) return cam6(t);
  if (k === 7) return cam7(t);
  return cam8(t);
}

// ===================== light and mood =====================
const MOODS = {
  day: { hemi: [0xfff6e4, 0xe0c9a0, 2.3], key: [0xfff0d2, 1.5] },
  dim: { hemi: [0x8090f0, 0x4a3a78, 1.5], key: [0xaebfff, 0.85] },
  alarm: { hemi: [0xff6a5a, 0x5a2a3a, 1.5], key: [0xff8a7a, 0.9] },
  warm: { hemi: [0xfff0d8, 0xe8b890, 2.3], key: [0xffd8a0, 1.5] },
  gold: { hemi: [0xffe9c0, 0xf0b878, 2.4], key: [0xffcf80, 1.6] },
};
const mixMood = (a, b, k) => ({ hemi: [new THREE.Color(a.hemi[0]).lerp(new THREE.Color(b.hemi[0]), k), new THREE.Color(a.hemi[1]).lerp(new THREE.Color(b.hemi[1]), k), lerp(a.hemi[2], b.hemi[2], k)], key: [new THREE.Color(a.key[0]).lerp(new THREE.Color(b.key[0]), k), lerp(a.key[1], b.key[1], k)] });
function moodAt(t) {
  let m = mixMood(MOODS.day, MOODS.dim, seg(t, at(49) + 0.1, at(52)));                       // "You see, in the animal kingdom": the room goes dim and blue
  m = mixMood({ hemi: [m.hemi[0], m.hemi[1], m.hemi[2]], key: [m.key[0], m.key[1]] }, MOODS.alarm, 0.55 * bump(prog(t, at(70), AMBUSH + 0.5)) * (0.6 + 0.4 * Math.abs(Math.sin(t * 7))));
  m = mixMood(m, MOODS.warm, seg(t, at(97), at(98) + 0.3));
  m = mixMood(m, MOODS.gold, seg(t, at(114) - 0.2, at(114) + 0.8));
  return mixMood(m, MOODS.day, seg(t, CUT[5] - 0.01, CUT[5] + 0.01));
}
const hemi = new THREE.HemisphereLight(0xfff6e4, 0xe0c9a0, 2.3);
const key = new THREE.DirectionalLight(0xfff0d2, 1.5);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 40 });
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
key.position.set(2.5, 4.6, 4.6); key.target.position.set(-1.0, 0.3, 0.6);
scene.add(hemi, key, key.target);

// ===================== one frame of the world =====================
const W0 = V(0, 0, 0), eyeA = V(0, 0, 0), eyeB = V(0, 0, 0);
function poseDog(t) {
  const st = dogState(t);
  dog.visible = !!st; if (!st) return null;
  dog.scale.setScalar(DOGS);
  let x = st.x, z = st.z;
  if (st.eat) {                                                          // the mouth is on a target: solve the origin, easing in from where he stands
    const pk = { t: 0, cute: 1, walk: 0, crouch: st.pose.crouch ?? 0, headPitch: st.pose.headPitch ?? 0 };
    const o = originFor(st.eat.target, st.ry, pk), lift = st.eat.lift ?? 0;
    x = st.x !== undefined ? lerp(o.x, st.x, lift) : o.x; z = st.z !== undefined ? lerp(o.z, st.z, lift) : o.z;
  }
  const { eat, ...rest } = st; void rest;
  dog.pose({ ...st.pose, closed: Math.max(st.pose.closed ?? 0, 0.9 * blink(st.pose.t ?? t)), x, z, y: 0, ry: st.ry });
  dogLook(dog, ...(st.look ?? [0, 0]));
  dog.updateMatrixWorld(true);
  return { ...st, x, z };
}
// where his mouth is at time t (used to launch dropped pieces)
const mouthAt = (t) => { poseDog(t); return dog.mouth.getWorldPosition(new THREE.Vector3()); };
const dogVel = (t) => { const a = poseDog(t - 0.03), ax = a?.x, az = a?.z; const b = poseDog(t + 0.03); return a && b ? V((b.x - ax) / 0.06, 0, (b.z - az) / 0.06) : V(0, 0, 0); };
const crumbs = [[0.5, 0], [0.95, 1], [1.4, 2]].concat([[2.3, 3], [2.55, 4], [2.8, 5], [3.05, 6], [3.3, 7]]).map(([tc, i]) => ({ tc, i, p0: mouthAt(tc), v: dogVel(tc) }));
const drops1 = DROP1.map((td) => ({ td, p0: mouthAt(td) })), drops2 = DROP2.map((td) => ({ td, p0: mouthAt(td) }));
// a few bowl pieces jump out when he is startled
const POP = Array.from({ length: 6 }, (_, i) => ({ i: 12 + i, vy: 2.0 + 0.4 * (i % 3), dx: 0.35 * Math.cos(i * 1.3 + 0.5), dz: 0.3 * Math.sin(i * 1.3 + 0.5) }));

function updatePieces(t, st) {
  const k = shotOf(t), tw = new THREE.Vector3();
  const carried = (arr, n) => arr.forEach((m, i) => { if (i < n) { m.visible = true; m.position.copy(dog.mouth.localToWorld(tw.copy(slot(i)))); } });
  [C1, C2, HKC, HKX].forEach((arr) => arr.forEach((m) => (m.visible = false)));
  // the bowl heap: pieces leave it when he picks them up (and a few jump out at the ambush)
  bowl.heap.forEach((m, i) => {
    let vis = true;
    if (i < 6 && t >= PICK1 && t < T3) vis = false;                         // the first mouthful
    if (i >= 6 && i < 12 && t >= PICK2 && t < CUT[8]) vis = false;           // the second mouthful (the heap is full again in the last 0.8 s, as in frame 1)
    m.visible = vis;
    const pop = i >= 12 && t >= AMBUSH + 0.1 && t < T4;                       // a few pieces jump out of the bowl when he is startled
    if (pop) {
      const pp = POP[i - 12], tau = t - AMBUSH - 0.1, f = clamp01(tau / 0.6);
      m.position.set(m.userData.hx + pp.dx * f, dropY(0.2, tau, pp.vy) + 0.03, m.userData.hz + pp.dz * f);
    } else m.position.set(m.userData.hx, m.userData.hy, m.userData.hz);
  });
  // hook: stuffed cheeks and falling crumbs
  if (k === 1 || k === 2 || k === 9) {
    carried(HKC, 5);
    for (const c of crumbs) { const tau = t - c.tc; if (tau < 0 || shotOf(c.tc) !== k) continue; const m = HKX[c.i]; m.visible = true; const drift = (1 - Math.exp(-3 * tau)) / 3; m.position.set(c.p0.x + c.v.x * 0.5 * drift, dropY(c.p0.y, tau, 0.6) + 0.02, c.p0.z + c.v.z * 0.5 * drift); }
  }
  // act 1: the mouthful travels in his mouth, falls next to your feet and settles into a little pile
  if ((k === 3 || k === 4) && t >= PICK1) {
    C1.forEach((m, i) => {
      const d = drops1[i];
      if (t < d.td) { m.visible = st?.carry ? true : t < PICK1 + 0.2 ? false : true; if (t >= PICK1 + 0.1) { m.visible = true; m.position.copy(dog.mouth.localToWorld(tw.copy(slot(i)))); } else m.visible = false; return; }
      const tau = t - d.td, f = clamp01(tau / 0.45), R = REST[i].clone();
      m.visible = true; m.position.set(lerp(d.p0.x, R.x, f), Math.max(dropY(d.p0.y, tau, 0), 0) + (tau > 0.9 ? R.y - 0.02 : 0.02) * clamp01(tau / 0.2) * 0 + (tau > 0.9 ? 0.012 : 0), lerp(d.p0.z, R.z, f));
    });
  }
  // acts 2/3: the second mouthful: in his mouth, dropped at your feet, then eaten one by one
  if ((k === 5 && t >= PICK2) || (k >= 6 && k <= 8)) {
    C2.forEach((m, i) => {
      const d = drops2[i], te = EAT2[i];
      if (t >= te + 0.15) return;
      if (t < d.td) { if (t >= PICK2 + 0.3 || k === 5) { m.visible = true; m.position.copy(dog.mouth.localToWorld(tw.copy(slot(i)))); } return; }
      const tau = t - d.td, f = clamp01(tau / 0.4), R = REST[i];
      m.visible = true;
      const grab = prog(t, te - 0.12, te + 0.1);
      m.position.set(lerp(d.p0.x, R.x, f), Math.max(dropY(d.p0.y, tau, 0), 0) + (tau > 0.9 ? 0.012 : 0), lerp(d.p0.z, R.z, f));
      if (grab > 0) { m.position.lerp(dog.mouth.getWorldPosition(tw), grab); m.scale.setScalar(Math.max(0.01, 1 - grab)); } else m.scale.set(1.15, 0.62, 1);
    });
    C2.forEach((m, i) => { if (t < drops2[i].td) m.scale.set(1.15, 0.62, 1); });
  }
}

const dogHeading = V(0, 0, 0);
function apply(t) {
  const k = shotOf(t);
  kit.hideAll(); ic.hideAll(); fan.hide(); blind.hide(); ownerFan.hide(); shield.hide(); arrow.hide(); pulse.hide();
  // light
  const m = moodAt(t);
  hemi.color.copy(m.hemi[0]); hemi.groundColor.copy(m.hemi[1]); hemi.intensity = m.hemi[2]; key.color.copy(m.key[0]); key.intensity = m.key[1];
  const dusk = seg(t, at(49) + 0.1, at(52)) * (1 - seg(t, at(97), at(98) + 0.3));
  outside.set({ light: lerp(1, 0.3, dusk), warm: 0.25 * dusk + 0.5 * seg(t, at(114), at(114) + 1), sunEl: lerp(0.9, 0.12, dusk), sunAz: 0.3, season: 1, moonEl: dusk > 0.3 ? 0.35 : -1, moonAz: 0.2, t });
  scene.fog.color.copy(outside.fogColor);
  // cast
  const st = poseDog(t);
  // camera: a continuous path; its look-target leans toward his head so he stays framed
  const c = window.__cam ? { pos: V(...window.__cam.pos), look: V(...window.__cam.look), fov: window.__cam.fov ?? 46 } : cameraAt(t);
  { const w = headFollow(t); if (w > 0 && st) c.look.lerp(headWorld(), w); }
  camera.position.copy(c.pos); camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  const ws = wolfState(t);
  wolf.visible = !!ws;
  if (ws) { wolf.scale.setScalar(ws.scale); wolf.pose({ ...ws.pose, x: ws.x, z: ws.z, y: 0, ry: ws.ry }); wolf.updateMatrixWorld(true); wolfEyes.forEach((g) => { g.material.opacity = 0.9 * ws.glow; g.visible = true; }); }
  legs3d.visible = k === 3 || k === 6 || k === 8;
  if (k === 8 && st) {
    const pet = seg(t, at(135) - 0.3, at(135) + 0.4), h = headWorld(), stroke = pet * Math.sin(t * 5.2) * 0.035;
    hand.set({ pos: V(h.x - 0.02 + stroke - 0.3 * (1 - pet), h.y + 0.2 + 0.45 * (1 - pet), h.z), yaw: 0, curl: 0.3, spread: 0.1, squish: 0.1 * pet });
    if (pet < 0.01) hand.hide();
  } else hand.hide();
  const os = ownerState(t);
  owner.visible = !!os;
  if (os) { owner.pose({ ...os, x: OWN.x, z: OWN.z }); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  updatePieces(t, st);
  graphics(t, k, st);
  captions(t);
  renderer.domElement.style.filter = "saturate(1.4) contrast(1.07) brightness(1.02)";
  document.getElementById("vignette").style.opacity = "0.14";
}

// ---------- the explanation, drawn in the world ----------
function eyeFloor() { dog.eyes[0].getWorldPosition(eyeA); dog.eyes[1].getWorldPosition(eyeB); return V((eyeA.x + eyeB.x) / 2, 0, (eyeA.z + eyeB.z) / 2); }
function graphics(t, k, st) {
  if (!st) return;
  const e = eyeFloor(), yaw = st.ry + (st.pose.headYaw ?? 0);
  if (k === 5) {
    const tf = at(58) - 0.08, bowlDn = at(63) - 0.15, amb = AMBUSH + 0.1;
    // his field of view: wide while his head is up, a narrow slit once his snout is in the bowl
    const headUp = t < at(55) - 0.05 ? 1 : t < tf ? 0 : t < bowlDn ? 1 : t < amb ? 1 - seg(t, bowlDn + 0.1, bowlDn + 0.8) : seg(t, amb, amb + 0.4);
    const appear = seg(t, tf, tf + 0.25) * (t < PICK2 - 0.3 ? 1 : 1 - seg(t, PICK2 - 0.4, PICK2 - 0.1));
    const ang = lerp(0.55, 3.9, headUp), rad = lerp(0.55, 2.3, headUp);
    const alert = t > amb && t < PICK2 - 0.3;
    fan.set({ x: e.x, z: e.z, heading: yaw, angle: ang, radius: rad, color: alert ? 0xffb020 : 0x40e070, opacity: 0.5 * appear });
    const blindOn = seg(t, at(65), at(69)) * (1 - seg(t, amb + 0.05, amb + 0.35)) + (alert ? 0.45 * appear : 0) * seg(t, amb + 0.35, amb + 0.6);
    blind.set({ x: e.x, z: e.z, heading: yaw + Math.PI, angle: Math.max(0.01, Math.PI * 2 - ang), radius: lerp(1.6, 1.3, headUp), color: 0xff2a3a, opacity: 0.45 * blindOn * appear });
    // the threat: a red arrow from the shadow wolf to him
    const ws = wolfState(t);
    if (ws) arrow.set({ from: V(ws.x - 0.1, 0, ws.z), to: V(O_E.x - 0.15, 0, ws.z + 0.05), on: seg(t, at(74), at(74) + 0.4) * (1 - seg(t, AMBUSH + 0.1, AMBUSH + 0.3)), t, width: 1.1 });
    // an alarm while he decides it is not safe
    pulse.set({ x: e.x, z: e.z, size: 1.4, color: 0xff3a3a, on: bump(prog(t, at(89), at(91) + 0.9)) * 0.95 + 0.7 * bump(prog(t, AMBUSH - 0.1, AMBUSH + 0.8)), t });
  }
  if (k >= 6 && k <= 8) {
    // his nervous system, glowing along his spine: tense and jittery on arrival, calm and flowing once he is safe
    const calm = seg(t, at(105), at(107) + 0.3), on = seg(t, T4 + 0.1, T4 + 0.5);
    const head = dog.point("Head"), neck = dog.point("Neck2"), s1 = dog.point("Spine1"), s2 = dog.point("Spine2"), pel = dog.point("Pelvis");
    const tail = V(pel.x, pel.y, pel.z).addScaledVector(V(Math.sin(st.ry), 0, Math.cos(st.ry)), -0.25);
    void s1; const path = new THREE.CatmullRomCurve3([head, neck, s2, pel, tail], false, "centripetal"); const pts = path.getSpacedPoints(60);
    kit.runStream(nerve, t, (f) => pts[Math.min(60, Math.floor(f * 60))], { speed: lerp(1.5, 0.35, calm), shown: Math.floor(170 * on * (1 - seg(t, at(119) - 0.15, at(119) + 0.2))), spread: lerp(0.09, 0.015, calm), hueFn: (f, i) => new THREE.Color().lerpColors(new THREE.Color(0xff4a2a), new THREE.Color(0x30e0c8), calm).offsetHSL(0, 0, 0.1 * Math.sin(i)) });
    // "when the protector is in the room": your gaze covers his blind zone, and a golden dome closes around the two of you
    const prot = seg(t, at(114) - 0.1, at(114) + 0.7), dome = seg(t, at(114) + 0.2, at(115) + 0.5) * (1 - seg(t, at(119) - 0.15, at(119) + 0.1));
    const hd = V(1, 0, 0), ee = eyeFloor();
    const bl = 1 - prot;
    blind.set({ x: ee.x, z: ee.z, heading: yaw + Math.PI, angle: 2.2, radius: 1.5, color: prot > 0.5 ? 0xffd24a : 0xff2a3a, opacity: 0.4 * seg(t, T4 + 0.3, T4 + 0.8) * (bl * 0.9 + 0.1 * prot) * (1 - seg(t, at(126), at(127))) });
    ownerFan.set({ x: OWN.x + 0.15, z: OWN.z, heading: Math.PI / 2, angle: 2.4, radius: 2.5, color: 0xffd24a, opacity: 0.55 * prot * (1 - seg(t, at(143), at(144))) });
    shield.set({ x: (OWN.x + O_D.x) / 2 + 0.35, y: 0, z: OWN.z + 0.15, radius: 1.35, on: dome, t });
    void hd;
    // the single icon of the video: a 3D heart when he feels safe
    const hOn = bump(prog(t, at(140) - 0.1, at(144) + 0.25));
    if (hOn > 0.01) { const hp = headWorld(); ic.showIcon("❤️", V(hp.x + 0.05, hp.y + 0.6, hp.z), 0.2, hOn, { t, bob: 0.02 }); }
  }
}

const captions = pixelCaptions(document.getElementById("caption"), chunks);
onUpdate((t) => { t = Math.min(t, DURATION - 1e-6); apply(t); });

// ===================== sound: real recordings only (see sfx/CREDITS.md), placed one by one on the picture =====================
// Paws on the wooden floor (timed to the trot cycle, so the loop's footsteps are continuous), kibble crunching and ticking on the floor, a heartbeat that
// follows his nerves (racing in the dim kitchen, slow and warm at your feet), a low growl for the shadow, bells for the gold dome and a happy whine.
const sfx = createSfx(short, { mix: { gain: 2.3, lufs: -14, duck: { depth: 0.3, attack: 0.012, release: 0.25, threshold: -42 } } });
const wobx = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);   // repeatable little pitch / level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
// a footfall whenever a leg reaches its extreme: sin(speed * t) = +-1  (the shot's own time origin `t0` is 0 for the hook, DURATION for the loop shot)
const steps = (a, b, speed, g = 0.2, t0 = 0) => { for (let n = 0, i = 0; ; n++) { const tt = t0 + (Math.PI / 2 + n * Math.PI) / speed; if (tt > b) break; if (tt >= a) snd(tt, `paw_${(i++ % 4) + 1}`, g * wobx(n, 0.15), { rate: wobx(n, 0.04), pan: n % 2 ? 0.15 : -0.15 }); } };
const chews = (a, b, g = 0.3, every = 1, w = 12) => { for (let n = 1, i = 0; ; n++) { const tt = (n * Math.PI) / w; if (tt > b) break; if (tt >= a && n % every === 0) { snd(tt, `crunch_${(i % 4) + 1}`, g * wobx(i, 0.2), { rate: wobx(i, 0.06), pan: -0.1 }); if (i % 2) snd(tt + 0.03, `chew_${(i % 2) + 1}`, g * 0.5, { pan: -0.1 }); i++; } } };
const tick = (t, i, g = 0.18) => snd(t, "tick", g * wobx(i, 0.25), { rate: 1.5 + 0.12 * (i % 4), pan: Math.sin(i * 2.3) * 0.3 });
const beats = (t0, t1, dt0, dt1, g0, g1) => { for (let tt = t0; tt < t1;) { const f = (tt - t0) / (t1 - t0), g = lerp(g0, g1, f); snd(tt, "heart_1", g); snd(tt + 0.19, "heart_2", g * 0.75); tt += lerp(dt0, dt1, f); } };
const hum = (t0, dur, g = 0.22, fi = 0.4, fo = 0.5, rate = 1) => snd(t0, "glow", g, { dur, fadeIn: fi, fadeOut: fo, rate });
const twinkles = (t0, n, dt, g, climb = 0) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `twinkle_${(i % 3) + 1}`, g * wobx(i, 0.2), { pan: Math.sin(i * 1.9) * 0.4, rate: 1 + climb * i }); };
// hook: he trots in with a full mouth, crumbs tick on the floor
steps(0.05, CUT[1] + 0.001, 13, 0.24); steps(CUT[1], CUT[2], 13, 0.24); snd(0.3, "breath_out", 0.12, { rate: 1.4 });
crumbs.forEach((c, i) => tick(c.tc + 0.3, i, 0.2));
// the bowl: he crunches, scoops a mouthful, trots to you (your eyes), drops it by your feet and sits
chews(CUT[2] + 0.05, PICK1 - 0.25, 0.3, 1); snd(PICK1 - 0.05, "rustle_1", 0.2, { rate: 1.1 }); snd(PICK1 + 0.1, "crunch_3", 0.18);
steps(at(24) - 0.1, DROP1[0] - 0.25, 14, 0.24);
DROP1.forEach((td, i) => tick(td + 0.3, i + 3, 0.24)); snd(DROP1[0] + 0.1, "breath_out", 0.16, { rate: 1.2 }); snd(DROP1.at(-1) + 0.75, "thump", 0.22, { rate: 1.3 });
for (let i = 0; i < 5; i++) snd(9.0 + i * 0.33, "thump", 0.07, { rate: 1.9 });
snd(CUT[3] + 0.25, "creak_1", 0.14, { pan: -0.3 }); snd(at(41) - 0.05, "breath_out", 0.12, { rate: 0.9 });
// the kitchen at dusk: a low hum, a slow heart that speeds up, the startle, the growl of the shadow, the scatter of kibble
hum(CUT[4] + 0.05, 6.4, 0.2, 0.9, 0.6, 0.8);
chews(at(55) + 0.05, at(58) - 0.1, 0.22, 2); beats(at(52), at(58), 0.9, 0.7, 0.16, 0.2);
snd(at(58) - 0.08, "gasp", 0.24, { rate: 1.2 }); snd(at(58) - 0.05, "thump", 0.2, { rate: 0.8 }); beats(at(58) + 0.3, at(63), 0.55, 0.45, 0.24, 0.28);
chews(at(63) + 0.1, AMBUSH - 0.5, 0.16, 2); snd(at(65), "bell_long", 0.28, { rate: 0.55 }); beats(at(63) + 0.3, AMBUSH, 0.45, 0.32, 0.3, 0.4);
for (let tt = at(72) - 0.2, i = 0; tt < AMBUSH; tt += 0.34, i++) snd(tt, "pad_step", 0.12, { rate: 0.7, pan: lerp(-0.6, 0.0, i / 6) });
snd(at(72) + 0.1, "growl", 0.32, { rate: 0.7, pan: -0.5 }); snd(at(74), "growl", 0.34, { rate: 0.6, pan: -0.3 }); snd(AMBUSH, "snap_low", 0.5); snd(AMBUSH + 0.02, "thump", 0.4, { rate: 0.7 });
snd(AMBUSH + 0.12, "gasp", 0.3, { rate: 1.1 }); snd(AMBUSH + 0.15, "whimper_b", 0.2, { rate: 1.3 });
POP.forEach((pp, i) => { tick(AMBUSH + 0.3 + 0.18 * i, i + 9, 0.2); tick(AMBUSH + 0.75 + 0.2 * i, i + 20, 0.12); });
beats(AMBUSH + 0.3, at(88), 0.4, 0.5, 0.34, 0.26); for (let i = 0; i < 4; i++) snd(AMBUSH + 0.6 + i * 0.5, "sniffle_1", 0.1, { rate: 1.2, pan: i % 2 ? 0.3 : -0.3 });
snd(at(89), "bell_3", 0.3, { rate: 0.7 }); snd(at(89) + 0.3, "bell_3", 0.26, { rate: 0.7 });
snd(PICK2 - 0.2, "crunch_2", 0.22); snd(PICK2 + 0.05, "rustle_2", 0.2); chews(PICK2 - 0.3, PICK2 + 0.3, 0.2, 1); steps(at(94) + 0.15, T4, 14, 0.16);
// at your feet: he arrives tense, drops the food, then eats while the heartbeat slows; a swallow; the dome chimes
steps(T4 - 0.1, DROP2[0] - 0.4, 14, 0.24); beats(T4 + 0.1, at(106), 0.5, 0.65, 0.28, 0.24); beats(at(106), at(114), 0.7, 0.95, 0.22, 0.16);
DROP2.forEach((td, i) => tick(td + 0.3, i + 30, 0.22)); snd(DROP2[0] + 0.05, "breath_out", 0.14, { rate: 1.2 });
EAT2.forEach((te, i) => { snd(te - 0.02, `crunch_${(i % 4) + 1}`, 0.34, { rate: 1.0 + 0.04 * i }); snd(te + 0.12, `chew_${(i % 2) + 1}`, 0.24); snd(te + 0.34, `crunch_${((i + 2) % 4) + 1}`, 0.2); });
snd(at(111) + 0.12, "gulp_1", 0.4); snd(at(111) + 0.2, "thump", 0.12, { rate: 0.9 });
hum(at(112) - 0.2, 2.0, 0.26, 0.6, 0.7, 1.05); snd(at(114) - 0.05, "bell_1", 0.3); twinkles(at(114) + 0.25, 7, 0.17, 0.16, 0.025); snd(at(115) + 0.3, "bell_2", 0.24);
snd(EAT2.at(-1) + 0.55, "gulp_2", 0.3, { rate: 1.3 }); snd(EAT2.at(-1) + 0.8, "gulp_2", 0.22, { rate: 1.5 }); snd(EAT2.at(-1) + 1.1, "breath_out", 0.16, { rate: 1.1 });
// your hand arrives and pets him; his tail thumps; the heart; a happy whine
snd(at(134) - 0.1, "rustle_2", 0.2, { rate: 0.9 }); for (let n = 0; n < 4; n++) snd(at(135) + 0.2 + n * 1.2 * 0.5, `rustle_${(n % 3) + 1}`, 0.14 * wobx(n, 0.2), { rate: 1.1 });
for (let tt = at(135) + 0.1, i = 0; tt < CUT[8] - 0.1; tt += 0.31, i++) snd(tt, "thump", 0.07 * wobx(i, 0.3), { rate: 1.8 });
snd(at(135) + 0.5, "breath_out", 0.2, { rate: 0.85 }); hum(at(132), 3.3, 0.18, 0.8, 0.8, 1.1);
twinkles(at(140), 6, 0.12, 0.17, 0.02); snd(at(140) + 0.05, "bell_2", 0.3); snd(at(142) + 0.2, "bell_1", 0.26); snd(at(142) + 0.35, "bell_3", 0.22); snd(at(143) + 0.2, "whimper_a", 0.16, { rate: 1.25 });
// the loop: trotting back in with a full mouth (the footfalls carry on into the first frame)
for (let n = 0, i = 0; ; n++) { const tt = DURATION - (Math.PI / 2 + n * Math.PI) / 13; if (tt < CUT[8]) break; snd(tt, `paw_${(i++ % 4) + 1}`, 0.24 * wobx(n, 0.15), { rate: wobx(n, 0.04), pan: n % 2 ? 0.15 : -0.15 }); }

document.getElementById("grain").style.opacity = "0";
window.__dbg = { scene, camera, dog, owner, wolf, DURATION, CUT, at, words, apply, P_BOWL, P_FLOOR, P_DROP, O_E, O_D, BOWL, OWN, DROPM, ownerLookAt, headWorld };
short.start();
