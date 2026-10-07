// Reusable realistic human template.
//
//   import { createHuman } from "../../js/human.js";
//   const guy = createHuman({ top: { type: "polo", color: 0x8fb0d0 }, hair: { style: "short" } });
//   scene.add(guy);
//   guy.walk(t * 7, 0.5);       // or guy.sit(), guy.resetPose(), guy.blink(1)
//
// Everything is built in code: a sculpted head (nose, brow, cheekbones, lips,
// chin), painted skin texture (brows, lip colour, redness, stubble), eyeballs
// with lids, a shaped body with knees/elbows/fingers, and swappable clothes,
// hair, hats and glasses. Characters face +z, feet at y = 0.

import { THREE } from "./engine.js";
import * as T from "./textures.js";

// ---------------------------------------------------------------- utils
const g = (v) => Math.exp(-v * v);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const col = (c) => new THREE.Color(c);

function hash(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

function merge(target, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && target[k] && typeof target[k] === "object") merge(target[k], src[k]);
    else target[k] = src[k];
  }
  return target;
}

const DEFAULTS = {
  height: 1.78,
  build: 1, // 0.85 slim … 1.25 heavy
  body: "male", // "male" | "female"
  skin: 0xe2b596,
  eyes: 0x5a3b22,
  face: { nose: 1, jaw: 1, chin: 1, lips: 1, brow: 1, cheeks: 1 },
  hair: { style: "short", color: 0x3b2a1e }, // short | buzz | long | ponytail | balding | bald
  beard: "none", // none | stubble | beard | mustache
  top: { type: "tshirt", color: 0x8fb0d0 }, // tshirt | polo | shirt | hoodie | sweater
  bottom: { type: "jeans", color: 0x34466b }, // jeans | pants | shorts | skirt
  shoes: { type: "sneakers", color: 0xf2f2f2 }, // sneakers | shoes | boots
  hat: null, // { type: "cap" | "uniform" | "beanie", color }
  glasses: null, // { color }
};

// --------------------------------------------------------- head shape
// Sculpt a point on the unit sphere (x, y, z) into a head. y up, z forward.
function headShape(o) {
  const F = o.face;
  const fem = o.body === "female";
  const W = fem ? 0.07 : 0.074, HH = fem ? 0.112 : 0.117, D = fem ? 0.094 : 0.097;
  const jawTaper = (fem ? 0.36 : 0.27) - 0.07 * (F.jaw - 1);
  return (x, y, z) => {
    const ax = Math.abs(x);
    const front = smooth(0.15, 0.85, z);
    let px = x * W, py = y * HH, pz = z * D;
    // narrower lower face, round cranium, nape tucks in
    px *= 1 - jawTaper * smooth(0.05, -0.95, y);
    if (z < 0) {
      pz *= 1 + 0.07 * smooth(-0.2, 0.6, y);
      pz *= 1 - 0.32 * smooth(-0.15, -0.95, y);
    }
    if (z > 0) pz *= 1 - 0.2 * ax * ax * smooth(0, 0.6, z); // flatter face
    pz -= 0.01 * smooth(0.45, 1, y); // crown sits back
    pz += 0.009 * g(x / 0.7) * g((y + 0.5) / 0.32) * front; // muzzle forward
    px += (fem ? 0.002 : 0.006) * F.jaw * Math.sign(x) * g((y + 0.62) / 0.13) * g((z + 0.05) / 0.45) * smooth(0.5, 0.9, ax);
    // brow ridge, eye sockets, cheekbones
    pz += (fem ? 0.0035 : 0.006) * F.brow * g(x / 0.62) * g((y - 0.14) / 0.07) * front;
    pz -= 0.0085 * g((ax - 0.4) / 0.16) * g((y - 0.02) / 0.1) * front;
    pz += 0.0045 * F.cheeks * g((ax - 0.55) / 0.16) * g((y + 0.15) / 0.12) * front;
    px += 0.003 * F.cheeks * Math.sign(x) * g((ax - 0.8) / 0.15) * g((y + 0.12) / 0.15);
    // nose: bridge → tip → base, wings
    const nScale = (fem ? 0.82 : 1) * F.nose;
    const nh = 0.021 * nScale * Math.pow(smooth(0.1, -0.28, y), 1.4) * (1 - 0.9 * smooth(-0.27, -0.37, y));
    const nw = 0.075 + 0.13 * smooth(0.0, -0.32, y);
    pz += nh * g(x / nw) * front;
    pz += 0.0075 * nScale * g((ax - 0.16) / 0.075) * g((y + 0.31) / 0.05) * front;
    // lips + mouth line + chin
    const L = F.lips * (fem ? 1.2 : 1);
    pz += 0.0055 * L * g(x / 0.3) * g((y + 0.535) / 0.05) * front;
    pz += 0.006 * L * g(x / 0.25) * g((y + 0.63) / 0.045) * front;
    pz -= 0.003 * g(x / 0.3) * g((y + 0.583) / 0.016) * front;
    pz -= 0.004 * g((y + 0.71) / 0.04) * g(x / 0.4) * front; // groove under lip
    pz += 0.009 * F.chin * g(x / (fem ? 0.3 : 0.38)) * g((y + 0.85) / 0.1) * front;
    py -= 0.008 * F.chin * g(x / 0.4) * g((y + 0.92) / 0.08) * front;
    return [px, py, pz];
  };
}

