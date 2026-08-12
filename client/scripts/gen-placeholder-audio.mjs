/**
 * Placeholder audio pack generator.
 *
 * ── Why this exists ───────────────────────────────────────────────────
 * `src/services/AudioManager.ts` and `src/assets/audio/themes/manifests.ts`
 * describe a complete audio system — three themes, ~56 keys each, volume
 * buses, crossfade, preload. `public/audio/themes/**` contained nothing but
 * `.gitkeep` files, so every one of those URLs 404'd. AudioManager swallows
 * load errors with a dev-only warning (by design), so the app shipped silent
 * and nothing pointed at the cause.
 *
 * This script synthesizes a stand-in for every file the manifest names, so
 * the audio system can actually be heard, tested, and tuned before anyone
 * records real assets.
 *
 * ── What it does NOT do ───────────────────────────────────────────────
 * These are not sound design. They are recognisably-shaped noises: a click
 * is a click, a dice roll rattles, an error buzzes. They exist so the wiring
 * is exercised end to end. Real recordings drop in over the top — see the
 * `.mp3` note below.
 *
 * ── Why .wav ──────────────────────────────────────────────────────────
 * The manifest names `.mp3`. Encoding MP3 would mean pulling in an encoder
 * dependency for throwaway assets, so each placeholder is written as a `.wav`
 * sibling instead (`dice.mp3` → `dice.wav`). AudioManager retries the `.wav`
 * when the `.mp3` fails to load, so dropping a real `.mp3` in beside it makes
 * the real file win with no code or manifest change.
 *
 * Usage:  npm run audio:placeholders
 *         npm run audio:placeholders -- --force   (overwrite existing)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = resolve(HERE, "..");
const MANIFEST = resolve(CLIENT_ROOT, "src/assets/audio/themes/manifests.ts");
const PUBLIC_ROOT = resolve(CLIENT_ROOT, "public");

const FORCE = process.argv.includes("--force");

/* ── Manifest parsing ──────────────────────────────────────────────────
 * The manifest builds every path through the same `f(theme, category, file)`
 * helper, so the paths are derivable without executing TypeScript. Reading
 * them from the manifest (rather than restating them here) is what keeps this
 * generator from drifting out of sync when a key is added.
 */

function parseManifestPaths(rawSource) {
  // Strip comments first. The `f()` helper is documented with a worked example
  // (`f("classic", "ui", "click.mp3")`), and matching that produced a phantom
  // 196th path with no corresponding AudioKey.
  const source = rawSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  const paths = new Set();

  // The soundboard block is a function of `theme`: f(theme, "soundboard", "x.mp3").
  // Collect its (category, file) pairs once, then expand per theme below.
  const soundboardPairs = [];
  const sbBlock = source.match(/const soundboardFiles[\s\S]*?\n\}\);/);
  if (sbBlock) {
    for (const m of sbBlock[0].matchAll(/f\(\s*theme\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g)) {
      soundboardPairs.push([m[1], m[2]]);
    }
  }

  // Literal calls: f("classic", "ui", "wooden-click.mp3")
  for (const m of source.matchAll(/f\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g)) {
    paths.add(`/audio/themes/${m[1]}/${m[2]}/${m[3]}`);
  }

  // Spread sites: ...soundboardFiles("classic")
  for (const m of source.matchAll(/soundboardFiles\(\s*"([^"]+)"\s*\)/g)) {
    const theme = m[1];
    for (const [category, file] of soundboardPairs) {
      paths.add(`/audio/themes/${theme}/${category}/${file}`);
    }
  }

  return [...paths].sort();
}

/* ── WAV encoding (16-bit PCM, mono) ──────────────────────────────────── */

function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/* ── Synthesis primitives ─────────────────────────────────────────────── */

const SR = 22050; // plenty for short effects
// Music beds are two orders of magnitude longer than an effect, so they set
// the size of the whole pack. 11 kHz is audibly poor and that is fine — these
// exist to prove looping and crossfade work, not to be listened to.
const MUSIC_SR = 11025;
const MUSIC_BARS = 2;

/** Deterministic RNG so regenerating the pack produces identical bytes. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TAU = Math.PI * 2;

/** Attack/decay envelope. `curve` > 1 decays faster at the start. */
function env(t, dur, attack = 0.005, curve = 3) {
  if (t < attack) return t / attack;
  const x = (t - attack) / Math.max(1e-6, dur - attack);
  return Math.max(0, Math.pow(1 - Math.min(1, x), curve));
}

