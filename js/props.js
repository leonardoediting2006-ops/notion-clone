// Props: downloaded models (furniture, decor, vehicles) + code-built realistic
// props (mailbox, handbag, hats, picket fence). See assets/CREDITS.md.
//
//   import { loadProp, mailbox } from "../../js/props.js";
//   const sofa = loadProp(short, "GlamVelvetSofa", { width: 2.1 });
//   const car = loadProp(short, "sedan", { length: 4.4 });
//   scene.add(sofa, car, mailbox());

import { THREE } from "./engine.js";
import { GLTFLoader } from "../lib/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "../lib/jsm/loaders/DRACOLoader.js";
import * as T from "./textures.js";
import { RoomEnvironment } from "../lib/jsm/environments/RoomEnvironment.js";

const ASSETS = new URL("../assets/", import.meta.url).href;
const loader = new GLTFLoader();
loader.setDRACOLoader(new DRACOLoader().setDecoderPath(new URL("../lib/jsm/libs/draco/", import.meta.url).href));

// name → file and the direction the model naturally faces
export const CATALOG = {
  // realistic furniture & decor (Khronos glTF sample assets)
  GlamVelvetSofa: "props/GlamVelvetSofa.glb",
  SheenWoodLeatherSofa: "props/SheenWoodLeatherSofa.glb",
  SheenChair: "props/SheenChair.glb",
  ChairDamaskPurplegold: "props/ChairDamaskPurplegold.glb",
  SpecularSilkPouf: "props/SpecularSilkPouf.glb",
  AnisotropyBarnLamp: "props/AnisotropyBarnLamp.glb",
  GlassVaseFlowers: "props/GlassVaseFlowers.glb",
  DiffuseTransmissionPlant: "props/DiffuseTransmissionPlant.glb",
  TrafficCone: { file: "props/TrafficCone.glb", only: ["Cone Normal"] }, // file also holds a demo floor + bulb
  // realistic car (Khronos CarConcept, CC-BY 4.0) — logo parts removed
  CarConcept: { file: "vehicles/CarConcept.glb", hide: ["InteriorSteeringEmblem", "License Plate"] },
  // low-poly vehicles (Kenney)
  sedan: "vehicles/sedan.gltf",
  hatchback: "vehicles/hatchback.gltf",
  suv: "vehicles/suv.gltf",
  van: "vehicles/van.gltf",
  "delivery-truck": "vehicles/delivery-truck.gltf",
  taxi: "vehicles/taxi.gltf",
  "police-car": "vehicles/police-car.gltf",
};

// Load a model by catalog name. Size it with ONE of: height | width | length | scale.
// Returns a Group immediately; the model appears once loaded (rendering waits for it).
export function loadProp(short, name, { height, width, length, scale, shadows = true, paint = null } = {}) {
  const holder = new THREE.Group();
  holder.name = name;
  const entry = CATALOG[name] ?? name;
  const file = typeof entry === "string" ? entry : entry.file;
  const only = typeof entry === "string" ? null : entry.only;
  const hide = typeof entry === "string" ? null : entry.hide;
  let done;
  short.track(new Promise((ok) => (done = ok)));
  loader.load(ASSETS + file, (gltf) => {
    const obj = gltf.scene;
    if (hide) {
      const drop = [];
      obj.traverse((o) => { if (hide.includes(o.name)) drop.push(o); });
      drop.forEach((o) => o.removeFromParent());
    }
    // optional body colour for vehicles (materials named "Paint…")
    if (paint !== null) {
      obj.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (/^paint/i.test(m.name ?? "")) {
            m.color.set(paint);
            if (m.map) m.map = null;
            m.needsUpdate = true;
          }
        }
      });
    }
    if (only) {
      const drop = [];
      obj.traverse((o) => { if (o.isMesh && !only.includes(o.name) && !only.includes(o.parent?.name)) drop.push(o); });
      drop.forEach((o) => o.removeFromParent());
    }
    // models may ship their own lights; scene lighting stays ours
    const lights = [];
    obj.traverse((o) => {
      if (o.isLight) lights.push(o);
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = shadows;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m.map) m.map.anisotropy = 8;
      }
    });
    lights.forEach((l) => l.removeFromParent());
    // normalise: centred on x/z, sitting on y = 0, sized as requested
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    let s = scale ?? 1;
    if (height) s = height / size.y;
    else if (width) s = width / size.x;
    else if (length) s = length / Math.max(size.x, size.z);
    obj.scale.multiplyScalar(s);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    obj.position.set(-c.x, -box.min.y * s, -c.z);
    holder.add(obj);
    holder.userData.size = size.multiplyScalar(s);
    done();
  }, undefined, (e) => {
    console.error("Prop failed to load", name, e);
    done();
  });
  return holder;
}

