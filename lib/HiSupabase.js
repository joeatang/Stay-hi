// lib/HiSupabase.js
// CONSOLIDATED: 2025-11-01 from assets/supabase-init.js
// Supabase client initialization - load CDN script first, then initialize

(function() {
  // Wait for Supabase CDN to load before initializing
  if (window.supabase) {
    initializeSupabase();
  } else {
    console.warn('⏳ Waiting for Supabase CDN to load...');
    // Retry up to 10 times (1 second total)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.supabase) {
        clearInterval(interval);
        console.log('✅ Supabase CDN loaded after', attempts * 100, 'ms');
        initializeSupabase();
      } else if (attempts >= 10) {
        clearInterval(interval);
        console.error('❌ Supabase CDN failed to load after 1 second');
        console.error('Check: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      }
    }, 100);
  }

  function initializeSupabase() {
    console.log('🚀 Initializing Supabase client...');
    // 🔁 paste your values from Supabase → Project Settings → API
    const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[supabase-init] Missing keys');
      return;
    }

    try {
      // Create client and expose on BOTH names:
      // - window.supabaseClient (primary)
      // - window.sb (back-compat)
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
        auth: { persistSession: true, autoRefreshToken: true }
      });

      // Set both global references to the same client instance
      window.supabaseClient = client;
      window.sb = client;

      console.log('✅ Supabase client initialized successfully');
      console.log('   URL:', SUPABASE_URL);
      console.log('   Client:', !!client);
      
      // Dispatch event to notify other scripts that Supabase is ready
      window.dispatchEvent(new CustomEvent('supabase-ready', { detail: { client } }));
    } catch (error) {
      console.error('❌ Failed to initialize Supabase client:', error);
    }
  }
})();
