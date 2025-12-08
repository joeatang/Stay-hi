// Supabase configuration - PRODUCTION VERSION
// Environment variables are loaded from /api/config serverless function
// For local development, use config-local.js (gitignored)

(async function() {
  // Check if already configured by config-local.js (must have REAL values, not empty strings)
  const alreadyConfigured = window.SUPABASE_URL && window.SUPABASE_URL.length > 0 &&
                             window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.length > 0;
  
  if (alreadyConfigured) {
    console.log('✅ Supabase configuration already loaded (from config-local.js)');
    return; // Don't overwrite existing config
  }
  
  // 🚀 PRODUCTION: Fetch config from serverless API endpoint
  try {
    console.log('🔧 Fetching Supabase config from /api/config...');
    const response = await fetch('/api/config');
    
    if (!response.ok) {
      throw new Error(`Config API returned ${response.status}`);
    }
    
    const config = await response.json();
    
    if (config.ready && config.supabaseUrl && config.supabaseAnonKey) {
      window.SUPABASE_URL = config.supabaseUrl;
      window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
      console.log('✅ Supabase configuration loaded from API endpoint');
      console.log('📍 URL:', window.SUPABASE_URL.substring(0, 40) + '...');
      console.log('🔑 Key length:', window.SUPABASE_ANON_KEY.length);
      
      // Dispatch event to notify other scripts that config is ready
      window.dispatchEvent(new CustomEvent('supabase-config-ready'));
      return;
    }
    
    throw new Error('Config API returned incomplete data');
  } catch (error) {
    console.error('❌ Failed to load config from API:', error.message);
    console.error('   Falling back to placeholder check...');
  }
  
  // 🔧 FALLBACK: Try build-time injection placeholders
  window.SUPABASE_URL = '__SUPABASE_URL__';
  window.SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
  
  // If placeholders weren't replaced, try window.ENV as fallback
  if (window.SUPABASE_URL === '__SUPABASE_URL__' || !window.SUPABASE_URL) {
    window.SUPABASE_URL = window.ENV?.SUPABASE_URL || '';
  }
  
  if (window.SUPABASE_ANON_KEY === '__SUPABASE_ANON_KEY__' || !window.SUPABASE_ANON_KEY) {
    window.SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';
  }
  
  // Validation - fail loud if missing
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration');
    console.error('Expected: config-local.js, API endpoint, or build-time injection');
    console.error('Current URL:', window.SUPABASE_URL ? window.SUPABASE_URL.substring(0, 40) : 'MISSING');
    console.error('Current KEY:', window.SUPABASE_ANON_KEY ? 'SET (length: ' + window.SUPABASE_ANON_KEY.length + ')' : 'MISSING');
  } else {
    console.log('✅ Supabase configuration loaded from fallback method');
    window.dispatchEvent(new CustomEvent('supabase-config-ready'));
  }
})();