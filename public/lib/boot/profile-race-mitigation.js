// profile-race-mitigation.js
// Purpose: Eliminate profile initialization race conditions by coordinating auth-ready
// and ensuring a single secure data load.
(function(){
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
