// Externalized from hi-dashboard.html (disabled inline module)
// Purpose: HiMetrics adapter for dashboard with safe fallbacks

// Load membership system first for access control
await import('../membership/MembershipSystem.js');

import HiMetrics from '../HiMetrics.js';

async function initDashboardMetrics() {
  try {
    console.log('[Dashboard] Initializing HiMetrics adapter...');

    const unsubscribe = HiMetrics.subscribe('dashboard-page', (metrics, cacheInfo) => {
      console.log('[Dashboard] Metrics updated:', metrics);

      // Debug badge (dev only)
      if ((window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) || window.location.search.includes('debug=1')) {
        const debugEl = document.getElementById('hiMetricsDebugDash');
        const statusEl = document.getElementById('dashMetricsStatus');
        const cacheEl = document.getElementById('dashCacheAge');

        if (debugEl && statusEl && cacheEl) {
          debugEl.style.display = 'block';
          statusEl.textContent = cacheInfo?.fromCache ? '✅' : '🔄';
          cacheEl.textContent = `Cache: ${cacheInfo?.ageSeconds || 0}s`;
        }
      }

      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }

      if (window.loadUserStreak) {
        window.loadUserStreak();
      }
    });

    const metrics = await HiMetrics.load();
    console.log('[Dashboard] ✅ HiMetrics adapter initialized with globals', {
      gWaves: window.gWaves,
      gTotalHis: window.gTotalHis,
      gUsers: window.gUsers
    });

    window.dashboardMetricsCleanup = unsubscribe;
    window.hiStatsLoader = () => HiMetrics.load();

  } catch (error) {
    console.error('[Dashboard] HiMetrics initialization failed:', error);

    try {
      if (window.HiBase?.stats?.getMetrics) {
        const metrics = await window.HiBase.stats.getMetrics();
        console.log('🚨 FALLBACK CODE EXECUTING - THIS IS THE BUG!', { metrics });
        console.log('🚨 About to reset window.gWaves from', window.gWaves, 'to', metrics.waves?.data || 0);
        // Disabled overrides to avoid conflicting with DB values
        // window.gWaves = metrics.waves?.data || 0;
        // window.gTotalHis = metrics.hi5s?.data || 0;
        // window.gUsers = 0;

        if (window.updateGlobalStats) {
          window.updateGlobalStats();
        }

        console.log('[Dashboard] ✅ Fallback stats loaded');
      }
    } catch (fallbackError) {
      console.error('[Dashboard] Fallback also failed:', fallbackError);
    }
  }
}

window.addEventListener('DOMContentLoaded', initDashboardMetrics);
window.addEventListener('beforeunload', () => {
  if (window.dashboardMetricsCleanup) {
    window.dashboardMetricsCleanup();
    console.log('[Dashboard] HiMetrics subscription cleaned up');
  }
});
