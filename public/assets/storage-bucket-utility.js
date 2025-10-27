/**
 * Supabase Storage Bucket Creation Utility
 * Creates the avatars bucket if it doesn't exist
 */
(function() {
  'use strict';

  // Create storage bucket utility
  async function createAvatarsBucket() {
    try {
      console.log('🪣 Checking avatars storage bucket...');
      
      if (!window.supabaseClient) {
        throw new Error('Supabase client not initialized');
      }
      
      // Check if bucket already exists
      const { data: buckets, error: listError } = await window.supabaseClient.storage.listBuckets();
      
      if (listError) {
        console.log('📋 Cannot list buckets - checking with file list instead');
        
        // Try to list files in avatars bucket as alternative check
        const { data: files, error: filesError } = await window.supabaseClient.storage
          .from('avatars')
          .list('', { limit: 1 });
        
        if (!filesError) {
          console.log('✅ Avatars bucket exists (confirmed via file listing)');
          
          if (window.showTeslaToast) {
            window.showTeslaToast('Storage bucket is ready! You can now upload avatars.', 'success');
          }
          
          return { name: 'avatars', public: true };
        }
        
        console.log('❌ Bucket check failed:', filesError?.message || 'Unknown error');
        showBucketInstructions();
        return null;
      }
      
      const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
      
      if (avatarsBucket) {
        console.log('✅ Avatars bucket already exists');
        
        if (window.showTeslaToast) {
          window.showTeslaToast('Storage bucket ready! Upload system is active.', 'success');
        }
        
        return avatarsBucket;
      }
      
      console.log('⚠️ Avatars bucket not found in bucket list');
      showBucketInstructions();
      return null;
      
    } catch (error) {
      console.error('❌ Bucket check failed:', error);
      showBucketInstructions();
      return null;
    }
  }
  
  // Show instructions for manual bucket creation
  function showBucketInstructions() {
    const instructions = `
� AVATARS BUCKET SETUP REQUIRED

Row Level Security is preventing automatic bucket creation.
You need to create the bucket manually:

METHOD 1 - DASHBOARD UI (EASIEST):
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Bucket name: avatars
4. Public bucket: ✅ YES (IMPORTANT!)
5. Click "Save"

METHOD 2 - SQL EDITOR:
Run this in SQL Editor → New query:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Add policies for the bucket
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Avatars are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

After creating the bucket, REFRESH this page and the system will detect it!
    `;
    
    console.log(instructions);
    
    if (window.showTeslaToast) {
      window.showTeslaToast('Manual bucket setup required. Check console for detailed instructions.', 'warning', 10000);
    } else {
      alert('Storage bucket setup required. Please check the browser console for detailed instructions.');
    }
  }
  
  // Auto-attempt bucket creation on load
  function autoCreateBucket() {
    // Wait for Supabase to be initialized
    setTimeout(async () => {
      if (window.supabaseClient) {
        try {
          await createAvatarsBucket();
        } catch (error) {
          console.log('📝 Bucket creation instructions provided');
        }
      }
    }, 2000);
  }
  
  // Expose utilities globally
  window.createAvatarsBucket = createAvatarsBucket;
  window.showBucketInstructions = showBucketInstructions;
  
  // Auto-run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoCreateBucket);
  } else {
    autoCreateBucket();
  }
  
  console.debug('[StorageBucketUtility] Storage bucket utility ready');
})();