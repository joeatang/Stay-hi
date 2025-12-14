/**
 * 🛡️ STATS WRITE GUARD - WOZ-Grade Diagnostic + Protection
 * 
 * MISSION: Catch and block unexpected Total His increments during navigation
 * 
 * PROBLEM DISCOVERED:
 * - Multiple loaders write gTotalHis from different sources (cache, RPC, table)
 * - Navigation triggers replays → counter jumps without actual share submission
 * - User caught: Dashboard ↔ Hi Island navigation incremented counter
 * 
 * SOLUTION:
 * - Single authoritative write (UnifiedStatsLoader from global_stats table)
 * - All other writers gated: only if gTotalHis is undefined
 * - Dev mode: log all write attempts with stack trace to catch rogues
 */

(function() {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
  const writeLog = [];
  let authoritative = false;
  let lastValue = null;

  // Intercept all writes to window.gTotalHis
  Object.defineProperty(window, 'gTotalHis', {
    get() {
      return lastValue;
    },
    set(newValue) {
      const caller = new Error().stack.split('\n')[2]?.trim() || 'unknown';
      const source = caller.match(/at\s+([^\s]+)/)?.[1] || caller;
      
      // Skip if unchanged
      if (newValue === lastValue) return;
      
      const entry = {
        timestamp: Date.now(),
        oldValue: lastValue,
        newValue,
        source,
        authoritative,
        page: window.location.pathname
      };
      
      writeLog.push(entry);
      
      // Dev mode: log all writes
      if (isDev) {
        const delta = newValue > lastValue ? `+${newValue - lastValue}` : `${newValue - lastValue}`;
        console.log(`[StatsGuard] gTotalHis: ${lastValue} → ${newValue} (${delta})`, {
          source,
          authoritative: authoritative ? '✅ AUTH' : '⚠️ SECONDARY',
          caller
        });
      }
      
      // CRITICAL: After authoritative lock, only allow writes from trusted sources
      // Trusted sources: UnifiedStatsLoader (setGlobals), GoldStandardTracker (trackShareSubmission)
      const trustedSources = ['setGlobals', 'GoldStandardTracker', 'trackShareSubmission', 'UnifiedStatsLoader'];
      const isTrustedSource = trustedSources.some(trusted => source.includes(trusted));
      
      if (authoritative && !isTrustedSource) {
        if (isDev) {
          console.warn(`[StatsGuard] ⛔ BLOCKED unauthorized write attempt from ${source}`);
          console.log('[StatsGuard] Stack trace:', new Error().stack);
        }
        return; // Block the write
      }
      
      lastValue = newValue;
      window._gTotalHisIsTemporary = false;
      
      // Update UI
      try {
        document.querySelectorAll('#globalTotalHis, [data-stat="total-his"]').forEach(el => {
          if (el && typeof newValue === 'number') {
            el.textContent = newValue.toLocaleString();
          }
        });
      } catch (e) {
        // Silent fail on UI update
      }
    },
    configurable: false
  });

  // Mark authoritative write (called by UnifiedStatsLoader only)
  window.markStatsAuthoritative = function() {
    authoritative = true;
    if (isDev) {
      console.log('[StatsGuard] ✅ Authoritative stats locked');
    }
  };

  // Get write log for debugging
  window.getStatsWriteLog = function() {
    return {
      writes: writeLog,
      current: lastValue,
      authoritative,
      summary: {
        totalWrites: writeLog.length,
        uniqueSources: [...new Set(writeLog.map(e => e.source))],
        unexpectedIncreases: writeLog.filter(e => 
          e.newValue > e.oldValue && 
          !e.source.includes('GoldStandardTracker') &&
          !e.source.includes('share')
        )
      }
    };
  };

  if (isDev) {
    console.log('[StatsGuard] 🛡️ Stats Write Guard initialized');
    console.log('[StatsGuard] Dev mode active - all writes will be logged');
    console.log('[StatsGuard] Check logs with: window.getStatsWriteLog()');
  }
})();
