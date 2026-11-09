import { THREE } from "../../js/engine.js";

// Small shared toolbox for the dog-gaze short: maths, canvas textures, emoji icons and thought bubbles that are always kept in the frame,
// bursts and flights of emoji, particle streams, and the cross-dissolve between shots. Every helper is a pure function of time where it matters.

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = { in: (u) => u * u, out: (u) => 1 - (1 - u) * (1 - u), inOut: (u) => u * u * (3 - 2 * u), glide: (u) => lerp(u, u * u * (3 - 2 * u), 0.7) };
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const bump = (u) => Math.sin(Math.PI * clamp01(u));
export const mixv = (a, b, k) => a.clone().lerp(b, k);
export const popK = (t, t0, dur = 0.9) => ease.out(prog(t, t0, t0 + 0.2)) * (1 - prog(t, t0 + dur - 0.2, t0 + dur));

export function canvasTex(w, h, draw, { repeat = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export const glowTex = canvasTex(128, 128, (x) => { const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }, { repeat: false });

export function createKit({ scene, camera }) {
  // ---------- emoji sprites, thought bubbles, canvas sprites ----------
  function emojiSprite(ch) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.font = `100px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 64, 72);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    s.renderOrder = 8; s.visible = false; scene.add(s); return s;
  }
  const icons = new Map();
  const ico = (ch) => { if (!icons.has(ch)) icons.set(ch, emojiSprite(ch)); return icons.get(ch); };
  const bubbles = new Map();
  function bubbleSprite(emoji, fs = 84) {
    const c = document.createElement("canvas"); c.width = 200; c.height = 180;
    const x = c.getContext("2d");
    x.lineWidth = 9; x.strokeStyle = "#2b1b16"; x.fillStyle = "#fff";
    x.beginPath(); x.ellipse(100, 76, 86, 62, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    for (const [cx, cy, r] of [[56, 148, 14], [34, 170, 8]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.stroke(); }
    x.font = `${fs}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(emoji, 100, 82);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    s.renderOrder = 8; s.visible = false; scene.add(s); return s;
  }
  const bub = (ch) => { if (!bubbles.has(ch)) bubbles.set(ch, bubbleSprite(ch)); return bubbles.get(ch); };
  const sprites = [];
  function canvasSprite(w, h, scale) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    s.renderOrder = 9; s.visible = false; s.scale.set(scale * (w / h), scale, 1); scene.add(s);
    const o = { s, ctx: c.getContext("2d"), tex: t, w, h, scale }; sprites.push(o); return o;
  }
  function hideAll() { for (const s of icons.values()) s.visible = false; for (const b of bubbles.values()) b.visible = false; for (const o of sprites) o.s.visible = false; for (const p of streams) p.pts.visible = false; }

  // every icon is kept inside the frame (pulled back in from the edges if its world spot is cropped) and kept big enough to read
  const _fp = V(0, 0, 0), _fw = V(0, 0, 0), _fd = V(0, 0, 0);
  function frameFit(p, size, { minH = 0.1, maxH = 0.3, top = 0.82, bottom = -0.45 } = {}) {
    const dist = Math.max(0.2, camera.position.distanceTo(p)), half = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const sz = Math.min(maxH * 2 * half, Math.max(minH * 2 * half, size));
    _fp.copy(p).project(camera);
    const hy = sz / (2 * half), hx = (sz / 2) / (half * camera.aspect);
    _fp.x = Math.min(0.94 - hx, Math.max(-0.94 + hx, _fp.x)); _fp.y = Math.min(top - hy, Math.max(bottom + hy, _fp.y));
    _fp.z = 0.5; _fp.unproject(camera);
    camera.getWorldDirection(_fw); _fd.copy(_fp).sub(camera.position).normalize();
    const depth = p.clone().sub(camera.position).dot(_fw);
    return { pos: camera.position.clone().addScaledVector(_fd, depth / Math.max(0.2, _fd.dot(_fw))), size: sz };
  }
  function showIcon(ch, pos, size, on, { bob = 0, t = 0, fit = {}, rot = 0 } = {}) {
    if (on <= 0.01) return;
    const s = ico(ch), f = frameFit(pos, size, fit);
    s.visible = true; s.position.copy(f.pos); s.position.y += bob * Math.sin(t * 5); s.material.rotation = rot;
    s.scale.setScalar(f.size * on); s.material.opacity = Math.min(1, on * 1.4);
  }
  function showBubble(ch, pos, size, on) {
    if (on <= 0.01) return;
    const s = bub(ch), f = frameFit(pos, size, { minH: 0.16, maxH: 0.34 });
    s.visible = true; s.position.copy(f.pos); s.scale.set(f.size * on, f.size * 0.9 * on, 1); s.material.opacity = Math.min(1, on * 1.5);
  }
  // a screen-anchored point: `right` / `up` in metres at distance `d` in front of the camera (so it can never be cropped)
  function inFront(d, right = 0, up = 0) {
    const fw = V(0, 0, 0); camera.getWorldDirection(fw);
    const upc = V(0, 1, 0).applyQuaternion(camera.quaternion), rtc = V(1, 0, 0).applyQuaternion(camera.quaternion);
    return camera.position.clone().addScaledVector(fw, d).addScaledVector(rtc, right).addScaledVector(upc, up);
  }
  function showCanvasSprite(o, pos, on, mul = 1) { if (on <= 0.01) return; o.s.visible = true; o.s.position.copy(pos); o.s.scale.set(o.scale * mul * (o.w / o.h) * on, o.scale * mul * on, 1); o.s.material.opacity = Math.min(1, on * 1.4); }

  // ---------- bursts and flights of emoji tied to times ----------
  const fxList = [];
  function burst(t0, center, n, { ch = "✨", dur = 1.3, spread = 0.5, rise = 0.9, size = 0.2, gap = 0.1, spin = 0 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = spread * (0.35 + 0.65 * ((i * 37) % 10) / 10);
      const from = center.clone().add(V(Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5));
      fxList.push({ s: emojiSprite(Array.isArray(ch) ? ch[i % ch.length] : ch), t0: t0 + i * gap, dur, from, to: from.clone().add(V(Math.cos(a) * r, rise, Math.sin(a) * r * 0.5)), size, spin: spin ? (i % 2 ? 1 : -1) * spin : 0 });
    }
  }
  function travel(t0, from, to, ch, { dur = 1.1, size = 0.28, arc = 0.5 } = {}) { fxList.push({ s: emojiSprite(ch), t0, dur, from, to, size, arc }); }
  function drawFx(t) {
    for (const f of fxList) {
      const u = (t - f.t0) / f.dur;
      if (u < 0 || u > 1) { f.s.visible = false; continue; }
      f.s.visible = true;
      f.s.position.lerpVectors(f.from, f.to, ease.inOut(u));
      if (f.arc) f.s.position.y += Math.sin(Math.PI * u) * f.arc;
      f.s.scale.setScalar(f.size * (0.7 + 0.3 * ease.out(Math.min(1, u * 3))));
      f.s.material.opacity = Math.min(1, Math.sin(Math.PI * u) * 2.2);
      if (f.spin) f.s.material.rotation = f.spin * u;
    }
  }

  // ---------- glowing particle streams (scent, oxytocin, light bridges) ----------
  const streams = [];
  function makeStream(n, color, size, { additive = true } = {}) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95, sizeAttenuation: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 6; pts.userData.ink = false; scene.add(pts);
    const o = { pts, n, color: new THREE.Color(color) }; streams.push(o); return o;
  }
  // fill a stream with points that run along curve(f) (f 0..1), each with its own phase; `shown` limits how many are visible
  const _c = new THREE.Color();
  function runStream(st, t, curve, { speed = 0.5, shown = st.n, spread = 0.03, hueFn = null, jitter = 1 } = {}) {
    const pos = st.pts.geometry.attributes.position, col = st.pts.geometry.attributes.color;
    st.pts.visible = shown > 0;
    for (let i = 0; i < st.n; i++) {
      if (i >= shown) { pos.setXYZ(i, 0, -500, 0); continue; }
      const f = (t * speed + i / st.n) % 1, p = curve(f, i);
      const j = ((i * 7919) % 100) / 100 - 0.5, j2 = ((i * 104729) % 97) / 97 - 0.5;
      pos.setXYZ(i, p.x + j * spread * jitter, p.y + j2 * spread * jitter, p.z + (j - j2) * spread * jitter);
      if (hueFn) _c.copy(hueFn(f, i)); else _c.copy(st.color);
      col.setXYZ(i, _c.r, _c.g, _c.b);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }

  return { emojiSprite, ico, bub, canvasSprite, hideAll, frameFit, showIcon, showBubble, showCanvasSprite, inFront, burst, travel, drawFx, makeStream, runStream };
}

