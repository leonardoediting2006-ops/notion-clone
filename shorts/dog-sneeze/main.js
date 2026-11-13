import { createShort, THREE } from "../../js/engine.js";
import { outline, toonify, toon, roundedBox } from "../../js/toon.js";
import { createPuppet } from "../../js/puppet.js";
import { heroDog } from "../../js/herodog.js";
import { DOG_COLORS } from "../../js/dog.js";
import { createSfx } from "../../js/sfx.js";
import { buildOutside } from "../../js/outside.js";
import { createIcons3D } from "../../js/icons3d.js";
import { pixelCaptions } from "../../js/caption-pixel.js";
import { createFan, createPulse } from "../../js/graphics3d.js";
import { createKit, clamp01, lerp, ease, prog, V, bump } from "../dog-gaze/kit.js";
import { buildRoom } from "../dog-kibble/room.js";
import { buildGarden, buildPark, buildMeadow } from "./outdoors.js";
import { buildBedroom, buildHallway } from "./indoors.js";
import { createSpray, createMotes, createPuffs, createBeam, createSightline, createLens } from "./fx.js";

// "Why your dog fake-sneezes when you play": 14 hard cuts through 10 different places (garden, living room, bedroom, flowerbed, kitchen,
// hallway, park, front yard, vegetable patch, sunset meadow). The owner asked for many detailed environments, so the formula's "one world"
// rule is deliberately broken; the rest holds: medium shots, a camera that never rests, the explanation drawn in the world (colour code:
// green = friendly, red = tension), no emoji (one 3D heart), one-word captions, a loop (the last frame is the first frame).
// Every state is a pure function of time, so any frame can be redrawn.

const FPS = 60;
const words = await (await fetch("words.json")).json();                    // [text, start, end] per spoken word (tightened voiceover)
const at = (i) => words[i][1];
const chunks = [...(await (await fetch("voiceover.srt")).text()).replace(/\r/g, "").split(/\n\s*\n/)].map((b) => {
  const l = b.trim().split("\n"); if (l.length < 3) return null;
  const m = l[1].match(/(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/);
  return { start: +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000, end: +m[5] * 3600 + +m[6] * 60 + +m[7] + +m[8] / 1000, text: l.slice(2).join(" ") };
}).filter(Boolean);
const DURATION = Math.ceil(22.18 * FPS) / FPS;

const short = createShort({ duration: DURATION, fps: FPS, background: "#bfe6ff", fov: 46, lights: false });
const { scene, camera, renderer, onUpdate } = short;
camera.near = 0.03; camera.far = 700; camera.updateProjectionMatrix();
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(camera);
const kit = createKit({ scene, camera });
const ic = createIcons3D({ renderer, scene, camera });

// ===================== the shots: a hard cut on the first word of each clause =====================
//  1 hook (garden lawn) 2 dust (living room) 3 wrestling (bedroom) 4 sneeze in your face (bed POV) 5 allergies (flowerbed) 6 not involuntary (kitchen)
//  7 disclaimer (hallway) 8 roughhousing (park) 9 snapping jaws (park) 10 fake sneeze breaks the tension (park) 11 pausing mid-game (front yard)
//  12 not angry (vegetable patch) 13 happy (sunset meadow) 14 the loop (garden lawn, the hook's path)
const CUT = [0, at(5) - 0.03, at(11) - 0.03, at(18) - 0.03, at(25) - 0.03, at(31) - 0.03, at(37) - 0.03, at(40) - 0.03, at(45) - 0.03, at(48) - 0.03, at(58) - 0.03, at(68) - 0.03, at(72) - 0.03, at(78) - 0.03];
const shotOf = (t) => { let k = 1; for (let i = 1; i < CUT.length; i++) if (t >= CUT[i]) k = i + 1; return k; };
const seg = (t, a, b) => ease.inOut(prog(t, a, b));
const smooth = (u) => u * u * (3 - 2 * u);

// ===================== the world: the flat + the outside of dog-kibble, and our own places far away on the same grass =====================
const room = buildRoom(); scene.add(room.group); room.house.ceiling.visible = false;
const outside = buildOutside(); scene.add(outside.group, outside.sky);
scene.fog = new THREE.Fog(0xe9f8ff, 45, 260);
const O = { garden: V(0, 0, -40), park: V(70, 0, 0), meadow: V(-70, 0, 0), bed: V(-40, 0, -90), hall: V(-40, 0, -110) };
const garden = buildGarden(), park = buildPark(), meadow = buildMeadow(), bedroom = buildBedroom(), hall = buildHallway();
garden.group.position.copy(O.garden); park.group.position.copy(O.park); meadow.group.position.copy(O.meadow); bedroom.group.position.copy(O.bed); hall.group.position.copy(O.hall);
scene.add(garden.group, park.group, meadow.group, bedroom.group, hall.group);
const SETS = { flat: room.group, garden: garden.group, park: park.group, meadow: meadow.group, bed: bedroom.group, hall: hall.group };
const SHOT_SET = [null, "garden", "flat", "bed", "bed", "garden", "flat", "hall", "park", "park", "park", "outside", "garden", "meadow", "garden"];
const showSet = (k) => { for (const [n, g] of Object.entries(SETS)) g.visible = n === SHOT_SET[k]; };
const P = (o, x, y, z) => V(o.x + x, y, o.z + z);                                    // a point of a set, in world coordinates

// ===================== cast =====================
const DOGS = 0.65;
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
const hero = toonDog(DOG_COLORS.golden, "g", DOGS);
const pal = toonDog({ body: 0x4a3226, light: 0xe6c08c, dark: 0x241610 }, "pal", DOGS * 0.95);                  // the friend he wrestles in the park
const owner = createPuppet({ skin: "#f1c7a0", hair: "#5b3a22", hairStyle: "short", shirt: "#3f8fe0", pants: "#4a5a7a", shoes: "#f3efe6", seed: 1 });
owner.visible = false; scene.add(owner);
const blink = (t) => Math.max(0, 1 - Math.abs(((t + 0.4) % 3.1) - 1.5) / 0.07);
const base = (t, o = {}) => ({ t, cute: 1, walk: 0, wag: 0.5, wagSpeed: 9, ears: 0.2, sad: 0, closed: 0, ...o });   // one tail speed for the whole video
function setDog(d, st, scale = 1) {
  d.visible = true; d.scale.setScalar((d === pal ? DOGS * 0.95 : DOGS) * scale);
  d.pose({ ...st.pose, closed: Math.max(st.pose.closed ?? 0, 0.9 * blink(st.pose.t ?? 0)), x: st.x, y: st.y ?? 0, z: st.z, ry: st.ry });
  dogLook(d, ...(st.look ?? [0, 0]));
  d.updateMatrixWorld(true);
}
const faceV = (ry) => V(Math.sin(ry), 0, Math.cos(ry));

// small props: a rope toy, a sock, a tennis ball
const rope = (() => { const g = new THREE.Group(); const cols = [0xe5566d, 0xfff2dc, 0x3f8fe0]; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.07, 10).rotateZ(Math.PI / 2), toon(cols[i % 3])); m.position.x = -0.14 + i * 0.07; g.add(m); } for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon(cols[s > 0 ? 0 : 2])); k.position.x = s * 0.19; g.add(k); } g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.006, min: 0.01 }); g.visible = false; scene.add(g); return g; })();
const sock = (() => { const g = new THREE.Group(); const m = new THREE.Mesh(roundedBox(0.26, 0.07, 0.1, 0.03, 2), toon(0xffffff)); g.add(m); const h = new THREE.Mesh(roundedBox(0.09, 0.07, 0.1, 0.03, 2), toon(0xe5566d)); h.position.x = 0.14; g.add(h); const t = new THREE.Mesh(roundedBox(0.1, 0.09, 0.1, 0.03, 2), toon(0xe5566d)); t.position.set(-0.17, -0.01, 0); g.add(t); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.006, min: 0.01 }); g.visible = false; scene.add(g); return g; })();
const ball = (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), toon(0xd7f03a)); m.castShadow = true; outline(m, { width: 0.006, min: 0.01 }); m.visible = false; scene.add(m); return m; })();
const stool = (() => { const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 18), toon(0xe0a766)); top.position.y = 0.46; g.add(top); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78, l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 6), toon(0xb98a58)); l.position.set(Math.cos(a) * 0.15, 0.23, Math.sin(a) * 0.15); g.add(l); } g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); outline(g, { width: 0.008, min: 0.02 }); g.visible = false; scene.add(g); return g; })();