function makeBuffer(dur, sr = SR) {
  return new Float32Array(Math.max(1, Math.floor(dur * sr)));
}

/** Soft-clip so layered partials never wrap around. */
function softClip(x) {
  return Math.tanh(x * 1.2) * 0.85;
}

/** One-pole low-pass, used to take the fizz off white noise. */
function lowPass(buf, cutoffHz, sr = SR) {
  const dt = 1 / sr;
  const rc = 1 / (TAU * cutoffHz);
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev += alpha * (buf[i] - prev);
    buf[i] = prev;
  }
  return buf;
}

/** One-pole high-pass — keeps low-frequency rumble out of noisy effects. */
function highPass(buf, cutoffHz, sr = SR) {
  const dt = 1 / sr;
  const rc = 1 / (TAU * cutoffHz);
  const alpha = rc / (rc + dt);
  let prevIn = buf[0] ?? 0;
  let prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    prevOut = alpha * (prevOut + x - prevIn);
    prevIn = x;
    buf[i] = prevOut;
  }
  return buf;
}

function normalize(buf, peak = 0.82) {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max < 1e-6) return buf;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

/** Fade the very edges so nothing clicks on start/stop. */
function deClick(buf, ms = 4, sr = SR) {
  const n = Math.min(Math.floor((ms / 1000) * sr), Math.floor(buf.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    buf[i] *= g;
    buf[buf.length - 1 - i] *= g;
  }
  return buf;
}

/* ── Voices ───────────────────────────────────────────────────────────── */

/** Tone with optional pitch glide and inharmonic partials (bell-like). */
function tone(dur, freq, opts = {}) {
  const {
    sr = SR,
    partials = [1],
    glide = 1,
    attack = 0.004,
    curve = 3,
    wave = "sine",
    detune = 0,
  } = opts;
  const buf = makeBuffer(dur, sr);
  const phases = partials.map(() => 0);
  for (let i = 0; i < buf.length; i++) {
    const t = i / sr;
    const e = env(t, dur, attack, curve);
    const f = freq * Math.pow(glide, t / dur);
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      const ratio = partials[p];
      phases[p] += (TAU * (f * ratio + detune * p)) / sr;
      const ph = phases[p];
      const amp = 1 / (p + 1);
      if (wave === "square") s += amp * (Math.sin(ph) >= 0 ? 1 : -1);
      else if (wave === "saw") s += amp * (2 * (((ph / TAU) % 1) - 0.5));
      else if (wave === "triangle") s += amp * (2 / Math.PI) * Math.asin(Math.sin(ph));
      else s += amp * Math.sin(ph);
    }
    buf[i] = softClip(s * e * 0.6);
  }
  return buf;
}

/** Filtered noise burst — the basis for clicks, rattles, whooshes, crowds. */
function noise(dur, opts = {}) {
  const {
    sr = SR,
    seed = 1,
    lp = 6000,
    hp = 120,
    attack = 0.003,
    curve = 3,
    shimmer = 0,
  } = opts;
  const rnd = mulberry32(seed);
  const buf = makeBuffer(dur, sr);
  for (let i = 0; i < buf.length; i++) {
    const t = i / sr;
    let e = env(t, dur, attack, curve);
    // `shimmer` gives the envelope a tremolo — turns flat noise into
    // applause / crowd / rattle textures rather than a hiss.
    if (shimmer > 0) e *= 1 - shimmer * 0.5 * (1 + Math.sin(TAU * shimmer * 9 * t));
    buf[i] = (rnd() * 2 - 1) * e;
  }
  lowPass(buf, lp, sr);
  highPass(buf, hp, sr);
  return buf;
}

function mix(...bufs) {
  const len = Math.max(...bufs.map((b) => b.length));
  const out = new Float32Array(len);
  for (const b of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i];
  for (let i = 0; i < len; i++) out[i] = softClip(out[i]);
  return out;
}

/** Lay `b` into `a` starting at `atSec`, growing the buffer if needed. */
function at(a, b, atSec, sr = SR) {
  const off = Math.floor(atSec * sr);
  const len = Math.max(a.length, off + b.length);
  const out = new Float32Array(len);
  out.set(a, 0);
  for (let i = 0; i < b.length; i++) out[off + i] = softClip(out[off + i] + b[i]);
  return out;
}

/** A run of notes — used for chimes, jingles and the music beds. */
function sequence(notes, opts = {}) {
  const { sr = SR } = opts;
  let out = new Float32Array(1);
  for (const n of notes) {
    out = at(out, tone(n.dur, n.freq, { sr, ...(n.opts || {}) }), n.at, sr);
  }
  return out;
}

