// A low-poly, stylised toon PUG for the studio: faceted lobes (flat-shaded, hand-sized polygons), an ink outline on every part, a big round
// head with a flat black muzzle and forehead wrinkles, glossy button eyes, folded rose ears, a stocky body, short legs with dark socks and a
// curled tail. It has the SAME rig and pose() options as js/dog.js (so js/herodog.js and every choreography works unchanged):
//
//   import { createPug } from "../../js/pug.js";
//   const pug = createPug();                  // fawn pug; createPug({ colors: { body, light, dark } }) for other coats
//   scene.add(pug);  pug.pose({ t, sit: 1, wag: 1, cute: 1 });  pug.setGrey(0.8);   // 0..1: the black muzzle and brows turn grey with age
//
// Faces +z, feet at y = 0, about 0.7 m tall at scale 1 (the head included); original geometry, nothing imported.

import { THREE } from "./engine.js";
import { toon, toonGradient } from "./toon.js";
import { mergeVertices } from "../lib/jsm/utils/BufferGeometryUtils.js";

export const PUG_COLORS = { body: 0xdcb487, light: 0xf5e4c8, dark: 0x2a211f };
const INK = 0x241914;
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const shiny = new THREE.MeshBasicMaterial({ color: 0xffffff });
const lerp = (a, b, k) => a + (b - a) * k;

function group(x, y, z, parent) { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; }

// geometry helpers: bake the radii in, then make a flat-shaded display copy and a smooth copy for the outline hull
function faceted(base) {
  const g = base.clone(); g.deleteAttribute("normal"); g.deleteAttribute("uv");
  const smooth = mergeVertices(g); smooth.computeVertexNormals();
  const flat = g.index ? g.toNonIndexed() : g.clone(); flat.computeVertexNormals();
  return { flat, smooth };
}
function hullOf(smooth, w) {
  const g = smooth.clone(), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * w, p.getY(i) + n.getY(i) * w, p.getZ(i) + n.getZ(i) * w);
  return g;
}
// a part: a faceted mesh + its ink hull as a child, so the outline follows the rig
function part(parent, base, material, { p = [0, 0, 0], r = [0, 0, 0], ink = 0.012 } = {}) {
  const { flat, smooth } = faceted(base);
  const m = new THREE.Mesh(flat, material); m.position.set(...p); m.rotation.set(...r); m.castShadow = m.receiveShadow = true;
  if (ink > 0) { const h = new THREE.Mesh(hullOf(smooth, ink), inkMat); h.userData.isOutline = true; m.add(h); }
  parent.add(m); return m;
}
const lobe = (rx, ry, rz, detail = 1) => new THREE.IcosahedronGeometry(1, detail).scale(rx, ry, rz);
// a smooth (not faceted) small thing, e.g. eyes: no outline
function orb(parent, rx, ry, rz, material, p) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10).scale(rx, ry, rz), material); m.position.set(...p); parent.add(m); return m; }

