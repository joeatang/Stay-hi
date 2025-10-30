// ============================================================
// Clear LocalStorage Cache - Force Fresh Database Fetch
// ============================================================
// Paste this in browser console to clear old cached data

console.log('🧹 Clearing localStorage cache...');

// Clear general shares cache
localStorage.removeItem('stayhi_general');
console.log('✅ Cleared general shares cache');

// Clear archive cache (optional, but good to be thorough)
localStorage.removeItem('stayhi_archive');
console.log('✅ Cleared archive cache');

console.log('✨ Cache cleared! Hard refresh now (Cmd+Shift+R)');