// ---------- the cross-dissolve between shots: the old shot keeps moving, is drawn once more into a render target and faded out over the new one ----------
export function createDissolve({ renderer, scene, camera }) {
  const rt = new THREE.WebGLRenderTarget(1080, 1920, { type: THREE.HalfFloatType });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  veil.renderOrder = 1000; veil.frustumCulled = false; veil.visible = false; veil.userData.ink = false;
  camera.add(veil);
  const size = new THREE.Vector2();
  // STARTS: shot start times; half(i): half-length of the dissolve at the cut into shot i+1 (index i); apply(t, k): draw shot k at time t
  return function frame(t, STARTS, half, apply, shotOf) {
    let kOld = 0, alpha = 0;
    for (let i = 1; i < STARTS.length; i++) { const c0 = STARTS[i], h = half(i); if (t > c0 - h && t < c0 + h) { kOld = i; alpha = 1 - ease.inOut((t - (c0 - h)) / (2 * h)); } }
    const kNew = kOld ? kOld + 1 : shotOf(t);
    veil.visible = false;
    if (kOld && alpha > 0.003) {
      renderer.getDrawingBufferSize(size);
      if (rt.width !== size.x || rt.height !== size.y) rt.setSize(size.x, size.y);
      apply(t, kOld);
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
    }
    apply(t, kNew);
    if (kOld && alpha > 0.003) {
      veil.visible = true; veil.material.opacity = alpha;
      const h = 2 * 0.12 * Math.tan((camera.fov * Math.PI) / 360);
      veil.position.set(0, 0, -0.12); veil.scale.set(h * camera.aspect, h, 1);
    }
  };
}

// ---------- a gradient sky dome you can recolour per shot: set(top, mid, low) with CSS colours ----------
export function makeDome(radius = 420) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 256;
  const ctx = c.getContext("2d"), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  mesh.renderOrder = -20; mesh.frustumCulled = false; mesh.userData.ink = false;
  return { mesh, set(top, mid, low) { const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(0.36, mid); g.addColorStop(0.5, low); g.addColorStop(1, low); ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256); tex.needsUpdate = true; } };
}
