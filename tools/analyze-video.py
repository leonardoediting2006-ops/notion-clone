#!/usr/bin/env python3
"""Measure a finished short against the viral formula (VIRAL_FORMULA.md): hard cuts, camera/motion energy, loudness, gaps.

  python tools/analyze-video.py out/dog-paw.mp4          # or a reference video
  python tools/analyze-video.py clip.mp4 --csv motion.csv

Prints: length, hard cuts (single-frame spikes), fast camera moves (sustained spikes), motion energy per 0.5 s
(0 = frozen, ~1-3 = a slow camera drift, 8+ = a fast move or a cut), the average shot length, the longest take,
and the voice track's loudness and silent gaps. Needs ffmpeg + numpy (Pillow is not needed).
"""
import json, subprocess, sys
import numpy as np

W, H = 108, 192  # analysis size (grayscale)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=True).stdout


def probe(path):
    j = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path]))
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    return float(j["format"]["duration"]), num / den, v["width"], v["height"], any(s["codec_type"] == "audio" for s in j["streams"])


def frames(path):
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"])
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    path = sys.argv[1]
    dur, fps, w, h, has_audio = probe(path)
    a = frames(path)
    d_all = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))      # change from frame i to i+1 (0 for a repeated frame)
    # re-encoded clips often repeat frames unevenly, so spikes are judged between *distinct* frames only
    keep = [0] + [i + 1 for i in range(len(d_all)) if d_all[i] > 0.3]
    dd = np.array([np.abs(a[keep[j + 1]] - a[keep[j]]).mean() for j in range(len(keep) - 1)])
    tt = [keep[j + 1] / fps for j in range(len(dd))]          # time of the frame that shows the change
    d = d_all
    t = lambda i: (i + 1) / fps
    print(f"{path}: {w}x{h}, {dur:.2f}s, {fps:.2f} fps, {len(a)} frames ({100 * len(keep) / len(a):.0f}% distinct)")
    print(f"motion energy: mean {d.mean():.1f}, median {np.median(dd):.1f} (per distinct frame)")

    cuts, swoops = [], []
    for j in range(1, len(dd) - 1):
        if dd[j] > 40 and dd[j] > 1.7 * max(dd[j - 1], dd[j + 1]): cuts.append(tt[j])
    run_start = None
    for j in range(len(dd)):                        # a fast move: >= 4 distinct frames in a row well above the median
        hi = dd[j] > max(14, 4 * np.median(dd)) and tt[j] not in cuts
        if hi and run_start is None: run_start = j
        if (not hi or j == len(dd) - 1) and run_start is not None:
            if j - run_start >= 4: swoops.append((tt[run_start], tt[j]))
            run_start = None
    times = [0.0] + cuts + [dur]
    shots = [b_ - a_ for a_, b_ in zip(times, times[1:])]
    print(f"hard cuts ({len(cuts)}): " + (", ".join(f"{c:.2f}s" for c in cuts) or "none"))
    print(f"fast camera moves ({len(swoops)}): " + (", ".join(f"{s_:.2f}-{e:.2f}s" for s_, e in swoops) or "none"))
    print(f"shots: {len(shots)}; average {np.mean(shots):.1f}s; longest take {max(shots):.1f}s (starts {times[int(np.argmax(shots))]:.2f}s); "
          f"first 6 s: {sum(1 for c in cuts if c < 6)} cuts")
    n = int(fps * 0.5)
    mot = [float(d[i:i + n].mean()) for i in range(0, len(d), n)]
    print("motion per 0.5 s: " + " ".join(f"{m:.0f}" for m in mot))
    if len(sys.argv) > 3 and sys.argv[2] == "--csv":
        np.savetxt(sys.argv[3], np.c_[[t(i) for i in range(len(d_all))], d_all], delimiter=",", header="t,motion", comments="")

    if has_audio:
        raw = run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "22050", "-f", "f32le", "-"])
        x = np.frombuffer(raw, np.float32); hop = 2205
        db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + hop] ** 2)) + 1e-9) for i in range(0, len(x) - hop, hop)])
        out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        lufs = [l.split()[1] for l in out.splitlines() if l.strip().startswith("I:")]
        print(f"audio: loudness {lufs[-1] if lufs else '?'} LUFS; quiet 0.1 s slices (< -45 dBFS): {int((db < -45).sum())} of {len(db)} "
              f"({'no dead air' if (db < -45).sum() == 0 else 'GAPS: ' + ', '.join(f'{i * 0.1:.1f}s' for i in np.where(db < -45)[0][:12])})")


if __name__ == "__main__":
    main()
