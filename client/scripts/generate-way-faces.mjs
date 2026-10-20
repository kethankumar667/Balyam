/**
 * Makes the four small faces that sit round the "Play together" table.
 *
 * The avatar pictures in `public/Avatars` are the app's own characters, which is
 * why they are right for this: players meet the same faces when they pick an
 * avatar. But each is a ~150 KB JPEG with an ornate frame, and four of them near
 * the top of the home page would cost ~600 KB on a phone. This crops each to the
 * face (the frame falls outside the crop) and writes a 128 px WebP, about 5 KB.
 *
 * Run from `client/`:   node scripts/generate-way-faces.mjs
 * Needs `sharp`, which is already in node_modules. The outputs are committed, so
 * nobody has to run this to build the app; it is here so they can be remade.
 *
 * Each crop is a square given as a centre (fractions of the picture's width and
 * height) and a size (a fraction of the shorter side), chosen by eye for the face.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "..", "public", "Avatars");
const OUT = join(here, "..", "public", "way-faces");
const SIZE = 128;

const FACES = [
  // A boy with curls, blue background.
  { name: "face-1", file: "file_00000000c1f48208810e59b5535e2d15_1.jpg", cx: 0.5, cy: 0.47, size: 0.68 },
  // A girl in a cap and hoop earrings, yellow background.
  { name: "face-2", file: "file_0000000094008208a20f77270605d0d5_5.jpg", cx: 0.5, cy: 0.38, size: 0.7 },
  // A young man in a denim jacket, pink background.
  { name: "face-3", file: "file_0000000084c48208b1f893419d784cf2_4.jpg", cx: 0.5, cy: 0.36, size: 0.72 },
  // A girl with a headband, pink background.
  { name: "face-4", file: "file_00000000c1f48208810e59b5535e2d15_12.jpg", cx: 0.5, cy: 0.47, size: 0.68 },
];

await mkdir(OUT, { recursive: true });

for (const face of FACES) {
  const input = join(SOURCE, face.file);
  const { width, height } = await sharp(input).metadata();
  if (!width || !height) throw new Error(`cannot read the size of ${face.file}`);

  const side = Math.round(Math.min(width, height) * face.size);
  const left = Math.max(0, Math.min(width - side, Math.round(width * face.cx - side / 2)));
  const top = Math.max(0, Math.min(height - side, Math.round(height * face.cy - side / 2)));

  const { size } = await sharp(input)
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE)
    .webp({ quality: 82 })
    .toFile(join(OUT, `${face.name}.webp`));

  console.log(`${face.name}.webp  ${width}x${height} -> crop ${side}px at (${left},${top})  ${(size / 1024).toFixed(1)} KB`);
}
