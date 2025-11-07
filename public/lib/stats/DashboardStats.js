/**
 * DashboardStats.js - Tesla-Grade Hi-Dashboard Stats Loader
 * 
 * METRICS SEPARATION:
 * - Medallion Taps = Global Waves (1:1 ratio)
 * - Share Submissions = Global Hi's  
 * - Personal stats tracked separately from global
 * 
 * Integrates with:
 * - initHiStatsOnce() guard system
 * - S-DASH components (statTotal, stat7d, statStreak, globalPill)
 * - HiMetrics caching system
 * - HiBase personal stats API
 */

/**
 * Load and initialize all dashboard stats
 * Called via initHiStatsOnce('dashboard') 
 */
export async function loadDashboardStats() {
  console.log('🎯 [DashboardStats] Loading Tesla-grade stats system...');
  
  try {
    // Initialize stats sources in parallel
    await Promise.all([
      initializeGlobalStats(),
      initializePersonalStats(),
      initializeMedallionTracking()
    ]);
    
    console.log('✅ [DashboardStats] All stats systems initialized');
    
    // Trigger S-DASH population
    if (window.updateGlobalStats) {
      window.updateGlobalStats();
    }
    
  } catch (error) {
    console.error('❌ [DashboardStats] Initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize global stats tracking (Hi's + Waves)
 */
async function initializeGlobalStats() {
  console.log('🌍 [DashboardStats] Initializing global stats...');
  
  // Connect to HiMetrics system for global data
  if (window.HiMetrics) {
    const metrics = await window.HiMetrics.load();
    
    // Global Waves = Cumulative medallion taps across app
    window.gWaves = metrics.waves || 0;
    
    // Global Hi's = Share sheet submissions across hi-dashboard, hi-island, hi-muscle  
    window.gTotalHis = metrics.hi5s || 0;
    
    // Legacy compatibility
    window.gUsers = metrics.users || 0;
    
    console.log('🌍 Global Stats:', { waves: window.gWaves, his: window.gTotalHis });
  }
}

/**
 * Initialize personal user stats tracking
 */
async function initializePersonalStats() {
  console.log('👤 [DashboardStats] Initializing personal stats...');
  
  try {
    const personalStats = {
      totalSubmissions: 0,
      weeklySubmissions: 0, 
      currentStreak: 0,
      personalTaps: 0
    };
    
    // Try HiBase first if available
    if (window.HiBase?.stats?.getPersonalStats) {
      const result = await window.HiBase.stats.getPersonalStats();
      if (!result.error && result.data) {
        personalStats.totalSubmissions = result.data.totalSubmissions || 0;
        personalStats.weeklySubmissions = result.data.weeklySubmissions || 0;
      }
    }
    
    // Get streak data
    if (window.HiBase?.getUserStreak && window.hiAuth?.getCurrentUser) {
      const user = window.hiAuth.getCurrentUser();
      if (user && user.id && user.id !== 'anonymous') {
        const streakResult = await window.HiBase.getUserStreak(user.id);
        if (!streakResult.error) {
          personalStats.currentStreak = streakResult.data?.streak?.current || 0;
        }
      }
    } else {
      // Fallback to localStorage
      personalStats.currentStreak = parseInt(localStorage.getItem('user_current_streak') || '0', 10);
    }
    
    // Personal taps from localStorage 
    personalStats.personalTaps = parseInt(localStorage.getItem('user_medallion_taps') || '0', 10);
    
    // Store in window for S-DASH access
    window.personalStats = personalStats;
    
    console.log('👤 Personal Stats:', personalStats);
    
  } catch (error) {
    console.warn('⚠️ [DashboardStats] Personal stats failed, using defaults:', error);
    window.personalStats = { totalSubmissions: 0, weeklySubmissions: 0, currentStreak: 0, personalTaps: 0 };
  }
}

/**
 * Initialize medallion tap tracking (1:1 with Global Waves)
 */
async function initializeMedallionTracking() {
  console.log('🏅 [DashboardStats] Initializing medallion tracking...');
  
  // Ensure medallion tap handler is connected
  const medallion = document.getElementById('hiMedallion');
  if (medallion && !medallion.dataset.statsConnected) {
    
    medallion.addEventListener('click', handleMedallionTap);
    medallion.dataset.statsConnected = 'true';
    
    console.log('🏅 Medallion tap tracking connected');
  }
}

/**
 * Handle medallion tap with 1:1 Global Wave tracking
 */
function handleMedallionTap() {
  console.log('🏅 [DashboardStats] Medallion tapped - tracking wave...');
  
  try {
    // Increment personal tap count
    const currentPersonalTaps = parseInt(localStorage.getItem('user_medallion_taps') || '0', 10);
    const newPersonalTaps = currentPersonalTaps + 1;
    localStorage.setItem('user_medallion_taps', newPersonalTaps.toString());
    
    // Update personal stats
    if (window.personalStats) {
      window.personalStats.personalTaps = newPersonalTaps;
    }
    
    // Increment global waves (1:1 ratio)
    if (window.gWaves !== undefined) {
      window.gWaves += 1;
    }
    
    // Update HiMetrics cache if available
    if (window.HiMetrics?.updateCache) {
      window.HiMetrics.updateCache({ waves: window.gWaves });
    }
    
    console.log('🏅 Wave tracked:', { personalTaps: newPersonalTaps, globalWaves: window.gWaves });
    
    // Refresh stats display
    setTimeout(() => {
      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ [DashboardStats] Medallion tap tracking failed:', error);
  }
}

/**
 * Track share sheet submission (contributes to Global Hi's)
 */
export function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`📤 [DashboardStats] Share submitted from ${source}:`, metadata);
  
  try {
    // Increment personal total
    if (window.personalStats) {
      window.personalStats.totalSubmissions += 1;
      // If within current week, increment weekly too
      window.personalStats.weeklySubmissions += 1; // TODO: Add proper week logic
    }
    
    // Increment global Hi's
    if (window.gTotalHis !== undefined) {
      window.gTotalHis += 1;
    }
    
    // Update HiMetrics cache
    if (window.HiMetrics?.updateCache) {
      window.HiMetrics.updateCache({ hi5s: window.gTotalHis });
    }
    
    console.log('📤 Share tracked:', { 
      source, 
      personalTotal: window.personalStats?.totalSubmissions,
      globalHis: window.gTotalHis 
    });
    
    // Refresh stats display  
    if (window.updateGlobalStats) {
      window.updateGlobalStats();
    }
    
  } catch (error) {
    console.error('❌ [DashboardStats] Share tracking failed:', error);
  }
}

// Global export for share sheet integration
window.trackShareSubmission = trackShareSubmission;