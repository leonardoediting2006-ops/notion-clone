// Dog toys. plushToy(): a squeaky plush fox built in code (fuzzy fabric, stitched seams,
// button eyes, floppy tail) — about 0.34 m long, origin at the middle of the body (where a dog
// bites it), lying along +x with its face toward +x.
//
//   import { plushToy, tennisBall, ropeToy } from "../../js/toys.js";
//   const toy = plushToy();  toy.squish(0.4);  toy.flop(0.6);  // squeeze, swing tail/legs

import { THREE } from "./engine.js";
import * as T from "./textures.js";

function plush(color, key) {
  const fur = T.fur(color, { key: "plush" + key, repeat: [3, 3], streak: 0.45 });
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: fur.map, bumpMap: fur.bumpMap, bumpScale: 2.5,
    roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
  });
}
const m = (geo, mat, parent, x = 0, y = 0, z = 0) => {
  const me = new THREE.Mesh(geo, mat);
  me.position.set(x, y, z);
  me.castShadow = me.receiveShadow = true;
  parent.add(me);
  return me;
};
// sphere pinched like a stuffed fabric shape: flatter at the seams, puffy in the middle
function puffy(rx, ry, rz, seg = 28) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const seam = 1 - 0.07 * Math.exp(-(z * z) / 0.004); // seam groove around the middle
    p.setXYZ(i, x * rx * seam, y * ry * seam, z * rz);
  }
  g.computeVertexNormals();
  return g;
}

export function plushToy({ body = 0xd9783a, belly = 0xf3e6d2, dark = 0x2d2420 } = {}) {
  const toy = new THREE.Group();
  const orange = plush(body, "o"), cream = plush(belly, "c"), brown = plush(dark, "d");
  const shake = new THREE.Group(); // everything that squishes
  toy.add(shake);
  // body
  const torso = m(puffy(0.11, 0.075, 0.07), orange, shake);
  m(puffy(0.075, 0.05, 0.055), cream, shake, 0.01, -0.03, 0); // belly patch
  // head
  const head = new THREE.Group();
  head.position.set(0.14, 0.035, 0);
  shake.add(head);
  m(puffy(0.07, 0.065, 0.072), orange, head);
  const snout = m(new THREE.ConeGeometry(0.04, 0.08, 20), cream, head, 0.075, -0.012, 0);
  snout.rotation.z = -Math.PI / 2;
  snout.scale.set(1, 1, 0.85);
  m(new THREE.SphereGeometry(0.014, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.25, clearcoat: 1 }), head, 0.115, -0.01, 0);
  for (const s of [-1, 1]) {
    // glossy button eyes with a stitched rim
    const eye = m(new THREE.SphereGeometry(0.011, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.1, clearcoat: 1 }), head, 0.05, 0.022, s * 0.042);
    eye.scale.set(0.6, 1, 1);
    m(new THREE.TorusGeometry(0.013, 0.0025, 6, 20), new THREE.MeshStandardMaterial({ color: 0xf5efe6 }), head, 0.047, 0.022, s * 0.043).rotation.y = Math.PI / 2 + s * 0.6;
    // ears: orange outside, dark tips, cream inside
    const ear = new THREE.Group();
    ear.position.set(-0.01, 0.055, s * 0.035);
    ear.rotation.set(s * 0.35, 0, -0.2);
    head.add(ear);
    m(new THREE.ConeGeometry(0.028, 0.06, 4).scale(1, 1, 0.4), orange, ear, 0, 0.025, 0);
    m(new THREE.ConeGeometry(0.012, 0.024, 4).scale(1, 1, 0.45), brown, ear, 0, 0.05, 0);
    m(new THREE.ConeGeometry(0.018, 0.04, 4).scale(1, 1, 0.3), cream, ear, 0.006, 0.02, 0);
  }
  // little stitched smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0018, 5, 16, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x3a2018 }));
  smile.position.set(0.108, -0.03, 0);
  smile.rotation.set(0, Math.PI / 2, Math.PI + 0.3);
  head.add(smile);
  // floppy legs (dangle when carried)
  const legs = [];
  for (const [x, s] of [[0.06, -1], [0.06, 1], [-0.07, -1], [-0.07, 1]]) {
    const leg = new THREE.Group();
    leg.position.set(x, -0.045, s * 0.04);
    shake.add(leg);
    m(new THREE.CapsuleGeometry(0.018, 0.04, 6, 12), orange, leg, 0, -0.03, 0);
    m(new THREE.SphereGeometry(0.02, 12, 8), brown, leg, 0, -0.058, 0);
    legs.push(leg);
  }
  // big fluffy tail with a white tip, three segments so it can flop
  const tail = [];
  let parent = shake, px = -0.1;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.set(px, i ? 0 : 0.01, 0);
    parent.add(seg);
    const r = [0.035, 0.04, 0.033][i];
    m(puffy(0.045, r, r, 20), i === 2 ? cream : orange, seg, -0.04, 0, 0);
    tail.push(seg);
    parent = seg;
    px = -0.075;
  }
  // stitched seam along the back
  const stitchMat = new THREE.MeshStandardMaterial({ color: 0x7a3a18 });
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.22;
    m(new THREE.BoxGeometry(0.008, 0.002, 0.0025), stitchMat, shake, Math.sin(a) * 0.1, Math.cos(a) * 0.072, 0).rotation.z = -a;
  }
  // squeaker tag
  const tag = m(new THREE.BoxGeometry(0.02, 0.003, 0.03), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), shake, -0.09, -0.02, 0.06);
  tag.rotation.set(0.3, 0, 0.5);

  // squish: 0..1 squeeze in the jaws (fat in the middle, pinched where bitten)
  toy.squish = (s = 0) => {
    torso.scale.set(1 + s * 0.12, 1 - s * 0.35, 1 + s * 0.25);
    shake.scale.set(1, 1 - s * 0.08, 1);
  };
  // flop: -1..1 swing of head, tail and legs (gravity / shaking)
  toy.flop = (f = 0, droop = 0.6) => {
    head.rotation.z = -droop * 0.5 + f * 0.25;
    tail.forEach((seg, i) => (seg.rotation.z = droop * (0.35 + i * 0.12) - f * (0.3 + i * 0.15)));
    legs.forEach((leg, i) => (leg.rotation.x = (i % 2 ? 1 : -1) * 0.2 + f * 0.6 * (i < 2 ? 1 : -1)));
  };
  toy.flop(0, 0);
  return toy;
}

