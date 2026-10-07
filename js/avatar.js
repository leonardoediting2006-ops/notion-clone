// Realistic premade humans from the Microsoft Rocketbox Avatar Library
// (MIT licence, see assets/rocketbox/LICENSE.md), animated in code.
//
//   import { loadAvatar } from "../../js/avatar.js";
//   const carrier = loadAvatar(short, "Delivery_Male_01");   // returns immediately
//   scene.add(carrier);
//   onUpdate((t) => { carrier.walk(t * 7, 0.5); carrier.update(); });
//
// The pose API matches js/human.js: walk(), sit(), resetPose(), plus joint
// "handles" (armL/armR, elbowL/R, legL/R, kneeL/R, ankleL/R, spine, head,
// pelvis) whose .rotation you can set before calling update().
// Characters face +z (their left side is +x), feet at y = 0.

import { THREE } from "./engine.js";
import { FBXLoader } from "../lib/jsm/loaders/FBXLoader.js";

const BASE = new URL("../assets/rocketbox/", import.meta.url).href;
const WHITE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XbUdkAAAAASUVORK5CYII=";

// bone names in the 3ds Max Biped skeleton used by every Rocketbox avatar
const BONES = {
  pelvis: "Bip01_Pelvis", spine: "Bip01_Spine", spine1: "Bip01_Spine1", spine2: "Bip01_Spine2",
  neck: "Bip01_Neck", head: "Bip01_Head",
  clavL: "Bip01_L_Clavicle", armL: "Bip01_L_UpperArm", elbowL: "Bip01_L_Forearm", handL: "Bip01_L_Hand",
  clavR: "Bip01_R_Clavicle", armR: "Bip01_R_UpperArm", elbowR: "Bip01_R_Forearm", handR: "Bip01_R_Hand",
  legL: "Bip01_L_Thigh", kneeL: "Bip01_L_Calf", ankleL: "Bip01_L_Foot",
  legR: "Bip01_R_Thigh", kneeR: "Bip01_R_Calf", ankleR: "Bip01_R_Foot",
};

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

