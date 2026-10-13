// Preview of the posable beagle (js/beagle.js). ?pose=sit|lie|side|leap|walk|run|stand,
// &view=side|front|top|face, &test=Bone:x:y:z,... to rotate single bones.
import { createShort, THREE } from "../../js/engine.js";
import { createBeagle } from "../../js/beagle.js";
import * as T from "../../js/textures.js";

const params = new URLSearchParams(location.search);
const short = createShort({ duration: 6, lights: false, fov: 30, background: "#cfd3d8" });
const { scene, camera, renderer, onUpdate } = short;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xeef2ff, 0x8a8070, 1.3));
const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
key.position.set(3, 5, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
key.shadow.normalBias = 0.02;
scene.add(key);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), T.concrete({ tile: 1, repeat: [6, 6], color: 0xb8b4ac }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const dog = createBeagle(short, { cute: +(params.get("cute") ?? 0) });
scene.add(dog);
const tests = (params.get("test") ?? "").split(",").filter(Boolean).map((s) => s.split(":"));
const pose = params.get("pose") ?? "stand";
const extra = JSON.parse(params.get("o") ?? "{}");
const view = params.get("view") ?? "side";
onUpdate((t) => {
  const o = { t, x: 0, z: 0, ry: 0, wag: 1 };
  if (pose !== "stand") o[pose] = 1;
  if (pose === "walk" || pose === "run") o[pose + "Phase"] = t * (pose === "run" ? 2.6 : 1.4);
  if (dog.pose) dog.pose({ ...o, ...extra });
  else dog.resetBones?.();
  for (const [b, x, y, z] of tests) dog.turn(b, +x || 0, +y || 0, +z || 0);
  const c = { side: [3.6, 0.42, 0.08], front: [0.15, 0.5, 2.2], top: [0.6, 2.2, 0.6], face: [0.15, 0.5, 1.0], back: [-1.2, 0.6, -1.6] }[view];
  camera.position.set(...c);
  camera.lookAt(0, 0.3, 0.08);
  if (view === "face" && dog.ready()) {
    const h = dog.point("Head", [0, 0, 0.07]);
    camera.position.set(h.x + 0.12, h.y + 0.03, h.z + 0.85);
    camera.lookAt(h.x, h.y - 0.02, h.z);
  }
});
window.__dbg = { scene, camera, renderer, dog };
short.start();
