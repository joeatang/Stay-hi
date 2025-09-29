// assets/supabase-init.js
// Loads Supabase UMD if needed, then creates a single shared client.
// Exposes: window.sb (client) and window.supabaseClient (alias).

(function () {
  const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';

  function initClient() {
    try {
      if (!window.sb) {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
          console.error('[supabase-init] Supabase UMD not present');
          return;
        }
        window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        window.supabaseClient = window.sb; // convenient alias
        // console.log('[supabase-init] Supabase client ready');
      }
    } catch (e) {
      console.error('[supabase-init] init error:', e);
    }
  }

  // If UMD already on page, init immediately; otherwise load it once.
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient
