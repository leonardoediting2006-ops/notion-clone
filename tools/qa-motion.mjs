// Motion QA for a short: steps through every frame WITHOUT rendering, asks the short for a snapshot of everything that moves
// (window.__qa(t) -> { name: [numbers] }), and flags pops (a jump between two frames), jerks (a sudden change of speed) and flicker
// (visibility toggling). Cut frames are skipped. Usage:
//   node tools/qa-motion.mjs shorts/dog-kibble [--port 5470] [--from 0] [--to 36] [--top 40]
// A short opts in by defining window.__qa (see shorts/dog-kibble/main.js).
import { chromium } from "playwright";
import { startServer } from "./server.mjs";
import { parseArgs } from "node:util";

const { values: o, positionals } = parseArgs({ allowPositionals: true, options: { port: { type: "string", default: "5470" }, from: { type: "string" }, to: { type: "string" }, top: { type: "string", default: "40" }, step: { type: "string", default: "1" }, cpu: { type: "boolean", default: true } } });
const dir = positionals[0]?.replace(/\/+$/, "");
if (!dir) { console.error("usage: node tools/qa-motion.mjs shorts/<name>"); process.exit(1); }
const server = await startServer(Number(o.port));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  await page.goto(`http://localhost:${o.port}/${dir}/?render`, { waitUntil: "domcontentloaded", timeout: 600000 });
  await page.waitForFunction(() => window.__shortReady === true && typeof window.__qa === "function", null, { timeout: 600000 });
  const { fps, duration, cuts } = await page.evaluate(() => ({ fps: window.__qa.fps, duration: window.__qa.duration, cuts: window.__qa.cuts }));
  const t0 = o.from ? Number(o.from) : 0, t1 = o.to ? Number(o.to) : duration - 1 / fps;
  const STEP = Math.max(1, Number(o.step)), dt = STEP / fps;                  // --step 2 samples every 2nd frame (twice as fast; thresholds scale with the step)
  const frames = [];
  for (let t = t0; t <= t1 + 1e-9; t += dt) frames.push(await page.evaluate((t) => window.__qa(t), t));
  const isCut = (i) => cuts.some((c) => { const f = Math.round((c - t0) / dt); return Math.abs(i - f) <= 1; });
  const flags = [];
  const keys = Object.keys(frames[0]);
  const dist = (a, b, n) => Math.hypot(...a.slice(0, n).map((v, i) => v - b[i]));
  // thresholds per channel: [per-frame jump, per-frame^2 jerk]
  const TH = { cam: [0.035, 0.012], aim: [0.02, 0.008], fov: [0.8, 0.5], dog: [0.07, 0.03], dogry: [0.09, 0.05], head: [0.07, 0.04], mouth: [0.09, 0.05], wolf: [0.08, 0.05], hand: [0.08, 0.05], light: [0.12, 0.1] };
  for (const k of keys) {
    const n = frames[0][k].length;
    for (let i = 1; i < frames.length; i++) {
      if (isCut(i)) continue;
      const a = frames[i - 1][k], b = frames[i][k];
      if (/^(dogvis|ownervis|wolfvis|handvis|fan|blind|ownerFan|shield|arrow)$/.test(k)) { if (a[0] !== b[0] && (k !== "ownervis" && k !== "dogvis")) flags.push({ t: t0 + i * dt, k, kind: "toggle", v: `${a[0]}->${b[0]}`, score: 5 }); continue; }
      if (/^p\d+$/.test(k)) {                       // a kibble piece: a visibility toggle while it is in view, or a jump
        if (a[3] !== b[3]) flags.push({ t: t0 + i * dt, k, kind: "toggle", v: `${a[3]}->${b[3]} @(${b.slice(0, 3).map((x) => x.toFixed(2))})`, score: 3 });
        else if (a[3] && dist(a, b, 3) > 0.07 * STEP) flags.push({ t: t0 + i * dt, k, kind: "jump", v: dist(a, b, 3).toFixed(3), score: dist(a, b, 3) / 0.07 });
        continue;
      }
      const th = TH[k] && [TH[k][0] * STEP, TH[k][1] * STEP * STEP]; if (!th) continue;
      const d = dist(a, b, n); if (d > th[0]) flags.push({ t: t0 + i * dt, k, kind: "jump", v: d.toFixed(3), score: d / th[0] });
      if (i > 1 && !isCut(i - 1)) { const p = frames[i - 2][k]; const acc = Math.hypot(...b.map((v, j) => v - 2 * a[j] + p[j])); if (acc > th[1]) flags.push({ t: t0 + i * dt, k, kind: "jerk", v: acc.toFixed(3), score: acc / th[1] }); }
    }
  }
  // merge flags of the same channel within 0.1 s
  flags.sort((x, y) => x.k.localeCompare(y.k) || x.t - y.t);
  const merged = [];
  for (const f of flags) { const m = merged.find((g) => g.k === f.k && g.kind === f.kind && f.t - g.t1 < 0.1); if (m) { m.t1 = f.t; m.n++; if (f.score > m.score) { m.score = f.score; m.v = f.v; } } else merged.push({ ...f, t1: f.t, n: 1 }); }
  merged.sort((x, y) => y.score - x.score);
  console.log(`${dir}: ${frames.length} frames, ${cuts.length} cuts; ${merged.length} issue(s)`);
  for (const f of merged.slice(0, Number(o.top))) console.log(`  ${f.t.toFixed(2)}${f.t1 > f.t ? "–" + f.t1.toFixed(2) : ""}s  ${f.k.padEnd(9)} ${f.kind.padEnd(6)} ${String(f.v).padEnd(26)} x${f.n}  score ${f.score.toFixed(1)}`);
  if (!merged.length) console.log("  clean: no pops, jerks or flicker above the thresholds");
} finally { await browser.close(); server.close(); }
