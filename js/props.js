// Props: downloaded models (furniture, decor, vehicles) + code-built realistic
// props (mailbox, handbag, hats, picket fence, bathroom fixtures). See assets/CREDITS.md.
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
import { Reflector } from "../lib/jsm/objects/Reflector.js";

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
  RubberDuck: "props/RubberDuck.glb", // Khronos "Duck" (SCEA Shared Source License, see props/LICENSE-SCEA.txt)
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

// Reflections taken from the real scene: a cube camera at `position` photographs
// the surroundings (sky, houses, trees…) so cars/glass reflect what is around them.
// Call after everything is loaded (e.g. on the first onUpdate frame).
export function captureEnvironment(renderer, scene, position, { size = 128, far = 600 } = {}) {
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.1, far, rt);
  cam.position.copy(position);
  scene.add(cam);
  const prev = scene.environment;
  const prevShadow = renderer.shadowMap.autoUpdate;
  scene.environment = null;
  renderer.shadowMap.autoUpdate = false; // reuse the current shadow map for all 6 faces
  cam.update(renderer, scene);
  renderer.shadowMap.autoUpdate = prevShadow;
  scene.environment = prev;
  scene.remove(cam);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromCubemap(rt.texture).texture;
  pmrem.dispose();
  rt.dispose();
  return env;
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

// ---------------------------------------------------------------- bathroom
const ceramic = () => new THREE.MeshPhysicalMaterial({ color: 0xf6f5f1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 });
const chrome = () => std(0xe8e8e8, { metalness: 1, roughness: 0.08 });
// open bowl from a lathe profile: [radius, height] pairs from the bottom outside, over the rim, back down inside
function bowl(rBottom, rTop, h, wall, mat, parent) {
  const pts = [
    [0.001, 0], [rBottom, 0], [rBottom * 1.05, h * 0.2], [rTop * 0.95, h * 0.8], [rTop, h], [rTop - wall, h],
    [rTop - wall * 1.3, h * 0.85], [rBottom * 0.8, h * 0.25], [0.001, h * 0.18],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return mesh(new THREE.LatheGeometry(pts, 40), mat, parent);
}

// Toilet with the lid down; back against the wall at z = 0, faces +z.
export function toilet() {
  const g = new THREE.Group();
  const c = ceramic();
  mesh(new THREE.BoxGeometry(0.46, 0.36, 0.18, 2, 2, 2), c, g, 0, 0.62, 0.1);
  mesh(new THREE.BoxGeometry(0.49, 0.035, 0.21), c, g, 0, 0.815, 0.1); // tank lid
  mesh(new THREE.BoxGeometry(0.06, 0.018, 0.03), chrome(), g, -0.17, 0.74, 0.205); // flush lever
  const base = mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.3, 28), c, g, 0, 0.15, 0.36);
  base.scale.z = 1.35;
  const b = bowl(0.13, 0.2, 0.16, 0.025, c, g);
  b.position.set(0, 0.25, 0.38);
  b.scale.z = 1.3;
  const seat = mesh(new THREE.TorusGeometry(0.17, 0.028, 12, 36), c, g, 0, 0.425, 0.39);
  seat.rotation.x = Math.PI / 2;
  seat.scale.set(1, 1.3, 0.5);
  const lid = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 36), c, g, 0, 0.45, 0.39);
  lid.scale.z = 1.28;
  mesh(new THREE.BoxGeometry(0.3, 0.03, 0.06), c, g, 0, 0.44, 0.2); // hinge block
  return g;
}

