// Quick test to debug the get_user_stats call
// This will help us see what the database actually returns vs what the code expects

console.log('🔍 Testing get_user_stats database call...');

async function testGetUserStats() {
  try {
    const supabase = window.getSupabase?.() || window.supabaseClient || window.sb;
    
    if (!supabase) {
      console.log('❌ No Supabase client found');
      return;
    }
    
    console.log('✅ Supabase client found, calling get_user_stats...');
    
    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: null  // Test with anonymous user
    });
    
    if (error) {
      console.log('❌ Database error:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ No data returned from get_user_stats');
      return;
    }
    
    console.log('✅ Raw response from get_user_stats:', data);
    
    // Test what DashboardStats.js looks for
    if (data.globalStats) {
      console.log('✅ globalStats found:', data.globalStats);
      console.log('  - hiWaves:', data.globalStats.hiWaves);
      console.log('  - totalHis:', data.globalStats.totalHis); 
      console.log('  - totalUsers:', data.globalStats.totalUsers);
    } else {
      console.log('❌ No globalStats in response - this is the problem!');
      console.log('Available properties:', Object.keys(data));
    }
    
  } catch (err) {
    console.log('❌ JavaScript error:', err);
  }
}

// Run the test
testGetUserStats();