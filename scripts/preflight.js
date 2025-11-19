#!/usr/bin/env node

/**
 * Hi-OS v1.0 Preflight Script
 * Programmatic system checks before any task
 */

import { execSync } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3030';
let failureCount = 0;

function logError(message) {
    console.error(`❌ ${message}`);
    failureCount++;
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function logInfo(message) {
    console.log(`ℹ️  ${message}`);
}

async function checkServerRunning() {
    try {
        const response = await fetch(`${SERVER_URL}/`);
        if (response.ok) {
            logSuccess('Local server running on port 3030');
            return true;
        }
    } catch (error) {
        logError('Local server not running on port 3030');
        logInfo('Run: python3 -m http.server 3030');
        return false;
    }
    return false;
}

async function checkVerifierPages() {
    const verifiers = [
        {
            path: '/public/dev/phase7-verifier/verifier.html',
            name: 'Phase 7 Verifier'
        },
        {
            path: '/public/dev/auth/phase9-verifier.html',
            name: 'Phase 9 Auth Verifier'
        }
    ];

    for (const verifier of verifiers) {
        try {
            const response = await fetch(`${SERVER_URL}${verifier.path}`);
            if (response.ok) {
                const content = await response.text();
                if (content.includes('ALL PASS') || content.includes('PASS')) {
                    logSuccess(`${verifier.name}: PASS detected`);
                } else {
                    logError(`${verifier.name}: No PASS status found`);
                }
            } else {
                logError(`${verifier.name}: Page not accessible (${response.status})`);
            }
        } catch (error) {
            logError(`${verifier.name}: Failed to fetch - ${error.message}`);
        }
    }
}

async function checkPreflightAPI() {
    try {
        // Check if preflight page exists and is accessible
        const response = await fetch(`${SERVER_URL}/public/dev/preflight/index.html`);
        if (response.ok) {
            const html = await response.text();
            logSuccess('Preflight dev page accessible');
            // Lightweight static assertions (avoid full DOM parsing)
            const expectedMarkers = [
              'data-preflight-root',
              'flags-smoke',
              'auth-ready',
              'pwa-status'
            ];
            expectedMarkers.forEach(marker => {
              if (html.includes(marker)) {
                logSuccess(`Preflight marker present: ${marker}`);
              } else {
                logError(`Preflight marker missing: ${marker}`);
              }
            });
        } else {
            logError('Preflight dev page not accessible');
            return;
        }

        // Declare runtime components that require browser context; provide actionable remediation hints
        const runtimeChecks = [
            { name: 'HiFlags system integration', hint: 'Verify global hiFlags & hiFlagsReady on preflight page console' },
            { name: 'AuthReady emission', hint: 'Check window session + membership after hi:auth-ready event' },
            { name: 'HiSupabase singleton', hint: 'Ensure only one instance; window.hiSupabase defined' },
            { name: 'SW gating (auth routes)', hint: 'Navigate to /signin.html?no-sw=1 and confirm no active registration' },
            { name: 'Monitoring (Sentry/Plausible)', hint: 'Check network tab for analytics and absence of Sentry errors' }
        ];
        runtimeChecks.forEach(rc => logInfo(`${rc.name}: Browser verification required (${rc.hint})`));

    } catch (error) {
        logError(`Preflight API check failed: ${error.message}`);
    }
}

async function checkPWAGuard() {
    const criticalFiles = [
        { path: 'public/sw.js', name: 'Service Worker' },
        { path: 'public/manifest.json', name: 'Web App Manifest' }
    ];

    for (const file of criticalFiles) {
        try {
            if (fs.existsSync(file.path)) {
                const stats = fs.statSync(file.path);
                logSuccess(`${file.name}: File exists (${stats.size} bytes)`);
                
                // TODO: Add checksum verification against checkpoint-20251101-2222-prod-stable.md
                logInfo(`${file.name}: Checksum verification pending (needs phase4-prod-stable baseline)`);
            } else {
                logError(`${file.name}: File not found at ${file.path}`);
            }
        } catch (error) {
            logError(`${file.name}: Check failed - ${error.message}`);
        }
    }
}

async function checkHiSupabaseSingleton() {
    // Enhanced heuristic: only count files that actually instantiate a client
    try {
        const libDir = path.join(process.cwd(), 'public', 'lib');
        const files = fs.readdirSync(libDir).filter(f => /HiSupabase.*\.js$/.test(f));
        const activeCandidates = [];
        files.forEach(f => {
            try {
                const content = fs.readFileSync(path.join(libDir, f), 'utf8');
                if (/createClient\(/.test(content)) {
                    activeCandidates.push(f);
                }
            } catch {}
        });
        const v3Present = files.some(f => f.includes('v3'));
        if (!v3Present) {
            logError('HiSupabase v3 file missing');
        } else {
            logSuccess('HiSupabase v3 file present');
        }
        if (activeCandidates.length > 1) {
            logError(`Multiple active Supabase client implementations: ${activeCandidates.join(', ')}`);
        } else {
            logSuccess(`Singleton Supabase client confirmed (active file: ${activeCandidates[0] || 'none'})`);
        }
        if (files.length > activeCandidates.length) {
            logInfo(`Detected ${files.length - activeCandidates.length} legacy stub file(s) (ignored)`);
        }
    } catch (e) {
        logError(`HiSupabase singleton check failed: ${e.message}`);
    }
}

async function checkFlagsGlobalAlias() {
    try {
        const flagsPath = path.join(process.cwd(), 'public', 'lib', 'flags', 'HiFlags.js');
        if (!fs.existsSync(flagsPath)) {
            logError('HiFlags file missing at public/lib/flags/HiFlags.js');
            return;
        }
        const content = fs.readFileSync(flagsPath, 'utf8');
        if (/globalThis\.hiFlags\s*=/.test(content)) {
            logSuccess('HiFlags global alias defined');
        } else {
            logError('HiFlags global alias not found (globalThis.hiFlags)');
        }
        if (/globalThis\.hiFlagsReady\s*=/.test(content)) {
            logSuccess('HiFlags readiness promise exported');
        } else {
            logError('HiFlags readiness promise missing (globalThis.hiFlagsReady)');
        }
    } catch (e) {
        logError(`HiFlags global alias check failed: ${e.message}`);
    }
}

async function checkSentryVendorAlignment() {
    try {
        const sentryVendor = path.join(process.cwd(), 'public', 'lib', 'monitoring', 'vendors', 'sentry.js');
        if (!fs.existsSync(sentryVendor)) {
            logError('Sentry vendor file missing in public/lib/monitoring/vendors');
            return;
        }
        const content = fs.readFileSync(sentryVendor, 'utf8');
        const requiredExports = ['initSentry', 'captureError'];
        requiredExports.forEach(exp => {
            if (new RegExp(`export .*${exp}`).test(content)) {
                logSuccess(`Sentry vendor export present: ${exp}`);
            } else {
                logError(`Sentry vendor export missing: ${exp}`);
            }
        });
    } catch (e) {
        logError(`Sentry vendor alignment check failed: ${e.message}`);
    }
}

async function checkAccessibilityMarkers() {
    try {
        // 1) Premium Calendar modal JS includes ARIA dialog semantics
        const calPath = path.join(process.cwd(), 'public', 'assets', 'premium-calendar.js');
        if (fs.existsSync(calPath)) {
            const calJs = fs.readFileSync(calPath, 'utf8');
            const hasRoleDialog = /setAttribute\(["']role["']\s*,\s*["']dialog["']\)/.test(calJs);
            const hasAriaModal = /setAttribute\(["']aria-modal["']\s*,\s*["']true["']\)/.test(calJs);
            const hasAriaLabelledby = /setAttribute\(["']aria-labelledby["']\s*,\s*["']calTitle["']\)/.test(calJs);
            const hasLiveRegion = /id=["']calendarLiveRegion["']/.test(calJs);
            if (hasRoleDialog && hasAriaModal && hasAriaLabelledby && hasLiveRegion) {
                logSuccess('Calendar A11y markers present');
            } else {
                if (!hasRoleDialog) logError('Calendar A11y: Missing role=dialog setAttribute');
                if (!hasAriaModal) logError('Calendar A11y: Missing aria-modal="true"');
                if (!hasAriaLabelledby) logError('Calendar A11y: Missing aria-labelledby to calTitle');
                if (!hasLiveRegion) logError('Calendar A11y: Missing calendarLiveRegion live area');
            }
        } else {
            logError('Calendar A11y: premium-calendar.js not found');
        }

        // 2) Milestone toast container ensures SR announcement
        const toastPath = path.join(process.cwd(), 'public', 'lib', 'streaks', 'HiMilestoneToast.js');
        if (fs.existsSync(toastPath)) {
            const tJs = fs.readFileSync(toastPath, 'utf8');
            const hasRole = /setAttribute\(\'role\',\'status\'\)/.test(tJs) || /role\',\s*\"status\"/.test(tJs);
            const hasLive = /aria-live\',\'polite\'/.test(tJs) || /aria-live\",\s*\"polite\"/.test(tJs);
            if (hasRole && hasLive) {
                logSuccess('Milestone toast A11y: role=status and aria-live present');
            } else {
                logError('Milestone toast A11y: Missing role=status or aria-live');
            }
        } else {
            logError('Milestone toast A11y: HiMilestoneToast.js not found');
        }

        // 3) Muscle page toast is a live status region
        try {
            const res = await fetch(`${SERVER_URL}/public/hi-muscle.html`);
            if (res.ok) {
                const html = await res.text();
                const hasToast = /id=\"toast\"[^>]*role=\"status\"[^>]*aria-live=\"polite\"/.test(html);
                if (hasToast) logSuccess('Muscle toast A11y: role=status + aria-live present');
                else logError('Muscle toast A11y: Missing role=status or aria-live');
            } else {
                logError(`Muscle toast A11y: Page fetch failed (${res.status})`);
            }
        } catch (e) {
            logError(`Muscle toast A11y: Fetch error - ${e.message}`);
        }

        // 4) ShareSheet celebration toast announces via SR
        const shareJsPath = path.join(process.cwd(), 'public', 'ui', 'HiShareSheet', 'HiShareSheet.js');
        if (fs.existsSync(shareJsPath)) {
            const sJs = fs.readFileSync(shareJsPath, 'utf8');
            const hasCelebrationA11y = /showCelebrationToast\([\s\S]*?setAttribute\('\s*role\s*',\s*'status'\)/.test(sJs)
              && /aria-live\s*',\s*'polite'/.test(sJs);
            if (hasCelebrationA11y) logSuccess('ShareSheet celebration toast A11y markers present');
            else logError('ShareSheet celebration toast A11y markers missing');
        }
    } catch (e) {
        logError(`Accessibility markers check failed: ${e.message}`);
    }
}

async function checkProjectStructure() {
    const requiredPaths = [
        'public/dev/index.html',
        'public/dev/preflight/index.html',
        'HI_OPERATING_SYSTEM.md',
        'lib/',
        'ui/'
    ];

    requiredPaths.forEach(reqPath => {
        if (fs.existsSync(reqPath)) {
            logSuccess(`Project structure: ${reqPath} exists`);
        } else {
            logError(`Project structure: Missing ${reqPath}`);
        }
    });
}

async function main() {
    console.log('\n🧠 Hi-OS v1.0 Preflight Check\n');
    
    const startTime = Date.now();
    
    // 1. Check local server
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
        console.log('\n❌ Hi-OS Preflight FAIL - Server not running');
        process.exit(1);
    }

    // 2. Check project structure
    logInfo('Checking project structure...');
    await checkProjectStructure();

    // 3. Check verifier pages
    logInfo('Checking verifier pages...');
    await checkVerifierPages();

    // 4. Check preflight systems
    logInfo('Checking preflight systems...');
    await checkPreflightAPI();

    // 5. Check PWA guard
    logInfo('Checking PWA guard...');
    await checkPWAGuard();

    // 6. HiSupabase singleton check
    logInfo('Checking Supabase singleton...');
    await checkHiSupabaseSingleton();

    // 7. HiFlags global alias check
    logInfo('Checking HiFlags global alias...');
    await checkFlagsGlobalAlias();

    // 8. Sentry vendor alignment
    logInfo('Checking monitoring vendors (Sentry)...');
    await checkSentryVendorAlignment();

    // 9. Accessibility marker checks
    logInfo('Checking accessibility markers...');
    await checkAccessibilityMarkers();

    // Final result
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\n📊 Preflight completed in ${duration}ms`);
    
    if (failureCount === 0) {
        console.log('\n✅ Hi-OS Preflight PASS');
        console.log('🚀 Ready to proceed with development tasks');
        process.exit(0);
    } else {
        console.log(`\n❌ Hi-OS Preflight FAIL (${failureCount} issues)`);
        console.log('🔧 Fix issues above before proceeding');
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the preflight check
main().catch(error => {
    console.error('❌ Preflight script failed:', error.message);
    process.exit(1);
});