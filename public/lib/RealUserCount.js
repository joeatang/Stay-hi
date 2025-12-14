// TESLA GRADE: Real User Count Integration
// Replaces hardcoded user counts with live database queries

// Enhanced user count loading function
async function loadRealUserCount() {
  try {
    console.log('📊 Loading real user count...');
    
    // Get Supabase client (robust getter)
    const supabase = (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
      || window.hiSupabase
      || window.__HI_SUPABASE_CLIENT
      || null;
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
      // 🎯 SURGICAL FIX: Only update if we don't already have authoritative values
      // UnifiedStatsLoader is source of truth - this is fallback only
      const shouldUpdate = (
        window.gTotalHis === undefined || 
        window.gTotalHis === null ||
        window._gTotalHisIsTemporary === true
      );
      
      if (shouldUpdate) {
        window.gWaves = data.globalStats.hiWaves || 0;
        window.gTotalHis = data.globalStats.totalHis || 0; 
        window.gUsers = data.globalStats.totalUsers || 0;
        
        console.log('✅ Global stats updated from get_user_stats (fallback):', {
          waves: window.gWaves,
          totalHis: window.gTotalHis,
          users: window.gUsers
        });

        if (typeof window.markStatsAuthoritative === 'function') {
          window.markStatsAuthoritative('RealUserCount:get_user_stats');
        }
      } else {
        console.log('ℹ️ Skipping RealUserCount update - authoritative values already set');
        return;
      }
      
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
    const supabase = (window.HiSupabase && window.HiSupabase.getClient && window.HiSupabase.getClient())
      || window.hiSupabase
      || window.__HI_SUPABASE_CLIENT
      || null;
    const statsPromise = supabase.from('global_stats').select('*').single();
    
    // Wait for both to complete
    const [userCount, statsResult] = await Promise.all([userCountPromise, statsPromise]);
    
    // Process stats result
    const { data: statsData, error: statsError } = statsResult;
    if (statsData && !statsError) {
      // 🔬 SURGICAL FIX: Database is ALWAYS source of truth - direct assignment
      // NEVER write to localStorage during page navigation refreshes
      // Only update in-memory values, let explicit user actions update cache
      window.gTotalHis = statsData.total_his || 0;
      window.gWaves = statsData.hi_waves || 0;
      window.gUsers = userCount || window.gUsers || 5;
      
      if (typeof window.markStatsAuthoritative === 'function') {
        window.markStatsAuthoritative('RealUserCount:global_stats');
      }
      
      // ❌ REMOVED: localStorage writes that were causing stat drift on navigation
      // localStorage.setItem('globalTotalHis', window.gTotalHis.toString());
      // localStorage.setItem('globalHiWaves', window.gWaves.toString());
      
      console.log('✅ Enhanced stats loaded (memory-only, no cache write):', {
        totalHis: window.gTotalHis,
        waves: window.gWaves, 
        users: window.gUsers
      });
    }
    
    // Update all UI elements (use global updater when available)
    if (typeof window.updateGlobalStats === 'function') {
      window.updateGlobalStats(true);
    }
    
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