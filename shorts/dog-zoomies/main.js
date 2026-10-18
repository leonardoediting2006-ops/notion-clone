import { createShort, THREE, gsap } from "../../js/engine.js";
import * as T from "../../js/textures.js";
import { loadProp, useEnvironment, bookshelf, tvUnit, coffeeTable, floorLamp, wallClock, cushion, wallArt } from "../../js/props.js";
import { tennisBall, ropeToy } from "../../js/toys.js";
import { createDog } from "../../js/dog.js";
import { createSfx } from "../../js/sfx.js";

// "Your dog's zoomies have a scientific name" — FRAPs explained in 24 seconds.
// Facts: Cornell Riney Canine Health Center, "What are zoomies?" (normal behaviour, may release
// pent-up energy; keep zooming dogs off slippery floors and away from obstacles).
// Every shot is a pure function of timeline time, so scrubbing and rendering are exact.

const DURATION = 24;
const FPS = 60;
const short = createShort({ duration: DURATION, fps: FPS, lights: false, fov: 45 });
const { scene, camera, renderer, tl, onUpdate } = short;
camera.near = 0.05;
camera.far = 200;
camera.updateProjectionMatrix();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
useEnvironment(renderer, scene, 0.35);

// ---------- helpers ----------
const plain = new Map();
const mat = (color, opts = {}) => {
  const key = color + JSON.stringify(opts);
  if (!plain.has(key)) plain.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return plain.get(key);
};
const asMat = (m) => (typeof m === "number" ? mat(m) : m);

// Box with UVs in metres, so tiling textures keep a real-world scale.
function worldUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  return geo;
}
function box(w, h, d, m, x = 0, y = 0, z = 0, parent, { uv = false, cast = true } = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (uv) worldUV(geo, w, h, d);
  const mesh = new THREE.Mesh(geo, asMat(m));
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent?.add(mesh);
  return mesh;
}
function group(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}
function place(obj, x, y, z, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  room.add(obj);
  return obj;
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const prog = (t, a, b) => clamp01((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = {
  out: gsap.parseEase("power2.out"),
  in: gsap.parseEase("power2.in"),
  inOut: gsap.parseEase("sine.inOut"),
  back: gsap.parseEase("back.out(2.5)"),
  snap: gsap.parseEase("expo.out"),
};
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- materials ----------
const tile = (m) => [1 / m, 1 / m];
const M = {
  // freshly polished = slippery (that's the point of the skid shot)
  hardwood: new THREE.MeshStandardMaterial({
    map: short.loadTexture("../../assets/textures/hardwood2_diffuse.jpg", { repeat: [1 / 3, 1 / 1.5] }),
    bumpMap: short.loadTexture("../../assets/textures/hardwood2_bump.jpg", { repeat: [1 / 3, 1 / 1.5], color: false }),
    bumpScale: 1.5,
    roughness: 0.3,
  }),
  wall: T.plaster(0xe9ddca, tile(2)),
  accent: T.plaster(0x3f6670, tile(2)),
  ceiling: T.plaster(0xf3efe7, tile(2)),
  trim: T.paintedWood(0xf4f1ea, [1, 1]),
  rug: T.fabric(0xe2cfa6, { repeat: [5, 4], weave: 4, key: "rug" }),
  rugBorder: T.fabric(0x9b3d2c, { repeat: [5, 4], weave: 4, key: "rugBorder" }),
  curtain: T.fabric(0xd8cdb8, { key: "drape", weave: 3 }),
  towel: T.fabric(0x7fc4dc, { repeat: [2, 2], weave: 5, key: "towel" }),
  wicker: T.fabric(0xb48a52, { repeat: [3, 2], weave: 6, key: "wicker" }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fb6d0, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.3, depthWrite: false }),
};

// night sky seen through the patio door (it's 9 pm all evening)
function nightSky() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "#050a1c");
  g.addColorStop(0.7, "#152650");
  g.addColorStop(1, "#24396b");
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  let s = 5;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    const sz = r() < 0.9 ? 1 : 2;
    x.fillRect(r() * c.width, r() * c.height * 0.7, sz, sz);
  }
  x.fillStyle = "#fdf6dc";
  x.shadowColor = "#bcd2ff";
  x.shadowBlur = 30;
  x.beginPath();
  x.arc(c.width * 0.6, c.height * 0.26, 20, 0, Math.PI * 2);
  x.fill();
  x.shadowBlur = 0;
  x.fillStyle = "#060912";
  for (let i = 0; i < 9; i++) {
    x.beginPath();
    x.arc(r() * c.width, c.height * 0.7, 26 + r() * 40, 0, Math.PI * 2);
    x.fill();
  }
  x.fillRect(0, c.height * 0.7, c.width, c.height * 0.3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- the living room ----------
const X0 = -3.7, X1 = 3.7, Z0 = -3.2, Z1 = 4.2, H = 2.8;
const room = group(0, 0, 0, scene);

const floorGeo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0);
{
  const uv = floorGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (X1 - X0), uv.getY(i) * (Z1 - Z0));
}
const floor = new THREE.Mesh(floorGeo, M.hardwood);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, (Z0 + Z1) / 2);
floor.receiveShadow = true;
room.add(floor);
const ceiling = box(X1 - X0, 0.1, Z1 - Z0, M.ceiling, 0, H + 0.05, (Z0 + Z1) / 2, room, { uv: true, cast: false });

