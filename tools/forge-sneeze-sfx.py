#!/usr/bin/env python3
"""Forge the sounds of the dog-sneeze short from REAL recordings only (no synthesis).

    pip install numpy scipy soundfile noisereduce
    python3 tools/forge-sneeze-sfx.py            -> shorts/dog-sneeze/sfx/*.flac (+ CREDITS.md)

Most of the library (paws, steps, woofs, whimpers, splats, thrushes, crickets, twinkles, bells...) is copied from the dog-gaze /
dog-comfort / dog-doorway libraries (already forged from real recordings). The NEW sounds are cut from CC0 clips of the ESC-50
dataset: four real sneezes (played a little higher for a small dog), three real laughs for the owner, two real bird-song beds.
Method: tools/sfxforge.py.
"""
import os, shutil
from sfxforge import *

out_dir = setup("shorts/dog-sneeze/sfx")

# --- sneezes: the best moment of each recording (an intake, then the burst), band-limited
make("sneeze_1", "1-54505-A", 1.38, 2.12, hp_f=140, lp_f=9500, dn=0.5, peak=-5, fi=0.004, fo=0.08)
make("sneeze_2", "2-130978-A", 0.26, 1.0, hp_f=140, lp_f=9500, dn=0.5, peak=-5, fi=0.004, fo=0.08)
make("sneeze_3", "4-156843-A", 0.30, 0.72, hp_f=160, lp_f=9500, dn=0.4, peak=-5, fi=0.003, fo=0.07)        # the short "choo" alone: the neat, performed one
make("sneeze_4", "3-144692-A", 0.90, 1.72, hp_f=140, lp_f=9500, dn=0.5, peak=-5, fi=0.004, fo=0.08)
# --- laughs (the owner)
make("laugh_1", "1-72695-A", 0.36, 1.85, hp_f=120, lp_f=9500, dn=0.5, peak=-7, fi=0.005, fo=0.12)
make("laugh_2", "3-119459-A", 1.80, 3.20, hp_f=100, lp_f=9500, dn=0.5, peak=-7, fi=0.005, fo=0.12)
make("laugh_3", "4-181599-A", 0.05, 1.60, hp_f=120, lp_f=9500, dn=0.5, peak=-7, fi=0.005, fo=0.12)
# --- bird-song beds for the garden, the park and the meadow
make("birds_a", "4-223127-A", 0.2, 4.8, hp_f=500, lp_f=9500, dn=0.6, peak=-9, fi=0.2, fo=0.3)
make("birds_b", "3-181132-A", 0.1, 4.8, hp_f=500, lp_f=9500, dn=0.6, peak=-9, fi=0.2, fo=0.3)

CREDITS = {
    "1-54505-A": ("sneeze.wav", "sagetyrtle", "CC0", 54505), "2-130978-A": ("Sneeze AC 2.wav", "oldedgar", "CC0", 130978),
    "4-156843-A": ("Sneeze Male JGray.wav", "JGrayArt", "CC0", 156843), "3-144692-A": ("Sneeze.wav", "tekgnosis", "CC0", 144692),
    "1-72695-A": ("laugh5_woman.wav", "sagetyrtle", "CC0", 72695), "3-119459-A": ("Male Laughter.wav", "Eneasz", "CC0", 119459),
    "4-181599-A": ("Laugh.wav", "JulieBaka", "CC0", 181599), "4-223127-A": ("general birdsong.wav", "keweldog", "CC0", 223127),
    "3-181132-A": ("bird chirps.wav", "keweldog", "CC0", 181132),
}

# --- the rest: copied from the libraries of the earlier shorts (every file there is a cut of a real recording too)
LIBS = ["dog-gaze", "dog-comfort", "dog-doorway", "dog-kibble"]
COPY = ["woof_low", "woof_soft", "growl", "whimper_a", "whimper_b", "whimper_c", "splat_1", "splat_2", "splat_3", "pop_1", "pop_2", "pop_3",
        "drip_1", "drip_2", "drip_3", "thrush_a", "thrush_b", "thrush_c", "thrush_d", "crickets", "leaves", "sniffle_1", "sniffle_2", "sniffle_3", "sniffle_4",
        "pad_step", "thump", "paw_1", "paw_2", "paw_3", "paw_4", "step_wood_1", "step_wood_2", "step_wood_3", "step_wood_4", "glow",
        "twinkle_1", "twinkle_2", "twinkle_3", "bell_1", "bell_2", "bell_3", "gasp", "breath_out", "swash_1", "swash_2", "rustle_1", "rustle_2", "rustle_3", "creak_1", "snap", "snap_low"]
for n in COPY:
    for lib in LIBS:
        p = os.path.join(ROOT, "shorts", lib, "sfx", n + ".flac")
        if os.path.exists(p): shutil.copy(p, os.path.join(out_dir, n + ".flac")); break
    else: print("MISSING", n)

