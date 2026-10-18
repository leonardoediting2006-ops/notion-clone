"""Render a short on a Kaggle notebook (Settings: Accelerator = GPU, Internet = On).

Paste this whole file into one notebook cell and run it. It
  1. clones the repo (a private repo needs a Kaggle secret named GITHUB_TOKEN: Add-ons -> Secrets),
  2. installs node, Playwright's Chromium and ffmpeg,
  3. probes which graphics backend Chromium can actually use (a real GPU, or software),
  4. renders the frames with one worker per GPU (or per 2 CPU cores if there is no GPU WebGL), mixes the sound,
  5. encodes /kaggle/working/<short>.mp4 (download it from the notebook's Output tab).

Honest caveat: Kaggle's GPU containers are made for compute (CUDA). Many of them expose no OpenGL/Vulkan driver,
and then Chromium falls back to software WebGL, which is no faster than any other CPU. Step 3 prints which one you
got ("WebGL renderer = ..."); if it says SwiftShader/llvmpipe, the GPU is not being used for the picture.
"""
import glob, os, re, subprocess, sys

REPO, BRANCH, SHORT = "leonardoediting2006-ops/notion-clone", "ccr-a44fac09-xh288q", "dog-welcome"
WORK = "/kaggle/working"
sh = lambda cmd, **kw: subprocess.run(cmd, shell=True, check=kw.pop("check", True), **kw)

try:
    from kaggle_secrets import UserSecretsClient
    token = UserSecretsClient().get_secret("GITHUB_TOKEN")
except Exception:
    token = os.environ.get("GITHUB_TOKEN", "")
url = f"https://{token + '@' if token else ''}github.com/{REPO}.git"
if not os.path.isdir(f"{WORK}/studio"):
    sh(f"git clone --depth 1 -b {BRANCH} {url} {WORK}/studio")
os.chdir(f"{WORK}/studio")

# node + ffmpeg + Chromium
if subprocess.run("node --version", shell=True, capture_output=True).returncode != 0:
    sh("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs")
sh("which ffmpeg || (apt-get update && apt-get install -y ffmpeg)")
sh("npm install --no-audit --no-fund && npx playwright install --with-deps chromium")

# which graphics backend works? (first one that is not software wins)
gpus = subprocess.run("nvidia-smi -L | wc -l", shell=True, capture_output=True, text=True).stdout.strip()
gl, frames, FPS = None, None, 60
for backend in ("vulkan", "egl", "angle", "swiftshader"):
    r = sh(f"node tools/render-frames.mjs shorts/{SHORT} --probe --gl {backend} --port 5300", check=False, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip()[-300:])
    m = re.search(r"(\d+) frames @ (\d+) fps", r.stdout)
    if m:
        frames, FPS = int(m.group(1)), int(m.group(2))
    if r.returncode == 0 and backend != "swiftshader":
        gl = backend
        break
use_gpu = gl is not None
print(f"graphics backend: {gl or 'software only (SwiftShader)'}")
workers = max(1, int(gpus or 1)) * 2 if use_gpu else max(1, (os.cpu_count() or 4) // 2)

# frames: contiguous ranges, one worker process each
assert frames, 'could not load the short (see the probe output above)'
step = -(-frames // workers)
procs = []
for k in range(workers):
    a, b = k * step, min(frames, (k + 1) * step)
    flags = f"--gl {gl}" if use_gpu else "--cpu"
    procs.append(subprocess.Popen(f"node tools/render-frames.mjs shorts/{SHORT} --from {a} --to {b} --dir {WORK}/frames --port {5310 + k} {flags}", shell=True))
for p in procs:
    p.wait()

# soundtrack + encode
sh(f"node tools/render.mjs shorts/{SHORT} --audio-only --port 5330 {'' if use_gpu else '--cpu'} --out {WORK}/{SHORT}.mp4")
sh(f"ffmpeg -y -loglevel error -framerate {FPS} -i {WORK}/frames/%05d.jpg -i {WORK}/{SHORT}-audio.wav "
   f"-c:v libx264 -crf 18 -pix_fmt yuv420p -preset medium -c:a aac -b:a 192k -movflags +faststart -shortest {WORK}/{SHORT}.mp4")
print("done:", glob.glob(f"{WORK}/{SHORT}.mp4"))
