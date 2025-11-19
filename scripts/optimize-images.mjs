#!/usr/bin/env node
/**
 * optimize-images.mjs
 * Converts PNG/JPG brand and large dashboard images to WebP + AVIF
 * Outputs side-by-side size comparison and only writes if smaller.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd(), 'public/assets/brand');
const TARGETS = ['hi-logo-192.png', 'hi-logo-512.png', 'hi-logo-light.png', 'hi-logo-dark.png'];

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }
function formatBytes(bytes) { const units = ['B','KB','MB']; let i=0; let v=bytes; while(v>1024 && i<units.length-1){v/=1024;i++;} return `${v.toFixed(1)} ${units[i]}`; }

async function convertOne(file) {
  const inputPath = path.join(ROOT, file);
  if (!fs.existsSync(inputPath)) { console.warn('[images] Missing:', file); return; }
  const base = file.replace(/\.(png|jpg|jpeg)$/i,'');
  const webpPath = path.join(ROOT, base + '.webp');
  const avifPath = path.join(ROOT, base + '.avif');

  const buf = await fs.promises.readFile(inputPath);
  const origSize = buf.length;

  // Convert WEBP
  if (!fs.existsSync(webpPath)) {
    const webpBuf = await sharp(buf).webp({ quality: 82 }).toBuffer();
    if (webpBuf.length < origSize * 0.95) { // require some savings
      await fs.promises.writeFile(webpPath, webpBuf);
      console.log(`[WEBP] ${file} -> ${path.basename(webpPath)} saved ${formatBytes(origSize - webpBuf.length)} (${formatBytes(webpBuf.length)}/${formatBytes(origSize)})`);
    } else {
      console.log(`[WEBP] Skipped (insufficient savings) ${file}`);
    }
  }

  // Convert AVIF
  if (!fs.existsSync(avifPath)) {
    const avifBuf = await sharp(buf).avif({ quality: 60 }).toBuffer();
    if (avifBuf.length < origSize * 0.90) { // stronger savings threshold
      await fs.promises.writeFile(avifPath, avifBuf);
      console.log(`[AVIF] ${file} -> ${path.basename(avifPath)} saved ${formatBytes(origSize - avifBuf.length)} (${formatBytes(avifBuf.length)}/${formatBytes(origSize)})`);
    } else {
      console.log(`[AVIF] Skipped (insufficient savings) ${file}`);
    }
  }
}

(async () => {
  console.log('🔧 Image optimization starting...');
  await ensureDir(ROOT);
  for (const f of TARGETS) {
    await convertOne(f);
  }
  console.log('✅ Image optimization complete.');
})();