// Soft image-based lighting so metal, car paint, glass and leather reflect something.
export function useEnvironment(renderer, scene, intensity = 0.6) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensity;
  pmrem.dispose();
}

// ---------------------------------------------------------------- code-built props
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
// fabric/leather look without blotchy colour: solid colour + fine weave bump
function fabricMat(color, { roughness = 0.9, kind = "cotton", sheen = 0.3 } = {}) {
  const bump = (kind === "leather" ? T.leather(0x808080) : T.fabric(0x808080, { weave: kind === "knit" ? 5 : 3, key: "bump" + kind })).bumpMap;
  return new THREE.MeshPhysicalMaterial({ color, roughness, bumpMap: bump, bumpScale: kind === "leather" ? 0.6 : 1.2, sheen, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide });
}
function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent?.add(m);
  return m;
}

// Classic curbside mailbox on a wooden post, door faces +z. flagUp: 0..1
export function mailbox({ color = 0x3b4148, flagColor = 0xc8261e, postColor = 0x6b5038 } = {}) {
  const g = new THREE.Group();
  const metal = std(color, { metalness: 0.55, roughness: 0.38 });
  const post = mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), T.paintedWood(postColor), g, 0, 0.525, 0);
  post.material = post.material.clone();
  mesh(new THREE.BoxGeometry(0.22, 0.03, 0.5), T.paintedWood(postColor), g, 0, 1.05, 0);
  // body: box bottom + half-cylinder top
  const L = 0.48, W = 0.18, Hb = 0.1;
  mesh(new THREE.BoxGeometry(W, Hb, L), metal, g, 0, 1.065 + Hb / 2, 0);
  const top = mesh(new THREE.CylinderGeometry(W / 2, W / 2, L, 32, 1, false, 0, Math.PI), metal, g, 0, 1.065 + Hb, 0);
  top.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  // door (slightly darker) + handle
  const door = new THREE.Group();
  door.position.set(0, 1.065, L / 2 + 0.004);
  g.add(door);
  mesh(new THREE.BoxGeometry(W + 0.006, Hb, 0.008), std(color, { metalness: 0.6, roughness: 0.3 }), door, 0, Hb / 2, 0);
  const cap = mesh(new THREE.CylinderGeometry(W / 2 + 0.003, W / 2 + 0.003, 0.008, 32, 1, false, 0, Math.PI), std(color, { metalness: 0.6, roughness: 0.3 }), door, 0, Hb, 0);
  cap.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), std(0xb9b9b9, { metalness: 0.9, roughness: 0.25 }), door, 0, Hb + 0.05, 0.012);
  // flag on the side
  const flag = new THREE.Group();
  flag.position.set(W / 2 + 0.008, 1.1, -0.08);
  g.add(flag);
  mesh(new THREE.BoxGeometry(0.008, 0.2, 0.025), std(flagColor, { roughness: 0.4 }), flag, 0, 0.1, 0);
  mesh(new THREE.BoxGeometry(0.008, 0.06, 0.08), std(flagColor, { roughness: 0.4 }), flag, 0, 0.17, 0.035);
  g.door = door;
  g.flag = flag;
  g.setFlag = (up) => (flag.rotation.x = -(1 - up) * Math.PI / 2);
  g.setDoor = (open) => (door.rotation.x = open * 1.6);
  g.setFlag(0);
  return g;
}

// Leather handbag with two handles; origin at the bottom centre.
export function handbag({ color = 0x7a3f2a, w = 0.32, h = 0.22, d = 0.12 } = {}) {
  const g = new THREE.Group();
  const leather = fabricMat(color, { roughness: 0.42, kind: "leather", sheen: 0 });
  // body: rounded box via a squashed capsule-ish shape
  const body = mesh(new THREE.BoxGeometry(w, h, d, 6, 6, 3), leather, g, 0, h / 2, 0);
  const p = body.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // taper the top and puff the sides a little
    const t = (y + h / 2) / h;
    p.setXYZ(i, x * (1 - 0.12 * t), y, z * (1 - 0.35 * t) * (1 + 0.08 * Math.cos((x / w) * Math.PI)));
  }
  body.geometry.computeVertexNormals();
  // flap, clasp, handles
  mesh(new THREE.BoxGeometry(w * 0.9, 0.006, d * 0.7), leather, g, 0, h + 0.002, 0);
  mesh(new THREE.BoxGeometry(0.04, 0.025, 0.006), std(0xd4b25a, { metalness: 0.95, roughness: 0.25 }), g, 0, h * 0.78, d / 2 * 0.86);
  for (const s of [-1, 1]) {
    const handle = mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 24, Math.PI), leather, g, s * w * 0.18, h, 0);
    handle.rotation.y = Math.PI / 2;
    handle.scale.set(1, 1.1, 1);
  }
  return g;
}

