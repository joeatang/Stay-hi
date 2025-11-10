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

console.log('🎯 [DashboardStats] Module loading on page:', window.location.pathname);
console.log('🎯 [DashboardStats] Setting up cross-platform tracking...');

/**
 * Load and initialize all dashboard stats
 * Called via initHiStatsOnce('dashboard') 
 */
export async function loadDashboardStats() {
  console.log('🎯 [DashboardStats] Loading Tesla-grade stats system...');
  
  try {
    // 🎯 GOLD STANDARD: Dependency validation with fallbacks
    const supabase = await waitForSupabase();
    
    if (supabase) {
      console.log('✅ Supabase client ready, loading database stats...');
      await initializePersonalStats();
    } else {
      console.warn('⚠️ Supabase unavailable, using fallback stats...');
      await initializeFallbackStats();
    }
    
    // 🎯 GOLD STANDARD: Always ensure globals are set
    ensureGlobalStatsExist();
    
    // 🎯 GOLD STANDARD: Force UI update regardless of data source
    updateAllStatsDisplays();
    
    console.log('📊 Dashboard stats initialized successfully (database-first)');
    return { success: true };
  } catch (error) {
    console.error('❌ Dashboard stats initialization failed:', error);
    
    // 🎯 GOLD STANDARD: Emergency fallback - never leave UI broken
    await initializeFallbackStats();
    ensureGlobalStatsExist();
    updateAllStatsDisplays();
    
    return { success: false, error };
  }
}

