// Supabase configuration - PRODUCTION VERSION
// These values should be set via environment variables in Vercel
// DO NOT commit actual credentials to version control

// For local development, create a config-local.js file (gitignored)
// For production, Vercel will inject these via build environment

window.SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL 
  ? process.env.SUPABASE_URL 
  : (window.ENV?.SUPABASE_URL || '');

window.SUPABASE_ANON_KEY = typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY
  ? process.env.SUPABASE_ANON_KEY
  : (window.ENV?.SUPABASE_ANON_KEY || '');

// Validation
if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration. Check environment variables.');
}
