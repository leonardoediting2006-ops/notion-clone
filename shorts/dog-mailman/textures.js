// Procedural "photo-ish" textures drawn on <canvas>: fur, bark, leaves, plaster,
// asphalt, concrete, fabric, shingles, siding, painted wood, skin, paper, sky.
// Seeded, so every render produces exactly the same pixels.

import { THREE } from "../../js/engine.js";

let s = 1234567;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rnd() * (b - a);

function canvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function hex(c) {
  const col = new THREE.Color(c);
  return [col.r * 255, col.g * 255, col.b * 255];
}
const rgb = ([r, g, b], k = 1, a = 1) =>
  `rgba(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0},${a})`;

// Smooth multi-octave value noise, drawn as stretched random tiles.
function noise(ctx, w, h, { octaves = 5, base = 4, alpha = 0.18, dark = [0, 0, 0], light = [255, 255, 255] } = {}) {
  for (let o = 0; o < octaves; o++) {
    const n = base * 2 ** o;
    const [c, x] = canvas(n, Math.max(1, Math.round((n * h) / w)));
    const img = x.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd();
      const col = v < 0.5 ? dark : light;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = Math.abs(v - 0.5) * 2 * 255;
    }
    x.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha / (1 + o * 0.35);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c, 0, 0, w, h);
    ctx.restore();
  }
}

function speckle(ctx, w, h, count, size, colors, alpha = 0.5) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rnd() * colors.length) | 0];
    ctx.globalAlpha = alpha * rnd();
    const r = size * rr(0.4, 1);
    ctx.fillRect(rnd() * w, rnd() * h, r, r);
  }
  ctx.globalAlpha = 1;
}

function toTexture(c, { repeat = [1, 1], color = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Grayscale copy of a canvas, for bump maps.
function gray(src) {
  const [c, x] = canvas(src.width, src.height);
  x.filter = "grayscale(1) contrast(1.4)";
  x.drawImage(src, 0, 0);
  return c;
}

const cache = new Map();
function make(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// Material factory: { map, bumpMap } from a canvas painter.
function painted(key, size, paint, { repeat = [1, 1], bump = 0.02, roughness = 0.9, metalness = 0, h } = {}) {
  return make(key + repeat.join(), () => {
    const [c, x] = canvas(size, h ?? size);
    paint(x, c.width, c.height);
    const mat = new THREE.MeshStandardMaterial({
      map: toTexture(c, { repeat }),
      roughness,
      metalness,
    });
    if (bump) {
      mat.bumpMap = toTexture(gray(c), { repeat, color: false });
      mat.bumpScale = bump;
    }
    return mat;
  });
}

// ---------------- painters ----------------

export function fur(color, { repeat = [2, 2], streak = 1, key = "" } = {}) {
  const base = hex(color);
  return painted(`fur${color}${key}`, 1024, (x, w, h) => {
    x.fillStyle = rgb(base);
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 3, octaves: 3, alpha: 0.14, dark: hex(0x3a2210), light: hex(0xf6e2c0) });
    // thousands of individual hairs
    x.lineCap = "round";
    for (let i = 0; i < 22000; i++) {
      const px = rnd() * w, py = rnd() * h;
      const len = rr(5, 16) * streak;
      const ang = Math.PI / 2 + rr(-0.35, 0.35);
      const k = rr(0.75, 1.25);
      x.strokeStyle = rgb(base, k, rr(0.25, 0.6));
      x.lineWidth = rr(0.6, 1.6);
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(ang) * len * 0.5 + rr(-2, 2), py + Math.sin(ang) * len * 0.5, px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      x.stroke();
    }
  }, { repeat, bump: 0.035, roughness: 0.95 });
}

export function bark() {
  return painted("bark", 512, (x, w, h) => {
    x.fillStyle = "#4a3424";
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const px = rnd() * w;
      x.strokeStyle = rnd() < 0.5 ? `rgba(20,12,6,${rr(0.3, 0.8)})` : `rgba(140,110,80,${rr(0.1, 0.35)})`;
      x.lineWidth = rr(1, 6);
      x.beginPath();
      let y = rr(-50, h);
      x.moveTo(px, y);
      const len = rr(40, 220);
      for (let t = 0; t < len; t += 12) x.lineTo(px + Math.sin((y + t) * 0.05) * 3 + rr(-1.5, 1.5), y + t);
      x.stroke();
    }
    noise(x, w, h, { base: 4, octaves: 4, alpha: 0.25 });
  }, { repeat: [2, 1], bump: 0.06 });
}