export function loadAvatar(short, name, { height = null, facing = 0 } = {}) {
  const root = new THREE.Group();
  root.name = name;
  const h = root;
  // pose handles (plain Object3Ds read by update())
  const handleNames = ["pelvis", "spine", "head", "armL", "armR", "elbowL", "elbowR", "legL", "legR", "kneeL", "kneeR", "ankleL", "ankleR"];
  for (const n of handleNames) h[n] = new THREE.Object3D();
  h.handL = new THREE.Group(); // placeholders until the model arrives; re-parented to the hand bones
  h.handR = new THREE.Group();
  h.hipHeight = 0.93;
  h.ready = false;

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const file = url.split("/").pop().split("\\").pop();
    if (/specular/i.test(file)) return WHITE;
    if (/\.tga$/i.test(file)) return `${BASE}${name}/${file.replace(/\.tga$/i, /opacity/i.test(file) ? ".png" : ".jpg")}`;
    return url;
  });

  manager.addHandler(/\.tga$/i, new THREE.TextureLoader(manager));

  let done;
  short.track(new Promise((ok) => (done = ok)));
  const loader = new FBXLoader(manager);
  loader.load(`${BASE}${name}/${name}.fbx`, (fbx) => {
    setup(fbx);
    // wait for textures referenced by the model too
    if (manager.itemsLoaded >= manager.itemsTotal) done();
    else manager.onLoad = done;
  }, undefined, (e) => {
    console.error("Avatar failed to load", name, e);
    done();
  });

  const bones = {};
  const rest = new Map(); // bone -> rest quaternion
  const axes = new Map(); // bone -> { x, y, z } root axes expressed in the bone's parent space
  let model;

  function setup(fbx) {
    model = fbx;
    model.scale.setScalar(0.01); // centimetres → metres
    model.rotation.y = facing;
    root.add(model);

    // materials: PBR, proper colour spaces, cut-out hair/lashes
    model.traverse((o) => {
      if (o.isBone) bones[o.name] = o;
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.frustumCulled = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map((m) => {
        const opacity = m.map && /opacity/i.test(m.map.image?.src ?? m.map.name ?? "") || /opacity|hair|lash/i.test(m.name);
        const isHead = /head/i.test(m.name) || /head/i.test(m.map?.image?.src ?? "");
        const nm = new THREE.MeshStandardMaterial({
          name: m.name,
          map: m.map ?? null,
          normalMap: m.normalMap ?? null,
          roughness: isHead ? 0.55 : 0.75,
          metalness: 0,
          transparent: false,
          alphaTest: opacity ? 0.4 : 0,
          side: opacity ? THREE.DoubleSide : THREE.FrontSide,
        });
        if (nm.map) nm.map.colorSpace = THREE.SRGBColorSpace;
        if (nm.normalMap) nm.normalScale.set(1, 1);
        return nm;
      });
      o.material = Array.isArray(o.material) ? out : out[0];
    });

    const human = !!bones.Bip01_L_UpperArm;
    const B = (k) => bones[BONES[k]];

    // natural rest pose: arms down from the T-pose, slightly away from the body
    root.updateMatrixWorld(true);
    if (human) aimBone(B("armL"), B("elbowL"), new THREE.Vector3(0.14, -1, 0.0));
    aimBone(B("armR"), B("elbowR"), new THREE.Vector3(-0.14, -1, 0.0));
    aimBone(B("elbowL"), B("handL"), new THREE.Vector3(0.05, -1, 0.14));
    aimBone(B("elbowR"), B("handR"), new THREE.Vector3(-0.05, -1, 0.14));
    rotateInRoot(B("handL"), Y, -0.25);
    rotateInRoot(B("handR"), Y, 0.25);

    // feet on the ground, optional height
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    if (height) {
      const s = height / (box.max.y - box.min.y);
      model.scale.multiplyScalar(s);
      root.updateMatrixWorld(true);
      box.setFromObject(model, true);
    }
    model.position.y -= box.min.y;
    root.updateMatrixWorld(true);
    if (B("legL")) h.hipHeight = B("legL").getWorldPosition(_v).y - root.getWorldPosition(_v2).y;
    h.baseY = model.position.y;

    // remember rest pose + root axes in each bone's parent space
    for (const b of Object.values(bones)) {
      rest.set(b, b.quaternion.clone());
      const pq = b.parent.getWorldQuaternion(new THREE.Quaternion());
      const rq = root.getWorldQuaternion(new THREE.Quaternion());
      const inv = pq.invert().multiply(rq); // root space → parent space
      axes.set(b, { x: X.clone().applyQuaternion(inv), y: Y.clone().applyQuaternion(inv), z: Z.clone().applyQuaternion(inv) });
    }

    // let callers attach props to the real hands
    for (const side of ["L", "R"]) {
      const bone = B("hand" + side);
      if (!bone) continue; // animals have no hands
      const holder = h["hand" + side];
      // compensate the model scale so props are authored in metres, hand-local
      holder.scale.setScalar(1 / model.scale.x);
      bone.add(holder);
    }
    h.bones = bones;
    mixer = new THREE.AnimationMixer(model);
    h.ready = true;
    pendingClips.splice(0).forEach((f) => f());
    h.update();
  }

  // rotate `bone` so the direction to `child` points along `dir` (root space)
  function aimBone(bone, child, dir) {
    if (!bone || !child) return;
    root.updateMatrixWorld(true);
    const from = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
    const rq = root.getWorldQuaternion(new THREE.Quaternion());
    const to = dir.clone().normalize().applyQuaternion(rq);
    const qWorld = new THREE.Quaternion().setFromUnitVectors(from, to);
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    // parent⁻¹ · qWorld · parent · local
    bone.quaternion.premultiply(pq.clone().invert().multiply(qWorld).multiply(pq));
    root.updateMatrixWorld(true);
  }
  function rotateInRoot(bone, axis, angle) {
    if (!bone) return;
    root.updateMatrixWorld(true);
    const rq = root.getWorldQuaternion(new THREE.Quaternion());
    const pq = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const a = axis.clone().applyQuaternion(rq).applyQuaternion(pq.invert());
    bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(a, angle));
  }

  // apply an euler (x, y, z in root axes) on top of a bone's rest pose
  function drive(bone, ex, ey, ez, scale = 1) {
    if (!bone) return;
    const ax = axes.get(bone);
    const q = rest.get(bone).clone();
    if (ez) q.premultiply(_q.setFromAxisAngle(ax.z, ez * scale));
    if (ey) q.premultiply(_q.setFromAxisAngle(ax.y, ey * scale));
    if (ex) q.premultiply(_q.setFromAxisAngle(ax.x, ex * scale));
    bone.quaternion.copy(q);
  }

  // push handle rotations onto the skeleton (call once per frame after posing)
  h.update = () => {
    if (!h.ready) return;
    const B = (k) => bones[BONES[k]];
    if (h._clip) {
      // motion capture drives every bone; head handle adds a turn on top
      const c = clips.get(h._clip);
      if (c) {
        if (!c.action) {
          c.action = mixer.clipAction(c.clip);
          c.action.play();
        }
        for (const other of clips.values()) if (other.action) other.action.weight = other === c ? 1 : 0;
        mixer.setTime(h._clipTime % c.clip.duration);
        const hr = h.head.rotation, hb = B("head"), ax = axes.get(hb);
        if (hr.y) hb.quaternion.premultiply(_q.setFromAxisAngle(ax.y, hr.y));
        if (hr.x) hb.quaternion.premultiply(_q.setFromAxisAngle(ax.x, hr.x));
      }
      return;
    }
    for (const b of Object.values(bones)) b.quaternion.copy(rest.get(b));
    model.position.y = h.baseY + (h.pelvis.position.y ? h.pelvis.position.y - 0.93 : 0);
    drive(B("pelvis"), h.pelvis.rotation.x, h.pelvis.rotation.y, h.pelvis.rotation.z);
    const sp = h.spine.rotation;
    for (const k of ["spine", "spine1", "spine2"]) drive(B(k), sp.x, sp.y, sp.z, 1 / 3);
    const hr = h.head.rotation;
    drive(B("neck"), hr.x, hr.y, hr.z, 0.4);
    drive(B("head"), hr.x, hr.y, hr.z, 0.6);
    for (const s of ["L", "R"]) {
      // Biped thighs/arms: same sign conventions as js/human.js
      drive(B("leg" + s), h["leg" + s].rotation.x, h["leg" + s].rotation.y, h["leg" + s].rotation.z);
      drive(B("knee" + s), h["knee" + s].rotation.x, 0, 0);
      drive(B("ankle" + s), h["ankle" + s].rotation.x, 0, 0);
      drive(B("arm" + s), h["arm" + s].rotation.x, h["arm" + s].rotation.y, h["arm" + s].rotation.z);
      drive(B("elbow" + s), h["elbow" + s].rotation.x, h["elbow" + s].rotation.y, 0);
    }
  };

  // ---- motion capture (Rocketbox animations, see assets/rocketbox/animations)
  const clips = new Map();
  let mixer;
  // load a clip by file name, e.g. "m_walk_neutral_01" (call before short.start())
  h.loadClip = (clipName) => {
    if (clips.has(clipName)) return;
    clips.set(clipName, null);
    let ok;
    short.track(new Promise((r) => (ok = r)));
    const load = () => new FBXLoader().load(`${BASE}animations/${clipName}.fbx`, (fbx) => {
      const clip = fbx.animations[0];
      clip.name = clipName;
      // keep only bones this avatar has; keep root height but cancel horizontal drift (in place)
      clip.tracks = clip.tracks.filter((t) => bones[t.name.split(".")[0]]);
      const rootT = clip.tracks.find((t) => t.name === "Bip01.position");
      if (rootT) {
        const parentQ = bones.Bip01.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(parentQ).normalize();
        const v = rootT.values, first = new THREE.Vector3(v[0], v[1], v[2]);
        const v0h = first.clone().addScaledVector(up, -first.dot(up));
        for (let i = 0; i < v.length; i += 3) {
          const cur = new THREE.Vector3(v[i], v[i + 1], v[i + 2]);
          const height = cur.dot(up);
          const out = v0h.clone().addScaledVector(up, height);
          v[i] = out.x; v[i + 1] = out.y; v[i + 2] = out.z;
        }
      }
      clips.set(clipName, { clip });
      ok();
    }, undefined, (e) => {
      console.error("Clip failed", clipName, e);
      ok();
    });
    if (h.ready) load();
    else pendingClips.push(load);
  };
  const pendingClips = [];
  // play a loaded clip at time t (seconds); pass null to go back to code poses
  h.play = (clipName, t = 0) => {
    h._clip = clipName;
    h._clipTime = t;
  };

  h.resetPose = () => {
    h._clip = null;
    for (const n of handleNames) {
      h[n].rotation.set(0, 0, 0);
      h[n].position.set(0, 0, 0);
    }
  };
  h.walk = (phase, amount = 0.5) => {
    h.resetPose();
    const a = amount, run = Math.min(1, Math.max(0, (a - 0.6) / 0.4));
    const s = Math.sin(phase), c = Math.cos(phase);
    h.legL.rotation.x = -s * a * 0.9;
    h.legR.rotation.x = s * a * 0.9;
    h.kneeL.rotation.x = a * (0.12 + (1.1 + run) * Math.max(0, c));
    h.kneeR.rotation.x = a * (0.12 + (1.1 + run) * Math.max(0, -c));
    h.ankleL.rotation.x = -(h.legL.rotation.x + h.kneeL.rotation.x) * 0.45;
    h.ankleR.rotation.x = -(h.legR.rotation.x + h.kneeR.rotation.x) * 0.45;
    h.armL.rotation.x = s * a * 0.75;
    h.armR.rotation.x = -s * a * 0.75;
    h.elbowL.rotation.x = -0.2 - run * 1.2 - 0.25 * a * Math.max(0, -s);
    h.elbowR.rotation.x = -0.2 - run * 1.2 - 0.25 * a * Math.max(0, s);
    h.pelvis.position.y = 0.93 + Math.abs(c) * 0.025 * a - 0.02 * a;
    h.spine.rotation.set(0.05 + run * 0.18, s * 0.1 * a, 0);
    h.pelvis.rotation.y = -s * 0.08 * a;
  };
  h.sit = () => {
    h.resetPose();
    h.legL.rotation.set(-1.5, 0, -0.05);
    h.legR.rotation.set(-1.5, 0, 0.05);
    h.kneeL.rotation.x = h.kneeR.rotation.x = 1.5;
    h.armL.rotation.x = h.armR.rotation.x = -0.3;
    h.elbowL.rotation.x = h.elbowR.rotation.x = -0.9;
  };
  // eyes are part of the head texture in this library, so blink/look are no-ops
  h.blink = () => {};
  h.look = () => {};
  return root;
}
