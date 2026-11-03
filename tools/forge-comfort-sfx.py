#!/usr/bin/env python3
"""Forge the dog-comfort sound library from REAL recordings only (no synthesis).

    pip install numpy scipy soundfile noisereduce        (and nothing else; ffmpeg is not needed)
    python3 tools/forge-comfort-sfx.py                   -> shorts/dog-comfort/sfx/*.flac + CREDITS.md

Sources (CC0 or CC-BY, original freesound recordings; downloaded once into a cache folder):
  * ESC-50 clips (github.com/karolpiczak/ESC-50), licences from its LICENSE file
  * Sonic Pi's sample library (github.com/sonic-pi-net/sonic-pi, etc/samples), CC0

Every sound is cut from the best moment of its recording, de-noised with stationary spectral gating (the noise
print is the quietest part of the clip), band-limited with causal filters (no pre-ringing before a transient),
given a little presence, faded and peak-normalised, then written as lossless 48 kHz mono FLAC.
The sound design that places them on the picture is the cue sheet at the end of shorts/dog-comfort/main.js.
"""
import os, sys, json, math, csv, tempfile, urllib.request
from fractions import Fraction
import numpy as np, soundfile as sf
from scipy import signal
import noisereduce as nr

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 else f"{ROOT}/shorts/dog-comfort/sfx"
CACHE = os.environ.get("SFX_CACHE", os.path.join(tempfile.gettempdir(), "dog-comfort-sfx-src"))
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
RAW_ESC = "https://raw.githubusercontent.com/karolpiczak/ESC-50/master/"
RAW_SP = "https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/dev/etc/samples/"

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

# ---------------------------------------------------------------- the sounds
# --- birds: a song thrush (one clean bird on a silent background) and a few small chirps
make("thrush_a", "2-122616-A", 2.45, 3.00, hp_f=1200, lp_f=11000, peak=-9, fi=0.03, fo=0.15, hi=1.5)
make("thrush_b", "2-122616-A", 3.02, 4.42, hp_f=1200, lp_f=11000, peak=-9, fi=0.02, fo=0.25, hi=1.5)
make("thrush_c", "2-122616-A", 0.00, 0.86, hp_f=1200, lp_f=11000, peak=-9, fi=0.08, fo=0.2, hi=1.5)
make("thrush_d", "2-122616-A", 3.02, 3.62, hp_f=1200, lp_f=11000, rate=1.08, peak=-10, fi=0.02, fo=0.12, hi=1.5)

# --- the dog
make("snore", "5-234145-A", 2.28, 3.50, hp_f=70, lp_f=7000, dn=1.0, peak=-8, fi=0.05, fo=0.2)
make("whimper_a", "5-217158-A", 0.20, 0.72, hp_f=250, lp_f=6500, dn=0.7, peak=-8, fi=0.01, fo=0.1, presence=2)
make("whimper_b", "5-217158-A", 0.70, 1.20, hp_f=250, lp_f=6500, dn=0.7, peak=-8, fi=0.01, fo=0.1, presence=2)
make("whimper_c", "5-217158-A", 1.60, 2.30, hp_f=250, lp_f=6500, dn=0.7, rate=0.92, peak=-9, fi=0.01, fo=0.18, presence=2)
make("woof_soft", "3-163459-A", 0.27, 0.62, hp_f=120, lp_f=9000, dn=0.5, rate=0.9, peak=-7, fi=0.003, fo=0.06, hi=1.5)
make("woof_low", "3-163459-A", 0.69, 1.02, hp_f=100, lp_f=8000, dn=0.5, rate=0.72, peak=-8, fi=0.003, fo=0.08)

# paws: a clean single tap (wooden panel) pitched up = a claw/pad on stone; plus a soft step for body
for i, r in enumerate([1.45, 1.7, 1.95, 1.3]):
    make(f"paw_{i + 1}", "1-223162-A", 0.0, 0.2, lp_f=7500, rate=r, peak=-9 - i * 0.7, fi=0.0003, fo=0.03, hi=2)
