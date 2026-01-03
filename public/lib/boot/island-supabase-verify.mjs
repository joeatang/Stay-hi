// Tesla Database Connection Fix (externalized)
try {
  console.log('🔧 Tesla: Initializing Supabase client...');
  
  // Import and initialize HiSupabase.v3.js (with autoRefreshToken fix)
  await import('../HiSupabase.v3.js');
  
  // Verify client is available
  if (window.HiSupabase && window.HiSupabase.getClient) {
    const client = window.HiSupabase.getClient();
    console.log('✅ Tesla: Supabase client initialized successfully');
    
    // Test connection
    const { data, error } = await client.from('public_shares').select('count', { count: 'exact', head: true });
    if (!error) {
      console.log('✅ Tesla: Database connection verified');
    } else {
      console.warn('⚠️ Tesla: Database connection issue:', error.message);
    }
  } else {
    console.warn('⚠️ Tesla: HiSupabase module not properly loaded');
  }
} catch (error) {
  console.error('❌ Tesla: Supabase initialization failed:', error);
}
