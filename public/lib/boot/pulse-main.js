/**
 * pulse-main.js
 * Hi Pulse Page Boot Script (v1.1.0)
 * 
 * Loads global stats, personal stats, and initializes the ticker.
 * Uses existing stats infrastructure (UnifiedStatsLoader, StreakAuthority)
 */

(async function initPulse() {
  'use strict';

  console.log('[Hi Pulse] Initializing...');

  // =========================================
  // 1. Helper Functions
  // =========================================
  
  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  function setStatValue(elementId, value, isLoading = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (isLoading) {
      el.classList.add('loading');
      el.textContent = '';
    } else {
      el.classList.remove('loading');
      el.textContent = value;
    }
  }

  // =========================================
  // 2. Load Global Stats (using existing system)
  // =========================================
  
  async function loadGlobalStats() {
    try {
      const supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!supabase) {
        console.warn('[Hi Pulse] Supabase not available');
        return;
      }

      // Use same approach as dashboard - read from global_stats table directly
      const { data, error } = await supabase.from('global_stats').select('total_his, hi_waves, total_users').single();
      
      if (error) {
        console.error('[Hi Pulse] Error fetching global stats:', error);
        // Fallback to cached values if available
        const cached = localStorage.getItem('hi_global_stats_cache');
        if (cached) {
          try {
            const stats = JSON.parse(cached);
            setStatValue('globalTotalHis', formatNumber(stats.total_his || stats.gTotalHis || 0));
            setStatValue('globalHiWaves', formatNumber(stats.hi_waves || stats.gTotalHiWaves || 0));
            setStatValue('globalUsers', formatNumber(stats.total_users || stats.gTotalUsers || 0));
          } catch (e) {}
        }
        return;
      }

      if (data) {
        // Map the response fields to our display
        const totalHis = data.total_his || 0;
        const hiWaves = data.hi_waves || 0;
        const totalUsers = data.total_users || 0;  // 🔧 WOZ FIX: No hardcoded fallback - trust database
        
        setStatValue('globalTotalHis', formatNumber(totalHis));
        setStatValue('globalHiWaves', formatNumber(hiWaves));
        setStatValue('globalUsers', formatNumber(totalUsers));
        
        console.log('[Hi Pulse] Global stats loaded:', { totalHis, hiWaves, totalUsers });
      }
    } catch (err) {
      console.error('[Hi Pulse] Error loading global stats:', err);
    }
  }

  // =========================================
  // 3. Load Personal Stats (Auth Users)
  // =========================================
  
  async function loadPersonalStats(userId) {
    try {
      if (!userId) return;

      // Use StreakAuthority if available (same as dashboard)
      let streak = 0;
      if (window.HiBase?.streaks?.StreakAuthority) {
        const streakResult = await window.HiBase.streaks.StreakAuthority.get(userId);
        if (streakResult?.data) {
          streak = streakResult.data.current || 0;
        }
      } else if (window.ProfileManager?.getStreak) {
        streak = window.ProfileManager.getStreak() || 0;
      }

      // Get user stats from ProfileManager or profile cache
      let shares = 0;
      let points = 0;
      
      if (window.ProfileManager) {
        const profile = window.ProfileManager.getProfile?.() || {};
        shares = profile.total_shares || profile.hi_count || 0;
        points = profile.hi_points || 0;
      }

      // Update UI
      setStatValue('userShares', formatNumber(shares));
      setStatValue('userStreak', streak > 0 ? `${streak} 🔥` : '0');
      setStatValue('userPoints', formatNumber(points));

      console.log('[Hi Pulse] Personal stats loaded:', { shares, streak, points });
    } catch (err) {
      console.error('[Hi Pulse] Error loading personal stats:', err);
    }
  }

  // =========================================
  // 4. Initialize Ticker
  // =========================================
  
  async function initTicker() {
    try {
      // Wait for HiTicker to load
      const tickerContainer = document.getElementById('tickerContainer');
      if (!tickerContainer) return;

      // Check if HiTicker is available (it's a module)
      if (window.HiTicker) {
        window.HiTicker.init(tickerContainer);
      } else {
        // Fallback: create basic ticker
        tickerContainer.innerHTML = `
          <div style="padding: 12px 16px; text-align: center; color: rgba(255, 209, 102, 0.8); font-size: 0.9rem;">
            <span>✨ Welcome to Hi Pulse — where positivity flows ✨</span>
          </div>
        `;
      }
    } catch (err) {
      console.error('[Hi Pulse] Error initializing ticker:', err);
    }
  }

  // =========================================
  // 5. Auth State Handler
  // =========================================
  
  function handleAuthState(session) {
    const isAuthenticated = !!session?.user;
    document.body.setAttribute('data-authenticated', isAuthenticated.toString());

    if (isAuthenticated) {
      loadPersonalStats(session.user.id);
    } else {
      // Clear personal stats for anon users
      setStatValue('userShares', '—');
      setStatValue('userStreak', '—');
      setStatValue('userPoints', '—');
    }
  }

  // =========================================
  // 6. Main Init
  // =========================================
  
  // Show loading state
  setStatValue('globalTotalHis', '', true);
  setStatValue('globalHiWaves', '', true);
  setStatValue('globalUsers', '', true);
  setStatValue('userShares', '', true);
  setStatValue('userStreak', '', true);
  setStatValue('userPoints', '', true);

  // Load global stats immediately (no auth required)
  loadGlobalStats();

  // Initialize ticker
  initTicker();

  // Wait for auth ready
  window.addEventListener('hi:auth-ready', (e) => {
    const { session } = e.detail || {};
    handleAuthState(session);
  });

  // Fallback: Check auth after delay if event doesn't fire
  setTimeout(() => {
    const supabase = window.HiSupabase?.getClient?.();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          handleAuthState(data.session);
        }
      });
    }
  }, 2000);

  // Wire up Share Hi button to open share modal
  const shareBtn = document.getElementById('shareHiBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      // If HiShareSheet is available, open it instead of navigating
      if (window.HiShareSheet?.open) {
        e.preventDefault();
        window.HiShareSheet.open({ origin: 'pulse' });
      }
      // Otherwise, let it navigate to dashboard
    });
  }

  console.log('[Hi Pulse] ✅ Initialized');
})();
