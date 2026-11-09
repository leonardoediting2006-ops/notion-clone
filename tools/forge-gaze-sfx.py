#!/usr/bin/env python3
"""Forge the NEW sounds of the dog-gaze short from REAL recordings only (no synthesis).

    pip install numpy scipy soundfile noisereduce
    python3 tools/forge-gaze-sfx.py                      -> shorts/dog-gaze/sfx/*.flac (+ CREDITS-new.md)

The rest of the dog-gaze sound library (paws, pops, twinkles, heartbeats, whimpers, bells...) is copied from the dog-doorway and
dog-clothes libraries (made by forge-doorway-sfx.py and forge-clothes-sfx.py). Method: tools/sfxforge.py.
"""
from sfxforge import *

setup("shorts/dog-gaze/sfx")

# --- the campfire and the weather
make("fire", "1-17808-A", 0.20, 4.80, hp_f=90, lp_f=9500, dn=0.0, peak=-11, fi=0.4, fo=0.6)
make("rain", "1-21189-A", 0.20, 4.80, hp_f=120, lp_f=9000, dn=0.0, peak=-14, fi=0.6, fo=0.8)
make("crickets", "1-59102-A", 0.30, 4.70, hp_f=1200, lp_f=11000, dn=0.0, peak=-14, fi=0.5, fo=0.6)

# --- the animals of the animal kingdom (and the ones that orbit the Earth)
make("moo_a", "1-202111-A", 0.60, 2.20, hp_f=80, lp_f=6500, dn=0.6, peak=-9, fi=0.05, fo=0.3)
make("moo_b", "1-202111-A", 2.90, 4.40, hp_f=80, lp_f=6500, dn=0.6, rate=0.85, peak=-9, fi=0.05, fo=0.3)
make("oink", "1-208757-A", 1.75, 2.90, hp_f=200, lp_f=9000, dn=0.6, peak=-10, fi=0.01, fo=0.2)
make("baa", "1-121951-A", 0.90, 1.90, hp_f=150, lp_f=8000, dn=0.7, peak=-10, fi=0.02, fo=0.25)
make("meow", "2-110010-A", 0.00, 0.62, hp_f=250, lp_f=9500, dn=0.5, peak=-9, fi=0.01, fo=0.15, presence=1)
make("rooster", "1-34119-A", 0.20, 1.60, hp_f=200, lp_f=9500, dn=0.5, peak=-9, fi=0.01, fo=0.25)

# --- the lab
for i, (a, b) in enumerate([(0.22, 0.50), (2.48, 2.74), (4.22, 4.50)]):
    make(f"click_{i + 1}", "1-118206-A", a, b, hp_f=300, lp_f=9000, dn=0.5, peak=-10, fi=0.001, fo=0.06)
make("typing", "1-62594-A", 1.25, 3.10, hp_f=150, lp_f=9000, dn=0.7, peak=-12, fi=0.02, fo=0.2)

CREDITS = {
    "1-17808-A": ("Foc.WAV", "Everard", "CC0", 17808),
    "1-21189-A": ("Louisiana Rain 1.wav", "uberhuberman", "CC0", 21189),
    "1-59102-A": ("emmentaler crickets.wav", "Zozzy", "CC0", 59102),
    "1-202111-A": ("Two bulls singing in the desert of Arizona", "felix.blume", "CC0", 202111),
    "1-208757-A": ("Pigs in an intensive pigs farming", "felix.blume", "CC0", 208757),
    "1-121951-A": ("sheep pasture.wav", "odilonmarcenaro", "CC0", 121951),
    "2-110010-A": ("cat meow II", "tuberatanka", "CC0", 110010),
    "1-34119-A": ("cockeril.wav", "Charliefarley", "CC0", 34119),
    "1-118206-A": ("Mac Book Pro Track Pad Click.aif", "MegaPenguin13", "CC0", 118206),
    "1-62594-A": ("Keyboard.wav", "bsumusictech", "CC0", 62594),
}
finish(CREDITS, "tools/forge-gaze-sfx.py")