/* ── Theme character ──────────────────────────────────────────────────
 * The three themes must be distinguishable, otherwise the theme picker in
 * AudioSettings can't actually be tested. Classic is warm and soft-edged,
 * Modern is bright and clipped, Festival is resonant and percussive.
 */
const THEME_CHARACTER = {
  classic: { pitch: 0.92, decay: 1.15, wave: "sine", bright: 4200 },
  modern: { pitch: 1.12, decay: 0.78, wave: "triangle", bright: 8000 },
  festival: { pitch: 1.0, decay: 1.35, wave: "sine", bright: 6000 },
};

/* ── Recipes ──────────────────────────────────────────────────────────
 * Keyed by filename stem. Each returns a Float32Array. `c` is the theme
 * character, `seed` is derived from the full path so every file is stable
 * across runs but different from its neighbours.
 */

const MAJOR = [0, 2, 4, 7, 9, 12, 16, 19];
const semis = (root, n) => root * Math.pow(2, n / 12);

const RECIPES = {
  /* — UI — */
  "wooden-click": (c, s) => mix(noise(0.045, { seed: s, lp: 2600, hp: 400, curve: 6 }),
    tone(0.05, 420 * c.pitch, { partials: [1, 2.4], curve: 8, wave: c.wave })),
  "digital-click": (c, s) => tone(0.035, 1400 * c.pitch, { curve: 9, wave: "square", attack: 0.001 }),
  "temple-bell-tap": (c, s) => tone(0.5 * c.decay, 880 * c.pitch, { partials: [1, 2.7, 5.4], curve: 2.2 }),
  "pencil-tap": (c, s) => noise(0.03, { seed: s, lp: 5200, hp: 900, curve: 8 }),
  hover: (c, s) => tone(0.05, 1900 * c.pitch, { curve: 7, wave: "sine", attack: 0.002 }),
  "wooden-percussion": (c, s) => mix(noise(0.05, { seed: s, lp: 2000, hp: 300, curve: 7 }),
    tone(0.07, 300 * c.pitch, { curve: 6 })),
  "cassette-open": (c, s) => mix(noise(0.16, { seed: s, lp: 3000, hp: 250, curve: 2.5 }),
    tone(0.18, 300 * c.pitch, { glide: 1.7, curve: 3, wave: c.wave })),
  "cassette-close": (c, s) => mix(noise(0.14, { seed: s, lp: 2600, hp: 250, curve: 3 }),
    tone(0.16, 480 * c.pitch, { glide: 0.55, curve: 3, wave: c.wave })),
  "popup-open": (c, s) => tone(0.16, 520 * c.pitch, { glide: 1.9, curve: 3, wave: c.wave }),
  "popup-close": (c, s) => tone(0.15, 900 * c.pitch, { glide: 0.5, curve: 3, wave: c.wave }),
  "conch-open": (c, s) => tone(0.55 * c.decay, 320 * c.pitch, { partials: [1, 2, 3], glide: 1.25, curve: 1.8, attack: 0.05 }),
  "conch-close": (c, s) => tone(0.5 * c.decay, 380 * c.pitch, { partials: [1, 2, 3], glide: 0.75, curve: 2, attack: 0.04 }),
  switch: (c, s) => mix(noise(0.04, { seed: s, lp: 4000, hp: 800, curve: 8 }),
    tone(0.05, 700 * c.pitch, { curve: 9, wave: "square" })),
  toggle: (c, s) => tone(0.06, 1100 * c.pitch, { glide: 1.5, curve: 7, wave: "square" }),
  ghungroo: (c, s) => mix(noise(0.3, { seed: s, lp: 9000, hp: 2600, curve: 2.4, shimmer: 0.7 }),
    tone(0.25, 2400 * c.pitch, { partials: [1, 1.9], curve: 4 })),
  "school-bell": (c, s) => sequence([
    { at: 0, dur: 0.6 * c.decay, freq: 1050 * c.pitch, opts: { partials: [1, 2.8, 4.3], curve: 2 } },
    { at: 0.18, dur: 0.6 * c.decay, freq: 1180 * c.pitch, opts: { partials: [1, 2.8], curve: 2 } },
  ]),
  notification: (c, s) => sequence([
    { at: 0, dur: 0.16, freq: semis(880, 0) * c.pitch, opts: { curve: 4, wave: c.wave } },
    { at: 0.11, dur: 0.28, freq: semis(880, 7) * c.pitch, opts: { curve: 3, wave: c.wave } },
  ]),
  "temple-bell": (c, s) => tone(1.1 * c.decay, 660 * c.pitch, { partials: [1, 2.76, 5.4, 8.9], curve: 1.5 }),
  "chalk-swipe": (c, s) => noise(0.22, { seed: s, lp: 5200, hp: 1400, curve: 2, attack: 0.03 }),
  swipe: (c, s) => noise(0.18, { seed: s, lp: 7000, hp: 1800, curve: 2.2, attack: 0.025 }),
  "drum-roll": (c, s) => noise(0.55, { seed: s, lp: 2600, hp: 180, curve: 1.4, attack: 0.12, shimmer: 1.6 }),
  "page-flip": (c, s) => noise(0.17, { seed: s, lp: 6200, hp: 900, curve: 2.6, attack: 0.02 }),
  scroll: (c, s) => noise(0.1, { seed: s, lp: 5000, hp: 1500, curve: 4 }),
  "tabla-tap": (c, s) => mix(tone(0.16, 240 * c.pitch, { glide: 0.6, curve: 5 }),
    noise(0.06, { seed: s, lp: 3400, hp: 500, curve: 6 })),

  /* — System — */
  tick: (c, s) => noise(0.028, { seed: s, lp: 4200, hp: 1200, curve: 9 }),
  countdown: (c, s) => tone(0.2, 720 * c.pitch, { curve: 4, wave: c.wave, partials: [1, 2] }),
  success: (c, s) => sequence([
    { at: 0, dur: 0.14, freq: semis(523, 0) * c.pitch, opts: { curve: 4, wave: c.wave } },
    { at: 0.1, dur: 0.14, freq: semis(523, 4) * c.pitch, opts: { curve: 4, wave: c.wave } },
    { at: 0.2, dur: 0.36, freq: semis(523, 7) * c.pitch, opts: { curve: 2.6, wave: c.wave, partials: [1, 2] } },
  ]),
  error: (c, s) => mix(tone(0.28, 190 * c.pitch, { wave: "square", curve: 2.6, glide: 0.82 }),
    tone(0.28, 143 * c.pitch, { wave: "square", curve: 2.6, glide: 0.82 })),
  loading: (c, s) => sequence([
    { at: 0, dur: 0.18, freq: 500 * c.pitch, opts: { curve: 3, wave: c.wave } },
    { at: 0.24, dur: 0.18, freq: 620 * c.pitch, opts: { curve: 3, wave: c.wave } },
  ]),

  /* — Rummy / cards — */
  shuffle: (c, s) => {
    let out = new Float32Array(1);
    const rnd = mulberry32(s);
    for (let i = 0; i < 11; i++) {
      out = at(out, noise(0.05, { seed: s + i * 7, lp: 5200, hp: 900, curve: 5 }), i * 0.045 + rnd() * 0.012);
    }
    return out;
  },
  deal: (c, s) => {
    let out = new Float32Array(1);
    for (let i = 0; i < 4; i++) {
      out = at(out, noise(0.07, { seed: s + i * 13, lp: 4600, hp: 700, curve: 4 }), i * 0.11);
    }
    return out;
  },
  pick: (c, s) => noise(0.09, { seed: s, lp: 5000, hp: 800, curve: 3.4, attack: 0.012 }),
  drop: (c, s) => mix(noise(0.1, { seed: s, lp: 3400, hp: 400, curve: 4 }),
    tone(0.1, 260 * c.pitch, { glide: 0.7, curve: 5 })),
  "joker-reveal": (c, s) => sequence([
    { at: 0, dur: 0.16, freq: semis(660, 0) * c.pitch, opts: { curve: 4, wave: c.wave } },
    { at: 0.1, dur: 0.16, freq: semis(660, 5) * c.pitch, opts: { curve: 4, wave: c.wave } },
    { at: 0.2, dur: 0.45, freq: semis(660, 12) * c.pitch, opts: { curve: 2.2, partials: [1, 2], wave: c.wave } },
  ]),
  "meld-success": (c, s) => sequence(MAJOR.slice(0, 4).map((n, i) => ({
    at: i * 0.075, dur: 0.3, freq: semis(587, n) * c.pitch, opts: { curve: 3, wave: c.wave },
  }))),
  invalid: (c, s) => tone(0.22, 165 * c.pitch, { wave: "square", curve: 3, glide: 0.75 }),
  "your-turn": (c, s) => sequence([
    { at: 0, dur: 0.2, freq: semis(784, 0) * c.pitch, opts: { curve: 3.4, wave: c.wave } },
    { at: 0.14, dur: 0.34, freq: semis(784, 4) * c.pitch, opts: { curve: 2.6, partials: [1, 2], wave: c.wave } },
  ]),
  "opponent-turn": (c, s) => tone(0.24, 392 * c.pitch, { curve: 3.4, wave: c.wave }),

  /* — Dice / board movement — */
  dice: (c, s) => {
    let out = new Float32Array(1);
    const rnd = mulberry32(s);
    for (let i = 0; i < 6; i++) {
      out = at(out, mix(
        noise(0.05, { seed: s + i * 31, lp: 3800, hp: 700, curve: 6 }),
        tone(0.05, (200 + rnd() * 160) * c.pitch, { curve: 7 }),
      ), i * 0.062 + rnd() * 0.02);
    }
    return out;
  },
  move: (c, s) => tone(0.09, 520 * c.pitch, { glide: 1.35, curve: 5, wave: c.wave }),
  capture: (c, s) => mix(noise(0.24, { seed: s, lp: 2800, hp: 200, curve: 2.6 }),
    tone(0.26, 300 * c.pitch, { glide: 0.42, curve: 2.8, wave: "saw" })),
  safe: (c, s) => tone(0.3, 700 * c.pitch, { partials: [1, 2, 3], curve: 2.6, attack: 0.01 }),
  finish: (c, s) => sequence(MAJOR.slice(0, 5).map((n, i) => ({
    at: i * 0.08, dur: 0.36, freq: semis(523, n) * c.pitch, opts: { curve: 2.6, wave: c.wave },
  }))),
  win: (c, s) => sequence(MAJOR.map((n, i) => ({
    at: i * 0.09, dur: 0.6, freq: semis(523, n) * c.pitch, opts: { curve: 2, partials: [1, 2], wave: c.wave },
  }))),
  "ladder-climb": (c, s) => tone(0.6, 300 * c.pitch, { glide: 3.2, curve: 1.8, wave: c.wave, partials: [1, 2] }),
  ladder: (c, s) => tone(0.6, 300 * c.pitch, { glide: 3.2, curve: 1.8, wave: c.wave, partials: [1, 2] }),
  "snake-bite": (c, s) => mix(tone(0.55, 640 * c.pitch, { glide: 0.28, curve: 1.9, wave: "saw" }),
    noise(0.3, { seed: s, lp: 6500, hp: 1800, curve: 2.4 })),
  snake: (c, s) => mix(tone(0.55, 640 * c.pitch, { glide: 0.28, curve: 1.9, wave: "saw" }),
    noise(0.3, { seed: s, lp: 6500, hp: 1800, curve: 2.4 })),

  /* — Hand cricket — */
  "bat-hit": (c, s) => mix(noise(0.09, { seed: s, lp: 4200, hp: 500, curve: 6 }),
    tone(0.11, 380 * c.pitch, { glide: 0.55, curve: 6 })),
  bat: (c, s) => mix(noise(0.09, { seed: s, lp: 4200, hp: 500, curve: 6 }),
    tone(0.11, 380 * c.pitch, { glide: 0.55, curve: 6 })),
  four: (c, s) => sequence([
    { at: 0, dur: 0.18, freq: semis(523, 0) * c.pitch, opts: { curve: 3, wave: c.wave } },
    { at: 0.12, dur: 0.4, freq: semis(523, 7) * c.pitch, opts: { curve: 2.4, partials: [1, 2], wave: c.wave } },
  ]),
  six: (c, s) => sequence([
    { at: 0, dur: 0.18, freq: semis(523, 0) * c.pitch, opts: { curve: 3, wave: c.wave } },
    { at: 0.12, dur: 0.18, freq: semis(523, 7) * c.pitch, opts: { curve: 3, wave: c.wave } },
    { at: 0.24, dur: 0.55, freq: semis(523, 12) * c.pitch, opts: { curve: 2, partials: [1, 2, 3], wave: c.wave } },
  ]),
  wicket: (c, s) => mix(noise(0.3, { seed: s, lp: 3200, hp: 300, curve: 2.6 }),
    tone(0.32, 220 * c.pitch, { glide: 0.35, curve: 2.6, wave: "saw" })),
  out: (c, s) => tone(0.42, 300 * c.pitch, { glide: 0.4, curve: 2.4, wave: "saw", partials: [1, 2] }),
  toss: (c, s) => mix(tone(0.5, 1500 * c.pitch, { partials: [1, 2.5], glide: 1.5, curve: 2.4 }),
    tone(0.5, 1900 * c.pitch, { partials: [1, 2.1], glide: 0.7, curve: 2.6 })),
  "crowd-cheer": (c, s) => noise(1.5, { seed: s, lp: 3200, hp: 300, curve: 1.1, attack: 0.35, shimmer: 1.1 }),
  crowd: (c, s) => noise(1.5, { seed: s, lp: 3200, hp: 300, curve: 1.1, attack: 0.35, shimmer: 1.1 }),

  /* — Rewards — */
  "coin-box": (c, s) => sequence([
    { at: 0, dur: 0.1, freq: 1050 * c.pitch, opts: { curve: 5, wave: c.wave } },
    { at: 0.07, dur: 0.32, freq: 1570 * c.pitch, opts: { curve: 3, partials: [1, 2], wave: c.wave } },
  ]),
  coin: (c, s) => sequence([
    { at: 0, dur: 0.1, freq: 1050 * c.pitch, opts: { curve: 5, wave: c.wave } },
    { at: 0.07, dur: 0.32, freq: 1570 * c.pitch, opts: { curve: 3, partials: [1, 2], wave: c.wave } },
  ]),
  "coins-rain": (c, s) => {
    let out = new Float32Array(1);
    const rnd = mulberry32(s);
    for (let i = 0; i < 22; i++) {
      out = at(out, tone(0.22, (900 + rnd() * 1300) * c.pitch, { curve: 4, partials: [1, 2] }), rnd() * 1.25);
    }
    return out;
  },
  cashback: (c, s) => sequence(MAJOR.slice(0, 4).map((n, i) => ({
    at: i * 0.09, dur: 0.4, freq: semis(659, n) * c.pitch, opts: { curve: 2.6, partials: [1, 2], wave: c.wave },
  }))),
  unlock: (c, s) => sequence([
    { at: 0, dur: 0.12, freq: 440 * c.pitch, opts: { curve: 5, wave: c.wave } },
    { at: 0.1, dur: 0.5, freq: 880 * c.pitch, opts: { curve: 2.2, partials: [1, 2, 3], wave: c.wave } },
  ]),
  achievement: (c, s) => sequence(MAJOR.slice(0, 5).map((n, i) => ({
    at: i * 0.085, dur: 0.5, freq: semis(587, n) * c.pitch, opts: { curve: 2.2, partials: [1, 2], wave: c.wave },
  }))),
  "achievement-whistle": (c, s) => tone(0.5, 1600 * c.pitch, { glide: 1.7, curve: 2.4, partials: [1, 2.02] }),
  "level-up": (c, s) => sequence(MAJOR.slice(0, 6).map((n, i) => ({
    at: i * 0.07, dur: 0.45, freq: semis(523, n) * c.pitch, opts: { curve: 2.4, partials: [1, 2], wave: c.wave },
  }))),
  "children-cheering": (c, s) => noise(1.6, { seed: s, lp: 4200, hp: 500, curve: 1.1, attack: 0.3, shimmer: 1.4 }),
  "celebration-drums": (c, s) => {
    let out = new Float32Array(1);
    for (let i = 0; i < 8; i++) {
      out = at(out, mix(
        tone(0.2, (i % 2 ? 150 : 210) * c.pitch, { glide: 0.55, curve: 4 }),
        noise(0.09, { seed: s + i * 17, lp: 2400, hp: 260, curve: 5 }),
      ), i * 0.16);
    }
    return out;
  },
  fireworks: (c, s) => {
    let out = new Float32Array(1);
    const rnd = mulberry32(s);
    for (let i = 0; i < 5; i++) {
      out = at(out, mix(
        tone(0.14, 120 * c.pitch, { glide: 0.5, curve: 5 }),
        noise(0.75, { seed: s + i * 23, lp: 7000, hp: 900, curve: 2, attack: 0.008, shimmer: 0.9 }),
      ), rnd() * 1.5);
    }
    return out;
  },
  "festival-crowd": (c, s) => noise(1.8, { seed: s, lp: 3600, hp: 400, curve: 1.05, attack: 0.4, shimmer: 1.2 }),

  /* — Soundboard — */
  dhol: (c, s) => {
    let out = new Float32Array(1);
    for (let i = 0; i < 6; i++) {
      out = at(out, mix(
        tone(0.24, (i % 3 === 0 ? 130 : 190) * c.pitch, { glide: 0.5, curve: 4 }),
        noise(0.08, { seed: s + i * 19, lp: 2200, hp: 220, curve: 5 }),
      ), i * 0.19);
    }
    return out;
  },
  applause: (c, s) => noise(2.0, { seed: s, lp: 5200, hp: 700, curve: 1.15, attack: 0.12, shimmer: 1.8 }),
  tada: (c, s) => sequence([
    { at: 0, dur: 0.22, freq: semis(523, 0) * c.pitch, opts: { curve: 3.4, partials: [1, 2], wave: c.wave } },
    { at: 0.16, dur: 0.9, freq: semis(523, 7) * c.pitch, opts: { curve: 1.7, partials: [1, 2, 3], wave: c.wave } },
  ]),
  shankh: (c, s) => tone(1.5, 300 * c.pitch, { partials: [1, 2, 3, 4], glide: 1.12, curve: 1.3, attack: 0.22 }),
  airhorn: (c, s) => mix(tone(0.9, 420 * c.pitch, { wave: "saw", curve: 1.5, attack: 0.02 }),
    tone(0.9, 424 * c.pitch, { wave: "saw", curve: 1.5, attack: 0.02 })),
  laugh: (c, s) => {
    let out = new Float32Array(1);
    const rnd = mulberry32(s);
    for (let i = 0; i < 7; i++) {
      out = at(out, tone(0.13, (260 + rnd() * 90) * c.pitch, { glide: 0.7, curve: 3.4, partials: [1, 2, 3], wave: "saw" }), i * 0.15);
    }
    return out;
  },
  boo: (c, s) => tone(1.1, 175 * c.pitch, { wave: "saw", glide: 0.72, curve: 1.7, attack: 0.09, partials: [1, 2] }),
  "sad-trombone": (c, s) => sequence([
    { at: 0, dur: 0.34, freq: semis(330, 0) * c.pitch, opts: { wave: "saw", curve: 2.4, glide: 0.94, partials: [1, 2] } },
    { at: 0.3, dur: 0.34, freq: semis(330, -2) * c.pitch, opts: { wave: "saw", curve: 2.4, glide: 0.94, partials: [1, 2] } },
    { at: 0.6, dur: 0.34, freq: semis(330, -4) * c.pitch, opts: { wave: "saw", curve: 2.4, glide: 0.94, partials: [1, 2] } },
    { at: 0.9, dur: 0.8, freq: semis(330, -6) * c.pitch, opts: { wave: "saw", curve: 1.7, glide: 0.88, partials: [1, 2] } },
  ]),
  drumroll: (c, s) => noise(1.5, { seed: s, lp: 2800, hp: 200, curve: 1.1, attack: 0.5, shimmer: 2.2 }),
  suspense: (c, s) => mix(tone(2.0, 110 * c.pitch, { wave: "saw", curve: 0.9, attack: 0.5, glide: 1.28, partials: [1, 1.5] }),
    noise(2.0, { seed: s, lp: 1400, hp: 90, curve: 0.9, attack: 0.7 })),
  clock: (c, s) => {
    let out = new Float32Array(1);
    for (let i = 0; i < 4; i++) {
      out = at(out, noise(0.035, { seed: s + i * 11, lp: 4200, hp: 1300, curve: 8 }), i * 0.5);
    }
    return out;
  },
  whoosh: (c, s) => noise(0.42, { seed: s, lp: 3600, hp: 500, curve: 1.9, attack: 0.16 }),
};

