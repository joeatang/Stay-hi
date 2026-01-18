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

      const supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!supabase) return;

      // 🎯 ONE SOURCE OF TRUTH: Use get_user_stats RPC (same as global stats)
      const { data, error } = await supabase.rpc('get_user_stats', { p_user_id: userId });
      
      if (error) {
        console.error('[Hi Pulse] Error fetching user stats:', error);
        return;
      }

      if (data?.personalStats) {
        const { totalShares, currentStreak, hiPoints } = data.personalStats;
        
        // Update UI
        setStatValue('userShares', formatNumber(totalShares || 0));
        setStatValue('userStreak', currentStreak > 0 ? `${currentStreak} 🔥` : '0');
        setStatValue('userPoints', formatNumber(hiPoints || 0));

        console.log('[Hi Pulse] Personal stats loaded:', { totalShares, currentStreak, hiPoints });
        
        // Show Emotional Journey section for authenticated users
        const journeySection = document.getElementById('emotionalJourneySection');
        if (journeySection) {
          journeySection.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('[Hi Pulse] Error loading personal stats:', err);
    }
  }

  // =========================================
  // 3a. Load Emotional Journey (Analytics v2.0)
  // =========================================
  
  async function loadEmotionalJourney() {
    try {
      const supabase = window.HiSupabase?.getClient?.() || window.supabase;
      if (!supabase) return;

      const journeyLoading = document.getElementById('journeyLoading');
      const journeyData = document.getElementById('journeyData');
      const journeyEmpty = document.getElementById('journeyEmpty');

      // Show loading
      if (journeyLoading) journeyLoading.style.display = 'block';
      if (journeyData) journeyData.style.display = 'none';
      if (journeyEmpty) journeyEmpty.style.display = 'none';

      // Call RPC (deployed in migration 003)
      const { data, error } = await supabase.rpc('get_user_emotional_journey', { p_days: 7 });

      if (error) {
        console.error('[Hi Pulse] Error loading emotional journey:', error);
        if (journeyLoading) journeyLoading.style.display = 'none';
        if (journeyEmpty) journeyEmpty.style.display = 'block';
        return;
      }

      // Hide loading
      if (journeyLoading) journeyLoading.style.display = 'none';

      // Check if user has data
      if (!data || data.length === 0) {
        if (journeyEmpty) journeyEmpty.style.display = 'block';
        return;
      }

      // Show data section
      if (journeyData) journeyData.style.display = 'block';

      // Render chart
      renderEmotionalChart(data);

      // Render insights
      renderJourneyInsights(data);

      console.log('[Hi Pulse] Emotional journey loaded:', data.length, 'days');
    } catch (err) {
      console.error('[Hi Pulse] Error in loadEmotionalJourney:', err);
    }
  }

  function renderEmotionalChart(data) {
    const canvas = document.getElementById('emotionalChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Extract values
    const ratings = sortedData.map(d => d.avg_rating || 3);
    const labels = sortedData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Draw axes
    ctx.strokeStyle = 'rgba(232, 235, 255, 0.2)';
    ctx.lineWidth = 1;

    // Y-axis (1-5 scale)
    for (let i = 1; i <= 5; i++) {
      const y = height - (i / 5) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw line chart
    const stepX = width / (ratings.length - 1 || 1);
    
    ctx.strokeStyle = '#4ECDC4';
    ctx.lineWidth = 3;
    ctx.beginPath();

    ratings.forEach((rating, i) => {
      const x = i * stepX;
      const y = height - ((rating / 5) * height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    ratings.forEach((rating, i) => {
      const x = i * stepX;
      const y = height - ((rating / 5) * height);
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4ECDC4';
      ctx.fill();
      ctx.strokeStyle = '#0f1024';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw labels
    ctx.fillStyle = 'rgba(232, 235, 255, 0.6)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = i * stepX;
      ctx.fillText(label, x, height - 5);
    });
  }

  function renderJourneyInsights(data) {
    const insightsContainer = document.getElementById('journeyInsights');
    if (!insightsContainer) return;

    // Calculate insights
    const ratings = data.map(d => d.avg_rating).filter(r => r !== null);
    if (ratings.length === 0) return;

    const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    const maxRating = Math.max(...ratings);
    const bestDay = data.find(d => d.avg_rating === maxRating);
    const trend = ratings.length > 1 ? (ratings[ratings.length - 1] - ratings[0]).toFixed(1) : 0;

    // Render insights
    const insights = [];
    
    insights.push(`<div class="insight-item">📊 7-day average: ${avgRating}/5</div>`);
    
    if (bestDay) {
      const dayName = new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' });
      insights.push(`<div class="insight-item">⭐ Best day: ${dayName} (${maxRating}/5)</div>`);
    }
    
    if (trend > 0) {
      insights.push(`<div class="insight-item">📈 Trending up: +${trend} vs week start</div>`);
    } else if (trend < 0) {
      insights.push(`<div class="insight-item">📉 Dip detected: ${trend} vs week start</div>`);
    } else {
      insights.push(`<div class="insight-item">➡️ Stable mood over 7 days</div>`);
    }

    insightsContainer.innerHTML = insights.join('');
  }

  // Expose for toggle function
  window.loadEmotionalJourney = loadEmotionalJourney;

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
