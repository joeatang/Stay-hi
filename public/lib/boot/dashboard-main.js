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
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g'
        );
        window.db = supabaseClient;
        window.supabase = supabaseClient;
        __dbg('✅ Supabase client initialized (dashboard)');
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
      const useHiBaseStreaks = await window.HiFlags?.getFlag('hibase_streaks_enabled');
      __dbg(`🔄 Streak loading via ${useHiBaseStreaks ? 'HiBase' : 'legacy'} path`);
      if (useHiBaseStreaks) {
        __dbg('📦 Streak → HiBase.getUserStreak...');
        const currentUser = window.hiAuth?.getCurrentUser?.() || { id: 'anonymous' };
        if (currentUser.id && currentUser.id !== 'anonymous') {
          const streakResult = await window.HiBase.getUserStreak(currentUser.id);
          if (streakResult.error) {
            console.warn('⚠️ HiBase streak loading failed:', streakResult.error);
            updateStreakDisplay(0);
          } else {
            const currentStreak = streakResult.data.streak?.current || 0;
            __dbg('✅ Streak loaded via HiBase:', currentStreak);
            updateStreakDisplay(currentStreak);
          }
        } else {
          __dbg('🔒 Anonymous user - hiding streak UI');
          hideStreakUI();
        }
        import('../monitoring/HiMonitor.js').then(m => m.trackEvent('streak_load', { source: 'dashboard', path: 'hibase' })).catch(()=>{});
      } else {
        __dbg('📦 Streak → Legacy loading...');
        const currentUser = window.hiAuth?.getCurrentUser?.() || { id: 'anonymous' };
        if (currentUser.id && currentUser.id !== 'anonymous') {
          const localStreak = localStorage.getItem('user_current_streak') || '0';
          updateStreakDisplay(parseInt(localStreak, 10));
        } else {
          __dbg('🔒 Anonymous user - hiding streak UI (legacy path)');
          hideStreakUI();
        }
        import('../monitoring/HiMonitor.js').then(m => m.trackEvent('streak_load', { source: 'dashboard', path: 'legacy' })).catch(()=>{});
      }
    } catch (error) {
      console.warn('⚠️ Streak loading failed:', error);
      updateStreakDisplay(0);
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
    const openNavigation = () => {
      navigationModal.classList.add('show'); navigationModal.style.display='block'; document.body.style.overflow='hidden';
      const dialog = navigationModal.querySelector('.navigation-content'); const closeBtn = document.getElementById('closeNavigation');
      (dialog||navigationModal).setAttribute('tabindex','-1'); setTimeout(()=>{ (closeBtn||dialog||navigationModal).focus({preventScroll:true}); },0);
      const adminSection = document.getElementById('adminSection'); if (adminSection && (localStorage.getItem('isAdmin')==='true' || window.location.href.includes('admin'))) adminSection.style.display='block';
      __dbg('🎯 Navigation menu opened');
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
    btnMenu.addEventListener('click', openNavigation);
    if (closeNavigation) closeNavigation.addEventListener('click', closeNavigationModal);
    if (navigationBackdrop) navigationBackdrop.addEventListener('click', closeNavigationModal);
    document.addEventListener('keydown', e => { if (e.key==='Escape' && navigationModal.classList.contains('show')) closeNavigationModal(); });
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

  async function setupWeeklyProgress(){ const weekStrip=document.getElementById('weekStrip'); if(!weekStrip) return; const today=new Date(); let html=''; const weeklyActivity=await getUserWeeklyActivity(); for(let i=6;i>=0;i--){ const date=new Date(today); date.setDate(today.getDate()-i); const label=date.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase(); const dayNum=date.getDate(); const isToday=i===0; const dateKey=date.toISOString().split('T')[0]; const metClass=weeklyActivity.activeDays.includes(dateKey)?'met':''; const milestoneClass=isToday && weeklyActivity.milestone?.current ? 'milestone' : ''; html+=`<div class="weekdot ${isToday?'today':''} ${milestoneClass}"><div class="lbl">${label}</div><div class="c ${metClass}">${dayNum}</div>${isToday && weeklyActivity.milestone?.current ? `<div class="milestone-badge">${weeklyActivity.milestone.current.emoji}</div>`:''}</div>`; } weekStrip.innerHTML=html; }
  async function getUserWeeklyActivity(){ try { const currentUser=window.hiAuth?.getCurrentUser?.(); if (currentUser && currentUser.id && currentUser.id!=='anonymous'){ const streakResult=await window.HiBase?.streaks?.getUserStreak?.(currentUser.id); if (streakResult?.data){ return generateWeeklyFromStreak(streakResult.data); } } return generateAnonymousWeeklyPreview(); } catch(e){ return generateAnonymousWeeklyPreview(); } }
  function generateWeeklyFromStreak(streakData){ const activeDays=[]; const today=new Date(); const currentStreak=streakData.current||0; const lastHiDate=streakData.lastHiDate; const milestoneInfo=checkStreakMilestones(currentStreak); if (lastHiDate && currentStreak>0){ const streakStart=new Date(lastHiDate); streakStart.setDate(streakStart.getDate()-currentStreak+1); for(let i=0;i<currentStreak && i<7;i++){ const activeDate=new Date(streakStart); activeDate.setDate(streakStart.getDate()+i); const daysAgo=Math.floor((today-activeDate)/(86400000)); if (daysAgo>=0 && daysAgo<=6){ activeDays.push(activeDate.toISOString().split('T')[0]); } } } return { activeDays, source:'real_streak', milestone: milestoneInfo }; }
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
  function generateAnonymousWeeklyPreview(){ const activeDays=[]; const today=new Date(); const recentDays=Math.floor(Math.random()*2)+2; for(let i=0;i<recentDays;i++){ const d=new Date(today); d.setDate(today.getDate()-i); activeDays.push(d.toISOString().split('T')[0]); } return { activeDays, source:'preview' }; }

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

    try { const currentPage={ url:location.href, name:'Dashboard', timestamp:Date.now() }; const navHistory=JSON.parse(sessionStorage.getItem('hiNavHistory')||'[]'); const filtered=navHistory.filter(p=>p.url!==currentPage.url); filtered.unshift(currentPage); filtered.splice(10); sessionStorage.setItem('hiNavHistory', JSON.stringify(filtered)); } catch{}
    setupNavigationHandler();
    initializeDatabase();
    setupHiffirmationsHandler();
    setupFloatingHiffirmationsHandler();
    await setupWeeklyProgress();
    const savedWaves=localStorage.getItem('dashboard_waves_cache'); const savedTotal=localStorage.getItem('dashboard_total_cache'); const savedUsers=localStorage.getItem('dashboard_users_cache');
    if (window.gWaves===undefined){
      const cacheTime=localStorage.getItem('dashboard_waves_cache_time');
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
    if (window.gTotalHis===undefined){ window.gTotalHis = savedTotal ? parseInt(savedTotal,10) : null; window._gTotalHisIsTemporary = true; }
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
    import('../ui/stats/initHiStats.js').then(async ({ initHiStatsOnce }) => {
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
    }).catch(e=> console.error('❌ Stats initialization failed:', e));
    setTimeout(()=> updateBrandTierDisplay(),1000);
    window.addEventListener('membershipStatusChanged', ()=> updateBrandTierDisplay());
    setTimeout(()=>{ if(window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); },2500);
    setTimeout(()=>{ if(window.unifiedMembership?.membershipStatus?.tier) updateBrandTierDisplay(); },5000);
    function updateBrandTierDisplay(){ const tierIndicator=document.getElementById('hi-tier-indicator'); if(!tierIndicator) return; if(!window.HiBrandTiers) return; let tierKey='anonymous'; if (window.unifiedMembership?.membershipStatus?.tier){ tierKey=window.unifiedMembership.membershipStatus.tier; } else if (window.HiMembership?.currentUser?.tierInfo?.name){ tierKey=window.HiMembership.currentUser.tierInfo.name.toLowerCase(); } window.HiBrandTiers.updateTierPill(tierIndicator, tierKey,{ showEmoji:false, useGradient:false }); }
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

  async function loadCurrentStatsFromDatabase(){ console.log('🔄 Background loading real stats from database...'); setTimeout(async ()=>{ try { let supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.() || window.supabase; if(!supabase){ for(let i=0;i<5;i++){ await new Promise(r=>setTimeout(r,100)); supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.() || window.supabase; if(supabase) break; } } if(!supabase){ console.log('No Supabase client available'); return; } let realStatsLoaded=false; try { if(window.loadEnhancedGlobalStats){ await window.loadEnhancedGlobalStats(); realStatsLoaded=true; } else { const { data, error } = await supabase.from('global_stats').select('total_his, hi_waves, total_users').single(); if(data && !error){ const oldTotalHis = window.gTotalHis; const oldWaves = window.gWaves;
            if (data.total_his && (window._gTotalHisIsTemporary || data.total_his > window.gTotalHis)){
              window.gTotalHis=data.total_his; window._gTotalHisIsTemporary=false;
            }
            const serverWaves = Number(data.hi_waves)||0;
            // Monotonic: never drop below current UI/cached waves
            window.gWaves = Math.max(serverWaves, Number(window.gWaves)||0);
            localStorage.setItem('dashboard_waves_cache', String(window.gWaves));
            localStorage.setItem('dashboard_total_cache', String(window.gTotalHis));
            localStorage.setItem('dashboard_waves_cache_time', String(Date.now()));
            updateStatsUI(); realStatsLoaded=true; } } } catch(e){ console.log('Enhanced stats loading failed'); }
      if(!realStatsLoaded){ try { const { data:shareData, error:shareError } = await supabase.from('public_shares').select('total_his').limit(1).single(); if(shareData && !shareError && shareData.total_his){ if(window._gTotalHisIsTemporary || shareData.total_his > window.gTotalHis){ window.gTotalHis=shareData.total_his; window._gTotalHisIsTemporary=false; } updateStatsUI(); realStatsLoaded=true; } } catch(e){ console.log('public_shares query failed'); } }
      if(!realStatsLoaded){ console.log('Real stats unavailable, smart defaults used'); }
      if(window.hiWavesRealtime){ setTimeout(async ()=>{ const success = await window.hiWavesRealtime.initialize(); if(success){ window.hiWavesRealtime.startRealTimeUpdates(3000); } },2000); }
    } catch(e){ console.log('Background stats loading failed:', e); } },100); }

  // Expose shared refresh function globally for other modules (e.g., HiShareSheet)
  window.loadCurrentStatsFromDatabase = loadCurrentStatsFromDatabase;

  // Refresh on page visibility/pageshow (handles BFCache returns)
  (function(){
    let lastFetchAt = 0;
    const MIN_FETCH_INTERVAL = 3000; // 3s guard to avoid bursts
    function safeRefresh(){
      const now = Date.now();
      if (now - lastFetchAt < MIN_FETCH_INTERVAL) { updateGlobalStats(); return; }
      lastFetchAt = now;
      try { updateGlobalStats(); loadCurrentStatsFromDatabase(); } catch(e){ console.warn('Stats refresh failed:', e); }
    }
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') safeRefresh(); });
    window.addEventListener('pageshow', (e) => { if (e.persisted || document.visibilityState === 'visible') safeRefresh(); });
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

  window.metricsDebug = { gWaves:()=>gWaves, gTotalHis:()=>gTotalHis, gUsers:()=>gUsers, incrementHiWave, updateGlobalStats, loadCurrentStats: loadCurrentStatsFromDatabase };
})();
