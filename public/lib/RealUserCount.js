// TESLA GRADE: Real User Count Integration
// Replaces hardcoded user counts with live database queries

// Enhanced user count loading function
async function loadRealUserCount() {
  try {
    console.log('📊 Loading real user count...');
    
    // Get Supabase client
    const supabase = window.supabase || await import('/lib/HiSupabase.v3.js').then(m => m.default);
    if (!supabase) {
      console.warn('⚠️ No Supabase client for user count');
      return null;
    }
    
    // 🎯 WOZNIAK FIX: Use cached result from initHiStatsOnce() to prevent duplicate calls
    // Check if stats are already loaded by main system
    if (window._hiStatsLoadedRecently) {
      console.log('⚡ Using cached user count from main stats system');
      return;
    }
    
    // Call the real user count function (only if not already loaded)
    const { data, error } = await supabase
      .rpc('get_user_stats');
    
    if (error) {
      console.error('❌ User count query failed:', error);
      return null;
    }
    
    // Parse the response structure: data has globalStats and personalStats
    if (data && data.globalStats) {
      // 🎯 CRITICAL FIX: Always use database values, never preserve local values
      // This prevents local increments from skewing the real database data
      window.gWaves = data.globalStats.hiWaves || 0;
      window.gTotalHis = data.globalStats.totalHis || 0; 
      window.gUsers = data.globalStats.totalUsers || 0;
      
      console.log('✅ Global stats updated from get_user_stats:', {
        waves: window.gWaves,
        totalHis: window.gTotalHis,
        users: window.gUsers
      });
      
      // Mark stats as recently loaded to prevent duplicates
      window._hiStatsLoadedRecently = true;
      setTimeout(() => window._hiStatsLoadedRecently = false, 5000);
      
      // Trigger UI update for all stats
      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }
    }
    
    const realCount = data?.globalStats?.totalUsers || 1;
    console.log('✅ Real user count loaded:', realCount);
    
    // Cache the result
    localStorage.setItem('dashboard_users_cache', realCount.toString());
    localStorage.setItem('dashboard_users_cache_timestamp', Date.now().toString());
    
    // Update UI immediately
    const globalUsersEl = document.getElementById('globalUsers');
    if (globalUsersEl) {
      globalUsersEl.textContent = realCount.toLocaleString();
    }
    
    return realCount;
    
  } catch (error) {
    console.error('❌ Real user count error:', error);
    return null;
  }
}

// Enhanced stats loading with real user count
async function loadEnhancedGlobalStats() {
  console.log('🚀 Loading enhanced global stats with real user count...');
  
  try {
    // Load user count first (independent query)
    const userCountPromise = loadRealUserCount();
    
    // Load other stats (existing system)
    const supabase = window.supabase || await import('/lib/HiSupabase.v3.js').then(m => m.default);
    const statsPromise = supabase.from('global_stats').select('*').single();
    
    // Wait for both to complete
    const [userCount, statsResult] = await Promise.all([userCountPromise, statsPromise]);
    
    // Process stats result
    const { data: statsData, error: statsError } = statsResult;
    if (statsData && !statsError) {
      // 🎯 CRITICAL: Always use database values (never fall back to cached)
      // This prevents bouncing between old cached values and new DB values
      window.gTotalHis = statsData.total_his || 0;
      window.gWaves = statsData.hi_waves || 0;
      
      // Cache stats for offline use
      localStorage.setItem('dashboard_total_cache', window.gTotalHis.toString());
      localStorage.setItem('dashboard_waves_cache', window.gWaves.toString());
    }
    
    // Update all UI elements
    updateStatsUI();
    
    console.log('✅ Enhanced stats loaded:', {
      totalHis: window.gTotalHis,
      waves: window.gWaves, 
      users: window.gUsers
    });
    
  } catch (error) {
    console.error('❌ Enhanced stats loading failed:', error);
    // Fall back to cached/default values
    updateStatsUI();
  }
}

// Smart cache checking for user count
function getSmartUserCount() {
  const cached = localStorage.getItem('dashboard_users_cache');
  const cacheTime = localStorage.getItem('dashboard_users_cache_timestamp');
  const now = Date.now();
  
  // Cache valid for 5 minutes
  if (cached && cacheTime && (now - parseInt(cacheTime)) < 300000) {
    return parseInt(cached);
  }
  
  // Cache expired or doesn't exist
  return null;
}

// Initialize with smart defaults
function initializeSmartUserCount() {
  const smartCount = getSmartUserCount();
  if (smartCount) {
    window.gUsers = smartCount;
    console.log('⚡ Using cached user count:', smartCount);
  } else {
    // More realistic default while loading
    window.gUsers = 5; // Conservative estimate
    console.log('🎯 Using conservative user count estimate while loading real data');
    
    // Load real count in background
    setTimeout(loadRealUserCount, 1000);
  }
}

// Make functions available globally
window.loadRealUserCount = loadRealUserCount;
window.loadEnhancedGlobalStats = loadEnhancedGlobalStats;
window.initializeSmartUserCount = initializeSmartUserCount;