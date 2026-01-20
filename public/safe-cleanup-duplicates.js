// Safe Cleanup: Remove ALL seed/test shares, keep only real user shares
// Run this in browser console on Hi Island page after auth

(async function safeCleanupDuplicates() {
  console.log('🧹 Starting SAFE cleanup of seed/test data...');
  
  // Get Supabase client - call getClient() method
  let supa;
  
  // HiSupabase has a getClient() method
  if (window.HiSupabase?.getClient) {
    supa = await window.HiSupabase.getClient();
    console.log('✅ Using HiSupabase.getClient()');
  } else {
    console.error('❌ Supabase client not found');
    console.log('Available:', { 
      hiDB: !!window.hiDB, 
      HiSupabase: !!window.HiSupabase,
      getClient: !!window.HiSupabase?.getClient
    });
    console.log('💡 Make sure you\'re on Hi Island page after it fully loads');
    return;
  }
  
  // Verify client has required methods
  if (!supa || !supa.from) {
    console.error('❌ Supabase client missing .from() method');
    console.log('Client:', supa);
    return;
  }
  
  console.log('✅ Supabase client ready');
  
  // Get current authenticated user to protect their data (optional)
  let userId = null;
  try {
    if (supa.auth?.getUser) {
      const { data: { user } } = await supa.auth.getUser();
      userId = user?.id;
      console.log('👤 Current user ID:', userId || 'Not authenticated');
    }
  } catch (authError) {
    console.log('⚠️  Could not get user auth (continuing anyway)');
  }
  
  console.log('🔍 Fetching all public shares...');
  const { data: shares, error } = await supa
    .from('public_shares')
    .select('id, content, location, created_at, user_id, is_anonymous')
    .eq('is_public', true)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ Error fetching shares:', error);
    return;
  }
  
  console.log(`📊 Total public shares: ${shares.length}`);
  
  // Seed share patterns - these are the test data
  const seedPatterns = [
    'Morning surf session at Bondi Beach',
    'nature\'s therapy session',
    'Cherry blossoms remind me',
    'beauty is temporary and precious',
    'Tea time in Hyde Park',
    'finding peace in the simple moments',
    'incredible sunset over the Golden Gate Bridge',
    'Grateful for this beautiful city',
    'connections it brings'
  ];
  
  // Seed locations
  const seedLocations = [
    'Sydney, Australia',
    'Tokyo, Japan',
    'London, UK',
    'San Francisco',
    'New York, NY'
  ];
  
  // Identify seed shares (test data to delete)
  const seedShares = shares.filter(share => {
    const content = share.content || '';
    const location = share.location || '';
    
    // Match by content patterns
    const matchesPattern = seedPatterns.some(pattern => 
      content.includes(pattern)
    );
    
    // Match by location if content is close
    const matchesLocation = seedLocations.some(loc => 
      location.includes(loc)
    ) && content.length < 200; // Seed shares are short
    
    return matchesPattern || (matchesLocation && content.includes('surf'));
  });
  
  // Group duplicates
  const duplicateGroups = {};
  seedShares.forEach(share => {
    const key = share.content?.substring(0, 50);
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(share);
  });
  
  console.log('\n📋 Found seed/test shares:');
  Object.entries(duplicateGroups).forEach(([key, group]) => {
    console.log(`  "${key}..." - ${group.length} copies at ${group[0].location}`);
  });
  
  // Identify real user shares (to protect)
  const realUserShares = shares.filter(share => {
    const isSeed = seedShares.some(seed => seed.id === share.id);
    return !isSeed;
  });
  
  console.log(`\n✅ Real user shares (will be protected): ${realUserShares.length}`);
  realUserShares.forEach(share => {
    console.log(`  - "${share.content?.substring(0, 50)}..." at ${share.location}`);
  });
  
  console.log(`\n🗑️  Seed/test shares to delete: ${seedShares.length}`);
  
  if (seedShares.length === 0) {
    console.log('✅ No seed shares found - database is clean!');
    return;
  }
  
  // Safety check - don't delete if no real shares exist
  if (realUserShares.length === 0 && shares.length > 0) {
    console.warn('⚠️  WARNING: This would delete ALL shares. Aborting for safety.');
    console.log('Please verify manually that these are truly test data.');
    return;
  }
  
  // Confirm before deletion
  console.log('\n⏳ Deleting seed/test shares in 3 seconds...');
  console.log('   (Refresh page to cancel)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Delete seed shares
  let deleted = 0;
  let errors = 0;
  
  for (const share of seedShares) {
    const { error: deleteError } = await supa
      .from('public_shares')
      .delete()
      .eq('id', share.id);
      
    if (deleteError) {
      console.error(`❌ Error deleting ${share.id}:`, deleteError);
      errors++;
    } else {
      deleted++;
    }
  }
  
  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deleted} seed/test shares`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Protected: ${realUserShares.length} real user shares`);
  
  // Verify final state
  const { data: finalShares, error: verifyError } = await supa
    .from('public_shares')
    .select('id, content, location, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false });
    
  if (!verifyError) {
    console.log(`\n📊 Final state: ${finalShares.length} public shares remaining`);
    if (finalShares.length > 0) {
      console.log('Remaining shares:');
      finalShares.forEach((s, i) => {
        console.log(`  ${i + 1}. "${s.content?.substring(0, 60)}..." at ${s.location}`);
      });
    } else {
      console.log('Feed is now empty - ready for real user shares!');
    }
  }
  
  console.log('\n🎉 Done! Refresh Hi Island to see clean feed.');
})();
