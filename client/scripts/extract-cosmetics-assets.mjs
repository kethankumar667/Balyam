import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, "..");

const DICE_SRC = "C:/Users/GontlaKethanKumar/.gemini/antigravity/brain/780ca99c-307e-4b8c-9900-fd39e2d4f83c/.user_uploaded/media_1789325934865.jpg";
const TOKEN_SRC = "C:/Users/GontlaKethanKumar/.gemini/antigravity/brain/780ca99c-307e-4b8c-9900-fd39e2d4f83c/.user_uploaded/media_1789325934925.jpg";

const DICE_OUT_DIR = path.resolve(clientRoot, "public/dice-skins");
const TOKEN_OUT_DIR = path.resolve(clientRoot, "public/token-skins");

fs.mkdirSync(DICE_OUT_DIR, { recursive: true });
fs.mkdirSync(TOKEN_OUT_DIR, { recursive: true });

const DICE_IDS = [
  // Row 0
  "dice_porcelain_gold",
  "dice_obsidian_gold",
  "dice_faceted_diamond",
  "dice_brushed_brass",
  // Row 1
  "dice_ruby_gemstone",
  "dice_sapphire_crystal",
  "dice_black_gold_marble",
  "dice_carved_walnut",
  // Row 2
  "dice_cyber_neon_tron",
  "dice_carrara_white_marble",
  "dice_cosmic_nebula",
  "dice_dragon_carbon_gold",
];

const TOKEN_IDS = [
  // Row 0
  "token_glossy_ruby",
  "token_sapphire_glass",
  "token_faceted_emerald",
  "token_amber_topaz",
  "token_faceted_amethyst",
  // Row 1
  "token_mother_of_pearl",
  "token_piano_obsidian",
  "token_faceted_ruby",
  "token_faceted_cobalt",
  "token_green_malachite",
  // Row 2
  "token_carved_walnut",
  "token_polished_chrome",
  "token_matte_slate",
  "token_imperial_filigree",
  "token_rainbow_titanium",
  // Row 3
  "token_glacier_ice",
  "token_molten_magma",
  "token_rose_quartz",
  "token_cosmic_galaxy",
  "token_calacatta_marble",
];

async function processDice() {
  console.log("Processing 12 Luxury Dice...");
  const meta = await sharp(DICE_SRC).metadata();
  const imgW = meta.width || 1024;
  const imgH = meta.height || 682;
  const cols = 4;
  const rows = 3;
  const cellW = imgW / cols;
  const cellH = imgH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const id = DICE_IDS[idx];
      const left = Math.round(c * cellW);
      const top = Math.round(r * cellH);
      const width = Math.round(cellW);
      const height = Math.round(cellH);

      const outWebP = path.join(DICE_OUT_DIR, `${id}.webp`);
      const outPng = path.join(DICE_OUT_DIR, `${id}.png`);

      await sharp(DICE_SRC)
        .extract({ left, top, width, height })
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toFile(outWebP);

      await sharp(DICE_SRC)
        .extract({ left, top, width, height })
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPng);

      console.log(`Saved dice: ${id}`);
    }
  }
}

async function processTokens() {
  console.log("Processing 20 Luxury Tokens with background transparency...");
  const meta = await sharp(TOKEN_SRC).metadata();
  const imgW = meta.width || 1024;
  const imgH = meta.height || 682;
  const cols = 5;
  const rows = 4;
  const cellW = imgW / cols;
  const cellH = imgH / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const id = TOKEN_IDS[idx];
      const left = Math.round(c * cellW);
      const top = Math.round(r * cellH);
      const width = Math.min(Math.round(cellW), imgW - left);
      const height = Math.min(Math.round(cellH), imgH - top);

      // Extract raw cell
      const rawBuffer = await sharp(TOKEN_SRC)
        .extract({ left, top, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = rawBuffer;
      // Chroma key black background:
      // If pixel is near black (r, g, b all below threshold), fade alpha smoothly
      for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        const brightness = Math.max(red, green, blue);

        if (brightness < 12) {
          data[i + 3] = 0;
        } else if (brightness < 30) {
          data[i + 3] = Math.round(((brightness - 12) / 18) * 255);
        }
      }

      const outWebP = path.join(TOKEN_OUT_DIR, `${id}.webp`);
      const outPng = path.join(TOKEN_OUT_DIR, `${id}.png`);

      await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4,
        },
      })
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toFile(outWebP);

      await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4,
        },
      })
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outPng);

      console.log(`Saved token: ${id}`);
    }
  }
}

async function main() {
  await processDice();
  await processTokens();
  console.log("All 12 dice and 20 tokens successfully extracted and saved!");
}

main().catch((err) => {
  console.error("Extraction error:", err);
  process.exit(1);
});
