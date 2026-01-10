// HI-OS: Supabase v3 Adapter (resilient loader)
// Prefer existing global UMD (window.supabase.createClient),
// fall back to stub immediately, then upgrade by injecting jsdelivr UMD if needed.
// Ensures global alias exists immediately for harness & dependent modules (HiFlags).
// Uses top-level await (module context) supported in modern browsers (Chrome, Safari 15+, Edge, Firefox 89+).

// Production config override strategy:
// 1. Use window.SUPABASE_URL / window.SUPABASE_ANON_KEY if defined (injected by env script)
// 2. Else use meta tags <meta name="supabase-url" content="..."> + <meta name="supabase-anon-key" content="...">
// 3. Else fall back to embedded anon key (non-sensitive) — rotate by updating env script.
function readMeta(name){ try { return document.querySelector(`meta[name="${name}"]`)?.content || null; } catch { return null; } }
const REAL_SUPABASE_URL = window.SUPABASE_URL || readMeta('supabase-url') || "https://gfcubvroxgfvjhacinic.supabase.co";
const REAL_SUPABASE_KEY = window.SUPABASE_ANON_KEY || readMeta('supabase-anon-key') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";
let __hiSupabaseIsStub = false;

// Provide an ultra-safe stub with methods used by current flag system.
function createStubClient() {
  console.warn('[HiSupabase.v3] Falling back to stub client — remote import failed');
  return {
    from() {
      const chain = {
        select() { return Promise.resolve({ data: [], error: new Error('stub') }); },
        insert() { return Promise.resolve({ data: null, error: new Error('stub') }); },
        update() { return Promise.resolve({ data: null, error: new Error('stub') }); },
        delete() { return Promise.resolve({ data: null, error: new Error('stub') }); },
        eq() { return chain; },
        in() { return chain; },
        not() { return chain; },
        order() { return chain; },
        limit() { return chain; }
      };
      return chain;
    },
    rpc() { return Promise.resolve({ data: null, error: new Error('stub') }); },
    auth: {
      getUser() { return Promise.resolve({ data: { user: null }, error: null }); },
      getSession() { return Promise.resolve({ data: { session: null }, error: null }); },
      onAuthStateChange() { return { data: { subscription: { unsubscribe(){} } }, error: null }; }
    }
  };
}

// 🚀 CRITICAL: Validate client is not stale from previous page
// This runs on EVERY getClient() call to handle BFCache restoration
function validateClientFreshness() {
  console.log('[HiSupabase VALIDATION] Running... currentURL:', window.location.pathname, 'clientURL:', window.__HI_SUPABASE_CLIENT_URL || 'none');
  
  if (window.__HI_SUPABASE_CLIENT) {
    const currentURL = window.location.pathname;
    const clientURL = window.__HI_SUPABASE_CLIENT_URL || '';
    
    if (currentURL !== clientURL) {
      console.warn('🧹 Clearing stale Supabase client (URL mismatch):', clientURL, '→', currentURL);
      window.__HI_SUPABASE_CLIENT = null;
      window.__HI_SUPABASE_CLIENT_URL = null;
      window.hiSupabase = null;
      window.supabaseClient = null;
      window.sb = null;
      createdClient = null; // 🚀 CRITICAL: Also clear module-scoped variable!
      return false; // Client was stale
    }
  }
  return true; // Client is fresh or doesn't exist
}

// 🚀 CRITICAL: Handle BFCache restoration (scripts don't re-run on BFCache!)
// When page is restored from BFCache, window state is intact but we're on a different URL
window.addEventListener('pageshow', (event) => {
  console.log('[HiSupabase] pageshow event fired, persisted:', event.persisted);
  if (event.persisted) {
    console.log('[HiSupabase] Page restored from BFCache, validating client...');
    validateClientFreshness();
  }
});

let createdClient = null;

// Validate client on script execution (handles both fresh load and BFCache)
validateClientFreshness();

// 🚀 CRITICAL: Check if existing client is from a different page (BFCache restoration)
// ISSUE: iOS Safari BFCache preserves Supabase client with aborted internal fetch state
// FIX: Always create fresh client when navigating between different pages
if (window.__HI_SUPABASE_CLIENT) {
  const currentURL = window.location.pathname;
  const clientURL = window.__HI_SUPABASE_CLIENT_URL || '';
  
  if (currentURL !== clientURL) {
    console.warn('🧹 Clearing Supabase client from different page:', clientURL, '→', currentURL);
    window.__HI_SUPABASE_CLIENT = null;
    window.__HI_SUPABASE_CLIENT_URL = null;
    window.hiSupabase = null;
    window.supabaseClient = null;
    window.sb = null;
  } else {
    createdClient = window.__HI_SUPABASE_CLIENT;
    window.hiSupabase = createdClient;
    console.log('♻️ Reusing Supabase client from same page:', currentURL);
  }
}

