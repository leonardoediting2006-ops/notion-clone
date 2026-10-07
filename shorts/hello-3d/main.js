import { createShort, splitWords, THREE, gsap } from "../../js/engine.js";

const short = createShort({ duration: 8, background: "#0b0b14", cameraZ: 9 });
const { scene, camera, tl, onUpdate } = short;

// ---------- 3D objects ----------
const hero = new THREE.Group();
hero.position.y = 1.4;
scene.add(hero);

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.32, 220, 32),
  new THREE.MeshStandardMaterial({ color: 0xff3d7f, metalness: 0.6, roughness: 0.2 })
);
hero.add(knot);

const cubes = [];
const cubeMat = new THREE.MeshStandardMaterial({ color: 0x38e1ff, metalness: 0.3, roughness: 0.35 });
for (let i = 0; i < 6; i++) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), cubeMat);
  hero.add(c);
  cubes.push(c);
}

// Background star field
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(1500 * 3);
for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 40;
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8888ff, size: 0.05 }));
stars.position.z = -10;
scene.add(stars);

// ---------- continuous motion (driven by timeline time t) ----------
const orbit = { radius: 0 };
onUpdate((t) => {
  knot.rotation.set(t * 0.6, t * 0.9, 0);
  cubes.forEach((c, i) => {
    const a = t * 1.5 + (i / cubes.length) * Math.PI * 2;
    c.position.set(Math.cos(a) * orbit.radius, Math.sin(a * 2) * 0.4, Math.sin(a) * orbit.radius);
    c.rotation.set(a, a, 0);
  });
  stars.rotation.z = t * 0.03;
});

// ---------- timeline ----------
hero.scale.setScalar(0);
const titleWords = splitWords(document.getElementById("title"));
const subtitle = document.getElementById("subtitle");
gsap.set(titleWords, { opacity: 0, y: 60, scale: 0.6 });
gsap.set(subtitle, { opacity: 0, y: 30 });

tl.to(hero.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: "elastic.out(1, 0.5)" }, 0.2)
  .to(orbit, { radius: 1.8, duration: 1.4, ease: "power3.out" }, 0.6)
  .from(camera.position, { z: 14, duration: 2.5, ease: "power2.out" }, 0)
  .to(titleWords, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.15, ease: "back.out(2)" }, 1.0)
  .to(subtitle, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 1.8)
  .to(knot.material.color, { r: 0.22, g: 0.88, b: 1, duration: 1.5, ease: "sine.inOut" }, 4)
  .to(camera.position, { z: 7, duration: 3, ease: "sine.inOut" }, 4)
  // outro
  .to([...titleWords, subtitle], { opacity: 0, y: -40, duration: 0.4, stagger: 0.05 }, 7.2)
  .to(hero.scale, { x: 0, y: 0, z: 0, duration: 0.6, ease: "back.in(2)" }, 7.3);

short.start();
