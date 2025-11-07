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
    // Initialize all dashboard stats - DATABASE FIRST ONLY
  try {
    // Only call personal stats - it now handles both personal AND global stats from database
    await initializePersonalStats();
    
    console.log('📊 Dashboard stats initialized successfully (database-first)');
    return { success: true };
  } catch (error) {
    console.error('❌ Dashboard stats initialization failed:', error);
    return { success: false, error };
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
 * Initialize personal user stats tracking (DATABASE-FIRST)
 */
async function initializePersonalStats() {
  console.log('👤 [DashboardStats] Initializing personal stats (database-first)...');
  
  try {
    const personalStats = {
      totalSubmissions: 0,
      weeklySubmissions: 0, 
      currentStreak: 0,
      personalTaps: 0
    };
    
    // Get user info
    const user = window.hiAuth?.getCurrentUser();
    if (!user || user.id === 'anonymous') {
      console.log('👤 Anonymous user - using default stats');
      window.personalStats = personalStats;
      return;
    }
    
    // 🎯 DATABASE-FIRST: Get stats from Supabase user_stats table
    if (window.supabase) {
      const { data, error } = await window.supabase.rpc('get_user_stats', {
        p_user_id: user.id
      });
      
      if (!error && data) {
        // Update personal stats
        if (data.personalStats) {
          const dbStats = data.personalStats;
          personalStats.totalSubmissions = dbStats.totalShares || 0;
          personalStats.weeklySubmissions = dbStats.weeklyShares || 0;
          personalStats.currentStreak = dbStats.currentStreak || 0;
          personalStats.personalTaps = dbStats.totalWaves || 0;
          
          console.log('👤 Personal Stats (from database):', personalStats);
        }
        
        // 🔥 FIX: Update global stats from database (this was missing!)
        if (data.globalStats) {
          const globalStats = data.globalStats;
          window.gWaves = globalStats.hiWaves || 0;
          window.gTotalHis = globalStats.totalHis || 0;
          window.gUsers = globalStats.totalUsers || 0;
          
          console.log('🌍 Global Stats (from database):', { 
            waves: window.gWaves, 
            his: window.gTotalHis, 
            users: window.gUsers 
          });
        }
      } else {
        console.warn('⚠️ Database stats failed, using defaults:', error);
      }
    }
    
    // Fallback to HiBase if database unavailable
    if (personalStats.totalSubmissions === 0 && window.HiBase?.stats?.getPersonalStats) {
      const result = await window.HiBase.stats.getPersonalStats();
      if (!result.error && result.data) {
        personalStats.totalSubmissions = result.data.totalSubmissions || 0;
        personalStats.weeklySubmissions = result.data.weeklySubmissions || 0;
      }
    }
    
    // Store in window for S-DASH access
    window.personalStats = personalStats;
    
    console.log('👤 Final Personal Stats:', personalStats);
    
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
 * Handle medallion tap with DATABASE-FIRST tracking + milestone detection
 */
async function handleMedallionTap() {
  console.log('🏅 [DashboardStats] Medallion tapped - processing (database-first)...');
  
  try {
    // Get user info
    const user = window.hiAuth?.getCurrentUser();
    if (!user || user.id === 'anonymous') {
      console.log('🏅 Anonymous user - processing guest tap...');
      
      // For anonymous users, use global increment only
      if (window.supabase) {
        const { data } = await window.supabase.rpc('increment_hi_wave');
        if (data) {
          window.gWaves = data;
          console.log('🏅 Anonymous wave tracked:', { globalWaves: window.gWaves });
        }
      }
      
      // Refresh stats display
      setTimeout(() => {
        if (window.updateGlobalStats) {
          window.updateGlobalStats();
        }
      }, 100);
      return;
    }
    
    // 🎯 DATABASE-FIRST: Process medallion tap with user stats + milestone check
    if (window.supabase) {
      const { data, error } = await window.supabase.rpc('process_medallion_tap', {
        p_user_id: user.id
      });
      
      if (!error && data) {
        console.log('🏅 Database medallion tap result:', data);
        
        // Update local state from database response
        if (data.waveUpdate?.success) {
          const newPersonalTaps = data.waveUpdate.userWaves;
          const newGlobalWaves = data.waveUpdate.globalWaves;
          
          // Update personal stats
          if (window.personalStats) {
            window.personalStats.personalTaps = newPersonalTaps;
          }
          
          // Update global waves
          if (window.gWaves !== undefined) {
            window.gWaves = newGlobalWaves;
          }
          
          console.log('🏅 Wave tracked (database):', { 
            personalTaps: newPersonalTaps, 
            globalWaves: newGlobalWaves 
          });
          
          // Show milestone celebration if achieved
          if (data.milestone?.success) {
            const milestone = data.milestone.milestone;
            showMilestoneToast(milestone.name, milestone.description);
          }
        }
      } else {
        console.error('❌ Database medallion tap failed:', error);
        // Fallback to localStorage for offline resilience
        const currentTaps = parseInt(localStorage.getItem('user_medallion_taps') || '0', 10);
        const newTaps = currentTaps + 1;
        localStorage.setItem('user_medallion_taps', newTaps.toString());
        
        if (window.personalStats) {
          window.personalStats.personalTaps = newTaps;
        }
      }
    }
    
    // Update HiMetrics cache if available
    if (window.HiMetrics?.updateCache) {
      window.HiMetrics.updateCache({ waves: window.gWaves });
    }
    
    // Refresh stats display
    setTimeout(() => {
      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ [DashboardStats] Medallion tap processing failed:', error);
  }
}

/**
 * Track share sheet submission with COMPREHENSIVE tracking + milestone detection
 * Handles ALL submission types: public, private, anonymous
 * Supports ALL pages: hi-dashboard, hi-island, hi-muscle
 */
export async function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`📤 [DashboardStats] Share submitted from ${source} (comprehensive tracking):`, metadata);
  
  try {
    // Extract submission details
    const submissionType = metadata.submissionType || metadata.type || 'public';
    const pageOrigin = metadata.pageOrigin || metadata.origin || detectPageOrigin();
    
    // Get user info
    const user = window.hiAuth?.getCurrentUser();
    if (!user || user.id === 'anonymous') {
      console.log('📤 Anonymous user - processing guest share...');
      
      // For anonymous users, use global increment only
      if (window.supabase) {
        try {
          const { data } = await window.supabase.rpc('increment_total_hi');
          if (data) {
            window.gTotalHis = data;
            console.log('📤 Anonymous share tracked:', { globalHis: window.gTotalHis });
          }
        } catch (error) {
          console.warn('⚠️ Anonymous share increment failed:', error);
        }
      }
      
      // Refresh stats display
      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }
      return;
    }
    
    // 🎯 COMPREHENSIVE DATABASE TRACKING: Use page-specific functions
    if (window.supabase) {
      let rpcFunction;
      let rpcParams;
      
      // Route to appropriate page-specific function
      switch (pageOrigin) {
        case 'hi-island':
          rpcFunction = 'process_hi_island_share';
          rpcParams = { p_user_id: user.id, p_submission_type: submissionType };
          break;
        case 'hi-muscle':
          rpcFunction = 'process_hi_muscle_share';
          rpcParams = { p_user_id: user.id, p_submission_type: submissionType };
          break;
        case 'hi-dashboard':
        default:
          rpcFunction = 'process_hi_dashboard_share';
          rpcParams = { p_user_id: user.id, p_submission_type: submissionType };
          break;
      }
      
      const { data, error } = await window.supabase.rpc(rpcFunction, rpcParams);
      
      if (!error && data) {
        console.log('📤 Comprehensive share submission result:', data);
        
        // Update local state from database response
        if (data.shareUpdate?.success) {
          const newPersonalShares = data.shareUpdate.userShares;
          const newWeeklyShares = data.shareUpdate.userWeeklyShares;
          const newGlobalHis = data.shareUpdate.globalHis;
          
          // Update personal stats
          if (window.personalStats) {
            window.personalStats.totalSubmissions = newPersonalShares;
            window.personalStats.weeklySubmissions = newWeeklyShares;
          }
          
          // Update global Hi's
          if (window.gTotalHis !== undefined && newGlobalHis > 0) {
            window.gTotalHis = newGlobalHis;
          }
          
          console.log('📤 Share tracked (comprehensive):', { 
            source, 
            submissionType,
            pageOrigin,
            personalTotal: newPersonalShares,
            weeklyTotal: newWeeklyShares,
            globalHis: newGlobalHis 
          });
          
          // Show milestone celebration if achieved
          if (data.milestone?.success) {
            const milestone = data.milestone.milestone;
            showMilestoneToast(milestone.name, milestone.description);
          }
        }
      } else {
        console.error('❌ Comprehensive share submission failed:', error);
        // Fallback to localStorage for offline resilience
        if (window.personalStats) {
          window.personalStats.totalSubmissions += 1;
          window.personalStats.weeklySubmissions += 1;
        }
        
        if (window.gTotalHis !== undefined) {
          window.gTotalHis += 1;
        }
      }
    }
    
    // Update HiMetrics cache
    if (window.HiMetrics?.updateCache) {
      window.HiMetrics.updateCache({ hi5s: window.gTotalHis });
    }
    
    // Refresh stats display  
    if (window.updateGlobalStats) {
      window.updateGlobalStats();
    }
    
  } catch (error) {
    console.error('❌ [DashboardStats] Comprehensive share tracking failed:', error);
  }
}

/**
 * Detect current page origin for share tracking
 */
function detectPageOrigin() {
  const pathname = window.location.pathname;
  const filename = pathname.split('/').pop() || '';
  
  if (filename.includes('island') || pathname.includes('island')) {
    return 'hi-island';
  } else if (filename.includes('muscle') || pathname.includes('muscle') || filename.includes('gym')) {
    return 'hi-muscle';
  } else {
    return 'hi-dashboard';
  }
}

// Global export for share sheet integration
window.trackShareSubmission = trackShareSubmission;

/**
 * 🎯 MILESTONE DETECTION FUNCTIONS
 * Connects to Supabase RPC functions for achievement tracking
 */

/**
 * 🎯 MILESTONE DETECTION FUNCTIONS
 * Note: Milestone detection is now handled by database RPC functions:
 * - process_medallion_tap() includes check_wave_milestone()
 * - process_share_submission() includes check_share_milestone()
 * 
 * This ensures atomic database transactions and prevents race conditions.
 */

/**
 * Show milestone achievement celebration
 */
function showMilestoneToast(milestoneName, description) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'milestone-toast';
  toast.innerHTML = `
    <div class="milestone-toast-content">
      <div class="milestone-icon">🏆</div>
      <div class="milestone-text">
        <div class="milestone-title">${milestoneName}</div>
        <div class="milestone-desc">${description}</div>
      </div>
    </div>
  `;
  
  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 300px;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  // Content styles
  const style = document.createElement('style');
  style.textContent = `
    .milestone-toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .milestone-icon {
      font-size: 32px;
    }
    .milestone-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .milestone-desc {
      font-size: 14px;
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
  
  // Add to page
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
  
  console.log('🎉 [Milestone] Toast displayed for:', milestoneName);
}