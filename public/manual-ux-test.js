// 🧪 Hi-Island UX Testing Script - Manual Console Test
// Run this in browser console on hi-island-NEW.html

console.log('🔬 STARTING MANUAL UX TEST SUITE');
console.log('=================================');

// TEST 1: Drop Hi Button Dependencies
console.log('\n🎯 TEST 1: Drop Hi Button Dependencies');
console.log('------------------------------------');

console.log('Testing window.openHiComposer:', typeof window.openHiComposer);
console.log('Testing window.hiIslandShareSheet:', typeof window.hiIslandShareSheet);
console.log('Testing window.openHiShareSheet:', typeof window.openHiShareSheet);  
console.log('Testing window.HiShareSheet:', typeof window.HiShareSheet);

// TEST 2: Feed System Dependencies
console.log('\n📊 TEST 2: Feed System Dependencies');
console.log('----------------------------------');

console.log('Testing window.hiRealFeed:', typeof window.hiRealFeed);
console.log('Testing window.hiDB:', typeof window.hiDB);

// Test DOM elements
const dropButton = document.getElementById('dropHiButton');
const feedRoot = document.getElementById('hi-island-feed-root');
const generalTab = document.getElementById('tab-general');
const archiveTab = document.getElementById('tab-archive');

console.log('\n🏗️ TEST 3: DOM Element Check');
console.log('----------------------------');
console.log('Drop Hi Button:', dropButton ? '✅ Found' : '❌ Missing');
console.log('Feed Root:', feedRoot ? '✅ Found' : '❌ Missing');
console.log('General Tab:', generalTab ? '✅ Found' : '❌ Missing');
console.log('Archive Tab:', archiveTab ? '✅ Found' : '❌ Missing');

// TEST 4: Database Connection
console.log('\n💾 TEST 4: Database Connection');
console.log('-----------------------------');

if (window.hiDB && window.hiDB.supabase) {
  console.log('✅ HiDB available with Supabase client');
  
  // Test a simple query
  window.hiDB.supabase
    .from('global_community_stats')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Database query failed:', error.message);
      } else {
        console.log('✅ Database connection working:', data);
      }
    });
} else {
  console.log('❌ HiDB or Supabase not available');
}

// TEST 5: Manual Drop Hi Button Click
console.log('\n🖱️ TEST 5: Manual Drop Hi Simulation');
console.log('-----------------------------------');

if (dropButton) {
  console.log('Simulating Drop Hi button click...');
  
  // Capture any console logs during click
  const originalLog = console.log;
  const logs = [];
  console.log = function(...args) {
    logs.push(args.join(' '));
    originalLog.apply(console, arguments);
  };
  
  try {
    dropButton.click();
    console.log = originalLog;
    
    setTimeout(() => {
      console.log('📋 Click Results:', logs.filter(log => log.includes('Hi Composer') || log.includes('share')));
    }, 1000);
    
  } catch (error) {
    console.log = originalLog;
    console.log('❌ Drop Hi click failed:', error.message);
  }
} else {
  console.log('❌ Cannot test - Drop Hi button not found');
}

console.log('\n🏁 MANUAL TEST COMPLETE');
console.log('Run individual tests by checking the objects above');
console.log('Next: Test tab switching and feed loading manually');