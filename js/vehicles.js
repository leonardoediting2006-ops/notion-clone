// Code-built everyday vehicles: hatchback, sedan, SUV, minivan, pickup.
// Generic (no brand), realistic materials: clear-coated metallic paint,
// tinted glass, rubber tyres, alloy rims, lights. Call useEnvironment()
// from props.js once so the paint and glass get reflections.
//
//   import { car } from "../../js/vehicles.js";
//   const c = car("suv", { color: 0x8a1c1c });
//   c.position.set(4, 0, 14); c.rotation.y = Math.PI / 2; scene.add(c);
//   c.spinWheels(distanceTravelled);
//
// Cars face +x (front at +x), centred on the origin, wheels on y = 0.

import { THREE } from "./engine.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// piecewise-smooth interpolation through [u, value] keys
function curve(keys) {
  return (u) => {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [u0, v0] = keys[i], [u1, v1] = keys[i + 1];
      if (u <= u1) return v0 + (v1 - v0) * smooth(u0, u1, u);
    }
    return keys[keys.length - 1][1];
  };
}

// Dimensions in metres. u runs 0 (rear) → 1 (front).
// top: height of the body (deck / beltline / hood); roof: greenhouse top over [g0, g1].
const TYPES = {
  hatchback: {
    L: 4.1, W: 1.78, clear: 0.15, wheelR: 0.31, axles: [0.17, 0.8], track: 0.76,
    top: [[0, 0.62], [0.05, 0.95], [0.25, 0.98], [0.66, 0.96], [0.78, 0.88], [0.95, 0.78], [1, 0.55]],
    roof: [[0.04, 1.14], [0.1, 1.42], [0.24, 1.46], [0.55, 1.47], [0.7, 1.32], [0.75, 0.98]],
    g: [0.04, 0.75], pillars: [0.1, 0.42, 0.7], squareness: 5.5,
  },
  sedan: {
    L: 4.75, W: 1.82, clear: 0.14, wheelR: 0.32, axles: [0.2, 0.79], track: 0.78,
    top: [[0, 0.62], [0.04, 0.9], [0.2, 0.95], [0.66, 0.92], [0.8, 0.86], [0.96, 0.76], [1, 0.55]],
    roof: [[0.22, 0.96], [0.32, 1.38], [0.5, 1.44], [0.6, 1.42], [0.7, 1.12], [0.72, 0.93]],
    g: [0.22, 0.72], pillars: [0.33, 0.48, 0.66], squareness: 5.5,
  },
  suv: {
    L: 4.65, W: 1.88, clear: 0.21, wheelR: 0.37, axles: [0.18, 0.8], track: 0.8,
    top: [[0, 0.75], [0.04, 1.08], [0.2, 1.12], [0.68, 1.1], [0.8, 1.04], [0.96, 0.95], [1, 0.72]],
    roof: [[0.03, 1.62], [0.08, 1.72], [0.5, 1.74], [0.66, 1.7], [0.76, 1.12]],
    g: [0.03, 0.76], pillars: [0.08, 0.36, 0.62], squareness: 7.5,
  },
  minivan: {
    L: 5.05, W: 1.95, clear: 0.15, wheelR: 0.34, axles: [0.17, 0.82], track: 0.8,
    top: [[0, 0.7], [0.04, 0.98], [0.2, 1.02], [0.74, 1.0], [0.84, 0.94], [0.97, 0.84], [1, 0.62]],
    roof: [[0.02, 1.6], [0.07, 1.76], [0.55, 1.78], [0.7, 1.72], [0.82, 1.02]],
    g: [0.02, 0.82], pillars: [0.07, 0.34, 0.56, 0.74], squareness: 7,
  },
  pickup: {
    L: 5.4, W: 1.96, clear: 0.24, wheelR: 0.39, axles: [0.17, 0.8], track: 0.82,
    top: [[0, 1.0], [0.03, 1.08], [0.66, 1.1], [0.8, 1.12], [0.95, 1.06], [1, 0.82]],
    roof: [[0.37, 1.12], [0.39, 1.84], [0.56, 1.86], [0.65, 1.78], [0.74, 1.14]],
    g: [0.37, 0.74], pillars: [0.4, 0.55, 0.66], squareness: 8, bed: [0.02, 0.36],
  },
};

