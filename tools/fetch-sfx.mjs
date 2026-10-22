// Download REAL recorded sound effects and cut them into ready-to-use files for a short.
//
//   node tools/fetch-sfx.mjs dog-hero          → shorts/dog-hero/sfx/*.ogg  (+ CREDITS.md)
//   node tools/fetch-sfx.mjs dog-welcome       → shorts/dog-welcome/sfx/*.ogg (+ CREDITS.md)
//   node tools/fetch-sfx.mjs dog-stare         → shorts/dog-stare/sfx/*.ogg (+ CREDITS.md)
//
// Source: the ESC-50 dataset on GitHub (github.com/karolpiczak/ESC-50), 5-second clips cut
// from freesound.org field recordings. We only use clips whose ORIGINAL freesound licence is
// CC0 (public domain) or CC-BY (credit line in the short's sfx/CREDITS.md), as listed per clip in
// the dataset's LICENSE file. Needs ffmpeg on PATH. (Behind a proxy: NODE_USE_ENV_PROXY=1.)

import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RAW = "https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/";
const CACHE = join(tmpdir(), "esc50-cache");

// clip → original recording, author, licence (from ESC-50's LICENSE file)
const SRC = {
  "5-231762-A-0": ["FX_Dog Barking.wav", "davidmenke", "CC0", 231762],
  "2-118072-A-0": ["dogbark.wav", "ipears1", "CC0", 118072],
  "2-117271-A-0": ["angry_dogs.wav", "polipa", "CC0", 117271],
  "3-155312-A-0": ["Dog Barking", "Jace", "CC0", 155312],
  "1-30226-A-0": ["dogs.aiff", "Heigh-hoo", "CC0", 30226],
  "3-180977-A-0": ["Barking Dog", "Suprasummun", "CC0", 180977],
  "5-217158-A-0": ["barkingdog_in_dream.mp3", "Taira Komori", "CC-BY 3.0", 217158],
  "2-117616-A-48": ["fireworks exploding 1.wav", "soundmary", "CC0", 117616],
  "2-112213-B-39": ["Window breaking.MP3", "m1a2t3z4", "CC0", 112213],
  "4-204777-A-39": ["Breaking Glass", "ngruber", "CC0", 204777],
  "5-173568-A-33": ["creaking door.wav", "Bratok999", "CC0", 173568],
  "2-118624-A-30": ["Door Open and Close - Close Mic.wav", "E-Audio", "CC0", 118624],
  "3-170377-A-38": ["TicTac of a wall clock", "felix.blume", "CC0", 170377],
  "4-223127-A-14": ["general birdsong.wav", "keweldog", "CC0", 223127],
  "4-187769-A-14": ["binaural-birds-06-05-2013.flac", "dwareing", "CC0", 187769],
  "4-181362-A-13": ["Crickets calling at night, UK", "icuttv", "CC0", 181362],
  "1-155858-A-25": ["Footsteps in Factory Hall on Wood and Concrete.wav", "RutgerMuller", "CC0", 155858],
  "4-198962-A-25": ["footsteps on wood", "Mydo1", "CC0", 198962],
  "4-164243-A-26": ["Young girl laughing uncontrollably.mp3", "caculo", "CC0", 164243],
  "2-70936-A-42": ["police.wav", "guitarguy1985", "CC0", 70936],
  "3-117504-A-16": ["winter wind 01a.aiff", "klangfabrik", "CC0", 117504],
  "5-186924-A-12": ["Fire_Loop.wav", "ReadeOnly", "CC0", 186924],
  "2-118625-A-30": ["Door Open and Close - Ortf.wav", "E-Audio", "CC0", 118625],
  "4-181563-A-12": ["Fire Crackling 01.wav", "kingsrow", "CC0", 181563],
};
// Sonic Pi's sample library (github.com/sonic-pi-net/sonic-pi, etc/samples): freesound clips, all placed in the public domain (CC0)
const RAW_SP = "https://raw.githubusercontent.com/sonic-pi-net/sonic-pi/dev/etc/samples/";
const SP = {
  perc_bell: ["perc_bell (Sonic Pi sample)", "AlaskaRobotics", "CC0", 221515],
  ambi_sauna: ["ambi_sauna (Sonic Pi sample)", "hullum", "CC0", 415551],
};
const info = (c) => (c.startsWith("sp:") ? SP[c.slice(3)] : SRC[c]);

