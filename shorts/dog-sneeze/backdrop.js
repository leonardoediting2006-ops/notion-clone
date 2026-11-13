import { THREE } from "../../js/engine.js";

// A painted, cartoon-style panorama around each place (instead of the flat green domes and the big sun disc of js/outside.js):
// layered mountains with snow caps, rolling hills, a forest edge of outlined trees, neighbouring houses, a church spire, a little town,
// outlined fluffy clouds, a sunset glow with birds. 8192 x 1024 px around the full circle, drawn once per kind, soft at the horizon
// (atmospheric haze), and a fog-coloured skirt where it meets the ground so the horizon melts into the fogged lawn.
//   const bd = createBackdrop("suburb" | "park" | "sunset");  scene.add(bd.group);  bd.follow(camera.position, fogColor);
// Centre of the picture (u = 0.5) is the direction of -z (north), where the cameras mostly look.

const W = 8192, H = 1024, HROW = 977, PXM = H / 130;           // canvas px; world y = 0 sits on row 977; px per metre of height at the wall (r = 230 m)
const TAU = Math.PI * 2;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rgb = (h) => [(parseInt(h.slice(1), 16) >> 16) & 255, (parseInt(h.slice(1), 16) >> 8) & 255, parseInt(h.slice(1), 16) & 255];
const mixc = (a, b, k) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
const row = (ym) => HROW - ym * PXM;
const ridge = (R, baseM, parts) => { const ph = parts.map(() => R() * TAU); return (x) => baseM + parts.reduce((s, [amp, f], i) => s + amp * Math.sin((x / W) * TAU * f + ph[i]), 0); };
const peaks = (R, baseM, parts) => { const ph = parts.map(() => R() * TAU); return (x) => baseM + parts.reduce((s, [amp, f], i) => s + amp * (1 - 2 * Math.abs(Math.sin((x / W) * Math.PI * f + ph[i]))), 0); };
const wrap = (x, r, fn) => { fn(x); if (x < r) fn(x + W); if (x > W - r) fn(x - W); };

const PAL = {
  day: { haze: "#e6f5ff", ink: "#2c4a3c", mount: ["#9bb9e8", "#8aa9de", "#a9c6ea"], hill: ["#a9dc98", "#8fd085", "#79c26f"], forest: ["#2f7d45", "#3f9650", "#52ab57", "#66bb5c", "#7cc866"], autumn: ["#d9b53a", "#e0922c"], wall: ["#f7e2b0", "#f3c9b8", "#d6ecf2", "#f6dcc0", "#e9b9a0", "#cfe0f2"], roof: ["#c4502e", "#7d96d8", "#8a5a44", "#5c7aa8", "#b4553d"], sky: "#ffffff", cloudShade: "#b7d0ee", cloudInk: "#8fb0d8" },
  sunset: { haze: "#ffdca0", ink: "#3a2a4a", mount: ["#b98ab8", "#9a6aa8", "#7a5a9a"], hill: ["#a9a84e", "#8fa04a", "#6f8a46"], forest: ["#27392f", "#2f4435", "#3a5039", "#44593d"], autumn: ["#9a6a2a", "#b4562a"], wall: ["#f0c9a0"], roof: ["#8a4a3a"], sky: "#ffe2bb", cloudShade: "#f08a70", cloudInk: "#c0607a" },
};

function layer(ctx, fn, top, bottom, ink, lw, step = 8) {
  ctx.beginPath(); ctx.moveTo(0, row(fn(0)));
  for (let x = 0; x <= W; x += step) ctx.lineTo(x, row(fn(x)));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const g = ctx.createLinearGradient(0, row(60), 0, HROW); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fill();
  if (ink) { ctx.beginPath(); for (let x = 0; x <= W; x += step) (x ? ctx.lineTo(x, row(fn(x))) : ctx.moveTo(x, row(fn(x)))); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(); }
}
function snowCaps(ctx, fn, snowM) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, row(fn(0))); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, row(fn(x))); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); for (let x = W; x >= 0; x -= 24) ctx.lineTo(x, row(snowM) + (((x / 24) | 0) % 2 ? 22 : -6) + 14 * Math.sin(x * 0.011)); ctx.closePath();
  ctx.fillStyle = "#f6fbff"; ctx.fill(); ctx.restore();
}

