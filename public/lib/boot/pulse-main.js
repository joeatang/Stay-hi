/**
 * pulse-main.js
 * Hi Pulse Page Boot Script (v1.1.0)
 * 
 * Loads global stats, personal stats, and initializes the ticker.
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
  // 2. Load Global Stats
  // =========================================
  
  async function loadGlobalStats() {
    try {
      const supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!supabase) {
        console.warn('[Hi Pulse] Supabase not available');
        return;
      }

      const { data, error } = await supabase.rpc('get_global_stats');
      
      if (error) {
        console.error('[Hi Pulse] Error fetching global stats:', error);
        setStatValue('globalTotalHis', '—');
        setStatValue('globalHiWaves', '—');
        setStatValue('globalUsers', '—');
        return;
      }

      if (data && data[0]) {
        const stats = data[0];
        setStatValue('globalTotalHis', formatNumber(stats.total_his || 0));
        setStatValue('globalHiWaves', formatNumber(stats.hi_waves || 0));
        setStatValue('globalUsers', formatNumber(stats.total_users || 0));
      }
      
      console.log('[Hi Pulse] Global stats loaded:', data);
    } catch (err) {
      console.error('[Hi Pulse] Error loading global stats:', err);
    }
  }

  // =========================================
  // 3. Load Personal Stats (Auth Users)
  // =========================================
  
  async function loadPersonalStats(userId) {
    try {
      const supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!supabase || !userId) return;

      // Load user stats
      const [statsResult, streakResult, pointsResult] = await Promise.all([
        supabase.rpc('get_user_share_count', { p_user_id: userId }),
        supabase.from('user_streaks').select('current_streak').eq('user_id', userId).maybeSingle(),
        supabase.from('hi_points').select('balance').eq('user_id', userId).maybeSingle()
      ]);

      // User shares
      if (statsResult.data !== null && !statsResult.error) {
        setStatValue('userShares', formatNumber(statsResult.data));
      } else {
        setStatValue('userShares', '0');
      }

      // Current streak
      if (streakResult.data && !streakResult.error) {
        const streak = streakResult.data.current_streak || 0;
        setStatValue('userStreak', streak > 0 ? `${streak} 🔥` : '0');
      } else {
        setStatValue('userStreak', '0');
      }

      // Hi Points
      if (pointsResult.data && !pointsResult.error) {
        setStatValue('userPoints', formatNumber(pointsResult.data.balance || 0));
      } else {
        setStatValue('userPoints', '0');
      }

      console.log('[Hi Pulse] Personal stats loaded');
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