// fuzzy tennis ball (radius 0.033 m)
export function tennisBall() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#cfe03a"; x.fillRect(0, 0, 256, 128);
  x.strokeStyle = "#f6f6ee"; x.lineWidth = 7; x.beginPath();
  for (let i = 0; i <= 256; i++) x.lineTo(i, 64 + Math.sin((i / 256) * Math.PI * 4) * 36);
  x.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.033, 24, 16), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xf4ff9a), sheenRoughness: 0.4 }));
  ball.castShadow = ball.receiveShadow = true;
  return ball;
}

// knotted rope tug toy, ~0.32 m
export function ropeToy({ colors = [0xd23b3b, 0xf2efe6, 0x2f6fb7] } = {}) {
  const g = new THREE.Group();
  const strands = colors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
  for (let s = 0; s < 3; s++) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, a = u * Math.PI * 14 + (s * Math.PI * 2) / 3;
      pts.push(new THREE.Vector3(-0.13 + u * 0.26, Math.cos(a) * 0.008, Math.sin(a) * 0.008));
    }
    m(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.007, 6), strands[s], g);
  }
  for (const x of [-0.14, 0.14]) {
    m(new THREE.SphereGeometry(0.026, 14, 10), strands[1], g, x, 0, 0).scale.set(1.2, 0.9, 0.9);
    for (let k = 0; k < 6; k++) {
      const f = m(new THREE.CylinderGeometry(0.005, 0.002, 0.05, 5), strands[k % 3], g, x + Math.sign(x) * 0.04, 0, 0);
      f.rotation.set(k, 0, Math.PI / 2 + Math.sign(x) * (0.2 + (k % 3) * 0.15));
    }
  }
  return g;
}
