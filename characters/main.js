// Character Lab: every human preset on a turntable, for checking looks.
// ?only=dad shows one preset close up. Render stills with tools/render.mjs.
import { createShort, THREE } from "../js/engine.js";
import { createHuman, PRESETS } from "../js/human.js";
import * as T from "../js/textures.js";

const params = new URLSearchParams(location.search);
const only = params.get("only");
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
const rim = new THREE.DirectionalLight(0xbcd0ff, 1.4);
rim.position.set(-4, 3, -4);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), T.concrete({ tile: 1, repeat: [6, 6], color: 0xb8b4ac }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const names = only ? [only] : Object.keys(PRESETS);
const people = names.map((n, i) => {
  const h = createHuman(PRESETS[n]);
  h.position.x = (i - (names.length - 1) / 2) * 0.58;
  scene.add(h);
  return h;
});

const close = params.has("face");
onUpdate((t) => {
  people.forEach((p, i) => {
    p.rotation.y = only ? Math.sin(t * 0.8) * 0.6 : Math.sin(t * 0.8 + i) * 0.35;
    p.blink(t % 3.2 > 3.05 ? 1 : 0);
  });
  if (close) {
    camera.position.set(0, 1.67, 0.8);
    camera.lookAt(0, 1.64, 0);
  } else if (only) {
    camera.position.set(0, 1.0, 4.6);
    camera.lookAt(0, 0.95, 0);
  } else {
    camera.position.set(0, 1.0, 10.8);
    camera.lookAt(0, 0.95, 0);
  }
});

window.__dbg = { scene, camera, renderer };
short.start();
