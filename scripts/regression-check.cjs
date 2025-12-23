#!/usr/bin/env node

/**
 * 🛡️ REGRESSION CHECK - Pre/Post Deployment Verification
 * 
 * Runs automated checks to ensure critical systems remain functional
 * Usage: node scripts/regression-check.js [--local|--production]
 */

const https = require('https');
const http = require('http');

const TARGET = process.argv[2] === '--production' 
  ? 'https://stay-ctpw3o9r3-joeatangs-projects.vercel.app'
  : 'http://localhost:3030';

console.log(`\n🔍 Running regression checks against: ${TARGET}\n`);

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function pass(msg) {
  console.log(`✅ ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  failed++;
}

// ========================================
// CRITICAL SYSTEM CHECKS
// ========================================

test('Dashboard loads successfully', async () => {
  try {
    const html = await fetchPage('/hi-dashboard.html');
    if (html.includes('id="userStreak"')) {
      pass('Dashboard HTML contains streak counter element');
    } else {
      fail('Dashboard missing streak counter element');
    }
    if (html.includes('premium-calendar')) {
      pass('Dashboard includes calendar scripts');
    } else {
      fail('Dashboard missing calendar integration');
    }
  } catch (e) {
    fail(`Dashboard failed to load: ${e.message}`);
  }
});

test('Calendar assets have cache-busting', async () => {
  try {
    const html = await fetchPage('/hi-dashboard.html');
    if (html.includes('premium-calendar.js?v=')) {
      pass('Calendar JS has version parameter');
    } else {
      fail('Calendar JS missing cache-busting version');
    }
    if (html.includes('premium-calendar.css?v=')) {
      pass('Calendar CSS has version parameter');
    } else {
      fail('Calendar CSS missing cache-busting version');
    }
  } catch (e) {
    fail(`Calendar check failed: ${e.message}`);
  }
});

test('Hi-Island feed loads with filters', async () => {
  try {
    const html = await fetchPage('/hi-island-NEW.html');
    if (html.includes('HiRealFeed.js?v=')) {
      pass('Feed component has cache-busting version');
    } else {
      fail('Feed component missing version parameter');
    }
    if (html.includes('data-filter') || html.includes('originFilter')) {
      pass('Feed includes filter system');
    } else {
      fail('Feed missing filter implementation');
    }
  } catch (e) {
    fail(`Hi-Island check failed: ${e.message}`);
  }
});

test('Share sheet component exists', async () => {
  try {
    const content = await fetchPage('/ui/HiShareSheet/HiShareSheet.js');
    if (content.includes('class HiShareSheet') || content.includes('HiShareSheet.js')) {
      pass('Share sheet component found');
    } else {
      fail('Share sheet component missing or corrupted');
    }
    if (content.includes('handleSharePrivate') || content.includes('sharePrivateBtn')) {
      pass('Share sheet has share handlers');
    } else {
      fail('Share sheet missing critical handlers');
    }
  } catch (e) {
    fail(`Share sheet check failed: ${e.message}`);
  }
});

test('Streak system files intact', async () => {
  try {
    const dashboardMain = await fetchPage('/lib/boot/dashboard-main.js');
    if (dashboardMain.includes('loadUserStreak')) {
      pass('Dashboard has loadUserStreak function');
    } else {
      fail('Dashboard missing loadUserStreak function');
    }
    
    const streaksFile = await fetchPage('/lib/hibase/streaks.js');
    if (streaksFile.includes('_updateStreak') && streaksFile.includes('localStorage.setItem')) {
      pass('Streak system has cache sync');
    } else {
      fail('Streak system missing cache synchronization');
    }
  } catch (e) {
    fail(`Streak system check failed: ${e.message}`);
  }
});

test('Calendar system files intact', async () => {
  try {
    const calendar = await fetchPage('/assets/premium-calendar.js');
    if (calendar.includes('Hi Habit') && calendar.includes('Week Keeper')) {
      pass('Calendar has milestone badges');
    } else {
      fail('Calendar missing milestone badge system');
    }
    if (calendar.includes('loadHiMoments') && calendar.includes('hi-moments-data')) {
      pass('Calendar has data persistence');
    } else {
      fail('Calendar missing data persistence logic');
    }
  } catch (e) {
    fail(`Calendar system check failed: ${e.message}`);
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function fetchPage(path) {
  return new Promise((resolve, reject) => {
    const url = TARGET + path;
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ========================================
// RUN TESTS
// ========================================

(async function runTests() {
  for (const { name, fn } of tests) {
    console.log(`\n📋 ${name}`);
    try {
      await fn();
    } catch (e) {
      fail(`Test threw exception: ${e.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (failed > 0) {
    console.log('⚠️  REGRESSIONS DETECTED - Review failures above');
    console.log('💡 Rollback command: git reset --hard e9b210e && git push origin main --force\n');
    process.exit(1);
  } else {
    console.log('✅ ALL SYSTEMS OPERATIONAL - Safe to proceed\n');
    process.exit(0);
  }
})();
