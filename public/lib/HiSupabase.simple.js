// 🔄 HiSupabase Simple Legacy Version - No ES6 Modules
// Tesla-grade: Simple Supabase client initialization without imports

console.log('🧩 HiSupabase Simple Legacy loaded');

(function() {
  const SUPABASE_URL = window?.ENV_SUPABASE_URL || 'https://gfcubvroxgfvjhacinic.supabase.co'
  const SUPABASE_ANON = window?.ENV_SUPABASE_ANON || (window?.HI_ENV?.SUPABASE_ANON) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g'

  // Guard: prevent duplicate clients in hot-reload
  let _client = window.__HI_SUPABASE_CLIENT || null
  
  function initializeSupabase() {
    if (!_client && window.supabase && window.supabase.createClient) {
      try {
        _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
          auth: { persistSession: true, autoRefreshToken: true },
        })
        window.__HI_SUPABASE_CLIENT = _client
        console.log('✅ Supabase client (Simple Legacy) initialized')
      } catch (error) {
        console.warn('⚠️ Supabase client initialization failed:', error)
      }
    }
  }

  // Public API
  function getClient() { 
    if (!_client) {
      initializeSupabase()
    }
    return _client 
  }

  // Hi-OS: expose a safe global for other modules
  window.hiSupabase = { getClient }
  window.getSupabaseClient = getClient

  // Try to initialize immediately if supabase is available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabase)
  } else {
    initializeSupabase()
  }

  // Also try after a short delay to ensure supabase CDN is loaded
  setTimeout(initializeSupabase, 100)
})()