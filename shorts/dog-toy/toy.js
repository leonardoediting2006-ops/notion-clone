// The hero toy for this short: a squeaky rubber duck (Khronos glTF sample "Duck",
// assets/props/RubberDuck.glb). Swap the model here and every shot follows.
//
// Same interface as js/toys.js plushToy(): origin at the middle of the toy (where the
// dog bites), toy.squish(0..1) squeezes it, toy.flop(f, droop) wobbles it.
import { THREE } from "../../js/engine.js";
import { loadProp } from "../../js/props.js";

export function createToy(short) {
  const toy = new THREE.Group();
  const wobble = new THREE.Group(); // rotates for flop()
  const squash = new THREE.Group(); // scales for squish()
  toy.add(wobble);
  wobble.add(squash);
  const duck = loadProp(short, "RubberDuck", { length: 0.19 });
  squash.add(duck);
  let ready = false;
  function finish() {
    const size = duck.userData.size;
    if (!size || ready) return;
    ready = true;
    duck.position.y = -size.y * 0.5; // centre the duck on the bite point
    // glossy squeaky rubber instead of the old Blinn look
    duck.traverse((o) => {
      if (!o.isMesh) return;
      const old = o.material;
      o.material = new THREE.MeshPhysicalMaterial({
        map: old.map ?? null, color: old.map ? 0xffffff : 0xffd21f,
        roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.15, sheen: 0.2,
      });
    });
  }
  toy.squish = (s = 0) => {
    finish();
    // pinched in the jaws: flatter, wider, a little bulge
    squash.scale.set(1 + s * 0.1, 1 - s * 0.28, 1 + s * 0.16);
  };
  toy.flop = (f = 0, droop = 0) => {
    finish();
    wobble.rotation.set(f * 0.35, 0, -droop * 0.25 + f * 0.15);
  };
  return toy;
}