make("pad_step", "5-234855-A", 3.80, 4.00, hp_f=60, lp_f=3500, dn=0.8, rate=1.15, peak=-8, fi=0.003, fo=0.06)

# --- you
make("breath_out", "2-54962-A", 0.0, 2.55, hp_f=60, lp_f=9000, dn=0.8, peak=-10, fi=0.08, fo=0.5)
make("gasp", "3-112557-A", 2.50, 3.62, hp_f=80, lp_f=9000, dn=0.9, rate=0.93, peak=-9, fi=0.03, fo=0.25)
for i, (a, b) in enumerate([(0.15, 0.62), (1.70, 2.05), (2.35, 2.75), (3.05, 3.45)]):
    make(f"sniffle_{i + 1}", "5-234335-A", a, b, hp_f=250, lp_f=9000, dn=0.9, rate=0.92, peak=-11, fi=0.01, fo=0.08)

# --- object / wet foley
make("thump", "5-234855-A", 3.80, 4.05, hp_f=40, lp_f=900, dn=0.7, rate=0.7, peak=-6, fi=0.003, fo=0.1)
for i, (a, b, r) in enumerate([(0.12, 0.42, 1.5), (0.36, 0.64, 1.8), (0.56, 0.92, 1.4)]):
    make(f"squeak_{i + 1}", "5-173568-A", a, b, hp_f=350, lp_f=14000, rate=r, peak=-10, fi=0.01, fo=0.06)
make("splat_1", "3-164593-A", 0.04, 0.38, hp_f=150, rate=0.85, peak=-8, fi=0.002, fo=0.1)
make("splat_2", "3-164594-A", 0.04, 0.36, hp_f=150, rate=0.9, peak=-8, fi=0.002, fo=0.08)
make("splat_3", "4-174797-A", 0.90, 1.28, hp_f=150, rate=1.15, dn=0.5, peak=-8, fi=0.002, fo=0.12)
for i, (a, b, r) in enumerate([(0.36, 0.95, 1.0), (1.35, 1.95, 0.9), (2.18, 2.75, 1.1)]):
    make(f"drip_{i + 1}", "3-156907-A", a, b, hp_f=200, rate=r, peak=-9, fi=0.001, fo=0.1)
for i, r in enumerate([1.9, 2.3, 2.8]):
    make(f"pop_{i + 1}", "3-156907-A", 0.36, 0.95, hp_f=300, rate=r, peak=-9, fi=0.001, fo=0.06)
make("paper_pile", "4-181563-A", 0.20, 1.60, hp_f=1500, lp_f=15000, dn=0.0, peak=-8, fi=0.02, fo=0.35, hi=2)

# --- icons and sparkle: real bells and glass
for i, r in enumerate([1.0, 1.26, 1.5]):
    make(f"bell_{i + 1}", "2-78381-A", 0.20, 1.20, hp_f=200, dn=0.4, rate=r, peak=-10, fi=0.001, fo=0.35)
make("bell_long", "2-78381-A", 2.18, 5.00, hp_f=200, dn=0.4, peak=-8, fi=0.001, fo=0.9)
for i, r in enumerate([1.5, 2.0, 2.52]):
    make(f"twinkle_{i + 1}", "sp:perc_bell", 0.0, 2.2, hp_f=600, rate=r, peak=-12, fi=0.001, fo=0.7, hi=1.5)
make("glow", "sp:ambi_glass_rub", 0.0, 3.1, hp_f=200, lp_f=7000, peak=-16, fi=0.9, fo=1.0)
make("snap", "sp:perc_snap", 0.0, 0.30, hp_f=300, peak=-9, fi=0.0005, fo=0.08)
make("snap_low", "sp:perc_snap", 0.0, 0.30, hp_f=200, rate=0.8, peak=-10, fi=0.0005, fo=0.08)
make("siren", "2-70936-A", 1.0, 3.3, hp_f=250, lp_f=9000, peak=-12, fi=0.05, fo=0.7)
make("heart_1", "sp:drum_bass_soft", 0.0, 0.8, lp_f=140, rate=0.68, peak=-7, fi=0.002, fo=0.25)
make("heart_2", "sp:drum_bass_soft", 0.0, 0.8, lp_f=130, rate=0.6, peak=-10, fi=0.002, fo=0.25)

