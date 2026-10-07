// The studio's blocky cartoon dog (fur-textured), reusable in every short.
//
//   import { createDog } from "../../js/dog.js";
//   const dog = createDog();                    // golden dog; pass colours for a wolf etc.
//   scene.add(dog);
//   onUpdate((t) => dog.pose({ t, wag: 1, cute: 1, sit: 1 }));
//
// Faces +z, feet at y = 0. pose() is a pure function of its arguments, so call it
// every frame with everything the shot needs (unset options go back to neutral).

import { THREE } from "./engine.js";
import * as T from "./textures.js";

const plain = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return plain.get(key);
};
function box(w, h, d, m, x, y, z, parent) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === "number" ? mat(m) : m);
  me.position.set(x, y, z);
  parent.add(me);
  return me;
}
function group(x, y, z, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}

export const DOG_COLORS = {
  golden: { body: 0xc68f55, light: 0xeed4ab, dark: 0x74482a },
  wolf: { body: 0x8e9196, light: 0xe2e2df, dark: 0x515459 },
  shadow: { body: 0x1b1916, light: 0x2a2622, dark: 0x0e0d0c },
};

export function createDog({ colors = DOG_COLORS.golden, key = "", glowEyes = false, pointyEars = false, snout = 1, collar = true } = {}) {
  const k = key; // texture cache keys already include the colour
  const M = {
    body: T.fur(colors.body, { key: k }),
    light: T.fur(colors.light, { key: "light" + k }),
    dark: T.fur(colors.dark, { key: "dark" + k, streak: 0.7 }),
    nose: mat(0x141010, { roughness: 0.25 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  };
  const dog = group(0, 0, 0);
  const pivot = group(0, 0.36, -0.35, dog); // hips: rotate X to rear up
  box(0.46, 0.42, 0.92, M.body, 0, 0.22, 0.35, pivot); // body
  box(0.4, 0.06, 0.5, M.light, 0, 0.0, 0.45, pivot); // belly
  const legs = {};
  function leg(name, x, y, z, parent) {
    const g = group(x, y, z, parent);
    box(0.13, 0.36, 0.14, M.body, 0, -0.17, 0, g);
    box(0.15, 0.06, 0.18, M.light, 0, -0.35, 0.02, g);
    legs[name] = g;
  }
  leg("fl", -0.14, 0.04, 0.68, pivot);
  leg("fr", 0.14, 0.04, 0.68, pivot);
  const hips = group(0, 0, 0, dog); // back legs (lowered + folded when sitting)
  leg("bl", -0.15, 0.36, -0.3, hips);
  leg("br", 0.15, 0.36, -0.3, hips);
  const neck = group(0, 0.36, 0.78, pivot);
  const head = group(0, 0.08, 0.02, neck);
  box(0.4, 0.38, 0.4, M.body, 0, 0.1, 0.04, head);
  box(0.24, 0.17, 0.28 * snout, M.light, 0, 0.0, 0.32 + 0.14 * (snout - 1), head);
  box(0.08, 0.055, 0.05, M.nose, 0, 0.075, 0.465 + 0.28 * (snout - 1), head); // nose
  const jaw = group(0, -0.08, 0.2 + 0.28 * (snout - 1), head);
  box(0.2, 0.06, 0.24, M.light, 0, -0.02, 0.1, jaw);
  box(0.14, 0.02, 0.18, mat(0xd9465c, { roughness: 0.4 }), 0, 0.012, 0.1, jaw); // tongue
  // fangs (snarl), hidden unless pose({ teeth })
  const teeth = group(0, 0, 0, head);
  const toothMat = mat(0xf6f1e4, { roughness: 0.3 });
  for (const s of [-1, 1]) {
    box(0.025, 0.05, 0.02, toothMat, s * 0.08, -0.105, 0.43 + 0.28 * (snout - 1), teeth);
    box(0.02, 0.035, 0.02, toothMat, s * 0.035, -0.1, 0.45 + 0.28 * (snout - 1), teeth);
  }
  const mouth = group(0, 0.0, 0.3, jaw); // attach things the dog carries in its mouth here

  const eyeMat = glowEyes
    ? new THREE.MeshBasicMaterial({ color: 0xffd23a })
    : mat(0x2b1a0e, { roughness: 0.08 });
  const eyes = [];
  const brows = [];
  for (const s of [-1, 1]) {
    const e = group(s * 0.1, 0.17, 0.245, head);
    e.white = box(0.085, 0.085, 0.02, glowEyes ? eyeMat : mat(0xf4f1ea, { roughness: 0.3 }), 0, 0, 0, e);
    e.iris = box(0.07, 0.074, 0.02, mat(0x4a2a12, { roughness: 0.05 }), s * -0.006, -0.004, 0.005, e);
    e.pupil = box(0.055, 0.06, 0.02, glowEyes ? mat(0x000000) : eyeMat, s * -0.01, -0.005, 0.008, e);
    e.pupil.scale.x = glowEyes ? 0.3 : 1; // slit pupils for the night predator
    e.shine = box(0.02, 0.02, 0.01, M.shine, s * -0.02, 0.012, 0.02, e);
    e.shine2 = box(0.011, 0.011, 0.01, M.shine, s * 0.012, -0.022, 0.02, e);
    e.blush = box(0.07, 0.03, 0.01, new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55, depthWrite: false }), s * 0.035, -0.085, 0.002, e);
    // eyelid: fur-coloured flap that slides down (anchored at the top of the eye)
    const lidGeo = new THREE.BoxGeometry(0.1, 0.1, 0.012).translate(0, -0.05, 0);
    e.lid = new THREE.Mesh(lidGeo, M.body);
    e.lid.position.set(0, 0.05, 0.022);
    e.add(e.lid);
    e.lash = box(0.1, 0.012, 0.014, M.nose, 0, -0.1, 0.004, e.lid);
    eyes.push(e);
    brows.push(box(0.12, 0.03, 0.03, M.dark, s * 0.1, 0.24, 0.25, head));
  }
  const ears = [];
  for (const s of [-1, 1]) {
    if (pointyEars) {
      // upright wolf ears: four-sided pyramids
      const e = group(s * 0.13, 0.29, -0.02, head);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 4, 1).rotateY(Math.PI / 4), M.dark);
      ear.scale.z = 0.45;
      ear.position.y = 0.09;
      e.add(ear);
      ears.push(e);
      continue;
    }
    const e = group(s * 0.2, 0.27, 0.0, head);
    box(0.06, 0.28, 0.17, M.dark, s * 0.03, -0.13, 0, e);
    ears.push(e);
  }
  if (collar) {
    box(0.44, 0.08, 0.14, mat(0xb3261e, { roughness: 0.5 }), 0, -0.04, -0.02, neck);
    box(0.07, 0.08, 0.02, new THREE.MeshStandardMaterial({ color: 0xe0b83c, metalness: 0.9, roughness: 0.25 }), 0, -0.1, 0.06, neck); // tag
  }
  const tail = group(0, 0.36, -0.1, pivot);
  box(0.07, 0.07, 0.36, M.body, 0, 0, -0.17, tail);

  // hero cape
  const cape = group(0, 0.46, 0.68, pivot);
  const capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85, 1, 4), T.fabric(0xc8201f, { key: "cape", weave: 2 }));
  capeMesh.material.side = THREE.DoubleSide;
  capeMesh.position.set(0, 0, -0.42);
  capeMesh.rotation.x = -Math.PI / 2 + 0.15;
  cape.add(capeMesh);

  // bodyguard kit: black sunglasses + coiled earpiece
  const glasses = group(0, 0, 0, head);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 });
  const frameMat = mat(0x0b0b0b, { roughness: 0.35, metalness: 0.4 });
  const glassesOn = group(0, 0.17, 0.275, glasses); // pivot that slides from forehead to eyes
  for (const s of [-1, 1]) {
    box(0.15, 0.1, 0.014, lensMat, s * 0.1, 0, 0, glassesOn);
    box(0.012, 0.022, 0.26, frameMat, s * 0.2, 0.025, -0.13, glassesOn); // arms back to the ears
  }
  box(0.4, 0.022, 0.018, frameMat, 0, 0.045, 0.002, glassesOn); // top bar
  const earpiece = group(0.215, 0.12, 0.03, head);
  const wireMat = mat(0x111111, { roughness: 0.3 });
  const bud = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), wireMat);
  bud.rotation.z = Math.PI / 2;
  earpiece.add(bud);
  const coil = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80;
    coil.push(new THREE.Vector3(0.02 + Math.cos(u * 40) * 0.012, -u * 0.32, -0.04 - u * 0.1 + Math.sin(u * 40) * 0.012));
  }
  earpiece.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 160, 0.004, 5), wireMat));

  dog.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = true;
  });

  const clamp = (v) => Math.min(1, Math.max(0, v));
  dog.pose = ({
    x = 0, y = 0, z = 0, ry = 0,
    rear = 0, sit = 0, lie = 0, headYaw = 0, headPitch = 0, jawOpen = 0,
    wag = 0, wagSpeed = 18, t = 0, trot = 0, trotSpeed = 11,
    squint = 0, angry = 0, earUp = 0, earBack = 0, capeOn = false, cute = 0, tilt = 0,
    closed = 0, sad = 0, snarl = 0, glasses: glassesPos = null, earpiece: hasEarpiece = false,
  } = {}) => {
    dog.position.set(x, y, z);
    dog.rotation.set(0, ry, 0);
    // sitting: hips drop and the back legs fold forward; lying: belly on the floor
    const sitTilt = sit * 0.5;
    pivot.position.y = 0.36 - sit * 0.2 - lie * 0.33;
    pivot.rotation.x = -rear * 1.0 - sitTilt;
    hips.position.y = -sit * 0.2 - lie * 0.24;
    neck.rotation.set(rear * 1.0 + sitTilt * 0.9 + headPitch, headYaw, tilt);
    head.rotation.set(0, 0, 0);
    jaw.rotation.x = Math.max(jawOpen, snarl * 0.35) * 0.55;
    teeth.visible = snarl > 0;
    tail.rotation.set(-0.7 + lie * 0.6 + sit * 0.5, Math.sin(t * wagSpeed) * 0.7 * wag, 0);
    const s = Math.sin(t * trotSpeed) * 0.7 * trot;
    legs.fl.rotation.x = s - rear * 0.6 + sitTilt - lie * 1.45;
    legs.fr.rotation.x = -s - rear * 0.6 + sitTilt - lie * 1.45;
    legs.bl.rotation.x = -s - sit * 1.35 - lie * 1.4;
    legs.br.rotation.x = s - sit * 1.35 - lie * 1.4;
    for (const g of [legs.bl, legs.br]) g.position.z = -0.3 + sit * 0.12 + lie * 0.05;
    dog.position.y += Math.abs(Math.sin(t * trotSpeed)) * 0.04 * trot;
    for (const e of eyes) {
      // cute = big glossy puppy eyes: iris fills the eye, two sparkles, blush
      const big = 1 + cute * 0.45;
      e.scale.set(big, big * (1 - squint * 0.7), 1);
      e.iris.visible = cute > 0 && !glowEyes;
      e.pupil.scale.set((glowEyes ? 0.3 : 1) + cute * 0.15, 1 + cute * 0.15, 1);
      e.shine.scale.setScalar(1 + cute * 0.8);
      e.shine.position.y = 0.012 + cute * 0.008;
      e.shine.visible = !glowEyes;
      e.shine2.visible = e.blush.visible = cute > 0 && !glowEyes;
      e.lid.scale.y = Math.max(0.001, clamp(closed));
      e.lid.visible = closed > 0.01;
    }
    brows.forEach((b, i) => {
      const side = i === 0 ? -1 : 1;
      b.rotation.z = side * angry * 0.45 - side * Math.max(cute, sad) * 0.35;
      b.position.y = 0.24 - angry * 0.03 + Math.max(cute, sad) * 0.035;
    });
    ears.forEach((e, i) => {
      const side = i === 0 ? -1 : 1;
      if (pointyEars) e.rotation.set(-earBack * 0.8, 0, side * (0.15 + earBack * 0.3));
      else e.rotation.set(-earBack * 0.9, 0, side * (earUp * 0.5 - earBack * 0.15 - sad * 0.2));
    });
    cape.visible = capeOn;
    glasses.visible = glassesPos !== null;
    if (glassesPos !== null) {
      // 0 = pushed up on the forehead, 1 = over the eyes
      const p = clamp(glassesPos);
      glassesOn.position.set(0, 0.17 + (1 - p) * 0.13, 0.275 - (1 - p) * 0.06);
      glassesOn.rotation.x = -(1 - p) * 0.55;
    }
    earpiece.visible = hasEarpiece;
  };
  Object.assign(dog, { pivot, hips, neck, head, jaw, mouth, eyes, brows, ears, tail, legs, cape, capeMesh, teeth });
  dog.pose();
  return dog;
}