// back wall (accent colour behind the sofa), right wall, front wall: no shadows, they'd only darken the room
box(X1 - X0, H, 0.12, M.accent, 0, H / 2, Z0 - 0.06, room, { uv: true, cast: false });
box(0.12, H, Z1 - Z0, M.wall, X1 + 0.06, H / 2, (Z0 + Z1) / 2, room, { uv: true, cast: false });
box(X1 - X0, H, 0.12, M.wall, 0, H / 2, Z1 + 0.06, room, { uv: true, cast: false });
// left wall with a tall patio door (casts shadows so moonlight falls through the opening)
const DOOR_Z = 1.0, DOOR_TOP = 2.35;
box(0.12, H, -DOOR_Z - Z0, M.wall, X0 - 0.06, H / 2, (Z0 - DOOR_Z) / 2, room, { uv: true });
box(0.12, H, Z1 - DOOR_Z, M.wall, X0 - 0.06, H / 2, (Z1 + DOOR_Z) / 2, room, { uv: true });
box(0.12, H - DOOR_TOP, DOOR_Z * 2, M.wall, X0 - 0.06, (H + DOOR_TOP) / 2, 0, room, { uv: true });
for (const z of [-DOOR_Z, 0, DOOR_Z]) box(0.1, DOOR_TOP, 0.07, M.trim, X0 - 0.04, DOOR_TOP / 2, z, room);
for (const y of [0.04, DOOR_TOP]) box(0.1, 0.07, DOOR_Z * 2 + 0.07, M.trim, X0 - 0.04, y, 0, room);
const pane = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_Z * 2, DOOR_TOP), M.glass);
pane.rotation.y = Math.PI / 2;
pane.position.set(X0 - 0.05, DOOR_TOP / 2, 0);
room.add(pane);
for (const s of [-1, 1]) box(0.06, 2.5, 0.42, M.curtain, X0 + 0.1, 1.3, s * (DOOR_Z + 0.32), room);
const sky = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ map: nightSky() }));
sky.rotation.y = Math.PI / 2;
sky.position.set(X0 - 3, 1.8, 0);
room.add(sky);
// baseboards
box(X1 - X0, 0.1, 0.03, M.trim, 0, 0.05, Z0 + 0.015, room, { cast: false });
box(X1 - X0, 0.1, 0.03, M.trim, 0, 0.05, Z1 - 0.015, room, { cast: false });
box(0.03, 0.1, Z1 - Z0, M.trim, X1 - 0.015, 0.05, (Z0 + Z1) / 2, room, { cast: false });

// rug (slides when the dog skids off it)
const rug = group(0, 0, 0, room);
box(3.7, 0.012, 2.7, M.rugBorder, 0, 0.006, 0, rug, { cast: false });
box(3.36, 0.004, 2.36, M.rug, 0, 0.014, 0, rug, { cast: false });