// name → inputs [{clip, ss (s), t (s), gain, delay (s), af (extra filters)}], post-filters, loop
const SETS = {
  "dog-hero": {
    bark_1: { in: [{ clip: "5-231762-A-0", ss: 0.33, t: 0.32 }], post: "afade=t=out:st=0.24:d=0.08" },
    bark_2: { in: [{ clip: "5-231762-A-0", ss: 0.61, t: 0.4 }], post: "afade=t=out:st=0.3:d=0.1" },
    bark_3: { in: [{ clip: "2-118072-A-0", ss: 0.56, t: 0.42 }], post: "afade=t=out:st=0.3:d=0.12" },
    // a low, steady growl (the growling between barks in "angry_dogs"), looped
    growl: {
      in: [
        { clip: "2-117271-A-0", ss: 0.66, t: 0.48, af: "lowpass=f=1300,afade=t=in:d=0.04,afade=t=out:st=0.4:d=0.08" },
        { clip: "2-117271-A-0", ss: 2.3, t: 0.52, delay: 0.42, af: "lowpass=f=1300,afade=t=in:d=0.08,afade=t=out:st=0.42:d=0.1" },
      ],
      post: "volume=1.6",
    },
    // soft dream-whimpers (CC-BY: credit Taira Komori)
    whimper: { in: [{ clip: "5-217158-A-0", ss: 0.25, t: 2.6, af: "lowpass=f=3500" }], post: "afade=t=in:d=0.05,afade=t=out:st=2.2:d=0.4" },
    // the kennels: several real dogs barking, in a hard concrete room
    shelter_dogs: {
      in: [
        { clip: "2-117271-A-0", ss: 0, t: 5, gain: 0.55 },
        { clip: "3-155312-A-0", ss: 0, t: 5, gain: 0.35, delay: 1.3 },
        { clip: "1-30226-A-0", ss: 0, t: 5, gain: 0.6, delay: 0.4 },
        { clip: "3-180977-A-0", ss: 0, t: 5, gain: 0.25, delay: 2.6 },
      ],
      post: "aecho=0.8:0.6:45|90:0.35|0.22,lowpass=f=6000,atrim=0:5,afade=t=in:d=0.05,afade=t=out:st=4.9:d=0.1",
    },
    bang: { in: [{ clip: "2-117616-A-48", ss: 1.15, t: 1.6 }], post: "afade=t=out:st=0.9:d=0.7" },
    glass: {
      in: [
        { clip: "2-112213-B-39", ss: 2.1, t: 1.6, gain: 0.9 },
        { clip: "4-204777-A-39", ss: 1.89, t: 0.9, gain: 0.55 },
      ],
      post: "afade=t=out:st=1.2:d=0.4",
    },
    door_creak: { in: [{ clip: "5-173568-A-33", ss: 0.05, t: 1.6 }], post: "afade=t=out:st=1.3:d=0.3" },
    gate: { in: [{ clip: "2-118624-A-30", ss: 0.05, t: 0.7 }], post: "afade=t=out:st=0.55:d=0.15" },
    clock: { in: [{ clip: "3-170377-A-38", ss: 0, t: 5 }] },
    birds: { in: [{ clip: "4-223127-A-14", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    birds_2: { in: [{ clip: "4-187769-A-14", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    crickets: { in: [{ clip: "4-181362-A-13", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    steps_concrete: { in: [{ clip: "1-155858-A-25", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    steps_wood: { in: [{ clip: "4-198962-A-25", ss: 0, t: 5 }], post: "volume=2.5,afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    giggle: { in: [{ clip: "4-164243-A-26", ss: 0.08, t: 2.4 }], post: "afade=t=out:st=1.9:d=0.5" },
    siren: { in: [{ clip: "2-70936-A-42", ss: 0, t: 5, af: "lowpass=f=2200" }], post: "afade=t=in:d=0.6,afade=t=out:st=3.8:d=1.2" },
    // a heart monitor's beep is an electronic tone, so this one is generated
    monitor_beep: { gen: "sine=frequency=1000:duration=0.13", post: "volume=0.5,afade=t=in:d=0.005,afade=t=out:st=0.1:d=0.03" },
  },
};

// "Puppy eyes" short: the same dogs and rooms, plus wind for the wolf and a campfire
{
  const h = SETS["dog-hero"];
  SETS["dog-eyes"] = {
    ...Object.fromEntries(["bark_3", "whimper", "shelter_dogs", "birds", "birds_2", "clock", "giggle", "steps_wood"].map((k) => [k, h[k]])),
    wind: { in: [{ clip: "3-117504-A-16", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
    fire: { in: [{ clip: "5-186924-A-12", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
  };
}

// "Why your dog stares at you": birdsong, a tail thump, a bell, a soft pad, and a stand-in for a bag crinkle
SETS["dog-stare"] = {
  birds_2: { in: [{ clip: "4-187769-A-14", ss: 0, t: 5 }], post: "afade=t=in:d=0.03,afade=t=out:st=4.97:d=0.03" },
  // a soft, low thud: one wooden knock, low-passed so it reads as a tail on the floor
  thump: { in: [{ clip: "2-118625-A-30", ss: 0.5, t: 0.45, af: "lowpass=f=450" }], post: "afade=t=out:st=0.3:d=0.15" },
  // STAND-IN for a treat-bag crinkle (a crackling fire is a similar dense, dry texture). Drop a real crinkle.wav next to it to replace it.
  crinkle_standin: { in: [{ clip: "4-181563-A-12", ss: 2.76, t: 1.2, af: "highpass=f=700" }], post: "afade=t=in:d=0.05,afade=t=out:st=1.0:d=0.2" },
  chime: { in: [{ clip: "sp:perc_bell", ss: 0, t: 2.8 }], post: "afade=t=out:st=2.2:d=0.6" },
  pad: { in: [{ clip: "sp:ambi_sauna", ss: 0, t: 4 }], post: "afade=t=in:d=1,afade=t=out:st=3:d=1" },
};

// "Why your dog goes crazy when you come home": barks, doors, footsteps, a ticking clock, whimpers, a laugh
{
  const h = SETS["dog-hero"];
  SETS["dog-welcome"] = Object.fromEntries(["bark_1", "bark_2", "bark_3", "whimper", "gate", "clock", "birds_2", "steps_wood", "giggle"].map((k) => [k, h[k]]));
}

const run = (args) => new Promise((ok, fail) => {
  const p = spawn("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });
  p.on("error", fail);
  p.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg exited ${c}`))));
});
async function clipFile(clip) {
  const sp = clip.startsWith("sp:");
  const f = join(CACHE, sp ? `${clip.slice(3)}.flac` : clip + ".wav");
  try {
    await access(f);
  } catch {
    const r = await fetch(sp ? `${RAW_SP}${clip.slice(3)}.flac` : RAW + clip + ".wav");
    if (!r.ok) throw new Error(`download failed: ${clip} (${r.status})`);
    await writeFile(f, Buffer.from(await r.arrayBuffer()));
  }
  return f;
}

const short = process.argv[2];
const set = SETS[short];
if (!set) {
  console.error(`Usage: node tools/fetch-sfx.mjs <${Object.keys(SETS).join("|")}>`);
  process.exit(1);
}
await mkdir(CACHE, { recursive: true });
const outDir = `shorts/${short}/sfx`;
await mkdir(outDir, { recursive: true });
const used = new Set();
for (const [name, spec] of Object.entries(set)) {
  if (spec.gen) {
    await run(["-f", "lavfi", "-i", spec.gen, "-af", spec.post, "-ar", "44100", "-c:a", "libvorbis", "-q:a", "6", `${outDir}/${name}.ogg`]);
    console.log("✓", name, "(generated tone)");
    continue;
  }
  const args = [];
  const chains = [];
  spec.in.forEach((s, i) => {
    used.add(s.clip);
    args.push("-i");
    args.push(null); // filled below
    const ms = Math.round((s.delay ?? 0) * 1000);
    const f = [`atrim=${s.ss}:${s.ss + s.t}`, "asetpts=PTS-STARTPTS", "aformat=channel_layouts=mono", `volume=${s.gain ?? 1}`, s.af, ms ? `adelay=${ms}` : null].filter(Boolean).join(",");
    chains.push(`[${i}]${f}[a${i}]`);
  });
  for (let i = 0, k = 0; i < args.length; i++) if (args[i] === null) args[i] = await clipFile(spec.in[k++].clip);
  const mix = spec.in.length > 1 ? `${spec.in.map((_, i) => `[a${i}]`).join("")}amix=inputs=${spec.in.length}:normalize=0:duration=longest[m]` : "[a0]anull[m]";
  // peak-normalise to -3 dBFS after the effects
  const post = [spec.post, "alimiter=limit=0.7:level=false"].filter(Boolean).join(",");
  args.push("-filter_complex", `${chains.join(";")};${mix};[m]${post}[o]`, "-map", "[o]", "-ar", "44100", "-c:a", "libvorbis", "-q:a", "6", `${outDir}/${name}.ogg`);
  await run(args);
  console.log("✓", name);
}
// credits
const lines = [...used].map((c) => {
  const [title, author, lic, id] = info(c);
  return `| ${c} | "${title}" by ${author} — https://freesound.org/s/${id}/ | ${lic} |`;
});
const by = [...used].filter((c) => info(c)[2].startsWith("CC-BY")).map((c) => `"${info(c)[0]}" by ${info(c)[1]} (freesound.org, CC BY 3.0)`);
await writeFile(`${outDir}/CREDITS.md`, `# Sound effects — real recordings

Cut from the [ESC-50 dataset](https://github.com/karolpiczak/ESC-50) (clips of freesound.org field
recordings) and Sonic Pi's CC0 sample library by \`tools/fetch-sfx.mjs\`. Only clips whose original licence is CC0 or CC-BY are used.

| Clip | Original recording | Licence |
|---|---|---|
${lines.join("\n")}

${by.length ? `## Video description credit (CC-BY sounds)

\`\`\`
Sounds: ${by.join("; ")}.
\`\`\`
` : "All of these are CC0 (public domain): no credit line is needed."}
`);
console.log(`Saved ${Object.keys(set).length} sounds to ${outDir}/ (+ CREDITS.md)`);
