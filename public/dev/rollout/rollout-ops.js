/**
 * public/dev/rollout/rollout-ops.js
 * Dev console operations for rollout management
 * 
 * Provides HiRolloutOps global for development testing
 */

import { setRollout, getRollout } from '../../../lib/rollout/HiRollout.js';
import * as HiFlags from '../../../lib/flags/HiFlags.js';
import { trackEvent } from '../../../lib/monitoring/HiMonitor.js';

window.HiRolloutOps = {
    set(key, pct) {
        setRollout(key, pct);
        trackEvent('rollout_set', { key, pct: getRollout(key) });
        console.log('✅ Rollout updated', key, getRollout(key));
    },
    
    show(key) {
        console.log('ℹ️ Rollout', key, getRollout(key));
        return getRollout(key);
    },
    
    async check(flag) {
        const on = await HiFlags.isEnabledCohort(flag);
        console.log(`🔎 ${flag} enabled for this identity?`, on);
        return on;
    },
    
    // Helper for testing different rollout levels
    async testCohort(flag, samples = 100) {
        console.log(`🧪 Testing ${flag} cohort distribution (${samples} samples):`);
        let enabled = 0;
        
        // Simulate different session IDs
        const originalSessionId = localStorage.getItem('hi_session_id');
        
        for (let i = 0; i < samples; i++) {
            // Create temporary session ID for testing
            localStorage.setItem('hi_session_id', `test-${i}-${Date.now()}`);
            const result = await HiFlags.isEnabledCohort(flag);
            if (result) enabled++;
        }
        
        // Restore original session ID
        if (originalSessionId) {
            localStorage.setItem('hi_session_id', originalSessionId);
        } else {
            localStorage.removeItem('hi_session_id');
        }
        
        const percentage = Math.round((enabled / samples) * 100);
        const expected = getRollout(flag);
        console.log(`📊 Results: ${enabled}/${samples} (${percentage}%) | Expected: ~${expected}%`);
        return { enabled, samples, percentage, expected };
    },
    
    // Show all current rollout settings
    showAll() {
        const flags = ['hifeed_enabled', 'hibase_shares_enabled', 'hibase_profile_enabled', 'hibase_referrals_enabled'];
        console.log('📋 Current rollout percentages:');
        flags.forEach(flag => {
            console.log(`  ${flag}: ${getRollout(flag)}%`);
        });
    },
    
    // Quick presets for testing
    presets: {
        start() {
            window.HiRolloutOps.set('hifeed_enabled', 10);
            window.HiRolloutOps.set('hibase_shares_enabled', 10);
            window.HiRolloutOps.set('hibase_profile_enabled', 10);
            window.HiRolloutOps.set('hibase_referrals_enabled', 10);
            console.log('🎯 All flags set to 10% (start phase)');
        },
        
        mid() {
            window.HiRolloutOps.set('hifeed_enabled', 50);
            window.HiRolloutOps.set('hibase_shares_enabled', 50);
            window.HiRolloutOps.set('hibase_profile_enabled', 50);
            window.HiRolloutOps.set('hibase_referrals_enabled', 50);
            console.log('🎯 All flags set to 50% (mid phase)');
        },
        
        full() {
            window.HiRolloutOps.set('hifeed_enabled', 100);
            window.HiRolloutOps.set('hibase_shares_enabled', 100);
            window.HiRolloutOps.set('hibase_profile_enabled', 100);
            window.HiRolloutOps.set('hibase_referrals_enabled', 100);
            console.log('🎯 All flags set to 100% (full rollout)');
        },
        
        off() {
            window.HiRolloutOps.set('hifeed_enabled', 0);
            window.HiRolloutOps.set('hibase_shares_enabled', 0);
            window.HiRolloutOps.set('hibase_profile_enabled', 0);
            window.HiRolloutOps.set('hibase_referrals_enabled', 0);
            console.log('🎯 All flags set to 0% (emergency off)');
        }
    }
};

console.log('🛠️ HiRolloutOps ready:');
console.log('  set(key, pct) - Update rollout percentage');
console.log('  show(key) - Show current percentage');  
console.log('  check(flag) - Test if enabled for current identity');
console.log('  testCohort(flag, samples) - Test distribution');
console.log('  showAll() - Show all rollout percentages');
console.log('  presets.start|mid|full|off() - Quick presets');
console.log('Example: HiRolloutOps.set("hifeed_enabled", 25)');

// Initialize telemetry tracking
trackEvent('rollout_ops_loaded', { timestamp: Date.now() });