// ===================== the story: where everyone is, shot by shot (pure functions of time) =====================
const wob = Math.sin;
// ---- a sneeze: the head goes back, snaps forward, the whole head shakes. ts = the instant of the snap, amp = how big ----
function sneeze(t, ts, amp = 1) {
  const u = t - ts;
  const wind = ease.inOut(prog(u, -0.32, -0.05)) * (1 - prog(u, -0.05, 0.0));
  const snap = ease.out(prog(u, -0.02, 0.07)) * (1 - ease.inOut(prog(u, 0.14, 0.62)));
  const sh = u > 0.1 ? Math.exp(-5 * (u - 0.1)) * Math.sin(34 * (u - 0.1)) : 0;
  return { headPitch: amp * (-0.42 * wind + 0.62 * snap), headYaw: amp * 0.34 * sh, jawOpen: amp * (0.25 * wind + 0.35 * snap), closed: Math.min(1, amp * (0.75 * wind + 1.2 * snap)), crouch: amp * 0.3 * snap, ears: -0.8 * amp * snap, squint: 0.4 * amp * snap, lunge: amp * 0.1 * snap * (1 - prog(u, 0.1, 0.45)) };
}
const addP = (p, s) => ({ ...p, headPitch: (p.headPitch ?? 0) + s.headPitch, headYaw: (p.headYaw ?? 0) + s.headYaw, jawOpen: Math.max(p.jawOpen ?? 0, s.jawOpen), closed: Math.max(p.closed ?? 0, s.closed), crouch: (p.crouch ?? 0) + s.crouch, ears: Math.min(p.ears ?? 0, (p.ears ?? 0) + s.ears), squint: Math.max(p.squint ?? 0, s.squint) });

// ---------- 1 + 14: the hook, a gallop at the camera across the lawn, the sneeze, the loop ----------
const HK = { z0: -3.4, v: 2.55, s0: 1.12, s1: 1.5, snap: 1.47 };
function hookDog(u) {
  const w = prog(u, HK.s0, HK.s1);
  const z = u < HK.s0 ? HK.z0 + HK.v * u : HK.z0 + HK.v * HK.s0 + HK.v * (HK.s1 - HK.s0) * (w - w ** 3 + w ** 4 / 2);
  const run = 1 - smooth(prog(u, HK.s0 - 0.05, HK.s1)), bound = Math.max(0, Math.sin(u * 2.6 * 6.2832)) * run;
  const sn = sneeze(u, HK.snap, 1), x = 0.12 * wob(u * 3.2) * run;
  const pose = addP(base(u, { run, leap: 0.6 * bound, lift: 0.1 * bound, headPitch: 0.05 + 0.04 * wob(u * 16) * run, jawOpen: 0.32 * run, ears: 0.5, wag: 1, crouch: 0.35 * (1 - run) * smooth(prog(u, HK.s0, HK.s1)), cute: 1 }), sn);
  return { x, z: z + sn.lunge, ry: 0.1 * wob(u * 3.2) * run, pose, look: [0.2 * wob(u * 2), 0.15], u };
}
function hookCam(u) {
  const d = hookDog(u), dist = lerp(2.2, 1.95, ease.inOut(prog(u, 0, 1.6))), az = lerp(0.3, -0.2, ease.inOut(prog(u, -0.9, 1.8)));
  const pos = P(O.garden, d.x + Math.sin(az) * dist, lerp(0.5, 0.62, prog(u, -0.9, 1.8)), d.z + Math.cos(az) * dist);
  return { pos, look: P(O.garden, d.x * 0.6, 0.34, d.z - 0.1), fov: lerp(50, 45, ease.inOut(prog(u, -0.9, 1.8))) };
}

// ---------- 2: the living room: a cushion is thumped, dust rises into the sunbeam, he runs through it and jumps on the couch ----------
const OWN = V(-2.35, 0, 1.0), CUSH = V(-2.55, 0.6, 1.8);
function shot2(t) {
  const u = t - CUT[1];
  const run = prog(u, 0, 0.9), x = u < 0.9 ? lerp(0.9, -1.75, run) : 0, jump = prog(u, 0.9, 1.3);
  let dx = x, dy = 0, dz = 1.5, ry = -Math.PI / 2, pose;
  if (u < 0.9) pose = base(u, { run: 1, leap: 0.5 * Math.max(0, wob(u * 16)), lift: 0.06 * Math.max(0, wob(u * 16)), headPitch: 0.04, jawOpen: 0.3, ears: 0.5, wag: 1 });
  else { const s = ease.inOut(jump); dx = lerp(-1.75, -2.55, jump); dz = lerp(1.5, 1.8, s); dy = lerp(0, 0.55, s) + 0.34 * wob(Math.PI * jump); pose = base(u, { leap: 0.9 * wob(Math.PI * Math.min(1, jump * 1.1)) + 0.0, headPitch: -0.05, jawOpen: 0.3, ears: 0.6, wag: 1, run: 0.0 }); }
  const cx = u < 0.9 ? 1.45 - 2.94 * u : (() => { const q = (u - 0.9) / 0.4; return (2 * q ** 3 - 3 * q ** 2 + 1) * -1.2 + (q ** 3 - 2 * q ** 2 + q) * 0.4 * -2.94 + (-2 * q ** 3 + 3 * q ** 2) * -1.55; })(), cz = -0.9;
  const raise = seg(u, 0.0, 0.18), slam = seg(u, 0.18, 0.3);
  return { cam: { pos: V(cx, lerp(0.7, 0.82, prog(u, 0, 1.3)), cz), look: V(dx - 0.25, 0.45 + 0.2 * Math.sin(Math.PI * jump), 1.5), fov: 58 },
    dog: { x: dx, y: dy, z: dz, ry, pose, look: [-0.5, 0.1] }, rope: u < 0.9,
    owner: { x: OWN.x, z: OWN.z, pose: { t, sit: 1, seat: 0.46, look: [0.4, 0.2], eyes: { happy: 0.4 }, mouth: { open: 0.5, smile: 0.9 }, armR: { a: lerp(lerp(0.15, 2.5, raise), 0.5, slam), e: 0.3 }, armL: { a: -0.1, e: 0 } } },
    whack: 0.3, land: 1.3, u };
}

