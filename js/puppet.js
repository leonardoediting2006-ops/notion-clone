// Flat 2D cartoon people living in the 3D world ("paper puppets").
//
//   import { createPuppet } from "../../js/puppet.js";
//   const mum = createPuppet({ skin: "#f2c29b", hair: "#5a3a22", hairStyle: "long", shirt: "#4aa3c9" });
//   scene.add(mum);
//   onUpdate((t) => {
//     mum.pose({ t, x: 1, z: -2, sit: 1, seat: 0.46, mouth: { open: 0.8 }, armR: { to: mum.mouthPoint(), bend: 1 } });
//     mum.faceCamera(camera);          // always turns flat side to the lens: flat, but standing in a real 3D room
//   });
//
// Every body part is a flat plane with a hand-painted canvas texture (thick ink outline, flat colour, one cel-shade tone).
// The face is redrawn from numbers, so blinks, brows and a full yawn are smooth. pose() is a pure function of its
// arguments (no clock, no randomness), so every frame can be reproduced.
//
// Coordinates inside pose() ("rig space"): metres, x right, y up from the feet, for a 1.7 m person (scaled by `height`).

import { THREE } from "./engine.js";
import { blobShadow } from "./toon.js";

const INK = "#2b1b16";
const LW = 0.013;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;

// ---------- colours ----------
function rgbOf(c) {
  if (typeof c === "number") return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  const m = /^#?([0-9a-f]{6})$/i.exec(c);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const css = (r) => `rgb(${r.map((v) => Math.round(v)).join(",")})`;
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  return css(A.map((v, i) => lerp(v, B[i], k)));
}
const shadeOf = (c) => mix(c, "#3a1f4a", 0.2); // warm base, cool-purple shadow
const hex = (c) => (typeof c === "number" ? "#" + c.toString(16).padStart(6, "0") : c);

// ---------- canvas painting (metres, y DOWN, origin at the centre) ----------
function paint(w, h, draw, ppm = 720) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * ppm);
  c.height = Math.ceil(h * ppm);
  const x = c.getContext("2d");
  x.translate(c.width / 2, c.height / 2);
  x.scale(ppm, ppm);
  x.lineJoin = x.lineCap = "round";
  draw(x);
  return c;
}
function textureOf(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const rr = (x0, y0, w, h, r) => (x) => x.roundRect(x0, y0, w, h, r);
const oval = (cx, cy, rx, ry) => (x) => x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

// flat fill + one cel-shade crescent (light from the upper left) + ink outline
function shape(x, path, fill, { shade = true, dx = 0.035, dy = 0.0, lw = LW, shadeColor, ink = INK } = {}) {
  x.beginPath(); path(x);
  x.fillStyle = fill; x.fill();
  if (shade) {
    x.save();
    x.beginPath(); path(x); x.clip();
    x.beginPath(); x.rect(-2, -2, 4, 4);
    x.save(); x.translate(-dx, -dy); path(x); x.restore();
    x.fillStyle = shadeColor ?? shadeOf(fill);
    x.fill("evenodd");
    x.restore();
  }
  if (lw) {
    x.beginPath(); path(x);
    x.lineWidth = lw; x.strokeStyle = ink; x.stroke();
  }
}
const line = (x, pts, lw, color = INK) => {
  x.beginPath();
  x.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) pts[i].length === 4 ? x.quadraticCurveTo(...pts[i]) : x.lineTo(...pts[i]);
  x.lineWidth = lw; x.strokeStyle = color; x.stroke();
};

// ---------- the parts ----------
const cache = new Map();
const memo = (key, make) => (cache.has(key) ? cache.get(key) : (cache.set(key, make()), cache.get(key)));

// head: ears, face, cheeks, nose, (beard)
function headCanvas(o) {
  return paint(0.62, 0.66, (x) => {
    for (const s of [-1, 1]) {
      shape(x, oval(s * 0.243, 0.02, 0.05, 0.06), o.skin, { shade: false });
      x.beginPath(); x.ellipse(s * 0.243, 0.025, 0.02, 0.03, 0, 0, Math.PI * 2);
      x.fillStyle = mix(o.skin, "#c0504a", 0.25); x.fill();
    }
    shape(x, rr(-0.235, -0.27, 0.47, 0.54, [0.2, 0.2, 0.22, 0.22]), o.skin, { dx: 0.06 });
    x.fillStyle = "rgba(255,110,110,0.3)";
    for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 0.15, 0.085, 0.05, 0.03, 0, 0, Math.PI * 2); x.fill(); }
    line(x, [[-0.014, 0.06], [0.0, 0.085, 0.022, 0.062]], 0.011, mix(o.skin, "#5a2a1a", 0.55)); // nose
    if (o.beard) {
      shape(x, (c) => {
        c.moveTo(-0.235, 0.0); c.bezierCurveTo(-0.24, 0.2, -0.16, 0.3, 0, 0.3); c.bezierCurveTo(0.16, 0.3, 0.24, 0.2, 0.235, 0.0);
        c.quadraticCurveTo(0.2, 0.1, 0.12, 0.1); c.quadraticCurveTo(0, 0.07, -0.12, 0.1); c.quadraticCurveTo(-0.2, 0.1, -0.235, 0.0);
      }, o.hair, { dx: 0.05 });
    }
  }, 800);
}

