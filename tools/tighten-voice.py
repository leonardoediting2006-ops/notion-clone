# Tighten a voiceover for a fast-paced short: cut every pause and let the phrase edges overlap.
# usage: python tools/tighten-voice.py in.wav out.wav [map.json]
#   - gaps of >= 0.15 s below -40 dBFS are removed (shorter ones are stop closures inside words and stay)
#   - each phrase starts while the previous one's tail is still decaying (the next word begins 60 ms before the previous one ends
#     at sentence breaks, 25 ms elsewhere; 60 ms of soft lead-in/tail are kept so consonants like th-/wh- are never clipped),
#     never before the previous word's body (> -30 dBFS) has ended, so no syllable is masked
#   - map.json lists [orig_start, orig_end, new_start] per kept segment (to move word timings onto the new audio)
# needs numpy + soundfile; peak-normalises the result to -1 dBFS.
import sys, numpy as np, soundfile as sf, json
x, sr = sf.read(sys.argv[1])
if x.ndim > 1: x = x.mean(axis=1)
hop = int(sr*0.005); n = len(x)//hop
db = 20*np.log10(np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2))+1e-9 for i in range(n)]))
# gaps to remove (>=0.15 s below -40 dBFS); shorter ones are stop closures inside the flow and stay
gaps = []; i = 0
while i < n:
    if db[i] < -40:
        j = i
        while j < n and db[j] < -40: j += 1
        if (j-i)*0.005 >= 0.15 or i == 0 or j == n: gaps.append([i*0.005, j*0.005])
        i = j
    else: i += 1
first_on = gaps[0][1] if gaps[0][0] == 0 else 0.0
last_off = gaps[-1][0] if gaps[-1][1] >= n*0.005-0.01 else len(x)/sr
inner = [g for g in gaps if g[0] > 0.01 and g[1] < n*0.005-0.01]
# segments of speech
LEAD, TAIL = 0.06, 0.06   # keep the soft onset (th-, wh-, f-) and the soft tail (-s, -t) of every phrase
segs = []; a = max(0, first_on-LEAD)
for g0, g1 in inner:
    segs.append([a, g0+TAIL, g1-g0]); a = g1-LEAD
segs.append([a, min(len(x)/sr, last_off+TAIL), 0])
out = np.zeros(len(x)); pos = 0.0; mp = []
def last_loud(t0, t1):  # last 5 ms frame above -30 dBFS in [t0,t1]
    k = int(t1/0.005)
    while k > int(t0/0.005) and db[k] < -30: k -= 1
    return k*0.005
for si, (a, b, gap) in enumerate(segs):
    seg = x[int(a*sr):int(b*sr)].copy()
    L = len(seg); fi = int(0.008*sr)
    seg[:fi] *= np.linspace(0, 1, fi)
    if si < len(segs)-1:
        sp = -0.06 if gap >= 0.3 else -0.025        # the next word starts this much before the previous one's end (more at sentence breaks)
        ov = LEAD + TAIL - sp                       # overlap of the two padded segments
        tl = last_loud(a, b-TAIL)                   # where the word's body ends
        fo_start = max(tl - a + 0.01, (b - a) - ov - 0.03)
        k0 = int(fo_start*sr); seg[k0:] *= np.cos(np.linspace(0, np.pi/2, L-k0))**2
        nxt = pos + max(fo_start, (b - a) - ov)
    else:
        fo = int(0.05*sr); seg[-fo:] *= np.linspace(1, 0, fo); nxt = pos + L/sr
    s = int(pos*sr); out[s:s+L] += seg
    mp.append([a, b, pos]); pos = nxt
out = out[:int((mp[-1][2] + (segs[-1][1]-segs[-1][0]))*sr)]
pk = np.max(np.abs(out)); out = out/pk*10**(-1/20)
sf.write(sys.argv[2], out.astype(np.float32), sr, subtype='PCM_16')
if len(sys.argv) > 3: json.dump(mp, open(sys.argv[3], 'w'))
print('segments', len(segs), 'orig', len(x)/sr, 'new', len(out)/sr)
for a,b,p in mp: print(f"{a:.3f}-{b:.3f} -> {p:.3f}")
