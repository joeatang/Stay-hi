#!/usr/bin/env node
/**
 * update-health-timestamp.js (ESM)
 * Injects current UTC ISO timestamp into public/health.html.
 */
import fs from 'fs';
import path from 'path';

const file = path.resolve(process.cwd(), 'public', 'health.html');
if (!fs.existsSync(file)) {
  console.error('health.html not found at', file);
  process.exit(1);
}

let html = fs.readFileSync(file, 'utf-8');
const now = new Date().toISOString();
const versionTag = process.env.HI_VERSION || 'MVP-1.0';

html = html.replace(/(Build Timestamp:\s*<code>)([^<]*)(<\/code>)/i, `$1${now}$3`);
html = html.replace(/(Version:\s*<code>)([^<]*)(<\/code>)/i, `$1${versionTag}$3`);

fs.writeFileSync(file, html);
console.log('Updated health.html with timestamp', now, 'version', versionTag);