// ---------- 3: the bedroom: he pounces on you, you tip over laughing, he steals your sock ----------
const BR = { P: V(0.8, 0.45, -0.4) };
function shot3(t) {
  const u = t - CUT[2], R = 2.6, az = lerp(-1.0, -0.25, ease.inOut(prog(u, 0, 1.73)));
  const come = prog(u, 0, 0.52), up = seg(u, 0.4, 0.62) * (1 - seg(u, 1.05, 1.28)), tug = seg(u, 1.1, 1.5);
  const x = lerp(2.0, 1.05, ease.out(come)), z = lerp(-1.1, -0.1, ease.inOut(come)) + 0.2 * tug, ry = lerp(-1.9, -Math.PI / 2, ease.inOut(come)) + lerp(0, 0.8, tug);
  const pose = base(u, { run: come < 1 ? 1 - come * 0.6 : 0, beg: 0.85 * up, headPitch: lerp(0.0, 0.6, tug) + 0.1 * wob(u * 11) * up, headYaw: 0.32 * wob(u * 9) * up + 0.55 * wob(u * 15) * tug, jawOpen: 0.5 + 0.2 * wob(u * 13), ears: 0.4, wag: 1, lift: 0.08 * Math.max(0, wob(u * 14)) * (1 - up) * (come < 1 ? 1 : 0) });
  const fall = seg(u, 0.5, 0.95) * (1 - seg(u, 1.2, 1.6));
  return { cam: { pos: P(O.bed, BR.P.x + Math.sin(az) * R, 0.62 + 0.08 * wob(u * 1.2), BR.P.z + Math.cos(az) * R), look: P(O.bed, BR.P.x, BR.P.y + 0.1, BR.P.z), fov: 54 },
    dog: { x: O.bed.x + x, z: O.bed.z + z, y: 0, ry, pose, look: [0, 0.2] },
    owner: { x: O.bed.x + 0.55, z: O.bed.z - 0.15, pose: { t, sit: 1, seat: 0.14, lean: -0.7 * fall, look: [0.3, -0.2], eyes: { happy: 0.7 }, mouth: { open: 0.8, smile: 1 }, armR: { a: lerp(0.4, 2.2, up), e: 0.2 }, armL: { a: lerp(-0.4, -2.0, up), e: 0.2 } } },
    sock: tug > 0.01, u };
}

// ---------- 4: you lie on the bed (your eyes): he freezes over you, winds up, and sneezes into the lens ----------
const SNEEZE4 = at(20) + 0.14;
function shot4(t) {
  const u = t - CUT[3], sn = sneeze(t, SNEEZE4, 1), settle = seg(t, at(18), at(18) + 0.3);
  const push = ease.inOut(prog(u, 0, 1.85));
  return { cam: { pos: P(O.bed, -0.9, lerp(0.86, 0.9, push), lerp(-1.96, -1.86, push)), look: P(O.bed, -0.9, 0.98, -0.35), fov: 50 },
    dog: { x: O.bed.x - 0.9, z: O.bed.z - 0.35 - sn.lunge * 1.0, y: 0.68, ry: Math.PI + 0.12 * wob(u * 2) * (1 - settle), pose: addP(base(t, { bow: 0.0, beg: 0.0, headPitch: -0.05 - 0.05 * settle, headTilt: 0.25 * settle, jawOpen: 0.25, ears: 0.55, wag: 1, lift: 0.05 * Math.max(0, wob(u * 12)) * (1 - settle) }), sn), look: [0, -0.2] } };
}

// ---------- 5: the garden flowerbed: you rub your nose in the pollen, he sits beside you looking innocent ----------
function shot5(t) {
  const u = t - CUT[4], az = lerp(-0.55, 0.15, ease.inOut(prog(u, 0, 1.62))), R = lerp(3.1, 2.55, ease.inOut(prog(u, 0, 1.62)));
  const C = V(7.45, 0.85, -3.1);
  const rub = seg(u, 0.1, 0.4) * (1 - seg(u, 1.1, 1.4)), shrug = bump(prog(u, 1.15, 1.6));
  return { cam: { pos: P(O.garden, C.x + Math.sin(az) * R, 0.9, C.z + Math.cos(az) * R), look: P(O.garden, C.x + 0.1, C.y, C.z), fov: 52 },
    dog: { x: O.garden.x + 7.8, z: O.garden.z - 2.7, y: 0, ry: 0.25 + 0.1 * wob(u * 1.4), pose: base(u, { sit: 1, headPitch: -0.12, headTilt: 0.18 + 0.05 * wob(u * 3), ears: 0.5, wag: 0.8, jawOpen: 0.12 }), look: [-0.4, 0.3] },
    owner: { x: O.garden.x + 7.1, z: O.garden.z - 3.0, pose: { t, look: [0.2, 0.3], eyes: { open: 0.55 }, mouth: { open: 0.1, smile: 0.1 }, brow: { worry: 0.4 }, armR: { a: lerp(0.1, 2.5, rub) - 0.3 * shrug, e: lerp(0, 1.9, rub) }, armL: { a: -0.12 - 0.3 * shrug, e: 0.1 }, head: { tilt: 0.12 * rub } } },
    pollen: true, u };
}

// ---------- 6: the kitchen: he looks up at you, performs a neat little sneeze, and peeks to see if you noticed ----------
const SNEEZE6 = at(34) + 0.1;
function shot6(t) {
  const u = t - CUT[5], sn = sneeze(t, SNEEZE6, 0.7), up = seg(u, 0.05, 0.4), glance = seg(t, SNEEZE6 + 0.3, SNEEZE6 + 0.55);
  const push = ease.inOut(prog(u, 0, 2.07));
  return { cam: { pos: V(lerp(0.7, 1.1, push), lerp(0.85, 0.78, push), lerp(3.0, 2.5, push)), look: V(lerp(1.15, 1.2, push), 0.78, -0.3), fov: 58 },
    dog: { x: 1.0, z: -0.25, y: 0, ry: Math.PI / 2 + 0.2, pose: addP(base(t, { sit: 1, headPitch: lerp(0, -0.5, up) + 0.18 * glance, headTilt: 0.15 * glance, ears: 0.5, wag: 0.9, jawOpen: 0.1 }), sn), look: [lerp(0.4, 0.9, glance), lerp(0, 0.8, up)] },
    owner: { x: 1.55, z: -0.45, pose: { t, sit: 1, seat: 0.46, look: [-0.5, -0.5], eyes: { happy: 0.3 }, mouth: { open: 0, smile: 0.7 }, armR: { a: 0.1, e: 0.2 }, armL: { a: -0.1, e: 0 } } },
    stool: V(1.55, 0, -0.45), gaze: seg(t, SNEEZE6 + 0.28, SNEEZE6 + 0.5) * (1 - seg(t, at(36) + 0.2, at(36) + 0.5)), sneezeT: SNEEZE6, u };
}

// ---------- 7: the hallway: he play-bows at the lens, green rings spread over the floor ----------
function shot7(t) {
  const u = t - CUT[6], push = ease.inOut(prog(u, 0, 0.77)), bw = seg(u, 0.0, 0.2);
  return { cam: { pos: P(O.hall, lerp(0.2, 0.05, push), lerp(0.48, 0.42, push), lerp(2.2, 1.65, push)), look: P(O.hall, 0, 0.36, -0.5), fov: 50 },
    dog: { x: O.hall.x, z: O.hall.z - 0.5, y: 0, ry: 0.0, pose: base(t, { bow: 0.9 * bw, headPitch: 0.08, jawOpen: 0.3, ears: 0.5, wag: 1, shiver: 0.3 }), look: [0, 0.2] }, u };
}