// furniture
place(coffeeTable({ w: 1.1, d: 0.6 }), 0, 0, 0);
// real furniture (Khronos glTF sample assets, see assets/CREDITS.md)
place(loadProp(short, "SheenWoodLeatherSofa", { width: 2.4 }), 0, 0, Z0 + 0.5);
place(cushion({ color: 0xc9783a }), -0.72, 0.62, Z0 + 0.42).rotation.x = -0.25;
place(cushion({ color: 0x3f7f86 }), 0.76, 0.62, Z0 + 0.42).rotation.set(-0.25, 0, 0.12);
place(loadProp(short, "DiffuseTransmissionPlant", { height: 1.25 }), X1 - 0.45, 0, Z0 + 0.45);
place(loadProp(short, "SpecularSilkPouf", { height: 0.4 }), 2.65, 0, -1.75);
place(bookshelf({ w: 1.2, seed: 5 }), X1 - 0.19, 0, 0.9, -Math.PI / 2);
place(tvUnit({ w: 1.7 }), 0, 0, Z1 - 0.25, Math.PI);
place(wallArt({ w: 1.1, h: 0.7, style: "abstract", seed: 4 }), -0.1, 1.68, Z0 + 0.01);
place(wallClock({ hours: 21.0 }), 1.75, 1.78, Z0 + 0.01);
place(wallArt({ w: 0.5, h: 0.7, style: "landscape", seed: 2 }), X1 - 0.01, 1.6, -1.4, -Math.PI / 2);
const lamp = place(floorLamp({ h: 1.55 }), X0 + 0.75, 0, Z0 + 0.55);
lamp.light.intensity = 4;
lamp.light.distance = 6;
let lampShade = null;
lamp.traverse((o) => {
  if (o.isMesh && o.material.emissiveIntensity > 0.1) lampShade = o;
});

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffeedd, 0x5a4636, 0.75);
scene.add(hemi);
// warm ceiling light
const key = new THREE.DirectionalLight(0xffe0b5, 1.8);
key.position.set(2.2, 6, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -5.5, right: 5.5, top: 5.5, bottom: -5.5, near: 0.5, far: 20 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
// moonlight through the patio door (night shot only)
const moon = new THREE.DirectionalLight(0x86a8ff, 2.4);
moon.position.set(-9, 3.4, 0.8);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.02;
moon.visible = false;
scene.add(moon);
const ENV_I = scene.environmentIntensity;

function setEnv(kind) {
  const night = kind === "night";
  hemi.color.set(night ? 0x6b80b0 : 0xffeedd);
  hemi.groundColor.set(night ? 0x141824 : 0x5a4636);
  hemi.intensity = night ? 0.4 : 0.75;
  key.visible = !night;
  moon.visible = night;
  lamp.light.intensity = night ? 0 : 4;
  if (lampShade) lampShade.material.emissiveIntensity = night ? 0.03 : 0.6;
  scene.environmentIntensity = night ? 0.06 : ENV_I;
  renderer.toneMappingExposure = night ? 1.0 : 1.05;
}

// ---------- the dog ----------
const dog = createDog();
scene.add(dog);
const { legs, eyes } = dog;

// bath towel draped over the back (flaps while running)
const towel = group(0, 0, 0, dog.pivot);
box(0.54, 0.025, 0.62, M.towel, 0, 0.445, 0.38, towel);
const flaps = [-1, 1].map((s) => {
  const f = group(s * 0.27, 0.445, 0.38, towel);
  box(0.025, 0.3, 0.62, M.towel, s * 0.012, -0.15, 0, f);
  return f;
});
towel.visible = false;

// ---------- the zoomies path: wobbly laps around the coffee table ----------
const RX = 1.72, RZ = 1.22;
function pathAt(th) {
  const w = 1 + 0.045 * Math.sin(th * 1.5 + 0.7); // laps never quite repeat
  return [RX * w * Math.cos(th), RZ * w * Math.sin(th)];
}
function headingAt(th) {
  const [ax, az] = pathAt(th - 0.01);
  const [bx, bz] = pathAt(th + 0.01);
  return Math.atan2(bx - ax, bz - az);
}
const T_LAUNCH = 1.3;
const TH0 = 2.0; // where the dog naps, on the path
const OMEGA = 3.4; // rad/s once at full speed (~5 m/s)
const TAU = 0.4; // take-off
function lapTheta(t) {
  const u = Math.max(0, t - T_LAUNCH);
  return TH0 + OMEGA * (u - TAU * (1 - Math.exp(-u / TAU)));
}
const lapSpeed = (t) => 1 - Math.exp(-Math.max(0, t - T_LAUNCH) / TAU);

// world point relative to the dog (dx = dog's left, dz = forward)
function at(D, dx, dy, dz) {
  const c = Math.cos(D.ry), s = Math.sin(D.ry);
  return [D.x + dx * c + dz * s, dy, D.z - dx * s + dz * c];
}

// full-speed gallop along the path, leaning into the curve
function zoomPose(t, th, { speed = 1, lean = 0.22, ...extra } = {}) {
  const [x, z] = pathAt(th);
  const ry = headingAt(th);
  dog.pose({
    x, z, ry, t,
    trot: 1.35 * speed, trotSpeed: 25,
    rear: 0.06 * speed * Math.sin(t * 25 + 1), // gallop rock
    wag: 0.6, wagSpeed: 22,
    jawOpen: 0.5 + 0.12 * Math.sin(t * 31), // flappy tongue
    earBack: 0.7 + 0.25 * Math.sin(t * 37),
    headYaw: -0.22 * speed, // looking into the turn
    pupil: 1.3, cute: 0.35,
    ...extra,
  });
  dog.rotation.z = lean * speed;
  dog.hips.position.y -= 0.04 * speed; // butt tucked
  return { x, z, ry };
}

// ---------- persistent mess, keyed to absolute time ----------
const T_KICK = 3.05, T_BUMP = 4.81, T_SKID = 6.95; // T_BUMP: lap 2 at the far end of the table
const outward = (th) => {
  const [x, z] = pathAt(th);
  const l = Math.hypot(x, z);
  return [x / l, z / l];
};

// floor cushion the dog punts
const kicked = cushion({ color: 0xe0b23f, w: 0.5, h: 0.5 });
kicked.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
room.add(kicked);
const C0 = (() => {
  const th = lapTheta(T_KICK);
  const [x, z] = pathAt(th);
  return [x, z];
})();
const C1 = (() => {
  const th = lapTheta(T_KICK);
  const h = headingAt(th);
  const [ox, oz] = outward(th);
  return [C0[0] + Math.sin(h) * 0.5 + ox * 0.9, C0[1] + Math.cos(h) * 0.5 + oz * 0.9];
})();
function updateCushion(t) {
  const p = prog(t, T_KICK, T_KICK + 0.6);
  const x = lerp(C0[0], C1[0], ease.out(p)), z = lerp(C0[1], C1[1], ease.out(p));
  kicked.position.set(x, 0.07 + Math.sin(Math.PI * p) * 0.6, z);
  kicked.rotation.set(-Math.PI / 2 + Math.sin(Math.PI * p) * 0.9, 0, 0.4 + ease.out(p) * 5.2);
}

// basket of toys at the edge of the path: tipped over on lap 2, balls roll away
const basket = group(0, 0, 0, room);
{
  const th = lapTheta(T_BUMP);
  const [x, z] = pathAt(th);
  const [ox, oz] = outward(th);
  basket.position.set(x + ox * 0.42, 0, z + oz * 0.42);
  basket.rotation.y = Math.atan2(ox, oz); // local +z points away from the table
}
const basketTip = group(0, 0, 0.17, basket);
{
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.2, 18, 1, true), M.wicker);
  shell.material.side = THREE.DoubleSide;
  shell.position.set(0, 0.1, -0.17);
  shell.castShadow = shell.receiveShadow = true;
  basketTip.add(shell);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.14, 18), M.wicker);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.set(0, 0.005, -0.17);
  basketTip.add(bottom);
}
const rope = ropeToy();
rope.position.set(0.02, 0.17, -0.17);
rope.rotation.set(0.3, 0.4, 1.2);
basketTip.add(rope);
const balls = [0, 1, 2].map((i) => {
  const b = tennisBall();
  room.add(b);
  const a = (i - 1) * 0.55 + (rand() - 0.5) * 0.2; // spread around "outward"
  return { b, a, dist: 0.9 + i * 0.35 + rand() * 0.2, dur: 0.9 + rand() * 0.5, start: [(i - 1) * 0.07, 0.2, -0.17 + (i % 2) * 0.05] };
});
const _v = new THREE.Vector3();
function updateBasket(t) {
  const tip = ease.out(prog(t, T_BUMP, T_BUMP + 0.28));
  basketTip.rotation.x = tip * 1.45;
  basket.updateMatrixWorld(true);
  for (const { b, a, dist, dur, start } of balls) {
    _v.set(...start);
    basket.localToWorld(_v);
    const p = prog(t, T_BUMP + 0.08, T_BUMP + 0.08 + dur);
    const s = dist * (1 - (1 - p) ** 2);
    const dir = basket.rotation.y + a;
    const hop = p > 0 ? Math.abs(Math.sin(p * Math.PI * 3)) * 0.12 * (1 - p) : 0;
    b.position.set(_v.x + Math.sin(dir) * s, lerp(_v.y, 0.033, Math.min(1, p * 6)) + hop, _v.z + Math.cos(dir) * s);
    b.rotation.set(s / 0.033, dir, 0);
  }
}