export function leaves(tone = 0) {
  return painted(`leaves${tone}`, 512, (x, w, h) => {
    x.fillStyle = "#1d3a17";
    x.fillRect(0, 0, w, h);
    const greens = tone ? ["#3d6b2a", "#507f33", "#2f5a22", "#6a9440", "#24461a"] : ["#355f26", "#4b7a2f", "#29511e", "#5f8a38", "#1f3f17"];
    for (let i = 0; i < 9000; i++) {
      x.save();
      x.translate(rnd() * w, rnd() * h);
      x.rotate(rnd() * Math.PI * 2);
      x.fillStyle = greens[(rnd() * greens.length) | 0];
      x.globalAlpha = rr(0.6, 1);
      x.beginPath();
      x.ellipse(0, 0, rr(3, 7), rr(1.5, 3), 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    noise(x, w, h, { base: 4, octaves: 3, alpha: 0.35, light: [180, 220, 120] });
  }, { repeat: [2, 2], bump: 0.08 });
}

export function plaster(color = 0xe6dcc8, repeat = [3, 2]) {
  return painted(`plaster${color}`, 512, (x, w, h) => {
    x.fillStyle = rgb(hex(color));
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 3, octaves: 6, alpha: 0.12 });
    speckle(x, w, h, 7000, 2, ["#000", "#fff"], 0.12);
  }, { repeat, bump: 0.012 });
}

export function asphalt() {
  return painted("asphalt", 512, (x, w, h) => {
    x.fillStyle = "#3a3b3e";
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 4, octaves: 5, alpha: 0.3 });
    speckle(x, w, h, 30000, 2.5, ["#1c1c1e", "#6b6b70", "#8d8a84", "#2a2a2c"], 0.7);
    // a couple of cracks
    for (let i = 0; i < 6; i++) {
      x.strokeStyle = "rgba(15,15,15,0.7)";
      x.lineWidth = rr(1, 2);
      x.beginPath();
      let px = rnd() * w, py = rnd() * h;
      x.moveTo(px, py);
      for (let k = 0; k < 12; k++) x.lineTo((px += rr(-14, 14)), (py += rr(-14, 14)));
      x.stroke();
    }
  }, { repeat: [20, 2], bump: 0.03 });
}

export function concrete({ tile = 4, repeat = [10, 1], color = 0xbdb8ae } = {}) {
  return painted(`concrete${tile}${color}`, 512, (x, w, h) => {
    x.fillStyle = rgb(hex(color));
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 4, octaves: 5, alpha: 0.2 });
    speckle(x, w, h, 12000, 2, ["#555", "#fff", "#8a857b"], 0.3);
    x.strokeStyle = "rgba(60,55,50,0.6)";
    x.lineWidth = 4;
    for (let i = 0; i <= tile; i++) {
      x.beginPath();
      x.moveTo((i * w) / tile, 0);
      x.lineTo((i * w) / tile, h);
      x.stroke();
    }
  }, { repeat, bump: 0.03 });
}

export function fabric(color, { repeat = [3, 3], weave = 3, key = "" } = {}) {
  const base = hex(color);
  return painted(`fabric${color}${key}`, 512, (x, w, h) => {
    x.fillStyle = rgb(base);
    x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += weave) {
      x.fillStyle = rgb(base, rr(0.8, 1.1), 0.5);
      x.fillRect(0, y, w, 1);
    }
    for (let xx = 0; xx < w; xx += weave) {
      x.fillStyle = rgb(base, rr(0.85, 1.15), 0.35);
      x.fillRect(xx, 0, 1, h);
    }
    noise(x, w, h, { base: 3, octaves: 4, alpha: 0.18 });
  }, { repeat, bump: 0.01 });
}

export function skin(color = 0xe0b08a) {
  return painted(`skin${color}`, 256, (x, w, h) => {
    x.fillStyle = rgb(hex(color));
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 2, octaves: 4, alpha: 0.12, dark: [120, 60, 40], light: [255, 220, 200] });
  }, { bump: 0.004, roughness: 0.7 });
}

