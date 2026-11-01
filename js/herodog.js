// The hero dog as a shared module: the studio's cartoon dog (js/dog.js) with the pose options the shots use
// (sit, lie, side, leap, crouch, walk, run, wag, mouth...). Same code the dog-yawn short carries inline.
import { THREE } from "./engine.js";
import { createDog } from "./dog.js";

const lerp = (a, b, k) => a + (b - a) * k;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const DOG_SCALE = 0.7;
export function heroDog(colors, key, scale = DOG_SCALE) {
  const d = createDog({ colors, key, collar: false });
  d.scale.setScalar(scale);
  const toonPose = d.pose;
  d.pose = ({
    t = 0, x = 0, y = 0, z = 0, ry = 0,
    sit = 0, lie = 0, side = 0, leap = 0, crouch = 0, beg = 0, walk = 0, run = 0,
    headPitch = 0, headYaw = 0, headTilt = 0, neck = 0, mouth = 0, ears = 0, tail = 0,
    wag = 0, wagSpeed = 14, pitch = 0, lift = 0, sideFlip = 1, paw = 0, shiver = 0,
    walkPhase, runPhase, eyes, breathe, earFlap, ...expr
  } = {}) => {
    const moving = run > 0 ? 1 : walk;
    toonPose({
      t, x, y, z, ry, sit, lie: Math.max(lie, side), rear: beg * 0.9, bow: crouch * 0.45,
      headPitch: headPitch + neck * 0.6 + crouch * 0.15, headYaw, tilt: headTilt, jawOpen: mouth,
      wag, wagSpeed, trot: run > 0 ? run : walk * 0.55, trotSpeed: run > 0 ? 24 : 9,
      earBack: Math.max(0, -ears), earUp: Math.max(0, ears), shiver, cute: 1, ...expr,
    });
    void moving;
    // leaping: forelegs reaching forward, hind legs stretched back, body level
    if (leap) {
      d.legs.fl.rotation.x = d.legs.fr.rotation.x = lerp(d.legs.fl.rotation.x, -1.25, leap);
      d.legs.bl.rotation.x = d.legs.br.rotation.x = lerp(d.legs.bl.rotation.x, 1.15, leap);
      d.ears.forEach((e, i) => (e.rotation.x = -0.9 * leap));
    }
    if (paw) d.legs.fl.rotation.x -= 1.1 * paw;
    d.tail.rotation.x += tail * 0.55;
    d.pivot.rotation.x += pitch;
    d.position.y += lift * scale;
    // lying on his side: roll over, legs out
    if (side) {
      d.rotation.z = -1.4 * side * sideFlip;
      d.position.y += 0.14 * scale * side;
      for (const k of ["fl", "fr", "bl", "br"]) d.legs[k].rotation.x = lerp(d.legs[k].rotation.x, k[0] === "f" ? -0.5 : 0.4, side);
      d.pivot.position.y = lerp(d.pivot.position.y, 0.08, side);
      d.hips.position.y = lerp(d.hips.position.y, -0.28, side);
    } else d.rotation.z = 0;
  };
  // points on the dog (names kept from the realistic rig; offsets in metres)
  const PTS = {
    Head: ["head", [0, 0.1, 0.12]], Neck2: ["neck", [0, -0.02, 0.0]], Spine1: ["pivot", [0, 0.2, 0.55]],
    Spine2: ["pivot", [0, 0.2, 0.62]], Body: ["pivot", [0, 0.2, 0.3]], Pelvis: ["pivot", [0, 0.25, 0.0]], L_Hand: ["fl", [0, -0.33, 0.05]], R_Hand: ["fr", [0, -0.33, 0.05]],
  };
  d.point = (name, off = [0, 0, 0]) => {
    const [part, base] = PTS[name] ?? ["pivot", [0, 0.2, 0.35]];
    const o = part.length === 2 ? d.legs[part] : d[part];
    d.updateMatrixWorld(true);
    return o.localToWorld(V(base[0] + off[0] / scale, base[1] + off[1] / scale, base[2] + off[2] / scale));
  };
  return d;
}