// ---- a tree in the distance: trunk, a canopy of overlapping lobes (outlined as one shape), a highlight and a shadow ----
function tree(ctx, R, x, yb, h, kind, P, haze) {
  const ink = mixc(P.ink, P.haze, haze * 0.8), lw = Math.max(2, h * 0.028), pick = () => P.forest[(R() * P.forest.length) | 0];
  const col = (c) => mixc(c, P.haze, haze), autumn = R() < 0.1 && P.autumn;
  wrap(x, h, (cx) => {
    if (kind === "pine") {
      ctx.fillStyle = col("#5a3d2a"); ctx.fillRect(cx - h * 0.03, yb - h * 0.14, h * 0.06, h * 0.14);
      for (let k = 0; k < 4; k++) { const y0 = yb - h * (0.1 + k * 0.2), w = h * (0.32 - k * 0.05); ctx.beginPath(); ctx.moveTo(cx - w, y0); ctx.lineTo(cx, y0 - h * 0.34); ctx.lineTo(cx + w, y0); ctx.closePath(); ctx.fillStyle = col(k % 2 ? "#2f7a4a" : "#3a8a52"); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(); }
      return;
    }
    const tall = kind === "poplar", rx = h * (tall ? 0.14 : 0.34), ry = h * (tall ? 0.45 : 0.3), cy = yb - h * (tall ? 0.52 : 0.62), n = tall ? 7 : 8, base = col(autumn ? P.autumn[(R() * 2) | 0] : pick());
    ctx.fillStyle = col("#6b4a32"); ctx.fillRect(cx - h * 0.04, yb - h * 0.4, h * 0.08, h * 0.4);
    const lobes = Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + R(), d = 0.55 + R() * 0.35; return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, h * (tall ? 0.15 : 0.2) * (0.8 + R() * 0.4)]; });
    lobes.push([cx, cy, h * (tall ? 0.2 : 0.26)]);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 2; for (const [lx, ly, lr] of lobes) { ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = base; for (const [lx, ly, lr] of lobes) { ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.fill(); }
    ctx.fillStyle = mixc(base, "#ffffff", 0.22); for (const [lx, ly, lr] of lobes) { ctx.beginPath(); ctx.arc(lx - lr * 0.22, ly - lr * 0.28, lr * 0.62, 0, TAU); ctx.fill(); }
    ctx.fillStyle = mixc(base, "#10301a", 0.28); for (const [lx, ly, lr] of lobes) { ctx.beginPath(); ctx.arc(lx + lr * 0.3, ly + lr * 0.45, lr * 0.45, 0, TAU); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1; }
  });
}
function houseP(ctx, R, x, yb, w, h, P, haze) {
  const wall = mixc(P.wall[(R() * P.wall.length) | 0], P.haze, haze), roof = mixc(P.roof[(R() * P.roof.length) | 0], P.haze, haze), ink = mixc(P.ink, P.haze, haze * 0.8), lw = Math.max(2, h * 0.04);
  wrap(x, w, (cx) => {
    ctx.fillStyle = wall; ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = "round";
    ctx.fillRect(cx - w / 2, yb - h, w, h); ctx.strokeRect(cx - w / 2, yb - h, w, h);
    ctx.fillStyle = mixc("#8a4a3a", P.haze, haze); ctx.fillRect(cx + w * 0.2, yb - h - w * 0.36, w * 0.1, w * 0.3); ctx.strokeRect(cx + w * 0.2, yb - h - w * 0.36, w * 0.1, w * 0.3);
    ctx.beginPath(); ctx.moveTo(cx - w / 2 - w * 0.07, yb - h); ctx.lineTo(cx, yb - h - w * 0.34); ctx.lineTo(cx + w / 2 + w * 0.07, yb - h); ctx.closePath(); ctx.fillStyle = roof; ctx.fill(); ctx.stroke();
    ctx.fillStyle = mixc("#bfe7f7", P.haze, haze); for (const k of [-0.28, 0.18]) { ctx.fillRect(cx + w * k, yb - h * 0.72, w * 0.16, h * 0.3); ctx.strokeRect(cx + w * k, yb - h * 0.72, w * 0.16, h * 0.3); }
    ctx.fillStyle = mixc("#c4502e", P.haze, haze); ctx.fillRect(cx - w * 0.06, yb - h * 0.45, w * 0.12, h * 0.45);
  });
}
function cloud(ctx, R, x, y, s, P, tint) {
  // a cartoon cumulus: a flat base of small lobes, a second row, a few bumps on top; outlined thinly, with a pale blue belly
  const w = s * 4.6, h = s * 1.7, pad = 8, cv = document.createElement("canvas"); cv.width = Math.ceil(w) + pad * 2; cv.height = Math.ceil(h) + pad * 2; const c = cv.getContext("2d");
  const circles = [], row1 = 5 + ((R() * 3) | 0), row2 = 4 + ((R() * 2) | 0), row3 = 2 + ((R() * 2) | 0);
  for (let i = 0; i < row1; i++) circles.push([pad + w * (0.1 + (0.8 * i) / (row1 - 1)), pad + h * 0.78, h * (0.17 + R() * 0.1)]);
  for (let i = 0; i < row2; i++) circles.push([pad + w * (0.2 + (0.6 * i) / (row2 - 1)) + (R() - 0.5) * w * 0.04, pad + h * 0.52, h * (0.22 + R() * 0.12)]);
  for (let i = 0; i < row3; i++) circles.push([pad + w * (0.34 + (0.32 * i) / Math.max(1, row3 - 1)) + (R() - 0.5) * w * 0.05, pad + h * 0.3, h * (0.18 + R() * 0.1)]);
  c.strokeStyle = P.cloudInk; c.globalAlpha = 0.8; c.lineWidth = Math.max(2.5, s * 0.045); for (const [a, b, r] of circles) { c.beginPath(); c.arc(a, b, r, 0, TAU); c.stroke(); }
  c.globalAlpha = 1; c.fillStyle = tint ?? P.sky; for (const [a, b, r] of circles) { c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill(); }
  c.globalCompositeOperation = "source-atop"; const g = c.createLinearGradient(0, pad + h * 0.4, 0, pad + h * 0.98); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, P.cloudShade); c.globalAlpha = 0.75; c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
  c.globalCompositeOperation = "destination-out"; c.globalAlpha = 1; c.fillRect(0, pad + h * 0.96, cv.width, h);                                  // a flat base
  wrap(x, w, (cx) => ctx.drawImage(cv, cx - cv.width / 2, y - cv.height / 2));
}
function bird(ctx, x, y, s) { ctx.strokeStyle = "rgba(40,30,50,0.8)"; ctx.lineWidth = Math.max(2, s * 0.18); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y); ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.7, x + s, y); ctx.stroke(); }

