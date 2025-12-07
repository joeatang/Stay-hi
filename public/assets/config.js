// Supabase configuration - PRODUCTION VERSION
// Environment variables are injected at build time by Vercel
// For local development, use config-local.js (gitignored)

(function() {
  // Check if already configured by config-local.js (must have REAL values, not empty strings)
  const alreadyConfigured = window.SUPABASE_URL && window.SUPABASE_URL.length > 0 && 
                            window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.length > 0;
  
  if (alreadyConfigured) {
    console.log('✅ Supabase configuration already loaded (from config-local.js)');
    return; // Don't overwrite existing config
  }
  
  // CRITICAL: These are replaced at build time by Vercel
  // __SUPABASE_URL__ and __SUPABASE_ANON_KEY__ are placeholders
  // Vercel's build process will replace them with actual values
  window.SUPABASE_URL = 'https://gfcubvroxgfvjhacinic.supabase.co';
  window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g';
  
  // If placeholders weren't replaced, try window.ENV as fallback
  if (window.SUPABASE_URL === 'https://gfcubvroxgfvjhacinic.supabase.co' || !window.SUPABASE_URL) {
    window.SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
  }
  
  if (window.SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY3VidnJveGdmdmpoYWNpbmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTIyNjYsImV4cCI6MjA3NDQ4ODI2Nn0.5IlxofMPFNdKsEueM_dhgsJP9wI-GnZRUM9hfR0zE1g' || !window.SUPABASE_ANON_KEY) {
    window.SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';
  }
  
  // Validation - fail loud if missing
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration');
    console.error('Expected: config-local.js or build-time injection');
    console.error('Current URL:', window.SUPABASE_URL ? window.SUPABASE_URL.substring(0, 40) : 'MISSING');
    console.error('Current KEY:', window.SUPABASE_ANON_KEY ? 'SET (length: ' + window.SUPABASE_ANON_KEY.length + ')' : 'MISSING');
  } else {
    console.log('✅ Supabase configuration loaded from build-time injection');
  }
})();

