#!/usr/bin/env python3
"""Forge the NEW sounds of the dog-kibble short from REAL recordings only (no synthesis).

    pip install numpy scipy soundfile noisereduce
    python3 tools/forge-kibble-sfx.py                    -> shorts/dog-kibble/sfx/*.flac (+ CREDITS-new.md)

The rest of the library (paws, pops, twinkles, heartbeats, whimpers, bells, growls...) is copied from the dog-gaze library.
Method: tools/sfxforge.py.  A crunch is a short crisp burst cut from a real crackling-fire recording (brittle pops), a gulp is a
real swallow of water.
"""
from sfxforge import *

setup("shorts/dog-kibble/sfx")

# --- crunching kibble: the sharpest pops of a real crackling fire, a tenth of a second each, band-limited to the crisp part
for i, t in enumerate([1.74, 4.05, 1.04, 2.28]):
    make(f"crunch_{i + 1}", "4-181563-A", t, t + 0.14, hp_f=650, lp_f=8500, dn=0.0, peak=-9, fi=0.002, fo=0.06)
for i, t in enumerate([2.57, 3.04]):                                    # a softer, lower chew
    make(f"chew_{i + 1}", "4-181563-A", t, t + 0.18, hp_f=260, lp_f=4200, dn=0.0, peak=-12, fi=0.004, fo=0.09)
# --- a swallow
make("gulp_1", "1-37226-A", 1.50, 1.95, hp_f=120, lp_f=7500, dn=0.4, peak=-10, fi=0.01, fo=0.12)
make("gulp_2", "1-56270-A", 0.92, 1.34, hp_f=120, lp_f=7500, dn=0.4, peak=-10, fi=0.01, fo=0.12)

CREDITS = {
    "4-181563-A": ("Fire Crackling 01.wav", "kingsrow", "CC0", 181563),
    "1-37226-A": ("drinking.wav", "sagetyrtle", "CC0", 37226),
    "1-56270-A": ("Water_Drink.wav", "Q.K.", "CC0", 56270),
}
finish(CREDITS, "tools/forge-kibble-sfx.py")
