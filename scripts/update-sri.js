#!/usr/bin/env node
// Automated SRI Hash Updater for Hi-OS external scripts
// Usage:
//   node scripts/update-sri.js               # report only
//   node scripts/update-sri.js --apply       # apply patch to HiPWA.js expectedHashes
//   node scripts/update-sri.js --html        # list HTML tags needing updates
// Description:
// Parses expectedHashes in public/lib/HiPWA.js, fetches each URL, computes sha384,
// compares with stored value, and optionally rewrites the file.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const HIPWA_PATH = path.join(process.cwd(), 'public', 'lib', 'HiPWA.js');
const APPLY = process.argv.includes('--apply');
const SHOW_HTML = process.argv.includes('--html');
const CHECK = process.argv.includes('--check'); // CI mode: exit non-zero if hashes drift

function fetch(url){
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200){ reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks=[]; res.on('data',d=>chunks.push(d));
      res.on('end',()=>resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function computeSha384(buf){
  const crypto = require('crypto');
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function extractExpectedHashes(source){
  const start = source.indexOf('const expectedHashes =');
  if (start === -1) throw new Error('expectedHashes block not found');
  const braceStart = source.indexOf('{', start);
  let depth = 0; let i = braceStart; let end = -1;
  for (; i < source.length; i++){
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}'){ depth--; if (depth === 0){ end = i; break; } }
  }
  if (end === -1) throw new Error('Failed to parse expectedHashes object');
  const objectLiteral = source.slice(braceStart, end+1);
  // naive parse: match 'url': 'hash'
  const regex = /'([^']+)'\s*:\s*'([^']+)'/g;
  const map = {}; let m;
  while((m = regex.exec(objectLiteral))){ map[m[1]] = m[2]; }
  return { map, start: braceStart, end };
}

async function main(){
  const source = fs.readFileSync(HIPWA_PATH,'utf8');
  const { map, start, end } = extractExpectedHashes(source);
  const results = [];
  for (const [url, oldHash] of Object.entries(map)){
    try {
      const buf = await fetch(url);
      const newHash = computeSha384(buf);
      results.push({ url, oldHash, newHash, changed: oldHash !== newHash });
    } catch (e){
      results.push({ url, oldHash, error: e.message });
    }
  }
  const changed = results.filter(r => r.changed);
  console.log(JSON.stringify({ summary:{ total: results.length, changed: changed.length, mode: CHECK? 'check': (APPLY? 'apply': 'report') }, results }, null, 2));

  if (SHOW_HTML){
    console.log('\n# HTML Tag Suggestions');
    results.forEach(r => {
      if (!r.error){
        console.log(`<script src="${r.url}" integrity="${r.newHash}" crossorigin="anonymous"></script>`);
      }
    });
  }

  if (CHECK){
    if (changed.length){
      console.error('❌ SRI expectedHashes drift detected. Run: node scripts/update-sri.js --apply');
      process.exit(2);
    } else {
      console.log('✅ SRI check passed (no changes needed).');
    }
    return;
  }

  if (APPLY && changed.length){
    let newObject = '{\n';
    for (const r of results){
      newObject += `  '${r.url}': '${r.newHash}',\n`;
    }
    newObject += '}';
    const before = source.slice(0, start);
    const after = source.slice(end+1);
    const updated = before + newObject + after;
    fs.writeFileSync(HIPWA_PATH, updated, 'utf8');
    console.log('✅ Updated expectedHashes in HiPWA.js');
  } else if (APPLY){
    console.log('ℹ️ No hash changes detected. File not modified.');
  }
}

main().catch(e => { console.error('update-sri failed', e); process.exit(1); });
