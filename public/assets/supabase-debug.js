/**
 * Supabase Data & Storage Debug Tool
 * Comprehensive testing for profile data and avatar storage
 */
(function() {
  'use strict';

  class SupabaseDebugTool {
    constructor() {
      this.results = {
        auth: {},
        profile: {},
        storage: {},
        tables: {}
      };
    }

    // Run comprehensive Supabase debug check
    async runDebugCheck() {
      console.log('🔍 SUPABASE DEBUG - Checking Data & Storage...');
      console.log('=============================================');

      try {
        // 1. Check Authentication
        await this.checkAuth();
        
        // 2. Check Profile Data
        await this.checkProfileData();
        
        // 3. Check Storage Setup
        await this.checkStorageSetup();
        
        // 4. Check Table Structure
        await this.checkTables();
        
        // 5. Generate Report
        this.generateDebugReport();
        
      } catch (error) {
        console.error('Debug check failed:', error);
      }
    }

    // Check authentication status
    async checkAuth() {
      console.log('\n👤 AUTHENTICATION CHECK:');
      
      try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        this.results.auth = {
          hasSession: !!session,
          userId: session?.user?.id || null,
          email: session?.user?.email || null,
          isAnonymous: session?.user?.is_anonymous || false,
          provider: session?.user?.app_metadata?.provider || null
        };
        
        if (session) {
          console.log(`  ✅ Authenticated as: ${session.user.email}`);
          console.log(`  🆔 User ID: ${session.user.id}`);
        } else {
          console.log('  ❌ Not authenticated - this may cause storage issues');
        }
        
      } catch (error) {
        console.error('  ❌ Auth check failed:', error);
        this.results.auth.error = error.message;
      }
    }

    // Check profile data in tables
    async checkProfileData() {
      console.log('\n📋 PROFILE DATA CHECK:');
      
      if (!this.results.auth.userId) {
        console.log('  ⚠️ Skipping - no authenticated user');
        return;
      }

      try {
        // Check profiles table
        const { data: profile, error: profileError } = await window.supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', this.results.auth.userId)
          .single();

        if (profileError) {
          console.log(`  ❌ Profile query error: ${profileError.message}`);
          this.results.profile.error = profileError.message;
        } else if (profile) {
          console.log('  ✅ Profile found in database:');
          console.log(`    Username: ${profile.username || 'Not set'}`);
          console.log(`    Display Name: ${profile.display_name || 'Not set'}`);
          console.log(`    Avatar URL: ${profile.avatar_url || 'Not set'}`);
          console.log(`    Public: ${profile.is_public}`);
          
          this.results.profile.data = profile;
        } else {
          console.log('  ❌ No profile found - need to create one');
          this.results.profile.missing = true;
        }

        // Check user_stats table
        const { data: stats, error: statsError } = await window.supabaseClient
          .from('user_stats')
          .select('*')
          .eq('user_id', this.results.auth.userId)
          .single();

        if (stats) {
          console.log('  ✅ User stats found:');
          console.log(`    Hi Moments: ${stats.total_hi_moments}`);
          console.log(`    Current Streak: ${stats.current_streak}`);
          console.log(`    Level: ${stats.level}`);
          
          this.results.profile.stats = stats;
        } else {
          console.log('  ⚠️ No user stats found');
        }

      } catch (error) {
        console.error('  ❌ Profile data check failed:', error);
        this.results.profile.error = error.message;
      }
    }

    // Check storage setup and permissions
    async checkStorageSetup() {
      console.log('\n💾 STORAGE SETUP CHECK:');

      try {
        // Check if avatars bucket exists
        const { data: buckets, error: bucketsError } = await window.supabaseClient
          .storage
          .listBuckets();

        if (bucketsError) {
          console.log(`  ❌ Bucket list error: ${bucketsError.message}`);
          this.results.storage.bucketError = bucketsError.message;
          return;
        }

        const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
        
        if (avatarsBucket) {
          console.log('  ✅ Avatars bucket exists:');
          console.log(`    Name: ${avatarsBucket.name}`);
          console.log(`    Public: ${avatarsBucket.public}`);
          console.log(`    Created: ${avatarsBucket.created_at}`);
          
          this.results.storage.bucket = avatarsBucket;
          
          // Check if user has files in bucket
          if (this.results.auth.userId) {
            await this.checkUserFiles();
          }
          
        } else {
          console.log('  ❌ Avatars bucket not found');
          this.results.storage.bucketMissing = true;
        }

      } catch (error) {
        console.error('  ❌ Storage check failed:', error);
        this.results.storage.error = error.message;
      }
    }

    // Check user's files in storage
    async checkUserFiles() {
      try {
        const userPath = `${this.results.auth.userId}`;
        
        const { data: files, error: filesError } = await window.supabaseClient
          .storage
          .from('avatars')
          .list(userPath);

        if (filesError) {
          console.log(`  ⚠️ Cannot list user files: ${filesError.message}`);
          this.results.storage.filesError = filesError.message;
        } else {
          console.log(`  📁 Files in /${userPath}/:`);
          
          if (files && files.length > 0) {
            files.forEach(file => {
              console.log(`    📄 ${file.name} (${this.formatFileSize(file.metadata?.size)})`);
            });
            this.results.storage.files = files;
          } else {
            console.log('    📭 No files found - upload an avatar to test');
            this.results.storage.filesEmpty = true;
          }
        }

      } catch (error) {
        console.error('  ❌ File check failed:', error);
      }
    }

    // Check table structure
    async checkTables() {
      console.log('\n🗄️ TABLES CHECK:');
      
      const tablesToCheck = [
        'profiles',
        'user_stats', 
        'user_achievements',
        'hi_moments',
        'achievements'
      ];

      for (const table of tablesToCheck) {
        try {
          const { data, error, count } = await window.supabaseClient
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.log(`  ❌ ${table}: ${error.message}`);
            this.results.tables[table] = { error: error.message };
          } else {
            console.log(`  ✅ ${table}: ${count} records`);
            this.results.tables[table] = { count };
          }

        } catch (error) {
          console.log(`  ❌ ${table}: ${error.message}`);
          this.results.tables[table] = { error: error.message };
        }
      }
    }

    // Test avatar upload functionality
    async testAvatarUpload() {
      console.log('\n🧪 TESTING AVATAR UPLOAD:');
      
      if (!this.results.auth.userId) {
        console.log('  ⚠️ Cannot test - no authenticated user');
        return;
      }

      try {
        // Create a small test image
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        // Draw a simple pattern
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#FFD93D';
        ctx.fillRect(25, 25, 50, 50);
        
        // Convert to blob
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });
        
        const fileName = `test-avatar-${Date.now()}.png`;
        const filePath = `${this.results.auth.userId}/${fileName}`;
        
        console.log(`  📤 Uploading test file: ${filePath}`);
        
        const { data, error } = await window.supabaseClient.storage
          .from('avatars')
          .upload(filePath, blob);

        if (error) {
          console.log(`  ❌ Upload failed: ${error.message}`);
        } else {
          console.log(`  ✅ Upload successful: ${data.path}`);
          
          // Get public URL
          const { data: urlData } = window.supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);
            
          console.log(`  🔗 Public URL: ${urlData.publicUrl}`);
          
          // Clean up test file
          setTimeout(async () => {
            await window.supabaseClient.storage
              .from('avatars')
              .remove([filePath]);
            console.log(`  🗑️ Test file cleaned up`);
          }, 2000);
        }

      } catch (error) {
        console.error('  ❌ Upload test failed:', error);
      }
    }

    // Format file size helper
    formatFileSize(bytes) {
      if (!bytes) return 'Unknown size';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Generate comprehensive report
    generateDebugReport() {
      console.log('\n📊 SUPABASE DEBUG REPORT');
      console.log('=========================');
      
      // Authentication Summary
      console.log('\n🔐 AUTHENTICATION:');
      if (this.results.auth.hasSession) {
        console.log(`  ✅ Status: Authenticated`);
        console.log(`  👤 User: ${this.results.auth.email}`);
        console.log(`  🆔 ID: ${this.results.auth.userId}`);
      } else {
        console.log(`  ❌ Status: Not authenticated`);
        console.log(`  💡 Tip: Sign in to test avatar uploads`);
      }

      // Profile Summary
      console.log('\n📋 PROFILE DATA:');
      if (this.results.profile.data) {
        console.log(`  ✅ Profile exists in 'profiles' table`);
        console.log(`  📸 Avatar: ${this.results.profile.data.avatar_url ? 'Set' : 'Not set'}`);
      } else {
        console.log(`  ⚠️ No profile found in 'profiles' table`);
        console.log(`  💡 Tip: Create profile to store avatar URLs`);
      }

      if (this.results.profile.stats) {
        console.log(`  ✅ Stats exist in 'user_stats' table`);
      } else {
        console.log(`  ⚠️ No stats found in 'user_stats' table`);
      }

      // Storage Summary
      console.log('\n💾 STORAGE:');
      if (this.results.storage.bucket) {
        console.log(`  ✅ 'avatars' bucket exists and is public`);
        
        if (this.results.storage.files && this.results.storage.files.length > 0) {
          console.log(`  📁 User has ${this.results.storage.files.length} file(s) in storage`);
        } else {
          console.log(`  📭 No files uploaded yet`);
          console.log(`  💡 Tip: Upload an avatar to test storage`);
        }
      } else {
        console.log(`  ❌ 'avatars' bucket missing`);
        console.log(`  💡 Tip: Run the supabase schema SQL to create bucket`);
      }

      // Tables Summary
      console.log('\n🗄️ TABLES:');
      const tableStatus = Object.entries(this.results.tables);
      tableStatus.forEach(([table, result]) => {
        if (result.error) {
          console.log(`  ❌ ${table}: ${result.error}`);
        } else {
          console.log(`  ✅ ${table}: ${result.count || 0} records`);
        }
      });

      // Action Items
      console.log('\n🎯 NEXT STEPS:');
      const issues = [];
      
      if (!this.results.auth.hasSession) {
        issues.push('Sign in to test avatar uploads');
      }
      
      if (!this.results.profile.data) {
        issues.push('Create a profile in the profiles table');
      }
      
      if (!this.results.storage.bucket) {
        issues.push('Run supabase schema SQL to create avatars bucket');
      }
      
      if (this.results.storage.filesEmpty && this.results.auth.hasSession) {
        issues.push('Test avatar upload functionality');
      }

      if (issues.length === 0) {
        console.log('  🎉 Everything looks good! Your Supabase setup is ready.');
      } else {
        issues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });
      }

      console.log('\n=========================');
      
      return this.results;
    }

    // Quick status check
    quickCheck() {
      console.log('⚡ Quick Supabase Check:');
      
      const hasSupabase = !!window.supabaseClient;
      const hasAuth = !!window.supabaseClient?.auth;
      const hasStorage = !!window.supabaseClient?.storage;
      
      console.log(`  Supabase Client: ${hasSupabase ? '✅' : '❌'}`);
      console.log(`  Auth Module: ${hasAuth ? '✅' : '❌'}`);
      console.log(`  Storage Module: ${hasStorage ? '✅' : '❌'}`);
      
      if (hasSupabase && hasAuth && hasStorage) {
        console.log('  Status: ✅ Ready for full debug check');
        console.log('  Run: window.supabaseDebug.runDebugCheck()');
      } else {
        console.log('  Status: ❌ Supabase not properly initialized');
      }
    }
  }

  // Initialize and expose globally
  window.SupabaseDebugTool = SupabaseDebugTool;
  window.supabaseDebug = new SupabaseDebugTool();
  
  // Auto-run quick check
  setTimeout(() => {
    window.supabaseDebug.quickCheck();
  }, 1000);
  
  console.debug('[SupabaseDebugTool] Debug tools ready');
  console.log('💡 Commands:');
  console.log('  window.supabaseDebug.runDebugCheck() - Full system check');
  console.log('  window.supabaseDebug.testAvatarUpload() - Test upload functionality');
})();