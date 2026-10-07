import { createShort, splitWords, THREE, gsap } from "../../js/engine.js";

const short = createShort({ duration: 10 });
const { scene, camera, tl, onUpdate } = short;

// 1. Build your 3D scene
const box = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0xff3d7f, metalness: 0.4, roughness: 0.3 })
);
box.position.y = 1.5;
scene.add(box);

// 2. Continuous motion: use only `t` (timeline seconds), never Date.now()
onUpdate((t) => {
  box.rotation.set(t * 0.5, t * 0.8, 0);
});

// 3. Choreograph with the GSAP timeline (position param = start time in seconds)
const words = splitWords(document.getElementById("title"));
gsap.set(words, { opacity: 0, y: 50 });

tl.from(box.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "back.out(2)" }, 0.2)
  .to(words, { opacity: 1, y: 0, stagger: 0.12, duration: 0.4, ease: "back.out(2)" }, 0.8);

short.start();
