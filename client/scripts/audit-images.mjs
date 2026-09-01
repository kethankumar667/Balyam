import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('client/public');
const srcDir = path.resolve('client/src');

function getAllFiles(dir, exts) {
  let files = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (!exts || exts.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function run() {
  console.log('Loading source code files into memory...');
  const srcFiles = getAllFiles(srcDir, ['.tsx', '.ts', '.jsx', '.js', '.css', '.html']);
  const codeIndex = srcFiles.map(f => ({
    relPath: path.relative(srcDir, f).replace(/\\/g, '/'),
    content: fs.readFileSync(f, 'utf8')
  }));
  console.log(`Loaded ${codeIndex.length} source code files.`);

  console.log('Auditing public images...');
  const imageFiles = getAllFiles(publicDir, ['.png', '.jpg', '.jpeg', '.webp', '.avif']);
  const results = [];

  for (const imgPath of imageFiles) {
    const stats = fs.statSync(imgPath);
    const baseName = path.basename(imgPath);
    const relPath = path.relative(publicDir, imgPath).replace(/\\/g, '/');

    let metadata = { width: 0, height: 0, format: 'unknown' };
    try {
      metadata = await sharp(imgPath).metadata();
    } catch (e) {
      // ignore
    }

    const usages = codeIndex
      .filter(item => item.content.includes(baseName))
      .map(item => item.relPath);

    results.push({
      path: relPath,
      sizeBytes: stats.size,
      sizeKB: Math.round((stats.size / 1024) * 10) / 10,
      sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      usages: usages
    });
  }

  results.sort((a, b) => b.sizeBytes - a.sizeBytes);

  fs.writeFileSync('client/scripts/image-audit-results.json', JSON.stringify(results, null, 2));

  console.log(`\n=== AUDIT SUMMARY ===`);
  const gt1MB = results.filter(r => r.sizeBytes >= 1024 * 1024);
  const between500and1MB = results.filter(r => r.sizeBytes >= 500 * 1024 && r.sizeBytes < 1024 * 1024);
  const between100and500KB = results.filter(r => r.sizeBytes >= 100 * 1024 && r.sizeBytes < 500 * 1024);

  console.log(`> 1 MB: ${gt1MB.length} images`);
  console.log(`500 KB - 1 MB: ${between500and1MB.length} images`);
  console.log(`100 KB - 500 KB: ${between100and500KB.length} images`);
  console.log(`Total images > 100 KB: ${gt1MB.length + between500and1MB.length + between100and500KB.length}`);
}

run();
