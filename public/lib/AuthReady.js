// AuthReady - Unified session + membership orchestrator
// HI-OS: Emits 'hi:auth-ready' once with { session, membership }
import { getHiSupabase } from './HiSupabase.js';

let _ready = false;
let _emitted = false;
let _result = null;

// 🚀 CRITICAL FIX: Only register ONE pageshow handler per page load
// Mobile Safari loads modules multiple times - each adds another listener!
if (!window.__authReadyPageshowRegistered) {
  window.__authReadyPageshowRegistered = Date.now();
  const AUTH_INIT_TIMESTAMP = Date.now();
  
  window.addEventListener('pageshow', (event) => {
    const timeSinceInit = Date.now() - AUTH_INIT_TIMESTAMP;
    const isInitialPageshow = timeSinceInit < 200;
    
    console.log('🔄 [AuthReady] pageshow:', {
      persisted: event.persisted,
      timeSinceInit,
      isInitialPageshow,
      wasReady: _ready
    });
    
    // Only reset on RETURN navigations or BFCache restore
    if (event.persisted) {
      console.log('✅ [AuthReady] BFCache restore - resetting stale state');
      _ready = false;
      _emitted = false;
      _result = null;
    } else if (!isInitialPageshow && _ready) {
      console.log('✅ [AuthReady] Return navigation - resetting stale state');
      _ready = false;
      _emitted = false;
      _result = null;
    } else {
      console.log('✅ [AuthReady] Initial pageshow - keeping fresh state');
    }
  });
} else {
  console.log('[AuthReady] ⏭️ Pageshow listener already registered, skipping duplicate');
}

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
    // 🔥 FIX: Add 5-second timeout (reduced from 8 - fail fast with cache fallback)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Membership timeout')), 5000)
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
  
  // 🔥 WOZ FIX: Check auth-resilience SYNCHRONOUSLY first - don't wait if already ready
  const authResilienceReady = window.__hiAuthResilience?.isReady === true;
  
  if (!authResilienceReady && window.__hiAuthResilience) {
    console.log('[AuthReady] 📱 Waiting for auth-resilience initial session restoration...');
    
    try {
      await new Promise((resolve) => {
        // Poll isReady flag with safety checks
        const checkInterval = setInterval(() => {
          if (window.__hiAuthResilience && window.__hiAuthResilience.isReady) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        
        window.addEventListener('auth-resilience-ready', () => {
          clearInterval(checkInterval);
          resolve();
        }, { once: true });
        
        // Timeout after 2 seconds (fail fast)
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('[AuthReady] Timeout waiting for auth-resilience, proceeding anyway');
          resolve();
        }, 2000);
      });
      console.log('[AuthReady] ✅ Auth-resilience restoration completed');
    } catch (e) {
      console.warn('[AuthReady] ⚠️ Auth-resilience wait failed, proceeding anyway:', e);
    }
  } else if (authResilienceReady) {
    console.log('[AuthReady] ✅ Auth-resilience already ready - skipping wait');
  } else {
    console.log('[AuthReady] ⚠️ No auth-resilience found - proceeding without wait');
  }
  
  const sb = getHiSupabase();

  // 🔥 FIX: Add 5-second timeout (reduced from 10 - fail fast)
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
    );
    
    const authPromise = (async () => {
      // 🔥 WOZ FIX: Check localStorage FIRST during navigation to avoid AbortErrors
      // If we have cached credentials, use them immediately instead of waiting for getSession()
      const cachedTier = localStorage.getItem('hi_membership_tier');
      const cachedAdmin = localStorage.getItem('hi_membership_is_admin');
      const storageKey = 'sb-gfcubvroxgfvjhacinic-auth-token';
      const storedAuth = localStorage.getItem(storageKey);
      
      if (storedAuth && cachedTier) {
        try {
          const parsed = JSON.parse(storedAuth);
          // Supabase stores full session object with user, access_token, refresh_token, etc.
          if (parsed.user && parsed.access_token) {
            // 🔒 CRITICAL: Check if token expired (expires_at is Unix timestamp in seconds)
            const expiresAt = parsed.expires_at || 0;
            const nowSeconds = Math.floor(Date.now() / 1000);
            const isExpired = expiresAt < nowSeconds;
            
            if (!isExpired) {
              console.log('[AuthReady] 🚀 Using cached session - skipping slow getSession()');
              return {
                session: parsed, // Return FULL session object, not just user
                membership: {
                  tier: cachedTier,
                  is_admin: cachedAdmin === '1',
                  cached: true
                }
              };
            } else {
              console.warn('[AuthReady] ⏰ Cached session expired, fallback to getSession()');
            }
          }
        } catch (e) {
          console.warn('[AuthReady] Failed to parse cached auth:', e);
        }
      }
      
      // Fallback: try getSession() if no cache or cache failed
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        await salvageTokens(sb);
        ({ data: { session } } = await sb.auth.getSession());
      }

      // If still no session, we continue but membership will be null
      let membership = session ? await fetchMembership(sb) : null;
      
      // 🔥 SURGICAL FIX: If membership fetch fails/times out, use cached data as fallback
      if (session && !membership) {
        if (cachedTier) {
          console.log('[AuthReady] 📱 Initial load: RPC timeout - using cached membership:', cachedTier);
          membership = {
            tier: cachedTier,
            is_admin: cachedAdmin === '1',
            cached: true // Flag so UI knows this is stale data
          };
        } else {
          console.error('[AuthReady] ❌ No membership from RPC and no cache - tier will be missing!');
        }
      }
      
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

// 🚀 MOBILE FIX: Restore session when app returns from background
// Desktop uses visibilitychange, mobile uses pageshow/pagehide
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await recheckAuth('visibilitychange');
  }
});

