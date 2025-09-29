<!-- load once on any page that talks to Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>
  // 🔁 paste your values from Project Settings → API
  const SUPABASE_URL = 'https://YOUR-PROJECT-ref.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR-PUBLIC-ANON-KEY';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase keys missing in supabase-init.js');
  }

  // global client
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
</script>
