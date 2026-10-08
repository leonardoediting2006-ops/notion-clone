// A worn red nylon leash: snap clip on the collar, a strap that follows any path, and a
// hand loop at the end. Rebuilt every frame from control points, so it can hang from a hand,
// lie on the floor, be held in a mouth or be wrapped around a fence post.
//
//   const leash = createLeash();  scene.add(leash);
//   leash.set([collar, ...controlPoints, end], { loop: true, floor: 0 });
import { THREE } from "../../js/engine.js";

const R = 0.0085; // strap thickness (radius)

export function createLeash({ color = 0x9c2b22 } = {}) {
  const g = new THREE.Group();
  const strap = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, metalness: 0.95, roughness: 0.28 });
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), strap);
  tube.frustumCulled = false;
  g.add(tube);
  // hand loop: a flattened ring of strap, oriented each frame
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.06, R, 8, 32), strap);
  loop.scale.set(1, 1.45, 0.7);
  g.add(loop);
  // snap hook at the collar end
  const clip = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.045, 10), metal);
  clip.add(barrel);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 14, Math.PI * 1.5), metal);
  hook.position.y = -0.03;
  clip.add(hook);
  g.add(clip);
  for (const m of [tube, loop, barrel, hook]) m.castShadow = m.receiveShadow = true;

  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), twist = new THREE.Quaternion();
  // points: [collar, ...control, end]; floor: clamp everything above this height (lies on it)
  g.set = (points, { loop: showLoop = true, floor = 0, loopTwist = 0 } = {}) => {
    const rough = new THREE.CatmullRomCurve3(points, false, "centripetal").getPoints(Math.max(40, points.length * 12));
    for (const p of rough) p.y = Math.max(p.y, floor + R);
    const curve = new THREE.CatmullRomCurve3(rough, false, "centripetal");
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(curve, rough.length, R, 6, false);
    // clip hangs from the collar, pointing along the strap
    const a = points[0], dirA = curve.getTangentAt(0.01);
    clip.position.copy(a);
    clip.quaternion.setFromUnitVectors(up, dirA.clone().negate());
    // loop continues past the end of the strap
    loop.visible = showLoop;
    if (showLoop) {
      const end = rough[rough.length - 1], dir = curve.getTangentAt(0.99).normalize();
      loop.position.copy(end).addScaledVector(dir, 0.08);
      // ring's long axis (y) along the strap direction, twisted around it
      q.setFromUnitVectors(up, dir);
      loop.quaternion.copy(q).multiply(twist.setFromAxisAngle(up, loopTwist));
    }
    return curve;
  };
  return g;
}

// helpers for building leash paths
// a sagging rope from a to b (slack metres of droop), n points
export function sag(a, b, slack, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = a.clone().lerp(b, u);
    p.y -= slack * 4 * u * (1 - u);
    out.push(p);
  }
  return out;
}
// wraps around a vertical post (centre c at height y0), `turns` turns, radius r
export function wrap(c, y0, turns, r = 0.06, startAngle = 0) {
  const out = [];
  const n = Math.max(2, Math.round(turns * 14));
  for (let i = 0; i <= n; i++) {
    const a = startAngle + (i / n) * turns * Math.PI * 2;
    out.push(new THREE.Vector3(c.x + Math.cos(a) * r, y0 + (i / n) * turns * 0.03, c.z + Math.sin(a) * r));
  }
  return out;
}