// rug shoved sideways by the skid
function updateRug(t) {
  const p = ease.out(prog(t, T_SKID, T_SKID + 0.3));
  rug.position.set(-0.1 * p, 0, -0.14 * p);
  rug.rotation.y = 0.06 * p;
}

// ---------- racing line for the overhead shot ----------
const TRAIL_SEG = 1200;
const TRAIL_TH1 = lapTheta(6.8);
const trailGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array((TRAIL_SEG + 1) * 6);
  for (let i = 0; i <= TRAIL_SEG; i++) {
    const th = lerp(TH0, TRAIL_TH1, i / TRAIL_SEG);
    const [x, z] = pathAt(th);
    const h = headingAt(th);
    const w = 0.045;
    pos.set([x + Math.cos(h) * w, 0.024, z - Math.sin(h) * w, x - Math.cos(h) * w, 0.024, z + Math.sin(h) * w], i * 6);
  }
  const idx = [];
  for (let i = 0; i < TRAIL_SEG; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  trailGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  trailGeo.setIndex(idx);
}
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: 0xff3d7f, side: THREE.DoubleSide }));
trail.frustumCulled = false;
room.add(trail);
function setTrail(th) {
  const k = TRAIL_SEG / (TRAIL_TH1 - TH0);
  const cur = Math.floor((th - TH0) * k);
  const start = Math.max(0, cur - Math.floor(Math.PI * 2 * 1.3 * k)); // last ~1.3 laps
  trailGeo.setDrawRange(start * 6, Math.max(0, cur - start) * 6);
}

// ---------- water droplets flung off after the bath ----------
const DROPS = 56, DROP_LIFE = 0.5;
const drops = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.024, 8, 6),
  new THREE.MeshStandardMaterial({ color: 0xcdeeff, roughness: 0.05, transparent: true, opacity: 0.85 }),
  DROPS
);
drops.frustumCulled = false;
room.add(drops);
const dropSeeds = Array.from({ length: DROPS }, () => ({ side: rand() < 0.5 ? -1 : 1, up: 1.2 + rand() * 1.2, out: 0.8 + rand() * 1.2, back: rand() * 0.6, ox: (rand() - 0.5) * 0.3, oz: (rand() - 0.5) * 0.6 }));
const _m = new THREE.Matrix4();
function updateDrops(lt, stateAt) {
  dropSeeds.forEach((d, i) => {
    const age = (lt + (i / DROPS) * DROP_LIFE) % DROP_LIFE;
    const born = lt - age;
    if (born < 0) {
      _m.makeScale(0, 0, 0);
    } else {
      const S = stateAt(born);
      const [x, , z] = at(S, d.ox + d.side * 0.24, 0, d.oz);
      const [sx, , sz] = at({ x: 0, z: 0, ry: S.ry }, d.side * d.out, 0, -d.back);
      _m.makeTranslation(x + sx * age, 0.5 + d.up * age - 4.9 * age * age, z + sz * age);
    }
    drops.setMatrixAt(i, _m);
  });
  drops.instanceMatrix.needsUpdate = true;
}

// ---------- overlays ----------
const el = (id) => document.getElementById(id);
const captionEl = el("caption"), stampEl = el("stamp"), speedEl = el("speed"), lapEl = el("lap"), lapN = el("lap-n");
const dimEl = el("dim"), vigEl = el("vignette"), flashEl = el("flash");

