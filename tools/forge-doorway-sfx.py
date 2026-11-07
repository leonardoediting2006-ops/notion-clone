#!/usr/bin/env python3
"""Forge the dog-doorway sound library from REAL recordings only (no synthesis).

    pip install numpy scipy soundfile noisereduce
    python3 tools/forge-doorway-sfx.py                   -> shorts/dog-doorway/sfx/*.flac + CREDITS.md

The method is in tools/sfxforge.py. The sound design that places these on the picture is the cue sheet at the end of
shorts/dog-doorway/main.js.
"""
from sfxforge import *

setup("shorts/dog-doorway/sfx")

# --- the morning: a song thrush (one clean bird on a silent background)
make("thrush_a", "2-122616-A", 2.45, 3.00, hp_f=1200, lp_f=11000, peak=-9, fi=0.03, fo=0.15, hi=1.5)
make("thrush_b", "2-122616-A", 3.02, 4.42, hp_f=1200, lp_f=11000, peak=-9, fi=0.02, fo=0.25, hi=1.5)
make("thrush_c", "2-122616-A", 0.00, 0.86, hp_f=1200, lp_f=11000, peak=-9, fi=0.08, fo=0.2, hi=1.5)

# --- the dog
make("snore", "5-234145-A", 2.28, 3.50, hp_f=70, lp_f=7000, dn=1.0, peak=-8, fi=0.05, fo=0.2)
make("whimper_a", "5-217158-A", 0.20, 0.72, hp_f=250, lp_f=6500, dn=0.7, peak=-8, fi=0.01, fo=0.1, presence=2)
make("whimper_b", "5-217158-A", 0.70, 1.20, hp_f=250, lp_f=6500, dn=0.7, peak=-8, fi=0.01, fo=0.1, presence=2)
make("whimper_c", "5-217158-A", 1.60, 2.30, hp_f=250, lp_f=6500, dn=0.7, rate=0.92, peak=-9, fi=0.01, fo=0.18, presence=2)
make("woof_soft", "3-163459-A", 0.27, 0.62, hp_f=120, lp_f=9000, dn=0.5, rate=0.9, peak=-7, fi=0.003, fo=0.06, hi=1.5)
make("woof_low", "3-163459-A", 0.69, 1.02, hp_f=100, lp_f=8000, dn=0.5, rate=0.72, peak=-8, fi=0.003, fo=0.08)
make("growl", "3-163459-A", 0.69, 1.02, hp_f=80, lp_f=5000, dn=0.5, rate=0.5, peak=-8, fi=0.01, fo=0.2)       # the same bark, slowed down: a low rumble
for i, r in enumerate([1.45, 1.7, 1.95, 1.3]):                                                                   # claw and pad (a clean wooden tap pitched up)
    make(f"paw_{i + 1}", "1-223162-A", 0.0, 0.2, lp_f=7500, rate=r, peak=-9 - i * 0.7, fi=0.0003, fo=0.03, hi=2)
make("pad_step", "5-234855-A", 3.80, 4.00, hp_f=60, lp_f=3500, dn=0.8, rate=1.15, peak=-8, fi=0.003, fo=0.06)
make("thump", "5-234855-A", 3.80, 4.05, hp_f=40, lp_f=900, dn=0.7, rate=0.7, peak=-6, fi=0.003, fo=0.1)

# --- you
make("breath_out", "2-54962-A", 0.0, 2.55, hp_f=60, lp_f=9000, dn=0.8, peak=-10, fi=0.08, fo=0.5)
make("gasp", "3-112557-A", 2.50, 3.62, hp_f=80, lp_f=9000, dn=0.9, rate=0.93, peak=-9, fi=0.03, fo=0.25)
for i, (a, b) in enumerate([(0.15, 0.62), (1.70, 2.05), (2.35, 2.75)]):
    make(f"sniffle_{i + 1}", "5-234335-A", a, b, hp_f=250, lp_f=9000, dn=0.9, rate=0.92, peak=-11, fi=0.01, fo=0.08)
for i, (a, b) in enumerate([(0.20, 0.75), (0.85, 1.35), (2.35, 2.85), (3.00, 3.50)]):                           # your footsteps on the hard wood (clean, low, heavy)
    make(f"step_wood_{i + 1}", "4-198962-A", a, b, hp_f=60, lp_f=9000, dn=0.5, peak=-7 - 0.5 * i, fi=0.002, fo=0.12)