// ---------- 8 + 9 + 10: the park: two dogs roughhouse (bared teeth, snapping jaws); one fake sneeze breaks the tension ----------
function whirl(u, C, { r0 = 0.9, spin = 2.2, a0 = 0, snarl = 0.8, rage = 1, still = false } = {}) {
  const G = u < 0.45 ? 0 : u < 0.8 ? 0.35 * (((u - 0.45) / 0.35) ** 3 - ((u - 0.45) / 0.35) ** 4 / 2) : 0.175 + (u - 0.8);
  const th = a0 + spin * (still ? u - 0.9 * G : u), lunge = 0.2 * wob(u * 9.0) * rage;
  const A = V(C.x + (r0 + lunge) * Math.cos(th), 0, C.z + (r0 + lunge) * Math.sin(th)), B = V(C.x - (r0 - lunge * 0.6) * Math.cos(th), 0, C.z - (r0 - lunge * 0.6) * Math.sin(th));
  const st = (me, other, ph, hero_) => ({ x: me.x, z: me.z, y: 0.03 * Math.abs(wob(u * 9 + ph)) * rage, ry: Math.atan2(other.x - me.x, other.z - me.z) + 0.25 * wob(u * 6 + ph) * rage,
    pose: base(u, { bow: (0.5 + 0.35 * wob(u * 7 + ph)) * rage, beg: 0.5 * Math.max(0, wob(u * 5 + ph)) ** 2 * rage, headPitch: 0.25 * wob(u * 11 + ph) * rage, headYaw: 0.35 * wob(u * 8 + ph * 2) * rage, jawOpen: (0.45 + 0.25 * wob(u * 13 + ph)) * rage, snarl, ears: -0.5 * rage, wag: 1, squint: 0.2 * rage }), look: [hero_ ? 0.6 : -0.6, 0.2] });
  return [st(A, B, 0, true), st(B, A, 2.1, false)];
}
const PK = { C8: V(-1.5, 0, 0.5), C9: V(-3.2, 0, -3.9), C10: V(15.2, 0, -2.8) };
function shot8(t) {
  const u = t - CUT[7], az = lerp(0.9, -0.6, ease.inOut(prog(u, 0, 1.97))), R = lerp(3.4, 2.9, prog(u, 0, 1.97)), C = PK.C8;
  const [a, b] = whirl(u, C, { snarl: lerp(0.35, 0.95, seg(t, at(43) - 0.1, at(43) + 0.2)) });
  return { cam: { pos: P(O.park, C.x + Math.sin(az) * R, 0.7, C.z + Math.cos(az) * R), look: P(O.park, C.x, 0.4, C.z), fov: 50 }, dogs: [a, b].map((s) => ({ ...s, x: O.park.x + s.x, z: O.park.z + s.z })),
    red: seg(t, at(43), at(43) + 0.5), C: P(O.park, C.x, 0, C.z), owner: { x: O.park.x - 8.2, z: O.park.z - 2.0, sit: true }, u };
}
function shot9(t) {
  const u = t - CUT[8], a = lerp(-0.38, 0.38, ease.inOut(prog(u, 0, 1.05))), R = 2.9, C = PK.C9;
  const snap = (ph) => 0.1 + 0.55 * Math.max(0, wob(u * 17 + ph)) ** 2;
  const mk = (me, ry, ph, hero_) => ({ x: O.park.x + me, z: O.park.z + C.z, y: 0, ry, pose: base(u, { bow: 0.35 + 0.1 * wob(u * 6 + ph), headPitch: -0.05 + 0.12 * wob(u * 9 + ph), headYaw: 0.2 * wob(u * 7 + ph), jawOpen: snap(ph), snarl: 1, ears: -0.6, wag: 1, squint: 0.25, lift: 0.02 }), look: [hero_ ? 0.7 : -0.7, 0.1] });
  return { cam: { pos: P(O.park, C.x + Math.sin(a) * R, 0.55, C.z + Math.cos(a) * R), look: P(O.park, C.x, 0.4, C.z), fov: 50 },
    dogs: [mk(C.x - 0.62, Math.PI / 2, 0, true), mk(C.x + 0.62, -Math.PI / 2, 1.5, false)], red: 1, glow: [snap(0), snap(1.5)], C: P(O.park, C.x, 0, C.z), u };
}
const SNEEZE10 = at(52) + 0.2;
function shot10(t) {
  const u = t - CUT[9], C = PK.C10, az = lerp(-0.9, 0.35, ease.inOut(prog(u, 0, 2.55))), R = lerp(3.1, 3.75, ease.inOut(prog(u, 0, 2.55)));
  const calm = seg(t, at(55) - 0.05, at(57) + 0.15), still = seg(u, 0.45, 0.8) * (1 - calm);
  const [a0, b0] = whirl(u, C, { rage: 1 - still, snarl: 0.9 * (1 - still), still: true });
  const form = seg(u, 1.4, 2.3), a = { ...a0, x: lerp(a0.x, C.x - 0.42, form), z: lerp(a0.z, C.z + 0.2, form) }, b = { ...b0, x: lerp(b0.x, C.x + 0.48, form), z: lerp(b0.z, C.z - 0.3, form) };
  const sn = sneeze(t, SNEEZE10, 1);
  const heroP = addP(a.pose, sn), pal2 = { ...b.pose };
  const relax = (p, k) => ({ ...p, bow: lerp(p.bow ?? 0, 0.5, k), snarl: lerp(p.snarl ?? 0, 0, k), jawOpen: lerp(p.jawOpen ?? 0, 0.28, k), ears: lerp(p.ears ?? 0, 0.5, k), squint: lerp(p.squint ?? 0, 0.3, k) });
  const hp = relax(heroP, calm), pp = relax(pal2, calm);
  const fx = (s, p, lunge = 0) => ({ ...s, x: O.park.x + s.x, z: O.park.z + s.z + lunge, pose: p });
  const cam10 = P(O.park, C.x + Math.sin(az) * R, lerp(0.55, 0.75, prog(u, 0, 2.55)), C.z + Math.cos(az) * R);
  const faceCam = Math.atan2(cam10.x - (O.park.x + a.x), cam10.z - (O.park.z + a.z)) - 0.55, face = seg(u, 0.35, 1.0);
  const faceCamB = Math.atan2(cam10.x - (O.park.x + b.x), cam10.z - (O.park.z + b.z)) + 0.55;
  const heroS = fx({ ...a, ry: lerp(a.ry, faceCam + Math.round((a.ry - faceCam) / 6.2832) * 6.2832, face) }, hp);
  const palS = fx({ ...b, ry: lerp(b.ry, faceCamB + Math.round((b.ry - faceCamB) / 6.2832) * 6.2832, form) }, pp);
  return { cam: { pos: cam10, look: P(O.park, C.x, 0.4, C.z), fov: 50 },
    dogs: [heroS, palS], red: (1 - calm) * seg(u, 0.0, 0.2), green: calm, burst: prog(t, at(55) - 0.02, at(55) + 0.7), C: P(O.park, C.x, 0, C.z), sneezeT: SNEEZE10, u };
}

