// 🔍 DEBUG: Add this to profile.html console to see what's overwriting stats

// After page loads, check what values are in the DOM
setTimeout(() => {
  console.log('🔍 CURRENT DOM VALUES:');
  console.log('Hi Moments:', document.querySelector('[data-stat="hi_moments"]')?.textContent);
  console.log('Current Streak:', document.querySelector('[data-stat="current_streak"]')?.textContent);
  console.log('Total Waves:', document.querySelector('[data-stat="total_waves"]')?.textContent);
  
  console.log('\n🔍 EXPECTED VALUES FROM DATABASE:');
  console.log('Hi Moments: 53');
  console.log('Current Streak: 3');
  console.log('Total Waves: 14');
  
  console.log('\n🔍 CHECKING userStats VARIABLE:');
  console.log('userStats:', window.userStats || 'not found');
  
  console.log('\n🔍 CHECKING LOCALSTORAGE:');
  const keys = Object.keys(localStorage).filter(k => k.includes('stat') || k.includes('moment') || k.includes('streak') || k.includes('wave'));
  keys.forEach(k => console.log(`  ${k}:`, localStorage.getItem(k)));
}, 3000);

// Watch for DOM mutations
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' || mutation.type === 'characterData') {
      const target = mutation.target;
      if (target.hasAttribute && target.hasAttribute('data-stat')) {
        console.log('🔄 STAT CHANGED:', target.getAttribute('data-stat'), '→', target.textContent);
        console.trace('Changed by:');
      }
    }
  });
});

const statsGrid = document.querySelector('#statsGrid');
if (statsGrid) {
  observer.observe(statsGrid, { 
    childList: true, 
    subtree: true, 
    characterData: true 
  });
  console.log('👀 Watching stats for changes...');
}