// Vanity cabinet with a vessel sink and chrome tap; back against the wall at z = 0.
export function vanity({ width = 0.9, color = 0x41566b, top = 0xe8e4dc } = {}) {
  const g = new THREE.Group();
  const wood = T.paintedWood(color);
  const D = 0.5, H = 0.82;
  mesh(new THREE.BoxGeometry(width, H - 0.1, D), wood, g, 0, (H - 0.1) / 2 + 0.1, D / 2);
  mesh(new THREE.BoxGeometry(width - 0.06, 0.1, D - 0.06), std(0x1e1e1e, { roughness: 0.8 }), g, 0, 0.05, D / 2 - 0.02); // toe kick
  // two doors with a seam and handles
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(width / 2 - 0.04, H - 0.18, 0.02), wood, g, s * width / 4, (H - 0.18) / 2 + 0.13, D + 0.01);
    const h = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 10), std(0xc9b27a, { metalness: 1, roughness: 0.3 }), g, s * 0.05, H - 0.2, D + 0.035);
    h.position.x = s * 0.05;
  }
  mesh(new THREE.BoxGeometry(width + 0.04, 0.04, D + 0.03), T.concrete({ tile: 1, repeat: [1, 1], color: top }), g, 0, H + 0.02, D / 2 + 0.01);
  const sink = bowl(0.12, 0.2, 0.13, 0.015, ceramic(), g);
  sink.position.set(0, H + 0.04, D / 2 + 0.03);
  sink.scale.z = 0.8;
  // tap: vertical post + curved spout
  mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.26, 16), chrome(), g, 0, H + 0.17, 0.1);
  const spout = mesh(new THREE.TorusGeometry(0.07, 0.014, 10, 20, Math.PI), chrome(), g, 0, H + 0.3, 0.17);
  spout.rotation.y = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 12), chrome(), g, 0.06, H + 0.27, 0.1).rotation.z = Math.PI / 2;
  g.userData.basin = new THREE.Vector3(0, H + 0.12, D / 2 + 0.03); // centre of the sink bowl
  return g;
}

// Rectangular mirror with a thin frame, centre at the origin, facing +z. A real reflection
// (the scene rendered again from the mirrored camera) unless { real: false }.
export function mirror(w = 0.8, h = 1.0, { frame = 0x2a2a2a, real = true, resolution = 512 } = {}) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.03), std(frame, { metalness: 0.6, roughness: 0.35 }), g, 0, 0, 0.015);
  const geo = new THREE.PlaneGeometry(w, h);
  const glass = real
    ? new Reflector(geo, { textureWidth: resolution, textureHeight: Math.round((resolution * h) / w), color: 0xd8d8d8, clipBias: 0.003 })
    : new THREE.Mesh(geo, std(0xffffff, { metalness: 1, roughness: 0.03 }));
  glass.position.z = 0.032;
  g.add(glass);
  g.userData.glass = glass;
  return g;
}

// Built-in bathtub: footprint w (x) by d (z), origin at the floor centre.
export function bathtub({ w = 1.7, d = 0.75, h = 0.55 } = {}) {
  const g = new THREE.Group();
  const c = ceramic();
  const t = 0.08;
  mesh(new THREE.BoxGeometry(w, h, t), c, g, 0, h / 2, d / 2 - t / 2);
  mesh(new THREE.BoxGeometry(w, h, t), c, g, 0, h / 2, -d / 2 + t / 2);
  mesh(new THREE.BoxGeometry(t, h, d), c, g, w / 2 - t / 2, h / 2, 0);
  mesh(new THREE.BoxGeometry(t, h, d), c, g, -w / 2 + t / 2, h / 2, 0);
  mesh(new THREE.BoxGeometry(w - t, 0.12, d - t), c, g, 0, 0.06, 0);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16), chrome(), g, -w / 2 + 0.25, 0.125, 0); // drain
  const spout = mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.16, 12), chrome(), g, -w / 2 + 0.04, h + 0.06, 0);
  spout.rotation.z = Math.PI / 2;
  return g;
}

// Terry towel hanging over a rail (rail along x at the origin, towel hangs down both sides).
export function towel({ color = 0xf1ece2, w = 0.5, h = 0.55, rail = true } = {}) {
  const g = new THREE.Group();
  const cloth = fabricMat(color, { roughness: 1, kind: "knit", sheen: 0.6 });
  for (const s of [-1, 1]) {
    const p = mesh(new THREE.BoxGeometry(w, h, 0.012, 1, 8, 1), cloth, g, 0, -h / 2, s * 0.022);
    const pos = p.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + Math.sin((pos.getY(i) / h + 0.5) * Math.PI) * 0.01 * s);
    p.geometry.computeVertexNormals();
  }
  const top = mesh(new THREE.CylinderGeometry(0.03, 0.03, w, 16, 1, false, 0, Math.PI), cloth, g, 0, 0, 0);
  top.rotation.z = Math.PI / 2;
  top.rotation.x = -Math.PI / 2;
  if (rail) {
    const r = mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.2, 12), chrome(), g, 0, 0, 0);
    r.rotation.z = Math.PI / 2;
  }
  return g;
}

// Small folded hand towel draped over something (e.g. carried in a dog's mouth). Origin at the fold.
export function handTowel({ color = 0xf1ece2, w = 0.34, l = 0.36 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, 0.02, l, 8, 1, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, pos.getY(i) - Math.abs(x / w) ** 1.6 * 0.22 + Math.sin(z * 18) * 0.006);
  }
  geo.computeVertexNormals();
  mesh(geo, fabricMat(color, { roughness: 1, kind: "knit", sheen: 0.6 }), g);
  return g;
}