// ---------- 11: the front yard: the game freezes mid-leap; the camera circles the hanging dog ----------
function shot11(t) {
  const u = t - CUT[10], tau = u < 0.6 ? u : 0.6 + 0.04 * (u - 0.6);
  const R = 2.8, az = lerp(-0.8, 1.1, ease.inOut(prog(u, 0, 2.22))), C = V(0.9, 0.85, 9.4);
  const run = prog(tau, 0, 0.6), x = lerp(0.1, 0.85, ease.out(run)), z = lerp(10.4, 9.55, run), y = 0.8 * wob(Math.PI * Math.min(1, run * 0.92)) * 0.95;
  const glance = seg(t, at(66) - 0.2, at(66) + 0.3);
  const bx = lerp(1.15, 0.98, run), by = lerp(1.3, 1.5, run) - 0.2 * wob(Math.PI * Math.min(1, run)) * 0, bz = lerp(9.2, 9.45, run);
  return { cam: { pos: V(C.x + Math.sin(az) * R, 1.0, C.z + Math.cos(az) * R), look: V(C.x, C.y, C.z), fov: 50 },
    dog: { x, y, z, ry: lerp(-0.1, -0.35, run) - 0.5 * glance, pose: base(tau, { leap: 0.95, headPitch: -0.25 + 0.0 * glance, headYaw: 0.5 * glance, jawOpen: 0.45, ears: 0.6, wag: 0.0 + 0.4 * (1 - glance), cute: 1 }), look: [0.8 * glance, 0.4] },
    owner: { x: 1.3, z: 9.15, pose: { t, look: [-0.3, 0.3], eyes: { happy: 0.6 }, mouth: { open: 0.5, smile: 1 }, armR: { a: 2.6, e: 0.1 }, armL: { a: -0.2, e: 0 } } },
    ballAt: V(bx, by, bz), u };
}

// ---------- 12: the vegetable patch: soft eyes, ears back, a slow tail while you water the beans ----------
function shot12(t) {
  const u = t - CUT[11], push = ease.inOut(prog(u, 0, 1.19)), az = lerp(0.35, -0.05, push), R = lerp(2.7, 2.1, push), C = V(-6.1, 0.45, -1.25);
  return { cam: { pos: P(O.garden, C.x + Math.sin(az) * R, 0.5, C.z + Math.cos(az) * R), look: P(O.garden, C.x - 0.1, 0.5, C.z), fov: 50 },
    dog: { x: O.garden.x - 6.1, z: O.garden.z - 1.25, y: 0, ry: 0.3 - 0.4 * push, pose: base(u, { sit: 1, headPitch: -0.04, headTilt: 0.22, ears: -0.35, squint: 0.4, jawOpen: 0.1, wag: 0.6, closed: 0.5 * seg(u, 0.5, 0.9) * (1 - seg(u, 0.95, 1.1)) }), look: [0.0, 0.2] },
    owner: { x: O.garden.x - 4.9, z: O.garden.z - 3.8, pose: { t, look: [-0.4, -0.3], eyes: { happy: 0.3 }, mouth: { open: 0, smile: 0.6 }, armR: { a: 1.1, e: 0.5 }, armL: { a: -0.1, e: 0 } } },
    green: seg(u, 0.1, 0.5), C: P(O.garden, C.x, 0, C.z), u };
}

// ---------- 13: the sunset meadow: you and he leap about; one 3D heart ----------
function shot13(t) {
  const u = t - CUT[12], az = lerp(-0.35, 0.35, ease.inOut(prog(u, 0, 1.13))), R = lerp(3.5, 3.0, prog(u, 0, 1.13)), C = V(0.0, 0, -9.0), y0 = meadow.hgt(C.x, C.z);
  const bounce = Math.max(0, wob(u * 7.5)), twirl = u * 2.8;
  return { cam: { pos: P(O.meadow, C.x + Math.sin(az) * R, y0 + lerp(0.55, 0.95, prog(u, 0, 1.13)), C.z + Math.cos(az) * R), look: P(O.meadow, C.x, y0 + 0.8, C.z), fov: 50 },
    dog: { x: O.meadow.x + C.x + 0.55 * Math.sin(0.9 * twirl - 1.4), z: O.meadow.z + C.z + 0.4 + 0.2 * Math.sin(twirl), y: y0 + 0.3 * bounce, ry: 1.1 + 0.3 * Math.sin(twirl), pose: base(u, { leap: 0.7 * bounce, run: 0.8, jawOpen: 0.4, ears: 0.6, wag: 1, headPitch: -0.15, lift: 0 }), look: [0, 0.3] },
    owner: { x: O.meadow.x + C.x - 0.5, z: O.meadow.z + C.z, y: y0 + 0.02 + 0.07 * bounce, pose: { t, look: [0, 0.4], eyes: { happy: 1 }, mouth: { open: 0.9, smile: 1 }, armR: { a: 2.7, e: 0.2 }, armL: { a: -2.7, e: 0.2 }, cute: 0.5 } },
    heart: bump(prog(t, at(74) - 0.05, at(77) + 0.2)), heartAt: P(O.meadow, C.x, y0 + 1.95, C.z), u };
}

// ===================== light and sky per shot =====================
const LIGHT = {
  garden: { hemi: [0xe4f4ff, 0xc2dc8e, 2.15], key: [0xfff1d2, 1.7], off: V(3.5, 6.2, 4.2), rim: [0xfff2d6, 0.5], sky: { light: 1, warm: 0.12, sunEl: 0.75, sunAz: 2.0 }, shadow: 6 },
  flat: { hemi: [0xfff6e4, 0xe0c9a0, 2.3], key: [0xfff0d2, 1.5], off: V(2.5, 4.6, 4.6), rim: [0xfff0d0, 0.35], sky: { light: 1, warm: 0.0, sunEl: 0.9, sunAz: 0.3 }, shadow: 4.5 },
  bed: { hemi: [0xfff3e0, 0xe8cfa6, 2.25], key: [0xffe6bc, 1.35], off: V(2.2, 3.8, 2.8), rim: [0xffe9c8, 0.4], sky: { light: 1, warm: 0.2, sunEl: 0.8, sunAz: 0.3 }, shadow: 4 },
  hall: { hemi: [0xfff0dc, 0xc9a982, 2.15], key: [0xfff4e0, 1.3], off: V(1.4, 3.4, 3.2), rim: [0xfff4d8, 0.6], sky: { light: 1, warm: 0.1, sunEl: 0.8, sunAz: 0.3 }, shadow: 4 },
  park: { hemi: [0xe6f4ff, 0xb5d98a, 2.2], key: [0xfff6e0, 1.75], off: V(3.8, 6.4, 3.6), rim: [0xfff6e0, 0.5], sky: { light: 1, warm: 0.0, sunEl: 0.95, sunAz: 1.0 }, shadow: 6 },
  outside: { hemi: [0xe9f5ff, 0xbcd890, 2.15], key: [0xffeccb, 1.65], off: V(3.6, 5.6, 4.6), rim: [0xffecd0, 0.5], sky: { light: 1, warm: 0.18, sunEl: 0.6, sunAz: 0.5 }, shadow: 6 },
  meadow: { hemi: [0xffd8b0, 0xb08a60, 1.95], key: [0xffb36e, 1.9], off: V(0.5, 3.6, -7.0), rim: [0xffc890, 0.9], sky: { light: 0.85, warm: 1.0, sunEl: 0.1, sunAz: -1.57 }, shadow: 6 },
};
const hemi = new THREE.HemisphereLight(0xfff6e4, 0xe0c9a0, 2.3);
const key = new THREE.DirectionalLight(0xfff0d2, 1.5);
const rim = new THREE.DirectionalLight(0xfff0d0, 0.35);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
scene.add(hemi, key, key.target, rim, rim.target);
let shadowSize = 0;

