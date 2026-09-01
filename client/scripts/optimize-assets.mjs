import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const reportPath = path.resolve(__dirname, 'optimization-report.json');

const HERO_ASSETS = [
  'bhalyam-hero.png',
  'bhalyam-dark-hero.png',
  'bhalyam-hero-clean.png',
];

const GAME_TILES = [
  'StarTile.png',
  'RummyTile.png',
  'Bingo Tile.png',
  'Roadrash Game Tile.png',
  'Frogger Game Tile.png',
  'BrickBreakout Game Tile.png',
  'Carrom Game Tile.png',
  'SpacewarTile.png',
  'BrickRacer Game Tile.png',
  'Chess Game Tile.png',
  'RetroCricket Game Tile.png',
  'BlockBlast Game Tile.png',
  'Snake Game Tile.png',
  'Bounce Game Tile.png',
  'SamethaluTile.png',
  'UNOTile.png',
  'LudoTile.png',
  'Tambola.png',
  'S&LTile.png',
  'Name-place-thing-animal.png',
  'RPSTile.png',
  'HandCricketTile.png',
  'Dots&boxes.png',
  'words_building.png',
];

const ONBOARDING_ASSETS = [
  'images/nostalgia/sunday-afternoon.png',
  'images/nostalgia/gang-reunion.jpg',
  'images/nostalgia/friends-adda.jpg',
  'images/nostalgia/share-code-icon.png',
  'images/nostalgia/create-room-icon.png',
  'images/nostalgia/school-break.jpg',
  'images/nostalgia/rainy-evening.jpg',
];

const PROMO_AUTH_ASSETS = [
  'SignuppageBG.png',
  'gangoffriends.png',
  'Founder.png',
  'LoginPageBg.png',
  'LoginBG.png',
  'SignupBG.png',
  'Foundersectionasset.png',
  'FooterBhalyamlogo.png',
  'creator_boy_photo.jpg',
  'about_carrom_kids.jpg',
  'about-page-preview.png',
  'Bhalyam-logo.png',
];

const ILLUSTRATION_ASSETS = [
  'illustrations/Handcricket/worldcup.png',
  'illustrations/Handcricket/Boy_cheering.png',
  'illustrations/Handcricket/Champions_cup.png',
  'illustrations/Handcricket/Cricket_Helmet.png',
  'illustrations/Handcricket/cricket_ball.png',
  'illustrations/Handcricket/CricketBat.png',
  'illustrations/Handcricket/clouds.png',
  'illustrations/Handcricket/stars.png',
  'illustrations/Stargame/stargame-room.png',
];

async function optimizeHero(relPath) {
  const fullPath = path.join(publicDir, relPath);
  if (!fs.existsSync(fullPath)) return null;

  const originalSize = fs.statSync(fullPath).size;
  const baseName = relPath.replace(/\.(png|jpg|jpeg)$/i, '');

  const avifPath = path.join(publicDir, `${baseName}.avif`);
  const webpPath = path.join(publicDir, `${baseName}.webp`);
  const webpSmPath = path.join(publicDir, `${baseName}-sm.webp`);
  const avifSmPath = path.join(publicDir, `${baseName}-sm.avif`);

  // Full resolution AVIF (quality 75)
  await sharp(fullPath).avif({ quality: 75, effort: 4 }).toFile(avifPath);

  // Full resolution WebP (quality 82)
  await sharp(fullPath).webp({ quality: 82, effort: 4 }).toFile(webpPath);

  // Responsive mobile resolution (800w)
  await sharp(fullPath).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(webpSmPath);
  await sharp(fullPath).resize({ width: 800, withoutEnlargement: true }).avif({ quality: 70 }).toFile(avifSmPath);

  const avifSize = fs.statSync(avifPath).size;
  const webpSize = fs.statSync(webpPath).size;
  const webpSmSize = fs.statSync(webpSmPath).size;

  return {
    relPath,
    originalSize,
    webpSize,
    avifSize,
    webpSmSize,
    savingsPct: (((originalSize - Math.min(webpSize, avifSize)) / originalSize) * 100).toFixed(1),
  };
}

async function optimizeImage(relPath, maxDimension = 1200) {
  const fullPath = path.join(publicDir, relPath);
  if (!fs.existsSync(fullPath)) return null;

  const originalSize = fs.statSync(fullPath).size;
  const baseName = relPath.replace(/\.(png|jpg|jpeg)$/i, '');

  const webpPath = path.join(publicDir, `${baseName}.webp`);
  const avifPath = path.join(publicDir, `${baseName}.avif`);

  // WebP
  let webpPipeline = sharp(fullPath);
  if (maxDimension) {
    webpPipeline = webpPipeline.resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true });
  }
  await webpPipeline.webp({ quality: 82 }).toFile(webpPath);

  // AVIF
  let avifPipeline = sharp(fullPath);
  if (maxDimension) {
    avifPipeline = avifPipeline.resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true });
  }
  await avifPipeline.avif({ quality: 75 }).toFile(avifPath);

  const webpSize = fs.statSync(webpPath).size;
  const avifSize = fs.statSync(avifPath).size;

  return {
    relPath,
    originalSize,
    webpSize,
    avifSize,
    savingsPct: (((originalSize - Math.min(webpSize, avifSize)) / originalSize) * 100).toFixed(1),
  };
}

