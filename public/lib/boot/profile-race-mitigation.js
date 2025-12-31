// profile-race-mitigation.js
// 🚫 PERMANENTLY DISABLED - profile.html inline handles auth-ready directly
// This script was causing DUPLICATE loadProfileData() calls on same auth-ready event
// Result: First call too early (ProfileManager not ready) → empty data → BLOCKED
//         Second call from profile.html works but causes flicker

// CRITICAL: profile.html line ~4205 already has auth-ready listener that:
// 1. Waits for ProfileManager to initialize
// 2. Loads from database
// 3. Calls loadProfileData with correct data
// This duplicate listener fires BEFORE ProfileManager fetches from DB

(function(){
  console.log('ℹ️ [ProfileRace] DISABLED - profile.html inline system handles auth-ready');
  // All code disabled to prevent duplicate listeners
  return;

  // 🚫 DEAD CODE BELOW - NEVER RUNS
  const MAX_WAIT_MS = 3000;
  let authReady = false;
  let fallbackTimer = null;

  function attemptLoad(reason){
    // 🔥 CRITICAL: Call the CORRECT function exposed by profile.html
    if (typeof window.__loadProfileData !== 'function') {
      console.warn('[ProfileRace] window.__loadProfileData not available');
      return;
    }
    if (window.__PROFILE_DATA_LOADED) return;
    console.log('[ProfileRace] Triggering loadProfileData ('+reason+')');
    try { 
      window.__loadProfileData(); // ← Use window namespace to avoid calling wrong function
    } catch(e){ 
      console.warn('[ProfileRace] loadProfileData error', e?.message); 
    }
  }

  // Prefer explicit auth-ready event for minimal latency
  window.addEventListener('hi:auth-ready', () => {
    authReady = true;
    attemptLoad('auth-ready');
    if (fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer=null; }
  }, { once:true });

  // Fallback: if auth-ready never fires (edge or offline), load after MAX_WAIT_MS
  fallbackTimer = setTimeout(()=>{
    if (!authReady){ attemptLoad('fallback-timeout'); }
  }, MAX_WAIT_MS);

  // In case DOMContentLoaded happened before this script and load already executed
  if (window.__PROFILE_DATA_LOADED){ console.log('[ProfileRace] Already loaded before mitigation script.'); }
})();
