"""Shared tools for forging sound libraries from REAL recordings only (no synthesis).

Sources (CC0 or CC-BY, original freesound recordings; downloaded once into a cache folder):
  * ESC-50 clips (github.com/karolpiczak/ESC-50), licences from its LICENSE file
  * Sonic Pi's sample library (github.com/sonic-pi-net/sonic-pi, etc/samples), CC0

Every sound is cut from the best moment of its recording, de-noised with stationary spectral gating (the noise print is the
quietest part of the clip), band-limited with causal filters (no pre-ringing before a transient), given a little presence,
faded and peak-normalised, then written as lossless 48 kHz mono FLAC.  Used by forge-comfort-sfx.py and forge-doorway-sfx.py
(pip install numpy scipy soundfile noisereduce).
"""
import os, sys, json, math, csv, tempfile, urllib.request
from fractions import Fraction
import numpy as np, soundfile as sf
from scipy import signal
import noisereduce as nr

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = None
CACHE = os.environ.get("SFX_CACHE", os.path.join(tempfile.gettempdir(), "dog-sfx-src"))
RAW_ESC = "https://raw.githubusercontent.com/karolpiczak/ESC-50/master/"
RAW_SP = "https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/dev/etc/samples/"

def setup(default_out):
    """Output folder: the first command-line argument, else `default_out` (relative to the repo root)."""
    global OUT
    OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, default_out)
    os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
    return OUT

def fetch(url, dest):
    if not (os.path.exists(dest) and os.path.getsize(dest) > 1000):
        with urllib.request.urlopen(url, timeout=60) as r, open(dest, "wb") as f: f.write(r.read())
    return dest

_esc_names = {}
def esc_path(clip):
    """'2-122616-A' -> the cached wav (ESC-50 file names carry a class id suffix, looked up in its csv)."""
    if not _esc_names:
        meta = fetch(RAW_ESC + "meta/esc50.csv", f"{CACHE}/esc50.csv")
        for r in csv.DictReader(open(meta)): _esc_names[r["filename"].rsplit("-", 1)[0]] = r["filename"]
    return fetch(RAW_ESC + "audio/" + _esc_names[clip] + "", f"{CACHE}/{clip}.wav")

# ---------------------------------------------------------------- helpers
def load(path):
    x, sr = sf.read(path, always_2d=True)
    x = x.mean(1).astype(np.float64)
    if sr != SR:
        g = math.gcd(SR, sr)
        x = signal.resample_poly(x, SR // g, sr // g)
    return x

def src(name):
    if name.startswith("sp:"): return load(fetch(f"{RAW_SP}{name[3:]}.flac", f"{CACHE}/sp_{name[3:]}.flac"))
    return load(esc_path(name))

def seg(x, t0, t1):
    return x[int(t0 * SR): int(t1 * SR)].copy()

def speed(x, f):
    """Play back at f x speed (pitch and duration change together, like a tape)."""
    if abs(f - 1) < 1e-3: return x
    fr = Fraction(f).limit_denominator(200)
    return signal.resample_poly(x, fr.denominator, fr.numerator)

def _causal(sos, x):
    """Causal filtering (no pre-ringing before a transient); the start is mirror-padded so the clip's first
    sample is not a step that would make the filter ring."""
    n = min(len(x) - 1, int(0.05 * SR))
    xp = np.concatenate([x[1:n + 1][::-1], x]) if n > 0 else x
    return signal.sosfilt(sos, xp)[n:]

def hp(x, f, order=4):
    return _causal(signal.butter(order, f, "hp", fs=SR, output="sos"), x)

def lp(x, f, order=4):
    return _causal(signal.butter(order, min(f, SR * 0.45), "lp", fs=SR, output="sos"), x)

def shelf(x, f, gain_db, kind="high"):
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f / SR; cs, sn = math.cos(w), math.sin(w); S = 0.8
    al = sn / 2 * math.sqrt((A + 1 / A) * (1 / S - 1) + 2); tb = 2 * math.sqrt(A) * al
    if kind == "high":
        b0 = A * ((A + 1) + (A - 1) * cs + tb); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - tb)
        a0 = (A + 1) - (A - 1) * cs + tb; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - tb
    else:
        b0 = A * ((A + 1) - (A - 1) * cs + tb); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - tb)
        a0 = (A + 1) + (A - 1) * cs + tb; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - tb
    return signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x)

def peak_eq(x, f, gain_db, q=1.0):
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f / SR; al = math.sin(w) / (2 * q); cs = math.cos(w)
    b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A
    return signal.lfilter([b0 / a0, b1 / a0, b2 / a0], [1, a1 / a0, a2 / a0], x)