function hairFrontCanvas(o) {
  const c = o.hair;
  return paint(0.7, 0.96, (x) => {
    const S = (p, opt) => shape(x, p, c, { dx: 0.06, ...opt });
    switch (o.hairStyle) {
      case "short":
      case "bun":
        S((p) => {
          p.moveTo(-0.25, 0.0); p.bezierCurveTo(-0.3, -0.3, -0.12, -0.38, 0.02, -0.37); p.bezierCurveTo(0.2, -0.37, 0.31, -0.22, 0.25, 0.0);
          p.quadraticCurveTo(0.22, -0.1, 0.15, -0.16); p.quadraticCurveTo(0.0, -0.24, -0.13, -0.15); p.quadraticCurveTo(-0.21, -0.1, -0.25, 0.0);
        });
        break;
      case "long":
        S((p) => {
          p.moveTo(-0.27, 0.12); p.bezierCurveTo(-0.34, -0.3, -0.1, -0.4, 0.03, -0.38); p.bezierCurveTo(0.22, -0.38, 0.34, -0.25, 0.27, 0.12);
          p.quadraticCurveTo(0.24, -0.08, 0.12, -0.17); p.quadraticCurveTo(-0.02, -0.14, -0.16, -0.1); p.quadraticCurveTo(-0.24, -0.04, -0.27, 0.12);
        });
        break;
      case "curly":
        S((p) => {
          for (let i = 0; i <= 8; i++) {
            const a = Math.PI * (1.02 + (i / 8) * 0.96);
            p.moveTo(Math.cos(a) * 0.27 + 0.07, Math.sin(a) * 0.3 - 0.06);
            p.arc(Math.cos(a) * 0.27, Math.sin(a) * 0.3 - 0.06, 0.07, 0, Math.PI * 2);
          }
          p.moveTo(-0.24, -0.04); p.quadraticCurveTo(0, -0.3, 0.24, -0.04); p.lineTo(0.24, -0.1); p.lineTo(-0.24, -0.1);
        });
        break;
      case "cap":
        S((p) => { p.moveTo(-0.25, -0.1); p.bezierCurveTo(-0.28, -0.4, 0.28, -0.4, 0.25, -0.1); p.lineTo(-0.25, -0.1); }, {});
        shape(x, rr(-0.28, -0.13, 0.56, 0.06, 0.03), mix(c, "#000000", 0.15), { shade: false });
        shape(x, rr(-0.06, -0.1, 0.34, 0.05, 0.025), mix(c, "#000000", 0.15), { shade: false }); // brim
        break;
      default:
        break; // bald
    }
  }, 800);
}

function hairBackCanvas(o) {
  if (o.hairStyle !== "long" && o.hairStyle !== "bun") return null;
  return paint(0.74, 1.1, (x) => {
    if (o.hairStyle === "long") shape(x, rr(-0.3, -0.3, 0.6, 0.78, [0.28, 0.28, 0.1, 0.1]), o.hair, { dx: 0.07 });
    else shape(x, oval(0, -0.39, 0.1, 0.1), o.hair, { dx: 0.03 });
  }, 800);
}

// seen from behind: the whole head is hair
function headBackCanvas(o) {
  return paint(0.62, 0.84, (x) => {
    for (const s of [-1, 1]) shape(x, oval(s * 0.243, 0.03, 0.05, 0.06), o.skin, { shade: false });
    const c = o.hairStyle === "bald" ? o.skin : o.hair;
    shape(x, rr(-0.245, -0.33, 0.49, 0.6, [0.22, 0.22, 0.2, 0.2]), c, { dx: 0.07 });
  }, 800);
}

function glassesCanvas() {
  return paint(0.62, 0.3, (x) => {
    for (const s of [-1, 1]) {
      shape(x, oval(s * 0.095, 0, 0.068, 0.072), "rgba(190,230,255,0.28)", { shade: false, lw: 0.014 });
    }
    line(x, [[-0.027, -0.01], [0, -0.03, 0.027, -0.01]], 0.013);
    for (const s of [-1, 1]) line(x, [[s * 0.163, -0.01], [s * 0.235, 0.0]], 0.012);
  }, 800);
}