export function createPug({ colors = PUG_COLORS } = {}) {
  const M = {
    body: toon(colors.body), light: toon(colors.light), dark: toon(colors.dark), muzzle: new THREE.MeshToonMaterial({ color: colors.dark, gradientMap: toonGradient() }), brow: new THREE.MeshToonMaterial({ color: colors.dark, gradientMap: toonGradient() }),    // own materials: setGrey() changes them
    nose: new THREE.MeshToonMaterial({ color: 0x15100e, gradientMap: toonGradient() }), pink: toon(0xe85a76), white: toon(0xf6f1e8),
    socks: toon(colors.dark), eyeWhite: new THREE.MeshBasicMaterial({ color: 0xfbf7ee }), iris: new THREE.MeshBasicMaterial({ color: 0x3a2113 }), pupil: new THREE.MeshBasicMaterial({ color: 0x0b0706 }),
  };
  const pug = group(0, 0, 0);
  const H = 0.22;                                             // hip height
  const pivot = group(0, H, -0.25, pug);                      // hips: rotate X to rear up
  part(pivot, lobe(0.21, 0.19, 0.34, 1), M.body, { p: [0, 0.13, 0.22] });                  // body
  part(pivot, lobe(0.215, 0.2, 0.19, 1), M.body, { p: [0, 0.12, 0.42] });                  // chest
  part(pivot, lobe(0.16, 0.085, 0.26, 1), M.light, { p: [0, 0.0, 0.25], ink: 0.008 });     // belly
  const legs = {};
  function leg(name, x, y, z, parent, len) {
    const g = group(x, y, z, parent);
    part(g, new THREE.CylinderGeometry(0.058, 0.046, len, 6), M.body, { p: [0, -len / 2, 0], ink: 0.009 });
    part(g, lobe(0.062, 0.04, 0.08, 1), M.socks, { p: [0, -len - 0.01, 0.018], ink: 0.009 });
    legs[name] = g;
  }
  leg("fl", -0.115, 0.04, 0.46, pivot, 0.2); leg("fr", 0.115, 0.04, 0.46, pivot, 0.2);
  const hips = group(0, 0, 0, pug);                           // back legs (lowered + folded when sitting)
  leg("bl", -0.125, 0.22, -0.19, hips, 0.19); leg("br", 0.125, 0.22, -0.19, hips, 0.19);
  const neck = group(0, 0.17, 0.5, pivot);
  const head = group(0, 0.03, 0.02, neck);
  part(head, lobe(0.25, 0.225, 0.225, 1), M.body, { p: [0, 0.06, 0.05], ink: 0.013 });     // the big round head
  part(head, lobe(0.075, 0.06, 0.08, 1), M.light, { p: [-0.125, -0.06, 0.15], ink: 0.008 }); part(head, lobe(0.075, 0.06, 0.08, 1), M.light, { p: [0.125, -0.06, 0.15], ink: 0.008 });   // cheeks
  part(head, lobe(0.118, 0.085, 0.085, 1), M.muzzle, { p: [0, -0.04, 0.235], ink: 0.01 });  // the flat black muzzle
  part(head, lobe(0.046, 0.032, 0.03, 1), M.nose, { p: [0, 0.018, 0.305], ink: 0.007 });    // nose
  orb(head, 0.012, 0.007, 0.006, shiny, [-0.014, 0.034, 0.332]);
  for (let k = 0; k < 3; k++) {                               // forehead wrinkles: short dark arcs lying on the forehead
    const y = 0.165 + k * 0.036, z = 0.05 + 0.225 * Math.sqrt(Math.max(0.05, 1 - ((y - 0.06) / 0.225) ** 2)) + 0.004;
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.052 - k * 0.006, 0.0065, 4, 10, Math.PI * 0.9), M.dark);
    w.rotation.set(-0.3 - k * 0.3, 0, 0.157); w.position.set(0, y, z); head.add(w);
  }
  const jaw = group(0, -0.085, 0.14, head);
  part(jaw, lobe(0.082, 0.032, 0.07, 1), M.light, { p: [0, -0.012, 0.05], ink: 0.007 });
  part(jaw, lobe(0.038, 0.012, 0.06, 1), M.pink, { p: [0, 0.014, 0.085], ink: 0 });                  // tongue
  const mouth = group(0, 0, 0.14, jaw);                       // attach things the pug carries in its mouth here
  const teeth = group(0, 0, 0, head);
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 4), M.white); t.position.set(s * 0.045, -0.115, 0.245); t.rotation.x = Math.PI; teeth.add(t); }
  teeth.visible = false;

  const eyes = [], brows = [];
  for (const s of [-1, 1]) {
    const e = group(s * 0.115, 0.115, 0.178, head);
    e.white = orb(e, 0.064, 0.064, 0.04, M.eyeWhite, [0, 0, 0]);
    e.iris = orb(e, 0.048, 0.049, 0.02, M.iris, [s * -0.004, -0.003, 0.03]);
    e.pupil = orb(e, 0.033, 0.035, 0.012, M.pupil, [s * -0.007, -0.004, 0.046]);
    e.shine = orb(e, 0.015, 0.015, 0.008, shiny, [s * -0.016, 0.017, 0.058]);
    e.shine2 = orb(e, 0.008, 0.008, 0.006, shiny, [s * 0.012, -0.017, 0.058]);
    e.blush = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12).scale(1.3, 0.55, 1), new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.5, depthWrite: false }));
    e.blush.position.set(s * 0.03, -0.075, 0.03); e.add(e.blush);
    // eyelid: a fur-coloured shell anchored at the top of the eye that grows downwards
    const lidGeo = new THREE.SphereGeometry(1, 12, 8).scale(0.07, 0.07, 0.046).translate(0, -0.07, 0);
    e.lid = new THREE.Mesh(lidGeo, M.body); e.lid.position.set(0, 0.07, 0.003); e.add(e.lid);
    e.lash = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.02), M.dark); e.lash.position.set(0, -0.135, 0.04); e.lid.add(e.lash);
    eyes.push(e);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.024), M.brow); b.position.set(s * 0.115, 0.188, 0.2); head.add(b); brows.push(b);
  }
  const ears = [];
  for (const s of [-1, 1]) {                                  // folded button ears: dark lobes hanging at the side of the head
    const e = group(s * 0.185, 0.17, 0.02, head);
    part(e, lobe(0.05, 0.1, 0.075, 1), M.dark, { p: [s * 0.025, -0.075, 0.025], r: [0.1, 0, s * 0.3], ink: 0.009 });
    ears.push(e);
  }
  const tail = group(0, 0.27, -0.12, pivot);                  // a curl on the rump
  part(tail, new THREE.TorusGeometry(0.06, 0.027, 5, 9, Math.PI * 1.75), M.body, { p: [0, 0.045, -0.035], r: [0, Math.PI / 2, 0.6], ink: 0.009 });
  const cape = group(0, 0, 0, pivot); cape.visible = false;   // (kept for API compatibility with js/dog.js)
  const capeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), M.body); cape.add(capeMesh);

  pug.traverse((o) => { if (o.isMesh && !o.userData.isOutline) o.castShadow = o.receiveShadow = true; });

  const clamp = (v) => Math.min(1, Math.max(0, v));
  pug.pose = ({
    x = 0, y = 0, z = 0, ry = 0,
    rear = 0, sit = 0, lie = 0, headYaw = 0, headPitch = 0, jawOpen = 0,
    wag = 0, wagSpeed = 18, t = 0, trot = 0, trotSpeed = 11,
    squint = 0, angry = 0, earUp = 0, earBack = 0, cute = 0, tilt = 0,
    closed = 0, sad = 0, snarl = 0, pupil = 1, shiver = 0, bow = 0, tailLean = 0,
  } = {}) => {
    const sx = shiver ? Math.sin(t * 97) * 0.012 * shiver : 0, sz = shiver ? Math.cos(t * 83) * 0.008 * shiver : 0;
    pug.position.set(x + sx, y, z + sz);
    pug.rotation.set(0, ry + (shiver ? Math.sin(t * 71) * 0.03 * shiver : 0), 0);
    rear -= bow * 0.38;
    const sitTilt = sit * 0.5;
    pivot.position.y = H - sit * 0.13 - lie * 0.19;
    pivot.rotation.x = -rear - sitTilt;
    hips.position.y = -sit * 0.13 - lie * 0.15;
    neck.rotation.set(rear + sitTilt * 0.9 + headPitch, headYaw, tilt);
    head.rotation.set(0, 0, 0);
    jaw.rotation.x = Math.max(jawOpen, snarl * 0.35) * 0.55;
    teeth.visible = snarl > 0;
    tail.rotation.set(-0.5 + lie * 0.5 + sit * 0.4, Math.sin(t * wagSpeed) * 0.55 * wag + tailLean, 0);
    const s = Math.sin(t * trotSpeed) * 0.7 * trot;
    legs.fl.rotation.x = s - rear * 0.6 + sitTilt - lie * 1.45;
    legs.fr.rotation.x = -s - rear * 0.6 + sitTilt - lie * 1.45;
    legs.bl.rotation.x = -s - sit * 1.35 - lie * 1.4;
    legs.br.rotation.x = s - sit * 1.35 - lie * 1.4;
    for (const g of [legs.bl, legs.br]) g.position.z = -0.19 + sit * 0.1 + lie * 0.04;
    legs.fl.rotation.x -= bow * 1.35; legs.fr.rotation.x -= bow * 1.35;
    pug.position.y += Math.abs(Math.sin(t * trotSpeed)) * 0.035 * trot;
    for (const e of eyes) {
      const big = 1 + cute * 0.3;
      e.scale.set(big, big * (1 - squint * 0.7), 1);
      e.iris.visible = true;
      e.pupil.scale.set((1 + cute * 0.12) * pupil, (1 + cute * 0.12) * Math.min(pupil, 1.2), 1);
      e.shine.scale.setScalar(1 + cute * 0.7);
      e.shine2.visible = e.blush.visible = cute > 0;
      e.lid.scale.y = Math.max(0.001, clamp(closed)); e.lid.visible = closed > 0.01;
    }
    brows.forEach((b, i) => {
      const side = i === 0 ? -1 : 1;
      b.rotation.z = side * angry * 0.45 - side * Math.max(cute, sad) * 0.35;
      b.position.y = 0.188 - angry * 0.02 + Math.max(cute, sad) * 0.022;
    });
    ears.forEach((e, i) => {
      const side = i === 0 ? -1 : 1;
      e.rotation.set(-earBack * 0.7 + earUp * 0.15, 0, side * (earUp * 0.4 - earBack * 0.15 - sad * 0.25));
    });
  };
  // age: the black muzzle and the brows fade to grey (0 = young, 1 = a grey old pug)
  pug.setGrey = (k) => { const c = new THREE.Color(colors.dark).lerp(new THREE.Color(0xa7a5a6), clamp(k)); M.muzzle.color.copy(c); M.brow.color.copy(c); };
  Object.assign(pug, { pivot, hips, neck, head, jaw, mouth, eyes, brows, ears, tail, legs, cape, capeMesh, teeth, materials: { body: M.body, light: M.light, dark: M.dark }, colors });
  pug.isPug = true;
  pug.pose();
  return pug;
}
