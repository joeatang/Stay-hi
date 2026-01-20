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
  
  // 🚀 SESSION PERSISTENCE FIX: Track URL to distinguish navigation from phone wake
  let lastAuthURL = window.location.href;
  
  window.addEventListener('pageshow', (event) => {
    const timeSinceInit = Date.now() - AUTH_INIT_TIMESTAMP;
    const isInitialPageshow = timeSinceInit < 200;
    const currentURL = window.location.href;
    const urlChanged = currentURL !== lastAuthURL;
    
    console.log('🔄 [AuthReady] pageshow:', {
      persisted: event.persisted,
      timeSinceInit,
      isInitialPageshow,
      urlChanged, // NEW: Distinguish navigation from phone sleep
      wasReady: _ready
    });
    
    // 🚀 FIX: ONLY reset on ACTUAL navigation (URL changed)
    // Phone sleep/wake fires pageshow but URL is the SAME - preserve state!
    if (event.persisted && urlChanged) {
      console.log('✅ [AuthReady] BFCache navigation (URL changed) - resetting stale state');
      _ready = false;
      _emitted = false;
      _result = null;
    } else if (!isInitialPageshow && _ready && urlChanged) {
      console.log('✅ [AuthReady] Return navigation (URL changed) - resetting stale state');
      _ready = false;
      _emitted = false;
      _result = null;
    } else if (event.persisted && !urlChanged) {
      // 📱 Phone sleep/wake - KEEP STATE (still valid!)
      console.log('📱 [AuthReady] Phone wake detected (URL unchanged) - preserving auth state ✅');
    } else {
      console.log('✅ [AuthReady] Initial pageshow - keeping fresh state');
    }
    
    lastAuthURL = currentURL; // Update for next check
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
    // � ZOMBIE FIX: Increased from 5s to 10s for slow networks
    // RPC queries can timeout on slow connections causing membership loss
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Membership timeout')), 10000)
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

  // 🚀 ZOMBIE FIX: Adaptive timeout - shorter on mobile for better UX
  // Mobile BFCache protection (7s) vs Desktop slow network tolerance (15s)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const authTimeout = isMobile ? 7000 : 15000;
  console.log(`[AuthReady] Using ${authTimeout}ms timeout (${isMobile ? 'mobile' : 'desktop'} detected)`);
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), authTimeout)
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
          // Supabase v2 stores full session object at root level
          const session = parsed;
          const user = parsed.user;
          const accessToken = parsed.access_token;
          const expiresAt = parsed.expires_at || 0;
          
          if (user && accessToken) {
            // 🔒 CRITICAL: Check if token expired (expires_at is Unix timestamp in seconds)
            const nowSeconds = Math.floor(Date.now() / 1000);
            const isExpired = expiresAt < nowSeconds;
            
            if (!isExpired) {
              console.log('[AuthReady] 🚀 Using cached session (valid for', Math.round((expiresAt - nowSeconds) / 60), 'min)');
              return {
                session, // Return full session object
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
      console.log('[AuthReady] 🔄 Fetching fresh session from Supabase...');
      
      // 🔥 CRITICAL FIX: Add timeout protection to prevent silent logout
      let session = null;
      try {
        // 🚀 ZOMBIE FIX: Increased from 3s to 10s for slow networks (desktop Chrome timing out)
        // Supabase queries can take 4-8s on slow connections or database load
        const sessionPromise = sb.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = result?.data?.session || null;
        
        if (!session) {
          await salvageTokens(sb);
          // Retry with 6s timeout (increased from 2s)
          const retryPromise = sb.auth.getSession();
          const retryTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Retry timeout')), 6000)
          );
          const retryResult = await Promise.race([retryPromise, retryTimeout]);
          session = retryResult?.data?.session || null;
        }
      } catch (error) {
        console.warn('[AuthReady] Session check timeout/error - using cached state:', error.message);
        // CRITICAL: Don't clear session on timeout - preserve cached state
        session = window.__hiAuthReady?.session || null;
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

// Reusable recheck logic with debounce protection
let lastRecheckTime = 0;
let recheckInProgress = false;

async function recheckAuth(source) {
  const now = Date.now();
  const timeSinceLastCheck = now - lastRecheckTime;
  
  // 🚀 ZOMBIE FIX: Debounce - skip if checked within last 5 seconds
  if (timeSinceLastCheck < 5000) {
    console.log(`[AuthReady] Skipping ${source} recheck (${timeSinceLastCheck}ms since last check)`);
    return;
  }
  
  // 🚀 ZOMBIE FIX: Prevent concurrent rechecks
  if (recheckInProgress) {
    console.log(`[AuthReady] Skipping ${source} recheck (already in progress)`);
    return;
  }
  
  console.log(`[AuthReady] App returned from background (${source}) - checking session...`);
  recheckInProgress = true;
  lastRecheckTime = now;
  
  try {
    const sb = getHiSupabase();
    
    // 🚀 ZOMBIE FIX: Adaptive timeout - 7s mobile, 10s desktop
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const timeout = isMobile ? 7000 : 10000;
    
    // 🔥 CRITICAL FIX: Add timeout protection
    let session = null;
    try {
      const sessionPromise = sb.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeout)
      );
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      session = result?.data?.session || null;
    } catch (timeoutError) {
      console.warn('[AuthReady] Session check timeout - using cached state');
      session = window.__hiAuthReady?.session || null;
    }
    
    // If no session, try to restore from localStorage
    if (!session) {
      console.warn('[AuthReady] No session found - attempting restore...');
      await salvageTokens(sb);
      try {
        const retryPromise = sb.auth.getSession();
        const retryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), timeout - 4000) // 3s mobile, 6s desktop
        );
        const retryResult = await Promise.race([retryPromise, retryTimeout]);
        session = retryResult?.data?.session || null;
      } catch (retryError) {
        console.warn('[AuthReady] Retry timeout - preserving cached state');
        session = window.__hiAuthReady?.session || null;
      }
      
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
  } finally {
    // 🚀 ZOMBIE FIX: Always reset the in-progress flag
    recheckInProgress = false;
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
