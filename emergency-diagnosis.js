/**
 * 🚨 EMERGENCY SYSTEM DIAGNOSIS
 * Use in browser console to identify system issues
 */

window.emergencyDiagnosis = async function() {
  console.log('🚨 EMERGENCY DIAGNOSIS STARTING...');
  console.log('='.repeat(50));
  
  // 1. Check Supabase client
  const client = window.getSupabase?.();
  console.log('📊 Supabase Client:', client ? '✅ Available' : '❌ Missing');
  
  // 2. Check current public_shares data
  if (client) {
    try {
      console.log('\n📋 CHECKING PUBLIC_SHARES DATA:');
      const { data: shares, error } = await client
        .from('public_shares')
        .select('id, text, content, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('❌ Query error:', error);
      } else {
        console.log(`📊 Total recent records: ${shares.length}`);
        shares.forEach((share, i) => {
          const content = share.text || share.content || 'No content';
          const isMedallion = content.includes('medallion') || content.includes('Medallion');
          console.log(`${i+1}. ${isMedallion ? '🏅' : '📝'} ${content.substring(0, 50)}... (${share.created_at})`);
        });
      }
    } catch (err) {
      console.error('❌ Database check failed:', err);
    }
  }
  
  // 3. Check HiShareSheet status
  console.log('\n🔧 HISHARESHEET STATUS:');
  console.log('- Global instance:', window.hiIslandShareSheet ? '✅' : '❌');
  console.log('- Open function:', typeof window.openHiShareSheet);
  console.log('- HiDB available:', window.hiDB ? '✅' : '❌');
  
  // 4. Check HiRealFeed status
  console.log('\n🏝️ HIREALFEED STATUS:');
  console.log('- Instance:', window.hiRealFeed ? '✅' : '❌');
  console.log('- Current tab:', window.hiRealFeed?.currentTab || 'Unknown');
  console.log('- Feed data:', {
    general: window.hiRealFeed?.feedData?.general?.length || 0,
    archives: window.hiRealFeed?.feedData?.archives?.length || 0
  });
  
  // 5. Test share submission (dry run)
  console.log('\n🧪 TESTING SHARE SUBMISSION (DRY RUN):');
  if (window.hiDB?.insertPublicShare) {
    console.log('✅ insertPublicShare method available');
    console.log('✅ Ready for share submission test');
  } else {
    console.log('❌ insertPublicShare method missing');
  }
  
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('='.repeat(50));
};

// Quick connection test
window.quickConnectionTest = async function() {
  console.log('� Quick Connection Test...');
  
  const client = window.getSupabase?.();
  if (!client) {
    console.error('❌ No Supabase client found');
    return;
  }
  
  try {
    const { data, error } = await client
      .from('public_shares')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ public_shares error:', error);
    } else {
      console.log('✅ public_shares accessible');
    }
  } catch (e) {
    console.error('❌ Connection failed:', e);
  }
};

console.log('�🚨 Emergency diagnosis loaded. Run: emergencyDiagnosis() or quickConnectionTest()');