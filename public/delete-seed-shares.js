// Delete Seed Shares from Database
// Run this in browser console on Hi Island page after auth

(async function deleteSeedShares() {
  console.log('🧹 Starting seed data cleanup...');
  
  // Seed share text patterns to match
  const seedPatterns = [
    'Morning surf session at Bondi Beach - nature\'s therapy session!',
    'Cherry blossoms remind me that beauty is temporary and precious.',
    'Tea time in Hyde Park - finding peace in the simple moments.',
    'Just witnessed the most incredible sunset over the Golden Gate Bridge!',
    'Grateful for this beautiful city and all the connections it brings'
  ];
  
  // Get Supabase client
  const supa = window.hiDB?.supabase || window.supabase;
  
  if (!supa) {
    console.error('❌ Supabase client not found');
    return;
  }
  
  console.log('🔍 Fetching all public shares...');
  const { data: shares, error } = await supa
    .from('public_shares')
    .select('id, content, location, created_at')
    .eq('is_public', true);
    
  if (error) {
    console.error('❌ Error fetching shares:', error);
    return;
  }
  
  console.log(`📊 Found ${shares.length} total public shares`);
  
  // Find seed shares
  const seedShares = shares.filter(share => 
    seedPatterns.some(pattern => 
      share.content?.includes(pattern) ||
      share.content === pattern
    )
  );
  
  console.log(`🌱 Found ${seedShares.length} seed shares to delete:`);
  seedShares.forEach(share => {
    console.log(`  - "${share.content?.substring(0, 60)}..." at ${share.location}`);
  });
  
  if (seedShares.length === 0) {
    console.log('✅ No seed shares found - database is clean!');
    return;
  }
  
  // Delete each seed share
  let deleted = 0;
  for (const share of seedShares) {
    const { error: deleteError } = await supa
      .from('public_shares')
      .delete()
      .eq('id', share.id);
      
    if (deleteError) {
      console.error(`❌ Error deleting share ${share.id}:`, deleteError);
    } else {
      deleted++;
      console.log(`✅ Deleted: ${share.location}`);
    }
  }
  
  console.log(`\n🎉 Cleanup complete! Deleted ${deleted}/${seedShares.length} seed shares`);
  
  // Verify cleanup
  const { data: remaining, error: verifyError } = await supa
    .from('public_shares')
    .select('id, content, location')
    .eq('is_public', true);
    
  if (!verifyError) {
    console.log(`\n📊 Remaining public shares: ${remaining.length}`);
    console.log('Remaining shares:', remaining.map(s => ({
      location: s.location,
      preview: s.content?.substring(0, 50) + '...'
    })));
  }
})();