export function rubberDuck(size = 0.12) {
  const g = new THREE.Group();
  const yellow = new THREE.MeshPhysicalMaterial({ color: 0xffd21f, roughness: 0.35, clearcoat: 0.6 });
  const body = mesh(new THREE.SphereGeometry(0.5, 24, 16), yellow, g, 0, 0.38, 0);
  body.scale.set(0.85, 0.7, 1.1);
  mesh(new THREE.SphereGeometry(0.32, 20, 14), yellow, g, 0, 0.9, 0.22);
  const beak = mesh(new THREE.SphereGeometry(0.16, 16, 10), std(0xff7a1a, { roughness: 0.4 }), g, 0, 0.85, 0.52);
  beak.scale.set(1.2, 0.5, 1);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0x111111, { roughness: 0.2 }), g, s * 0.16, 0.98, 0.45);
  g.scale.setScalar(size);
  return g;
}

export function toiletPaper() {
  const g = new THREE.Group();
  const roll = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.11, 24), fabricMat(0xfbfbf8, { roughness: 1 }), g);
  roll.rotation.z = Math.PI / 2;
  const bar = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 10), chrome(), g);
  bar.rotation.z = Math.PI / 2;
  return g;
}

// Bath mat (fluffy rectangle on the floor)
export function bathMat({ color = 0x9fb8c8, w = 0.8, d = 0.5 } = {}) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(w, 0.018, d, 4, 1, 4), fabricMat(color, { roughness: 1, kind: "knit", sheen: 0.8 }), g, 0, 0.009, 0);
  return g;
}

// ---------------------------------------------------------------- living room
const woodMat = (c = 0x6b4a2e) => T.paintedWood(c);
const BOOK_COLORS = [0x7a2e2e, 0x2e4a7a, 0x2f6b4a, 0xc9a24a, 0x3b3b3b, 0x8a5a9a, 0xd8d0c0, 0xb5532f, 0x1f5f6b, 0x6b6b2f];
// Bookcase full of books (open front faces +z), origin at the floor centre of its back.
export function bookshelf({ w = 1.2, h = 1.9, d = 0.34, shelves = 5, color = 0x5a3d28, seed = 3 } = {}) {
  let s = seed * 7919 + 1;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = new THREE.Group();
  const wood = woodMat(color);
  for (const x of [-w / 2, w / 2]) mesh(new THREE.BoxGeometry(0.03, h, d), wood, g, x, h / 2, d / 2);
  mesh(new THREE.BoxGeometry(w, h, 0.015), wood, g, 0, h / 2, 0.008);
  const step = (h - 0.04) / shelves;
  for (let i = 0; i <= shelves; i++) mesh(new THREE.BoxGeometry(w, 0.025, d), wood, g, 0, 0.012 + i * step, d / 2);
  for (let i = 0; i < shelves; i++) {
    const y0 = 0.025 + i * step;
    let x = -w / 2 + 0.03;
    while (x < w / 2 - 0.08) {
      if (r() < 0.12) { x += 0.06 + r() * 0.1; continue; } // gaps
      if (r() < 0.08 && x < w / 2 - 0.25) { // a small potted plant or vase
        const pot = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 14), std([0xd8d0c4, 0x8a5a3a, 0x3d5a6b][Math.floor(r() * 3)], { roughness: 0.4 }), g, x + 0.06, y0 + 0.045, d / 2);
        mesh(new THREE.SphereGeometry(0.065, 10, 8), std(0x3f7a3a, { roughness: 0.9 }), g, pot.position.x, y0 + 0.13, d / 2).scale.y = 0.8;
        x += 0.14;
        continue;
      }
      const bw = 0.025 + r() * 0.025, bh = step * (0.62 + r() * 0.3), bd = d * (0.7 + r() * 0.2);
      const book = mesh(new THREE.BoxGeometry(bw, bh, bd), std(BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], { roughness: 0.7 }), g, x + bw / 2, y0 + bh / 2, d - bd / 2 - 0.01);
      if (r() < 0.06) { book.rotation.z = -0.25; book.position.x += 0.02; }
      x += bw + 0.002;
    }
  }
  return g;
}