const texCache = new Map();
function paintTextures() {
  // fine metallic flake for the paint normal map
  if (texCache.has("flake")) return texCache.get("flake");
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const img = x.createImageData(256, 256);
  let s = 99;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const r = s / 2147483647;
    img.data[i] = 128 + (r - 0.5) * 40;
    s = (s * 16807) % 2147483647;
    img.data[i + 1] = 128 + (s / 2147483647 - 0.5) * 40;
    img.data[i + 2] = 255;
    img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(20, 20);
  texCache.set("flake", t);
  return t;
}

// Body-side texture painted in (u, v) space: door seams, rubbing strip, handles.
function bodyTexture(spec, colorHex) {
  const w = 1024, h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  const col = new THREE.Color(colorHex);
  x.fillStyle = `#${col.getHexString()}`;
  x.fillRect(0, 0, w, h);
  const line = (u, v0, v1) => {
    x.fillStyle = "rgba(0,0,0,0.55)";
    x.fillRect(u * w - 1, v0 * h, 2, (v1 - v0) * h);
  };
  // v runs around the cross-section: 0 bottom-left … 0.5 top … 1 bottom-right.
  // Door seams on both sides between the pillars.
  for (const p of spec.pillars) for (const [a, b] of [[0.08, 0.36], [0.64, 0.92]]) line(p, a, b);
  // handles
  x.fillStyle = `#${col.clone().multiplyScalar(0.75).getHexString()}`;
  for (let i = 0; i < spec.pillars.length - 1; i++) {
    const u = spec.pillars[i + 1] - 0.05;
    x.fillRect(u * w - 14, 0.31 * h, 28, 6);
    x.fillRect(u * w - 14, 0.67 * h, 28, 6);
  }
  // black lower cladding / sills
  x.fillStyle = spec.squareness > 4 ? "#1c1d1f" : `#${col.clone().multiplyScalar(0.6).getHexString()}`;
  x.fillRect(0, 0, w, 0.06 * h);
  x.fillRect(0, 0.94 * h, w, 0.06 * h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Greenhouse texture in (u along length, v around): dark glass with body-colour
// pillars, roof and a black rubber seal around each window.
function glassTexture(spec, colorHex) {
  const w = 1024, h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  const body = `#${new THREE.Color(colorHex).getHexString()}`;
  x.fillStyle = body;
  x.fillRect(0, 0, w, h);
  const [g0, g1] = spec.g;
  const U = (u) => ((u - g0) / (g1 - g0)) * w;
  // side windows: v 0.1..0.38 (one side) and 0.62..0.9 (other side); top 0.38..0.62 is roof
  const sides = [[0.13, 0.33], [0.67, 0.87]];
  const ps = spec.pillars;
  // windscreen + rear screen: whole cross-section near the ends, below the roof
  x.fillStyle = "#0b1015";
  for (const [a, b] of sides) {
    for (let i = 0; i < ps.length - 1; i++) {
      const u0 = U(ps[i]) + 10, u1 = U(ps[i + 1]) - 10;
      x.fillStyle = "#050607";
      x.fillRect(u0 - 4, a * h - 4, u1 - u0 + 8, (b - a) * h + 8);
      x.fillStyle = "#0b1015";
      x.fillRect(u0, a * h, u1 - u0, (b - a) * h);
    }
    // quarter windows between the end pillars and the screens
    x.fillStyle = "#0b1015";
  }
  // front windscreen (front end of the greenhouse) and rear screen
  x.fillStyle = "#0b1015";
  x.fillRect(U(ps[ps.length - 1]) + 14, 0.13 * h, w, 0.74 * h);
  x.fillRect(0, 0.13 * h, U(ps[0]) - 14, 0.74 * h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Loft: stations along x, rounded cross-sections (superellipse) in y/z.
function loft({ L, stations = 90, ring = 56, bottom, top, halfW, n, endRound = 0.18, uv = true, closeEnds = true }) {
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= stations; i++) {
    const u = i / stations;
    const x = (u - 0.5) * L;
    // round off both ends in plan and elevation
    const dEnd = Math.min(u, 1 - u) * L;
    const e = closeEnds ? Math.sqrt(clamp(1 - Math.pow(clamp(1 - dEnd / endRound), 2))) : 1;
    const b = bottom(u), t = top(u);
    const cy = (b + t) / 2, hh = Math.max(0.001, ((t - b) / 2) * (0.78 + 0.22 * e));
    const ww = Math.max(0.001, halfW(u) * (0.84 + 0.16 * e));
    for (let j = 0; j <= ring; j++) {
      // angle from bottom (-π/2) around the left side, over the top, down the right
      const a = -Math.PI / 2 - (j / ring) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pz = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n) * ww;
      const py = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n) * hh + cy;
      pos.push(x, py, pz);
      uvs.push(u, j / ring);
    }
  }
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j, b2 = a + ring + 1;
      idx.push(a, a + 1, b2, a + 1, b2 + 1, b2);
    }
  }
  // end caps: fan from each end ring's centre
  for (const [i, flip] of [[0, true], [stations, false]]) {
    const base = i * (ring + 1);
    let cx = 0, cy = 0;
    for (let j = 0; j < ring; j++) {
      cx += pos[(base + j) * 3 + 1];
    }
    cy = cx / ring;
    const centre = pos.length / 3;
    pos.push(pos[base * 3], cy, 0);
    uvs.push(i / stations, 0.5);
    for (let j = 0; j < ring; j++) {
      if (flip) idx.push(centre, base + j + 1, base + j);
      else idx.push(centre, base + j, base + j + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function wheel(r, width, rimColor = 0xb8bcc2) {
  const g = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.92 });
  const alloy = new THREE.MeshPhysicalMaterial({ color: rimColor, metalness: 0.9, roughness: 0.28, clearcoat: 0.6 });
  // tyre: lathe with a rounded sidewall
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    pts.push(new THREE.Vector2(r * 0.66 + Math.cos(a) * r * 0.34, Math.sin(a) * width / 2));
  }
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), rubber);
  tyre.rotation.x = Math.PI / 2;
  g.add(tyre);
  // rim face + spokes
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.62, width * 0.7, 32), alloy);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  const face = new THREE.Group();
  face.position.z = width * 0.36;
  g.add(face);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.15, 0.03, 20), alloy);
  hub.rotation.x = Math.PI / 2;
  face.add(hub);
  for (let k = 0; k < 5; k++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.52, 0.025), alloy);
    sp.position.set(0, r * 0.36, 0);
    const holder = new THREE.Group();
    holder.rotation.z = (k / 5) * Math.PI * 2;
    holder.add(sp);
    face.add(holder);
  }
  const dark = new THREE.Mesh(new THREE.CircleGeometry(r * 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.8 }));
  dark.position.z = -0.002;
  face.add(dark);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x5a5a5e, metalness: 0.7, roughness: 0.5 }));
  brake.rotation.x = Math.PI / 2;
  brake.position.z = width * 0.1;
  g.add(brake);
  return g;
}

