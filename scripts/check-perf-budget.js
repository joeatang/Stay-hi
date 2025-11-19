#!/usr/bin/env node
// Checks latest perf beacon logs against perf-budget.json thresholds.
// Usage: node scripts/check-perf-budget.js [logsDir]

const fs = require('fs');
const path = require('path');

const budgetPath = path.join(process.cwd(), 'perf-budget.json');
const budget = JSON.parse(fs.readFileSync(budgetPath,'utf8'));
const logsDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), 'beacon-logs');
const perfLog = path.join(logsDir, 'perf.log');

if (!fs.existsSync(perfLog)) {
  console.error('No perf log found at', perfLog);
  process.exit(1);
}

const lines = fs.readFileSync(perfLog,'utf8').trim().split('\n').filter(Boolean);
if (!lines.length){
  console.error('perf.log empty');
  process.exit(1);
}
// Use last entry
let last;
try { last = JSON.parse(lines[lines.length - 1]); } catch { console.error('Malformed JSON in last perf entry'); process.exit(1); }
const data = last.body || last; // server logs wrap body

function kb(bytes){ return (bytes/1024).toFixed(1); }

const resources = (data.resources && data.resources.totalTransfer) || 0;
const totalTransferKB = resources / 1024;

const checks = [
  ['lcp','LCP', data.lcp, budget.lcp, v => v && v > budget.lcp],
  ['fid','FID', data.fid, budget.fid, v => v && v > budget.fid],
  ['cls','CLS', data.cls, budget.cls, v => v && v > budget.cls],
  ['fcp','FCP', data.fcp, budget.fcp, v => v && v > budget.fcp],
  ['tbt','TBT', data.tbt, budget.tbt, v => v && v > budget.tbt],
  ['totalTransferKB','TotalTransferKB', totalTransferKB, budget.totalTransferKB, v => v && v > budget.totalTransferKB]
];

const failures = checks.filter(c => c[4](c[2]));
console.log('Perf Budget Report:\n');
checks.forEach(([key,label,value,limit]) => {
  console.log(`${label}: ${value !== undefined ? value : 'n/a'} (limit ${limit})`);
});

if (failures.length){
  console.error(`\n❌ Budget failures: ${failures.map(f=>f[1]).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\n✅ All perf budgets satisfied.');
}