// Low TV cabinet with a flat-screen TV, soundbar and a little plant. Faces +z.
export function tvUnit({ w = 1.6, screen = 1.25 } = {}) {
  const g = new THREE.Group();
  const wood = woodMat(0x3a2a20);
  mesh(new THREE.BoxGeometry(w, 0.45, 0.42), wood, g, 0, 0.27, 0.21);
  for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), std(0x222222), g, x, 0.025, 0.21);
  for (let i = 0; i < 3; i++) {
    mesh(new THREE.BoxGeometry(w / 3 - 0.02, 0.38, 0.01), woodMat(0x4a3628), g, -w / 3 + i * (w / 3), 0.27, 0.425);
    mesh(new THREE.BoxGeometry(0.08, 0.012, 0.012), std(0xb9a27a, { metalness: 0.9, roughness: 0.3 }), g, -w / 3 + i * (w / 3), 0.42, 0.435);
  }
  const sh = screen * 9 / 16;
  const tv = new THREE.Group();
  tv.position.set(0, 0.5 + 0.06 + sh / 2, 0.2);
  g.add(tv);
  mesh(new THREE.BoxGeometry(screen + 0.02, sh + 0.02, 0.04), std(0x101010, { roughness: 0.4 }), tv);
  const glass = mesh(new THREE.PlaneGeometry(screen - 0.01, sh - 0.01), new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }), tv, 0, 0, 0.021);
  glass.castShadow = false;
  mesh(new THREE.BoxGeometry(0.3, 0.02, 0.18), std(0x151515), g, 0, 0.51, 0.2);
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), std(0x151515), g, 0, 0.53, 0.2);
  mesh(new THREE.BoxGeometry(0.75, 0.06, 0.08), fabricMat(0x222222), g, 0, 0.53, 0.37); // soundbar
  const pot = mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.14, 16), std(0xe8e2d6, { roughness: 0.35 }), g, w / 2 - 0.15, 0.57, 0.2);
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.025, 0.28, 5), std(0x356b36, { roughness: 0.8 }), g, pot.position.x, 0.72, 0.2);
    leaf.rotation.set(Math.cos(i * 2.4) * 0.35, 0, Math.sin(i * 2.4) * 0.35);
  }
  return g;
}

// Wooden coffee table with a mug, magazines and a remote. Top at ~0.42 m.
export function coffeeTable({ w = 1.05, d = 0.55 } = {}) {
  const g = new THREE.Group();
  const wood = woodMat(0x7a5536);
  mesh(new THREE.BoxGeometry(w, 0.05, d), wood, g, 0, 0.4, 0);
  mesh(new THREE.BoxGeometry(w - 0.1, 0.025, d - 0.1), wood, g, 0, 0.12, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.BoxGeometry(0.05, 0.38, 0.05), wood, g, x * (w / 2 - 0.05), 0.19, z * (d / 2 - 0.05));
  const mug = mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 18), std(0xc8463a, { roughness: 0.35 }), g, w / 2 - 0.2, 0.47, 0.05);
  mesh(new THREE.TorusGeometry(0.025, 0.007, 6, 14), mug.material, g, mug.position.x + 0.045, 0.47, 0.05).rotation.y = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const mag = mesh(new THREE.BoxGeometry(0.21, 0.008, 0.28), std([0x2c6fb0, 0xe0d4b0, 0xb03a5a][i], { roughness: 0.5 }), g, -w / 4, 0.43 + i * 0.008, 0);
    mag.rotation.y = i * 0.25 - 0.2;
  }
  mesh(new THREE.BoxGeometry(0.045, 0.02, 0.17), std(0x1b1b1b, { roughness: 0.5 }), g, 0.05, 0.435, -0.12).rotation.y = 0.4; // remote
  // lower shelf: a basket of blankets
  mesh(new THREE.BoxGeometry(0.35, 0.12, 0.28), fabricMat(0xd9cfbd, { kind: "knit" }), g, 0.2, 0.19, 0);
  return g;
}

// Floor lamp with a fabric shade that glows; add the returned .light to the scene yourself if wanted.
export function floorLamp({ h = 1.6, color = 0xf3e6cc } = {}) {
  const g = new THREE.Group();
  const metal = std(0x2b2b2b, { metalness: 0.7, roughness: 0.4 });
  mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), metal, g, 0, 0.015, 0);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 10), metal, g, 0, h / 2, 0);
  const shade = mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 28, 1, true), new THREE.MeshStandardMaterial({ color, emissive: 0xffc98a, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.9 }), g, 0, h, 0);
  shade.castShadow = false;
  const light = new THREE.PointLight(0xffd29a, 3, 4, 1.6);
  light.position.set(0, h - 0.05, 0);
  g.add(light);
  g.light = light;
  return g;
}

