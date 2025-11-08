// shim: keep legacy path alive in prod
export * from './HiSupabase.v3.js';
export { default } from './HiSupabase.v3.js';

const SUPABASE_URL  = window?.ENV_SUPABASE_URL  || 'https://gfcubvroxgfvjhacinic.supabase.co'
const SUPABASE_ANON = window?.ENV_SUPABASE_ANON || (window?.HI_ENV?.SUPABASE_ANON) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g'

// Guard: prevent duplicate clients in hot-reload
let _client = window.__HI_SUPABASE_CLIENT || null
if (!_client) {
  _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  window.__HI_SUPABASE_CLIENT = _client
  console.log('✅ Supabase client (ESM) initialized')
}

// Public API
export function getClient() { return _client }

// Hi-OS: expose a safe global for other modules
window.hiSupabase = { getClient }

// Legacy UMD compatibility (for any old code that expects window.supabase.createClient)
if (!window.supabase || !window.supabase.createClient) {
  window.supabase = {
    createClient: () => _client
  }
}

// Legacy compatibility for existing code
window.supabaseClient = _client
window.sb = _client

// Legacy API wrapper
window.HiSupabaseClient = {
  getClient() {
    return _client;
  }
};
