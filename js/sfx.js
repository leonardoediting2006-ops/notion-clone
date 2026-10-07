// Sound effects on the timeline: a cue sheet that plays live in the preview and is
// mixed sample-accurately by tools/render.mjs (together with the voiceover).
//
//   import { createSfx } from "../../js/sfx.js";
//   const sfx = createSfx(short);
//   sfx.add(2.3, "door_creak", { gain: 0.6 });                  // one-shot at 2.3 s
//   sfx.add(4.0, "growl", { rate: 0.9, pan: -0.3 });             // slower/lower, a bit left
//   sfx.loop(9.5, 17.4, "forest_dusk", { gain: 0.4, fadeIn: 0.3 }); // ambience bed
//
// Sounds are looked up by name, first in the short's own sfx/ folder (so a short can
// override any sound), then in assets/sfx/. Any of .wav .mp3 .ogg .flac works.
// A voiceover file (voiceover.wav/.mp3/.m4a) in the short's folder plays in the preview
// and is mixed into renders automatically.

const LIB = new URL("../assets/sfx/", import.meta.url).href;
const EXTS = ["wav", "mp3", "ogg", "flac", "m4a"];
const isRender = new URLSearchParams(location.search).has("render");

export function createSfx(short, { voiceover = "voiceover", voiceGain = 1 } = {}) {
  const cues = [];
  const urls = new Map(); // name -> resolved URL (or null)

  async function exists(url) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      return r.ok;
    } catch {
      return false;
    }
  }
  async function resolve(name, dirs) {
    for (const dir of dirs) for (const ext of EXTS) {
      const u = new URL(`${name}.${ext}`, dir).href;
      if (await exists(u)) return u;
    }
    return null;
  }
  const local = new URL("sfx/", location.href).href;

  const sfx = {
    cues,
    // one-shot. gain: linear (0.5 ≈ -6 dB), rate: playback speed (also pitch), pan: -1..1,
    // offset: start this far into the file, dur: cut after this many seconds
    add(t, name, { gain = 1, rate = 1, pan = 0, offset = 0, dur = null, fadeIn = 0, fadeOut = 0.02 } = {}) {
      cues.push({ t, name, gain, rate, pan, offset, dur, fadeIn, fadeOut, loop: false });
      return sfx;
    },
    // looped bed from t0 to t1
    loop(t0, t1, name, { gain = 1, rate = 1, pan = 0, fadeIn = 0.15, fadeOut = 0.15 } = {}) {
      cues.push({ t: t0, name, gain, rate, pan, offset: 0, dur: t1 - t0, fadeIn, fadeOut, loop: true });
      return sfx;
    },
    // several hits with a random-but-repeatable variant/gain/pitch each, e.g. footsteps
    steps(times, names, { gain = 1, jitter = 0.15, pan = 0 } = {}) {
      times.forEach((t, i) => {
        const r = Math.sin(i * 12.9898 + t * 78.233) * 43758.5453;
        const k = r - Math.floor(r);
        sfx.add(t, names[i % names.length], { gain: gain * (1 - jitter / 2 + k * jitter), rate: 1 - jitter / 4 + k * jitter / 2, pan });
      });
      return sfx;
    },
  };

  // resolve every sound before the first frame (render waits for this)
  short.track((async () => {
    await new Promise((r) => setTimeout(r, 0)); // let the short add its cues first
    for (const name of new Set(cues.map((c) => c.name))) {
      urls.set(name, await resolve(name, [local, LIB]));
      if (!urls.get(name)) console.warn(`sfx: no file for "${name}" (looked in sfx/ and assets/sfx/)`);
    }
    const voice = await resolve(voiceover, [new URL("./", location.href).href]);
    if (voice) cues.push({ t: 0, name: voiceover, gain: voiceGain, rate: 1, pan: 0, offset: 0, dur: null, fadeIn: 0, fadeOut: 0, loop: false, voice: true }), urls.set(voiceover, voice);
    // for tools/render.mjs
    window.__sfx = cues.filter((c) => urls.get(c.name)).map((c) => ({ ...c, url: urls.get(c.name) }));
  })());

  if (!isRender) preview(short, cues, urls);
  return sfx;
}

// ---- live playback in the browser preview (Web Audio), following the timeline
function preview(short, cues, urls) {
  const ctx = new AudioContext();
  const buffers = new Map();
  const playing = new Set();
  const unlock = () => ctx.state === "suspended" && ctx.resume();
  addEventListener("pointerdown", unlock);
  addEventListener("keydown", unlock);

  async function load(name) {
    if (buffers.has(name)) return buffers.get(name);
    const p = fetch(urls.get(name)).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).catch(() => null);
    buffers.set(name, p);
    return p;
  }
  async function start(c, into) {
    const b = await load(c.name);
    if (!b) return;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = c.rate;
    src.loop = c.loop;
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan;
    src.connect(g).connect(pan).connect(ctx.destination);
    const now = ctx.currentTime;
    const end = c.dur ?? (b.duration - c.offset) / c.rate;
    g.gain.setValueAtTime(c.fadeIn && into < c.fadeIn ? 0 : c.gain, now);
    if (c.fadeIn && into < c.fadeIn) g.gain.linearRampToValueAtTime(c.gain, now + c.fadeIn - into);
    if (c.fadeOut) {
      g.gain.setValueAtTime(c.gain, now + Math.max(0, end - into - c.fadeOut));
      g.gain.linearRampToValueAtTime(0, now + Math.max(0, end - into));
    }
    const off = c.loop ? (into * c.rate) % b.duration : c.offset + into * c.rate;
    src.start(now, off);
    if (c.dur) src.stop(now + Math.max(0, c.dur - into));
    playing.add(src);
    src.onended = () => playing.delete(src);
  }
  const stopAll = () => {
    for (const s of playing) try { s.stop(); } catch {}
    playing.clear();
  };

  let last = -1, still = 0;
  short.onUpdate((t) => {
    if (!window.__sfx) return; // still resolving
    if (t === last) {
      if (++still === 2) stopAll(); // paused
      return;
    }
    const jumped = t < last || t - last > 0.25;
    if (jumped || still >= 2) {
      // scrubbed / restarted / resumed: restart whatever should be sounding now
      stopAll();
      for (const c of window.__sfx) {
        const len = c.dur ?? 1e9;
        if (c.t <= t && t < c.t + len && (c.loop || c.voice || t - c.t < 0.15)) start(c, t - c.t);
      }
    } else {
      for (const c of window.__sfx) if (c.t > last && c.t <= t) start(c, t - c.t);
    }
    still = 0;
    last = t;
  });
}
