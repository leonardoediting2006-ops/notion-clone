// Mixes a short's sound cue sheet (window.__sfx, see js/sfx.js) into one stereo WAV,
// sample-accurately: every cue lands on its exact timeline time.
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000;
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function run(args, input) {
  return new Promise((ok, fail) => {
    const p = spawn("ffmpeg", args, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    const chunks = [];
    let err = "";
    p.stdout.on("data", (d) => chunks.push(d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", fail);
    p.on("close", (code) => (code === 0 ? ok(Buffer.concat(chunks)) : fail(new Error(`ffmpeg: ${err.slice(-400)}`))));
    if (input) p.stdin.end(input);
  });
}
async function decode(file) {
  const raw = await run(["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"]);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}
// http://localhost:port/assets/sfx/x.wav → <repo>/assets/sfx/x.wav ; plain paths pass through
const toPath = (url) => (/^https?:/.test(url) ? join(ROOT, decodeURIComponent(new URL(url).pathname)) : url);

// opts.gain scales the sound effects as a whole (not the voice).
// opts.duck = { depth, attack, release, threshold }: the sound effects are lowered while the voiceover speaks (a sidechain
// ducker: the voice's level decides how far the effects dip, with a quick attack and a slower release so it never pumps).
export async function mixCues(cues, duration, outFile, opts = {}) {
  const n = Math.ceil(duration * SR);
  const L = new Float32Array(n), R = new Float32Array(n);   // sound effects
  const VL = new Float32Array(n), VR = new Float32Array(n); // voiceover
  const cache = new Map();
  for (const c of cues) {
    const path = toPath(c.url);
    if (!cache.has(path)) cache.set(path, await decode(path));
    const src = cache.get(path);
    if (!src.length) continue;
    const rate = c.rate ?? 1, gain = c.gain ?? 1;
    const pan = Math.max(-1, Math.min(1, c.pan ?? 0));
    const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
    const panNorm = Math.SQRT2; // equal-power pan, unity in the centre
    const start = Math.round(c.t * SR);
    const len = c.dur != null ? Math.round(c.dur * SR) : Math.floor((src.length - (c.offset ?? 0) * SR) / rate);
    const fi = (c.fadeIn ?? 0) * SR, fo = (c.fadeOut ?? 0) * SR;
    for (let i = 0; i < len; i++) {
      const o = start + i;
      if (o < 0) continue;
      if (o >= n) break;
      let p = (c.offset ?? 0) * SR + i * rate;
      if (c.loop) p %= src.length;
      else if (p >= src.length - 1) break;
      const k = Math.floor(p), f = p - k;
      let v = src[k] * (1 - f) + src[(k + 1) % src.length] * f;
      let g = gain;
      if (fi && i < fi) g *= i / fi;
      if (fo && i > len - fo) g *= Math.max(0, (len - i) / fo);
      v *= g;
      if (c.voice) { VL[o] += v * gl * panNorm; VR[o] += v * gr * panNorm; }
      else { L[o] += v * gl * panNorm; R[o] += v * gr * panNorm; }
    }
  }
  // ducking: follow the voice's level (10 ms RMS), turn it into 0..1 and smooth it (fast attack, slow release)
  let duck = null;
  if (opts.duck && cues.some((c) => c.voice)) {
    const { depth = 0.4, attack = 0.015, release = 0.25, threshold = -42 } = opts.duck;
    const win = Math.round(0.01 * SR), thr = 10 ** (threshold / 20);
    const aA = Math.exp(-1 / (attack * SR)), aR = Math.exp(-1 / (release * SR));
    duck = new Float32Array(n);
    let sq = 0, s = 0;
    const ring = new Float32Array(win);
    for (let i = 0; i < n; i++) {
      const v = 0.5 * (VL[i] + VR[i]);
      sq += v * v - ring[i % win]; ring[i % win] = v * v;
      const rms = Math.sqrt(Math.max(0, sq) / win);
      const target = Math.min(1, Math.max(0, (rms / thr - 1) / 3)); // 0 below the threshold, 1 from ~12 dB above it
      s = target > s ? target + (s - target) * aA : target + (s - target) * aR;
      duck[i] = 1 - depth * s;
    }
  }
  const inter = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const g = (duck ? duck[i] : 1) * (opts.gain ?? 1);
    inter[i * 2] = L[i] * g + VL[i];
    inter[i * 2 + 1] = R[i] * g + VR[i];
  }
  // brick-wall limiter so a loud moment never clips
  await run(["-v", "error", "-y", "-f", "f32le", "-ar", String(SR), "-ac", "2", "-i", "-",
    "-af", "alimiter=limit=0.89:level=false", "-c:a", "pcm_s16le", outFile], Buffer.from(inter.buffer));
  return outFile;
}
