/**
 * Simple Bucket Debug Tool
 * Quick verification of storage bucket status
 */
(function() {
  'use strict';

  // Simple bucket test function
  async function testBucketAccess() {
    console.log('🧪 QUICK BUCKET TEST');
    console.log('===================');
    
    if (!window.supabaseClient) {
      console.log('❌ Supabase client not available');
      return false;
    }
    
    try {
      // Test 1: Try to list buckets
      console.log('Test 1: Listing buckets...');
      const { data: buckets, error: listError } = await window.supabaseClient.storage.listBuckets();
      
      if (listError) {
        console.log('⚠️ Cannot list buckets (RLS may be enabled):', listError.message);
      } else {
        const avatarsBucket = buckets?.find(b => b.name === 'avatars');
        console.log(avatarsBucket ? '✅ Avatars bucket found in list' : '❌ Avatars bucket not in list');
      }
      
      // Test 2: Try to access avatars bucket directly
      console.log('\nTest 2: Direct bucket access...');
      const { data: files, error: filesError } = await window.supabaseClient.storage
        .from('avatars')
        .list('', { limit: 1 });
      
      if (filesError) {
        console.log('❌ Cannot access avatars bucket:', filesError.message);
        if (filesError.message.includes('not found') || filesError.message.includes('does not exist')) {
          console.log('💡 Bucket does not exist - needs to be created');
          return false;
        }
      } else {
        console.log('✅ Avatars bucket is accessible');
        return true;
      }
      
      // Test 3: Try a minimal upload test
      console.log('\nTest 3: Upload test...');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
        .from('avatars')
        .upload('test.txt', testBlob);
      
      if (uploadError) {
        console.log('❌ Upload test failed:', uploadError.message);
        return false;
      } else {
        console.log('✅ Upload test successful');
        
        // Clean up
        await window.supabaseClient.storage.from('avatars').remove(['test.txt']);
        console.log('🧹 Test file cleaned up');
        return true;
      }
      
    } catch (error) {
      console.error('❌ Bucket test failed:', error);
      return false;
    }
  }
  
  // Expose globally for easy testing
  window.testBucketAccess = testBucketAccess;
  
  // Auto-run test after page loads
  setTimeout(async () => {
    const bucketExists = await testBucketAccess();
    
    if (bucketExists) {
      console.log('\n🎉 BUCKET STATUS: READY');
      if (window.showTeslaToast) {
        window.showTeslaToast('Storage bucket is ready!', 'success');
      }
    } else {
      console.log('\n⚠️ BUCKET STATUS: NEEDS SETUP');
      console.log('📋 Create the bucket using Supabase Dashboard → Storage → New bucket → "avatars" (public)');
    }
  }, 3000);
  
  console.debug('[BucketDebug] Quick bucket test tool loaded');
})();