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
            logSuccess('Preflight dev page accessible');
        } else {
            logError('Preflight dev page not accessible');
        }

        // Test basic runtime components availability
        // Note: This is a simplified check since we're running in Node.js
        // The actual runtime checks happen in the browser-based preflight page
        
        const runtimeChecks = [
            'HiFlags system integration',
            'HiBase health monitoring',
            'HiMonitor telemetry',
            'HiRollout cohort logic'
        ];

        runtimeChecks.forEach(check => {
            // For now, just log that these need browser-based verification
            logInfo(`${check}: Requires browser verification at /public/dev/preflight/`);
        });

    } catch (error) {
        logError(`Preflight API check failed: ${error.message}`);
    }
}

async function checkPWAGuard() {
    const criticalFiles = [
        { path: 'sw.js', name: 'Service Worker' },
        { path: 'manifest.json', name: 'Web App Manifest' }
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

    // 6. Final result
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