function torsoCanvas(o, back) {
  const W = 0.46, H = 0.56;
  return paint(0.54, 0.64, (x) => {
    shape(x, rr(-W / 2, -H / 2, W, H, [0.17, 0.17, 0.06, 0.06]), o.shirt, { dx: 0.08 });
    // waistband
    x.save(); x.beginPath(); rr(-W / 2, -H / 2, W, H, [0.17, 0.17, 0.06, 0.06])(x); x.clip();
    x.fillStyle = mix(o.pants, "#000000", 0.1); x.fillRect(-W / 2, H / 2 - 0.045, W, 0.06); x.restore();
    if (o.outfit === "labcoat") {
      if (!back) {
        shape(x, (p) => { p.moveTo(-0.075, -H / 2); p.lineTo(0.075, -H / 2); p.lineTo(0, 0.0); p.closePath(); }, o.under ?? "#6bb7e6", { shade: false, lw: 0.011 });
        line(x, [[0, 0.0], [0, H / 2]], 0.012);
        for (const s of [-1, 1]) shape(x, (p) => { p.moveTo(s * 0.075, -H / 2); p.lineTo(s * 0.15, -H / 2 + 0.02); p.lineTo(s * 0.04, -0.06); p.closePath(); }, "#ffffff", { shade: false, lw: 0.011 });
        shape(x, rr(0.07, 0.07, 0.1, 0.11, 0.02), mix(o.shirt, "#000000", 0.05), { shade: false, lw: 0.01 });
        line(x, [[0.085, 0.045], [0.085, 0.09]], 0.012, "#e0503c"); // pen in the pocket
      } else {
        line(x, [[0, -H / 2 + 0.02], [0, H / 2]], 0.011);
        shape(x, (p) => { p.moveTo(-0.07, -H / 2); p.quadraticCurveTo(0, -H / 2 + 0.06, 0.07, -H / 2); p.lineTo(0.07, -H / 2 - 0.01); p.lineTo(-0.07, -H / 2 - 0.01); p.closePath(); }, mix(o.shirt, "#000000", 0.08), { shade: false, lw: 0.01 });
      }
    } else if (!back) {
      // neckline
      shape(x, oval(0, -H / 2 + 0.005, 0.078, 0.05), o.skin, { shade: false, lw: 0.012 });
      if (o.outfit === "hoodie") {
        shape(x, rr(-0.12, 0.08, 0.24, 0.12, 0.04), mix(o.shirt, "#000000", 0.1), { shade: false, lw: 0.011 });
        for (const s of [-1, 1]) line(x, [[s * 0.035, -H / 2 + 0.05], [s * 0.04, -0.06]], 0.012, "#f4f1e8");
      }
      if (o.stripe) {
        x.save(); x.beginPath(); rr(-W / 2, -H / 2, W, H, [0.17, 0.17, 0.06, 0.06])(x); x.clip();
        x.fillStyle = o.stripe; for (let y = -0.16; y < 0.2; y += 0.12) x.fillRect(-W / 2, y, W, 0.05);
        x.restore();
        x.beginPath(); rr(-W / 2, -H / 2, W, H, [0.17, 0.17, 0.06, 0.06])(x); x.lineWidth = LW; x.strokeStyle = INK; x.stroke();
      }
    }
  });
}

// kind: "round" (arms, bent thigh: rounded both ends), "thighStraight" (flat bottom, joins the shin), "shin" (flat top, tucks under the thigh)
function limbCanvas(w, h, body, skin, split, shoe, kind = "round") {
  return paint(w + 0.06, h + 0.06, (x) => {
    const r = w / 2;
    const radii = kind === "thighStraight" ? [r, r, 0, 0] : kind === "shin" ? [0, 0, r, r] : r;
    const p = rr(-w / 2, -h / 2, w, h, radii);
    shape(x, p, body, { dx: w * 0.26, lw: kind === "round" ? LW : 0 });
    if (kind !== "round") { // ink only along the long sides (and the rounded end), so the joint reads as one leg
      for (const sx of [-1, 1]) line(x, [[sx * w / 2, kind === "shin" ? -h / 2 : -h / 2 + r], [sx * w / 2, kind === "shin" ? h / 2 - r : h / 2]], LW);
      if (kind === "thighStraight") { x.beginPath(); x.arc(0, -h / 2 + r, r, Math.PI, 0); x.lineWidth = LW; x.strokeStyle = INK; x.stroke(); }
      if (kind === "shin" && !shoe) { x.beginPath(); x.arc(0, h / 2 - r, r, 0, Math.PI); x.lineWidth = LW; x.strokeStyle = INK; x.stroke(); }
    }
    if (split && kind === "round") { // short sleeve / shorts: skin below `split` metres from the top
      x.save(); x.beginPath(); p(x); x.clip();
      x.fillStyle = skin; x.fillRect(-w, -h / 2 + split, w * 2, h);
      x.fillStyle = shadeOf(skin); x.fillRect(w * 0.12, -h / 2 + split, w, h);
      x.restore();
      line(x, [[-w / 2, -h / 2 + split], [w / 2, -h / 2 + split]], 0.011);
      x.beginPath(); p(x); x.lineWidth = LW; x.strokeStyle = INK; x.stroke();
    }
    if (kind === "round" && !shoe && !split) { /* plain capsule */ }
    if (shoe) {
      shape(x, rr(-w / 2 - 0.018, h / 2 - 0.095, w + 0.036, 0.1, 0.045), shoe, { dx: 0.05 });
      line(x, [[-w / 2 - 0.012, h / 2 - 0.018], [w / 2 + 0.012, h / 2 - 0.018]], 0.01, "#9a8a7a");
    }
  });
}

