/**
 * Bucket Status Checker
 * Diagnose current bucket situation and provide clear next steps
 */
(function() {
  'use strict';

  async function diagnoseBucketStatus() {
    console.log('🔍 BUCKET DIAGNOSTIC REPORT');
    console.log('============================');
    
    if (!window.supabaseClient) {
      console.log('❌ Supabase client not available');
      return;
    }

    try {
      // Test 1: Check if bucket exists via SQL query (if RLS allows)
      console.log('\n📊 Test 1: Database Query Check');
      try {
        const { data: bucketQuery, error: queryError } = await window.supabaseClient
          .from('buckets')
          .select('*')
          .eq('name', 'avatars');
          
        if (queryError) {
          console.log('⚠️ Cannot query buckets table directly:', queryError.message);
        } else {
          console.log('✅ Buckets table query successful');
          if (bucketQuery && bucketQuery.length > 0) {
            console.log('📦 Found bucket in database:', bucketQuery[0]);
          } else {
            console.log('❌ No avatars bucket found in database');
          }
        }
      } catch (e) {
        console.log('⚠️ Database query failed:', e.message);
      }

      // Test 2: Storage API bucket list
      console.log('\n📊 Test 2: Storage API Bucket List');
      const { data: buckets, error: listError } = await window.supabaseClient.storage.listBuckets();
      
      if (listError) {
        console.log('❌ Cannot list buckets:', listError.message);
        console.log('💡 This is expected if RLS is blocking access');
      } else {
        console.log('✅ Storage bucket list successful');
        const avatarsBucket = buckets.find(b => b.name === 'avatars');
        if (avatarsBucket) {
          console.log('📦 Avatars bucket found:', avatarsBucket);
        } else {
          console.log('❌ Avatars bucket not found in list');
          console.log('📦 Available buckets:', buckets.map(b => b.name));
        }
      }

      // Test 3: Direct bucket access
      console.log('\n📊 Test 3: Direct Bucket Access Test');
      const { data: files, error: accessError } = await window.supabaseClient.storage
        .from('avatars')
        .list('', { limit: 1 });

      if (accessError) {
        console.log('❌ Cannot access avatars bucket:', accessError.message);
        
        if (accessError.message.includes('not found') || accessError.message.includes('does not exist')) {
          console.log('💡 Bucket definitely does not exist');
        } else if (accessError.message.includes('permission') || accessError.message.includes('policy')) {
          console.log('💡 Bucket might exist but permissions are wrong');
        }
      } else {
        console.log('✅ Avatars bucket is accessible!');
        console.log('📁 Current files:', files?.length || 0);
      }

      // Test 4: Upload capability test with proper image
      console.log('\n📊 Test 4: Image Upload Capability Test');
      
      // Create a small test image (1x1 pixel PNG)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(0, 0, 1, 1);
      
      // Convert to blob
      const testImageBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      const testPath = `test-${Date.now()}.png`;

      const { data: uploadTest, error: uploadError } = await window.supabaseClient.storage
        .from('avatars')
        .upload(testPath, testImageBlob);

      if (uploadError) {
        console.log('❌ Image upload test failed:', uploadError.message);
        
        if (uploadError.message.includes('mime type') || uploadError.message.includes('not supported')) {
          console.log('💡 MIME type restriction detected');
          console.log('🔧 Run the fix-storage-policies.sql to resolve this');
        }
      } else {
        console.log('✅ Image upload test successful!');
        console.log('🧹 Cleaning up test file...');
        
        // Clean up
        await window.supabaseClient.storage
          .from('avatars')
          .remove([testPath]);
        console.log('✅ Test file removed');
      }

      // Summary and recommendations
      console.log('\n🎯 DIAGNOSIS SUMMARY');
      console.log('===================');
      
      const canAccess = !accessError;
      const canUpload = !uploadError;
      
      if (canAccess && canUpload) {
        console.log('🎉 STATUS: FULLY FUNCTIONAL');
        console.log('✅ Bucket exists and is properly configured');
        console.log('✅ Upload system ready to use');
        return 'ready';
      } else if (canAccess && !canUpload) {
        console.log('⚠️ STATUS: BUCKET EXISTS BUT UPLOAD ISSUES');
        console.log('🔧 RECOMMENDED ACTION:');
        console.log('   Run fix-storage-policies.sql in Supabase SQL Editor');
        console.log('   This will fix MIME type restrictions and policies');
        return 'permissions';
      } else {
        console.log('❌ STATUS: BUCKET MISSING OR INACCESSIBLE');
        console.log('🔧 RECOMMENDED ACTION:');
        console.log('   1. Go to Supabase Dashboard → Storage');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name: avatars');
        console.log('   4. Public: ✅ YES');
        console.log('   5. Save');
        return 'missing';
      }

    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      return 'error';
    }
  }

  // Auto-run diagnostic
  setTimeout(() => {
    diagnoseBucketStatus();
  }, 2000);

  // Expose for manual use
  window.diagnoseBucketStatus = diagnoseBucketStatus;
  
  console.debug('[BucketDiagnostic] Diagnostic tool loaded - run window.diagnoseBucketStatus()');
})();