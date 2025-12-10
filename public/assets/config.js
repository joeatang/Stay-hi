// Supabase configuration - SIMPLIFIED PRODUCTION VERSION
// Uses hardcoded values since SUPABASE_ANON_KEY is safe to expose (public key)
// For local development, config-local.js (gitignored) takes precedence

(function() {
  // Check if already configured by config-local.js (must have REAL values, not empty strings)
  const alreadyConfigured = window.SUPABASE_URL && window.SUPABASE_URL.length > 0 &&
                             window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.length > 0;
  
  if (alreadyConfigured) {
    console.log('✅ Supabase configuration already loaded (from config-local.js)');
    return; // Don't overwrite existing config
  }
  
  // 🚀 PRODUCTION: Hardcoded values (safe - these are PUBLIC keys)
  // SUPABASE_ANON_KEY is designed to be exposed to browsers (it's in every API call anyway)
  window.SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
  window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';
  
  console.log('✅ Supabase configuration loaded (production)');
  console.log('📍 URL:', window.SUPABASE_URL.substring(0, 40) + '...');
  console.log('🔑 Key length:', window.SUPABASE_ANON_KEY.length);
  
  // Dispatch event to notify other scripts that config is ready
  window.dispatchEvent(new CustomEvent('supabase-config-ready'));
})();