#!/usr/bin/env node
// Asset Manifest Generator (Woz-style lean inventory)
// Scans public HTML files and produces JSON listing of script & style usage.
// Usage: node scripts/asset-manifest.mjs [outFile]
// Default output: public/dev/asset-manifest.json

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'public');
const OUTPUT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(ROOT, 'dev/asset-manifest.json');

function walk(dir){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries){
    if (e.name.startsWith('_archive')) continue; // skip archived content
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(full));
    else if (e.isFile() && e.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function extract(html){
  const scripts = [];
  const styles = [];
  const inlineScriptBlocks = [];
  const inlineStyleBlocks = [];

  // <script ... src="...">
  html.replace(/<script[^>]*src=["']([^"'>]+)["'][^>]*><\/script>/gi, (_, src) => { scripts.push(src); });
  // module scripts may be inline or external
  html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
    if (/src=/.test(attrs)) return; // handled above
    const typeModule = /type=["']module["']/.test(attrs);
    inlineScriptBlocks.push({ module: typeModule, size: body.length, preview: body.slice(0,120) });
  });
  // stylesheet links
  html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"'>]+)["'][^>]*>/gi, (_, href) => { styles.push(href); });
  // preload styles that become stylesheet
  html.replace(/<link[^>]*rel=["']preload["'][^>]*as=["']style["'][^>]*href=["']([^"'>]+)["'][^>]*>/gi, (_, href) => { styles.push(href + ' (preload)'); });
  // inline <style>
  html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => { inlineStyleBlocks.push({ size: css.length, preview: css.slice(0,120) }); });

  return { scripts, styles, inlineScriptBlocks, inlineStyleBlocks };
}

function classifyScript(src){
  if (/HiSupabase|AuthReady|HiFlags|HiPWA|hibase|HiDB|HiMonitor|HiPerformance|GoldStandard|HiDash|HiFeed|HiStreaks/.test(src)) return 'core';
  if (/premium|celebration|spotlight|conversion|calendar|medallion|share-sheet|rewards|membership/i.test(src)) return 'feature';
  if (/test|debug|diagnostic|preflight|backup|deprecated|verification|preview|sandbox|emergency/i.test(src)) return 'diagnostic';
  return 'other';
}

function classifyStyle(href){
  if (/hi-dashboard|theme|create-parity|premium-ux|premium-calendar|navigation|HiFooter|HiModal|HiShareSheet|Medallion|location-picker|tokens|base\.css/i.test(href)) return 'core';
  if (/celebration|spotlight|conversion|rewards|stats|map|feed|profile-modal/i.test(href)) return 'feature';
  if (/test|debug|diagnostic|backup|deprecated|verification|preview|sandbox|emergency/i.test(href)) return 'diagnostic';
  return 'other';
}

const files = walk(ROOT);
const manifest = { generatedAt: new Date().toISOString(), root: ROOT, fileCount: files.length, files: {}, summary: { scripts: {}, styles: {} } };

for (const file of files){
  const rel = path.relative(ROOT, file);
  const html = fs.readFileSync(file, 'utf8');
  const data = extract(html);
  manifest.files[rel] = data;
  data.scripts.forEach(s => { const k = classifyScript(s); manifest.summary.scripts[k] = (manifest.summary.scripts[k]||0)+1; });
  data.styles.forEach(s => { const k = classifyStyle(s); manifest.summary.styles[k] = (manifest.summary.styles[k]||0)+1; });
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2));

console.log(`✅ Asset manifest written to ${OUTPUT}`);
console.log('Breakdown:', manifest.summary);
