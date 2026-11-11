// A camera that never stops: a smooth path through time-stamped waypoints (Catmull-Rom with non-uniform times, so the velocity is
// continuous through every waypoint: the camera glides, it never eases to a halt at each one).
//
//   import { cameraPath } from "../../js/camera-path.js";
//   const cam = cameraPath([
//     { t: 3.78, pos: [0, 0.5, 2], look: [0, 0.3, 0], fov: 46 },
//     { t: 6.00, pos: [-1, 0.6, 1.5], look: [-1.6, 0.4, 0.5], fov: 46 },
//     { t: 7.5,  pos: [-2, 0.5, 1.6], look: [-2.3, 0.35, 0.9], fov: 42 },
//   ]);
//   const { pos, look, fov } = cam(t);        // THREE.Vector3, THREE.Vector3, number; clamps before the first / after the last key
//
// Options per waypoint: `ease` ("glide" = default, "hold" = linger a little near this key); `swoop` on a segment: a quick pull-back
// is just two waypoints 0.2 s apart. Pure function of time: any frame can be redrawn.

import { THREE } from "./engine.js";

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function cameraPath(keys, { tension = 0.5 } = {}) {
  const K = keys.map((k) => ({ t: k.t, pos: V(k.pos), look: V(k.look), fov: k.fov ?? 46 }));
  // tangents (per unit time) from neighbouring keys, scaled by tension
  const tan = (prop, i, dim) => {
    const a = K[Math.max(0, i - 1)], b = K[Math.min(K.length - 1, i + 1)], dt = b.t - a.t || 1;
    if (dim === "fov") return (b.fov - a.fov) / dt * tension * 2;
    return b[prop].clone().sub(a[prop]).multiplyScalar(tension * 2 / dt);
  };
  const T = K.map((_, i) => ({ pos: tan("pos", i), look: tan("look", i), fov: tan("fov", i, "fov") }));
  const herm = (p0, p1, m0, m1, h, s) => {            // cubic Hermite for vectors; h = segment length in time, s in 0..1
    const s2 = s * s, s3 = s2 * s;
    return p0.clone().multiplyScalar(2 * s3 - 3 * s2 + 1).addScaledVector(m0, h * (s3 - 2 * s2 + s)).addScaledVector(p1, -2 * s3 + 3 * s2).addScaledVector(m1, h * (s3 - s2));
  };
  const hermN = (p0, p1, m0, m1, h, s) => { const s2 = s * s, s3 = s2 * s; return p0 * (2 * s3 - 3 * s2 + 1) + h * m0 * (s3 - 2 * s2 + s) + p1 * (-2 * s3 + 3 * s2) + h * m1 * (s3 - s2); };
  return function at(t) {
    if (t <= K[0].t) return { pos: K[0].pos.clone(), look: K[0].look.clone(), fov: K[0].fov };
    if (t >= K.at(-1).t) return { pos: K.at(-1).pos.clone(), look: K.at(-1).look.clone(), fov: K.at(-1).fov };
    let i = 0; while (t > K[i + 1].t) i++;
    const h = K[i + 1].t - K[i].t, s = (t - K[i].t) / h;
    return {
      pos: herm(K[i].pos, K[i + 1].pos, T[i].pos, T[i + 1].pos, h, s),
      look: herm(K[i].look, K[i + 1].look, T[i].look, T[i + 1].look, h, s),
      fov: hermN(K[i].fov, K[i + 1].fov, T[i].fov, T[i + 1].fov, h, s),
    };
  };
}
