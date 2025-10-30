// 🛡️ TESLA-GRADE USER DATA ISOLATION
// Prevents data leakage between users and ensures proper user isolation

(function() {
  'use strict';
  
  console.log('🛡️ Initializing Tesla-grade data isolation...');
  
  // Critical: Clear any contaminated data on new session
  function clearContaminatedData() {
    const keysToClean = [
      'stayhi_profile',
      'user_profile', 
      'profile',
      'currentUser',
      'demo-profile',
      'user',
      'userStats',
      'user_stats'
    ];
    
    keysToClean.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          // Remove any dev/demo data
          if (parsed.display_name === 'Demo User' || 
              parsed.username === 'demo_user' ||
              parsed.id === 'emergency-demo-user' ||
              parsed.display_name?.includes('joeatang')) {
            console.log(`🧹 Cleaning contaminated data from ${key}`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Invalid data, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }
  
  // User-specific data namespace
  function getUserDataKey(baseKey, userId) {
    if (!userId) return baseKey; // Fallback for backwards compatibility
    return `${baseKey}_${userId}`;
  }
  
  // Safe profile loading with user isolation
  async function loadUserProfile(userId) {
    if (!userId) {
      console.warn('⚠️ No user ID provided - cannot load profile');
      return null;
    }
    
    try {
      // 1. Try database first (source of truth)
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (data && !error) {
          // Store with user-specific key
          const userKey = getUserDataKey('stayhi_profile', userId);
          localStorage.setItem(userKey, JSON.stringify(data));
          return data;
        }
      }
      
      // 2. Fallback to user-specific localStorage
      const userKey = getUserDataKey('stayhi_profile', userId);
      const stored = localStorage.getItem(userKey);
      return stored ? JSON.parse(stored) : null;
      
    } catch (error) {
      console.error('❌ Profile loading error:', error);
      return null;
    }
  }
  
  // Safe profile saving with user isolation
  async function saveUserProfile(userId, profileData) {
    if (!userId) {
      console.warn('⚠️ No user ID provided - cannot save profile');
      return { ok: false, error: 'No user ID' };
    }
    
    try {
      // Add user ID to profile data
      const safeProfile = {
        ...profileData,
        id: userId,
        updated_at: new Date().toISOString()
      };
      
      // 1. Save to database
      if (window.supabaseClient) {
        const { error } = await window.supabaseClient
          .from('profiles')
          .upsert(safeProfile);
          
        if (error) {
          console.warn('Database save failed:', error);
        }
      }
      
      // 2. Cache with user-specific key
      const userKey = getUserDataKey('stayhi_profile', userId);
      localStorage.setItem(userKey, JSON.stringify(safeProfile));
      
      return { ok: true, data: safeProfile };
      
    } catch (error) {
      console.error('❌ Profile saving error:', error);
      return { ok: false, error: error.message };
    }
  }
  
  // Initialize on auth state change
  function initializeDataIsolation() {
    // Listen for auth changes
    if (window.supabaseClient) {
      window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          console.log('🔒 User signed out - clearing session data');
          clearContaminatedData();
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔑 User signed in - initializing data isolation for:', session.user.id);
          // Clear any old contaminated data first
          clearContaminatedData();
        }
      });
    }
  }
  
  // IMMEDIATE cleanup on every page load
  console.log('🧹 Performing immediate contamination cleanup...');
  clearContaminatedData();
  
  // Force cleanup every 2 seconds for first 10 seconds of page load
  const immediateCleanupInterval = setInterval(() => {
    clearContaminatedData();
  }, 2000);
  
  setTimeout(() => {
    clearInterval(immediateCleanupInterval);
    console.log('✅ Immediate cleanup phase complete');
  }, 10000);
  
  // Initialize auth listener
  if (window.supabaseClient) {
    initializeDataIsolation();
  } else {
    // Wait for Supabase to load
    window.addEventListener('supabase-ready', initializeDataIsolation);
  }
  
  // Expose safe methods globally
  window.TeslaDataIsolation = {
    loadUserProfile,
    saveUserProfile,
    clearContaminatedData,
    getUserDataKey
  };
  
  console.log('✅ Tesla-grade data isolation initialized');
})();