// Hats. Origin = centre of the hat opening; sized for an adult head (~0.58 m).
export function hat(type = "cap", { color = 0x223047, bandColor = 0x111111 } = {}) {
  const g = new THREE.Group();
  const cloth = fabricMat(color, { kind: type === "beanie" ? "knit" : "cotton" });
  const R = 0.095;
  if (type === "cap") {
    const crown = mesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), cloth, g);
    crown.scale.set(1, 0.85, 1.12);
    mesh(new THREE.SphereGeometry(0.008, 8, 6), cloth, g, 0, R * 0.85, 0);
    const brim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.006, 32, 1, false, -Math.PI / 2, Math.PI), cloth, g, 0, 0.004, 0.07);
    brim.scale.set(0.9, 1, 0.95);
    brim.rotation.x = 0.12;
  } else if (type === "fedora") {
    const felt = fabricMat(color, { roughness: 0.95, kind: "knit", sheen: 0.5 });
    const crown = mesh(new THREE.CylinderGeometry(R * 0.85, R * 1.02, 0.12, 32), felt, g, 0, 0.06, 0);
    crown.scale.z = 1.15;
    const dent = mesh(new THREE.SphereGeometry(R * 0.82, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), felt, g, 0, 0.11, 0);
    dent.scale.set(1, 0.25, 1.15);
    const brim = mesh(new THREE.CylinderGeometry(R * 1.75, R * 1.75, 0.006, 40), felt, g, 0, 0.004, 0);
    brim.scale.z = 1.12;
    const band = mesh(new THREE.CylinderGeometry(R * 1.03, R * 1.03, 0.025, 32, 1, true), std(bandColor, { roughness: 0.5 }), g, 0, 0.018, 0);
    band.scale.z = 1.15;
  } else if (type === "uniform") {
    const crown = mesh(new THREE.CylinderGeometry(R * 1.12, R, 0.075, 32), cloth, g, 0, 0.04, 0);
    crown.scale.z = 1.12;
    const band = mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.022, 32, 1, true), fabricMat(bandColor, { roughness: 0.4, kind: "leather", sheen: 0 }), g, 0, 0.012, 0);
    band.scale.z = 1.12;
    const visor = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.005, 28, 1, false, -Math.PI / 2, Math.PI), fabricMat(bandColor, { roughness: 0.25, kind: "leather", sheen: 0 }), g, 0, 0.004, 0.06);
    visor.scale.set(0.85, 1, 0.75);
    visor.rotation.x = 0.25;
  } else if (type === "beanie") {
    const crown = mesh(new THREE.SphereGeometry(R * 1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), cloth, g);
    crown.scale.set(1, 1.05, 1.12);
    const fold = mesh(new THREE.TorusGeometry(R * 1.04, 0.018, 10, 32), cloth, g, 0, 0.01, 0);
    fold.rotation.x = Math.PI / 2;
    fold.scale.set(1, 1.12, 1);
  }
  return g;
}

// White picket fence running along +x from the origin. Returns a Group.
export function picketFence(length = 6, { height = 0.95, spacing = 0.14, color = 0xf2efe8 } = {}) {
  const g = new THREE.Group();
  const wood = T.paintedWood(color);
  const n = Math.floor(length / spacing);
  const picket = new THREE.BoxGeometry(0.075, height - 0.06, 0.02);
  const tip = new THREE.ConeGeometry(0.053, 0.08, 4);
  tip.rotateY(Math.PI / 4);
  tip.scale(1, 1, 0.38);
  const pickets = new THREE.InstancedMesh(picket, wood, n);
  const tips = new THREE.InstancedMesh(tip, wood, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const x = i * spacing + spacing / 2;
    m.makeTranslation(x, (height - 0.06) / 2, 0);
    pickets.setMatrixAt(i, m);
    m.makeTranslation(x, height - 0.06 + 0.04, 0);
    tips.setMatrixAt(i, m);
  }
  for (const im of [pickets, tips]) {
    im.castShadow = im.receiveShadow = true;
    g.add(im);
  }
  for (const y of [0.22, height - 0.25]) mesh(new THREE.BoxGeometry(length, 0.07, 0.03), wood, g, length / 2, y, -0.025);
  for (let x = 0; x <= length + 0.01; x += 2) {
    mesh(new THREE.BoxGeometry(0.09, height + 0.06, 0.09), wood, g, x, (height + 0.06) / 2, -0.04);
    mesh(new THREE.BoxGeometry(0.11, 0.03, 0.11), wood, g, x, height + 0.075, -0.04);
  }
  return g;
}
