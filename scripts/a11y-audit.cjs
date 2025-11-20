#!/usr/bin/env node
// Hi Accessibility Quick Audit
// Scans public HTML for common issues: missing alt on img, buttons without type, missing aria-label on interactive elements.
// Usage: node scripts/a11y-audit.js

const fs = require('fs');
const path = require('path');

const root = path.join(process.cwd(), 'public');

function walk(dir){
  const out = [];
  for (const entry of fs.readdirSync(dir)){
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (/\.html$/i.test(entry)) out.push(p);
  }
  return out;
}

function analyze(file){
  const html = fs.readFileSync(file, 'utf8');
  const issues = [];
  // IMG alt
  const imgRegex = /<img\b[^>]*>/gi;
  let m;
  while((m = imgRegex.exec(html))){
    const tag = m[0];
    if (!/alt=/i.test(tag)) issues.push({ type:'img-missing-alt', snippet: tag.slice(0,120) });
  }
  // Buttons without type
  const btnRegex = /<button\b[^>]*>/gi;
  while((m = btnRegex.exec(html))){
    const tag = m[0];
    if (!/type=/i.test(tag)) issues.push({ type:'button-missing-type', snippet: tag.slice(0,120) });
  }
  // Interactive elements without aria-label (a with role button or aria pressed maybe) simplistic
  const interactiveRegex = /<(a|div|span)\b[^>]*onclick=["'][^"']+["'][^>]*>/gi;
  while((m = interactiveRegex.exec(html))){
    const tag = m[0];
    if (!/aria-label=/i.test(tag) && !/role=/i.test(tag)) {
      issues.push({ type:'interactive-missing-aria-label-or-role', snippet: tag.slice(0,120) });
    }
  }
  return { file, issues };
}

const files = walk(root);
const report = files.map(analyze);
const totalIssues = report.reduce((sum,r)=> sum + r.issues.length,0);

console.log(JSON.stringify({ summary:{ files: files.length, totalIssues }, report }, null, 2));

if (totalIssues > 0){
  console.log(`⚠️ Accessibility issues found: ${totalIssues}`);
  process.exitCode = 1;
} else {
  console.log('✅ No basic accessibility issues detected by heuristic audit.');
}
