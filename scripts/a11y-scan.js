#!/usr/bin/env node
// Basic accessibility scanner using Puppeteer + axe-core
// Usage:
//   node scripts/a11y-scan.js http://localhost:3030/public/signin-tesla.html
// Multiple URLs:
//   node scripts/a11y-scan.js URL1 URL2 ...

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AXE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.0/axe.min.js';

async function scan(url){
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setBypassCSP(true);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.addScriptTag({ url: AXE_SRC });
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await axe.run({
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa'] },
      resultTypes: ['violations','incomplete']
    });
  });
  await browser.close();
  return results;
}

async function main(){
  const urls = process.argv.slice(2);
  if (!urls.length){
    console.error('Provide one or more URLs to scan.');
    process.exit(1);
  }
  const out = {};
  for (const u of urls){
    try {
      const r = await scan(u);
      out[u] = {
        violations: r.violations.map(v=>({id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.length})),
        incomplete: r.incomplete.map(v=>({id:v.id, help:v.help, nodes:v.nodes.length}))
      };
      console.log(`Scanned ${u}: ${r.violations.length} violations, ${r.incomplete.length} incomplete`);
    } catch(e){
      out[u] = { error: e.message };
      console.error(`Scan failed for ${u}:`, e.message);
    }
  }
  const json = JSON.stringify(out, null, 2);
  const outPath = path.join(process.cwd(), 'a11y-report.json');
  fs.writeFileSync(outPath, json);
  console.log('Report written to', outPath);
}

main();