if (!createdClient) {
  // If a global UMD build is already available, use it immediately
  if (window.supabase?.createClient) {
    // 🚀 WOZ FIX: Add auth persistence options to prevent session loss on background
    const authOptions = {
      auth: {
        persistSession: true, // CRITICAL: Persist session across app backgrounds
        autoRefreshToken: true, // ✅ ENABLED: Auto-refresh tokens like X/Instagram (Brave Incognito works fine)
        detectSessionInUrl: false, // Prevent URL-based auth conflicts
        storage: window.localStorage, // Explicitly use localStorage (survives backgrounds)
        storageKey: 'sb-gfcubvroxgfvjhacinic-auth-token' // Stable storage key
      }
    };
    
    const real = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY, authOptions);
    createdClient = real;
    window.__HI_SUPABASE_CLIENT = real;
    window.__HI_SUPABASE_CLIENT_URL = window.location.pathname; // Track creation time
    window.hiSupabase = real;
    // Back-compat aliases
    try { window.supabaseClient = real; } catch(_){ }
    try { window.sb = real; } catch(_){ }
    console.log('✅ HiSupabase v3 client created from global UMD with persistent sessions');
    
    // 🔥 NAVIGATION FIX: Notify singleton components that a new client exists
    // This lets ProfileManager, auth-resilience, etc. update their references
    window.dispatchEvent(new CustomEvent('hi:supabase-client-ready', { detail: { client: real } }));
  } else {
    // Immediate stub exposure for early consumers
    createdClient = createStubClient();
    __hiSupabaseIsStub = true;
    window.__HI_SUPABASE_CLIENT = createdClient;
    window.hiSupabase = createdClient;
    // Progressive upgrade: inject jsdelivr UMD script (allowed by CSP)
    try {
      const existing = document.querySelector('script[src*="@supabase/supabase-js@2"][src*="jsdelivr"]');
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = () => {
          try {
            if (window.supabase?.createClient) {
              // 🚀 WOZ FIX: Add auth persistence options to prevent session loss
              const authOptions = {
                auth: {
                  persistSession: true,
                  autoRefreshToken: true, // ✅ ENABLED: Auto-refresh tokens like X/Instagram (Brave Incognito works fine)
                  detectSessionInUrl: false,
                  storage: window.localStorage,
                  storageKey: 'sb-gfcubvroxgfvjhacinic-auth-token'
                }
              };
              
              const realClient = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY, authOptions);
              window.__HI_SUPABASE_CLIENT = realClient;
              window.hiSupabase = realClient;
              try { window.supabaseClient = realClient; } catch(_){ }
              try { window.sb = realClient; } catch(_){ }
              createdClient = realClient;
              const wasStub = __hiSupabaseIsStub; __hiSupabaseIsStub = false;
              console.log('✅ HiSupabase v3 client upgraded from injected UMD with persistent sessions');
              try {
                window.dispatchEvent(new CustomEvent('supabase-upgraded', { detail: { client: realClient, wasStub } }));
              } catch(_){ }
            }
          } catch (e) {
            console.warn('[HiSupabase.v3] UMD upgrade failed after load:', e);
          }
        };
        s.onerror = () => console.warn('[HiSupabase.v3] Failed to load supabase-js UMD');
        document.head.appendChild(s);
      }
    } catch (e) {
      console.warn('[HiSupabase.v3] Script injection skipped:', e);
    }
  }
}

// HYBRID PATTERN: Provide BOTH globals (for dynamic loads) AND exports (for ES modules)
// This satisfies: (1) Mobile Safari dynamic script injection (2) ES module imports

// Helper to guarantee alias presence for late consumers.
function getHiSupabase() {
  // 🚀 CRITICAL: Validate client freshness on EVERY access
  // This handles BFCache restoration even if pageshow doesn't fire
  validateClientFreshness();
  
  // 🚀 CRITICAL: If client was cleared by validation, recreate it
  if (!createdClient && window.supabase?.createClient) {
    console.log('🔄 Recreating Supabase client after staleness detection');
    const authOptions = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
        storageKey: 'sb-gfcubvroxgfvjhacinic-auth-token'
      }
    };
    const REAL_SUPABASE_URL = window.SUPABASE_URL || document.querySelector('meta[name="supabase-url"]')?.content || 'https://gfcubvroxgfvjhacinic.supabase.co';
    const REAL_SUPABASE_KEY = window.SUPABASE_ANON_KEY || document.querySelector('meta[name="supabase-anon-key"]')?.content || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4MDQxMzEsImV4cCI6MjA1MDM4MDEzMX0.VUf0Ts-OhCrfzlCVWHPf4zv1wIIQJuZuKQEZx7UNqSk';
    
    createdClient = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY, authOptions);
    window.__HI_SUPABASE_CLIENT = createdClient;
    window.__HI_SUPABASE_CLIENT_URL = window.location.pathname;
    window.hiSupabase = createdClient;
    window.supabaseClient = createdClient;
    window.sb = createdClient;
    
    window.dispatchEvent(new CustomEvent('hi:supabase-client-ready', { detail: { client: createdClient } }));
  }
  
  if (!window.hiSupabase) window.hiSupabase = createdClient;
  return window.hiSupabase;
}

// Legacy compatibility: provide getClient function for modules expecting it
function getClient() {
  return getHiSupabase();
}

// Provide legacy global helpers if absent (do NOT overwrite if user set manually).
if (!window.getSupabase) {
  window.getSupabase = getHiSupabase;
}

// Ensure window.HiSupabase.getClient() pattern works without instantiating a second client.
if (!window.HiSupabase) {
  window.HiSupabase = { getClient: getHiSupabase };
} else if (!window.HiSupabase.getClient) {
  window.HiSupabase.getClient = getHiSupabase;
}

// Add explicit back-compat aliases commonly used across legacy modules
try {
  if (!window.supabaseClient) window.supabaseClient = createdClient;
} catch(_){}
try {
  if (!window.sb) window.sb = createdClient;
} catch(_){}

// Emit readiness event once (idempotent) so consumers like auth.js can reliably wait.
try {
  if (!window.__HI_SUPABASE_EVENT_EMITTED) {
    window.__HI_SUPABASE_EVENT_EMITTED = true;
    window.dispatchEvent(new CustomEvent('supabase-ready', {
      detail: { client: createdClient, stub: __hiSupabaseIsStub }
    }));
  }
} catch(_) { /* swallow */ }

// ES6 EXPORTS: Commented out to prevent "Unexpected token 'export'" errors
// When needed by modules, they can import from wrapper file HiSupabase.js
// export const supabase = createdClient;
// export { getHiSupabase, getClient };