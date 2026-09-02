/**
 * One-off: generate PWA icon sizes from the 500x500 brand logo.
 *
 * Manifest icons must be exactly 192/512 (Chrome install criteria) and a
 * separate "maskable" set is required so Android's circular crop does not
 * decapitate the logo — maskable icons need their content inside the safe
 * zone (~80% diameter), so the logo is padded onto a solid brand-wood
 * background rather than scaled edge-to-edge.
 *
 * Run: node scripts/gen-pwa-icons.mjs   (idempotent, safe to re-run)
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public", "icons");
mkdirSync(publicDir, { recursive: true });

const SOURCE = join(here, "..", "public", "Bhalyam-logo.png");
const BRAND_WOOD = "#6D4323";

async function plain(size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(publicDir, `logo-${size}.png`));
  console.log(`icons/logo-${size}.png`);
}

/** Content at ~80% inside a solid brand background = survives circular crop. */
async function maskable(size) {
  const inner = Math.round(size * 0.78);
  const composed = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_WOOD },
  })
    .composite([{ input: composed, gravity: "center" }])
    .png()
    .toFile(join(publicDir, `logo-maskable-${size}.png`));
  console.log(`icons/logo-maskable-${size}.png`);
}

for (const size of [192, 512]) {
  await plain(size);
  await maskable(size);
}
console.log("done");