// Round wall clock (face +z). Pass the time of day in hours to set the hands.
export function wallClock({ r = 0.17, hours = 17.2 } = {}) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(r, r, 0.04, 40).rotateX(Math.PI / 2), std(0x222222, { roughness: 0.4 }), g, 0, 0, 0.02);
  mesh(new THREE.CircleGeometry(r * 0.9, 40), std(0xf6f2ea, { roughness: 0.6 }), g, 0, 0, 0.041);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    mesh(new THREE.BoxGeometry(0.008, i % 3 ? 0.02 : 0.035, 0.003), std(0x222222), g, Math.sin(a) * r * 0.78, Math.cos(a) * r * 0.78, 0.043).rotation.z = -a;
  }
  const hand = (len, wdt, a, z) => {
    const m = mesh(new THREE.BoxGeometry(wdt, len, 0.004).translate(0, len / 2, 0), std(0x111111), g, 0, 0, z);
    m.rotation.z = -a;
  };
  hand(r * 0.5, 0.012, ((hours % 12) / 12) * Math.PI * 2, 0.046);
  hand(r * 0.75, 0.008, ((hours % 1)) * Math.PI * 2, 0.05);
  return g;
}

// Throw pillow (soft box), lying with its face toward +z.
export function cushion({ color = 0xc9783a, w = 0.42, h = 0.42 } = {}) {
  const geo = new THREE.BoxGeometry(w, h, 0.14, 8, 8, 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    p.setZ(i, p.getZ(i) * (1 - 0.75 * Math.max(Math.abs(x), Math.abs(y)) ** 3));
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  mesh(geo, fabricMat(color, { kind: "knit", sheen: 0.6 }), g);
  return g;
}

// Picture frame with a canvas painted in code (abstract / landscape / sunset), face +z.
export function wallArt({ w = 0.6, h = 0.8, style = "abstract", frame = 0x2a1d14, seed = 1 } = {}) {
  let s = seed * 104729 + 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const c = document.createElement("canvas");
  c.width = 256; c.height = Math.round(256 * h / w);
  const x = c.getContext("2d");
  if (style === "sunset") {
    const gr = x.createLinearGradient(0, 0, 0, c.height);
    gr.addColorStop(0, "#f2a65a"); gr.addColorStop(0.55, "#e2604a"); gr.addColorStop(0.56, "#2d3e5c"); gr.addColorStop(1, "#18223a");
    x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#ffe0a0"; x.beginPath(); x.arc(c.width / 2, c.height * 0.55, 40, Math.PI, 0); x.fill();
  } else if (style === "landscape") {
    x.fillStyle = "#bcd7e6"; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = ["#7c9a8a", "#5e7e6b", "#45634f", "#2f4a3a"][i];
      x.beginPath(); x.moveTo(0, c.height);
      for (let k = 0; k <= 8; k++) x.lineTo((k / 8) * c.width, c.height * (0.35 + i * 0.15) + Math.sin(k * 1.7 + i) * 18);
      x.lineTo(c.width, c.height); x.fill();
    }
  } else {
    x.fillStyle = "#efe7da"; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 7; i++) {
      x.fillStyle = ["#d9643a", "#2f5d7c", "#e8b44a", "#1f2a33", "#9bb7a8"][Math.floor(r() * 5)];
      x.globalAlpha = 0.85;
      if (r() < 0.5) { x.beginPath(); x.arc(r() * c.width, r() * c.height, 20 + r() * 50, 0, Math.PI * 2); x.fill(); }
      else x.fillRect(r() * c.width * 0.7, r() * c.height * 0.8, 30 + r() * 90, 10 + r() * 70);
    }
    x.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.035), woodMat(frame), g, 0, 0, 0.018);
  mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), g, 0, 0, 0.037);
  return g;
}

// A pair of shoes on the floor (toes toward +z)
export function shoes({ color = 0x3b2a20 } = {}) {
  const g = new THREE.Group();
  const lea = fabricMat(color, { roughness: 0.45, kind: "leather", sheen: 0 });
  for (const s of [-1, 1]) {
    const shoe = mesh(new THREE.CapsuleGeometry(0.045, 0.17, 6, 12).rotateX(Math.PI / 2), lea, g, s * 0.07, 0.04, 0);
    shoe.scale.set(1, 0.75, 1);
    mesh(new THREE.BoxGeometry(0.09, 0.015, 0.27), std(0x1a1a1a), g, s * 0.07, 0.008, 0);
  }
  return g;
}
