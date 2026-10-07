// Prop Library preview: every downloaded + code-built prop in one studio shot.
// ?group=furniture | vehicles | small to frame one group.
import { createShort, THREE } from "../../js/engine.js";
import { loadProp, mailbox, handbag, hat, picketFence, useEnvironment } from "../../js/props.js";
import { loadAvatar } from "../../js/avatar.js";
import * as T from "../../js/textures.js";

const group = new URLSearchParams(location.search).get("group") ?? "furniture";
const short = createShort({ duration: 6, lights: false, fov: 35, background: "#d6d8dc" });
const { scene, camera, renderer, onUpdate } = short;
renderer.shadowMap.enabled = true;
useEnvironment(renderer, scene, 0.7);
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xf2f4ff, 0x8a8070, 1.4));
const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
key.position.set(4, 7, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
key.shadow.normalBias = 0.02;
scene.add(key);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), T.concrete({ tile: 1, repeat: [10, 10], color: 0xc4c0b8 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const place = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; scene.add(o); return o; };
let cam;
if (group === "furniture") {
  place(loadProp(short, "GlamVelvetSofa", { width: 2.0 }), -0.6, -1.2);
  place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.0 }), 1.7, -1.2, -0.3);
  place(loadProp(short, "SheenChair", { height: 0.85 }), -1.4, 0.4, 0.5);
  place(loadProp(short, "ChairDamaskPurplegold", { height: 0.95 }), 0.1, 0.5, 0.2);
  place(loadProp(short, "SpecularSilkPouf", { height: 0.42 }), 1.3, 0.5);
  place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.0 }), -2.4, -0.4);
  place(loadProp(short, "GlassVaseFlowers", { height: 0.5 }), 2.4, 0.4);
  const lamp = loadProp(short, "AnisotropyBarnLamp", { height: 0.5 });
  lamp.position.set(0.9, 1.9, -0.6);
  scene.add(lamp);
  cam = [[0, 3.2, 9.5], [0, 0.6, -0.4]];
} else if (group === "vehicles") {
  const cars = ["sedan", "hatchback", "suv", "van", "delivery-truck", "taxi", "police-car"];
  cars.forEach((c, i) => place(loadProp(short, c, { length: c === "delivery-truck" ? 5.5 : 4.4 }), (i % 2 - 0.5) * 3.4, i * -3.2 + 6, 0.5));
  cam = [[0, 10, 22], [0, 0.5, -3]];
} else if (group === "cars") {
  place(loadProp(short, "CarConcept", { length: 4.5 }), -1.5, 1.2, 0.7);
  place(loadProp(short, "CarConcept", { length: 4.5, paint: 0x1f3550 }), 1.6, -1.6, 0.7);
  place(loadProp(short, "CarConcept", { length: 4.5, paint: 0xd8d8d4 }), -1.2, -4.6, 0.7);
  cam = [[0, 4.6, 15], [0, 0.6, -1.8]];
} else {
  place(mailbox(), -1.1, 0.1, 0.5).setFlag(1);
  place(picketFence(2.4), -0.4, -0.9);
  place(handbag(), 0.5, 0.2, 0.3);
  place(handbag({ color: 0x1d1d1f, w: 0.28, h: 0.2 }), 0.95, 0.35, -0.4);
  ["cap", "fedora", "uniform", "beanie"].forEach((t, i) => {
    const h = hat(t, { color: [0x2f4f7a, 0x5a4636, 0x232c40, 0x7a2a2a][i] });
    h.position.set(-0.55 + i * 0.4, 0.62, 0.9);
    h.rotation.y = 0.4;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.6, 16), new THREE.MeshStandardMaterial({ color: 0x777777 }));
    stand.position.set(-0.55 + i * 0.4, 0.3, 0.9);
    scene.add(h, stand);
  });
  place(loadProp(short, "TrafficCone", { height: 0.7 }), 1.6, -0.5);
  place(loadAvatar(short, "Dog_Beagle_01"), 1.6, 1.0, -0.6);
  cam = [[0.2, 2.4, 8.4], [0.2, 0.6, 0]];
}
onUpdate(() => { camera.position.set(...cam[0]); camera.lookAt(...cam[1]); });
short.start();
