import { THREE } from "../../js/engine.js";
import { toon, roundedBox, outline } from "../../js/toon.js";

// The props of "Why your dog paws at you": your 3D hand and forearm for the close-ups, the hero paw on the stage,
// a pair of cartoon arms that pop out of the dog, the boss's office (desk, big chair, tie).

const SKIN = 0xf1c7a0, SLEEVE = 0x3f8fe0;
const shadowed = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });

// ---------- your hand: wrist at the origin, fingers along +x, the back of the hand up (+y), the forearm along -x ----------
// hand.set({ pos, yaw, pitch, roll, curl, spread }) places it: yaw turns it about y, pitch lifts the fingers, roll turns the palm up (PI).
export function buildHand({ skin = SKIN, sleeve = SLEEVE, forearm = 0.42 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const sk = toon(skin), sl = toon(sleeve), cuff = toon(0xffffff), nail = toon(0xffe0d0);
  const add = (geo, mat, x, y, z, parent = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  // palm and back of the hand (a soft slab, a little wider at the knuckles)
  const palm = add(roundedBox(0.1, 0.034, 0.09, 0.016, 3), sk, 0.052, 0, 0);
  palm.scale.set(1, 1, 1);
  add(new THREE.SphereGeometry(0.03, 14, 10), sk, 0.006, -0.002, 0).scale.set(1.2, 0.62, 1.45);   // the heel of the hand into the wrist
  // fingers: two segments each, bending down by `curl`
  const fingers = [];
  const LEN = [0.052, 0.06, 0.057, 0.045];
  [-0.033, -0.011, 0.011, 0.033].forEach((z, i) => {
    const base = new THREE.Group(); base.position.set(0.1, 0.002, z * 1.02); body.add(base);
    const r = 0.0112 - i * 0.0004;
    const a = add(new THREE.CapsuleGeometry(r, LEN[i] * 0.5, 4, 10).rotateZ(Math.PI / 2), sk, LEN[i] * 0.25 + 0.004, 0, 0, base);
    const mid = new THREE.Group(); mid.position.set(LEN[i] * 0.55, 0, 0); base.add(mid);
    add(new THREE.CapsuleGeometry(r * 0.95, LEN[i] * 0.42, 4, 10).rotateZ(Math.PI / 2), sk, LEN[i] * 0.22 + 0.004, 0, 0, mid);
    const n = add(new THREE.BoxGeometry(0.012, 0.003, r * 1.4), nail, LEN[i] * 0.4, r * 0.85, 0, mid); n.userData.ink = false;
    void a; fingers.push({ base, mid });
  });
  // thumb: out to the side and forward
  const thumb = new THREE.Group(); thumb.position.set(0.03, -0.004, -0.045); thumb.rotation.y = 0.75; body.add(thumb);
  add(new THREE.CapsuleGeometry(0.0125, 0.03, 4, 10).rotateZ(Math.PI / 2), sk, 0.022, 0, 0, thumb);
  const tmid = new THREE.Group(); tmid.position.set(0.042, 0, 0); thumb.add(tmid);
  add(new THREE.CapsuleGeometry(0.0118, 0.022, 4, 10).rotateZ(Math.PI / 2), sk, 0.016, 0, 0, tmid);
  // wrist, forearm, sleeve with a white cuff
  add(new THREE.CylinderGeometry(0.031, 0.036, forearm, 16).rotateZ(Math.PI / 2), sk, -forearm / 2, -0.002, 0).scale.set(1, 0.82, 1.15);
  add(new THREE.CylinderGeometry(0.05, 0.054, forearm * 0.62, 18).rotateZ(Math.PI / 2), sl, -forearm * 0.69, -0.002, 0).scale.set(1, 0.9, 1.08);
  add(new THREE.TorusGeometry(0.048, 0.011, 8, 20).rotateY(Math.PI / 2), cuff, -forearm * 0.38, -0.002, 0).scale.set(1, 0.9, 1.08);
  shadowed(root); outline(root, { width: 0.004, min: 0.005 });
  root.visible = false;
  const hand = {
    group: root,
    // the point on top of the hand (back of the hand, or the palm when rolled over) at a distance d along the hand from the wrist
    top(d = 0.05) { root.updateMatrixWorld(true); return body.localToWorld(new THREE.Vector3(d, 0.02, 0)); },
    set({ pos, yaw = 0, pitch = 0, roll = 0, curl = 0.15, spread = 0, squish = 0 }) {
      root.visible = true; root.position.copy(pos);
      root.rotation.set(0, 0, 0); root.rotateY(yaw); root.rotateZ(pitch); root.rotateX(roll);
      fingers.forEach((f, i) => { f.base.rotation.z = -curl * 0.6; f.mid.rotation.z = -curl; f.base.rotation.y = spread * (i - 1.5) * 0.12; });
      tmid.rotation.z = -curl * 0.5;
      body.scale.set(1, 1 - 0.25 * squish, 1 + 0.06 * squish);   // a soft press from above
    },
    hide() { root.visible = false; },
  };
  return hand;
}

// ---------- the hero paw: a big toon paw seen from the sole (pads face +z), standing on its leg ----------
export function buildHeroPaw({ fur = 0xc68f55, light = 0xeed4ab, pad = 0xff7a9a } = {}) {
  const g = new THREE.Group(), f = toon(fur), fl = toon(light), p = toon(pad);
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.26, 0.3, 1.2, 24), f, 0, -0.55, -0.05);              // the leg
  add(new THREE.SphereGeometry(0.42, 32, 22), fl, 0, 0.12, 0, 1.0, 0.95, 0.72);          // the paw
  for (const [x, y] of [[-0.3, 0.42], [-0.11, 0.55], [0.11, 0.55], [0.3, 0.42]]) add(new THREE.SphereGeometry(0.15, 20, 14), fl, x, y, -0.02, 1, 1.05, 0.8);  // the toes
  const pads = [];
  pads.push(add(new THREE.SphereGeometry(0.2, 28, 18), p, 0, 0.02, 0.27, 1.25, 0.95, 0.42));                 // the big pad
  for (const [x, y] of [[-0.3, 0.44], [-0.11, 0.6], [0.11, 0.6], [0.3, 0.44]]) pads.push(add(new THREE.SphereGeometry(0.085, 20, 14), p, x, y, 0.11, 1, 1.15, 0.55));  // toe beans
  // a soft shine on each bean (unlit)
  const shineM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  for (const pd of pads) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), shineM); s.userData.ink = false; s.position.copy(pd.position).add(new THREE.Vector3(-0.25 * pd.scale.x * 0.2, 0.3 * pd.scale.y * 0.2, pd.scale.z * 0.2 * 0.95)); s.scale.set(0.022 * (pd.scale.x / 0.9), 0.016, 0.01); g.add(s); }
  shadowed(g); outline(g, { width: 0.012, min: 0.02 });
  g.visible = false;
  return { group: g, pads, padMat: p };
}