// ===================== effects =====================
const puffs2 = createPuffs(scene, 14), spray = createSpray(scene, { size: 0.02 }), motes = createMotes(scene, { n: 90, color: 0xfff0c0, size: 0.03 }), pollen = createMotes(scene, { n: 200, color: 0xffe14a, size: 0.085 }), puffs = createPuffs(scene, 14), sightline = createSightline(scene);
const beamTop = createBeam(scene), beamBot = createBeam(scene);
const redFan = createFan(scene), burstFan = createFan(scene), greenFan = createFan(scene), pulseRed = createPulse(scene), pulseGreen = createPulse(scene), pulseSoft = createPulse(scene);
const redGlow = [0, 1].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.ico ? null : null, color: 0xff2a2a, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.visible = false; s.renderOrder = 9; s.userData.ink = false; scene.add(s); return s; });
{ const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); redGlow.forEach((s) => (s.material.map = t)); }
const lens = createLens(document.querySelector("#stage .overlay"));
const mixHex = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// ===================== one frame of the world =====================
const mouthTmp = V(0, 0, 0), eyeA = V(0, 0, 0), eyeB = V(0, 0, 0), tw = V(0, 0, 0);
let lastShot = 0;
function frameOf(t) {
  const k = shotOf(t);
  switch (k) {
    case 1: { const u = t; return { k, cam: hookCam(u), dog: (() => { const d = hookDog(u); return { x: O.garden.x + d.x, z: O.garden.z + d.z, ry: d.ry, pose: d.pose, look: d.look }; })(), sneezeT: HK.snap }; }
    case 14: { const u = t - DURATION; return { k, cam: hookCam(u), dog: (() => { const d = hookDog(u); return { x: O.garden.x + d.x, z: O.garden.z + d.z, ry: d.ry, pose: d.pose, look: d.look }; })() }; }
    case 2: return { k, ...shot2(t) }; case 3: return { k, ...shot3(t) }; case 4: return { k, ...shot4(t), sneezeT: SNEEZE4 }; case 5: return { k, ...shot5(t) };
    case 6: return { k, ...shot6(t) }; case 7: return { k, ...shot7(t) }; case 8: return { k, ...shot8(t) }; case 9: return { k, ...shot9(t) };
    case 10: return { k, ...shot10(t) }; case 11: return { k, ...shot11(t) }; case 12: return { k, ...shot12(t) }; default: return { k, ...shot13(t) };
  }
}
function apply(t) {
  const F = frameOf(t), k = F.k;
  kit.hideAll(); ic.hideAll(); spray.hide(); motes.hide(); pollen.hide(); puffs.hide(); puffs2.hide(); sightline.hide(); beamTop.hide(); beamBot.hide(); redFan.hide(); burstFan.hide(); greenFan.hide(); pulseRed.hide(); pulseGreen.hide(); pulseSoft.hide();
  redGlow.forEach((s) => (s.visible = false)); rope.visible = sock.visible = ball.visible = stool.visible = false;
  hero.visible = pal.visible = owner.visible = false;
  showSet(k);
  // light + sky
  const setName = SHOT_SET[k], L = LIGHT[setName === "bed" ? "bed" : setName] ?? LIGHT.flat;
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2]; key.color.set(L.key[0]); key.intensity = L.key[1]; rim.color.set(L.rim[0]); rim.intensity = L.rim[1];
  outside.set({ ...L.sky, season: 1, t });
  scene.fog.color.copy(outside.fogColor);
  // camera
  const c = window.__cam ? { pos: V(...window.__cam.pos), look: V(...window.__cam.look), fov: window.__cam.fov ?? 46 } : F.cam;
  camera.position.copy(c.pos); camera.lookAt(c.look);
  if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld(true);
  // sun and the back light follow the subject
  if (shadowSize !== L.shadow) { shadowSize = L.shadow; Object.assign(key.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.5, far: 40 }); key.shadow.camera.updateProjectionMatrix(); }
  const focus = c.look.clone(); focus.y = Math.max(0, focus.y - 0.3);
  key.target.position.copy(focus); key.position.copy(focus).add(L.off);
  { const fw = new THREE.Vector3(); camera.getWorldDirection(fw); const rt = new THREE.Vector3().crossVectors(fw, V(0, 1, 0)).normalize(); rim.target.position.copy(focus); rim.position.copy(focus).addScaledVector(fw, 2.2).addScaledVector(rt, 1.6).add(V(0, 2.4, 0)); }
  // cast
  const dogs = F.dogs ?? (F.dog ? [F.dog] : []);
  dogs.forEach((s, i) => setDog(i === 0 ? hero : pal, s));
  if (F.owner && !F.owner.sit) { owner.visible = true; owner.pose({ ...F.owner.pose, x: F.owner.x, y: F.owner.y ?? 0, z: F.owner.z }); owner.faceCamera(camera); owner.updateMatrixWorld(true); }
  if (F.owner?.sit) { owner.visible = true; owner.pose({ t, sit: 1, seat: 0.2, look: [0.6, 0], x: F.owner.x, y: 0, z: F.owner.z, mouth: { smile: 0.8 }, eyes: { happy: 0.6 } }); owner.faceCamera(camera); owner.scale.setScalar(0.5); owner.updateMatrixWorld(true); } else owner.scale.setScalar(1);
  if (F.stool) { stool.visible = true; stool.position.copy(F.stool); }
  effects(t, F, k);
  captions(t);
  renderer.domElement.style.filter = "saturate(1.4) contrast(1.07) brightness(1.02)";
  document.getElementById("vignette").style.opacity = "0.14";
  lastShot = k;
}

