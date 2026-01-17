// Dashboard Module Boot: extracted from hi-dashboard.html (CSP externalization)
// Hi Components: HiShareSheet + HiMedallion (Tesla-grade initialization)
// v1.1.0: Added HiMedallionMenu, HiPointsAnimation, HiToast for enhanced medallion UX
import { HiShareSheet } from '../../ui/HiShareSheet/HiShareSheet.js';
import { mountHiMedallion } from '../../ui/HiMedallion/HiMedallion.js';

// v1.1.0: Dynamic imports for new components (lazy load)
let HiMedallionMenu = null;
let HiPointsAnimation = null;
let HiToast = null;

async function loadV110Components() {
  try {
    const [menuModule, animModule, toastModule] = await Promise.all([
      import('../../ui/HiMedallionMenu/HiMedallionMenu.js'),
      import('../../ui/HiPointsAnimation/HiPointsAnimation.js'),
      import('../../ui/HiToast/HiToast.js')
    ]);
    HiMedallionMenu = menuModule.HiMedallionMenu;
    HiPointsAnimation = animModule.HiPointsAnimation;
    HiToast = toastModule.HiToast;
    console.log('✅ [v1.1.0] New components loaded');
  } catch (err) {
    console.warn('⚠️ [v1.1.0] Components load failed (non-critical):', err);
  }
}

// 🎯 WOZ FIX: Prevent duplicate initialization (event listener stacking)
let dashboardInitialized = false;