function paint(kind) {
  const P = kind === "sunset" ? PAL.sunset : PAL.day, R = mulberry(kind === "park" ? 11 : kind === "sunset" ? 23 : 5);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
  // the sunset glow behind everything: a wide warm band around the north point
  if (kind === "sunset") {
    ctx.save(); ctx.translate(W / 2, HROW); ctx.scale(1, 0.5);
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, 1700); gl.addColorStop(0, "rgba(255,226,150,0.85)"); gl.addColorStop(0.25, "rgba(255,170,90,0.55)"); gl.addColorStop(1, "rgba(255,140,90,0)");
    ctx.fillStyle = gl; ctx.fillRect(-W / 2, -1700, W, 1700); ctx.restore();
  }
  // clouds, high and far first
  const cl = kind === "sunset" ? ["#ffd9b0", "#ffc4a0", "#ffe6c4"] : ["#ffffff"];
  for (let i = 0; i < 40; i++) cloud(ctx, R, R() * W, row(26 + R() * 70), 38 + R() * 70, P, cl[i % cl.length]);
  if (kind === "sunset") for (let i = 0; i < 40; i++) { const x = W * 0.5 + (R() - 0.5) * 1500, y = row(34 + R() * 30); bird(ctx, x, y, 10 + R() * 10); }
  // mountains: two ranges, the far one snow-capped
  const m1 = peaks(R, 38, [[16, 9], [7, 23], [3, 41]]), m2 = peaks(R, 24, [[11, 13], [5, 31], [2, 53]]);
  layer(ctx, m1, mixc(P.mount[0], "#ffffff", 0.2), mixc(P.mount[0], P.haze, 0.78), mixc(P.mount[0], P.ink, 0.25), 3); if (kind !== "sunset") snowCaps(ctx, m1, 44);
  layer(ctx, m2, P.mount[1], mixc(P.mount[1], P.haze, 0.7), mixc(P.mount[1], P.ink, 0.3), 3);
  // a distant town (the park) or a church spire (suburb)
  if (kind === "park") for (let i = 0; i < 90; i++) { const x = W * 0.3 + (R() - 0.5) * 900 + (i % 2 ? W * 0.5 : 0), h = 3 + R() * 22 * Math.max(0, 1 - Math.abs(x % (W / 2) - W * 0.3) / 900), w = 14 + R() * 24; wrap(x, w, (cx) => { ctx.fillStyle = mixc("#b9c8df", P.haze, 0.35); ctx.fillRect(cx - w / 2, row(h + 4), w, h * PXM); ctx.strokeStyle = mixc(P.ink, P.haze, 0.7); ctx.lineWidth = 2; ctx.strokeRect(cx - w / 2, row(h + 4), w, h * PXM); ctx.fillStyle = mixc("#8fa6c8", P.haze, 0.3); for (let k = 0; k < 3; k++) ctx.fillRect(cx - w / 2 + 4 + k * (w / 3), row(h + 1), 4, 5); }); }
  // hills
  const h1 = ridge(R, 14, [[6, 5], [3, 13], [1.5, 29]]), h2 = ridge(R, 8, [[4.5, 7], [2.5, 17], [1.2, 37]]);
  layer(ctx, h1, P.hill[0], mixc(P.hill[0], P.haze, 0.6), mixc(P.hill[0], P.ink, 0.25), 3);
  for (let i = 0; i < 70; i++) { const x = R() * W, y0 = h1(x) - 1 - R() * 5; wrap(x, 300, (cx) => { ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 90 - R() * 80, row(y0 - 3)); ctx.lineTo(cx + 120 + R() * 80, row(y0 - 4.5)); ctx.lineTo(cx + 150, row(y0 - 9)); ctx.lineTo(cx - 40, row(y0 - 7)); ctx.closePath(); ctx.fillStyle = mixc(i % 2 ? "#cbe68a" : "#92c876", P.hill[0], 0.2); ctx.globalAlpha = 0.45; ctx.fill(); ctx.restore(); }); }
  // far trees on the first hill
  for (let x = 0; x < W; x += 28 + R() * 30) { const yb = row(h1(x) - 0.5), h = (6 + R() * 7) * PXM; tree(ctx, R, x, yb, h, R() < 0.2 ? "pine" : "round", P, 0.62); }
  layer(ctx, h2, P.hill[1], mixc(P.hill[1], P.haze, 0.5), mixc(P.hill[1], P.ink, 0.3), 3);
  // houses (suburb and park edge), church, water tower behind the near trees
  if (kind !== "sunset") {
    for (let i = 0; i < (kind === "suburb" ? 60 : 22); i++) { const x = R() * W, w = (7 + R() * 5) * PXM, h = (4.5 + R() * 3) * PXM; houseP(ctx, R, x, row(h2(x) - 0.4), w, h, P, 0.38); }
    for (const fx of kind === "suburb" ? [0.42, 0.61] : [0.72]) { const x = W * fx, yb = row(h2(x) - 0.4); wrap(x, 200, (cx) => { ctx.fillStyle = mixc("#f2e8d4", P.haze, 0.35); ctx.strokeStyle = mixc(P.ink, P.haze, 0.55); ctx.lineWidth = 3; ctx.fillRect(cx - 28, yb - 16 * PXM, 56, 16 * PXM); ctx.strokeRect(cx - 28, yb - 16 * PXM, 56, 16 * PXM); ctx.beginPath(); ctx.moveTo(cx - 36, yb - 16 * PXM); ctx.lineTo(cx, yb - 36 * PXM); ctx.lineTo(cx + 36, yb - 16 * PXM); ctx.closePath(); ctx.fillStyle = mixc("#7d96d8", P.haze, 0.35); ctx.fill(); ctx.stroke(); }); }
  } else {
    for (let i = 0; i < 6; i++) { const x = W * 0.5 + (R() - 0.5) * 1800, yb = row(h2(x) - 0.4), w = 7 * PXM, h = 5 * PXM; houseP(ctx, R, x, yb, w, h, P, 0.45); }
  }
  // the forest edge in two rows: smaller and hazier behind, bigger in front, with a few poplars and pines
  for (const [rowK, hazeK, hMin, hVar, gap] of [[0, 0.32, 8, 8, 34], [1, 0.12, 11, 10, 44]]) {
    for (let x = R() * 20; x < W; x += gap * (0.6 + R() * 0.8)) { const yb = row(h2(x) - 1.2 - rowK * 0.8 + R() * 0.8), h = (hMin + R() * hVar) * PXM, r = R(); tree(ctx, R, x, yb, h, r < 0.12 ? "pine" : r < 0.22 ? "poplar" : "round", P, hazeK); }
  }
  // a near hedge-line / field edge to ground the bottom of the picture
  const h3 = ridge(R, 3.2, [[1.2, 11], [0.7, 29]]);
  layer(ctx, h3, P.hill[2], mixc(P.hill[2], P.haze, 0.35), mixc(P.hill[2], P.ink, 0.35), 3);
  return cv;
}

const cache = new Map();
export function createBackdrop(kind) {
  if (!cache.has(kind)) { const t = new THREE.CanvasTexture(paint(kind)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = THREE.RepeatWrapping; cache.set(kind, t); }
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(230, 230, 130, 96, 1, true), new THREE.MeshBasicMaterial({ map: cache.get(kind), side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
  wall.position.y = 59; wall.renderOrder = -15; wall.frustumCulled = false; wall.userData.ink = false; group.add(wall);
  // the skirt: a fog-coloured ring that fades upward, so the painted horizon melts into the fogged ground
  const sg = new THREE.CylinderGeometry(229, 229, 26, 96, 1, true), pos = sg.attributes.position, col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) { const a = pos.getY(i) > 0 ? 0 : 1; col.set([1, 1, 1, a], i * 4); }
  sg.setAttribute("color", new THREE.BufferAttribute(col, 4));
  const skirt = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xe6f5ff, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false }));
  skirt.position.y = 9; skirt.renderOrder = -14; skirt.frustumCulled = false; skirt.userData.ink = false; group.add(skirt);
  return { group, follow(p, fog) { group.position.set(p.x, 0, p.z); if (fog) skirt.material.color.copy(fog); } };
}
