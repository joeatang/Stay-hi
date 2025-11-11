#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE SUPABASE & TAB FLOW TEST
 * Tests the long-term solutions for share submission and tab coordination
 */

console.log('🚀 Testing Supabase & Tab Flow...');

// Test data
const testShare = {
  currentEmoji: '🌟',
  desiredEmoji: '✨',
  text: 'Test Hi 5 from comprehensive audit',
  isAnonymous: false,
  location: 'Test Location',
  isPublic: true,
  origin: 'hi-island',
  type: 'hi_island'
};

// Test scenarios
const tests = [
  {
    name: 'Supabase Client Resolution',
    test: async () => {
      // Check if getSupabase finds a client
      const client = window.getSupabase?.();
      return client ? 'PASS' : 'FAIL - No client found';
    }
  },
  {
    name: 'Public Share Insert',
    test: async () => {
      try {
        const result = await window.hiDB?.insertPublicShare(testShare);
        return result?.ok ? 'PASS' : `FAIL - ${result?.error}`;
      } catch (error) {
        return `FAIL - Exception: ${error.message}`;
      }
    }
  },
  {
    name: 'Archive Insert (Authenticated)',
    test: async () => {
      try {
        const archiveData = {
          currentEmoji: testShare.currentEmoji,
          desiredEmoji: testShare.desiredEmoji,
          journal: testShare.text,
          location: testShare.location,
          origin: testShare.origin,
          type: testShare.type
        };
        const result = await window.hiDB?.insertArchive(archiveData);
        return result?.ok ? 'PASS' : `FAIL - ${result?.error}`;
      } catch (error) {
        return `FAIL - Exception: ${error.message}`;
      }
    }
  },
  {
    name: 'Feed Data Fetch',
    test: async () => {
      try {
        const shares = await window.hiDB?.fetchPublicShares({ limit: 5 });
        return shares?.length >= 0 ? 'PASS' : 'FAIL - No data returned';
      } catch (error) {
        return `FAIL - Exception: ${error.message}`;
      }
    }
  },
  {
    name: 'Tab Switch Coordination',
    test: async () => {
      try {
        if (!window.hiRealFeed) {
          return 'SKIP - HiRealFeed not initialized';
        }
        
        // Test switching between tabs
        await window.hiRealFeed.switchTab('general');
        await window.hiRealFeed.switchTab('archives');
        await window.hiRealFeed.switchTab('general');
        
        return 'PASS';
      } catch (error) {
        return `FAIL - Exception: ${error.message}`;
      }
    }
  }
];

console.log('\n📊 TEST RESULTS:');
console.log('='.repeat(50));

// Export for browser execution
if (typeof window !== 'undefined') {
  window.runSupabaseTests = async () => {
    for (const test of tests) {
      console.log(`\n🧪 ${test.name}:`);
      const result = await test.test();
      console.log(`   Result: ${result}`);
    }
    console.log('\n✅ All tests completed');
  };
}

// Node.js execution (for validation)
if (typeof module !== 'undefined') {
  module.exports = { tests };
  console.log('Tests exported for browser execution');
  console.log('Run in browser console: runSupabaseTests()');
}