/* ── Music beds ───────────────────────────────────────────────────────
 * Short, loopable, deliberately plain. Enough to verify crossfade, the music
 * volume bus and looping without pretending to be a soundtrack.
 */

const MUSIC_MOODS = {
  home: { root: 262, scale: [0, 4, 7, 11, 12], bpm: 84 },
  lobby: { root: 294, scale: [0, 3, 7, 10, 12], bpm: 92 },
  rummy: { root: 220, scale: [0, 3, 7, 10, 14], bpm: 76 },
  ludo: { root: 330, scale: [0, 2, 4, 7, 9], bpm: 108 },
  "snake-ladder": { root: 247, scale: [0, 2, 5, 7, 9], bpm: 100 },
  "hand-cricket": { root: 294, scale: [0, 4, 7, 9, 12], bpm: 116 },
  tournament: { root: 196, scale: [0, 3, 5, 7, 10], bpm: 124 },
  victory: { root: 349, scale: [0, 4, 7, 12, 16], bpm: 132 },
};

function musicBed(stem, character, seed) {
  const mood = MUSIC_MOODS[stem] ?? MUSIC_MOODS.home;
  const rnd = mulberry32(seed);
  const beat = 60 / mood.bpm;
  const bars = MUSIC_BARS;
  const dur = beat * 4 * bars;
  let out = new Float32Array(Math.floor(dur * MUSIC_SR));

  // Sustained root drone gives the loop a floor so the seam is less audible.
  out = mix(out, tone(dur, mood.root * character.pitch * 0.5, {
    sr: MUSIC_SR, partials: [1, 2], attack: 0.6, curve: 0.35,
  }));

  // Arpeggio on eighth notes.
  for (let i = 0; i < bars * 8; i++) {
    const n = mood.scale[Math.floor(rnd() * mood.scale.length)];
    const octave = rnd() < 0.25 ? 2 : 1;
    out = at(out, tone(beat * 0.9, semis(mood.root, n) * character.pitch * octave, {
      sr: MUSIC_SR, curve: 2.2, attack: 0.01, wave: character.wave, partials: [1, 2],
    }), i * beat * 0.5, MUSIC_SR);
  }

  // Soft pulse on the downbeat.
  for (let b = 0; b < bars * 4; b++) {
    out = at(out, tone(0.16, 90 * character.pitch, { sr: MUSIC_SR, glide: 0.6, curve: 4 }), b * beat, MUSIC_SR);
  }

  out = out.subarray(0, Math.floor(dur * MUSIC_SR));
  return { buf: normalize(deClick(out, 12, MUSIC_SR), 0.55), sr: MUSIC_SR };
}