// 🔥 MOBILE FIX: iOS Safari uses pageshow/pagehide instead of visibilitychange
window.addEventListener('pageshow', async (event) => {
  if (event.persisted) {
    // Page restored from bfcache (mobile backgrounding)
    console.log('[AuthReady] 📱 Mobile: Page restored from bfcache');
    await recheckAuth('pageshow');
  }
});

// 🔥 MOBILE FIX: Handle app resume (Android/iOS)
window.addEventListener('focus', async () => {
  if (document.visibilityState === 'visible') {
    await recheckAuth('focus');
  }
});

// Reusable recheck logic
async function recheckAuth(source) {
  console.log(`[AuthReady] App returned from background (${source}) - checking session...`);
  try {
    const sb = getHiSupabase();
    let { data: { session } } = await sb.auth.getSession();
    
    // If no session, try to restore from localStorage
    if (!session) {
      console.warn('[AuthReady] No session found - attempting restore...');
      await salvageTokens(sb);
      ({ data: { session } } = await sb.auth.getSession());
      
      if (session) {
        console.log('[AuthReady] ✅ Session restored successfully');
        // Refresh membership
        let membership = await fetchMembership(sb);
        
        // 🔥 MOBILE FIX: If membership fetch fails/times out, use cached data as fallback
        if (!membership) {
          const cachedTier = localStorage.getItem('hi_membership_tier');
          const cachedAdmin = localStorage.getItem('hi_membership_is_admin');
          if (cachedTier) {
            console.log('[AuthReady] 📱 RPC timeout - using cached membership:', cachedTier);
            membership = {
              tier: cachedTier,
              is_admin: cachedAdmin === '1',
              cached: true // Flag so UI knows this is stale data
            };
          } else {
            console.error('[AuthReady] ❌ No membership from RPC and no cache - tier will be missing!');
          }
        }
        
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
        console.error('[AuthReady] ❌ Failed to restore session - user may need to re-login');
      }
    } else {
      console.log('[AuthReady] ✅ Session still valid');
    }
  } catch (e) {
    console.error('[AuthReady] ❌ Session check failed:', e);
  }
}

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