# --- applause for the trophy
make("applause", "3-130330-A", 0.0, 3.1, hp_f=250, lp_f=12000, peak=-12, fi=0.35, fo=1.0)


# ---------------------------------------------------------------- credits (only recordings that are actually used)
CREDITS = {
    "2-122616-A": ("Song thrush (pevchiy drozd)", "urupin", "CC0", 122616),
    "5-234145-A": ("Dog Snores", "mingusassin", "CC0", 234145),
    "5-217158-A": ("barkingdog_in_dream.mp3", "Taira Komori", "CC BY", 217158),
    "3-163459-A": ("LBS_FX DOG Small Alert Bark001.wav", "LittleBigSounds", "CC0", 163459),
    "1-223162-A": ("wooden panel footstep 3", "Yoyodaman234", "CC0", 223162),
    "5-234855-A": ("Footsteps_Carpet.wav", "mlsulli", "CC0", 234855),
    "2-54962-A": ("Breath human Sci2.wav", "cidchili", "CC0", 54962),
    "3-112557-A": ("Frightened Breathing.aiff", "nickrave", "CC0", 112557),
    "5-234335-A": ("Breath", "mcroce", "CC0", 234335),
    "5-173568-A": ("creaking door.wav", "Bratok999", "CC0", 173568),
    "3-164593-A": ("Water splash 2.wav", "Adam_N", "CC0", 164593),
    "3-164594-A": ("Water splash 1.wav", "Adam_N", "CC0", 164594),
    "4-174797-A": ("120115_05 stones drop bath.WAV", "toiletrolltube", "CC0", 174797),
    "3-156907-A": ("Water drop", "Elfman-Rox", "CC0", 156907),
    "4-181563-A": ("Fire Crackling 01.wav", "kingsrow", "CC0", 181563),
    "2-78381-A": ("Angelus Bell.aif", "Peaveycroquette", "CC BY", 78381),
    "2-70936-A": ("police.wav", "guitarguy1985", "CC0", 70936),
    "3-130330-A": ("Polite Clapping with no Yelling", "dianadesim", "CC0", 130330),
    "sp:perc_bell": ("perc_bell (Sonic Pi sample)", "AlaskaRobotics", "CC0", 221515),
    "sp:ambi_glass_rub": ("ambi_glass_rub (Sonic Pi sample)", "ani_music", "CC0", 198403),
    "sp:perc_snap": ("perc_snap (Sonic Pi sample)", "SoundCollectah", "CC0", 109400),
    "sp:drum_bass_soft": ("drum_bass_soft (Sonic Pi sample)", "menegass", "CC0", 100052),
}
used = {}
for name, m in LOG.items(): used.setdefault(m["src"], []).append(name)
rows = []
for k, names in used.items():
    title, author, lic, fid = CREDITS[k]
    rows.append(f"| {', '.join(sorted(names))} | \"{title}\" by {author} — https://freesound.org/s/{fid}/ | {lic} |")
open(f"{OUT}/CREDITS.md", "w").write("""# Sound effects: real recordings, cleaned and cut

Every sound in this folder is a cut of a real field recording (freesound.org, via the ESC-50 dataset and Sonic Pi's CC0 sample
library). Nothing is synthesised. `tools/forge-comfort-sfx.py` downloads the originals and makes these files (spectral-gating
noise reduction, band-limiting, fades, level). The cue sheet that places them on the picture is the end of `main.js`.

| Files | Original recording | Licence |
|---|---|---|
""" + "\n".join(sorted(rows)) + """

## Video description credit (CC BY sounds)

```
Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```
""")
print(len(LOG), "sounds ->", OUT)