// 🎯 GOLD STANDARD: Wait for Supabase with timeout and enhanced detection
async function waitForSupabase(timeoutMs = 3000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    // Enhanced Supabase detection - check multiple possible locations
    let supabase = null;
    
    try {
      supabase = window.getSupabase?.() || 
                 window.supabaseClient || 
                 window.sb || 
                 window.hiSupabase ||
                 window.HiSupabase?.client ||
                 window.__HI_SUPABASE_CLIENT ||  // 🎯 FOUND IN CONSOLE!
                 window.supabase ||              // 🎯 FOUND IN CONSOLE!
                 (window.supabase?.createClient ? window.supabase : null);
      
      if (supabase && typeof supabase.rpc === 'function') {
        console.log('✅ Supabase client found after', Date.now() - startTime, 'ms');
        return supabase;
      }
    } catch (error) {
      console.warn('⚠️ Error checking Supabase client:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Debug output to see what's actually available
  console.warn('⚠️ Supabase client not available after', timeoutMs, 'ms');
  console.log('Available window objects:', Object.keys(window).filter(k => 
    k.toLowerCase().includes('supabase') || k.toLowerCase().includes('supa')
  ));
  
  return null;
}

// 🎯 GOLD STANDARD: Fallback stats when database is unavailable
async function initializeFallbackStats() {
  console.log('🔄 Loading fallback stats from localStorage...');
  
  // Load from localStorage or use defaults
  window.gTotalHis = parseInt(localStorage.getItem('fallback_total_his') || '0', 10);
  window.gWaves = parseInt(localStorage.getItem('fallback_waves') || '0', 10);
  window.gUsers = parseInt(localStorage.getItem('fallback_users') || '1000', 10);
  
  console.log('🔄 Fallback stats loaded:', { 
    totalHis: window.gTotalHis, 
    waves: window.gWaves, 
    users: window.gUsers 
  });
}

// 🎯 GOLD STANDARD: Ensure globals always exist
function ensureGlobalStatsExist() {
  if (window.gTotalHis === undefined) window.gTotalHis = 0;
  if (window.gWaves === undefined) window.gWaves = 0;
  if (window.gUsers === undefined) window.gUsers = 1000;
  
  console.log('✅ Global stats ensured:', { 
    totalHis: window.gTotalHis, 
    waves: window.gWaves, 
    users: window.gUsers 
  });
}

// 🎯 GOLD STANDARD: Force UI update with all possible element IDs
function updateAllStatsDisplays() {
  console.log('🎯 Updating all stats displays...');
  
  // Total His - try all possible IDs
  const totalHisElements = [
    document.getElementById('globalTotalHis'),
    document.getElementById('totalHis'),
    document.getElementById('headerTotalHis')
  ].filter(Boolean);
  
  totalHisElements.forEach(el => {
    el.textContent = window.gTotalHis.toLocaleString();
    console.log('✅ Updated Total His display:', el.id, '→', window.gTotalHis);
  });
  
  // Waves - try all possible IDs
  const wavesElements = [
    document.getElementById('globalHiWaves'),
    document.getElementById('globalWaves'),
    document.getElementById('headerWaves')
  ].filter(Boolean);
  
  wavesElements.forEach(el => {
    el.textContent = window.gWaves.toLocaleString();
    console.log('✅ Updated Waves display:', el.id, '→', window.gWaves);
  });
  
  // Users - try all possible IDs  
  const usersElements = [
    document.getElementById('globalUsers'),
    document.getElementById('globalHiUsers'),
    document.getElementById('headerUsers')
  ].filter(Boolean);
  
  usersElements.forEach(el => {
    el.textContent = window.gUsers.toLocaleString();
    console.log('✅ Updated Users display:', el.id, '→', window.gUsers);
  });
  
  // Call dashboard-specific update function if available
  if (window.updateGlobalStats) {
    window.updateGlobalStats();
    console.log('✅ Called window.updateGlobalStats()');
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
    
    // Get user info - support both auth systems
    let user = null;
    try {
      // Try ProgressiveAuth first
      if (window.ProgressiveAuth) {
        const authState = window.ProgressiveAuth.getAuthState();
        if (authState.isAuthenticated && authState.session?.user) {
          user = authState.session.user;
        }
      }
      // Fallback to direct hiAuth if available
      if (!user && window.hiAuth?.getCurrentUser) {
        user = window.hiAuth.getCurrentUser();
      }
    } catch (error) {
      console.warn('⚠️ Auth user detection failed in initializePersonalStats:', error);
    }
    
    const isAnonymous = !user || user.id === 'anonymous';
    
    // 🎯 DATABASE-FIRST: Get stats from Supabase (works for both authenticated and anonymous)
    const supabase = window.getSupabase?.() || 
                     window.supabaseClient || 
                     window.sb || 
                     window.hiSupabase ||
                     window.HiSupabase?.client ||
                     window.__HI_SUPABASE_CLIENT ||  // 🎯 CONSOLE CONFIRMED!
                     window.supabase;                // 🎯 CONSOLE CONFIRMED!
    if (supabase) {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: isAnonymous ? null : user.id
      });
      
      if (!error && data) {
        // Update personal stats (only for authenticated users)
        if (!isAnonymous && data.personalStats) {
          const dbStats = data.personalStats;
          personalStats.totalSubmissions = dbStats.totalShares || 0;
          personalStats.weeklySubmissions = dbStats.weeklyShares || 0;
          personalStats.currentStreak = dbStats.currentStreak || 0;
          personalStats.personalTaps = dbStats.totalWaves || 0;
          
          console.log('👤 Personal Stats (from database):', personalStats);
        } else if (isAnonymous) {
          // 🎯 FIX: Load anonymous personal stats from localStorage
          const anonymousTaps = parseInt(localStorage.getItem('anonymous_personal_taps') || '0', 10);
          personalStats.personalTaps = anonymousTaps;
          console.log('👤 Anonymous user - loaded from localStorage:', { personalTaps: anonymousTaps });
        }
        
        // 🌍 GLOBAL STATS: Always load from database (for all users)
        if (data.globalStats) {
          const globalStats = data.globalStats;
          console.log('🔍 RAW Global Stats from database:', globalStats);
          
          window.gWaves = globalStats.hiWaves || 0;
          window.gTotalHis = globalStats.totalHis || 0;
          window.gUsers = globalStats.totalUsers || 0;
          
          console.log('🌍 Global Stats (from database):', { 
            waves: window.gWaves, 
            his: window.gTotalHis, 
            users: window.gUsers 
          });
          
          // 🎯 UPDATE UI ELEMENTS: Make sure the stats display immediately
          const globalHiWavesEl = document.getElementById('globalHiWaves');
          if (globalHiWavesEl) {
            globalHiWavesEl.textContent = window.gWaves.toLocaleString();
            console.log('✅ UI updated with database Hi Waves:', window.gWaves);
          }
          
          const totalHisEl = document.getElementById('globalTotalHis') || document.getElementById('totalHis');
          if (totalHisEl) {
            totalHisEl.textContent = window.gTotalHis.toLocaleString();
            console.log('✅ UI updated with database Total His:', window.gTotalHis);
          }
          
          // Also call unified stats update if available
          if (window.updateGlobalStats) {
            window.updateGlobalStats();
          }
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
    // Get user info - support both auth systems
    let user = null;
    try {
      // Try ProgressiveAuth first
      if (window.ProgressiveAuth) {
        const authState = window.ProgressiveAuth.getAuthState();
        if (authState.isAuthenticated && authState.session?.user) {
          user = authState.session.user;
        }
      }
      // Fallback to direct hiAuth if available
      if (!user && window.hiAuth?.getCurrentUser) {
        user = window.hiAuth.getCurrentUser();
      }
    } catch (error) {
      console.warn('⚠️ Auth user detection failed in handleMedallionTap:', error);
    }
    
    if (!user || user.id === 'anonymous') {
      console.log('🏅 Anonymous user - processing guest tap...');
      
      // 🎯 FIX: Use same persistence mechanism for anonymous users
      // Call process_medallion_tap with null user_id to persist properly
      const supabase = window.getSupabase?.() || window.supabaseClient || window.sb;
      if (supabase) {
        const { data, error } = await supabase.rpc('process_medallion_tap', {
          p_user_id: null
        });
        
        if (!error && data) {
          console.log('🏅 Anonymous wave result (database):', data);
          
          // Update global waves from database response
          if (data.waveUpdate?.success) {
            const newGlobalWaves = data.waveUpdate.globalWaves;
            if (window.gWaves !== undefined) {
              window.gWaves = newGlobalWaves;
            }
            
            // 🎯 FIX: Handle anonymous personal stats with localStorage persistence
            if (data.waveUpdate.userWaves === -1) {
              // Database signals to use localStorage for anonymous personal tracking
              const currentTaps = parseInt(localStorage.getItem('anonymous_personal_taps') || '0', 10);
              const newTaps = currentTaps + 1;
              localStorage.setItem('anonymous_personal_taps', newTaps.toString());
              
              // Update personal stats
              if (!window.personalStats) window.personalStats = {};
              window.personalStats.personalTaps = newTaps;
              
              console.log('🏅 Anonymous wave tracked (localStorage):', { 
                personalTaps: newTaps,
                globalWaves: window.gWaves 
              });
            } else {
              console.log('🏅 Anonymous wave tracked (database):', { globalWaves: window.gWaves });
            }
          }
        } else {
          console.error('❌ Anonymous wave failed:', error);
          // Fallback: increment locally only
          if (window.gWaves !== undefined) {
            window.gWaves += 1;
          }
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
    const supabase = window.getSupabase?.() || window.supabaseClient || window.sb;
    if (supabase) {
      const { data, error } = await supabase.rpc('process_medallion_tap', {
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
 * 🏆 GOLD STANDARD: Share Submission Tracker
 * MISSION: Simple, reliable Total His tracking for ALL share sheet submissions
 * Supports: Hi-Dashboard, Hi-Island, Hi-Muscle share sheets
 */
export async function trackShareSubmission(source = 'dashboard', metadata = {}) {
  console.log(`🎯 [GOLD STANDARD] Share submitted from ${source}:`, metadata);
  console.log('🔍 Current Total His before tracking:', window.gTotalHis || 0);
  
  try {
    // Extract submission details
    const submissionType = metadata.submissionType || metadata.type || 'public';
    const rawOrigin = metadata.pageOrigin || metadata.origin || source || detectPageOrigin();
    const pageOrigin = normalizeOrigin(rawOrigin);
    
    console.log('🎯 Origin mapping:', { source, rawOrigin, normalizedOrigin: pageOrigin });
    
    // Get user info - support both auth systems
    let user = null;
    try {
      // Try ProgressiveAuth first
      if (window.ProgressiveAuth) {
        const authState = window.ProgressiveAuth.getAuthState();
        if (authState.isAuthenticated && authState.session?.user) {
          user = authState.session.user;
        }
      }
      // Fallback to direct hiAuth if available
      if (!user && window.hiAuth?.getCurrentUser) {
        user = window.hiAuth.getCurrentUser();
      }
    } catch (error) {
      console.warn('⚠️ Auth user detection failed:', error);
    }
    
    if (!user || user.id === 'anonymous') {
      console.log('📤 Anonymous user - processing guest share...');
      
      // For anonymous users, use global increment only
      const supabase = window.getSupabase?.() || window.supabaseClient || window.sb || 
                      window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
      if (supabase) {
        try {
          console.log('🔄 Anonymous user - calling increment_total_hi()...');
          const { data, error } = await supabase.rpc('increment_total_hi');
          console.log('🔄 Anonymous increment result:', { data, error });
          if (data && !error) {
            window.gTotalHis = data;
            console.log('📤 Anonymous share tracked:', { globalHis: window.gTotalHis });
          } else {
            console.warn('⚠️ Anonymous increment failed:', error);
          }
        } catch (error) {
          console.warn('⚠️ Anonymous share increment failed:', error);
        }
      } else {
        console.warn('⚠️ No Supabase client available for anonymous tracking');
      }
      
      // Refresh stats display
      if (window.updateGlobalStats) {
        window.updateGlobalStats();
      }
      
      // 🎉 SUCCESS TOAST: Show confirmation for anonymous shares
      showShareSuccessToast('anonymous');
      return;
    }
    
    // � GOLD STANDARD: Direct increment_total_hi() call for ALL share submissions
    // MISSION: Simple, reliable Total His tracking across all pages
    const supabase = window.getSupabase?.() || window.supabaseClient || window.sb || 
                    window.HiSupabase?.getClient?.() || window.__HI_SUPABASE_CLIENT;
    if (supabase) {
      console.log('🎯 GOLD STANDARD: Calling increment_total_hi() for share submission');
      console.log(`📤 Share origin: ${pageOrigin}, Type: ${submissionType}`);
      
      try {
        const { data, error } = await supabase.rpc('increment_total_hi');
        
        if (error) {
          console.error('❌ increment_total_hi() error:', error);
          throw error;
        }
        
        if (data && typeof data === 'number') {
          // Success: Update Total His counter
          window.gTotalHis = data;
          console.log('✅ Total His updated from database:', window.gTotalHis);
          
          // Update UI immediately
          const totalHisEl = document.getElementById('globalTotalHis') || document.getElementById('totalHis');
          if (totalHisEl) {
            totalHisEl.textContent = window.gTotalHis.toLocaleString();
            console.log('✅ Total His UI updated:', window.gTotalHis);
          }
        } else {
          console.warn('⚠️ Unexpected increment_total_hi() response:', { data, error });
        }
      } catch (error) {
        console.error('❌ increment_total_hi() failed:', error);
        
        // Emergency fallback: increment local counter
        if (window.gTotalHis !== undefined) {
          window.gTotalHis += 1;
          console.log('🔄 Emergency fallback - local increment:', window.gTotalHis);
          
          const totalHisEl = document.getElementById('globalTotalHis') || document.getElementById('totalHis');
          if (totalHisEl) {
            totalHisEl.textContent = window.gTotalHis.toLocaleString();
          }
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
    
    // 🎯 GOLD STANDARD: Always refresh display regardless of database result
    updateAllStatsDisplays();
    
    // 🎉 SUCCESS TOAST: Show confirmation for all successful shares
    showShareSuccessToast(submissionType);
    
  } catch (error) {
    console.error('❌ [DashboardStats] Comprehensive share tracking failed:', error);
    
    // 🎯 GOLD STANDARD: Emergency fallback - increment locally and update UI
    if (window.gTotalHis !== undefined) {
      window.gTotalHis += 1;
      console.log('🔄 Fallback: Local Total His increment:', window.gTotalHis);
      updateAllStatsDisplays();
    }
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

/**
 * Normalize origin names for consistent tracking
 */
function normalizeOrigin(origin) {
  // Map Hi-Muscle variants to consistent name
  if (origin === 'higym' || origin === 'hi-gym' || origin === 'gym') {
    return 'hi-muscle';
  }
  // Map Hi-Island variants
  if (origin === 'island') {
    return 'hi-island';
  }
  // Map dashboard variants  
  if (origin === 'hi5' || origin === 'dashboard') {
    return 'hi-dashboard';
  }
  return origin;
}

// 🎉 SUCCESS TOAST: Visual confirmation for successful shares
function showShareSuccessToast(submissionType) {
  const typeDisplay = submissionType === 'public' ? 'Public Hi' : 
                     submissionType === 'private' ? 'Private Hi' : 'Anonymous Hi';
  
  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: white;
    background: linear-gradient(135deg, #10b981, #059669);
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 320px;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">✅</span>
      <span>${typeDisplay} submitted successfully!</span>
    </div>
  `;
  
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
  
  console.log('🎉 [Share Toast] Displayed:', typeDisplay);
}

// Global export for share sheet integration
window.trackShareSubmission = trackShareSubmission;
console.log('✅ [DashboardStats] Global trackShareSubmission exported to window on page:', window.location.pathname);

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