// ---------- the explanation and the effects, drawn in the world ----------
const dirOf = (d) => faceV(d.rotation.y);
function effects(t, F, k) {
  lens.set(t, SNEEZE4 + 0.04, 1.2);
  const hs = hero.visible ? hero : null;
  const sprayAt = (d, ts, big = 1) => { d.mouth.getWorldPosition(mouthTmp); const f = dirOf(d); f.y = -0.25; spray.set(t, ts, mouthTmp, f, { speed: 2.4 * big, spread: 0.5, life: 0.9 }); };
  if (k === 1 && hs) sprayAt(hs, F.sneezeT);
  if (k === 4) { hs.mouth.getWorldPosition(mouthTmp); spray.set(t, SNEEZE4, mouthTmp, camera.position.clone().sub(mouthTmp), { speed: 2.6, spread: 0.35, life: 0.8 }); }
  if (k === 6 && hs) sprayAt(hs, F.sneezeT, 0.55);
  if (k === 10 && hs) sprayAt(hs, F.sneezeT);
  if (k === 2) {
    const u = F.u;
    beamTop.set({ w0: V(3.2, 2.2, 0.35), w1: V(3.2, 2.2, 2.3), f0: V(0.5, 0, 0.5), f1: V(0.5, 0, 2.4), color: 0xffe9a8, on: 1 });
    beamBot.set({ w0: V(3.2, 0.95, 0.35), w1: V(3.2, 0.95, 2.3), f0: V(2.0, 0, 0.5), f1: V(2.0, 0, 2.4), color: 0xffe9a8, on: 0.7 });
    motes.set(t, { c: V(1.7, 1.1, 1.45), s: V(2.6, 1.7, 2.2), drift: 0.04 }, 1);
    puffs.set(t, CUT[1] + F.whack, V(-1.85, 0.85, 1.25), { count: 14, radius: 0.8, rise: 0.9, size: 1.05, life: 1.9 });
    const lp = CUT[1] + F.land - 0.1;
    puffs2.set(t, lp, V(-2.4, 0.75, 1.7), { count: 14, radius: 0.6, rise: 1.0, size: 0.95, life: 1.5 });
    rope.visible = F.rope; if (F.rope) { hero.mouth.getWorldPosition(tw); rope.position.copy(tw).add(V(0, 0.0, 0)); rope.rotation.set(0, hero.rotation.y + Math.PI / 2, 0); }
  }
  if (k === 3 && F.sock) { sock.visible = true; hero.mouth.getWorldPosition(tw); sock.position.copy(tw).add(V(0, -0.02, 0)); sock.rotation.set(0, hero.rotation.y + 0.8, 0.3 * wob(t * 15)); }
  if (k === 5) {
    pollen.set(t, { c: P(O.garden, 7.7, 1.05, -4.0), s: V(4.8, 1.4, 2.6), drift: 0.05 }, 1);
    motes.pts.material.color.set(0xffe14a);
  }
  if (k === 6) {
    hero.eyes[0].getWorldPosition(eyeA); eyeB.copy(V(1.48, 1.2, -0.42));
    sightline.set(eyeA, eyeB, F.gaze, t);
  }
  if (k === 7) pulseGreen.set({ x: O.hall.x, z: O.hall.z - 0.5, size: 1.5, color: 0x4be06a, on: seg(F.u, 0.05, 0.25), t: F.u, period: 0.45, y: 0.04 });
  if (k >= 8 && k <= 10) {
    const C = F.C, red = F.red ?? 0, calm = F.green ?? 0;
    redFan.set({ x: C.x, z: C.z, heading: 0, angle: Math.PI * 2, radius: 1.5 + 0.1 * Math.sin(t * 9), color: mixHex(0xff2a3a, 0x4be06a, calm), opacity: 0.32 * red + 0.28 * calm * (1 - (F.burst ?? 0)) });
    pulseRed.set({ x: C.x, z: C.z, size: 2.2, color: 0xff3a3a, on: red * (1 - calm), t, period: 0.7, y: 0.04 });
    if (k === 10 && F.burst > 0 && F.burst < 1) burstFan.set({ x: C.x, z: C.z, heading: 0, angle: Math.PI * 2, radius: lerp(0.8, 4.5, ease.out(F.burst)), color: 0x4be06a, opacity: 0.55 * (1 - F.burst) ** 2, rim: 0.09 });
    if (k === 10) pulseGreen.set({ x: C.x, z: C.z, size: 2.4, color: 0x4be06a, on: calm * (1 - prog(F.u, 2.2, 2.55) * 0.5), t, period: 0.9, y: 0.04 });
    if (k === 9) [pal, hero].forEach((d, i) => { d.mouth.getWorldPosition(mouthTmp); const s = redGlow[i]; s.visible = true; s.position.copy(mouthTmp); s.scale.setScalar(0.35 + 0.3 * F.glow[i]); s.material.opacity = 0.9; });
  }
  if (k === 11) { ball.visible = true; ball.position.copy(F.ballAt); }
  if (k === 12) pulseSoft.set({ x: F.C.x, z: F.C.z, size: 1.5, color: 0x4be06a, on: 0.7 * F.green, t, period: 1.6, y: 0.04 });
  if (k === 13 && F.heart > 0.01) ic.showIcon("❤️", F.heartAt, 0.34, F.heart, { t, bob: 0.03 });
}

const captions = pixelCaptions(document.getElementById("caption"), chunks);
onUpdate((t) => { t = Math.min(t, DURATION - 1e-6); apply(t); });


