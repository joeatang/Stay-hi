// Extracted from inline <script> in hi-dashboard.html (CSP externalization phase 1)
// NOTE: Preserve original global behaviors. This file is a classic script (not module).
(function(){
  if (typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search)) {
    window.__HI_DEBUG__ = true;
  }
  const __dbg = (...a)=> { if (window.__HI_DEBUG__) console.log(...a); };
  let clickAnimationFrame = null;
  const hiffirmationsTrigger = document.getElementById('hiffirmationsTrigger');
  const headerHiWaves = document.getElementById('headerHiWaves');
  const headerTotalHis = document.getElementById('headerTotalHis');
  const headerUsers = document.getElementById('headerUsers');

  async function initializeDatabase() {
    try {
      // 🏆 WOZ FIX: Initialize ProfileManager first
      if (window.ProfileManager && !window.ProfileManager.isReady()) {
        __dbg('🏆 Initializing ProfileManager...');
        await window.ProfileManager.init();
        __dbg('✅ ProfileManager ready');
      }

      // Deduplicated: reuse existing client if already initialized elsewhere
      if (window.HiSupabase?.getClient) {
        window.supabase = window.HiSupabase.getClient();
        __dbg('🔄 Reusing existing HiSupabase client');
        return;
      }
      if (window.supabase?.rpc || window.db?.rpc) {
        __dbg('🔄 Existing Supabase client detected; skipping re-init');
        return;
      }
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        __dbg('🎯 Initializing Supabase client (no prior client found):', window.location.hostname);
        const { createClient } = supabase;
        const supabaseClient = createClient(
          'https://gfcubvroxgfvjhacinic.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g',
          {
            auth: {
              persistSession: true,  // 🎯 FIX: Persist sessions across browser restarts
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          }
        );
        window.db = supabaseClient;
        window.supabase = supabaseClient;
        __dbg('✅ Supabase client initialized (dashboard) with persistent sessions');
      } else {
        console.warn('⚠️ Supabase library unavailable for initialization');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error);
    }
    __dbg('📊 Dashboard init complete - stats handled by initHiStatsOnce()');
  }

  async function loadUserStreak() {
    try {
      // 🎯 NEW: Use StreakAuthority (single source of truth)
      const userId = window.ProfileManager?.getUserId?.() || window.hiAuth?.getCurrentUser?.()?.id || 'anonymous';
      
      if (!userId || userId === 'anonymous') {
        __dbg('🔒 Anonymous user - hiding streak UI');
        hideStreakUI();
        return;
      }

      __dbg('🔄 Loading streak for user:', userId);
      
      // 🎯 AUTHORITY: Always trust StreakAuthority (database → cache → stale)
      // 🛡️ SAFETY: Fallback if StreakAuthority not loaded yet
      const streak = window.StreakAuthority 
        ? await window.StreakAuthority.get(userId)
        : { current: 0, longest: 0, lastHiDate: null, source: 'fallback' };
      updateStreakDisplay(streak.current);
      
      // 🚀 CACHE: Save streak for next navigation
      if (window.NavCache) {
        window.NavCache.setStreak(streak);
      }
      
      __dbg(`🔥 Streak loaded: ${streak.current} (source: ${streak.source || 'authority'})`);
      import('../monitoring/HiMonitor.js').then(m => m.trackEvent('streak_load', { 
        source: 'dashboard', 
        path: streak.source,
        value: streak.current 
      })).catch(()=>{});

    } catch (error) {
      console.error('💥 Critical streak loading error:', error);
      updateStreakDisplay(0); // Graceful degradation
    }
  }

  function updateStreakDisplay(streak){
    const streakElement = document.getElementById('userStreak');
    if (!streakElement) return;
    streakElement.textContent = streak;
    if (streak >= 7) {
      streakElement.style.background = 'linear-gradient(45deg, #ff6b6b, #ffd93d)';
      streakElement.style.webkitBackgroundClip = 'text';
      streakElement.style.webkitTextFillColor = 'transparent';
    } else if (streak >= 3) {
      streakElement.style.color = '#ffd93d';
    } else {
      streakElement.style.color = '';
      streakElement.style.background = '';
      streakElement.style.webkitBackgroundClip = '';
      streakElement.style.webkitTextFillColor = '';
    }
    if (window.__HI_STREAK_DEBUG_ACTIVE){ refreshStreakDebugOverlay(streak); }
    try { window.HiMilestoneToast?.maybeAnnounce?.(streak, { source: 'dashboard' }); } catch {}
  }

  function hideStreakUI(){
    const streakStat = document.querySelector('.user-stat:has(#userStreak)');
    if (streakStat) streakStat.style.display = 'none';
    const streaksContainer = document.getElementById('hiStreaksContainer');
    if (streaksContainer) streaksContainer.style.display = 'none';
    document.querySelectorAll('[id*="streak"], [class*="streak"]').forEach(el => {
      if (el.id !== 'globalStreak' && !el.classList.contains('global-streak')) el.style.display = 'none';
    });
  }

  let statsUpdateTimeout = null;
  let lastStatsUpdate = 0;
  const STATS_UPDATE_COOLDOWN = 500;
  function updateGlobalStats(force=false){
    const now = Date.now();
    if (!force && (now - lastStatsUpdate) < STATS_UPDATE_COOLDOWN){
      if (!statsUpdateTimeout){
        statsUpdateTimeout = setTimeout(()=>{ statsUpdateTimeout=null; updateGlobalStats(true); }, STATS_UPDATE_COOLDOWN);
      }
      return;
    }
    lastStatsUpdate = now;
    if (statsUpdateTimeout){ clearTimeout(statsUpdateTimeout); statsUpdateTimeout=null; }
    const globalHiWaves = document.getElementById('globalHiWaves');
    const globalTotalHis = document.getElementById('globalTotalHis');
    const globalUsers = document.getElementById('globalUsers');
    if (globalHiWaves){
      if (window.gWaves!=null){
        const formatted = window.gWaves.toLocaleString();
        if (globalHiWaves.textContent !== formatted) globalHiWaves.textContent = formatted;
      } else if (!/(\.\.\.|shimmer)/.test(globalHiWaves.textContent||'')){
        globalHiWaves.innerHTML = '<span class="loading-shimmer">...</span>';
      }
    }
    if (globalTotalHis){
      if (window.gTotalHis!=null){ globalTotalHis.textContent = window.gTotalHis.toLocaleString(); }
      else if (globalTotalHis.textContent === '...' || globalTotalHis.textContent===''){ globalTotalHis.textContent='...'; }
    }
    if (globalUsers){
      if (window.gUsers!=null){ globalUsers.textContent = window.gUsers.toLocaleString(); }
      else if (globalUsers.textContent === '...' || globalUsers.textContent===''){ globalUsers.textContent='...'; }
    }
  }

  const dashboardUpdateGlobalStats = updateGlobalStats;
  window.updateGlobalStats = dashboardUpdateGlobalStats;
  Object.defineProperty(window,'updateGlobalStats',{ value: dashboardUpdateGlobalStats, writable:false, configurable:false });
  __dbg('🛡️ Dashboard updateGlobalStats protected from override');

  async function incrementHiWave(){
    try {
      const useMetricsSeparation = await window.HiFlags?.getFlag('metrics_separation_enabled', true);
      if (!useMetricsSeparation){
        __dbg('🎯 Metrics separation disabled, using legacy medallion tracking...');
        if (window.HiUnifiedStats?.trackMedallionTap){ return await window.HiUnifiedStats.trackMedallionTap(); }
        return;
      }
      __dbg('🎯 METRICS SEPARATION: Medallion tapped on hi-dashboard');
      if (window.HiBase?.stats?.insertMedallionTap){
        const user = window.HiBase?.auth?.getCurrentUser();
        const userId = user?.data?.id || null;
        const result = await window.HiBase.stats.insertMedallionTap(userId);
        if (result.error){ console.error('❌ Medallion tap failed:', result.error); return; }
        __dbg('✅ HI MEDALLION TAP SUCCESS:', { newWaveCount: result.data, isAuthenticated: !!userId });
        if (window.hiWavesRealtime){ await window.hiWavesRealtime.forceRefresh(); }
        setTimeout(()=> initHiStatsOnce && initHiStatsOnce('medallion-tap-refresh'), 100);
      } else {
        console.error('❌ METRICS SEPARATION ERROR: HiBase.stats not available');
      }
    } catch (error){ console.error('💥 METRICS SEPARATION FAILURE:', error); }
  }

  async function incrementHi5Counter(){
    try {
      const currentCount = parseInt(localStorage.getItem('hi5_count')||'0');
      const newCount = currentCount + 1;
      localStorage.setItem('hi5_count', newCount.toString());
      if (window.hiDB?.updateUserStats){ await window.hiDB.updateUserStats('hi5_count', newCount); }
      __dbg('[HI DEV] Hi5 counter incremented to:', newCount);
      const el = document.querySelector('.hi5-count'); if (el) el.textContent = newCount;
      
      // Gold Standard: Update streak (unified self-Hi tracking)
      try {
        // Get user ID directly from Supabase session (same as Hi Gym pattern)
        let userId = null;
        if (window.HiSupabase?.getClient) {
          const { data: { user } } = await window.HiSupabase.getClient().auth.getUser();
          userId = user?.id;
        }
        
        if (userId && userId !== 'anonymous' && window.HiBase?.updateStreak) {
          await window.HiBase.updateStreak(userId);
          console.log('🔥 Streak updated from Hi5 click');
          
          // Refresh calendar/streak displays
          if (window.hiCalendarInstance) {
            setTimeout(() => {
              window.hiCalendarInstance.loadHiMoments();
              window.hiCalendarInstance.loadRemoteStreaks();
            }, 300);
          }
        }
      } catch (streakErr) {
        console.warn('⚠️ Streak update skipped:', streakErr);
      }
    } catch (e){ console.error('[HI DEV] Failed to increment Hi5 counter:', e); }
  }

  function setupNavigationHandler(){
    const btnMenu = document.getElementById('btnMenu');
    const navigationModal = document.getElementById('navigationModal');
    const navigationBackdrop = document.getElementById('navigationBackdrop');
    const closeNavigation = document.getElementById('closeNavigation');
    if (!btnMenu || !navigationModal){
      console.error('🚨 Navigation elements not found:', { btnMenu:!!btnMenu, navigationModal:!!navigationModal, navigationBackdrop:!!navigationBackdrop, closeNavigation:!!closeNavigation });
      return;
    }
    btnMenu.style.display='flex'; btnMenu.style.visibility='visible'; btnMenu.style.opacity='1'; btnMenu.style.pointerEvents='auto';
    const openNavigation = async () => {
      navigationModal.classList.add('show'); navigationModal.style.display='block'; document.body.style.overflow='hidden';
      const dialog = navigationModal.querySelector('.navigation-content'); const closeBtn = document.getElementById('closeNavigation');
      (dialog||navigationModal).setAttribute('tabindex','-1'); setTimeout(()=>{ (closeBtn||dialog||navigationModal).focus({preventScroll:true}); },0);
      
      // Check admin status from AdminAccessManager (unified source of truth)
      // CRITICAL FIX: Force fresh admin check to avoid race condition with initial page load
      let adminState = window.AdminAccessManager?.getState?.() || {};
      
      // If status is 'idle' or 'cached' but we haven't checked recently, force a fresh check
      // with 1.5s timeout to prevent menu hang
      const needsFreshCheck = !adminState.lastChecked || (Date.now() - adminState.lastChecked > 60000);
      if (window.AdminAccessManager?.checkAdmin && needsFreshCheck) {
        try {
          const checkPromise = window.AdminAccessManager.checkAdmin({ force: false });
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500));
          await Promise.race([checkPromise, timeoutPromise]);
          adminState = window.AdminAccessManager.getState();
        } catch (e) {
          console.warn('[Dashboard] Admin check failed:', e);
        }
      }
      
      const isAdmin = adminState.isAdmin === true;
      const adminSection = document.getElementById('adminSection');
      if (adminSection) {
        adminSection.style.display = isAdmin ? 'block' : 'none';
      }
      
      __dbg('🎯 Navigation menu opened | Admin:', isAdmin, '| Status:', adminState.status, '| Reason:', adminState.reason);
      // Ensure Mission Control link exists (robust fallback)
      try {
        if (typeof window.ensureAdminEntryExists === 'function') {
          window.ensureAdminEntryExists();
        } else {
          const navMenu = document.querySelector('.navigation-menu');
          if (navMenu){
            let adminSec = document.getElementById('adminSection');
            if (!adminSec){
              adminSec = document.createElement('div');
              adminSec.id = 'adminSection'; adminSec.className = 'nav-section';
              adminSec.innerHTML = '<div class="nav-section-title">Admin</div>';
              navMenu.appendChild(adminSec);
            }
            adminSec.style.display = 'block';
            let link = adminSec.querySelector('a.nav-item.admin-item');
            if (!link){
              link = document.createElement('a'); link.href='hi-mission-control.html'; link.className='nav-item admin-item';
              link.innerHTML = '<span class="nav-icon">🎛️</span><span>Hi Mission Control</span>';
              adminSec.appendChild(link);
            }
            // Attach gate if available
            try { window.attachMissionGate?.(link); } catch {}
          }
        }
      } catch {}
    };
    const closeNavigationModal = () => {
      navigationModal.classList.remove('show'); document.body.style.overflow=''; setTimeout(()=>{ if(!navigationModal.classList.contains('show')) navigationModal.style.display='none'; },300); try { btnMenu.focus({preventScroll:true}); } catch {}
      __dbg('🎯 Navigation menu closed');
    };
    
    // Tesla-grade dynamic Account button (Sign In OR Sign Out based on auth state)
    const btnSignOut = document.getElementById('btnSignOut');
    const btnSignIn = document.getElementById('btnSignIn');
    
    async function updateAccountButton() {
      const client = window.hiSupabase || window.supabaseClient || window.sb;
      const { data } = await client?.auth?.getSession?.() || {};
      const isLoggedIn = !!data?.session;
      
      if (btnSignIn) btnSignIn.style.display = isLoggedIn ? 'none' : 'flex';
      if (btnSignOut) btnSignOut.style.display = isLoggedIn ? 'flex' : 'none';
      
      console.log('[Dashboard] 🔐 Account button updated:', { isLoggedIn, showSignIn: !isLoggedIn, showSignOut: isLoggedIn });
    }
    
    // Wrap openNavigation to update account button first
    btnMenu.addEventListener('click', async () => {
      await updateAccountButton();
      openNavigation();
    });
    if (closeNavigation) closeNavigation.addEventListener('click', closeNavigationModal);
    if (navigationBackdrop) navigationBackdrop.addEventListener('click', closeNavigationModal);
    document.addEventListener('keydown', e => { if (e.key==='Escape' && navigationModal.classList.contains('show')) closeNavigationModal(); });
    
    // Sign out handler
    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        console.log('[Dashboard] Sign out initiated');
        try {
          // Get Supabase client
          const client = window.hiSupabase || window.supabaseClient || window.sb;
          if (client?.auth?.signOut) {
            console.log('[Dashboard] Signing out from Supabase');
            await client.auth.signOut();
          }
          
          // Clear all cached data
          console.log('[Dashboard] Clearing auth cache');
          localStorage.clear();
          sessionStorage.clear();
          
          // Close navigation modal
          closeNavigationModal();
          
          // Redirect to signin
          console.log('[Dashboard] Redirecting to signin');
          setTimeout(() => {
            window.location.href = (window.hiPaths?.page ? window.hiPaths.page('signin') : 'signin.html');
          }, 300);
          
        } catch (error) {
          console.error('[Dashboard] Sign out error:', error);
          // Fallback: clear and redirect anyway
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = (window.hiPaths?.page ? window.hiPaths.page('signin') : 'signin.html');
        }
      });
    }
    
    // Listen for auth state changes
    window.addEventListener('hi:auth-ready', updateAccountButton);
    window.addEventListener('hi:auth-state-changed', updateAccountButton);
    
    // Initial update
    setTimeout(updateAccountButton, 100);
  }
  // Invoke debug overlay after DOM ready
  document.addEventListener('DOMContentLoaded', ensureStreakDebugOverlay);


  // ------------------------------ Streak Debug Overlay ------------------------------
  function ensureStreakDebugOverlay(){
    if (!window.location.search.includes('streakdebug=1')) return;
    if (window.__HI_STREAK_DEBUG_ACTIVE) return;
    window.__HI_STREAK_DEBUG_ACTIVE = true;
    const panel = document.createElement('div');
    panel.id = 'hiStreakDebugPanel';
    panel.style.position='fixed';
    panel.style.bottom='12px';
    panel.style.right='12px';
    panel.style.zIndex='9999';
    panel.style.background='rgba(30,34,40,0.85)';
    panel.style.color='#fff';
    panel.style.padding='10px 14px';
    panel.style.border='1px solid rgba(255,255,255,0.15)';
    panel.style.borderRadius='10px';
    panel.style.font='12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    panel.style.boxShadow='0 4px 14px rgba(0,0,0,0.4)';
    panel.style.backdropFilter='blur(8px)';
    panel.innerHTML = '<strong>🔥 Streak Debug</strong><div id="streakDebugContent" style="margin-top:6px;font-size:11px;white-space:nowrap">Loading...</div>';
    document.body.appendChild(panel);
    refreshStreakDebugOverlay();
    window.addEventListener('hi:share-recorded', ()=> scheduleStreakDebugRefresh());
    window.addEventListener('hi:streak-updated', ()=> scheduleStreakDebugRefresh());
    setInterval(()=> refreshStreakDebugOverlay(), 8000);
  }
  function scheduleStreakDebugRefresh(){ setTimeout(()=> refreshStreakDebugOverlay(), 250); }
  function resolveCurrentStreakValue(){
    // Attempt multiple sources
    const el = document.getElementById('userStreak');
    const uiValue = el? parseInt(el.textContent||'0',10): null;
    const stored = parseInt(localStorage.getItem('user_current_streak')||'0',10);
    let hibaseValue = null;
    try { hibaseValue = window.HiBase?.streaks?.myStreak?.current ?? null; } catch {}
    return { uiValue, stored, hibaseValue };
  }
  function refreshStreakDebugOverlay(latestOverride){
    const content = document.getElementById('streakDebugContent');
    if (!content) return;
    const { uiValue, stored, hibaseValue } = resolveCurrentStreakValue();
    const streak = Number.isFinite(latestOverride)? latestOverride : (hibaseValue ?? uiValue ?? stored ?? 0);
    let milestoneData = { current:null, next:null, remaining:0 };
    if (window.HiStreakMilestones){ milestoneData = window.HiStreakMilestones.describeProgress(streak); }
    const source = hibaseValue!=null? 'HiBase' : (uiValue!=null? 'UI':'local');
    content.innerHTML = `Streak: <strong>${streak}</strong> (<em>${source}</em>)<br>`+
      `Current: ${milestoneData.current? milestoneData.current.name+'('+milestoneData.current.threshold+')':'none'}<br>`+
      `Next: ${milestoneData.next? milestoneData.next.name+'('+milestoneData.next.threshold+')':'—'}<br>`+
      `Remaining: ${milestoneData.remaining}`;
  }

  // ----------------------------------------------------------------------------------


  function setupHiffirmationsHandler(){ if (!hiffirmationsTrigger) return; hiffirmationsTrigger.addEventListener('click', e => { e.preventDefault(); showHiffirmationsModal(); }); }
  function setupFloatingHiffirmationsHandler(){ const floatingBtn = document.getElementById('floatingHiffirmations'); if(!floatingBtn) return; floatingBtn.addEventListener('click', e=>{ e.preventDefault(); showHiffirmationsModal(); if(window.PremiumUX){ window.PremiumUX.triggerHapticFeedback('medium'); } }); }

  function getDailyHiffirmation(date=new Date()){
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; let hash=0; for(let i=0;i<key.length;i++){ hash=(hash*31+key.charCodeAt(i))|0; }
    const hiffirmations=["✨ Stay Hi! You're on a Hi level of positive energy today","🌟 Your Hi vibes are lifting others to new Hi-ghts of joy","💫 Hi there! You have the power to get someone Hi on life today","🔥 Hi amazing soul! Your authentic self is Hi-ly inspiring","🌈 Every Hi you share lifts our world to Hi-er dimensions","⭐ Hi friend! You're exactly Hi enough, right Hi and now","💝 Hi incredible human! Your presence gets everyone Hi on good vibes","🌺 Hi warrior! You're reaching Hi-er levels with each Hi moment","🎯 Hi there! Trust your journey, you're flying Hi and amazing","💎 Hi shining star! Your Hi energy can never be brought low","🚀 Hi unstoppable force! Your potential reaches the Hi-est peaks","🌸 Hi beautiful! You bring Hi-quality beauty to every moment","⚡ Hi energy! Your Hi frequency lights up every space you enter","🏔️ Hi mountain mover! You're Hi above any challenge life brings","🎨 Hi creative soul! Your imagination paints the world in Hi definition","🌊 Hi flowing river! You ride Hi through all of life's changes","🔮 Hi intuitive being! Your inner wisdom operates on the Hi-est level","🦋 Hi transformer! You're evolving into your Hi-est, most amazing self","🌅 Hi sunrise! Each day brings Hi-level opportunities just for you","💪 Hi resilient heart! Your bounce-back ability is Hi-ly remarkable" ];
    const selectedMessage = hiffirmations[Math.abs(hash % hiffirmations.length)];
    const lastHiffirmationDate = localStorage.getItem('lastHiffirmationDate'); const today = new Date().toDateString(); const isDaily = lastHiffirmationDate !== today;
    if (isDaily){ localStorage.setItem('lastHiffirmationDate', today); return selectedMessage; }
    const hiBoosts=["Stay Hi! Keep that Hi energy shining! ✨","Hi beautiful! You've got that Hi-level magic! 💪","Hi amazing! Keep riding Hi! 🚀","Hi superstar! Stay on that Hi frequency! 🌟"]; return hiBoosts[Math.floor(Math.random()*hiBoosts.length)];
  }
  function getNextHiffirmationCountdown(){ const now=new Date(); const tomorrow=new Date(now); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(0,0,0,0); const timeLeft=tomorrow-now; return { hours:Math.floor(timeLeft/3600000), minutes:Math.floor((timeLeft%3600000)/60000), timeLeft }; }

  function showHiffirmationsModal(customDate=null){ const targetDate=customDate||new Date(); const dailyHiffirmation=getDailyHiffirmation(targetDate); const countdown=getNextHiffirmationCountdown(); const isToday = !customDate || (targetDate.toDateString()===new Date().toDateString()); const dateLabel = isToday? 'Today' : targetDate.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
    const modal=document.createElement('div'); modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:15000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);';
    modal.innerHTML=`<div style="background:rgba(15,16,34,0.95);backdrop-filter:blur(25px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:32px;max-width:400px;width:90vw;text-align:center;color:#fff;box-shadow:0 20px 40px rgba(0,0,0,.3);position:relative;">`+
    `<h3 style="margin:0 0 8px;color:#FFD166;font-size:24px;">✨ ${(function(){const lastDate=localStorage.getItem('lastHiffirmationDate');const todayString=new Date().toDateString();const isDailyHi=!customDate && (lastDate!==todayString);if(!isToday) return dateLabel+' Hiffirmation';return isDailyHi ? 'Daily Hiffirmation' : 'Hi Boost';})()}</h3>`+
    (isToday && localStorage.getItem('lastHiffirmationDate') !== new Date().toDateString() ? `<div style="font-size:12px;color:rgba(255,255,255,.85);margin-bottom:20px;padding:8px 12px;background:rgba(255,255,255,.05);border-radius:8px;border:1px solid rgba(255,255,255,.1);">Next Daily Hiffirmation in ${countdown.hours}h ${countdown.minutes}m</div>` : isToday ? `<div style="font-size:12px;color:rgba(233,30,99,.8);margin-bottom:20px;padding:8px 12px;background:rgba(233,30,99,.1);border-radius:8px;border:1px solid rgba(233,30,99,.2);">🚀 Unlimited Hi Boosts available!</div>`:'')+
    `<div style="font-size:18px;line-height:1.5;margin:24px 0;color:rgba(255,255,255,.9);">${dailyHiffirmation}</div>`+
    `<div style="display:flex;gap:12px;justify-content:center;margin-top:24px;"><button class="hiffirmation-share" style="padding:12px 20px;background:linear-gradient(135deg,#4ECDC4,#44A08D);border:none;border-radius:12px;color:#fff;font-weight:600;cursor:pointer;transition:transform .2s ease;">Share This</button><button class="hiffirmation-yesterday" style="padding:12px 20px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:12px;color:#fff;font-weight:600;cursor:pointer;transition:all .2s ease;">Yesterday's</button></div>`+
    `<div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);"><img src="assets/brand/hi-logo-192.png" srcset="assets/brand/hi-logo-192.png 192w, assets/brand/hi-logo-512.png 512w" sizes="32px" alt="Hi" width="32" height="32" loading="lazy" decoding="async" style="width:32px;height:32px;opacity:.7;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"/><div style="display:none;font-size:24px;color:#FFD166;font-weight:bold;">Hi</div></div>`+
    `<button class="close-hiffirmation" style="position:absolute;top:16px;right:16px;width:32px;height:32px;border:none;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font-size:16px;">✕</button></div>`;
    document.body.appendChild(modal); document.body.style.overflow='hidden';
    const closeModal=()=>{ document.body.removeChild(modal); document.body.style.overflow=''; };
    modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
    modal.querySelector('.close-hiffirmation').addEventListener('click', closeModal);
    modal.querySelector('.hiffirmation-yesterday').addEventListener('click', ()=>{ closeModal(); setTimeout(()=>{ const y=new Date(); y.setDate(y.getDate()-1); showHiffirmationsModal(y); },100); });
    modal.querySelector('.hiffirmation-share').addEventListener('click', async () => {
      const shareBtn = modal.querySelector('.hiffirmation-share'); const originalText = shareBtn.textContent;
      try {
        shareBtn.textContent='Creating quote card...'; shareBtn.style.background='linear-gradient(135deg,#FFD166,#F4A261)';
        const userTier=getUserTierForSharing();
        const quoteCardDataURL=await window.HiQuoteCardGenerator.generateQuoteCard(dailyHiffirmation,{ userTier, format:'square'});
        const blob=await window.HiQuoteCardGenerator.dataURLToBlob(quoteCardDataURL); const file=new File([blob],'hiffirmation-quote-card.png',{type:'image/png'});
        if (navigator.canShare && navigator.canShare({files:[file]})){
          shareBtn.textContent='Sharing...'; await navigator.share({ title:'Daily Hiffirmation from Stay Hi', text:`"${dailyHiffirmation}"\n\nShared from Stay Hi ✨`, files:[file] }); shareBtn.textContent='✓ Shared!'; shareBtn.style.background='linear-gradient(135deg,#4CAF50,#45a049)';
        } else if (navigator.share){
          shareBtn.textContent='Downloading & copying...'; const dl=document.createElement('a'); dl.href=quoteCardDataURL; dl.download='hiffirmation-quote-card.png'; dl.click(); await navigator.share({ title:'Daily Hiffirmation from Stay Hi', text:`"${dailyHiffirmation}"\n\nShared from Stay Hi ✨\n\nstay-hi.app` }); shareBtn.textContent='✓ Quote card downloaded & text shared!'; shareBtn.style.background='linear-gradient(135deg,#4CAF50,#45a049)';
        } else {
          shareBtn.textContent='Downloading...'; const dl=document.createElement('a'); dl.href=quoteCardDataURL; dl.download='hiffirmation-quote-card.png'; dl.click(); const textToCopy=`"${dailyHiffirmation}"\n\nShared from Stay Hi ✨\nstay-hi.app`; await navigator.clipboard.writeText(textToCopy); shareBtn.textContent='✓ Quote card downloaded & text copied!'; shareBtn.style.background='linear-gradient(135deg,#4CAF50,#45a049)';
        }
      } catch(err){ console.error('❌ Quote card sharing failed:', err); if (navigator.share){ await navigator.share({ title:'Daily Hiffirmation from Stay Hi', text: dailyHiffirmation, url: location.href }); } else { await navigator.clipboard.writeText(dailyHiffirmation); } shareBtn.textContent='✓ Shared!'; shareBtn.style.background='linear-gradient(135deg,#4CAF50,#45a049)'; }
      setTimeout(()=>{ shareBtn.textContent=originalText; shareBtn.style.background='linear-gradient(135deg,#4ECDC4,#44A08D)'; },3000);
    });
    function getUserTierForSharing(){ const tierIndicator=document.getElementById('hi-tier-indicator'); if (tierIndicator){ const tierText=tierIndicator.querySelector('.tier-text')?.textContent; if (tierText==='Premium') return 'PREMIUM'; if (tierText==='Standard') return 'STANDARD'; } return 'ANONYMOUS'; }
  }

  // 🎯 BULLETPROOF: Prevent race conditions with execution guard + queue
  let setupWeeklyProgressRunning = false;
  let setupWeeklyProgressQueued = false;

  async function setupWeeklyProgress() {
    try {
      // 🔒 GUARD: If already running, queue ONE retry
      if (setupWeeklyProgressRunning) {
        if (!setupWeeklyProgressQueued) {
          setupWeeklyProgressQueued = true;
          console.log('🔄 [7-DAY PILL] Already running, queuing retry...');
        }
        return;
      }

      setupWeeklyProgressRunning = true;
      console.log('🎯 [7-DAY PILL] Starting setupWeeklyProgress...');
      
      // 🚀 FAST PATH: Check cache first for instant display
      if (window.NavCache) {
        const cachedStreak = window.NavCache.getStreak();
        if (cachedStreak && !cachedStreak.needsRefresh) {
          console.log('⚡ [7-DAY PILL] Using cached streak for instant display:', cachedStreak);
          const weekStrip = document.getElementById('weekStrip');
          if (!weekStrip) {
            console.warn('⚠️ [7-DAY PILL] weekStrip element not found');
            setupWeeklyProgressRunning = false;
            return;
          }
          
          // Generate weekly display from cached streak
          const weeklyData = generateWeeklyFromStreak(cachedStreak);
          
          // Render immediately
          const today = new Date();
          let html = '';
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const label = date.toLocaleDateString(undefined, {weekday: 'short'}).toUpperCase();
            const dayNum = date.getDate();
            const isToday = i === 0;
            const dateKey = date.toISOString().split('T')[0];
            const metClass = weeklyData.activeDays.includes(dateKey) ? 'met' : '';
            const hasMilestone = isToday && weeklyData.milestone?.current;
            const milestoneClass = hasMilestone ? 'milestone' : '';
            const ariaLabel = `${label} ${dayNum}${isToday ? ', today' : ''}${metClass ? ', completed' : ', not completed'}${hasMilestone ? `, ${weeklyData.milestone.current.name} milestone reached` : ''}`;
            
            html += `<div class="weekdot ${isToday ? 'today' : ''} ${milestoneClass}" 
                          role="img" 
                          aria-label="${ariaLabel}"
                          data-date="${dateKey}"
                          style="animation-delay: ${(6-i) * 50}ms">
                      <div class="lbl">${label}</div>
                      <div class="c ${metClass}">
                        ${dayNum}
                        ${hasMilestone ? `<div class="milestone-badge" role="img" aria-label="${weeklyData.milestone.current.emoji} ${weeklyData.milestone.current.name}">${weeklyData.milestone.current.emoji}</div>` : ''}
                      </div>
                    </div>`;
          }
          weekStrip.innerHTML = html;
          requestAnimationFrame(() => {
            weekStrip.querySelectorAll('.weekdot').forEach(dot => dot.classList.add('fade-in'));
          });
          
          console.log('✅ [7-DAY PILL] Used cached streak, skipping database query');
          setupWeeklyProgressRunning = false;
          return;
        }
      }

      const weekStrip = document.getElementById('weekStrip');
      if (!weekStrip) {
        console.warn('⚠️ [7-DAY PILL] weekStrip element not found');
        return;
      }
      
      // Show loading skeleton
      weekStrip.innerHTML = `<div class="week-loading">${Array(7).fill('<div class="weekdot-skeleton"></div>').join('')}</div>`;
      
      const today = new Date();
      let html = '';
      const weeklyActivity = await getUserWeeklyActivity();
    
    // 🎯 SCALE FIX: Handle large streaks gracefully (2000+ days)
    const currentStreak = weeklyActivity.streakData?.current || 0;
    console.log(`🔥 [7-DAY PILL] Current streak: ${currentStreak} days`);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const label = date.toLocaleDateString(undefined, {weekday: 'short'}).toUpperCase();
      const dayNum = date.getDate();
      const isToday = i === 0;
      const dateKey = date.toISOString().split('T')[0];
      const metClass = weeklyActivity.activeDays.includes(dateKey) ? 'met' : '';
      const hasMilestone = isToday && weeklyActivity.milestone?.current;
      const milestoneClass = hasMilestone ? 'milestone' : '';
      
      // Accessibility: describe each day's state
      const ariaLabel = `${label} ${dayNum}${isToday ? ', today' : ''}${metClass ? ', completed' : ', not completed'}${hasMilestone ? `, ${weeklyActivity.milestone.current.name} milestone reached` : ''}`;
      
      html += `<div class="weekdot ${isToday ? 'today' : ''} ${milestoneClass}" 
                    role="img" 
                    aria-label="${ariaLabel}"
                    data-date="${dateKey}"
                    style="animation-delay: ${(6-i) * 50}ms">
                <div class="lbl">${label}</div>
                <div class="c ${metClass}">
                  ${dayNum}
                  ${hasMilestone ? `<div class="milestone-badge" role="img" aria-label="${weeklyActivity.milestone.current.emoji} ${weeklyActivity.milestone.current.name}">${weeklyActivity.milestone.current.emoji}</div>` : ''}
                </div>
              </div>`;
    }
    
    weekStrip.innerHTML = html;
    
    // 🎯 NOTE: Stat box updated by StreakEvents.broadcast() or loadUserStreak()
    // Don't update here to avoid race conditions
    console.log(`✅ [STREAK SYNC] Visual grid updated (${weeklyActivity.streakData?.current || 0} day streak)`);
    
    
    // Trigger fade-in animation
    requestAnimationFrame(() => {
      weekStrip.querySelectorAll('.weekdot').forEach(dot => dot.classList.add('fade-in'));
    });

    console.log('✅ [7-DAY PILL] setupWeeklyProgress completed');
    
    } catch (error) {
      console.error('❌ [STREAK SYNC] setupWeeklyProgress failed:', error);
      // Graceful degradation - show 0 if anything fails
      const statEl = document.getElementById('userStreak');
      if (statEl) statEl.textContent = '0';
    } finally {
      // 🔓 UNLOCK: Release guard
      setupWeeklyProgressRunning = false;

      // 🔄 PROCESS QUEUE: If call was queued during execution, run once more
      if (setupWeeklyProgressQueued) {
        setupWeeklyProgressQueued = false;
        console.log('🔄 [7-DAY PILL] Processing queued retry...');
        setTimeout(() => setupWeeklyProgress(), 100); // Small delay to batch rapid calls
      }
    }
  }
  
  // 🎯 EXPOSE GLOBALLY: Allow premium-calendar to trigger consolidated updates
  window.setupWeeklyProgress = setupWeeklyProgress;
  
  async function getUserWeeklyActivity(){ 
    try { 
      // FIX: Use ProfileManager instead of undefined window.hiAuth
      const userId = window.ProfileManager?.getUserId?.();
      console.log('🔍 [getUserWeeklyActivity] ProfileManager userId:', userId);
      console.log('🔍 [getUserWeeklyActivity] ProfileManager exists:', !!window.ProfileManager);
      console.log('🔍 [getUserWeeklyActivity] HiBase.streaks exists:', !!window.HiBase?.streaks);
      
      if (userId && userId !== 'anonymous'){ 
        console.log('🔍 [getUserWeeklyActivity] Calling StreakAuthority.get with userId:', userId);
        // 🎯 FIX: Use StreakAuthority (single source of truth)
        const streak = window.StreakAuthority 
          ? await window.StreakAuthority.get(userId)
          : null;
        const streakResult = streak ? { data: streak } : null;
        console.log('🔍 [getUserWeeklyActivity] StreakAuthority response:', JSON.stringify(streakResult, null, 2));
        
        if (streakResult?.data){ 
          console.log('🔍 [getUserWeeklyActivity] Using HiBase path with data:', streakResult.data);
          return generateWeeklyFromStreak(streakResult.data); 
        } else {
          console.warn('⚠️ [getUserWeeklyActivity] No data in streakResult, falling back to anonymous');
        }
      } else {
        console.log('🔍 [getUserWeeklyActivity] No authenticated user (userId:', userId, '), using anonymous preview');
      }
      return generateAnonymousWeeklyPreview(); 
    } catch(e){ 
      console.error('❌ Weekly activity load failed:', e); 
      return generateAnonymousWeeklyPreview(); 
    } 
  }

  // Network error retry handler
  window.retryDashboardLoad = async function() {
    const statsDisplay = document.getElementById('hi-stats-display');
    if (statsDisplay) {
      statsDisplay.innerHTML = '<div class="hi-loading-skeleton"><div class="loading-msg">Loading your stats...</div></div>';
    }
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };
  
  // 🎯 FIXED: Generate weekly activity from streak data (works backwards from lastHiDate)
  function generateWeeklyFromStreak(streakData) {
    const activeDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    
    const currentStreak = streakData.current || 0;
    const lastHiDate = streakData.lastHiDate;
    const milestoneInfo = checkStreakMilestones(currentStreak);
    
    console.log('🔍 [7-DAY PILL] Input:', { currentStreak, lastHiDate });
    
    if (!lastHiDate || currentStreak === 0) {
      console.log('⚠️ [7-DAY PILL] No streak data');
      return { activeDays: [], source: 'real_streak', milestone: milestoneInfo, streakData: { current: 0 } };
    }
    
    // Parse last Hi date and normalize to midnight
    const lastHi = new Date(lastHiDate + 'T00:00:00');
    lastHi.setHours(0, 0, 0, 0); // Ensure midnight normalization
    
    // 🎯 KEY FIX: Work backwards from lastHiDate (like calendar does)
    // Show the MOST RECENT days of the streak (up to 7 days max)
    const daysToShow = Math.min(currentStreak, 7);
    
    console.log('📅 [7-DAY PILL] Calculating last', daysToShow, 'days of', currentStreak, 'day streak');
    
    for (let i = 0; i < daysToShow; i++) {
      const streakDay = new Date(lastHi);
      streakDay.setDate(lastHi.getDate() - i); // Work backwards from lastHiDate
      streakDay.setHours(0, 0, 0, 0); // Normalize each day
      
      // Calculate days ago using proper date arithmetic
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysAgo = Math.round((today.getTime() - streakDay.getTime()) / msPerDay);
      
      // Only include days within the 7-day window
      if (daysAgo >= 0 && daysAgo <= 6) {
        const dateKey = streakDay.toISOString().split('T')[0];
        activeDays.push(dateKey);
        console.log(`✅ [7-DAY PILL] Day ${i+1}: ${dateKey} (${daysAgo} days ago)`);
      } else {
        console.log(`⏭️ [7-DAY PILL] Skipping ${streakDay.toISOString().split('T')[0]} (${daysAgo} days ago, outside 7-day window)`);
      }
    }
    
    console.log('🎯 [7-DAY PILL] Final active days:', activeDays);
    
    return { 
      activeDays, 
      source: 'real_streak', 
      milestone: milestoneInfo,
      streakData: { current: currentStreak } // 🎯 INCLUDE STREAK DATA
    };
  }
  
  function checkStreakMilestones(streak){ const milestones=[{threshold:3,name:'Hi Habit',emoji:'🔥'},{threshold:7,name:'Week Keeper',emoji:'🔥'},{threshold:30,name:'Monthly Hi',emoji:'🔥'},{threshold:100,name:'Steady Light',emoji:'🔥'}]; const achieved=milestones.filter(m=>streak>=m.threshold); const latest=achieved[achieved.length-1]; const upcoming=milestones.find(m=>streak < m.threshold); return { current: latest||null, next: upcoming||null, isNewMilestone:false }; }
  // Prefer centralized milestone definition if loaded
  function checkStreakMilestones(streak){
    if (window.HiStreakMilestones){
      const { current, next, remaining } = window.HiStreakMilestones.describeProgress(streak);
      return { current, next, remaining, isNewMilestone:false };
    }
    const milestones=[{threshold:3,name:'Hi Habit',emoji:'🔥'},{threshold:7,name:'Week Keeper',emoji:'🔥'},{threshold:30,name:'Monthly Hi',emoji:'🔥'},{threshold:100,name:'Steady Light',emoji:'🔥'}];
    const achieved=milestones.filter(m=>streak>=m.threshold); const latest=achieved[achieved.length-1]; const upcoming=milestones.find(m=>streak < m.threshold); return { current: latest||null, next: upcoming||null, remaining: upcoming? (upcoming.threshold - streak):0, isNewMilestone:false };
  }
  
  function generateAnonymousWeeklyPreview(){ 
    const activeDays=[]; 
    const today=new Date();
    // 🎯 FIX: Use deterministic preview (not random) to prevent visual jitter on refresh
    // Show today only - consistent with "logged out, no streak" state
    activeDays.push(today.toISOString().split('T')[0]);
    // 🎯 REGRESSION FIX: Include streakData for anonymous users too
    return { activeDays, source:'preview', streakData: { current: 0 } }; 
  }

  function showCelebrationMessage(message){ const celebration=document.createElement('div'); celebration.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#FFD166,#FF7B24);color:#000;padding:20px 30px;border-radius:20px;font-size:18px;font-weight:600;box-shadow:0 10px 30px rgba(255,123,24,.4);z-index:10000;animation:celebrationPop 2s ease-out forwards;'; celebration.textContent=message; if(!document.getElementById('celebrationStyles')){ const style=document.createElement('style'); style.id='celebrationStyles'; style.textContent='@keyframes celebrationPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.5);}20%{opacity:1;transform:translate(-50%,-50%) scale(1.1);}100%{opacity:0;transform:translate(-50%,-50%) scale(1);} }'; document.head.appendChild(style);} document.body.appendChild(celebration); setTimeout(()=>celebration.remove(),2000); }

  async function initializeHiExperienceLayer(){ try { const { isEnabledCohort } = await import('../flags/HiFlags.js'); const { trackEvent } = await import('../monitoring/HiMonitor.js'); const hiFeedEnabled = await isEnabledCohort('hifeed_enabled'); trackEvent('flag_check',{ key:'hifeed_enabled', enabled:hiFeedEnabled, rollout:true, location:'dashboard'}); if (hiFeedEnabled){ const experienceLayer=document.getElementById('hiExperienceLayer'); if (experienceLayer) experienceLayer.style.display='block'; if (window.HiFeed){ const hiFeed=new window.HiFeed('#hiFeedContainer'); await hiFeed.initialize(); } if (window.HiStreaks){ const hiStreaks=new window.HiStreaks('#hiStreaksContainer'); await hiStreaks.initialize(); } } } catch(e){ console.error('❌ Hi Experience Layer initialization error:', e); } }

  document.addEventListener('DOMContentLoaded', async () => {
    // Bridge global stats events to UI counters and pill
    try {
      function setupGlobalStatsEventBridge(){
        const handler = (e)=>{
          const d = (e && e.detail) || {};
          if (Number.isFinite(d.waves)) window.gWaves = Number(d.waves);
          if (Number.isFinite(d.totalHis)) { window.gTotalHis = Number(d.totalHis); window._gTotalHisIsTemporary = false; }
          if (Number.isFinite(d.totalUsers)) window.gUsers = Number(d.totalUsers);
          // Confirm that live values have arrived to suppress placeholder zeros
          if (Number.isFinite(d.waves)) window.__wavesConfirmed = true;
          if (Number.isFinite(d.totalHis)) window.__totalHisConfirmed = true;
          if (Number.isFinite(d.totalUsers)) window.__usersConfirmed = true;
          try { updateStatsUI(); } catch {}
          const pill = document.getElementById('globalPill');
          if (pill && d.totalHis != null && d.waves != null){
            const th = Number(d.totalHis); const wv = Number(d.waves);
            if (Number.isFinite(th) && Number.isFinite(wv)){
              pill.textContent = `Global: ${th.toLocaleString()} hi-5s • ${wv.toLocaleString()} waves`;
            }
          }
        };
        window.addEventListener('hi:global-stats', handler);
        window.addEventListener('hi:stats-updated', handler);
      }
      setupGlobalStatsEventBridge();
    } catch (e) { console.warn('⚠️ Global stats bridge not installed:', e); }

    // Admin state listeners - update adminSection visibility on state changes
    try {
      function updateAdminSectionVisibility() {
        const adminState = window.AdminAccessManager?.getState?.() || {};
        const isAdmin = adminState.isAdmin === true;
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
          adminSection.style.display = isAdmin ? 'block' : 'none';
          console.log('[Dashboard] 🔐 Admin section visibility updated:', {
            isAdmin,
            status: adminState.status,
            reason: adminState.reason,
            display: adminSection.style.display
          });
        }
      }
      
      // Listen for admin state changes
      window.addEventListener('hi:admin-confirmed', updateAdminSectionVisibility);
      window.addEventListener('hi:admin-state-changed', updateAdminSectionVisibility);
      
      // Initial check
      setTimeout(updateAdminSectionVisibility, 100);
    } catch (e) { console.warn('⚠️ Admin section listeners not installed:', e); }

    try { const currentPage={ url:location.href, name:'Dashboard', timestamp:Date.now() }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const filtered=navHistory.filter(p=>p.url!==currentPage.url); filtered.unshift(currentPage); filtered.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(filtered)); } catch{}
    setupNavigationHandler();
    
    // 🎯 CRITICAL: Await initializeDatabase to ensure ProfileManager is ready
    // Before: initializeDatabase() called without await → ProfileManager race condition
    // After: await ensures ProfileManager.init() completes before 7-day pill setup
    await initializeDatabase();
    
    setupHiffirmationsHandler();
    setupFloatingHiffirmationsHandler();
    
    // ✅ BULLETPROOF: Setup 7-day pill with fallback protection
    let weeklyProgressSetup = false;
    
    async function initializeWeeklyProgress() {
      if (weeklyProgressSetup) {
        console.log('🎯 [7-DAY PILL] Already initialized, skipping duplicate');
        return;
      }
      weeklyProgressSetup = true;
      console.log('🎯 [7-DAY PILL] Initializing weekly progress...');
      await loadUserStreak();
      await setupWeeklyProgress();
    }
    
    // Listen for auth-ready event
    window.addEventListener('hi:auth-ready', async () => {
      console.log('🎯 [7-DAY PILL] Auth ready event received');
      await initializeWeeklyProgress();
    });
    
    // FALLBACK: If auth already ready OR event doesn't fire within 2s, initialize anyway
    setTimeout(async () => {
      if (!weeklyProgressSetup) {
        console.log('🎯 [7-DAY PILL] Fallback timeout triggered, initializing without waiting for event');
        await initializeWeeklyProgress();
      }
    }, 2000);
    
    // 🔧 SURGICAL FIX: Use unified cache keys for shimmer only (not as source of truth)
    const savedWaves=localStorage.getItem('globalHiWaves'); const savedTotal=localStorage.getItem('globalTotalHis'); const savedUsers=localStorage.getItem('globalTotalUsers');
    if (window.gWaves===undefined){
      const cacheTime=localStorage.getItem('globalHiWaves_time');
      const recent=cacheTime && (Date.now()-parseInt(cacheTime,10))<30000;
      if (savedWaves && recent){
        const v = parseInt(savedWaves,10);
        if (Number.isFinite(v) && v > 0){
          window.gWaves = v;
        } else {
          window.gWaves = null; // do not show 0 from cache
          window._needsWavesRefresh = true;
        }
      } else {
        // Avoid hard-coded fallback contamination; defer to live fetch
        window.gWaves = null; // Shimmer until real stats arrive
        window._needsWavesRefresh=true;
      }
    }
    // 🎯 CRITICAL FIX: Never use cache as source of truth for Total His
    // Always show shimmer until database value arrives
    if (window.gTotalHis===undefined){ 
      window.gTotalHis = null; // Shimmer - database will populate
      window._gTotalHisIsTemporary = true; 
    }
    if (window.gUsers===undefined){ const cachedUsers=localStorage.getItem('dashboard_users_cache'); window.gUsers = cachedUsers ? parseInt(cachedUsers,10) : 5; window.initializeSmartUserCount?.(); }
    updateStatsUI();

    // Prefer unified stats loader for canonical values
    try {
      const { loadGlobalStats } = await import('../stats/UnifiedStatsLoader.js');
      const stats = await loadGlobalStats();
      if (Number.isFinite(stats.waves)) window.gWaves = Number(stats.waves);
      if (Number.isFinite(stats.totalHis)) { window.gTotalHis = Number(stats.totalHis); window._gTotalHisIsTemporary = false; }
      if (Number.isFinite(stats.totalUsers)) window.gUsers = Number(stats.totalUsers);
      updateStatsUI();
      // Load debug overlay if requested
      const qp = new URLSearchParams(location.search);
      if (qp.get('debugstats') === '1' || window.__HI_STATS_DEBUG__ === true) {
        import('../stats/StatsDebugOverlay.js').catch(()=>{});
      }
    } catch (e) { console.warn('Unified stats loader optional:', e); }
    
    // Initialize Gold Standard tracker
    (async () => {
      try {
        const { trackShareSubmission } = await import('../stats/GoldStandardTracker.js');
        if (!window.trackShareSubmission || !window.trackShareSubmission.__HI_ENHANCED__){
          if (!window.__TRACK_SHARE_INIT__){
            window.trackShareSubmission = trackShareSubmission;
            window.__TRACK_SHARE_INIT__='gold';
            __dbg('✅ Gold Standard tracker bound (Dashboard)');
          } else {
            __dbg('ℹ️ Tracker already initialized via', window.__TRACK_SHARE_INIT__);
          }
        } else {
          __dbg('ℹ️ Enhanced trackShareSubmission present, dashboard skipping raw bind');
        }
        try { await import('../stats/HiOSEnhancementLayer.js'); } catch(e){ console.warn('⚠️ Enhancement optional:', e); }
      } catch(e) { 
        console.error('❌ Stats initialization failed:', e); 
      }
    })();
    
    // 🔥 TIER UPDATE SYSTEM REMOVED - Handled by authready-listener.js ONLY
    // Previously had duplicate updateBrandTierDisplay() here competing with authready-listener.js
    // This caused tier to show correct value then regress to 'anonymous' default
    // See dashboard-main.mjs for detailed architectural explanation
    
    initializeHiExperienceLayer();
    setTimeout(()=> updateStatsUI(),50);
    setTimeout(()=> updateStatsUI(),500);
    setTimeout(()=> updateStatsUI(),1500);

    // Live updates: listen for unified global stats events
    try {
      window.addEventListener('hi:global-stats', (ev) => {
        const d = ev?.detail || {};
        if (Number.isFinite(+d.waves)) window.gWaves = +d.waves;
        if (Number.isFinite(+d.totalHis)) { window.gTotalHis = +d.totalHis; window._gTotalHisIsTemporary = false; }
        if (Number.isFinite(+d.totalUsers)) window.gUsers = +d.totalUsers;
        if (Number.isFinite(+d.waves)) window.__wavesConfirmed = true;
        if (Number.isFinite(+d.totalHis)) window.__totalHisConfirmed = true;
        if (Number.isFinite(+d.totalUsers)) window.__usersConfirmed = true;
        updateStatsUI();
        const pill = document.getElementById('globalPill');
        if (pill) {
          const fmt = (n)=> Number.isFinite(+n) ? Number(n).toLocaleString() : '—';
          pill.textContent = `Global: ${fmt(d.totalHis)} hi-5s • ${fmt(d.waves)} waves`;
        }
      });
    } catch (e) { console.warn('Live stats wiring optional:', e); }

    // Open contextual surfaces via URL param (e.g., ?open=hiffirmations)
    try {
      const openParam = new URLSearchParams(location.search).get('open');
      if (openParam === 'hiffirmations') {
        setTimeout(() => { try { showHiffirmationsModal(); } catch(e){ console.warn('Hiffirmations modal unavailable:', e); } }, 100);
      }
    } catch(e) { console.warn('Open-param handler failed:', e); }

    // Auth/Admin QA instrumentation (activated via ?authdebug=1) lightweight mirror of mission control overlay
    try {
      const qp = new URLSearchParams(location.search);
      if (qp.get('authdebug') === '1' && !window.__DASHBOARD_AUTH_QA__){
        window.__DASHBOARD_AUTH_QA__ = true;
        const panel = document.createElement('div');
        panel.style.cssText='position:fixed;top:10px;right:10px;width:300px;max-height:50vh;display:flex;flex-direction:column;z-index:99999;font-size:10px;font-family:Menlo,monospace;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;box-shadow:0 6px 20px -4px rgba(0,0,0,.55);overflow:hidden;';
        panel.innerHTML = '<div style="padding:6px 8px;background:#1e293b;font-weight:600;display:flex;justify-content:space-between;align-items:center;">Dash Auth QA <button id="dashAuthClose" style="background:#dc2626;border:none;color:#fff;padding:2px 6px;border-radius:6px;font-size:10px;cursor:pointer;font-weight:600;">×</button></div>';
        const body = document.createElement('pre'); body.style.cssText='margin:0;padding:6px 8px;overflow:auto;flex:1;white-space:pre-wrap;'; panel.appendChild(body); document.body.appendChild(panel);
        const logs=[]; const add=(t,m,extra)=>{ logs.push(`[${new Date().toISOString()}] ${t}: ${m}${extra?` | ${extra}`:''}`); while(logs.length>120) logs.shift(); body.textContent = logs.join('\n'); };
        document.getElementById('dashAuthClose').onclick = ()=> panel.remove();
        window.addEventListener('hi:auth-ready', ()=> add('event','hi:auth-ready'));
        window.addEventListener('hi:admin-state-changed', e=> add('event','admin-state-changed', JSON.stringify(e.detail)));
        window.addEventListener('hi:admin-confirmed', e=> add('event','admin-confirmed', JSON.stringify({ user: e.detail?.user?.id })));
        try { const st = window.AdminAccessManager?.getState?.(); add('snapshot','initial-admin', JSON.stringify(st)); } catch{}
        try { const client = window.HiSupabase?.getClient?.() || window.supabase; client?.auth?.getSession().then(({ data })=> add('snapshot','supabase-session', JSON.stringify({ user:data?.session?.user?.id }))); } catch{}
      }
    } catch{}
  });

  async function loadCurrentStatsFromDatabase(){ 
    console.log('🔄 Background loading real stats from database...');
    
    // 🚀 FAST PATH: Check cache first for instant display
    if (window.NavCache) {
      const cachedStats = window.NavCache.getStats();
      if (cachedStats && !window._statsDisplayedFromCache) {
        console.log('🚀 [INSTANT LOAD] Using cached stats for instant display:', cachedStats);
        
        // Display cached values immediately
        if (cachedStats.hi_waves != null) {
          window.gWaves = cachedStats.hi_waves;
          window.__wavesConfirmed = true;
        }
        if (cachedStats.total_his != null) {
          window.gTotalHis = cachedStats.total_his;
          window._gTotalHisIsTemporary = false;
        }
        if (cachedStats.total_users != null) {
          window.gUsers = cachedStats.total_users;
          window.__usersConfirmed = true;
        }
        
        updateStatsUI();
        window._statsDisplayedFromCache = true;
        
        // Continue to background refresh if cache needs refresh
        if (cachedStats.needsRefresh) {
          console.log('🔄 Cache expired, refreshing in background...');
        } else {
          console.log('✅ Cache fresh, no refresh needed');
          return; // Skip database query if cache is fresh
        }
      }
    }
    
    // 🎯 SURGICAL FIX: Dedupe guard to prevent concurrent refreshes
    if (window.__statsRefreshInProgress) {
      console.log('⏭️ Stats refresh already in progress, skipping');
      return;
    }
    
    window.__statsRefreshInProgress = true;
    
    setTimeout(async ()=>{ 
      try { 
        let supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.() || window.supabase; 
        if(!supabase){ 
          for(let i=0;i<5;i++){ 
            await new Promise(r=>setTimeout(r,100)); 
            supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.() || window.supabase; 
            if(supabase) break; 
          } 
        } 
        if(!supabase){ 
          console.log('No Supabase client available'); 
          window.__statsRefreshInProgress = false;
          return; 
        } 
        
        let realStatsLoaded=false; 
        try { 
          if(window.loadEnhancedGlobalStats){ 
            await window.loadEnhancedGlobalStats(); 
            realStatsLoaded=true; 
          } else { 
            // 🎯 CRITICAL FIX: Only read from global_stats (single source of truth)
            // REMOVED: public_shares fallback that was causing stat drift
            const { data, error } = await supabase.from('global_stats').select('total_his, hi_waves, total_users').single(); 
            if(data && !error){ 
              // 🔬 SURGICAL FIX: Database is ALWAYS source of truth - NEVER use Math.max() or compare with cache
              // Direct assignment prevents stat creep on page navigation
              if (data.total_his != null){
                window.gTotalHis = data.total_his;
                window._gTotalHisIsTemporary = false;
              }
              if (data.hi_waves != null){
                window.gWaves = data.hi_waves;  // ✅ FIXED: Direct assignment, no Math.max()
                window.__wavesConfirmed = true;
              }
              if (data.total_users != null){
                window.gUsers = data.total_users;
                window.__usersConfirmed = true;
              }
              
              // 🚀 CACHE: Update NavigationStateCache with fresh database values
              if (window.NavCache) {
                window.NavCache.setStats({
                  hi_waves: window.gWaves,
                  total_his: window.gTotalHis,
                  total_users: window.gUsers
                });
                console.log('✅ Stats cached for next navigation');
              }
              
              // 🔧 FIX: Use unified cache keys (matching UnifiedStatsLoader.js)
              localStorage.setItem('globalHiWaves', String(window.gWaves));
              localStorage.setItem('globalTotalHis', String(window.gTotalHis));
              localStorage.setItem('globalTotalUsers', String(window.gUsers));
              localStorage.setItem('globalHiWaves_time', String(Date.now()));
              updateStatsUI(); 
              realStatsLoaded=true; 
            } 
          } 
        } catch(e){ 
          console.log('Enhanced stats loading failed', e); 
        }
        
        // 🎯 REMOVED: public_shares.total_his fallback (was causing drift)
        // Database value from global_stats is the ONLY source of truth
        
        if(!realStatsLoaded){ 
          console.log('Real stats unavailable, using cached/shimmer values'); 
        }
        
        if(window.hiWavesRealtime){ 
          setTimeout(async ()=>{ 
            const success = await window.hiWavesRealtime.initialize(); 
            if(success){ 
              window.hiWavesRealtime.startRealTimeUpdates(3000); 
            } 
          },2000); 
        }
      } catch(e){ 
        console.log('Background stats loading failed:', e); 
      } finally {
        window.__statsRefreshInProgress = false;
      }
    },100); 
  }

  // Expose shared refresh function globally for other modules (e.g., HiShareSheet)
  window.loadCurrentStatsFromDatabase = loadCurrentStatsFromDatabase;

  // Refresh on page visibility/pageshow (handles BFCache returns)
  // 🎯 SURGICAL FIX: Smart refresh with time-based guards
  (function(){
    let lastFetchAt = 0;
    let lastVisibilityChange = 0;
    const MIN_FETCH_INTERVAL = 5000; // 5s guard (increased from 3s)
    const MIN_AWAY_TIME = 30000; // Only refresh if away >30s
    
    function safeRefresh(){
      const now = Date.now();
      
      // Guard: prevent bursts
      if (now - lastFetchAt < MIN_FETCH_INTERVAL) { 
        console.log('⏭️ Skipping refresh (too soon - last refresh', Math.round((now - lastFetchAt)/1000), 's ago)');
        updateGlobalStats(); // Just update UI from cached values
        return; 
      }
      
      // Guard: only refresh if page was hidden for significant time
      if (lastVisibilityChange > 0 && (now - lastVisibilityChange) < MIN_AWAY_TIME) {
        console.log('⏭️ Skipping refresh (quick tab switch -', Math.round((now - lastVisibilityChange)/1000), 's away)');
        updateGlobalStats();
        return;
      }
      
      lastFetchAt = now;
      console.log('✅ Refreshing stats (away for', Math.round((now - lastVisibilityChange)/1000), 's)');
      try { 
        updateGlobalStats(); 
        loadCurrentStatsFromDatabase(); 
      } catch(e){ 
        console.warn('Stats refresh failed:', e); 
      }
    }
    
    // Track when page becomes hidden
    window.addEventListener('visibilitychange', () => { 
      if (document.visibilityState === 'hidden') {
        lastVisibilityChange = Date.now();
        console.log('📴 Page hidden at', new Date().toLocaleTimeString());
      } else if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible at', new Date().toLocaleTimeString());
        safeRefresh(); 
      }
    });
    
    window.addEventListener('pageshow', async (e) => { 
      if (e.persisted) {
        console.log('🔄 Page restored from BFCache - reinitializing auth and UI');
        
        // ✅ ARCHITECTURAL FIX: Let universal-tier-listener.js handle tier display
        // It listens to AuthReady's hi:auth-ready event and updates pill correctly
        // No need for duplicate tier update logic here
        
        // Refresh stats
        safeRefresh();
      } else if (document.visibilityState === 'visible') {
        safeRefresh(); 
      }
    });
  })();

  function updateStatsUI(){
    const globalTotalHis = document.getElementById('globalTotalHis');
    const globalHiWaves = document.getElementById('globalHiWaves')||document.getElementById('globalWaves')||document.getElementById('global-waves')||document.querySelector('[data-stat="waves"]')||document.querySelector('.global-waves');
    const globalUsers    = document.getElementById('globalUsers')||document.getElementById('globalMembers')||document.querySelector('[data-stat="users"]');

    const writeStat = (el, val, isTemporary) => {
      if (!el) return;
      if (val == null) {
        if (!/(\.{3}|shimmer)/.test(el.textContent||'')) el.innerHTML = '<span class="loading-shimmer">...</span>';
        return;
      }
      const n = Number(val);
      if (!Number.isFinite(n)) return;
      if ((n === 0 || n < 1) && isTemporary){
        if (!/(\.{3}|shimmer)/.test(el.textContent||'')) el.innerHTML = '<span class="loading-shimmer">...</span>';
        return;
      }
      const formatted = n.toLocaleString();
      if (el.textContent !== formatted) el.textContent = formatted;
    };

    writeStat(globalTotalHis, window.gTotalHis, window._gTotalHisIsTemporary === true);
    writeStat(globalHiWaves, window.gWaves, window.__wavesConfirmed !== true);
    writeStat(globalUsers, window.gUsers, window.__usersConfirmed !== true);

    document.querySelectorAll('.total-his-count, .global-total-his').forEach(el=>{
      writeStat(el, window.gTotalHis, window._gTotalHisIsTemporary === true);
    });
    document.querySelectorAll('.waves-count, .global-waves-count').forEach(el=>{
      writeStat(el, window.gWaves, window.__wavesConfirmed !== true);
    });
  }

  window.metricsDebug = { gWaves:()=>window.gWaves, gTotalHis:()=>window.gTotalHis, gUsers:()=>window.gUsers, incrementHiWave, updateGlobalStats, loadCurrentStats: loadCurrentStatsFromDatabase };
})();
