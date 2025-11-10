/**
 * 🚀 HI OS ECOSYSTEM ENHANCEMENT
 * Surgical integration layer that enhances existing tracking without disruption
 * Preserves all legacy systems while adding Hi OS ecosystem features
 */

// 🔧 COMPATIBILITY BRIDGE: Enhance existing trackShareSubmission() with Hi OS features
const originalTrackShareSubmission = window.trackShareSubmission;

async function enhancedTrackShareSubmission(source, metadata = {}) {
  // ✅ STEP 1: Call existing tracking system (preserve all functionality)
  let result = null;
  if (originalTrackShareSubmission) {
    try {
      result = await originalTrackShareSubmission(source, metadata);
      console.log('✅ Original tracking completed:', result);
    } catch (error) {
      console.error('⚠️ Original tracking failed, continuing with Hi OS:', error);
    }
  }
  
  // 🚀 STEP 2: Hi OS Ecosystem Enhancement (non-blocking with timeout)
  setTimeout(async () => {
    try {
      // Get user context
      const userUuid = window.hiDB?.getCurrentUser?.()?.id || metadata.userUuid;
      
      // Enhance with Hi OS tracking (with timeout protection)
      const enhancementPromise = enhanceWithHiOS(source, {
        ...metadata,
        userUuid,
        originalResult: result,
        timestamp: Date.now(),
        origin: window.location.pathname
      });
      
      // Race with timeout to prevent blocking
      await Promise.race([
        enhancementPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Hi OS enhancement timeout')), 3000)
        )
      ]);
      
      console.log('🚀 Hi OS enhancement completed');
      
    } catch (error) {
      console.warn('⚠️ Hi OS enhancement failed (non-critical):', error);
      // Never block the main flow - Hi OS is enhancement only
    }
  }, 10); // Very small delay to ensure non-blocking
  
  return result; // Return original result to preserve existing behavior
}

async function enhanceWithHiOS(source, metadata) {
  const supabase = window.getSupabase?.() || window.supabaseClient || window.HiSupabase?.getClient?.();
  
  if (!supabase) {
    console.log('📝 Hi OS: No Supabase client, tracking locally');
    trackHiOSLocally(source, metadata);
    return;
  }
  
  try {
    // 🎯 Hi OS: Track individual user activity  
    if (metadata.userUuid) {
      await supabase.rpc('track_user_activity', {
        user_id: metadata.userUuid,
        activity_type: 'share_submission',
        activity_data: {
          source,
          submission_type: metadata.submissionType || 'unknown',
          page: metadata.origin || source
        }
      });
      console.log('✅ Hi OS: User activity tracked');
    }
    
    // 🏆 Hi OS: Check for milestone achievements
    const achievements = await checkMilestones(metadata.userUuid, supabase);
    if (achievements.length > 0) {
      showHiOSAchievements(achievements);
    }
    
    // 📊 Hi OS: Update personal stats dashboard
    if (window.updatePersonalStats) {
      window.updatePersonalStats();
    }
    
  } catch (error) {
    console.error('❌ Hi OS enhancement error:', error);
    // Fallback to local tracking
    trackHiOSLocally(source, metadata);
  }
}

async function checkMilestones(userUuid, supabase) {
  if (!userUuid) return [];
  
  try {
    const { data, error } = await supabase.rpc('check_user_milestones', { 
      user_id: userUuid 
    });
    
    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('⚠️ Milestone check failed:', error);
    return [];
  }
}

function showHiOSAchievements(achievements) {
  achievements.forEach(achievement => {
    // 🎉 Show achievement notification (non-intrusive)
    if (window.PremiumUX?.showAchievement) {
      window.PremiumUX.showAchievement(achievement);
    } else {
      console.log('🏆 ACHIEVEMENT UNLOCKED:', achievement.title);
    }
  });
}

function trackHiOSLocally(source, metadata) {
  // 📱 Offline-first Hi OS tracking
  const hiOSData = JSON.parse(localStorage.getItem('hiOS_activity') || '[]');
  hiOSData.push({
    source,
    metadata,
    timestamp: Date.now(),
    synced: false
  });
  
  // Keep only last 100 entries
  if (hiOSData.length > 100) {
    hiOSData.splice(0, hiOSData.length - 100);
  }
  
  localStorage.setItem('hiOS_activity', JSON.stringify(hiOSData));
  console.log('📝 Hi OS: Activity tracked locally for sync');
}

// 🔧 SURGICAL INTEGRATION: Replace window.trackShareSubmission with enhanced version
if (typeof window.trackShareSubmission === 'function') {
  console.log('🔧 Hi OS: Enhancing existing trackShareSubmission with Hi OS features');
  window.trackShareSubmission = enhancedTrackShareSubmission;
} else {
  console.warn('⚠️ No existing trackShareSubmission found - Hi OS will wait for initialization');
  
  // Wait for original system to load, then enhance
  const checkAndEnhance = setInterval(() => {
    if (window.trackShareSubmission && window.trackShareSubmission !== enhancedTrackShareSubmission) {
      console.log('✅ Found trackShareSubmission, enhancing with Hi OS...');
      const original = window.trackShareSubmission;
      
      window.trackShareSubmission = async function(source, metadata) {
        return await enhancedTrackShareSubmission.call(this, source, metadata);
      };
      
      clearInterval(checkAndEnhance);
    }
  }, 100);
  
  // Stop checking after 10 seconds
  setTimeout(() => clearInterval(checkAndEnhance), 10000);
}

// 🚀 Hi OS Global Stats Enhancement (optional overlay)
if (window.HiUnifiedGlobalStats) {
  // Enhance existing global stats with Hi OS features
  const originalTrackHiMoment = window.HiUnifiedGlobalStats.prototype.trackHiMoment;
  
  window.HiUnifiedGlobalStats.prototype.trackHiMoment = function(userUuid) {
    // Call original
    const result = originalTrackHiMoment.call(this, userUuid);
    
    // Add Hi OS enhancement
    enhanceWithHiOS('hi_moment', { userUuid });
    
    return result;
  };
}

console.log('🚀 Hi OS Ecosystem Enhancement Layer loaded - preserving all existing functionality');

export { enhancedTrackShareSubmission as trackShareSubmission };