// Paint the head texture in sphere-UV space (u = azimuth, v = polar).
function paintHead(o, w = 2048, h = 1024) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const skin = col(o.skin), lip = col(o.skin).lerp(col(0xb5545a), 0.5);
  const brow = col(o.hair.style === "bald" ? 0x5a4636 : o.hair.color).multiplyScalar(0.8);
  const hairC = col(o.hair.color);
  const red = col(0xd06a5a);
  const fem = o.body === "female";
  const stubble = o.beard === "stubble" || o.beard === "beard" || o.beard === "mustache";
  const hairMask = hairMaskFn(o.hair.style);
  const out = new THREE.Color();
  for (let j = 0; j < h; j++) {
    const th = (Math.PI * (j + 0.5)) / h;
    const st = Math.sin(th), y = Math.cos(th);
    for (let i = 0; i < w; i++) {
      const ph = (2 * Math.PI * (i + 0.5)) / w;
      const x = -Math.cos(ph) * st, z = Math.sin(ph) * st;
      const ax = Math.abs(x);
      const front = smooth(0.15, 0.85, z);
      out.copy(skin);
      // pores / blotchy variation
      const n = vnoise(x * 18, y * 18, z * 18) * 0.6 + vnoise(x * 70, y * 70, z * 70) * 0.4;
      out.multiplyScalar(0.94 + n * 0.1);
      // natural redness: cheeks, nose tip, around the eyes
      const r = 0.08 * g((ax - 0.5) / 0.18) * g((y + 0.22) / 0.16) * front + 0.08 * g(x / 0.12) * g((y + 0.3) / 0.08) * front;
      out.lerp(red, r);
      // eye-socket shading + lid crease
      out.multiplyScalar(1 - 0.16 * g((ax - 0.4) / 0.2) * g((y - 0.02) / 0.12) * front);
      // lips
      const lipU = g(x / 0.27) > 0.4 && Math.abs(y + 0.545) < 0.028 * (1 - (ax / 0.3) ** 2) + 0.004;
      const lipL = Math.abs(y + 0.625) < 0.038 * Math.max(0, 1 - (ax / 0.26) ** 2);
      if ((lipU || lipL) && front > 0.5) out.lerp(lip, fem ? 0.85 : 0.6);
      if (front > 0.5 && Math.abs(y + 0.583) < 0.006 && ax < 0.27) out.multiplyScalar(0.55);
      // eyebrows: short strokes along an arch
      const arch = 0.155 + 0.05 * Math.sin(clamp((ax - 0.16) / 0.48) * Math.PI) - 0.02 * clamp((ax - 0.16) / 0.48);
      const bw = (fem ? 0.028 : 0.04) * (1 - 0.5 * clamp((ax - 0.16) / 0.48));
      if (ax > 0.14 && ax < 0.66 && Math.abs(y - arch) < bw && front > 0.4) {
        const strand = vnoise(x * 300, y * 40, z * 60);
        if (strand > 0.35) out.lerp(brow, 0.85);
      }
      // stubble / beard shadow
      if (stubble) {
        const jaw = smooth(-0.2, -0.38, y) * (o.beard === "mustache" ? 0 : 1) * smooth(-0.85, -0.5, x * 0 + z) * (1 - smooth(-0.7, -0.95, y) * 0);
        const must = g(x / 0.32) * g((y + 0.47) / 0.04) * front;
        const m = clamp(Math.max(jaw * smooth(0.95, 0.75, ax + (y < -0.5 ? 0 : 0.2)), must));
        const notLips = !((lipU || lipL) && front > 0.5);
        if (m > 0.05 && notLips && hash(i, j, 1) < 0.5 * m) out.lerp(hairC, 0.55);
      }
      // scalp under hair takes the hair colour
      const hm = hairMask(x, y, z);
      if (hm > 0.3) out.lerp(hairC.clone().multiplyScalar(0.7), clamp((hm - 0.3) * 2));
      const k = (j * w + i) * 4;
      img.data[k] = clamp(out.r) * 255;
      img.data[k + 1] = clamp(out.g) * 255;
      img.data[k + 2] = clamp(out.b) * 255;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function hairMaskFn(style) {
  if (style === "bald") return () => 0;
  return (x, y, z) => {
    const ax = Math.abs(x);
    let line = lerp(-0.62, style === "long" || style === "ponytail" ? 0.5 : 0.44, smooth(-0.7, 0.85, z));
    // clear around the ears, keep a sideburn
    const ear = g((ax - 0.95) / 0.12) * g(z / 0.32);
    line = lerp(line, 0.06, ear);
    const burn = g((ax - 0.92) / 0.1) * g((z - 0.26) / 0.1);
    line = lerp(line, -0.2, burn);
    let m = smooth(line - 0.035, line + 0.035, y);
    if (style === "balding") m *= 1 - smooth(0.32, 0.55, y) * smooth(-0.4, 0.2, z);
    return m;
  };
}

function hairTexture(o, maskFn = null, rough = 0.25) {
  const w = 1024, h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const base = col(o.hair.color);
  const mask = maskFn ?? hairMaskFn(o.hair.style);
  for (let j = 0; j < h; j++) {
    const th = (Math.PI * (j + 0.5)) / h;
    const st = Math.sin(th), y = Math.cos(th);
    for (let i = 0; i < w; i++) {
      const ph = (2 * Math.PI * (i + 0.5)) / w;
      const x = -Math.cos(ph) * st, z = Math.sin(ph) * st;
      // strands run crown → down, i.e. along the meridians
      const s1 = vnoise(ph * 120, th * 6, 0.5), s2 = vnoise(ph * 420, th * 14, 3.3);
      const s3 = vnoise(ph * 900, th * 30, 7.1);
      const shade = 0.5 + s1 * 0.45 + (s2 - 0.5) * 0.5 + (s3 - 0.5) * 0.35;
      const m = mask(x, y, z) + (s2 - 0.5) * rough * 2 + (hash(i, j, 9) - 0.5) * rough;
      const k = (j * w + i) * 4;
      img.data[k] = clamp(base.r * shade * 1.05) * 255;
      img.data[k + 1] = clamp(base.g * shade) * 255;
      img.data[k + 2] = clamp(base.b * shade) * 255;
      img.data[k + 3] = m > 0.5 ? 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function irisTexture(color) {
  const w = 256, h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#f3efe8";
  x.fillRect(0, 0, w, h);
  // faint veins toward the edges
  x.strokeStyle = "rgba(200,80,80,0.18)";
  for (let i = 0; i < 30; i++) {
    x.beginPath();
    const yy = hash(i, 3, 7) * h;
    x.moveTo(0, yy);
    x.bezierCurveTo(30, yy + 10, 40, yy - 10, 50, yy + 5);
    x.stroke();
  }
  // iris centred on the sphere's +z (u = 0.25, v = 0.5)
  const cx = w * 0.25, cy = h * 0.5, rx = w * 0.088, ry = h * 0.175;
  const ic = col(color);
  const rgb = (k, a = 1) => `rgba(${(ic.r * 255 * k) | 0},${(ic.g * 255 * k) | 0},${(ic.b * 255 * k) | 0},${a})`;
  x.save();
  x.translate(cx, cy);
  x.scale(rx, ry);
  const rg = x.createRadialGradient(0, 0, 0.2, 0, 0, 1);
  rg.addColorStop(0, rgb(1.5));
  rg.addColorStop(0.55, rgb(1.0));
  rg.addColorStop(0.92, rgb(0.6));
  rg.addColorStop(1, "rgba(20,15,10,1)");
  x.fillStyle = rg;
  x.beginPath();
  x.arc(0, 0, 1, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 0.02;
  for (let a = 0; a < Math.PI * 2; a += 0.08) {
    x.strokeStyle = rgb(hash(a, 1, 1) < 0.5 ? 0.6 : 1.6, 0.5);
    x.beginPath();
    x.moveTo(Math.cos(a) * 0.38, Math.sin(a) * 0.38);
    x.lineTo(Math.cos(a) * 0.9, Math.sin(a) * 0.9);
    x.stroke();
  }
  x.fillStyle = "#050505";
  x.beginPath();
  x.arc(0, 0, 0.36, 0, Math.PI * 2);
  x.fill();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ----------------------------------------------------------- geometry
// Lathe a limb hanging along -y from 0 to -len, radius r(t) for t in 0..1.
function limbGeo(len, r, { t0 = 0, t1 = 1, add = 0, seg = 22 } = {}) {
  const pts = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    pts.push(new THREE.Vector2(r(t) + add, -t * len));
  }
  return new THREE.LatheGeometry(pts, seg);
}

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}
function group(parent, x = 0, y = 0, z = 0) {
  const gr = new THREE.Group();
  gr.position.set(x, y, z);
  parent?.add(gr);
  return gr;
}
const ball = (r, mat, parent, x, y, z, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat, parent, x, y, z);

// torso cross-section keyframes: [y, halfWidth, halfDepth]
const TORSO = {
  male: [[0.84, 0.13, 0.09], [0.94, 0.172, 0.105], [1.02, 0.164, 0.1], [1.08, 0.152, 0.095], [1.18, 0.16, 0.105], [1.28, 0.175, 0.118], [1.36, 0.183, 0.114], [1.42, 0.182, 0.1], [1.48, 0.14, 0.074], [1.535, 0.066, 0.06]],
  female: [[0.84, 0.14, 0.095], [0.94, 0.185, 0.11], [1.02, 0.168, 0.1], [1.08, 0.135, 0.088], [1.18, 0.142, 0.095], [1.28, 0.158, 0.11], [1.36, 0.165, 0.105], [1.42, 0.165, 0.092], [1.48, 0.128, 0.068], [1.535, 0.056, 0.052]],
};
function torsoAt(o, y) {
  const K = TORSO[o.body === "female" ? "female" : "male"];
  if (y <= K[0][0]) return [K[0][1], K[0][2]];
  for (let i = 0; i < K.length - 1; i++) {
    const [y0, w0, d0] = K[i], [y1, w1, d1] = K[i + 1];
    if (y <= y1) {
      const t = smooth(0, 1, (y - y0) / (y1 - y0));
      return [lerp(w0, w1, t) * o.build, lerp(d0, d1, t) * o.build];
    }
  }
  const L = K[K.length - 1];
  return [L[1] * o.build, L[2] * o.build];
}
// point on the torso surface at angle a (0 = +x, π/2 = +z front)
function torsoPoint(o, a, y, inflate = 0) {
  const [w, d] = torsoAt(o, y);
  const c = Math.cos(a), s = Math.sin(a);
  let px = c * (w + inflate), pz = s * (d + inflate);
  const ax = Math.abs(c);
  if (s < 0) pz -= 0.018 * g((y - 0.9) / 0.07) * g(c / 0.6) * -s * o.build; // seat
  if (s > 0) {
    if (o.body === "female") pz += 0.035 * g((y - 1.27) / 0.055) * g((ax - 0.42) / 0.28) * s; // bust
    else pz += 0.008 * g((y - 1.3) / 0.06) * g((ax - 0.4) / 0.3) * s; // chest
    pz += 0.006 * (o.build - 1) * 4 * g((y - 1.1) / 0.08) * s; // belly for heavier builds
  }
  return [px, pz];
}
function torsoGeo(o, y0, y1, inflate = 0, { open = false } = {}) {
  const seg = 40, rows = Math.max(4, Math.round((y1 - y0) / 0.02));
  const geo = new THREE.CylinderGeometry(1, 1, 1, seg, rows, open);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const y = lerp(y0, y1, vy + 0.5);
    const rr = Math.hypot(vx, vz);
    const a = Math.atan2(vz, vx);
    const [px, pz] = torsoPoint(o, a, y, inflate);
    pos.setXYZ(i, px * rr, y, pz * rr);
  }
  geo.computeVertexNormals();
  return geo;
}

// ------------------------------------------------------------ build
export function createHuman(options = {}) {
  const o = merge(structuredClone(DEFAULTS), options);
  o.face = { ...DEFAULTS.face, ...(options.face || {}) };
  const fem = o.body === "female";
  const B = o.build;

  // materials
  const skinM = new THREE.MeshPhysicalMaterial({ map: T.skin(o.skin).map, roughness: 0.55, sheen: 0.12, sheenColor: col(0xffc4b0), sheenRoughness: 0.6 });
  const headTex = paintHead(o);
  const headM = new THREE.MeshPhysicalMaterial({ map: headTex, bumpMap: headTex, bumpScale: 0.6, roughness: 0.52, sheen: 0.12, sheenColor: col(0xffc4b0), sheenRoughness: 0.6 });
  const topKind = o.top.type === "hoodie" || o.top.type === "sweater" ? "knit" : "cotton";
  const topM = T.cloth(o.top.color, topKind);
  const botM = T.cloth(o.bottom.color, o.bottom.type === "jeans" ? "denim" : "twill");
  const shoeUpper = o.shoes.type === "sneakers" ? T.cloth(o.shoes.color, "canvas") : T.leather(o.shoes.color);
  const soleM = new THREE.MeshStandardMaterial({ color: o.shoes.type === "sneakers" ? 0xf4f4f0 : 0x1a1612, roughness: 0.8 });

  const root = new THREE.Group();
  root.scale.setScalar(o.height / 1.78);
  const pelvis = group(root, 0, 0.93, 0);
  const spine = group(pelvis, 0, 0.13, 0);
  const SPY = 1.06; // spine pivot height

  // ---- torso: pants part on the pelvis, top part on the spine
  const tucked = o.top.type === "shirt";
  const pantsTop = o.bottom.type === "skirt" ? 1.08 : 1.1;
  const lower = mesh(torsoGeo(o, 0.84, pantsTop, 0.004), o.bottom.type === "skirt" ? topM : botM, pelvis, 0, -0.93, 0);
  if (o.bottom.type === "skirt") lower.material = T.cloth(o.bottom.color, "twill");
  const hem = tucked ? 1.04 : o.top.type === "hoodie" ? 0.92 : 0.97;
  mesh(torsoGeo(o, hem, 1.535, tucked ? 0.002 : 0.012, { open: true }), topM, spine, 0, -SPY, 0);

  // belt
  if (tucked && (o.bottom.type === "jeans" || o.bottom.type === "pants" || o.bottom.type === "shorts")) {
    const [w, d] = torsoAt(o, 1.06);
    const belt = mesh(new THREE.CylinderGeometry(1, 1, 0.035, 40, 1, true), T.leather(0x2b1d14), pelvis, 0, 1.065 - 0.93, 0);
    belt.scale.set(w + 0.009, 1, d + 0.01);
    if (tucked) mesh(new THREE.BoxGeometry(0.045, 0.04, 0.008), new THREE.MeshStandardMaterial({ color: 0xb9a26a, metalness: 0.9, roughness: 0.3 }), pelvis, 0, 1.065 - 0.93, d + 0.012);
  }

  // ---- neck + head
  const head = group(spine, 0, 1.575 - SPY, 0.005);
  mesh(limbGeo(0.16, (t) => (fem ? 0.05 : 0.059) * B ** 0.5 * (1 + 0.06 * t)), skinM, head, 0, 0.04, -0.012);
  const H = headShape(o);
  const headGeo = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = headGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const [x, y, z] = H(p.getX(i), p.getY(i), p.getZ(i));
      p.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();
  }
  const HC = [0, 0.088, 0.012]; // head centre relative to the neck pivot
  const headMesh = mesh(headGeo, headM, head, ...HC);

  // ears
  for (const s of [-1, 1]) {
    const [ex, ey, ez] = H(s * 0.99, -0.1, -0.05);
    const ear = ball(1, skinM, head, HC[0] + ex + s * 0.004, HC[1] + ey, HC[2] + ez - 0.004, 18);
    ear.scale.set(0.008, fem ? 0.027 : 0.03, 0.018);
    ear.rotation.set(0, s * 0.25, s * 0.08);
    const inner = ball(1, new THREE.MeshStandardMaterial({ color: col(o.skin).multiplyScalar(0.72), roughness: 0.7 }), head, HC[0] + ex + s * 0.009, HC[1] + ey + 0.002, HC[2] + ez - 0.002, 12);
    inner.scale.set(0.004, 0.019, 0.011);
    inner.rotation.copy(ear.rotation);
  }

  // eyes with lids
  const eyeR = 0.0118;
  const eyeM = new THREE.MeshPhysicalMaterial({ map: irisTexture(o.eyes), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
  const lidM = new THREE.MeshPhysicalMaterial({ color: col(o.skin).multiplyScalar(0.93), roughness: 0.55, sheen: 0.3, sheenColor: col(0xff9a85) });
  const lashM = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.8 });
  const eyes = [], upperLids = [], lowerLids = [];
  for (const s of [-1, 1]) {
    const ex = s * 0.4, ey = 0.02, ez = Math.sqrt(1 - ex * ex - ey * ey);
    const [sx, sy, sz] = H(ex, ey, ez);
    const eg = group(head, HC[0] + sx, HC[1] + sy, HC[2] + sz - eyeR * 0.68);
    const eye = ball(eyeR, eyeM, eg, 0, 0, 0, 24);
    eye.rotation.y = -s * 0.05;
    eyes.push(eye);
    const up = mesh(new THREE.SphereGeometry(eyeR * 1.09, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM, eg);
    const lash = mesh(new THREE.TorusGeometry(eyeR * 1.09, fem ? 0.0011 : 0.0008, 6, 24, Math.PI), lashM, up);
    lash.rotation.x = Math.PI / 2;
    lash.rotation.z = Math.PI;
    upperLids.push(up);
    const lo = mesh(new THREE.SphereGeometry(eyeR * 1.07, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidM, eg);
    lowerLids.push(lo);
  }

  // hair
  let hairMesh = null;
  if (o.hair.style !== "bald") {
    const mask = hairMaskFn(o.hair.style);
    const thick = { short: 0.0075, buzz: 0.003, long: 0.012, ponytail: 0.008, balding: 0.006 }[o.hair.style] ?? 0.01;
    const geo = new THREE.SphereGeometry(1, 96, 72);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const m = mask(x, y, z);
      const [hx, hy, hz] = H(x, y, z);
      const k = m > 0.05 ? 0.0015 + thick * m * (0.4 + 0.6 * smooth(-0.3, 0.6, y)) + (o.hair.style === "short" ? 0.004 * g((y - 0.6) / 0.25) * smooth(0, 0.8, z) : 0) : -0.002;
      p.setXYZ(i, hx + x * k, hy + y * k, hz + z * k);
    }
    geo.computeVertexNormals();
    const htex = hairTexture(o);
    const hm = new THREE.MeshPhysicalMaterial({ map: htex, bumpMap: htex, bumpScale: 3, alphaTest: 0.5, roughness: 0.8, sheen: 0.6, sheenColor: col(o.hair.color).multiplyScalar(2.2), sheenRoughness: 0.4, side: THREE.DoubleSide });
    hairMesh = mesh(geo, hm, head, ...HC);
    if (o.hair.style === "long") {
      // hair falling down the back and sides
      const len = 0.3;
      const panel = new THREE.CylinderGeometry(0.082, 0.1, len, 40, 8, true, Math.PI * 0.32, Math.PI * 1.36);
      const pp = panel.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const y = pp.getY(i);
        const t = (len / 2 - y) / len;
        pp.setX(i, pp.getX(i) * (1 + 0.15 * Math.sin(t * Math.PI)));
        pp.setZ(i, pp.getZ(i) * 0.95 - 0.012 * t);
      }
      panel.computeVertexNormals();
      const tex = hm.map.clone();
      tex.needsUpdate = true;
      const pm = new THREE.MeshPhysicalMaterial({ sheen: 0.6, sheenColor: col(o.hair.color).multiplyScalar(2.2), sheenRoughness: 0.4, map: T.fur(o.hair.color, { key: "longhair", streak: 3, repeat: [3, 1] }).map, roughness: 0.8, side: THREE.DoubleSide });
      mesh(panel, pm, head, HC[0], HC[1] - 0.1, HC[2] - 0.022);
    }
    if (o.hair.style === "ponytail") {
      const tail = mesh(new THREE.CapsuleGeometry(0.022, 0.13, 6, 12), hm.clone(), head, HC[0], HC[1] - 0.04, HC[2] - 0.11);
      tail.material.map = T.fur(o.hair.color, { key: "pony", streak: 3 }).map;
      tail.material.alphaTest = 0;
      tail.rotation.x = 0.35;
    }
  }

  // beard / mustache volume
  if (o.beard === "beard" || o.beard === "mustache") {
    const geo = new THREE.SphereGeometry(1, 96, 72);
    const p = geo.attributes.position;
    const bm = (x, y, z) => {
      const ax = Math.abs(x);
      const must = g(x / 0.3) * g((y + 0.47) / 0.035) * smooth(0.5, 0.8, z);
      if (o.beard === "mustache") return must;
      const jaw = smooth(-0.32, -0.46, y) * smooth(-0.25, 0.1, z) * (1 - g(x / 0.3) * g((y + 0.6) / 0.1) * smooth(0.4, 0.8, z));
      return Math.max(must, jaw * (ax < 0.97 ? 1 : 0));
    };
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const m = bm(x, y, z);
      const [hx, hy, hz] = H(x, y, z);
      const k = m > 0.3 ? 0.001 + 0.0028 * m : -0.003;
      p.setXYZ(i, hx + x * k, hy + y * k, hz + z * k);
    }
    geo.computeVertexNormals();
    const bt = hairTexture({ ...o, hair: { ...o.hair, color: col(o.hair.color).multiplyScalar(1.2).getHex() } }, bm, 0.35);
    mesh(geo, new THREE.MeshStandardMaterial({ map: bt, bumpMap: bt, bumpScale: 2, alphaTest: 0.5, roughness: 0.85, side: THREE.DoubleSide }), head, ...HC);
  }

  // glasses
  if (o.glasses) {
    const gm = new THREE.MeshStandardMaterial({ color: o.glasses.color ?? 0x1b1b1b, roughness: 0.3, metalness: 0.4 });
    for (const s of [-1, 1]) {
      const [sx, sy, sz] = H(s * 0.4, 0.02, 0.92);
      const rim = mesh(new THREE.TorusGeometry(0.023, 0.0018, 8, 28), gm, head, HC[0] + sx, HC[1] + sy, HC[2] + sz + 0.02);
      rim.scale.set(1.15, 0.85, 1);
      const lens = mesh(new THREE.CircleGeometry(0.021, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.15, roughness: 0 }), rim);
      const [tx, , tz] = H(s * 0.99, 0.02, -0.1);
      const fx = sx + s * 0.026, fz = sz + 0.018;
      const len = Math.hypot(tx + s * 0.004 - fx, tz - fz);
      const temple = mesh(new THREE.BoxGeometry(0.003, 0.003, len), gm, head, HC[0] + (fx + tx + s * 0.004) / 2, HC[1] + sy + 0.006, HC[2] + (fz + tz) / 2);
      temple.rotation.y = Math.atan2(tx + s * 0.004 - fx, tz - fz);
    }
    const [bx, by, bz] = H(0, 0.04, 1);
    const sy0 = H(0.4, 0.02, 0.92)[1];
    mesh(new THREE.BoxGeometry(0.03, 0.003, 0.003), gm, head, HC[0], HC[1] + sy0 + 0.004, HC[2] + bz + 0.012);
  }

  // hats
  if (o.hat) {
    const hatM = T.cloth(o.hat.color ?? 0x26324a, o.hat.type === "beanie" ? "knit" : "cotton");
    const [, topY] = H(0, 1, 0);
    if (o.hat.type === "beanie") {
      const cap = mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hatM, head, HC[0], HC[1] + 0.012, HC[2] - 0.006);
      cap.scale.set(0.083, 0.115, 0.1);
      const fold = mesh(new THREE.TorusGeometry(1, 0.13, 8, 32), hatM, head, HC[0], HC[1] + 0.005, HC[2] - 0.006);
      fold.rotation.x = Math.PI / 2;
      fold.scale.set(0.083, 0.1, 0.12);
    } else {
      const uniform = o.hat.type === "uniform";
      const crown = uniform
        ? mesh(new THREE.CylinderGeometry(0.1, 0.088, 0.07, 32), hatM, head, HC[0], HC[1] + 0.097, HC[2] - 0.004)
        : mesh(new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hatM, head, HC[0], HC[1] + 0.035, HC[2] - 0.006);
      if (uniform) crown.scale.set(1, 1, 1.12);
      else crown.scale.set(0.083, 0.09, 0.1);
      if (!uniform) ball(0.007, hatM, head, HC[0], HC[1] + 0.035 + 0.09, HC[2] - 0.006);
      const brim = mesh(new THREE.CylinderGeometry(uniform ? 0.13 : 0.15, uniform ? 0.13 : 0.15, 0.005, 28, 1, false, -Math.PI / 2, Math.PI), hatM, head, HC[0], HC[1] + (uniform ? 0.058 : 0.05), HC[2]);
      brim.scale.set(uniform ? 0.66 : 0.6, 1, 1);
      brim.rotation.x = uniform ? 0.22 : 0.12;
      if (uniform) {
        const band = mesh(new THREE.CylinderGeometry(0.0895, 0.0895, 0.02, 32, 1, true), T.leather(0x111111), head, HC[0], HC[1] + 0.068, HC[2] - 0.004);
        band.scale.set(1, 1, 1.12);
      }
    }
  }

  // ---- collars & top details
  const neckR = (fem ? 0.05 : 0.059) * B ** 0.5;
  const inner = mesh(new THREE.CircleGeometry(neckR + 0.02, 32), new THREE.MeshStandardMaterial({ color: col(o.top.color).multiplyScalar(0.35), roughness: 1 }), spine, 0, 1.512 - SPY, 0);
  inner.rotation.x = -Math.PI / 2;
  const [fw, fd] = torsoAt(o, 1.4);
  if (o.top.type === "tshirt" || o.top.type === "sweater") {
    const c = mesh(new THREE.TorusGeometry(neckR + 0.012, o.top.type === "sweater" ? 0.011 : 0.006, 8, 32), topM, spine, 0, 1.505 - SPY, 0.008);
    c.rotation.x = Math.PI / 2 + 0.3;
    c.scale.set(1.15, 1, 1);
  }
  if (o.top.type === "polo" || o.top.type === "shirt") {
    const band = mesh(new THREE.CylinderGeometry(neckR + 0.008, neckR + 0.03, 0.045, 32, 1, true), topM, spine, 0, 1.53 - SPY, -0.004);
    band.rotation.x = 0.22;
    band.scale.set(1.05, 1, 1.1);
    const btnM = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.3 });
    const yMin = o.top.type === "polo" ? 1.38 : 1.07;
    for (let y = 1.45; y >= yMin; y -= 0.065) {
      const [, pz] = torsoPoint(o, Math.PI / 2, y, tucked ? 0.002 : 0.012);
      const b = mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 12), btnM, spine, 0, y - SPY, pz + 0.002);
      b.rotation.x = Math.PI / 2;
    }
  }
  if (o.top.type === "hoodie") {
    const hood = mesh(new THREE.TorusGeometry(0.095, 0.038, 10, 28, Math.PI), topM, spine, 0, 1.52 - SPY, -0.005);
    hood.rotation.set(-Math.PI / 2 + 0.35, 0, 0);
    hood.scale.set(1.15, 1, 1.5);
    const strM = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
    for (const s of [-1, 1]) {
      const [, pz] = torsoPoint(o, Math.PI / 2, 1.38, 0.012);
      mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 6), strM, spine, s * 0.035, 1.38 - SPY, pz + 0.006);
    }
    const [, pz] = torsoPoint(o, Math.PI / 2, 1.06, 0.012);
    const pocket = mesh(new THREE.BoxGeometry(0.22, 0.12, 0.012), topM, spine, 0, 1.03 - SPY, pz + 0.002);
    pocket.rotation.x = -0.08;
    const band = mesh(new THREE.CylinderGeometry(1, 1, 0.045, 40, 1, true), topM, spine, 0, hem + 0.02 - SPY, 0);
    const [hw, hd] = torsoAt(o, hem + 0.02);
    band.scale.set(hw + 0.016, 1, hd + 0.016);
  }

  // ---- arms
  const shX = (fem ? 0.158 : 0.172) * B;
  const UA = 0.3, FA = 0.26;
  const rUA = (t) => B * ((fem ? 0.04 : 0.046) * (1 - 0.22 * t) + 0.006 * g((t - 0.4) / 0.25));
  const rFA = (t) => B ** 0.7 * ((fem ? 0.034 : 0.039) * (1 - 0.3 * t) + 0.005 * g((t - 0.2) / 0.2));
  const longSleeve = o.top.type === "shirt" || o.top.type === "hoodie" || o.top.type === "sweater";
  const arms = {};
  for (const [name, s] of [["L", -1], ["R", 1]]) {
    const sh = group(spine, s * shX, 1.435 - SPY, -0.005);
    ball(rUA(0) * 1.02, longSleeve || true ? topM : skinM, sh, 0, 0.005, 0, 20); // shoulder
    mesh(limbGeo(UA, rUA, { add: longSleeve ? 0.01 : 0 }), longSleeve ? topM : skinM, sh);
    if (!longSleeve) mesh(limbGeo(UA, rUA, { t1: o.top.type === "polo" ? 0.5 : 0.45, add: 0.011 }), topM, sh);
    const el = group(sh, 0, -UA, 0);
    ball(rUA(1) + (longSleeve ? 0.01 : 0), longSleeve ? topM : skinM, el, 0, 0, 0);
    mesh(limbGeo(FA, rFA, { add: longSleeve ? 0.012 : 0 }), longSleeve ? topM : skinM, el);
    if (longSleeve) mesh(limbGeo(FA, rFA, { t0: 0.86, add: 0.0 }), skinM, el);
    const hand = group(el, 0, -FA, 0);
    ball(rFA(1) * 1.05, skinM, hand, 0, 0.004, 0, 12); // wrist
    const palm = ball(1, skinM, hand, s * -0.002, -0.045, 0.004, 18);
    palm.scale.set(0.016, 0.046, 0.04 * B ** 0.3);
    for (let f = 0; f < 4; f++) {
      const len = [0.048, 0.054, 0.05, 0.04][f];
      const fg = group(hand, s * -0.002, -0.085, 0.026 - f * 0.0165);
      const seg1 = mesh(new THREE.CapsuleGeometry(0.0078, len * 0.5, 4, 8), skinM, fg, 0, -len * 0.25, 0);
      const tip = group(fg, 0, -len * 0.5, 0);
      mesh(new THREE.CapsuleGeometry(0.0072, len * 0.42, 4, 8), skinM, tip, 0, -len * 0.21, 0);
      fg.rotation.z = -s * 0.25;
      tip.rotation.z = -s * 0.45;
      fg.userData.tip = tip;
    }
    const thumb = group(hand, s * -0.008, -0.035, 0.034);
    mesh(new THREE.CapsuleGeometry(0.0085, 0.04, 4, 8), skinM, thumb, 0, -0.025, 0);
    thumb.rotation.set(0.5, 0, -s * 0.35);
    arms[name] = { sh, el, hand };
  }

  // ---- legs
  const hipX = (fem ? 0.092 : 0.09) * B;
  const TH = 0.43, SH = 0.42;
  const rTH = (t) => B * ((fem ? 0.088 : 0.085) * (1 - 0.36 * t) + 0.008 * g((t - 0.35) / 0.25));
  const rSH = (t) => B ** 0.8 * (0.05 * (1 - 0.33 * t) + 0.012 * g((t - 0.28) / 0.18));
  const legs = {};
  const shortsLen = o.bottom.type === "shorts" ? 0.75 : 0;
  const fullPants = o.bottom.type === "jeans" || o.bottom.type === "pants";
  for (const [name, s] of [["L", -1], ["R", 1]]) {
    const hp = group(pelvis, s * hipX, 0, 0);
    ball(rTH(0) * 1.02 + (fullPants || shortsLen ? 0.012 : 0), o.bottom.type === "skirt" ? skinM : botM, hp, 0, 0, 0, 20);
    if (fullPants) {
      mesh(limbGeo(TH, (t) => Math.max(rTH(t), 0.065 * B) , { add: 0.012 }), botM, hp);
    } else {
      mesh(limbGeo(TH, rTH), skinM, hp);
      if (shortsLen) mesh(limbGeo(TH, rTH, { t1: shortsLen, add: 0.016 }), botM, hp);
    }
    const kn = group(hp, 0, -TH, 0);
    ball(Math.max(rTH(1), 0.058 * B) + (fullPants ? 0.006 : 0), fullPants ? botM : skinM, kn, 0, 0, 0);
    mesh(limbGeo(SH, fullPants ? (t) => Math.max(rSH(t), 0.058 * B ** 0.8) : rSH, { add: fullPants ? 0.012 : 0, t1: fullPants ? 0.93 : 1 }), fullPants ? botM : skinM, kn);
    if (fullPants) mesh(limbGeo(SH, rSH, { t0: 0.9 }), skinM, kn);
    const an = group(kn, 0, -SH, 0);
    // shoe
    const sneaker = o.shoes.type === "sneakers", boot = o.shoes.type === "boots";
    const upper = ball(1, shoeUpper, an, 0, -0.028, 0.04, 24);
    upper.scale.set(0.047, boot ? 0.06 : 0.04, 0.125);
    if (boot) mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.13, 20), shoeUpper, an, 0, 0.02, -0.005);
    const sole = ball(1, soleM, an, 0, sneaker ? -0.06 : -0.064, 0.042, 24);
    sole.scale.set(0.051, sneaker ? 0.017 : 0.011, 0.136);
    if (sneaker) {
      const lace = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
      for (let k = 0; k < 4; k++) mesh(new THREE.BoxGeometry(0.03, 0.003, 0.006), lace, an, 0, -0.0 - k * 0.0, 0.035 + k * 0.02).position.y = 0.006 - k * 0.006;
    }
    ball(rSH(1) * 1.05, fullPants ? botM : skinM, an, 0, 0.005, 0, 12);
    legs[name] = { hp, kn, an };
  }
  if (o.bottom.type === "skirt") {
    const skirt = mesh(new THREE.CylinderGeometry(1, 1.4, 0.4, 40, 1, true), T.cloth(o.bottom.color, "twill"), pelvis, 0, 1.06 - 0.2 - 0.93, 0);
    const [w, d] = torsoAt(o, 1.06);
    skirt.scale.set(w + 0.01, 1, d + 0.015);
  }

  // ---------------------------------------------------------- API
  const h = root;
  h.options = o;
  h.pelvis = pelvis;
  h.spine = spine;
  h.head = head;
  h.hair = hairMesh ?? new THREE.Group();
  h.headMesh = headMesh;
  h.eyes = eyes;
  h.armL = arms.L.sh; h.armR = arms.R.sh;
  h.elbowL = arms.L.el; h.elbowR = arms.R.el;
  h.handL = arms.L.hand; h.handR = arms.R.hand;
  h.legL = legs.L.hp; h.legR = legs.R.hp;
  h.kneeL = legs.L.kn; h.kneeR = legs.R.kn;
  h.ankleL = legs.L.an; h.ankleR = legs.R.an;

  h.blink = (amount = 0) => {
    upperLids.forEach((l) => (l.rotation.x = lerp(-0.6, 1.05, amount)));
    lowerLids.forEach((l) => (l.rotation.x = lerp(0.68, 0.3, amount)));
  };
  h.look = (yaw = 0, pitch = 0) => eyes.forEach((e, i) => e.rotation.set(pitch, yaw - (i ? 1 : -1) * 0.05, 0));
  h.resetPose = () => {
    pelvis.position.set(0, 0.93, 0);
    pelvis.rotation.set(0, 0, 0);
    spine.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    h.armL.rotation.set(0.04, 0, -0.1);
    h.armR.rotation.set(0.04, 0, 0.1);
    h.elbowL.rotation.set(-0.15, 0, 0);
    h.elbowR.rotation.set(-0.15, 0, 0);
    h.handL.rotation.set(0, 0.3, 0);
    h.handR.rotation.set(0, -0.3, 0);
    for (const l of [legs.L, legs.R]) {
      l.hp.rotation.set(0, 0, 0);
      l.kn.rotation.set(0, 0, 0);
      l.an.rotation.set(0, 0, 0);
    }
    h.blink(0);
    h.look(0, 0);
  };
  // phase in radians (advance ~7/s for a walk); amount 0.5 walk … 1 run
  h.walk = (phase, amount = 0.5) => {
    h.resetPose();
    const a = amount, run = smooth(0.6, 1, a);
    const s = Math.sin(phase), c = Math.cos(phase);
    legs.L.hp.rotation.x = -s * a * 0.9;
    legs.R.hp.rotation.x = s * a * 0.9;
    legs.L.kn.rotation.x = a * (0.12 + (1.1 + run) * Math.max(0, c));
    legs.R.kn.rotation.x = a * (0.12 + (1.1 + run) * Math.max(0, -c));
    legs.L.an.rotation.x = -(legs.L.hp.rotation.x + legs.L.kn.rotation.x) * 0.45;
    legs.R.an.rotation.x = -(legs.R.hp.rotation.x + legs.R.kn.rotation.x) * 0.45;
    h.armL.rotation.x = s * a * 0.75;
    h.armR.rotation.x = -s * a * 0.75;
    h.elbowL.rotation.x = -0.25 - run * 1.2 - 0.25 * a * Math.max(0, -s);
    h.elbowR.rotation.x = -0.25 - run * 1.2 - 0.25 * a * Math.max(0, s);
    pelvis.position.y = 0.93 + Math.abs(c) * 0.025 * a - 0.02 * a;
    spine.rotation.set(0.06 + run * 0.18, s * 0.1 * a, 0);
    pelvis.rotation.y = -s * 0.08 * a;
  };
  h.sit = () => {
    h.resetPose();
    for (const l of [legs.L, legs.R]) {
      l.hp.rotation.x = -1.5;
      l.kn.rotation.x = 1.45;
    }
    legs.L.hp.rotation.z = -0.06;
    legs.R.hp.rotation.z = 0.06;
    h.armL.rotation.x = h.armR.rotation.x = -0.35;
    h.elbowL.rotation.x = h.elbowR.rotation.x = -0.9;
    spine.rotation.x = -0.08;
  };
  h.resetPose();

  root.traverse((m) => {
    if (m.isMesh) m.castShadow = m.receiveShadow = true;
  });
  return root;
}