const CAPTIONS = [
  [0.0, "9 pm. your dog:"],
  [1.3, ""], // ZOOM! stamp
  [2.2, "laps around the table"],
  [3.2, "zero brakes"],
  [4.2, "lap after lap"],
  [5.4, "for no reason?"],
  [6.6, "it actually has a name"],
  [8.0, ""], // F.R.A.P. card
  [11.6, "a burst of <span class=\"hl\">pent-up energy</span>"],
  [13.6, "after a bath,"],
  [14.8, "late at night,"],
  [16.0, "after a boring day"],
  [17.2, "loose body, floppy tongue"],
  [18.6, "= a <span class=\"hl\">happy</span> dog"],
  [19.8, "just give them room"],
  [21.0, "and skip slippery floors"],
  [22.2, ""],
  [22.9, "...round two?"],
];
const STAMPS = [[1.3, 1.0], [23.35, 0.65]]; // [start, duration]

// F.R.A.P. card, choreographed on the timeline
{
  const card = el("frap");
  const head = card.querySelector(".frap-head");
  const letters = card.querySelectorAll(".frap-row b");
  const rest = card.querySelectorAll(".frap-row span");
  const src = card.querySelector(".frap-src");
  gsap.set(card, { autoAlpha: 0, scale: 0.9 });
  gsap.set(letters, { autoAlpha: 0, scale: 2.4 });
  gsap.set(rest, { autoAlpha: 0, x: -40 });
  gsap.set([head, src], { autoAlpha: 0, y: 20 });
  tl.to(card, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" }, 8.05)
    .to(head, { autoAlpha: 1, y: 0, duration: 0.3 }, 8.15)
    .to(letters, { autoAlpha: 1, scale: 1, duration: 0.28, stagger: 0.18, ease: "back.out(3)" }, 8.45)
    .to(rest, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.35, ease: "power2.out" }, 9.4)
    .to(src, { autoAlpha: 1, y: 0, duration: 0.3 }, 10.75)
    .to(card, { autoAlpha: 0, scale: 0.95, duration: 0.2 }, 11.4);
}

// ---------- camera ----------
function look(px, py, pz, tx, ty, tz, fov = 45) {
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
}
function shake(amount, t) {
  if (!amount) return;
  camera.position.x += amount * (Math.sin(t * 53) + Math.sin(t * 31.7)) * 0.5;
  camera.position.y += amount * (Math.sin(t * 47.3) + Math.sin(t * 23.1)) * 0.5;
}

// ---------- spots for the calm moments ----------
const SPOT = { x: 0.5, z: 1.05, ry: 0.55 }; // play bow / nap on the front of the rug
const FLOP = { x: 0.6, z: 1.05, ry: 0.6 }; // final flop, facing the front of the room
const fwdOf = (ry) => [Math.sin(ry), Math.cos(ry)];

// lying on its left side, panting (roll 0..1)
function poseFlop(t, { x = FLOP.x, z = FLOP.z, ry = FLOP.ry, lie = 1, roll = 1, pant = 1, ...extra } = {}) {
  dog.pose({
    x, z, ry, t, lie,
    wag: 0.9 * pant, wagSpeed: 11,
    jawOpen: lerp(0.12, 0.55 + 0.22 * Math.sin(t * 15), pant),
    cute: 0.6 * pant, squint: 0.3 * pant,
    ...extra,
  });
  const phi = -1.42 * roll;
  dog.rotation.z = phi;
  dog.position.y += 0.23 * Math.abs(Math.sin(phi));
  const k = clamp01(roll);
  if (k > 0) {
    // legs flop out instead of staying tucked
    legs.fl.rotation.x = lerp(legs.fl.rotation.x, -0.45, k);
    legs.fr.rotation.x = lerp(legs.fr.rotation.x, -0.15, k);
    legs.bl.rotation.x = lerp(legs.bl.rotation.x, 0.35, k);
    legs.br.rotation.x = lerp(legs.br.rotation.x, 0.7, k);
  }
  return { x, z, ry };
}
// where the head rests during the flop (camera anchor for the last shot)
poseFlop(0);
dog.updateMatrixWorld(true);
const HEAD_REST = dog.head.getWorldPosition(new THREE.Vector3());

