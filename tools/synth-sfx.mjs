// Generates the code-built (procedural) sound effects into assets/sfx/*.wav.
//
//   node tools/synth-sfx.mjs            (re-run any time; output is deterministic)
//
// Foley (dog paws, tail thumps, bush rustles, water) and ambience beds are synthesised here.
// Dog vocals (whimper, sigh, yawn, growl, sniff, pant, lapping) are synthesised stand-ins:
// for the most realistic result drop real recordings over them with the same file names
// (see assets/sfx/README.md). Human footsteps are real recordings (Kenney, MIT).

import { writeFileSync, mkdirSync } from "node:fs";

const SR = 48000;
const OUT = new URL("../assets/sfx/", import.meta.url);
mkdirSync(OUT, { recursive: true });

let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));

// RBJ biquad, coefficients may be updated per sample (pass a function of i)
function biquad(x, type, freq, q = 0.707) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof freq === "function" ? freq(i / SR) : freq;
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === "lp") [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // band-pass
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}
const lp = (x, f, q) => biquad(x, "lp", f, q);
const hp = (x, f, q) => biquad(x, "hp", f, q);
const bp = (x, f, q) => biquad(x, "bp", f, q);
function env(x, fn) {
  for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR, i / x.length);
  return x;
}
function mixInto(dst, src, at = 0, gain = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain;
  return dst;
}
const white = (sec) => buf(sec).map(noise);
// attack/decay envelope (seconds)
const ad = (a, d) => (t) => (t < a ? t / a : Math.exp(-(t - a) / d));
// sine/saw oscillator with a frequency function, returns phase-continuous signal
function osc(sec, freq, shape = "sin") {
  const x = buf(sec);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    ph += freq(i / SR) / SR;
    const p = ph % 1;
    x[i] = shape === "saw" ? 2 * p - 1 : shape === "tri" ? 1 - 4 * Math.abs(p - 0.5) : Math.sin(2 * Math.PI * ph);
  }
  return x;
}
function normalize(x, peak = 0.89) {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}
function fadeEdges(x, inS = 0.003, outS = 0.02) {
  const a = Math.round(inS * SR), b = Math.round(outS * SR);
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a;
  for (let i = 0; i < b && i < x.length; i++) x[x.length - 1 - i] *= i / b;
  return x;
}
function save(name, x, peak = 0.89) {
  fadeEdges(normalize(x, peak));
  const data = Buffer.alloc(44 + x.length * 2);
  data.write("RIFF", 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write("WAVE", 8);
  data.write("fmt ", 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write("data", 36); data.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) => data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  writeFileSync(new URL(`${name}.wav`, OUT), data);
  console.log(`${name}.wav  ${(x.length / SR).toFixed(2)}s`);
}

// ---------------------------------------------------------------- foley
// dog claws ticking on a hard floor (one paw)
for (let v = 1; v <= 3; v++) {
  const x = buf(0.09);
  mixInto(x, env(hp(white(0.02), 3500 + v * 400), ad(0.0005, 0.004)), 0, 1);
  mixInto(x, env(hp(white(0.02), 2500), ad(0.0005, 0.003)), 0.012 + v * 0.004, 0.6); // second nail
  mixInto(x, env(lp(white(0.08), 300), ad(0.002, 0.015)), 0, 0.7); // soft pad thump
  save(`paw_${v}`, x, 0.7);
}
// tail thumping on a sofa / floor
{
  const x = env(osc(0.25, (t) => 90 - t * 120), ad(0.002, 0.05));
  mixInto(x, env(lp(white(0.25), 700), ad(0.002, 0.03)), 0, 0.8);
  save("thump", x);
}
// body flopping onto cushions
{
  const x = env(lp(white(0.5), 400), ad(0.005, 0.09));
  mixInto(x, env(osc(0.3, (t) => 70 - t * 60), ad(0.003, 0.08)), 0, 0.8);
  save("flop", x);
}
// leaves / bush rustle
{
  const x = buf(1.1);
  for (let g = 0; g < 70; g++) {
    const at = rnd() * 0.95, len = 0.02 + rnd() * 0.06;
    mixInto(x, env(bp(white(len), 2500 + rnd() * 4000, 1.2), ad(0.003, len * 0.4)), at, 0.4 + rnd() * 0.6);
  }
  save("rustle", env(x, (t) => Math.sin(Math.min(1, t / 1.1) * Math.PI) ** 0.6));
}
// dog lapping water: wet "blop" + splatter
for (let v = 1; v <= 2; v++) {
  const x = buf(0.22);
  const f0 = 350 + v * 90;
  mixInto(x, env(osc(0.08, (t) => f0 + t * 9000), ad(0.002, 0.018)), 0.01, 0.8);
  mixInto(x, env(bp(white(0.2), 1800, 0.8), ad(0.004, 0.04)), 0, 0.5);
  for (let d = 0; d < 6; d++) mixInto(x, env(hp(white(0.015), 3000), ad(0.001, 0.004)), 0.03 + rnd() * 0.12, 0.25);
  save(`lap_${v}`, x, 0.75);
}
// splashing water on your face
{
  const x = env(lp(white(0.7), (t) => 5000 - t * 5000), ad(0.01, 0.2));
  for (let d = 0; d < 30; d++) mixInto(x, env(osc(0.03, (t) => 800 + rnd() * 1500 + t * 6000), ad(0.001, 0.008)), 0.05 + rnd() * 0.4, 0.15);
  save("splash", x);
}

// ---------------------------------------------------------------- ambiences
// tap running into a sink (loop)
{
  const x = bp(white(6), 1400, 0.5);
  for (let d = 0; d < 600; d++) mixInto(x, env(osc(0.02, (t) => 1500 + rnd() * 2500 + t * 20000), ad(0.001, 0.006)), rnd() * 5.9, 0.12);
  save("tap_water", env(x, (t) => 0.85 + 0.15 * Math.sin(t * 23)));
}
// quiet indoor room tone
save("room_tone", lp(white(12), 350), 0.25);
// dusk forest: soft wind + crickets
{
  const wind = env(lp(white(10), (t) => 300 + 200 * Math.sin(t * 0.7)), (t) => 0.6 + 0.4 * Math.sin(t * 0.9 + 1));
  const x = wind;
  for (let c = 0; c < 2; c++) {
    const f = 4300 + c * 600;
    let t = c * 0.13;
    while (t < 9.8) {
      for (let p = 0; p < 3; p++) mixInto(x, env(osc(0.018, () => f), ad(0.002, 0.006)), t + p * 0.025, 0.05);
      t += 0.42 + rnd() * 0.15;
    }
  }
  save("forest_dusk", x, 0.35);
}


// ---------------------------------------------------------------- dog vocals (stand-ins)
// voiced sound: harmonics of f0(t) through two formants + breath
function voice(sec, f0, { formants = [900, 2400], breath = 0.3, vib = 6, vibAmt = 0.02, harmonics = 8 } = {}) {
  const src = buf(sec);
  for (let h = 1; h <= harmonics; h++) {
    const o = osc(sec, (t) => f0(t) * h * (1 + vibAmt * Math.sin(2 * Math.PI * vib * t)));
    for (let i = 0; i < src.length; i++) src[i] += o[i] / h;
  }
  const n = white(sec);
  for (let i = 0; i < src.length; i++) src[i] += n[i] * breath;
  const out = buf(sec);
  for (const f of formants) mixInto(out, bp(src, f, 4), 0, 1);
  return out;
}
// high-pitched whimper / whine
save("whimper", env(voice(0.75, (t) => 900 + 350 * Math.sin(Math.min(1, t / 0.75) * Math.PI) - t * 200, { formants: [1100, 2600], breath: 0.15, vib: 9, vibAmt: 0.03 }), (t, p) => Math.sin(p * Math.PI) ** 0.7));
// sigh: breathy exhale through the nose
{
  const x = env(bp(white(0.9), (t) => 1400 - t * 900, 1.2), (t, p) => (p < 0.15 ? p / 0.15 : (1 - p) ** 1.4));
  mixInto(x, env(voice(0.5, (t) => 420 - t * 120, { formants: [700, 1800], breath: 0.6, harmonics: 4 }), (t, p) => Math.sin(p * Math.PI)), 0.1, 0.25);
  save("sigh", x, 0.7);
}
// yawn: squeaky rise then a long falling "aawoo"
save("yawn", env(voice(1.1, (t) => (t < 0.35 ? 500 + t * 2600 : 1410 - (t - 0.35) * 1100), { formants: [800, 2000], breath: 0.35, vib: 5, vibAmt: 0.015 }), (t, p) => Math.sin(Math.min(1, p * 1.2) * Math.PI) ** 0.8));
// low growl / snarl
{
  const x = voice(0.9, (t) => 85 + 12 * Math.sin(t * 7), { formants: [350, 900], breath: 0.6, harmonics: 14, vib: 23, vibAmt: 0.08 });
  save("growl", env(x, (t, p) => (0.6 + 0.4 * Math.abs(Math.sin(t * 26))) * Math.min(1, p * 8, (1 - p) * 5)));
  const y = voice(0.6, (t) => 120 + 30 * Math.sin(t * 9), { formants: [500, 1300], breath: 0.9, harmonics: 12, vib: 31, vibAmt: 0.12 });
  save("snarl", env(y, (t, p) => Math.min(1, p * 15, (1 - p) * 4)));
}
// sniffing: three quick nasal inhales
{
  const x = buf(0.6);
  for (let s = 0; s < 3; s++) mixInto(x, env(bp(white(0.09), 3200 + s * 300, 1.5), (t, p) => Math.sin(p * Math.PI)), s * 0.15, 1);
  save("sniff", x, 0.7);
}
// happy panting loop
{
  const x = buf(2);
  for (let k = 0; k < 2 / 0.2; k++) {
    mixInto(x, env(bp(white(0.11), k % 2 ? 1700 : 1200, 1.4), (t, p) => Math.sin(p * Math.PI) ** 1.3), k * 0.2, k % 2 ? 0.7 : 1);
  }
  save("pant", x, 0.6);
}

// rubber squeaky toy: a whistle that swoops up and down as the air squeezes out
{
  const x = voice(0.32, (t) => 1500 + 900 * Math.sin(Math.min(1, t / 0.32) * Math.PI) - t * 900, { formants: [2200, 3600], breath: 0.25, vib: 30, vibAmt: 0.02, harmonics: 5 });
  save("squeak", env(x, (t, p) => Math.min(1, p * 12) * (1 - p) ** 0.6));
}

// ---------------------------------------------------------------- winter + night (dog-leash)
// (appended last so the sounds above keep their exact random sequence)
// winter wind: gusty, howling band-passed noise (loop)
{
  const sec = 12, x = buf(sec);
  const gust = (t) => 0.55 + 0.3 * Math.sin(t * 0.7) + 0.15 * Math.sin(t * 1.9 + 1);
  mixInto(x, env(lp(white(sec), 500), (t) => gust(t)), 0, 1);
  mixInto(x, env(bp(white(sec), (t) => 520 + 260 * Math.sin(t * 0.55) + 90 * Math.sin(t * 1.7), 9), (t) => gust(t) ** 2), 0, 0.9);
  mixInto(x, env(bp(white(sec), (t) => 1100 + 300 * Math.sin(t * 0.43 + 2), 12), (t) => gust(t + 3) ** 3), 0, 0.35);
  save("winter_wind", x, 0.7);
}
// footsteps in snow: a soft squeaky crunch
for (let k = 1; k <= 3; k++) {
  const x = buf(0.32);
  for (let g = 0; g < 26; g++) mixInto(x, env(bp(white(0.012), 1800 + rnd() * 2500, 2), ad(0.001, 0.004)), 0.02 + rnd() * 0.18, 0.4 + rnd() * 0.6);
  mixInto(x, env(lp(white(0.25), 600), (t, p) => Math.min(1, t / 0.02) * (1 - p) ** 2), 0, 0.8);
  save(`snow_step_${k}`, x, 0.75);
}
// car engine idling (loop) and pulling away (rev up, then fading into the distance)
{
  const sec = 4;
  const rumble = (f, sec) => {
    const x = osc(sec, f, "saw");
    const y = lp(x, 260, 1.5);
    mixInto(y, lp(white(sec), 180), 0, 0.25);
    return y;
  };
  save("engine_idle", env(rumble(() => 32, sec), (t) => 0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 7.5)), 0.6);
  const away = rumble((t) => 32 + 40 * Math.min(1, t / 1.2) - Math.max(0, t - 1.6) * 6, 5);
  save("car_away", env(lp(away, 900), (t) => Math.min(1, t / 0.1) * Math.exp(-Math.max(0, t - 1.2) * 0.9)), 0.7);
}
// car door shutting: dull body thud + latch click
{
  const x = env(lp(white(0.4), 160), ad(0.002, 0.07));
  mixInto(x, env(osc(0.3, () => 58), ad(0.002, 0.09)), 0, 0.8);
  mixInto(x, env(bp(white(0.03), 3200, 3), ad(0.0005, 0.006)), 0.01, 0.35);
  save("car_door", x, 0.8);
}
// hallway clock: tick ... tock (1 s loop)
{
  const x = buf(1);
  mixInto(x, env(bp(white(0.02), 4200, 6), ad(0.0005, 0.004)), 0, 1);
  mixInto(x, env(bp(white(0.02), 3300, 6), ad(0.0005, 0.004)), 0.5, 0.8);
  save("clock_tick", x, 0.5);
}
// clothes rustling as someone sits down
save("cloth", env(bp(white(0.8), (t) => 1500 + 900 * Math.sin(t * 9), 0.8), (t, p) => Math.sin(p * Math.PI) * (0.6 + 0.4 * Math.abs(Math.sin(t * 13)))), 0.5);
// long, lonely whine (abandoned)
save("whine", env(voice(1.6, (t) => 1050 + 260 * Math.sin(Math.min(1, t / 1.6) * Math.PI * 1.5) - t * 160, { formants: [1200, 2800], breath: 0.12, vib: 6, vibAmt: 0.025 }), (t, p) => Math.min(1, p * 6) * (1 - p) ** 0.8));
