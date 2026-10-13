// A realistic beagle (Microsoft Rocketbox "Dog_Beagle_01", MIT), posed in code.
//
//   import { createBeagle } from "../../js/beagle.js";
//   const dog = createBeagle(short);
//   scene.add(dog);
//   onUpdate((t) => dog.pose({ t, x: 0, z: 0, ry: 0, sit: 1, wag: 1, ears: 0.5 }));
//
// Faces +z, feet at y = 0, about 0.55 m tall at the head. pose() is a pure function of its
// options (call it every frame with everything the shot needs). Angles are radians.

import { THREE } from "./engine.js";
import { loadAvatar } from "./avatar.js";

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion();
const lerp = (a, b, p) => a + (b - a) * p;

export function createBeagle(short, { scale = 1, cute = 0 } = {}) {
  const dog = new THREE.Group();
  dog.name = "beagle";
  const body = new THREE.Group(); // pitch/roll the whole dog around the hips
  dog.add(body);
  const av = loadAvatar(short, "Dog_Beagle_01");
  av.scale.setScalar(scale);
  body.add(av);
  dog.avatar = av;
  dog.scaleFactor = scale;

  let B = null; // bone name (without "beagle_") -> bone
  const axes = new Map();
  const rest = new Map();
  function init() {
    if (B || !av.ready) return !!B;
    av.update(); // rest pose
    av.updateMatrixWorld(true);
    B = {};
    for (const [n, b] of Object.entries(av.bones)) B[n.replace(/^beagle_/, "")] = b;
    const rq = av.getWorldQuaternion(new THREE.Quaternion());
    for (const b of Object.values(av.bones)) {
      rest.set(b, b.quaternion.clone());
      const inv = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rq);
      axes.set(b, { x: X.clone().applyQuaternion(inv), y: Y.clone().applyQuaternion(inv), z: Z.clone().applyQuaternion(inv) });
    }
    dog.bones = B;
    // "cute" proportions (0..1): a bigger head, big eyes, bigger paws — reads as young and sweet
    if (cute) {
      B.Head.scale.setScalar(1 + 0.16 * cute);
      for (const k of ["L_Hand", "R_Hand", "L_Foot", "R_Foot"]) B[k]?.scale.setScalar(1 + 0.1 * cute);
      for (const k of ["Neck1", "Neck2"]) B[k]?.scale.setScalar(1 - 0.04 * cute);
    }
    return true;
  }
  // rotate a bone on top of its pose so far, about the dog's own axes (x: left, y: up, z: forward)
  function turn(name, ex = 0, ey = 0, ez = 0) {
    const b = B[name];
    if (!b) return;
    const ax = axes.get(b);
    if (ez) b.quaternion.premultiply(_q.setFromAxisAngle(ax.z, ez));
    if (ey) b.quaternion.premultiply(_q.setFromAxisAngle(ax.y, ey));
    if (ex) b.quaternion.premultiply(_q.setFromAxisAngle(ax.x, ex));
  }
  dog.turn = (...a) => init() && turn(...a);
  dog.resetBones = () => {
    if (!init()) return;
    for (const [b, q] of rest) b.quaternion.copy(q);
  };
  // world position of a point on a bone (dog-space offset in metres, before scaling)
  dog.point = (name, off = [0, 0, 0]) => {
    if (!init()) return dog.getWorldPosition(new THREE.Vector3());
    dog.updateMatrixWorld(true);
    const b = B[name];
    const p = b.getWorldPosition(new THREE.Vector3());
    const q = av.getWorldQuaternion(new THREE.Quaternion());
    return p.add(new THREE.Vector3(...off).multiplyScalar(scale).applyQuaternion(q));
  };
  // attach an object to a bone, authored in dog-space metres relative to the bone at rest
  dog.attach = (name, obj, off = [0, 0, 0]) => av.attach("beagle_" + name, obj, off);
  dog.ready = () => init();

  // hips pivot (dog space, metres before scaling): body pitch/roll turns around this point
  const HIP = new THREE.Vector3(0, 0.33, -0.14);
  body.position.copy(HIP).multiplyScalar(scale);
  av.position.copy(HIP).multiplyScalar(-scale);

  // the dog's whole pose for this frame. Blend weights (0..1): sit, lie (sphinx), side (lying on
  // its side), leap, crouch (low, growling); cycles: walk/run (amount 0..1) with walkPhase/runPhase
  // (in cycles). Head: headPitch (+down), headYaw (+left), headTilt, neck (+down). mouth 0..1,
  // ears (-1 flat back .. +1 lifted), tail (+down/tucked, - up), wag 0..1 with wagSpeed,
  // eyes [yaw, pitch], breathe (amount), shiver, pitch/roll/lift for the whole body.
  dog.pose = ({
    t = 0, x = 0, y = 0, z = 0, ry = 0,
    sit = 0, lie = 0, side = 0, leap = 0, crouch = 0, beg = 0,
    walk = 0, walkPhase = 0, run = 0, runPhase = 0,
    headPitch = 0, headYaw = 0, headTilt = 0, neck = 0,
    mouth = 0, ears = 0, earFlap = 0, tail = 0, wag = 0, wagSpeed = 14, eyes = [0, 0],
    breathe = 1, shiver = 0, pitch = 0, roll = 0, lift = 0, sideFlip = 1, paw = 0,
  } = {}) => {
    dog.position.set(x, y, z);
    dog.rotation.set(0, ry, 0);
    if (!init()) return;
    for (const [b, q] of rest) b.quaternion.copy(q);
    const L = { UpperArm: [0, 0, 0], Forearm: [0, 0, 0], Hand: [0, 0, 0], Thigh: [0, 0, 0], Calf: [0, 0, 0], Foot: [0, 0, 0] };
    const legs = { L: structuredClone(L), R: structuredClone(L) };
    const add = (side_, j, ex = 0, ey = 0, ez = 0) => {
      for (const s of side_ === "LR" ? ["L", "R"] : [side_]) {
        const m = s === "L" ? 1 : -1; // mirror sideways rotations
        legs[s][j][0] += ex;
        legs[s][j][1] += ey * m;
        legs[s][j][2] += ez * m;
      }
    };
    let bp = pitch, br = roll, bl = lift, sp = 0;

    // ---- sitting: rear down, chest up, front legs straight
    if (sit) {
      bp += -0.62 * sit;
      bl += -0.2 * sit;
      add("LR", "UpperArm", 0.16 * sit);
      add("LR", "Forearm", 0.42 * sit);
      add("LR", "Hand", 0.07 * sit);
      add("LR", "Thigh", -0.6 * sit, 0, 0.15 * sit);
      add("LR", "Calf", 1.83 * sit);
      add("LR", "Foot", -2.26 * sit);
      neck += 0.42 * sit;
      headPitch += 0.18 * sit;
    }
    // ---- lying down like a sphinx: front legs forward, hind legs folded under
    if (lie) {
      bl += -0.17 * lie;
      bp += 0.03 * lie;
      add("LR", "UpperArm", 0.63 * lie);
      add("LR", "Forearm", -2.18 * lie);
      add("LR", "Hand", 0.33 * lie);
      add("LR", "Thigh", -0.9 * lie, 0, 0.3 * lie);
      add("LR", "Calf", 1.5 * lie);
      add("LR", "Foot", -2.33 * lie);
      neck += -0.1 * lie;
    }
    // ---- lying on its side (sideFlip 1: on its right side, -1: left), legs relaxed
    if (side) {
      br += -1.42 * side * sideFlip;
      bl += -0.215 * side;
      add("LR", "UpperArm", -0.35 * side);
      add("LR", "Forearm", 0.15 * side);
      add("LR", "Hand", 0.35 * side);
      add("LR", "Thigh", -0.25 * side);
      add("LR", "Calf", 0.45 * side);
      add("LR", "Foot", -0.2 * side);
      neck += 0.15 * side;
    }
    // ---- leaping: front legs reaching, hind legs stretched back, ears streaming
    if (leap) {
      bp += -0.1 * leap;
      add("LR", "UpperArm", -1.25 * leap);
      add("LR", "Forearm", -0.15 * leap);
      add("LR", "Hand", 0.75 * leap);
      add("LR", "Thigh", 1.05 * leap);
      add("LR", "Calf", 0.2 * leap);
      add("LR", "Foot", 0.6 * leap);
      sp += -0.12 * leap;
      neck += -0.25 * leap;
      ears -= 0.8 * leap;
      tail += 1.1 * leap;
    }
    // ---- crouched, growling: front end low, weight back, head low and forward
    if (crouch) {
      bp += 0.1 * crouch;
      bl += -0.035 * crouch;
      add("LR", "UpperArm", 0.32 * crouch);
      add("LR", "Forearm", -1.38 * crouch);
      add("LR", "Hand", 0.81 * crouch);
      add("LR", "Thigh", -0.01 * crouch);
      add("LR", "Calf", 0.25 * crouch);
      add("LR", "Foot", -0.59 * crouch);
      neck += 0.15 * crouch;
    }
    // ---- walking (4-beat: LH, LF, RH, RF)
    if (walk) {
      const ph = { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 };
      for (const [k, o] of Object.entries(ph)) {
        const a = (walkPhase + o) * Math.PI * 2;
        const s = Math.sin(a), lift_ = Math.max(0, Math.cos(a));
        if (k[1] === "F") {
          add(k[0], "UpperArm", -0.38 * s * walk);
          add(k[0], "Forearm", -0.25 * lift_ * walk);
          add(k[0], "Hand", 0.9 * lift_ * walk);
        } else {
          add(k[0], "Thigh", -0.38 * s * walk);
          add(k[0], "Calf", 0.5 * lift_ * walk);
          add(k[0], "Foot", -0.35 * lift_ * walk);
        }
      }
      bl += 0.008 * Math.cos(walkPhase * Math.PI * 4) * walk;
      neck += 0.04 * Math.sin(walkPhase * Math.PI * 4) * walk;
      br += 0.03 * Math.sin(walkPhase * Math.PI * 2) * walk;
    }
    // ---- running (rotary gallop): fronts and hinds in pairs, spine flexing
    if (run) {
      const a = runPhase * Math.PI * 2;
      for (const [k, o] of Object.entries({ LF: 0, RF: 0.12, LH: 0.5, RH: 0.62 })) {
        const s = Math.sin(a + o * Math.PI * 2), c = Math.cos(a + o * Math.PI * 2);
        if (k[1] === "F") {
          add(k[0], "UpperArm", (-0.85 * s - 0.1) * run);
          add(k[0], "Forearm", -0.6 * Math.max(0, c) * run);
          add(k[0], "Hand", 1.0 * Math.max(0, c) * run);
        } else {
          add(k[0], "Thigh", (-0.8 * s + 0.15) * run);
          add(k[0], "Calf", 0.7 * Math.max(0, -c) * run);
          add(k[0], "Foot", -0.5 * Math.max(0, -c) * run);
        }
      }
      sp += 0.22 * Math.sin(a + 0.6) * run;
      bp += 0.08 * Math.sin(a) * run;
      bl += (0.05 * Math.abs(Math.sin(a + 0.4)) + 0.01) * run;
      neck += (-0.12 * Math.sin(a + 1.2) - 0.15) * run;
      ears -= 0.7 * run;
      tail += 0.9 * run;
    }
    // ---- begging / standing up on hind legs (paws up)
    if (beg) {
      bp += -1.2 * beg;
      bl += -0.19 * beg;
      add("LR", "UpperArm", 0.7 * beg);
      add("LR", "Forearm", -1.5 * beg);
      add("LR", "Hand", 1.1 * beg);
      add("LR", "Thigh", -0.01 * beg, 0, 0.15 * beg);
      add("LR", "Calf", 1.75 * beg);
      add("LR", "Foot", -2.18 * beg);
      neck += 0.7 * beg;
      headPitch += 0.3 * beg;
    }
    // a raised front paw (resting it on something / offering it)
    if (paw) {
      add("L", "UpperArm", -0.9 * paw);
      add("L", "Forearm", 0.5 * paw);
      add("L", "Hand", 0.4 * paw);
    }

    // breathing + shiver
    const br_ = Math.sin(t * 2 * Math.PI * 0.45) * 0.012 * breathe;
    const sh = shiver ? Math.sin(t * 61) * 0.012 * shiver + Math.sin(t * 47) * 0.008 * shiver : 0;

    body.rotation.set(bp, 0, br + sh);
    body.position.copy(HIP).multiplyScalar(scale);
    body.position.y += bl * scale;

    // spine
    for (const k of ["Spine", "Spine1", "Spine2"]) turn(k, sp / 3 + br_, 0, 0);
    // neck + head
    turn("Neck", neck * 0.4 + headPitch * 0.15, headYaw * 0.15, 0);
    turn("Neck1", neck * 0.3 + headPitch * 0.15, headYaw * 0.2, 0);
    turn("Neck2", neck * 0.3 + headPitch * 0.15, headYaw * 0.2, 0);
    turn("Head", headPitch * 0.55, headYaw * 0.45, headTilt);
    // jaw, ears, eyes
    turn("Xtra_Mouth", mouth * 0.45);
    const flap = earFlap ? Math.sin(t * 9) * 0.25 * earFlap : 0;
    turn("Ear_L", -0.35 * Math.min(0, ears) + flap * 0.5, 0, 0.45 * Math.max(0, ears) + 0.35 * Math.max(0, -ears) + flap);
    turn("EarR", -0.35 * Math.min(0, ears) - flap * 0.5, 0, -(0.45 * Math.max(0, ears) + 0.35 * Math.max(0, -ears)) - flap);
    // the eyeballs can only move a little before the sockets show
    const ey = Math.max(-0.06, Math.min(0.06, eyes[0])), ep = Math.max(-0.04, Math.min(0.04, eyes[1]));
    turn("Xtra_Eye_L", ep, ey, 0);
    turn("Xtra_Eye_R", ep, ey, 0);
    // legs
    for (const s of ["L", "R"]) for (const [j, [ex, ey, ez]] of Object.entries(legs[s])) turn(`${s}_${j}`, ex, ey, ez);
    // tail: base angle + wag travelling down the tail
    const w = wag ? Math.sin(t * wagSpeed) * wag : 0;
    turn("Tail", tail * 0.45, w * 0.35, 0);
    turn("Tail1", tail * 0.25, w * 0.3, 0);
    turn("Tail2", tail * 0.2, w * 0.25, 0);
    turn("Tail3", tail * 0.1, w * 0.2, 0);
  };
  dog._turn = turn;
  dog._B = () => B;
  return dog;
}
