// Render a short to MP4, frame by frame (frame-perfect, any machine speed).
//
//   node tools/render.mjs shorts/hello-3d                 → out/hello-3d.mp4
//   node tools/render.mjs shorts/hello-3d --audio music.mp3 --out out/final.mp4
//   node tools/render.mjs shorts/hello-3d --frame 60      → out/hello-3d.png (single still)
//
// Needs: ffmpeg on PATH, and `npm install` + `npx playwright install chromium` once.
// Set CHROMIUM_PATH to use an existing Chrome/Chromium binary instead.

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { startServer } from "./server.mjs";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string" },
    audio: { type: "string" },
    frame: { type: "string" },
    crf: { type: "string", default: "18" },
    port: { type: "string", default: "5174" },
  },
});

const shortDir = positionals[0]?.replace(/\/+$/, "");
if (!shortDir) {
  console.error("Usage: node tools/render.mjs shorts/<name> [--out file.mp4] [--audio file] [--frame N]");
  process.exit(1);
}
const name = basename(shortDir);
const still = opts.frame !== undefined;
const out = opts.out ?? `out/${name}.${still ? "png" : "mp4"}`;
await mkdir(dirname(out), { recursive: true });

const server = await startServer(Number(opts.port));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("[page error]", e.message));
  await page.goto(`http://localhost:${opts.port}/${shortDir}/?render`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => window.__shortReady === true, null, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  const { fps, frames } = await page.evaluate(() => ({ fps: window.__short.fps, frames: window.__short.frames }));
  const stage = page.locator("#stage");

  if (still) {
    const f = Number(opts.frame);
    await page.evaluate((t) => window.__short.seek(t), f / fps);
    await writeFile(out, await stage.screenshot({ type: "png" }));
    console.log(`Saved frame ${f} → ${out}`);
  } else {
    const ffArgs = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-"];
    if (opts.audio) ffArgs.push("-i", opts.audio, "-c:a", "aac", "-b:a", "192k", "-shortest");
    ffArgs.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", opts.crf, "-preset", "medium", "-movflags", "+faststart", out);
    const ff = spawn("ffmpeg", ffArgs, { stdio: ["pipe", "inherit", "inherit"] });
    const ffDone = new Promise((ok, fail) => {
      ff.on("error", fail);
      ff.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited with ${code}`))));
    });

    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.__short.seek(t), f / fps);
      const png = await stage.screenshot({ type: "png" });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      if (f % fps === 0 || f === frames - 1) {
        process.stdout.write(`\rRendering ${name}: frame ${f + 1}/${frames}`);
      }
    }
    ff.stdin.end();
    await ffDone;
    console.log(`\nSaved ${out} (${frames} frames @ ${fps}fps, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
} finally {
  await browser.close();
  server.close();
}
