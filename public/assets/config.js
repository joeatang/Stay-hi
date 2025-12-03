// Supabase configuration - SECURE VERSION
// Uses environment variables injected by Vercel at build time
// For local development, use config-local.js (gitignored)

// In production, Vercel injects these via _headers or serverless functions
// For now, we'll use a fallback mechanism that checks multiple sources

(function() {
  // Check if running in Vercel build environment
  const isVercelBuild = typeof process !== 'undefined' && process.env?.VERCEL;
  
  // Priority 1: Environment variables (Vercel production)
  // Priority 2: window.ENV object (injected by build script)
  // Priority 3: Empty strings (will fail validation)
  
  window.SUPABASE_URL = isVercelBuild 
    ? process.env.SUPABASE_URL 
    : (window.ENV?.SUPABASE_URL || '');
  
  window.SUPABASE_ANON_KEY = isVercelBuild
    ? process.env.SUPABASE_ANON_KEY
    : (window.ENV?.SUPABASE_ANON_KEY || '');
  
  // Validation - fail loud if missing
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration');
    console.error('Expected: config-local.js or environment variables');
    console.error('Current URL:', window.SUPABASE_URL ? 'SET' : 'MISSING');
    console.error('Current KEY:', window.SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
  } else {
    console.log('✅ Supabase configuration loaded');
  }
})();

