// Preview of the Rocketbox avatars. ?only=Name, &face for a close-up, &walk to animate.
import { createShort, THREE } from "../../js/engine.js";
import { loadAvatar } from "../../js/avatar.js";
import * as T from "../../js/textures.js";

const params = new URLSearchParams(location.search);
const NAMES = ["Delivery_Male_01", "Male_Adult_08", "Female_Adult_01"];
const names = params.get("only") ? [params.get("only")] : NAMES;
const short = createShort({ duration: 8, lights: false, fov: 30, background: "#cfd3d8" });
const { scene, camera, renderer, onUpdate } = short;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xeef2ff, 0x8a8070, 1.3));
const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
key.position.set(3, 5, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xbcd0ff, 1.2);
rim.position.set(-4, 3, -4);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), T.concrete({ tile: 1, repeat: [6, 6], color: 0xb8b4ac }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const people = names.map((n, i) => {
  const a = loadAvatar(short, n);
  a.position.x = (i - (names.length - 1) / 2) * 0.8;
  scene.add(a);
  return a;
});
const face = params.has("face"), walk = params.has("walk"), sit = params.has("sit");
onUpdate((t) => {
  people.forEach((p, i) => {
    p.rotation.y = names.length > 1 ? (i - 1) * -0.25 : 0.4;
    if (walk) p.walk(t * 7, params.get("walk") === "run" ? 1 : 0.5);
    else if (sit) p.sit();
    else p.resetPose();
    p.update();
  });
  if (face) { camera.position.set(0.15, 1.62, 0.9); camera.lookAt(0, 1.6, 0); }
  else if (names.length === 1) { camera.position.set(0, 1.0, 4.8); camera.lookAt(0, 0.92, 0); }
  else { camera.position.set(0, 1.0, 7.5); camera.lookAt(0, 0.9, 0); }
});
window.__dbg = { scene, camera, renderer, people };
short.start();
