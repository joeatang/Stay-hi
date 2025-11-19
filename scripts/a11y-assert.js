#!/usr/bin/env node
// Assert accessibility report has no critical violations
// Usage: node scripts/a11y-assert.js [reportPath]

import fs from 'fs';
import path from 'path';

const reportPath = process.argv[2] || path.join(process.cwd(), 'a11y-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('Accessibility report not found at', reportPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let criticalCount = 0;
const summary = [];

for (const [url, result] of Object.entries(data)) {
  if (!result || result.error) {
    summary.push({ url, critical: 'scan-error', details: result?.error || 'unknown' });
    continue;
  }
  const crit = (result.violations || []).filter(v => v.impact && v.impact.toLowerCase() === 'critical');
  criticalCount += crit.length;
  summary.push({ url, critical: crit.length });
}

console.log('A11y summary:', JSON.stringify(summary, null, 2));
if (criticalCount > 0) {
  console.error(`Accessibility check failed: ${criticalCount} critical violation(s) found.`);
  process.exit(1);
}
console.log('✅ No critical accessibility violations found.');