/* ── Fallback ─────────────────────────────────────────────────────────
 * An unrecognised stem still gets a sound rather than silence — silence is
 * exactly the failure mode this whole script exists to remove. It is
 * deliberately bland so it is obvious it needs a real recipe.
 */
function genericBlip(character, seed) {
  return tone(0.18, 600 * character.pitch, { curve: 3.5, wave: character.wave, partials: [1, 2] });
}

/* ── Main ─────────────────────────────────────────────────────────────── */

function generate(urlPath) {
  const m = urlPath.match(/^\/audio\/themes\/([^/]+)\/([^/]+)\/(.+)\.mp3$/);
  if (!m) return null;
  const [, theme, category, stem] = m;
  const character = THEME_CHARACTER[theme] ?? THEME_CHARACTER.classic;
  const seed = hashSeed(urlPath);

  if (category === "music") {
    const { buf, sr } = musicBed(stem, character, seed);
    return { buf, sr, kind: "music" };
  }

  const recipe = RECIPES[stem];
  const buf = recipe ? recipe(character, seed) : genericBlip(character, seed);
  return {
    buf: normalize(deClick(buf), 0.8),
    sr: SR,
    kind: recipe ? "sfx" : "sfx-generic",
  };
}

function main() {
  if (!existsSync(MANIFEST)) {
    console.error(`Manifest not found: ${MANIFEST}`);
    process.exit(1);
  }
  const source = readFileSync(MANIFEST, "utf8");
  const paths = parseManifestPaths(source);

  if (paths.length === 0) {
    console.error("Parsed 0 paths from the manifest — the f() helper shape may have changed.");
    process.exit(1);
  }

  let written = 0;
  let skipped = 0;
  const generic = new Set();
  let bytes = 0;

  for (const urlPath of paths) {
    // Placeholders are written as .wav siblings; AudioManager falls back to
    // them when the real .mp3 is absent.
    const outPath = resolve(PUBLIC_ROOT, urlPath.replace(/^\//, "")).replace(/\.mp3$/, ".wav");
    if (existsSync(outPath) && !FORCE) {
      skipped++;
      continue;
    }
    const result = generate(urlPath);
    if (!result) continue;
    if (result.kind === "sfx-generic") generic.add(urlPath.replace(/^.*\//, "").replace(/\.mp3$/, ""));
    const wav = encodeWav(result.buf, result.sr);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, wav);
    written++;
    bytes += wav.length;
  }

  const mb = (bytes / 1024 / 1024).toFixed(2);
  console.log(`Manifest paths:  ${paths.length}`);
  console.log(`Written:         ${written} (${mb} MB)`);
  if (skipped) console.log(`Skipped:         ${skipped} (already present — rerun with --force to overwrite)`);
  if (generic.size > 0) {
    console.log(`Generic blips:   ${generic.size} — no recipe for: ${[...generic].sort().join(", ")}`);
  }
}

main();