# --- the house: creaking boards and door, a wall clock, a till
for i, (a, b) in enumerate([(0.55, 0.83), (1.70, 2.02), (3.28, 3.70)]):
    make(f"creak_{i + 1}", "5-51149-A", a, b, hp_f=150, lp_f=8000, rate=0.8, peak=-10, fi=0.004, fo=0.06)
make("door_creak", "5-173568-A", 0.0, 0.98, hp_f=120, lp_f=10000, rate=0.85, peak=-10, fi=0.01, fo=0.2)
make("tick", "3-170377-A", 0.40, 0.62, hp_f=200, peak=-9, fi=0.001, fo=0.06)
make("tock", "3-170377-A", 1.40, 1.62, hp_f=200, peak=-9, fi=0.001, fo=0.06)
make("cash", "sp:perc_till", 0.0, 1.5, hp_f=300, peak=-9, fi=0.001, fo=0.5)
for i, r in enumerate([0.8, 0.92, 1.05]):                                                                        # wood knocks for the barricade (a clean footfall on wood, pitched)
    make(f"knock_{i + 1}", "4-198962-A", 2.35, 2.85, hp_f=60, lp_f=9000, dn=0.5, rate=r, peak=-6, fi=0.002, fo=0.12)
make("leaves", "4-181563-A", 0.20, 1.60, hp_f=900, lp_f=9000, peak=-13, fi=0.05, fo=0.4)

# --- icons and sparkle: real bells and glass, finger snaps, a heartbeat
for i, r in enumerate([1.0, 1.26, 1.5]):
    make(f"bell_{i + 1}", "2-78381-A", 0.20, 1.20, hp_f=200, dn=0.4, rate=r, peak=-10, fi=0.001, fo=0.35)
make("bell_long", "2-78381-A", 2.18, 5.00, hp_f=200, dn=0.4, peak=-8, fi=0.001, fo=0.9)
for i, r in enumerate([1.5, 2.0, 2.52]):
    make(f"twinkle_{i + 1}", "sp:perc_bell", 0.0, 2.2, hp_f=600, rate=r, peak=-12, fi=0.001, fo=0.7, hi=1.5)
for i, r in enumerate([1.9, 2.3, 2.8]):
    make(f"pop_{i + 1}", "3-156907-A", 0.36, 0.95, hp_f=300, rate=r, peak=-9, fi=0.001, fo=0.06)
make("glow", "sp:ambi_glass_rub", 0.0, 3.1, hp_f=200, lp_f=7000, peak=-16, fi=0.9, fo=1.0)
make("snap", "sp:perc_snap", 0.0, 0.30, hp_f=300, peak=-9, fi=0.0005, fo=0.08)
make("snap_low", "sp:perc_snap", 0.0, 0.30, hp_f=200, rate=0.8, peak=-10, fi=0.0005, fo=0.08)
make("heart_1", "sp:drum_bass_soft", 0.0, 0.8, lp_f=140, rate=0.68, peak=-7, fi=0.002, fo=0.25)
make("heart_2", "sp:drum_bass_soft", 0.0, 0.8, lp_f=130, rate=0.6, peak=-10, fi=0.002, fo=0.25)

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
    "4-198962-A": ("footsteps on wood", "Mydo1", "CC0", 198962),
    "5-51149-A": ("Footsteps Wooden Stairs Squeaking 1.wav", "RutgerMuller", "CC0", 51149),
    "5-173568-A": ("creaking door.wav", "Bratok999", "CC0", 173568),
    "3-170377-A": ("TicTac of a wall clock", "felix.blume", "CC0", 170377),
    "4-181563-A": ("Fire Crackling 01.wav", "kingsrow", "CC0", 181563),
    "2-78381-A": ("Angelus Bell.aif", "Peaveycroquette", "CC BY", 78381),
    "3-156907-A": ("Water drop", "Elfman-Rox", "CC0", 156907),
    "sp:perc_till": ("perc_till (Sonic Pi sample)", "Zott820", "CC0", 209578),
    "sp:perc_bell": ("perc_bell (Sonic Pi sample)", "AlaskaRobotics", "CC0", 221515),
    "sp:ambi_glass_rub": ("ambi_glass_rub (Sonic Pi sample)", "ani_music", "CC0", 198403),
    "sp:perc_snap": ("perc_snap (Sonic Pi sample)", "SoundCollectah", "CC0", 109400),
    "sp:drum_bass_soft": ("drum_bass_soft (Sonic Pi sample)", "menegass", "CC0", 100052),
}
finish(CREDITS, "tools/forge-doorway-sfx.py")