export function shingles() {
  return painted("shingles", 512, (x, w, h) => {
    x.fillStyle = "#2d211c";
    x.fillRect(0, 0, w, h);
    const rowH = 32, colW = 48;
    for (let r = 0; r < h / rowH; r++) {
      for (let c = -1; c < w / colW + 1; c++) {
        const off = (r % 2) * colW * 0.5;
        const k = rr(0.7, 1.15);
        x.fillStyle = rgb([92, 64, 54], k);
        x.fillRect(c * colW + off + 2, r * rowH + 2, colW - 4, rowH - 3);
      }
    }
    noise(x, w, h, { base: 4, octaves: 4, alpha: 0.25 });
    speckle(x, w, h, 8000, 2, ["#000", "#9a8070"], 0.4);
  }, { repeat: [12, 2], bump: 0.05 });
}

export function siding(color) {
  const base = hex(color);
  return painted(`siding${color}`, 512, (x, w, h) => {
    const board = 32;
    for (let y = 0; y < h; y += board) {
      const g = x.createLinearGradient(0, y, 0, y + board);
      g.addColorStop(0, rgb(base, 1.08));
      g.addColorStop(0.85, rgb(base, 0.95));
      g.addColorStop(1, rgb(base, 0.6));
      x.fillStyle = g;
      x.fillRect(0, y, w, board);
    }
    noise(x, w, h, { base: 4, octaves: 4, alpha: 0.12 });
  }, { repeat: [3, 2], bump: 0.03 });
}

export function paintedWood(color, repeat = [1, 1]) {
  const base = hex(color);
  return painted(`pwood${color}`, 512, (x, w, h) => {
    x.fillStyle = rgb(base);
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = rgb(base, rr(0.8, 1.15), rr(0.15, 0.4));
      x.lineWidth = rr(1, 3);
      const px = rnd() * w;
      x.beginPath();
      x.moveTo(px, 0);
      for (let y = 0; y < h; y += 16) x.lineTo(px + Math.sin(y * 0.02 + i) * 4, y);
      x.stroke();
    }
    noise(x, w, h, { base: 3, octaves: 4, alpha: 0.12 });
  }, { repeat, bump: 0.015, roughness: 0.6 });
}

export function paper() {
  return painted("paper", 256, (x, w, h) => {
    x.fillStyle = "#f3efe4";
    x.fillRect(0, 0, w, h);
    noise(x, w, h, { base: 2, octaves: 4, alpha: 0.08 });
    // address lines
    x.fillStyle = "rgba(40,40,60,0.55)";
    for (let i = 0; i < 4; i++) x.fillRect(w * 0.3, h * 0.45 + i * 18, w * rr(0.25, 0.45), 6);
    x.fillStyle = "#c0392b";
    x.fillRect(w * 0.78, h * 0.1, w * 0.14, h * 0.2);
  }, { bump: 0 });
}

export function skyTexture(kind = "day") {
  return make(`sky${kind}`, () => {
    const [c, x] = canvas(1024, 512);
    const g = x.createLinearGradient(0, 0, 0, 512);
    if (kind === "red") {
      g.addColorStop(0, "#3a0306");
      g.addColorStop(0.45, "#8d0f14");
      g.addColorStop(0.5, "#d2401f");
      g.addColorStop(1, "#2a0204");
    } else {
      g.addColorStop(0, "#5f8fc4");
      g.addColorStop(0.45, "#bcd3e8");
      g.addColorStop(0.5, "#e3e7ea");
      g.addColorStop(1, "#9aa4ad");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, 1024, 512);
    // soft clouds in the upper half
    x.save();
    x.beginPath();
    x.rect(0, 40, 1024, 220);
    x.clip();
    const cloud = kind === "red" ? [255, 120, 80] : [255, 255, 255];
    for (let i = 0; i < 160; i++) {
      const cx = rnd() * 1024, cy = rr(80, 240), r = rr(15, 55);
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, rgb(cloud, 1, rr(0.25, 0.55)));
      rg.addColorStop(1, rgb(cloud, 1, 0));
      x.fillStyle = rg;
      x.beginPath();
      x.ellipse(cx, cy, r * 2.2, r, 0, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}