// ---------- shots: [start, (localTime, time, ui) => void] ----------
const SHOTS = [
  // 1 — hook: napping on the rug, eyes snap open
  [0.0, (lt, t, ui) => {
    const [x, z] = pathAt(TH0);
    const D = { x, z, ry: headingAt(TH0) };
    const snap = ease.snap(prog(lt, 0.5, 0.62));
    const wiggle = prog(lt, 0.85, 1.3);
    dog.pose({
      ...D, t, lie: 1 - 0.6 * wiggle,
      closed: lerp(0.85, 0, snap), pupil: lerp(1, 1.6, snap),
      earUp: snap, headPitch: lerp(0.3, -0.1, snap) - 0.1 * wiggle,
      wag: wiggle, wagSpeed: 26, shiver: wiggle * 0.8,
    });
    const [cx, cy, cz] = at(D, 0.35, 0.55, lerp(2.4, 1.95, ease.inOut(prog(lt, 0, 1.3))));
    const [tx, ty, tz] = at(D, 0, 0.5, 0.55);
    look(cx, cy, cz, tx, ty, tz, 42);
    shake(0.012 * snap * (1 - prog(lt, 0.62, 0.9)), t);
  }],
  // 2 — ZOOM: low camera at the rug edge, dog tears around the table and punts a cushion
  [1.3, (lt, t, ui) => {
    zoomPose(t, lapTheta(t), { speed: lapSpeed(t) });
    const [lx, lz] = pathAt(lapTheta(t - 0.1));
    look(-1.6, 0.7, 3.9, lx, 0.42, lz, 55);
    ui.speed = 0.6 * lapSpeed(t);
    ui.flash = 1 - prog(lt, 0, 0.15);
  }],
  // 3 — overhead: the racing line, lap counter
  [4.2, (lt, t, ui) => {
    const th = lapTheta(t);
    zoomPose(t, th);
    ceiling.visible = false;
    trail.visible = true;
    setTrail(th);
    const a = 0.12 * lt;
    camera.up.set(Math.cos(a), 0, Math.sin(a)); // long axis of the laps runs down the frame
    look(0, 7.4 - lt * 0.3, 0, 0, 0, 0, 45);
    ui.lap = 1 + Math.floor((th - TH0) / (Math.PI * 2));
  }],
  // 4 — off the rug onto polished wood: the skid
  [6.6, (lt, t, ui) => {
    const A = [-0.7, 0.85], B = [0.15, 1.55], C = [0.95, 2.55];
    const dir = Math.atan2(B[0] - A[0], B[1] - A[1]);
    const running = lt < 0.32;
    const slide = ease.out(prog(lt, 0.32, 0.95));
    const x = running ? lerp(A[0], B[0], lt / 0.32) : lerp(B[0], C[0], slide);
    const z = running ? lerp(A[1], B[1], lt / 0.32) : lerp(B[1], C[1], slide);
    const brace = prog(lt, 0.3, 0.4) * (1 - prog(lt, 0.95, 1.05));
    const scramble = prog(lt, 0.95, 1.0);
    dog.pose({
      x, z, ry: dir + 1.2 * ease.out(prog(lt, 0.3, 0.9)), t,
      trot: running ? 1.35 : scramble * 1.6, trotSpeed: scramble > 0 ? 42 : 25,
      earBack: 1, pupil: 1.45, jawOpen: 0.35, headYaw: -0.5 * brace, wag: 0.4,
    });
    legs.fl.rotation.x -= 0.7 * brace;
    legs.fr.rotation.x -= 0.5 * brace;
    legs.bl.rotation.x += 0.6 * brace;
    legs.br.rotation.x += 0.45 * brace;
    dog.rotation.z = -0.12 * brace;
    look(3.3, 0.55, 3.9, lerp(B[0], x, 0.6), 0.4, lerp(B[1], z, 0.6), 58);
    ui.speed = 0.4 * (1 - prog(lt, 0.4, 0.9));
  }],
  // 5 — fact card over a play bow, slow orbit
  [8.0, (lt, t, ui) => {
    const bounce = Math.max(0, Math.sin(lt * 7));
    dog.pose({ ...SPOT, t, bow: 0.85 + 0.15 * bounce, wag: 1, wagSpeed: 20, jawOpen: 0.45, cute: 0.7, headPitch: -0.25, earUp: 0.3 });
    const a = SPOT.ry + 0.35 - 0.1 * lt;
    look(SPOT.x + Math.sin(a) * 3.0, 0.8, SPOT.z + Math.cos(a) * 3.0, SPOT.x, 1.0, SPOT.z, 45);
    ui.dim = 0.3 * prog(lt, 0, 0.25) * (1 - prog(lt, 3.35, 3.6));
  }],
  // 6 — head-on telephoto: full gallop down the length of the room
  [11.6, (lt, t, ui) => {
    const x = lerp(-3.2, 0.9, lt / 2);
    dog.pose({
      x, z: 2.2, ry: Math.PI / 2, t,
      trot: 1.45, trotSpeed: 25, rear: 0.07 * Math.sin(t * 25 + 1),
      wag: 0.6, wagSpeed: 22, jawOpen: 0.55 + 0.12 * Math.sin(t * 31),
      earBack: 0.75 + 0.25 * Math.sin(t * 37), pupil: 1.3, cute: 0.35,
    });
    dog.hips.position.y -= 0.04;
    look(3.45, 0.5, 2.45, x, 0.45, 2.2, 36);
    ui.speed = 0.5;
  }],
  // 7a — after a bath: towel on, droplets everywhere
  [13.6, (lt, t, ui) => {
    const bath = (u) => {
      const th = 4.3 + 3.3 * u;
      const [x, z] = pathAt(th);
      return { th, x, z, ry: headingAt(th) };
    };
    const B = bath(lt);
    zoomPose(t, B.th, { earBack: 0.3, squint: 0.2 });
    towel.visible = true;
    flaps.forEach((f, i) => (f.rotation.z = (i ? 1 : -1) * (0.25 + 0.3 * Math.sin(t * 21 + i))));
    drops.visible = true;
    updateDrops(lt, bath);
    const L = bath(lt - 0.1);
    look(-2.4, 0.6, 3.6, L.x, 0.42, L.z, 45);
    ui.flash = 0.6 * (1 - prog(lt, 0, 0.1));
  }],
  // 7b — late at night: lights off, moonlight through the patio door
  [14.8, (lt, t, ui) => {
    setEnv("night");
    const th = 1.9 + 2.6 * lt;
    zoomPose(t, th);
    const [lx, lz] = pathAt(1.9 + 2.6 * (lt - 0.12));
    look(1.6, 0.35, 2.4, lerp(X0, lx, 0.35), 0.75, lerp(0, lz, 0.35), 45);
    ui.vignette = 1;
    ui.flash = 0.6 * (1 - prog(lt, 0, 0.1));
  }],
  // 7c — after a boring day: big yawn... then launch
  [16.0, (lt, t, ui) => {
    const yawn = Math.sin(Math.PI * prog(lt, 0.1, 0.6));
    const pop = ease.snap(prog(lt, 0.7, 0.8));
    const go = prog(lt, 0.92, 1.2);
    const [fx, fz] = fwdOf(SPOT.ry);
    dog.pose({
      x: SPOT.x + fx * 2.5 * go * go, z: SPOT.z + fz * 2.5 * go * go, ry: SPOT.ry, t,
      lie: 1 - ease.out(prog(lt, 0.85, 0.98)),
      sad: 0.6 * (1 - pop), closed: Math.max(0.45 * (1 - pop), yawn * 0.85),
      jawOpen: yawn * 1.1, headPitch: lerp(0.35, -0.1, pop) - yawn * 0.35,
      pupil: lerp(1, 1.5, pop), earUp: pop, trot: go > 0 ? 1.35 : 0, trotSpeed: 25,
    });
    const [cx, cy, cz] = at(SPOT, 0.3, 0.58, lerp(2.5, 2.2, prog(lt, 0, 1.2)));
    const [tx, ty, tz] = at(SPOT, 0, 0.48, 0.5);
    look(cx, cy, cz, tx, ty, tz, 42);
    shake(0.01 * pop * (1 - prog(lt, 0.8, 1.0)), t);
    ui.flash = 0.6 * (1 - prog(lt, 0, 0.1));
  }],
  // 8 — winding down: trot in, lie down, flop onto the side, pant
  [17.2, (lt, t, ui) => {
    // trots in along the front of the rug, turns to face us as it drops
    const arrive = ease.out(prog(lt, 0, 0.75));
    const x = FLOP.x - 2.0 * (1 - arrive);
    const z = FLOP.z + 0.1 * (1 - arrive);
    const roll = ease.back(prog(lt, 0.9, 1.15));
    poseFlop(t, {
      x, z, ry: lerp(Math.PI / 2, FLOP.ry, ease.inOut(prog(lt, 0.45, 0.9))),
      lie: ease.inOut(prog(lt, 0.6, 0.9)), roll,
      trot: 1.3 * (1 - prog(lt, 0.15, 0.75)), trotSpeed: 18, pant: 0.4 + 0.6 * prog(lt, 1.0, 1.3),
    });
    const push = ease.inOut(prog(lt, 0, 2.6));
    look(lerp(2.2, 1.9, push), lerp(1.35, 1.15, push), lerp(3.15, 2.8, push), FLOP.x, 0.3, FLOP.z, 45);
  }],
  // 9 — wide reveal: the aftermath
  [19.8, (lt, t, ui) => {
    poseFlop(t);
    const p = ease.inOut(prog(lt, 0, 2.4));
    look(lerp(2.7, 3.25, p), lerp(2.0, 2.45, p), lerp(3.2, 3.85, p), -0.1, 0.2, -0.1, 50);
  }],
  // 10 — eyes closed... one eye opens. round two.
  [22.2, (lt, t, ui) => {
    const open1 = ease.snap(prog(lt, 0.68, 0.78)); // upper eye
    const open2 = ease.snap(prog(lt, 1.0, 1.1));
    const up = ease.inOut(prog(lt, 1.18, 1.4));
    const go = prog(lt, 1.35, 1.8);
    const [fx, fz] = fwdOf(FLOP.ry);
    const pant = 1 - prog(lt, 0.45, 0.6);
    poseFlop(t, {
      x: FLOP.x + fx * 3 * go * go, z: FLOP.z + fz * 3 * go * go,
      roll: 1 - up, lie: 1 - up, pant, closed: 1,
      pupil: lerp(1, 1.6, open1), earUp: open2, squint: 0,
      trot: go > 0 ? 1.4 : 0, trotSpeed: 26,
    });
    // the lids open one at a time (pose() sets both)
    eyes[0].lid.scale.y = Math.max(0.001, 1 - open1);
    eyes[0].lid.visible = open1 < 0.99;
    eyes[1].lid.scale.y = Math.max(0.001, 1 - open2);
    eyes[1].lid.visible = open2 < 0.99;
    const push = ease.inOut(prog(lt, 0, 1.2));
    const d = lerp(1.7, 1.4, push); // from the head pivot; the face is ~0.2 m in front of it
    look(HEAD_REST.x + fx * d - fz * 0.2, HEAD_REST.y + 0.38, HEAD_REST.z + fz * d + fx * 0.2, HEAD_REST.x + fx * 0.2, HEAD_REST.y + 0.03, HEAD_REST.z + fz * 0.2, 42);
    shake(0.015 * prog(lt, 1.2, 1.3) * (1 - prog(lt, 1.6, 1.8)), t);
    ui.speed = 0.6 * prog(lt, 1.3, 1.45);
  }],
];

