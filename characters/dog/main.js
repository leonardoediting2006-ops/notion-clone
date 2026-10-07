import { createShort, THREE } from "../../js/engine.js";
import { createDog, DOG_COLORS } from "../../js/dog.js";
import { useEnvironment } from "../../js/props.js";

// Dog Lab: every pose of the shared dog side by side.  ?close for head close-ups
const q = new URLSearchParams(location.search);
const close = q.has("close");
const only = q.has("only") ? +q.get("only") : null;
const short = createShort({ duration: 4, lights: false, fov: close ? 30 : 40, background: "#cfd6dc" });
const { scene, camera, renderer, onUpdate } = short;
renderer.shadowMap.enabled = true;
useEnvironment(renderer, scene, 0.5);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 6, 5);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0xbfb8ad }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const POSES = [
  ["stand", { wag: 1 }],
  ["sit", { sit: 1, cute: 1 }],
  ["lie + sad", { lie: 1, sad: 1, headPitch: 0.35, earBack: 0.6 }],
  ["bodyguard", { glasses: 1, earpiece: true, earUp: 0.4 }],
  ["glasses up", { glasses: 0, earpiece: true, sit: 1 }],
  ["eyes closed", { closed: 1, headPitch: 0.5 }],
  ["yawn", { jawOpen: 1.4, closed: 0.8, headPitch: -0.35, lie: 1 }],
  ["wolf snarl", { snarl: 1, angry: 1, earBack: 0.5, colors: "wolf" }],
  ["predator", { snarl: 1, angry: 1, colors: "shadow" }],
];
const dogs = POSES.map(([name, o], i) => {
  const wild = o.colors && o.colors !== "golden";
  const d = createDog({ colors: DOG_COLORS[o.colors ?? "golden"], key: o.colors ?? "", glowEyes: o.colors === "shadow", pointyEars: wild, snout: wild ? 1.35 : 1, collar: !wild });
  scene.add(d);
  d.visible = only === null || only === i;
  d.base = only === i ? { ...o, ry: 0.9 } : { ...o, x: (i % 3 - 1) * 1.6, z: -Math.floor(i / 3) * 2 + 1.6, ry: 0.5 };
  return d;
});
onUpdate((t) => {
  dogs.forEach((d) => d.pose({ ...d.base, t }));
  if (only !== null) {
    camera.position.set(0.6, 1.0, 4.2);
    camera.lookAt(0, 0.45, 0);
  } else if (close) {
    camera.position.set(0.3, 1.5, 4.2);
    camera.lookAt(0, 0.6, 0);
  } else {
    camera.position.set(0, 6.5, 9.5);
    camera.lookAt(0, 0.2, -0.2);
  }
});
window.__dbg = { scene, camera, renderer };
short.start();