// ===================== sound: real recordings only (sfx/CREDITS.md), placed one by one on the picture =====================
// Soft landings of the gallop on grass, birds in the garden and the park, crickets at sunset, the sneezes (real human sneezes played higher
// for a small dog, each placed so its burst lands on the head snap), laughs for you, woofs and play-growls, the water drips of the can,
// a bell and twinkles for the green rings and the heart; the voice ducks them (mix.duck).
const sfx = createSfx(short, { mix: { gain: 2.3, lufs: -14, duck: { depth: 0.3, attack: 0.012, release: 0.25, threshold: -42 } } });
const wobx = (i, k = 0.05) => 1 + k * Math.sin(i * 12.9898 + 1.7);               // repeatable little pitch / level variety, never random
const snd = (t, name, gain, o = {}) => sfx.add(t, name, { gain, ...o });
const PEAK = { sneeze_1: 0.09, sneeze_2: 0.24, sneeze_3: 0.04, sneeze_4: 0.41 };
const sneezeSfx = (ts, name, rate, gain, pan = 0) => snd(ts + 0.03 - PEAK[name] / rate, name, gain, { rate, pan });
const stepsAt = (a, b, speed, g, t0, names = "paw", every = 1) => { for (let n = 0, i = 0; ; n++) { const tt = t0 + (Math.PI / 2 + n * Math.PI) / speed; if (tt > b) break; if (tt >= a && n % every === 0) snd(tt, names === "paw" ? `paw_${(i++ % 4) + 1}` : "pad_step", g * wobx(n, 0.2), { rate: names === "paw" ? wobx(n, 0.04) : 1.15 * wobx(n, 0.05), pan: n % 2 ? 0.15 : -0.15 }); } };
const twinkles = (t0, n, dt, g, climb = 0) => { for (let i = 0; i < n; i++) snd(t0 + i * dt, `twinkle_${(i % 3) + 1}`, g * wobx(i, 0.2), { pan: Math.sin(i * 1.9) * 0.4, rate: 1 + climb * i }); };
// the gallop lands on the lawn (the hook, and the last 0.9 s that leads into it)
for (const n of [0, 1, 2]) { const u = (0.5 + n) / 2.6; for (const [t0, lo, hi] of [[0, 0.0, CUT[1]], [DURATION, CUT[13], DURATION]]) { const tt = t0 + u; if (tt > lo && tt < hi) { snd(tt, "pad_step", 0.32 * wobx(n, 0.2), { rate: 1.05 }); snd(tt + 0.06, "pad_step", 0.18, { rate: 1.3, pan: 0.2 }); } if (t0 > 0) { const t2 = t0 - u; if (t2 > CUT[13] && t2 < DURATION) { snd(t2, "pad_step", 0.32 * wobx(n, 0.2), { rate: 1.05 }); snd(t2 + 0.06, "pad_step", 0.18, { rate: 1.3, pan: 0.2 }); } } } }
sfx.loop(0, CUT[1], "birds_a", { gain: 0.16, fadeIn: 0.05, fadeOut: 0.12 }); sfx.loop(CUT[13], DURATION, "birds_a", { gain: 0.16, fadeIn: 0.1, fadeOut: 0.05 });
sneezeSfx(HK.snap, "sneeze_1", 1.45, 0.9); for (let i = 0; i < 3; i++) snd(HK.snap + 0.12 + i * 0.07, `pop_${i + 1}`, 0.14, { rate: 1.4 + 0.2 * i, pan: i - 1 });
// 2 the living room: his claws on the floorboards, the cushion thumped, a puff of dust, the landing on the couch, your laugh
stepsAt(CUT[1] + 0.05, CUT[1] + 0.9, 24, 0.2, CUT[1]);
snd(CUT[1] + 0.3, "thump", 0.42, { rate: 0.7 }); snd(CUT[1] + 0.32, "breath_out", 0.22, { rate: 1.7 });
snd(CUT[1] + 1.3, "thump", 0.4, { rate: 0.8 }); snd(CUT[1] + 1.32, "creak_1", 0.12, { rate: 1.2 }); snd(CUT[1] + 1.34, "breath_out", 0.2, { rate: 1.5, pan: -0.3 });
snd(CUT[1] + 0.7, "laugh_3", 0.4, { pan: -0.3 });
// 3 the bedroom: he pounces, you tip over laughing, he tugs your sock and plays a growl
stepsAt(CUT[2] + 0.02, CUT[2] + 0.5, 24, 0.2, CUT[2]);
snd(CUT[2] + 0.5, "thump", 0.34, { rate: 0.9 }); snd(CUT[2] + 0.25, "laugh_2", 0.5, { pan: 0.2 }); snd(CUT[2] + 0.55, "gasp", 0.12, { rate: 1.1 });
snd(CUT[2] + 1.15, "growl", 0.24, { rate: 0.85, pan: 0.2 }); snd(CUT[2] + 1.42, "growl", 0.22, { rate: 0.95, pan: -0.2 }); snd(CUT[2] + 1.2, "rustle_1", 0.1, { rate: 1.1 });
// 4 your eyes: a sniff, then the sneeze into the lens, a splat of drops
snd(CUT[3] + 0.2, "sniffle_3", 0.14, { rate: 1.2 }); sneezeSfx(SNEEZE4, "sneeze_2", 1.35, 1.0); snd(SNEEZE4 + 0.08, "splat_2", 0.5); snd(SNEEZE4 + 0.2, "pop_2", 0.16, { rate: 1.1 }); snd(SNEEZE4 + 0.4, "drip_2", 0.14, { rate: 0.9 });
// 5 the flowerbed: sniffles in the pollen, a few glints
sfx.loop(CUT[4], CUT[5], "birds_a", { gain: 0.16, fadeIn: 0.05, fadeOut: 0.1 });
snd(CUT[4] + 0.2, "sniffle_2", 0.22); snd(CUT[4] + 0.6, "sniffle_4", 0.2, { rate: 1.05 }); twinkles(CUT[4] + 0.3, 5, 0.22, 0.07, 0.04);
// 6 the kitchen: the neat sneeze, a glint when he peeks at you
sneezeSfx(SNEEZE6, "sneeze_3", 1.3, 0.75); twinkles(SNEEZE6 + 0.3, 2, 0.14, 0.18, 0.06); snd(SNEEZE6 + 0.9, "sniffle_1", 0.1, { rate: 1.2 });
// 7 the hallway: a play-bow woof and soft green chimes
snd(CUT[6] + 0.03, "thump", 0.2, { rate: 1.5 }); snd(CUT[6] + 0.1, "bell_2", 0.2, { rate: 1.3 }); snd(CUT[6] + 0.2, "woof_soft", 0.5, { rate: 1.25 }); twinkles(CUT[6] + 0.28, 3, 0.14, 0.14, 0.05);
// 8-10 the park: birds, paws on grass, play-growls and woofs, jaws snapping, the fake sneeze, the green burst that breaks the tension
sfx.loop(CUT[7], CUT[10], "birds_b", { gain: 0.16, fadeIn: 0.1, fadeOut: 0.2 });
for (let tt = CUT[7] + 0.05, i = 0; tt < CUT[9] + 0.55; tt += 0.19, i++) snd(tt, "pad_step", 0.15 * wobx(i, 0.3), { rate: 1.2 + 0.1 * (i % 3), pan: i % 2 ? 0.3 : -0.3 });
snd(CUT[7] + 0.1, "growl", 0.28, { rate: 0.85, pan: -0.4 }); snd(CUT[7] + 0.55, "woof_low", 0.26, { rate: 1.1, pan: 0.4 }); snd(CUT[7] + 0.95, "growl", 0.3, { rate: 0.75, pan: 0.4 }); snd(CUT[7] + 1.45, "woof_low", 0.24, { rate: 1.0, pan: -0.4 }); snd(CUT[7] + 1.75, "growl", 0.28, { rate: 0.8 });
for (let n = 0; n < 3; n++) { snd(CUT[8] + (Math.PI + 2 * Math.PI * n) / 17, "snap_low", 0.24, { rate: 1.2, pan: -0.4 }); snd(CUT[8] + (Math.PI + 2 * Math.PI * n - 1.5) / 17 + 0.37, "snap_low", 0.18, { rate: 1.4, pan: 0.4 }); }
snd(CUT[8] + 0.2, "growl", 0.3, { rate: 0.7, pan: -0.3 }); snd(CUT[8] + 0.65, "growl", 0.28, { rate: 0.78, pan: 0.3 });
sneezeSfx(SNEEZE10, "sneeze_4", 1.4, 0.9); snd(at(55) - 0.05, "bell_1", 0.26, { rate: 1.1 }); twinkles(at(55) + 0.02, 7, 0.07, 0.2, 0.05); sfx.add(at(52) + 0.6, "glow", { gain: 0.24, dur: 1.5, fadeIn: 0.4, fadeOut: 0.5, rate: 1.05 });
snd(at(57) + 0.05, "breath_out", 0.22, { rate: 1.3, pan: -0.2 }); snd(at(57) + 0.28, "woof_soft", 0.28, { rate: 1.3, pan: 0.3 });
// 11 the front yard: the throw, the leap, the world holds its breath (a soft hum while time stands still)
snd(CUT[10] + 0.04, "pop_1", 0.2, { rate: 0.8 }); snd(CUT[10] + 0.12, "woof_soft", 0.34, { rate: 1.1 }); snd(CUT[10] + 0.4, "thrush_a", 0.12, { rate: 1.0 });
sfx.add(CUT[10] + 0.55, "glow", { gain: 0.3, dur: 1.7, fadeIn: 0.3, fadeOut: 0.3, rate: 0.9 }); snd(at(66) - 0.2, "sniffle_1", 0.12, { rate: 1.1 }); snd(at(66) + 0.1, "twinkle_3", 0.16);
// 12 the vegetable patch: a thrush, drips from the watering can, a soft sigh
snd(CUT[11] + 0.05, "thrush_b", 0.18, { rate: 1.0 }); [0.12, 0.33, 0.5, 0.74, 0.92, 1.05].forEach((d, i) => snd(CUT[11] + d, `drip_${(i % 3) + 1}`, 0.2 * wobx(i, 0.3), { rate: 1 + 0.05 * i, pan: Math.sin(i) * 0.4 }));
snd(CUT[11] + 0.35, "breath_out", 0.2, { rate: 0.8 }); sfx.add(CUT[11] + 0.15, "glow", { gain: 0.16, dur: 1.0, fadeIn: 0.3, fadeOut: 0.4, rate: 1.1 });
// 13 the sunset meadow: crickets, your laugh, happy woofs, the heart chimes
sfx.loop(CUT[12], CUT[13], "crickets", { gain: 0.14, fadeIn: 0.1, fadeOut: 0.1 });
stepsAt(CUT[12] + 0.05, CUT[13] - 0.05, 9, 0.14, CUT[12], "pad", 1);
snd(CUT[12] + 0.05, "laugh_1", 0.5, { pan: -0.2 }); snd(CUT[12] + 0.35, "woof_soft", 0.36, { rate: 1.1, pan: 0.3 }); snd(CUT[12] + 0.75, "woof_soft", 0.32, { rate: 1.3, pan: -0.3 });
twinkles(at(74), 6, 0.12, 0.18, 0.025); snd(at(74) + 0.04, "bell_2", 0.3); snd(at(76) + 0.2, "bell_3", 0.24);

document.getElementById("grain").style.opacity = "0";
const vec = (v) => [v.x, v.y, v.z];
window.__qa = Object.assign((t) => {
  apply(t);
  const f = V(0, 0, -1).applyQuaternion(camera.quaternion);
  const out = { cam: vec(camera.position), aim: vec(f), fov: [camera.fov], dog: vec(hero.position), dogry: [Math.sin(hero.rotation.y), Math.cos(hero.rotation.y)], head: vec(hero.point("Head")), mouth: vec(hero.mouth.getWorldPosition(new THREE.Vector3())), light: [hemi.intensity, key.intensity] };
  return out;
}, { cuts: CUT, fps: FPS, duration: DURATION });
window.__dbg = { scene, camera, hero, pal, owner, DURATION, CUT, at, words, apply, O, frameOf };
short.start();