// ---------- frame ----------
let lastCaption = null;
let lastLap = null;
onUpdate((t) => {
  t = Math.min(t, DURATION - 1e-6);
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i][0]) i--;
  const ui = { speed: 0, dim: 0, vignette: 0, flash: 0, lap: null };

  setEnv("eve");
  ceiling.visible = true;
  trail.visible = false;
  towel.visible = false;
  drops.visible = false;
  camera.up.set(0, 1, 0);
  updateCushion(t);
  updateBasket(t);
  updateRug(t);

  SHOTS[i][1](t - SHOTS[i][0], t, ui);

  // captions pop in with a little overshoot
  let ci = 0;
  while (ci + 1 < CAPTIONS.length && t >= CAPTIONS[ci + 1][0]) ci++;
  const [ct, text] = CAPTIONS[ci];
  if (text !== lastCaption) captionEl.innerHTML = lastCaption = text;
  captionEl.style.transform = `scale(${0.7 + 0.3 * ease.back(prog(t, ct, ct + 0.18))})`;

  const st = STAMPS.find(([s, d]) => t >= s && t < s + d);
  if (st) {
    const [s, d] = st;
    const k = ease.back(prog(t, s, s + 0.2));
    stampEl.style.opacity = 1 - prog(t, s + d - 0.15, s + d);
    stampEl.style.transform = `rotate(-8deg) scale(${(0.3 + 0.7 * k) * (1 + 0.03 * Math.sin(t * 40))})`;
  } else stampEl.style.opacity = 0;

  speedEl.style.opacity = ui.speed;
  speedEl.style.transform = `rotate(${Math.floor(t * 24) * 7}deg)`; // stepped flicker, still a function of t
  dimEl.style.opacity = ui.dim;
  vigEl.style.opacity = ui.vignette;
  flashEl.style.opacity = ui.flash;
  lapEl.style.display = ui.lap ? "block" : "none";
  if (ui.lap && ui.lap !== lastLap) lapN.textContent = lastLap = ui.lap;
});