// Ready-made looks. Spread and override: createHuman({ ...PRESETS.dad, top: {...} })
export const PRESETS = {
  mailCarrier: { top: { type: "polo", color: 0x8fb0d0 }, bottom: { type: "pants", color: 0x27324a }, shoes: { type: "shoes", color: 0x1c1712 }, hat: { type: "uniform", color: 0x26324a }, hair: { style: "short", color: 0x4d3828 }, beard: "stubble", skin: 0xe8c0a4 },
  dad: { top: { type: "shirt", color: 0xd9dfe8 }, bottom: { type: "jeans", color: 0x34466b }, hair: { style: "short", color: 0x4a3524 }, beard: "beard", skin: 0xdcb196, build: 1.08 },
  mom: { body: "female", height: 1.67, top: { type: "sweater", color: 0xc96d4f }, bottom: { type: "jeans", color: 0x3c5078 }, hair: { style: "long", color: 0x7a4a26 }, shoes: { type: "sneakers", color: 0xe8e2da }, skin: 0xf0cfb8, eyes: 0x3d6b4a },
  teen: { height: 1.72, build: 0.9, top: { type: "hoodie", color: 0x4c4f58 }, bottom: { type: "pants", color: 0x1f2024 }, shoes: { type: "sneakers", color: 0xd8d8d8 }, hair: { style: "short", color: 0x2a201a }, skin: 0x9a6a4c, eyes: 0x2a1a10 },
  grandpa: { height: 1.72, build: 1.05, top: { type: "shirt", color: 0x9aa98a }, bottom: { type: "pants", color: 0x6d6250 }, shoes: { type: "shoes", color: 0x3a2a1e }, hair: { style: "balding", color: 0xc9c5bf }, beard: "mustache", glasses: { color: 0x2a2018 }, skin: 0xe6b9a0, face: { nose: 1.15 } },
};
