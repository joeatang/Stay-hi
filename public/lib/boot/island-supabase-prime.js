// Load HiSupabase.v3.js IMMEDIATELY (not as module - modules defer/don't work reliably on mobile)
console.log('[island-supabase-prime] Starting HiSupabase load...');

// Inject HiSupabase.v3 script synchronously
(function() {
  const script = document.createElement('script');
  // ✅ FIX: Absolute path from public root (relative paths resolve from HTML, not script location)
  script.src = './lib/HiSupabase.v3.js';
  script.onload = function() {
    console.log('✅ Tesla: HiSupabase.v3 initialized before HiDB');
  };
  script.onerror = function(err) {
    console.error('[island-supabase-prime] FAILED to load HiSupabase.v3:', err);
  };
  document.head.appendChild(script);
})();
