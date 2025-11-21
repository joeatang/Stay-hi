/**
 * 🔧 CACHE MIGRATION SCRIPT
 * 
 * Purpose: Migrate old cache keys to unified system
 * 
 * Root Cause Fixed:
 * - Multiple cache keys (dashboard_total_cache vs globalTotalHis)
 * - Created race condition where stale cached values appeared as increments
 * - User saw: cached value 99 → database value 100 = "increment" on refresh
 * 
 * Solution:
 * - Unified all code to use globalTotalHis, globalHiWaves, globalTotalUsers
 * - This migration copies old values and cleans up duplicates
 */

(function migrateCacheKeys() {
  try {
    // Migrate old cache to new unified keys
    const oldTotal = localStorage.getItem('dashboard_total_cache');
    const oldWaves = localStorage.getItem('dashboard_waves_cache');
    const oldUsers = localStorage.getItem('dashboard_users_cache');
    const oldTime = localStorage.getItem('dashboard_waves_cache_time');
    
    // Copy to new keys if they don't already exist
    if (oldTotal && !localStorage.getItem('globalTotalHis')) {
      localStorage.setItem('globalTotalHis', oldTotal);
      console.log('📦 Migrated Total His cache:', oldTotal);
    }
    
    if (oldWaves && !localStorage.getItem('globalHiWaves')) {
      localStorage.setItem('globalHiWaves', oldWaves);
      console.log('📦 Migrated Hi Waves cache:', oldWaves);
    }
    
    if (oldUsers && !localStorage.getItem('globalTotalUsers')) {
      localStorage.setItem('globalTotalUsers', oldUsers);
      console.log('📦 Migrated Total Users cache:', oldUsers);
    }
    
    if (oldTime && !localStorage.getItem('globalHiWaves_time')) {
      localStorage.setItem('globalHiWaves_time', oldTime);
      console.log('📦 Migrated cache timestamp:', oldTime);
    }
    
    // Clean up old keys (after a grace period)
    // Keep for now in case users have both tabs open
    // These can be removed in a future deploy
    
    console.log('✅ Cache migration complete - unified to globalTotalHis system');
  } catch (error) {
    console.warn('⚠️ Cache migration failed (non-critical):', error);
  }
})();
