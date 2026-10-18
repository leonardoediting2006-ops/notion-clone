// Render a range of frames of a short to numbered JPEGs, so several workers (or machines) can share one render.
//
//   node tools/render-frames.mjs shorts/dog-welcome --from 0 --to 531 --dir out/frames --port 5350 [--cpu]
//   node tools/render-frames.mjs shorts/dog-welcome --probe        → prints which WebGL renderer Chromium got
//
// Frames already on disk are skipped, so an interrupted render can simply be started again. Join them with
//   ffmpeg -framerate 60 -i out/frames/%05d.jpg -i out/dog-welcome-audio.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac out/dog-welcome.mp4
// (`node tools/render.mjs shorts/dog-welcome --audio-only` mixes the soundtrack WAV.)
import { access, mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { startServer } from "./server.mjs";

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: "string", default: "0" },
    to: { type: "string" },
    dir: { type: "string", default: "out/frames" },
    port: { type: "string", default: "5350" },
    cpu: { type: "boolean", default: false },
    probe: { type: "boolean", default: false },
    gl: { type: "string" }, // "vulkan" | "egl" | "angle" | "swiftshader": force one graphics backend
  },
});
const shortDir = positionals[0]?.replace(/\/+$/, "");
if (!shortDir) throw new Error("Usage: node tools/render-frames.mjs shorts/<name> --from N --to M --dir out/frames");

const BACKENDS = {
  vulkan: ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-vulkan-surface", "--ignore-gpu-blocklist"],
  egl: ["--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist"],
  angle: ["--use-angle=gl", "--ignore-gpu-blocklist", "--enable-gpu"],
  swiftshader: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
};
const backend = o.cpu ? "swiftshader" : o.gl ?? "angle";

const server = await startServer(Number(o.port));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: BACKENDS[backend] });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  await page.goto(`http://localhost:${o.port}/${shortDir}/?render`, { waitUntil: "domcontentloaded", timeout: 900000 });
  await page.waitForFunction(() => window.__shortReady === true, null, { timeout: 900000 });
  await page.evaluate(() => document.fonts.ready);
  const { fps, frames } = await page.evaluate(() => ({ fps: window.__short.fps, frames: window.__short.frames }));
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector("#stage canvas")?.getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  console.log(`backend ${backend}: WebGL renderer = ${gpu}; ${frames} frames @ ${fps} fps`);
  if (o.probe) process.exit(/swiftshader|llvmpipe|software/i.test(gpu) ? 2 : 0);

  const from = Number(o.from), to = Math.min(Number(o.to ?? frames), frames);
  await mkdir(o.dir, { recursive: true });
  const stage = page.locator("#stage");
  await page.evaluate((t) => window.__short.seek(t), Math.max(0, (from - 1) / fps)); // so the first frame starts from a posed scene
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const file = `${o.dir}/${String(f).padStart(5, "0")}.jpg`;
    try { await access(file); continue; } catch {}
    await page.evaluate((t) => window.__short.seek(t), f / fps);
    await writeFile(file, await stage.screenshot({ type: "jpeg", quality: 93, timeout: 600000 }));
    if ((f - from) % 30 === 0) console.log(`frame ${f} (${((Date.now() - t0) / 1000 / (f - from + 1)).toFixed(2)} s/frame)`);
  }
  console.log("done", from, to);
} finally {
  await browser.close();
  server.close();
}