// Tesla-grade component initialization with guards
async function initializeDashboard() {
  // 🚀 IDEMPOTENCY: Skip full init if already done, just refresh state
  if (dashboardInitialized) {
    console.log('♻️ Dashboard already initialized - refreshing state only...');
    await refreshDashboardState();
    return;
  }
  
  // 🏆 WOZ FIX: Initialize ProfileManager first
  if (window.ProfileManager && !window.ProfileManager.isReady()) {
    console.log('🏆 [Module] Initializing ProfileManager...');
    await window.ProfileManager.init();
    console.log('✅ [Module] ProfileManager ready');
  }
  
  // ❌ REMOVED: Tier display now handled ONLY by authready-listener.js
  // Previous duplicate updateBrandTierDisplay() caused race condition:
  // 1. authready-listener.js set correct tier → "Hi Pathfinder"
  // 2. dashboard-main.mjs fired later with no data → defaulted to "anonymous" → overwrote with "Hi Friend"
  
  if (!window.__hiComponentsInitialized) window.__hiComponentsInitialized = {};

  if (!window.__hiComponentsInitialized.shareSheet) {
    const shareSheet = new HiShareSheet({ 
      origin: 'dashboard',
      onSuccess: async (shareData) => {
        const submissionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        console.log('✅ Dashboard share success handler called:', { submissionId, shareData });
        if (shareData.type === 'Hi5') {
          console.log('🎯 Incrementing Hi5 counter for submission:', submissionId);
          try { await (window.incrementHi5Counter ? window.incrementHi5Counter() : (async ()=>{})()); } catch {}
          console.log('✅ Hi5 counter incremented for submission:', submissionId);
        }
        if (window.loadRealUserCount) {
          setTimeout(window.loadRealUserCount, 1000);
        }
        if (window.trackShareSubmission) {
          window.trackShareSubmission('hi-dashboard', {
            submissionType: shareData.privacy || 'public',
            pageOrigin: 'hi-dashboard',
            origin: 'hi-dashboard',
            tag: shareData.type === 'Hi5' ? 'Hi5️⃣' : 'Hi Dashboard',
            timestamp: Date.now()
          });
        }
        try {
          const { trackEvent } = await import('./lib/monitoring/HiMonitor.js');
          trackEvent('share_submit', {
            visibility: shareData.visibility || shareData.privacy,
            type: shareData.type || 'standard',
            origin: 'dashboard'
          });
        } catch (err) { console.log('Analytics tracking failed:', err); }
      }
    });
    shareSheet.init();
    window.__hiComponentsInitialized.shareSheet = true;
    window.__hiComponentsInitialized.shareSheetInstance = shareSheet;
  }

  // Mirror Island: subtle "Try it — nothing is saved" link wiring
  function initializeDashTryItLink() {
    const tryLink = document.getElementById('tryHiDashLink');
    if (!tryLink) return;
    tryLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.openPracticeShare) {
        window.openPracticeShare('hi-dashboard', { context: 'dashboard' });
      } else {
        const instance = window.__hiComponentsInitialized?.shareSheetInstance;
        if (instance && typeof instance.open === 'function') {
          instance.practiceMode = true;
          instance.open({ context: 'dashboard' });
        }
      }
    });
  }

  // Post-auth pending action
  const pendingAction = localStorage.getItem('pendingDashboardAction');
  if (pendingAction) {
    try {
      const actionData = JSON.parse(pendingAction);
      console.log('🔄 Processing pending dashboard action after auth:', actionData);
      localStorage.removeItem('pendingDashboardAction');
      if (actionData.action === 'hi5-share' && actionData.context === 'dashboard') {
        setTimeout(() => {
          const shareSheetInstance = window.__hiComponentsInitialized?.shareSheetInstance;
          if (shareSheetInstance) {
            shareSheetInstance.open({ context: 'dashboard', preset: 'hi5', prefilledText: '✨ Celebrating this moment of growth! ', type: 'Hi5' });
            console.log('✅ Auto-opened Hi5 share sheet after auth');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Failed to process pending dashboard action:', error);
      localStorage.removeItem('pendingDashboardAction');
    }
  }

  // Long-Press Hi 5 System
  // v1.1.0: Updated to 800ms threshold and new menu
  function setupMedallionLongPress(medallionElement) {
    if (!medallionElement || medallionElement.__longPressSetup) return;
    medallionElement.__longPressSetup = true;
    let longPressTimer = null; let rafId = null; let startTime = 0; let startX=0; let startY=0;
    let longPressCompleted = false; // 🛑 WOZ: Track if long-press completed
    const LONG_PRESS_DURATION = 800; // v1.1.0: Reduced to 800ms for better UX
    const MOVE_TOLERANCE = 12; // px
    function loop(){
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed/LONG_PRESS_DURATION)*360, 360);
      medallionElement.style.setProperty('--progress', `${progress}deg`);
      if (progress >= 360){ completeLongPress(); return; }
      rafId = requestAnimationFrame(loop);
    }
    function startLongPress(e){
      longPressCompleted = false; // 🛑 WOZ: Reset flag
      e.preventDefault();
      const pt = (e.touches && e.touches[0]) || e;
      startX = pt.clientX || 0; startY = pt.clientY || 0;
      startTime=Date.now();
      medallionElement.classList.add('long-press-active','long-press-filling');
      try{ navigator?.vibrate?.(20);}catch{}
      rafId = requestAnimationFrame(loop);
      longPressTimer=setTimeout(()=>{ completeLongPress(); }, LONG_PRESS_DURATION+50);
    }
    function movedTooFar(e){
      const pt = (e.touches && e.touches[0]) || e; if (!pt) return false;
      const dx = (pt.clientX||0) - startX; const dy = (pt.clientY||0) - startY;
      return (dx*dx + dy*dy) > (MOVE_TOLERANCE*MOVE_TOLERANCE);
    }
    function cancelLongPress(){ longPressCompleted = false; if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } if(rafId){ cancelAnimationFrame(rafId); rafId=null; } medallionElement.classList.remove('long-press-active','long-press-filling','long-press-complete'); medallionElement.style.removeProperty('--progress'); }
    function completeLongPress(){ 
      longPressCompleted = true; // 🛑 WOZ: Mark as completed
      cancelLongPress(); 
      medallionElement.classList.add('long-press-complete'); 
      try{ navigator?.vibrate?.(100);}catch{} 
      console.log('🎯 Long-press completed - opening medallion menu'); 
      
      // v1.1.0: Open medallion menu instead of Hi5 flow
      if (HiMedallionMenu?.open) {
        HiMedallionMenu.open({ anchor: medallionElement });
      } else if (window.HiMedallionMenu?.open) {
        window.HiMedallionMenu.open({ anchor: medallionElement });
      } else {
        // Fallback to old Hi5 behavior
        triggerHi5Flow();
      }
      
      setTimeout(()=>{ medallionElement.classList.remove('long-press-complete'); longPressCompleted = false; }, 500); 
    }
    
    // 🛑 WOZ FIX: Block click events if long-press completed to prevent double-fire
    medallionElement.addEventListener('click', (e) => {
      if (longPressCompleted) {
        console.log('🚫 Blocking click after long-press completion');
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, { capture: true }); // Use capture phase to intercept BEFORE other listeners
    
    medallionElement.addEventListener('touchstart', startLongPress, { passive:false });
    medallionElement.addEventListener('mousedown', startLongPress);
    medallionElement.addEventListener('touchend', cancelLongPress);
    medallionElement.addEventListener('touchmove', (e)=>{ if (movedTooFar(e)) cancelLongPress(); });
    medallionElement.addEventListener('mouseup', cancelLongPress);
    medallionElement.addEventListener('mouseleave', cancelLongPress);
    console.log('🏗️ Long-press system initialized for medallion');
  }

  async function triggerHi5Flow(){
    // 🏆 GOLD STANDARD: Check authentication FIRST, not tier
    // Root cause: Tier data might not be loaded yet (race condition)
    // Fix: If user is authenticated (has session), allow share sheet
    // Tier quotas are checked INSIDE the share sheet itself
    
    let isAuthenticated = false;
    let userId = null;
    
    try {
      // Method 1: Check ProfileManager (fastest, most reliable)
      if (window.ProfileManager?.isAuthenticated?.()) {
        isAuthenticated = true;
        userId = window.ProfileManager.getUserId();
        console.log('✅ [Share Access] Authenticated via ProfileManager:', userId);
      } 
      // Method 2: Check Supabase session directly
      else {
        const client = window.hiSupabase || window.supabaseClient || window.sb;
        if (client?.auth?.getSession) {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            isAuthenticated = true;
            userId = session.user.id;
            console.log('✅ [Share Access] Authenticated via Supabase session:', userId);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Error checking auth status:', err);
      isAuthenticated = false;
    }
    
    console.log('🔍 [Share Access] Final auth check:', { isAuthenticated, userId });
    
    if (!isAuthenticated) {
      console.log('🔒 Anonymous user long-press - showing auth modal');
      if (window.showShareAuthModal) {
        window.showShareAuthModal('hi-dashboard', {
          title: 'Join Hi Community for Self Hi 5',
          benefits: [
            '✨ Celebrate achievements that matter to you',
            '📊 Track your personal empowerment journey',
            '🎯 Share meaningful moments with the community'
          ],
          trigger: 'medallion-long-press',
          cta: 'Start Your Hi 5 Journey'
        });
      } else if (window.showAuthModal) {
        window.showAuthModal('hi-dashboard');
      } else {
        console.warn('⚠️ No auth modals available');
        window.location.href = '/welcome.html';
      }
    } else {
      console.log('✅ Authenticated user - opening share sheet');
      
      // 🛑 WOZ FIX: Wait for share sheet to be ready if not initialized yet
      const openShareSheet = () => {
        const shareSheetInstance = window.__hiComponentsInitialized?.shareSheetInstance;
        if (shareSheetInstance && typeof shareSheetInstance.open === 'function') {
          console.log('🎯 Opening share sheet for Hi 5 flow');
          shareSheetInstance.open({ 
            context: 'dashboard', 
            preset: 'hi5', 
            prefilledText: '✨ Celebrating this moment of growth! ',
            type: 'Hi5' 
          });
          return true;
        } else if (window.openHiShareSheet) {
          console.log('🎯 Opening share sheet via global function');
          window.openHiShareSheet('hi5', { 
            context: 'dashboard',
            prefilledText: '✨ Celebrating this moment of growth! ',
            type: 'Hi5' 
          });
          return true;
        }
        return false;
      };
      
      // Try immediately
      if (!openShareSheet()) {
        console.log('⏳ Share sheet not ready, waiting...');
        // Wait up to 2 seconds for share sheet to initialize
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (openShareSheet()) {
            clearInterval(checkInterval);
            console.log(`✅ Share sheet opened after ${attempts} attempts`);
          } else if (attempts >= 20) {
            clearInterval(checkInterval);
            console.warn('⚠️ Share sheet initialization timeout');
          }
        }, 100);
      }
    }
  }

  // v1.1.0: Handle daily check-in on medallion tap
  async function handleMedallionCheckIn(medallionElement) {
    try {
      // Only for authenticated users
      let userId = null;
      if (window.HiSupabase?.getClient) {
        const { data: { user } } = await window.HiSupabase.getClient().auth.getUser();
        userId = user?.id;
      }
      
      if (!userId) {
        console.log('[v1.1.0] Skipping check-in for anonymous user');
        return;
      }

      // Try to award daily check-in (RPC handles once-per-day logic)
      const supabase = window.HiSupabase.getClient();
      const { data, error } = await supabase.rpc('award_daily_checkin');
      
      if (error) {
        console.warn('[v1.1.0] Check-in RPC error:', error.message);
        return;
      }

      if (data?.awarded) {
        console.log('🎉 [v1.1.0] Daily check-in awarded:', data.points, 'pts');
        
        // Show floating +5 animation
        if (HiPointsAnimation?.checkin) {
          HiPointsAnimation.checkin(medallionElement);
        } else if (window.HiPointsAnimation?.checkin) {
          window.HiPointsAnimation.checkin(medallionElement);
        }

        // Show toast notification
        if (HiToast?.checkin) {
          HiToast.checkin();
        } else if (window.HiToast?.checkin) {
          window.HiToast.checkin();
        }

        // Fire points event
        window.dispatchEvent(new CustomEvent('hi:points-earned', { 
          detail: { points: data.points, source: 'checkin', balance: data.balance }
        }));
      } else if (data?.reason === 'already_checked_in') {
        console.log('[v1.1.0] Already checked in today');
      } else {
        console.log('[v1.1.0] Check-in result:', data);
      }
    } catch (err) {
      // Don't block UX on check-in errors
      if (err.name === 'AbortError') return;
      console.warn('[v1.1.0] Check-in error (non-critical):', err.message);
    }
  }

  // Mount HiMedallion with tap tracking
  // v1.1.0: Added daily check-in + points animation
  const medallionContainer = document.getElementById('hiMedallionContainer');
  if (medallionContainer) {
    // Load v1.1.0 components before mounting
    loadV110Components().then(() => {
      import('../../ui/HiMedallion/HiMedallion.js').then(({ mountHiMedallion }) => {
        const medallionElement = medallionContainer.querySelector('#hiMedallion');
        if (medallionElement) {
          mountHiMedallion(medallionElement, {
            origin: 'dashboard',
            ariaLabel: 'Tap to say hi and spread positivity',
            onTap: async () => {
              console.log('🏅 Medallion tapped - tracking wave...');
              if (window.gWaves === undefined) window.gWaves = 0;
              window.gWaves += 1;
              requestAnimationFrame(() => {
                const globalHiWavesEl = document.getElementById('globalHiWaves');
                if (globalHiWavesEl) {
                  globalHiWavesEl.textContent = window.gWaves.toLocaleString();
                  globalHiWavesEl.classList.remove('burst');
                  requestAnimationFrame(() => {
                    globalHiWavesEl.classList.add('burst');
                    setTimeout(() => { requestAnimationFrame(() => { globalHiWavesEl.classList.remove('burst'); }); }, 500);
                  });
                }
              });
              if (window.updateGlobalStats) window.updateGlobalStats();
              
              // v1.1.0: Check-in + Points on first tap of the day
              await handleMedallionCheckIn(medallionElement);
            
            // 🎯 Gold Standard: Track both global + personal medallion taps
            (async () => {
              try {
                // Get authenticated user ID
                let userId = null;
                if (window.HiSupabase?.getClient) {
                  const userData = await window.HiAbortUtils.ignoreAbort(window.HiSupabase.getClient().auth.getUser());
                  if (userData === null) return; // Aborted
                  userId = userData.data?.user?.id;
                }
                
                // Use HiBase.stats.insertMedallionTap for unified tracking
                if (window.HiBase?.stats?.insertMedallionTap) {
                  const result = await window.HiBase.stats.insertMedallionTap(userId);
                  if (result.error) {
                    console.error('❌ Medallion tap tracking failed:', result.error);
                  } else {
                    const { globalWaves, personalTaps } = result.data;
                    console.log('✅ Medallion tap tracked:', { globalWaves, personalTaps });
                    
                    // Update global counter UI
                    window.gWaves = globalWaves;
                    localStorage.setItem('dashboard_waves_cache', String(window.gWaves));
                    localStorage.setItem('dashboard_waves_cache_time', String(Date.now()));
                    if (window.hiWavesRealtime) window.hiWavesRealtime.updateWavesUI(window.gWaves);
                    const el = document.getElementById('globalHiWaves');
                    if (el) el.textContent = window.gWaves.toLocaleString();
                  }
                } else {
                  console.warn('⚠️ HiBase.stats not available, using legacy increment_hi_wave');
                  // Fallback to old method if HiBase not loaded
                  const supabaseClient = window.hiSupabase || window.supabaseClient || window.__HI_SUPABASE_CLIENT;
                  if (supabaseClient) {
                    const { data, error } = await supabaseClient.rpc('increment_hi_wave');
                    if (!error && typeof data === 'number') {
                      window.gWaves = data;
                      localStorage.setItem('dashboard_waves_cache', String(window.gWaves));
                      localStorage.setItem('dashboard_waves_cache_time', String(Date.now()));
                      if (window.hiWavesRealtime) window.hiWavesRealtime.updateWavesUI(window.gWaves);
                      const el = document.getElementById('globalHiWaves');
                      if (el) el.textContent = window.gWaves.toLocaleString();
                    }
                  }
                }
              } catch (error) {
                // AbortError is EXPECTED in MPA - silently ignore
                if (error.name === 'AbortError' || error.message?.includes('aborted')) return;
                console.error('❌ Medallion tap error:', error);
              }
            })();
            
            // Gold Standard: Update streak (unified self-Hi tracking)
            (async () => {
              try {
                // Get user ID directly from Supabase session (same as Hi Gym pattern)
                let userId = null;
                if (window.HiSupabase?.getClient) {
                  const { data: { user } } = await window.HiSupabase.getClient().auth.getUser();
                  userId = user?.id;
                }
                
                if (userId && userId !== 'anonymous' && window.HiBase?.updateStreak) {
                  await window.HiBase.updateStreak(userId);
                  console.log('🔥 Streak updated from medallion tap');
                  
                  // Refresh calendar/streak displays
                  if (window.hiCalendarInstance) {
                    setTimeout(() => {
                      window.hiCalendarInstance.loadHiMoments();
                      window.hiCalendarInstance.loadRemoteStreaks();
                    }, 300);
                  }
                }
              } catch (streakErr) {
                // AbortError is EXPECTED in MPA - silently ignore
                if (streakErr.name === 'AbortError' || streakErr.message?.includes('aborted')) return;
                console.warn('⚠️ Streak update skipped:', streakErr);
              }
            })();
          }
        });
        console.log('🎯 Tesla-grade HiMedallion mounted on dashboard with tap tracking');
        setupMedallionLongPress(medallionElement);
      }
    }).catch(error => console.error('❌ Failed to load HiMedallion:', error));
    }).catch(error => console.error('❌ Failed to load v1.1.0 components:', error));
  }

  // Initialize the Try link after DOM is ready
  initializeDashTryItLink();
  
  // Mark as initialized to prevent duplicate event listeners on BFCache restore
  dashboardInitialized = true;
}

// 🎯 STATE REFRESH: Reload dynamic content without re-initializing components
async function refreshDashboardState() {
  // ProfileManager.init() has built-in guard (_initialized check)
  if (window.ProfileManager) {
    try {
      await window.ProfileManager.init();
      console.log('✅ Profile state refreshed on BFCache restore');
    } catch (err) {
      console.warn('⚠️ Profile refresh failed:', err);
    }
  }
  
  console.log('♻️ Dashboard state refreshed');
}

// Run on initial load
document.addEventListener('DOMContentLoaded', initializeDashboard);

// 🎯 BFCache: Re-dispatch hi:auth-ready when page restored from cache
window.addEventListener('pageshow', async (e) => {
  console.log('📍 PAGESHOW EVENT (Dashboard):', { persisted: e.persisted });
  
  if (e.persisted) {
    console.log('🔄 BFCache restore detected on Dashboard');
    
    // Re-dispatch hi:auth-ready to refresh tier and all dependent systems
    if (window.ProfileManager && window.ProfileManager.getProfile()) {
      const profile = window.ProfileManager.getProfile();
      const userId = window.ProfileManager.getUserId();
      console.log('🔄 Re-dispatching hi:auth-ready from BFCache restore');
      window.dispatchEvent(new CustomEvent('hi:auth-ready', {
        detail: {
          userId: userId,
          authenticated: !!userId,
          profile: profile,
          fromBFCache: true
        }
      }));
    }
  }
});

/* Cache bust 1765736732 */
