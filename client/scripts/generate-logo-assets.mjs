/**
 * Regenerates every BHALYAM logo/icon file from ONE source image.
 *
 *   node client/scripts/generate-logo-assets.mjs                 # from docs/brand/bhalyam-logo-master.png
 *   node client/scripts/generate-logo-assets.mjs path/to/new.png  # from a new logo
 *
 * ── Why one script ───────────────────────────────────────────────────────────
 * The logo used to be a single 500px PNG that served as the favicon, the touch
 * icon, the in-app mark, the SEO `logo` and the avatar fallback at once. A new
 * logo is therefore a SET of files, and replacing only some of them leaves the
 * tab icon and the header disagreeing. This writes all of them together.
 *
 * ── Source ───────────────────────────────────────────────────────────────────
 * A source WITH an alpha channel is used as-is (the committed master is one).
 * A source WITHOUT one — an image-generator export, say, whose rounded square
 * sits on solid black — is cut out first: near-black pixels connected to the
 * image border become transparent, with a 2px fringe trimmed and a sub-pixel
 * feather so no dark halo survives on a light page. The result is trimmed to the
 * art and padded to an exact square, then saved as the new master.
 *
 * ── Writes ───────────────────────────────────────────────────────────────────
 *   docs/brand/bhalyam-logo-master.png        full-resolution cut-out (only when the source had no alpha)
 *   client/public/Bhalyam-logo.{png,webp,avif}  512px in-app logo (names unchanged — see BhalyamLogo.tsx)
 *   client/public/icon-192.png, icon-512.png    Android / manifest-style icons
 *   client/public/favicon-32.png, favicon.ico   tab icons (ico = 16/32/48)
 *   client/public/apple-touch-icon.png          180px, OPAQUE: iOS paints transparency black
 *
 * Not touched: FooterBhalyamlogo.* (the kids + wordmark lockup) and
 * bhalyam-og-share.jpg (the share-card scene) are separate artwork.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "../..");
const PUBLIC = path.join(REPO, "client/public");
const MASTER_PATH = path.join(REPO, "docs/brand/bhalyam-logo-master.png");

/** A pixel this dark and connected to the image border is background, not art. */
const BG_LUMA_MAX = 70;
/** The anti-aliased rim blends into the black; trim this many px so no dark fringe survives. */
const FRINGE_PX = 2;
const APP_LOGO_PX = 512;

const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

function floodBackground(data, w, h) {
  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (x, y) => {
    const p = y * w + x;
    if (isBg[p] || luma(data, p * 4) > BG_LUMA_MAX) return;
    isBg[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  return isBg;
}

function growBackground(isBg, w, h, px) {
  let cur = isBg;
  for (let n = 0; n < px; n++) {
    const next = Uint8Array.from(cur);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (!cur[p] && (cur[p - 1] || cur[p + 1] || cur[p - w] || cur[p + w])) next[p] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

/** Cuts an opaque image's border-connected black away and returns a trimmed, square, transparent PNG. */
async function cutOut(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = growBackground(floodBackground(data, w, h), w, h, FRINGE_PX);

  const shape = Buffer.alloc(w * h);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let p = 0; p < w * h; p++) {
    if (bg[p]) continue;
    shape[p] = 255;
    const x = p % w;
    const y = (p / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX <= minX || maxY <= minY) throw new Error("No art found: the whole image read as background.");

  // `toColourspace("b-w")` pins the mask to one byte per pixel; without it sharp can hand back a
  // different layout after the blur and the alpha comes out sheared.
  const blurred = await sharp(shape, { raw: { width: w, height: h, channels: 1 } })
    .blur(0.8)
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (blurred.info.channels !== 1) throw new Error(`Alpha mask has ${blurred.info.channels} channels, expected 1.`);

  const rgba = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    rgba[p * 4] = data[p * 4];
    rgba[p * 4 + 1] = data[p * 4 + 1];
    rgba[p * 4 + 2] = data[p * 4 + 2];
    rgba[p * 4 + 3] = blurred.data[p];
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const side = Math.max(bw, bh);
  return sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .extend({
      top: Math.floor((side - bh) / 2),
      bottom: Math.ceil((side - bh) / 2),
      left: Math.floor((side - bw) / 2),
      right: Math.ceil((side - bw) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** PNG-in-ICO: valid for every browser that reads .ico today. */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

async function main() {
  const source = path.resolve(process.argv[2] ?? MASTER_PATH);
  if (!fs.existsSync(source)) throw new Error(`Source image not found: ${source}`);

  const meta = await sharp(source).metadata();
  let master;
  if (meta.hasAlpha) {
    master = await sharp(source).png().toBuffer();
  } else {
    master = await cutOut(source);
    fs.mkdirSync(path.dirname(MASTER_PATH), { recursive: true });
    fs.writeFileSync(MASTER_PATH, master);
    console.log(`master  ${path.relative(REPO, MASTER_PATH)} (cut out of ${path.basename(source)})`);
  }

  const at = (size) => sharp(master).resize(size, size, { kernel: "lanczos3" });
  const write = (name, buf) => {
    fs.writeFileSync(path.join(PUBLIC, name), buf);
    console.log(`wrote   client/public/${name} (${(buf.length / 1024).toFixed(0)} kB)`);
  };

  // In-app logo. Names are unchanged so every existing reference keeps working.
  write("Bhalyam-logo.png", await at(APP_LOGO_PX).png({ compressionLevel: 9 }).toBuffer());
  write("Bhalyam-logo.webp", await at(APP_LOGO_PX).webp({ quality: 82 }).toBuffer());
  write("Bhalyam-logo.avif", await at(APP_LOGO_PX).avif({ quality: 75 }).toBuffer());

  write("icon-192.png", await at(192).png({ compressionLevel: 9 }).toBuffer());
  write("icon-512.png", await at(512).png({ compressionLevel: 9 }).toBuffer());

  // Tab sizes get a light sharpen: the art is detailed and goes soft at 16–48px.
  const tab = (n) => at(n).sharpen({ sigma: 0.6 }).png({ compressionLevel: 9 }).toBuffer();
  write("favicon-32.png", await tab(32));
  write("favicon.ico", buildIco([{ size: 16, buf: await tab(16) }, { size: 32, buf: await tab(32) }, { size: 48, buf: await tab(48) }]));

  // The touch icon sits on the art's own rim colour so the square iOS rounds has no black in it.
  const probe = await sharp(master).resize(64, 64).raw().toBuffer({ resolveWithObject: true });
  const at3 = (3 * 64 + 32) * probe.info.channels;
  const rim = { r: probe.data[at3], g: probe.data[at3 + 1], b: probe.data[at3 + 2] };
  write(
    "apple-touch-icon.png",
    await sharp({ create: { width: 180, height: 180, channels: 3, background: rim } })
      .composite([{ input: await at(180).png().toBuffer() }])
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
