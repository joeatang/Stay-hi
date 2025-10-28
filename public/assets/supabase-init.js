// /public/assets/supabase-init.js
// Supabase client initialization - load CDN script first, then initialize

(function() {
  // Supabase script is loaded in HTML head, so initialize directly
  initializeSupabase();

  function initializeSupabase() {
    console.log('Supabase script loaded, window.supabase:', !!window.supabase);
    // 🔁 paste your values from Supabase → Project Settings → API
    const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[supabase-init] Missing keys');
      return;
    }

    // Create client and expose on BOTH names:
    // - window.supabase  (what assets/db.js expects)
    // - window.sb        (back-compat with earlier pages)
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
      auth: { persistSession: true, autoRefreshToken: true }
    });

    // Set both global references to the same client instance
    window.supabaseClient = client;
    window.sb = client;

    console.debug('[supabase-init] client ready');
    
    // Dispatch event to notify other scripts that Supabase is ready
    window.dispatchEvent(new CustomEvent('supabase-ready', { detail: { client } }));
  }
})();
