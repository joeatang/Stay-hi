// DEBUG: Test the database connection directly from the browser console
// Run this in your browser console on the dashboard page to see what's happening

console.log('🔍 DEBUGGING DATABASE CONNECTION...');

async function debugDashboardStats() {
  console.log('Step 1: Check if Supabase client exists...');
  const supabase = window.getSupabase?.() || window.supabaseClient || window.sb;
  
  if (!supabase) {
    console.error('❌ No Supabase client found!');
    console.log('Available window objects:', Object.keys(window).filter(k => k.includes('supabase') || k.includes('Supabase')));
    return;
  }
  
  console.log('✅ Supabase client found:', supabase);
  
  console.log('Step 2: Test get_user_stats call...');
  try {
    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: null
    });
    
    if (error) {
      console.error('❌ Database call failed:', error);
      return;
    }
    
    if (!data) {
      console.error('❌ No data returned from get_user_stats');
      return;
    }
    
    console.log('✅ Database call successful!');
    console.log('Raw data:', data);
    
    if (data.globalStats) {
      console.log('✅ globalStats found:', data.globalStats);
      console.log('  hiWaves:', data.globalStats.hiWaves);
      console.log('  totalHis:', data.globalStats.totalHis);
      console.log('  totalUsers:', data.globalStats.totalUsers);
      
      // Test setting global variables
      window.gWaves = data.globalStats.hiWaves || 0;
      window.gTotalHis = data.globalStats.totalHis || 0;
      window.gUsers = data.globalStats.totalUsers || 0;
      
      console.log('✅ Global variables set:', {
        gWaves: window.gWaves,
        gTotalHis: window.gTotalHis,
        gUsers: window.gUsers
      });
      
      // Test UI update
      const hiWavesEl = document.querySelector('[data-stat="hiWaves"], #globalHiWaves, .hi-waves');
      const totalHisEl = document.querySelector('[data-stat="totalHis"], #globalTotalHis, #totalHis, .total-his');
      const usersEl = document.querySelector('[data-stat="users"], #globalUsers, .users');
      
      console.log('UI Elements found:');
      console.log('  Hi Waves element:', hiWavesEl);
      console.log('  Total His element:', totalHisEl);
      console.log('  Users element:', usersEl);
      
      if (hiWavesEl) {
        hiWavesEl.textContent = window.gWaves.toLocaleString();
        console.log('✅ Updated Hi Waves display to:', window.gWaves);
      }
      
      if (totalHisEl) {
        totalHisEl.textContent = window.gTotalHis.toLocaleString();
        console.log('✅ Updated Total His display to:', window.gTotalHis);
      }
      
      if (usersEl) {
        usersEl.textContent = window.gUsers.toLocaleString();
        console.log('✅ Updated Users display to:', window.gUsers);
      }
      
    } else {
      console.error('❌ No globalStats in response');
      console.log('Available properties:', Object.keys(data));
    }
    
  } catch (err) {
    console.error('❌ Error during database test:', err);
  }
}

// Run the debug test
debugDashboardStats();