async function run() {
  console.log('🚀 Starting BHALYAM image optimization pipeline...');
  const stats = {
    heroes: [],
    tiles: [],
    onboarding: [],
    promo: [],
  };

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;

  console.log('\n--- 1. Optimizing Hero Assets (AVIF + WebP + Responsive sm) ---');
  for (const hero of HERO_ASSETS) {
    const res = await optimizeHero(hero);
    if (res) {
      stats.heroes.push(res);
      totalOriginalBytes += res.originalSize;
      totalOptimizedBytes += Math.min(res.webpSize, res.avifSize);
      console.log(`  ✓ ${res.relPath}: ${(res.originalSize / 1024).toFixed(0)}KB -> ${(res.webpSize / 1024).toFixed(0)}KB (WebP) / ${(res.avifSize / 1024).toFixed(0)}KB (AVIF) [${res.savingsPct}% saved]`);
    }
  }

  console.log('\n--- 2. Optimizing Game Tiles (WebP + AVIF @ 640px retina) ---');
  for (const tile of GAME_TILES) {
    const res = await optimizeImage(tile, 640);
    if (res) {
      stats.tiles.push(res);
      totalOriginalBytes += res.originalSize;
      totalOptimizedBytes += Math.min(res.webpSize, res.avifSize);
      console.log(`  ✓ ${res.relPath}: ${(res.originalSize / 1024).toFixed(0)}KB -> ${(res.webpSize / 1024).toFixed(0)}KB (WebP) / ${(res.avifSize / 1024).toFixed(0)}KB (AVIF) [${res.savingsPct}% saved]`);
    }
  }

  console.log('\n--- 3. Optimizing Onboarding & Nostalgia Images ---');
  for (const item of ONBOARDING_ASSETS) {
    const res = await optimizeImage(item, 1024);
    if (res) {
      stats.onboarding.push(res);
      totalOriginalBytes += res.originalSize;
      totalOptimizedBytes += Math.min(res.webpSize, res.avifSize);
      console.log(`  ✓ ${res.relPath}: ${(res.originalSize / 1024).toFixed(0)}KB -> ${(res.webpSize / 1024).toFixed(0)}KB (WebP) / ${(res.avifSize / 1024).toFixed(0)}KB (AVIF) [${res.savingsPct}% saved]`);
    }
  }

  console.log('\n--- 4. Optimizing Promotional Banners & Auth Backgrounds ---');
  for (const item of PROMO_AUTH_ASSETS) {
    const res = await optimizeImage(item, 1280);
    if (res) {
      stats.promo.push(res);
      totalOriginalBytes += res.originalSize;
      totalOptimizedBytes += Math.min(res.webpSize, res.avifSize);
      console.log(`  ✓ ${res.relPath}: ${(res.originalSize / 1024).toFixed(0)}KB -> ${(res.webpSize / 1024).toFixed(0)}KB (WebP) / ${(res.avifSize / 1024).toFixed(0)}KB (AVIF) [${res.savingsPct}% saved]`);
    }
  }

  stats.illustrations = [];
  console.log('\n--- 5. Optimizing Game & Room Illustrations ---');
  for (const item of ILLUSTRATION_ASSETS) {
    const res = await optimizeImage(item, 1024);
    if (res) {
      stats.illustrations.push(res);
      totalOriginalBytes += res.originalSize;
      totalOptimizedBytes += Math.min(res.webpSize, res.avifSize);
      console.log(`  ✓ ${res.relPath}: ${(res.originalSize / 1024).toFixed(0)}KB -> ${(res.webpSize / 1024).toFixed(0)}KB (WebP) / ${(res.avifSize / 1024).toFixed(0)}KB (AVIF) [${res.savingsPct}% saved]`);
    }
  }

  const savedBytes = totalOriginalBytes - totalOptimizedBytes;
  const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
  const totalOriginalMB = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalOptimizedMB = (totalOptimizedBytes / (1024 * 1024)).toFixed(2);
  const overallPct = ((savedBytes / totalOriginalBytes) * 100).toFixed(1);

  console.log(`\n========================================`);
  console.log(`🎉 Optimization Complete!`);
  console.log(`Total Original Size:  ${totalOriginalMB} MB`);
  console.log(`Total Optimized Size: ${totalOptimizedMB} MB`);
  console.log(`Total Bandwidth Saved: ${savedMB} MB (${overallPct}% reduction)`);
  console.log(`========================================\n`);

  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalOriginalMB,
      totalOptimizedMB,
      savedMB,
      overallPct,
    },
    details: stats,
  }, null, 2));
}

run();
