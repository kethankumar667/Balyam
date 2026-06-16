#!/usr/bin/env node
// Walks every board-*.svg in client/src/games/ludo/boards/ and emits a sibling
// board-*.json containing { "track-0": {x, y}, "stretch-red-0": {x, y}, ... }.
// Run from the client dir: `node scripts/extractBoardPositions.mjs`

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOARDS_DIR = join(__dirname, "..", "src", "games", "ludo", "boards");

const ID_RE = /id="((?:track|stretch|yard|home|safe)-[a-z0-9-]+)"/g;
const ATTR = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}="([^"]+)"`));
  return m ? Number(m[1]) : null;
};

function tagFor(svg, id) {
  const idx = svg.indexOf(`id="${id}"`);
  if (idx < 0) return null;
  let start = idx;
  while (start > 0 && svg[start] !== "<") start--;
  const end = svg.indexOf(">", idx);
  return svg.slice(start, end + 1);
}

function centroidOf(tag) {
  if (tag.startsWith("<circle") || tag.startsWith("<ellipse")) {
    const cx = ATTR(tag, "cx"), cy = ATTR(tag, "cy");
    if (cx != null && cy != null) return { x: cx, y: cy };
  }
  if (tag.startsWith("<rect")) {
    const x = ATTR(tag, "x"), y = ATTR(tag, "y");
    const w = ATTR(tag, "width"), h = ATTR(tag, "height");
    if ([x, y, w, h].every((v) => v != null)) return { x: x + w / 2, y: y + h / 2 };
  }
  if (tag.startsWith("<g")) {
    const m = tag.match(/transform="translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)"/);
    if (m) return { x: Number(m[1]), y: Number(m[2]) };
  }
  return null;
}

function extract(svg) {
  const ids = new Set();
  let m;
  while ((m = ID_RE.exec(svg))) ids.add(m[1]);
  const positions = {};
  const skipped = [];
  for (const id of ids) {
    const tag = tagFor(svg, id);
    const c = tag ? centroidOf(tag) : null;
    if (c) positions[id] = { x: round(c.x), y: round(c.y) };
    else skipped.push(id);
  }
  return { positions, skipped };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function summarize(positions) {
  const counts = {};
  for (const id of Object.keys(positions)) {
    const prefix = id.split("-").slice(0, id.startsWith("track-") ? 1 : 2).join("-");
    counts[prefix] = (counts[prefix] ?? 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ");
}

function main() {
  let files;
  try {
    files = readdirSync(BOARDS_DIR).filter((f) => /^board-\d+\.svg$/.test(f));
  } catch {
    console.error(`Boards directory not found: ${BOARDS_DIR}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.log(`No board-*.svg files in ${BOARDS_DIR}. Nothing to do.`);
    return;
  }
  for (const file of files) {
    const svg = readFileSync(join(BOARDS_DIR, file), "utf8");
    const { positions, skipped } = extract(svg);
    const out = basename(file, ".svg") + ".json";
    writeFileSync(join(BOARDS_DIR, out), JSON.stringify(positions, null, 2) + "\n");
    console.log(`OK ${file} -> ${out}  (${summarize(positions)})`);
    if (skipped.length) {
      console.warn(`   skipped (no centroid): ${skipped.join(", ")}`);
    }
  }
}

main();
