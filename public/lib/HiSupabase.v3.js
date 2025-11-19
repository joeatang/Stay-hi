// HI-OS: Supabase v3 Adapter (resilient loader)
// Prefer existing global UMD (window.supabase.createClient),
// fall back to stub immediately, then upgrade by injecting jsdelivr UMD if needed.
// Ensures global alias exists immediately for harness & dependent modules (HiFlags).
// Uses top-level await (module context) supported in modern browsers (Chrome, Safari 15+, Edge, Firefox 89+).

const REAL_SUPABASE_URL = "https://gfcubvroxgfvjhacinic.supabase.co";
const REAL_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g";

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

let createdClient = null;

if (window.__HI_SUPABASE_CLIENT) {
  createdClient = window.__HI_SUPABASE_CLIENT;
  window.hiSupabase = createdClient;
  console.log('♻️ Reusing existing HiSupabase v3 client');
} else {
  // If a global UMD build is already available, use it immediately
  if (window.supabase?.createClient) {
    const real = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY);
    createdClient = real;
    window.__HI_SUPABASE_CLIENT = real;
    window.hiSupabase = real;
    console.log('✅ HiSupabase v3 client created from global UMD');
  } else {
    // Immediate stub exposure for early consumers
    createdClient = createStubClient();
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
              const realClient = window.supabase.createClient(REAL_SUPABASE_URL, REAL_SUPABASE_KEY);
              window.__HI_SUPABASE_CLIENT = realClient;
              window.hiSupabase = realClient;
              createdClient = realClient;
              console.log('✅ HiSupabase v3 client upgraded from injected UMD');
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

export const supabase = createdClient;

// Helper to guarantee alias presence for late consumers.
export function getHiSupabase() {
  if (!window.hiSupabase) window.hiSupabase = supabase;
  return window.hiSupabase;
}

// Legacy compatibility: provide getClient named export + global shims.
// Older modules expect: import { getClient } from '/lib/HiSupabase.js' OR window.HiSupabase.getClient().
export function getClient() {
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