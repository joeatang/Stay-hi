#!/usr/bin/env node
// CSP Inline Script Analysis & Externalization Plan (Woz-style)
// Scans core pages for inline <script> blocks and produces ordered externalization plan.
// Output: public/dev/csp-inline-report.json

import fs from 'fs';
import path from 'path';

const CORE_PAGES = [
  'hi-dashboard.html',
  'welcome.html',
  'hi-muscle.html',
  'profile.html',
  'hi-island-NEW.html',
  'hi-mission-control.html',
  'post-auth.html',
  'signin.html',
  'signup.html'
];

const ROOT = path.resolve(process.cwd(), 'public');
const OUT = path.resolve(ROOT, 'dev/csp-inline-report.json');

function read(rel){
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function analyze(html){
  const blocks = [];
  const regex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))){
    const attrs = match[1] || '';
    if (/src=/.test(attrs)) continue; // skip external
    const code = match[2].trim();
    const size = code.length;
    const isModule = /type=["']module["']/.test(attrs);
    const hasImport = /\bimport\b/.test(code);
    const hasAuthReady = /AuthReady|authReady/i.test(code);
    const setsFlags = /HiFlags|hiFlags/.test(code);
    const hasEventListener = /addEventListener\(/.test(code);
    const isInitBlock = /document\.addEventListener|window\.addEventListener|DOMContentLoaded/.test(code);
    const riskLevel = size > 4000 ? 'high' : size > 1500 ? 'medium' : 'low';
    blocks.push({ size, isModule, hasImport, hasAuthReady, setsFlags, hasEventListener, isInitBlock, riskLevel, preview: code.slice(0,140) });
  }
  return blocks;
}

const report = { generatedAt: new Date().toISOString(), pages: {}, summary: { totalInline:0, totalBytes:0 } };

for (const page of CORE_PAGES){
  const html = read(page);
  if (!html){
    report.pages[page] = { error: 'missing' };
    continue;
  }
  const blocks = analyze(html);
  const bytes = blocks.reduce((a,b)=>a+b.size,0);
  report.pages[page] = { inlineCount: blocks.length, totalBytes: bytes, blocks };
  report.summary.totalInline += blocks.length;
  report.summary.totalBytes += bytes;
}

// Externalization priority (largest first, then modules w/ imports, then init blocks)
const allBlocks = Object.entries(report.pages).flatMap(([page, data]) => {
  if (!data.blocks) return [];
  return data.blocks.map(b => ({ page, ...b }));
});

allBlocks.sort((a,b)=>{
  if (b.size !== a.size) return b.size - a.size;
  if (a.isModule !== b.isModule) return b.isModule - a.isModule;
  if (a.hasImport !== b.hasImport) return b.hasImport - a.hasImport;
  return (b.isInitBlock?1:0) - (a.isInitBlock?1:0);
});

report.externalizationPlan = allBlocks.slice(0, 20).map((b, idx) => ({
  order: idx+1,
  page: b.page,
  size: b.size,
  isModule: b.isModule,
  hasImport: b.hasImport,
  isInitBlock: b.isInitBlock,
  riskLevel: b.riskLevel,
  rationale: [
    b.size>1500?'size':'',
    b.isModule?'module':'',
    b.hasImport?'imports':'',
    b.isInitBlock?'init':''
  ].filter(Boolean).join(', ')
}));

report.recommendations = [
  'Create /public/lib/boot/ directory for extracted init blocks (e.g. dashboard-init.js)',
  'For each large inline module: move code verbatim to external file; replace block with <script type="module" src="...">',
  'After externalization: add CSP nonce or remove unsafe-inline and use strict-dynamic',
  'Measure performance before/after (expect negligible change; potential browser parser improvement)',
  'Add integration smoke test to ensure event listeners still bind post-move'
];

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`✅ CSP inline report written: ${OUT}`);
console.log('Summary:', report.summary);
console.log('Top externalization targets:', report.externalizationPlan.slice(0,5));
