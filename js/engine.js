// Shared engine for every short: Three.js scene + one GSAP master timeline.
//
// All motion must live on `tl` (GSAP tweens) or in `onUpdate(t => ...)`
// callbacks that only use the timeline time `t`. That makes every frame
// reproducible, so tools/render.mjs can seek to any frame and export an MP4.

import * as THREE from "../lib/three.module.min.js";

const gsap = window.gsap; // loaded globally from lib/gsap.min.js

export { THREE, gsap };

export const WIDTH = 1080;
export const HEIGHT = 1920;

const isRender = new URLSearchParams(location.search).has("render");

export function createShort({
  duration,             // seconds (YouTube Shorts: 60s max)
  fps = 30,
  background = "#0b0b14",
  fov = 50,
  cameraZ = 8,
  lights = true,
} = {}) {
  if (!duration) throw new Error("createShort: `duration` (seconds) is required");

  const stage = document.getElementById("stage");
  const canvas = document.createElement("canvas");
  stage.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(fov, WIDTH / HEIGHT, 0.1, 1000);
  camera.position.set(0, 0, cameraZ);

  if (lights) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x7c5cff, 40);
    rim.position.set(-4, -2, 3);
    scene.add(rim);
  }

  const tl = gsap.timeline({ paused: true });
  // Pad the timeline so it is always exactly `duration` long.
  tl.set({}, {}, duration);

  const updaters = [];
  const onUpdate = (fn) => updaters.push(fn);

  function render() {
    const t = tl.time();
    for (const fn of updaters) fn(t);
    renderer.render(scene, camera);
  }

  function start() {
    // Exposed for tools/render.mjs
    window.__short = {
      fps,
      duration,
      frames: Math.round(duration * fps),
      seek(t) {
        tl.seek(t, false);
        render();
      },
    };

    if (isRender) {
      document.body.classList.add("render");
      window.__short.seek(0);
      window.__shortReady = true;
      return;
    }

    setupPreview({ stage, tl, render, duration });
    window.__shortReady = true;
  }

  return { THREE, gsap, scene, camera, renderer, tl, stage, onUpdate, start, duration, fps };
}

// Split a caption element into <span class="word"> pieces so GSAP can stagger them.
// Inline elements (e.g. <span class="hl">) are kept and treated as one word.
export function splitWords(el) {
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) frag.append(" ");
        else {
          const w = document.createElement("span");
          w.className = "word";
          w.textContent = part;
          frag.append(w);
        }
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.classList.add("word");
    }
  }
  return el.querySelectorAll(".word");
}

function setupPreview({ stage, tl, render, duration }) {
  // Scale the 1080x1920 stage to fit the window.
  const viewport = document.getElementById("viewport");
  const fit = () => {
    const s = Math.min(viewport.clientWidth / WIDTH, viewport.clientHeight / HEIGHT);
    stage.style.transform = `scale(${s})`;
    stage.style.margin = `${(HEIGHT * s - HEIGHT) / 2}px ${(WIDTH * s - WIDTH) / 2}px`;
  };
  addEventListener("resize", fit);
  fit();

  const safe = document.createElement("div");
  safe.className = "safe-zone";
  stage.append(safe);

  const controls = document.createElement("div");
  controls.id = "controls";
  controls.innerHTML = `
    <button data-act="play">Pause</button>
    <button data-act="restart">Restart</button>
    <input type="range" min="0" max="${duration}" step="0.001" value="0" aria-label="Timeline">
    <span class="time">0.00 / ${duration.toFixed(2)}s</span>
    <span class="hint">Space: play/pause · ←/→: step · S: safe zone · L: loop</span>`;
  document.body.append(controls);

  const playBtn = controls.querySelector('[data-act="play"]');
  const scrub = controls.querySelector("input");
  const time = controls.querySelector(".time");
  let loop = true;

  const sync = () => {
    playBtn.textContent = tl.paused() ? "Play" : "Pause";
    scrub.value = tl.time();
    time.textContent = `${tl.time().toFixed(2)} / ${duration.toFixed(2)}s`;
  };
  const toggle = () => {
    if (tl.progress() >= 1) tl.restart();
    else tl.paused(!tl.paused());
  };

  tl.eventCallback("onComplete", () => loop && tl.restart());
  playBtn.onclick = toggle;
  controls.querySelector('[data-act="restart"]').onclick = () => tl.restart();
  scrub.oninput = () => tl.pause().seek(+scrub.value, false);

  addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    if (e.code === "ArrowRight") tl.pause().seek(Math.min(duration, tl.time() + 1 / 30), false);
    if (e.code === "ArrowLeft") tl.pause().seek(Math.max(0, tl.time() - 1 / 30), false);
    if (e.code === "KeyS") safe.classList.toggle("on");
    if (e.code === "KeyL") loop = !loop;
  });

  gsap.ticker.add(() => { render(); sync(); });
  tl.play(0);
}
