// Sync a short to a voiceover's word timings (an .srt with one word per cue,
// e.g. exported from DaVinci Resolve / CapCut auto-captions).
//
//   import { loadSrt, cues, wordCaptions } from "../../js/voiceover.js";
//   const words = await loadSrt("voiceover.srt");
//   const at = cues(words);
//   at("bathroom")          → start time (s) of that word
//   at("follow", 2)         → start of its 2nd occurrence
//   const captions = wordCaptions(el, words);  onUpdate((t) => captions(t));

// [{ start, end, text }] — multi-word cues ("into the") are split, time shared by length
export function parseSrt(src) {
  const out = [];
  const time = (s) => {
    const [h, m, rest] = s.trim().split(":");
    return +h * 3600 + +m * 60 + parseFloat(rest.replace(",", "."));
  };
  for (const block of src.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    const tl = lines.findIndex((l) => l.includes("-->"));
    if (tl < 0) continue;
    const [a, b] = lines[tl].split("-->").map(time);
    const text = lines.slice(tl + 1).join(" ").trim();
    const parts = text.split(/\s+/).filter(Boolean);
    const total = parts.reduce((n, p) => n + p.length, 0);
    let t = a;
    for (const p of parts) {
      const d = ((b - a) * p.length) / total;
      out.push({ start: t, end: t + d, text: p });
      t += d;
    }
  }
  return out;
}

export async function loadSrt(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  return parseSrt(await res.text());
}

const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// at(word, nth = 1, { end }) → the word's start (or end) time
export function cues(words) {
  return (word, nth = 1, { end = false } = {}) => {
    let n = 0;
    for (const w of words) {
      if (norm(w.text) === norm(word) && ++n === nth) return end ? w.end : w.start;
    }
    throw new Error(`Cue "${word}" #${nth} not found in the voiceover`);
  };
}

// Group words into caption lines. Either pass `lines` (the script split into on-screen
// lines, e.g. ["When your dog", "insists on"...] — matched to the words in order),
// or let it break after punctuation / when a line passes `maxChars`.
export function captionLines(words, { maxChars = 16, lines: script = null } = {}) {
  const lines = [];
  if (script) {
    let i = 0;
    for (const text of script) {
      const n = text.trim().split(/\s+/).length;
      lines.push({ words: words.slice(i, i + n) });
      i += n;
    }
    if (i < words.length) lines.push({ words: words.slice(i) });
  } else {
    let cur = null;
    for (const w of words) {
      const len = cur ? cur.words.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length : 0;
      if (!cur || len > maxChars || cur.breakAfter) {
        cur = { words: [], breakAfter: false };
        lines.push(cur);
      }
      cur.words.push(w);
      cur.breakAfter = /[.,!?;:]$/.test(w.text);
    }
  }
  const out = lines.filter((l) => l.words.length);
  out.forEach((l) => (l.start = l.words[0].start));
  out.forEach((l, i) => (l.end = out[i + 1]?.start ?? l.words.at(-1).end + 0.8));
  return out;
}

// Word-by-word captions: the line appears with its first word, each word pops in as it is spoken.
// Unspoken words keep their space (visibility: hidden) so the line never shifts.
export function wordCaptions(el, words, { maxChars = 16, lines: script = null, clean = (s) => s.toLowerCase().replace(/[.,!?;:]/g, "") } = {}) {
  const lines = captionLines(words, { maxChars, lines: script });
  let shown = null;
  let spans = [];
  return (t) => {
    const line = lines.find((l) => t >= l.start && t < l.end) ?? null;
    if (line !== shown) {
      shown = line;
      el.textContent = "";
      spans = (line?.words ?? []).map((w, i) => {
        if (i) el.append(" ");
        const s = document.createElement("span");
        s.className = "word";
        s.textContent = clean(w.text);
        el.append(s);
        return s;
      });
    }
    if (line) line.words.forEach((w, i) => (spans[i].style.visibility = t >= w.start - 0.02 ? "visible" : "hidden"));
    return line;
  };
}
