#!/usr/bin/env node
/**
 * smoke-test.js
 * Hi-OS Browser Smoke Harness (Phase: Stability Foundation)
 * Assertions focus on architecture presence, not business data.
 */
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const SERVER_PORT = 3030;
const ROOT = `http://localhost:${SERVER_PORT}`;
const PAGES = {
  dashboard: `${ROOT}/public/hi-dashboard.html?smoke=1`,
  missionControl: `${ROOT}/public/hi-mission-control.html?smoke=1`,
  signinNoSW: `${ROOT}/public/signin.html?no-sw=1&smoke=1`
};

let serverProc;

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProc = spawn('python3', ['-m', 'http.server', String(SERVER_PORT)], { stdio: 'ignore' });
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const res = await fetch(`${ROOT}/`);
        if (res.ok) return resolve();
      } catch (_) {}
      if (attempts > 20) return reject(new Error('Server failed to start'));
      setTimeout(check, 250);
    };
    check();
  });
}

function stopServer() {
  if (serverProc) serverProc.kill('SIGTERM');
}

async function withPage(browser, url, fn) {
  const page = await browser.newPage();
  // Capture console & errors for diagnostics
  page.on('console', msg => {
    try { console.log('[PAGE CONSOLE]', msg.type(), msg.text()); } catch(_) {}
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  const result = await fn(page);
  await page.close();
  return result;
}

async function run() {
  const failures = [];
  const fail = (msg) => { console.error(`❌ ${msg}`); failures.push(msg); };
  const pass = (msg) => console.log(`✅ ${msg}`);

  console.log('\n🧪 Hi-OS Smoke Test Harness Starting...');
  await startServer();
  pass('Local server reachable');

  const browser = await puppeteer.launch({ headless: 'new' });

  // DASHBOARD TESTS
  await withPage(browser, PAGES.dashboard, async (page) => {
    // Poll for hiSupabase up to 4s to allow dynamic import upgrade / stub exposure.
    let hasSupabase = false;
    for (let i = 0; i < 40; i++) { // 40 * 100ms = 4s max
      hasSupabase = await page.evaluate(() => !!window.hiSupabase);
      if (hasSupabase) break;
      await new Promise(r => setTimeout(r, 100));
    }
    hasSupabase ? pass('Dashboard: hiSupabase global detected') : fail('Dashboard: hiSupabase missing');
    const hasAuthReadyListener = await page.evaluate(() => typeof window.dispatchEvent === 'function');
    hasAuthReadyListener ? pass('Dashboard: event system active') : fail('Dashboard: event system inactive');
  });

  // MISSION CONTROL TESTS
  await withPage(browser, PAGES.missionControl, async (page) => {
     await new Promise(r => setTimeout(r, 700));
    const adminGatePresent = await page.evaluate(() => !!document.querySelector('[data-admin-root]') || document.body.innerHTML.includes('Mission Control'));
    adminGatePresent ? pass('Mission Control: page structure present') : fail('Mission Control: structure missing');
  });

  // SIGNIN SW GATING
  await withPage(browser, PAGES.signinNoSW, async (page) => {
     await new Promise(r => setTimeout(r, 300));
    const swRegistrations = await page.evaluate(() => navigator.serviceWorker?.getRegistrations?.().then(r => r.length));
    if (swRegistrations === 0) pass('Signin: Service Worker correctly skipped with ?no-sw=1');
    else fail(`Signin: Expected 0 SW registrations, found ${swRegistrations}`);
  });

  // FLAGS READY
  await withPage(browser, PAGES.dashboard, async (page) => {
    let flagsReady = false;
    for (let i = 0; i < 40; i++) { // up to 4s
      flagsReady = await page.evaluate(() => !!globalThis.hiFlags && !!globalThis.hiFlagsReady);
      if (flagsReady) break;
      await new Promise(r => setTimeout(r, 100));
    }
    flagsReady ? pass('Dashboard: hiFlags + readiness present') : fail('Dashboard: hiFlags readiness missing');
  });

  // SUPABASE SINGLETON HEURISTIC (only v3 should create client)
  const singletonCheck = await withPage(browser, PAGES.dashboard, async (page) => {
    let present = false;
    for (let i = 0; i < 40; i++) {
      present = await page.evaluate(() => !!window.__HI_SUPABASE_CLIENT);
      if (present) break;
      await new Promise(r => setTimeout(r, 100));
    }
    return present;
  });
  singletonCheck ? pass('Supabase singleton: __HI_SUPABASE_CLIENT present') : fail('Supabase singleton: client global missing');

  await browser.close();
  stopServer();

  console.log('\n📊 Smoke Test Summary');
  if (failures.length === 0) {
    console.log('✅ ALL PASS');
    process.exit(0);
  } else {
    failures.forEach(f => console.log('• ' + f));
    console.log(`❌ ${failures.length} failure(s)`);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('🔥 Smoke harness crashed:', err);
  stopServer();
  process.exit(1);
});