REUSED = [
    ("bell_1, bell_2, bell_3", "\"Angelus Bell.aif\" by Peaveycroquette — https://freesound.org/s/78381/", "CC BY"),
    ("breath_out", "\"Breath human Sci2.wav\" by cidchili — https://freesound.org/s/54962/", "CC0"),
    ("creak_1", "\"Footsteps Wooden Stairs Squeaking 1.wav\" by RutgerMuller — https://freesound.org/s/51149/", "CC0"),
    ("crickets", "\"emmentaler crickets.wav\" by Zozzy — https://freesound.org/s/59102/", "CC0"),
    ("drip_1, drip_2, drip_3, pop_1, pop_2, pop_3", "\"Water drop\" by Elfman-Rox — https://freesound.org/s/156907/", "CC0"),
    ("gasp", "\"Frightened Breathing.aiff\" by nickrave — https://freesound.org/s/112557/", "CC0"),
    ("glow", "\"ambi_glass_rub (Sonic Pi sample)\" by ani_music — https://freesound.org/s/198403/", "CC0"),
    ("growl, woof_low, woof_soft", "\"LBS_FX DOG Small Alert Bark001.wav\" by LittleBigSounds — https://freesound.org/s/163459/", "CC0"),
    ("leaves, rustle_1, rustle_2, rustle_3", "\"Fire Crackling 01.wav\" by kingsrow — https://freesound.org/s/181563/", "CC0"),
    ("pad_step, thump", "\"Footsteps_Carpet.wav\" by mlsulli — https://freesound.org/s/234855/", "CC0"),
    ("paw_1, paw_2, paw_3, paw_4", "\"wooden panel footstep 3\" by Yoyodaman234 — https://freesound.org/s/223162/", "CC0"),
    ("sniffle_1, sniffle_2, sniffle_3, sniffle_4", "\"Breath\" by mcroce — https://freesound.org/s/234335/", "CC0"),
    ("snap, snap_low", "\"perc_snap (Sonic Pi sample)\" by SoundCollectah — https://freesound.org/s/109400/", "CC0"),
    ("splat_1", "\"Water splash 2.wav\" by Adam_N — https://freesound.org/s/164593/", "CC0"),
    ("splat_2", "\"Water splash 1.wav\" by Adam_N — https://freesound.org/s/164594/", "CC0"),
    ("splat_3", "\"120115_05 stones drop bath.WAV\" by toiletrolltube — https://freesound.org/s/174797/", "CC0"),
    ("step_wood_1, step_wood_2, step_wood_3, step_wood_4", "see dog-doorway/sfx/CREDITS.md (real wooden footsteps)", "CC0"),
    ("swash_1, swash_2", "\"perc_swash (Sonic Pi sample)\" by qubodup — https://freesound.org/s/60009/", "CC0"),
    ("thrush_a, thrush_b, thrush_c, thrush_d", "\"Song thrush (pevchiy drozd)\" by urupin — https://freesound.org/s/122616/", "CC0"),
    ("twinkle_1, twinkle_2, twinkle_3", "\"perc_bell (Sonic Pi sample)\" by AlaskaRobotics — https://freesound.org/s/221515/", "CC0"),
    ("whimper_a, whimper_b, whimper_c", "\"barkingdog_in_dream.mp3\" by Taira Komori — https://freesound.org/s/217158/", "CC BY"),
]
used = {}
for name, m in LOG.items(): used.setdefault(m["src"], []).append(name)
rows = [f"| {', '.join(sorted(names))} | \"{CREDITS[k][0]}\" by {CREDITS[k][1]} — https://freesound.org/s/{CREDITS[k][3]}/ | {CREDITS[k][2]} |" for k, names in used.items()]
rows += [f"| {a} | {b} | {c} |" for a, b, c in REUSED]
open(f"{out_dir}/CREDITS.md", "w").write("""# Sound effects: real recordings, cleaned and cut

Every sound in this folder is a cut of a real field recording (freesound.org, via the ESC-50 dataset and Sonic Pi's CC0 sample
library). Nothing is synthesised. The new sounds (sneezes, laughs, bird-song beds) come from `tools/forge-sneeze-sfx.py`; the rest
is copied from the libraries of the earlier shorts. The sneezes are human recordings played a little higher (`rate`) for a small dog:
there is no CC0 recording of a dog's play-sneeze in the datasets used. The cue sheet that places everything is the end of `main.js`.

| Files | Original recording | Licence |
|---|---|---|
""" + "\n".join(rows) + """

## Video description credit (CC BY sounds)

```
Sounds: "Angelus Bell" by Peaveycroquette and "barkingdog_in_dream" by Taira Komori (freesound.org, CC BY).
```
""")
print(len(LOG), "new sounds,", len(COPY), "copied ->", out_dir)
for k, v in LOG.items(): print(" ", k, v)