def quiet_profile(x, win=0.25):
    """The quietest (non-digital-silence) stretch of the recording = its noise print."""
    n = int(win * SR)
    if len(x) < n * 2: return x
    best, bi = 1e9, 0
    for i in range(0, len(x) - n, n // 4):
        r = np.sqrt(np.mean(x[i:i + n] ** 2))
        if 1e-5 < r < best: best, bi = r, i
    return x[bi: bi + n]

def denoise(x, full, amount=0.9, smooth_hz=200):
    """Stationary spectral gating against the clip's own noise print (`full` = the whole recording)."""
    prof = quiet_profile(full)
    return nr.reduce_noise(y=x, sr=SR, y_noise=prof, stationary=True, prop_decrease=amount,
                           n_fft=2048, win_length=2048, hop_length=256, freq_mask_smooth_hz=smooth_hz, time_mask_smooth_ms=30)

def fade(x, fi=0.004, fo=0.02):
    x = x.copy(); n = len(x)
    a = min(int(fi * SR), n); b = min(int(fo * SR), n)
    if a: x[:a] *= np.sin(np.linspace(0, math.pi / 2, a)) ** 2
    if b: x[-b:] *= np.cos(np.linspace(0, math.pi / 2, b)) ** 2
    return x

def norm(x, peak_db):
    p = np.abs(x).max()
    return x * (10 ** (peak_db / 20) / p) if p > 0 else x

def trim_silence(x, thr_db=-55):
    env = np.abs(x); m = env > 10 ** (thr_db / 20) * env.max()
    if not m.any(): return x
    i = np.argmax(m); j = len(m) - np.argmax(m[::-1])
    return x[max(0, i - int(0.004 * SR)): j]

def descr(x):
    fr = int(0.02 * SR); n = len(x) // fr
    e = np.sqrt((x[:n * fr].reshape(n, fr) ** 2).mean(1)) + 1e-9
    return dict(dur=round(len(x) / SR, 2), peak=round(20 * np.log10(np.abs(x).max() + 1e-9), 1),
                rms=round(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9), 1),
                floor=round(20 * np.log10(np.percentile(e, 8)), 1))

LOG = {}
def out(name, x, peak=-6.0, fi=0.004, fo=0.03, **meta):
    x = fade(trim_silence(x), fi, fo)
    x = norm(x, peak)
    sf.write(f"{OUT}/{name}.flac", x.astype(np.float32), SR, format="FLAC", subtype="PCM_24")
    LOG[name] = descr(x) | meta

def make(name, srcname, t0, t1, *, rate=1.0, hp_f=None, lp_f=None, dn=0.0, dn_smooth=200, pre=None,
         peak=-6.0, fi=0.004, fo=0.03, hi=0.0, hi_f=5500, presence=0.0, pres_f=3500, ):
    full = src(srcname)
    x = seg(full, t0, t1)
    if pre: x = pre(x)
    if dn: x = denoise(x, full, dn, dn_smooth) if len(x) > 2048 else x
    if hp_f: x = hp(x, hp_f)
    if lp_f: x = lp(x, lp_f)
    if presence: x = peak_eq(x, pres_f, presence, 0.9)
    if hi: x = shelf(x, hi_f, hi, "high")
    x = speed(x, rate)
    out(name, x, peak, fi, fo, src=srcname, rate=rate)


def finish(credits, short):
    """Write CREDITS.md for the recordings that were used, and report."""
    used = {}
    for name, m in LOG.items(): used.setdefault(m["src"], []).append(name)
    rows = []
    for k, names in used.items():
        title, author, lic, fid = credits[k]
        rows.append(f"| {', '.join(sorted(names))} | \"{title}\" by {author} — https://freesound.org/s/{fid}/ | {lic} |")
    cc = sorted(f'"{credits[k][0].rsplit(".", 1)[0] if "." in credits[k][0] and not credits[k][0].endswith(")") else credits[k][0]}" by {credits[k][1]}' for k in used if credits[k][2] != "CC0")
    open(f"{OUT}/CREDITS.md", "w").write(f"""# Sound effects: real recordings, cleaned and cut

Every sound in this folder is a cut of a real field recording (freesound.org, via the ESC-50 dataset and Sonic Pi's CC0 sample
library). Nothing is synthesised. `{short}` downloads the originals and makes these files (spectral-gating
noise reduction, band-limiting, fades, level). The cue sheet that places them on the picture is the end of `main.js`.

| Files | Original recording | Licence |
|---|---|---|
""" + "\n".join(sorted(rows)) + f"""

## Video description credit (CC BY sounds)

```
Sounds: {' and '.join(cc)} (freesound.org, CC BY).
```
""")
    print(len(LOG), "sounds ->", OUT)