// ---------- cartoon arms that pop out of the dog's sides (for "dogs don't have arms to hug you") ----------
export function buildToonArms() {
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(), el = new THREE.Group();
    const sl = toon(0xffd24a), sk = toon(SKIN);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 12), sl); up.position.y = -0.13; sh.add(up);
    el.position.y = -0.26; sh.add(el);
    const lo = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 12), sk); lo.position.y = -0.12; el.add(lo);
    const mitt = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), sk); mitt.position.y = -0.26; mitt.scale.set(1, 1.1, 0.7); el.add(mitt);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.04, 4, 8), sk); th.position.set(s * 0.05, -0.23, 0); th.rotation.z = s * 0.7; el.add(th);
    shadowed(sh); outline(sh, { width: 0.006, min: 0.01 });
    sh.visible = false;
    return { sh, el, s };
  });
  return arms;
}

// ---------- the boss's office: a big desk, a tall leather chair, papers and a mug; a red tie for the boss ----------
export function buildOffice() {
  const g = new THREE.Group();
  const wood = toon(0x8a4a2a), top = toon(0xb86a3a), leather = toon(0x3a2a4a), metal = toon(0xd8d8e8), paper = toon(0xffffff), mug = toon(0xff5a7a);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  // desk (in front of the chair, toward +z)
  add(roundedBox(1.7, 0.72, 0.8, 0.05), wood, 0, 0.36, 0.75);
  add(roundedBox(1.84, 0.06, 0.92, 0.03), top, 0, 0.75, 0.75);
  for (let i = 0; i < 4; i++) { const pp = add(new THREE.BoxGeometry(0.28, 0.006, 0.36), paper, -0.55 + i * 0.012, 0.785 + i * 0.008, 0.72 - i * 0.01); pp.rotation.y = 0.1 * i; }
  add(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 16), mug, 0.62, 0.845, 0.62);
  { const lamp = new THREE.Group(); lamp.position.set(0.6, 0.78, 0.95); g.add(lamp); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), metal); a.position.y = 0.15; lamp.add(a); const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 16, 1, true), toon(0x3fc9a0, { side: THREE.DoubleSide })); s.position.set(0, 0.3, 0); lamp.add(s); }
  // the big chair (seat top at y = 0.62), a tall tufted back
  const chair = new THREE.Group(); g.add(chair);
  const ca = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); chair.add(m); return m; };
  ca(roundedBox(0.8, 0.14, 0.7, 0.06), leather, 0, 0.55, 0);
  ca(roundedBox(0.86, 1.25, 0.18, 0.08), leather, 0, 1.15, -0.36);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ca(new THREE.SphereGeometry(0.022, 8, 6), toon(0xffd24a), -0.24 + c * 0.24, 0.85 + r * 0.3, -0.26);
  for (const s of [-1, 1]) ca(roundedBox(0.12, 0.1, 0.62, 0.04), leather, s * 0.42, 0.78, -0.02), ca(roundedBox(0.08, 0.2, 0.08, 0.02), leather, s * 0.42, 0.66, 0.2);
  ca(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), metal, 0, 0.27, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2, leg = ca(new THREE.BoxGeometry(0.34, 0.04, 0.05), metal, Math.cos(a) * 0.17, 0.06, Math.sin(a) * 0.17); leg.rotation.y = -a; }
  shadowed(g); outline(g, { width: 0.01, min: 0.02 });
  g.visible = false;
  // the tie: a knot and a long red blade, hung from the dog's neck
  const tie = new THREE.Group();
  const red = toon(0xe8283a), stripe = toon(0xffd24a);
  const knot = new THREE.Mesh(roundedBox(0.08, 0.06, 0.04, 0.015), red); tie.add(knot);
  const sh = new THREE.Shape(); sh.moveTo(-0.035, 0); sh.lineTo(0.035, 0); sh.lineTo(0.06, -0.26); sh.lineTo(0, -0.32); sh.lineTo(-0.06, -0.26); sh.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false }), red); blade.position.set(0, -0.025, -0.008); tie.add(blade);
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.018), stripe); st.position.set(0, -0.08 - i * 0.07, 0.006); st.rotation.z = 0.5; st.scale.x = 0.6 + i * 0.12; tie.add(st); }
  // a white collar band under the knot
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), toon(0xffffff)); collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.02, -0.17); tie.add(collar);
  shadowed(tie); outline(tie, { width: 0.006, min: 0.01 });
  tie.visible = false;
  return { group: g, chair, tie, SEAT: 0.62 };
}
