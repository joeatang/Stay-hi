<!-- /public/assets/supabase-init.js -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>
  // 🔁 paste your values from Supabase → Project Settings → API
  const SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[supabase-init] Missing keys');
  }

  // Create client and expose on BOTH names:
  // - window.supabase  (what assets/db.js expects)
  // - window.sb        (back-compat with earlier pages)
  const __client = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true }})
    : supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth:{ persistSession:true, autoRefreshToken:true }});

  window.supabase = __client;
  window.sb = __client;

  console.debug('[supabase-init] client ready');
</script>
