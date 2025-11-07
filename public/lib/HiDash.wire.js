/**
 * HiDash.wire.js - S-DASH Stats Row Wiring
 * 
 * Flag-gated stats populator for #statTotal, #stat7d, #statStreak, #globalPill
 * Uses existing HiMetrics/HiBase data sources with 2s timeout and graceful fallbacks
 */

// Flag-gated initialization
(async function initSDashStatsWiring() {
  try {
    // Wait for HiFlags to be available with initialization delay
    let attempts = 0;
    while (!window.HiFlags && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.HiFlags) {
      console.warn('[S-DASH] HiFlags not available after timeout, skipping stats wiring');
      return;
    }

    // Check required flags
    const [dashV3, statsRowV1] = await Promise.all([
      window.HiFlags.getFlag('hi_dash_v3', false),
      window.HiFlags.getFlag('hi_dash_stats_row_v1', false)
    ]);

    if (!dashV3 || !statsRowV1) {
      console.log('[S-DASH] Stats row disabled by flags', { dashV3, statsRowV1 });
      return;
    }

    console.log('[S-DASH] Stats row wiring enabled');
    
    // Set up 2-second timeout for data loading
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Stats timeout')), 2000)
    );

    try {
      // Race timeout against data loading
      await Promise.race([timeout, wireStatsRow()]);
    } catch (error) {
      if (error.message === 'Stats timeout') {
        console.warn('[S-DASH] Stats loading timeout, rendering placeholders');
        renderPlaceholders();
      } else {
        console.error('[S-DASH] Stats wiring error:', error);
        renderPlaceholders();
      }
    }

  } catch (error) {
    console.error('[S-DASH] Stats wiring initialization failed:', error);
  }
})();

/**
 * Main stats wiring function
 */
async function wireStatsRow() {
  console.log('[S-DASH] Loading stats data...');

  // Fetch personal stats
  const personalStats = await fetchPersonalStats();
  
  // Fetch global stats (reuse existing global variables if available)
  const globalStats = await fetchGlobalStats();

  // Populate DOM elements
  populateStatsDOM(personalStats, globalStats);

  // Emit telemetry
  console.log('hibase.stats.rendered', {
    total: personalStats.total,
    seven: personalStats.sevenDay,
    streak: personalStats.streak,
    globalHi5s: globalStats.hi5s,
    globalWaves: globalStats.waves
  });

  // Unhide stats anchors after successful data load
  unhideStatsAnchors();
}

/**
 * Fetch personal stats using existing HiBase/legacy systems
 */
async function fetchPersonalStats() {
  const stats = {
    total: 0,
    sevenDay: 0,
    streak: 0
  };

  try {
    // Try HiBase first (if available)
    if (window.HiBase?.stats?.getPersonalStats) {
      console.log('[S-DASH] Fetching personal stats via HiBase...');
      const result = await window.HiBase.stats.getPersonalStats();
      if (!result.error) {
        stats.total = result.data?.totalSubmissions || 0;
        stats.sevenDay = result.data?.weeklySubmissions || 0;
      }
    }

    // Fetch streak separately (existing pattern)
    if (window.HiBase?.getUserStreak && window.hiAuth?.getCurrentUser) {
      const user = window.hiAuth.getCurrentUser();
      if (user && user.id && user.id !== 'anonymous') {
        const streakResult = await window.HiBase.getUserStreak(user.id);
        if (!streakResult.error) {
          stats.streak = streakResult.data?.streak?.current || 0;
        }
      }
    } else {
      // Fallback to localStorage for streak
      const localStreak = localStorage.getItem('user_current_streak') || '0';
      stats.streak = parseInt(localStreak, 10);
    }

    console.log('[S-DASH] Personal stats loaded:', stats);
    return stats;

  } catch (error) {
    console.warn('[S-DASH] Personal stats fetch failed:', error);
    return stats; // Return zeros on error
  }
}

/**
 * Fetch global stats using existing HiMetrics system
 */
async function fetchGlobalStats() {
  const stats = {
    hi5s: 0,
    waves: 0
  };

  try {
    // Try HiMetrics first (existing system)
    if (window.HiMetrics?.load) {
      console.log('[S-DASH] Fetching global stats via HiMetrics...');
      const metrics = await window.HiMetrics.load();
      stats.hi5s = metrics.hi5s || 0;
      stats.waves = metrics.waves || 0;
    } else if (window.gTotalHis !== undefined && window.gWaves !== undefined) {
      // Fallback to existing globals
      console.log('[S-DASH] Using existing global variables');
      stats.hi5s = window.gTotalHis;
      stats.waves = window.gWaves;
    } else if (window.HiBase?.stats?.getMetrics) {
      // Final fallback to HiBase
      console.log('[S-DASH] Fetching global stats via HiBase...');
      const metrics = await window.HiBase.stats.getMetrics();
      stats.hi5s = metrics.hi5s?.data || 0;
      stats.waves = metrics.waves?.data || 0;
    }

    console.log('[S-DASH] Global stats loaded:', stats);
    return stats;

  } catch (error) {
    console.warn('[S-DASH] Global stats fetch failed:', error);
    return stats; // Return zeros on error
  }
}

/**
 * Populate DOM elements with stats data
 */
function populateStatsDOM(personalStats, globalStats) {
  // Personal stats
  const statTotal = document.getElementById('statTotal');
  const stat7d = document.getElementById('stat7d');
  const statStreak = document.getElementById('statStreak');
  const globalPill = document.getElementById('globalPill');

  if (statTotal) {
    statTotal.textContent = personalStats.total.toLocaleString();
  }

  if (stat7d) {
    stat7d.textContent = personalStats.sevenDay.toLocaleString();
  }

  if (statStreak) {
    statStreak.textContent = personalStats.streak.toString();
  }

  if (globalPill) {
    globalPill.textContent = `Global: ${globalStats.hi5s.toLocaleString()} hi-5s • ${globalStats.waves.toLocaleString()} waves`;
  }

  console.log('[S-DASH] DOM populated with stats');
}

/**
 * Render placeholder values when data is not available
 */
function renderPlaceholders() {
  const statTotal = document.getElementById('statTotal');
  const stat7d = document.getElementById('stat7d');
  const statStreak = document.getElementById('statStreak');
  const globalPill = document.getElementById('globalPill');

  if (statTotal) statTotal.textContent = '—';
  if (stat7d) stat7d.textContent = '—';
  if (statStreak) statStreak.textContent = '—';
  if (globalPill) globalPill.textContent = 'Global: — hi-5s • — waves';

  console.log('[S-DASH] Placeholders rendered');
  
  // Still unhide anchors even with placeholders
  unhideStatsAnchors();
}

/**
 * Remove hidden class from stats anchors
 */
function unhideStatsAnchors() {
  const container = document.getElementById('sDashAnchors');
  if (container) {
    container.style.display = 'block';
    console.log('[S-DASH] Stats anchors unhidden');
  }
}