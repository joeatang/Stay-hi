// AuthReady - Unified session + membership orchestrator
// HI-OS: Emits 'hi:auth-ready' once with { session, membership }
import { getHiSupabase } from './HiSupabase.v3.js';

let _ready = false;
let _emitted = false;
let _result = null;

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function salvageTokens(sb){
  const access = localStorage.getItem('sb-access-token');
  const refresh = localStorage.getItem('sb-refresh-token');
  if (access && refresh) {
    try {
      const { data, error } = await sb.auth.setSession({ access_token: access, refresh_token: refresh });
      if (error) console.warn('[AuthReady] setSession error', error);
      else console.log('[AuthReady] session salvaged');
    } catch(e){ console.warn('[AuthReady] salvage exception', e); }
  }
}

async function fetchMembership(sb){
  try {
    // 🔥 FIX: Add 3-second timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Membership timeout')), 3000)
    );
    
    const membershipPromise = sb.rpc('get_unified_membership');
    
    const { data, error } = await Promise.race([membershipPromise, timeoutPromise]);
    
    if (error) { console.warn('[AuthReady] membership error', error); return null; }
    if (data) {
      try {
        localStorage.setItem('hi_membership_tier', data.tier || '');
        localStorage.setItem('hi_membership_is_admin', data.is_admin ? '1':'0');
      } catch(_){}
    }
    return data;
  } catch(e){ 
    console.warn('[AuthReady] membership exception (timeout or error)', e); 
    return null; 
  }
}

async function initialize(){
  if (_ready) return _result;
  const sb = getHiSupabase();

  // 🔥 FIX: Add 5-second timeout to entire auth check
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
    );
    
    const authPromise = (async () => {
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        await salvageTokens(sb);
        ({ data: { session } } = await sb.auth.getSession());
      }

      // If still no session, we continue but membership will be null
      const membership = session ? await fetchMembership(sb) : null;
      
      return { session, membership };
    })();
    
    _result = await Promise.race([authPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[AuthReady] Timeout or error - continuing as anonymous', error);
    // Timeout or error - continue as anonymous user
    _result = { session: null, membership: null };
  }

  _ready = true;
  
  // CRITICAL FIX: Set window.__hiMembership for HiTier.js to read
  if (_result.membership) {
    window.__hiMembership = _result.membership;
  }
  
  if (!_emitted) {
    // 🔥 CRITICAL: Store auth data for late listeners (prevents race condition)
    window.__hiAuthReady = _result;
    
    window.dispatchEvent(new CustomEvent('hi:auth-ready', { detail: _result }));
    console.log('[AuthReady] ready', { user: _result.session?.user?.id, tier: _result.membership?.tier, admin: _result.membership?.is_admin });
    _emitted = true;
    
    // CRITICAL FIX: Trigger membership-changed event for HiTier.js to refresh
    if (_result.membership) {
      window.dispatchEvent(new CustomEvent('hi:membership-changed', { detail: _result.membership }));
    }
  }
  return _result;
}

// Kick off immediately (non-blocking)
initialize();

export async function waitAuthReady(){
  if (_ready) return _result;
  while(!_ready){ await wait(50); }
  return _result;
}

export function getAuthState(){ return _result; }
export function isAuthReady(){ return _ready; } // 🔥 NEW: Check if auth initialization complete

// 🔥 CRITICAL: Expose to window for ProfileManager to use
window.waitAuthReady = waitAuthReady;
window.getAuthState = getAuthState;
window.isAuthReady = isAuthReady; // Expose ready check

// 🚀 WOZ FIX: Restore session when app returns from background
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    console.log('[AuthReady] App returned from background - checking session...');
    try {
      const sb = getHiSupabase();
      let { data: { session } } = await sb.auth.getSession();
      
      // If no session, try to restore from localStorage
      if (!session) {
        console.warn('[AuthReady] No session found - attempting restore...');
        await salvageTokens(sb);
        ({ data: { session } } = await sb.auth.getSession());
        
        if (session) {
          console.log('[AuthReady] Session restored successfully');
          // Refresh membership
          const membership = await fetchMembership(sb);
          _result = { session, membership };
          if (membership) {
            window.__hiMembership = membership;
          }
          // 🔥 CRITICAL FIX: Re-fire hi:auth-ready so pages know auth is restored
          console.log('[AuthReady] Re-firing hi:auth-ready for page navigation after background');
          window.dispatchEvent(new CustomEvent('hi:auth-ready', { detail: _result }));
          window.dispatchEvent(new CustomEvent('hi:auth-updated', { detail: _result }));
          if (membership) {
            window.dispatchEvent(new CustomEvent('hi:membership-changed', { detail: membership }));
          }
        } else {
          console.error('[AuthReady] Failed to restore session - user may need to re-login');
        }
      } else {
        console.log('[AuthReady] Session still valid');
      }
    } catch (e) {
      console.error('[AuthReady] Session check failed:', e);
    }
  }
});

// If the Supabase client upgrades from stub->real, refresh state and notify listeners
try {
  window.addEventListener('supabase-upgraded', async ()=>{
    try {
      const sb = getHiSupabase();
      let { data: { session } } = await sb.auth.getSession();
      if (!session) { await salvageTokens(sb); ({ data: { session } } = await sb.auth.getSession()); }
      const membership = session ? await fetchMembership(sb) : null;
      const prevUser = _result?.session?.user?.id;
      const nextUser = session?.user?.id;
      const changed = (!!prevUser !== !!nextUser) || (prevUser !== nextUser) || (_result?.membership?.tier !== membership?.tier);
      _result = { session, membership };
      
      // CRITICAL FIX: Update window.__hiMembership when auth changes
      if (membership) {
        window.__hiMembership = membership;
      }
      
      if (changed) {
        window.dispatchEvent(new CustomEvent('hi:auth-updated', { detail: _result }));
        console.log('[AuthReady] updated', { user: nextUser, tier: membership?.tier, admin: membership?.is_admin });
        
        // CRITICAL FIX: Trigger membership-changed event for HiTier.js to refresh
        if (membership) {
          window.dispatchEvent(new CustomEvent('hi:membership-changed', { detail: membership }));
        }
      }
    } catch(e){ console.warn('[AuthReady] upgrade refresh failed', e); }
  });
} catch(_){}