// ---------- sound ----------
const sfx = createSfx(short);
const range = (a, b, dt) => {
  const out = [];
  for (let x = a; x < b - 1e-6; x += dt) out.push(+x.toFixed(3));
  return out;
};
const PAWS = ["paw_1", "paw_2", "paw_3"];
sfx.loop(0, DURATION, "room_tone", { gain: 0.35, fadeIn: 0.05, fadeOut: 0.3 })
  .loop(0, 1.3, "clock_tick", { gain: 0.35, fadeIn: 0.02, fadeOut: 0.05 })
  .add(0.95, "thump", { gain: 0.45 })
  .add(1.12, "thump", { gain: 0.4 })
  .steps(range(1.32, 6.6, 0.085), PAWS, { gain: 0.35 }) // claws on the rug: muffled
  .add(T_KICK, "thump", { gain: 0.9, rate: 0.85 })
  .add(T_KICK + 0.58, "flop", { gain: 0.5, rate: 1.3 })
  .add(T_BUMP, "thump", { gain: 0.6, rate: 1.2 });
for (const [k, dt] of [0.2, 0.34, 0.47, 0.62].entries()) sfx.add(T_BUMP + dt, "thump", { gain: 0.3 - k * 0.05, rate: 1.9 }); // balls bouncing
sfx.steps(range(6.6, 6.92, 0.065), PAWS, { gain: 0.75 }) // onto the hardwood
  .add(6.92, "squeak", { gain: 0.4, rate: 0.7 }) // rubbery skid
  .steps(range(7.55, 8.0, 0.045), PAWS, { gain: 0.6 }); // scrabbling for grip
for (let k = 0; k < 4; k++) sfx.add(8.45 + k * 0.18, "thump", { gain: 0.35, rate: 1.4 }); // F, R, A, P
sfx.steps(range(11.6, 13.6, 0.09), PAWS, { gain: 0.7 })
  .add(13.62, "splash", { gain: 0.3, rate: 1.2 })
  .steps(range(13.6, 16.0, 0.09), PAWS, { gain: 0.4 })
  .add(16.12, "yawn", { gain: 0.7 })
  .steps(range(16.95, 17.2, 0.06), PAWS, { gain: 0.6 })
  .steps(range(17.2, 17.9, 0.11), PAWS, { gain: 0.4 })
  .add(18.22, "flop", { gain: 0.9 })
  .loop(18.4, 22.7, "pant", { gain: 0.5, fadeIn: 0.1, fadeOut: 0.1 })
  .loop(22.6, 23.4, "clock_tick", { gain: 0.3, fadeIn: 0.05, fadeOut: 0.05 })
  .steps(range(23.4, 24, 0.055), PAWS, { gain: 0.7 });
for (const tt of [18.7, 19.0, 19.3, 20.4, 20.7, 21.3]) sfx.add(tt, "thump", { gain: 0.3 }); // tail on the floor

window.__dbg = { scene, camera, renderer }; // used by preview screenshots
short.start();
