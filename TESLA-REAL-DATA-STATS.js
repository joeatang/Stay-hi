// ===============================================
// 🎯 TESLA-GRADE: REAL DATA STATS DISCOVERY  
// ===============================================
// Extract actual user data from localStorage instead of fake Supabase counters

function getTeslaGradeRealStats() {
  console.log('🔍 TESLA FORENSIC ANALYSIS: Extracting real user data...');
  
  // Get actual stored Hi data
  const myArchive = JSON.parse(localStorage.getItem('hi_my_archive') || '[]');
  const generalShares = JSON.parse(localStorage.getItem('hi_general_shares') || '[]');
  const pendingQueue = JSON.parse(localStorage.getItem('hi_pending_queue') || '[]');
  
  // Calculate REAL statistics from user's actual activity
  const totalHiMoments = myArchive.length;
  const totalShares = generalShares.length;
  const pendingActions = pendingQueue.length;
  
  // Analyze creation dates for activity patterns
  const allActivity = [...myArchive, ...generalShares];
  const uniqueDays = new Set(allActivity.map(item => {
    if (item.createdAt || item.timestamp || item.date) {
      const date = new Date(item.createdAt || item.timestamp || item.date);
      return date.toDateString();
    }
    return null;
  }).filter(Boolean)).size;
  
  // Calculate streak information
  const sortedDates = allActivity
    .map(item => item.createdAt || item.timestamp || item.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a));
    
  const mostRecentActivity = sortedDates.length > 0 ? new Date(sortedDates[0]) : null;
  
  const realStats = {
    // REAL data from user's localStorage
    totalHiMoments: totalHiMoments,
    totalWaves: totalShares, 
    totalConnections: totalHiMoments + totalShares,
    activeDays: uniqueDays,
    pendingItems: pendingActions,
    lastActivity: mostRecentActivity,
    
    // Derived metrics
    averagePerDay: uniqueDays > 0 ? Math.round((totalHiMoments + totalShares) / uniqueDays) : 0,
    isActive: mostRecentActivity && (Date.now() - mostRecentActivity.getTime()) < 24 * 60 * 60 * 1000,
    
    // Debug info
    dataSource: 'localStorage',
    timestamp: new Date().toISOString(),
    rawData: {
      myArchive: myArchive.slice(0, 3), // Sample
      generalShares: generalShares.slice(0, 3), // Sample
      pendingQueue: pendingQueue.slice(0, 3) // Sample
    }
  };
  
  console.log('📊 REAL USER STATS EXTRACTED:', realStats);
  return realStats;
}

// Expose to window for testing
window.getTeslaGradeRealStats = getTeslaGradeRealStats;

// Test immediately if in browser
if (typeof window !== 'undefined') {
  console.log('🧪 Running immediate stats analysis...');
  const stats = getTeslaGradeRealStats();
  
  console.log('===============================================');
  console.log('🎯 YOUR ACTUAL STAY HI DATA:');
  console.log('===============================================');
  console.log(`📝 Total Hi Moments: ${stats.totalHiMoments}`);
  console.log(`🌊 Total Waves: ${stats.totalWaves}`);
  console.log(`🔗 Total Connections: ${stats.totalConnections}`);
  console.log(`📅 Active Days: ${stats.activeDays}`);
  console.log(`⏳ Pending Actions: ${stats.pendingItems}`);
  console.log(`⚡ Currently Active: ${stats.isActive ? 'YES' : 'NO'}`);
  console.log(`📈 Daily Average: ${stats.averagePerDay}`);
  console.log('===============================================');
}