export function car(type = "hatchback", { color = 0x9aa3ad, rimColor = 0xb8bcc2, lightsOn = false } = {}) {
  const spec = TYPES[type];
  if (!spec) throw new Error(`car(): unknown type "${type}" — use ${Object.keys(TYPES).join(", ")}`);
  const g = new THREE.Group();
  g.name = `car-${type}`;
  const { L, W, clear, wheelR: R } = spec;
  const topF = curve(spec.top), roofF = curve(spec.roof);

  const paint = new THREE.MeshPhysicalMaterial({
    map: bodyTexture(spec, color),
    metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04,
    normalMap: paintTextures(), normalScale: new THREE.Vector2(0.06, 0.06),
  });
  const glass = new THREE.MeshPhysicalMaterial({ map: glassTexture(spec, color), metalness: 0.35, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdadde2, metalness: 1, roughness: 0.15 });

  // ---- lower body with wheel arches cut into the sill line
  const arch = (u) => {
    let b = clear;
    for (const ax of spec.axles) {
      const dx = (u - ax) * L;
      const ar = R * 1.12;
      if (Math.abs(dx) < ar) b = Math.max(b, R + Math.sqrt(ar * ar - dx * dx) * 0.92 - R * 0.06);
    }
    return b;
  };
  const halfW = (u) => (W / 2) * (0.9 + 0.1 * Math.sin(Math.PI * clamp(u * 1.1 - 0.05)));
  const body = new THREE.Mesh(loft({ L, stations: 140, ring: 72, bottom: arch, top: topF, halfW, n: spec.squareness, endRound: 0.16 }), paint);
  g.add(body);

  // ---- greenhouse (glass) with painted pillars + roof panel
  const [g0, g1] = spec.g;
  const ghL = (g1 - g0) * L;
  const roofU = (v) => g0 + v * (g1 - g0);
  const gh = loft({
    L: ghL,
    stations: 60,
    bottom: (v) => topF(roofU(v)) - 0.02,
    top: (v) => Math.max(topF(roofU(v)) + 0.01, roofF(roofU(v))),
    halfW: (v) => halfW(roofU(v)) * 0.86,
    n: 5,
    endRound: 0.1,
  });
  const glassMesh = new THREE.Mesh(gh, glass);
  glassMesh.position.x = ((g0 + g1) / 2 - 0.5) * L;
  g.add(glassMesh);

  // ---- pickup bed: dark liner inset into the rear deck
  if (spec.bed) {
    const [b0, b1] = spec.bed;
    const bed = new THREE.Mesh(new THREE.BoxGeometry((b1 - b0) * L, 0.05, W * 0.82), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 }));
    bed.position.set(((b0 + b1) / 2 - 0.5) * L, topF((b0 + b1) / 2) + 0.005, 0);
    g.add(bed);
    // tailgate line + cab back wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, W * 0.84), paint);
    wall.position.set((b1 - 0.5) * L + 0.02, topF(b1) + 0.18, 0);
    g.add(wall);
  }

  // ---- lights, grille, bumpers, mirrors, plates
  const headM = new THREE.MeshPhysicalMaterial({ color: lightsOn ? 0xfff6dd : 0xdfe6ee, emissive: lightsOn ? 0xfff2cc : 0x000000, emissiveIntensity: 2, metalness: 0.3, roughness: 0.05, clearcoat: 1 });
  const tailM = new THREE.MeshPhysicalMaterial({ color: 0x8a0d10, emissive: lightsOn ? 0xff1010 : 0x220000, emissiveIntensity: 1.5, roughness: 0.1, clearcoat: 1 });
  const frontX = L / 2, rearX = -L / 2;
  const hY = topF(0.97) - 0.08, tY = topF(0.03) - 0.1;
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.32), headM);
    hl.position.set(frontX - 0.045, hY, s * W * 0.33);
    hl.rotation.y = s * -0.25;
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, spec.squareness > 4 ? 0.28 : 0.12, 0.3), tailM);
    tl.position.set(rearX + 0.05, tY, s * W * 0.35);
    tl.rotation.y = s * 0.25;
    g.add(tl);
    // mirrors at the base of the A-pillar
    const au = spec.pillars[spec.pillars.length - 1];
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.16), paint);
    mirror.position.set((au - 0.5) * L - 0.05, topF(au) + 0.08, s * (halfW(au) + 0.08));
    g.add(mirror);
    const glassM = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), chrome);
    glassM.position.set(mirror.position.x - 0.062, mirror.position.y, mirror.position.z);
    glassM.rotation.y = -Math.PI / 2;
    g.add(glassM);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, spec.squareness > 4 ? 0.26 : 0.14, W * 0.42), trim);
  grille.position.set(frontX - 0.05, hY - (spec.squareness > 4 ? 0.06 : 0.02), 0);
  g.add(grille);
  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, W * 0.55), trim);
  lowerGrille.position.set(frontX - 0.04, clear + 0.17, 0);
  g.add(lowerGrille);
  for (const [px, sx] of [[frontX - 0.02, 1], [rearX + 0.02, -1]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, W * 0.78), trim);
    bumper.position.set(px - sx * 0.03, clear + 0.08, 0);
    g.add(bumper);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.48), new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.4 }));
    plate.position.set(px + sx * 0.012, sx > 0 ? clear + 0.24 : tY - 0.17, 0);
    g.add(plate);
  }

  // ---- wheels
  g.wheels = [];
  const tw = 0.21;
  for (const ax of spec.axles) {
    for (const s of [-1, 1]) {
      const wh = wheel(R, tw, rimColor);
      wh.position.set((ax - 0.5) * L, R, s * (W / 2 - tw / 2 - 0.02));
      if (s < 0) wh.rotation.y = Math.PI;
      g.add(wh);
      g.wheels.push(wh);
    }
  }
  // shadow catcher under the car
  const under = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.9, W * 0.85), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = 0.01;
  g.add(under);

  g.traverse((o) => {
    if (o.isMesh && o !== under) o.castShadow = o.receiveShadow = true;
  });
  g.spinWheels = (distance) => {
    for (const wh of g.wheels) wh.children.forEach(() => {});
    for (const wh of g.wheels) wh.rotation.z = -distance / R * (wh.rotation.y ? -1 : 1);
  };
  g.size = new THREE.Vector3(L, roofF(0.5), W);
  return g;
}

export const CAR_TYPES = Object.keys(TYPES);