// the whole arm is ONE ribbon (sleeve, skin, hand-end) with ink only along its two long edges, so it bends with no joint circles
const ARM_W0 = 0.125, ARM_W1 = 0.1;
function armCanvas(o, total, sleeveLen) {
  const W = 128, H = 560;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  const sleeve = o.shirt, skin = o.skin;
  const hem = Math.min(H, Math.round((sleeveLen / total) * H));
  x.fillStyle = sleeve; x.fillRect(0, 0, W, hem);
  x.fillStyle = skin; x.fillRect(0, hem, W, H - hem);
  // cel shade on the lit-away side
  x.fillStyle = shadeOf(sleeve); x.fillRect(W * 0.68, 0, W, hem);
  x.fillStyle = shadeOf(skin); x.fillRect(W * 0.68, hem, W, H - hem);
  // sleeve hem line
  if (hem < H - 4) { x.fillStyle = INK; x.fillRect(0, hem - 4, W, 8); }
  // ink along both long edges (it fades in at the shoulder so the arm melts into the shirt)
  const e = Math.round((LW / ARM_W0) * W * 0.95);
  const g = x.createLinearGradient(0, 0, 0, 60);
  g.addColorStop(0, "rgba(43,27,22,0)"); g.addColorStop(1, "rgba(43,27,22,1)");
  x.fillStyle = g; x.fillRect(0, 0, e, 60); x.fillRect(W - e, 0, e, 60);
  x.fillStyle = INK; x.fillRect(0, 60, e, H - 60); x.fillRect(W - e, 60, e, H - 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.flipY = false; // v = 0 at the shoulder (top of the canvas)
  return t;
}

// the hand continues the forearm: no ink where it joins the wrist, same width as the arm's end
function handCanvas(skin) {
  return paint(0.2, 0.2, (x) => {
    const w = ARM_W1 / 2;
    const body = (p) => { p.moveTo(-w, -0.06); p.lineTo(-w, 0.022); p.arcTo(-w, 0.066, -w + 0.04, 0.066, 0.04); p.lineTo(w - 0.04, 0.066); p.arcTo(w, 0.066, w, 0.022, 0.04); p.lineTo(w, -0.06); p.closePath(); };
    x.beginPath(); body(x); x.fillStyle = skin; x.fill();
    x.save(); x.clip(); x.fillStyle = shadeOf(skin); x.fillRect(w * 0.35, -0.1, 0.2, 0.3); x.restore();
    x.beginPath(); x.moveTo(-w, -0.06); x.lineTo(-w, 0.022); x.arcTo(-w, 0.066, -w + 0.04, 0.066, 0.04); x.lineTo(w - 0.04, 0.066); x.arcTo(w, 0.066, w, 0.022, 0.04); x.lineTo(w, -0.06);
    x.lineWidth = LW; x.strokeStyle = INK; x.stroke();
    for (const dx of [-0.016, 0.0, 0.016]) line(x, [[dx, 0.03], [dx, 0.058]], 0.008, mix(skin, "#3a1a10", 0.55));
    shape(x, oval(0.056, 0.0, 0.02, 0.032), skin, { shade: false, lw: 0.011 });
  }, 800);
}

// the face is a live canvas: eyes, brows and mouth from numbers
function drawFace(x, f, o) {
  const brow = mix(o.hair, "#000000", 0.25);
  // brows
  for (const s of [-1, 1]) {
    const y = -0.145 - f.browRaise * 0.045;
    const yin = y - f.browWorry * 0.035 + f.browAngry * 0.035;
    const yout = y + f.browWorry * 0.025 - f.browAngry * 0.025;
    x.beginPath();
    x.moveTo(s * 0.04, yin);
    x.quadraticCurveTo(s * 0.095, Math.min(yin, yout) - 0.025, s * 0.15, yout);
    x.lineWidth = 0.022; x.strokeStyle = brow; x.stroke();
  }
  // eyes
  for (const s of [-1, 1]) {
    const cx = s * 0.094, cy = -0.02;
    const rx = 0.056 * f.size, ry = 0.068 * f.size * f.open;
    if (f.happy > 0.5) {
      x.beginPath(); x.arc(cx, cy + 0.03, rx * 0.95, Math.PI * 1.12, Math.PI * 1.88);
      x.lineWidth = 0.017; x.strokeStyle = INK; x.stroke();
      continue;
    }
    if (f.open < 0.14) {
      x.beginPath(); x.moveTo(cx - rx, cy + 0.005); x.quadraticCurveTo(cx, cy + 0.035, cx + rx, cy + 0.005);
      x.lineWidth = 0.017; x.strokeStyle = INK; x.stroke();
      for (const k of [-1, 0, 1]) line(x, [[cx + k * rx * 0.55, cy + 0.02], [cx + k * rx * 0.7, cy + 0.04]], 0.008);
      continue;
    }
    shape(x, oval(cx, cy, rx, ry), "#ffffff", { shade: false, lw: 0.011 });
    x.save(); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.clip();
    const px = cx + f.lookX * rx * 0.42, py = cy + f.lookY * ry * 0.35 + ry * 0.04;
    const pr = Math.min(rx * 0.68, 0.04) * (1 + f.cute * 0.15);
    x.beginPath(); x.ellipse(px, py, pr, Math.min(pr * 1.12, ry * 1.1), 0, 0, Math.PI * 2);
    x.fillStyle = "#2a1810"; x.fill();
    x.beginPath(); x.arc(px - pr * 0.32, py - pr * 0.38, pr * 0.3, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill();
    x.beginPath(); x.arc(px + pr * 0.35, py + pr * 0.35, pr * 0.15, 0, Math.PI * 2); x.fill();
    x.restore();
    x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
    x.lineWidth = 0.02; x.strokeStyle = INK; x.stroke();
  }
  // mouth
  const my = 0.14, w = 0.085 * f.mouthW;
  if (f.mouthOpen < 0.05) {
    line(x, [[-w, my], [0, my + f.smile * 0.06, w, my]], 0.015);
  } else {
    const d = 0.02 + f.mouthOpen * 0.14;
    const path = (p) => {
      p.moveTo(-w, my); p.quadraticCurveTo(0, my - 0.012 + f.smile * 0.03, w, my); p.quadraticCurveTo(0, my + d * 1.9, -w, my); p.closePath();
    };
    x.beginPath(); path(x); x.fillStyle = "#6a1f2e"; x.fill();
    x.save(); x.beginPath(); path(x); x.clip();
    if (f.mouthOpen > 0.25) { x.beginPath(); x.ellipse(0, my + d * 0.98, w * 0.62, d * 0.42, 0, 0, Math.PI * 2); x.fillStyle = "#f0768a"; x.fill(); }
    if (f.teeth) { x.fillStyle = "#fffdf4"; x.fillRect(-w, my - 0.02, w * 2, 0.04 + d * 0.15); }
    x.restore();
    x.beginPath(); path(x); x.lineWidth = 0.014; x.strokeStyle = INK; x.stroke();
  }
  if (f.tear > 0) { // a sleepy eye-water drop
    x.beginPath(); x.ellipse(0.13, 0.04 + f.tear * 0.05, 0.012, 0.018, 0, 0, Math.PI * 2);
    x.fillStyle = "#9fdcff"; x.fill();
  }
}

// ---------- the puppet ----------
const DEFAULTS = {
  skin: "#f1c7a0", hair: "#4a3020", hairStyle: "short", shirt: "#4aa3c9", pants: "#34476b", shoes: "#f3efe6",
  outfit: "tee", sleeves: "short", under: "#6bb7e6", stripe: null, beard: false, glasses: false,
  height: 1.7, seed: 0,
};

export function createPuppet(options = {}) {
  const o = { ...DEFAULTS, ...options };
  o.skin = hex(o.skin); o.hair = hex(o.hair); o.shirt = hex(o.shirt); o.pants = hex(o.pants); o.shoes = hex(o.shoes);
  const key = JSON.stringify([o.skin, o.hair, o.hairStyle, o.shirt, o.pants, o.shoes, o.outfit, o.sleeves, o.under, o.stripe, o.beard, o.glasses]);
  const mats = [];
  const plane = (w, h, canvas, { pivotTop = false, z = 0, cx = 0, cy = 0 } = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    if (pivotTop) g.translate(0, -h / 2, 0);
    const m = new THREE.MeshBasicMaterial({ map: canvas.isTexture ? canvas : textureOf(canvas), alphaTest: 0.35, side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(cx, cy, z);
    mesh.userData.ink = false;
    return mesh;
  };
  const group = (x = 0, y = 0, z = 0, parent) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent?.add(g);
    return g;
  };

  const root = new THREE.Group(); // position only
  const bill = group(0, 0, 0, root); // turns to the camera
  const rig = group(0, 0, 0, bill); // flip + height scale
  root.add(blobShadow(0.3, 0.3, 0.3));

  const long = o.sleeves === "long" || o.outfit === "labcoat" || o.outfit === "hoodie";
  const SLEEVE = o.outfit === "labcoat" ? o.shirt : o.shirt;
  const THIGH = 0.33, SHIN = 0.33, UPPER = 0.27, FORE = 0.26, TORSO = 0.56, HEADC = 0.29;

  const parts = memo("parts" + key, () => ({
    head: headCanvas(o),
    hairFront: hairFrontCanvas(o),
    hairBack: hairBackCanvas(o),
    headB: headBackCanvas(o),
    glasses: o.glasses ? glassesCanvas() : null,
    torsoFront: torsoCanvas(o, false),
    torsoBack: torsoCanvas(o, true),
    thighS: limbCanvas(0.18, THIGH, o.pants, o.skin, 0, null, "thighStraight"),
    thighB: limbCanvas(0.18, THIGH, o.pants, o.skin, 0),
    shin: limbCanvas(0.17, SHIN + 0.06, o.pants, o.skin, 0, o.shoes, "shin"),
    hand: handCanvas(o.skin),
    arm: armCanvas(o, UPPER + FORE + 0.03, long ? 9 : 0.2),
  }));
  const tex = (c) => memo("tex" + key + (c.__id ??= Math.random().toString(36).slice(2)), () => textureOf(c));

  // legs: standing = thigh + shin in one line; sitting = a rounded thigh that overlaps the shin (a real knee)
  const leg = {};
  for (const s of [-1, 1]) {
    const hip = group(s * 0.105, 0, s < 0 ? -0.012 : -0.02, rig);
    const thighS = plane(0.24, THIGH + 0.06, tex(parts.thighS), { pivotTop: true, cy: 0.03 });
    const thighB = plane(0.24, THIGH + 0.06, tex(parts.thighB), { pivotTop: true, cy: 0.03, z: 0.006 });
    hip.add(thighS, thighB);
    const knee = group(0, -THIGH, 0.004, hip);
    knee.add(plane(0.23, SHIN + 0.12, tex(parts.shin), { pivotTop: true, cy: 0.03 }));
    leg[s] = { hip, thigh: thighS, thighB, knee };
  }
  // torso (+ back view)
  const torso = group(0, 0, 0, rig);
  const torsoF = plane(0.54, 0.64, tex(parts.torsoFront), { cy: TORSO / 2 });
  const torsoB = plane(0.54, 0.64, tex(parts.torsoBack), { cy: TORSO / 2 });
  torso.add(torsoF, torsoB);
  // neck + head
  const neck = plane(0.13, 0.16, paint(0.13, 0.16, (x) => { x.fillStyle = shadeOf(o.skin); x.fillRect(-0.06, -0.08, 0.12, 0.16); }, 400), { z: 0.002 });
  neck.visible = true;
  torso.add(neck);
  neck.position.set(0, TORSO + 0.02, 0.002);
  const headG = group(0, TORSO + 0.03, 0.006, torso); // pivot: base of the neck
  const headM = plane(0.62, 0.66, tex(parts.head), { cy: HEADC });
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = Math.ceil(0.62 * 800); faceCanvas.height = Math.ceil(0.66 * 800);
  const faceTex = textureOf(faceCanvas);
  const faceM = plane(0.62, 0.66, faceTex, { cy: HEADC, z: 0.006 });
  const hairF = plane(0.7, 0.96, tex(parts.hairFront), { cy: HEADC, z: 0.012 });
  const headB = plane(0.62, 0.84, tex(parts.headB), { cy: HEADC, z: 0.008 });
  const hairBk = parts.hairBack ? plane(0.74, 1.1, tex(parts.hairBack), { cy: HEADC, z: -0.03 }) : null;
  const glassesM = parts.glasses ? plane(0.62, 0.3, tex(parts.glasses), { cy: HEADC - 0.02, z: 0.018 }) : null;
  headG.add(headM, faceM, hairF, headB);
  if (hairBk) headG.add(hairBk);
  if (glassesM) headG.add(glassesM);
  // arms (in front of the torso): one smooth ribbon per arm, plus the hand that continues it
  const arm = {};
  const RN = 21; // samples along the ribbon (nA + nB + nC + 1 = 22 points)
  const armMat = new THREE.MeshBasicMaterial({ map: parts.arm, alphaTest: 0.35, side: THREE.DoubleSide });
  mats.push(armMat);
  for (const s of [-1, 1]) {
    const sh = group(s * 0.215, TORSO - 0.06, 0.016, torso);
    const elbow = group(0, -UPPER, 0.004, sh);
    const hand = group(0, -FORE, 0.008, elbow);
    hand.add(plane(0.2, 0.2, tex(parts.hand), { cy: -0.06 }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((RN + 1) * 2 * 3), 3));
    const uv = new Float32Array((RN + 1) * 2 * 2), idx = [];
    for (let i = 0; i <= RN; i++) { uv.set([0, i / RN, 1, i / RN], i * 4); }
    for (let i = 0; i < RN; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const ribbon = new THREE.Mesh(geo, armMat);
    ribbon.frustumCulled = false; ribbon.userData.ink = false;
    ribbon.position.z = 0.016;
    torso.add(ribbon);
    arm[s] = { sh, elbow, hand, geo };
  }
  // rebuild an arm ribbon through shoulder S, elbow E and the hand end W (torso space), with a softly rounded elbow
  const P = [];
  function updateRibbon(A, s) {
    const th1 = A.sh.rotation.z, th2 = th1 + A.elbow.rotation.z;
    const S = [s * 0.215, TORSO - 0.06];
    const E = [S[0] + Math.sin(th1) * UPPER, S[1] - Math.cos(th1) * UPPER];
    const W = [E[0] + Math.sin(th2) * (FORE + 0.03), E[1] - Math.cos(th2) * (FORE + 0.03)];
    const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const M1 = lerp2(S, E, 0.5), M2 = lerp2(E, W, 0.5);
    P.length = 0;
    const nA = 6, nB = 9, nC = 6;
    for (let i = 0; i < nA; i++) P.push(lerp2(S, M1, 0.28 + (0.72 * i) / nA)); // starts a little inside the shirt
    for (let i = 0; i < nB; i++) { const u = i / nB, a = lerp2(M1, E, u), b = lerp2(E, M2, u); P.push(lerp2(a, b, u)); }
    for (let i = 0; i <= nC; i++) P.push(lerp2(M2, W, i / nC));
    let total = 0;
    const cum = [0];
    for (let i = 1; i < P.length; i++) { total += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(total); }
    const pos = A.geo.attributes.position.array, uv = A.geo.attributes.uv.array;
    const n = P.length;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx;
      const v = cum[i] / total, w = (ARM_W0 + (ARM_W1 - ARM_W0) * v) / 2;
      pos.set([P[i][0] - nx * w, P[i][1] - ny * w, 0, P[i][0] + nx * w, P[i][1] + ny * w, 0], i * 6);
      uv.set([0, v, 1, v], i * 4);
    }
    A.geo.setDrawRange(0, (n - 1) * 6);
    A.geo.attributes.position.needsUpdate = true;
    A.geo.attributes.uv.needsUpdate = true;
  }

  const face = {};
  let faceKey = "";
  function setFace(f) {
    const k = JSON.stringify(f, (_, v) => (typeof v === "number" ? Math.round(v * 500) / 500 : v));
    if (k === faceKey) return;
    faceKey = k;
    const x = faceCanvas.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    x.translate(faceCanvas.width / 2, faceCanvas.height / 2);
    x.scale(800, 800);
    x.lineJoin = x.lineCap = "round";
    drawFace(x, f, o);
    faceTex.needsUpdate = true;
  }

  function solveArm(S, T, bend) {
    const dx = T[0] - S[0], dy = T[1] - S[1];
    const d = clamp(Math.hypot(dx, dy), Math.abs(UPPER - FORE) + 1e-3, UPPER + FORE - 1e-3);
    const phi = Math.atan2(dx, -dy);
    const g1 = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1));
    const a1 = phi + bend * g1;
    const ex = S[0] + Math.sin(a1) * UPPER, ey = S[1] - Math.cos(a1) * UPPER;
    const a2 = Math.atan2(T[0] - ex, -(T[1] - ey));
    return [a1, a2 - a1];
  }

  const state = { hipY: 0.66, headTurn: 0, headLift: 0, headTilt: 0, flip: 1, sit: 0 };

  const puppet = root;
  puppet.parts = { torso, headG, arm, leg };

  // where the mouth is, in rig space (aim a hand here for a yawn)
  puppet.mouthPoint = () => [state.headTurn * 0.05 + Math.sin(-state.headTilt) * 0.2, state.hipY + TORSO + 0.03 + HEADC - 0.14 + state.headLift + 0.0];
  puppet.shoulderPoint = (s) => [s * 0.215, state.hipY + TORSO - 0.06];

  puppet.pose = ({
    t = 0, x = 0, y = 0, z = 0, flip = 1, back = false,
    sit = 0, seat = 0.46, lean = 0, breathe = 1, walk = 0, walkPhase = 0,
    look = [0, 0], blink, eyes = {}, brow = {}, mouth = {}, head = {}, cute = 0, tear = 0,
    armL = {}, armR = {}, // each: { to: [x, y], bend: ±1 } (reach a point) or { a: shoulderAngle, e: elbowAngle }
  } = {}) => {
    const sc = o.height / 1.7;
    root.position.set(x, y, z);
    rig.scale.set(flip * sc, sc, sc);
    state.flip = flip; state.sit = sit;
    const bob = Math.abs(Math.sin(walkPhase)) * 0.03 * walk;
    const hipY = lerp(THIGH + SHIN, seat + 0.08, sit) + bob;
    state.hipY = hipY;
    const breath = Math.sin(t * 2.1 + o.seed) * 0.012 * breathe;
    // legs: standing straight (a little stride when walking); sitting: thighs point at the camera (foreshortened)
    for (const s of [-1, 1]) {
      const L = leg[s];
      L.hip.position.set(s * 0.105, hipY, s < 0 ? -0.012 : -0.02);
      const swing = Math.sin(walkPhase + (s > 0 ? Math.PI : 0)) * 0.5 * walk;
      L.hip.rotation.z = swing * 0.35;
      const bent = sit > 0.5;
      const k = lerp(1, 0.6, sit);
      L.thigh.visible = !bent; L.thighB.visible = bent;
      L.thigh.scale.y = L.thighB.scale.y = k;
      L.knee.position.y = -THIGH * k + (bent ? 0.06 : 0.015);
      L.knee.position.z = bent ? -0.004 : 0.004;
      L.knee.rotation.z = -L.hip.rotation.z + (sit ? -s * 0.04 : 0);
    }
    torso.position.set(0, hipY, 0);
    torso.rotation.z = -lean;
    torso.scale.set(1 + breath, 1 + breath * 0.6, 1);
    torsoF.visible = !back;
    torsoB.visible = back;
    // head
    state.headTurn = head.turn ?? 0; state.headLift = head.lift ?? 0; state.headTilt = head.tilt ?? 0;
    headG.rotation.z = head.tilt ?? 0;
    headG.position.set(0, TORSO + 0.03 + (head.lift ?? 0), 0.006);
    faceM.visible = headM.visible = !back;
    faceM.position.x = (head.turn ?? 0) * 0.05;
    if (glassesM) { glassesM.visible = !back; glassesM.position.x = faceM.position.x; }
    hairF.position.x = (head.turn ?? 0) * 0.018;
    hairF.visible = !back;
    headB.visible = back;
    // face
    const auto = (() => { const P = 3.4 + (o.seed % 7) * 0.17, ph = (t + o.seed * 0.9) % P; return ph < 0.14 ? Math.abs(ph / 0.07 - 1) : 1; })();
    setFace({
      open: clamp((eyes.open ?? 1) * (blink ?? auto)), happy: eyes.happy ?? 0, size: (eyes.size ?? 1) + cute * 0.2,
      lookX: look[0], lookY: look[1], cute,
      browRaise: brow.raise ?? 0, browWorry: brow.worry ?? 0, browAngry: brow.angry ?? 0,
      mouthOpen: mouth.open ?? 0, smile: mouth.smile ?? 0.35, mouthW: mouth.width ?? 1, teeth: !!mouth.teeth, tear,
    });
    // arms
    for (const [s, a] of [[-1, armL], [1, armR]]) {
      const A = arm[s];
      A.sh.position.set(s * 0.215, TORSO - 0.06, 0.016);
      if (a.to) {
        const S = puppet.shoulderPoint(s);
        const T = [a.to[0], a.to[1]];
        // `to` is in rig space; the shoulder moves with the torso lean (small), ignore that
        const [a1, a2] = solveArm(S, T, a.bend ?? s);
        A.sh.rotation.z = a1 - (-lean);
        A.elbow.rotation.z = a2;
      } else {
        const idle = Math.sin(t * 1.7 + o.seed + s) * 0.02 * breathe;
        A.sh.rotation.z = (a.a ?? 0.08 * s) + idle;
        A.elbow.rotation.z = a.e ?? 0;
      }
      A.hand.rotation.z = (a.hand ?? 0);
      updateRibbon(A, s);
    }
  };

  // face the camera (rotate about the vertical axis only)
  const wp = new THREE.Vector3();
  puppet.faceCamera = (camera) => {
    root.getWorldPosition(wp);
    bill.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
  };
  puppet.tint = (c) => mats.forEach((m) => m.color.set(c));
  puppet.pose();
  return puppet;
}
