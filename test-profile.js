// Quick test to trace execution
console.log('=== PROFILE LOAD TEST ===');
console.log('1. Check flag:', window.__PROFILE_DATA_LOADED);
console.log('2. Check loadUserStats:', typeof window.loadUserStats);
console.log('3. Check ProfileManager:', typeof window.ProfileManager);

setTimeout(() => {
  console.log('=== AFTER 2 SECONDS ===');
  console.log('4. Flag now:', window.__PROFILE_DATA_LOADED);
  console.log('5. loadUserStats now:', typeof window.loadUserStats);
  console.log('6. ProfileManager now:', typeof window.ProfileManager);
  console.log('7. userStats:', window.userStats);
}, 2000);
