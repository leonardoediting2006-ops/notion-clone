// Pixel-font captions in the style of the viral reference: ONE chunk on screen at a time (one word, or a glued pair of fast words),
// centred, always the same size, chunky bitmap letters: yellow fill, dark red outline, a thin cool glow, a little pop on each new chunk.
// The letters are drawn from a built-in 5x9 bitmap font onto a canvas, so they look identical on every machine (no font needed)
// and stay razor sharp when the video is rendered at 2x.
//
//   import { pixelCaptions } from "../../js/caption-pixel.js";
//   const captions = pixelCaptions(document.getElementById("caption"), chunks);   // chunks = loadSrt-style [{start, end, text}] (one per caption)
//   onUpdate((t) => captions(t));
//
// Pure function of time: any frame can be redrawn.

const FONT = {
  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####", ".....", "....."],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####.", ".....", "....."],
  c: [".....", ".....", ".###.", "#...#", "#....", "#...#", ".###.", ".....", "....."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####", ".....", "....."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###.", ".....", "....."],
  f: ["..##.", ".#..#", ".#...", "###..", ".#...", ".#...", ".#...", ".....", "....."],
  g: [".....", ".....", ".####", "#...#", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#", ".....", "....."],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###.", ".....", "....."],
  j: ["...#.", ".....", "..##.", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#.", ".....", "....."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###.", ".....", "....."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#", ".....", "....."],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#", ".....", "....."],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###.", ".....", "....."],
  p: [".....", ".....", "####.", "#...#", "#...#", "#...#", "####.", "#....", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", "#...#", ".####", "....#", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#....", ".....", "....."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####.", ".....", "....."],
  t: [".#...", ".#...", "###..", ".#...", ".#...", ".#..#", "..##.", ".....", "....."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".####", ".....", "....."],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#..", ".....", "....."],
  w: [".....", ".....", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#.", ".....", "....."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", ".....", "....."],
  y: [".....", ".....", "#...#", "#...#", "#...#", "#...#", ".####", "....#", ".###."],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####", ".....", "....."],
  "'": [".#.", ".#.", "#..", "...", "...", "...", "...", "...", "..."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", ".....", ".....", "....."],
  " ": ["...", "...", "...", "...", "...", "...", "...", "...", "..."],
};

const clean = (s) => s.toLowerCase().replace(/[^a-z' -]/g, "").trim();

export function pixelCaptions(el, chunks, { unit = 12, top = 1235, width = 1080, scale = null, fill = "#ffe21f", fillLow = "#ffb81c", outline = "#b3121c", glow = "#2ab0ff", pop = 0.09 } = {}) {
  const SC = scale ?? Math.min(4, Math.max(1, Number(new URLSearchParams(location.search).get("scale")) || 1));
  const canvas = document.createElement("canvas");
  const H = unit * 9 + 4 * unit, W = width;
  canvas.width = W * SC; canvas.height = H * SC;
  canvas.style.cssText = `position:absolute;left:0;top:${top}px;width:${W}px;height:${H}px;pointer-events:none`;
  el.textContent = ""; el.style.cssText = "position:absolute;inset:0;pointer-events:none;-webkit-text-stroke:0";
  el.append(canvas);
  const ctx = canvas.getContext("2d");
  let last = -1;
  const rows = (text) => {
    const g = [...text].map((c) => FONT[c] ?? FONT[" "]);
    const cols = g.reduce((n, gl) => n + gl[0].length + 1, -1);
    return { g, cols };
  };
  function draw(text, k) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!text) return;
    let { g, cols } = rows(text);
    let U = unit; if (cols * U > W - 60) U = (W - 60) / cols;
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    // pop: a quick overshoot scale about the centre of the line
    const cx = W / 2, cy = unit * 2 + (unit * 9) / 2 + unit;
    const s = 1 + 0.16 * (1 - k) * (1 - k);                 // a little pop-in: starts 16 % big and settles
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    const x0 = (W - cols * U) / 2, y0 = unit * 2 + unit;
    const cells = []; let x = x0;
    for (const gl of g) { for (let r = 0; r < gl.length; r++) for (let c = 0; c < gl[0].length; c++) if (gl[r][c] === "#") cells.push([x + c * U, y0 + r * U]); x += (gl[0].length + 1) * U; }
    const sq = (px, py, grow, color) => { ctx.fillStyle = color; ctx.fillRect(px - grow, py - grow, U + 2 * grow, U + 2 * grow); };
    // cool glow, dark red outline, then the yellow letters with a warmer lower edge
    ctx.save(); ctx.filter = `blur(${U * 0.35}px)`; for (const [px, py] of cells) sq(px, py, U * 0.95, glow); ctx.restore();
    for (const [px, py] of cells) sq(px, py, U * 0.55, outline);
    for (const [px, py] of cells) sq(px, py, 0, fill);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = fillLow; for (const [px, py] of cells) ctx.fillRect(px, py + U * 0.62, U, U * 0.38);
    ctx.globalCompositeOperation = "source-over";
  }
  return (t) => {
    let i = -1;
    for (let j = 0; j < chunks.length; j++) if (t >= chunks[j].start - 0.005 && t < chunks[j].end) { i = j; break; }
    const k = i < 0 ? 1 : Math.min(1, (t - chunks[i].start) / pop);
    const key = i * 1000 + Math.round(k * 20);
    if (key === last) return i;
    last = key; draw(i < 0 ? "" : clean(chunks[i].text), k); return i;
  };
}
