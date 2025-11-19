import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Use an isolated port and serve from /public to avoid path confusion
const SERVER_PORT = process.env.PORT || 3040;
const DASH_URL = `http://localhost:${SERVER_PORT}/hi-dashboard.html`;
const REPORT_DIR = path.join(repoRoot, 'reports');

async function waitForOk(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);

  // Always start an isolated server from /public for this audit
  let serverProc;
  console.log(`🔧 Starting local server on ${SERVER_PORT} (cwd=public)...`);
  serverProc = spawn('python3', ['-m', 'http.server', String(SERVER_PORT)], {
    cwd: path.join(repoRoot, 'public'),
    stdio: 'ignore',
    detached: true,
  });
  try {
    await waitForOk(`http://localhost:${SERVER_PORT}/hi-dashboard.html`);
  } catch (e) {
    if (serverProc && serverProc.pid) process.kill(-serverProc.pid, 'SIGKILL');
    throw e;
  }

  // Ensure target is reachable
  await waitForOk(DASH_URL, 10000);

  const chrome = await launchChrome({ chromeFlags: ['--headless=new'] });
  const options = {
    logLevel: 'info',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    port: chrome.port,
  };

  console.log('🚀 Running Lighthouse on', DASH_URL);
  const runnerResult = await lighthouse(DASH_URL, options);

  const htmlReport = runnerResult.report[0];
  const jsonReport = runnerResult.report[1];
  const htmlPath = path.join(REPORT_DIR, 'lighthouse-dashboard.html');
  const jsonPath = path.join(REPORT_DIR, 'lighthouse-dashboard.json');
  fs.writeFileSync(htmlPath, htmlReport);
  fs.writeFileSync(jsonPath, jsonReport);

  const categories = runnerResult.lhr.categories;
  const scores = Object.fromEntries(
    Object.entries(categories).map(([k, v]) => [k, Math.round((v.score || 0) * 100)])
  );
  console.log('📊 Lighthouse Scores:', scores);
  console.log('📁 Reports saved to:', htmlPath);

  await chrome.kill();
  if (serverProc && serverProc.pid) {
    try { process.kill(-serverProc.pid, 'SIGKILL'); } catch {}
  }
}

run().catch(err => {
  console.error('❌ Lighthouse run failed:', err);
  process.exit(1);
});
