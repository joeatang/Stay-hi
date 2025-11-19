#!/usr/bin/env node
/**
 * header-audit.mjs
 * Usage: node scripts/header-audit.mjs <baseUrl>
 * Checks key routes for security headers, CSP, redirects.
 */

const base = process.argv[2];
if (!base) {
  console.error('Usage: node scripts/header-audit.mjs <baseUrl>');
  process.exit(1);
}

const urls = [
  '/',
  '/signin.html',
  '/public/post-auth.html',
  '/health.html',
  '/signin-enhanced.html'
];

const wantHeaders = [
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'strict-transport-security'
];

function pad(s, n) { return (s + ' '.repeat(n)).slice(0, n); }

async function check(urlPath) {
  const u = new URL(urlPath, base).toString();
  // HEAD often sufficient, but some servers don't support; fall back to GET
  let res;
  try {
    res = await fetch(u, { method: 'HEAD', redirect: 'manual' });
    if (res.status === 405) throw new Error('HEAD not allowed');
  } catch {
    res = await fetch(u, { method: 'GET', redirect: 'manual' });
  }
  const status = res.status;
  const headers = {};
  for (const [k, v] of res.headers) headers[k.toLowerCase()] = v;

  const headerSummary = wantHeaders.map(h => `${pad(h, 28)}: ${headers[h] ? '✓' : '—'}`).join('\n        ');
  let location = headers['location'] || '';
  const line = `${pad(urlPath, 24)} -> ${status}${location ? ' -> ' + location : ''}`;
  return { line, headerSummary };
}

(async () => {
  console.log(`Auditing headers for base: ${base}`);
  for (const p of urls) {
    try {
      const { line, headerSummary } = await check(p);
      console.log(line);
      console.log('        ' + headerSummary);
    } catch (e) {
      console.log(`${pad(p, 24)} -> ERROR ${e.message}`);
    }
  }
})();
